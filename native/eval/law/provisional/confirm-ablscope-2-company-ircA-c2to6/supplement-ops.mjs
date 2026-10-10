// supplement-ops.mjs -- POST-VERDICT SUPPLEMENT to confirm.mjs (ablscope-2-company-ircA-c2to6). DESCRIPTIVE ONLY, changes no registered verdict.
//   node supplement-ops.mjs
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// WHY. supplement-pop.mjs reported TPR at FPR 10% with a strict ">" threshold; for the TIED plain counts (R_INIT, ALLINIT) that gives 0 and is an artefact of the ties, not a finding. This file reports the TIE-AWARE operating points
//   of the plain initial-share count that the ablation score reduces to, on the same 23 English days, WITHOUT matching (population): for each stratum (c2, c3, c4_6, c7_15, c16p) and pooled c2..c6, the rule "ALLINIT" (every window mention of the form
//   opens its message), "R_INIT >= 0.75" and "R_INIT >= 0.5": TPR, FPR and, as a base-rate-dependent figure, precision on the sampled pool (negatives capped at 400 per day and stratum by the same seeded draw as supplement-pop.mjs, so precision
//   is indicative only). Day x quartile cluster bootstrap (B = 300) for the pooled c2..c6 TPR and FPR of ALLINIT.  No threshold is tuned: the three cut-offs are fixed here and are not fitted to any data.
// BLIND PREDICTIONS (belief). ALLINIT pooled c2..c6: TPR in [0.55, 0.85] (0.6), FPR in [0.05, 0.30] (0.6). ALLINIT at c16p: TPR falls below 0.65 (0.6).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { indexAndCandidates } from "../ablation-scope/lib-pairs.mjs";
import { rngFor, seedFor } from "../../impact.mjs";
import { occOf, initShare, quantile, round } from "./lib-dself.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), M = 256, B = 300, STR = ["c2", "c3", "c4_6", "c7_15", "c16p"];
const days = JSON.parse(fs.readFileSync(path.join(HERE, "results", "days.json"), "utf8")).english;
const header = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0], rows = [];
for (const d of days) {
  const doc = loadIrcDay(path.join(IRC_ROOT, `${d.name}.txt`), d.name), cand = indexAndCandidates(doc, M), occ = occOf(doc), rnd = rngFor(seedFor("ablscope2-pop", d.name));
  for (const st of STR) {
    const P = cand.P.filter((r) => r.grp === "A" && r.stratum === st), N0 = cand.N.filter((r) => r.grp === "A" && r.stratum === st);
    for (let k = N0.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [N0[k], N0[j]] = [N0[j], N0[k]]; }
    for (const [y, list] of [[1, P], [0, N0.slice(0, 400)]]) for (const r of list) rows.push({ st, y, ri: initShare(occ, r, M).R_INIT, block: `${d.name}|q${Math.min(3, Math.floor((4 * r.s) / cand.nMsg))}` });
  }
}
const CUTS = { ALLINIT: (x) => x >= 1 - 1e-12, "R_INIT>=0.75": (x) => x >= 0.75, "R_INIT>=0.5": (x) => x >= 0.5 };
const op = (rs, f) => { const P = rs.filter((r) => r.y), N = rs.filter((r) => !r.y), tp = P.filter((r) => f(r.ri)).length, fp = N.filter((r) => f(r.ri)).length; return { P: P.length, N: N.length, tpr: P.length ? round(tp / P.length) : null, fpr: N.length ? round(fp / N.length) : null, precisionOnPool: tp + fp ? round(tp / (tp + fp)) : null }; };
const out = { headerSha256: createHash("sha256").update(header).digest("hex"), rows: rows.length, rules: {} };
for (const [nm, f] of Object.entries(CUTS)) { out.rules[nm] = Object.fromEntries(STR.map((s) => [s, op(rows.filter((r) => r.st === s), f)])); out.rules[nm].pooledC2to6 = op(rows.filter((r) => ["c2", "c3", "c4_6"].includes(r.st)), f); }
const rnd = rngFor(seedFor("ablscope2-ops")), sub = rows.filter((r) => ["c2", "c3", "c4_6"].includes(r.st)), ids = [...new Set(sub.map((r) => r.block))], by = new Map(ids.map((b) => [b, sub.filter((r) => r.block === b)])), tp = [], fp = [];
for (let b = 0; b < B; b++) { const draw = []; for (let k = 0; k < ids.length; k++) draw.push(...by.get(ids[Math.floor(rnd() * ids.length)])); const o = op(draw, CUTS.ALLINIT); tp.push(o.tpr); fp.push(o.fpr); }
out.allinitPooledBoot = { tpr: [round(quantile(tp, 0.025)), round(quantile(tp, 0.975))], fpr: [round(quantile(fp, 0.025)), round(quantile(fp, 0.975))] };
fs.writeFileSync(path.join(HERE, "results", "supplement-ops.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ allinit: out.rules.ALLINIT, boot: out.allinitPooledBoot, ri75: out.rules["R_INIT>=0.75"].pooledC2to6, ri50: out.rules["R_INIT>=0.5"].pooledC2to6 }));
