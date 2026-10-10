// attack-a-analyse.mjs -- ATTACK A (LEAKAGE AND CONFOUNDS) on rule "ablscope-1-slot-ircB-c4plus": IF English IRC support chat (M=256) AND token not message-initial AND local count c >= 4 THEN S_ENTRY >= 1 marks a nickname.
//   node attack-a-analyse.mjs [--B 1000]      (reads the confirmer's design.json + stored reads and this attack's design-a2.json + data/read-a2; writes results/attack-a.json)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE the first run of attack-read.mjs on design-a2.json and before the first run of this file; the sha256 of everything above the END marker goes into the output) ═══
// WHAT I HAD SEEN. (1) The rule JSON and the other agent's confirmation summary given in my task (T1 AUC 0.847 on 75 pairs, E_REUSE 0.817 on 407 pairs, caliper subset 0.738 on 82 E_REUSE pairs, R_INIT AUC 0.946, shuffles 0.5075 / 0.5036, UD 0.5046).
//   (2) The confirmer's code and registered header (analyse.mjs, lib.mjs, design-*.mjs, read-pairs.mjs), the scoper's lib-data.mjs / lib-pairs.mjs / stats.mjs and the header of impact.mjs. (3) design-time counts of MY OWN designs (outcome-blind): from the confirmer's 497 B c4+ positives
//   count-exact matching gives 346 pairs, strictest 91, initial-share-matched 83 (design-a.json); with all eligible positives (cap 100 per day x stratum) S1 952, S2 330, S3 431 pairs (design-a2.json), and the design-time control AUCs of those designs
//   (S1 R_RINIT 0.771; S3 R_RINIT 0.501 but R_LAST16 0.560). NO ablation value of any token of design-a2.json that the confirmer did not read has been seen. I have NOT opened any per-token record of the confirmer.
//   (4) impact.mjs says the R-B reader admits a ref-entry only for words whose dominant company is the sentence-start slot (minShare 0.5, minMembers 2, minMentions 2). I therefore expect S_ENTRY to be an echo of the initial-slot share (the confirmer says so as well).
//
// DATA. Confirmer's stored reads (instrument "ac": impactBatch, delete, F=0, M=256, three prior-free readers) of 497 B c4+ matched pairs of English IRC (E_CORE 75 untouched; E_SRV 15 untouched; E_REUSE 407 not untouched) = baseline L0; plus this attack's fresh reads of strictly
//   matched negatives and extra positives (design-a2.json): S1 count-exact, S2 strictest, S3 initial-share-matched (definitions in attack-a-design.mjs / attack-a-design2.mjs). K7 instrument identity (6 confirmer tokens per day re-read, hash must equal) must be 100% or the attack's fresh reads are void.
// STATISTICS (as the confirmer, so the numbers are comparable). Score S_ENTRY (higher = name). Stratified AUC over c4_6 / c7_15 / c16p weighted by pairs, 95% percentile cluster bootstrap B=1000 (blocks = document x half stream), within-pair label-swap permutation q95 (B=1000),
//   sensitivity = share of names with S_ENTRY >= 1, specificity = share of matched unlabelled with S_ENTRY = 0, controls = stratified AUC of the six matched-out controls (+ R_BURST, R_LAST16, R_DOCCOUNT, R_RINIT, R_CINIT as reported extras). Position controls R_POS and R_IPOS must be in [0.45, 0.55] or the level is VOID.
//
// TESTS AND DECISION RULES (fixed now; thresholds are the confirmer's, tightened where marked [T]; none is loosened).
//   A1 COUNT-EXACT (S1, all English arms pooled, then separately untouched U = E_CORE + E_SRV and reuse R = E_REUSE): SURVIVES if AUC >= 0.70 [T: confirmer 0.62], bootstrap lower bound > 0.58 [T: 0.55], above permutation q95, position controls in band, specificity >= 0.90.
//       NARROWED if AUC in [0.62, 0.70) or lower bound in (0.50, 0.58]; FALLS if AUC < 0.58 or the interval includes 0.5 or specificity < 0.90.
//   A2 STRICTEST (S2) same rule, reported with its n (expected 300+ pairs).
//   A3 INITIAL-SHARE-MATCHED (S3: R_INIT of the other mentions matched within 0.10): the question is whether S_ENTRY carries information beyond the share of a form's in-window mentions that open a message. CARRIES it if AUC >= 0.62 and lower bound > 0.55 and the position controls are in band;
//       otherwise S_ENTRY is an echo of initial-slot recurrence. Reported also on pairs with |dlast16| <= 2 (S3r) because design-time R_LAST16 was 0.56.
//   A4 SAME-POSITIVE DROP: for the confirmer's own positives that obtained an S1 match, AUC with the confirmer's matched negative (L0) minus AUC with the S1 negative, cluster bootstrap. A drop whose interval excludes 0 and exceeds 0.05 is "matching-sensitive".
//   A5 RESIDUAL IMBALANCE of the confirmer's own pairs (L0, all English): distribution of |dc| (exact share, within 1), |ln c ratio|, d fbin, d len, d recency (last16, cBefore), d R_INIT; AUC of every unmatched covariate; paired-logistic odds ratio of S_ENTRY >= 1 (name vs control)
//       unadjusted, adjusted for (dlog c, dlog msglen, dlen, dfbin, dlog docCount, dburst), and additionally for d R_INIT; block bootstrap B=300 intervals. Reported; it is not gated.
//   A6 STATIC LEAKAGE AUDIT: scan the instrument path for the speaker field, nick, goldPos, upper-casing / casing tests, word lists or priors; assert the reader receives doc.stream (lowercased string[][]) and token {s,i,id} only. FAILS the rule's observables claim if any gold or casing input reaches impactBatch.
//   A7 ONE-SIDED NOTE ON LABELS: unlabelled forms that are real but non-speaking persons are counted as negatives; this can only lower specificity. Reported as a limitation, not tested.
//
// VERDICT OF ATTACK A: SUCCESSFUL (rule FALLS) if A1 FALLS; NARROWING if A1 or A2 NARROWED, or A3 says echo (state it as scope: the rule is a thresholded echo of initial-slot recurrence); FAILED (rule STANDS against A) if A1 and A2 SURVIVE and A3 CARRIES.
// BLIND PREDICTIONS (my belief about the fresh data; direction not blind, see 4). P1 A1 pooled AUC 0.79 (80% interval 0.70-0.87); P(SURVIVES) = 0.60. P2 A2 AUC 0.76 (0.62-0.88); P(SURVIVES) = 0.40. P3 A3 AUC 0.58 (0.48-0.72); P(CARRIES) = 0.30.
//   P4 specificity of S_ENTRY >= 1 under S1 >= 0.95: 0.80. P5 K7 100%: 0.95. P6 A4 drop (L0 minus S1 on the same positives) 0.04 (0.00-0.10). P7 adjusted OR for S_ENTRY >= 1 stays > 3 after adjusting for the six covariates and > 1.5 after adding d R_INIT: 0.50.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { HERE, CONF, ST4, loadTokens, readMaps, pairsOf, byStratum, liveBy, summarise, diffCi, sens, spec, controlsOf, CTL, aucPairs, stratAuc, permStrat, round, mean, quantile, pairLogit, blockBoot, sEntry, sAll, blockOf } from "./lib-a.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const B = Number(opt("--B", 1000)); let seedCtr = 20261008; const nextSeed = () => seedCtr++;
const S = (m) => m.S;

// ── data ──────────────────────────────────────────────────────────────────────────────────────────────────────
const { tokens: confTokens, missing: confMissing } = loadTokens();
const reads = readMaps([path.join(CONF, "data", "read"), path.join(HERE, "data", "read-a2")]);
const designA2 = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design-a2.json"), "utf8"));
let a2Missing = 0;
const a2Tokens = designA2.tokens.flatMap((t) => { const rec = reads.get(`${t.doc}|${t.cond}`)?.get(`${t.s}:${t.i}`); if (!rec) { a2Missing += 1; return []; } return [{ ...t, S: sEntry(rec.counts), SALL: sAll(rec.counts), block: blockOf(t) }]; });
const ENG = ["E_CORE", "E_SRV", "E_REUSE"];
const confPairs = pairsOf(confTokens, (t) => ENG.includes(t.arm) && t.cond === "real" && t.grp === "B" && ST4.includes(t.stratum));
const levelPairs = (lv) => pairsOf(a2Tokens, (t) => t.level === lv);
const U = (ps) => ps.filter((x) => x.arm === "E_CORE" || x.arm === "E_SRV"), R = (ps) => ps.filter((x) => x.arm === "E_REUSE");

function evalSet(pairs, { Bn = B, perm = true } = {}) {
  const by = liveBy(pairs, ST4), all = Object.values(by).flat();
  if (all.length < 8) return { pairs: all.length, insufficient: true };
  const sm = summarise(pairs, S, { B: Bn, seed: nextSeed() }), out = { ...sm, sens: sens(all), spec: spec(all), controls: controlsOf(all) };
  out.positionControlsInBand = ["R_POS", "R_IPOS"].every((k) => out.controls[k] >= 0.45 && out.controls[k] <= 0.55);
  out.sixControlsInBand = ["R_LOGC", "R_POS", "R_IPOS", "R_FB", "R_LEN", "R_SL"].every((k) => out.controls[k] >= 0.45 && out.controls[k] <= 0.55);
  if (perm) out.permQ95 = permStrat(by, S, { B: Math.min(Bn, 1000), seed: nextSeed() }).q95;
  const dflt = (x) => (x == null ? null : x);
  out.perStratumSens = Object.fromEntries(Object.entries(by).map(([st, ps]) => [st, { n: ps.length, sens: sens(ps), spec: spec(ps) }]));
  out.days = new Set(all.map((x) => x.doc)).size; dflt(0);
  return out;
}
const verdictCount = (r) => (r.insufficient ? "insufficient" : r.auc < 0.58 || r.ci[0] <= 0.5 || r.spec < 0.90 ? "FALLS" : r.auc >= 0.70 && r.ci[0] > 0.58 && r.auc > r.permQ95 && r.positionControlsInBand && r.spec >= 0.90 ? "SURVIVES" : "NARROWED");
const verdictInit = (r) => (r.insufficient ? "insufficient" : r.auc >= 0.62 && r.ci[0] > 0.55 && r.positionControlsInBand ? "CARRIES" : "ECHO");
const OUT = {}; // results
OUT.module = "eval/law/provisional/attack-ablscope-1-slot-ircB-c4plus/attack-a-analyse.mjs"; OUT.rule = "ablscope-1-slot-ircB-c4plus"; OUT.B = B;
OUT.data = { confTokensLoaded: confTokens.length, confMissing, a2TokensLoaded: a2Tokens.length, a2Missing, designA2Sha256: createHash("sha256").update(fs.readFileSync(path.join(HERE, "data", "design-a2.json"))).digest("hex") };
// instrument-identity controls of the fresh reads
{ const dir = path.join(HERE, "data", "read-a2"), sums = fs.readdirSync(dir).filter((f) => f.endsWith(".summary.json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  const sum = (g, k) => sums.reduce((a, s) => a + s[g][k], 0); OUT.controlsRun = { fresh: sums.reduce((a, s) => a + s.fresh, 0), gaps: sums.reduce((a, s) => a + s.gaps, 0), K1_sham: [sum("K1_sham", "n"), sums.reduce((a, s) => a + (s.K1_sham.nullShare ?? 0) * s.K1_sham.n, 0)], K6: [sum("K6_determinism", "n"), sum("K6_determinism", "same")], K7: [sum("K7_identity", "n"), sum("K7_identity", "same")] };
  OUT.runValid = OUT.controlsRun.K7[0] > 0 && OUT.controlsRun.K7[0] === OUT.controlsRun.K7[1] && OUT.controlsRun.K1_sham[0] === OUT.controlsRun.K1_sham[1] && OUT.controlsRun.K6[0] === OUT.controlsRun.K6[1]; }

// ── A0 baseline (the confirmer's own pairs, recomputed from stored reads) ───────────────────────────────────────
OUT.L0 = { E_CORE: evalSet(confPairs.filter((x) => x.arm === "E_CORE")), E_SRV: evalSet(confPairs.filter((x) => x.arm === "E_SRV"), { perm: false }), E_REUSE: evalSet(R(confPairs)), ALL_ENGLISH: evalSet(confPairs) };
// ── A1 / A2 / A3: strict levels ──────────────────────────────────────────────────────────────────────────────────
OUT.levels = {};
for (const lv of ["S1", "S2", "S3"]) {
  const ps = levelPairs(lv);
  OUT.levels[lv] = { ALL: evalSet(ps), U_untouched: evalSet(U(ps)), R_reuse: evalSet(R(ps)), E_CORE: evalSet(ps.filter((x) => x.arm === "E_CORE"), { perm: false }), confOnlyPositives: evalSet(ps.filter((x) => x.p.conf), { perm: false }) };
  if (lv === "S3") OUT.levels[lv].S3r_dlast16le2 = evalSet(ps.filter((x) => Math.abs(x.p.last16 - x.n.last16) <= 2));
}
OUT.A1 = { verdict_pooled: verdictCount(OUT.levels.S1.ALL), verdict_U: verdictCount(OUT.levels.S1.U_untouched), verdict_R: verdictCount(OUT.levels.S1.R_reuse) };
OUT.A2 = { verdict_pooled: verdictCount(OUT.levels.S2.ALL), verdict_U: verdictCount(OUT.levels.S2.U_untouched), verdict_R: verdictCount(OUT.levels.S2.R_reuse) };
OUT.A3 = { verdict_pooled: verdictInit(OUT.levels.S3.ALL), verdict_r: verdictInit(OUT.levels.S3.S3r_dlast16le2), verdict_U: verdictInit(OUT.levels.S3.U_untouched), verdict_R: verdictInit(OUT.levels.S3.R_reuse) };
// ── A4 same-positive drop ──────────────────────────────────────────────────────────────────────────────────────────
{ const l0 = new Map(confPairs.map((x) => [`${x.doc}|${x.p.s}:${x.p.i}`, x])), al = [];
  for (const x of levelPairs("S1")) { if (!x.p.conf) continue; const o = l0.get(`${x.doc}|${x.p.s}:${x.p.i}`); if (o) al.push({ p: x.p, n: x.n, n0: o.n, block: x.block, stratum: x.stratum, doc: x.doc }); }
  const a1 = (rs) => stratAuc(liveBy(rs, ST4), S), a0 = (rs) => stratAuc(liveBy(rs.map((x) => ({ ...x, n: x.n0 })), ST4), S);
  OUT.A4 = { alignedPositives: al.length, aucL0: round(a0(al)), aucS1: round(a1(al)), drop: blockBoot(al, (rs) => a0(rs) - a1(rs), { B: 500, seed: nextSeed() }) }; }
// ── A5 residual imbalance of the confirmer's pairs and paired-logistic odds ratios ───────────────────────────────
{ const ps = confPairs, ab = (f) => ps.map((x) => Math.abs(f(x.p) - f(x.n))), med = (a) => quantile(a, 0.5), share = (a, k) => round(a.filter((v) => v <= k).length / a.length);
  const dc = ab((m) => m.c), lc = ab((m) => Math.log(m.c));
  OUT.A5 = { pairs: ps.length, absDc: { exact: share(dc, 0), within1: share(dc, 1), median: med(dc), p90: quantile(dc, 0.9) }, absLnC: { le0p15: share(lc, 0.15), le0p10: share(lc, 0.10), median: round(med(lc)), p90: round(quantile(lc, 0.9)) },
    absDfbin: share(ab((m) => m.fbin), 0), absDlen: share(ab((m) => m.len), 0), absDlnSl: { median: round(med(ab((m) => Math.log(m.sl)))), le0p25: share(ab((m) => Math.log(m.sl)), 0.25) }, absDlast16: { exact: share(ab((m) => m.last16), 0), within1: share(ab((m) => m.last16), 1), mean: round(mean(ab((m) => m.last16))) },
    absDrinit: { median: round(med(ab((m) => m.rinit))), mean: round(mean(ab((m) => m.rinit))), le0p10: share(ab((m) => m.rinit), 0.10) }, controls: controlsOf(ps) };
  const f0 = [(m) => (m.S >= 1 ? 1 : 0)], cov = [(m) => Math.log(m.c), (m) => Math.log(m.sl), (m) => m.len, (m) => m.fbin, (m) => Math.log(m.docCount), (m) => Math.log((m.last16 + 0.5) / (m.rate * 16 + 0.5))];
  const sets = { unadjusted: f0, adjustedSix: [...f0, ...cov], adjustedSixPlusRinit: [...f0, ...cov, (m) => m.rinit], rinitOnly: [(m) => m.rinit], rinitPlusS: [...f0, (m) => m.rinit] };
  OUT.A5.pairedLogit = {};
  for (const [gname, g] of [["ALL", ps], ["U", U(ps)], ["R", R(ps)]]) { OUT.A5.pairedLogit[gname] = {};
    for (const [k, fs_] of Object.entries(sets)) { const bb = blockBoot(g, (rs) => pairLogit(rs, fs_)[0], { B: 200, seed: nextSeed() }); OUT.A5.pairedLogit[gname][k] = { betaFirst: bb.point, ci: [bb.lo, bb.hi], OR: round(Math.exp(bb.point), 2), orCi: [round(Math.exp(bb.lo), 2), round(Math.exp(bb.hi), 2)] }; } } }
// ── A6 static leakage audit of the instrument path ───────────────────────────────────────────────────────────────
{ const files = { "confirm/read-pairs.mjs": path.join(CONF, "read-pairs.mjs"), "attack/attack-read.mjs": path.join(HERE, "attack-read.mjs"), "law/impact.mjs": path.join(CONF, "..", "..", "impact.mjs") };
  const pats = { speakerField: /\bspeakers?\b/, nick: /\bnick/i, goldPos: /goldPos/, upperCase: /toUpperCase|isUpper|\\p\{Lu\}|[A-Z]\{2,\}\.test/, wordList: /stopwords?|STOPWORDS|wordList/i, posPriorNonNull: /posPrior\s*:\s*(?!null)\S/ };
  OUT.A6 = { scan: {} };
  for (const [name, f] of Object.entries(files)) { const lines = fs.readFileSync(f, "utf8").split("\n"); OUT.A6.scan[name] = {};
    for (const [pn, re] of Object.entries(pats)) { const hits = lines.map((l, k) => (re.test(l) && !/^\s*\/\//.test(l) ? k + 1 : 0)).filter(Boolean); OUT.A6.scan[name][pn] = hits.length ? hits.slice(0, 8) : 0; } }
  const rp = fs.readFileSync(files["confirm/read-pairs.mjs"], "utf8"); OUT.A6.readerCallPassesOnlyStream = /impactBatch\(doc\.stream, chunk\.map\(\(\[, t\]\) => t\)/.test(rp) && /toks\.set\(`\$\{t\.s\}:\$\{t\.i\}`, \{ s: t\.s, i: t\.i, id: t\.w \}\)/.test(rp);
  const ld = fs.readFileSync(path.join(CONF, "..", "ablation-scope", "lib-data.mjs"), "utf8"); OUT.A6.streamIsLowercasedTokens = /tokensOf = .*toLowerCase\(\)/.test(ld) && /stream: msgs\.map\(\(m\) => m\.toks\)/.test(ld); }
// ── verdict of attack A ─────────────────────────────────────────────────────────────────────────────────────────────
{ const a1 = OUT.A1.verdict_pooled, a2 = OUT.A2.verdict_pooled, a3 = OUT.A3.verdict_pooled;
  OUT.verdictAttackA = !OUT.runValid ? "VOID(K7)" : a1 === "FALLS" ? "SUCCESSFUL" : a1 === "NARROWED" || a2 === "NARROWED" || a2 === "FALLS" || a3 === "ECHO" ? "NARROWING" : "FAILED"; OUT.verdictParts = { a1, a2, a3 }; }
const hdr = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0];
OUT.headerSha256 = createHash("sha256").update(hdr).digest("hex");
fs.writeFileSync(path.join(HERE, "results", "attack-a.json"), JSON.stringify(OUT, null, 1));
const brief = (r) => (r.insufficient ? r : { pairs: r.pairs, days: r.days, auc: r.auc, ci: r.ci, permQ95: r.permQ95, sens: r.sens, spec: r.spec, posCtl: r.positionControlsInBand, six: r.sixControlsInBand, perStratum: r.perStratum });
console.log(JSON.stringify({ headerSha256: OUT.headerSha256, runValid: OUT.runValid, controlsRun: OUT.controlsRun, verdictAttackA: OUT.verdictAttackA, verdictParts: OUT.verdictParts,
  L0: Object.fromEntries(Object.entries(OUT.L0).map(([k, v]) => [k, brief(v)])), S1: Object.fromEntries(Object.entries(OUT.levels.S1).map(([k, v]) => [k, brief(v)])), S2: Object.fromEntries(Object.entries(OUT.levels.S2).map(([k, v]) => [k, brief(v)])),
  S3: Object.fromEntries(Object.entries(OUT.levels.S3).map(([k, v]) => [k, brief(v)])), A4: OUT.A4 }, null, 1));
