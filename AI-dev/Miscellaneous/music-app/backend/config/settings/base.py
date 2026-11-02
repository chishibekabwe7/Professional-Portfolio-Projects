import os
from datetime import timedelta
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-only-change-this-secret')
DEBUG = os.getenv('DJANGO_DEBUG', '0') == '1'
ALLOWED_HOSTS = [h for h in os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h]
INSTALLED_APPS = ['django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','django.contrib.messages','django.contrib.staticfiles','corsheaders','rest_framework','drf_spectacular','rest_framework_simplejwt.token_blacklist','accounts','catalog','uploads']
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware','django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware']
ROOT_URLCONF='config.urls'; WSGI_APPLICATION='config.wsgi.application'; ASGI_APPLICATION='config.asgi.application'
TEMPLATES=[{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
DATABASES={'default': {'ENGINE': os.getenv('DB_ENGINE','django.db.backends.sqlite3'), 'NAME': os.getenv('DB_NAME', str(BASE_DIR/'db.sqlite3'))}}
AUTH_USER_MODEL='accounts.User'; DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'; LANGUAGE_CODE='en-us'; TIME_ZONE='UTC'; USE_I18N=True; USE_TZ=True
STATIC_URL='/static/'; STATIC_ROOT=BASE_DIR/'staticfiles'; MEDIA_URL='/media/'; MEDIA_ROOT=BASE_DIR/'media'
CORS_ALLOWED_ORIGINS=[x for x in os.getenv('CORS_ALLOWED_ORIGINS','').split(',') if x]; CORS_ALLOW_ALL_ORIGINS=os.getenv('CORS_ALLOW_ALL','0')=='1'
REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES':('rest_framework_simplejwt.authentication.JWTAuthentication',),'DEFAULT_PERMISSION_CLASSES':('rest_framework.permissions.AllowAny',),'DEFAULT_PAGINATION_CLASS':'catalog.pagination.EnvelopePagination','PAGE_SIZE':20,'DEFAULT_SCHEMA_CLASS':'drf_spectacular.openapi.AutoSchema','DEFAULT_THROTTLE_CLASSES':('rest_framework.throttling.AnonRateThrottle','rest_framework.throttling.UserRateThrottle'),'DEFAULT_THROTTLE_RATES':{'anon':'100/hour','user':'1000/hour'}}
SIMPLE_JWT={'ACCESS_TOKEN_LIFETIME':timedelta(minutes=30),'REFRESH_TOKEN_LIFETIME':timedelta(days=7),'ROTATE_REFRESH_TOKENS':True,'BLACKLIST_AFTER_ROTATION':True}
SPECTACULAR_SETTINGS={'TITLE':'Music Site API','VERSION':'1.0.0','SERVE_INCLUDE_SCHEMA':False}
CELERY_BROKER_URL=os.getenv('CELERY_BROKER_URL','redis://redis:6379/0'); CELERY_RESULT_BACKEND=CELERY_BROKER_URL
STORAGE_BACKEND=os.getenv('STORAGE_BACKEND','local'); S3_ENDPOINT_URL=os.getenv('S3_ENDPOINT_URL',''); S3_BUCKET_NAME=os.getenv('S3_BUCKET_NAME','music-site'); AWS_ACCESS_KEY_ID=os.getenv('AWS_ACCESS_KEY_ID',''); AWS_SECRET_ACCESS_KEY=os.getenv('AWS_SECRET_ACCESS_KEY',''); AWS_REGION=os.getenv('AWS_REGION','us-east-1')
