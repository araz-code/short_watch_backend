"""Generates the OG image for the ChemoMetec short analysis in the same style
as the other analyses."""
from PIL import Image, ImageDraw, ImageFont
import os

WIDTH, HEIGHT = 1200, 630

BG = (14, 20, 46)            # dark navy
ACCENT = (0, 122, 255)       # #007AFF (matches the ChemoMetec card accent)
ACCENT_DARK = (10, 80, 200)  # darker end of gradient
WHITE = (255, 255, 255)
SUBTLE = (180, 188, 210)

TICKER = "CHEMM"
DOMAIN = "zirium.dk"

FONT_DIR = "/System/Library/Fonts"
FONT_BOLD = os.path.join(FONT_DIR, "Supplemental/Arial Bold.ttf")
FONT_REG = os.path.join(FONT_DIR, "Supplemental/Arial.ttf")

OUT_DIR = "/Users/araz/Documents/Projects/Python/short_watch_backend/frontend/public/og-images"


def load(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def render(headline: str, byline: str, out_name: str) -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Top gradient bar
    BAR_H = 8
    for x in range(WIDTH):
        t = abs((x - WIDTH / 2) / (WIDTH / 2))
        r = int(ACCENT[0] * (1 - t) + ACCENT_DARK[0] * t)
        g = int(ACCENT[1] * (1 - t) + ACCENT_DARK[1] * t)
        b = int(ACCENT[2] * (1 - t) + ACCENT_DARK[2] * t)
        draw.line([(x, 0), (x, BAR_H)], fill=(r, g, b))

    # ZIRIUM wordmark
    draw.text((70, 60), "ZIRIUM", font=load(FONT_BOLD, 32), fill=WHITE)

    # Ticker badge (top-right)
    font_ticker = load(FONT_BOLD, 32)
    tb = draw.textbbox((0, 0), TICKER, font=font_ticker)
    ticker_w, ticker_h = tb[2] - tb[0], tb[3] - tb[1]
    pad_x, pad_y = 28, 20
    badge_w, badge_h = ticker_w + 2 * pad_x, ticker_h + 2 * pad_y
    badge_x, badge_y = WIDTH - 70 - badge_w, 50
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
        radius=14, fill=ACCENT,
    )
    draw.text((badge_x + pad_x, badge_y + pad_y - 5), TICKER, font=font_ticker, fill=WHITE)

    # Headline (wrapped, centered vertically)
    font_h = load(FONT_BOLD, 58)
    max_text_w = WIDTH - 140
    lines, current = [], ""
    for word in headline.split():
        test = (current + " " + word).strip()
        if draw.textbbox((0, 0), test, font=font_h)[2] <= max_text_w:
            current = test
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    line_h = 78
    start_y = (HEIGHT - len(lines) * line_h) // 2 + 10
    for i, line in enumerate(lines):
        draw.text((70, start_y + i * line_h), line, font=font_h, fill=WHITE)

    # Byline (bottom-left) + domain (bottom-right)
    font_meta = load(FONT_REG, 26)
    byline_y = HEIGHT - 80
    draw.text((70, byline_y), byline, font=font_meta, fill=SUBTLE)
    dw = draw.textbbox((0, 0), DOMAIN, font=font_meta)[2]
    draw.text((WIDTH - 70 - dw, byline_y), DOMAIN, font=font_meta, fill=SUBTLE)

    out_path = os.path.join(OUT_DIR, out_name)
    img.save(out_path, "PNG")
    print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")


render("ChemoMetec: Shorterne missede kollapset", "Araz Bayat Makoo  ·  17. juni 2026", "chemm-2026-06-17.png")
