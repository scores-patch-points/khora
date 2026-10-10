// eval/law/provisional/chat-scope/discover.mjs — DISCOVERY of cheap zero-shot text-only nickname rules in IRC chat; fixed scores, matched pairs, discovery days only.
//
//   node discover.mjs real|msgshuf|wordshuf        -> results/discovery.<mode>.json   (never pass "run"; there is no "run" here)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══════════════════════════════════════════════════
// LENS. chat-scope. The user: "even if we only find provisional rules that apply for some things, that is useful info". Aim: scoped, falsifiable rules of the form
//   "in registers/channels/positions X, observable Y identifies nicknames with strength Z", limits stated. At most 2 rules go on to CONFIRM (confirm.mjs, its own header).
// DISCLOSURE (what I had seen before this header). (a) The reports NAME-COMPANY/NAME-RULE/NAME-SHAPE-RESULTS, kinds-swarm ant-kinds-chat REPORT, ant-shape/ant-adversary summaries:
//   92% of nickname mentions are message-initial; company at LATER IRC 0.607 leave-one-day-out, FIRST 0.526; UD -> IRC 0.457; an induced "nick kind" is a message-initial band whose
//   after-slot is yes/i/ok/u/no/what; a position-matched record signal 0.72-0.79. (b) A census (counts only, no score) of gold mention occurrences and message-initial gold occurrences
//   per day for all 112 IRC days incl. the days that will become CONFIRM days: English ~85-95% initial; ubuntu-de ~90%; ubuntu-it ~85-90%; ubuntu-es 60-90% (lower). (c) While
//   building the matcher I printed, on a 9-day subset of discovery days (ubuntu-de + kubuntu), the matched-pair AUC of three registered columns: LATER INIT_C128 ~0.89-0.91,
//   INIT_Tinf ~0.91-0.94, FNEXT ~0.47-0.52; FIRST INIT_Tinf ~0.67-0.76, FIRST INIT_C128 0.50, FIRST FNEXT ~0.54-0.58. Predictions for those three columns are therefore NOT blind
//   (marked *). Matcher development otherwise printed only the four raw controls (i, len, cl, lc) and coverage on discovery days; the final matcher is exact-cell. No other rule column
//   has been evaluated on any day. No CONFIRM day has been scored by anything.
// DATA. IRC day files of ubuntu-irc, all channels, days in split.json "discovery" (42 days; frozen by split.mjs: even index within channel among days that are NOT in
//   results/name-rule-informal.irc.json gold.files and NOT in results/name-company*/report.json C3.days and have >= 20 gold mention occurrences). Text = message bodies, lowercase
//   word tokens (punctuation incl. the vocative colon is dropped by the tokeniser and never used); speaker field = GOLD ONLY.
// GOLD. A body token whose form equals the form (letters/digits, lowercased) of a nickname that spoke >= 3 messages that day, length >= 3, not a topic word (day share >= 1/300), not the
//   speaker of that very message. Negatives: ordinary tokens of >= 3 characters equal to no nickname form (positive-unlabelled: silent users / rare nicks leak into negatives; stated).
// MATCHING (pairs.mjs). Exact cell: stratum (FIRST/LATER) x within-message index bucket (0,1,2,3,4-5,6-9,10+) x half-octave day-frequency bin floor(2 log2 count) x exact character
//   length (3..10, 11+) x message-length bucket (exact to 7, then 8-9, 10-11, 12-14, 15-19, 20-27, 28-40, 41+); one negative per positive, without replacement; <= 400 pairs per day per stratum; unmatched positives dropped.
//   CONTROLS built to fail: raw within-message index i, raw message length len, raw character length cl, log2 day count lc, each as a score -> paired AUC must be in [0.45, 0.55]
//   in a scope, otherwise that scope is VOID. Paired AUC = fraction of matched pairs in which the positive scores higher (ties 0.5).
// SCORES (index.mjs; every one a FIXED function of the stream, higher = more name-like, direction fixed here): window W in {8,32,128,inf} messages, mode C = previous messages only
//   (causal), mode T = both sides (lookahead, disclosed), current message excluded. CNT = messages in the window containing the word (the RIVAL: plain local recurrence). INIT = messages
//   in the window in which the word is the FIRST word. ISHARE = (INIT+1)/(CNT+2). NDIV = (distinct next forms + 1)/(INIT+2) over the word's first-word occurrences (W=128, inf).
//   NBIN = entropy of the rank-bin of the next token over the word's first-word occurrences (W=128, inf; INIT >= 2 else 0). REC_C = -log2(1 + gap in messages to the last earlier
//   first-word occurrence, capped 512). FNEXT = -(rank bin of the token after this occurrence; 12 at message end). CON_C = 1 - overlap of next-bin distributions of the word's earlier
//   first-word vs non-first-word occurrences (needs >= 2 each else 0). Rank bins are the stream's own: min(11, floor(log2(frequency rank + 1))) over the day.
// NO FORMAT LEARNING. Nothing is fitted. No capitals, POS, list, treebank, speaker field or colon enters any score.
// DISCOVERY TESTS. For each stratum {LATER, FIRST} x facet {ALL, INIT (i=0), NONINIT (i>=1)} x scope {ALL, EN (ubuntu kubuntu xubuntu ubuntu-server), each channel, NONEN, DE, ES, IT,
//   EN x era (2004-07, 2008-11, 2012-15), NONEN x era}: n pairs, n days, four controls, paired AUC of every column; pair-bootstrap 95% CI (B=200) and day-cluster CI (>= 4 days) for the main
//   scopes; analytic null q95 = 0.5 + 1.645 * 0.5 / sqrt(n); beyond-rival AUC = AUC of INIT_x / ISHARE_x on pairs whose CNT_x log2(1+.) bins are equal; fixed-threshold TPR/FPR/balanced
//   precision for count columns at thresholds {1,2,3,4,6,8} and share columns at {0.6,0.67,0.75,0.8,0.9} (EN LATER, plus DE, ES, IT).
//   CELL HOLDS if n >= 60, controls in band, AUC >= 0.60, and lower pair-bootstrap bound > the null q95. SESOI 0.03.
// SHUFFLE CONTROLS (modes msgshuf, wordshuf, same matcher re-run on the transformed stream): wordshuf permutes tokens inside every message (destroys the first-word slot; gold stays
//   word-defined); msgshuf permutes message order inside the day (destroys time-locality, keeps first-word slot and frequencies).
// SHORTLIST (mechanical, select.mjs, run once on this file's real-mode JSON; at most 2 rules). Rule 1 = the INIT/ISHARE/REC/NDIV/NBIN/CON/FNEXT column in mode C with the highest LATER x EN
//   x ALL AUC whose cell HOLDS, ties within 0.01 resolved to smaller W then INIT < ISHARE < others (cheapest). Rule 2 = first applicable of: (a) the causal column with the highest LATER x EN
//   x NONINIT AUC whose cell HOLDS and whose beyond-rival AUC >= 0.55 ; (b) the mode-T column with the highest FIRST x EN x ALL AUC whose cell HOLDS. Threshold of a rule = smallest
//   grid threshold whose EN LATER discovery FPR <= 0.15. If a rule's cell does not hold, it is not emitted (a null is a result).
// BLIND PREDICTIONS (orders are the claims). P1* INIT_C128 LATER EN INIT-facet >= 0.80. P2 beyond rival: INIT_C128 vs equal CNT_C128 bin >= 0.70 in EN. P3 NONINIT facet: INIT_Cinf in EN in
//   [0.58, 0.75]. P4 INIT_C128 LATER: DE >= 0.75, IT >= 0.75, ES >= 0.65 (es initial share lower). P5 FIRST causal: every mode-C count/share column is exactly 0.5; FNEXT* FIRST <= 0.58.
//   P6* FIRST mode T: INIT_Tinf EN >= 0.62. P7 era: EN LATER INIT_C128 for 2012-15 lower than for 2004-07 by >= 0.03. P8 NBIN, NDIV: higher = name-like; AUC >= 0.55 in EN (a guess; ant-code
//   found a reversed polarity on IRC, so I expect to be wrong). P9 wordshuf: INIT-family LATER ALL EN <= 0.57. P10 msgshuf: INIT_Cinf/Tinf move < 0.03 but INIT_C8 loses >= 0.15.
//   P11 REC_C beats CNT_C8-style rival: REC_C LATER EN INIT-facet >= INIT_C32. P12 CON_C is covered (non-zero) for < 30% of positives (non-first-word occurrences of names are rare).
// NOT TESTED HERE: any fitted classifier (a probe may appear in a separate file and will be labelled), cross-channel-day text, the colon/comma (a format cue, not a rule observable).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { daysOf, collect } from "./collect.mjs";
import { pAuc, bootPairs, bootDays, thrRule, beyondRival, round } from "./stats.mjs";

const MODE = process.argv[2] ?? "real";
if (!["real", "msgshuf", "wordshuf"].includes(MODE)) throw new Error("mode");
const CTL = ["i", "len", "cl", "lc"], BAND = [0.45, 0.55];
const SCOPES = {
  ALL: () => true, EN: (p) => p.lang === "en", NONEN: (p) => p.lang !== "en", DE: (p) => p.channel === "ubuntu-de", ES: (p) => p.channel === "ubuntu-es", IT: (p) => p.channel === "ubuntu-it",
  ubuntu: (p) => p.channel === "ubuntu", kubuntu: (p) => p.channel === "kubuntu", xubuntu: (p) => p.channel === "xubuntu", "ubuntu-server": (p) => p.channel === "ubuntu-server",
  "EN_2004-07": (p) => p.lang === "en" && p.era === "2004-07", "EN_2008-11": (p) => p.lang === "en" && p.era === "2008-11", "EN_2012-15": (p) => p.lang === "en" && p.era === "2012-15",
  "NONEN_2004-11": (p) => p.lang !== "en" && p.era !== "2012-15", "NONEN_2012-15": (p) => p.lang !== "en" && p.era === "2012-15",
};
const FACETS = { ALL: () => true, INIT: (p) => p.init, NONINIT: (p) => !p.init };
const MAIN = new Set(["ALL", "EN", "NONEN", "DE", "ES", "IT", "ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]);
const nullQ95 = (n) => round(0.5 + (1.645 * 0.5) / Math.sqrt(Math.max(1, n)));

function cell(pairs, cols, ci) {
  const o = { n: pairs.length, days: new Set(pairs.map((p) => p.day)).size, ctl: {}, auc: {}, nullQ95: nullQ95(pairs.length) };
  if (!pairs.length) return o;
  for (const c of CTL) o.ctl[c] = round(pAuc(pairs, c));
  o.ctlOk = CTL.every((c) => o.ctl[c] >= BAND[0] && o.ctl[c] <= BAND[1]);
  for (const c of cols) o.auc[c] = round(pAuc(pairs, c));
  if (ci && pairs.length >= 60) { o.ci = {}; o.dayCi = {}; for (const c of cols) { o.ci[c] = bootPairs(pairs, c, 1, 200); o.dayCi[c] = bootDays(pairs, c, 1, 200); } }
  return o;
}
function main() {
  const t0 = Date.now(), days = daysOf("discovery");
  const { out, info } = collect(days, MODE, 400, (k) => console.error("day", k));
  const cols = Object.keys(out.LATER[0].pos).filter((k) => /^(CNT|INIT|ISHARE|NDIV|NBIN|REC|FNEXT|CON)/.test(k));
  const R = { mode: MODE, columns: cols, days: days.map((d) => d.key), info, cells: {}, beyond: {}, thr: {}, cover: {} };
  for (const st of ["LATER", "FIRST"]) for (const [sn, sf] of Object.entries(SCOPES)) for (const [fn, ff] of Object.entries(FACETS)) {
    const pairs = out[st].filter((p) => sf(p) && ff(p));
    R.cells[`${st}|${sn}|${fn}`] = cell(pairs, cols, MODE === "real" && MAIN.has(sn));
  }
  for (const sn of ["EN", "DE", "ES", "IT", "NONEN"]) for (const fn of ["ALL", "INIT", "NONINIT"]) {
    const pairs = out.LATER.filter((p) => SCOPES[sn](p) && FACETS[fn](p));
    R.beyond[`${sn}|${fn}`] = {}; R.thr[`${sn}|${fn}`] = {};
    for (const c of cols.filter((x) => /^(INIT|ISHARE)_/.test(x))) R.beyond[`${sn}|${fn}`][c] = beyondRival(pairs, c, "CNT_" + c.split("_")[1]);
    for (const c of cols.filter((x) => /^(INIT|CNT)_/.test(x))) R.thr[`${sn}|${fn}`][c] = Object.fromEntries([1, 2, 3, 4, 6, 8].map((t) => [t, thrRule(pairs, c, t)]));
    for (const c of cols.filter((x) => /^ISHARE_/.test(x))) R.thr[`${sn}|${fn}`][c] = Object.fromEntries([0.6, 0.67, 0.75, 0.8, 0.9].map((t) => [t, thrRule(pairs, c, t)]));
    R.cover[`${sn}|${fn}`] = { CON_C_nonzero: round(pairs.filter((p) => p.pos.CON_C > 0).length / Math.max(1, pairs.length)) };
  }
  R.seconds = round((Date.now() - t0) / 1000, 1);
  R.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  const TAG = process.env.CHAT_FREQBIN === "4" ? ".fb4" : ""; // POST-HOC AMENDMENT tag (see pairs.mjs); unset = v1 file name
  fs.writeFileSync(new URL(`./results/discovery.${MODE}${TAG}.json`, import.meta.url), JSON.stringify(R));
  console.log(JSON.stringify({ mode: MODE, seconds: R.seconds, sha: R.headerSha256, nLATER: out.LATER.length, nFIRST: out.FIRST.length }));
}
main();
