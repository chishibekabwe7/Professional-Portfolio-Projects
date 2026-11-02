import uuid
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
class UserManager(BaseUserManager):
 def create_user(self,email,password=None,**extra):
  if not email: raise ValueError('Email is required')
  user=self.model(email=self.normalize_email(email),**extra); user.set_password(password); user.save(using=self._db); return user
 def create_superuser(self,email,password=None,**extra):
  extra.setdefault('is_staff',True); extra.setdefault('is_superuser',True); return self.create_user(email,password,**extra)
class User(AbstractBaseUser,PermissionsMixin):
 id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False); email=models.EmailField(unique=True); display_name=models.CharField(max_length=120,blank=True); is_active=models.BooleanField(default=True); is_staff=models.BooleanField(default=False); date_joined=models.DateTimeField(auto_now_add=True)
 USERNAME_FIELD='email'; REQUIRED_FIELDS=[]
 objects=UserManager()
 def __str__(self): return self.email
