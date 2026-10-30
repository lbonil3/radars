#!/usr/bin/env node
/* Link check for texas/data/intel.json: GET a sample of item links per source (polite: 1.5 s gap per host) and flag non-2xx or
   error pages ("invalid parameters", "not found"). Usage: node scripts/check-intel-links.js [perSource=3] [file]. Exit 1 if any link fails. */
'use strict';
const fs = require('fs'), path = require('path');
const per = +(process.argv[2] || 3), file = process.argv[3] || path.join(__dirname, '..', 'texas', 'data', 'intel.json');
const UA = require('./legistar-links.js').SAFARI; // check the way a phone opens the link: iPhone Safari, no cookies, no referrer
const BAD = /invalid parameters?|parameter is invalid|page not found|404 not found|an error has occurred|invalid request/i;
const last = {}; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function check(url) {
  const h = new URL(url).hostname, w = (last[h] || 0) + 1500 - Date.now(); if (w > 0) await sleep(w); last[h] = Date.now();
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 25000);
  try { const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow', signal: ac.signal }); const body = (await r.text()).slice(0, 200000);
    const m = BAD.exec(body.replace(/<script[\s\S]*?<\/script>/gi, '')); return { status: r.status, ok: r.ok && !m, why: r.ok ? (m ? 'error page: ' + m[0] : '') : 'HTTP ' + r.status, final: r.url };
  } catch (e) { return { status: 0, ok: false, why: String(e.message || e) }; } finally { clearTimeout(t); }
}
(async () => {
  const j = JSON.parse(fs.readFileSync(file, 'utf8')), by = {};
  j.items.forEach((it) => { (by[it.srcId] = by[it.srcId] || []).push(it); });
  // newsletter issues: every distinct link, grouped as "nl-<host>"
  const nd = path.join(path.dirname(file), 'newsletters'), seenL = {};
  if (process.env.WITH_NEWSLETTERS && fs.existsSync(nd)) fs.readdirSync(nd).filter((f) => /W\d\d\.json$/.test(f)).forEach((f) => { const n = JSON.parse(fs.readFileSync(path.join(nd, f), 'utf8'));
    [].concat(...(n.houston || []).map((g) => g.items), ...(n.texas || []).map((g) => g.items), n.deadlines || []).forEach((e) => { if (seenL[e.link]) return; seenL[e.link] = 1; const k = 'nl-' + new URL(e.link).hostname.split('.')[0]; (by[k] = by[k] || []).push({ link: e.link }); }); });
  if (process.env.ONLY) Object.keys(by).forEach((k) => { if (!new RegExp(process.env.ONLY).test(k)) delete by[k]; });
  let bad = 0; const res = await Promise.all(Object.keys(by).map(async (src) => { const out = []; for (const it of by[src].slice(0, per)) { const r = await check(it.link); out.push(Object.assign({ src, link: it.link }, r)); } return out; }));
  [].concat.apply([], res).sort((a, b) => a.src < b.src ? -1 : 1).forEach((r) => { if (!r.ok) bad++; console.log((r.ok ? 'ok  ' : 'BAD ') + r.src.padEnd(22) + ' ' + r.status + ' ' + r.link.slice(0, 120) + (r.why ? '  <- ' + r.why : '')); });
  console.log(bad ? bad + ' bad links' : 'all sampled links ok'); process.exit(bad ? 1 : 0);
})();
