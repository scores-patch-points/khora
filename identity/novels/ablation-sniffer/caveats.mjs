// caveats.mjs — what the wired unit-cells priors must say about themselves, in one place (used by wire-unit-priors.mjs and amend-wired-caveats.mjs,
// so the staged-and-wired path and the amended path cannot drift apart).
export const JUNK_MARKER = "Strings that are not words";
export const BASE_CAVEATS = [
  "A PROPOSER, never a decider: ranked operators with a margin. Plain accuracy (0.275) is below always answering INS (0.434); the gold operator is in the 3 nearest centroids 64% of the time, below the class-frequency prior (75%).",
  "The margin is a weak, class-dependent confidence: within a class it helped for CON, DES (SIG) and SEG, not for INS or ALT (DEF). Do not treat it as calibrated.",
  "Claims by null bound are empty for 91% of words; use the ranked list, not `claimed`.",
  "The labels are an LLM giver's (claude-sonnet-4) assigned through English glosses: this recovers a verb's lexical meaning class. It is not evidence that grammatical categories sit in the same cells across languages (identity/novels/cross-language-cell-profile says they do not).",
  "Verbs only; units tested were words (and clauses by their head verb); canon of 2,201 words over 28 languages, 30 test words per language.",
];
/** the caveat the attack on the wired sniffer added (RESULTS-FALSIFY-UNIT-SNIFFER.md); the cell head was not tested on non-words, and says so */
export const junkCaveat = (head) => (head === "op"
  ? `${JUNK_MARKER} are pulled toward ALT (DEF in the current cube): 32% of character-scrambled non-words got that class (162 of 501) against about 18% for real words, so a large share of DEF answers in some text may be noise. The margin separates real words from non-words only weakly (area under the curve 0.585, 95% 0.539 to 0.629). Measured on this operator head; identity/novels/ablation-sniffer/RESULTS-FALSIFY-UNIT-SNIFFER.md.`
  : `${JUNK_MARKER} were tested on the OPERATOR head only: character-scrambled non-words were pulled toward ALT (DEF in the current cube) 32% of the time (162 of 501) there. The 27-cell head was not tested on non-words; expect the same pull toward its ALT (DEF) cells and a weak margin until it is. identity/novels/ablation-sniffer/RESULTS-FALSIFY-UNIT-SNIFFER.md.`);
export const caveatsFor = (head) => [...BASE_CAVEATS, junkCaveat(head)];
/** the attack, summarised for the prior's metadata */
export const ATTACK = {
  date: "2026-11-24", verdict: "SURVIVES (preregistered, one run, fresh held-out words, same canon, leave-the-whole-family-out)",
  replication: { words: 1433, balancedAccuracy: 0.403, shuffledNullP975: 0.190, spellingBaseline: 0.118 },
  notTranslationLookup: { uncoveredWords: 787, balancedAccuracy: 0.337, shuffledNullP975: 0.229, coveredBalancedAccuracy: 0.422 },
  formInvariance: { pairs: 385, languages: 27, agreementLemmaVsForm: 0.571, expectedUnderIndependence: 0.122 },
  nonWords: { scrambled: 501, predictedAltShare: 0.323, marginAucRealVsScrambled: 0.585 },
  evidence: "identity/novels/ablation-sniffer/RESULTS-FALSIFY-UNIT-SNIFFER.md",
};
