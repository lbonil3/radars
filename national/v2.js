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
  return { NEW_KEY: NEW_KEY, SESSION_KEY: SESSION_KEY, SOON_DAYS: SOON_DAYS, carryFirstSeen: carryFirstSeen, baseline: baseline, markAllSeen: markAllSeen, isNew: isNew, isClosingSoon: isClosingSoon, dueOf: dueOf, dayNum: dayNum };
});
