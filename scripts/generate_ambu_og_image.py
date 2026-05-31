"""Generates the OG images for the Ambu analysis (Danish + English) in the same
style as the other analyses. Mirrors generate_c25_og_image.py but uses Ambu's
pink accent and the AMBU ticker badge."""
from PIL import Image, ImageDraw, ImageFont
import os

# Canvas
WIDTH, HEIGHT = 1200, 630

# Colors (sampled from the existing Ambu OG image)
BG = (14, 26, 62)            # dark navy
ACCENT = (236, 72, 153)      # pink-500 (matches the Ambu badge / accent bar)
ACCENT_DARK = (164, 29, 96)  # darker pink at the gradient edges
WHITE = (255, 255, 255)
SUBTLE = (180, 188, 210)     # light gray for byline / domain

TICKER = "AMBU"
DOMAIN = "zirium.dk"

# Per-language content. Headlines/bylines match the current article pages.
VARIANTS = {
    "da": {
        "headline": "Ambu: Fald trods en succesfuld transformation",
        "byline": "Araz Bayat Makoo  ·  1. juni 2026",
        "out": "ambu-2026-06-01.png",
    },
    "en": {
        "headline": "Ambu: Falling despite a successful transformation",
        "byline": "Araz Bayat Makoo  ·  June 1, 2026",
        "out": "ambu-2026-06-01-en.png",
    },
}

# Fonts
FONT_DIR = "/System/Library/Fonts"
FONT_BOLD = os.path.join(FONT_DIR, "Supplemental/Arial Bold.ttf")
FONT_REG = os.path.join(FONT_DIR, "Supplemental/Arial.ttf")

OUT_DIR = "/Users/araz/Documents/Projects/Python/short_watch_backend/frontend/public/og-images"


def load(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def render(headline: str, byline: str, out_name: str) -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Top gradient bar (symmetric: bright in middle, dark at edges)
    BAR_H = 8
    for x in range(WIDTH):
        t = abs((x - WIDTH / 2) / (WIDTH / 2))  # 0 mid, 1 at edges
        r = int(ACCENT[0] * (1 - t) + ACCENT_DARK[0] * t)
        g = int(ACCENT[1] * (1 - t) + ACCENT_DARK[1] * t)
        b = int(ACCENT[2] * (1 - t) + ACCENT_DARK[2] * t)
        draw.line([(x, 0), (x, BAR_H)], fill=(r, g, b))

    # ZIRIUM wordmark (top-left)
    font_zirium = load(FONT_BOLD, 32)
    draw.text((70, 60), "ZIRIUM", font=font_zirium, fill=WHITE)

    # Ticker badge (top-right)
    font_ticker = load(FONT_BOLD, 32)
    ticker_bbox = draw.textbbox((0, 0), TICKER, font=font_ticker)
    ticker_w = ticker_bbox[2] - ticker_bbox[0]
    ticker_h = ticker_bbox[3] - ticker_bbox[1]
    badge_pad_x = 28
    badge_pad_y = 20
    badge_w = ticker_w + 2 * badge_pad_x
    badge_h = ticker_h + 2 * badge_pad_y
    badge_x = WIDTH - 70 - badge_w
    badge_y = 50
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
        radius=14, fill=ACCENT,
    )
    draw.text(
        (badge_x + badge_pad_x, badge_y + badge_pad_y - 5),
        TICKER, font=font_ticker, fill=WHITE,
    )

    # Headline (centered vertically in the middle area, wrapped manually)
    font_h = load(FONT_BOLD, 58)
    max_text_w = WIDTH - 140
    words = headline.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        test_w = draw.textbbox((0, 0), test, font=font_h)[2]
        if test_w <= max_text_w:
            current = test
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    line_h = 78
    total_text_h = len(lines) * line_h
    start_y = (HEIGHT - total_text_h) // 2 + 10
    for i, line in enumerate(lines):
        draw.text((70, start_y + i * line_h), line, font=font_h, fill=WHITE)

    # Byline (bottom-left)
    font_byline = load(FONT_REG, 26)
    byline_y = HEIGHT - 80
    draw.text((70, byline_y), byline, font=font_byline, fill=SUBTLE)

    # Domain (bottom-right)
    font_domain = load(FONT_REG, 26)
    domain_bbox = draw.textbbox((0, 0), DOMAIN, font=font_domain)
    domain_w = domain_bbox[2] - domain_bbox[0]
    draw.text((WIDTH - 70 - domain_w, byline_y), DOMAIN, font=font_domain, fill=SUBTLE)

    out_path = os.path.join(OUT_DIR, out_name)
    img.save(out_path, "PNG")
    print(f"Saved: {out_path}  ({os.path.getsize(out_path)} bytes)")


if __name__ == "__main__":
    for lang, v in VARIANTS.items():
        render(v["headline"], v["byline"], v["out"])
