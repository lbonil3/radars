/* National Radar v2 helpers (browser + Node, no dependencies): first-seen dates and "new since last visit". */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NRV2 = factory(); })(this, function () {
  'use strict';
  var NEW_KEY = 'nr.seenThrough', SESSION_KEY = 'nr.newBaseline', SOON_DAYS = 14;
  function dayNum(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : null; }
  // Build step: keep firstSeen for ids already in the previous snapshot; new ids get today (the snapshot date).
  // Migration: a previous record without firstSeen gets the previous snapshot's asOfDate.
  function carryFirstSeen(records, prev, today) {
    var map = {}; if (prev && prev.records) prev.records.forEach(function (r) { var fs = r.firstSeen || prev.asOfDate; if (fs && (!map[r.id] || fs < map[r.id])) map[r.id] = fs; (r.also || []).forEach(function (a) { var k = a.src + ':' + a.id; if (fs && !map['also:' + k]) map['also:' + k] = fs; }); });
    var carried = 0;
    records.forEach(function (r) {
      var fs = map[r.id]; if (!fs) (r.also || []).forEach(function (a) { var x = map['also:' + a.src + ':' + a.id] || map[a.src + ':' + a.id]; if (x && (!fs || x < fs)) fs = x; });
      if (fs && fs > today) fs = today;
      if (fs) carried++; r.firstSeen = fs || today;
    });
    return { carried: carried, fresh: records.length - carried };
  }
  // Newness baseline. First-ever visit: baseline = current snapshot date, so nothing is "new" yet (documented choice).
  // The baseline is frozen for the browser session (sessionStorage) so reloading does not wipe the New list; the stored
  // seenThrough moves forward to the newest snapshot date the user has opened.
  function baseline(store, session, asOf) {
    var b = null; try { b = session && session.getItem(SESSION_KEY); } catch (e) { b = null; }
    if (!b) { var last = null; try { last = store && store.getItem(NEW_KEY); } catch (e) { last = null; } b = last || asOf; try { if (session) session.setItem(SESSION_KEY, b); } catch (e) { /* ignore */ } }
    try { var cur = store && store.getItem(NEW_KEY); if (store && (!cur || asOf > cur)) store.setItem(NEW_KEY, asOf); } catch (e) { /* ignore */ }
    return b;
  }
  function markAllSeen(store, session, asOf) { try { if (store) store.setItem(NEW_KEY, asOf); if (session) session.setItem(SESSION_KEY, asOf); } catch (e) { /* ignore */ } return asOf; }
  function isNew(r, base) { return !!(r.firstSeen && base && r.firstSeen > base); }
  function dueOf(r) { var d = r.dates || {}; return d.due || d.responseDue || null; }
  function isClosingSoon(r, today, days) {
    var due = dueOf(r); if (!due || r.status === 'awarded' || r.bucket === 'award' || r.bucket === 'closed') return false;
    var a = dayNum(due), t = dayNum(today); if (a === null || t === null) return false;
    var n = a - t; return n >= 0 && n <= (days === undefined ? SOON_DAYS : days);
  }
  // ---- item 3: region focus ----
  var REGION_KEY = 'nr.region', HINT_KEY = 'nr.regionHint';
  var REGIONS = [
    { id: 'all', label: 'All US', states: null },
    { id: 'tx', label: 'Texas', states: ['TX'] },
    { id: 'gulf', label: 'Texas + Gulf states', states: ['TX', 'LA', 'MS', 'AL', 'FL'] },
    { id: 'near', label: 'Texas + neighbors', states: ['TX', 'NM', 'OK', 'AR', 'LA'] }
  ];
  function regionOf(id) { for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === id) return REGIONS[i]; return REGIONS[0]; }
  // Records without a stated state are kept only in "All US" (a region filter never guesses a location).
  function inRegion(r, id) { var g = regionOf(id); return !g.states || (!!r.state && g.states.indexOf(r.state) >= 0); }
  function loadRegion(store) { var v = null; try { v = store && store.getItem(REGION_KEY); } catch (e) { v = null; } return regionOf(v).id; }
  function saveRegion(store, id) { try { if (store) store.setItem(REGION_KEY, regionOf(id).id); } catch (e) { /* ignore */ } }
  function showRegionHint(store) { try { return !!store && !store.getItem(REGION_KEY) && !store.getItem(HINT_KEY); } catch (e) { return false; } }
  function dismissRegionHint(store) { try { if (store) store.setItem(HINT_KEY, '1'); } catch (e) { /* ignore */ } }
  // ---- item 4: My pursuits (shared capture model, capture.js) ----
  // Rows = every starred record plus any record with a non-empty capture file; sorted by due date (CP.sortRows 'due').
  function pursuitRows(watch, cap, snapFn, today, CP) {
    var ids = {}; Object.keys(watch || {}).forEach(function (id) { ids[id] = 1; });
    Object.keys(cap || {}).forEach(function (id) { if (cap[id] && !CP.isEmpty(cap[id])) ids[id] = 1; });
    var rows = Object.keys(ids).map(function (id) { var c = (cap && cap[id]) || CP.blank(), sn = snapFn(id) || (c.snap) || { title: id }; var d = CP.dueInfo(c.due, today); return { id: id, cap: c, snap: sn, title: sn.title, flag: d.flag, days: d.days, week: d.flag === 'overdue' || (d.days !== null && d.days <= 7) }; });
    return CP.sortRows(rows, 'due');
  }
  // ---- item 5: cross-source duplicate cards (conservative) ----
  var STOP = /\b(the|of|and|for|a|an|to|in|on|at|services?|project)\b/g;
  function normTitle(t) { return String(t || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(STOP, ' ').replace(/\s+/g, ' ').trim(); }
  function normAgency(a) { return String(a || '').toLowerCase().replace(/^(us|u s|united states)\s+/, '').replace(/[^a-z0-9]+/g, ' ').replace(/\b(department|dept|of|the)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
  function nid(x) { var k = String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return k.length >= 6 ? k : ''; }
  function ids(r) { return [nid(r.solNum), nid(r.awardNum)].filter(Boolean); }
  function span(r) { var d = r.dates || {}, v = [d.posted, d.due, d.award].filter(function (x) { return /^\d{4}-\d{2}-\d{2}/.test(x || ''); }).map(function (x) { return x.slice(0, 10); }).sort(); return v.length ? [v[0], v[v.length - 1]] : null; }
  function overlap(a, b) { var x = span(a), y = span(b); return !!(x && y && x[0] <= y[1] && y[0] <= x[1]); }
  function amtOf(r) { return r.amt && typeof r.amt.v === 'number' ? r.amt.v : null; }
  // Two records are the same opportunity when (a) they share a solicitation / award number, or (b) the normalized
  // title is identical (>= 20 chars), the agency or the stated state matches, the date ranges overlap, and neither has a
  // notice number that contradicts the other. Different PS&E lenses (fee / design-build / pipeline / advance) never merge.
  function sameOpp(a, b) {
    if (a === b || (a.src === b.src && a.srcId && a.srcId === b.srcId)) return false;
    if ((a.lens || '') !== (b.lens || '')) return false;
    var ia = ids(a), ib = ids(b), shared = ia.some(function (x) { return ib.indexOf(x) >= 0; });
    if (shared) return true;
    if (ia.length && ib.length) return false; // both carry notice numbers and none match: distinct notices
    var ta = normTitle(a.title); if (ta.length < 20 || ta !== normTitle(b.title)) return false;
    var ag = normAgency(a.agency) && normAgency(a.agency) === normAgency(b.agency), st = a.state && a.state === b.state;
    if (!(ag || st)) return false;
    if (a.state && b.state && a.state !== b.state) return false;
    return overlap(a, b);
  }
  function confRank(r) { return (r.conf === 'confirmed' ? 8 : 0) + (r.bucket === 'opp' ? 4 : r.bucket === 'award' ? 3 : r.bucket === 'review' ? 2 : 1) + (amtOf(r) !== null ? 1 : 0); }
  // Returns cards: one per opportunity. The card is the highest-confidence record (its amount is shown); every other
  // record is kept in card.dupes with its own source link and amount; amountsDiffer flags a disagreement (never averaged).
  function groupDupes(list) {
    var n = list.length, parent = []; for (var i = 0; i < n; i++) parent.push(i);
    function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    var byT = {}; list.forEach(function (r, i) { var k = normTitle(r.title); (byT[k] = byT[k] || []).push(i); ids(r).forEach(function (x) { (byT['#' + x] = byT['#' + x] || []).push(i); }); });
    Object.keys(byT).forEach(function (k) { var g = byT[k]; for (var a = 0; a < g.length; a++) for (var b = a + 1; b < g.length; b++) if (sameOpp(list[g[a]], list[g[b]])) { var x = find(g[a]), y = find(g[b]); if (x !== y) parent[Math.max(x, y)] = Math.min(x, y); } });
    var groups = {}, order = []; list.forEach(function (r, i) { var g = find(i); if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(r); });
    return order.map(function (g) {
      var m = groups[g]; if (m.length === 1) return m[0];
      var pick = m[0]; m.forEach(function (r) { if (confRank(r) > confRank(pick) || (confRank(r) === confRank(pick) && ((r.dates || {}).posted || '') > ((pick.dates || {}).posted || ''))) pick = r; });
      var others = m.filter(function (r) { return r !== pick; }), pa = amtOf(pick);
      var card = Object.assign({}, pick, { dupes: others.map(function (r) { return { id: r.id, src: r.src, url: r.url, title: r.title, amt: amtOf(r), conf: r.conf || r.bucket }; }) });
      card.amountsDiffer = others.some(function (r) { var v = amtOf(r); return v !== null && v !== pa; });
      return card;
    });
  }
  return { normTitle: normTitle, sameOpp: sameOpp, groupDupes: groupDupes, CONF_KEY: 'nr.confirmedOnly', pursuitRows: pursuitRows, REGIONS: REGIONS, REGION_KEY: REGION_KEY, HINT_KEY: HINT_KEY, regionOf: regionOf, inRegion: inRegion, loadRegion: loadRegion, saveRegion: saveRegion, showRegionHint: showRegionHint, dismissRegionHint: dismissRegionHint,
    NEW_KEY: NEW_KEY, SESSION_KEY: SESSION_KEY, SOON_DAYS: SOON_DAYS, carryFirstSeen: carryFirstSeen, baseline: baseline, markAllSeen: markAllSeen, isNew: isNew, isClosingSoon: isClosingSoon, dueOf: dueOf, dayNum: dayNum };
});
