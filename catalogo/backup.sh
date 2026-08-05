#!/bin/bash
# SALA 200: copia nocturna de lo insustituible (perfiles, partidas, invitaciones,
# usuarios y el portero de nginx) al NAS. Guarda 14 días.
set -e
DEST=/mnt/nasroms/backups/sala200
mkdir -p "$DEST"
tar czf "$DEST/sala200-$(date +%F).tar.gz" \
  /var/lib/sala200 /opt/sala200-api/users.json /etc/nginx/conf.d/sala200_map.conf 2>/dev/null
ls -1t "$DEST"/sala200-*.tar.gz | tail -n +15 | xargs -r rm -f
