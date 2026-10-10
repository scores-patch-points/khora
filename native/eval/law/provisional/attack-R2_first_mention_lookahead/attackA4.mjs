// attackA4.mjs — ATTACK A4: scope map by whole-day token count of the form (what the rule can and cannot speak about), on R2_first_mention_lookahead (lens chat-scope). Run: node attackA4.mjs (never "run") -> results/attackA4.json
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; sha256 of this block is recorded in the output JSON) ═══
// WHY. INIT_Tinf >= 2 needs >= 3 occurrences of the form in the day (the first plus >= 2 other messages). The matched design keeps only positives with an equal-cell negative (attackC2: ALL_EN has 7,982 gold-positive first mentions, K0 matches 1,467 = 18%). Which count regimes carry the 0.685, and
//   what share of nicks is structurally invisible to a threshold-2 rule? DISCLOSURE (seen): attackA, A2, A3, B, B2, B3, C, C2 results. NOT seen: any count-binned AUC or recall.
// METHOD. K0 pairs (seeds 1..3, rule's gold) on CF and ALL_EN, binned by the day count c of the pair's cell (pos and neg share the quarter-octave bin; use the positive's c): {1-2}, {3-4}, {5-8}, {9-16}, {17-32}, {33+}. Per bin: n, AUC (mean over seeds), TPR / FPR at theta = 2, tie share.
//   NATURAL (unmatched; all first mentions of >= 3-char forms with gold P/N): share of gold-positive first mentions per count bin, recall of theta = 2 per bin, and the share of ALL gold positives with c <= 2 (structurally invisible at theta 2).
// DECISIONS (descriptive; no pass/fail): the SCOPE statement must list the count regimes where AUC >= 0.62 with day-CI lower >= 0.55 and n >= 40.
// BLIND PREDICTIONS (ALL_EN): bin 1-2 AUC in [0.50, 0.60]; bin 3-4 in [0.55, 0.68]; bins 5-16 in [0.66, 0.80]; bin 33+ >= 0.70 (n may be < 40); share of gold positives with c <= 2 is >= 0.35; natural recall of theta 2 for c <= 2 is exactly 0.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, candidates, matchPairs, gold, GOLD0, K0, rnd4 } from "./common.mjs";
import { auc, boot, CL, mean } from "./stats.mjs";
import { headerSha, CODE, enDays } from "./hdr.mjs";
const D = enDays(), CF = D.CF, ALL = [...new Set([...D.CF, ...D.SD, ...D.SC])], SHA = headerSha(import.meta.url), S3 = [1, 2, 3], bin = (c) => (c <= 2 ? "1-2" : c <= 4 ? "3-4" : c <= 8 ? "5-8" : c <= 16 ? "9-16" : c <= 32 ? "17-32" : "33+"), BINS = ["1-2", "3-4", "5-8", "9-16", "17-32", "33+"];
const cands = new Map(); for (const k of ALL) cands.set(k, candidates(loadDay(k), 3)); const OUT = { headerSha256: SHA, code: CODE(), matched: {}, natural: {} };
for (const [pop, days] of [["CF", CF], ["ALL_EN", ALL]]) {
  const per = S3.map((s) => days.flatMap((k) => matchPairs(cands.get(k), GOLD0, K0(4), s, "A4").pairs)); OUT.matched[pop] = {};
  for (const b of BINS) { const a = per.map((ps) => ps.filter((p) => bin(p.pos.c) === b)), p1 = a[0]; const o = { n: p1.length, aucMean: p1.length ? rnd4(mean(a.map((x) => auc(x, "INIT_Tinf")))) : null }; if (p1.length >= 40) { o.ciDay = boot(p1, "INIT_Tinf", CL.day, 600, "A4" + b + pop); o.tpr2 = rnd4(p1.filter((p) => p.pos.INIT_Tinf >= 2).length / p1.length); o.fpr2 = rnd4(p1.filter((p) => p.neg.INIT_Tinf >= 2).length / p1.length); o.tie = rnd4(p1.filter((p) => p.pos.INIT_Tinf === p.neg.INIT_Tinf).length / p1.length); o.holds = o.aucMean >= 0.62 && o.ciDay[0] >= 0.55; } OUT.matched[pop][b] = o; }
  const rows = days.flatMap((k) => cands.get(k)).filter((x) => gold(x, GOLD0) === "P"), tot = rows.length; OUT.natural[pop] = { goldPositives: tot, bins: {} };
  for (const b of BINS) { const r = rows.filter((x) => bin(x.c) === b); OUT.natural[pop].bins[b] = { n: r.length, share: rnd4(r.length / tot), recallTheta2: r.length ? rnd4(r.filter((x) => x.INIT_Tinf >= 2).length / r.length) : null }; }
  OUT.natural[pop].shareLe2 = OUT.natural[pop].bins["1-2"].share; OUT.natural[pop].matchedShare = rnd4(per[0].length / tot);
}
OUT.seconds = 0; fs.writeFileSync(new URL("./results/attackA4.json", import.meta.url), JSON.stringify(OUT, null, 1)); console.log(JSON.stringify({ sha: SHA, matched: OUT.matched, natural: OUT.natural }, null, 0));
