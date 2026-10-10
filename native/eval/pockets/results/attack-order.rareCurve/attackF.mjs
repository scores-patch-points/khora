// attackF.mjs -- ATTACK F (unit-length strata). Does the sign follow the pocket CLASS or the UNIT LENGTH? For every real pocket and both halves, rareCurve is recomputed restricted to the units whose length L falls in a stratum
// (3-4, 5-6, 7-9, 10-14, 15-24, 25+ tokens): same x (ln mid-rank of the whole half), same sums as the atlas statistic but over the stratum's units only, same 10 atlas within-unit shuffle draws (a within-unit shuffle keeps each unit's length,
// so its null mean is 0 in every stratum). A stratum cell needs >= 300 units and >= 2000 tokens in the half (the atlas gate). node attackF.mjs PART NPARTS [ids] -> F_raw_<PART>.jsonl
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, seedOf, prep, shuffledXs, statusOf, HERE } from "./lib.mjs";
const [PART, NP, FILTER] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1), process.argv[4]];
const T = JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8")).rows.filter((r) => r.status !== "nodata" && (!FILTER || FILTER.split(",").includes(r.id)));
const mine = T.filter((_, i) => i % NP === PART);
const STRATA = [[3, 4], [5, 6], [7, 9], [10, 14], [15, 24], [25, 1e9]];
function sums(xs, us, U, lo, hi) {
  let Sxx = 0, Sxq = 0, Sqq = 0, nU = 0, nTok = 0;
  for (let u = 0; u < U; u++) {
    const a = us[u], L = us[u + 1] - a;
    if (L < lo || L > hi || L < 3) continue;
    let xm = 0; for (let i = 0; i < L; i++) xm += xs[a + i]; xm /= L;
    let sr2 = 0, sr4 = 0;
    for (let i = 0; i < L; i++) { const r = i / (L - 1) - 0.5, r2 = r * r, dx = xs[a + i] - xm; Sxx += dx * dx; Sxq += dx * r2; sr2 += r2; sr4 += r2 * r2; }
    Sqq += sr4 - (sr2 * sr2) / L; nU++; nTok += L;
  }
  return nU < 300 || nTok < 2000 || !(Sxx > 1e-9 * nTok) || !(Sqq > 1e-9 * nTok) ? null : { v: Sxq / Math.sqrt(Sxx * Sqq), nU, nTok };
}
const sd = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return [m, Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1))]; };
const outS = fs.createWriteStream(path.join(HERE, `F_raw_${PART}.jsonl`));
for (const r of mine) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, group: r.group, register: r.register, grain: r.grain, status0: r.status, v0: r.v, mul: r.mul, strata: {} };
  const res = {};
  for (const w of ["discover", "confirm"]) {
    const P = prep(H[w]); if (P.N < 2000 || P.V < 30) continue;
    const nulls = []; for (let k = 0; k < 10; k++) nulls.push(shuffledXs(P, seedOf(r.id, w, "order", "within-unit", k)));
    STRATA.forEach(([lo, hi], si) => {
      const obs = sums(P.xs, P.unitStart, P.U, lo, hi); if (!obs) return;
      const nv = nulls.map((xs) => sums(xs, P.unitStart, P.U, lo, hi)?.v).filter(Number.isFinite), [m, s] = sd(nv);
      (res[si] ||= {})[w] = { v: obs.v, z: s > 0 ? (obs.v - m) / s : null, nU: obs.nU, nTok: obs.nTok };
    });
  }
  for (const [si, d] of Object.entries(res)) if (d.discover && d.confirm) o.strata[si] = { D: d.discover, C: d.confirm, v: (d.discover.v + d.confirm.v) / 2, status: statusOf(d.discover, d.confirm) };
  outS.write(JSON.stringify(o) + "\n"); console.error(`${r.id} done`);
}
outS.end();
