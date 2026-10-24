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
RUN pip install -r requirements.txt

ARG WHISPER_MODEL=small
ENV WHISPER_MODEL=${WHISPER_MODEL}

COPY --chown=app:app app ./app
COPY --chown=app:app scripts ./scripts
RUN python -m scripts.install_silero /app/models \
    && python -m scripts.install_whisper /app/models/whisper ${WHISPER_MODEL} \
    && chown -R app:app /app/models

USER app

ENV WHISPER_MODEL_PATH=/app/models/whisper
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
