# Hackathon Fulda – Presentation Trainer

Start Docker. Copy `.env.example` to `.env` once (`cp .env.example .env`), then
run from the repository root:

```sh
docker compose up --build -d --wait
```

Open **http://localhost:3000** · API docs: **http://localhost:8000/docs**.
All six services start together; no local Node.js or Python installation needed.

**IntelliJ:** run **Docker Compose**. **VS Code:** **Run Build Task**
(`Cmd/Ctrl+Shift+B`). Stop: `docker compose stop`.

Details: [Frontend](frontend/README.md) · [Backend](backend/README.md) ·
[API types](api/README.md).
