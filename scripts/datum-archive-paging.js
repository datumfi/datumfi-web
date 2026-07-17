/* datum-archive-paging.js — Datum FI shared LAZY pager for the gallery archives (blueprint + sketchbook).
 * Mirrors the Blueprint archive's proven behavior (Blueprint.html pageCount/renderArchivePage/turnPage):
 * PER-per-page over an UNLIMITED list; page N exists ONLY when the list is long enough
 * (pageCount = ceil(len/PER)); it NEVER pre-spawns empty future pages. Pure + framework-free so the
 * behavior gate can spy the REAL logic (not grep). ADDITIVE — nothing consumes this until a caller opts in. */
(function (global) {
  'use strict';
  // makePager(getList, PER): getList() returns the CURRENT full array (unlimited); the pager never copies
  // or caps it — the live list is always the source of truth (a shrunk/offline list simply pages smaller,
  // it can never re-impose an old cap). Trailing in-page positions are null (an unfilled slot), which is NOT
  // a pre-spawned page: pageCount is driven purely by the real length.
  function makePager(getList, PER) {
    PER = PER || 4;
    var page = 0;
    function list() { try { var l = getList(); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
    function pageCount() { return Math.max(1, Math.ceil(list().length / PER)); }
    function clamp() { var pc = pageCount(); if (page > pc - 1) page = pc - 1; if (page < 0) page = 0; return page; }
    var API = {
      PER: PER,
      get page() { return clamp(); },
      set page(p) { page = (typeof p === 'number') ? p : 0; clamp(); },
      total: function () { return list().length; },
      pageCount: pageCount,
      startIndex: function (p) { var pg = (typeof p === 'number') ? p : clamp(); return pg * PER; },
      // the PER cells of a page; empties are null (unfilled slot), never a whole pre-spawned page.
      slice: function (p) { var pg = (typeof p === 'number') ? p : clamp(); var s = pg * PER, L = list(), out = []; for (var i = 0; i < PER; i++) out.push(L[s + i] || null); return out; },
      hasPaging: function () { return pageCount() > 1; },          // turn UI shows ONLY past PER (lazy: appears at item PER+1)
      canPrev: function () { return clamp() > 0; },
      canNext: function () { return clamp() < pageCount() - 1; },  // FALSE on the last page -> no pre-spawned next page
      next: function () { if (API.canNext()) page = clamp() + 1; return API.page; },
      prev: function () { if (API.canPrev()) page = clamp() - 1; return API.page; },
      // jump to the page that contains global index gi (used after a save-as-new to land on the new sheet)
      pageOfIndex: function (gi) { return Math.max(0, Math.floor(gi / PER)); }
    };
    return API;
  }
  var M = { makePager: makePager };
  global.DatumArchivePaging = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this)));
