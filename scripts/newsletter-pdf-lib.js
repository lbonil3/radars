// Pure planning logic for newsletter PDFs: which issues to (re)render, which files to prune, size cap.
const crypto = require('crypto');
const MAX_TOTAL = 12 * 1024 * 1024; // cap for all kept PDFs together
function hash(issueJson, magJs, magCss) { return crypto.createHash('sha256').update(issueJson).update('\0').update(magJs).update('\0').update(magCss).digest('hex').slice(0, 16); }
// weeks: [{week, final}] newest first; hashes: {week: hash}; prev: previous pdf index {issues:[{week,hash,bytes,...}]}
function plan(weeks, hashes, prev) {
  const old = {}; ((prev && prev.issues) || []).forEach((e) => { old[e.week] = e; });
  const keep = new Set(weeks.map((w) => w.week));
  const render = weeks.filter((w) => !old[w.week] || old[w.week].hash !== hashes[w.week]).map((w) => w.week);
  const prune = Object.keys(old).filter((wk) => !keep.has(wk));
  return { render, prune };
}
// entries newest first; drop oldest finished issues until under the cap (never drop the newest two)
function cap(entries, max) { max = max || MAX_TOTAL; const out = entries.slice(); let tot = out.reduce((s, e) => s + e.bytes, 0); const dropped = [];
  while (tot > max && out.length > 2) { const e = out.pop(); tot -= e.bytes; dropped.push(e.week); } return { entries: out, dropped, total: tot }; }
// daily rebuild stamps are not content: ignore them so an unchanged draft is not re-rendered
function stable(json) { return JSON.stringify(JSON.parse(json), (k, v) => (k === 'generatedAt' ? undefined : v)); }
module.exports = { stable, hash, plan, cap, MAX_TOTAL };
