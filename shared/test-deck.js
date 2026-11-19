// Client deck. Run: node shared/test-deck.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const D = require('./deck.js');
const TX = require('../texas/model.js');

const TODAY = '2026-11-19';
const root = path.resolve(__dirname, '..');

function item(over) {
  return Object.assign({
    id: 'x', client: 'City of Austin', state: 'TX', status: 'open', kind: 'RFQ',
    number: '100', title: 'Drainage design', due: '2026-12-01', planDate: '',
    url: 'https://example.com/sol/100', hasSolicitation: true, starred: false, note: ''
  }, over);
}

// ---- Texas adapter uses aeStatus ----
const txRows = [
  { id: 'a', title: 'RFQ for drainage engineering design', agency: 'City of Austin', solType: 'Request for qualifications', date: '2026-12-01', url: 'https://example.com/a', solNum: '1', status: 'Open', stage: 'Open solicitation' },
  { id: 'p', title: 'RFQ for bridge design', agency: 'City of Dallas', solType: 'Request for qualifications', date: '2026-01-01', url: 'https://example.com/p', solNum: '2', status: 'Open', stage: 'Open solicitation' },
  { id: 'n', title: 'ITB for janitorial services', agency: 'City of Austin', solType: 'Invitation to bid', date: '2026-12-01', url: 'https://example.com/n', status: 'Open', stage: 'Open' },
  { id: 'f', src: 'txdot-pcl', title: 'PS&E hydraulic design', agency: 'TxDOT', date: '2027-03-01', url: 'https://example.com/list.xlsx', stage: 'Projected A/E contract', status: 'Projected' },
  { id: 'c', title: 'On-call civil engineering services', agency: 'Harris County', solType: 'Request for qualifications', date: '2026-12-15', url: 'https://county.example/opp/9', solNum: '9', status: 'Open', stage: 'Open solicitation' }
];
const txItems = D.fromTexas(txRows, TODAY, TX, { a: { starred: true, note: 'Call the city PM' } });
const txIds = txItems.map((r) => r.id).sort();
assert.deepStrictEqual(txIds, ['a', 'c', 'f'], 'past and non-consultant rows stay out');
const txA = txItems.find((r) => r.id === 'a');
assert.strictEqual(txA.status, 'open');
assert.strictEqual(txA.kind, 'RFQ');
assert.strictEqual(txA.starred, true);
assert.strictEqual(txA.note, 'Call the city PM');
assert.strictEqual(txA.hasSolicitation, true);
assert.strictEqual(txA.state, 'TX');
const txF = txItems.find((r) => r.id === 'f');
assert.strictEqual(txF.status, 'forecast');
assert.strictEqual(txF.hasSolicitation, false, 'a workbook link is not a solicitation');
assert.strictEqual(txItems.find((r) => r.id === 'c').kind, 'On-call');

// ---- National adapter ----
function stageOf(r) { return r._stage; }
const natRows = [
  { id: 'v', _stage: 'open', title: 'IDIQ FOR INLAND AND COASTAL VESSELS', noticeType: 'Combined Synopsis/Solicitation', status: 'open', state: 'TX', agency: 'USACE', dates: { due: '2026-12-01' }, url: 'https://sam.gov/v' },
  { id: 'aw', _stage: 'awarded', title: 'Drainage engineering design services', noticeType: 'Award', status: 'awarded', state: 'TX', agency: 'TxDOT', url: 'https://example.com/aw' },
  { id: 'fc', _stage: 'forecast', title: 'Highway and Bridge Design Services', noticeType: 'Forecast', status: 'upcoming', state: 'TX', agency: 'TxDOT', src: 'ag-forecast', dates: { est: '2027-06-01' }, url: 'https://example.com/forecast/1' },
  { id: 'op', _stage: 'open', title: 'Drainage engineering design services', noticeType: 'Solicitation', status: 'open', state: 'CO', agency: 'City of Denver', dates: { due: '2026-12-10' }, url: 'https://example.com/sol/1' },
  { id: 'job', _stage: 'open', title: 'Wirtz Dam Road Bridge PS&E', noticeType: 'TxDOT project (PS&E)', status: 'open', state: 'TX', agency: 'TxDOT', src: 'txdot-pi', url: 'https://example.com/job' }
];
const natItems = D.fromNational(natRows, TODAY, TX, stageOf, {});
const natIds = natItems.map((r) => r.id).sort();
assert.deepStrictEqual(natIds, ['fc', 'op'], 'vessel, awarded, and a capital project with no solicitation stay out');
assert.strictEqual(natItems.find((r) => r.id === 'fc').status, 'forecast');
assert.strictEqual(natItems.find((r) => r.id === 'fc').hasSolicitation, false);
assert.strictEqual(natItems.find((r) => r.id === 'op').state, 'CO');
assert.strictEqual(natItems.find((r) => r.id === 'op').due, '2026-12-10');

// ---- build ----
const items = [
  item({ id: 'd0', due: TODAY, title: 'Due today', client: 'Alpha' }),
  item({ id: 'd14', due: '2026-12-03', title: 'Due on day 14', client: 'Beta' }),
  item({ id: 'd15', due: '2026-12-04', title: 'Due on day 15', client: 'Beta', number: '15' }),
  item({ id: 'd30', due: '2026-12-19', title: 'Due on day 30', client: 'Alpha' }),
  item({ id: 'd31', due: '2026-12-20', title: 'Due on day 31', client: 'Alpha' }),
  item({ id: 'nd', due: '', title: 'Open with no date', client: 'Alpha' }),
  item({ id: 'fc1', status: 'forecast', kind: 'Forecast', hasSolicitation: false, due: '', planDate: '2027-04-01', title: 'Plan one', client: 'TxDOT', url: '' }),
  item({ id: 'fc2', status: 'forecast', kind: 'Forecast', hasSolicitation: true, due: '', planDate: '2027-05-01', title: 'Plan with a notice', client: 'TxDOT', url: 'https://example.com/notice/2', number: '2' }),
  item({ id: 'star', due: '2026-12-02', title: 'Starred pursuit', client: 'Alpha', starred: true, note: 'Bring the H&H sheet' })
];
// six more due-soon rows so the table continues (d0, d14, star, d15, d30 are inside 30 days: 5, plus extras)
for (let i = 0; i < 3; i++) items.push(item({ id: 'e' + i, due: '2026-12-1' + i, title: 'Extra ' + i, client: 'Gamma', number: 'E' + i }));

const deck = D.build({
  kicker: 'Texas Opportunity', state: 'TX', stateName: 'Texas', client: '',
  today: TODAY, items: items,
  sources: [
    { name: 'Bonfire', status: 'ok' },
    { name: 'Old feed', status: 'stale' },
    { name: 'Down feed', status: 'failed' },
    { name: 'IonWave', health: 'blocked by site' },
    { name: 'Turned off', status: 'skipped' }
  ]
});
const cover = deck.slides[0];
assert.strictEqual(cover.kind, 'cover');
assert.strictEqual(cover.stateName, 'Texas');
assert.strictEqual(cover.openCount, items.filter((r) => r.status === 'open').length);
assert.strictEqual(cover.due14Count, 3, 'today, Dec 2, and day 14 are inside the window');
assert.strictEqual(cover.starredCount, 1);

const dueSlides = deck.slides.filter((s) => s.kind === 'due');
const dueTitles = dueSlides.flatMap((s) => s.rows.map((r) => r.title));
assert.ok(dueTitles.indexOf('Due today') === 0, 'soonest due date is first');
assert.ok(dueTitles.indexOf('Due on day 14') >= 0 && dueTitles.indexOf('Due on day 15') > dueTitles.indexOf('Due on day 14'));
assert.ok(dueTitles.indexOf('Due on day 30') >= 0);
assert.ok(dueTitles.indexOf('Due on day 31') < 0, 'day 31 is outside the window');
assert.ok(dueTitles.indexOf('Open with no date') < 0);
assert.ok(dueTitles.indexOf('Plan one') < 0, 'forecast rows are not due-soon rows');
assert.ok(dueSlides.length >= 2, 'the due table continues after 6 rows');
assert.strictEqual(dueSlides[0].rows.length, 6);

const clientSlides = deck.slides.filter((s) => s.kind === 'client');
assert.ok(clientSlides.some((s) => s.client === 'Alpha' && s.page > 1), 'a fifth Alpha item continues');
const alpha = clientSlides.filter((s) => s.client === 'Alpha');
assert.strictEqual(alpha[0].page, 1);
assert.ok(alpha[1] && /continued/i.test(alpha[1].continued ? 'continued' : ''), 'continuation is labeled');

const one = D.build({ kicker: 'Texas Opportunity', state: 'TX', stateName: 'Texas', client: 'TxDOT', today: TODAY, items: items, sources: [] });
assert.ok(one.slides.every((s) => s.kind === 'sources' || s.kind === 'cover' || s.kind === 'due' || s.kind === 'watch' || s.client === 'TxDOT'));
assert.strictEqual(one.slides[0].openCount, 0, 'TxDOT has no open items in this fixture');
assert.ok(!one.slides.some((s) => s.client === 'Alpha'));

const watch = deck.slides.filter((s) => s.kind === 'watch').flatMap((s) => s.rows.map((r) => r.title));
assert.deepStrictEqual(watch, ['Plan one']);

const srcSlide = deck.slides.find((s) => s.kind === 'sources');
assert.ok(srcSlide.groups.fresh.indexOf('Bonfire') >= 0);
assert.ok(srcSlide.groups.stale.indexOf('Old feed') >= 0);
assert.ok(srcSlide.groups.failing.indexOf('Down feed') >= 0);
assert.ok(srcSlide.groups.blocked.indexOf('IonWave') >= 0);
assert.ok(!JSON.stringify(srcSlide).includes('Turned off'));

const html = D.render(deck);
assert.ok(html.includes('Texas'));
assert.ok(html.includes('Bring the H&amp;H sheet') || html.includes('Bring the H&H sheet'));
assert.ok(html.includes('Next step / owner'));
assert.ok(html.includes('https://example.com/sol/100'));
assert.ok(!/github\.com/i.test(html), 'the deck does not link to the repository');
assert.ok(html.includes('★') || html.includes('&#9733;'));
assert.ok(/Fresh/.test(html) && /Failing/.test(html) && /Blocked by site/.test(html));

// The next-step line is blank. The note is not copied into it.
const starAt = html.indexOf('Starred pursuit');
const nextAt = html.indexOf('Next step / owner', starAt);
assert.ok(starAt > 0 && nextAt > starAt);
assert.ok(html.slice(nextAt, nextAt + 80).indexOf('Bring the H') < 0);

// ---- pages and cache ----
for (const rel of ['national/index.html', 'texas/index.html']) {
  const page = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(page.includes('id="btnDeck"'), rel + ' has the Deck button');
  assert.ok(page.includes('shared/deck.js'), rel + ' loads deck.js');
  assert.ok(page.includes('shared/deck.css'), rel + ' loads deck.css');
  assert.ok(!/github\.com/i.test(page), rel + ' does not link to the repository');
}
assert.ok(fs.readFileSync(path.join(__dirname, 'deck.js'), 'utf8').indexOf('localStorage') < 0, 'the deck module does not touch localStorage');
const Cache = require('./cache.js');
assert.strictEqual(Cache.VERSION, 27);
assert.ok(Cache.files('texas').indexOf('../shared/deck.js') >= 0);
assert.ok(Cache.files('national').indexOf('../shared/deck.css') >= 0);
assert.ok(Cache.files('home').some((f) => f.indexOf('deck.js') >= 0));

const css = fs.readFileSync(path.join(__dirname, 'deck.css'), 'utf8');
assert.ok(!/--acc\s*:/.test(css), 'deck.css does not set the accent');
assert.ok(/1280px/.test(css) && /720px/.test(css), 'slides are 16:9');

console.log('deck tests passed', deck.slides.length, 'slides in the fixture deck');
