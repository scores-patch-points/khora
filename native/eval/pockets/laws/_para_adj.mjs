// laws/_para_adj.mjs — adjacency statistics of FAMILY "para" (null: unit-order). Pair rates, or ratio-of-sums collision rates whose null expectation does not depend on unit length.
const MIN_UNITS = 50;

/** POOLED n-GRAM COLLISION RATE between unit u and unit u-L (same document), over all such pairs with both units >= n tokens: (number of shared distinct n-grams) / sum over pairs of
 *  |S_u| * |S_{u-L}|, i.e. the probability that a random distinct n-gram of u equals a random distinct n-gram of u-L. Under any exchangeable pairing its expectation is the n-gram collision
 *  probability of the lexicon whatever the unit lengths are (a ratio of sums with E[hits | sizes] proportional to the weight), so neither v nor the null mean is a function of unit length. */
export function echo(P, S, L) {
  const { nU, docOf } = P; let hits = 0, w = 0, cnt = 0;
  for (let u = L; u < nU; u++) {
    const su = S[u], sp = S[u - L]; if (su === null || sp === null || docOf[u] !== docOf[u - L]) continue;
    const [a, b] = su.size <= sp.size ? [su, sp] : [sp, su]; let h = 0;
    for (const k of a) if (b.has(k)) h++;
    hits += h; w += su.size * sp.size; cnt++;
  }
  return { mean: w > 0 ? hits / w : null, cnt, hits };
}

function prefixSuffix(P) {
  const { nU, docOf, start, ids } = P; let np = 0, pre = 0, suf = 0;
  for (let u = 1; u < nU; u++) {
    if (docOf[u] !== docOf[u - 1]) continue;
    const a = start[u - 1], ae = start[u], b = start[u], be = start[u + 1];
    if (ae - a < 2 || be - b < 2) continue;
    np++;
    if (ids[a] === ids[b] && ids[a + 1] === ids[b + 1]) pre++;
    if (ids[ae - 1] === ids[be - 1] && ids[ae - 2] === ids[be - 2]) suf++;
  }
  return np >= MIN_UNITS ? { prefixCopy: pre / np, suffixCopy: suf / np } : { prefixCopy: null, suffixCopy: null };
}

function posPar(P) {
  const { nU, docOf, start, ids } = P, K = 8, m = new Float64Array(K), c = new Float64Array(K);
  for (let u = 1; u < nU; u++) {
    if (docOf[u] !== docOf[u - 1]) continue;
    const a = start[u - 1], b = start[u], la = start[u] - a, lb = start[u + 1] - b, l = Math.min(la, lb, K);
    for (let k = 0; k < l; k++) { c[k]++; if (ids[a + k] === ids[b + k]) m[k]++; }
  }
  let s = 0, n = 0;
  for (let k = 0; k < K; k++) if (c[k] >= 50) { s += m[k] / c[k]; n++; }
  return n >= 3 && c[0] >= 50 && c[1] >= 50 ? s / n : null;
}

function lagDecay(P, S2) {
  const xs = [], ys = []; let hits = 0;
  for (const L of [1, 2, 4, 8, 16, 32]) { const e = echo(P, S2, L); if (e.cnt >= 100 && e.mean !== null) { xs.push(Math.log2(L)); ys.push(e.mean); hits += e.hits; } }
  if (xs.length < 4 || hits < 30) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0; for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  return my > 0 ? sxy / sxx / my : null;
}

export function adjStats(P) {
  const out = { adjNg2: null, adjNg3: null, adjNg4: null }, S2 = P.sets(2);
  for (const [n, id] of [[2, "adjNg2"], [3, "adjNg3"], [4, "adjNg4"]]) {
    const e = echo(P, n === 2 ? S2 : P.sets(n), 1); out[id] = e.cnt >= MIN_UNITS ? e.mean : null;
  }
  Object.assign(out, prefixSuffix(P)); out.posPar = posPar(P); out.lagDecay = lagDecay(P, S2);
  return out;
}
