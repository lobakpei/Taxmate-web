from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "evidence" / "full-ui-acceptance" / "theme-contrast"
OUTPUT = ROOT / "evidence" / "full-ui-acceptance" / "founder-contact-sheets"
OUTPUT.mkdir(parents=True, exist_ok=True)

SURFACES = [
    ("app-home", "Home / dashboard"),
    ("app-income", "Income"),
    ("app-expenses", "Expenses"),
    ("app-add-receipts", "Assistant > Add receipts"),
    ("app-tax", "Tax"),
    ("app-more", "Settings"),
    ("app-faq", "In-app FAQ"),
    ("app-limited-company", "Limited Company"),
    ("public-help", "Public Help & support"),
    ("public-privacy", "Privacy"),
    ("public-terms", "Terms"),
    ("public-404", "Page not found"),
]

FONT = ImageFont.load_default()


def contain(image, width, height):
    image = image.copy()
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (width, height), "#e8e8e8")
    x = (width - image.width) // 2
    y = (height - image.height) // 2
    canvas.paste(image.convert("RGB"), (x, y))
    return canvas


def build(viewport, theme):
    if viewport == "mobile":
        crop_width, crop_height = 390, 844
        tile_width, tile_height = 292, 632
        columns = 3
    else:
        crop_width, crop_height = 1440, 1000
        tile_width, tile_height = 648, 450
        columns = 2

    label_height = 48
    gap = 24
    outer = 32
    rows = (len(SURFACES) + columns - 1) // columns
    sheet_width = outer * 2 + columns * tile_width + (columns - 1) * gap
    sheet_height = 104 + rows * (tile_height + label_height) + (rows - 1) * gap + outer
    sheet = Image.new("RGB", (sheet_width, sheet_height), "#0c1725")
    draw = ImageDraw.Draw(sheet)
    heading = f"TaxMate founder UI acceptance — {viewport.title()} / {theme.title()}"
    draw.text((outer, 28), heading, fill="#ffffff", font=FONT)
    draw.text((outer, 54), f"Real viewport: {crop_width} x {crop_height} | {len(SURFACES)} checked surfaces", fill="#ffbd0a", font=FONT)

    for index, (slug, label) in enumerate(SURFACES):
        path = SOURCE / f"{slug}-{viewport}-{theme}.png"
        image = Image.open(path).convert("RGB")
        # Full-page evidence remains untouched. The contact sheet shows exactly
        # the first viewport a user receives on entry.
        image = image.crop((0, 0, min(crop_width, image.width), min(crop_height, image.height)))
        tile = contain(image, tile_width, tile_height)
        col = index % columns
        row = index // columns
        x = outer + col * (tile_width + gap)
        y = 104 + row * (tile_height + label_height + gap)
        sheet.paste(tile, (x, y))
        draw.rectangle((x, y + tile_height, x + tile_width, y + tile_height + label_height), fill="#152337")
        draw.text((x + 14, y + tile_height + 16), f"{index + 1:02d}  {label}", fill="#ffffff", font=FONT)

    out = OUTPUT / f"TaxMate-{viewport}-{theme}-contact-sheet.png"
    sheet.save(out, optimize=True)
    return out


if __name__ == "__main__":
    for current_viewport in ("mobile", "desktop"):
        for current_theme in ("light", "dark"):
            print(build(current_viewport, current_theme))
