// National Radar v3 UI structure tests (required from test.js). Run alone: node national/test-ui.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
// P1: one-line banner (expandable), lanes as a dropdown, 3-4 primary scopes + More
assert.ok(html.includes('id="bannerShort"') && /id="bannerMore" hidden/.test(html) && html.includes('id="btnBanner"'), 'explainer collapsed to one line, expandable');
assert.ok(/<select id="modeSel"[^>]*>[\s\S]*value="pse"[\s\S]*value="water"[\s\S]*value="road"/.test(html) && !/class="modes"/.test(html), 'lanes are a dropdown');
const prim = app.match(/var PRIMARY = (\{[^}]*\})/)[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
Object.values(JSON.parse(prim)).forEach((l) => assert.ok(l.length >= 3 && l.length <= 4, 'primary scopes per lane: 3-4'));
assert.ok(/class="scmore/.test(app) && /More &#9662;/.test(app), 'other scopes behind More');
module.exports = { html, app, css };
console.log('national ui (P1 header) tests passed');
