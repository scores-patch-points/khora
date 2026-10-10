// attackA.mjs -- ATTACK A (size, unit length, tokenisation). For every real pocket (390 with a defined cell; the 255 PRESENT ones are the target) recompute the atlas rareCurve cell (both halves, 10 within-unit draws, atlas seeds)
// on deterministic variants of each half (all seeded by seedOf("attackA-rc", ...), no Math.random, no Date):
//   base       atlas view (must equal the atlas cell exactly)
//   tok7500    uniform random UNIT subsample to ~7,500 tokens per half (replicates r0, r1)       tok20000  same to ~20,000 tokens (when both halves have >= 20,000; r0, r1)
//   len10      tilted unit subsample (weight len^lambda, Efraimidis-Spirakis keys, bisection on lambda) so the MEAN UNIT LENGTH is 10 (+-10%), budget min(half/2, 50,000) tokens
//   t7500m10   both: ~7,500 tokens AND mean unit length 10 (r0, r1)      t20000m10 both at 20,000 tokens
//   dedup      unique units only (exact token-sequence duplicates dropped, first occurrence kept)
//   drop1pct   rarest 1% of types deleted (ascending count, ties by sha256 of the type), tokens removed from their units, empty units dropped      dropHapax  every count-1 type deleted
//   trunc5     alternative tokenisation: every token cut to its first 5 code points (merges inflected / compounded variants)
//   xcount     alternative rank definition: x = -ln(count of the type)      xlin  x = mid-rank / V (linear rank)    xhap  x = [count == 1]    xcont  x = [mid-rank > 4K] (content indicator, K = min(400, max(10, round(0.05 V))))
//   node attackA.mjs PART NPARTS [idFilterCSV]  -> A_raw_<PART>.jsonl (one JSON line per pocket)
import fs from "node:fs";
import path from "node:path";
import { loadCached, atlasOf, halves, rngOf, seedOf, sha256, cell, statusOf, prep, tokensOf, HERE } from "./lib.mjs";
const [PART, NP, FILTER] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1), process.argv[4]];
const T = JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8")).rows;
const rows = T.filter((r) => r.status !== "nodata" && (!FILTER || FILTER.split(",").includes(r.id)));
const mine = rows.filter((_, i) => i % NP === PART), MSTAR = 10;
const sub = (view, ix) => ({ ...view, units: ix.map((i) => view.units[i]), docOf: ix.map((i) => view.docOf[i]) });
function pick(lens, keysU, lambda, budget) {
  const order = lens.map((L, i) => [Math.log(keysU[i]) / Math.pow(L, lambda), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const ix = []; let tok = 0;
  for (const [, i] of order) { ix.push(i); tok += lens[i]; if (tok >= budget) break; }
  return { ix: ix.sort((a, b) => a - b), tok };
}
function subsample(view, budget, mstar, tag, id) {
  const lens = view.units.map((u) => u.length), tot = lens.reduce((a, b) => a + b, 0);
  if (tot < budget) return null;
  const rnd = rngOf(seedOf("attackA-rc", tag, id, view.which)), keysU = lens.map(() => Math.max(1e-12, rnd()));
  if (mstar == null) return { view: sub(view, pick(lens, keysU, 0, budget).ix), lambda: 0 };
  let lo = -12, hi = 12, best = null;
  for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2, r = pick(lens, keysU, mid, budget), m = r.tok / r.ix.length; best = { lam: mid, r, m }; if (Math.abs(m / mstar - 1) < 0.02) break; if (m < mstar) lo = mid; else hi = mid; }
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
function dedup(view) { const seen = new Set(), units = [], docOf = []; view.units.forEach((u, k) => { const key = u.join("\u0001"); if (!seen.has(key)) { seen.add(key); units.push(u); docOf.push(view.docOf[k]); } }); return { view: { ...view, units, docOf }, dropped: view.units.length - units.length }; }
/** alternative x per token from a prepared view: returns Float64Array xs */
function altX(P, kind) {
  const xs = new Float64Array(P.N);
  for (let i = 0; i < P.N; i++) {
    const t = P.T[i];
    xs[i] = kind === "xcount" ? -Math.log(P.cnt[t]) : kind === "xlin" ? P.mid[t] / P.V : kind === "xhap" ? (P.cnt[t] === 1 ? 1 : 0) : P.mid[t] > 4 * P.K ? 1 : 0;
  }
  return xs;
}
const mulOf = (v) => tokensOf(v.units) / v.units.length;
const pack = (c, b) => ({ v: c.v, z: c.z, N: c.N, V: c.V, U: c.U, mul: b ? mulOf(b.view) : null, lambda: b?.lambda ?? null, dropped: b?.dropped ?? null });
function evalVariant(H, builder, id, xkind = null) {
  const res = {};
  for (const w of ["discover", "confirm"]) {
    const b = builder(H[w], w); if (!b) return { skipped: "too small" }; if (b.unreachable) return { skipped: "unreachable", achieved: b.achieved };
    const P = prep(b.view);
    const c = cell(b.view, { seedId: id, which: w, P, xsOverride: xkind ? altX(P, xkind) : null });
    if (!c) return { skipped: "undefined (N<2000 or V<30)" };
    res[w] = pack(c, b);
  }
  res.status = statusOf(res.discover, res.confirm); res.v = res.discover.v != null && res.confirm.v != null ? (res.discover.v + res.confirm.v) / 2 : null; return res;
}
const out = fs.createWriteStream(path.join(HERE, `A_raw_${PART}.jsonl`));
for (const r of mine) {
  const p = loadCached(r.id), H = halves(p), V = {};
  const o = { id: r.id, group: r.group, register: r.register, language: r.language, grain: r.grain, status0: r.status, v0: r.v, mul0: r.mul, tokens: r.tokens, variants: V };
  V.base = evalVariant(H, (v) => ({ view: v }), r.id);
  const a = atlasOf(r.id).halves; o.baseMatchesAtlas = ["discover", "confirm"].every((w) => V.base[w] && V.base[w].v === a[w]["order.rareCurve"].v && V.base[w].z === a[w]["order.rareCurve"].z);
  for (const [tag, B] of [["tok7500", 7500], ["tok20000", 20000]]) for (const rep of [0, 1]) V[`${tag}_r${rep}`] = evalVariant(H, (v) => subsample(v, B, null, `${tag}_r${rep}`, r.id), r.id);
  V.len10 = evalVariant(H, (v) => subsample(v, Math.min(tokensOf(v.units) / 2, 50000), MSTAR, "len10", r.id), r.id);
  for (const rep of [0, 1]) { V[`t7500m10_r${rep}`] = evalVariant(H, (v) => subsample(v, 7500, MSTAR, `t7500m10_r${rep}`, r.id), r.id); V[`t20000m10_r${rep}`] = evalVariant(H, (v) => subsample(v, 20000, MSTAR, `t20000m10_r${rep}`, r.id), r.id); }
  V.dedup = evalVariant(H, (v) => dedup(v), r.id);
  V.drop1pct = evalVariant(H, (v) => dropTypes(v, drop1pct), r.id);
  V.dropHapax = evalVariant(H, (v) => dropTypes(v, dropHap), r.id);
  V.trunc5 = evalVariant(H, (v) => ({ view: trunc5(v) }), r.id);
  for (const k of ["xcount", "xlin", "xhap", "xcont"]) V[k] = evalVariant(H, (v) => ({ view: v }), r.id, k);
  out.write(JSON.stringify(o) + "\n");
  console.error(`${r.id} done`);
}
out.end();
