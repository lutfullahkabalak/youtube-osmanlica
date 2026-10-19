#!/usr/bin/env python3
"""Regenerate the red/black Persian Yeh icon (optional: fonttools and Pillow)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'fonts/eKalemDuz.ttf'
OUT = ROOT / 'icons'
RED = '#FF0000'
LETTER = '\u06cc'  # Ottoman/Persian Yeh, ی


def main():
    OUT.mkdir(exist_ok=True)
    font = TTFont(FONT)
    glyphs = font.getGlyphSet()
    glyph = glyphs[font.getBestCmap()[ord(LETTER)]]
    bounds = BoundsPen(glyphs)
    glyph.draw(bounds)
    x0, y0, x1, y1 = bounds.bounds
    scale = 346 / max(x1 - x0, y1 - y0)
    dx = 256 - (x0 + x1) * scale / 2
    dy = 256 + (y0 + y1) * scale / 2
    pen = SVGPathPen(glyphs)
    glyph.draw(pen)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Osmanlıca ye harfi">
  <rect width="512" height="512" rx="112" fill="{RED}"/>
  <path d="{pen.getCommands()}" transform="translate({dx:.5f} {dy:.5f}) scale({scale:.8f} {-scale:.8f})" fill="#000000"/>
</svg>\n'''
    (OUT / 'icon.svg').write_text(svg)
    # A single isolated letter needs no contextual shaping. Crop its ink, not its advance.
    large_font = ImageFont.truetype(str(FONT), 4096)
    mask_core = large_font.getmask(LETTER, mode='L')
    mask = Image.frombytes('L', mask_core.size, bytes(mask_core))
    mask = mask.crop(mask.getbbox())
    width, height = round((x1 - x0) * scale * 4), round((y1 - y0) * scale * 4)
    mask = mask.resize((width, height), Image.Resampling.LANCZOS)
    master = Image.new('RGBA', (2048, 2048))
    ImageDraw.Draw(master).rounded_rectangle((0, 0, 2047, 2047), radius=448, fill=RED)
    master.paste((0, 0, 0, 255), ((2048 - width) // 2, (2048 - height) // 2), mask)
    for size in (16, 32, 48, 128, 512):
        master.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f'icon{size}.png', optimize=True)
    print('Created SVG and 16/32/48/128/512 px icons: red background, black U+06CC.')


if __name__ == '__main__':
    main()
