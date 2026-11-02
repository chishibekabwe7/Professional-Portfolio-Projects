import uuid
from django.conf import settings
from django.db import models
class ArtistProfile(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); name=models.CharField(max_length=200); bio=models.TextField(blank=True); image_key=models.CharField(max_length=500,blank=True); owner=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.SET_NULL,related_name='artist_profiles'); created_at=models.DateTimeField(auto_now_add=True)
class Genre(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); name=models.CharField(max_length=100,unique=True); slug=models.SlugField(unique=True)
class Album(models.Model):
    STATUS=[('draft','Draft'),('published','Published'),('archived','Archived')]
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); title=models.CharField(max_length=200); artist=models.ForeignKey(ArtistProfile,on_delete=models.CASCADE,related_name='albums'); cover_key=models.CharField(max_length=500,blank=True); release_date=models.DateField(null=True,blank=True); status=models.CharField(max_length=20,choices=STATUS,default='draft'); is_public=models.BooleanField(default=False); created_at=models.DateTimeField(auto_now_add=True)
class Track(models.Model):
    STATUS=[('processing','Processing'),('ready','Ready'),('failed','Failed')]
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); title=models.CharField(max_length=200); artist=models.ForeignKey(ArtistProfile,on_delete=models.CASCADE,related_name='tracks'); album=models.ForeignKey(Album,on_delete=models.SET_NULL,null=True,blank=True,related_name='tracks'); genre=models.ForeignKey(Genre,on_delete=models.SET_NULL,null=True,blank=True,related_name='tracks'); audio_key=models.CharField(max_length=500,blank=True); cover_key=models.CharField(max_length=500,blank=True); duration_seconds=models.PositiveIntegerField(default=0); is_public=models.BooleanField(default=True); status=models.CharField(max_length=20,choices=STATUS,default='processing'); uploaded_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='uploaded_tracks'); plays_count=models.PositiveIntegerField(default=0); failure_reason=models.TextField(blank=True); created_at=models.DateTimeField(auto_now_add=True); updated_at=models.DateTimeField(auto_now=True)
class Playlist(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); title=models.CharField(max_length=200); description=models.TextField(blank=True); cover_key=models.CharField(max_length=500,blank=True); owner=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='playlists'); is_public=models.BooleanField(default=True); created_at=models.DateTimeField(auto_now_add=True); tracks=models.ManyToManyField(Track,through='PlaylistTrack',related_name='playlists')
class PlaylistTrack(models.Model):
    playlist=models.ForeignKey(Playlist,on_delete=models.CASCADE,related_name='playlist_tracks'); track=models.ForeignKey(Track,on_delete=models.CASCADE,related_name='playlist_tracks'); position=models.PositiveIntegerField(default=0); added_at=models.DateTimeField(auto_now_add=True)
    class Meta: ordering=['position']; constraints=[models.UniqueConstraint(fields=('playlist','track'),name='unique_playlist_track')]
class Like(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='likes'); track=models.ForeignKey(Track,on_delete=models.CASCADE,related_name='likes'); created_at=models.DateTimeField(auto_now_add=True)
    class Meta: constraints=[models.UniqueConstraint(fields=('user','track'),name='unique_track_like')]
class PlayEvent(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.SET_NULL); track=models.ForeignKey(Track,on_delete=models.CASCADE,related_name='plays'); seconds_played=models.PositiveIntegerField(default=0); created_at=models.DateTimeField(auto_now_add=True)
class Report(models.Model):
    STATUS=[('pending','Pending'),('reviewing','Reviewing'),('resolved','Resolved'),('rejected','Rejected')]
    reporter=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='reports'); track=models.ForeignKey(Track,null=True,blank=True,on_delete=models.CASCADE,related_name='reports'); playlist=models.ForeignKey(Playlist,null=True,blank=True,on_delete=models.CASCADE,related_name='reports'); reason=models.CharField(max_length=100); details=models.TextField(blank=True); status=models.CharField(max_length=20,choices=STATUS,default='pending'); created_at=models.DateTimeField(auto_now_add=True)
