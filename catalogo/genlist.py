#!/usr/bin/env python3
"""Genera games.json escaneando las ROMs del NAS montadas en /mnt/nasroms.
Multi-sistema: cada estanteria del NAS que tenga ficheros aparece en la web."""
import json, os

BASE = "/mnt/nasroms"
OUT = "/var/www/html/juegos/games.json"

SOURCES = [
    ("snes", "SNES/SNES USA Romset - Complete Collection/USA", (".zip", ".smc", ".sfc")),
    ("snes", "SNES/SNES ROMS (Español) LeaxxDoga/Español", (".zip", ".smc", ".sfc")),
    ("megadrive", "MegaDrive", (".zip", ".md", ".bin", ".gen", ".smd")),
    ("neogeo", "NeoGeo", (".zip",)),
    ("arcade", "Arcade", (".zip",), "/home/pi/roms"),
    ("nes", "NES", (".zip", ".nes")),
    ("gb", "GameBoy", (".zip", ".gb", ".gbc")),
    ("gba", "GBA", (".zip", ".gba")),
    ("psx", "PSX", (".chd", ".pbp", ".cue", ".m3u")),
    ("sms", "MasterSystem", (".zip", ".sms")),
    ("gg", "GameGear", (".zip", ".gg")),
    ("n64", "N64", (".zip", ".z64", ".n64", ".v64")),
]

games = []
for fuente in SOURCES:
    sys_name, rel, exts = fuente[0], fuente[1], fuente[2]
    base = fuente[3] if len(fuente) > 3 else BASE
    d = os.path.join(base, rel)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if f.lower().endswith(exts) and not f.startswith(".") and os.path.splitext(f)[0].lower() not in ("neogeo", "neogeo_bios"):
            name = os.path.splitext(f)[0]
            games.append({"sys": sys_name, "name": name, "path": os.path.join(rel, f),
                          "ts": int(os.path.getmtime(os.path.join(d, f)))})

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    json.dump(games, fh, ensure_ascii=False)
counts = {}
for g in games:
    counts[g["sys"]] = counts.get(g["sys"], 0) + 1
print(f"{len(games)} juegos -> {OUT} · {counts}")
