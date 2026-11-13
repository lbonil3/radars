// Wave 2 A/E sources. Loaded by texas/test.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const M = require('./model.js');
const SS = require('../scripts/source-status.js');

const TODAY = '2026-11-13';
const fix = (name) => fs.readFileSync(path.join(__dirname, 'test-fixtures', 'wave2', name), 'utf8');

assert.strictEqual(M.isSiteChallenge('<html><title>Human verification</title>aws waf captcha</html>'), true);
assert.strictEqual(M.isSiteChallenge(fix('bidnet-sample.html')), false);
assert.strictEqual(M.isSiteChallenge(fix('ntta-sample.html')), false);

const ntta = M.parseNtta(fix('ntta-sample.html'));
assert.strictEqual(ntta.listed, 3);
assert.strictEqual(ntta.length, 1, 'audit RFQ and drainage RFB are not A/E consultant work');
assert.strictEqual(ntta[0].agency, 'NTTA');
assert.strictEqual(ntta[0].solNum, 'B2600001999');
assert.strictEqual(ntta[0].date, '2026-12-15');
assert.strictEqual(ntta[0].title, 'RFQ On-Call Civil Engineering Services');
assert.ok(ntta[0].url.indexOf('https://www.nttamarketplace.org/bso/external/bidDetail.sda?docId=B2600001999') === 0);
assert.ok(M.isConsultant(ntta[0]) && M.aeStatus(ntta[0], TODAY) === 'open');
assert.ok(!JSON.stringify(ntta).includes('Buyer Name'), 'buyer name is not copied');

const beacon = M.parseBeaconOpen(fix('beacon-open.json'));
assert.strictEqual(beacon.listed, 3);
assert.strictEqual(beacon.length, 2, 'dental RFP is not A/E');
const pool = beacon.find((r) => r.solNum === 'RFQ-2026-0010');
assert.ok(pool, 'engineering pre-qualification pool is kept');
assert.strictEqual(pool.agency, 'City of Houston');
assert.strictEqual(pool.title, 'Pre-Qualification Pool for Professional Engineering Services');
assert.strictEqual(pool.date, '2026-11-19');
assert.strictEqual(pool.status, 'Open');
assert.strictEqual(pool.url, 'https://www.beaconbid.com/solicitations/city-of-houston/7d9c5454-1d54-4630-8649-03128f4eff91');
assert.ok(M.isConsultant(pool) && M.aeStatus(pool, TODAY) === 'open');
const pes = beacon.find((r) => r.solNum === 'PES-2026-0012');
assert.ok(pes && pes.date === '2026-12-03' && M.aeStatus(pes, TODAY) === 'open');
assert.ok(!JSON.stringify(beacon).includes('@'), 'no contact email is copied');
assert.strictEqual(M.parseBeaconOpen('not json'), null);
assert.strictEqual(M.parseBeaconOpen('{"data":{}}'), null);

const travis = M.parseBidNet(fix('bidnet-sample.html'), 'Travis County', 'https://www.bidnetdirect.com/texas/traviscounty');
assert.strictEqual(travis.listed, 4);
assert.strictEqual(travis.length, 1, 'CDL training, appraisal, and the tax IFB are not A/E');
assert.strictEqual(travis[0].agency, 'Travis County');
assert.strictEqual(travis[0].solNum, '223-TL');
assert.strictEqual(travis[0].id, 'bidnet:0000422699');
assert.strictEqual(travis[0].date, '2026-11-19');
assert.ok(travis[0].extra.some((e) => e[0] === 'Published' && e[1] === '2026-10-30'));
assert.ok(travis[0].url.indexOf('https://www.bidnetdirect.com/texas/solicitations/open-bids/Travis-County-Pre-Qualified-List-for-Architects-and-Engineers/0000422699') === 0);
assert.ok(M.isConsultant(travis[0]) && M.aeStatus(travis[0], TODAY) === 'open');

const dallas = M.parseBidNet(fix('bidnet-sample.html'), 'Dallas County', 'https://www.bidnetdirect.com/texas/dallas-county');
assert.strictEqual(dallas.length, 1, 'the same fixture still has the one A/E card; agency label follows the board argument');
assert.strictEqual(dallas[0].agency, 'Dallas County');

const tpgHtml = '<div class="sol-info-container"><div class="sol-title"><a href="/public/supplier/solicitations/statewide/444233429066/abstract?purchasingGroupId=8407551&amp;origin=1">On-Call Civil Engineering Services</a></div><span class="sol-publication-date"><span class="date-value">11/01/2026</span></span><span class="sol-closing-date open"><span class="date-value">12/01/2026</span></span></div>' +
  '<div class="sol-info-container"><div class="sol-title"><a href="/public/supplier/solicitations/statewide/444233429099/abstract?purchasingGroupId=8407551&amp;origin=1">On-Call Architectural Services</a></div><span class="sol-publication-date"><span class="date-value">11/02/2026</span></span><span class="sol-closing-date open"><span class="date-value">12/15/2026</span></span></div>' +
  '<div class="sol-info-container"><div class="sol-title"><a href="/public/supplier/solicitations/statewide/444233429100/abstract?purchasingGroupId=8407551&amp;origin=1">Janitorial Services</a></div><span class="sol-closing-date open"><span class="date-value">12/20/2026</span></span></div>';
const tpg = M.parseBidNet(tpgHtml, 'Texas Purchasing Group', 'https://www.bidnetdirect.com/texas/solicitations/open-bids', 'bidnet-tpg');
assert.strictEqual(tpg.listed, 3);
assert.strictEqual(tpg.length, 2, 'janitorial is not A/E; the two consultant cards are');
assert.deepStrictEqual(tpg.map((r) => r.id).sort(), ['bidnet:444233429066', 'bidnet:444233429099']);
assert.ok(tpg.every((r) => !r.solNum), 'a board that does not print a solicitation number does not invent one');
assert.strictEqual(M.mergeDuplicates(tpg, new Set()).length, 2, 'missing solicitation numbers do not collapse the board into one record');

const blocked = SS.build([{ id: 'houston-beacon', name: 'Houston', status: 'blocked by site', kept: 2, note: 'AWS WAF captcha. Not bypassed.' }], { sources: [{ id: 'houston-beacon', lastSuccess: '2026-11-01T00:00:00Z' }] }, 'texas', '2026-11-13T00:00:00Z');
assert.strictEqual(blocked.sources[0].health, 'blocked by site');
assert.strictEqual(blocked.sources[0].records, 2);
assert.strictEqual(blocked.sources[0].lastSuccess, '2026-11-01T00:00:00Z');
assert.ok(blocked.sources[0].health !== 'failing' && blocked.sources[0].health !== 'stale');
assert.ok(/Not bypassed/.test(blocked.sources[0].error || ''));

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const wf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'refresh-opportunities.yml'), 'utf8');
assert.ok(!/sam\.gov/i.test(appJs), 'the Sources view has no SAM.gov entry');
assert.ok(!/SAM_API_KEY/.test(wf), 'the Texas workflow does not pass SAM_API_KEY');
assert.ok(/blocked by site/.test(appJs), 'a blocked source is not called a failure');

const snap = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'opportunities.json'), 'utf8'));
['ntta', 'houston-beacon', 'bidnet-travis', 'bidnet-dallas', 'bidnet-tpg'].forEach((id) => {
  const s = snap.sources.find((x) => x.id === id);
  assert.ok(s, 'snapshot lists ' + id);
  assert.ok(s.status === 'ok' || s.status === 'blocked by site', id + ' status');
});
assert.ok(!snap.sources.some((s) => /sam/i.test(s.id) || /sam\.gov/i.test(s.name || '')));
const status = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'source-status.json'), 'utf8'));
['ntta', 'houston-beacon', 'bidnet-travis', 'bidnet-dallas', 'bidnet-tpg'].forEach((id) => {
  const s = status.sources.find((x) => x.id === id);
  assert.ok(s && (s.health === 'fresh' || s.health === 'blocked by site'), id + ' health');
});

console.log('wave 2 filter and source tests passed');
