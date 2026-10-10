// attackA.mjs -- ATTACK A (size and tokenisation). For every PRESENT pocket of order.entSlope, recompute the atlas cell (both halves, 10 within-unit null draws, atlas seeds) on deterministic variants of each half:
//   base        the atlas view (verification: must equal the atlas cell exactly)
//   tok7500     uniform random UNIT subsample to 7,500 tokens per half (2 independent replicates r0, r1)
//   tok20000    the same to 20,000 tokens (only when both halves have >= 20,000)
//   len10full   tilted unit subsample (weight len^lambda, Efraimidis-Spirakis keys, lambda by bisection) so that the MEAN UNIT LENGTH is 10 (+-10%), budget = min(half tokens/2, 50,000) tokens
//   tok7500len10 both at once: 7,500 tokens AND mean unit length 10 (2 replicates)
//   drop1pct    delete the rarest 1% of types of the half (ascending count, ties by sha256 of the type string), tokens removed from their units, empty units dropped
//   dropHapax   delete every type with count 1 in the half
//   trunc5      alternative tokenisation: every token cut to its first 5 code points (merges inflected / compounded variants)
//   node attackA.mjs PART NPARTS [idFilterCSV]  -> A_raw_<PART>.jsonl (one JSON line per pocket)
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, rngOf, seedOf, sha256, pocketCell, cell, statusOf, prep, tokensOf, HERE, TABLE } from "./lib.mjs";
const [PART, NP, FILTER] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1), process.argv[4]];
const T = TABLE(), rows = T.rows.filter((r) => r.kind === "real" && (r.status === "P+" || r.status === "P-") && (!FILTER || FILTER.split(",").includes(r.id)));
const mine = rows.filter((_, i) => i % NP === PART), MSTAR = 10;
const sub = (view, ix) => ({ ...view, units: ix.map((i) => view.units[i]), docOf: ix.map((i) => view.docOf[i]) });
/** units picked in Efraimidis-Spirakis order for weights len^lambda until the token budget is reached; returns sorted index list */
function pick(lens, keysU, lambda, budget) {
  const order = lens.map((L, i) => [Math.log(keysU[i]) / Math.pow(L, lambda), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const ix = []; let tok = 0;
  for (const [, i] of order) { ix.push(i); tok += lens[i]; if (tok >= budget) break; }
  return { ix: ix.sort((a, b) => a - b), tok };
}
function subsample(view, budget, mstar, tag, id) {
  const lens = view.units.map((u) => u.length), tot = lens.reduce((a, b) => a + b, 0);
  if (tot < budget) return null;
  const rnd = rngOf(seedOf("attackA", tag, id, view.which)), keysU = lens.map(() => Math.max(1e-12, rnd()));
  if (mstar == null) return { view: sub(view, pick(lens, keysU, 0, budget).ix), lambda: 0 };
  let lo = -12, hi = 12, best = null;
  const meanOf = (lam) => { const r = pick(lens, keysU, lam, budget); return { r, m: r.tok / r.ix.length }; };
  for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2, { r, m } = meanOf(mid); best = { lam: mid, r, m }; if (Math.abs(m / mstar - 1) < 0.02) break; if (m < mstar) lo = mid; else hi = mid; }
  if (Math.abs(best.m / mstar - 1) > 0.1) return { unreachable: true, achieved: best.m };
  return { view: sub(view, best.r.ix), lambda: best.lam };
}
function dropTypes(view, pred) {
  const cnt = new Map(); for (const u of view.units) for (const w of u) cnt.set(w, (cnt.get(w) || 0) + 1);
  const drop = pred(cnt), units = [], docOf = [];
  view.units.forEach((u, k) => { const v = u.filter((w) => !drop.has(w)); if (v.length) { units.push(v); docOf.push(view.docOf[k]); } });
  return { view: { ...view, units, docOf }, dropped: drop.size, V: cnt.size };
}
const drop1pct = (cnt) => { const ts = [...cnt.entries()].map(([w, c]) => [c, sha256(w), w]).sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1)); return new Set(ts.slice(0, Math.max(1, Math.ceil(0.01 * ts.length))).map((x) => x[2])); };
const dropHap = (cnt) => new Set([...cnt.entries()].filter(([, c]) => c === 1).map(([w]) => w));
const trunc5 = (view) => ({ ...view, units: view.units.map((u) => u.map((w) => Array.from(w).slice(0, 5).join(""))) });
const mulOf = (v) => tokensOf(v.units) / v.units.length;
function evalVariant(H, name, builder, id) {
  const res = {};
  for (const w of ["discover", "confirm"]) {
    const b = builder(H[w], w); if (!b) return { skipped: "too small" }; if (b.unreachable) return { skipped: "unreachable", achieved: b.achieved };
    const c = cell(b.view, { stats: ["entSlope", "rareSlope", "entCurv"], seedId: id, which: w });
    if (!c) return { skipped: "undefined (N<2000 or V<30)" };
    res[w] = { v: c.entSlope.v, z: c.entSlope.z, N: c.N, V: c.V, U: c.U, mul: mulOf(b.view), lambda: b.lambda ?? null, dropped: b.dropped ?? null, rare: c.rareSlope.v, curv: c.entCurv.v };
  }
  res.status = statusOf({ z: res.discover.z }, { z: res.confirm.z }); res.v = (res.discover.v + res.confirm.v) / 2; return res;
}
const out = fs.createWriteStream(path.join(HERE, `A_raw_${PART}.jsonl`));
for (const r of mine) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, group: r.group, register: r.register, language: r.language, grain: r.grain, status0: r.status, v0: r.v["order.entSlope"], mul0: r.mul, tokens: r.tokens, variants: {} }, V = o.variants;
  V.base = evalVariant(H, "base", (v) => ({ view: v }), r.id);
  const a = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${r.id}.json`), "utf8")).halves;
  V.base.maxAbsDiffToAtlas = Math.max(...["discover", "confirm"].map((w) => Math.abs(a[w]["order.entSlope"].z - V.base[w].z) + Math.abs(a[w]["order.entSlope"].v - V.base[w].v)));
  for (const rep of [0, 1]) {
    V["tok7500_r" + rep] = evalVariant(H, "tok7500", (v) => subsample(v, 7500, null, "tok7500r" + rep, r.id), r.id);
    V["tok7500len10_r" + rep] = evalVariant(H, "tok7500len10", (v) => subsample(v, 7500, MSTAR, "tok7500len10r" + rep, r.id), r.id);
  }
  V.tok20000 = evalVariant(H, "tok20000", (v) => subsample(v, 20000, null, "tok20000", r.id), r.id);
  V.len10full = evalVariant(H, "len10full", (v) => subsample(v, Math.min(Math.floor(tokensOf(v.units) / 2), 50000), MSTAR, "len10full", r.id), r.id);
  V.drop1pct = evalVariant(H, "drop1pct", (v) => dropTypes(v, drop1pct), r.id);
  V.dropHapax = evalVariant(H, "dropHapax", (v) => dropTypes(v, dropHap), r.id);
  V.trunc5 = evalVariant(H, "trunc5", (v) => ({ view: trunc5(v) }), r.id);
  out.write(JSON.stringify(o) + "\n");
  console.error(`${r.id} ${r.status} base-diff ${V.base.maxAbsDiffToAtlas.toExponential(1)} tok7500 ${V.tok7500_r0.status} len10 ${V.len10full.status ?? V.len10full.skipped} drop1 ${V.drop1pct.status} hap ${V.dropHapax.status} tr5 ${V.trunc5.status}`);
}
out.end();
