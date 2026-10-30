// EPA State Revolving Fund public portal (CWSRF + DWSRF project layers, ArcGIS REST, no key). Normalizer is pure and tested.
// The agreement amount is SRF financial assistance to the borrower, NOT a consultant fee, so it is never put in amounts.
(function (root) {
  var BASE = 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/';
  var LAYERS = { cw: BASE + 'CWSRF_Projects_County_and_PR_Centroids/FeatureServer/0', dw: BASE + 'DW_AA_PubPortal_2022_Merge_All_Centroid/FeatureServer/0' };
  var PAGE = 'https://www.epa.gov/cwsrf/state-revolving-fund-public-portal';
  var STATES = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Puerto Rico': 'PR', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY' };
  var DESIGN_RE = /\b(?:planning|design|engineering|feasibility|study|studies|master plan|preliminary engineering|facility plan|hydraulic model|asset management plan|PER\b)/i;
  var clean = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  var day = function (ms) { return typeof ms === 'number' ? new Date(ms).toISOString().slice(0, 10) : null; };
  var money = function (v) { return '$' + Math.round(v).toLocaleString('en-US'); };
  function where(sinceIso, asOf) { return "INIT_AGREE_DATE>=DATE '" + sinceIso + "' AND (P_END IS NULL OR P_END>=DATE '" + asOf + "')"; }
  function normSrf(a, kind, asOf) {
    var title = clean(a.PROJECT_NAME), desc = clean(a.P_DESCRIPTION), id = clean(a.EPA_TRACKING_NO || a.OBJECTID); if (!title || !id) return null;
    var st = STATES[clean(a.STATE_NAME)] || null, start = day(a.P_START), agree = day(a.INIT_AGREE_DATE || a.AGREEMENT_DATE), text = title + ' ' + desc;
    var design = DESIGN_RE.test(text), future = !!start && start >= asOf;
    if (!design && !future) return null; // construction already under way with no planning / design scope: out
    var prog = kind === 'cw' ? 'Clean Water SRF' : 'Drinking Water SRF', borrower = clean(a.BORROWER_NAME || a.PWS_NAME), amt = typeof a.AGREE_AMT === 'number' && a.AGREE_AMT > 0 ? a.AGREE_AMT : null;
        return { src: 'srf-' + kind, srcId: id, url: LAYERS[kind] + '/query?where=' + encodeURIComponent("EPA_TRACKING_NO='" + id + "'") + '&outFields=*&returnGeometry=false&f=json', title: title, desc: desc + (kind === 'cw' ? ' (Clean Water SRF: wastewater / stormwater project)' : ' (Drinking Water SRF: drinking water project)'),
      agency: borrower || prog, subagency: prog + ' borrower', state: st, city: clean(a.CITY) || null, naics: '', psc: '', advance: true, projectList: true, designStated: design, status: 'upcoming',
      noticeType: 'SRF-funded project (forecast: the borrower procures design / engineering)', noticeLabel: 'EPA ' + prog + ' public portal',
      engOverride: design ? { level: 'strong', why: 'The SRF project description names planning / design / engineering work' } : { level: 'weak', why: 'SRF-funded project that has not started yet; the consultant role is not stated' },
      amounts: [], dates: { est: future ? start : null, estLabel: 'Project start (SRF)', posted: agree },
      fields: { 'SRF program': prog, 'EPA tracking no.': id, 'State loan no.': clean(a.STATE_LOAN_NUMBER), 'Borrower': borrower, 'County': clean(a.COUNTY || a.COUNTY_SERVED), 'Agreement date': agree, 'Project start': start, 'Need category': clean(a.P_NEED_CAT), 'SRF assistance (not a fee)': amt ? money(amt) : null } };
  }
  var api = { LAYERS: LAYERS, PAGE: PAGE, STATES: STATES, where: where, normSrf: normSrf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SRF = api;
})(this);
