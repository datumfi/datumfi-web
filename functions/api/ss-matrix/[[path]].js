// /api/ss-matrix/* — SAME-ORIGIN front door for the Social Security claiming matrix.
//
// ⛔ THIS FILE EXISTS BECAUSE ENFORCEMENT WOULD OTHERWISE HAVE 403'd THE SS ANALYZER.
// studio.html:15716 defines API_BASE and THREE call sites feed off it — :16331 (start),
// :16364 and :16434 (poll). A proxy covering only /api/calculate would have shipped a lock that
// silently broke the second-most-expensive feature on the site, and Finding 45 already records
// that :16434 is a bare `if (!r.ok) return;` — THE BUTTON WOULD HAVE DONE NOTHING AND THE
// PRODUCT WOULD HAVE SAID NOTHING. A lock is not finished until you have enumerated every key
// that was already in the door.
//
// Catch-all: `start` is a POST, the job poll is a GET on /{jobId}. Both are forwarded verbatim.
import { proxyToEngine } from '../_lib/engine-core.js';

const upstream = (context) => {
  const parts = context.params.path;
  return '/api/ss-matrix/' + (Array.isArray(parts) ? parts.join('/') : parts || '');
};

export async function onRequestGet(context)  { return proxyToEngine(context.request, context.env, upstream(context)); }
export async function onRequestPost(context) { return proxyToEngine(context.request, context.env, upstream(context)); }
