#!/usr/bin/env python3
"""Descarga carátulas de thumbnails.libretro.com para los juegos de games.json.
Para sistemas arcade (nombres cortos tipo kof98) hace búsqueda difusa en el índice."""
import json, os, re, difflib, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

JSON = "/var/www/html/juegos/games.json"
THUMBS = "/var/www/html/juegos/thumbs"
LIBRETRO_SYS = {
    "snes": "Nintendo - Super Nintendo Entertainment System",
    "megadrive": "Sega - Mega Drive - Genesis",
    "neogeo": "SNK - Neo Geo",
    "arcade": "FBNeo - Arcade Games",
    "nes": "Nintendo - Nintendo Entertainment System",
    "gb": "Nintendo - Game Boy",
    "gba": "Nintendo - Game Boy Advance",
    "psx": "Sony - PlayStation",
    "n64": "Nintendo - Nintendo 64",
}
# sistemas cuyos nombres de ROM son crípticos: hace falta el índice remoto
FUZZY = {"neogeo", "arcade"}   # estos van directos a indice; el resto prueba exacto y luego difuso
ALIAS = {
    "kof98": "The King of Fighters '98 - The Slugfest _ King of Fighters '98 - dream match never ends (NGM-2420)",
    "kof98n": "The King of Fighters '98 - The Slugfest _ King of Fighters '98 - dream match never ends (NGM-2420)",
    "kof99n": "The King of Fighters '99 - Millennium Battle (Korean release)",
    "kof99a": "The King of Fighters '99 - Millennium Battle (Korean release)",
    "kf2k2mp2": "The King of Fighters 2002 (NGM-2650)(NGH-2650)",
    "kf2k3upl": "The King of Fighters 2003 (NGH-2710)",
    "kofse2k4": "The King of Fighters 2002 (NGM-2650)(NGH-2650)",
    "mslug2": "Metal Slug 2 - Super Vehicle-001_II (NGM-2410) (NGH-2410)",
    "mslugx": "Metal Slug X - Super Vehicle-001 (NGM-2500)(NGH-2500)",
    "fatfury1": "Fatal Fury - King of Fighters _ Garou Densetsu - shukumei no tatakai (NGM-033)(NGH-033)",
    "fatfursa": "Fatal Fury Special _ Garou Densetsu Special (set 1)(NGM-058)(NGH-058)",
    "fightfva": "Fight Fever (set 1)",
    "fswords": "Fighters Swords (Korean release of Samurai Shodown III)",
    "jockeygp": "Jockey Grand Prix (set 1)",
}
BAD = '&*/:`<>?\\|"'

def lr_name(name):
    return "".join("_" if c in BAD else c for c in name)

_index_cache = {}
def index_for(sysdir):
    if sysdir in _index_cache:
        return _index_cache[sysdir]
    url = "https://thumbnails.libretro.com/" + urllib.parse.quote(sysdir) + "/Named_Boxarts/"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "curl/8"})
        with urllib.request.urlopen(req, timeout=40) as r:
            html = r.read().decode("utf-8", "replace")
        names = [urllib.parse.unquote(m) for m in re.findall(r'<a href="([^"]+\.png)"', html)]
    except Exception:
        names = []
    _index_cache[sysdir] = names
    return names

def pick_remote(sysname, sysdir, game):
    if game in ALIAS:
        return ALIAS[game] + ".png"
    if sysname not in FUZZY:
        return lr_name(game) + ".png"
    idx = index_for(sysdir)
    if not idx:
        return lr_name(game) + ".png"
    low = game.lower()
    starts = [n for n in idx if n.lower().startswith(low)]
    if starts:
        return sorted(starts, key=len)[0]
    m = difflib.get_close_matches(game + ".png", idx, n=1, cutoff=0.55)
    return m[0] if m else lr_name(game) + ".png"

def try_get(sysdir, remote):
    url = "https://thumbnails.libretro.com/" + urllib.parse.quote(f"{sysdir}/Named_Boxarts/{remote}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "curl/8"})
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.read() or None
    except Exception:
        return None

def pick_remote_fuzzy(sysdir, game):
    idx = index_for(sysdir)
    if not idx:
        return None
    low = game.lower()
    # prioriza USA > Europe > el mas corto
    starts = [n for n in idx if n.lower().startswith(low)]
    if starts:
        for tag in ("(usa)", "(world)", "(europe)"):
            hit = [n for n in starts if tag in n.lower()]
            if hit:
                return sorted(hit, key=len)[0]
        return sorted(starts, key=len)[0]
    m = difflib.get_close_matches(game + ".png", idx, n=1, cutoff=0.6)
    return m[0] if m else None

def fetch(g):
    # si ya tiene portada HD asignada por covers.py, no se toca
    if g.get("thumb", "").startswith("covers/"):
        return g["thumb"]
    sysdir = LIBRETRO_SYS.get(g["sys"])
    if not sysdir:
        return None
    local = lr_name(g["name"]) + ".png"
    dest = os.path.join(THUMBS, g["sys"], local)
    rel = f"thumbs/{g['sys']}/{local}"
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return rel
    candidates = [pick_remote(g["sys"], sysdir, g["name"])]
    for remote in candidates:
        data = try_get(sysdir, remote)
        if data:
            with open(dest, "wb") as f:
                f.write(data)
            return rel
    # segundo intento: buscar en el indice remoto (nombres con region, subtitulos, etc.)
    if g["sys"] not in FUZZY:
        alt = pick_remote_fuzzy(sysdir, g["name"])
        if alt:
            data = try_get(sysdir, alt)
            if data:
                with open(dest, "wb") as f:
                    f.write(data)
                return rel
    return None

games = json.load(open(JSON))
for s in LIBRETRO_SYS:
    os.makedirs(os.path.join(THUMBS, s), exist_ok=True)
for s in {g["sys"] for g in games} & FUZZY:
    index_for(LIBRETRO_SYS[s])

with ThreadPoolExecutor(max_workers=8) as ex:
    thumbs = list(ex.map(fetch, games))

hits = 0
for g, t in zip(games, thumbs):
    if t:
        g["thumb"] = t
        hits += 1
    else:
        g.pop("thumb", None)

json.dump(games, open(JSON, "w"), ensure_ascii=False)
print(f"caratulas: {hits}/{len(games)}")
