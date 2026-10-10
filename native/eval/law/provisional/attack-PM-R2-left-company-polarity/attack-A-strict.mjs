// attack-PM-R2-left-company-polarity/attack-A-strict.mjs -- ATTACK A (leakage and confounds): re-run the rule's matched-pair DLx AUC under STRICTER matching keys. NEW FILE.
//   node attack-A-strict.mjs irc|code|book|ud [stem,stem] [tag]   -> results/A.<fam>[.<tag>].jsonl      (never pass "run" as first arg)
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. Read: the confirmer's confirm.mjs, verdict.mjs, summary.json, posthoc-count.mjs, polarity-map lib/lib2/registers; ALL register-level numbers of its registered run (verdict.json tables) and the post hoc count-caliper summary. From my own smoke-reproduce.mjs
//   (sha a0d664394d69d05a) I saw: my replication of its rows reproduces its DLx AUC exactly (irc 0.6621/0.6006/0.6333/0.6354, code 0.6754/0.6175/0.6149); in IRC 92-98% of POSITIVE forms have DLx exactly 0 (all mentions unit-initial: mean edge share 0.87-0.90 vs 0.30-0.35 for
//   controls), 33-43% of negatives; in code positive edge share 0.13-0.21 vs 0.04-0.15, DLx zero share 9-19%. I did NOT look at stricter-matched numbers before writing this header.
// MECHANISM UNDER ATTACK. DLx = D_obs(left forms) - E[D_null], null keeps each mention's unit index. A mention at unit index 0 (left = "^") contributes the same "^" to both, so a form whose mentions are all unit-initial has DLx == 0 exactly (degenerate); a form with a
//   high edge share has its excess shrunk toward 0. pairsOf matches only the SAMPLED mention's bucket (ib(i), char bucket, unit-length bucket) and floor-log2 count; it does not match the FORM's edge share es (share of all its mentions at unit index 0) nor the share fs of
//   mentions with a non-degenerate null (unit index >= 1 and unit length >= 3). Ordinary controls have a negative mean DLx (rigid left company), so edge-heavy forms win by default.
// DATA. The confirmer's own fresh data re-read from its manifest (UD train window 1 of 59 treebanks, IRC en 3 channel sets + pooled 37 days, 6 novels, js/py/rb files). No new data in this script (B uses new windows). Gold only builds the P/N classes and nothing else.
// VARIANTS (all keep exact: sampled-mention unit-index bucket, char-length bucket, unit-length bucket; <= 3 pairs per form; <= 600 pairs per register; negatives used once, nearest in normalised distance):
//   M1 = absolute count within +-1;  M2 = M1 + form edge share |es-es'| <= 0.10 + |fs-fs'| <= 0.10;  M3 = M2 + both forms need >= 3 free mentions (statistic DLx and DLxF = excess over free mentions only);
//   M4 = M2 + both forms interior-only (es <= 0.20).  Statistic: my own DLx (B0=24 null draws per form, seeded by the form).  Gold-free observables only (es, fs, n from the stream).
// CELL VALID: pairs >= 40 AND control AUC (pair members, positive vs negative) in [0.45,0.55] for unit-index bucket, log2 count, es, fs. Cluster bootstrap CI (B=300, clusters = positive form).
// SURVIVAL CRITERIA (fixed now; may be tightened, never loosened). The rule's claim for a family "survives strict matching" iff, under M2, (a) >= 2 valid registers of the family, (b) the family-pooled AUC >= 0.55 with bootstrap CI lower > 0.5 for chat/code (HIGH side),
//   or the register-level claim "novels <= 0.47 in >= 2/3 of valid books" / "UD median <= 0.48 with NEG >= 25% of valid cells" for the LOW side; (c) it also holds under M1 and M4 (M3 reported, not gating).
// BLIND PREDICTIONS. IRC: M2 leaves < 40 pairs in >= 2 of 3 channel sets (0.70); where valid IRC AUC <= 0.55 (0.75); i.e. the IRC claim does NOT survive (0.80). Code: js M2 >= 0.55 (0.55), py (0.40), rb (0.40); code family pooled M2 CI lower > 0.5 (0.5).
//   Books under M2: <= 2 of 6 low (0.7). UD: median M2 <= 0.48 (0.55), NEG >= 25% (0.4). Overall: STANDS 0.10, STANDS_NARROWER (code and/or prose sign only) 0.55, FALLS 0.35.
// ═══ END OF PRE-REGISTRATION ═══
// POST-RUN AMENDMENT (outside the hashed header; written after the FIRST run of this file, whose outputs are kept in results/superseded-A-firstrun/). My first run compared DLx values EXACTLY; diagnosing why my M0 (confirmer's rows, B0=24) gave
//   0.508 where its features2 (B0=8) gave 0.662 showed that all-edge forms have DLx = +-1e-17 float noise rather than 0 (38 of 182 positive and 39 of 182 negative forms in irc-kubuntu), so exact comparison turns true ties into random wins/losses.
//   FIX (tie tolerance, applied to every statistic of this attack): values are rounded to 1e-9 before comparison (r9 in attack-lib2.mjs). Additionally a variant R0 = the confirmer's rows and ITS statistic (features2, B0=8, its own rnd) is evaluated both
//   exactly (must reproduce its AUC) and tie-tolerantly. Thresholds above are unchanged.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specs, confirmRows, headerSha, HERE, round, mean, rngFor, seedFor, rareLedge, wr } from "./attack-lib.mjs";
import { profile, candidates, strictPairs, capPerForm, aucOfRows, VAL, HALF, r9 } from "./attack-lib2.mjs";
import { features2 } from "./attack-lib.mjs";
const fam = process.argv[2], stems = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",") : null, tag = process.argv[4] ?? "";
const SHA = headerSha(fileURLToPath(import.meta.url)), OUT = path.join(HERE, "results", `A.${fam}${tag ? "." + tag : ""}.jsonl`);
const VARIANTS = { M1: { cn: 1 }, M2: { cn: 1, ces: 0.1, cfs: 0.1 }, M3: { cn: 1, ces: 0.1, cfs: 0.1, needFreeMin: 3 }, M4: { cn: 1, ces: 0.1, cfs: 0.1, esMax: 0.2 } };
const inb = (x) => x >= 0.45 && x <= 0.55, B = 300;
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ sha: SHA.slice(0, 16), ...o }) + "\n");
function cellOf(reg, variant, rows, dropped, rnd) {
  const n = rows.length / 2; if (!n) return { reg, variant, pairs: 0, dropped };
  const auc = (f, b = 0) => aucOfRows(rows, VAL[f], b, rnd), ctrl = {}; for (const c of ["pos", "logn", "es", "fs", "ch", "slen"]) ctrl[c] = auc(c).auc;
  const d = aucOfRows(rows, VAL.DLx, B, rnd), wins = [], cl = [], ids = new Map();
  for (let k = 0; k < n; k++) { wins.push(wr(VAL.DLx(rows[2 * k]), VAL.DLx(rows[2 * k + 1]))); const c = `${rows[2 * k].doc}|${rows[2 * k].w}`; if (!ids.has(c)) ids.set(c, ids.size); cl.push(ids.get(c)); }
  const valid = n >= 40 && inb(ctrl.pos) && inb(ctrl.logn) && inb(ctrl.es) && inb(ctrl.fs);
  return { reg, variant, pairs: n, dropped, nPosForms: ids.size, DLx: d, DLxF: auc("DLxF", 200), Dobs: auc("Dobs").auc, nDnull: auc("nDnull").auc, ctrl, valid, meanEsP: round(mean(rows.filter((_, k) => k % 2 === 0).map((r) => profile(r.P, r.w).es))), meanEsN: round(mean(rows.filter((_, k) => k % 2 === 1).map((r) => profile(r.P, r.w).es))), wins: wins.map((w) => (w === 1 ? "1" : w === 0 ? "0" : "h")).join(""), cl };
}
for (const s of specs(fam, stems && fam === "ud" ? { stems } : {}).filter((x) => !stems || fam === "ud" || stems.includes(x.reg))) {
  const t0 = Date.now(), bases = s.bases(); if (!bases) continue;
  emit({ reg: s.reg, fam: s.fam, kind: "props", rareL_edge: round(mean(bases.map((b) => rareLedge(b.P)).filter((x) => x !== null))), tokens: bases.reduce((a, b) => a + b.P.stream.reduce((c, u) => c + u.length, 0), 0) });
  { const { rows } = confirmRows(s, bases); emit({ fam: s.fam, ...cellOf(s.reg, "M0", rows, 0, rngFor(seedFor("pm-r2-attack-A", "M0", s.reg))) }); } // the confirmer's rows, my statistic
  { const { rows, evalRnd } = confirmRows(s, bases), F = rows.map((r) => features2(r.P, r.s, r.i, "FULL", evalRnd)).map((o) => o.DLx), [vp, vn2] = HALF(F), cl = HALF(rows)[0].map((r) => `${r.doc}|${r.w}`);
    const mk = (f) => vp.map((a, k) => wr(f(a), f(vn2[k]))), ex = mean(mk((x) => x)), tol = mean(mk(r9)), ps = (vp.filter((a) => Math.abs(a) < 1e-9).length / vp.length), nonzeroNoise = vp.filter((a) => a !== 0 && Math.abs(a) < 1e-9).length / vp.length, eqEx = mk((x) => x).filter((w) => w === 0.5).length / vp.length, eqTol = mk(r9).filter((w) => w === 0.5).length / vp.length;
    emit({ fam: s.fam, reg: s.reg, variant: "R0", pairs: vp.length, aucExact: round(ex), aucTieTol: round(tol), pShareZero: round(ps), pShareFloatNoise: round(nonzeroNoise), tieShareExact: round(eqEx), tieShareTol: round(eqTol) }); }
  for (const [vn, opt] of Object.entries(VARIANTS)) {
    const rows = [], per = Math.ceil(600 / bases.length); let dropped = 0;
    for (const b of bases) { const r = rngFor(seedFor("pm-r2-attack-A", vn, s.reg, b.name)), pr = strictPairs(candidates(b, s.def), r, opt, Math.max(3000, per * 5)); dropped += pr.dropped; rows.push(...capPerForm(pr.rows, 3).slice(0, per * 2)); }
    emit({ fam: s.fam, ...cellOf(s.reg, vn, rows, dropped, rngFor(seedFor("pm-r2-attack-A", vn, "eval", s.reg))) });
  }
  console.error(`${s.reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
