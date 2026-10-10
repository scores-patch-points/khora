// attackA2.mjs -- ATTACK A, size curve WITHOUT null draws (cheap): for every atlas-PRESENT pocket, entSlope (v), sigma (pooled rank-octave profile tilt), shift, on uniform random UNIT subsamples of each half to
// N in {5000, 7500, 10000, 20000, 40000, 80000, full} tokens, 3 replicates (seeded) per size. v and sigma as in attackB2.mjs (v is posStats().entSlope itself).
//   node attackA2.mjs PART NPARTS -> A2_raw_<PART>.jsonl ; aggregate with attackA2_agg.mjs
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, prep, posStats, rngOf, seedOf, TABLE, HERE, tokensOf } from "./lib.mjs";
const [PART, NP] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1)], SIZES = [5000, 7500, 10000, 20000, 40000, 80000, Infinity], REPS = 3;
const T = TABLE(), rows = T.rows.filter((r) => r.kind === "real" && (r.status === "P+" || r.status === "P-")).filter((_, i) => i % NP === PART);
function thirds(P) { const { U, bs, unitStart, B } = P, C = [new Float64Array(B), new Float64Array(B), new Float64Array(B)];
  for (let u = 0; u < U; u++) { const a = unitStart[u], L = unitStart[u + 1] - a; if (L < 3) continue; const third = L / 3, inv = 3 / L;
    for (let i = 0; i < L; i++) { const s = i * inv, e = (i + 1) * inv, b = bs[a + i]; let t0 = Math.floor(s + 1e-12), t1 = Math.floor(e - 1e-12); if (t0 > 2) t0 = 2; if (t1 > 2) t1 = 2; if (t0 === t1) C[t0][b] += 1; else { const w0 = (t0 + 1 - s) * third; C[t0][b] += w0; C[t1][b] += 1 - w0; } } }
  return C; }
function measure(view) {
  const P = prep(view); if (P.N < 2000 || P.V < 30) return null; const ps = posStats(P); if (ps.entSlope == null) return { v: null, N: P.N, V: P.V, U: P.U };
  const C = thirds(P), B = P.B, pool = new Float64Array(B), n2 = C[2].reduce((a, b) => a + b, 0), n0 = C[0].reduce((a, b) => a + b, 0); let np = 0; for (let b = 0; b < B; b++) { pool[b] = C[0][b] + C[1][b] + C[2][b]; np += pool[b]; }
  const pb = Array.from(pool, (x) => x / np), s = pb.map((p) => (p > 0 ? -Math.log(p) : 0)); let mb = 0, sb = 0, shift = 0, cv = 0, vb = 0; for (let b = 0; b < B; b++) { mb += pb[b] * b; sb += pb[b] * s[b]; shift += (C[2][b] / n2 - C[0][b] / n0) * b; }
  for (let b = 0; b < B; b++) if (pb[b] > 0) { cv += pb[b] * (b - mb) * (s[b] - sb); vb += pb[b] * (b - mb) ** 2; }
  const cnt = new Map(); let hap = 0; for (let t = 0; t < P.V; t++) if (P.cnt[t] === 1) hap++;
  return { v: ps.entSlope, sigma: vb > 0 ? cv / vb : null, shift, N: P.N, V: P.V, U: P.U, hapaxTypeShare: hap / P.V, rare: ps.rareSlope ?? null };
}
const sub = (view, budget, tag, id) => { if (!Number.isFinite(budget)) return view; const rnd = rngOf(seedOf("attackA2", tag, id, view.which)), ix = view.units.map((_, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]), pick = []; let tok = 0; for (const [, i] of ix) { pick.push(i); tok += view.units[i].length; if (tok >= budget) break; } if (tok < budget) return null; pick.sort((a, b) => a - b); return { ...view, units: pick.map((i) => view.units[i]), docOf: pick.map((i) => view.docOf[i]) }; };
const out = fs.createWriteStream(path.join(HERE, `A2_raw_${PART}.jsonl`));
for (const r of rows) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, group: r.group, register: r.register, language: r.language, grain: r.grain, status0: r.status, mul0: r.mul, tokens: r.tokens, halfTokens: [tokensOf(H.discover.units), tokensOf(H.confirm.units)], cells: [] };
  for (const N of SIZES) for (let rep = 0; rep < (Number.isFinite(N) ? REPS : 1); rep++) {
    const c = { N: Number.isFinite(N) ? N : "full", rep };
    for (const w of ["discover", "confirm"]) { const view = sub(H[w], N, `n${N}r${rep}`, r.id); c[w] = view ? measure(view) : null; }
    o.cells.push(c);
  }
  out.write(JSON.stringify(o) + "\n"); console.error(r.id);
}
out.end();
