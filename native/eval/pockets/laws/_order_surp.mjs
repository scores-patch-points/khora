// laws/_order_surp.mjs — surprGrow of the "order" family.
// g_i = [-ln((c(a,b)+1)/(c(a)+V))] - [-ln((c(b)+1)/(N+V))] for token i = b with predecessor a in the same unit; c = IN-SAMPLE counts of the very view being measured (adjacent pairs inside units;
// c(a) = number of adjacent pairs whose left token is a; c(b) = unigram count; V = types, N = tokens), add-one smoothing. Nothing is estimated on any other text, so a null draw (a shuffled view)
// re-counts its own bigrams: no information from the real arrangement leaks into the null. v = pooled within-unit Pearson correlation of g with relative position i/(L-1) over tokens 1..L-1 of units >= 4.
export function surprGrow(P) {
  const { U, V, N, T, cnt, unitStart } = P;
  let nb = 0;
  for (let u = 0; u < U; u++) { const L = unitStart[u + 1] - unitStart[u]; if (L > 1) nb += L - 1; }
  if (nb < 2000) return {};
  let cap = 1024; while (cap < 2 * nb) cap <<= 1;
  const mask = cap - 1, ka = new Int32Array(cap).fill(-1), kb = new Int32Array(cap), kc = new Int32Array(cap), cL = new Int32Array(V);
  const slot = (a, b) => {
    let h = Math.imul(a, 0x9e3779b1) ^ Math.imul(b + 0x7f4a7c15, 0x85ebca6b);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 13;
    let s = h & mask;
    while (ka[s] !== -1 && (ka[s] !== a || kb[s] !== b)) s = (s + 1) & mask;
    return s;
  };
  for (let u = 0; u < U; u++) {
    const a0 = unitStart[u], L = unitStart[u + 1] - a0;
    for (let i = 1; i < L; i++) {
      const a = T[a0 + i - 1], b = T[a0 + i], s = slot(a, b);
      if (ka[s] === -1) { ka[s] = a; kb[s] = b; }
      kc[s]++; cL[a]++;
    }
  }
  const lnNV = Math.log(N + V);
  let gbuf = new Float64Array(4096), Sgr = 0, Sgg = 0, Srr = 0, nU = 0;
  for (let u = 0; u < U; u++) {
    const a0 = unitStart[u], L = unitStart[u + 1] - a0;
    if (L < 4) continue;
    if (gbuf.length < L) gbuf = new Float64Array(L * 2);
    let gm = 0;
    for (let i = 1; i < L; i++) {
      const a = T[a0 + i - 1], b = T[a0 + i];
      const v = Math.log(cL[a] + V) - Math.log(kc[slot(a, b)] + 1) + Math.log(cnt[b] + 1) - lnNV;
      gbuf[i] = v; gm += v;
    }
    gm /= L - 1;
    const rm = L / (2 * (L - 1));
    for (let i = 1; i < L; i++) { const dg = gbuf[i] - gm, dr = i / (L - 1) - rm; Sgr += dg * dr; Sgg += dg * dg; Srr += dr * dr; }
    nU++;
  }
  return nU >= 300 && Sgg > 1e-9 * nU && Srr > 0 ? { surprGrow: Sgr / Math.sqrt(Sgg * Srr) } : {};
}
