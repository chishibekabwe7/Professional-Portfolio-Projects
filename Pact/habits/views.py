from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST
from datetime import timedelta

from .forms import CheckInForm, PactForm, VerificationActionForm
from .models import CheckIn, Friendship, Pact, Profile, Verification
from .services import calculate_streak


def register(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            Profile.objects.get_or_create(user=user)
            login(request, user)
            messages.success(request, "Account created successfully.")
            return redirect("dashboard")
    else:
        form = UserCreationForm()

    return render(request, "habits/register.html", {"form": form})


@login_required
def dashboard(request):
    owned_pacts = (
        Pact.objects.filter(owner=request.user)
        .prefetch_related("witnesses")
        .order_by("-created_at")
    )
    witnessed_pacts = (
        Pact.objects.filter(witnesses=request.user)
        .exclude(owner=request.user)
        .select_related("owner")
        .prefetch_related("witnesses")
        .order_by("-created_at")
    )

    return render(
        request,
        "habits/dashboard.html",
        {
            "owned_pacts": owned_pacts,
            "witnessed_pacts": witnessed_pacts,
        },
    )


@login_required
def pact_create(request):
    accepted_friends = Friendship.accepted_friends_for(request.user)

    if request.method == "POST":
        form = PactForm(request.POST, accepted_friends=accepted_friends)
        if form.is_valid():
            pact = form.save(commit=False)
            pact.owner = request.user
            pact.save()
            form.save_m2m()
            messages.success(request, "Pact created successfully.")
            return redirect("pact_detail", pact_id=pact.id)
    else:
        form = PactForm(accepted_friends=accepted_friends)

    return render(request, "habits/pact_form.html", {"form": form, "mode": "Create"})


@login_required
def pact_detail(request, pact_id):
    pact = get_object_or_404(Pact.objects.prefetch_related("witnesses", "checkins"), pk=pact_id)
    checkins = (
        pact.checkins.with_lazy_expiration()
        .select_related("submitted_by")
        .prefetch_related("verifications")
        .order_by("-timestamp")
    )

    return render(
        request,
        "habits/pact_detail.html",
        {
            "pact": pact,
            "is_owner": pact.owner_id == request.user.id,
            "checkins": checkins,
        },
    )


@login_required
def pact_edit(request, pact_id):
    pact = get_object_or_404(Pact, pk=pact_id)
    if pact.owner_id != request.user.id:
        messages.error(request, "You can only edit your own pacts.")
        return redirect("pact_detail", pact_id=pact.id)

    accepted_friends = Friendship.accepted_friends_for(request.user)

    if request.method == "POST":
        form = PactForm(request.POST, instance=pact, accepted_friends=accepted_friends)
        if form.is_valid():
            form.save()
            messages.success(request, "Pact updated successfully.")
            return redirect("pact_detail", pact_id=pact.id)
    else:
        form = PactForm(instance=pact, accepted_friends=accepted_friends)

    return render(request, "habits/pact_form.html", {"form": form, "mode": "Edit", "pact": pact})


@login_required
def pact_delete(request, pact_id):
    pact = get_object_or_404(Pact, pk=pact_id)
    if pact.owner_id != request.user.id:
        messages.error(request, "You can only delete your own pacts.")
        return redirect("pact_detail", pact_id=pact.id)

    if request.method == "POST":
        pact.delete()
        messages.success(request, "Pact deleted successfully.")
        return redirect("dashboard")

    return render(request, "habits/pact_confirm_delete.html", {"pact": pact})


@login_required
def checkin_create(request, pact_id):
    pact = get_object_or_404(Pact.objects.prefetch_related("witnesses"), pk=pact_id)
    if pact.owner_id != request.user.id:
        raise PermissionDenied("Only the pact owner can submit check-ins.")

    if request.method == "POST":
        form = CheckInForm(request.POST, request.FILES)
        if form.is_valid():
            check_in = form.save(commit=False)
            check_in.pact = pact
            check_in.submitted_by = request.user
            check_in.status = CheckIn.Status.PENDING
            check_in.save()
            messages.success(request, "Check-in submitted and waiting for verification.")
            return redirect("pact_detail", pact_id=pact.id)
    else:
        form = CheckInForm()

    return render(request, "habits/checkin_form.html", {"form": form, "pact": pact})


@login_required
def verification_inbox(request):
    pending_checkins = (
        CheckIn.objects.pending_for_witness(request.user)
        .select_related("pact", "submitted_by", "pact__owner")
        .order_by("-timestamp")
    )


@login_required
def verification_inbox_api(request):
    pending_checkins = (
        CheckIn.objects.pending_for_witness(request.user)
        .select_related("pact", "submitted_by", "pact__owner")
        .order_by("-timestamp")
    )

    checkins = []
    for check_in in pending_checkins:
        checkins.append(
            {
                "id": check_in.id,
                "pact_id": check_in.pact_id,
                "pact_title": check_in.pact.title,
                "owner_username": check_in.pact.owner.username,
                "submitted_by_username": check_in.submitted_by.username,
                "timestamp": check_in.timestamp.isoformat(),
                "note": check_in.note,
                "photo_url": check_in.photo.url if check_in.photo else None,
                "status": check_in.status,
            }
        )

    return JsonResponse({"checkins": checkins})

    return render(
        request,
        "habits/verification_inbox.html",
        {
            "pending_checkins": pending_checkins,
            "verification_form": VerificationActionForm(),
        },
    )


@login_required
@require_POST
def respond_to_checkin(request, check_in_id):
    check_in = get_object_or_404(
        CheckIn.objects.pending_for_witness(request.user),
        pk=check_in_id,
    )
    form = VerificationActionForm(request.POST)

    if not form.is_valid():
        messages.error(request, "Please choose approve or reject and try again.")
        return redirect("verification_inbox")

    if Verification.objects.filter(check_in=check_in, witness=request.user).exists():
        messages.info(request, "You have already responded to this check-in.")
        return redirect("verification_inbox")

    decision = form.cleaned_data["decision"]
    comment = form.cleaned_data.get("comment", "")

    Verification.objects.create(
        check_in=check_in,
        witness=request.user,
        decision=decision,
        comment=comment,
    )
    check_in.status = CheckIn.Status.VERIFIED if decision == Verification.Decision.APPROVE else CheckIn.Status.REJECTED
    check_in.save(update_fields=["status"])

    action_label = "approved" if decision == Verification.Decision.APPROVE else "rejected"
    messages.success(request, f"Check-in {action_label} successfully.")
    return redirect("verification_inbox")


@login_required
@require_POST
def respond_to_checkin_api(request, check_in_id):
    check_in = get_object_or_404(
        CheckIn.objects.pending_for_witness(request.user),
        pk=check_in_id,
    )
    form = VerificationActionForm(request.POST)

    if not form.is_valid():
        return JsonResponse({"error": "decision is required"}, status=400)

    if Verification.objects.filter(check_in=check_in, witness=request.user).exists():
        return JsonResponse({"error": "already responded"}, status=409)

    decision = form.cleaned_data["decision"]
    comment = form.cleaned_data.get("comment", "")

    verification = Verification.objects.create(
        check_in=check_in,
        witness=request.user,
        decision=decision,
        comment=comment,
    )
    check_in.status = CheckIn.Status.VERIFIED if decision == Verification.Decision.APPROVE else CheckIn.Status.REJECTED
    check_in.save(update_fields=["status"])

    return JsonResponse(
        {
            "ok": True,
            "check_in": {
                "id": check_in.id,
                "status": check_in.status,
            },
            "verification": {
                "id": verification.id,
                "decision": verification.decision,
            },
        }
    )


@login_required
def find_friends(request):
    query = request.GET.get("q", "").strip()
    results = User.objects.none()

    if query:
        results = User.objects.filter(username__icontains=query).exclude(id=request.user.id)

        connected_ids = set()
        for requester_id, addressee_id in Friendship.objects.filter(
            Q(requester=request.user) | Q(addressee=request.user)
        ).values_list("requester_id", "addressee_id"):
            connected_ids.update([requester_id, addressee_id])
        connected_ids.discard(request.user.id)
        results = results.exclude(id__in=connected_ids)

    return render(request, "habits/find_friends.html", {"query": query, "results": results})


@login_required
@require_POST
def send_friend_request(request, user_id):
    target_user = get_object_or_404(User, pk=user_id)

    if target_user == request.user:
        messages.error(request, "You cannot send a friend request to yourself.")
        return redirect("find_friends")

    existing = Friendship.objects.filter(
        Q(requester=request.user, addressee=target_user)
        | Q(requester=target_user, addressee=request.user)
    ).first()

    if existing:
        if existing.status == Friendship.Status.ACCEPTED:
            messages.info(request, f"You are already friends with {target_user.username}.")
        elif existing.requester == request.user:
            messages.info(request, f"A friend request to {target_user.username} is already pending.")
        else:
            messages.info(request, f"{target_user.username} already sent you a friend request.")
        return redirect("find_friends")

    Friendship.objects.create(
        requester=request.user,
        addressee=target_user,
        status=Friendship.Status.PENDING,
    )
    messages.success(request, "Friend request sent.")
    return redirect("find_friends")


@login_required
def friend_requests(request):
    incoming_requests = (
        Friendship.objects.filter(addressee=request.user, status=Friendship.Status.PENDING)
        .select_related("requester")
        .order_by("-created_at")
    )
    return render(request, "habits/friend_requests.html", {"incoming_requests": incoming_requests})


@login_required
@require_POST
def accept_friend_request(request, friendship_id):
    friendship = get_object_or_404(
        Friendship,
        pk=friendship_id,
        addressee=request.user,
        status=Friendship.Status.PENDING,
    )
    friendship.status = Friendship.Status.ACCEPTED
    friendship.responded_at = timezone.now()
    friendship.save(update_fields=["status", "responded_at"])
    messages.success(request, f"You are now friends with {friendship.requester.username}.")
    return redirect("friend_requests")


@login_required
@require_POST
def reject_friend_request(request, friendship_id):
    friendship = get_object_or_404(
        Friendship,
        pk=friendship_id,
        addressee=request.user,
        status=Friendship.Status.PENDING,
    )
    requester_name = friendship.requester.username
    friendship.delete()
    messages.success(request, f"Friend request from {requester_name} rejected.")
    return redirect("friend_requests")


@login_required
def pact_checkins_api(request, pact_id):
    pact = get_object_or_404(Pact, pk=pact_id)
    if pact.owner_id != request.user.id and not pact.witnesses.filter(id=request.user.id).exists():
        return JsonResponse({"error": "forbidden"}, status=403)

    checkins = list(
        pact.checkins.with_lazy_expiration().select_related("submitted_by").order_by("-timestamp")
    )
    summary = calculate_streak(pact, checkins=sorted(checkins, key=lambda check_in: check_in.timestamp))

    today = timezone.localdate()
    start_date = today - timedelta(days=89)
    checkins_by_day = {}
    status_rank = {
        CheckIn.Status.VERIFIED: 4,
        CheckIn.Status.PENDING: 3,
        CheckIn.Status.REJECTED: 2,
        CheckIn.Status.EXPIRED: 1,
    }

    for check_in in checkins:
        day_key = timezone.localtime(check_in.timestamp).date().isoformat()
        current = checkins_by_day.get(day_key)
        if current is None or status_rank[check_in.status] > status_rank[current]:
            checkins_by_day[day_key] = check_in.status

    days = []
    current_date = start_date
    while current_date <= today:
        iso_date = current_date.isoformat()
        days.append(
            {
                "date": iso_date,
                "status": checkins_by_day.get(iso_date, "no_check_in"),
            }
        )
        current_date += timedelta(days=1)

    return JsonResponse(
        {
            "pact": {
                "id": pact.id,
                "title": pact.title,
                "frequency": pact.frequency,
                "current_streak": summary.current_streak,
                "longest_streak": summary.longest_streak,
            },
            "range": {
                "start_date": start_date.isoformat(),
                "end_date": today.isoformat(),
            },
            "days": days,
            "checkins": [
                {
                    "id": check_in.id,
                    "timestamp": check_in.timestamp.isoformat(),
                    "status": check_in.status,
                }
                for check_in in checkins
            ],
        }
    )
