#!/usr/bin/env python3
"""Asigna a cada juego su portada y contraportada de alta resolución
si existen en /var/www/html/juegos/covers/. Se ejecuta después de genlist.py."""
import json, os

JSON = "/var/www/html/juegos/games.json"
ROOT = "/var/www/html/juegos"
BAD = '&*/:`<>?\\|"'

def safe(name):
    return "".join("_" if c in BAD else c for c in name)

games = json.load(open(JSON))
nf = nb = 0
for g in games:
    base = safe(g["name"])
    f = f"covers/{g['sys']}/{base}.jpg"
    b = f"covers/{g['sys']}/{base}_b.jpg"
    if os.path.exists(os.path.join(ROOT, f)):
        g["thumb"] = f
        nf += 1
    if os.path.exists(os.path.join(ROOT, b)):
        g["back"] = b
        nb += 1
    else:
        g.pop("back", None)

json.dump(games, open(JSON, "w"), ensure_ascii=False)
print(f"covers: {nf} portadas · {nb} contraportadas")
