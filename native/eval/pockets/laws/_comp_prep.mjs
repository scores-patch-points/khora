// laws/_comp_prep.mjs — shared preparation of the "comp" family: integer ids, counts, rank bins (exactly the rank bins of eval/law/name-company.mjs rankBins), entropy helpers.
// Files starting with _ are ignored by run-atlas.mjs. Deterministic; no Math.random, no Date.
export const NB = 12; // rank bins 0..11: bin = min(11, floor(log2(rank))), rank 1 = commonest type (ranks 2-3 -> 1, 4-7 -> 2, ..., >= 2048 -> 11); ties in count are ordered by string
export const LN2 = Math.LN2;

/** view {units: string[][]} -> {N, V, w: Int32Array token ids, us: Int32Array unit starts (length units+1), cnt: Int32Array, bin: Uint8Array per type, lnr: Float64Array ln(rank) per type, tb: Uint8Array per token} */
export function prep(view) {
  const units = view.units; let N = 0;
  for (const u of units) N += u.length;
  const w = new Int32Array(N), us = new Int32Array(units.length + 1), ids = new Map(), names = [];
  let p = 0;
  for (let k = 0; k < units.length; k++) {
    us[k] = p; const u = units[k];
    for (let j = 0; j < u.length; j++) { const t = u[j]; let id = ids.get(t); if (id === undefined) { id = names.length; ids.set(t, id); names.push(t); } w[p++] = id; }
  }
  us[units.length] = p;
  const V = names.length, cnt = new Int32Array(V);
  for (let i = 0; i < N; i++) cnt[w[i]]++;
  const order = new Array(V); for (let i = 0; i < V; i++) order[i] = i;
  order.sort((a, b) => cnt[b] - cnt[a] || (names[a] < names[b] ? -1 : 1));
  const bin = new Uint8Array(V), lnr = new Float64Array(V);
  for (let r = 0; r < V; r++) { bin[order[r]] = Math.min(NB - 1, 31 - Math.clz32(r + 1)); lnr[order[r]] = Math.log(r + 1); } // floor(log2(r + 1)) with r 0-based = floor(log2(rank)); lnr = ln(rank)
  const tb = new Uint8Array(N); for (let i = 0; i < N; i++) tb[i] = bin[w[i]];
  return { N, V, w, us, cnt, bin, lnr, tb, nUnits: units.length };
}

/** plug-in entropy (bits) of a count vector; returns [H, total, nonEmpty] */
export function entropy(c) {
  let n = 0, R = 0; for (let i = 0; i < c.length; i++) if (c[i] > 0) { n += c[i]; R++; }
  if (!n) return [0, 0, 0];
  let h = 0; for (let i = 0; i < c.length; i++) if (c[i] > 0) { const q = c[i] / n; h -= q * Math.log(q); }
  return [h / LN2, n, R];
}
/** Miller-Madow entropy (bits): plug-in + (R - 1) / (2 n ln 2) */
export function entropyMM(c) { const [h, n, R] = entropy(c); return n > 0 ? h + (R - 1) / (2 * n * LN2) : 0; }
/** joint table (NB x NB, row = first, column = second) -> {Ha, Hb, Hab, n}: marginal and joint plug-in entropies in bits */
export function jointEntropies(T) {
  const a = new Float64Array(NB), b = new Float64Array(NB);
  for (let i = 0; i < NB; i++) for (let j = 0; j < NB; j++) { const x = T[i * NB + j]; a[i] += x; b[j] += x; }
  const [Ha, n] = entropy(a), [Hb] = entropy(b), [Hab] = entropy(T);
  return { Ha, Hb, Hab, n };
}
export const finite = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
