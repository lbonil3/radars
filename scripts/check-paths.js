#!/usr/bin/env node
// Fails if any relative reference (HTML src/href, CSS url(), JS require/register/fetch, manifest paths, sw.js FILES)
// resolves outside the repo root, or if a local HTML/CSS/sw reference points to a missing file. Run: node scripts/check-paths.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const bad = [];
function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === '.git' || e.name === 'node_modules' || e.name.startsWith('.cache') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); }
const files = walk(ROOT).filter((f) => /\.(html|js|css|webmanifest)$/.test(f) && !/[\\/]data[\\/]/.test(f));
const isRel = (r) => r && !/^([a-z]+:|\/\/|#|data:|mailto:|\$|\{)/i.test(r) && !r.startsWith('/');
let n = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'), dir = path.dirname(f), refs = [];
  const must = /\.(html|css)$/.test(f) || /sw\.js$/.test(f) || /\.webmanifest$/.test(f);
  const pats = [/(?:src|href)\s*=\s*"([^"]+)"/g, /url\(\s*['"]?([^'")]+)['"]?\s*\)/g, /require\(\s*'([^']+)'\s*\)/g, /"(?:src|start_url|scope)"\s*:\s*"([^"]+)"/g];
  if (/sw\.js$/.test(f)) pats.push(/'(\.{1,2}\/[^']*)'/g);
  for (const p of pats) for (const m of src.matchAll(p)) refs.push(m[1]);
  for (const m of src.matchAll(/['"](\.\.\/[^'"\s]*)['"]/g)) refs.push(m[1]); // any ../ string literal
  for (let r of refs) {
    if (!isRel(r) || (/require/.test(r) === false && /^[a-z@][\w.-]*$/i.test(r) && !r.includes('.'))) continue;
    if (!r.startsWith('.') && !/\.\w+([?#].*)?$/.test(r) && !r.endsWith('/')) continue; // bare module names (fs, path)
    r = r.split(/[?#]/)[0]; n++;
    const abs = path.resolve(dir, r), rel = path.relative(ROOT, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) { bad.push(path.relative(ROOT, f) + ': "' + r + '" escapes the repo'); continue; }
    if (must && !fs.existsSync(abs)) bad.push(path.relative(ROOT, f) + ': "' + r + '" not found');
  }
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('check-paths ok: ' + n + ' relative references in ' + files.length + ' files, none escape the repo');
