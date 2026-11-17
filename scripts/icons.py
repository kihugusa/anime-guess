"""App icon: a white disc on vermilion with a dark guess tile."""
import sys, os
from PIL import Image, ImageDraw
out = sys.argv[1]
def icon(size, path, pad=0.0):
    im = Image.new('RGB', (size, size), '#e8380d'); d = ImageDraw.Draw(im)
    r = size * (0.30 - pad / 2); c = size * 0.5
    d.ellipse([c - r, c - r, c + r, c + r], fill='white')
    t = size * 0.13
    d.rounded_rectangle([c - t, c - t, c + t, c + t], radius=size * 0.03, fill='#141414')
    im.save(path)
for s, n in [(180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    icon(s, os.path.join(out, n))
icon(512, os.path.join(out, 'icon-maskable-512.png'), pad=0.06)
