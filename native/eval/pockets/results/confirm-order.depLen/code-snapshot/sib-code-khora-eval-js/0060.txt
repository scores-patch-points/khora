// attack-PM-R2-left-company-polarity/attack-C-rivals.mjs -- ATTACK C (count / cheap-observable RIVAL and company-destroyed control, on the SAME rows). NEW FILE.
//   node attack-C-rivals.mjs irc|code|book|ud [stem,stem|-] [tag]   -> results/C.<fam>[.tag].jsonl      (never pass "run" as first arg)
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. Read everything listed in attack-A-strict.mjs's header, and the RESULTS of attack A (results/A-summary.json, tie-tolerant run): IRC es(P) 0.87-0.90 vs es(N) 0.35-0.42, M2 leaves 94 IRC pairs total (AUC 0.48/0.60/0.51, controls invalid), M3/M4 12/4 pairs;
//   code M2 (count +-1, es and fs +-0.10) js 0.666, py 0.599, rb 0.593 with all four controls in [0.45,0.55]; code-py char-length control AUC 0.634 (names longer than controls inside the 4 char buckets) in M2; novels get LOWER under strict matching (M2 0.31-0.45, 6/6 <= 0.47);
//   UD M2 median 0.4425 (valid 52 of 57, NEG 22). I also saw (smoke, A) that the rule's DLx AUC contains float-tie noise (see attack-A header amendment) and the es control AUC on the confirmer's rows (code 0.61-0.70, IRC 0.86-0.94, books 0.58-0.74).
// QUESTION. Does a trivially cheaper, label-free, form-level observable reproduce the effect within 0.03 AUC on the SAME rows, and does the DLx effect survive when the rows are matched on that rival? Does a company-destroyed control read 0.5 on the same rows?
// ROW SETS (same register data as A): R0 = the confirmer's rows (exact reproduction); M2 = count +-1, es +-0.10, fs +-0.10 (as A); M5 = M2 + char length |dch| <= 1 + mean unit length within 25% (stricter on the two rival keys that pairsOf only buckets).
// RIVALS (pair AUC, P larger = 1; orientation fixed by mechanism BEFORE looking at C): es (edge share of mentions; mechanism: more edge -> excess shrunk toward 0 from below -> higher DLx), nfs = -fs (free-mention share), nDnull = -D_null (the company-free half of DLx: unit composition + positions only),
//   Dobs (raw left diversity). Orientation-free (generous to rivals; reported as |AUC-0.5|): logn (count), ch (char length), slen (unit length of sampled mention), ml (mean unit length of all mentions), mi (mean unit index), ls (last-position share), bin (own rank bin).
// RULE FOR "RIVAL REPRODUCES": a rival reproduces the DLx effect on a row set iff its mechanism-oriented AUC (or, for orientation-free rivals, max(AUC,1-AUC) in the same direction as the DLx deviation) is >= AUC(DLx) - 0.03 when AUC(DLx) > 0.5, or <= AUC(DLx) + 0.03 when AUC(DLx) < 0.5.
//   "DLx SURVIVES the rival control" iff on M2 and M5 (valid cells: pairs >= 40, controls pos/logn/es/fs in [0.45,0.55]) the family-pooled AUC is >= 0.55 with cluster CI lower > 0.5 (HIGH side) or <= 0.47 with CI upper < 0.5 (LOW side).
// COMPANY-DESTROYED CONTROL (same rows): the observed left neighbours of each form are replaced by an independent position-preserving null draw (positions, units, mention counts kept); 20 repeats per cell; the control passes if its mean AUC is in [0.47,0.53].
// BLIND PREDICTIONS. R0: es reproduces DLx in IRC (0.95), in code js/py/rb (0.70 each), books (0.5; books LOW side), UD (0.4); count (logn) does NOT reproduce in any family (0.90). M2: DLx stays >= 0.55 with CI lower > 0.5 in code pooled (0.80); M5: js (0.70), py (0.45), rb (0.40).
//   Company-destroyed control reads in [0.47,0.53] for code, books and UD (0.85); for IRC it also reads ~0.5 (0.6) although the real effect lives in the degenerate zero cases. Overall: effect is NOT a count artefact (0.90); IRC effect IS an edge-share artefact (0.85); code effect survives M5 pooled (0.55).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specs, confirmRows, headerSha, HERE, round, mean, rngFor, seedFor, rareLedge, wr, features2 } from "./attack-lib.mjs";
import { profile, candidates, strictPairs, capPerForm, aucOfRows, VAL, HALF, r9, shamDLx } from "./attack-lib2.mjs";
const fam = process.argv[2], stems = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",") : null, tag = process.argv[4] ?? "";
const SHA = headerSha(fileURLToPath(import.meta.url)), OUT = path.join(HERE, "results", `C.${fam}${tag ? "." + tag : ""}.jsonl`);
const VARIANTS = { M2: { cn: 1, ces: 0.1, cfs: 0.1 }, M5: { cn: 1, ces: 0.1, cfs: 0.1, cch: 1, cml: 0.25 } };
const inb = (x) => x >= 0.45 && x <= 0.55, B = 300, S = 20, RIV = ["DLx", "es", "nfs", "nDnull", "Dobs", "logn", "ch", "slen", "ml", "mi", "ls", "bin"];
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ sha: SHA.slice(0, 16), ...o }) + "\n");
function cellOf(reg, variant, rows, dropped, rnd, ruleVals) {
  const n = rows.length / 2; if (!n) return { reg, variant, pairs: 0, dropped };
  const auc = {}; for (const f of RIV) auc[f] = aucOfRows(rows, VAL[f], f === "DLx" ? B : 0, rnd);
  const ctrl = { pos: aucOfRows(rows, VAL.pos, 0, rnd).auc, logn: auc.logn.auc, es: auc.es.auc, fs: aucOfRows(rows, VAL.fs, 0, rnd).auc };
  const sham = []; for (let t = 0; t < S; t++) { const sr = rngFor(seedFor("pm-r2-attack-C", "sham", reg, variant, String(t))), v = new Map(); const f = (r) => { const k = `${r.doc}|${r.w}`; if (!v.has(k)) v.set(k, shamDLx(r.P, r.w, sr)); return v.get(k); }; sham.push(aucOfRows(rows, f, 0, rnd).auc); }
  const sm = mean(sham), sd = Math.sqrt(mean(sham.map((x) => (x - sm) ** 2)));
  const wins = [], cl = [], ids = new Map(); for (let k = 0; k < n; k++) { wins.push(wr(VAL.DLx(rows[2 * k]), VAL.DLx(rows[2 * k + 1]))); const c = `${rows[2 * k].doc}|${rows[2 * k].w}`; if (!ids.has(c)) ids.set(c, ids.size); cl.push(ids.get(c)); }
  const out = { reg, variant, pairs: n, dropped, auc: Object.fromEntries(Object.entries(auc).map(([k, v]) => [k, v.auc])), DLx: auc.DLx, ctrl, valid: n >= 40 && inb(ctrl.pos) && inb(ctrl.logn) && inb(ctrl.es) && inb(ctrl.fs), shamMean: round(sm), shamSd: round(sd), wins: wins.map((w) => (w === 1 ? "1" : w === 0 ? "0" : "h")).join(""), cl };
  if (ruleVals) out.DLxRule = round(mean(ruleVals.map(([a, b]) => wr(r9(a), r9(b)))));
  return out;
}
for (const s of specs(fam, stems && fam === "ud" ? { stems } : {}).filter((x) => !stems || fam === "ud" || stems.includes(x.reg))) {
  const t0 = Date.now(), bases = s.bases(); if (!bases) continue;
  { const { rows, evalRnd } = confirmRows(s, bases), F = rows.map((r) => features2(r.P, r.s, r.i, "FULL", evalRnd).DLx), [vp, vn] = HALF(F);
    emit({ fam: s.fam, ...cellOf(s.reg, "R0", rows, 0, rngFor(seedFor("pm-r2-attack-C", "R0", s.reg)), vp.map((a, k) => [a, vn[k]])) }); }
  for (const [vn, opt] of Object.entries(VARIANTS)) {
    const rows = [], per = Math.ceil(600 / bases.length); let dropped = 0;
    for (const b of bases) { const r = rngFor(seedFor("pm-r2-attack-C", vn, s.reg, b.name)), pr = strictPairs(candidates(b, s.def), r, opt, Math.max(3000, per * 5)); dropped += pr.dropped; rows.push(...capPerForm(pr.rows, 3).slice(0, per * 2)); }
    emit({ fam: s.fam, ...cellOf(s.reg, vn, rows, dropped, rngFor(seedFor("pm-r2-attack-C", vn, "eval", s.reg)), null) });
  }
  console.error(`${s.reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
