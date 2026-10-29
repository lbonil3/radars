#!/usr/bin/env python3
"""Generates the Radars landing icons (radar sweep motif, matches national/ and texas/ icons). Run: python3 scripts/make-icons.py (Pillow)."""
from PIL import Image, ImageDraw
import math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
def icon(size, safe):  # safe = fraction of the canvas the motif may use (maskable keeps to the 80% safe zone)
    S = size * 4; im = Image.new('RGBA', (S, S), (10, 16, 32, 255)); d = ImageDraw.Draw(im)
    c = S / 2; R = S * safe / 2
    # sweep wedge (green, fading toward the trailing edge), composited so alpha blends
    for i in range(24):
        L = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ld = ImageDraw.Draw(L); r = R * .92
        ld.pieslice([c - r, c - r, c + r, c + r], -45 - 70 * (1 - i / 24), -45, fill=(47, 191, 143, 9))
        im.alpha_composite(L)
    d = ImageDraw.Draw(im)
    w = max(2, int(S * .022))
    for k, col in ((1, (122, 176, 255)), (.66, (79, 140, 255)), (.33, (122, 176, 255))):
        r = R * .92 * k; d.ellipse([c - r, c - r, c + r, c + r], outline=col + (255,), width=w)
    ex, ey = c + R * .92 * math.cos(math.radians(-45)), c + R * .92 * math.sin(math.radians(-45))
    d.line([c, c, ex, ey], fill=(47, 211, 143, 255), width=int(w * 1.3))
    b = S * .045 * safe / .8; d.ellipse([ex - b, ey - b, ex + b, ey + b], fill=(251, 191, 36, 255))
    b2 = S * .025; px, py = c - R * .35, c + R * .3; d.ellipse([px - b2, py - b2, px + b2, py + b2], fill=(47, 211, 143, 255))
    return im.resize((size, size), Image.LANCZOS).convert('RGB')
os.makedirs(OUT, exist_ok=True)
icon(192, .78).save(os.path.join(OUT, 'icon-192.png'))
icon(512, .78).save(os.path.join(OUT, 'icon-512.png'))
icon(512, .62).save(os.path.join(OUT, 'icon-maskable-512.png'))
icon(180, .78).save(os.path.join(OUT, 'apple-touch-icon.png'))
