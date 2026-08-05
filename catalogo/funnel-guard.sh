#!/bin/bash
# Si el tunel publico deja de responder (pasa cuando el router cambia de IP),
# reiniciamos tailscaled, que es lo unico que hace falta para recuperarlo.
URL=https://sala200.TU-TAILNET.ts.net/juegos/login.html
for i in 1 2 3; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$URL")
  [ "$code" = "200" ] && exit 0
  sleep 10
done
logger -t sala200-funnel "tunel caido (ultimo codigo: $code), reiniciando tailscaled"
systemctl restart tailscaled
