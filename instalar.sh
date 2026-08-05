#!/bin/bash
# SALA 200 — instalador de una sola orden.
#   curl -fsSL https://raw.githubusercontent.com/ijuanlux/sala200/master/instalar.sh | bash
set -e
azul() { printf '\033[36m%s\033[0m\n' "$1"; }
verde() { printf '\033[32m%s\033[0m\n' "$1"; }

azul "──────────────────────────────"
azul "   SALA 200 · instalación"
azul "──────────────────────────────"

command -v docker >/dev/null || { echo "Necesitas Docker: https://docs.docker.com/get-docker/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Necesitas el plugin 'docker compose'"; exit 1; }

DIR="${1:-$HOME/sala200}"
mkdir -p "$DIR/roms"
cd "$DIR"

[ -d .git ] || git clone --depth 1 https://github.com/ijuanlux/sala200 . 2>/dev/null || true

read -rp "Tu nombre de socio [juan]: " ADMIN; ADMIN="${ADMIN:-juan}"
read -rsp "Tu clave: " PASS; echo
SALT="$(head -c 24 /dev/urandom | base64 | tr -d '/+=')"

cat > .env <<EOF
SALA_ADMIN=$ADMIN
SALA_PASS=$PASS
SALA_SALT=$SALT
EOF

verde "· construyendo (la primera vez tarda unos minutos)…"
docker compose build >/dev/null
docker compose up -d

verde ""
verde "  Listo: http://localhost:8080"
verde "  Socio: $ADMIN"
verde ""
echo "  Copia tus juegos en:  $DIR/roms/<Sistema>/"
echo "  (SNES, MegaDrive, NeoGeo, Arcade, NES, N64, PSX…)"
echo "  El catálogo se regenera solo cada 10 minutos."
