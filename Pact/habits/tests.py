"""Automated test suite for Pact.

Covers the three behaviours that make Pact distinct from a simple CRUD app:

  1. StreakCalculationTests     - the DERIVED streak logic in habits/services.py.
  2. VerificationWorkflowTests  - the pending -> verified / rejected transition.
  3. VerificationInboxAPITests  - the JSON endpoints called by static/habits/inbox.js.

Day boundary note
-----------------
The app derives a check-in's "day" via ``timezone.localtime(timestamp).date()``
(see habits/services.py:_period_start), so all fixtures build timezone-aware
datetimes in the active timezone (settings.TIME_ZONE = "UTC", USE_TZ = True).
The midnight tests therefore guard against the classic bug of treating two
check-ins on either side of midnight as a single day.

Note on photo_url: CheckIn.photo is an optional ImageField; tests never attach
one, so photo_url stays None in the API payload.
"""

from datetime import datetime

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import CheckIn, Friendship, Pact, Verification
from .services import StreakSummary, calculate_streak

# Real PBKDF2 hashing (Django 6 default ~1M iterations) makes every fixture
# user creation slow. MD5 is a well-known test-only stand-in and does not
# change any behaviour under test.
FAST_HASHERS = {"PASSWORD_HASHERS": ["django.contrib.auth.hashers.MD5PasswordHasher"]}


def _aware(hour, minute, day, month=1, year=2026):
    """Build an aware datetime in the project's active timezone."""
    return timezone.make_aware(datetime(year, month, day, hour, minute))


class StreakFixtureMixin:
    """Shared fixtures for the streak and workflow test classes."""

    def setUp(self):
        super().setUp()
        self.owner = User.objects.create_user(username="owner", password="test-password")
        self.witness = User.objects.create_user(
            username="witness", password="test-password"
        )
        self.pact = Pact.objects.create(
            owner=self.owner,
            title="Read 20 minutes",
            frequency=Pact.Frequency.DAILY,
        )
        self.pact.witnesses.add(self.witness)

    def make_checkin(self, timestamp, status=CheckIn.Status.PENDING,
                     submitted_by=None, pact=None):
        """Create a CheckIn then pin its timestamp.

        ``timestamp`` is ``auto_now_add=True``, so it is set at insert time and
        an explicit value passed to ``create()`` would be ignored; we therefore
        create the row and then overwrite the timestamp with ``update()``.
        """
        pact = pact or self.pact
        check_in = CheckIn.objects.create(
            pact=pact,
            submitted_by=submitted_by or self.owner,
            note="",
            status=status,
        )
        CheckIn.objects.filter(pk=check_in.pk).update(timestamp=timestamp)
        check_in.refresh_from_db()
        return check_in

    def streak(self):
        """Compute the derived streak from this fixture's pact history."""
        ordered = list(self.pact.checkins.order_by("timestamp"))
        return calculate_streak(self.pact, checkins=ordered)


@override_settings(**FAST_HASHERS)
class StreakCalculationTests(StreakFixtureMixin, TestCase):
    """Tests for the derived streak derivation in habits/services.py.

    The streak is computed at read time from a pact's check-in history: only a
    VERIFIED check-in extends the run, a REJECTED/EXPIRED check-in breaks it,
    and PENDING check-ins are ignored entirely (they only surface as breaks if
    lazily expired beforehand by the queryset layer).
    """

    def test_single_verified_checkin_produces_streak_of_one(self):
        """A lone verified check-in must yield a 1-day current and longest streak."""
        self.make_checkin(_aware(9, 0, 5), status=CheckIn.Status.VERIFIED)
        summary = self.streak()
        self.assertIsInstance(summary, StreakSummary)
        self.assertEqual(summary.current_streak, 1)
        self.assertEqual(summary.longest_streak, 1)

    def test_consecutive_daily_checkins_increase_streak(self):
        """Verified check-ins on consecutive days must build an increasing streak."""
        for day in (5, 6, 7):
            self.make_checkin(_aware(9, 0, day), status=CheckIn.Status.VERIFIED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 3)
        self.assertEqual(summary.longest_streak, 3)

    def test_gap_in_checkins_resets_streak(self):
        """A missed day between verified check-ins resets the current streak."""
        for day in (5, 6, 8):  # day 7 is skipped
            self.make_checkin(_aware(9, 0, day), status=CheckIn.Status.VERIFIED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 1)
        self.assertEqual(summary.longest_streak, 2)

    def test_pending_checkin_does_not_count_toward_streak(self):
        """A pending (unverified) check-in must not extend the streak."""
        # A single pending check-in yields zero streak.
        self.make_checkin(_aware(9, 0, 5), status=CheckIn.Status.PENDING)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 0)
        self.assertEqual(summary.longest_streak, 0)

        # A pending check-in between two verified ones acts as a hole: the
        # verified day *after* it restarts the chain at 1 rather than linking.
        self.make_checkin(_aware(9, 0, 4), status=CheckIn.Status.VERIFIED)
        self.make_checkin(_aware(9, 0, 5), status=CheckIn.Status.PENDING)
        self.make_checkin(_aware(9, 0, 6), status=CheckIn.Status.VERIFIED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 1)
        self.assertEqual(summary.longest_streak, 1)

    def test_rejected_checkin_does_not_count_toward_streak(self):
        """A rejected check-in must neither count nor bridge the streak."""
        # A single rejected check-in yields zero streak.
        self.make_checkin(_aware(9, 0, 5), status=CheckIn.Status.REJECTED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 0)
        self.assertEqual(summary.longest_streak, 0)

        # A rejection between two verifications breaks the chain and jumps the
        # current streak back to zero (the verified day before is retained only
        # as history, i.e. longest streak).
        self.make_checkin(_aware(9, 0, 4), status=CheckIn.Status.VERIFIED)
        self.make_checkin(_aware(9, 0, 5), status=CheckIn.Status.REJECTED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 0)
        self.assertEqual(summary.longest_streak, 1)

    def test_two_checkins_same_day_do_not_double_count(self):
        """Two verified check-ins on one calendar day must count as a single period."""
        self.make_checkin(_aware(8, 0, 5), status=CheckIn.Status.VERIFIED)
        self.make_checkin(_aware(20, 0, 5), status=CheckIn.Status.VERIFIED)
        self.make_checkin(_aware(9, 0, 6), status=CheckIn.Status.VERIFIED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 2)
        self.assertEqual(summary.longest_streak, 2)

    def test_midnight_boundary_checkins_are_distinct_days(self):
        """Check-ins just before and just after midnight are distinct days.

        Guards the common bug of collapsing a 23:59 check-in and a 00:01
        check-in into the same calendar day. The app buckets by the local
        calendar date (timezone.localtime(timestamp).date()), so these two
        fall in different periods and must produce a 2-day streak.
        """
        self.make_checkin(_aware(23, 59, 5), status=CheckIn.Status.VERIFIED)
        self.make_checkin(_aware(0, 1, 6), status=CheckIn.Status.VERIFIED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 2)
        self.assertEqual(summary.longest_streak, 2)

    def test_two_checkins_same_day_spanning_midnight_count_once(self):
        """Two verified check-ins within the same calendar day count once.

        Counterpart to the boundary test: 00:01 and 23:59 on the *same* day
        share a period, so the streak must not be inflated.
        """
        self.make_checkin(_aware(0, 1, 5), status=CheckIn.Status.VERIFIED)
        self.make_checkin(_aware(23, 59, 5), status=CheckIn.Status.VERIFIED)
        summary = self.streak()
        self.assertEqual(summary.current_streak, 1)
        self.assertEqual(summary.longest_streak, 1)


@override_settings(**FAST_HASHERS)
class VerificationWorkflowTests(StreakFixtureMixin, TestCase):
    """Tests for the pending -> verified / rejected state transition.

    Who may respond is enforced by the *view* layer (views.py scopes the
    queryset to ``CheckIn.objects.pending_for_witness(request.user)`` before
    get_object_or_404), not by the models. The model only has a unique
    (check_in, witness) constraint to stop duplicate Verification rows.
    """

    def setUp(self):
        super().setUp()
        self.stranger = User.objects.create_user(
            username="stranger", password="test-password"
        )
        Friendship.objects.create(
            requester=self.owner,
            addressee=self.witness,
            status=Friendship.Status.ACCEPTED,
        )
        self.other_pact_viewer = User.objects.create_user(
            username="other_witness", password="test-password"
        )

    def respond(self, user, check_in, decision, expected_status):
        """Post a decision via the JSON API the way inbox.js does."""
        self.client.force_login(user)
        response = self.client.post(
            reverse("respond_to_checkin_api", args=[check_in.id]),
            {"decision": decision},
        )
        self.assertEqual(response.status_code, expected_status)
        return response

    def test_new_checkin_defaults_to_pending(self):
        """A freshly created CheckIn must start in the pending state."""
        check_in = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        self.assertEqual(check_in.status, CheckIn.Status.PENDING)

    def test_only_designated_witness_can_approve(self):
        """The designated witness approves; owner and unrelated user cannot."""
        check_in = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)

        self.respond(self.witness, check_in, Verification.Decision.APPROVE, 200)

        # Owner of the pact / submitter of the check-in is not a witness.
        check_in_two = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        self.respond(self.owner, check_in_two, Verification.Decision.APPROVE, 404)

        # A user who witnesses a DIFFERENT pact must not see this one.
        other_pact = Pact.objects.create(
            owner=self.owner,
            title="Another pact",
            frequency=Pact.Frequency.DAILY,
        )
        other_pact.witnesses.add(self.other_pact_viewer)
        check_in_three = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        self.respond(self.other_pact_viewer, check_in_three, Verification.Decision.APPROVE, 404)

        # The stranger is not involved at all.
        check_in_four = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        self.respond(self.stranger, check_in_four, Verification.Decision.APPROVE, 404)

        # None of the rejected attempts may have mutated the check-ins.
        for item in (check_in_two, check_in_three, check_in_four):
            item.refresh_from_db()
            self.assertEqual(item.status, CheckIn.Status.PENDING)

    def test_approve_transitions_to_verified_and_updates_streak(self):
        """Approving a pending CheckIn marks it verified and the derived streak reflects it."""
        check_in = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        self.assertEqual(self.streak().current_streak, 0)

        self.respond(self.witness, check_in, Verification.Decision.APPROVE, 200)

        check_in.refresh_from_db()
        self.assertEqual(check_in.status, CheckIn.Status.VERIFIED)
        self.assertTrue(
            Verification.objects.filter(
                check_in=check_in, witness=self.witness, decision=Verification.Decision.APPROVE
            ).exists()
        )
        summary = self.streak()
        self.assertEqual(summary.current_streak, 1)
        self.assertEqual(summary.longest_streak, 1)

    def test_reject_transitions_to_rejected_and_excludes_from_streak(self):
        """Rejecting a pending CheckIn marks it rejected and it is excluded from the streak."""
        check_in = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)

        self.respond(self.witness, check_in, Verification.Decision.REJECT, 200)

        check_in.refresh_from_db()
        self.assertEqual(check_in.status, CheckIn.Status.REJECTED)
        self.assertTrue(
            Verification.objects.filter(
                check_in=check_in, witness=self.witness, decision=Verification.Decision.REJECT
            ).exists()
        )
        summary = self.streak()
        self.assertEqual(summary.current_streak, 0)
        self.assertEqual(summary.longest_streak, 0)

    def test_verified_checkin_cannot_be_reacted_to_again(self):
        """An already-verified CheckIn cannot be re-approved or re-rejected.

        The guard lives in the view: pending_for_witness() only returns PENDING
        check-ins with no prior Verification from this witness, and it also
        excludes submitted_by == witness; get_object_or_404 then 404s.
        """
        check_in = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        self.respond(self.witness, check_in, Verification.Decision.APPROVE, 200)
        self.respond(self.witness, check_in, Verification.Decision.APPROVE, 404)
        self.respond(self.witness, check_in, Verification.Decision.REJECT, 404)

        check_in.refresh_from_db()
        self.assertEqual(check_in.status, CheckIn.Status.VERIFIED)
        self.assertEqual(
            Verification.objects.filter(check_in=check_in, witness=self.witness).count(), 1
        )

    def test_rejected_checkin_cannot_be_reacted_to_again(self):
        """An already-rejected CheckIn cannot be approved or rejected a second time."""
        check_in = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        self.respond(self.witness, check_in, Verification.Decision.REJECT, 200)
        self.respond(self.witness, check_in, Verification.Decision.APPROVE, 404)
        self.respond(self.witness, check_in, Verification.Decision.REJECT, 404)

        check_in.refresh_from_db()
        self.assertEqual(check_in.status, CheckIn.Status.REJECTED)
        self.assertEqual(
            Verification.objects.filter(check_in=check_in, witness=self.witness).count(), 1
        )

    def test_duplicate_verification_row_blocked_by_database_constraint(self):
        """The DB unique (check_in, witness) constraint blocks a second Verification.

        NOTE: there is no app-level guard inside Verification.save(); the
        protection is purely the database constraint plus the view queryset.
        This test asserts the constraint exists and works.
        """
        check_in = self.make_checkin(timezone.now(), status=CheckIn.Status.PENDING)
        Verification.objects.create(
            check_in=check_in, witness=self.witness, decision=Verification.Decision.APPROVE
        )
        with self.assertRaises(IntegrityError):
            Verification.objects.create(
                check_in=check_in,
                witness=self.witness,
                decision=Verification.Decision.REJECT,
            )


@override_settings(**FAST_HASHERS)
class VerificationInboxAPITests(TestCase):
    """Tests for the JSON endpoints used by static/habits/inbox.js."""

    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="test-password")
        self.witness_a = User.objects.create_user(username="witness_a", password="test-password")
        self.witness_b = User.objects.create_user(username="witness_b", password="test-password")
        self.stranger = User.objects.create_user(username="stranger", password="test-password")

        self.pact_a = Pact.objects.create(
            owner=self.owner,
            title="Morning run",
            frequency=Pact.Frequency.DAILY,
        )
        self.pact_a.witnesses.add(self.witness_a, self.witness_b)

        self.pact_b = Pact.objects.create(
            owner=self.owner,
            title="Reading club",
            frequency=Pact.Frequency.DAILY,
        )
        self.pact_b.witnesses.add(self.witness_b)

        self.checkin_a = CheckIn.objects.create(
            pact=self.pact_a, submitted_by=self.owner, note="Ran 5k"
        )
        self.checkin_b = CheckIn.objects.create(
            pact=self.pact_b, submitted_by=self.owner, note="Read chapter 2"
        )

    def inbox_url(self):
        return reverse("verification_inbox_api")

    def respond_url(self, check_in):
        return reverse("respond_to_checkin_api", args=[check_in.id])

    def fetch_inbox(self, user=None):
        if user is not None:
            self.client.force_login(user)
        return self.client.get(self.inbox_url())

    def test_authenticated_witness_sees_only_their_pending_verifications(self):
        """The inbox is scoped per witness: only assigned pending items appear.

        witness_a witnesses pact_a only, so checkin_a must appear and checkin_b
        (pact_b, witnessed only by witness_b) must not.
        """
        response = self.fetch_inbox(self.witness_a)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        ids = {item["id"] for item in payload["checkins"]}
        self.assertEqual(ids, {self.checkin_a.id})

        # Both pact_a witnesses (a and b) see checkin_a.
        response = self.fetch_inbox(self.witness_b)
        ids = {item["id"] for item in response.json()["checkins"]}
        self.assertIn(self.checkin_a.id, ids)
        self.assertIn(self.checkin_b.id, ids)

        # A stranger sees nothing.
        response = self.fetch_inbox(self.stranger)
        self.assertEqual(response.json()["checkins"], [])

    def test_inbox_shows_expected_json_shape(self):
        """The inbox JSON payload has the fields inbox.js relies on."""
        response = self.fetch_inbox(self.witness_b)
        payload = response.json()
        self.assertIn("checkins", payload)
        for item in payload["checkins"]:
            for field in (
                "id",
                "pact_id",
                "pact_title",
                "owner_username",
                "submitted_by_username",
                "timestamp",
                "note",
                "photo_url",
                "status",
            ):
                self.assertIn(field, item)
            self.assertEqual(item["status"], CheckIn.Status.PENDING)

    def test_unauthenticated_inbox_request_redirects_to_login(self):
        """Anonymous access to the inbox is bounced to the login page."""
        response = self.client.get(self.inbox_url())
        self.assertIn(response.status_code, (301, 302, 403, 401))
        if response.status_code in (301, 302):
            self.assertIn("/login/", response["Location"])

    def test_approve_post_returns_expected_json_and_updates_database(self):
        """POSTing approve returns {ok: true, check_in, verification} and persists."""
        self.client.force_login(self.witness_a)
        response = self.client.post(
            self.respond_url(self.checkin_a), {"decision": Verification.Decision.APPROVE}
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["check_in"]["id"], self.checkin_a.id)
        self.assertEqual(payload["check_in"]["status"], CheckIn.Status.VERIFIED)
        self.assertEqual(payload["verification"]["decision"], Verification.Decision.APPROVE)
        self.assertIsInstance(payload["verification"]["id"], int)

        self.checkin_a.refresh_from_db()
        self.assertEqual(self.checkin_a.status, CheckIn.Status.VERIFIED)
        self.assertTrue(
            Verification.objects.filter(
                check_in=self.checkin_a,
                witness=self.witness_a,
                decision=Verification.Decision.APPROVE,
            ).exists()
        )

    def test_reject_post_returns_expected_json_and_updates_database(self):
        """POSTing reject persists the decision and flips the CheckIn to rejected."""
        self.client.force_login(self.witness_a)
        response = self.client.post(
            self.respond_url(self.checkin_a), {"decision": Verification.Decision.REJECT}
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["check_in"]["status"], CheckIn.Status.REJECTED)
        self.assertEqual(payload["verification"]["decision"], Verification.Decision.REJECT)

        self.checkin_a.refresh_from_db()
        self.assertEqual(self.checkin_a.status, CheckIn.Status.REJECTED)

    def test_non_witness_approve_request_is_rejected(self):
        """A user who is not the witness for a CheckIn cannot approve it.

        The view resolves the CheckIn through pending_for_witness(); a stranger
        is not in that queryset, so get_object_or_404 yields 404. The CheckIn
        must remain untouched.
        """
        self.client.force_login(self.stranger)
        response = self.client.post(
            self.respond_url(self.checkin_a), {"decision": Verification.Decision.APPROVE}
        )
        self.assertEqual(response.status_code, 404)
        self.checkin_a.refresh_from_db()
        self.assertEqual(self.checkin_a.status, CheckIn.Status.PENDING)
        self.assertEqual(self.checkin_a.verifications.count(), 0)

    def test_missing_decision_body_returns_400(self):
        """A malformed POST (no decision) returns a 400 JSON error, not a 500."""
        self.client.force_login(self.witness_a)
        response = self.client.post(self.respond_url(self.checkin_a), {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "decision is required"})

    def test_invalid_decision_value_returns_400(self):
        """An unknown decision value is rejected by the form, returning a 400."""
        self.client.force_login(self.witness_a)
        response = self.client.post(
            self.respond_url(self.checkin_a), {"decision": "maybe"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "decision is required"})

    def test_get_request_to_respond_endpoint_returns_405(self):
        """The respond endpoint only accepts POST; GET yields 405."""
        self.client.force_login(self.witness_a)
        response = self.client.get(self.respond_url(self.checkin_a))
        self.assertEqual(response.status_code, 405)

    def test_unauthenticated_respond_post_redirects_to_login(self):
        """Anonymous POSTs to the respond endpoint are redirected to login."""
        response = self.client.post(
            self.respond_url(self.checkin_a), {"decision": Verification.Decision.APPROVE}
        )
        self.assertIn(response.status_code, (301, 302, 403, 401))
        if response.status_code in (301, 302):
            self.assertIn("/login/", response["Location"])

    def test_approve_then_checkin_leaves_verified_state(self):
        """Approving then re-reading does not silently flip the CheckIn back."""
        self.client.force_login(self.witness_a)
        self.client.post(
            self.respond_url(self.checkin_a), {"decision": Verification.Decision.APPROVE}
        )
        response = self.fetch_inbox(self.witness_a)
        ids = {item["id"] for item in response.json()["checkins"]}
        self.assertNotIn(self.checkin_a.id, ids)