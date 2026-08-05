/* SALA 200 — salón recreativo clandestino */
gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= idiomas ================= */
const STR = {
  es: {
    coin: 'INSERT COIN', click: '▶ CLIC PARA METER LA MONEDA ◀', boot: 'SALA 200 BIOS v8',
    search: 'BUSCAR JUEGO_', all: 'TODO', fav: '★ FAVORITOS', recent: 'RECIENTES', random: '🎲 AL AZAR',
    nuevos: '✨ NOVEDADES',
    ajustes: 'AJUSTES', si: 'SÍ', no: 'NO',
    aAuto: '🔁 Autoguardado', aAutoS: 'seguir donde lo dejaste',
    aSuave: '🖼 Suavizado', aSuaveS: 'imagen suave o pixelada',
    aFuego: '🔥 Hadouken', aFuegoS: 'llamas al cuarto de círculo',
    aDesp: '☀️ No bloquear', aDespS: 'que el móvil no se duerma',
    aMus: '♪ Música', aMusS: 'la sintonía de la sala',
    aSalir: '🚪 CERRAR SESIÓN',
    scroll: '▼ O BAJA A LA SALA ▼',
    hintMove: 'WASD MOVER · ESPACIO SALTAR (x2) · Q BAILAR · F GOLPEAR · MAYÚS CORRER · ENTER ENTRAR',
    hintPad: 'MANDO: STICK MOVER · ✕ SALTAR · △ BAILAR · ▢ GOLPEAR · L1 CORRER · ○ ENTRAR',
    count: (n) => `${n} PARTIDAS DISPONIBLES // CRÉDITOS: ∞`,
    marquee: (n) => ` INSERT COIN — <b>SALA 200</b> — ${n} JUEGOS — SIN ÁNIMO DE LUCRO — EST. 2026 —`,
    play: 'JUGAR', enter: 'ENTRAR A', exit: 'SALIR', key: 'ENTER',
    hallSome: (a, b) => `${a} DE ${b} JUEGOS FLOTANDO · EL RESTO EN LA BIBLIOTECA`,
    hallAll: (n) => `${n} JUEGOS · ACÉRCATE Y PULSA ENTER · ESC PARA SALIR`,
    noFav: 'AÚN NO HAY FAVORITOS · PULSA LA ESTRELLA EN CUALQUIER JUEGO',
    noRecent: 'AÚN NO HAS JUGADO A NADA',
    back: '◄ SALA 200', hint: 'MANDO AL MAC · F = PANTALLA COMPLETA',
  },
  en: {
    coin: 'INSERT COIN', click: '▶ CLICK TO INSERT COIN ◀', boot: 'SALA 200 BIOS v8',
    search: 'SEARCH GAME_', all: 'ALL', fav: '★ FAVOURITES', recent: 'RECENT', random: '🎲 RANDOM',
    nuevos: '✨ NEW ARRIVALS',
    ajustes: 'SETTINGS', si: 'YES', no: 'NO',
    aAuto: '🔁 Autosave', aAutoS: 'resume where you left off',
    aSuave: '🖼 Smoothing', aSuaveS: 'smooth or pixelated image',
    aFuego: '🔥 Hadouken', aFuegoS: 'quarter-circle flames',
    aDesp: '☀️ Keep awake', aDespS: "don't let the phone sleep",
    aMus: '♪ Music', aMusS: 'the arcade tune',
    aSalir: '🚪 LOG OUT',
    scroll: '▼ OR SCROLL TO THE FLOOR ▼',
    hintMove: 'WASD MOVE · SPACE JUMP (x2) · Q DANCE · F PUNCH · SHIFT RUN · ENTER GO IN',
    hintPad: 'PAD: STICK MOVE · ✕ JUMP · △ DANCE · ▢ PUNCH · L1 RUN · ○ ENTER',
    count: (n) => `${n} GAMES AVAILABLE // CREDITS: ∞`,
    marquee: (n) => ` INSERT COIN — <b>SALA 200</b> — ${n} GAMES — NON-PROFIT — EST. 2026 —`,
    play: 'PLAY', enter: 'ENTER', exit: 'EXIT', key: 'ENTER',
    hallSome: (a, b) => `${a} OF ${b} GAMES FLOATING · REST IN THE LIBRARY`,
    hallAll: (n) => `${n} GAMES · WALK UP AND PRESS ENTER · ESC TO LEAVE`,
    noFav: 'NO FAVOURITES YET · HIT THE STAR ON ANY GAME',
    noRecent: 'YOU HAVEN\'T PLAYED ANYTHING YET',
    back: '◄ SALA 200', hint: 'GAMEPAD TO YOUR MAC · F = FULLSCREEN',
  }
};
let LANG = localStorage.getItem('sala_lang') || (navigator.language || 'es').slice(0, 2);
if (!STR[LANG]) LANG = 'es';
window.SALA_T = (k) => STR[LANG][k];
window.SALA_LANG = () => LANG;

function applyLang() {
  const t = STR[LANG];
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v;
  });
  const q = document.getElementById('q'); if (q) q.placeholder = t.search;
  ['langBtn', 'langBtn2'].forEach(id => {
    const lb = document.getElementById(id); if (lb) lb.textContent = LANG === 'es' ? '🌐 ES' : '🌐 EN';
  });
  if (window.SALA_GAMES) { rebuildTabs(); render(); buildMarquee(window.SALA_GAMES.length); }
  dispatchEvent(new Event('sala:lang'));
}

/* ================= Lenis ================= */
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
window.SALA_LENIS = lenis;   // el perfil lo congela mientras está abierto (la rueda era suya)
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

/* ================= fondo WebGL ================= */
(function bg() {
  const canvas = document.getElementById('bg');
  const gl = canvas.getContext('webgl');
  if (!gl) return;
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `
precision highp float;
uniform float t; uniform vec2 res; uniform vec2 mouse; uniform float amber;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 uv = gl_FragCoord.xy/res;
  vec2 m = (mouse-.5)*.06;
  float horizon = .40 + m.y*.4;
  vec3 col = vec3(0.);
  vec3 c1 = mix(vec3(.10,1.,.42), vec3(1.,.68,.12), amber);
  vec3 c2 = mix(vec3(.25,1.,.85), vec3(1.,.85,.45), amber);
  if(uv.y < horizon){
    float py = (horizon-uv.y)+.001;
    float pz = 1./(py*3.2);
    float gx = (uv.x-.5+m.x)*pz*5.;
    float gz = pz*1.6 + t*1.1;
    float lx = smoothstep(.93,1.,abs(fract(gx)-.5)*2.);
    float lz = smoothstep(.93,1.,abs(fract(gz)-.5)*2.);
    col += c1*clamp(lx+lz,0.,1.)*max(0.,1.-py*1.9)*.85;
    col += vec3(.0,.16,.08)*max(0.,1.-py*2.2);
  } else {
    vec2 sp = floor((uv+vec2(t*.003,0.))*vec2(190.,110.));
    float s = step(.9965,hash(sp));
    col += c2*s*(.4+.6*hash(sp+1.7));
  }
  float d = abs(uv.y-horizon);
  col += c1*exp(-d*34.)*.85 + c2*exp(-d*170.)*.9;
  gl_FragColor = vec4(col*smoothstep(1.15,.3,length(uv-.5)),1.);
}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, 't'), uR = gl.getUniformLocation(prog, 'res'),
        uM = gl.getUniformLocation(prog, 'mouse'), uA = gl.getUniformLocation(prog, 'amber');
  let mx = .5, my = .5, smx = .5, smy = .5;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight; });
  function size() {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  size(); addEventListener('resize', size);
  (function loop(ts) {
    smx += (mx - smx) * .05; smy += (my - smy) * .05;
    gl.uniform1f(uT, reduced ? 0 : ts * 0.001);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform2f(uM, smx, smy);
    gl.uniform1f(uA, document.body.classList.contains('amber') ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(loop);
  })(0);
})();

/* ================= cursor ================= */
const cur = document.querySelector('.cursor'), dot = document.querySelector('.cursor-dot');
let cmx = innerWidth / 2, cmy = innerHeight / 2, ccx = cmx, ccy = cmy;
addEventListener('pointermove', e => { cmx = e.clientX; cmy = e.clientY; gsap.set(dot, { x: cmx, y: cmy }); });
gsap.ticker.add(() => { ccx += (cmx - ccx) * .16; ccy += (cmy - ccy) * .16; gsap.set(cur, { x: ccx, y: ccy }); });
function bindCursor(scope) {
  (scope || document).querySelectorAll('a,button,input').forEach(el => {
    if (el._c) return; el._c = 1;
    el.addEventListener('pointerenter', () => gsap.to(cur, { scale: 2.1, rotate: 45, duration: .3 }));
    el.addEventListener('pointerleave', () => gsap.to(cur, { scale: 1, rotate: 0, duration: .3 }));
  });
}
bindCursor();
document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .35, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4 });
  });
  el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.3)' }));
});

/* ================= audio ================= */
let AC = null, master = null, musicOn = true;
try { musicOn = localStorage.getItem('sala_music') !== '0'; } catch (e) {}
function coinBlip() {
  const t = AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(1980, t); o.frequency.setValueAtTime(2640, t + .07);
  g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.0001, t + .35);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .4);
}
function startMusic() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = .11; master.connect(AC.destination);
  coinBlip();
  const df = AC.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 240; df.connect(master);
  [55, 55.6, 82.4].forEach(f => {
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const g = AC.createGain(); g.gain.value = .045; o.connect(g); g.connect(df); o.start();
  });
  const lfo = AC.createOscillator(); lfo.frequency.value = .07;
  const lg = AC.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(df.frequency); lfo.start();
  const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = AC.createBufferSource(); ns.buffer = nb; ns.loop = true;
  const nf = AC.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 700; nf.Q.value = .6;
  const ng = AC.createGain(); ng.gain.value = .012;
  ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start();
  const dl = AC.createDelay(); dl.delayTime.value = .42;
  const fb = AC.createGain(); fb.gain.value = .38;
  dl.connect(fb); fb.connect(dl); dl.connect(master);
  const seq = [110, 130.81, 164.81, 220, 164.81, 116.54];
  let step = 0;
  setInterval(() => {
    if (!musicOn) return;
    const t = AC.currentTime, f = seq[step % seq.length] * 2;
    const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = AC.createGain();
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.055, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + .55);
    o.connect(g); g.connect(master); g.connect(dl);
    o.start(t); o.stop(t + .6); step++;
  }, 340);
  setInterval(() => {
    if (!musicOn || Math.random() < .45) return;
    const t = AC.currentTime;
    [311.13, 466.16].forEach((f, i) => {
      const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = AC.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05 - i * .02, t + .05);
      g.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 3.4);
    });
  }, 9000);
}
function blip(freqs, dur, type, vol) {
  if (!AC || !musicOn) return;
  const t0 = AC.currentTime, step = dur / freqs.length;
  freqs.forEach((f, i) => {
    const o = AC.createOscillator(), g = AC.createGain(), t = t0 + i * step;
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || .05, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + step);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + step + .02);
  });
}
addEventListener('sala:sfx', e => {
  if (e.detail === 'hover') blip([1320], .09, 'square', .035);
  else if (e.detail === 'door') blip([660, 990], .16, 'triangle', .05);
  else if (e.detail === 'enter') blip([523, 659, 784, 1046], .42, 'square', .06);
  else if (e.detail === 'fav') blip([880, 1320, 1760], .2, 'triangle', .06);
  else if (e.detail === 'logro') blip([784, 988, 1175, 1568], .6, 'square', .07);
  else if (e.detail === 'chat') blip([1046, 1318], .14, 'triangle', .05);
  else if (e.detail === 'mencion') blip([880, 1174, 1568, 2093], .38, 'triangle', .08);
  else if (e.detail === 'jump') blip([620, 900], .12, 'square', .045);
  else if (e.detail === 'jump2') blip([900, 1300], .12, 'square', .045);
  else if (e.detail === 'land') blip([180, 120], .1, 'triangle', .05);
  else if (e.detail === 'dance') blip([523, 659, 784, 659, 880], .55, 'square', .05);
  else if (e.detail === 'punch') blip([300, 140], .12, 'sawtooth', .05);
});
const muteBtn = document.getElementById('mute');
const musBtn = document.getElementById('musBtn');
function pintarMusica() {
  if (muteBtn) muteBtn.textContent = musicOn ? '♪ ON' : '♪ OFF';
  if (musBtn) {
    musBtn.textContent = musicOn ? '♪' : '🔇';
    musBtn.classList.toggle('off', !musicOn);
    musBtn.title = musicOn ? 'música: encendida' : 'música: apagada';
  }
}
function alternarMusica() {
  musicOn = !musicOn;
  try { localStorage.setItem('sala_music', musicOn ? '1' : '0'); } catch (e) {}
  if (master) gsap.to(master.gain, { value: musicOn ? .11 : 0, duration: .4 });
  pintarMusica();
}
[muteBtn, musBtn].forEach(b => { if (b) b.addEventListener('click', alternarMusica); });
pintarMusica();

/* ================= preloader ================= */
const pre = document.getElementById('preloader');
const count = pre.querySelector('.count');
const preClick = document.getElementById('preClick');
const flash = document.getElementById('crt-flash');
let n = { v: 0 };
gsap.to(n, {
  v: 100, duration: reduced ? 0.1 : 1.7, ease: 'power2.inOut',
  onUpdate: () => count.textContent = Math.round(n.v),
  onComplete: () => { preClick.style.visibility = 'visible'; }
});
pre.addEventListener('click', () => {
  if (n.v < 100) return;
  startMusic();
  gsap.to(pre, { opacity: 0, duration: .2, onComplete: () => pre.remove() });
  gsap.timeline()
    .set(flash, { scaleY: 0.004, opacity: 1 })
    .to(flash, { scaleX: 1, duration: .18, ease: 'power4.out' })
    .to(flash, { scaleY: 1, duration: .22, ease: 'power2.out' })
    .to(flash, { opacity: 0, duration: .5, ease: 'power2.out', onComplete: () => flash.remove() });
  dispatchEvent(new Event('sala:coin'));
  ScrollTrigger.refresh();
});

/* ================= favoritos y recientes ================= */
const KEY = (g) => `${g.sys}|${g.path}`;
let FAVS = JSON.parse(localStorage.getItem('sala_favs') || '[]');
let RECENT = JSON.parse(localStorage.getItem('sala_recent') || '[]');
window.SALA_ISFAV = (g) => FAVS.includes(KEY(g));
function toggleFav(g) {
  const k = KEY(g);
  const i = FAVS.indexOf(k);
  if (i >= 0) FAVS.splice(i, 1); else FAVS.push(k);
  localStorage.setItem('sala_favs', JSON.stringify(FAVS));
  if (window.SALA_PROFILE) window.SALA_PROFILE.evento({ tipo: 'favs', n: FAVS.length });
  dispatchEvent(new CustomEvent('sala:sfx', { detail: 'fav' }));
  rebuildTabs(); render();
}
/* un juego recomendado por un socio entra directo en tus favoritos */
window.SALA_FAV_ADD = (sysN, path) => {
  const k = `${sysN}|${path}`;
  if (FAVS.includes(k)) return false;
  FAVS.push(k);
  localStorage.setItem('sala_favs', JSON.stringify(FAVS));
  if (window.SALA_PROFILE) window.SALA_PROFILE.evento({ tipo: 'favs', n: FAVS.length });
  rebuildTabs(); render();
  return true;
};
window.SALA_PLAYED = (g) => {
  const k = KEY(g);
  RECENT = [k, ...RECENT.filter(x => x !== k)].slice(0, 24);
  localStorage.setItem('sala_recent', JSON.stringify(RECENT));
  if (window.SALA_PROFILE) window.SALA_PROFILE.evento({ tipo: 'play', juego: g.name, sys: g.sys, path: g.path });
};
window.SALA_SFX = (k) => dispatchEvent(new CustomEvent('sala:sfx', { detail: k }));

/* ================= cabecera plegable ================= */
(function cabecera() {
  const lib = document.querySelector('.library');
  const bar = document.querySelector('.lib-bar');
  const online = document.getElementById('onlineBar');
  if (!lib || !bar) return;
  const caja = document.createElement('div');
  caja.id = 'stickyTop';
  bar.parentNode.insertBefore(caja, bar);
  caja.appendChild(bar);
  if (online) caja.appendChild(online);

  const leng = document.createElement('button');
  leng.id = 'lengueta';
  leng.title = 'plegar / desplegar el menú';
  caja.appendChild(leng);

  const plegado = () => caja.classList.contains('plegado');
  function pintar() {
    leng.innerHTML = plegado() ? '▼' : '▲';
    leng.setAttribute('aria-label', plegado() ? 'desplegar menú' : 'plegar menú');
  }
  function alternar() {
    caja.classList.toggle('plegado');
    localStorage.setItem('sala_menu_plegado', plegado() ? '1' : '0');
    pintar();
  }
  leng.addEventListener('click', alternar);
  // tecla M o doble toque en la lengüeta
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'm' && !/input|textarea/i.test(document.activeElement.tagName)) alternar();
  });
  if (localStorage.getItem('sala_menu_plegado') === '1') caja.classList.add('plegado');
  pintar();

  // al escribir en el buscador nos aseguramos de que el menú esté desplegado
  const q = document.getElementById('q');
  if (q) q.addEventListener('focus', () => { if (plegado()) alternar(); });
})();

/* ================= biblioteca ================= */
let GAMES = [], sys = 'all';
const grid = document.getElementById('grid'), q = document.getElementById('q'), countEl = document.getElementById('count');
const SYS_LABEL = { snes: 'SNES', megadrive: 'MEGA DRIVE', neogeo: 'NEO GEO', arcade: 'ARCADE', nes: 'NES', gb: 'GAME BOY', gba: 'GBA', psx: 'PS1', n64: 'N64', sms: 'MASTER SYSTEM', gg: 'GAME GEAR' };

/* el catálogo cambia cada vez que entran juegos nuevos: nada de caché vieja
   (a Juan le faltaban 2000 arcade porque el navegador guardaba la lista antigua) */
fetch('games.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
  GAMES = d; window.SALA_GAMES = d;
  dispatchEvent(new Event('sala:games'));
  rebuildTabs(); render(); buildMarquee(d.length);
});

function destinoTabs() {
  const d = document.getElementById('dwTabs');
  return ((innerWidth <= 820 || matchMedia('(pointer: coarse)').matches) && d)
    ? d : document.querySelector('.lib-bar');
}
function rebuildTabs() {
  document.querySelectorAll('.tab[data-sys]').forEach(b => b.remove());
  const bar = destinoTabs();
  const mk = (key, label) => {
    const b = document.createElement('button');
    b.className = 'tab magnetic' + (sys === key ? ' on' : '');
    b.dataset.sys = key; b.textContent = label;
    b.addEventListener('click', () => { sys = key; rebuildTabs(); render(); });
    bar.appendChild(b); return b;
  };
  mk('all', STR[LANG].all);
  if (FAVS.length) mk('__fav', STR[LANG].fav);
  if (RECENT.length) mk('__recent', STR[LANG].recent);
  // lo recién llegado al catálogo (últimos 14 días) tiene su propia estantería
  if ((window.SALA_GAMES || []).some(g => g.ts && (Date.now() / 1000 - g.ts) < 14 * 86400))
    mk('__new', STR[LANG].nuevos);
  /* la chapita NEW, solo en la estantería que acaba de estrenarse de verdad
     (todo el catálogo tiene fecha de fichero reciente y salían falsos NEW) */
  setTimeout(() => document.querySelectorAll('.tab[data-sys]').forEach(b => {
    b.classList.toggle('nuevo-sys', b.dataset.sys === 'arcade');
  }), 0);
  [...new Set(GAMES.map(g => g.sys))].forEach(sn => mk(sn, SYS_LABEL[sn] || sn.toUpperCase()));
  bindCursor(bar);
}

function currentList() {
  const t = q.value.toLowerCase();
  let list;
  if (sys === '__fav') list = FAVS.map(k => GAMES.find(g => KEY(g) === k)).filter(Boolean);
  else if (sys === '__recent') list = RECENT.map(k => GAMES.find(g => KEY(g) === k)).filter(Boolean);
  else if (sys === '__new') list = GAMES.filter(g => g.ts && (Date.now() / 1000 - g.ts) < 14 * 86400)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  else list = GAMES.filter(g => sys === 'all' || g.sys === sys);
  return list.filter(g => g.name.toLowerCase().includes(t));
}

/* pintado por tandas: en móvil el DOM se satura si metemos 600 tarjetas de golpe */
/* "móvil" = pantalla pequeña O táctil: un teléfono en horizontal pasa de 820px
   y se colaba por la puerta del escritorio (cajón y navegación por mando KO) */
const ES_TACTIL = matchMedia('(pointer: coarse)').matches;
const MOBILE = matchMedia('(max-width: 820px)').matches || ES_TACTIL;
const PAGE = MOBILE ? 40 : 120;
let shownList = [], shownCount = 0, sentinel = null, io = null;

function cardHTML(g) {
  const k = KEY(g);
  return `<a class="game" data-k="${k}" data-href="player.html?sys=${g.sys}&rom=${encodeURIComponent(g.path)}&name=${encodeURIComponent(g.name)}">` +
    `<span class="box">${(g.mini || g.thumb) ? `<img loading="lazy" decoding="async" width="320" height="440" src="${encodeURI(g.mini || g.thumb)}" alt="">` : '👾'}</span>` +
    `<button class="fav${FAVS.includes(k) ? ' on' : ''}" title="fav">★</button>` +
    `<button class="regalo" title="recomendar a un socio">🎁</button>` +
    `${g.name}<span class="sys">${g.sys.toUpperCase()}</span></a>`;
}

function wire(nodes) {
  nodes.forEach(a => {
    const g = GAMES.find(x => KEY(x) === a.dataset.k);
    if (!g) return;
    a.querySelector('.fav').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleFav(g); });
    a.querySelector('.regalo').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.SALA_REGALO) window.SALA_REGALO(g);
    });
    // sin href real: así el navegador no enseña la URL abajo al pasar por encima
    a.addEventListener('click', () => { window.SALA_PLAYED(g); location.href = a.dataset.href; });
  });
  if (!MOBILE) bindCursor(grid);
}

function appendChunk(animate) {
  const slice = shownList.slice(shownCount, shownCount + PAGE);
  if (!slice.length) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = slice.map(cardHTML).join('');
  const nodes = [...tmp.children];
  const frag = document.createDocumentFragment();
  nodes.forEach(n => frag.appendChild(n));
  grid.appendChild(frag);
  shownCount += slice.length;
  wire(nodes);
  if (animate && !reduced && !MOBILE) {
    gsap.from(nodes, { opacity: 0, y: 18, stagger: .015, duration: .4, ease: 'power2.out', overwrite: true });
  }
  if (sentinel) grid.appendChild(sentinel);   // el centinela siempre al final
}

function render(animate = true) {
  shownList = currentList();
  shownCount = 0;
  countEl.textContent = shownList.length ? STR[LANG].count(shownList.length)
    : (sys === '__fav' ? STR[LANG].noFav : sys === '__recent' ? STR[LANG].noRecent : STR[LANG].count(0));
  grid.replaceChildren();
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.style.cssText = 'grid-column:1/-1;height:1px';
    io = new IntersectionObserver(es => { if (es[0].isIntersecting) appendChunk(false); }, { rootMargin: '600px' });
    io.observe(sentinel);
  }
  appendChunk(animate);
}

/* buscar con freno: no repintamos en cada pulsación */
let qTimer = null;
function onSearch() {
  document.getElementById('clearQ').style.display = q.value ? '' : 'none';
  clearTimeout(qTimer);
  qTimer = setTimeout(() => render(false), MOBILE ? 260 : 140);
}
['input', 'change', 'search'].forEach(ev => q.addEventListener(ev, onSearch));
document.getElementById('clearQ').addEventListener('click', () => {
  q.value = ''; document.getElementById('clearQ').style.display = 'none'; render(false); q.blur();
});
// en móvil, al pulsar "buscar" en el teclado se cierra el teclado y se ve la rejilla
q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); q.blur(); } });

/* botón al azar */
const _rndBtn = document.getElementById('randomBtn');
if (_rndBtn) _rndBtn.addEventListener('click', () => {
  const list = currentList().length ? currentList() : GAMES;
  if (!list.length) return;
  const g = list[Math.floor(Math.random() * list.length)];
  window.SALA_PLAYED(g);
  blip([523, 784, 1046], .3, 'square', .06);
  setTimeout(() => location.href = `player.html?sys=${g.sys}&rom=${encodeURIComponent(g.path)}&name=${encodeURIComponent(g.name)}`, 220);
});

/* ================= cajón lateral (móvil) =================
   Sustituye a la pestaña plegable: el buscador queda SIEMPRE a la vista en la
   barra, y todo lo demás (sistemas, perfil, ranking, idioma...) vive en un
   cajón que entra desde la izquierda. En escritorio no cambia nada. */
(function cajon() {
  const ham = document.getElementById('hamBtn');
  const dw = document.getElementById('drawer');
  const fondo = document.getElementById('drawerFondo');
  if (!ham || !dw || !fondo) return;
  const abrirDw = (v) => { dw.classList.toggle('on', v); fondo.classList.toggle('on', v); };
  ham.addEventListener('click', () => abrirDw(!dw.classList.contains('on')));
  fondo.addEventListener('click', () => abrirDw(false));
  // elegir algo dentro cierra el cajón (dejando respirar a la animación)
  dw.addEventListener('click', (e) => {
    // los ajustes se quedan abiertos: solo cierran las acciones de navegar
    if (e.target.closest('#dwAjustes, .dw-cab, #dwPie')) return;
    if (e.target.closest('button, a')) setTimeout(() => abrirDw(false), 160);
  });
  // gesto: deslizar desde el borde izquierdo abre
  let borde = null;
  addEventListener('touchstart', (e) => {
    borde = (e.touches[0].clientX < 26 && !dw.classList.contains('on')) ? e.touches[0].clientX : null;
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (borde !== null && e.touches[0].clientX - borde > 45) { abrirDw(true); borde = null; }
  }, { passive: true });

  function recolocar() {
    const movil = innerWidth <= 820 || matchMedia('(pointer: coarse)').matches;
    const acc = document.getElementById('dwAcciones');
    const barra = document.querySelector('.lib-bar');
    // arriba viven chat, ranking e idioma; al cajón solo va el perfil
    ['pfBtn2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) (movil ? acc : barra).appendChild(el);
    });
    // en móvil la cabecera nunca queda plegada (la lengüeta desaparece)
    const st = document.getElementById('stickyTop');
    if (movil && st) st.classList.remove('plegado');
    rebuildTabs();
  }
  recolocar();
  addEventListener('resize', () => { clearTimeout(window._dwr); window._dwr = setTimeout(recolocar, 250); });
})();

/* ---------- ajustes en el cajón: preconfiguran TODAS las partidas ----------
   Escriben las mismas claves de localStorage que lee player.html, así que lo
   que elijas aquí es como llega el emulador cuando abres un juego. */
const SALA_VER = 'v1.4';
const SALA_BUILD = '2026.08.05';
const AJUSTES = [
  { k: 'sala_autosave', t: 'aAuto', s: 'aAutoS', def: true },
  { k: 'sala_suave',    t: 'aSuave', s: 'aSuaveS', def: false },
  { k: 'sala_fuego',    t: 'aFuego', s: 'aFuegoS', def: true },
  { k: 'sala_despierto', t: 'aDesp', s: 'aDespS', def: true },
];
let ajAbierto = false;
try { ajAbierto = localStorage.getItem('sala_ajabierto') === '1'; } catch (e) {}
const ajOn = (a) => {
  try {
    const v = localStorage.getItem(a.k);
    if (v === null) return a.def;
    return v === '1';
  } catch (e) { return a.def; }
};
function pintarAjustes() {
  const caja = document.getElementById('dwAjustes');
  if (!caja) return;
  const t = STR[LANG];
  const pie = document.getElementById('dwPie');
  if (pie) pie.innerHTML =
    `<div class="dw-ver">SALA 200 · ${SALA_VER}<span>build ${SALA_BUILD}</span></div>` +
    `<button class="dw-salir" data-salir="1">${t.aSalir}</button>`;
  if (pie) pie.onclick = (e) => {
    if (!e.target.closest('[data-salir]')) return;
    document.cookie = 'sala200=; path=/; max-age=0';
    try { localStorage.removeItem('sala_user'); } catch (err) {}
    location.href = 'login.html';
  };
  caja.innerHTML =
    `<button class="dw-cab${ajAbierto ? ' on' : ''}" data-plegar="1">${t.ajustes}
      <i>${ajAbierto ? '▾' : '▸'}</i></button>` +
    `<div class="dw-lista" ${ajAbierto ? '' : 'hidden'}>` +
    AJUSTES.map((a, i) =>
      `<button class="dw-aj" data-i="${i}"><span>${t[a.t]}<em>${t[a.s]}</em></span>
        <b class="${ajOn(a) ? 'si' : 'no'}">${ajOn(a) ? t.si : t.no}</b></button>`).join('') +
    `<button class="dw-aj" data-mus="1"><span>${t.aMus}<em>${t.aMusS}</em></span>
      <b class="${musicOn ? 'si' : 'no'}">${musicOn ? t.si : t.no}</b></button></div>`;
  caja.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.plegar) {
      ajAbierto = !ajAbierto;
      try { localStorage.setItem('sala_ajabierto', ajAbierto ? '1' : '0'); } catch (err) {}
      pintarAjustes();
      return;
    }
    if (b.dataset.mus) { alternarMusica(); pintarAjustes(); return; }
    const a = AJUSTES[+b.dataset.i];
    if (!a) return;
    try { localStorage.setItem(a.k, ajOn(a) ? '0' : '1'); } catch (err) {}
    pintarAjustes();
    blip([880, 1174], .1, 'triangle', .04);
  };
}
addEventListener('sala:lang', pintarAjustes);
pintarAjustes();          // ojo: aquí, después de definirse (el cajón corre antes)

/* ---------- la lupa: en móvil el buscador vive plegado ---------- */
(function lupa() {
  const b = document.getElementById('lupaBtn');
  const q = document.getElementById('q');
  const bar = document.querySelector('.lib-bar');
  if (!b || !q || !bar) return;
  b.addEventListener('click', () => {
    const abre = !bar.classList.contains('buscando');
    bar.classList.toggle('buscando', abre);
    if (abre) setTimeout(() => q.focus(), 140);
    else q.blur();
  });
  // al salir del campo sin texto, se repliega solo
  q.addEventListener('blur', () => {
    if (!q.value.trim()) setTimeout(() => bar.classList.remove('buscando'), 150);
  });
})();

/* idioma: el botón del lobby 3D y el de la barra de la biblioteca (el 3D no se ve en móvil) */
function toggleLang() {
  LANG = LANG === 'es' ? 'en' : 'es';
  localStorage.setItem('sala_lang', LANG);
  applyLang();
  blip([880, 1174], .16, 'square', .05);
}
['langBtn', 'langBtn2'].forEach(id => {
  const b = document.getElementById(id);
  if (b) b.addEventListener('click', toggleLang);
});

/* puertas 3D → biblioteca */
addEventListener('sala:door', (e) => {
  const btn = document.querySelector(`.tab[data-sys="${e.detail}"]`) || document.querySelector('.tab[data-sys="all"]');
  if (btn) btn.click();
  lenis.scrollTo('#library', { offset: -10, duration: 1.2 });
});

/* marquesina viva: lo de siempre + el pulso real de la sala */
let RKINFO = null;
function buildMarquee(total) {
  const extra = RKINFO
    ? (LANG === 'en'
        ? ` 👑 CHAMPION: <b>${RKINFO.campeon}</b> — ${RKINFO.plays} GAMES PLAYED — ${RKINFO.horas}H OF ARCADE —`
        : ` 👑 CAMPEÓN: <b>${RKINFO.campeon}</b> — ${RKINFO.plays} PARTIDAS ECHADAS — ${RKINFO.horas}H DE VICIO —`)
    : '';
  document.getElementById('mq').innerHTML = (STR[LANG].marquee(total) + extra).repeat(4);
}
fetch('/api/ranking').then(r => r.json()).then(d => {
  const l = d.ranking || [];
  if (!l.length) return;
  RKINFO = { campeon: l[0].user.toUpperCase(),
             plays: l.reduce((a, x) => a + x.plays, 0),
             horas: Math.round(l.reduce((a, x) => a + (x.minutos || 0), 0) / 60) };
  if (window.SALA_GAMES) buildMarquee(window.SALA_GAMES.length);
}).catch(() => {});

/* ================= easter egg: código Konami → modo ámbar ================= */
const KONAMI = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
let kseq = [];
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  kseq.push(k); kseq = kseq.slice(-KONAMI.length);
  if (kseq.join() === KONAMI.join()) { kseq = []; fireKonami(); }
});

/* ================= mando: Konami con el DualSense ================= */
/* En un mando de PlayStation, el B/A de Nintendo son ✕ (abajo) y ○ (derecha).
   Secuencia: ↑ ↑ ↓ ↓ ← → ← → ✕ ○  (también vale ○ ✕, que nadie se pelee) */
const GP_KONAMI_A = ['up','up','down','down','left','right','left','right','cross','circle'];
const GP_KONAMI_B = ['up','up','down','down','left','right','left','right','circle','cross'];
const GP_MAP = { 12: 'up', 13: 'down', 14: 'left', 15: 'right', 0: 'cross', 1: 'circle' };
let gseq = [], gprev = {};
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p) continue;
    // botones
    for (const [idx, name] of Object.entries(GP_MAP)) {
      const pressed = p.buttons[idx] && p.buttons[idx].pressed;
      const key = p.index + ':' + idx;
      if (pressed && !gprev[key]) {
        gseq.push(name); gseq = gseq.slice(-10);
        const j = gseq.join();
        if (j === GP_KONAMI_A.join() || j === GP_KONAMI_B.join()) { gseq = []; fireKonami(); }
      }
      gprev[key] = pressed;
    }
    // stick izquierdo también cuenta como cruceta para la secuencia
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const dir = ay < -.7 ? 'up' : ay > .7 ? 'down' : ax < -.7 ? 'left' : ax > .7 ? 'right' : null;
    const sk = p.index + ':stick';
    if (dir && gprev[sk] !== dir) { gseq.push(dir); gseq = gseq.slice(-10); }
    if (!dir) gprev[sk] = null; else gprev[sk] = dir;
  }
}
gsap.ticker.add(pollPad);

/* ================= modo sofá: la biblioteca con el mando =================
   Cruceta/stick para moverte por las carátulas, ✕ (A) para lanzar el juego,
   L1/R1 para cambiar de estantería. Solo despierta si hay mando conectado. */
let sofaPad = false, sofaSel = -1, sofaPrev = {}, sofaHold = {}, sofaCtx = '', sofaSelP = 0, sofaBarra = false;
addEventListener('gamepadconnected', () => { sofaPad = true; });
addEventListener('gamepaddisconnected', () => {
  sofaPad = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean);
});
function sofaMarca(cards) {
  cards.forEach((c, i) => c.classList.toggle('selec', i === sofaSel));
  const el = cards[sofaSel];
  if (!el) return;
  try {
    if (window.SALA_LENIS) window.SALA_LENIS.scrollTo(el, { offset: -innerHeight / 2 + 140, duration: .45 });
    else el.scrollIntoView({ block: 'center' });
  } catch (e) { el.scrollIntoView({ block: 'center' }); }
}
function sofaNav() {
  if (!sofaPad) return;
  const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])]
    .filter(Boolean).find(x => x.buttons && x.buttons.length >= 4);
  if (!p) return;
  // escribiendo en un campo, el mando no interfiere
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  const est = {
    izq: (p.buttons[14] && p.buttons[14].pressed) || ax < -.6,
    der: (p.buttons[15] && p.buttons[15].pressed) || ax > .6,
    arr: (p.buttons[12] && p.buttons[12].pressed) || ay < -.6,
    aba: (p.buttons[13] && p.buttons[13].pressed) || ay > .6,
    a: p.buttons[0] && p.buttons[0].pressed,
    b: p.buttons[1] && p.buttons[1].pressed,
    tri: p.buttons[3] && p.buttons[3].pressed,
    l1: p.buttons[4] && p.buttons[4].pressed,
    r1: p.buttons[5] && p.buttons[5].pressed,
  };
  const t = performance.now();
  // flanco + auto-repetición al mantener (350 ms de espera, luego cada 110 ms)
  const pulso = (k) => {
    if (!est[k]) { sofaPrev[k] = false; sofaHold[k] = 0; return false; }
    if (!sofaPrev[k]) { sofaPrev[k] = true; sofaHold[k] = t + 350; return true; }
    if (t > sofaHold[k]) { sofaHold[k] = t + 110; return true; }
    return false;
  };

  // ---- contexto: ¿hay un panel o el cajón abiertos? La cruceta manda AHÍ ----
  const PANELES = [
    ['#pfWrap.on #pfPanel', '#pfClose'],
    ['#rkWrap.on #rkPanel', '#rkClose'],
    ['#chatWrap.on', '#chatX'],
    ['#drawer.on', '#drawerFondo'],
  ];
  let ctx = null;
  for (const [sel, cierre] of PANELES) {
    const cont = document.querySelector(sel);
    if (cont) { ctx = { cont, cierre, clave: sel }; break; }
  }
  if (ctx) {
    const els = [...ctx.cont.querySelectorAll('button, a')].filter(e => e.offsetParent !== null);
    if (!els.length) return;
    const marca = () => {
      els.forEach((e, i) => e.classList.toggle('padsel', i === sofaSelP));
      try { els[sofaSelP].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    };
    if (sofaCtx !== ctx.clave) { sofaCtx = ctx.clave; sofaSelP = 0; marca(); }
    if (pulso('aba') || pulso('der')) { sofaSelP = Math.min(els.length - 1, sofaSelP + 1); marca(); }
    if (pulso('arr') || pulso('izq')) { sofaSelP = Math.max(0, sofaSelP - 1); marca(); }
    if (pulso('a') && els[sofaSelP]) els[sofaSelP].click();
    if (pulso('b')) {
      els.forEach(e => e.classList.remove('padsel'));
      const x = document.querySelector(ctx.cierre);
      if (x) x.click();
      sofaCtx = '';
    }
    return;
  }
  sofaCtx = '';

  // ---- sin paneles: la rejilla de juegos ----
  if (pulso('b')) {                      // ○ abre el cajón
    const h = document.getElementById('hamBtn');
    if (h && h.offsetParent !== null) h.click();
    return;
  }
  if (pulso('tri')) {                    // △ abre el chat
    const c = document.getElementById('chatBtn');
    if (c && c.offsetParent !== null) c.click();
    return;
  }
  const cards = [...document.querySelectorAll('.grid a.game')];
  if (!cards.length) return;

  // ---- modo barra: los iconos de arriba (☰ 🔍 👥 💬 🏆 🌐 y pestañas) ----
  if (sofaBarra) {
    const bts = [...document.querySelectorAll('.lib-bar button, .lib-bar .tab')]
      .filter(e => e.offsetParent !== null);
    if (!bts.length) { sofaBarra = false; return; }
    sofaSelP = Math.max(0, Math.min(bts.length - 1, sofaSelP));
    const marcaB = () => {
      bts.forEach((e, i) => e.classList.toggle('padsel', i === sofaSelP));
    };
    marcaB();
    if (pulso('der')) { sofaSelP = Math.min(bts.length - 1, sofaSelP + 1); marcaB(); }
    if (pulso('izq')) { sofaSelP = Math.max(0, sofaSelP - 1); marcaB(); }
    if (pulso('a') && bts[sofaSelP]) { bts[sofaSelP].click(); }
    if (pulso('aba') || pulso('b')) {           // bajar (o ○) devuelve a la rejilla
      bts.forEach(e => e.classList.remove('padsel'));
      sofaBarra = false;
      sofaMarca(cards);
    }
    return;
  }

  // columnas reales de la rejilla (para que arriba/abajo salte la fila entera)
  let cols = 1;
  const y0 = cards[0].offsetTop;
  while (cols < cards.length && cards[cols].offsetTop === y0) cols++;
  const mueve = (d) => {
    sofaSel = sofaSel < 0 ? 0 : Math.max(0, Math.min(cards.length - 1, sofaSel + d));
    sofaMarca(cards);
  };
  if (pulso('izq')) mueve(-1);
  if (pulso('der')) mueve(1);
  if (pulso('arr')) {
    if (sofaSel >= 0 && sofaSel < cols) {       // primera fila + arriba = a la barra
      cards.forEach(e => e.classList.remove('selec'));
      sofaBarra = true; sofaSelP = 0;
      try { if (window.SALA_LENIS) window.SALA_LENIS.scrollTo(0, { duration: .3 }); } catch (e) {}
      return;
    }
    mueve(-cols);
  }
  if (pulso('aba')) mueve(cols);
  if (pulso('l1') || pulso('r1')) {
    const tabs = [...document.querySelectorAll('.tab[data-sys]')];
    const i = tabs.findIndex(x => x.classList.contains('on'));
    const j = (i + (est.r1 ? 1 : -1) + tabs.length) % tabs.length;
    if (tabs[j]) { tabs[j].click(); sofaSel = -1; }
  }
  if (pulso('a') && sofaSel >= 0 && cards[sofaSel]) cards[sofaSel].click();
}
gsap.ticker.add(sofaNav);

/* indicador de mando conectado */
const padInd = document.getElementById('padInd');
function refreshPadInd() {
  const pads = (navigator.getGamepads ? navigator.getGamepads() : []);
  const live = [...pads].filter(Boolean);
  if (!padInd) return;
  if (!window.isSecureContext) {
    padInd.textContent = '🎮 HTTPS';
    padInd.title = 'Los mandos requieren HTTPS: abre https://sala200.TU-TAILNET.ts.net/juegos/';
    padInd.classList.remove('on');
    return;
  }
  if (live.length) {
    padInd.textContent = '🎮 ON';
    padInd.classList.add('on');
  } else {
    padInd.textContent = '🎮 —';
    padInd.classList.remove('on');
  }
}
addEventListener('gamepadconnected', () => { refreshPadInd(); blip([880, 1320], .18, 'triangle', .05); });
addEventListener('gamepaddisconnected', refreshPadInd);
setInterval(refreshPadInd, 1000);

function fireKonami() {
  document.body.classList.toggle('amber');
  blip([1046, 1318, 1568, 2093], .5, 'square', .07);
  const msg = document.createElement('div');
  msg.className = 'konami';
  msg.textContent = document.body.classList.contains('amber') ? 'AMBER CRT MODE' : 'PHOSPHOR MODE';
  document.body.appendChild(msg);
  gsap.fromTo(msg, { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .3,
    onComplete: () => gsap.to(msg, { opacity: 0, duration: .6, delay: 1.4, onComplete: () => msg.remove() }) });
}

applyLang();
