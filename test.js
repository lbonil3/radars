// Runs every check: node test.js
const { execFileSync } = require('child_process');
// syntax check of every browser script (a broken file would blank a live page)
const fs = require('fs'), path = require('path');
for (const d of ['.', 'national', 'texas']) for (const f of fs.readdirSync(path.join(__dirname, d))) if (/\.js$/.test(f)) execFileSync(process.execPath, ['--check', path.join(__dirname, d, f)], { stdio: 'inherit' });
console.log('syntax ok');
for (const f of ['national/test.js', 'texas/test.js', 'scripts/check-paths.js', 'scripts/check-pwa.js', 'scripts/check-workflows.js']) { console.log('> node ' + f); execFileSync(process.execPath, [f], { stdio: 'inherit', cwd: __dirname }); }
console.log('all radars tests passed');
