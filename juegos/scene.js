/* SALA 200 — recreativos 3D pixel-art
   Lobby con puertas de neón + salas por sistema con los juegos en cajas flotantes. */
import * as THREE from 'three';

const canvas = document.getElementById('scene');
if (canvas && matchMedia('(min-width: 821px)').matches) {
  document.fonts.load('54px PS2P').then(init).catch(init);
}
const sfx = (kind) => dispatchEvent(new CustomEvent('sala:sfx', { detail: kind }));
const T = (k) => (window.SALA_T ? window.SALA_T(k) : k);

function init() {
  const PIX = 3.4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  const cam = new THREE.PerspectiveCamera(52, 1, .1, 150);
  let scene, mode = 'lobby', interactables = [], near = null, entering = false;

  function size() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(Math.floor(w / PIX), Math.floor(h / PIX), false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);

  /* ================= helpers ================= */
  const texCache = {};
  function texCanvas(w, h, draw, key) {
    if (key && texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    if (key) texCache[key] = t;
    return t;
  }
  function neonText(text, color, size = 54) {
    return texCanvas(512, 128, ctx => {
      ctx.clearRect(0, 0, 512, 128);
      ctx.font = `${size}px PS2P, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = color; ctx.shadowBlur = 30;
      ctx.fillStyle = color; ctx.fillText(text, 256, 68); ctx.fillText(text, 256, 68);
      ctx.shadowBlur = 0; ctx.globalAlpha = .9; ctx.fillStyle = '#f2fff6';
      ctx.fillText(text, 256, 68);
    }, 'neon' + text + color + size);
  }
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('');                       // mismo origen: sin CORS de por medio
  function tituloTex(nombre, color) {
    return texCanvas(256, 344, ctx => {
      ctx.fillStyle = '#0a0f18'; ctx.fillRect(0, 0, 256, 344);
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 240, 328);
      ctx.fillStyle = color; ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      const palabras = String(nombre).replace(/\(.*?\)|\[.*?\]/g, '').trim().split(/\s+/);
      let linea = '', y = 150;
      palabras.forEach(p => {
        const prueba = linea ? linea + ' ' + p : p;
        if (ctx.measureText(prueba).width > 210) { ctx.fillText(linea, 128, y); y += 28; linea = p; }
        else linea = prueba;
      });
      if (linea) ctx.fillText(linea, 128, y);
    }, 'tit' + nombre);
  }
  function pixTex(url, nombreRespaldo, colorRespaldo) {
    const t = loader.load(url, undefined, undefined, () => {
      // no cargó: sustituimos por el título para que la caja no quede en blanco
      if (!nombreRespaldo) return;
      const alt = tituloTex(nombreRespaldo, colorRespaldo || '#39ff88');
      t.image = alt.image; t.needsUpdate = true;
    });
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* --- TV: estática + raya horizontal que sube --- */
  const tvC = document.createElement('canvas'); tvC.width = 96; tvC.height = 72;
  const tvCtx = tvC.getContext('2d');
  const tvTex = new THREE.CanvasTexture(tvC);
  tvTex.magFilter = THREE.NearestFilter; tvTex.minFilter = THREE.NearestFilter;
  let rollY = 0;
  function drawTV(t) {
    const g = tvCtx;
    g.fillStyle = '#04120a'; g.fillRect(0, 0, 96, 72);
    for (let y = 0; y < 72; y += 2) {
      g.fillStyle = `rgba(30,${120 + ((y * 7 + t * 40) % 90) | 0},70,.5)`;
      g.fillRect(0, y, 96, 1);
    }
    for (let i = 0; i < 50; i++) {
      g.fillStyle = Math.random() < .5 ? '#0d3a22' : '#154d2e';
      g.fillRect(Math.random() * 96 | 0, Math.random() * 72 | 0, 2, 1);
    }
    rollY = (rollY + .55) % 86;
    const y = 72 - rollY;
    const grd = g.createLinearGradient(0, y - 7, 0, y + 7);
    grd.addColorStop(0, 'rgba(200,255,225,0)');
    grd.addColorStop(.5, 'rgba(210,255,230,.85)');
    grd.addColorStop(1, 'rgba(200,255,225,0)');
    g.fillStyle = grd; g.fillRect(0, y - 7, 96, 14);
    tvTex.needsUpdate = true;
  }

  /* ================= el chaval ================= */
  function buildKid() {
    const kid = new THREE.Group();
    const P = (w, h, d, c, x, y, z, parent, emissive) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: c, roughness: .8,
          emissive: emissive || 0x000000, emissiveIntensity: emissive ? .6 : 0 }));
      m.position.set(x, y, z); (parent || kid).add(m); return m;
    };
    P(.34, .18, .5, 0xf5f5f5, -.19, .09, .05); P(.34, .18, .5, 0xf5f5f5, .19, .09, .05);
    P(.35, .07, .52, 0xff2d78, -.19, .17, .05); P(.35, .07, .52, 0xff2d78, .19, .17, .05);
    const legL = P(.3, .62, .32, 0x2a3f74, -.19, .49, 0);
    const legR = P(.3, .62, .32, 0x2a3f74, .19, .49, 0);
    P(.92, .82, .54, 0x1b2a4a, 0, 1.18, 0);
    P(.94, .1, .56, 0xff2d78, 0, .84, 0);
    P(.94, .07, .56, 0x35e9ff, 0, 1.5, 0);
    P(.3, .5, .56, 0xffd23f, -.02, 1.2, .02);
    const armL = P(.24, .68, .28, 0x1b2a4a, -.58, 1.2, 0);
    const armR = P(.24, .68, .28, 0x1b2a4a, .58, 1.2, 0);
    P(.25, .16, .29, 0xffd9a6, -.58, .84, 0);
    P(.25, .16, .29, 0xffd9a6, .58, .84, 0);
    const head = new THREE.Group(); head.position.set(0, 1.92, 0); kid.add(head);
    P(.58, .58, .52, 0xffd9a6, 0, 0, 0, head);
    P(.14, .16, .04, 0xffffff, -.14, .06, .27, head);
    P(.14, .16, .04, 0xffffff, .14, .06, .27, head);
    const pupL = P(.07, .09, .04, 0x101820, -.14, .05, .3, head);
    const pupR = P(.07, .09, .04, 0x101820, .14, .05, .3, head);
    P(.16, .04, .04, 0x6b4a2f, -.14, .19, .28, head);
    P(.16, .04, .04, 0x6b4a2f, .14, .19, .28, head);
    P(.18, .04, .04, 0xa9613f, 0, -.16, .27, head);
    P(.62, .2, .58, 0xff2d78, 0, .35, 0, head);
    P(.58, .14, .26, 0xff2d78, 0, .27, -.38, head);
    P(.16, .16, .04, 0x35e9ff, 0, .35, .3, head);
    P(.22, .3, .12, 0x101820, .42, .78, .28, kid, 0x35e9ff);
    kid.userData = { legL, legR, armL, armR, head, pupL, pupR };
    return kid;
  }

  /* ================= identidad de sistemas ================= */
  const SYSCOLOR = { snes: '#b898ff', megadrive: '#35e9ff', n64: '#39ff88', neogeo: '#ff2d78' };
  const SYSLABEL = { snes: 'SNES', megadrive: 'MEGA DRIVE', n64: 'N64', neogeo: 'NEO GEO' };

  // wordmarks dibujados a mano en canvas, fieles al espíritu de cada marca
  function wordmark(sys) {
    return texCanvas(512, 256, ctx => {
      ctx.clearRect(0, 0, 512, 256);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (sys === 'megadrive') {                    // SEGA: azul, itálica, redondeada
        ctx.font = 'italic 900 108px Helvetica, Arial, sans-serif';
        ctx.shadowColor = '#0b6cff'; ctx.shadowBlur = 34;
        ctx.fillStyle = '#0b6cff'; ctx.fillText('SEGA', 256, 100);
        ctx.shadowBlur = 0; ctx.fillStyle = '#eaf4ff'; ctx.fillText('SEGA', 256, 96);
        ctx.font = '700 34px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#9fd8ff'; ctx.fillText('MEGA DRIVE', 256, 178);
        ctx.strokeStyle = '#35e9ff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(100, 208); ctx.lineTo(412, 208); ctx.stroke();
      } else if (sys === 'neogeo') {                // NEO·GEO: rojo/amarillo + SNK
        ctx.font = '900 92px Helvetica, Arial, sans-serif';
        ctx.shadowColor = '#ff2d2d'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff2d2d'; ctx.fillText('NEO', 176, 96);
        ctx.fillStyle = '#ffd23f'; ctx.fillText('GEO', 356, 96);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(266, 96, 13, 0, 7); ctx.fill();
        ctx.font = '900 54px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#ffffff'; ctx.fillText('S N K', 256, 186);
      } else if (sys === 'snes') {                  // SNES: gris/violeta con los 4 botones
        ctx.font = '900 76px Helvetica, Arial, sans-serif';
        ctx.shadowColor = '#b898ff'; ctx.shadowBlur = 26;
        ctx.fillStyle = '#e9e4ff'; ctx.fillText('SUPER', 256, 74);
        ctx.font = '900 62px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#b898ff'; ctx.fillText('NINTENDO', 256, 148);
        ctx.shadowBlur = 0;
        const bt = [['#5a4fcf', 210, 212], ['#8f7bd8', 250, 196], ['#d94f9a', 290, 212], ['#3fb6d9', 250, 228]];
        bt.forEach(([c, x, y]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); });
      } else {                                      // N64: wordmark + tres colores
        ctx.font = '900 104px Helvetica, Arial, sans-serif';
        ctx.shadowColor = '#39ff88'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#eafff2'; ctx.fillText('NINTENDO', 256, 82);
        ctx.font = '900 118px Helvetica, Arial, sans-serif';
        ctx.shadowColor = '#ffd23f';
        ctx.fillStyle = '#39ff88'; ctx.fillText('64', 256, 186);
      }
    }, 'wm' + sys);
  }

  // emblema 3D que gira: forma reconocible por sistema
  function emblem(sys) {
    const g = new THREE.Group();
    const M = (col) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.15, roughness: .35 });
    if (sys === 'snes') {
      // cruceta + diamante de 4 botones (Super Famicom)
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.5, .7, .28), M(0xd9d3e8));
      g.add(pad);
      [[-.42, 0, .18], [.42, 0, .18]].forEach(([x, y, z]) => {
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(.34, .1, .1), M(0x2b2b3a)); c1.position.set(x, y, z); g.add(c1);
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(.1, .34, .1), M(0x2b2b3a)); c2.position.set(x, y, z); g.add(c2);
      });
      const cols = [0x5a4fcf, 0x8f7bd8, 0xd94f9a, 0x3fb6d9];
      [[0, .17], [.17, 0], [0, -.17], [-.17, 0]].forEach((p, i) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .08, 8), M(cols[i]));
        b.rotation.x = Math.PI / 2; b.position.set(.42 + p[0], p[1], .2); g.add(b);
      });
    } else if (sys === 'n64') {
      // la "N" tridimensional: 3 prismas en cuatro colores girando
      const cols = [0x39ff88, 0x35e9ff, 0xffd23f, 0xff2d78];
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(.24, .95, .24), M(cols[i]));
        const a = i / 4 * Math.PI * 2;
        b.position.set(Math.cos(a) * .33, 0, Math.sin(a) * .33);
        b.rotation.z = .32; g.add(b);
      }
      const hub = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 8), M(0xffffff)); g.add(hub);
    } else if (sys === 'megadrive') {
      // arco/elipse azul de SEGA + barra 16-BIT
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .1, 6, 24), M(0x0b6cff));
      ring.scale.set(1.35, .8, 1); g.add(ring);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.7, .14, .14), M(0xeaf4ff)); g.add(bar);
    } else {
      // NEO GEO: cubo rojo con anillo dorado inclinado (rollo cartucho AES)
      const cube = new THREE.Mesh(new THREE.BoxGeometry(.78, .78, .78), M(0xff2d2d)); g.add(cube);
      const t = new THREE.Mesh(new THREE.TorusGeometry(.82, .06, 6, 22), M(0xffd23f));
      t.rotation.x = Math.PI / 2.3; g.add(t);
      const t2 = new THREE.Mesh(new THREE.TorusGeometry(.82, .05, 6, 22), M(0xffffff));
      t2.rotation.y = Math.PI / 2.6; g.add(t2);
    }
    return g;
  }

  /* ================= muebles ================= */
  function tvSet(x, y, z, ry, w = 2.2, h = 1.7) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w + .35, h + .35, .5),
      new THREE.MeshStandardMaterial({ color: 0x0b1a12, roughness: .95 })));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tvTex }));
    scr.position.z = .26; g.add(scr);
    const l = new THREE.PointLight(0x39ff88, 2.2, 7); l.position.set(0, 0, 1.4); g.add(l);
    g.position.set(x, y, z); g.rotation.y = ry;
    return g;
  }

  // recreativa jugable: su pantalla muestra la carátula de un juego del catálogo
  function arcadeCab(x, z, ry, color, game) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.9, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x0a1510, roughness: .95 }));
    body.position.y = 1.45; g.add(body);
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.66, .55, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x101d16, emissive: new THREE.Color(color), emissiveIntensity: .6 }));
    marquee.position.y = 3.15; g.add(marquee);
    const scrMat = game && (game.mini || game.thumb)
      ? new THREE.MeshBasicMaterial({ map: pixTex(game.mini || game.thumb, game.name, color) })
      : new THREE.MeshBasicMaterial({ map: tvTex });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .95), scrMat);
    scr.position.set(0, 2.1, .69); g.add(scr);
    const bez = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 1.09),
      new THREE.MeshBasicMaterial({ color: 0x000000 }));
    bez.position.set(0, 2.1, .68); g.add(bez);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.55, .14, .72),
      new THREE.MeshStandardMaterial({ color: 0x16281d }));
    panel.position.set(0, 1.3, .64); panel.rotation.x = -.35; g.add(panel);
    const stick = new THREE.Mesh(new THREE.SphereGeometry(.1, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff2d78, emissive: 0xff2d78, emissiveIntensity: .9 }));
    stick.position.set(-.32, 1.46, .7); g.add(stick);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .06, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffd23f, emissiveIntensity: .8 }));
      b.position.set(.08 + i * .22, 1.45, .7); g.add(b);
    }
    const gl = new THREE.PointLight(new THREE.Color(color), 3, 9); gl.position.set(0, 2.6, 1.2); g.add(gl);
    g.position.set(x, 0, z); g.rotation.y = ry;
    return { group: g, glow: gl, marquee, screen: scr };
  }

  /* ================= LOBBY ================= */
  function pickGames(n) {
    const all = (window.SALA_GAMES || []).filter(g => g.mini || g.thumb);
    const out = [];
    for (let i = 0; i < n && all.length; i++) out.push(all[Math.floor(Math.random() * all.length)]);
    return out;
  }

  function buildLobby() {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x020503);
    s.fog = new THREE.Fog(0x020503, 22, 50);
    const floorTex = texCanvas(64, 64, ctx => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#07130b' : '#0b1c12'; ctx.fillRect(x * 8, y * 8, 8, 8);
      }
      ctx.fillStyle = '#12331f';
      for (let i = 0; i < 50; i++) ctx.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 1, 1);
    }, 'floor');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(10, 8);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 32),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: .85, metalness: .12 }));
    floor.rotation.x = -Math.PI / 2; s.add(floor);
    const wm = new THREE.MeshStandardMaterial({ color: 0x050e09, roughness: 1 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), wm); back.position.set(0, 6, -14); s.add(back);
    const l1 = new THREE.Mesh(new THREE.PlaneGeometry(32, 12), wm.clone());
    l1.rotation.y = Math.PI / 2; l1.position.set(-19, 6, 0); s.add(l1);
    const r1 = l1.clone(); r1.rotation.y = -Math.PI / 2; r1.position.x = 19; s.add(r1);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x030805 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 12; s.add(ceil);

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.3),
      new THREE.MeshBasicMaterial({ map: neonText('SALA 200', '#39ff88'), transparent: true }));
    sign.position.set(0, 9.4, -13.85); s.add(sign);
    const signL = new THREE.PointLight(0x39ff88, 16, 26); signL.position.set(0, 8.4, -11); s.add(signL);

    s.add(new THREE.AmbientLight(0x1e3a2b, 1.5));
    const tubes = [];
    for (let i = -1; i <= 1; i++) {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(9, .2, .5),
        new THREE.MeshStandardMaterial({ color: 0xdfffe9, emissive: 0xbaffe0, emissiveIntensity: 1.4 }));
      tube.position.set(i * 11, 11.4, -2); s.add(tube);
      const pl = new THREE.PointLight(0xbaffe0, 5, 26); pl.position.set(i * 11, 10.4, -2); s.add(pl);
      tubes.push({ tube, pl, ph: Math.random() * 6 });
    }

    // puertas con wordmark + emblema girando
    const doors = [];
    Object.keys(SYSLABEL).forEach((sys, i) => {
      const x = -11.5 + i * 7.7, color = SYSCOLOR[sys];
      const g = new THREE.Group();
      const dframe = new THREE.Mesh(new THREE.BoxGeometry(4, 6.2, .6),
        new THREE.MeshStandardMaterial({ color: 0x0d2016, roughness: .85 }));
      dframe.position.y = 3.1; g.add(dframe);
      const nm = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 1.3 });
      [[0, 6.05, 3.9, .16], [0, .15, 3.9, .16]].forEach(([px, py, w, h]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .18), nm); b.position.set(px, py, .32); g.add(b);
      });
      [[-1.87, 3.1], [1.87, 3.1]].forEach(([px, py]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(.16, 6.05, .18), nm); b.position.set(px, py, .32); g.add(b);
      });
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 5.4),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.12),
          emissive: new THREE.Color(color), emissiveIntensity: .22, side: THREE.DoubleSide }));
      leaf.position.set(0, 2.9, .3); g.add(leaf);
      // wordmark de la marca sobre la puerta
      const wmk = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1),
        new THREE.MeshBasicMaterial({ map: wordmark(sys), transparent: true }));
      wmk.position.set(0, 7.1, .35); g.add(wmk);
      const emb = emblem(sys); emb.position.set(0, 9.1, .4); emb.scale.setScalar(1.05); g.add(emb);
      const glow = new THREE.PointLight(new THREE.Color(color), 6, 12); glow.position.set(0, 3.4, 2.2); g.add(glow);
      g.position.set(x, 0, -13.6);
      s.add(g);
      doors.push({ type: 'door', sys, x, z: -13.6, group: g, leaf, glow, emb, wmk, color });
    });

    // recreativas jugables (cada una con un juego al azar del catálogo)
    const picks = pickGames(6);
    const cabs = [];
    [[-16.5, -7, Math.PI / 2.2, '#35e9ff'], [-16.5, -2.5, Math.PI / 2.2, '#ff2d78'],
     [-16.5, 2, Math.PI / 2.2, '#39ff88'], [16.5, -7, -Math.PI / 2.2, '#b898ff'],
     [16.5, -2.5, -Math.PI / 2.2, '#ffd23f'], [16.5, 2, -Math.PI / 2.2, '#35e9ff']]
      .forEach(([x, z, ry, c], i) => {
        const game = picks[i];
        const cb = arcadeCab(x, z, ry, c, game);
        s.add(cb.group);
        if (game) cabs.push({ type: 'cab', game, x: x + (x < 0 ? 2.2 : -2.2), z, ...cb, color: c });
      });

    s.add(tvSet(-18.4, 7.5, -5, Math.PI / 2)); s.add(tvSet(18.4, 7.5, -5, -Math.PI / 2));
    s.add(tvSet(-18.4, 7.5, 3, Math.PI / 2)); s.add(tvSet(18.4, 7.5, 3, -Math.PI / 2));

    const vend = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0e1f16, emissive: 0xff2d78, emissiveIntensity: .18 }));
    vend.position.set(-17.6, 2, 8); vend.rotation.y = Math.PI / 2.6; s.add(vend);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ color: 0x14261b }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, .01, 12); s.add(rug);
    for (let i = 0; i < 14; i++) {
      const dot = new THREE.Mesh(new THREE.PlaneGeometry(.3, .3),
        new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: .5 }));
      dot.rotation.x = -Math.PI / 2; dot.position.set(0, .02, 10 - i * 1.6); s.add(dot);
    }

    s.userData = { doors, cabs, tubes, signL };
    return s;
  }

  /* ================= SALA: cajas de cartucho flotando ================= */
  function gameBox(game, color) {
    const grp = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: .85 });
    const spine = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.55), roughness: .7 });
    const portada = game.mini || game.thumb;
    const front = portada
      ? new THREE.MeshBasicMaterial({ map: pixTex(portada, game.name, color) })
      : new THREE.MeshBasicMaterial({ map: tituloTex(game.name, color) });
    const backMat = game.back
      ? new THREE.MeshBasicMaterial({ map: pixTex(game.back) })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.22) });
    // orden de caras: +x, -x, +y, -y, +z(portada), -z(contraportada)
    const box = new THREE.Mesh(new THREE.BoxGeometry(3.1, 4.2, .62),
      [spine, spine, dark, dark, front, backMat]);
    grp.add(box);
    return { grp, box, halo: null };
  }

  /* ================= SALAS GRANDES =================
     Galería abierta de dos plantas: los juegos ocupan TODO el ancho, bien separados
     y flotando sobre su pedestal como en la sala pequeña. Cada letra tiene su arco
     y su letrero colgado del techo. Al fondo, el jardín y la rampa a la planta alta. */
  const ALTO_PISO = 9.5;
  const COLS = 12, PASO_COL = 7.2, PASO_FILA = 9.6, ANCHO = 46;
  const GEO_CAJA = new THREE.BoxGeometry(3.1, 4.2, .62);
  const GEO_PED = new THREE.CylinderGeometry(.95, 1.2, .26, 10);

  function letraDe(nombre) {
    const c = String(nombre || '#').trim().charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  }
  function letraTex(letra, color) {
    return texCanvas(256, 256, ctx => {
      ctx.clearRect(0, 0, 256, 256);
      ctx.font = '160px PS2P, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = color; ctx.shadowBlur = 46;
      ctx.fillStyle = color; ctx.fillText(letra, 128, 142); ctx.fillText(letra, 128, 142);
      ctx.shadowBlur = 0; ctx.fillStyle = '#f2fff6'; ctx.globalAlpha = .93;
      ctx.fillText(letra, 128, 142);
    }, 'letraB' + letra + color);
  }

  function buildHall(sys) {
    const color = SYSCOLOR[sys] || '#39ff88';
    const col3 = new THREE.Color(color);
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x01040a);
    s.fog = new THREE.Fog(0x01040a, 34, 104);
    s.add(new THREE.AmbientLight(0x4a5f80, 2.6));
    s.add(new THREE.HemisphereLight(0x6f8fc0, 0x0b1424, 1.5));
    const sol = new THREE.DirectionalLight(0xb2ccff, .75); sol.position.set(10, 30, 14); s.add(sol);
    const foco = new THREE.PointLight(col3, 0, 14); foco.position.set(0, 4, 0); s.add(foco);

    const juegos = (window.SALA_GAMES || []).filter(g => g.sys === sys);
    const porLetra = new Map();
    juegos.forEach(g => {
      const l = letraDe(g.name);
      if (!porLetra.has(l)) porLetra.set(l, []);
      porLetra.get(l).push(g);
    });
    const letras = [...porLetra.keys()].sort();
    // cuantos más juegos, más plantas: ninguna galería debe hacerse interminable
    const PLANTAS = Math.min(4, Math.max(1, Math.ceil(juegos.length / 260)));
    const porPlanta = juegos.length / PLANTAS;
    let acum = 0;
    const planta = new Map();
    letras.forEach(l => {
      planta.set(l, Math.min(PLANTAS - 1, Math.floor(acum / porPlanta)));
      acum += porLetra.get(l).length;
    });

    const slots = [], fijos = [], letreros = [], indice = {};

    /* --- una zona por letra, ocupando todo el ancho --- */
    function zonaLetra(letra, lista, piso, z0) {
      const filas = Math.ceil(lista.length / COLS);
      const yBase = piso * ALTO_PISO;

      // arco de entrada a la letra
      const arco = new THREE.Group();
      const barra = new THREE.Mesh(new THREE.BoxGeometry(ANCHO * 2, .6, .9),
        new THREE.MeshStandardMaterial({ color: 0x0c1526, emissive: col3, emissiveIntensity: .75 }));
      barra.position.y = 7.6; arco.add(barra);
      [-1, 1].forEach(l => {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(.8, 7.6, .9),
          new THREE.MeshStandardMaterial({ color: 0x0a1120, emissive: col3, emissiveIntensity: .35 }));
        pil.position.set(l * (ANCHO - .4), 3.8, 0); arco.add(pil);
      });
      const car = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6),
        new THREE.MeshBasicMaterial({ map: letraTex(letra, color), transparent: true }));
      car.position.set(0, 6.2, .6); arco.add(car);
      arco.position.set(0, yBase, z0 + 1.5); s.add(arco);
      letreros.push({ m: car, ph: Math.random() * 6 });

      lista.forEach((g, i) => {
        const c = i % COLS, fila = Math.floor(i / COLS);
        slots.push({
          game: g, piso,
          x: (c - (COLS - 1) / 2) * PASO_COL,
          y: yBase + 3.1 + (i % 3) * .5,
          z: z0 - 4 - fila * PASO_FILA,
          ph: i * .8 + fila
        });
      });
      indice[letra] = { x: 0, z: z0 - 3, piso };
      return filas * PASO_FILA + 9;
    }

    const cursor = new Array(PLANTAS).fill(-6);
    letras.forEach(l => {
      const p = planta.get(l);
      cursor[p] -= zonaLetra(l, porLetra.get(l), p, cursor[p]);
    });
    const FONDO = Math.min(...cursor) - 8;          // todas las plantas miden lo mismo
    const JARDIN = FONDO - 62;

    /* --- suelos, techos y paredes --- */
    const sueloTex = texCanvas(64, 64, ctx => {
      ctx.fillStyle = '#050914'; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = color; ctx.globalAlpha = .34; ctx.lineWidth = 1;
      ctx.strokeRect(.5, .5, 63, 63);
    }, 'hallfloor2' + sys);
    sueloTex.wrapS = sueloTex.wrapT = THREE.RepeatWrapping;
    const largo = Math.abs(FONDO) + 24;
    sueloTex.repeat.set(ANCHO / 3.2, largo / 6.4);
    const zc = FONDO / 2 + 6;
    for (let piso = 0; piso < PLANTAS; piso++) {
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 2, largo),
        new THREE.MeshStandardMaterial({ map: sueloTex, roughness: .5, metalness: .45 }));
      suelo.rotation.x = -Math.PI / 2;
      suelo.position.set(0, piso * ALTO_PISO + .01, zc); s.add(suelo);
      // franja luminosa por el centro, para no perderse
      const guia = new THREE.Mesh(new THREE.PlaneGeometry(1.1, largo),
        new THREE.MeshBasicMaterial({ color: col3, transparent: true, opacity: .22 }));
      guia.rotation.x = -Math.PI / 2; guia.position.set(0, piso * ALTO_PISO + .05, zc); s.add(guia);
      // paredes laterales con tubos de neón
      [-1, 1].forEach(l => {
        const pared = new THREE.Mesh(new THREE.BoxGeometry(.7, ALTO_PISO, largo),
          new THREE.MeshStandardMaterial({ color: 0x070d1a, roughness: .9 }));
        pared.position.set(l * (ANCHO + .35), piso * ALTO_PISO + ALTO_PISO / 2, zc); s.add(pared);
        for (let z = 4; z > FONDO; z -= 26) {
          const tubo = new THREE.Mesh(new THREE.BoxGeometry(.3, ALTO_PISO - 2.6, .3),
            new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: col3, emissiveIntensity: 1.1 }));
          tubo.position.set(l * (ANCHO - .3), piso * ALTO_PISO + ALTO_PISO / 2, z); s.add(tubo);
        }
      });
      // tiras de luz en el techo, que si no la galería es una cueva
      for (let z = 2; z > FONDO; z -= 15) {
        [-1, 1].forEach(l => {
          const tira = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * .8, 1.5),
            new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: .5 }));
          tira.rotation.x = Math.PI / 2;
          tira.position.set(l * ANCHO / 2, piso * ALTO_PISO + ALTO_PISO - .25, z); s.add(tira);
        });
      }
      // zona de descanso al final de la planta: bancos y macetas, para que no quede pelado
      const zFin = FONDO + 5;
      for (let i = 0; i < 6; i++) {
        const bx = (i % 2 ? 1 : -1) * (10 + (i % 3) * 9), bz = zFin - Math.floor(i / 2) * 7;
        const banco = new THREE.Mesh(new THREE.BoxGeometry(4.4, .45, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x14243d, roughness: .8 }));
        banco.position.set(bx, piso * ALTO_PISO + 1.05, bz); s.add(banco);
        [-1.7, 1.7].forEach(dx => {
          const pata = new THREE.Mesh(new THREE.BoxGeometry(.4, 1, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x0c1626 }));
          pata.position.set(bx + dx, piso * ALTO_PISO + .5, bz); s.add(pata);
        });
        const maceta = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x2a1d16 }));
        maceta.position.set(bx + 4.2, piso * ALTO_PISO + .6, bz); s.add(maceta);
        const mata = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 2),
          new THREE.MeshStandardMaterial({ color: i % 2 ? 0x1d7a3a : 0x2aa04c, roughness: .95 }));
        mata.position.set(bx + 4.2, piso * ALTO_PISO + 2.3, bz); s.add(mata);
      }
      // rótulo de la planta, bien grande
      const rot = new THREE.Mesh(new THREE.PlaneGeometry(12, 3),
        new THREE.MeshBasicMaterial({ map: neonText('PLANTA ' + (piso + 1), color, 40), transparent: true }));
      rot.position.set(0, piso * ALTO_PISO + 6.4, 8); rot.rotation.y = Math.PI; s.add(rot);
    }
    // techo de la planta alta: cielo estrellado
    const estrellas = texCanvas(128, 128, ctx => {
      ctx.fillStyle = '#02040c'; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 120; i++) {
        ctx.globalAlpha = .3 + Math.random() * .7; ctx.fillStyle = '#dff1ff';
        ctx.fillRect(Math.random() * 128 | 0, Math.random() * 128 | 0, 1, 1);
      }
    }, 'estrellas');
    estrellas.wrapS = estrellas.wrapT = THREE.RepeatWrapping; estrellas.repeat.set(6, largo / 20);
    const techo = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 2, largo),
      new THREE.MeshBasicMaterial({ map: estrellas }));
    techo.rotation.x = Math.PI / 2; techo.position.set(0, ALTO_PISO * PLANTAS + 2, zc); s.add(techo);

    /* --- jardín al fondo --- */
    const cesped = texCanvas(64, 64, ctx => {
      ctx.fillStyle = '#0b2a18'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#134d28';
      for (let i = 0; i < 110; i++) ctx.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 3);
    }, 'cesped');
    cesped.wrapS = cesped.wrapT = THREE.RepeatWrapping; cesped.repeat.set(12, 12);
    const jard = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 2, 64),
      new THREE.MeshStandardMaterial({ map: cesped, roughness: .95 }));
    jard.rotation.x = -Math.PI / 2; jard.position.set(0, .02, FONDO - 31); s.add(jard);
    const luna = new THREE.PointLight(0xa8d8ff, 26, 90); luna.position.set(-12, 20, FONDO - 30); s.add(luna);

    for (let i = 0; i < 22; i++) {
      const ax = (Math.random() - .5) * (ANCHO * 1.8);
      const az = FONDO - 8 - Math.random() * 50;
      if (Math.abs(ax) < 13 && az > FONDO - 40) continue;         // dejar libre la rampa
      const tronco = new THREE.Mesh(new THREE.BoxGeometry(.55, 2.4, .55),
        new THREE.MeshStandardMaterial({ color: 0x4a3220 }));
      tronco.position.set(ax, 1.2, az); s.add(tronco);
      const copaMat = new THREE.MeshStandardMaterial({ color: i % 3 ? 0x1d7a3a : 0x2aa04c, roughness: .9 });
      [[2.2, 1.5, 0], [1.6, 1.1, 1.3]].forEach(([w, hh, dy]) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), copaMat);
        c.position.set(ax, 2.9 + dy, az); s.add(c);
      });
    }
    for (let i = 0; i < 8; i++) {
      const fx = (i % 2 ? 1 : -1) * (ANCHO - 6), fz = FONDO - 6 - Math.floor(i / 2) * 15;
      const p = new THREE.Mesh(new THREE.BoxGeometry(.3, 4.4, .3),
        new THREE.MeshStandardMaterial({ color: 0x101820 }));
      p.position.set(fx, 2.2, fz); s.add(p);
      const bomb = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .9),
        new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffd23f, emissiveIntensity: 1.7 }));
      bomb.position.set(fx, 4.8, fz); s.add(bomb);
    }

    /* --- rampas al fondo, cada una en su carril, volando sobre el jardín --- */
    const rampas = [];
    const CARRIL = [-30, 30, -14, 14];
    for (let k = 0; k < PLANTAS - 1; k++) {
      const xc = CARRIL[k % CARRIL.length];
      const R = { xMin: xc - 8, xMax: xc + 8, base: k * ALTO_PISO, y: (k + 1) * ALTO_PISO,
                  zBajo: FONDO - 42, zAlto: FONDO + 2 };
      rampas.push(R);
      const largoR = R.zAlto - R.zBajo, desnivel = R.y - R.base;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(16, .6, Math.hypot(largoR, desnivel)),
        new THREE.MeshStandardMaterial({ color: 0x0e1a33, emissive: col3, emissiveIntensity: .3 }));
      ramp.position.set(xc, (R.base + R.y) / 2, (R.zBajo + R.zAlto) / 2);
      ramp.rotation.x = Math.atan2(desnivel, largoR); s.add(ramp);
      [-1, 1].forEach(l => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.1, Math.hypot(largoR, desnivel)),
          new THREE.MeshStandardMaterial({ color: 0x0d1730, emissive: col3, emissiveIntensity: .85 }));
        b.position.set(xc + l * 8, (R.base + R.y) / 2 + .85, (R.zBajo + R.zAlto) / 2);
        b.rotation.x = ramp.rotation.x; s.add(b);
      });
      const cartelR = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5),
        new THREE.MeshBasicMaterial({ map: neonText('▲ PLANTA ' + (k + 2), color, 38), transparent: true }));
      cartelR.position.set(xc, R.base + 4.4, R.zBajo - 3); cartelR.rotation.y = Math.PI; s.add(cartelR);
    }

    /* --- favoritos en el jardín --- */
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem('sala_fav') || '[]'); } catch (e) {}
    const enJardin = juegos.filter(g => favs.includes(g.rom)).slice(0, 10);
    while (enJardin.length < 8 && juegos.length) {
      const g = juegos[Math.floor(Math.random() * juegos.length)];
      if (!enJardin.includes(g)) enJardin.push(g);
    }
    enJardin.forEach((g, i) => {
      const ang = (i / enJardin.length) * Math.PI * 2;
      slots.push({ game: g, piso: 0, x: Math.cos(ang) * 19, y: 3.1,
                   z: FONDO - 26 + Math.sin(ang) * 13, ph: i * .9 });
    });
    const cartelJ = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75),
      new THREE.MeshBasicMaterial({ map: neonText('JARDÍN', '#39ff88', 44), transparent: true }));
    cartelJ.position.set(0, 6.5, FONDO - 12); cartelJ.rotation.y = Math.PI; s.add(cartelJ);

    /* --- salida --- */
    const back = new THREE.Group();
    const bframe = new THREE.Mesh(new THREE.BoxGeometry(4.4, 6.2, .5),
      new THREE.MeshStandardMaterial({ color: 0x101c30 }));
    bframe.position.y = 3.1; back.add(bframe);
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.3),
      new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: 0xffd23f, emissiveIntensity: .3, side: THREE.DoubleSide }));
    bl.position.set(0, 2.9, .3); back.add(bl);
    const blab = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25),
      new THREE.MeshBasicMaterial({ map: neonText('SALIR', '#ffd23f'), transparent: true }));
    blab.position.set(0, 6.8, .32); back.add(blab);
    back.position.set(0, 0, 11); back.rotation.y = Math.PI; s.add(back);
    const luzSalida = new THREE.PointLight(0xffd23f, 6, 15); luzSalida.position.set(0, 3, 9); s.add(luzSalida);
    fijos.push({ type: 'exit', x: 0, z: 11, group: back, leaf: bl });

    const title = new THREE.Mesh(new THREE.PlaneGeometry(10, 5),
      new THREE.MeshBasicMaterial({ map: wordmark(sys), transparent: true }));
    title.position.set(0, 14.5, -2); s.add(title);

    s.userData = {
      items: fijos, fijos, slots, letreros, foco, color, indice, rampas, plantas: PLANTAS,
      count: juegos.length, shown: juegos.length, fondo: FONDO,
      deep: JARDIN, limX: ANCHO - 2, limZ: [FONDO - 58, 12]
    };
    return s;
  }

  /* --- crear y destruir cajas según te acercas --- */
  function crearCaja(sl, color) {
    const g = sl.game;
    const dark = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: .85 });
    const spine = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.55), roughness: .7 });
    const portada = g.mini || g.thumb;
    const front = portada ? new THREE.MeshBasicMaterial({ map: pixTex(portada, g.name, color) })
                          : new THREE.MeshBasicMaterial({ map: tituloTex(g.name, color) });
    const backMat = g.back ? new THREE.MeshBasicMaterial({ map: pixTex(g.back) })
                           : new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.22) });
    const grp = new THREE.Group();
    const box = new THREE.Mesh(GEO_CAJA, [spine, spine, dark, dark, front, backMat]);
    grp.add(box);
    grp.userData.hasBack = !!g.back;
    grp.position.set(sl.x, sl.y, sl.z);
    const ped = new THREE.Mesh(GEO_PED, new THREE.MeshStandardMaterial({
      color: 0x0a1424, emissive: new THREE.Color(color), emissiveIntensity: .3 }));
    const yPiso = (sl.piso || 0) * ALTO_PISO;
    ped.position.set(sl.x, yPiso + .13, sl.z);
    const alto = Math.max(.5, sl.y - ped.position.y);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.16, 1.02, alto, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: .06, side: THREE.DoubleSide }));
    beam.position.set(sl.x, ped.position.y + alto / 2, sl.z);
    return { type: 'game', game: g, group: grp, box, halo: null, pl: null, ped, beam,
             x: sl.x, z: sl.z, y: sl.y, baseY: sl.y, ph: sl.ph, slot: sl };
  }
  function tirarCaja(sl) {
    const it = sl.it;
    if (!it) return;
    [it.group, it.ped, it.beam].forEach(o => { if (o && o.parent) o.parent.remove(o); });
    it.box.material.forEach(m => { if (m.map && m.map.dispose) m.map.dispose(); m.dispose(); });
    it.ped.material.dispose(); it.beam.material.dispose();
    sl.it = null;
  }
  let tRefresco = 0;
  function refrescarCercanos(force) {
    const ud = scene.userData;
    if (!ud || !ud.slots) return;
    const px = kid.position.x, pz = kid.position.z, py = kid.position.y;
    let cambio = false;
    ud.slots.forEach(sl => {
      const d = Math.hypot(px - sl.x, pz - sl.z) + Math.abs(py - (sl.piso ? ALTO_PISO : 0)) * 1.6;
      if (d < 44 && !sl.it) {
        sl.it = crearCaja(sl, ud.color);
        scene.add(sl.it.group); scene.add(sl.it.ped); scene.add(sl.it.beam);
        cambio = true;
      } else if (d > 62 && sl.it) { tirarCaja(sl); cambio = true; }
    });
    if (cambio || force) {
      interactables = ud.fijos.concat(ud.slots.filter(x => x.it).map(x => x.it));
      ud.items = interactables;
    }
  }

  /* --- altura del suelo bajo los pies ---
     Regla clave: una rampa o un piso solo te "cogen" si están a la altura de tus pies.
     Sin eso, al pasar por debajo de la rampa salías disparado hacia arriba. */
  function alturaSuelo(x, z) {
    const ud = scene.userData;
    if (mode !== 'hall' || !ud || !ud.rampas) return 0;
    const TOL = 2.7;
    // 1) rampas: solo te suben si están a la altura de tus pies (si no, al pasar por debajo salías disparado)
    for (const R of ud.rampas) {
      const zMin = Math.min(R.zBajo, R.zAlto), zMax = Math.max(R.zBajo, R.zAlto);
      if (x > R.xMin - .6 && x < R.xMax + .6 && z > zMin - .6 && z < zMax + .6) {
        const t = THREE.MathUtils.clamp((z - R.zBajo) / (R.zAlto - R.zBajo), 0, 1);
        const h = R.base + t * (R.y - R.base);
        if (Math.abs(h - alturaKid) < TOL) return h;
      }
    }
    // 2) la planta en la que estés, mientras pises su superficie
    if (z > ud.fondo - 4 && z < 15 && Math.abs(x) < ud.limX + 1) {
      const piso = Math.round(alturaKid / ALTO_PISO);
      if (piso >= 0 && piso < ud.plantas && Math.abs(piso * ALTO_PISO - alturaKid) < TOL) return piso * ALTO_PISO;
    }
    return 0;
  }

  /* --- partículas de polvo al aterrizar --- */
  const dust = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22),
      new THREE.MeshBasicMaterial({ color: 0xbdf7d8, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.visible = false;
    dust.push({ m, life: 0, vx: 0, vz: 0 });
  }
  function puff(x, z, power) {
    dust.forEach((d, i) => {
      if (d.life > 0) return;
      const a = (i / dust.length) * Math.PI * 2 + Math.random();
      d.m.position.set(x, .06, z);
      d.vx = Math.cos(a) * (1.6 + Math.random()) * power;
      d.vz = Math.sin(a) * (1.6 + Math.random()) * power;
      d.life = .5 + Math.random() * .25;
      d.m.visible = true; d.m.material.opacity = .5; d.m.scale.setScalar(1);
    });
  }

  /* ================= estado ================= */
  const kid = buildKid();
  const OTROS = new Map();                 // usuario -> muñeco de otro jugador
  const addExtras = (sc) => {
    sc.add(kid);
    dust.forEach(d => sc.add(d.m));
    OTROS.forEach(o => sc.add(o.g));       // los demás también viajan de sala en sala
  };
  scene = buildLobby(); addExtras(scene);
  kid.position.set(0, 0, 13);
  interactables = [...scene.userData.doors, ...scene.userData.cabs];

  /* ================= OTROS JUGADORES EN LA SALA =================
     Cada uno avisa de su posición tres veces por segundo. Los demás se dibujan
     interpolando entre avisos, así se mueven suaves aunque la red vaya a tirones. */
  const YO = localStorage.getItem('sala_user') || '';
  const MI_DEV = (matchMedia('(pointer: coarse)').matches || innerWidth < 821) ? 'movil' : 'pc';
  const ICONO_DEV = { movil: '📱', pc: '🖥' };
  const RITMO = 320;                       // ms entre avisos
  let andandoYo = false, miBurbuja = null, miBurbujaT = 0;

  function colorUsuario(nombre) {
    let h = 0;
    for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
    return new THREE.Color().setHSL((h % 360) / 360, .72, .6);
  }

  // cartelito flotante: nombre arriba y, si toca, a qué está jugando debajo
  /* insignia por nivel: NOVATO nada, HABITUAL ✦, VICIADO ★, MÁQUINA ⚡,
     LEYENDA ♛ (brilla), DUEÑO DE LA SALA 👑 (brilla) */
  const INSIGNIA = [null, ['✦', '#39ff88'], ['★', '#35e9ff'], ['⚡', '#ffd23f'],
                    ['♛', '#b898ff'], ['👑', '#ff2d78']];

  function lienzoTexto(titulo, sub, color, burbuja, dev, nv) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = burbuja ? 200 : 150;
    const g = cv.getContext('2d');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const hex = '#' + color.getHexString();
    if (burbuja) {
      g.fillStyle = 'rgba(6, 12, 10, .92)';
      g.strokeStyle = hex; g.lineWidth = 5;
      const r = 22, w = 496, h = 130, x = 8, y = 8;
      g.beginPath(); g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      g.fill(); g.stroke();
      g.beginPath(); g.moveTo(236, y + h); g.lineTo(256, y + h + 34); g.lineTo(276, y + h); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#d8ffe8'; g.font = '30px PS2P, monospace';
      const palabras = String(titulo).split(' ');
      const filas = ['']; 
      palabras.forEach(p => {
        const linea = filas[filas.length - 1];
        if (g.measureText((linea ? linea + ' ' : '') + p).width > 450 && linea) filas.push(p);
        else filas[filas.length - 1] = (linea ? linea + ' ' : '') + p;
      });
      filas.slice(0, 3).forEach((f, i) => g.fillText(f, 256, 46 + i * 36));
    } else {
      const ins = INSIGNIA[nv || 0];
      g.fillStyle = 'rgba(4, 10, 8, .74)';
      g.fillRect(96, 26, 320, sub ? 92 : 56);
      g.fillStyle = ins && (nv || 0) >= 3 ? ins[1] : hex;      // desde MÁQUINA, el marco es del nivel
      g.fillRect(96, 26, 320, 4); g.fillRect(96, sub ? 114 : 78, 320, 4);
      g.font = '30px PS2P, monospace'; g.fillStyle = hex;
      const nom = String(titulo).toUpperCase().slice(0, 11);
      const ancho = g.measureText(nom).width;
      if ((nv || 0) >= 4 && ins) { g.shadowColor = ins[1]; g.shadowBlur = 20; }  // las leyendas brillan
      const cx = dev ? 256 + 15 : 256;
      g.fillText(nom, cx, 54);
      g.shadowBlur = 0;
      g.font = '26px system-ui, sans-serif';
      if (dev) g.fillText(dev === 'movil' ? '📱' : '🖥', cx - ancho / 2 - 27, 56);
      if (ins) { g.fillStyle = ins[1]; g.fillText(ins[0], cx + ancho / 2 + 24, 55); }
      if (sub) {
        g.font = '19px PS2P, monospace'; g.fillStyle = '#9fd8bd';
        g.fillText(String(sub).toUpperCase().slice(0, 22), 256, 95);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    return tex;
  }
  function hacerSprite(tex, ancho, alto, y) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true,
      depthTest: false, depthWrite: false }));
    sp.scale.set(ancho, alto, 1); sp.position.set(0, y, 0); sp.renderOrder = 998;
    return sp;
  }
  function tirarSprite(g, sp) {
    if (!sp) return;
    if (sp.parent) sp.parent.remove(sp);
    if (sp.material.map) sp.material.map.dispose();
    sp.material.dispose();
  }

  // los acentos rosas del muñeco pasan al color de cada usuario, para distinguirlos
  function tintar(g, color) {
    g.traverse(o => {
      if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xff2d78) {
        o.material = o.material.clone();
        o.material.color.copy(color);
      }
    });
  }

  function ponerCartel(o, sub) {
    if (o.cartel) tirarSprite(o.g, o.cartel);
    o.sub = sub || '';
    o.cartel = hacerSprite(lienzoTexto(o.user, o.sub, o.col, false, o.dev, o.nv), 2.1, .62, 2.95);
    o.g.add(o.cartel);
  }
  function ponerBurbuja(o, texto) {
    if (o.burbuja) tirarSprite(o.g, o.burbuja);
    o.burbuja = hacerSprite(lienzoTexto(texto, '', o.col, true), 2.7, 1.06, 3.85);
    o.g.add(o.burbuja);
    o.bT = 7;
  }
  function crearOtro(user, fijo) {
    const col = colorUsuario(user);
    const g = buildKid();
    tintar(g, col);
    const o = { user, g, col, dev: 'pc', nv: 0, fijo: !!fijo, dest: new THREE.Vector3(), destRy: 0,
                anim: 'idle', paso: Math.random() * 6, cartel: null, burbuja: null, bT: 0, bTs: 0, sub: null };
    ponerCartel(o, '');
    OTROS.set(user, o);
    scene.add(g);
    return o;
  }
  function quitarOtro(user) {
    const o = OTROS.get(user);
    if (!o) return;
    tirarSprite(o.g, o.cartel); tirarSprite(o.g, o.burbuja);
    if (o.g.parent) o.g.parent.remove(o.g);
    OTROS.delete(user);
  }

  /* --- ida y vuelta con el servidor --- */
  function miModo() { return mode === 'lobby' ? 'lobby' : 'hall:' + (hallSys || ''); }
  function miAnim() { return emote ? emote : (airborne ? 'jump' : (andandoYo ? 'walk' : 'idle')); }

  function sincronizar() {
    if (!YO) return;
    const modo = miModo();
    fetch('/api/pos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: +kid.position.x.toFixed(2), z: +kid.position.z.toFixed(2),
                             ry: +kid.rotation.y.toFixed(2), anim: miAnim(), mode: modo,
                             dev: MI_DEV }) }).catch(() => {});
    fetch('/api/pos').then(r => r.json()).then(d => aplicarGente(d, modo)).catch(() => {});
  }

  function aplicarGente(d, modo) {
    const vistos = new Set();
    (d.gente || []).forEach(p => {
      if (p.mode !== modo) return;                  // solo se ve a quien está donde tú
      vistos.add(p.user);
      let o = OTROS.get(p.user);
      if (!o || o.fijo) { if (o) quitarOtro(p.user); o = crearOtro(p.user, false); }
      if (!o.g.parent) scene.add(o.g);
      o.dest.set(p.x, 0, p.z); o.destRy = p.ry; o.anim = p.anim || 'idle';
      if (o.dev !== (p.dev || 'pc') || o.nv !== (p.nv || 0)) {
        o.dev = p.dev || 'pc'; o.nv = p.nv || 0; o.sub = null;
      }
      if (o.sub !== '') ponerCartel(o, '');
    });
    // quien está dentro de una partida sale de pie junto a la puerta de su sistema
    if (modo === 'lobby') {
      const puertas = (scene.userData.doors || []);
      (d.jugando || []).forEach(p => {
        const pu = puertas.find(x => x.sys === p.sys);
        if (!pu) return;
        vistos.add(p.user);
        let o = OTROS.get(p.user);
        if (!o || !o.fijo) { if (o) quitarOtro(p.user); o = crearOtro(p.user, true); }
        if (!o.g.parent) scene.add(o.g);
        o.g.position.set(pu.x + 1.5, 0, pu.z + 2.4);
        o.g.rotation.y = .35;
        const sub = (p.sala ? '2P · ' : '') + (p.juego || 'jugando');
        if (o.dev !== (p.dev || 'pc') || o.nv !== (p.nv || 0)) {
          o.dev = p.dev || 'pc'; o.nv = p.nv || 0; o.sub = null;
        }
        if (o.sub !== sub) ponerCartel(o, sub);
      });
    }
    // bocadillos de chat sobre la cabeza
    (d.burbujas || []).forEach(m => {
      if (m.user === YO) { if (m.ts > miBurbujaT) { miBurbujaT = m.ts; ponerMiBurbuja(m.texto); } return; }
      const o = OTROS.get(m.user);
      if (o && m.ts > o.bTs) { o.bTs = m.ts; ponerBurbuja(o, m.texto); }
    });
    OTROS.forEach((o, u) => { if (!vistos.has(u)) quitarOtro(u); });
    pintarVs(d);
    pintarHud(d, modo);
  }

  /* --- cartel de PARTIDA ACTIVA: dos (o más) en la misma sala de red --- */
  function pintarVs(d) {
    let b = document.getElementById('vsBanner');
    const grupos = {};
    (d.jugando || []).forEach(p => {
      if (!p.sala) return;
      const k = p.juego || '?';
      (grupos[k] = grupos[k] || []).push(String(p.user).toUpperCase());
    });
    const filas = Object.entries(grupos).filter(([, us]) => us.length >= 2)
      .map(([j, us]) => `⚔ ${us.map(esc).join(' <i>vs</i> ')} · <em>${esc(j.slice(0, 26))}</em>`);
    if (!filas.length) { if (b) b.classList.remove('on'); return; }
    if (!b) { b = document.createElement('div'); b.id = 'vsBanner'; document.body.appendChild(b); }
    const html = `<u>PARTIDA ACTIVA</u>` + filas.map(f => `<span>${f}</span>`).join('');
    if (b._html !== html) { b._html = html; b.innerHTML = html; }
    b.classList.add('on');
  }

  function ponerMiBurbuja(texto) {
    if (miBurbuja) tirarSprite(kid, miBurbuja);
    miBurbuja = hacerSprite(lienzoTexto(texto, '', new THREE.Color(0x39ff88), true), 2.7, 1.06, 3.85);
    kid.add(miBurbuja);
    miBurbujaT2 = 7;
  }
  let miBurbujaT2 = 0;

  /* --- animación de los demás --- */
  function moverOtros(dt, t) {
    OTROS.forEach(o => {
      const g = o.g, u = g.userData;
      if (!o.fijo) {
        const dx = o.dest.x - g.position.x, dz = o.dest.z - g.position.z;
        const dist = Math.hypot(dx, dz);
        const k = Math.min(1, dt * 9);
        g.position.x += dx * k; g.position.z += dz * k;
        let diff = ((o.destRy - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        g.rotation.y += diff * Math.min(1, dt * 10);
        if (dist > .05 || o.anim === 'walk') {
          o.paso += dt * 11;
          u.legL.rotation.x = Math.sin(o.paso) * .75; u.legR.rotation.x = -Math.sin(o.paso) * .75;
          u.armL.rotation.x = -Math.sin(o.paso) * .56; u.armR.rotation.x = Math.sin(o.paso) * .56;
          g.position.y = Math.abs(Math.sin(o.paso)) * .07;
        } else if (o.anim === 'dance') {
          o.paso += dt * 9;
          g.rotation.y += dt * 2.6;
          u.armL.rotation.x = -2 + Math.sin(o.paso * 2) * .7;
          u.armR.rotation.x = -2 - Math.sin(o.paso * 2) * .7;
          g.position.y = Math.abs(Math.sin(o.paso * 2)) * .12;
        } else {
          u.legL.rotation.x *= .8; u.legR.rotation.x *= .8;
          u.armL.rotation.x *= .8; u.armR.rotation.x *= .8;
          u.head.rotation.y = Math.sin(t * .6 + o.paso) * .25;
          g.position.y = Math.sin(t * 1.6 + o.paso) * .02;
        }
      } else {
        g.position.y = Math.sin(t * 1.4 + o.paso) * .03;   // el que juega, quietecito respirando
        u.head.rotation.y = Math.sin(t * .5 + o.paso) * .3;
      }
      if (o.burbuja) { o.bT -= dt; if (o.bT <= 0) { tirarSprite(o.g, o.burbuja); o.burbuja = null; } }
    });
    if (miBurbuja) { miBurbujaT2 -= dt; if (miBurbujaT2 <= 0) { tirarSprite(kid, miBurbuja); miBurbuja = null; } }
  }

  /* --- panel de "quién anda por aquí" --- */
  const esc = (s) => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function pintarHud(d, modo) {
    let h = document.getElementById('salaHud');
    if (!h) {
      h = document.createElement('div');
      h.id = 'salaHud';
      document.body.appendChild(h);
    }
    const filas = [];
    filas.push(`<i style="background:#39ff88"></i><b>${ICONO_DEV[MI_DEV]} ${esc(YO || 'tú')}</b>` +
               `<s>${modo === 'lobby' ? 'en la sala' : 'en ' + esc(modo.slice(5))}</s>`);
    const glifo = (p) => {
      const i = INSIGNIA[p.nv || 0];
      return i ? `<b style="color:${i[1]}">${i[0]}</b>` : '';
    };
    const medallas = (p) => p.lg ? ` · 🏅${p.lg}` : '';
    (d.gente || []).forEach(p => filas.push(
      `<i style="background:#${colorUsuario(p.user).getHexString()}"></i>` +
      `<b>${ICONO_DEV[p.dev] || ICONO_DEV.pc} ${esc(p.user)}</b>${glifo(p)}` +
      `<s>${p.mode === 'lobby' ? 'en la sala' : 'en ' + esc(p.mode.slice(5))}${medallas(p)}</s>`));
    (d.jugando || []).forEach(p => filas.push(
      `<i style="background:#${colorUsuario(p.user).getHexString()}"></i>` +
      `<b>${ICONO_DEV[p.dev] || ICONO_DEV.pc} ${esc(p.user)}</b>${glifo(p)}` +
      `<s>${p.sala ? '⚔' : '▶'} ${esc((p.juego || 'jugando').slice(0, 22))}${medallas(p)}</s>`));
    h.classList.add('on');
    h.innerHTML = `<u>EN LÍNEA · ${filas.length}</u>` + filas.map(f => `<span>${f}</span>`).join('') +
                  `<em>pulsa T para hablar</em>`;
  }

  // la primera llamada, ya con todo el init terminado (si no, variables aún sin nacer)
  setTimeout(() => { sincronizar(); setInterval(sincronizar, RITMO); }, 400);


  const prompt = document.getElementById('enterPrompt');
  const hint = document.getElementById('hudHint');
  const keys = {};
  let controls = false, autoWalk = true, lastNear = null;
  let vy = 0, jumpY = 0, jumps = 0, airborne = false, alturaKid = 0;
  let emote = null, emoteT = 0, idleT = 0, running = false;
  function doJump() {
    if (!controls || entering || jumps >= 2) return;
    vy = jumps === 0 ? 9.2 : 7.6;
    jumps++; airborne = true; emote = null;
    puff(kid.position.x, kid.position.z, .5);
    sfx(jumps === 1 ? 'jump' : 'jump2');
  }
  function doEmote(kind) {
    if (!controls || entering || airborne) return;
    emote = kind; emoteT = 0;
    sfx(kind === 'dance' ? 'dance' : 'punch');
  }

  addEventListener('sala:coin', () => {
    setTimeout(() => {
      autoWalk = false; controls = true;
      if (hint) {
        hint.textContent = T('hintMove'); hint.style.opacity = 1;
        setTimeout(() => { hint.textContent = T('hintPad'); }, 6500);
        setTimeout(() => hint.style.opacity = 0, 12000);
      }
    }, 1900);
  });
  if (!document.getElementById('preloader')) { autoWalk = false; controls = true; }
  addEventListener('sala:games', () => { if (mode === 'lobby') rebuildLobby(); else if (hallSys) goHall(hallSys); });

  addEventListener('keydown', e => {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (scrollY < innerHeight * .7 && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if ((k === 'enter' || k === 'e') && near && controls && !entering) activate(near);
    if (k === ' ') doJump();
    if (k === 'q') doEmote('dance');
    if (k === 'f') doEmote('punch');
    if (k === 'escape' && mode === 'hall' && !entering) transition('#ffd23f', goLobby);
    if (mode === 'hall' && (k === 'tab' || k === '`')) { e.preventDefault(); abrirIndice(); return; }
    if (indiceAbierto && /^[a-z0-9#]$/.test(k)) { e.preventDefault(); irALetra(k.toUpperCase()); return; }
    if (indiceAbierto && k === 'escape') { e.preventDefault(); cerrarIndice(); return; }
    if (k === 't') {                                   // hablar por el chat de la sala
      const b = document.getElementById('chatBtn');
      if (b) { e.preventDefault(); b.click(); setTimeout(() => {
        const i = document.getElementById('chatInput'); if (i) i.focus(); }, 120); }
    }
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  function transition(color, cb) {
    entering = true; controls = false;
    sfx('enter');
    if (prompt) prompt.style.display = 'none';
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;z-index:70;background:${color};opacity:0;pointer-events:none`;
    document.body.appendChild(ov);
    gsap.timeline()
      .to(cam, { fov: 24, duration: .6, ease: 'power3.in', onUpdate: () => cam.updateProjectionMatrix() }, 0)
      .to(ov, { opacity: 1, duration: .48, ease: 'power2.in' }, .12)
      .add(cb, .65)
      .set(cam, { fov: 52, onComplete: () => cam.updateProjectionMatrix() })
      .to(ov, { opacity: 0, duration: .75, ease: 'power2.out', delay: .1,
        onComplete: () => { ov.remove(); entering = false; controls = true; } });
  }

  function playGame(g) {
    if (window.SALA_PLAYED) window.SALA_PLAYED(g);
    transition('#eafff2', () => {
      location.href = `player.html?sys=${g.sys}&rom=${encodeURIComponent(g.path)}&name=${encodeURIComponent(g.name)}`;
    });
  }
  function activate(t) {
    if (t.type === 'door') {
      gsap.to(t.leaf.material, { emissiveIntensity: 4.5, duration: .5 });
      gsap.to(t.glow, { intensity: 45, duration: .5 });
      transition(t.color, () => goHall(t.sys));
    } else if (t.type === 'exit') transition('#ffd23f', goLobby);
    else if (t.type === 'game' || t.type === 'cab') playGame(t.game);
  }

  let hallSys = null;
  // gancho para poder saltar a una sala desde fuera (diagnóstico y accesos directos)
  // dónde estoy y a qué altura: sirve para diagnosticar rampas y plantas
  window.SALA_POS = () => ({ x: +kid.position.x.toFixed(1), y: +kid.position.y.toFixed(2),
    z: +kid.position.z.toFixed(1), suelo: +alturaKid.toFixed(2), aire: airborne,
    modo: mode, cajas: (scene.userData.slots || []).filter(s => s.it).length });
  /* --- índice de letras: con 951 juegos hace falta un atajo,
         y no vale usar las teclas sueltas porque W A S D son las de andar --- */
  let indiceAbierto = false;
  function abrirIndice() {
    const ud = scene.userData;
    if (!ud || !ud.indice) return;
    let caja = document.getElementById('salaIndice');
    if (!caja) { caja = document.createElement('div'); caja.id = 'salaIndice'; document.body.appendChild(caja); }
    const letras = Object.keys(ud.indice).sort();
    caja.innerHTML = '<u>IR A LA LETRA · pulsa una tecla o haz clic</u><div>' +
      letras.map(l => `<button data-l="${l}">${l}<s>P${(ud.indice[l].piso || 0) + 1}</s></button>`).join('') +
      '</div><em>ESC para cerrar</em>';
    caja.querySelectorAll('button').forEach(b => b.onclick = () => irALetra(b.dataset.l));
    caja.classList.add('on');
    indiceAbierto = true;
  }
  function cerrarIndice() {
    const caja = document.getElementById('salaIndice');
    if (caja) caja.classList.remove('on');
    indiceAbierto = false;
  }
  function irALetra(L) {
    const ud = scene.userData;
    const destino = (ud.indice || {})[L];
    cerrarIndice();
    if (!destino) return;
    transition(ud.color || '#39ff88', () => {
      alturaKid = (destino.piso || 0) * ALTO_PISO;
      kid.position.set(destino.x, alturaKid, destino.z);
      jumpY = 0; vy = 0; airborne = false;
      refrescarCercanos(true);
      if (hint) { hint.textContent = 'LETRA ' + L + ' · PLANTA ' + ((destino.piso || 0) + 1);
                  hint.style.opacity = 1; setTimeout(() => hint.style.opacity = 0, 2400); }
    });
  }
  window.SALA_LETRA = irALetra;
  window.SALA_UD = () => scene.userData;
  window.SALA_TP = (x, z, piso) => { alturaKid = (piso || 0) * ALTO_PISO;
    kid.position.set(x, alturaKid, z); jumpY = 0; vy = 0; airborne = false;
    refrescarCercanos(true); return 'ok'; };
  window.SALA_IR = (sys) => { try { goHall(sys); return 'ok'; } catch (e) { return 'ERROR: ' + e.message + ' | ' + (e.stack||'').split('\n')[1]; } };
  function goHall(sys) {
    mode = 'hall'; hallSys = sys;
    scene = buildHall(sys); addExtras(scene);
    kid.position.set(0, 0, 5); kid.rotation.y = Math.PI;
    alturaKid = 0; jumpY = 0; vy = 0; airborne = false;
    interactables = scene.userData.fijos;
    refrescarCercanos(true);
    if (hint) {
      const u = scene.userData;
      hint.textContent = (u.shown < u.count ? T('hallSome')(u.shown, u.count) : T('hallAll')(u.count)) +
                         ' · TAB PARA IR A UNA LETRA';
      hint.style.opacity = 1; setTimeout(() => hint.style.opacity = 0, 6500);
    }
  }
  function rebuildLobby() {
    const p = kid.position.clone(), r = kid.rotation.y;
    scene = buildLobby(); addExtras(scene);
    kid.position.copy(p); kid.rotation.y = r;
    interactables = [...scene.userData.doors, ...scene.userData.cabs];
  }
  function goLobby() {
    mode = 'lobby'; hallSys = null;
    scene = buildLobby(); addExtras(scene);
    kid.position.set(0, 0, 7); kid.rotation.y = Math.PI;
    interactables = [...scene.userData.doors, ...scene.userData.cabs];
  }

  /* --- mando: stick/cruceta para moverse, ✕/○ para entrar --- */
  let padPrevEnter = false, padPrevJump = false, padPrevDance = false, padPrevPunch = false;
  function padInput() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let vx = 0, vz = 0, enter = false, jump = false, dance = false, punch = false, run = false;
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > .22) vx += ax;
      if (Math.abs(ay) > .22) vz += ay;
      if (p.buttons[12] && p.buttons[12].pressed) vz -= 1;
      if (p.buttons[13] && p.buttons[13].pressed) vz += 1;
      if (p.buttons[14] && p.buttons[14].pressed) vx -= 1;
      if (p.buttons[15] && p.buttons[15].pressed) vx += 1;
      if (p.buttons[1] && p.buttons[1].pressed) enter = true;          // ○ interactuar
      if (p.buttons[0] && p.buttons[0].pressed) jump = true;            // ✕ saltar
      if (p.buttons[3] && p.buttons[3].pressed) dance = true;           // △ bailar
      if (p.buttons[2] && p.buttons[2].pressed) punch = true;           // ▢ golpear
      if ((p.buttons[4] && p.buttons[4].pressed) || (p.buttons[5] && p.buttons[5].pressed)) run = true;
    }
    const justEnter = enter && !padPrevEnter; padPrevEnter = enter;
    const justJump = jump && !padPrevJump; padPrevJump = jump;
    const justDance = dance && !padPrevDance; padPrevDance = dance;
    const justPunch = punch && !padPrevPunch; padPrevPunch = punch;
    return { vx: THREE.MathUtils.clamp(vx, -1, 1), vz: THREE.MathUtils.clamp(vz, -1, 1),
             justEnter, justJump, justDance, justPunch, run };
  }

  /* ================= loop ================= */
  const V = 7.6; let walk = 0;
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    drawTV(t);
    moverOtros(dt, t);

    let vx = 0, vz = 0;
    const pad = padInput();
    if (autoWalk) vz = -1;
    else if (controls && !entering) {
      if (keys['w'] || keys['arrowup']) vz -= 1;
      if (keys['s'] || keys['arrowdown']) vz += 1;
      if (keys['a'] || keys['arrowleft']) vx -= 1;
      if (keys['d'] || keys['arrowright']) vx += 1;
      if (!vx && !vz) { vx = pad.vx; vz = pad.vz; }
      if (pad.justEnter && near) activate(near);
      if (pad.justJump) doJump();
      if (pad.justDance) doEmote('dance');
      if (pad.justPunch) doEmote('punch');
      running = pad.run || !!keys['shift'];
    }
    const limZ = mode === 'lobby' ? [-12.4, 14] : (scene.userData.limZ || [-120, 10]);
    const limX = mode === 'lobby' ? 15.5 : (scene.userData.limX || 15);
    const u = kid.userData;
    const speed = V * (running && !airborne ? 1.55 : 1);
    let bob = 0;
    if (vx || vz) {
      idleT = 0; andandoYo = true;
      const l = Math.hypot(vx, vz); vx /= l; vz /= l;
      kid.position.x = THREE.MathUtils.clamp(kid.position.x + vx * speed * dt, -limX, limX);
      kid.position.z = THREE.MathUtils.clamp(kid.position.z + vz * speed * dt, limZ[0], limZ[1]);
      const target = Math.atan2(vx, vz);
      let diff = ((target - kid.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      kid.rotation.y += diff * .22;
      if (!airborne && !emote) {
        walk += dt * (running ? 16 : 11);
        const amp = running ? 1.05 : .75;
        u.legL.rotation.x = Math.sin(walk) * amp; u.legR.rotation.x = -Math.sin(walk) * amp;
        u.armL.rotation.x = -Math.sin(walk) * amp * .75; u.armR.rotation.x = Math.sin(walk) * amp * .75;
        bob = Math.abs(Math.sin(walk)) * (running ? .11 : .07);
      }
      u.head.rotation.y *= .85;
    } else if (!emote && !airborne) {
      idleT += dt; andandoYo = false;
      u.legL.rotation.x *= .8; u.legR.rotation.x *= .8;
      u.armL.rotation.x *= .8; u.armR.rotation.x *= .8;
      u.head.rotation.y = Math.sin(t * .6) * .25;
      bob = Math.sin(t * 1.6) * .02;                       // respiración
      if (idleT > 9) { doEmote('wave'); idleT = 0; }        // se aburre y saluda
    }

    // --- salto ---
    if (airborne || jumpY > 0 || vy !== 0) {
      vy -= 26 * dt;
      jumpY += vy * dt;
      const stretch = THREE.MathUtils.clamp(1 + vy * .022, .82, 1.2);
      kid.scale.set(2 - stretch, stretch, 2 - stretch);
      u.legL.rotation.x = -.5 + vy * .04; u.legR.rotation.x = -.25 - vy * .03;
      u.armL.rotation.x = -2.1 + vy * .05; u.armR.rotation.x = -2.1 + vy * .05;
      if (jumpY <= 0) {
        jumpY = 0; vy = 0;
        if (airborne) {
          airborne = false; jumps = 0;
          puff(kid.position.x, kid.position.z, 1);
          sfx('land');
          gsap.fromTo(kid.scale, { x: 1.22, y: .78, z: 1.22 },
            { x: 1, y: 1, z: 1, duration: .28, ease: 'elastic.out(1,0.45)' });
        }
      }
    }

    // --- emotes ---
    if (emote) {
      emoteT += dt;
      if (emote === 'dance') {
        kid.rotation.y += dt * 7;
        u.armL.rotation.x = -2.4 + Math.sin(emoteT * 16) * .9;
        u.armR.rotation.x = -2.4 - Math.sin(emoteT * 16) * .9;
        u.armL.rotation.z = .7; u.armR.rotation.z = -.7;
        u.legL.rotation.x = Math.sin(emoteT * 16) * .5;
        u.legR.rotation.x = -Math.sin(emoteT * 16) * .5;
        bob = Math.abs(Math.sin(emoteT * 16)) * .18;
        u.head.rotation.z = Math.sin(emoteT * 8) * .2;
        if (emoteT > 2.6) { emote = null; u.armL.rotation.z = u.armR.rotation.z = u.head.rotation.z = 0; }
      } else if (emote === 'punch') {
        const p = Math.min(emoteT / .34, 1);
        const swing = Math.sin(p * Math.PI);
        u.armR.rotation.x = -swing * 2.3; u.armR.rotation.z = -swing * .35;
        u.armL.rotation.x = swing * .6;
        kid.rotation.y += swing * dt * 2.4;
        if (emoteT > .45) { emote = null; u.armR.rotation.z = 0; }
      } else if (emote === 'wave') {
        u.armR.rotation.z = -1.5; u.armR.rotation.x = -.6 + Math.sin(emoteT * 12) * .45;
        u.head.rotation.z = Math.sin(emoteT * 6) * .12;
        if (emoteT > 1.8) { emote = null; u.armR.rotation.z = u.head.rotation.z = 0; }
      }
    }

    // suelo bajo los pies: planta baja, rampa o planta alta
    if (mode === 'hall') {
      const objetivo = alturaSuelo(kid.position.x, kid.position.z);
      if (objetivo > alturaKid + .01 && !airborne) {
        alturaKid = objetivo;                       // subiendo la rampa
      } else if (objetivo < alturaKid - .01 && !airborne) {
        jumpY += alturaKid - objetivo;              // se acabó el suelo: a caer
        alturaKid = objetivo; airborne = true; vy = 0;
      } else if (!airborne) {
        alturaKid = objetivo;
      }
      tRefresco -= dt;
      if (tRefresco <= 0) { tRefresco = .25; refrescarCercanos(); }
    } else { alturaKid = 0; }
    kid.position.y = alturaKid + jumpY + bob;

    // polvo
    dust.forEach(d => {
      if (d.life <= 0) { if (d.m.visible) d.m.visible = false; return; }
      d.life -= dt;
      d.m.position.x += d.vx * dt; d.m.position.z += d.vz * dt;
      d.vx *= .93; d.vz *= .93;
      d.m.material.opacity = Math.max(0, d.life) * .7;
      d.m.scale.setScalar(1 + (0.6 - d.life) * 1.4);
      if (d.life <= 0) d.m.visible = false;
    });

    const blink = (Math.sin(t * 1.7) > .995) ? .1 : 1;
    u.pupL.scale.y = blink; u.pupR.scale.y = blink;

    // interacción
    near = null; let bestD = 99;
    for (const it of interactables) {
      const d = Math.hypot(kid.position.x - it.x, kid.position.z - it.z);
      const isNear = d < (it.type === 'game' ? 4.2 : it.type === 'cab' ? 3.4 : 3.8);
      if (it.leaf) {
        const target = entering ? it.leaf.material.emissiveIntensity : (isNear ? 1.5 : .22);
        it.leaf.material.emissiveIntensity = THREE.MathUtils.lerp(it.leaf.material.emissiveIntensity, target, .12);
      }
      if (it.type === 'game') {
        it.group.position.y = it.baseY + Math.sin(t * .8 + it.ph) * .3;
        it.group.position.x = it.x; it.group.position.z = it.z;
        // siempre de cara: balanceo suave y, al acercarte, se giran hacia ti
        const veryNear = d < 2.6 && it.group.userData.hasBack;
        const face = veryNear
          ? Math.PI + Math.sin(t * 1.2) * .1                        // se gira y enseña la trasera
          : isNear
            ? Math.atan2(kid.position.x - it.x, kid.position.z - it.z) * .35 + Math.sin(t * 2.2 + it.ph) * .08
            : Math.sin(t * .55 + it.ph) * .07;
        it.group.rotation.y = THREE.MathUtils.lerp(it.group.rotation.y, face, veryNear ? .08 : .1);
        it.group.rotation.z = Math.sin(t * .5 + it.ph) * .04;
        if (it.pl) it.pl.intensity = THREE.MathUtils.lerp(it.pl.intensity, isNear ? 14 : 0, .12);
        it.beam.material.opacity = THREE.MathUtils.lerp(it.beam.material.opacity, isNear ? .22 : .06, .1);
        it.ped.material.emissiveIntensity = THREE.MathUtils.lerp(it.ped.material.emissiveIntensity, isNear ? 1.4 : .3, .12);
        const sc = THREE.MathUtils.lerp(it.group.scale.x, isNear ? 1.22 : 1, .13);
        it.group.scale.setScalar(sc);
      }
      if (it.type === 'cab') {
        it.glow.intensity = THREE.MathUtils.lerp(it.glow.intensity, isNear ? 11 : 3, .12);
        it.marquee.material.emissiveIntensity = THREE.MathUtils.lerp(it.marquee.material.emissiveIntensity, isNear ? 1.6 : .6, .12);
      }
      if (isNear && d < bestD && !entering) { bestD = d; near = it; }
    }
    // sonidito al pasar por un juego nuevo
    if (near !== lastNear) {
      if (near && controls && !entering) sfx(near.type === 'game' || near.type === 'cab' ? 'hover' : 'door');
      lastNear = near;
    }
    if (prompt) {
      if (near && controls && !entering) {
        prompt.style.display = 'block';
        prompt.textContent = near.type === 'game' ? `▶ ${near.game.name.slice(0, 36).toUpperCase()} · ${T('key')}`
          : near.type === 'cab' ? `▶ ${T('play')}: ${near.game.name.slice(0, 26).toUpperCase()} · ${T('key')}`
          : near.type === 'exit' ? `${T('exit')} · ${T('key')}`
          : `${T('enter')} ${SYSLABEL[near.sys]} · ${T('key')}`;
      } else prompt.style.display = 'none';
    }

    if (mode === 'lobby') {
      const ud = scene.userData;
      ud.doors.forEach((d, i) => {
        d.emb.rotation.y += dt * (.75 + i * .1);
        d.emb.rotation.x = Math.sin(t * .6 + i) * .16;
        d.emb.position.y = 9.1 + Math.sin(t * 1.1 + i) * .16;
      });
      ud.tubes.forEach(o => {
        const f = Math.random() < .012 ? .25 : 1;
        o.tube.material.emissiveIntensity = (1.25 + Math.sin(t * 3 + o.ph) * .12) * f;
        o.pl.intensity = 5 * f;
      });
      ud.signL.intensity = 15 + Math.sin(t * 2.3) * 2 + (Math.random() < .012 ? -9 : 0);
    }

    const camZ = kid.position.z + (mode === 'lobby' ? 12 : 12.5);
    tmp.set(kid.position.x * .55, (mode === 'lobby' ? 7 : 6.8) + alturaKid, camZ);
    cam.position.lerp(tmp, .07);
    cam.lookAt(kid.position.x * .7, 2.2 + alturaKid, kid.position.z - 4);
    // el foco, sobre el juego que tengas más cerca
    if (mode === 'hall' && scene.userData.foco) {
      const f = scene.userData.foco;
      if (near && near.type === 'game') {
        f.position.set(near.x, near.baseY + 1.4, near.z + 1.5);
        f.intensity = THREE.MathUtils.lerp(f.intensity, 16, .15);
      } else f.intensity = THREE.MathUtils.lerp(f.intensity, 0, .12);
      (scene.userData.letreros || []).forEach(l => {
        l.m.material.opacity = .82 + Math.sin(t * 1.6 + l.ph) * .18;
        l.m.material.transparent = true;
      });
    }
    renderer.render(scene, cam);
  });
}
