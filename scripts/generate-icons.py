#!/usr/bin/env python3
"""Regenerate every app icon and bundled brand asset from the source art in docs/.

    python3 scripts/generate-icons.py

Source-of-truth notes
---------------------
* App icons are generated from the **Google** (full-bleed, opaque) export, for both
  platforms. The "IOS" export is a pre-rounded badge carrying an alpha channel:
  App Store Connect rejects any icon with transparency, and its baked corner radius
  (~23.3% of width) is tighter than Apple's own mask (~22.4%), which leaves a rim
  artifact once iOS rounds it. Both files carry the same brand mark.
* The wordmark is the horizontal brand logo (TopBar, phone header).
* The square mark is used wherever the slot is square (About pages, favicon).
* The GUSD coin glyph is a DIFFERENT asset, served from Cloudinary, and is untouched.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'

ICON_SRC = DOCS / 'Ganime Google App icon 512x512.png'
WORDMARK_SRC = DOCS / 'Ganime logo v2.png'

# Cordova iOS icon set — must match the <icon> entries in config.xml.
IOS_SIZES = [20, 29, 40, 50, 57, 58, 60, 72, 76, 80, 87, 100, 114, 120, 144, 152, 167, 180, 1024]
# Cordova Android launcher densities — must match the <icon density=…> entries in config.xml.
ANDROID_SIZES = {'ldpi': 36, 'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}

WORDMARK_HEIGHT = 132   # 3x the 44px TopBar display height
MARK_SIZE = 240         # 3x the 80px About-page display size
FAVICON_SIZE = 180


def load_square_source() -> Image.Image:
    """Full-bleed, fully opaque square art. Any alpha is flattened onto black."""
    im = Image.open(ICON_SRC)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        flat = Image.new('RGBA', im.size, (0, 0, 0, 255))
        flat.alpha_composite(im)
        im = flat
    im = im.convert('RGB')
    if im.width != im.height:                       # centre-crop to a true square
        s = min(im.size)
        l, t = (im.width - s) // 2, (im.height - s) // 2
        im = im.crop((l, t, l + s, t + s))
    return im


def write(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'PNG', optimize=True)
    print(f'  {path.relative_to(ROOT)}  {im.width}x{im.height}  {im.mode}')


def main() -> None:
    square = load_square_source()

    print('iOS icons (RGB, no alpha — App Store requires fully opaque):')
    for s in IOS_SIZES:
        write(square.resize((s, s), Image.LANCZOS), ROOT / 'res' / 'ios' / f'icon-{s}.png')

    print('Android launcher icons:')
    for density, s in ANDROID_SIZES.items():
        write(square.resize((s, s), Image.LANCZOS), ROOT / 'res' / 'android' / f'{density}.png')

    print('Bundled web/app brand assets:')
    wm = Image.open(WORDMARK_SRC).convert('RGBA')
    wm = wm.crop(wm.getbbox())                      # trim the transparent margin
    w = round(wm.width * WORDMARK_HEIGHT / wm.height)
    wm = wm.resize((w, WORDMARK_HEIGHT), Image.LANCZOS)
    # The wordmark is flat white letters plus a thin gradient outline, so a 256-colour
    # palette is indistinguishable from truecolour at the 32-44px it is ever displayed at —
    # and it cuts the file ~5x. This asset is in the header of every page, so that matters.
    # The square mark and favicon are NOT quantised: they are full-bleed gradient art where
    # palette dithering is visible, and neither sits on the critical render path.
    wm = wm.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    write(wm, ROOT / 'src' / 'assets' / 'ganime-logo.png')
    write(square.resize((MARK_SIZE, MARK_SIZE), Image.LANCZOS), ROOT / 'src' / 'assets' / 'ganime-mark.png')
    write(square.resize((FAVICON_SIZE, FAVICON_SIZE), Image.LANCZOS), ROOT / 'public' / 'favicon.png')


if __name__ == '__main__':
    main()
