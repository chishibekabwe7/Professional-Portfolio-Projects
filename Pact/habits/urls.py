from django.contrib.auth import views as auth_views
from django.urls import path

from . import views


urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("pacts/new/", views.pact_create, name="pact_create"),
    path("pacts/<int:pact_id>/", views.pact_detail, name="pact_detail"),
    path("pacts/<int:pact_id>/edit/", views.pact_edit, name="pact_edit"),
    path("pacts/<int:pact_id>/delete/", views.pact_delete, name="pact_delete"),
    path("pacts/<int:pact_id>/check-ins/new/", views.checkin_create, name="checkin_create"),
    path("verification/inbox/", views.verification_inbox, name="verification_inbox"),
    path("verification/inbox/api/", views.verification_inbox_api, name="verification_inbox_api"),
    path(
        "verification/check-ins/<int:check_in_id>/respond/",
        views.respond_to_checkin,
        name="respond_to_checkin",
    ),
    path(
        "verification/check-ins/<int:check_in_id>/respond/api/",
        views.respond_to_checkin_api,
        name="respond_to_checkin_api",
    ),
    path("pacts/<int:pact_id>/check-ins/api/", views.pact_checkins_api, name="pact_checkins_api"),
    path("register/", views.register, name="register"),
    path(
        "login/",
        auth_views.LoginView.as_view(template_name="habits/login.html"),
        name="login",
    ),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("friends/", views.find_friends, name="find_friends"),
    path(
        "friends/request/<int:user_id>/",
        views.send_friend_request,
        name="send_friend_request",
    ),
    path("friends/requests/", views.friend_requests, name="friend_requests"),
    path(
        "friends/requests/<int:friendship_id>/accept/",
        views.accept_friend_request,
        name="accept_friend_request",
    ),
    path(
        "friends/requests/<int:friendship_id>/reject/",
        views.reject_friend_request,
        name="reject_friend_request",
    ),
]
