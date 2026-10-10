// run.mjs — independent confirmation of candidate rule R2_first_mention_lookahead (lens "chat-scope") on IRC channel-days and UD test files that the scoper never scored.
//   node run.mjs dry    -> results/dry.json  (two SCOPER-DISCOVERY days; code debugging only; nothing from it informs a threshold or a verdict)
//   node run.mjs irc    -> results/irc.json  (the confirm set in days.json; single shot)
//   node run.mjs ud     -> results/ud.json   (UD test.conllu, all stems; out-of-scope register probe, NO verdict)
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; the sha256 of this block is recorded in every output JSON) ═══
// RULE UNDER TEST (fixed; copied from the candidate): for the FIRST occurrence of a word form in a day of IRC-style chat, INIT_Tinf = number of OTHER messages of that day whose first word is the form.
//   Flag as name-like iff INIT_Tinf >= 2. Direction +1 (higher = more name-like). Text-only observable: lowercase word forms and message boundaries; no speaker field, capital, colon, list, POS. NON-CAUSAL (whole-day lookahead).
// DISCLOSURE (what I have seen). The rule JSON and its discovery/confirm numbers (EN FIRST ALL 0.692 discovery, 0.685 scoper-confirm, wordshuf drop 0.135, beyond whole-day-count bins 0.683, beyond +-128 count 0.596).
//   The scoper's source files (collect/pairs/index/stats/confirm; I re-implement the score, gold, matcher and statistics myself in lib.mjs ix.mjs stats.mjs cells.mjs from the rule text; only the matching DESIGN is shared).
//   Earlier registered reports (NAME-RULE/COMPANY/SHAPE-RESULTS): on 6 of my days, 92.1% of nickname mentions are message-initial and a message-initial-only rival scored 0.918 (this is generic corpus knowledge that seeded the hypothesis).
//   NOT seen: any value of INIT_Tinf, CNT_Tinf, or any AUC on any day of my confirm set or on any UD test file. I ran only days.mjs (file names; no text, no statistic).
// DATA. All 112 IRC channel-days are accounted for (days.json): 14 USED by the name tests, 42 scoper DISCOVERY, 36 scoper CONFIRM (scored by the scoper: EXCLUDED), 20 INELIGIBLE (< 20 gold mentions; counted, never scored).
//   NO fully fresh IRC day exists. My confirm set = USED14 + INELIGIBLE20 = 34 days: EN = 26 days (ubuntu 8, kubuntu 9, xubuntu 5, ubuntu-server 4), NONEN = 8 tiny days (de 3, es 5). Weaker independence than a fresh day:
//   USED14 were used for OTHER registered statistics (impact / company), never for INIT_Tinf. The score is fixed, nothing is fitted, so the only leakage route is hypothesis seeding, disclosed above.
//   UD probe (secondary): every stem in /private/tmp/claude-501/ud-eval with a test.conllu (no earlier test used test.*); stream = file, message = sentence of lexical tokens; gold PROPN (labels only). Out of the rule's stated scope.
// GOLD. IRC: positive = first occurrence of a form equal to the form of a nick that spoke >= 3 messages that day (>= 3 chars), not the speaker of that message, not a topic word (share >= 1/300 of the day's tokens);
//   negative = first occurrence of a form of >= 3 chars equal to no nick form. UD: positive = first occurrence is UPOS PROPN; negative = first occurrence is NOUN/VERB/ADJ/ADV, form never PROPN in the file, >= 3 chars.
// MATCHING (controls built to fail). FIRST stratum only; exact cell on (within-message index bucket 0,1,2,3,4-5,6-9,10+; floor(Q log2 whole-day token count); character length 3..10,11+; message-length bucket), no replacement,
//   unmatched positives dropped and counted; up to 400 positive tries per day. Variants in order, chosen ONLY by the controls: M4 (Q=4) -> M8 (Q=8) -> M4 strict subset (equal raw index, message length, char length, |d log2 count|<=0.15; n>=40).
//   Four raw controls (within-message index i, message length len, char length cl, log2 count lc) must each have paired AUC in [0.45, 0.55] (the position control is i); otherwise the next variant; if none: the cell is VOID (no verdict).
// PRIMARY CELL (verdict): FIRST x EN x ALL facets, pooled over the 26 EN days. HOLDS iff the chosen variant has n >= 60 and ALL of:
//   (a) paired AUC >= 0.62; (b) pair-bootstrap 95% lower bound >= max(0.55, analytic null q95 = 0.5+1.645*0.5/sqrt(n), sign-flip null q95 (2000 flips));
//   (c) [TIGHTENING vs the passIf] day-cluster bootstrap lower bound >= 0.55 (>= 4 days); (d) wordshuf (tokens permuted inside every message, re-matched, same variant) lowers the AUC by >= 0.05;
//   (e) beyond-rival: AUC on pairs whose CNT_Tinf (other messages containing the form) lies in the same log2(1+x) bin, kept >= 40, >= 0.60.
// SUB-SCOPE CELLS (exploratory, 9; used only for PARTIAL when the primary fails, same bars a-e): facets INIT, NONINIT; channels ubuntu, kubuntu; eras 2004-07, 2008-11, 2012-15; day size big (>= 5000 messages) / small.
// REPORTED WITHOUT VERDICT: TPR/FPR/balanced precision at theta=2; msgshuf (message order permuted) AUC; per-day AUC and sign test; beyond equal CNT_T128 bins; slot shams SEC_Tinf, LAST_Tinf (same statistic on the
//   2nd / last word of other messages; the rule claims the FIRST slot); FNEXT (prefix-only frame score of the outOfScope clause); NONEN tiny days; natural (unmatched) precision/recall/FPR at theta=2 by facet with the
//   population AUC of INIT_Tinf vs CNT_Tinf vs CNT_T128 and the precision of a CNT_Tinf threshold set to the same flag rate; the UD probe (per language and pooled).
// VERDICT. CONFIRMED iff the primary cell HOLDS (a-e). PARTIAL iff (i) a-b hold but one of c-e fails (the effect exists but is not shown to be beyond clustering / order / whole-day count), or (ii) the primary fails or is VOID but at least
//   one sub-scope cell HOLDS (state exactly which). NOT_CONFIRMED otherwise. The stated scope = cells that hold; every cell that fails or is VOID is a limit.
// BLIND PREDICTIONS (numeric, informed by discovery + scoper confirm; checks of drift): primary AUC in [0.62, 0.74]; TPR at 2 in [0.22, 0.42], FPR in [0.04, 0.16]; INIT facet AUC < NONINIT facet AUC (INIT in [0.58, 0.70],
//   NONINIT in [0.66, 0.84]); wordshuf AUC <= 0.58 (drop >= 0.08); msgshuf within 0.05 of real; beyond CNT_Tinf AUC in [0.60, 0.74]; beyond CNT_T128 AUC in [0.52, 0.66]; all four controls in band under M4;
//   LAST_Tinf sham in [0.48, 0.60] and SEC_Tinf sham in [0.48, 0.60]; FNEXT in [0.46, 0.56]; >= 65% of days with >= 10 pairs have AUC > 0.5; ubuntu >= kubuntu in AUC; natural precision at theta=2 in [0.10, 0.60], recall in [0.20, 0.45].
//   NONEN tiny days: n < 60 expected (descriptive only). UD probe: pooled AUC in [0.46, 0.60]; at most 25% of testable languages meet a-b; UD-eng AUC in [0.45, 0.62].
// NOT TESTED (and not claimed): any fitted classifier; causal / prefix-only readers beyond FNEXT; other registers (email, SMS, forum); non-English chat beyond the 8 tiny days; cross-day text; anything reading the speaker field,
//   a list, capitals or the colon. Dry mode runs only on scoper-discovery days. If a code bug is found after the first run it is fixed, the whole run repeated, and an AMENDMENT is recorded below the block (thresholds may only tighten).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { createHash } from "node:crypto";
import { loadIrc, loadUd, round } from "./lib.mjs";
import { firstPairs, firstRows } from "./ix.mjs";
import { pAuc, bootPairs, bootDays, ctlOf, ctlOk, popAuc, tally, nullQ95, strictOf } from "./stats.mjs";
import { evalCell, RULE } from "./cells.mjs";
const MODE = process.argv[2]; if (!["dry", "irc", "ud"].includes(MODE)) throw new Error("mode must be dry|irc|ud (never 'run')");
const lines = fs.readFileSync(new URL(import.meta.url), "utf8").split("\n"), a0 = lines.findIndex((l) => l.startsWith("// ═══ PRE-REGISTRATION")), b0 = lines.findIndex((l) => l.startsWith("// ═══ END OF PRE-REGISTRATION"));
const HEADER_SHA = createHash("sha256").update(lines.slice(a0, b0 + 1).join("\n")).digest("hex");
const fp = (f) => createHash("sha256").update(fs.readFileSync(new URL(f, import.meta.url))).digest("hex").slice(0, 16);
const CODE = Object.fromEntries(["lib.mjs", "ix.mjs", "stats.mjs", "cells.mjs", "days.json"].map((f) => [f, fp(f)]));
const DAYS = JSON.parse(fs.readFileSync(new URL("./days.json", import.meta.url), "utf8"));
const MAXP = 400, DRY = ["ubuntu/2007-07-15.txt", "ubuntu/2008-07-15.txt", "ubuntu/2010-03-15.txt", "ubuntu/2011-03-15.txt", "ubuntu/2012-03-15.txt", "ubuntu/2013-07-15.txt", "kubuntu/2006-03-15.txt", "kubuntu/2011-03-15.txt"]; // AMENDMENT-1 (debug only): dry mode uses 8 scoper-DISCOVERY days, not 2 as the header says; no confirm day is touched
const tagOf = (d) => ({ day: d.key, channel: d.channel, lang: d.lang, era: d.era, size: d.nMsg >= 5000 ? "big" : "small" });
/** docs = {real: [...], wordshuf: [...], msgshuf: [...]}  ->  sets[mode][Q] = tagged matched pairs (Q = 4 and 8) + coverage info (real only). */
function buildSets(docs) {
  const sets = {}, info = [];
  for (const mode of Object.keys(docs)) { sets[mode] = { 4: [], 8: [] }; for (const d of docs[mode]) for (const Q of [4, 8]) {
    const r = firstPairs(d, MAXP, Q, mode); for (const p of r.pairs) { Object.assign(p, tagOf(d)); p.init = p.pos.i === 0; sets[mode][Q].push(p); }
    if (mode === "real") info.push({ day: d.key, Q, nMsg: d.nMsg, pairs: r.pairs.length, dropped: r.dropped, nPos: r.nPos, nNeg: r.nNeg }); } }
  return { sets, info };
}
/** Report-only description of a pair set (no verdict): n, days, controls, AUC with pair CI when n >= 10. */
function describe(ps, col = RULE.column) { const o = { n: ps.length, days: new Set(ps.map((p) => p.day)).size }; if (!ps.length) return o; o.ctl = ctlOf(ps); o.ctlOk = ctlOk(o.ctl); o.auc = round(pAuc(ps, col)); if (ps.length >= 10) o.ci = bootPairs(ps, col, 500, "desc"); o.thr = null; return o; }
const slim = (c) => { const { perDay, tried, ...r } = c; return { ...r, tried, perDay }; };
const t0 = Date.now(), log = (m) => process.stderr.write(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}\n`);
const OUT = { mode: MODE, headerSha256: HEADER_SHA, code: CODE, rule: RULE, preregFile: "prereg.sha256.txt" };
const inR = (x, lo, hi) => typeof x === "number" && x >= lo && x <= hi;
if (MODE === "irc" || MODE === "dry") {
  const enKeys = MODE === "dry" ? DRY : DAYS.confirmSet.EN, nonKeys = MODE === "dry" ? [] : DAYS.confirmSet.NONEN, keys = [...enKeys, ...nonKeys]; OUT.days = { EN: enKeys, NONEN: nonKeys };
  const docs = {}; for (const m of ["real", "wordshuf", "msgshuf"]) docs[m] = keys.map((k) => loadIrc(k, m)); log(`loaded ${keys.length} days x 3 modes`);
  const { sets, info } = buildSets(docs); OUT.coverage = info; log("matched pairs built (Q=4, Q=8; real / wordshuf / msgshuf)");
  const en = (p) => p.lang === "en", CELLS = { PRIMARY_EN_ALL: en, EN_INIT: (p) => en(p) && p.init, EN_NONINIT: (p) => en(p) && !p.init, EN_ubuntu: (p) => en(p) && p.channel === "ubuntu", EN_kubuntu: (p) => en(p) && p.channel === "kubuntu",
    "EN_2004-07": (p) => en(p) && p.era === "2004-07", "EN_2008-11": (p) => en(p) && p.era === "2008-11", "EN_2012-15": (p) => en(p) && p.era === "2012-15", EN_big: (p) => en(p) && p.size === "big", EN_small: (p) => en(p) && p.size === "small" };
  OUT.cells = {}; for (const [n, f] of Object.entries(CELLS)) { const c = evalCell(sets, f); OUT.cells[n] = c; log(`${n}: ${c.variant} n=${c.n} auc=${c.auc} ci=${c.ci} holds=${c.holds}`); }
  const REPORT = { EN_xubuntu: (p) => p.channel === "xubuntu", "EN_ubuntu-server": (p) => p.channel === "ubuntu-server", NONEN_ALL: (p) => p.lang !== "en", NONEN_de: (p) => p.channel === "ubuntu-de", NONEN_es: (p) => p.channel === "ubuntu-es" };
  OUT.reportOnly = {}; for (const [n, f] of Object.entries(REPORT)) OUT.reportOnly[n] = { M4: describe(sets.real[4].filter(f)), M8: describe(sets.real[8].filter(f)) };
  OUT.reportOnly.NONEN_wordshuf = describe(sets.wordshuf[4].filter((p) => p.lang !== "en"));
  // natural (unmatched) prevalence on EN real days
  const rows = { ALL: [], INIT: [], NONINIT: [] }; for (const d of docs.real.filter((x) => x.lang === "en")) for (const r of firstRows(d)) { rows.ALL.push(r); (r.init ? rows.INIT : rows.NONINIT).push(r); }
  OUT.natural = {}; for (const [f, rs] of Object.entries(rows)) { const t = tally(rs, "s", RULE.theta); const flag = t.flagRate, vals = [...new Set(rs.map((r) => r.c))].sort((x, y) => x - y); let k = vals.find((v) => tally(rs, "c", v).flagRate <= flag) ?? vals[vals.length - 1] + 1; const tc = tally(rs, "c", k);
    OUT.natural[f] = { n: rs.length, nPos: rs.filter((r) => r.y).length, rule: t, popAuc: { INIT_Tinf: popAuc(rs, "s"), CNT_Tinf: popAuc(rs, "c"), CNT_T128: popAuc(rs, "c128") }, rivalAtSameFlagRate: { col: "CNT_Tinf", thetaCNT: k, ...tc } }; }
  log("natural prevalence done");
  const P = OUT.cells.PRIMARY_EN_ALL, subs = Object.keys(CELLS).filter((k) => k !== "PRIMARY_EN_ALL"), subHold = subs.filter((k) => OUT.cells[k].holds);
  const compFail = P.core ? Object.entries(P.companions).filter(([, v]) => !v).map(([k]) => k) : null;
  let verdict, why; if (P.holds) { verdict = "CONFIRMED"; why = "primary cell holds (a-e)"; } else if (P.core) { verdict = "PARTIAL"; why = `a-b hold, companion(s) failed: ${compFail.join(", ")}`; } else if (subHold.length) { verdict = "PARTIAL"; why = `primary ${P.variant === "VOID" ? "VOID" : "fails a-b"}; sub-scope cells that hold: ${subHold.join(", ")}`; } else { verdict = "NOT_CONFIRMED"; why = `primary ${P.variant === "VOID" ? "VOID" : "fails a-b"} and no sub-scope cell holds`; }
  OUT.verdict = { verdict, why, primaryHolds: P.holds, subScopeHolding: subHold, subScopeFailing: subs.filter((k) => !OUT.cells[k].holds), mode: MODE };
  const M4 = OUT.cells.PRIMARY_EN_ALL.variant === "M4", nat = OUT.natural.ALL, ub = OUT.cells.EN_ubuntu, kb = OUT.cells.EN_kubuntu;
  OUT.predictions = { primaryAuc_0_62_0_74: inR(P.auc, 0.62, 0.74), tpr_0_22_0_42: inR(P.thr?.tpr, 0.22, 0.42), fpr_0_04_0_16: inR(P.thr?.fpr, 0.04, 0.16), initLtNoninit: OUT.cells.EN_INIT.auc < OUT.cells.EN_NONINIT.auc, init_0_58_0_70: inR(OUT.cells.EN_INIT.auc, 0.58, 0.70), noninit_0_66_0_84: inR(OUT.cells.EN_NONINIT.auc, 0.66, 0.84),
    wordshuf_le_0_58: P.wordshuf?.auc <= 0.58, wordshufDrop_ge_0_08: P.wordshuf?.drop >= 0.08, msgshufWithin_0_05: Math.abs((P.msgshuf?.auc ?? 9) - P.auc) <= 0.05, beyondCNT_Tinf_0_60_0_74: inR(P.beyondCNT_Tinf?.auc, 0.6, 0.74), beyondCNT_T128_0_52_0_66: inR(P.beyondCNT_T128?.auc, 0.52, 0.66),
    controlsInBandM4: M4, lastSham_0_48_0_60: inR(P.slotSham?.LAST_Tinf, 0.48, 0.6), secSham_0_48_0_60: inR(P.slotSham?.SEC_Tinf, 0.48, 0.6), fnext_0_46_0_56: inR(P.FNEXT, 0.46, 0.56), daysAbove05_ge_0_65: P.perDaySummary ? P.perDaySummary.above05 / Math.max(1, P.perDaySummary.daysWithN10) >= 0.65 : null,
    ubuntuGeKubuntu: ub.auc >= kb.auc, naturalPrecision_0_10_0_60: inR(nat.rule.precision, 0.1, 0.6), naturalRecall_0_20_0_45: inR(nat.rule.recall, 0.2, 0.45) };
  OUT.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL(`./results/${MODE === "dry" ? "dry" : "irc"}.json`, import.meta.url), JSON.stringify(OUT, null, 1));
  console.log(JSON.stringify({ mode: MODE, headerSha256: HEADER_SHA, verdict: OUT.verdict, primary: { variant: P.variant, n: P.n, days: P.days, auc: P.auc, ci: P.ci, dayCi: P.dayCi, ctl: P.ctl, thr: P.thr, wordshuf: P.wordshuf?.auc, drop: P.wordshuf?.drop, msgshuf: P.msgshuf?.auc, beyond: P.beyondCNT_Tinf?.auc, beyond128: P.beyondCNT_T128?.auc } }, null, 1));
}
if (MODE === "ud") {
  const UD_ROOT = "/private/tmp/claude-501/ud-eval", stems = fs.readdirSync(UD_ROOT).filter((s) => fs.existsSync(`${UD_ROOT}/${s}/${process.env.R2_UD_SPLIT ?? "test"}.conllu`)).sort(); OUT.stems = stems; OUT.udSplit = process.env.R2_UD_SPLIT ?? "test"; OUT.perLanguage = {}; OUT.coverage = [];
  const pooled = { real: { 4: [], 8: [] }, wordshuf: { 4: [], 8: [] }, msgshuf: { 4: [], 8: [] } };
  for (const s of stems) {
    const docs = {}; for (const m of ["real", "wordshuf", "msgshuf"]) docs[m] = [loadUd(s, m)];
    const { sets, info } = buildSets(docs); OUT.coverage.push(...info);
    for (const m of Object.keys(pooled)) for (const Q of [4, 8]) pooled[m][Q].push(...sets[m][Q]);
    const c = evalCell(sets, () => true); const { perDay, ...rest } = c; OUT.perLanguage[s] = { nMsg: docs.real[0].nMsg, ...rest, report: c.variant === "VOID" ? { M4: describe(sets.real[4]), M8: describe(sets.real[8]) } : undefined };
    log(`${s}: ${c.variant} n=${c.n} auc=${c.auc} ci=${c.ci} core=${c.core} holds=${c.holds}`);
  }
  const all = evalCell(pooled, () => true), { perDay, ...allRest } = all; OUT.pooledAll = allRest;
  const testable = stems.filter((s) => OUT.perLanguage[s].variant !== "VOID"); const validSets = {}; for (const m of Object.keys(pooled)) { validSets[m] = {}; for (const Q of [4, 8]) validSets[m][Q] = pooled[m][Q].filter((p) => testable.includes(p.day)); }
  const eng = evalCell(pooled, (p) => p.day === "eng"), { perDay: pd2, ...engRest } = eng; OUT.eng = engRest;
  OUT.summary = { languages: stems.length, testable: testable.length, void: stems.length - testable.length, core: testable.filter((s) => OUT.perLanguage[s].core), holdsAll: testable.filter((s) => OUT.perLanguage[s].holds), coreShare: round(testable.filter((s) => OUT.perLanguage[s].core).length / Math.max(1, testable.length)),
    aucAbove05: testable.filter((s) => OUT.perLanguage[s].auc > 0.5).length, aucTable: Object.fromEntries(testable.map((s) => [s, OUT.perLanguage[s].auc])) };
  OUT.predictions = { pooledAuc_0_46_0_60: inR(all.auc, 0.46, 0.6), coreShare_le_0_25: OUT.summary.coreShare <= 0.25, engAuc_0_45_0_62: inR(OUT.eng.auc, 0.45, 0.62) };
  OUT.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL(`./results/ud${process.env.R2_UD_SPLIT ? "." + process.env.R2_UD_SPLIT : ""}.json`, import.meta.url), JSON.stringify(OUT, null, 1));
  console.log(JSON.stringify({ mode: MODE, headerSha256: HEADER_SHA, pooled: { variant: all.variant, n: all.n, auc: all.auc, ci: all.ci, ctl: all.ctl }, summary: { ...OUT.summary, aucTable: undefined }, predictions: OUT.predictions }, null, 1));
}
