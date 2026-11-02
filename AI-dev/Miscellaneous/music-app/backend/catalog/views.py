from django.db.models import Count,Sum
from rest_framework import viewsets,permissions,filters,status
from rest_framework.decorators import action,api_view,permission_classes
from rest_framework.response import Response
from .models import *
from .serializers import *
class Owner(permissions.BasePermission):
    def has_object_permission(self,r,v,o): return r.method in permissions.SAFE_METHODS or o.owner_id==r.user.id
class TrackViewSet(viewsets.ModelViewSet):
    filter_backends=[filters.SearchFilter,filters.OrderingFilter]; search_fields=['title','artist__name','genre__name']; ordering_fields=['title','created_at','plays_count']; permission_classes=[permissions.IsAuthenticatedOrReadOnly]
    def get_queryset(self):
        qs=Track.objects.select_related('artist','album','genre').order_by('-created_at')
        return qs.filter(uploaded_by=self.request.user) if self.action in ('update','partial_update','destroy') and self.request.user.is_authenticated else qs.filter(is_public=True,status='ready')
    def get_serializer_class(self): return TrackCreateSerializer if self.action in ('create','update','partial_update') else TrackSerializer
    @action(detail=True,methods=['post'],permission_classes=[permissions.IsAuthenticated])
    def like(self,request,pk=None): Like.objects.get_or_create(user=request.user,track=self.get_object()); return Response({'liked':True})
    @action(detail=True,methods=['delete'],permission_classes=[permissions.IsAuthenticated])
    def unlike(self,request,pk=None): Like.objects.filter(user=request.user,track=self.get_object()).delete(); return Response(status=204)
    @action(detail=True,methods=['post'],permission_classes=[permissions.AllowAny])
    def play(self,request,pk=None):
        track=self.get_object(); PlayEvent.objects.create(user=request.user if request.user.is_authenticated else None,track=track,seconds_played=request.data.get('seconds_played',0)); Track.objects.filter(pk=track.pk).update(plays_count=track.plays_count+1); return Response(status=201)
class AlbumViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=AlbumSerializer; queryset=Album.objects.filter(is_public=True,status='published').select_related('artist').prefetch_related('tracks__artist','tracks__album','tracks__genre')
class ArtistViewSet(viewsets.ReadOnlyModelViewSet): serializer_class=ArtistProfileSerializer; queryset=ArtistProfile.objects.prefetch_related('tracks__artist','tracks__album','tracks__genre')
class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=GenreSerializer
    queryset=Genre.objects.all()
class PlaylistViewSet(viewsets.ModelViewSet):
    permission_classes=[permissions.IsAuthenticatedOrReadOnly,Owner]; filter_backends=[filters.SearchFilter]; search_fields=['title','description']
    def get_queryset(self): return Playlist.objects.filter(is_public=True).prefetch_related('tracks__artist','tracks__album','tracks__genre')
    def get_serializer_class(self): return PlaylistSerializer if self.action in ('list','retrieve') else PlaylistWriteSerializer
class PlaylistTrackViewSet(viewsets.ModelViewSet):
    serializer_class=PlaylistTrackSerializer
    permission_classes=[permissions.IsAuthenticated]
    def get_queryset(self): return PlaylistTrack.objects.filter(playlist__owner=self.request.user)
class ReportViewSet(viewsets.ModelViewSet):
    serializer_class=ReportSerializer; permission_classes=[permissions.IsAuthenticated]; http_method_names=['get','post','head','options']
    def get_queryset(self): return Report.objects.filter(reporter=self.request.user)
    def perform_create(self,s): s.save(reporter=self.request.user)
@api_view(['GET'])
def stats(request): return Response({'tracks':Track.objects.filter(is_public=True,status='ready').count(),'artists':ArtistProfile.objects.count(),'albums':Album.objects.filter(is_public=True).count(),'plays':PlayEvent.objects.count()})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request): return Response({'id':str(request.user.id),'email':request.user.email,'display_name':request.user.display_name})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_likes(request): return Response(TrackSerializer(Track.objects.filter(likes__user=request.user),many=True).data)

