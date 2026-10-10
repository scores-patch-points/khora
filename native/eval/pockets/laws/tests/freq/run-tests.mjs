// laws/tests/freq/run-tests.mjs — tests of laws/freq.mjs.   node run-tests.mjs <part>     parts: planted | calib | real | abbrev      writes results-<part>.json next to this file.
//  planted : atlas-identical cells (v, nullMean, nullSd, z) on <= 50k-token slices of the planted pockets and three inline worlds (topical, rhythm, plus the confirm halves of three planted pockets)
//  calib   : 16 independent law-free iid replicates -> rate of |z| >= 2 and >= 4 per statistic, mean and sd of z
//  real    : a real book (Pride and Prejudice, 50k tokens): cells; size control (15k/30k/50k tokens); unit-length control (same tokens regrouped into units of 5/10/20/40); CPU timing at 150k tokens; determinism
//  abbrev  : the law-free null the harness cannot give (string lengths permuted over the 500 commonest types) for the INERT abbreviation statistic
import fs from "node:fs";
import { load } from "../../../loaders/planted.mjs";
import { rngOf, seedOf, halves } from "../../../lib/pocket.mjs";
import * as fam from "../../freq.mjs";
import { atlasCells, capView, discoverCap, tokensOf, round, cpuMs, bookView, regroup, regroupRandom, mapChars } from "./_t_util.mjs";
import { iidWorld, topicalWorld, rhythmWorld } from "./_t_worlds.mjs";

const part = process.argv[2], HERE = new URL(".", import.meta.url).pathname, out = { part, statIds: fam.STATS.map((s) => s.id), nulls: Object.fromEntries(fam.STATS.map((s) => [s.id, s.null])), inert: fam.INERT };
const BOOK = "01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", BIG = "01-literature-books/gutenberg/pg145_Middlemarch-George-Eliot.txt";
const rowOf = (view, cell, extra = {}) => ({ id: view.id, which: view.which, tokens: tokensOf(view), units: view.units.length, docs: new Set(view.docOf).size, ...extra, cells: Object.fromEntries(Object.entries(cell).map(([k, c]) => [k, { v: round(c.v), nullMean: round(c.nullMean), nullSd: round(c.nullSd, 5), z: round(c.z, 2) }])) });
const save = () => fs.writeFileSync(`${HERE}results-${part}.json`, JSON.stringify(out, null, 1) + "\n");
const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const t0 = performance.now(); const log = (m) => console.error(`[${part}] ${((performance.now() - t0) / 1000).toFixed(1)}s ${m}`);

if (part === "planted") {
  const ps = await load(["pl-null", "pl-null2", "pl-burst", "pl-markov", "pl-frames", "pl-parallel", "pl-length"]), rows = [];
  for (const p of ps) { const v = discoverCap(p, 50000); rows.push(rowOf(v, atlasCells(v), { world: p.meta.notes })); log(p.id); }
  for (const id of ["pl-null", "pl-burst", "pl-length"]) { const p = ps.find((q) => q.id === id), v = capView(halves(p).confirm, 50000); rows.push(rowOf(v, atlasCells(v), { world: p.meta.notes })); log(id + " confirm"); }
  for (const [id, w] of [["inline-topical", topicalWorld("inline-topical", 50)], ["inline-rhythm", rhythmWorld("inline-rhythm", 50)]]) { rows.push(rowOf(w, atlasCells(w), { world: id })); log(id); }
  out.rows = rows;
} else if (part === "calib") {
  const rows = [];
  for (let r = 0; r < 16; r++) { const w = iidWorld(`iid-r${r}`, 50); rows.push(rowOf(w, atlasCells(w))); log(`rep ${r}`); }
  out.rows = rows; out.summary = {};
  for (const id of out.statIds) {
    const zs = rows.map((r) => r.cells[id].z).filter((z) => z != null), n = zs.length, m = n ? zs.reduce((a, b) => a + b, 0) / n : null;
    out.summary[id] = { n, rateGe2: n ? round(zs.filter((z) => Math.abs(z) >= 2).length / n, 3) : null, rateGe4: n ? round(zs.filter((z) => Math.abs(z) >= 4).length / n, 3) : null, meanZ: round(m, 2), sdZ: n > 1 ? round(Math.sqrt(zs.reduce((a, z) => a + (z - m) ** 2, 0) / (n - 1)), 2) : null, vRange: [round(Math.min(...rows.map((r) => r.cells[id].v ?? NaN))), round(Math.max(...rows.map((r) => r.cells[id].v ?? NaN)))] };
  }
} else if (part === "real") {
  const book = bookView(BOOK, "real-pride", 50000); out.real = rowOf(book, atlasCells(book)); log("real cells");
  out.sizeControl = [15000, 30000, 50000].map((c) => { const v = capView(book, c), r = fam.compute(v); return { tokens: tokensOf(v), v: Object.fromEntries(Object.entries(r).map(([k, x]) => [k, round(x)])) }; });
  out.unitControl = [5, 10, 20, 40].map((L) => { const v = regroup(book, L), r = fam.compute(v); return { unitLen: L, v: Object.fromEntries(Object.entries(r).map(([k, x]) => [k, round(x)])) }; }); log("controls");
  const rc = regroupRandom(book, "pride"); out.randomCutControl = rowOf(rc, atlasCells(rc), { world: "same tokens, units cut at iid lognormal lengths unrelated to the text" }); log("random cut");
  const big = bookView(BIG, "real-middlemarch", 150000), calls = Array.from({ length: 5 }, () => cpuMs(() => fam.compute(big)));
  out.timing = { tokens: tokensOf(big), units: big.units.length, cpuMsEachCall: calls.map((c) => Math.round(c.cpu)), cpuMsMedian: Math.round(median(calls.map((c) => c.cpu))), wallMsMedian: Math.round(median(calls.map((c) => c.wall))), budgetMs: 700, machineLoadNote: "wall time inflated by the shared machine; CPU time is the budget evidence" };
  out.determinism = { identical: JSON.stringify(fam.compute(big)) === JSON.stringify(fam.compute(bookView(BIG, "real-middlemarch", 150000))) }; log("timing");
} else if (part === "calib2") {
  const R = 60, rows = []; for (let r = 0; r < R; r++) { const w = iidWorld(`iid2-r${r}`, 40); rows.push(rowOf(w, atlasCells(w))); if (r % 10 === 9) log(`rep ${r}`); }
  out.rows = rows.map((r) => ({ id: r.id, z: Object.fromEntries(Object.entries(r.cells).map(([k, c]) => [k, c.z])) })); out.summary = {};
  for (const id of out.statIds) {
    const zs = rows.map((r) => r.cells[id].z).filter((z) => z != null), n = zs.length, m = n ? zs.reduce((a, b) => a + b, 0) / n : null;
    out.summary[id] = { n, rateGe2: n ? round(zs.filter((z) => Math.abs(z) >= 2).length / n, 3) : null, rateGe3: n ? round(zs.filter((z) => Math.abs(z) >= 3).length / n, 3) : null, rateGe4: n ? round(zs.filter((z) => Math.abs(z) >= 4).length / n, 3) : null, meanZ: round(m, 2), sdZ: n > 1 ? round(Math.sqrt(zs.reduce((a, z) => a + (z - m) ** 2, 0) / (n - 1)), 2) : null };
  }
  out.reference = "Student t with 9 df (10 null draws): sd 1.134, P(|z|>=2) 0.077, P(|z|>=3) 0.015, P(|z|>=4) 0.0031";
} else if (part === "edge") {
  const ps = await load(["pl-length"]), v = discoverCap(ps[0], 30000), r0 = Object.fromEntries(Object.entries(fam.compute(v)).map(([k, x]) => [k, round(x, 6)]));
  const maps = { cyrillic: (c) => String.fromCodePoint(0x430 + (c.charCodeAt(0) - 97)), cjk: (c) => String.fromCodePoint(0x4e00 + (c.charCodeAt(0) - 97)), astral: (c) => String.fromCodePoint(0x1d41a + (c.charCodeAt(0) - 97)) };
  out.scriptInvariance = Object.fromEntries(Object.entries(maps).map(([name, f]) => { const r = fam.compute(mapChars(v, f)); return [name, { identicalToLatin: Object.keys(r0).every((k) => round(r[k], 6) === r0[k]), diffs: Object.keys(r0).filter((k) => round(r[k], 6) !== r0[k]) }]; }));
  const fixed = { id: "edge", which: "discover", units: Array.from({ length: 4000 }, (_, k) => Array.from({ length: 8 }, (_, j) => `w${(k * 8 + j) % 900}`)), docOf: Array.from({ length: 4000 }, (_, k) => Math.floor(k / 100)) };
  const tiny = { id: "edge", which: "discover", units: [["a", "b"], ["c"]], docOf: [0, 0] }, empty = { id: "edge", which: "discover", units: [], docOf: [] };
  const smallVocab = { id: "edge", which: "discover", units: Array.from({ length: 3000 }, (_, k) => Array.from({ length: 1 + (k % 7) }, (_, j) => `t${(k * 3 + j * 5) % 40}`)), docOf: Array.from({ length: 3000 }, (_, k) => Math.floor(k / 60)) };
  const oneDoc = { ...v, docOf: v.docOf.map(() => 0) };
  out.degenerate = Object.fromEntries(Object.entries({ constantUnitLength: fixed, tiny, empty, vocab40: smallVocab, oneDocument: oneDoc }).map(([k, w]) => { let r; try { r = Object.fromEntries(Object.entries(fam.compute(w)).map(([a, x]) => [a, round(x, 5)])); } catch (e) { r = "THROWS " + e.message; } return [k, r]; }));
  out.noNaN = Object.values(out.degenerate).every((r) => typeof r === "object" && Object.values(r).every((x) => x === null || Number.isFinite(x)));
} else if (part === "abbrev") {
  const ps = await load(["pl-null", "pl-length"]), views = [discoverCap(ps[0], 50000), discoverCap(ps[1], 50000), bookView(BOOK, "real-pride", 50000), topicalWorld("inline-topical", 50)];
  out.rows = views.map((v) => abbrevPerm(v)); log("done");
} else throw new Error("part must be planted|calib|real|abbrev");

/** permutation null for abbrev: shuffle code-point lengths over the 500 commonest types (rng seeded), 300 draws */
function abbrevPerm(v) {
  const cnt = new Map(); for (const u of v.units) for (const w of u) cnt.set(w, (cnt.get(w) || 0) + 1);
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 500), len = top.map(([w]) => [...w].length);
  const rk = (a) => { const ix = a.map((_, i) => i).sort((i, j) => a[i] - a[j] || i - j), r = new Array(a.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && a[ix[j + 1]] === a[ix[i]]) j++; for (let k = i; k <= j; k++) r[ix[k]] = (i + j) / 2; i = j + 1; } return r; };
  const pe = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
  const xr = rk(top.map(([, c]) => c)), rho = pe(xr, rk(len)), rnd = rngOf(seedOf("freq-test", "abbrev", v.id)), ds = [];
  for (let d = 0; d < 300; d++) { const l = len.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } ds.push(pe(xr, rk(l))); }
  const m = ds.reduce((a, b) => a + b) / ds.length, sd = Math.sqrt(ds.reduce((a, b) => a + (b - m) ** 2, 0) / (ds.length - 1));
  return { id: v.id, rhoObserved: round(rho), permNullMean: round(m), permNullSd: round(sd), zPermutation: round((rho - m) / sd, 2), computeValue: round(fam.compute(v).abbrev) };
}
save(); log("saved");
