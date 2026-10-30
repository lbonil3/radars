/* Legistar item links that open in a clean phone browser (no cookies, no referrer).
   The web API's MatterId is not the id the public site uses. LegislationDetail.aspx?ID=<MatterId>&GUID=<MatterGuid> shows
   "Invalid parameters!". Gateway.aspx?M=L&ID=<MatterId> answers with a 302 to the real LegislationDetail.aspx?ID=<siteId>&GUID=<siteGuid>.
   The collector follows that redirect once, checks the target page, and stores the target, so the stored link opens directly with no redirect.
   Verified results are cached in texas/data/legistar-links.json. If no page can be verified, the item links to the
   client's public Legislation search page and is labelled. */
'use strict';
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'texas', 'data', 'legistar-links.json');
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const INVALID = /invalid parameters?/i;
const GAP = 1500, last = {}; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(url, manual) {
  const h = new URL(url).hostname, w = (last[h] || 0) + GAP - Date.now(); if (w > 0) await sleep(w); last[h] = Date.now();
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 25000);
  try { return await fetch(url, { headers: { 'User-Agent': SAFARI, Accept: 'text/html' }, redirect: manual ? 'manual' : 'follow', signal: ac.signal }); } finally { clearTimeout(t); }
}
// a page "works" when it answers 2xx without cookies and is not Legistar's "Invalid parameters!" page
async function pageWorks(url) { try { const r = await req(url); if (!r.ok) return { ok: false, why: 'HTTP ' + r.status }; const b = await r.text(); if (INVALID.test(b.slice(0, 5000)) && b.length < 5000) return { ok: false, why: 'Invalid parameters page' }; if (INVALID.test(b) && !/LegislationDetail|lblFile/i.test(b)) return { ok: false, why: 'Invalid parameters page' }; return { ok: true, final: r.url }; } catch (e) { return { ok: false, why: String(e.message || e) }; } }
function parse(link) { try { const u = new URL(link); const m = /^([a-z0-9-]+)\.legistar\.com$/i.exec(u.hostname); if (!m) return null; return { client: m[1].toLowerCase(), path: u.pathname.toLowerCase(), id: u.searchParams.get('ID'), guid: u.searchParams.get('GUID') }; } catch (e) { return null; } }
function fallback(client) { return 'https://' + client + '.legistar.com/Legislation.aspx'; }
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return { note: 'Verified Legistar item links: "client|MatterId" -> working page URL', links: {} }; } }
function save(c) { const keys = Object.keys(c.links).sort(), o = {}; keys.forEach((k) => { o[k] = c.links[k]; }); fs.writeFileSync(FILE, JSON.stringify({ note: c.note, links: o }, null, 1)); }
// MatterId -> verified link (or null when it cannot be verified)
async function resolveMatter(client, mid, cache) {
  const k = client + '|' + mid; if (cache.links[k]) return cache.links[k];
  try {
    const r = await req('https://' + client + '.legistar.com/Gateway.aspx?M=L&ID=' + encodeURIComponent(mid), true);
    const loc = r.headers.get('location'); if (!loc) return null;
    const target = new URL(loc, 'https://' + client + '.legistar.com/').href;
    if (!/\/LegislationDetail\.aspx\?ID=\d+&GUID=[0-9A-F-]+/i.test(target)) return null;
    const chk = await pageWorks(target); if (!chk.ok) return null;
    cache.links[k] = target; return target;
  } catch (e) { return null; }
}
// repair any stored Legistar link: returns { link, note } (note set when it falls back to the search page)
async function repair(link, cache, midHint) {
  const p = parse(link); if (!p) return { link };
  if (cache.ok && cache.ok[link]) return { link };
  let mid = midHint || null;
  if (p.path === '/gateway.aspx') mid = mid || p.id;
  else if (p.path === '/legislationdetail.aspx' && p.id) {
    if (Object.values(cache.links).indexOf(link) >= 0) return { link };
    const chk = await pageWorks(link); if (chk.ok) { cache.ok = cache.ok || {}; cache.ok[link] = 1; return { link }; }
    mid = mid || p.id; // the old links carried the API MatterId
  } else if (p.path === '/legislation.aspx') return { link, note: FALLBACK_NOTE };
  if (mid) { const r = await resolveMatter(p.client, mid, cache); if (r) return { link: r }; }
  return { link: fallback(p.client), note: FALLBACK_NOTE };
}
const FALLBACK_NOTE = 'Opens the agenda search page; the item page could not be verified. Search for the file number or title there.';
module.exports = { SAFARI, INVALID, load, save, repair, resolveMatter, pageWorks, parse, fallback, FALLBACK_NOTE };
