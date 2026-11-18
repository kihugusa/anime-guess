"""App icons. Anime Guess: white disc on vermilion. Character Guess (arg "characters"): vermilion ring stamp on indigo."""
import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1]
CHAR = len(sys.argv) > 2 and sys.argv[2] == 'characters'
def icon(size, path, pad=0.0):
    if CHAR:
        im = Image.new('RGB', (size, size), '#1d2a6b'); d = ImageDraw.Draw(im)
        r = size * (0.30 - pad / 2); c = size * 0.5; w = max(4, int(size * 0.06))
        d.ellipse([c - r, c - r, c + r, c + r], outline='#e8380d', width=w)
        d.ellipse([c - size * 0.07, c - size * 0.07, c + size * 0.07, c + size * 0.07], fill='white')
        im.save(path); return
    im = Image.new('RGB', (size, size), '#e8380d'); d = ImageDraw.Draw(im)
    r = size * (0.30 - pad / 2); c = size * 0.5
    d.ellipse([c - r, c - r, c + r, c + r], fill='white')
    t = size * 0.13
    d.rounded_rectangle([c - t, c - t, c + t, c + t], radius=size * 0.03, fill='#141414')
    im.save(path)
for s, n in [(180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    icon(s, os.path.join(out, n))
icon(512, os.path.join(out, 'icon-maskable-512.png'), pad=0.06)
