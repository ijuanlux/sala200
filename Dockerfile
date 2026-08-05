# SALA 200 en un contenedor: nginx (web + portero), la API de perfiles y el
# relay de netplay, todos gobernados por supervisord.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx supervisor python3 curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/sala200

# dependencias del relay de netplay
COPY netplay/package.json /opt/netplay/package.json
RUN cd /opt/netplay && npm install --omit=dev --no-audit --no-fund

# la sala
COPY juegos/       /var/www/html/juegos/
COPY api/          /opt/sala200-api/
COPY netplay/      /opt/netplay/
COPY catalogo/     /opt/sala200/
COPY docker/       /opt/sala200/docker/

# EmulatorJS y las librerías del lobby (no viajan en el repo)
COPY descargar-libs.sh /opt/sala200/descargar-libs.sh
RUN cd /var/www/html && mkdir -p juegos/ejs juegos/lib \
    && curl -L -o /tmp/ejs.zip https://github.com/EmulatorJS/EmulatorJS/releases/download/v4.2.3/4.2.3.zip \
    && unzip -oq /tmp/ejs.zip -d juegos/ejs && rm /tmp/ejs.zip \
    && curl -sL -o juegos/lib/gsap.min.js          https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js \
    && curl -sL -o juegos/lib/ScrollTrigger.min.js https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js \
    && curl -sL -o juegos/lib/lenis.min.js         https://cdnjs.cloudflare.com/ajax/libs/lenis/1.1.13/lenis.min.js

# configuración de nginx y del supervisor
COPY docker/nginx.conf       /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/sala200.conf
RUN mkdir -p /var/lib/sala200/profiles /var/lib/sala200/estados /roms

ENV SALA_SALT=cambia-este-salt \
    SALA_ADMIN=admin \
    SALA_PASS=admin

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD curl -fs http://127.0.0.1:8080/juegos/login.html >/dev/null || exit 1

ENTRYPOINT ["/opt/sala200/docker/arranque.sh"]
