FROM python:3.12.15-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Pose/hand tracking runs in the clients; the backend only decodes media.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

COPY requirements.txt .
RUN pip install --default-timeout=120 --retries=5 -r requirements.txt

ARG WHISPER_MODEL=small
ENV WHISPER_MODEL=${WHISPER_MODEL}
# Pinned embedding model before copying source, so code edits keep this layer.
# Keep name and revision in sync with app/sources/embeddings.py.
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('jinaai/jina-embeddings-v2-base-de', revision='3f9eede875721714945b6a99a3198299243cf2be', local_dir='/app/models/embedding', allow_patterns=['onnx/model.onnx', '*.json'])" \
    && rm -rf /app/models/embedding/.cache

COPY --chown=app:app app ./app
COPY --chown=app:app scripts ./scripts
RUN python -m scripts.install_silero /app/models \
    && python -m scripts.install_whisper /app/models/whisper ${WHISPER_MODEL} \
    && chown -R app:app /app/models

USER app

ENV WHISPER_MODEL_PATH=/app/models/whisper
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
