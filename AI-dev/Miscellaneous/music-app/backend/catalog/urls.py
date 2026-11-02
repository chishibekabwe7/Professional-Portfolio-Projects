from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import *
from uploads.views import UploadUrlView
router=DefaultRouter()
router.register('tracks',TrackViewSet,basename='track'); router.register('albums',AlbumViewSet,basename='album'); router.register('artists',ArtistViewSet,basename='artist'); router.register('genres',GenreViewSet,basename='genre'); router.register('playlists',PlaylistViewSet,basename='playlist'); router.register('playlist-tracks',PlaylistTrackViewSet,basename='playlist-track'); router.register('reports',ReportViewSet,basename='report')
urlpatterns=router.urls + [path('me/',me),path('stats/',stats),path('likes/me/',my_likes),path('tracks/upload-url/',UploadUrlView.as_view())]

