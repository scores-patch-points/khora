// laws/_order_prep.mjs — single-pass preparation for the "order" family (leading underscore: the atlas ignores this file).
// prep(view) -> { N, U, V, T, cnt, mid, xt, bt, K, B, xs, bs, unitStart, sdx }
//   T[p]       type id of token p in stream order (units concatenated in view order); unitStart[u]..unitStart[u+1] is unit u
//   cnt[t]     occurrences of type t;  mid[t] = MID-RANK (ties in count share the average of the ranks they span; 1 = commonest)
//   xt[t]      ln mid-rank;  bt[t] = floor(log2 mid-rank) = log2 rank bin (Uint8);  B = number of bins (max bt + 1)
//   K          head size = min(400, max(10, round(0.05 V))): HEAD = mid <= K, CONTENT = mid > 4K
//   xs[p], bs[p]  per-token x and bin;  sdx = token-weighted sd of x over the view
// Nothing here reads view.id; nothing is random; mid-rank needs no tie-break order, so nothing depends on string order or hash order.
export function prep(view) {
  const units = view.units, U = units.length;
  let N = 0;
  for (let u = 0; u < U; u++) N += units[u].length;
  const T = new Int32Array(N), unitStart = new Int32Array(U + 1), ids = new Map();
  let p = 0, V = 0;
  for (let u = 0; u < U; u++) {
    unitStart[u] = p;
    const w = units[u];
    for (let k = 0; k < w.length; k++) {
      let t = ids.get(w[k]);
      if (t === undefined) { t = V++; ids.set(w[k], t); }
      T[p++] = t;
    }
  }
  unitStart[U] = p;
  const cnt = new Int32Array(V);
  let maxc = 0;
  for (let i = 0; i < N; i++) { const c = ++cnt[T[i]]; if (c > maxc) maxc = c; }
  // histogram of counts -> mid-rank of count c = (#types with count > c) + (#types with count == c + 1) / 2
  const hist = new Int32Array(maxc + 2);
  for (let t = 0; t < V; t++) hist[cnt[t]]++;
  const midOfCount = new Float64Array(maxc + 2);
  let above = 0;
  for (let c = maxc; c >= 1; c--) { if (hist[c]) midOfCount[c] = above + (hist[c] + 1) / 2; above += hist[c]; }
  const mid = new Float64Array(V), xt = new Float64Array(V), bt = new Uint8Array(V);
  let B = 1;
  for (let t = 0; t < V; t++) { const m = midOfCount[cnt[t]]; mid[t] = m; xt[t] = Math.log(m); bt[t] = Math.floor(Math.log2(m) + 1e-12); if (bt[t] + 1 > B) B = bt[t] + 1; }
  const K = Math.min(400, Math.max(10, Math.round(0.05 * V)));
  const xs = new Float64Array(N), bs = new Uint8Array(N);
  let sx = 0, sxx = 0;
  for (let i = 0; i < N; i++) { const t = T[i], x = xt[t]; xs[i] = x; bs[i] = bt[t]; sx += x; }
  const mx = N ? sx / N : 0;
  for (let i = 0; i < N; i++) sxx += (xs[i] - mx) * (xs[i] - mx); // two-pass: no cancellation
  const sdx = Math.sqrt(N ? sxx / N : 0);
  return { N, U, V, T, cnt, mid, xt, bt, K, B, xs, bs, unitStart, sdx };
}
