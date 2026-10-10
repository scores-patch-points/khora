// laws/_para_prep.mjs — shared preprocessing of one view for FAMILY "para": flat token-id array, unit offsets, hashed n-gram keys (53-bit safe integers), whole-unit keys,
// and the within-view mid-rank octave bin of every type. Pure functions of the view; no randomness.
const mix = (h, x, m) => { h = Math.imul(h ^ x, m); return h ^ (h >>> 15); };
const tokHash = (id, salt) => { let h = Math.imul(id + salt, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return h ^ (h >>> 16); };
const key53 = (h1, h2) => (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 2097151);

export function prep(view) {
  const units = view.units, nU = units.length, docOf = view.docOf && view.docOf.length === nU ? view.docOf : new Array(nU).fill(0);
  const start = new Int32Array(nU + 1); let T = 0;
  for (let u = 0; u < nU; u++) { start[u] = T; T += units[u].length; }
  start[nU] = T;
  const ids = new Int32Array(T), idOf = new Map(), cnt = []; let p = 0;
  for (let u = 0; u < nU; u++) { const un = units[u]; for (let j = 0; j < un.length; j++) { let id = idOf.get(un[j]); if (id === undefined) { id = cnt.length; idOf.set(un[j], id); cnt.push(0); } ids[p++] = id; cnt[id]++; } }
  const V = cnt.length, H1 = new Int32Array(V), H2 = new Int32Array(V);
  for (let i = 0; i < V; i++) { H1[i] = tokHash(i, 0x1234567); H2[i] = tokHash(i, 0x7654321); }
  const P = { nU, T, V, start, ids, cnt, docOf, H1, H2, _keys: new Map(), _ukey: null, _bin: null, len: (u) => start[u + 1] - start[u] };
  P.keys = (n) => { // key of the n-gram starting at each position, -1 where it would cross the unit end
    let K = P._keys.get(n); if (K) return K;
    K = new Float64Array(T).fill(-1);
    for (let u = 0; u < nU; u++) for (let i = start[u]; i + n <= start[u + 1]; i++) {
      let h1 = 0, h2 = 0;
      for (let j = 0; j < n; j++) { const id = ids[i + j]; h1 = mix(h1, H1[id], 0x9e3779b1); h2 = mix(h2, H2[id], 0x85ebca77); }
      K[i] = key53(h1, h2);
    }
    P._keys.set(n, K); return K;
  };
  P.unitKey = () => { // key of the whole token sequence of every unit (length is mixed in)
    if (P._ukey) return P._ukey;
    const K = new Float64Array(nU);
    for (let u = 0; u < nU; u++) { let h1 = start[u + 1] - start[u], h2 = ~h1; for (let i = start[u]; i < start[u + 1]; i++) { h1 = mix(h1, H1[ids[i]], 0x9e3779b1); h2 = mix(h2, H2[ids[i]], 0x85ebca77); } K[u] = key53(h1, h2); }
    return (P._ukey = K);
  };
  P.bins = () => { // octave of the within-view mid-rank (ties share one mid-rank): bin = floor(log2(midrank)); depends on the counts only
    if (P._bin) return P._bin;
    let mx = 0; for (let i = 0; i < V; i++) if (cnt[i] > mx) mx = cnt[i];
    const cc = new Int32Array(mx + 2); for (let i = 0; i < V; i++) cc[cnt[i]]++;
    const binOfCount = new Int8Array(mx + 2); let above = 0;
    for (let c = mx; c >= 1; c--) { if (!cc[c]) continue; const mid = above + 1 + (cc[c] - 1) / 2; binOfCount[c] = Math.floor(Math.log2(mid)); above += cc[c]; }
    const B = new Int8Array(V); for (let i = 0; i < V; i++) B[i] = binOfCount[cnt[i]];
    return (P._bin = B);
  };
  P.sets = (n) => { // Set of distinct n-gram keys per unit (null when the unit is shorter than n)
    const K = P.keys(n), S = new Array(nU);
    for (let u = 0; u < nU; u++) { if (start[u + 1] - start[u] < n) { S[u] = null; continue; } const s = new Set(); for (let i = start[u]; i + n <= start[u + 1]; i++) s.add(K[i]); S[u] = s; }
    return S;
  };
  return P;
}
export { mix, key53 };
