// lib.mjs -- shared helpers of the ATTACK on para.formulaCov (new file; imports repo modules read-only, edits nothing).
// formulaCov is computed by the repo's own bagStats(prep(view)) so that every number is the atlas statistic; null draws use the atlas seeds
// seedOf(id, which, "para", "within-unit", k) and nullView(view, "within-unit", seed).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256, validate } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_para_prep.mjs";
import { bagStats } from "../../laws/_para_bag.mjs";
export { halves, nullView, seedOf, rngOf, sha256, validate };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad/cache-dl";
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
export const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const MATRIX = () => readJson(path.join(HERE, "../atlas-matrix.json"));
export const atlasPocket = (id) => readJson(path.join(HERE, "../atlas", `${id}.json`));
export const f = (x, d = 3) => (x == null || !Number.isFinite(x) ? "NA" : Number(x).toFixed(d));
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);
const R = (x) => (Number.isFinite(x) ? Math.round(x * 1099511627776) / 1099511627776 : null);
/** the atlas statistic on a view {units, docOf}: the repo's bagStats formulaCov, rounded exactly as para.compute rounds. */
export const fcov = (view) => { if (view.units.length < 2) return null; return R(bagStats(prep(view)).formulaCov); };
/** all bag stats (refrain, dupShare, formulaCov, tmplReuse) rounded as in the atlas */
export const bag = (view) => { const o = bagStats(prep(view)); return { refrain: R(o.refrain), dupShare: R(o.dupShare), formulaCov: R(o.formulaCov), tmplReuse: R(o.tmplReuse) }; };
export const meanSd = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** One half: observed v, atlas-style z from `draws` within-unit shuffles (atlas seeds k = 0..draws-1 when tag === pocket id), exact tail p with add-one, nullMean/Sd. */
export function cell(view, id, which, draws = 10, seedTag = "para", statFn = fcov) {
  const v = statFn(view), xs = [];
  for (let k = 0; k < draws; k++) { const x = statFn(nullView(view, "within-unit", seedOf(id, which, seedTag, "within-unit", k))); if (Number.isFinite(x)) xs.push(x); }
  if (!Number.isFinite(v) || xs.length < 3) return { v: Number.isFinite(v) ? v : null, nullMean: null, nullSd: null, z: null, p: null, n: xs.length };
  const { m, sd } = meanSd(xs), ge = xs.filter((x) => x >= v).length;
  return { v, nullMean: m, nullSd: sd, z: sd > 0 ? (v - m) / sd : null, p: (1 + ge) / (1 + xs.length), n: xs.length };
}
/** PRESENT+ by the protocol (|z| >= 4 both halves, same sign), AMBIGUOUS / ABSENT / UNDEF; `shifted` = both halves v above the null mean (any sd). */
export function status(cD, cC) {
  const zd = cD.z, zc = cC.z;
  if (zd == null || zc == null) {
    const ab = (c) => c.v != null && c.nullMean != null && c.v > c.nullMean;
    const eq = (c) => c.v != null && c.nullMean != null && c.v <= c.nullMean;
    return { s: "UNDEF", shifted: ab(cD) && ab(cC), notAbove: eq(cD) || eq(cC) };
  }
  if (zd >= 4 && zc >= 4) return { s: "P+" }; if (zd <= -4 && zc <= -4) return { s: "P-" };
  if (Math.abs(zd) < 2 && Math.abs(zc) < 2) return { s: "A" };
  return { s: "M" };
}
/** deterministic doc-level subsample to a token budget: documents taken in sha256(id:size:doc) order until >= budget tokens, then restored to original order. */
export function subsampleDocs(p, budget, tag = "sz") {
  const docs = new Map(); p.units.forEach((u, k) => { const d = p.docOf[k]; if (!docs.has(d)) docs.set(d, []); docs.get(d).push(k); });
  const order = [...docs.keys()].sort((a, b) => (sha256(`${p.id}:${tag}:${a}`) < sha256(`${p.id}:${tag}:${b}`) ? -1 : 1));
  const keep = new Set(); let t = 0;
  for (const d of order) { if (t >= budget) break; keep.add(d); for (const k of docs.get(d)) t += p.units[k].length; }
  const units = [], docOf = []; p.units.forEach((u, k) => { if (keep.has(p.docOf[k])) { units.push(u); docOf.push(p.docOf[k]); } });
  return { ...p, units, docOf };
}
