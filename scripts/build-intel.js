#!/usr/bin/env node
/* Daily collector for texas/data/intel.json: public news and planning signals (no API keys, no logins).
   Each source runs in its own try/catch; a failed source keeps its previous items and is marked stale. Polite: one request
   per host at a time with a gap, retry with backoff on 429/503, robots.txt checked before fetching any site page. */
'use strict';
const fs = require('fs');
const path = require('path');
const I = require('../texas/intel.js');
const OUT = path.join(__dirname, '..', 'texas', 'data', 'intel.json');
const UA = 'TexasOpportunityRadar/1.0 (daily public-feed digest; links back to the original)';
const GAP_MS = 1500; const lastHit = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, opts) {
  opts = opts || {}; const host = new URL(url).hostname;
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = (lastHit[host] || 0) + GAP_MS - Date.now(); if (wait > 0) await sleep(wait); lastHit[host] = Date.now();
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 25000);
    try {
      const res = await fetch(url, { method: opts.method || 'GET', body: opts.body, headers: Object.assign({ 'User-Agent': UA, Accept: opts.accept || '*/*' }, opts.headers || {}), signal: ac.signal, redirect: 'follow' });
      if ((res.status === 429 || res.status === 503) && attempt < 2) { const ra = Number(res.headers.get('retry-after')); await sleep(isFinite(ra) && ra > 0 ? Math.min(ra, 60) * 1000 : 4000 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) { if (attempt === 2 || /HTTP 4/.test(e.message)) throw e; await sleep(3000 * (attempt + 1)); } finally { clearTimeout(t); }
  }
}
const robotsCache = {};
async function robotsAllowed(url) {
  const u = new URL(url), key = u.origin;
  if (!(key in robotsCache)) { try { robotsCache[key] = await get(key + '/robots.txt'); } catch (e) { robotsCache[key] = /HTTP 4\d\d/.test(e.message) ? '' : null; } }
  const txt = robotsCache[key]; if (txt === null) return false; // robots unreachable (5xx/timeout): be conservative
  let groups = [], cur = null, lastWasUA = false;
  txt.split(/\r?\n/).forEach((line) => { const m = /^\s*([a-z-]+)\s*:\s*(.*?)\s*(#.*)?$/i.exec(line); if (!m) return; const k = m[1].toLowerCase(), v = m[2];
    if (k === 'user-agent') { if (!lastWasUA) { cur = { ua: [], dis: [], allow: [] }; groups.push(cur); } cur.ua.push(v.toLowerCase()); lastWasUA = true; return; }
    lastWasUA = false; if (!cur) return; if (k === 'disallow' && v) cur.dis.push(v); if (k === 'allow' && v) cur.allow.push(v); });
  const g = groups.filter((x) => x.ua.some((a) => a !== '*' && UA.toLowerCase().indexOf(a) >= 0))[0] || groups.filter((x) => x.ua.indexOf('*') >= 0)[0];
  if (!g) return true; const p = u.pathname + u.search;
  const rx = (r) => new RegExp('^' + r.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$|\$$/, '$'));
  const hit = (rules) => rules.filter((r) => rx(r).test(p)).reduce((a, r) => Math.max(a, r.length), -1);
  return hit(g.allow) >= hit(g.dis);
}
async function feed(url) { if (!(await robotsAllowed(url))) throw new Error('robots.txt disallows this path'); return I.parseFeed(await get(url, { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' })); }
// ---- sources (all tested live; see texas/README.md "Intel sources")
const cp = (id, host, name, place, county, region) => ({ id: 'cp-' + id, name: name, agency: name, kind: 'rss', url: 'https://www.' + host + '/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml', place, county, region });
const HOU = I.HOU, DFW = 'Dallas–Fort Worth';
const SINCE = () => new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
const LEG_FILTER = ['drainage', 'flood', 'storm', 'engineering', 'wastewater', 'capital improvement', 'bond'].map((w) => "substringof('" + w + "',MatterTitle)").join(' or ');
const leg = (client, name, place, county, region) => ({ id: 'leg-' + client, name: name + ' agenda items', agency: name, kind: 'legistar', client, place, county, region, minScore: 3, topics: ['agenda'] });
const SOURCES = [
  { id: 'hpw', name: 'Houston Public Works news', agency: 'Houston Public Works', kind: 'rss', url: 'https://www.houstonpublicworks.org/rss.xml', place: 'Houston', county: 'Harris', region: HOU, minScore: 2 },
  { id: 'glo', name: 'Texas GLO news', agency: 'Texas General Land Office', kind: 'rss', url: 'https://www.glo.texas.gov/rss.xml', region: 'Statewide', minScore: 2 },
  { id: 'tml', name: 'Texas Municipal League news', agency: 'Texas Municipal League', kind: 'rss', url: 'https://www.tml.org/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml', region: 'Statewide' },
  { id: 'tribune', name: 'Texas Tribune (headlines)', agency: 'Texas Tribune', kind: 'rss', url: 'https://feeds.texastribune.org/feeds/main/', region: 'Statewide', media: true },
  { id: 'dallas', name: 'Dallas City News', agency: 'City of Dallas', kind: 'rss', url: 'https://www.dallascitynews.net/feed', place: 'Dallas', county: 'Dallas', region: DFW },
  cp('sugarland', 'sugarlandtx.gov', 'City of Sugar Land', 'Sugar Land', 'Fort Bend', HOU), cp('leaguecity', 'leaguecitytx.gov', 'City of League City', 'League City', 'Galveston', HOU),
  cp('galveston', 'galvestontx.gov', 'City of Galveston', 'Galveston', 'Galveston', HOU), cp('baytown', 'baytown.org', 'City of Baytown', 'Baytown', 'Harris', HOU),
  cp('pasadena', 'pasadenatx.gov', 'City of Pasadena', 'Pasadena', 'Harris', HOU), cp('rosenberg', 'rosenbergtx.gov', 'City of Rosenberg', 'Rosenberg', 'Fort Bend', HOU),
  cp('bellaire', 'bellairetx.gov', 'City of Bellaire', 'Bellaire', 'Harris', HOU), cp('westu', 'westutx.gov', 'City of West University Place', 'West University Place', 'Harris', HOU),
  cp('tomball', 'tomballtx.gov', 'City of Tomball', 'Tomball', 'Harris', HOU), cp('webster', 'webstertx.gov', 'City of Webster', 'Webster', 'Harris', HOU),
  cp('texascity', 'texascitytx.gov', 'City of Texas City', 'Texas City', 'Galveston', HOU), cp('angleton', 'angleton.tx.us', 'City of Angleton', 'Angleton', 'Brazoria', HOU),
  cp('deerpark', 'deerparktx.gov', 'City of Deer Park', 'Deer Park', 'Harris', HOU), cp('laporte', 'laportetx.gov', 'City of La Porte', 'La Porte', 'Harris', HOU),
  cp('portarthur', 'portarthurtx.gov', 'City of Port Arthur', 'Port Arthur', 'Jefferson', 'Southeast Texas'),
  cp('frisco', 'friscotexas.gov', 'City of Frisco', 'Frisco', 'Collin', DFW), cp('mckinney', 'mckinneytexas.org', 'City of McKinney', 'McKinney', 'Collin', DFW),
  cp('garland', 'garlandtx.gov', 'City of Garland', 'Garland', 'Dallas', DFW), cp('mansfield', 'mansfieldtexas.gov', 'City of Mansfield', 'Mansfield', 'Tarrant', DFW),
  cp('newbraunfels', 'newbraunfels.gov', 'City of New Braunfels', 'New Braunfels', 'Comal', 'Central Texas'),
  leg('harriscountytx', 'Harris County Commissioners Court', 'Harris County', 'Harris', HOU), leg('austintexas', 'City of Austin', 'Austin', 'Travis', 'Central Texas'),
  leg('cityofdallas', 'City of Dallas', 'Dallas', 'Dallas', DFW), leg('corpuschristi', 'City of Corpus Christi', 'Corpus Christi', 'Nueces', 'Coastal Bend'),
  leg('elpasotexas', 'City of El Paso', 'El Paso', 'El Paso', 'West Texas'), leg('plano', 'City of Plano', 'Plano', 'Collin', DFW),
  { id: 'fedreg', name: 'Federal Register (Texas flood / water notices)', agency: 'Federal Register', kind: 'fedreg', region: 'Federal / national', minScore: 3, topics: ['policy'] },
  { id: 'grantsgov', name: 'Grants.gov (flood / water / infrastructure)', agency: 'Grants.gov', kind: 'grantsgov', region: 'Federal / national', minScore: 6, topics: ['grant'] },
  { id: 'openfema', name: 'FEMA disaster declarations (Texas)', agency: 'FEMA', kind: 'openfema', region: 'Statewide', minScore: 0, topics: ['grant', 'flood'] }
];
async function collect(src) {
  if (src.kind === 'rss') return (await feed(src.url)).map((x) => Object.assign(x, { desc: src.media ? '' : x.desc })); // media: headline + link only
  if (src.kind === 'legistar') {
    const u = 'https://webapi.legistar.com/v1/' + src.client + '/matters?$top=60&$orderby=MatterIntroDate desc&$filter=' + encodeURIComponent("MatterIntroDate ge datetime'" + SINCE() + "' and (" + LEG_FILTER + ')');
    return JSON.parse(await get(u, { accept: 'application/json' })).map((m) => ({ title: I.text(m.MatterTitle || m.MatterName || ''), link: 'https://' + src.client + '.legistar.com/LegislationDetail.aspx?ID=' + m.MatterId + '&GUID=' + m.MatterGuid,
      date: m.MatterIntroDate ? new Date(m.MatterIntroDate + (/Z|[+-]\d\d:?\d\d$/.test(m.MatterIntroDate) ? '' : 'Z')).toISOString() : null, desc: [m.MatterTypeName, m.MatterBodyName, m.MatterFile].filter(Boolean).join(' · ') })).filter((x) => x.title);
  }
  if (src.kind === 'fedreg') {
    const out = [];
    for (const term of ['Texas flood', 'Texas drainage', 'Texas wastewater', 'Texas hazard mitigation']) {
      const j = JSON.parse(await get('https://www.federalregister.gov/api/v1/documents.json?per_page=20&order=newest&conditions[term]=' + encodeURIComponent(term) + '&conditions[publication_date][gte]=' + SINCE(), { accept: 'application/json' }));
      (j.results || []).forEach((r) => { if (/\bTexas\b|\bTX\b/.test((r.title || '') + ' ' + (r.abstract || ''))) out.push({ title: r.title, link: r.html_url, date: r.publication_date ? r.publication_date + 'T12:00:00Z' : null, desc: (r.type || '') + (r.abstract ? ': ' + r.abstract : '') }); });
    }
    return out;
  }
  if (src.kind === 'grantsgov') {
    const out = [];
    for (const kw of ['flood mitigation', 'stormwater', 'wastewater infrastructure', 'drainage', 'resilience infrastructure']) {
      const j = JSON.parse(await get('https://api.grants.gov/v1/api/search2', { method: 'POST', body: JSON.stringify({ keyword: kw, rows: 15, oppStatuses: 'forecasted|posted' }), headers: { 'Content-Type': 'application/json' }, accept: 'application/json' }));
      ((j.data && j.data.oppHits) || []).forEach((h) => { const d = h.openDate ? new Date(h.openDate) : null;
        out.push({ title: h.title, link: 'https://www.grants.gov/search-results-detail/' + h.id, date: d && !isNaN(d) ? d.toISOString() : null, desc: [h.agency || h.agencyCode, h.number, h.oppStatus, h.closeDate ? 'closes ' + h.closeDate : ''].filter(Boolean).join(' · ') + ' (federal funding notice)' }); });
    }
    return out;
  }
  if (src.kind === 'openfema') {
    const j = JSON.parse(await get("https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=" + encodeURIComponent("state eq 'TX' and declarationDate ge '" + SINCE() + "T00:00:00.000z'") + '&$orderby=declarationDate%20desc&$top=200', { accept: 'application/json' }));
    const by = {}; (j.DisasterDeclarationsSummaries || []).forEach((d) => { (by[d.disasterNumber] = by[d.disasterNumber] || { d, counties: [] }).counties.push((d.designatedArea || '').replace(/\s*\(County\)/, '')); });
    return Object.keys(by).map((k) => { const d = by[k].d, c = by[k].counties.filter(Boolean);
      return { title: 'FEMA ' + (d.declarationType === 'DR' ? 'major disaster' : d.declarationType === 'EM' ? 'emergency' : 'fire management') + ' declaration DR-' + d.disasterNumber + ' (Texas): ' + I.text(d.declarationTitle || d.incidentType),
        link: 'https://www.fema.gov/disaster/' + d.disasterNumber, date: d.declarationDate, desc: d.incidentType + ' · ' + c.length + ' designated area(s): ' + c.slice(0, 12).join(', ') + (c.length > 12 ? '…' : '') + (d.hmProgramDeclared ? ' · Hazard Mitigation (HMGP) declared' : '') }; });
  }
  throw new Error('unknown source kind ' + src.kind);
}
async function main() {
  const nowIso = new Date().toISOString();
  let prev = null; try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const items = [], statuses = [], failed = [];
  const only = process.env.INTEL_ONLY ? process.env.INTEL_ONLY.split(',') : null;
  // run hosts in parallel, sources on the same host one after another (Legistar shares one host)
  const byHost = {}; SOURCES.filter((s) => !only || only.indexOf(s.id) >= 0).forEach((s) => { const h = s.url ? new URL(s.url).hostname : s.kind; (byHost[h] = byHost[h] || []).push(s); });
  await Promise.all(Object.keys(byHost).map(async (h) => { for (const s of byHost[h]) {
    try { const raw = await collect(s); const kept = raw.map((r) => I.build(r, s, nowIso)).filter(Boolean);
      kept.forEach((k) => { if (s.kind === 'openfema' && /HMGP|Hazard Mitigation/.test(k.desc) && !k.hint) k.hint = 'Disaster declaration: HMGP mitigation funding typically opens 6–12 months later.'; });
      items.push.apply(items, kept); statuses.push({ id: s.id, name: s.name, agency: s.agency, status: 'ok', fetched: raw.length, kept: kept.length, fetchedAt: new Date().toISOString() });
      console.log('ok  ', s.id, raw.length, '->', kept.length);
    } catch (e) { failed.push(s.id); const keptPrev = ((prev && prev.items) || []).filter((p) => p.srcId === s.id).length;
      statuses.push({ id: s.id, name: s.name, agency: s.agency, status: 'failed', fetched: 0, kept: keptPrev, error: String(e.message || e).slice(0, 160) }); console.log('FAIL', s.id, e.message); }
  } }));
  const merged = I.mergePrev(I.dedupe(items), prev, nowIso, failed.concat(only ? SOURCES.map((s) => s.id).filter((id) => only.indexOf(id) < 0) : []));
  const st = require('./source-status.js').build(SOURCES.map((s) => statuses.find((x) => x.id === s.id)).filter(Boolean).concat(only ? ((prev && prev.sources && prev.sources.sources) || []).filter((p) => only.indexOf(p.id) < 0).map((p) => ({ id: p.id, name: p.name, agency: p.agency, status: p.health === 'fresh' ? 'ok' : 'failed', kept: p.records, fetchedAt: p.lastSuccess })) : []), prev && prev.sources, 'texas-intel', nowIso);
  st.sources.forEach((s) => { s.records = merged.filter((m) => m.srcId === s.id).length; });
  const out = { generatedAt: nowIso, keepDays: I.KEEP_DAYS, note: 'Public news and planning signals, not solicitations. Verify with the original source.', count: merged.length, sources: st, items: merged };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('wrote', OUT, merged.length, 'items;', JSON.stringify(st.counts));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { SOURCES, robotsAllowed, collect };
