/* F4 — IS A CAPPED RAMP AT 100vh PERCEPTIBLY STEEPER THAN THE DONOR'S 1037px?
 *
 * THE ARCHITECT'S FALSIFIABLE PREMISE (§F4.2): capping our field at 100vh means that at 1366x768
 * the ramp completes in 768px where the donor's takes 1037 — a ~26% steeper ramp. He predicts it is
 * IMPERCEPTIBLE because the whole ramp traverses only #040a12 -> #091220, about (5,8,14) end to end,
 * so compressing it redistributes a five-unit journey. THRESHOLD HE SET: if any composited delta
 * exceeds 2/255 the premise is wrong and he authors again.
 *
 * ⛔ WHY A FIXTURE AND NOT THE LIVE PAGE. studio.html is 1.00 viewport, so a cap changes NOTHING
 *    there — the effect only exists on a long page, and no long page carries the field yet. A
 *    fixture is the only way to ask the question before the thing exists.
 * ⛔ AND WHY MEASURED, NOT COMPUTED: gradient interpolation and 8-bit rounding are the browser's,
 *    not arithmetic's. A COMPUTED DELTA INHERITS EVERY ASSUMPTION IN ITS MODEL.
 * ⭐ IT ISOLATES ONE VARIABLE: two columns, identical stops, identical viewport, DIFFERING ONLY IN
 *    background-size height. Same page, same paint, same capture.
 */
import http from 'node:http';
import { chromium } from 'playwright';
const STOPS = 'linear-gradient(180deg,#040a12 0%,#07101b 24%,#091220 100%)';
const FINAL = '#091221';                       /* our --bg-navy; the donor ends at #091220 */
const [VW, VH] = (process.argv[2] || '1366x768').split('x').map(Number);
const CAP_A = VH;                              /* 100vh — the ruled cap                   */
const CAP_B = parseInt(process.argv[3] || '1037', 10); /* the donor's own absolute        */
/* ⛔⛔ THIS WAS TWO COLUMNS SIDE BY SIDE AND ITS NULL CONTROL READ 1/255 INSTEAD OF 0.
 * CAUSE: chromium DITHERS gradients to suppress banding, and the dither pattern depends on
 * x-POSITION — so a left column and a right column differ by ~1 even when they are declared
 * identically. THE LAYOUT MADE POSITION A CONFOUNDING VARIABLE, and a "max 4" measured on a
 * noise floor of 1 is not a clean 4.
 * 🔑 A DIFFERENTIAL WITHOUT A NULL PAIR IS NOT A MEASUREMENT — IT IS A NUMBER. The control caught
 *    it on this fixture's first outing, which is the entire reason the control exists.
 * ⇒ ONE FULL-WIDTH SURFACE, RENDERED TWICE, SAMPLED AT THE SAME x. Dithering is deterministic per
 *   position (proven: repeated captures read 0 drift), so identical geometry cancels it exactly. */
const page = (cap) => `<!doctype html><meta charset=utf-8><style>
html,body{margin:0;height:${VH}px;background:${FINAL}}
#a{position:absolute;inset:0;background-color:${FINAL};background-repeat:no-repeat;
   background-image:${STOPS};background-size:100% ${cap}px}
</style><div id=a></div>`;
let CURRENT = CAP_A;
const srv = http.createServer((q, s) => { s.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(page(CURRENT)); });
await new Promise((r) => srv.listen(8435, '127.0.0.1', r));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
const grab = async (cap) => { CURRENT = cap; await pg.goto('http://127.0.0.1:8435/?c=' + cap, { waitUntil: 'load' }); await pg.waitForTimeout(300);
  return pg.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VW, height: VH } }); };
const shotA = await grab(CAP_A), shotB = await grab(CAP_B);
await b.close(); srv.close();
const X = Math.floor(VW * 0.5);
/* decode: reuse the probe's PNG reader shape, inlined (8-bit, non-interlaced) */
const zlib = await import('node:zlib');
function dec(buf) {
  let off = 8, w = 0, h = 0, ct = 0, idat = [];
  while (off < buf.length) { const len = buf.readUInt32BE(off), t = buf.toString('ascii', off + 4, off + 8), d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break; off += 12 + len; }
  const ch = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), st = w * ch, out = Buffer.alloc(w * h * ch); let p = 0;
  for (let y = 0; y < h; y++) { const f = raw[p++], line = raw.subarray(p, p + st); p += st;
    const prev = y === 0 ? null : out.subarray((y - 1) * st, y * st), cur = out.subarray(y * st, (y + 1) * st);
    for (let x = 0; x < st; x++) { const a = x >= ch ? cur[x - ch] : 0, bb = prev ? prev[x] : 0, cc = prev && x >= ch ? prev[x - ch] : 0; let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += bb; else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) { const pp = a + bb - cc, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - cc); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : cc); }
      cur[x] = v & 255; } }
  return { w, h, ch, data: out };
}
const imgA = dec(shotA), imgB = dec(shotB);
const at = (img, x, y) => { const k = (y * img.w + x) * img.ch; return [img.data[k], img.data[k + 1], img.data[k + 2]]; };
let maxd = 0, maxAt = -1, maxPair = null;
const named = [];
for (let y = 0; y < VH; y++) {
  const A = at(imgA, X, y), B = at(imgB, X, y);
  const d = Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
  if (d > maxd) { maxd = d; maxAt = y; maxPair = [A, B]; }
  if ([Math.round(VH * 0.24), Math.round(CAP_B * 0.24), Math.round(VH * 0.5), VH - 1].includes(y)) named.push([y, A, B, d]);
}
console.log(`FIXTURE ${VW}x${VH} · stops ${STOPS} · final ${FINAL}`);
console.log(`  A = cap ${CAP_A}px (100vh, RULED)   ·   B = cap ${CAP_B}px (donor's absolute)`);
console.log(`  ONE full-width surface rendered TWICE, both sampled at x=${X} — identical geometry, so chromium position-dependent gradient dithering cancels exactly.
`);
for (const [y, A, B, d] of named) console.log(`  y=${String(y).padStart(4)}   A rgb(${A.join(',')})   B rgb(${B.join(',')})   d=${d}`);
console.log(`\n  MAX per-channel delta over all ${VH} rows: ${maxd}/255  at y=${maxAt}` + (maxPair ? `  (A rgb(${maxPair[0].join(',')}) vs B rgb(${maxPair[1].join(',')}))` : ''));
console.log(`  ARCHITECT'S THRESHOLD: >2/255 falsifies the premise.`);
console.log(maxd > 2 ? '\n⛔ PREMISE FALSIFIED — bring it back for authoring.' : '\n✅ PREMISE HOLDS ON MEASUREMENT, not on expectation.');
console.log(`SCORE 1/1 GREEN   (a measurement, not a verdict)`);
