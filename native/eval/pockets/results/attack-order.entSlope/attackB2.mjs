// attackB2.mjs -- ATTACK B (extra rivals computed from the text, outside the atlas battery). entSlope = (H(last third) - H(first third)) / H(pooled), H over the log2-rank-bin distribution.
// First-order identity: moving mass d from bin i to bin j changes H by d (ln p_i - ln p_j) (it RISES when mass goes to a SPARSER bin). Hence with s_b = -ln pbar_b (pooled bin surprisal), D_b = p_last,b - p_first,b:
//    Lin   = sum_b D_b s_b / Hp                       (first-order term of entSlope; no Miller-Madow)
//    shift = sum_b D_b b                              (signed mean-bin-index shift last minus first: a rarity-gradient statistic like rareSlope)
//    sigma = Cov_pbar(b, s_b) / Var_pbar(b)           (tilt of the POOLED bin profile: > 0 rarer octaves hold less mass (steep Zipf), < 0 rarer octaves hold MORE mass (flat / hapax-heavy profile))
//    Pred  = sigma * shift / Hp                       (the two cheap ingredients multiplied)
// For every real non-thin pocket and both halves; pocket-level = mean of halves (as the atlas).  node attackB2.mjs [part nparts] -> B2_<part>.json   (aggregate with attackB2_agg.mjs)
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, prep, posStats, TABLE, HERE } from "./lib.mjs";
const [PART, NP] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1)];
const T = TABLE(), rows = T.rows.filter((r) => r.kind === "real" && !r.thin && r.status !== "nodata").filter((_, i) => i % NP === PART);
function thirds(P) { // copy of the fractional-third assignment of laws/_order_pos.mjs (units >= 3 tokens), returns C[0..2][bin]
  const { U, bs, unitStart, B } = P, C = [new Float64Array(B), new Float64Array(B), new Float64Array(B)];
  for (let u = 0; u < U; u++) { const a = unitStart[u], L = unitStart[u + 1] - a; if (L < 3) continue; const third = L / 3, inv = 3 / L;
    for (let i = 0; i < L; i++) { const s = i * inv, e = (i + 1) * inv, b = bs[a + i]; let t0 = Math.floor(s + 1e-12), t1 = Math.floor(e - 1e-12); if (t0 > 2) t0 = 2; if (t1 > 2) t1 = 2;
      if (t0 === t1) C[t0][b] += 1; else { const w0 = (t0 + 1 - s) * third; C[t0][b] += w0; C[t1][b] += 1 - w0; } } }
  return C;
}
const ent = (c) => { let n = 0, k = 0; for (const x of c) if (x > 0) { n += x; k++; } let h = 0; for (const x of c) if (x > 0) h -= (x / n) * Math.log(x / n); return { h, mm: h + (k - 1) / (2 * n), n }; };
function half(view) {
  const P = prep(view); if (P.N < 2000 || P.V < 30) return null; const C = thirds(P), B = P.B, pool = new Float64Array(B); for (let b = 0; b < B; b++) pool[b] = C[0][b] + C[1][b] + C[2][b];
  const E0 = ent(C[0]), E2 = ent(C[2]), Ep = ent(pool), n0 = E0.n, n2 = E2.n, np = Ep.n; let Lin = 0, shift = 0, mb = 0, sb = 0, vb = 0, cv = 0;
  const pb = Array.from(pool, (x) => x / np), s = pb.map((p) => (p > 0 ? -Math.log(p) : 0));
  for (let b = 0; b < B; b++) { const D = C[2][b] / n2 - C[0][b] / n0; Lin += D * s[b]; shift += D * b; mb += pb[b] * b; sb += pb[b] * s[b]; }
  for (let b = 0; b < B; b++) { if (pb[b] > 0) { cv += pb[b] * (b - mb) * (s[b] - sb); vb += pb[b] * (b - mb) ** 2; } }
  const sigma = vb > 0 ? cv / vb : null, Hp = Ep.mm, ent_ = (E2.mm - E0.mm) / Hp;
  const top = pb.slice(0, 4).reduce((a, b) => a + b, 0), rare = pb[B - 1] + pb[B - 2];
  const posS = posStats(P);
  return { entSlope: posS.entSlope, entRe: ent_, Lin: Lin / Hp, shift, sigma, Pred: sigma != null ? (sigma * shift) / Hp : null, Hp, B, headMass: top, tailMass2: rare, pb };
}
const out = [];
for (const r of rows) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, halves: {} };
  for (const w of ["discover", "confirm"]) { const h = half(H[w]); if (h) { h.maxDiffRecomputed = Math.abs(h.entSlope - h.entRe); o.halves[w] = h; } }
  out.push(o);
}
fs.writeFileSync(path.join(HERE, `B2_${PART}.json`), JSON.stringify(out));
console.error(`part ${PART}: ${out.length} pockets`);
