'use strict';
// Erweiterungen (v0.2): Noctis-Theme, Plots, Event-Monitor, define-Dialog, Rollo- und Farbkarten
delete THEMES.midnight; THEMES.noctis = 'Noctis (Dark Blue)';
if (localStorage.theme === 'midnight') setTheme('noctis');
{ const s = TITLES.settings; delete TITLES.settings; Object.assign(TITLES, { plots: 'Plots', events: 'Events', define: 'Neues Gerät' }); TITLES.settings = s; }

const isCover = (d) => /(^| )up(:|,| |$)/.test(sets(d)) && /(^| )down(:|,| |$)/.test(sets(d));
const _card = card;
card = function (d) {
  let x = '';
  if (isCover(d)) x += `<div class="flex" onclick="event.stopPropagation()">${[['up', '▲'], ['stop', '■'], ['down', '▼']].map(([a, s]) => `<button class="btn sec" data-cov="${esc(d.Name)}" data-a="${a}">${s}</button>`).join('')}</div>`;
  if (/(^| )rgb(:|,| |$)/.test(sets(d))) { const v = /^[0-9a-f]{6}$/i.test(rd(d, 'rgb') || '') ? rd(d, 'rgb') : 'ffffff'; x += `<input type="color" data-rgb="${esc(d.Name)}" value="#${v}" onclick="event.stopPropagation()">`; }
  const h = _card(d);
  return x ? h.replace(/<\/div>$/, x + '</div>') : h;
};

const evbuf = [];
PAGES.events = () => `<pre id="evlog">${esc(evbuf.join('\n'))}</pre>`;
{
  const es = new EventSource('api/events');
  es.onmessage = (m) => {
    let l = m.data; try { const j = JSON.parse(l); if (Array.isArray(j)) l = j.join(' | '); } catch {}
    evbuf.unshift(new Date().toLocaleTimeString() + ' ' + l); evbuf.length = Math.min(evbuf.length, 300);
    const p = document.getElementById('evlog'); if (p) p.textContent = evbuf.join('\n');
  };
}

PAGES.plots = () => {
  const l = Object.values(st.devs).filter((d) => d.Internals?.TYPE === 'SVG');
  if (!l.length) return '<div class="card">Keine SVG-Geräte gefunden.</div>';
  return l.map((d) => { const i = d.Internals; const q = new URLSearchParams({ dev: d.Name, logdev: i.LOGDEVICE || '', gplotfile: i.GPLOTFILE || '', logfile: i.LOGFILE || 'CURRENT' }); return `<h2>${esc(attr(d, 'alias') || d.Name)}</h2><div class="card" style="background:#fff;padding:4px;cursor:default"><img src="api/svg?${q}" style="width:100%" loading="lazy" alt=""></div>`; }).join('');
};

PAGES.define = () => `<div class="card" style="cursor:default"><input id="defn" placeholder="Name"><input id="deft" placeholder="Typ, z.B. dummy"><input id="defa" placeholder="Argumente"><div class="flex"><button class="btn" id="defgo">define</button><button class="btn sec" id="defsave">save</button></div><pre id="defout" hidden></pre></div>`;

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cov]'); if (b) return run(`set ${b.dataset.cov} ${b.dataset.a}`);
  if (e.target.id === 'defgo') {
    const n = $('#defn').value.trim(), t = $('#deft').value.trim(); if (!n || !t) return toast('Name und Typ nötig');
    const o = await run(`define ${n} ${t} ${$('#defa').value}`.trim(), true); const p = $('#defout'); p.hidden = false; p.textContent = o || 'OK';
    await loadAll(); toast('define ausgeführt');
  }
  if (e.target.id === 'defsave') run('save');
}, true);
document.addEventListener('change', (e) => { const n = e.target.dataset?.rgb; if (n) run(`set ${n} rgb ${e.target.value.slice(1)}`, true); });
render();
