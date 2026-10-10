// attack-PM-R2-left-company-polarity/attack-A2-irc-wide.mjs -- ATTACK A2: the IRC part of the rule on ALL available Ubuntu IRC days (English 4 channels, German, Spanish, Italian), strict matching. NEW FILE.
//   node attack-A2-irc-wide.mjs [registerName|-] [tag]  -> results/A2.irc[.tag].jsonl      (never pass "run" as first arg)
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. I have read the results of attack A (tie-tolerant) and C: in the confirmer's 3 English channel sets (37 days, 3.3-4.0k messages each) the rule's DLx AUC is 0.60-0.61 tie-tolerantly (0.60-0.66 exactly), the form-level edge share of nicknames is 0.87-0.90 vs 0.35-0.42 for
//   controls, M2 (count +-1, es +-0.10, fs +-0.10) leaves only 94 pairs in total (AUC 0.48/0.60/0.51, pooled 0.53 [0.49,0.59]), M3/M4 leave 12/4 pairs. The small pair counts are the limit of THAT data, so this script uses ALL days on disk to test whether a larger sample changes the verdict.
// DATA. NOT FRESH: every English and non-English day of the ubuntu-irc channels (en: ubuntu 23 days, kubuntu 22, xubuntu 18, ubuntu-server 17; de ubuntu-de 11; es ubuntu-es 10; it ubuntu-it 11), including days the scoper and other lenses already read. The purpose is robustness of the confound
//   (edge-share degeneracy), not replication. Classes exactly as R.ircBase/IRC_DEFS.NK (nick with >= 3 messages that day, not the speaker, not a topic word = P; non-nick word >= 3 chars = N). Registers: per channel and pooled-per-language (en-all80, de, es, it).
// VARIANTS. R0 = the rule's own pipeline (pairsOf LATER exact on floor-log2 count bin, unit-index bucket, char bucket, unit-length bucket; <= 3 per form; cap 600 pairs) with the rule's statistic features2.DLx (B0=8) compared TIE-TOLERANTLY (1e-9) and with my DLx (B0=24).
//   M1 = count +-1; M2 = M1 + es +-0.10 + fs +-0.10; M4 = M2 + both forms interior-only (es <= 0.20) [as attack A]. Valid cell: pairs >= 40 and controls pos/logn/es/fs in [0.45,0.55]. Cluster bootstrap CI over positive forms (B=300).
// CRITERIA (same as A, fixed now). A language group "survives strict matching" iff the pooled M2 AUC >= 0.55 with CI lower > 0.5 AND the same for M4 when M4 has >= 40 pairs. The rule's IRC discovery claim (en 0.68, de 0.58, es 0.63, it 0.61) is compared with R0 tie-tolerant.
// BLIND PREDICTIONS. R0 tie-tolerant: en channels 0.57-0.65, de/es/it 0.55-0.65 (0.7). M2 pooled en: <= 0.55 or CI lower <= 0.5 (0.8); de/es/it M2: <= 0.55 (0.75, small n). M4: fewer than 40 pairs in every group (0.7). Overall IRC does not survive (0.8).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { R, headerSha, HERE, round, mean, rngFor, seedFor, wr, docOf, formCap, pairsOf, features2 } from "./attack-lib.mjs";
import { profile, candidates, strictPairs, capPerForm, aucOfRows, VAL, HALF, r9 } from "./attack-lib2.mjs";
const only = process.argv[2] && process.argv[2] !== "-" ? process.argv[2] : null, tag = process.argv[3] ?? "";
const SHA = headerSha(fileURLToPath(import.meta.url)), OUT = path.join(HERE, "results", `A2.irc${tag ? "." + tag : ""}.jsonl`), emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ sha: SHA.slice(0, 16), ...o }) + "\n");
const GROUPS = { "en-ubuntu": [["ubuntu"], "en"], "en-kubuntu": [["kubuntu"], "en"], "en-xubuntu": [["xubuntu"], "en"], "en-ubuntu-server": [["ubuntu-server"], "en"], "en-all": [["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"], "en"], de: [["ubuntu-de"], "de"], es: [["ubuntu-es"], "es"], it: [["ubuntu-it"], "it"] };
const VARIANTS = { M1: { cn: 1 }, M2: { cn: 1, ces: 0.1, cfs: 0.1 }, M4: { cn: 1, ces: 0.1, cfs: 0.1, esMax: 0.2 } }, inb = (x) => x >= 0.45 && x <= 0.55, B = 300;
function cell(reg, variant, rows, dropped, rnd) {
  const n = rows.length / 2; if (!n) return { reg, variant, pairs: 0, dropped };
  const ctrl = {}; for (const c of ["pos", "logn", "es", "fs", "ch", "slen"]) ctrl[c] = aucOfRows(rows, VAL[c], 0, rnd).auc;
  const d = aucOfRows(rows, VAL.DLx, B, rnd), wins = [], cl = [], ids = new Map();
  for (let k = 0; k < n; k++) { wins.push(wr(VAL.DLx(rows[2 * k]), VAL.DLx(rows[2 * k + 1]))); const c = `${rows[2 * k].doc}|${rows[2 * k].w}`; if (!ids.has(c)) ids.set(c, ids.size); cl.push(ids.get(c)); }
  return { reg, variant, pairs: n, dropped, nPosForms: ids.size, DLx: d, Dobs: aucOfRows(rows, VAL.Dobs, 0, rnd).auc, ctrl, valid: n >= 40 && inb(ctrl.pos) && inb(ctrl.logn) && inb(ctrl.es) && inb(ctrl.fs), meanEsP: round(mean(rows.filter((_, k) => k % 2 === 0).map((r) => profile(r.P, r.w).es))), meanEsN: round(mean(rows.filter((_, k) => k % 2 === 1).map((r) => profile(r.P, r.w).es))), wins: wins.map((w) => (w === 1 ? "1" : w === 0 ? "0" : "h")).join(""), cl };
}
for (const [reg, [chs, lang]] of Object.entries(GROUPS)) {
  if (only && only !== reg) continue; const t0 = Date.now(), days = R.ircCandidates(chs, 0, lang), base = R.ircBase(`a2-${reg}`, days), P = base.P;
  emit({ reg, kind: "props", days: days.length, units: P.stream.length, tokens: P.stream.reduce((a, u) => a + u.length, 0) });
  { const r = rngFor(seedFor("pm-r2-attack-A2", "R0", reg)), pr = pairsOf(docOf(base, R.IRC_DEFS.NK, "FULL", P, base.gold), "LATER", r, 1500), rows = formCap(pr.rows, 3, 600).map((x) => ({ ...x, P, doc: base.name })), er = rngFor(seedFor("pm-r2-attack-A2", "R0eval", reg));
    const F = rows.map((x) => features2(P, x.s, x.i, "FULL", er).DLx), [vp, vn] = HALF(F), tol = mean(vp.map((a, k) => wr(r9(a), r9(vn[k])))), ex = mean(vp.map((a, k) => wr(a, vn[k])));
    emit({ ...cell(reg, "R0", rows, pr.dropped, rngFor(seedFor("pm-r2-attack-A2", "R0b", reg))), ruleAucExact: round(ex), ruleAucTieTol: round(tol) }); }
  for (const [vn, opt] of Object.entries(VARIANTS)) { const r = rngFor(seedFor("pm-r2-attack-A2", vn, reg)), pr = strictPairs(candidates(base, R.IRC_DEFS.NK), r, opt, 1500), rows = capPerForm(pr.rows, 3).slice(0, 1200); emit(cell(reg, vn, rows, pr.dropped, rngFor(seedFor("pm-r2-attack-A2", vn, "eval", reg)))); }
  console.error(`${reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s days ${days.length}`);
}
