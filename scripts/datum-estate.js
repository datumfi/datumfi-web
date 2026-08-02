/* DatumFI · Estate renderer — S2.3 extraction of _updateSVGsCoreImpl Block C
   (the SVG drawing pass). PURE DRAW into ctx.svgContainer — no hub writes, nothing global
   out (LOCK-3). Closure severed via an explicit ctx; a missing field surfaces in the parity
   gate. Block C moved BYTE-FOR-BYTE except 3 mechanical host rewrites:
     document.getElementById('ch-machine')  -> ctx.machineEl
     document.getElementById('spend-input') -> ctx.spendInputEl
     state.accounts.forEach(...)            -> ctx.accounts.forEach(...)
   Loaded as a SEPARATE deferred module (WATCH-A) — never inlined into studio.html. */
(function () {
  'use strict';

  // S2.5 (Dispatch A Task 3) — fill is BINARY: a typed value fills the room completely; $0 stays an
  // empty room. The concave FILL_K/floor/cap scaling is retired (a room either holds capital or it
  // doesn't). The descriptor still carries fillPct; the --weight wall driver and the §16.2-iii
  // descriptor surface are unchanged.
  function fillPct(v) { return v > 0 ? 100 : 0; }

  // ── Architecture pass · Step 1 — REAL doorways on shared walls ───────────────────────────────
  // The faux arch-marks are gone. A doorway = the existing navy wall-cutout (a true opening) PLUS a
  // proper floor-plan door symbol (a swing arc + leaf). Position varies deterministically per room
  // (estates don't put every door dead-center), swing side varies, and large accounts get a double
  // door. Drawn as a faint teal drafting mark, inline (no studio.html change).
  var DOOR_STYLE = 'stroke="var(--teal-mid)" stroke-width="1" fill="none" opacity="0.42"';
  function _hashFrac(s, salt) {
    var str = String(s) + (salt || ''), h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000;
  }
  function _doorWidth(span, big) { return big ? Math.min(120, span * 0.72) : Math.min(48, span * 0.5); }
  // Door on a HORIZONTAL wall at y=wy spanning [xL,xR]: opening + straight leaf + quarter-circle
  // swing arc (convex, INTO the room). dir = +1 swings down, -1 up. Position + side vary by seed.
  function _doorH(wy, xL, xR, seed, big) {
    var span = xR - xL; if (span < 44) return '';
    var dW = _doorWidth(span, big);
    var usable = Math.max(0, span - 28 - dW);
    var cx = xL + 14 + dW / 2 + _hashFrac(seed) * usable;
    var ax = cx - dW / 2, bx = cx + dW / 2;
    var dir = _hashFrac(seed, 'swing') > 0.5 ? 1 : -1;
    var out = '<path d="M ' + ax + ' ' + wy + ' L ' + bx + ' ' + wy + '" class="wall-cutout"/>';   // opening
    if (big) {
      var hw = dW / 2;   // two leaves hinged at the ends, swinging to the centre
      out += '<path d="M ' + ax + ' ' + wy + ' L ' + ax + ' ' + (wy + dir * hw) + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + cx + ' ' + wy + '" ' + DOOR_STYLE + '/>';
      out += '<path d="M ' + bx + ' ' + wy + ' L ' + bx + ' ' + (wy + dir * hw) + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + cx + ' ' + wy + '" ' + DOOR_STYLE + '/>';
    } else {
      out += '<path d="M ' + ax + ' ' + wy + ' L ' + ax + ' ' + (wy + dir * dW) + ' A ' + dW + ' ' + dW + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + bx + ' ' + wy + '" ' + DOOR_STYLE + '/>';
    }
    return out;
  }
  // Door on a VERTICAL wall at x=wx spanning [yT,yB]. dir = +1 swings right (into the next column).
  function _doorV(wx, yT, yB, seed, big) {
    var span = yB - yT; if (span < 44) return '';
    var dW = _doorWidth(span, big);
    var usable = Math.max(0, span - 28 - dW);
    var cy = yT + 14 + dW / 2 + _hashFrac(seed) * usable;
    var ay = cy - dW / 2, by = cy + dW / 2;
    var dir = _hashFrac(seed, 'swing') > 0.5 ? 1 : -1;
    var out = '<path d="M ' + wx + ' ' + ay + ' L ' + wx + ' ' + by + '" class="wall-cutout"/>';   // opening
    if (big) {
      var hw = dW / 2;
      out += '<path d="M ' + wx + ' ' + ay + ' L ' + (wx + dir * hw) + ' ' + ay + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + wx + ' ' + cy + '" ' + DOOR_STYLE + '/>';
      out += '<path d="M ' + wx + ' ' + by + ' L ' + (wx + dir * hw) + ' ' + by + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + wx + ' ' + cy + '" ' + DOOR_STYLE + '/>';
    } else {
      out += '<path d="M ' + wx + ' ' + ay + ' L ' + (wx + dir * dW) + ' ' + ay + ' A ' + dW + ' ' + dW + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + wx + ' ' + by + '" ' + DOOR_STYLE + '/>';
    }
    return out;
  }

  // ── Phase A · Estate-dissolve — "rooms stop being alone" ─────────────────────────────────────
  // The per-room box stroke + per-room doors are gone (see the cols loop). Walls are drawn ONCE as an
  // estate SHELL: (a) one heavy ENVELOPE around the column union (flat shared top, stepped bottom);
  // (b) interior shared edges become OPEN THRESHOLDS (single light stubs + a varied gap, never doubled);
  // (c) PRIVATE rooms (Vault + debt) stay SEALED (full enclosure + one door). All inline-styled — zero
  // studio.html edit (E5). Tuned by eye via SHELL_TUNE. Hallways = Phase B (not here).
  var SHELL_TUNE = { openness: 1, envWeight: 8, partWeight: 0.5 };   // Captain-locked 2026-06-25 (eyes-on)

  function _envelopePath(colInfo, jut) {
    if (!colInfo.length) return '';
    var top = colInfo[0].top, n = colInfo.length, last = colInfo[n - 1];
    var d = 'M ' + colInfo[0].x + ' ' + top;
    if (jut && jut.x1 > jut.x0) {                                            // A.1 Foyer jut: top wall steps OUT
      var jt = top - jut.depth;
      d += ' L ' + jut.x0 + ' ' + top + ' L ' + jut.x0 + ' ' + jt +
           ' L ' + jut.x1 + ' ' + jt + ' L ' + jut.x1 + ' ' + top;
    }
    d += ' L ' + (last.x + last.w) + ' ' + top;                              // flat top across all columns
    d += ' L ' + (last.x + last.w) + ' ' + last.bottom;                      // right edge down
    for (var i = n - 1; i >= 0; i--) {
      d += ' L ' + colInfo[i].x + ' ' + colInfo[i].bottom;                   // across col i bottom (R->L)
      if (i > 0) d += ' L ' + colInfo[i].x + ' ' + colInfo[i - 1].bottom;    // step to the left col's bottom
    }
    return d + ' Z';                                                         // up the left edge
  }
  function _sharedEdges(roomRects, colInfo) {
    var edges = [];
    for (var k = 0; k < roomRects.length; k++) {                             // horizontal: stacked rooms
      var r = roomRects[k]; if (r.last) continue;
      var below = roomRects[k + 1]; if (!below || below.col !== r.col) continue;
      if (r.priv || below.priv) continue;                                    // private enclosure walls it
      edges.push({ id: r.id + '_h', x0: r.x, y0: r.y + r.h, x1: r.x + r.w, y1: r.y + r.h });
    }
    for (var c = 0; c < colInfo.length - 1; c++) {                           // vertical: between columns
      var A = colInfo[c], B = colInfo[c + 1];
      var x = A.x + A.w, yT = A.top, yB = Math.min(A.bottom, B.bottom);
      if (yB - yT < 30) continue;
      edges.push({ id: 'col' + c + '_v', x0: x, y0: yT, x1: x, y1: yB });
    }
    return edges;
  }
  function _openThreshold(edge, o) {
    var dx = edge.x1 - edge.x0, dy = edge.y1 - edge.y0, L = Math.hypot(dx, dy);
    if (L < 1) return '';
    var ux = dx / L, uy = dy / L;
    var keep = L * Math.max(0, Math.min(1, 1 - o));                          // wall kept; gap = L - keep
    if (keep < 1) return '';                                                 // fully open -> no stub at all
    var style = 'stroke="var(--teal-mid)" stroke-width="' + SHELL_TUNE.partWeight + '" opacity="0.4" stroke-linecap="round"';
    function seg(a, b) {
      return '<line class="estate-partition" data-edge="' + edge.id + '" x1="' + (edge.x0 + ux * a) + '" y1="' + (edge.y0 + uy * a) +
             '" x2="' + (edge.x0 + ux * b) + '" y2="' + (edge.y0 + uy * b) + '" ' + style + '/>';
    }
    if (_hashFrac(edge.id) < 0.5) { var s = keep / 2; return seg(0, s) + seg(L - s, L); }   // centered gap
    var off = (L - keep) * (0.2 + 0.5 * _hashFrac(edge.id, 'off'));                          // short jog
    return seg(off, off + keep);
  }
  function _privEnclosure(r) {
    var col = r.isDebt ? 'var(--danger)' : 'var(--teal-mid)';
    return '<rect class="estate-wall-private" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h +
           '" style="fill:none;stroke:' + col + ';stroke-width:1.6px;opacity:0.85"/>';
  }
  // A.2 — a sealed room gets ONE door, on a wall facing OPEN space or the EXTERIOR; NEVER on a wall
  // shared with another sealed room (those stay solid party walls). Position along the chosen wall is
  // DETERMINISTIC (reuses _doorH/_doorV's id-hash) so doors vary room-to-room without jitter. This is
  // the estate-level door RULE (which wall), not per-room character.
  function _roomsByCol(roomRects) {
    var m = {};
    roomRects.forEach(function (r) { (m[r.ci] = m[r.ci] || []).push(r); });
    Object.keys(m).forEach(function (k) { m[k].sort(function (a, b) { return a.ri - b.ri; }); });
    return m;
  }
  function _sealedDoor(r, byCol, lastCi) {
    function vert(ci, y0, y1) {                                              // class the column across a vertical wall
      var list = byCol[ci] || [], open = false, sealed = false, saw = false;
      list.forEach(function (o) { if (o.y < y1 && o.y + o.h > y0) { saw = true; if (o.priv) sealed = true; else open = true; } });
      return !saw ? 'exterior' : (open ? 'open' : 'sealed');
    }
    var col = byCol[r.ci] || [], up = col[r.ri - 1], dn = col[r.ri + 1];
    var walls = [
      { kind: r.ri === 0     ? 'exterior' : (up && up.priv ? 'sealed' : up ? 'open' : 'exterior'), axis:'h', f:r.y,       a:r.x, b:r.x + r.w },  // top
      { kind: r.last         ? 'exterior' : (dn && dn.priv ? 'sealed' : dn ? 'open' : 'exterior'), axis:'h', f:r.y + r.h, a:r.x, b:r.x + r.w },  // bottom
      { kind: r.ci === 0     ? 'exterior' : vert(r.ci - 1, r.y, r.y + r.h),  axis:'v', f:r.x,       a:r.y, b:r.y + r.h },                         // left
      { kind: r.ci === lastCi ? 'exterior' : vert(r.ci + 1, r.y, r.y + r.h), axis:'v', f:r.x + r.w, a:r.y, b:r.y + r.h }                          // right
    ];
    var rank = { open: 0, exterior: 1 };
    var cand = walls.filter(function (w) { return w.kind in rank; })
                    .sort(function (x, y) { return rank[x.kind] - rank[y.kind]; });   // prefer OPEN, then exterior
    var w = cand[0];
    if (!w) w = walls[1];   // LANDLOCKED-SEALED FALLBACK: no open/exterior wall exists -> ONE door on the
                            // bottom wall, necessarily on a sealed wall. This is the LONE sanctioned exception
                            // to the never-cut-a-sealed-wall rule (never doorless). NOT cluster door-sharing
                            // (that is the parked cluster refinement).
    var big = r.val >= 250000;
    return (w.axis === 'h') ? _doorH(w.f, w.a, w.b, r.id, big) : _doorV(w.f, w.a, w.b, r.id, big);
  }

  // A.4 — a contiguous vertical RUN of sealed rooms in a column = a "debt wing". Returns the runs.
  function _sealedWings(roomRects, byCol) {
    var wings = [];
    Object.keys(byCol).forEach(function (ci) {
      var run = null;
      byCol[ci].forEach(function (r) {                            // byCol[ci] sorted by ri
        if (r.priv) { if (!run) { run = []; wings.push(run); } run.push(r); }
        else run = null;                                          // an open room breaks the run
      });
    });
    return wings;                                                 // each = array of consecutive sealed rooms
  }
  // A.4 — ONE shared door for a wing (run>=2), on its open-facing/exterior wall nearest the wing center.
  // A run of length 1 = an isolated sealed room -> A.2 rule UNCHANGED (so the supersession can never be
  // mistaken for an A.2 regression). This SUPERSEDES the A.2 single-room landlocked fallback for runs>=2.
  function _wingDoor(wing, byCol, lastCi) {
    if (wing.length === 1) return _sealedDoor(wing[0], byCol, lastCi);   // isolated sealed room -> A.2
    var ci = wing[0].ci, topR = wing[0], botR = wing[wing.length - 1];
    function vert(c, y0, y1) {
      var list = byCol[c] || [], open = false, sealed = false, saw = false;
      list.forEach(function (o) { if (o.y < y1 && o.y + o.h > y0) { saw = true; if (o.priv) sealed = true; else open = true; } });
      return !saw ? 'exterior' : (open ? 'open' : 'sealed');
    }
    var cands = [];
    wing.forEach(function (r) {                                   // each room's side walls
      var lk = r.ci === 0      ? 'exterior' : vert(r.ci - 1, r.y, r.y + r.h);
      var rk = r.ci === lastCi ? 'exterior' : vert(r.ci + 1, r.y, r.y + r.h);
      if (lk !== 'sealed') cands.push({ kind: lk, axis: 'v', f: r.x,       a: r.y, b: r.y + r.h, c: r.y + r.h / 2, seed: r.id });
      if (rk !== 'sealed') cands.push({ kind: rk, axis: 'v', f: r.x + r.w, a: r.y, b: r.y + r.h, c: r.y + r.h / 2, seed: r.id });
    });
    var tUp = byCol[ci][topR.ri - 1], bDn = byCol[ci][botR.ri + 1];   // a maximal run is always bounded
    var tk = topR.ri === 0 ? 'exterior' : (tUp && tUp.priv ? 'sealed' : tUp ? 'open' : 'exterior');   // above/below by an
    var bk = botR.last      ? 'exterior' : (bDn && bDn.priv ? 'sealed' : bDn ? 'open' : 'exterior');   // open room or the edge
    if (tk !== 'sealed') cands.push({ kind: tk, axis: 'h', f: topR.y,        a: topR.x, b: topR.x + topR.w, c: topR.x + topR.w / 2, seed: topR.id });
    if (bk !== 'sealed') cands.push({ kind: bk, axis: 'h', f: botR.y + botR.h, a: botR.x, b: botR.x + botR.w, c: botR.x + botR.w / 2, seed: botR.id });

    var midY = (topR.y + botR.y + botR.h) / 2, rank = { open: 0, exterior: 1 };
    cands.sort(function (x, y) {                                  // prefer OPEN, then exterior; tiebreak = nearest wing center (deterministic)
      if (rank[x.kind] !== rank[y.kind]) return rank[x.kind] - rank[y.kind];
      return Math.abs(x.c - midY) - Math.abs(y.c - midY);
    });
    var w = cands[0];
    if (!w) {   // LANDLOCKED-WING FALLBACK (A.4) — DEFENSIVE/UNREACHABLE: a maximal run is always bounded
                // above/below by an open room or the envelope edge, so `cands` is never empty. Kept as a
                // safety net (e.g. a future 2D-wing change). Supersedes the A.2 single-room landlocked
                // fallback for runs>=2; never doorless. NOT cluster-sharing-across-columns (that is parked).
      w = { axis: 'h', f: botR.y + botR.h, a: botR.x, b: botR.x + botR.w, seed: botR.id };
    }
    var big = wing.some(function (r) { return r.val >= 250000; });
    return (w.axis === 'h') ? _doorH(w.f, w.a, w.b, 'wing-' + w.seed, big) : _doorV(w.f, w.a, w.b, 'wing-' + w.seed, big);
  }

  // ── Phase A.1 · Exterior articulation (additive; ESTATE-LEVEL silhouette, NEVER per-room character) ──
  // Windows + ONE entry door + load-bearing OUTER wall (heaviest room, hub weight READ-only) + ONE stair
  // + Foyer jut + optional CAD chrome. All inline overlays on the estate shell — zero studio.html edit.
  var A1_TUNE = { windows: true, windowGap: 110, windowW: 60, door: true, doorW: 120,
                  weightGain: 0.1, stairs: true, foyerJut: true, jutDepth: 48, chrome: true };   // Captain-locked 2026-06-26 (eyes-on)

  function _roomExteriorEdges(r, lastCi) {                                   // which of a room's edges are on the envelope
    var e = [];
    if (r.ri === 0)      e.push({ side:'top',    x0:r.x,     y0:r.y,     x1:r.x+r.w, y1:r.y,     ux:1, uy:0, r:r });
    if (r.last)          e.push({ side:'bottom', x0:r.x,     y0:r.y+r.h, x1:r.x+r.w, y1:r.y+r.h, ux:1, uy:0, r:r });
    if (r.ci === 0)      e.push({ side:'left',   x0:r.x,     y0:r.y,     x1:r.x,     y1:r.y+r.h, ux:0, uy:1, r:r });
    if (r.ci === lastCi) e.push({ side:'right',  x0:r.x+r.w, y0:r.y,     x1:r.x+r.w, y1:r.y+r.h, ux:0, uy:1, r:r });
    return e;
  }
  function _windowGlyph(cx, cy, ux, uy, w) {                                 // a plan window: cut + 2 glazing lines + jambs
    var nx = -uy, ny = ux, hx = ux*w/2, hy = uy*w/2, o = 2.4;
    var ax = cx-hx, ay = cy-hy, bx = cx+hx, by = cy+hy;
    var ln = function (x1,y1,x2,y2) { return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>'; };
    var cut = '<line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" style="stroke:var(--bg-navy);stroke-width:'+(SHELL_TUNE.envWeight+2)+'px"/>';
    var glaze = ln(ax+nx*o, ay+ny*o, bx+nx*o, by+ny*o) + ln(ax-nx*o, ay-ny*o, bx-nx*o, by-ny*o);
    var jamb  = ln(ax+nx*o, ay+ny*o, ax-nx*o, ay-ny*o) + ln(bx+nx*o, by+ny*o, bx-nx*o, by-ny*o);
    return '<g class="estate-window" style="stroke:var(--teal-mid);stroke-width:1;fill:none;opacity:0.6">'+cut+glaze+jamb+'</g>';
  }
  function _windows(edges, tune) {
    var out = '';
    edges.forEach(function (e) {
      if (e.r.priv) return;                                                  // no windows on sealed rooms
      if (/foyer/i.test(e.r.meta || '') && e.side === 'top') return;         // entry door lives there
      var L = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
      var count = Math.floor((L - 40) / tune.windowGap);
      if (count < 1) return;
      var span = count * tune.windowGap, start = (L - span) / 2 + tune.windowGap / 2;
      for (var i = 0; i < count; i++) {
        var c = start + i * tune.windowGap;
        out += _windowGlyph(e.x0 + e.ux * c, e.y0 + e.uy * c, e.ux, e.uy, tune.windowW);
      }
    });
    return out;
  }
  // A.3 — the estate's entry room = the ONE top-row room spanning the estate center-x (the front-door
  // position). Whatever account sits there is the entrance; the jut + cutout + door all attach to it.
  function _entryRoom(roomRects, colInfo, lastCi) {
    if (!colInfo.length) return null;
    var cxEnv = (colInfo[0].x + colInfo[lastCi].x + colInfo[lastCi].w) / 2;
    var tops = roomRects.filter(function (r) { return r.ri === 0; });          // top room of each column
    var hit = tops.filter(function (r) { return cxEnv >= r.x && cxEnv <= r.x + r.w; });
    return hit[0] || tops[0] || null;                                          // deterministic; fallback top-left
  }
  function _exteriorDoor(entry, colInfo, lastCi, tune, jut) {                  // ONE entrance, on the top-center room
    if (!tune.door || !colInfo.length) return '';
    var top = colInfo[0].top, cx, wy = top;
    if (entry) { cx = entry.x + entry.w / 2; if (jut) wy = top - tune.jutDepth; }   // on the (jutted) entry wall
    else { cx = (colInfo[0].x + colInfo[lastCi].x + colInfo[lastCi].w) / 2; }       // no rooms -> center fallback
    var w = tune.doorW, ax = cx - w/2, bx = cx + w/2, hw = w/2, up = -1;            // double door, swings OUTWARD
    var st = 'style="stroke:var(--teal-mid);stroke-width:1;fill:none;opacity:0.6"';
    return '<g class="estate-entry-door">' +
      '<line x1="'+ax+'" y1="'+wy+'" x2="'+bx+'" y2="'+wy+'" class="wall-cutout"/>' +
      '<path d="M '+ax+' '+wy+' L '+ax+' '+(wy+up*hw)+' A '+hw+' '+hw+' 0 0 1 '+cx+' '+wy+'" '+st+'/>' +
      '<path d="M '+bx+' '+wy+' L '+bx+' '+(wy+up*hw)+' A '+hw+' '+hw+' 0 0 0 '+cx+' '+wy+'" '+st+'/></g>';
  }
  function _loadWall(roomRects, lastCi, tune) {                             // heaviest room thickens ITS outer wall
    var heavy = null;
    roomRects.forEach(function (r) { if (!heavy || r.weight > heavy.weight) heavy = r; });
    if (!heavy || heavy.weight <= 0) return '';
    var sw = SHELL_TUNE.envWeight + heavy.weight * tune.weightGain;
    var glow = Math.min(0.5, 0.15 + heavy.weight * 0.004), blur = 4 + heavy.weight * 0.08, out = '';
    _roomExteriorEdges(heavy, lastCi).forEach(function (e) {
      out += '<line class="estate-loadwall" x1="'+e.x0+'" y1="'+e.y0+'" x2="'+e.x1+'" y2="'+e.y1+
             '" style="stroke:var(--teal-mid);stroke-width:'+sw+'px;opacity:0.95;filter:drop-shadow(0 0 '+blur+'px rgba(29,158,117,'+glow+'))"/>';
    });
    return out;
  }
  function _stairs(roomRects, tune) {                                        // ONE stair for the home (by the Vault)
    if (!tune.stairs) return '';
    var room = null;
    for (var k = 0; k < roomRects.length; k++) { if (/vault/i.test(roomRects[k].meta || '')) { room = roomRects[k]; break; } }
    if (!room) roomRects.forEach(function (r) { if (!room || r.w*r.h > room.w*room.h) room = r; });
    if (!room) return '';
    var n = 5, gw = Math.min(40, room.w*0.3), gh = Math.min(44, room.h*0.3);
    var x = room.x + room.w - gw - 12, y = room.y + 12, out = '';
    out += '<rect x="'+x+'" y="'+y+'" width="'+gw+'" height="'+gh+'" style="fill:none;stroke:var(--teal-mid);stroke-width:1;opacity:0.5"/>';
    for (var i = 1; i < n; i++) { var ty = y + i*(gh/n); out += '<line x1="'+x+'" y1="'+ty+'" x2="'+(x+gw)+'" y2="'+ty+'" style="stroke:var(--teal-mid);stroke-width:1;opacity:0.5"/>'; }
    return '<g class="estate-stairs">'+out+'</g>';
  }
  function _chrome(colInfo, lastCi, tune) {                                  // CAD chrome — OFF by default, cuttable
    if (!tune.chrome || !colInfo.length) return '';
    var nx = colInfo[lastCi].x + colInfo[lastCi].w + 42, ny = colInfo[0].top + 12;
    return '<g class="estate-chrome" style="stroke:var(--teal-mid);stroke-width:1;fill:none;opacity:0.45">' +
      '<line x1="'+nx+'" y1="'+(ny+30)+'" x2="'+nx+'" y2="'+ny+'"/>' +
      '<path d="M '+(nx-5)+' '+(ny+8)+' L '+nx+' '+ny+' L '+(nx+5)+' '+(ny+8)+'"/>' +
      '<text x="'+nx+'" y="'+(ny-5)+'" style="fill:var(--teal-mid);stroke:none;font:10px monospace;text-anchor:middle">N</text></g>';
  }

  function renderEstate(ctx) {
    var svgContainer = ctx.svgContainer;
    var getBaseType = ctx.getBaseType;
    var isShocked = ctx.isShocked, isThermal = ctx.isThermal, isDatum = ctx.isDatum,
        isMeasured = ctx.isMeasured, isRouting = ctx.isRouting;
    var cols = ctx.cols, propertyAccount = ctx.propertyAccount,
        trustAccounts = ctx.trustAccounts, grandTotal = ctx.grandTotal;
    var grossEstateVal = ctx.grossEstateVal;
    var accountWeights = ctx.accountWeights || {};   // S2.4 — read from hub (LOCK-3, never recompute)
    var newRoomToTrace = null;
    var descriptors = [];                            // S2.4 — the ONE canonical hook surface (§16.2-iii)
    var roomRects = [], colInfo = [];                // Phase A — fed to the estate shell (walls drawn once)

    // IDEA-1 — LINKED DEBT -> ASSET merge (renderer-only, LOCK-3 read-only). A debt that links to a
    // PRESENT, non-excluded PHYSICAL asset merges VISUALLY onto that asset: its own box is suppressed,
    // the asset reads RED-MARKED with a dual label + NET EQUITY (asset - debt) on the face. We only
    // READ linkedAssetId here; suppression + net-equity are DISPLAY-ONLY — grandTotal/Shape/all totals
    // were computed by the host (link-agnostic) BEFORE this renderer ran, so nothing here moves a total.
    var _accts = ctx.accounts || [];
    // §18.6 — ALL linked liens merge onto their asset (was first-link-wins). Every linked debt is suppressed AND
    // its balance subtracts from the asset for a TRUE net equity (Property Copy Bank §0.4 R9 / §1.2 R13). L47: a
    // lien with no sourced balance contributes 0 to the sum (never guessed) though it's still named (it IS linked).
    var _mergeDebtsByAsset = {};   // assetId -> [all linked debts, first-lien (mortgage) first]
    var _suppressedDebt = {};      // debt id -> true (don't draw its own box; it lives on the asset now)
    _accts.forEach(function (a) {
      if (a.exclude || !a.linkedAssetId) return;
      var ab = getBaseType(a.baseId);
      if (!ab || ab.taxCode !== 'debt') return;
      var asset = null;
      for (var i = 0; i < _accts.length; i++) { if (_accts[i].id === a.linkedAssetId && !_accts[i].exclude) { asset = _accts[i]; break; } }
      if (!asset) return;                                   // linked-to-absent/excluded -> plain box (fallback)
      var sb = getBaseType(asset.baseId);
      if (!sb || sb.taxCode !== 'physical') return;         // only physical merge targets (matches link <select>)
      (_mergeDebtsByAsset[asset.id] = _mergeDebtsByAsset[asset.id] || []).push(a);
      _suppressedDebt[a.id] = true;
    });
    function _lienRankE(a) { var id = String((getBaseType(a.baseId) || {}).id || ''); return id.indexOf('mortgage') === 0 ? 0 : (id.indexOf('heloc') === 0 ? 1 : 2); }
    Object.keys(_mergeDebtsByAsset).forEach(function (k) { _mergeDebtsByAsset[k].sort(function (x, y) { return _lienRankE(x) - _lienRankE(y); }); });
    function _lienSum(debts) { var s = 0; for (var i = 0; i < debts.length; i++) { var v = parseFloat(debts[i].value) || 0; if (v > 0) s += v; } return s; }
    function _netEquityOf(assetVal, debts) { return (parseFloat(assetVal) || 0) - _lienSum(debts); }
    function _lienMetaSuffix(debts) { var o = ''; for (var i = 0; i < debts.length; i++) { o += ' / ' + getBaseType(debts[i].baseId).meta.toUpperCase(); } return o; }
    // §18.6 mirror notice — TYPE-first (decision 1: math-facing copy names the type, never the brand), sourced.
    // The estate LABEL keeps its brand flavor; this hover, which explains the net-equity math, says "mortgage"/"HELOC".
    function _lienMirrorNotice(debts, assetNoun) {
      var hasM = false, hasH = false;
      for (var i = 0; i < debts.length; i++) { var id = String((getBaseType(debts[i].baseId) || {}).id || ''); if (id.indexOf('mortgage') === 0) hasM = true; else if (id.indexOf('heloc') === 0) hasH = true; }
      var lead = hasM ? 'Your mortgage is linked here' : (hasH ? 'Your HELOC is linked here' : 'A linked liability sits here');
      var out = '🔗 ' + lead + ' — its balance is subtracted from this ' + (assetNoun || 'asset') + '’s value to show your true equity.';
      if (hasM && hasH) out += ' Your HELOC is linked here too.';
      return out;
    }
    function _linkChipSVG(x, y, notice) { return '<g class="link-chip" style="cursor:help;"><title>' + String(notice).replace(/</g, '&lt;') + '</title><rect x="' + x + '" y="' + y + '" width="26" height="20" rx="4" fill="rgba(93,202,165,0.12)" stroke="var(--teal-mid)" stroke-width="1"/><text x="' + (x + 13) + '" y="' + (y + 14) + '" text-anchor="middle" style="font-size:12px; fill:var(--teal-mid);">🔗</text></g>'; }
    function _visibleCol(list) { return list.filter(function (a) { return !_suppressedDebt[a.id]; }); }
    function _eqStr(v) {   // NET EQUITY display string (asset - debt); mirrors the room value format
      var n = Math.abs(v);
      var s = n >= 1000000 ? '$' + (n / 1000000).toFixed(2) + 'M' : (n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'k' : '$' + Math.round(n));
      return v < 0 ? '-' + s : s;
    }

    svgContainer.innerHTML = '';
      // DRAWING PHYSICS: PROPORTIONAL SQUARIFY RENDERING
      let gX = 200, gY = 160, gW = 1000, gH = 850; 
      let pVal = propertyAccount ? propertyAccount.value || 0 : 0;
      let pValStr = pVal >= 1000000 ? '$'+(pVal/1000000).toFixed(2)+'M' : (pVal >= 1000 ? '$'+(pVal/1000).toFixed(0)+'k' : (pVal > 0 ? '$'+pVal : ''));

      // IDEA-1 — if a mortgage links to THIS property, the Grounds become "THE MOAT": equity-colored,
      // dual label, NET EQUITY on the face, clickable -> property modal (which already lists the debt).
      // The Grounds finally carry COLOR regardless of link: a teal gradient fill like every other block,
      // flipping to red only when a linked mortgage is UNDERWATER. The dashed boundary (drawn after the
      // rooms, so it can step around the north entry jut) matches that same color. All display-only.
      let _moatDebts = propertyAccount ? (_mergeDebtsByAsset[propertyAccount.id] || []) : [];
      let _moatEq = _moatDebts.length ? _netEquityOf(propertyAccount.value, _moatDebts) : null;
      let _grUnderwater = (_moatEq !== null && _moatEq < 0);
      let _grGrad = _grUnderwater ? 'fillGradDebt' : 'fillGradAsset';      // teal default, red underwater
      let _grLine = _grUnderwater ? 'var(--danger)' : 'var(--teal-mid)';   // dashed boundary + label accent
      let _grValColor = _grUnderwater ? 'var(--danger)' : 'var(--gold)';   // R3: gold positive, red underwater
      // The grounds FILL + dashed boundary are drawn AFTER the rooms (deferred below) so the fill can
      // frame the estate (footprint punched out — no bleed-through) and follow the entry jut outside.
      // This early group carries only the label/title + an invisible .grounds-rect anchor.
      let gSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      if (_moatDebts.length) {
          // §1.5 THE YARD — 3-line stack applied to the EXISTING merged tile (Correction B: reuse this tile, no new art).
          let _grLabel = getBaseType(propertyAccount.baseId).meta.toUpperCase() + _lienMetaSuffix(_moatDebts);   // brand sub-line (decision 1), all liens named
          let _eqFig = (parseFloat(propertyAccount.value) || 0) > 0 ? _eqStr(_moatEq) : '';                      // sourced-or-blank: no home value → label with no figure (L47, R86)
          gSVG.innerHTML = `
          <title>The Yard — this home and its linked debts, combined. Click for the true cost of ownership.</title>
          ${_linkChipSVG(gX + gW/2 - 13, gY + gH - 82, _lienMirrorNotice(_moatDebts, 'home'))}
          <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" class="grounds-rect" style="stroke:none; fill:none; pointer-events:none;" />
          <text x="${gX + gW/2}" y="${gY + gH - 48}" class="grounds-title" style="fill: ${_grLine}; font-size:20px; letter-spacing:0.16em;">THE YARD</text>
          <text x="${gX + gW/2}" y="${gY + gH - 26}" class="grounds-title" style="fill: ${_grLine}; opacity:0.85;">${_grLabel}</text>
          <text x="${gX + gW/2}" y="${gY + gH - 6}" class="grounds-title" style="fill: ${_grValColor}; font-size:14px;">Net Equity: ${_eqFig}</text>
      `;
      } else if (propertyAccount) {
          /* THE GROUNDS — a primary residence has taken the ground, but carries no lien yet. */
          gSVG.innerHTML = `
          <title>Physical asset footprint.</title>
          <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" class="grounds-rect" style="stroke:none; fill:none; pointer-events:none;" />
          <text x="${gX + gW/2}" y="${gY + gH - 30}" class="grounds-title">THE GROUNDS</text>
          <text x="${gX + gW/2}" y="${gY + gH - 10}" class="grounds-title" style="fill: var(--gold); font-size:16px;">${pValStr}</text>
      `;
      } else {
          /* ── THE PLOT — EMPTY GROUND, NO PROPERTY YET ────────────────────────────────────────────
           * ONE OBJECT, THREE STATES: THE PLOT (empty) -> THE GROUNDS (a home stands on it) -> THE
           * YARD (that home carries a lien). Architect-ratified 2026-08-02, the Captain's word.
           * This used to read "THE GROUNDS" on a brand-new Studio with a value line that was blank,
           * so an empty estate announced grounds nobody owned and it read as a room — the Captain
           * reported it as a phantom room, and he was right that it was confusing rather than wrong.
           * A LABEL THAT CHANGES WHEN THE THING CHANGES CANNOT BE MISTAKEN FOR A STATIC ROOM, which
           * is precisely why the state model dissolves the objection to a land-word.
           * NO VALUE LINE — there is nothing to value. NO <title> — the old tooltip ("Physical asset
           * footprint") is a claim about a property that does not exist, and inventing replacement
           * copy is not mine to do; if empty ground should say something on hover, the Architect
           * authors it. NON-CLICKABLE CHROME, as ruled: pointer-events stay off. */
          gSVG.innerHTML = `
          <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" class="grounds-rect" style="stroke:none; fill:none; pointer-events:none;" />
          <text x="${gX + gW/2}" y="${gY + gH - 30}" class="grounds-title">THE PLOT</text>
      `;
      }
      svgContainer.appendChild(gSVG);

      // SURGICAL: Datum Line Rendering — RETIRED. isDatum is repurposed to the SEQUENCE RISK lens,
      // which is energizer-owned (datum-energize.js sequence(): lift + (1)(2)(3) badges + RISK LADDER).
      // The flat spend-line is suppressed; the button still reads "Datum Elevation" until the step-3
      // host relabel. Kept disabled (not deleted) so step-3 can rule on the line's fate.
      if (false && isDatum) {
          let spendStr = ctx.spendInputEl.value;
          let spendVal = parseInt(spendStr.replace(/[^0-9]/g, ''), 10) || 0;
          let datumY = (gY + gH) - Math.min((spendVal / 250), gH); 
          let dSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          dSVG.innerHTML = `
              <line x1="${gX - 50}" y1="${datumY}" x2="${gX + gW + 50}" y2="${datumY}" stroke="var(--danger)" stroke-width="2" stroke-dasharray="10 5" opacity="0.8" />
              <text x="${gX - 60}" y="${datumY + 4}" font-family="var(--font-mono)" font-size="12" fill="var(--danger)" text-anchor="end" font-weight="bold">DATUM: $${spendVal.toLocaleString()}</text>
          `;
          svgContainer.appendChild(dSVG);
      }

      // SURGICAL: GENERATIONAL TRUST WING RENDER (Purple Shield Styling)
      if (trustAccounts.length > 0) {
          let tX = gX + gW + 60; 
          let tW = 280;
          let tSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          tSVG.innerHTML = `
              <rect x="${tX}" y="${gY}" width="${tW}" height="${gH}" class="grounds-rect" stroke-dasharray="6 6" stroke="var(--shield)" stroke-width="2" fill="rgba(138, 100, 255, 0.05)" onmouseenter="showTrustTooltip(event)" onmouseleave="hideTrustTooltip()"/>
              <text x="${tX + tW/2}" y="${gY + gH - 30}" font-family="var(--font-mono)" font-size="14" fill="var(--shield)" text-anchor="middle" font-weight="bold" letter-spacing="0.1em">GENERATIONAL TRUST WING</text>
          `;
          svgContainer.appendChild(tSVG);
          
          let tTotals = 0; 
          trustAccounts.forEach(a => { 
              let v = Math.max(Math.abs(a.value||0),1000); 
              a._renderVal=v; 
              tTotals+=v;
          });
          
          let availH = (gH - 100); 
          let cY = gY + 20;
          
          trustAccounts.forEach(acc => {
              let base = getBaseType(acc.baseId);
              let h = 75; 
              if(tTotals>0) h += availH * (acc._renderVal / tTotals);
              let d = { x: tX + 20, y: cY, w: tW - 40, h: h, cx: tX+20+(tW-40)/2, cy: cY+h/2 };
              if(acc.isNew) newRoomToTrace = d;
              
              let valStr = acc.value >= 1000000 ? '$'+(acc.value/1000000).toFixed(2)+'M' : (acc.value >= 1000 ? '$'+(acc.value/1000).toFixed(0)+'k' : (acc.value > 0 ? '$'+acc.value : ''));
              
              let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
              g.setAttribute('class', `room-grp visible trust-room`); 
              g.style.cursor = 'pointer'; 
              g.setAttribute('onclick', `openAccountModal('${acc.id}')`);
              
              let taxClass = isThermal ? `tax-${base.taxCode}` : '';
              let animClass = acc.isNew ? 'animate-draw' : '';

              // S2.4 — trusts HOLD capital (fill) but are non-investable (weight 0, not load-bearing).
              let weight = accountWeights[acc.id] || 0;
              let fp = fillPct(acc.value || 0);
              let fillH = d.h * fp / 100, fillY = d.y + d.h - fillH;
              g.style.setProperty('--weight', weight);
              let fillHTML = fp > 0 ? `
                  <rect x="${d.x}" y="${fillY}" width="${d.w}" height="${fillH}" class="room-fill" fill="url(#fillGradAsset)" />` : '';

              g.innerHTML = `
                  <title>${base.desc}</title>
                  <rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" class="room-rect active ${taxClass} ${animClass}" />
                  ${fillHTML}
                  <text x="${d.cx}" y="${d.cy - 10}" class="bp-title" style="fill:var(--shield)">${base.meta.toUpperCase()}</text>
                  <text x="${d.cx}" y="${d.cy + 30}" class="bp-val" style="fill:var(--white)">${valStr}</text>
              `;
              svgContainer.appendChild(g);
              descriptors.push({ id: acc.id, el: g, rect: g.querySelector('.room-rect'), d: d, value: acc.value || 0, fillPct: fp, weight: weight, isNew: !!acc.isNew, taxCode: base.taxCode, isDebt: false, isInvestment: !!base.isInvestment, isPriority: !!acc.isPriority });
              cY += h + 12;
          });
      }

      // IDEA-1 — render each column WITHOUT its suppressed (linked-debt) boxes, so no phantom column
      // gap opens and a column that held only a linked debt drops out entirely.
      let _viz = { primary: _visibleCol(cols.primary), joint: _visibleCol(cols.joint), coarch: _visibleCol(cols.coarch) };
      let activeCols = [];
      if(_viz.primary.length > 0) activeCols.push('primary');
      if(_viz.joint.length > 0) activeCols.push('joint');
      if(_viz.coarch.length > 0) activeCols.push('coarch');
      
      let numCols = activeCols.length;
      let drawnRooms = [];

      if(numCols > 0) {
          
          let minW = 200; 
          let minH = 75;  
          
          let gap = 0;
          let colGap = 0;

          let totalGlobalRender = 0;
          let colTotals = { primary: 0, joint: 0, coarch: 0 };

          activeCols.forEach(c => {
             _viz[c].forEach(acc => {
                 let base = getBaseType(acc.baseId);
                 let isVolatile = base.isInvestment || base.taxCode === 'liquid';
                 let shockMult = (isShocked && isVolatile && base.taxCode !== 'debt') ? 0.70 : 1;

                 let val = Math.max(Math.abs((acc.value || 0) * shockMult), 1000);
                 acc._renderVal = val;
                 colTotals[c] += val;
                 totalGlobalRender += val;
             });
          });

          let availW = (gW - 40) - (numCols * minW);
          availW = Math.max(0, availW);

          let currentX = gX + 20;
          let bounds = { minX: 9999, minY: 9999, maxX: 0, maxY: 0 }; 

          activeCols.forEach((colName, index) => {
              let accounts = _viz[colName];   // IDEA-1 — suppressed linked debts already removed

              let colW = minW;
              if (totalGlobalRender > 0) {
                  colW += availW * (colTotals[colName] / totalGlobalRender);
              }

              let availH = (gH - 100) - (accounts.length * minH);
              availH = Math.max(0, availH);
              let currentY = gY + 20;

              accounts.forEach((acc, i) => {
                  let base = getBaseType(acc.baseId);
                  let valStr = '';

                  let isVolatile = base.isInvestment || base.taxCode === 'liquid';
                  let shockMult = (isShocked && isVolatile && base.taxCode !== 'debt') ? 0.70 : 1;
                  let effectiveValue = (acc.value || 0) * shockMult;
                  let absSum = Math.abs(effectiveValue);

                  if(absSum >= 1000000) valStr = '$' + (absSum / 1000000).toFixed(2) + 'M';
                  else if (absSum >= 1000) valStr = '$' + (absSum / 1000).toFixed(0) + 'k';
                  else if (absSum > 0) valStr = '$' + Math.round(absSum);

                  let isDebt = base.taxCode === 'debt';
                  if(isDebt && absSum > 0) valStr = '-' + valStr;

                  let h = minH;
                  if(colTotals[colName] > 0) {
                      h += availH * (acc._renderVal / colTotals[colName]);
                  }

                  let d = { x: currentX, y: currentY, w: colW, h: h };
                  d.cx = d.x + d.w / 2;
                  d.cy = d.y + d.h / 2;
                  
                  drawnRooms.push({ id: acc.id, taxCode: base.taxCode, isDebt: isDebt, isPriority: acc.isPriority, cx: d.cx, cy: d.cy, col: colName, value: Math.abs(acc.value || 0) });

                  if(acc.isNew) newRoomToTrace = d; 

                  bounds.minX = Math.min(bounds.minX, currentX);
                  bounds.minY = Math.min(bounds.minY, currentY);
                  bounds.maxX = Math.max(bounds.maxX, currentX + colW);
                  bounds.maxY = Math.max(bounds.maxY, currentY + h);

                  let tooltipHTML = '';
                  if(base.taxCode === 'physical' || base.taxCode === 'debt' || base.hasInterest) {
                      tooltipHTML = `<title>${base.desc}</title>`;
                  }

                  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                  g.setAttribute('class', `room-grp visible ${isDebt ? 'debt-room' : ''}`);
                  g.setAttribute('onclick', `openAccountModal('${acc.id}')`);
                  g.style.cursor = 'pointer';
                  
                  // Phase A — collect this room's rect for the estate shell; walls/doors drawn ONCE
                  // post-loop (envelope + open thresholds + sealed private rooms), not per room.
                  var _priv = isDebt || /vault/i.test(base.meta);            // Vault + debt = sealed
                  roomRects.push({ x: d.x, y: d.y, w: d.w, h: d.h, id: acc.id, isDebt: isDebt, priv: _priv,
                                   val: Math.abs(acc.value || 0), col: colName, ci: index, ri: i,
                                   last: (i === accounts.length - 1),
                                   weight: accountWeights[acc.id] || 0, meta: base.meta });   // A.1: load-bearing + role

                  let animClass = acc.isNew ? 'animate-draw' : '';
                  let frictionClass = acc.isFriction ? 'liquidity-friction' : '';
                  let priorityClass = acc.isPriority ? 'structural-priority' : '';
                  
                  let shockColor = (isShocked && isVolatile && !isDebt) ? 'var(--danger)' : (isDebt ? 'var(--danger)' : 'var(--white)');
                  
                  let taxClass = '';
                  if(isThermal) taxClass = `tax-${base.taxCode}`;

                  // IDEA-1 — does a linked debt merge onto THIS asset (e.g. auto-loan -> vehicle)?
                  // The room stays OPEN (no border, no seal); EQUITY drives the FILL color exactly like
                  // every other block — teal when positive, the debt red gradient when underwater — so
                  // pos/neg reads at a glance. Dual label + NET EQUITY (asset - debt) are DISPLAY-only.
                  let _mergeDebts = (!isDebt) ? (_mergeDebtsByAsset[acc.id] || []) : [];   // §18.6 — ALL liens
                  let _mergeEq = _mergeDebts.length ? _netEquityOf(acc.value, _mergeDebts) : null;
                  let _mergeNeg = (_mergeEq !== null && _mergeEq < 0);
                  let _roomTitle = _mergeDebts.length ? (base.meta.toUpperCase() + _lienMetaSuffix(_mergeDebts)) : base.meta.toUpperCase();
                  let _titleY = _mergeDebts.length ? (d.cy - 20) : (d.cy - 10);
                  let _mergeChip = _mergeDebts.length ? _linkChipSVG(d.x + 6, d.y + 6, _lienMirrorNotice(_mergeDebts, 'asset')) : '';
                  let _valBlock = _mergeDebts.length
                    ? `
                    <text x="${d.cx}" y="${d.cy - 2}" class="bp-title" style="fill:${_mergeNeg ? 'var(--danger)' : 'var(--teal-mid)'}; opacity:0.75; font-size:11px; letter-spacing:0.12em;">NET EQUITY</text>
                    <text x="${d.cx}" y="${d.cy + 24}" class="bp-val" style="fill:${_mergeNeg ? 'var(--danger)' : 'var(--gold)'}; font-size:18px;">${_eqStr(_mergeEq)}</text>`
                    : `<text x="${d.cx}" y="${d.cy + 30}" class="bp-val" style="fill:${shockColor}; transition: 0.6s ease;">${valStr}</text>`;

                  // S2.4 — load-bearing weight (read from hub) + concave fill on RAW value.
                  let weight = accountWeights[acc.id] || 0;
                  let fp = fillPct(acc.value || 0);
                  let fillH = d.h * fp / 100, fillY = d.y + d.h - fillH;
                  g.style.setProperty('--weight', weight);
                  let _roomDebtFill = isDebt || _mergeNeg;   // underwater merge fills red like a debt
                  let fillHTML = fp > 0 ? `
                    <rect x="${d.x}" y="${fillY}" width="${d.w}" height="${fillH}" class="room-fill${_roomDebtFill ? ' fill-debt' : ''}" fill="url(#${_roomDebtFill ? 'fillGradDebt' : 'fillGradAsset'})" />` : '';

                  g.innerHTML = `
                    ${tooltipHTML}
                    <rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" class="room-rect active ${animClass} ${frictionClass} ${priorityClass} ${taxClass}" style="stroke:none" />
                    ${fillHTML}
                    ${_mergeChip}
                    <text x="${d.cx}" y="${_titleY}" class="bp-title">${_roomTitle}</text>
                    ${_valBlock}
                  `;
                  svgContainer.appendChild(g);
                  descriptors.push({ id: acc.id, el: g, rect: g.querySelector('.room-rect'), d: d, value: acc.value || 0, fillPct: fp, weight: weight, isNew: !!acc.isNew, taxCode: base.taxCode, isDebt: isDebt, isInvestment: !!base.isInvestment, isPriority: !!acc.isPriority });

                  currentY += h + gap;
              });

              colInfo.push({ x: currentX, w: colW, top: gY + 20, bottom: currentY });   // Phase A — for the envelope
              currentX += colW + colGap;
          });

          // Phase A — draw the estate SHELL once (over the room fills): one envelope + dissolved
          // interior walls (open thresholds) + sealed private rooms (Vault + debt). Replaces the
          // per-room box strokes (now stroke:none) and the per-room doors.
          var _lastCi = colInfo.length - 1;
          // A.1 — Foyer jut: if a Foyer lands on the perimeter top, its outer wall steps OUT.
          // A.3 — the entry (jut + cutout + door) attaches to the ONE top-center room, whatever account
          // it is (foyerJut/jutDepth keys reused = entry jut; Foyer-float stays parked).
          var _entry = _entryRoom(roomRects, colInfo, _lastCi);
          var _jut = (A1_TUNE.foyerJut && _entry && A1_TUNE.jutDepth > 0)
            ? { x0: _entry.x + 10, x1: _entry.x + _entry.w - 10, depth: A1_TUNE.jutDepth } : null;
          // A.3 — fill the jut with the entry room's gradient (only when funded) so the notch reads as
          // part of the room, not a hollow gap. Drawn UNDER the envelope stroke. Binary-fill untouched:
          // this extends the fill REGION to match the silhouette; no scaling, no new fill model.
          var _jutFill = '';
          if (_jut && _entry && _entry.val > 0) {
            var _eg = _entry.isDebt ? 'fillGradDebt' : 'fillGradAsset';
            _jutFill = '<rect class="estate-jut-fill" x="' + _jut.x0 + '" y="' + (colInfo[0].top - _jut.depth) +
              '" width="' + (_jut.x1 - _jut.x0) + '" height="' + _jut.depth + '" fill="url(#' + _eg + ')"/>';
          }
          var _shell = _jutFill + '<path class="estate-envelope" d="' + _envelopePath(colInfo, _jut) +
                       '" style="fill:none;stroke:var(--teal-mid);stroke-width:' + SHELL_TUNE.envWeight + 'px;opacity:0.92"/>';
          _sharedEdges(roomRects, colInfo).forEach(function (e) { _shell += _openThreshold(e, SHELL_TUNE.openness); });
          var _byCol = _roomsByCol(roomRects);
          roomRects.forEach(function (r) { if (r.priv) _shell += _privEnclosure(r); });             // sealed boxes (all rooms)
          _sealedWings(roomRects, _byCol).forEach(function (wg) { _shell += _wingDoor(wg, _byCol, _lastCi); });   // A.4 — ONE door per wing
          // A.1 — exterior articulation (additive, estate-level): load-bearing outer wall, windows,
          // ONE entry door, ONE stair, optional chrome. Drawn over the envelope.
          var _extEdges = [];
          roomRects.forEach(function (r) { _extEdges = _extEdges.concat(_roomExteriorEdges(r, _lastCi)); });
          _shell += _loadWall(roomRects, _lastCi, A1_TUNE);
          if (A1_TUNE.windows) _shell += _windows(_extEdges, A1_TUNE);
          _shell += _exteriorDoor(_entry, colInfo, _lastCi, A1_TUNE, _jut);
          _shell += _stairs(roomRects, A1_TUNE);
          _shell += _chrome(colInfo, _lastCi, A1_TUNE);
          var _shellG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          _shellG.setAttribute('class', 'estate-shell');
          _shellG.innerHTML = _shell;
          svgContainer.appendChild(_shellG);

          if (isMeasured && bounds.maxX > 0) {
              let outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
              outline.setAttribute("x", bounds.minX - 10);
              outline.setAttribute("y", bounds.minY - 10);
              outline.setAttribute("width", (bounds.maxX - bounds.minX) + 20);
              outline.setAttribute("height", (bounds.maxY - bounds.minY) + 20);
              outline.setAttribute("class", "estate-measure-outline");
              svgContainer.appendChild(outline);
          }
      }

      // IDEA-1 R2/R3 — GROUNDS fill + dashed boundary, drawn AFTER the rooms so they frame the estate
      // from OUTSIDE: the outline steps OUT around the north entry jut (never cuts the front door), and
      // once rooms exist the FILL becomes a FRAME (estate footprint punched out, even-odd) so the
      // red/teal never bleeds THROUGH the translucent room boxes. Full plot only when property stands
      // alone. Color = grounds equity/link state (teal default, red when a linked mortgage is underwater).
      (function () {
        var bx = gX, by = gY, bx2 = gX + gW, by2 = gY + gH, outer;
        if (_jut && colInfo.length) {
          var M = 14;                                                       // clearance around the jut
          var jx0 = Math.max(bx, _jut.x0 - M), jx1 = Math.min(bx2, _jut.x1 + M);
          var jTop = Math.min(by, (colInfo[0].top - _jut.depth) - M);       // notch top, above the jut
          outer = 'M ' + bx + ' ' + by + ' H ' + jx0 + ' V ' + jTop + ' H ' + jx1 + ' V ' + by +
                  ' H ' + bx2 + ' V ' + by2 + ' H ' + bx + ' Z';
        } else {
          outer = 'M ' + bx + ' ' + by + ' H ' + bx2 + ' V ' + by2 + ' H ' + bx + ' Z';
        }
        // FILL — full plot when property stands alone; a frame (estate footprint punched out) once rooms
        // exist, so nothing tints the rooms.
        var fillD = outer;
        if (colInfo.length) {
          var eMinX = colInfo[0].x, eMaxX = colInfo[colInfo.length - 1].x + colInfo[colInfo.length - 1].w;
          var eTop = colInfo[0].top, eBot = colInfo[0].bottom;
          colInfo.forEach(function (c) { eBot = Math.max(eBot, c.bottom); });
          // The hole follows the estate SILHOUETTE — including the entry jut — so nothing fills behind
          // the cutout (no red/teal bleeding UNDER the translucent jut). Jut span/top match estate-jut-fill.
          if (_jut) {
            var hjTop = colInfo[0].top - _jut.depth;
            fillD += ' M ' + eMinX + ' ' + eTop + ' H ' + _jut.x0 + ' V ' + hjTop + ' H ' + _jut.x1 + ' V ' + eTop +
                     ' H ' + eMaxX + ' V ' + eBot + ' H ' + eMinX + ' Z';
          } else {
            fillD += ' M ' + eMinX + ' ' + eTop + ' V ' + eBot + ' H ' + eMaxX + ' V ' + eTop + ' Z';
          }
        }
        var gf = document.createElementNS("http://www.w3.org/2000/svg", "path");
        gf.setAttribute('class', 'grounds-fill');
        gf.setAttribute('d', fillD);
        gf.setAttribute('fill-rule', 'evenodd');
        gf.setAttribute('style', 'fill:url(#' + _grGrad + '); stroke:none; ' + (_moatDebts.length ? 'cursor:pointer; pointer-events:auto;' : 'pointer-events:none;'));
        if (_moatDebts.length) gf.setAttribute('onclick', "openYardModal('" + propertyAccount.id + "')");   // §1.2 — the merged tile now opens The Yard, not the Real Estate modal
        svgContainer.insertBefore(gf, svgContainer.firstChild);            // behind the rooms (frame backdrop)

        var gb = document.createElementNS("http://www.w3.org/2000/svg", "path");
        gb.setAttribute('class', 'grounds-boundary');
        gb.setAttribute('d', outer);
        gb.setAttribute('style', 'fill:none; stroke:' + _grLine + '; stroke-dasharray:12 12; stroke-width:1.5; pointer-events:none;');
        svgContainer.appendChild(gb);
      })();

      // SURGICAL: Outflow Routing Lines
      if (isRouting && drawnRooms.length > 0) {
          // Track A — STABLE in-bucket order (value DESC; id tiebreak) = interim determinism, superseded
          // by B1's real financial rule. Keep the tax-efficiency bucket order (liquid->pretax->roth); sort
          // WITHIN each bucket by balance so the SAME inputs always produce the SAME path (placement-agnostic).
          let _byVal = (a, b) => (b.value || 0) - (a.value || 0) || (a.id < b.id ? -1 : 1);
          let liq = drawnRooms.filter(r => r.taxCode === 'liquid').sort(_byVal);
          let pre = drawnRooms.filter(r => r.taxCode === 'pretax').sort(_byVal);
          let roth = drawnRooms.filter(r => r.taxCode === 'roth').sort(_byVal);
          let debts = drawnRooms.filter(r => r.isDebt && r.isPriority).sort(_byVal);

          let sequence = [...liq, ...pre, ...roth];

          // Stamp the deterministic order onto the room groups; the energizer reads it for the badges.
          let _elById = {}; descriptors.forEach(d => { if (d && d.id) _elById[d.id] = d.el; });
          sequence.forEach((r, i) => { let el = _elById[r.id]; if (el) el.setAttribute('data-route-order', i + 1); });
          debts.forEach((r, j) => { let el = _elById[r.id]; if (el) el.setAttribute('data-route-debt', j + 1); });

          if(sequence.length > 1) {
              let p = `M ${sequence[0].cx} ${sequence[0].cy}`;
              for(let k=1; k<sequence.length; k++) {
                  p += ` L ${sequence[k].cx} ${sequence[k].cy}`;
              }
              let routePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
              routePath.setAttribute("d", p);
              routePath.setAttribute("class", "outflow-route");
              svgContainer.appendChild(routePath);
          }

          if (debts.length > 0 && liq.length > 0) {
              // FIX 2 — stamp the debt SOURCE (liq[0] = largest liquid, where the money actually leaves)
              // so the energizer can amber-badge the SOURCE in addition to the destination. SINGLE source
              // for now (honest — current math can't fund a multi-source cascade; that's B3).
              let _srcEl = _elById[liq[0].id]; if (_srcEl) _srcEl.setAttribute('data-route-debt-src', '1');
              debts.forEach(d => {
                  let p = `M ${liq[0].cx} ${liq[0].cy} L ${d.cx} ${d.cy}`;
                  let demoPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                  demoPath.setAttribute("d", p);
                  demoPath.setAttribute("class", "demolition-route");
                  svgContainer.appendChild(demoPath);
              });
          }
      }

      const formattedTotal = grandTotal === 0 ? '$0' : (grandTotal < 0 ? '-$' + Math.abs(Math.round(grandTotal)).toLocaleString('en-US') : '$' + Math.round(grandTotal).toLocaleString('en-US'));
      grossEstateVal.innerText = formattedTotal;
      if (isShocked) grossEstateVal.style.color = "var(--danger)";
      else grossEstateVal.style.color = "var(--white)";

      if (newRoomToTrace) {
          let machine = ctx.machineEl;
          let d = newRoomToTrace;
          if(machine) {
              machine.animate([
                { transform: `translate(0px, 0px)`, offset: 0 },
                { transform: `translate(${d.x - 700}px, ${d.y - 550}px)`, offset: 0.15 },
                { transform: `translate(${d.x + d.w - 700}px, ${d.y - 550}px)`, offset: 0.35 },
                { transform: `translate(${d.x + d.w - 700}px, ${d.y + d.h - 550}px)`, offset: 0.55 },
                { transform: `translate(${d.x - 700}px, ${d.y + d.h - 550}px)`, offset: 0.75 },
                { transform: `translate(${d.x - 700}px, ${d.y - 550}px)`, offset: 0.90 },
                { transform: `translate(0px, 0px)`, offset: 1 }
              ], {
                duration: 1800,
                easing: 'linear'
              });
          }
      }

      // S2.5b — corridor PATHS (structure only; R2 split — the energizer reveals them). A faint thread
      // between vertically-adjacent rooms in the same column, drawn UNDER the rooms and started HIDDEN
      // (stroke-dashoffset = full length, no flash). Attached on the descriptor array as a non-breaking
      // sidecar (.corridors) — EXTEND §16.2-iii, never fork — so DatumEnergize.run reads it.
      var corridors = [];
      var cg = document.createElementNS("http://www.w3.org/2000/svg", "g");
      cg.setAttribute('class', 'estate-corridors');
      svgContainer.insertBefore(cg, svgContainer.firstChild);   // UNDER the rooms; in DOM before getTotalLength
      for (var ci = 1; ci < drawnRooms.length; ci++) {
        var rA = drawnRooms[ci - 1], rB = drawnRooms[ci];
        if (rA.col !== rB.col) continue;                        // same-column (vertical) neighbors only
        var cid = rA.id + '__' + rB.id;
        var cpath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        cpath.setAttribute('d', 'M ' + rA.cx + ' ' + rA.cy + ' L ' + rB.cx + ' ' + rB.cy);
        cpath.setAttribute('class', 'estate-corridor');
        cpath.setAttribute('data-corridor', cid);
        cpath.setAttribute('fill', 'none');
        cpath.setAttribute('stroke', 'rgba(93,202,165,0.35)');  // faint teal — tune by eye
        cpath.setAttribute('stroke-width', '2');
        cg.appendChild(cpath);
        var clen = cpath.getTotalLength ? cpath.getTotalLength() : 0;
        cpath.style.strokeDasharray = clen;
        cpath.style.strokeDashoffset = clen;                    // start hidden; energizer reveals
        corridors.push({ id: cid, el: cpath, fromId: rA.id, toId: rB.id, len: clen });
      }
      descriptors.corridors = corridors;

      ctx.accounts.forEach(a => a.isNew = false);
      return descriptors;   // S2.4 — §16.2-iii single hook surface; consumers tween off this
  }
  window.DatumEstate = { renderEstate: renderEstate, SHELL_TUNE: SHELL_TUNE, A1_TUNE: A1_TUNE };
  window.DatumEstateTune = SHELL_TUNE;     // Phase A geometry — openness/envWeight/partWeight (LOCKED)
  window.DatumEstateA1Tune = A1_TUNE;      // Phase A.1 eyes-on dial; edit then updateSVGs()
})();
