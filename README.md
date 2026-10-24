# Start the backend

Start Docker Desktop. Copy `.env.example` to `.env` if it doesn't exist.
Run from the repository root:

```sh
docker compose up --build -d --wait
```

API docs: [localhost:8000/docs](http://localhost:8000/docs).

IntelliJ: **Docker Compose → Run** also starts all containers.

Stop: `docker compose stop`.
