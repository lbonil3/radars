// Texas Opportunity: saved filter sets and removable tags (required from texas/test.js). Run alone: node texas/test-filtersets.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('index.html'), app = read('app.js');
const scss = fs.readFileSync(path.join(__dirname, '..', 'shared', 'shell.css'), 'utf8');
// markup: sets at the top of the Filters drawer, tags under the quick chips
const adv = html.slice(html.indexOf('<div id="adv"'), html.indexOf('<div class="active" id="activeNote"'));
assert.ok(adv.indexOf('id="fsets"') > adv.indexOf('id="advClose"') && adv.indexOf('id="fsets"') < adv.indexOf('Drainage relevance') && adv.includes('id="fsName"') && adv.includes('id="fsSave"'), 'saved sets in the drawer');
assert.ok(html.indexOf('<div class="ftags" id="ftags" aria-label="Active filters" hidden></div>') > html.indexOf('id="quick"'), 'tags under the quick filters');
// one key, Texas fields, shared helpers
assert.ok(/RadarFilters\.load\(window\.localStorage, 'texas'\)/.test(app) && /RadarFilters\.save\(window\.localStorage, 'texas', FS\)/.test(app), 'texas.filtersets through shared/filters.js');
assert.ok(!/national\.filtersets|nr\.filtersets/.test(app), 'Texas never touches the National keys');
assert.ok(/RadarFilters\.snapshotFor\('texas', name, state\.f\)/.test(app) && /RadarFilters\.applyFor\('texas', freshFilters\(\), set\)/.test(app) && /RadarFilters\.tagsFor\('texas', state\.f,/.test(app) && /RadarFilters\.removeTagFor\('texas', state\.f, tk,/.test(app), 'Texas-aware helpers');
assert.ok(/\[data-fs-apply\]/.test(app) && /\[data-fs-del\]/.test(app) && /\[data-tag-k\]/.test(app) && /#ftClear/.test(app), 'tag and set clicks handled');
// backup: per app, filter sets included like National
assert.ok(/bk\.filtersets = FS;/.test(app) && /RadarFilters\.mergeFor\('texas', FS, j8\.filtersets\)/.test(app) && /RadarFilters\.cleanFor\('texas', j8\.filtersets\)/.test(app), 'Texas backup carries its filter sets');
assert.ok(/CP\.makeBackup\(state\.watch, caps, new Date\(\)\.toISOString\(\), CAP_APP\)/.test(app), 'still a Texas-only backup file');
// shared look for both apps
assert.ok(/\.ftags\{display:flex/.test(scss) && /\.fsrow\{display:flex/.test(scss), 'tag and set styles live in shared/shell.css');
assert.ok(!/\.ftags\{display:flex/.test(fs.readFileSync(path.join(__dirname, '..', 'national', 'style.css'), 'utf8')), 'moved out of national/style.css');
console.log('texas filter-set tests passed');
