// lib.mjs -- shared helpers of the ATTACK on order.depLen (new file; imports the repo's own prep/halves/nullView, edits nothing).
// depLen is a function of the BIN sequence of each unit only (bin = floor(log2 mid-rank of the token's type in the view)), so every variant below builds a view, calls the repo's prep(view)
// (laws/_order_prep.mjs, unchanged) to get bins, and evaluates depLen on the bins with a copy of the loop in laws/_order_pair.mjs (checked bit-for-bit against the atlas cells by check-atlas.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256 } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_order_prep.mjs";
export { halves, nullView, seedOf, rngOf, sha256, prep };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad/cache-dl";
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
export const TABLE = () => JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8")).rows;
export const f = (x, d = 3) => (x == null || !Number.isFinite(x) ? "NA" : Number(x).toFixed(d));
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);

/** depLen pieces over bin-unit arrays (arrays of small ints). Units < 3 skipped. Returns {v, obs, exp, adjObs, adjExp, n3}.
 *  v = ln(obs/exp) with obs = sum of gaps between successive same-bin tokens, exp = sum (m-1)(L+1)/(m+1): EXACTLY the loop of laws/_order_pair.mjs.
 *  adjObs = number of same-bin pairs at distance 1; adjExp = sum m(m-1)/L (exact expectation under the within-unit shuffle). */
export function depParts(binUnits, B = 40) {
  const last = new Int32Array(B).fill(-1), gs = new Float64Array(B), ms = new Int32Array(B);
  let obs = 0, exp = 0, adjObs = 0, adjExp = 0, n3 = 0, gap1 = 0;
  for (const u of binUnits) {
    const L = u.length;
    if (L < 3) continue;
    n3 += L;
    for (let i = 0; i < L; i++) {
      const b = u[i];
      if (last[b] >= 0) { gs[b] += i - last[b]; if (i - last[b] === 1) gap1++; }
      last[b] = i; ms[b]++;
    }
    for (let b = 0; b < B; b++) {
      if (ms[b] >= 2) { obs += gs[b]; exp += ((ms[b] - 1) * (L + 1)) / (ms[b] + 1); }
      if (ms[b] >= 2) adjExp += (ms[b] * (ms[b] - 1)) / L;
      last[b] = -1; gs[b] = 0; ms[b] = 0;
    }
  }
  adjObs = gap1;
  return { v: exp > 0 && obs > 0 ? Math.log(obs / exp) : null, obs, exp, adjObs, adjExp, n3 };
}
/** bin sequences of a token view: units as arrays of bin ids (plain arrays, so nullView can shuffle them), via the repo's prep(). */
export function binUnits(view) {
  const P = prep(view), out = [];
  for (let u = 0; u < P.U; u++) out.push(Array.from(P.bs.subarray(P.unitStart[u], P.unitStart[u + 1])));
  return { bu: out, P };
}
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** depLen cell of a view: v, nullMean, nullSd, z over `draws` within-unit shuffles. The shuffles use nullView on the bin units with the atlas seeds seedOf(seedId, which, "order", "within-unit", k)
 *  (a within-unit shuffle consumes the rng exactly as on the token units, so for an unmodified view the draws are the atlas draws). */
export function depCell(view, draws = 10, seedId = view.id, which = view.which) {
  const { bu, P } = binUnits(view), B = P.B, v = depParts(bu, B).v, xs = [];
  for (let k = 0; k < draws; k++) {
    const nv = nullView({ units: bu }, "within-unit", seedOf(seedId, which, "order", "within-unit", k));
    const x = depParts(nv.units, B).v; if (Number.isFinite(x)) xs.push(x);
  }
  const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length, V: P.V, N: P.N };
}
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return "undef";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
export const viewOf = (units, docOf, id, which) => ({ id, which, units, docOf });
export const meanLen = (units) => tokensOf(units) / Math.max(1, units.length);
