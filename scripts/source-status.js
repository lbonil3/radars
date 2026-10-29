/* Per-source refresh status file (national/data/source-status.json, texas/data/source-status.json).
   fresh   = fetched OK this run
   stale   = this run failed but records from the last successful run are kept
   failing = this run failed and nothing usable is kept, or the last success is older than FAIL_DAYS
   skipped/disabled = not attempted by design. lastSuccess is carried from the previous file. */
'use strict';
const fs = require('fs');
const FAIL_DAYS = 7;
function classify(st, lastSuccess, now) {
  if (st.status === 'ok') return 'fresh';
  if (st.status === 'skipped' || st.status === 'disabled') return st.status;
  if (!st.kept) return 'failing';
  if (lastSuccess && (now - Date.parse(lastSuccess)) > FAIL_DAYS * 864e5) return 'failing';
  return 'stale';
}
function build(statuses, prev, group, nowIso) {
  const now = Date.parse(nowIso || new Date().toISOString());
  const pm = {}; ((prev && prev.sources) || []).forEach((s) => { pm[s.id] = s; });
  const seen = {};
  const sources = statuses.filter((s) => s && s.id && !seen[s.id] && (seen[s.id] = 1)).map((s) => {
    const p = pm[s.id] || {};
    const off = s.status === 'skipped' || s.status === 'disabled';
    const lastSuccess = off ? (p.lastSuccess || null) : s.status === 'ok' ? (s.fetchedAt || new Date(now).toISOString()) : (p.lastSuccess || s.fetchedAt || null);
    const health = classify(s, lastSuccess, now);
    return { id: s.id, name: s.name, agency: s.agency || null, group: group, health: health, lastAttempt: new Date(now).toISOString(), lastSuccess: lastSuccess, records: s.kept || 0, fetched: s.fetched || 0,
      error: health === 'fresh' ? null : off ? (/api.?key/i.test(s.note || '') ? 'Turned off: needs an API key that is not configured' : 'Turned off for this run') : (s.error || null), failingSince: health === 'stale' || health === 'failing' ? (p.failingSince || new Date(now).toISOString()) : null };
  });
  const c = { fresh: 0, stale: 0, failing: 0, skipped: 0, disabled: 0 }; sources.forEach((s) => { c[s.health] = (c[s.health] || 0) + 1; });
  return { generatedAt: new Date(now).toISOString(), group: group, counts: c, sources: sources };
}
function write(file, statuses, group) {
  let prev = null; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* first run */ }
  const out = build(statuses, prev, group);
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('wrote', file, JSON.stringify(out.counts));
  return out;
}
module.exports = { build, write, classify, FAIL_DAYS };
