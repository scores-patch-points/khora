# LAW-FALSIFICATION: a pre-registered attempt to falsify "you know a word by the company it keeps // a token's role is determined by the type of impact it has on the holograph, bounded by differences that make a difference"

**Standing: pre-registration, revision 2.** This document is written before any
run of any instrument it describes. It contains no result. It is frozen by
recording its sha256 at `/private/tmp/claude-501/law/PREREGISTRATION.sha256`
(format: `<hex>  LAW-FALSIFICATION.md`); `eval/law/run.mjs` refuses
`--split test` unless that file exists and matches the file on disk (section 7).
After the freeze nothing here changes: a changed design is a v3 with a new hash,
run on data the v2 never touched (the late reserve, section 3.2). Where the code
and this document disagree, the document wins and the code is the bug, except
that a bug found after a run is reported next to the original run, never in
place of it (section 8). Written 2026-10-05 for the khora repo
(`/Users/mlacy/Documents/3.0/khora/native`), the stripped canonical of
eoreader7. khora is a ZERO-MODEL reader: no LLM call appears in khora code or
in any score below. The learners in section 2.8 are generic measuring
instruments (regularised logistic regression and a one-hidden-layer network
trained from scratch on the data of the run, no pretrained weights, no
embeddings, no external data); they are not part of khora's reading and no
claim below is about them.

**Revision history.** Revision 1 (sha256 `a6272f43...`, 1,441 lines) was never
frozen and never run. Revision 2 (this file, 2026-10-05) applies the review
panel's findings and the user's two binding refinements (R1 ablation at the
slot; R2 identity as a fold). The dated record of every finding and what was
done with it is section 11, "Amendments from review". Nothing was deleted to
make a claim pass; where a test could not fail it was changed so that it can,
and where a rule was made more permissive (the per-unit tolerance of 2.10) it
was made so only by a derivation from the instrument's own measured power, and
a stricter falsifier was added beside it (replication, the ladder of 1.8, the
failure table of 6.5).

The user's request, verbatim: *"falsify this as a fundamental law: you know a
word by the company it keeps // a token's role is determined by the type of
impact it has on the holograph, bounded by differences that make a difference"*.
"Fundamental law" is taken to mean a claim of universality, not a convenient
heuristic. Section 1.6 turns that into five rungs that can each fail. Two
refinements by the user are binding and replace the corresponding parts of
revision 1: *"Ablate the tokens and see how they impact things, look at the
slot not the spans"* (R1, sections 2.5 and T5/T10) and *"Identity is the
universe folded at a point, from a perspective, bounded by differences that
make a difference. Spans that survive this are the same referent"* (R2,
section 2.5.7 and T11).

---

## 0. How to read this document

1. Section 1 parses the sentence into separately testable claims, says which
   half is descriptive and which is mechanistic, and (1.8) fixes the **ladder
   of readings** of the sentence, each with a risky prediction and the result
   that kills it, so that the report names the strongest reading that survives
   instead of one OR over all claims.
2. Section 2 fixes every definition: units, company (five separate arms),
   role, slot-based impact, the fold, the bound, rivals, learners, metric,
   and the single smallest effect size of interest (SESOI) that every
   equivalence and superiority claim uses.
3. Section 3 fixes the splits and the family partitions.
4. Section 4 is the instrument gate: nothing about the law is concluded unless
   the instrument first shows it can see planted structure of the claimed form
   (to a fraction of an oracle ceiling, at the decision boundaries actually
   used) and reject planted structure of the rival form, and unless the
   verdict function can reach both HOLDS and FALSIFIED.
5. Section 5 is the tests T1 to T11 (and T1b), each with claim, data,
   features, null, control built to fail, power check, alternatives, held-out
   rule, statistic, outcome table, and a prediction recorded ahead of data.
6. Section 6 says how test verdicts combine into readings, what an amendment
   means, and tabulates for every claim the result that would have counted as
   failure.
7. Section 7 lists the new modules and exact exports and the tests.
8. Section 8 is procedure and stopping rules; section 9 is risks and the
   multiple-comparison control; section 10 lists every declared constant with
   its reason; appendix A specifies the planted languages (power checks);
   appendix B records the census facts used as design inputs (counts only);
   section 11 is the dated record of the review amendments.

Vocabulary used throughout: **arm** (one feature visibility regime fed to the
common learner), **protocol W** (within language, lexical identities allowed),
**protocol X** (leave one language family out, language-independent summaries
only), **G** (held-out information gain in bits per token), **SESOI**
(smallest effect size of interest, 2.10), **stratum** (a partition of
evaluation tokens by exposure), **gate** (a pre-condition on the instrument),
**slot** (a structural position a token fills in the holograph, 2.5.1),
**fold** (the structure of the universe projected at a slot from a
perspective, truncated at a horizon, 2.5.7), **reading** (a rung of the
ladder of 1.8).

---

## 1. The law, parsed

### 1.1 The sentence as claims

The sentence has two clauses joined by `//` and a bound at the end of the
second.

- **C1 (Firth).** A token's ROLE is determined by its COMPANY (the tokens it
  keeps, at the horizon that matters), not by its own form and not by its
  absolute position.
- **C2 (holograph).** A token's role is determined by the TYPE OF IMPACT it has
  on the holograph. Impact is operationalised by ABLATION AT THE SLOT (user
  refinement R1; the repo's own method, `THE-CORE-MECHANISM.md`: rebuild the
  ground with one relation destroyed and read the difference): rebuild the
  reading with the token ablated, look at the slot it filled and the slots
  around it, and record typed slot deltas (emptied, refilled, shifted,
  retyped, rebound, born, unchanged). The impact signature is the
  distribution of those typed slot deltas. A span- or string-based impact is a
  rival operationalisation (T10), not the definition.
- **C3 (bound).** The relevant company and the relevant impact are bounded by
  differences that make a difference: widening the context or the horizon
  beyond the `dmdWindow`-measured depth changes nothing about the role.
- **C4 (identity, the user's second statement, R2).** Identity is the universe
  folded at a point, from a perspective, bounded by differences that make a
  difference; two spans are the same referent iff their folds survive
  substitution into each other's slot (T11). C4 is not a clause of the
  sentence under test; it is the identity criterion that the slot-based
  impact of C2 presupposes (a being is a referent that is known by its effect
  on the holograph), so it is tested with the sentence and reported with it.
- **U (universality).** C1, C2 and C3 hold across language families, scripts,
  non-natural systems (code, notations) where gold exists, and at more than one
  grain (token role, being versus non-being, kind, clause role).

### 1.2 Two laws, a bound, an identity criterion, falsified separately

The law as phrased mixes a **descriptive** claim with a **mechanistic** claim.

- **L-D (descriptive/predictive, C1).** There is a function from company to
  role. It is falsified by prediction: held-out information gain (section 2.9)
  against rivals and nulls, and by counterexample (same company, different
  role, T1b). It says nothing about what the reader does.
- **L-M (mechanistic/interventional, C2).** The role is the equivalence class
  of the token's slot-ablation signature on khora's record. It is falsified by
  intervention: ablate the token, rebuild, read the typed slot deltas, then
  ask whether the induced types align with independent gold, whether they are
  a **sufficient statistic of the matched company window** for role (the real
  content of C2, see the next paragraph), and whether slot-based impact
  predicts role better than the span-based rival (T10). L-M is a claim about a
  computed object, so it can only be tested against a named instrument
  (khora's shipped readers, prior-free); a failure of the instrument to hear a
  role is a failure of L-M-as-instantiated, and the document says so
  separately from a failure of L-M in principle (T5).
- **L-B (scope/bound, C3).** Both laws are confined to a horizon measured by
  `dmdWindow`. Falsified by transfer of a gold-free horizon to the gold
  plateau, by the data-limitation sweep, and by interventional scrambling
  beyond the horizon (T6).
- **L-I (identity, C4).** Falsified on coreference gold by T11: the fold
  criterion must link name -> pronoun -> descriptor mentions of one being and
  separate two beings that share a string or a company, and it must do so
  better than the string and company rivals.
- **L-U (universality, U).** Falsified by any rung of section 1.6.

**What C2 can and cannot mean (data-processing).** The impact signature of a
token is a deterministic function of the text of the window the reader saw.
By the data-processing inequality it therefore cannot carry information about
role that the same window, as company, does not. With an ideal learner,
S(IMPACT given COMP-W) = 0 exactly (COMP-W is the company of the same window,
2.3). So "impact carries information that company does not" is not a possible
finding about the law, and a positive S(IMPACT given COMP-W) can only be a
sample-efficiency (compression) effect, which T5 tests as such. The
falsifiable content of C2 is **sufficiency**: role depends on the window only
through the impact type, i.e. S(COMP-W given IMPACT) <= SESOI. The window may
carry role information that the impact signature discards (then impact is a
lossy summary and C2 as phrased is false), or it may not. T5 pre-registers
that statistic and its four cases.

### 1.3 Analytic content versus synthetic content (where tautology hides)

- "Bounded by differences that make a difference" is partly analytic: a window
  defined as the shallowest depth at which dropping older material changes no
  conclusion has, by construction, no later effect on **the conclusion used to
  measure it**. The falsifiable content is **transfer**: the horizon measured
  on a conclusion that does not use gold (the unsupervised class-transition
  conclusion; the reader's own impact horizon in the same unit) must also
  bound conclusion B (the plateau of accuracy against gold). The horizon
  measured on the gold-trained models' own agreement is **analytic** and is
  used only as the operating horizon, never as the transfer test (T6). The
  interventional insensitivity of the whole-sentence model to scrambling
  beyond the horizon is the other non-analytic content (T6c); scrambling
  beyond the horizon for the model that was truncated at the horizon is
  trivially invariant and is excluded from the pass statistic.
- "Known by its company" is partly analytic if "company" includes the token's
  own aggregated type (identity is a lossless pointer to its accumulated
  company). Revision 1 let that pointer into the company arm; revision 2 does
  not. **COMP-OCC** (the occurrence window, centre masked, no type vector, no
  own descriptor, no sentinel) is the only arm that may carry the clause "not
  by form, not by position". **COMP-TYPE** is the lexicon-as-cache arm and is
  labelled COMP+FORM-LEX-equivalent everywhere. T2 tests screening-off of form
  by company as a function of exposure by an **intervention** (nested
  subsampling of the exposure), not by stratifying tokens by frequency (which
  groups tokens by word class), so that a lexicon acting as a cache of
  company is not mistaken for form acting as an independent determinant, and
  so that the cache reading (A3) has a falsifier.
- "Determined by" is far stronger than "predicted by". T1b tests the strong
  reading directly with collision counterexamples at the measured bound.
- Impact is a function of the window text (1.2): sufficiency, not
  independence, is the testable content (T5).

### 1.4 Lineage, steelmanned, and what each predicts

Cited for steelmanning, not relied on for authority.

| source | strongest form | what it predicts here |
|---|---|---|
| Firth 1957 | a word is known by the company it keeps | T1: occurrence company beats position and frequency on held-out text; T4: for a single mention |
| Harris, distributional structure | distribution carries the structure up to the grain of the distribution | T1, T3: classes induced from company align with role |
| Wittgenstein, meaning as use | use is the unit, not a private referent | T8: homographs separated by use |
| Bateson | a difference that makes a difference | T6: horizon measured by the cut transfers; T11: the fold is truncated where widening stops making a difference |
| `THE-HOLOGRAPH.md` | the record is the object; a consumer gets a pattern computed from it | T5, T10: impact on the record's slots is a coordinate of role |
| `THE-WHEEL.md` | void / beings / fold; a being is the difference against the ground, the fold is the difference it made; identity is the fold at a point | T4, T7: being born at first admission; T11: identity by fold-survival |
| `THE-CORE-MECHANISM.md` | perturbation null is the one act | T5, T9: ablation and shuffle nulls |
| `kernel/activation.js::dmdWindow` | shallowest depth at which dropping older material no longer changes the conclusion (depth may be a radius in a graph via `restrict`) | T6; T11 horizon w as slot-graph radius |
| `kernel/perspective.js`, `kernel/holder-scope.js`, `the-fold/relative.js` | a claim is held from a standpoint; a reference resolves inside the holder's accessible scope; addresses are relative to the cue | 2.5.7: the perspective p of the fold; T11b |
| `LEVELS.md` heard rule | the system must work as if it only heard the text | punctuation and case are not company (S1), the stream is the word stream (S2) |
| `organs/company-index.js`, `kind-standing.js` | company = the token before and the token after, counted; kinds named by their own signature | COMP-NATIVE arm is exactly this at horizon 1, as a TYPE arm |
| the user, R1 | "look at the slot not the spans" | T10: slot-based impact predicts role better than span-based impact, or the premise fails |
| the user, R2 | spans that survive the fold are the same referent | T11: fold criterion beats string and company identity on coreference gold |

### 1.5 The single-mention rule (standing, user)

A name can appear once and be a name. A being is born at first admission and is
known by its effect on the holograph, not by recurrence or capitalisation.
Therefore: (a) no primary analysis drops, down-weights or special-cases tokens
by recurrence; every evaluable token in the gold has a role regardless of how
often its type occurs; (b) hapax (single-mention) tokens are a named stratum
with their own test (T4) and their own power check; (c) the existence criterion
for a being is never "occurs twice"; the fold of a single mention exists at its
single point (T11c tests that a fold-based existence criterion recovers
singleton mentions where recurrence cannot). The shipped reader floors
(`minMentions` 2, `ARRIVALS_FLOOR`) are the reader's, and what they cannot see
is reported as a typed gap about the reader (T4, T5), not used to define the
law.

### 1.6 What "fundamental" means here: five rungs

A fundamental law must survive every rung. A rung that fails shrinks the claim
to the rungs that pass, and the report states the largest passing rung as the
law's measured scope. "Survive in every unit" is read with the pre-registered
per-unit tolerance of 2.10 (a bounded number of units may fail by instrument
noise, never a replicated failure), derived from the instrument's own measured
power, so that a true law can pass.

| rung | claim | protocol |
|---|---|---|
| U0 | holds within every language (existence) | W, every language, held-out test split |
| U1 | holds across language families (the same function transfers) | X, leave one family out |
| U2 | holds at more than one grain: token role (UPOS), being versus non-being, kind (name versus common), clause role (DEPREL) | T7 |
| U3 | holds in non-natural systems with gold: code token classes and declared names; notations where gold exists | T7 (code), notation adapter |
| U4 | is not an artifact of the instrument: two learner families, causal and non-causal variants, three readers, two capacities, three ablation modes agree | all tests |

### 1.7 Verdict vocabulary

Every claim receives exactly one of (each claim-level verdict is a function of
unit-level outcomes PASS, FAIL, INCONCLUSIVE, UNDERPOWERED(n) and GAP, defined
in 2.10, and the function maps every possible outcome vector to exactly one
verdict; this is asserted by a property test, section 7):

- **HOLDS**: the pass rule is met in all evaluable units except at most k_N
  (the derived tolerance, 2.10), no family with two or more members has two
  failing members, and the gate passed. When units are excepted they are
  listed and the verdict is written **HOLDS(exceptions: ...)**.
- **AMENDED(A#)**: the literal pass rule fails (FALSIFIED or UNRESOLVED) but one
  named amendment from the registry (section 6.2), stated in advance, passes
  on the same data. By section 6.3 this means the sentence as phrased is
  falsified, and the amended law is a new hypothesis that has survived its
  first test only. (Revision 1 called this HOLDS-WITH-AMENDMENT.)
- **FALSIFIED(scope)**: the pre-registered falsifier fired in more than k_N
  evaluable units, or in two members of one family, with the scope (families,
  grains, systems) in which it fired.
- **UNRESOLVED(counts)**: neither HOLDS nor FALSIFIED: more than k_N units
  inconclusive. Never support.
- **UNDERPOWERED(cells)**: the gate failed (the instrument cannot see planted
  structure of the claimed form to the pre-registered fraction of its oracle,
  cannot reject planted structure of the rival form, or the stratum is below
  n_min), or more than 20 percent of the units are gaps. Never reported as
  "not falsified".
- **UNTESTED(gap)**: no gold or no data at run time. Typed, with denominators.
  Never read as support.

### 1.8 The ladder of readings (the report names the strongest survivor)

The sentence admits several readings of increasing strength. Reporting one OR
over ten claims makes the headline "falsified" a foregone conclusion (the
strongest reading is predicted to fail by this document itself), so the object
reported is the **strongest reading that survives**, with the pre-registered
risky prediction of each reading, the result that kills it, and a declared
prior plausibility (scored for calibration after the run). Every claim is
CORE (it enters the ladder; its failure lowers the rung), R5-only (it enters
only the literal reading), or AUXILIARY (reported with its own verdict; its
failure is a scope note and never lowers a rung): the table of 1.9.

| reading | what it says | claims it requires | risky prediction (recorded) | what kills it | prior plausibility |
|---|---|---|---|---|---|
| **R0** company is informative | the occurrence company of a token (centre masked, boundary-blind) carries information about its role beyond position and frequency, within every language | T1(i) in W | S(COMP-OCC given FREQ+POS) > SESOI in every language but at most k_N(41) | S(COMP-OCC given FREQ+POS) <= SESOI (equivalence, n >= n_min) in more than k_N languages, or in two languages of one family; or G0 cannot detect planted CO | 0.95 |
| **R1** a being can appear once | R0 holds on first-sight and hapax tokens, and name-ness of a hapax is recoverable from its one company | T4 | COMP-OCC beats POS and FREQ at H1 in at least 9 of 10 families; name-ness AUROC above 0.5 + SESOI | G(COMP-OCC given FREQ+POS; H1) <= SESOI in more than k_N units (one mention is not enough company) | 0.80 |
| **R2** the function transfers | R0 and R1 hold when a whole language family is held out, and at the grains being-versus-non-being and kind | T1(X), T7 text grains G2, G3 | COMP-OCC-X beats FREQ+POS in at least 8 of 10 held-out families | X fails in more than k_N(10) folds (company descriptors do not transfer: A5), or a grain with D1 <= SESOI replicated | 0.50 |
| **R3** company, not form, once aggregated, within a bound | company is at least as informative as form where form has no entry (first-sight and hapax), form is screened off by *aggregated* company at an exposure no larger than where the lexicon itself saturates, and the bound transfers and survives scrambling | T1(ii) on H0 and H1, T2 (convergence with falsifier), T6a, T6c | G(COMP-OCC) >= G(FORM) - SESOI on H0 and H1 but **not** on seen tokens; S(FORM given COMP-TYPE-D) reaches <= SESOI at f_conv <= f_sat(FORM-LEX) in analytic languages | S(FORM given COMP-TYPE-D) stays > SESOI at saturation in at least 50 percent of families (form independently informative); G rises by more than SESOI per doubling beyond h*; beyond-scramble changes M_whole predictions by more than u_l; G(COMP-OCC) < G(FORM) - SESOI on H0 or H1 in more than k_N languages | 0.35 |
| **R4** role is the type of impact | the slot-ablation impact type is a sufficient statistic of the matched company window for role, and slot-based impact predicts role at least as well as span-based impact | T5, T10 | closed classes are deaf (A6); open classes sufficient: S(COMP-W given IMPACT-SLOT) <= SESOI for NOUN, PROPN, VERB only | S(COMP-W given IMPACT-SLOT) > SESOI in more than k_N units for the open classes (impact is lossy); or span-based impact beats slot-based impact (the premise of R1 fails on this instrument) | 0.10 |
| **R5** the sentence as phrased, as a fundamental law | R0 to R4 hold, plus: role is determined (collisions at the bound are rare), occurrence company screens form off without the cache, the horizons agree in one unit, the law holds in code, and identity is the fold | R0 to R4, T1b, T2 literal screening (S(FORM given COMP-OCC) <= SESOI at f = 1), T6b, T6d, T7 code, T11a, T11c, U4 agreement | predicted to fail: collisions in the same two-token frame with different roles are certain (D(h*) between 0.3 and 0.8); the lexicon is a stored company so S(FORM given COMP-OCC) > SESOI on seen tokens | any of those claims not HOLDS | 0.02 |

The reading R_k **survives** iff every claim it requires is HOLDS or
HOLDS(exceptions). It is **survives-as-amended(A#)** if the only claims not
HOLDS are AMENDED. The headline is: the highest k such that R0 to R_k all
survive (nested), the lowest reading that failed with the claim and unit scope
that killed it, any non-nested reading that survives (for instance R4 surviving
while R3 does not), and the sentence **as phrased** (R5), reported
**falsified as a fundamental law** iff a claim R5 requires is FALSIFIED or
AMENDED (an amendment means the literal phrasing failed, 6.3); if no required
claim is FALSIFIED or AMENDED but one is UNRESOLVED, UNDERPOWERED or UNTESTED, R5
carries that status and is never reported as "not falsified". UNDERPOWERED and
UNTESTED claims make their reading UNDERPOWERED or UNTESTED, never survives. The priors above
are written before any run; a reading that survives despite a prior below 0.1
(R4, R5) is the informative outcome, and a failure of R0 would falsify the
sentence at its weakest reading, which no amendment can rescue.

### 1.9 Claims: core, R5-only, auxiliary

| class | claims | effect of failure |
|---|---|---|
| CORE | T1 (both parts), T2 (the A3 convergence and the within-class strata), T4, T5 (T5a, T5b, T5c), T6a, T6c, T10 | lowers the highest surviving rung |
| R5-ONLY | T1b, T2 literal screening, T6b, T6d, T7 code (G5, G6), T11 | blocks R5 only |
| AUXILIARY | T3, T8, T9, T6e, T7 clause-role grain G4 and notation, T11b (perspective) | reported with its own verdict; names a scope limit; never lowers a rung |

T7 text grains G2 and G3 are CORE for R2. Whether a claim is core is fixed here,
before any run.

### 1.10 The two user refinements, binding

R1 (ablation at the slot) and R2 (identity as fold) replace any span-based
operationalisation of impact or identity in the design. A span- or string-based
operationalisation exists only as a **rival** (IMPACT-SPAN in T10; STRING and
COMP-SIM identity in T11). Byte offsets are a nuisance coordinate: when a token
is deleted offsets move, so no comparison in this document uses an offset or a
character span as its unit; slots are compared by position in the slot
structure and by the referent or role they hold (2.5.2), and a control built to
fail shows that span offsets change where slot comparison does not (2.5.5).

---

## 2. Definitions

### 2.1 Corpus, units, stream

- Data: CoNLL-U treebanks. Dev and test at
  `/private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu`; train at
  `/private/tmp/claude-501/tb/<stem>/train.conllu` (Korean train:
  `/private/tmp/claude-501/tb/kor-gsd/train.conllu`).
- A **syntactic word** is a row whose ID is a plain integer (multiword-token
  ranges `1-2` and empty nodes `1.1` are skipped; the parts are the words).
- The **stream** of a sentence is its sequence of syntactic words with rows
  whose UPOS is PUNCT removed (heard rule, S2: punctuation is script, S1).
  Sentence boundaries are the treebank's own; they enter company only as the
  repo's own sentinels `^` and `$` (organs/company-index.js) in the arm
  COMP-SENT, and nowhere in COMP-OCC (2.3: boundary-blind padding).
- **Identity** of a unit: `form.normalize("NFC").toLowerCase()`. Spelling
  (case, characters) is kept for FORM arms only. Company sees identities only.
  A sensitivity variant "READ" (S1) adds neighbours' case and the punctuation
  as they stood; it is reported labelled and never replaces the primary.
- **Evaluation set E**: stream units whose UPOS is in UPOS14 =
  {ADJ, ADP, ADV, AUX, CCONJ, DET, INTJ, NOUN, NUM, PART, PRON, PROPN, SCONJ,
  VERB}. PUNCT is excluded because it is script (and trivially form-determined
  by character class); SYM and X are excluded from evaluation but stay in the
  stream as context. Exclusion is declared here, before any run.
- **Gold lives in a parallel array** `GOLD[sentence][i] = {upos, deprel,
  head, feats}`. Feature code receives only the stream. The gold may never be
  a feature (rule 6); `gates.mjs` G3 enforces it dynamically.
- **Given segmentation, disclosed.** The UD word boundaries are human gold
  segmentation. For unspaced scripts (cmn-hans, jpn) this supplies boundary
  information a heard-only system would have to earn. The primary run uses the
  gold unit; the character-grain arm in T3 removes the leak (unit = character,
  label = UPOS of the containing word). The prior-driven segmenter
  (`script-segment.js makeSegmenter`) is NOT used: its prior is built from UD
  train labels (section 2.7, contamination).

### 2.2 Role gold and its grains

| grain | label | source | classes |
|---|---|---|---|
| G1 token role | UPOS | `UPOS` column | UPOS14 |
| G2 being versus non-being | is-nominal | UPOS in {NOUN, PROPN} versus the other twelve | 2 |
| G3 kind | name versus common | UPOS PROPN versus NOUN, among nominal tokens | 2 |
| G4 clause role | DEPREL | `DEPREL` with subtype stripped (`nsubj:pass` -> `nsubj`), restricted to the universal labels with at least 0.5 percent of pooled train tokens | derived from the pooled train counts |
| G5 code token class | tree-sitter class | `eval/coding-competence/gold.mjs` tokens | keyword, identifier, type, literal (primary); operator, punctuation, comment, string (reported separately, lexically delimited) |
| G6 code being | declared-name | gold `defs` with core kinds (`CORE_DEF_KINDS`) versus other identifiers | 2 |
| G7 referent identity | mention -> chain (same referent or not), mention type (name, pronoun, descriptor) for stratification only | CorefUD / GUM chains under `/private/tmp/claude-501/physics/coref/` (owned by the sibling workflow `beings-physics`; this workflow does not fetch it); `UNTESTED(no coref gold yet)` if the chain files are absent at run time (3.5) | pair-level same/different |

UPOS versus DEPREL ambiguity is a risk (section 9): UPOS is partly defined by
lexical class, which favours FORM; DEPREL is relational to a head, which
favours COMPANY. A verdict that depends on choosing one is not a verdict: the
law's token-level claim requires both grains (T7).

### 2.3 Company: five arms with five different visibilities

Let a sentence stream be u_1..u_n and the evaluated token be at index i.

**The centre token is never in its own company.** No company arm below
contains the centre's identity, its spelling, or any feature that is a function
of the centre's identity (its type descriptor, its exposure count, its
type-aggregated neighbour counts, its sentence-boundary indicators), **except**
the arms labelled TYPE, which are lexicon arms, are labelled
COMP+FORM-LEX-equivalent wherever they appear, and may never carry the clause
"not by form". (Revision 1 put the centre's type vector and own descriptor
into COMP; aggregated over a train split that is a lossless pointer to
identity, so COMP was COMP+FORM-LEX on seen types and nested FREQ and boundary
position. Revision 2 separates the arms.)

| arm | visibility | role in the design |
|---|---|---|
| **COMP-OCC** | the identities of the tokens at offsets within h of the centre (causal: left, offsets -1..-h; non-causal: both sides), centre masked. **Boundary-blind padding**: where the window extends beyond the sentence the missing slots are filled by identities drawn i.i.d. from the exposure's unigram distribution (seeded by sha256 of `khora-law-v2`, stem, split, sentence index, offset), not by a sentinel and not by a missing flag, so the feature vector carries no information on the distance to the boundary except what the words themselves carry. No type vector, no own descriptor, no exposure count, no `^` or `$`. **The only arm that may carry the clause "not by form, not by position".** | primary company arm (T1, T2, T4, T9, T3) |
| **COMP-SENT** | COMP-OCC with the repo's own sentinels `^` and `$` in place of padding (`organs/company-index.js`): boundary-aware. Carries boundary position by construction. | repo-native reading; S(COMP-SENT given COMP-OCC) is the boundary contribution (amendment A8) |
| **COMP-TYPE** | the type company of the centre's identity at exposure Q: W: sparse vector T_h(w;Q) of counts of keyed neighbour features `o-k=<identity>` (k = 1..h left, `o+k=` right) aggregated over all earlier occurrences of w, **a lossless pointer to identity once aggregated, labelled COMP+FORM-LEX-equivalent**; X and the A3 test: **COMP-TYPE-D**, the aggregated normalised distribution of neighbour **classes** by offset (dimension 2 h* K*, no log n, no s_init or s_final, no identity), a lossy summary of accumulated company. COMP-NATIVE is COMP-TYPE sparse at h = 1: byte-equal to `createCompanyIndex().vectors` (`before=`, `after=`), asserted by test. | the lexicon-as-cache arm; T2 convergence curve (COMP-TYPE-D); conformance |
| **COMP-W** | the **matched-visibility window comparator for impact**: the identities in the frames [s - M*, s + F*] of the token's sentence s (M* and F* from 2.6b), centre masked, encoded in W as an order-preserving bag (feature key = (frame offset, side of the centre for the self frame, identity); no within-frame order beyond side), in X as per-frame-offset class-descriptor mean and entropy plus same-frame left and right summaries. **COMP-W-C** is the frame-causal variant: frames [s - M*, s] (self frame included, no later frame). | comparator in every T5 and T10 statistic; the impact arm and its comparator see the same text |
| **BAG** | multiset of identities in the sentence other than the centre, order discarded (X: mean and entropy of class descriptors of the others) | order-free company (A2, T9) |

**Centre-swap invariance (a testable property of the definitions).** For
COMP-OCC, COMP-SENT and COMP-W the feature vector of the token at i is
invariant when the centre's identity is replaced by any other identity (window,
exposure and position fixed). It fails, by design, for FORM, FREQ, LEXD and
COMP-TYPE. `tests/law-company.test.js` asserts invariance for the first three
and **failure** for the last four, so the test is built to fail on a leak
(section 7).

- **Exposure Q** (regime E1, "listener's lifetime"): the unlabelled forms of the
  language's own train split (labels never read), followed by the evaluation
  stream read in order, updated after each sentence. The causal arms use Q as
  it stands at the start of the token's sentence plus the earlier tokens of that
  sentence; the **non-causal** arms use Q plus the whole evaluation stream and
  both-sided windows (a lookahead bound, `THE-HOLOGRAPH.md` section 7, labelled
  non-causal in every table). Primary verdicts use the causal arms (rule 5).
  COMP-W is non-causal at frame grain by definition when F* > 0; the
  **frame-causal** variant (F* = 0) is the only impact-side arm that may enter a
  claim about reading (T5), and it is compared only with COMP-W-C.
- **The horizon h** is never typed. The reported operating horizon of a language
  is h*_l (analytic, 2.6a) measured on that language's DEV split before the TEST
  split is touched; offsets beyond h* are masked (X: missing-indicator in the
  dense feature vectors, applied equally to every arm; W: the sparse features
  use offsets up to h*). The ladder of candidates is declared (section 2.6), the
  choice from it is measured.

### 2.4 Unsupervised induction (protocol X, and the X side of every arm)

No labels, no priors, only the language's own unlabelled exposure Q_0 (train
forms).

- Vocabulary V_ind = identities with at least `ARRIVALS_FLOOR` = 2 occurrences
  in Q_0 (the structural minimum recurrence, `adapters/text/listening-cast.js`,
  S16; not a dial).
- Embedding: positive PMI of each v in V_ind against context identities at
  offsets {-2,-1,+1,+2}, reduced by randomised SVD to d dimensions, rows
  L2-normalised.
- Classes: spherical k-means (k-means++ seeding) with K classes. **K and d are
  derived**, not typed: K* is the largest K in the ladder {2,4,8,16,32,64,128}
  whose split-half stability (adjusted Rand index between the clusterings of two
  disjoint random halves of Q_0, on the identities present in both) exceeds the
  95th percentile of the same statistic computed on 20 pairs of
  within-sentence-shuffled halves (the repo's own perturbation null: adjacency
  destroyed, marginals kept). d = K*. If no K clears the null, K* = 1 and the
  language is a typed gap for X company arms (counted in the denominator).
- Identities outside V_ind, and identities unseen in Q_0, get an occurrence-level
  class by nearest centroid on the occurrence's own left context vector (causal)
  or both sides (non-causal). A token with neither neighbour in V_ind carries a
  missing-class flag. The **occurrence-level class of the centre** is computed
  this way for **every** token (a function of the window only, never of the
  centre's identity), and is the only class of the centre that any company arm
  may use.
- **Type descriptor** delta(w; Q) = [log(1+n_w), D_L(w), D_R(w), H_L(w), H_R(w),
  s_init(w), s_final(w)] where n_w is the exposure count, D_L the number of
  distinct left neighbours divided by n_w, H_L the entropy of the left
  neighbour **class** distribution divided by log K*, s_init the share of
  occurrences opening a sentence, and the right-hand quantities likewise
  (computed from earlier occurrences only; causal). **delta of the centre is not
  a company feature.** Its first component is the FREQ arm; all seven form the
  **LEXD** arm (the centre's own descriptor, lexicon-equivalent, reported only
  as a nesting diagnostic). delta of the **neighbours** enters COMP-OCC-X (a
  neighbour's descriptor is a property of a different token).
- **Class descriptor** delta_bar(c) = mass-weighted mean of delta over the types
  in class c, plus log of the class's token share and log of its type count.
- All descriptors are scalars. Per-language z-scoring uses the language's own
  Q_0 statistics (unsupervised). No class identifier, no identity and no label
  ever crosses a language boundary.
- **Form classes (FORM-IND, equal footing for FORM in protocol X).** Revision 1
  gave company a learned distributional summary (induced classes and their
  descriptors) and gave form a hand-made shape vector, which handicaps form
  relative to company. The X form arm therefore receives an induction of the
  same kind: the embedding of each identity in V_ind by positive PMI against
  its own character 1-, 2- and 3-grams (no neighbour information), reduced by
  randomised SVD to d = K*, spherical k-means with the **same K*** and the same
  stability rule (against a null that shuffles characters within strings), and
  the class descriptor of the form class of the centre (log token share, log
  type count, mean log length, mean affix productivity). Identities outside the
  vocabulary get the form class of the nearest centroid on their own character
  n-gram vector. FORM-IND contains nothing that is a function of the centre's
  neighbours.

### 2.5 IMPACT on the holograph: ablation at the slot (R1), and the fold (R2)

#### 2.5.1 The record, the readers and the slot structure

The record is khora's own reading. Three real readers are used, **prior-free**
(`posPrior = null`, `framePrior = null`, `functionWords = null`, no ear):
`classAt`, `heardNominals`, `makeEar`, `language-grammar` priors, `makeGrainTyper`
and `script-segment` segmenters are **forbidden** in every primary arm because
`priors/pos-*.json`, `priors/frame-*.json` and `priors/role-config-*.json` are
built from the UD TRAIN labels (their provenance blocks say so); using them
would feed UPOS to the reader (rule 6). A prior-loaded variant exists only as a
labelled "contaminated" arm and can never carry a verdict. The inputs are the
unit stream joined by single spaces, so no ear is needed.

- **R-A (activation).** `memory/activation.js::readForward(frames)`, one frame
  per sentence. Observables per frame: `codeSize`, `traceSize`, `activation`,
  `recalled`, `novelty`, `reach` (null is a gap, not a zero). This is the
  **atmosphere** block (ATM) of the record; it is reported apart from slots.
- **R-B (beings and kinds).** `organs/heard-surfaces.js::heardSurfaces` over the
  window sentences with `posPrior = null`, floors `minMentions = 2`
  (`ARRIVALS_FLOOR`), `minShare = 0.5` (`GRAMMAR_MIN_SHARE`), `minMembers = 2`
  (structural: a kind has a second member), the company index
  (`createCompanyIndex`), and the shipped `nullArm` spent **once per window
  snapshot** and held fixed across the present and ablated readings so the
  deltas are not an artifact of a re-drawn null. A variant **R-B1** sets
  `minMentions = 1` and is labelled a floor-1 counterfactual for the
  single-mention rule (1.5).
- **R-C (relations).** `adapters/text/relations-gfp.js::extractGfpRelations(text,
  {posPrior: null, functionWords: null, clauseAware: true})`. Edges are
  `{end1, label, end2, cell, grain, polarity, offset}`. `cell`, `grain` and
  `offset` are **dropped** before any comparison (EO structures are never
  inputs, rule 6; offsets are the nuisance coordinate, R1).

**The slot structure SL(x) of a reading of a text x** (a window of consecutive
sentences, each addressed by its sentence offset e relative to the evaluated
sentence s; sentence indices are stable under ablation: a sentence that
becomes empty stays as an empty frame). A **slot** is a structural position a
token fills in the record:

| slot family | coordinate (never a byte offset) | filler | source |
|---|---|---|---|
| rel-end1 (the first end of an arrangement; this is the **subject slot** in the prior-free reading, because the repo never writes subject or object onto a record, P72/P76) | (e, j, end1) with j the ordinal of the edge among the edges of sentence e in reading order | the figure string and the referent entry it resolves to | R-C, R-B |
| rel-label | (e, j, label) | the connector string | R-C |
| rel-end2 | (e, j, end2) | the figure string and its referent entry | R-C, R-B |
| ref-entry (the referent-index entry a surface occupies) | (k) with k the ordinal of the entry by first admission in reading order | the entry's surface set and mention count | R-B |

A token fills a slot if it is (part of) a figure string at an end, or (part of)
a connector string, or (part of) a surface of an admitted entry. A token that
fills no slot has the flag `no-slot` (a token the reader does not hear into any
relation or being). The **role slots** of `adapters/text/relations-positional.js`
(`makePositionalSlots`, `extractPositionalRelation` with a `RoleConfig@1`) and
the subject slot of READING-SPEC proper need a RoleConfig built from UD train
labels: they form the contaminated variant **SLOT-ROLE**, labelled, reported
beside the primary as a diagnostic of how well a grammar-informed slot organ
hears, never carrying a verdict.

#### 2.5.2 Ablation and the slot comparison (R1)

For an evaluated token occurrence t in sentence s of a stream, form two texts
over the window of sentences [s - M*, s + F*] (M* and F* are derived in 2.6b):

- X0: the window as is.
- **A-DEL** (primary): X1 is the window with the occurrence of t **deleted**
  (adjacency repaired, which is the repo's perturbation family: one relation
  destroyed).
- **A-MASK** (secondary): X1 is the window with t replaced by a fixed
  placeholder identity not in the language (the slot stays occupied, the
  identity is removed). Separates "its presence" from "its identity".
- **A-FILL** (secondary): X1 is the window with t replaced by the **neutral
  filler of its slot class**: the most frequent identity in the exposure
  belonging to t's occurrence-level induced class (2.4); the same slot class,
  no identity-specific content.

**Slot alignment between SL(X0) and SL(X1)** is by structure, not by offset:
per sentence offset e, the edges of X0 and X1 are aligned by a deterministic
order-preserving alignment (longest common subsequence over edges, where two
edges match if they share at least one equal field among {end1, label, end2},
ties broken by the earlier ordinal); ref-entries are aligned by shared surface.
An edge of X0 with no match is **emptied**; an edge of X1 with no match is
**born**. For each matched pair, each of the three fields gets a typed delta.

The **typed slot deltas** form a closed vocabulary of seven, assigned to every
slot with the precedence emptied > retyped > rebound > refilled > shifted >
unchanged (each slot receives exactly one type):

| type | meaning |
|---|---|
| emptied | the slot filled in X0 has no filler in X1 (its edge was lost, or its filler vanished) |
| retyped | a label slot whose filler changed while both ends are unchanged (the connector re-typed) |
| rebound | an end filler now sits in the other end (end1 and end2 swapped) or in another edge of the same sentence |
| refilled | filled in both, by a different filler (a different referent entry at an end) |
| shifted | the same filler, but its ordinal j (or its sentence offset e) changed: the slot moved within the slot structure |
| born | a slot present in X1 and not in X0 |
| unchanged | none of the above |

Deltas are recorded for (i) the slot(s) t filled in X0, (ii) the other slots of
the same edge or entry, (iii) all slots at slot-graph radius 2..w from the slot
of t. The **slot graph** has an edge between two slots when they are fields of
one relation, when they hold ordinals j, j+1 of one sentence, or when their
fillers resolve to the same referent entry across sentences; the **slot
horizon** w is measured by `dmdWindow` with `restrict` = slots within graph
radius depth (2.6c). Spans and byte offsets never enter this comparison: a
token deleted in sentence s leaves the slots of every other sentence at the
same coordinates, and a test asserts that (2.5.5).

#### 2.5.3 The impact signature and impact types

**IMPACT-SLOT signature** s(t): for slot families F = {rel-end1, rel-label,
rel-end2, ref-entry}, radius bands B = {0: the slot of t, 1: the same edge or
entry, 2: radius 2..w}, and the six non-trivial delta types, the count of slots
of each type (4 x 3 x 6 = 72 components), the number of slots considered in
each family-band cell (12 components), and the `no-slot` flag: **m_slot = 85**.
Every integer component is transformed s(x) = sign(x) * log2(1 + |x|). The
**distribution of typed slot deltas** is the signature. A difference below 1e-9
in any real component is zero (the readers are deterministic, so any larger
difference is real; whether it **makes a difference** is decided by the types
and the bound, not by a tolerance). **IMPACT-SLOT+ATM** appends the 19
atmosphere components (R-A self-frame difference, spread, extent per
observable, plus the reach-null flag): 104.

**Capacity equality for impact arms.** Every dense impact arm (IMPACT-SLOT,
IMPACT-SLOT+ATM, IMPACT-SPAN) is reduced by unsupervised PCA, fitted on the
train sample, to d_imp = min(24, rank) components, so that an arm with more raw
components is not advantaged by dimension. The planted impact generators are
built so that the determining structure lives in more than one component.

**Impact types (derived, not declared).** Pool the signatures; the **null type**
is the exact-zero signature in every component (the token made no difference:
every slot within w unchanged and no `no-slot` flag, or `no-slot` with all
unchanged). Among the rest, cluster by spherical k-means with K chosen by the
same split-half-versus-shuffle-null stability rule as 2.4 (ladder {2,...,32});
each type is **named by its signature** (its two largest mean components), as
`discoverCompanyKinds` names kinds. Within language: language-specific types
(for ARI/NMI, T5a). Across families: types fitted on the training families and
assigned to a held-out language by nearest centroid (no labels), for protocol X.
Two impact arms: **IMPACT-SLOT-TYPE** (one-hot of the type; the law as
phrased) and **IMPACT-SLOT** (the dense PCA signature; an upper bound,
labelled).

#### 2.5.4 The rival operationalisation: span/string impact (IMPACT-SPAN)

The 31-component signature of revision 1, computed from the same ablations of
the same tokens: R-A as above (19); R-B births, losses, kind flips, mention
shift, `tIsBeing0` (5); R-C edges lost, born, with changed ends, with changed
label, and the number of lost edges in which t's identity stood as end1, label,
end2 (7), where **edges are compared by their string key (end1, label, end2)
and surfaces by string**. To make the rival the genuinely span-based one, one
component is added: the number of edges whose byte `offset` moved
(**offsets-moved**): 32 components. The offset component is included on
purpose, as the nuisance coordinate of R1, and the planted generators of T10
include a structure invisible to it. IMPACT-SPAN-TYPE is its derived one-hot,
by the same procedure as 2.5.3. A rival with the same learner, the same
tokens, the same d_imp (PCA) and the same tuning budget.

#### 2.5.5 Diagnostics and controls built to fail

- **IMPACT-C (company-structure impact, diagnostic).** Delete t from the
  company statistics themselves and read the change: the L2 change of the
  descriptors of the two neighbours, the change of t's own type descriptor,
  flags for whether either neighbour's induced class changes, and the change in
  class-bigram surprisal summed over the bigrams created and destroyed (8
  components). It is built to be reducible to company; its role is to tell
  instrument deafness (IMPACT-SLOT fails, IMPACT-C works) from conceptual
  failure (both fail).
- **Sham ablation (control built to fail).** Delete a position that is not a
  token (join two sentences' boundary markers without deleting a unit, or delete
  a character of whitespace in the joined text). The IMPACT-SLOT signature must
  be the null type in 100 percent of cases; otherwise the pipeline manufactures
  impact.
- **Offset-invariance control (built to fail for the span coordinate).**
  Ablating a token in sentence s must leave every typed slot delta at sentences
  outside slot-graph radius w of the slot of t at `unchanged`, while the
  IMPACT-SPAN component offsets-moved is non-zero for the edges after t. The
  control must show the first (slot comparison does not move) and the second
  (the span coordinate does); if both are zero the corpus has no later
  structure and the case is not scored.
- **Ablation-mode agreement.** The typed deltas under A-DEL, A-MASK and A-FILL
  agree on the null/non-null decision for at least 1 - u_imp of tokens (u_imp
  from 2.6b); disagreement is reported in U4, not hidden.

#### 2.5.6 Token sample

N_imp = 2,000 evaluated tokens per language per split (train and test), uniform
at random with seed derived from sha256 of (`khora-law-v2`, stem, split,
purpose), plus an oversample of the hapax stratum of the test split up to 500
tokens, with inverse-inclusion weights for pooled statistics. All T5 and T10
arms are trained on the same 2,000 train-split tokens per language, so arm
sample sizes are equal by construction.

#### 2.5.7 Identity as a fold (R2)

*"Identity is the universe folded at a point, from a perspective, bounded by
differences that make a difference. Spans that survive this are the same
referent."* Operationalisation (replaces string identity, surface similarity
and company similarity as the identity criterion; tested against them as rivals
in T11):

- **The point.** A span s (a mention; its boundaries are given by gold in T11,
  disclosed like the UD word boundaries) occupying the slot sigma_s of a slot
  structure SL(x). A mention that fills no slot has an empty fold: typed gap
  `no_slot` (counted in the denominator), never a verdict.
- **The perspective p.** A holder in the sense of `kernel/perspective.js` and
  `kernel/holder-scope.js`: p is a member of the caller-declared holder
  vocabulary, with the reserved baseline `READER`
  (`kernel/perspective.js::READER`). Every slot carries a **provenance holder**:
  the holder of the stretch (sentence or turn) in which its filler occurs.
  The fold from p sees exactly the slots whose provenance holder is in
  `accessibleHolders(p, accessibility)`, where `accessibility` is the
  caller-declared map holder -> reachable holders (`holder-scope.js`
  never infers it). In the primary (perspective-blind) analysis there is one
  holder, `READER`, and nothing is restricted. In T11b the holders are the
  speaker or narrator tags the corpus declares (a caller-declared annotation,
  the repo's own pattern: "a holder arrives as a caller-declared annotation");
  they are used only as provenance, never as input to the same/different
  decision other than through the visibility restriction, and the run is
  `UNTESTED(no holder gold)` for a corpus that declares none.
- **The horizon w.** The slot-graph radius at which widening stops making a
  difference: measured by `dmdWindow` on DEV pairs with `restrict(obs, depth)`
  = the typed deltas of the substitution (below) restricted to slot-graph
  radius <= depth, `derive` = the same/different decision vector over the DEV
  pairs, and `equal` = agreement of the decision vectors on at least 1 - u_pair
  of the pairs (u_pair measured, as u_l, by two seeded re-samplings of the
  pairs). Ladder {1, 2, 4, 8, whole window}. Never typed.
- **FOLD(s; p, w)** = the typed structure of SL(x) within slot-graph radius w of
  sigma_s that is visible from p: the multiset of (slot coordinate relative to
  sigma_s, slot family, filler as referent entry). It is used only through
  deltas.
- **Substitution.** For two mentions A and B, X_{A<-B} is the window with A's
  span replaced by B's span at sigma_A (A-DEL's machinery with an insertion at
  the same slot class); X_{B<-A} symmetrically. The **substitution deltas**
  are the typed slot deltas (2.5.2 vocabulary) between SL(X) and SL(X_{A<-B}),
  restricted to slots at slot-graph radius 1..w from sigma_A and visible from
  p; the slot sigma_A itself is excluded (its filler differs by construction).
  Delta(A, B; p, w) is the vector of the six non-trivial delta counts by slot
  family and radius band (6 x 4 x 2 = 48 components), averaged over the two
  directions.
- **Survival.** The spans A and B are the **same referent** from p within w iff
  Delta(A, B; p, w) is the null type (exactly zero: no difference that makes a
  difference within w from p). The threshold-free form is the mass
  M(A, B) = sum of log-transformed components, scored by AUROC and average
  precision. A control built to fail: self-substitution A<-A must give the null
  type in 100 percent of cases.
- **Perspective dependence** is part of the claim: the same two spans may be one
  referent from p and two from p'. T11b tests it where the corpus declares
  holders and is typed untested otherwise.
- **Identity is not recurrence.** The fold of a mention exists at its single
  point; a being mentioned once has a fold (T11c).
- **Rival identity criteria** (same pairs, same learner family, same tuning
  budget): STRING (identical NFC-lowercased string), COMP-SIM (cosine of the
  COMP-TYPE vectors of the heads, at h*), RECUR (both strings recur), their
  learned combination STRING+COMP-SIM, and FOLD+STRING.
- **Instrument limits stated in advance.** The prior-free reader indexes
  referents by string; a pronoun or a descriptor is not bound to its antecedent
  by the reader as shipped. FOLD through this reader can therefore be deaf to
  name -> pronoun and name -> descriptor links (amendment A10). This is an
  instrument finding, separated from the criterion by the planted FOLD-PLANT
  languages whose structure the reader can hear (T11, appendix A).

### 2.6 BOUND: what is measured and what must not change

Observation unit, ladder, conclusion, equality, transfer. Four horizons are
measured, in two units, and **the transfer test uses a horizon that did not
see the gold**.

**(a) The company horizon h* (within-sentence, tokens), in two versions.**
- Observation unit: the token occurrence's own context in tokens (offsets away
  from the centre).
- Candidate ladder (declared by the caller, as `dmdWindow` requires): H =
  {1, 2, 4, 8, 16} tokens each side (left side only for causal arms), with the
  whole sentence as the open end. The ladder is dyadic like
  `contextual-dmd.js::dyadicCandidates`; the repo's native company is rung 1.
- Models: one learner M_h per rung, trained on that language's capped train
  split with context truncated at h (all arms share the ladder).
- Call: `kernel/activation.js::dmdWindow(observations, derive, {candidates: H,
  restrict, equal})` with observations = the DEV tokens of the language (each
  carrying its full sentence context); `restrict(obs, depth)` returns the same
  tokens with context truncated to `depth`; `equal(a, b)` is true when the
  fraction of tokens whose argmax agrees is at least 1 - u_l.
- **h*_an (analytic).** `derive(x)` = the argmax predictions of the
  **gold-trained** M_depth (M_whole for the untruncated input). It measures the
  models' agreement with themselves. It is the **operating horizon** (the mask
  of 2.3) and is **never used as the transfer test**, because argmax agreement
  with the full model at depth h strongly implies an accuracy plateau at h for
  models trained on the same labels (the same measurement made twice).
- **h*_u (gold-free).** `derive(x)` = the argmax of the **unsupervised
  class-transition predictor** U_depth: a model trained, without any UD label,
  to predict the identity-level induced class (2.4) of the centre token from its
  masked window truncated at depth; M_whole analogously. h*_u is the horizon of
  a conclusion that does not use gold, and is the primary object of the
  transfer test (c).
- **u_l (noise floor, derived).** The instrument's own disagreement with itself:
  train two models at the same rung from two different seeded sentence
  resamples of the capped train split (bootstrap resample, sentences with
  replacement), and take u_l = the median over rungs of the disagreement rate of
  their argmax on dev. A window is "the shallowest depth at which dropping older
  material changes no conclusion **beyond what retraining already changes**".
  This is a declared departure from `contextualModes`' exact equality (whose
  conclusion is two integers); a population-grain conclusion needs a tolerance,
  and the tolerance is measured rather than typed.
- **Persistence (monotone) check.** `dmdWindow` returns the first agreeing
  depth, which could be chance agreement with a deeper disagreement. After the
  call every rung deeper than the returned window must also agree; if one does
  not, the typed gap is `non_monotone` (counted, and the language is
  UNDERPOWERED for T6a and T6b).
- **Data-limitation sweep.** The measurement is repeated with the exposure and
  training size N in {5k, 10k, 20k, 40k, full train} tokens (nested, seeded).
  Because accuracy can plateau early from sparsity (too few examples per hashed
  feature), not because role stops depending on distant context, the measured
  bound is biased small when data are scarce. Rule: h*_u(N_cap) must equal
  h*_u(2 N_cap) for languages with at least 40k train tokens; if h*_u rises
  with N the typed gap is `data_limited` (h* is then reported as a lower bound,
  and T6a and T6b are UNDERPOWERED(data) for that language); a language with
  fewer than 40k train tokens has the typed gap `no_sweep_headroom` and its
  T6 verdict is labelled `cap-limited`. Counted in the denominators.
- Output: h*_an and h*_u per language, or the typed gap `reach_exceeds_candidates`
  (counted, never replaced by the top rung silently; the top rung is then used
  and flagged).
- Secondary: the per-token window (`dmdWindow` with exact equality on the single
  token's argmax) for tokens with at least 8 tokens of left context; its
  distribution (median, 90th percentile) is reported beside h*_an.

**(b) The reader horizons M* and F* (frames), with rung 0.**
- Observation unit: the sentence (frame), as in `memory/activation.js` and
  `contextual-dmd.js`.
- M* (how much preceding reading the reader needs as state): candidates
  {0, 8, 16, 32, 64, 128, 256, 512} preceding sentences (capped by what the
  stream has; 0 = the self frame only). Conclusion: the discrete IMPACT-SLOT
  type (including null) of token t computed with the last `depth` preceding
  frames versus all preceding frames (capped at 512). `equal` = exact
  agreement on at least 1 - u_imp of the sampled tokens (u_imp from two seeded
  re-samplings of the sample, same rule as u_l).
- F* (how far forward the reader's change reaches): candidates {0, 1, 2, 4, 8,
  16, 32} following frames; **rung 0 means the self frame only**, which the
  revision-1 ladder (1..32) could not express. Conclusion: the discrete
  IMPACT-SLOT type computed with the first `depth` following frames versus 32.
- M*, F* are measured on a 200-token subsample of the DEV split per language
  and then fixed. F* = 0 defines the **frame-causal impact arm**, the only
  impact arm that may enter a claim about reading (rule 5): its signature
  uses the self frame and the preceding frames only, so replacing every
  sentence after s by arbitrary text leaves it hash-identical (a test, section
  7). Forward-looking impact (F* > 0) is **non-causal by definition** and is
  compared only with non-causal company (COMP-W).

**(c) The impact horizon in tokens (the same unit as h*) and the slot horizon.**
- **H_imp** (tokens within the frame). The impact extent of the ablation of t
  in tokens: the largest token distance, within the self frame and counting a
  frame boundary as the number of tokens it skips, from t to any slot whose
  typed delta is not `unchanged`. The impact horizon is measured by
  `dmdWindow` with the **same token ladder H as (a)**, `restrict(obs, depth)` =
  the typed deltas of slots within `depth` tokens of t, `derive` = the discrete
  IMPACT-SLOT type, `equal` = agreement on at least 1 - u_imp. It is in tokens,
  so it is compared with h* without converting sentences to tokens by a median
  length (revision 1's conversion put the smallest possible F* at 15 to 25
  tokens, at or above the top rung of h*, so the comparison could not hold for
  reasons unrelated to the law).
- **w** (the slot-graph radius of the fold, 2.5.7) and **w_imp** (the slot-graph
  radius at which the typed deltas of the ablation stop changing the impact
  type): both by `dmdWindow` with `restrict` = a radius, as the repo's own
  docstring for `restrict` allows ("depth becomes a radius").

**(d) Transfer (the synthetic content of the bound).**
- **T-a (gold plateau against the gold-free horizon).** The plateau locus h_p of
  gold accuracy G(h) against h (T6) falls within one ladder rung of **h*_u**.
- **T-b (one bound in one unit).** H_imp falls within one ladder rung of h*_u
  (both in tokens). The frame horizon F* is reported beside it, in frames.
- **T-c (interventional, on M_whole only).** For tokens with at least
  h*_u + k tokens beyond the near region (k = the distance to the next rung;
  tokens without that margin are excluded and counted), scramble every context
  unit **beyond** h*_u (shuffle within the beyond-region, near region intact):
  M_whole's predictions must not change beyond u_l; scramble **within** the
  h*_u region: they must change by more than u_l. The same scramble applied to
  M_{h*} (the model that was truncated at the horizon) is invariant **by
  construction** (its input beyond the horizon is masked) and is **excluded from
  the pass statistic** (a test asserts the invariance, which demonstrates why).

### 2.7 The rivals, with exact visibility

Every rival is an **arm**: a fixed feature function over the stream plus
exposure statistics, fed to the common learner (2.8). Equal treatment: the same
tokens, the same learner family and capacity, the same tuning budget, the same
splits and the same random seeds.

| arm | what is visible | protocol X features (language independent, dense) | protocol W features (sparse, hashed) |
|---|---|---|---|
| MAJ | nothing (training class prior) | none | none |
| POS | index and boundary distances, no content | i, log i, [i = 1]; non-causal adds n-i+1, i/n, n, [i = n] | the same, one-hot bucketed |
| FREQ | the type's exposure frequency only | log(1+n_w), frequency-rank percentile, [n_w = 0] | the same |
| FREQ+POS | the two position/frequency baselines together (the baseline context of T1 and T4) | concatenation | concatenation |
| FORM | the token's own spelling | **FORM-X**: length, log length, script one-hot (10 Unicode script classes), digit flags, capitalisation flags, internal hyphen/apostrophe, distinct-character ratio, productivity of its 1,2,3-char suffixes and 1,2-char prefixes; **plus FORM-IND** (2.4: the induced form class and its descriptor, the equal-footing counterpart of company's induced classes) | **FORM-LEX**: lowercased identity; **FORM-MORPH**: suffix 1..4 and prefix 1..3 identities, shape; FORM = both |
| LEXD | the centre's own type descriptor delta(w;Q) (lexicon-equivalent) | the 7 components of 2.4 | n/a (identity is already visible) |
| **COMP-OCC** | occurrence company, centre masked, **no type vector, no own descriptor, no sentinel, boundary-blind padding** (2.3) | class descriptors of the neighbours at offsets 1..h* (left only for causal), the occurrence-level class of the centre computed from its window, class-bigram surprisals among window neighbours (centre excluded); masked beyond h* with a missing flag (equal for every arm) | window identities at offsets <= h* (padding filler per 2.3) |
| COMP-SENT | COMP-OCC plus sentinels and boundary surprise | as COMP-OCC plus [i = 1], [i = n], boundary surprise | as COMP-OCC with `^`, `$` |
| COMP-TYPE | type company, **lexicon-equivalent** | **COMP-TYPE-D** (2.3) | T_h(w;Q) sparse; COMP-NATIVE at h = 1 |
| COMP-W, COMP-W-C | matched-visibility window for impact | 2.3 | 2.3 |
| COMP-OCC+FORM | both | concatenation | concatenation |
| COMP-TYPE+FORM | nesting diagnostic (redundant by construction) | concatenation | concatenation |
| BAG | order-free company | mean and entropy of the sentence's class descriptors excluding the centre | hashed set of other identities in the sentence |
| SUBWORD | affix company (no identity) | for the token's suffixes and prefixes, the pooled neighbour-class descriptor distribution of all exposure types sharing the affix, summarised by the descriptors of 2.4 | pooled neighbour identities of affix-sharing types (hashed) |
| IMPACT-SLOT-TYPE, IMPACT-SLOT, IMPACT-SLOT+ATM | slot-ablation impact (2.5.3) | one-hot / PCA-24 / PCA-24 | the same |
| IMPACT-SPAN-TYPE, IMPACT-SPAN | span/string impact, the rival (2.5.4) | one-hot / PCA-24 | the same |
| COMP-W+IMPACT-SLOT, COMP-OCC+IMPACT-SLOT | company and impact (T5c screening statistics) | concatenation | concatenation |

Capacity equality:
- X: all dense, 3 to about 100 dimensions per arm; the impact arms PCA-24.
- W: every hashed arm uses the same D = 2^16 buckets and the same per-block
  normalisation (each feature **group** is L2-normalised to unit norm per token,
  so an arm with more features is not advantaged by scale); the number of active
  features per arm is reported.
- A **capacity-matched robustness run** repeats W with D' = 2^10 (heavy collisions);
  rankings that flip under D' are reported as capacity-dependent.
- **Protocol X cannot decide the central contrast.** Identity cannot transfer
  across families, so FORM in X is a language-independent shape-plus-induced-
  class summary, and COMP in X is a language-independent descriptor summary: the
  comparison G(COMP-OCC-X) against G(FORM-X) is reported, **directional and not
  decisive**, and no pass rule of any claim about "form is screened off by
  company" or "company beats form" may rest on X. Those claims are decided in
  W (T1(ii), T2). X decides only whether a company-to-role function exists
  that transfers across families (U1: T1(i), T4, T7 text grains).

Contamination ledger (rule 6, enforced by G4): forbidden everywhere in primary
arms: `priors/pos-*.json`, `priors/frame-*.json`, `priors/role-config-*.json`,
`priors/proclitics-*`, `priors/enclitics-*`, `priors/morph*`,
`language-grammar.js`, `heard-nominals.js` (needs the POS prior),
`reader-bundle.js` (loads `pos-eng.json`), `grain-typing.js::makeGrainTyper` (POS
prior), `adapters/text/relations-positional.js` with a `RoleConfig@1` (the
SLOT-ROLE variant), and any tool whose prior was fit on UD train. **EO structures
are never inputs** (rule 6): no cube, operator, phasepost or grain-cell label
(`CELL` declarations, `GRAIN_BY_THRAX`, `THRAX_MAP`) enters any feature or any
impact component; the readers' output `cell` and `grain` fields are dropped from
the edge key before any signature is computed. Permitted:
`memory/activation.js`, `kernel/activation.js`, `kernel/dmd.js`,
`organs/company-index.js`, `organs/kind-standing.js`, `organs/heard-surfaces.js`
with `posPrior = null`, `adapters/text/relations-gfp.js` with `posPrior = null`,
and `kernel/holder-scope.js` / `kernel/perspective.js` for the perspective of the
fold (declared holders only).

### 2.8 The learner family and the tuning budget

- **L1**: multinomial logistic regression, L2 penalty lambda, deterministic
  full-batch optimiser run to relative gradient norm 1e-6 or 500 iterations
  (identical for every arm).
- **L2**: one hidden layer of 64 ReLU units, weight decay lambda, Adam
  (learning rate 1e-3, batch 256), 30 epochs, fixed seed.
- Tuning budget for every arm and learner: exactly the lambda grid
  {1e-4, 1e-3, 1e-2, 1e-1, 1, 10} (6 values) and nothing else. Selection is by
  mean cross-entropy on the **dev splits of the training-fold languages**
  (protocol X) or on the language's own dev split (protocol W). X selection does
  not simulate family shift (declared; identical for all arms, so it cannot favour
  one). Features are frozen at the freeze of the design and code.
- Probabilities are floored at 1e-4 and renormalised.
- **A claim about an arm is reported as robust only if L1 and L2 give the same
  verdict.** If they disagree the verdict is UNDERPOWERED(learner-dependent);
  the disagreement is itself reported (U4).
- The pair classifiers of T11 use L1 and L2 with the same grid.
- **Oracle ceilings.** For planted data only, the oracle is the Bayes-optimal
  lookup table on the generating variables, estimated on N_cap training tokens
  (a finite-sample oracle, learner independent); G_oracle is its information gain
  (section 4, G0).

### 2.9 The metric and its decomposition

- **G(arm) = CE(MAJ) - CE(arm)**, in bits per evaluated token, on held-out tokens,
  where CE is the cross-entropy of the learner's probabilities against the gold
  role and MAJ is the training class prior. G is the information the arm carries
  about the role beyond the base rate. G <= 0 is "no information".
- Secondary descriptive metrics: macro-F1 over classes present, accuracy.
- **Partial information**: S(a given b) = G(a + b) - G(b), the information that a
  adds beyond b (screening-off statistic).
- **Shapley decomposition.** Players F (form visible), K (company visible, the
  arm COMP-OCC) and, in the three-player version, P (position). Value v(S) = G of
  the arm with exactly the players S visible (v(empty) = 0). phi_F = 1/2 [v(F) -
  v(empty) + v(FK) - v(K)], phi_K likewise, interaction I_FK = v(FK) - v(F) -
  v(K) + v(empty). Three-player Shapley averages marginal contributions over the
  six orders.
- **Collision determination** (T1b): for a company class c (identical company
  tuple), Bayes error B(h) = sum_c (n_c - max_r n_{c,r}) / sum_c n_c over classes
  with n_c >= 2; B_null is the same statistic after permuting roles over the
  pooled tokens (same class sizes); **D(h) = (B_null - B) / B_null**, the share of
  role uncertainty removed by company; coverage Cv(h) = share of tokens in
  classes with n_c >= 2.
- **Pair metrics** (T11): AUROC and average precision of a pair score, and the
  separation rates of 2.5.7 / T11.

### 2.10 Nulls, noise floor, effect size, inference, tolerance

**(1) epsilon_noise (the instrument's stability floor; gate G2 only).** The
95th percentile, over (planted language x arm), of |G_s - G_s'| across 20 seed
pairs (induction seed, sample seed, learner initialisation) on identical data.
It is the smallest difference the pipeline can distinguish from re-seeding. It is
**not** an equivalence margin for any claim about the law (revision 1 used it as
one, and with thousands of test tokens any real nonzero effect exceeds a seed-
noise margin, so every "screens off" row was effectively unreachable and
absence of evidence could pass as support). It is used as a floor and in the
planted reject rules of G0.

**(2) SESOI, the one smallest effect size of interest, in the law's own units.**
The law says "differences that make a difference", so a difference counts when
it changes the conclusion. The unit is the one `dmdWindow`'s `equal` already
uses: the **fraction of tokens whose argmax role changes**. The pre-registered
smallest such change is u_l, the language's own re-training disagreement
measured in 2.6a (the noise floor of the same conclusion). SESOI is that
fraction converted to the metric of the claim by **planted calibration**: on
planted languages matched to the language in role count and role marginals
(fitted from the language's gold marginals, which are not features), pairs of
arms along a continuum of determinant strength (MIX(pi) with pi on a grid of
0.05) give pairs (metric difference, argmax-disagreement rate); an isotonic fit
phi maps disagreement to metric difference, and **SESOI_metric(l) = max(phi(u_l),
epsilon_noise)** (the floor keeps SESOI above the instrument's own stability).
So SESOI_G is in bits per token, SESOI_AUC in AUROC units, SESOI_NMI in NMI
units, each from the same calibration. One definition, one conversion; it is
derived, not typed, and the same SESOI is used for every equivalence and every
superiority statement in the document. (Wherever a rule below says SESOI without
a subscript it means the SESOI of the metric of the statistic.)

**(3) Notation in the pass rules.** For a statistic x with a one-sided 95
percent hierarchical-bootstrap interval [x_lo, x_hi]:
- "x > SESOI" (**superiority by margin**) means x_lo > SESOI;
- "x <= SESOI" (**equivalence**, a TOST-style one-sided test) means x_hi < SESOI
  **and** n >= n_min of the stratum; with n < n_min the unit outcome is
  UNDERPOWERED(n), not a pass;
- "|x| <= SESOI" (**two-sided equivalence**, for differences such as D10 or an
  AUROC difference) means both one-sided bounds lie inside +-SESOI and
  n >= n_min;
- "x > 0" additionally requires the label-permutation p < 0.05.
The point estimate is never the test: revision 1 tested point estimates for the
"no added information" rows, so low-power strata (the top exposure bin, a small
H1 stratum) passed by default.

**(4) n_min (the minimum-n rule).** For each (role-count, learner, metric), the
smallest n at which, on planted data with true effect exactly 0, the one-sided
upper bound falls below SESOI in at least 80 percent of draws (equivalence
power 0.8). Computed in G2. A stratum with n below n_min is UNDERPOWERED(n); it
is listed with its denominator and never counted as HOLDS.

**(5) Unit outcomes.** For each unit (language, family fold, or code family) and
claim, the outcome is one of: PASS (the pre-registered pass rule fires at the
margin), FAIL (the opposite rule fires: the kill statistic of 6.5 is certified
at the same one-sided 95 percent level), INCONCLUSIVE (n >= n_min, neither
fires), UNDERPOWERED(n), GAP (typed gap).

**(6) The per-unit tolerance k_N (derived), replication, and the claim
verdict.** A "HOLDS in every unit" rule makes a true law fail with probability
near one (a true law passes a single unit with probability pi < 1, and 41 units
multiply). So the support rule is stated through the instrument's own measured
power:
- pi_c = the per-unit pass rate of claim c on the claim's **own planted-true
  generator** (the G0 cell of c), estimated over R_draw = 200 seeded draws;
  pi_c^lo = its lower one-sided 95 percent Clopper-Pearson bound. **Gate:** pi_c
  point estimate >= 0.95, else claim c is UNDERPOWERED.
- **k_N(c)** = the smallest integer k such that P(Binomial(N_c, 1 - pi_c^lo) > k)
  <= 0.01, N_c = the number of evaluable units of the claim. (Illustration only,
  computed from the formula and not typed: with 200 of 200 planted draws passing,
  pi^lo = 0.985, which gives k = 3 for 41 languages, k = 1 for 10 folds and
  k = 1 for 6 code families.)
- **Replication override.** A family with two or more members that has **two or
  more FAIL members** is a replicated failure and is never instrument noise: the
  claim is FALSIFIED(that family) whatever k_N says (a joint false failure at
  pi^lo = 0.985 has probability about 2e-4).
- **Claim verdict (a total function of the unit outcomes, asserted by the
  property test)**, with N_eval = units that are not GAP, nPASS, nFAIL, nINC,
  nUND the counts: (i) if nGAP + nUND > 0.2 N_c, UNDERPOWERED (or UNTESTED if
  N_eval = 0); (ii) else FALSIFIED(scope) if nFAIL > k_N or a replication
  override fires; (iii) else HOLDS if nFAIL + nINC + nUND <= k_N and no
  replication override fires (with the exceptions listed); (iv) else
  UNRESOLVED(counts). A verdict of AMENDED(A#) is assigned after the fact to a
  claim whose verdict is FALSIFIED or UNRESOLVED when a registered amendment
  passes (6.2). The rules (i) to (iv) are evaluated in order and are exhaustive,
  and (ii) and (iii) cannot both hold (nFAIL > k_N excludes nFAIL <= k_N, and the
  override is excluded from (iii)), so every vector maps to exactly one
  verdict.
  This replaces revision 1's asymmetric rule (support needs every unit at alpha
  0.05, falsification needs one unit at Holm), which made support unreachable
  and falsification near certain.

**(7) Other nulls.**
- **Label-permutation null** for G > 0: permute test labels over tokens within
  the language (B_perm = 1,000; the trained learner is reused, so it is cheap).
- **Learner null (control built to fail, G1)**: train on label-permuted TRAIN data
  (20 repeats); G on real test must be <= epsilon_noise. An arm that learns from
  noise is a broken learner, not a finding.
- **Within-sentence shuffle null** for company: shuffle the units of each sentence
  (marginals kept exactly, adjacency destroyed): the repo's own null in
  `discoverCompanyKinds`.
- **Sentence-block bootstrap** (B_boot = 2,000) within language; **hierarchical
  bootstrap** across the units of a claim: families, then languages within
  family, then sentences; macro-averages weight each family equally and each
  language equally within its family.
- **Family-blocked permutation** for across-language associations (T3): permute
  the covariate across languages within family.
- **Multiple comparisons**: section 9.2 (k_N replaces the Bonferroni and Holm
  scheme of revision 1).

---

## 3. Splits and families

### 3.1 The language set (frozen explicit list)

`FROZEN_STEMS` (explicit; enumerated at write time from
`/private/tmp/claude-501/ud-eval`, requiring dev and test there and train in
`tb/<stem>/`): 41 languages. `cmn` and `cmn-hans` are the **same sentences in two
scripts** (identical token counts in the census): the language is counted once,
as `cmn-hans`, in every macro-average; `cmn` (Hant) is used only as the
bijection/script control in G3 and T3. The other stems are:

arb bul cat ces dan deu ell eng est eus fas fin fra glg heb hin hrv hun hye ind
ita jpn kor lav lit nld nob pol por ron rus slk slv spa srp swe tur ukr urd vie
(+ cmn-hans).

| family (strict) | languages |
|---|---|
| Indo-European (29) | Germanic eng deu nld swe dan nob; Romance spa fra ita por ron cat glg; Slavic rus ukr pol ces slk slv hrv srp bul; Baltic lav lit; Indo-Iranian hin urd fas; Hellenic ell; Armenian hye |
| Uralic (3) | fin est hun |
| Afro-Asiatic (2) | arb heb |
| Turkic (1) | tur |
| Japonic (1) | jpn |
| Koreanic (1) | kor |
| Sinitic (1) | cmn-hans |
| Austronesian (1) | ind |
| Austroasiatic (1) | vie |
| Basque isolate (1) | eus |

### 3.2 Splits, caps, late reserve

- **TRAIN** (`tb/<stem>/train.conllu`): learner training and exposure Q_0 (forms
  only for Q_0). **DEV** (`ud-eval/<stem>/dev.conllu`): lambda selection, h* and
  M*/F* measurement, gates, smoke runs; never a verdict. **TEST**
  (`ud-eval/<stem>/test.conllu`): the verdicts, run once (section 8).
- **N_cap (derived).** The smallest train split in the set is hun at 20,166
  tokens (appendix B), so N_cap = 20,000 tokens per language: the longest prefix of
  a seeded permutation of the train sentences whose total is at most 20,000.
  Every language trains on N_cap tokens in the primary runs (family imbalance
  control). A secondary "W-full" run trains on the whole train split and is
  labelled.
- **Late reserve.** Any stem that appears in ud-eval after this document is frozen
  (the other workflow is adding languages; at the time of revision 2 ud-eval
  already holds afr cym gle kat lzh mar mlt tam tel in addition to the frozen
  list, and uig and wol may follow) is not in `FROZEN_STEMS`; it is reserved for a v3 and, if
  present at run time, evaluated only as an extra held-out family in T1-X and
  T4, labelled "late", with no choice of analysis made after seeing it. Several
  of those would be new families (Dravidian, Kartvelian, Niger-Congo), which is
  the best possible out-of-sample test of U1.
- Sentences are never split across languages or families; no test sentence is in
  any training set. Parallel test sets (PUD) are not independent across languages
  (risk R7); this affects the language-level bootstrap, not training.

### 3.3 Partitions for leave-one-family-out

- **P1 (primary, strict families)**: 10 folds, hold out in turn: Indo-European,
  Uralic, Afro-Asiatic, Turkic, Japonic, Koreanic, Sinitic, Austronesian,
  Austroasiatic, Basque. Train on the capped train splits of every language
  outside the fold. Evaluate on the held-out languages' TEST. The macro-average
  weights the 10 folds equally.
- **P2 (secondary, branch-out)**: hold out one Indo-European branch (Germanic,
  Romance, Slavic, Baltic, Indo-Iranian, Hellenic) while training on the other
  Indo-European branches and all non-IE. Weaker (related branches remain), reported
  as an easier rung and labelled so.
- **P3 (secondary, script-out)**: hold out one script group (Latin, Cyrillic,
  Arabic-script {arb, fas, urd}, Devanagari {hin}, Hebrew, Greek, Han/Kana/Hangul
  {cmn-hans, jpn, kor}) to remove script-shape shortcuts from FORM-X.

### 3.4 Non-natural systems

**Code.** Corpus `/private/tmp/claude-501/code-corpus/manifest.json` (51
languages, split BY REPOSITORY by sha256 of the repo name modulo 4; train =
{0,1}, dev = 2, test = 3; the manifest's own `declared.split_rule`). Gold
`eval/coding-competence/gold.mjs` (present at revision 2; `goldFor`, `goldBatch`, `goldAvailable`):
tree-sitter tokens with `class`, `defs`, `refs`. Gold provenance disclosure: the
extractor was corrected while looking at DEV smoke files (its own header), so
TEST is the only blind split. Languages whose `capabilities.tokens.status` is not
`ok` are typed gaps. Frozen code families (declared here, a conventional
grouping fixed before any run):

| code family | languages |
|---|---|
| Algol/C-like | c cpp objc c_sharp java kotlin scala groovy dart go rust swift zig nim solidity javascript typescript tsx php |
| ML/proof | ocaml haskell elm lean |
| Lisp | clojure commonlisp scheme racket |
| Dynamic/scripting | python ruby lua perl bash powershell r julia matlab elixir erlang |
| Legacy/hardware | fortran cobol verilog |
| Data/markup/query | json yaml toml css html markdown latex sql vue svelte |

Leave-one-code-family-out folds (6) are the code analogue of P1. Token
inventory and `class` come from gold; features follow section 2.7 with the token
stream = gold tokens in order (comment and string tokens are atomic units).
Class labels are never features.

**Notation.** At the time of revision 2 `/private/tmp/claude-501/notation/` contains a
feasibility survey (`survey/`), `PROVENANCE.md` and `local-inventory.json`, no token-role gold, and
`/Users/mlacy/Documents/3.0/khora/native/eval/notation-competence/` does not
exist. Therefore every notation test is `UNTESTED(no gold yet)` unless, at run
time, a notation corpus appears with token-level role gold in this contract:
JSONL, one document per line, `{system, family, split, doc, tokens: [{form,
role}]}` with a repository-level or document-level split. Such a corpus is run
through exactly the T1, T2, T4, T6 and T9 pipelines above with no new analysis,
as a late reserve. Absent that, the law's U3 rung is code only, and the report
says so with the denominator.

### 3.5 Coreference gold (T11)

At the time of revision 2, `/private/tmp/claude-501/physics/coref/` holds
`corefud14_manifest.tsv` (the CorefUD 1.4 file list: Czech, Dutch, Hungarian,
German, Lithuanian, Turkish, Ancient Hebrew, French, Latin, Norwegian, Korean,
Spanish, Hindi, English (GUM, FantasyCoref, LitBank, ParCorFull), Catalan,
Russian, Ancient Greek, Old Church Slavonic, Polish) and `tools/`, but no
`.conllu` chain file and an empty `_docs/`. The manifest lists train and dev
splits only. T11 therefore runs only if, at run time, chain files exist under
that directory in this contract: CorefUD CoNLL-U with `Entity=` attributes in
MISC (mention spans with cluster identifiers; singleton mentions present for the
treebanks that carry them), one file per treebank and split. Split rule when no
blind test is present: documents of the CorefUD train file are divided 80/20 by
sha256 of the document id into learner-train and lambda-dev; the CorefUD **dev**
file is the TEST of T11 (run once). Families for the held-out rule: Indo-European
(all Germanic, Romance, Slavic, Baltic, Indo-Aryan, Hellenic, Latin, Old Church
Slavonic), Uralic (hu), Turkic (tr), Koreanic (ko), Afro-Asiatic (hbo): 5 folds,
fewer than the 10 of P1, said so. If the chain files are absent, T11 is
`UNTESTED(no coref gold yet)` with denominator 0, and the planted FOLD-PLANT
gates (G0) still run so that the instrument's readiness is on record. This
workflow does not fetch the coreference gold (the sibling workflow
`beings-physics` owns it).

---

## 4. The instrument gates (nothing is concluded without them)

A claim that fails its gate is UNDERPOWERED, whatever the data say.

### G0: the planted confusion matrix (power check and control built to fail)

Appendix A specifies synthetic languages whose role is determined by exactly one
thing, each with an **oracle ceiling** G_oracle (the finite-sample Bayes-optimal
lookup on the generating variables at N_cap, 2.8). For each protocol, run all
arms on all generators with R_draw = 200 seeded draws per generator cell (6
planted families of 2 languages for X); the unit tests run a 6-draw fast version.

- **Detect.** The arm matching the planted determinant reaches **at least a
  fraction theta = 0.8 of G_oracle** (declared; a fraction of the ceiling, not
  merely G > 0, because any arm that sees anything has G > 0) **and** has G
  significantly above zero (label-permutation null, alpha 0.05), in at least 95
  percent of draws.
- **Reject.** Every other arm has G <= epsilon_noise in at least 95 percent of
  draws.
- **Learnable determinations only.** The planted company generators are CO-TAB(h)
  (role = a table lookup on the tuple of latent classes of the last h tokens, with
  the latent class count q_h = min(8, floor(256^(1/h))) so the table has at most
  256 cells) and CO-ADD(h) (role = argmax over roles of a sum of per-offset
  class weights, which is what a logistic model represents). The modular-sum
  generator of revision 1 (role = (sum c_d kappa(w_{i-d})) mod R, which for h >= 2 is
  a parity-like function that a logistic regression cannot represent and a
  64-unit network cannot learn from 20,000 tokens) is kept **only** as CO-PAR(h) and
  used only for the UNBOUNDED case. A failing assertion documents why it was
  replaced: for CO-PAR(2) the detect rule is expected to fail (tests/law-planted).
- **Decision-boundary cells.** Every statistic that decides an outcome table has a
  planted cell at its own decision boundary, not only at the planted arm:
  1. **Screening-off** (T2): FO-INDEP(delta) with delta = 0, SESOI and 2 SESOI bits
     of form information independent of company at high exposure: S(FORM given
     COMP-OCC) must be classified equivalent at 0 (when n >= n_min), **not
     equivalent** at SESOI, and superior at 2 SESOI.
  2. **Cache versus independence** (T2, A3): CACHE (the type's role is a function
     of the company class of the type, so the lexicon is only a cache of
     company): S(FORM given COMP-TYPE-D; f) must reach <= SESOI at an exposure
     f_conv <= f_sat(FORM-LEX) and be classified as A3, **never as
     FALSIFIED(form independent)**; FO-LEX (the type-to-role map independent of
     company) must show a plateau above SESOI and be classified FALSIFIED(strong).
     G0 fails if the CACHE case is classified FALSIFIED(form independent).
  3. **Class mix is not a slope** (T2): CLASSMIX (closed types determined by
     identity, open types by company, with frequency separating the classes):
     the revision-1 stratification by exposure bin produces a spurious falling
     slope; the subsampling design must produce **no** slope.
  4. **Determines versus is evidence for** (T1b, A4): LATENT(q): the role is
     generated by a latent class z, of which both the identity and the company are
     noisy proxies; the instrument must classify it A4 (constrains, D(h*) inside
     the planted range) and not "determines", and not "form independent".
  5. **Collapse kappa** (T9): CO versus BAG as before; the shuffle control now
     runs on COMP-OCC.
  6. **Collision determination D** (T1b): exact determination (D = 1 up to
     class-size effects) versus 10 percent role noise (D about 0.9).
  7. **Horizon** (T6): CO-TAB(h) with h in {1, 2, 3, 4, 6, 8}: measured h*_u must be
     the smallest ladder rung >= h in at least 90 percent of draws; UNBOUNDED
     (CO-PAR over the whole prefix): the typed gap `reach_exceeds_candidates`;
     **data-limited**: CO-TAB(6) at one quarter of the exposure (N_cap/4): the
     instrument must report `data_limited` (h* rising with N), not h* = 1 (T6
     sweep); a planted generator whose impact horizon equals h* by construction
     must pass T6d (a unit-conversion defect would make it fail).
  8. **Sufficiency** (T5): IMPACT-SUFF (role = a function of the slot-ablation
     impact type, which is a function of the window) must give S(COMP-W given
     IMPACT-SLOT) <= SESOI; IMPACT-LOSSY (role depends on a window feature that
     the impact signature discards) must give S(COMP-W given IMPACT-SLOT) > SESOI.
     **LONGRANGE** (role depends only on the token's effect on later sentences)
     must be recovered by COMP-W and not by the prefix-only COMP-OCC.
  9. **Slot versus span** (T10): SLOT-ONLY (role determined by a slot-structure
     effect, such as a rebound or a shift with unchanged edge strings, that the
     string-keyed span signature cannot see) must be detected by IMPACT-SLOT and
     rejected by IMPACT-SPAN; SPAN-ONLY (role determined by a string-level effect
     with no slot consequence, such as a surface birth with no relation) must be
     detected by IMPACT-SPAN and rejected by IMPACT-SLOT. The test is symmetric
     so that T10 can fail in either direction.
  10. **Fold** (T11): FOLD-PLANT cells of appendix A (coreference variation by
      surface, homonym separation, company-twin separation, fold-blind control,
      singleton existence, perspective dependence): STRING must fail the first
      two, COMP-SIM the third, and FOLD must pass all and must not beat STRING on
      the fold-blind control.
- **Protocol X matrix**: {HMM-SHARED, HMM-PRIVATE, FO-X, PO} by arms {COMP-OCC-X,
  FORM-X, POS, FREQ}, with the additional requirement that **HMM-PRIVATE** (each
  planted family has its own transition structure, so no universal
  company-to-role function exists) yields COMP-W > 0 and COMP-OCC-X <=
  epsilon_noise. The instrument must be able to say "company determines role in
  each language but not by a shared function" (this separates U0 from U1).
- **Shapley recovery**: on MIX(pi) with pi in {0.2, 0.5, 0.8} the recovered share
  phi_K/(phi_K + phi_F) is within 0.10 of pi in at least 90 percent of draws.
- **Per-claim power pi_c** (2.10) is read off the claim's own planted-true cell
  in this gate; pi_c < 0.95 makes the claim UNDERPOWERED, and the derived k_N(c)
  comes from the same cell.

### G1: learner null

Train-permuted learner has G <= epsilon_noise on real dev for six pilot languages
and on all planted draws.

### G2: determinism, seed noise, SESOI, n_min

Re-running any arm with the same seed is byte-identical; the 20-seed spread
defines epsilon_noise (2.10); the planted calibration of 2.10(2) defines the SESOI
map phi per (role-count, metric); the planted equivalence-power runs define
n_min of 2.10(4). A larger-than-planted spread on real dev is reported; the margin
stays as derived (it is not widened after the fact), so an arm that is unstable on
real data makes its claim UNDERPOWERED rather than passing it.

### G3: leakage, causality, bijection, centre-swap

- **Gold-free features**: replace every gold label in the parallel array by a
  random permutation; every feature vector of every arm must be hash-identical.
- **Causal conformance** (the invariant of `memory/activation.js`): the causal
  features of token i are hash-identical when all sentences after the current
  one are replaced by arbitrary other sentences. For the impact side: the
  **F* = 0 signature** (self frame and preceding frames) is hash-identical when
  every sentence after s is replaced by arbitrary text; the full signature (F* >
  0) must change, which proves the two arms differ.
- **Centre-swap invariance** (2.3): COMP-OCC, COMP-SENT and COMP-W feature vectors
  are invariant to replacing the centre's identity by a random type, and FORM,
  FREQ, LEXD and COMP-TYPE are **not** (the property must fail where it should).
- **Bijection**: recode every character of a language by a seeded random
  bijection on code points; the identity/company arms' G is unchanged (within
  epsilon_noise); FORM-X shape features are expected to change only through script
  and case flags. Also cmn versus cmn-hans: the company and identity arms agree
  within epsilon_noise.
- **COMP-NATIVE conformance**: its vectors equal `createCompanyIndex().vectors`
  byte for byte.

### G4: contamination

Static scan of `eval/law/*.mjs` imports and runtime guard: no import of a
forbidden module (2.7); the readers are constructed with `posPrior = null`; no
call of `relations-positional.js` with a `RoleConfig` outside the labelled
SLOT-ROLE variant.

### G5: verdict reachability (a Popperian test must be able to come out both ways)

Before the TEST run, `eval/law/verdict.mjs` is run on result vectors produced
by the **real pipeline** on the planted laws of appendix A: LAW-TRUE (a planted
universe in which role is determined by slot-ablation impact, which is determined
by company within a horizon h0, with no form or position dependence, hapax
included, and FOLD-PLANT chains) and LAW-FALSE (FO-LEX plus PO mixtures with the
same marginals). The verdict function must return **survives(R5)** for LAW-TRUE
and FALSIFIED (with the killing claims) for LAW-FALSE; and for LAW-CO-ONLY (company
determines role, impact planted null) it must return the strongest nested reading
R3. If any of these is unreachable the whole run is UNDERPOWERED(verdict), whatever
the real data say. A property test over a grid of constructed result vectors asserts
that every vector maps to exactly one verdict (section 7).

---

## 5. The tests

Common to all tests unless a test says otherwise: protocols W and X, causal arms
primary and non-causal arms reported as the lookahead bound, learners L1 and L2,
operating horizon h*_an,l, E1 exposure, TEST split, N_cap training, G in bits, and
the SESOI and unit-outcome rules of 2.10. "Family unit" means a P1 fold (10);
"language unit" means one of the 41 languages. Per-claim verdicts are the total
function of 2.10(6): HOLDS needs all evaluable units to pass except at most k_N
(derived), with no replicated failure; FALSIFIED needs more than k_N failing
units or two failing members of one family. The outcome tables below are
written in terms of that function; the column "what would have counted as
failure" for every claim is collected in 6.5.

Predictions written ahead of data are marked **Prediction (recorded, not a
result)** and are scored for calibration after the run; a miss is reported as a
miss.

### T1. Occurrence company predicts role beyond position, frequency and (where form has no entry) form (L-D, U0, U1)

- **Claim.** Two parts, both pre-registered. **T1(i) information:** COMP-OCC (the
  occurrence window, centre masked, no type vector, no own descriptor, no
  sentinel; 2.3) carries information about UPOS14 beyond position and
  frequency: S(COMP-OCC given FREQ+POS) > SESOI in every unit, in W (every
  language) and in X (every held-out family). **T1(ii) company against form:**
  G(COMP-OCC) >= G(FORM) - SESOI, evaluated **separately** on (a) all tokens,
  (b) H0 (first sight: type absent from the exposure at read time) and (c) H1
  (true hapax); in W, FORM = FORM-LEX + FORM-MORPH. (a) is not expected to
  pass: on seen tokens the lexicon is a stored company, so it is the
  predicted-to-fail row of R3/R5; (b) and (c) are the rows R3 requires. Revision
  1's pass rule G(COMP) > max(G(POS), G(FREQ)) + SESOI was satisfied by
  nesting, because its COMP already contained FREQ, boundary position and the
  centre's own descriptor; it was the spot test the lens warns about and it
  contained no form in the rule. Both are fixed here.
- **Data.** G1 labels; 41 languages; P1 folds.
- **Features.** COMP-OCC, FREQ+POS, FORM (X: language-independent FORM-X plus
  FORM-IND; W: identity allowed), MAJ; reported labelled: COMP-SENT, COMP-TYPE,
  LEXD, BAG, COMP-OCC+FORM.
- **Null.** Label permutation (G > 0); sentence-block bootstrap of S(COMP-OCC given FREQ+POS) and of G(COMP-OCC) - G(FORM).
- **Control built to fail.** (i) Within-sentence shuffle of the TEST stream
  (company destroyed, marginals kept): G(COMP-OCC) must fall to <= SESOI; this
  is now **valid** because COMP-OCC contains no type vector and no own
  descriptor (revision 1's control could not pass for seen tokens: the shuffle
  leaves the type vector untouched). (ii) The learner null (G1). (iii) The planted
  FO-LEX and PO languages (G0): G(COMP-OCC) <= epsilon_noise on FO-LEX, which is
  the assertion that fails under the old COMP definition and demonstrates the
  leak. (iv) The centre-swap invariance property (2.3, G3).
- **Power check.** G0 for the claimed form (CO-TAB, CO-ADD at h in {1, 2, 4}: detect
  = G(COMP-OCC) >= 0.8 G_oracle; HMM-SHARED) and the rival forms (FO-LEX, FO-MORPH,
  PO, HMM-PRIVATE for X).
- **Alternatives.** FORM, POSITION, FREQ, BAG, COMP-SENT, COMP-TYPE (reported as
  the lexicon arm), COMP-OCC+FORM, the chance baseline.
- **Held-out rule.** W: TEST sentences of the same language (sentence- and
  document-disjoint as the treebank splits them). X: whole family held out (P1);
  secondary P2 and P3. T1(ii) is decided in W only (2.7: X cannot decide the
  company-versus-form contrast).
- **Statistic.** D1(unit) = S(COMP-OCC given FREQ+POS) for T1(i); D1b(unit, stratum) =
  G(COMP-OCC) - G(FORM) for T1(ii); hierarchical bootstrap CI; per-unit
  label-permutation p; macro G over families.
- **Outcome table** (unit outcomes per 2.10; the claim verdict by the total function).

| observed | verdict |
|---|---|
| T1(i): D1 > SESOI (PASS) in all evaluable units but at most k_N; gate passed; L1 and L2 agree | HOLDS(i) (R0; R2 needs X as well) |
| T1(i) in W holds; in X fails in more than k_N(10) folds (company descriptors do not transfer) | AMENDED(A5): role is determined by company within a language through a language-specific mapping; no universal function; U1 fails |
| T1(i) passes only in the non-causal variants | AMENDED(A7): company determines role retrospectively only (not a reading law) |
| T1(i): D1 <= SESOI (equivalence, n >= n_min) in more than k_N languages, or in two languages of one family | FALSIFIED(that scope): occurrence company does not carry role beyond position and frequency there |
| T1(ii)(b),(c): D1b >= -SESOI in all but k_N evaluable units | HOLDS(ii): company is at least as informative as form where form has no entry (R3 row) |
| T1(ii)(a) fails while (b),(c) pass | recorded as the predicted lexicon row, with the amendment A3 (the lexicon is a cache of accumulated company); not a falsification of R3 |
| T1(ii)(b) or (c): G(COMP-OCC) < G(FORM) - SESOI in more than k_N units | FALSIFIED(R3 row): form beats company even where the lexicon has no entry |
| gate failed or L1 and L2 disagree | UNDERPOWERED |

- **Prediction (recorded, not a result).** T1(i) holds in all 41 languages (prior
  0.95). X holds in at least 8 of 10 folds; the weak folds are expected among
  Indo-European held out (smallest training diversity), Sinitic and Afro-Asiatic.
  T1(ii)(a) fails in at least 35 of 41 languages (the lexicon is a stored
  company); T1(ii)(b), (c) hold in at least 30 of 41.

### T1b. Determination, not correlation: collision counterexamples at the bound

- **Claim.** "Determined by" means: at the dmd-measured horizon, tokens with the
  same company have the same role. D(h*) is near 1, up to the planted exact-
  determination ceiling.
- **Data.** G1 and G2 and G3 labels; pooled train+dev+test of each language (no
  learning; labels used only to count, never as features).
- **Features.** Company class c = the tuple of identities at offsets within h*
  (**COMP-OCC window, boundary-blind, centre masked**) (W); the tuple of induced
  classes (X variant); the company+form variant adds the centre identity.
- **Null.** Role permutation over the pooled tokens, same class sizes: B_null.
- **Control built to fail.** Planted CO language with exact determination (D = 1 by
  construction up to class-size effects); planted CO with 10 percent role noise
  (D = about 0.9); planted FO language (D(company) <= SESOI); planted LATENT
  (D inside its planted range, classified A4).
- **Power check.** D_planted,lo = the 5th percentile of D over the exact-
  determination draws at matched coverage; detects noise at the planted 10 percent
  level in at least 95 percent of draws.
- **Alternatives.** Company+form (identity added), bag company.
- **Held-out rule.** None needed (a counting statistic); the family unit is the
  language's own family; coverage Cv(h*) is reported beside D, and a claim made at
  a horizon with Cv < 0.2 is UNTESTED(sparse company), because a tuple that never
  repeats trivially "determines" its role (the **sparse-company paradox**: the
  claim is vacuous for unique company, which is why the bound clause is not
  optional).
- **Statistic.** D(h*) with sentence-block bootstrap CI.
- **Outcome table.**

| observed | verdict |
|---|---|
| D(h*) lower CI >= D_planted,lo in all evaluable units but at most k_N | HOLDS (strong determination at the bound; R5 row) |
| D(h*) significantly > 0 but upper CI < D_planted,lo in more than k_N units | AMENDED(A4): company constrains role probabilistically; "determines" falsified, "constrains" holds |
| D(h*) upper CI <= SESOI in more than k_N units or two units of a family | FALSIFIED: company at the bound removes no role uncertainty there |
| gate failed | UNDERPOWERED |

- **Prediction (recorded, not a result).** The strong reading is falsified
  (collisions such as one form with two roles in the same two-token frame are
  certain); A4 holds with D(h*) between 0.3 and 0.8 depending on the language.
  This claim is R5-only: a predicted failure here does not lower R0 to R4.

### T2. Company versus form versus position: the exposure-intervention design and factor decomposition (L-D)

- **Claim.** Role is independent of form given company (screening off), and
  company carries more of the role information than form where form is not a
  stored company. The claim has three registered forms, from the literal to the
  amended, and the design separates them so the cache reading (A3) has a
  falsifier:
  - **literal (R5 row):** S(FORM given COMP-OCC) <= SESOI at full exposure (the
    single occurrence's window suffices; no lexicon needed);
  - **cache (A3, the R3 row):** S(FORM given COMP-TYPE-D; f) falls to <= SESOI at an
    exposure fraction f_conv that is **not larger than** f_sat(FORM-LEX), the
    exposure at which FORM-LEX itself saturates; otherwise form is independently
    informative and A3 is falsified;
  - **position:** S(POS given COMP-OCC) <= SESOI, and S(COMP-SENT given COMP-OCC) reported
    as the boundary contribution (A8).
- **Data.** G1, W only for identity arms. **The exposure intervention (replaces
  the exposure-bin strata of revision 1).** Stratifying tokens by exposure n at
  first sight groups them by word class: the top bins (n >= 16, 64+) are almost
  entirely closed-class words whose role is near-deterministic from frequency, so
  a falling S(FORM given COMP; n) can reflect class mix, not form becoming redundant
  with company; and a capped 20,000-token sample leaves very few types and
  roles in the top bin, so a point estimate <= SESOI there is a low-power pass.
  Instead: **subsample the training and exposure sets to fractions f in {1/64,
  1/32, 1/16, 1/8, 1/4, 1/2, 1}** (nested, seeded sentence prefixes of a seeded
  permutation), retrain every arm on f N_cap tokens with the exposure Q built from
  the same sentences, and evaluate on **the same TEST tokens** at every f (so the
  token population is constant; only the exposure varies). The exposure-at-first-
  sight bins of revision 1 are kept as a descriptive table only.
  **Within-class strata:** the same curves are computed separately for the
  closed-class tokens {ADP, AUX, CCONJ, DET, PART, PRON, SCONJ} and the open-class
  tokens {ADJ, ADV, INTJ, NOUN, NUM, PROPN, VERB} (gold is used to stratify
  evaluation, never as a feature), so class mix cannot produce the slope.
- **Features.** The 2x2: (form not visible, company not visible) = MAJ; (form, not
  company) = FORM; (not form, company) = COMP-OCC; (both) = COMP-OCC+FORM. Third
  factor position (POS). The lexicon arms COMP-TYPE-D, COMP-TYPE and LEXD are
  reported as the cache arms and enter only the convergence curve and the nesting
  diagnostics. Within W, FORM is split into FORM-LEX and FORM-MORPH.
- **Null.** Conditional label permutation for S(FORM given COMP): permute the FORM
  feature vectors among tokens within bins of COMP-OCC (k-means bins with K derived
  by the 2.4 stability rule), preserving the form-company association; B = 500.
- **Control built to fail.** Planted MIX(pi): decomposition recovers pi (G0). Form
  scrambled within position strata (identity permuted among tokens with equal
  sentence index): FORM arm collapses, COMP-OCC unchanged. Planted **CACHE**: the
  slope reaches zero under exposure subsampling; planted **FO-LEX**: a plateau;
  planted **CLASSMIX**: no slope under subsampling although stratification would
  produce one; planted **FO-INDEP** at 0, SESOI and 2 SESOI.
- **Power check.** G0 matrix for W, the decision-boundary cells 1 to 3 of G0, and
  Shapley recovery. If the cache case is classified FALSIFIED(form independent),
  the gate fails and T2 is UNDERPOWERED.
- **Alternatives.** Form dominance (S(COMP-OCC given FORM) <= SESOI), additive
  independence (I_FK = 0), position-dominance.
- **Statistics.** v(S) per cell; phi_F, phi_K, phi_P, I_FK; the screening
  statistics S(FORM given COMP-OCC; f), S(FORM given COMP-TYPE-D; f), S(POS given COMP-OCC),
  S(COMP-OCC given FORM); the **convergence curves** over f, overall and within
  class; **f_sat(FORM-LEX)** = the smallest f with G(FORM-LEX; f) >= G(FORM-LEX; 1)
  - SESOI; **f_conv** = the smallest f with S(FORM given COMP-TYPE-D; f) <= SESOI
  (equivalence, n >= n_min) that stays <= SESOI for all larger f; the slope of
  S(FORM given COMP-TYPE-D) against log2 f.
- **Held-out rule.** TEST of each language; the exposure at read time is causal.
- **Outcome table.**

| observed | verdict |
|---|---|
| S(FORM given COMP-OCC) <= SESOI at f = 1 in all evaluable units but k_N, S(POS given COMP-OCC) <= SESOI | HOLDS (literal screening, R5 row) |
| literal fails (S(FORM given COMP-OCC) > SESOI on seen tokens) but S(FORM given COMP-TYPE-D; f) reaches <= SESOI at f_conv <= f_sat(FORM-LEX) in the open class and overall, in all units but k_N | AMENDED(A3): company must be sampled; identity is a cache of accumulated company (R3 row passes) |
| S(FORM given COMP-TYPE-D; f) is > SESOI at f = 1 (lower CI) in at least 50 percent of families, or f_conv does not exist or f_conv > f_sat(FORM-LEX) | FALSIFIED(strong form; A3 refuted): form carries role not carried by aggregated company even at the exposure where the lexicon saturates |
| S(POS given COMP-OCC) > SESOI in more than k_N units | AMENDED(A8): company and position (boundary) co-determine |
| gate failed (cache classified as form-independent, or n < n_min in the cells above) | UNDERPOWERED |

- **Prediction (recorded, not a result).** phi_F >= phi_K on seen tokens (the
  lexicon is a stored company), phi_K > phi_F on OOV; the literal row fails in
  nearly every language; A3 is reached in analytic languages and not in
  agglutinative ones within the exposure available (f_conv exists in at most 25
  of 41); the within-class curves separate closed (flat, form-determined) from
  open (falling).

### T3. Strain: unspaced, agglutinative, free-word-order, inflected languages (L-D, U0)

- **Claim.** Company still determines role where the law is most likely to strain.
  Form (morphology) does not take over; if it does, the amendment A1 (company
  includes sub-word company) accounts for it.
- **Data.** G1; the stratification covariates are computed from data and are never
  features: **MR** = type-token ratio of the language's N_cap-token train sample
  (derived inflection index; the census shows FEATS is absent for kor, jpn, vie so
  it is not used); **UNSPACED** = the script test of
  `adapters/text/script-segment.js::isUnspacedScript`; **WOF** = entropy of the
  head-direction order of subject, verb, object computed from gold DEPREL and HEAD
  (covariate only, never a feature). Named strata (frozen): unspaced {cmn-hans,
  jpn}; agglutinative {tur, fin, hun, est, kor, eus}; inflected fusional
  {rus, ukr, pol, ces, slk, slv, hrv, srp, bul, lav, lit, ell}; templatic
  {arb, heb}; free-order proxy = top tercile of WOF.
- **Features.** W: FORM-MORPH, COMP-OCC, COMP-OCC+FORM-MORPH, SUBWORD, COMP-OCC+SUBWORD; for
  unspaced languages additionally the **character-grain** unit (unit = character,
  label = UPOS of the containing word, features = character company); the unit
  of evaluation is then the character.
- **Statistic (T3a).** Delta_FC(l) = G(FORM-MORPH) - G(COMP-OCC) on all tokens and on
  the OOV stratum, per language. The law predicts Delta_FC does not rise with MR:
  Spearman rho(Delta_FC, MR) tested with a family-blocked permutation null
  (B = 5,000).
- **Statistic (T3b, the amendment).** S(FORM-MORPH given COMP-OCC+SUBWORD) in the top-MR
  tercile. If sub-word company (affix company, no identity) screens form off the
  form's advantage is explained by company at the sub-word grain.
- **Null.** Family-blocked permutation of the covariate; conditional permutation
  for S.
- **Control built to fail.** Planted AGGL (stem+suffix1+suffix2; suffix1 determines
  role; suffix2 agrees with neighbour suffix1) in two forms: agreement ON (company
  informative through affixes) and agreement OFF (form only): SUBWORD must recover
  the ON case and not the OFF case; token-level COMP-OCC must fail the ON case when stems
  are all novel (every token OOV).
- **Power check.** G0 with AGGL.
- **Alternatives.** Form takeover; template morphology (arb, heb); Han/Kana
  morpheme-per-character grain.
- **Held-out rule.** W: TEST; X for the descriptor variant (SUBWORD descriptors are
  language independent).
- **Outcome table.**

| observed | verdict |
|---|---|
| rho(Delta_FC, MR) not > 0 at family-blocked p < 0.05 AND Delta_FC(top tercile) <= SESOI | HOLDS (auxiliary claim: scope note) |
| rho > 0 and Delta_FC(top tercile) > SESOI, but S(FORM-MORPH given COMP-OCC+SUBWORD) <= SESOI | AMENDED(A1): company includes sub-word company |
| Delta_FC(top tercile) > SESOI and S(FORM-MORPH given COMP-OCC+SUBWORD) > SESOI in a named stratum, replicated in at least two of its languages | FALSIFIED(stratum): orthographic form carries role not recoverable from any measured company |
| unspaced character grain: G(char company) <= SESOI | FALSIFIED(unspaced) or UNTESTED(segmentation leak), whichever the gate supports |
| gate failed | UNDERPOWERED |

- **Prediction (recorded, not a result).** rho(Delta_FC, MR) > 0.5; A1 recovers at
  least half of the gap in Turkic and Uralic and little in the Semitic templatic
  pair; the Han/Kana character grain is the weakest.

### T4. Hapax and OOV tokens: known by their one company (L-D, the single-mention rule)

- **Claim.** A token seen once is known by its one company: for hapax tokens COMP-OCC
  carries information about role beyond POS and FREQ (S(COMP-OCC given FREQ+POS; H1) >
  SESOI), and about name-ness in particular. This is the claim of reading R1 and
  the user's standing rule: a name can appear once and be a name.
- **Data.** G1, G2, G3. Strata on TEST (all computed from exposure and stream
  counts only): **H0** first sight (n = 0 in Q at read time, causal-novel);
  **H1** true hapax (type absent from train and occurring exactly once in the
  TEST stream); **H2** the rest (control stratum). The shipped being-tier admits
  nothing at H1 (floor 2): reported as an admission gap of the reader (denominator
  = |H1|), not as a verdict on the law.
- **Features.** COMP-OCC (the one occurrence's window within h*; type company is
  that same occurrence), FORM-MORPH, POS, FREQ (constant here), COMP-OCC+FORM-MORPH.
- **Statistics.** G within H1; name-ness AUROC (PROPN versus other among H1) of
  COMP-OCC, of FORM-MORPH, of POS; for caseless scripts (cmn-hans, jpn, kor, arb, heb, fas, urd, hin)
  the capitalisation feature is unavailable and COMP-OCC is the only evidence. Stratum
  membership is defined from whole-stream counts because it selects which tokens are
  evaluated, not which features a model sees; no feature uses it.
- **Null.** Label permutation within H1; the within-sentence shuffle of the TEST
  stream.
- **Control built to fail.** Planted HMM-SHARED with OOV rate 0.15 where OOV forms
  are random strings (FORM-MORPH uninformative, COMP-OCC informative) and a planted
  variant with OOV forms suffix-marked (FORM-MORPH informative).
- **Power check.** G0 with OOV planted.
- **Alternatives.** Form-morph, position, frequency, majority.
- **Held-out rule.** Per language TEST (W) and per family (X).
- **Outcome table.**

| observed | verdict |
|---|---|
| S(COMP-OCC given FREQ+POS; H1) > SESOI AND AUROC(name-ness; COMP-OCC) lower CI > 0.5 + SESOI in all evaluable units but at most k_N | HOLDS (R1) |
| holds but S(FORM-MORPH given COMP-OCC; H1) > SESOI and S(FORM-MORPH given COMP-OCC+SUBWORD; H1) <= SESOI | AMENDED(A1) |
| S(COMP-OCC given FREQ+POS; H1) <= SESOI (equivalence, n >= n_min) in more than k_N units or in two units of a family, with the gate passed | FALSIFIED(those units): one mention is not enough company to know the token |
| H1 stratum smaller than n_min in a unit | UNDERPOWERED(n) for that unit (Appendix B: at least 500 H1 tokens per language) |
| gate failed | UNDERPOWERED |

- **Prediction (recorded, not a result).** COMP-OCC beats POS and FREQ at H1 in at
  least 9 of 10 families; FORM-MORPH beats COMP-OCC at H1 in the agglutinative stratum.
  The reader admission gap at H1 is 100 percent by construction (floor 2).

### T5. IMPACT: slot ablation, impact types, and sufficiency against matched company (L-M)

- **Claim.** The typed slot-delta signatures cluster by gold role (T5a); the type of
  impact predicts role about as well as the **matched-visibility** window does
  (T5b); and the impact type is a **sufficient statistic of that window** for
  role (T5c), which is the testable content of C2 (1.2). Impact and company
  are compared at **equal visibility and equal causality**: the impact
  perturbation window is [s - M*, s + F*], so its comparator is COMP-W over the
  same frames, not the few-token prefix COMP-OCC (revision 1 compared an impact
  that saw up to 32 following sentences and whole documents with a company that
  saw a few left tokens, which broke rule 5 and made any S(IMPACT given COMP) > 0
  indistinguishable from "a wider window", which is exactly the widening beyond
  the bound that C3 says changes nothing).
- **Data.** G1 (and G2, G3 reported); the T5 token samples of 2.5.6 (N_imp = 2,000 per
  language per split, plus hapax oversample); both protocols, with **dense**
  features for every arm so capacity is equal; impact arms PCA-24.
- **Arms.** IMPACT-SLOT-TYPE, IMPACT-SLOT, IMPACT-SLOT+ATM (per reader: R-A only
  [ATM], R-B only, R-C only, all), IMPACT-SPAN and IMPACT-SPAN-TYPE (the rival,
  reported here and decided in T10), IMPACT-C (diagnostic), SLOT-ROLE (labelled
  contaminated, no verdict), **COMP-W** (non-causal matched comparator),
  **COMP-W-C** (frame-causal comparator), COMP-OCC (the prefix arm, reported only
  to show how much of the gap is window size), COMP-W+IMPACT-SLOT. Ablation: A-DEL
  primary; A-MASK and A-FILL secondary (U4).
- **Causality.** The **frame-causal variant** (F* = 0: the self frame and the
  preceding frames; the signature is hash-identical when every later sentence
  is replaced) is the only impact arm that may enter a claim about reading, and it
  is compared with COMP-W-C. The forward-looking variant (F* > 0, the full
  window) is **non-causal by definition** and is compared with non-causal
  COMP-W only; it is reported labelled.
- **Statistics.**
  - T5a: NMI and ARI between the language's own impact types (null type
    included) and UPOS14; versus (i) label permutation (B = 1,000), (ii) the
    **company-shuffle null**: re-run the whole ablation pipeline on
    within-sentence-shuffled TEST text (B = 10 shuffles) with the same gold
    carried by tokens.
  - T5b: G(IMPACT-SLOT-TYPE) and G(IMPACT-SLOT) against G(COMP-W) (or COMP-W-C for
    the reading variant): the law as phrased says impact **determines** role, so
    G(IMPACT-SLOT-TYPE) >= G(COMP-W) - SESOI is required.
  - T5c (**sufficiency**, the primary C2 statistic): S(COMP-W given IMPACT-SLOT) with the
    conditional permutation null (window features permuted within impact bins),
    and S(IMPACT-SLOT given COMP-W) likewise. Four cases:
    (**S**) sufficient: S(COMP-W given IMPACT-SLOT) <= SESOI **and** G(IMPACT-SLOT-TYPE)
    >= G(COMP-W) - SESOI: the window's information about role passes through the
    impact type (the strong L-M); (**L**) lossy: S(COMP-W given IMPACT-SLOT) > SESOI:
    the window carries role information that the impact signature discards, so
    impact informs but does not determine; (**C**) compression advantage:
    S(IMPACT-SLOT given COMP-W) > SESOI: by the data-processing inequality (1.2) this
    cannot be independent information, it is a sample-efficiency effect and is
    tested as such by the sweep N in {5k, 10k, 20k, 40k, full}: if it vanishes
    with N it is labelled compression; if it persists at full train it is
    reported UNDERPOWERED(learner), because an ideal learner cannot show it;
    (**N**) neither: G(IMPACT-SLOT-TYPE) <= SESOI.
    The revision-1 case (I) "independent information" is reworded as case (C):
    with unmatched visibility it could arise only from impact seeing a wider
    window than company, and with matched visibility it is a logical
    impossibility as independent information, so a positive S(IMPACT given
    COMP-W) is read only as compression.
  - Null-impact audit: the share of tokens with the null type by UPOS class and the
    share with `no-slot`. An **instrument deafness** finding: a class with
    null-impact share >= 0.95 in all languages while T1 shows company determines it
    (G(COMP-OCC) high for that class).
- **Null.** As listed; label permutation; company-shuffle; conditional permutation.
- **Control built to fail.** Sham ablation (null type 100 percent); the
  offset-invariance control (2.5.5); planted IMPACT-PLANT (figures N recurring,
  connectors V between two N, filler F never in a relation, unique U): ablating N
  must change ref-entries, V must change rel-label and rel-end slots, F nothing,
  U only `no-slot` and the atmosphere; planted IMPACT-SUFF and IMPACT-LOSSY (G0
  cell 8); planted LONGRANGE (role depends only on the effect on later sentences:
  COMP-W-C and COMP-OCC fail, non-causal COMP-W and the forward impact succeed);
  planted IMPACT-NULL (roles assigned at random, independent of structure): NMI
  must be at the null; a role-blind reader (constant) gives NMI 0.
- **Power check.** The instrument must detect the planted impact types (NMI above the
  company-shuffle null in at least 95 percent of draws), classify IMPACT-SUFF as
  (S) and IMPACT-LOSSY as (L) in at least 95 percent, and reject the random
  assignment (NMI inside the null in at least 95 percent). If not, the readers are
  deaf to the planted structure: UNDERPOWERED(reader).
- **Alternatives.** IMPACT-C (company-structure impact), IMPACT-SPAN (the
  span-based rival), COMP-W, COMP-OCC, POS, FREQ, a constant reader.
- **Held-out rule.** W: TEST sample of the language; X: P1 folds with impact types fitted
  on the training families and assigned by nearest centroid.
- **Outcome table.**

| observed | verdict |
|---|---|
| T5a NMI above both nulls in all evaluable units but k_N; case (S) on the frame-causal arm in the open classes {NOUN, PROPN, VERB} | HOLDS (L-M, reading R4) |
| T5a above null, case (L) (S(COMP-W given IMPACT-SLOT) > SESOI) in more than k_N units | FALSIFIED(as phrased: "determined by impact"): impact informs but is a lossy summary of the window |
| case (L) or (N) confined to roles with null-impact share >= 0.95 (the closed classes), open classes (S) | AMENDED(A6): impact determines role for the classes the holograph hears; closed classes need a finer reader |
| T5a at the null in a unit with the gate passed, more than k_N units | FALSIFIED(L-M as instantiated in those units) |
| IMPACT-C works and IMPACT-SLOT fails | FALSIFIED(L-M for khora's readers) but not for a reader that hears the structure; reported as instrument-specific |
| case (C) only | HOLDS only as compression: reported with the sweep; no independent information |
| gate failed (reader deaf to planted structure) | UNDERPOWERED(reader) |

- **Prediction (recorded, not a result).** Closed-class UPOS (DET, ADP, CCONJ, SCONJ,
  PART, AUX) have null-impact share >= 0.9 in R-A and R-B (idf-gated trace,
  positional kinds), so G(IMPACT-SLOT-TYPE) << G(COMP-W) there: case (L) with A6;
  for open classes (NOUN, PROPN, VERB) the typed deltas are expected to be
  informative and case (S) or (L) is open (prior for (S) 0.2). Forward impact
  beats frame-causal impact only if a long-range effect exists, which the
  planted LONGRANGE shows the instrument can detect.

### T6. BOUND: gold-free horizon against gold plateau, data limitation, and interventional scrambling (L-B)

- **Claim.** Role-prediction accuracy plateaus at the depth measured **without
  gold**, the same depth bounds the impact in the same unit, the measured depth
  is not an artifact of sparse data, and scrambling beyond the horizon does not
  change the whole-sentence model. Revision 1 measured the horizon as the depth
  where gold-trained models agree with their full-context selves and then asked
  whether gold accuracy plateaus there: argmax agreement with the full model at
  depth h strongly implies an accuracy plateau at h for models trained on the
  same labels, so T6a and T6b were one measurement made twice. The transfer is
  now measured against a horizon that never saw gold.
- **Data.** G1, W and X (the dense X features at each rung h masked beyond h).
- **Features.** COMP-OCC at each rung h in H = {1, 2, 4, 8, 16, whole sentence}, causal
  and non-causal; the horizons h*_an, h*_u, M*, F*, H_imp, w_imp of 2.6; the
  data-limitation sweep N in {5k, 10k, 20k, 40k, full}.
- **Statistics.**
  - T6a (plateau; CORE): G(h) for h > h*_u minus G(h*_u); the plateau locus h_p = the
    shallowest rung whose G is within SESOI of G(whole). Law: G(whole) - G(h*_u) <=
    SESOI, no rung beyond h*_u adds more than SESOI per doubling. Gap types
    `data_limited`, `non_monotone`, `no_sweep_headroom`, `reach_exceeds_candidates`
    make the unit UNDERPOWERED or GAP, never PASS.
  - T6b (transfer to gold; R5-only): |log2 h_p - log2 h*_u| <= 1 (one rung), per
    language, reported per typology. h*_an versus h*_u agreement is reported, not
    a pass rule.
  - T6c (interventional, on M_whole; CORE): beyond-scramble leaves M_whole's
    argmax agreement >= 1 - u_l; within-scramble drops it below 1 - u_l. Tokens
    without h*_u + k tokens beyond the near region are excluded and counted.
    The same scramble on M_{h*_u} is invariant by construction and excluded.
  - T6d (one bound in one unit; R5-only): |log2 H_imp - log2 h*_u| <= 1 (both in
    tokens), and the discrete impact type is insensitive to M* truncation. F* in
    frames (rung 0 included) is reported beside it.
  - T6e (cross-sentence; auxiliary): where the treebank has document order (at least 100
    `# newdoc` markers in train and at least 2 sentences per document on average,
    appendix B), the sentence ladder {0,1,2,4,8} preceding sentences is tested;
    elsewhere it is `UNTESTED(no document order)`.
- **Null.** Bootstrap CI of G differences; label permutation; the within-sentence
  shuffle (collapses G at every rung).
- **Control built to fail.** Planted CO-TAB(h) with h in {1,2,3,4,6,8}: measured h*_u
  must be the smallest ladder rung >= h in at least 90 percent of draws; planted
  UNBOUNDED (role = parity of the whole prefix): the instrument must return the
  typed gap `reach_exceeds_candidates`; planted CO-TAB(6) at one quarter of the
  exposure: the instrument must return `data_limited` (h* rises with N), not
  h* = 1; planted CO with the role depending only on the near region and random
  tokens beyond (beyond-scramble must not change M_whole's predictions,
  within-scramble must); a planted generator whose impact horizon equals h* by
  construction must pass T6d (on the revision-1 sentence-to-token conversion it
  would fail, which shows the conversion defect and why the unit was changed).
- **Power check.** The planted cases above.
- **Alternatives.** Accuracy keeps rising past h*; plateau at a different rung;
  long-range dependence (verb-final, agreement, German subordinate clauses);
  data limitation rather than a bound.
- **Held-out rule.** h*_an and h*_u measured on DEV; plateau, transfer and scramble
  on TEST.
- **Outcome table.** (Units are languages; proportions are not typed: the pass is
  "all evaluable units but at most k_N", with k_N derived from the planted
  instrument's own detection rate, 2.10; the 70 percent and one-quarter rules of
  revision 1 are removed because a bound that transfers in 70 percent of
  languages is not universal.)

| observed | verdict |
|---|---|
| T6a and T6c pass in all evaluable units but k_N | HOLDS (R3 row) |
| T6b and T6d also pass in all but k_N | HOLDS (R5 rows) |
| h*_u is stable but gold accuracy plateaus later (T6b fails) in more than k_N units | FALSIFIED(transfer): the bound does not bound the role |
| accuracy rises by > SESOI per doubling for two consecutive rungs beyond h*_u in more than k_N units | FALSIFIED(bound): the cut under-estimates the relevant company (unless `data_limited`, then UNDERPOWERED(data)) |
| beyond-scramble changes M_whole's predictions by more than u_l in more than k_N units | FALSIFIED(interventional bound) |
| `reach_exceeds_candidates` in more than k_N units | FALSIFIED(bounded reach) or UNDERPOWERED if the planted unbounded case is not detected |
| bound holds for company but H_imp is two or more rungs from h*_u in more than k_N units | AMENDED(A11): two bounds, not one (company and impact horizons differ); the sentence's single "bounded by" fails literally |
| h*_u rises with N (`data_limited`) in more than k_N units | AMENDED(A9): the bound is exposure-relative (it grows with the exposure), not a property of the material |
| gate failed | UNDERPOWERED |

- **Prediction (recorded, not a result).** h*_u is 1 to 4 in analytic languages and larger
  in verb-final and inflected-free-order languages; `data_limited` appears in at
  least 5 of 41 languages at N_cap; T6b passes in a majority of languages and
  fails in some (so at the tolerance it is at risk); the interventional
  beyond-scramble passes more often than the accuracy plateau agrees with h*_u.

### T7. Universality across grains and systems (U2, U3)

- **Claim.** The company law (T1 and T2 forms) holds at every grain and in code; the
  same company features serve all grains without grain-specific engineering.
- **Data.** G1, G2, G3, G4 for all languages; G5 and G6 for code (TEST repositories only;
  families of 3.4; leave-one-code-family-out); notation: `UNTESTED(no gold yet)` unless
  the section 3.4 contract is met.
- **Features.** The arms of 2.7, unchanged across grains (one feature set, five label
  sets; this is a test of the claim of generality, not a place to tune).
- **Statistic.** For each grain: D1 = S(COMP-OCC given FREQ+POS) and the T2 screening statistics (S(FORM given COMP-OCC) at f = 1 and the convergence curve over f) as in T1 and T2. Class of claim: G2 and G3 (text) are CORE for R2; G5 and G6 (code) are R5-only; G4 (DEPREL) and notation are auxiliary. For code
  additionally per class: the lexically delimited classes (operator, punctuation,
  comment, string) reported apart; screening of form given company per class.
- **Null.** Label permutation; the shuffle of tokens within a file (code) or sentence
  (text).
- **Control built to fail.** Per-grain planted analogues are the G0 generators with the
  grain's label set; for code the within-file shuffle.
- **Power check.** G0 per grain; for code a planted token-class language with
  keywords as a closed list (form-determined) and identifiers by company.
- **Alternatives.** FORM (reserved words, delimiters are lexical), POSITION, FREQ.
- **Held-out rule.** Text: as T1. Code: split by repository (manifest) and leave one code
  family out.
- **Outcome table.**

| observed | verdict |
|---|---|
| T1(i) and the T2 screening statistics pass at G1, G2, G3 (text; CORE for R2) | HOLDS (U2) |
| the same pass in code at G5 and G6 (leave-one-code-family-out; R5 row) | HOLDS (U3) |
| passes at G1 to G3 but G4 (DEPREL) fails to beat FREQ+POS (auxiliary grain) | AMENDED(A12): company determines token class and kind, not relational role |
| code: S(FORM given COMP-OCC) > SESOI for lexically delimited classes and keywords in more than k_N code families while identifiers pass | FALSIFIED(code lexical classes): form determines them, company does not |
| any grain or system with D1 <= SESOI (equivalence, n >= n_min) in more than k_N of its units or in two units of a family | FALSIFIED(that grain or system) |
| notation absent | UNTESTED(no gold yet) for those systems, with denominator |
| gate failed | UNDERPOWERED |

- **Prediction (recorded, not a result).** G2 and G3 pass; G4 weakest (relation needs a
  head, often beyond h*); code keywords, operators, punctuation and numeric literals
  are form-determined, identifiers and types are company-determined; declared
  names are recovered by company at the single-mention grain (a declaration is the
  first admission).

### T8. Homographs and polysemy: same form, different roles (L-D, Wittgenstein)

- **Claim.** Company separates the roles of a homograph where form alone cannot.
- **Data.** Forms with at least two UPOS classes each with at least 20 tokens in the
  pooled train+test of the language (the census shows 5 (hun) to 200 (cat) such forms
  per language; fewer than 5 forms is a typed gap).
- **Features.** FORM-prior (per-form majority from training), COMP-OCC (centre masked),
  COMP-OCC+FORM, POS.
- **Statistics.** T8a: homograph lift L_H = macro-accuracy over the form's roles of
  COMP-OCC+FORM minus FORM-prior, on tokens of homograph forms (minority-role
  occurrences are the hard cases and are reported separately). T8b: the
  **company-collision rate** at h*: the share of homograph tokens that share an
  identical company tuple with a token of the same form and a different role in the
  pooled corpus (a counterexample to determination by company at that horizon), with
  coverage.
- **Null.** The **swap null** (the repo's `testimony` sibling-swap analogue): permute
  the company vectors among occurrences of the same form (form marginals kept,
  company-role alignment destroyed), B = 1,000.
- **Control built to fail.** Planted HOM: 30 forms emitted by two roles, in one
  variant disambiguated by left-neighbour class, in another assigned independently of
  company: COMP-OCC must lift the first and not the second.
- **Power check.** G0 with HOM.
- **Alternatives.** Form majority, position, frequency.
- **Held-out rule.** TEST sentences; X not applicable (identity needed).
- **Outcome table.**

| observed | verdict |
|---|---|
| L_H lower CI > SESOI and above the swap null in all languages with support but k_N; collision rate at h* below epsilon_B (the planted exact-determination ceiling) | HOLDS (auxiliary) |
| L_H > SESOI but collision rate at h* above epsilon_B | AMENDED(A4): company disambiguates probabilistically; it does not determine |
| L_H <= SESOI (equivalence) in more than k_N languages with at least 5 homograph forms, or in two languages of a family, gate passed | FALSIFIED(those languages) |
| fewer than 5 forms | UNTESTED(no homograph support), counted |

- **Prediction (recorded, not a result).** L_H > 0 broadly; collisions are not rare at the
  native horizon 1 (the repo's own company), shrinking as h grows with coverage.

### T9. Order sensitivity: destroy company, keep form (L-D, L-M)

- **Claim.** Within-sentence shuffling destroys company but not form, so the company arm
  collapses and the form arm does not.
- **Data.** G1 (and G2); W.
- **Features.** COMP-OCC (ordered), BAG (order-free), FORM, FREQ, POS.
- **Variants.** (a) train real, test shuffled; (b) train and exposure and test all
  shuffled (company destroyed everywhere).
- **Statistic.** Collapse kappa = (G(COMP-OCC; real) - G(COMP-OCC; shuffled)) / G(COMP-OCC; real);
  form invariance |G(FORM; real) - G(FORM; shuffled)|; BAG retention. T9b: the T5a NMI of
  impact under the same shuffle (company-shuffle null already built for T5).
- **Null.** kappa below its planted lower bound.
- **Control built to fail.** Planted CO: kappa near 1 (positive); planted BAG-company
  (role depends on the multiset of neighbour classes in the sentence): kappa near 0
  (negative, the instrument must not report collapse); FO planted: form invariant exactly.
- **Power check.** kappa_lo = 5th percentile of kappa over planted CO draws; the planted
  BAG draw must give kappa <= SESOI-equivalent.
- **Alternatives.** Company is a bag (A2); position carries it.
- **Held-out rule.** TEST; shuffle seeds from sha256 of (`khora-law-v2`, stem, "shuffle").
- **Outcome table.**

| observed | verdict |
|---|---|
| kappa >= kappa_lo, FORM invariant within SESOI (it is exactly invariant at identity level), BAG not collapsed, in all but k_N languages | HOLDS (ordered company, as phrased; auxiliary) |
| kappa < kappa_lo in a language while BAG retains G | AMENDED(A2): company is co-occurrence in the sentence, not adjacency |
| COMP-OCC does not collapse and BAG does not either (G unchanged under shuffle) in more than k_N languages | FALSIFIED(those languages): the information was not in company at all (form or position carried it); this row now fires only if COMP-OCC, which holds no type vector, fails to collapse (revision 1's COMP kept the type vector and would have failed to collapse for seen tokens, a spurious falsification) |
| gate failed | UNDERPOWERED |

- **Prediction (recorded, not a result).** kappa >= 0.7 in analytic languages (eng, vie,
  ind, cmn-hans) and clearly smaller in free-order and agglutinative languages where BAG
  retains most of G.

### T10. Slot-based versus span-based impact: which predicts role better (L-M, R1)

- **Claim.** The user's premise (R1: "look at the slot not the spans"): impact
  measured on slots predicts role better than impact measured on spans and
  strings, because spans are a nuisance coordinate. Tested as a contest, so it
  can fail in either direction.
- **Data.** G1 (G2, G3 reported); the T5 token samples (2.5.6), the same
  ablations (A-DEL primary) read two ways from the same X0 and X1; W and X.
- **Arms.** IMPACT-SLOT and IMPACT-SPAN (PCA-24 each, equal dimension),
  IMPACT-SLOT-TYPE and IMPACT-SPAN-TYPE (derived one-hots), the same learner family,
  the same lambda grid, the same tokens, the same tuning budget; both in the
  frame-causal (F* = 0) and the forward (F* > 0, non-causal, labelled) variants;
  IMPACT-SLOT+ATM and SLOT-ROLE (contaminated) reported beside.
- **Statistics.** D10 = G(IMPACT-SLOT) - G(IMPACT-SPAN) and the same on the types
  (NMI against UPOS14); the complementarity statistics S(IMPACT-SLOT given IMPACT-SPAN)
  and S(IMPACT-SPAN given IMPACT-SLOT); per UPOS class (open versus closed);
  hierarchical bootstrap; conditional permutation for S.
- **Null.** Label permutation; the company-shuffle pipeline null (as T5a).
- **Control built to fail (symmetric, so the instrument can say either).**
  Planted SLOT-ONLY (role determined by a slot effect with unchanged edge
  strings: a rebound or a shift) must favour IMPACT-SLOT and leave IMPACT-SPAN at
  <= epsilon_noise; planted SPAN-ONLY (role determined by a string-level effect
  with no slot consequence, including an offsets-only variant) must favour
  IMPACT-SPAN and leave IMPACT-SLOT at <= epsilon_noise. If the instrument cannot
  detect both, T10 is UNDERPOWERED(instrument), not "no difference".
- **Power check.** G0 cell 9, including the equal-dimension (PCA-24) condition.
- **Alternatives.** The span rival, the company window COMP-W, IMPACT-C, POS, FREQ.
- **Held-out rule.** As T5 (W: TEST sample; X: P1 folds with types fitted on the
  training families).
- **Outcome table.**

| observed | verdict |
|---|---|
| D10 > SESOI in all evaluable units but k_N (W) and in all folds but k_N(10) (X); planted both-directions gate passed | HOLDS (slot beats span; R4 row) |
| abs(D10) equivalent to 0 (both one-sided bounds inside +-SESOI, n >= n_min) in more than k_N units | FALSIFIED(premise of R1): on this instrument slot and span impacts predict role equally; the slot operationalisation adds nothing the string one lacks |
| D10 neither superior nor equivalent in more than k_N units | UNRESOLVED(counts) |
| D10 < -SESOI (span better) in more than k_N units | FALSIFIED(premise of R1): span-based impact predicts role better |
| both arms <= SESOI | FALSIFIED(L-M as instantiated) with T5, or UNDERPOWERED(reader) if the planted structures are not heard |
| complementarity: S(IMPACT-SPAN given IMPACT-SLOT) > SESOI in more than k_N units while D10 > SESOI | AMENDED(A13): slot impact is better but not sufficient; span information remains |
| gate failed (one direction of the symmetric plant not detected) | UNDERPOWERED |

- **Prediction (recorded, not a result).** The slot arm and the span arm share most
  information (the same readers, the same ablation); D10 is small and positive in
  open classes, zero for closed classes (both null), and D10 > SESOI in at most
  half of the languages (prior for HOLDS 0.3).

### T11. Identity as a fold: survival under substitution against string and company identity (L-I, R2)

Class of claim: T11a and T11c are R5-only, T11b is auxiliary (1.9). Runs only if
the coreference gold of 3.5 exists at run time; otherwise `UNTESTED(no coref
gold yet)`, with the planted FOLD-PLANT gates (G0 cell 10) still on record.

- **Claim (T11a).** The fold criterion (2.5.7: two spans are the same referent
  iff the typed slot deltas of substituting one into the other's slot, within the
  measured slot horizon w from the perspective p, are the null type) (i) **links**
  the mentions of one being across mention types (name -> pronoun -> descriptor)
  and (ii) **separates** two different beings that share a string (homonyms) and
  (iii) two different beings that share a company, and does so better than
  string identity and company similarity.
- **Data.** G7: CorefUD (and GUM) chains, TEST = the CorefUD dev files (3.5). Pairs
  (A, B) of mentions, sampled with a seed from sha256 of (`khora-law-v2`, treebank,
  "pairs"), per document, equal numbers per stratum:
  positives P (same gold chain) stratified by mention-type pair (name-name,
  name-pronoun, name-descriptor, pronoun-descriptor, pronoun-pronoun; the type is
  the UPOS of the mention head, **used for stratification of the evaluation only,
  never as an input to any criterion**) and into P_same-string (same chain,
  identical string) and P_diff-string; negatives: **N1 homonym** (different
  chains, identical NFC-lowercased string), **N2 company-twin** (different chains,
  different strings, COMP-TYPE cosine in the top decile among the document's
  different-chain pairs), **N3 random** (different chains, same document).
  Mention spans are given by gold (disclosed, like the UD word boundaries). A
  mention that fills no slot is the typed gap `no_slot`.
- **Criteria (arms, equal treatment: same pairs, same learner family L1 and L2,
  same lambda grid, same held-out rule).**
  - STRING: identical NFC-lowercased string, plus normalised edit similarity;
  - COMP-SIM: cosine of the COMP-TYPE vectors of the heads at h*, plus the cosine of
    their COMP-OCC windows;
  - RECUR: both strings recur in the document;
  - STRING+COMP-SIM (learned combination);
  - **FOLD**: the 48-component substitution-delta vector Delta(A, B; p, w) and the
    mass M(A, B) of 2.5.7, and **FOLD+STRING**;
  - the pre-registered **binary FOLD-null** rule (SAME iff Delta = 0 exactly) for the
    recall and false-merge rates.
  Features are language independent (counts, masses, cosines, flags); no
  identity or label crosses a language boundary.
- **Held-out rule.** Whole language family held out among the families present
  (3.5: Indo-European, Uralic, Turkic, Koreanic, Afro-Asiatic; 5 folds, said so);
  w and the learner lambda are measured on the learner-train/lambda-dev
  documents (3.5), never on TEST.
- **Statistics.** AUROC and average precision per stratum; (i) AUROC(FOLD) on
  {P_name-pronoun, P_name-descriptor} against {N3}; (ii) AUROC on {P_same-string, N1}
  (STRING is at 0.5 by construction, so the statistic is whether FOLD separates
  what string cannot); (iii) AUROC on {P with COMP-SIM in the top decile, N2}
  (COMP-SIM near 0.5 by construction). Primary comparison:
  AUROC(FOLD or FOLD+STRING) - max(AUROC(STRING), AUROC(COMP-SIM),
  AUROC(STRING+COMP-SIM)) > SESOI_AUC on each of (i), (ii), (iii). Binary FOLD-null:
  recall per positive stratum and false-merge rate on N1, N2, N3.
- **Null.** Label permutation within strata; the within-document sentence shuffle
  (structure destroyed: AUROC of the structured links must fall to 0.5).
- **Control built to fail.** (1) Self-substitution A<-A gives the null type in 100
  percent of cases. (2) Planted FOLD-PLANT (appendix A): chains whose mentions vary in
  surface (a name, a recurring pronoun-class token, a descriptor) while the
  structure around each mention is the same (the fold must link them and STRING must
  not); homonym beings (the same string, different structure: STRING must merge
  and FOLD must separate); company-twins (different strings, the same local
  company, different downstream relations: COMP-SIM must merge, FOLD must
  separate); and **FOLD-BLIND** (chains marked by form only, structure random): FOLD
  must **not** beat STRING there (the instrument must reject planted structure of
  the rival form). (3) The structure-destroying shuffle above.
- **Power check (per sub-statistic).** G0 cell 10, run through **two instruments** on
  the same planted texts: (a) the **shipped prior-free reader** (the instrument whose
  verdict T11 reports), and (b) the planted **reference slot organ** (a planted-side
  binder that reads the planted chain structure; it is the criterion's ceiling, used only
  to show that the substitution logic and the pair pipeline can detect planted identity
  and reject planted non-identity). Each of (i), (ii), (iii) and the FOLD-BLIND rejection
  has its own planted cell; a sub-statistic whose planted cell is not recovered by the
  shipped reader in at least 95 percent of draws is UNDERPOWERED(reader) and is
  reported as such (never as a failure of the criterion), with the reference-organ result
  beside it. This is where the string-indexed referent index of the shipped reader is
  expected to bite for pronoun and descriptor links.
- **Alternatives.** String identity, company similarity, recurrence, their
  learned combination, the binary FOLD-null rule.
- **Outcome table.**

| observed | verdict |
|---|---|
| (i), (ii), (iii) all pass the primary comparison in all folds but k_N(5) | HOLDS (L-I: identity is the fold) |
| (ii) and (iii) pass, and (i) either fails (AUROC(FOLD) within SESOI of 0.5 on name-pronoun and name-descriptor) or is UNDERPOWERED(reader) because the planted name-pronoun cell is not heard, the reference-organ ceiling for (i) passing | AMENDED(A10): the criterion separates but the string-indexed reader cannot bind pronouns and descriptors; the identity fold holds only for beings whose mentions the slot organ can bind; instrument-specific, not a refutation of the criterion |
| FOLD is beaten by the best rival by more than SESOI on the union of positives and negatives in more than k_N folds | FALSIFIED(criterion): fold survival is a worse identity criterion than string or company |
| AUROC(FOLD) - AUROC(STRING) equivalent to 0 (both bounds inside +-SESOI, n >= n_min) on (i), (ii) and (iii) alike in more than k_N folds | FALSIFIED(criterion adds nothing beyond string) |
| none of the rows above fires | UNRESOLVED(counts) |
| no coref gold at run time | UNTESTED(no coref gold yet), denominator 0 |
| gate failed (planted separations not recovered) | UNDERPOWERED |

- **Perspective dependence (T11b, auxiliary).** Claim: the same two spans may be
  one referent from p and two from p'. Data: pairs in documents whose corpus
  declares holders (speaker or narrator tags) for which the gold chains depend on
  the holder (for instance first-person pronouns in different speakers' turns, quoted
  versus narrated mentions); p in {holder(A), holder(B), READER}, visibility
  restricted by `accessibleHolders(p, accessibility)` (the accessibility map is the
  corpus-declared holder structure, caller-declared as the repo does). Statistic:
  AUROC(p-indexed fold) - AUROC(READER-only fold) > SESOI on those pairs. Control
  built to fail: the planted perspective generator of appendix A (the same two
  spans linked from one holder and not from another). Outcome: HOLDS when the
  p-indexed fold beats the perspective-blind fold in all folds with holder gold but
  k_N; FALSIFIED(perspective dependence on this instrument) when equivalent
  (n >= n_min); `UNTESTED(no holder gold)` for a corpus that declares none (never
  inferred from text, never read as support).
- **Single mention (T11c, R5-only; the user's standing rule).** Claim: a being
  mentioned once has a fold, and the existence of a fold recovers it where
  recurrence cannot. Data: gold singleton mentions (chains of size one) in the
  treebanks that annotate them, and as negatives the head tokens in the same
  documents with UPOS in {NOUN, PROPN, PRON} that head no gold mention. Statistic:
  AUROC for "is a mention" of the fold-existence score (the mass of the typed
  slot deltas of ablating the head, 2.5.3, non-null within w) against RECUR (the
  string recurs: **by construction at chance on the hapax stratum**), CAPS
  (capitalisation), COMP-kind (company-based name-ness), IMPACT-SPAN. Pass: AUROC(fold
  existence; hapax stratum) > 0.5 + SESOI and above the best rival by SESOI. Control
  built to fail: planted singleton beings with distinct slot structure versus
  non-referring fillers (G0 cell 10). Outcome: HOLDS in all but k_N folds; FALSIFIED
  when equivalent to 0.5 on the hapax stratum with n >= n_min (the one-mention being
  is invisible to its fold); `UNTESTED(no singleton gold)` otherwise.
- **Prediction (recorded, not a result).** Through the prior-free string-indexed
  reader, FOLD separates homonyms and company twins (ii, iii) in structured
  genres and is deaf to name-pronoun and name-descriptor links (i), so the
  expected verdict is AMENDED(A10) (prior 0.5), HOLDS 0.1, FALSIFIED(criterion)
  0.2, the remaining 0.2 UNRESOLVED or UNDERPOWERED; fold existence recovers hapax beings that recurrence cannot only where the
  slot organ binds them (R-C needs a recurring figure: minRec = 2 by default, so
  hapax beings are an instrument gap for R-C and the R-B1 floor-1 variant is
  the one that can hear them).

---

## 6. Combining verdicts

### 6.1 The scorecard

The report is a table (claim x unit) of verdicts with denominators (units evaluated
of units in scope, tokens evaluated, languages in typed gaps by reason), never a
single bit. The law's rungs (1.6) and readings (1.8) are scored from it:

- U0: T1(i) (W), T1b, T2, T3, T4, T8, T9 in the 41 languages (with the tolerance
  of 2.10).
- U1: T1(i) (X) and T3(X), T4(X) in the 10 folds.
- U2: T7 text grains.
- U3: T7 code (and notation if gold appears).
- U4: agreement across L1/L2, causal/non-causal, readers, D/D' capacity,
  ablation modes.
- L-M: T5, T10. L-B: T6. L-I: T11.
- The readings R0 to R5 of 1.8 with their required claims.

### 6.2 The amendment registry (stated in advance)

| id | amendment | test statistic that must pass |
|---|---|---|
| A1 | company includes sub-word company (affix companies) | S(FORM-MORPH given COMP-OCC+SUBWORD) <= SESOI where S(FORM-MORPH given COMP-OCC) > SESOI (T3, T4) |
| A2 | company is co-occurrence in the sentence (bag), not adjacency | kappa small and BAG retains G (T9) |
| A3 | company must be sampled; identity is a lexical cache of accumulated company | S(FORM given COMP-TYPE-D; f) <= SESOI at f_conv <= f_sat(FORM-LEX), within class (T2) |
| A4 | role is constrained by company, not determined (stochastic) | D(h*) significantly > 0 but < D_planted,lo (T1b, T8) |
| A5 | role is determined by company through a language-specific mapping; no universal function | W passes everywhere, X fails (T1) |
| A6 | impact on the holograph determines role for the classes the holograph can hear; closed classes need a finer reader | deficit confined to null-impact classes (T5) |
| A7 | company determines role retrospectively (non-causal) only | frame-causal fails, non-causal passes (T1, T5) |
| A8 | company and position (sentence boundary) co-determine | S(POS given COMP-OCC) > SESOI, or S(COMP-SENT given COMP-OCC) > SESOI (T2) |
| A9 | the bound is exposure-relative: the measured horizon grows with the exposure | h*_u rises with N (`data_limited`) while the planted bounded generator does not (T6) |
| A10 | identity by fold-survival holds for beings whose mentions the slot organ can bind; pronouns and descriptors need a coreference-capable slot organ | (ii) and (iii) pass and (i) fails with the FOLD-PLANT gate passed (T11) |
| A11 | two bounds, not one: the company horizon and the impact horizon differ | H_imp two or more rungs from h*_u while T6a and T6c pass (T6) |
| A12 | company determines token class and kind, not relational role (clause role) | G1 to G3 pass, G4 does not beat FREQ+POS (T7) |
| A13 | slot-based impact is better than span-based impact but not sufficient | D10 > SESOI and S(IMPACT-SPAN given IMPACT-SLOT) > SESOI (T10) |

Revision 2 added A9 to A13 (and renamed the T6 two-bounds row A11); all thirteen are
fixed here, before any run.

### 6.3 What an amendment means

Any AMENDED verdict means the sentence **as phrased** is falsified: the
amended claim is a new hypothesis that has survived one test, and it is carried to a
v3 pre-registration on the late reserve and on the code and notation systems (data
the amendment was not found on). An amendment is never reported as "the law holds".
An amendment not in 6.2 proposed after the data is exploratory and carries no verdict.

### 6.4 The overall verdict function: the strongest surviving reading

`eval/law/verdict.mjs` implements the outcome tables and the claim verdict of 2.10(6)
as pure functions of result JSON, so the verdicts are fixed by code that is frozen
before the test run (the code hash of section 7). It then evaluates the ladder of 1.8:

1. Each reading R_k **survives** iff every claim it requires is HOLDS or
   HOLDS(exceptions) in its full scope; it **survives-as-amended(A#)** iff the only
   non-HOLDS claims are AMENDED; it is FALSIFIED(claims) if a required claim is
   FALSIFIED; UNRESOLVED if one is UNRESOLVED and none FALSIFIED; UNDERPOWERED if
   one is UNDERPOWERED and none FALSIFIED or UNRESOLVED; UNTESTED otherwise.
2. The **headline** is the highest k such that R0 to R_k all survive (nested), the
   lowest reading that did not survive with the claims and unit scope that killed
   it, and any non-nested survivor. Priors of 1.8 are scored for calibration.
3. The sentence **as phrased** is R5. It is reported **falsified as a fundamental
   law** iff a claim R5 requires is FALSIFIED or AMENDED (6.3), and **not falsified,
   scope = the units tested** only if R5 survives (every required claim HOLDS or
   HOLDS(exceptions)); otherwise it carries the status UNRESOLVED, UNDERPOWERED or
   UNTESTED. UNDERPOWERED and
   UNTESTED cells are listed with denominators and never counted as support.
4. Auxiliary claims (1.9) are listed with their own verdicts and never change the
   headline.

This replaces revision 1's rule (the sentence is falsified if ANY of ten claims is
anything other than HOLDS in every unit), under which the probability of a
"falsified" report was about one whatever the truth. Under the new rule the report
is a function of which readings survive, and **both HOLDS and FALSIFIED are
reachable**, which section 6.6 and gate G5 prove on planted universes.

### 6.5 What would have counted as failure (every claim)

For each claim, the pre-registered result that kills it and the result that lets it
stand. "k_N" is the derived tolerance of 2.10(6); "family replication" is two failing
members of one family.

| claim | class | survival | **failure (the kill)** |
|---|---|---|---|
| T1(i) occurrence company beyond FREQ+POS | CORE (R0, R2) | S(COMP-OCC given FREQ+POS) > SESOI in all but k_N units | S(COMP-OCC given FREQ+POS) <= SESOI (equivalence, n >= n_min) in more than k_N languages or in two of a family; in X: in more than k_N(10) folds |
| T1(ii) company at least as informative as form (unseen, hapax) | CORE (R3) | G(COMP-OCC) >= G(FORM) - SESOI on H0 and H1 | G(COMP-OCC) < G(FORM) - SESOI on H0 or H1 in more than k_N units |
| T1b determination | R5-only | D(h*) >= D_planted,lo | D(h*) upper CI < D_planted,lo (A4) or <= SESOI (falsified) |
| T2 screening and convergence | CORE (A3 form), R5-only (literal) | S(FORM given COMP-TYPE-D; f) reaches <= SESOI at f_conv <= f_sat; literal: S(FORM given COMP-OCC) <= SESOI at f = 1 | S(FORM given COMP-TYPE-D) > SESOI at f = 1 in at least 50 percent of families, or f_conv absent or > f_sat(FORM-LEX) |
| T3 strain | AUX | rho(Delta_FC, MR) not > 0 and Delta_FC(top tercile) <= SESOI | Delta_FC and S(FORM-MORPH given COMP-OCC+SUBWORD) > SESOI in a named stratum replicated in two of its languages |
| T4 hapax, one mention | CORE (R1) | S(COMP-OCC given FREQ+POS; H1) > SESOI and name-ness AUROC > 0.5 + SESOI | equivalence to no-information at H1 in more than k_N units or two of a family |
| T5 impact is a sufficient statistic of the matched window | CORE (R4) | case (S) on the frame-causal arm in the open classes | case (L): S(COMP-W given IMPACT-SLOT) > SESOI in more than k_N units; or T5a at the null |
| T6a plateau | CORE (R3) | G(whole) - G(h*_u) <= SESOI, no rung adds more than SESOI per doubling | accuracy rises beyond h*_u for two consecutive rungs in more than k_N units (and not data_limited) |
| T6b gold-free horizon transfers | R5-only | within one rung of h_p | more than one rung apart in more than k_N units |
| T6c interventional | CORE (R3) | beyond-scramble leaves M_whole within u_l; within-scramble changes it | beyond-scramble changes M_whole by more than u_l in more than k_N units |
| T6d one bound in one unit | R5-only | H_imp within one rung of h*_u | two or more rungs apart in more than k_N units (A11) |
| T7 grains and code | CORE (G2, G3), R5-only (code), AUX (G4) | T1(i) and T2 statistics pass at the grain | D1 <= SESOI in more than k_N units of the grain; code lexical classes form-determined (S(FORM given COMP-OCC) > SESOI) |
| T8 homographs | AUX | L_H > SESOI above the swap null | L_H <= SESOI in more than k_N languages with support |
| T9 order sensitivity | AUX | kappa >= kappa_lo, BAG not collapsed | COMP-OCC and BAG both fail to collapse (the information was not in company) |
| T10 slot beats span | CORE (R4) | D10 > SESOI | abs(D10) equivalent to 0, or D10 < -SESOI, in more than k_N units |
| T11a fold identity | R5-only | (i), (ii), (iii) beat the best rival by SESOI_AUC | FOLD beaten by the best rival, or equivalent to STRING, in more than k_N folds |
| T11b perspective | AUX | p-indexed fold beats p-blind | equivalent (n >= n_min) |
| T11c single mention | R5-only | AUROC(fold existence; hapax) > 0.5 + SESOI | equivalent to 0.5 (n >= n_min) |
| gates G0 to G5 | all | the planted cells pass | the claim is UNDERPOWERED, never "not falsified" |

### 6.6 Reachability of both verdicts (gate G5, and tests)

The verdict function is run on result vectors from the real pipeline on three
planted universes (appendix A): **LAW-TRUE** must return survives(R5); **LAW-FALSE**
must return FALSIFIED(R0 to R5 as the planted structure dictates); **LAW-CO-ONLY**
(company determines role, impact planted null) must return the nested R3 with R4
FALSIFIED(T5). If any is unreachable the run is UNDERPOWERED(verdict). In addition
`tests/law-verdict.test.js` runs `verdictFor` and `scorecard` over (a) all-planted-CO
result vectors, which must reach HOLDS for R0 to R3, (b) all-planted-FO vectors,
which must reach FALSIFIED(R0), and (c) a property test over a grid of result
vectors asserting that every vector maps to exactly one verdict.

---

## 7. Modules (new files only, nothing existing is edited)

Documents and tests: `docs/LAW-FALSIFICATION.md` (this file), `tests/law-*.test.js`.
Code under `eval/law/` (plain ESM, node 24, no dependencies beyond the repo and node
built-ins; the evaluation scripts that need numerical linear algebra for SVD or PCA
implement it in plain JavaScript or call python3 in the venv at
`/private/tmp/claude-501/venv`, never a global install). The repo's existing modules
are imported read-only; no existing file is modified. This revision specifies the
modules and tests; they are built in the next step against this document.

| file | role | exports |
|---|---|---|
| `corpus.mjs` | CoNLL-U loaders, units, stream, strata, families and partitions, typology covariates, code, notation and coreference adapters | `FROZEN_STEMS`, `FAMILY_OF`, `PARTITION_P1`, `PARTITION_P2`, `PARTITION_P3`, `CODE_FAMILIES`, `COREF_FAMILIES`, `UPOS14`, `CLOSED_UPOS`, `OPEN_UPOS`, `loadConllu(path)`, `languageSet({split})`, `streamOf(sentences, {heard})`, `goldOf(sentences)`, `capSample(sentences, {nCap, seed})`, `exposureFractions(sentences, fractions, seed)` (nested subsamples), `exposureStrata(stream, exposure)` (H0/H1/H2 and n-bins, descriptive), `typologyCovariates(stem)`, `foldsFor(partition)`, `codeCorpus({split})`, `notationCorpus()` (typed gap unless the contract of 3.4 is met), `corefCorpus({split})` (typed gap `no coref gold yet` unless 3.5 is met), `seedFor(...parts)` (sha256-derived) |
| `company.mjs` | the five company arms, exposure, shuffles, collision statistics | `createExposure(unlabelledForms)`, `compOcc(stream, i, {h, causal, exposure, seed})` (boundary-blind padding, no centre, no sentinel), `compSent(...)`, `compType(exposure, identity, {h})` (sparse), `compTypeD(exposure, identity, induction, {h})`, `compW(stream, i, {M, F})`, `compWC(stream, i, {M})`, `bagCompany(stream, i)`, `compNative(sentences)` (must equal `createCompanyIndex().vectors`), `shuffleWithinSentence(stream, seed)`, `scrambleBeyond(stream, i, h, seed)`, `scrambleWithin(stream, i, h, seed)`, `collisionBayes(items, {h})` (B, B_null, D, coverage), `swapCentre(stream, i, identity)` |
| `induce.mjs` | unsupervised classes, K*, descriptors, form classes | `induceClasses(forms, {seed})` (K* by stability vs shuffle null), `descriptorsOf(exposure, induction)`, `classOfOccurrence(...)`, `stabilityLadder(...)`, `induceFormClasses(forms, {seed})` (FORM-IND) |
| `form.mjs` | form arms | `formDense(token, exposure, formInduction)` (FORM-X plus FORM-IND), `formSparse(token)` (FORM-LEX, FORM-MORPH), `lexd(token, exposure)`, `subwordCompany(token, exposure, induction)`, `subwordSparse(...)`, `charGrainStream(stream)` |
| `position.mjs` | position and frequency arms | `positionDense(i, n, {causal})`, `positionSparse(...)`, `freqDense(token, exposure)`, `freqPos(...)` |
| `slots.mjs` | the slot organ, ablation, typed slot deltas, slot signature, span rival | `READERS` (R-A, R-B, R-B1, R-C wrappers, all `posPrior = null`), `slotStructure(reading)` (REL and REF slots, coordinates by (e, j, field), no offsets), `ablate(stream, i, {mode: "delete" or "mask" or "fill", M, F})`, `alignSlots(sl0, sl1)` (order-preserving alignment, emptied/born), `slotDeltas(sl0, sl1, {tokenSlot, w})` (the closed vocabulary of seven, with precedence), `slotSignature(deltas)` (85 components, `no-slot` flag), `atmosphere(x0, x1)` (R-A, 19), `spanSignature(x0, x1)` (32 components, string-keyed, offsets-moved), `shamAblation(stream, i)`, `impactTypes(signatures, {seed})` (null type plus derived K), `assignType(signature, vocabulary)`, `companyStructureImpact(...)` (IMPACT-C), `nullImpactShare(...)`, `slotRoleVariant(...)` (contaminated, labelled) |
| `fold.mjs` | identity as fold | `slotGraph(sl)`, `foldAt(sl, slot, {p, w, accessibility})`, `substitute(stream, A, B)` (X_{A<-B}), `substitutionDeltas(A, B, {p, w})` (48 components), `sameReferent(A, B, {p, w})` (null type rule), `foldMass(A, B, ...)`, `foldHorizon(devPairs, {ladder})` (calls `kernel/activation.js::dmdWindow` with a radius `restrict`), `perspectiveVisible(slots, p, accessibility)` (via `kernel/holder-scope.js::accessibleHolders`), `pairSamples(corpus, {seed})`, `foldExistence(head, ...)` (T11c), rival scores `stringScore`, `compSim`, `recur` |
| `window.mjs` | the bound | `HORIZON_LADDER`, `noiseFloor(modelsA, modelsB, dev)` (u_l), `dmdHorizonAnalytic(devTokens, {models, ladder, u})`, `dmdHorizonUnsup(devTokens, {predictor, ladder, u})` (gold-free), `persistence(tried)` (monotone check; typed gap `non_monotone`), `exposureSweep(...)` (typed gaps `data_limited`, `no_sweep_headroom`), `perTokenWindows(...)`, `impactWindows(sample, {...})` (M*, F* with rung 0), `impactHorizonTokens(sample, {ladder, u})` (H_imp), `beyondScrambleTest(model, ...)` (M_whole only; trivial-invariance helper for the test), `plateauLocus(curve, sesoi)` |
| `learner.mjs` | the common learner family and arm registry | `ARMS` (frozen arm registry with feature functions and protocols), `trainLR(X, y, {lambda})`, `trainMLP(X, y, {lambda, seed})`, `selectLambda(arm, learner, devSets)`, `crossEntropy(model, X, y)`, `infoGain(model, base, X, y)`, `hashFeatures(sparse, D)`, `groupNormalise(...)`, `pca(X, d)` |
| `stats.mjs` | inference | `sentenceBootstrap`, `hierarchicalBootstrap`, `labelPermutation`, `conditionalPermutation`, `blockedSpearman`, `shapley2`, `shapley3`, `nmi`, `ari`, `auroc`, `clopperPearsonLower`, `SESOINoise(pairs)`, `sesoiMap(calibrationPairs)` (isotonic phi), `sesoiFor(metric, u_l, ...)`, `superior(ci, sesoi)`, `equivalent(ci, sesoi, n, nMin)` (TOST), `nMin(...)`, `toleranceK(N, piLo)`, `claimVerdict(unitOutcomes, {kN, families, ...})` |
| `planted.mjs` | the planted languages of appendix A with oracle ceilings | `plantCOTab({h, side, seed})`, `plantCOAdd`, `plantCOPar` (UNBOUNDED only), `plantFOLex`, `plantFOMorph`, `plantFOIndep({delta})`, `plantPO`, `plantHMM({shared, seed})`, `plantMIX(pi)`, `plantHOM`, `plantAGGL({agreement})`, `plantCache`, `plantClassMix`, `plantLatent({q})`, `plantImpact({random})`, `plantImpactSuff`, `plantImpactLossy`, `plantLongRange`, `plantSlotOnly`, `plantSpanOnly`, `plantImpactHorizon({h})`, `plantFold({variant})` (chains, homonyms, twins, fold-blind, singletons, perspective), `plantBag`, `plantUnbounded`, `plantLawTrue`, `plantLawFalse`, `plantLawCoOnly`, `oracle(plant)` (G_oracle), `PLANTED_TRUTH` (the truth table of 4, G0) |
| `gates.mjs` | G0 to G5 | `gateG0(protocol)`, `gateG1`, `gateG2` (computes epsilon_noise, phi, n_min, pi_c, k_N), `gateG3`, `gateG4`, `gateG5`, `gatesPassFor(claimId)` |
| `verdict.mjs` | outcome tables, claim verdict, ladder as pure functions | `verdictFor(claimId, results, gates)`, `scorecard(results, gates)`, `readings(scorecard)` (R0 to R5, nested headline), `rungs(scorecard)` |
| `run.mjs` | CLI and guard | CLI only: `--split dev or test`, `--claims`, `--protocol`, `--partition`, `--freeze-code`, `--out`; the guard below |

**Guard in `run.mjs`.** On `--split test` it computes sha256 of
`docs/LAW-FALSIFICATION.md`, reads the first token of
`/private/tmp/claude-501/law/PREREGISTRATION.sha256`, and exits non-zero with a
message if the file is absent or the hex differs. It also requires
`/private/tmp/claude-501/law/CODE.sha256` (sha256 of the concatenation of
`eval/law/*.mjs` in sorted name order, written by `run.mjs --freeze-code` after
the dev runs and gates) to match the current code, and requires that gate G5
(verdict reachability) has passed in the archived dev run. `--split dev` runs
are allowed before the freeze of the code but never before the freeze of this
document. The output of every run is written to
`/private/tmp/claude-501/law/results/<run-id>/` with the design hash, the code
hash, the seeds, the denominators and every typed gap.

**Tests (`tests/law-*.test.js`; each is built to fail where the property must not
hold).**
- `law-corpus`: loaders, UPOS14, ranges and empty nodes skipped, PUNCT removed from
  the stream; exposure fractions are nested.
- `law-company`: COMP-NATIVE equals `createCompanyIndex().vectors`; **for every
  arm, the feature vector of a token is invariant when the centre identity is
  swapped for a random type with the same neighbours: the assertion must hold for
  COMP-OCC, COMP-SENT and COMP-W and must fail for COMP-TYPE, FORM, FREQ and
  LEXD** (so the test is built to fail on a leak); COMP-OCC contains no sentinel
  and no boundary indicator (the padding is boundary-blind: the distribution of
  features at i = 1 equals that at i = 5 given the same words).
- `law-causal`: G3 prefix invariance of the causal arms.
- `law-leakage`: feature vectors invariant to a gold permutation.
- `law-planted`: a fast version of G0 with the oracle ceiling: **for CO-TAB(h) and
  CO-ADD(h), h in {1, 2, 4}, G(COMP-OCC) >= 0.8 G_oracle; for the old modular-sum
  CO-PAR(2) this assertion fails (documented)**; **on a planted FO-LEX language
  (company i.i.d.), G(COMP-OCC) <= epsilon_noise** (this assertion fails under the
  revision-1 COMP definition, which demonstrates the leak); gate cells for the
  screening-off boundary (FO-INDEP 0, SESOI, 2 SESOI), the CACHE case (slope
  reaches zero under exposure subsampling, classified A3 and never
  FALSIFIED(form independent)), FO-LEX (plateau), CLASSMIX (no slope under
  subsampling), LATENT (A4), and G0 failing if the cache case is classified as
  form independent.
- `law-stats`: `claimVerdict`, `toleranceK` on known inputs
  (N = 41, 10, 6 with pi^lo = 0.985 give k = 3, 1, 1), Shapley, NMI/ARI on known
  inputs; **a planted FO-LEX at the SESOI boundary (form adds exactly SESOI bits)
  yields "not equivalent"; a planted language with form adding 0 bits yields
  equivalence only when n >= n_min and UNDERPOWERED below it**; `sesoiMap` is
  monotone.
- `law-window`: **a planted CO-TAB(8) at N = 2k is reported `data_limited`, not
  h* = 1**; a `tried` array with a non-monotone tail is flagged `non_monotone`;
  scrambling beyond h* leaves M_{h*} predictions exactly unchanged (the trivial
  case, excluded from the pass statistic) while it can change M_whole; a planted
  generator whose impact horizon equals h* by construction passes T6d (and fails
  on the sentence-to-token conversion of revision 1); the F* ladder includes rung 0.
- `law-impact-causal`: **replace all sentences after s by arbitrary text and assert
  the F* = 0 signature is hash-identical; the full (F* > 0) signature must
  change**, which proves the arms differ; a planted LONGRANGE generator is recovered
  by COMP-W and not by the old prefix COMP-OCC.
- `law-slots`: typed deltas on constructed slot structures for each of the seven
  types (emptied, retyped, rebound, refilled, shifted, born, unchanged) with the
  precedence of 2.5.2; **offset invariance: deleting a token in sentence s leaves the
  slot comparison of every unrelated sentence `unchanged` while the span
  signature's offsets-moved component is non-zero**; the sham ablation is the null
  type 100 percent; A-DEL, A-MASK, A-FILL agree on a constructed unambiguous case.
- `law-fold`: self-substitution A<-A is the null type; substitution of a mention
  by a co-referring mention at a bound slot of a planted structure is the null
  type, and by a different being is not; the perspective restriction removes
  slots whose provenance holder is not accessible (via `holder-scope.js`); a
  homonym pair is separated and a company-twin pair is separated on the planted
  FOLD-PLANT while STRING and COMP-SIM fail them.
- `law-verdict`: **`verdictFor` and `scorecard` over (a) all-planted-CO results,
  which must reach HOLDS for R0 to R3, and (b) all-planted-FO results, which must
  reach FALSIFIED(R0); the suite fails if either verdict is unreachable; a
  property test over a grid of result vectors asserts every vector maps to exactly
  one verdict** (the claim verdict function is total and the HOLDS and FALSIFIED
  regions are disjoint).
- `law-guard`: the guard refuses a mismatched hash.

---

## 8. Procedure and stopping rules

1. **Freeze the design**: write sha256 to `/private/tmp/claude-501/law/PREREGISTRATION.sha256`
   (by the orchestrator, from the final reviewed file, not by this document's author).
   Not before review; nothing is run before.
2. Implement modules and tests (no real-data outcome is looked at for tuning; the
   only permitted fixes are those the gates and tests demand).
3. Run gates G0 to G5 (planted and dev). **Stop rule:** if G0 fails for a claim, that
   claim is UNDERPOWERED and its test is not run; if G5 fails the whole run is
   UNDERPOWERED(verdict).
4. `--freeze-code`: write `CODE.sha256`.
5. DEV runs: lambda selection, h*_an, h*_u, M*, F*, H_imp, w, u_l, SESOI map, n_min,
   k_N. Their outputs are archived and reported.
6. **One TEST run** per (arm, protocol, partition, learner). Its output is final.
7. Report the scorecard with denominators and every typed gap, and the headline
   of 6.4 (strongest surviving reading).
8. Late reserve and notation/code/coreference additions run only as v3.

Stopping and reporting rules:
- No optional stopping, no repeated runs with changed settings, no threshold, feature,
  window or learner changed after seeing a result.
- A crash, NaN or missing file for a language makes it a typed gap, never imputed. If
  more than 20 percent of the units of a claim are gaps, the claim is UNDERPOWERED.
- A bug found after the TEST run is fixed in a new code hash and the corrected run is
  reported **alongside** the original (both in the report), never replacing it.
- All failures are reported as failures.

---

## 9. Risks, multiple comparisons, stopping

### 9.1 Risks

- **R1 contamination.** khora's POS, frame, role-config, clitic and morphology priors
  are built from UD train labels (their provenance blocks). Mitigation: forbidden in
  every primary arm (2.7), statically and dynamically checked (G4); the prior-loaded
  variants (including SLOT-ROLE) are labelled "contaminated" and carry no verdict.
- **R2 gold-definition bias.** UPOS is partly lexically defined (favours FORM);
  DEPREL is relational (favours COMPANY). Mitigation: both grains required (T7); no
  grain chosen after results.
- **R3 multiple comparisons.** Mitigation: 9.2 (the derived tolerance k_N and the
  replication override).
- **R4 family imbalance.** Indo-European is 29 of 41 languages. Mitigation:
  macro-average by family, N_cap equalisation, P1 treats IE as one fold, P2 reports
  branches apart.
- **R5 given segmentation.** UD word boundaries are human gold for unspaced scripts
  (and clitic splits for Romance/Semitic), and CorefUD mention spans are gold.
  Mitigation: character-grain arm (T3), no segmentation prior, disclosure.
- **R6 reader circularity.** Impact is computed by readers whose rules are partly
  distributional, and is a function of the window (data-processing, 1.2); impact
  could be company in disguise. Mitigation: matched visibility (COMP-W), the
  sufficiency statistic, IMPACT-C, planted impact.
- **R7 non-independence.** Parallel PUD test sets in many languages share content, and
  UD treebanks share annotation conventions. This affects language-level resampling
  (reported as such); no test sentence is in any training set.
- **R8 exposure regime.** Only E1 (lifetime exposure from train forms) is run, now at
  seven nested fractions for T2; a document-only reading of a short test file (E0) is
  not tested and the claim for it is untested.
- **R9 learner dependence.** Mitigation: L1 and L2 must agree (2.8); D versus D'
  capacity run.
- **R10 induction fragility.** K* may collapse to 1 on small or noisy languages: typed
  gap, counted.
- **R11 compute truncation.** The impact pipeline samples 2,000 tokens per language per
  split; the sampling variance enters the bootstrap, not a hidden filter.
- **R12 annotation noise.** UD labels are not error free; a ceiling below 1 applies to
  every arm equally; the planted calibration removes it from SESOI.
- **R13 code gold provenance.** The gold extractor was corrected on DEV smoke files;
  only TEST repositories are blind.
- **R14 amendment creep.** Thirteen amendments are registered; any more are exploratory.
- **R15 slot-organ deafness.** The prior-free relation reader (`relations-gfp`) needs
  recurring figures (minRec = 2) and a string-indexed referent index; pronouns,
  descriptors and hapax beings may produce no slots at all. The planted slot
  languages separate instrument deafness from conceptual failure; the gap is
  reported as a gap about the reader (A6, A10).
- **R16 calibrated margins transfer.** SESOI is calibrated on planted languages
  matched in role count and marginals; real languages differ in difficulty. The
  margin is never widened after the fact; instability makes the claim UNDERPOWERED.
- **R17 tolerance can mask a real exception.** The k_N units that may fail are listed
  in every HOLDS(exceptions) verdict; a replicated failure is never tolerated.
- **R18 coreference gold availability.** T11 depends on a sibling workflow's data
  that did not exist as chain files at revision 2; the claim is typed untested until
  it does, never inferred.

### 9.2 Multiple-comparison control (replaces the Bonferroni and Holm scheme)

Revision 1 required every unit to pass for support and a single unit at a Holm-adjusted
level to fail for falsification. Together with a seed-noise margin, that made support
unreachable and falsification near certain for any real data, whatever the truth.
Revision 2:
- Each unit outcome (PASS, FAIL, INCONCLUSIVE, UNDERPOWERED, GAP) is decided at the
  one-sided 95 percent level with the SESOI margin (2.10(3), (5)).
- The multiplicity across units is controlled by the **derived tolerance k_N(c)**: the
  smallest k with P(Binomial(N_c, 1 - pi_c^lo) > k) <= 0.01, where pi_c^lo is the lower
  Clopper-Pearson bound on the claim's own per-unit planted-true pass rate over 200
  draws. A true law fails more than k_N units with probability at most 0.01; the
  pre-registered kill requires more than k_N failing units or a replicated failure.
- The ladder (1.8) and the CORE / R5-only / AUXILIARY classes (1.9) control the number
  of claims on which a headline rests: the report names the strongest surviving
  reading, not an OR over ten claims.
- **Per-language descriptive tables** carry Benjamini-Hochberg q = 0.05 and are labelled
  exploratory.
- **The planted gates are not corrected** (they are the instrument's power, 95
  percent thresholds, 200 draws).

### 9.3 Stopping rules

Section 8.

---

## 10. Declared constants (every typed number, and why)

| constant | value | reason |
|---|---|---|
| alpha | 0.05 (one-sided for unit outcomes) | convention |
| ladder of horizons H | {1,2,4,8,16} + whole sentence | dyadic, as `dyadicCandidates`; rung 1 is the repo's native company |
| ladder M* | {0,8,16,32,64,128,256,512} frames | dyadic; `dmdWindow` needs caller-declared candidates; 0 = self frame |
| ladder F* | {0,1,2,4,8,16,32} frames | dyadic; rung 0 = self frame only (frame-causal arm) |
| ladder w (slot radius) | {1,2,4,8, whole} | dyadic; a radius for `dmdWindow` |
| ladder K | {2,4,...,128} (induction); {2,...,32} (impact types) | dyadic; selected by stability versus shuffle null |
| exposure fractions f | {1/64, ..., 1} (7 nested) | dyadic; the T2 intervention |
| size sweep N | {5k, 10k, 20k, 40k, full} tokens | doubling around N_cap; the data-limitation check |
| lambda grid | {1e-4,...,10}, 6 values | one equal tuning budget for every arm |
| N_cap | 20,000 tokens | floor of the smallest train split (hun, 20,166) |
| D hashed | 2^16 (robustness 2^10) | one capacity for all W arms |
| d_imp | min(24, rank) | one dimension for every dense impact arm (equal capacity); the planted impact generators put the determinant in more than one component |
| N_imp | 2,000 per language per split (+ hapax oversample 500) | compute-bound; equal for all T5 and T10 arms |
| B_perm, B_boot | 1,000, 2,000 | resolution of p to 0.001 and CI stable |
| B shuffle (T5 pipeline) | 10 | the pipeline is expensive; the planted gate calibrates it |
| minMentions, minShare, minMembers (R-B) | 2, 0.5, 2 | `ARRIVALS_FLOOR` (S16), `GRAMMAR_MIN_SHARE`, a kind needs a second member; the repo's givers |
| probability floor | 1e-4 | avoid infinite cross-entropy |
| theta (detect fraction of oracle) | 0.8 | declared fraction of the planted oracle ceiling G_oracle that the matching arm must reach |
| R_draw (planted draws per cell) | 200 | resolves a per-unit power of 0.985 (a lower Clopper-Pearson bound) so that k_N is derivable; the unit tests use 6 |
| gate on pi_c | pi_c >= 0.95 | below it the instrument cannot support a unit-level claim: UNDERPOWERED |
| k_N(c) | derived | smallest k with P(Bin(N_c, 1 - pi_c^lo) > k) <= 0.01 (1 percent at claim level); replaces the 70 percent and one-quarter proportions of revision 1 |
| equivalence power for n_min | 0.8 | conventional power for the TOST rule; n_min is derived per (role-count, learner, metric) |
| minimum homograph support | 20 tokens per role, 5 forms | binomial 95 percent half-width about 0.2 at n = 20; fewer is a typed gap |
| Cv floor (T1b) | 0.2 | below it a unique-company determination is vacuous |
| open/closed UPOS split (T2 within-class) | closed {ADP, AUX, CCONJ, DET, PART, PRON, SCONJ}; open {ADJ, ADV, INTJ, NOUN, NUM, PROPN, VERB} | declared before any run; gold used to stratify evaluation only |
| top-decile company similarity (T11 N2) | 0.9 quantile | declared; defines the company-twin negatives |
| epsilon_noise, SESOI, u_l, u_imp, u_pair, kappa_lo, D_planted,lo, epsilon_B, pi_c | derived | 2.6 and 2.10: from planted calibration and instrument re-seeding, never typed |
| seeds | sha256 of (`khora-law-v2`, stem, split, purpose) | reproducible, not tuned |

---

## 11. Amendments from review (2026-10-05)

Revision 2 applies the findings of the review panel to revision 1 (never frozen, never
run) and incorporates the user's two binding refinements. The rule followed: a test
that cannot fail is fixed by making it able to fail; no claim was deleted to make it
pass; where a pass rule was made reachable (the per-unit tolerance) it was derived
from the instrument's own power and paired with a stricter falsifier (the replication
override, the ladder, the failure table). **The panel report as relayed to the
architect was cut off in the middle of its ninth finding (the text ends at "...cannot
decide the law's central contrast, but t"), so finding 9 is addressed only on its
visible part, and any findings after it were not received; they are not addressed and
must be re-sent (the disposition says so).** No existing file was edited; no result is
in this document; the freeze hash is to be written by the orchestrator from this file
(section 8).

| # | severity | finding (summary) | disposition | where |
|---|---|---|---|---|
| 1 | blocker | The COMP arm was not company-only: the centre's own type descriptor (log n_w, s_init, s_final, neighbour entropies) and the centre identity's type company vector were in COMP, so COMP was COMP+FORM-LEX on seen types, nested FREQ and boundary position, satisfied T1 by nesting, pre-engineered A3, made the T1 and T9 shuffle controls unpassable for seen tokens, and the sentinel `^` encoded [i = 1]. | **Accepted in full.** COMP split into five arms: COMP-OCC (centre-masked occurrence window; no type vector, no own descriptor, no exposure count, no sentinel; boundary-blind padding; the only arm that may carry "not by form, not by position"), COMP-SENT (with sentinels), COMP-TYPE (lexicon-as-cache, labelled COMP+FORM-LEX-equivalent; COMP-TYPE-D the lossy dense version for A3), COMP-W (matched visibility, finding 3), BAG. T1 restated with a pass rule S(COMP-OCC given FREQ+POS) > SESOI plus the company-versus-form comparison with FORM in the rule on all, H0 and H1 strata; T2's screening statistic re-run on COMP-OCC and reported against COMP-TYPE-D only as the A3 convergence curve; the T1 and T9 shuffle controls rewritten on COMP-OCC. Tests: centre-swap invariance holds for COMP-OCC, COMP-SENT, COMP-W and **fails** for COMP-TYPE, FORM, FREQ, LEXD (built to fail); G(COMP-OCC) <= epsilon_noise on planted FO-LEX (fails under the old definition). | 1.3, 2.3, 2.4, 2.7, T1, T2, T9, G3, G0, 7 (law-company, law-planted), Appendix A |
| 2 | blocker | The headline verdict was foregone: "falsified" if ANY of ten claims was not HOLDS in every unit, with no multiplicity correction on the support side, T1b's strong reading predicted falsified, T5 HOLDS needing a deaf reader to be sensitive, T6b passed at 70 percent while support needed 100 percent; P(report = falsified) about 1 whatever the truth. | **Accepted in full.** (a) A pre-registered **ladder of readings** R0 to R5 (1.8) with a risky prediction, the result that kills it and a declared prior plausibility each; the report names the strongest surviving reading (nested) plus non-nested survivors, and R5 is the literal sentence. (b) Claims split into CORE, R5-only and AUXILIARY (1.9). (c) A table of "the result that would have counted as failure" for every claim (6.5). (d) The per-unit rule: HOLDS needs all evaluable units but at most a **derived** k_N (smallest k with P(Binomial(N, 1 - pi^lo) > k) <= 0.01, pi^lo the Clopper-Pearson lower bound on the claim's own planted-true pass rate over 200 draws; pi >= 0.95 else UNDERPOWERED), with a replication override so that a replicated failure is never tolerated (2.10(6)). (e) Gate G5 and 6.6: the real pipeline on LAW-TRUE (must reach survives(R5)), LAW-FALSE (FALSIFIED(R0)) and LAW-CO-ONLY (nested R3). Tests: law-verdict reachability and a total-function property test. Falsifiability retained: the replicated failure and the more-than-k_N rule are the kills, the tolerance is derived not typed, and the strongest rung is expected to fail (prior 0.02), which is now one rung of a ladder and not the whole report. | 1.6, 1.7, 1.8, 1.9, 2.10(6), 6.4, 6.5, 6.6, G5, 9.2, Appendix A (LAW-TRUE, LAW-FALSE, LAW-CO-ONLY), law-verdict |
| 3 | blocker | IMPACT was not compared with COMP at equal visibility or equal causality (perturbation window [s - M*, s + F*] up to 512 preceding and 32 following sentences against a few causal tokens), breaking rule 5; and impact is a deterministic function of the window text so S(IMPACT given company over the same window) = 0 for an ideal learner: case (R) logically expected, "independent information" indistinguishable from a wider window (the widening C3 says changes nothing). | **Accepted in full.** COMP-W (the identities of the same [s - M*, s + F*] frames, order-preserving bag or class-descriptor summary, centre masked) is the comparator in every T5 and T10 statistic; the **frame-causal impact arm (F* = 0)**, compared with COMP-W-C, is the only arm that may enter a reading claim; forward impact is non-causal by definition and compared only with non-causal company. The data-processing argument is stated (1.2) and the testable content of C2 becomes **sufficiency**: S(COMP-W given IMPACT) <= SESOI; the revision-1 case (I) is removed (it could arise only from a wider window); case (C) compression advantage is tested by the sample-size sweep and reported as a sample-efficiency effect. Tests: law-impact-causal (F* = 0 signature hash-identical under replacement of all later sentences; the full signature changes; planted LONGRANGE recovered by COMP-W and not by prefix COMP-OCC). | 1.2, 2.3, 2.6b, T5, G0 cell 8, G3, law-impact-causal |
| 4 | major | G0 was not a power check of exactly the claimed form: the modular-sum CO(h) is a parity-like function that a logistic regression cannot represent and a 64-unit network cannot learn from 20,000 tokens; "detect" meant only G > 0; only the planted arm was checked, not the decision boundaries; only Shapley recovery tested a boundary statistic. | **Accepted in full.** Every generator has an oracle ceiling (finite-sample Bayes lookup); detect = G >= theta = 0.8 G_oracle (and significant); the modular sum is replaced by CO-TAB(h) (table on latent classes, at most 256 cells) and CO-ADD(h) (additive class weights), the parity form kept only as UNBOUNDED/CO-PAR; decision-boundary cells added: screening-off at 0, SESOI and 2 SESOI (FO-INDEP), the cache case (classified A3, never FALSIFIED(form independent); G0 fails if it is), CLASSMIX, LATENT (A4 not "determines"), kappa, D, horizon (including data-limited), sufficiency, slot versus span, fold. Tests: for CO(h), h in {1, 2, 4}, G(COMP-OCC) >= 0.8 G_oracle; the old mod-sum at h = 2 is asserted to fail. | G0, Appendix A, law-planted |
| 5 | major | epsilon was a seed-noise margin (95th percentile of seed spread on planted data) used as the equivalence margin for "S(FORM given COMP) <= eps", "S(IMPACT given COMP) <= eps", "Delta_FC <= eps": with thousands of tokens any real effect exceeds it so every "screens off" row was unreachable; it contradicts the law's own "differences that make a difference"; T6 used a different tolerance; HOLDS rows tested the point estimate so low power (top exposure bin, small H1) passed the null claim. | **Accepted in full.** One **SESOI** in the law's own units: the argmax-role change rate u_l (the same unit as dmdWindow's `equal`), converted to bits per token (and to AUROC, NMI) by planted calibration (isotonic map), floored at epsilon_noise; epsilon_noise is retained only as the instrument stability floor (G2). All "no added information" claims are TOST-style equivalence (upper one-sided bound < SESOI) with a minimum-n rule n_min (equivalence power 0.8); a stratum below n_min is UNDERPOWERED(n), never HOLDS; superiority is the lower bound > SESOI; point estimates are never the test. Every epsilon in the tests is read as SESOI by the notation of 2.10(3). Tests: law-stats (FO-LEX at the SESOI boundary is "not equivalent"; form adding 0 bits is equivalent only when n >= n_min and UNDERPOWERED below). | 2.10(1) to (4), all tables, law-stats |
| 6 | major | T6 transfer was largely analytic: h* from gold-trained models' argmax agreement with the full model strongly implies a gold accuracy plateau at h* (the same measurement twice); the beyond-scramble is trivially invariant for M_h* (input masked) and informative only for M_whole; N_cap = 20,000 tokens with sparse hashed features makes accuracy plateau early from data limits so h* is biased small; dmdWindow returns the first agreeing depth, possibly chance. | **Accepted in full.** h*_an (analytic) is kept as the operating horizon only; the transfer test uses **h*_u**, measured on a gold-free conclusion (the unsupervised class-transition predictor), against the gold plateau and against the impact horizon in the same unit; T-c is defined on M_whole only, with the margin rule (tokens need at least h* + k beyond), and the M_h* case is asserted trivial and excluded; an exposure-size sweep N in {5k, 10k, 20k, 40k, full} with typed gaps `data_limited` and `no_sweep_headroom` (hun, vie); a persistence (monotone) check on dmdWindow's `tried` with typed gap `non_monotone`; planted CO-TAB(6) at one quarter of the exposure must be reported data-limited, not h* = 1 (A9 registered). Tests: law-window. | 1.3, 2.6a, 2.6d, T6, G0 cell 7, A9, law-window |
| 7 | major | T6d mixed units: F* in whole sentences (ladder 1..32, no rung 0) converted by median sentence length (15 to 25+ tokens) put the smallest F* at or above the top h* rung, so "within one rung" could not hold for reasons unrelated to the law; the 70 percent and one-quarter thresholds contradicted universality and were missing from section 10. | **Accepted in full.** Rung 0 (self frame only) added to the F* and M* ladders; the impact horizon is measured in tokens in the same ladder as h* (H_imp, by dmdWindow with a token restrict), so no sentence-to-token conversion exists; the proportion rules are removed and replaced by the derived k_N rule; every constant is listed in section 10 with its derivation. Tests: a planted generator whose impact horizon equals h* by construction must pass T6d (it fails on the revision-1 conversion). | 2.6b, 2.6c, T6, 9.2, 10, law-window |
| 8 | major | The T2 convergence design confounded exposure with word class (top bins are closed-class words; role near-deterministic from frequency; few types so a point-estimate pass is low power) and A3 as registered converted any decreasing trend into an amendment so it could not lose. | **Accepted in full.** Stratification replaced by an **intervention**: nested exposure subsampling f in {1/64 ... 1}, all arms retrained and COMP/COMP-TYPE-D recomputed on the same TEST tokens, S(FORM given COMP) traced against f; within-class strata (closed versus open UPOS) so class mix cannot make the slope; A3 given a **falsifier**: S(FORM given COMP-TYPE-D) must reach <= SESOI at f_conv <= f_sat(FORM-LEX), else A3 reads as "form independently informative" and is FALSIFIED(strong). Because COMP-TYPE sparse is a lossless pointer (S = 0 by construction), the A3 curve uses the lossy dense COMP-TYPE-D. Tests: planted CACHE (slope reaches zero), FO-LEX (plateau), CLASSMIX (no slope under subsampling). | 2.3, T2, G0 cells 2 and 3, A3, law-planted |
| 9 | major (as far as visible) | The relayed text of this finding is cut off after "Protocol X handicaps FORM relative to company and cannot decide the law's central contrast, but t". | **Addressed on the visible part only; the rest was not received and is not addressed.** FORM-X (hand-made shape features) is given equal footing with COMP-X (learned induced classes) by FORM-IND (induced form classes by the same K* and stability rule, with descriptors); COMP-OCC-X no longer contains the centre's own descriptor or sentinel; and it is stated that **protocol X cannot decide the central contrast** (identity cannot transfer across families): "company beats form" and "form is screened off" are decided in W only (T1(ii), T2), X decides only whether a transferable company-to-role function exists (U1), and G(COMP-OCC-X) versus G(FORM-X) is reported directional and non-decisive. The remainder of the finding, and any findings after it in the panel, must be re-sent. | 2.4 (FORM-IND), 2.7, T1 |
| R1 | user, binding | "Ablate the tokens and see how they impact things, look at the slot not the spans." | **Applied.** Impact is ablation at the slot: slot organ (REL and REF slots, coordinates by sentence offset, ordinal and field, never offsets), ablation modes A-DEL, A-MASK, A-FILL (neutral filler of the same induced slot class), alignment by structure, the closed vocabulary of seven typed deltas (emptied, retyped, rebound, refilled, shifted, born, unchanged) with precedence, the signature as their distribution (85 components, PCA-24), types derived as before; the span/string impact kept as the **rival** IMPACT-SPAN; the contaminated RoleConfig slot organ labelled SLOT-ROLE without verdict; controls built to fail (sham, offset-invariance); **T10** added (slot versus span, symmetric planted SLOT-ONLY and SPAN-ONLY). | 1.1, 1.10, 2.5, T5, T10, G0 cell 9, A13 |
| R2 | user, binding | "Identity is the universe folded at a point, from a perspective, bounded by differences that make a difference. Spans that survive this are the same referent." | **Applied.** FOLD(s; p, w) defined on the slot graph with the perspective p from `kernel/perspective.js` and `kernel/holder-scope.js` (accessibleHolders, READER) and w measured by dmdWindow with a radius `restrict`; substitution of span B into span A's slot compared with FOLD(A) by typed slot deltas; survival = the null type; rivals STRING, COMP-SIM, RECUR and learned combinations; **T11** added on coreference gold (links name -> pronoun -> descriptor, separation of homonyms and company-twins; T11b perspective dependence only where holders are declared, else untested; T11c single-mention existence); typed `UNTESTED(no coref gold yet)` because `/private/tmp/claude-501/physics/coref/` held only a manifest at revision 2; two-instrument planted power check (shipped reader and reference organ). A10 registered. | 1.1, 2.5.7, T11, 3.5, G0 cell 10, A10 |
| M | architect | Housekeeping changes forced by the above. | (a) epsilon replaced by SESOI throughout (epsilon_noise kept as the floor); (b) seeds renamed `khora-law-v2`; (c) verdict vocabulary extended (HOLDS(exceptions), AMENDED, UNRESOLVED) so the claim verdict is a total function; (d) amendments A9 to A13 registered; (e) the "HOLDS-WITH-AMENDMENT" label renamed AMENDED(A#); (f) the markdown tables no longer carry unescaped pipes inside cells (partial-information statistics are written S(a given b)); (g) late-reserve and availability facts updated (ud-eval already holds afr cym gle kat lzh mar mlt tam tel; code gold exists; notation gold does not; coref gold is a manifest only); (h) the hash of revision 1 is recorded here and no hash of revision 2 is written by its author. | all |

**What this revision does not claim.** It does not claim that any reading survives. It
claims only that the document is now able to return survives(R5) on a planted law
(LAW-TRUE), FALSIFIED(R0) on a planted non-law (LAW-FALSE) and the nested R3 on a
company-only universe (LAW-CO-ONLY), that the instrument must show this before any real
datum is read (G5), and that every kill is written down in 6.5. Nothing has been run.

## Appendix A. The planted languages (power checks)

Each generator has known truth: the role of every token is a function of exactly one
named determinant, and the other candidate determinants are independent of the role by
construction. Every generator also exposes its **oracle ceiling** G_oracle (the
finite-sample Bayes-optimal lookup on the generating variables at N_cap, 2.8) and its
**planted answers** for every boundary statistic it is used to calibrate. Common frame:
alphabet random per language and per planted family (so form does not transfer by
accident), 6 planted families of 2 languages, R_draw = 200 seeded draws (6 in the
unit tests), roles R = 10, type pool V = 3,000, Zipf s = 1.0 for emission, sentence
length 3 + Poisson(14), train = 20,000 tokens (= N_cap), dev = 10,000, test = 10,000,
and an OOV rate rho = 0.15 at test unless stated.

| generator | role determined by | independent of role | arms that must detect | arms that must reject |
|---|---|---|---|---|
| CO-TAB(h, side) | r_i = T[kappa(w_{i-1}), ..., kappa(w_{i-h})]: a table lookup on the tuple of latent classes of the last h tokens (side = left, right or both), kappa a fixed random partition of V into q_h = min(8, floor(256^(1/h))) classes, T a fixed random table onto the R roles (every role used), padding kappa = 0; at most 256 cells, learnable from 20,000 tokens | the centre identity and string; position; i.i.d. identities | COMP-OCC (causal for left, non-causal otherwise), reaching >= 0.8 G_oracle | FORM-LEX, FORM-MORPH, POS, FREQ |
| CO-ADD(h, side) | r_i = argmax_r sum_{d=1..h} W[d][r][kappa(w_{i-d})], W Gaussian with scale 1/d, kappa 8 classes: an additive class-weight determination, representable by the logistic learner | as CO-TAB | COMP-OCC, >= 0.8 G_oracle | as CO-TAB |
| CO-PAR(h) | the modular-sum determination of revision 1, r_i = (sum c_d kappa(w_{i-d})) mod R; kept **only** for h = whole prefix (parity) as UNBOUNDED, and as the documented-failing case CO-PAR(2) | | UNBOUNDED: the instrument must return `reach_exceeds_candidates` | |
| FO-LEX | a fixed random map type -> role | neighbours (i.i.d.) and position | FORM-LEX | COMP-OCC (G <= epsilon_noise), POS |
| FO-MORPH | the suffix class of the string = stem + suffix(role); stems drawn fresh (mostly OOV) | neighbours, position | FORM-MORPH | COMP-OCC, POS, FORM-LEX on OOV |
| FO-INDEP(delta) | role = (a, b): a from CO-TAB(2) (5 values) and b in {0,1} the type's form bit, followed with a probability tuned by bisection on the oracle so that b adds exactly delta bits beyond company; delta in {0, SESOI, 2 SESOI} | | FORM given COMP-OCC at the delta | decision-boundary cell 1: equivalence at 0, not equivalent at SESOI, superior at 2 SESOI |
| PO | r = f(i): position classes (first, last, interior mod 3) | identities, neighbours | POS | COMP-OCC (boundary-blind), FORM, FREQ |
| HMM-SHARED | a role-level Markov chain whose role labels and transition matrix are the same in every planted family, role-specific emission vocabularies (3 closed roles with 15 types, 7 open roles with 400), random strings | none (this is the natural-language-like case: both form identity and company are informative on seen types; on OOV only company) | COMP-OCC, COMP-OCC-X; FORM-LEX on seen only | FORM-MORPH, POS beyond boundary effects |
| HMM-PRIVATE | the same but each planted family has its own transition matrix | | COMP-W | COMP-OCC-X (no universal function) |
| MIX(pi) | with probability pi the CO-TAB(2) function, else FO-LEX | | decomposition recovers pi; the SESOI calibration pairs | |
| HOM | HMM-SHARED plus 30 forms emitted by two roles; variant a: disambiguated by left-neighbour class; variant b: independent of company | | COMP-OCC lifts variant a | COMP-OCC must not lift variant b |
| AGGL(agreement) | stem + suffix1 + suffix2; suffix1 determines role; suffix2 agrees with the neighbour's suffix1 (agreement ON) or is random (OFF); stems fresh | | ON: SUBWORD; OFF: FORM-MORPH | ON: token-level COMP-OCC (all stems OOV); OFF: COMP-OCC and SUBWORD |
| CACHE | each type w has a latent class z(w) in 8; the neighbours of an occurrence of w are drawn from p(. given z(w)) (the type's company); role = g(z(w)). The lexicon is only a cache of company | | S(FORM given COMP-TYPE-D; f) reaches <= SESOI at f_conv <= f_sat(FORM-LEX): classified A3 | must **not** be classified FALSIFIED(form independent) |
| CLASSMIX | closed types (50, high frequency): role = a random map from identity, neighbours i.i.d.; open types (3,000): role = CO-TAB(1) of the left neighbour; frequency separates the classes | | no slope of S(FORM given COMP) under exposure subsampling | the exposure-bin stratification of revision 1 would show a spurious falling slope (the control shows why it was replaced) |
| LATENT(q) | a latent class z_i from a Markov chain; role = f(z_i) with probability 1 - eta, else random; identity and company are both noisy proxies of z_i (overlapping emission) | | classification A4 (constrains), D(h*) inside the generator's planted range | "determines" and "form independent" |
| IMPACT-PLANT | structural role with explicit slot effects: N (recurring figure, at least 2 mentions in the window: ablation changes ref-entry and the rel slots it fills), V (connector between two N: ablation changes rel-label and both ends), F (filler never in a relation: `no-slot`, nothing changes), U (unique content word: `no-slot`, only atmosphere novelty) | | IMPACT-SLOT types align with the roles (NMI above company-shuffle null) | IMPACT-NULL (roles assigned at random) gives NMI at the null |
| IMPACT-SUFF | role = a function of the slot-ablation impact type, which is a function of the window | | classified case (S): S(COMP-W given IMPACT-SLOT) <= SESOI | |
| IMPACT-LOSSY | role = f(impact type, w) where w is a window feature that the impact signature discards (no slot consequence) | | classified case (L): S(COMP-W given IMPACT-SLOT) > SESOI | |
| LONGRANGE | role depends only on the token's effect on later sentences (whether its figure re-enters as an end in the next F sentences) | the left prefix | COMP-W and the forward impact (non-causal) | COMP-W-C, COMP-OCC, the frame-causal impact |
| SLOT-ONLY | role determined by the **typed pattern** of slot deltas (rebound versus shifted versus refilled), with every span-signature component (lost, born, changed edges by string key, mention shift, offsets-moved) matched across role classes by rejection sampling | | IMPACT-SLOT | IMPACT-SPAN (G <= epsilon_noise) |
| SPAN-ONLY | role determined by a string-level effect with no slot consequence (surface births or mention-count shifts outside any relation); an offsets-only variant (the number of later edges whose byte offset moves with all slot deltas `unchanged`) | | IMPACT-SPAN | IMPACT-SLOT (G <= epsilon_noise) |
| IMPACT-HORIZON(h) | the slot effect of ablating t reaches exactly the slots within h tokens of t | | measured H_imp = the smallest ladder rung >= h; passes T6d against CO-TAB(h) | a sentence-to-token conversion (revision 1) |
| FOLD-PLANT(variant) | beings with private relation structure (each being has a private connector set and counterparts, in every one of its mentions) and several surface forms: a name token, a recurring pronoun-class token, a descriptor token. Variants: **(a) surface variation** (chains whose mentions vary in surface, structure constant: link; STRING fails); **(b) homonym** (two beings sharing a string with different structure: STRING merges, FOLD separates); **(c) company-twin** (two beings with different strings, the same left and right token contexts i.i.d., different downstream relations beyond the company window: COMP-SIM merges, FOLD separates); **(d) fold-blind** (chains marked by form only, structure random: FOLD must not beat STRING); **(e) singleton** (beings mentioned once with private structure versus non-referring fillers with none); **(f) perspective** (two holders; the same string refers to a different being from each holder, and one being from READER) | | FOLD (shipped reader, and the reference slot organ as ceiling) | STRING on (a), (b); COMP-SIM on (c); FOLD on (d) must not beat STRING |
| BAG | the multiset of neighbour classes in the sentence (order-free) | order | BAG, T9 collapse kappa near 0 | |
| LAW-TRUE | the planted law: role = the slot-ablation impact type; impact type determined by company within a horizon h0; no form or position dependence; hapax included; FOLD-PLANT chains; one planted analog per family (10 text families) and per code family (6) | | every claim of R0 to R5 passes: the verdict function must return survives(R5) | |
| LAW-FALSE | FO-LEX plus PO mixtures with the same marginals as LAW-TRUE | | | every claim of R0 to R5 fails: the verdict must be FALSIFIED(R0) |
| LAW-CO-ONLY | company determines role (CO-TAB(h0)); impact planted null; FOLD-PLANT absent | | R0 to R3 pass | R4 and R5 fail; the verdict must return the nested R3 |

The truth table is `PLANTED_TRUTH` in `planted.mjs` and is the object G0 checks
against; the table above is its pre-registration.

## Appendix B. Census facts used as design inputs (counts only; no arm has been run)

Evaluable test tokens, OOV rate against train, and homograph-form counts (forms with at
least two UPOS classes each with at least 20 tokens in train+test pooled), measured from
the treebanks at write time (revision 1; unchanged by revision 2):

- Smallest train splits: hun 20,166 tokens (derives N_cap = 20,000), vie 20,215, tur
  37,522, ell 42,326, lit 47,641, kor 56,687. Languages with fewer than 40k train
  tokens cannot run the 2 N_cap rung of the data-limitation sweep (`no_sweep_headroom`):
  hun, vie.
- True-hapax tokens in test (OOV and single in the test stream) range from 507 (ita, urd,
  fra) to 5,507 (est): T4 has at least 500 H1 tokens per language.
- Homograph forms (support 20): 5 (hun), 8 (srp), 9 (kor), up to 200 (cat), 157 (spa), 150
  (fas): T8 has support everywhere except possibly hun (exactly at the floor).
- FEATS per token is 0.01 for kor and jpn and 0 for vie: FEATS cannot index inflection;
  MR is the type-token ratio at N_cap (0.15 pol to 0.58 kor).
- Document markers (`# newdoc`) in train: more than 100 for arb, cat, ces, ell, eng, hrv,
  hye, jpn, lav, slv, spa, ukr; fewer or none for the rest (deu, dan, fra, kor, fin, hin,
  bul, ron, ...). jpn has 7,050 documents for 7,050 sentences (one sentence per
  document), so it has no document order either. The T6e rule (at least 100 documents
  and at least 2 sentences per document on average) therefore admits arb, cat, ces, ell,
  eng, hrv, hye, lav, slv, spa, ukr; elsewhere T6e is `UNTESTED(no document order)`.
- cmn and cmn-hans are the same sentences in two scripts (identical token counts):
  counted once.
- `hye` appeared in ud-eval during the writing of revision 1 and is in the frozen set; stems
  not listed in 3.1 that appear later are the late reserve (afr cym gle kat lzh mar mlt
  tam tel were present at revision 2 and are not in the frozen set).
- At revision 2: `eval/coding-competence/gold.mjs` and `/private/tmp/claude-501/code-corpus/`
  exist; `/private/tmp/claude-501/notation/` holds a survey and inventory but no token-role
  gold, `eval/notation-competence/` does not exist; `/private/tmp/claude-501/physics/coref/`
  holds the CorefUD 1.4 manifest (train and dev) and tools but no chain file (3.5). These
  are availability facts at write time, not results; run time decides what is tested.
