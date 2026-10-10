// laws/_phys_prep.mjs — shared single pass of the "phys" family: token ids (by first occurrence), counts, frequency ranks, unit/document offsets, and fixed-size windows.
// Deterministic; typed arrays; no randomness. Everything is an observable of the token stream (type identity, position, count, rank, unit and document boundaries).

/** prep(view) -> P = { N, V, nU, tid:Int32Array(N), cnt:Int32Array(V), us:Int32Array(nU+1) unit start offsets, udoc:Int32Array(nU), doc:Int32Array(N) document of each token, rank:Int32Array(V) 0-based frequency rank
 *  (descending count, ties by first occurrence), mid:Float64Array(V) mid-rank of the tie group, byRank:Int32Array(V) } */
export function prep(view) {
  const units = view.units, nU = units.length;
  let N = 0; for (let u = 0; u < nU; u++) N += units[u].length;
  const ids = new Map(), tid = new Int32Array(N), us = new Int32Array(nU + 1), udoc = new Int32Array(nU), doc = new Int32Array(N);
  let o = 0;
  for (let u = 0; u < nU; u++) {
    const w = units[u], d = view.docOf[u]; us[u] = o; udoc[u] = d;
    for (let k = 0; k < w.length; k++) { let id = ids.get(w[k]); if (id === undefined) { id = ids.size; ids.set(w[k], id); } tid[o] = id; doc[o] = d; o++; }
  }
  us[nU] = o;
  const V = ids.size, cnt = new Int32Array(V);
  for (let i = 0; i < N; i++) cnt[tid[i]]++;
  const byRank = new Int32Array(V); for (let t = 0; t < V; t++) byRank[t] = t;
  byRank.sort((a, b) => cnt[b] - cnt[a] || a - b);   // ties by first occurrence; only the cut at the K-th body uses this order: the rank BINS use the tie-group's mid-rank (below), no label or position enters them
  const rank = new Int32Array(V); for (let r = 0; r < V; r++) rank[byRank[r]] = r;
  // MID-RANK: every type of a tie group (equal count) gets the average rank of the group, so the frequency-rank octave of a type depends on its count only (script-, label- and position-free)
  const mid = new Float64Array(V);
  for (let r = 0; r < V;) { let e = r; while (e + 1 < V && cnt[byRank[e + 1]] === cnt[byRank[r]]) e++; for (let k = r; k <= e; k++) mid[byRank[k]] = (r + e) / 2; r = e + 1; }
  return { N, V, nU, tid, cnt, us, udoc, doc, rank, mid, byRank };
}

/** consecutive windows of whole units, each closing at the first unit boundary at or after `target` tokens; a trailing remainder below `target` tokens is dropped (fixed-N windows only).
 *  -> [{u0, u1, t0, t1}] (units u0..u1-1, token offsets t0..t1-1) */
export function windows(P, target) {
  const out = []; let u0 = 0;
  while (u0 < P.nU) {
    let u1 = u0 + 1; while (u1 < P.nU && P.us[u1] - P.us[u0] < target) u1++;
    if (P.us[u1] - P.us[u0] >= target) out.push({ u0, u1, t0: P.us[u0], t1: P.us[u1] });
    u0 = u1;
  }
  return out;
}
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

/** SIZE-EQUALISED SAMPLE: up to 8 evenly spaced blocks of whole units, each of at least min(BLOCK, N / 8) tokens and never running into the next block's start. For a half of >= 8 * BLOCK tokens the
 *  sample is exactly 8 blocks of about BLOCK tokens whatever the half's size; a smaller half is used almost whole. -> [{cs, ce}] token ranges (contiguous in the stream, unit-aligned) */
export const BLOCK = 6000, NBLOCKS = 8;
export function sampleBlocks(P) {
  const out = [], want = Math.min(BLOCK, Math.floor(P.N / NBLOCKS));
  if (want < 1) return out;
  for (let b = 0; b < NBLOCKS; b++) {
    const lo = Math.floor((b * P.N) / NBLOCKS), hi = b + 1 < NBLOCKS ? Math.floor(((b + 1) * P.N) / NBLOCKS) : P.N;
    let ua = 0; while (ua < P.nU && P.us[ua] < lo) ua++;
    let ub = ua; while (ub < P.nU && P.us[ub] < hi && P.us[ub] - P.us[ua] < want) ub++;
    if (ub > ua) out.push({ cs: P.us[ua], ce: P.us[ub] });
  }
  return out;
}
