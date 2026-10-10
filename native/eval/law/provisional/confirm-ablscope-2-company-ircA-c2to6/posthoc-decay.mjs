// posthoc-decay.mjs -- POST HOC (after confirm.mjs --arm en was analysed; no threshold, no verdict, nothing registered). Why did T12 (decay with c) fail, and is the decay arm's comparison clean?
// Reads results/rows.en.jsonl only (no recomputation of any score). Descriptive: control balance of the c7+ pairs, AUC by frequency-bin gap, by day, and the strict-caliper subset of the decay arm.
//   node posthoc-decay.mjs
import fs from "node:fs";
import { strat, aucOfPairs, controlAucs, caliperOf, boot, round, quantile } from "./lib-dself.mjs";
const rows = fs.readFileSync("results/rows.en.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.grp === "A");
const NEG = (m) => -m.dSelf, dec = rows.filter((r) => r.stratum === "c7_15" || r.stratum === "c16p"), prim = rows.filter((r) => ["c2", "c3", "c4_6"].includes(r.stratum));
const out = { decayPairs: dec.length, controls: controlAucs(dec), aucAll: round(strat(dec, NEG)) };
const gap = (x) => x.p.R_FB - x.n.R_FB;   // fbin(name) - fbin(negative)
for (const g of [-2, -1, 0, 1]) { const ps = dec.filter((x) => Math.max(-2, Math.min(1, gap(x))) === g); out[`gap${g}`] = { pairs: ps.length, auc: ps.length >= 8 ? round(strat(ps, NEG)) : null }; }
const sameFb = dec.filter((x) => gap(x) === 0); out.sameFbin = { pairs: sameFb.length, auc: round(strat(sameFb, NEG)), controls: sameFb.length >= 10 ? controlAucs(sameFb) : null };
const cal = caliperOf(dec); out.caliper = { pairs: cal.length, auc: cal.length >= 8 ? round(strat(cal, NEG)) : null };
const med = (xs) => round(quantile(xs, 0.5)); out.medianFbin = { pos: med(dec.map((x) => x.p.R_FB)), neg: med(dec.map((x) => x.n.R_FB)) };
out.byDay = Object.fromEntries([...new Set(dec.map((x) => x.doc))].map((d) => { const ps = dec.filter((x) => x.doc === d); return [d, [ps.length, ps.length >= 10 ? round(strat(ps, NEG)) : null]]; }));
out.rinitAuc = { primary: round(strat(prim, (m) => m.R_INIT)), decay: round(strat(dec, (m) => m.R_INIT)) };
out.medianDSelfDecay = { pos: med(dec.map((x) => x.p.dSelf)), neg: med(dec.map((x) => x.n.dSelf)) };
out.fbinAucAsScore = { note: "AUC of -docFreqBin (rarer = name) as a score on the decay pairs", auc: round(strat(dec, (m) => -m.R_FB)) , onPrimary: round(strat(prim, (m) => -m.R_FB)) };
console.log(JSON.stringify(out, null, 1));
