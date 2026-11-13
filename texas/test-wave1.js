// Wave 1 A/E sources and the tighter consultant filter. Loaded by texas/test.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const M = require('./model.js');
const F = require('../shared/filters.js');

const TODAY = '2026-11-13';
const fix = (name) => fs.readFileSync(path.join(__dirname, 'test-fixtures', 'wave1', name), 'utf8');

function mem(map) {
  const o = { map: Object.assign({}, map || {}) };
  o.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this.map, k) ? this.map[k] : null; };
  o.setItem = function (k, v) { this.map[k] = String(v); };
  return o;
}

// ---- wording gate
assert.strictEqual(M.isClearNonEng('RFQ for bond underwriting and investment banking'), true);
assert.strictEqual(M.hasAeWording('Redesign of an elevated storage tank'), true);
assert.strictEqual(M.hasAeWording('Design-Build of a Fire Station'), false);
assert.strictEqual(M.hasAeWording('WEB PAGE DESIGN AND/OR MANAGEMENT SERVICES'), false);

// Arlington tank, real Bonfire list JSON, due 2026-12-03
const arl = JSON.parse(fix('arlington-tank.json'));
const arlPortal = M.BONFIRE_PORTALS.find((p) => p.sub === 'arlingtontx');
assert.ok(arlPortal, 'Arlington is a configured portal');
const tank = M.bonfireRecord(arl.project, arlPortal, arl.departments);
assert.strictEqual(tank.agency, 'City of Arlington');
assert.strictEqual(tank.date, '2026-12-03');
assert.strictEqual(tank.dept, 'Water Utilities - Capital');
assert.strictEqual(tank.svc, true);
assert.ok(M.isConsultant(tank));
assert.strictEqual(M.aeStatus(tank, TODAY), 'open', 'Arlington tank RFQ is A/E Open');

// TxDOT department codes are not PEPS; the PEPS name is
const tx = JSON.parse(fix('txdot-bonfire.json'));
const txPortal = M.BONFIRE_PORTALS.find((p) => p.sub === 'txdot');
const gen = M.bonfireRecord(tx.project, txPortal, tx.departments);
assert.strictEqual(gen.dept, 'PRO_Services');
assert.strictEqual(M.isConsultant(gen), false, 'PRO_Services is not the PEPS department');
const pepsDept = { 3757: { DepartmentName: 'Professional Engineering (PEPS)' } };
const pepsRow = M.bonfireRecord(Object.assign({}, tx.project, { ProjectName: 'Wave 4 schematic contract' }), txPortal, pepsDept);
assert.strictEqual(pepsRow.dept, 'Professional Engineering (PEPS)');
assert.strictEqual(M.isConsultant(pepsRow), true, 'PEPS department is A/E');

// HCTRA label from a real Harris County title
const hc = JSON.parse(fix('hctra-bonfire.json'));
const hcPortal = M.BONFIRE_PORTALS.find((p) => p.sub === 'harriscountytx');
const toll = M.bonfireRecord(hc.project, hcPortal, hc.departments);
assert.strictEqual(toll.agency, 'HCTRA');
assert.strictEqual(M.isConsultant(toll), false, 'a toll-road software RFP is not A/E');

// Real titles already on the radar
const bond = { title: 'Municipal Underwriting / Bond & Investment Banking Services (RFQS 7400 BRS4000)', solType: 'Request for qualifications', src: 'austin-active' };
assert.strictEqual(M.isConsultant(bond), false, 'bond underwriting RFQ is not A/E');
const web = { title: 'Purchase of WEB PAGE DESIGN AND/OR MANAGEMENT SERVICES', solType: 'Type not stated', src: 'bonfire-dallascityhall' };
assert.strictEqual(M.isConsultant(web), false, 'web page design is not A/E');
const webRfp = { title: 'RFP - Web Page Design and Management Services', src: 'bonfire-dallascityhall' };
assert.strictEqual(M.isConsultant(webRfp), false, 'web page design RFP is not A/E');
const treat = { title: 'RFSQ - Substance Abuse Treatment Services and Other Cognitive, Criminogenic Interventions', src: 'bonfire-harriscountytx' };
assert.strictEqual(M.isConsultant(treat), false, 'treatment RFSQ is not A/E');

const hcfcd = M.parseHcfcdBids('<table><tr><th>SN</th><th>Job #</th><th>Request for Qualifications (RFQ)</th><th>Weblinks</th></tr>' +
  '<tr><td>1</td><td>26/0159</td><td>RFSQ - Professional Engineering/Architectural Services for Halls Bayou Channel Conveyance Improvements Phase II</td><td><a href="https://harriscountytx.bonfirehub.com/opportunities/237384">WEB LINK</a></td></tr></table>')[0];
assert.ok(M.isConsultant(hcfcd));
assert.strictEqual(M.aeStatus(hcfcd, TODAY), 'past', 'historical HCFCD RFQ row with no due date is Past');

assert.strictEqual(M.aeStatus({ src: 'txdot-pcl', title: 'PS&E', stage: 'Projected A/E contract' }, TODAY), 'forecast');
assert.strictEqual(M.aeStatus({ src: 'txdot-peps', title: 'TxDOT PEPS PS&E', stage: 'Listed on TxDOT "Consultants selected for negotiations" page', date: '2026-12-01' }, TODAY), 'past');

// ESBD export fixture
const esbd = M.parseEsbdCsv(fix('esbd-sample.csv'), JSON.parse(fix('esbd-agencies.json')));
assert.strictEqual(esbd.length, 1, 'pest-control row is dropped');
assert.strictEqual(esbd[0].title, 'Professional Architectural and Engineering Services');
assert.strictEqual(esbd[0].agency, 'Spindletop Center');
assert.strictEqual(esbd[0].solNum, 'STC-27-001');
assert.strictEqual(esbd[0].date, '2026-11-30');
assert.strictEqual(esbd[0].status, 'Posted');
assert.strictEqual(esbd[0].url, 'https://www.txsmartbuy.gov/esbd/STC-27-001');
assert.ok(esbd[0].extra.some((e) => e[0] === 'Agency number' && e[1] === 'R1231'));
assert.ok(M.isConsultant(esbd[0]) && M.aeStatus(esbd[0], TODAY) === 'open');

// AggieBid
const ag = M.parseAggieBid(fix('aggiebid-sample.html'));
assert.strictEqual(ag.length, 1, 'ITB is dropped; the A/E RFQ is kept');
assert.strictEqual(ag[0].solNum, '04-TARLTON-RFQ-0028');
assert.strictEqual(ag[0].date, '2026-11-23');
assert.ok(/As-Needed/i.test(ag[0].desc || ''), 'subtitle is kept');
assert.ok(M.isConsultant(ag[0]), 'AggieBid A/E on-call is A/E');
assert.strictEqual(M.aeStatus(ag[0], TODAY), 'open');
assert.ok(ag[0].url.indexOf('https://app01.jaggaer.com/apps/Router/ViewSourcingEvent') === 0);
assert.ok(!JSON.stringify(ag).includes('LUTTRELL@') && !JSON.stringify(ag).includes('mailto:'), 'contact email is not copied');

// CTRMA
const ctr = M.parseCtrma(fix('ctrma-sample.html'));
const pool = ctr.find((r) => /Retaining Wall Remediation/.test(r.title));
assert.ok(pool, 'engineering table row is kept');
assert.strictEqual(pool.date, '2026-08-28');
assert.ok(M.isConsultant(pool));
assert.strictEqual(M.aeStatus(pool, TODAY), 'past', 'responses were due before 2026-11-13');
const awarded = ctr.find((r) => /183A Added Capacity/.test(r.title));
assert.ok(awarded && M.isConsultant(awarded));
assert.strictEqual(M.aeStatus(awarded, TODAY), 'past');
assert.strictEqual(awarded.cost, 9991090.75);
assert.ok(!ctr.some((r) => /General Contractor Services/.test(r.title)), 'awarded construction without engineering wording is not kept');

// Duplicates: keep a previously saved id, note every source
const copyA = { id: 'esbd:STC27001', src: 'esbd', agency: 'Spindletop Center', title: 'Professional Architectural and Engineering Services', date: '2026-11-30', solNum: 'STC-27-001', desc: 'NIGP 906', url: 'https://www.txsmartbuy.gov/esbd/STC-27-001', status: 'Posted', solType: 'Type not stated', kind: 'solicitation' };
const copyB = { id: 'bf:old:1', src: 'bonfire-utexas', agency: 'University of Texas', title: 'Professional Architectural and Engineering Services', date: '2026-11-30', solNum: 'STC-27-001', url: 'https://utexas.bonfirehub.com/opportunities/1', status: 'Open', solType: 'Request for qualifications', kind: 'solicitation' };
const merged = M.mergeDuplicates([copyA, copyB], new Set(['bf:old:1']));
assert.strictEqual(merged.length, 1);
assert.strictEqual(merged[0].id, 'bf:old:1', 'an id already on disk is kept so a star still matches');
assert.ok(merged[0].desc === 'NIGP 906', 'empty fields are filled from the other copy');
assert.ok((merged[0].also || []).indexOf('esbd') >= 0);
const shortA = { id: 'a', src: 'esbd', agency: 'City of Arlington', title: 'Tank', date: '2026-12-03', solNum: '27-0077' };
const shortB = { id: 'b', src: 'bonfire-arlingtontx', agency: 'Denton County', title: 'Different work', date: '2026-12-03', solNum: '27-0077' };
assert.strictEqual(M.mergeDuplicates([shortA, shortB], new Set()).length, 2, 'a short number at two agencies stays two records');

// Saved filters and stars are not dropped when the new status is applied
const watch = '{"abc":{"t":"Starred title","a":"TxDOT"}}';
const ls = mem({
  'texas.filtersets': JSON.stringify([{ name: 'Mine', app: 'texas', f: { q: 'drain', rel: 'direct', consult: true, eng: false, houston: false, located: false, watchOnly: false, agencies: ['HCFCD'], phases: [], kinds: [], kw: [] } }]),
  'texas.watch': watch
});
const loaded = F.load(ls, 'texas');
assert.strictEqual(loaded.length, 1);
assert.strictEqual(loaded[0].name, 'Mine');
assert.strictEqual(loaded[0].f.q, 'drain');
assert.strictEqual(loaded[0].f.ae, 'open', 'a saved set with no status opens on Open');
assert.deepStrictEqual(loaded[0].f.agencies, ['HCFCD']);
assert.strictEqual(ls.getItem('texas.watch'), watch, 'loading filters does not write or delete the watchlist');

const openOnly = M.filterRecords([tank, hcfcd, { id: 'pcl', src: 'txdot-pcl', agency: 'TxDOT', title: 'Projected', stage: 'Projected A/E contract', rel: 'none', phase: 'procure', kind: 'procurement' }], { consult: true, today: TODAY }, {});
assert.deepStrictEqual(openOnly.map((r) => r.id), [tank.id], 'the consultant view defaults to Open');

const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
assert.ok(/data-ae="open"/.test(appJs) && /data-ae="forecast"/.test(appJs) && /data-ae="past"/.test(appJs), 'Open, Forecast, and Past are one click from the consultant view');
assert.ok(/open A\/E today/.test(appJs), 'Sources shows today\'s open A/E count');
assert.ok(!/github\.com\/lbonil3\/radars/.test(appJs), 'the Texas page does not link to the repository');

console.log('wave 1 filter and source tests passed');
