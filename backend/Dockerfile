FROM python:3.12.15-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# FFmpeg handles browser media formats; MediaPipe/OpenCV need these libraries.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libgl1 libglib2.0-0 libportaudio2 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

COPY requirements.txt .
RUN pip install --default-timeout=120 --retries=5 -r requirements.txt

# Pinned embedding model before copying source, so code edits keep this layer.
# Keep name and revision in sync with app/sources/embeddings.py.
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('jinaai/jina-embeddings-v2-base-de', revision='3f9eede875721714945b6a99a3198299243cf2be', local_dir='/app/models/embedding', allow_patterns=['onnx/model.onnx', '*.json'])" \
    && rm -rf /app/models/embedding/.cache

COPY --chown=app:app app ./app
COPY --chown=app:app scripts ./scripts
RUN python -m scripts.install_silero /app/models

USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
