# SALA 200 🕹

**A self-hosted retro arcade with browser netplay that actually works.**
Play SNES, Mega Drive, Neo Geo, arcade, N64 and NES in the browser, and run real
2-player online matches where the players connect **directly to each other**
(WebRTC lockstep) instead of through your server — so a single Raspberry Pi can
host a whole club. Invitation-only membership, profiles with medals, spectator
mode, gamepad navigation and a 25-peseta coin for the INSERT COIN.

[Project page](https://ijuanlux.github.io/sala200/)

> This project ships **no ROMs and no BIOS files**, and does not link to any.
> Use dumps of the cartridges you own.

![The 3D lobby](docs/img/lobby3d.png)
*The 3D lobby: each neon door is a system, and members walk around it in real time.*

![Inside the SNES room](docs/img/sala-snes.png)
*Step through a door and the games become giant boxes you can walk between.*

| | |
|---|---|
| ![Library](docs/img/biblioteca.png) | ![Arcade shelf](docs/img/arcade.png) |
| The library, with box art | Arcade shelf with self-healing cores |
| ![Member card](docs/img/ficha.png) | ![Challenger prompt](docs/img/retador.png) |
| Member card: levels, medals, war cry | Arcade netplay: the challenger inserts their coin |
| ![Mega Drive shelf](docs/img/megadrive.png) | ![Lobby doors](docs/img/lobby3d-2.png) |
| Every system gets its own shelf | Walk up to a door to browse that system |

## Why it exists

EmulatorJS ships an experimental netplay that never really worked: the guest
never applied its own inputs and both sides ran the same button on different
frames. SALA 200 replaces it with a **deterministic lockstep** of its own — the
host sends a savestate and from then on only buttons travel, executed on the
exact same frames on both machines — plus a **direct WebRTC channel between the
two players**, so latency depends on the distance between them, not on where
the server lives.

That is what makes it scale: matches never touch the host machine, so more
members cost bandwidth for downloads, not CPU for games.

## Features

- **P2P netplay** with adaptive delay, input batching, desync detection by state
  fingerprint, a polite pause when your rival steps away and automatic rejoin
- **Spectator mode**: a third member receives the same savestate and inputs and
  watches the match live
- **Arcade that heals itself**: tries several libretro cores per ROM until one
  boots, then remembers the winner for everybody
- **A club, not a launcher**: invitations (5 per member), member cards with
  unlockable avatars, war cry and country, levels, medals, duels with
  cross-confirmation, ranking podium, chat with @mentions and a news feed
- **Couch mode**: browse the whole site with a gamepad; SELECT+START leaves a game
- **Mobile first**: side drawer, compact bar, per-system touch pads and a
  25-peseta coin button on arcade cabinets

## Quick start (Docker)

```bash
curl -fsSL https://raw.githubusercontent.com/ijuanlux/sala200/master/install.sh | bash
```

Or by hand:

```bash
git clone https://github.com/ijuanlux/sala200 && cd sala200
mkdir -p roms/SNES roms/MegaDrive roms/NeoGeo roms/Arcade   # your own dumps
SALA_ADMIN=juan SALA_PASS=secret SALA_SALT=$(openssl rand -hex 16) docker compose up -d
```

Open **http://localhost:8080**, log in as the member you just created and drop
your games under `roms/<System>/`; the catalogue rescans every 10 minutes.
Web, profiles API and netplay relay run in that single container, and your data
lives in a Docker volume.

## What is inside

| Folder | What it is |
|---|---|
| `juegos/` | The web app: 3D lobby, library, player with the lockstep netplay, login and registration |
| `api/` | Dependency-free Node API (port 3011): profiles, medals, presence, invitations, duels |
| `netplay/` | Netplay relay (socket.io, port 3010), derived from the EmulatorJS server |
| `catalogo/` | Python scripts that scan your ROMs and build the catalogue and box art |
| `deploy/` | nginx, systemd units and the member-creation helper for bare-metal installs |
| `docker/` | Container entrypoint, nginx config and supervisor config |

## Bare-metal install (Raspberry Pi)

Prefer no containers? The original setup runs on a Pi 4 with nginx, Node 18+ and
Python 3.

1. **Code**

   ```bash
   sudo apt install nginx nodejs npm python3 unzip
   git clone https://github.com/ijuanlux/sala200 && cd sala200
   ./download-libs.sh            # EmulatorJS (cores included) and the lobby libs
   sudo mkdir -p /var/www/html/juegos /opt/sala200-api /opt/netplay /opt/sala200 /var/lib/sala200
   sudo cp -r juegos/* /var/www/html/juegos/
   sudo cp api/server.js /opt/sala200-api/
   sudo cp -r netplay/* /opt/netplay/ && (cd /opt/netplay && npm install socket.io express)
   sudo cp catalogo/* /opt/sala200/
   ```

2. **Pick your SALT and create the first member.** Access works with a cookie:
   `sha256("user:password:SALT")`. Replace the placeholder SALT in
   `juegos/login.js`, `juegos/registro.js` and `api/server.js`, then:

   ```bash
   printf 'juan:mypassword:MY-SECRET-SALT' | sha256sum
   ```

   Put the hash in `api/users.json` (see `users.json.example`) and in
   `deploy/sala200_map.conf`. Everybody else joins through invitations.

3. **ROMs and catalogue.** Point `BASE` and `SOURCES` in `catalogo/genlist.py` at
   your library, then run `genlist.py` for the catalogue and `thumbs.py` /
   `arcade-covers.py` for box art. Neo Geo needs its `neogeo.zip` BIOS in the
   Neo Geo folder.

4. **nginx and services.** Copy what is in `deploy/` (site config, cookie map,
   systemd units) and enable them. For invitation sign-ups the API must be able
   to update the cookie map: install `deploy/sala200-alta` and allow it in
   sudoers.

5. **Reachable from outside (optional).**

   ```bash
   sudo tailscale up
   sudo tailscale funnel --bg 8080
   ```

   Real HTTPS and no ports opened on your router.

## Notes

- Code comments are in Spanish: this started as a private project for a group of
  friends, and those comments document every trap we hit. Worth reading before
  touching the lockstep in `juegos/player.html`.
- Arcade ROM sets are version-sensitive; that is why the player tries several
  cores and records which one works for each game.
- Tested on a Raspberry Pi 4 with Chrome, Safari and Firefox. Neo Geo on iOS is
  currently broken by an Apple WASM regression
  ([EmulatorJS#1143](https://github.com/EmulatorJS/EmulatorJS/issues/1143)).

## License

GPL-3.0. Built on [EmulatorJS](https://emulatorjs.org) (GPL-3.0); the relay in
`netplay/` derives from their server. GSAP is downloaded separately under its
own license.
