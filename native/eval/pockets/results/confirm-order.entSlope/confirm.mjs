// results/confirm-order.entSlope/confirm.mjs — SIBLING REPLICATION of the atlas law order.entSlope.
// ===== PRE-REGISTRATION HEADER (written 2026-10-07 before any statistic was computed on any sibling; the sha256 of every byte of this file ABOVE the END marker line is in prereg.sha256) =====
//
// DISCLOSURE (what I have seen before writing this header, 2026-10-07)
//  SEEN: PROTOCOL.md (sha256 3b7363c5...), lib/pocket.mjs, run-atlas.mjs, laws/order.mjs + laws/_order_prep.mjs + laws/_order_pos.mjs (the statistic's definition and code), results/law-table.json (the order.entSlope entry: counts, byGroup/byRegister/byScript,
//    presentV quantiles, absent pocket list, sharedProperty and signSplit rows, g1 rhos), and the per-pocket atlas JSONs results/atlas/*.json for order.entSlope: z and v in both halves of every atlas pocket; I printed registers legal, translation, encyclopedia,
//    drama, novel, code, treebank, the Latin and Sanskrit pockets, and the list of ABSENT pockets. The predictions below are therefore NOT blind to the ATLAS (they are read off it by register); they are blind to the SIBLINGS.
//  NOT SEEN: any law statistic (any family, any half, any null draw) of any sibling pocket. For the siblings I looked only at descriptive facts: token/unit/document counts, vocabulary size, a few unit heads/tails, and the most frequent unit-initial tokens
//    (to check that speaker labels were removed). Cleaning rules (cuts, label removal) were fixed from reading the raw files, before and without any statistic.
//  DEVIATIONS FROM THE SIBLING PLAN (stated, not hidden): (1) the plan's 'UD train splits of the 19 thin stems' do not exist on this machine (/private/tmp/claude-501/ud-eval holds dev.conllu and test.conllu only); the treebank siblings are instead UD Latin-Perseus (train+test),
//    UD Vedic Sanskrit (test) and UD English-PUD (test) from the fixtures of the eoreader7 checkout, with documents whose text is an atlas pocket removed (Aeneid, Tacitus, New Testament, Rigveda). Only Latin-Perseus clears the 20,000-token floor; Vedic and PUD are THIN
//    (reported, unscored). (2) Lysistrata is not built: its play body is far under the token floor and uses a speaker-label format that no atlas drama rule covers. (3) The English Elizabethan play (sv/pg43668 = Greene, James IV) and Marlowe's Doctor Faustus are pooled
//    in one pocket (each alone is thin). (4) The pre-registered ABSENT siblings are three law-free shuffled controls: the atlas has no natural kind where this statistic is mostly ABSENT (highest ABSENT share of any register with n >= 10: legal 4 of 31 = 13%; the 24 ABSENT of 390
//    atlas pockets are spread over 13 registers), so a blind natural-ABSENT prediction would have been a coin flip against the prior; the controls test the instrument (no false PRESENT on real vocabularies and unit-length laws), not the law.
//  KNOWN LIMITS OF THE ATLAS THE LAW COMES FROM: G0 did not fully pass (cancelPass false; recorded in law-table.json gates); entSlope itself is fired by no planted world; z uses 10 null draws (sd estimated with 9 degrees of freedom).
//  INDEPENDENCE: all prose siblings are English (two are translations); all code siblings come from one author's repositories; the treebank sibling is one language. The siblings are new DOCUMENTS of the atlas kinds, not new LANGUAGES; this cannot test the law's reach across languages.
//
// ATLAS CLAIM UNDER TEST: 'positional entropy slope inside a unit has a register-scoped sign. Above its within-unit null (last third richer) in novels 18/25 (0 below), dialect 8/13, memoir 6/13, diagram 5/7,
//   notation 11/16, reportage 3/4, translation 5/9, treatise 11/27; below it (first third richer) in code 34/47, poetry 9/13, drama 8/12, history 7/8, chat 11/20, scripture 17/24 present, treebank 15/34. ABSENT in only 24 of 390 pockets.'
// Verified against results/law-table.json: nPos 109, nNeg 136, nAbs 24, nAmb 121 of N = 390; heterogeneity 2.178; sharedProperty register eta2 0.1436 p 0.0085; signSplit register eta2 0.5565 p < 0.001; g1 rho(tokens) 0.177, rho(unit length) 0.250.
//
// HOW THE STATISTIC AND ITS NULL ARE COMPUTED (identical to run-atlas.mjs): per pocket, halves(p) by sha256(id:doc) parity; per half the 'order' family compute(view) once on the real view and once on each of 10 nullView(view,'within-unit',seed) draws with
// seed = seedOf(p.id, half, 'order', 'within-unit', k), k = 0..9; v = observed value, nullMean/nullSd over the finite draws, z = (v - nullMean) / nullSd.
//
// The blind predictions, the pass rule and the adversaries are the data object PREREG below (single source of truth: the code under the END marker reads it).
export const PREREG = {
 "law": "order.entSlope",
 "family": "order",
 "statId": "entSlope",
 "statement": "(H(last third) - H(first third)) / H(pooled) of the log2-rank-bin distribution by relative position inside a unit (fractional thirds, Miller-Madow), units >= 3 tokens; > 0 the end of a unit is richer than the start",
 "protocolSha256": "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc",
 "null": "within-unit",
 "draws": 10,
 "seedRule": "seedOf(pocketId, half, 'order', 'within-unit', k) exactly as run-atlas.mjs",
 "status": {
  "PRESENT+": "z >= 4 in both halves",
  "PRESENT-": "z <= -4 in both halves",
  "ABSENT": "|z| < 2 in both halves",
  "AMBIGUOUS": "anything else (uninformative: neither credit nor refutation)"
 },
 "siblings": [
  {
   "id": "ent-en-mouret",
   "loader": "loaders/_sibling-ent-en-mouret.mjs",
   "kind": "prose",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.85,
   "vRange": [
    0.004,
    0.03
   ],
   "tokens": 126434,
   "units": 7974,
   "docs": 80,
   "meanUnitLength": 15.86,
   "halfTokens": {
    "discover": 54422,
    "confirm": 72012
   },
   "thin": false,
   "scored": true,
   "contentSha256": "72b33276994ab88d3125bc80435baccb7d6212509f5bded112fc3c9aefcd7368",
   "why": "novel in English translation, 126k tokens; atlas novels >= 60k tokens: 17 of 22 PRESENT+, 0 PRESENT-"
  },
  {
   "id": "ent-en-poe2",
   "loader": "loaders/_sibling-ent-en-poe2.mjs",
   "kind": "prose",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.75,
   "vRange": [
    0.004,
    0.03
   ],
   "tokens": 94473,
   "units": 4101,
   "docs": 41,
   "meanUnitLength": 23.04,
   "halfTokens": {
    "discover": 49031,
    "confirm": 45442
   },
   "thin": false,
   "scored": true,
   "contentSha256": "3aa5c22ca9d75f5e94785369122b3f2c35a7a19ce5104a19082f709284700559",
   "why": "fiction tales, 94k tokens, long ornate sentences (23 tokens/unit); atlas novels with >= 20 tokens/unit are + (gulliver, quixote, emma)"
  },
  {
   "id": "ent-en-waikna",
   "loader": "loaders/_sibling-ent-en-waikna.mjs",
   "kind": "prose",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.65,
   "vRange": [
    0.004,
    0.03
   ],
   "tokens": 74854,
   "units": 2855,
   "docs": 30,
   "meanUnitLength": 26.22,
   "halfTokens": {
    "discover": 32601,
    "confirm": 42253
   },
   "thin": false,
   "scored": true,
   "contentSha256": "44b4420c91d602f1f5557654759b79b44c5d275888ae828224f186381dc3b2de",
   "why": "first-person travel narrative, 75k tokens, 26 tokens/unit; kind not in the atlas (nearest: memoir 6 of 13 PRESENT+, 0 -; reportage 3 of 4 +); crusoe (51 tokens/unit) was ABSENT"
  },
  {
   "id": "ent-en-awakening",
   "loader": "loaders/_sibling-ent-en-awakening.mjs",
   "kind": "prose",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.6,
   "vRange": [
    0.004,
    0.03
   ],
   "tokens": 64499,
   "units": 4448,
   "docs": 44,
   "meanUnitLength": 14.5,
   "halfTokens": {
    "discover": 24650,
    "confirm": 39849
   },
   "thin": false,
   "scored": true,
   "contentSha256": "58ffb6e78f7500568ca56118b4db34bac10eb523e55d7dda3b29cf3a6b62b923",
   "why": "novel + short stories, 64k tokens, but the discover half holds only 24.7k tokens (atlas novels near 32k tokens were ABSENT/ambiguous)"
  },
  {
   "id": "ent-en-siddhartha",
   "loader": "loaders/_sibling-ent-en-siddhartha.mjs",
   "kind": "prose",
   "role": "weak",
   "expect": "PRESENT+",
   "probExpectHolds": 0.3,
   "vRange": [
    0.004,
    0.03
   ],
   "tokens": 39275,
   "units": 1872,
   "docs": 30,
   "meanUnitLength": 20.98,
   "halfTokens": {
    "discover": 26400,
    "confirm": 12875
   },
   "thin": false,
   "scored": true,
   "contentSha256": "f698b7feec0db3c315222e262e1886b7e53dd45b4f04d08266d2887b85960ae9",
   "why": "novella in translation, 39k tokens, halves 26k and 13k: low power (atlas novels under 40k tokens: 0 of 3 PRESENT+)"
  },
  {
   "id": "ent-en-dolls-house",
   "loader": "loaders/_sibling-ent-en-dolls-house.mjs",
   "kind": "drama",
   "role": "weak",
   "expect": "PRESENT-",
   "probExpectHolds": 0.35,
   "vRange": [
    -0.15,
    -0.01
   ],
   "tokens": 22597,
   "units": 2497,
   "docs": 30,
   "meanUnitLength": 9.05,
   "halfTokens": {
    "discover": 10562,
    "confirm": 12035
   },
   "thin": false,
   "scored": true,
   "contentSha256": "e261ffab11ce5595f32131e761e4e18552ad43ebf6a4e6fb71d04f0c84b66e98",
   "why": "prose play, 22.6k tokens, halves 10.6k and 12k: low power (atlas drama pockets of 20-30k tokens: 2 of 5 PRESENT-, 3 ambiguous, 0 +)"
  },
  {
   "id": "ent-en-early-plays",
   "loader": "loaders/_sibling-ent-en-early-plays.mjs",
   "kind": "drama",
   "role": "weak",
   "expect": "PRESENT-",
   "probExpectHolds": 0.35,
   "vRange": [
    -0.15,
    -0.01
   ],
   "tokens": 31927,
   "units": 1848,
   "docs": 30,
   "meanUnitLength": 17.28,
   "halfTokens": {
    "discover": 15738,
    "confirm": 16189
   },
   "thin": false,
   "scored": true,
   "contentSha256": "7b03aa0c51efc1f3a9f4cfba583b2ffd3ff8e0aaa877512ea22f8307d12027da",
   "why": "two Elizabethan plays pooled, 31.9k tokens (atlas hen4 witnesses of 20-29k tokens: 2 of 5 PRESENT-, 0 +)"
  },
  {
   "id": "ent-ud-lat-perseus",
   "loader": "loaders/_sibling-ent-ud-lat-perseus.mjs",
   "kind": "treebank",
   "role": "weak",
   "expect": "PRESENT-",
   "probExpectHolds": 0.35,
   "vRange": [
    -0.125,
    -0.005
   ],
   "tokens": 21484,
   "units": 1987,
   "docs": 81,
   "meanUnitLength": 10.81,
   "halfTokens": {
    "discover": 10850,
    "confirm": 10634
   },
   "thin": false,
   "scored": true,
   "contentSha256": "5bf497e5ee0403164731b4ab92157489ecdab4eb6316b72d099d94941ba1474f",
   "why": "UD Latin-Perseus minus Aeneid/Tacitus/NT, 21.5k tokens, halves 10.8k and 10.6k: atlas treebanks of 20-30k tokens: 6 of 15 PRESENT-, 6 ambiguous, 3 ABSENT, 0 PRESENT+; atlas Latin pockets mostly -, but head-final Korean/Basque are +"
  },
  {
   "id": "ent-cd-js",
   "loader": "loaders/_sibling-ent-code.mjs",
   "kind": "code",
   "role": "strong",
   "expect": "PRESENT-",
   "probExpectHolds": 0.9,
   "vRange": [
    -0.08,
    -0.006
   ],
   "tokens": 249034,
   "units": 30016,
   "docs": 201,
   "meanUnitLength": 8.3,
   "halfTokens": {
    "discover": 118291,
    "confirm": 130743
   },
   "thin": false,
   "scored": true,
   "contentSha256": "f7c0ae742781897c38c73859aef539c3e4c41a65c15ed6264941a53afc94daf0",
   "why": "the user's JavaScript, 249k tokens; atlas cd-cc-javascript z -33/-54, cd-e09-eoapp-js z -32/-34"
  },
  {
   "id": "ent-cd-ts",
   "loader": "loaders/_sibling-ent-code.mjs",
   "kind": "code",
   "role": "strong",
   "expect": "PRESENT-",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.08,
    -0.006
   ],
   "tokens": 68340,
   "units": 16684,
   "docs": 119,
   "meanUnitLength": 4.1,
   "halfTokens": {
    "discover": 23375,
    "confirm": 44965
   },
   "thin": false,
   "scored": true,
   "contentSha256": "db14afa3dc63b409a6aa2298832d05c447732411dbbff2f2e9d96e8354ee7458",
   "why": "the user's TypeScript, 68k tokens, 4.1 tokens/unit; atlas typescript and tsx z < -48"
  },
  {
   "id": "ent-cd-py",
   "loader": "loaders/_sibling-ent-code.mjs",
   "kind": "code",
   "role": "strong",
   "expect": "PRESENT-",
   "probExpectHolds": 0.8,
   "vRange": [
    -0.08,
    -0.006
   ],
   "tokens": 118706,
   "units": 19855,
   "docs": 72,
   "meanUnitLength": 5.98,
   "halfTokens": {
    "discover": 38937,
    "confirm": 79769
   },
   "thin": false,
   "scored": true,
   "contentSha256": "f87cf809da9f755f6f70cd44515b4b6584d31609624cb6346495e66e9c3fa6cf",
   "why": "the user's Python, 119k tokens; atlas cd-cc-python z -23/-18, but cd-e09-python (39k tokens) was ambiguous with + z"
  },
  {
   "id": "ent-ctl-mouret",
   "loader": "loaders/_sibling-ent-ctl.mjs",
   "kind": "control",
   "role": "control",
   "expect": "ABSENT",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.008,
    0.008
   ],
   "tokens": 126434,
   "units": 7974,
   "docs": 80,
   "meanUnitLength": 15.86,
   "halfTokens": {
    "discover": 50979,
    "confirm": 75455
   },
   "thin": false,
   "scored": true,
   "contentSha256": "1a15759df3e67a2706a81466a18ed6ecec8f92e6b21cdc8e952815853bce7f59",
   "why": "token-global shuffled copy of ent-en-mouret (as atlas ct-*): law-free by construction; atlas ct: 17 of 20 ABSENT, 3 ambiguous, 0 PRESENT"
  },
  {
   "id": "ent-ctl-awakening",
   "loader": "loaders/_sibling-ent-ctl.mjs",
   "kind": "control",
   "role": "control",
   "expect": "ABSENT",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.008,
    0.008
   ],
   "tokens": 64499,
   "units": 4448,
   "docs": 44,
   "meanUnitLength": 14.5,
   "halfTokens": {
    "discover": 28632,
    "confirm": 35867
   },
   "thin": false,
   "scored": true,
   "contentSha256": "fb069d72e03715e61efd3a3e08c35b27d7abe6abe01bc78e1944bc670932ab58",
   "why": "token-global shuffled copy of ent-en-awakening"
  },
  {
   "id": "ent-ctl-cd-ts",
   "loader": "loaders/_sibling-ent-ctl.mjs",
   "kind": "control",
   "role": "control",
   "expect": "ABSENT",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.008,
    0.008
   ],
   "tokens": 68340,
   "units": 16684,
   "docs": 119,
   "meanUnitLength": 4.1,
   "halfTokens": {
    "discover": 46384,
    "confirm": 21956
   },
   "thin": false,
   "scored": true,
   "contentSha256": "fde68134dcff06a98ebddf2cc7c58e14e63ea73b06c5c1382fb871d4618305af",
   "why": "token-global shuffled copy of ent-cd-ts"
  },
  {
   "id": "ent-ud-san-vedic",
   "loader": "loaders/_sibling-ent-ud-san-vedic.mjs",
   "kind": "treebank",
   "role": "thin",
   "expect": "none",
   "probExpectHolds": null,
   "vRange": null,
   "tokens": 16802,
   "units": 2262,
   "docs": 91,
   "meanUnitLength": 7.43,
   "halfTokens": {
    "discover": 10050,
    "confirm": 6752
   },
   "thin": true,
   "scored": false,
   "contentSha256": "2ff6f14bd80da3c818099ae59b6df1966b18e39461887b7c687c341a847204af",
   "why": "THIN (16.8k tokens): computed and reported, not scored, no prediction"
  },
  {
   "id": "ent-ud-eng-pud",
   "loader": "loaders/_sibling-ent-ud-eng-pud.mjs",
   "kind": "treebank",
   "role": "thin",
   "expect": "none",
   "probExpectHolds": null,
   "vRange": null,
   "tokens": 18385,
   "units": 1000,
   "docs": 40,
   "meanUnitLength": 18.39,
   "halfTokens": {
    "discover": 9670,
    "confirm": 8715
   },
   "thin": true,
   "scored": false,
   "contentSha256": "c2b48c242ece1796db96d1c9699ce1a1e1b4769a0a8a20bfca51d8945f8862ba",
   "why": "THIN (18.4k tokens): computed and reported, not scored, no prediction"
  }
 ],
 "passRule": {
  "scoredSet": "siblings with scored=true: non-thin pockets (>= 20,000 tokens and >= 20 documents), roles strong, weak and control. Thin pockets are computed and reported but never scored.",
  "perSibling": "CONFIRMED: status equals expect (PRESENT with the predicted sign; ABSENT for controls). REFUTED: status is PRESENT+, PRESENT- or ABSENT and differs from expect (wrong sign, ABSENT where PRESENT was predicted, PRESENT where ABSENT was predicted). UNINFORMATIVE: AMBIGUOUS.",
  "REPLICATES": "zero REFUTED among scored siblings AND >= 2 CONFIRMED PRESENT+ AND >= 2 CONFIRMED PRESENT- AND >= 1 CONFIRMED ABSENT control",
  "FAILS": "CONFIRMED = 0 among non-control scored siblings, OR REFUTED >= CONFIRMED among non-control scored siblings",
  "PARTIAL": "everything else; the report names, per kind (prose, drama, treebank, code, control), whether it holds (>= 1 CONFIRMED and 0 REFUTED), is untested (all UNINFORMATIVE) or is refuted (>= 1 REFUTED)",
  "instrumentGuard": "a REFUTED control (PRESENT on a law-free shuffled copy) voids REPLICATES (the instrument is suspect) regardless of the other counts"
 },
 "secondary": {
  "sizeCaveat": "PRESENT needs |z| >= 4 in BOTH halves; halves of the weak siblings hold 10-26k tokens; the stated probabilities include that power loss",
  "planGroups": {
   "prose": ">= 60% of scored prose siblings (5) PRESENT+ and none PRESENT-",
   "drama": ">= 60% of scored drama siblings (2) PRESENT-",
   "treebank": ">= 40% of scored treebank siblings (1) PRESENT- and <= 15% PRESENT+",
   "code": ">= 70% of code siblings (3) PRESENT-",
   "control": "no control PRESENT"
  },
  "vRange": "per sibling, v = mean of the two halves' v; reported whether it lies inside vRange (the atlas min..max of the PRESENT pockets of that register, widened to round numbers; controls |v| <= 0.008). Secondary: never changes the verdict"
 },
 "adversary": {
  "A_MillerMadow": "recompute entSlope with the plug-in entropy (no (k-1)/(2n) term) on the same halves and the same 10 null draws; SURVIVES if every scored sibling that is PRESENT under Miller-Madow keeps the same PRESENT status and sign. (selfcheck: the re-implementation with the correction must equal compute() to 1e-12)",
  "A_unitLength": "baseline sign for a sibling = sign of the median v (mean of the two halves) over the 25 atlas pockets (groups other than ct and pl, non-thin) nearest in |ln mean unit length| (ties by id). Among scored siblings with PRESENT status, SURVIVES if the pre-registered register prediction matches the observed sign in strictly more siblings than the unit-length baseline does",
  "A_rivalStatistics": "order.rareSlope and order.entCurv from the same compute() calls and the same draws. For each rival, N_rival = number of scored siblings where the rival is PRESENT with the SAME sign as the entSlope prediction of that sibling. SURVIVES if the number of CONFIRMED PRESENT entSlope siblings is strictly larger than N_rival for both rivals (otherwise: not distinguishable from a cheaper statistic). Also reported: atlas Spearman rho of v between entSlope and each rival over atlas pockets",
  "A_leakage": "8-token shingle scan of the seven text siblings against all 2,534 .txt/.md files of the ethos trees 01,02,05,06,08,11,14,15,16,18,20 (tokenised with the atlas tokeniser): the only file sharing >= 0.5% of a sibling's shingles is the sibling's own source file; code siblings: 0 files byte-identical (sha256) to any of the 26,952 files of the atlas code corpus and any file of ethos/09-source-code. Near-duplicates (modified forks) are not detectable by sha256",
  "A_multiplicity": "n = number of scored sibling cells; chance PRESENT per cell under the iid planted world is 8.5e-5 (law-table falsePresent: 4 of 307 half-cells |z| >= 4, rate^2/2), so expected chance PRESENT cells over the scored siblings = n x 8.5e-5; reported with the observed count of PRESENT cells"
 }
};
// ===== END OF PRE-REGISTRATION HEADER =====

// ===== CODE (below the pre-registered header; fixed before the sibling run, but its text is not covered by prereg.sha256) =====
// usage:  node confirm.mjs selfcheck [atlasPocketId]   re-derive an ATLAS pocket exactly as run-atlas.mjs does and compare with results/atlas/<id>.json (default bk-time-machine)
//         node confirm.mjs run [--pockets id1,id2]      compute every sibling (or the named ones) -> pockets/<id>.json (resumable)
//         node confirm.mjs report                       classify, adversaries, verdict -> report.json (+ printed table)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf, sha256 } from "../../lib/pocket.mjs";
import * as ORDER from "../../laws/order.mjs";
import { prep } from "../../laws/_order_prep.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const argv = process.argv.slice(2), mode = argv[0] ?? "report";
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const POCKETS = path.join(HERE, "pockets"), STATID = "order.entSlope", KIND = "within-unit", DRAWS = PREREG.draws;

/** header integrity: sha256 of the file bytes up to and including the END marker line must equal prereg.sha256 */
function headerCheck() {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8"), mk = "// ===== END OF PRE-REGISTRATION HEADER =====\n";
  const head = src.slice(0, src.indexOf(mk) + mk.length), got = sha256(head), want = fs.readFileSync(path.join(HERE, "prereg.sha256"), "utf8").split(/\s+/)[0];
  return { got, want, ok: got === want };
}
const sdOf = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** the cell of run-atlas.mjs: {v, nullMean, nullSd, z, n} from the observed value and the null-draw values (same finite filter, same >= 3 rule, same sample sd) */
function cell(v, draws) {
  const xs = draws.filter((x) => Number.isFinite(x)), { m, sd } = xs.length >= 3 ? sdOf(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
}
/** PROTOCOL cell status from the two halves' z (PRESENT+/PRESENT-/ABSENT/AMBIGUOUS; UNDEFINED when a z is missing) */
export function status(zD, zC) {
  if (!Number.isFinite(zD) || !Number.isFinite(zC)) return "UNDEFINED";
  if (zD >= 4 && zC >= 4) return "PRESENT+";
  if (zD <= -4 && zC <= -4) return "PRESENT-";
  if (Math.abs(zD) < 2 && Math.abs(zC) < 2) return "ABSENT";
  return "AMBIGUOUS";
}

/** Re-implementation of the entSlope part of laws/_order_pos.mjs posStats with and without the Miller-Madow term (adversary A_MillerMadow). Same units >= 3, same fractional thirds. */
function entSlopeBoth(view) {
  const P = prep(view);
  if (P.N < 2000 || P.V < 30) return { mm: null, plain: null };
  const { U, bs, unitStart, B } = P, C = [new Float64Array(B), new Float64Array(B), new Float64Array(B)];
  let nTok = 0, nU = 0;
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a;
    if (L < 3) continue;
    const third = L / 3, inv = 3 / L;
    for (let i = 0; i < L; i++) {
      const s = i * inv, e = (i + 1) * inv, b = bs[a + i];
      let t0 = Math.floor(s + 1e-12), t1 = Math.floor(e - 1e-12);
      if (t0 > 2) t0 = 2; if (t1 > 2) t1 = 2;
      if (t0 === t1) C[t0][b] += 1; else { const w0 = (t0 + 1 - s) * third; C[t0][b] += w0; C[t1][b] += 1 - w0; }
    }
    nTok += L; nU++;
  }
  if (nU < 300 || nTok < 2000) return { mm: null, plain: null };
  const H = (c, withMM) => { let n = 0, k = 0; for (let b = 0; b < c.length; b++) if (c[b] > 0) { n += c[b]; k++; } if (n <= 0) return null; let h = 0; for (let b = 0; b < c.length; b++) if (c[b] > 0) h -= (c[b] / n) * Math.log(c[b] / n); return withMM ? h + (k - 1) / (2 * n) : h; };
  const pool = new Float64Array(B); for (let b = 0; b < B; b++) pool[b] = C[0][b] + C[1][b] + C[2][b];
  const out = {};
  for (const [name, w] of [["mm", true], ["plain", false]]) { const h0 = H(C[0], w), h2 = H(C[2], w), hp = H(pool, w); out[name] = h0 != null && h2 != null && hp > 0 ? (h2 - h0) / hp : null; }
  return out;
}

/** One half of one pocket: exactly the loop of run-atlas.mjs for the family 'order' (obs once, DRAWS within-unit null draws with the atlas seed), all 11 order statistics, plus the plug-in entSlope. */
function computeHalf(pid, which, view) {
  const obs = ORDER.compute(view), draws = [], both = [];
  for (let k = 0; k < DRAWS; k++) { const nv = nullView(view, KIND, seedOf(pid, which, ORDER.FAMILY, KIND, k)); draws.push(ORDER.compute(nv)); both.push(entSlopeBoth(nv)); }
  const stats = {};
  for (const s of ORDER.STATS) stats[`${ORDER.FAMILY}.${s.id}`] = cell(obs[s.id], draws.map((d) => d[s.id]));
  const ob = entSlopeBoth(view);
  const plain = cell(ob.plain, both.map((b) => b.plain)), mmRe = cell(ob.mm, both.map((b) => b.mm));
  return { stats, entSlopePlain: plain, entSlopeMMre: mmRe, selfcheck: { mmReImplDiffObs: ob.mm == null || obs.entSlope == null ? null : Math.abs(ob.mm - obs.entSlope), mmReImplDiffNull: Math.max(0, ...both.map((b, k) => (b.mm == null || draws[k].entSlope == null ? 0 : Math.abs(b.mm - draws[k].entSlope)))) } };
}
function computePocket(p) {
  const meta = validate(p), H = halves(p), n = (h) => h.units.reduce((a, u) => a + u.length, 0), res = { id: p.id, meta: { ...meta, group: p.group, register: p.register, language: p.language, meanUnitLength: meta.tokens / meta.units, halfTokens: { discover: n(H.discover), confirm: n(H.confirm) } },
    contentSha256: sha256(JSON.stringify({ units: p.units, docOf: p.docOf })), halves: {}, errors: [] };
  for (const which of ["discover", "confirm"]) { try { res.halves[which] = computeHalf(p.id, which, H[which]); } catch (e) { res.errors.push(`${which}: ${String(e.message).slice(0, 200)}`); } }
  return res;
}
const loadSibling = async (sp) => { const m = await import(pathToFileURL(path.join(ROOT, sp.loader)).href); const p = (await m.load([sp.id])).find((x) => x.id === sp.id); if (!p) throw new Error(`loader ${sp.loader} returned no pocket ${sp.id}`); return p; };

if (mode === "selfcheck") {
  const id = argv[1] ?? "bk-time-machine", atlas = JSON.parse(fs.readFileSync(path.join(ROOT, "results/atlas", `${id}.json`), "utf8"));
  const loaderFile = id.startsWith("bk-") ? "books.mjs" : null; if (!loaderFile) throw new Error("selfcheck knows bk-* pockets only");
  const p = (await (await import(pathToFileURL(path.join(ROOT, "loaders", loaderFile)).href)).load([id])).find((x) => x.id === id), res = computePocket(p);
  let worst = 0, cells = 0;
  for (const which of ["discover", "confirm"]) for (const [key, c] of Object.entries(res.halves[which].stats)) { const a = atlas.halves[which][key]; for (const f of ["v", "nullMean", "nullSd", "z"]) { const x = c[f], y = a[f]; if (x == null && y == null) continue; worst = Math.max(worst, x == null || y == null ? Infinity : Math.abs(x - y)); } cells++; }
  console.log(JSON.stringify({ selfcheck: id, header: headerCheck(), orderCellsCompared: cells, worstAbsDiffVsAtlasJson: worst, entSlope: { discover: res.halves.discover.stats[STATID], confirm: res.halves.confirm.stats[STATID] },
    plugInReimplementation: { diffObs: [res.halves.discover.selfcheck.mmReImplDiffObs, res.halves.confirm.selfcheck.mmReImplDiffObs], diffNull: [res.halves.discover.selfcheck.mmReImplDiffNull, res.halves.confirm.selfcheck.mmReImplDiffNull] } }, null, 1));
}
if (mode === "run") {
  const hc = headerCheck(); if (!hc.ok) throw new Error(`pre-registration header changed: ${hc.got} != ${hc.want}`);
  fs.mkdirSync(POCKETS, { recursive: true });
  const only = opt("--pockets", null)?.split(","), resume = !argv.includes("--fresh");
  for (const sp of PREREG.siblings) {
    if (only && !only.includes(sp.id)) continue;
    const file = path.join(POCKETS, `${sp.id}.json`);
    if (resume && fs.existsSync(file)) { console.error(`${sp.id}: exists, skipped (resume)`); continue; }
    const t0 = process.hrtime.bigint(), p = await loadSibling(sp), res = computePocket(p);
    res.headerSha256 = hc.got; res.contentMatchesPrereg = res.contentSha256 === sp.contentSha256;
    if (!res.contentMatchesPrereg) { console.error(`${sp.id}: CONTENT HASH DIFFERS from the pre-registered one (${res.contentSha256} vs ${sp.contentSha256}); result written but flagged`); }
    fs.writeFileSync(file, JSON.stringify(res));
    console.error(`${sp.id}: ${res.meta.tokens} tokens, ${(Number(process.hrtime.bigint() - t0) / 1e9).toFixed(1)} s, ${res.errors.length} errors`);
  }
}

// ---------------------------------------------------------------- report: classification, adversaries, verdict (rules are PREREG.passRule / PREREG.adversary)
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, median = (a) => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function spearman(xs, ys) {
  const rk = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
  const a = rk(xs), b = rk(ys), ma = mean(a), mb = mean(b); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < a.length; i++) { sxy += (a[i] - ma) * (b[i] - mb); sxx += (a[i] - ma) ** 2; syy += (b[i] - mb) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
const sgn = (x) => (x > 0 ? "+" : x < 0 ? "-" : "0");
const fmt = (x, d = 2) => (x == null ? "NA" : Number(x).toFixed(d));
function outcomeOf(expect, st) {
  if (st === "AMBIGUOUS" || st === "UNDEFINED") return "UNINFORMATIVE";
  return st === expect ? "CONFIRMED" : "REFUTED";
}
function loadAtlas() {
  const dir = path.join(ROOT, "results/atlas"), out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (d.skipped || !d.halves?.discover || ["ct", "pl"].includes(d.meta.group)) continue;
    const g = (k) => { const a = d.halves.discover[k], b = d.halves.confirm[k]; return a?.v == null || b?.v == null ? null : (a.v + b.v) / 2; };
    out.push({ id: d.meta.id, tokens: d.meta.tokens, ul: d.meta.tokens / d.meta.units, ent: g("order.entSlope"), rare: g("order.rareSlope"), curv: g("order.entCurv") });
  }
  return out;
}
if (mode === "report") {
  const hc = headerCheck(), rows = [], atlas = loadAtlas().filter((a) => a.ent != null);
  for (const sp of PREREG.siblings) {
    const file = path.join(POCKETS, `${sp.id}.json`); if (!fs.existsSync(file)) { rows.push({ id: sp.id, kind: sp.kind, role: sp.role, missing: true }); continue; }
    const res = JSON.parse(fs.readFileSync(file, "utf8")), D = res.halves.discover, C = res.halves.confirm, row = { id: sp.id, kind: sp.kind, role: sp.role, scored: sp.scored, expect: sp.expect, probExpectHolds: sp.probExpectHolds, tokens: res.meta.tokens, meanUnitLength: res.meta.meanUnitLength,
      halfTokens: res.meta.halfTokens, errors: res.errors, contentMatchesPrereg: res.contentMatchesPrereg };
    const get = (H, k) => H.stats[k];
    for (const [name, key] of [["entSlope", "order.entSlope"], ["rareSlope", "order.rareSlope"], ["entCurv", "order.entCurv"]]) {
      const a = get(D, key), b = get(C, key); row[name] = { discover: a, confirm: b, status: status(a.z, b.z), vMean: a.v != null && b.v != null ? (a.v + b.v) / 2 : null };
    }
    row.entSlopePlain = { discover: D.entSlopePlain, confirm: C.entSlopePlain, status: status(D.entSlopePlain.z, C.entSlopePlain.z) };
    row.entSlopeMMre = { status: status(D.entSlopeMMre.z, C.entSlopeMMre.z), sameAsCompute: D.entSlopeMMre.z === row.entSlope.discover.z && C.entSlopeMMre.z === row.entSlope.confirm.z, selfcheck: [D.selfcheck, C.selfcheck] };
    row.status = row.entSlope.status; row.outcome = sp.scored ? outcomeOf(sp.expect, row.status) : "THIN-UNSCORED";
    row.vInRange = sp.vRange && row.entSlope.vMean != null ? row.entSlope.vMean >= sp.vRange[0] && row.entSlope.vMean <= sp.vRange[1] : null;
    // A_unitLength: 25 atlas pockets nearest in |ln mean unit length|
    const nn = atlas.map((a) => ({ id: a.id, d: Math.abs(Math.log(a.ul) - Math.log(res.meta.meanUnitLength)), v: a.ent })).sort((p, q) => p.d - q.d || (p.id < q.id ? -1 : 1)).slice(0, 25);
    row.unitLengthBaseline = { medianV: median(nn.map((x) => x.v)), sign: sgn(median(nn.map((x) => x.v))), neighbours: nn.length, maxDist: nn[nn.length - 1].d };
    rows.push(row);
  }
  fs.mkdirSync(HERE, { recursive: true });
  globalThis.__rows = rows; globalThis.__atlas = atlas; globalThis.__hc = hc;
}
if (mode === "report") {
  const rows = globalThis.__rows, atlas = globalThis.__atlas, hc = globalThis.__hc, miss = rows.filter((r) => r.missing).map((r) => r.id);
  const scored = rows.filter((r) => r.scored && !r.missing), nonCtl = scored.filter((r) => r.role !== "control");
  const count = (rs, o, e) => rs.filter((r) => r.outcome === o && (e == null || r.expect === e)).length;
  const confirmedPlus = count(scored, "CONFIRMED", "PRESENT+"), confirmedMinus = count(scored, "CONFIRMED", "PRESENT-"), confirmedCtl = count(scored.filter((r) => r.role === "control"), "CONFIRMED");
  const refuted = scored.filter((r) => r.outcome === "REFUTED"), nonCtlConf = count(nonCtl, "CONFIRMED"), nonCtlRef = count(nonCtl, "REFUTED");
  let verdict = "PARTIAL";
  if (refuted.length === 0 && confirmedPlus >= 2 && confirmedMinus >= 2 && confirmedCtl >= 1 && !miss.length) verdict = "REPLICATES";
  else if (nonCtlConf === 0 || nonCtlRef >= nonCtlConf) verdict = "FAILS";
  const perKind = {};
  for (const r of scored) { const k = (perKind[r.kind] ??= { confirmed: 0, refuted: 0, uninformative: 0, ids: [] }); k[r.outcome === "CONFIRMED" ? "confirmed" : r.outcome === "REFUTED" ? "refuted" : "uninformative"]++; k.ids.push(`${r.id}:${r.status}`); }
  for (const k of Object.values(perKind)) k.verdict = k.refuted ? "refuted" : k.confirmed ? "holds" : "untested (all uninformative)";
  const grp = (kind, pred) => { const rs = scored.filter((r) => r.kind === kind); return { n: rs.length, nPlus: rs.filter((r) => r.status === "PRESENT+").length, nMinus: rs.filter((r) => r.status === "PRESENT-").length, holds: rs.length ? pred(rs) : null }; };
  const planGroups = { prose: grp("prose", (rs) => rs.filter((r) => r.status === "PRESENT+").length / rs.length >= 0.6 && !rs.some((r) => r.status === "PRESENT-")), drama: grp("drama", (rs) => rs.filter((r) => r.status === "PRESENT-").length / rs.length >= 0.6),
    treebank: grp("treebank", (rs) => rs.filter((r) => r.status === "PRESENT-").length / rs.length >= 0.4 && rs.filter((r) => r.status === "PRESENT+").length / rs.length <= 0.15), code: grp("code", (rs) => rs.filter((r) => r.status === "PRESENT-").length / rs.length >= 0.7), control: grp("control", (rs) => !rs.some((r) => r.status.startsWith("PRESENT"))) };
  // adversaries
  const present = nonCtl.filter((r) => r.status.startsWith("PRESENT")), mmSame = present.map((r) => ({ id: r.id, mm: r.status, plain: r.entSlopePlain.status, same: r.entSlopePlain.status === r.status }));
  const A_MM = { survives: mmSame.every((x) => x.same), perSibling: mmSame, reimplementationEqualsCompute: rows.filter((r) => !r.missing).every((r) => r.entSlopeMMre.sameAsCompute) };
  const regHits = present.filter((r) => r.status === r.expect).length, ulHits = present.filter((r) => `PRESENT${r.unitLengthBaseline.sign}` === r.status).length;
  const A_UL = { survives: regHits > ulHits, presentSiblings: present.length, registerPredictionHits: regHits, unitLengthBaselineHits: ulHits, perSibling: nonCtl.map((r) => ({ id: r.id, meanUnitLength: +r.meanUnitLength.toFixed(2), baselineSign: r.unitLengthBaseline.sign, baselineMedianV: +r.unitLengthBaseline.medianV.toFixed(4), status: r.status, observedVMean: r.entSlope.vMean })) };
  const withExpect = nonCtl.filter((r) => r.expect.startsWith("PRESENT")), rivalN = (name) => withExpect.filter((r) => r[name].status === r.expect).length, entConf = withExpect.filter((r) => r.outcome === "CONFIRMED").length;
  const A_rival = { survives: entConf > rivalN("rareSlope") && entConf > rivalN("entCurv"), entSlopeConfirmed: entConf, rareSlopeSameSignPresent: rivalN("rareSlope"), entCurvSameSignPresent: rivalN("entCurv"),
    atlasSpearmanV: { entSlope_vs_rareSlope: spearman(atlas.filter((a) => a.rare != null).map((a) => a.ent), atlas.filter((a) => a.rare != null).map((a) => a.rare)), entSlope_vs_entCurv: spearman(atlas.filter((a) => a.curv != null).map((a) => a.ent), atlas.filter((a) => a.curv != null).map((a) => a.curv)), nAtlas: atlas.length },
    perSibling: withExpect.map((r) => ({ id: r.id, expect: r.expect, entSlope: r.status, rareSlope: r.rareSlope.status, entCurv: r.entCurv.status })) };
  const nPresentCells = scored.filter((r) => r.status.startsWith("PRESENT")).length, controlsPresent = scored.filter((r) => r.role === "control" && r.status.startsWith("PRESENT")).length;
  const A_mult = { scoredSiblingCells: scored.length, chancePresentPerCell: 8.488153720463878e-5, expectedChancePresentCells: scored.length * 8.488153720463878e-5, observedPresentCells: nPresentCells, controlsPresent };
  const report = { law: PREREG.law, headerSha256: hc.got, headerMatchesPrereg: hc.ok, verdict, missing: miss, counts: { scored: scored.length, confirmed: count(scored, "CONFIRMED"), refuted: refuted.length, uninformative: count(scored, "UNINFORMATIVE"), confirmedPlus, confirmedMinus, confirmedControls: confirmedCtl, nonControlConfirmed: nonCtlConf, nonControlRefuted: nonCtlRef },
    refuted: refuted.map((r) => `${r.id}: expected ${r.expect}, got ${r.status}`), perKind, planGroups, adversary: { A_MillerMadow: A_MM, A_unitLength: A_UL, A_rivalStatistics: A_rival, A_multiplicity: A_mult }, rows };
  fs.writeFileSync(path.join(HERE, "report.json"), JSON.stringify(report, null, 1) + "\n");
  const line = (r) => r.missing ? `${r.id}: MISSING` : `${r.id.padEnd(20)} ${r.kind.padEnd(8)} ${String(r.tokens).padStart(7)} tok UL ${fmt(r.meanUnitLength, 1).padStart(5)} | entSlope z ${fmt(r.entSlope.discover.z, 1).padStart(7)} / ${fmt(r.entSlope.confirm.z, 1).padStart(7)}  v ${fmt(r.entSlope.discover.v, 4).padStart(8)} / ${fmt(r.entSlope.confirm.v, 4).padStart(8)} | ${r.status.padEnd(9)} expect ${String(r.expect).padEnd(8)} ${r.outcome}${r.vInRange === false ? " (v outside range)" : ""}`;
  console.log(`header ${hc.got} ${hc.ok ? "matches" : "DOES NOT MATCH"} prereg.sha256\n${rows.map(line).join("\n")}\nVERDICT ${verdict}  counts ${JSON.stringify(report.counts)}\nperKind ${JSON.stringify(Object.fromEntries(Object.entries(perKind).map(([k, v]) => [k, `${v.verdict} (${v.confirmed} ok, ${v.refuted} refuted, ${v.uninformative} uninformative)`])))}\nplanGroups ${JSON.stringify(Object.fromEntries(Object.entries(planGroups).map(([k, v]) => [k, v.holds])))}\nA_MM survives=${A_MM.survives}  A_UL survives=${A_UL.survives} (register ${regHits} vs unit-length ${ulHits})  A_rival survives=${A_rival.survives} (ent ${entConf}, rare ${A_rival.rareSlopeSameSignPresent}, curv ${A_rival.entCurvSameSignPresent})  A_mult ${JSON.stringify(A_mult)}`);
}
