// laws/tests/burst/checks.mjs — instrument checks of the "burst" family.  node checks.mjs <timing|size|length|determinism|edge> <out.json>
import fs from "node:fs";
import { load as lp } from "../../../loaders/planted.mjs";
import { load as lb } from "../../../loaders/books.mjs";
import { halves, tokenCount, rngOf, seedOf, nullView } from "../../../lib/pocket.mjs";
import { compute, STATS } from "../../burst.mjs";
import { prep } from "../../_burst_prep.mjs";
const [what, out] = process.argv.slice(2), ids = STATS.map((s) => s.id);
const cap = (units, docOf, n) => { let t = 0, e = units.length; for (let i = 0; i < units.length; i++) { t += units[i].length; if (t >= n && docOf[i + 1] !== docOf[i]) { e = i + 1; break; } } return { id: "t", which: "t", units: units.slice(0, e), docOf: docOf.slice(0, e) }; };
const cpuOf = (f) => { const c = process.cpuUsage(), r = f(), e = process.cpuUsage(c); return [r, (e.user + e.system) / 1e6]; };
const rnd = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? null : +v.toFixed(4)]));
const res = {};
if (what === "timing") {
  const [bk] = await lb(["bk-great-expect"]), H = halves(bk), pn = (await lp(["pl-burst"]))[0];
  const views = { "bk-great-expect/discover(full half)": H.discover, "bk-great-expect/confirm(full half)": H.confirm, "pl-burst(all)": { id: "x", which: "x", units: pn.units, docOf: pn.docOf } };
  // a 150k-token large-vocabulary view: the book tokens re-labelled by a hash so that every second token is a fresh type (V large), to stress the sort/Map
  const big = H.discover; const vocab = { id: "x", which: "x", units: big.units.map((u, k) => u.map((w, i) => ((k + i) % 3 === 0 ? w + "x" + ((k * 7 + i * 13) % 20000) : w))), docOf: big.docOf };
  views["bk-great-expect/discover with ~20k extra types"] = vocab;
  for (const [name, v] of Object.entries(views)) { const t = []; for (let k = 0; k < 4; k++) t.push(cpuOf(() => compute(v))[1]); res[name] = { tokens: tokenCount(v.units), types: prep(v).V, cpuSecCallsInOrder: t.map((x) => +x.toFixed(3)) }; }
} else if (what === "size") {
  const [bk] = await lb(["bk-great-expect"]), H = halves(bk), pn = (await lp(["pl-null", "pl-burst"]));
  for (const [name, v] of [["bk-great-expect/discover", H.discover], ...pn.map((p) => [p.id, { units: p.units, docOf: p.docOf }])]) {
    res[name] = {}; for (const n of [10000, 20000, 40000, 80000, 150000]) { const s = cap(v.units, v.docOf, n); if (tokenCount(s.units) < n * 0.8) continue; res[name][n] = { tokens: tokenCount(s.units), v: rnd(compute(s)) }; }
  }
} else if (what === "length") {
  // (a) the same pl-null token stream re-cut into units of fixed length L (law-free: every unit-level lift must stay ~0 at every L)
  const [pn] = await lp(["pl-null"]); const byDoc = new Map(); pn.units.forEach((u, k) => { const d = pn.docOf[k]; if (!byDoc.has(d)) byDoc.set(d, []); byDoc.get(d).push(...u); });
  const recut = (L) => { const units = [], docOf = []; for (const [d, toks] of byDoc) for (let i = 0; i + L <= toks.length; i += L) { units.push(toks.slice(i, i + L)); docOf.push(d); } return { id: "x", which: "x", units, docOf }; };
  res.fixedLength = {}; for (const L of [4, 8, 16, 32, 64]) { const v = recut(L); const r = compute(v); res.fixedLength[L] = { units: v.units.length, persist: r.persist, driftSlope: r.driftSlope, driftTail: r.driftTail, hurst: r.hurst }; }
  // (b) law-free tokens, but unit LENGTH autocorrelated: regimes of 15 units alternating short (2-5 tokens) and long (20-40 tokens); matched lift ~0 expected, unmatched raw ratio inflated
  const rg = rngOf(seedOf("burst-length-confound")), units = [], docOf = [];
  for (const [d, toks] of byDoc) { let i = 0, reg = 0, left = 15; while (i < toks.length) { const L = reg ? 20 + Math.floor(rg() * 21) : 2 + Math.floor(rg() * 4); if (i + L > toks.length) break; units.push(toks.slice(i, i + L)); docOf.push(d); i += L; if (--left === 0) { reg ^= 1; left = 15; } } }
  const ar = { id: "x", which: "x", units, docOf }, P = prep(ar), rr = compute(ar);
  // unmatched baseline: far partner drawn from ALL nonempty content units (no length matching), same stamps
  const { jaccardLifts } = await import("../../_burst_units.mjs"); const lifts = jaccardLifts(P);
  res.autocorrelatedLength = { units: units.length, matchedLift: lifts.map((r) => (r.lift == null ? null : +r.lift.toFixed(3))), compute: rnd(rr), meanLenFirstHalfRegimes: "alternating 15-unit regimes: 2-5 tokens / 20-40 tokens" };
  { const co = P; const cs = []; for (let u = 0; u < P.U; u++) { const s = new Set(); for (let p = P.unitStart[u]; p < P.unitStart[u + 1]; p++) { const t = P.T[p]; if (P.cnt[t] >= 2 && P.mid[t] > 100) s.add(t); } cs.push(s); }
    const J = (a, b) => { let h = 0; for (const t of a) if (b.has(t)) h++; return h / (a.size + b.size - h); }; let sn = 0, nn = 0, sf = 0, nf = 0;
    for (let u = 0; u + 1 < P.U; u++) { if (!cs[u].size || !cs[u + 1].size) continue; sn += J(cs[u], cs[u + 1]); nn++; const v = (u * 2654435761 + 977) % P.U; if (Math.abs(v - u) > 64 && cs[v].size) { sf += J(cs[u], cs[v]); nf++; } }
    res.autocorrelatedLength.unmatchedLnRatioLag1 = +Math.log((sn / nn) / (sf / nf)).toFixed(3); }
} else if (what === "determinism") {
  const [bk] = await lb(["bk-great-expect"]), H = halves(bk), v = cap(H.discover.units, H.discover.docOf, 50000);
  const a = JSON.stringify(compute(v)), b = JSON.stringify(compute(v)), nv1 = JSON.stringify(compute(nullView(v, "unit-order", 7))), nv2 = JSON.stringify(compute(nullView(v, "unit-order", 7)));
  res.sameInputSameOutput = a === b; res.sameNullSeedSameOutput = nv1 === nv2; res.sample = JSON.parse(a);
} else if (what === "edge") {
  const mk = (units, docs) => ({ id: "e", which: "e", units, docOf: docs ?? units.map((_, k) => Math.floor(k / 50)) });
  const cases = {
    tiny: mk([["a", "b"], ["c"]]),
    oneType: mk(Array.from({ length: 3000 }, () => ["x", "x", "x"])),
    twoTypes: mk(Array.from({ length: 3000 }, (_, k) => (k % 2 ? ["x", "y"] : ["y", "x", "y"]))),
    unitsOfOne: mk(Array.from({ length: 8000 }, (_, k) => ["w" + ((k * 7919) % 400)])),
    singleDocument: mk(Array.from({ length: 2000 }, (_, k) => ["w" + ((k * 31) % 997), "z" + (k % 53), "q" + ((k * 17) % 311)]), Array(2000).fill(0)),
    fewUnitsLongLines: mk(Array.from({ length: 40 }, (_, k) => Array.from({ length: 300 }, (_, i) => "w" + ((k * 131 + i * 37) % 1500)))),
    cyrillicLike: mk(Array.from({ length: 2500 }, (_, k) => ["п" + (k % 211), "с" + ((k * 3) % 97), "т" + ((k * 5) % 1013), "а" + (k % 7)])),
    cjkChars: mk(Array.from({ length: 4000 }, (_, k) => ["一".repeat(1) + String.fromCodePoint(0x4e00 + ((k * 13) % 900)), String.fromCodePoint(0x4e00 + ((k * 7) % 300))])),
  };
  for (const [k, v] of Object.entries(cases)) { try { const r = compute(v); const bad = Object.values(r).filter((x) => x !== null && !Number.isFinite(x)).length; res[k] = { tokens: tokenCount(v.units), units: v.units.length, nonFinite: bad, nulls: ids.filter((i) => r[i] === null), values: rnd(r) }; } catch (e) { res[k] = { error: String(e.message) }; } }
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.error(what, "done");
