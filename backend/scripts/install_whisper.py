"""Download a faster-whisper model into the image at build time."""

import argparse
from pathlib import Path

from faster_whisper.utils import download_model


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path, help="Directory for the CTranslate2 model files")
    parser.add_argument("model", nargs="?", default="small", help="Whisper size or Hugging Face model ID")
    args = parser.parse_args()

    args.target.mkdir(parents=True, exist_ok=True)
    path = Path(download_model(args.model, output_dir=str(args.target)))
    if not (path / "model.bin").is_file():
        raise SystemExit(f"Whisper model is incomplete: {path}")
    print(f"Whisper model {args.model} installed in {path}")


if __name__ == "__main__":
    main()
