"""Install the pinned, checksum-verified Silero model and its MIT license."""

import argparse
import hashlib
import urllib.request
from pathlib import Path

from app.speech.vad import MODEL_SHA256, MODEL_URL


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    with urllib.request.urlopen(MODEL_URL, timeout=60) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != MODEL_SHA256:
        raise SystemExit("Silero checksum mismatch")
    with urllib.request.urlopen("https://raw.githubusercontent.com/snakers4/silero-vad/v6.2/LICENSE", timeout=30) as response:
        license_data = response.read()
    args.directory.mkdir(parents=True, exist_ok=True)
    (args.directory / "silero_vad.onnx").write_bytes(data)
    (args.directory / "SILERO_LICENSE").write_bytes(license_data)


if __name__ == "__main__":
    main()
