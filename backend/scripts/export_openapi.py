"""Export the API contract without starting a server or connecting to services."""

import argparse
import json
from pathlib import Path

from app.main import app

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "api" / "openapi.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the saved schema is stale")
    args = parser.parse_args()
    schema = json.dumps(app.openapi(), indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    if args.check:
        if not SCHEMA_PATH.is_file() or SCHEMA_PATH.read_text(encoding="utf-8") != schema:
            raise SystemExit("OpenAPI schema is stale. Run npm run api:generate.")
        print("OpenAPI schema is up to date.")
        return
    SCHEMA_PATH.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_PATH.write_text(schema, encoding="utf-8")
    print(f"Exported {SCHEMA_PATH}")


if __name__ == "__main__":
    main()
