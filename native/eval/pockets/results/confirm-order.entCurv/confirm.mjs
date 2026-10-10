// results/confirm-order.entCurv/confirm.mjs — SIBLING REPLICATION of the atlas law order.entCurv.
// ===== PRE-REGISTRATION HEADER (written 2026-10-07 before any statistic was computed on any sibling; the sha256 of every byte of this file ABOVE the END marker line, that line included, is in prereg.sha256) =====
//
// DISCLOSURE (what I have seen before writing this header, 2026-10-07)
//  SEEN, ATLAS: PROTOCOL.md (sha256 3b7363c5...), lib/pocket.mjs, run-atlas.mjs, laws/order.mjs + laws/_order_prep.mjs + laws/_order_pos.mjs (the statistic's definition and code), results/law-table.json (the order.entCurv entry: counts, byGroup/byRegister/
//    byScript/byGrain, presentV quantiles, absent pocket list, sharedProperty and signSplit rows, g1 rhos, mostSimilar; also the selection, gates and falsePresent blocks), and the per-pocket atlas JSONs results/atlas/*.json for order.entCurv: z and v in both
//    halves of every atlas pocket (I printed registers novel, drama, children, memoir, code, markup, config, chat, treebank, academic, dialect, translation, treatise, history, poetry, scripture, and every control ct-* and planted pl-* world), and for
//    order.rareCurve (the 3 x 4 status contingency with entCurv over the 391 atlas pockets: P+|P+ 83, P+|P- 12, P-|P- 49, P-|P+ 1, ...). The predictions below are therefore NOT blind to the ATLAS (they are read off it by register and size); they are blind to the SIBLINGS.
//  SEEN, OTHER AGENTS' WORK: the loaders loaders/_sibling-ent-*.mjs of the confirmation of order.entSlope (read as CODE, to learn the atlas helper API and where the misfiled English books lie), the header of results/confirm-order.entSlope/confirm.mjs (lines 1-80 and
//    405-470: its disclosure, two of its sibling entries with their entSlope predictions, its pass rule and adversary definitions) and its prereg.sha256; file names and sizes of the other results/confirm-* directories. NOT OPENED: any pockets/*.json, report.json, posthoc*.json or
//    other data file of results/confirm-* (so I have seen NO statistic of any other agent's sibling pocket, including the entSlope siblings that share source files with some siblings below).
//  NOT SEEN: any law statistic (any family, any half, any null draw) of any pocket listed under 'siblings'. For the siblings I looked only at DESCRIPTIVE facts: token / unit / document counts, vocabulary size, unit-length quantiles, a few unit heads and tails,
//    the most frequent unit-initial tokens (to check that speaker labels were removed), the position of the boundary between pooled works, and the sha256 overlap of the code files with the atlas code corpus (0 hits). Cleaning rules (cuts, label removal, the pooling of
//    two plays and of two children's books) were fixed from reading raw files and that descriptive output, before and without any statistic.
//  DEVIATIONS FROM THE SIBLING PLAN (stated, not hidden): (1) the plan's 'UD train splits' do not exist on this machine (/private/tmp/claude-501/ud-eval holds dev.conllu and test.conllu only, 53 stems, the atlas read dev+test of 34 of them); the treebank sibling is
//    UD Latin-Perseus (train+test) from the fixtures of the eoreader7-latest checkout with three documents whose text is an atlas pocket removed (phi0690 Aeneid, phi1351 Tacitus, tlg0031 New Testament); it clears the 20,000-token floor barely (21,484) and each half holds
//    about 11k tokens: a WEAK sibling. (2) Lysistrata alone is thin (about 11k tokens), so A Doll's House and Lysistrata form ONE pooled drama pocket (34k tokens; the plan counted two). (3) Two children's books are pooled into one pocket (each alone is near the floor).
//    (4) Three text siblings (Yonge, Swisshelm, the Shakespeare plays) come from files outside the ethos tree that no atlas pocket reads (grep over loaders/*.mjs and the atlas manifests finds no path of those folders); six misfiled English books (Zola's Mouret, Chopin, Ibsen,
//    Aristophanes in Lindsay's translation, Milne, Stickney) come from ethos 11-multi-language/gutenberg-non-en, which the atlas skipped on purpose (_ml_skips.mjs ENGLISH_MISFILED). Mouret, Chopin's Awakening and the Doll's House part are the same source files, cleaned
//    the same way, as three siblings of the entSlope confirmation (a different statistic; I have not looked at its results). (5) NO new sibling of the registers dialect, chat, academic, diagram, nomenclature, scripture, legal, notation or markup could be built: within the time spent I
//    found no unused material for them: the WPA slave-narrative volumes are all read by atlas pockets (bk-wpa-*), the IRC logs are chosen by date window and I did not audit them file by file, and I did not search the holy-text or legal trees for unused files. The atlas
//    claim for those registers is UNTESTED here. (6) The atlas has no natural kind where entCurv is mostly ABSENT (ABSENT share by
//    register with n >= 10: treebank 12/34 = 35%, chat 5/20, poetry 3/13, dialect 3/13, then <= 19%; code 2/47, children 0/17, drama 0/12). For a REVERSAL the kind 'where it is not present with the + sign' is CODE (28 of 47 PRESENT-): its siblings (JS, TS) are predicted
//    PRESENT-, and two LAW-FREE shuffled controls are predicted ABSENT (they test the instrument, not the law).
//  KNOWN LIMITS OF THE ATLAS THE LAW COMES FROM: G0 did not fully pass (law-table gates.G0.pass false because cancelPass false; iid rate4 0.013 passed; entCurv is 'unmapped' to any planted phenomenon, but the planted worlds pl-frames and pl-mix, which have formulaic
//    frames, give strongly NEGATIVE entCurv (z -16 / -13 and -16 / -8)); z uses 10 null draws (sd estimated with 9 degrees of freedom); the PRESENT rule fires in 22,017 of 29,680 real atlas cells (74%) and entCurv has v of about 0.002-0.012 in most PRESENT+ pockets, so a
//    PRESENT cell is weak evidence by itself and the evidence offered here is the SIGN pattern across kinds and sizes.
//  INDEPENDENCE: all prose siblings are ENGLISH (Mouret, the Doll's House and Lysistrata are translations); the treebank sibling is Latin; the code siblings are JavaScript (the user's own repositories), TypeScript (one third-party repository) and Python (the
//    user's own). The siblings are new DOCUMENTS of the atlas kinds, not new LANGUAGES; this cannot test the law's reach across languages or scripts. Probabilities are my own subjective estimates from atlas analogues, not frequencies.
//
// ATLAS CLAIM UNDER TEST: 'Middle-third entropy minus mean edge-third entropy (rank-class distribution inside a unit) is positive (middle richer, edges specialised) in novels 15/25 (0 below), dialect 10/13, chat 9/20 (0 below), children 7/17, treebank 7/34, drama
//   6/12, academic 6/12, diagram 6/7, nomenclature 4/4; negative in code 28/47 (5 positive), markup 2/5, scripture 10/26, legal 4/31 and notation 2/16.' Verified against results/law-table.json: N 390, nPos 126, nNeg 53, nAbs 58, nAmb 153; heterogeneity 1.872; sharedProperty
//   register eta2 0.1922 p 0.0005; signSplit register eta2 0.5532 p 0.0005; g1 rho(tokens) -0.273, rho(unit length) -0.033, sizeConfounded false; word-grain only 106+ / 13- of 296. byRegister (PRESENT+ / PRESENT- / n) from the table: novel 15/0/25,
//   dialect 10/0/13, chat 9/0/20, children 7/0/17, treebank 7/0/34, drama 6/0/12, academic 6/0/12, diagram 6/0/7, nomenclature 4/0/4; code 5/28/47, markup 0/2/5, scripture 7/10/26, legal 7/4/31, notation 4/2/16. So the claim's numbers for the negative registers are
//   the counts of PRESENT- pockets (and its positive registers the counts of PRESENT+); the claim text matches the table.
//
// HOW THE STATISTIC AND ITS NULL ARE COMPUTED (identical to run-atlas.mjs): per pocket, halves(p) by sha256(id:doc) parity; per half the 'order' family compute(view) once on the real view and once on each of 10 nullView(view,'within-unit',seed) draws with
// seed = seedOf(p.id, half, 'order', 'within-unit', k), k = 0..9; v = observed value, nullMean/nullSd over the finite draws, z = (v - nullMean) / nullSd. All 11 order statistics are saved; only order.entCurv decides the verdict; order.rareCurve is the rival.
//
// The blind predictions, the pass rule and the adversaries are the data object PREREG below (single source of truth: the code under the END marker reads it).
export const PREREG = {
 "law": "order.entCurv",
 "family": "order",
 "statId": "entCurv",
 "statement": "(H(middle third) - mean(H(first third), H(last third))) / H(pooled) of the log2-rank-bin distribution by relative position inside a unit (fractional thirds with equal token mass, Miller-Madow), units >= 3 tokens; > 0 the middle of a unit is the richest (edges specialised), < 0 the edges are richer than the middle (U-shape)",
 "protocolSha256": "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc",
 "null": "within-unit",
 "draws": 10,
 "seedRule": "seedOf(pocketId, half, 'order', 'within-unit', k) for k = 0..9 exactly as run-atlas.mjs (fam.FAMILY = 'order', kind = 'within-unit')",
 "atlasCounts": {
  "N": 390,
  "nPos": 126,
  "nNeg": 53,
  "nAbs": 58,
  "nAmb": 153,
  "heterogeneity": 1.872,
  "sharedPropertyRegister": {
   "eta2": 0.1922,
   "p": 0.0005
  },
  "signSplitRegister": {
   "eta2": 0.5532,
   "p": 0.0005
  },
  "g1": {
   "rhoTokens": -0.273,
   "rhoUnitLength": -0.033
  },
  "mostSimilar": {
   "stat": "order.rareCurve",
   "rho": 0.581
  },
  "wordGrainOnly": {
   "N": 296,
   "nPos": 106,
   "nNeg": 13
  }
 },
 "status": {
  "PRESENT+": "z >= 4 in both halves",
  "PRESENT-": "z <= -4 in both halves",
  "ABSENT": "|z| < 2 in both halves",
  "AMBIGUOUS": "anything else (uninformative: neither credit nor refutation)"
 },
 "siblings": [
  {
   "id": "ec-en-yonge",
   "loader": "loaders/_sibling-entcurv-en-yonge.mjs",
   "kind": "prose-novel",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.75,
   "vRange": [
    0.002,
    0.012
   ],
   "register": "novel",
   "language": "en",
   "tokens": 104137,
   "units": 5271,
   "docs": 53,
   "meanUnitLength": 19.76,
   "halfTokens": {
    "discover": 47537,
    "confirm": 56600
   },
   "thin": false,
   "scored": true,
   "contentSha256": "a60a5c84dc71d336fb01f2f2a1587b80b3da91a6b443142d4f1e96b76e3ac240",
   "why": "English novel, 104k tokens (halves 48k and 57k); atlas novels: 15 of 25 PRESENT+, 0 PRESENT-, 3 ABSENT; of the 17 atlas novels with >= 100k tokens 12 are PRESENT+ (71%), 3 AMBIGUOUS, 2 ABSENT, 0 PRESENT-; PRESENT+ novel v quartiles 0.0041-0.0069 (min 0.0019, max 0.0089)"
  },
  {
   "id": "ec-en-mouret",
   "loader": "loaders/_sibling-entcurv-en-mouret.mjs",
   "kind": "prose-novel",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.75,
   "vRange": [
    0.002,
    0.012
   ],
   "register": "novel",
   "language": "en",
   "tokens": 126434,
   "units": 7974,
   "docs": 80,
   "meanUnitLength": 15.86,
   "halfTokens": {
    "discover": 70982,
    "confirm": 55452
   },
   "thin": false,
   "scored": true,
   "contentSha256": "72b33276994ab88d3125bc80435baccb7d6212509f5bded112fc3c9aefcd7368",
   "why": "novel in English translation, 126k tokens (halves 71k and 55k); same atlas analogues as ec-en-yonge; atlas English translations of NON-fiction (ml-en-*) are mostly AMBIGUOUS, but those are treatises and histories, not novels; the atlas novels bk-crime-pun and bk-lesmis (translations) are PRESENT+, and so is ml-wap-en (War and Peace, register book)"
  },
  {
   "id": "ec-en-awakening",
   "loader": "loaders/_sibling-entcurv-en-awakening.mjs",
   "kind": "prose-novel",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.6,
   "vRange": [
    0.002,
    0.012
   ],
   "register": "novel",
   "language": "en",
   "tokens": 64499,
   "units": 4448,
   "docs": 44,
   "meanUnitLength": 14.5,
   "halfTokens": {
    "discover": 29443,
    "confirm": 35056
   },
   "thin": false,
   "scored": true,
   "contentSha256": "58ffb6e78f7500568ca56118b4db34bac10eb523e55d7dda3b29cf3a6b62b923",
   "why": "novel plus short stories, 64k tokens (halves 29k and 35k); atlas novels of 60-80k tokens: 3 of 5 PRESENT+ (bk-war-worlds, bk-tom-sawyer, bk-dorian-gray; bk-treasure-island and bk-frankenstein AMBIGUOUS)"
  },
  {
   "id": "ec-en-children",
   "loader": "loaders/_sibling-entcurv-en-children.mjs",
   "kind": "prose-children",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.55,
   "vRange": [
    0.004,
    0.02
   ],
   "register": "children",
   "language": "en",
   "tokens": 45786,
   "units": 3656,
   "docs": 37,
   "meanUnitLength": 12.52,
   "halfTokens": {
    "discover": 15912,
    "confirm": 29874
   },
   "thin": false,
   "scored": true,
   "contentSha256": "fc8acf1f66a1e5935b5334731f9d246fce2c22a556682214003fa00413922dea",
   "why": "two English children's books pooled, 46k tokens (halves 16k and 30k); atlas children: 7 of 17 PRESENT+, 10 AMBIGUOUS, 0 ABSENT, 0 PRESENT-; the PRESENT+ children pockets have v 0.006-0.019 and include 26-52k-token books (bk-alice, bk-looking-glass, bk-oz, bk-jungle-book); the 16k-token discover half is why the probability is only 0.55"
  },
  {
   "id": "ec-en-shakespeare",
   "loader": "loaders/_sibling-entcurv-en-shakespeare.mjs",
   "kind": "drama",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.8,
   "vRange": [
    0.003,
    0.02
   ],
   "register": "drama",
   "language": "en",
   "tokens": 299964,
   "units": 23608,
   "docs": 236,
   "meanUnitLength": 12.71,
   "halfTokens": {
    "discover": 128134,
    "confirm": 171830
   },
   "thin": false,
   "scored": true,
   "contentSha256": "af77eaf7660b5d6189075e5de4ce27516769e1b41735b66bec2c2475038efeaa",
   "why": "35 English verse plays, 300k tokens (halves 128k and 172k); atlas drama: 6 of 12 PRESENT+, 6 AMBIGUOUS, 0 ABSENT, 0 PRESENT-; the English verse atlas plays (Henry IV Part 1, 25k tokens) have v 0.005-0.010 with z 2-8; at 5-12x the tokens the same v gives |z| >> 4"
  },
  {
   "id": "ec-en-dolls-lysistrata",
   "loader": "loaders/_sibling-entcurv-en-dolls-lysistrata.mjs",
   "kind": "drama",
   "role": "strong",
   "expect": "PRESENT+",
   "probExpectHolds": 0.4,
   "vRange": [
    0.004,
    0.04
   ],
   "register": "drama",
   "language": "en",
   "tokens": 33985,
   "units": 3568,
   "docs": 36,
   "meanUnitLength": 9.52,
   "halfTokens": {
    "discover": 14931,
    "confirm": 19054
   },
   "thin": false,
   "scored": true,
   "contentSha256": "5388b59c4243f98f9d468c1a80e770388b7d594d1e40c513c8bc8065b107ef38",
   "why": "two English-language plays pooled, 34k tokens (halves 15k and 19k); atlas drama pockets of 20-47k tokens: PRESENT+ in 5 of 11 and never ABSENT or negative, but the three ENGLISH atlas plays (Henry IV Part 1 in two spellings, Faust in translation) are PRESENT+ in 1 of 3; the plan expected PRESENT+ in >= 1 of the 2 plays; pooled here, so one cell"
  },
  {
   "id": "ec-en-swisshelm",
   "loader": "loaders/_sibling-entcurv-en-swisshelm.mjs",
   "kind": "prose-memoir",
   "role": "weak",
   "expect": "PRESENT+",
   "probExpectHolds": 0.4,
   "vRange": [
    0.002,
    0.009
   ],
   "register": "memoir",
   "language": "en",
   "tokens": 99108,
   "units": 4515,
   "docs": 45,
   "meanUnitLength": 21.95,
   "halfTokens": {
    "discover": 49734,
    "confirm": 49374
   },
   "thin": false,
   "scored": true,
   "contentSha256": "6f2bd4bfe460d7717121b7bab0231743197d5d00127f500aafcb089989441c04",
   "why": "English memoir, 99k tokens; atlas memoir: 4 of 13 PRESENT+, 8 AMBIGUOUS, 1 ABSENT, 0 PRESENT-; sign check only (refuted only by PRESENT-)"
  },
  {
   "id": "ec-ud-lat-perseus",
   "loader": "loaders/_sibling-entcurv-ud-lat-perseus.mjs",
   "kind": "treebank",
   "role": "weak",
   "expect": "PRESENT+",
   "probExpectHolds": 0.15,
   "vRange": [
    0.005,
    0.04
   ],
   "register": "treebank",
   "language": "lat",
   "tokens": 21484,
   "units": 1987,
   "docs": 81,
   "meanUnitLength": 10.81,
   "halfTokens": {
    "discover": 10977,
    "confirm": 10507
   },
   "thin": false,
   "scored": true,
   "contentSha256": "5bf497e5ee0403164731b4ab92157489ecdab4eb6316b72d099d94941ba1474f",
   "why": "UD Latin-Perseus, 21.5k tokens (halves 11k and 10.5k); atlas treebanks: 7-8 of 34 PRESENT+ (20-24%, none PRESENT-, 12 ABSENT); the plan said 'PRESENT+ in 20-35%, none PRESENT- above 10%'; with halves of 11k tokens the probability that BOTH halves reach z >= 4 is low; sign check only (refuted only by PRESENT-)"
  },
  {
   "id": "ec-cd-js",
   "loader": "loaders/_sibling-entcurv-code.mjs",
   "kind": "code",
   "role": "strong",
   "expect": "PRESENT-",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.04,
    -0.006
   ],
   "register": "code",
   "language": "x-javascript",
   "tokens": 291206,
   "units": 35291,
   "docs": 194,
   "meanUnitLength": 8.25,
   "halfTokens": {
    "discover": 166552,
    "confirm": 124654
   },
   "thin": false,
   "scored": true,
   "contentSha256": "5bc0635bcb67ad783533b2eaf28d443024291397f0e89ec2ccbdca95d35ac079",
   "why": "JavaScript of 12 repositories, 291k tokens; atlas JavaScript pockets cd-cc-javascript (z -25.5 / -29.6, v -0.030 / -0.026) and cd-e09-eoapp-js (-25.6 / -16.1): PRESENT-; atlas code overall 28 of 47 PRESENT- (median v -0.016), 5 PRESENT+ (COBOL, PHP, SQL, Zig, ...)"
  },
  {
   "id": "ec-cd-ts",
   "loader": "loaders/_sibling-entcurv-code.mjs",
   "kind": "code",
   "role": "strong",
   "expect": "PRESENT-",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.04,
    -0.006
   ],
   "register": "code",
   "language": "x-typescript",
   "tokens": 291497,
   "units": 59295,
   "docs": 359,
   "meanUnitLength": 4.92,
   "halfTokens": {
    "discover": 126194,
    "confirm": 165303
   },
   "thin": false,
   "scored": true,
   "contentSha256": "a4272eb9b1361a3dd40eb8bbd088c8f89161f0fa5a5b9b29e6ab85a0e428a3b4",
   "why": "TypeScript of one third-party repository, 291k tokens; atlas cd-cc-typescript (-17.8 / -25.4, v -0.019 / -0.018) and cd-cc-tsx (-24.4 / -29.2): PRESENT-"
  },
  {
   "id": "ec-cd-py",
   "loader": "loaders/_sibling-entcurv-code.mjs",
   "kind": "code",
   "role": "explore",
   "expect": "PRESENT+",
   "probExpectHolds": 0.2,
   "vRange": [
    0,
    0.015
   ],
   "register": "code",
   "language": "x-python",
   "tokens": 147899,
   "units": 25528,
   "docs": 192,
   "meanUnitLength": 5.79,
   "halfTokens": {
    "discover": 70573,
    "confirm": 77326
   },
   "thin": false,
   "scored": false,
   "contentSha256": "54f6cfd5f8ad84966a76698621b754fe6d89282d4c6036d5ddbf60a24394a830",
   "why": "Python of 8 repositories, 148k tokens; the two atlas Python pockets (cd-cc-python z 3.2 / 1.2, v +0.0015 / +0.0010; cd-e09-python 3.0 / 3.9, v +0.0060 / +0.0107) are AMBIGUOUS with positive v, i.e. Python is on the PRESENT+ side of the code kind; EXPLORATORY: recorded and displayed, excluded from the pass rule (the law's code claim is tested by the JS and TS siblings)"
  },
  {
   "id": "ec-ctl-yonge",
   "loader": "loaders/_sibling-entcurv-ctl.mjs",
   "kind": "control",
   "role": "control",
   "expect": "ABSENT",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.004,
    0.004
   ],
   "register": "control",
   "language": "en",
   "tokens": 104137,
   "units": 5271,
   "docs": 53,
   "meanUnitLength": 19.76,
   "halfTokens": {
    "discover": 49667,
    "confirm": 54470
   },
   "thin": false,
   "scored": true,
   "contentSha256": "791c1dc8ba3d04b36842c52e99c1160d5f9263603f8a83a4f00fc4bb3c627dc3",
   "why": "token-global-shuffled copy of ec-en-yonge (law-free by construction); atlas controls (ct-*, 20 pockets, 2,913 half-cells): 0 PRESENT, all entCurv |z| < 3 in both halves of every control, nullMean within +-0.003"
  },
  {
   "id": "ec-ctl-js",
   "loader": "loaders/_sibling-entcurv-ctl.mjs",
   "kind": "control",
   "role": "control",
   "expect": "ABSENT",
   "probExpectHolds": 0.85,
   "vRange": [
    -0.004,
    0.004
   ],
   "register": "control",
   "language": "x-javascript",
   "tokens": 291206,
   "units": 35291,
   "docs": 194,
   "meanUnitLength": 8.25,
   "halfTokens": {
    "discover": 124956,
    "confirm": 166250
   },
   "thin": false,
   "scored": true,
   "contentSha256": "a14a979d96c056ea3c259b9eff4a46819b35aa63ec0eba08c3b921485e825e02",
   "why": "token-global-shuffled copy of ec-cd-js (law-free by construction); same atlas control evidence as ec-ctl-yonge"
  }
 ],
 "passRule": {
  "scoredSet": "siblings with scored=true: non-thin pockets (>= 20,000 tokens and >= 20 documents), roles strong, weak, control. Role explore is computed, displayed and labelled but excluded from every count below. Thin pockets (none expected) are computed and reported but never scored.",
  "perSibling": "role strong or control: CONFIRMED if status equals expect (PRESENT with the predicted sign; ABSENT for controls); REFUTED if status is PRESENT+, PRESENT- or ABSENT and differs from expect (wrong sign, ABSENT where PRESENT was predicted, PRESENT where ABSENT was predicted); UNINFORMATIVE if AMBIGUOUS. Role weak (sign check): CONFIRMED if status equals expect; REFUTED only if status is PRESENT with the OPPOSITE sign; otherwise UNINFORMATIVE (ABSENT and AMBIGUOUS both).",
  "REPLICATES": "zero REFUTED among scored siblings (strong, weak, control) AND >= 3 CONFIRMED PRESENT+ among the strong siblings AND >= 2 CONFIRMED PRESENT- among the strong siblings (the law is a REVERSAL: both signs must be seen in new pockets) AND no control PRESENT",
  "FAILS": "CONFIRMED = 0 among the non-control scored siblings (strong + weak), OR REFUTED >= CONFIRMED among them",
  "PARTIAL": "everything else; the report names, per kind (prose-novel, prose-memoir, prose-children, drama, treebank, code, control), whether it holds (>= 1 CONFIRMED and 0 REFUTED), is untested (all UNINFORMATIVE) or is refuted (>= 1 REFUTED)",
  "instrumentGuard": "a REFUTED control (PRESENT on a law-free shuffled copy) voids REPLICATES (the instrument is suspect) regardless of the other counts",
  "note": "AMBIGUOUS siblings are neither credit nor refutation (PROTOCOL cell status); the stated probabilities include the power loss of PRESENT needing |z| >= 4 in BOTH halves"
 },
 "secondary": {
  "planGroups": {
   "prose-novel": ">= 2 of the 3 scored novel siblings PRESENT+ (the plan: >= 50% of the misfiled English prose books PRESENT+) and none PRESENT-",
   "drama": ">= 1 of the 2 scored drama siblings PRESENT+ (the plan: >= 1 of A Doll's House and Lysistrata) and none PRESENT-",
   "treebank": "the one treebank sibling is not PRESENT- (the plan: PRESENT+ in 20-35%, none PRESENT- above 10%)",
   "code": ">= 50% of the code siblings scored under strong (JS, TS) PRESENT- (the plan: >= 50% of the new repository code pockets PRESENT-)",
   "control": "no control PRESENT"
  },
  "vRange": "per sibling, v = mean of the two halves' v; reported whether it lies inside vRange (atlas min..max of the PRESENT pockets of that register, widened to round numbers; controls |v| <= 0.004). Secondary: never changes the verdict",
  "draws50": "for every computed sibling, entCurv is recomputed through the same prep + posStats code with 50 null draws (draws k = 0..49 of the same seed rule; the first 10 are the pre-registered ones) and z50 = (v - mean50) / sd50 is reported per half; status50 is reported next to status. Secondary: the 10-draw z carries the sampling noise of a standard deviation estimated with 9 degrees of freedom; the verdict uses the 10-draw status only",
  "sizeCaveat": "halves of ec-en-children, ec-en-dolls-lysistrata, ec-ud-lat-perseus hold 10-30k tokens; the stated probabilities include that power loss"
 },
 "adversary": {
  "A_MillerMadow": "bias of the three-bin entropy estimator: recompute entCurv with the plug-in Shannon entropy (no (k-1)/(2n) Miller-Madow term; the same fractional thirds, rank bins and H(pooled) normalisation) on the same halves and the same 10 null draws; reported: v, nullMean, z, status. (selfcheck: the re-implementation WITH the correction must equal compute()'s entCurv to 1e-12.) SURVIVES if every scored non-control sibling that is PRESENT under Miller-Madow keeps the same PRESENT status and sign under the plug-in estimator",
  "A_lengthStrata": "unit length class: the units of >= 3 tokens of each half are cut into three strata by unit length with approximately equal token mass (thresholds L1 < L2 = the smallest unit lengths at which the cumulative token mass of units sorted by length reaches 1/3 and 2/3; strata: L <= L1, L1 < L <= L2, L > L2); entCurv is recomputed per stratum with its own within-unit null (10 draws, seed seedOf(id, half, 'order-len', stratum, k)); a stratum with < 2000 tokens or < 30 types in a half is 'too small'. SURVIVES if for every scored non-control sibling that is PRESENT, at least 2 of the 3 strata have v with the PRESENT sign in both halves and no stratum is PRESENT with the opposite sign (|z| >= 4 in both halves)",
  "A_unitLength": "baseline sign for a sibling = sign of the median v (mean of the two halves) over the 25 atlas pockets (groups other than ct and pl, non-thin, finite v) nearest in |ln mean unit length| (ties by id). Among scored non-control siblings with PRESENT status, SURVIVES if the pre-registered register prediction matches the observed sign in strictly more siblings than the unit-length baseline does",
  "A_rivalStatistics": "collinearity: order.rareCurve (atlas Spearman rho 0.581 with entCurv; in the atlas PRESENT+ entCurv pockets 83 of 126 have rareCurve PRESENT+ and 12 PRESENT-; PRESENT- entCurv pockets 49 of 53 have rareCurve PRESENT-) from the same compute() calls and draws. N_rival = number of scored non-control siblings where rareCurve is PRESENT with the SAME sign as the entCurv prediction of that sibling. SURVIVES (is distinguishable from the cheaper statistic) if the number of CONFIRMED PRESENT entCurv siblings among the strong and weak siblings is strictly larger than N_rival; otherwise the report says 'not distinguishable from rareCurve on these siblings'. Also reported: for every sibling the atlas-fitted prediction of v(entCurv) from v(rareCurve) (OLS over the non-planted, non-control atlas pockets, v = mean of halves) and the residual",
  "A_leakage": "8-token shingle scan of the text siblings against all .txt/.md files of the ethos trees 01, 02, 05, 06, 08, 11, 14, 15, 16, 18, 19, 20 (tokenised with the atlas tokeniser; a sibling's own source file, when it lies in ethos, is reported separately and is not a leak): PASS if no other file shares >= 0.5% of a sibling's shingles; code siblings: 0 files byte-identical (sha256) to any file of the atlas code corpus (/private/tmp/claude-501/code-corpus manifest, 27,421 files) or of ethos/09-source-code (PRE-CHECKED before this header: 0 of 745 files of ec-cd-js / ec-cd-ts / ec-cd-py). Near-duplicates (modified forks, other editions of the same text) are not detectable by sha256 and only partly by shingles",
  "A_multiplicity": "n = number of scored sibling cells; chance PRESENT per cell under the iid planted world is 8.49e-5 (law-table falsePresent.binomialReference.p; 0 PRESENT cells in 153 defined iid cells and 0 in 1,447 defined control cells); expected chance PRESENT cells over the scored siblings = n x 8.49e-5, reported with the observed count of PRESENT cells and the binomial P(X >= observed). Also recorded: the atlas PRESENT rule fires in 22,017 of 29,680 real atlas cells (74%), so PRESENT is not rare among real texts and a pocket-level PRESENT is weak evidence by itself; the evidence is the SIGN pattern across kinds"
 }
};
// ===== END OF PRE-REGISTRATION HEADER =====

// ===== CODE (below the pre-registered header; fixed before the sibling run, but its text is not covered by prereg.sha256) =====
// usage:  node confirm.mjs selfcheck [atlasPocketId]   re-derive an ATLAS pocket exactly as run-atlas.mjs does and compare with results/atlas/<id>.json (default bk-alice); also the re-implementations used by the adversaries
//         node confirm.mjs run [--pockets id1,id2]      compute every sibling (or the named ones) exactly as run-atlas.mjs -> pockets/<id>.json (resumable)
//         node confirm.mjs extras [--pockets id1,id2]   adversary computations (plug-in entropy, unit-length strata, 50 null draws) -> extras/<id>.json (resumable)
//         node confirm.mjs leak                         shingle scan of the text siblings against the ethos trees + sha256 identity of the code siblings -> leak.json
//         node confirm.mjs report                       classify, adversaries, verdict -> report.json (+ printed table)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf, sha256 } from "../../lib/pocket.mjs";
import * as ORDER from "../../laws/order.mjs";
import { prep } from "../../laws/_order_prep.mjs";
import { posStats } from "../../laws/_order_pos.mjs";
import { loadAll } from "./describe-siblings.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const argv = process.argv.slice(2), mode = argv[0] ?? "report";
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const POCKETS = process.env.ENTCURV_POCKETS_DIR || path.join(HERE, "pockets"), EXTRAS = path.join(HERE, "extras"), STATID = "order.entCurv", KIND = "within-unit", DRAWS = PREREG.draws;
const only = opt("--pockets", null)?.split(",");
const J = (f, o) => fs.writeFileSync(f, JSON.stringify(o));
const finite = Number.isFinite;

/** header integrity: sha256 of the file bytes up to and including the END marker line must equal prereg.sha256 */
function headerCheck() {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8"), mk = "// ===== END OF PRE-REGISTRATION HEADER =====\n";
  const head = src.slice(0, src.indexOf(mk) + mk.length), got = sha256(head), want = fs.readFileSync(path.join(HERE, "prereg.sha256"), "utf8").split(/\s+/)[0];
  return { got, want, ok: got === want };
}
const HC = headerCheck();
if (!HC.ok) { console.error(`PRE-REGISTRATION HEADER CHANGED: ${HC.got} != ${HC.want}; refusing to run`); process.exit(2); }

const meanSd = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** run-atlas.mjs cell: {v, nullMean, nullSd, z, n} from the observed value and the draws of one statistic */
const cell = (v, xsAll) => {
  const xs = xsAll.filter((x) => finite(x)), { m, sd } = xs.length >= 3 ? meanSd(xs) : { m: NaN, sd: NaN };
  return { v: finite(v) ? v : null, nullMean: finite(m) ? m : null, nullSd: finite(sd) ? sd : null, z: finite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
};
export const statusOf = (zd, zc) => zd == null || zc == null ? "NODATA" : zd >= 4 && zc >= 4 ? "PRESENT+" : zd <= -4 && zc <= -4 ? "PRESENT-" : Math.abs(zd) < 2 && Math.abs(zc) < 2 ? "ABSENT" : "AMBIGUOUS";

/** the whole family on one half, exactly as run-atlas.mjs does (compute on the real view and on each of DRAWS within-unit null draws, seeds seedOf(id, which, FAMILY, kind, k)) */
function familyHalf(id, which, view, draws = DRAWS) {
  const obs = ORDER.compute(view), dr = [];
  for (let k = 0; k < draws; k++) dr.push(ORDER.compute(nullView(view, KIND, seedOf(id, which, ORDER.FAMILY, KIND, k))));
  const out = {};
  for (const s of ORDER.STATS) out[`${ORDER.FAMILY}.${s.id}`] = cell(obs[s.id], dr.map((d) => d[s.id]));
  return out;
}

// ---------------------------------------------------------------- adversary re-implementations
/** entCurv with and without the Miller-Madow term, re-implementing the entSlope/entCurv part of laws/_order_pos.mjs posStats (same units >= 3, same fractional thirds, same guards). */
export function entVariants(view) {
  const P = prep(view);
  if (P.N < 2000 || P.V < 30) return null;
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
      if (t0 === t1) C[t0][b] += 1;
      else { const w0 = (t0 + 1 - s) * third; C[t0][b] += w0; C[t1][b] += 1 - w0; }
    }
    nTok += L; nU++;
  }
  if (nU < 300 || nTok < 2000) return null;
  const ent = (c, mm) => { let n = 0, k = 0; for (let b = 0; b < c.length; b++) if (c[b] > 0) { n += c[b]; k++; } if (n <= 0) return null; let h = 0; for (let b = 0; b < c.length; b++) if (c[b] > 0) h -= (c[b] / n) * Math.log(c[b] / n); return mm ? h + (k - 1) / (2 * n) : h; };
  const pool = new Float64Array(B); for (let b = 0; b < B; b++) pool[b] = C[0][b] + C[1][b] + C[2][b];
  const out = {};
  for (const [name, mm] of [["mm", true], ["plugin", false]]) {
    const H0 = ent(C[0], mm), H1 = ent(C[1], mm), H2 = ent(C[2], mm), Hp = ent(pool, mm);
    out[name] = H0 != null && H1 != null && H2 != null && Hp > 0 ? (H1 - (H0 + H2) / 2) / Hp : null;
  }
  return out;
}
/** three strata of the units >= 3 tokens by unit length with ~equal token mass (thresholds L1 <= L2); returns [{name, view}] */
export function lengthStrata(view) {
  const ix = []; let total = 0;
  view.units.forEach((u, k) => { if (u.length >= 3) { ix.push(k); total += u.length; } });
  const mass = new Map(); for (const k of ix) mass.set(view.units[k].length, (mass.get(view.units[k].length) || 0) + view.units[k].length);
  let cum = 0, L1 = null, L2 = null;
  for (const L of [...mass.keys()].sort((a, b) => a - b)) { cum += mass.get(L); if (L1 === null && cum >= total / 3) L1 = L; if (L2 === null && cum >= (2 * total) / 3) { L2 = L; break; } }
  const sel = (f) => { const u = [], d = []; for (const k of ix) if (f(view.units[k].length)) { u.push(view.units[k]); d.push(view.docOf[k]); } return { ...view, units: u, docOf: d }; };
  return { L1, L2, strata: [{ name: "short", view: sel((L) => L <= L1) }, { name: "mid", view: sel((L) => L > L1 && L <= L2) }, { name: "long", view: sel((L) => L > L2) }] };
}

// ---------------------------------------------------------------- selfcheck
async function selfcheck() {
  const id = argv[1] ?? "bk-alice", rows = [];
  const m = await import(pathToFileURL(path.join(ROOT, "loaders/books.mjs")).href), p = (await m.load([id])).find((x) => x.id === id);
  const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, "results/atlas", `${id}.json`), "utf8")), H = halves(p);
  let maxRel = 0, nCmp = 0, mmDiff = 0;
  for (const which of ["discover", "confirm"]) {
    const mine = familyHalf(id, which, H[which]);
    for (const [k, c] of Object.entries(mine)) {
      const a = atlas.halves[which][k];
      for (const f of ["v", "nullMean", "nullSd", "z"]) { if (c[f] == null && a[f] == null) continue; const d = Math.abs(c[f] - a[f]) / Math.max(1e-12, Math.abs(a[f])); maxRel = Math.max(maxRel, d); nCmp++; if (!(d < 1e-9)) rows.push(`${which} ${k} ${f}: ${c[f]} vs atlas ${a[f]}`); }
    }
    const ev = entVariants(H[which]); mmDiff = Math.max(mmDiff, Math.abs(ev.mm - ORDER.compute(H[which]).entCurv));
  }
  console.error(`selfcheck ${id}: ${nCmp} cells compared with results/atlas/${id}.json, max relative difference ${maxRel.toExponential(2)}, ${rows.length} mismatches; entVariants.mm vs compute().entCurv max abs diff ${mmDiff.toExponential(2)}`);
  rows.slice(0, 10).forEach((r) => console.error("  MISMATCH " + r));
  const ok = rows.length === 0 && mmDiff < 1e-12;
  // CoNLL-U reader with no filter must equal the atlas reader
  const { readConlluDocs } = await import(pathToFileURL(path.join(ROOT, "loaders/_sibling-entcurv-common.mjs")).href), { readConllu } = await import(pathToFileURL(path.join(ROOT, "loaders/_conllu.mjs")).href);
  const { interner } = await import(pathToFileURL(path.join(ROOT, "loaders/_ud_ml_common.mjs")).href);
  const f = "/private/tmp/claude-501/ud-eval/lav/dev.conllu", s1 = readConllu(f, interner(), { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, "words"), s2 = readConlluDocs(f, interner(), { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }).sents;
  const same = s1.length === s2.length && s1.every((s, k) => s.length === s2[k].length && s.every((w, i) => w === s2[k][i]));
  console.error(`selfcheck conllu reader: ${s1.length} sentences, identical to loaders/_conllu.mjs readConllu: ${same}`);
  console.error(ok && same ? "SELFCHECK PASS" : "SELFCHECK FAIL"); process.exit(ok && same ? 0 : 1);
}

// ---------------------------------------------------------------- run
async function run() {
  fs.mkdirSync(POCKETS, { recursive: true });
  const want = new Map(PREREG.siblings.map((s) => [s.id, s])), ids = only ?? [...want.keys()];
  for (const id of ids) {
    const file = path.join(POCKETS, `${id}.json`);
    if (fs.existsSync(file)) { console.error(`${id}: exists, skipped (resume)`); continue; }
    const t0 = Date.now(), p = (await loadAll([id])).find((x) => x.id === id); if (!p) throw new Error(`pocket ${id} not built`);
    const meta = validate(p), H = halves(p), pre = want.get(id), content = sha256(JSON.stringify({ units: p.units, docOf: p.docOf }));
    const res = { id, meta: { ...meta, group: p.group, register: p.register, language: p.language, script: p.script ?? null, meanUnitLength: +(meta.tokens / meta.units).toFixed(2) }, contentSha256: content, contentMatchesPrereg: content === pre.contentSha256, halves: {}, halfTokens: {}, errors: [] };
    for (const which of ["discover", "confirm"]) {
      res.halfTokens[which] = H[which].units.reduce((a, u) => a + u.length, 0);
      try { res.halves[which] = familyHalf(id, which, H[which]); } catch (e) { res.errors.push(`${which}: ${String(e.message).slice(0, 200)}`); }
    }
    res.seconds = (Date.now() - t0) / 1000; J(file, res);
    const c = res.halves.discover?.[STATID], d = res.halves.confirm?.[STATID];
    console.error(`${id}: ${meta.tokens} tokens, ${res.seconds.toFixed(1)} s, content matches prereg: ${res.contentMatchesPrereg}, entCurv z ${c?.z?.toFixed(2)} / ${d?.z?.toFixed(2)}, ${res.errors.length} errors`);
  }
}

// ---------------------------------------------------------------- extras: A_MillerMadow, A_lengthStrata, draws50
async function extras() {
  fs.mkdirSync(EXTRAS, { recursive: true });
  const ids = only ?? PREREG.siblings.map((s) => s.id);
  for (const id of ids) {
    const file = path.join(EXTRAS, `${id}.json`);
    if (fs.existsSync(file)) { console.error(`${id}: exists, skipped (resume)`); continue; }
    const t0 = Date.now(), p = (await loadAll([id])).find((x) => x.id === id), H = halves(p), res = { id, halves: {}, errors: [] };
    for (const which of ["discover", "confirm"]) {
      const view = H[which], seeds = (k) => seedOf(id, which, ORDER.FAMILY, KIND, k), out = {};
      try {
        // plug-in vs Miller-Madow on the pre-registered 10 draws, and Miller-Madow with 50 draws (draws k = 0..49: the first 10 are the pre-registered ones)
        const obs = entVariants(view), dr = []; for (let k = 0; k < 50; k++) dr.push(entVariants(nullView(view, KIND, seeds(k))));
        out.mm10 = cell(obs?.mm, dr.slice(0, 10).map((d) => d?.mm)); out.plugin10 = cell(obs?.plugin, dr.slice(0, 10).map((d) => d?.plugin));
        out.mm50 = cell(obs?.mm, dr.map((d) => d?.mm)); out.plugin50 = cell(obs?.plugin, dr.map((d) => d?.plugin));
        // unit-length strata (token-mass terciles of the units >= 3 tokens), own within-unit null per stratum
        const st = lengthStrata(view); out.strata = { L1: st.L1, L2: st.L2, parts: {} };
        for (const [si, s] of st.strata.entries()) {
          const tok = s.view.units.reduce((a, u) => a + u.length, 0), real = entVariants(s.view);
          const sd = []; for (let k = 0; k < DRAWS; k++) sd.push(entVariants(nullView(s.view, KIND, seedOf(id, which, "order-len", si, k)))?.mm);
          out.strata.parts[s.name] = { units: s.view.units.length, tokens: tok, ...cell(real?.mm, sd), tooSmall: !real };
        }
      } catch (e) { res.errors.push(`${which}: ${String(e.message).slice(0, 200)}`); }
      res.halves[which] = out;
    }
    res.seconds = (Date.now() - t0) / 1000; J(file, res); console.error(`${id}: extras done in ${res.seconds.toFixed(1)} s, ${res.errors.length} errors`);
  }
}

// ---------------------------------------------------------------- leak: A_leakage
const LEAK_TREES = ["01-literature-books", "02-encyclopedic", "05-academic-papers", "06-government-legal", "08-news-current", "11-multi-language", "14-holy-texts", "15-western-canon", "16-wordplay", "18-childrens-books", "19-organic-community", "20-first-person-voices"];
const ETHOS = "/Users/mlacy/Documents/3.0/ethos", TEXT_SIBS = ["ec-en-yonge", "ec-en-mouret", "ec-en-awakening", "ec-en-swisshelm", "ec-en-children", "ec-en-shakespeare", "ec-en-dolls-lysistrata", "ec-ud-lat-perseus"];
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
function shingleKeys(toks, K = 8, out = []) {          // 53-bit keys of every K-token window of toks (one unit or one file)
  const ht = new Uint32Array(toks.length); for (let i = 0; i < toks.length; i++) ht[i] = fnv(toks[i]);
  for (let i = 0; i + K <= toks.length; i++) {
    let h1 = 0x811c9dc5, h2 = 0x9e3779b1;
    for (let j = i; j < i + K; j++) { h1 = Math.imul(h1 ^ ht[j], 0x01000193); h2 = (Math.imul(h2 + ht[j], 0x85ebca6b) ^ (h2 >>> 13)) >>> 0; }
    out.push((h1 >>> 0) * 2097152 + (h2 >>> 11));
  }
  return out;
}
function walkTxt(dir, out = []) {
  let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es.sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = path.join(dir, e.name); if (e.isDirectory()) walkTxt(p, out); else if (e.isFile() && /\.(txt|md)$/i.test(e.name)) out.push(p); }
  return out;
}
async function leak() {
  const { tokenise } = await import(pathToFileURL(path.join(ROOT, "loaders/_bkcore.mjs")).href);
  const sib = new Map();   // key -> bitmask of text siblings
  const sizes = {}, own = {};
  for (const [bit, id] of TEXT_SIBS.entries()) {
    const p = (await loadAll([id])).find((x) => x.id === id), keys = new Set();
    for (const u of p.units) for (const k of shingleKeys(u)) keys.add(k);
    for (const k of keys) sib.set(k, (sib.get(k) || 0) | (1 << bit));
    sizes[id] = keys.size; own[id] = String(p.meta?.source ?? "");
  }
  const files = LEAK_TREES.flatMap((t) => walkTxt(path.join(ETHOS, t))), hits = Object.fromEntries(TEXT_SIBS.map((id) => [id, []]));
  let scanned = 0;
  for (const f of files) {
    let toks; try { toks = tokenise(fs.readFileSync(f, "utf8").normalize("NFC")); } catch { continue; }
    scanned++;
    const matched = TEXT_SIBS.map(() => new Set());
    for (const k of shingleKeys(toks)) { const m = sib.get(k); if (m) for (let b = 0; b < TEXT_SIBS.length; b++) if (m & (1 << b)) matched[b].add(k); }
    TEXT_SIBS.forEach((id, b) => { if (matched[b].size) hits[id].push({ file: path.relative(ETHOS, f), shared: matched[b].size, share: +(matched[b].size / sizes[id]).toFixed(5), isOwnSource: own[id].includes(f) }); });
  }
  for (const id of TEXT_SIBS) hits[id].sort((a, b) => b.share - a.share);
  const res = { treesScanned: LEAK_TREES, filesScanned: scanned, shingle: "8 consecutive tokens (atlas tokeniser), 53-bit hash", siblingShingles: sizes, flagged: {}, top: {} };
  for (const id of TEXT_SIBS) { res.flagged[id] = hits[id].filter((h) => h.share >= 0.005 && !h.isOwnSource); res.top[id] = hits[id].slice(0, 5); }
  // code siblings: byte identity with the atlas code corpus and ethos/09-source-code
  const { createHash } = await import("node:crypto"), sha = (b) => createHash("sha256").update(b).digest("hex"), set = new Set();
  const M = JSON.parse(fs.readFileSync("/private/tmp/claude-501/code-corpus/manifest.json", "utf8"));
  for (const L of Object.values(M.languages)) for (const s of ["train", "dev", "test"]) for (const f of L[s]) { try { set.add(sha(fs.readFileSync(f.path))); } catch {} }
  const w9 = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) w9(q); else if (e.isFile()) { try { set.add(sha(fs.readFileSync(q))); } catch {} } } }; w9(`${ETHOS}/09-source-code`);
  const snap = JSON.parse(fs.readFileSync(path.join(HERE, "code-snapshot.json"), "utf8")); res.code = { atlasHashes: set.size };
  for (const [id, list] of Object.entries(snap)) res.code[id] = { files: list.length, identicalToAtlasFile: list.filter(([f, h]) => set.has(h)).length, snapshotUnchanged: list.every(([f, h]) => { try { return sha(fs.readFileSync(f)) === h; } catch { return false; } }) };
  J(path.join(HERE, "leak.json"), res); console.error(`leak: ${scanned} files scanned; flagged ${JSON.stringify(Object.fromEntries(TEXT_SIBS.map((i) => [i, res.flagged[i].length])))}; code ${JSON.stringify(res.code)}`);
}

// ---------------------------------------------------------------- report: classification, adversaries, verdict (rules are PREREG.passRule / PREREG.secondary / PREREG.adversary)
const sgn = (st) => (st === "PRESENT+" ? 1 : st === "PRESENT-" ? -1 : 0);
function outcomeOf(sib, status) {
  if (sib.role === "weak" || sib.role === "explore") { if (status === sib.expect) return "CONFIRMED"; return status === (sib.expect === "PRESENT+" ? "PRESENT-" : "PRESENT+") ? "REFUTED" : "UNINFORMATIVE"; }
  if (status === sib.expect) return "CONFIRMED";
  return status === "AMBIGUOUS" || status === "NODATA" ? "UNINFORMATIVE" : "REFUTED";
}
const binomTail = (n, p, k) => { let s = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 1; j <= i; j++) c = (c * (n - i + j)) / j; s += c * p ** i * (1 - p) ** (n - i); } return s; };
const median = (a) => { const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
function atlasPockets() {
  const dir = path.join(ROOT, "results/atlas"), out = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) continue;
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); if (r.skipped || !r.halves?.discover || ["ct", "pl"].includes(r.meta.group)) continue;
    const e = [r.halves.discover[STATID], r.halves.confirm[STATID]], q = [r.halves.discover["order.rareCurve"], r.halves.confirm["order.rareCurve"]];
    if (!e.every((c) => finite(c?.v))) continue;
    out.push({ id: r.meta.id, mu: r.meta.tokens / r.meta.units, v: (e[0].v + e[1].v) / 2, vRare: q.every((c) => finite(c?.v)) ? (q[0].v + q[1].v) / 2 : null });
  }
  return out;
}
function report() {
  const A = atlasPockets(), rows = [];
  const ols = (() => { const xs = A.filter((a) => a.vRare != null), mx = xs.reduce((a, b) => a + b.vRare, 0) / xs.length, my = xs.reduce((a, b) => a + b.v, 0) / xs.length; let sxy = 0, sxx = 0; for (const a of xs) { sxy += (a.vRare - mx) * (a.v - my); sxx += (a.vRare - mx) ** 2; } const b = sxy / sxx, c = my - b * mx; let ss = 0; for (const a of xs) ss += (a.v - c - b * a.vRare) ** 2; return { n: xs.length, intercept: c, slope: b, residSd: Math.sqrt(ss / (xs.length - 2)) }; })();
  for (const sib of PREREG.siblings) {
    const R = JSON.parse(fs.readFileSync(path.join(POCKETS, `${sib.id}.json`), "utf8")), X = fs.existsSync(path.join(EXTRAS, `${sib.id}.json`)) ? JSON.parse(fs.readFileSync(path.join(EXTRAS, `${sib.id}.json`), "utf8")) : null;
    const d = R.halves.discover[STATID], c = R.halves.confirm[STATID], rd = R.halves.discover["order.rareCurve"], rc = R.halves.confirm["order.rareCurve"];
    const status = statusOf(d.z, c.z), out = outcomeOf(sib, status), vMean = (d.v + c.v) / 2;
    const row = { id: sib.id, kind: sib.kind, role: sib.role, scored: sib.scored, expect: sib.expect, probExpectHolds: sib.probExpectHolds, tokens: R.meta.tokens, halfTokens: R.halfTokens, status, outcome: out,
      entCurv: { discover: { v: d.v, z: d.z, nullMean: d.nullMean }, confirm: { v: c.v, z: c.z, nullMean: c.nullMean } }, vMean, vRange: sib.vRange, vInRange: vMean >= sib.vRange[0] && vMean <= sib.vRange[1], contentMatchesPrereg: R.contentMatchesPrereg,
      rival: { statId: "order.rareCurve", discover: { v: rd.v, z: rd.z }, confirm: { v: rc.v, z: rc.z }, status: statusOf(rd.z, rc.z) } };
    const vr = (rd.v + rc.v) / 2; row.rival.atlasFitPrediction = ols.intercept + ols.slope * vr; row.rival.residual = vMean - row.rival.atlasFitPrediction; row.rival.residualInAtlasSd = row.rival.residual / ols.residSd;
    if (X) {
      const g = (k) => ({ d: X.halves.discover[k], c: X.halves.confirm[k] }), st = (k) => statusOf(g(k).d.z, g(k).c.z);
      row.millerMadow = { mm10: { status: st("mm10"), z: [g("mm10").d.z, g("mm10").c.z], v: [g("mm10").d.v, g("mm10").c.v] }, plugin10: { status: st("plugin10"), z: [g("plugin10").d.z, g("plugin10").c.z], v: [g("plugin10").d.v, g("plugin10").c.v], nullMean: [g("plugin10").d.nullMean, g("plugin10").c.nullMean] }, plugin50: { status: st("plugin50") }, mmEqualsPrimary: Math.abs(g("mm10").d.v - d.v) < 1e-12 && Math.abs(g("mm10").d.z - d.z) < 1e-9 };
      row.draws50 = { status50: st("mm50"), z50: [g("mm50").d.z, g("mm50").c.z], nullSd50: [g("mm50").d.nullSd, g("mm50").c.nullSd], nullSd10: [d.nullSd, c.nullSd] };
      row.strata = {}; for (const nm of ["short", "mid", "long"]) { const a = X.halves.discover.strata.parts[nm], b = X.halves.confirm.strata.parts[nm]; row.strata[nm] = { tokens: [a.tokens, b.tokens], v: [a.v, b.v], z: [a.z, b.z], status: a.tooSmall || b.tooSmall ? "TOOSMALL" : statusOf(a.z, b.z), thresholds: [X.halves.discover.strata.L1, X.halves.discover.strata.L2, X.halves.confirm.strata.L1, X.halves.confirm.strata.L2] }; }
    }
    const near = A.map((a) => ({ ...a, dist: Math.abs(Math.log(a.mu) - Math.log(R.meta.meanUnitLength)) })).sort((a, b) => a.dist - b.dist || (a.id < b.id ? -1 : 1)).slice(0, 25);
    row.unitLengthBaseline = { medianV: median(near.map((a) => a.v)), sign: Math.sign(median(near.map((a) => a.v))), nearest: near.slice(0, 5).map((a) => a.id) };
    rows.push(row);
  }
  return finishReport(rows, ols);
}
function finishReport(rows, ols) {
  const P = PREREG, scored = rows.filter((r) => r.scored), strong = scored.filter((r) => r.role === "strong"), nonControl = scored.filter((r) => r.role !== "control"), controls = scored.filter((r) => r.role === "control");
  const n = (a, o) => a.filter((r) => r.outcome === o).length;
  const cPos = strong.filter((r) => r.outcome === "CONFIRMED" && r.expect === "PRESENT+").length, cNeg = strong.filter((r) => r.outcome === "CONFIRMED" && r.expect === "PRESENT-").length;
  const refuted = scored.filter((r) => r.outcome === "REFUTED"), controlRefuted = controls.filter((r) => r.outcome === "REFUTED");
  const replicates = refuted.length === 0 && cPos >= 3 && cNeg >= 2 && controlRefuted.length === 0;
  const fails = n(nonControl, "CONFIRMED") === 0 || n(nonControl, "REFUTED") >= n(nonControl, "CONFIRMED");
  const verdict = replicates ? "REPLICATES" : fails ? "FAILS" : "PARTIAL";
  const kinds = {}; for (const k of ["prose-novel", "prose-memoir", "prose-children", "drama", "treebank", "code", "control"]) { const rs = scored.filter((r) => r.kind === k); kinds[k] = { n: rs.length, confirmed: n(rs, "CONFIRMED"), refuted: n(rs, "REFUTED"), uninformative: n(rs, "UNINFORMATIVE"), state: !rs.length ? "none" : n(rs, "REFUTED") ? "refuted" : n(rs, "CONFIRMED") ? "holds" : "untested" }; }
  const by = (id) => rows.find((r) => r.id === id);
  const novels = scored.filter((r) => r.kind === "prose-novel"), dramas = scored.filter((r) => r.kind === "drama"), codeStrong = strong.filter((r) => r.kind === "code");
  const planGroups = { "prose-novel": novels.filter((r) => r.status === "PRESENT+").length >= 2 && !novels.some((r) => r.status === "PRESENT-"), drama: dramas.filter((r) => r.status === "PRESENT+").length >= 1 && !dramas.some((r) => r.status === "PRESENT-"),
    treebank: !scored.filter((r) => r.kind === "treebank").some((r) => r.status === "PRESENT-"), code: codeStrong.filter((r) => r.status === "PRESENT-").length / codeStrong.length >= 0.5, control: !controls.some((r) => r.status.startsWith("PRESENT")) };
  // adversaries (computed over scored non-control siblings that are PRESENT)
  const present = nonControl.filter((r) => r.status.startsWith("PRESENT")), sign = (r) => sgn(r.status);
  const A_MM = { presentSiblings: present.map((r) => r.id), perSibling: present.map((r) => ({ id: r.id, mm: r.millerMadow?.mm10.status, plugin: r.millerMadow?.plugin10.status, pluginNullMean: r.millerMadow?.plugin10.nullMean })), selfEquality: rows.every((r) => !r.millerMadow || r.millerMadow.mmEqualsPrimary) };
  A_MM.survives = present.every((r) => r.millerMadow?.plugin10.status === r.status);
  const A_LS = { perSibling: present.map((r) => { const parts = Object.entries(r.strata ?? {}).filter(([, s]) => s.status !== "TOOSMALL"), support = parts.filter(([, s]) => s.v.every((v) => Math.sign(v) === sign(r))).length, opposite = parts.filter(([, s]) => s.status === (sign(r) > 0 ? "PRESENT-" : "PRESENT+")).length; return { id: r.id, strata: Object.fromEntries(Object.entries(r.strata ?? {}).map(([k, s]) => [k, { status: s.status, v: s.v, z: s.z, tokens: s.tokens }])), supportingStrata: support, oppositePresentStrata: opposite, ok: support >= 2 && opposite === 0 }; }) };
  A_LS.survives = A_LS.perSibling.every((x) => x.ok);
  const regMatch = present.filter((r) => sign(r) === (r.expect === "PRESENT+" ? 1 : -1)).length, baseMatch = present.filter((r) => sign(r) === r.unitLengthBaseline.sign).length;
  const A_UL = { presentSiblings: present.length, registerPredictionMatches: regMatch, unitLengthBaselineMatches: baseMatch, survives: regMatch > baseMatch, perSibling: nonControl.map((r) => ({ id: r.id, status: r.status, meanUnitLength: r.unitLengthBaseline && by(r.id) ? undefined : undefined, baselineSign: r.unitLengthBaseline.sign, baselineMedianV: r.unitLengthBaseline.medianV, nearest: r.unitLengthBaseline.nearest })) };
  const nRival = nonControl.filter((r) => r.rival.status === (r.expect === "PRESENT+" ? "PRESENT+" : "PRESENT-")).length, confirmedNC = n(nonControl, "CONFIRMED");
  const A_RV = { rival: "order.rareCurve", nRival, confirmedEntCurv: confirmedNC, survives: confirmedNC > nRival, atlasFit: ols, rivalPresentSameSign: nonControl.filter((r) => r.rival.status === (r.expect === "PRESENT+" ? "PRESENT+" : "PRESENT-")).map((r) => r.id),
    entCurvConfirmedRivalNot: nonControl.filter((r) => r.outcome === "CONFIRMED" && r.rival.status !== r.expect).map((r) => r.id), rivalPresentEntCurvNot: nonControl.filter((r) => r.outcome !== "CONFIRMED" && r.rival.status === (r.expect === "PRESENT+" ? "PRESENT+" : "PRESENT-")).map((r) => r.id) };
  const pBin = P.adversary ? 0.00008488153720463878 : 0, nCells = scored.length, nPres = scored.filter((r) => r.status.startsWith("PRESENT")).length;
  const A_MU = { scoredCells: nCells, chancePerCell: pBin, expectedChancePresentCells: nCells * pBin, observedPresentCells: nPres, binomialTail: binomTail(nCells, pBin, nPres) };
  const leakFile = path.join(HERE, "leak.json"), A_LK = fs.existsSync(leakFile) ? (() => { const L = JSON.parse(fs.readFileSync(leakFile, "utf8")); return { filesScanned: L.filesScanned, flaggedTextSiblings: Object.fromEntries(Object.entries(L.flagged).map(([k, v]) => [k, v.length])), top: L.top, code: L.code, pass: Object.values(L.flagged).every((v) => !v.length) && Object.entries(L.code).filter(([k]) => k.startsWith("ec-")).every(([, v]) => v.identicalToAtlasFile === 0) }; })() : null;
  const out = { law: P.law, headerSha256: HC.got, headerMatchesPrereg: HC.ok, verdict, counts: { scored: scored.length, strong: strong.length, confirmed: n(scored, "CONFIRMED"), refuted: n(scored, "REFUTED"), uninformative: n(scored, "UNINFORMATIVE"), confirmedPresentPlusStrong: cPos, confirmedPresentMinusStrong: cNeg, controlRefuted: controlRefuted.length }, kinds, planGroups,
    refuted: refuted.map((r) => `${r.id}: expected ${r.expect}, got ${r.status}`), adversary: { A_MillerMadow: A_MM, A_lengthStrata: A_LS, A_unitLength: A_UL, A_rivalStatistics: A_RV, A_leakage: A_LK, A_multiplicity: A_MU }, rows };
  out.notes = [
    "A_lengthStrata: 'TOOSMALL' also covers a stratum with < 300 units in a half, because entVariants applies the family's own posStats guard (nU >= 300, nTok >= 2000, V >= 30); the registered text named only the token and type minima. Strata marked TOOSMALL are left out of the supporting count.",
    "A_lengthStrata (descriptive): the sign agrees across strata but the MAGNITUDE sits in the short and mid units for the three novels (short and mid strata positive in both halves; the long stratum ABSENT for mouret and too small for yonge and awakening, where its confirm-half v is -0.0003 and -0.0023) and for ec-cd-js (short stratum z -29 / -11, mid and long ABSENT); ec-en-shakespeare is PRESENT+ in all three strata.",
    "draws50 is secondary: ec-en-dolls-lysistrata would be PRESENT+ (z50 6.7 / 4.1) and ec-en-swisshelm stays just below the threshold (z50 4.00 / 4.32, status AMBIGUOUS) with 50 null draws; the verdict uses the pre-registered 10-draw statuses.",
    "POST HOC (not pre-registered): posthoc-ts.mjs / posthoc-ts.json explain the TS discordance (halves z -30.1 and +4.3): the pocket holds 30 i18n translation files (104k of 291k tokens) with entCurv +0.036 (z 55) next to 329 other files with entCurv -0.016 (z -29); the i18n files are 25% of the tokens of the discover half and 44% of the confirm half. The non-i18n part is negative in both halves (z -27.5 / -13.5). Excluding i18n after seeing this is post hoc and does not change the verdict.",
    "ec-cd-py is role explore: displayed and labelled, excluded from every count."
  ];
  J(path.join(HERE, "report.json"), out);
  const f = (x, d = 1) => (x == null ? "  -  " : x.toFixed(d));
  console.log(`VERDICT ${verdict}  (header sha256 ${HC.got.slice(0, 12)} ${HC.ok ? "matches" : "DOES NOT MATCH"} prereg.sha256)`);
  console.log("id".padEnd(24) + "role".padEnd(8) + "expect".padEnd(9) + "status".padEnd(10) + "outcome".padEnd(14) + "z(d)".padStart(7) + "z(c)".padStart(7) + "  v(d)     v(c)    vInRange  z50(d/c)   plugin    rareCurve");
  for (const r of rows) console.log(r.id.padEnd(24) + r.role.padEnd(8) + r.expect.padEnd(9) + r.status.padEnd(10) + r.outcome.padEnd(14) + f(r.entCurv.discover.z).padStart(7) + f(r.entCurv.confirm.z).padStart(7) + "  " + f(r.entCurv.discover.v, 4).padStart(7) + " " + f(r.entCurv.confirm.v, 4).padStart(7) + "  " + String(r.vInRange).padEnd(7) + "  " + `${f(r.draws50?.z50[0])}/${f(r.draws50?.z50[1])}`.padEnd(10) + (r.millerMadow?.plugin10.status ?? "-").padEnd(10) + r.rival.status);
  console.log(JSON.stringify({ counts: out.counts, kinds, planGroups, A_MM: { survives: A_MM.survives }, A_LS: { survives: A_LS.survives }, A_UL: { survives: A_UL.survives, regMatch, baseMatch }, A_RV: { survives: A_RV.survives, nRival, confirmedNC }, A_MU, leak: A_LK && A_LK.pass }));
}

// ---------------------------------------------------------------- dispatch
if (mode === "selfcheck") await selfcheck();
else if (mode === "run") await run();
else if (mode === "extras") await extras();
else if (mode === "leak") await leak();
else if (mode === "report") report();
else console.error("unknown mode " + mode);
