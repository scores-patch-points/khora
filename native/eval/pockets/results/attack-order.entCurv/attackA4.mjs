// attackA4.mjs -- ATTACK A (continued): equal size / equal mean unit length with the pocket's OWN RANKS HELD FIXED, all 391 real pockets.
// attackA.mjs re-derives frequency ranks (hence the rank bins) on every subsample; the unit-length strata of A3 hold ranks fixed but fix the length instead of the MEAN. This script selects units
// exactly as attackA.mjs does (uniform, or tilted to mean unit length 10) but keeps the bins of the WHOLE half-view, so that size / mean-length equalisation is separated from rank re-estimation.
//   fixTok7500 (r0,r1)   uniform unit subsample to 7,500 tokens per half
//   fixLen10             tilted subsample, mean unit length 10 (+-10%), budget min(half/2, 50,000) tokens
//   fixLen10Tok7500 (r0,r1)
//   null: the whole-view within-unit shuffle with the atlas seeds, restricted to the selected units (units outside the selection never enter).
//   node attackA4.mjs PART NPARTS [ids] -> A4_raw_<PART>.jsonl
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, rngOf, seedOf, cell, entc, statusOf, prep, HERE, TABLE } from "./lib.mjs";
const [PART, NP, FILTER] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1), process.argv[4]];
const T = TABLE(), rows = T.rows.filter((r) => r.kind === "real" && !r.thin && (!FILTER || FILTER.split(",").includes(r.id)));
const mine = rows.filter((_, i) => i % NP === PART), MSTAR = 10;
function pick(lens, keysU, lambda, budget) {
  const order = lens.map((L, i) => [Math.log(keysU[i]) / Math.pow(L, lambda), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const ix = []; let tok = 0;
  for (const [, i] of order) { ix.push(i); tok += lens[i]; if (tok >= budget) break; }
  return { ix, tok };
}
/** returns {mask, mul, tok} or null/unreachable; identical selection logic to attackA.mjs (own seed namespace) */
function select(view, budget, mstar, tag, id) {
  const lens = view.units.map((u) => u.length), tot = lens.reduce((a, b) => a + b, 0);
  if (tot < budget) return null;
  const rnd = rngOf(seedOf("attackA4-entCurv", tag, id, view.which)), keysU = lens.map(() => Math.max(1e-12, rnd()));
  let r;
  if (mstar == null) r = pick(lens, keysU, 0, budget);
  else {
    let lo = -12, hi = 12, best = null;
    for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2, rr = pick(lens, keysU, mid, budget), m = rr.tok / rr.ix.length; best = { rr, m }; if (Math.abs(m / mstar - 1) < 0.02) break; if (m < mstar) lo = mid; else hi = mid; }
    if (Math.abs(best.m / mstar - 1) > 0.1) return { unreachable: true, achieved: best.m };
    r = best.rr;
  }
  const mask = new Uint8Array(lens.length); for (const i of r.ix) mask[i] = 1;
  return { mask, mul: r.tok / r.ix.length, tok: r.tok };
}
const VARIANTS = [["fixTok7500_r0", 7500, null], ["fixTok7500_r1", 7500, null], ["fixLen10", "half", MSTAR], ["fixLen10Tok7500_r0", 7500, MSTAR], ["fixLen10Tok7500_r1", 7500, MSTAR]];
const out = fs.createWriteStream(path.join(HERE, `A4_raw_${PART}.jsonl`));
for (const r of mine) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, grain: r.grain, register: r.register, status0: r.status, v0: r.v["order.entCurv"], mul0: r.mul, tokens: r.tokens, variants: {} };
  const Ps = { discover: prep(H.discover), confirm: prep(H.confirm) };
  for (const [name, budget0, mstar] of VARIANTS) {
    const res = {};
    for (const w of ["discover", "confirm"]) {
      const view = H[w], budget = budget0 === "half" ? Math.min(Math.floor(view.units.reduce((n, u) => n + u.length, 0) / 2), 50000) : budget0;
      const sel = select(view, budget, mstar, name, r.id);
      if (!sel) { res.skipped = "too small"; break; } if (sel.unreachable) { res.skipped = "unreachable"; res.achieved = sel.achieved; break; }
      const c = cell(view, { P: Ps[w], fn: (P) => entc(P, { mask: sel.mask })?.curv });
      if (!c || c.z == null) { res.skipped = "undefined"; break; }
      res[w] = { v: c.v, z: c.z, mul: sel.mul, tok: sel.tok };
    }
    if (!res.skipped) { res.status = statusOf(res.discover, res.confirm); res.v = (res.discover.v + res.confirm.v) / 2; }
    o.variants[name] = res;
  }
  out.write(JSON.stringify(o) + "\n");
  console.error(`${r.id} ${r.status} ${Object.entries(o.variants).map(([k, x]) => k + ":" + (x.status ?? x.skipped)).join(" ")}`);
}
out.end();
