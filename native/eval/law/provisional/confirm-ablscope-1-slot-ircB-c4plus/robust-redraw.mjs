// robust-redraw.mjs -- POST-HOC ROBUSTNESS of T1 (written after confirmation.json was read; not part of the registered verdict): is the primary AUC an artefact of the one matched draw or of the balance swap?
// Variants on the E_CORE days, group B, strata c4_6 / c7_15 / c16p: V0 = registered design (swap, tag ac); V1 = matching v3 WITHOUT swap, tag ac; V2 = swap, other seed tag "ac-r2"; V3 = no swap, tag "ac-r3".
// Tokens not yet read are read with the same reader and seed tag as the registered run and kept in memory only (the registered data/read files are untouched).
import fs from "node:fs";
import path from "node:path";
import { impactBatch } from "../../impact.mjs";
import { aucPN, stratAuc, bootStrat, round } from "../ablation-scope/stats.mjs";
import { HERE, M_IRC, loadDocCond, buildDocPairs, seedTagOf, sEntry, ctlOf, CONTROLS } from "./lib.mjs";
const design = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design.json"), "utf8"));
const days = [...new Set(design.tokens.filter((t) => t.arm === "E_CORE").map((t) => t.doc))];
const cells = ["c4_6", "c7_15", "c16p"].map((stratum) => ({ grp: "B", stratum, n: 999 }));
const known = new Map(); { const dir = path.join(HERE, "data", "read"); for (const d of days) { const f = path.join(dir, `${d.replace(/[/:]/g, "_")}.real.jsonl`); if (fs.existsSync(f)) for (const l of fs.readFileSync(f, "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); known.set(`${d}|${o.k}`, o.rec); } } }
const variants = { V0: { tag: "ac", swapIters: 3 }, V1: { tag: "ac", swapIters: 0 }, V2: { tag: "ac-r2", swapIters: 3 }, V3: { tag: "ac-r3", swapIters: 0 } }, out = { note: "POST-HOC robustness; not part of the registered verdict", variants: {} };
const need = new Map(), built = {};
for (const d of days) { const doc = loadDocCond(d, "real"); for (const [v, o] of Object.entries(variants)) { const r = buildDocPairs(doc, M_IRC, cells, o); (built[v] ??= []).push(...r.pairs.map((x) => ({ ...x, doc: d, units: doc.stream.length })));
  for (const x of r.pairs) for (const t of [x.pos, x.neg]) if (!known.has(`${d}|${t.s}:${t.i}`)) (need.get(d) ?? need.set(d, new Map()).get(d)).set(`${t.s}:${t.i}`, { s: t.s, i: t.i, id: t.w }); } }
for (const [d, m] of need) { const doc = loadDocCond(d, "real"), list = [...m.entries()], res = impactBatch(doc.stream, list.map(([, t]) => t), { M: M_IRC, F: 0, modes: ["delete"], seedTag: seedTagOf(d, "real"), maxSeconds: Infinity });
  list.forEach(([k], j) => { const r = res.records.delete[j]; if (r && !r.gap) known.set(`${d}|${k}`, { counts: Array.from(r.counts) }); }); }
for (const [v, ps] of Object.entries(built)) {
  const rows = ps.filter((x) => known.has(`${x.doc}|${x.pos.s}:${x.pos.i}`) && known.has(`${x.doc}|${x.neg.s}:${x.neg.i}`)).map((x) => ({ stratum: x.stratum, block: `${x.doc}|h${x.units >= 2000 ? Math.min(1, Math.floor((2 * x.pos.s) / x.units)) : 0}`,
    p: { S: sEntry(known.get(`${x.doc}|${x.pos.s}:${x.pos.i}`).counts), ...ctlOf(x.pos) }, n: { S: sEntry(known.get(`${x.doc}|${x.neg.s}:${x.neg.i}`).counts), ...ctlOf(x.neg) } }));
  const by = {}; for (const r of rows) (by[r.stratum] ??= []).push(r);
  const b = bootStrat(by, (m) => m.S, { B: 2000, seed: 77 });
  out.variants[v] = { ...variants[v], pairs: rows.length, auc: b.point, ci: [b.lo, b.hi], sens: round(rows.filter((r) => r.p.S >= 1).length / rows.length), spec: round(rows.filter((r) => r.n.S === 0).length / rows.length),
    controls: Object.fromEntries(CONTROLS.map((c) => [c, round(stratAuc(by, (m) => m[c]))])), perStratum: Object.fromEntries(Object.entries(by).map(([st, ps2]) => [st, [ps2.length, round(aucPN(ps2.map((r) => r.p.S), ps2.map((r) => r.n.S)))]])) };
}
fs.writeFileSync(path.join(HERE, "results", "robust-redraw.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
