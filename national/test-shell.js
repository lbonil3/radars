// National Radar on the shared Radar 2.0 shell (required from test.js). Run alone: node national/test-shell.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('index.html'), app = read('app.js'), css = read('style.css');
// shell loaded after filters.js, before app.js, with the load-error hook
const iShell = html.indexOf('<script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>');
assert.ok(iShell > html.indexOf('../shared/filters.js') && iShell < html.indexOf('<script src="app.js"'), 'shared/shell.js loads before app.js');
assert.ok(/<body class="shell" data-app="national">/.test(html) && /<header class="top shell-head">/.test(html), 'shell body and slim header');
// header: Home, name, freshness, theme; the theme left the More menu
const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
assert.ok(/class="homebtn"/.test(head) && /<h1>/.test(head) && /id="fresh"/.test(head) && /class="throw"[^>]*aria-label="Theme"/.test(head), 'header holds Home, name, freshness and Day / Night / Auto');
assert.ok(!/id="thLbl"/.test(html), 'no Theme block in More');
// tab bar unchanged: List, Map, Pursuits, More (Timeline, Breakdown, Data)
const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>', html.indexOf('<nav class="tabs"')));
const order = (nav.replace(/<div class="tabmore"[\s\S]*<\/div>/, '').match(/data-tab="(\w+)"/g) || []).map((s) => s.slice(10, -1));
assert.deepStrictEqual(order, ['list', 'map', 'pursuits'], 'List, Map, Pursuits, then More');
// Filters drawer from the right with a close button and scrim
assert.ok(/<div id="adv" class="drawer shell-drawer" hidden role="dialog" aria-label="Filters">/.test(html) && /id="advClose"/.test(html) && /<div class="shell-scrim" id="advBg" hidden><\/div>/.test(html), 'Filters drawer');
// two columns: List = records + small map, Map = map + records; phone order = DOM order
const vl = html.slice(html.indexOf('<section id="v-list"'), html.indexOf('<section id="v-timeline"'));
assert.ok(/<div class="shell-cols" id="colsList"><aside class="mini shell-side" id="mini"/.test(vl) && /<div class="lmain shell-primary">/.test(vl), 'List: small map first on a phone, list in the wide column');
const vm = html.slice(html.indexOf('<section id="v-map"'), html.indexOf('<section id="v-list"'));
assert.ok(vm.indexOf('class="shell-cols" id="colsMap"') > 0 && vm.indexOf('class="shell-primary"') < vm.indexOf('id="usmap"') && vm.indexOf('id="usmap"') < vm.indexOf('class="topdet shell-side" id="topDet"'), 'Map: map, then the records beside it');
// map failure note and no-location chip
assert.ok(/<p class="shell-mapfail" id="mapFail" hidden><\/p>/.test(vm) && /<p class="shell-mapfail" id="miniFail" hidden><\/p>/.test(vl) && /id="miniNoLoc" hidden/.test(vl), 'failure notes and no-location chip');
assert.ok(/RadarShell\.guardMap\(document, 'mapFail', function \(\) \{ renderMap\(list\); \}, 'mapWrap'\); renderMapTop\(list\);/.test(app), 'Map tab: a broken map leaves the records list working');
assert.ok(/RadarShell\.guardMap\(document, 'miniFail', function \(\) \{ renderMini\(list\); \}, 'usmini'\);/.test(app), 'List tab: a broken small map leaves the list working');
assert.ok(/RadarShell\.noLocLabel\(nost\)/.test(app), 'no-location chip text from the shell');
// app wiring: one controller, no local breakpoint, no own tab memory
assert.ok(/var SHELL = window\.RadarShell\.bind\(\{ app: 'national'/.test(app) && /legacyTabKeys: \['nr\.tab'\]/.test(app) && /cols: \{ list: 'colsList', map: 'colsMap' \}/.test(app), 'National binds the shared shell');
assert.ok(!/1200px/.test(app) && !/\bWIDE\b/.test(app) && !/classList\.toggle\('docked'/.test(app), 'no app-local breakpoint or docking');
assert.ok(/SHELL\.openDetail\(\)/.test(app) && /function closeSheet\(\) \{ SHELL\.closeDetail\(\); \}/.test(app), 'details go through the shell');
assert.ok(!/localStorage\.setItem\('national\.tab'/.test(app) && !/\$\('btnMore'\)\.addEventListener/.test(app) && !/\$\('tabMoreBtn'\)\.addEventListener/.test(app), 'tab memory, More and Filters toggles live in the shell');
// CSS: no app-local wide layout left
assert.ok(!/min-width:\s*1200px/.test(css) && !/\.lgrid/.test(css) && !/body\.docked/.test(css) && !/#listCount\{display:none\}/.test(css) && !/\.thlbl/.test(css), 'old 1200px layout removed');
assert.ok(/@media \(min-width:1024px\)\{\.minisum\{display:none\}\.minihead\{display:flex\}\}/.test(css), 'small-map header follows the shared breakpoint');
console.log('national shell tests passed');
