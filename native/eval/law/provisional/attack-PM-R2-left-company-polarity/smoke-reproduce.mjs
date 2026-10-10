// attack-PM-R2-left-company-polarity/smoke-reproduce.mjs -- IMPLEMENTATION CHECK + DESCRIPTIVE look (not a test of the rule). NEW FILE.
//   node smoke-reproduce.mjs irc|code|book|ud [stem,stem]  -> stdout JSON lines
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. I have read the confirmer's confirm.mjs/verdict.mjs/summary.json and the first cell lines of results/conf.irc.jsonl. Seen: DLx AUC per register; in irc-kubuntu REAL cell the DLx meanP is 0 (exactly) vs meanN -0.035 and the raw DLf AUC
//   is 0.085 (meanP 0.196 vs meanN 0.794). From that I HYPOTHESISE (not yet tested) that DLx = D_obs - D_null is exactly 0 for a form all of whose mentions are unit-initial (or whose null is degenerate), that matching only
//   matches the SAMPLED mention's position bucket, not the form's edge share, and that ordinary controls have a negative mean DLx, so that edge-heavy forms win by default (an edge-share / degeneracy artefact).
// WHAT THIS FILE DOES. Re-draws the confirmer's rows with its own seeds and checks that the rule's DLx AUC (features2, B0=8) is reproduced to 1e-3; then reports descriptive shares only (share of positive/negative forms with DLx exactly 0, mean edge share).
// THRESHOLDS. Reproduction passes if |AUC_mine - AUC_confirmer| <= 0.001 (same code, same seeds). No claim about the rule is made by this file. BLIND PREDICTION: reproduces exactly (0.9); share of P forms with DLx==0 in IRC >= 0.3 (0.7).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { specs, confirmRows, features2, headerSha, HERE, CONF, round, mean, MAN } from "./attack-lib.mjs";
import { profile, HALF, aucOfRows } from "./attack-lib2.mjs";
import { rngFor, seedFor } from "./attack-lib.mjs";
import { fileURLToPath } from "node:url";
const fam = process.argv[2], stems = process.argv[3] ? process.argv[3].split(",").map((s) => (fam === "ud" ? s : s)) : null;
const SHA = headerSha(fileURLToPath(import.meta.url));
const conf = Object.fromEntries(fs.readdirSync(path.join(CONF, "results")).filter((f) => /^conf\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(CONF, "results", f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))).filter((r) => r.ctl === "real").map((r) => [r.reg, r]));
const sp = specs(fam, stems && fam === "ud" ? { stems } : {}).filter((s) => !stems || fam === "ud" || stems.includes(s.reg));
for (const s of sp) {
  const bases = s.bases(); if (!bases) continue; const { rows, evalRnd } = confirmRows(s, bases);
  const F = rows.map((r) => features2(r.P, r.s, r.i, "FULL", evalRnd)), [vp, vn] = HALF(F.map((o) => o.DLx));
  const wins = vp.map((a, k) => (a > vn[k] ? 1 : a === vn[k] ? 0.5 : 0)), auc = mean(wins);
  const pf = new Set(rows.filter((r) => r.y === 1).map((r) => r.w)), nf = new Set(rows.filter((r) => r.y === 0).map((r) => r.w));
  const z = (S) => [...S].filter((w) => Math.abs(profile(rows.find((r) => r.w === w).P, w).DLx) < 1e-12).length / S.size;
  const es = (S) => mean([...S].map((w) => profile(rows.find((r) => r.w === w).P, w).es));
  console.log(JSON.stringify({ sha: SHA.slice(0, 16), reg: s.reg, pairs: rows.length / 2, aucMine: round(auc), aucConf: conf[s.reg]?.DLx.auc ?? null, ok: conf[s.reg] ? Math.abs(round(auc) - conf[s.reg].DLx.auc) <= 0.001 : null,
    posForms: pf.size, negForms: nf.size, posShareDLxZero: round(z(pf)), negShareDLxZero: round(z(nf)), posMeanEdgeShare: round(es(pf)), negMeanEdgeShare: round(es(nf)), meanDLxP: round(mean(vp)), meanDLxN: round(mean(vn)) }));
}
