#!/usr/bin/env python3
"""Carátulas ARCADE de verdad.

Las bajadas con búsqueda difusa eran una lotería (el Combat School salía con la
portada del Pac-Man). Aquí no se adivina: se traduce el nombre corto de la ROM
a su título real con la base de datos de MAME y se pide EXACTAMENTE esa imagen
al archivo de libretro. Si no existe, el juego se queda sin carátula, que es
mejor que una equivocada.
"""
import json, os, re, urllib.parse, urllib.request, sys

JSON = "/var/www/html/juegos/games.json"
DEST = "/var/www/html/juegos/thumbs/arcade"
XML = "/tmp/mame2003plus.xml"
XML_URL = ("https://raw.githubusercontent.com/libretro/libretro-database/master/"
           "metadat/mame/MAME%202003-Plus%20XML.xml")
# el archivo de libretro para arcade, por orden de preferencia
FUENTES = [
    ("FBNeo - Arcade Games", "Named_Titles"),
    ("FBNeo - Arcade Games", "Named_Snaps"),
    ("MAME", "Named_Titles"),
    ("MAME", "Named_Snaps"),
]
BAD = '&*/:`<>?\\|"'
safe = lambda n: "".join("_" if c in BAD else c for c in n)


def bajar(url, destino=None, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": "sala200"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        datos = r.read()
    if destino:
        with open(destino, "wb") as f:
            f.write(datos)
    return datos


def titulos():
    """nombre corto -> título real, según la base de datos de MAME"""
    if not os.path.exists(XML) or os.path.getsize(XML) < 1_000_000:
        print("bajando la base de datos de MAME…", flush=True)
        bajar(XML_URL, XML, timeout=180)
    s = open(XML, encoding="utf-8", errors="ignore").read()
    m = {}
    for g in re.finditer(r'<game name="([^"]+)"(.*?)</game>', s, re.S):
        d = re.search(r"<description>(.*?)</description>", g.group(2), re.S)
        if d:
            m[g.group(1)] = d.group(1).strip()
    return m


def indice(carpeta, tipo):
    """qué imágenes existen en esa estantería del archivo de libretro"""
    url = f"https://thumbnails.libretro.com/{urllib.parse.quote(carpeta)}/{tipo}/"
    try:
        html = bajar(url, timeout=120).decode("utf-8", "ignore")
    except Exception as e:
        print(f"  · no pude listar {carpeta}/{tipo}: {e}", flush=True)
        return {}
    nombres = {}
    for h in re.findall(r'href="([^"]+\.png)"', html):
        nom = urllib.parse.unquote(h)
        nombres[nom[:-4].lower()] = h          # sin .png, en minúsculas
    print(f"  · {carpeta}/{tipo}: {len(nombres)} imágenes", flush=True)
    return nombres


def main():
    juegos = [g for g in json.load(open(JSON)) if g["sys"] == "arcade"]
    print(f"{len(juegos)} juegos arcade en el catálogo", flush=True)
    mapa = titulos()
    print(f"{len(mapa)} títulos en la base de datos de MAME", flush=True)
    os.makedirs(DEST, exist_ok=True)

    idx = [(c, t, indice(c, t)) for c, t in FUENTES]
    puestas = faltan = 0
    for g in juegos:
        corto = g["name"]
        destino = os.path.join(DEST, safe(corto) + ".png")
        if os.path.exists(destino) and os.path.getsize(destino) > 2000:
            puestas += 1
            continue
        titulo = mapa.get(corto)
        if not titulo:
            faltan += 1
            continue
        clave = titulo.lower()
        # el título tal cual, y sin la coletilla entre paréntesis
        claves = [clave, re.sub(r"\s*\([^)]*\)\s*$", "", clave).strip()]
        bajada = False
        for carpeta, tipo, nombres in idx:
            for k in claves:
                h = nombres.get(k)
                if not h:
                    continue
                url = f"https://thumbnails.libretro.com/{urllib.parse.quote(carpeta)}/{tipo}/{h}"
                try:
                    bajar(url, destino, timeout=45)
                    puestas += 1
                    bajada = True
                except Exception:
                    pass
                break
            if bajada:
                break
        if not bajada:
            faltan += 1
        if (puestas + faltan) % 200 == 0:
            print(f"  … {puestas} con carátula · {faltan} sin ella", flush=True)

    print(f"LISTO · {puestas} carátulas · {faltan} sin imagen", flush=True)


if __name__ == "__main__":
    main()
