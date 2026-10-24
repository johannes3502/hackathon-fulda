"""Launch FastAPI locally for either IDE; keep PostgreSQL and S3 in Docker."""

import os
import subprocess
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    env_file = PROJECT_ROOT / ".env"
    if not env_file.is_file():
        raise SystemExit("Copy .env.example to .env in the repository root first.")
    load_dotenv(env_file, override=False)

    defaults = {
        "POSTGRES_DB": "trainer",
        "POSTGRES_USER": "trainer",
        "POSTGRES_PORT": "5432",
        "S3_BUCKET": "recordings",
        "S3_REGION": "us-east-1",
        "S3_PORT": "8333",
        "API_PORT": "8000",
        "CORS_ORIGINS": "http://localhost:3000,http://localhost:5173",
    }
    for name, value in defaults.items():
        os.environ.setdefault(name, value)
    missing = [
        name for name in ("POSTGRES_PASSWORD", "S3_ACCESS_KEY", "S3_SECRET_KEY")
        if not os.environ.get(name)
    ]
    if missing:
        raise SystemExit(f"Missing local settings: {', '.join(missing)}")

    port = int(os.environ["API_PORT"])
    if not 1 <= port <= 65535:
        raise SystemExit("API_PORT must be between 1 and 65535.")

    subprocess.run(
        ["docker", "compose", "up", "-d", "--wait", "postgres", "storage"],
        cwd=PROJECT_ROOT,
        check=True,
    )
    print("Stopping the Docker backend; this IDE process will serve the API.", flush=True)
    subprocess.run(["docker", "compose", "stop", "backend"], cwd=PROJECT_ROOT, check=True)

    # These addresses are for the host process, not Compose's internal network.
    os.environ["POSTGRES_HOST"] = "127.0.0.1"
    os.environ["S3_ENDPOINT_URL"] = f"http://127.0.0.1:{os.environ['S3_PORT']}"
    # One process keeps breakpoints reliable in both IDEs. Restart after edits.
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)


if __name__ == "__main__":
    main()
