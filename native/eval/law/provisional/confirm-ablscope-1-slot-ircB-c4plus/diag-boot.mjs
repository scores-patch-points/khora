// diag-boot.mjs -- DIAGNOSTIC (not a registered test): is the percentile cluster bootstrap of the T1 AUC centred on the point estimate? Reimplements the resampling of ../ablation-scope/stats.mjs.
import fs from "node:fs";
import path from "node:path";
import { aucPN, stratAuc, quantile } from "../ablation-scope/stats.mjs";
import { rngFor } from "../../impact.mjs";
import { HERE } from "./lib.mjs";
// rebuild T1 pairs the same way analyse.mjs does, by importing its (unexported) pieces through a dynamic eval would be heavy; instead re-derive from design + reads
import { sEntry } from "./lib.mjs";
const design = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design.json"), "utf8")), dir = path.join(HERE, "data", "read"), reads = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".summary.json"))) { const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); const m = new Map(); for (const l of fs.readFileSync(path.join(dir, f.replace(".summary.json", ".jsonl")), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); m.set(o.k, o.rec); } reads.set(`${s.doc}|${s.cond}`, m); }
const by = new Map();
for (const t of design.tokens) { if (t.arm !== "E_CORE" || t.grp !== "B" || !["c4_6", "c7_15", "c16p"].includes(t.stratum) || t.kind !== "pair") continue;
  const rec = reads.get(`${t.doc}|${t.cond}`).get(`${t.s}:${t.i}`); (by.get(t.pair) ?? by.set(t.pair, { stratum: t.stratum, block: `${t.doc}|h${t.units >= 2000 ? Math.min(1, Math.floor((2 * t.s) / t.units)) : 0}` }).get(t.pair))[t.y ? "p" : "n"] = { S: sEntry(rec.counts) }; }
const pairs = [...by.values()], strata = {}; for (const x of pairs) (strata[x.stratum] ??= []).push(x);
const f = (m) => m.S, rnd = rngFor(99), blocks = [...new Set(pairs.map((x) => x.block))];
const point = stratAuc(strata, f), xs = [];
for (let b = 0; b < 4000; b++) { const draw = blocks.map(() => blocks[Math.floor(rnd() * blocks.length)]), cnt = new Map(); for (const k of draw) cnt.set(k, (cnt.get(k) ?? 0) + 1);
  const rs = {}; for (const [st, ps] of Object.entries(strata)) { rs[st] = []; for (const x of ps) for (let r = 0; r < (cnt.get(x.block) ?? 0); r++) rs[st].push(x); } const a = stratAuc(rs, f); if (a != null) xs.push(a); }
const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
console.log(JSON.stringify({ pairs: pairs.length, blocks: blocks.length, point, bootMean: mean, bootMedian: quantile(xs, 0.5), q025: quantile(xs, 0.025), q975: quantile(xs, 0.975), basicLo: 2 * point - quantile(xs, 0.975), basicHi: 2 * point - quantile(xs, 0.025),
  // pair-level bootstrap (ignores clustering) for comparison
  pairBoot: (() => { const r2 = rngFor(5), ys = []; for (let b = 0; b < 4000; b++) { const rs = {}; for (const [st, ps] of Object.entries(strata)) rs[st] = ps.map(() => ps[Math.floor(r2() * ps.length)]); const a = stratAuc(rs, f); if (a != null) ys.push(a); } return [quantile(ys, 0.025), quantile(ys, 0.5), quantile(ys, 0.975)]; })() }));
