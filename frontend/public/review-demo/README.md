# Synthetic review fixture

`presentation.mp4` is a 90-second, silent H.264 video of programmatically drawn
slides and an animated illustrated figure. No people, camera recordings or
third-party footage are used. `poster.png` is its first frame. The source and
all claims are fictional; the 20-vs-12 mismatch is intentional.

The review UI at `/review-preview` uses explicitly synthetic annotations and
performance samples from `src/components/analysis/review-data.ts`. They are
design examples, not results of running an analysis model on this video.
`source.txt` contains the quoted fictional evidence.

To regenerate from the repository root, install Pillow and imageio-ffmpeg into
your Python environment and run `python frontend/scripts/generate-review-demo.py`.
The script uses Windows Georgia/Segoe UI, or DejaVu fonts on Linux.
