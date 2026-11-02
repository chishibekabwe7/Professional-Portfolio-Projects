import subprocess
from celery import shared_task
from catalog.models import Track
@shared_task(bind=True, autoretry_for=(OSError,), retry_backoff=True, max_retries=3)
def process_audio_upload(self, track_id):
    track = Track.objects.get(pk=track_id)
    try:
        track.status = 'processing'
        track.save(update_fields=['status'])
        # The worker can replace this probe with an S3 download/transcode pipeline.
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, check=False)
        if result.returncode != 0:
            raise RuntimeError('ffmpeg is unavailable')
        track.status = 'ready'
        track.save(update_fields=['status'])
        return {'track_id': str(track.id), 'status': track.status}
    except Exception as exc:
        track.status = 'failed'
        track.failure_reason = str(exc)
        track.save(update_fields=['status', 'failure_reason'])
        raise
