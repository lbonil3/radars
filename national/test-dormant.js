// Radar 2.0: dormant lane code is gone and the live code around it is kept (required from test.js).
// Run alone: node national/test-dormant.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('index.html'), app = read('app.js'), css = read('style.css');
// removed: v5 dollar-bubble map, old lane scope lists, the hidden fee / pipeline / advance / design-build panel
['function renderMapV5', 'SCOPES_W', 'SCOPES_R', 'SCOPES_P', 'DB_ROLES', 'function chipsHtml', 'function renderPseCtl', 'PS&E controls'].forEach((s) => assert.ok(!app.includes(s), 'app.js no longer has ' + s));
['pseCtl', 'feeIn', 'costIn', 'dbIn', 'btnIncl', 'btnText', 'feeOp', 'feePre', 'exactNote', 'pipeNote', 'advNote', 'dbRole', 'dbType', 'dbStage', 'dbNote', 'pcFee', 'pcPipe', 'pcAdv', 'pcDb'].forEach((id) => {
  assert.ok(!html.includes('id="' + id + '"'), 'index.html no longer has #' + id);
  assert.ok(!app.includes("$('" + id + "')"), 'app.js no longer reads #' + id);
});
['.pse-ctl', '.pcrow', '.pcop', '.pcl{', '.pc{', '.pc h3', '.exact{', '.exact button'].forEach((s) => assert.ok(!css.includes(s), 'style.css no longer has ' + s));
// kept: the live map, scopes, amount chips and the confirmed switch
assert.ok(/var SCOPES = C\.SCOPES;/.test(app) && /function renderMap\(list\)/.test(app) && /function markersHtml\(by, small\)/.test(app) && /function renderMini\(list\)/.test(app), 'live map and scopes kept');
assert.ok(html.includes('id="fFee"') && /t\.hasAttribute\('data-fee'\)/.test(app) && html.includes('id="btnConfOnly"') && html.includes('id="costBox"'), 'live amount chips and Confirmed only kept');
console.log('national dormant-code tests passed');
