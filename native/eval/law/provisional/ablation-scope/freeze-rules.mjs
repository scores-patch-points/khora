// freeze-rules.mjs — turn discovery (round 2) outputs into FROZEN candidate rules for the confirmation. Selection only; reads discovery data, never confirmation data.
//   candidates = (a) every run emitted by analyse-strata.mjs (results/d2/discovery.json .candidates), as emitted;
//                (b) the pre-registered extension E1: S_ENTRY >= 1 on IRC non-initial c4_6..c16p (declared here, before any confirmation record is opened);
//                (c) from scan-components.mjs: per (kind, group) the top-2 NOMINATED components by lower bound, strata = those with oriented discovery AUC >= 0.60,
//                    frozen threshold = the percentile (50..90) of the negatives that maximises balanced accuracy over those strata (the only fitted quantity).
//   limits = scope boundaries to be tested as predicted failures (S_ENTRY blind at c2/c3, S_ENTRY on the novel, cross-register transfer of every IRC rule to the novel).
import fs from "node:fs";
import crypto from "node:crypto";
import { loadRows, buildPairs, cellPairs } from "./features.mjs";
import { vec } from "./components.mjs";
import { quantile, round } from "./stats.mjs";
const D = JSON.parse(fs.readFileSync("results/d2/discovery.json", "utf8")), S = JSON.parse(fs.readFileSync("results/d2/components.json", "utf8"));
const pairs = buildPairs(loadRows("data/discovery2")); for (const x of pairs) { x.p.v = vec(x.p.raw.rec); x.n.v = vec(x.n.raw.rec); }
const cands = [], limits = [];
for (const r of D.candidates) cands.push({ tag: `slot.${r.kind}.${r.group}:${r.score}:${r.strata[0]}..${r.strata[r.strata.length - 1]}`, id: r.id, source: "analyse-strata procedure", kind: r.kind, group: r.group, strata: r.strata, scoreKind: "ablation", score: r.score, op: ">=", threshold: r.threshold, discovery: { auc: r.discoveryAuc, ci95: r.ci95, pairs: r.pairs } });
cands.push({ tag: "slot.irc.B:S_ENTRY:c4_6..c16p(E1)", id: "E1", source: "pre-registered extension of the irc.B slot arm", kind: "irc", group: "B", strata: ["c4_6", "c7_15", "c16p"], scoreKind: "ablation", score: "S_ENTRY", op: ">=", threshold: 1, discovery: null });
for (const [key, cell] of Object.entries(S.cells)) {
  if (cell.skipped) continue;
  const [kind, group] = key.split(".");
  const sorted = cell.top.filter((t) => t.nominated).sort((a, b) => b.ci[0] - a.ci[0]), noms = [], seenVec = new Set();
  for (const t of sorted) { const k = JSON.stringify(t.perStratum); if (seenVec.has(k) || noms.length >= 2) continue; seenVec.add(k); noms.push(t); }   // components with identical per-stratum AUCs are duplicates (e.g. span.activation.self = atm.activation.self)
  for (const t of noms) {
    const strata = Object.entries(t.perStratum).filter(([, a]) => a != null && a >= 0.60).map(([st]) => st);
    if (!strata.length || !cell.controlsInBand) continue;
    const by = cellPairs(pairs, kind, group, strata), all = Object.values(by).flat();
    const negs = all.map((x) => t.sign * x.n.v[t.j]), poss = all.map((x) => t.sign * x.p.v[t.j]);
    let best = null;
    for (const pc of [0.5, 0.6, 0.7, 0.8, 0.9]) { const T = quantile(negs, pc), tpr = poss.filter((v) => v > T).length / poss.length, tnr = negs.filter((v) => v <= T).length / negs.length, ba = (tpr + tnr) / 2; if (!best || ba > best.ba) best = { pc, T, tpr: round(tpr), tnr: round(tnr), ba: round(ba) }; }
    cands.push({ tag: `company.${kind}.${group}:${t.name}:${strata.join("+")}`, id: `${key}:${t.name}`, source: "scan-components nominee", kind, group, strata, scoreKind: "component", score: t.name, j: t.j, sign: t.sign, op: ">", threshold: best.T, thresholdDetail: best, discovery: { auc: t.auc, ci95: t.ci, perStratum: t.perStratum } });
  }
}
const lim = (tag, kind, group, strata, extra = {}) => limits.push({ tag, id: tag, kind, group, strata, scoreKind: "ablation", score: "S_ENTRY", op: ">=", threshold: 1, ...extra });
lim("L1_entry_ircB_floor_c2c3", "irc", "B", ["c2", "c3"]);
lim("L2_entry_book_A", "wp", "A", ["c2", "c3", "c4_6", "c7_15", "c16p"]);
lim("L3_entry_book_B", "wp", "B", ["c2", "c3", "c4_6", "c7_15", "c16p"]);
lim("L4_entry_ircA_outside_scope", "irc", "A", ["c2", "c3", "c16p"]);
lim("L5_entry_ircA_all", "irc", "A", ["c2", "c3", "c4_6", "c7_15", "c16p"]);
lim("L6_entry_ircB_all", "irc", "B", ["c2", "c3", "c4_6", "c7_15", "c16p"]);
for (const c of cands.filter((c) => c.kind === "irc")) limits.push({ ...c, tag: `X_${c.tag}__on_book`, id: `X_${c.id}`, kind: "wp" });
const out = { frozenAt: "before any confirmation record was opened", from: { discovery: "results/d2/discovery.json", components: "results/d2/components.json" }, candidates: cands, limits };
fs.writeFileSync("results/frozen-rules.json", JSON.stringify(out, null, 1));
console.log(cands.map((c) => `${c.tag} thr${c.op}${typeof c.threshold === "number" ? c.threshold.toFixed ? +c.threshold.toFixed(4) : c.threshold : c.threshold} strata ${c.strata.join(",")}`).join("\n"));
console.log("limits", limits.length, "sha", crypto.createHash("sha256").update(JSON.stringify(out)).digest("hex"));
