// robust-formcluster.mjs -- POST-HOC: T1 AUC with a cluster bootstrap over (day, positive form) instead of day-halves, since repeated mentions of the same nickname are not independent. Not part of the registered verdict.
import fs from "node:fs";
import path from "node:path";
import { stratAuc, quantile } from "../ablation-scope/stats.mjs";
import { rngFor } from "../../impact.mjs";
import { HERE, sEntry } from "./lib.mjs";
const design = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design.json"), "utf8")), dir = path.join(HERE, "data", "read"), reads = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".summary.json"))) { const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), m = new Map(); for (const l of fs.readFileSync(path.join(dir, f.replace(".summary.json", ".jsonl")), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); m.set(o.k, o.rec); } reads.set(`${s.doc}|${s.cond}`, m); }
const run = (arms) => {
  const by = new Map();
  for (const t of design.tokens) { if (!arms.includes(t.arm) || t.cond !== "real" || t.grp !== "B" || !["c4_6", "c7_15", "c16p"].includes(t.stratum) || t.kind !== "pair") continue;
    const S = sEntry(reads.get(`${t.doc}|real`).get(`${t.s}:${t.i}`).counts); const o = by.get(t.pair) ?? by.set(t.pair, { stratum: t.stratum }).get(t.pair); o[t.y ? "p" : "n"] = { S }; if (t.y) o.cluster = `${t.doc}|${t.w}`; }
  const pairs = [...by.values()], strata = {}; for (const x of pairs) (strata[x.stratum] ??= []).push(x);
  const cl = [...new Set(pairs.map((x) => x.cluster))], rnd = rngFor(31), f = (m) => m.S, xs = [];
  for (let b = 0; b < 3000; b++) { const cnt = new Map(); for (let k = 0; k < cl.length; k++) { const c = cl[Math.floor(rnd() * cl.length)]; cnt.set(c, (cnt.get(c) ?? 0) + 1); }
    const rs = {}; for (const [st, ps] of Object.entries(strata)) { rs[st] = []; for (const x of ps) for (let r = 0; r < (cnt.get(x.cluster) ?? 0); r++) rs[st].push(x); } const a = stratAuc(rs, f); if (a != null) xs.push(a); }
  return { arms, pairs: pairs.length, positiveForms: cl.length, auc: stratAuc(strata, f), formClusterCi: [quantile(xs, 0.025), quantile(xs, 0.975)], median: quantile(xs, 0.5) };
};
const out = { note: "POST-HOC", E_CORE: run(["E_CORE"]), E_REUSE: run(["E_REUSE"]), X: run(["X_DE", "X_ES", "X_IT"]) };
fs.writeFileSync(path.join(HERE, "results", "robust-formcluster.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
