from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

PROMO = Path(__file__).resolve().parents[1]
PUBLIC = PROMO / "public"
OUT = PUBLIC / "films" / "final"
OUT.mkdir(parents=True, exist_ok=True)
CARDS = OUT / "cards"
CARDS.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
WIDTH_BOLD = PUBLIC / "fonts" / "OpenSans-Bold.ttf"
WIDTH_SEMI = PUBLIC / "fonts" / "OpenSans-SemiBold.ttf"
WIDTH_REG = PUBLIC / "fonts" / "OpenSans-Regular.ttf"


def make_background() -> Image.Image:
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.zeros((H, W, 3), dtype=np.float32)
    base[:] = (5, 3, 10)

    def glow(cx: float, cy: float, radius: float, color, strength: float):
        d = np.sqrt(((x - cx * W) / radius) ** 2 + ((y - cy * H) / radius) ** 2)
        falloff = np.clip(1.0 - d, 0.0, 1.0) ** 2.3
        for channel in range(3):
            base[:, :, channel] += color[channel] * falloff * strength

    glow(0.12, 0.10, 880, (109, 40, 217), 0.62)
    glow(0.90, 0.88, 980, (30, 58, 138), 0.55)
    glow(0.48, 1.05, 760, (56, 3, 191), 0.36)

    vx = (x - W / 2) / (W / 2)
    vy = (y - H / 2) / (H / 2)
    vignette = np.clip(1.0 - 0.34 * (vx**2 + vy**2), 0.0, 1.0)
    base *= vignette[:, :, None]

    rng = np.random.default_rng(418)
    base += rng.normal(0.0, 1.7, (H, W, 1))
    base = np.clip(base, 0, 255).astype(np.uint8)
    return Image.fromarray(base, "RGB").convert("RGBA")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def text_center(draw: ImageDraw.ImageDraw, text: str, fnt, y: int, fill):
    draw.text((W / 2, y), text, font=fnt, fill=fill, anchor="mm")


def tracked(
    draw: ImageDraw.ImageDraw,
    text: str,
    fnt,
    baseline: int,
    fill,
    tracking: float,
):
    widths = [draw.textlength(char, font=fnt) for char in text]
    total = sum(widths) + tracking * (len(text) - 1)
    cursor = (W - total) / 2
    for char, width in zip(text, widths):
        draw.text((cursor, baseline), char, font=fnt, fill=fill, anchor="ls")
        cursor += width + tracking


def accent_line(card: Image.Image, y: int, width: int = 440):
    x = np.linspace(-1.0, 1.0, width)
    alpha = np.clip(1.0 - np.abs(x) ** 1.4, 0.0, 1.0)
    rgb = np.zeros((2, width, 4), dtype=np.uint8)
    rgb[:, :, 0] = 139
    rgb[:, :, 1] = 92
    rgb[:, :, 2] = 246
    rgb[:, :, 3] = (alpha * 235).astype(np.uint8)[None, :]
    line = Image.fromarray(rgb, "RGBA")
    card.alpha_composite(line, ((W - width) // 2, y))


def logo(card: Image.Image, top: int, size: int):
    src = Image.open(PUBLIC / "brand.png").convert("RGBA")
    src = src.resize((size, size), Image.LANCZOS)

    glow = Image.new("RGBA", (size * 3, size * 3), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        (size * 0.55, size * 0.55, size * 2.45, size * 2.45),
        fill=(109, 40, 217, 105),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(52))
    card.alpha_composite(glow, ((W - size * 3) // 2, top - size))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size, size), radius=size // 4, fill=255)
    rounded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rounded.paste(src, (0, 0), mask)
    card.alpha_composite(rounded, ((W - size) // 2, top))


def intro_card(
    path: Path,
    eyebrow: str,
    title: str,
    subtitle: str,
):
    card = make_background()
    draw = ImageDraw.Draw(card)
    logo(card, 232, 104)
    tracked(draw, eyebrow, font(WIDTH_SEMI, 24), 432, (167, 139, 250, 255), 5.2)
    text_center(draw, title, font(WIDTH_BOLD, 118), 505, (245, 245, 247, 255))
    accent_line(card, 619)
    text_center(draw, subtitle, font(WIDTH_REG, 42), 678, (161, 161, 170, 255))
    card.convert("RGB").save(path, quality=95)


def outro_card(
    path: Path,
    title_lines: list[str],
    subtitle: str,
):
    card = make_background()
    draw = ImageDraw.Draw(card)
    logo(card, 220, 116)
    if len(title_lines) == 1:
        text_center(draw, title_lines[0], font(WIDTH_BOLD, 94), 470, (245, 245, 247, 255))
    else:
        text_center(draw, title_lines[0], font(WIDTH_BOLD, 88), 432, (245, 245, 247, 255))
        text_center(draw, title_lines[1], font(WIDTH_BOLD, 88), 532, (245, 245, 247, 255))
    accent_line(card, 626)
    text_center(draw, subtitle, font(WIDTH_SEMI, 38), 690, (167, 139, 250, 255))
    tracked(
        draw,
        "8. HACKATHON FULDA · FUTURE EDUCATION · 2026",
        font(WIDTH_SEMI, 19),
        972,
        (113, 113, 122, 255),
        4.4,
    )
    card.convert("RGB").save(path, quality=95)


def render_card(png: Path, mp4: Path, seconds: float, fade_out: bool = True):
    fade_start = max(0.1, seconds - 0.55)
    vf = "format=yuv420p,fade=t=in:st=0:d=0.45"
    if fade_out:
        vf += f",fade=t=out:st={fade_start:.3f}:d=0.55"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-loop",
            "1",
            "-framerate",
            "30",
            "-i",
            str(png),
            "-t",
            f"{seconds:.3f}",
            "-vf",
            vf,
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-crf",
            "16",
            "-preset",
            "medium",
            "-pix_fmt",
            "yuv420p",
            str(mp4),
        ],
        check=True,
    )


def render_clip(src: Path, dst: Path, seconds: float, seek: float = 0.0):
    fade_out = max(0.1, seconds - 0.4)
    cmd = ["ffmpeg", "-y", "-v", "error"]
    if seek:
        cmd += ["-ss", f"{seek:.3f}"]
    cmd += ["-i", str(src)]
    cmd += [
        "-t",
        f"{seconds:.3f}",
        "-vf",
        f"fps=30,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st={fade_out:.3f}:d=0.4",
        "-an",
        "-c:v",
        "libx264",
        "-crf",
        "16",
        "-preset",
        "medium",
        "-pix_fmt",
        "yuv420p",
        str(dst),
    ]
    subprocess.run(cmd, check=True)


def concat(intro: Path, clip: Path, outro: Path, audio: Path, dst: Path):
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(intro),
            "-i",
            str(clip),
            "-i",
            str(outro),
            "-i",
            str(audio),
            "-filter_complex",
            "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]",
            "-map",
            "[v]",
            "-map",
            "3:a",
            "-c:v",
            "libx264",
            "-crf",
            "16",
            "-preset",
            "slow",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-shortest",
            "-movflags",
            "+faststart",
            str(dst),
        ],
        check=True,
    )


specs = {
    "progress": {
        "intro_png": CARDS / "progress-intro.png",
        "intro_mp4": CARDS / "progress-intro.mp4",
        "intro_seconds": 4.8,
        "intro": ("418 · FORTSCHRITT", "Zwischen zwei Proben.", "Fortschritt, der sich erklären lässt."),
        "clip_src": PUBLIC / "films" / "progress-smooth.mp4",
        "clip_seconds": 32.233333,
        "seek": 0.0,
        "outro_png": CARDS / "progress-outro.png",
        "outro_mp4": CARDS / "progress-outro.mp4",
        "outro_seconds": 6.6,
        "outro": (["Eine Probe – für die nächste."], "418 Pitch Practice"),
        "audio": PUBLIC / "voice" / "progress-mix.wav",
        "final": OUT / "progress-final.mp4",
    },
    "review": {
        "intro_png": CARDS / "review-intro.png",
        "intro_mp4": CARDS / "review-intro.mp4",
        "intro_seconds": 3.0,
        "intro": ("418 · REVIEW", "Nach der Probe.", "Der Moment, der zählt."),
        "clip_src": PUBLIC / "films" / "review-smooth.mp4",
        "clip_seconds": 29.3,
        "seek": 3.1,
        "outro_png": CARDS / "review-outro.png",
        "outro_mp4": CARDS / "review-outro.mp4",
        "outro_seconds": 5.8,
        "outro": (["Aus jedem Moment wird", "ein nächster Schritt."], "418 Pitch Practice"),
        "audio": PUBLIC / "voice" / "review-mix.wav",
        "final": OUT / "review-final.mp4",
    },
}

for name, spec in specs.items():
    intro_card(spec["intro_png"], *spec["intro"])
    outro_card(spec["outro_png"], *spec["outro"])
    render_card(spec["intro_png"], spec["intro_mp4"], spec["intro_seconds"])
    render_card(spec["outro_png"], spec["outro_mp4"], spec["outro_seconds"], fade_out=False)
    clip = OUT / f"{name}-clip.mp4"
    render_clip(spec["clip_src"], clip, spec["clip_seconds"], spec["seek"])
    concat(spec["intro_mp4"], clip, spec["outro_mp4"], spec["audio"], spec["final"])
    print(f"rendered {spec['final']}")

print(json.dumps({name: str(spec["final"]) for name, spec in specs.items()}, indent=2))
