from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.db.models import Q
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from .forms import PactForm
from .models import Friendship, Pact, Profile


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

    return render(
        request,
        "habits/pact_detail.html",
        {
            "pact": pact,
            "is_owner": pact.owner_id == request.user.id,
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
