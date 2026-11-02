from django.conf import settings
from rest_framework import serializers
from .models import *
def asset_url(key):
    return f'{settings.MEDIA_URL}{key}' if key else ''
class TrackSerializer(serializers.ModelSerializer):
    artist_id=serializers.UUIDField(source='artist.id',read_only=True); artist_name=serializers.CharField(source='artist.name',read_only=True); album_id=serializers.SerializerMethodField(); album_title=serializers.SerializerMethodField(); genre=serializers.SerializerMethodField(); audio_url=serializers.SerializerMethodField(); cover_url=serializers.SerializerMethodField()
    class Meta: model=Track; fields=('id','title','artist_id','artist_name','album_id','album_title','genre','audio_url','cover_url','duration_seconds','is_public')
    def get_album_id(self,o): return str(o.album_id or '')
    def get_album_title(self,o): return o.album.title if o.album else ''
    def get_genre(self,o): return o.genre.name if o.genre else ''
    def get_audio_url(self,o): return asset_url(o.audio_key)
    def get_cover_url(self,o): return asset_url(o.cover_key or (o.album.cover_key if o.album else ''))
class TrackCreateSerializer(serializers.ModelSerializer):
    artist_id=serializers.PrimaryKeyRelatedField(source='artist',queryset=ArtistProfile.objects.all()); album_id=serializers.PrimaryKeyRelatedField(source='album',queryset=Album.objects.all(),allow_null=True,required=False); genre_id=serializers.PrimaryKeyRelatedField(source='genre',queryset=Genre.objects.all(),allow_null=True,required=False)
    class Meta: model=Track; fields=('title','artist_id','album_id','genre_id','audio_key','cover_key','duration_seconds','is_public')
    def create(self,v): v['uploaded_by']=self.context['request'].user; return super().create(v)
class AlbumSerializer(serializers.ModelSerializer):
    artist_id=serializers.UUIDField(source='artist.id',read_only=True); artist_name=serializers.CharField(source='artist.name',read_only=True); cover_url=serializers.SerializerMethodField(); tracks=TrackSerializer(many=True,read_only=True)
    class Meta: model=Album; fields=('id','title','artist_id','artist_name','cover_url','tracks')
    def get_cover_url(self,o): return asset_url(o.cover_key)
class ArtistProfileSerializer(serializers.ModelSerializer):
    image_url=serializers.SerializerMethodField(); tracks=TrackSerializer(many=True,read_only=True)
    class Meta: model=ArtistProfile; fields=('id','name','bio','image_url','tracks')
    def get_image_url(self,o): return asset_url(o.image_key)
class PlaylistSerializer(serializers.ModelSerializer):
    cover_url=serializers.SerializerMethodField(); tracks=TrackSerializer(many=True,read_only=True)
    class Meta: model=Playlist; fields=('id','title','description','cover_url','tracks')
    def get_cover_url(self,o): return asset_url(o.cover_key)
class PlaylistWriteSerializer(serializers.ModelSerializer):
    track_ids=serializers.PrimaryKeyRelatedField(source='tracks',many=True,queryset=Track.objects.all(),write_only=True,required=False)
    class Meta: model=Playlist; fields=('title','description','cover_key','is_public','track_ids')
    def create(self,v):
        tracks=v.pop('tracks',[]); p=Playlist.objects.create(owner=self.context['request'].user,**v); PlaylistTrack.objects.bulk_create([PlaylistTrack(playlist=p,track=t,position=i) for i,t in enumerate(tracks)]); return p
class ReportSerializer(serializers.ModelSerializer):
    class Meta: model=Report; fields=('id','track','playlist','reason','details','status','created_at'); read_only_fields=('status','created_at')
class PlaylistTrackSerializer(serializers.ModelSerializer):
    class Meta: model=PlaylistTrack; fields=('id','playlist','track','position','added_at'); read_only_fields=('added_at',)

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model=Genre
        fields=('id','name','slug')

