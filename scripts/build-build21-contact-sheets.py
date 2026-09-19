from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "evidence" / "build21" / "complete-ui"
OUTPUT = ROOT / "evidence" / "build21" / "founder-contact-sheets"
OUTPUT.mkdir(parents=True, exist_ok=True)

try:
    FONT = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 24)
    SMALL = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 19)
except OSError:
    FONT = SMALL = ImageFont.load_default()


GROUPS = {
    "01-personal-main": [
        "personal-home-zh-dark.png",
        "personal-income-zh-dark.png",
        "personal-expenses-zh-dark.png",
        "personal-receipts-zh-dark.png",
        "personal-tax-zh-dark.png",
        "personal-more-zh-dark.png",
        "personal-add-income-zh-dark.png",
        "personal-add-expense-zh-dark.png",
    ],
    "02-personal-sheets": [
        "personal-sheet-business-zh-dark.png",
        "personal-sheet-tax-adjustment-zh-dark.png",
        "personal-sheet-category-zh-dark.png",
        "personal-sheet-folder-zh-dark.png",
        "personal-sheet-partner-code-zh-dark.png",
        "personal-sheet-assistant-zh-dark.png",
        "personal-sheet-notice-zh-dark.png",
        "personal-sheet-confirmation-zh-dark.png",
        "personal-sheet-android-install-zh-dark.png",
        "personal-sheet-ios-install-zh-dark.png",
        "personal-promotion-code-zh-dark.png",
    ],
    "03-limited-company": [
        "ltd-overview-zh-dark.png",
        "ltd-company-money-zh-dark.png",
        "ltd-add-income-zh-dark.png",
        "ltd-bank-reconciliation-zh-dark.png",
    ],
}


def first_viewport(image):
    return image.crop((0, 0, min(390, image.width), min(844, image.height))).convert("RGB")


def build(group, names):
    cols = 4 if len(names) > 4 else 2
    tile_w, tile_h, label_h, gap, outer = 312, 675, 54, 24, 32
    rows = (len(names) + cols - 1) // cols
    width = outer * 2 + cols * tile_w + (cols - 1) * gap
    height = 112 + rows * (tile_h + label_h) + (rows - 1) * gap + outer
    canvas = Image.new("RGB", (width, height), "#081522")
    draw = ImageDraw.Draw(canvas)
    draw.text((outer, 26), f"TaxMate Build 21 UI acceptance — {group}", fill="white", font=FONT)
    draw.text((outer, 62), "390 x 844 entry viewport | zh-HK | dark", fill="#ffbd0a", font=SMALL)
    for index, name in enumerate(names):
        image = first_viewport(Image.open(SOURCE / name))
        image = image.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
        col, row = index % cols, index // cols
        x = outer + col * (tile_w + gap)
        y = 112 + row * (tile_h + label_h + gap)
        canvas.paste(image, (x, y))
        draw.rectangle((x, y + tile_h, x + tile_w, y + tile_h + label_h), fill="#152337")
        label = name.removesuffix("-zh-dark.png").replace("personal-sheet-", "").replace("personal-", "").replace("ltd-", "LTD ").replace("-", " ")
        draw.text((x + 12, y + tile_h + 15), f"{index + 1:02d}  {label}", fill="white", font=SMALL)
    target = OUTPUT / f"TaxMate-Build21-{group}.png"
    canvas.save(target, optimize=True)
    return target


if __name__ == "__main__":
    receipt = json.loads((SOURCE / "acceptance.json").read_text(encoding="utf-8"))
    expected = {name for names in GROUPS.values() for name in names}
    actual = set(receipt["screenshots"])
    if expected != actual:
        raise SystemExit(f"screenshot manifest mismatch: missing={sorted(actual - expected)} extra={sorted(expected - actual)}")
    for current_group, current_names in GROUPS.items():
        print(build(current_group, current_names))
