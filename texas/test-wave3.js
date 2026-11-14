// Wave 3 A/E sources. Loaded by texas/test.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const M = require('./model.js');

const TODAY = '2026-11-14';
const fix = (name) => fs.readFileSync(path.join(__dirname, 'test-fixtures', 'wave3', name), 'utf8');

assert.strictEqual(M.robotsDisallowAll(fix('ionwave-robots.txt')), true);
assert.strictEqual(M.robotsDisallowAll('User-agent: *\nAllow: /\n'), false);
assert.strictEqual(M.robotsDisallowAll('User-agent: *\nDisallow: /private\n'), false);
assert.strictEqual(M.robotsDisallowAll('User-agent: BadBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n'), false);
assert.strictEqual(M.robotsDisallowAll(''), false);

assert.strictEqual(M.isSiteChallenge('<html><title>Just a moment...</title><script src="https://challenges.cloudflare.com/cdn-cgi/challenge"></script></html>'), true);
assert.strictEqual(M.isSiteChallenge('<html><title>Human Verification</title>aws waf</html>'), true);
assert.strictEqual(M.isSiteChallenge(fs.readFileSync(path.join(__dirname, 'test-fixtures', 'wave2', 'bidnet-sample.html'), 'utf8')), false);
assert.strictEqual(M.isSiteChallenge(fs.readFileSync(path.join(__dirname, 'test-fixtures', 'wave2', 'ntta-sample.html'), 'utf8')), false);

const og = M.parseOpenGovPublic(fix('opengov-sample.json'), 'H-GAC', 'h-gac', 'opengov-hgac', null);
assert.ok(og, 'OpenGov JSON parses');
assert.strictEqual(og.listed, 8);
assert.strictEqual(og.total, 8);
const keptNums = og.map((r) => r.solNum).sort();
assert.deepStrictEqual(keptNums, ['26-0307-06-03-09', '26-0569-11-04-03', 'RFQ-TRN26-07', 'RFQ-ZONE-1']);
const delivery = og.find((r) => r.solNum === 'RFQ-TRN26-07');
assert.strictEqual(delivery.agency, 'H-GAC');
assert.strictEqual(delivery.src, 'opengov-hgac');
assert.strictEqual(delivery.id, 'opengov:h-gac:272539');
assert.strictEqual(delivery.title, 'Transportation Project Delivery Plan Consultant Services');
assert.strictEqual(delivery.date, '2026-12-03');
assert.strictEqual(delivery.status, 'Open');
assert.strictEqual(delivery.url, 'https://procurement.opengov.com/portal/h-gac/projects/272539');
assert.ok(delivery.extra.some((e) => e[0] === 'Posted' && e[1] === '2026-10-07'));
assert.ok(M.isConsultant(delivery) && M.aeStatus(delivery, TODAY) === 'open');
const pool = og.find((r) => r.solNum === '26-0307-06-03-09');
assert.strictEqual(pool.date, '2026-06-10');
assert.strictEqual(pool.status, 'Evaluation');
assert.ok(M.aeStatus(pool, TODAY) === 'past');
const water = og.find((r) => r.solNum === '26-0569-11-04-03');
assert.ok(water && M.aeStatus(water, TODAY) === 'past', 'an RFP whose title says water stays under the existing rule');
const zone = og.find((r) => r.solNum === 'RFQ-ZONE-1');
assert.strictEqual(zone.date, '2026-11-18');
assert.strictEqual(zone.status, 'Forthcoming');
assert.strictEqual(M.aeStatus(zone, TODAY), 'forecast');
assert.ok(!JSON.stringify(og).includes('@'), 'summary emails are not copied');
assert.ok(!JSON.stringify(og).includes('RFQ-PRIVATE-1'), 'a private row is not kept');
assert.ok(!JSON.stringify(og).includes('CT04-27'));
assert.ok(!JSON.stringify(og).includes('Wellness Center'));
assert.ok(!JSON.stringify(og).includes('Lift Station'));
assert.strictEqual(M.parseOpenGovPublic('not json', 'H-GAC', 'h-gac', 'opengov-hgac', null), null);
assert.strictEqual(M.parseOpenGovPublic('{"count":1}', 'H-GAC', 'h-gac', 'opengov-hgac', null), null);

const hidalgo = M.parseOpenGovPublic(fix('opengov-sample.json'), 'Hidalgo County', 'co-hidalgo-tx', 'opengov-hidalgo', 'Hidalgo');
const hidalgoPool = hidalgo.find((r) => r.solNum === '26-0307-06-03-09');
assert.strictEqual(hidalgoPool.agency, 'Hidalgo County');
assert.strictEqual(hidalgoPool.county, 'Hidalgo');
assert.strictEqual(hidalgoPool.src, 'opengov-hidalgo');

const buildJs = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-opportunities.js'), 'utf8');
assert.ok(!/CurrentSourcingEvents|SourcingEvents\.aspx|PublicDetail\.aspx/.test(buildJs), 'IonWave bid pages are not requested');
assert.ok(!/fetch\([^)]*api-prod-app\.civcast\.com/.test(buildJs), 'the CivCast API host behind the WAF is not called');

const snap = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'opportunities.json'), 'utf8'));
['civcast', 'opengov-hidalgo', 'opengov-hgac', 'ionwave-plano', 'ionwave-tarrant', 'ionwave-elpaso'].forEach((id) => {
  const s = snap.sources.find((x) => x.id === id);
  assert.ok(s, 'snapshot lists ' + id);
});
['civcast', 'ionwave-plano', 'ionwave-tarrant', 'ionwave-elpaso'].forEach((id) => {
  const s = snap.sources.find((x) => x.id === id);
  assert.strictEqual(s.status, 'blocked by site', id);
  assert.ok(/not requested|was not called|Disallow|human verification/i.test(s.note || ''), id + ' note');
});
assert.ok(!snap.sources.some((s) => /sam/i.test(s.id) || /sam\.gov/i.test(s.name || '')));
const esbd = snap.records.find((r) => r.id === 'esbd:RFQ-TRN26-07');
assert.ok(esbd, 'the ESBD copy of RFQ-TRN26-07 stays the kept id');
assert.ok((esbd.also || []).indexOf('opengov-hgac') >= 0, 'H-GAC OpenGov is merged onto the ESBD id');
const poolLive = snap.records.find((r) => r.solNum === '26-0307-06-03-09');
assert.ok(poolLive && poolLive.src === 'opengov-hidalgo', 'Hidalgo engineering pool is kept');
assert.strictEqual(M.aeStatus(poolLive, TODAY), 'past');
snap.records.filter((r) => r.src === 'opengov-hidalgo' || r.src === 'opengov-hgac').forEach((r) => {
  assert.ok(!JSON.stringify(r).includes('@'), r.id + ' has no email');
});
const status = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'source-status.json'), 'utf8'));
['civcast', 'ionwave-plano', 'ionwave-tarrant', 'ionwave-elpaso'].forEach((id) => {
  const s = status.sources.find((x) => x.id === id);
  assert.ok(s && s.health === 'blocked by site', id + ' health');
  assert.ok(s.health !== 'failing' && s.health !== 'stale');
});
['opengov-hidalgo', 'opengov-hgac'].forEach((id) => {
  const s = status.sources.find((x) => x.id === id);
  assert.ok(s && (s.health === 'fresh' || s.health === 'blocked by site'), id + ' health');
});

console.log('wave 3 parser tests passed');
