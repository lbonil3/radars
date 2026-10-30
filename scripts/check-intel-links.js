#!/usr/bin/env node
/* Link check for texas/data/intel.json: GET a sample of item links per source (polite: 1.5 s gap per host) and flag non-2xx or
   error pages ("invalid parameters", "not found"). Usage: node scripts/check-intel-links.js [perSource=3] [file]. Exit 1 if any link fails. */
'use strict';
const fs = require('fs'), path = require('path');
const per = +(process.argv[2] || 3), file = process.argv[3] || path.join(__dirname, '..', 'texas', 'data', 'intel.json');
const UA = 'TexasOpportunityRadar/1.0 (daily public-feed digest; links back to the original)';
const BAD = /invalid parameter|parameter is invalid|page not found|404 not found|an error has occurred|invalid request/i;
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
  let bad = 0; const res = await Promise.all(Object.keys(by).map(async (src) => { const out = []; for (const it of by[src].slice(0, per)) { const r = await check(it.link); out.push(Object.assign({ src, link: it.link }, r)); } return out; }));
  [].concat.apply([], res).sort((a, b) => a.src < b.src ? -1 : 1).forEach((r) => { if (!r.ok) bad++; console.log((r.ok ? 'ok  ' : 'BAD ') + r.src.padEnd(22) + ' ' + r.status + ' ' + r.link.slice(0, 120) + (r.why ? '  <- ' + r.why : '')); });
  console.log(bad ? bad + ' bad links' : 'all sampled links ok'); process.exit(bad ? 1 : 0);
})();
