# Hackathon Fulda monorepo

The Next.js app lives in [`frontend/`](frontend/README.md). Backend services can be added beside it. npm workspaces share one root lockfile and dependency installation.

```sh
npm ci
npm run dev
```

Root commands (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`) run the frontend workspace. For arguments, target it explicitly: `npm run dev -w frontend -- --port 3001`.

Event requirements, research, and the original plans remain at the repository root. Live video transport and feedback formats are documented in [`docs/live-camera-protocol.md`](docs/live-camera-protocol.md).
