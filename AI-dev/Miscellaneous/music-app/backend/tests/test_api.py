import pytest
from rest_framework.test import APIClient
from accounts.models import User
from catalog.models import *
@pytest.fixture
def user(db): return User.objects.create_user(email='u@example.com',password='password123')
@pytest.fixture
def track(db,user):
 a=ArtistProfile.objects.create(name='Artist'); g=Genre.objects.create(name='Rock',slug='rock'); return Track.objects.create(title='Song',artist=a,genre=g,uploaded_by=user,status='ready')
@pytest.mark.django_db
def test_exact_track_contract(track):
 d=APIClient().get('/api/tracks/').json()['results'][0]; assert set(d)=={'id','title','artist_id','artist_name','album_id','album_title','genre','audio_url','cover_url','duration_seconds','is_public'}
@pytest.mark.django_db
def test_email_registration_and_login():
 c=APIClient(); assert c.post('/api/auth/register/',{'email':'a@x.com','password':'password123'}).status_code==201; r=c.post('/api/auth/login/',{'email':'a@x.com','password':'password123'}); assert r.status_code==200 and 'refresh' in r.data
@pytest.mark.django_db
def test_upload_requires_auth_and_accepts_audio(user):
 c=APIClient(); assert c.post('/api/uploads/upload-url/',{'filename':'x.mp3'}).status_code==401; c.force_authenticate(user); r=c.post('/api/uploads/upload-url/',{'filename':'x.mp3','content_type':'audio/mpeg'}); assert r.status_code==201 and 'upload_url' in r.data
@pytest.mark.django_db
def test_like_play_and_report(user,track):
 c=APIClient(); c.force_authenticate(user); assert c.post(f'/api/tracks/{track.id}/like/').status_code==200; assert Like.objects.count()==1; assert c.post(f'/api/tracks/{track.id}/play/',{'seconds_played':4}).status_code==201; assert c.post('/api/reports/',{'track':str(track.id),'reason':'copyright'}).status_code==201
@pytest.mark.django_db
def test_playlist_creation(user,track):
 c=APIClient(); c.force_authenticate(user); r=c.post('/api/playlists/',{'title':'Mix','description':'','track_ids':[str(track.id)]}); assert r.status_code==201; assert PlaylistTrack.objects.count()==1
