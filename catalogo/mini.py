#!/usr/bin/env python3
"""Genera miniaturas ligeras (para la rejilla del móvil) a partir de las
carátulas grandes. Las grandes se siguen usando en la sala 3D.
Escribe en /var/www/html/juegos/mini/<sys>/<nombre>.jpg y añade 'mini' al catálogo."""
import json, os
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = "/var/www/html/juegos"
JSON = f"{ROOT}/games.json"
MINI = f"{ROOT}/mini"
MAX_W = 320          # ancho suficiente para una tarjeta en cualquier móvil
QUALITY = 74

def work(g):
    src_rel = g.get("thumb")
    if not src_rel:
        return None
    src = os.path.join(ROOT, src_rel)
    if not os.path.exists(src):
        return None
    base = os.path.splitext(os.path.basename(src_rel))[0]
    rel = f"mini/{g['sys']}/{base}.jpg"
    dest = os.path.join(ROOT, rel)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return rel
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        im = Image.open(src)
        im = im.convert("RGB")
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        return rel
    except Exception:
        return None

games = json.load(open(JSON))
with ThreadPoolExecutor(max_workers=4) as ex:
    res = list(ex.map(work, games))

n = 0
for g, r in zip(games, res):
    if r:
        g["mini"] = r
        n += 1
    else:
        g.pop("mini", None)
json.dump(games, open(JSON, "w"), ensure_ascii=False)
print(f"miniaturas: {n}/{len(games)}")
