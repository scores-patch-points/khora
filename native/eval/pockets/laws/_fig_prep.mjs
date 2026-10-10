// laws/_fig_prep.mjs — preprocessing of the "fig" family (leading underscore: the atlas ignores this file).
// view -> typed arrays over the token stream (units concatenated in order; document boundaries are NOT used: a window is 128 consecutive units of the view).
// Deterministic: no randomness; every sum is in token order.
export const WIN = 127;     // a token is a FIGURE token iff another token of its type lies within 127 units (same unit counts as distance 0)
                            //   <=> its type has >= 2 tokens inside some window of 128 consecutive units that contains this token
export const BLOCK = 128;   // aligned non-overlapping block of 128 units (used where a per-window count is needed)
export const INF = 1 << 30;

/** rank bin of a type = floor(log2(mid-rank)) of its count among all types; ties in count share the MID-rank, so equal-count types (all hapax) share one bin and nothing leaks from order of appearance */
function rankBins(cnt, T) {
  let maxC = 0;
  for (let t = 0; t < T; t++) if (cnt[t] > maxC) maxC = cnt[t];
  const byC = new Int32Array(maxC + 2), binOfC = new Uint8Array(maxC + 2);
  for (let t = 0; t < T; t++) byC[cnt[t]]++;
  let r0 = 0;
  for (let c = maxC; c >= 1; c--) { const m = byC[c]; if (!m) continue; binOfC[c] = Math.floor(Math.log2(r0 + (m + 1) / 2)); r0 += m; }
  const bin = new Uint8Array(T);
  for (let t = 0; t < T; t++) bin[t] = binOfC[cnt[t]];
  return bin;
}

export function prep(view) {
  const units = view.units, U = units.length; let N = 0;
  for (const u of units) N += u.length;
  const tok = new Int32Array(N), uOf = new Int32Array(N), uStart = new Int32Array(U + 1), map = new Map();
  let n = 0;
  for (let k = 0; k < U; k++) {
    const u = units[k]; uStart[k] = n;
    for (let j = 0; j < u.length; j++) { const w = u[j]; let id = map.get(w); if (id === undefined) { id = map.size; map.set(w, id); } tok[n] = id; uOf[n++] = k; }
  }
  uStart[U] = n;
  const T = map.size, cnt = new Int32Array(T);
  for (let i = 0; i < N; i++) cnt[tok[i]]++;
  const bin = rankBins(cnt, T);
  // gaps (in units) to the previous / next token of the same type, and the index of the next one
  const gp = new Int32Array(N), gn = new Int32Array(N), nxt = new Int32Array(N), last = new Int32Array(T).fill(-1);
  for (let i = 0; i < N; i++) { const t = tok[i], l = last[t]; gp[i] = l < 0 ? INF : uOf[i] - uOf[l]; last[t] = i; }
  last.fill(-1);
  for (let i = N - 1; i >= 0; i--) { const t = tok[i], l = last[t]; if (l < 0) { gn[i] = INF; nxt[i] = -1; } else { gn[i] = uOf[l] - uOf[i]; nxt[i] = l; } last[t] = i; }
  const fig = new Uint8Array(N), birth = new Uint8Array(N);   // birth = a figure token that opens an episode (no same-type token in the 127 units before it)
  for (let i = 0; i < N; i++) { if (gp[i] <= WIN || gn[i] <= WIN) { fig[i] = 1; if (gp[i] > WIN) birth[i] = 1; } }
  return { N, U, T, tok, uOf, uStart, cnt, bin, gp, gn, nxt, fig, birth };
}
