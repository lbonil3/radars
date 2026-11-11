// Shared shell. Run: node shared/test-shell.js
const assert = require('assert');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'shared/shell.css')));
assert.ok(!fs.existsSync(path.join(root, 'home-btn.css')), 'root home-btn.css is removed');
const css = fs.readFileSync(path.join(root, 'shared/shell.css'), 'utf8');
const Shell = require('./shell.js');
assert.ok(/\.homebtn/.test(css));
// one breakpoint for CSS and JS
assert.ok(css.includes('@media ' + Shell.QUERY + ' {'), 'shell.css uses the same 1024px query as RadarShell.QUERY');
assert.ok(!/min-width:\s*900px/.test(css) && !/\.lgrid/.test(css), 'the unused 900px .lgrid / .shell-lgrid hook is gone');
const desk = css.slice(css.indexOf('@media ' + Shell.QUERY));
// two columns about 60 / 40, sticky side column, details swap that column, list column unmoved
assert.ok(/\.shell-cols\{display:grid;grid-template-columns:minmax\(0,3fr\) minmax\(0,2fr\)/.test(desk), '60/40 grid at 1024px+');
assert.ok(/\.shell-cols > \.shell-primary\{grid-column:1;grid-row:1\}/.test(desk), 'primary column stays in column 1');
assert.ok(/\.shell-cols > \.shell-side\{grid-column:2;grid-row:1;position:sticky/.test(desk), 'side column is sticky in column 2');
assert.ok(/\.shell-cols\.shell-has-detail > \.shell-side\{display:none\}/.test(desk), 'details hide the side column');
assert.ok(/\.shell-cols > \.sheet\.shell-docked\{grid-column:2;grid-row:1;position:sticky/.test(desk), 'details take the same column');
assert.ok(/\.sheet\.shell-docked \.sheet-bg\{display:none\}/.test(desk), 'no backdrop on the desktop panel');
// phone: stacked, drawer from the right at every width
const phone = css.slice(0, css.indexOf('@media ' + Shell.QUERY));
assert.ok(/\.shell-cols\{display:flex;flex-direction:column/.test(phone), 'stacked under 1024px');
assert.ok(/\.shell \.shell-drawer\{position:fixed;top:0;right:0;bottom:0/.test(phone), 'Filters drawer from the right');
assert.ok(/\.shell \.shell-scrim\{position:fixed;inset:0/.test(phone));
assert.ok(/\.shell-head\{/.test(phone) && /\.shell-mapfail\{/.test(phone) && /\.shell-noloc\{/.test(phone));
assert.ok(!/--acc\s*:/.test(css), 'shell.css never sets an app accent');
for (const rel of ['national/index.html', 'texas/index.html', 'index.html']) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(html.includes('shared/shell.css'), rel + ' loads shell.css');
  assert.ok(!html.includes('home-btn.css'), rel + ' does not load home-btn.css');
  assert.ok(html.includes('RadarLoadError'), rel + ' defines a load-error hook');
}
console.log('shared shell tests passed');
