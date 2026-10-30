/* National Radar UI. Vanilla JS, no build. Reads data/national.json (a snapshot built by scripts/build-national.js).
   Every record already carries the rule that included it, the source field of each dollar figure, and a source link. */
(function () {
  'use strict';
  var V6 = window.NRV6, FS = [], C = window.NRC, V2 = window.NRV2, V4 = window.NRV4, HEALTH = null, CP = window.RadarCapture, M = window.NationalModel, RW = window.NationalRoadway, PS = window.NationalPse, CO = window.NationalCost, G = window.US_GEO, TX = window.NATIONAL_TEXT || { notUsed: [], rules: [] }, TXR = window.NATIONAL_ROAD_TEXT || { rules: [] }, TXP = window.NATIONAL_PSE_TEXT || { rules: [], pipe: '', db: '' };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SRC_SHORT = { 'srf-cw': 'EPA Clean Water SRF', 'srf-dw': 'EPA Drinking Water SRF', 'sam': 'SAM.gov', 'usaspending': 'USAspending', 'txdot-pcl': 'TxDOT projected contracts', 'nyc': 'NYC City Record', 'chicago': 'Chicago contracts', 'dhs-apfs': 'DHS forecast (APFS)', 'ag-forecast': 'Acquisition Gateway forecasts', 'caltrans-lar': 'Caltrans A&E look-ahead', 'caltrans-awards': 'Caltrans A&E awards', 'usaspending-rw': 'USAspending prime awards (roadway lane)', 'usaspending-sub': 'USAspending subawards', 'wsdot-proj': 'WSDOT projected design list', 'pse-usaspending': 'USAspending prime awards / IDVs (PS&E lens)', 'austin': 'City of Austin master agreements', 'txdot-pi': 'TxDOT Project Information', 'wssc': 'WSSC Water projected solicitations', 'cdot-sched': 'CDOT tentative advertisement schedule', 'la-dotd': 'Louisiana DOTD projected advertisements', 'dc-pass': 'DC OCP PASS forecast', 'sd-forecast': 'San Diego County procurement forecast' };
  var SCOPES_W = [
    { id: 'opp', label: 'Upcoming & open', sub: 'confirmed, fee > $20M' },
    { id: 'review', label: 'Needs review', sub: 'uncertain, not confirmed' },
    { id: 'nofee', label: 'Fee/amount not stated', sub: 'open/upcoming, no fee' },
    { id: 'recompete', label: 'Recompete watch', sub: 'inferred from end dates' },
    { id: 'awards', label: 'Awards / competitors', sub: 'awarded or closed' },
    { id: 'watch', label: 'Watchlist', sub: 'starred on this device' }
  ];
  var SCOPES_R = [
    { id: 'drain', label: 'Drainage fee > $5M', sub: 'drainage-specific fee stated by the source, upcoming/open' },
    { id: 'total', label: 'Roadway fee stated (drainage share not stated)', sub: 'total fee > $20M, scope names drainage, share unknown' },
    { id: 'review', label: 'Needs review', sub: 'uncertain, not confirmed' },
    { id: 'awards', label: 'Awards / competitors', sub: 'awarded or closed' },
    { id: 'watch', label: 'Watchlist', sub: 'starred on this device' }
  ];
  var SCOPES_P = [
    { id: 'all', label: 'All fee records', sub: 'consultant fee stated by the source, any stage' },
    { id: 'open', label: 'Upcoming / open', sub: 'fee stated, not yet awarded' },
    { id: 'forecast', label: 'Forecast', sub: 'agency forecasts with a stated fee' },
    { id: 'awarded', label: 'Awarded', sub: 'recompete and competitor intel' },
    { id: 'advance', label: 'Early notices (no fee yet)', sub: 'agency forecasts before the solicitation; no fee filter applies' },
    { id: 'pipeline', label: 'Big projects (no fee yet)', sub: 'stated project cost, NOT a fee' },
    { id: 'db', label: 'Design-build', sub: 'DB value includes construction, NOT a fee' },
    { id: 'watch', label: 'Watchlist', sub: 'starred on this device' }
  ];
  var SCOPES = C.SCOPES; // v4.5: one combined set, no lanes
  var COLOR = { opp: '#34d399', review: '#fbbf24', nofee: '#94a3b8', award: '#7cb7ff', closed: '#64748b', recompete: '#fb7185' };
  var STATUS_LABEL = { open: 'Open', upcoming: 'Upcoming', awarded: 'Awarded' };
  var EXCL_LABEL = { 'not-engineering': 'Not an engineering-services notice (NAICS / PSC)', 'construction-naics': 'Construction NAICS (23xxxx)', 'construction-title': 'Title reads as a construction contract', 'no-sector': 'No drainage / water / wastewater / flood / coastal wording', 'no-stated-fee': 'No fee stated by the source', 'project-cost-only': 'Only a project or construction cost stated (never counts as a fee)', 'fee-not-above-20m': 'Stated fee is $20,000,000 or less', 'deadline-passed': 'Response date already passed', 'outside-us': 'Place of performance outside the US', 'non-civil-context': 'Title looks non-civil (vessel, ESPC, cyber and similar)', 'stale-no-deadline': 'No deadline and posted over 12 months ago', 'award-older-than-24-months': 'Award older than 24 months', 'closed-older-than-12-months': 'Closed more than 12 months ago', 'notice-type-not-used': 'Notice type not used (justification, amendment only, etc.)', 'not-active-status': 'Not an active status', 'status-unknown': 'Status unknown', 'no-roadway-context': 'No roadway / highway / bridge / corridor wording', 'non-roadway-title': 'Title names a dam, canal, trail, airport, rail, vessel or similar, not a road', 'drain-fee-not-above-5m': 'Drainage-specific fee is $5,000,000 or less', 'total-fee-not-above-20m': 'Total fee is $20,000,000 or less', 'scope-does-not-name-drainage': 'Total fee above $20M but the scope does not name drainage / hydraulics / stormwater / culvert / flood' };

  var COMB = null, DATA = null, RECS = [], ASOF = '', LIVE = {}, DATA_W = null, DATA_R = null, DATA_P = null, PRICES = null;
  var secLabel = function (k) { return k === 'roadway' ? 'Roadway' : k === 'drainage' ? 'Drainage named in the title' : M.sectorLabel(k); };
  var WATCH = {}; try { WATCH = JSON.parse(localStorage.getItem('nr.watch') || '{}') || {}; } catch (e) { WATCH = {}; }
  var CAP = {}; try { CAP = JSON.parse(localStorage.getItem('nr.capture') || '{}') || {}; } catch (e) { CAP = {}; } Object.keys(CAP).forEach(function (k) { CAP[k] = CP.clean(CAP[k]); });
  var freshF = function () { return { q: '', states: [], agencies: [], statuses: [], sectors: [], sources: [], feeMin: null, costMin: null, work: [], dueWithin: null }; }; // v4.5: no threshold by default
  try { FS = V6.load(window.localStorage); } catch (e) { FS = []; }
  var CONF = false; try { CONF = localStorage.getItem('nr.confirmedOnly') === '1'; } catch (e) { CONF = false; } // item 5: saved Confirmed-only switch
  var freshF0 = freshF; freshF = function (mode) { var f = freshF0(mode); f.hideUnconfirmed = CONF; return f; };
  var S = { mode: 'all', scope: 'upcoming', tab: 'list', sort: 'soon', rows: 50, tlMonth: null, capOpen: {}, restoreMode: 'merge', f: freshF('all') };
  var SYNTH = { sectors: M.SECTORS.map(function (s) { return s.id; }) };

  function toast(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3500); }
  function saveWatch() { try { localStorage.setItem('nr.watch', JSON.stringify(WATCH)); } catch (e) { toast('Could not save the watchlist on this device.'); } }
  function saveCap() { try { localStorage.setItem('nr.capture', JSON.stringify(CAP)); } catch (e) { toast('Could not save the capture file on this device.'); } }
  function todayCentral() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); }

  // ---------- filtering ----------
  function filterFor(scope, f, skip) {
    var o = Object.assign({}, f); (skip || []).forEach(function (k) { o[k] = Array.isArray(o[k]) ? [] : null; });
    if (S.mode === 'pse') { o.tab = scope === 'watch' || scope === 'all' ? null : scope; o.watchOnly = scope === 'watch'; return o; }
    o.tab = scope === 'watch' ? null : scope; o.watchOnly = scope === 'watch';
    if (scope === 'nofee') o.feeMin = null; else o.costMin = null;
    return o;
  }
  // ---------- v2: New since last visit / Closing soon ----------
  var NEWBASE = null; var ssn = null; try { ssn = window.sessionStorage; } catch (e) { ssn = null; }
  var lsx = null; try { lsx = window.localStorage; } catch (e) { lsx = null; }
  S.digest = null; // null | 'new' | 'soon' | 'changed'
  S.region = V2.loadRegion(lsx); // saved; default All US
  function latestAsOf() { return [DATA_P, DATA_W, DATA_R].reduce(function (a, d) { return d && d.asOfDate > a ? d.asOfDate : a; }, ''); }
  function digestOf(list, kind) { var t = todayCentral(); return list.filter(function (r) { return kind === 'new' ? V2.isNew(r, NEWBASE) : kind === 'changed' ? V4.isChanged(r, t) : V2.isClosingSoon(r, t); }); }
  function isConfirmedRec(r) { return C.isConfirmed(r); } // pse: other lenses carry no Confirmed badge and are filtered by their own rules
  function post(list, skipDigest) {
    if (S.region !== 'all') list = list.filter(function (r) { return V2.inRegion(r, S.region); });
    if (CONF) list = list.filter(isConfirmedRec);
    list = V2.groupDupes(list); list.forEach(function (c) { if (c.dupes) DUPES[c.id] = c; });
    return (!skipDigest && S.digest) ? digestOf(list, S.digest) : list;
  }
  var DUPES = {};
  function alsoHtml(r) { var c = DUPES[r.id]; if (!c || !c.dupes) return ''; var names = []; c.dupes.forEach(function (d) { var n = SRC_SHORT[d.src] || d.src; if (names.indexOf(n) < 0) names.push(n); }); return '<span class="tag also" title="Same opportunity found in other sources">Also listed in: ' + esc(names.join(', ')) + '</span>' + (c.amountsDiffer ? '<span class="tag rev" title="Sources state different amounts; the highest-confidence source is shown">Amounts differ</span>' : ''); }
  function alsoSheet(r) { var c = DUPES[r.id]; if (!c || !c.dupes) return ''; return '<h3>Also listed in</h3><ul>' + c.dupes.map(function (d) { return '<li>' + esc(SRC_SHORT[d.src] || d.src) + ': ' + (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.title) + '</a>' : esc(d.title)) + (d.amt !== null ? ' &middot; stated ' + esc(M.fmtMoneyFull(d.amt)) : ' &middot; no amount stated') + '</li>'; }).join('') + '</ul>' + (c.amountsDiffer ? '<p class="note">The sources state different amounts. The card shows the amount from the highest-confidence source; the others are listed above and were not combined.</p>' : ''); }
  function renderDigest() {
    var base = post(scopedRaw(S.scope), true), nNew = digestOf(base, 'new').length, nSoon = digestOf(base, 'soon').length, nChg = digestOf(base, 'changed').length;
    $('digest').innerHTML = '<button type="button" class="chip dg' + (S.digest === 'new' ? ' on' : '') + '" data-digest="new" aria-pressed="' + (S.digest === 'new') + '">New since last visit <b class="badge' + (nNew ? ' hot' : '') + '">' + nNew + '</b></button>' +
      '<button type="button" class="chip dg' + (S.digest === 'soon' ? ' on' : '') + '" data-digest="soon" aria-pressed="' + (S.digest === 'soon') + '">Closing within ' + V2.SOON_DAYS + ' days <b class="badge' + (nSoon ? ' warn' : '') + '">' + nSoon + '</b></button>' +
      '<button type="button" class="chip dg' + (S.digest === 'changed' ? ' on' : '') + '" data-digest="changed" aria-pressed="' + (S.digest === 'changed') + '">Changed (last ' + V4.CHANGED_DAYS + ' days) <b class="badge' + (nChg ? ' hot' : '') + '">' + nChg + '</b></button>' +
      (nNew || S.digest === 'new' ? '<button type="button" class="chip ghost" id="btnSeen">Mark all seen</button>' : '');
    var co = $('btnConfOnly'); co.setAttribute('aria-checked', String(CONF)); co.classList.toggle('on', CONF);
    var pill = $('digestPill'), lbl = S.digest ? 'Showing: ' + ({ 'new': 'New', soon: 'Closing soon', changed: 'Changed' })[S.digest] + ' &times;' : [nNew ? 'New ' + nNew : '', nSoon ? 'Closing ' + nSoon : '', nChg ? 'Changed ' + nChg : ''].filter(Boolean).join(' &middot; ');
    pill.hidden = !lbl; pill.innerHTML = lbl; pill.classList.toggle('hot', !!nNew || !!S.digest);
        var rg = $('regionSel'); if (rg && rg.value !== S.region) rg.value = S.region;
    $('txLink').hidden = S.region === 'all';
    $('regionHint').hidden = !V2.showRegionHint(lsx);
  }
  function setRegion(id) { S.region = V2.regionOf(id).id; V2.saveRegion(lsx, S.region); V2.dismissRegionHint(lsx); S.rows = 50; render(); }
  function scoped(scope, skip) { return post(scopedRaw(scope, skip)); }
  function scopedRaw(scope, skip) { var o = Object.assign({}, S.f); (skip || []).forEach(function (k) { o[k] = Array.isArray(o[k]) ? [] : null; }); return V6.extra(C.filter(RECS, o, scope || S.scope, WATCH), o, todayCentral(), C.sectorsOf); }
  function fee(r) { return C.valueOf(r); }
  function sortFor(list, key) {
    if (key === 'due' || key === 'decision') { var byId = {}; list.forEach(function (r) { byId[r.id] = r; }); return CP.sortRows(list.map(function (r) { return { id: r.id, cap: CAP[r.id] || CP.blank() }; }), key).map(function (x) { return byId[x.id]; }); }
    return sortStd(list, key);
  }
  function sortStd(list, key) { return C.sort(list, key); }
  function sum(list) { return list.reduce(function (a, r) { return a + fee(r); }, 0); }

  // ---------- small renderers ----------
  function moneyLabel(a) { return (M.AMOUNT_KINDS[a.kind] ? M.AMOUNT_KINDS[a.kind].label : a.kind) + ' · source field: ' + a.field; }
  function dateText(r) {
    var d = r.dates || {}, out = [];
    if (r.status !== 'awarded' && d.due) out.push('Response due ' + M.fmtDate(d.due));
    if (d.est) out.push((d.estLabel || 'Forecast date') + ' ' + M.fmtDate(d.est));
    else if (d.estText) out.push((d.estLabel || 'Forecast') + ': ' + d.estText);
    if (d.award) out.push('Award ' + M.fmtDate(d.award));
    if (d.end) out.push('End ' + M.fmtDate(d.end) + (d.endInferred ? ' (inferred)' : ''));
    if (!out.length && d.posted) out.push('Posted ' + M.fmtDate(d.posted));
    return out.length ? out.join(' · ') : 'No date stated by the source';
  }
  var BADGE_CLS = { 'Confirmed': 'conf', 'Unconfirmed': 'unconf', 'Awarded': 'inf', 'Text-parsed': 'rev', 'Inferred sector': 'inf', 'Design-build': 'db', 'Exactly $5M': 'rev', 'Fee not published': 'plain', 'Project cost (not fee)': 'plain', 'Range lower bound': 'rev', 'Status unclear': 'rev', 'Closed': 'plain', 'Value not stated': 'plain', 'Forecast': 'inf', 'Drainage / H&H named': 'dir', 'Advance notice': 'dir', 'Fee/amount not stated': 'plain', 'Stated value below $5M': 'plain', 'Engineering unclear': 'rev', 'Upcoming / open': 'inf' };
  function tagsPse(r) {
    var t = (r.badges || []).map(function (b) { return '<span class="tag ' + (BADGE_CLS[b] || '') + '">' + esc(b) + '</span>'; });
    if (V2.isNew(r, NEWBASE)) t.unshift('<span class="tag new">New</span>'); t.push(alsoHtml(r));
    if (r.lens === 'db' && r.dbRoleLabel) t.push('<span class="tag est" title="' + esc(r.dbRoleWhy || '') + '">' + esc(r.dbRoleLabel) + '</span>');
    if (r.lens === 'db' && r.dbType && r.dbType !== 'Design-build') t.push('<span class="tag db">' + esc(r.dbType) + '</span>');
    if (r.recompete) t.push('<span class="tag inf">Recompete (inferred)</span>');
    (r.domains || []).forEach(function (s) { t.push('<span class="tag inf" title="Inferred from keywords">' + esc(secLabel(s)) + '</span>'); });
    if (r.also && r.also.length) t.push('<span class="tag">+' + r.also.length + ' same record</span>');
    return t.join('');
  }
  // v3: cards show at most 2 badges (confidence + one status); the detail sheet keeps every badge (tagsFor)
  function cardTags(r) {
    var b = r.badges || [], conf, st = null, t = todayCentral();
    if (r._ln === 'pse') conf = r.lens === 'fee' ? (b.indexOf('Confirmed') >= 0 ? ['conf', 'Confirmed'] : ['unconf', 'Unconfirmed']) : ['plain', C.kindOf(r)];
    else conf = r.bucket === 'review' ? ['rev', 'Needs review'] : r.bucket === 'nofee' ? ['plain', 'Fee/amount not stated'] : ['dir', r.bucket === 'closed' ? 'Closed' : STATUS_LABEL[r.status] || r.status];
    if (V2.isNew(r, NEWBASE)) st = ['new', 'New']; else if (V2.isClosingSoon(r, t)) st = ['inf', 'Closing soon']; else if (r.status === 'awarded' || r.stage === 'awarded') st = ['plain', 'Awarded']; else if (r.stage === 'forecast') st = ['plain', 'Forecast']; else if (r.stage === 'closed' || r.bucket === 'closed') st = ['plain', 'Closed'];
    if (st && st[1] === conf[1]) st = null;
    return [conf, st].filter(Boolean).map(function (x) { return '<span class="tag ' + x[0] + '">' + esc(x[1]) + '</span>'; }).join('');
  }
  function tagsFor(r) {
    if (r._ln === 'pse') return tagsPse(r);
    var t = [alsoHtml(r)]; if (V2.isNew(r, NEWBASE)) t.push('<span class="tag new">New</span>');
    t.push('<span class="tag ' + (r.bucket === 'review' ? 'rev' : 'dir') + '">' + esc(r.bucket === 'closed' ? 'Closed (deadline passed)' : r.bucket === 'review' ? 'Needs review' : r.bucket === 'nofee' ? 'Fee/amount not stated' : STATUS_LABEL[r.status] || r.status) + '</span>');
    if (r._ln === 'road' && r.rw === 'drain') t.push('<span class="tag dir">Drainage-specific fee</span>');
    if (r._ln === 'road' && r.rw === 'total') t.push('<span class="tag rev">Total fee, drainage share unknown</span>');
    if (r.recompete) t.push('<span class="tag inf">Recompete (inferred)</span>');
    (r.sectors || []).forEach(function (s) { t.push('<span class="tag inf" title="Inferred from keywords">' + esc(secLabel(s)) + '</span>'); });
    if (r.also && r.also.length) t.push('<span class="tag">+' + r.also.length + ' same record</span>');
    return t.join('');
  }
  function colorOf(r) { if (r._ln === 'pse') return r.lens === 'db' ? '#c4b5fd' : r.lens === 'pipeline' ? '#94a3b8' : r.lens === 'advance' ? '#5eead4' : r.stage === 'awarded' || r.stage === 'closed' ? COLOR.award : r.stage === 'forecast' ? COLOR.review : COLOR.opp; return COLOR[r.bucket] || '#64748b'; }
  function moneyPse(r, full) {
    var il = r.illustrative, h = '';
    if (r.lens === 'fee' && !r.amt) h = '<span class="lbl">Fee/amount not stated</span><span class="big" style="font-size:16px">No amount published</span>';
    else if (r.lens === 'fee') h = '<span class="lbl">Consultant fee · ' + esc(r.amt.kind === 'design_fee' ? 'design fee stated in the notice text' : (M.AMOUNT_KINDS[r.amt.kind] || {}).label || r.amt.kind) + (full ? ' · source field: ' + esc(r.amt.field) : '') + '</span><span class="big">' + esc(M.fmtMoneyFull(r.amt.v)) + '</span>';
    else if (r.lens === 'db') { h = r.dbValue ? '<span class="lbl">Design-build contract value / estimated project cost. Includes construction. NOT a design fee' + (full ? ' · source field: ' + esc(r.dbValue.field) : '') + '</span><span class="big sm">' + esc(M.fmtMoneyFull(r.dbValue.v)) + '</span>' : '<span class="lbl">Design-build value not stated by the source</span>'; if (r.designFee) h += '<span class="lbl">Design fee stated separately in the text (text-parsed): ' + esc(M.fmtMoneyFull(r.designFee.v)) + '</span>'; if (r.stipend) h += '<span class="lbl">Stipend (not a fee): ' + esc(M.fmtMoneyFull(r.stipend.v)) + '</span>'; }
    else if (r.lens === 'advance') { h = '<span class="lbl">' + (r.statedValue ? 'Advance notice. The source states ' + esc(M.fmtMoneyFull(r.statedValue.v)) + ' (' + esc(r.statedValue.field) + '), below the $5M floor, so it is shown for information only.' : 'Advance notice. No fee stated by the source.') + '</span>'; }
    else { h = '<span class="lbl">Project cost (not fee) · ' + esc(r.projectCost.field) + '</span><span class="big sm">' + esc(M.fmtMoneyFull(r.projectCost.v)) + '</span><span class="lbl">No fee is published for this project.</span>'; if (il) h += '<span class="estline">' + esc(il.label) + ': ' + esc(M.fmtMoney(il.low)) + ' to ' + esc(M.fmtMoney(il.high)) + ' (' + il.pct[0] + '% to ' + il.pct[1] + '% of stated cost; source below). Not a stated fee and not used by any filter.</span>'; }
    return h;
  }
  function fmtD(x) { return M.fmtDate(x); }
  function chgLine(r) { // v4.2: one change line instead of extra badges (cards keep max 2 badges)
    var rc = V4.recentChanges(r, todayCentral()); if (!rc.length) return '';
    var c = rc[rc.length - 1]; return '<span class="chg' + (c.k === 'status' ? ' st' : '') + '">&#9998; ' + esc(V4.changeText(c, fmtD, M.fmtMoney)) + (rc.length > 1 ? ' &middot; +' + (rc.length - 1) + ' more' : '') + '</span>';
  }
  function changesSheet(r) {
    var h = r.history || []; if (!h.length) return '';
    return '<h3>Changes since first seen</h3><ul class="chgl">' + h.slice().reverse().map(function (c) { return '<li><b>' + esc(M.fmtDate(c.t)) + '</b> &middot; ' + esc(V4.changeText(c, fmtD, M.fmtMoney)) + '</li>'; }).join('') + '</ul><p class="note">Detected by comparing daily snapshots of the source (up to ' + V4.HISTORY_CAP + ' changes kept).</p>';
  }
  function cardHtml(r) {
    var h = cardHtmlBase(r), st = C.stageOf(r);
    if (C.isPositionable(r, todayCentral())) h = h.replace('<div class="card"', '<div class="card pos"').replace('<!--POS-->', '<span class="posr">Positionable</span>'); // v6: tag sits on the date line
    else if (st === 'awarded' || st === 'closed') h = h.replace('<div class="card"', '<div class="card past"');
    return S.scope === 'watch' && WATCH[r.id] ? h.replace(/<\/div>$/, capBlock(r.id) + '</div>') : h;
  }
  function cardHtmlBase(r) {
    var money;
    if (r._ln === 'pse') {
      var wherep = [r.agency, r.subagency && r.subagency !== r.agency ? r.subagency : null, r.city ? r.city + ', ' + (r.state || '') : r.state ? (M.STATE_NAMES[r.state] || r.state) : 'state not stated'].filter(Boolean).join(' · ');
      return '<div class="card" style="--c:' + colorOf(r) + '"><button type="button" class="star' + (WATCH[r.id] ? ' on' : '') + '" data-star="' + esc(r.id) + '" aria-label="' + (WATCH[r.id] ? 'Remove from watchlist' : 'Add to watchlist') + '">' + (WATCH[r.id] ? '&#9733;' : '&#9734;') + '</button><button type="button" class="b" data-open="' + esc(r.id) + '"><span class="t">' + esc(r.title) + '</span><span class="m"><span>' + esc(wherep) + '</span></span><span class="m dline"><span class="dt">' + esc(dateText(r)) + '</span><!--POS--></span><span class="cmoney">' + moneyPse(r) + '</span><span class="m src"><span>' + esc(SRC_SHORT[r.src] || r.src) + '</span></span><span>' + cardTags(r) + '</span>' + chgLine(r) + '</button></div>';
    }
    if (r.amt) money = '<span class="lbl">' + esc(M.AMOUNT_KINDS[r.amt.kind] ? M.AMOUNT_KINDS[r.amt.kind].label : r.amt.kind) + '</span><span class="big">' + esc(M.fmtMoneyFull(r.amt.v)) + '</span>';
    else money = '<span class="lbl">No fee stated by the source</span>' + (r.projectCost ? '<span class="big" style="font-size:16px">project cost (not fee): ' + esc(M.fmtMoney(r.projectCost.v)) + '</span><span class="lbl">' + esc(r.projectCost.field) + '</span>' : '');
    if (r._ln === 'road' && r.amt) money = '<span class="lbl"><b class="basis ' + (r.feeBasis === 'total' ? 'tot' : 'dr') + '">' + esc(r.feeBasisLabel || '') + '</b> ' + esc(M.AMOUNT_KINDS[r.amt.kind] ? M.AMOUNT_KINDS[r.amt.kind].label : r.amt.kind) + '</span><span class="big">' + esc(M.fmtMoneyFull(r.amt.v)) + '</span>';
    var where = [r.agency, r.subagency && r.subagency !== r.agency ? r.subagency : null, r.city ? r.city + ', ' + (r.state || '') : r.state ? (M.STATE_NAMES[r.state] || r.state) : 'state not stated'].filter(Boolean).join(' · ');
    return '<div class="card" style="--c:' + colorOf(r) + '"><button type="button" class="star' + (WATCH[r.id] ? ' on' : '') + '" data-star="' + esc(r.id) + '" aria-label="' + (WATCH[r.id] ? 'Remove from watchlist' : 'Add to watchlist') + '">' + (WATCH[r.id] ? '&#9733;' : '&#9734;') + '</button>' +
      '<button type="button" class="b" data-open="' + esc(r.id) + '"><span class="t">' + esc(r.title) + '</span><span class="m"><span>' + esc(where) + '</span></span><span class="m dline"><span class="dt">' + esc(dateText(r)) + '</span><!--POS--></span><span class="cmoney">' + money + '</span><span class="m src"><span>' + esc(SRC_SHORT[r.src] || r.src) + '</span></span><span>' + cardTags(r) + '</span>' + chgLine(r) + (r._ln === 'road' ? '<span class="costline">' + esc(costBrief(r)) + '</span>' : '') + '</button></div>';
  }
  function costBrief(r) {
    var c = r.cost; if (!c) return '';
    if (c.status === 'stated') return 'Construction cost (stated by the source): ' + M.fmtMoney(c.stated.v);
    if (c.status === 'estimated') return 'Construction cost, ' + CO.LABEL + ': ' + M.fmtMoney(c.est.low) + ' to ' + M.fmtMoney(c.est.high) + ' (base ' + M.fmtMoney(c.est.base) + ')';
    return 'Construction cost: insufficient scope to estimate';
  }
  function cardsInto(el, list, emptyHtml) {
    el.innerHTML = list.length ? list.map(cardHtml).join('') : (emptyHtml || '<div class="empty"><b>Nothing to show here.</b></div>') + emptyActions();
  }
  function emptyScopeHtml() {
    if (S.scope === 'watch') return '<div class="empty"><b>Your watchlist is empty.</b> Tap the star on any record to keep it here. It is saved on this device only.</div>';
    if (activeCount() > 0 || CONF || S.digest) return '<div class="empty"><b>Nothing matches what is switched on.</b> Use a button below to widen the view.</div>';
    return '<div class="empty"><b>No records in this view.</b> Try All, or check Data &amp; sources for feeds that are stale.</div>';
  }
  function setBadge(n) { var b = $('advCount'); b.hidden = !n; b.textContent = n; $('btnMore').setAttribute('aria-label', 'Filters' + (n ? ', ' + n + ' active' : '')); }
  function activeCount() { var f = S.f; return (f.q ? 1 : 0) + f.states.length + f.agencies.length + f.statuses.length + f.sectors.length + f.sources.length + (S.region && S.region !== 'all' ? 1 : 0) + (f.feeMin !== null && f.feeMin !== undefined ? 1 : 0) + (f.work ? f.work.length : 0) + (f.dueWithin ? 1 : 0); }

  // ---------- header, scopes, kpis ----------
  function renderFresh() {
    if (!DATA) return;
    var gen = new Date(DATA.generatedAt), age = Math.max(0, (Date.now() - gen.getTime()) / 86400000);
    var bad = DATA.sources.filter(function (s) { return s.status === 'failed' || s.status === 'stale'; });
    var cls = bad.length || age > 7 ? (age > 7 ? 'bad' : 'warn') : age > 2 ? 'warn' : 'ok';
    $('freshDot').className = 'dot ' + cls;
    var full = 'Data updated ' + M.fmtDate(DATA.asOfDate) + ' (built ' + gen.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + ', ' + (age < 1 ? 'today' : Math.floor(age) + ' day' + (Math.floor(age) === 1 ? '' : 's') + ' old') + ')' + (bad.length ? '. ' + bad.length + ' source(s) stale or failed.' : '.') + (LIVE.at ? ' Live awards refreshed ' + LIVE.at + '.' : ''); $('freshTxt').title = full; $('freshTxt').innerHTML = '<span class="upd">Updated </span>' + esc(M.fmtDate(DATA.asOfDate).replace(/, \d{4}$/, '')) + esc((age < 1 ? ', today' : ', ' + Math.floor(age) + 'd old') + (bad.length ? ' · ' + bad.length + ' source issue' + (bad.length === 1 ? '' : 's') : ''));
  }
  var PRIMARY = { all: ['upcoming', 'open', 'forecast', 'all'] };
  var SHORT = { all: 'All', open: 'Open', forecast: 'Forecast', awarded: 'Awarded', opp: 'Open', review: 'Review', nofee: 'No fee', drain: 'Drainage', total: 'Roadway total' };
  function scopeBtn(s0, cls) { var n = scoped(s0.id).length, due = s0.id === 'watch' ? capCounts().soon + capCounts().overdue : 0; return '<button type="button" class="' + cls + (S.scope === s0.id ? ' on' : '') + '" data-scope="' + s0.id + '" aria-pressed="' + (S.scope === s0.id) + '" title="' + esc(s0.sub) + '"><b>' + n + '</b><span>' + esc(cls === 'scope' && SHORT[s0.id] ? SHORT[s0.id] : s0.label) + '</span>' + (due ? '<i class="flagn">' + due + ' due soon</i>' : '') + '</button>'; }
  function renderScopes() { // 3-4 primary scopes; the rest behind More (same scopes, same counts)
    var prim = PRIMARY[S.mode] || [], main = SCOPES.filter(function (x) { return prim.indexOf(x.id) >= 0; }), rest = SCOPES.filter(function (x) { return prim.indexOf(x.id) < 0; });
    var cur = rest.filter(function (x) { return x.id === S.scope; })[0];
    $('scopes').innerHTML = main.map(function (x) { return scopeBtn(x, 'scope'); }).join('') + (rest.length ? '<details class="scmore' + (cur ? ' on' : '') + '"><summary class="scope' + (cur ? ' on' : '') + '"><b>' + (cur ? scoped(cur.id).length : '&middot;&middot;&middot;') + '</b><span>' + (cur ? esc(cur.label) + ' &#9662;' : 'More &#9662;') + '</span></summary><div class="scmenu" role="menu">' + rest.map(function (x) { return scopeBtn(x, 'scope item'); }).join('') + '</div></details>' : '');
  }

  function renderKpis(list) {
    var withV = list.filter(function (r) { return fee(r); }).length, total = sum(list), scope = SCOPES.filter(function (x) { return x.id === S.scope; })[0] || SCOPES[0];
    $('kpis').innerHTML = '<p class="kline"><b>' + list.length + '</b> records <span class="hint">&middot; ' + esc(scope.sub) + '</span></p>'; // v6: no headline sum (it mixed project costs and fees); total kept in the CSV / Breakdown
  }


  // ---------- filter chips ----------
  function chipSet(elId, key, items, selected) {
    var el = $(elId);
    el.innerHTML = items.length ? items.map(function (it) { return '<button type="button" class="chip' + (selected.indexOf(it.k) >= 0 ? ' on' : '') + '" data-f="' + key + '" data-k="' + esc(it.k) + '" aria-pressed="' + (selected.indexOf(it.k) >= 0) + '">' + esc(it.label) + ' <small>' + it.n + '</small></button>'; }).join('') : '<span class="hint">none in this tab</span>';
  }
  function itemsFor(skipKey, fn, labelFn) {
    var list = scoped(S.scope, [skipKey]), m = M.countBy(list, fn);
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a] || (a < b ? -1 : 1); }).map(function (k) { return { k: k, label: labelFn ? labelFn(k) : k, n: m[k] }; });
  }
  function renderFilters() {
    var f = S.f;
    chipSet('fState', 'states', itemsFor('states', function (r) { return r.state || '??'; }, function (k) { return k === '??' ? 'State not stated' : k + ' · ' + (M.STATE_NAMES[k] || k); }), f.states);
    chipSet('fAgency', 'agencies', itemsFor('agencies', function (r) { return r.agency; }), f.agencies);
    chipSet('fStatus', 'statuses', itemsFor('statuses', function (r) { return C.stageOf(r); }, function (k) { return C.STAGE_LABEL[k] || k; }), f.statuses);
    chipSet('fSector', 'sectors', itemsFor('sectors', function (r) { return C.sectorsOf(r); }, function (k) { return secLabel(k); }), f.sectors);
    chipSet('fSource', 'sources', itemsFor('sources', function (r) { return r.src; }, function (k) { return SRC_SHORT[k] || k; }), f.sources);
    var fees = [[null, 'Any (default)'], [1e6, '$1M+'], [5e6, '$5M+'], [20e6, '$20M+'], [50e6, '$50M+'], [100e6, '$100M+']];
    $('fFee').innerHTML = fees.map(function (x) { return '<button type="button" class="chip' + (f.feeMin === x[0] ? ' on' : '') + '" data-fee="' + x[0] + '" aria-pressed="' + (f.feeMin === x[0]) + '">' + x[1] + '</button>'; }).join('');
    $('costBox').hidden = true; $('pseCtl').hidden = true;
    var n = activeCount() - (f.q ? 1 : 0); setBadge(n); var nRes = scoped().length; $('fLbl').innerHTML = 'Filters' + (n ? ' (' + n + ')' : '') + ' <span class="fres">&middot; ' + nRes + '<span class="fresw"> results</span></span>'; $('advCount').hidden = true; renderQuick(); renderTags(); renderSets();
    var a = $('activeNote'); a.hidden = !activeCount(); a.textContent = activeCount() ? activeCount() + ' filter' + (activeCount() === 1 ? '' : 's') + ' on. Counts above reflect them.' : '';
  }

  // ---------- v6: quick filters, active tags, saved filter sets ----------
  function qSum(id, base, sel) { var el = $(id); el.textContent = base + (sel.length ? ': ' + sel[0] + (sel.length > 1 ? ' +' + (sel.length - 1) : '') : ''); el.classList.toggle('on', !!sel.length); }
  function renderQuick() {
    var f = S.f, st = itemsFor('states', function (r) { return r.state || '??'; }, function (k) { return k === '??' ? 'No state' : k; });
    $('qpState').innerHTML = '<div class="chips">' + st.map(function (it) { var on = f.states.indexOf(it.k) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-f="states" data-k="' + esc(it.k) + '" aria-pressed="' + on + '" title="' + esc(M.STATE_NAMES[it.k] || it.k) + '">' + esc(it.label) + ' <small>' + it.n + '</small></button>'; }).join('') + '</div>';
    qSum('qsState', 'State', f.states.map(function (k) { return k === '??' ? 'No state' : k; }));
    var wbase = scoped(S.scope, ['work']);
    $('qpWork').innerHTML = '<div class="chips">' + V6.WORK.map(function (w) { var on = f.work.indexOf(w.id) >= 0, n = V6.extra(wbase, { work: [w.id] }, todayCentral(), C.sectorsOf).length; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-wt="' + w.id + '" aria-pressed="' + on + '">' + esc(w.label) + ' <small>' + n + '</small></button>'; }).join('') + '</div><p class="hint">Inferred from words in the notice.</p>';
    qSum('qsWork', 'Work type', f.work.map(V6.workLabel));
    var dbase = scoped(S.scope, ['dueWithin']);
    $('qDueChips').innerHTML = [{ d: null, label: 'Any date' }].concat(V6.DUE).map(function (x) { var on = (f.dueWithin || null) === x.d, n = x.d ? V6.extra(dbase, { dueWithin: x.d }, todayCentral(), C.sectorsOf).length : dbase.length; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-due="' + (x.d || '') + '" aria-pressed="' + on + '">' + esc(x.label) + ' <small>' + n + '</small></button>'; }).join('');
    qSum('qsDue', 'Due date', f.dueWithin ? [f.dueWithin + ' days'] : []);
  }
  function renderTags() {
    var tags = V6.activeTags(S.f, { stateName: function (k) { return M.STATE_NAMES[k] || k; }, stageLabel: C.STAGE_LABEL, secLabel: secLabel, srcLabel: SRC_SHORT, money: M.fmtMoney, region: S.region, regionLabel: V2.regionOf(S.region).label });
    var el = $('ftags'); el.hidden = !tags.length;
    el.innerHTML = tags.map(function (t) { return '<button type="button" class="ftag" data-tag-k="' + esc(t.k) + '" data-tag-v="' + esc(t.v) + '" aria-label="Remove filter ' + esc(t.label) + '">' + esc(t.label) + ' <span aria-hidden="true">&times;</span></button>'; }).join('') + (tags.length ? '<button type="button" class="linkbtn ftclear" id="ftClear">Clear all</button>' : '');
  }
  function renderSets() {
    $('fsets').innerHTML = FS.length ? FS.map(function (x) { return '<span class="fset"><button type="button" class="chip" data-fs-apply="' + esc(x.name) + '">' + esc(x.name) + '</button><button type="button" class="fsdel" data-fs-del="' + esc(x.name) + '" aria-label="Delete filter set ' + esc(x.name) + '">&times;</button></span>'; }).join('') : '<span class="hint">None yet. Set filters, name them and tap Save.</span>';
  }
  function removeTagK(k, v) {
    if (k === 'region') { setRegion('all'); return; } if (k === 'hideUnconfirmed') { setConf(false); return; }
    V6.removeTag(S.f, k, v); if (k === 'q') $('q').value = ''; S.rows = 50; render();
  }
  function saveSet() {
    var name = $('fsName').value.trim(); if (!name) { toast('Type a name for this filter set first.'); $('fsName').focus(); return; }
    FS = V6.upsert(FS, V6.snapshot(name, S.f, S.scope, S.region)); V6.save(window.localStorage, FS); $('fsName').value = ''; renderSets(); toast('Saved filter set "' + name + '" on this device.');
  }
  function applySet(name) {
    var set = FS.filter(function (x) { return x.name === name; })[0]; if (!set) return;
    S.f = V6.applyTo(freshF(), set); $('q').value = S.f.q || ''; S.scope = set.scope || S.scope; S.region = V2.regionOf(set.region).id; V2.saveRegion(lsx, S.region); S.rows = 50; render(); toast('Applied "' + name + '".');
  }
  function deleteSet(name) { FS = V6.remove(FS, name); V6.save(window.localStorage, FS); renderSets(); toast('Deleted filter set "' + name + '".'); }

  // ---------- PS&E controls ----------
  var DB_ROLES = [['prime', 'DB prime opportunity (inferred)'], ['sub', 'Design-subconsultant to DB team (inferred)']];
  function chipsHtml(key, items, sel) { return items.length ? items.map(function (it) { return '<button type="button" class="chip' + (sel.indexOf(it.k) >= 0 ? ' on' : '') + '" data-f="' + key + '" data-k="' + esc(it.k) + '" aria-pressed="' + (sel.indexOf(it.k) >= 0) + '">' + esc(it.label) + ' <small>' + it.n + '</small></button>'; }).join('') : '<span class="hint">none</span>'; }
  function renderPseCtl() {
    var on = S.mode === 'pse'; $('pseCtl').hidden = !on; if (!on) return;
    var f = S.f, sc = S.scope, feeTab = sc !== 'pipeline' && sc !== 'db' && sc !== 'watch' && sc !== 'advance';
    $('pcFee').hidden = !(feeTab || sc === 'watch' && false); $('pcPipe').hidden = sc !== 'pipeline'; $('pcDb').hidden = sc !== 'db'; $('pcAdv').hidden = sc !== 'advance'; $('advNote').innerHTML = TXP.adv || '';
    var fin = $('feeIn'); if (document.activeElement !== fin) fin.value = f.feeMin === null ? '' : +(f.feeMin / 1e6).toFixed(3);
    $('feeOp').innerHTML = f.inclusive ? '&ge;' : '&gt;';
    $('btnIncl').setAttribute('aria-pressed', String(!!f.inclusive)); $('btnIncl').classList.toggle('on', !!f.inclusive); $('btnIncl').textContent = f.inclusive ? '\u2265 on: exactly ' + M.fmtMoney(f.feeMin || 0) + ' included' : '\u2265 include exactly ' + M.fmtMoney(f.feeMin || 0);
    $('btnText').setAttribute('aria-pressed', String(!!f.noText)); $('btnText').classList.toggle('on', !!f.noText);
    var pre = [[5e6, '> $5M'], [10e6, '> $10M'], [20e6, '> $20M'], [50e6, '> $50M']];
    $('feePre').innerHTML = pre.map(function (x) { return '<button type="button" class="chip' + (f.feeMin === x[0] ? ' on' : '') + '" data-fee="' + x[0] + '" aria-pressed="' + (f.feeMin === x[0]) + '">' + x[1] + '</button>'; }).join('');
    var ex = feeTab ? PS.exactAtThreshold(RECS, filterFor(sc, f), WATCH) : [], en = $('exactNote');
    if (ex.length) { en.hidden = false; en.innerHTML = '<b>Exactly ' + esc(M.fmtMoneyFull(f.feeMin)) + ' &mdash; your cutoff is &gt;' + esc(M.fmtMoney(f.feeMin)) + ' (strictly greater), so ' + ex.length + ' record' + (ex.length === 1 ? ' is' : 's are') + ' not in the list.</b> Tap the &ge; button to include ' + (ex.length === 1 ? 'it' : 'them') + '.' + ex.slice(0, 6).map(function (r) { return '<button type="button" data-open="' + esc(r.id) + '">' + esc(r.title.slice(0, 110)) + ' &middot; ' + esc(r.agency) + '</button>'; }).join(''); }
    else en.hidden = true;
    var cin = $('costIn'); if (document.activeElement !== cin) cin.value = f.costMin === null ? '' : +(f.costMin / 1e6).toFixed(3);
    $('pipeNote').innerHTML = TXP.pipe;
    var din = $('dbIn'); if (document.activeElement !== din) din.value = f.dbMin === null ? '' : +(f.dbMin / 1e6).toFixed(3);
    if (sc === 'db') {
      var base = RECS.filter(function (r) { return r.lens === 'db'; }), cnt = function (fn) { return M.countBy(base, fn); }, cr = cnt(function (r) { return r.dbRole; }), ct = cnt(function (r) { return r.dbType; }), cs = cnt(function (r) { return r.stage; });
      $('dbRole').innerHTML = chipsHtml('dbRoles', DB_ROLES.map(function (x) { return { k: x[0], label: x[1], n: cr[x[0]] || 0 }; }), f.dbRoles);
      $('dbType').innerHTML = chipsHtml('dbTypes', Object.keys(ct).sort(function (a, b) { return ct[b] - ct[a]; }).map(function (k) { return { k: k, label: k, n: ct[k] }; }), f.dbTypes);
      $('dbStage').innerHTML = chipsHtml('dbStages', Object.keys(cs).sort(function (a, b) { return cs[b] - cs[a]; }).map(function (k) { return { k: k, label: ({ open: 'Open', forecast: 'Forecast', awarded: 'Awarded', closed: 'Closed', unclear: 'Status unclear' })[k] || k, n: cs[k] }; }), f.dbStages);
      $('dbNote').innerHTML = TXP.db;
    }
  }
  function renderDataPse() {
    var C = DATA.counts, gen = new Date(DATA.generatedAt), F = C.fee, D = C.db, P = C.pipeline, T = DATA.thresholds;
    $('dqFresh').innerHTML = '<p><b>Snapshot as of ' + esc(M.fmtDate(DATA.asOfDate)) + '</b> (US Central date), built ' + esc(gen.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })) + '. ' + C.total + ' records kept after removing ' + C.mergedDuplicates + ' duplicates (' + C.beforeDedupe + ' before).</p>' +
      '<p><b>Fee records</b> (a consultant fee / contract value the source states, data floor $5,000,000): <b>' + F.total + '</b>. Strictly over $5M: <b>' + F.strictGt5 + '</b>; exactly $5,000,000: <b>' + F.exact5 + '</b>; over $20M: <b>' + F.gt20 + '</b>. Confirmed (structured field, engineering notice, scope in title): <b>' + F.confirmedGt5 + '</b> of those over $5M; text-parsed: <b>' + F.textParsed + '</b>. Stages: ' + Object.keys(F.byStage).map(function (k) { return esc(k) + ' ' + F.byStage[k]; }).join(', ') + '.</p>' +
      '<p><b>Design-build</b> (value is a contract value / project cost, not a fee): <b>' + D.total + '</b>; prime ' + (D.byRole.prime || 0) + ', design-sub ' + (D.byRole.sub || 0) + ' (both inferred); with a stated value ' + D.withValue + '; with a separately stated design fee ' + D.withDesignFee + '.</p>' +
      '<p><b>Large projects, fee not published</b> (project cost, not fee): <b>' + P.total + '</b>; cost over $50M: ' + P.gt50 + '; over $100M: ' + P.gt100 + '.</p>' +
      (C.advance ? '<p><b>Advance notices, fee not stated</b> (agency forecasts; no fee filter applies): <b>' + C.advance.total + '</b>; with a source-stated value below $5M shown for information: ' + C.advance.withStatedValue + '. By source: ' + Object.keys(C.advance.bySrc).map(function (k) { return esc(SRC_SHORT[k] || k) + ' ' + C.advance.bySrc[k]; }).join(', ') + '.</p>' : '') +
      '<p><b>Excluded: construction</b> (clear construction contracts and supplies): <b>' + (C.excludedConstruction || 0).toLocaleString('en-US') + '</b> rows.</p>';
    var rows = DATA.sources.filter(function (s) { return s.stats; }).map(function (s) { var t = s.stats, b = t.byLens || {}; return '<tr><td>' + esc(SRC_SHORT[s.id] || s.id) + '</td>' + td(s.fetched) + td(t.evaluated) + td(b.fee) + td(b.db) + td(b.pipeline) + td(b.advance) + td(b.excluded) + td((t.excl || {}).construction) + td(t.exact5) + td(t.textParsed) + '</tr>'; }).join('');
    $('dqFunnel').innerHTML = '<table class="t"><thead><tr><th>Source</th><th>Rows read</th><th>Evaluated</th><th>Fee</th><th>Design-build</th><th>Large projects</th><th>Advance</th><th>Excluded</th><th>Excluded: construction</th><th>Exactly $5M</th><th>Text-parsed</th></tr></thead><tbody>' + rows + '</tbody></table><p class="note">"Rows read" is what the source returned; "Evaluated" is after cheap pre-filters inside each source. A design-build notice with a separately stated design fee counts once as Design-build and once as Fee. Counts are before cross-source de-duplication.</p>';
    var ex = DATA.counts.excludedByReason || {};
    var lbl = { 'construction': 'Construction contract / supply (excluded: construction)', 'not-design-services': 'Construction management, inspection, program support, IT or other non-design services',  'not-engineering': 'Not an engineering-services notice', 'no-scope-match': 'No PS&E / drainage / H&H / flood / stormwater / coastal wording', 'no-stated-fee': 'No fee stated and no qualifying project cost', 'project-cost-only': 'Only a project cost is stated (never a fee), and it does not qualify for Large projects', 'fee-below-5m': 'Stated fee below the $5,000,000 data floor', 'non-civil-context': 'Title looks non-civil (vessel, cyber, ESPC and similar)', 'outside-us': 'Outside the US', 'stale-no-deadline': 'No deadline and posted over 12 months ago', 'db-not-civil-scope': 'Design-build notice with no civil / drainage / roadway scope' };
    $('dqExcl').innerHTML = '<p>Rows failing each rule (a row can fail several):</p><ul>' + Object.keys(ex).sort(function (a, b) { return ex[b] - ex[a]; }).map(function (k) { return '<li><b>' + ex[k].toLocaleString('en-US') + '</b> ' + esc(lbl[k] || k) + '</li>'; }).join('') + '</ul>';
    var e5 = RECS.filter(function (r) { return r.lens === 'fee' && r.amt && r.amt.v === 5000000; });
    $('dqExcl').innerHTML += '<p>Records at <b>exactly $5,000,000</b> (visible in the list under the &ge; toggle, and in the note above the list): <b>' + e5.length + '</b>' + (e5.length ? '. ' + e5.map(function (x) { return '<a href="#" data-open="' + esc(x.id) + '">' + esc(x.title.slice(0, 90)) + '</a>'; }).join('; ') : '') + '.</p>';
    var miss = []; DATA.sources.forEach(function (s) { if (!s.stats) return; (s.stats.near || []).forEach(function (x) { miss.push(Object.assign({ src: s.id, k: 'Fee between $1M and $5M, below the floor' }, x)); }); (s.stats.constrNear || []).forEach(function (x) { miss.push(Object.assign({ src: s.id, k: 'Excluded: construction (value over $5M, scope names drainage / H&H / sector words)' }, x)); }); });
    miss.sort(function (a, b) { return (b.v || 0) - (a.v || 0); }); miss = miss.slice(0, 14);
    $('dqMiss').innerHTML = miss.length ? miss.map(function (x) { return '<div class="card static" style="--c:#64748b"><span class="lbl">' + esc(x.k) + '</span><span class="big" style="font-size:17px">' + esc(M.fmtMoneyFull(x.v)) + '</span><div class="t">' + esc(x.title) + '</div><div class="m"><span>' + esc(SRC_SHORT[x.src] || x.src) + '</span></div>' + (x.url ? '<div><a href="' + esc(x.url) + '" target="_blank" rel="noopener">Source link</a></div>' : '') + '</div>'; }).join('') : '<p class="note">None.</p>';
    $('dqSrc').innerHTML = DATA.sources.map(function (s) { return '<div class="card static" style="--c:' + (s.status === 'ok' ? '#34d399' : s.status === 'skipped' || s.status === 'disabled' ? '#94a3b8' : '#fb7185') + '"><div class="t">' + esc(s.name) + '</div><div class="m"><span>Status: <b>' + esc(s.status) + '</b></span><span>Rows read: ' + (s.fetched === undefined ? 'n/a' : s.fetched.toLocaleString('en-US')) + '</span><span>Kept: ' + (s.kept === undefined ? 'n/a' : s.kept) + '</span></div><div class="m"><span>' + esc(s.type || '') + '</span></div>' + (s.note ? '<p class="note" style="margin:6px 0">' + esc(s.note) + (s.error ? ' Error: ' + esc(s.error) : '') + '</p>' : '') + (s.page ? '<a href="' + esc(s.page) + '" target="_blank" rel="noopener">Source page</a>' : '') + '</div>'; }).join('');
    $('dqNo').innerHTML = (DATA.tested || []).map(function (x) { return '<div class="card static" style="--c:#64748b"><div class="t">' + esc(x.name) + '</div><p class="note" style="margin:4px 0">' + esc(x.result) + '</p></div>'; }).join('') + TX.notUsed.map(function (x) { return '<div class="card static" style="--c:#64748b"><div class="t">' + esc(x[0]) + '</div><p class="note" style="margin:4px 0">' + esc(x[2]) + '</p>' + (x[1] ? '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">Page</a>' : '') + '</div>'; }).join('');
    $('dqRules').innerHTML = '<ul>' + TXP.rules.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul><p class="note">Illustrative fee range (pipeline only): ' + esc(T.illustrative.cite) + ' <a href="' + esc(T.illustrative.url) + '" target="_blank" rel="noopener">Source</a></p>';
  }

  // ---------- map ----------
  var mapBuilt = false, project = null;
  function buildMap() {
    if (mapBuilt || !G) return; mapBuilt = true; project = window.NationalProj.make(G.proj);
    var html = '<g id="gSt">'; Object.keys(G.states).forEach(function (k) { html += '<path class="st" data-st="' + k + '" d="' + G.states[k].d + '"><title>' + esc(G.states[k].n) + '</title></path>'; });
    $('usmap').innerHTML = html + '</g><g id="gBub"></g><g id="gPin"></g>';
  }
  // v6: count markers (no dollar-sized bubbles); dollar value in the tooltip and on tap. Shared by the full map and the small map.
  function stateTotals(list) { var by = {}; list.forEach(function (r) { if (!r.state) return; var o = by[r.state] = by[r.state] || { n: 0, v: 0, nv: 0 }; o.n++; var v = fee(r); if (v) { o.v += v; o.nv++; } }); return by; }
  function stateTip(k, o) { return (M.STATE_NAMES[k] || k) + ': ' + o.n + ' record' + (o.n === 1 ? '' : 's') + (o.v ? ' · ' + M.fmtMoney(o.v) + ' stated by ' + o.nv + ' of them (fees, design-build values and project costs as the sources state them)' : ' · count only, no stated value'); }
  function markersHtml(by, small) {
    var out = ''; Object.keys(by).forEach(function (k) { var g = G.states[k]; if (!g) return; var o = by[k], r = small ? (o.n > 99 ? 24 : 19) : (o.n > 99 ? 19 : 15);
      out += '<g class="mkg' + (S.f.states.indexOf(k) >= 0 ? ' sel' : '') + '" data-st="' + k + '"><circle class="mk' + (o.v ? '' : ' cnt') + '" data-st="' + k + '" cx="' + g.cx + '" cy="' + g.cy + '" r="' + r + '"><title>' + esc(stateTip(k, o)) + '</title></circle><text class="mkt' + (small ? ' sm' : '') + '" x="' + g.cx + '" y="' + (g.cy + (small ? 8 : 6)) + '">' + o.n + '</text></g>'; });
    return out;
  }
  var miniBuilt = false;
  function renderMini(list) {
    if (!G) { $('mini').hidden = true; return; }
    if (!miniBuilt) { miniBuilt = true; var h = '<g class="gSt">'; Object.keys(G.states).forEach(function (k) { h += '<path class="st" data-st="' + k + '" d="' + G.states[k].d + '"><title>' + esc(G.states[k].n) + '</title></path>'; }); $('usmini').innerHTML = h + '</g><g class="gMk"></g>'; }
    var by = stateTotals(list); $('usmini').querySelectorAll('.st').forEach(function (p) { var k = p.getAttribute('data-st'); p.classList.toggle('sel', S.f.states.indexOf(k) >= 0); p.classList.toggle('has', !!by[k]); });
    $('usmini').querySelector('.gMk').innerHTML = markersHtml(by, true);
    var sel = S.f.states; $('miniSel').textContent = sel.length ? 'showing ' + sel.join(', ') + ' (tap again to remove)' : 'tap a state to filter the list'; $('miniSel2').textContent = $('miniSel').textContent; if (WIDE.matches) $('miniDet').open = true;
    var nost = list.filter(function (r) { return !r.state; }).length; $('miniNote').textContent = Object.keys(by).length + ' states' + (nost ? ' · ' + nost + ' with no state' : '');
  }
  function renderMap(list) {
    buildMap(); if (!G) { $('usmap').innerHTML = ''; return; }
    var by = stateTotals(list); document.querySelectorAll('#gSt .st').forEach(function (p) { var k = p.getAttribute('data-st'); p.classList.toggle('sel', S.f.states.indexOf(k) >= 0); p.classList.toggle('has', !!by[k]); });
    $('gBub').innerHTML = markersHtml(by, false);
    var pins = ''; list.forEach(function (r) { if (r.lat && r.lon) { var xy = project(r.lon, r.lat, r.state); pins += '<circle class="pin" data-open="' + esc(r.id) + '" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="5"><title>' + esc(r.title) + '</title></circle>'; } });
    $('gPin').innerHTML = pins;
    var nostate = list.filter(function (r) { return !r.state; }).length, pinned = list.filter(function (r) { return r.lat; }).length;
    $('legend').innerHTML = '<span><i class="lg-v"></i>Number = records in the state; blue = some records state a dollar value (hover or tap for the total)</span><span><i class="lg-c"></i>Amber = count only (no stated value)</span><span><i class="lg-p"></i>Pin = city named in the source (' + pinned + ')</span>';
    $('mapNote').textContent = (list.length ? 'Tap a state to filter the list by it. ' : '') + (nostate ? nostate + ' record(s) name no state (for example nationwide contracts) and are not on the map; they are in the List. ' : '');
    var top = sortFor(list, S.sort).slice(0, 5);
    $('topHint').textContent = list.length > 5 ? '(5 of ' + list.length + ')' : '';
    cardsInto($('mapTop'), top, emptyScopeHtml());
  }
  function renderMapV5(list) { // dormant (v5 dollar bubbles), kept for rollback reference
    buildMap(); if (!G) { $('usmap').innerHTML = ''; return; }
    var byState = {}; list.forEach(function (r) { if (!r.state) return; var o = byState[r.state] = byState[r.state] || { n: 0, v: 0 }; o.n++; o.v += fee(r); });
    var max = 0; Object.keys(byState).forEach(function (k) { max = Math.max(max, byState[k].v); });
    document.querySelectorAll('#gSt .st').forEach(function (p) { p.classList.toggle('sel', S.f.states.indexOf(p.getAttribute('data-st')) >= 0); });
    var b = '';
    Object.keys(byState).forEach(function (k) {
      var g = G.states[k]; if (!g) return; var o = byState[k], cnt = !o.v, r = cnt ? 16 + Math.min(8, o.n) : 20 + 28 * Math.sqrt(o.v / max);
      b += '<g data-st="' + k + '"><circle class="bub' + (cnt ? ' cnt' : '') + '" data-st="' + k + '" cx="' + g.cx + '" cy="' + g.cy + '" r="' + r.toFixed(1) + '"><title>' + esc((M.STATE_NAMES[k] || k) + ': ' + o.n + ' record(s)' + (o.v ? ', ' + M.fmtMoney(o.v) + ' stated' : '')) + '</title></circle><text class="bubt" x="' + g.cx + '" y="' + (g.cy + 7) + '">' + esc(cnt ? o.n : M.fmtMoney(o.v)) + '</text></g>';
    });
    $('gBub').innerHTML = b;
    var pins = ''; list.forEach(function (r) { if (r.lat && r.lon) { var xy = project(r.lon, r.lat, r.state); pins += '<circle class="pin" data-open="' + esc(r.id) + '" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="6"><title>' + esc(r.title) + '</title></circle>'; } });
    $('gPin').innerHTML = pins;
    var nostate = list.filter(function (r) { return !r.state; }).length, pinned = list.filter(function (r) { return r.lat; }).length;
    $('legend').innerHTML = '<span><i style="background:rgba(124,183,255,.5)"></i>Bubble size = sum of stated values in this view</span><span><i style="background:rgba(251,191,36,.5)"></i>Amber = count only (no stated value)</span><span><i style="background:#fb7185"></i>Pin = city named in the source (' + pinned + ')</span>';
    $('mapNote').textContent = (list.length ? 'Tap a state to filter by it. ' : '') + (nostate ? nostate + ' record(s) name no state (for example nationwide contracts) and are not on the map; they are in the List. ' : '') + 'Pins appear only when the source names a city that matches one place; otherwise only the state bubble is shown.';
    var top = sortFor(list, 'fee').slice(0, 5);
    $('topHint').textContent = list.length > 5 ? '(5 of ' + list.length + ', by stated value)' : '';
    cardsInto($('mapTop'), top, emptyScopeHtml());
  }

  // ---------- list ----------
  function renderList(list) {
    var sorted = sortFor(list, S.sort), shown = sorted.slice(0, S.rows);
    $('listCount').textContent = list.length + ' record' + (list.length === 1 ? '' : 's');
    cardsInto($('list'), shown, emptyScopeHtml());
    $('btnMoreRows').hidden = sorted.length <= S.rows;
  }

  // ---------- timeline ----------
  function dateKey(r) { var d = r.dates || {}; return S.scope === 'recompete' ? d.end : (r.status === 'awarded' || r.bucket === 'closed') ? (d.award || d.posted) : (d.due || d.est || d.posted); }
  function mlabel(k) { var m = /^(\d{4})-(\d{2})/.exec(k); return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + " '" + m[1].slice(2); }
  function renderTimeline(list) {
    var by = {}, none = 0; list.forEach(function (r) { var k = M.monthKey(dateKey(r)); if (!k) { none++; return; } (by[k] = by[k] || []).push(r); });
    var keys = Object.keys(by).sort(), max = 1; keys.forEach(function (k) { max = Math.max(max, by[k].length); });
    $('tl').innerHTML = keys.length ? keys.map(function (k) { return '<button type="button" class="tlb' + (S.tlMonth === k ? ' on' : '') + '" data-month="' + k + '" aria-label="' + mlabel(k) + ': ' + by[k].length + ' records"><b>' + by[k].length + '</b><i style="height:' + Math.max(6, 120 * by[k].length / max) + 'px"></i>' + mlabel(k) + '</button>'; }).join('') : '<span class="hint">no dated records in this view</span>';
    $('tlNote').textContent = 'Dates used: ' + (S.scope === 'recompete' ? 'contract end date (inferred recompete)' : S.scope === 'awards' ? 'award date' : 'response due date, else the agency forecast date, else posted date') + (none ? '. ' + none + ' record(s) have no date.' : '.');
    var sel = S.tlMonth && by[S.tlMonth] ? by[S.tlMonth] : sortFor(list, 'date').slice(0, 12);
    $('tlSel').textContent = S.tlMonth && by[S.tlMonth] ? mlabel(S.tlMonth) + ' (' + sel.length + ')' : 'Soonest dates';
    cardsInto($('tlList'), sel, emptyScopeHtml());
  }

  // ---------- breakdown ----------
  function bars(elId, key, groups, labelFn, toggle) {
    var ks = Object.keys(groups).sort(function (a, b) { return (groups[b].v - groups[a].v) || (groups[b].n - groups[a].n) || (a < b ? -1 : 1); }).slice(0, 25), max = 1;
    ks.forEach(function (k) { max = Math.max(max, groups[k].v || groups[k].n); });
    $(elId).innerHTML = ks.length ? ks.map(function (k) { var g = groups[k]; return '<button type="button" class="bar" ' + (toggle ? 'data-f="' + key + '" data-k="' + esc(k) + '"' : '') + '><span class="n">' + esc(labelFn(k)) + '</span><span class="tr"><i style="width:' + Math.max(3, 100 * (g.v || g.n) / max) + '%"></i></span><span class="v">' + (g.v ? esc(M.fmtMoney(g.v)) + ' · ' : '') + g.n + '</span></button>'; }).join('') : '<p class="note">Nothing in this view.</p>';
  }
  function group(list, fn) { var m = {}; list.forEach(function (r) { [].concat(fn(r)).forEach(function (k) { if (k === null || k === undefined) return; var o = m[k] = m[k] || { n: 0, v: 0 }; o.n++; o.v += fee(r); }); }); return m; }
  function renderBreak(list) {
    bars('bState', 'states', group(list, function (r) { return r.state || '??'; }), function (k) { return k === '??' ? 'State not stated' : (M.STATE_NAMES[k] || k); }, true);
    bars('bAgency', 'agencies', group(list, function (r) { return r.agency; }), function (k) { return k; }, true);
    bars('bSector', 'sectors', group(list, function (r) { return r.sectors || []; }), function (k) { return secLabel(k); }, true);
    bars('bSource', 'sources', group(list, function (r) { return r.src; }), function (k) { return SRC_SHORT[k] || k; }, true);
  }

  // ---------- data quality ----------
  function td(v) { return '<td>' + (v === undefined || v === null ? '0' : esc(typeof v === 'number' ? v.toLocaleString('en-US') : v)) + '</td>'; }
  function renderDataRoad() {
    var gen = new Date(DATA.generatedAt), C = DATA.counts, cs = C.byCost || {};
    $('dqFresh').innerHTML = '<p><b>Roadway snapshot as of ' + esc(M.fmtDate(DATA.asOfDate)) + '</b> (US Central date), built ' + esc(gen.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })) + '. ' + C.total + ' records kept after removing ' + C.mergedDuplicates + ' duplicates (' + C.beforeDedupe + ' before).</p><p>Tabs: drainage-specific fee &gt; $5M, open/upcoming: <b>' + C.drainOpen + '</b>; total fee &gt; $20M with drainage named: <b>' + C.totalOpen + '</b>; needs review: <b>' + C.review + '</b>; awards: <b>' + C.awards + '</b>.</p><p>Construction cost base on kept records: stated by the source <b>' + (cs.stated || 0) + '</b>, estimated (not from source) <b>' + (cs.estimated || 0) + '</b>, insufficient scope <b>' + (cs.insufficient || 0) + '</b>. Unit prices: TxDOT low-bid averages, lettings ' + esc((DATA.priceMeta || {}).let_date_min || '') + ' to ' + esc((DATA.priceMeta || {}).let_date_max || '') + '.</p>';
    function sm(t, f) { var n = 0; Object.keys(t.rw || {}).forEach(function (k) { if (f(k)) n += t.rw[k]; }); return n; }
    var rows = DATA.sources.filter(function (s) { return s.stats; }).map(function (s) {
      var t = s.stats, b = t.byBucket || {};
      return '<tr><td>' + esc(SRC_SHORT[s.id] || s.id) + '</td>' + td(s.fetched) + td(t.evaluated) + td((t.eng || {}).strong) + td((t.road || {}).strong) + td(t.drainSpecific) + td(sm(t, function (k) { return k.indexOf('drain:') === 0; })) + td(sm(t, function (k) { return k.indexOf('total:') === 0; })) + td(b.opp) + td(b.review) + td(b.award) + td(b.excluded) + td(t.exact5) + '</tr>';
    }).join('');
    $('dqFunnel').innerHTML = '<table class="t"><thead><tr><th>Source</th><th>Rows read</th><th>Evaluated</th><th>Engineering</th><th>Roadway context</th><th>Drainage-specific</th><th>Drain fee &gt; $5M (any stage)</th><th>Total &gt; $20M + drainage named (any stage)</th><th>Open/upcoming kept</th><th>Review</th><th>Award</th><th>Excluded</th><th>At exactly $5M</th></tr></thead><tbody>' + rows + '</tbody></table><p class="note">Columns count rows passing each rule on its own (not cumulative). "Any stage" counts rows that passed the fee test before status and other rules; they may still be excluded or awards. "Drainage-specific" = the title or a structured field names drainage/hydraulics/stormwater/culvert. "At exactly $5M" rows are excluded: the drainage fee must be strictly greater.</p>';
    var ex = {}, e5 = [], tot = 0; DATA.sources.forEach(function (s) { if (!s.stats) return; Object.keys(s.stats.excl || {}).forEach(function (k) { ex[k] = (ex[k] || 0) + s.stats.excl[k]; }); (s.stats.exact5Rows || []).forEach(function (x) { e5.push(x); }); tot += (s.stats.byBucket || {}).excluded || 0; });
    $('dqExcl').innerHTML = '<p>' + tot.toLocaleString('en-US') + ' evaluated rows were excluded. Rows failing each rule (a row can fail several):</p><ul>' + Object.keys(ex).sort(function (a, b) { return ex[b] - ex[a]; }).map(function (k) { return '<li><b>' + ex[k].toLocaleString('en-US') + '</b> ' + esc(EXCL_LABEL[k] || k) + '</li>'; }).join('') + '</ul><p>Rows whose drainage-specific fee is <b>exactly $5,000,000</b> (excluded by the strict rule): <b>' + e5.length + '</b>' + (e5.length ? '. ' + e5.map(function (x) { return esc(x.title) + (x.url ? ' (<a href="' + esc(x.url) + '" target="_blank" rel="noopener">source</a>)' : ''); }).join('; ') : '') + '.</p>';
    var miss = []; DATA.sources.forEach(function (s) { if (s.stats) (s.stats.near || []).forEach(function (x) { miss.push(Object.assign({ src: s.id }, x)); }); });
    miss.sort(function (a, b) { return (b.v || 0) - (a.v || 0); }); miss = miss.slice(0, 12);
    $('dqMiss').innerHTML = miss.length ? miss.map(function (x) { return '<div class="card static" style="--c:#64748b"><span class="lbl">Drainage-specific, excluded: ' + esc(x.why.split(', ').map(function (k) { return EXCL_LABEL[k] || k; }).join('; ')) + '</span><span class="big" style="font-size:17px">' + esc(x.v ? M.fmtMoneyFull(x.v) : 'no amount stated') + '</span><div class="t">' + esc(x.title) + '</div><div class="m"><span>' + esc(SRC_SHORT[x.src] || x.src) + '</span></div>' + (x.url ? '<div><a href="' + esc(x.url) + '" target="_blank" rel="noopener">Source link</a></div>' : '') + '</div>'; }).join('') : '<p class="note">None.</p>';
    $('dqSrc').innerHTML = DATA.sources.map(function (s) { return '<div class="card static" style="--c:' + (s.status === 'ok' ? '#34d399' : s.status === 'skipped' || s.status === 'disabled' ? '#94a3b8' : '#fb7185') + '"><div class="t">' + esc(s.name) + (s.roadwayOnly ? ' (roadway lane only)' : '') + '</div><div class="m"><span>Status: <b>' + esc(s.status) + '</b></span><span>Rows read: ' + (s.fetched === undefined ? 'n/a' : s.fetched.toLocaleString('en-US')) + '</span><span>Kept: ' + (s.kept === undefined ? 'n/a' : s.kept) + '</span></div><div class="m"><span>' + esc(s.type || '') + '</span></div>' + (s.note ? '<p class="note" style="margin:6px 0">' + esc(s.note) + '</p>' : '') + (s.page ? '<a href="' + esc(s.page) + '" target="_blank" rel="noopener">Source page</a>' : '') + '</div>'; }).join('');
    $('dqNo').innerHTML = (DATA.tested || []).map(function (x) { return '<div class="card static" style="--c:#64748b"><div class="t">' + esc(x.name) + '</div><div class="m"><span>Reachable and readable: <b>' + (x.works ? 'yes' : 'no') + '</b></span><span>In the build: <b>no</b></span></div>' + (x.fields ? '<p class="note" style="margin:4px 0">Fields: ' + esc(x.fields) + '</p>' : '') + '<p class="note" style="margin:4px 0">' + esc(x.finding) + '</p>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">Page</a>' : '') + '</div>'; }).join('');
    $('dqRules').innerHTML = '<ul>' + TXR.rules.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>';
  }
  function renderHealth() { // v3: short summary first; the detailed tables stay below in expanders
    var src = DATA.sources || [], ok = src.filter(function (x) { return x.status === 'ok'; }).length, bad = src.filter(function (x) { return x.status === 'failed' || x.status === 'stale'; }), off = src.filter(function (x) { return x.status === 'disabled' || x.status === 'skipped'; }).length;
    var gen = new Date(DATA.generatedAt), age = Math.max(0, Math.floor((Date.now() - gen.getTime()) / 86400000));
    $('dqHealth').innerHTML = '<p><span class="dot ' + (bad.length ? 'warn' : 'ok') + '"></span> <b>' + ok + ' of ' + src.length + ' sources OK</b>' + (off ? ' &middot; ' + off + ' turned off' : '') + (bad.length ? ' &middot; <b>' + bad.length + ' stale or failed</b> (' + esc(bad.map(function (x) { return SRC_SHORT[x.id] || x.name || x.id; }).join(', ')) + ')' : '') + '</p>' +
      '<p>Data updated <b>' + esc(M.fmtDate(DATA.asOfDate)) + '</b> (' + (age < 1 ? 'today' : age + ' day' + (age === 1 ? '' : 's') + ' ago') + ') &middot; refreshed automatically every morning.</p>' +
      '<p><b>' + (DATA.records || []).length + '</b> records in total. Open the sections below for per-source counts and rules.</p>';
  }
  function fmtWhen(iso) { if (!iso) return 'never'; var d = new Date(iso); return isNaN(d) ? 'unknown' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  // ---------- v4.3: since you last visited + calendar ----------
  var VISIT = V4.visitBaseline(lsx, ssn, new Date().toISOString());
  function allRecs() { var o = {}; [DATA_P, DATA_W, DATA_R].forEach(function (d) { if (d) d.records.forEach(function (r) { if (!o[r.id]) o[r.id] = r; }); }); return o; }
  function renderSince() {
    var el = $('since'), dis = null; try { dis = ssn && ssn.getItem(V4.SINCE_DISMISS); } catch (e) { dis = null; }
    if (!VISIT || dis || !DATA) { el.hidden = true; return; }
    var base = post(scopedRaw(S.scope), true), t = todayCentral();
    var nNew = digestOf(base, 'new').length, nSoon = digestOf(base, 'soon').length, nChg = base.filter(function (r) { return V4.changedSince(r, VISIT); }).length, st = HEALTH ? V4.newlyStale(HEALTH.all, VISIT) : [];
    var pur = V2.pursuitRows(WATCH, CAP, function () { return null; }, t, CP).filter(function (r) { return r.flag === 'soon' || r.flag === 'overdue'; }).length;
    var it = [], b = function (k, n, txt, cls) { if (n) it.push('<button type="button" class="sinb' + (cls ? ' ' + cls : '') + '" data-since="' + k + '"><b>' + n + '</b> ' + txt + '</button>'); };
    b('new', nNew, 'new'); b('soon', nSoon, 'closing soon'); b('changed', nChg, 'changed'); b('pursuits', pur, 'pursuit' + (pur === 1 ? '' : 's') + ' due soon'); b('stale', st.length, 'source' + (st.length === 1 ? '' : 's') + ' newly stale', 'warn');
    if (!it.length) { el.hidden = true; return; }
    el.innerHTML = '<div class="sinh"><span>Since your last visit <span class="hint">' + esc(new Date(VISIT).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</span></span><button type="button" class="sinx" id="sinceX" aria-label="Dismiss the since-last-visit summary">&times;</button></div><div class="sinl">' + it.join('') + '</div>';
    el.hidden = false;
  }
  function sinceTap(k) {
    if (k === 'pursuits') { setTab('pursuits'); return; }
    if (k === 'stale') { setTab('data'); setTimeout(function () { var h = $('srcHealthH'); if (h) h.scrollIntoView(); }, 60); return; }
    S.digest = k; S.rows = 50; render();
  }
  function dlFile(name, text, type) { var a = document.createElement('a'), u = URL.createObjectURL(new Blob([text], { type: type })); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 500); }
  function exportPursuitIcs() {
    var all = allRecs(), rows = V2.pursuitRows(WATCH, CAP, function (id) { return all[id] || null; }, todayCentral(), CP), ev = [];
    rows.forEach(function (row) { ev = ev.concat(V4.eventsFor(all[row.id] || null, row.cap, row.title)); });
    if (!ev.length) { toast('No due dates yet: add a due date in a capture file, or star a record that states one.'); return; }
    dlFile('national-radar-pursuits.ics', V4.ics(ev, new Date().toISOString(), 'National Radar: My pursuits'), 'text/calendar');
    toast(ev.length + ' calendar event' + (ev.length === 1 ? '' : 's') + ' saved, with reminders 1 week and 1 day before each due date.');
  }
  function exportViewIcs() {
    var ev = []; scoped().forEach(function (r) { ev = ev.concat(V4.eventsFor(r, CAP[r.id] || null, r.title)); });
    if (!ev.length) { toast('No records in this view state a due date.'); return; }
    dlFile('national-radar-view.ics', V4.ics(ev, new Date().toISOString(), 'National Radar: due dates'), 'text/calendar'); toast(ev.length + ' due date' + (ev.length === 1 ? '' : 's') + ' saved.');
  }
  // ---------- v4.4: empty states with a one-tap way out, collapsible top list, docked detail on wide screens ----------
  function emptyActions() {
    var a = [], b = function (k, t) { a.push('<button type="button" class="btn small" data-way="' + k + '">' + t + '</button>'); };
    if (S.digest) b('digest', 'Show everything (not only ' + ({ 'new': 'New', soon: 'Closing soon', changed: 'Changed' })[S.digest] + ')');
    if (activeCount() > 0) b('clear', 'Clear filters');
    if (CONF) b('conf', 'Include unconfirmed');
    if (S.scope !== 'all' && S.scope !== 'watch') b('scope', 'Show all records');
    return '<div class="ways">' + a.join('') + '</div>';
  }
  function wayOut(k) {
    if (k === 'digest') S.digest = null;
    else if (k === 'clear') { resetFilters(); return; }
    else if (k === 'conf') setConf(false);
    else if (k === 'scope') S.scope = 'all';
    S.rows = 50; render();
  }
  var WIDE = window.matchMedia ? matchMedia('(min-width: 1200px)') : { matches: false };
  function initTopDet() {
    var d = $('topDet'), v = null; try { v = localStorage.getItem('nr.topOpen'); } catch (e) { v = null; }
    d.open = v === null ? WIDE.matches : v === '1';
    d.addEventListener('toggle', function () { try { localStorage.setItem('nr.topOpen', d.open ? '1' : '0'); } catch (e) { /* private mode */ } });
  }
  function renderHealthDot() {
    var n = HEALTH ? HEALTH.bad.length : 0, t = n ? n + ' source' + (n === 1 ? ' is' : 's are') + ' stale or failing; see Data & sources' : '';
    $('healthDot').hidden = !n; $('healthDot').title = t; $('healthWarn').hidden = !n; $('healthWarn').textContent = n ? n + ' stale' : '';
    $('tabMoreBtn').setAttribute('aria-label', 'More' + (n ? ' (' + t + ')' : ''));
  }
  function renderSrcHealth() {
    var el = $('srcHealth'); if (!el) return;
    if (!HEALTH || !HEALTH.all.length) { el.innerHTML = '<p class="note">Source status is not available yet; it is written by the next daily refresh.</p>'; return; }
    var order = { failing: 0, stale: 1, fresh: 2 }, lbl = { fresh: 'Fresh', stale: 'Stale', failing: 'Failing', disabled: 'Off', skipped: 'Off' };
    var c = HEALTH.counts, h = '<p class="srcsum"><span class="hp fresh">' + c.fresh + ' fresh</span> <span class="hp stale">' + c.stale + ' stale</span> <span class="hp failing">' + c.failing + ' failing</span>' + (c.off ? ' <span class="hp off">' + c.off + ' off</span>' : '') + '</p>';
    ['national', 'texas'].forEach(function (g) {
      var rows = HEALTH.all.filter(function (s) { return s.group === g; }); if (!rows.length) return;
      rows.sort(function (a, b) { return ((order[a.health] === undefined ? 3 : order[a.health]) - (order[b.health] === undefined ? 3 : order[b.health])) || (a.name < b.name ? -1 : 1); });
      h += '<h3 class="srcg">' + esc(V4.GROUP_LABEL[g] || g) + '</h3><ul class="srcl">' + rows.map(function (s) {
        return '<li class="srci ' + esc(s.health) + '"><div class="srcn"><span class="hp ' + esc(s.health) + '">' + esc(lbl[s.health] || s.health) + '</span> ' + esc(s.name) + '</div>' +
          '<div class="srcm">Last successful refresh: <b>' + esc(fmtWhen(s.lastSuccess)) + '</b> &middot; ' + (s.records || 0) + ' records' + (s.failingSince ? ' &middot; failing since ' + esc(fmtWhen(s.failingSince)) : '') + '</div>' +
          (s.error ? '<div class="srce">Reason: ' + esc(String(s.error).replace(/ for https?:\/\/\S+/g, '')) + '</div>' : '') + '</li>';
      }).join('') + '</ul>';
    });
    el.innerHTML = h;
  }
  var BANNER_ALL = '<b>Consultant engineering pursuits from public sources, all in one list.</b> Every record shows the dollar figure exactly as the source states it (a fee, a contract value, a design-build value or a project cost; the label says which). Nothing is hidden by a fee threshold: use Filters to set a minimum amount, a region, a stage or Confirmed only.';
  var HOW_ALL = '<p><b>What is included.</b> Consultant engineering notices, forecasts and awards (design, PS&amp;E, H&amp;H, water, drainage, roadway design) from public federal, state and city feeds, refreshed every morning. Construction contracts and supplies are left out.</p>' +
    '<p><b>No value floor.</b> Water, wastewater, stormwater, drainage, flood and resilience engineering notices are kept with or without an amount. When the source states none, the record says <i>Fee/amount not stated</i>; nothing is estimated. <b>Positionable</b> marks open or forecast work whose response date is at least 14 days away (or not yet set).</p>' +
    '<p><b>Dollar figures.</b> Shown exactly as the source states them, with the source field named. A design-build value or a project cost is labeled as such and is not a consultant fee. Nothing is estimated as a fee.</p>' +
    '<p><b>Confirmed.</b> The amount comes from a structured field and the scope is named in the title. Records that rely on text parsing or inferred scope are marked so you can check the source. Confirmed only hides the rest.</p>' +
    '<p><b>Same opportunity, several sources.</b> Listed once, with the other sources shown on the card and in the detail view.</p>';
  var V5_TESTED = [
    ['EPA Clean Water and Drinking Water SRF public portal (all states, DC, Puerto Rico)', 'USED: open public map layers, no key. Funded water / wastewater projects (agreements since 2025, not finished) that name planning / design or have not started. The SRF agreement amount is financing to the borrower, shown as a field, never as a fee.'],
    ['EPA SRF public portal report download', 'Tested, not used: the download needs an interactive browser session, not an open endpoint.'],
    ['State SRF Intended Use Plans / Project Priority Lists', 'Tested, not used as a feed: each state posts PDFs or spreadsheets with changing addresses; the EPA SRF layers carry the funded projects for every state in one open interface.'],
    ['Open-data catalogs (Socrata) for SRF lists, capital plans and water procurement forecasts', 'Tested, not used: no state SRF list datasets; the city capital-plan tables found (Norfolk VA, Pierce County WA, Ramsey County MN) carry budgets, not procurement dates.'],
    ['SAM.gov opportunities API', 'Not used: needs an API key. Federal notices come from the public SAM.gov data extract instead.'],
    ['Award history below $5M (USAspending, NYC, Chicago, Austin award queries)', 'Kept at their earlier query floors on purpose: lowering them would add thousands of small past awards and bury upcoming work. Stated fees of any size from open / forecast notices are now kept.']
  ];
  function renderDataAll() {
    var gen = new Date(DATA.generatedAt), bySrc = M.countBy(RECS, function (r) { return r.src; }), st = M.countBy(RECS, function (r) { return C.stageOf(r); });
    $('dqFresh').innerHTML = '<p><b>Snapshot as of ' + esc(M.fmtDate(DATA.asOfDate)) + '</b> (US Central date), built ' + esc(gen.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })) + '. <b>' + RECS.length + '</b> records after removing duplicates. Stages: ' + Object.keys(st).map(function (k) { return esc(C.STAGE_LABEL[k] || k) + ' ' + st[k]; }).join(', ') + '.</p>';
    $('dqFunnel').innerHTML = '<table class="t"><thead><tr><th>Source</th><th>Records</th><th>With a stated amount</th></tr></thead><tbody>' + Object.keys(bySrc).sort(function (a, b) { return bySrc[b] - bySrc[a]; }).map(function (k) { var n = RECS.filter(function (r) { return r.src === k && fee(r); }).length; return '<tr><td>' + esc(SRC_SHORT[k] || k) + '</td>' + td(bySrc[k]) + td(n) + '</tr>'; }).join('') + '</tbody></table>';
    $('dqSrc').innerHTML = DATA.sources.map(function (s) { return '<div class="card static" style="--c:' + (s.status === 'ok' ? '#34d399' : s.status === 'skipped' || s.status === 'disabled' ? '#94a3b8' : '#fb7185') + '"><div class="t">' + esc(s.name) + '</div><div class="m"><span>Status: <b>' + esc(s.status) + '</b></span><span>Records: ' + (bySrc[s.id] || 0) + '</span></div></div>'; }).join('');
    $('dqNo').innerHTML = V5_TESTED.map(function (x) { return '<div class="card static" style="--c:#64748b"><div class="t">' + esc(x[0]) + '</div><p class="note" style="margin:4px 0">' + esc(x[1]) + '</p></div>'; }).join('') + TX.notUsed.map(function (x) { return '<div class="card static" style="--c:#64748b"><div class="t">' + esc(x[0]) + '</div><p class="note" style="margin:4px 0">' + esc(x[2]) + '</p></div>'; }).join('');
    $('dqRules').innerHTML = HOW_ALL;
  }
  function renderData() {
    if (!DATA) return;
    renderHealth(); renderSrcHealth();
    renderDataAll(); return;
    var gen = new Date(DATA.generatedAt);
    $('dqFresh').innerHTML = '<p><b>Snapshot as of ' + esc(M.fmtDate(DATA.asOfDate)) + '</b> (US Central date), built ' + esc(gen.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })) + '. Deadlines are compared against that date. ' + DATA.counts.total + ' records kept after removing ' + DATA.counts.mergedDuplicates + ' duplicates (' + DATA.counts.beforeDedupe + ' before).</p><p>Kept records: ' + Object.keys(DATA.counts.byBucket).map(function (k) { return esc(({ opp: 'confirmed upcoming/open', review: 'needs review', nofee: 'fee not stated', award: 'awards', closed: 'closed solicitations' })[k] || k) + ' ' + DATA.counts.byBucket[k]; }).join(', ') + '. <b>Recompete watch</b>: ' + DATA.counts.recompete + ' (inferred).</p>';
    var rows = DATA.sources.filter(function (s) { return s.stats; }).map(function (s) {
      var t = s.stats, b = t.byBucket || {}, sc = t.sector || {}, per = SRC_SHORT[s.id] || s.id;
      return '<tr><td>' + esc(per) + '</td>' + td(t.fetched) + td(t.evaluated) + td((t.eng || {}).strong) + td((sc.title || 0) + (sc.strong || 0)) + td((t.fee || {}).above) + td(b.opp) + td(b.review) + td(b.nofee) + td(b.award) + td(b.closed) + td(b.excluded) + td(t.exact20) + '</tr>';
    }).join('');
    $('dqFunnel').innerHTML = '<table class="t"><thead><tr><th>Source</th><th>Rows read</th><th>Evaluated</th><th>Engineering</th><th>Sector</th><th>Fee &gt; $20M</th><th>Open/upcoming</th><th>Review</th><th>Fee n/s</th><th>Award</th><th>Closed</th><th>Excluded</th><th>At exactly $20M</th></tr></thead><tbody>' + rows + '</tbody></table><p class="note">Engineering, Sector and Fee columns count rows that pass each rule on its own (not cumulative). "Evaluated" is after a cheap pre-filter (for SAM.gov: engineering or construction NAICS/PSC only). "At exactly $20M" rows are excluded: the fee must be strictly greater.</p>';
    var prim = {}, ex = 0; DATA.sources.forEach(function (s) { if (!s.stats) return; Object.keys(s.stats.primary || {}).forEach(function (k) { prim[k] = (prim[k] || 0) + s.stats.primary[k]; }); ex += s.stats.exact20 || 0; });
    var tot = Object.keys(prim).reduce(function (a, k) { return a + prim[k]; }, 0);
    $('dqExcl').innerHTML = '<p>' + tot.toLocaleString('en-US') + ' evaluated rows were excluded. First failing rule per row (a row can fail several):</p><ul>' + Object.keys(prim).sort(function (a, b) { return prim[b] - prim[a]; }).map(function (k) { return '<li><b>' + prim[k].toLocaleString('en-US') + '</b> ' + esc(EXCL_LABEL[k] || k) + '</li>'; }).join('') + '</ul><p>Rows whose stated fee is <b>exactly $20,000,000</b> (excluded by the strict rule): <b>' + ex + '</b>.</p>';
    var miss = []; DATA.sources.forEach(function (s) { if (s.stats) Object.keys(s.stats.samples || {}).forEach(function (reason) { (s.stats.samples[reason] || []).forEach(function (x) { miss.push(Object.assign({ reason: reason, src: s.id }, x)); }); }); });
    miss.sort(function (a, b) { return (b.v || 0) - (a.v || 0); }); miss = miss.filter(function (x) { return x.v; }).slice(0, 12);
    $('dqMiss').innerHTML = miss.length ? miss.map(function (x) { return '<div class="card static" style="--c:#64748b"><span class="lbl">Excluded: ' + esc(EXCL_LABEL[x.reason] || x.reason) + '</span><span class="big" style="font-size:17px">' + esc(M.fmtMoneyFull(x.v)) + '</span><div class="t">' + esc(x.title) + '</div><div class="m"><span>' + esc(x.agency || '') + '</span><span>' + esc(SRC_SHORT[x.src] || x.src) + '</span></div>' + (x.url ? '<div><a href="' + esc(x.url) + '" target="_blank" rel="noopener">Source link</a></div>' : '') + '</div>'; }).join('') : '<p class="note">None.</p>';
    $('dqSrc').innerHTML = DATA.sources.map(function (s) { return '<div class="card static" style="--c:' + (s.status === 'ok' ? '#34d399' : s.status === 'disabled' ? '#94a3b8' : '#fb7185') + '"><div class="t">' + esc(s.name) + '</div><div class="m"><span>Status: <b>' + esc(s.status) + '</b></span><span>Rows read: ' + (s.fetched === undefined ? 'n/a' : s.fetched.toLocaleString('en-US')) + '</span><span>Kept: ' + (s.kept === undefined ? 'n/a' : s.kept) + '</span></div><div class="m"><span>' + esc(s.type || '') + '</span></div><p class="note" style="margin:6px 0">' + esc(s.note || '') + (s.error ? ' Error: ' + esc(s.error) : '') + '</p>' + (s.page ? '<a href="' + esc(s.page) + '" target="_blank" rel="noopener">Source page</a>' : '') + '</div>'; }).join('');
    $('dqNo').innerHTML = TX.notUsed.map(function (x) { return '<div class="card static" style="--c:#64748b"><div class="t">' + esc(x[0]) + '</div><p class="note" style="margin:4px 0">' + esc(x[2]) + '</p>' + (x[1] ? '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">Page</a>' : '') + '</div>'; }).join('');
    $('dqRules').innerHTML = '<ul>' + TX.rules.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>';
  }
  function renderHow() {
    $('how').innerHTML = HOW_ALL; return;
    $('how').innerHTML = '<p>' + TX.rules.join('</p><p>') + '</p><p><b>Not counted:</b> construction contracts, supply contracts, project or construction costs standing in for a fee, fees estimated by percentage, and anything outside the United States.</p>';
  }

  // ---------- capture files (watchlist) ----------
  var INDEX = null;
  function findRec(id) {
    var h = RECS.filter(function (x) { return x.id === id; })[0]; if (h) return h;
    if (!INDEX) { INDEX = {}; [DATA_P, DATA_W, DATA_R].forEach(function (d) { if (d && d.records) d.records.forEach(function (x) { if (!INDEX[x.id]) INDEX[x.id] = { r: x, asOf: d.asOfDate }; }); }); }
    return INDEX[id] ? INDEX[id].r : null;
  }
  function asOfOf(id) { return INDEX && INDEX[id] ? INDEX[id].asOf : ASOF; }
  function snapFor(id) { var r = findRec(id); return r ? CP.snapOf(r, asOfOf(id)) : (CAP[id] && CAP[id].snap) || null; }
  function getCap(id) { return CAP[id] || CP.blank(); }
  function capCounts() {
    var n = { soon: 0, overdue: 0, go: 0, total: 0 }, t = todayCentral();
    Object.keys(WATCH).forEach(function (id) { n.total++; var c = CAP[id]; if (!c) return; var f = CP.dueInfo(c.due, t).flag; if (f === 'soon') n.soon++; else if (f === 'overdue') n.overdue++; if (c.decision === 'Go') n.go++; });
    return n;
  }
  function capSumHtml(id) {
    var c = getCap(id), t = todayCentral(), d = CP.dueInfo(c.due, t), h = '<span class="cdec ' + c.decision.replace(/[^a-z]/gi, '').toLowerCase() + '">' + esc(c.decision) + '</span>';
    h += c.due ? '<span class="cdue ' + d.flag + '">' + (d.flag === 'soon' ? '&#9873; ' : d.flag === 'overdue' ? '&#9888; ' : '') + esc(CP.dueText(c.due, t)) + ' &middot; ' + esc(M.fmtDate(c.due)) + '</span>' : '<span class="cdue none">No due date</span>';
    if (c.next) h += '<span class="cnext">Next: ' + esc(c.next) + '</span>';
    return h;
  }
  function capFormHtml(id) {
    var c = getCap(id), f = function (k, label, type, ph) { return '<label class="cf"><span>' + esc(label) + '</span><input type="' + (type || 'text') + '" data-cap="' + k + '" data-cid="' + esc(id) + '" value="' + esc(c[k]) + '" placeholder="' + esc(ph || '') + '" autocomplete="off"' + (type === 'date' ? '' : ' autocapitalize="sentences"') + '></label>'; };
    return '<div class="capform">' +
      '<label class="cf"><span>Go / No-go</span><select data-cap="decision" data-cid="' + esc(id) + '">' + CP.DECISIONS.map(function (d) { return '<option' + (c.decision === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>' +
      f('reason', 'Reason for the decision', 'text', 'for example: incumbent is entrenched, or strong fit with our H&H staff') +
      f('due', 'Proposal / SOQ due date', 'date') +
      f('incumbent', 'Incumbent consultant', 'text', 'if known') +
      '<label class="cf"><span>Teaming partners / subs</span><textarea data-cap="team" data-cid="' + esc(id) + '" rows="2" placeholder="prime, subs, DBE firms">' + esc(c.team) + '</textarea></label>' +
      f('contact', 'Key contact', 'text', 'name, phone or email') +
      f('next', 'Next action', 'text', 'for example: call the project manager by Friday') +
      '<label class="cf"><span>Notes</span><textarea data-cap="notes" data-cid="' + esc(id) + '" rows="4">' + esc(c.notes) + '</textarea></label>' +
      '<p class="note">Saved on this device as you type. Use Back up (JSON) in the Watchlist tab to keep a copy.</p></div>';
  }
  function capBlock(id) {
    return '<div class="capwrap"><div class="capsum" data-capsum="' + esc(id) + '">' + capSumHtml(id) + '</div><details class="cap" data-capopen="' + esc(id) + '"' + (S.capOpen[id] ? ' open' : '') + '><summary>Capture file: incumbent, team, Go / No-go, due date, contact, notes</summary>' + capFormHtml(id) + '</details></div>';
  }
  function refreshCapPanel(id) {
    var el = $('capPanel'); if (!el || $('sheet').getAttribute('data-id') !== id) return;
    el.innerHTML = WATCH[id] ? '<h3>Capture file <span class="hint">(your notes; not from the source)</span></h3><div class="capsum" data-capsum="' + esc(id) + '">' + capSumHtml(id) + '</div>' + capFormHtml(id) : '<h3>Capture file</h3><p class="note" style="margin:0 0 8px">Star this record to start a capture file: incumbent, teaming partners, Go / No-go, due date, contact and notes.</p><button type="button" class="btn" data-star="' + esc(id) + '">&#9734; Star and start a capture file</button>';
  }
  function toggleStar(id) {
    if (WATCH[id]) {
      var c = CAP[id];
      if (c && !CP.isEmpty(c) && !window.confirm('Remove this record from the watchlist? Its capture notes will be deleted from this device. (Back up first if you want to keep them.)')) return false;
      delete WATCH[id]; delete CAP[id]; delete S.capOpen[id];
    } else { WATCH[id] = true; var sn = snapFor(id); CAP[id] = CP.clean(Object.assign({}, CAP[id] || {}, sn ? { snap: sn } : {})); }
    saveWatch(); saveCap(); return true;
  }
  function migrateWatch() { // old watchlists only had { id: true }; add the record summary the capture CSV needs
    var ch = false; Object.keys(WATCH).forEach(function (id) { var c = CAP[id] || CP.blank(); if (!c.snap) { var sn = snapFor(id); if (sn) { c.snap = sn; CAP[id] = c; ch = true; } } });
    if (ch) saveCap();
  }
  function capRows() {
    return Object.keys(WATCH).map(function (id) { var sn = snapFor(id) || { title: id }; return { id: id, cap: getCap(id), snap: sn, title: sn.title }; });
  }
  function download(name, type, text, bom) {
    var blob = new Blob([(bom ? '\ufeff' : '') + text], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function exportCapCsv() {
    var rows = CP.sortRows(capRows(), S.sort === 'decision' ? 'decision' : 'due'); if (!rows.length) { toast('The watchlist is empty.'); return; }
    download('national-radar-capture-' + todayCentral() + '.csv', 'text/csv;charset=utf-8', CP.toCSV(rows, todayCentral()), true); toast('Exported ' + rows.length + ' capture file(s).');
  }
  function exportBackup() {
    if (!Object.keys(WATCH).length && !FS.length) { toast('The watchlist is empty, nothing to back up.'); return; }
    var bk = CP.makeBackup(WATCH, CAP, new Date().toISOString()); bk.filtersets = FS; // v6: saved filter sets travel with the backup
    download('national-radar-capture-backup-' + todayCentral() + '.json', 'application/json', JSON.stringify(bk, null, 1), false); toast('Backup saved to your downloads.');
  }
  function restoreBackup(text, mode) {
    var p = CP.parseBackup(text); if (!p.ok) { toast(p.error); return; }
    if (mode === 'replace' && !window.confirm('Replace the whole watchlist and every capture file on this device with the backup?')) return;
    try { var j6 = JSON.parse(text); if (j6 && Array.isArray(j6.filtersets)) { FS = mode === 'replace' ? V6.clean(j6.filtersets) : V6.merge(FS, j6.filtersets); V6.save(window.localStorage, FS); } } catch (e) { /* parseBackup already validated */ }
    var out = CP.applyBackup({ watch: WATCH, capture: CAP }, p, mode); WATCH = out.watch; CAP = out.capture; saveWatch(); saveCap(); migrateWatch();
    toast('Restored ' + Object.keys(p.watch).length + ' watchlist record(s) (' + (mode === 'replace' ? 'replaced' : 'merged') + ').' + (p.skipped ? ' ' + p.skipped + ' invalid entr' + (p.skipped === 1 ? 'y' : 'ies') + ' skipped.' : '')); render();
  }
  function renderCapBar() {
    var on = S.scope === 'watch', bar = $('capBar'); bar.hidden = !on; if (!on) return;
    var n = capCounts(), shown = scoped('watch').length;
    $('capStat').innerHTML = '<b>' + n.total + '</b> starred in all lanes (' + shown + ' in this lane) &middot; <b>' + n.go + '</b> Go &middot; <b class="' + (n.soon ? 'cdue soon' : '') + '">' + n.soon + '</b> due within ' + CP.SOON_DAYS + ' days &middot; <b class="' + (n.overdue ? 'cdue overdue' : '') + '">' + n.overdue + '</b> overdue';
    document.querySelectorAll('#capSort [data-capsort]').forEach(function (b) { var o = b.getAttribute('data-capsort') === S.sort; b.classList.toggle('on', o); b.setAttribute('aria-pressed', String(o)); });
  }
  function updateCapField(el) {
    var id = el.getAttribute('data-cid'), k = el.getAttribute('data-cap'); if (!WATCH[id]) return;
    var c = CAP[id] || CP.blank(); c[k] = el.value; c = CP.clean(Object.assign({}, c, { updated: new Date().toISOString() }));
    if (k === 'due' && el.value && !CP.validDate(el.value)) return;
    CAP[id] = c; saveCap();
    document.querySelectorAll('[data-capsum="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]').forEach(function (n) { n.innerHTML = capSumHtml(id); });
    if (S.scope === 'watch') renderCapBar();
  }

  // ---------- v2: My pursuits ----------
  function purRows() { return V2.pursuitRows(WATCH, CAP, snapFor, todayCentral(), CP); }
  function renderPurBadge() { var n = purRows().filter(function (r) { return r.flag === 'overdue' || r.flag === 'soon'; }).length, b = $('purBadge'); b.hidden = !n; b.textContent = n; }
  function purItem(r) {
    var c = r.cap, sn = r.snap || {}, t = todayCentral(), inLane = RECS.some(function (x) { return x.id === r.id; });
    var flag = r.flag === 'overdue' ? '<span class="cdue overdue">&#9888; ' + esc(CP.dueText(c.due, t)) + '</span>' : r.flag === 'soon' ? '<span class="cdue soon">&#9873; ' + esc(CP.dueText(c.due, t)) + '</span>' : c.due ? '<span class="cdue">' + esc(CP.dueText(c.due, t)) + '</span>' : '<span class="cdue none">No due date</span>';
    return '<div class="card pur ' + r.flag + '" style="--c:' + (r.flag === 'overdue' ? '#fb7185' : r.flag === 'soon' ? '#fbbf24' : '#7cb7ff') + '"><button type="button" class="star' + (WATCH[r.id] ? ' on' : '') + '" data-star="' + esc(r.id) + '" aria-label="' + (WATCH[r.id] ? 'Remove from watchlist' : 'Add to watchlist') + '">' + (WATCH[r.id] ? '&#9733;' : '&#9734;') + '</button><div class="b">' +
      '<div class="t">' + (inLane ? '<a href="#" data-open="' + esc(r.id) + '">' + esc(sn.title || r.id) + '</a>' : esc(sn.title || r.id)) + '</div>' +
      '<span class="m"><span>' + esc([sn.agency, sn.state].filter(Boolean).join(' · ')) + '</span>' + (c.due ? '<span>Due ' + esc(M.fmtDate(c.due)) + '</span>' : '') + '</span>' +
      '<div class="purcap"><span class="cdec ' + c.decision.replace(/[^a-z]/gi, '').toLowerCase() + '">' + esc(c.decision) + '</span>' + flag + (c.next ? '<span class="cnext">Next: ' + esc(c.next) + '</span>' : '') + '</div>' +
      (c.notes ? '<p class="note purnotes">' + esc(c.notes.length > 240 ? c.notes.slice(0, 240) + '…' : c.notes) + '</p>' : '') +
      (sn.url ? '<a class="purlink" href="' + esc(sn.url) + '" target="_blank" rel="noopener">Source record &rarr;</a>' : '') + '</div></div>';
  }
  function renderPursuits() {
    var rows = purRows(), wk = rows.filter(function (r) { return r.week; }), rest = rows.filter(function (r) { return !r.week; });
    $('purWeek').textContent = 'week of ' + M.fmtDate(todayCentral());
    $('purList').innerHTML = rows.length ? (wk.length ? '<h3>This week: overdue or due within 7 days (' + wk.length + ')</h3>' + wk.map(purItem).join('') : '<p class="note">Nothing overdue or due in the next 7 days.</p>') + (rest.length ? '<h3>Later or no due date (' + rest.length + ')</h3>' + rest.map(purItem).join('') : '')
      : '<p class="note empty">No pursuits yet. Star a record (&#9734;) in the List or Map to start a capture file; it shows up here with its due date, Go / No-go and next action.</p>';
  }
  // v5.4: the weekly list opens as an in-app sheet (works even where window.print() is missing, e.g. iOS home-screen apps)
  var WK = null;
  function weeklyModel() { return NRW.model(purRows(), todayCentral(), CP, M.fmtDate); }
  function printPursuits() { WK = weeklyModel(); $('wkBody').innerHTML = NRW.bodyHtml(WK); $('wkHint').textContent = ''; $('weekly').hidden = false; document.body.classList.add('wk-open'); $('wkShare').hidden = !navigator.share; $('wkClose').focus(); }
  function closeWeekly() { $('weekly').hidden = true; document.body.classList.remove('wk-open', 'print-weekly'); $('btnPurPrint').focus(); }
  function endPrint() { document.body.classList.remove('print-weekly'); }
  function weeklyPrint() {
    if (typeof window.print !== 'function') { $('wkHint').textContent = 'Printing is not available here. Use Share, Download or Copy text instead.'; return; }
    document.body.classList.add('print-weekly');
    setTimeout(function () { try { window.print(); } catch (e) { $('wkHint').textContent = 'Printing did not start. Use Share or Download, then print from that app.'; } setTimeout(endPrint, 1500); }, 60);
    $('wkHint').textContent = 'If no print dialog appears (some iPhone home-screen apps), use Share or Download and print from there.';
  }
  function weeklyName(ext) { return 'national-radar-weekly-' + todayCentral() + '.' + ext; }
  function weeklyShare() {
    var md = WK || weeklyModel(), txt = NRW.text(md), data = { title: md.heading, text: txt };
    try { var f = new File([NRW.docHtml(md)], weeklyName('html'), { type: 'text/html' }); if (navigator.canShare && navigator.canShare({ files: [f] })) data = { title: md.heading, text: md.heading, files: [f] }; } catch (e) { /* files not supported */ }
    navigator.share(data).catch(function (e) { if (e && e.name !== 'AbortError') { if (data.files) navigator.share({ title: md.heading, text: txt }).catch(function () {}); } });
  }
  function weeklyCopy() {
    var txt = NRW.text(WK || weeklyModel()), ok = function () { toast('Weekly list copied.'); $('wkHint').textContent = 'Copied. Paste it into a note, email or message.'; };
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'; $('weekly').appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length); var done = false; try { done = document.execCommand('copy'); } catch (e) { done = false; } ta.remove(); if (done) ok(); else $('wkHint').textContent = 'Copy is blocked here. Select the list below and copy it, or use Download.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
  }
  function weeklyDownload() { download(weeklyName('html'), 'text/html;charset=utf-8', NRW.docHtml(WK || weeklyModel()), false); $('wkHint').textContent = 'Saved as an HTML file. Open it to print or share.'; }
  window.addEventListener('afterprint', endPrint);
  if (window.matchMedia) { var mqp = window.matchMedia('print'); var onMq = function (e) { if (!e.matches) endPrint(); }; if (mqp.addEventListener) mqp.addEventListener('change', onMq); else if (mqp.addListener) mqp.addListener(onMq); }

  // ---------- detail sheet ----------
  function openSheet(id) {
    var r = RECS.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var h = '<h2>' + esc(r.title) + '</h2><div>' + tagsFor(r) + '</div>';
    h += '<h3>Dollar figures</h3>';
    if (r._ln === 'pse') h += sheetMoneyPse(r);
    else if (r._ln === 'road' && r.amt) h += '<div class="money"><span class="lbl"><b class="basis ' + (r.feeBasis === 'total' ? 'tot' : 'dr') + '">' + esc(r.feeBasisLabel || '') + '</b> · decides the fee rule</span><b>' + esc(M.fmtMoneyFull(r.amt.v)) + '</b><div>' + esc(moneyLabel(r.amt)) + '</div>' + (r.feeBasis === 'total' ? '<div class="hint">The source states only this total. How much of it is drainage is not stated, and no share is estimated here.</div>' : '') + (r.amt.ctx ? '<div class="hint">"…' + esc(r.amt.ctx) + '…"</div>' : '') + '</div>';
    else if (r._ln === 'pse') { /* handled above */ }
    else if (r.amt) h += '<div class="money"><span class="lbl">Stated fee / value (decides the fee rule)</span><b>' + esc(M.fmtMoneyFull(r.amt.v)) + '</b><div>' + esc(moneyLabel(r.amt)) + '</div>' + (r.amt.ctx ? '<div class="hint">"…' + esc(r.amt.ctx) + '…"</div>' : '') + '</div>';
    else h += '<div class="money"><b style="font-size:16px">No fee stated by the source</b></div>';
    if (r._ln !== 'pse') (r.amts || []).filter(function (a) { return a.kind !== 'project_cost' && !(r.amt && a.v === r.amt.v && a.kind === r.amt.kind); }).forEach(function (a) { h += '<div class="money"><span class="lbl">Other figure</span><b style="font-size:17px">' + esc(M.fmtMoneyFull(a.v)) + '</b><div>' + esc(moneyLabel(a)) + '</div>' + (a.ctx ? '<div class="hint">"…' + esc(a.ctx) + '…"</div>' : '') + '</div>'; });
    if (r.projectCost && r._ln !== 'pse') h += '<div class="money cost"><span class="lbl">Project cost (NOT a fee, never used for the fee rule)</span><b style="font-size:17px">' + esc(M.fmtMoneyFull(r.projectCost.v)) + '</b><div>' + esc(r.projectCost.field) + '</div>' + (r.projectCost.ctx ? '<div class="hint">"…' + esc(r.projectCost.ctx) + '…"</div>' : '') + '</div>';
    if (r._ln === 'road') h += costSectionHtml(r);
    h += '<h3>Details</h3><dl>' + [['Status', (STATUS_LABEL[r.status] || r.status) + ' · ' + (r.noticeLabel || r.noticeType || '')], ['Agency', [r.agency, r.subagency, r.office].filter(Boolean).join(' / ')], ['Place', [r.city, r.state].filter(Boolean).join(', ') || 'not stated'], ['Dates', dateText(r)], ['Awardee', r.awardee], ['Award #', r.awardNum], ['Solicitation #', r.solNum], ['NAICS / PSC', [r.naics, r.psc].filter(Boolean).join(' / ')], ['Sector (inferred)', (r._ln === 'pse' ? r.domains || [] : r.sectors || []).map(secLabel).join(', ')], ['Source', SRC_SHORT[r.src] || r.src], ['Snapshot as of', ASOF]].filter(function (x) { return x[1]; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>';
    if (r.url) h += '<a class="srclink" href="' + esc(r.url) + '" target="_blank" rel="noopener">Open the source record</a>';
    h += '<details class="capdet" id="capDet"' + (CAP[r.id] && !CP.isEmpty(CAP[r.id]) ? ' open' : '') + '><summary>Capture file <span class="hint">(your notes on this device)</span></summary><div id="capPanel"></div></details>';
    var fk = Object.keys(r.fields || {}).filter(function (k) { return r.fields[k] !== '' && r.fields[k] !== null && r.fields[k] !== undefined; });
    if (fk.length) h += '<h3>All source fields</h3><dl>' + fk.map(function (k) { return '<dt>' + esc(k) + '</dt><dd>' + esc(r.fields[k]) + '</dd>'; }).join('') + '</dl>';
    if (r.desc) h += '<h3>Description (from the source, shortened)</h3><p style="font-size:13px;overflow-wrap:anywhere">' + esc(r.desc) + '</p>';
    h += alsoSheet(r);
    if (r.also && r.also.length) h += '<h3>Same record also found as</h3><ul>' + r.also.map(function (x) { return '<li>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc((SRC_SHORT[x.src] || x.src) + ' ' + (x.type || '') + ' ' + x.id) + '</a>' : esc(x.src + ' ' + x.id)) + '</li>'; }).join('') + '</ul>';
    h += changesSheet(r);
    h += '<details class="rulesdet"><summary>Why it is listed (the exact rules)</summary>';
    h += '<h3>Why it is in this list (the exact rules)</h3><ul>' + (r.rules || []).map(function (x) { return '<li>' + esc(x.t) + '</li>'; }).join('') + '</ul>';
    if (r._ln === 'pse' && r.reasons && r.reasons.length) h += '<h3>Why it is Unconfirmed or flagged</h3><ul>' + r.reasons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (r._ln === 'pse' && r.lens === 'db') h += '<h3>Your possible role (inferred, not stated by the owner)</h3><p style="font-size:13px;margin:0"><b>' + esc(r.dbRoleLabel) + '</b>. ' + esc(r.dbRoleWhy) + '</p>';
    if (r._ln !== 'pse' && r.review && r.review.length) h += '<h3>Why it needs review</h3><ul>' + r.review.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (r.bucket === 'nofee') h += '<h3>Why it is under "Fee not stated"</h3><p class="note" style="margin:0">Engineering notice with a water-sector title that is open or upcoming, but the source states no fee. It is not counted as over $20M.</p>';
    h += '</details>';
    $('shBody').innerHTML = h; $('sheet').hidden = false; $('sheet').setAttribute('data-id', id); $('shStar').className = 'star big' + (WATCH[id] ? ' on' : ''); $('shStar').innerHTML = WATCH[id] ? '&#9733;' : '&#9734;';
    refreshCapPanel(id); var dock = WIDE.matches; document.body.classList.toggle('docked', dock); $('sheet').setAttribute('aria-modal', String(!dock)); if (!dock) document.body.style.overflow = 'hidden'; $('shClose').focus();
    if (r._ln === 'road') initWhatIf(r);
  }
  function sheetMoneyPse(r) {
    var h = '';
    if (r.lens === 'fee' && !r.amt) { h += '<div class="money"><span class="lbl">Fee/amount not stated</span><div>The source publishes no fee or contract value. Nothing is estimated.</div></div>'; }
    else if (r.lens === 'fee') { h += '<div class="money"><span class="lbl">Consultant fee / contract value stated by the source (this is what the threshold tests)</span><b>' + esc(M.fmtMoneyFull(r.amt.v)) + '</b><div>' + esc(r.amt.kind === 'design_fee' ? 'Design fee / design portion stated in the notice text (text-parsed)' : moneyLabel(r.amt)) + '</div>' + (r.amt.ctx ? '<div class="hint">"…' + esc(r.amt.ctx) + '…"</div>' : '') + '</div>'; }
    else if (r.lens === 'db') {
      h += r.dbValue ? '<div class="money db"><span class="lbl">Design-build contract value / estimated project cost. Includes construction. NOT a design fee. Never tested against the fee threshold.</span><b style="font-size:19px">' + esc(M.fmtMoneyFull(r.dbValue.v)) + '</b><div>Source field: ' + esc(r.dbValue.field) + '</div>' + (r.dbValue.ctx ? '<div class="hint">"…' + esc(r.dbValue.ctx) + '…"</div>' : '') + '</div>' : '<div class="money db"><b style="font-size:16px">No design-build value stated by the source</b></div>';
      if (r.designFee) h += '<div class="money"><span class="lbl">Design fee / design portion stated separately in the text (text-parsed; counts toward the fee test in its own fee record)</span><b style="font-size:17px">' + esc(M.fmtMoneyFull(r.designFee.v)) + '</b><div class="hint">"…' + esc(r.designFee.ctx) + '…"</div></div>';
      if (r.stipend) h += '<div class="money db"><span class="lbl">Stipend paid to unsuccessful proposers (NOT a fee, not counted)</span><b style="font-size:17px">' + esc(M.fmtMoneyFull(r.stipend.v)) + '</b><div class="hint">"…' + esc(r.stipend.ctx) + '…"</div></div>';
    } else if (r.lens === 'advance') {
      h += '<div class="money db"><span class="lbl">Advance notice (agency forecast). Not tested by any fee filter.</span><b style="font-size:16px">' + (r.statedValue ? 'Source states ' + esc(M.fmtMoneyFull(r.statedValue.v)) + ' (below the $5M floor, shown for information only)' : 'No fee stated by the source') + '</b>' + (r.statedValue ? '<div>Source field: ' + esc(r.statedValue.field) + '</div>' : '') + '</div>';
    } else {
      h += '<div class="money pipe"><span class="lbl">Project cost (NOT a fee, never used by any fee filter)</span><b style="font-size:19px">' + esc(M.fmtMoneyFull(r.projectCost.v)) + '</b><div>Source field: ' + esc(r.projectCost.field) + '</div></div><div class="money"><b style="font-size:16px">No fee is published for this project</b></div>';
      if (r.illustrative) h += '<div class="money est"><span class="lbl">' + esc(r.illustrative.label) + ' (not from the source, not a stated fee)</span><b>' + esc(M.fmtMoney(r.illustrative.low)) + ' to ' + esc(M.fmtMoney(r.illustrative.high)) + '</b><div>= ' + r.illustrative.pct[0] + '% to ' + r.illustrative.pct[1] + '% of the stated cost. Basis: ' + esc(r.illustrative.cite) + ' <a href="' + esc(r.illustrative.url) + '" target="_blank" rel="noopener">source</a>. Design fees vary widely by project type and size; this range does not count toward any fee filter.</div></div>';
    }
    return h;
  }
  function closeSheet() { var was = !$('sheet').hidden; $('sheet').hidden = true; document.body.style.overflow = ''; document.body.classList.remove('docked'); if (was) render(); }


  // ---------- roadway: construction cost base + what-if ----------
  var TYPE_OPTS = [['', 'Choose a type'], ['newloc', 'New location'], ['widen', 'Widening (added lanes)'], ['recon', 'Reconstruction'], ['rehab', 'Rehabilitation / overlay']];
  function costSectionHtml(r) {
    var c = r.cost || {}, h = '<h3>Construction cost base <span class="hint">(not a fee; never used by any fee filter)</span></h3>';
    if (c.stated) return h + '<div class="money cost"><span class="lbl">STATED by the source (project / construction cost)</span><b>' + esc(M.fmtMoneyFull(c.stated.v)) + '</b><div>Source field: ' + esc(c.stated.field) + (c.stated.asOf ? ' · date: ' + esc(M.fmtDate(c.stated.asOf)) : '') + '</div>' + (c.stated.ctx ? '<div class="hint">"…' + esc(c.stated.ctx) + '…"</div>' : '') + '</div>';
    var e = c.est;
    h += '<div class="money est"><span class="lbl">' + esc(CO.LABEL) + '</span>' + (e && e.base ? '<b>' + esc(M.fmtMoney(e.low)) + ' to ' + esc(M.fmtMoney(e.high)) + '</b><div>Low / base / high; base ' + esc(M.fmtMoneyFull(Math.round(e.base))) + '. Computed here from the scope the source gives, with Texas bid-tab unit prices. Change anything below.</div>' : '<b style="font-size:16px">Insufficient scope</b><div>' + esc(e ? e.reason : 'The source gives no usable length or project type.') + ' Enter the scope below to try a what-if.</div>') + '</div>';
    var ev = (c.scope && c.scope.evidence) || [];
    h += '<p class="note" style="margin:6px 0">Scope read from the source text: ' + (ev.length ? esc(ev.join('; ')) : 'nothing usable (no length, lane count or project type found)') + '.</p><div id="whatif"></div>';
    return h;
  }
  function wiDefaults(r) {
    var sc = (r.cost && r.cost.scope) || {}, e = r.cost && r.cost.est && r.cost.est.inputs, d = {};
    if (e) return Object.assign({}, e);
    d.type = sc.type && sc.type !== 'unsupported' ? sc.type : ''; d.lengthMi = sc.lengthMi || ''; d.lanes = d.type === 'widen' ? (sc.lanesAdded || '') : (sc.lanesTotal || sc.lanesAdded || ''); if (sc.section) d.section = sc.section; return d;
  }
  function inp(id, label, val, extra) { return '<label class="wi"><span>' + esc(label) + '</span><input type="number" inputmode="decimal" step="any" min="0" data-wi="' + id + '" value="' + esc(val === undefined || val === null ? '' : val) + '"' + (extra || '') + '></label>'; }
  function initWhatIf(r) {
    var host = $('whatif'); if (!host) return;
    if (!PRICES) { host.innerHTML = '<p class="note">Unit prices (data/cost-prices.json) did not load, so no estimate can be computed.</p>'; return; }
    var d = Object.assign({}, CO.DEFAULTS, wiDefaults(r)); host.setAttribute('data-rec', r.id);
    var typeSel = '<label class="wi"><span>Project type</span><select data-wi="type">' + TYPE_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (d.type === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    var secSel = '<label class="wi"><span>Drainage section</span><select data-wi="section"><option value="rural"' + (d.section === 'rural' ? ' selected' : '') + '>Rural: ditches and cross culverts</option><option value="urban"' + (d.section === 'urban' ? ' selected' : '') + '>Urban: curb, inlets, storm sewer</option></select></label>';
    var basisSel = '<label class="wi"><span>Unit price basis</span><select data-wi="basis"><option value="statewide"' + (d.basis === 'statewide' ? ' selected' : '') + '>Texas statewide average</option><option value="houston"' + (d.basis === 'houston' ? ' selected' : '') + '>Houston average (where available)</option></select></label>';
    var A = CO.ASSUMED_NOTE;
    host.innerHTML = '<h4>What-if (' + esc(CO.LABEL) + ')</h4><div class="wigrid">' + typeSel + inp('lengthMi', 'Length (miles)', d.lengthMi) + inp('lanes', d.type === 'widen' ? 'Lanes ADDED' : 'Total lanes', d.lanes) + secSel + basisSel + '</div>' +
      '<details class="wiasm"><summary>Assumptions (all editable, all labeled Assumed)</summary><div class="wigrid">' + inp('trafficControlPct', 'Traffic control %', d.trafficControlPct) + inp('mobilizationPct', 'Mobilization %', d.mobilizationPct) + inp('contingencyLowPct', 'Contingency % (low)', d.contingencyLowPct) + inp('contingencyBasePct', 'Contingency % (base)', d.contingencyBasePct) + inp('contingencyHighPct', 'Contingency % (high)', d.contingencyHighPct) + inp('priceLowPct', 'Unit price band, low −%', d.priceLowPct) + inp('priceHighPct', 'Unit price band, high +%', d.priceHighPct) + inp('escalationPct', 'Escalation % (your input, default 0)', d.escalationPct) + inp('laneWidthFt', 'Lane width (ft)', d.laneWidthFt) + inp('shoulderFt', 'Shoulder width (ft, each side)', d.shoulderFt) + inp('crossDrainsPerMile', 'Cross culverts per mile (rural)', d.crossDrainsPerMile) + inp('fillHeightFt', 'Average fill height (ft)', d.fillHeightFt) + '</div><ul class="note"><li>Traffic control: ' + esc(A.trafficControlPct) + '</li><li>Mobilization: ' + esc(A.mobilizationPct) + '</li><li>Contingency: ' + esc(A.contingencyBasePct) + '</li><li>Price band: ' + esc(A.priceLowPct) + '</li><li>Escalation: ' + esc(A.escalationPct) + '</li></ul></details><div id="wiOut"></div>';
    runWhatIf(false);
  }
  function wiRead() {
    var o = {}, ov = {}; document.querySelectorAll('#whatif [data-wi]').forEach(function (el) { var k = el.getAttribute('data-wi'); o[k] = el.value; });
    document.querySelectorAll('#whatif [data-ovr]').forEach(function (el) { if (el.value !== '') ov[el.getAttribute('data-ovr')] = el.value; });
    return { inp: o, ovr: ov };
  }
  function runWhatIf(onlyNumbers) {
    var out = $('wiOut'); if (!out || !PRICES) return;
    var v = wiRead(), e = CO.estimate(v.inp, PRICES.rows, v.ovr);
    var lanesLbl = document.querySelector('#whatif [data-wi="lanes"]'); if (lanesLbl) lanesLbl.previousElementSibling.textContent = v.inp.type === 'widen' ? 'Lanes ADDED' : 'Total lanes';
    if (e.status !== 'estimated') { out.innerHTML = '<div class="money est"><b style="font-size:16px">Insufficient scope</b><div>' + esc(e.reason) + '</div></div>'; return; }
    var fm = function (x) { return x === null || x === undefined ? 'n/a' : '$' + Math.round(x).toLocaleString('en-US'); };
    if (onlyNumbers) { e.lines.forEach(function (l) { var c = document.getElementById('wa-' + l.code); if (c) c.textContent = fm(l.amount); }); }
    else {
      var rows = e.lines.map(function (l) { return '<div class="wiln"><div><b>' + esc(l.code) + '</b> ' + esc(l.desc) + (l.note ? '<br><small>' + esc(l.note) + '</small>' : '') + '</div><div class="wiq"><span>' + Math.round(l.qty).toLocaleString('en-US') + ' ' + esc(l.unit) + '</span> × $<input type="number" inputmode="decimal" step="any" min="0" data-ovr="' + esc(l.code) + '" value="' + esc(v.ovr[l.code] || '') + '" placeholder="' + (l.price === null ? 'n/a' : l.price.toFixed(2)) + '" aria-label="Unit price override for ' + esc(l.code) + '"> = <b id="wa-' + esc(l.code) + '">' + fm(l.amount) + '</b></div><small class="wis">' + esc(l.priceSrc) + (l.n ? ', n=' + l.n : '') + '</small></div>'; }).join('');
      out.innerHTML = '<div>' + rows + '</div><div id="wiTot"></div><p class="note">' + esc(e.priceNote) + ' Unit prices are editable per line (leave blank to use the bid-tab average). Quantities come from the typical section assumed above, not from design plans.</p>';
    }
    var sc = e.scenarios, A = e.assumptions, g = sc.base.groups;
    $('wiTot').innerHTML = '<table class="t wit"><tbody><tr><td>Earthwork (base)</td><td class="r">' + fm(g.earth) + '</td></tr><tr><td>Pavement (base)</td><td class="r">' + fm(g.pavement) + '</td></tr><tr><td>Drainage items (base)</td><td class="r">' + fm(g.drainage) + '</td></tr><tr><td>Other items (base)</td><td class="r">' + fm(g.other) + '</td></tr><tr><td>Direct subtotal (base)</td><td class="r">' + fm(sc.base.direct) + '</td></tr><tr><td>Traffic control ' + A.trafficControlPct + '% (Assumed)</td><td class="r">' + fm(sc.base.trafficControl) + '</td></tr><tr><td>Mobilization ' + A.mobilizationPct + '% (Assumed)</td><td class="r">' + fm(sc.base.mobilization) + '</td></tr><tr><td>Contingency ' + A.contingencyBasePct + '% (Assumed)</td><td class="r">' + fm(sc.base.contingency) + '</td></tr><tr><td>Escalation ' + A.escalationPct + '% (input)</td><td class="r">' + fm(sc.base.escalation) + '</td></tr></tbody></table><div class="money est"><span class="lbl">' + esc(CO.LABEL) + '</span><b>Low ' + fm(e.low) + ' · Base ' + fm(e.base) + ' · High ' + fm(e.high) + '</b><div>Low = unit prices −' + A.priceLowPct + '% and contingency ' + A.contingencyLowPct + '%; High = +' + A.priceHighPct + '% and ' + A.contingencyHighPct + '%. Planning level, Texas prices, price year of the bid tabs, escalation as entered.</div></div>';
  }

  // ---------- master render ----------
  function renderModes() { $('btnLive').hidden = false; $('liveNote').hidden = false; }
  function setMode() { // v4.5: a single combined set; kept as the one place that (re)builds it
    COMB = C.merge(DATA_P, DATA_W, DATA_R); DATA = COMB; RECS = COMB.records; ASOF = COMB.asOfDate; SCOPES = C.SCOPES;
    S.mode = 'all'; S.rows = 50; S.tlMonth = null;
    $('bannerTxt').innerHTML = BANNER_ALL;
    try { if (location.hash === '#road' || location.hash === '#water') history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    renderHow(); renderFresh(); render();
  }
  function render() {
    var list = scoped();
    renderModes(); renderScopes(); renderDigest(); renderSince(); renderCapBar(); renderKpis(list); renderFilters();
    if (S.tab === 'map') renderMap(list); else if (S.tab === 'list') { renderList(list); renderMini(list); } else if (S.tab === 'timeline') renderTimeline(list); else if (S.tab === 'break') renderBreak(list); else if (S.tab === 'pursuits') renderPursuits(); else renderData();
    renderPurBadge();
  }
  function setTab(t) {
    try { localStorage.setItem('nr.tab', t); } catch (e) { /* ignore */ } // P3: remember the last view
    S.tab = t; ['map', 'list', 'timeline', 'break', 'pursuits', 'data'].forEach(function (k) { $('v-' + k).hidden = k !== t; });
    document.querySelectorAll('.tabs button[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); });
    document.querySelectorAll('.tabs button[data-tab]').forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-tab') === t ? 'page' : 'false'); });
    var inMore = ['timeline', 'break', 'data'].indexOf(t) >= 0; $('tabMoreBtn').classList.toggle('on', inMore); $('tabMoreLbl').textContent = inMore ? ({ timeline: 'Timeline', break: 'Breakdown', data: 'Data' })[t] : ''; $('tabMore').hidden = true; $('tabMoreBtn').setAttribute('aria-expanded', 'false');
    render(); window.scrollTo(0, 0);
  }
  function toggle(arr, k) { var i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); else arr.push(k); }

  // ---------- CSV ----------
  function exportCsv() {
    var list = sortFor(scoped(), S.sort); if (!list.length) { toast('Nothing to export in this view.'); return; }
    var blob = new Blob(['\ufeff' + M.toCSV(list, ASOF)], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'national-radar-' + S.scope + '-' + ASOF + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Exported ' + list.length + ' record(s).');
  }

  // ---------- live refresh (CORS-open sources only: NYC and Chicago Socrata, USAspending) ----------
  function getJ(url, opt) { return fetch(url, opt).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  function liveRefresh() {
    var btn = $('btnLive'), asOf = todayCentral(); btn.disabled = true; btn.textContent = 'Refreshing…';
    var since = M.addMonths(asOf, -24), jobs = [], res = {};
    jobs.push(getJ('https://data.cityofnewyork.us/resource/dg92-zbpx.json?' + new URLSearchParams({ $where: "section_name='Procurement' AND type_of_notice_description='Award' AND category_description='Construction Related Services' AND contract_amount>20000000 AND start_date>'" + since + "'", $limit: '5000', $order: 'start_date DESC' })).then(function (rows) { res.nyc = rows.map(M.normNyc).filter(Boolean); }));
    jobs.push(getJ('https://data.cityofchicago.org/resource/rsxa-ify5.json?' + new URLSearchParams({ $where: "award_amount>20000000 AND (end_date>'" + asOf + "' OR approval_date>'" + since + "')", $limit: '5000', $order: 'award_amount DESC' })).then(function (rows) { var best = {}; rows.forEach(function (r) { var k = r.purchase_order_contract_number; if (!best[k] || +(r.revision_number || 0) > +(best[k].revision_number || 0)) best[k] = r; }); res.chicago = Object.keys(best).map(function (k) { return M.normChicago(best[k]); }).filter(Boolean); }));
    var fields = ['Award ID', 'Recipient Name', 'Award Amount', 'Total Outlays', 'Description', 'Start Date', 'End Date', 'Awarding Agency', 'Awarding Sub Agency', 'NAICS', 'PSC', 'Place of Performance State Code', 'Place of Performance Country Code', 'generated_internal_id', 'Contract Award Type', 'Base Obligation Date'];
    var kw = ['drainage', 'stormwater', 'storm water', 'flood', 'wastewater', 'sewer', 'hydrologic', 'hydraulic', 'levee', 'dam safety', 'coastal', 'watershed', 'reservoir', 'water treatment', 'water resources', 'civil works', 'water supply', 'water system', 'water infrastructure'];
    jobs.push(getJ('https://api.usaspending.gov/api/v2/search/spending_by_award/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filters: { award_type_codes: ['A', 'B', 'C', 'D'], time_period: [{ start_date: M.addMonths(asOf, -60), end_date: asOf }], award_amounts: [{ lower_bound: M.FEE_THRESHOLD }], keywords: kw, psc_codes: { require: [['Service', 'C']] } }, fields: fields, limit: 100, page: 1, sort: 'Award Amount', order: 'desc' }) }).then(function (j) { res.usaspending = (j.results || []).map(function (r) { return M.normUsa(r, null); }).filter(Boolean); }));
    Promise.all(jobs.map(function (p) { return p.catch(function (e) { return { err: e.message }; }); })).then(function (out) {
      var failed = out.filter(function (x) { return x && x.err; }).length, kept = [];
      Object.keys(res).forEach(function (src) { res[src].forEach(function (c) { var ev = M.evaluate(c, { asOf: asOf }); if (ev.bucket !== 'excluded') kept.push(M.toRecord(c, ev, asOf)); }); });
      var answered = Object.keys(res), before = RECS.length; RECS = M.dedupe(RECS.concat(kept)); var added = RECS.length - before;
      LIVE.at = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      $('liveNote').textContent = 'Live refresh at ' + LIVE.at + ': ' + answered.length + ' of 3 live sources answered (' + (answered.join(', ') || 'none') + '). ' + kept.length + ' record(s) passed the rules; ' + added + ' of them are new compared with the snapshot (already-known records stay as the snapshot has them). Only awards come from live sources, and the live USAspending query is limited to contracts (no detail lookup), so the build snapshot stays the complete picture.' + (failed ? ' ' + failed + ' source(s) failed.' : '');
      renderFresh(); render(); toast('Live awards refreshed.');
    }).catch(function (e) { toast('Live refresh failed: ' + e.message); }).then(function () { btn.disabled = false; btn.textContent = 'Refresh live awards'; });
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    if (e.target.closest('#btnSeen')) { NEWBASE = V2.markAllSeen(lsx, ssn, latestAsOf()); if (S.digest === 'new') S.digest = null; toast('Marked everything as seen.'); render(); return; }
    var rh = e.target.closest('[data-region-hint]'); if (rh) { var rv = rh.getAttribute('data-region-hint'); if (rv === 'no') { V2.dismissRegionHint(lsx); render(); } else setRegion(rv); return; }
    var q6 = e.target.closest('[data-wt],[data-due],[data-tag-k],[data-fs-apply],[data-fs-del],#ftClear,#tmWhat');
    if (q6) {
      if (q6.id === 'ftClear') { resetFilters(); return; }
      if (q6.id === 'tmWhat') { $('tabMore').hidden = true; $('tabMoreBtn').setAttribute('aria-expanded', 'false'); if ($('bannerMore').hidden) $('btnBanner').click(); $('banner').scrollIntoView({ block: 'start' }); return; }
      if (q6.hasAttribute('data-wt')) { toggle(S.f.work, q6.getAttribute('data-wt')); S.rows = 50; render(); return; }
      if (q6.hasAttribute('data-due')) { var dv = q6.getAttribute('data-due'); S.f.dueWithin = dv ? +dv : null; S.rows = 50; render(); return; }
      if (q6.hasAttribute('data-tag-k')) { removeTagK(q6.getAttribute('data-tag-k'), q6.getAttribute('data-tag-v')); return; }
      if (q6.hasAttribute('data-fs-apply')) { applySet(q6.getAttribute('data-fs-apply')); return; }
      if (q6.hasAttribute('data-fs-del')) { deleteSet(q6.getAttribute('data-fs-del')); return; }
    }
    if (!e.target.closest('.qf')) document.querySelectorAll('.qf[open]').forEach(function (d) { d.open = false; });
    var dg = e.target.closest('[data-digest]'); if (dg) { var dk = dg.getAttribute('data-digest'); S.digest = S.digest === dk ? null : dk; S.rows = 50; $('digest').hidden = true; $('digestPill').setAttribute('aria-expanded', 'false'); render(); return; }
    var t = e.target.closest('[data-mode],[data-scope],[data-star],[data-open],[data-f],[data-fee],[data-cost],[data-month],[data-st],[data-tab]'); if (!t) return;
    if (t.tagName === 'A') e.preventDefault();
    if (t.hasAttribute('data-mode')) { setMode(t.getAttribute('data-mode')); return; }
    if (t.hasAttribute('data-star')) { var id = t.getAttribute('data-star'); if (!toggleStar(id)) return; if (!$('sheet').hidden) { refreshCapPanel(id); var sid = $('sheet').getAttribute('data-id'); $('shStar').className = 'star big' + (WATCH[sid] ? ' on' : ''); $('shStar').innerHTML = WATCH[sid] ? '&#9733;' : '&#9734;'; } render(); return; }
    if (t.hasAttribute('data-open')) { openSheet(t.getAttribute('data-open')); return; }
    if (t.hasAttribute('data-scope')) { var ns = t.getAttribute('data-scope'); if (ns === 'watch' && S.scope !== 'watch') { if (S.sort !== 'due' && S.sort !== 'decision') S.sort = 'due'; $('sort').value = S.sort; S.scope = ns; S.rows = 50; S.tlMonth = null; setTab('list'); return; } if (ns !== 'watch' && (S.sort === 'due' || S.sort === 'decision')) { S.sort = S.mode === 'pse' ? 'conf' : 'soon'; $('sort').value = S.sort; } if (S.mode === 'pse' && ns === 'advance' && S.sort === 'conf') { S.sort = 'date'; $('sort').value = 'date'; } S.scope = ns; S.rows = 50; S.tlMonth = null; render(); return; }
    if (t.hasAttribute('data-tab')) { setTab(t.getAttribute('data-tab')); return; }
    if (t.hasAttribute('data-month')) { var m = t.getAttribute('data-month'); S.tlMonth = S.tlMonth === m ? null : m; render(); return; }
    if (t.hasAttribute('data-fee')) { var v = t.getAttribute('data-fee'); S.f.feeMin = v === 'null' ? null : +v; render(); return; }
    if (t.hasAttribute('data-cost')) { var c = t.getAttribute('data-cost'); S.f.costMin = c === 'null' ? null : +c; render(); return; }
    if (t.hasAttribute('data-f')) { toggle(S.f[t.getAttribute('data-f')], t.getAttribute('data-k')); render(); return; }
    if (t.hasAttribute('data-st')) { var stk = t.getAttribute('data-st'), on0 = S.f.states.indexOf(stk) < 0, o0 = stateTotals(scoped(S.scope, ['states']))[stk]; toggle(S.f.states, stk); S.rows = 50; render(); toast(on0 ? (o0 ? stateTip(stk, o0) + '. List filtered to ' + (M.STATE_NAMES[stk] || stk) + '.' : 'Filtered to ' + (M.STATE_NAMES[stk] || stk) + '.') : 'Removed ' + (M.STATE_NAMES[stk] || stk) + ' from the filter.'); }
  });
  $('shClose').addEventListener('click', closeSheet); $('shBg').addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  $('shStar').addEventListener('click', function () { var id = $('sheet').getAttribute('data-id'); if (!toggleStar(id)) return; $('shStar').className = 'star big' + (WATCH[id] ? ' on' : ''); $('shStar').innerHTML = WATCH[id] ? '&#9733;' : '&#9734;'; refreshCapPanel(id); render(); });
  function onCapInput(e) { if (e.target.hasAttribute && e.target.hasAttribute('data-cap')) updateCapField(e.target); }
  document.addEventListener('input', onCapInput); document.addEventListener('change', onCapInput);
  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.hasAttribute && d.hasAttribute('data-capopen')) { var id = d.getAttribute('data-capopen'); if (d.open) S.capOpen[id] = true; else delete S.capOpen[id]; } }, true);
  $('capSort').addEventListener('click', function (e) { var b = e.target.closest('[data-capsort]'); if (!b) return; S.sort = b.getAttribute('data-capsort'); $('sort').value = S.sort; render(); });
  initTopDet();
  document.addEventListener('click', function (e) { var w = e.target.closest('[data-way]'); if (w) wayOut(w.getAttribute('data-way')); });
  $('btnPurIcs').addEventListener('click', exportPursuitIcs); $('btnViewIcs').addEventListener('click', exportViewIcs);
  $('since').addEventListener('click', function (e) { if (e.target.closest('#sinceX')) { try { ssn && ssn.setItem(V4.SINCE_DISMISS, '1'); } catch (er) {} $('since').hidden = true; return; } var b = e.target.closest('[data-since]'); if (b) sinceTap(b.getAttribute('data-since')); });
  $('btnCapCsv').addEventListener('click', exportCapCsv); $('btnPurCsv').addEventListener('click', exportCapCsv); $('btnPurPrint').addEventListener('click', printPursuits); $('wkClose').addEventListener('click', closeWeekly); $('wkPrint').addEventListener('click', weeklyPrint); $('wkShare').addEventListener('click', weeklyShare); $('wkCopy').addEventListener('click', weeklyCopy); $('wkDl').addEventListener('click', weeklyDownload); document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('weekly').hidden) closeWeekly(); }); $('btnBackup').addEventListener('click', exportBackup);
  $('btnRestore').addEventListener('click', function () { S.restoreMode = 'merge'; $('restoreFile').value = ''; $('restoreFile').click(); });
  $('btnRestoreAll').addEventListener('click', function () { S.restoreMode = 'replace'; $('restoreFile').value = ''; $('restoreFile').click(); });
  $('restoreFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { restoreBackup(String(rd.result), S.restoreMode); }; rd.onerror = function () { toast('Could not read that file.'); }; rd.readAsText(f); });
  $('shBody').addEventListener('input', function (e) { if (!e.target.closest('#whatif')) return; if (e.target.hasAttribute('data-ovr')) runWhatIf(true); else runWhatIf(false); });
  $('regionSel').innerHTML = V2.REGIONS.map(function (g) { return '<option value="' + g.id + '">' + esc(g.label) + '</option>'; }).join(''); $('regionSel').value = S.region;
  $('regionSel').addEventListener('change', function () { setRegion(this.value); });
  $('q').addEventListener('input', function () { S.f.q = this.value.trim(); S.rows = 50; render(); });
  $('sort').addEventListener('change', function () { S.sort = this.value; render(); });
  $('btnMoreRows').addEventListener('click', function () { S.rows += 50; render(); });
  $('btnMore').addEventListener('click', function () { var o = $('adv').hidden; $('adv').hidden = !o; this.setAttribute('aria-expanded', String(o)); });
  $('digestPill').addEventListener('click', function (e) { e.stopPropagation(); if (S.digest) { S.digest = null; $('digest').hidden = true; this.setAttribute('aria-expanded', 'false'); render(); return; } var o = $('digest').hidden; $('digest').hidden = !o; this.setAttribute('aria-expanded', String(o)); });
  $('tabMoreBtn').addEventListener('click', function (e) { e.stopPropagation(); var o = $('tabMore').hidden; $('tabMore').hidden = !o; this.setAttribute('aria-expanded', String(o)); });
  document.addEventListener('click', function (e) { // close popovers on outside click
    if (!e.target.closest('#tabMore,#tabMoreBtn')) { $('tabMore').hidden = true; $('tabMoreBtn').setAttribute('aria-expanded', 'false'); }
    document.querySelectorAll('details.scmore[open]').forEach(function (d) { if (!d.contains(e.target)) d.open = false; });
  }, true);
  // Theme: Day is the default; Night (the original dark look) or Auto only when picked. Key nr.theme is new, so everyone starts in Day.
  function themePref() { try { return localStorage.getItem('nr.theme') || 'day'; } catch (e) { return 'day'; } }
  function applyTheme(p) {
    var dark = p === 'night' || (p === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches), t = dark ? 'night' : 'day', d = document.documentElement;
    d.setAttribute('data-theme', t); d.setAttribute('data-theme-pref', p); d.style.colorScheme = dark ? 'dark' : 'light';
    var m = document.getElementById('themeColor'); if (m) m.setAttribute('content', dark ? '#0a1020' : '#f5f7fb');
    var b = document.getElementById('sbStyle'); if (b) b.setAttribute('content', dark ? 'black-translucent' : 'default');
    document.querySelectorAll('[data-theme-set]').forEach(function (x) { var on = x.getAttribute('data-theme-set') === p; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  }
  document.querySelectorAll('[data-theme-set]').forEach(function (x) { x.addEventListener('click', function (e) { e.stopPropagation(); var p = x.getAttribute('data-theme-set'); try { localStorage.setItem('nr.theme', p); } catch (er) {} applyTheme(p); }); });
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'), onMq = function () { if (themePref() === 'auto') applyTheme('auto'); }; if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
  applyTheme(themePref());
  $('btnBanner').addEventListener('click', function () { var o = $('bannerMore').hidden; $('bannerMore').hidden = !o; this.setAttribute('aria-expanded', String(o)); this.innerHTML = o ? 'Less &lsaquo;' : 'What counts &rsaquo;'; $('banner').classList.toggle('open', o); });
  $('btnHow').addEventListener('click', function () { var o = $('how').hidden; $('how').hidden = !o; this.setAttribute('aria-expanded', String(o)); });
  $('btnCsv').addEventListener('click', exportCsv); $('btnLive').addEventListener('click', liveRefresh);
  function resetFilters() { S.f = freshF(); $('q').value = ''; S.region = 'all'; V2.saveRegion(lsx, 'all'); S.rows = 50; render(); toast('Filters reset (Confirmed only and your watchlist are unchanged).'); }
  $('fsSave').addEventListener('click', saveSet); $('fsName').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveSet(); } });
  document.querySelectorAll('.qf').forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) document.querySelectorAll('.qf[open]').forEach(function (o) { if (o !== d) o.open = false; }); }); });
  $('btnClear').addEventListener('click', resetFilters); $('btnReset').addEventListener('click', resetFilters);
  $('feeIn').addEventListener('input', function () { var v = parseFloat(this.value); S.f.feeMin = isFinite(v) && v >= 0 ? Math.round(v * 1e6) : 0; S.rows = 50; render(); });
  $('costIn').addEventListener('input', function () { var v = parseFloat(this.value); S.f.costMin = isFinite(v) && v >= 0 ? Math.round(v * 1e6) : 0; S.rows = 50; render(); });
  $('dbIn').addEventListener('input', function () { var v = parseFloat(this.value); S.f.dbMin = isFinite(v) && v >= 0 ? Math.round(v * 1e6) : null; S.rows = 50; render(); });
  $('btnIncl').addEventListener('click', function () { S.f.inclusive = !S.f.inclusive; render(); });
  function setConf(v) { CONF = !!v; S.f.hideUnconfirmed = CONF; try { localStorage.setItem('nr.confirmedOnly', CONF ? '1' : '0'); } catch (e) { /* ignore */ } S.rows = 50; render(); }
  $('btnConfOnly').addEventListener('click', function () { setConf(!CONF); });
  $('btnText').addEventListener('click', function () { S.f.noText = !S.f.noText; render(); });

  // ---------- start ----------
  function loadJ(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  Promise.all([loadJ('data/national.json'), loadJ('data/roadway.json').catch(function () { return null; }), loadJ('data/cost-prices.json').catch(function () { return null; }), loadJ('data/pse.json').catch(function () { return null; }), loadJ('data/source-status.json').catch(function () { return null; }), loadJ('../texas/data/source-status.json').catch(function () { return null; })]).then(function (x) {
    HEALTH = V4.health([x[4], x[5]]); renderHealthDot();
    var lastTab = null; try { lastTab = localStorage.getItem('nr.tab'); } catch (e) { lastTab = null; } if (['map', 'list', 'timeline', 'break', 'pursuits', 'data'].indexOf(lastTab) >= 0 && lastTab !== 'map') S.tab = lastTab; // v6: List is the default; the full map is one tap away
    DATA_W = x[0]; DATA_R = x[1]; PRICES = x[2]; DATA_P = x[3]; migrateWatch(); NEWBASE = V2.baseline(lsx, ssn, latestAsOf());
    setMode();
    setTab(S.tab);
  }).catch(function (e) { $('freshTxt').textContent = 'Could not load data/national.json (' + e.message + '). Open the app once while online so it can be saved for offline use.'; $('freshDot').className = 'dot bad'; });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
