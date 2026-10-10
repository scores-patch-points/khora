// attack-PM-R2-left-company-polarity/attack-B-newdata.mjs -- ATTACK B (forking paths): a DIFFERENT SPLIT of the confirmer's own data. NEW FILE.
//   node attack-B-newdata.mjs ud [stem,stem|-] [tag]   -> results/B.ud.<tag>.jsonl   : UD train WINDOW 2 (disjoint from the confirmer's window 1, >= 100 sentences gap each side, >= 30k tokens) of each treebank
//   node attack-B-newdata.mjs code [-] [tag]           -> results/B.code.<tag>.jsonl : code files one by one (pair-level wins kept per file, for leave-one-file-out and random half-splits)
//   (never pass "run" as first arg)
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. Read the confirmer's header/results, attack A (tie-tolerant, UD windows 1 and code/book/IRC), attack C and A2. Seen numbers that motivate this script: UD window-1 M2 median 0.4526 (pooled valid 0.4367), 22 of 57 NEG, rho(rareL_edge, AUC) inside UD +0.058 (confirmer, registered
//   statistic); code M2 js 0.666-0.690, py 0.599-0.614, rb 0.551-0.593 (two seeds); code P1 'nonUd' rho +0.857 on n=7 registers (3 code + 4 books). I have NOT seen anything about UD window 2 or per-file code cells.
// WHY. The rule's scope was chosen after the discovery data; the confirmation shows (a) cross-register rho of rareL_edge with DLx AUC only +0.262 (fails 0.30) and (b) near-zero rho inside UD. B asks: (1) is the UD "LOW" sign a stable property of the treebank (window 1 vs window 2 agree?) or a lucky sample;
//   (2) does the rareL_edge property predict the AUC inside UD on twice the windows; (3) is the code HIGH sign carried by a few files (leave-one-file-out, random half-splits); (4) is the family-level correlation just a family contrast (done in summarize-B.mjs from existing cells).
// DATA. UD: train split of the 59 treebanks of /Users/mlacy/Documents/data/ud, window 2 (the confirmer used a window starting at its seeded start; mine starts 100 sentences after the end of its window, so the two windows are disjoint; whole-file treebanks without 30k spare tokens are skipped).
//   Code: the confirmer's 12 js + 12 py + 8 rb files (not fresh; split analysis only). Gold only builds the classes (UPOS PO; parser U vs E).
// VARIANTS. R0m = the rule's matching (pairsOf LATER) with my tie-tolerant DLx; M2 = count +-1, es +-0.10, fs +-0.10 (as A). Valid cell: pairs >= 40, controls pos/logn/es/fs in [0.45,0.55]. Per file (code): <= 200 pairs per file.
// CRITERIA (fixed now). (1) UD window agreement: Spearman over treebanks of AUC_M2(w1) vs AUC_M2(w2) >= +0.30 -> "language-stable"; a window-2 family median M2 <= 0.48 with NEG >= 25% of valid windows -> "LOW sign replicates". (2) rho(rareL_edge, M2 AUC) inside UD windows (w1+w2): the property claim needs rho >= +0.30 one-sided perm p < 0.05.
//   (3) code HIGH sign "not carried by a few files": for js, py, rb the leave-one-file-out pooled M2 AUC stays >= 0.55 in every omission, and >= 90% of 400 random half-splits (files) have pooled AUC >= 0.55 (py/rb: >= 0.55 in >= 80%).
// BLIND PREDICTIONS. (1) agreement rho +0.25 (>= 0.30: 0.4); LOW replicates (0.85). (2) inside UD rho in [-0.2,+0.2] (0.75), >= +0.30 (0.05). (3) js LOO all >= 0.55 (0.9) and halves >= 90% (0.85); py LOO all >= 0.55 (0.5), halves >= 80% (0.45); rb LOO all >= 0.55 (0.3), halves >= 80% (0.25).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specs, headerSha, HERE, round, mean, rngFor, seedFor, rareLedge, wr, docOf, formCap, pairsOf, R, MAN } from "./attack-lib.mjs";
import { profile, candidates, strictPairs, capPerForm, aucOfRows, VAL } from "./attack-lib2.mjs";
const mode = process.argv[2], sel = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",") : null, tag = process.argv[4] ?? "";
const SHA = headerSha(fileURLToPath(import.meta.url)), OUT = path.join(HERE, "results", `B.${mode}${tag ? "." + tag : ""}.jsonl`), emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ sha: SHA.slice(0, 16), ...o }) + "\n");
const M2 = { cn: 1, ces: 0.1, cfs: 0.1 }, inb = (x) => x >= 0.45 && x <= 0.55, B = 300;
function cell(reg, variant, rows, dropped, rnd, extra = {}) {
  const n = rows.length / 2; if (!n) return { reg, variant, pairs: 0, dropped, ...extra };
  const ctrl = {}; for (const c of ["pos", "logn", "es", "fs"]) ctrl[c] = aucOfRows(rows, VAL[c], 0, rnd).auc;
  const d = aucOfRows(rows, VAL.DLx, B, rnd), wins = [], cl = [], ids = new Map();
  for (let k = 0; k < n; k++) { wins.push(wr(VAL.DLx(rows[2 * k]), VAL.DLx(rows[2 * k + 1]))); const c = `${rows[2 * k].doc}|${rows[2 * k].w}`; if (!ids.has(c)) ids.set(c, ids.size); cl.push(ids.get(c)); }
  return { reg, variant, pairs: n, dropped, DLx: d, Dobs: aucOfRows(rows, VAL.Dobs, 0, rnd).auc, ctrl, valid: n >= 40 && inb(ctrl.pos) && inb(ctrl.logn) && inb(ctrl.es) && inb(ctrl.fs), wins: wins.map((w) => (w === 1 ? "1" : w === 0 ? "0" : "h")).join(""), cl, ...extra };
}
const r0rows = (b, def, rnd, per) => { const pr = pairsOf(docOf(b, def, "FULL", b.P, b.gold), "LATER", rnd, Math.max(3000, per * 5)); return { rows: formCap(pr.rows, 3, per).map((x) => ({ ...x, P: b.P, doc: b.name })), dropped: pr.dropped }; };
if (mode === "ud") {
  for (const s of specs("ud", { window: 2, ...(sel ? { stems: sel } : {}) })) {
    const t0 = Date.now(), bases = s.bases(); if (!bases) { console.error(`${s.reg} no window 2`); continue; } const b = bases[0], rl = round(rareLedge(b.P));
    emit({ reg: s.reg, kind: "props", rareL_edge: rl, tokens: b.P.stream.reduce((a, u) => a + u.length, 0), window: b.window });
    { const { rows, dropped } = r0rows(b, s.def, rngFor(seedFor("pm-r2-attack-B", "R0m", s.reg)), 600); emit({ ...cell(s.reg, "R0m", rows, dropped, rngFor(seedFor("pm-r2-attack-B", "R0m-eval", s.reg))), fam: "ud", rareL_edge: rl }); }
    { const pr = strictPairs(candidates(b, s.def), rngFor(seedFor("pm-r2-attack-B", "M2", s.reg)), M2, 3000); emit({ ...cell(s.reg, "M2", capPerForm(pr.rows, 3).slice(0, 1200), pr.dropped, rngFor(seedFor("pm-r2-attack-B", "M2-eval", s.reg))), fam: "ud", rareL_edge: rl }); }
    console.error(`${s.reg} w2 done ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} else if (mode === "code") {
  for (const s of specs("code").filter((x) => !sel || sel.includes(x.reg))) {
    const bases = s.bases();
    for (const [k, b] of bases.entries()) { const t0 = Date.now(), rl = round(rareLedge(b.P));
      const pr = strictPairs(candidates(b, s.def), rngFor(seedFor("pm-r2-attack-B", "M2file", s.reg, String(k))), M2, 3000);
      emit({ ...cell(`${s.reg}#${k}`, "M2", capPerForm(pr.rows, 3).slice(0, 400), pr.dropped, rngFor(seedFor("pm-r2-attack-B", "M2file-eval", s.reg, String(k)))), fam: "code", lang: s.reg, file: k, rareL_edge: rl, tokens: b.P.stream.reduce((a, u) => a + u.length, 0) });
      const { rows, dropped } = r0rows(b, s.def, rngFor(seedFor("pm-r2-attack-B", "R0file", s.reg, String(k))), 200); emit({ ...cell(`${s.reg}#${k}`, "R0m", rows, dropped, rngFor(seedFor("pm-r2-attack-B", "R0file-eval", s.reg, String(k)))), fam: "code", lang: s.reg, file: k, rareL_edge: rl });
      console.error(`${s.reg}#${k} done ${((Date.now() - t0) / 1000).toFixed(1)}s`); }
  }
} else throw new Error("mode ud|code");
