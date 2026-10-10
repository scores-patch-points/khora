# Kind-induction swarm — shared brief (read this whole file first)

Repo: /Users/mlacy/Documents/3.0/khora (code in native/). khora is a ZERO-MODEL reader: no LLM call may appear in khora code or in any score. You are an "ant": one of six
workers on one question. Ants never message each other: coordinate ONLY through marks (`node native/eval/kinds-swarm/mark.mjs read` first; `claimed <path>` before you touch a file;
`add <ant> claim|found|blocked|done <path|-> "<note>"`). Write only NEW files under native/eval/kinds-swarm/<your-ant-name>/ (create it). Do NOT edit any existing file, do NOT touch other
repos, do NOT git add/commit/push, do NOT launch workflows or other agents, do NOT kill other processes (the machine is heavily loaded by other sessions; CPU time is small, wall clock is
slow: write cheap deterministic experiments, run long jobs with nohup in the background and poll their output files; never `cat` big files — use head/grep — and keep your own context small).
Stop when your REPORT.md is written (target: about 90 minutes of wall clock and roughly 120 tool calls) and mark `done`. Your final message must contain: a plain-language summary, the
numbers that matter, every pre-registered prediction with its outcome (failures included), and the paths of what you wrote.

## The question (user, 2026-10-06)
"Do kind induction to see if types of nouns behave differently — that is where the signal is hiding." Background: the user holds that proper nouns have a specific SHAPE in the holograph
(what changes in the reader's slot structure when they are ablated; what they occupy while present), that the shape is specific to WORD-ORDER LANGUAGE FAMILIES, and that "a name is that which
affects the holographic field like a name". Our tests so far found the pooled signal weak or absent. Hypothesis under test: POOLING hides it — nouns are not one class; kinds of nouns
(persons, places, organisations, software/products, common count nouns, mass nouns, abstracts, ...) behave differently, so averaging them cancels (a Simpson-type effect). Kinds must be
INDUCED (from company, with no POS tags and no word lists), never taught.
Claims (each needs a stated falsifier BEFORE you run):
  K1 company-induced kinds exist: stable across windows/halves, non-trivial (more structure than a shuffled-company null), not just frequency bands.
  K2 kinds differ in their holographic signature (shadow when ablated, imprint, mass/inertia-like fragility vs mention count) by more than random partitions of the same sizes.
  K3 conditioning on kind reveals a signal pooling hides: a kind-conditioned model separates names / kind members from matched non-members better than the pooled model; look for sign
     reversals between kinds (a Simpson check) and report them.
  K4 the kind structure (which kinds exist, their signatures) is more alike within a word-order family than across (families below).

## What exists (read the headers, do not re-derive)
- Kind induction: native/organs/kind-standing.js (contextVectors, discoverCompanyKinds, kindFit, kindMembership, foldPermitted, frameWords, kindNotes: kind of a referent from the token
  before/after each mention — counts not sets — nothing named, nothing taught, gated by licensed nulls); native/adapters/text/existence-grain.js (Entity / Kind / Void by what a form refuses);
  native/organs/barker.js + native/eval/barker/induce.mjs + native/docs/BARKER.md (kind induction over system profiles); native/organs/heard-surfaces.js (company-signed beings).
- Holographic instrument: native/eval/law/impact.mjs (slot ablation at the SLOT not the span; three PRIOR-FREE readers; typed deltas emptied/retyped/rebound/refilled/shifted/born; 85-d IMPACT-SLOT
  signature + 19-d atmosphere + 32-d span rival + 8-d company-structure; makeSnapshot, impactOfToken, impactBatch, slotStructure, slotDeltas, tokenSlotsOf, readWindow, sampleTokens,
  readConlluStream, shuffleSentences). native/eval/law/name-shape.mjs (JOINT ablation of all tokens of a class: shadow, imprint, collateral shadow, amplification — results in
  native/eval/law/NAME-SHAPE-RESULTS.md: pooled PROPN shadow ~ random-set shadow, cosine 0.98, not family-specific; this is the NEGATIVE you are trying to explain or overturn).
  native/eval/law/NAME-RULE-RESULTS.md (IRC chat: single-token slot-entry score AUC 0.84 but a local mention count ties it; War and Peace 0.51; single mention invisible causally),
  native/eval/law/name-war-and-peace.mjs (exports cvScores, fitLogit, predict, standardise, aucOf, bootDiff: a ridge-logistic leave-block-out CV used as a generic measuring instrument; a fitted
  classifier on the whole signature got AUC 0.75 on War and Peace and 0.63 at first mention where a single scalar was at chance), native/eval/BEINGS-LADDER.md, native/eval/rules-structure.mjs
  (rules mostly add; profiles are stable per language; evidence rules combine as ORDERED roles — the grammar's name-vs-common-noun evidence first, keyness second).
- Production pipeline (carries priors, so any result through it is labelled CONTAMINATED): native/the-fold/corpus-session.js (createSession, admitChunked, sessionReferents, sessionRelations).
- Docs: native/docs/THE-WHEEL.md (Void / Beings / Fold: the fold is "the difference the being MADE" = difference-that-makes-a-difference), THE-HOLOGRAPH.md, THE-CORE-MECHANISM.md,
  LAW-FALSIFICATION.md. kernel/activation.js has dmdWindow. Another agent is working on "the physics" (mass, inertia, gravity, density, curvature) in native/eval/physics-handles/ — you may
  read it, do not write there.

## Data (all local)
- UD gold (EVALUATION AND CLASS LABELS ONLY; no reader sees gold, no prior, no capital): /private/tmp/claude-501/ud-eval/<stem>/dev.conllu (25 stems: eng spa rus cmn cmn-hans arb heb fas kor jpn
  fra deu ita por nld pol ukr hin vie ind swe urd tur ell fin). TEST splits are SPENT: never read them. Held-out folds with priors rebuilt without them: /private/tmp/claude-501/fold80 (last 20%
  of each TRAIN treebank, <stem>/tail.conllu, priors in fold80/priors) and /private/tmp/claude-501/fold80B (first 20%). impact.mjs readConlluStream gives {sents, upos}: lowercase word units, no
  punctuation.
- Informal English (NO capitals/typos fixed): /Users/mlacy/Documents/3.0/ethos/19-organic-community/{ubuntu-irc,nus-sms,cosem,enron}. IRC lines are `<nick> text`: the speaker field is METADATA —
  a body token equal to a nick that spoke that day is a name occurrence (see eval/law/name-rule-informal.mjs loadIrc for the exact rule; it is not importable, copy what you need).
- War and Peace (Maude): /Users/mlacy/Documents/3.0/ethos/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt; hand-verified cast of 48 referents:
  /Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoreader5/priors/coref/war-and-peace.json; name-war-and-peace.mjs has loadBook().
- Word-order families are DATA-DERIVED: native/priors/role-config-<stem>.json (subject.before/total, object.before/total). k-means K=3 on (S-before, O-before): SOV-like {fas kor jpn nld hin urd tur},
  SVO-like (two clusters) {eng cmn cmn-hans fra por vie ind swe} and {spa rus arb heb deu ita pol ukr ell fin}; merge the two SVO-like clusters for a 2-family scheme and also report the 3-cluster scheme.

## The user's standing rules (obey)
- Learning to tell nouns from WELL-FORMATTED text is not good practice: no capitals, no POS prior, no treebank in any LABEL OR SCORE of a test of the physics; gold only for evaluation/stratification;
  anything that is fitted on UD must be tested on held-out folds AND on the informal English. Everything must also work on non-standard English.
- Ablate and read the SLOT, not the span. A name can appear once and be a name (single mention: existence is never "occurs twice"). Thresholds should be DERIVED (the repo's "born" mode in
  native/adapters/text/anchoring.js: p = a^2 / sum a^2, floors from the material's own earlier verdicts), not typed; say every typed number and why. Rules on to the degree they make a
  difference that makes a difference.
- PRE-REGISTER before you run (II.5): write predictions, thresholds and the result that would falsify each claim into the header of your script/PREREG.md BEFORE its first run; keep a hash of the
  header; controls built to fail beside every claim (label permutation within blocks; company shuffle = within-sentence shuffled text, which must collapse a company-based signal; random partitions of
  the same sizes for any kind result; sham ablation); report failed predictions as failures; never retune after reading a result (a second round is a new, dated amendment with fresh held-out data).
- Causal = prefix only for anything about reading. Case-strip text. Note CPU: reading one 128-sentence window costs roughly 0.1-0.3 s of CPU.
