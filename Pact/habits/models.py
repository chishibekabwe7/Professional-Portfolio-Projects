from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import F, Q


class Friendship(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_friend_requests",
    )
    addressee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_friend_requests",
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["requester", "addressee"],
                name="unique_friend_request_pair",
            ),
            models.CheckConstraint(
                check=~Q(requester=F("addressee")),
                name="friendship_distinct_users",
            ),
        ]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.requester} -> {self.addressee} ({self.status})"

    def other_user(self, user):
        if user == self.requester:
            return self.addressee
        if user == self.addressee:
            return self.requester
        return None

    @classmethod
    def accepted_friends_for(cls, user):
        friendships = cls.objects.filter(status=cls.Status.ACCEPTED).filter(
            Q(requester=user) | Q(addressee=user)
        )
        friend_ids = [
            friendship.other_user(user).id
            for friendship in friendships
            if friendship.other_user(user) is not None
        ]
        return get_user_model().objects.filter(id__in=friend_ids)


class Pact(models.Model):
    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pacts",
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    frequency = models.CharField(max_length=10, choices=Frequency.choices, db_index=True)
    witnesses = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="witnessed_pacts",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner", "is_active"]),
            models.Index(fields=["frequency"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title


class CheckIn(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    pact = models.ForeignKey(
        Pact,
        on_delete=models.CASCADE,
        related_name="checkins",
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="checkins_submitted",
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    note = models.TextField(blank=True)
    photo = models.ImageField(upload_to="checkins/", blank=True, null=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["timestamp"]),
            models.Index(fields=["pact", "status"]),
            models.Index(fields=["submitted_by", "timestamp"]),
        ]
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.pact} - {self.submitted_by} - {self.timestamp:%Y-%m-%d %H:%M}"


class Verification(models.Model):
    class Decision(models.TextChoices):
        APPROVE = "approve", "Approve"
        REJECT = "reject", "Reject"

    check_in = models.ForeignKey(
        CheckIn,
        on_delete=models.CASCADE,
        related_name="verifications",
    )
    witness = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="verifications_given",
    )
    decision = models.CharField(max_length=10, choices=Decision.choices, db_index=True)
    responded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    comment = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["check_in", "witness"],
                name="unique_verification_per_witness",
            ),
        ]
        indexes = [
            models.Index(fields=["decision"]),
            models.Index(fields=["responded_at"]),
            models.Index(fields=["check_in", "decision"]),
        ]

    def __str__(self):
        return f"{self.witness} on {self.check_in} ({self.decision})"


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="profiles/", blank=True, null=True)

    def __str__(self):
        return f"Profile of {self.user}"