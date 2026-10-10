// classify-config.mjs — decisions of the atlas-run phase that PROTOCOL.md leaves open, fixed BEFORE any atlas output existed (see results/FIXES.md, entry 0).
// Imported by classify-atlas.mjs. Nothing here may be edited after the atlas run starts; its sha256 is recorded in results/FIXES.md.

// ---- cell definition -------------------------------------------------------------------------------------------------------------------
// A cell (pocket, statistic) is DEFINED iff, in BOTH halves, v is finite and z is finite (z is finite only when the 10 null draws have sd > 0).
// A cell with finite v in both halves but a null z in at least one half is counted as "zUndefined" (neither PRESENT nor ABSENT) and is NOT in N.
// pocket-level value used for v-based summaries = mean of the discover and confirm v; pocket-level |z| = min(|z discover|, |z confirm|).
export const REAL_EXCLUDED_GROUPS = ["pl", "ct"];          // planted worlds and shuffled-real controls are instrument checks, never in law-level counts

// ---- grain classes (G3), derived from pocket id / metadata only --------------------------------------------------------------------------
export function grainOf(p) {
  const id = p.id, tk = String(p.meta?.tokenisation ?? "");
  if (/^ml-(lzh|jpn)-/.test(id) || id === "fm-udhr-bigram" || id === "oc-nussms-zh" || /char-bigram|CHARACTER BIGRAMS/i.test(tk)) return "charbigram";
  if (/^cd-(cc|e09-(c|cpp|go|python|eoapp-js)|lilypond|musicxml|mscx|bpmn|dot|mermaid|sbgn)(-|$)/.test(id)) return "code";
  if (/^cd-(chess|smiles|iupac|protein|codons|ipa|abc)/.test(id)) return "notation";
  return "word";                                             // natural-language words (incl. UD syntactic words, cd-chebi-defs, cd-taxon-en, cd-e09-docs, cd-gene-products)
}

// ---- shared property / constant-varies attributes ------------------------------------------------------------------------------------
export const CAT_ATTRS = ["group", "register", "script"];
export const NUM_ATTRS = ["tokens", "meanUnitLength", "docs"];   // compared on log10 scale
export const PERM_DRAWS = 2000;

// ---- G0: planted phenomena -> candidate statistics with the expected sign (written from planted-truth.json 'sign' fields and the STATS statements) --
// A phenomenon is RECOVERED iff at least one candidate has |z| >= 4 in both halves with the stated sign, in that world.
export const G0_PHENOMENA = [
  { world: "pl-burst", id: "local-repetition", cands: { "burst.repAdj": +1, "burst.kerFar": +1, "burst.burstB": +1, "fig.figShare": +1, "freq.ttr": -1, "freq.hapaxShare": -1 } },
  { world: "pl-burst", id: "self-excitation", cands: { "burst.burstB": +1, "burst.burstBmid": +1, "fig.fano": +1 } },
  { world: "pl-markov", id: "rank-bin-flow", cands: { "order.asym": +1, "comp.condR": -1, "comp.condL": -1 } },
  { world: "pl-markov", id: "no-self-repetition", cands: { "burst.repAdj": -1 } },
  { world: "pl-frames", id: "rigid-frames", cands: { "comp.rigidL": +1, "comp.rigidR": +1, "comp.condR": -1, "comp.condL": -1, "comp.finEnt": -1, "order.asym": +1 } },
  { world: "pl-frames", id: "company-classes", cands: {} },                       // no statistic of the atlas measures clusterability of types by neighbour profile: declared untestable in advance
  { world: "pl-frames", id: "vocative-names", cands: { "comp.initEnt": -1, "fig.initEnrich": +1, "fig.initSplit": +1 } },
  { world: "pl-parallel", id: "anaphora", cands: { "para.prefixCopy": +1, "para.posPar": +1 } },
  { world: "pl-parallel", id: "epiphora", cands: { "para.suffixCopy": +1 } },
  { world: "pl-parallel", id: "adjacent-unit-overlap", cands: { "para.adjNg2": +1, "para.lcsLift": +1, "burst.persist": +1 } },
  { world: "pl-length", id: "menzerath", cands: { "freq.menzerath": -1 } },
  { world: "pl-mix", id: "mix-local-repetition", cands: { "burst.kerFar": +1, "burst.burstB": +1, "fig.figShare": +1 } },
  { world: "pl-mix", id: "mix-rank-bin-flow", cands: { "order.asym": +1, "comp.condR": -1, "comp.condL": -1 } },
  { world: "pl-mix", id: "mix-names", cands: { "comp.initEnt": -1, "fig.initEnrich": +1, "fig.initSplit": +1 } },
  { world: "pl-mix", id: "document-heterogeneity", cands: { "freq.lenDocEps": +1 } },
];
// zDetectable:false items are checked on raw v / as negative controls, not on z:
//  zipf-abbreviation: freq.abbrev v (Spearman count vs code-point length) < -0.3 in BOTH halves of pl-length and |v| < 0.15 in both halves of pl-null and pl-null2.
//  sign-cancellation (negative control): burst.repAdj in pl-mix must NOT be PRESENT.
export const G0_ABBREV = { stat: "freq.abbrev", world: "pl-length", vMax: -0.3, iidWorlds: ["pl-null", "pl-null2"], iidAbs: 0.15 };
export const G0_CANCEL = { stat: "burst.repAdj", world: "pl-mix" };
export const IID_WORLDS = ["pl-null", "pl-null2"];

// statistic-level planted check (decides exclusion from SELECTION; every statistic stays in the law table):
//  FAIL if (a) it has a PRESENT cell in an iid world, or (b) in a world where it is a candidate it is PRESENT in both halves with the OPPOSITE of the stated sign,
//  or (c) its z is undefined in every real and planted cell (z-inert).  Otherwise PASS; PASS is labelled 'validated' if it fired as expected in >= 1 planted world, else 'unvalidated'.

// ---- selection -----------------------------------------------------------------------------------------------------------------------
export const SEL = { maxSpecific: 8, maxUniversal: 4, pShared: 0.05, sizeRho: 0.7 };
// eta-squared >= 0.5 and permutation p < 0.01 => "pocket-class-specific" constant
export const CONST_CLASS = { eta2: 0.5, p: 0.01 };
