// Texas Opportunity: My pursuits and the weekly list (required from texas/test.js). Run alone: node texas/test-pursuits.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('index.html'), app = read('app.js'), css = read('style.css');
// tab with a due-soon badge, view with the three actions, the shared Weekly list sheet
assert.ok(/<button type="button" data-tab="pursuits">Pursuits<span class="tbadge" id="purBadge" hidden><\/span><\/button>/.test(html), 'Pursuits tab with a badge');
const v = html.slice(html.indexOf('<section id="v-pursuits"'), html.indexOf('<section id="v-intel"'));
assert.ok(/<section id="v-pursuits" class="view" hidden aria-label="My pursuits">/.test(v) && ['btnPurPrint', 'btnPurCsv', 'btnPurIcs', 'purWeek', 'purList'].every((k) => v.includes('id="' + k + '"')), 'Pursuits view');
assert.ok(html.includes('<div id="weekly" class="wk-sheet" hidden role="dialog" aria-modal="true" aria-label="Weekly list">') && ['wkBody', 'wkHint', 'wkClose', 'wkPrint', 'wkShare', 'wkCopy', 'wkDl'].every((k) => html.includes('id="' + k + '"')), 'Weekly list sheet');
assert.ok(html.indexOf('<div id="weekly"') > html.indexOf('</main>'), 'the sheet sits outside main, so print-weekly can show it alone');
const iW = html.indexOf('<script src="../shared/weekly.js" onerror="RadarLoadError(this.src||this.href)"></script>');
assert.ok(iW > 0 && iW < html.indexOf('<script src="app.js"'), 'shared/weekly.js loads before app.js');
// rows from the watchlist; a solicitation's closing date stands in for a missing due date and is labeled as the source's
assert.ok(/RadarWeekly\.pursuitRows\(state\.watch, caps, snapFor, todayCentral\(\), CP\)/.test(app), 'shared pursuit rows');
assert.ok(/r\.kind === 'solicitation' && r\.date\) c = Object\.assign\(\{\}, c, \{ due: r\.date \}\)/.test(app) && /row\.dueFrom = 'source'/.test(app) && /closing date from the source/.test(app), 'source closing date fallback, labeled');
// Export CSV reuses the capture CSV; .ics names Texas; weekly sheet from the shared controller
assert.ok(/\$\('btnPurCsv'\)\.addEventListener\('click', exportCapCsv\)/.test(app), 'Export CSV = capture CSV');
assert.ok(/RadarWeekly\.ics\(ev, new Date\(\)\.toISOString\(\), 'Texas Opportunity: My pursuits', 'Texas Opportunity'\)/.test(app) && /'texas-opportunity-pursuits\.ics'/.test(app), '.ics export');
assert.ok(/WKS = RadarWeekly\.bindSheet\(\{ doc: document, win: window/.test(app) && /'texas-opportunity-weekly-'/.test(app) && /\$\('btnPurPrint'\)\.addEventListener\('click', WKS\.open\)/.test(app), 'weekly list sheet');
assert.ok(/renderPursuits\(\); renderPurBadge\(\);/.test(app) && /if \(t === 'pursuits'\) renderPursuits\(\);/.test(app), 'kept current');
assert.ok(/#purList h3\{grid-column:1 \/ -1/.test(css));
console.log('texas pursuits tests passed');
