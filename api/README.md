# TypeScript API contract

FastAPI routes and Pydantic models are the source of truth. `openapi.json`
and `schema.d.ts` are generated and should be committed together. Do not
edit them by hand.

## Generate

Install Node.js 22+ and Python 3.12. Prepare tooling once from the repository
root (on Windows use `py -3.12` and `backend/.venv/Scripts/python.exe`):

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm ci
npm run api:generate
```

This exports the schema from `app.openapi()` and generates TypeScript
definitions with `openapi-typescript`. No running API, database, storage,
`.env`, or external API credentials are needed. The Python dependencies
must still be installed because the export imports the application.

The command selects `backend/.venv` automatically, otherwise `python3`.
To use another interpreter:

```sh
PYTHON=/path/to/python npm run api:generate
```

On PowerShell, set `$env:PYTHON = 'C:\path\to\python.exe'` first.

Check for stale schema or types without changing files (also suitable for CI):

```sh
npm run api:check
```

To generate only TypeScript from the committed schema, without Python:

```sh
npm run api:types
```

## Use in the frontend

Import types using the relative path from your TypeScript file:

```ts
import type { components, paths } from "../../api/schema";

type Word = components["schemas"]["Word"];
type Event = components["schemas"]["Event"];
type AnalyzeRequest = paths["/transcription/analyze-words"]["post"]["requestBody"]["content"]["application/json"];
type AnalyzeResponse = paths["/transcription/analyze-words"]["post"]["responses"][200]["content"]["application/json"];
```

These are compile-time definitions, not runtime validation or an HTTP
client. Callers can use `openapi-fetch` with the generated `paths`
type for typed requests and responses.

The schema reflects the current endpoints, including their limitations:
`Event.payload` and `heuristics` are free-form objects. The multipart
`config` field of `/speech/analyze` is a JSON string, not a typed JSON body.
Generation does not add structure that the backend has not declared.
