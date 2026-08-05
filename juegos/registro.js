/* SALA 200 — alta de socio por invitación */
const SALT = 'CAMBIA-ESTE-SALT-POR-UNO-TUYO';
const CODE = new URLSearchParams(location.search).get('i') || '';

let LANG = localStorage.getItem('sala_lang') || (navigator.language || 'es').slice(0, 2);
if (LANG !== 'en') LANG = 'es';
const TXT = {
  es: { tag: '— INVITACIÓN DE SOCIO —', deParte: (d) => `<b>${d.toUpperCase()}</b> te invita a su salón recreativo clandestino. Elige tu nombre y tu clave y dentro.`,
        lu: 'ELIGE TU NOMBRE', su: 'minúsculas, números, guiones · será tu nombre en la sala',
        lp: 'ELIGE TU CLAVE', lp2: 'REPITE LA CLAVE', go: '▶ DARME DE ALTA',
        mala: 'INVITACIÓN NO VÁLIDA<br>O YA USADA', pide: 'pídele otra a quien te la mandó',
        comprobando: 'comprobando tu invitación…',
        eUser: 'NOMBRE: 3-16 · minúsculas, números o guiones', ePass: 'LA CLAVE: 4 O MÁS', eRep: 'LAS CLAVES NO COINCIDEN',
        eOcupado: 'ESE NOMBRE YA TIENE DUEÑO', eInv: 'LA INVITACIÓN YA NO VALE', eOtro: 'FALLO RARO, PRUEBA OTRA VEZ',
        creando: 'CREANDO TU FICHA…', dentro: '✔ YA ERES SOCIO · ENTRANDO…' },
  en: { tag: '— MEMBER INVITATION —', deParte: (d) => `<b>${d.toUpperCase()}</b> invited you to their clandestine arcade. Pick a name and a password and get in.`,
        lu: 'PICK YOUR NAME', su: 'lowercase, numbers, dashes · your name in the arcade',
        lp: 'PICK YOUR PASSWORD', lp2: 'REPEAT PASSWORD', go: '▶ SIGN ME UP',
        mala: 'INVALID INVITATION<br>OR ALREADY USED', pide: 'ask for another one',
        comprobando: 'checking your invitation…',
        eUser: 'NAME: 3-16 · lowercase, numbers or dashes', ePass: 'PASSWORD: 4 OR MORE', eRep: 'PASSWORDS DO NOT MATCH',
        eOcupado: 'THAT NAME IS TAKEN', eInv: 'THE INVITATION IS NO LONGER VALID', eOtro: 'WEIRD FAILURE, TRY AGAIN',
        creando: 'CREATING YOUR CARD…', dentro: '✔ YOU ARE IN · ENTERING…' },
};
const T = () => TXT[LANG];
const $ = (id) => document.getElementById(id);
let invitaDe = '';

function pintar() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-t]').forEach(el => {
    const v = T()[el.dataset.t];
    if (typeof v === 'string') el.innerHTML = v;
  });
  if (invitaDe) $('sub').innerHTML = T().deParte(invitaDe);
  else $('sub').textContent = T().comprobando;
  document.querySelectorAll('#langSel b').forEach(b => b.classList.toggle('on', b.dataset.l === LANG));
}
$('langSel').addEventListener('click', (e) => {
  const b = e.target.closest('b[data-l]');
  if (!b || b.dataset.l === LANG) return;
  LANG = b.dataset.l;
  try { localStorage.setItem('sala_lang', LANG); } catch (err) {}
  pintar();
});
pintar();

async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ¿la invitación vale? */
fetch('/api/registro-info?code=' + encodeURIComponent(CODE)).then(r => r.json()).then(d => {
  if (d.valida) {
    invitaDe = d.de || '';
    $('campos').style.display = '';
    pintar();
    $('u').focus();
  } else {
    $('sub').style.display = 'none';
    $('muerta').style.display = '';
  }
}).catch(() => { $('sub').style.display = 'none'; $('muerta').style.display = ''; });

$('panel').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('msg');
  const u = $('u').value.trim().toLowerCase();
  const p = $('p').value, p2 = $('p2').value;
  msg.className = 'msg';
  if (!/^[a-z0-9_-]{3,16}$/.test(u)) { msg.textContent = '✕ ' + T().eUser; return; }
  if (p.length < 4) { msg.textContent = '✕ ' + T().ePass; return; }
  if (p !== p2) { msg.textContent = '✕ ' + T().eRep; return; }
  $('go').disabled = true;
  msg.className = 'msg ok'; msg.textContent = T().creando;
  try {
    const r = await fetch('/api/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: CODE, user: u, pass: p }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      msg.className = 'msg';
      msg.textContent = '✕ ' + (d.error === 'ocupado' ? T().eOcupado
                        : d.error === 'invitacion' ? T().eInv
                        : d.error === 'usuario' ? T().eUser
                        : d.error === 'clave' ? T().ePass : T().eOtro);
      $('go').disabled = false;
      return;
    }
    // alta hecha: nos ponemos la cookie con la misma fórmula del login y adentro
    const token = await sha256(`${u}:${p}:${SALT}`);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `sala200=${token}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    try { localStorage.setItem('sala_user', u); } catch (err) {}
    msg.textContent = T().dentro;
    setTimeout(() => location.replace('index.html'), 900);
  } catch (err) {
    msg.className = 'msg'; msg.textContent = '✕ ' + T().eOtro;
    $('go').disabled = false;
  }
});
