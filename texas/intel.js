/* Texas Opportunity: Intel (news and planning signals). Pure functions for the daily collector and the browser (no network here).
   Items are signals, not solicitations: title, source, link, date, a short excerpt (<= 280 chars) and deterministic tags. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.TXIntel = factory(); })(this, function () {
  'use strict';
  var KEEP_DAYS = 90, SNIP = 280;
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };
  function decode(s) { return String(s == null ? '' : s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, e) { if (e[0] === '#') { var n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; } return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m; }); }
  function text(s) { return decode(String(s == null ? '' : s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&(#\d+|[a-z]+);/gi, function (m) { return decode(m); }).replace(/\s+/g, ' ').trim(); }
  function snip(s, n) { s = text(s); n = n || SNIP; if (s.length <= n) return s; var c = s.slice(0, n - 1), i = c.lastIndexOf(' '); return (i > n * 0.6 ? c.slice(0, i) : c) + '…'; }
  function tag(block, name) { var m = new RegExp('<(?:[a-z]+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-z]+:)?' + name + '>', 'i').exec(block); return m ? m[1] : ''; }
  function isoDate(s) { if (!s) return null; var d = new Date(text(s)); return isNaN(d) ? null : d.toISOString(); }
  // RSS 2.0 <item> and Atom <entry>
  function parseFeed(xml) {
    var out = [], re = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, m;
    while ((m = re.exec(String(xml || '')))) {
      var b = m[2], link = text(tag(b, 'link'));
      if (!link) { var al = /<link[^>]*href="([^"]+)"/i.exec(b); link = al ? decode(al[1]) : ''; }
      var t = text(tag(b, 'title')); if (!t || !/^https?:\/\//.test(link)) continue;
      out.push({ title: t, link: link.trim(), date: isoDate(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'date')), desc: snip(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')) });
    }
    return out;
  }
  // ---- deterministic classification
  var TOPICS = [
    { id: 'budget', label: 'Budget / CIP', re: /\b(budget|capital improvement|\bCIP\b|capital program|capital plan|fiscal year 20\d\d|FY ?\d{2}|tax rate|appropriat\w+)/i },
    { id: 'bond', label: 'Bond program', re: /\b(bonds?\b|bond (election|program|proposition)|proposition [a-z]\b|voters? approv\w+|certificates of obligation)/i },
    { id: 'grant', label: 'Grant / funding', re: /\b(grant|funding|funds?\b|award(ed)? \$|\bBRIC\b|\bHMGP\b|hazard mitigation|\bFIF\b|\bSWIFT\b|flood infrastructure fund|CDBG|loan|revolving fund|appropriation|federal aid)/i },
    { id: 'flood', label: 'Flood / drainage program', re: /\b(flood\w*|drainage|storm ?water|detention|culvert|storm sewer|channel|bayou|levee|watershed|inundation|resilien\w+|mitigation)/i },
    { id: 'water', label: 'Water / wastewater', re: /\b(water (main|line|plant|treatment|supply|system|utilit\w+|infrastructure)|wastewater|sewer|lift station|utility|utilities|reservoir|desalination|water conservation)/i },
    { id: 'road', label: 'Roadway / TxDOT', re: /\b(TxDOT|roadway|road|street|highway|freeway|interstate|\bI-\d+|\bSH \d+|\bUS \d+|\bFM \d+|bridge|intersection|mobility|\bUTP\b|unified transportation program|paving|reconstruction)/i },
    { id: 'agenda', label: 'Council / agenda action', re: /\b(council|commissioners'? court|agenda|resolution|ordinance|approv\w+ (an? )?(contract|agreement)|interlocal|professional services agreement|task order|amendment no\.?)/i },
    { id: 'policy', label: 'New program / policy', re: /\b(new program|launch\w*|pilot|master plan|strategic plan|study|plan update|regional plan|policy|rule ?making|proposed rule|notice of funding|NOFO)/i }
  ];
  var KW = [ // phrase, weight
    ['drainage', 3], ['stormwater', 3], ['storm water', 3], ['storm sewer', 3], ['flood control', 3], ['flood mitigation', 3], ['flood', 2], ['detention', 2], ['culvert', 3], ['channel', 1], ['bayou', 2], ['watershed', 2],
    ['hec-ras', 3], ['hec-hms', 3], ['h&h', 3], ['hydraulic', 2], ['hydrolog', 2], ['engineering services', 3], ['professional services', 2], ['design services', 3], ['engineering', 1], ['design', 1],
    ['capital improvement', 3], ['cip', 2], ['bond', 2], ['bond program', 3], ['budget', 1], ['grant', 1], ['hmgp', 3], ['bric', 3], ['hazard mitigation', 3], ['flood infrastructure fund', 3], ['swift', 2], ['cdbg', 2], ['cdbg-mit', 3], ['cdbg-dr', 3],
    ['wastewater', 2], ['water main', 2], ['water line', 2], ['sewer', 2], ['lift station', 2], ['water treatment', 2], ['utility', 1], ['txdot', 2], ['unified transportation program', 3], ['utp', 2], ['roadway', 1], ['street reconstruction', 2], ['bridge', 1],
    ['rfq', 3], ['request for qualifications', 3], ['task order', 2], ['interlocal', 1], ['master plan', 2], ['resilience', 1], ['harris county flood control', 3], ['houston public works', 2]
  ];
  var INFRA = /\b(drainage|storm ?water|storm sewer|flood\w*|detention|culvert|channel|bayou|levee|watershed|water|wastewater|sewer|lift station|utilit\w+|road\w*|street|highway|bridge|TxDOT|mobility|paving|infrastructure|capital improvement|CIP|engineering|bond)/i;
  // places: [name, county, region]
  var HOU = 'Houston region';
  var PLACES = [
    ['Houston', 'Harris', HOU], ['Harris County', 'Harris', HOU], ['Pasadena', 'Harris', HOU], ['Baytown', 'Harris', HOU], ['Bellaire', 'Harris', HOU], ['West University Place', 'Harris', HOU], ['Tomball', 'Harris', HOU], ['Humble', 'Harris', HOU], ['Deer Park', 'Harris', HOU], ['La Porte', 'Harris', HOU], ['Webster', 'Harris', HOU], ['Katy', 'Harris', HOU], ['Seabrook', 'Harris', HOU], ['Jersey Village', 'Harris', HOU],
    ['Fort Bend', 'Fort Bend', HOU], ['Sugar Land', 'Fort Bend', HOU], ['Missouri City', 'Fort Bend', HOU], ['Rosenberg', 'Fort Bend', HOU], ['Richmond', 'Fort Bend', HOU], ['Montgomery County', 'Montgomery', HOU], ['Conroe', 'Montgomery', HOU], ['The Woodlands', 'Montgomery', HOU],
    ['Galveston', 'Galveston', HOU], ['League City', 'Galveston', HOU], ['Texas City', 'Galveston', HOU], ['Friendswood', 'Galveston', HOU], ['Dickinson', 'Galveston', HOU], ['Kemah', 'Galveston', HOU], ['Brazoria', 'Brazoria', HOU], ['Pearland', 'Brazoria', HOU], ['Angleton', 'Brazoria', HOU], ['Lake Jackson', 'Brazoria', HOU], ['Waller County', 'Waller', HOU], ['Liberty County', 'Liberty', HOU], ['Chambers County', 'Chambers', HOU],
    ['Dallas', 'Dallas', 'Dallas–Fort Worth'], ['Fort Worth', 'Tarrant', 'Dallas–Fort Worth'], ['Tarrant County', 'Tarrant', 'Dallas–Fort Worth'], ['Plano', 'Collin', 'Dallas–Fort Worth'], ['Frisco', 'Collin', 'Dallas–Fort Worth'], ['McKinney', 'Collin', 'Dallas–Fort Worth'], ['Garland', 'Dallas', 'Dallas–Fort Worth'], ['Arlington', 'Tarrant', 'Dallas–Fort Worth'], ['Mansfield', 'Tarrant', 'Dallas–Fort Worth'], ['Irving', 'Dallas', 'Dallas–Fort Worth'], ['Denton', 'Denton', 'Dallas–Fort Worth'],
    ['Austin', 'Travis', 'Central Texas'], ['Travis County', 'Travis', 'Central Texas'], ['Round Rock', 'Williamson', 'Central Texas'], ['Georgetown', 'Williamson', 'Central Texas'], ['San Marcos', 'Hays', 'Central Texas'], ['New Braunfels', 'Comal', 'Central Texas'],
    ['San Antonio', 'Bexar', 'San Antonio'], ['Bexar County', 'Bexar', 'San Antonio'], ['Corpus Christi', 'Nueces', 'Coastal Bend'], ['Nueces County', 'Nueces', 'Coastal Bend'], ['Beaumont', 'Jefferson', 'Southeast Texas'], ['Port Arthur', 'Jefferson', 'Southeast Texas'], ['Jefferson County', 'Jefferson', 'Southeast Texas'],
    ['El Paso', 'El Paso', 'West Texas'], ['Lubbock', 'Lubbock', 'West Texas'], ['Midland', 'Midland', 'West Texas'], ['Brownsville', 'Cameron', 'Rio Grande Valley'], ['McAllen', 'Hidalgo', 'Rio Grande Valley'], ['Hidalgo County', 'Hidalgo', 'Rio Grande Valley'], ['Laredo', 'Webb', 'Rio Grande Valley']
  ].map(function (p) { return { name: p[0], county: p[1], region: p[2], re: new RegExp('\\b' + p[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i') }; });
  var REGIONS = [HOU, 'Dallas–Fort Worth', 'Central Texas', 'San Antonio', 'Coastal Bend', 'Southeast Texas', 'West Texas', 'Rio Grande Valley', 'Statewide', 'Federal / national'];
  var HINTS = [
    [/\b(bond|proposition)\b[\s\S]{0,80}\b(pass\w*|approv\w+|adopt\w*|authoriz\w+)|\bvoters? approv\w+/i, 'Bond approved: design contracts usually follow; watch for RFQs for the listed projects.'],
    [/\b(capital improvement|\bCIP\b|capital program)\b[\s\S]{0,80}\b(adopt\w*|approv\w+|propos\w+|budget)/i, 'CIP / budget line: projects in a new CIP usually go to design procurement within 6–18 months.'],
    [/\b(award\w*|receiv\w+|approv\w+|announc\w+)\b[\s\S]{0,60}\b(grant|funding|HMGP|BRIC|FIF|CDBG)/i, 'Funding awarded: the recipient will likely procure engineering for the funded project.'],
    [/\b(RFQ|request for qualifications|request for proposals|RFP)\b/i, 'Mentions an RFQ / RFP: check the agency procurement page for the formal notice.'],
    [/\b(master plan|drainage study|watershed study|feasibility study|plan update)\b/i, 'Planning study: follow-on design phases often go to consultants.'],
    [/\b(disaster declaration|major disaster)\b/i, 'Disaster declaration: HMGP mitigation funding typically opens 6–12 months later.'],
    [/\b(professional services agreement|engineering services|task order|interlocal)\b/i, 'Engineering contract action: shows who is buying and the scope; teaming or subconsulting may follow.']
  ];
  var TOPIC_HINT = {
    flood: 'Flood / drainage signal: note the project or watershed and watch the owner for H&H or design procurement.',
    bond: 'Bond signal: bond-funded projects move to design; track the project list.',
    budget: 'Budget / CIP signal: check the adopted CIP for drainage and utility lines and their design years.',
    grant: 'Funding signal: grant-funded work often needs engineering for applications, BCA or design.',
    water: 'Water / wastewater signal: utility capital work often needs design and permitting support.',
    road: 'Roadway signal: drainage and utility relocations ride along with road projects.',
    agenda: 'Agenda action: read the item for scope, consultant and amount, and who the owner is buying from.',
    policy: 'Program / policy signal: new rules or programs can create study and compliance work.'
  };
  var NOISE = /\b(replat|re-plat|plat\b|subdivision plat|zoning case|SUSU\d|SURW\d|SUPA\d|job|jobs|positions?\b|hiring|now hiring|bill discounts?|newsletter|5K|fun run)/i;
  function lc(s) { return String(s || '').toLowerCase(); }
  function classify(it, src) {
    var hay = it.title + ' \u0001 ' + (it.desc || ''), l = lc(hay), why = [], score = 0;
    KW.forEach(function (k) { var re = new RegExp('(^|[^a-z])' + k[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (k[0].length <= 4 ? '([^a-z]|$)' : ''), 'i'); if (re.test(l)) { score += k[1] * (re.test(lc(it.title)) ? 2 : 1); why.push(k[0]); } });
    var topics = TOPICS.filter(function (t) { return t.re.test(hay); }).map(function (t) { return t.id; });
    if (src && src.topics) src.topics.forEach(function (t) { if (topics.indexOf(t) < 0) topics.push(t); });
    var place = null; PLACES.some(function (p) { if (p.re.test(it.title)) { place = p; return true; } return false; }) || PLACES.some(function (p) { if (p.re.test(it.desc || '')) { place = p; return true; } return false; });
    var region = place ? place.region : (src && src.region) || 'Statewide';
    var pl = place ? place.name : (src && src.place) || null;
    var hint = null; HINTS.some(function (h) { if (h[0].test(hay)) { hint = h[1]; return true; } return false; });
    if (!hint) hint = TOPIC_HINT[topics.filter(function (t) { return TOPIC_HINT[t]; })[0]] || null;
    if (pl && region === HOU) score += 2;
    if (NOISE.test(it.title)) score = 0;
    var dedupeWhy = why.filter(function (w, i) { return why.indexOf(w) === i && !why.some(function (o) { return o !== w && o.indexOf(w) >= 0; }); });
    return { topics: topics, place: pl, county: place ? place.county : (src && src.county) || null, region: region, score: score, why: dedupeWhy.slice(0, 6), hint: hint, infra: INFRA.test(hay) };
  }
  function relevant(c, src) { var min = src && src.minScore !== undefined ? src.minScore : 4; return c.infra && c.score >= min; }
  // ---- dedupe near-identical headlines
  var STOP = { the: 1, a: 1, an: 1, of: 1, and: 1, to: 1, for: 1, in: 1, on: 1, at: 1, by: 1, with: 1, is: 1, are: 1, from: 1, city: 1, county: 1, texas: 1, news: 1, update: 1 };
  function tokens(t) { return lc(text(t)).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (w) { return w && !STOP[w]; }); }
  function similar(a, b) { var A = tokens(a), B = tokens(b); if (!A.length || !B.length) return false; var sa = {}, inter = 0; A.forEach(function (w) { sa[w] = 1; }); var sb = {}; B.forEach(function (w) { if (!sb[w]) { sb[w] = 1; if (sa[w]) inter++; } }); var uni = Object.keys(sa).length + Object.keys(sb).length - inter; return inter / uni >= 0.8; }
  function idOf(it) { var s = it.link.replace(/[?#].*$/, '') + '|' + lc(it.title), h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return 'i' + h.toString(36); }
  function dedupe(items) {
    var out = []; items.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); }).forEach(function (it) {
      var d = out.filter(function (o) { return o.link === it.link || similar(o.title, it.title); })[0];
      if (d) { d.also = (d.also || []).concat([{ source: it.source, link: it.link }]).slice(0, 5); return; }
      out.push(it);
    });
    return out;
  }
  // ---- keep 90 days, carry firstSeen from the previous file, newest first
  function addDays(iso, n) { var d = new Date(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString(); }
  function mergePrev(items, prev, nowIso, keepIds) {
    var cutoff = addDays(nowIso, -KEEP_DAYS), pm = {}; ((prev && prev.items) || []).forEach(function (p) { pm[p.id] = p; });
    var byId = {}; items.forEach(function (it) { var p = pm[it.id]; it.firstSeen = p ? p.firstSeen : nowIso; byId[it.id] = it; });
    // keep items from sources that failed this run (stale), so one bad source does not empty the feed
    ((prev && prev.items) || []).forEach(function (p) { if (!byId[p.id] && keepIds && keepIds.indexOf(p.srcId) >= 0) byId[p.id] = p; });
    return Object.keys(byId).map(function (k) { return byId[k]; }).filter(function (it) { return (it.date || it.firstSeen) >= cutoff; }).sort(function (a, b) { return (b.date || b.firstSeen) < (a.date || a.firstSeen) ? -1 : 1; });
  }
  function build(raw, src, nowIso) { // raw {title, link, date, desc} -> stored item, or null when not relevant
    var c = classify(raw, src); if (!relevant(c, src)) return null;
    var it = { id: null, srcId: src.id, source: src.name, title: snip(raw.title, 200), link: raw.link, date: raw.date || null, desc: snip(raw.desc || ''), topics: c.topics, place: c.place, county: c.county, region: c.region, score: c.score, why: c.why, hint: c.hint };
    it.id = idOf(it); return it;
  }
  function topicLabel(id) { var t = TOPICS.filter(function (x) { return x.id === id; })[0]; return t ? t.label : id; }
  return { KEEP_DAYS: KEEP_DAYS, SNIP: SNIP, TOPICS: TOPICS, PLACES: PLACES, REGIONS: REGIONS, HOU: HOU, decode: decode, text: text, snip: snip, parseFeed: parseFeed, classify: classify, relevant: relevant, similar: similar, dedupe: dedupe, idOf: idOf, mergePrev: mergePrev, build: build, topicLabel: topicLabel };
});
