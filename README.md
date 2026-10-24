# Hackathon Fulda – Presentation Trainer

Start Docker. Copy `.env.example` to `.env` once (`cp .env.example .env`), then
run from the repository root:

```sh
docker compose up --build -d --wait
```

Open **http://localhost:3000** · API docs: **http://localhost:8000/docs**.
All six services start together; no local Node.js or Python installation needed.

For **local source checking and follow-up questions**, also start Ollama on the
host and download `qwen3.5:4b-q4_K_M` (no API key). Transcription already runs
locally with Whisper in Compose. [Local AI setup and use](docs/06-local-coaching.md).

**IntelliJ:** run **Docker Compose**. **VS Code:** **Run Build Task**
(`Cmd/Ctrl+Shift+B`). Stop: `docker compose stop`.

Details: [Frontend](frontend/README.md) · [Backend](backend/README.md) ·
[API types](api/README.md).

**Jury:** [22-second gesture example](http://localhost:3000/gestures) ·
[Demo guide](docs/05-jury-demo.md) · [What we measure and why](docs/04-gesture-evaluation.md).
