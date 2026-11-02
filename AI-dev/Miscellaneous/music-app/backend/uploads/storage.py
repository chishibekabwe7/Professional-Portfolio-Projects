import uuid
import boto3
from django.conf import settings
class Storage:
    def __init__(self): self.s3=boto3.client('s3',endpoint_url=settings.S3_ENDPOINT_URL or None,region_name=settings.AWS_REGION) if settings.STORAGE_BACKEND=='s3' else None
    def upload_url(self,filename,content_type):
        key=f'uploads/{uuid.uuid4()}-{filename}'
        if self.s3:
            url=self.s3.generate_presigned_url('put_object',Params={'Bucket':settings.S3_BUCKET_NAME,'Key':key,'ContentType':content_type},ExpiresIn=900)
        else: url=f'{settings.MEDIA_URL}{key}'
        return {'key':key,'upload_url':url,'url':url,'method':'PUT','content_type':content_type,'expires_in':900}
storage=Storage()
