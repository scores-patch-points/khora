// eval/law/provisional/confirm-ablscope-1-slot-ircB-c4plus/analyse.mjs -- INDEPENDENT CONFIRMATION of the candidate rule "ablscope-1-slot-ircB-c4plus" on UNTOUCHED data.
//
//   node analyse.mjs [--B 2000]          (reads data/design.json + data/read/*.jsonl; writes results/confirmation.json)
//   executors written BEFORE their first run: design-pairs.mjs (outcome-blind design), read-pairs.mjs (reads tokens), check-instrument.mjs (control K7)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE the first run of read-pairs.mjs, check-instrument.mjs and this file; the sha256 of everything above the END marker is written into the output) ═══
// THE RULE UNDER TEST (frozen by the scoper, "ablation-scope" lens; hypothesis only until confirmed): IF English IRC support chat (reader window M=256 messages) AND the token is NOT the first word of its message AND its form
//   occurs >= 4 times in the reader's window (local count c in [4, inf)) THEN S_ENTRY >= 1 (deleting that one token changes at least one referent-entry slot at radius 0-1) marks a nickname.
//   S_ENTRY = non-unchanged typed deltas of the ref-entry family at radius bands 0-1 after deleting the token and re-reading the window (impact.mjs impactBatch, mode delete, F=0, three prior-free readers).
//   Observables available at reading time: the lowercased token stream only (no capital, POS prior, word list, speaker field). Direction fixed (higher = name), threshold fixed (S_ENTRY >= 1). Gold = IRC nick forms (nick spoke >= 3 messages
//   that day, topic words removed), used only to label evaluation positives. Claimed by the scoper on its own confirmation days: AUC 0.821 [0.793, 0.854], sensitivity 0.650, specificity 0.992; strata AUC 0.746 / 0.882 / 0.888 (c 4-6, 7-15, 16+);
//   blind below c=4 (AUC 0.511 at c 2-3). Its registered passIf: on >= 8 further unused IRC days pooled AUC >= 0.62, 95% cluster-bootstrap lower bound > 0.55, above the within-pair permutation q95, pooled controls in [0.45, 0.55], control-vector
//   probe <= 0.58, >= 75% of days with AUC > 0.5, and S_ENTRY at c <= 3 stays in [0.45, 0.55]. Its failIf: AUC < 0.58 or interval includes 0.5, or specificity of S_ENTRY >= 1 below 0.90, or AUC at c <= 3 above 0.58, or pooled controls out of band.
//   I keep every one of those thresholds and TIGHTEN only where marked [T].
//
// DISCLOSURE (what I had seen when this header was written).
//   (1) The rule JSON given to me, including the scoper's confirmation numbers above and its remark that the plain share of a form's in-window mentions that open a message (R_INIT) scores 0.931 in the same scope.
//   (2) The scoper's code and registered headers (lib-data, lib-pairs v1-v3, features, stats, read-strata, confirm-rules-a1, design-check, bench), the head of its results/summary.json (round-1/2 verdicts; irc.A c4_6..c7_15 0.681, irc.B c4_6 0.689, irc.B c16p 0.891) and the
//       stdout of its confirmation (verdict labels only). I did NOT open any of its per-token jsonl records except the first 12 lines of two confirmation files that check-instrument.mjs (control K7) reads, and only to compare hashes. I have not read NAME-*-RESULTS.md.
//   (3) Design-time inventory of this lens (design-days.mjs, design-pairs.mjs): counts of candidate positives / unlabelled tokens, matched-pair counts and the six control AUCs per cell. NO ablation value of any token of any document used here has been
//       printed or stored. Timing benchmarks (bench-time.mjs, bench-time2.mjs) pushed 6 + 40 tokens of kubuntu/2007-03-15 through the reader and printed seconds only.
//   (4) Other ants (kinds-swarm, other provisional lenses) have read most English IRC days with OTHER instruments; none of their numbers was read by me. This is disclosed, not corrected.
//   (5) I hold priors from the scoper's report: names at c >= 4 are heard (S_ENTRY >= 1) in about half of cases rising with c, unlabelled matched tokens almost never. My predictions below are therefore NOT blind to its direction; they are blind to my data.
//
// DATA (the design is frozen in data/design.json, sha256 recorded in the output; reproduced twice, identical: 7b70f89881c224311aa04f5dd56a06870e4e85ff29cc3310bf90edf403a9b675).
//   EXCLUSION LEDGER (30 English channel-days, none used in any arm of the verdict): every day in name-rule-informal.irc.json gold.files (kubuntu 2006-07-15, 2008-03-15; ubuntu 2006-07-15, 2007-03-15, 2009-07-15, 2014-07-15), name-company report C3.days
//   (kubuntu 2005-07-15, 2005-11-15, 2007-07-15, 2008-07-15; ubuntu 2004-11-15, 2005-03-15, 2012-07-15, 2015-03-15) and every day the ablation-scope lens read in discovery round 1/2 or in its confirmation (ubuntu 2005-07-15, 2006-03-15, 2007-07-15, 2008-03-15,
//   2008-07-15, 2009-03-15, 2010-03-15, 2010-07-15, 2011-03-15, 2011-07-15, 2012-03-15, 2013-03-15, 2013-07-15, 2015-07-15; kubuntu 2006-03-15, 2009-03-15).
//   Arms (document, then cells = (group, stratum of the local count c in the 256-message window); group B = token not first in its message, group A = first in its message; matched pairs by matching v3 of the scoper + an outcome-blind balance swap, see lib.mjs):
//     E_CORE  PRIMARY. All 33 untouched English ubuntu/kubuntu/xubuntu days (ubuntu 2014-03-15; kubuntu 2007-03-15, 2009-07-15, 2010-03-15 ... 2015-07-15; xubuntu 2007-03-15 ... 2015-07-15). Verdict cells: B c4_6, c7_15, c16p (75 designed pairs, 65% of them
//             from kubuntu/2007-03-15). Floor cells: B c2, c3 (43 pairs). Limit cells: A c4_6..c16p (363 pairs).
//     E_SRV   untouched English ubuntu-server days (17; 140 pairs, only 15 in B c4+): sensitivity arm (channel not named in the rule scope).
//     E_REUSE NOT UNTOUCHED: the 14 English days that name-rule-informal / name-company read (never read by the scoper). Scope replication with large n (B c4+: 407 pairs). EXCLUDED FROM THE VERDICT; it can only narrow or support the scope statement.
//     X_DE, X_ES, X_IT  extension, never claimed by the rule: all ubuntu-de / -es / -it days (11 / 10 / 11 days; B c4+ pairs 25 / 42 / 69), the rule applied unchanged.
//     SHUF    mechanism controls on kubuntu/2007-03-15, kubuntu/2007-07-15, ubuntu/2005-03-15: the SAME three days read as real, as shufW (tokens permuted inside each message) and as shufG (tokens permuted over the whole day, message lengths kept); B c4_6/c7_15/c16p, 30 per cell per day.
//     UD      exploratory extension: the 53 UD test splits in /private/tmp/claude-501/ud-eval/*/test.conllu (never read by any earlier test), M=128 sentences, gold = PROPN used only for labels; B cells c2, c3 (30 per language), c4_6..c16p (all matchable).
//     NAT     natural-population sample (no matching): random unlabelled B tokens per stratum c4_6/c7_15/c16p per day (100 per cell E_CORE / E_SRV / X, 30 E_REUSE, 20 UD) drawn from the eligible pool minus the pair tokens, to estimate the false-alarm rate and PPV at natural prevalence.
//
// STATISTICS (fixed). Score S_ENTRY (higher = name). Stratified AUC = mean of per-stratum AUCs (names vs matched unlabelled, pooled over days of the stratum, ties half) weighted by pairs; strata with < 2 pairs are dropped. Interval = 95% percentile cluster bootstrap, B=2000,
//   blocks = document x half of the stream (documents with >= 2000 units) else the document, seed 20261007. Permutation null = within-pair label swap, B=2000, q95. Sensitivity = share of names with S_ENTRY >= 1; specificity = share of matched unlabelled with S_ENTRY = 0.
//   Controls (R_LOGC, R_POS = log1p(message index), R_IPOS = in-message position, R_FB = form-frequency bin, R_LEN = character length, R_SL = log message length): pooled stratified AUC of each, names vs matched. Control-vector probe = ridge-logistic on the six controls,
//   leave-one-block-out (cvScores of name-war-and-peace.mjs), stratified AUC of its scores. Caliper subset = exact form-frequency bin, exact length, |ln message-length ratio| <= 0.25, |ln local-count ratio| <= 0.15. Rivals: R_BURST = ln((mentions in the last 16 messages + 0.5)/(16 x document rate + 0.5)),
//   R_INIT = share of the form's in-window mentions that open a message (stream-only). Consistency groups (E_CORE, E_REUSE): days in chronological order, a day with >= 24 pairs in B c4+ is split into 4 groups by stream quartile, other days are merged in order until a group holds >= 6 pairs (a short remainder joins the previous group).
//
// PRIMARY TEST T1 (E_CORE, group B, strata c4_6 + c7_15 + c16p, rule S_ENTRY >= 1). PASS requires ALL of:
//   (a) >= 60 designed pairs; (b) stratified AUC >= 0.62; (c) bootstrap lower bound > 0.55; (d) AUC > within-pair permutation q95; (e) the six pooled controls each in [0.45, 0.55] (R_POS and R_IPOS are the position controls: outside the band the comparison is VOID);
//   (f) control-vector probe <= 0.58; (g) >= 75% of the consistency groups with AUC > 0.5, with >= 4 evaluable groups; (h) specificity >= 0.95 [T] (the rule's own failIf is < 0.90); (i) caliper subset AUC >= 0.58 and within 0.10 of the full AUC when >= 20 caliper pairs exist (otherwise reported);
//   (j) FLOOR: S_ENTRY stratified AUC on B c2 + c3 of E_CORE + E_SRV within [0.45, 0.55] (FAIL if > 0.58, as the rule's failIf; between 0.55 and 0.58 or below 0.45 = indeterminate, reported, does not block); (k) run validity: K1 sham ablation 100% null, K6 determinism 100%.
//   Reported with it: per-stratum AUC with intervals and n, sensitivity by stratum (c-gradient: sens(c16p) >= sens(c4_6)), the AUC difference to R_BURST and to R_INIT (bootstrap), and the share of non-null records among names and unlabelled.
//   Control K7 (instrument identity): 24 tokens of the scoper's confirmation files re-read here with its seed tag: report the share of identical hashes; it does not gate the verdict, it states whether "the same instrument" is what was run.
//
// SECONDARY TESTS (same statistics; none changes the verdict of T1; each is a separate scope statement).
//   T2 E_REUSE B c4+ (not untouched): same PASS list (a)-(i) with >= 8 days and consistency groups. T3 E_SRV B c4+ (sensitivity): AUC, interval, sensitivity, specificity (designed pairs are few; reported only).
//   T4 floor on E_REUSE B c2 + c3 (AUC within [0.45, 0.55], FAIL if > 0.58), and by stratum c2 / c3.
//   T5 LIMIT message-initial tokens (E_CORE + E_REUSE, group A, c4+): specificity of S_ENTRY >= 1 on matched unlabelled; the rule says out of scope (scoper 0.60): predicted < 0.90; and the AUC.
//   T6 extension languages X_DE, X_ES, X_IT and pooled X (B c4+): PASS list (a)-(i) with (a) lowered to >= 40 pairs; per language reported when >= 15 pairs. A language whose AUC >= 0.62 with lower bound > 0.55 is an EXTENSION candidate, not a confirmed scope.
//   T7 NATURAL SAMPLE (E_CORE + E_SRV, plus the others separately): false-alarm rate = share of random unlabelled B tokens with S_ENTRY >= 1, per stratum, with Wilson 95% intervals; PPV at natural prevalence = TPR x pi / (TPR x pi + FPR x (1 - pi)), pi = candidate positives / (positives + unlabelled) per stratum
//       over the arm's days (TPR from the matched names of the same stratum).
//   T8 MECHANISM (SHUF): AUC of S_ENTRY for real / shufW / shufG on the same three days, with intervals; and R_INIT AUC under the same three conditions. A rule that rests on message-initial recurrence must lose its signal under shufW; a rule that rests on any company must lose it under shufG.
//   T9 UD SWEEP (exploratory): pooled B c4+ stratified AUC over the 53 languages (blocks = language x half), per-language AUC with 99% interval when >= 15 pairs, shares of S_ENTRY >= 1 among PROPN vs matched non-PROPN per language. A language is flagged a CANDIDATE only if AUC >= 0.62 and the Bonferroni (53 languages) lower bound > 0.5.
//   T10 R_INIT as a fixed rival rule: AUC of R_INIT on E_CORE B c4+, E_REUSE B c4+, X (pooled); sensitivity/specificity at the untuned threshold R_INIT >= 0.25; reported as a rival of the same scope, not as a replacement verdict.
//
// VERDICT MAP (applied mechanically to T1 and T2). CONFIRMED = T1 PASS and not (j)-FAIL. NOT_CONFIRMED = T1 stratified AUC < 0.58, or its bootstrap interval includes 0.5, or specificity < 0.90, or the position controls are out of band / the control probe > 0.58 (VOID comparison), or K1/K6 fail.
//   PARTIAL = anything else, in particular: T1 clears (b)-(d) but fails (g), (i), (j) or a single stratum; or T1 is under-powered/indeterminate (< 60 pairs or lower bound in (0.50, 0.55]) while T2 passes. The scope is then stated as the strata with stratum AUC >= 0.58 (n >= 15) and the languages/arms that pass.
//
// BLIND PREDICTIONS (belief about MY data; direction not blind, see disclosure 5).
//   P1 T1 stratified AUC 0.80 (80% interval 0.70-0.89); P(T1 clears b-d) = 0.85. P2 specificity >= 0.95: 0.85; sensitivity pooled 0.60 (0.45-0.75), by stratum about 0.40 / 0.65 / 0.80. P3 floor (j) E_CORE+E_SRV c2+c3 AUC 0.52 (0.43-0.60): P(in [0.45, 0.55]) = 0.50, P(> 0.58) = 0.15.
//   P4 overall T1 PASS (all of a-k): 0.50. P5 T2 PASS: 0.80. P6 T5 specificity on group A < 0.90: 0.85. P7 T6 pooled X passes (b)-(d): 0.55; German passes alone: 0.35. P8 T7 false-alarm rate <= 3% in every stratum: 0.70; PPV at natural prevalence <= 0.30: 0.75.
//   P9 T8 real AUC >= 0.70: 0.85; shufW AUC <= 0.62: 0.55; shufG AUC in [0.45, 0.58]: 0.80. P10 T9 pooled UD AUC <= 0.58: 0.75; S_ENTRY >= 1 on <= 2% of PROPN in English and French: 0.80; >= 1 CANDIDATE language: 0.25.
//   P11 T10 R_INIT AUC on E_CORE B c4+ >= 0.85: 0.80 (the scoper reported 0.931; not blind). P12 K7 hash identity >= 95%: 0.90; K1 = 100% and K6 = 100%: 0.97.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { aucPN, aucPairs, stratAuc, bootStrat, permStrat, round, quantile } from "../ablation-scope/stats.mjs";
import { cvScores } from "../../name-war-and-peace.mjs";
import { HERE, CONTROLS, ctlOf, burstOf, sEntry, sAll, sOwn } from "./lib.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const B = Number(opt("--B", 2000)), SEED = 20261007;
const ST4 = ["c4_6", "c7_15", "c16p"], ST23 = ["c2", "c3"];

// ── load design + reads, build pairs ───────────────────────────────────────────────────────────────────────────
function loadAll() {
  const design = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design.json"), "utf8"));
  const dir = path.join(HERE, "data", "read"), reads = new Map(), sums = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".summary.json"))) {
    const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); sums.push(s);
    const m = new Map(); for (const l of fs.readFileSync(path.join(dir, f.replace(".summary.json", ".jsonl")), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); m.set(o.k, o.rec); }
    reads.set(`${s.doc}|${s.cond}`, m);
  }
  return { design, reads, sums };
}
const scoreOf = (t, rec) => ({ S_ENTRY: sEntry(rec.counts), S_ALL: sAll(rec.counts), S_OWN: sOwn(rec.counts), EXTENT: rec.extent.tokens, NONNULL: rec.isNull ? 0 : 1, ...ctlOf(t), R_BURST: burstOf(t), R_INIT: t.rinit,
  cv: [Math.log(t.c), Math.log1p(t.s), t.i, t.len, t.fbin, Math.log(t.sl)], c: t.c, s: t.s, w: t.w, len: t.len, fbin: t.fbin, sl: t.sl });
const blockOf = (t) => `${t.doc}|${t.cond}|h${t.units >= 2000 ? Math.min(1, Math.floor((2 * t.s) / t.units)) : 0}`;
function buildPairs(design, reads) {
  const by = new Map(), nat = [];
  let missing = 0;
  for (const t of design.tokens) {
    const rec = reads.get(`${t.doc}|${t.cond}`)?.get(`${t.s}:${t.i}`);
    if (!rec) { missing += 1; continue; }
    const m = scoreOf(t, rec);
    if (t.kind === "nat") { nat.push({ arm: t.arm, doc: t.doc, stratum: t.stratum, grp: t.grp, m }); continue; }
    (by.get(t.pair) ?? by.set(t.pair, { id: t.pair, arm: t.arm, doc: t.doc, cond: t.cond, grp: t.grp, stratum: t.stratum, block: blockOf(t), pos_s: 0 }).get(t.pair))[t.y ? "p" : "n"] = m;
    if (t.y) by.get(t.pair).pos_s = t.s;
  }
  return { pairs: [...by.values()].filter((x) => x.p && x.n), nat, missing };
}
const sel = (pairs, f) => pairs.filter(f);
const byStr = (pairs, strata) => Object.fromEntries(strata.map((st) => [st, pairs.filter((x) => x.stratum === st)]));
const dateOf = (doc) => doc.split("/")[1] + "|" + doc.split("/")[0];
const wilson = (k, n, z = 1.96) => { if (!n) return [null, null]; const p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n)); return [round((c - h) / d), round((c + h) / d)]; };
const ge1 = (m) => m.S_ENTRY >= 1;

// consistency groups (header): chronological days; >= 24 pairs -> 4 stream quartiles; others merged in order until >= 6 pairs; short remainder joins the previous group
function consistencyGroups(pairs) {
  const days = [...new Set(pairs.map((x) => x.doc))].sort((a, b) => (dateOf(a) < dateOf(b) ? -1 : 1));
  const groups = []; let acc = [];
  for (const d of days) {
    const ps = pairs.filter((x) => x.doc === d);
    if (ps.length >= 24) { if (acc.length) { if (acc.length >= 6 || !groups.length) groups.push(acc); else groups[groups.length - 1].push(...acc); acc = []; }
      const s = ps.slice().sort((a, b) => a.pos_s - b.pos_s); for (let q = 0; q < 4; q++) groups.push(s.slice(Math.floor((q * s.length) / 4), Math.floor(((q + 1) * s.length) / 4))); continue; }
    acc.push(...ps); if (acc.length >= 6) { groups.push(acc); acc = []; }
  }
  if (acc.length) { if (groups.length) groups[groups.length - 1].push(...acc); else groups.push(acc); }
  return groups;
}

// ── one scope: all statistics of the header ─────────────────────────────────────────────────────────────────────
let seedCtr = SEED;
const nextSeed = () => seedCtr++;
function evalScope(pairs, strata, { f = (m) => m.S_ENTRY, minPairs = 60, groups = true, probe = true, caliper = true, extra = true, Bn = B } = {}) {
  const by = byStr(pairs, strata), live = strata.filter((st) => by[st].length >= 2), poolBy = Object.fromEntries(live.map((st) => [st, by[st]]));
  const all = Object.values(poolBy).flat(), out = { strata, liveStrata: live, pairs: all.length, days: new Set(all.map((x) => x.doc)).size };
  if (all.length < 4) { out.insufficient = true; return out; }
  const bt = bootStrat(poolBy, f, { B: Bn, seed: nextSeed() }), pm = permStrat(poolBy, f, { B: Bn, seed: nextSeed() });
  Object.assign(out, { auc: bt.point, ci: [bt.lo, bt.hi], permQ95: pm.q95, permP: pm.p });
  out.perStratum = Object.fromEntries(live.map((st) => { const ps = by[st], b = bootStrat({ [st]: ps }, f, { B: Math.min(Bn, 1000), seed: nextSeed() });
    return [st, { n: ps.length, auc: round(aucPairs(ps, f)), ci: [b.lo, b.hi], sens: round(ps.filter((x) => ge1(x.p)).length / ps.length), spec: round(ps.filter((x) => !ge1(x.n)).length / ps.length) }]; }));
  out.sens = round(all.filter((x) => ge1(x.p)).length / all.length); out.spec = round(all.filter((x) => !ge1(x.n)).length / all.length);
  out.nonNullNames = round(all.filter((x) => x.p.NONNULL).length / all.length); out.nonNullUnlabelled = round(all.filter((x) => x.n.NONNULL).length / all.length);
  out.controls = Object.fromEntries(CONTROLS.map((c) => [c, round(stratAuc(poolBy, (m) => m[c]))]));
  out.controlsInBand = Object.values(out.controls).every((v) => v >= 0.45 && v <= 0.55);
  out.positionControlsInBand = ["R_POS", "R_IPOS"].every((c) => out.controls[c] >= 0.45 && out.controls[c] <= 0.55);
  if (probe && all.length >= 20) { const mem = all.flatMap((x) => [{ m: x.p, y: 1, b: x.block }, { m: x.n, y: 0, b: x.block }]), sc = cvScores(mem.map((r) => r.m.cv), mem.map((r) => r.y), mem.map((r) => r.b)); mem.forEach((r, k) => { r.m.PROBE = sc[k] ?? 0; }); out.controlProbeAuc = round(stratAuc(poolBy, (m) => m.PROBE)); }
  if (caliper) { const cal = Object.fromEntries(live.map((st) => [st, by[st].filter((x) => x.p.fbin === x.n.fbin && x.p.len === x.n.len && Math.abs(Math.log(x.p.sl / x.n.sl)) <= 0.25 && Math.abs(Math.log(x.p.c / x.n.c)) <= 0.15)]));
    const nc = Object.values(cal).flat().length; out.caliper = { pairs: nc }; if (nc >= 20) { const cb = bootStrat(cal, f, { B: Math.min(Bn, 1000), seed: nextSeed() }); out.caliper.auc = cb.point; out.caliper.ci = [cb.lo, cb.hi]; } }
  if (groups) { const gs = consistencyGroups(all), per = gs.filter((g) => g.length >= 3).map((g) => [g[0].doc + (gs.length > 1 ? "+" : ""), g.length, round(aucPairs(g, f))]);
    out.consistency = { groups: gs.length, evaluable: per.length, above: per.filter((r) => r[2] > 0.5).length, geq: per.filter((r) => r[2] >= 0.5).length, per }; }
  if (extra) { const bb = bootStrat(poolBy, f, { B: Math.min(Bn, 1000), seed: nextSeed(), g: (m) => m.R_BURST }), bi = bootStrat(poolBy, f, { B: Math.min(Bn, 1000), seed: nextSeed(), g: (m) => m.R_INIT });
    const ri = bootStrat(poolBy, (m) => m.R_INIT, { B: Math.min(Bn, 1000), seed: nextSeed() }), br = bootStrat(poolBy, (m) => m.R_BURST, { B: Math.min(Bn, 1000), seed: nextSeed() });
    out.rivals = { R_INIT: { auc: ri.point, ci: [ri.lo, ri.hi], diffSEntryMinus: [bi.point, bi.lo, bi.hi], sens025: round(all.filter((x) => x.p.R_INIT >= 0.25).length / all.length), spec025: round(all.filter((x) => x.n.R_INIT < 0.25).length / all.length) },
      R_BURST: { auc: br.point, ci: [br.lo, br.hi], diffSEntryMinus: [bb.point, bb.lo, bb.hi] } };
    out.exploratory = Object.fromEntries(["S_ALL", "S_OWN", "EXTENT"].map((k) => [k, round(stratAuc(poolBy, (m) => m[k]))])); }
  return out;
}
/** The PASS list of the header (T1/T2/T6): returns each criterion and the conjunction. */
function passList(r, { minPairs = 60, floorOk = true } = {}) {
  if (r.insufficient) return { pass: false, why: "insufficient" };
  const c = {};
  c.a_pairs = r.pairs >= minPairs; c.b_auc = r.auc >= 0.62; c.c_lb = r.ci[0] > 0.55; c.d_perm = r.auc > r.permQ95; c.e_controls = r.controlsInBand;
  c.f_probe = r.controlProbeAuc == null ? false : r.controlProbeAuc <= 0.58; c.g_consistency = r.consistency.evaluable >= 4 && r.consistency.above / r.consistency.evaluable >= 0.75;
  c.h_spec = r.spec >= 0.95; c.i_caliper = r.caliper.pairs < 20 ? true : r.caliper.auc >= 0.58 && r.caliper.auc >= r.auc - 0.10;
  const void_ = !r.positionControlsInBand || !c.f_probe;
  return { ...c, void: void_, pass: Object.values(c).every(Boolean) && !void_ };
}

// ── natural-sample (T7) ───────────────────────────────────────────────────────────────────────────────────────────
function naturalReport(nat, pairs, arms, designRep) {
  const out = {};
  for (const st of ST4) {
    const toks = nat.filter((x) => arms.includes(x.arm) && x.stratum === st), k = toks.filter((x) => ge1(x.m)).length;
    const ps = pairs.filter((x) => arms.includes(x.arm) && x.grp === "B" && x.stratum === st && x.cond === "real");
    let P = 0, N = 0; for (const a of arms) for (const v of Object.values(designRep.arms[a]?.perDay ?? {})) { const cc = v.candidateCounts?.[`B:${st}`]; if (cc) { P += cc.P; N += cc.N; } }
    const tpr = ps.length ? ps.filter((x) => ge1(x.p)).length / ps.length : null, fpr = toks.length ? k / toks.length : null, pi = P / Math.max(1, P + N);
    out[st] = { drawn: toks.length, flagged: k, fpr: round(fpr), fprCi: wilson(k, toks.length), tprMatched: round(tpr), tprN: ps.length, candidatesP: P, candidatesN: N, pi: round(pi, 5), ppv: tpr == null || fpr == null ? null : round((tpr * pi) / (tpr * pi + fpr * (1 - pi) + 1e-12)),
      matchedUnlabelledFpr: ps.length ? round(ps.filter((x) => ge1(x.n)).length / ps.length) : null };
  }
  let tp = 0, fp = 0; for (const st of ST4) { const o = out[st]; if (o.tprMatched == null || o.fpr == null) continue; tp += o.tprMatched * o.candidatesP; fp += o.fpr * o.candidatesN; } out.pooledPpv = tp + fp ? round(tp / (tp + fp)) : null; out.pooledFlaggedNames = round(tp, 1); out.pooledFlaggedUnlabelled = round(fp, 1);
  return out;
}
// ── main ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now(), { design, reads, sums } = loadAll(), { pairs, nat, missing } = buildPairs(design, reads);
  const designRep = JSON.parse(fs.readFileSync(path.join(HERE, "results", "design-report.json"), "utf8"));
  const real = (arm, grp, strata) => pairs.filter((x) => x.arm === arm && x.cond === "real" && x.grp === grp && strata.includes(x.stratum));
  const R = { module: "eval/law/provisional/confirm-ablscope-1-slot-ircB-c4plus/analyse.mjs", rule: "ablscope-1-slot-ircB-c4plus", B, designSha256: createHash("sha256").update(fs.readFileSync(path.join(HERE, "data", "design.json"))).digest("hex"), tokensDesigned: design.tokens.length, tokensMissing: missing, pairsBuilt: pairs.length };
  const k1n = sums.reduce((a, s) => a + s.K1_sham.n, 0), k1 = sums.reduce((a, s) => a + (s.K1_sham.nullShare ?? 0) * s.K1_sham.n, 0), k6n = sums.reduce((a, s) => a + s.K6_determinism.n, 0), k6 = sums.reduce((a, s) => a + s.K6_determinism.same, 0);
  R.controlsRun = { K1_sham: { nullShare: k1n ? round(k1 / k1n) : null, n: k1n }, K6_determinism: { same: k6, n: k6n }, gaps: sums.reduce((a, s) => a + s.gaps, 0), K7: JSON.parse(fs.readFileSync(path.join(HERE, "results", "K7-instrument-identity.json"), "utf8")) };
  R.runValid = R.controlsRun.K1_sham.nullShare === 1 && k6 === k6n;
  // T1 primary
  const T1p = real("E_CORE", "B", ST4); R.T1 = evalScope(T1p, ST4); R.T1.passList = passList(R.T1);
  const floorP = [...real("E_CORE", "B", ST23), ...real("E_SRV", "B", ST23)];
  R.T1.floor = evalScope(floorP, ST23, { groups: false, probe: false, caliper: false, extra: false });
  R.T1.floor.verdict = R.T1.floor.insufficient ? "insufficient" : R.T1.floor.auc > 0.58 ? "FAIL" : R.T1.floor.auc >= 0.45 && R.T1.floor.auc <= 0.55 ? "PASS" : "indeterminate";
  R.T1.floorE_COREonly = evalScope(real("E_CORE", "B", ST23), ST23, { groups: false, probe: false, caliper: false, extra: false });
  R.T1.cGradient = { sensC4_6: R.T1.perStratum?.c4_6?.sens ?? null, sensC7_15: R.T1.perStratum?.c7_15?.sens ?? null, sensC16p: R.T1.perStratum?.c16p?.sens ?? null };
  R.T1.sensitivityAnalysis = { withSrv: evalScope([...T1p, ...real("E_SRV", "B", ST4)], ST4, { groups: false, extra: false }) };
  R.T1.perDay = Object.fromEntries([...new Set(T1p.map((x) => x.doc))].map((d) => { const ps = T1p.filter((x) => x.doc === d); return [d, { n: ps.length, auc: round(aucPairs(ps, (m) => m.S_ENTRY)), sens: round(ps.filter((x) => ge1(x.p)).length / ps.length), spec: round(ps.filter((x) => !ge1(x.n)).length / ps.length) }]; }));
  R.T1.excludingBigDay = (() => { const ps = T1p.filter((x) => x.doc !== "kubuntu/2007-03-15"); return evalScope(ps, ST4, { groups: false, probe: false, caliper: false, extra: false, Bn: 1000 }); })();
  // T2 reuse (not untouched)
  const T2p = real("E_REUSE", "B", ST4); R.T2 = evalScope(T2p, ST4); R.T2.passList = passList(R.T2); R.T2.passList.days8 = R.T2.days >= 8; R.T2.passList.pass = R.T2.passList.pass && R.T2.days >= 8;
  R.T3 = evalScope(real("E_SRV", "B", ST4), ST4, { groups: false, probe: false, caliper: false });
  R.T4 = evalScope(real("E_REUSE", "B", ST23), ST23, { groups: false, probe: false, caliper: false, extra: false }); R.T4.verdict = R.T4.insufficient ? "insufficient" : R.T4.auc > 0.58 ? "FAIL" : R.T4.auc >= 0.45 && R.T4.auc <= 0.55 ? "PASS" : "indeterminate";
  // T5 limit group A
  R.T5 = { E_CORE: evalScope(real("E_CORE", "A", ST4), ST4, { groups: false, probe: false, caliper: false, extra: false }), E_REUSE: evalScope(real("E_REUSE", "A", ST4), ST4, { groups: false, probe: false, caliper: false, extra: false }),
    pooled: evalScope([...real("E_CORE", "A", ST4), ...real("E_REUSE", "A", ST4)], ST4, { groups: false, probe: false, caliper: false, extra: true }) };
  // T6 extension languages
  R.T6 = {}; for (const [k, arms] of [["X_DE", ["X_DE"]], ["X_ES", ["X_ES"]], ["X_IT", ["X_IT"]], ["X_ALL", ["X_DE", "X_ES", "X_IT"]]]) { const ps = arms.flatMap((a) => real(a, "B", ST4)); R.T6[k] = evalScope(ps, ST4); R.T6[k].passList = passList(R.T6[k], { minPairs: k === "X_ALL" ? 40 : 15 }); R.T6[k].floor = evalScope(arms.flatMap((a) => real(a, "B", ST23)), ST23, { groups: false, probe: false, caliper: false, extra: false, Bn: 1000 }); }
  // T7 natural sample
  R.T7 = { ENGLISH_UNTOUCHED: naturalReport(nat, pairs, ["E_CORE", "E_SRV"], designRep), E_REUSE: naturalReport(nat, pairs, ["E_REUSE"], designRep), X: naturalReport(nat, pairs, ["X_DE", "X_ES", "X_IT"], designRep), UD: naturalReport(nat, pairs, ["UD"], designRep) };
  R.__partial = { seconds: (Date.now() - t0) / 1000 }; fs.writeFileSync(path.join(HERE, "results", "confirmation.partial.json"), JSON.stringify(R, null, 1));
  return { R, pairs, nat, real, designRep, t0 };
}

async function finish() {
  const { R, pairs, real, t0 } = await main();
  // T8 mechanism controls on the same three days
  R.T8 = {}; for (const cond of ["real", "shufW", "shufG"]) { const ps = pairs.filter((x) => x.arm === "SHUF" && x.cond === cond && x.grp === "B" && ST4.includes(x.stratum)); R.T8[cond] = evalScope(ps, ST4, { groups: false, probe: false, caliper: false, extra: true, Bn: 1000 }); }
  // T9 UD sweep (exploratory)
  const ud = pairs.filter((x) => x.arm === "UD" && x.grp === "B" && ST4.includes(x.stratum));
  R.T9 = { pooled: evalScope(ud, ST4, { groups: false, probe: false, caliper: false, extra: false, Bn: 1000 }), floorC2C3: evalScope(pairs.filter((x) => x.arm === "UD" && x.grp === "B" && ST23.includes(x.stratum)), ST23, { groups: false, probe: false, caliper: false, extra: false, Bn: 1000 }), languages: {}, candidates: [] };
  const langs = [...new Set(ud.map((x) => x.doc))].sort(); let nLang = 0;
  for (const d of langs) { const ps = ud.filter((x) => x.doc === d), by = byStr(ps, ST4), pb = Object.fromEntries(ST4.filter((s) => by[s].length >= 2).map((s) => [s, by[s]]));
    const rec = { pairs: ps.length, shareNamesGe1: round(ps.filter((x) => ge1(x.p)).length / Math.max(1, ps.length)), shareUnlabelledGe1: round(ps.filter((x) => ge1(x.n)).length / Math.max(1, ps.length)) };
    if (ps.length >= 15 && Object.keys(pb).length) { nLang += 1; const b = bootStrat(pb, (m) => m.S_ENTRY, { B: 2000, seed: nextSeed(), qLo: 0.05 / 53 / 2, qHi: 1 - 0.05 / 53 / 2 }); rec.auc = b.point; rec.ciBonferroni = [b.lo, b.hi]; if (b.point >= 0.62 && b.lo > 0.5) R.T9.candidates.push(d); }
    R.T9.languages[d] = rec; }
  R.T9.languagesEvaluated = nLang;
  // verdict (mechanical map of the header)
  const t1 = R.T1, pl = t1.passList, fl = t1.floor.verdict;
  const notConf = t1.insufficient || t1.auc < 0.58 || t1.ci[0] <= 0.5 || t1.spec < 0.90 || pl.void || !R.runValid;
  R.verdictRule = pl.pass && fl !== "FAIL" ? "CONFIRMED" : notConf ? "NOT_CONFIRMED" : "PARTIAL";
  R.scopeAsConfirmed = { strataT1: ST4.filter((st) => t1.perStratum?.[st] && t1.perStratum[st].n >= 15 && t1.perStratum[st].auc >= 0.58), strataT1Under15: ST4.filter((st) => t1.perStratum?.[st] && t1.perStratum[st].n < 15), reusePass: R.T2.passList.pass, extensionPass: Object.fromEntries(Object.entries(R.T6).map(([k, v]) => [k, v.passList?.pass ?? false])), floorT1: fl, floorReuse: R.T4.verdict, groupAspecificity: R.T5.pooled.spec };
  const hdr = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0];
  R.headerSha256 = createHash("sha256").update(hdr).digest("hex"); R.seconds = round((Date.now() - t0) / 1000, 1);
  fs.writeFileSync(path.join(HERE, "results", "confirmation.json"), JSON.stringify(R, null, 1));
  const brief = (r) => (r && !r.insufficient ? { pairs: r.pairs, days: r.days, auc: r.auc, ci: r.ci, permQ95: r.permQ95, sens: r.sens, spec: r.spec, controls: r.controls, probe: r.controlProbeAuc, caliper: r.caliper, perStratum: r.perStratum } : r);
  console.log(JSON.stringify({ verdictRule: R.verdictRule, runValid: R.runValid, headerSha256: R.headerSha256, designSha256: R.designSha256, controlsRun: { K1: R.controlsRun.K1_sham, K6: R.controlsRun.K6_determinism, K7: { same: R.controlsRun.K7.same, total: R.controlsRun.K7.total } },
    T1: brief(R.T1), T1pass: pl, floor: { verdict: fl, auc: t1.floor.auc, ci: t1.floor.ci, pairs: t1.floor.pairs }, T2: { ...brief(R.T2), pass: R.T2.passList }, scope: R.scopeAsConfirmed }, null, 1));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await finish();
