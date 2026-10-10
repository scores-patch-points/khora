// results/confirm-order.rareCurve/confirm.mjs — SIBLING REPLICATION of the atlas law order.rareCurve ("where rare words sit inside a unit": U-shape, rare words at the unit's edges, in natural language; inverted U, rare words in the middle, in code).
// ===== PRE-REGISTRATION HEADER (written 2026-10-07 before ANY order-family statistic was computed on ANY sibling pocket or sibling control of this file; the sha256 of every byte of this file from the first byte through the END marker line inclusive is in prereg.sha256) =====
//
// DISCLOSURE (what I have seen before writing this header)
//  SEEN: (1) PROTOCOL.md (sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc), lib/pocket.mjs, run-atlas.mjs, laws/order.mjs, laws/_order_prep.mjs, laws/_order_pos.mjs: the definition and code of order.rareCurve and of the other ten order statistics.
//    (2) results/law-table.json, the order.rareCurve entry: N 390, nPos 174, nNeg 81, nAbs 33, nAmb 102, byGroup / byRegister / byScript / byGrain tallies, presentV quantiles (median 0.0299, IQR -0.037..0.059, heterogeneity 1.806), the list of the 33 ABSENT pockets, g1 rho(tokens)
//    -0.348 (not sizeConfounded), the sharedProperty and sign-split rows.  (3) results/atlas/*.json for order.rareCurve ONLY, i.e. v, null sd and z in both halves of ATLAS pockets. I printed: every English "bk" pocket (tokens, v, null sd, z, status), all 34 UD pockets, all code pockets
//    by language, the Latin / Greek / Hebrew / Arabic rows, the drama rows, the status counts by size bucket, the ABSENT share by register and by language, and Q10..Q90 of v among PRESENT pockets by class. The predictions below are therefore NOT blind to the ATLAS (they are read off it by kind);
//    they are blind to the SIBLINGS.  (4) I ran order.compute once on ONE atlas pocket (bk-great-expect, discover half) to time it; v equals the atlas value to the last digit (0.021356128216246054).
//    (5) Conventions and material: I read other agents' sibling loaders (_sibling-common, _sibling-en, _sibling-ud, _sibling-js, _sibling-py, _sibling-entcurv-*, _sibling-ent-en-early-plays) and the header blocks of results/confirm-comp.asym/confirm.mjs and results/confirm-order.entSlope/confirm.mjs, and printed
//    the token / unit / document counts of the _sibling-en pockets. The ORDER family has been computed on other agents' sibling pockets and the outputs exist under results/confirm-*/ (pockets/, siblings*/, report.json). I OPENED NONE OF THEM (I listed directory names only); my pockets are built by my own loaders
//    (_sibling-rc-*.mjs) and several of the texts are the same texts that other agents used, so a reader who opens those files would learn something about my siblings; I did not.
//  NOT SEEN: any order-family statistic (any statistic, either half, any null draw) of any pocket built by the sib-rc loaders or of any sibling control. For the siblings I looked only at descriptive facts: token / unit / document / vocabulary counts, half sizes, the first and last unit and the commonest
//    unit-initial and unit-final tokens of the English pockets (to check that speaker labels and front matter were removed), and file / token counts of the code pockets. Cleaning rules (cuts, label removal, directory exclusions) were fixed from reading raw files and trees, before and without any statistic.
//    One loader bug found and fixed before any statistic: the first build of sib-rc-py-authored included khora/native, into which other agents write .py files, so two builds differed; khora/ and the eoreader7 trees were removed from its roots and two consecutive builds of all 23 pockets are now byte-identical
//    (the sha256 of units + document index of each pocket is in PREREG.siblings[].fp; confirm.mjs refuses to run on a pocket whose fingerprint differs).
//  DEVIATIONS FROM THE SIBLING PLAN (stated, not hidden): (1) The plan names 'misfiled English prose and drama books'. Misfiled prose: Zola (Abbe Mouret), Poe (tales II) + Chopin, Squier (Waikna) + Ritchie (About London) are used; Swisshelm (Half a Century) comes from the eoPriors global_south_corpus, not misfiled. The misfiled PLAYS are all under
//    the 20,000-token floor (A Doll's House, Lysistrata, Greene), so the drama siblings are two disjoint sets of Shakespeare plays from the eochat vendor copy of Gutenberg #100 (ten tragedies; eighteen comedies, romances and problem plays; the histories and Henry IV Part 1 left out; the atlas holds only Henry IV Part 1).
//    (2) UD TRAIN splits come from /private/tmp/claude-501/tb/<stem>/train.conllu (the atlas read dev+test of ud-eval). Seven plus-side stems are languages WITHOUT an atlas pocket (the atlas dropped them as thin): ces ita nld rus dan gle hye. Three more train splits (cmn jpn urd) are the larger train files of stems whose atlas dev+test pockets are ABSENT (see 4).
//    (3) Minus-side siblings are the user's own JavaScript (three pockets from different repositories, none of them the-fold / heimdall / eoreader7 that other agents used) and an open-source fork's TypeScript and TSX (opencode-fold); all are English-commented code, whereas the atlas cd-cc-* are GitHub files.
//    (4) 'At least one sibling of the kind where the law is ABSENT': the atlas has NO natural kind in which the law is mostly ABSENT (highest ABSENT share with n >= 3: speech 1/3, essay 1/3, Latin treatise 2/6; code 2/47; the 33 ABSENT pockets are spread over 16 registers). I register two ABSENT-side kinds, both LOW confidence and stated as such:
//    PYTHON code (cd-cc-python, 291k tokens, is ABSENT with v -0.004/-0.003 and is the only ABSENT among the 51 cd-cc pockets, 38 of which are PRESENT-; cd-e09-python 39k tokens has v +0.008/-0.017), and the UD treebanks cmn / jpn / urd whose atlas dev+test pockets (20-28k tokens) are ABSENT: their train splits are about 4-7 times larger, so the test is whether that
//    absence is real or only low power. Under the claim as worded (natural language is +) the cmn / jpn / urd siblings would be PRESENT+; I register ABSENT because it is the atlas's observation for those stems, and say so.
//  KNOWN LIMITS OF THE ATLAS THE LAW COMES FROM: the atlas blind PREDICT for order.rareCurve was 'universal-' and the sign was wrong in natural language (the atlas reversed it); z uses 10 null draws (sd estimated with 9 degrees of freedom); the claim's sign-split is by register, which in the atlas is confounded with language, size and script (code is all Latin-script word-grain
//    with identifier tokens, scripture is partly non-Latin, treebanks are sentences of many languages). POWER: in the atlas, English prose pockets of >= 100k tokens are PRESENT+ in 23 of 28, those of 60-100k tokens in 4 of 14 and those under 60k in 5 of 17 (the effect is small, v about +0.025, null sd about 0.003-0.007 per half), so a PRESENT+ prediction for a
//    prose sibling under about 130k tokens is a power-limited prediction (stated per sibling below). UD pockets: PRESENT+ 3/4 above 60k tokens, 11/15 at 30-60k, 6/15 under 30k (v is larger, about +0.06).
//  INDEPENDENCE: all prose siblings are English (so the English part of the claim, not its language reach, is tested); the UD siblings add ten languages; the two Shakespeare pockets share an author, the three JS pockets one author, the TS and TSX pockets one fork, the two Python pockets two different sources; the three UD ABSENT-side siblings are other documents of treebanks that
//    already have atlas pockets. The siblings are new DOCUMENTS of the atlas kinds (plus seven new UD languages), not a new universe of kinds.
//
// ATLAS CLAIM UNDER TEST (as handed to me): 'Rare words sit at the edges of units (U shape, positive) in chat 18/20, academic 12/12, novel 13/25, dialect 10/13, drama 9/12, children 9/17, translation 8/9, poetry 8/13, treebank 20/34, and in the middle (negative) in code 38/47,
//   scripture 10/26, markup 3/5, notation 7/16, legal 8/31. The sign is a natural-language versus code/liturgical contrast.'  Verified against results/law-table.json: N 390, nPos 174, nNeg 81, nAbs 33, nAmb 102 (REVERSAL); the register tallies above match byRegister.
//
// HOW THE STATISTIC AND ITS NULL ARE COMPUTED (identical to run-atlas.mjs; checked below against three atlas pockets): per pocket, halves(p) by sha256(id:doc) parity; per half the 'order' family compute(view) once on the real view and once on each of 10 nullView(view,'within-unit',seed) draws with
//   seed = seedOf(p.id, half, 'order', 'within-unit', k), k = 0..9; v = observed value of rareCurve, nullMean / nullSd over the finite draws, z = (v - nullMean) / nullSd.  STATUS per PROTOCOL: PRESENT(+/-) = |z| >= 4 in BOTH halves with the same sign; ABSENT = |z| < 2 in both halves; AMBIGUOUS = anything else.
//
// The blind predictions, the pass rule and the adversaries are the data object PREREG below (single source of truth: the code under the END marker reads it).
export const PREREG = {
 "law": "order.rareCurve",
 "family": "order",
 "statId": "rareCurve",
 "statement": "pooled within-unit correlation of x = ln mid-rank of the token's type (within-view frequency rank, ties share the average rank, 1 = commonest) with the centred quadratic (i/(L-1)-1/2)^2, units >= 3 tokens; > 0 rare words at both edges of a unit (U), < 0 rare words in the middle (inverted U); null: within-unit shuffle",
 "protocolSha256": "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc",
 "draws": 10,
 "diagnosticDraws": 200,
 "bootstrapResamples": 200,
 "atlas": {
  "N": 390,
  "nPos": 174,
  "nNeg": 81,
  "nAbs": 33,
  "nAmb": 102,
  "status": "REVERSAL",
  "heterogeneity": 1.806,
  "presentVMedian": 0.029888,
  "g1": {
   "rhoTokens": -0.348,
   "rhoUnitLength": 0.0896
  },
  "rivalRhos": {
   "order.surprGrow": -0.62,
   "order.entCurv": 0.58
  }
 },
 "siblings": [
  {
   "id": "sib-rc-en-mouret",
   "side": "plus",
   "kind": "English novel",
   "prediction": "PRESENT+",
   "confidence": "moderate (halves 66k/62k tokens: atlas English prose 60-100k tokens is PRESENT+ in 4 of 14, >= 100k in 23 of 28)",
   "vRange": [
    0.015,
    0.045
   ],
   "absVMax": null,
   "note": "Zola, Abbe Mouret's Transgression (English), 128k tokens",
   "tokens": 128496,
   "units": 8046,
   "docs": 80,
   "types": 9965,
   "halfTokens": [
    66453,
    62043
   ],
   "fp": "846375da60e0e624e6f39eed8096ed6f42a35f7d8119871a85a74c4341cef016"
  },
  {
   "id": "sib-rc-en-poe-chopin",
   "side": "plus",
   "kind": "English novel / tales",
   "prediction": "PRESENT+",
   "confidence": "moderate-high (halves 74k/87k tokens)",
   "vRange": [
    0.015,
    0.045
   ],
   "absVMax": null,
   "note": "Poe tales II + Chopin, pooled, 161k tokens",
   "tokens": 161055,
   "units": 8639,
   "docs": 86,
   "types": 13241,
   "halfTokens": [
    74244,
    86811
   ],
   "fp": "6cdeec6dab4d3b08b158290316cf456f3572487fccefc0423c75b8f248b7b1de"
  },
  {
   "id": "sib-rc-en-halfcentury",
   "side": "plus",
   "kind": "English memoir",
   "prediction": "PRESENT+",
   "confidence": "moderate (smaller half 40k tokens: power-limited)",
   "vRange": [
    0.015,
    0.045
   ],
   "absVMax": null,
   "note": "Swisshelm, Half a Century, 99k tokens",
   "tokens": 99108,
   "units": 4515,
   "docs": 45,
   "types": 9039,
   "halfTokens": [
    39732,
    59376
   ],
   "fp": "cd348acf8c6a437feb520e02a9e4e2c7cfdc83a9342a2df6e5391007bc32acfe"
  },
  {
   "id": "sib-rc-en-travel",
   "side": "plus",
   "kind": "English reportage",
   "prediction": "PRESENT+",
   "confidence": "moderate (halves 71k/69k tokens; atlas reportage 3 of 4 PRESENT+ but small v 0.017-0.023)",
   "vRange": [
    0.015,
    0.045
   ],
   "absVMax": null,
   "note": "Squier Waikna + Ritchie About London, pooled, 139k tokens",
   "tokens": 139095,
   "units": 5512,
   "docs": 55,
   "types": 13194,
   "halfTokens": [
    70532,
    68563
   ],
   "fp": "db36b55b74622abb7c90893323eb150992d20bffb030e9cd6d12988e9ccee9c9"
  },
  {
   "id": "sib-rc-en-shake-trag",
   "side": "plus",
   "kind": "English verse drama",
   "prediction": "PRESENT+",
   "confidence": "high (halves 102k/127k tokens; atlas drama v 0.05-0.13 and 9 of 12 PRESENT+, the 3 failures being 25k-token English Henry IV pockets)",
   "vRange": [
    0.045,
    0.13
   ],
   "absVMax": null,
   "note": "Shakespeare, ten tragedies, 229k tokens",
   "tokens": 229365,
   "units": 19614,
   "docs": 196,
   "types": 14155,
   "halfTokens": [
    102380,
    126985
   ],
   "fp": "d9f6e55f7c82d1db0403877c36b5bafdc0e2836baaaad2f71eb20f47c5a26dea"
  },
  {
   "id": "sib-rc-en-shake-com",
   "side": "plus",
   "kind": "English verse drama",
   "prediction": "PRESENT+",
   "confidence": "high (halves 150k/150k tokens)",
   "vRange": [
    0.045,
    0.13
   ],
   "absVMax": null,
   "note": "Shakespeare, eighteen comedies/romances/problem plays, 300k tokens",
   "tokens": 299793,
   "units": 24236,
   "docs": 242,
   "types": 15940,
   "halfTokens": [
    149990,
    149803
   ],
   "fp": "6f49047e130d528e986b4f91731a1de808f26cad93d72a8ce743f952c43f6691"
  },
  {
   "id": "sib-rc-ud-ces-train",
   "side": "plus",
   "kind": "UD treebank train split (new language)",
   "prediction": "PRESENT+",
   "confidence": "high (halves 153k/147k)",
   "vRange": [
    0.04,
    0.085
   ],
   "absVMax": null,
   "note": "UD Czech train split",
   "tokens": 299987,
   "units": 17528,
   "docs": 702,
   "types": 51129,
   "halfTokens": [
    152790,
    147197
   ],
   "fp": "c27bd3ad7c6c5748f8ff9549c6ee51799614c60869b70d0fe086c8e9edad88b4"
  },
  {
   "id": "sib-rc-ud-ita-train",
   "side": "plus",
   "kind": "UD treebank train split (new language)",
   "prediction": "PRESENT+",
   "confidence": "high (halves 125k/116k)",
   "vRange": [
    0.04,
    0.085
   ],
   "absVMax": null,
   "note": "UD Italian train split",
   "tokens": 240871,
   "units": 13060,
   "docs": 523,
   "types": 25225,
   "halfTokens": [
    124945,
    115926
   ],
   "fp": "c102b1a56c6719dfcf428cd97deaa030bdd86a25734af9d899998d54819572bc"
  },
  {
   "id": "sib-rc-ud-nld-train",
   "side": "plus",
   "kind": "UD treebank train split (new language)",
   "prediction": "PRESENT+",
   "confidence": "high (halves 79k/85k)",
   "vRange": [
    0.04,
    0.085
   ],
   "absVMax": null,
   "note": "UD Dutch train split",
   "tokens": 163958,
   "units": 12277,
   "docs": 492,
   "types": 24377,
   "halfTokens": [
    78936,
    85022
   ],
   "fp": "6162c97d7c0a4f0649e6dc8162ce12b8ffab5f6abe544b9dcb9945805cee5c4a"
  },
  {
   "id": "sib-rc-ud-rus-train",
   "side": "plus",
   "kind": "UD treebank train split (new language)",
   "prediction": "PRESENT+",
   "confidence": "moderate (halves 33k/25k tokens: power-limited)",
   "vRange": [
    0.04,
    0.085
   ],
   "absVMax": null,
   "note": "UD Russian train split",
   "tokens": 58306,
   "units": 3850,
   "docs": 154,
   "types": 23666,
   "halfTokens": [
    33392,
    24914
   ],
   "fp": "369cbb6dc027e8683c14e013017fb51c42e496d74944b09fbf502f6eeac6ec75"
  },
  {
   "id": "sib-rc-ud-dan-train",
   "side": "plus",
   "kind": "UD treebank train split (new language)",
   "prediction": "PRESENT+",
   "confidence": "moderate (halves 34k/34k tokens)",
   "vRange": [
    0.04,
    0.085
   ],
   "absVMax": null,
   "note": "UD Danish train split",
   "tokens": 68296,
   "units": 4369,
   "docs": 175,
   "types": 14910,
   "halfTokens": [
    34052,
    34244
   ],
   "fp": "dcd7a22cf7fe9ff8352e2d50e33422ca807cc01f7f3f324be44b1fef64cfefb3"
  },
  {
   "id": "sib-rc-ud-gle-train",
   "side": "plus",
   "kind": "UD treebank train split (new language)",
   "prediction": "PRESENT+",
   "confidence": "moderate (halves 53k/33k; VSO language)",
   "vRange": [
    0.04,
    0.085
   ],
   "absVMax": null,
   "note": "UD Irish train split",
   "tokens": 85922,
   "units": 3997,
   "docs": 160,
   "types": 12364,
   "halfTokens": [
    53025,
    32897
   ],
   "fp": "0869476cc1a5c010f3fd9dfc6a7d40b5624c80138e0421d0f5abd423356c1528"
  },
  {
   "id": "sib-rc-ud-hye-train",
   "side": "plus",
   "kind": "UD treebank train split (new language)",
   "prediction": "PRESENT+",
   "confidence": "moderate-low (halves 29k/36k; head-final language: the atlas head-final treebanks are mixed, hin and kor PRESENT-, jpn and urd ABSENT, eus fas fin est lav PRESENT+)",
   "vRange": [
    0.04,
    0.085
   ],
   "absVMax": null,
   "note": "UD Armenian train split",
   "tokens": 65187,
   "units": 4352,
   "docs": 175,
   "types": 18538,
   "halfTokens": [
    29206,
    35981
   ],
   "fp": "63e8dd39305dda77464c21253659e43ca2ab1f504d644550f309f119fbb2cde2"
  },
  {
   "id": "sib-rc-js-holodeck",
   "side": "minus",
   "kind": "repository code",
   "prediction": "PRESENT-",
   "confidence": "high (atlas JS/TS/TSX: 4 of 4 PRESENT-, v -0.14 to -0.21; all code 38 of 47)",
   "vRange": [
    -0.175,
    -0.035
   ],
   "absVMax": null,
   "note": "JavaScript, holodeck + holodeck-proxy + janus",
   "tokens": 182508,
   "units": 18036,
   "docs": 92,
   "types": 10686,
   "halfTokens": [
    103539,
    78969
   ],
   "fp": "68fd254c200396fd8269cc97e754433eb37c85d77cca58ca260e81c04b9502c6"
  },
  {
   "id": "sib-rc-js-eochat",
   "side": "minus",
   "kind": "repository code",
   "prediction": "PRESENT-",
   "confidence": "high (atlas JS/TS/TSX: 4 of 4 PRESENT-, v -0.14 to -0.21; all code 38 of 47)",
   "vRange": [
    -0.175,
    -0.035
   ],
   "absVMax": null,
   "note": "JavaScript, eochat server/ui/scripts/eval",
   "tokens": 293254,
   "units": 38933,
   "docs": 172,
   "types": 13598,
   "halfTokens": [
    164570,
    128684
   ],
   "fp": "ea033797eafbcdc909b1a4cd1395f3c4395fbaa59eae05d7193277f8f3301fc7"
  },
  {
   "id": "sib-rc-js-eopm",
   "side": "minus",
   "kind": "repository code",
   "prediction": "PRESENT-",
   "confidence": "high (atlas JS/TS/TSX: 4 of 4 PRESENT-, v -0.14 to -0.21; all code 38 of 47)",
   "vRange": [
    -0.175,
    -0.035
   ],
   "absVMax": null,
   "note": "JavaScript, eopm/src + ab + penelope",
   "tokens": 164318,
   "units": 21063,
   "docs": 111,
   "types": 8545,
   "halfTokens": [
    85274,
    79044
   ],
   "fp": "40e87ba1fc9ed85551f3a04b3b7dbeea9078ee70a139cb887d6c7ae3916035a7"
  },
  {
   "id": "sib-rc-ts-opencode",
   "side": "minus",
   "kind": "repository code",
   "prediction": "PRESENT-",
   "confidence": "high (atlas JS/TS/TSX: 4 of 4 PRESENT-, v -0.14 to -0.21; all code 38 of 47)",
   "vRange": [
    -0.175,
    -0.035
   ],
   "absVMax": null,
   "note": "TypeScript, opencode-fold packages",
   "tokens": 291318,
   "units": 60348,
   "docs": 457,
   "types": 10784,
   "halfTokens": [
    144852,
    146466
   ],
   "fp": "31e2d4f925fe75b039d7e0e158e8966091dedfe9ce2e10f07d7ec16cf710fa5a"
  },
  {
   "id": "sib-rc-tsx-opencode",
   "side": "minus",
   "kind": "repository code",
   "prediction": "PRESENT-",
   "confidence": "high (atlas JS/TS/TSX: 4 of 4 PRESENT-, v -0.14 to -0.21; all code 38 of 47)",
   "vRange": [
    -0.175,
    -0.035
   ],
   "absVMax": null,
   "note": "TSX, opencode-fold packages",
   "tokens": 291571,
   "units": 71714,
   "docs": 410,
   "types": 11940,
   "halfTokens": [
    139270,
    152301
   ],
   "fp": "cd9c1849288fc22adf3bce9f7e1bae005178ec5327c017cac6926481d25e3194"
  },
  {
   "id": "sib-rc-py-authored",
   "side": "absent",
   "kind": "Python code",
   "prediction": "ABSENT",
   "confidence": "low (a coin flip against the atlas base rate of the code class, which is PRESENT-; basis: cd-cc-python ABSENT and cd-e09-python v about 0)",
   "vRange": null,
   "absVMax": 0.02,
   "note": "authored Python of the user's repositories (+ harmbench), 210k tokens",
   "tokens": 210433,
   "units": 35974,
   "docs": 202,
   "types": 12791,
   "halfTokens": [
    61380,
    149053
   ],
   "fp": "b92fed0f178734e5985d14da753c79bfceba5dfef0c113b427c4bcdd26d7e1f0"
  },
  {
   "id": "sib-rc-py-sitepkg",
   "side": "absent",
   "kind": "Python code",
   "prediction": "ABSENT",
   "confidence": "low (same basis; docstring-rich library code may behave like prose, which would give PRESENT+)",
   "vRange": null,
   "absVMax": 0.02,
   "note": "pip packages of three virtualenvs, 292k tokens",
   "tokens": 292177,
   "units": 62512,
   "docs": 237,
   "types": 20755,
   "halfTokens": [
    153247,
    138930
   ],
   "fp": "4260678ac4291569e1cfe7cea9905cc358cd6ee27144e6d19288e30d01aa7d85"
  },
  {
   "id": "sib-rc-ud-cmn-train",
   "side": "absent",
   "kind": "UD treebank train split (atlas dev+test ABSENT)",
   "prediction": "ABSENT",
   "confidence": "low (power question: atlas v about +0.015, null sd 0.006-0.013 on 20-28k tokens; with 4-7 times more tokens a real +0.015 would give z about 3 to 5: AMBIGUOUS or PRESENT+ would then say the atlas ABSENT was low power)",
   "vRange": null,
   "absVMax": 0.02,
   "note": "UD Chinese train split",
   "tokens": 82060,
   "units": 3997,
   "docs": 160,
   "types": 16785,
   "halfTokens": [
    38984,
    43076
   ],
   "fp": "e983a55160f1dce65ad7860c9b616984eaf6e72ac4fcc7eaba02256ed88536cb"
  },
  {
   "id": "sib-rc-ud-jpn-train",
   "side": "absent",
   "kind": "UD treebank train split (atlas dev+test ABSENT)",
   "prediction": "ABSENT",
   "confidence": "low (power question: atlas v about +0.015, null sd 0.006-0.013 on 20-28k tokens; with 4-7 times more tokens a real +0.015 would give z about 3 to 5: AMBIGUOUS or PRESENT+ would then say the atlas ABSENT was low power)",
   "vRange": null,
   "absVMax": 0.02,
   "note": "UD Japanese train split",
   "tokens": 146279,
   "units": 7050,
   "docs": 282,
   "types": 19576,
   "halfTokens": [
    76491,
    69788
   ],
   "fp": "11cab7f027760a65483116e72df2ec011918832a9bb5e896c87a913805994b4d"
  },
  {
   "id": "sib-rc-ud-urd-train",
   "side": "absent",
   "kind": "UD treebank train split (atlas dev+test ABSENT)",
   "prediction": "ABSENT",
   "confidence": "low (power question: atlas v about +0.015, null sd 0.006-0.013 on 20-28k tokens; with 4-7 times more tokens a real +0.015 would give z about 3 to 5: AMBIGUOUS or PRESENT+ would then say the atlas ABSENT was low power)",
   "vRange": null,
   "absVMax": 0.02,
   "note": "UD Urdu train split",
   "tokens": 102096,
   "units": 4043,
   "docs": 162,
   "types": 9260,
   "halfTokens": [
    54315,
    47781
   ],
   "fp": "99b262f2ead8ffe3e038df477de0893e91adf05eaf110a634092f18e60854300"
  }
 ],
 "controls": [
  {
   "id": "ctl-rc-en-mouret",
   "of": "sib-rc-en-mouret",
   "prediction": "NOT PRESENT in either sign (law-free by construction: global token shuffle + re-assigned unit lengths, as the atlas ct-* group); instrument check only, not part of the verdict"
  },
  {
   "id": "ctl-rc-ud-ces-train",
   "of": "sib-rc-ud-ces-train",
   "prediction": "NOT PRESENT in either sign (law-free by construction: global token shuffle + re-assigned unit lengths, as the atlas ct-* group); instrument check only, not part of the verdict"
  },
  {
   "id": "ctl-rc-ts-opencode",
   "of": "sib-rc-ts-opencode",
   "prediction": "NOT PRESENT in either sign (law-free by construction: global token shuffle + re-assigned unit lengths, as the atlas ct-* group); instrument check only, not part of the verdict"
  }
 ],
 "statusRule": "PRESENT+ / PRESENT- = |z| >= 4 in BOTH halves with the same sign; ABSENT = |z| < 2 in BOTH halves; AMBIGUOUS = anything else (PROTOCOL.md). z = (v - nullMean) / nullSd over the 10 within-unit null draws of run-atlas.mjs. A sibling under 20,000 tokens or 20 documents would be THIN (reported, never scored); none is expected.",
 "holdsRule": "a scored sibling HOLDS iff its observed status equals its predicted status (PRESENT with the predicted sign, or ABSENT). AMBIGUOUS never holds. A PRESENT sibling's constant v (mean of the two half values) is also checked against its predicted range; that check is REPORTED (constantInRange) and does NOT enter the verdict.",
 "verdictRule": {
  "REPLICATES": "every scored sibling HOLDS (all 23 if none is thin).",
  "FAILS": "fewer than half of the scored siblings HOLD, OR the sign contrast fails: fewer than half of the scored PLUS siblings are PRESENT+, OR fewer than half of the scored MINUS siblings are PRESENT-.",
  "PARTIAL": "anything else; the report lists which siblings held and which did not, per side, and the per-side shares against the sibling plan of the atlas (PLUS >= 60% PRESENT+, MINUS >= 75% PRESENT-); the ABSENT side is reported on its own.",
  "reversalCheck": "the law is a REVERSAL, so the report also states whether BOTH signs were observed: at least one PLUS sibling PRESENT+ AND at least one MINUS sibling PRESENT-. A verdict of REPLICATES or PARTIAL without both signs is impossible by the FAILS clause."
 },
 "weakCriterion": "REPORTED ONLY, never in the verdict: sign-only: a PLUS (MINUS) sibling has weak-hold if z > 0 (z < 0) in both halves and min |z| >= 2; an ABSENT sibling's weak-hold is its status. Used to separate 'wrong sign' from 'underpowered' in the write-up.",
 "diagnostics": {
  "selfCheck": "before any sibling: order.compute and the null of run-atlas.mjs are re-run on three ATLAS pockets (bk-great-expect, ud-pol, cd-e09-go) and compared with results/atlas/*.json (v to 1e-9, z to 1e-6, both halves); the variant code is checked to reproduce rareCurve exactly when given x = ln mid-rank.",
  "A1_collinearity": "v and z of order.surprGrow and order.entCurv (and rareSlope, initDev, finalDev) are reported for every sibling half from the same compute call; across the 23 siblings Spearman rho of v(rareCurve) with v(surprGrow) and v(entCurv) is reported against the atlas rhos -0.62 and +0.58; for each PRESENT rareCurve sibling the report says whether surprGrow has the opposite and entCurv the same sign (what the collinearity predicts).",
  "A2_xDefinition": "three variants of x, same quadratic, same within-unit null draws: 'logcount' x = -ln(count of the type in the view); 'hapax' x = 1 if the type occurs once in the view else 0; 'content' x = 1 if mid-rank > 4K (K = min(400, max(10, round(0.05 V)))) else 0. A PRESENT primary whose 'logcount' variant has the opposite sign or |z| < 2 in both halves is flagged rank-definition-dependent.",
  "A3_size": "Spearman rho of v with log tokens over the 23 siblings, and a 200-draw null z (the first 10 draws are the protocol draws) plus a 200-resample document bootstrap interval for v per half, for every sibling; borderline statuses are read against these, never replaced by them.",
  "A4_multiplicity": "the chance that one pocket with a TRUE v of 0 is PRESENT (|z| >= 4 in both halves, same sign) when the null sd is estimated from 10 draws (t with 9 df) is computed exactly; times 23 siblings it is the expected number of chance PRESENT cells here (the pre-registered test is ONE statistic over 23 pockets); the three shuffled controls are the empirical check on real vocabularies.",
  "A5_leakage": "source argument per sibling (header) plus exact-bytes dedupe of code against every atlas code file and across the sib-rc code pockets; no sibling text is an atlas text (atlas drama = Henry IV Part 1 only, which is left out); duplicate-unit rate between the English siblings is reported."
 },
 "predictionSummary": "PLUS (13): the six English prose and drama siblings and the seven new-language UD train splits are PRESENT+, v in the class range; MINUS (5): the three JS, the TS and the TSX pocket are PRESENT-, v in [-0.175, -0.035]; ABSENT (5): the two Python pockets and the UD cmn / jpn / urd train splits are ABSENT, |v| <= 0.02. My own expectation of the count that will HOLD is about 15 to 18 of 23: PLUS 9-11 of 13 (power), MINUS 5 of 5, ABSENT 1-2 of 5; so a PARTIAL verdict is the expected outcome and REPLICATES would be a surprise."
};
// ===== END OF PRE-REGISTRATION HEADER (everything above this line, this line included, is hashed) =====
// ===== ADDENDUM TO THE DISCLOSURE (appended 2026-10-07 AFTER the statistics were computed; outside the hashed region; it changes no prediction, rule or result) =====
//  When I read the header block of results/confirm-comp.asym/confirm.mjs for conventions (before I wrote the header above) it contained another agent's own disclosure of an accidental glimpse: 'order.rareSlope v 0.087 z 15.0' for the DISCOVER half of Zola's Abbe Mouret
//  (and 'the start of order.rareCurve', no number given). That text is the same text as my sib-rc-en-mouret, under another pocket id (so the halves differ). It is a different statistic (rareSlope), one text, one half; I did not use it for any prediction. My header says I opened none of the
//  results files, which is true, but I should also have listed this sentence of a header I did read. sib-rc-en-mouret is the English sibling that did WORST (AMBIGUOUS), so the glimpse cannot have favoured the outcome.
// ===== END OF ADDENDUM =====

// ===== CODE (written after the header was frozen; it can only read PREREG, never change it) =====
//   node confirm.mjs selfcheck                      re-run the atlas procedure on three atlas pockets and compare with results/atlas/*.json
//   node confirm.mjs run id1,id2,... [--resume]     per pocket: halves, order.compute on the real view and on 200 within-unit null draws (the first 10 are the protocol draws), variants, bootstrap -> pockets/<id>.json
//   node confirm.mjs leak                           duplicate-unit check between English siblings, fingerprints of all siblings
//   node summarise.mjs                              status, HOLDS, verdict, diagnostics -> summary.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sha256, validate, halves, nullView, seedOf, rngOf, tokenCount } from "../../lib/pocket.mjs";
import * as order from "../../laws/order.mjs";
import { prep } from "../../laws/_order_prep.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), L = path.join(HERE, "../../loaders"), OUT = path.join(HERE, "pockets");
const ORDER_IDS = order.STATS.map((s) => s.id);
export const fingerprint = (p) => sha256(JSON.stringify([p.units, p.docOf]));

/** the same sample statistics as run-atlas.mjs */
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const zOf = (v, xs) => { const f = xs.filter((x) => Number.isFinite(x)); if (!Number.isFinite(v) || f.length < 3) return { m: null, sd: null, z: null, n: f.length }; const { m, sd } = stat(f); return { m, sd, z: sd > 0 ? (v - m) / sd : null, n: f.length }; };

/** rareCurve with an arbitrary per-type x (the code of laws/_order_pos.mjs restricted to rareCurve); with x = P.xt it reproduces order.rareCurve exactly. */
export function quadCorr(P, xtype) {
  const { U, T, unitStart } = P;
  let Sxx = 0, Sxq = 0, Sqq = 0, nTok = 0, nU = 0;
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], n = unitStart[u + 1] - a;
    if (n < 3) continue;
    let xm = 0;
    for (let i = 0; i < n; i++) xm += xtype[T[a + i]];
    xm /= n;
    let sr2 = 0, sr4 = 0;
    for (let i = 0; i < n; i++) { const r = i / (n - 1) - 0.5, r2 = r * r, dx = xtype[T[a + i]] - xm; Sxx += dx * dx; Sxq += dx * r2; sr2 += r2; sr4 += r2 * r2; }
    Sqq += sr4 - (sr2 * sr2) / n; nTok += n; nU++;
  }
  if (nU < 300 || nTok < 2000) return null;
  const eps = 1e-9 * nTok;
  return Sxx > eps && Sqq > eps ? Sxq / Math.sqrt(Sxx * Sqq) : null;
}
/** the three pre-registered variants of x (A2) plus the primary, on one view */
export function variantStats(view) {
  const P = prep(view), V = P.V, x = { logcount: new Float64Array(V), hapax: new Float64Array(V), content: new Float64Array(V) };
  for (let t = 0; t < V; t++) { x.logcount[t] = -Math.log(P.cnt[t]); x.hapax[t] = P.cnt[t] === 1 ? 1 : 0; x.content[t] = P.mid[t] > 4 * P.K ? 1 : 0; }
  return { primary: quadCorr(P, P.xt), logcount: quadCorr(P, x.logcount), hapax: quadCorr(P, x.hapax), content: quadCorr(P, x.content) };
}

/** the whole run-atlas.mjs procedure for the order family, extended with nDraws draws (the first 10 are exactly the atlas draws: same seed formula), the variants and a document bootstrap. */
export function analyse(p, nDraws = PREREG.diagnosticDraws, nBoot = PREREG.bootstrapResamples) {
  const meta = validate(p), H = halves(p), res = { id: p.id, meta: { ...meta, group: p.group, register: p.register, language: p.language, script: p.script ?? null, fp: fingerprint(p), types: new Set(p.units.flat()).size }, halves: {} };
  for (const which of ["discover", "confirm"]) {
    const view = H[which], obs = order.compute(view), vobs = variantStats(view), draws = [], vdraws = [];
    for (let k = 0; k < nDraws; k++) { const nv = nullView(view, "within-unit", seedOf(p.id, which, "order", "within-unit", k)); draws.push(order.compute(nv)); vdraws.push(variantStats(nv)); }
    const cells = {};
    for (const id of ORDER_IDS) {
      const xs = draws.map((d) => d[id]), a = zOf(obs[id], xs.slice(0, PREREG.draws)), b = zOf(obs[id], xs);
      cells[`order.${id}`] = { v: Number.isFinite(obs[id]) ? obs[id] : null, nullMean: a.m, nullSd: a.sd, z: a.z, n: a.n, z200: b.z, nullSd200: b.sd };
    }
    const variants = {};
    for (const key of ["primary", "logcount", "hapax", "content"]) { const xs = vdraws.map((d) => d[key]), a = zOf(vobs[key], xs.slice(0, PREREG.draws)), b = zOf(vobs[key], xs); variants[key] = { v: vobs[key], nullMean: a.m, nullSd: a.sd, z: a.z, z200: b.z }; }
    // document bootstrap of v (rareCurve): resample the half's documents with replacement
    const docs = []; view.units.forEach((u, i) => { (docs[view.docOf[i]] ??= []).push(u); });
    const rnd = rngOf(seedOf(p.id, which, "order", "bootstrap")), bs = [];
    for (let b = 0; b < nBoot; b++) { const units = []; for (let j = 0; j < docs.length; j++) for (const u of docs[Math.floor(rnd() * docs.length)]) units.push(u); const r = order.compute({ id: p.id, which, units, docOf: units.map(() => 0) }).rareCurve; if (Number.isFinite(r)) bs.push(r); }
    bs.sort((x, y) => x - y);
    const q = (f) => (bs.length ? bs[Math.min(bs.length - 1, Math.floor(f * bs.length))] : null);
    res.halves[which] = { tokens: tokenCount(view.units), units: view.units.length, docs: docs.length, cells, variants, bootstrap: { n: bs.length, lo: q(0.025), hi: q(0.975) } };
  }
  return res;
}

/** build a sibling or a control by id; refuses a sibling whose fingerprint differs from the one frozen in PREREG */
export async function build(id) {
  const sib = PREREG.siblings.find((s) => s.id === id), ctl = PREREG.controls.find((c) => c.id === id);
  if (!sib && !ctl) throw new Error(`unknown id ${id}`);
  const srcId = sib ? id : ctl.of, f = /^sib-rc-en-/.test(srcId) ? "_sibling-rc-en.mjs" : /^sib-rc-ud-/.test(srcId) ? "_sibling-rc-ud.mjs" : "_sibling-rc-code.mjs";
  const m = await import(pathToFileURL(path.join(L, f)).href), [src] = await m.load([srcId]);
  if (!src) throw new Error(`loader built nothing for ${srcId}`);
  const want = PREREG.siblings.find((s) => s.id === srcId).fp;
  if (fingerprint(src) !== want) throw new Error(`fingerprint of ${srcId} differs from the pre-registered one: the input changed after the header was frozen`);
  if (sib) return src;
  const { controlOf } = await import(pathToFileURL(path.join(L, "_sibling-entcurv-common.mjs")).href);
  return controlOf(src, id);
}

async function selfcheck() {
  const SPEC = [["books.mjs", "bk-great-expect"], ["ud.mjs", "ud-pol"], ["codemisc.mjs", "cd-e09-go"]], rows = [];
  for (const [file, id] of SPEC) {
    const m = await import(pathToFileURL(path.join(L, file)).href), [p] = await m.load([id]);
    if (!p) { rows.push({ id, error: "loader built nothing" }); continue; }
    const mine = analyse(p, PREREG.draws, 0), atlas = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8"));
    for (const which of ["discover", "confirm"]) {
      const a = atlas.halves[which]["order.rareCurve"], b = mine.halves[which].cells["order.rareCurve"], pv = mine.halves[which].variants.primary.v;
      rows.push({ id, which, atlas: { v: a.v, z: a.z }, mine: { v: b.v, z: b.z }, dv: Math.abs(a.v - b.v), dz: Math.abs(a.z - b.z), variantPrimaryDv: Math.abs(pv - b.v), ok: Math.abs(a.v - b.v) < 1e-9 && Math.abs(a.z - b.z) < 1e-6 && Math.abs(pv - b.v) < 1e-12 });
    }
  }
  fs.writeFileSync(path.join(HERE, "self-check.json"), JSON.stringify({ allOk: rows.every((r) => r.ok), rows }, null, 1));
  console.error(JSON.stringify(rows.map((r) => ({ id: r.id, which: r.which, ok: r.ok, dv: r.dv, dz: r.dz })))); 
}

async function leak() {
  const ids = PREREG.siblings.map((s) => s.id), en = ids.filter((i) => /^sib-rc-en-/.test(i)), seen = new Map(), dup = {}, fps = {};
  for (const id of ids) {
    const p = await build(id); fps[id] = { fp: fingerprint(p), ok: fingerprint(p) === PREREG.siblings.find((s) => s.id === id).fp };
    if (!en.includes(id)) continue;
    for (const u of p.units) { if (u.length < 8) continue; const key = u.join(" "), o = seen.get(key); if (o && o !== id) dup[`${o}|${id}`] = (dup[`${o}|${id}`] || 0) + 1; else seen.set(key, id); }
  }
  fs.writeFileSync(path.join(HERE, "leak.json"), JSON.stringify({ duplicateUnitsBetweenEnglishSiblings: dup, fingerprints: fps }, null, 1));
  console.error("leak done", JSON.stringify(dup));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, arg] = process.argv.slice(2), resume = process.argv.includes("--resume");
  if (cmd === "selfcheck") await selfcheck();
  else if (cmd === "leak") await leak();
  else if (cmd === "run") {
    fs.mkdirSync(OUT, { recursive: true });
    for (const id of (arg === "all" ? [...PREREG.siblings.map((s) => s.id), ...PREREG.controls.map((c) => c.id)] : arg.split(","))) {
      const file = path.join(OUT, `${id}.json`);
      if (resume && fs.existsSync(file)) continue;
      const t0 = Date.now(), p = await build(id), r = analyse(p);
      r.seconds = (Date.now() - t0) / 1000;
      fs.writeFileSync(file, JSON.stringify(r));
      console.error(`${id}: ${r.meta.tokens} tokens, ${r.seconds.toFixed(1)} s`);
    }
  } else { console.error("usage: node confirm.mjs selfcheck | leak | run <id,id,...|all> [--resume]"); process.exit(2); }
}
