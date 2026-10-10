// laws/_burst_prep.mjs — shared single-pass preparation for the "burst" family (leading underscore: the atlas ignores this file).
// prep(view) -> { N, U, V, T, types, cnt, rank, mid, order, unitStart, docOf }
//   T          Int32Array(N): type id of every token in stream order (units concatenated in view order)
//   cnt[t]     occurrences of type t in the view
//   rank[t]    strict frequency rank (1 = commonest); ties in count are broken by the type string (code-unit order), which no shuffle changes
//   mid[t]     mid-rank: ties in count share the average of the ranks they span (used for the rank series and the content cutoff; no arbitrary order inside a tie class)
//   order      type ids sorted by rank
// Nothing here reads view.id; nothing is random.
export function prep(view) {
  const units = view.units, U = units.length, docOf = view.docOf;
  let N = 0;
  for (let u = 0; u < U; u++) N += units[u].length;
  const T = new Int32Array(N), unitStart = new Int32Array(U + 1), ids = new Map(), types = [];
  let p = 0;
  for (let u = 0; u < U; u++) {
    unitStart[u] = p;
    const w = units[u];
    for (let k = 0; k < w.length; k++) {
      let t = ids.get(w[k]);
      if (t === undefined) { t = types.length; ids.set(w[k], t); types.push(w[k]); }
      T[p++] = t;
    }
  }
  unitStart[U] = p;
  const V = types.length, cnt = new Int32Array(V);
  for (let i = 0; i < N; i++) cnt[T[i]]++;
  const order = Array.from({ length: V }, (_, i) => i);
  order.sort((a, b) => cnt[b] - cnt[a] || (types[a] < types[b] ? -1 : types[a] > types[b] ? 1 : 0));
  const rank = new Int32Array(V), mid = new Float64Array(V);
  for (let a = 0; a < V; ) {
    let b = a; while (b < V && cnt[order[b]] === cnt[order[a]]) b++;
    const m = (a + 1 + b) / 2;
    for (let k = a; k < b; k++) { rank[order[k]] = k + 1; mid[order[k]] = m; }
    a = b;
  }
  return { N, U, V, T, types, cnt, rank, mid, order, unitStart, docOf };
}
