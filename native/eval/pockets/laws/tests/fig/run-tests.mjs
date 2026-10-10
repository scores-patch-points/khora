// tests/fig/run-tests.mjs — tests of the "fig" family.  node run-tests.mjs <part>   (parts: planted | real | iid | timing)  ->  results-<part>.json
//  planted: 6 planted pockets (loaders/planted.mjs), discover half sliced to <= 50k tokens, 10 null draws per null kind, plus the confirm half of the two iid worlds.
//  real:    two real books from ethos via loaders/books.mjs (discover half, <= 50k tokens).
//  iid:     iid Zipf worlds with fixed unit lengths 6 / 12 / 24 and 20k / 50k tokens: v, null mean and z (size and unit-length confound check).
//  timing:  one real text at about 150k tokens, compute() called 3 times.
//  custom:  four custom worlds (_t_worlds.mjs): introduction frame, convergence up, convergence down, episodic figure density.
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { sliceView, observeWithNull, flat, halves, rngOf, seedOf, tokenCount } from "./_t_util.mjs";
import { compute } from "../../fig.mjs";

const HERE = new URL(".", import.meta.url).pathname, part = process.argv[2];
const save = (obj) => fs.writeFileSync(`${HERE}results-${part}.json`, JSON.stringify(obj, null, 1) + "\n");
const log = (...a) => console.error(a.join(" "));

async function bookView(id, which = "discover") {
  const { load } = await import("../../../loaders/books.mjs");
  const [p] = await load([id]);
  return { p, view: halves(p)[which] };
}
function iidWorld(id, L, N) {                       // Zipf(1.0) over 5000 types, every unit exactly L tokens, ~1000-token documents; no structure of any kind
  const rnd = rngOf(seedOf("fig-iid", id)), V = 5000, cdf = new Float64Array(V); let s = 0;
  for (let i = 0; i < V; i++) { s += 1 / (i + 1); cdf[i] = s; }
  const draw = () => { const u = rnd() * s; let lo = 0, hi = V - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] > u) hi = m; else lo = m + 1; } return "w" + lo; };
  const units = [], docOf = [], per = Math.max(1, Math.round(1000 / L));
  for (let k = 0; k * L < N; k++) { units.push(Array.from({ length: L }, draw)); docOf.push(Math.floor(k / per)); }
  return { id, which: "iid", units, docOf };
}

if (part === "planted") {
  const { load } = await import("../../../loaders/planted.mjs"), out = {};
  for (const p of await load(["pl-null", "pl-null2", "pl-burst", "pl-markov", "pl-frames", "pl-parallel"])) {
    const H = halves(p);
    for (const which of p.id.startsWith("pl-null") ? ["discover", "confirm"] : ["discover"]) {
      const r = observeWithNull(sliceView(H[which], 50000), 10); out[`${p.id}/${which}`] = { ms: r.ms, tokens: r.tokens, units: r.units, stats: flat(r) };
      log(p.id, which, r.tokens, r.ms, "ms");
    }
  }
  save(out);
} else if (part === "real") {
  const out = {};
  for (const id of ["bk-great-expect", "bk-origin-species"]) {
    const { view } = await bookView(id), r = observeWithNull(sliceView(view, 50000), 10); out[id] = { ms: r.ms, tokens: r.tokens, units: r.units, stats: flat(r) }; log(id, r.tokens, r.ms, "ms");
  }
  save(out);
} else if (part === "iid") {
  const out = {};
  for (const L of [6, 12, 24]) for (const N of [20000, 50000]) {
    const v = iidWorld(`L${L}-N${N}`, L, N), r = observeWithNull(v, 10); out[`L${L}-N${N}`] = { ms: r.ms, tokens: r.tokens, units: r.units, stats: flat(r) }; log("iid", L, N, r.ms, "ms");
  }
  save(out);
} else if (part === "timing") {
  const { p } = await bookView("bk-great-expect"), whole = { id: p.id, which: "all", units: p.units, docOf: p.docOf }, V = sliceView(whole, 150000), ms = [];
  for (let k = 0; k < 3; k++) { const t0 = performance.now(); compute(V); ms.push(Math.round(performance.now() - t0)); }
  const iid = iidWorld("timing", 12, 150000), ms2 = [];
  for (let k = 0; k < 3; k++) { const t0 = performance.now(); compute(iid); ms2.push(Math.round(performance.now() - t0)); }
  save({ real: { id: p.id, tokens: tokenCount(V.units), units: V.units.length, ms }, iid: { tokens: tokenCount(iid.units), ms: ms2 }, budgetMs: 700 });
} else if (part === "custom") {
  const { introWorld, convergeWorld, clusterWorld, introAllWorld } = await import("./_t_worlds.mjs"), out = {};
  for (const v of [introWorld("custom-intro"), introWorld("custom-intro-strong", 60000, 2500, 1), introAllWorld("custom-introall-left", "left"), introAllWorld("custom-introall-right", "right"), convergeWorld("custom-converge-up", 1), convergeWorld("custom-converge-down", -1), clusterWorld("custom-cluster")]) {
    const r = observeWithNull(v, 10); out[v.id] = { ms: r.ms, tokens: r.tokens, units: r.units, stats: flat(r) }; log(v.id, r.tokens, r.ms, "ms");
  }
  save(out);
} else if (part === "determinism") {
  const { view } = await bookView("bk-great-expect"), V = sliceView(view, 40000), snap = JSON.stringify(V.units), a = JSON.stringify(compute(V)), b = JSON.stringify(compute(V));
  const { nullView } = await import("../../../lib/pocket.mjs"), N1 = nullView(V, "within-unit", 7), c = JSON.stringify(compute(N1)), d = JSON.stringify(compute(nullView(V, "within-unit", 7)));
  save({ sameInputTwice: a === b, sameNullTwice: c === d, inputUnmutated: snap === JSON.stringify(V.units), valuesSha: (await import("node:crypto")).createHash("sha256").update(a).digest("hex"), values: JSON.parse(a) });
} else if (part === "edge") {
  const mk = (id, units) => ({ id, which: "edge", units, docOf: units.map((_, k) => Math.floor(k / 50)) }), out = {}, rnd = rngOf(seedOf("fig-edge")), pick = (n) => Math.floor(rnd() * n);
  const worlds = {
    "one-unit-3000": mk("e1", [Array.from({ length: 3000 }, () => "w" + pick(300))]),
    "units-of-one-3000": mk("e2", Array.from({ length: 3000 }, () => ["w" + pick(300)])),
    "all-identical": mk("e3", Array.from({ length: 1500 }, () => ["a", "a"])),
    "two-types": mk("e4", Array.from({ length: 1000 }, () => Array.from({ length: 4 }, () => (pick(2) ? "a" : "b")))),
    "all-distinct-30000": mk("e5", Array.from({ length: 3000 }, (_, k) => Array.from({ length: 10 }, (_, j) => `t${k}_${j}`))),
    "tiny-500": mk("e6", Array.from({ length: 100 }, () => Array.from({ length: 5 }, () => "w" + pick(50)))),
    "cjk-single-char": mk("e7", Array.from({ length: 2000 }, () => Array.from({ length: 6 }, () => String.fromCodePoint(0x4e00 + pick(400))))),
    "cyrillic-arabic": mk("e8", Array.from({ length: 2000 }, () => Array.from({ length: 6 }, () => (pick(2) ? "\u043f\u0440\u0438" + pick(200) : "\u0643\u062a\u0627\u0628" + pick(200))))),
    "astral": mk("e9", Array.from({ length: 2000 }, () => Array.from({ length: 6 }, () => String.fromCodePoint(0x1f300 + pick(300))))),
  };
  for (const [k, v] of Object.entries(worlds)) { let r, err = null; try { r = compute(v); } catch (e) { err = String(e.stack).slice(0, 300); } out[k] = { tokens: tokenCount(v.units), err, values: r ? Object.fromEntries(Object.entries(r).map(([a, x]) => [a, x == null ? null : +x.toFixed(4)])) : null, anyNaN: r ? Object.values(r).some((x) => Number.isNaN(x)) : null }; }
  save(out);
} else if (part === "g1books") {
  const { load, specIds } = await import("../../../loaders/books.mjs"), out = {}, ids = specIds().filter((i) => !/hen4|cryptic|crime-pun/.test(i)).slice(0, 24);
  for (const id of ids) {
    try { const [p] = await load([id]); const V = sliceView(halves(p).discover, 50000); if (tokenCount(V.units) < 20000) { log(id, "thin"); continue; }
      const r = observeWithNull(V, 10); out[id] = { ms: r.ms, tokens: r.tokens, units: r.units, meanUnitLen: +(r.tokens / r.units).toFixed(2), stats: flat(r) }; log(id, r.tokens, r.ms, "ms"); }
    catch (e) { out[id] = { error: String(e.message).slice(0, 200) }; log(id, "ERROR", e.message); }
  }
  save(out);
} else if (part === "sizes") {
  const out = {};                                    // raw v in iid worlds (unit length 12 and 24) as the token count grows: is any statistic a function of size?
  for (const L of [12, 24]) for (const N of [5000, 10000, 20000, 50000, 150000]) { const r = compute(iidWorld(`sz-L${L}-N${N}`, L, N)); out[`L${L}-N${N}`] = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x == null ? null : +x.toFixed(4)])); }
  save(out);
} else { console.error("usage: node run-tests.mjs planted|real|iid|timing|custom|determinism|edge|g1books|sizes"); process.exit(1); }
console.error("done", part);
