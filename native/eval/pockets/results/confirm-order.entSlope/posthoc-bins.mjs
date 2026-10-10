// results/confirm-order.entSlope/posthoc-bins.mjs — POST-HOC robustness probe (not pre-registered, does not change the verdict): is the sign of entSlope an artefact of WHERE the power-of-two rank-bin edges fall?
// The statistic bins types by floor(log2 mid-rank); every hapax type shares one mid-rank (ties), so all hapaxes land in ONE bin whose index depends on whether that mid-rank sits just under or just over a power of two.
// Variants (same halves, same fractional thirds, same Miller-Madow, same 10 within-unit null draws and seeds as the registered run; only the bin map changes):
//   c1.00 registered | c1.25, c1.50, c1.75: bin = floor(log2(mid-rank * c)) (edges shifted) | fine: bin = floor(2 * log2(mid-rank)) (half-octave bins)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves, nullView, seedOf } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_order_prep.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const src = fs.readFileSync(path.join(HERE, "confirm.mjs"), "utf8"), PRE = JSON.parse(src.match(/export const PREREG = (\{[\s\S]*?\n\});\n\/\/ ===== END/)[1]);
const entropyMM = (c) => { let n = 0, k = 0; for (const x of c) if (x > 0) { n += x; k++; } if (n <= 0) return null; let h = 0; for (const x of c) if (x > 0) h -= (x / n) * Math.log(x / n); return h + (k - 1) / (2 * n); };
function entSlopeBinned(view, binOf) {
  const P = prep(view); if (P.N < 2000 || P.V < 30) return null;
  const { U, T, mid, unitStart } = P, bt = new Int32Array(P.V); let B = 1;
  for (let t = 0; t < P.V; t++) { bt[t] = binOf(mid[t]); if (bt[t] + 1 > B) B = bt[t] + 1; }
  const C = [new Float64Array(B), new Float64Array(B), new Float64Array(B)]; let nTok = 0, nU = 0;
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a; if (L < 3) continue; const third = L / 3, inv = 3 / L;
    for (let i = 0; i < L; i++) {
      const s = i * inv, e = (i + 1) * inv, b = bt[T[a + i]]; let t0 = Math.floor(s + 1e-12), t1 = Math.floor(e - 1e-12); if (t0 > 2) t0 = 2; if (t1 > 2) t1 = 2;
      if (t0 === t1) C[t0][b] += 1; else { const w0 = (t0 + 1 - s) * third; C[t0][b] += w0; C[t1][b] += 1 - w0; }
    }
    nTok += L; nU++;
  }
  if (nU < 300 || nTok < 2000) return null;
  const pool = new Float64Array(B); for (let b = 0; b < B; b++) pool[b] = C[0][b] + C[1][b] + C[2][b];
  const h0 = entropyMM(C[0]), h2 = entropyMM(C[2]), hp = entropyMM(pool); return h0 != null && h2 != null && hp > 0 ? (h2 - h0) / hp : null;
}
const VARIANTS = { "c1.00": (m) => Math.floor(Math.log2(m) + 1e-12), "c1.25": (m) => Math.floor(Math.log2(m * 1.25) + 1e-12), "c1.50": (m) => Math.floor(Math.log2(m * 1.5) + 1e-12), "c1.75": (m) => Math.floor(Math.log2(m * 1.75) + 1e-12), fine: (m) => Math.floor(2 * Math.log2(m) + 1e-12) };
const zOf = (v, xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)); return v == null || !(sd > 0) ? null : (v - m) / sd; };
const stat = (a, b) => (a == null || b == null ? "UNDEFINED" : a >= 4 && b >= 4 ? "PRESENT+" : a <= -4 && b <= -4 ? "PRESENT-" : Math.abs(a) < 2 && Math.abs(b) < 2 ? "ABSENT" : "AMBIGUOUS");
const ids = (process.argv[2] ?? PRE.siblings.filter((s) => s.scored && s.role !== "control").map((s) => s.id).join(",")).split(","), out = {};
for (const id of ids) {
  const sp = PRE.siblings.find((s) => s.id === id), p = (await (await import(pathToFileURL(path.join(ROOT, sp.loader)).href)).load([id])).find((x) => x.id === id), H = halves(p); out[id] = { expect: sp.expect };
  for (const [name, binOf] of Object.entries(VARIANTS)) {
    const z = {}, v = {};
    for (const which of ["discover", "confirm"]) {
      const view = H[which], obs = entSlopeBinned(view, binOf), xs = [];
      for (let k = 0; k < PRE.draws; k++) xs.push(entSlopeBinned(nullView(view, "within-unit", seedOf(p.id, which, "order", "within-unit", k)), binOf));
      v[which] = obs; z[which] = zOf(obs, xs);
    }
    out[id][name] = { status: stat(z.discover, z.confirm), zD: +z.discover?.toFixed(1), zC: +z.confirm?.toFixed(1), vD: +v.discover?.toFixed(4), vC: +v.confirm?.toFixed(4) };
  }
  console.error(id, Object.entries(out[id]).filter(([k]) => k !== "expect").map(([k, x]) => `${k}:${x.status}(${x.zD}/${x.zC})`).join("  "));
}
fs.writeFileSync(path.join(HERE, "posthoc-bins.json"), JSON.stringify(out, null, 1) + "\n");
