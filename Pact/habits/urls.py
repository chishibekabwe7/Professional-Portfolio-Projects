from django.contrib.auth import views as auth_views
from django.urls import path

from . import views


urlpatterns = [
    path("", views.dashboard, name="dashboard"),
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
