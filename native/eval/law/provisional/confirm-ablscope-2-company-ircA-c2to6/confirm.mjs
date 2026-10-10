// eval/law/provisional/confirm-ablscope-2-company-ircA-c2to6/confirm.mjs -- CONFIRMATION of candidate rule "ablscope-2-company-ircA-c2to6" on UNTOUCHED data (lens "ablation-scope"; this script is NOT the scoper's).
//
//   node confirm.mjs --arm en|other|books|ud [--stage compute|analyse|both] [--B 1000]       (never pass "run" as the first argument of name-company.mjs; this file does not import it)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE the first run of this file; thresholds below are the rule's own passIf/failIf, tightened where marked, never loosened) ═══
// RULE UNDER TEST (hypothesis from discovery; nothing here is established). IF IRC chat (M=256 messages) AND the token is the first word of its message AND its local count c in [2, 6] THEN a SMALLER
//   c.dSelf (the l2 shift of the form's window-local identity-grain company descriptor [log(1+count), distinct-left/count, distinct-right/count, left and right entropy, initial share, final share] when ONE mention is
//   deleted; logT) marks a nickname.  Compared only WITHIN a count stratum (c2, c3, c4_6); no absolute threshold.  Orientation fixed: score = -c.dSelf, HIGHER = name.  Claimed decay with c (c7_15, c16p weaker);
//   non-initial tokens reverse the sign; Middlemarch-like novels transfer at about 0.73 (not a registered PASS); equals the plain count R_INIT (so "the ablation adds no information").
// OBSERVABLE (allowed by the project's no-format-learning rule). c.dSelf is a closed-form function of the word forms of the window [s-M, s] (impact.mjs windowOf + ablate("delete") + companyStructureImpact, no reader, no capitals,
//   no POS prior, no list, no speaker field, no fitted weight). Gold (nick forms that spoke >= 3 messages that day, from the speaker field; PROPN in UD; capitalisation in novels) labels EVALUATION positives only.
// DISCLOSURE (what I had seen before this header). The rule JSON with the scoper's discovery and confirmation numbers (AUC 0.813 etc.); the scoper's code (lib-data, lib-pairs v1-v3, features, stats, read-strata, rinit-plain, the
//   header of confirm-rules-a1); the top of the scoper's summary.json (discovery rounds and the slot-rule confirmation); the day inventory and the control balance of MY pairs (design-days.mjs, design-balance.mjs, design-other.mjs: counts
//   and the AUCs of the six matched-out controls only: English days all six in [0.45, 0.55]; non-English days R_FB 0.444 out of band; novels in band); a K0 smoke test of the instrument on 60 SCOPER tokens (closed form reproduces all eight
//   stored company components to 5e-7). I have NOT computed c.dSelf, any company score, R_INIT or any shuffled score on any day, novel or language of this confirmation. I did not open results/rinit-plain.json or any scoper
//   outcome other than those listed. Other lenses (polarity-map, confirm-PM-*, attack-*, kinds-swarm) may have read some of these days/novels with other instruments; stated, not corrected.
// DATA (frozen before any score). (EN) every English-channel (ubuntu, kubuntu, xubuntu, ubuntu-server) channel-day NOT in name-rule-informal gold.files, name-company(-pairblocks) C3.days, any ablation-scope data/*/ summary
//   (discovery, confirmation, M64) or rinit-plain GROUPS, with >= 6 eligible group-A positives at c 2..6 (results/days.json, sha256 recorded in the output; 23 days). (OTHER) the same rule on ubuntu-de/-es/-it with >= 4 positives (12 days;
//   extension). (BOOKS) Emma (pg158), Sense and Sensibility (pg161), Dracula (pg345); none read with c.dSelf; gold = lib-book2 capitalisation (>= 8 non-initial occurrences, >= 95% capitalised, titles removed), evaluation only; M = 128 sentences.
//   (UD) the TEST split of every UD treebank in /private/tmp/claude-501/ud-eval (no earlier test used test.conllu), sentence-initial tokens, PUNCT removed, gold = PROPN, M = 128 sentences, languages with >= 10 pairs.
// DESIGN. Matching v3 (scoper's pairsForCellV3, unchanged: same document, same third-octave bin of c, same position class; |dlen| <= 1, |dfreq-bin| <= 1, message length, stream distance, running balance), group A (message-initial) in
//   strata c2, c3, c4_6 (PRIMARY) and c7_15, c16p (DECAY); group B (not initial) c2..c16p (BOUNDARY, 40 pairs per cell per day); <= 150 pairs per cell per day (EN, OTHER), 60 (BOOKS), 40 (UD). Seed tag "confirm2". Cluster block =
//   day x stream quartile (both members of a pair share it); books: 10 blocks per novel; UD: 2 blocks per language. Statistic = stratified AUC (pair-weighted mean of per-stratum AUCs, ties half) of the fixed score. B = 1000
//   bootstrap and 1000 label-swap permutation draws (UD family-wise max-null: 500 draws). Modest sizes by design (shared, loaded machine).
// PRIMARY TEST (EN, group A, c2+c3+c4_6, score -c.dSelf). PASS needs ALL of:  T1 stratified AUC >= 0.65 (tightened from 0.62);  T2 bootstrap 95% lower bound > 0.58 (tightened from 0.55);  T3 AUC above the label-swap permutation q95;
//   T4 same sign (orientation as fixed; AUC > 0.5);  T5 the six pooled matched-out controls R_LOGC, R_POS (position), R_IPOS, R_FB, R_LEN, R_SL each in [0.45, 0.55] (else the comparison is VOID);  T6 a ridge-logistic probe on the six control
//   variables alone (leave-one-block-out) <= 0.58 (a PROBE, an existence test, never a rule);  T7 each stratum AUC >= 0.58 where it has >= 30 pairs (within-stratum ranking);  T8 >= 8 days with a pair and, among days with >= 10 pairs, >= 75% with
//   day-AUC > 0.5;  T9 strict-caliper subset (identical frequency bin, identical length, |ln msg-length ratio| <= 0.25, |ln c ratio| <= 0.15), when it holds >= 40 pairs: AUC >= 0.58 and >= full AUC - 0.10 (and its controls in band);
//   T10 instrument: K0 closed form reproduces the scoper's stored c components (<= 1e-5 on >= 40 scoper tokens), K1 sham (nothing deleted) gives dSelf == 0 on every primary token, K6 recomputation of 50 tokens is identical;
//   T11 COMPANY SHAM: with the word order of every message in the window shuffled (marginals kept, company destroyed) the same pairs give stratified AUC in [0.44, 0.56]. Also reported, not gating: SHUF_OTHERS (shuffle every message but the
//   evaluated one, predicted <= 0.58), leave-one-day-out range, a bootstrap clustered on (day, positive form) (sensitivity S1), per-channel and per-year AUCs, raw median dSelf per stratum (an absolute threshold must not transfer).
//   DECAY (T12, failIf "does not decay"): group A c7_15 + c16p pooled (>= 60 pairs): AUC <= primary AUC - 0.05 and the bootstrap lower bound of the difference > 0.
//   VERDICT. CONFIRMED = T1-T11 hold (T12 not falsified). PARTIAL = the ranking holds in a NARROWER scope than stated (name the strata / channels / years that pass and those that fail) or holds but T11 or T12 fails (then the mechanism or the scope
//   boundary is falsified though the in-scope ranking replicates). NOT_CONFIRMED = AUC < 0.58, or the interval includes 0.5, or the sign flips, or T5/T10 void the comparison and the caliper subset also fails.
// REDUCTION (descriptive, registered): R_INIT (share of the form's window mentions, evaluated one included, that open their message) and ALLINIT (all do) on the same pairs; bootstrap difference AUC(-dSelf) - AUC(R_INIT); probes on
//   [controls + R_INIT] vs [controls + R_INIT + (-dSelf)] (incremental AUC); AUC of -dSelf inside pairs that tie on R_INIT; per-dimension descriptor-change AUCs (post hoc, no gating).
// BOUNDARY (EN group B, score +c.dSelf): the rule says higher dSelf = name for non-initial tokens (about 0.75, flat). Reported as HOLDS when AUC >= 0.62, lower bound > 0.55, controls in band.
// TRANSFER ARMS (outside the PASS; they only set scope). OTHER (de/es/it IRC, group A c2..c4_6, same score): HOLDS if AUC >= 0.62, LB > 0.55, controls in band, else the caliper subset with the same thresholds; VOID when neither is in band.
//   BOOKS (3 novels pooled, group A): transfer HOLDS if AUC >= 0.62 and LB > 0.55 and controls in band; FAILS if AUC <= 0.55 (the rule's failIf); else INCONCLUSIVE; per-novel AUCs. UD (test splits): pooled AUC and per-language AUC for languages with
//   >= 25 pairs; a language is "exceptional" only if its AUC exceeds the q95 of the family-wise MAX label-swap null over the evaluated languages; no pooled claim unless AUC >= 0.62, LB > 0.55, controls in band.
// BLIND PREDICTIONS (belief). P1 primary AUC in [0.72, 0.85] (0.65) and all of T1-T9 hold (0.70). P2 strata c2 > c3 > c4_6 not required; every stratum >= 0.65 (0.75). P3 controls in band (design-time: yes; 0.95). P4 T11 holds, SHUF_ALL in [0.44, 0.56] (0.75).
//   P5 T12 decay holds: c7+ AUC <= 0.68 (0.70). P6 R_INIT within 0.03 of -dSelf (0.70); incremental probe gain <= 0.02 (0.70); -dSelf adds no information, the rule reduces to the initial-share count (0.65). P7 BOUNDARY HOLDS, sign reverses (0.70).
//   P8 OTHER: de/es/it AUC >= 0.65 (0.60). P9 BOOKS pooled AUC in [0.55, 0.78] (0.60); HOLDS (0.50); FAILS (0.15). P10 UD pooled AUC <= 0.60 (0.70); no language exceeds the family-wise null (0.70).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { seedFor } from "../../impact.mjs";
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { loadBookCaps } from "../ablation-scope/lib-book2.mjs";
import { loadUd, UD } from "../ablation-scope/lib-ud.mjs";
import { indexAndCandidates, pairsForCellV3 } from "../ablation-scope/lib-pairs.mjs";
import { cvScores } from "../../name-war-and-peace.mjs";
import { companyAt, shuffleDoc, occOf, memberOf, strat, perStratum, aucOfPairs, boot, perm, caliperOf, controlAucs, inBand, round, mean, quantile, CONTROLS, DESC } from "./lib-dself.mjs";
import { rngFor } from "../../impact.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ARM = opt("--arm", "en"), STAGE = opt("--stage", "both"), B = Number(opt("--B", 1000));
const SELF = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
const HEADER_SHA = createHash("sha256").update(SELF.split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
const DAYS_FILE = path.join(HERE, "results", "days.json"), ROWS = path.join(HERE, "results", `rows.${ARM}.jsonl`), OUT = path.join(HERE, "results", `confirm.${ARM}.json`), CTL = path.join(HERE, "results", `ctl.${ARM}.json`);
const BK = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gitenberg";
const PRIM = ["c2", "c3", "c4_6"], DEC = ["c7_15", "c16p"], ALLS = [...PRIM, ...DEC];
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");

/** The documents of one arm with their design (reader window M, cluster-block count K, per-cell cap, cells). */
function docsOf(arm) {
  const days = JSON.parse(fs.readFileSync(DAYS_FILE, "utf8"));
  const irc = (list) => list.map((d) => () => loadIrcDay(path.join(IRC_ROOT, `${d.name}.txt`), d.name));
  if (arm === "en") return { M: 256, K: 4, loaders: irc(days.english), cells: [["A", ALLS, 150], ["B", ALLS, 40]] };
  if (arm === "other") return { M: 256, K: 4, loaders: irc(days.other), cells: [["A", PRIM, 150]] };
  if (arm === "books") return { M: 128, K: 10, loaders: ["pg158_Emma.txt", "pg161_Sense-and-Sensibility.txt", "pg345_Dracula.txt"].map((f) => () => loadBookCaps(path.join(BK, f), f)), cells: [["A", ALLS, 60]] };
  if (arm === "ud") {
    const stems = fs.readdirSync(UD).sort().filter((s) => fs.existsSync(`${UD}/${s}/test.conllu`)), keep = JSON.parse(fs.readFileSync(path.join(HERE, "results", "other-design.json"), "utf8")).ud.filter((u) => u.pairs >= 10).map((u) => u.stem);
    return { M: 128, K: 2, loaders: stems.filter((s) => keep.includes(s)).map((s) => () => loadUd(s, "test")), cells: [["A", PRIM, 40]] };
  }
  throw new Error(`unknown arm ${arm}`);
}

async function compute() {
  const t0 = Date.now(), D = docsOf(ARM), M = D.M;
  fs.writeFileSync(ROWS, "");
  const ctl = { K6_same: 0, K6_n: 0, K1_zero: 0, K1_n: 0, docs: [], design: {} };
  for (const load of D.loaders) {
    const doc = load(), cand = indexAndCandidates(doc, M), occ = occOf(doc), shuf = shuffleDoc(doc.stream, seedFor("ablscope2-shuf", doc.name)), lines = [];
    let planned = 0;
    for (const [grp, strata, n] of D.cells) for (const st of strata) {
      const r = pairsForCellV3(cand, doc, M, { grp, stratum: st, n, seedTag: "confirm2" });
      ctl.design[`${doc.name}|${grp}:${st}`] = { got: r.pairs.length, nPos: r.nPos, dropped: r.dropped }; planned += r.pairs.length;
      r.pairs.forEach((p, k) => {
        const mp = memberOf(doc, shuf, occ, p.pos, M), mn = memberOf(doc, shuf, occ, p.neg, M);
        for (const m of [mp, mn]) { ctl.K1_n += 1; if (m.sham === 0) ctl.K1_zero += 1; }
        if (ctl.K6_n < 50 && k % 7 === 0) { ctl.K6_n += 1; if (companyAt(doc.stream, p.pos.s, p.pos.i, M).dSelf === mp.dSelf) ctl.K6_same += 1; }
        const block = `${doc.name}|q${Math.min(D.K - 1, Math.floor((D.K * p.pos.s) / cand.nMsg))}`;
        lines.push(JSON.stringify({ id: `${doc.name}#${grp}${st}#${k}`, arm: ARM, doc: doc.name, grp, stratum: st, block, p: mp, n: mn }));
      });
    }
    fs.appendFileSync(ROWS, lines.map((l) => l + "\n").join(""));
    ctl.docs.push([doc.name, planned]);
    console.error(`${ARM} ${doc.name}: ${planned} pairs, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ctl.seconds = round((Date.now() - t0) / 1000, 1); ctl.headerSha256 = HEADER_SHA; ctl.daysSha256 = sha(DAYS_FILE);
  fs.writeFileSync(CTL, JSON.stringify(ctl, null, 1));
}
const loadRows = () => fs.readFileSync(ROWS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

// ── analysis helpers (all scores HIGHER = name; the rule's score is -c.dSelf) ──────────────────────────────────────────────────────────────────────────────────────────────
const NEG = (m) => -m.dSelf;
/** Attach leave-one-block-out ridge-logistic probe scores (an existence test) to the members under `name`; returns the stratified AUC of the probe. */
function probeScore(pairs, name, feat) {
  const mem = pairs.flatMap((x) => [{ m: x.p, y: 1, b: x.block }, { m: x.n, y: 0, b: x.block }]);
  const sc = cvScores(mem.map((r) => feat(r.m)), mem.map((r) => r.y), mem.map((r) => r.b));
  mem.forEach((r, k) => { r.m[name] = sc[k] ?? 0; });
  return round(strat(pairs, (m) => m[name]));
}
/** The registered core: stratified AUC, cluster bootstrap, permutation, pooled controls, control probe, per-stratum AUC, strict-caliper subset. */
function evalCore(pairs, f, { seed = 1, probe = true } = {}) {
  const sf = (ps) => strat(ps, f), bt = boot(pairs, sf, { B, seed }), pm = perm(pairs, sf, { B, seed: seed + 1 }), ctl = controlAucs(pairs);
  const out = { pairs: pairs.length, auc: round(sf(pairs)), ci: [bt.lo, bt.hi], permQ95: pm.q95, permMean: pm.mean, permP: pm.p, perStratum: perStratum(pairs, f), controls: ctl, controlsInBand: inBand(ctl) };
  if (probe) out.probeAuc = probeScore(pairs, `PROBE_${seed}`, (m) => m.cv);
  const cal = caliperOf(pairs); out.caliper = { pairs: cal.length };
  if (cal.length >= 20) { const c = boot(cal, sf, { B, seed: seed + 2 }), cc = controlAucs(cal); out.caliper = { pairs: cal.length, auc: c.point, ci: [c.lo, c.hi], controls: cc, controlsInBand: inBand(cc) }; }
  return out;
}
const groupBy = (xs, key) => { const m = new Map(); for (const x of xs) { const k = key(x); (m.get(k) ?? m.set(k, []).get(k)).push(x); } return m; };
/** Per-group stratified AUC (days, channels, years, books, languages). */
function perGroup(pairs, key, f, minPairs = 10) {
  const out = {}; for (const [k, ps] of [...groupBy(pairs, key)].sort()) out[k] = { pairs: ps.length, auc: ps.length >= minPairs ? round(strat(ps, f)) : null };
  return out;
}
function leaveOneDayOut(pairs, f) {
  const vals = []; for (const d of new Set(pairs.map((x) => x.doc))) { const ps = pairs.filter((x) => x.doc !== d); vals.push(strat(ps, f)); }
  return { min: round(Math.min(...vals)), max: round(Math.max(...vals)) };
}
/** The reduction: is -dSelf more than the plain initial-share count? */
function reduction(prim) {
  const aN = strat(prim, NEG), aI = strat(prim, (m) => m.R_INIT), aAll = strat(prim, (m) => m.ALLINIT);
  const diff = boot(prim, (ps) => strat(ps, NEG) - strat(ps, (m) => m.R_INIT), { B, seed: 7 });
  const pI = probeScore(prim, "PR_I", (m) => [...m.cv, m.R_INIT]), pID = probeScore(prim, "PR_ID", (m) => [...m.cv, m.R_INIT, -m.dSelf]), pD = probeScore(prim, "PR_D", (m) => [...m.cv, -m.dSelf]);
  const ties = prim.filter((x) => x.p.R_INIT === x.n.R_INIT);
  return { aucNegDSelf: round(aN), aucRInit: round(aI), aucAllInit: round(aAll), diffNegDSelfMinusRInit: diff, probeControlsPlusRInit: pI, probeControlsPlusRInitPlusDSelf: pID, probeControlsPlusDSelf: pD, incrementalOverRInit: round(pID - pI),
    tiesOnRInit: { pairs: ties.length, aucNegDSelf: ties.length >= 8 ? round(strat(ties, NEG)) : null },
    perDimension: Object.fromEntries(DESC.map((d, k) => [d, round(strat(prim, (m) => -m.dd[k]))])),
    medianDSelf: Object.fromEntries(PRIM.map((st) => { const ps = prim.filter((x) => x.stratum === st); return [st, { pos: round(quantile(ps.map((x) => x.p.dSelf), 0.5)), neg: round(quantile(ps.map((x) => x.n.dSelf), 0.5)), n: ps.length }]; })) };
}
/** K0: the closed form reproduces the scoper's stored company components on scoper tokens (no data of this confirmation). */
function k0() {
  const f = path.join(HERE, "..", "ablation-scope", "data", "confirmation", "ubuntu_2011-03-15.cf.c2-c3-c4_6.jsonl");
  const rows = fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, 60), doc = loadIrcDay(path.join(IRC_ROOT, "ubuntu/2011-03-15.txt"), "ubuntu/2011-03-15");
  let mx = 0, n = 0;
  for (const r of rows) { if (doc.stream[r.s][r.i] !== r.w) continue; const o = companyAt(doc.stream, r.s, r.i, 256); n += 1; for (let k = 0; k < 8; k++) mx = Math.max(mx, Math.abs(o.c8[k] - r.rec.c[k])); }
  return { tokens: n, maxAbsDiff: mx, pass: n >= 40 && mx <= 1e-5 };
}
const dayStats = (prim) => { const by = groupBy(prim, (x) => x.doc), days = [...by].map(([d, ps]) => ({ d, n: ps.length, auc: ps.length >= 10 ? strat(ps, NEG) : null })), ev = days.filter((x) => x.auc != null);
  return { daysWithPairs: days.length, daysEvaluable: ev.length, daysAbove05: ev.filter((x) => x.auc > 0.5).length, share: ev.length ? round(ev.filter((x) => x.auc > 0.5).length / ev.length) : null, perDay: Object.fromEntries(days.map((x) => [x.d, [x.n, x.auc == null ? null : round(x.auc)]])) }; };

// ── the arms ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function analyseEn(rows, ctl) {
  const A = rows.filter((r) => r.grp === "A"), Bg = rows.filter((r) => r.grp === "B"), prim = A.filter((r) => PRIM.includes(r.stratum)), dec = A.filter((r) => DEC.includes(r.stratum));
  const core = evalCore(prim, NEG, { seed: 101 }), res = { core };
  res.days = dayStats(prim); res.leaveOneDayOut = leaveOneDayOut(prim, NEG);
  res.perChannel = perGroup(prim, (x) => x.doc.split("/")[0], NEG); res.perYear = perGroup(prim, (x) => x.doc.split("/")[1].slice(0, 4), NEG);
  res.shamCompany = { ALL: round(strat(prim, (m) => -m.shufAll)), OTHERS: round(strat(prim, (m) => -m.shufOthers)) };
  res.S1_formCluster = boot(prim.map((x) => ({ ...x, block: `${x.doc}|${x.p.w}` })), (ps) => strat(ps, NEG), { B, seed: 102 });
  res.reduction = reduction(prim); res.K0 = k0();
  const all = [...prim, ...dec], isPrim = (x) => PRIM.includes(x.stratum);
  res.decay = { pairs: dec.length, perStratum: perStratum(dec, NEG), controls: dec.length >= 10 ? controlAucs(dec) : null };
  if (dec.length >= 60) { const c = evalCore(dec, NEG, { seed: 103, probe: false }); res.decay.auc = c.auc; res.decay.ci = c.ci;
    res.decay.diffPrimMinusDecay = boot(all, (ps) => strat(ps.filter(isPrim), NEG) - strat(ps.filter((x) => !isPrim(x)), NEG), { B, seed: 104 }); }
  res.boundary = { score: "+c.dSelf on non-initial tokens", ...evalCore(Bg, (m) => m.dSelf, { seed: 201 }) };
  res.boundary.holds = res.boundary.controlsInBand && res.boundary.auc >= 0.62 && res.boundary.ci[0] > 0.55;
  const T = {}, st = core.perStratum, ev = PRIM.map((s) => st[s]).filter((x) => x.n >= 30), cal = core.caliper;
  T.T1 = core.auc >= 0.65; T.T2 = core.ci[0] > 0.58; T.T3 = core.auc > core.permQ95; T.T4 = core.auc > 0.5; T.T5 = core.controlsInBand; T.T6 = core.probeAuc <= 0.58;
  T.T7 = ev.length > 0 && ev.every((x) => x.auc >= 0.58); T.T8 = res.days.daysWithPairs >= 8 && (res.days.share == null || res.days.share >= 0.75);
  T.T9 = cal.pairs < 40 ? null : cal.auc >= 0.58 && cal.auc >= core.auc - 0.1 && cal.controlsInBand;
  T.T10 = res.K0.pass && ctl.K1_zero === ctl.K1_n && ctl.K6_same === ctl.K6_n; T.T11 = res.shamCompany.ALL >= 0.44 && res.shamCompany.ALL <= 0.56;
  T.T12 = res.decay.auc == null ? null : res.decay.auc <= core.auc - 0.05 && res.decay.diffPrimMinusDecay.lo > 0;
  const failed = Object.keys(T).filter((k) => k !== "T12" && T[k] === false);
  res.tests = T; res.failedGating = failed;
  res.autoVerdict = core.auc < 0.58 || core.ci[0] <= 0.5 || !T.T4 ? "NOT_CONFIRMED" : !failed.length && T.T12 !== false ? "CONFIRMED" : "PARTIAL(inspect)";
  return res;
}
function analyseGeneric(rows, arm) {
  const prim = rows.filter((r) => r.grp === "A" && PRIM.includes(r.stratum)), dec = rows.filter((r) => r.grp === "A" && DEC.includes(r.stratum)), core = evalCore(prim, NEG, { seed: 301 }), res = { core };
  res.shamCompany = { ALL: round(strat(prim, (m) => -m.shufAll)), OTHERS: round(strat(prim, (m) => -m.shufOthers)) };
  res.perDoc = perGroup(prim, (x) => x.doc, NEG, 10); if (arm === "other") res.perChannel = perGroup(prim, (x) => x.doc.split("/")[0], NEG, 10);
  res.reduction = prim.length >= 20 ? reduction(prim) : null;
  if (dec.length >= 20) { const c = evalCore(dec, NEG, { seed: 303, probe: false }); res.decay = { pairs: dec.length, auc: c.auc, ci: c.ci, controls: c.controls, controlsInBand: c.controlsInBand, perStratum: c.perStratum }; }
  const hold = (c) => c.controlsInBand && c.auc >= 0.62 && c.ci[0] > 0.55 && c.permQ95 != null && c.auc > c.permQ95, cal = core.caliper;
  res.holdsPrimary = prim.length >= 60 && hold(core); res.holdsCaliper = cal.pairs >= 40 && cal.controlsInBand && cal.auc >= 0.62 && cal.ci[0] > 0.55;
  res.verdict = res.holdsPrimary ? "HOLDS" : core.controlsInBand ? (arm === "books" && core.auc <= 0.55 ? "FAILS(<=0.55)" : arm === "books" && core.auc < 0.62 ? "INCONCLUSIVE" : "DOES NOT HOLD")
    : cal.pairs >= 20 && cal.controlsInBand ? (res.holdsCaliper ? "HOLDS(caliper)" : "DOES NOT HOLD(caliper)") : "VOID";
  return res;
}
function analyseUd(rows) {
  const prim = rows.filter((r) => r.grp === "A" && PRIM.includes(r.stratum)), core = evalCore(prim, NEG, { seed: 401 }), res = { core }, by = groupBy(prim, (x) => x.doc);
  res.shamCompany = { ALL: round(strat(prim, (m) => -m.shufAll)), OTHERS: round(strat(prim, (m) => -m.shufOthers)) };
  const langs = [...by].filter(([, ps]) => ps.length >= 25).map(([d]) => d).sort(), obs = Object.fromEntries(langs.map((d) => [d, strat(by.get(d), NEG)])), rnd = rngFor(seedFor("ablscope2-ud-fw"));
  const mx = [], mn = [];
  for (let b = 0; b < 500; b++) { const v = langs.map((d) => strat(by.get(d).map((x) => (rnd() < 0.5 ? { ...x, p: x.n, n: x.p } : x)), NEG)).filter((x) => x != null); mx.push(Math.max(...v)); mn.push(Math.min(...v)); }
  res.familyWise = { languagesEvaluated: langs.length, maxNullQ95: round(quantile(mx, 0.95)), minNullQ05: round(quantile(mn, 0.05)) };
  res.perLanguage = Object.fromEntries([...by].sort().map(([d, ps]) => [d.replace(".test", ""), { pairs: ps.length, auc: ps.length >= 25 ? round(obs[d]) : null, exceeds: ps.length >= 25 ? obs[d] > res.familyWise.maxNullQ95 : null, reversed: ps.length >= 25 ? obs[d] < res.familyWise.minNullQ05 : null }]));
  res.exceptional = Object.entries(res.perLanguage).filter(([, v]) => v.exceeds).map(([k]) => k); res.reversed = Object.entries(res.perLanguage).filter(([, v]) => v.reversed).map(([k]) => k);
  res.reduction = prim.length >= 20 ? reduction(prim) : null;
  res.pooledHolds = core.controlsInBand && core.auc >= 0.62 && core.ci[0] > 0.55;
  return res;
}

async function main() {
  if (STAGE !== "analyse") await compute();
  if (STAGE === "compute") return;
  const t0 = Date.now(), rows = loadRows(), ctl = JSON.parse(fs.readFileSync(CTL, "utf8"));
  const res = { arm: ARM, headerSha256: HEADER_SHA, daysSha256: sha(DAYS_FILE), rowsSha256: sha(ROWS), B, pairsTotal: rows.length, instrument: { K1_sham_zero: [ctl.K1_zero, ctl.K1_n], K6_determinism: [ctl.K6_same, ctl.K6_n] }, computeSeconds: ctl.seconds, docs: ctl.docs };
  res.result = ARM === "en" ? analyseEn(rows, ctl) : ARM === "ud" ? analyseUd(rows) : analyseGeneric(rows, ARM);
  res.analyseSeconds = round((Date.now() - t0) / 1000, 1);
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  const c = res.result.core ?? {}; console.log(JSON.stringify({ file: OUT, arm: ARM, pairs: rows.length, auc: c.auc, ci: c.ci, verdict: res.result.autoVerdict ?? res.result.verdict, headerSha256: HEADER_SHA }));
}
await main();
