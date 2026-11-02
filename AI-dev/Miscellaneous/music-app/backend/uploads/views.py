from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .storage import storage
from .tasks import process_audio_upload
class UploadUrlView(APIView):
 permission_classes=[IsAuthenticated]
 def post(self,request):
  filename=request.data.get('filename'); content_type=request.data.get('content_type','audio/mpeg')
  if not filename: return Response({'detail':'filename is required.'},status=400)
  if not (content_type.startswith('audio/') or content_type.startswith('image/')): return Response({'detail':'Unsupported content type.'},status=400)
  return Response(storage.upload_url(filename,content_type),status=201)
class ProcessUploadView(APIView):
 permission_classes=[IsAuthenticated]
 def post(self,request):
  task=process_audio_upload.delay(request.data.get('track_id'))
  return Response({'task_id':task.id,'status':'queued'},status=202)
