from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

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
    friendships = Friendship.objects.filter(status=Friendship.Status.ACCEPTED).filter(
        Q(requester=request.user) | Q(addressee=request.user)
    ).select_related("requester", "addressee")

    friends_with_pacts = []
    for friendship in friendships:
        friend = friendship.other_user(request.user)
        if friend is None:
            continue
        active_pacts = friend.pacts.filter(is_active=True).prefetch_related("witnesses")
        friends_with_pacts.append({"friend": friend, "active_pacts": active_pacts})

    my_active_pacts = (
        Pact.objects.filter(owner=request.user, is_active=True)
        .prefetch_related("witnesses")
        .order_by("-created_at")
    )

    return render(
        request,
        "habits/dashboard.html",
        {
            "friends_with_pacts": friends_with_pacts,
            "my_active_pacts": my_active_pacts,
        },
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
