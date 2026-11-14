#!/usr/bin/env node
/* Builds texas/data/opportunities.json from public feeds. Node 18+ (global fetch).
   Paid sources are not used. A free API key, if a later source needs one, is an environment variable and is never written into the snapshot.
   Run by hand (`node scripts/build-opportunities.js`) or from the scheduled workflow.
   Each source is isolated: if one fails, its previous records are kept (status "stale") and the others still update.
   Nothing is invented: only fields the sources return are used. */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const M = require('../texas/model.js');

const OUT = path.join(__dirname, '..', 'texas', 'data', 'opportunities.json');
const GEO = path.join(__dirname, '..', 'texas', 'texas-geo.js');
const UA = 'Mozilla/5.0 (compatible; radars-opportunity/1.1; daily public-data refresh; +https://lbonil3.github.io/radars/)';

// Polite fetching: requests are serialized (one at a time, sources run in order), hosts that rate-limit get a
// jittered minimum gap between calls, and HTTP 429/503 are retried with backoff that honors Retry-After.
const HOST_GAP_MS = { 'bonfirehub.com': 8000, 'bidnetdirect.com': 1500 }; // Bonfire answered HTTP 429 to back-to-back portal calls; BidNet is paged one public list at a time
const lastHit = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));
function hostKey(url) { const h = new URL(url).hostname; return Object.keys(HOST_GAP_MS).find((k) => h === k || h.endsWith('.' + k)) || null; }
function retryAfterMs(v) { if (!v) return null; const n = Number(v); if (isFinite(n)) return n * 1000; const d = Date.parse(v); return isFinite(d) ? Math.max(0, d - Date.now()) : null; }
async function get(url, opts) {
  opts = opts || {};
  const hk = hostKey(url), tries = hk ? 5 : 3;
  let lastErr;
  for (let i = 0; i < tries; i++) {
    if (hk) { const wait = (lastHit[hk] || 0) + jitter(HOST_GAP_MS[hk]) - Date.now(); if (wait > 0) await sleep(wait); lastHit[hk] = Date.now(); }
    let retryMs = null;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), opts.timeout || 90000);
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: opts.accept || '*/*', 'accept-language': 'en-US,en;q=0.8' }, signal: ctl.signal, redirect: 'follow' });
      clearTimeout(t);
      if (res.status === 429 || res.status === 503) retryMs = retryAfterMs(res.headers.get('retry-after'));
      if (!res.ok) { const e = new Error('HTTP ' + res.status + ' for ' + url.slice(0, 120)); e.status = res.status; throw e; }
      return opts.binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      lastErr = e; if (e.status && e.status >= 400 && e.status < 500 && e.status !== 429 && e.status !== 408) break; // not retryable
      if (i === tries - 1) break;
      const back = retryMs !== null ? Math.min(retryMs, 180000) + jitter(2000) : jitter((e.status === 429 ? 20000 : 1500) * Math.pow(2, i));
      console.log('  retry', i + 1, 'in', (back / 1000).toFixed(1) + 's', String(e.message).slice(0, 80)); await sleep(back);
    }
  }
  throw lastErr;
}
async function postJson(url, body, opts) {
  opts = opts || {};
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), opts.timeout || 90000);
      const res = await fetch(url, { method: 'POST', headers: { 'user-agent': UA, accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal, redirect: 'follow' });
      clearTimeout(t);
      if (!res.ok) { const e = new Error('HTTP ' + res.status + ' for ' + url.slice(0, 120)); e.status = res.status; throw e; }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (e.status && e.status >= 400 && e.status < 500 && e.status !== 429 && e.status !== 408) break;
      if (i === 2) break;
      await sleep(jitter(1500 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}
function blockedNote(who, detail) {
  return who + ' answered with a block' + (detail ? ' (' + detail + ')' : '') + '. The adapter does not try to get around it.';
}
async function readResponse(url, opts) {
  opts = opts || {};
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeout || 90000);
  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: Object.assign({ 'user-agent': UA, accept: opts.accept || '*/*', 'accept-language': 'en-US,en;q=0.8' }, opts.headers || {}),
      body: opts.body,
      signal: ctl.signal,
      redirect: 'follow'
    });
    return { status: res.status, text: await res.text() };
  } finally { clearTimeout(t); }
}
function responseBlocked(res) {
  return !!(res && (res.status === 401 || res.status === 403 || M.isSiteChallenge(res.text)));
}
async function readPage(url) {
  let text;
  try { text = await get(url); }
  catch (e) {
    if (e && (e.status === 403 || e.status === 401)) { const err = new Error('blocked'); err.blocked = true; err.status = e.status; throw err; }
    throw e;
  }
  if (M.isSiteChallenge(text)) { const err = new Error('blocked'); err.blocked = true; err.status = 403; throw err; }
  return text;
}
async function beaconOpenPage(start) {
  const query = 'query ListSolicitations($agencyTag: String, $status: String, $start: Int, $pageSize: Int) { solicitations(agencyTag: $agencyTag, status: $status, start: $start, pageSize: $pageSize) { total data { id title refnum type status dueDate issueDate } } }';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 90000);
  let res, text;
  try {
    res = await fetch('https://www.beaconbid.com/api/gql?operation=ListSolicitations', {
      method: 'POST',
      headers: { 'user-agent': UA, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ operationName: 'ListSolicitations', query: query, variables: { agencyTag: 'city-of-houston', status: 'open', start: start, pageSize: 100 } }),
      signal: ctl.signal, redirect: 'follow'
    });
    text = await res.text();
  } finally { clearTimeout(t); }
  if (res.status === 403 || res.status === 401 || M.isSiteChallenge(text)) return { blocked: true, status: res.status };
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for beaconbid.com open solicitations');
  const parsed = M.parseBeaconOpen(text);
  if (!parsed) throw new Error('Beacon open list was not the solicitations JSON');
  return { parsed: parsed };
}
async function bidnetBoard(startUrl, agency, src) {
  let first;
  try { first = await readPage(startUrl); }
  catch (e) { if (e.blocked) return { status: 'blocked by site', note: blockedNote(agency + ' on BidNet', 'HTTP ' + (e.status || 403)) }; throw e; }
  if (!/sol-info-container|simpleResultsNumResults|Open Solicitations/i.test(first)) throw new Error('BidNet open list not found (page layout may have changed)');
  const pages = [first];
  const pageable = /\/solicitations\/open-bids\/?$/.test(startUrl.replace(/\?.*$/, ''));
  let max = 1;
  if (pageable) { const re = /\/solicitations\/open-bids\/page(\d+)/g; let m; while ((m = re.exec(first))) max = Math.max(max, +m[1]); max = Math.min(max, 100); }
  const base = startUrl.replace(/\?.*$/, '').replace(/\/page\d+\/?$/, '').replace(/\/$/, '');
  for (let n = 2; n <= max; n++) {
    if (n === 2 || n % 10 === 0 || n === max) console.log('  bidnet', agency, 'page', n, 'of', max);
    let html;
    try { html = await readPage(base + '/page' + n); }
    catch (e) { if (e.blocked) return { status: 'blocked by site', note: blockedNote(agency + ' on BidNet', 'HTTP ' + (e.status || 403) + ' on page ' + n) }; throw e; }
    if (!/sol-info-container|simpleResultsNumResults/i.test(html)) throw new Error('BidNet page ' + n + ' had no solicitation list');
    pages.push(html);
  }
  let listed = 0; const recs = []; const seen = {};
  pages.forEach((html) => {
    const part = M.parseBidNet(html, agency, startUrl, src);
    listed += part.listed || 0;
    part.forEach((r) => { if (seen[r.id]) return; seen[r.id] = 1; recs.push(r); });
  });
  return { fetched: listed, recs: recs, note: 'Public BidNet titles for ' + agency + ': ' + listed + ' listed across ' + pages.length + ' page(s), ' + recs.length + (recs.length === 1 ? ' is' : ' are') + ' A/E consultant work. No login.' };
}
async function civcastBoard() {
  const page = await readResponse('https://app.civcast.com/');
  if (responseBlocked(page)) return { status: 'blocked by site', note: blockedNote('CivCast', page.status === 405 || M.isSiteChallenge(page.text) ? 'HTTP ' + page.status + ' AWS WAF human verification' : 'HTTP ' + page.status) + ' api-prod-app.civcast.com was not called.' };
  if (page.status !== 200) throw new Error('HTTP ' + page.status + ' for CivCast');
  throw new Error('CivCast returned a page that is not the human-verification block, and this wave has no parser for it');
}
async function openGovBoard(code, agency, src, county) {
  const statuses = ['open', 'pending', 'evaluation'];
  const recs = []; const seen = {}; let fetched = 0;
  for (const status of statuses) {
    let count = null, got = 0;
    for (let page = 1; page <= 10; page++) {
      const res = await readResponse('https://api.procurement.opengov.com/api/v1/government/' + code + '/project/public', {
        method: 'POST', accept: 'application/json', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filters: [{ type: 'status', value: status }], limit: 100, page: page })
      });
      if (responseBlocked(res)) return { status: 'blocked by site', note: blockedNote(agency + ' on OpenGov', M.isSiteChallenge(res.text) ? 'verification page' : 'HTTP ' + res.status) };
      if (res.status !== 200) throw new Error('HTTP ' + res.status + ' for OpenGov ' + code + ' ' + status);
      const parsed = M.parseOpenGovPublic(res.text, agency, code, src, county);
      if (!parsed) throw new Error('OpenGov public list was not the projects JSON (' + code + ' ' + status + ')');
      if (count === null) count = parsed.total;
      fetched += parsed.listed;
      got += parsed.listed;
      parsed.forEach((r) => { if (seen[r.id]) return; seen[r.id] = 1; recs.push(r); });
      if (!parsed.listed || got >= count) break;
      if (page === 10) throw new Error('OpenGov ' + code + ' ' + status + ' list was longer than 10 pages');
    }
  }
  return { fetched: fetched, recs: recs, note: 'OpenGov public list for ' + agency + ' (open, pending, and evaluation): ' + fetched + ' listed, ' + recs.length + (recs.length === 1 ? ' is' : ' are') + ' A/E consultant work. Closed and award-pending rows are not read. Summaries are not stored.' };
}
async function ionwaveBoard(origin, agency) {
  const robotsUrl = origin.replace(/\/$/, '') + '/robots.txt';
  let page;
  try { page = await readResponse(robotsUrl); }
  catch (e) { throw new Error('Could not read ' + robotsUrl + '. The bid list was not requested. ' + String(e.message || e).slice(0, 160)); }
  if (responseBlocked(page)) return { status: 'blocked by site', note: blockedNote(agency + ' IonWave', M.isSiteChallenge(page.text) ? 'verification page' : 'HTTP ' + page.status) + ' The bid list was not requested.' };
  if (M.robotsDisallowAll(page.text)) return { status: 'blocked by site', note: agency + ' IonWave robots.txt is User-agent: * / Disallow: /. The bid list was not requested.' };
  throw new Error(agency + ' IonWave robots.txt does not disallow the host. The bid list was not requested.');
}
async function getJson(url) {
  const body = await get(url, { accept: 'application/json' });
  const j = JSON.parse(body);
  if (j && j.error) throw new Error('API error ' + JSON.stringify(j.error).slice(0, 200) + ' for ' + url.slice(0, 120));
  return j;
}

async function getWithJar(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url.slice(0, 120));
  const cookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ');
  return { body: await res.text(), cookie: cookies };
}
const qs = (o) => Object.keys(o).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(o[k])).join('&');

async function arcgisAll(base, params, pageSize) {
  pageSize = pageSize || 1000;
  let feats = [], offset = 0, fields = null;
  for (;;) {
    const j = await getJson(base + '/query?' + qs(Object.assign({ f: 'json', resultOffset: offset, resultRecordCount: pageSize }, params)));
    fields = fields || j.fields;
    feats = feats.concat(j.features || []);
    if (!j.exceededTransferLimit || !(j.features || []).length) break;
    offset += (j.features || []).length;
  }
  return feats;
}

// ---- minimal xlsx reader (zip central directory + zlib), first worksheet only ----
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const files = {};
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(off + 26), lelen = buf.readUInt16LE(off + 28), start = off + 30 + lnlen + lelen;
    const data = buf.subarray(start, start + csize);
    files[name] = method === 0 ? data : zlib.inflateRawSync(data);
    p += 46 + nlen + elen + clen;
  }
  return files;
}
function xlsxRows(buf) {
  const z = unzip(buf), dec = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const ss = [];
  if (z['xl/sharedStrings.xml']) {
    const x = z['xl/sharedStrings.xml'].toString('utf8'); const re = /<si>([\s\S]*?)<\/si>/g; let m;
    while ((m = re.exec(x))) { let t = ''; const tr = /<t[^>]*>([\s\S]*?)<\/t>/g; let tm; while ((tm = tr.exec(m[1]))) t += tm[1]; ss.push(dec(t)); }
  }
  const sheetName = Object.keys(z).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  const x = z[sheetName].toString('utf8'), rows = []; const rre = /<row [^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g; let rm;
  const colIdx = (ref) => { const l = /^[A-Z]+/.exec(ref)[0]; let n = 0; for (const ch of l) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  while ((rm = rre.exec(x))) {
    const row = []; if (rm[1]) {
      const cre = /<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm;
      while ((cm = cre.exec(rm[1]))) {
        const attrs = cm[1], body = cm[2] || ''; const ref = /r="([A-Z]+\d+)"/.exec(attrs); if (!ref) continue;
        const type = (/t="([^"]+)"/.exec(attrs) || [])[1]; const v = (/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1];
        let val = null;
        if (type === 's' && v !== undefined) val = ss[+v]; else if (type === 'inlineStr') val = dec(((/<t[^>]*>([\s\S]*?)<\/t>/.exec(body)) || [, ''])[1]); else if (v !== undefined) val = type === 'str' || type === 'e' ? dec(v) : Number(v);
        row[colIdx(ref[1])] = val === undefined ? null : val;
      }
    }
    rows.push(row);
  }
  return rows;
}

// ---- sources ----
const SOURCES = [
  { id: 'txdot-pi', name: 'TxDOT Project Information (data.texas.gov / Socrata, refreshed hourly by TxDOT)', agency: 'TxDOT', type: 'API (CORS open; also refreshable live in the browser)', page: M.TXDOT_DATASET,
    run: async (ctx) => {
      const stages = M.TXDOT_KEEP_STAGES.map((s) => "'" + s.replace(/'/g, "''") + "'").join(',');
      const url = 'https://data.texas.gov/resource/drau-zphx.json?' + qs({ $select: M.TXDOT_SELECT.join(','), $where: 'project_stage in (' + stages + ")", $limit: 50000, $order: 'project_id' });
      const rows = JSON.parse(await get(url, { timeout: 180000 }));
      const total = JSON.parse(await get('https://data.texas.gov/resource/drau-zphx.json?$select=count(*)'))[0].count;
      const recs = rows.map(M.normTxdotPI).filter(Boolean);
      return { fetched: rows.length, recs, note: 'Dataset has ' + total + ' rows in all stages; kept projects in pre-construction stages (' + M.TXDOT_KEEP_STAGES.join(', ') + ') that match drainage keywords or roadway/bridge types likely to carry drainage design.' };
    } },
  { id: 'txdot-tracker', name: 'TxDOT Project Tracker, PS&E milestone dates (ArcGIS TxDOT_Projects_Info)', agency: 'TxDOT', type: 'API (CORS open); enrichment only, joined by project ID', page: 'https://www.txdot.gov/projects/project-tracker.html',
    run: async (ctx) => {
      const base = 'https://services.arcgis.com/KTcxiTD9dsQw4r7Z/ArcGIS/rest/services/TxDOT_Projects_Info/FeatureServer/0';
      const stages = M.TXDOT_KEEP_STAGES.map((s) => "'" + s + "'").join(',');
      const feats = await arcgisAll(base, { where: 'PROJ_STG in (' + stages + ')', outFields: M.TRACKER_FIELDS.join(','), returnGeometry: false }, 1000);
      const map = {}; feats.forEach((f) => { map[f.attributes.PROJ_ID] = f.attributes; });
      let joined = 0; ctx.records.forEach((r) => { if (r.src === 'txdot-pi') { const id = r.id.slice(6); if (map[id] && M.mergeTracker(r, map[id])) joined++; } });
      return { fetched: feats.length, recs: [], joined, note: 'Enrichment only (adds actual PS&E 30/60/100% dates and TxDOT contact where the Tracker has them). Joined to ' + joined + ' radar records.' };
    } },
  { id: 'txdot-pcl', name: 'TxDOT Projected Contracts List: anticipated A/E/S consultant contracts (xlsx)', agency: 'TxDOT', type: 'Snapshot (file download, no CORS)', page: 'https://www.txdot.gov/business/peps/opportunities/fiscal-year-procurement-plan.html',
    run: async () => {
      const now = new Date(); const fy0 = now.getUTCMonth() >= 8 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(); const recs = []; const tried = []; let fetched = 0;
      for (const fy of [fy0, fy0 + 1]) {
        const url = 'https://www.txdot.gov/content/dam/docs/division/ppd/projected-contracts/projected-contracts-list-' + fy + '.xlsx';
        try { const rows = xlsxRows(await get(url, { binary: true })); const rs = M.parseProjectedContracts(rows, url, 'FY' + fy); fetched += rs.length; recs.push(...rs); tried.push('FY' + fy + ': ' + rs.length + ' rows'); } catch (e) { tried.push('FY' + fy + ': ' + String(e.message).slice(0, 60)); }
      }
      if (!recs.length) throw new Error('no projected contracts list could be read (' + tried.join('; ') + ')');
      return { fetched, recs, note: 'All rows kept (including non-drainage disciplines, flagged as not relevant). ' + tried.join('; ') };
    } },
  { id: 'txdot-peps', name: 'TxDOT PEPS "Consultants selected for negotiations" (HTML table: PS&E, H&H, bridge design only)', agency: 'TxDOT', type: 'Snapshot (HTML scrape of a public page; txdot.gov has no robots.txt)', page: M.PEPS_SELECTED_PAGE,
    run: async () => {
      const html = await get(M.PEPS_SELECTED_PAGE); const fyMin = new Date().getUTCFullYear() - 1;
      const recs = M.parsePepsSelected(html, fyMin);
      if (!recs.length) throw new Error('no PS&E/H&H/BRGD rows parsed (page layout may have changed)');
      return { fetched: recs.length, recs, note: 'Keeps work types PS&E, H&H and BRGD from fiscal year ' + fyMin + ' onward. The page lists only ID, closing date, wave, work type, service center.' };
    } },
  { id: 'txdot-meetings', name: 'TxDOT PEPS consultant information meetings (HTML table)', agency: 'TxDOT', type: 'Snapshot (HTML scrape of a public page)', page: M.PEPS_MEETINGS_PAGE,
    run: async () => {
      const html = await get(M.PEPS_MEETINGS_PAGE); const recs = M.parsePepsMeetings(html);
      const total = M.htmlTables(html).reduce((n, t) => n + (t.length && /^date$/i.test(t[0].cells[0]) ? t.length - 1 : 0), 0);
      if (!total) throw new Error('meetings table not found (page layout may have changed)');
      return { fetched: total, recs, note: 'Kept meetings whose title mentions PS&E/hydraulics/drainage/bridge design or matches drainage keywords.' };
    } },
  { id: 'coh-cip', name: 'City of Houston CIP: stormwater and drainage layers (HPW CIPProgramming MapServer)', agency: 'City of Houston', type: 'Snapshot (ArcGIS REST; CORS reflects origin)', page: 'https://geoprocessor2.houstontx.gov/arcgis/rest/services/CP/CIPProgramming/MapServer?f=pjson',
    run: async () => {
      const byKey = {}; let fetched = 0;
      for (const layer of M.COH_LAYERS) {
        const feats = await arcgisAll(M.COH_BASE + '/' + layer.id, { where: '1=1', outFields: '*', outSR: 4326, returnGeometry: true, maxAllowableOffset: 0.001 }, 1000);
        fetched += feats.length;
        feats.forEach((f) => {
          const r = M.normCohCip(f.attributes, f.geometry, layer); if (!r) return;
          const k = r._cip + '|' + r.stage; const prev = byKey[k];
          // prefer the Benefit Drainage Area record (richer attributes) over the plain stormwater line
          if (!prev || (layer.id === 11 || layer.id === 68)) byKey[k] = r;
        });
      }
      const recs = Object.keys(byKey).map((k) => { const r = byKey[k]; delete r._cip; delete r._layer; return r; });
      return { fetched, recs, note: 'Layers 7, 11, 65, 68 (stormwater/drainage) kept whole; layers 2 and 10 (street/traffic, interagency) kept only when the description matches drainage keywords. Same CIP number+stage across layers is merged. Completed (CP) projects dropped.' };
    } },
  { id: 'coh-swmb', name: 'City of Houston stormwater maintenance (SWMB) project list (FeatureServer)', agency: 'City of Houston', type: 'Snapshot (ArcGIS REST)', page: 'https://services1.arcgis.com/XpTq0H1nJ5DHgofs/arcgis/rest/services/AGOL_SWMB_Projects/FeatureServer?f=pjson',
    run: async () => {
      const feats = await arcgisAll(M.COH_SWMB_BASE, { where: '1=1', outFields: '*', returnGeometry: false }, 1000);
      const recs = feats.map((f) => M.normSwmb(f.attributes)).filter(Boolean);
      return { fetched: feats.length, recs, note: 'Kept pre-construction and in-progress statuses only (nomination, qualifies, planned, study, screening, in design, NTP pending, in construction, on hold). Completed, cancelled, closed, transferred and archived dropped.' };
    } },
  { id: 'hcfcd-maint', name: 'HCFCD maintenance project schedule (ArcGIS layer hosted by LJA Engineering; unofficial mirror)', agency: 'HCFCD', type: 'Snapshot (ArcGIS REST)', page: M.HCFCD_PAGE,
    run: async () => {
      const feats = await arcgisAll(M.HCFCD_LJA, { where: '1=1', outFields: '*', outSR: 4326, returnGeometry: true }, 1000);
      const recs = feats.map((f) => M.normHcfcdMaint(f.attributes, f.geometry)).filter(Boolean);
      return { fetched: feats.length, recs, note: 'Hosted by a consulting firm, not by HCFCD; only FY26 maintenance projects (not the capital/bond program). Completed and cancelled dropped.' };
    } },
  { id: 'hcfcd-bids', name: 'HCFCD "Current & Past Bid Opportunities" (HTML tables, links to Bonfire)', agency: 'HCFCD', type: 'Snapshot (HTML scrape; hcfcd.org robots.txt does not disallow this path)', page: M.HCFCD_BIDS_PAGE,
    run: async () => {
      const html = await get(M.HCFCD_BIDS_PAGE); const recs = M.parseHcfcdBids(html);
      if (!recs.length) throw new Error('no bid rows parsed (page layout may have changed)');
      return { fetched: recs.length, recs, note: 'The page lists job number, title and a Bonfire link only: no due dates, no open/closed flag, no location. Links are copied from HCFCD\'s page; Bonfire answers automated requests with 403 (bot protection), so they were not click-tested.' };
    } },
  { id: 'twdb-fif', name: 'TWDB Flood Infrastructure Fund project list (table hosted by Pape-Dawson Engineers; mirror of TWDB data)', agency: 'TWDB', type: 'Snapshot (ArcGIS REST table, no coordinates)', page: M.FIF_PAGE,
    run: async () => {
      const feats = await arcgisAll(M.FIF_URL, { where: '1=1', outFields: '*', returnGeometry: false }, 1000);
      const recs = feats.map((f) => M.normFif(f.attributes)).filter(Boolean);
      return { fetched: feats.length, recs, note: 'Mirror hosted by a consulting firm. Rows have sponsor, name, estimated cost and FIF type; no stage, date or coordinates.' };
    } },
  // ---- consultant-services solicitations (added in radar-consultant-services) ----
  { id: 'austin-active', name: 'City of Austin Finance Online: Active Solicitations (xlsx export of the public page)', agency: 'City of Austin', type: 'Snapshot (xlsx download; public, no login; austintexas.gov has no robots.txt for this host)', page: M.AUSTIN_SOL_PAGE,
    run: async () => {
      const rows = xlsxRows(await get(M.AUSTIN_SOL_XLSX, { binary: true })); const recs = M.parseAustinActive(rows);
      if (!recs.length) throw new Error('no active solicitations parsed (export layout may have changed)');
      const svc = recs.filter(M.isConsultant).length;
      return { fetched: recs.length, recs, note: 'Every active solicitation Austin lists (all categories). ' + svc + ' are in the Consultant services focus (RFQS = qualifications-type, or RFP with engineering words). Contact names/emails in the export are not copied. Austin lists open solicitations only; no "upcoming" list was found.' };
    } },
  { id: 'austin-contracts', name: 'City of Austin Contracts dataset (data.austintexas.gov / Socrata 84ih-p28j): active professional-services agreements', agency: 'City of Austin', type: 'Snapshot (open-data API, CORS open); awarded work, not solicitations', page: M.AUSTIN_CONTRACTS_PAGE,
    run: async () => {
      const rows = JSON.parse(await get(M.AUSTIN_CONTRACTS_URL + '?' + qs({ $limit: 50000 }), { accept: 'application/json' }));
      const recs = M.normAustinContracts(rows);
      if (!recs.length) throw new Error('no Professional Services agreements found');
      return { fetched: rows.length, recs, note: 'Dataset rows: ' + rows.length + ' (' + rows.filter((r) => /^professional services$/i.test(r.cat_dscr || '')).length + ' in category Professional Services, grouped into ' + recs.length + ' agreements with their vendor lists). These are AWARDED agreements; the end date can hint at a recompete (inferred). Dataset says contracts are visible only while active, but several end dates are in the past; shown as given.' };
    } },
  { id: 'sa-bids', name: 'City of San Antonio Bidding & Contracting list (HTML grid, 2 pages)', agency: 'City of San Antonio', type: 'Snapshot (HTML scrape; webapp1.sanantonio.gov has no robots.txt)', page: M.SA_PAGE,
    run: async () => {
      const first = await getWithJar(M.SA_PAGE); let recs = M.parseSanAntonio(first.body); let pages = 1;
      const fields = {}; let m; const re = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g;
      while ((m = re.exec(first.body))) fields[m[1]] = M.decodeHtml ? M.decodeHtml(m[2]) : m[2];
      const pager = (first.body.match(/__doPostBack\(&#39;(ctl00\$ContentPlaceHolder1\$gvBidContractOpps)&#39;,&#39;Page\$(\d+)&#39;\)/g) || []).map((x) => +/Page\$(\d+)/.exec(x)[1]);
      const maxPage = Math.min(Math.max.apply(null, [1].concat(pager)), 6);
      for (let pg = 2; pg <= maxPage; pg++) {
        try {
          const body = new URLSearchParams(Object.assign({}, fields, { __EVENTTARGET: 'ctl00$ContentPlaceHolder1$gvBidContractOpps', __EVENTARGUMENT: 'Page$' + pg })).toString();
          const res = await fetch(M.SA_PAGE, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded', cookie: first.cookie }, body });
          if (!res.ok) break; recs = recs.concat(M.parseSanAntonio(await res.text())); pages++;
        } catch (e) { break; }
      }
      const seen = {}; recs = recs.filter((r) => (seen[r.id] ? false : (seen[r.id] = 1)));
      if (!recs.length) throw new Error('no San Antonio rows parsed (page layout may have changed)');
      return { fetched: recs.length, recs, note: 'Read ' + pages + ' page(s) of the list. The list shows title, type, department and dates; solicitation documents are on SAePS/CivCast and need registration. ' + recs.filter(M.isConsultant).length + ' are in the Consultant services focus.' };
    } },
  { id: 'esbd', name: 'Texas SmartBuy ESBD posted solicitations (public Export to CSV; professional A/E only)', agency: 'Texas', type: 'Snapshot (CSV from the public Export to CSV button; no login)', page: M.ESBD_PAGE,
    run: async () => {
      const j = await postJson(M.ESBD_CSV_URL, { isCSV: true, status: '1' });
      if (!j || typeof j.csv !== 'string' || !/^(\uFEFF)?Name,Solicitation ID/.test(j.csv)) throw new Error('ESBD export did not return the posted-solicitations CSV');
      const recs = M.parseEsbdCsv(j.csv, j.agencies);
      return { fetched: recs.posted || recs.length, recs, note: 'One POST of the public Export to CSV button for status Posted (including addenda): ' + (recs.posted || recs.length) + ' solicitations, of which ' + recs.length + ' are professional architecture or engineering (NIGP class 906, 907, or 925, or A/E wording). txsmartbuy.gov robots.txt disallows the host; this single daily call is that export and needs no login. The extension path can change when the Comptroller republishes the site.' };
    } },
  { id: 'aggiebid', name: 'Texas A&M AggieBid open bids (public list; RFQ and RFP only)', agency: 'TAMU', type: 'Snapshot (HTML of the public open-for-bid list; no login)', page: M.AGGIE_PAGE,
    run: async () => {
      const html = await get(M.AGGIE_PAGE);
      const rows = (html.match(/SourcingPublicSite_LABEL_TYPE_/g) || []).length;
      if (!rows) throw new Error('AggieBid open-bids table not found (page layout may have changed)');
      const recs = M.parseAggieBid(html);
      return { fetched: rows, recs, note: 'Open bids on AggieBid. Kept RFQ and RFP rows (' + recs.length + ' of ' + rows + '). Contact emails are not copied. ' + recs.filter(M.isConsultant).length + ' are in the Consultant services focus.' };
    } },
  { id: 'ctrma', name: 'CTRMA procurements (Engineering, Construction, and awarded engineering rows)', agency: 'CTRMA', type: 'Snapshot (HTML of the public procurements page)', page: M.CTRMA_PAGE,
    run: async () => {
      const html = await get(M.CTRMA_PAGE);
      if (!/>ENGINEERING</.test(html) && !/ENGINEERING/.test(html)) throw new Error('CTRMA engineering section not found (page layout may have changed)');
      const recs = M.parseCtrma(html);
      if (!recs.length) throw new Error('no CTRMA rows parsed (page layout may have changed)');
      return { fetched: recs.length, recs, note: 'Engineering and Construction tables, plus awarded rows whose type is engineering work. Awarded rows are past. A stage that says forthcoming is a forecast. ' + recs.filter(M.isConsultant).length + ' are in the Consultant services focus.' };
    } },
  { id: 'ntta', name: 'NTTA Marketplace open bids (public list; A/E consultant rows only)', agency: 'NTTA', type: 'Snapshot (HTML of the public open-bids table; no login)', page: M.NTTA_PAGE,
    run: async () => {
      let html;
      try { html = await readPage(M.NTTA_PAGE); }
      catch (e) { if (e.blocked) return { status: 'blocked by site', note: blockedNote('NTTA Marketplace', 'HTTP ' + (e.status || 403)) }; throw e; }
      if (!/bidResultId_data/.test(html)) throw new Error('NTTA open-bids table not found (page layout may have changed)');
      const recs = M.parseNtta(html);
      return { fetched: recs.listed, recs, note: 'Open bids on NTTA Marketplace: ' + recs.listed + ' listed, ' + recs.length + ' are A/E consultant work. Buyer names are not copied.' };
    } },
  { id: 'houston-beacon', name: 'City of Houston open solicitations (Beacon Bid public list; A/E consultant rows only)', agency: 'City of Houston', type: 'Snapshot (JSON the public open-list page loads; no login)', page: 'https://www.beaconbid.com/solicitations/city-of-houston/open',
    run: async () => {
      let start = 0, listed = 0, total = 0; const recs = []; const seen = {};
      for (let i = 0; i < 3; i++) {
        const page = await beaconOpenPage(start);
        if (page.blocked) return { status: 'blocked by site', note: blockedNote('City of Houston Beacon Bid', page.status === 403 || page.status === 401 ? 'HTTP ' + page.status : 'verification page') };
        total = page.parsed.total;
        listed += page.parsed.listed;
        page.parsed.forEach((r) => { if (seen[r.id]) return; seen[r.id] = 1; recs.push(r); });
        if (listed >= total || !page.parsed.listed) break;
        start += page.parsed.listed;
      }
      return { fetched: total || listed, recs, note: 'Open solicitations on Beacon Bid for the City of Houston: ' + (total || listed) + ' listed, ' + recs.length + ' are A/E consultant work. Contacts are not requested. A verification page stops this source.' };
    } },
  { id: 'bidnet-travis', name: 'Travis County open solicitations (BidNet Direct public titles)', agency: 'Travis County', type: 'Snapshot (HTML of the public board; no login)', page: 'https://www.bidnetdirect.com/texas/traviscounty',
    run: () => bidnetBoard('https://www.bidnetdirect.com/texas/traviscounty', 'Travis County', 'bidnet-travis') },
  { id: 'bidnet-dallas', name: 'Dallas County open solicitations (BidNet Direct public titles)', agency: 'Dallas County', type: 'Snapshot (HTML of the public board; no login)', page: 'https://www.bidnetdirect.com/texas/dallas-county',
    run: () => bidnetBoard('https://www.bidnetdirect.com/texas/dallas-county', 'Dallas County', 'bidnet-dallas') },
  { id: 'bidnet-tpg', name: 'Texas Purchasing Group open solicitations (BidNet Direct public board)', agency: 'Texas Purchasing Group', type: 'Snapshot (HTML of the public open-bids pages; no login)', page: 'https://www.bidnetdirect.com/texas/solicitations/open-bids',
    run: () => bidnetBoard('https://www.bidnetdirect.com/texas/solicitations/open-bids', 'Texas Purchasing Group', 'bidnet-tpg') },
  { id: 'civcast', name: 'CivCast public project listings (Texas agencies; A/E consultant rows only)', agency: 'CivCast', type: 'Snapshot (public project board; no login). robots.txt allows the host. A human-verification page stops this source.', page: 'https://app.civcast.com/',
    run: () => civcastBoard() },
  { id: 'opengov-hidalgo', name: 'Hidalgo County solicitations (OpenGov Procurement public list; A/E consultant rows only)', agency: 'Hidalgo County', type: 'Snapshot (JSON the public portal script posts; no login). Open, pending, and evaluation only.', page: 'https://procurement.opengov.com/portal/co-hidalgo-tx',
    run: () => openGovBoard('co-hidalgo-tx', 'Hidalgo County', 'opengov-hidalgo', 'Hidalgo') },
  { id: 'opengov-hgac', name: 'H-GAC solicitations (OpenGov Procurement public list; A/E consultant rows only)', agency: 'H-GAC', type: 'Snapshot (JSON the public portal script posts; no login). Open, pending, and evaluation only.', page: 'https://procurement.opengov.com/portal/h-gac',
    run: () => openGovBoard('h-gac', 'H-GAC', 'opengov-hgac', null) },
  { id: 'ionwave-plano', name: 'City of Plano current bids (IonWave). robots.txt disallows every crawler, so the bid list is not read.', agency: 'City of Plano', type: 'Not fetched (robots.txt Disallow: /)', page: 'https://planotx.ionwave.net/',
    run: () => ionwaveBoard('https://planotx.ionwave.net', 'City of Plano') },
  { id: 'ionwave-tarrant', name: 'Tarrant County current bids (IonWave). robots.txt disallows every crawler, so the bid list is not read.', agency: 'Tarrant County', type: 'Not fetched (robots.txt Disallow: /)', page: 'https://tarrantcountytx.ionwave.net/',
    run: () => ionwaveBoard('https://tarrantcountytx.ionwave.net', 'Tarrant County') },
  { id: 'ionwave-elpaso', name: 'City of El Paso current bids (IonWave). robots.txt disallows every crawler, so the bid list is not read.', agency: 'City of El Paso', type: 'Not fetched (robots.txt Disallow: /)', page: 'https://elpasotexas.ionwave.net/',
    run: () => ionwaveBoard('https://elpasotexas.ionwave.net', 'City of El Paso') }
].concat(M.BONFIRE_PORTALS.map((p) => ({ id: 'bonfire-' + p.sub, name: p.agency + ' open solicitations (Bonfire portal ' + p.sub + '.bonfirehub.com, the portal\'s own public JSON list)', agency: p.agency, type: 'Snapshot (undocumented public JSON the portal page itself loads; robots.txt allows; no login)', page: 'https://' + p.sub + '.bonfirehub.com/portal/?tab=openOpportunities',
  run: async () => {
    const j = JSON.parse(await get('https://' + p.sub + '.bonfirehub.com/PublicPortal/getOpenPublicOpportunitiesSectionData', { accept: 'application/json' }));
    if (!j || !j.success || !j.payload) throw new Error('unexpected Bonfire response');
    const list = Array.isArray(j.payload.projects) ? j.payload.projects : Object.keys(j.payload.projects || {}).map((k) => j.payload.projects[k]);
    const recs = list.map((x) => M.bonfireRecord(x, p, j.payload.departments)).filter(Boolean);
    const hctra = recs.filter((r) => r.agency === 'HCTRA').length;
    const peps = recs.filter((r) => r.dept && /PEPS/i.test(r.dept)).length;
    return { fetched: list.length, recs, note: 'All open opportunities on the portal (' + list.length + '); ' + recs.filter(M.isConsultant).length + ' are in the Consultant services focus.' + (hctra ? ' ' + hctra + ' are labeled HCTRA because the title or department names the Harris County Toll Road Authority.' : '') + (p.sub === 'txdot' ? ' Department names come from the list. A department named Professional Engineering (PEPS) is A/E; internal codes such as PRO_Services are not. This run: ' + peps + ' PEPS.' : '') + ' Close times are not labeled with a time zone by the portal, so only the date is used. Bonfire opportunity pages return HTTP 403 to scripts but open in a browser.' };
  } })));


async function main() {
  let prev = null; try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  const ctx = { records: [] }; const statuses = [];
  for (const s of SOURCES) {
    const t0 = Date.now(); const st = { id: s.id, name: s.name, agency: s.agency, type: s.type, page: s.page };
    try {
      const r = await s.run(ctx);
      if (r && r.status === 'blocked by site') {
        const old = prev ? prev.records.filter((x) => x.src === s.id) : [];
        const ost = prev ? (prev.sources || []).find((x) => x.id === s.id) : null;
        st.status = 'blocked by site'; st.fetched = r.fetched || 0; st.kept = old.length; st.fetchedAt = ost ? ost.fetchedAt : null; st.error = null;
        st.note = r.note + (old.length ? ' Showing records from the previous successful run.' : '');
        ctx.records.push(...old);
      } else {
      st.status = 'ok'; st.fetched = r.fetched; st.kept = r.recs.length; st.note = r.note; st.fetchedAt = new Date().toISOString();
      if (r.joined !== undefined) st.joined = r.joined;
      ctx.records.push(...r.recs);
      }
    } catch (e) {
      const old = prev ? prev.records.filter((x) => x.src === s.id) : [];
      const ost = prev ? (prev.sources || []).find((x) => x.id === s.id) : null;
      st.status = old.length || s.id === 'txdot-tracker' ? 'stale' : 'failed'; st.error = String(e.message).slice(0, 300);
      st.fetched = ost ? ost.fetched : 0; st.kept = old.length; st.fetchedAt = ost ? ost.fetchedAt : null; st.note = 'Last fetch failed: ' + st.error + (old.length ? ' Showing records from the previous successful run.' : '');
      if (s.id === 'txdot-tracker') { // keep prior enrichment: re-carry extras from previous txdot-pi records
        const pm = {}; if (prev) prev.records.forEach((x) => { if (x.src === 'txdot-pi') pm[x.id] = x; });
        ctx.records.forEach((r) => { const o = pm[r.id]; if (o && o.tracker) { r.extra = o.extra; r.tracker = true; } });
      } else ctx.records.push(...old);
    }
    console.log((st.status + '      ').slice(0, 7), s.id.padEnd(15), 'fetched', String(st.fetched).padStart(6), 'kept', String(st.kept).padStart(5), ((Date.now() - t0) / 1000).toFixed(1) + 's', st.error ? ' ERR ' + st.error : '');
    statuses.push(st);
  }
  // county-centroid fallback location (inferred), only when a source names a county but gives no coordinates
  let approx = 0;
  try { const g = fs.readFileSync(GEO, 'utf8'); const geo = JSON.parse(g.slice(g.indexOf('{'), g.lastIndexOf('}') + 1)); ctx.records.forEach((r) => { delete r.alat; delete r.alon; }); approx = M.applyApprox(ctx.records, M.countyCentroids(geo)); } catch (e) { console.warn('no county centroids', e.message); }
  // one record when the same solicitation is on two feeds; keep an id the previous snapshot already had
  const prefer = new Set(); if (prev) (prev.records || []).forEach((r) => prefer.add(r.id));
  ctx.records = M.mergeDuplicates(ctx.records, prefer);
  // stable ordering and id uniqueness
  const seen = {}; const records = ctx.records.filter((r) => { if (seen[r.id]) return false; seen[r.id] = 1; return true; });
  records.sort((a, b) => (a.agency < b.agency ? -1 : a.agency > b.agency ? 1 : a.id < b.id ? -1 : 1));
  records.forEach((r) => { Object.keys(r).forEach((k) => { if (r[k] === null || r[k] === undefined || (Array.isArray(r[k]) && !r[k].length)) delete r[k]; }); delete r._t; });
  const out = { generatedAt: new Date().toISOString(), generator: 'scripts/build-opportunities.js', approxLocated: approx, sources: statuses, records };
  const ok = statuses.filter((s) => s.status === 'ok').length;
  if (!records.length || ok === 0) { console.error('Nothing usable fetched; keeping existing file.'); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  require('./source-status.js').write(path.join(path.dirname(OUT), 'source-status.json'), statuses, 'texas');
  console.log('wrote', OUT, records.length, 'records,', (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB,', ok + '/' + statuses.length, 'sources ok');
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { xlsxRows, unzip, SOURCES };
