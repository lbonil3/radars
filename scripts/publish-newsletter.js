#!/usr/bin/env node
// Weekly publication (Sunday night, Central): rebuild the kept issues from the collected items in texas/data/intel.json,
// finalize the week that just ended (frozen thereafter; never finalized twice), stamp publishedAt once, then render changed PDFs.
const fs = require('fs'), path = require('path'), cp = require('child_process'), L = require('./newsletter-pdf-lib.js');
const ND = path.join(__dirname, '..', 'texas', 'data', 'newsletters');
const nowIso = process.env.NOW || new Date().toISOString();
const intel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'texas', 'data', 'intel.json'), 'utf8'));
require('./build-intel.js').writeNewsletters(intel.items, nowIso);
const ix = JSON.parse(fs.readFileSync(path.join(ND, 'index.json'), 'utf8')); let stamped = [];
ix.weeks.forEach((w) => { const f = path.join(ND, w.week + '.json'), n = JSON.parse(fs.readFileSync(f, 'utf8'));
  // publish only the most recent finished week; older finished issues stay "Final"
  if (w === ix.weeks.find((x) => x.final) && L.markPublished(n, nowIso)) { fs.writeFileSync(f, JSON.stringify(n, null, 1)); stamped.push(w.week); }
  w.publishedAt = n.publishedAt || undefined; w.edition = L.edition(n); });
fs.writeFileSync(path.join(ND, 'index.json'), JSON.stringify(ix, null, 1));
console.log('published', stamped.join(',') || '(already published)', '· preview', ix.weeks.filter((w) => !w.final).map((w) => w.week).join(','));
cp.execFileSync(process.execPath, [path.join(__dirname, 'build-newsletter-pdfs.js')], { stdio: 'inherit', env: process.env });
