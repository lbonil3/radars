// Runs every check: node test.js
const { execFileSync } = require('child_process');
for (const f of ['national/test.js', 'texas/test.js', 'scripts/check-paths.js', 'scripts/check-pwa.js', 'scripts/check-workflows.js']) { console.log('> node ' + f); execFileSync(process.execPath, [f], { stdio: 'inherit', cwd: __dirname }); }
console.log('all radars tests passed');
