// laws/tests/phys/run-tests.mjs — tests of laws/phys.mjs.   node run-tests.mjs <stage> [--cap 50000]
//  planted   atlas cells (v, nullMean, nullSd, z) of the 8 planted worlds, both halves, discover/confirm each capped at --cap tokens
//  calib     20 replicate iid worlds (law-free): z of every statistic, share |z| >= 4 and >= 2; null mean versus the value of the iid world
//  real      atlas cells of real text (Pride and Prejudice 50k tokens; Middlemarch 150k for timing and size scan)
//  length    iid worlds with fixed unit length 3, 6, 12, 24: v and z (is any statistic a function of unit length without structure?)
//  size      the same real text cut at 20k, 40k, 80k, 150k tokens: v and z against size
//  det       determinism: compute twice, nullView twice
//  recut     the same real text regrouped into units of fixed length 4, 8, 16, 32 (is any statistic a function of unit length?)
//  edge      degenerate views: empty, one unit, 100 tokens, one repeated token, two types, ten types, a single document: no exception, null instead of NaN
//  script    the same text with every character mapped (injectively) to Cyrillic and to CJK: every value must be identical (only type identity is used)
//  timing    CPU time of compute() on 150,000-token views: Middlemarch, iid Zipf with a 100,000-type vocabulary, units of 5 tokens, units of 100 tokens (budget 700 ms)
//  collinear Spearman rho of every phys statistic with every freq statistic over ~25 views (planted halves, real books, IRC, code, UD): near-duplicates are flagged
//  pockets   real pockets from the atlas loaders (IRC chat, code, a UD treebank): atlas cells of both halves, capped at --cap tokens each
import fs from "node:fs";
import { load } from "../../../loaders/planted.mjs";
import { halves } from "../../../lib/pocket.mjs";
import { atlasCells, capView, bookView, tokensOf, round, cpuMs, regroup } from "./_t_util.mjs";
import { iidReplicate, fixedLenWorld } from "./_t_worlds.mjs";
import { mapChars } from "./_t_util.mjs";
import * as organic from "../../../loaders/organic.mjs";
import * as codemisc from "../../../loaders/codemisc.mjs";
import * as ud from "../../../loaders/ud.mjs";
import * as fam from "../../phys.mjs";
const argv = process.argv.slice(2), stage = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }, CAP = Number(opt("--cap", 50000));
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);
const BOOK = "01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", BIG = "01-literature-books/gutenberg/pg145_Middlemarch-George-Eliot.txt";
const row = (view, cells) => ({ tokens: tokensOf(view), units: view.units.length, docs: new Set(view.docOf).size, cells: Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, { v: round(c.v, 5), nullMean: round(c.nullMean, 5), nullSd: round(c.nullSd, 5), z: round(c.z, 2) }])) });
const out = {};
if (stage === "planted") {
  for (const p of await load()) { const H = halves(p); out[p.id] = {}; for (const w of ["discover", "confirm"]) { const v = capView(H[w], CAP); out[p.id][w] = row(v, atlasCells(v)); log(p.id, w); } }
} else if (stage === "calib") {
  const reps = Number(opt("--reps", 20)), off = Number(opt("--offset", 0)); out.reps = [];
  for (let r = 0; r < reps; r++) { const v = iidReplicate(`iid-rep${r + off}`, 50, r + off); out.reps.push(row(v, atlasCells(v))); log("rep", r); }
  const ids = fam.STATS.map((s) => s.id); out.summary = {};
  for (const id of ids) { const zs = out.reps.map((x) => x.cells[id].z).filter((z) => z != null); out.summary[id] = { n: zs.length, undefinedCells: reps - zs.length, absZ4: zs.filter((z) => Math.abs(z) >= 4).length, absZ2: zs.filter((z) => Math.abs(z) >= 2).length, meanZ: round(zs.reduce((a, b) => a + b, 0) / zs.length, 3), meanV: round(out.reps.map((x) => x.cells[id].v).filter((v) => v != null).reduce((a, b, _, A) => a + b / A.length, 0), 5) }; }
} else if (stage === "real") {
  for (const [rel, id, cap] of [[BOOK, "real-pride", 50000], [BIG, "real-middlemarch", 150000]]) { const v = bookView(rel, id, cap); out[id] = row(v, atlasCells(v, id === "real-pride" ? 10 : 10)); log(id); }
} else if (stage === "length") {
  for (const L of [3, 6, 12, 24]) { const v = fixedLenWorld(`fixed-L${L}`, 50, L); out[`L${L}`] = row(v, atlasCells(v)); log("L", L); }
} else if (stage === "size") {
  const big = bookView(BIG, "real-middlemarch", 150000);
  for (const cap of [20000, 40000, 80000, 150000]) { const v = capView(big, cap); out[`n${cap}`] = row(v, atlasCells(v)); log("size", cap); }
} else if (stage === "det") {
  const v = bookView(BIG, "real-middlemarch", 60000), a = JSON.stringify(fam.compute(v)), b = JSON.stringify(fam.compute(bookView(BIG, "real-middlemarch", 60000)));
  out.identical = a === b; out.values = JSON.parse(a);
  const c1 = JSON.stringify(atlasCells(v, 3, "det")), c2 = JSON.stringify(atlasCells(v, 3, "det")); out.atlasCellsIdentical = c1 === c2;
} else if (stage === "recut") {
  const base = bookView(BOOK, "real-pride", 50000);
  for (const L of [4, 8, 16, 32]) { const v = regroup(base, L); v.id = `pride-L${L}`; out[`L${L}`] = row(v, atlasCells(v)); log("recut", L); }
} else if (stage === "edge") {
  const mk = (id, units, docOf) => ({ id, which: "discover", units, docOf: docOf ?? units.map(() => 0) });
  const rep = (w, n) => Array.from({ length: n }, () => w), words = (k) => Array.from({ length: k }, (_, i) => `w${i}`);
  const cases = { empty: mk("empty", []), oneUnit: mk("one-unit", [words(50)]), hundred: mk("hundred", Array.from({ length: 10 }, (_, u) => words(10).map((w) => w + (u % 3)))),
    oneToken: mk("one-token", Array.from({ length: 2000 }, () => rep("a", 10))), twoTypes: mk("two-types", Array.from({ length: 2000 }, () => ["a", "b", "a", "b", "b", "a", "a", "b", "a", "a"])),
    tenTypes: mk("ten-types", Array.from({ length: 3000 }, (_, u) => Array.from({ length: 8 }, (_, k) => `t${(u * 7 + k * 3 + (u >> 3)) % 10}`)), Array.from({ length: 3000 }, (_, u) => Math.floor(u / 150))),
    singleDoc: mk("single-doc", Array.from({ length: 4000 }, (_, u) => Array.from({ length: 6 }, (_, k) => `x${(u * 31 + k * 17 + ((u * k) % 11)) % 400}`))) };
  out.cases = {};
  for (const [k, v] of Object.entries(cases)) { try { const r = fam.compute(v); out.cases[k] = { tokens: tokensOf(v), values: r, allFiniteOrNull: Object.values(r).every((x) => x === null || Number.isFinite(x)) }; } catch (e) { out.cases[k] = { error: String(e.message) }; } }
} else if (stage === "script") {
  const base = bookView(BOOK, "real-pride", 30000), a = fam.compute(base);
  const cyr = fam.compute(mapChars(base, (c) => String.fromCodePoint(c.codePointAt(0) + 0x350))), cjk = fam.compute(mapChars(base, (c) => String.fromCodePoint(c.codePointAt(0) + 0x4e00)));
  out.latin = a; out.cyrillicIdentical = JSON.stringify(a) === JSON.stringify(cyr); out.cjkIdentical = JSON.stringify(a) === JSON.stringify(cjk);
} else if (stage === "pockets") {
  const ids = argv.filter((x, i) => i > 0 && !x.startsWith("--") && argv[i - 1] !== "--cap");
  for (const [mod, name] of [[organic, "organic"], [codemisc, "codemisc"], [ud, "ud"]]) {
    const want = ids.filter((id) => ({ organic: id.startsWith("oc-"), codemisc: id.startsWith("cd-"), ud: id.startsWith("ud-") })[name]); if (!want.length) continue;
    for (const p of await mod.load(want)) { const H = halves(p); out[p.id] = { meta: { tokens: tokensOf({ units: p.units }), units: p.units.length, docs: new Set(p.docOf).size, tokenisation: p.meta?.tokenisation ?? null } }; for (const w of ["discover", "confirm"]) { const v = capView(H[w], CAP); const t = cpuMs(() => fam.compute(v)); out[p.id][w] = { ...row(v, atlasCells(v)), cpuMs: Math.round(t.cpu) }; log(p.id, w); } }
  }
} else if (stage === "timing") {
  const big = bookView(BIG, "real-middlemarch", 150000), flat = big.units.flat(), mkv = (id, L) => { const units = [], docOf = []; for (let i = 0; i + L <= flat.length; i += L) { units.push(flat.slice(i, i + L)); docOf.push(Math.floor(i / 3000)); } return { id, which: "discover", units, docOf }; };
  const rnd = (await import("../../../lib/pocket.mjs")).rngOf(12345), bigV = { id: "bigV", which: "discover", units: Array.from({ length: 15000 }, () => Array.from({ length: 10 }, () => "w" + Math.floor(100000 * Math.pow(rnd(), 1.6)))), docOf: Array.from({ length: 15000 }, (_, u) => Math.floor(u / 150)) };
  for (const [id, v] of [["middlemarch", big], ["bigV-100k-types", bigV], ["units5", mkv("u5", 5)], ["units100", mkv("u100", 100)]]) {
    const runs = [0, 1, 2, 3, 4].map(() => cpuMs(() => fam.compute(v))); out[id] = { tokens: tokensOf(v), types: new Set(v.units.flat()).size, cpuMsRuns: runs.map((r) => Math.round(r.cpu)), wallMsRuns: runs.map((r) => Math.round(r.wall)) }; log("timing", id);
  }
} else if (stage === "collinear") {
  const freq = await import("../../freq.mjs"), views = [];
  for (const p of await load()) { const H = halves(p); for (const w of ["discover", "confirm"]) views.push(capView(H[w], 50000)); }
  views.push(bookView(BOOK, "pride", 50000), bookView(BIG, "middlemarch", 100000));
  for (const [mod, ids] of [[organic, ["oc-irc-kubuntu-0506", "oc-irc-ubuntu-0406"]], [codemisc, ["cd-e09-python", "cd-e09-go"]], [ud, ["ud-eng", "ud-deu", "ud-cat"]]]) for (const p of await mod.load(ids)) for (const w of ["discover", "confirm"]) views.push(capView(halves(p)[w], 50000));
  const rows = views.map((v) => ({ id: v.id + ":" + v.which, p: fam.compute(v), f: freq.compute(v) })); log("computed", rows.length);
  const rank = (a) => { const o = a.map((x, i) => [x, i]).sort((x, y) => x[0] - y[0]), r = Array(a.length); let i = 0; while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
  const sp = (x, y) => { const a = rank(x), b = rank(y), n = a.length, ma = a.reduce((s, t) => s + t, 0) / n, mb = b.reduce((s, t) => s + t, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null; };
  out.n = rows.length; out.pairs = [];
  for (const ps of fam.STATS) for (const fs of freq.STATS) { const idx = rows.map((r, i) => i).filter((i) => rows[i].p[ps.id] != null && rows[i].f[fs.id] != null); if (idx.length < 12) continue; const rho = sp(idx.map((i) => rows[i].p[ps.id]), idx.map((i) => rows[i].f[fs.id])); if (rho != null) out.pairs.push({ phys: ps.id, freq: fs.id, n: idx.length, rho: round(rho, 3) }); }
  out.pairs.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho)); out.top = out.pairs.slice(0, 15);
  const own = {}; for (const a of fam.STATS) for (const b of fam.STATS) if (a.id < b.id) { const idx = rows.map((r, i) => i).filter((i) => rows[i].p[a.id] != null && rows[i].p[b.id] != null); if (idx.length >= 12) own[`${a.id}~${b.id}`] = round(sp(idx.map((i) => rows[i].p[a.id]), idx.map((i) => rows[i].p[b.id])), 3); }
  out.withinFamilyTop = Object.entries(own).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 12);
} else { console.error("unknown stage"); process.exit(1); }
fs.writeFileSync(new URL(`./results-${stage}${opt("--tag", "")}.json`, import.meta.url), JSON.stringify(out, null, 1));
log("done", stage);
