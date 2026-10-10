// laws/_order_pos.mjs — POSITION statistics of the "order" family: rareSlope, rareCurve, initDev, finalDev, entSlope, entCurv.  One pass over the units of >= 3 tokens.
// Every statistic is centred inside each unit, so its expectation under the within-unit shuffle is 0 for any unit-length distribution (see the header of order.mjs).
const entropy = (c) => {
  let n = 0, k = 0;
  for (let b = 0; b < c.length; b++) if (c[b] > 0) { n += c[b]; k++; }
  if (n <= 0) return null;
  let h = 0;
  for (let b = 0; b < c.length; b++) if (c[b] > 0) h -= (c[b] / n) * Math.log(c[b] / n);
  return h + (k - 1) / (2 * n); // Miller-Madow
};

export function posStats(P) {
  const { U, xs, bs, unitStart, sdx, B } = P;
  const C = [new Float64Array(B), new Float64Array(B), new Float64Array(B)], out = {};
  let Sxy = 0, Sxx = 0, Srr = 0, Sxq = 0, Sqq = 0, nTok = 0, nU = 0, sInit = 0, sFinal = 0;
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a;
    if (L < 3) continue;
    let xm = 0;
    for (let i = 0; i < L; i++) xm += xs[a + i];
    xm /= L;
    let sr2 = 0, sr4 = 0;
    const third = L / 3, inv = 3 / L;
    for (let i = 0; i < L; i++) {
      const r = i / (L - 1) - 0.5, r2 = r * r, dx = xs[a + i] - xm;
      Sxy += dx * r; Sxx += dx * dx; Sxq += dx * r2; sr2 += r2; sr4 += r2 * r2;
      // fractional assignment of token i (interval [i/L, (i+1)/L) of the unit) to the three thirds: every unit puts exactly L/3 token mass in each third
      const s = i * inv, e = (i + 1) * inv, b = bs[a + i];
      let t0 = Math.floor(s + 1e-12), t1 = Math.floor(e - 1e-12);
      if (t0 > 2) t0 = 2; if (t1 > 2) t1 = 2;
      if (t0 === t1) C[t0][b] += 1;
      else { const w0 = (t0 + 1 - s) * third; C[t0][b] += w0; C[t1][b] += 1 - w0; }
    }
    Srr += sr2; Sqq += sr4 - (sr2 * sr2) / L;
    sInit += xs[a] - xm; sFinal += xs[a + L - 1] - xm; nTok += L; nU++;
  }
  if (nU < 300 || nTok < 2000) return out;
  const eps = 1e-9 * nTok; // guards against floating-point residue when x is (nearly) constant, e.g. every type tied
  if (Sxx > eps && Srr > 0) out.rareSlope = Sxy / Math.sqrt(Sxx * Srr);
  if (Sxx > eps && Sqq > eps) out.rareCurve = Sxq / Math.sqrt(Sxx * Sqq);
  if (sdx > 1e-9) { out.initDev = sInit / nU / sdx; out.finalDev = sFinal / nU / sdx; }
  const pool = new Float64Array(B);
  for (let b = 0; b < B; b++) pool[b] = C[0][b] + C[1][b] + C[2][b];
  const H0 = entropy(C[0]), H1 = entropy(C[1]), H2 = entropy(C[2]), Hp = entropy(pool);
  if (H0 != null && H1 != null && H2 != null && Hp > 0) { out.entSlope = (H2 - H0) / Hp; out.entCurv = (H1 - (H0 + H2) / 2) / Hp; }
  return out;
}
