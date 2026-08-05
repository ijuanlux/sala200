#!/bin/bash
# SALA 200 — one-command installer.
#   curl -fsSL https://raw.githubusercontent.com/ijuanlux/sala200/master/install.sh | bash
set -e
blue()  { printf '\033[36m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }

blue "──────────────────────────────"
blue "   SALA 200 · install"
blue "──────────────────────────────"

command -v docker >/dev/null || { echo "Docker is required: https://docs.docker.com/get-docker/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "The 'docker compose' plugin is required"; exit 1; }

DIR="${1:-$HOME/sala200}"
mkdir -p "$DIR/roms"
cd "$DIR"

[ -d .git ] || git clone --depth 1 https://github.com/ijuanlux/sala200 . 2>/dev/null || true

read -rp "Your member name [juan]: " ADMIN; ADMIN="${ADMIN:-juan}"
read -rsp "Your password: " PASS; echo
SALT="$(head -c 24 /dev/urandom | base64 | tr -d '/+=')"

cat > .env <<EOF
SALA_ADMIN=$ADMIN
SALA_PASS=$PASS
SALA_SALT=$SALT
EOF

green "· building (first run takes a few minutes)…"
docker compose build >/dev/null
docker compose up -d

green ""
green "  Ready: http://localhost:8080"
green "  Member: $ADMIN"
green ""
echo "  Drop your games in:  $DIR/roms/<System>/"
echo "  (SNES, MegaDrive, NeoGeo, Arcade, NES, N64, PSX…)"
echo "  The catalogue rescans every 10 minutes."
