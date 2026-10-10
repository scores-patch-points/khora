// laws/_burst_burst.mjs — Goh-Barabasi burstiness B and memory M of the inter-arrival times of word types (one pass over the stream).
// Inter-arrival time of a type = distance in tokens between consecutive occurrences on the view's concatenated stream (documents are NOT cut: topic regimes across documents are burstiness).
export const HEAD_K = 100, MID_LO = 100, MID_HI = 1000, MIN_HEAD = 8, MIN_MID = 12, MIN_TYPES = 20;
/** Kim-Jo (2016) finite-size burstiness for c events with r = sd/mean of the c-1 inter-arrival times. r = 0 -> -1; Poisson -> ~0 at any c. */
export function bFinite(r, c) {
  const a = Math.sqrt(c + 1), b = Math.sqrt(c - 1);
  return (a * r - b) / ((a - 2) * r + b);
}
export function burstStats(P) {
  const { T, N, V, cnt, rank } = P;
  const last = new Int32Array(V).fill(-1), lastGap = new Float64Array(V);
  const n = new Float64Array(V), s1 = new Float64Array(V), s2 = new Float64Array(V);
  const mp = new Float64Array(V), sx = new Float64Array(V), sy = new Float64Array(V), sxx = new Float64Array(V), syy = new Float64Array(V), sxy = new Float64Array(V);
  for (let p = 0; p < N; p++) {
    const t = T[p];
    if (rank[t] > MID_HI) continue;
    const l = last[t];
    if (l >= 0) {
      const g = p - l, x = lastGap[t];
      n[t]++; s1[t] += g; s2[t] += g * g;
      if (x > 0) { mp[t]++; sx[t] += x; sy[t] += g; sxx[t] += x * x; syy[t] += g * g; sxy[t] += x * g; }
      lastGap[t] = g;
    }
    last[t] = p;
  }
  let bh = 0, nh = 0, bm = 0, nm = 0, mh = 0, nM = 0;
  for (let t = 0; t < V; t++) {
    const r = rank[t];
    if (r > MID_HI) continue;
    const head = r <= HEAD_K;
    if (cnt[t] < (head ? MIN_HEAD : MIN_MID)) continue;
    const mean = s1[t] / n[t], sd = Math.sqrt(Math.max(0, s2[t] / n[t] - mean * mean)), B = bFinite(sd / mean, cnt[t]);
    if (head) { bh += B; nh++; } else { bm += B; nm++; }
    if (head && mp[t] >= MIN_HEAD) {
      const k = mp[t], ex = sx[t] / k, ey = sy[t] / k, vx = sxx[t] / k - ex * ex, vy = syy[t] / k - ey * ey;
      if (vx > 1e-12 && vy > 1e-12) { mh += (sxy[t] / k - ex * ey) / Math.sqrt(vx * vy) + 1 / k; nM++; } // +1/k: expectation of minus the lag-1 sample correlation of k independent pairs (small-sample bias)
    }
  }
  return { burstB: nh >= MIN_TYPES ? bh / nh : null, burstBmid: nm >= MIN_TYPES ? bm / nm : null, burstM: nM >= MIN_TYPES ? mh / nM : null };
}
