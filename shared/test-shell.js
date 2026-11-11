// Shared shell. Run: node shared/test-shell.js
const assert = require('assert');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'shared/shell.css')));
assert.ok(!fs.existsSync(path.join(root, 'home-btn.css')), 'root home-btn.css is removed');
const css = fs.readFileSync(path.join(root, 'shared/shell.css'), 'utf8');
assert.ok(/\.homebtn/.test(css));
assert.ok(/@media \(min-width: 900px\)/.test(css) && /\.lgrid/.test(css));
for (const rel of ['national/index.html', 'texas/index.html', 'index.html']) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(html.includes('shared/shell.css'), rel + ' loads shell.css');
  assert.ok(!html.includes('home-btn.css'), rel + ' does not load home-btn.css');
  assert.ok(html.includes('RadarLoadError'), rel + ' defines a load-error hook');
}
console.log('shared shell tests passed');
