// Runs every check: node test.js
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
for (const d of ['.', 'shared', 'national', 'texas']) {
  if (!fs.existsSync(path.join(__dirname, d))) continue;
  for (const f of fs.readdirSync(path.join(__dirname, d))) {
    if (/\.js$/.test(f)) execFileSync(process.execPath, ['--check', path.join(__dirname, d, f)], { stdio: 'inherit' });
  }
}
console.log('syntax ok');
const sharedTests = fs.readdirSync(path.join(__dirname, 'shared')).filter((f) => /^test-.*\.js$/.test(f)).sort().map((f) => 'shared/' + f);
for (const f of sharedTests.concat(['national/test.js', 'texas/test.js', 'scripts/check-paths.js', 'scripts/check-pwa.js', 'scripts/check-workflows.js'])) {
  console.log('> node ' + f);
  execFileSync(process.execPath, [f], { stdio: 'inherit', cwd: __dirname });
}
console.log('all radars tests passed');
