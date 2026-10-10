// supplement-pop.mjs -- POST-VERDICT SUPPLEMENT to confirm.mjs (ablscope-2-company-ircA-c2to6). DESCRIPTIVE ONLY: it can neither confirm nor refute the rule, and it changes no registered verdict.
//   node supplement-pop.mjs --out results/supplement-pop.json
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. I have seen every arm of confirm.mjs: EN primary AUC 0.834 (c2 0.816 / c3 0.833 / c4_6 0.844), decay arm c7_15 0.83 (no decay; R_FB 0.285 out of band, same-bin subset 0.858), R_INIT 0.880 beats -dSelf by 0.047,
//   OTHER (de/es/it) 0.714 VOID, BOOKS 0.534, UD 0.470. This file reads the SAME 23 English days again, but WITHOUT matching: every eligible message-initial occurrence with c in each stratum (all gold positives and all pool negatives,
//   negatives capped at 400 per day and stratum by a seeded draw) is scored. Purpose: the strength a reader would meet in the wild distribution, and the operating point (TPR at a fixed FPR) of the WITHIN-STRATUM RANKING (no absolute threshold).
// QUANTITIES. Per stratum (c2, c3, c4_6, c7_15, c16p): AUC of -c.dSelf and of R_INIT (population, unmatched), cluster bootstrap by day x quartile (B = 300), TPR at FPR 10% and 5% computed from the negatives' within-stratum quantile.
//   Pooled c2..c6 (pair-free): pair-weighted AUC over strata, TPR at FPR 10%. Also the same for ALLINIT. Position/count are NOT matched here, so no control band is applied; the numbers are descriptive.
// BLIND PREDICTIONS (belief). Population AUC(-dSelf) pooled c2..c6 in [0.75, 0.90] (0.65); R_INIT >= -dSelf in every stratum (0.8); TPR at FPR 10% for -dSelf in [0.45, 0.80] (0.6); population AUC at c7_15 and c16p within 0.08 of c2..c6 (0.5).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { indexAndCandidates } from "../ablation-scope/lib-pairs.mjs";
import { rngFor, seedFor } from "../../impact.mjs";
import { companyAt, occOf, initShare, aucPN, quantile, round, mean } from "./lib-dself.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUTF = path.join(HERE, opt("--out", "results/supplement-pop.json")), B = 300, M = 256, STR = ["c2", "c3", "c4_6", "c7_15", "c16p"];
const days = JSON.parse(fs.readFileSync(path.join(HERE, "results", "days.json"), "utf8")).english;
const header = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0];
const t0 = Date.now(), rows = [];
for (const d of days) {
  const doc = loadIrcDay(path.join(IRC_ROOT, `${d.name}.txt`), d.name), cand = indexAndCandidates(doc, M), occ = occOf(doc), rnd = rngFor(seedFor("ablscope2-pop", d.name));
  for (const st of STR) {
    const P = cand.P.filter((r) => r.grp === "A" && r.stratum === st), N0 = cand.N.filter((r) => r.grp === "A" && r.stratum === st);
    for (let k = N0.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [N0[k], N0[j]] = [N0[j], N0[k]]; }
    for (const [y, list] of [[1, P], [0, N0.slice(0, 400)]]) for (const r of list) {
      const o = companyAt(doc.stream, r.s, r.i, M), ini = initShare(occ, r, M);
      rows.push({ doc: d.name, st, y, nd: -o.dSelf, ri: ini.R_INIT, ai: ini.ALLINIT, block: `${d.name}|q${Math.min(3, Math.floor((4 * r.s) / cand.nMsg))}` });
    }
  }
  console.error(`${d.name} rows ${rows.length} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const auc = (rs, key) => aucPN(rs.filter((r) => r.y).map((r) => r[key]), rs.filter((r) => !r.y).map((r) => r[key]));
const tprAt = (rs, key, fpr) => { const neg = rs.filter((r) => !r.y).map((r) => r[key]), thr = quantile(neg, 1 - fpr), pos = rs.filter((r) => r.y); return pos.length ? pos.filter((r) => r[key] > thr).length / pos.length : null; };
const stats = (rs, key) => { const by = STR.map((s) => rs.filter((r) => r.st === s)); const out = {}; STR.forEach((s, k) => { const x = by[k]; out[s] = { P: x.filter((r) => r.y).length, N: x.filter((r) => !r.y).length, auc: x.some((r) => r.y) && x.some((r) => !r.y) ? round(auc(x, key)) : null, tpr10: x.some((r) => r.y) ? round(tprAt(x, key, 0.1)) : null, tpr05: x.some((r) => r.y) ? round(tprAt(x, key, 0.05)) : null }; }); return out; };
const pooled = (rs, key, strata) => { let w = 0, a = 0, tw = 0, t = 0; for (const s of strata) { const x = rs.filter((r) => r.st === s), np = x.filter((r) => r.y).length, nn = x.length - np; if (np < 2 || nn < 2) continue; a += auc(x, key) * np; w += np; t += tprAt(x, key, 0.1) * np; tw += np; } return { auc: w ? a / w : null, tpr10: tw ? t / tw : null }; };
function bootPooled(rs, key, strata, seed) {
  const rnd = rngFor(seed), ids = [...new Set(rs.map((r) => r.block))], by = new Map(ids.map((b) => [b, rs.filter((r) => r.block === b)])), xs = [];
  for (let b = 0; b < B; b++) { const draw = []; for (let k = 0; k < ids.length; k++) draw.push(...by.get(ids[Math.floor(rnd() * ids.length)])); const p = pooled(draw, key, strata); if (p.auc != null) xs.push(p.auc); }
  const p = pooled(rs, key, strata); return { auc: round(p.auc), lo: round(quantile(xs, 0.025)), hi: round(quantile(xs, 0.975)), tpr10: round(p.tpr10) };
}
const out = { what: "population (unmatched) strength of the within-stratum ranking, EN fresh days", headerSha256: createHash("sha256").update(header).digest("hex"), rows: rows.length, negativesCapPerDayStratum: 400, B };
for (const [key, nm] of [["nd", "negDSelf"], ["ri", "R_INIT"], ["ai", "ALLINIT"]]) out[nm] = { perStratum: stats(rows, key), pooledC2to6: bootPooled(rows, key, ["c2", "c3", "c4_6"], 5), pooledC7p: bootPooled(rows, key, ["c7_15", "c16p"], 6) };
out.seconds = round((Date.now() - t0) / 1000, 1);
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ file: OUTF, negDSelf: out.negDSelf.pooledC2to6, R_INIT: out.R_INIT.pooledC2to6, headerSha256: out.headerSha256 }));
