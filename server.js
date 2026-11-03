'use strict';
// hAIFHEMHA – Proxy zwischen Browser und FHEMWEB. Keine Abhängigkeiten (Node >= 20).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = +process.env.PORT || 8080;
const FHEM_URL = (process.env.FHEM_URL || 'http://localhost:8083').replace(/\/+$/, '');
const WEB = process.env.FHEM_WEB_PATH || '/fhem';
const FUSER = process.env.FHEM_USER || '';
const FPASS = process.env.FHEM_PASS || '';
const APP_PW = process.env.APP_PASSWORD || '';
const PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const log = (...a) => console.log(new Date().toISOString(), ...a);
const fhemHeaders = () => (FUSER ? { Authorization: 'Basic ' + Buffer.from(FUSER + ':' + FPASS).toString('base64') } : {});

let csrf = '';
async function fetchCsrf() {
  const r = await fetch(`${FHEM_URL}${WEB}?XHR=1`, { headers: fhemHeaders() });
  csrf = r.headers.get('x-fhem-csrftoken') || '';
  return csrf;
}

// Identisch zur WebUI: /fhem?cmd=<cmd>&XHR=1&fwcsrf=<token>
async function fhemCmd(cmd, retry = true) {
  if (!csrf) await fetchCsrf();
  const url = `${FHEM_URL}${WEB}?cmd=${encodeURIComponent(cmd)}&XHR=1&fwcsrf=${encodeURIComponent(csrf)}`;
  const r = await fetch(url, { headers: fhemHeaders() });
  const t = await r.text();
  if (r.status === 400 && retry) { await fetchCsrf(); return fhemCmd(cmd, false); }
  if (!r.ok) throw new Error(`FHEM HTTP ${r.status}`);
  return t;
}

function authOk(req) {
  if (!APP_PW) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const [, pw] = Buffer.from(h.slice(6), 'base64').toString().split(/:(.*)/s);
  return pw === APP_PW;
}

const readBody = (req) => new Promise((res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => res(b)); });

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/healthz') { res.end('ok'); return; }
  if (!authOk(req)) { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="hAIFHEMHA"' }); res.end('Auth required'); return; }
  try {
    if (u.pathname === '/api/cmd' && req.method === 'POST') {
      const { cmd } = JSON.parse((await readBody(req)) || '{}');
      if (!cmd || typeof cmd !== 'string') { res.writeHead(400); res.end('cmd missing'); return; }
      log('cmd', cmd);
      const out = await fhemCmd(cmd);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(out);
      return;
    }
    if (u.pathname === '/api/svg') {
      // SVG-Plots (SVG_showLog) – nur validierte Parameter
      const q = ['dev', 'logdev', 'gplotfile', 'logfile'].map((k) => [k, u.searchParams.get(k) || '']);
      if (q.some(([, v]) => !/^[\w.\-]*$/.test(v))) { res.writeHead(400); res.end('bad params'); return; }
      const r = await fetch(`${FHEM_URL}${WEB}/SVG_showLog?${q.map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&')}&pos=`, { headers: fhemHeaders() });
      res.writeHead(r.status, { 'Content-Type': 'image/svg+xml' });
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    if (u.pathname === '/api/events') {
      // Longpoll von FHEMWEB (wie die WebUI) -> SSE
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      const ac = new AbortController();
      req.on('close', () => ac.abort());
      try {
        if (!csrf) await fetchCsrf();
        const url = `${FHEM_URL}${WEB}?XHR=1&inform=type=status;filter=.*;since=null;fmt=JSON&fwcsrf=${encodeURIComponent(csrf)}`;
        const r = await fetch(url, { headers: fhemHeaders(), signal: ac.signal });
        const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (line) res.write('data: ' + line.replace(/\n/g, ' ') + '\n\n');
          }
        }
      } catch (e) { if (e.name !== 'AbortError') log('events err', e.message); }
      res.end();
      return;
    }
    // statische Dateien
    let f = path.normalize(path.join(PUB, u.pathname === '/' ? 'index.html' : u.pathname));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUB, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    log('error', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => log(`hAIFHEMHA läuft auf :${PORT} -> ${FHEM_URL}${WEB}`));
