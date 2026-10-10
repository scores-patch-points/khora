// checks.mjs — instrument checks of the "order" family.  node checks.mjs <timing|size|length|determinism|edge> <out.json>
import fs from "node:fs";
import { load as lp } from "../../../loaders/planted.mjs";
import { load as lb } from "../../../loaders/books.mjs";
import { halves, tokenCount, rngOf, seedOf, nullView } from "../../../lib/pocket.mjs";
import { compute, STATS } from "../../order.mjs";
const [what, out] = process.argv.slice(2);
const cap = (units, docOf, n) => { let t = 0, e = units.length; for (let i = 0; i < units.length; i++) { t += units[i].length; if (t >= n && docOf[i + 1] !== docOf[i]) { e = i + 1; break; } } return { id: "t", which: "t", units: units.slice(0, e), docOf: docOf.slice(0, e) }; };
const cpuOf = (f) => { const c = process.cpuUsage(), r = f(), e = process.cpuUsage(c); return [r, (e.user + e.system) / 1e6]; };
const rnd = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? null : +v.toFixed(4)]));
const res = {};
const recut = (p, L) => { const byDoc = new Map(); p.units.forEach((u, k) => { const d = p.docOf[k]; if (!byDoc.has(d)) byDoc.set(d, []); byDoc.get(d).push(...u); }); const units = [], docOf = []; for (const [d, toks] of byDoc) for (let i = 0; i + L <= toks.length; i += L) { units.push(toks.slice(i, i + L)); docOf.push(d); } return { id: "x", which: "x", units, docOf }; };
if (what === "timing") {
  const [bk] = await lb(["bk-lesmis"]), H = halves(bk), pn = (await lp(["pl-markov"]))[0];
  const views = { "bk-lesmis/discover(full half)": H.discover, "bk-lesmis/confirm(full half)": H.confirm, "pl-markov(all)": { id: "x", which: "x", units: pn.units, docOf: pn.docOf } };
  const big = H.discover; // large-vocabulary stress: every third token relabelled to one of ~20k extra types
  views["bk-lesmis/discover with ~20k extra types"] = { id: "x", which: "x", units: big.units.map((u, k) => u.map((w, i) => ((k + i) % 3 === 0 ? w + "x" + ((k * 7 + i * 13) % 20000) : w))), docOf: big.docOf };
  views["bk-lesmis/discover, all units cut to length 2 (many tiny units)"] = { id: "x", which: "x", units: big.units.flatMap((u) => { const o = []; for (let i = 0; i + 2 <= u.length; i += 2) o.push(u.slice(i, i + 2)); return o; }), docOf: big.units.flatMap((u, k) => Array(Math.floor(u.length / 2)).fill(big.docOf[k])) };
  for (const [name, v] of Object.entries(views)) { const t = []; for (let k = 0; k < 4; k++) t.push(cpuOf(() => compute(v))[1]); const nv = nullView(v, "within-unit", 5); const tn = cpuOf(() => compute(nv))[1]; res[name] = { tokens: tokenCount(v.units), units: v.units.length, cpuSecCallsInOrder: t.map((x) => +x.toFixed(3)), cpuSecOnWithinUnitNull: +tn.toFixed(3) }; }
} else if (what === "size") {
  const [bk] = await lb(["bk-lesmis"]), H = halves(bk), pn = await lp(["pl-null", "pl-markov", "pl-frames"]);
  for (const [name, v] of [["bk-lesmis/discover", H.discover], ["bk-lesmis/confirm", H.confirm], ...pn.map((p) => [p.id, { units: p.units, docOf: p.docOf }])]) {
    res[name] = {}; for (const n of [10000, 20000, 40000, 80000, 150000]) { const s = cap(v.units, v.docOf, n); if (tokenCount(s.units) < n * 0.8) continue; res[name][n] = { tokens: tokenCount(s.units), v: rnd(compute(s)) }; }
  }
} else if (what === "length") {
  // (a) law-free tokens (pl-null, pl-null2) re-cut into units of fixed length L: v must stay ~0 at every L (no statistic is a function of unit length)
  for (const id of ["pl-null", "pl-null2"]) { const [pn] = await lp([id]); res[`fixedLength/${id}`] = {}; for (const L of [3, 4, 8, 16, 32, 64]) { const v = recut(pn, L); res[`fixedLength/${id}`][L] = { units: v.units.length, v: rnd(compute(v)) }; } }
  // (b) law-free tokens, unit LENGTH autocorrelated: regimes of 15 units alternating short (2-5 tokens) and long (20-40 tokens)
  const [pn] = await lp(["pl-null"]); const byDoc = new Map(); pn.units.forEach((u, k) => { const d = pn.docOf[k]; if (!byDoc.has(d)) byDoc.set(d, []); byDoc.get(d).push(...u); });
  const rg = rngOf(seedOf("order-length-confound")), units = [], docOf = [];
  for (const [d, toks] of byDoc) { let i = 0, reg = 0, left = 15; while (i < toks.length) { const L = reg ? 20 + Math.floor(rg() * 21) : 2 + Math.floor(rg() * 4); if (i + L > toks.length) break; units.push(toks.slice(i, i + L)); docOf.push(d); i += L; if (--left === 0) { reg ^= 1; left = 15; } } }
  res.autocorrelatedLength = { units: units.length, v: rnd(compute({ id: "x", which: "x", units, docOf })) };
  // (c) a real book re-cut into windows of L tokens: sentence boundaries are no longer the units, so the unit-position laws must collapse while sentence-unit values are large
  const [bk] = await lb(["bk-great-expect"]); res["bk-great-expect/sentence units"] = { units: bk.units.length, v: rnd(compute({ id: "x", which: "x", units: bk.units, docOf: bk.docOf })) };
  for (const L of [8, 16, 32]) { const v = recut(bk, L); res[`bk-great-expect/recut-${L}`] = { units: v.units.length, v: rnd(compute(v)) }; }
  // (d) real book with the units SHUFFLED across the book (unit order destroyed, each unit intact): order-inside-unit statistics must not move
  const sh = nullView({ id: "x", which: "x", units: bk.units, docOf: bk.docOf }, "unit-order", 11); res["bk-great-expect/unit-order-shuffled"] = { v: rnd(compute(sh)) };
} else if (what === "determinism") {
  const [bk] = await lb(["bk-great-expect"]), H = halves(bk), v = cap(H.discover.units, H.discover.docOf, 50000);
  const a = JSON.stringify(compute(v)), b = JSON.stringify(compute(v)), nv1 = JSON.stringify(compute(nullView(v, "within-unit", 7))), nv2 = JSON.stringify(compute(nullView(v, "within-unit", 7)));
  res.sameInputSameOutput = a === b; res.sameNullSeedSameOutput = nv1 === nv2; res.sample = JSON.parse(a);
} else if (what === "edge") {
  const mk = (units, docs) => ({ id: "e", which: "e", units, docOf: docs ?? units.map((_, k) => Math.floor(k / 50)) });
  const words = Array.from({ length: 400 }, (_, i) => "w" + i);
  const cases = {
    tiny: mk([["a", "b"], ["c"]]),
    oneType: mk(Array.from({ length: 3000 }, () => ["x", "x", "x"])),
    twoTypes: mk(Array.from({ length: 3000 }, (_, k) => (k % 2 ? ["x", "y"] : ["y", "x", "y"]))),
    unitLength1: mk(Array.from({ length: 5000 }, (_, k) => [words[k % 400]])),
    unitLength2: mk(Array.from({ length: 5000 }, (_, k) => [words[k % 400], words[(k * 7 + 3) % 400]])),
    oneGiantUnit: mk([Array.from({ length: 60000 }, (_, k) => words[(k * k + 3 * k) % 400])], [0]),
    nonLatin: mk(Array.from({ length: 4000 }, (_, k) => [words[k % 400] + "中", "ж" + words[(k * 3) % 400], words[(k * 5 + 1) % 400] + "א", "ب" + words[(k * 11) % 400]].map((w) => w.toLowerCase()))),
    fewTypesManyUnits: mk(Array.from({ length: 6000 }, (_, k) => [words[k % 35], words[(k * 3) % 35], words[(k * 5) % 35], words[(k * 7) % 35]])),
    periodic: mk(Array.from({ length: 2000 }, () => ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "aa", "bb", "cc", "dd"])),
  };
  res.cases = {}; for (const [k, v] of Object.entries(cases)) { try { const r = compute(v); res.cases[k] = { tokens: tokenCount(v.units), allFiniteOrNull: Object.values(r).every((x) => x === null || Number.isFinite(x)), v: rnd(r) }; } catch (e) { res.cases[k] = { error: String(e.message).slice(0, 200) }; } }
}
fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.error(what, "done");
