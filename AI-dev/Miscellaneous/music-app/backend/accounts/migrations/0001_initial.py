import uuid
from django.db import migrations,models
import django.contrib.auth.models
from accounts.models import UserManager
class Migration(migrations.Migration):
 initial=True; dependencies=[('auth','0012_alter_user_first_name_max_length')]
 operations=[migrations.CreateModel(name='User',fields=[('password',models.CharField(max_length=128,verbose_name='password')),('last_login',models.DateTimeField(blank=True,null=True,verbose_name='last login')),('is_superuser',models.BooleanField(default=False,help_text='Designates that this user has all permissions without explicitly assigning them.',verbose_name='superuser status')),('id',models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),('email',models.EmailField(max_length=254,unique=True)),('display_name',models.CharField(blank=True,max_length=120)),('is_active',models.BooleanField(default=True)),('is_staff',models.BooleanField(default=False)),('date_joined',models.DateTimeField(auto_now_add=True)),('groups',models.ManyToManyField(blank=True,help_text='The groups this user belongs to.',related_name='user_set',related_query_name='user',to='auth.group')),('user_permissions',models.ManyToManyField(blank=True,help_text='Specific permissions for this user.',related_name='user_set',related_query_name='user',to='auth.permission'))], options={'abstract':False}, managers=[('objects',UserManager())])]

