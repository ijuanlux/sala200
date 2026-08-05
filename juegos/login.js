/* SALA 200 — pantalla de acceso */
const SALT = 'CAMBIA-ESTE-SALT-POR-UNO-TUYO';
const boot = document.getElementById('boot');
const panel = document.getElementById('panel');
const msg = document.getElementById('msg');
const crt = document.getElementById('crt');
const warp = document.getElementById('warp');

/* ---------- idioma: se elige aquí y viaja a toda la web (sala_lang) ---------- */
let LANG = localStorage.getItem('sala_lang') || (navigator.language || 'es').slice(0, 2);
if (LANG !== 'en') LANG = 'es';
const TXT = {
  es: { tag: '— ACCESO RESTRINGIDO —', sub: 'salón recreativo clandestino · solo socios',
        lu: 'IDENTIFICACIÓN', lp: 'CLAVE DE ACCESO', ph: 'usuario', go: '▶ INSERTAR MONEDA',
        faltan: 'FALTAN DATOS', verificando: 'VERIFICANDO…', denegado: 'ACCESO DENEGADO',
        concedido: '✔ ACCESO CONCEDIDO', desconocido: 'desconocido' },
  en: { tag: '— RESTRICTED ACCESS —', sub: 'clandestine arcade · members only',
        lu: 'IDENTIFICATION', lp: 'ACCESS CODE', ph: 'username', go: '▶ INSERT COIN',
        faltan: 'MISSING DATA', verificando: 'VERIFYING…', denegado: 'ACCESS DENIED',
        concedido: '✔ ACCESS GRANTED', desconocido: 'unknown' },
};
const T = () => TXT[LANG];
function pintarIdioma() {
  try {
    document.querySelector('.tag').textContent = T().tag;
    document.querySelector('.sub').textContent = T().sub;
    document.querySelector('label[for="u"]').textContent = T().lu;
    document.querySelector('label[for="p"]').textContent = T().lp;
    document.getElementById('u').placeholder = T().ph;
    document.querySelector('button.go').textContent = T().go;
    document.documentElement.lang = LANG;
    document.querySelectorAll('#langSel b').forEach(b => b.classList.toggle('on', b.dataset.l === LANG));
  } catch (e) {}
}
const langSel = document.getElementById('langSel');
if (langSel) langSel.addEventListener('click', (e) => {
  const b = e.target.closest('b[data-l]');
  if (!b || b.dataset.l === LANG) return;
  LANG = b.dataset.l;
  try { localStorage.setItem('sala_lang', LANG); } catch (err) {}
  pintarIdioma();
  beep([880, 1174], .14);
});
pintarIdioma();

/* ---------- fondo: grid synthwave ---------- */
(function bg() {
  const c = document.getElementById('bg');
  const gl = c.getContext('webgl');
  if (!gl) return;
  const fs = `precision highp float;
uniform float t; uniform vec2 res; uniform float err;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/res; float horizon=.42;
  vec3 g=mix(vec3(.10,1.,.42), vec3(1.,.18,.33), err);
  vec3 s=mix(vec3(.25,1.,.85), vec3(1.,.4,.5), err);
  vec3 col=vec3(0.);
  if(uv.y<horizon){
    float py=(horizon-uv.y)+.001, pz=1./(py*3.2);
    float gx=(uv.x-.5)*pz*5., gz=pz*1.6+t*.9;
    float lx=smoothstep(.93,1.,abs(fract(gx)-.5)*2.);
    float lz=smoothstep(.93,1.,abs(fract(gz)-.5)*2.);
    col+=g*clamp(lx+lz,0.,1.)*max(0.,1.-py*1.9)*.8;
  } else {
    vec2 sp=floor((uv+vec2(t*.002,0.))*vec2(180.,105.));
    col+=s*step(.997,hash(sp))*(.4+.6*hash(sp+1.7));
  }
  float d=abs(uv.y-horizon);
  col+=g*exp(-d*30.)*.8+s*exp(-d*160.)*.85;
  gl_FragColor=vec4(col*smoothstep(1.2,.25,length(uv-.5)),1.);
}`;
  const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(pr, 't'), uR = gl.getUniformLocation(pr, 'res'), uE = gl.getUniformLocation(pr, 'err');
  const size = () => { const d = Math.min(devicePixelRatio, 2);
    c.width = innerWidth * d; c.height = innerHeight * d; gl.viewport(0, 0, c.width, c.height); };
  size(); addEventListener('resize', size);
  (function loop(ts) {
    gl.uniform1f(uT, ts * .001); gl.uniform2f(uR, c.width, c.height);
    gl.uniform1f(uE, document.body.classList.contains('err') ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3); requestAnimationFrame(loop);
  })(0);
})();

/* ---------- audio clandestino ---------- */
let AC = null, master = null;
function startMusic() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
  master.gain.linearRampToValueAtTime(.1, AC.currentTime + 2.5);
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.connect(master);
  [55, 55.6, 82.4].forEach(f => {
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const g = AC.createGain(); g.gain.value = .045; o.connect(g); g.connect(lp); o.start();
  });
  const lfo = AC.createOscillator(); lfo.frequency.value = .07;
  const lg = AC.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = AC.createBufferSource(); ns.buffer = nb; ns.loop = true;
  const nf = AC.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 700; nf.Q.value = .6;
  const ng = AC.createGain(); ng.gain.value = .012;
  ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start();
  const dl = AC.createDelay(); dl.delayTime.value = .42;
  const fb = AC.createGain(); fb.gain.value = .38; dl.connect(fb); fb.connect(dl); dl.connect(master);
  const seq = [110, 130.81, 164.81, 220, 164.81, 116.54];
  let step = 0;
  setInterval(() => {
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle'; o.frequency.value = seq[step++ % seq.length] * 2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .015);
    g.gain.exponentialRampToValueAtTime(.0001, t + .55);
    o.connect(g); g.connect(master); g.connect(dl); o.start(t); o.stop(t + .6);
  }, 340);
}
function beep(freqs, dur, type, vol) {
  if (!AC) return;
  const t0 = AC.currentTime, st = dur / freqs.length;
  freqs.forEach((f, i) => {
    const o = AC.createOscillator(), g = AC.createGain(), t = t0 + i * st;
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .06, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + st);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + st + .02);
  });
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
  addEventListener(ev, () => startMusic(), { once: true }));

/* ---------- secuencia de arranque ---------- */
const LINES = LANG === 'en' ? [
  ['SALA200 BIOS v8.0', 'ok'],
  ['detecting hardware ................. <b class="ok">OK</b>', ''],
  ['mounting library from NAS ......... <b class="ok">1120 ROMS</b>', ''],
  ['loading emulators .................. <b class="ok">9 CORES</b>', ''],
  ['encrypted link ..................... <b class="ok">ESTABLISHED</b>', ''],
  ['checking credentials ............... <b class="warn">ACCESS REQUIRED</b>', ''],
] : [
  ['SALA200 BIOS v8.0', 'ok'],
  ['detectando hardware ................ <b class="ok">OK</b>', ''],
  ['montando biblioteca desde NAS ...... <b class="ok">1120 ROMS</b>', ''],
  ['cargando emuladores ................ <b class="ok">9 NÚCLEOS</b>', ''],
  ['enlace cifrado ..................... <b class="ok">ESTABLECIDO</b>', ''],
  ['comprobando credenciales ........... <b class="warn">SE REQUIERE ACCESO</b>', ''],
];
let li = 0;
function bootStep() {
  if (li < LINES.length) {
    const d = document.createElement('div');
    d.className = 'l'; d.innerHTML = '> ' + LINES[li][0];
    boot.appendChild(d);
    requestAnimationFrame(() => { d.style.transition = 'opacity .2s'; d.style.opacity = 1; });
    li++;
    setTimeout(bootStep, 190 + Math.random() * 130);
  } else {
    setTimeout(enterLogin, 420);
  }
}
function enterLogin() {
  boot.style.transition = 'opacity .3s'; boot.style.opacity = 0;
  setTimeout(() => boot.remove(), 320);
  // encendido CRT
  crt.style.transition = 'none'; crt.style.transform = 'scale(1,0.004)'; crt.style.opacity = '1';
  requestAnimationFrame(() => {
    crt.style.transition = 'transform .34s cubic-bezier(.2,.9,.2,1), opacity .5s .25s';
    crt.style.transform = 'scale(1,1)'; crt.style.opacity = '0';
  });
  setTimeout(() => {
    panel.style.transition = 'opacity .5s, transform .5s';
    panel.style.transform = 'translateY(0)';
    panel.style.opacity = '1';
    document.getElementById('u').focus({ preventScroll: true });
  }, 260);
}
panel.style.transform = 'translateY(18px)';
setTimeout(bootStep, 260);

/* ---------- login ---------- */
/* SHA-256: usamos el del navegador si existe (https) y si no, uno propio.
   En http la API crypto.subtle no está disponible y el login se quedaba colgado. */
function sha256js(msg) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bytes = new TextEncoder().encode(msg);
  const l = bytes.length;
  const withPad = new Uint8Array((((l + 8) >> 6) + 1) * 64);
  withPad.set(bytes); withPad[l] = 0x80;
  new DataView(withPad.buffer).setUint32(withPad.length - 4, l * 8, false);
  const w = new Uint32Array(64);
  const view = new DataView(withPad.buffer);
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < withPad.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rr(w[t-15],7) ^ rr(w[t-15],18) ^ (w[t-15] >>> 3);
      const s1 = rr(w[t-2],17) ^ rr(w[t-2],19) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    H = H.map((x, i2) => (x + [a,b,c,d,e,f,g,h][i2]) >>> 0);
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}
async function sha256(s) {
  if (window.crypto && crypto.subtle && crypto.subtle.digest) {
    try {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    } catch (e) { /* sin contexto seguro: seguimos con el nuestro */ }
  }
  return sha256js(s);
}
function param(k) { return new URLSearchParams(location.search).get(k); }

panel.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
  startMusic();
  const u = document.getElementById('u').value.trim().toLowerCase();
  const p = document.getElementById('p').value;
  if (!u || !p) { fail(T().faltan); return; }
  msg.style.color = '#6fa585'; msg.textContent = T().verificando;
  const token = await sha256(`${u}:${p}:${SALT}`);
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `sala200=${token}; path=/; max-age=31536000; SameSite=Lax${secure}`;
  // comprobamos contra el servidor: si la cookie no vale, nos redirige de vuelta
  const test = await fetch('games.json', { cache: 'no-store', redirect: 'manual' })
    .then(r => r.ok && r.type !== 'opaqueredirect').catch(() => false);
  if (!test) {
    document.cookie = 'sala200=; path=/; max-age=0';
    fail(T().denegado);
    return;
  }
    ok();
  } catch (err) {
    fail('ERROR: ' + (err && err.message ? err.message.slice(0, 40) : T().desconocido));
  }
});

function fail(text) {
  document.body.classList.add('err');
  panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake');
  msg.style.color = '#ff2d55'; msg.textContent = '✕ ' + text;
  beep([220, 150], .3, 'sawtooth', .07);
  setTimeout(() => document.body.classList.remove('err'), 1400);
  document.getElementById('p').value = '';
}

function ok() {
  msg.style.color = '#39ff88'; msg.textContent = T().concedido;
  beep([523, 659, 784, 1046], .45, 'square', .07);
  panel.style.transition = 'transform .7s cubic-bezier(.6,0,.9,.2), opacity .7s, filter .7s';
  panel.style.transform = 'scale(1.35)'; panel.style.opacity = '0'; panel.style.filter = 'blur(6px)';
  warp.style.transition = 'opacity .55s .12s';
  warp.style.opacity = '1';
  setTimeout(() => {
    /* r llega SIN codificar desde nginx: si la URL de destino llevaba sus
       propios parámetros (rom, core...), un param('r') normal se queda solo
       con el primer trozo. Nos quedamos con TODO lo que sigue a "r=". */
    const m = location.search.match(/[?&]r=(.+)$/);
    const dest = m ? m[1] : 'index.html';
    location.replace(dest.startsWith('/') || dest.startsWith('index') ? dest : 'index.html');
  }, 780);
}
