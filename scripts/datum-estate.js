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

  function _envelopePath(colInfo) {
    if (!colInfo.length) return '';
    var top = colInfo[0].top, n = colInfo.length, last = colInfo[n - 1];
    var d = 'M ' + colInfo[0].x + ' ' + top;
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
  function _privDoor(r) {
    var wy = r.last ? r.y : (r.y + r.h);                                     // last room: top wall; else bottom
    return _doorH(wy, r.x, r.x + r.w, r.id + 'pd', r.val >= 250000);
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

    svgContainer.innerHTML = '';
      // DRAWING PHYSICS: PROPORTIONAL SQUARIFY RENDERING
      let gX = 200, gY = 160, gW = 1000, gH = 850; 
      let pVal = propertyAccount ? propertyAccount.value || 0 : 0;
      let pValStr = pVal >= 1000000 ? '$'+(pVal/1000000).toFixed(2)+'M' : (pVal >= 1000 ? '$'+(pVal/1000).toFixed(0)+'k' : (pVal > 0 ? '$'+pVal : ''));

      let gSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gSVG.innerHTML = `
          <title>Physical asset footprint.</title>
          <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" class="grounds-rect" />
          <text x="${gX + gW/2}" y="${gY + gH - 30}" class="grounds-title">THE GROUNDS</text>
          <text x="${gX + gW/2}" y="${gY + gH - 10}" class="grounds-title" style="fill: var(--gold); font-size:16px;">${pValStr}</text>
      `;
      svgContainer.appendChild(gSVG);

      // SURGICAL: Datum Line Rendering
      if (isDatum) {
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
              descriptors.push({ id: acc.id, el: g, rect: g.querySelector('.room-rect'), d: d, value: acc.value || 0, fillPct: fp, weight: weight, isNew: !!acc.isNew, taxCode: base.taxCode, isDebt: false });
              cY += h + 12;
          });
      }

      let activeCols = [];
      if(cols.primary.length > 0) activeCols.push('primary');
      if(cols.joint.length > 0) activeCols.push('joint');
      if(cols.coarch.length > 0) activeCols.push('coarch');
      
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
             cols[c].forEach(acc => {
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
              let accounts = cols[colName];
              
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
                  
                  drawnRooms.push({ id: acc.id, taxCode: base.taxCode, isDebt: isDebt, isPriority: acc.isPriority, cx: d.cx, cy: d.cy, col: colName });

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
                                   last: (i === accounts.length - 1) });

                  let animClass = acc.isNew ? 'animate-draw' : '';
                  let frictionClass = acc.isFriction ? 'liquidity-friction' : '';
                  let priorityClass = acc.isPriority ? 'structural-priority' : '';
                  
                  let shockColor = (isShocked && isVolatile && !isDebt) ? 'var(--danger)' : (isDebt ? 'var(--danger)' : 'var(--white)');
                  
                  let taxClass = '';
                  if(isThermal) taxClass = `tax-${base.taxCode}`;

                  // S2.4 — load-bearing weight (read from hub) + concave fill on RAW value.
                  let weight = accountWeights[acc.id] || 0;
                  let fp = fillPct(acc.value || 0);
                  let fillH = d.h * fp / 100, fillY = d.y + d.h - fillH;
                  g.style.setProperty('--weight', weight);
                  let fillHTML = fp > 0 ? `
                    <rect x="${d.x}" y="${fillY}" width="${d.w}" height="${fillH}" class="room-fill${isDebt ? ' fill-debt' : ''}" fill="url(#${isDebt ? 'fillGradDebt' : 'fillGradAsset'})" />` : '';

                  g.innerHTML = `
                    ${tooltipHTML}
                    <rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" class="room-rect active ${animClass} ${frictionClass} ${priorityClass} ${taxClass}" style="stroke:none" />
                    ${fillHTML}
                    <text x="${d.cx}" y="${d.cy - 10}" class="bp-title">${base.meta.toUpperCase()}</text>
                    <text x="${d.cx}" y="${d.cy + 30}" class="bp-val" style="fill:${shockColor}; transition: 0.6s ease;">${valStr}</text>
                  `;
                  svgContainer.appendChild(g);
                  descriptors.push({ id: acc.id, el: g, rect: g.querySelector('.room-rect'), d: d, value: acc.value || 0, fillPct: fp, weight: weight, isNew: !!acc.isNew, taxCode: base.taxCode, isDebt: isDebt });

                  currentY += h + gap;
              });

              colInfo.push({ x: currentX, w: colW, top: gY + 20, bottom: currentY });   // Phase A — for the envelope
              currentX += colW + colGap;
          });

          // Phase A — draw the estate SHELL once (over the room fills): one envelope + dissolved
          // interior walls (open thresholds) + sealed private rooms (Vault + debt). Replaces the
          // per-room box strokes (now stroke:none) and the per-room doors.
          var _shell = '<path class="estate-envelope" d="' + _envelopePath(colInfo) +
                       '" style="fill:none;stroke:var(--teal-mid);stroke-width:' + SHELL_TUNE.envWeight + 'px;opacity:0.92"/>';
          _sharedEdges(roomRects, colInfo).forEach(function (e) { _shell += _openThreshold(e, SHELL_TUNE.openness); });
          roomRects.forEach(function (r) { if (r.priv) _shell += _privEnclosure(r) + _privDoor(r); });
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

      // SURGICAL: Outflow Routing Lines
      if (isRouting && drawnRooms.length > 0) {
          let liq = drawnRooms.filter(r => r.taxCode === 'liquid');
          let pre = drawnRooms.filter(r => r.taxCode === 'pretax');
          let roth = drawnRooms.filter(r => r.taxCode === 'roth');
          let debts = drawnRooms.filter(r => r.isDebt && r.isPriority);

          let sequence = [...liq, ...pre, ...roth];

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
  window.DatumEstate = { renderEstate: renderEstate, SHELL_TUNE: SHELL_TUNE };
  window.DatumEstateTune = SHELL_TUNE;   // Phase A eyes-on dial — openness 0..1, envWeight, partWeight; then updateSVGs()
})();
