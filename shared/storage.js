/* Key read/write and copy-forward migration. Browser + Node, no dependencies. Never deletes a legacy key. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.RadarStorage = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function migrateCopy(ls, fromKey, toKey) {
    try {
      var cur = ls.getItem(toKey);
      if (cur !== null && cur !== '') return false;
      var old = ls.getItem(fromKey);
      if (old === null || old === '') return false;
      ls.setItem(toKey, old);
      return true;
    } catch (e) { return false; }
  }
  function read(ls, key, fallbackKeys) {
    try {
      var v = ls.getItem(key);
      if (v !== null && v !== '') return v;
      var fb = fallbackKeys || [];
      for (var i = 0; i < fb.length; i++) {
        v = ls.getItem(fb[i]);
        if (v !== null && v !== '') return v;
      }
      return null;
    } catch (e) { return null; }
  }
  function write(ls, key, value) {
    try { ls.setItem(key, value); return true; } catch (e) { return false; }
  }
  function readJSON(ls, key, fallbackKeys, fallbackValue) {
    var fb = fallbackValue === undefined ? null : fallbackValue;
    var raw = read(ls, key, fallbackKeys);
    if (raw === null) return fb;
    try { return JSON.parse(raw); } catch (e) { return fb; }
  }
  function writeJSON(ls, key, value) {
    try { return write(ls, key, JSON.stringify(value)); } catch (e) { return false; }
  }
  return { migrateCopy: migrateCopy, read: read, write: write, readJSON: readJSON, writeJSON: writeJSON };
});
