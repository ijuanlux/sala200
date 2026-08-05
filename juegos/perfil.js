/* SALA 200 — perfil del socio: identidad, logros y últimas partidas */
(function () {
  // ¿desde el móvil o desde el ordenador? sirve para el distintivo de la lista
  const DEV = (matchMedia('(pointer: coarse)').matches || innerWidth < 821) ? 'movil' : 'pc';
  const ICONO = { movil: '📱', pc: '🖥' };
  let ME = null;

  const T = () => (window.SALA_LANG && window.SALA_LANG() === 'en')
    ? { profile: 'PROFILE', level: 'LEVEL', plays: 'GAMES PLAYED', uniq: 'DIFFERENT GAMES',
        time: 'TIME PLAYED', net: 'ONLINE MATCHES', ach: 'ACHIEVEMENTS', recent: 'LAST PLAYED',
        rank: 'SALA RANKING', close: 'CLOSE', next: 'to reach', locked: 'LOCKED', unlocked: 'NEW ACHIEVEMENT',
        ahoraJuega: 'PLAYING NOW:', ahoraSala: 'in the arcade right now',
        editar: '✏️ EDIT CARD', guardarF: '💾 SAVE', frase: 'WAR CRY', frasePh: 'your battle cry (80 max)',
        pais: 'COUNTRY', paisPh: 'e.g. 🇪🇸 Spain', favo: 'SIGNATURE GAME', favoPh: 'your go-to game',
        avatares: 'AVATAR · the fancy ones are earned', bloqueado: 'locked', verRk: '🏆 SALA RANKING',
        rkTit: '🏆 SALA RANKING', rkSala: (p, h) => `the arcade so far: ${p} games · ${h}h of play`,
        rkJuegos: 'games', rkHoras: 'hours', rkLogros: 'medals', rkRed: 'online', rkTop: 'signature:',
        inv: 'INVITATIONS', invGen: '➕ NEW INVITE LINK', invLeft: (n) => `${n} left`,
        invFree: 'unused · share it', invCopy: 'COPY', invShare: 'SHARE', invBy: 'joined:',
        invCopied: 'Link copied · send it to your friend', invNone: 'no invitations left' }
    : { profile: 'PERFIL', level: 'NIVEL', plays: 'PARTIDAS', uniq: 'JUEGOS DISTINTOS',
        time: 'TIEMPO JUGADO', net: 'PARTIDAS EN RED', ach: 'LOGROS', recent: 'ÚLTIMAS PARTIDAS',
        rank: 'RANKING DE LA SALA', close: 'CERRAR', next: 'para', locked: 'BLOQUEADO', unlocked: '¡LOGRO DESBLOQUEADO!',
        ahoraJuega: 'JUGANDO AHORA:', ahoraSala: 'en la sala ahora mismo',
        editar: '✏️ EDITAR FICHA', guardarF: '💾 GUARDAR', frase: 'FRASE DE GUERRA', frasePh: 'tu grito de guerra (80 máx)',
        pais: 'PAÍS', paisPh: 'ej: 🇪🇸 España', favo: 'JUEGO DE CABECERA', favoPh: 'tu vicio de siempre',
        avatares: 'AVATAR · los guapos se ganan', bloqueado: 'bloqueado', verRk: '🏆 RANKING DE LA SALA',
        rkTit: '🏆 RANKING DE LA SALA', rkSala: (p, h) => `la sala lleva: ${p} partidas · ${h}h de vicio`,
        rkJuegos: 'partidas', rkHoras: 'horas', rkLogros: 'medallas', rkRed: 'en red', rkTop: 'cabecera:',
        inv: 'INVITACIONES', invGen: '➕ GENERAR ENLACE DE INVITACIÓN', invLeft: (n) => `te quedan ${n}`,
        invFree: 'sin usar · compártela', invCopy: 'COPIAR', invShare: 'ENVIAR', invBy: 'entró:',
        invCopied: 'Enlace copiado · mándaselo a tu colega', invNone: 'no te quedan invitaciones' };

  /* ---------- avatar generado a partir del nombre ---------- */
  function avatar(user, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    let h = 0;
    for (const ch of user) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const tonos = ['#39ff88', '#35e9ff', '#ff2d78', '#ffd23f', '#b898ff', '#ff8c3a'];
    const col = tonos[h % tonos.length], col2 = tonos[(h >> 3) % tonos.length];
    x.fillStyle = '#050c07'; x.fillRect(0, 0, size, size);
    const n = 7, s = size / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < Math.ceil(n / 2); j++) {
      if ((h >> ((i * 4 + j) % 30)) & 1) {
        x.fillStyle = (i + j) % 3 === 0 ? col2 : col;
        x.fillRect(j * s, i * s, s + .5, s + .5);
        x.fillRect((n - 1 - j) * s, i * s, s + .5, s + .5);
      }
    }
    return c.toDataURL();
  }

  /* avatar visible: el emoji elegido (grande, con marco) o el identicon de siempre */
  function avatarHTML(user, av, size, extraClase) {
    if (av) return `<span class="av-em ${extraClase || ''}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .62)}px">${av}</span>`;
    return `<img class="${extraClase || ''}" src="${avatar(user, size)}" alt="" style="width:${size}px;height:${size}px">`;
  }

  /* ---------- panel ---------- */
  const SYSCOL = { snes: '#b898ff', megadrive: '#35e9ff', n64: '#39ff88', neogeo: '#ff2d55' };
  const SYSNOM = { snes: 'SNES', megadrive: 'MEGA DRIVE', n64: 'N64', neogeo: 'NEO GEO' };
  const escP = (x) => String(x).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // busca la carátula de un juego por su ruta, si el catálogo ya está cargado
  function caratula(path) {
    const lista = window.SALA_GAMES || [];
    const g = lista.find(x => x.path === path);
    return g ? (g.mini || g.thumb || '') : '';
  }
  function tiempoDesde(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return 'hace nada';
    if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
    return 'hace ' + Math.floor(s / 86400) + ' días';
  }

  function panelHTML(d, ajena) {
    const t = T(), p = d.perfil, cat = d.catalogo;
    const horas = Math.floor((p.minutos || 0) / 60), mins = (p.minutos || 0) % 60;
    const conseguidos = cat.filter(l => p.logros.includes(l.id));
    const pendientes = cat.filter(l => !p.logros.includes(l.id));
    const pct = Math.round(conseguidos.length / Math.max(1, cat.length) * 100);

    // barra de progreso al siguiente nivel
    const barra = d.nivel.siguiente
      ? `<div class="pf-next">${d.nivel.faltan} ${t.next} <b>${escP(d.nivel.siguiente)}</b></div>
         <div class="pf-bar"><i style="width:${Math.max(4, 100 - Math.min(100, d.nivel.faltan * 8))}%"></i></div>`
      : '<div class="pf-next">nivel máximo alcanzado</div>';

    // reparto por sistema
    const sysTot = Object.values(p.sys || {}).reduce((a, b) => a + b, 0) || 1;
    const sysBarras = Object.entries(p.sys || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
      `<div class="pf-sys"><b style="color:${SYSCOL[k] || '#39ff88'}">${SYSNOM[k] || k}</b>
        <i><u style="width:${Math.round(v / sysTot * 100)}%;background:${SYSCOL[k] || '#39ff88'}"></u></i>
        <s>${v}</s></div>`).join('');

    // los que más has gastado
    const top = Object.entries(p.juegos || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxTop = top.length ? top[0][1] : 1;
    const topHTML = top.map(([n, v]) =>
      `<div class="pf-top"><b>${escP(n.slice(0, 34))}</b>
        <i><u style="width:${Math.round(v / maxTop * 100)}%"></u></i><s>${v}</s></div>`).join('');

    const recHTML = (p.recientes || []).slice(0, 8).map(r => {
      const cov = caratula(r.path);
      return `<a class="rec" data-href="player.html?sys=${encodeURIComponent(r.sys)}&rom=${encodeURIComponent(r.path)}&name=${encodeURIComponent(r.juego)}">
        ${cov ? `<img src="${escP(cov)}" alt="" loading="lazy">` : '<em>?</em>'}
        <b>${escP(r.juego.slice(0, 30))}</b>
        <span style="color:${SYSCOL[r.sys] || '#6fa585'}">${SYSNOM[r.sys] || r.sys}</span>
        <s>${tiempoDesde(r.ts)}</s></a>`;
    }).join('');

    const largo = p.longest ? Math.floor(p.longest / 60) + 'm ' + (p.longest % 60) + 's' : '—';
    const dias = Math.max(1, Math.round((Date.now() - (p.creado || Date.now())) / 86400000));

    return `
      <div class="pf-head">
        <span class="pf-avz">${avatarHTML(d.user, p.avatar, 96, 'pf-av')}</span>
        <div>
          <div class="pf-user">${escP(d.user.toUpperCase())}</div>
          ${p.frase ? `<div class="pf-frase">«${escP(p.frase)}»</div>` : ''}
          <div class="pf-lvl">${t.level}: <b>${escP(d.nivel.nombre)}</b>
            ${p.pais ? ` · <span class="pf-chip">${escP(p.pais)}</span>` : ''}
            ${p.favorito ? ` · <span class="pf-chip">🕹 ${escP(p.favorito)}</span>` : ''}</div>
          ${barra}
        </div>
        <div class="pf-btns">
          ${ajena ? '' : `<button class="pf-x" id="pfEditar">${t.editar}</button>`}
          <button class="pf-x" id="pfClose">${t.close}</button>
        </div>
      </div>
      ${d.ahora ? `<div class="pf-ahora">${d.ahora.donde === 'juego'
          ? `▶ ${t.ahoraJuega} <b>${escP(d.ahora.juego || '?')}</b>${d.ahora.sala ? ' · ⚔' : ''}`
          : `👾 ${t.ahoraSala}`}</div>` : ''}
      <div id="pfEditor" style="display:none"></div>

      <div class="pf-stats">
        <div><b>${p.plays}</b><span>${t.plays}</span></div>
        <div><b>${p.uniq}</b><span>${t.uniq}</span></div>
        <div><b>${horas}h ${mins}m</b><span>${t.time}</span></div>
        <div><b>${p.netplay || 0}</b><span>${t.net}</span></div>
        <div><b>${p.favs || 0}</b><span>favoritos</span></div>
        <div><b>${largo}</b><span>partida más larga</span></div>
        <div><b>${dias}</b><span>días en la sala</span></div>
        <div><b>${pct}%</b><span>logros</span></div>
      </div>

      <div class="pf-cols">
        <div>
          <div class="pf-sec">reparto por sistema</div>
          <div class="pf-sysbox">${sysBarras || '<i class="pf-vacio">aún nada</i>'}</div>
          <div class="pf-sec">tus vicios</div>
          <div class="pf-topbox">${topHTML || '<i class="pf-vacio">aún nada</i>'}</div>
        </div>
        <div>
          <div class="pf-sec">${t.ach} · ${conseguidos.length}/${cat.length}</div>
          <div class="pf-ach">
            ${conseguidos.map(l => `<div class="ach on"><b>${escP(l.nombre)}</b><span>${escP(l.desc)}</span></div>`).join('')}
            ${pendientes.map(l => `<div class="ach"><b>🔒 ${escP(l.nombre)}</b><span>${escP(l.desc)}</span></div>`).join('')}
          </div>
        </div>
      </div>

      ${recHTML ? `<div class="pf-sec">${t.recent}</div><div class="pf-rec">${recHTML}</div>` : ''}
      ${ajena ? '' : `<div class="pf-sec">${t.inv} · <em id="pfInvN" style="font-style:normal;color:#ffd23f"></em></div>
      <div class="pf-inv" id="pfInvitas">…</div>`}
      <button class="pf-verrk" id="pfVerRk">${t.verRk}</button>`;
  }

  function urlInvita(code) { return location.origin + '/juegos/registro.html?i=' + code; }
  function pintarInvitas() {
    const cont = document.getElementById('pfInvitas');
    if (!cont) return;
    const t = T();
    fetch('/api/invitas').then(r => r.json()).then(d => {
      const n = document.getElementById('pfInvN');
      if (n) n.textContent = t.invLeft(d.quedan);
      const filas = (d.invitas || []).map(i => i.usado
        ? `<div class="inv usada">🎟 <s>…${i.code.slice(-4)}</s><span>${t.invBy} <b>${i.usado.toUpperCase()}</b></span></div>`
        : `<div class="inv">🎟 <s>…${i.code.slice(-4)}</s><span>${t.invFree}</span>
             <button data-c="${i.code}" data-a="copiar">${t.invCopy}</button>
             ${navigator.share ? `<button data-c="${i.code}" data-a="enviar">${t.invShare}</button>` : ''}</div>`).join('');
      cont.innerHTML = filas +
        (d.quedan > 0 ? `<button class="inv-gen" id="invGen">${t.invGen}</button>`
                      : (d.invitas || []).length >= 5 ? `<div class="inv-fin">${t.invNone}</div>` : '');
      const g = document.getElementById('invGen');
      if (g) g.onclick = () => {
        g.disabled = true;
        fetch('/api/invita', { method: 'POST' }).then(r => r.json()).then(() => pintarInvitas()).catch(() => { g.disabled = false; });
      };
      cont.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => {
        const url = urlInvita(b.dataset.c);
        if (b.dataset.a === 'enviar' && navigator.share) {
          navigator.share({ title: 'SALA 200', text: 'Te invito a mi recreativa clandestina 🕹', url }).catch(() => {});
        } else {
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => {
            b.textContent = '✔';
            setTimeout(() => { b.textContent = t.invCopy; }, 1600);
          }).catch(() => { prompt('URL:', url); });
        }
      });
    }).catch(() => { cont.innerHTML = ''; });
  }

  function abrir() {
    if (!ME) return;
    let w = document.getElementById('pfWrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'pfWrap';
      /* Lenis (el scroll suave del lobby) secuestra la rueda del ratón de toda la
         página: dentro del panel la rueda no movía nada en escritorio. Este
         atributo le dice que aquí no toque, y además lo congelamos al abrir. */
      w.setAttribute('data-lenis-prevent', '');
      w.innerHTML = '<div id="pfPanel"></div>';
      document.body.appendChild(w);
      w.addEventListener('click', e => { if (e.target === w) cerrar(); });
      w.addEventListener('click', e => {
        const a2 = e.target.closest('[data-href]');
        if (a2) location.href = a2.dataset.href;
      });
    }
    try { if (window.SALA_LENIS) window.SALA_LENIS.stop(); } catch (e) {}
    document.getElementById('pfPanel').innerHTML = panelHTML(ME);
    document.getElementById('pfClose').onclick = cerrar;
    w.classList.add('on');
    pintarInvitas();
    const be = document.getElementById('pfEditar');
    if (be) be.onclick = editarFicha;
    const brk = document.getElementById('pfVerRk');
    if (brk) brk.onclick = abrirRanking;
  }

  /* ---------- la ficha de OTRO socio: solo mirar ---------- */
  function abrirFicha(u) {
    if (!u) return;
    if (ME && u.toLowerCase() === ME.user.toLowerCase()) return abrir();
    fetch('/api/ficha?u=' + encodeURIComponent(u.toLowerCase())).then(r => r.json()).then(d => {
      if (d.error) return;
      abrir();                                   // crea/asegura el panel (pinta el mío un instante)
      document.getElementById('pfPanel').innerHTML = panelHTML(d, true);
      document.getElementById('pfClose').onclick = cerrar;
      const brk = document.getElementById('pfVerRk');
      if (brk) brk.onclick = abrirRanking;
    }).catch(() => {});
  }
  window.SALA_FICHA = abrirFicha;

  /* ---------- editor de la ficha: frase, país, cabecera y rejilla de avatares ---------- */
  function editarFicha() {
    const t = T(), p = ME.perfil;
    const caja = document.getElementById('pfEditor');
    if (!caja) return;
    if (caja.style.display !== 'none') { caja.style.display = 'none'; return; }
    caja.style.display = '';
    caja.innerHTML = `
      <label>${t.frase}</label><input id="edFrase" maxlength="80" placeholder="${t.frasePh}" value="${escP(p.frase || '')}">
      <div class="ed-fila">
        <span><label>${t.pais}</label><input id="edPais" maxlength="24" placeholder="${t.paisPh}" value="${escP(p.pais || '')}"></span>
        <span><label>${t.favo}</label><input id="edFavo" maxlength="40" placeholder="${t.favoPh}" value="${escP(p.favorito || '')}"></span>
      </div>
      <label>${t.avatares}</label>
      <div class="av-grid" id="avGrid">…</div>
      <button class="pf-verrk" id="edGuardar">${t.guardarF}</button>`;
    let avElegido = p.avatar || '';
    fetch('/api/avatares').then(r => r.json()).then(d => {
      const g = document.getElementById('avGrid');
      if (!g) return;
      const nombres = {};
      (ME.catalogo || []).forEach(l => { nombres[l.id] = l.nombre; });
      g.innerHTML = `<button data-av="" class="${!avElegido ? 'on' : ''}" title="pixel">▦</button>` +
        d.avatares.map(x => x.libre
          ? `<button data-av="${x.av}" class="${avElegido === x.av ? 'on' : ''}">${x.av}</button>`
          : `<button class="lock" title="${t.bloqueado}: ${x.req && x.req.startsWith('plays:')
              ? x.req.slice(6) + ' partidas' : escP(nombres[x.req] || x.req || '')}">${x.av}<i>🔒</i></button>`).join('');
      g.querySelectorAll('button[data-av]').forEach(b => b.onclick = () => {
        avElegido = b.dataset.av;
        g.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      });
    }).catch(() => {});
    document.getElementById('edGuardar').onclick = () => {
      fetch('/api/perfil', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frase: document.getElementById('edFrase').value,
                               pais: document.getElementById('edPais').value,
                               favorito: document.getElementById('edFavo').value,
                               avatar: avElegido }) })
        .then(r => r.json())
        .then(() => fetch('/api/me').then(r => r.json()).then(d => { ME = d; abrir(); }))
        .catch(() => {});
    };
  }

  /* ---------- el salón del ranking: podio y todos los socios ---------- */
  function abrirRanking() {
    const t = T();
    let w = document.getElementById('rkWrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'rkWrap';
      w.setAttribute('data-lenis-prevent', '');
      w.innerHTML = '<div id="rkPanel"></div>';
      document.body.appendChild(w);
      w.addEventListener('click', e => { if (e.target === w) cerrarRanking(); });
      w.addEventListener('click', e => {
        const f = e.target.closest('[data-ficha]');
        if (f) { cerrarRanking(); abrirFicha(f.dataset.ficha); }
      });
    }
    try { if (window.SALA_LENIS) window.SALA_LENIS.stop(); } catch (e) {}
    w.classList.add('on');
    const panel = document.getElementById('rkPanel');
    panel.innerHTML = `<div class="rk-tit">${t.rkTit}</div>…`;
    fetch('/api/ranking').then(r => r.json()).then(d => {
      const lista = d.ranking || [];
      const totP = lista.reduce((a, x) => a + x.plays, 0);
      const totH = Math.round(lista.reduce((a, x) => a + (x.minutos || 0), 0) / 60);
      const yo = ME ? ME.user : '';
      const ins = (nv) => { const i = INSIGNIA[nv || 0]; return i ? `<b style="color:${i[1]}">${i[0]}</b>` : ''; };
      const podio = lista.slice(0, 3).map((r, i) => `
        <div class="rk-pod p${i + 1}${r.user === yo ? ' me' : ''}" data-ficha="${escP(r.user)}">
          <div class="rk-medalla">${['🥇', '🥈', '🥉'][i]}</div>
          ${avatarHTML(r.user, r.avatar, 72)}
          <b>${escP(r.user.toUpperCase())} ${ins(r.nv)}</b>
          <s>${escP(r.nivel || '')}${r.pais ? ' · ' + escP(r.pais) : ''}</s>
          ${r.frase ? `<em>«${escP(r.frase.slice(0, 60))}»</em>` : ''}
          <span>${r.plays} ${t.rkJuegos} · 🏅${r.logros}</span>
        </div>`).join('');
      const filas = lista.slice(3).map((r, i) => `
        <div class="rk-fila${r.user === yo ? ' me' : ''}" data-ficha="${escP(r.user)}">
          <span class="rk-pos">${i + 4}</span>
          ${avatarHTML(r.user, r.avatar, 34)}
          <div class="rk-quien"><b>${escP(r.user.toUpperCase())} ${ins(r.nv)}</b>
            ${r.frase ? `<em>«${escP(r.frase.slice(0, 44))}»</em>` : ''}</div>
          <div class="rk-datos">${r.pais ? escP(r.pais) + ' · ' : ''}🎮${r.plays} · ⏱${Math.round((r.minutos || 0) / 60)}h · 🏅${r.logros} · ⚔${r.netplay}${r.favorito ? `<i>${t.rkTop} ${escP(r.favorito)}</i>` : ''}</div>
        </div>`).join('');
      panel.innerHTML = `
        <div class="rk-cab"><div class="rk-tit">${t.rkTit}</div>
          <button class="pf-x" id="rkClose">${t.close}</button></div>
        <div class="rk-total">${t.rkSala(totP, totH)}</div>
        <div class="rk-podio">${podio}</div>
        <div class="rk-lista">${filas}</div>`;
      document.getElementById('rkClose').onclick = cerrarRanking;
    }).catch(() => { panel.innerHTML = '<div class="rk-tit">💥</div>'; });
  }
  function cerrarRanking() {
    const w = document.getElementById('rkWrap');
    if (w) w.classList.remove('on');
    const pf = document.getElementById('pfWrap');
    if (!pf || !pf.classList.contains('on')) {
      try { if (window.SALA_LENIS) window.SALA_LENIS.start(); } catch (e) {}
    }
  }
  function cerrar() {
    const w = document.getElementById('pfWrap');
    if (w) w.classList.remove('on');
    try { if (window.SALA_LENIS) window.SALA_LENIS.start(); } catch (e) {}   // la rueda, de vuelta al lobby
  }

  /* ---------- aviso de logro nuevo ---------- */
  function celebrar(logros) {
    if (!logros || !logros.length) return;
    logros.forEach((l, i) => setTimeout(() => {
      const d = document.createElement('div');
      d.className = 'ach-pop';
      d.innerHTML = `<div class="ach-pop-t">${T().unlocked}</div><b>${l.nombre}</b><span>${l.desc}</span>`;
      document.body.appendChild(d);
      requestAnimationFrame(() => d.classList.add('on'));
      if (window.SALA_SFX) window.SALA_SFX('logro');
      setTimeout(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 600); }, 4200);
    }, i * 900));
  }

  /* ---------- API pública ---------- */
  /* ---------- 🔔 el buzón de novedades del club ---------- */
  let novVistas = 0, novUlt = [];
  try { novVistas = parseFloat(localStorage.getItem('sala_novvistas') || '0') || 0; } catch (e) {}
  function novHace(ts) {
    const s2 = Math.max(0, Math.round((Date.now() - ts) / 1000));
    const t = (window.SALA_LANG && window.SALA_LANG() === 'en');
    if (s2 < 60) return t ? 'just now' : 'ahora mismo';
    if (s2 < 3600) return (t ? '' : 'hace ') + Math.floor(s2 / 60) + ' min';
    if (s2 < 86400) return (t ? '' : 'hace ') + Math.floor(s2 / 3600) + ' h';
    return (t ? '' : 'hace ') + Math.floor(s2 / 86400) + (t ? 'd' : ' días');
  }
  function pintarNov() {
    const t = (window.SALA_LANG && window.SALA_LANG() === 'en');
    let w = document.getElementById('novWrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'novWrap';
      w.setAttribute('data-lenis-prevent', '');
      w.innerHTML = `<div class="nov-cab">🔔 ${t ? 'WHAT IS GOING ON' : 'QUÉ SE CUECE'}
        <button id="novX">✕</button></div><div id="novLista"></div>`;
      document.body.appendChild(w);
      document.getElementById('novX').onclick = () => w.classList.remove('on');
      w.addEventListener('click', e => {
        const f = e.target.closest('[data-ficha]');
        if (f) { w.classList.remove('on'); abrirFicha(f.dataset.ficha); }
      });
    }
    const lista = document.getElementById('novLista');
    lista.innerHTML = novUlt.length ? novUlt.map(n => {
      // el primer nombre del texto se puede tocar para ver su ficha
      const m = /^([a-z0-9_-]+)/i.exec(n.texto);
      const cuerpo = m ? `<b data-ficha="${escP(m[1])}">${escP(m[1])}</b>${escP(n.texto.slice(m[1].length))}`
                       : escP(n.texto);
      return `<div class="nov${n.ts > novVistas ? ' fresca' : ''}"><i>${n.ico}</i>
        <span>${cuerpo}<em>${novHace(n.ts)}</em></span></div>`;
    }).join('') : `<div class="nov-vacio">${t ? 'nothing yet' : 'aún no se cuece nada'}</div>`;
  }
  function traerNov(abrirlo) {
    fetch('/api/novedades').then(r => r.json()).then(d => {
      novUlt = d.novedades || [];
      const nuevas = novUlt.filter(n => n.ts > novVistas).length;
      const b = document.getElementById('novBtn');
      if (b) { b.classList.toggle('nuevo', nuevas > 0); b.dataset.n = nuevas || ''; }
      if (abrirlo) {
        pintarNov();
        document.getElementById('novWrap').classList.add('on');
        novVistas = Date.now();
        try { localStorage.setItem('sala_novvistas', String(novVistas)); } catch (e) {}
        setTimeout(() => {
          const bb = document.getElementById('novBtn');
          if (bb) { bb.classList.remove('nuevo'); bb.dataset.n = ''; }
        }, 1200);
      }
    }).catch(() => {});
  }
  const novBtn = document.getElementById('novBtn');
  if (novBtn) novBtn.addEventListener('click', () => {
    const w = document.getElementById('novWrap');
    if (w && w.classList.contains('on')) { w.classList.remove('on'); return; }
    traerNov(true);
  });
  traerNov(false);
  setInterval(() => traerNov(false), 45000);

  /* ---------- 🎁 recomendar un juego a otro socio ---------- */
  window.SALA_REGALO = function (g) {
    const t = (window.SALA_LANG && window.SALA_LANG() === 'en');
    let w = document.getElementById('regWrap');
    if (!w) {
      w = document.createElement('div');
      w.id = 'regWrap';
      w.setAttribute('data-lenis-prevent', '');
      w.innerHTML = '<div id="regPanel"></div>';
      document.body.appendChild(w);
      w.addEventListener('click', e => { if (e.target === w) w.classList.remove('on'); });
    }
    const panel = document.getElementById('regPanel');
    panel.innerHTML = `<div class="reg-tit">🎁 ${t ? 'RECOMMEND TO' : 'RECOMENDAR A'}</div>
      <div class="reg-juego">${escP(g.name)}</div><div class="reg-lista">…</div>`;
    w.classList.add('on');
    fetch('/api/ranking').then(r => r.json()).then(d => {
      const yo = ME ? ME.user : '';
      const socios = (d.ranking || []).filter(r => r.user !== yo);
      const lista = panel.querySelector('.reg-lista');
      lista.innerHTML = socios.map(r =>
        `<button data-u="${escP(r.user)}">${avatarHTML(r.user, r.avatar, 30)}
          <b>${escP(r.user.toUpperCase())}</b></button>`).join('') ||
        `<i>${t ? 'no other members yet' : 'aún no hay más socios'}</i>`;
      lista.onclick = (e) => {
        const b = e.target.closest('button[data-u]');
        if (!b) return;
        b.disabled = true;
        fetch('/api/recomendar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ para: b.dataset.u, juego: g.name, rom: g.path, sys: g.sys }) })
          .then(() => {
            b.innerHTML = '✔';
            setTimeout(() => w.classList.remove('on'), 700);
          }).catch(() => { b.disabled = false; });
      };
    }).catch(() => {});
  };

  /* buzón: lo que me han recomendado (sale al entrar, una vez) */
  function verRecomendados() {
    fetch('/api/recomendados').then(r => r.json()).then(d => {
      const l = d.recomendados || [];
      if (!l.length) return;
      const t = (window.SALA_LANG && window.SALA_LANG() === 'en');
      // todo lo que te recomienden entra en tus FAVORITOS, que es donde lo buscarás
      let metidos = 0;
      l.forEach(x => { if (window.SALA_FAV_ADD && window.SALA_FAV_ADD(x.sys, x.rom)) metidos++; });
      const r = l[0];
      let av = document.getElementById('regAviso');
      if (!av) {
        av = document.createElement('div');
        av.id = 'regAviso';
        document.body.appendChild(av);
      }
      av.innerHTML = `<b>🎁 ${escP(r.de.toUpperCase())} ${t ? 'recommends you' : 'te recomienda'}</b>
        <span>${escP(r.juego)}${l.length > 1 ? ` +${l.length - 1}` : ''}
          <i style="display:block;font-style:normal;font-size:10px;color:#6fa585">
            ${t ? 'saved to your favourites ★' : 'guardado en tus favoritos ★'}</i></span>
        <button data-a="jugar">${t ? '▶ PLAY' : '▶ JUGAR'}</button>
        <button data-a="no">✕</button>`;
      av.classList.add('on');
      av.onclick = (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        av.classList.remove('on');
        fetch('/api/recomendados/visto', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rom: r.rom }) }).catch(() => {});
        if (b.dataset.a === 'jugar') {
          location.href = `player.html?sys=${encodeURIComponent(r.sys)}&rom=${encodeURIComponent(r.rom)}`
                        + `&name=${encodeURIComponent(r.juego)}`;
        }
      };
    }).catch(() => {});
  }
  setTimeout(verRecomendados, 3500);

  const rkBtn = document.getElementById('rkBtn');
  if (rkBtn) rkBtn.addEventListener('click', abrirRanking);

  window.SALA_PROFILE = {
    abrir,
    me: () => ME,
    user: () => (ME ? ME.user : null),
    evento: (e) => fetch('/api/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e)
      }).then(r => r.json()).then(d => {
        if (d.perfil) { ME.perfil = d.perfil; ME.nivel = d.nivel; }
        celebrar(d.nuevos);
        return d;
      }).catch(() => null),
  };

  /* ---------- quién está en la sala ahora mismo ---------- */
  const SYS_N = { snes: 'SNES', megadrive: 'MEGA DRIVE', neogeo: 'NEO GEO', n64: 'N64', arcade: 'ARCADE' };
  const INSIGNIA = [null, ['✦', '#39ff88'], ['★', '#35e9ff'], ['⚡', '#ffd23f'],
                    ['♛', '#b898ff'], ['👑', '#ff2d78']];
  const NIVEL_NOMBRE = ['NOVATO', 'HABITUAL', 'VICIADO', 'MÁQUINA', 'LEYENDA', 'DUEÑO DE LA SALA'];

  let olAbierto = false, olUltima = [];
  function pintarOnline(lista) {
    const cont = document.getElementById('onlineBar');
    if (!cont) return;
    olUltima = lista;
    const otros = lista.filter(o => !o.yo);
    const t = (window.SALA_LANG && window.SALA_LANG() === 'en');
    // píldora resumen en la barra: 👥 3 (· ⚔ si hay partida); el listado, plegado
    let pill = document.getElementById('olPill');
    if (!pill) {
      const bar0 = document.querySelector('.lib-bar');
      if (bar0) {
        pill = document.createElement('button');
        pill.id = 'olPill';
        bar0.appendChild(pill);
        pill.onclick = () => { olAbierto = !olAbierto; pintarOnline(olUltima); };
      }
    }
    if (!cont._nav) {
      cont._nav = 1;
      cont.addEventListener('click', e => {
        const a2 = e.target.closest('[data-href]');
        if (a2) { location.href = a2.dataset.href; return; }
        const f = e.target.closest('[data-ficha]');
        if (f) abrirFicha(f.dataset.ficha);
      });
    }
    if (!lista.length) {
      cont.classList.remove('on');
      if (pill) pill.style.display = 'none';
      return;
    }
    // ¿hay partida a dobles en marcha? (dos o más en la misma sala de red y mismo juego)
    const grupos = {};
    lista.forEach(o => {
      if (o.donde === 'juego' && o.sala) {
        const k = o.juego || '?';
        (grupos[k] = grupos[k] || []).push(o.user.toUpperCase());
      }
    });
    const enMatch = new Set();     // quiénes están en una partida COMPLETA (2 o más)
    Object.values(grupos).forEach(us => { if (us.length >= 2) us.forEach(u => enMatch.add(u)); });
    const versus = Object.entries(grupos).filter(([, us]) => us.length >= 2)
      .map(([j, us]) => `<span class="ol-vs">⚔ <b>${us.join(' vs ')}</b>` +
        `<span class="ol-txt">${t ? 'match in progress' : 'en partida'} · <em>${j.slice(0, 30)}</em></span></span>`)
      .join('');
    if (pill) {
      pill.style.display = '';
      pill.innerHTML = `👥 ${lista.length}${versus ? ' · ⚔' : ''}`;
      pill.title = t ? 'who is online' : 'quién está en línea';
      pill.classList.toggle('vs', !!versus);
      pill.classList.toggle('abierto', olAbierto);
    }
    if (!olAbierto) { cont.classList.remove('on'); return; }
    cont.classList.add('on');
    // se ancla justo bajo la barra de búsqueda, sea cual sea su alto
    const bar = document.querySelector('.lib-bar');
    if (bar) cont.style.top = Math.round(bar.getBoundingClientRect().height) + 'px';
    cont.innerHTML =
      `<span class="ol-t">${t ? 'IN THE ARCADE NOW' : 'AHORA EN LA SALA'}</span>` +
      versus +
      lista.map(o => {
        const nom = o.user.toUpperCase();
        const verbo = o.yo ? (t ? 'you are playing' : 'estás jugando a')
                           : enMatch.has(nom) ? (t ? 'is in a 2P match:' : 'está en partida a dobles:')
                           : (t ? 'is playing' : 'está jugando a');
        const que = o.donde === 'juego' && o.juego
          ? `<span class="ol-txt">${verbo} <em>${o.juego.slice(0, 30)}</em>${o.sys ? ` <i>(${(SYS_N[o.sys] || o.sys)})</i>` : ''}</span>`
          : `<span class="ol-txt dim">${o.yo ? (t ? 'you are browsing' : 'estás mirando la biblioteca')
                                            : (t ? 'is browsing' : 'está mirando la biblioteca')}</span>`;
        // si otro está en un juego, ofrecemos entrar a ESE mismo juego y unirse a su sala
        let unir = '';
        // partida completa: no puedes jugar, pero sí VERLA desde el palco
        if (!o.yo && o.donde === 'juego' && o.rom && enMatch.has(nom)) {
          const urlVer = `player.html?sys=${encodeURIComponent(o.sys)}&rom=${encodeURIComponent(o.rom)}`
                       + `&name=${encodeURIComponent(o.juego)}&espiar=1&host=${encodeURIComponent(o.user)}`;
          unir = `<a class="ol-join ol-ver" data-href="${urlVer}">👁 ${t ? 'WATCH' : 'VER'}</a>`;
        }
        // con la partida ya completa no se ofrece UNIRME (esperando solo en sala, sí)
        else if (!o.yo && o.donde === 'juego' && o.rom && !enMatch.has(nom)) {
          const url = `player.html?sys=${encodeURIComponent(o.sys)}&rom=${encodeURIComponent(o.rom)}`
                    + `&name=${encodeURIComponent(o.juego)}&join=1&host=${encodeURIComponent(o.user)}`;
          unir = `<a class="ol-join" data-href="${url}">${t ? '▶ JOIN' : '▶ UNIRME'}</a>`;
        }
        const ins = INSIGNIA[o.nv || 0];
        const rango = NIVEL_NOMBRE[o.nv || 0];
        const glifo = ins ? `<em class="ol-nv" style="color:${ins[1]}" title="${rango}">${ins[0]}</em>` : '';
        const meds = o.lg ? `<em class="ol-med" title="${o.lg} ${t ? 'achievements' : 'logros'}">🏅${o.lg}</em>` : '';
        return `<span class="ol${o.yo ? ' me' : ''} nv${o.nv || 0}" title="${rango}" data-ficha="${o.user}">${avatarHTML(o.user, o.av, 28)}
                <em class="ol-dev" title="${o.dev === 'movil' ? 'desde el móvil' : 'desde el ordenador'}">${ICONO[o.dev] || ICONO.pc}</em>
                ${glifo}<b>${nom}</b>${meds}${que}${unir}</span>`;
      }).join('') +
      (otros.length ? '' : `<span class="ol-solo">${t ? 'nobody else right now' : 'nadie más por aquí ahora mismo'}</span>`);
  }
  function latir() {
    if (!ME) return;
    fetch('/api/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donde: 'sala', dev: DEV }) }).catch(() => {});
    fetch('/api/online').then(r => r.json()).then(d => pintarOnline(d.online || [])).catch(() => {});
  }
  setInterval(latir, 20000);
  addEventListener('sala:lang', () => latir());

  /* ---------- chat de la sala ---------- */
  let chatUlt = 0, chatAbierto = false, chatSinLeer = 0;
  function meMencionan(texto) {
    if (!ME) return false;
    return new RegExp('(^|\\W)@' + ME.user + '($|\\W)', 'i').test(texto || '');
  }
  /* el texto va como nodos (nada de HTML ajeno), con las @menciones resaltadas */
  function textoConMenciones(p, texto) {
    String(texto).split(/(@[a-z0-9_-]+)/gi).forEach(tr => {
      if (/^@[a-z0-9_-]+$/i.test(tr)) {
        const sp = document.createElement('span');
        sp.className = 'mencion' + (ME && tr.slice(1).toLowerCase() === ME.user ? ' ami' : '');
        sp.textContent = tr;
        p.appendChild(sp);
      } else if (tr) {
        p.appendChild(document.createTextNode(tr));
      }
    });
  }
  function pintarChat(msgs) {
    const cajon = document.getElementById('chatMsgs');
    if (!cajon) return;
    msgs.forEach(m => {
      const mio = ME && m.user === ME.user;
      const d = document.createElement('div');
      d.className = 'ch-msg' + (mio ? ' mio' : '') + (meMencionan(m.texto) && !mio ? ' conmigo' : '');
      const hora = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      d.innerHTML = `<img src="${avatar(m.user, 26)}" alt="">
        <div><b>${m.user.toUpperCase()}</b> <span class="ch-h">${hora}</span><p></p></div>`;
      textoConMenciones(d.querySelector('p'), m.texto);
      // tocar el nombre = responderle con @mención puesta
      d.querySelector('b').addEventListener('click', () => {
        const inp = document.getElementById('chatInput');
        if (!inp) return;
        if (!chatAbierto) abrirChat();
        inp.value = '@' + m.user + ' ' + inp.value.replace(/^@[a-z0-9_-]+ /i, '');
        inp.focus();
      });
      cajon.appendChild(d);
    });
    while (cajon.children.length > 80) cajon.removeChild(cajon.firstChild);
    cajon.scrollTop = cajon.scrollHeight;
  }
  /* notificación visible cuando el chat está cerrado: burbuja con el mensaje */
  function avisoChat(m, esMencion) {
    let t = document.getElementById('chToast');
    if (!t) {
      t = document.createElement('button');
      t.id = 'chToast';
      document.body.appendChild(t);
      t.addEventListener('click', () => { t.classList.remove('on'); if (!chatAbierto) abrirChat(); });
    }
    t.className = esMencion ? 'menc' : '';
    t.innerHTML = `<b>${esMencion ? '📣' : '💬'} ${m.user.toUpperCase()}</b><span></span>`;
    t.querySelector('span').textContent = m.texto.slice(0, 90);
    t.classList.add('on');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('on'), esMencion ? 6500 : 4200);
  }
  function sonarChat() {
    if (window.SALA_SFX) window.SALA_SFX('chat');
  }
  function traerChat(primera) {
    fetch('/api/chat?desde=' + chatUlt).then(r => r.json()).then(d => {
      const msgs = d.chat || [];
      if (msgs.length) {
        chatUlt = msgs[msgs.length - 1].ts;
        pintarChat(msgs);
        const ajenos = msgs.filter(m => !ME || m.user !== ME.user);
        if (!primera && ajenos.length) {
          const menciones = ajenos.filter(m => meMencionan(m.texto));
          if (menciones.length) {
            // el pling de mención suena SIEMPRE, hasta con el chat abierto
            if (window.SALA_SFX) window.SALA_SFX('mencion');
            if (navigator.vibrate) try { navigator.vibrate([30, 40, 30]); } catch (e) {}
            if (!chatAbierto) avisoChat(menciones[menciones.length - 1], true);
          } else {
            sonarChat();
            if (!chatAbierto) avisoChat(ajenos[ajenos.length - 1], false);
          }
          if (!chatAbierto) {
            chatSinLeer += ajenos.length;
            const b = document.getElementById('chatBtn');
            if (b) { b.classList.add('nuevo'); b.dataset.n = chatSinLeer; }
          }
        }
      }
    }).catch(() => {});
  }
  function abrirChat() {
    chatAbierto = !chatAbierto;
    const w = document.getElementById('chatWrap');
    w.classList.toggle('on', chatAbierto);
    const b = document.getElementById('chatBtn');
    if (chatAbierto) {
      chatSinLeer = 0; b.classList.remove('nuevo'); b.dataset.n = '';
      const t = document.getElementById('chToast');
      if (t) t.classList.remove('on');
      setTimeout(() => document.getElementById('chatInput').focus(), 100);
    }
  }
  function montarChat() {
    if (document.getElementById('chatWrap')) return;
    const w = document.createElement('div');
    w.id = 'chatWrap';
    w.innerHTML = `
      <div class="ch-head">CHAT DE LA SALA <button id="chatX">✕</button></div>
      <div id="chatMsgs"></div>
      <form id="chatForm">
        <input id="chatInput" maxlength="240" autocomplete="off" placeholder="escribe algo...">
        <button type="submit">▶</button>
      </form>`;
    document.body.appendChild(w);
    document.getElementById('chatX').onclick = abrirChat;
    document.getElementById('chatForm').addEventListener('submit', e => {
      e.preventDefault();
      const inp = document.getElementById('chatInput');
      const texto = inp.value.trim();
      if (!texto) return;
      inp.value = '';
      fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }) }).then(() => traerChat(true)).catch(() => {});
    });
    const b = document.getElementById('chatBtn');
    if (b) { b.style.display = 'inline-flex'; b.onclick = abrirChat; }
    traerChat(true);
    setInterval(traerChat, 4000);
  }

  /* ---------- arranque ---------- */
  fetch('/api/me').then(r => r.json()).then(d => {
    if (d.error) return;
    ME = d;
    localStorage.setItem('sala_user', d.user);       // lo usa el netplay como identidad
    const _pfN = document.getElementById('pfBtn2');
    if (_pfN) _pfN.textContent = '👤 ' + d.user.toUpperCase();
    ['pfBtn', 'pfBtn2'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.style.display = id === 'pfBtn' ? '' : 'inline-flex';
      btn.innerHTML = `<img src="${avatar(d.user, 24)}" alt=""> ${d.user.toUpperCase()}`;
      btn.onclick = abrir;
    });
    latir();
    montarChat();
    // los favoritos guardados se reflejan en el perfil
    const favs = JSON.parse(localStorage.getItem('sala_favs') || '[]');
    if (favs.length) window.SALA_PROFILE.evento({ tipo: 'favs', n: favs.length });
  }).catch(() => {});

  // atajo: tecla P abre el perfil
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'p' && !/input|textarea/i.test(document.activeElement.tagName)) abrir();
  });
})();
