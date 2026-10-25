# Hackathon Fulda – Presentation Trainer

Start Docker. Copy `.env.example` to `.env` once (`cp .env.example .env`), then
run from the repository root:

```sh
docker compose up --build -d --wait
```

Open **http://localhost:3000** · API docs: **http://localhost:8000/docs**.
All six services start together; no local Node.js or Python installation needed.

For **source checking and follow-up questions**, set `GEMINI_API_KEY` in `.env`
and restart backend/worker; the default is Gemini via the OpenAI-compatible
endpoint. Transcription still runs locally with Whisper in Compose.
[AI setup and limits](docs/06-local-coaching.md).

**IntelliJ:** run **Docker Compose**. **VS Code:** **Run Build Task**
(`Cmd/Ctrl+Shift+B`). Stop: `docker compose stop`.

Details: [Frontend](frontend/README.md) · [Backend](backend/README.md) ·
[API types](api/README.md) · [Integration & Quickstart](docs/04-integration.md).

**Jury:** [22-second gesture example](http://localhost:3000/gestures) ·
[Demo guide](docs/05-jury-demo.md) · [What we measure and why](docs/04-gesture-evaluation.md).

**Jury-PDFs:** [Features und Jury-Einstieg](output/pdf/418-Pitch-Practice-Features-Jury.pdf)
(2 Seiten) · [Architektur und Datenfluss](output/pdf/418-Pitch-Practice-Architektur.pdf)
(3 Seiten). Stand 25.10.2026; [Erzeugung und Grundlagen](output/pdf/README.md).
