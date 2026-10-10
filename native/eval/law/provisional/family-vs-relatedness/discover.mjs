// eval/law/provisional/family-vs-relatedness/discover.mjs — DISCOVERY (UD DEV only): is the company-profile transfer pattern of name-company C2 a WORD-ORDER effect, a GENUS
// (relatedness) effect, a SCRIPT effect or a donor-quality effect?  Selects at most two provisional group rules for confirmation on UD TEST (confirm.mjs).
//
//   NAME_COMPANY_PAIRBLOCK=1 node discover.mjs <LATER-BOTH|FIRST-LEFT|FIRST-BOTH>   (stage 1)
//   NAME_COMPANY_PAIRBLOCK=1 node discover.mjs sets <cell> <shard> <nshards> ; node discover.mjs merge <cell> ; node discover.mjs select
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen before this header: the whole name-company record (NAME-COMPANY-RESULTS.md and the per-language own-language AUCs and C2 same/other numbers of the valid
//   run, 22 languages, dev). Role-config word-order shares for all 53 stems. The PAIR COUNTS per language and stratum of the dev cache (no AUC). ONE transfer AUC of this lens: a
//   timing test fitted a probe on eng+spa (100 LATER pairs each, one draw) and scored fra: BOTH LATER dev AUC 0.639. Not seen: every other single-donor or set transfer AUC of
//   any language outside the 22 of C2; any genus/order/script/morphology contrast; any UD test.conllu content (the test cache has not been built).
// DATA. UD DEV of the 52-language roster of groups.mjs (cmn-hans dropped: same corpus as cmn); matched pairs exactly as name-company (name-company.mjs pairsOf, PAIRBLOCK=1,
//   <= 600 pairs per language and stratum, positives = PROPN occurrences, negatives = NOUN/VERB/ADJ occurrences matched on form-frequency bin, within-sentence position,
//   character length, sentence length). Gold UPOS is used ONLY to build the labels. Features are the name-company company profile: rank-bin slots of left-1, left-2, right-1,
//   right-2 (BOTH = all four, LEFT = left-1/left-2: the causal first-mention arm); no capital, no POS, no neighbour string, no list, no speaker field. The probe is the
//   name-company ridge-logistic (fitProbe: standardised, lambda 1.0, no tuning) = an EXISTENCE test, not a production rule. Cells: LATER-BOTH (PRIMARY, the C2 cell), FIRST-LEFT
//   and FIRST-BOTH (secondary).
// DESIGN. Donor needs >= 100 pairs in the stratum (CAP_TRAIN = 100 pairs per donor language, seeded); target needs >= 60 pairs; targets are scored on ALL their pairs.
//   (1) OWN-LANGUAGE leave-one-block-out CV AUC (donor strength / target detectability), with the POSITION arm as control.
//   (2) DYADIC single-donor matrix A[D][T] (6 seeded draws per donor, probe fitted on one language, scored on every other eligible language), the POSITION-arm matrix P and a
//       label-swap SHAM matrix S. Regression A = alpha_T + beta_D + gamma.sameGenus + gamma.sameFamilyOnly + gamma.sameOrder + gamma.sameScript + gamma.sameMorph +
//       gamma.sameTeam (target and donor fixed effects remove target detectability and donor probe quality). PRIMARY labeling: wo3 (clear SOV/SVO only; MIXED languages out of the
//       regression); SENSITIVITY: wo2 (the C2 two-family labeling, all languages), woKnow (linguistic knowledge). CIs: pigeonhole bootstrap over targets and donors (B = 1000).
//       PERMUTATION nulls (B = 300): the (family, genus) tuple permuted across languages [genus], the wo3 label permuted across clear languages [order]. The regression on P and S
//       must give coefficients within +-0.01 of zero or the regression is void.
//   (3) EQUALISED SETS (the C2 construction, K = 3 donor languages x 100 pairs, 20 seeded draws, same sizes in every set): a = same genus; b = same clear word order, different
//       genus; c = opposite clear word order, different genus; d = random from all other eligible languages; e = different genus, any order. MIXED targets get a, d, e only.
//       Per target and set: mean AUC over the draws, the POSITION-arm control of the same draws, the AUC when the target stream is SHUFFLED within sentences (company destroyed;
//       a probe trained on real donors), and a pair-flip permutation q95 of the AUC. Contrasts, with language-bootstrap CIs (B = 2000): GENUS = a - b (genus beyond word
//       order), ORDER = b - c (word order beyond genus), a - e, a - d. Twin variant: for targets with a same-annotation-team twin (spa/cat, hrv/srp) set a without the twin.
//   (4) GROUP RULES. Candidates: genus Romance, Slavic, Germanic (judged a vs e) and order SOV, SVO (judged b vs c). A target PASSES if same-set AUC >= 0.60 AND > its pair-flip q95
//       AND same-set minus control-set >= 0.05. STRICT rule for a group in a cell: >= 3 targets, >= 70% pass, lower bound of the bootstrap of (same - control) > 0, mean POSITION
//       control of the same-set in [0.45, 0.55], mean shuffled-target AUC <= 0.55. PARTIAL rule: not STRICT, >= 3 passing targets, >= 50% pass, mean (same - control) >= 0.03,
//       position control in band; the rule's scope is then NARROWED to the passing languages (a post-hoc scope, tested on untouched data). Ranking: STRICT before PARTIAL, then
//       passing count, then mean difference; at most TWO rules, distinct groups (a group's best cell, LATER-BOTH on ties). The selection is written to
//       results/discovery-selection.json by the `select` mode and nothing else chooses the rules.
// LENS VERDICTS (primary cell LATER-BOTH). GENUS EFFECT EXISTS if the regression sameGenus >= 0.03 with lower bound > 0 and above the permutation q95, AND the sets contrast
//   GENUS (a - b) >= 0.03 with lower bound > 0. ORDER EFFECT EXISTS with the same thresholds for sameOrder and ORDER (b - c). SCRIPT EFFECT likewise for sameScript. SEPARATION is
//   "genus not order" if only the first exists, "order not genus" if only the second, "both", "neither". A position control outside [0.45, 0.55] voids the comparison it belongs to.
// BLIND PREDICTIONS (orders are the claims). P1 genus beats word order: sameGenus >= 0.03 and GENUS >= 0.03 while sameOrder < 0.03 and ORDER < 0.03 in LATER-BOTH (C2's gain was
//   relatedness, concentrated in Romance). P2 sameScript < 0.03 and sameMorph < 0.03. P3 Romance is STRICT in at least one cell; Slavic is PARTIAL or STRICT; Germanic fails.
//   P4 SOV (order) is at most PARTIAL (hin/urd/tur pass; fas, eus, jpn do not). P5 all position controls in [0.45, 0.55], regressions on P and S within +-0.01 of zero, shuffled
//   target AUC within 0.03 of the shuffled position level. P6 donor quality matters: the donor fixed effects (spread of beta_D) are larger than any group coefficient.
// NOT TESTED HERE: neighbour-identity features, production reader, any register but UD text, languages with < 60 pairs (thin, listed), any UD TEST data. Thresholds may be
//   tightened after seeing dev data, never loosened.
// COST AMENDMENT (written after the first launch of this file was killed, BEFORE any output of this lens was read; no design, threshold, K, CAP, draw count or seed changed): the machine
//   load (100-400) gave each process ~5% of a core, so the run is SHARDED: stage 1 per cell (own CV, dyads, regressions) and the equalised sets computed in target shards
//   (`sets <cell> <shard> <nshards>`), then `merge <cell>`. Shards partition the targets; every (target, set, arm, draw) seed is the same as in the unsharded code.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, round, mean, rngFor, seedFor, headerHash, sha256 } from "./lib.mjs";
import { team } from "./groups.mjs";
import { STRATA, loadAll, targetsOf, donorsOf, cvAuc, dyadMatrix, dyadRows, regress, bootRegress, permNull, setsFor, contrasts, groupTable, COVS, LABELS, LABELS_WO2, LABELS_KNOW } from "./analysis.mjs";

const SELF = fileURLToPath(import.meta.url);
const RES = path.join(HERE, "results"); fs.mkdirSync(RES, { recursive: true });
const rs = (...p) => rngFor(seedFor("fam-vs-rel", "discover", ...p));
const fileHash = (f) => sha256(fs.readFileSync(path.join(HERE, f), "utf8"));
const provenance = () => ({ headerSha256: headerHash(SELF), groupsSha256: fileHash("groups.mjs"), libSha256: fileHash("lib.mjs"), analysisSha256: fileHash("analysis.mjs"), cacheSha256: fileHash("cache.mjs") });
const rnd4 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, round(v)]));

function runCell(stratum, arm) {
  const t0 = Date.now(), tag = `${stratum}-${arm}`, langs = loadAll("dev", stratum), shuf = loadAll("dev", stratum, ".shuf");
  const T = targetsOf(langs), D = donorsOf(langs);
  const out = { cell: tag, stratum, arm, ...provenance(), targets: T, donors: D, thin: Object.keys(langs).filter((s) => !T.includes(s)).map((s) => `${s}:${langs[s].pairs}`) };
  out.own = {}; for (const s of T) out.own[s] = { pairs: langs[s].pairs, cv: round(cvAuc(langs[s], arm)), cvPosition: round(cvAuc(langs[s], "POSITION")) };
  console.error(`${tag}: own CV done (${T.length} targets, ${D.length} donors) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const dm = dyadMatrix(langs, arm, tag); out.dyad = { A: dm.A, P: dm.P, S: dm.S };
  const regs = {};
  for (const [name, lab] of [["wo3", LABELS], ["wo2", LABELS_WO2], ["know", LABELS_KNOW]]) {
    const rows = dyadRows(dm.A, lab); regs[name] = { n: rows.length, est: rnd4(regress(rows)), ci: bootRegress(rows, 1000, rs("bootreg", tag, name)) };
  }
  regs.wo3.permGenus = permNull(dm.A, LABELS, "genus", 300, rs("permG", tag)); regs.wo3.permOrder = permNull(dm.A, LABELS, "order", 300, rs("permO", tag));
  regs.positionControl = rnd4(regress(dyadRows(dm.P, LABELS))); regs.shamControl = rnd4(regress(dyadRows(dm.S, LABELS)));
  const flat = (M) => Object.values(M).flatMap((o) => Object.values(o)).filter((x) => x != null);
  regs.meanA = round(mean(flat(dm.A))); regs.meanP = round(mean(flat(dm.P))); regs.meanS = round(mean(flat(dm.S)));
  const donorMean = Object.fromEntries(D.map((d) => [d, round(mean(Object.values(dm.A[d]).filter((x) => x != null)))]));
  regs.donorMeanSpread = { min: Math.min(...Object.values(donorMean)), max: Math.max(...Object.values(donorMean)) }; regs.donorMean = donorMean;
  out.regression = regs; out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(path.join(RES, `discovery-${tag}.stage1.json`), JSON.stringify(out));
  console.error(`${tag}: stage 1 done ${((Date.now() - t0) / 1000).toFixed(0)}s; sameGenus ${regs.wo3.est.sameGenus} sameOrder ${regs.wo3.est.sameOrder}`);
}
function runSets(stratum, arm, shard, nsh) {
  const t0 = Date.now(), tag = `${stratum}-${arm}`, langs = loadAll("dev", stratum), shuf = loadAll("dev", stratum, ".shuf"), T = targetsOf(langs).filter((_, i) => i % nsh === shard), R = {}, Rnt = {};
  for (const t of T) { R[t] = setsFor(t, langs, arm, tag, shuf); if (team(t)) Rnt[t] = setsFor(t, langs, arm, `${tag}-nt`, shuf, true); console.error(`${tag} shard ${shard}: sets ${t} ${((Date.now() - t0) / 1000).toFixed(0)}s`); fs.writeFileSync(path.join(RES, `discovery-${tag}.sets-${shard}.json`), JSON.stringify({ R, Rnt, done: false })); }
  fs.writeFileSync(path.join(RES, `discovery-${tag}.sets-${shard}.json`), JSON.stringify({ R, Rnt, done: true, shard, nsh, seconds: round((Date.now() - t0) / 1000, 1) }));
}
function merge(tag) {
  const out = JSON.parse(fs.readFileSync(path.join(RES, `discovery-${tag}.stage1.json`), "utf8")), R = {}, Rnt = {};
  for (const f of fs.readdirSync(RES).filter((x) => x.startsWith(`discovery-${tag}.sets-`))) { const j = JSON.parse(fs.readFileSync(path.join(RES, f), "utf8")); if (!j.done) throw new Error(`${f} is not finished`); Object.assign(R, j.R); Object.assign(Rnt, j.Rnt); }
  if (Object.keys(R).length !== out.targets.length) throw new Error(`merge ${tag}: ${Object.keys(R).length} targets with sets, ${out.targets.length} expected`);
  out.sets = R; out.setsNoTwin = Rnt; out.contrasts = contrasts(R); out.groupTable = groupTable(R); out.groupTableNoTwin = groupTable({ ...R, ...Object.fromEntries(Object.entries(Rnt).map(([t, r]) => [t, { ...R[t], a: r.a }])) });
  fs.writeFileSync(path.join(RES, `discovery-${tag}.json`), JSON.stringify(out, null, 1));
  const regs = out.regression; console.log(JSON.stringify({ cell: tag, regression: { sameGenus: regs.wo3.est.sameGenus, sameOrder: regs.wo3.est.sameOrder, sameScript: regs.wo3.est.sameScript }, GENUS: out.contrasts["GENUS_a-b"].mean, ORDER: out.contrasts["ORDER_b-c"].mean, setMeans: out.contrasts.setMeans }, null, 1));
}

function select() {
  const cells = STRATA.map(([s, a]) => `${s}-${a}`), cand = [];
  for (const c of cells) {
    const f = path.join(RES, `discovery-${c}.json`); if (!fs.existsSync(f)) continue; const j = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const [key, g] of Object.entries(j.groupTable ?? {})) {
      const inBand = g.positionControl != null && g.positionControl >= 0.45 && g.positionControl <= 0.55, shufOk = g.shuffledControl == null || g.shuffledControl <= 0.55;
      const frac = g.n ? g.nPass / g.n : 0;
      const strict = g.n >= 3 && frac >= 0.7 && g.diffBoot.lo > 0 && inBand && shufOk;
      const partial = !strict && g.nPass >= 3 && frac >= 0.5 && g.diffBoot.mean >= 0.03 && inBand;
      cand.push({ cell: c, group: key, kind: g.kind, tier: strict ? "STRICT" : partial ? "PARTIAL" : "NONE", n: g.n, nPass: g.nPass, frac: round(frac), meanSame: g.meanSame, meanCtrl: g.meanCtrl, diff: g.diffBoot, positionControl: g.positionControl, shuffledControl: g.shuffledControl, scope: strict ? [...g.passing, ...g.failing] : g.passing, passing: g.passing, failing: g.failing });
    }
  }
  const rank = (x) => [x.tier === "STRICT" ? 0 : 1, -x.nPass, -(x.diff.mean ?? 0), x.cell === "LATER-BOTH" ? 0 : 1];
  const cmp = (x, y) => { const a = rank(x), b = rank(y); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const ok = cand.filter((x) => x.tier !== "NONE").sort(cmp), chosen = [];
  for (const x of ok) if (!chosen.some((y) => y.group === x.group) && chosen.length < 2) chosen.push(x);
  fs.writeFileSync(path.join(RES, "discovery-selection.json"), JSON.stringify({ ...provenance(), candidates: cand, chosen }, null, 1));
  console.log(JSON.stringify({ chosen: chosen.map((x) => ({ cell: x.cell, group: x.group, tier: x.tier, nPass: x.nPass, n: x.n, scope: x.scope })), tiers: cand.map((x) => `${x.cell} ${x.group} ${x.tier} ${x.nPass}/${x.n}`) }, null, 1));
}

const mode = process.argv[2], cellOf = (name) => { const c = STRATA.find(([s, a]) => `${s}-${a}` === name); if (!c) throw new Error("unknown cell " + name); return c; };
if (mode === "select") select();
else if (mode === "merge") merge(process.argv[3]);
else if (mode === "sets") { const [st, ar] = cellOf(process.argv[3]); runSets(st, ar, Number(process.argv[4]), Number(process.argv[5])); }
else { const [st, ar] = cellOf(mode); runCell(st, ar); }
