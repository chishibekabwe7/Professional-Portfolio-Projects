from django.core.management.base import BaseCommand
from catalog.models import ArtistProfile,Album,Genre,Track
from accounts.models import User
class Command(BaseCommand):
 def handle(self,*args,**kwargs):
  user,_=User.objects.get_or_create(email='demo@example.com',defaults={'display_name':'Demo User'}); artist,_=ArtistProfile.objects.get_or_create(name='Demo Artist',defaults={'owner':user}); album,_=Album.objects.get_or_create(title='Demo Album',artist=artist,status='published'); genre,_=Genre.objects.get_or_create(name='Demo',slug='demo'); Track.objects.get_or_create(title='Demo Track',artist=artist,album=album,genre=genre,uploaded_by=user,defaults={'duration_seconds':180,'audio_url':'https://example.com/demo.mp3','cover_url':'https://example.com/cover.jpg','status':'ready'}); self.stdout.write(self.style.SUCCESS('Demo catalog seeded.'))
