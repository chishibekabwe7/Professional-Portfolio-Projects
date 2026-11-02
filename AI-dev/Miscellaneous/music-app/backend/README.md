# Music Site 3.0 API

Django 5/DRF backend for the Flutter Music Site 3.0 client. Authentication is email-based (`/api/auth/register/`, `/login/`, `/refresh/`, `/logout/`) with SimpleJWT blacklist support. Catalog JSON uses the exact Flutter aliases: `artist_id`, `artist_name`, `album_id`, `album_title`, `cover_url`, `audio_url`, `duration_seconds`, and `is_public`.

## API

- `GET /api/tracks/`, `POST /api/tracks/`; `POST/DELETE /api/tracks/{id}/like/`, `POST /api/tracks/{id}/play/`
- `GET /api/albums/`, `/artists/`, `/playlists/`; authenticated playlist creation
- `POST /api/reports/`
- Authenticated `POST /api/uploads/upload-url/` (also `/presign/`) then `POST /api/tracks/` with `source_key`; `/api/uploads/process/` queues Celery ffmpeg/ffprobe processing
- List responses use `{count,next,previous,results}`

## Development

```sh
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
pytest
```

Configure `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, database variables, storage credentials, and Redis externally. `uploads.storage.Storage` is the replaceable presign adapter; production deployments should provide an S3-compatible implementation. Docker Compose provides web, Redis, and Celery worker services.
