// results/confirm-comp.rigidL/confirm.mjs — SIBLING REPLICATION of the atlas law comp.rigidL ("a larger share of types have one fixed commonest left-hand neighbour than a within-unit shuffle gives").
// ===== PRE-REGISTRATION HEADER (written 2026-10-07 before ANY law statistic of ANY family was computed on ANY sibling pocket; the sha256 of every byte of this file from the first byte through the END marker line inclusive is in prereg.sha256) =====
//
// WHAT IS REPLICATED. Atlas entry comp.rigidL (results/law-table.json): UNIVERSAL(+), 387 of 391 real non-thin pockets PRESENT+ (|z| >= 4 in both halves, same sign), 1 PRESENT- (ml-grc-lyric), 1 ABSENT (cd-smiles-pubchem), 2 AMBIGUOUS
//  (cd-protein-aa, ml-grc-comedy); median min-half |z| 225; not sizeConfounded; validated by planted world pl-frames; rho 0.90 with comp.sameL. The statistic (laws/comp.mjs, laws/_comp_neigh.mjs neighbourTypeStats): of the types with count >= 8 and
//  >= 10 left-neighbour occurrences inside their unit (>= 20 such types needed), the SOFT share of types whose single commonest left neighbour type holds m >= 0.8 of those occurrences (counts 1) or exp(-(0.8 - m)/0.15) below that. Null: WITHIN-UNIT shuffle.
//  The claim has two parts, and both are tested: (E) EXISTENCE: PRESENT+ in the pockets of the kinds where it was PRESENT+ in the atlas, ABSENT where the atlas had it ABSENT; (C) CONSTANT: the size of v is a property of REGISTER
//  (atlas eta2 0.56 on register, permutation p < 0.001): diagram 0.42, legal 0.24, markup 0.19, code 0.18, ..., novel 0.09, ..., treebank 0.05, poetry 0.04, drama 0.04.
//
// DISCLOSURE (what I have seen before writing this header)
//  SEEN: PROTOCOL.md (sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc, unchanged), lib/pocket.mjs, run-atlas.mjs, laws/comp.mjs, laws/_comp_core.mjs, _comp_prep.mjs, _comp_neigh.mjs (the definition and code of the statistic),
//   the whole comp.rigidL entry of results/law-table.json (counts by group, register, script and grain; g0 and g1; constantVaries; mostSimilar), and from results/atlas/*.json the comp.rigidL cells (v, nullMean, nullSd, z, both halves) of EVERY atlas
//   pocket: I printed the per-register medians of the mean of the two halves, every bk, ud, cd, oc and fm-law pocket with its two v, the 25 lowest min-half z pockets, and the full cells of cd-smiles-{pubchem,ccd,chebi,chembl}, ml-grc-lyric,
//   bk-pride-prej, cd-cc-python, cd-bpmn-miwg, ud-eng. ATLAS-SIDE PROBES I RAN (they shaped the predictions below): (i) the atom-token shares of the four atlas SMILES pockets: in cd-smiles-pubchem the single token 'C' (aliphatic carbon, written
//   U+00B7 c) is 72.3% of all tokens (Kekule SMILES, no aromatic lowercase), versus 29.6-37.5% in ccd/chembl/chebi; with 36 types of count >= 10 the shuffled commonest left neighbour of every type is almost always 'C', so the null sits at 0.46 with
//   sd 0.037 and v (0.42 / 0.41) falls BELOW it: the pocket is ABSENT by NULL SATURATION (a ceiling), not by absence of structure. I read this as the mechanism of the atlas ABSENT cell and predict it recurs on new PubChem compounds.
//   (ii) the atlas ud pockets: v against the share of multiword-token words (r = 0.37 over 34 pockets, slope 0.20); not a usable predictor, so the treebank range below is the wide atlas range. (iii) cd-protein-aa and cd-codons: soft share at the floor
//   (20-letter / 64-word alphabet, commonest neighbour share ~0.1: soft value ~0.0094), atlas v 0.0100 (null 0.0100, z -1.0 / -2.4) and 0.0072 (z +11.6 / +9.3). My expectation for the protein sibling is therefore a coin flip between ABSENT and AMBIGUOUS.
//   I also read the header of results/confirm-comp.asym/confirm.mjs (lines 1-38) as a template, the headers of the earlier agents' sibling loaders (loaders/_sibling-*.mjs), and I printed the DESCRIPTIVE meta of every sibling pocket (tokens, units, documents,
//   vocabulary size, unit length, thin flag) and of pockets that I then dropped (asym-ud-hun/tam/tel/uig and ent-ud-eng-pud, ent-ud-san-vedic, rl-sql-repos, rl-sh-repos are thin: not scored, listed in the result file).
//  NOT SEEN: any comp-family (or any other law-family) statistic, any half, any null draw, of any sibling pocket in the list below. No sibling value of comp.rigidL is stored anywhere under results/ (I searched every file that contains the string 'rigid'
//   for the sibling ids: none). One thing I cannot rule out: the earlier agent of results/confirm-comp.asym ran comp.compute on its own asym-* pockets (all twelve comp statistics, including rigidL) and stored only comp.asym; nobody here has seen those
//   rigidL values, and they are not on disk. The 27 sibling pockets of this file whose ids start with asym- (asym-cd-*, asym-en-*, asym-oc-irc-ho-*, asym-ud-*) are therefore pockets on which rigidL was computed once by another agent and never read
//   (the other siblings were used by confirmations of order, para or fig statistics, which do not store comp values); I state it so the reader can discount.
//
// SIBLINGS (53 scored + 2 controls; every pocket is built whole by loaders/_sibling-rigidl-all.mjs, from material that no atlas pocket reads). Loaders of earlier agents are imported unchanged (their headers document material and cuts); loaders written
//  for this file: _sibling-rigidl-chem.mjs (PubChem leftover; codon leftover), _sibling-rigidl-law.mjs (French statute pieces), _sibling-rigidl-repos.mjs (CSS, YAML of the user's repositories), _sibling-rigidl-ctl.mjs (controls), _sibling-rigidl-all.mjs.
//  Kinds and NEWNESS (honest scale: NEW CORPUS = documents of a corpus no atlas pocket reads; HELD-OUT = documents of an atlas corpus that the atlas pocket's 300k whole-document cap or seeded sample left out, so same sources and weaker independence):
//   code (14): JavaScript sib-js-fold / sib-js-heimdall / sib-js-eoreader7 / asym-cd-js / ent-cd-js (user repositories) and sfx-cd-npmjs (npm CLI), TypeScript asym-cd-ts / ent-cd-ts, Python sib-py-foldvenv / asym-cd-py / ent-cd-py / sfx-cd-py314,
//     Ruby sfx-cd-rb26 (Ruby 2.6 stdlib), C sfx-cd-chdr (macOS SDK headers). NEW CORPUS (exact-bytes dedupe against the atlas code files in each loader).  markup rl-css-repos and config rl-yaml-repos: NEW CORPUS (user repositories; dedupe against ALL languages
//     of the atlas code-corpus manifest and ethos 09-source-code).
//   English prose (14): reportage asym-en-about-london; essay asym-en-among-forces; novels asym-en-mouret, asym-en-poe2, asym-en-awakening, ec-en-yonge; memoirs asym-en-waikna, ec-en-swisshelm; children ec-en-children; drama asym-en-dolls-house,
//     asym-en-early-plays, ec-en-shakespeare; chat asym-oc-irc-ho-0607, asym-oc-irc-ho-0809. The books are NEW CORPUS (misfiled English books of ethos 11-multi-language/gutenberg-non-en that the atlas skipped, Gutenberg files of the eochat priors, Shakespeare
//     Complete Works); the two IRC pockets are HELD-OUT documents of the same channels as oc-irc-ubuntu-0607/-0809 (the atlas cap dropped them).
//   treebanks (15): UD TRAIN splits of languages with no atlas pocket (asym-ud-ita, nld, rus, ces, dan, lit, ell, tur, hye, kat, gle, afr, mlt, wol) and Latin-Perseus (ent-ud-lat-perseus): NEW CORPUS (atlas ud reads dev+test of 53 other stems only).
//   diagram (3): sib-bpmn-{miwg,kogito,activiti}-heldout: HELD-OUT BPMN files of the same exporter families as the atlas pockets (not new worlds).
//   legal (1): rl-law-fr-heldout: HELD-OUT pieces of the French statutes (the 96 of 146 pieces that the atlas pocket fm-law-fr left out; same codes, different pieces).
//   notation / sequence (4): sp-smiles-ccd (6,000 wwPDB CCD ligands not in the atlas pocket), rl-codons-heldout (gene blocks the atlas pocket did not take) = PRESENT-predicted; rl-smiles-pubchem-heldout (the 3,000 PubChem compounds of the raw
//     fetch that no corpus record contains) and sp-protein-aa (protein blocks the atlas pocket did not take) = ABSENT-predicted. The CCD and PubChem siblings are NEW MOLECULES of the same registries, protein and codons are HELD-OUT BLOCKS of the same 66 genomes.
//   controls (2): rl-ctl-en-mouret, rl-ctl-js-fold = token-global shuffles of a sibling (law-free by construction; instrument check).
//  LIMITS OF THE SET (stated now): no sibling is a new language of running prose (all non-English running text of the ethos tree is inside atlas pockets); no sibling is a verse pocket, so the one atlas PRESENT- cell (ml-grc-lyric: short verse lines, free
//   word order) and the AMBIGUOUS Greek comedy cell have NO sibling (there is no unused Greek or Latin verse on this machine); the law's reversal arm is therefore untested here. English drama has three siblings, the atlas has three English drama pockets.
//   Many siblings are user-authored (AI-assisted) code and English books whose material other confirmations also used; the pockets are distinct from each other (a cross-sibling duplicate check is run and reported) but share the machine and the repository.
//
// HOW THE STATISTIC AND ITS NULL ARE COMPUTED (identical to run-atlas.mjs): per pocket, halves(p) by sha256(id:doc) parity; per half the 'comp' family compute(view) is called once on the real view and, for each null kind the family names
//  (within-unit and unit-order), on 10 nullView(view, kind, seedOf(p.id, half, 'comp', kind, k)) draws, k = 0..9; v = observed value, nullMean / nullSd over the finite draws (>= 3 needed), z = (v - nullMean) / nullSd when nullSd > 0, else z is
//  undefined. All twelve comp statistics are stored; the headline statistic is comp.rigidL (null within-unit). Cell status per PROTOCOL: PRESENT(+/-) = |z| >= 4 in BOTH halves with the same sign; ABSENT = |z| < 2 in both halves; AMBIGUOUS =
//  anything else, and a cell with an undefined z in either half is AMBIGUOUS (UNDEF). A sibling's number v-bar is the mean of its two half values of v.
//
// BLIND PREDICTIONS (written before any sibling statistic existed; every number comes from the ATLAS only: pool = the atlas real non-thin pockets of the sibling's register, median of the mean of their two halves of v, and a range
//  [0.8 x P05, 1.25 x P95] of the pool's v-bars (min and max instead of P05 and P95 when the pool has fewer than 10 pockets). The pools and ranges are frozen in PREREG.pools below; they were computed by a script that reads results/atlas/*.json only.)
//  PRESENT-predicted siblings (51): status PRESENT with sign +, and v-bar inside its pool range. Expected size order (claim C), from the atlas pool medians: smiles (non-PubChem) 0.44 > diagram 0.42 > legal (statute) 0.245 > config 0.238 >
//   markup 0.188 > code 0.184 > children 0.109 > novel 0.089 > memoir 0.088 > reportage 0.086 > chat 0.074 > essay 0.067 > treebank 0.054 > drama 0.040 > codons 0.007. NOTE a discrepancy with the sibling plan I was handed ('code > legal-like prose >
//   novel > drama'): in the atlas the statute pockets (0.245) are ABOVE code (0.184); I register the ATLAS order, not the plan's.
//  ABSENT-predicted siblings (2): rl-smiles-pubchem-heldout (reason: null saturation, see PROBE (i); range for v-bar 0.33-0.50, about the atlas 0.415 and the null 0.46-0.48) and sp-protein-aa (soft share at its floor; atlas v 0.0100 equals its null;
//   range 0.0080-0.0125). Status required: ABSENT (|z| < 2 in both halves). AMBIGUOUS or PRESENT counts as a MISS for this prediction. My subjective chance that each of these two is strictly ABSENT: about 0.5 (the atlas twin of the protein pocket
//   was AMBIGUOUS, z -2.4 in one half; the atlas PubChem z were -1.0 and -1.7).
//  CONTROLS (2): not PRESENT in either sign. A control that is PRESENT = INSTRUMENT FAILURE and caps the verdict at PARTIAL.
//
// PASS RULE (fixed now). Let A = the 51 PRESENT-predicted siblings, B = the 2 ABSENT-predicted siblings.
//  (E) EXISTENCE HITS: a sibling hits when its status equals its prediction. (C1) ORDER: Spearman rho (average ranks) between the v-bar of the 51 A siblings and their pool medians must exceed 0.5. (C2) RANGE: at least 75% of the 53 siblings must have
//  v-bar inside their registered range.
//  REPLICATES = every one of the 53 siblings hits (the task's rule: the prediction holds in every sibling with PRESENT/ABSENT status per PROTOCOL) AND C1 AND C2 AND no control PRESENT.
//  FAILS = fewer than half of the A siblings are PRESENT+ (the law does not generalise to new pockets) or at least 3 A siblings are PRESENT- (a reversal).
//  PARTIAL = everything else: the law holds in some siblings, and the report lists exactly which siblings missed and which of E, C1, C2 failed (existence versus constant are reported separately: 'E holds, C fails' = a presence law without a
//   transportable constant). Also reported, never changing the class: the share of A siblings PRESENT+ against the PROTOCOL's UNIVERSAL threshold (0.85) and against the blind plan's 0.95; the binomial chance of at least that many PRESENT+ if
//   the true rate were 0.85; z of each cell by half.
//
// ADVERSARY READOUTS (computed on the same draws as the headline; diagnostics, they do not change the class):
//  D1 hard share: the hard version of the statistic (share of eligible types with m >= 0.8, neighbourTypeStats().hardL) with its own within-unit null (z undefined where the null is constant 0; then the count of draws >= v is reported).
//  D2 soft width: the same statistic with soft width 0.10 and 0.25 instead of 0.15: status of each and Spearman of its v-bar against the v-bar of the 0.15 version over the siblings.
//  D3 cheaper rival: bigramRep = (adjacent pairs inside units - distinct adjacent type pairs) / adjacent pairs, within-unit null: status and Spearman of its z against the z of rigidL, over the siblings.
//  D4 size and unit length: Spearman over the A siblings of ratio = v-bar / pool median against log10(tokens) and against mean unit length (|rho| >= 0.7 would mean the constant is a size effect).
//  D5 collinearity: status of comp.sameL (null unit-order) and comp.rigidR for every sibling; Spearman of v-bar(rigidL) with v-bar(sameL) and with v-bar(rigidR) over the siblings (atlas rho 0.90 and 0.93).
//  D6 constant by class: eta-squared of v-bar on kind (the groups of PREREG.siblings, kinds with >= 2 pockets) and a permutation p over kind labels (2000 draws, rngOf(seedOf('rigidl-eta2'))); the atlas value was eta2 0.56 on register, p < 0.001.
//  D7 tokenisation: the multiword-token artefact (UD words that are expanded clitics, e.g. 'de el') cannot be separated here; reported for the UD siblings as their v-bar next to meta.mwtTokens / tokens.
//  D8 duplicates: share of distinct units of >= 8 tokens that occur in two siblings (pairs above 2% are listed; a pair above 10% counts as one pocket for C1).
//
// FORECAST (subjective, written for calibration): P(all 51 A siblings PRESENT+) about 0.65 (the atlas misses were short-verse, protein and Kekule-SMILES pockets, none of which is in A except the codon sibling); P(sp-protein-aa ABSENT) 0.5; P(PubChem sibling ABSENT) 0.5;
//  P(C1) 0.95 (rho expected near 0.8); P(C2) 0.9; P(REPLICATES) about 0.25; P(PARTIAL) about 0.7; P(FAILS) < 0.05.
//
// ===== PREREG DATA (the single source of truth that the code below the END marker reads) =====
export const PREREG = {
  stat: "comp.rigidL", family: "comp", statId: "rigidL", nullKind: "within-unit", draws: 10, written: "2026-10-07",
  thresholds: { presentZ: 4, absentZ: 2, rho: 0.5, rangeShare: 0.75, failShare: 0.5, reversalCount: 3, universal: 0.85, plan: 0.95, dupPair: 0.02, dupMerge: 0.1, permutations: 2000 },
  // pools: atlas-only (register median of the mean of the two halves of v; range [0.8 x P05, 1.25 x P95], min/max when n < 10)
  pools: {
    code: { n: 47, median: 0.1838, lo: 0.0997, hi: 0.3468 }, markup: { n: 5, median: 0.1881, lo: 0.1195, hi: 0.5704 }, config: { n: 3, median: 0.2384, lo: 0.1349, hi: 0.3254 },
    novel: { n: 25, median: 0.0887, lo: 0.0505, hi: 0.141 }, memoir: { n: 13, median: 0.0876, lo: 0.0536, hi: 0.1295 }, reportage: { n: 4, median: 0.086, lo: 0.0606, hi: 0.1148 },
    essay: { n: 3, median: 0.0666, lo: 0.0421, hi: 0.1497 }, children: { n: 17, median: 0.1092, lo: 0.0267, hi: 0.1914 }, drama: { n: 12, median: 0.0401, lo: 0.0187, hi: 0.0958 },
    chat: { n: 20, median: 0.0741, lo: 0.0327, hi: 0.1201 }, treebank: { n: 34, median: 0.054, lo: 0.0178, hi: 0.241 }, diagram: { n: 7, median: 0.4224, lo: 0.1921, hi: 0.6826 },
    legal: { n: 27, median: 0.2449, lo: 0.1464, hi: 0.4079 }, smiles: { n: 3, median: 0.4409, lo: 0.3017, hi: 0.6224 },
    codons: { n: 1, median: 0.0072, lo: 0.0055, hi: 0.0095 }, pubchem: { n: 1, median: 0.415, lo: 0.33, hi: 0.5 }, protein: { n: 1, median: 0.01, lo: 0.008, hi: 0.0125 },
  },
  // [id, kind, prediction, pool]; prediction PRESENT+ | ABSENT | NOT-PRESENT (controls)
  siblings: [
    ["sib-js-fold", "code-js", "PRESENT+", "code"], ["sib-js-heimdall", "code-js", "PRESENT+", "code"], ["sib-js-eoreader7", "code-js", "PRESENT+", "code"], ["asym-cd-js", "code-js", "PRESENT+", "code"],
    ["ent-cd-js", "code-js", "PRESENT+", "code"], ["sfx-cd-npmjs", "code-js", "PRESENT+", "code"], ["asym-cd-ts", "code-ts", "PRESENT+", "code"], ["ent-cd-ts", "code-ts", "PRESENT+", "code"],
    ["sib-py-foldvenv", "code-py", "PRESENT+", "code"], ["asym-cd-py", "code-py", "PRESENT+", "code"], ["ent-cd-py", "code-py", "PRESENT+", "code"], ["sfx-cd-py314", "code-py", "PRESENT+", "code"],
    ["sfx-cd-rb26", "code-rb", "PRESENT+", "code"], ["sfx-cd-chdr", "code-c", "PRESENT+", "code"], ["rl-css-repos", "markup-css", "PRESENT+", "markup"], ["rl-yaml-repos", "config-yaml", "PRESENT+", "config"],
    ["asym-en-about-london", "reportage", "PRESENT+", "reportage"], ["asym-en-among-forces", "essay", "PRESENT+", "essay"], ["asym-en-mouret", "novel", "PRESENT+", "novel"], ["asym-en-poe2", "novel", "PRESENT+", "novel"],
    ["asym-en-awakening", "novel", "PRESENT+", "novel"], ["ec-en-yonge", "novel", "PRESENT+", "novel"], ["asym-en-waikna", "memoir", "PRESENT+", "memoir"], ["ec-en-swisshelm", "memoir", "PRESENT+", "memoir"],
    ["ec-en-children", "children", "PRESENT+", "children"], ["asym-en-dolls-house", "drama", "PRESENT+", "drama"], ["asym-en-early-plays", "drama", "PRESENT+", "drama"], ["ec-en-shakespeare", "drama", "PRESENT+", "drama"],
    ["asym-oc-irc-ho-0607", "chat", "PRESENT+", "chat"], ["asym-oc-irc-ho-0809", "chat", "PRESENT+", "chat"],
    ["asym-ud-ita", "treebank", "PRESENT+", "treebank"], ["asym-ud-nld", "treebank", "PRESENT+", "treebank"], ["asym-ud-rus", "treebank", "PRESENT+", "treebank"], ["asym-ud-ces", "treebank", "PRESENT+", "treebank"],
    ["asym-ud-dan", "treebank", "PRESENT+", "treebank"], ["asym-ud-lit", "treebank", "PRESENT+", "treebank"], ["asym-ud-ell", "treebank", "PRESENT+", "treebank"], ["asym-ud-tur", "treebank", "PRESENT+", "treebank"],
    ["asym-ud-hye", "treebank", "PRESENT+", "treebank"], ["asym-ud-kat", "treebank", "PRESENT+", "treebank"], ["asym-ud-gle", "treebank", "PRESENT+", "treebank"], ["asym-ud-afr", "treebank", "PRESENT+", "treebank"],
    ["asym-ud-mlt", "treebank", "PRESENT+", "treebank"], ["asym-ud-wol", "treebank", "PRESENT+", "treebank"], ["ent-ud-lat-perseus", "treebank", "PRESENT+", "treebank"],
    ["sib-bpmn-miwg-heldout", "diagram", "PRESENT+", "diagram"], ["sib-bpmn-kogito-heldout", "diagram", "PRESENT+", "diagram"], ["sib-bpmn-activiti-heldout", "diagram", "PRESENT+", "diagram"],
    ["rl-law-fr-heldout", "legal", "PRESENT+", "legal"], ["sp-smiles-ccd", "smiles", "PRESENT+", "smiles"], ["rl-codons-heldout", "codons", "PRESENT+", "codons"],
    ["rl-smiles-pubchem-heldout", "absent-smiles", "ABSENT", "pubchem"], ["sp-protein-aa", "absent-protein", "ABSENT", "protein"],
    ["rl-ctl-en-mouret", "control", "NOT-PRESENT", null], ["rl-ctl-js-fold", "control", "NOT-PRESENT", null],
  ],
  notScored: ["asym-ud-hun (17,043 tokens)", "asym-ud-tam", "asym-ud-tel", "asym-ud-uig", "ent-ud-eng-pud (18,385)", "ent-ud-san-vedic (16,802)", "rl-sql-repos (3,010)", "rl-sh-repos (14,380)", "asym-en-evolution-plain (13,728)"],
};
// ===== END OF PRE-REGISTRATION HEADER =====

// ============================ CODE BELOW THE END MARKER (written after the header was hashed; it reads PREREG and changes nothing registered above) ============================
// node confirm.mjs pockets [--ids a,b] [--resume]   compute every sibling (or the listed ones) -> pockets/<id>.json
// node confirm.mjs selfcheck                         harness fidelity (bk-alice against the atlas file) and determinism (one sibling twice)
// node confirm.mjs dupcheck                          cross-sibling duplicate units -> dupcheck.json
// node confirm.mjs summarise                         pockets/*.json -> confirm-result.json (+ a printed table)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { validate, halves, nullView, seedOf, rngOf, sha256, tokenCount } from "../../lib/pocket.mjs";
import * as comp from "../../laws/comp.mjs";
import { prep } from "../../laws/_comp_prep.mjs";
import { neighbourTypeStats } from "../../laws/_comp_neigh.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), POCKETS = path.resolve(HERE, "../.."), OUT = path.join(HERE, "pockets");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }, DRAWS = PREREG.draws, TH = PREREG.thresholds;
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const fin = (x) => (Number.isFinite(x) ? x : null);
/** a cell exactly as run-atlas.mjs forms it: v, nullMean, nullSd over the finite draws (>= 3), z = (v - m) / sd when sd > 0 */
function cell(v, draws) {
  const xs = draws.filter((x) => Number.isFinite(x)), { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: fin(v), nullMean: fin(m), nullSd: fin(sd), z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
}
/** adversary extras of one view (D1-D3): hard share, soft width 0.10 / 0.25, eligible type count, bigram repetition */
function extrasOf(view) {
  const P = prep(view);
  if (P.N < 200) return { hardL: null, soft10: null, soft25: null, eligL: null, bigramRep: null };
  const a = neighbourTypeStats(P), b = neighbourTypeStats(P, 0.1), c = neighbourTypeStats(P, 0.25), { us, w, V, nUnits } = P, seen = new Set();
  let pairs = 0;
  for (let k = 0; k < nUnits; k++) for (let i = us[k]; i < us[k + 1] - 1; i++) { pairs++; seen.add(w[i] * V + w[i + 1]); }
  return { hardL: a.hardL, soft10: b.rigidL, soft25: c.rigidL, eligL: a.eligL, bigramRep: pairs ? (pairs - seen.size) / pairs : null };
}
/** the whole computation of one pocket, line for line the loop of run-atlas.mjs plus the extras on the within-unit draws */
export function runPocket(p) {
  const H = halves(p), halvesOut = {}, kinds = [...new Set(comp.STATS.map((s) => s.null))];
  for (const which of ["discover", "confirm"]) {
    const view = H[which], obs = comp.compute(view), obsX = extrasOf(view), draws = {}, xdraws = [];
    for (const kind of kinds) {
      draws[kind] = [];
      for (let k = 0; k < DRAWS; k++) {
        const nv = nullView(view, kind, seedOf(p.id, which, comp.FAMILY, kind, k));
        draws[kind].push(comp.compute(nv));
        if (kind === PREREG.nullKind) xdraws.push(extrasOf(nv));
      }
    }
    const cells = {}, extras = {};
    for (const s of comp.STATS) cells[s.id] = cell(obs[s.id], draws[s.null].map((d) => d[s.id]));
    for (const key of Object.keys(obsX)) { extras[key] = cell(obsX[key], xdraws.map((d) => d[key])); extras[key].drawsGeV = Number.isFinite(obsX[key]) ? xdraws.filter((d) => Number.isFinite(d[key]) && d[key] >= obsX[key]).length : null; }
    halvesOut[which] = { tokens: tokenCount(view.units), units: view.units.length, docs: new Set(view.docOf).size, cells, extras };
  }
  return halvesOut;
}
const contentSha = (p) => sha256(JSON.stringify(p.units) + "\x1f" + JSON.stringify(p.docOf));
const roleOf = (id) => PREREG.siblings.find((s) => s[0] === id);
const loadAll = async () => (await import(pathToFileURL(path.join(POCKETS, "loaders/_sibling-rigidl-all.mjs")).href));

async function modePockets() {
  fs.mkdirSync(OUT, { recursive: true });
  const A = await loadAll(), only = opt("--ids", null)?.split(","), RESUME = argv.includes("--resume"), ids = (only ?? PREREG.siblings.map((s) => s[0]));
  for (const id of ids) {
    const file = path.join(OUT, `${id}.json`), r = roleOf(id);
    if (!r) { console.error(`${id}: not in PREREG`); continue; }
    if (RESUME && fs.existsSync(file)) continue;
    const t0 = Date.now(), [p] = await A.load([id]);
    if (!p) { fs.writeFileSync(file, JSON.stringify({ id, error: "loader returned no pocket" })); console.error(`${id}: no pocket`); continue; }
    const v = validate(p), meta = { ...v, group: p.group, register: p.register, language: p.language, script: p.script ?? null, meanUnit: v.tokens / v.units, extra: p.meta ?? null };
    if (v.thin) { fs.writeFileSync(file, JSON.stringify({ id, role: r, meta, skipped: "thin" })); console.error(`${id}: thin ${v.tokens} tokens ${v.docs} docs`); continue; }
    const out = { id, kind: r[1], prediction: r[2], pool: r[3], meta, contentSha256: contentSha(p), halves: runPocket(p) };
    fs.writeFileSync(file, JSON.stringify(out));
    console.error(`${id}: ${v.tokens} tokens, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
const maxDiff = (a, b) => { let d = 0; for (const k of Object.keys(a)) if (a[k] != null && b[k] != null) d = Math.max(d, Math.abs(a[k] - b[k])); return d; };
async function modeSelfCheck() {
  const books = await import(pathToFileURL(path.join(POCKETS, "loaders/books.mjs")).href), [alice] = await books.load(["bk-alice"]), mine = runPocket(alice);
  const atlas = JSON.parse(fs.readFileSync(path.join(POCKETS, "results/atlas/bk-alice.json"), "utf8")), rows = []; let worst = 0;
  for (const which of ["discover", "confirm"]) for (const s of comp.STATS) {
    const a = atlas.halves[which][`comp.${s.id}`], m = mine[which].cells[s.id], d = Math.max(maxDiff({ v: m.v, nullMean: m.nullMean, nullSd: m.nullSd }, { v: a.v, nullMean: a.nullMean, nullSd: a.nullSd }), m.z != null && a.z != null ? Math.abs(m.z - a.z) / Math.max(1, Math.abs(a.z)) : 0);
    worst = Math.max(worst, d); rows.push({ which, stat: s.id, v: m.v, atlasV: a.v, z: m.z, atlasZ: a.z, diff: d });
  }
  const A = await loadAll(), [sib] = await A.load(["asym-en-dolls-house"]), j1 = JSON.stringify(runPocket(sib)), j2 = JSON.stringify(runPocket(sib));
  const res = { fidelity: { pocket: "bk-alice (atlas file results/atlas/bk-alice.json)", cells: rows.length, worstRelativeDiff: worst, pass: worst < 1e-9, rows }, determinism: { pocket: "asym-en-dolls-house", identical: j1 === j2, bytes: j1.length } };
  fs.writeFileSync(path.join(HERE, "self-check.json"), JSON.stringify(res, null, 1));
  console.log(`fidelity worst relative diff ${worst} (${res.fidelity.pass ? "PASS" : "FAIL"}); determinism ${res.determinism.identical ? "PASS" : "FAIL"}`);
}
const h48 = (s) => parseInt(createHash("sha1").update(s).digest("hex").slice(0, 12), 16);
async function modeDup() {
  const A = await loadAll(), sets = [];
  for (const [id] of PREREG.siblings) { const [p] = await A.load([id]); if (!p) continue; const s = new Set(); for (const u of p.units) if (u.length >= 8) s.add(h48(u.join(" "))); sets.push({ id, s }); console.error(`${id}: ${s.size} distinct units >= 8 tokens`); }
  const pairs = [];
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    const [a, b] = sets[i].s.size <= sets[j].s.size ? [sets[i], sets[j]] : [sets[j], sets[i]]; let n = 0; for (const x of a.s) if (b.s.has(x)) n++;
    if (a.s.size && n / a.s.size > 0.0005) pairs.push({ smaller: a.id, larger: b.id, shared: n, share: n / a.s.size });
  }
  pairs.sort((x, y) => y.share - x.share);
  fs.writeFileSync(path.join(HERE, "dupcheck.json"), JSON.stringify({ sizes: Object.fromEntries(sets.map((x) => [x.id, x.s.size])), pairsAbove0_05pct: pairs }, null, 1));
  console.log(`pairs above 0.05%: ${pairs.length}; above 2%: ${pairs.filter((x) => x.share > TH.dupPair).length}; above 10%: ${pairs.filter((x) => x.share > TH.dupMerge).length}`);
}

// ---------- summary ----------
function statusOf(c1, c2) {
  const z = [c1?.z, c2?.z];
  if (z.some((x) => x == null)) return "UNDEF";
  if (z[0] >= TH.presentZ && z[1] >= TH.presentZ) return "PRESENT+";
  if (z[0] <= -TH.presentZ && z[1] <= -TH.presentZ) return "PRESENT-";
  if (Math.abs(z[0]) < TH.absentZ && Math.abs(z[1]) < TH.absentZ) return "ABSENT";
  return "AMBIGUOUS";
}
const hits = (pred, st) => (pred === "PRESENT+" ? st === "PRESENT+" : pred === "ABSENT" ? st === "ABSENT" : pred === "NOT-PRESENT" ? st !== "PRESENT+" && st !== "PRESENT-" : false);
function ranks(xs) { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
function spearman(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const a = ranks(xs), b = ranks(ys), ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n; let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
}
const median = (xs) => { const s = xs.slice().sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
function binomTail(n, k, p) { let lp = 0, t = 0; const lf = (m) => { let s = 0; for (let i = 2; i <= m; i++) s += Math.log(i); return s; }; for (let i = k; i <= n; i++) { lp = lf(n) - lf(i) - lf(n - i) + i * Math.log(p) + (n - i) * Math.log(1 - p); t += Math.exp(lp); } return t; }
function eta2(vals, labels) {
  const g = new Map(); labels.forEach((l, i) => { if (!g.has(l)) g.set(l, []); g.get(l).push(vals[i]); });
  const m = vals.reduce((a, b) => a + b, 0) / vals.length; let ssb = 0, sst = 0; for (const xs of g.values()) { const mm = xs.reduce((a, b) => a + b, 0) / xs.length; ssb += xs.length * (mm - m) ** 2; } for (const x of vals) sst += (x - m) ** 2;
  return sst > 0 ? ssb / sst : null;
}
function permP(vals, labels, draws) {
  const rnd = rngOf(seedOf("rigidl-eta2")), obs = eta2(vals, labels); let ge = 0; const L = labels.slice();
  for (let d = 0; d < draws; d++) { for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } if (eta2(vals, L) >= obs - 1e-15) ge++; }
  return { eta2: obs, p: (ge + 1) / (draws + 1) };
}
const zbar = (c1, c2) => (c1?.z != null && c2?.z != null ? (c1.z + c2.z) / 2 : null);
const round = (x, d = 4) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const hardState = (e1, e2) => { const s = statusOf(e1, e2); if (s !== "UNDEF") return s; return [e1, e2].every((e) => e && e.v != null && e.nullMean != null && e.v > e.nullMean && e.drawsGeV === 0) ? "ABOVE-ALL-DRAWS" : e1?.v == null ? "NO-DATA" : "UNDEF"; };
function modeSummarise() {
  const rows = [], skipped = [], errors = [];
  for (const [id, kind, pred, pool] of PREREG.siblings) {
    const f = path.join(OUT, `${id}.json`);
    if (!fs.existsSync(f)) { errors.push({ id, error: "no result file" }); continue; }
    const r = JSON.parse(fs.readFileSync(f, "utf8"));
    if (r.skipped || r.error) { skipped.push({ id, why: r.skipped ?? r.error }); continue; }
    const D = r.halves.discover, C = r.halves.confirm, cd = D.cells.rigidL, cc = C.cells.rigidL, st = statusOf(cd, cc), P = pool ? PREREG.pools[pool] : null;
    const vbar = cd.v != null && cc.v != null ? (cd.v + cc.v) / 2 : null, mean2 = (a, b) => (a?.v != null && b?.v != null ? (a.v + b.v) / 2 : null);
    const mwt = r.meta.extra?.mwtTokens ?? null;
    rows.push({ id, kind, prediction: pred, pool, status: st, hit: hits(pred, st), tokens: r.meta.tokens, units: r.meta.units, docs: r.meta.docs, meanUnit: r.meta.meanUnit, mwtShare: mwt != null ? mwt / r.meta.tokens : null,
      discover: { v: cd.v, nullMean: cd.nullMean, nullSd: cd.nullSd, z: cd.z }, confirm: { v: cc.v, nullMean: cc.nullMean, nullSd: cc.nullSd, z: cc.z },
      vbar, poolMedian: P?.median ?? null, range: P ? [P.lo, P.hi] : null, inRange: P && vbar != null ? vbar >= P.lo && vbar <= P.hi : null, ratio: P && vbar != null ? vbar / P.median : null,
      eligL: [D.extras.eligL?.v ?? null, C.extras.eligL?.v ?? null], zbar: zbar(cd, cc),
      sameL: { status: statusOf(D.cells.sameL, C.cells.sameL), vbar: mean2(D.cells.sameL, C.cells.sameL), z: [D.cells.sameL.z, C.cells.sameL.z] }, rigidR: { status: statusOf(D.cells.rigidR, C.cells.rigidR), vbar: mean2(D.cells.rigidR, C.cells.rigidR), z: [D.cells.rigidR.z, C.cells.rigidR.z] },
      d1_hard: { state: hardState(D.extras.hardL, C.extras.hardL), vbar: mean2(D.extras.hardL, C.extras.hardL), z: [D.extras.hardL.z, C.extras.hardL.z], drawsGeV: [D.extras.hardL.drawsGeV, C.extras.hardL.drawsGeV] },
      d2_soft10: { status: statusOf(D.extras.soft10, C.extras.soft10), vbar: mean2(D.extras.soft10, C.extras.soft10) }, d2_soft25: { status: statusOf(D.extras.soft25, C.extras.soft25), vbar: mean2(D.extras.soft25, C.extras.soft25) },
      d3_bigramRep: { status: statusOf(D.extras.bigramRep, C.extras.bigramRep), vbar: mean2(D.extras.bigramRep, C.extras.bigramRep), zbar: zbar(D.extras.bigramRep, C.extras.bigramRep) } });
  }
  const A = rows.filter((r) => r.prediction === "PRESENT+"), B = rows.filter((r) => r.prediction === "ABSENT"), K = rows.filter((r) => r.prediction === "NOT-PRESENT");
  const nExpA = PREREG.siblings.filter((s) => s[2] === "PRESENT+").length, nExpB = PREREG.siblings.filter((s) => s[2] === "ABSENT").length;
  const hitsA = A.filter((r) => r.hit).length, hitsB = B.filter((r) => r.hit).length, scored = A.length + B.length, allHit = hitsA === A.length && hitsB === B.length && errors.length === 0;
  // duplicates (D8): a pair above dupMerge counts once for C1 (the smaller pocket is dropped from the correlation)
  const dupFile = path.join(HERE, "dupcheck.json"), dup = fs.existsSync(dupFile) ? JSON.parse(fs.readFileSync(dupFile, "utf8")) : null, drop = new Set((dup?.pairsAbove0_05pct ?? []).filter((x) => x.share > TH.dupMerge).map((x) => x.smaller));
  const A1 = A.filter((r) => r.vbar != null && !drop.has(r.id));
  const rho1 = spearman(A1.map((r) => r.vbar), A1.map((r) => r.poolMedian)), ordinary = A1.filter((r) => !["diagram", "smiles", "codons"].includes(r.pool)), rho2 = spearman(ordinary.map((r) => r.vbar), ordinary.map((r) => r.poolMedian));
  const ranged = rows.filter((r) => r.range && r.vbar != null), inR = ranged.filter((r) => r.inRange).length, rangeShare = ranged.length ? inR / ranged.length : null;
  const c1 = { rho: rho1, n: A1.length, dropped: [...drop], pass: rho1 != null && rho1 > TH.rho }, c2 = { inRange: inR, of: ranged.length, share: rangeShare, pass: rangeShare != null && rangeShare >= TH.rangeShare };
  const nPlus = A.filter((r) => r.status === "PRESENT+").length, nMinus = A.filter((r) => r.status === "PRESENT-").length, ctlBad = K.filter((r) => !r.hit);
  const failsRule = (A.length && nPlus / A.length < TH.failShare) || nMinus >= TH.reversalCount;
  const verdict = allHit && c1.pass && c2.pass && ctlBad.length === 0 ? "REPLICATES" : failsRule ? "FAILS" : "PARTIAL";
  const misses = rows.filter((r) => !r.hit).map((r) => ({ id: r.id, kind: r.kind, prediction: r.prediction, status: r.status, z: [r.discover.z, r.confirm.z], v: [r.discover.v, r.confirm.v], nullMean: [r.discover.nullMean, r.confirm.nullMean] }));
  // D-readouts
  const D1 = { states: A.reduce((m, r) => ((m[r.d1_hard.state] = (m[r.d1_hard.state] ?? 0) + 1), m), {}) };
  const cnt = (key, sub) => A.reduce((m, r) => ((m[r[key][sub]] = (m[r[key][sub]] ?? 0) + 1), m), {});
  const both = (f) => { const x = rows.filter((r) => f(r)[0] != null && f(r)[1] != null); return x; };
  const sp = (a, b, set = rows) => { const x = set.filter((r) => a(r) != null && b(r) != null); return { rho: round(spearman(x.map(a), x.map(b))), n: x.length }; };
  const D2 = { soft10: cnt("d2_soft10", "status"), soft25: cnt("d2_soft25", "status"), rhoSoft10: sp((r) => r.vbar, (r) => r.d2_soft10.vbar), rhoSoft25: sp((r) => r.vbar, (r) => r.d2_soft25.vbar) };
  const D3 = { status: cnt("d3_bigramRep", "status"), rhoZ: sp((r) => r.zbar, (r) => r.d3_bigramRep.zbar), rhoV: sp((r) => r.vbar, (r) => r.d3_bigramRep.vbar) };
  const D4 = { rhoRatioLogTokens: sp((r) => r.ratio, (r) => Math.log10(r.tokens), A), rhoRatioUnitLength: sp((r) => r.ratio, (r) => r.meanUnit, A), rhoVbarLogTokens: sp((r) => r.vbar, (r) => Math.log10(r.tokens), A), rhoVbarUnitLength: sp((r) => r.vbar, (r) => r.meanUnit, A) };
  const D5 = { sameLStatus: A.reduce((m, r) => ((m[r.sameL.status] = (m[r.sameL.status] ?? 0) + 1), m), {}), rigidRStatus: A.reduce((m, r) => ((m[r.rigidR.status] = (m[r.rigidR.status] ?? 0) + 1), m), {}), rhoSameL: sp((r) => r.vbar, (r) => r.sameL.vbar), rhoRigidR: sp((r) => r.vbar, (r) => r.rigidR.vbar) };
  const grp = A.filter((r) => r.vbar != null), cntBy = grp.reduce((m, r) => ((m[r.pool] = (m[r.pool] ?? 0) + 1), m), {}), g2 = grp.filter((r) => cntBy[r.pool] >= 2);
  const D6 = { raw: { ...permP(g2.map((r) => r.vbar), g2.map((r) => r.pool), TH.permutations), n: g2.length, levels: Object.keys(cntBy).filter((k) => cntBy[k] >= 2).length }, log: permP(g2.map((r) => Math.log(r.vbar)), g2.map((r) => r.pool), TH.permutations) };
  const byKind = {}; for (const r of rows) (byKind[r.pool ?? r.kind] ??= []).push(r);
  const kinds = Object.fromEntries(Object.entries(byKind).map(([k, xs]) => [k, { n: xs.length, hits: xs.filter((r) => r.hit).length, vbarMin: round(Math.min(...xs.map((r) => r.vbar ?? Infinity))), vbarMedian: round(median(xs.map((r) => r.vbar).filter((x) => x != null))), vbarMax: round(Math.max(...xs.map((r) => r.vbar ?? -Infinity))), poolMedian: xs[0].poolMedian, inRange: xs.filter((r) => r.inRange).length }]));
  const result = { stat: PREREG.stat, preregHeaderSha256: fs.readFileSync(path.join(HERE, "prereg.sha256"), "utf8").split(" ")[0], verdict, scored: { A: A.length, B: B.length, K: K.length, expectedA: nExpA, expectedB: nExpB }, notScored: { fromPrereg: PREREG.notScored, thinOrError: skipped, missing: errors },
    existence: { hitsA, nA: A.length, hitsB, nB: B.length, shareA: A.length ? hitsA / A.length : null, presentPlusA: nPlus, presentMinusA: nMinus, universalThreshold: TH.universal, planThreshold: TH.plan, pAtLeastObsIfRate85: binomTail(A.length, nPlus, 0.85), pAtLeastObsIfRate95: binomTail(A.length, nPlus, 0.95), misses, controlsNotAbsent: ctlBad.map((r) => ({ id: r.id, status: r.status })) },
    constant: { C1: c1, C1ordinary: { rho: rho2, n: ordinary.length }, C2: c2, kinds }, adversary: { D1_hardShare: D1, D2_softWidth: D2, D3_bigramRival: D3, D4_sizeUnitLength: D4, D5_collinearity: D5, D6_constantByClass: D6, dupcheck: dup ? { pairsAbove2pct: dup.pairsAbove0_05pct.filter((x) => x.share > TH.dupPair) } : "not run" },
    siblings: rows };
  fs.writeFileSync(path.join(HERE, "confirm-result.json"), JSON.stringify(result, null, 1));
  console.log(`VERDICT ${verdict}: A ${hitsA}/${A.length} PRESENT+ (PRESENT- ${nMinus}), B ${hitsB}/${B.length} ABSENT as predicted, controls bad ${ctlBad.length}; C1 rho ${round(rho1)} (ordinary ${round(rho2)}), C2 ${inR}/${ranged.length}; skipped ${skipped.length}, missing ${errors.length}`);
  for (const r of rows) console.log(`${r.id.padEnd(28)} ${r.kind.padEnd(14)} ${r.prediction.padEnd(11)} ${r.status.padEnd(9)} ${r.hit ? "hit " : "MISS"} z ${String(round(r.discover.z, 1)).padStart(8)} ${String(round(r.confirm.z, 1)).padStart(8)}  v ${String(round(r.discover.v)).padStart(7)} ${String(round(r.confirm.v)).padStart(7)}  pool ${r.poolMedian ?? "-"} ${r.inRange == null ? "" : r.inRange ? "in" : "OUT"}`);
}
const MAIN = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (MAIN) { const mode = argv[0]; if (mode === "pockets") await modePockets(); else if (mode === "selfcheck") await modeSelfCheck(); else if (mode === "dupcheck") await modeDup(); else if (mode === "summarise") modeSummarise(); else console.error("usage: node confirm.mjs pockets|selfcheck|dupcheck|summarise"); }
