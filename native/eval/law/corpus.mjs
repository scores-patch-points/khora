// eval/law/corpus.mjs — the CORPUS LAYER of the LAW-FALSIFICATION instrument.
// Design of record: docs/LAW-FALSIFICATION.md, revision 2 (sha256 7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2),
// sections 2.1, 2.2, 3, 7 and Appendix B. Where this header and that document disagree the document wins and this file is the bug.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PRE-REGISTRATION (READING-POLICY II.5, II.23, II.4). Written BEFORE any code below and BEFORE any run of it. Nothing in
// this header is edited after the first run; a defect found later is fixed in the code under a new code hash and reported
// next to the original smoke, never in place of it.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT THIS MODULE IS. A data layer. It turns CoNLL-U treebanks (and the code, notation and coreference gold that other
// workflows produce) into (a) a gold-free TOKEN STREAM, (b) a PARALLEL GOLD ARRAY, (c) the LANGUAGE-FAMILY PARTITIONS used for
// leave-one-family-out, (d) seeded, nested samples, and (e) the exposure strata H0/H1/H2. It contains no learner, no company
// arm, no impact signature, no reader and no model; khora is a ZERO-MODEL reader and so is this file. It tests no hypothesis
// about the law. Its only claims are about itself (the pass rule below). What it hands to the arms is exactly what rule 6 of
// the law's design allows: identities and sentence boundaries to the features, labels only to the scorer.
//
// DEFINITIONS (each is a pre-registered choice; the given is the design section named).
//  D1 WORD (2.1). A CoNLL-U row whose first field is a plain integer. Multiword-token ranges ("1-2") and empty nodes ("1.1")
//     are skipped and COUNTED (their parts are the words). A row with fewer than 10 tab-separated fields, or a non-integer ID
//     that is neither a range nor an empty node, is MALFORMED: skipped, counted, the first 20 recorded with their line number
//     (a typed gap about the file, never silently dropped). Sentence boundaries are the treebank's own (blank lines);
//     `# newdoc` opens a document (T6e needs document order); `# sent_id` and `# text` are kept for provenance only.
//  D2 STREAM (2.1, heard rule S1/S2). The stream of a sentence is its words with PUNCT removed. DEFAULT punct:"upos": a word is
//     removed iff its UPOS is PUNCT (the design's literal rule). This is a disclosed use of one gold value to decide what is
//     SCRIPT (it removes tokens, it never labels the survivors); the honest heard-only variant punct:"unicode" removes a word
//     iff every character is Unicode general category P* (never reads a label) and the smoke reports how far the two agree.
//     The IDENTITY of a unit is form.normalize("NFC").toLowerCase() (case is not company: S1). The READ variant (heard:false)
//     keeps PUNCT words as units and keeps case in the identity (the design's labelled sensitivity "READ"; never a verdict).
//     The stream object carries forms, identities, sentence boundaries and UD word ids ONLY. It carries no label, and
//     streamDigest(stream) is a sha256 of exactly that content so G3 can assert hash-identity.
//  D3 GOLD (2.1). GOLD[sentence][i] = {upos, deprel, deprelBase, head, feats, wordId, inE}, parallel to the stream (same
//     selection predicate, same order). head is the STREAM index of the head word in the same sentence, -1 for the root, null
//     when the head word was removed (PUNCT) or absent. deprelBase strips the subtype ("nsubj:pass" -> "nsubj"). Gold is for
//     the scorer and for stratifying evaluation; it is never an input of any feature (rule 6).
//  D4 EVALUATION SET E AND GRAINS (2.2). E = stream units whose UPOS is in UPOS14 = {ADJ ADP ADV AUX CCONJ DET INTJ NOUN NUM
//     PART PRON PROPN SCONJ VERB}; PUNCT, SYM, X and "_" stay in the stream as context and are not evaluated. Grains:
//     G1 UPOS14; G2 nominal (NOUN|PROPN) vs the other twelve; G3 PROPN vs NOUN among nominals; G4 DEPREL base label, restricted
//     to the universal labels holding at least 0.5 percent of the POOLED, N_cap-capped train evaluation tokens of the frozen
//     set (deprelLabelSet; derived from counts, not typed). CLOSED_UPOS = {ADP AUX CCONJ DET PART PRON SCONJ}, OPEN_UPOS =
//     {ADJ ADV INTJ NOUN NUM PROPN VERB} (2.10 section 10; they partition UPOS14).
//  D5 FAMILIES (3.1). The 41 frozen stems are those of design 3.1 (cmn and cmn-hans are the same sentences in two scripts: the
//     language counts ONCE, as cmn-hans; cmn is the bijection/script CONTROL only). Strict families: Indo-European 29,
//     Uralic 3, Afro-Asiatic 2, Turkic, Japonic, Koreanic, Sinitic, Austronesian, Austroasiatic, Basque (isolate), 1 each.
//     GIVER: Glottolog 5 top-level family names, cross-read with the WALS family field; the assignment of every stem was
//     TRANSCRIBED by the author of this file (an LLM) from those published classifications, with no network lookup at write
//     time. It is a declaration, not a measurement; tests/law-corpus.test.js pins it to the design's 3.1 table so any drift
//     from the design fails, and a reviewer must check the transcription against the giver. Sinitic is a branch of Sino-Tibetan
//     in Glottolog and the family of Mandarin in WALS; with one member in the frozen set the fold is the same either way.
//     LATE RESERVE: any stem in ud-eval that is not in the frozen list (afr cym gle kat lzh mar mlt tam tel uig wol at the time
//     of writing) is reserved for a v3 and listed apart; it is never in P1/P2/P3; kat (Kartvelian), tam, tel (Dravidian) and
//     wol (Niger-Congo) would be NEW families.
//  D6 PARTITIONS (3.3). P1: ten folds, hold out one strict family in turn, train on the capped train of every frozen stem
//     outside it. P2: hold out one Indo-European branch of {Germanic Romance Slavic Baltic Indo-Iranian Hellenic}, train on
//     every other frozen stem (hye is Indo-European but its Armenian branch is not in the design's list, so it is never held
//     out in P2). P3: hold out one script group of {Latin, Cyrillic, Arabic-script {arb fas urd}, Devanagari {hin}, Hebrew,
//     Greek, Han/Kana/Hangul {cmn-hans jpn kor}} and ARMENIAN {hye}: the design's list omits the Armenian script, so hye
//     would belong to no group; it is added here as a group of its own, as a declared COMPLETION of the list (recorded, not a
//     deviation). Every fold has heldOut and train disjoint; across a partition's folds the held-out sets are disjoint and
//     cover exactly the stems the partition covers. CODE folds (3.4): leave one of the six code families out. COREF folds
//     (3.5): leave one of five families out (Indo-European, Uralic, Turkic, Koreanic, Afro-Asiatic).
//  D7 N_CAP AND capSample (3.2). N_cap = 20,000 TOKENS, where a token is a SYNTACTIC WORD INCLUDING PUNCT: that is the unit in
//     which the design's census reads "hun 20,166 tokens" (unit:"word"; reproduced by the smoke), so N_cap = 20,000 is the
//     floor of the smallest train split. The stream-unit count of a sample is smaller (punctuation share differs by
//     language) and is reported beside it (a limit: the cap equalises words, not stream units). capSample = the LONGEST PREFIX
//     of a seeded permutation of the sentences whose total is at most nCap (stop before the first sentence that would
//     overflow; no skipping), returned in permutation order together with the original indices. seed = seedFor(stem, "train",
//     "cap"); seedFor(...parts) = first 32 bits of sha256("khora-law-v2" 0x1f parts joined by 0x1f) (2.10, section 10).
//  D8 exposureFractions (T2). Nested sentence prefixes of a seeded permutation at fractions f (default 1/64 ... 1): the
//     longest prefix whose word count is at most f * total, with AT LEAST ONE sentence (so for a tiny f the realised fraction
//     can exceed f; `realised` is returned). Prefix(f) is a prefix of Prefix(f') for f < f' by construction.
//  D9 EXPOSURE AND STRATA (T4, T2 descriptive). exposureCounts(train sentences) = identity counts of the unlabelled train forms
//     (labels never read; punct per D2). For an evaluation stream, per token (s, i): nTrain = exposure count; nSeen = nTrain
//     + the occurrences of the identity in sentences before s + the occurrences at positions before i in s (Q at READ time;
//     causal); nStream = the occurrence count in the WHOLE stream (a SELECTOR only: it chooses which tokens are evaluated, no
//     feature may use it; named `selector*` fields say so); oovTrain = nTrain == 0. H0 (first sight) = nSeen == 0. H1 (true
//     hapax) = nTrain == 0 and nStream == 1. H2 = not H0 (seen at read time; the control stratum). H1 is a subset of H0 by
//     construction. nbin = 0 for nSeen = 0, else floor(log2 nSeen) + 1 (descriptive table only).
//  D10 SEEDS. Every random choice here is a pure function of seedFor(...) and a mulberry32 stream; no Math.random anywhere.
//  D11 TYPOLOGY COVARIATES (T3; covariates, never features). MR = types / units of the stream of the N_cap train sample (stem
//     seed D7); `mrEqual` = the same at the first MR_EQUAL_UNITS = 15000 stream units of that sample (a labelled size-equalised
//     sensitivity; the primary is MR). unspacedShare = share of the sample's forms containing a character of an unspaced script
//     (Han, Hiragana, Katakana, Thai, Lao, Khmer, Myanmar: the test of adapters/text/script-segment.js::isUnspacedScript,
//     copied here as a regex and PINNED to the repo's function by a test); UNSPACED_FROZEN = {cmn-hans, jpn} is the design's
//     frozen stratum and the smoke checks the computed share against it. WOF = entropy in bits of the order of {subject, head,
//     object} over the head words of the (full) train split that have both an nsubj (base) and an obj (base) dependent, one of
//     six orders; fewer than 50 such clauses is the typed gap `wof_sparse`. The T3 strata (unspaced, agglutinative, inflected
//     fusional, templatic) are frozen here from design T3.
//  D12 DOCUMENT ORDER (T6e). docs = number of `# newdoc` markers; meanSentencesPerDoc. orderEligible = docs >= 100 and
//     meanSentencesPerDoc >= 2 (Appendix B); anything else is UNTESTED(no document order) in T6e.
//  D13 CODE ADAPTER (3.4). codeCorpus({split}) reads /private/tmp/claude-501/code-corpus/manifest.json (split BY REPOSITORY, the
//     manifest's own rule) and groups the 51 languages into the six frozen code families of 3.4 (the union equals the
//     manifest's language set; a language outside the table is a typed gap). `restricted` files (copyleft, the user's own
//     unlicensed repository) are excluded unless unrestrictedOnly:false. Token inventory and classes come from
//     eval/coding-competence/gold.mjs (dynamic import; absent -> typed gap). A code unit's identity is its NFC form with case
//     KEPT (case is part of an identifier; the text rule of D2 would merge Foo and foo); comment and string tokens are atomic.
//     The stream of a code file is the gold tokens in order and ONE "sentence" is one file (no boundary is invented: the
//     design says only "gold tokens in order"); unit:"line" (a sentence per source line) is a labelled sensitivity.
//     G5 label = gold class (primary {keyword identifier type literal}; operator punctuation comment string are lexically
//     delimited and reported apart); G6 label = declared name (identifier token whose span is a def name of a CORE kind) vs the
//     other identifiers.
//  D14 NOTATION ADAPTER (3.4). notationCorpus() accepts only JSONL files whose first 20 records ALL satisfy
//     {system:string, family:string, split in {train,dev,test}, doc:string, tokens:[{form:string, role:string}]}; none ->
//     {available:false, gap:"no gold yet"}. Candidates that fail are listed with the reason; never inferred.
//  D15 COREF ADAPTER (3.5). corefCorpus({split}) reads CorefUD CoNLL-U (.conllu or .conllu.gz) under
//     /private/tmp/claude-501/physics/coref/CorefUD_<Treebank>/<code>-corefud-{train,dev}.conllu[.gz]. Split rule when no blind
//     test exists: the documents of a CorefUD TRAIN file are divided 80/20 by sha256 of the document id (first 8 hex digits as
//     an integer, modulo 5: 0-3 -> "train", 4 -> "dev"); the CorefUD DEV file is T11's "test". Mentions come from the Entity=
//     attribute of the MISC column; a mention's head is the UD head of its span (the word whose HEAD lies outside the span,
//     first such), its type is derived from that head only (PROPN -> name; PRON or DET -> pronoun; else nominal); empty-node
//     (zero) mentions are skipped and counted. Directories that are not CorefUD CoNLL-U (GOLEMcoref, KoCoNovel, SentiCoref) are
//     typed gaps `not_corefud_contract`. This workflow does not fetch coreference gold.
//  D16 CACHING AND READ LOG. parsed files are memoised in-process by (path, size, mtimeMs) in a small LRU (default 6 files);
//     cached sentence arrays are READ-ONLY by contract. Every file this module reads is appended to readLog(); the read guard
//     (setReadGuard({forbidTest:true}) or env LAW_FORBID_TEST=1) makes any attempt to read a held-out TEST file (ud-eval
//     .../test.conllu, a CorefUD *-dev file) throw. The smoke arms the guard.
//  D17 TYPED GAPS. A missing file, a malformed row, a language without a family, a manifest language outside the family table,
//     an unavailable gold extractor, an absent notation or coreference corpus is returned as {gap, reason, ...} with the
//     denominator; the module never imputes and never substitutes. "Untested" is never "supported".
//
// NULLS AND CONTROLS BUILT TO FAIL (each is an assertion in tests/law-corpus.test.js).
//  C1 Gold-free stream: permuting the UPOS/DEPREL/HEAD/FEATS columns of the INPUT sentences leaves streamDigest identical under
//     punct:"unicode" and CHANGES it under punct:"upos" (the one disclosed dependency of D2: the control fails exactly where
//     it must); goldOf under the permutation DOES change.
//  C2 Partition leak: checkPartition on a planted partition with one held-out family member also in train MUST report a violation;
//     on P1, P2, P3, CODE and COREF it must report none; a planted partition missing a stem must report the coverage violation.
//  C3 Causality of the strata: nSeen and h0 of every token are invariant when all later sentences are replaced; h1/nStream are
//     NOT (a later repeat of a train-absent type moves a token out of H1), which is asserted so the selector cannot be mistaken
//     for a causal feature.
//  C4 Nestedness: exposureFractions prefixes are nested; a deliberately non-nested implementation (independent resamples) is run
//     through the same checker and MUST fail it.
//  C5 Rows: ranges and empty nodes are never words; a planted toy with ranges, empty nodes, malformed rows, a missing final blank
//     line, CRLF and a gzip copy must give exactly the hand-counted words, skips and stream units.
//  C6 Read guard: with the guard armed a test path throws; the smoke asserts readLog() holds no held-out TEST file.
//  C7 isUnspacedScript pin: the local regex equals the repo's function on a probe set of Han, kana, Thai, Latin, Hangul, digits.
//  POWER CHECK. The planted toy has known answers for every statistic above (sentences, words, PUNCT, ranges, units, E, H0, H1,
//  nbin, capSample total, the fold sets) so a wrong implementation moves a number the test knows; the checks above are the
//  instrument's detection of planted structure (a leak, a non-nested sample, a mis-skipped row).
//
// PASS RULE. The module is correct iff every assertion of tests/law-corpus.test.js passes and the DEV smoke satisfies:
//  S1 all 41 frozen stems have train, dev and test files PRESENT (existence only; the test files are never opened) and train
//     and dev parse with zero malformed rows beyond a declared 0.1 percent of rows (any excess is reported per stem, not hidden);
//  S2 train word counts reproduce the census (Appendix B: hun 20166, vie 20215, tur 37522, ell 42326, lit 47641, kor 56687);
//  S3 the declared script of every frozen stem equals the dominant script of its dev letters (jpn/cmn-hans/kor compared as the
//     Han/Kana/Hangul group);
//  S4 H1 is a subset of H0 and nSeen is monotone in reading order on every stem;
//  S5 UPOS14 covers at least 90 percent of the non-PUNCT words of every stem, and punct:"upos" agrees with punct:"unicode" on at
//     least 95 percent of words (a lower figure is reported as the size of the disclosed dependency, not hidden);
//  S6 readLog() contains no held-out TEST file;
//  S7 the family table's frozen part equals design 3.1 and covers every frozen stem exactly once.
//  A violated S-check is a FINDING reported as such; it is never repaired by editing this header.
//
// PREDICTIONS (recorded before the first smoke; scored after). P1 S1-S7 all hold on the frozen set. P2 the unspaced share is
//  above 0.5 for cmn-hans and jpn and below 0.05 for every other frozen stem. P3 the punct agreement of S5 is at or above 99
//  percent in every frozen stem (UD's PUNCT is almost always all-punctuation characters). P4 dev true-hapax (H1) counts are at
//  least 200 in all but at most three frozen stems (small dev splits). P5 the late reserve afr cym gle kat lzh mar mlt tam tel
//  uig wol all have train, dev and test present. P6 the code families partition the manifest's 51 languages exactly. P7 the
//  coreference adapter finds CoNLL-U chain files (the manifest-only state of design revision 2 has been superseded) and parses
//  Entity= with no unmatched close in at least 99 percent of the documents of the treebanks the smoke touches.
//  The census cross-check S2 was done by `awk` on six train files while reading the design (before this file existed): the
//  six counts above are what the awk gave; the module re-derives them.
//
// DISCLOSURES / LIMITS KNOWN IN ADVANCE.
//  · UD word boundaries and CorefUD mention spans are human gold segmentation; for unspaced scripts this supplies boundary
//    information a heard-only system would have to earn (design 2.1, R5; the character-grain arm lives elsewhere).
//  · punct:"upos" reads one gold value (is-PUNCT) to delete tokens (D2).
//  · The family classification is a transcription (D5); P3's Armenian group is a completion (D6).
//  · N_cap equalises syntactic words including PUNCT, not stream units (D7).
//  · cmn and cmn-hans are not independent; the language counts once (D5).
//  · Parallel test sets (PUD) are not independent across languages (design risk R7): a property of the data, not of this module.
//  · UD annotation conventions differ by treebank; UPOS is partly lexical (favours FORM) and DEPREL relational (favours COMPANY):
//    both grains are provided so no verdict rests on one (design 2.2).
//  · The code gold extractor was corrected while looking at DEV files (its own header): only TEST repositories are blind.
//  · The smoke runs on DEV (and the train splits that exposure needs) only. No TEST split is read by this file's smoke or tests.

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// CODE. Plain ESM, node >= 20, built-ins only. The repo is not imported (G4: no forbidden module can be reached from here);
// the only cross-file reads are dynamic: eval/coding-competence/gold.mjs (code gold, D13).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

// ── declared constants (every one has its giver in the header or the design) ─────────────────────────────────────────
export const DESIGN_DOC = "docs/LAW-FALSIFICATION.md";
export const DESIGN_SHA256 = "7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2";
export const SEED_DOMAIN = "khora-law-v2";                       // 2.10, section 10
export const N_CAP = 20000;                                       // 3.2: floor of the smallest train split (hun, 20,166 words)
export const DEFAULT_FRACTIONS = Object.freeze([1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1]);   // T2, section 10
export const MR_EQUAL_UNITS = 15000;                              // D11 size-equalised sensitivity
export const WOF_MIN_CLAUSES = 50;                                // D11
export const DEPREL_MIN_SHARE = 0.005;                            // D4 (G4: 0.5 percent of pooled train tokens)
export const MAX_MALFORMED_SHARE = 0.001;                         // S1
export const NOTATION_VALIDATE_RECORDS = 20;                      // D14
export const COREF_DEV_BUCKETS = 5;                               // D15: bucket 4 of 5 -> "dev" (20 percent)
export const CACHE_BUDGET_BYTES = 300 * 1024 * 1024;              // D16: source bytes held parsed at once

export const ROOTS = Object.freeze({
  tb: "/private/tmp/claude-501/tb",                // TRAIN: <stem>/train.conllu
  ud: "/private/tmp/claude-501/ud-eval",           // DEV and TEST: <stem>/{dev,test}.conllu
  code: "/private/tmp/claude-501/code-corpus",
  notation: "/private/tmp/claude-501/notation",
  coref: "/private/tmp/claude-501/physics/coref",
  law: "/private/tmp/claude-501/law",
});
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CODE_GOLD_MODULE = path.join(HERE, "..", "coding-competence", "gold.mjs");
export const NOTATION_LOCAL = path.join(HERE, "..", "notation-competence");
/** Stems whose train directory is not named after the stem (the design: Korean train is tb/kor-gsd, matching ud-eval/kor). */
export const TRAIN_DIR_OF = Object.freeze({ kor: "kor-gsd" });

// ── UPOS sets (D4, 2.1, 2.10 section 10) ────────────────────────────────────────────────────────────────────────────
export const UPOS14 = Object.freeze(["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "SCONJ", "VERB"]);
export const CLOSED_UPOS = Object.freeze(["ADP", "AUX", "CCONJ", "DET", "PART", "PRON", "SCONJ"]);
export const OPEN_UPOS = Object.freeze(["ADJ", "ADV", "INTJ", "NOUN", "NUM", "PROPN", "VERB"]);
const UPOS14_SET = new Set(UPOS14);
/** The 37 universal DEPREL labels (UD v2); G4 keeps those holding at least DEPREL_MIN_SHARE of the pooled train evaluation tokens. */
export const UD_DEPRELS = Object.freeze(["acl", "advcl", "advmod", "amod", "appos", "aux", "case", "cc", "ccomp", "clf", "compound", "conj", "cop",
  "csubj", "dep", "det", "discourse", "dislocated", "expl", "fixed", "flat", "goeswith", "iobj", "list", "mark", "nmod", "nsubj", "nummod", "obj",
  "obl", "orphan", "parataxis", "punct", "reparandum", "root", "vocative", "xcomp"]);
const UD_DEPRELS_SET = new Set(UD_DEPRELS);
/** The grains of 2.2 that live in text (G5, G6 live in the code adapter, G7 in the coreference adapter). */
export const GRAINS = Object.freeze({
  G1: "token role (UPOS14)",
  G2: "being versus non-being (NOUN or PROPN versus the other twelve)",
  G3: "kind (PROPN versus NOUN among nominal tokens)",
  G4: "clause role (DEPREL base label, restricted to the derived universal label set)",
});

// ── seeds (D10): a pure function of sha256, never Math.random ──────────────────────────────────────────────────────
export function seedHexFor(...parts) {
  return createHash("sha256").update([SEED_DOMAIN, ...parts.map(String)].join("\x1f")).digest("hex");
}
/** uint32 seed = first 32 bits of sha256("khora-law-v2" 0x1f parts...). */
export function seedFor(...parts) {
  return parseInt(seedHexFor(...parts).slice(0, 8), 16) >>> 0;
}
export function mulberry32(a) {
  let s = a >>> 0;
  return function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function rngFor(...parts) { return mulberry32(seedFor(...parts)); }
/** A seeded Fisher-Yates permutation of 0..n-1. */
export function permutation(n, seed) {
  const idx = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  const rnd = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  return idx;
}

// ── the language registry and the family partition (D5, D6; design 3.1) ────────────────────────────────────────────
// [stem, family (design label), branch, Glottolog top-level family, WALS family field, script group, role]
// role: frozen = in the 41 of 3.1; control = cmn (script/bijection control, same sentences as cmn-hans); late = reserve (3.2).
// TRANSCRIBED by the author of this file from the giver's published classification (header D5); null = not recalled.
const ROWS = [
  ["eng", "Indo-European", "Germanic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["deu", "Indo-European", "Germanic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["nld", "Indo-European", "Germanic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["swe", "Indo-European", "Germanic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["dan", "Indo-European", "Germanic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["nob", "Indo-European", "Germanic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["spa", "Indo-European", "Romance", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["fra", "Indo-European", "Romance", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["ita", "Indo-European", "Romance", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["por", "Indo-European", "Romance", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["ron", "Indo-European", "Romance", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["cat", "Indo-European", "Romance", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["glg", "Indo-European", "Romance", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["rus", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Cyrillic", "frozen"],
  ["ukr", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Cyrillic", "frozen"],
  ["bul", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Cyrillic", "frozen"],
  ["pol", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["ces", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["slk", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["slv", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["hrv", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["srp", "Indo-European", "Slavic", "Indo-European", "Indo-European", "Latin", "frozen"],   // UD Serbian SET is written in Latin (seen in the file head)
  ["lav", "Indo-European", "Baltic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["lit", "Indo-European", "Baltic", "Indo-European", "Indo-European", "Latin", "frozen"],
  ["hin", "Indo-European", "Indo-Iranian", "Indo-European", "Indo-European", "Devanagari", "frozen"],
  ["urd", "Indo-European", "Indo-Iranian", "Indo-European", "Indo-European", "Arabic", "frozen"],
  ["fas", "Indo-European", "Indo-Iranian", "Indo-European", "Indo-European", "Arabic", "frozen"],
  ["ell", "Indo-European", "Hellenic", "Indo-European", "Indo-European", "Greek", "frozen"],
  ["hye", "Indo-European", "Armenian", "Indo-European", "Indo-European", "Armenian", "frozen"],
  ["fin", "Uralic", "Finnic", "Uralic", "Uralic", "Latin", "frozen"],
  ["est", "Uralic", "Finnic", "Uralic", "Uralic", "Latin", "frozen"],
  ["hun", "Uralic", "Ugric", "Uralic", "Uralic", "Latin", "frozen"],
  ["arb", "Afro-Asiatic", "Semitic", "Afro-Asiatic", "Afro-Asiatic", "Arabic", "frozen"],
  ["heb", "Afro-Asiatic", "Semitic", "Afro-Asiatic", "Afro-Asiatic", "Hebrew", "frozen"],
  ["tur", "Turkic", "Oghuz", "Turkic", "Altaic", "Latin", "frozen"],
  ["jpn", "Japonic", "Japanesic", "Japonic", "Japanese", "HanKanaHangul", "frozen"],
  ["kor", "Koreanic", "Koreanic", "Koreanic", "Korean", "HanKanaHangul", "frozen"],
  ["cmn-hans", "Sinitic", "Mandarin", "Sino-Tibetan", "Sino-Tibetan", "HanKanaHangul", "frozen"],
  ["ind", "Austronesian", "Malayo-Polynesian", "Austronesian", "Austronesian", "Latin", "frozen"],
  ["vie", "Austroasiatic", "Vietic", "Austroasiatic", "Austro-Asiatic", "Latin", "frozen"],
  ["eus", "Basque", "Basque", "Basque", "Basque", "Latin", "frozen"],
  ["cmn", "Sinitic", "Mandarin", "Sino-Tibetan", "Sino-Tibetan", "HanKanaHangul", "control"],
  ["afr", "Indo-European", "Germanic", "Indo-European", "Indo-European", "Latin", "late"],
  ["cym", "Indo-European", "Celtic", "Indo-European", "Indo-European", "Latin", "late"],
  ["gle", "Indo-European", "Celtic", "Indo-European", "Indo-European", "Latin", "late"],
  ["mar", "Indo-European", "Indo-Iranian", "Indo-European", "Indo-European", "Devanagari", "late"],
  ["mlt", "Afro-Asiatic", "Semitic", "Afro-Asiatic", "Afro-Asiatic", "Latin", "late"],
  ["uig", "Turkic", "Karluk", "Turkic", "Altaic", "Arabic", "late"],
  ["lzh", "Sinitic", "Literary Chinese", "Sino-Tibetan", null, "HanKanaHangul", "late"],
  ["kat", "Kartvelian", "Georgian-Zan", "Kartvelian", "Kartvelian", "Georgian", "late"],
  ["tam", "Dravidian", "South Dravidian", "Dravidian", "Dravidian", "Tamil", "late"],
  ["tel", "Dravidian", "South-Central Dravidian", "Dravidian", "Dravidian", "Telugu", "late"],
  ["wol", "Niger-Congo", "Atlantic", "Atlantic-Congo", "Niger-Congo", "Latin", "late"],
];
export const FAMILY_GIVER = "Glottolog 5 top-level family names cross-read with the WALS family field; transcribed by the author of this file (no network lookup at write time); family labels follow design 3.1 (Sinitic is a branch of Sino-Tibetan; Niger-Congo is Glottolog's Atlantic-Congo). A declaration, pinned to the design table by tests/law-corpus.test.js.";

export const LANGUAGES = Object.freeze(Object.fromEntries(ROWS.map(([stem, family, branch, glottolog, wals, scriptGroup, role]) =>
  [stem, Object.freeze({ stem, family, branch, glottolog, wals, scriptGroup, role })])));
export const FAMILY_OF = Object.freeze(Object.fromEntries(ROWS.map((r) => [r[0], r[1]])));
export const FROZEN_STEMS = Object.freeze(ROWS.filter((r) => r[6] === "frozen").map((r) => r[0]).sort());
export const CONTROL_STEMS = Object.freeze(ROWS.filter((r) => r[6] === "control").map((r) => r[0]).sort());
export const LATE_STEMS = Object.freeze(ROWS.filter((r) => r[6] === "late").map((r) => r[0]).sort());
export const FAMILIES = Object.freeze(["Indo-European", "Uralic", "Afro-Asiatic", "Turkic", "Japonic", "Koreanic", "Sinitic", "Austronesian", "Austroasiatic", "Basque"]);
export const IE_BRANCHES_P2 = Object.freeze(["Germanic", "Romance", "Slavic", "Baltic", "Indo-Iranian", "Hellenic"]);
export const SCRIPT_GROUPS_P3 = Object.freeze(["Latin", "Cyrillic", "Arabic", "Devanagari", "Hebrew", "Greek", "HanKanaHangul", "Armenian"]);

/** The T3 strata (design T3, frozen). The free-order proxy is the top tercile of WOF, computed. */
export const T3_STRATA = Object.freeze({
  unspaced: Object.freeze(["cmn-hans", "jpn"]),
  agglutinative: Object.freeze(["tur", "fin", "hun", "est", "kor", "eus"]),
  inflected: Object.freeze(["rus", "ukr", "pol", "ces", "slk", "slv", "hrv", "srp", "bul", "lav", "lit", "ell"]),
  templatic: Object.freeze(["arb", "heb"]),
});
export const UNSPACED_FROZEN = T3_STRATA.unspaced;

/** Code families (design 3.4). The union is the code-corpus manifest's 51 languages (asserted by the smoke and a test). */
export const CODE_FAMILIES = Object.freeze({
  "Algol/C-like": Object.freeze("c cpp objc c_sharp java kotlin scala groovy dart go rust swift zig nim solidity javascript typescript tsx php".split(" ")),
  "ML/proof": Object.freeze("ocaml haskell elm lean".split(" ")),
  "Lisp": Object.freeze("clojure commonlisp scheme racket".split(" ")),
  "Dynamic/scripting": Object.freeze("python ruby lua perl bash powershell r julia matlab elixir erlang".split(" ")),
  "Legacy/hardware": Object.freeze("fortran cobol verilog".split(" ")),
  "Data/markup/query": Object.freeze("json yaml toml css html markdown latex sql vue svelte".split(" ")),
});
/** Coreference families (design 3.5): five folds, by the language code that starts a CorefUD file name. */
export const COREF_FAMILIES = Object.freeze({
  "Indo-European": Object.freeze("ca cs de en es fr grc hi la lt nl no pl ru cu".split(" ")),   // grc Ancient Greek, la Latin, cu Old Church Slavonic included (3.5)
  "Uralic": Object.freeze(["hu"]),
  "Turkic": Object.freeze(["tr"]),
  "Koreanic": Object.freeze(["ko"]),
  "Afro-Asiatic": Object.freeze(["hbo"]),
});

function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}

/**
 * A leave-one-group-out partition. universe = the units trained on outside the fold; covers = the units that are held out in some fold;
 * groupOf: unit -> group (null = never held out); one fold per group, heldOut = the group's units, train = universe minus heldOut.
 */
export function buildPartition({ id, name, giver, universe, covers, groupOf, groupOrder }) {
  const folds = groupOrder.filter((g) => covers.some((u) => groupOf[u] === g)).map((g) => {
    const heldOut = covers.filter((u) => groupOf[u] === g).slice().sort();
    const train = universe.filter((u) => !heldOut.includes(u));
    return { id: `${id}:${g}`, group: g, heldOut, train };
  });
  return deepFreeze({ id, name, giver, universe: universe.slice(), covers: covers.slice(), groupOf: { ...groupOf }, groupOrder: groupOrder.slice(), folds });
}

const groupMap = (stems, f) => Object.fromEntries(stems.map((s) => [s, f(s)]));

export const PARTITION_P1 = buildPartition({
  id: "P1", name: "strict families (leave one family out)", giver: FAMILY_GIVER,
  universe: FROZEN_STEMS, covers: FROZEN_STEMS, groupOf: groupMap(FROZEN_STEMS, (s) => FAMILY_OF[s]), groupOrder: FAMILIES,
});
export const PARTITION_P2 = buildPartition({
  id: "P2", name: "Indo-European branch out (easier rung, labelled)", giver: FAMILY_GIVER,
  universe: FROZEN_STEMS,
  covers: FROZEN_STEMS.filter((s) => FAMILY_OF[s] === "Indo-European" && IE_BRANCHES_P2.includes(LANGUAGES[s].branch)),
  groupOf: groupMap(FROZEN_STEMS, (s) => (FAMILY_OF[s] === "Indo-European" && IE_BRANCHES_P2.includes(LANGUAGES[s].branch) ? LANGUAGES[s].branch : null)),
  groupOrder: IE_BRANCHES_P2,
});
export const PARTITION_P3 = buildPartition({
  id: "P3", name: "script group out (Armenian added as a declared completion of the design's list)", giver: FAMILY_GIVER,
  universe: FROZEN_STEMS, covers: FROZEN_STEMS, groupOf: groupMap(FROZEN_STEMS, (s) => LANGUAGES[s].scriptGroup), groupOrder: SCRIPT_GROUPS_P3,
});
const CODE_LANGS = Object.values(CODE_FAMILIES).flat();
const CODE_FAMILY_OF = Object.freeze(Object.fromEntries(Object.entries(CODE_FAMILIES).flatMap(([f, ls]) => ls.map((l) => [l, f]))));
export const PARTITION_CODE = buildPartition({
  id: "CODE", name: "leave one code family out", giver: "design 3.4 (a conventional grouping fixed before any run)",
  universe: CODE_LANGS, covers: CODE_LANGS, groupOf: groupMap(CODE_LANGS, (l) => CODE_FAMILY_OF[l]), groupOrder: Object.keys(CODE_FAMILIES),
});
const COREF_CODES = Object.values(COREF_FAMILIES).flat();
const COREF_FAMILY_OF_CODE = Object.freeze(Object.fromEntries(Object.entries(COREF_FAMILIES).flatMap(([f, cs]) => cs.map((c) => [c, f]))));
export const PARTITION_COREF = buildPartition({
  id: "COREF", name: "leave one family out (5 folds, fewer than P1: said so)", giver: "design 3.5",
  universe: COREF_CODES, covers: COREF_CODES, groupOf: groupMap(COREF_CODES, (c) => COREF_FAMILY_OF_CODE[c]), groupOrder: Object.keys(COREF_FAMILIES),
});
export const PARTITIONS = Object.freeze({ P1: PARTITION_P1, P2: PARTITION_P2, P3: PARTITION_P3, CODE: PARTITION_CODE, COREF: PARTITION_COREF });

/** The folds of a partition id ("P1", "P2", "P3", "CODE", "COREF"), or the partition object itself. */
export function foldsFor(partition) {
  const p = typeof partition === "string" ? PARTITIONS[partition] : partition;
  if (!p) throw new Error(`foldsFor: unknown partition ${String(partition)}`);
  return p.folds;
}

/**
 * Audit a partition for leakage (C2). Violations: unknown_unit, empty_fold, train_heldout_overlap, heldout_overlap_across_folds,
 * group_leak (a train unit shares the held-out group), coverage (held-out union != covers), never_held_missing_from_train.
 * Returns {ok, violations:[{kind, ...}]}.
 */
export function checkPartition(p) {
  const v = [];
  const universe = new Set(p.universe);
  const heldSeen = new Map();
  for (const f of p.folds) {
    if (!f.heldOut.length) v.push({ kind: "empty_fold", fold: f.id });
    const train = new Set(f.train);
    for (const u of [...f.heldOut, ...f.train]) if (!universe.has(u)) v.push({ kind: "unknown_unit", fold: f.id, unit: u });
    for (const u of f.heldOut) {
      if (train.has(u)) v.push({ kind: "train_heldout_overlap", fold: f.id, unit: u });
      if (heldSeen.has(u)) v.push({ kind: "heldout_overlap_across_folds", unit: u, folds: [heldSeen.get(u), f.id] });
      else heldSeen.set(u, f.id);
    }
    for (const u of f.train) if (p.groupOf[u] != null && p.groupOf[u] === f.group) v.push({ kind: "group_leak", fold: f.id, unit: u, group: f.group });
    const expectTrain = p.universe.filter((u) => !f.heldOut.includes(u));
    for (const u of expectTrain) if (!train.has(u)) v.push({ kind: "never_held_missing_from_train", fold: f.id, unit: u });
  }
  const cover = new Set(p.covers);
  for (const u of cover) if (!heldSeen.has(u)) v.push({ kind: "coverage", unit: u, why: "never held out" });
  for (const u of heldSeen.keys()) if (!cover.has(u)) v.push({ kind: "coverage", unit: u, why: "held out but not in covers" });
  return { ok: v.length === 0, violations: v };
}

// ── the read guard, the read log and the parse cache (D16) ──────────────────────────────────────────────────────────
const GUARD = { forbidTest: process.env.LAW_FORBID_TEST === "1" };
const READ_LOG = [];
/** Arm or disarm the guard that makes reading a held-out TEST file throw. The smoke arms it. */
export function setReadGuard({ forbidTest = true } = {}) { GUARD.forbidTest = !!forbidTest; return { ...GUARD }; }
export function readGuard() { return { ...GUARD }; }
/** A held-out TEST path: .../test.conllu (UD) or a CorefUD *-dev file (T11's test, D15). Decided by file name only. */
export function isHeldOutTestPath(p) {
  const b = path.basename(String(p));
  return b === "test.conllu" || /-corefud-dev\.conllu(\.gz)?$/.test(b);
}
function heldOutError(p) {
  const e = new Error(`read guard: refusing to read held-out TEST file ${p} (setReadGuard({forbidTest:false}) only in the one TEST run)`);
  e.code = "HELD_OUT_TEST_READ";
  return e;
}
export function readLog() { return READ_LOG.map((r) => ({ ...r })); }
export function clearReadLog() { READ_LOG.length = 0; }

const CACHE = new Map();         // key -> {value, bytes}; Map insertion order is the LRU order
let cacheBytes = 0;
function cacheGet(key) {
  const e = CACHE.get(key);
  if (!e) return undefined;
  CACHE.delete(key); CACHE.set(key, e);
  return e.value;
}
function cacheSet(key, value, bytes) {
  if (bytes > CACHE_BUDGET_BYTES) return;
  CACHE.set(key, { value, bytes }); cacheBytes += bytes;
  while (cacheBytes > CACHE_BUDGET_BYTES && CACHE.size > 1) {
    const [k, e] = CACHE.entries().next().value;
    CACHE.delete(k); cacheBytes -= e.bytes;
  }
}
export function clearCache() { CACHE.clear(); cacheBytes = 0; }
export function cacheInfo() { return { entries: CACHE.size, sourceBytes: cacheBytes, budget: CACHE_BUDGET_BYTES }; }

// ── CoNLL-U (D1) ───────────────────────────────────────────────────────────────────────────────────────────────────
const WORD_ID = /^[0-9]+$/;
const RANGE_ID = /^[0-9]+-[0-9]+$/;
const EMPTY_ID = /^[0-9]+\.[0-9]+$/;

/**
 * parseConllu(text, {limit, keepMisc}) -> Sentence[] with a non-enumerable `.meta`.
 * Sentence = {i, id, text, doc, docId, newdoc, words, nRanges, nEmpty}; doc = index of the `# newdoc` it sits under (-1 when the file has
 * none); words = syntactic words only (integer IDs), each {id, form, lemma, upos, xpos, feats, head, deprel, spaceAfter[, misc]}.
 * Ranges "1-2" and empty nodes "1.1" are skipped and counted. Malformed rows are skipped, counted and sampled (D1).
 * `limit` keeps the first N sentences in file order (deterministic, never a sample).
 */
export function parseConllu(text, { limit = null, keepMisc = false } = {}) {
  const out = [];
  const meta = { sentences: 0, words: 0, ranges: 0, empties: 0, rows: 0, malformed: 0, malformedSamples: [], idAnomalies: 0, newdocs: 0, emptyWithEntity: 0, sentencesWithoutWords: 0 };
  const newSent = () => ({ i: -1, id: null, text: null, doc: -1, docId: null, newdoc: false, words: [], nRanges: 0, nEmpty: 0 });
  let cur = null, docIdx = -1, docId = null, prevId = 0, lineNo = 0;
  const flush = () => {
    if (cur) {
      if (cur.words.length) { cur.i = out.length; cur.doc = docIdx; cur.docId = docId; out.push(cur); }
      else meta.sentencesWithoutWords++;
    }
    cur = null; prevId = 0;
  };
  const bad = (reason) => {
    meta.malformed++;
    if (meta.malformedSamples.length < 20) meta.malformedSamples.push({ line: lineNo, reason });
  };
  for (const raw of text.split("\n")) {
    lineNo++;
    if (limit != null && out.length >= limit) break;
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line === "") { flush(); continue; }
    if (line.charCodeAt(0) === 35) {                                   // '#': comment
      cur ??= newSent();
      if (line.startsWith("# newdoc")) {
        docIdx++; meta.newdocs++;
        const m = /^# newdoc(?:\s+id\s*=\s*(.*))?$/.exec(line);
        docId = m && m[1] ? m[1].trim() : `doc${docIdx}`;
        cur.newdoc = true;
      } else {
        const m = /^#\s*(sent_id|text)\s*=\s*(.*)$/.exec(line);
        if (m) cur[m[1] === "sent_id" ? "id" : "text"] = m[2];
      }
      continue;
    }
    meta.rows++;
    const f = line.split("\t");
    if (f.length < 10) { bad("fields<10"); continue; }
    cur ??= newSent();
    const id = f[0];
    if (WORD_ID.test(id)) {
      const idn = Number(id);
      if (idn !== prevId + 1) meta.idAnomalies++;
      prevId = idn;
      const w = {
        id: idn, form: f[1], lemma: f[2], upos: f[3], xpos: f[4], feats: f[5],
        head: WORD_ID.test(f[6]) ? Number(f[6]) : null, deprel: f[7], spaceAfter: !f[9].includes("SpaceAfter=No"),
      };
      if (keepMisc) w.misc = f[9];
      cur.words.push(w); meta.words++;
    } else if (RANGE_ID.test(id)) { cur.nRanges++; meta.ranges++; }
    else if (EMPTY_ID.test(id)) { cur.nEmpty++; meta.empties++; if (keepMisc && f[9].includes("Entity=")) meta.emptyWithEntity++; }
    else bad("bad id");
  }
  flush();
  meta.sentences = out.length;
  Object.defineProperty(out, "meta", { value: meta, enumerable: false, writable: true });
  return out;
}

function readText(abs) {
  const buf = fs.readFileSync(abs);
  let text = (abs.endsWith(".gz") ? zlib.gunzipSync(buf) : buf).toString("utf8");
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  return text;
}

/**
 * loadConllu(path, {limit, cache, keepMisc}) -> Sentence[] (read-only by contract; `.meta` carries the counts and typed malformed rows).
 * Reads .conllu and .conllu.gz. Throws ENOENT for a missing file (use fs.existsSync or languageSet for the typed gap) and
 * HELD_OUT_TEST_READ when the guard is armed and the path is a held-out TEST file.
 */
export function loadConllu(file, { limit = null, cache = true, keepMisc = false } = {}) {
  const abs = path.resolve(String(file));
  const heldOut = isHeldOutTestPath(abs);
  if (GUARD.forbidTest && heldOut) throw heldOutError(abs);
  const st = fs.statSync(abs);
  const key = `${abs}|${st.size}|${Math.round(st.mtimeMs)}|${limit ?? ""}|${keepMisc ? 1 : 0}`;
  if (cache) { const hit = cacheGet(key); if (hit) return hit; }
  const sents = parseConllu(readText(abs), { limit, keepMisc });
  sents.meta.path = abs; sents.meta.bytes = st.size; sents.meta.gz = abs.endsWith(".gz");
  READ_LOG.push({ path: abs, kind: "conllu", heldOut, bytes: st.size });
  if (cache) cacheSet(key, sents, st.size);
  return sents;
}

// ── stream, gold, grains (D2, D3, D4) ──────────────────────────────────────────────────────────────────────────────
const PUNCT_ONLY = /^\p{P}+$/u;
/** Is this word script (removed from the heard stream)? punct "upos": UPOS == PUNCT (design 2.1); "unicode": every character is Unicode P*. */
export function isScriptWord(w, punct = "upos") {
  return punct === "unicode" ? PUNCT_ONLY.test(w.form) : w.upos === "PUNCT";
}
/** NFC; lowercased in the heard stream, case kept in READ (D2). */
export function identOf(form, heard = true) {
  const n = String(form).normalize("NFC");
  return heard ? n.toLowerCase() : n;
}
function keptWords(sentence, heard, punct) {
  if (!heard) return sentence.words;
  const ws = sentence.words, out = [];
  for (let k = 0; k < ws.length; k++) if (!isScriptWord(ws[k], punct)) out.push(ws[k]);
  return out;
}

/**
 * streamOf(sentences, {heard, punct}) -> the GOLD-FREE token stream.
 * {kind:"stream", heard, punct, nSentences, nUnits, nWords, sentences:[{s, doc, newdoc, id, n, forms, idents, wordIds}]}.
 * A sentence whose words are all removed stays as an empty sentence (n = 0) so sentence indices align with the input.
 */
export function streamOf(sentences, { heard = true, punct = "upos" } = {}) {
  const out = new Array(sentences.length);
  let nUnits = 0, nWords = 0;
  for (let s = 0; s < sentences.length; s++) {
    const sent = sentences[s];
    const ws = keptWords(sent, heard, punct);
    const forms = new Array(ws.length), idents = new Array(ws.length), wordIds = new Array(ws.length);
    for (let i = 0; i < ws.length; i++) { forms[i] = ws[i].form; idents[i] = identOf(ws[i].form, heard); wordIds[i] = ws[i].id; }
    out[s] = { s, doc: sent.doc, newdoc: sent.newdoc, id: sent.id, n: ws.length, forms, idents, wordIds };
    nUnits += ws.length; nWords += sent.words.length;
  }
  return { kind: "stream", heard, punct, nSentences: out.length, nUnits, nWords, sentences: out };
}

/** sha256 over exactly what a feature may see (heard flag, punct mode, forms, identities, sentence boundaries, word ids). G3 hash-identity. */
export function streamDigest(stream) {
  const h = createHash("sha256");
  h.update(`${stream.heard ? 1 : 0}|${stream.punct}|${stream.sentences.length}\n`);
  for (const s of stream.sentences) {
    h.update(`${s.n}\u0001${s.forms.join("\u0002")}\u0001${s.idents.join("\u0002")}\u0001${s.wordIds.join(",")}\n`);
  }
  return h.digest("hex");
}

/**
 * goldOf(sentences, {heard, punct}) -> GOLD[s][i] = {upos, deprel, deprelBase, head, feats, wordId, inE}, parallel to streamOf with the same options.
 * head = stream index of the head in the same sentence, -1 for the root, null when the head word was removed or is not an integer.
 */
export function goldOf(sentences, { heard = true, punct = "upos" } = {}) {
  const out = new Array(sentences.length);
  for (let s = 0; s < sentences.length; s++) {
    const ws = keptWords(sentences[s], heard, punct);
    const idToIdx = new Map();
    for (let i = 0; i < ws.length; i++) idToIdx.set(ws[i].id, i);
    const row = new Array(ws.length);
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      const colon = w.deprel.indexOf(":");
      row[i] = {
        upos: w.upos, deprel: w.deprel, deprelBase: colon < 0 ? w.deprel : w.deprel.slice(0, colon),
        head: w.head === 0 ? -1 : (w.head == null ? null : (idToIdx.get(w.head) ?? null)),
        feats: w.feats, wordId: w.id, inE: UPOS14_SET.has(w.upos),
      };
    }
    out[s] = row;
  }
  return out;
}

/** The evaluation positions [s, i] (UPOS in UPOS14), in reading order. */
export function evalPositions(gold) {
  const pos = [];
  for (let s = 0; s < gold.length; s++) for (let i = 0; i < gold[s].length; i++) if (gold[s][i].inE) pos.push([s, i]);
  return pos;
}

/**
 * The label of a gold token at a grain, or null when the token is not evaluated at it.
 * G1 UPOS14; G2 "nominal"|"other"; G3 "PROPN"|"NOUN" (nominals only); G4 DEPREL base label when it is in opts.deprelSet (a Set or array).
 */
export function labelOf(g, grain, { deprelSet = null } = {}) {
  if (!g || !g.inE) return null;
  switch (grain) {
    case "G1": return g.upos;
    case "G2": return g.upos === "NOUN" || g.upos === "PROPN" ? "nominal" : "other";
    case "G3": return g.upos === "NOUN" || g.upos === "PROPN" ? g.upos : null;
    case "G4": {
      if (!UD_DEPRELS_SET.has(g.deprelBase)) return null;
      if (deprelSet) { const has = deprelSet instanceof Set ? deprelSet.has(g.deprelBase) : deprelSet.includes(g.deprelBase); if (!has) return null; }
      return g.deprelBase;
    }
    default: throw new Error(`labelOf: unknown grain ${grain}`);
  }
}

/** DEPREL base-label counts over the evaluation tokens of a sentence list (D4). */
export function deprelCountsOf(sentences, opts = {}) {
  const gold = goldOf(sentences, opts);
  const counts = new Map();
  for (const row of gold) for (const g of row) if (g.inE && UD_DEPRELS_SET.has(g.deprelBase)) counts.set(g.deprelBase, (counts.get(g.deprelBase) ?? 0) + 1);
  return counts;
}
/** G4's label set from per-language count Maps: universal labels with at least minShare of the pooled count. Derived, never typed. */
export function deprelLabelSet(countsList, { minShare = DEPREL_MIN_SHARE } = {}) {
  const pooled = new Map();
  let total = 0;
  for (const m of countsList) for (const [k, v] of m) { pooled.set(k, (pooled.get(k) ?? 0) + v); total += v; }
  const rows = [...pooled].map(([label, n]) => ({ label, n, share: total ? n / total : 0 })).sort((a, b) => b.n - a.n || (a.label < b.label ? -1 : 1));
  return { minShare, total, labels: rows.filter((r) => r.share >= minShare).map((r) => r.label).sort(), kept: rows.filter((r) => r.share >= minShare), excluded: rows.filter((r) => r.share < minShare) };
}

// ── samples: the N_cap cap and the nested exposure fractions (D7, D8) ──────────────────────────────────────────────
/** Words of a sentence in the cap's unit: "word" = syntactic words including PUNCT (the census unit); "unit" = heard stream units. */
export function sentenceSize(sent, unit = "word", punct = "upos") {
  if (unit === "word") return sent.words.length;
  let n = 0;
  for (const w of sent.words) if (!isScriptWord(w, punct)) n++;
  return n;
}
/**
 * capSample(sentences, {nCap, seed, unit}) -> the LONGEST PREFIX of a seeded permutation of the sentences whose total is at most nCap.
 * Stops before the first sentence that would overflow (no skipping). Returned in permutation order with the original indices.
 * {sentences, indices, tokens, units, nSentences, fullTokens, nCap, unit, seed, complete}
 */
export function capSample(sentences, { nCap = N_CAP, seed, unit = "word", punct = "upos" } = {}) {
  if (seed == null) throw new Error("capSample: a seed is required (use seedFor(stem, split, \"cap\"))");
  const perm = permutation(sentences.length, seed >>> 0);
  const picked = [], idx = [];
  let tokens = 0, units = 0, full = 0;
  for (const s of sentences) full += sentenceSize(s, unit, punct);
  for (let k = 0; k < perm.length; k++) {
    const sent = sentences[perm[k]];
    const sz = sentenceSize(sent, unit, punct);
    if (tokens + sz > nCap) break;
    picked.push(sent); idx.push(perm[k]); tokens += sz;
    units += unit === "unit" ? sz : sentenceSize(sent, "unit", punct);
  }
  return { sentences: picked, indices: idx, tokens, units, nSentences: picked.length, fullTokens: full, nCap, unit, seed: seed >>> 0, complete: picked.length === sentences.length };
}
/**
 * exposureFractions(sentences, fractions, seed, {unit}) -> [{f, sentences, tokens, nSentences, realised}] NESTED seeded sentence prefixes of one
 * seeded permutation: prefix(f) is a prefix of prefix(f') for f < f'. Each is the longest prefix with at most f * total tokens, with at least
 * one sentence (so for a tiny f the realised fraction can exceed f). f = 1 is every sentence, in permutation order.
 */
export function exposureFractions(sentences, fractions = DEFAULT_FRACTIONS, seed, { unit = "word", punct = "upos" } = {}) {
  if (seed == null) throw new Error("exposureFractions: a seed is required");
  const perm = permutation(sentences.length, seed >>> 0);
  const order = perm.map((k) => sentences[k]);
  const sizes = order.map((s) => sentenceSize(s, unit, punct));
  const total = sizes.reduce((a, b) => a + b, 0);
  const fs_ = [...fractions].sort((a, b) => a - b);
  return fs_.map((f) => {
    let tokens = 0, k = 0;
    while (k < order.length && tokens + sizes[k] <= f * total + 1e-9) { tokens += sizes[k]; k++; }
    if (k === 0 && order.length) { k = 1; tokens = sizes[0]; }
    return { f, sentences: order.slice(0, k), tokens, nSentences: k, realised: total ? tokens / total : 0 };
  });
}
/** Is a list of exposure samples nested (each sentence list a prefix of the next)? The C4 checker; returns {ok, at}. */
export function checkNested(samples) {
  for (let a = 0; a + 1 < samples.length; a++) {
    const p = samples[a].sentences, q = samples[a + 1].sentences;
    if (p.length > q.length) return { ok: false, at: a };
    for (let k = 0; k < p.length; k++) if (p[k] !== q[k]) return { ok: false, at: a };
  }
  return { ok: true, at: -1 };
}

// ── exposure and the strata H0/H1/H2 (D9) ──────────────────────────────────────────────────────────────────────────
/** Identity counts of the unlabelled forms of a sentence list (the exposure Q_0). Reads forms only (and UPOS == PUNCT under punct "upos"). */
export function exposureCounts(sentences, opts = {}) {
  return streamCounts(streamOf(sentences, opts));
}
export function streamCounts(stream) {
  const m = new Map();
  for (const s of stream.sentences) for (const id of s.idents) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}
export function nbinOf(n) { return n <= 0 ? 0 : Math.floor(Math.log2(n)) + 1; }
/**
 * exposureStrata(stream, exposure, {gold}) -> {strata[s][i], summary}. exposure = a Map or a plain object of identity counts (the train forms).
 * Per token: nTrain, nSeen (Q at READ time: train + earlier sentences + earlier tokens of this sentence; CAUSAL), oovTrain, h0 (nSeen == 0),
 * h1 (nTrain == 0 and the whole-stream count == 1), h2 (not h0), stratum ("H1" | "H0" (first sight, not hapax) | "H2"), nbin, and
 * selectorNStream (the whole-stream count: a SELECTOR for which tokens are evaluated; no feature may use it).
 * summary counts every stratum over all tokens and, when gold is given, over the evaluation set E.
 */
export function exposureStrata(stream, exposure, { gold = null } = {}) {
  const get = exposure instanceof Map ? (k) => exposure.get(k) ?? 0
    : typeof exposure?.get === "function" ? (k) => exposure.get(k) ?? 0 : (k) => exposure?.[k] ?? 0;
  const whole = streamCounts(stream);
  const running = new Map();
  const strata = new Array(stream.sentences.length);
  const sum = { all: { H0: 0, H1: 0, H2: 0, tokens: 0 }, E: gold ? { H0: 0, H1: 0, H2: 0, tokens: 0 } : null, byStratum: { H1: 0, H0: 0, H2: 0 }, nbin: {} };
  for (const sent of stream.sentences) {
    const row = new Array(sent.n);
    for (let i = 0; i < sent.n; i++) {
      const id = sent.idents[i];
      const nTrain = get(id);
      const run = running.get(id) ?? 0;
      const nSeen = nTrain + run;
      running.set(id, run + 1);
      const selectorNStream = whole.get(id);
      const h0 = nSeen === 0;
      const h1 = nTrain === 0 && selectorNStream === 1;
      const stratum = h1 ? "H1" : h0 ? "H0" : "H2";
      const nbin = nbinOf(nSeen);
      row[i] = { nTrain, nSeen, selectorNStream, oovTrain: nTrain === 0, h0, h1, h2: !h0, stratum, nbin };
      sum.all.tokens++; if (h0) sum.all.H0++; if (h1) sum.all.H1++; if (!h0) sum.all.H2++;
      sum.byStratum[stratum]++;
      sum.nbin[nbin] = (sum.nbin[nbin] ?? 0) + 1;
      if (gold && gold[sent.s]?.[i]?.inE) { sum.E.tokens++; if (h0) sum.E.H0++; if (h1) sum.E.H1++; if (!h0) sum.E.H2++; }
    }
    strata[sent.s] = row;
  }
  return { strata, summary: sum };
}

// ── languages: paths, availability, loading (D1, D17) ──────────────────────────────────────────────────────────────
/** The CoNLL-U path of a stem and split ("train" | "dev" | "test"). Never opens it. */
export function splitPath(stem, split, { tbDir = ROOTS.tb, evalDir = ROOTS.ud } = {}) {
  if (split === "train") return path.join(tbDir, TRAIN_DIR_OF[stem] ?? stem, "train.conllu");
  if (split === "dev" || split === "test") return path.join(evalDir, stem, `${split}.conllu`);
  throw new Error(`splitPath: unknown split ${split}`);
}
/** Stems that have a directory in ud-eval (the late reserve is whatever is there beyond the registry; unregistered ones get family null). */
export function discoverStems(evalDir = ROOTS.ud) {
  try { return fs.readdirSync(evalDir).filter((d) => fs.existsSync(path.join(evalDir, d, "dev.conllu")) || fs.existsSync(path.join(evalDir, d, "test.conllu"))).sort(); }
  catch { return []; }
}
/**
 * languageSet({split, scope, stems, tbDir, evalDir}) -> {split, scope, units, gaps, denominator, present}.
 * scope: "frozen" (the 41 of 3.1), "control" (cmn), "late" (reserve: the registry's late stems and any unregistered stem found in ud-eval), "all".
 * Existence only: no file is opened (so asking for split "test" reads nothing). A missing file is the typed gap `file_absent` (counted in the denominator);
 * a stem with no declared family is the typed gap `family_undeclared`.
 */
export function languageSet({ split = "dev", scope = "frozen", stems = null, tbDir = ROOTS.tb, evalDir = ROOTS.ud } = {}) {
  let list;
  if (stems) list = [...stems];
  else if (scope === "frozen") list = [...FROZEN_STEMS];
  else if (scope === "control") list = [...CONTROL_STEMS];
  else if (scope === "late") list = [...new Set([...LATE_STEMS, ...discoverStems(evalDir).filter((s) => !LANGUAGES[s])])].sort();
  else if (scope === "all") list = [...new Set([...FROZEN_STEMS, ...CONTROL_STEMS, ...LATE_STEMS, ...discoverStems(evalDir)])].sort();
  else throw new Error(`languageSet: unknown scope ${scope}`);
  const units = [], gaps = [];
  for (const stem of list) {
    const reg = LANGUAGES[stem];
    const p = splitPath(stem, split, { tbDir, evalDir });
    const exists = fs.existsSync(p);
    units.push({ stem, family: reg?.family ?? null, branch: reg?.branch ?? null, scriptGroup: reg?.scriptGroup ?? null, role: reg?.role ?? "unregistered", split, path: p, exists });
    if (!exists) gaps.push({ gap: "file_absent", stem, split, path: p });
    if (!reg) gaps.push({ gap: "family_undeclared", stem });
  }
  return { split, scope, units, gaps, denominator: units.length, present: units.filter((u) => u.exists).length };
}
/**
 * loadLanguage(stem, {split, cap, nCap, heard, punct, limit}) -> {stem, split, family, path, sentences, meta, sample, stream, gold}, or the typed gap
 * {gap:"file_absent", stem, split, path}. cap:true applies capSample with seedFor(stem, split, "cap") (the primary training sample of every arm).
 */
export function loadLanguage(stem, { split = "dev", cap = false, nCap = N_CAP, heard = true, punct = "upos", limit = null, cacheParse = true, tbDir = ROOTS.tb, evalDir = ROOTS.ud } = {}) {
  const p = splitPath(stem, split, { tbDir, evalDir });
  if (!fs.existsSync(p)) return { gap: "file_absent", stem, split, path: p };
  let sentences = loadConllu(p, { limit, cache: cacheParse });
  const meta = sentences.meta;
  let sample = null;
  if (cap) { sample = capSample(sentences, { nCap, seed: seedFor(stem, split, "cap"), unit: "word", punct }); sentences = sample.sentences; }
  return { stem, split, family: LANGUAGES[stem]?.family ?? null, path: p, sentences, meta, sample, stream: streamOf(sentences, { heard, punct }), gold: goldOf(sentences, { heard, punct }) };
}
/** G4's label set, pooled over the N_cap-capped train evaluation tokens of the frozen set (D4). Loads each train once and drops it. */
export function pooledDeprelLabelSet({ stems = FROZEN_STEMS, tbDir = ROOTS.tb, minShare = DEPREL_MIN_SHARE, punct = "upos" } = {}) {
  const lists = [], gaps = [];
  for (const stem of stems) {
    const L = loadLanguage(stem, { split: "train", cap: true, punct, cacheParse: false, tbDir });
    if (L.gap) { gaps.push(L); continue; }
    lists.push(deprelCountsOf(L.sentences, { punct }));
  }
  return { ...deprelLabelSet(lists, { minShare }), languages: lists.length, gaps };
}

// ── document order (D12) ───────────────────────────────────────────────────────────────────────────────────────────
export function documentOrder(sentences) {
  const docs = new Set();
  for (const s of sentences) if (s.doc >= 0) docs.add(s.doc);
  const nDocs = sentences.meta?.newdocs ?? docs.size;
  const mean = docs.size ? sentences.length / docs.size : null;
  return { docs: nDocs, sentences: sentences.length, meanSentencesPerDoc: mean, orderEligible: nDocs >= 100 && mean != null && mean >= 2 };
}

// ── scripts and typology covariates (D11) ──────────────────────────────────────────────────────────────────────────
/** The unspaced-script test of adapters/text/script-segment.js::isUnspacedScript, copied (pinned to the repo's function by a test, C7). */
const UNSPACED_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
export const isUnspaced = (s) => UNSPACED_RE.test(String(s ?? ""));
const SCRIPT_TESTS = [
  ["Latin", /\p{Script=Latin}/u], ["Cyrillic", /\p{Script=Cyrillic}/u], ["Arabic", /\p{Script=Arabic}/u], ["Devanagari", /\p{Script=Devanagari}/u],
  ["Hebrew", /\p{Script=Hebrew}/u], ["Greek", /\p{Script=Greek}/u], ["HanKanaHangul", /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u],
  ["Armenian", /\p{Script=Armenian}/u], ["Georgian", /\p{Script=Georgian}/u], ["Tamil", /\p{Script=Tamil}/u], ["Telugu", /\p{Script=Telugu}/u],
];
const LETTER = /\p{L}/u;
const scriptCache = new Map();
function scriptOfChar(ch) {
  let r = scriptCache.get(ch);
  if (r !== undefined) return r;
  r = null;
  if (LETTER.test(ch)) for (const [name, re] of SCRIPT_TESTS) if (re.test(ch)) { r = name; break; }
  scriptCache.set(ch, r);
  return r;
}
/** The script group (the P3 vocabulary) holding most of the letters of the non-PUNCT words of a sentence list. */
export function dominantScript(sentences) {
  const n = {};
  let letters = 0;
  for (const s of sentences) for (const w of s.words) {
    if (w.upos === "PUNCT") continue;
    for (const ch of w.form) { const g = scriptOfChar(ch); if (g) { n[g] = (n[g] ?? 0) + 1; letters++; } }
  }
  const ranked = Object.entries(n).sort((a, b) => b[1] - a[1]);
  return { dominant: ranked[0]?.[0] ?? null, letters, shares: Object.fromEntries(ranked.map(([k, v]) => [k, v / letters])) };
}
const entropyBits = (counts) => {
  const tot = counts.reduce((a, b) => a + b, 0);
  let h = 0;
  for (const c of counts) if (c > 0) h -= (c / tot) * Math.log2(c / tot);
  return h;
};
/**
 * WOF: the entropy in bits of the order of {subject, head, object} over head words that have both an nsubj and an obj (base labels) dependent
 * (the first of each, by word id), from gold DEPREL and HEAD. A COVARIATE, never a feature. Fewer than WOF_MIN_CLAUSES such heads: the typed gap wof_sparse.
 */
export function wordOrderEntropy(sentences) {
  const orders = new Map();
  let clauses = 0;
  for (const sent of sentences) {
    const by = new Map();
    for (const w of sent.words) {
      if (w.head == null || w.head === 0) continue;
      const base = w.deprel.split(":", 1)[0];
      if (base !== "nsubj" && base !== "obj") continue;
      let e = by.get(w.head);
      if (!e) by.set(w.head, (e = {}));
      if (base === "nsubj" && e.s == null) e.s = w.id;
      if (base === "obj" && e.o == null) e.o = w.id;
    }
    for (const [head, e] of by) {
      if (e.s == null || e.o == null) continue;
      const key = [["S", e.s], ["V", head], ["O", e.o]].sort((a, b) => a[1] - b[1]).map((x) => x[0]).join("");
      orders.set(key, (orders.get(key) ?? 0) + 1); clauses++;
    }
  }
  if (clauses < WOF_MIN_CLAUSES) return { gap: "wof_sparse", clauses, orders: Object.fromEntries(orders) };
  return { wof: entropyBits([...orders.values()]), clauses, orders: Object.fromEntries([...orders].sort((a, b) => b[1] - a[1])) };
}
/**
 * typologyCovariates(stem, {nCap}) -> {stem, nUnits, nTypes, mr, mrEqual, unspacedShare, unspaced, wof, wofClauses, documents, family, ...} from the TRAIN split only.
 * mr = types / units of the stream of the N_cap train sample (seedFor(stem, "train", "cap")); mrEqual = the same over the first MR_EQUAL_UNITS units
 * (null when the sample has fewer: a typed fact, not imputed). Covariates for the strata of T3; never a feature of any arm.
 */
export function typologyCovariates(stem, { nCap = N_CAP, tbDir = ROOTS.tb, punct = "upos" } = {}) {
  const full = splitPath(stem, "train", { tbDir });
  if (!fs.existsSync(full)) return { gap: "file_absent", stem, split: "train", path: full };
  return typologyFrom(stem, loadConllu(full, { cache: false }), { nCap, punct });
}
/** typologyCovariates over an already parsed FULL train split (so a caller that parsed it once does not parse it twice). */
export function typologyFrom(stem, all, { nCap = N_CAP, punct = "upos" } = {}) {
  const sample = capSample(all, { nCap, seed: seedFor(stem, "train", "cap"), unit: "word", punct });
  const stream = streamOf(sample.sentences, { punct });
  const types = new Set(), typesEq = new Set();
  let units = 0, unspaced = 0;
  for (const s of stream.sentences) for (let i = 0; i < s.n; i++) {
    types.add(s.idents[i]); units++;
    if (units <= MR_EQUAL_UNITS) typesEq.add(s.idents[i]);
    if (isUnspaced(s.forms[i])) unspaced++;
  }
  const w = wordOrderEntropy(all);
  const unspacedShare = units ? unspaced / units : 0;
  return {
    stem, family: LANGUAGES[stem]?.family ?? null, nWordsTrain: all.meta.words, nSentencesTrain: all.length,
    sampleTokens: sample.tokens, nUnits: units, nTypes: types.size, mr: units ? types.size / units : null,
    mrEqual: units >= MR_EQUAL_UNITS ? typesEq.size / MR_EQUAL_UNITS : null,
    unspacedShare, unspaced: unspacedShare > 0.5, unspacedFrozen: UNSPACED_FROZEN.includes(stem),
    wof: w.gap ? null : w.wof, wofClauses: w.clauses, wofGap: w.gap ?? null, wofOrders: w.orders,
    documents: documentOrder(all), script: dominantScript(all),
  };
}

// ── code adapter (D13) ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * codeCorpus({split, root, unrestrictedOnly}) -> {available, split, languages:[{language, family, files, nFiles, nRepos}], gaps, denominators}.
 * The manifest's own repository split is used as is. A language outside CODE_FAMILIES, an absent manifest, an empty split are typed gaps.
 * Files carry {path, rel, repo, bytes, lines, sha256, ext, restricted, split}. Listing a split opens no source file.
 */
export function codeCorpus({ split = "dev", root = ROOTS.code, unrestrictedOnly = true } = {}) {
  const mp = path.join(root, "manifest.json");
  if (!fs.existsSync(mp)) return { available: false, split, gap: "code_corpus_absent", reason: `no manifest at ${mp}`, languages: [], gaps: [], denominators: { languages: 0, files: 0 } };
  const man = JSON.parse(fs.readFileSync(mp, "utf8"));
  const gaps = [], languages = [];
  let nFiles = 0;
  for (const [language, rec] of Object.entries(man.languages ?? {})) {
    const family = CODE_FAMILY_OF[language];
    if (!family) { gaps.push({ gap: "not_in_family_table", language }); continue; }
    const raw = Array.isArray(rec[split]) ? rec[split] : [];
    const files = raw.filter((f) => !(unrestrictedOnly && f.restricted)).map((f) => ({ ...f, split, language }));
    if (!files.length) { gaps.push({ gap: "split_empty", language, split }); continue; }
    languages.push({ language, family, files, nFiles: files.length, nRepos: new Set(files.map((f) => f.repo)).size });
    nFiles += files.length;
  }
  for (const l of CODE_LANGS) if (!man.languages?.[l]) gaps.push({ gap: "language_absent_in_manifest", language: l });
  return { available: true, split, root, schema: man.schema ?? null, splitRule: man.declared?.split_rule ?? null, unrestrictedOnly, languages, gaps, denominators: { languages: languages.length, files: nFiles } };
}
/**
 * codeUnitsFor(file, {unit}) -> Promise<{stream, gold, meta} | {gap}>. Reads the source (refused for a TEST file while the guard is armed), asks the gold
 * extractor (dynamic import of eval/coding-competence/gold.mjs) for tokens and defs, and returns a gold-free stream (identities = NFC forms, case kept;
 * one sentence per file, or per source line with unit:"line") and GOLD[s][i] = {cls, declared, defKind, upos:null, inE:false, ...}.
 * G5 label = cls; G6 label = declared (true: the token is a CORE def name; false: another identifier; null: not an identifier).
 */
export async function codeUnitsFor(file, { unit = "file", language = null } = {}) {
  if (GUARD.forbidTest && file.split === "test") throw heldOutError(file.path);
  let gm;
  try { gm = await import(pathToFileURL(CODE_GOLD_MODULE).href); } catch (e) { return { gap: "gold_module_absent", reason: String(e?.message ?? e) }; }
  const avail = gm.goldAvailable();
  if (!avail.available) return { gap: "gold_unavailable", reason: avail.reason };
  const text = fs.readFileSync(file.path, "utf8");
  READ_LOG.push({ path: file.path, kind: "code", heldOut: file.split === "test", bytes: Buffer.byteLength(text) });
  let g;
  try { g = await gm.goldFor({ language: language ?? file.language, text, fileName: path.basename(file.path) }); }
  catch (e) { return { gap: "gold_error", reason: String(e?.message ?? e), code: e?.code ?? null }; }
  const tokStatus = g.capabilities?.tokens?.status;
  if (tokStatus !== "ok") return { gap: "tokens_not_ok", status: tokStatus ?? null, language: g.language };
  const core = new Set(gm.CORE_DEF_KINDS);
  const declaredAt = new Map();
  for (const d of g.defs ?? []) if (core.has(d.kind) && d.nameStart != null) declaredAt.set(`${d.nameStart}:${d.nameEnd}`, d.kind);
  const toks = g.tokens ?? [];
  const nl = [];
  if (unit === "line") for (let k = text.indexOf("\n"); k >= 0; k = text.indexOf("\n", k + 1)) nl.push(k);
  const lineOf = (pos) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < pos) lo = mid + 1; else hi = mid; } return lo; };
  const sents = [], goldRows = [];
  let curKey = null, cur = null, curG = null;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    const key = unit === "line" ? lineOf(t.start) : 0;
    if (key !== curKey) {
      cur = { s: sents.length, doc: 0, newdoc: false, id: null, n: 0, forms: [], idents: [], wordIds: [] }; curG = [];
      sents.push(cur); goldRows.push(curG); curKey = key;
    }
    const form = text.slice(t.start, t.end);
    const defKind = declaredAt.get(`${t.start}:${t.end}`) ?? null;
    cur.forms.push(form); cur.idents.push(form.normalize("NFC")); cur.wordIds.push(k); cur.n++;
    curG.push({
      upos: null, deprel: null, deprelBase: null, head: null, feats: null, wordId: k, inE: false,
      cls: t.class, type: t.type, start: t.start, end: t.end,
      declared: defKind ? true : t.class === "identifier" ? false : null, defKind,
    });
  }
  const stream = { kind: "stream", heard: false, punct: "none", nSentences: sents.length, nUnits: toks.length, nWords: toks.length, sentences: sents };
  return { stream, gold: goldRows, meta: { language: g.language, file: file.path, parse: g.parse, capabilities: g.capabilities, unit } };
}

// ── notation adapter (D14) ─────────────────────────────────────────────────────────────────────────────────────────
/** One notation record in the contract of design 3.4: {system, family, split, doc, tokens:[{form, role}]}. Returns null when valid, else the reason. */
export function validateNotationRecord(r) {
  if (!r || typeof r !== "object") return "not an object";
  for (const k of ["system", "family", "doc"]) if (typeof r[k] !== "string" || !r[k]) return `missing ${k}`;
  if (!["train", "dev", "test"].includes(r.split)) return "split not in train|dev|test";
  if (!Array.isArray(r.tokens) || !r.tokens.length) return "tokens empty";
  for (const t of r.tokens) if (!t || typeof t.form !== "string" || typeof t.role !== "string") return "token without form or role";
  return null;
}
function* walk(dir, depth) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth > 0 && e.name !== "survey") yield* walk(p, depth - 1); }
    else yield p;
  }
}
/**
 * notationCorpus({roots}) -> {available, files, rejected, gap?}. A candidate is a *.jsonl or *.jsonl.gz (depth <= 3, the survey directory skipped)
 * whose first NOTATION_VALIDATE_RECORDS records ALL satisfy the contract. None -> {available:false, gap:"no gold yet"}; never inferred.
 */
export function notationCorpus({ roots = [ROOTS.notation, NOTATION_LOCAL] } = {}) {
  const files = [], rejected = [];
  for (const root of roots) for (const p of walk(root, 3)) {
    if (!/\.jsonl(\.gz)?$/.test(p)) continue;
    let text;
    try { text = readText(p); } catch (e) { rejected.push({ path: p, reason: `unreadable: ${e.message}` }); continue; }
    const lines = text.split("\n").filter((l) => l.trim()).slice(0, NOTATION_VALIDATE_RECORDS);
    let bad = lines.length ? null : "empty";
    let systems = new Set(), splits = new Set();
    for (const l of lines) {
      let rec; try { rec = JSON.parse(l); } catch { bad = "invalid JSON"; break; }
      bad = validateNotationRecord(rec); if (bad) break;
      systems.add(rec.system); splits.add(rec.split);
    }
    if (bad) rejected.push({ path: p, reason: bad }); else files.push({ path: p, systems: [...systems], splits: [...splits] });
  }
  if (!files.length) return { available: false, gap: "no gold yet", reason: "no JSONL file in the design 3.4 contract under the notation roots", files, rejected, denominators: { files: 0 } };
  return { available: true, files, rejected, denominators: { files: files.length } };
}
/** Read every record of a validated notation file; invalid records are counted, not imputed. */
export function loadNotationFile(file, { split = null } = {}) {
  const recs = [];
  let invalid = 0;
  for (const l of readText(file).split("\n")) {
    if (!l.trim()) continue;
    let r; try { r = JSON.parse(l); } catch { invalid++; continue; }
    if (validateNotationRecord(r)) { invalid++; continue; }
    if (split && r.split !== split) continue;
    recs.push(r);
  }
  return { records: recs, invalid };
}

// ── coreference adapter (D15) ──────────────────────────────────────────────────────────────────────────────────────
/** Entity= scanner: "(e5-x-1" open, "(e6-x-1)" single-token, "e5)" close, concatenated at one token. */
export function scanEntity(val) {
  const ev = [], n = val.length;
  let i = 0;
  while (i < n) {
    const c = val[i];
    if (c === "(") {
      let j = i + 1;
      while (j < n && val[j] !== "(" && val[j] !== ")") j++;
      const spec = val.slice(i + 1, j);
      if (j < n && val[j] === ")") { ev.push({ kind: "single", spec }); i = j + 1; } else { ev.push({ kind: "open", spec }); i = j; }
    } else if (c === ")") { ev.push({ kind: "stray" }); i++; }
    else {
      let j = val.indexOf(")", i);
      if (j < 0) j = n;
      ev.push({ kind: "close", spec: val.slice(i, j) }); i = j + 1;
    }
  }
  return ev;
}
const partOf = (spec) => {
  const first = spec.split("-", 1)[0];
  const m = /^(.+?)\[(\d+)\/(\d+)\]$/.exec(first);
  return m ? { eid: m[1], part: Number(m[2]), parts: Number(m[3]) } : { eid: first, part: null, parts: null };
};
const mentionType = (upos) => (upos === "PROPN" ? "name" : upos === "PRON" || upos === "DET" ? "pronoun" : "nominal");
/** The 80/20 document split of D15: bucket 0-3 -> "train", 4 -> "dev" (sha256 of the document id, first 8 hex digits, modulo 5). */
export function corefBucket(docId) {
  return parseInt(createHash("sha256").update(String(docId)).digest("hex").slice(0, 8), 16) % COREF_DEV_BUCKETS;
}
/**
 * parseCoref(sentences) -> {docs:[{docId, sentenceIndices, mentions, clusters}], counts}. Mentions: {cluster, eid, sent, start, end, endSent, head, headForm,
 * headUpos, type, etype, text, discontinuous, part, parts}; start/end are word indices (0-based) in sentence `sent`; a mention crossing sentences keeps
 * head null. Zero (empty-node) mentions are skipped and counted. Singletons are clusters of one mention. `sentences` must come from loadConllu(..., {keepMisc:true}).
 */
export function parseCoref(sentences) {
  const byDoc = new Map();
  for (const s of sentences) { const k = s.docId ?? "doc"; if (!byDoc.has(k)) byDoc.set(k, []); byDoc.get(k).push(s); }
  const docs = [];
  const counts = { documents: 0, sentences: sentences.length, mentions: 0, discontinuousParts: 0, unmatchedClose: 0, unclosedOpen: 0, strayParen: 0, zeroMentionRowsSkipped: sentences.meta?.emptyWithEntity ?? 0, singletons: 0, clusters: 0 };
  for (const [docId, sents] of byDoc) {
    const mentions = [], stack = [];
    const wordsBySent = new Map(sents.map((x) => [x.i, x.words]));
    let docUnmatched = 0;
    for (const sent of sents) {
      const ws = sent.words;
      const finish = (op, endIdx, endSent) => {
        const m = { eid: op.eid, cluster: `${docId}#${op.eid}`, sent: op.sent, start: op.start, end: endIdx, endSent, etype: op.etype, part: op.part, parts: op.parts, discontinuous: op.part != null };
        const first = wordsBySent.get(op.sentI) ?? null;
        if (endSent === op.sent && first) {
          const span = first.slice(op.start, endIdx + 1);
          const ids = new Set(span.map((w) => w.id));
          let h = span.findIndex((w) => w.head === 0 || w.head == null || !ids.has(w.head));
          if (h < 0) h = span.length - 1;
          m.head = op.start + h; m.headForm = span[h].form; m.headUpos = span[h].upos; m.type = mentionType(span[h].upos);
          m.text = span.map((w) => w.form).join(" ");
        } else { m.head = null; m.headForm = null; m.headUpos = null; m.type = "unknown"; m.text = null; }
        if (op.part != null) counts.discontinuousParts++;
        mentions.push(m);
      };
      for (let wi = 0; wi < ws.length; wi++) {
        const misc = ws[wi].misc ?? "";
        const at = misc.indexOf("Entity=");
        if (at < 0) continue;
        let val = misc.slice(at + 7);
        const bar = val.indexOf("|");
        if (bar >= 0) val = val.slice(0, bar);
        for (const ev of scanEntity(val)) {
          if (ev.kind === "stray") { counts.strayParen++; continue; }
          if (ev.kind === "open") { const p = partOf(ev.spec); stack.push({ ...p, sent: sent.i, sentI: sent.i, start: wi, etype: ev.spec.split("-")[1] ?? null }); }
          else if (ev.kind === "single") { const p = partOf(ev.spec); finish({ ...p, sent: sent.i, sentI: sent.i, start: wi, etype: ev.spec.split("-")[1] ?? null }, wi, sent.i); }
          else {
            const p = partOf(ev.spec);
            let k = stack.length - 1;
            while (k >= 0 && !(stack[k].eid === p.eid && stack[k].part === p.part)) k--;
            if (k < 0) { counts.unmatchedClose++; docUnmatched++; continue; }
            const [op] = stack.splice(k, 1);
            finish(op, wi, sent.i);
          }
        }
      }
    }
    counts.unclosedOpen += stack.length;
    const clusters = {};
    mentions.forEach((m, idx) => { (clusters[m.eid] ??= []).push(idx); });
    const nCl = Object.keys(clusters).length;
    counts.clusters += nCl; counts.singletons += Object.values(clusters).filter((a) => a.length === 1).length; counts.mentions += mentions.length; counts.documents++;
    docs.push({ docId, sentenceIndices: sents.map((x) => x.i), mentions, clusters, errors: { unmatchedClose: docUnmatched, unclosedOpen: stack.length } });
  }
  return { docs, counts };
}
/** Language code and family of a CorefUD treebank directory/file name (code = the part of the file name before the first "_"). */
function corefCodeOf(fileName) { return String(fileName).split("_", 1)[0]; }
/**
 * corefCorpus({split, root}) -> {available, split, treebanks:[{treebank, code, family, file, exists}], gaps, denominators}. Inventory only: no file is read.
 * split "train" and "dev" (learner-train and lambda-dev) are carved from the CorefUD TRAIN file by corefBucket; "test" is the CorefUD DEV file (D15).
 * Directories that are not the CorefUD CoNLL-U contract are typed gaps `not_corefud_contract`; a missing file is `file_absent`.
 */
export function corefCorpus({ split = "dev", root = ROOTS.coref } = {}) {
  if (!fs.existsSync(root)) return { available: false, split, gap: "no coref gold yet", reason: `no directory ${root}`, treebanks: [], gaps: [], denominators: { treebanks: 0 } };
  const treebanks = [], gaps = [];
  const fileKind = split === "test" ? "dev" : "train";
  for (const d of fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    if (d === "_docs" || d === "tools") continue;
    if (!d.startsWith("CorefUD_")) { gaps.push({ gap: "not_corefud_contract", directory: d }); continue; }
    const dir = path.join(root, d);
    const files = fs.readdirSync(dir).filter((f) => new RegExp(`-corefud-${fileKind}\\.conllu(\\.gz)?$`).test(f));
    if (!files.length) { gaps.push({ gap: "file_absent", treebank: d, kind: fileKind }); continue; }
    const code = corefCodeOf(files[0]);
    treebanks.push({ treebank: d, code, family: COREF_FAMILY_OF_CODE[code] ?? null, file: path.join(dir, files[0]), exists: true, split });
    if (!COREF_FAMILY_OF_CODE[code]) gaps.push({ gap: "family_undeclared", treebank: d, code });
  }
  if (!treebanks.length) return { available: false, split, gap: "no coref gold yet", reason: "no CorefUD CoNLL-U chain file found", treebanks, gaps, denominators: { treebanks: 0 } };
  return { available: true, split, root, treebanks, gaps, denominators: { treebanks: treebanks.length } };
}
/**
 * loadCorefTreebank(entry, {split}) -> {treebank, split, docs, counts, meta}. entry = a corefCorpus treebank. The document split of D15 is applied
 * for "train"/"dev"; "test" reads the CorefUD dev file whole (refused while the guard is armed). Documents are kept with their sentences' indices into `sentences`.
 */
export function loadCorefTreebank(entry, { split = entry.split ?? "dev", cache = true } = {}) {
  const sentences = loadConllu(entry.file, { cache, keepMisc: true });
  const parsed = parseCoref(sentences);
  const keep = split === "test" ? () => true : (d) => (corefBucket(d.docId) === COREF_DEV_BUCKETS - 1) === (split === "dev");
  const docs = parsed.docs.filter(keep);
  return { treebank: entry.treebank, code: entry.code, family: entry.family, split, sentences, docs, counts: parsed.counts, meta: sentences.meta };
}

// ── provenance ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Size and mtime of a data file, with its sha256 only when asked (digesting a TEST file reads it: refused while the guard is armed). */
export function fileFacts(file, { digest = false } = {}) {
  const abs = path.resolve(String(file));
  const st = fs.statSync(abs);
  const facts = { path: abs, bytes: st.size, mtimeMs: Math.round(st.mtimeMs) };
  if (digest) {
    if (GUARD.forbidTest && isHeldOutTestPath(abs)) throw heldOutError(abs);
    facts.sha256 = createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  }
  return facts;
}

// ── the DEV smoke (header PASS RULE S1-S7, PREDICTIONS P1-P7) ──────────────────────────────────────────────────────
/** The census of design Appendix B: train words (syntactic words including PUNCT). */
export const CENSUS_TRAIN_WORDS = Object.freeze({ hun: 20166, vie: 20215, tur: 37522, ell: 42326, lit: 47641, kor: 56687 });
/** Design 3.1 family sizes of the frozen set. */
export const DESIGN_FAMILY_SIZES = Object.freeze({ "Indo-European": 29, "Uralic": 3, "Afro-Asiatic": 2, "Turkic": 1, "Japonic": 1, "Koreanic": 1, "Sinitic": 1, "Austronesian": 1, "Austroasiatic": 1, "Basque": 1 });

function smokeStem(stem, { tbDir, evalDir }) {
  const reg = LANGUAGES[stem];
  const rep = { stem, role: reg?.role ?? "unregistered", family: reg?.family ?? null, declaredScript: reg?.scriptGroup ?? null, files: {} };
  for (const sp of ["train", "dev", "test"]) rep.files[sp] = fs.existsSync(splitPath(stem, sp, { tbDir, evalDir }));   // existence only; test is never opened
  if (!rep.files.train || !rep.files.dev) { rep.gap = "file_absent"; return rep; }
  const trainAll = loadConllu(splitPath(stem, "train", { tbDir }), { cache: false });
  const t = trainAll.meta;
  rep.train = { sentences: trainAll.length, words: t.words, ranges: t.ranges, empties: t.empties, rows: t.rows, malformed: t.malformed, malformedSamples: t.malformedSamples, idAnomalies: t.idAnomalies, newdocs: t.newdocs };
  const tp = typologyFrom(stem, trainAll);
  rep.typology = { mr: tp.mr, mrEqual: tp.mrEqual, unspacedShare: tp.unspacedShare, unspaced: tp.unspaced, unspacedFrozen: tp.unspacedFrozen, wof: tp.wof, wofClauses: tp.wofClauses, wofGap: tp.wofGap, documents: tp.documents, nUnits: tp.nUnits, nTypes: tp.nTypes };
  const sample = capSample(trainAll, { nCap: N_CAP, seed: seedFor(stem, "train", "cap"), unit: "word" });
  rep.sample = { tokens: sample.tokens, units: sample.units, sentences: sample.nSentences, fullTokens: sample.fullTokens, complete: sample.complete };
  const exposure = exposureCounts(sample.sentences);
  const devAll = loadConllu(splitPath(stem, "dev", { evalDir }), { cache: false });
  const d = devAll.meta;
  rep.dev = { sentences: devAll.length, words: d.words, ranges: d.ranges, empties: d.empties, rows: d.rows, malformed: d.malformed, malformedSamples: d.malformedSamples, idAnomalies: d.idAnomalies };
  const stream = streamOf(devAll), gold = goldOf(devAll);
  rep.dev.units = stream.nUnits;
  rep.dev.streamDigest = streamDigest(stream);
  // S5: UPOS14 coverage of the non-PUNCT words; PUNCT agreement between the two stream modes
  let nonPunct = 0, inE = 0, bothP = 0, upOnly = 0, uniOnly = 0, total = 0;
  for (const s of devAll) for (const w of s.words) {
    const up = w.upos === "PUNCT", uni = PUNCT_ONLY.test(w.form);
    total++; if (up && uni) bothP++; else if (up) upOnly++; else if (uni) uniOnly++;
    if (!up) { nonPunct++; if (UPOS14_SET.has(w.upos)) inE++; }
  }
  rep.dev.upos14Coverage = nonPunct ? inE / nonPunct : null;
  rep.dev.punct = { agreement: total ? (total - upOnly - uniOnly) / total : null, bothPunct: bothP, uposOnly: upOnly, unicodeOnly: uniOnly };
  const unicodeStream = streamOf(devAll, { punct: "unicode" });
  rep.dev.unicodeUnits = unicodeStream.nUnits;
  // S4: strata
  const { strata, summary } = exposureStrata(stream, exposure, { gold });
  let violH1 = 0, violMono = 0;
  const last = new Map();
  for (const s of stream.sentences) for (let i = 0; i < s.n; i++) {
    const r = strata[s.s][i];
    if (r.h1 && !r.h0) violH1++;
    const prev = last.get(s.idents[i]);
    if (prev !== undefined && r.nSeen !== prev + 1) violMono++;
    last.set(s.idents[i], r.nSeen);
  }
  rep.dev.strata = { all: summary.all, E: summary.E, byStratum: summary.byStratum, nbin: summary.nbin, h1NotInH0: violH1, nSeenNotMonotone: violMono };
  // S3: script
  const ds = dominantScript(devAll);
  rep.dev.script = { dominant: ds.dominant, matchesDeclared: reg ? ds.dominant === reg.scriptGroup : null, shares: ds.shares };
  rep.dev.documents = documentOrder(devAll);
  rep.dev.deprel = (() => { const m = deprelCountsOf(devAll); let n = 0; for (const v of m.values()) n += v; return { labels: m.size, evalTokens: n }; })();
  return rep;
}

/**
 * smoke({stems, tbDir, evalDir, corefMaxGzBytes, log}) -> the report. DEV (and the train splits the exposure needs) only: the guard is armed, the TEST splits
 * are checked for EXISTENCE and never opened, and the report states S1-S7 and P1-P7 with the numbers behind them.
 */
export async function smoke({ stems = null, tbDir = ROOTS.tb, evalDir = ROOTS.ud, corefMaxGzBytes = 3 * 1024 * 1024, log = () => {} } = {}) {
  setReadGuard({ forbidTest: true });
  clearReadLog();
  const started = Date.now();
  const list = stems ?? [...FROZEN_STEMS, ...CONTROL_STEMS, ...LATE_STEMS];
  const per = {};
  for (const stem of list) {
    const t0 = Date.now();
    per[stem] = smokeStem(stem, { tbDir, evalDir });
    per[stem].seconds = (Date.now() - t0) / 1000;
    log(`${stem} ${per[stem].gap ?? "ok"} ${per[stem].seconds.toFixed(1)}s`);
  }
  const frozen = list.filter((s) => FROZEN_STEMS.includes(s));
  const late = list.filter((s) => LATE_STEMS.includes(s));
  // partitions and the family table
  const parts = Object.fromEntries(Object.entries(PARTITIONS).map(([k, p]) => [k, { folds: p.folds.length, ...checkPartition(p) }]));
  const famCount = {};
  for (const s of FROZEN_STEMS) famCount[FAMILY_OF[s]] = (famCount[FAMILY_OF[s]] ?? 0) + 1;
  const s7 = FROZEN_STEMS.length === 41 && JSON.stringify(Object.fromEntries(Object.entries(famCount).sort())) === JSON.stringify(Object.fromEntries(Object.entries(DESIGN_FAMILY_SIZES).sort()))
    && parts.P1.ok && PARTITION_P1.folds.reduce((a, f) => a + f.heldOut.length, 0) === 41;
  // code, notation, coref (inventory; the coref dev SLICE reads TRAIN files only)
  const code = codeCorpus({ split: "dev" });
  let manifestLangs = null;
  try { manifestLangs = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOTS.code, "manifest.json"), "utf8")).languages).sort(); } catch { /* typed below */ }
  const codeUnion = [...CODE_LANGS].sort();
  const codeSummary = { available: code.available, languages: code.languages?.length ?? 0, files: code.denominators?.files ?? 0, gaps: code.gaps, familyUnionEqualsManifest: manifestLangs ? JSON.stringify(manifestLangs) === JSON.stringify(codeUnion) : null, splitRule: code.splitRule ?? null };
  const notation = notationCorpus();
  const corefInv = corefCorpus({ split: "dev" });
  const coref = { available: corefInv.available, treebanksListed: corefInv.treebanks?.length ?? 0, gaps: corefInv.gaps, loaded: [] };
  if (corefInv.available) for (const tb of corefInv.treebanks) {
    let gz = 0; try { gz = fs.statSync(tb.file).size; } catch { /* skip */ }
    if (gz > corefMaxGzBytes) { coref.loaded.push({ treebank: tb.treebank, skipped: `file ${gz} bytes > ${corefMaxGzBytes} (smoke size cap)` }); continue; }
    const L = loadCorefTreebank(tb, { split: "dev", cache: false });
    const c = L.counts;
    coref.loaded.push({ treebank: tb.treebank, code: tb.code, family: tb.family, docsAll: c.documents, docsInDevSlice: L.docs.length, mentionsAll: c.mentions, clusters: c.clusters, singletons: c.singletons,
      unmatchedClose: c.unmatchedClose, unclosedOpen: c.unclosedOpen, discontinuousParts: c.discontinuousParts, zeroMentionRowsSkipped: c.zeroMentionRowsSkipped,
      mentionsInDevSlice: L.docs.reduce((a, d) => a + d.mentions.length, 0), docsWithMatchError: L.docs.filter((d) => d.errors.unmatchedClose || d.errors.unclosedOpen).length });
  }
  const log2 = readLog();
  const heldOutReads = log2.filter((r) => r.heldOut);
  // checks
  const present = frozen.every((s) => per[s].files.train && per[s].files.dev && per[s].files.test);
  const badMal = frozen.filter((s) => per[s].train && per[s].dev && (per[s].train.malformed / Math.max(1, per[s].train.rows) > MAX_MALFORMED_SHARE || per[s].dev.malformed / Math.max(1, per[s].dev.rows) > MAX_MALFORMED_SHARE));
  const censusMiss = Object.entries(CENSUS_TRAIN_WORDS).filter(([s, n]) => list.includes(s) && per[s].train?.words !== n).map(([s]) => ({ stem: s, expected: CENSUS_TRAIN_WORDS[s], got: per[s].train?.words ?? null }));
  const scriptMiss = frozen.filter((s) => per[s].dev && per[s].dev.script.matchesDeclared === false).map((s) => ({ stem: s, declared: per[s].declaredScript, dominant: per[s].dev.script.dominant }));
  const strataBad = frozen.filter((s) => per[s].dev && (per[s].dev.strata.h1NotInH0 || per[s].dev.strata.nSeenNotMonotone));
  const covLow = frozen.filter((s) => per[s].dev && per[s].dev.upos14Coverage < 0.9).map((s) => ({ stem: s, coverage: per[s].dev.upos14Coverage }));
  const punctLow = frozen.filter((s) => per[s].dev && per[s].dev.punct.agreement < 0.95).map((s) => ({ stem: s, agreement: per[s].dev.punct.agreement }));
  const punct99Low = frozen.filter((s) => per[s].dev && per[s].dev.punct.agreement < 0.99).map((s) => ({ stem: s, agreement: per[s].dev.punct.agreement }));
  const unspacedBad = frozen.filter((s) => per[s].typology && (UNSPACED_FROZEN.includes(s) ? per[s].typology.unspacedShare <= 0.5 : per[s].typology.unspacedShare >= 0.05)).map((s) => ({ stem: s, share: per[s].typology.unspacedShare }));
  const h1Low = frozen.filter((s) => per[s].dev && per[s].dev.strata.E.H1 < 200).map((s) => ({ stem: s, H1: per[s].dev.strata.E.H1 }));
  const lateMissing = late.filter((s) => !(per[s].files.train && per[s].files.dev && per[s].files.test));
  const corefMentionsOk = coref.loaded.filter((x) => x.docsInDevSlice != null);
  const corefErrDocs = corefMentionsOk.reduce((a, x) => a + x.docsWithMatchError, 0), corefDocs = corefMentionsOk.reduce((a, x) => a + x.docsInDevSlice, 0);
  const checks = {
    S1_present_and_clean: { pass: present && badMal.length === 0, notPresent: frozen.filter((s) => !(per[s].files.train && per[s].files.dev && per[s].files.test)), malformedOver: badMal.map((s) => s) },
    S2_census: { pass: censusMiss.length === 0, miss: censusMiss },
    S3_script: { pass: scriptMiss.length === 0, miss: scriptMiss },
    S4_strata: { pass: strataBad.length === 0, bad: strataBad },
    S5_coverage_and_punct: { pass: covLow.length === 0 && punctLow.length === 0, upos14Below90: covLow, punctAgreementBelow95: punctLow },
    S6_no_test_read: { pass: heldOutReads.length === 0, heldOutReads, filesRead: log2.length },
    S7_family_table: { pass: s7, familyCounts: famCount },
  };
  const predictions = {
    P1_all_S_hold: Object.values(checks).every((c) => c.pass),
    P2_unspaced_share: { holds: unspacedBad.length === 0, bad: unspacedBad },
    P3_punct_agreement_99: { holds: punct99Low.length === 0, below99: punct99Low },
    P4_h1_at_least_200_but_3: { holds: h1Low.length <= 3, below200: h1Low },
    P5_late_present: { holds: lateMissing.length === 0, missing: lateMissing },
    P6_code_union_equals_manifest: { holds: codeSummary.familyUnionEqualsManifest === true },
    P7_coref_chain_files_and_entity_parse: { holds: coref.available && corefDocs > 0 && (corefDocs - corefErrDocs) / corefDocs >= 0.99, docs: corefDocs, docsWithError: corefErrDocs },
  };
  return {
    schema: "LawCorpusSmoke@1", design: { doc: DESIGN_DOC, sha256: DESIGN_SHA256 }, split: "dev", guard: readGuard(), seedDomain: SEED_DOMAIN, nCap: N_CAP,
    seconds: (Date.now() - started) / 1000, stems: list, perStem: per, partitions: parts, code: codeSummary,
    notation: { available: notation.available, gap: notation.gap ?? null, rejected: notation.rejected.length }, coref, checks, predictions, readLog: log2.map((r) => ({ path: r.path, kind: r.kind, heldOut: r.heldOut })),
  };
}

// ── CLI: node eval/law/corpus.mjs smoke [--out FILE] [--stems a,b,c] ───────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  if (args[0] !== "smoke") { console.error("usage: node eval/law/corpus.mjs smoke [--out FILE] [--stems a,b,c]   (DEV only; --split test is refused)"); process.exit(2); }
  if (arg("--split") && arg("--split") !== "dev") { console.error("refused: the smoke runs on DEV only"); process.exit(2); }
  const stems = arg("--stems") ? arg("--stems").split(",") : null;
  const rep = await smoke({ stems, log: (m) => console.error(m) });
  const out = arg("--out") ?? path.join(ROOTS.law, "smoke", "corpus-dev.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(rep, null, 1));
  console.log(JSON.stringify({ out, seconds: rep.seconds, checks: Object.fromEntries(Object.entries(rep.checks).map(([k, v]) => [k, v.pass])), predictions: Object.fromEntries(Object.entries(rep.predictions).map(([k, v]) => [k, typeof v === "boolean" ? v : v.holds])) }, null, 1));
}
