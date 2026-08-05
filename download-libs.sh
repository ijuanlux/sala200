#!/bin/bash
# Downloads what does not ship in the repo: EmulatorJS and the lobby libraries.
set -e
cd "$(dirname "$0")"
echo "· EmulatorJS 4.2.3 (emulator + cores)…"
curl -L -o /tmp/ejs.zip https://github.com/EmulatorJS/EmulatorJS/releases/download/v4.2.3/4.2.3.zip
mkdir -p juegos/ejs && unzip -oq /tmp/ejs.zip -d juegos/ejs && rm /tmp/ejs.zip
echo "· GSAP + ScrollTrigger + Lenis (3D lobby)…"
mkdir -p juegos/lib
curl -sL -o juegos/lib/gsap.min.js          https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
curl -sL -o juegos/lib/ScrollTrigger.min.js https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
curl -sL -o juegos/lib/lenis.min.js         https://cdnjs.cloudflare.com/ajax/libs/lenis/1.1.13/lenis.min.js
echo "done · follow the README from here"
