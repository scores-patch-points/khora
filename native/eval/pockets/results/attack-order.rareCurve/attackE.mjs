// attackE.mjs -- ATTACK E (is it a U?). The law says "rare words sit at the EDGES of units (U shape)". rareCurve = Sxq / sqrt(Sxx Sqq) and Sxq = SxqL + SxqR exactly (the within-unit deviations dx sum to zero), where L / R are the
// contributions of the tokens left / right of the unit centre. cL = SxqL / sqrt(Sxx Sqq), cR likewise, rareCurve = cL + cR. For every real pocket and both halves: v, cL, cR with their own within-unit-shuffle nulls (same 10 atlas draws),
// z, status of each side (PRESENT = |z| >= 4 in both halves, one sign); and a DOCUMENT BOOTSTRAP (500 resamples of documents within each half, seeded) of the pocket value (mean of the half values) and of cL, cR.
//   node attackE.mjs PART NPARTS [ids]  -> E_raw_<PART>.jsonl
import fs from "node:fs";
import path from "node:path";
import { loadCached, atlasOf, halves, rngOf, seedOf, prep, rcSums, rcValue, shuffledXs, statusOf, HERE } from "./lib.mjs";
const [PART, NP, FILTER] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1), process.argv[4]], BOOT = 500;
const T = JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8")).rows.filter((r) => r.status !== "nodata" && (!FILTER || FILTER.split(",").includes(r.id)));
const mine = T.filter((_, i) => i % NP === PART);
const sd = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return [m, Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1))]; };
const parts = (S) => { if (S.nU < 300 || S.nTok < 2000) return null; const d = Math.sqrt(S.Sxx * S.Sqq); return d > 0 ? { v: S.Sxq / d, cL: S.SxqL / d, cR: S.SxqR / d } : null; };
function halfCell(view, id, which) {
  const P = prep(view); if (P.N < 2000 || P.V < 30) return null;
  const obs = parts(rcSums(P.xs, P.unitStart, P.U)), nul = { v: [], cL: [], cR: [] };
  for (let k = 0; k < 10; k++) { const q = parts(rcSums(shuffledXs(P, seedOf(id, which, "order", "within-unit", k)), P.unitStart, P.U)); if (q) for (const key of ["v", "cL", "cR"]) nul[key].push(q[key]); }
  const o = { N: P.N, U: P.U };
  for (const key of ["v", "cL", "cR"]) { const [m, s] = sd(nul[key]); o[key] = obs[key]; o[key + "Z"] = s > 0 ? (obs[key] - m) / s : null; }
  // per-document sums for the bootstrap (documents are contiguous runs of units, docOf renumbered 0..D-1)
  const docs = [], docStart = [];
  for (let u = 0; u < P.U; u++) if (u === 0 || view.docOf[u] !== view.docOf[u - 1]) docStart.push(u);
  docStart.push(P.U);
  for (let d = 0; d + 1 < docStart.length; d++) {
    // rcSums over [docStart[d], docStart[d+1]) : temporary unitStart view
    const S = rcSums(P.xs, P.unitStart, docStart[d + 1], docStart[d]); docs.push(S);
  }
  o.docs = docs; return o;
}
function boot(hd, hc, id) {
  const rnd = rngOf(seedOf("attackE-rc", id)), out = { v: [], cL: [], cR: [] };
  for (let b = 0; b < BOOT; b++) {
    const vals = { v: [], cL: [], cR: [] };
    for (const H of [hd, hc]) {
      const acc = { Sxx: 0, Sxq: 0, Sqq: 0, SxqL: 0, SxqR: 0, nU: 0, nTok: 0 }, D = H.docs.length;
      for (let k = 0; k < D; k++) { const S = H.docs[Math.floor(rnd() * D)]; for (const key of Object.keys(acc)) acc[key] += S[key]; }
      const q = parts(acc); if (q) for (const key of ["v", "cL", "cR"]) vals[key].push(q[key]);
    }
    if (vals.v.length === 2) for (const key of ["v", "cL", "cR"]) out[key].push((vals[key][0] + vals[key][1]) / 2);
  }
  const ci = {};
  for (const key of ["v", "cL", "cR"]) { const s = out[key].slice().sort((a, b) => a - b), n = s.length; ci[key] = n ? [s[Math.floor(0.025 * n)], s[Math.min(n - 1, Math.floor(0.975 * n))]] : null; }
  return ci;
}
const outS = fs.createWriteStream(path.join(HERE, `E_raw_${PART}.jsonl`));
for (const r of mine) {
  const p = loadCached(r.id), H = halves(p), D = halfCell(H.discover, r.id, "discover"), C = halfCell(H.confirm, r.id, "confirm");
  const o = { id: r.id, group: r.group, register: r.register, grain: r.grain, status0: r.status, v0: r.v };
  if (D && C) {
    const a = atlasOf(r.id).halves; o.baseMatchesAtlas = D.v === a.discover["order.rareCurve"].v && C.v === a.confirm["order.rareCurve"].v;
    for (const key of ["v", "cL", "cR"]) { o[key] = [D[key], C[key]]; o[key + "Z"] = [D[key + "Z"], C[key + "Z"]]; o[key + "Status"] = statusOf({ z: D[key + "Z"] }, { z: C[key + "Z"] }); }
    o.ci = boot(D, C, r.id); o.docs = [D.docs.length, C.docs.length];
  }
  outS.write(JSON.stringify(o) + "\n"); console.error(`${r.id} done`);
}
outS.end();
