// Texas Opportunity on the shared Radar 2.0 shell (required from texas/test.js). Run alone: node texas/test-shell.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('index.html'), app = read('app.js'), css = read('style.css');
const Shell = require('../shared/shell.js');
// shell loaded before app.js; shell body and slim header with the theme after the freshness line
const iShell = html.indexOf('<script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>');
assert.ok(iShell > html.indexOf('../shared/filters.js') && iShell < html.indexOf('<script src="app.js"'), 'shared/shell.js loads before app.js');
assert.ok(/<body class="shell" data-app="texas">/.test(html) && /<header class="top shell-head">/.test(html), 'shell body and header');
const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
assert.ok(head.indexOf('class="homebtn"') < head.indexOf('<h1>') && head.indexOf('<h1>') < head.indexOf('id="fresh"') && head.indexOf('id="fresh"') < head.indexOf('class="throw"'), 'Home, name, freshness, then Day / Night / Auto');
// List is the default view; the map moved to its own tab; More holds Timeline, Agencies, Sources
assert.ok(/tab: 'list'/.test(app) && !/'radar'/.test(app) && !/v-radar|data-tab="radar"/.test(html), 'no Radar tab or view left');
assert.ok(/<section id="v-list" class="view" aria-label="List">/.test(html) && /<section id="v-map" class="view" hidden aria-label="Radar map">/.test(html), 'List visible first, Map hidden');
const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>', html.indexOf('<nav class="tabs"')));
const top = nav.replace(/<div class="tabmore"[\s\S]*<\/div>/, ''), menu = nav.slice(nav.indexOf('<div class="tabmore"'));
assert.deepStrictEqual((top.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['list', 'map', 'intel'], 'List, Map, Intel, then More');
assert.ok(/data-tab="list" class="on"/.test(top) && top.includes('id="tabMoreBtn"') && top.includes('id="tabMoreLbl"'));
assert.deepStrictEqual((menu.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['timeline', 'agencies', 'sources'], 'More menu');
assert.ok(/loadData\(\)\.then\(function \(d\) \{[^\n]*switchTab\(SHELL\.initial\)/.test(app), 'startup opens the remembered view (List on a first visit)');
assert.ok(/SHELL = window\.RadarShell\.bind\(\{ app: 'texas'/.test(app) && /tabs: \['list', 'map', 'intel'\]/.test(app) && /more: \['timeline', 'agencies', 'sources'\]/.test(app) && /cols: \{ list: 'colsList', map: 'colsMap' \}/.test(app), 'Texas binds the shared shell');
assert.strictEqual(Shell.tabKey('texas'), 'texas.tab');
assert.ok(!/localStorage\.setItem\('texas\.tab'/.test(app) && !/\$\('btnMore'\)\.addEventListener/.test(app), 'tab memory and the Filters toggle live in the shell');
// Filters drawer, two columns, one canvas map moved between the List side column and the Map tab
assert.ok(/<div id="adv" class="shell-drawer" hidden role="dialog" aria-label="Filters">/.test(html) && /id="advClose"/.test(html) && /<div class="shell-scrim" id="advBg" hidden><\/div>/.test(html), 'Filters drawer');
const vl = html.slice(html.indexOf('<section id="v-list"'), html.indexOf('<section id="v-intel"'));
assert.ok(vl.indexOf('<div class="shell-cols" id="colsList">') >= 0 && vl.indexOf('class="shell-side txmini"') < vl.indexOf('<div class="shell-primary">') && vl.indexOf('<div class="shell-primary">') < vl.indexOf('id="list"'), 'List: map box first on a phone, list in the wide column');
assert.ok(/<details class="txminidet" id="txMiniDet">/.test(vl) && /id="mapSlotList"/.test(vl) && /data-tab="map">Expand map/.test(vl), 'collapsible map box on the List tab');
const vm = html.slice(html.indexOf('<section id="v-map"'), html.indexOf('<section id="v-timeline"'));
assert.ok(vm.indexOf('id="colsMap"') > 0 && vm.indexOf('id="mapSlotMap"') < vm.indexOf('id="mapwrap"') && vm.indexOf('id="mapwrap"') < vm.indexOf('class="shell-side"') && vm.indexOf('class="shell-side"') < vm.indexOf('id="mapTop"'), 'Map: map, then the records beside it');
assert.strictEqual((html.match(/<canvas /g) || []).length, 1, 'one canvas');
assert.ok(/function placeMap\(\)/.test(app) && /state\.tab === 'list' \? \$\('mapSlotList'\) : \$\('mapSlotMap'\)/.test(app) && /\$\('txMiniDet'\)\.addEventListener\('toggle', placeMap\)/.test(app), 'the canvas moves with the view and only draws when shown');
// details: shell panel beside the list or map; a map failure leaves the list working; no-location chip
assert.ok(/SHELL\.openDetail\(\)/.test(app) && /function closeSheet\(\) \{ SHELL\.closeDetail\(\); \}/.test(app) && /onDetailClose: detailClosed/.test(app), 'details go through the shell');
assert.ok(/RadarShell\.guardMap\(document, 'mapFail', function \(\) \{/.test(app) && /id="mapFail" hidden/.test(vm) && /id="listMapFail" hidden/.test(vl), 'map failure note');
assert.ok(/RadarShell\.noLocLabel\(unmapped\)/.test(app) && /id="mapNoLoc" hidden/.test(vm) && /id="listNoLoc" hidden/.test(vl), 'no-location chip on both views');
// the app-local 900px layout is gone; print CSS still finds main > section#v-intel
assert.ok(!/body\{max-width:1100px/.test(css) && !/width:1100px/.test(css) && /@media \(min-width:1024px\)\{\.shell-cols\{/.test(css), 'shared 1024px breakpoint');
assert.ok(/<main id="main">\n[\s\S]*<section id="v-intel" class="view" hidden/.test(html) && html.indexOf('<section id="v-intel"') > html.indexOf('<main id="main">') && html.indexOf('<section id="v-intel"') < html.indexOf('</main>'), 'Intel stays a direct section of main for print');
console.log('texas shell tests passed');
