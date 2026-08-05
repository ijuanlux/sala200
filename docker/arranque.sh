#!/bin/bash
# Arranque del contenedor de SALA 200: prepara la identidad del club, escanea
# tus juegos y levanta los tres servicios.
set -e

SALT="${SALA_SALT:-cambia-este-salt}"
ADMIN="${SALA_ADMIN:-admin}"
PASS="${SALA_PASS:-admin}"
DATA=/var/lib/sala200
mkdir -p "$DATA/profiles" "$DATA/estados"

# --- 1. el SALT viaja en tres sitios: web, registro y API ---
for f in /var/www/html/juegos/login.js /var/www/html/juegos/registro.js /opt/sala200-api/server.js; do
  sed -i "s/CAMBIA-ESTE-SALT-POR-UNO-TUYO/${SALT//\//\\/}/g; s/sala200-clandestino-2026/${SALT//\//\\/}/g" "$f" 2>/dev/null || true
done

# --- 2. el primer socio (tú), si no existe todavía ---
HASH=$(printf '%s' "${ADMIN}:${PASS}:${SALT}" | sha256sum | cut -d' ' -f1)
if [ ! -s /opt/sala200-api/users.json ]; then
  printf '{\n  "%s": "%s"\n}\n' "$HASH" "$ADMIN" > /opt/sala200-api/users.json
fi
if ! grep -q "$HASH" /etc/nginx/sala200_map.conf 2>/dev/null; then
  {
    echo 'map_hash_bucket_size 128;'
    echo 'map $cookie_sala200 $sala_ok {'
    echo '    default 0;'
    python3 - <<PY
import json
u = json.load(open('/opt/sala200-api/users.json'))
for h, n in u.items():
    if len(h) == 64:
        print(f'    "{h}" 1;   # {n}')
PY
    echo '}'
  } > /etc/nginx/sala200_map.conf
fi

# el alta por invitación necesita reescribir ese mapa: dentro del contenedor
# somos root, así que basta con un script que lo regenere y recargue nginx
cat > /usr/local/sbin/sala200-alta <<'ALTA'
#!/bin/bash
H="$1"; N="$2"
[[ "$H" =~ ^[a-f0-9]{64}$ ]] || exit 2
[[ "$N" =~ ^[a-z0-9_-]{3,16}$ ]] || exit 3
grep -q "$H" /etc/nginx/sala200_map.conf && exit 0
sed -i "0,/^}/s//    \"$H\" 1;   # $N (invitado)\n}/" /etc/nginx/sala200_map.conf
nginx -t >/dev/null 2>&1 && nginx -s reload
ALTA
chmod 755 /usr/local/sbin/sala200-alta
printf '#!/bin/sh\nexec "$@"\n' > /usr/local/bin/sudo && chmod 755 /usr/local/bin/sudo

# --- 3. tus juegos: se escanean de /roms ---
sed -i 's#^BASE = .*#BASE = "/roms"#' /opt/sala200/genlist.py 2>/dev/null || true
python3 /opt/sala200/genlist.py 2>/dev/null || echo '[]' > /var/www/html/juegos/games.json

echo "──────────────────────────────────────────────"
echo "  SALA 200 lista en http://localhost:8080"
echo "  socio: $ADMIN   ·   clave: $PASS"
[ "$SALT" = "cambia-este-salt" ] && echo "  ⚠  usa SALA_SALT=<algo tuyo> en producción"
echo "──────────────────────────────────────────────"

exec supervisord -c /etc/supervisor/conf.d/sala200.conf
