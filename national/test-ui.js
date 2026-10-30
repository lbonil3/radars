// National Radar v3 UI structure tests (required from test.js). Run alone: node national/test-ui.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
// P1: one-line banner (expandable), lanes as a dropdown, 3-4 primary scopes + More
assert.ok(html.includes('id="bannerShort"') && /id="bannerMore" hidden/.test(html) && html.includes('id="btnBanner"'), 'explainer collapsed to one line, expandable');
assert.ok(!/id="modeSel"/.test(html) && !/class="modes"/.test(html), 'v4.5: no lane dropdown or lane tabs');
const prim = app.match(/var PRIMARY = (\{[^}]*\})/)[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
Object.values(JSON.parse(prim)).forEach((l) => assert.ok(l.length >= 3 && l.length <= 4, 'primary scopes: 3-4'));
assert.ok(/class="scmore/.test(app) && /More &#9662;/.test(app), 'other scopes behind More');
// P1: single Filters drawer (fee threshold, region, include-exactly, text-parsed, exact-$5M note, chips, reset), badge, Confirmed only visible, no duplicate Hide unconfirmed
{
  const adv = html.slice(html.indexOf('<div id="adv"'), html.indexOf('<div class="active" id="activeNote"'));
  ['id="regionSel"', 'id="fFee"', 'id="fState"', 'id="fSource"', 'id="btnReset"', 'id="btnClear"', 'id="btnCsv"', 'id="btnLive"', 'href="../texas/"'].forEach((k) => assert.ok(adv.includes(k), 'drawer holds ' + k));
  assert.ok(!html.includes('id="btnConf"'), 'duplicate Hide unconfirmed button removed');
  const before = html.slice(0, html.indexOf('<div id="adv"'));
  assert.ok(before.includes('id="btnConfOnly"') && !before.includes('id="regionHint"') && adv.includes('id="regionHint"'), 'v6: Confirmed only stays in the control row; the Texas focus prompt moved into the drawer');
  const row = html.slice(html.indexOf('<div class="row">'), html.indexOf('<div id="adv"')); assert.ok(row.indexOf('id="q"') < row.indexOf('id="btnMore"') && row.indexOf('id="btnMore"') < row.indexOf('id="btnConfOnly"'), 'v6: one row: search, Filters, Confirmed only');
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, ''); let depth = 0, minD = 0; for (const ch of cssNoComments) { if (ch === '{') depth++; if (ch === '}') { depth--; minD = Math.min(minD, depth); } } assert.ok(depth === 0 && minD === 0, 'style.css braces balanced (a stray brace dropped the switch style)');
  assert.ok(!/sum of amounts stated/.test(app.slice(app.indexOf('function renderKpis'), app.indexOf('function renderKpis') + 600)), 'v6: no headline sum');
  assert.ok(html.includes('class="fbadge" id="advCount"') && /function setBadge\(n\)/.test(app), 'active-filter badge');
  assert.ok(/S\.region && S\.region !== 'all' \? 1 : 0/.test(app) && /f\.feeMin !== null && f\.feeMin !== undefined \? 1 : 0/.test(app), 'badge counts region and an optional minimum amount');
  assert.ok(/function resetFilters\(\) \{ S\.f = freshF\(\);[^\n]*S\.region = 'all'/.test(app) && /f\.hideUnconfirmed = CONF/.test(app), 'reset clears filters and region but keeps the saved Confirmed only');
}
// P1: max 2 badges per card, all badges in the detail sheet; source-field detail only in the sheet
{
  const i = app.indexOf('  function cardHtmlBase(r) {'), seg = app.slice(i, app.indexOf('  function costBrief', i));
  assert.ok(!/tagsFor\(r\)|tagsPse\(r\)/.test(seg) && /cardTags\(r\)/.test(seg), 'cards use cardTags');
  assert.ok(/return \[conf, st\]\.filter\(Boolean\)/.test(app), 'cardTags returns at most 2 badges');
  assert.ok(/var h = '<h2>' \+ esc\(r\.title\) \+ '<\/h2><div>' \+ tagsFor\(r\)/.test(app) || /tagsFor\(r\)/.test(app.slice(app.indexOf('function openSheet'))), 'detail sheet keeps every badge');
  assert.ok(!/source field/.test(seg), 'no source-field line on cards');
}
// P2: 4 bottom tabs (Map, List, Pursuits, More); Timeline / Breakdown / Data stay reachable in the More menu
{
  const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>', html.indexOf('<nav class="tabs"')));
  const top = nav.replace(/<div class="tabmore"[\s\S]*?<\/div>/, '');
  assert.deepStrictEqual((top.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['list', 'map', 'pursuits'], '3 direct tabs, List first (v6)');
  assert.ok(top.includes('id="tabMoreBtn"'), '4th tab is More');
  const menu = nav.slice(nav.indexOf('<div class="tabmore"'));
  ['timeline', 'break', 'data'].forEach((t) => assert.ok(menu.includes('data-tab="' + t + '"'), t + ' in More'));
  ['v-map', 'v-list', 'v-timeline', 'v-break', 'v-pursuits', 'v-data'].forEach((v) => assert.ok(html.includes('id="' + v + '"'), v + ' view kept'));
  // P2: New / Closing as one header pill; digest chips open from it
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.ok(header.includes('id="digestPill"') && /id="digest"[^>]*hidden/.test(html), 'New / Closing pill in the header');
  assert.ok(/pill\.hidden = !lbl/.test(app), 'pill hidden when nothing is new or closing');
  // P2: KPI strip trimmed to one line
  assert.ok(/class=\"kline\"/.test(app) && !/class=\"kpi\"/.test(app), 'one-line summary instead of KPI boxes');
}
// P2: detail sheet order (money, details, source, capture collapsed ... rules last); Data tab opens on a health summary
{
  const i = app.indexOf('  function openSheet(id) {'), seg = app.slice(i, app.indexOf("$('shBody').innerHTML = h;", i));
  const pos = (k) => { const p = seg.indexOf(k); assert.ok(p > 0, 'sheet has ' + k); return p; };
  assert.ok(pos('Dollar figures') < pos("'<h3>Details</h3>") && pos("'<h3>Details</h3>") < pos('Open the source record') && pos('Open the source record') < pos('class="capdet"') && pos('class="capdet"') < pos('class="rulesdet"'), 'sheet order');
  ['Why it is in this list', 'Why it is Unconfirmed', 'Why it needs review'].forEach((k) => assert.ok(pos(k) > pos('class="rulesdet"'), k + ' is inside the rules section at the end'));
  const d = html.slice(html.indexOf('<section id="v-data"'), html.indexOf('</section>', html.indexOf('<section id="v-data"')));
  assert.ok(d.indexOf('id="dqHealth"') > 0 && d.indexOf('id="dqHealth"') < d.indexOf('<details'), 'Data tab opens on the health summary');
  ['dqFresh', 'dqFunnel', 'dqSrc', 'dqNo', 'dqRules'].forEach((k) => assert.ok(/<details class="dqd">/.test(d) && d.includes('id="' + k + '"'), k + ' kept in an expander'));
  assert.ok(/function renderHealth\(\)/.test(app) && /renderData\(\) \{\n    if \(!DATA\) return;\n    renderHealth\(\);/.test(app));
}
// P3 (trivial ones): plainer scope wording, last view remembered; closed More menu takes no space
assert.ok(app.includes("label: 'Early notices (no fee yet)'") && app.includes("label: 'Big projects (no fee yet)'"), 'plainer wording');
assert.ok(/localStorage\.setItem\('nr\.tab', t\)/.test(app) && /\n    setTab\(S\.tab\);\n/.test(app) && /tab: 'list'/.test(app), 'last view remembered; List is the default (v6)');
assert.ok(/id="usmini"/.test(html) && /data-tab="map">Expand map/.test(html) && /function markersHtml/.test(app) && /function renderMapV5/.test(app), 'v6.1: small map with Expand map, count markers, v5 bubbles kept dormant');
assert.ok(css.includes('.scmore:not([open]) .scmenu{display:none}'));
module.exports = { html, app, css };
console.log('national ui (P1 header) tests passed');
// Theme: Day default, Night/Auto opt-in under a new key, applied before first paint
{
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(/<script>[\s\S]*nr\.theme[\s\S]*data-theme[\s\S]*<\/script>/.test(head) && head.indexOf('<script>') < head.indexOf('style.css'), 'theme applied in head before first paint');
  assert.ok(/getItem\('nr\.theme'\)\|\|'day'/.test(head) && /\|\| 'day'/.test(app), 'Day is the default');
  ['day', 'night', 'auto'].forEach((t) => assert.ok(html.includes('data-theme-set="' + t + '"'), 'theme option ' + t));
  assert.ok(/html\[data-theme=day\]\{--bg:/.test(css), 'Day variables');
  assert.ok(/^:root\{--bg:#0a1020/m.test(css), 'Night look unchanged');
  assert.ok(html.includes('id="themeColor"') && /themeColor/.test(app), 'browser UI color follows the theme');
  assert.ok(/\.tabs button\[data-tab\]/.test(app), 'tab highlighting does not touch theme buttons');
}
