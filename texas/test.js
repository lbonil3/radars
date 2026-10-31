const assert = require('assert');
const fs = require('fs');
const path = require('path');
const M = require('./model.js');
const B = require('../scripts/build-opportunities.js');
const dir = __dirname;
const T = '2026-10-25';

// ---- keywords and relevance
assert.deepStrictEqual(M.matchKeywords('Replace culvert and drainage ditch'), ['drainage', 'culvert', 'ditch']);
assert.deepStrictEqual(M.matchKeywords('Bridge-class culvert at Cedar Creek'), ['culvert', 'bridge-class']);
assert.deepStrictEqual(M.matchKeywords('Channelized right turn lane'), [], 'channelized is traffic, not a channel');
assert.ok(M.matchKeywords('HYDRAULIC CEMENT').indexOf('hydraulics') < 0, 'hydraulic cement is not hydraulics work');
assert.ok(M.matchKeywords('Storm sewer improvements').indexOf('storm-sewer') >= 0 && M.matchKeywords('Storm sewer improvements').indexOf('stormwater') < 0);
assert.ok(M.matchKeywords('stormwater detention basin').indexOf('detention') >= 0);
assert.strictEqual(M.classify(['Widen Road - Add Lanes']).rel, 'likely');
assert.strictEqual(M.classify(['Seal Coat']).rel, 'none');
assert.strictEqual(M.classify(['CULVERT REPAIR']).rel, 'direct');
assert.strictEqual(M.classify(['anything'], { sourceDirect: 'layer' }).rel, 'direct');

// ---- TxDOT Project Information
const row = { project_id: 'A00123456', control_section_job_csj: '0912-34-567', project_stage: 'PS&E', project_status: 'Active', type_of_work: 'Drainage Improvements', short_description: 'Drainage Improvements', project_description: 'Replace culverts', highway: 'FM 521', project_limits_from: 'SH 6', project_limits_to: 'CR 12', county: 'BRAZORIA', district_division: 'Houston', latitude_line_begin: '29.40', longitude_line_begin: '-95.50', latitude_line_end: '29.42', longitude_line_end: '-95.48', project_estimated_let_date: '2027-09-03T00:00:00.000', project_estimate_low_bid: '1500000.0', local_agency_name: 'FORT BEND (COUNTY)', let_type_description: 'Local Agency Let' };
const rec = M.normTxdotPI(row);
assert.strictEqual(rec.id, 'txdot:A00123456');
assert.strictEqual(rec.agency, 'TxDOT'); assert.strictEqual(rec.phase, 'design'); assert.strictEqual(rec.rel, 'direct');
assert.strictEqual(rec.county, 'Brazoria'); assert.strictEqual(rec.date, '2027-09-03'); assert.strictEqual(rec.cost, 1500000);
assert.strictEqual(rec.lat, 29.41); assert.strictEqual(rec.lon, -95.49);
assert.strictEqual(rec.sponsor, 'Fort Bend County');
assert.ok(rec.title.indexOf('SH 6 to CR 12') > 0);
assert.ok(rec.url.indexOf('data.texas.gov/resource/drau-zphx.json?project_id=A00123456') > 0);
assert.strictEqual(M.normTxdotPI(Object.assign({}, row, { project_stage: 'Construction' })), null, 'construction stage dropped');
assert.strictEqual(M.normTxdotPI(Object.assign({}, row, { type_of_work: 'Seal Coat', short_description: 'Seal Coat', project_description: 'seal coat', project_name: 'x' })), null, 'non-drainage dropped');
assert.strictEqual(M.normTxdotPI(Object.assign({}, row, { latitude_line_begin: '0', longitude_line_begin: '0' })).lat, null, 'bad coordinates become unknown, not guessed');
assert.strictEqual(M.normTxdotPI(Object.assign({}, row, { project_estimate_low_bid: '0.0' })).cost, null, 'zero cost = unknown');
assert.ok(M.mergeTracker(rec, { PROJ_ID: 'A00123456', PSE_30_ACTL_DT: Date.UTC(2026, 2, 1), TXDOT_CNTCT_NM: 'Pat Doe' }));
assert.ok(rec.extra.some((e) => e[0] === 'PS&E 30% (actual)' && e[1] === '2026-03-01') && rec.tracker === true);

// ---- City of Houston
const stormLayer = M.COH_LAYERS.find((l) => l.id === 7), streetLayer = M.COH_LAYERS.find((l) => l.id === 2);
const coh = M.normCohCip({ OBJECTID: 5, CIP_NO: 'M-410008-0001', PROJ_NO: 'M-410008-0001', PRO_TYPE: 'MSD', PRO_DESC: 'Freeway Manor South Area: Storm Sewer Improvements ', STAGE: 'E', CONST_STAR: Date.UTC(2027, 0, 15), COUN_DIST: 'E' }, { paths: [[[-95.2, 29.6], [-95.4, 29.8]]] }, stormLayer);
assert.strictEqual(coh.phase, 'design'); assert.strictEqual(coh.rel, 'direct'); assert.strictEqual(coh.lat, 29.7); assert.strictEqual(coh.date, '2027-01-15'); assert.strictEqual(coh.cost, null);
assert.ok(coh.stage.indexOf('Design [E]') === 0);
assert.strictEqual(M.normCohCip({ OBJECTID: 6, CIP_NO: 'X', PRO_DESC: 'Sidewalk', STAGE: 'E' }, null, streetLayer), null, 'street layer needs a drainage keyword');
assert.ok(M.normCohCip({ OBJECTID: 7, CIP_NO: 'Y', PRO_DESC: 'Street and Drainage Improvements', STAGE: 'F' }, null, streetLayer), 'street layer with drainage keyword kept');
assert.strictEqual(M.normCohCip({ OBJECTID: 8, CIP_NO: 'Z', PRO_DESC: 'Storm Sewer', STAGE: 'CP' }, null, stormLayer), null, 'complete dropped');
const sw = M.normSwmb({ OBJECTID: 9, ProjectID: 'SWAT-26-1', PROJECTNAME: '1 Main St', STATUS: 'In Design', XCENTER: -95.4, YCENTER: 29.7, PROJECTSCOPE: 'Storm Sewer Improvement', STARTDATE: Date.UTC(2026, 11, 1) });
assert.strictEqual(sw.phase, 'design'); assert.strictEqual(sw.date, '2026-12-01'); assert.strictEqual(sw.lat, 29.7);
assert.strictEqual(M.normSwmb({ OBJECTID: 10, STATUS: 'Construction Complete', PROJECTNAME: 'x' }), null);
assert.strictEqual(M.normSwmb({ OBJECTID: 11, STATUS: 'In Design', PROJECTNAME: 'x', XCENTER: 0, YCENTER: 0 }).lat, null);

// ---- HCFCD maintenance (LJA-hosted)
const hm = M.normHcfcdMaint({ project_id: 'K124-00-00-X041', med_stage: 'Design', med_type_of_work: 'NSCD Channel Repairs', med_cost_estimate: 3000000, first_advert_or_oncall_transfer: '2026-07-10', watershed_name: 'Cypress Creek', med_designer: 'JMT' }, { x: -95.47, y: 30.05 });
assert.strictEqual(hm.phase, 'design'); assert.strictEqual(hm.date, '2026-07-10'); assert.strictEqual(hm.cost, 3000000); assert.ok(hm.extra.some((e) => e[1] === 'JMT'));
assert.strictEqual(M.normHcfcdMaint({ project_id: 'A', med_stage: 'Completed' }, null), null);
assert.strictEqual(M.normHcfcdMaint({ project_id: 'A', med_stage: 'Design', first_advert_or_oncall_transfer: 'Task Complete' }, null).date, null, 'non-date text is not turned into a date');

// ---- HCFCD bid page
const bidHtml = '<table><tr><th>SN</th><th>Job #</th><th>Request for Qualifications (RFQ)</th><th>Weblinks</th></tr>' +
  '<tr><td>1</td><td>26/0159</td><td>RFSQ - Professional Engineering/Architectural Services for Halls Bayou Channel Conveyance Improvements Phase II</td><td><a href="https://harriscountytx.bonfirehub.com/opportunities/237384">WEB LINK</a></td></tr>' +
  '<tr><td>2</td><td>25/0397</td><td>ITB - Supply of Various Species of Native Seed</td><td><a href="https://harriscountytx.bonfirehub.com/opportunities/213108">WEB LINK</a></td></tr>' +
  '<tr><td>3</td><td>25/0218</td><td>P118-26-00-E001 - Helms Stormwater Detention Basin and Conveyance Improvements</td><td><a href="https://harriscountytx.bonfirehub.com/opportunities/192214">WEB LINK</a></td></tr>' +
  '<tr><td>3</td><td>25/0167</td><td>Z100-00-00-Y153 - Deferred Maintenance Portfolio Management</td><td><a href="https://harriscountytx.bonfirehub.com/opportunities/186543">WEB LINK</a></td></tr></table>';
const bids = M.parseHcfcdBids(bidHtml);
assert.strictEqual(bids.length, 3, 'seed ITB dropped (no drainage words, no HCFCD unit prefix); others kept');
assert.strictEqual(bids[0].url, 'https://harriscountytx.bonfirehub.com/opportunities/237384');
assert.strictEqual(bids[0].date, undefined === bids[0].date ? undefined : null, 'no due date invented'); assert.ok(!bids[0].date);
assert.strictEqual(bids[0].kind, 'procurement');
assert.ok(bids.some((b) => b.id === 'hcfcd-bid:25/0167' && b.rel === 'direct'));

// ---- TxDOT PEPS pages
const pepsHtml = '<table><tr><td>Project ID</td><td>Closing Date</td><td>Fiscal Year</td><td>Wave</td><td>Work Type</td><td>Service Center</td></tr><tr><td>601CT0000006465</td><td>06/25/2026</td><td>2026</td><td>4</td><td>PS&amp;E</td><td>Central Service Center</td></tr><tr><td>601CT0000006468</td><td>06/23/2026</td><td>2026</td><td>4</td><td>ENGR</td><td>Service Center for Divisions</td></tr><tr><td>601CT0000006208</td><td>03/24/25</td><td>2025</td><td>3</td><td>H&amp;H</td><td>Houston Service Center</td></tr></table>';
const peps = M.parsePepsSelected(pepsHtml, 2026);
assert.strictEqual(peps.length, 1); assert.strictEqual(peps[0].date, '2026-06-25'); assert.strictEqual(peps[0].work, 'PS&E'); assert.strictEqual(peps[0].rel, 'likely');
assert.strictEqual(M.parsePepsSelected(pepsHtml, 2025).length, 2);
const mtgHtml = '<table><tbody><tr><td>Date</td><td>Description</td><td>Location</td></tr><tr><td>03/13/2026</td><td><a href="/business/peps/opportunities/meetings/x.html">Pre-Wave Project Information Meeting – Hamilton Relief Route – US 281/SH 36 PS&amp;E – Waco District</a></td><td>Waco</td></tr><tr><td>08/12/2026</td><td><a href="/b/y.html">Pre-RFP Meeting – Routine Bridge Inspection – Bridge Division</a></td><td>Virtual</td></tr></tbody></table>';
const mtg = M.parsePepsMeetings(mtgHtml);
assert.strictEqual(mtg.length, 1); assert.strictEqual(mtg[0].date, '2026-03-13'); assert.strictEqual(mtg[0].district, 'Waco District');
assert.strictEqual(mtg[0].url, 'https://www.txdot.gov/business/peps/opportunities/meetings/x.html');

// ---- xlsx reader + projected contracts (fixture is a real .xlsx written with openpyxl)
const rows = B.xlsxRows(fs.readFileSync(path.join(dir, 'test-fixtures', 'mini-projected-contracts.xlsx')));
assert.ok(rows.length >= 5);
assert.ok(/Wave 3/.test(rows[2][0]) && rows[2][1] === 'Hydraulics / Hydrological' && rows[2][12] === 5000000);
assert.ok(rows[2][7].indexOf('& more <test>.') > 0, 'xml entities decoded');
const pcl = M.parseProjectedContracts(rows, 'https://example.test/pcl.xlsx', 'FY2099');
assert.strictEqual(pcl.length, 3);
assert.strictEqual(pcl[0].rel, 'direct'); assert.strictEqual(pcl[0].date, '2099-03-01'); assert.strictEqual(pcl[0].cost, 5000000); assert.strictEqual(pcl[0].district, 'Houston District');
assert.strictEqual(pcl[1].rel, 'direct', 'PS&E with drainage words in the description'); assert.strictEqual(pcl[1].county, 'Hamilton');
assert.strictEqual(pcl[2].rel, 'none'); assert.strictEqual(pcl[2].cost, null, 'TBD value stays unknown');

// ---- TWDB FIF
const fif = M.normFif({ Project_ID: 61000438, Name: 'Greens Bayou Drainage Mitigation', Project_Sponsor: 'Harris County', FIF_Project_Type: 'FME', Estimated_Costs: 30000, TWDB_Flood_Planning_Region: 6, Community_Cost_Share_Estimate: 7500 });
assert.strictEqual(fif.kind, 'funding'); assert.strictEqual(fif.cost, 30000); assert.ok(!fif.lat && !fif.date); assert.strictEqual(fif.sponsor, 'Harris County');

// ---- geography
global.window = {}; eval(fs.readFileSync(path.join(dir, 'texas-geo.js'), 'utf8').replace('window.TX_GEO=', 'global.TX_GEO='));
assert.strictEqual(TX_GEO.counties.length, 254, 'Texas has 254 counties');
const cent = M.countyCentroids(TX_GEO);
assert.ok(cent.harris[0] > -95.8 && cent.harris[0] < -95.0 && cent.harris[1] > 29.5 && cent.harris[1] < 30.2, 'Harris County centroid near Houston');
const ap = [{ src: 'txdot-pi', county: 'Harris', id: 'a' }, { src: 'coh-swmb', county: 'Harris', id: 'b' }, { src: 'txdot-pi', county: 'Harris', lat: 29.7, lon: -95.3, id: 'c' }];
assert.strictEqual(M.applyApprox(ap, cent), 1, 'centroid only for TxDOT rows that name a county but have no coordinates');
assert.ok(ap[0].alat && !ap[1].alat && !ap[2].alat);

// ---- filters, aggregation, CSV
const recs = [
  { id: '1', agency: 'TxDOT', kind: 'project', phase: 'design', rel: 'direct', kw: ['culvert'], title: 'Culvert on FM 1', county: 'Harris', date: '2026-11-05', lat: 29.7, lon: -95.3, src: 'txdot-pi', url: 'u' },
  { id: '2', agency: 'HCFCD', kind: 'procurement', phase: 'procure', rel: 'direct', kw: [], title: 'Halls Bayou RFSQ', county: 'Harris', src: 'hcfcd-bids' },
  { id: '3', agency: 'TxDOT', kind: 'project', phase: 'early', rel: 'likely', kw: [], title: 'Widen SH 99, "quoted"', county: 'Waller', date: '2027-02-01', alat: 30, alon: -96, src: 'txdot-pi' },
  { id: '4', agency: 'TxDOT', kind: 'procurement', phase: 'procure', rel: 'none', kw: [], title: 'CEI services', src: 'txdot-pcl' }
];
const ids = (f, w) => M.filterRecords(recs, f, w).map((r) => r.id).join(',');
assert.strictEqual(ids({}), '1,2,3', 'default hides non-drainage');
assert.strictEqual(ids({ rel: 'all' }), '1,2,3,4');
assert.strictEqual(ids({ rel: 'direct' }), '1,2');
assert.strictEqual(ids({ agencies: ['HCFCD'] }), '2');
assert.strictEqual(ids({ kinds: ['procurement'] }), '2');
assert.strictEqual(ids({ kw: ['culvert'] }), '1');
assert.strictEqual(ids({ q: 'halls bayou' }), '2');
assert.strictEqual(ids({ q: 'harris culvert' }), '1');
assert.strictEqual(ids({ houston: true }), '1,2,3', 'Harris and Waller are both Houston-area');
assert.ok(!M.inHoustonArea({ src: 'txdot-pi', county: 'Dallas', agency: 'TxDOT' }), 'Dallas is not Houston-area');
assert.strictEqual(ids({ located: true }), '1,3');
assert.strictEqual(ids({ month: '2026-11' }), '1');
assert.strictEqual(ids({ watchOnly: true }, { 3: 1 }), '3');
assert.deepStrictEqual(M.sortedCounts(M.countBy(recs, (r) => r.agency)), [['TxDOT', 3], ['HCFCD', 1]]);
assert.strictEqual(M.daysUntil('2026-11-01', T), 7);
assert.strictEqual(M.fmtMoney(null), 'unknown'); assert.strictEqual(M.fmtMoney(1250000), '$1.25M'); assert.strictEqual(M.fmtMoney(450000), '$450K');
assert.strictEqual(M.fmtDate('2026-11-05'), 'Nov 5, 2026'); assert.strictEqual(M.fmtDate(null), 'unknown');
const csv = M.toCSV(recs.slice(0, 3), [{ id: 'txdot-pi', name: 'TxDOT PI' }]);
const lines = csv.trim().split('\r\n');
assert.strictEqual(lines.length, 4); assert.ok(lines[0].startsWith('agency,kind,title'));
assert.ok(lines[3].indexOf('"Widen SH 99, ""quoted"""') > 0, 'CSV quoting');
assert.ok(lines[3].indexOf('county centroid (inferred)') > 0, 'approx location flagged in CSV');
assert.ok(lines[3].indexOf('likely (inferred)') > 0);

// ---- consultant-services solicitations
assert.strictEqual(M.solType('RFQ - Clear Creek Phase 2').cls, 'qual');
assert.strictEqual(M.solType('RFSQ - Professional Engineering Services').cls, 'qual');
assert.strictEqual(M.solType('RFQS 6100 CLMP401').cls, 'qual', 'Austin RFQS is qualifications-type');
assert.strictEqual(M.solType('27-0007 RFQt Coin Only Parking Meters').cls, 'bid', 'Fort Worth RFQt is a price quote, not qualifications');
assert.strictEqual(M.solType('RFP - Fire Inspection Software').cls, 'prop');
assert.strictEqual(M.solType('ITB - Paving and Drainage Improvements').cls, 'bid');
assert.strictEqual(M.solType('Request for Competitive Sealed Proposals').cls, 'prop');
assert.strictEqual(M.solType('Mowing services').code, null);
assert.deepStrictEqual(M.matchEng('Professional Engineering Design Services'), ['engineering', 'design', 'professional']);
assert.ok(M.matchEng('Design-Build of a Fire Station').indexOf('design') < 0, 'design-build alone is not design services');
assert.ok(M.matchEng('Employee Engagement Survey').indexOf('survey') < 0, 'an employee survey is not land surveying');
assert.ok(M.matchEng('Land surveying and SUE services').indexOf('survey') >= 0);
const bfP = M.BONFIRE_PORTALS.find((p) => p.sub === 'harriscountytx');
const bf1 = M.bonfireRecord({ ProjectID: '255416', ReferenceID: '26/0336', ProjectName: 'RFQ - Clear Creek Federal Flood Risk Management Project - Phase 2 - Hughes Stormwater Detention Basin', DateClose: '2026-11-16 20:00:00' }, bfP);
assert.strictEqual(bf1.url, 'https://harriscountytx.bonfirehub.com/opportunities/255416'); assert.strictEqual(bf1.date, '2026-11-16'); assert.strictEqual(bf1.status, 'Open');
assert.strictEqual(bf1.svc, true); assert.strictEqual(bf1.rel, 'direct'); assert.ok(bf1.kw.indexOf('stormwater') >= 0 || bf1.kw.indexOf('detention') >= 0); assert.ok(M.isConsultant(bf1));
const bf2 = M.bonfireRecord({ ProjectID: '1', ReferenceID: 'x', ProjectName: 'ITB - Paving and Drainage Improvements for Bourgeois Road', DateClose: '2026-10-26 19:00:00' }, bfP);
assert.strictEqual(bf2.svc, false); assert.ok(!M.isConsultant(bf2), 'construction ITB is outside the consultant focus even with a drainage word');
const bf3 = M.bonfireRecord({ ProjectID: '2', ReferenceID: 'y', ProjectName: 'RFP - Fire Inspection Management Software', DateClose: '2026-11-09 20:00:00' }, bfP);
assert.strictEqual(bf3.svc, false, 'RFP without engineering words is out');
const bf4 = M.bonfireRecord({ ProjectID: '3', ReferenceID: 'z', ProjectName: 'RFP - Engineering and Design Services for Roadway', DateClose: '2026-11-09 20:00:00' }, bfP);
assert.strictEqual(bf4.svc, true, 'RFP with engineering words is in');
const bf5 = M.bonfireRecord({ ProjectID: '4', ReferenceID: 'Q26-063', ProjectName: 'Architectural, Engineering & Environmental Review Services for Federally Funded Residential Projects', DateClose: '2026-11-17 20:00:00' }, bfP);
assert.strictEqual(bf5.svc, true, 'untyped title with engineering/architect words is in, with the basis stated'); assert.ok(/Type not stated/.test(bf5.why));
assert.strictEqual(M.bonfireRecord({ ProjectID: '5', ReferenceID: 'r', ProjectName: 'Central Hydraulic System Kits', DateClose: '2026-10-27 20:00:00' }, bfP).svc, false);
assert.strictEqual(M.bonfireRecord({ ProjectID: '', ProjectName: 'x' }, bfP), null);
assert.strictEqual(M.isoFromSerial(46322.583333), '2026-10-27'); assert.strictEqual(M.isoFromSerial('abc'), null);
const austinRows = [['Solicitation ID', 'Solicitation No', 'Description', 'Published Date', 'Closing Date', 'Primary Name', 'Primary Email'],
  [144005, 'RFQS 6100 CLMP401', 'Davis Water Treatment Plant Filter System Improvements', 46297.29, 46371.58, 'Mayo, Taylor', 'taylor@example.org'],
  [144287, 'IFB 1100 AGM1008', 'Capacitor Banks', 46307.3, 46322.58, 'X', 'x@example.org']];
const au = M.parseAustinActive(austinRows);
assert.strictEqual(au.length, 2); assert.strictEqual(au[0].svc, true); assert.strictEqual(au[1].svc, false);
assert.strictEqual(au[0].date, '2026-12-15'); assert.ok(au[0].url.endsWith('sid=144005'));
assert.ok(!JSON.stringify(au).includes('example.org'), 'staff contact emails are not copied');
const ac = M.normAustinContracts([
  { doc_id: 'PA1', doc_dscr: '2023 TRANSPORTATION ENGINEERING SERVICES ROTATION LIST', cat_dscr: 'Professional Services', lgl_nm: 'BGE, INC', efbgn_dt: '2023-05-01T00:00:00.000Z', efend_dt: '2026-04-30T00:00:00.000Z', ma_prch_lmt_am: '30000000', so_doc_cd: 'RFQS', so_doc_id: 'ABC1' },
  { doc_id: 'PA1', doc_dscr: '2023 TRANSPORTATION ENGINEERING SERVICES ROTATION LIST', cat_dscr: 'Professional Services', lgl_nm: 'COBB FENDLEY', efend_dt: '2026-04-30T00:00:00.000Z' },
  { doc_id: 'GA2', doc_dscr: 'CHLORIDE', cat_dscr: 'Commodities (Goods)', lgl_nm: 'PENCCO' }]);
assert.strictEqual(ac.length, 1, 'one record per agreement, Professional Services only');
assert.ok(ac[0].extra.some((e) => /Vendors/.test(e[0]) && /BGE/.test(e[1]) && /COBB/.test(e[1]))); assert.strictEqual(ac[0].kind, 'contract'); assert.ok(/Awarded/.test(ac[0].status)); assert.strictEqual(ac[0].cost, 30000000);
const saHtml = '<table><tr><th>Description</th><th>Type</th><th>Department</th><th>Release</th><th>Blackout</th><th>Solicitation Deadline</th></tr>' +
  '<tr><td><a href="Content.aspx?id=6318&amp;page=Default">RFQ 2026-125 San Antonio Fire Department Facilities Assessment</a></td><td>Request for Qualifications</td><td>Capital Delivery Department</td><td>09/25/2026</td><td>N/A</td><td>10/27/2026</td></tr>' +
  '<tr><td><a href="Content.aspx?id=6246&amp;page=Default">Spay/Neuter Contract Veterinarians</a></td><td>Request for Applications</td><td>Animal Care Svcs</td><td>07/14/2026</td><td>N/A</td><td>08/25/2026Extended to 10/26/2026</td></tr>' +
  '<tr><td>1</td><td>2</td></tr></table>';
const sa = M.parseSanAntonio(saHtml);
assert.strictEqual(sa.length, 2); assert.strictEqual(sa[0].svc, true); assert.strictEqual(sa[1].svc, false); assert.strictEqual(sa[1].date, '2026-10-26', 'extended deadline is the last date');
assert.strictEqual(sa[0].url, 'https://webapp1.sanantonio.gov/BidContractOpps/Content.aspx?id=6318&page=Default');
// focus filter
const fr = [bf1, bf2, bf3, bf4, au[0], ac[0], { id: 'x', agency: 'TxDOT', src: 'txdot-pcl', kind: 'procurement', phase: 'procure', rel: 'none', title: 't' }, { id: 'y', agency: 'TxDOT', src: 'txdot-pi', kind: 'project', phase: 'design', rel: 'direct', title: 'drain' }];
const fids = (f) => M.filterRecords(fr, f, {}).map((r) => r.id).join(',');
assert.strictEqual(M.filterRecords(fr, { consult: true }, {}).length, 5, 'focus keeps qualification/engineering-RFP/Austin contract/PCL rows, drops construction and plain projects');
assert.ok(!/(^|,)y(,|$)/.test(fids({ consult: true })));
assert.strictEqual(M.filterRecords(fr, { consult: true, rel: 'direct' }, {}).length, 1, 'Direct narrows to the drainage-keyword consultant row');
assert.strictEqual(M.filterRecords(fr, { consult: true, eng: true }, {}).length, 3, 'engineering/drainage word match only (PCL row has none)');
assert.ok(M.filterRecords(fr, { rel: 'relevant' }, {}).some((r) => r.id === 'y'), 'without the focus the old behavior is unchanged');
assert.ok(M.inHoustonArea({ agency: 'Harris County' }) && !M.inHoustonArea({ agency: 'City of Austin' }));
const csvS = M.toCSV([bf1], [{ id: bf1.src, name: 'x' }]).trim().split('\r\n');
assert.ok(csvS[0].indexOf('consultant_focus') > 0 && csvS[1].indexOf('Open') > 0 && csvS[1].endsWith('yes'));

// ---- shipped data file
const data = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'opportunities.json'), 'utf8'));
assert.ok(!isNaN(Date.parse(data.generatedAt)), 'generatedAt');
assert.ok(data.records.length > 500, 'snapshot has real records');
const srcIds = {}; data.sources.forEach((s) => { srcIds[s.id] = s; assert.ok(['ok', 'stale', 'failed'].includes(s.status), 'status ' + s.id); assert.ok(s.name && s.page && s.type, 'source meta ' + s.id); });
const seen = {};
data.records.forEach((r) => {
  assert.ok(r.id && r.src && r.agency && r.title && r.phase && r.kind, 'required fields ' + r.id);
  assert.ok(!seen[r.id], 'unique id ' + r.id); seen[r.id] = 1;
  assert.ok(srcIds[r.src], 'known source ' + r.id);
  assert.ok(M.PHASES.some((p) => p.id === r.phase), 'known phase ' + r.id);
  assert.ok(/^https:\/\//.test(r.url), 'https url ' + r.id);
  if (r.lat !== undefined) assert.ok(r.lat > 25.5 && r.lat < 36.8 && r.lon > -106.8 && r.lon < -93.3, 'coords in Texas ' + r.id);
  if (r.date !== undefined) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.date), 'iso date ' + r.id);
  if (r.cost !== undefined) assert.ok(typeof r.cost === 'number' && r.cost > 0, 'cost positive ' + r.id);
  if (r.alat !== undefined) assert.ok(r.src === 'txdot-pi' && r.lat === undefined, 'approx only for TxDOT rows without coordinates ' + r.id);
  assert.ok(['direct', 'likely', 'none'].includes(r.rel), 'rel ' + r.id);
  if (r.rel !== 'none') assert.ok(r.why, 'relevance basis stated ' + r.id);
  if (r.rel === 'none') assert.ok(r.src === 'txdot-pcl' || r.kind === 'solicitation' || r.kind === 'contract', 'only the projected-contracts list and consultant solicitations keep rows without a drainage word');
  if (r.kind === 'solicitation' || r.kind === 'contract') { assert.ok(r.status && r.solType && r.dateLabel, 'status/type/date label given ' + r.id); assert.strictEqual(r.lat, undefined, 'solicitations are not mapped'); assert.ok(r.eng === undefined || Array.isArray(r.eng), 'eng match list ' + r.id); }
});
['txdot-pi', 'coh-cip', 'coh-swmb', 'hcfcd-maint', 'austin-active', 'austin-contracts', 'sa-bids', 'bonfire-harriscountytx'].forEach((s) => assert.ok(data.records.some((r) => r.src === s), 'has records from ' + s));
assert.ok(data.records.filter(M.isConsultant).length > 50, 'consultant-services focus is populated');

// ---- page wiring
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
['style.css', 'texas-geo.js', 'model.js', 'map.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png', '../home-btn.css'].forEach((f) => {
  assert.ok(html.includes(f), 'index.html references ' + f);
  assert.ok(fs.existsSync(path.join(dir, f)), 'file exists ' + f);
});
assert.ok(html.includes('width=device-width') && html.includes('href="../"'));
JSON.parse(fs.readFileSync(path.join(dir, 'manifest.webmanifest'), 'utf8')).icons.forEach((i) => assert.ok(fs.existsSync(path.join(dir, i.src)), 'manifest icon ' + i.src));
assert.ok(!/sample data|fake|dummy|lorem/i.test(fs.readFileSync(path.join(dir, 'app.js'), 'utf8').replace(/no sample data is substituted/g, '')), 'no sample data in the app');
// capture files on the watchlist (shared model: national/capture.js)
{
  const CP = require('../national/capture.js');
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.ok(html.indexOf('../national/capture.js') > 0 && html.indexOf('capture.js') < html.indexOf('app.js'), 'capture.js loads before app.js');
  assert.ok(fs.existsSync(path.join(dir, '..', 'national', 'capture.js')));
  ['capBar', 'btnCapCsv', 'btnBackup', 'btnRestore', 'btnRestoreAll', 'restoreFile'].forEach((id) => assert.ok(html.indexOf('id="' + id + '"') > 0, id));
  assert.ok(html.indexOf('value="due"') > 0 && html.indexOf('value="decision"') > 0, 'sort options');
  assert.ok(app.indexOf("'opportunityRadar.watch.v1'") > 0, 'existing watch key unchanged');
  // a backup from this page cannot be restored into the National Radar, and the reverse
  const bk = CP.makeBackup({ a: true }, { a: CP.clean({ notes: 'x' }) }, 'now', CP.OPP_BACKUP_APP);
  assert.ok(CP.parseBackup(JSON.stringify(bk), CP.OPP_BACKUP_APP).ok);
  assert.strictEqual(CP.parseBackup(JSON.stringify(bk)).ok, false, 'National Radar rejects an Texas Opportunity backup');
}
// Radar map is the default view on every load (not the List)
{
  const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const ih = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(/tab: 'radar'/.test(appSrc), 'initial state.tab is radar');
  assert.ok(/loadData\(\)\.then\(function \(d\) \{[^\n]*switchTab\('radar'\)/.test(appSrc), 'startup switches to the radar view');
  assert.ok(!/loadData\(\)\.then\(function \(d\) \{[^\n]*switchTab\('list'\)/.test(appSrc), 'startup must not jump to the List view');
  assert.ok(/<section id="v-radar" class="view"(?![^>]*hidden)/.test(ih) && /data-tab="radar" class="on"/.test(ih), 'radar view visible and its tab active in the HTML');
}

// ---- Intel (news and planning signals)
{
  const I = require('./intel.js');
  const fx = (f) => fs.readFileSync(path.join(dir, 'test-fixtures', f), 'utf8');
  const rss = I.parseFeed(fx('intel-feed.xml'));
  assert.strictEqual(rss.length, 4);
  assert.strictEqual(rss[0].title, 'Council approves $40 million drainage bond program for Sims Bayou & Brays', 'CDATA and entities decoded');
  assert.strictEqual(rss[0].date, '2026-10-26T14:00:00.000Z');
  assert.ok(rss[0].desc.indexOf('<') < 0 && rss[0].desc.indexOf('Pasadena') > 0, 'HTML stripped from the excerpt');
  const atom = I.parseFeed(fx('intel-atom.xml'));
  assert.strictEqual(atom[0].link, 'https://example.org/a/1'); assert.strictEqual(atom[0].date, '2026-10-20T12:00:00.000Z');
  assert.ok(I.snip('word '.repeat(200)).length <= I.SNIP, 'excerpt at most 280 chars');
  const src = { id: 'fx', name: 'Example City', region: 'Statewide' }, now = '2026-10-28T12:00:00.000Z';
  const built = rss.map((r) => I.build(r, src, now));
  const b0 = built[0];
  assert.ok(b0 && b0.topics.indexOf('bond') >= 0 && b0.topics.indexOf('flood') >= 0 && b0.topics.indexOf('agenda') >= 0, 'topics: bond, flood, agenda');
  assert.strictEqual(b0.place, 'Pasadena'); assert.strictEqual(b0.region, I.HOU); assert.strictEqual(b0.county, 'Harris');
  assert.ok(b0.why.indexOf('drainage') >= 0 && b0.why.indexOf('bond program') >= 0, 'why lists matched phrases');
  assert.ok(/Bond approved/.test(b0.hint), 'positioning hint for an approved bond');
  assert.strictEqual(built[2], null, 'fun run is not relevant'); assert.strictEqual(built[3], null, 'job posting is noise');
  const at = I.build(atom[0], src, now);
  assert.ok(at.topics.indexOf('grant') >= 0 && at.place === 'Fort Bend' && /Funding awarded/.test(at.hint));
  assert.strictEqual(I.classify({ title: 'Highway 6 drainage update', desc: '' }, {}).place, null, 'no place guessed');
  // dedupe near-identical headlines, keep the higher score, remember the duplicate link
  assert.ok(I.similar(rss[0].title, rss[1].title));
  assert.ok(!I.similar(rss[0].title, 'Council approves water main contract'));
  const dd = I.dedupe(built.filter(Boolean)); assert.strictEqual(dd.length, 1); assert.strictEqual(dd[0].also.length, 1);
  // Legistar normalization through the collector, noise filter
  const leg = JSON.parse(fx('intel-legistar.json'));
  const lsrc = { id: 'leg-x', name: 'X agenda items', kind: 'legistar', minScore: 3, topics: ['agenda'], place: 'Dallas', county: 'Dallas', region: 'Dallas–Fort Worth' };
  const lb = leg.map((m) => I.build({ title: m.MatterTitle, link: 'https://x.legistar.com/LegislationDetail.aspx?ID=' + m.MatterId, date: m.MatterIntroDate + 'Z', desc: m.MatterTypeName }, lsrc, now));
  assert.ok(lb[0] && /Engineering contract action/.test(lb[0].hint) && lb[0].region === 'Dallas–Fort Worth' && lb[0].place === 'Dallas');
  assert.strictEqual(lb[1], null, 'replat is dropped');
  // merge: keep 90 days, carry firstSeen, keep items of failed sources
  const old = Object.assign({}, b0, { id: 'old', srcId: 'gone', date: '2026-06-01T00:00:00.000Z' });
  const kept = Object.assign({}, b0, { id: 'k', srcId: 'failed', date: '2026-10-01T00:00:00.000Z' });
  const prev = { items: [Object.assign({}, b0, { firstSeen: '2026-10-27T00:00:00.000Z' }), old, kept] };
  const mg = I.mergePrev([Object.assign({}, b0)], prev, now, ['failed']);
  assert.strictEqual(mg.length, 2); assert.strictEqual(mg[0].firstSeen, '2026-10-27T00:00:00.000Z'); assert.ok(mg.some((m) => m.id === 'k')); assert.ok(!mg.some((m) => m.id === 'old'), '>90 days dropped');
  // stored data file shape
  const ij = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'intel.json'), 'utf8'));
  assert.ok(Array.isArray(ij.items) && ij.sources && Array.isArray(ij.sources.sources));
  ij.items.forEach((it) => { assert.ok(it.id && it.title && /^https:\/\//.test(it.link) && it.source, 'item fields'); assert.ok((it.desc || '').length <= I.SNIP, 'short excerpt only'); assert.ok(Array.isArray(it.topics) && it.region); });
  const BI = require('../scripts/build-intel.js');
  assert.ok(BI.SOURCES.every((s) => !/api[_-]?key|token=/i.test(s.url || '')), 'no keyed sources');
  const wf = fs.readFileSync(path.join(dir, '..', '.github', 'workflows', 'refresh-opportunities.yml'), 'utf8');
  assert.ok(/continue-on-error: true\s+timeout-minutes: \d+\s+run: node scripts\/build-intel\.js/.test(wf), 'intel step cannot fail the job');
}

// Intel tab wiring: same-site data only, radar stays the default, own storage keys
{
  const ih = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), ui = fs.readFileSync(path.join(dir, 'intel-ui.js'), 'utf8'), appSrc = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.ok(/data-tab="intel"/.test(ih) && /id="v-intel" class="view" hidden/.test(ih) && /id="intelBadge"/.test(ih) && /id="srcIntel"/.test(ih));
  assert.ok(/not solicitations/.test(ih) && /not verified/.test(ih), 'disclaimer present');
  assert.ok(ih.indexOf('src="intel.js"') > ih.indexOf('src="app.js"') && ih.indexOf('src="intel-ui.js"') > ih.indexOf('src="intel.js"'));
  assert.ok(!/fetch\(\s*['"]https?:/.test(ui), 'no external requests from the browser'); assert.ok(/fetch\('data\/intel\.json'/.test(ui));
  ['opportunityRadar.intelWatch.v1', 'opportunityRadar.intelRead.v1', 'opportunityRadar.intelSeen.v1'].forEach((k) => assert.ok(ui.indexOf(k) > 0, k));
  assert.ok(/'intel', 'sources'\]\.forEach/.test(appSrc));
  assert.ok(!/github|repository/i.test(ih + ui), 'no repo mentions on the page');
}

// Intel links: stable, unescaped, no tracking parameters
{
  const I = require('./intel.js');
  assert.strictEqual(I.fixLink('https://x.legistar.com/LegislationDetail.aspx?ID=8298628&amp;GUID=8BADC855'), 'https://x.legistar.com/LegislationDetail.aspx?ID=8298628&GUID=8BADC855', 'entities decoded; Legistar ids are resolved by the collector, not rewritten');
  assert.strictEqual(I.legistarLink('plano', 1908), 'https://plano.legistar.com/Gateway.aspx?M=L&ID=1908');
  assert.strictEqual(I.fixLink('https://www.example.gov/CivicAlerts.aspx?AID=12&amp;utm_source=rss&fbclid=x#top'), 'https://www.example.gov/CivicAlerts.aspx?AID=12');
  assert.strictEqual(I.fixLink('javascript:alert(1)'), null); assert.strictEqual(I.fixLink('not a url'), null);
  const LL = require('../scripts/legistar-links.js');
  assert.deepStrictEqual(LL.parse('https://HarrisCountyTX.legistar.com/Gateway.aspx?M=L&ID=49248'), { client: 'harriscountytx', path: '/gateway.aspx', id: '49248', guid: null });
  assert.strictEqual(LL.fallback('plano'), 'https://plano.legistar.com/Legislation.aspx'); assert.ok(/iPhone/.test(LL.SAFARI)); assert.ok(LL.INVALID.test('Invalid parameters!'));
  const cache = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'legistar-links.json'), 'utf8'));
  Object.keys(cache.links).forEach((k) => assert.ok(/^[a-z0-9-]+\|\d+$/.test(k) && /^https:\/\/[a-z0-9-]+\.legistar\.com\/LegislationDetail\.aspx\?ID=\d+&GUID=[0-9A-F-]+$/i.test(cache.links[k]), 'verified link ' + k));
  const siteLinks = new Set(Object.values(cache.links));
  const ij = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'intel.json'), 'utf8'));
  ij.items.forEach((it) => { assert.strictEqual(I.fixLink(it.link), it.link, 'stored link is normalized: ' + it.link); assert.ok(!/&amp;/.test(it.link)); if (/legistar\.com/.test(it.link)) assert.ok(siteLinks.has(it.link) || /Legislation\.aspx$/.test(it.link), 'Legistar link is a verified site link or the labelled search page: ' + it.link); });
  fs.readdirSync(path.join(dir, 'data', 'newsletters')).filter((f) => /W\d\d\.json$/.test(f)).forEach((f) => { const t = fs.readFileSync(path.join(dir, 'data', 'newsletters', f), 'utf8'); (t.match(/https:\/\/[a-z0-9-]+\.legistar\.com\/[^"]+/g) || []).forEach((u) => assert.ok(siteLinks.has(u) || /Legislation\.aspx$/.test(u), f + ' has an unverified Legistar link ' + u)); });
}
// Intel HTML-page parsers (sites without feeds)
{
  const I = require('./intel.js'), fx = (f) => fs.readFileSync(path.join(dir, 'test-fixtures', f), 'utf8');
  const tx = I.parseTxdotList(fx('intel-txdot.html.txt'), 'https://www.txdot.gov/about/newsroom/local/houston.html', '/about/newsroom/local/houston/');
  assert.strictEqual(tx.length, 2, 'duplicate links and nav links dropped');
  assert.strictEqual(tx[0].link, 'https://www.txdot.gov/about/newsroom/local/houston/new-bridge-to-honor-houston-teen.html'); assert.strictEqual(tx[0].date, '2026-09-17T12:00:00.000Z'); assert.strictEqual(tx[1].date, '2026-10-02T12:00:00.000Z');
  const dr = I.parseDrupalViews(fx('intel-drupal.html.txt'), 'https://www.fortbendcountytx.gov/your-county/news', '/your-county/news/');
  assert.strictEqual(dr.length, 2); assert.strictEqual(dr[0].date, '2026-09-24T12:00:00.000Z'); assert.strictEqual(dr[0].desc, '', '"Download ..." is not an excerpt'); assert.ok(/channel/.test(dr[1].desc));
  assert.ok(I.build(dr[0], { id: 'fb', name: 'FB', minScore: 1, place: 'Fort Bend', region: I.HOU }, '2026-10-28T00:00:00Z'), 'county adopted budget kept');
  const cip = I.parseHoustonCip(fx('intel-houcip.html.txt'), 'https://www.houstontx.gov/cip/');
  assert.strictEqual(cip.length, 1); assert.ok(/2027-2031/.test(cip[0].title)); assert.strictEqual(cip[0].link, 'https://www.houstontx.gov/cip/27cipadopt/index.html'); assert.strictEqual(cip[0].date, null, 'no date invented');
  assert.strictEqual(I.build({ title: 'Receive and file September Personal Bond/Collections Monthly Report', link: 'https://x', desc: '' }, { id: 'g', name: 'g', minScore: 0 }, '2026-10-28T00:00:00Z'), null, 'bail bonds are not bond programs');
}

// Weekly newsletter (deterministic)
{
  const N = require('./newsletter.js');
  assert.strictEqual(N.isoWeek('2026-10-30T12:00:00Z'), '2026-W44'); assert.strictEqual(N.weekStart('2026-W44'), '2026-10-26T00:00:00.000Z');
  assert.strictEqual(N.isoWeek('2027-01-01T00:00:00Z'), '2026-W53', 'ISO year boundary'); assert.strictEqual(N.isoWeek('2021-01-03T00:00:00Z'), '2020-W53'); assert.strictEqual(N.addWeeks('2026-W01', -1), '2025-W52');
  const mk = (id, o) => Object.assign({ id, srcId: 's', source: 'Src ' + id, title: 'Item ' + id, link: 'https://example.org/' + id, date: '2026-10-27T12:00:00.000Z', firstSeen: '2026-10-28T00:00:00.000Z', desc: '', topics: ['flood'], place: null, region: 'Statewide', score: 5, why: ['drainage'], hint: 'h' }, o);
  const items = [
    mk('a', { region: 'Houston region', place: 'Pasadena', topics: ['bond', 'flood'], score: 9 }), mk('b', { region: 'Houston region', topics: ['agenda'], score: 3 }),
    mk('c', { region: 'Dallas–Fort Worth', topics: ['grant'], score: 7, desc: 'FEMA · posted · closes 02/26/2027' }), mk('d', { topics: ['road'], score: 2, desc: 'Bond Election to be held on November 3, 2026, for streets; period ended 9/1/2025' }),
    mk('old', { date: '2026-10-10T12:00:00.000Z', firstSeen: '2026-10-10T12:00:00.000Z' }), mk('fut', { date: '2026-12-01T00:00:00.000Z', firstSeen: '2026-10-29T00:00:00.000Z' })
  ];
  const n = N.build(items, '2026-W44', { generatedAt: '2026-10-30T12:00:00.000Z', final: false });
  assert.deepStrictEqual(n.counts, { items: 5, houston: 2, other: 3 }, 'old week excluded; a future meeting date uses first-seen week');
  assert.strictEqual(n.houston[0].topic, 'bond', 'Houston first, grouped in the fixed topic order (bond before council action)'); assert.strictEqual(n.houston[0].items[0].id, 'a');
  assert.deepStrictEqual(n.texas.map((g) => g.topic), ['grant', 'flood', 'road']);
  assert.deepStrictEqual(n.deadlines.map((d) => d.date), ['2026-11-03', '2027-02-26'], 'only future dates with a cue word');
  assert.ok(/closes 02\/26\/2027/.test(n.deadlines[1].what));
  assert.deepStrictEqual(N.build(items, '2026-W44', { generatedAt: '2026-10-30T12:00:00.000Z' }), N.build(items.slice().reverse(), '2026-W44', { generatedAt: '2026-10-30T12:00:00.000Z' }), 'order of input does not matter');
  const txt = N.toText(n), html = N.toHtml(n);
  assert.ok(txt.indexOf('== Houston region ==') < txt.indexOf('== Rest of Texas') && /Deadlines & dates to watch/.test(txt) && txt.indexOf('https://example.org/a') > 0);
  assert.ok(/^<!doctype html>/.test(html) && !/<script|<img|class=/.test(html) && html.indexOf('href="https://example.org/a"') > 0, 'email HTML: inline styles, no scripts or images');
  const allLinks = (txt.match(/https:\/\/\S+/g) || []).every((u) => items.some((i) => i.link === u)); assert.ok(allLinks, 'no links that are not collected items');
  const empty = N.build(items, '2026-W30', {}); assert.strictEqual(empty.counts.items, 0); assert.ok(/No items were collected/.test(N.toText(empty)));
  const pl = N.plan('2026-11-02T10:17:00.000Z'); assert.strictEqual(pl.length, 12); assert.deepStrictEqual(pl.slice(0, 2), [{ week: '2026-W45', final: false }, { week: '2026-W44', final: true }], 'the Monday run finalizes last week');
  const ix = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'newsletters', 'index.json'), 'utf8'));
  assert.ok(ix.weeks.length <= 12 && ix.weeks.every((w) => fs.existsSync(path.join(dir, 'data', 'newsletters', w.week + '.json'))));
  assert.ok(fs.readdirSync(path.join(dir, 'data', 'newsletters')).filter((f) => /W\d\d\.json$/.test(f)).length <= 12, 'kept 12 weeks');
}

// Newsletter view wiring
{
  const ih = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), ui = fs.readFileSync(path.join(dir, 'intel-ui.js'), 'utf8');
  assert.ok(/data-imode="news"/.test(ih) && /id="nlWeek"/.test(ih) && /id="nlPaper"/.test(ih));
  ['copytext', 'copyhtml', 'print', 'html', 'txt', 'share'].forEach((a) => assert.ok(ih.indexOf('data-nl="' + a + '"') > 0, a));
  assert.ok(ih.indexOf('src="newsletter.js"') > ih.indexOf('src="intel.js"') && ih.indexOf('src="newsletter.js"') < ih.indexOf('src="intel-ui.js"'));
  assert.ok(/fetch\('data\/newsletters\/index\.json'/.test(ui) && !/fetch\(\s*['"]https?:/.test(ui));
  assert.ok(!/mailto:|sendMail/i.test(ui), 'no email sending');
}

// Newsletter editorial design: same table/inline markup for page (dark) and email (light), readable contrast
{
  const N = require('./newsletter.js'), n = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'newsletters', JSON.parse(fs.readFileSync(path.join(dir, 'data', 'newsletters', 'index.json'), 'utf8')).weeks.find((w) => w.items).week + '.json'), 'utf8'));
  const light = N.toHtml(n), dark = N.toHtml(n, { fragment: true, theme: 'dark', icons: true });
  ['Texas Intel Weekly', 'Issue No. ', 'By the numbers', 'Top story', 'Topic mix'].forEach((t) => assert.ok(light.indexOf(t) > 0 && dark.indexOf(t) > 0, t));
  assert.ok(/role="presentation"/.test(light) && !/<style|<link|<script|<img|class=|<svg/.test(light), 'email: tables + inline styles, no SVG/CSS/images');
  assert.ok(/<svg/.test(dark) && !/<script/.test(dark), 'page version may use inline SVG icons');
  assert.ok(!/https?:\/\/(?!([a-z0-9-]+\.)+[a-z]+\/)/.test(light.replace(/href="[^"]+"/g, '')), 'no external assets');
  const hrefs = (light.match(/href="([^"]+)"/g) || []).map((h) => h.slice(6, -1).replace(/&amp;/g, '&'));
  const known = new Set([].concat(...n.houston.map((g) => g.items), ...n.texas.map((g) => g.items), n.deadlines).map((e) => e.link)); assert.ok(hrefs.every((h) => known.has(h)), 'only links to collected items');
  const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const C = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  ['light', 'dark'].forEach((th) => { const P = N.palette(th); [[P.ink, P.paper], [P.ink, P.card], [P.dim, P.card], [P.dim, P.paper], [P.brand, P.card], [P.head, P.card], [P.warnInk, P.warnBg], [P.brand, P.quote]].concat(Object.keys(P.acc).map((t) => [P.acc[t], P.paper])).forEach((pr) => assert.ok(C(pr[0], pr[1]) >= 4.5, th + ' contrast ' + pr.join(' on ') + ' = ' + C(pr[0], pr[1]).toFixed(2))); assert.ok(C('#ffffff', P.warnBd) >= 4.5, 'calendar month label'); });
  ['#6d28d9', '#a16207', '#047857', '#0369a1', '#0e7490', '#c2410c', '#be185d', '#475569'].forEach((c) => assert.ok(C('#ffffff', c) >= 4.5, 'badge ' + c));
  const txt = N.toText(n); assert.ok(/^TEXAS INTEL WEEKLY · Issue No\. \d+/.test(txt) && /BY THE NUMBERS/.test(txt) && /TOP STORY/.test(txt));
  assert.ok(n.stats && typeof n.stats.items === 'number', 'issues carry By-the-numbers counts');
}
// Magazine PDF: deterministic plan/contents/desk note, only collected links, readable colors, self-contained
{
  const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const C = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const M = require('./magazine.js'), nd = path.join(dir, 'data', 'newsletters'), idx = JSON.parse(fs.readFileSync(path.join(nd, 'index.json'), 'utf8'));
  const css = fs.readFileSync(path.join(dir, 'magazine.css'), 'utf8');
  idx.weeks.filter((w) => w.items).forEach((w) => {
    const n = JSON.parse(fs.readFileSync(path.join(nd, w.week + '.json'), 'utf8'));
    const a = M.build(n), b = M.build(JSON.parse(JSON.stringify(n))); assert.strictEqual(a, b, w.week + ' build is deterministic');
    const pl = M.plan(n); assert.deepStrictEqual(pl.sections.map((s) => s.letter), pl.sections.map((s, i) => String.fromCharCode(65 + i)), 'sections lettered A..');
    assert.strictEqual(pl.sections[0].key, 'feature'); assert.ok(pl.cover.length >= 1 && pl.cover.length <= 4, 'cover lines');
    pl.sections.forEach((s) => { assert.ok(a.includes('id="' + s.anchor + '"'), 'contents target ' + s.anchor); assert.ok(a.includes('href="#' + s.anchor + '"'), 'contents link ' + s.anchor); });
    const known = new Set([].concat(...n.houston.map((g) => g.items), ...n.texas.map((g) => g.items), n.deadlines).map((e) => e.link));
    (a.match(/href="([^"#][^"]*)"/g) || []).map((h) => h.slice(6, -1).replace(/&amp;/g, '&')).forEach((h) => assert.ok(known.has(h), 'magazine links only to collected items: ' + h));
    assert.ok(/class="mz-cover/.test(a) && /class="mz-back/.test(a) && /not solicitations/i.test(a), 'cover + back cover + disclaimer');
    const d1 = M.desk(n, pl).join(' '); assert.strictEqual(d1, M.desk(n, M.plan(n)).join(' ')); assert.ok(d1.includes(String(n.stats ? n.stats.items : '')), 'desk note uses real counts');
    if (!(n.final)) assert.ok(/DRAFT|Draft/.test(a), 'draft issue is marked');
    const doc = M.toDoc(n, css); assert.ok(!/<script|<link|@import|url\(\s*['"]?https?:|github|repositor/i.test(doc), 'standalone doc: no scripts, external assets or repo mentions');
  });
  Object.keys(M.COLOR).forEach((k) => assert.ok(C('#ffffff', M.COLOR[k]) >= 4.5, 'magazine color on white ' + k + ' ' + C('#ffffff', M.COLOR[k]).toFixed(2)));
  assert.ok(C('#ffffff', '#0b2722') >= 4.5 && C('#ffffff', '#0f766e') >= 4.5 && C('#facc15', '#0b3b35') >= 4.5, 'cover text contrast');
  assert.ok(/print-color-adjust:\s*exact/.test(css) && /break-inside:\s*avoid/.test(css) && !/@import|https?:/.test(css), 'print css');
}
// Newsletter PDFs: re-render only changed issues, prune with retention, size cap keeps the newest two
{
  const P = require('../scripts/newsletter-pdf-lib.js');
  const j = (o) => JSON.stringify(o);
  assert.strictEqual(P.hash(P.stable(j({ a: 1, generatedAt: 'x' })), 'm', 'c'), P.hash(P.stable(j({ a: 1, generatedAt: 'y' })), 'm', 'c'), 'rebuild stamp ignored');
  assert.notStrictEqual(P.hash(P.stable(j({ a: 1 })), 'm', 'c'), P.hash(P.stable(j({ a: 2 })), 'm', 'c'), 'content change re-renders');
  assert.notStrictEqual(P.hash('x', 'm1', 'c'), P.hash('x', 'm2', 'c'), 'layout change re-renders');
  const weeks = [{ week: 'W3' }, { week: 'W2' }, { week: 'W1' }];
  const r = P.plan(weeks, { W3: 'n', W2: 'b', W1: 'a' }, { issues: [{ week: 'W2', hash: 'b' }, { week: 'W1', hash: 'old' }, { week: 'W0', hash: 'z' }] });
  assert.deepStrictEqual(r, { render: ['W3', 'W1'], prune: ['W0'] });
  assert.deepStrictEqual(P.plan(weeks, { W3: 1, W2: 1, W1: 1 }, null).render, ['W3', 'W2', 'W1'], 'first run renders all');
  const c = P.cap([{ week: 'a', bytes: 5 }, { week: 'b', bytes: 5 }, { week: 'c', bytes: 5 }, { week: 'd', bytes: 5 }], 11);
  assert.deepStrictEqual([c.entries.map((e) => e.week), c.dropped, c.total], [['a', 'b'], ['d', 'c'], 10]);
  assert.strictEqual(P.cap([{ week: 'a', bytes: 50 }, { week: 'b', bytes: 50 }], 10).entries.length, 2, 'never drops the newest two');
}
console.log('ok ' + data.records.length + ' records, ' + data.sources.length + ' sources');
