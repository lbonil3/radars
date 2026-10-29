#!/usr/bin/env node
// Data refresh workflows: installed, scheduled + manual, long timeout, contents: write, commit-only-when-changed, never force-push.
const fs = require('fs'), path = require('path'), assert = require('assert');
const W = path.join(__dirname, '..', '.github', 'workflows');
for (const [f, build, data, min] of [['refresh-national.yml', 'scripts/build-national.js', 'national/data/', 45], ['refresh-opportunities.yml', 'scripts/build-opportunities.js', 'texas/data/opportunities.json', 15]]) {
  const y = fs.readFileSync(path.join(W, f), 'utf8');
  assert.ok(/schedule:\s*\n\s*- cron: '\d+ \d+ \* \* \*'/.test(y), f + ' daily cron');
  assert.ok(/workflow_dispatch/.test(y), f + ' manual trigger');
  assert.ok(/contents: write/.test(y), f + ' contents: write');
  assert.ok(+y.match(/timeout-minutes: (\d+)/)[1] >= min, f + ' timeout >= ' + min);
  assert.ok(y.includes('node ' + build) && y.includes('git diff --quiet -- ' + data), f + ' builds and commits only on change');
  assert.ok(!/--force|-f\b|push\s+-f|\+HEAD/.test(y.replace(/curl -fsSL/g, '')), f + ' never force-pushes');
  assert.ok(/git pull --rebase origin main/.test(y), f + ' rebases before push');
}
const sw = fs.readFileSync(path.join(__dirname, '..', 'national', 'sw.js'), 'utf8');
assert.ok(/e\.respondWith\(fetch\(req\)/.test(sw), 'national sw is network-first so refreshed data reaches installed users');
console.log('check-workflows ok');
