from __future__ import annotations

from collections import OrderedDict
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
