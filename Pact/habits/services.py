from __future__ import annotations

from collections import OrderedDict, defaultdict
from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone

from .models import CheckIn, Pact


@dataclass(frozen=True)
class StreakSummary:
    current_streak: int
    longest_streak: int


def _period_start(pact, timestamp):
    local_timestamp = timezone.localtime(timestamp)

    if pact.frequency == Pact.Frequency.DAILY:
        return local_timestamp.date()
    if pact.frequency == Pact.Frequency.WEEKLY:
        return local_timestamp.date() - timedelta(days=local_timestamp.weekday())

    raise ValueError(f"Unsupported pact frequency: {pact.frequency}")


def current_period_checkin_status(pact, checkins=None, now=None):
    """Return the current frequency-period check-in status for a pact.

    Uses daily/weekly periods (same windows as streak calculation), not a
    raw calendar "today" for weekly pacts. Returns one of:
    None, "pending", "verified", "rejected", "expired".
    When multiple check-ins exist in the period, verified wins, then pending,
    then rejected, then expired.
    """
    now = now or timezone.now()
    if checkins is None:
        checkins = pact.checkins.with_lazy_expiration(now=now).only(
            "timestamp", "status", "pact"
        )

    current_period = _period_start(pact, now)
    seen = set()

    for check_in in checkins:
        if _period_start(pact, check_in.timestamp) != current_period:
            continue
        seen.add(check_in.status)

    if CheckIn.Status.VERIFIED in seen:
        return CheckIn.Status.VERIFIED
    if CheckIn.Status.PENDING in seen:
        return CheckIn.Status.PENDING
    if CheckIn.Status.REJECTED in seen:
        return CheckIn.Status.REJECTED
    if CheckIn.Status.EXPIRED in seen:
        return CheckIn.Status.EXPIRED
    return None


def attach_period_checkin_statuses(pacts, now=None):
    """Set ``period_status`` on each pact from recent check-ins (batched)."""
    pact_list = list(pacts)
    if not pact_list:
        return pact_list

    now = now or timezone.now()
    window_start = now - timedelta(days=7)
    checkins = (
        CheckIn.objects.filter(pact_id__in=[pact.id for pact in pact_list], timestamp__gte=window_start)
        .with_lazy_expiration(now=now)
        .only("timestamp", "status", "pact_id")
    )

    by_pact = defaultdict(list)
    for check_in in checkins:
        by_pact[check_in.pact_id].append(check_in)

    for pact in pact_list:
        pact.period_status = current_period_checkin_status(
            pact, checkins=by_pact.get(pact.id, []), now=now
        )

    return pact_list


def _next_period_start(pact, period_start):
    if pact.frequency == Pact.Frequency.DAILY:
        return period_start + timedelta(days=1)
    if pact.frequency == Pact.Frequency.WEEKLY:
        return period_start + timedelta(days=7)

    raise ValueError(f"Unsupported pact frequency: {pact.frequency}")


def calculate_streak(pact, checkins=None):
    """Return the current and longest streak for a pact.

    The streak is built from check-in periods, not from raw timestamps.
    For each daily or weekly period, only "verified" check-ins extend the
    streak. "Rejected" and "expired" check-ins break the chain for that period.
    Pending check-ins are ignored here; they should be expired lazily before
    calling this function if you want them to count as a break.

    This function is intentionally pure and testable: pass an explicit iterable
    of check-ins in tests, or let it load the pact history itself in production.
    """

    if checkins is None:
        checkins = pact.checkins.order_by("timestamp").only("timestamp", "status", "pact")

    periods = OrderedDict()
    for check_in in checkins:
        if check_in.status not in {
            CheckIn.Status.VERIFIED,
            CheckIn.Status.REJECTED,
            CheckIn.Status.EXPIRED,
        }:
            continue

        period = _period_start(pact, check_in.timestamp)
        bucket = periods.setdefault(period, {"verified": False, "breaks": False})

        if check_in.status == CheckIn.Status.VERIFIED:
            bucket["verified"] = True
        else:
            bucket["breaks"] = True

    current_streak = 0
    longest_streak = 0
    running_streak = 0
    previous_verified_period = None

    for period_start, bucket in periods.items():
        has_verified = bucket["verified"]
        has_break = bucket["breaks"]

        if not has_verified or has_break:
            running_streak = 0
            previous_verified_period = None
            if has_break:
                current_streak = 0
            continue

        if previous_verified_period is None:
            running_streak = 1
        elif _next_period_start(pact, previous_verified_period) == period_start:
            running_streak += 1
        else:
            running_streak = 1

        previous_verified_period = period_start
        current_streak = running_streak
        longest_streak = max(longest_streak, running_streak)

    return StreakSummary(current_streak=current_streak, longest_streak=longest_streak)

HEATMAP_NONE = "none"
HEATMAP_PENDING = "pending"
HEATMAP_VERIFIED = "verified"


def build_contribution_heatmap(checkins, *, weeks=12, today=None):
    """Build a Sun–Sat contribution-grid day list for heatmap rendering.

    Collapses check-in statuses into three display states:
    - none: no check-in, rejected, or expired
    - pending: submitted, awaiting verification
    - verified: counts toward streak

    Returns a dict with start_date, end_date, weeks, and days
    (chronological cells covering complete weeks, Sunday-first).
    """
    from datetime import date as date_cls

    today = today or timezone.localdate()
    if not isinstance(today, date_cls):
        today = timezone.localtime(today).date()

    # Align window to Sundays: start = Sunday of (today - (weeks-1) weeks)
    end_weekday = (today.weekday() + 1) % 7  # Sunday == 0
    range_end = today
    # Last cell week ends on Saturday of the current week
    week_saturday = today + timedelta(days=(6 - end_weekday))
    range_start_sunday = week_saturday - timedelta(days=(weeks * 7 - 1))

    status_rank = {
        HEATMAP_VERIFIED: 3,
        HEATMAP_PENDING: 2,
        HEATMAP_NONE: 1,
    }

    def collapse_status(raw_status):
        if raw_status == CheckIn.Status.VERIFIED:
            return HEATMAP_VERIFIED
        if raw_status == CheckIn.Status.PENDING:
            return HEATMAP_PENDING
        return HEATMAP_NONE

    by_day = {}
    for check_in in checkins:
        day_key = timezone.localtime(check_in.timestamp).date()
        if day_key < range_start_sunday or day_key > range_end:
            continue
        collapsed = collapse_status(check_in.status)
        current = by_day.get(day_key)
        if current is None or status_rank[collapsed] > status_rank[current]:
            by_day[day_key] = collapsed

    days = []
    current = range_start_sunday
    last_cell = week_saturday
    while current <= last_cell:
        if current > range_end:
            status = HEATMAP_NONE
            in_range = False
        else:
            status = by_day.get(current, HEATMAP_NONE)
            in_range = True
        days.append(
            {
                "date": current.isoformat(),
                "status": status,
                "in_range": in_range,
            }
        )
        current += timedelta(days=1)

    return {
        "weeks": weeks,
        "start_date": range_start_sunday.isoformat(),
        "end_date": range_end.isoformat(),
        "days": days,
    }

