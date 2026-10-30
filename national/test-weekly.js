// v5.4 weekly list builders. Run alone: node national/test-weekly.js
const assert = require('assert'); const W = require('./weekly.js'); const CP = require('./capture.js');
const fmt = (d) => d; const T = '2026-10-29';
const rows = [{ id: 'a', week: true, flag: 'soon', cap: { due: '2026-11-02', decision: 'Go', next: 'Call PM', notes: 'Line1\nLine2 <b>' }, snap: { title: 'Drainage <PS&E>', agency: 'TxDOT', state: 'TX', url: 'https://example.test/a' } },
  { id: 'b', week: false, flag: '', cap: { due: '', decision: 'Undecided' }, snap: { title: 'Water plant design', agency: 'City', state: 'WA' } }];
const md = W.model(rows, T, CP, fmt);
assert.strictEqual(md.week.length, 1); assert.strictEqual(md.later.length, 1); assert.strictEqual(md.later[0].due, 'No due date');
const h = W.bodyHtml(md); assert.ok(h.indexOf('Drainage &lt;PS&amp;E&gt;') >= 0 && h.indexOf('<b>') === h.indexOf('<b>Due') , 'escaped');
assert.ok(h.indexOf('This week') < h.indexOf('Later or no due date'), 'this week first');
const t = W.text(md); assert.ok(/Next action: Call PM/.test(t) && /Go \/ No-go: Go/.test(t) && /TxDOT · TX/.test(t));
const d = W.docHtml(md); assert.ok(/^<!doctype html>/.test(d) && !/<script|https?:\/\/(?!example\.test)/i.test(d), 'standalone file: no scripts, no external requests');
assert.ok(!/github|repo/i.test(d + t));
assert.ok(/No pursuits yet/.test(W.bodyHtml(W.model([], T, CP, fmt))));
console.log('national weekly-list tests passed');
