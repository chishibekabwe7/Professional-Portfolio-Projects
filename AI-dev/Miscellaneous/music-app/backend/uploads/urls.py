from django.urls import path
from .views import UploadUrlView,ProcessUploadView
urlpatterns=[path('upload-url/',UploadUrlView.as_view()),path('presign/',UploadUrlView.as_view()),path('process/',ProcessUploadView.as_view())]
