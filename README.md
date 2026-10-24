# Hackathon Fulda – Presentation Trainer

## Start the app

Start Docker. Copy `.env.example` to `.env` if it doesn't exist, then run from
the repository root:

```sh
docker compose up --build -d --wait
```

Frontend: <http://localhost:3000> · API docs: <http://localhost:8000/docs>.
All six containers start together; no local Node.js or Python installation needed.

**IntelliJ:** **Docker Compose → Run**. **VS Code:** **Run Build Task**
(`Cmd+Shift+B` / `Ctrl+Shift+B`). Stop: `docker compose stop`.

## Generate TypeScript API types

The FastAPI routes and Pydantic models define the API contract. With
Node.js 22+ and Python 3.12 installed, prepare the tooling once from the
repository root:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm ci
```

On Windows, use `py -3.12 -m venv backend/.venv` and
`backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt`.

After changing API routes or models:

```sh
npm run api:generate
npm run api:check
```

This exports `api/openapi.json` and generates `api/schema.d.ts` for the
TypeScript frontend. Commit both generated files with the API changes.
The check command fails when either file is stale and can be used in CI.
No running backend, database, storage or `.env` is required for generation.
The command automatically uses `backend/.venv`; set `PYTHON` to select a
different interpreter.

To regenerate only TypeScript from the committed schema without Python:

```sh
npm run api:types
```

Usage examples and current type limitations: [API contract](api/README.md).
Backend setup, analysis endpoints and background jobs:
[backend/README.md](backend/README.md).

The Next.js app lives in [`frontend/`](frontend/README.md). npm workspaces share one root lockfile and dependency installation.
Root commands (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`) run the frontend workspace. For arguments, target it explicitly: `npm run dev -w frontend -- --port 3001`.

Event requirements, research, and the original plans remain at the repository root. Live video transport and feedback formats are documented in [`docs/live-camera-protocol.md`](docs/live-camera-protocol.md).
