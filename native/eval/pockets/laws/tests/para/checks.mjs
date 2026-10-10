// checks.mjs — determinism, edge cases, worst-case timing and the length/size scan of FAMILY "para". node checks.mjs > checks.json
import fs from "node:fs";
import { cpu, evalView, proseView, sliceTokens, tokensOf } from "./_t_util.mjs";
import { lengthWorld } from "./_t_worlds.mjs";
import * as para from "../../para.mjs";
const ET = "/Users/mlacy/Documents/3.0/ethos", out = {};
const view = (units, docOf) => ({ id: "t", which: "discover", units, docOf: docOf || units.map(() => 0) });
// 1 determinism: two calls, byte-identical JSON; also on a fresh copy of the same view
{ const v = sliceTokens(proseView(`${ET}/01-literature-books/gitenberg/pg345_Dracula.txt`), 40000), a = JSON.stringify(para.compute(v)), b = JSON.stringify(para.compute({ ...v, units: v.units.map((u) => u.slice()) })); out.determinism = { identical: a === b, sample: JSON.parse(a) }; }
// 2 edge cases: each must return an object with every stat id, values number|null, no throw
const edge = {
  empty: view([], []), oneUnit: view([["a", "b", "c", "d", "e"]]), allLen1: view(Array.from({ length: 600 }, (_, i) => ["w" + (i % 7)])), allIdentical: view(Array.from({ length: 400 }, () => ["x", "y", "z", "x", "y"]), Array.from({ length: 400 }, (_, i) => Math.floor(i / 20))),
  oneHugeUnit: view([Array.from({ length: 30000 }, (_, i) => "t" + ((i * 7919) % 211))]), cjkChars: view(Array.from({ length: 500 }, (_, i) => ["我", "你", "他", "好", "们"].slice(0, 2 + (i % 4))), Array.from({ length: 500 }, (_, i) => Math.floor(i / 50))),
  twoDocsShort: view([["a", "b"], ["a", "c"], ["a", "b"]], [0, 0, 1]), noDocOf: { id: "t", which: "discover", units: [["a", "b", "c"], ["a", "b", "c"], ["a", "b", "d"]] },
};
out.edge = {};
for (const [k, v] of Object.entries(edge)) { try { const r = para.compute(v), ids = para.STATS.map((s) => s.id), ok = ids.every((i) => i in r && (r[i] === null || Number.isFinite(r[i]))); out.edge[k] = { ok, r }; } catch (e) { out.edge[k] = { ok: false, error: String(e.message) }; } }
// 3 worst-case timing (cpu seconds of ONE compute call): many tiny units, many long units, 150k tokens each
const timing = {};
for (const [name, cfg] of [["tiny-units-mean3", { mu: Math.log(3), sigma: 0.4 }], ["mean9", {}], ["long-units-mean40", { mu: Math.log(40), sigma: 0.4, maxLen: 200 }], ["alpha1.3-mean14", { alpha: 1.3, mu: Math.log(14), sigma: 0.8 }]]) {
  const w = lengthWorld({ tag: `timing-${name}`, tokens: 150000, ...cfg }); const T = []; for (let i = 0; i < 3; i++) T.push(+cpu(() => para.compute(w))[1].toFixed(3));
  timing[name] = { tokens: tokensOf(w), units: w.units.length, cpuSeconds: T };
}
out.timing = timing;
// 4 length / size scan on law-free worlds: raw v and z against mean unit length and token count
const scan = [];
for (const m of [3, 5, 8, 12, 18, 30]) for (const tk of [15000, 50000]) { const w = lengthWorld({ tag: `scan-${m}-${tk}`, tokens: tk, mu: Math.log(m), sigma: 0.4 }), r = evalView(w, w.id); scan.push({ meanLen: +(r.tokens / r.units).toFixed(2), tokens: r.tokens, stats: Object.fromEntries(para.STATS.map((s) => [s.id, { v: r.stats[s.id].v, nullMean: r.stats[s.id].nullMean, z: r.stats[s.id].z }])) }); }
out.scan = scan;
const rank = (a) => { const o = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); let i = 0; while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
const rho = (x, y) => { const a = rank(x), b = rank(y), n = a.length, ma = a.reduce((s, t) => s + t, 0) / n, mb = b.reduce((s, t) => s + t, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (a[i] - ma) * (b[i] - mb); sxx += (a[i] - ma) ** 2; syy += (b[i] - mb) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
out.scanSpearman = {};
for (const s of para.STATS) { const ok = scan.filter((r) => Number.isFinite(r.stats[s.id].v)), zs = scan.filter((r) => Number.isFinite(r.stats[s.id].z)); out.scanSpearman[s.id] = { n: ok.length, vVsMeanLen: rho(ok.map((r) => r.meanLen), ok.map((r) => r.stats[s.id].v)), vVsTokens: rho(ok.map((r) => r.tokens), ok.map((r) => r.stats[s.id].v)), zVsMeanLen: zs.length > 4 ? rho(zs.map((r) => r.meanLen), zs.map((r) => r.stats[s.id].z)) : null, zVsTokens: zs.length > 4 ? rho(zs.map((r) => r.tokens), zs.map((r) => r.stats[s.id].z)) : null, nZ: zs.length }; }
fs.writeFileSync(new URL("./checks.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ determinism: out.determinism.identical, edge: Object.fromEntries(Object.entries(out.edge).map(([k, v]) => [k, v.ok])), timing }));
