// results/confirm-comp.asym/confirm.mjs — SIBLING REPLICATION of the atlas law comp.asym ("asymmetry of company": right-hand neighbours of the 20 commonest types more diverse than left-hand ones).
// ===== PRE-REGISTRATION HEADER (written 2026-10-07 before ANY law statistic of the comp or order family was computed on ANY sibling pocket; the sha256 of every byte of this file from the first byte through the END marker line inclusive is in prereg.sha256) =====
//
// DISCLOSURE (what I have seen before writing this header)
//  SEEN: PROTOCOL.md (sha256 3b7363c5...), lib/pocket.mjs, run-atlas.mjs, laws/comp.mjs + laws/_comp_*.mjs (the statistic's definition and code), laws/order.mjs + _order_pair.mjs (definition of the rival order.fnBefore),
//    results/law-table.json (the comp.asym entry: N 384, nPos 116, nNeg 98, nAbs 16, nAmb 154, heterogeneity 1.929, sharedProperty register eta2 0.149 p 0.0035, signSplit register eta2 0.302 p < 0.001, word-grain-only 84+/87-,
//    g1 rho(tokens) 0.167 and rho(unit length) -0.046, sizeConfounded false, g0 validation 'unmapped' = NO planted world fires comp.asym, mostSimilar freq.hapaxShare rho -0.317; the run's gate G0 did not pass overall (cancelPass false)),
//    and results/atlas-matrix.json: v and z of comp.asym in BOTH halves of EVERY atlas pocket. From it I printed: all pockets of the registers drama, academic, code, chat, essay, encyclopedia, reportage, scripture, children, treatise,
//    novel, memoir with status and v; the 16 ABSENT real pockets; tallies by language; English-only tallies by register and by size class; and the statuses of the 33 UD treebank pockets. I also read the other agents' sibling loaders and the
//    header of results/confirm-order.entSlope/confirm.mjs (as a template), and printed the token/doc counts of other agents' sibling pockets (their meta only). I read no comp-family value of any non-atlas pocket: a text search of
//    results/ finds comp.asym values only in atlas/, atlas-matrix.json, law-table.json and the attack-* correlation tables (atlas pockets only). ONE ACCIDENTAL GLIMPSE, disclosed: printing the first 600 bytes of another agent's
//    results/confirm-order.entSlope/pockets/ent-en-mouret.json showed two ORDER-family values of the discover half of Zola's Abbe Mouret (order.rareSlope v 0.087 z 15.0, and the start of order.rareCurve); not comp.*, not order.fnBefore,
//    not the confirm half; the same text is the sibling asym-en-mouret here.
//  NOT SEEN: any statistic (any family, any half, any null draw) of any sibling pocket of this file. For the siblings I looked only at descriptive facts: token/unit/document counts, vocabulary size, half sizes, the commonest unit-initial tokens
//    (to check that speaker labels and chat nicks were removed), and the first/last unit. Cleaning rules (cuts, label removal, skipped directories) were fixed from reading the raw files and trees, before and without any statistic.
//  THE OBSERVATION THAT SHAPED THE BLIND PREDICTIONS (atlas only, disclosed because it changes them): the claim reads the sign as a property of REGISTER. In the atlas matrix every one of the 9 PRESENT- drama pockets is NOT English (de, fr, es, nl, grc),
//    and the 3 English drama pockets are ABSENT, ABSENT, AMBIGUOUS (bk-hen4-folio, ml-pc-faust-en, bk-hen4-modern). Over all registers, English pockets are 62 PRESENT+ / 20 PRESENT- / 6 ABSENT / 47 AMBIGUOUS, while German 0/12/0/4, Greek 0/12/0/1, French
//    0/9/0/3, Italian 0/4/0/3, Arabic 0/3/0/5, Hebrew 0/3/0/2, Finnish 0/1/0/4 (PRESENT+/PRESENT-/ABSENT/AMBIGUOUS); the atlas pockets that are English AND academic/essay/encyclopedia/reportage are 18 of 20 PRESENT+. So 'drama is negative' may be 'non-English
//    text is negative'. The sibling plan I was given expects PRESENT- in >= 2 of 3 drama siblings; ALL available drama siblings are English, and I therefore register a blind prediction that DIFFERS from the claim for them (headline-B below).
//  DEVIATIONS FROM THE SIBLING PLAN (stated, not hidden): (1) Evolution Made Plain (fi/pg76749) has 13,728 tokens: thin, listed, never scored. About London is 53.6k tokens: scored. (2) 'new NTRS papers if any remain': none remain; the atlas loader
//    (loaders/_fm_ref_src.mjs ntrsFiles) takes every NTRS report 1965-2030 into the three fm-ntrs-* pockets. (3) Lysistrata (fr/pg7700, 14.5k words) is under the floor and is not built. (4) NO unused non-English text exists in the ethos folders or
//    /private/tmp/claude-501 apart from documents of capped pockets (the other non-English material is entirely inside atlas pockets), so this replication CANNOT put the language-versus-register question to a non-English drama or a non-English
//    exposition; the only non-English siblings are 14 UD treebank TRAIN splits of languages that have no atlas pocket (the entSlope agent reported that UD train splits do not exist on this machine; they exist under /private/tmp/claude-501/tb/<stem>/train.conllu,
//    not under ud-eval/). (5) The IRC siblings are the documents the atlas 300k whole-document cap DROPPED (43 and 41 blocks): same channel and same sampled days as their atlas kin, so weaker independence than a new channel; the other channels have no dropped
//    documents. (6) Code siblings are the user's own repositories and one open-source fork, all English-commented; the atlas cd-cc-* are GitHub files.
//  KNOWN LIMITS OF THE ATLAS THE LAW COMES FROM: comp.asym is fired by no planted world (g0 'unmapped'), so there is no instrument proof that it measures anything; the atlas builder states it did not track word order on 9 UD treebanks; z uses 10 draws
//    (sd estimated with 9 degrees of freedom). INDEPENDENCE: of the 27 scored siblings (6 headline-A, 2 headline-B, 1 Python, 4 narrative, 14 UD) ten are English text, three are code and fourteen are UD treebank train splits (sentences, one language each); every English text is a new document of a kind
//    the atlas already holds, and no sibling is a new language of running prose.
//
// HOW THE STATISTIC AND ITS NULL ARE COMPUTED (identical to run-atlas.mjs): per pocket, halves(p) by sha256(id:doc) parity; per half the 'comp' family compute(view) is called once on the real view and once on each of 10
// nullView(view, 'within-unit', seed) draws with seed = seedOf(p.id, half, 'comp', 'within-unit', k), k = 0..9; v = observed value, nullMean/nullSd over the finite draws, z = (v - nullMean) / nullSd. The statistic is comp.asym.
// The same draws are used for the rival (family 'order', seedOf(p.id, half, 'order', 'within-unit', k)) and the two variants of comp.asym below; the variants reuse the same shuffled views as the main statistic.
//
// PASS RULE, ADVERSARIES, BLIND PREDICTIONS: the data object PREREG below is the single source of truth (the code under the END marker reads it). In words:
//  - six HEADLINE-A siblings (English reportage, English essay, two English IRC held-out sets, JavaScript, TypeScript): claim and blind prediction both PRESENT+.
//  - two HEADLINE-B siblings (A Doll's House; Marlowe + Greene): the CLAIM says PRESENT-; my BLIND prediction is ABSENT or AMBIGUOUS (not PRESENT-). The verdict is on the claim as stated, so if I am right the verdict is PARTIAL ('positive arm
//    confirmed, negative drama arm refuted for English').
//  - secondary groups (Python code; four English narratives; fourteen UD train splits) and instrument checks (two law-free controls; a pooled-drama power check; a harness self-check on bk-alice) are reported and are not part of the verdict.
// ===== END MARKER BELOW =====

export const PREREG = {
 "law": "comp.asym",
 "family": "comp",
 "statId": "asym",
 "statement": "head-direction proxy: mean over the 20 commonest types (>= 40 interior occurrences) of (H_R - H_L)/(H_R + H_L), H = Miller-Madow entropy of the rank bin of the right / left neighbour; > 0 = right company more diverse than left",
 "protocolSha256": "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc",
 "null": "within-unit",
 "draws": 10,
 "seedRule": "seedOf(pocketId, half, 'comp', 'within-unit', k), k = 0..9, exactly as run-atlas.mjs",
 "claimUnderTest": "For the 20 commonest types, right-hand neighbours are more diverse than left-hand ones (positive) in academic 10/12, chat 12/20, code 19/47, essay 3/3, encyclopedia 3/4, reportage 3/4, and less diverse (negative) in drama 9/12, scripture 13/26, children 9/17, treatise 11/26, novel 7/25, book 7/19; this is a register-scoped sign of the commonest types' company asymmetry, not shown to track head direction (the builder found it did not on 9 UD treebanks).",
 "status": {
  "PRESENT+": "z >= 4 in both halves",
  "PRESENT-": "z <= -4 in both halves",
  "ABSENT": "|z| < 2 in both halves",
  "AMBIGUOUS": "anything else (unscored: neither credit nor refutation)"
 },
 "codeSha256": {
  "laws/comp.mjs": "2089fcc5b1118312a1115a567becb20f098a17815c6c5c3b1ed5f108b3686738",
  "laws/_comp_core.mjs": "262173463c6a12228145642375ca43c4597b1d06de9ab69e5eb526a44ff73fe6",
  "laws/_comp_neigh.mjs": "e6c3e51f3b8a82e085e710a249263c780a8d00bf4c30ad3c81f99ed1cf491c08",
  "laws/_comp_pairs.mjs": "04c39bb54bf0c9c05383b52ba11ca8765cc0a2e945c72a57e1901ade12cc43e6",
  "laws/_comp_prep.mjs": "a8f20d73a87b460cef29bd00273a078a706c751ab51196cc9a0664dc9e91018d",
  "laws/order.mjs": "c3125a15e2822fabdcaeae74df38ef66f9a3f5f3133c5bec4c164067c8b34424",
  "laws/_order_pair.mjs": "779fff8880c9c771f50108f4a163d9fd160c048d3e04d17c42316a13cface991",
  "laws/_order_pos.mjs": "5da80e765a244656c7fe3c3b8e22de714121170907ba4ecf35b8e60bab2d9f60",
  "laws/_order_prep.mjs": "52f29a6dcd58db930e036f52d3cfdf22c53299a8c84ea56b92cc20858a23ef78",
  "laws/_order_surp.mjs": "b306ec4eba8d6a7478926ae706a014e3995c521a40037d1816852a3bbfca5c23",
  "lib/pocket.mjs": "529a5bc7c80a4d01653aab9fa688598b5aa25fadc4a848b90cf7c85b34f78637",
  "run-atlas.mjs": "df9c2a1e2a8682564ec780fc562b7ef083a478b48e5ce0093437766ba336f8cb",
  "PROTOCOL.md": "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc"
 },
 "loaderSha256": {
  "loaders/_sibling-asym-prose.mjs": "671b2c149fdfd89f9f9e70b84a4b7e6632ac03e628d7cdd405a10f3757d20d79",
  "loaders/_sibling-asym-chat.mjs": "5ef53501787f01e06bf98154cac7dc3826a76a561336030d0781756e8c7df6a2",
  "loaders/_sibling-asym-code.mjs": "ec40623e6e7f76132873d35cbbc90a300e819afbfc29a180627212f3e1433a56",
  "loaders/_sibling-asym-ud.mjs": "bebdc9bed3cd2c84e457a526796beae31097f494e0565f16b10d9446100d67fe",
  "loaders/_sibling-asym-ctl.mjs": "a2cfa8100345a859951dec7c6c58d37efad61c4135efe43f0918c5af51eda37e",
  "loaders/_sibling-asym-all.mjs": "7443360f540fba6329a403caaa8b669afcbc5b1cd3e638d876e0d4d70c248ef3",
  "loaders/_sibling-ent-common.mjs": "9079478659ec5ef843d39e80cb396e556dcbb590641089aececb0d1de1347b81",
  "loaders/_bkcore.mjs": "eb83533561cfde8ecf8578cbd88fb5977a3d61576e46f20728915d6b9640cc96",
  "loaders/_bkseg.mjs": "d98072525432a180435b5357fa61179d68c49e0b94f1a8a2b82015dadc614e58",
  "loaders/organic.mjs": "4ac6c85e29f049732448cc8481d5a2db39257627b68a4601ddb39da3f611a545",
  "loaders/_cd_util.mjs": "c6b3c22b65333e8b9acfeb5ca240b2b12fd55701e21252c9ab05364702ceb1d2",
  "loaders/_ud_ml_run.mjs": "a502e217b8bf0be353d3d7108d39755901456e99050b74dd6f26d32a6485e86b",
  "loaders/_conllu.mjs": "1802948433cb9c63fa0d51c1c4c1f0792bf54d887c1fb97c743ff7adbe30d6b4",
  "loaders/_ud_ml_common.mjs": "0047fd37a27811f1e1121b99d69e97afcddb191ceee22fa924cb8782185b36b2"
 },
 "rules": {
  "scoring": "A sibling is SCORED when its status is PRESENT+, PRESENT- or ABSENT (PROTOCOL cell status on both halves); AMBIGUOUS siblings are listed and neither credit nor refute. Thin siblings (< 20,000 tokens or < 20 documents), the power-check pool and the controls are never part of the verdict.",
  "headline": "HEADLINE siblings = role headline-A (six, claim: PRESENT+) and headline-B (two, claim: PRESENT-). A headline sibling MATCHES THE CLAIM when its status equals its claimExpect. Verdict is on the claim AS STATED (register-scoped sign), not on my own blind prediction.",
  "REPLICATES": "every scored headline sibling matches the claim, with at least 4 scored headline-A siblings and at least 1 scored headline-B sibling.",
  "FAILS": "fewer than half of the scored headline siblings match the claim, OR no scored headline-A sibling is PRESENT+, OR more than one third of the scored headline-A siblings are PRESENT- (the sign is reversed where the claim says +).",
  "PARTIAL": "anything else (matches in some, and I state which kinds match and which do not); also the verdict when fewer than 4 headline siblings are scorable.",
  "blindScore": "Separately reported: how many of my own blindExpect entries hold (for headline-B and the power check, blindExpect = status ABSENT or AMBIGUOUS, i.e. NOT PRESENT-; PRESENT+ would break it too). My blind prediction for headline-B DIFFERS from the claim on purpose (see DISCLOSURE): I expect the claim to fail on English drama and the positive arm to hold; this is registered in advance.",
  "groupCode": "plan rule 'new code pockets expect PRESENT+ in >= 50%': holds when at least 2 of the 3 code siblings {asym-cd-js, asym-cd-ts, asym-cd-py} are PRESENT+ (reported, not part of the verdict beyond js and ts).",
  "groupNarrative": "my blind rule for the four narrative siblings: no consistent sign = at most 2 of the 4 are PRESENT+ and at most 2 are PRESENT-. The claim's own entry for the novel kind is PRESENT-; reported against both, not part of the verdict.",
  "groupTreebank": "plan rule 'UD train splits expect mixed sign with no majority': among the UD siblings with a PRESENT status (needs >= 4 of them, else 'uninformative'), neither sign accounts for more than 75% of them. Not part of the verdict.",
  "constant": "For every scored sibling, v per half is compared with its vRange (the central 80% of the atlas kin's mean v, rounded outward); the number of siblings whose two half-values both lie in vRange is reported. It is not part of the verdict.",
  "controls": "INSTRUMENT CHECK: the two law-free controls must be ABSENT or AMBIGUOUS (never PRESENT). A PRESENT control invalidates the harness and the verdict is reported with that flag.",
  "harnessSelfCheck": "Before the siblings are read, this file recomputes comp.asym for the atlas pocket bk-alice through the same code path and compares v, nullMean, nullSd, z in both halves with results/atlas/bk-alice.json: they must agree to 1e-9. If they do not, no sibling result is reported as a result."
 },
 "adversaries": {
  "ADV-1 estimator (Miller-Madow bias at 20 types)": "recompute the statistic with PLAIN-ENTROPY H (no (R-1)/(2 n ln2) term) on the same real views and the same 10 within-unit draws; reading: for each sibling cell that is PRESENT under Miller-Madow, status and sign under plain-entropy are the same; the law is called estimator-fragile if more than 20% of PRESENT cells change status or sign.",
  "ADV-2 unit-edge asymmetry": "recompute the statistic on occurrences at least 2 tokens inside the unit on both sides (so the neighbour is never the unit-initial or unit-final token), eligibility (>= 40 such occurrences, >= 10 of the 20 commonest types) as in the original; reading: sign and status survive in >= 80% of the cells where defined; otherwise the law is at least partly an edge effect. Cells where it is undefined (units too short) are reported, not scored.",
  "ADV-3 cheaper rival order.fnBefore": "compute order.fnBefore (laws/order.mjs, content tokens with both neighbours, P(left is head) - P(right is head)) on the same views and draws; reading: where both are PRESENT in a sibling, do they have the same sign (agreement share), and across the atlas real pockets the Spearman rho between the half-averaged v of comp.asym and of order.fnBefore; |rho| >= 0.8 or sign agreement >= 90% means comp.asym is not an independent law from the function-word-before-content rival.",
  "ADV-4 language versus register (atlas only, no sibling)": "among atlas real pockets that are PRESENT+ or PRESENT- (comp.asym), eta-squared of the sign on (a) register, (b) an English / not-English flag, (c) register within English only, and the share of PRESENT- cells that are non-English; reading: if the English flag explains at least as much of the sign as register does, the register-scoped wording of the claim is a language effect in disguise (this is the hypothesis behind headline-B).",
  "ADV-5 multiplicity": "number of sibling cells tested = number of scored siblings x 2 halves; the expected number of false PRESENT siblings under the atlas iid-planted rate (law-table.falsePresent: p = 8.5e-5 per cell) is reported against a binomial reference.",
  "ADV-6 leakage": "(a) IRC held-out documents: share of their messages of >= 6 tokens that also occur verbatim in the atlas pocket oc-irc-ubuntu-0607 / -0809; (b) code: files dropped for being byte-identical to an atlas file (loader counters); (c) UD: train sentences also in ud-eval dev/test (meta.leak); (d) prose: none of these source files is LOADED by an atlas pocket: loaders/ml.manifest.json lists the misfiled English gutenberg-non-en files only as SKIPPED (_ml_skips.mjs ENGLISH_MISFILED) and loaders/books.manifest.json lists Marlowe's Faustus as a thin skip (16,391 tokens, never a pocket) (checked by file path against the manifests before building)."
 },
 "siblings": [
  {
   "id": "asym-en-about-london",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english expository/reportage prose",
   "role": "headline-A",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": 0.85,
   "vRange": [
    0.004,
    0.03
   ],
   "register": "reportage",
   "language": "en",
   "tokens": 53609,
   "units": 2104,
   "docs": 30,
   "meanUnitLength": 25.48,
   "types": 7951,
   "halfTokens": {
    "discover": 28704,
    "confirm": 24905
   },
   "halfDocs": {
    "discover": 16,
    "confirm": 14
   },
   "thin": false,
   "scored": true,
   "contentSha256": "cc913fda3da1c4821a3afaa2fbea9cc51c00484434b6d5a4a1fae9d6cb8cf492",
   "why": "atlas kin = English academic/essay/encyclopedia/reportage: 18 of 20 PRESENT+, 1 PRESENT-, 1 AMBIGUOUS (median v 0.0144; 10th-90th percentile 0.0056..0.0261); 53.6k tokens, 25 tokens/unit"
  },
  {
   "id": "asym-en-among-forces",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english expository/reportage prose",
   "role": "headline-A",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": 0.7,
   "vRange": [
    0.004,
    0.03
   ],
   "register": "essay",
   "language": "en",
   "tokens": 35707,
   "units": 2018,
   "docs": 30,
   "meanUnitLength": 17.69,
   "types": 5330,
   "halfTokens": {
    "discover": 14334,
    "confirm": 21373
   },
   "halfDocs": {
    "discover": 12,
    "confirm": 18
   },
   "thin": false,
   "scored": true,
   "contentSha256": "406724720ff9d4b87a6fa6336585a4f2c381d11280bb9d673da89b4bdd19916b",
   "why": "same atlas kin (essay 3 of 3 PRESENT+); smaller (35.7k tokens, first half 14k) so lower power: English pockets of 30-60k tokens are PRESENT+ in only 9 of 27"
  },
  {
   "id": "asym-oc-irc-ho-0607",
   "loader": "loaders/_sibling-asym-chat.mjs",
   "kind": "english chat (IRC)",
   "role": "headline-A",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": 0.85,
   "vRange": [
    0.007,
    0.035
   ],
   "register": "chat",
   "language": "en",
   "tokens": 44326,
   "units": 4304,
   "docs": 43,
   "meanUnitLength": 10.3,
   "types": 4948,
   "halfTokens": {
    "discover": 17344,
    "confirm": 26982
   },
   "halfDocs": {
    "discover": 16,
    "confirm": 27
   },
   "thin": false,
   "scored": true,
   "contentSha256": "ee13d6eb308e541108a55b13fc179efd88b983a08fa0eb445870936ff8a96a59",
   "why": "atlas kin = the 12 English IRC pockets: 12 of 12 PRESENT+ (median v 0.0129; 10th-90th percentile 0.0097..0.0320). Held-out documents of the same channel-days as oc-irc-ubuntu-0607: weak independence from the kin"
  },
  {
   "id": "asym-oc-irc-ho-0809",
   "loader": "loaders/_sibling-asym-chat.mjs",
   "kind": "english chat (IRC)",
   "role": "headline-A",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": 0.85,
   "vRange": [
    0.007,
    0.035
   ],
   "register": "chat",
   "language": "en",
   "tokens": 44366,
   "units": 4094,
   "docs": 41,
   "meanUnitLength": 10.84,
   "types": 4878,
   "halfTokens": {
    "discover": 16330,
    "confirm": 28036
   },
   "halfDocs": {
    "discover": 15,
    "confirm": 26
   },
   "thin": false,
   "scored": true,
   "contentSha256": "ddbad8bb9586dd6adf5510333c437940cfa0686fc5d2e42a65b48bfae906f0b0",
   "why": "as asym-oc-irc-ho-0607 (kin oc-irc-ubuntu-0809)"
  },
  {
   "id": "asym-cd-js",
   "loader": "loaders/_sibling-asym-code.mjs",
   "kind": "code (JavaScript)",
   "role": "headline-A",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": 0.8,
   "vRange": [
    0.01,
    0.06
   ],
   "register": "code",
   "language": "x-javascript",
   "tokens": 295254,
   "units": 40058,
   "docs": 175,
   "meanUnitLength": 7.37,
   "types": 13319,
   "halfTokens": {
    "discover": 154955,
    "confirm": 140299
   },
   "halfDocs": {
    "discover": 90,
    "confirm": 85
   },
   "thin": false,
   "scored": true,
   "contentSha256": "0759eb7f038c63353a0b2f599fd3baae92264e545eafb5327fa240785e76ad64",
   "why": "atlas kin: cd-cc-javascript and cd-e09-eoapp-js both PRESENT+ (v 0.0223..0.0401); all 47 code pockets 19+/5-/23 ambiguous; 295k tokens (high power)"
  },
  {
   "id": "asym-cd-ts",
   "loader": "loaders/_sibling-asym-code.mjs",
   "kind": "code (TypeScript)",
   "role": "headline-A",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": 0.8,
   "vRange": [
    0.01,
    0.06
   ],
   "register": "code",
   "language": "x-typescript",
   "tokens": 291346,
   "units": 66170,
   "docs": 467,
   "meanUnitLength": 4.4,
   "types": 15072,
   "halfTokens": {
    "discover": 110470,
    "confirm": 180876
   },
   "halfDocs": {
    "discover": 210,
    "confirm": 257
   },
   "thin": false,
   "scored": true,
   "contentSha256": "f796473a3b725842e82643788716130b36bae5c699b76d6403e83cf48290eef9",
   "why": "atlas kin: cd-cc-typescript and cd-cc-tsx both PRESENT+ (v 0.0260..0.0282); 291k tokens"
  },
  {
   "id": "asym-en-dolls-house",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english drama",
   "role": "headline-B",
   "claimExpect": "PRESENT-",
   "blindExpect": "ABSENT-or-AMBIGUOUS",
   "probBlindHolds": 0.75,
   "vRange": [
    -0.006,
    0.01
   ],
   "register": "drama",
   "language": "en",
   "tokens": 22597,
   "units": 2497,
   "docs": 30,
   "meanUnitLength": 9.05,
   "types": 2191,
   "halfTokens": {
    "discover": 12209,
    "confirm": 10388
   },
   "halfDocs": {
    "discover": 16,
    "confirm": 14
   },
   "thin": false,
   "scored": true,
   "contentSha256": "d52ca63599680627cd64046d8a385cf124d61a9ee3748d967826a5d6779c0f11",
   "why": "THE CLAIM says drama is PRESENT- (9 of 12), but all 9 PRESENT- atlas dramas are NOT English (de, fr, es, nl, grc) while the 3 English atlas dramas are ABSENT, ABSENT, AMBIGUOUS (v -0.0009..0.0069, 25-36k tokens). Blind: an English play is not PRESENT- (P(PRESENT-)=0.15, P(PRESENT+)=0.10). 22.6k tokens, halves 12k/10k: low power"
  },
  {
   "id": "asym-en-early-plays",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english drama",
   "role": "headline-B",
   "claimExpect": "PRESENT-",
   "blindExpect": "ABSENT-or-AMBIGUOUS",
   "probBlindHolds": 0.75,
   "vRange": [
    -0.006,
    0.01
   ],
   "register": "drama",
   "language": "en",
   "tokens": 31927,
   "units": 1848,
   "docs": 30,
   "meanUnitLength": 17.28,
   "types": 5399,
   "halfTokens": {
    "discover": 15028,
    "confirm": 16899
   },
   "halfDocs": {
    "discover": 15,
    "confirm": 15
   },
   "thin": false,
   "scored": true,
   "contentSha256": "99dcee7670c5b7d1638466e5d80fcca829d15e4e9f9aa631377e7dd09a64af94",
   "why": "as asym-en-dolls-house; 31.9k tokens (Elizabethan verse plays, original spelling for James IV)"
  },
  {
   "id": "asym-en-plays-pooled",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english drama (pool)",
   "role": "power-check",
   "claimExpect": "PRESENT-",
   "blindExpect": "ABSENT-or-AMBIGUOUS",
   "probBlindHolds": 0.75,
   "vRange": [
    -0.006,
    0.01
   ],
   "register": "drama",
   "language": "en",
   "tokens": 54524,
   "units": 4345,
   "docs": 43,
   "meanUnitLength": 12.55,
   "types": 6618,
   "halfTokens": {
    "discover": 32942,
    "confirm": 21582
   },
   "halfDocs": {
    "discover": 26,
    "confirm": 17
   },
   "thin": false,
   "scored": false,
   "contentSha256": "d0d9b9b320a17bd4e03067ecc91c4fac88397d29943d5b64e1b523a9d1d1471e",
   "why": "POWER CHECK, not an independent sibling (re-uses the units of the two drama siblings in one 54.5k-token pocket): if the two drama siblings are AMBIGUOUS for lack of power, this one tells whether more tokens move them to PRESENT-"
  },
  {
   "id": "asym-cd-py",
   "loader": "loaders/_sibling-asym-code.mjs",
   "kind": "code (Python)",
   "role": "secondary-code",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": 0.35,
   "vRange": [
    -0.015,
    0.03
   ],
   "register": "code",
   "language": "x-python",
   "tokens": 90463,
   "units": 15733,
   "docs": 127,
   "meanUnitLength": 5.75,
   "types": 7120,
   "halfTokens": {
    "discover": 55036,
    "confirm": 35427
   },
   "halfDocs": {
    "discover": 66,
    "confirm": 61
   },
   "thin": false,
   "scored": true,
   "contentSha256": "5186ed7535e18c4008b8e10dd654565fe2572f6b332d6789ec267247f6e965f7",
   "why": "atlas kin: cd-cc-python and cd-e09-python are both AMBIGUOUS (v 0.0009/0.0457 and -0.0005/-0.0153); the plan's code rule (PRESENT+ in >= 50% of new code pockets) is scored over {js, ts, py}"
  },
  {
   "id": "asym-en-mouret",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english novel",
   "role": "secondary-narrative",
   "claimExpect": "PRESENT-",
   "blindExpect": "no-consistent-sign",
   "probBlindHolds": 0.5,
   "vRange": [
    -0.012,
    0.012
   ],
   "register": "novel",
   "language": "en",
   "tokens": 126434,
   "units": 7974,
   "docs": 80,
   "meanUnitLength": 15.86,
   "types": 9722,
   "halfTokens": {
    "discover": 54814,
    "confirm": 71620
   },
   "halfDocs": {
    "discover": 36,
    "confirm": 44
   },
   "thin": false,
   "scored": true,
   "contentSha256": "4e9803c7436740861cdce733867c2b2c523eced1fd05822bd6e2d8d9af99e34b",
   "why": "atlas English novels: 4 PRESENT+, 7 PRESENT-, 1 ABSENT, 12 AMBIGUOUS (median v 0.0002; 10th-90th -0.0091..0.0090): the claim's 'novel negative (7/25)' is a minority; blind: the kind has no consistent sign"
  },
  {
   "id": "asym-en-poe2",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english novel (tales)",
   "role": "secondary-narrative",
   "claimExpect": "PRESENT-",
   "blindExpect": "no-consistent-sign",
   "probBlindHolds": 0.5,
   "vRange": [
    -0.012,
    0.012
   ],
   "register": "novel",
   "language": "en",
   "tokens": 94473,
   "units": 4101,
   "docs": 41,
   "meanUnitLength": 23.04,
   "types": 10033,
   "halfTokens": {
    "discover": 48404,
    "confirm": 46069
   },
   "halfDocs": {
    "discover": 20,
    "confirm": 21
   },
   "thin": false,
   "scored": true,
   "contentSha256": "30067078f4fcc31b20fd3fae73c156c05992e267e36324705899cf4f76d0a4d4",
   "why": "as asym-en-mouret"
  },
  {
   "id": "asym-en-awakening",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english novel",
   "role": "secondary-narrative",
   "claimExpect": "PRESENT-",
   "blindExpect": "no-consistent-sign",
   "probBlindHolds": 0.5,
   "vRange": [
    -0.012,
    0.012
   ],
   "register": "novel",
   "language": "en",
   "tokens": 64499,
   "units": 4448,
   "docs": 44,
   "meanUnitLength": 14.5,
   "types": 6869,
   "halfTokens": {
    "discover": 27027,
    "confirm": 37472
   },
   "halfDocs": {
    "discover": 19,
    "confirm": 25
   },
   "thin": false,
   "scored": true,
   "contentSha256": "dc16e0273e5a19ed70b803485c137d4a8e4c6654c95eede4b49cde703d5e5f9e",
   "why": "as asym-en-mouret"
  },
  {
   "id": "asym-en-waikna",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english memoir/travel",
   "role": "secondary-narrative",
   "claimExpect": "no claim (memoir: not listed)",
   "blindExpect": "no-consistent-sign",
   "probBlindHolds": 0.5,
   "vRange": [
    -0.012,
    0.012
   ],
   "register": "memoir",
   "language": "en",
   "tokens": 74854,
   "units": 2855,
   "docs": 30,
   "meanUnitLength": 26.22,
   "types": 8342,
   "halfTokens": {
    "discover": 43981,
    "confirm": 30873
   },
   "halfDocs": {
    "discover": 18,
    "confirm": 12
   },
   "thin": false,
   "scored": true,
   "contentSha256": "4bbda47854dffa7d42d9057ee91adde28fa077a4eab318e02d71660c7d762d90",
   "why": "atlas English memoir: 2 PRESENT+, 3 PRESENT-, 1 ABSENT, 7 AMBIGUOUS (median v -0.0010)"
  },
  {
   "id": "asym-en-evolution-plain",
   "loader": "loaders/_sibling-asym-prose.mjs",
   "kind": "english expository (thin)",
   "role": "thin",
   "claimExpect": "PRESENT+",
   "blindExpect": "PRESENT+",
   "probBlindHolds": null,
   "vRange": [
    0.004,
    0.03
   ],
   "register": "essay",
   "language": "en",
   "tokens": 13728,
   "units": 545,
   "docs": 27,
   "meanUnitLength": 25.19,
   "types": 2814,
   "halfTokens": {
    "discover": 4899,
    "confirm": 8829
   },
   "halfDocs": {
    "discover": 10,
    "confirm": 17
   },
   "thin": true,
   "scored": false,
   "contentSha256": "9a8ad790ce21dcdb537958ba001d87d167aab39961d441c1bd288d582bbd536f",
   "why": "13.7k tokens: under the 20,000-token floor, reported thin and NEVER scored (listed in the sibling plan)"
  },
  {
   "id": "asym-ud-ita",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "ita",
   "tokens": 240871,
   "units": 13060,
   "docs": 523,
   "meanUnitLength": 18.44,
   "types": 25225,
   "halfTokens": {
    "discover": 128140,
    "confirm": 112731
   },
   "halfDocs": {
    "discover": 267,
    "confirm": 256
   },
   "thin": false,
   "scored": true,
   "contentSha256": "c102b1a56c6719dfcf428cd97deaa030bdd86a25734af9d899998d54819572bc",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-nld",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "nld",
   "tokens": 163958,
   "units": 12277,
   "docs": 492,
   "meanUnitLength": 13.35,
   "types": 24377,
   "halfTokens": {
    "discover": 84298,
    "confirm": 79660
   },
   "halfDocs": {
    "discover": 249,
    "confirm": 243
   },
   "thin": false,
   "scored": true,
   "contentSha256": "6162c97d7c0a4f0649e6dc8162ce12b8ffab5f6abe544b9dcb9945805cee5c4a",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-rus",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "rus",
   "tokens": 58306,
   "units": 3850,
   "docs": 154,
   "meanUnitLength": 15.14,
   "types": 23666,
   "halfTokens": {
    "discover": 33875,
    "confirm": 24431
   },
   "halfDocs": {
    "discover": 90,
    "confirm": 64
   },
   "thin": false,
   "scored": true,
   "contentSha256": "369cbb6dc027e8683c14e013017fb51c42e496d74944b09fbf502f6eeac6ec75",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-ces",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "ces",
   "tokens": 299982,
   "units": 17228,
   "docs": 690,
   "meanUnitLength": 17.41,
   "types": 51016,
   "halfTokens": {
    "discover": 155303,
    "confirm": 144679
   },
   "halfDocs": {
    "discover": 354,
    "confirm": 336
   },
   "thin": false,
   "scored": true,
   "contentSha256": "fb57bf37fe2b0d97a2afe17e6f4ae4518f321c3d2be9a9cd0cd9ff0941eeb8a4",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-dan",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "dan",
   "tokens": 68296,
   "units": 4369,
   "docs": 175,
   "meanUnitLength": 15.63,
   "types": 14910,
   "halfTokens": {
    "discover": 30971,
    "confirm": 37325
   },
   "halfDocs": {
    "discover": 80,
    "confirm": 95
   },
   "thin": false,
   "scored": true,
   "contentSha256": "dcd7a22cf7fe9ff8352e2d50e33422ca807cc01f7f3f324be44b1fef64cfefb3",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-lit",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "lit",
   "tokens": 37825,
   "units": 2340,
   "docs": 94,
   "meanUnitLength": 16.16,
   "types": 12276,
   "halfTokens": {
    "discover": 19596,
    "confirm": 18229
   },
   "halfDocs": {
    "discover": 49,
    "confirm": 45
   },
   "thin": false,
   "scored": true,
   "contentSha256": "0a84371db3571594e12ecdeb30f3b3a7b6903aed1e37c6b91619f47c1bad4645",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-ell",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "ell",
   "tokens": 37783,
   "units": 1632,
   "docs": 66,
   "meanUnitLength": 23.15,
   "types": 8275,
   "halfTokens": {
    "discover": 19830,
    "confirm": 17953
   },
   "halfDocs": {
    "discover": 34,
    "confirm": 32
   },
   "thin": false,
   "scored": true,
   "contentSha256": "57e0e1871ebed139b8c3ed13549ecca4bdbf050d89cbeae1e5b6f3f5e6031b77",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-tur",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "tur",
   "tokens": 30973,
   "units": 3430,
   "docs": 138,
   "meanUnitLength": 9.03,
   "types": 12381,
   "halfTokens": {
    "discover": 15889,
    "confirm": 15084
   },
   "halfDocs": {
    "discover": 73,
    "confirm": 65
   },
   "thin": false,
   "scored": true,
   "contentSha256": "4f9872a5942490dd7923afcefdeecb689e0999f14b669bc1b5f01153e51591b5",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-hye",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "hye",
   "tokens": 65187,
   "units": 4352,
   "docs": 175,
   "meanUnitLength": 14.98,
   "types": 18538,
   "halfTokens": {
    "discover": 34739,
    "confirm": 30448
   },
   "halfDocs": {
    "discover": 89,
    "confirm": 86
   },
   "thin": false,
   "scored": true,
   "contentSha256": "63e8dd39305dda77464c21253659e43ca2ab1f504d644550f309f119fbb2cde2",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-kat",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "kat",
   "tokens": 33092,
   "units": 2214,
   "docs": 89,
   "meanUnitLength": 14.95,
   "types": 11034,
   "halfTokens": {
    "discover": 12974,
    "confirm": 20118
   },
   "halfDocs": {
    "discover": 35,
    "confirm": 54
   },
   "thin": false,
   "scored": true,
   "contentSha256": "452d26740a7cd564ae06f5442fde82b438490c66e4e010c0f391ad7ddf6e0b17",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-gle",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "gle",
   "tokens": 85922,
   "units": 3997,
   "docs": 160,
   "meanUnitLength": 21.5,
   "types": 12364,
   "halfTokens": {
    "discover": 38741,
    "confirm": 47181
   },
   "halfDocs": {
    "discover": 73,
    "confirm": 87
   },
   "thin": false,
   "scored": true,
   "contentSha256": "0869476cc1a5c010f3fd9dfc6a7d40b5624c80138e0421d0f5abd423356c1528",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-afr",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "afr",
   "tokens": 30498,
   "units": 1315,
   "docs": 53,
   "meanUnitLength": 23.19,
   "types": 4553,
   "halfTokens": {
    "discover": 16916,
    "confirm": 13582
   },
   "halfDocs": {
    "discover": 28,
    "confirm": 25
   },
   "thin": false,
   "scored": true,
   "contentSha256": "dc3b2cfcc8cd0f61821fce94ff5d637948d2fa0f95c5620f79154ab51b10a8b7",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-mlt",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "mlt",
   "tokens": 20056,
   "units": 1120,
   "docs": 45,
   "meanUnitLength": 17.91,
   "types": 4810,
   "halfTokens": {
    "discover": 7996,
    "confirm": 12060
   },
   "halfDocs": {
    "discover": 18,
    "confirm": 27
   },
   "thin": false,
   "scored": true,
   "contentSha256": "942b743fd86b1c5eea9139557bb8465daaa736374287aa86e3cadf592797d660",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ud-wol",
   "loader": "loaders/_sibling-asym-ud.mjs",
   "kind": "UD treebank train split, language with no atlas pocket",
   "role": "secondary-treebank",
   "claimExpect": "mixed-sign (group rule)",
   "blindExpect": "mixed-sign (group rule)",
   "probBlindHolds": null,
   "vRange": [
    -0.03,
    0.04
   ],
   "register": "treebank",
   "language": "wol",
   "tokens": 20635,
   "units": 1188,
   "docs": 48,
   "meanUnitLength": 17.37,
   "types": 3405,
   "halfTokens": {
    "discover": 10833,
    "confirm": 9802
   },
   "halfDocs": {
    "discover": 26,
    "confirm": 22
   },
   "thin": false,
   "scored": true,
   "contentSha256": "3e9ff50e3ea561a8fbe24da7c495ff5a2120b41fe6edb9dde5faefdc8b25fae7",
   "why": "atlas treebank kin (33 pockets): 6 PRESENT+, 4 PRESENT-, 2 ABSENT, 21 AMBIGUOUS (median v 0.0013; 10th-90th -0.0186..0.0325); the plan expects mixed sign with no majority; a per-language prediction would be a coin flip, so scored as a GROUP"
  },
  {
   "id": "asym-ctl-about-london",
   "loader": "loaders/_sibling-asym-ctl.mjs",
   "kind": "law-free control (token-global shuffle of asym-en-about-london)",
   "role": "control",
   "claimExpect": "ABSENT",
   "blindExpect": "ABSENT",
   "probBlindHolds": 0.9,
   "vRange": [
    -0.006,
    0.006
   ],
   "register": "control",
   "language": "en",
   "tokens": 53609,
   "units": 2104,
   "docs": 30,
   "meanUnitLength": 25.48,
   "types": 7951,
   "halfTokens": {
    "discover": 19258,
    "confirm": 34351
   },
   "halfDocs": {
    "discover": 11,
    "confirm": 19
   },
   "thin": false,
   "scored": false,
   "contentSha256": "928f3be031619c8f949fd76eb70310da4a638397777f5773dd33dbfe10682a13",
   "why": "atlas ct-* controls: every ct-* cell ABSENT or AMBIGUOUS, none PRESENT (0 of 1447 defined cells)"
  },
  {
   "id": "asym-ctl-cd-js",
   "loader": "loaders/_sibling-asym-ctl.mjs",
   "kind": "law-free control (token-global shuffle of asym-cd-js)",
   "role": "control",
   "claimExpect": "ABSENT",
   "blindExpect": "ABSENT",
   "probBlindHolds": 0.9,
   "vRange": [
    -0.006,
    0.006
   ],
   "register": "control",
   "language": "x-javascript",
   "tokens": 295254,
   "units": 40058,
   "docs": 175,
   "meanUnitLength": 7.37,
   "types": 13319,
   "halfTokens": {
    "discover": 135454,
    "confirm": 159800
   },
   "halfDocs": {
    "discover": 95,
    "confirm": 80
   },
   "thin": false,
   "scored": false,
   "contentSha256": "8470112b7107e04a8aa71df73d8ac7b1d5dd6da1f3773aafbe479648c820e80d",
   "why": "as asym-ctl-about-london"
  }
 ]
};

// ===== END OF PRE-REGISTRATION HEADER =====

// ============================ CODE BELOW THE END MARKER (written after the header was hashed; it reads PREREG and changes nothing registered above) ============================
//   node confirm.mjs --self-check            recompute comp.asym of the atlas pocket bk-alice through this code path and compare with results/atlas/bk-alice.json
//   node confirm.mjs --pockets id1,id2,...   compute the siblings (default: every non-thin sibling of PREREG) -> pockets/<id>.json ; --resume skips existing files
//   node confirm.mjs --leak                  ADV-6(a): verbatim overlap of the IRC held-out messages with their atlas kin -> leak.json
//   node confirm.mjs --summarise             read pockets/*.json + the atlas matrix -> confirm-result.json and a printed verdict
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf, sha256, tokenCount } from "../../lib/pocket.mjs";
import * as comp from "../../laws/comp.mjs";
import * as order from "../../laws/order.mjs";
import { prep, NB, entropy, entropyMM, finite } from "../../laws/_comp_prep.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), POCKETS = path.resolve(HERE, "../.."), OUT = path.join(HERE, "pockets");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }, DRAWS = PREREG.draws;
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** one cell exactly as run-atlas.mjs: finite draws, mean/sd of >= 3 of them, z = (v - m)/sd when sd > 0 */
function cellOf(v, drawVals) {
  const xs = drawVals.filter((x) => Number.isFinite(x)), { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
}
/** PROTOCOL cell status from the two half z values */
export function statusOf(zD, zC) {
  if (zD == null || zC == null) return "nodata";
  if (zD >= 4 && zC >= 4) return "PRESENT+";
  if (zD <= -4 && zC <= -4) return "PRESENT-";
  if (Math.abs(zD) < 2 && Math.abs(zC) < 2) return "ABSENT";
  return "AMBIGUOUS";
}
/** asymStat of laws/_comp_neigh.mjs, copied line for line, with two switches for the adversaries: mm = Miller-Madow (true) or plain entropy; deep = tokens required inside the unit on each side of the
 *  centre occurrence (1 = the original: a neighbour on both sides; 2 = the neighbours are never the unit-initial / unit-final token). With {mm: true, deep: 1} it must equal comp.asym exactly (checked). */
export function asymVariant(P, { mm = true, deep = 1 } = {}) {
  const { us, w, tb, cnt, V, nUnits } = P, slot = new Int32Array(V).fill(-1), K = 20, ASYM_MIN = 40, el = [];
  for (let t = 0; t < V; t++) if (cnt[t] >= ASYM_MIN) el.push(t);
  if (el.length < 10) return null;
  const top = el.slice().sort((a, b) => cnt[b] - cnt[a] || a - b).slice(0, K), isTop = new Uint8Array(V); top.forEach((t) => { isTop[t] = 1; });
  el.forEach((t, q) => { slot[t] = q; });
  const S = el.length, hL = new Float64Array(S * NB), hR = new Float64Array(S * NB), nI = new Float64Array(S), H = mm ? entropyMM : (c) => entropy(c)[0];
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1];
    for (let i = s + deep; i < e - deep; i++) { const q = slot[w[i]]; if (q < 0) continue; hL[q * NB + tb[i - 1]]++; hR[q * NB + tb[i + 1]]++; nI[q]++; }
  }
  let sum = 0, m = 0;
  for (let q = 0; q < S; q++) {
    if (nI[q] < ASYM_MIN) continue;
    const a = H(hL.subarray(q * NB, (q + 1) * NB)), b = H(hR.subarray(q * NB, (q + 1) * NB));
    if (!(a + b > 0)) continue;
    if (isTop[el[q]]) { sum += (b - a) / (b + a); m++; }
  }
  return m >= 10 ? finite(sum / m) : null;
}

/** All numbers of one pocket: per half the comp family on the real view and on 10 within-unit draws (seed as run-atlas.mjs), asym cell; the two comp.asym variants on the SAME comp draws; the rival order.fnBefore with
 *  the order family's own draws (seed with 'order'). Also returns the maximum |variant(mm, deep 1) - comp.asym| over the real view and every draw (must be ~0). */
export function runPocket(p, { rival = true } = {}) {
  const H = halves(p), res = { halves: {}, selfCheckMaxDiff: 0 };
  for (const which of ["discover", "confirm"]) {
    const view = H[which], obs = comp.compute(view), kind = "within-unit", dv = [], dr = [];
    const real = { asym: obs.asym, plug: asymVariant(prep(view), { mm: false, deep: 1 }), deep: asymVariant(prep(view), { mm: true, deep: 2 }), deepPlug: asymVariant(prep(view), { mm: false, deep: 2 }), mm1: asymVariant(prep(view), { mm: true, deep: 1 }) };
    if (real.asym != null && real.mm1 != null) res.selfCheckMaxDiff = Math.max(res.selfCheckMaxDiff, Math.abs(real.asym - real.mm1)); else if ((real.asym == null) !== (real.mm1 == null)) res.selfCheckMaxDiff = Infinity;
    const D = { asym: [], plug: [], deep: [], deepPlug: [] };
    for (let k = 0; k < DRAWS; k++) {
      const nv = nullView(view, kind, seedOf(p.id, which, comp.FAMILY, kind, k)), o = comp.compute(nv), P = prep(nv), mm1 = asymVariant(P, { mm: true, deep: 1 });
      D.asym.push(o.asym); D.plug.push(asymVariant(P, { mm: false, deep: 1 })); D.deep.push(asymVariant(P, { mm: true, deep: 2 })); D.deepPlug.push(asymVariant(P, { mm: false, deep: 2 }));
      if (o.asym != null && mm1 != null) res.selfCheckMaxDiff = Math.max(res.selfCheckMaxDiff, Math.abs(o.asym - mm1)); else if ((o.asym == null) !== (mm1 == null)) res.selfCheckMaxDiff = Infinity;
    }
    const h = { asym: cellOf(real.asym, D.asym), plug: cellOf(real.plug, D.plug), deep: cellOf(real.deep, D.deep), deepPlug: cellOf(real.deepPlug, D.deepPlug) };
    if (rival) {
      const ob = order.compute(view), fd = [];
      for (let k = 0; k < DRAWS; k++) fd.push(order.compute(nullView(view, kind, seedOf(p.id, which, order.FAMILY, kind, k))).fnBefore);
      h.fnBefore = cellOf(ob.fnBefore, fd);
    }
    res.halves[which] = h;
  }
  const z = (k) => [res.halves.discover[k]?.z ?? null, res.halves.confirm[k]?.z ?? null];
  res.status = { asym: statusOf(...z("asym")), plug: statusOf(...z("plug")), deep: statusOf(...z("deep")), deepPlug: statusOf(...z("deepPlug")), fnBefore: res.halves.discover.fnBefore ? statusOf(...z("fnBefore")) : null };
  return res;
}
const loadAll = async () => (await import(pathToFileURL(path.join(POCKETS, "loaders/_sibling-asym-all.mjs")).href)).load(null);
const ctlRole = (id) => PREREG.siblings.find((s) => s.id === id);

async function modePockets() {
  fs.mkdirSync(OUT, { recursive: true });
  const want = opt("--pockets", null)?.split(",") ?? PREREG.siblings.filter((s) => !s.thin).map((s) => s.id), resume = argv.includes("--resume"), rival = !argv.includes("--no-rival");
  const todo = want.filter((id) => !(resume && fs.existsSync(path.join(OUT, `${id}.json`))));
  const pockets = (await (await import(pathToFileURL(path.join(POCKETS, "loaders/_sibling-asym-all.mjs")).href)).load(todo));
  for (const id of todo) {
    const p = pockets.find((x) => x.id === id), reg = ctlRole(id), t0 = Date.now();
    if (!p) { console.error(`${id}: not built (thin or missing)`); continue; }
    const meta = validate(p), content = sha256(JSON.stringify([p.units, p.docOf]));
    if (content !== reg.contentSha256) { console.error(`${id}: CONTENT HASH MISMATCH (${content.slice(0, 12)} vs registered ${reg.contentSha256.slice(0, 12)}): refusing to compute`); continue; }
    if (meta.thin) { console.error(`${id}: thin`); continue; }
    const r = runPocket(p, { rival });
    fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ id, role: reg.role, meta: { ...meta, register: p.register, language: p.language, group: p.group }, contentSha256: content, ...r, seconds: (Date.now() - t0) / 1000 }));
    console.error(`${id}: ${meta.tokens} tokens, ${((Date.now() - t0) / 1000).toFixed(1)} s, asym ${r.status.asym} (z ${r.halves.discover.asym.z?.toFixed(1)}, ${r.halves.confirm.asym.z?.toFixed(1)}) selfCheck ${r.selfCheckMaxDiff}`);
  }
}
async function modeSelfCheck() {
  const id = "bk-alice", atlas = JSON.parse(fs.readFileSync(path.join(POCKETS, "results/atlas", `${id}.json`), "utf8"));
  const [p] = await (await import(pathToFileURL(path.join(POCKETS, "loaders/books.mjs")).href)).load([id]);
  const r = runPocket(p, { rival: false }), out = { id, maxAbsDiff: 0, rows: [], variantSelfCheckMaxDiff: r.selfCheckMaxDiff };
  for (const which of ["discover", "confirm"]) for (const f of ["v", "nullMean", "nullSd", "z"]) {
    const a = atlas.halves[which]["comp.asym"][f], b = r.halves[which].asym[f], d = Math.abs(a - b); out.rows.push({ half: which, field: f, atlas: a, here: b, absDiff: d }); out.maxAbsDiff = Math.max(out.maxAbsDiff, d);
  }
  out.pass = out.maxAbsDiff < 1e-9 && r.selfCheckMaxDiff < 1e-12; fs.writeFileSync(path.join(HERE, "self-check.json"), JSON.stringify(out, null, 1));
  console.error(`self-check ${id}: max |atlas - here| = ${out.maxAbsDiff.toExponential(2)}, variant(mm, deep 1) vs comp.asym max diff ${r.selfCheckMaxDiff.toExponential(2)} -> ${out.pass ? "PASS" : "FAIL"}`);
}
const MAIN = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (MAIN) {
  if (argv.includes("--self-check")) await modeSelfCheck();
  else if (argv.includes("--pockets") || argv.includes("--all")) await modePockets();
  else if (argv.includes("--leak")) await (await import(pathToFileURL(path.join(HERE, "confirm-extra.mjs")).href)).modeLeak({ PREREG, HERE, POCKETS });
  else if (argv.includes("--summarise")) await (await import(pathToFileURL(path.join(HERE, "confirm-summarise.mjs")).href)).modeSummarise({ PREREG, HERE, POCKETS, statusOf });
  else console.error("usage: node confirm.mjs --self-check | --all [--resume] | --pockets id1,id2 | --leak | --summarise");
}
