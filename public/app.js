'use strict';
// hAIFHEMHA – nutzt dieselben FHEM-Befehle wie die FHEMWEB-WebUI (jsonlist2, set, get, attr, define, delete, save, shutdown ...)
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const THEMES = { 'ha-light': 'Home Assistant Light', 'ha-dark': 'Home Assistant Dark', midnight: 'Midnight (Platzhalter)' };
const st = { devs: {}, page: localStorage.page || 'home', room: null, filter: '' };

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }
async function cmd(c) {
  const r = await fetch('api/cmd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: c }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
async function jl(arg = '') {
  const t = await cmd('jsonlist2 ' + arg);
  try { return JSON.parse(t).Results || []; } catch { return []; }
}
async function loadAll() {
  const res = await jl();
  st.devs = {};
  res.forEach((d) => (st.devs[d.Name] = d));
}
async function refresh(name) {
  const r = await jl(name);
  if (r[0]) { st.devs[name] = r[0]; if (!$('#dlg').open) renderSoon(); else if ($('#dlg').dataset.dev === name) openDev(name, true); }
}

// ---- Hilfsfunktionen ----
const rd = (d, k) => d.Readings?.[k]?.Value;
const attr = (d, k) => d.Attributes?.[k];
const state = (d) => rd(d, 'state') ?? d.Internals?.STATE ?? '';
const rooms = () => [...new Set(Object.values(st.devs).flatMap((d) => (attr(d, 'room') || 'Unsorted').split(',')))].filter((r) => r !== 'hidden').sort();
const sets = (d) => d.PossibleSets || '';
const isSwitch = (d) => /(^| )on(:|,| |$)/.test(sets(d)) && /(^| )off(:|,| |$)/.test(sets(d));
const isDim = (d) => /(^| )(pct|dim|brightness)(:|,| |$)/.test(sets(d));
const isTherm = (d) => /desired-temp|desiredTemperature|targetTemperature/.test(sets(d));
const isOn = (d) => /^(on|open|1|true|active)/i.test(state(d)) || /^(on)$/i.test(rd(d, 'onoff') || '');
const vis = (d) => !/^(hidden)$/.test(attr(d, 'room') || '') && !['FHEMWEB', 'telnet', 'Logfile', 'DbLog', 'eventTypes', 'notify', 'at', 'autocreate', 'global', 'WEBphone', 'WEBtablet'].includes(d.Internals?.TYPE) && !/^(Logfile|global|autocreate|eventTypes)$/.test(d.Name);
function icon(d) {
  const t = (d.Internals?.TYPE || '') + ' ' + (attr(d, 'subType') || '') + ' ' + (attr(d, 'genericDeviceType') || '');
  if (isTherm(d)) return '🌡️';
  if (/light|lamp|dimmer/i.test(t + d.Name)) return '💡';
  if (/blind|shutter|rollo|cover/i.test(t + d.Name)) return '🪟';
  if (isSwitch(d)) return '🔌';
  if (rd(d, 'temperature') !== undefined) return '🌡️';
  if (rd(d, 'humidity') !== undefined) return '💧';
  if (/motion|contact|door|window/i.test(t + d.Name)) return '🚪';
  return '📟';
}
function summary(d) {
  const p = [];
  const t = rd(d, 'temperature') ?? rd(d, 'measured-temp'); if (t !== undefined) p.push(t + ' °C');
  const h = rd(d, 'humidity'); if (h !== undefined) p.push(h + ' %');
  return p.length ? p.join(' · ') : state(d);
}

// ---- Karten ----
function card(d) {
  const n = esc(attr(d, 'alias') || d.Name);
  let body = `<div class="s">${esc(summary(d))}</div>`;
  if (isDim(d) && isSwitch(d)) { const v = parseInt(rd(d, 'pct') ?? rd(d, 'dim') ?? rd(d, 'brightness') ?? 0) || 0; body += `<input type="range" min="0" max="100" value="${v}" data-dim="${esc(d.Name)}" onclick="event.stopPropagation()">`; }
  if (isTherm(d)) { const v = rd(d, 'desired-temp') ?? rd(d, 'desiredTemperature') ?? rd(d, 'targetTemperature') ?? '20'; body += `<div class="flex" onclick="event.stopPropagation()"><button class="btn sec" data-th="${esc(d.Name)}" data-d="-0.5">−</button><b style="align-self:center">${esc(v)}°</b><button class="btn sec" data-th="${esc(d.Name)}" data-d="0.5">+</button></div>`; }
  return `<div class="card ${isOn(d) ? 'on' : ''}" data-dev="${esc(d.Name)}"><div class="ic">${icon(d)}</div><div class="n">${n}</div>${body}</div>`;
}
const cards = (list) => `<div class="grid">${list.map(card).join('')}</div>`;

// ---- Seiten ----
const PAGES = {
  home: () => {
    const all = Object.values(st.devs).filter(vis);
    const act = all.filter((d) => isSwitch(d) || isTherm(d));
    const sens = all.filter((d) => !isSwitch(d) && !isTherm(d) && (rd(d, 'temperature') !== undefined || rd(d, 'humidity') !== undefined));
    return `<h2>Schalter &amp; Heizung</h2>${cards(act)}<h2>Sensoren</h2>${cards(sens)}`;
  },
  rooms: () => {
    if (st.room) return `<button class="btn sec" data-room="">← Räume</button><h2>${esc(st.room)}</h2>${cards(Object.values(st.devs).filter(vis).filter((d) => (attr(d, 'room') || 'Unsorted').split(',').includes(st.room)))}`;
    return `<div class="grid">${rooms().map((r) => `<div class="card" data-room="${esc(r)}"><div class="ic">🏠</div><div class="n">${esc(r)}</div></div>`).join('')}</div>`;
  },
  devices: () => `<input class="search" id="flt" placeholder="Geräte suchen …" value="${esc(st.filter)}">${cards(Object.values(st.devs).filter((d) => (d.Name + (attr(d, 'alias') || '') + (d.Internals?.TYPE || '')).toLowerCase().includes(st.filter.toLowerCase())))}`,
  console: () => `<div class="flex"><input id="cmdin" placeholder="FHEM-Befehl, z.B. list, set Lampe on, save" autocapitalize="off" autocorrect="off"><button class="btn" id="cmdgo">▶</button></div><pre id="cmdout">Bereit.</pre><div class="flex"><button class="btn sec" data-q="save">save</button><button class="btn sec" data-q="rereadcfg">rereadcfg</button><button class="btn sec" data-q="list .*">list</button><button class="btn sec" data-q="get Logfile">log</button></div>`,
  settings: () => `<h2>Theme</h2><div class="themes">${Object.entries(THEMES).map(([k, v]) => `<div class="card ${document.documentElement.dataset.theme === k ? 'sel' : ''}" data-theme="${k}"><div class="n">${v}</div></div>`).join('')}</div><h2>Info</h2><div class="card"><div class="s">${Object.keys(st.devs).length} Geräte · hAIFHEMHA 0.1.0</div></div>`
};
const TITLES = { home: 'Übersicht', rooms: 'Räume', devices: 'Geräte', console: 'Konsole', settings: 'Einstellungen' };

let raf;
function renderSoon() { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }
function render() {
  $('#title').textContent = st.page === 'rooms' && st.room ? st.room : TITLES[st.page];
  $('#view').innerHTML = PAGES[st.page]();
  $('#drawer').innerHTML = Object.entries(TITLES).map(([k, v]) => `<a href="#" data-page="${k}" class="${k === st.page ? 'act' : ''}">${v}</a>`).join('<hr>');
}
function go(p) { st.page = p; localStorage.page = p; if (p !== 'rooms') st.room = null; closeDrawer(); render(); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); }

// ---- Detaildialog (readings, attr, set) ----
async function openDev(name, keep) {
  const d = st.devs[name]; if (!d) return;
  const dlg = $('#dlg'); dlg.dataset.dev = name;
  const setList = sets(d).split(' ').filter(Boolean);
  dlg.innerHTML = `<h3>${esc(attr(d, 'alias') || name)} <small style="color:var(--text2)">${esc(d.Internals?.TYPE)}</small></h3>
  <div class="flex"><select id="setsel">${setList.map((s) => `<option value="${esc(s.split(':')[0])}">${esc(s.split(':')[0])}</option>`).join('')}</select><input id="setval" placeholder="Wert"><button class="btn" id="setgo">set</button></div>
  ${isSwitch(d) ? `<div class="flex"><button class="btn" data-set="on">on</button><button class="btn sec" data-set="off">off</button><button class="btn sec" data-set="toggle">toggle</button></div>` : ''}
  <h2>Readings</h2>${Object.entries(d.Readings || {}).map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v.Value)}<br><small>${esc(v.Time)}</small></span></div>`).join('')}
  <h2>Attribute</h2>${Object.entries(d.Attributes || {}).map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}
  <div class="flex"><input id="attrk" placeholder="Attribut" list="attrl"><datalist id="attrl">${(d.PossibleAttrs || '').split(' ').map((a) => `<option value="${esc(a.split(':')[0])}">`).join('')}</datalist><input id="attrv" placeholder="Wert"><button class="btn" id="attrgo">attr</button></div>
  <div class="flex"><button class="btn sec" id="rawbtn">list</button><button class="btn sec" id="delbtn" style="color:var(--danger);border-color:var(--danger)">delete</button><button class="btn sec" id="closebtn">Schließen</button></div><pre id="raw" hidden></pre>`;
  if (!keep || !dlg.open) dlg.showModal();
}

// ---- Aktionen ----
async function run(c, quiet) {
  try { const o = await cmd(c); if (!quiet) toast(o.trim().slice(0, 80) || 'OK'); return o; } catch (e) { toast('Fehler: ' + e.message); }
}
const toggle = (d) => run(`set ${d.Name} ${isOn(d) ? 'off' : 'on'}`);

document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.id === 'menu') { $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); return; }
  if (t.id === 'scrim') return closeDrawer();
  const pg = t.closest('[data-page]'); if (pg) { e.preventDefault(); return go(pg.dataset.page); }
  const th = t.closest('[data-theme]'); if (th) { setTheme(th.dataset.theme); return render(); }
  const rm = t.closest('[data-room]'); if (rm) { st.room = rm.dataset.room || null; return render(); }
  const tb = t.closest('[data-th]'); if (tb) { const d = st.devs[tb.dataset.th]; const cur = parseFloat(rd(d, 'desired-temp') ?? rd(d, 'desiredTemperature') ?? rd(d, 'targetTemperature') ?? 20); const key = /desired-temp/.test(sets(d)) ? 'desired-temp' : /desiredTemperature/.test(sets(d)) ? 'desiredTemperature' : 'targetTemperature'; return run(`set ${d.Name} ${key} ${(cur + parseFloat(tb.dataset.d)).toFixed(1)}`); }
  const q = t.closest('[data-q]'); if (q) { $('#cmdin').value = q.dataset.q; return $('#cmdgo').click(); }
  if (t.id === 'cmdgo') { const c = $('#cmdin').value.trim(); if (c) $('#cmdout').textContent = (await run(c, true)) ?? 'Fehler'; return; }
  const dlg = $('#dlg'), dn = dlg.dataset.dev;
  if (t.id === 'closebtn') return dlg.close();
  if (t.id === 'setgo') return run(`set ${dn} ${$('#setsel').value} ${$('#setval').value}`.trim()).then(() => setTimeout(() => refresh(dn), 400));
  if (t.dataset.set) return run(`set ${dn} ${t.dataset.set}`);
  if (t.id === 'attrgo') return run(`attr ${dn} ${$('#attrk').value} ${$('#attrv').value}`).then(() => refresh(dn));
  if (t.id === 'rawbtn') { const p = $('#raw'); p.hidden = false; p.textContent = await run(`list ${dn}`, true); return; }
  if (t.id === 'delbtn' && confirm(`Gerät ${dn} wirklich löschen?`)) { await run(`delete ${dn}`); dlg.close(); await loadAll(); return render(); }
  const c = t.closest('.card[data-dev]'); if (c) {
    const d = st.devs[c.dataset.dev];
    if (isSwitch(d) && !t.closest('.n,.s')) return toggle(d);
    return openDev(d.Name);
  }
});
document.addEventListener('change', (e) => { const n = e.target.dataset?.dim; if (n) run(`set ${n} pct ${e.target.value}`, true); });
document.addEventListener('input', (e) => { if (e.target.id === 'flt') { st.filter = e.target.value; const pos = e.target.selectionStart; render(); const f = $('#flt'); f.focus(); f.setSelectionRange(pos, pos); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'cmdin') $('#cmdgo').click(); });

function setTheme(k) { document.documentElement.dataset.theme = k; localStorage.theme = k; const c = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(); document.querySelector('meta[name=theme-color]').content = c; }

// ---- Live-Events (Longpoll -> SSE) ----
const pend = new Set(); let tmr;
function live() {
  const es = new EventSource('api/events');
  es.onopen = () => $('#conn').classList.add('ok');
  es.onerror = () => { $('#conn').classList.remove('ok'); es.close(); setTimeout(live, 4000); };
  es.onmessage = (m) => {
    let n; try { const j = JSON.parse(m.data); n = Array.isArray(j) ? j[0] : null; } catch { n = (m.data.match(/^([^<:\s]+)/) || [])[1]; }
    if (n && st.devs[n]) { pend.add(n); clearTimeout(tmr); tmr = setTimeout(() => { pend.forEach(refresh); pend.clear(); }, 300); }
  };
}

(async function init() {
  setTheme(localStorage.theme || 'ha-light');
  try { await loadAll(); } catch (e) { toast('FHEM nicht erreichbar'); }
  render(); live();
  setInterval(() => loadAll().then(() => !$('#dlg').open && renderSoon()).catch(() => {}), 60000);
})();
