"""Generates equirectangular (2:1) planet surface maps into frontend/assets/planets.
Usage: python generate_textures.py [width]   (default 1024; try 2048 for sharper maps)
Needs: pip install numpy pillow"""
import os, sys
import numpy as np
from PIL import Image

W = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
H = W // 2
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "assets", "planets")
os.makedirs(OUT, exist_ok=True)

LO, LA = np.meshgrid((np.arange(W) + .5) / W * 2 * np.pi, (.5 - (np.arange(H) + .5) / H) * np.pi)
cl = np.cos(LA)
X, Y, Z = cl * np.cos(LO), np.sin(LA), cl * np.sin(LO)

def hsh(i, j, k):
    n = (i * 374761393 + j * 668265263 + k * 1274126177) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFFFFFF) / 4294967295.0

def vn(x, y, z):
    i, j, k = (np.floor(a).astype(np.int64) for a in (x, y, z))
    u, v, w = ((a - np.floor(a)) for a in (x, y, z))
    u, v, w = (t * t * (3 - 2 * t) for t in (u, v, w))
    L = lambda a, b, t: a + (b - a) * t
    return L(L(L(hsh(i, j, k), hsh(i + 1, j, k), u), L(hsh(i, j + 1, k), hsh(i + 1, j + 1, k), u), v),
             L(L(hsh(i, j, k + 1), hsh(i + 1, j, k + 1), u), L(hsh(i, j + 1, k + 1), hsh(i + 1, j + 1, k + 1), u), v), w)

def fbm(x, y, z, o=4):
    a, s, f = .5, 0, 1
    for _ in range(o):
        s = s + a * vn(x * f, y * f, z * f); a /= 2; f *= 2
    return s

ss = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(np.clip((x - a) / (b - a), 0, 1))
mix = lambda a, b, t: np.array(a, float) * (1 - t[..., None]) + np.array(b, float) * t[..., None]
band = lambda freq, warp: np.sin(LA * freq + warp) * .5 + .5

def spot(lo0, la0, wl, wh):
    d = np.arctan2(np.sin(LO - lo0), np.cos(LO - lo0))
    e = (d / wl) ** 2 + ((LA - la0) / wh) ** 2
    return np.where(e < 1, 1 - e, 0)

def mercury():
    g = 60 + fbm(X * 4, Y * 4, Z * 4, 5) * 120
    rng = np.random.default_rng(3)
    for _ in range(160):
        lo, la, r = rng.uniform(0, 2 * np.pi), np.arcsin(rng.uniform(-1, 1)), .02 + rng.random() ** 2 * .16
        c = (np.cos(la) * np.cos(lo), np.sin(la), np.cos(la) * np.sin(lo))
        d = X * c[0] + Y * c[1] + Z * c[2]
        m = d > np.cos(r)
        if m.any():
            t = np.arccos(np.clip(d[m], -1, 1)) / r
            g[m] *= np.where(t < .85, .78 + .22 * t, 1.15 - (t - .85))
    return np.stack([g, g * .97, g * .93], -1)

def venus():
    w = fbm(X * 3, Y * 3, Z * 3, 3)
    return mix((205, 160, 95), (245, 222, 160), ss(.25, .7, fbm(X * 2 + w * 1.6, Y * 4 + w, Z * 2, 5)))

def earth():
    h = fbm(X * 2 + 5, Y * 2, Z * 2, 6)
    land = mix((62, 112, 52), (150, 125, 80), ss(.4, .65, fbm(X * 5, Y * 5, Z * 5, 3)))
    sea = mix((8, 35, 105), (30, 95, 175), ss(.28, .5, h))
    c = np.where((h > .5)[..., None], land, sea)
    c = mix(c, (240, 246, 252), ss(1.15, 1.35, np.abs(LA) + (fbm(X * 6, Y * 6, Z * 6, 3) - .5) * .3))
    return mix(c, (255, 255, 255), ss(.5, .72, fbm(X * 3 + 9, Y * 3 + 3, Z * 3, 5)) * .85)

def mars():
    c = mix((205, 120, 70), (170, 85, 45), ss(.3, .65, fbm(X * 3, Y * 3, Z * 3, 5)))
    c = mix(c, (95, 50, 35), ss(.45, .62, fbm(X * 1.6 + 4, Y * 1.6, Z * 1.6, 4)) * .7)
    return mix(c, (245, 240, 235), ss(1.38, 1.5, np.abs(LA)))

def jupiter():
    c = mix((236, 216, 184), (168, 108, 70), ss(.25, .75, band(13, fbm(X * 3, Y * 8, Z * 3, 4) * 3.2)))
    c = mix(c, (120, 80, 55), ss(.55, .75, fbm(X * 10, Y * 14, Z * 10, 3)) * .35)
    return mix(c, (190, 85, 55), spot(3.5, -.38, .3, .11) * .9)

def saturn():
    return mix((192, 160, 112), (232, 208, 158), band(11, fbm(X * 3, Y * 6, Z * 3, 3) * 2))

def uranus():
    return mix((140, 214, 222), (165, 230, 234), band(8, fbm(X * 3, Y * 3, Z * 3, 3) * 2))

def neptune():
    c = mix((30, 60, 165), (70, 115, 225), band(9, fbm(X * 3, Y * 3, Z * 3, 4) * 2.5))
    return mix(c, (15, 30, 100), spot(1, -.35, .3, .12) * .8)

for name, fn in [("mercury", mercury), ("venus", venus), ("earth", earth), ("mars", mars),
                 ("jupiter", jupiter), ("saturn", saturn), ("uranus", uranus), ("neptune", neptune)]:
    Image.fromarray(np.clip(fn(), 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + ".jpg"), quality=90)
    print("wrote", name)
