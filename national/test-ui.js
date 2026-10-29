// National Radar v3 UI structure tests (required from test.js). Run alone: node national/test-ui.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
// P1: one-line banner (expandable), lanes as a dropdown, 3-4 primary scopes + More
assert.ok(html.includes('id="bannerShort"') && /id="bannerMore" hidden/.test(html) && html.includes('id="btnBanner"'), 'explainer collapsed to one line, expandable');
assert.ok(/<select id="modeSel"[^>]*>[\s\S]*value="pse"[\s\S]*value="water"[\s\S]*value="road"/.test(html) && !/class="modes"/.test(html), 'lanes are a dropdown');
const prim = app.match(/var PRIMARY = (\{[^}]*\})/)[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
Object.values(JSON.parse(prim)).forEach((l) => assert.ok(l.length >= 3 && l.length <= 4, 'primary scopes per lane: 3-4'));
assert.ok(/class="scmore/.test(app) && /More &#9662;/.test(app), 'other scopes behind More');
// P1: single Filters drawer (fee threshold, region, include-exactly, text-parsed, exact-$5M note, chips, reset), badge, Confirmed only visible, no duplicate Hide unconfirmed
{
  const adv = html.slice(html.indexOf('<div id="adv"'), html.indexOf('<div class="active" id="activeNote"'));
  ['id="regionSel"', 'id="feeIn"', 'id="btnIncl"', 'id="btnText"', 'id="feePre"', 'id="exactNote"', 'id="pcDb"', 'id="pcPipe"', 'id="fState"', 'id="fSource"', 'id="btnReset"', 'id="btnClear"', 'id="btnCsv"', 'id="btnLive"', 'href="../texas/"'].forEach((k) => assert.ok(adv.includes(k), 'drawer holds ' + k));
  assert.ok(!html.includes('id="btnConf"'), 'duplicate Hide unconfirmed button removed');
  const before = html.slice(0, html.indexOf('<div id="adv"'));
  assert.ok(before.includes('id="btnConfOnly"') && before.includes('id="regionHint"'), 'Confirmed only and the region hint stay outside the drawer');
  assert.ok(html.includes('class="fbadge" id="advCount"') && /function setBadge\(n\)/.test(app), 'active-filter badge');
  assert.ok(/S\.region && S\.region !== 'all' \? 1 : 0/.test(app) && /f\.feeMin !== d\.feeMin/.test(app), 'badge counts region and a changed fee threshold');
  assert.ok(/function resetFilters\(\) \{ S\.f = freshF\(S\.mode\);[^\n]*S\.region = 'all'/.test(app) && /f\.hideUnconfirmed = CONF/.test(app), 'reset clears filters and region but keeps the saved Confirmed only');
}
// P1: max 2 badges per card, all badges in the detail sheet; source-field detail only in the sheet
{
  const i = app.indexOf('  function cardHtmlBase(r) {'), seg = app.slice(i, app.indexOf('  function costBrief', i));
  assert.ok(!/tagsFor\(r\)|tagsPse\(r\)/.test(seg) && /cardTags\(r\)/.test(seg), 'cards use cardTags');
  assert.ok(/return \[conf, st\]\.filter\(Boolean\)/.test(app), 'cardTags returns at most 2 badges');
  assert.ok(/var h = '<h2>' \+ esc\(r\.title\) \+ '<\/h2><div>' \+ tagsFor\(r\)/.test(app) || /tagsFor\(r\)/.test(app.slice(app.indexOf('function openSheet'))), 'detail sheet keeps every badge');
  assert.ok(!/source field/.test(seg), 'no source-field line on cards');
}
module.exports = { html, app, css };
console.log('national ui (P1 header) tests passed');
