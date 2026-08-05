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
        inv: 'INVITATIONS', invGen: '➕ NEW INVITE LINK', invLeft: (n) => `${n} left`,
        invFree: 'unused · share it', invCopy: 'COPY', invShare: 'SHARE', invBy: 'joined:',
        invCopied: 'Link copied · send it to your friend', invNone: 'no invitations left' }
    : { profile: 'PERFIL', level: 'NIVEL', plays: 'PARTIDAS', uniq: 'JUEGOS DISTINTOS',
        time: 'TIEMPO JUGADO', net: 'PARTIDAS EN RED', ach: 'LOGROS', recent: 'ÚLTIMAS PARTIDAS',
        rank: 'RANKING DE LA SALA', close: 'CERRAR', next: 'para', locked: 'BLOQUEADO', unlocked: '¡LOGRO DESBLOQUEADO!',
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

  function panelHTML(d) {
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
      return `<a class="rec" href="player.html?sys=${encodeURIComponent(r.sys)}&rom=${encodeURIComponent(r.path)}&name=${encodeURIComponent(r.juego)}">
        ${cov ? `<img src="${escP(cov)}" alt="" loading="lazy">` : '<em>?</em>'}
        <b>${escP(r.juego.slice(0, 30))}</b>
        <span style="color:${SYSCOL[r.sys] || '#6fa585'}">${SYSNOM[r.sys] || r.sys}</span>
        <s>${tiempoDesde(r.ts)}</s></a>`;
    }).join('');

    const largo = p.longest ? Math.floor(p.longest / 60) + 'm ' + (p.longest % 60) + 's' : '—';
    const dias = Math.max(1, Math.round((Date.now() - (p.creado || Date.now())) / 86400000));

    return `
      <div class="pf-head">
        <img class="pf-av" src="${avatar(d.user, 96)}" alt="">
        <div>
          <div class="pf-user">${escP(d.user.toUpperCase())}</div>
          <div class="pf-lvl">${t.level}: <b>${escP(d.nivel.nombre)}</b></div>
          ${barra}
        </div>
        <button class="pf-x" id="pfClose">${t.close}</button>
      </div>

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
      <div class="pf-sec">${t.inv} · <em id="pfInvN" style="font-style:normal;color:#ffd23f"></em></div>
      <div class="pf-inv" id="pfInvitas">…</div>
      <div class="pf-sec">${t.rank}</div>
      <div class="pf-rank" id="pfRank">…</div>`;
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
      w.innerHTML = '<div id="pfPanel"></div>';
      document.body.appendChild(w);
      w.addEventListener('click', e => { if (e.target === w) cerrar(); });
    }
    document.getElementById('pfPanel').innerHTML = panelHTML(ME);
    document.getElementById('pfClose').onclick = cerrar;
    w.classList.add('on');
    pintarInvitas();
    fetch('/api/ranking').then(r => r.json()).then(d => {
      const el = document.getElementById('pfRank');
      if (!el) return;
      el.innerHTML = d.ranking.map((r, i) =>
        `<div class="rk${r.user === ME.user ? ' me' : ''}"><span>${i + 1}</span>
         <img src="${avatar(r.user, 32)}" alt=""><b>${r.user}</b>
         <em>${r.plays} · ${r.logros}★</em></div>`).join('') || '—';
    }).catch(() => {});
  }
  function cerrar() { const w = document.getElementById('pfWrap'); if (w) w.classList.remove('on'); }

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

  function pintarOnline(lista) {
    const cont = document.getElementById('onlineBar');
    if (!cont) return;
    const otros = lista.filter(o => !o.yo);
    const t = (window.SALA_LANG && window.SALA_LANG() === 'en');
    if (!lista.length) { cont.classList.remove('on'); return; }
    cont.classList.add('on');
    // se ancla justo bajo la barra de búsqueda, sea cual sea su alto
    const bar = document.querySelector('.lib-bar');
    if (bar) cont.style.top = Math.round(bar.getBoundingClientRect().height) + 'px';
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
        // con la partida ya completa no se ofrece UNIRME (esperando solo en sala, sí)
        if (!o.yo && o.donde === 'juego' && o.rom && !enMatch.has(nom)) {
          const url = `player.html?sys=${encodeURIComponent(o.sys)}&rom=${encodeURIComponent(o.rom)}`
                    + `&name=${encodeURIComponent(o.juego)}&join=1&host=${encodeURIComponent(o.user)}`;
          unir = `<a class="ol-join" href="${url}">${t ? '▶ JOIN' : '▶ UNIRME'}</a>`;
        }
        const ins = INSIGNIA[o.nv || 0];
        const rango = NIVEL_NOMBRE[o.nv || 0];
        const glifo = ins ? `<em class="ol-nv" style="color:${ins[1]}" title="${rango}">${ins[0]}</em>` : '';
        const meds = o.lg ? `<em class="ol-med" title="${o.lg} ${t ? 'achievements' : 'logros'}">🏅${o.lg}</em>` : '';
        return `<span class="ol${o.yo ? ' me' : ''} nv${o.nv || 0}" title="${rango}"><img src="${avatar(o.user, 28)}" alt="">
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
  function pintarChat(msgs) {
    const cajon = document.getElementById('chatMsgs');
    if (!cajon) return;
    msgs.forEach(m => {
      const mio = ME && m.user === ME.user;
      const d = document.createElement('div');
      d.className = 'ch-msg' + (mio ? ' mio' : '');
      const hora = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      d.innerHTML = `<img src="${avatar(m.user, 26)}" alt="">
        <div><b>${m.user.toUpperCase()}</b> <span class="ch-h">${hora}</span><p></p></div>`;
      d.querySelector('p').textContent = m.texto;      // texto plano: nada de HTML ajeno
      cajon.appendChild(d);
    });
    while (cajon.children.length > 80) cajon.removeChild(cajon.firstChild);
    cajon.scrollTop = cajon.scrollHeight;
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
        const ajenos = msgs.filter(m => !ME || m.user !== ME.user).length;
        if (!primera && ajenos) {
          sonarChat();
          if (!chatAbierto) {
            chatSinLeer += ajenos;
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
