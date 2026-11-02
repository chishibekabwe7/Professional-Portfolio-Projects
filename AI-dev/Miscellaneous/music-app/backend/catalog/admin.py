from django.contrib import admin
from .models import ArtistProfile,Genre,Album,Track,Playlist,PlaylistTrack,Like,PlayEvent,Report
admin.site.register([ArtistProfile,Genre,Album,Track,Playlist,PlaylistTrack,Like,PlayEvent,Report])
