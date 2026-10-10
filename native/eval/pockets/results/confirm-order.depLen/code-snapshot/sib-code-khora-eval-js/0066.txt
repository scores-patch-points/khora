// attack-R1_first_slot_share/attackA.mjs: ATTACK A (leakage and confounds) on rule R1_first_slot_share. Usage: node attackA.mjs a0|a1|a2|a3|a4   (never pass "run" as first argument). Results: results/A.<part>.json (carries the header sha256).
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this script) ═══
// DISCLOSURE. Read: the rule JSON; the scoper's code (chat-scope/*.mjs), its confirm pre-registration and numbers (EN LATER 0.8497, INIT 0.863, NONINIT 0.817, wordshuf 0.644); the confirmer's code and results (b.json cells,
//   ctl.b about 0.51, per-day AUC list, natural precision ladder). Computed by me BEFORE this header: only sanity.mjs on two scoper DISCOVERY days (ubuntu 2007-07-15 S0 AUC 0.8775, 2010-03-15 0.8225; own score = confirmer's score on
//   400/400 draws; own loader tokens = confirmer's). No score on any R (reserve) day, no strict-key score anywhere.
// DATA. EN channels only (ubuntu kubuntu xubuntu ubuntu-server). Sets: C = the scoper's 36 confirm days (touched once by scoper and confirmer); R = the 14 days of split.json "used" (never scored by R1 or any R1 test; they were used by the
//   earlier name-company tests, which is an exposure to be stated: the scoper may have seen name-company results on them); D = the scoper's 42 discovery days (touched, selection data). RC = R+C pooled is the primary set.
// GOLD (evaluation only): positives = nick forms (spoke >= 3 messages, >= 3 chars, not topic [day share >= 1/300], not the message's own speaker) at LATER occurrences (form occurred earlier in the stream, token level);
//   negatives = other tokens >= 3 chars. Score = ISHARE (a+1)/(b+2), a = earlier messages with w first, b = earlier messages containing w; own implementation; threshold 0.67 only for the threshold rows.
// KEYS (own matcher, within-day 1-1, exact cell, no replacement, <= 400 pairs per day, seeded): S0 = scoper's key (index bucket, quarter-octave whole-day count, exact char length, message-length bucket);
//   S1 = S0 + b exact (earlier-message count; 13+ log-binned); S2 = S0 + recency of the last earlier mention (half-octave of the message gap); S3 = S0 + b + recency; S4 = S3 with the whole-day count EXACT (<= 30) instead of quarter-octave;
//   S5 = S0 + last-8 count exact + last-32 count exact + last-128 log2 bin; S6 = PREFIX-ONLY key (index bucket, char length, message length, b, recency; no whole-day count, no future information); S7 = S6 + local counts of S5.
//   Controls (paired AUC of raw columns, band [0.45,0.55]): the columns the key matches (S0: i len cl lc; S1: + b; S2: + rec; S3 S4: + b rec; S5: i len cl lc; S6 S7: i len cl b rec). b and rec are also reported for S0.
// TESTS AND BARS (fixed now; may be tightened later, never loosened).
//   a0: within-day 1-1 pairs, keys S0..S7, sets R, C, D, RC. a1: pooled STRATIFIED AUC (every positive vs all same-cell negatives pooled over the set, <= 1500 positives per day; cluster = (day,form)), keys S0..S7, sets R and RC.
//   a2: facets INIT (i = 0 for both classes) and NONINIT on RC under S0 S1 S3 S6. a3: floor audit, gold min chars 1, 2, 4 for BOTH classes (default 3) under S0 and S3 on RC.
//   a4: leak audit: (i) static scan of the confirmer's ishare/streamIndex source and of own feat() for gold identifiers; (ii) recompute ISHARE with the gold fields deleted: identical; (iii) top positives, top false positives (descriptive).
//   SURVIVES-A iff on RC (a0): each of S1 S2 S3 S6 has AUC >= 0.70 and day-cluster CI lower >= 0.65 with matched controls in band (n >= 300 pairs); S4 S5 S7 are reported with bar AUC >= 0.65 and n >= 60; INIT and NONINIT each >= 0.70 under S1 S3 S6;
//   a3 min chars 2 AUC >= 0.70 else the scope is narrowed to forms of >= 3 characters (no verdict change otherwise). A key whose controls leave the band is VOID for that cell (no verdict). If S1, S3 or S6 gives AUC < 0.70 the rule FALLS under A.
// BLIND PREDICTIONS (P): RC S0 AUC in [0.82,0.89] (0.75); S1 in [0.78,0.88] (0.7); S3 in [0.72,0.86] (0.6); S6 in [0.78,0.89] (0.7); S4 in [0.65,0.85] (0.6); R alone S0 >= 0.80 (0.75); min chars 2 AUC in [0.70,0.82] (0.5); INIT S3 >= NONINIT S3 (0.6); leak audit clean (0.95).
// NOT TESTED HERE: other registers; non-English channels (attackB); fitted classifiers (attackC probe only).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, buildIx, feat, laterOccs, SETS, headerSha, LANG } from "./lib.mjs";
import { matchDay, sumPairs, strat, sumStrat, round } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), part = process.argv[2], EN = (k) => LANG[k.split("/")[0]] === "en";
const SET = { R: SETS.R.filter(EN), C: SETS.C.filter(EN), D: SETS.D.filter(EN) }; SET.RC = [...SET.R, ...SET.C];
const CTL = { S0: ["i", "len", "cl", "lc"], S1: ["i", "len", "cl", "lc", "b"], S2: ["i", "len", "cl", "lc", "rec"], S3: ["i", "len", "cl", "lc", "b", "rec"], S4: ["i", "len", "cl", "lc", "b", "rec"], S5: ["i", "len", "cl", "lc"], S6: ["i", "len", "cl", "b", "rec"], S7: ["i", "len", "cl", "b", "rec"] };
const ALLC = ["i", "len", "cl", "lc", "b", "rec"], docs = (keys, opt) => keys.map((k) => loadDay(k, opt));
const okOf = (key, c) => CTL[key].every((x) => c[x] >= 0.45 && c[x] <= 0.55);
const out = { part, headerSha256: SHA, sets: Object.fromEntries(Object.entries(SET).map(([k, v]) => [k, v.length])) };
function pairsFor(ds, key, pred) { const P = []; let nPos = 0; for (const d of ds) { const m = matchDay(d, key, { max: 400, pred }); P.push(...m.pairs); nPos += Math.min(400, m.nPos); } return { P, nPos }; }
const cell = (ds, key, pred) => { const { P, nPos } = pairsFor(ds, key, pred), s = sumPairs(P, ["ishare"], ALLC, "A" + key); s.matchedCtlOk = okOf(key, s.ctl); s.coverage = round(P.length / Math.max(1, nPos)); return s; };
const t0 = Date.now(), log = (m) => console.error(((Date.now() - t0) / 1000).toFixed(0) + "s " + m);
if (part === "a0") {
  const dd = { R: docs(SET.R), C: docs(SET.C), D: docs(SET.D) }; dd.RC = [...dd.R, ...dd.C]; out.cells = {};
  for (const key of Object.keys(CTL)) for (const sn of ["R", "C", "D", "RC"]) { out.cells[`${key}|${sn}`] = cell(dd[sn], key); log(`${key} ${sn} n=${out.cells[`${key}|${sn}`].n} auc=${out.cells[`${key}|${sn}`].auc.ishare}`); }
}
if (part === "a1") {
  const dd = { R: docs(SET.R), RC: docs(SET.RC) }; out.cells = {};
  for (const key of Object.keys(CTL)) for (const sn of ["R", "RC"]) { const s = sumStrat(strat(dd[sn], key, { seed: "A1" + key })); s.matchedCtlOk = okOf(key, s.auc); out.cells[`${key}|${sn}`] = s; log(`${key} ${sn} cov=${s.covered} auc=${s.auc.ishare}`); }
}
if (part === "a2") {
  const ds = docs(SET.RC); out.cells = {};
  for (const key of ["S0", "S1", "S3", "S6"]) for (const [fn, pred] of [["INIT", (o) => o.i === 0], ["NONINIT", (o) => o.i > 0]]) { out.cells[`${key}|${fn}`] = cell(ds, key, pred); log(`${key} ${fn} n=${out.cells[`${key}|${fn}`].n} auc=${out.cells[`${key}|${fn}`].auc.ishare}`); }
}
if (part === "a3") {
  out.cells = {};
  for (const mc of [1, 2, 3, 4]) { const ds = docs(SET.RC, { minNickChars: mc, minNegChars: mc }); for (const key of ["S0", "S3"]) { out.cells[`minChars${mc}|${key}`] = cell(ds, key); log(`mc${mc} ${key} n=${out.cells[`minChars${mc}|${key}`].n} auc=${out.cells[`minChars${mc}|${key}`].auc.ishare}`); } }
}
if (part === "a4") {
  const src = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8"), conf = src("../confirm-R1_first_slot_share/lib.mjs"), mine = src("./lib.mjs"), grab = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a)));
  const bodies = { confirmer_streamIndex_ishare: grab(conf, "export function streamIndex", "export const THETA"), own_buildIx_feat: grab(mine, "export function buildIx", "/** Matching keys") };
  out.static = Object.fromEntries(Object.entries(bodies).map(([k, v]) => [k, { chars: v.length, goldHits: (v.match(/\b(S|nicks|topic|speaker|upos|UPOS|G|D|toUpperCase|isUpper)\b/g) ?? []).length }]));
  const d = loadDay(SET.C[0]), ix = buildIx(d.T), occ = laterOccs(d).slice(0, 3000), bare = { T: d.T }, ix2 = buildIx(bare.T); let bad = 0;
  for (const o of occ) if (feat(ix, o.k, o.w).ishare !== feat(ix2, o.k, o.w).ishare) bad++; out.strippedGold = { day: d.key, n: occ.length, bad };
  const R = docs(SET.R.slice(0, 6)); const P = new Map(), FP = new Map();
  for (const dd of R) { const x = buildIx(dd.T); for (const o of laterOccs(dd)) { const s = feat(x, o.k, o.w).ishare; if (o.cls === "P") P.set(o.w, (P.get(o.w) ?? 0) + 1); else if (s >= 0.67) FP.set(o.w, (FP.get(o.w) ?? 0) + 1); } }
  const top = (m) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 25); out.topPositives = top(P); out.topFalsePositives = top(FP);
}
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL(`./results/A.${part}.json`, import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ part, sha: SHA, seconds: out.seconds }));
