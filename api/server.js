/* SALA 200 — API de perfiles, logros y partidas.
   Sin dependencias: solo http + fs. Identifica al usuario por la cookie de sesión. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

/* el mismo SALT que usa login.js en el navegador: el registro calcula el
   token en el servidor con la misma fórmula */
const SALT = 'CAMBIA-ESTE-SALT-POR-UNO-TUYO';

const PORT = 3011;
const DATA = '/var/lib/sala200';
const USERS = JSON.parse(fs.readFileSync('/opt/sala200-api/users.json', 'utf8')); // hash -> usuario
fs.mkdirSync(path.join(DATA, 'profiles'), { recursive: true });
/* Partidas guardadas solas: una foto del juego por usuario y por título, para
   poder reanudar donde lo dejaste aunque cambies de aparato. */
const ESTADOS = path.join(DATA, 'estados');
fs.mkdirSync(ESTADOS, { recursive: true });
const MAX_ESTADO = 80 * 1024 * 1024;      // 80 MB: las de PS1 pasan de 14 y se quedaban fuera
const MAX_POR_USUARIO = 40;               // y no dejamos que crezca sin fin

function carpetaEstados(user) {
  const d = path.join(ESTADOS, user.replace(/[^a-z0-9_-]/gi, '_'));
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function limpiarViejos(dir) {
  try {
    const f = fs.readdirSync(dir).map(n => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs }))
                .sort((a, b) => b.t - a.t);
    f.slice(MAX_POR_USUARIO).forEach(x => { try { fs.unlinkSync(path.join(dir, x.n)); } catch (e) {} });
  } catch (e) {}
}

const NIVELES = [
  [0, 'NOVATO'], [5, 'HABITUAL'], [15, 'VICIADO'], [30, 'MÁQUINA'],
  [60, 'LEYENDA'], [120, 'DUEÑO DE LA SALA'],
];

const LOGROS = [
  { id: 'primera',    nombre: 'INSERT COIN',        desc: 'Tu primera partida en SALA 200',            test: p => p.plays >= 1 },
  { id: 'diez',       nombre: 'HABITUAL',           desc: '10 partidas jugadas',                       test: p => p.plays >= 10 },
  { id: 'cincuenta',  nombre: 'SIN CRÉDITOS',       desc: '50 partidas jugadas',                       test: p => p.plays >= 50 },
  { id: 'cinco_j',    nombre: 'CURIOSO',            desc: '5 juegos distintos',                        test: p => p.uniq >= 5 },
  { id: 'veinte_j',   nombre: 'COLECCIONISTA',      desc: '20 juegos distintos',                       test: p => p.uniq >= 20 },
  { id: 'cincuenta_j',nombre: 'ARQUEÓLOGO',         desc: '50 juegos distintos',                       test: p => p.uniq >= 50 },
  { id: 'multi',      nombre: 'POLIVALENTE',        desc: 'Has jugado a 3 sistemas distintos',         test: p => Object.keys(p.sys).length >= 3 },
  { id: 'todos_sys',  nombre: 'SIN FRONTERAS',      desc: 'Un juego de cada sistema de la sala',       test: p => Object.keys(p.sys).length >= 4 },
  { id: 'snes10',     nombre: 'MODO 7',             desc: '10 partidas de SNES',                       test: p => (p.sys.snes || 0) >= 10 },
  { id: 'md10',       nombre: 'BLAST PROCESSING',   desc: '10 partidas de Mega Drive',                 test: p => (p.sys.megadrive || 0) >= 10 },
  { id: 'ng10',       nombre: 'HEAVY D!',           desc: '10 partidas de Neo Geo',                    test: p => (p.sys.neogeo || 0) >= 10 },
  { id: 'n6410',      nombre: 'TRIDIMENSIONAL',     desc: '10 partidas de N64',                        test: p => (p.sys.n64 || 0) >= 10 },
  { id: 'fav5',       nombre: 'BUEN GUSTO',         desc: '5 juegos en favoritos',                     test: p => p.favs >= 5 },
  { id: 'noctambulo', nombre: 'NOCTÁMBULO',         desc: 'Jugar entre las 3 y las 6 de la mañana',    test: p => !!p.flags.noche },
  { id: 'madrugador', nombre: 'MADRUGADOR',         desc: 'Jugar antes de las 8 de la mañana',         test: p => !!p.flags.pronto },
  { id: 'maraton',    nombre: 'MARATÓN',            desc: 'Una sesión de más de una hora',             test: p => (p.longest || 0) >= 3600 },
  { id: 'red',        nombre: 'DOS JUGADORES',      desc: 'Tu primera partida en red',                 test: p => (p.netplay || 0) >= 1 },
  { id: 'red10',      nombre: 'RIVAL DIGNO',        desc: '10 partidas en red',                        test: p => (p.netplay || 0) >= 10 },
  { id: 'semana',     nombre: 'FIEL A LA SALA',     desc: 'Jugar 5 días distintos',                    test: p => (p.dias || []).length >= 5 },
  { id: 'sangre',     nombre: 'PRIMERA SANGRE',     desc: 'Tu primera victoria en un duelo',           test: p => (p.victorias || 0) >= 1 },
  { id: 'verdugo',    nombre: 'VERDUGO',            desc: '10 duelos ganados',                         test: p => (p.victorias || 0) >= 10 },
  { id: 'imparable',  nombre: 'IMPARABLE',          desc: 'Racha de 3 victorias seguidas',             test: p => (p.rachaMax || 0) >= 3 },
  { id: 'leyenda_v',  nombre: 'MÁQUINA DE GUERRA',  desc: '25 duelos ganados',                         test: p => (p.victorias || 0) >= 25 },
];

function nuevoPerfil(user) {
  return { user, creado: Date.now(), plays: 0, uniq: 0, favs: 0, netplay: 0, longest: 0,
           sys: {}, juegos: {}, recientes: [], logros: [], dias: [], flags: {}, minutos: 0 };
}
const fichero = (u) => path.join(DATA, 'profiles', u.replace(/[^a-z0-9_-]/gi, '') + '.json');
function leer(u) {
  try { return { ...nuevoPerfil(u), ...JSON.parse(fs.readFileSync(fichero(u), 'utf8')) }; }
  catch { return nuevoPerfil(u); }
}
function guardar(p) { fs.writeFileSync(fichero(p.user), JSON.stringify(p)); }

function nivel(p) {
  let n = NIVELES[0];
  for (const x of NIVELES) if (p.plays >= x[0]) n = x;
  const sig = NIVELES.find(x => x[0] > p.plays);
  return { nombre: n[1], siguiente: sig ? sig[1] : null, faltan: sig ? sig[0] - p.plays : 0 };
}
/* SALA200BOT: la voz de la casa en el chat (logros, niveles, bienvenidas) */
function nivelIdx(plays) {
  let n = 0;
  for (let i = 0; i < NIVELES.length; i++) if (plays >= NIVELES[i][0]) n = i;
  return n;
}
/* ---------- buzón de novedades: lo que pasa en el club ---------- */
const NOVEDADES = [];                 // { id, ico, texto, ts }
const NOV_MAX = 60;
function nov(ico, texto) {
  NOVEDADES.push({ id: Date.now() + Math.random(), ico, texto: String(texto).slice(0, 120), ts: Date.now() });
  while (NOVEDADES.length > NOV_MAX) NOVEDADES.shift();
}

function botDice(texto) {
  CHAT.push({ id: Date.now() + Math.random(), user: 'SALA200', texto: String(texto).slice(0, 240), ts: Date.now() });
  while (CHAT.length > CHAT_MAX) CHAT.shift();
}

function revisarLogros(p) {
  const nuevos = [];
  for (const l of LOGROS) {
    if (p.logros.includes(l.id)) continue;
    try { if (l.test(p)) { p.logros.push(l.id); nuevos.push(l); } } catch {}
  }
  return nuevos;
}

/* ---------- notas de voz (se guardan en memoria y caducan solas) ---------- */
const AUDIOS = [];
const AUDIO_MAX = 12;              // pocas y recientes: esto no es un archivo
const AUDIO_VIDA = 120000;         // 2 minutos

/* ---------- "oye, ábreme sala" ----------
   Quien pulsa UNIRME llama a la puerta del que ya está jugando, para que este
   pueda abrir la sala de dos jugadores sin tener que adivinarlo. */
const LLAMADAS = [];              // { para, de, juego, ts }
const LLAMADA_VIDA = 40000;

/* ---------- gente andando por la sala 3D ----------
   Carril aparte del /ping normal: aquí llegan posiciones varias veces por segundo,
   así que se guarda lo mínimo y caduca enseguida. */
const SALA3D = new Map();      // usuario -> { x, z, ry, anim, mode, ts }
const VIDA3D = 9000;           // si no da señales en 9 s, desaparece de la sala

/* ---------- emojis voladores ---------- */
const EMOJIS = [];                    // { id, user, emoji, ts, juego }
const EMOJI_MAX = 200;

/* ---------- chat de la sala ---------- */
const CHAT = [];                      // últimos mensajes en memoria
const CHAT_MAX = 120;

/* ---------- quién está conectado ahora mismo ---------- */
const PRESENCIA = new Map();          // usuario -> { ts, donde, juego, sys }
const VENTANA = 75000;                // 75 s sin dar señales = desconectado

/* nivel e insignias de cada usuario, con caché: el lobby pide /pos 3 veces
   por segundo y no vamos a leer 13 JSON del disco cada vez */
const FICHAS = new Map();               // user -> { nv, lg, ts }
function fichaDe(u) {
  const f = FICHAS.get(u);
  if (f && Date.now() - f.ts < 60000) return f;
  const p = leer(u);
  let nv = 0;
  for (let i = 0; i < NIVELES.length; i++) if (p.plays >= NIVELES[i][0]) nv = i;
  const nueva = { nv, lg: (p.logros || []).length, av: p.avatar || '', ts: Date.now() };
  FICHAS.set(u, nueva);
  return nueva;
}

/* ---------- duelos: resultados de partidas en red, confirmados por ambos ---------- */
const DUELOS_F = path.join(DATA, 'duelos.json');
let DUELOS = { historial: [], pendientes: {} };
try { DUELOS = JSON.parse(fs.readFileSync(DUELOS_F, 'utf8')); } catch (e) {}
function guardarDuelos() { try { fs.writeFileSync(DUELOS_F, JSON.stringify(DUELOS)); } catch (e) {} }
function registrarDuelo(ganador, perdedor, juego) {
  DUELOS.historial.push({ g: ganador, p: perdedor, juego, ts: Date.now() });
  if (DUELOS.historial.length > 2000) DUELOS.historial.shift();
  const pg = leer(ganador), pp = leer(perdedor);
  pg.victorias = (pg.victorias || 0) + 1;
  pg.racha = (pg.racha || 0) + 1;
  pg.rachaMax = Math.max(pg.rachaMax || 0, pg.racha);
  pp.derrotas = (pp.derrotas || 0) + 1;
  pp.racha = 0;
  const logrosG = revisarLogros(pg), logrosP = revisarLogros(pp);
  guardar(pg); guardar(pp);
  FICHAS.delete(ganador); FICHAS.delete(perdedor);
  guardarDuelos();
  botDice(`⚔ ${ganador} vence a ${perdedor} en ${juego} · ¡FLIPA!`);
  nov('⚔', `${ganador} vence a ${perdedor} en ${juego}`);
  if (pg.racha >= 3) botDice(`🔥 ${ganador} lleva ${pg.racha} victorias seguidas · ¿quién le para?`);
  logrosG.forEach(l => botDice(`🏅 ${ganador} desbloquea «${l.nombre}»`));
  logrosP.forEach(l => botDice(`🏅 ${perdedor} desbloquea «${l.nombre}»`));
}

/* ---------- qué núcleo funciona con cada arcade (lo aprende la sala sola) ---------- */
const ROMSTAT_F = path.join(DATA, 'romstat.json');
let ROMSTAT = {};                    // rom -> { core, ok, ts }
try { ROMSTAT = JSON.parse(fs.readFileSync(ROMSTAT_F, 'utf8')); } catch (e) {}
let romstatSucio = false;
setInterval(() => {
  if (!romstatSucio) return;
  romstatSucio = false;
  try { fs.writeFileSync(ROMSTAT_F, JSON.stringify(ROMSTAT)); } catch (e) {}
}, 10000);

/* ---------- avatares: los guapos se ganan jugando ---------- */
const AVATARES = {
  '👾': null, '🕹️': null, '🎮': null, '🐍': null, '🤖': null, '😎': null,
  '🍄': 'veinte_j', '🥷': 'noctambulo', '💀': 'cincuenta', '🔥': 'red10',
  '⚡': 'maraton', '🏆': 'cincuenta_j', '🐉': 'todos_sys', '👑': { plays: 120 },
};
function puedeAvatar(p, av) {
  if (!(av in AVATARES)) return false;
  const req = AVATARES[av];
  if (!req) return true;
  if (typeof req === 'string') return (p.logros || []).includes(req);
  if (req.plays) return (p.plays || 0) >= req.plays;
  return false;
}

/* ---------- invitaciones: 5 por usuario, guardadas en disco ---------- */
const INVITES_F = path.join(DATA, 'invites.json');
let INVITES = {};                      // code -> { de, ts, usado: null | {por, ts} }
try { INVITES = JSON.parse(fs.readFileSync(INVITES_F, 'utf8')); } catch (e) {}
const MAX_INVITAS = 5;
function guardarInvites() { try { fs.writeFileSync(INVITES_F, JSON.stringify(INVITES)); } catch (e) {} }
function misInvitas(user) { return Object.entries(INVITES).filter(([, i]) => i.de === user); }

function altaNginx(hash, nombre, cb) {
  execFile('sudo', ['/usr/local/sbin/sala200-alta', hash, nombre], { timeout: 10000 }, cb);
}

function usuarioDe(req) {
  const c = req.headers.cookie || '';
  const m = c.match(/sala200=([a-f0-9]{64})/);
  return m ? (USERS[m[1]] || null) : null;
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  // ---- el registro por invitación ocurre ANTES de tener sesión ----
  if (req.method === 'GET' && url.pathname === '/registro-info') {
    const inv = INVITES[String(url.searchParams.get('code') || '')];
    if (!inv) return json(res, 200, { valida: false });
    return json(res, 200, { valida: !inv.usado, de: inv.de, usado: !!inv.usado });
  }
  if (req.method === 'POST' && url.pathname === '/registro') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 2000) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const code = String(e.code || '');
      const u = String(e.user || '').trim().toLowerCase();
      const p = String(e.pass || '');
      const inv = INVITES[code];
      if (!inv || inv.usado) return json(res, 400, { error: 'invitacion' });
      if (!/^[a-z0-9_-]{3,16}$/.test(u)) return json(res, 400, { error: 'usuario' });
      if (p.length < 4) return json(res, 400, { error: 'clave' });
      const ocupado = Object.values(USERS).some(n => String(n).toLowerCase() === u);
      if (ocupado) return json(res, 409, { error: 'ocupado' });
      const hash = crypto.createHash('sha256').update(`${u}:${p}:${SALT}`).digest('hex');
      altaNginx(hash, u, (err) => {
        if (err) { console.error('alta nginx fallo:', err.message); return json(res, 500, { error: 'nginx' }); }
        USERS[hash] = u;
        try { fs.writeFileSync('/opt/sala200-api/users.json', JSON.stringify(USERS, null, 2)); } catch (e2) {}
        inv.usado = { por: u, ts: Date.now() };
        guardarInvites();
        console.log('alta por invitacion:', u, '(invitado por', inv.de + ')');
        botDice(`🎟 ${u} entra en la sala, invitado por ${inv.de} · dadle candela`);
        nov('🎟', `${u} se hace socio (invitado por ${inv.de})`);
        json(res, 200, { ok: true });
      });
    });
    return;
  }

  const user = usuarioDe(req);
  if (!user) return json(res, 401, { error: 'sin sesión' });

  // ---- declarar el resultado de un duelo (confirmación cruzada) ----
  if (req.method === 'POST' && url.pathname === '/duelo') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 800) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const rival = String(e.rival || '').toLowerCase().slice(0, 16);
      const juego = String(e.juego || '?').slice(0, 60);
      const digo = e.resultado === 'gane' ? 'gane' : 'pierdo';
      if (!rival || rival === user) return json(res, 400, { error: 'rival' });
      for (const k in DUELOS.pendientes)
        if (Date.now() - DUELOS.pendientes[k].ts > 300000) delete DUELOS.pendientes[k];
      const clave = [user, rival].sort().join('|') + '|' + juego;
      const pend = DUELOS.pendientes[clave];
      if (pend && pend.de === rival) {
        // el rival ya declaró: ¿casan las versiones? (uno gana, el otro pierde)
        delete DUELOS.pendientes[clave];
        const casan = (pend.resultado === 'gane' && digo === 'pierdo') ||
                      (pend.resultado === 'pierdo' && digo === 'gane');
        if (casan) {
          const gana = pend.resultado === 'gane' ? rival : user;
          const pierde = gana === user ? rival : user;
          registrarDuelo(gana, pierde, juego);
          return json(res, 200, { ok: true, registrado: true });
        }
        guardarDuelos();
        return json(res, 200, { ok: true, registrado: false });
      }
      DUELOS.pendientes[clave] = { de: user, resultado: digo, ts: Date.now() };
      guardarDuelos();
      json(res, 200, { ok: true, pendiente: true });
    });
    return;
  }

  // ---- editar mi ficha (frase de guerra, país, juego de cabecera, avatar) ----
  if (req.method === 'POST' && url.pathname === '/perfil') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 2000) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const p = leer(user);
      if (typeof e.frase === 'string') p.frase = e.frase.trim().slice(0, 80);
      if (typeof e.pais === 'string') p.pais = e.pais.trim().slice(0, 24);
      if (typeof e.favorito === 'string') p.favorito = e.favorito.trim().slice(0, 40);
      if (typeof e.avatar === 'string') {
        if (e.avatar === '') p.avatar = '';
        else if (puedeAvatar(p, e.avatar)) p.avatar = e.avatar;
        else return json(res, 403, { error: 'bloqueado' });
      }
      guardar(p);
      FICHAS.delete(user);              // que el avatar nuevo se vea al momento
      json(res, 200, { ok: true, perfil: p });
    });
    return;
  }
  // ---- buzón de novedades del club (+ tus menciones del chat) ----
  if (req.method === 'GET' && url.pathname === '/novedades') {
    const rx = new RegExp('(^|\\W)@' + user + '($|\\W)', 'i');
    const menciones = CHAT.filter(m => m.user !== user && rx.test(m.texto || ''))
      .slice(-10).map(m => ({ id: 'm' + m.id, ico: '📣', ts: m.ts,
                              texto: `${m.user}: ${m.texto.slice(0, 90)}` }));
    const todo = NOVEDADES.concat(menciones).sort((a, b) => b.ts - a.ts).slice(0, 40);
    return json(res, 200, { novedades: todo, ahora: Date.now() });
  }

  // ---- recomendar un juego a otro socio (va a su buzón y a sus favoritos) ----
  if (req.method === 'POST' && url.pathname === '/recomendar') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 1500) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const para = String(e.para || '').toLowerCase().slice(0, 16);
      const juego = String(e.juego || '').slice(0, 80);
      const rom = String(e.rom || '').slice(0, 200);
      const sis = String(e.sys || '').slice(0, 16);
      const existe = Object.values(USERS).some(n => String(n).toLowerCase() === para);
      if (!existe || !rom) return json(res, 400, { error: 'destino' });
      const p = leer(para);
      p.recomendados = (p.recomendados || []).filter(r => r.rom !== rom);
      p.recomendados.unshift({ de: user, juego, rom, sys: sis, ts: Date.now() });
      p.recomendados = p.recomendados.slice(0, 30);
      guardar(p);
      nov('🎁', `${user} le recomienda ${juego} a ${para}`);
      botDice(`🎁 ${user} le pasa «${juego}» a ${para}`);
      json(res, 200, { ok: true });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/recomendados') {
    const p = leer(user);
    return json(res, 200, { recomendados: p.recomendados || [] });
  }
  if (req.method === 'POST' && url.pathname === '/recomendados/visto') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 800) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const p = leer(user);
      p.recomendados = (p.recomendados || []).filter(r => r.rom !== String(e.rom || ''));
      guardar(p);
      json(res, 200, { ok: true });
    });
    return;
  }

  // ---- qué núcleo va bien con cada juego (lo reportan los jugadores) ----
  if (req.method === 'GET' && url.pathname === '/romstat') {
    const r = String(url.searchParams.get('rom') || '');
    if (r) return json(res, 200, { rom: r, dato: ROMSTAT[r] || null });
    const rotos = Object.entries(ROMSTAT).filter(([, v]) => v && v.ok === false).map(([k]) => k);
    const buenos = {};
    Object.entries(ROMSTAT).forEach(([k, v]) => { if (v && v.ok) buenos[k] = v.core; });
    return json(res, 200, { rotos, buenos });
  }
  if (req.method === 'POST' && url.pathname === '/romstat') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 1500) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const r = String(e.rom || '').slice(0, 200);
      if (!r) return json(res, 400, { error: 'rom' });
      const prev = ROMSTAT[r];
      // un "funciona" pesa más que un "falla": si alguien lo hizo arrancar, vale
      if (e.ok || !prev || !prev.ok) {
        ROMSTAT[r] = { core: String(e.core || '').slice(0, 24), ok: !!e.ok, ts: Date.now() };
        romstatSucio = true;
      }
      json(res, 200, { ok: true });
    });
    return;
  }

  // ---- la ficha de OTRO socio, para cotillear (solo lectura) ----
  if (req.method === 'GET' && url.pathname === '/ficha') {
    const u = String(url.searchParams.get('u') || '').toLowerCase();
    const existe = Object.values(USERS).some(n => String(n).toLowerCase() === u);
    if (!existe) return json(res, 404, { error: 'quien' });
    const pf = leer(u);
    const pres = PRESENCIA.get(u);
    const ahora = (pres && Date.now() - pres.ts < VENTANA)
      ? { donde: pres.donde, juego: pres.juego, sys: pres.sys, sala: !!pres.sala } : null;
    return json(res, 200, { user: u, nivel: nivel(pf), perfil: pf, catalogo: LOGROS, ahora });
  }

  if (req.method === 'GET' && url.pathname === '/avatares') {
    const p = leer(user);
    const lista = Object.entries(AVATARES).map(([av, r]) => ({
      av, libre: puedeAvatar(p, av),
      req: typeof r === 'string' ? r : (r && r.plays ? 'plays:' + r.plays : null),
    }));
    return json(res, 200, { avatares: lista, actual: p.avatar || '' });
  }

  // ---- mis invitaciones ----
  if (req.method === 'GET' && url.pathname === '/invitas') {
    const mias = misInvitas(user).map(([code, i]) => ({ code, usado: i.usado ? i.usado.por : null, ts: i.ts }));
    return json(res, 200, { invitas: mias, quedan: Math.max(0, MAX_INVITAS - mias.length) });
  }
  if (req.method === 'POST' && url.pathname === '/invita') {
    if (misInvitas(user).length >= MAX_INVITAS) return json(res, 403, { error: 'sin invitaciones' });
    const code = crypto.randomBytes(5).toString('hex');
    INVITES[code] = { de: user, ts: Date.now(), usado: null };
    guardarInvites();
    return json(res, 200, { code, quedan: MAX_INVITAS - misInvitas(user).length });
  }

  // el cliente avisa cada poco de que sigue ahí y de qué está haciendo
  if (req.method === 'POST' && url.pathname === '/ping') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 4000) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const anterior = PRESENCIA.get(user);
      if (!anterior || Date.now() - anterior.ts > 1800000) nov('🚪', `${user} entra en la sala`);
      PRESENCIA.set(user, { ts: Date.now(), donde: e.donde || 'sala',
                            dev: e.dev === 'movil' ? 'movil' : 'pc',
                            juego: (e.juego || '').slice(0, 60), sys: e.sys || '',
                            rom: (e.rom || '').slice(0, 300), sala: !!e.sala });
      json(res, 200, { ok: true });
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/online') {
    const ahora = Date.now();
    const lista = [];
    for (const [u, p] of PRESENCIA) {
      if (ahora - p.ts > VENTANA) { PRESENCIA.delete(u); continue; }
      const fi = fichaDe(u);
      lista.push({ user: u, donde: p.donde, juego: p.juego, sys: p.sys, rom: p.rom, dev: p.dev || 'pc',
                   sala: p.sala, yo: u === user, hace: Math.round((ahora - p.ts) / 1000),
                   nv: fi.nv, lg: fi.lg, av: fi.av });
    }
    lista.sort((a, b) => (a.yo ? -1 : b.yo ? 1 : a.user.localeCompare(b.user)));
    return json(res, 200, { online: lista });
  }

  // enviar mensaje al chat
  if (req.method === 'POST' && url.pathname === '/chat') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 4000) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const texto = String(e.texto || '').trim().slice(0, 240);
      if (texto) {
        CHAT.push({ id: Date.now() + Math.random(), user, texto, ts: Date.now() });
        while (CHAT.length > CHAT_MAX) CHAT.shift();
      }
      json(res, 200, { ok: true });
    });
    return;
  }

  // leer mensajes (opcionalmente solo los posteriores a ?desde=)
  if (req.method === 'GET' && url.pathname === '/chat') {
    const desde = parseFloat(url.searchParams.get('desde') || '0');
    const msgs = CHAT.filter(m => m.ts > desde).slice(-60);
    return json(res, 200, { chat: msgs, ahora: Date.now() });
  }

  // ---- distribución del mando, guardada en el perfil (te sigue a cualquier aparato) ----
  if (req.method === 'GET' && url.pathname === '/padlayout') {
    const p = leer(user);
    return json(res, 200, { layout: p.padlayout || {} });
  }
  if (req.method === 'POST' && url.pathname === '/padlayout') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 20000) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const p = leer(user);
      p.padlayout = p.padlayout || {};
      if (e.clave && typeof e.pos === 'object') p.padlayout[String(e.clave).slice(0, 40)] = e.pos;
      if (e.borrar) p.padlayout = {};
      guardar(p);
      json(res, 200, { ok: true, layout: p.padlayout });
    });
    return;
  }

  // ---- partidas guardadas solas ----
  if (url.pathname === '/estado') {
    const clave = String(url.searchParams.get('j') || '').replace(/[^a-z0-9_.:-]/gi, '_').slice(0, 80);
    if (!clave) return json(res, 400, { error: 'sin juego' });
    const fichero = path.join(carpetaEstados(user), clave + '.state');

    if (req.method === 'GET') {
      if (url.searchParams.get('info')) {
        try {
          const st = fs.statSync(fichero);
          return json(res, 200, { hay: true, bytes: st.size, cuando: Math.round(st.mtimeMs) });
        } catch (e) { return json(res, 200, { hay: false }); }
      }
      try {
        const b = fs.readFileSync(fichero);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': b.length,
                             'Cache-Control': 'no-store' });
        return res.end(b);
      } catch (e) { return json(res, 404, { hay: false }); }
    }

    if (req.method === 'POST') {
      if (url.searchParams.get('borrar')) {
        try { fs.unlinkSync(fichero); } catch (e) {}
        return json(res, 200, { ok: true, borrado: true });
      }
      const trozos = [];
      let total = 0, roto = false;
      req.on('data', d => {
        total += d.length;
        if (total > MAX_ESTADO) { roto = true; req.destroy(); return; }
        trozos.push(d);
      });
      req.on('end', () => {
        if (roto || !total) return json(res, 413, { error: 'demasiado grande o vacio' });
        try {
          const tmp = fichero + '.tmp';
          fs.writeFileSync(tmp, Buffer.concat(trozos));
          fs.renameSync(tmp, fichero);            // atomico: nunca queda a medias
          limpiarViejos(path.dirname(fichero));
          json(res, 200, { ok: true, bytes: total });
        } catch (e) { json(res, 500, { error: String(e.message).slice(0, 80) }); }
      });
      req.on('error', () => {});
      return;
    }
  }

  // ---- toques a la puerta para jugar a dobles ----
  if (req.method === 'POST' && url.pathname === '/llamada') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 800) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const para = String(e.para || '').slice(0, 40);
      if (para) {
        const i = LLAMADAS.findIndex(l => l.para === para && l.de === user);
        const nueva = { para, de: user, juego: String(e.juego || '').slice(0, 60), ts: Date.now() };
        if (i >= 0) LLAMADAS[i] = nueva; else LLAMADAS.push(nueva);
        while (LLAMADAS.length > 40) LLAMADAS.shift();
      }
      json(res, 200, { ok: true });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/llamada') {
    const ahora = Date.now();
    for (let i = LLAMADAS.length - 1; i >= 0; i--)
      if (ahora - LLAMADAS[i].ts > LLAMADA_VIDA) LLAMADAS.splice(i, 1);
    const mias = LLAMADAS.filter(l => l.para === user);
    return json(res, 200, { llamadas: mias, ahora });
  }

  // ---- posiciones de la sala 3D ----
  if (req.method === 'POST' && url.pathname === '/pos') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 800) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const n = (v, t) => { const x = parseFloat(v); return isFinite(x) ? Math.max(-t, Math.min(t, x)) : 0; };
      SALA3D.set(user, { x: n(e.x, 40), z: n(e.z, 200), ry: n(e.ry, 7),
                         dev: e.dev === 'movil' ? 'movil' : 'pc',
                         anim: String(e.anim || '').slice(0, 10),
                         mode: String(e.mode || 'lobby').slice(0, 20), ts: Date.now() });
      json(res, 200, { ok: true });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/pos') {
    const ahora = Date.now();
    const gente = [];
    for (const [u, p] of SALA3D) {
      if (ahora - p.ts > VIDA3D) { SALA3D.delete(u); continue; }
      if (u === user) continue;
      const fg = fichaDe(u);
      gente.push({ user: u, x: p.x, z: p.z, ry: p.ry, anim: p.anim, mode: p.mode, dev: p.dev || 'pc',
                   nv: fg.nv, lg: fg.lg });
    }
    // quien está dentro de una partida: no anda por la sala, pero queremos verlo en su puerta
    const jugando = [];
    for (const [u, p] of PRESENCIA) {
      if (u === user || ahora - p.ts > VENTANA) continue;
      if (p.donde === 'juego') { const fj = fichaDe(u);
        jugando.push({ user: u, sys: p.sys || '', juego: p.juego || '',
                       sala: !!p.sala, dev: p.dev || 'pc', nv: fj.nv, lg: fj.lg }); }
    }
    // los mensajes recientes, para que salgan como bocadillo sobre la cabeza
    const burbujas = CHAT.filter(m => m.ts > ahora - 9000)
                         .map(m => ({ user: m.user, texto: m.texto, ts: m.ts }));
    return json(res, 200, { gente, jugando, burbujas, ahora });
  }

  // ---- notas de voz ----
  if (req.method === 'POST' && url.pathname === '/audio') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 900000) req.destroy(); });   // ~900 KB tope
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      if (e.data) {
        AUDIOS.push({ id: Date.now() + Math.random(), user, ts: Date.now(),
                      sala: String(e.sala || '').slice(0, 60),
                      mime: String(e.mime || 'audio/webm').slice(0, 40),
                      dur: Math.min(parseFloat(e.dur) || 0, 15),
                      data: String(e.data).slice(0, 1200000) });
        while (AUDIOS.length > AUDIO_MAX) AUDIOS.shift();
      }
      json(res, 200, { ok: true });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/audio') {
    const desde = parseFloat(url.searchParams.get('desde') || '0');
    const corte = Date.now() - AUDIO_VIDA;
    while (AUDIOS.length && AUDIOS[0].ts < corte) AUDIOS.shift();
    const sala = String(url.searchParams.get('sala') || '');
    // sin sala no hay rival: no se reparte nada
    const lista = sala ? AUDIOS.filter(a => a.ts > Math.max(desde, corte) && a.sala === sala) : [];
    return json(res, 200, { audios: lista, ahora: Date.now() });
  }

  // ---- emojis voladores ----
  if (req.method === 'POST' && url.pathname === '/emoji') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 2000) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const emoji = String(e.emoji || '').slice(0, 8);
      if (emoji) {
        EMOJIS.push({ id: Date.now() + Math.random(), user, emoji, sala: String(e.sala || '').slice(0, 60),
                      juego: String(e.juego || '').slice(0, 60), ts: Date.now() });
        while (EMOJIS.length > EMOJI_MAX) EMOJIS.shift();
      }
      json(res, 200, { ok: true });
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/emoji') {
    const desde = parseFloat(url.searchParams.get('desde') || '0');
    const corte = Date.now() - 25000;                       // nada más viejo de 25 s
    const sala = String(url.searchParams.get('sala') || '');
    const lista = sala ? EMOJIS.filter(m => m.ts > Math.max(desde, corte) && m.sala === sala) : [];
    return json(res, 200, { emojis: lista, ahora: Date.now() });
  }

  if (req.method === 'GET' && url.pathname === '/me') {
    const p = leer(user);
    return json(res, 200, { user, nivel: nivel(p), perfil: p, catalogo: LOGROS });
  }

  if (req.method === 'POST' && url.pathname === '/event') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      let e = {};
      try { e = JSON.parse(body || '{}'); } catch {}
      const p = leer(user);
      const nvAntes = nivelIdx(p.plays || 0);
      const ahora = new Date();
      const hoy = ahora.toISOString().slice(0, 10);

      if (e.tipo === 'crash') {
        console.log('CRASH de', user, '·', e.sys, e.juego, '·', e.donde, '·', e.msg, '·', e.ua);
        return json(res, 200, { ok: true });
      }
      if (e.tipo === 'play' && e.juego) {
        p.plays++;
        p.sys[e.sys] = (p.sys[e.sys] || 0) + 1;
        if (!p.juegos[e.juego]) { p.juegos[e.juego] = 0; p.uniq++; }
        p.juegos[e.juego]++;
        p.recientes = [{ juego: e.juego, sys: e.sys, path: e.path || '', ts: Date.now() }]
          .concat(p.recientes.filter(r => r.juego !== e.juego)).slice(0, 12);
        if (!p.dias.includes(hoy)) p.dias.push(hoy);
        const h = ahora.getHours();
        if (h >= 3 && h < 6) p.flags.noche = true;
        if (h < 8) p.flags.pronto = true;
        if (e.netplay) p.netplay = (p.netplay || 0) + 1;
      }
      if (e.tipo === 'tiempo' && e.seg) {
        p.minutos = Math.round((p.minutos || 0) + e.seg / 60);
        if (e.seg > (p.longest || 0)) p.longest = e.seg;
      }
      if (e.tipo === 'favs' && typeof e.n === 'number') p.favs = e.n;
      if (e.tipo === 'netplay') p.netplay = (p.netplay || 0) + 1;

      const nuevos = revisarLogros(p);
      guardar(p);
      FICHAS.delete(user);              // que el nivel nuevo se vea enseguida
      // la voz de la casa
      nuevos.forEach(l => { botDice(`🏅 ${user} desbloquea «${l.nombre}»`); nov('🏅', `${user} desbloquea «${l.nombre}»`); });
      const nvAhora = nivelIdx(p.plays || 0);
      if (nvAhora > nvAntes) { botDice(`👑 ${user} asciende a ${NIVELES[nvAhora][1]}`); nov('👑', `${user} asciende a ${NIVELES[nvAhora][1]}`); }
      if (e.tipo === 'play' && e.juego) nov('🎮', `${user} se pone a jugar a ${String(e.juego).slice(0, 40)}`);
      json(res, 200, { ok: true, nuevos, nivel: nivel(p), perfil: p });
    });
    return;
  }

  // ranking simple de la sala (quién juega más)
  if (req.method === 'GET' && url.pathname === '/ranking') {
    const dir = path.join(DATA, 'profiles');
    const lista = fs.readdirSync(dir).map(f => {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        let nv = 0;
        for (let i = 0; i < NIVELES.length; i++) if ((p.plays || 0) >= NIVELES[i][0]) nv = i;
        const top = Object.entries(p.juegos || {}).sort((x, y) => y[1] - x[1])[0];
        return { user: p.user, plays: p.plays || 0, logros: (p.logros || []).length,
                 uniq: p.uniq || 0, minutos: p.minutos || 0, netplay: p.netplay || 0,
                 nv, nivel: NIVELES[nv][1], avatar: p.avatar || '', frase: p.frase || '',
                 pais: p.pais || '', favorito: p.favorito || '', top: top ? top[0] : '' };
      } catch { return null; }
    }).filter(Boolean).sort((a, b) => b.plays - a.plays);
    return json(res, 200, { ranking: lista });
  }

  json(res, 404, { error: 'no existe' });
}).listen(PORT, '127.0.0.1', () => console.log('SALA 200 API en', PORT));
