// attack-R1_first_slot_share/postsmall.mjs: POST-HOC EXPLORATORY (announced): AUC by day size with the pooled STRATIFIED estimator (the 1-1 within-day matcher yields almost no pairs on small days, so attackB's cross-split derivation was degenerate: derived cut 150, no scored small days).
// ═══ PRE-REGISTRATION (written before the first run of this script; POST-HOC) ═══
// DISCLOSURE. I had read attackA/B/C and postdiag/postbot results. B: natural precision at 0.67 by size (D: 0.62 at 150-499, 0.70 at 500-1499, 0.82 at >= 1500; C 0.46/0.70/0.85; R >= 1500 0.86; I < 150 0.24). Not seen: AUC of small days under any estimator.
// QUESTION. Does the RANKING (AUC) survive on small days where the fixed threshold fails? Sets: EN days of D, C, I (I = 20 tiny, touched by the confirmer) and R (all >= 1500), NONEN days of D, C, I. Bins by messages: <150, 150-499, 500-1499, >=1500 (EN only for the last).
//   Estimator: strat() with key S0, positives <= 1500 per day, negatives pooled within (language group x size bin); cluster = (day,form).
// BAR (interpretation only): ranking survives in a bin iff covered >= 40 and AUC >= 0.70 and cluster-CI lower >= 0.65 and the four matched controls (i, len, cl, lc) in [0.45,0.55].
// PREDICTIONS: EN >= 500: AUC >= 0.80 (0.8); EN 150-499: in [0.70,0.88] (0.6); <150: in [0.60,0.85] with too few positives (<40 covered) (0.6); NONEN pooled small days: >= 0.75 (0.6).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, SETS, headerSha, LANG } from "./lib.mjs";
import { strat, sumStrat, round } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), EN = (k) => LANG[k.split("/")[0]] === "en", bin = (n) => (n < 150 ? "<150" : n < 500 ? "150-499" : n < 1500 ? "500-1499" : ">=1500"), out = { headerSha256: SHA, status: "POST-HOC exploratory", cells: {} };
const all = [...SETS.D, ...SETS.C, ...SETS.R, ...SETS.I].map((k) => loadDay(k)), t0 = Date.now();
for (const [gn, gf] of [["EN", (d) => LANG[d.channel] === "en"], ["NONEN", (d) => LANG[d.channel] !== "en"]]) for (const b of ["<150", "150-499", "500-1499", ">=1500"]) {
  const ds = all.filter((d) => gf(d) && bin(d.T.length) === b); if (ds.length < 2) continue;
  const s = sumStrat(strat(ds, "S0", { seed: "PS" + gn + b })); s.days = ds.length; s.matchedCtlOk = ["i", "len", "cl", "lc"].every((c) => s.auc[c] >= 0.45 && s.auc[c] <= 0.55); s.holds = s.covered >= 40 && s.auc.ishare >= 0.7 && (s.clCi?.[0] ?? 0) >= 0.65 && s.matchedCtlOk; out.cells[`${gn}|${b}`] = s; console.error(gn, b, "days", ds.length, "cov", s.covered, "auc", s.auc.ishare, JSON.stringify(s.clCi), s.matchedCtlOk);
}
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL("./results/post.small.json", import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ sha: SHA, seconds: out.seconds }));
