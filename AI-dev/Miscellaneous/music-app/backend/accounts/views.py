from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer
User=get_user_model()
class RegisterView(generics.CreateAPIView): queryset=User.objects.all(); serializer_class=RegisterSerializer; permission_classes=[permissions.AllowAny]
class LogoutView(APIView):
    permission_classes=[permissions.IsAuthenticated]
    def post(self, request):
        token=request.data.get('refresh')
        if token:
            try: RefreshToken(token).blacklist()
            except Exception: pass
        return Response(status=204)
