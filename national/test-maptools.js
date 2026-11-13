// Radar 2.0 Map tab tools (spec: Map tools). Run alone: node national/test-maptools.js (also run by national/test.js)
const assert = require('assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const vm = html.slice(html.indexOf('<section id="v-map"'), html.indexOf('<section id="v-list"'));
const vl = html.slice(html.indexOf('<section id="v-list"'), html.indexOf('</section>', html.indexOf('<section id="v-list"')));
// toolbar, selection bar, Nationwide chip, tooltip, table: all on the Map tab, before the map
['btnMulti', 'btnShade', 'btnTable', 'zIn', 'zOut', 'zReset', 'selBar', 'noneChip', 'mapTip', 'mapTable'].forEach((id) => assert.ok(vm.indexOf('id="' + id + '"') > 0, 'Map tab has #' + id));
assert.ok(vm.indexOf('role="toolbar"') > 0 && vm.indexOf('id="btnMulti"') < vm.indexOf('id="usmap"') && vm.indexOf('id="selBar"') < vm.indexOf('id="usmap"'), 'tools and selection bar sit above the map');
assert.ok(/id="btnShade" aria-pressed="true"/.test(vm) && /id="btnMulti" aria-pressed="false"/.test(vm) && /id="btnTable" aria-pressed="false"/.test(vm), 'toggles expose their state');
assert.ok(/<svg id="usmap" viewBox="0 0 975 610" role="group"/.test(vm), 'markup starts on the land frame; the script sets the 1040 view while callouts are on');
// the List tab mini map stays compact: no tools
['maptools', 'btnMulti', 'zIn', 'mapTable', 'selBar'].forEach((k) => assert.ok(vl.indexOf(k) < 0, 'mini map has no ' + k));
assert.ok(/function renderMini\(list\)/.test(app) && /markersHtml\(by, true\)/.test(app), 'mini map keeps its count markers');
// wiring
assert.ok(/var MV = window\.NationalMapView/.test(app) && /bindMapTools\(\);/.test(app), 'map helpers and tools wired');
assert.ok(/MV\.aggregate\(scoped\(S\.scope, \['states'\]\), fee\)/.test(app), 'map counts ignore the state filter, so unselected states stay visible (dimmed)');
assert.ok(/classList\.toggle\('dim', sel\.length > 0 && sel\.indexOf\(k\) < 0\)/.test(app), 'unselected states dimmed while a selection is active');
assert.ok(/e\.ctrlKey \|\| e\.metaKey \|\| e\.shiftKey/.test(app) && /add \|\| MAPSEL\.multi/.test(app) && /MV\.nextSelection\(/.test(app), 'Ctrl / Shift-click and Multi-select add states');
assert.ok(/e\.stopPropagation\(\)/.test(app) && /\[data-mst\],#v-map \[data-st\],#selClear/.test(app), 'Map tab clicks stay on the Map tab; the document [data-st] toggle still serves the mini map');
assert.ok(/id === 'selClear'/.test(app) && /<button type="button" class="chip" id="selClear">Clear<\/button>/.test(app), 'selection bar has Clear');
assert.ok(/Nationwide \/ no state \(/.test(app) && /data-mst="\?\?"/.test(app), 'Nationwide / no state chip selects the no-state records');
assert.ok(/addEventListener\('wheel'/.test(app) && /passive: false/.test(app) && /MV\.zoomAt\(/.test(app) && /\$\('zReset'\)/.test(app), 'wheel and +/- zoom, Reset');
assert.ok(/MAPSEL\.zoom\.k <= 1/.test(app) && /MV\.clampZoom\(\{ k: MAPSEL\.zoom\.k, x: dr\.zx - dx, y: dr\.zy - dy \}\)/.test(app) && /MAPSEL\.moved/.test(app), 'drag-pan only when zoomed; a drag does not select');
assert.ok(/e\.pointerType !== 'mouse'/.test(app) && /addEventListener\('focusin'/.test(app) && /tabindex="0" role="button"/.test(app) && /e\.key !== 'Enter' && e\.key !== ' '/.test(app), 'tooltips on hover and keyboard focus; markers are keyboard buttons');
assert.ok(/MV\.calloutsOn\(z\.k\)/.test(app) && /MV\.viewBoxFor\(z\)/.test(app) && /MV\.layoutCallouts\(items, \{ right: MV\.VIEW\.w - 3, gap: 3 \}\)/.test(app), 'callouts only while on; viewBox from the helpers');
assert.ok(/MV\.markerRadius\(d\.agg\.by\[k\]\.n, false, z\.k\)/.test(app) && !/bubbleFor|encodingFor|lane mode/i.test(app), 'count markers kept; no value bubbles or lane modes');
assert.ok(/MAPSEL\.table/.test(app) && /<th scope="col">State<\/th>/.test(app) && /class="tsel" data-mst=/.test(app), 'Map as table, with selectable rows');
assert.ok(/MV\.shadeAlpha\(t\)/.test(app) && /--shade-a/.test(app), 'shading passes a 0..1 value; colors come from CSS');
// theme tokens instead of hard-coded night colors
const tokens = ['--map-bg', '--map-land', '--map-edge', '--map-shade'];
const night = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
const day = css.slice(css.indexOf('html[data-theme=day]{'), css.indexOf('}', css.indexOf('html[data-theme=day]{')));
tokens.forEach((t) => { assert.ok(night.indexOf(t + ':') > 0, 'night defines ' + t); assert.ok(day.indexOf(t + ':') > 0, 'day defines ' + t); });
const rules = css.replace(night, '').replace(day, '');
assert.ok(rules.indexOf('#0c1428') < 0 && rules.indexOf('#16233f') < 0 && rules.indexOf('#070c19') < 0 && rules.indexOf('#dfe8f3') < 0, 'map colors come from tokens');
assert.ok(/\.st\{fill:var\(--map-land\);stroke:var\(--map-edge\)/.test(css) && /\.st\.shd\{fill:color-mix\(in srgb,var\(--map-shade\) calc\(var\(--shade-a\) \* 100%\),var\(--map-land\)\)\}/.test(css), 'land and shading use the tokens');
assert.ok(/\.mapwrap\{[^}]*background:var\(--map-bg\)/.test(css) && /\.miniwrap\{background:var\(--map-bg\)/.test(css), 'map backgrounds use the token');
assert.ok(/\.st\.dim,\.mkg\.dim,\.lead\.dim\{opacity:\.4\}/.test(css) && /\.maptip\[hidden\]\{display:none\}/.test(css), 'dim and tooltip styles');
console.log('national map tools tests passed');
