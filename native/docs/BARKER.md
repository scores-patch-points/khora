# BARKER — the arch: a meta-archon over what we are learning

*Written 2026-10-05 at the user's direction: "We now need a meta archon, Barker, who is looking at what we are
learning, and discovering through kind induction and whatnot the metastructure of these systems, using that to
help us learn better and to falsify EO itself" and "corey barker of archdisciplinarity". Standing: **nomination,
and a pre-registration**. Nothing in this document is a result. **Revised 2026-10-05 after the first review panel (section 11 lists every finding and its disposition).** Where it disagrees with code that already exists,
the code wins; where it disagrees with itself after the freeze line (section 9), the earlier text wins and the
later text is an addendum that says what had been seen when it was written (the practice the pilot profile
pre-registration already follows).*

*Barker is named for Cory David Barker (PhD candidate, cognitive science and information technology, University of
Jyvaskyla; President of the Archdisciplinary Research Center), first author of* Foundations of Archdisciplinarity:
Advancing Beyond the Meta *(ARC, 2023-24; cited below as **FoA**, by PRINTED page; the PDF is PDF-page minus 1). The
name was already in the earned cast as a proposed, unbuilt attention (`the-fold/earned-cast.js`, `CAST` and
`DEFAULT_TRUST.barker = "checked"`; `eo-compendium/essays/the-earned-cast.md`: "the map is itself coordinated; it
never claims to stand outside"). This document builds the organ and, more importantly, the instruments that decide
whether it has earned the right to speak.*

## The handle table

| File | Handle | One line |
|---|---|---|
| `organs/barker.js` | Barker | The arch: induces kinds of systems and candidate arches from measured profiles, tests them on held-out systems and families, and applies the same test to its own map. Coordinated, never outside. |
| `eval/barker/profiles.mjs` | Barker (the profile) | One zero-model, EO-free feature vector per system, every cell carrying its giver, denominator and channel. |
| `eval/barker/induce.mjs` | Barker (the induction) | Kanada, the characteristic-set inducer and a spectral splitter under ONE search-aware ceiling; kinds of systems, of relations, of word types; the arch cards. |
| `eval/barker/transfer.mjs` | Barker (the transfer) | Leave-one-FAMILY-out: predict a held-out system's parameters from induced kinds, against controls built to be beaten. |
| `eval/barker/eo-claims.mjs` | Barker (the battery) | EO's measurable structural claims as pre-registered tests that can fail, beside the alternatives they compete with. |
| `eval/barker/self.mjs` | Barker (the mirror) | The map put to its own tests: resampling, held-out systems, label permutation, false-arch rate. |
| `eval/barker/run.mjs` | Barker (the driver) | Freeze check, power cards first, controls second, claims last; writes cards, never prose verdicts. |

The archon's own discipline in one sentence: **a regularity is an arch candidate only if an instrument that could
have missed it did not, a control built to fail did fail, and it held on systems and families the induction never
saw; and every one of those words applies to Barker's own list.**

## At a glance

- **What there is to look at now.** 33 natural languages in 13 branches and 9 independent lineages (24 Indo-European) with UD gold, priors and some
  competence cards; 20 code grammars as INVENTORY only (no corpus); no notation corpus. The data tree grows while we write.
- **What Barker does.** Builds one zero-model, EO-free profile per system; induces kinds of systems, relations and word types
  under one search-aware ceiling; states candidate arches as regularities with controls (13 cards); asks whether induced
  kinds predict a held-out FAMILY's parameters better than controls (4 tasks); runs EO's measurable structural claims against
  rival structures (4 tests, a crosswalk, and a table of the claims that cannot be tested yet, each with the exact missing data); and applies all of
  it to its own list (8 self-tests).
- **What will probably come back.** Most fine structure UNDERPOWERED at 33 systems; "the kind is the script, or the family"
  as the dominant finding; several arches TRIVIAL (random typing, random trees); two EO claims genuinely testable now
  (the nine-act table on English, judged against structure-preserving nulls and a registered smallest effect of interest; the grammar table on
  the languages that did not derive it, as a bridge-dependent proxy), one near-foregone, one probably underpowered.
- **What binds it.** The registry is hashed before any run; power cards run before any real-data statistic; a test whose power
  fails is not peeked at; failures are printed first; no aggregate EO score; Barker stays `checked` (may be consulted, may not
  speak unprompted) until its own tests pass.
- **What the review changed (section 11).** A kind must now beat a covariance-preserving null and a gap test, so a correlated continuum is called a GRADIENT and not a kind;
  every verdict is judged against a pre-registered smallest effect of interest (SESOI) in the statistic's own units, not against the instrument's own weakness;
  EO-1 faces nulls that keep Levin's class locality; EO-2 is a bridge-dependent proxy with count-equalised divergences, a consumed-language ledger and a
  frequency-rank control; the unit of replication is the 9 lineages, not 13 branches.

---

## 1. Mandate and honest scope

### 1.1 The five things Barker is for

| | The mandate (user's words, then ours) | Section |
|---|---|---|
| A | LOOK at what we are learning: the measured systems (natural languages, programming languages, notation families) and the received priors. | 2, 3 |
| B | DISCOVER the metastructure by kind induction: kinds of systems, of relations, of word types; candidate ARCHES = structure that persists across systems, stated as measurable regularities with controls. | 4 |
| C | USE it to LEARN BETTER: transfer to held-out systems, derive thresholds now typed by hand, choose which prior family to borrow, flag rungs that fail for a structural reason shared across a kind. A gain is claimed only against a control on held-out SYSTEMS. | 5 |
| D | FALSIFY EO ITSELF: EO's structural and empirical claims put to pre-registered tests on data EO did not shape, against rival structures. | 6 |
| E | SELF-APPLICATION: Barker's own kinds and arches are rows in Barker's own table and take the same tests. | 7 |

### 1.2 What Barker can claim, and what it cannot

| Barker CAN say | Barker CANNOT say |
|---|---|
| "Regularity R holds in k of U independent lineages (sign-test p, effect with interval, the lower bound above a registered smallest effect of interest), is absent in the control built to fail, and the same instrument detects a planted R of the same form at power p." | "R is a universal of mind, language or nature." Systems are a sample of 9 lineages (13 branches; 24 of 33 languages are Indo-European), a handful of code grammars and unmeasured notations; lineage-blocked replication is the unit, not token count. |
| "Induced kinds of systems predict parameter P of a held-out family better (or no better) than global mean / nearest script / random kinds, with interval over lineages." | "These kinds are real." A kind is what the inducer plus its null could separate at this n; the power cards say which kinds could not have been found. |
| "EO claim C, as operationalised in test T, survives / is weakened / is refuted / is underpowered; the operationalisation's fidelity to EO's own wording is graded direct or proxy." | "EO is false" or "EO is true." EO is a unification metatheory whose cells classify MOVES never content (THE-27-CELLS section 1). A test on material can refute a content-facing operationalisation and leave the move taxonomy untouched; every verdict says which. |
| "A statistic cannot resolve this question here" (UNDERPOWERED, INSTRUMENT_FAILED), and what data would. | "Not falsified." An instrument that could not have failed has not tested anything (II.23). |
| "Our list of arches changed when family F was removed." | "Our list is the map of the unification frameworks." FoA's units of analysis are unification metatheories (FoA p.15, p.52); Barker's measured units are SYSTEMS (languages, code, notations), which are object-level artifacts. Cross-system regularity is typology wearing an archdisciplinary question. Only the EO-versus-rivals crosswalk (section 6.7) is archdisciplinary in FoA's own sense, and it is a table of structural claims, not a measurement. |

**The map is itself coordinated.** Every Barker output is stamped with a declared frame (`organs/frame.js::declareFrame`:
the organs used, the givers, the declared numbers) and two Barker outputs from different frames join no comparison
(`comparable`). Barker's lens is: UD annotation conventions, khora's instruments, one author's choice of
alternatives. The report carries that lens as data, not as a disclaimer. This is stricter than FoA's own method prose,
which at times speaks of a neutral external standpoint (FoA p.52, p.58-59, p.64) and at others of a self-referential
archtheory that enacts its own arches (FoA p.76; p.18; p.73). Khora takes the second and holds to it.

### 1.3 Two phases, labelled, never blended

FoA asks that comparison and critique be kept apart and critique reserved (FoA pp.65-66). It also describes immanent
critique, which steelmans a framework and then uses its own presuppositions against it, as the stronger style
(FoA pp.70-72). Barker runs two labelled phases:

1. **COMPARATIVE** (descriptive, no truth verdicts): induce, align, tabulate; for each framework (EO, Peirce's three
   categories, the integral quadrants, UD's own inventory, Alderman's six word classes as FoA p.28 reads them, Blake's
   case hierarchy, data-driven partitions) state what structure it claims and whether a measurable reading exists.
2. **CRITICAL** (pre-registered tests, verdicts allowed): only claims with a measurable reading, each preceded by a
   steelman taken from the framework's own text, so that the test is not a strawman; EO's own `II.23` and `II.5` are the
   presuppositions the test is judged by (the immanent form).

### 1.4 Hazards in FoA's own stance that Barker must NOT copy (our reading, page-cited)

FoA states no falsification criterion: the words falsify, refute, counterexample and disconfirm do not occur in it
(grep of the full text, 2026-10-05), it asks only that an arch be shown in two or more frameworks and says more examples
strengthen it (FoA p.54), and it calls identification of arches possible without evaluating the truth of what is
compared (FoA pp.86-87). Its own evidence ladder (opinion, hypothesis, theory, law, absolute truth; FoA pp.16-17) is
outrun by the claim that arches show absolute truths (FoA p.79); elsewhere FoA calls them candidates for laws
(FoA p.91), which is the standing Barker keeps. Four moves are therefore **not taken** into the critical phase: (i) FoA's
point that an arch can persist whatever the fit of the content compared to the facts (FoA p.59) is right for the
COMPARATIVE phase, where no truth verdict is issued, and is refused for the critical phase, where fit to data is the question;
(ii) FoA's argument that ordinary methods cannot verify a unification metatheory's high-level properties without downward
assimilation (FoA p.64) is taken only in its useful half (a framework cannot certify itself, so independent channels count and
EO's instruments are the system under test, S7) and is not taken as an exemption from tests on data; (iii) finding an arch
inside the argument against arches (FoA p.91) is not counted as evidence for it; (iv) an anticipated rejection explained by the
rejecter's circumstance or attachment to the status quo (FoA p.48) is not counted against the argument. **Every falsifier in this document is khora's addition and is labelled
Barker-in-khora; none is attributed to FoA.** FoA does not name Experiential Ontology (grep, 0 hits; its Table 4 of about
190 frameworks, FoA pp.108-133, does not list it), so nothing here says Barker's author would endorse these tests.

### 1.5 What was taken from FoA, and how (paraphrase only; licence)

FoA is copyright ARC and may be copied unchanged for noncommercial use with attribution, with no derivatives or
adaptations without permission (FoA p.1). Therefore: no passage is reproduced here, no extraction of its text lives in
the repo, the PDF is not redistributed, and every use is a paraphrase with a page number. The method taken, with
pages, is in Appendix A. In one line each: the definition of an arch (a pattern shown in two or more unification
metatheories, FoA p.54); the five admission criteria for a unification metatheory (FoA pp.52-53); the three routes of
classification (FoA pp.55-58); the nine proposed arches (FoA p.35); the fractal derivation of the first arch by
spotting the same unit-relation-system form in two frameworks with its two sides inverted (FoA pp.77-79) and the
forward/backward computation that finds sameness, similarity and difference (FoA pp.83-85): **the only step of Barker's
own derivation that a zero-model reader can imitate is "find what recurs across systems, including under inversion,
then test the hypothesis on systems not used to find it"**; the rest (nine ratiocinations, nine phase states,
transjectivity, singularity, the ruliad) has no observable on text or code and is recorded as a typed gap
(section 4.8).

### 1.6 Rules that bind every line below

| Rule | Where it lives | What it means here |
|---|---|---|
| Write the prediction and the pass rule BEFORE the first run; never tune after; report failures as failures | II.5 / READING-POLICY | Sections 3-8 are the pre-registration, hashed at freeze (section 9). Probabilities for each outcome are recorded now (section 10). |
| A claim needs a control built to fail and a power check | II.23, II.4 | Every test carries both; a failed control is INSTRUMENT_FAILED; a failed power check is UNDERPOWERED, never "not falsified". |
| The null differs from the observation in exactly one axis; selection is an axis | II.10 | Every induced kind is judged against a SEARCH-AWARE ceiling (the maximum over everything tried), not against random subsets of its own size. READING-SPEC S41 records the vacuous-basin failure of the per-basin null. |
| Every received table names its giver; nothing typed passes as discovered | priors discipline | Every profile cell and every rival partition carries a giver; Barker's own typed constants are listed in section 3.8 as PROVISIONAL. |
| Derived, not typed (P4); a bare integer is provisional | P4 | Section 3.8 lists each typed number and what would derive it. |
| Gaps are results: typed, with denominators | S24 | `gaps[]` in every profile and card; "unmeasured" is never "supported". |
| Held-out discipline at the SYSTEM level | the mandate | Splits are by whole system, whole branch and whole lineage (section 3.6). |
| No test uses EO's classifier output as gold | the mandate | EO instruments are the SYSTEM UNDER TEST only, imported only in `eval/barker/eo-claims.mjs` and enforced by a source scan (section 8). |
| Effect size before significance: every verdict is relative to a pre-registered smallest effect of interest (SESOI) in the statistic's own units, fixed before any power card and signed by the claim's defender | II.5, II.23 | A planted effect AT the SESOI (and at twice and half of it) is what the power cards plant; REFUTED and SURVIVES both require the interval to clear the SESOI (6.0a). |
| Zero model | khora | No LLM, no embedding, no network in any Barker code; enforced by a source scan. |
| No edits to existing source; no commits | the mandate | Needed edits are proposals (section 8.3). |

### 1.7 Prior art Barker must consult, not rediscover

A cross-system regularity that Barker "finds" and that is in this list is reported as **recovered**, which validates the
instrument and claims no novelty: Greenberg's word-order universals and their implicational form (1963) and Dryer's
later work; Dunn, Greenhill, Levinson and Gray (2011) on lineage-specific rather than universal word-order trends, which
is the standing warning for any "universal" drawn from 9 lineages; Maslova (2000) and the genus-sampling tradition on
non-independence of languages (Galton's problem); Zipf's law and its reproduction by random typing (Miller 1957; Li
1992); Heaps' law; Clauset, Shalizi and Newman (2009) on fitting power laws; Horton and Strahler ordering of trees and
its generic appearance in branching processes (Strahler 1957; Shreve); burstiness and long-range correlation in text
(Altmann et al. 2009; Montemurro and Pury 2002); dependency-length minimisation (Futrell, Mahowald and Gibson 2015); the
case/order trade-off (Blake 2001; Sinnemaki 2008; Gibson et al. 2013); Everett (2005) and replies on recursion;
Dixon (1977), Croft (2001) and Hengeveld (1992) against universal adjective and adverb classes; Levin (1993) and
Kipper et al. on verb classes defined by behaviour. EO's own record already refutes recurrence-alone admission and
company-as-act, and records that deriving a cell from a passage is a refuted move (95.7 percent of cell assignments
survived shuffling words inside 2,527 paragraphs; THE-27-CELLS section 1; THE-THREE-MATHEMATICS section IX): these are
**not** re-litigated as discoveries; they are used as calibration claims (section 6.8).

---

## 2. What is on disk now (the evidence base, as read 2026-10-05, still growing)

Everything in this section was read from disk by the architect except the items marked (SIBLING), which are a pilot
written by another workflow in `/private/tmp/claude-501/barker/` and are treated as scout output: used to constrain the
design, never as a finding.

### 2.1 Systems

**Natural languages.** `priors/role-config-*.json` exist for 34 stems = **33 languages** (cmn and cmn-hans are one language
in two scripts and are a built-in script-twin control): arb bul cat ces cmn cmn-hans deu ell eng fas fin fra glg heb hin hrv
ind ita jpn kor nld pol por ron rus slk slv spa srp swe tur ukr urd vie. The count ROSE during this design (ces, srp, hrv, slk,
slv, ron, cat, glg landed), which is why the S-prospective split exists. `pos-*` has 42 files (extra: `en` beside `eng`, lat,
grc, san, and four `*-unimorph` second-giver files for fas, grc, jpn, san); `frame-*` 34; competence cards r0 (27), r1 (26), r2 (28), r3 (11),
r4 (6), r5 (31) under `/private/tmp/claude-501/competence/`. Treebank train files are under
`/private/tmp/claude-501/tb/<stem>/train.conllu` and held-out gold under `/private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu`
(`eval/competence/lib.mjs::TB_DIR, EVAL_DIR, parseConllu`). `tb/cat` and `tb/glg` landed while this was being written; a system whose train file is absent at a
run is a typed gap in the manifest, never a silent exclusion. **Trap, recorded:** `tb/kor` is UD_Korean-KAIST while the kor priors are
UD_Korean-GSD (`tb/kor-gsd`); a system id pins a treebank file hash, never a stem. The two Korean treebanks are the
within-language treebank-convention control; cmn/cmn-hans is the within-text script control.

Two tiers of genealogy, both ANSWER KEYS (never features). A **branch** (13 strata) is the BLOCKING unit for nulls, leave-one-branch-out
folds and jackknives. A **lineage** (9: Glottolog top-level families) is the INDEPENDENCE unit for every sign test, every cluster bootstrap and
every sentence that says "across families". The first draft of this document called the branches "Glottolog top-level families"; that was
wrong, because Slavic, Romance, Germanic, Indo-Iranian and Hellenic are five branches of ONE lineage (review finding F9, section 11).

| Lineage (independence unit) | Branch (blocking stratum) | Systems | n |
|---|---|---|---|
| Indo-European | Slavic | rus ukr pol bul ces slk slv hrv srp | 9 (hrv, srp near-identical; slk/ces close) |
| | Romance | spa ita por fra ron cat glg | 7 |
| | Germanic | eng deu nld swe | 4 |
| | Indo-Iranian | hin urd fas | 3 (hin/urd near-identical in speech, differ in script) |
| | Hellenic | ell | 1 |
| Afro-Asiatic | Semitic | arb heb | 2 |
| Sino-Tibetan | Sinitic | cmn(+hans) | 1 |
| Japonic | Japonic | jpn | 1 |
| Koreanic | Koreanic | kor | 1 |
| Turkic | Turkic | tur | 1 |
| Uralic | Uralic | fin | 1 |
| Austronesian | Austronesian | ind | 1 |
| Austroasiatic | Austroasiatic | vie | 1 |

Indo-European is 24 of 33 languages (73 percent). **The effective sample for any "across families" claim is U = 9 lineages**; the five IE
branches are internal replication nested inside ONE lineage. For a claim that must hold outside Indo-European it is 8 lineages (9 systems,
Semitic having 2). The sign test over 9 lineages needs 8 of 9 (p = 0.0195; 7 of 9 gives 0.090); over the 8 non-IE lineages it needs 7 of 8 (p = 0.035);
it is unreachable below 5 lineages (4.6). **Nested averaging** (systems within a branch, branches within a lineage) is how every pooled statistic and
every loss is computed, so Slavic's nine do not outvote the singletons and Indo-European counts once. Leave-one-BRANCH-out on an IE branch still has IE
relatives in training (a cross-branch, within-lineage transfer: deeper than a family, not lineage-independent); leave-one-LINEAGE-out for IE is the
S-macro split. Leave-one-branch-out on a singleton is leave-one-language-out with no relative in training, which is the point; it is also a
one-system test, so individually underpowered, and only the sign test across lineages carries weight.

**Code.** `priors/code-kw-{js,py}.json` (tree-sitter keywords; js has 43 hard keywords and 0 soft); `code-name-{c,go,js,py}`
(3 to 48 files, 2 to 10 repos each: thin); `/Users/mlacy/Documents/3.0/ethos/derived-priors/code-priors/*-language-law-prior-v1.json`
for 20 languages (bash c c-sharp cpp css go html java javascript json php python ruby rust typescript, and five non-Latin or
esoteric: aheui ezhil nadesiko qalb wenyan), each with its giver (the language's tree-sitter `node-types.json`, or its own
interpreter's source, or CPython introspected). These give INVENTORY features (counts of keywords, operators, node types,
precedence levels), not distributions. The local source corpus is thin (107 inventoried files: 17 C, 4 Go, 3 Python...),
`coding-competence` has no cards yet, so distributional AST features are a typed gap for all but a few languages. The
venv at `/private/tmp/claude-501/venv` has `tree-sitter 0.26.0`, `tree-sitter-language-pack`, `numpy`, `pandas`; no `scipy`.
**EO-contamination found in the code priors:** `wenyan-language-law-prior-v1.json` carries `grammar.byFace` and
`counts.existence/structure/interpretation`, a hand-grouping of its keywords into EO's three domains. Those fields are
EO-shaped and are on the ban list (section 3.4).

**Notation.** `/private/tmp/claude-501/notation/survey/` is a FEASIBILITY survey: 120 HTTP-header/2 KiB head files and 121
sample heads (chess, Go SGF, SMILES, ABC, Metamath, braille, IPA, heraldry, dance, circuits, Esperanto and Lojban, the genetic
code, bee waggle...), `json/` empty. No notation corpus is measurable now. Note the file prefix `eo_` there is **Esperanto**, not
Experiential Ontology; the EO-free scan must not be fooled either way.

### 2.2 Received priors Barker may read (all by giver)

| Prior | Giver | What it is to Barker |
|---|---|---|
| `pos-<stem>` (`POSPrior@1`) | UD treebank train | form to UPOS counts, ambiguity kept (eng: 2,116 of 16,654 forms ambiguous) |
| `frame-<stem>` (`FramePrior@1`) | UD train, hapax forms | UPOS distribution of hapax forms by (previous majority class, next majority class) |
| `role-config-<stem>` (`RoleConfig@1`) | UD train via `scripts/build-role-config.mjs` (max-statistic marker null; its header cites S122) | object/subject before/after counts, `dominantSide`, `reliability`, `usable`, discovered marker or none |
| `morph-cues-*`, `proclitics-*`, `enclitics-*` | UD/UniMorph via khora builders | morphological and clitic inventories |
| `code-kw-*`, `code-name-*`, code-priors | tree-sitter grammar, scanned repos, interpreters | keyword and declaration inventories |
| competence cards `r0..r5` | **khora's own instruments on UD dev gold** | outcomes of the SYSTEM UNDER TEST: object of study, never gold |

**EXCLUDED as EO-shaped inputs** (read only by `eo-claims.mjs`, and only as system under test): `ethos/derived-priors/case-priors/*`
(built through `kernel/cube.js::grammarCell`), `act-priors/act-prior-en.json` (VerbNet through EO's declared class-to-act table),
every `*.eot.json` file, the `byFace` fields of the code priors, anything from `adapters/text/phasepost.js`,
`the-fold/relation-kinds.js`, `kernel/cube.js` projections, `hyperlexicon`.

### 2.3 What a sibling pilot already found (SIBLING; unverified by the architect)

A Python pilot (`/private/tmp/claude-501/barker/work/`, `PREREG-profile-v0.md`, sha256 `ea27f3027ceac628...`, six dated
addenda, `analysis_report.txt`) pre-registered a 49-feature profile and gates. Its reported results, which constrain this
design:

- G0 (its parser equals the received priors' counts on 23 stems with identical source): PASS. G4 (noise floor at 8,000-word
  halves: self closer than any other language for 10 of 10): PASS. G5 (word-order shuffle destroys direction features;
  dependency length rises 10 of 10): PASS. K-facts (12 textbook sign-level facts): 11 hold; one (head_final_all separates
  Japonic/Koreanic/Turkic from Romance) fails, a statement about UD conventions as much as about the languages.
- G1 relatedness cohesion on 10 languages: 7 of 10 nearest neighbours in-group (Romance 4/4, Slavic 3/3, the typological trio
  jpn-kor-tur 0/3), permutation p = 0.0130 against a pre-registered 0.01: FAIL. G2 within/between ratio 0.611, p = 0.0005, but
  the trio's ratio 1.124 exceeds 1: FAIL. **G6, the planted-structure power check on word-order typology, FAILED**: re-linearising
  Spanish head-final moved it NOT closer to the head-final centroid. The profile, as one concatenated z-distance, does not carry
  word-order typology as a cluster-defining coordinate when it is mixed with lexical, boundary and recurrence groups.
- Extended 25 languages: 13 of 16 family members have a same-family nearest neighbour (p = 1e-5). Two out-of-sample Slavic
  arrivals: ces hit, srp missed.

**Design consequences (binding):** the profile is built in GROUPS and kinds are induced PER GROUP and compared across groups
(section 4.2), not as one concatenated vector; a typology claim carries its own planted-typology power check on its own
feature subset; the profile reproduces genealogy strongly, so a regularity must be shown WITHIN families and across them,
else it is a family label wearing a statistic; and any system arriving after the freeze is a pure held-out set (section 3.6).

### 2.4 The inducer, probed (architect's reproduction, 2026-10-05)

`kernel/entity-kind-induction.js::induceEntityKindCandidates` (Kanada's engine, via `kernel/kind-induction.js`) was run
by the architect on synthetic systems-by-features matrices (scratch `v1.mjs`, not in the repo):

| Probe | Result |
|---|---|
| Structureless control (each feature column permuted across 50 entities, marginals kept), 40 shuffles | **9 of 40 produced at least one candidate the organ marks validated** (`field.stable`); **31 of 40 carried a `fallbackNomination`**. The sibling's runs: 20 of 100 validated, 77-80 of 100 fallback. The organ's own per-basin null is not a resolution test (II.23); S41 says the same of giant basins. |
| Planted two-family world, 25 systems per family, 6 signature features per family at strength 0.3 / 0.5 / 0.8, 10 replicates | detected 0/10, 0/10, 0/10. The sibling's world (12 signature features per family) detected 9 of 10 at 0.8 and 0 at 0.5 or below. **Power depends on the number of signature features, not only their strength; the power grid in section 4.4 therefore varies both.** |
| Evidence without `sequencePosition` | silently dropped at ingest (`ingestFeature` returns false); duplicate evidence ids collapse; a numeric `0.5` and a string `"0.5"` are different signatures. |

**Consequence:** Barker never reads a candidate flagged `fallbackNomination`, never trusts `cohesionNull.passed` as a
verdict, tests only the SMALLER side of a basin (a basin larger than half the population is its complement's complement:
the statistic is insensitive to its own perturbation, S41), and wraps the organ in a search-aware ceiling (section 4.3).
With about 33 systems in 9 lineages (13 branches), **the honest expectation is that only strong, coarse structure (script, spacing,
head-direction) is detectable**; the power cards decide which finer claims are UNDERPOWERED before any real-data statistic
is looked at.

---

## 3. THE SYSTEM PROFILE contract

<!-- PREREG:BEGIN -->

### 3.1 Units, groups, and the three rules

A **system** is one measured symbolic system with a pinned data file: a language-with-treebank, a programming language with a
grammar (and a corpus if one exists), a notation with a corpus. The unit of induction, of splitting and of replication is the
system; the unit of independence is the lineage (2.1).

`SystemProfile@1` (`organs/barker.js::makeSystemProfile` validates and freezes; `eval/barker/profiles.mjs` builds):

```
{ schema: "SystemProfile@1",
  id: "nl:ces@sha256:ab12..." | "code:python@grammar:..." | "notation:...",
  kind: "nl" | "code" | "notation",
  inputs: [{ path, sha256, role: "train"|"dev"|"test"|"grammar"|"prior"|"card" }],
  labels: { family, script, macroarea, typedBy, giver },   // ANSWER KEYS. Never read by an instrument as a feature.
  budget: { N, halves: 2, seeds: [1,2,3,4,5], unit: "non-PUNCT UD word" | "char" | "token" },
  cells: { [featureId]: FeatureCell },
  gaps:  [{ feature, reason, denominator: { have, need } }],
  eoFree: true,                       // assertEoFree(profile).ok, recomputed on load
  contentHash }                       // stableHash of cells + inputs

FeatureCell = { id, group, channel, value, n, ci95: [lo, hi] | null, resamples: [v1..vk],
                definitionId, builder: "profiles.mjs@<digest>#<fn>", giver, floor: { rule, used } | null }
```

1. **Zero-model.** No LLM call, no embedding, no network, no model-derived label in any cell or any score. A source scan over
   the Barker files rejects imports of `kernel/model-server.js`, `kernel/mouth.js`, `node:http(s)`, `fetch(` (section 8).
2. **EO-free.** No cell, feature name, bin label or signature may contain a ban-list token (3.4), and no profile module imports an
   EO module. Cells are computed from raw text, UD annotation, tree-sitter grammars, or received priors whose givers are
   non-EO.
3. **Provenance per feature.** `giver` (who made the gold or the grammar), `channel` (3.3), `builder` (module and function
   digest), `inputs[].sha256`, `n` (denominator), `ci95` (cluster bootstrap over sentences, 1,000 resamples), `floor` (the rule
   that gated a cell and the value used). A cell that cannot state all of these is a gap, not a feature.

### 3.2 Feature groups (v1 core)

v1 adopts the pilot's definitions by reference (`PREREG-profile-v0.md` section 2, ids `a01..e06`, `t2_*`) and restates them in
one line here; where v0 typed a constant, v1 declares the derivation or marks it PROVISIONAL (3.8). Annotation tier: **R** raw
text only; **T** UPOS-derived; **D** dependency-derived; **M** FEATS-derived; **G** grammar/inventory.

| Group | Features (id: definition) | Tier | Channel |
|---|---|---|---|
| **A typological** | `a01..a11`: P(dependent precedes head) for base deprels nsubj, obj/iobj, case, amod, nmod, aux, acl, mark, det, advmod, cop; cell defined iff at least `floor` arcs. `a12` head_final_all. `a13..a17` presence rates per 100 words (case, det, aux, mark, cop). `a18/a19` non-projective sentence/arc share. `a20` UPOS entropy (bits). `a21` whitespace chars per UD word in `# text` | D (a20 T; a21 R) | `ud:deprel`, `ud:upos`, `raw:udtext` |
| **B hierarchical** | `b01` mean tree height; `b02` mean depth; `b03..b08` depth histogram shares (1,2,3,4,5,6+); `b09` branching of non-leaf nodes; `b10` leaf share; `b11` clause-embedding depth (arcs ccomp xcomp advcl acl csubj on a root path); `b12` subtree-size tail slope; **new** `b13..b16` Strahler-order node counts N1..N4 normalised, bifurcation ratio `Rb`, with bootstrap interval | D | `ud:deprel` |
| **C boundary** | `c01` boundary_gap: held-out surprisal (bits) of a character given the previous two, mean at unit-initial minus unit-internal positions, order-2 Witten-Bell interpolation to a uniform floor (parameter-free), 2-fold by sentence; `c02` h2 bits/char; `c03` h0 bits/char; `c04` zlib bits/char. **new** `c05` shifted-boundary peak: the same gap at offsets -2..+2; peak at 0 is the claim that the boundary carries information | R (c01 uses gold unit boundaries; `c01s` variant uses whitespace only, defined for spaced scripts) | `raw:udtext`, `ud:tok` |
| **D recurrence** | `d01` Zipf exponent by discrete maximum likelihood with x_min chosen by KS minimisation (Clauset, Shalizi, Newman); `d02` Heaps beta at n in {1k,2k,4k,8k,16k}; `d03` hapax types share; `d04` hapax tokens share; `d05` type-token ratio; `d06` top-10 mass; **new** `d07` burstiness B and `d08` Hurst exponent of the indicator series of the 50 most frequent types (DFA), against a within-document shuffle | R/T | `raw`, `ud:tok` |
| **E inventory** | CLOSED = {ADP, AUX, CCONJ, DET, PART, PRON, SCONJ}, OPEN = {NOUN, VERB, ADJ, ADV, PROPN, INTJ}: `e01` closed share; `e02` closed types per 1,000 words; `e03/e04` dev-set coverage of closed / open forms seen in the sample; `e05` gap e03-e04; `e06` hapax-share gap. **new** `e07` ambiguity: share of forms with more than one UPOS and the entropy of their tag distribution (from `pos-<stem>`); `e08` closed-class knee: location of the maximum of the closed-minus-open separation in the (log frequency, context diversity) plane | T | `ud:upos`, `prior:pos-<stem>` |
| **F morphology** | `f01` FEATS per token; `f02` Case share of nominals; `f03` forms per lemma; `f04` multiword tokens per 100 words; `f05` verb agreement share (Person/Number on finite verbs); `f06` Definite or Det marking rate; `f07` Tense marking rate | M | `ud:feats` |
| **G role-marking** | `g01` order-entropy: H(order given sentence), `g02` case-marking share of core roles, `g03` adposition share of core+oblique roles, `g04` agreement share; `g05` role identifiability: I(role ; order, case, adposition, agreement) / H(role) with plug-in estimate and Miller-Madow correction, cluster bootstrap | D+M | `ud:deprel`, `ud:feats` |
| **H code inventory** | `h01` keywords; `h02` soft keywords; `h03` distinct operators; `h04` node types; `h05` precedence levels; `h06` block-delimiter class (brace, indent, keyword-end, none) DERIVED from which anonymous tokens the grammar declares; `h07` Latin share of keyword characters | G | `grammar:<giver>` |
| **I code distributional** | node-type tree statistics `b01..b16` computed on tree-sitter ASTs; identifier recurrence `d01..d08` on identifier streams; keyword-share of tokens; declaration-name prior features (`code-name-*`) | D/R | `ast:tree-sitter`, `raw:src` |
| **T targets** (never predictors for the claim they define) | `t01` role-config: object before/after counts, `dominantSide`, `reliability`, `usable`, marker presence/precision; `t02` subject likewise; `t03` card outcomes r1 margin, r2 margin, r3 gap reasons (`script_without_case`, `ear_inert_not_needed`); `t04` frame-prior distribution | prior/card | `prior:role-config-<stem>`, `card:r<k>` |

A cell of group T is an outcome of a SYSTEM UNDER TEST (cards) or a received prior; transfer (section 5) predicts it from
groups A-I excluding any cell derived from the same arcs (`a01`, `a02` and the position features that define role-config
are removed from the predictor set of the role-config task; the "leaky variant" that keeps them is reported as a
diagnostic, labelled).

### 3.3 Channels and independence

A **channel** is (annotation layer, giver): `raw:udtext`, `ud:tok`, `ud:upos`, `ud:feats`, `ud:deprel`, `prior:pos-<stem>`,
`prior:pos-<stem>-unimorph` (UniMorph is a second giver for fas, grc, jpn, san: the one place two independent givers describe
one language), `grammar:tree-sitter`, `ast:tree-sitter`, `raw:src`, `card:r<k>`. A regularity seen only in channels with a common
ancestor (the same treebank under two layers; a prior and the treebank it was built from) counts as ONE reading. The
independence audit (section 7, S7) computes the effective number of independent channels as the rank of the shared-ancestor
matrix and demotes accordingly. This is `organs/signal.js`'s own rule ("two sources through one instrument are one
reading") applied to systems.

### 3.4 The EO ban list and the contamination scan

`assertEoFree(profile)` rejects any feature id, group, bin label, signature, definitionId or builder string containing (case
insensitive, token-bounded) any of: `NUL SIG INS SEG CON SYN DEF EVA REC`, `Ground Figure Pattern`, `Existence Structure
Interpretation` (as category words), `Differentiate Relate Generate`, `Void Beings Fold`, `phasepost`, `byFace`, `cell`,
`operator` (as EO's term), `stance`, `terrain`, `grain` (as EO's term), `kind:basin` (an inducer output may never be an input
feature), and any key of `CELL_OF_GRAMMAR`. The scan is run on every load, and `tests/barker-profile.test.js` plants a
contaminated cell and requires rejection. Words like "structure" in free text definitions are not tokens of the ban list;
the ban is on identifiers and labels.

### 3.5 Budgets and resampling

Fixed-budget features use `N` = the largest multiple of 1,000 not exceeding the smallest non-PUNCT train word count among the
included systems (v0: N = 16,000, from vie's 20,215 tokens); a system below `N` is excluded from fixed-budget groups with a
typed gap, never given a smaller `N` than the rest. Per system, per seed s in {1..5}: shuffle sentences with the seeded RNG
(`kernel/rng.js::createSeededRng({seed:s, system, purpose:"sample"})`), fill half A until at least N/2 words, then half B; the
profile value is the mean over seeds of the union, and the five-by-two resamples are kept in `resamples[]` (they are the
evidence ids of section 4.1 and the noise estimate of every stability test).

### 3.6 Splits (all pre-registered)

| Split | Definition | Used by |
|---|---|---|
| **S-sentence** | five seeds x two disjoint halves per system; feature channel and target channel never share a half | stability (S1), channel-disjoint prediction |
| **S-branch (LOBO; written LOFO elsewhere)** | fold j = all systems of branch j; 13 NL folds (Slavic 9, Romance 7, Germanic 4, Indo-Iranian 3, Hellenic 1, Semitic 2, and 7 singleton lineages). Everything fitted (bin cut points, kinds, regressors, thresholds) is refitted on the other folds. Fold losses are aggregated by nested averaging to 9 LINEAGE losses | transfer (5), arch persistence (4.6) |
| **S-lineage (LOLO)** | the same, holding out a whole lineage (for IE, 24 systems against 9 in training: this is S-macro below); reported beside S-branch, never instead of it | the hardest independence claim |
| **S-macro** | train Indo-European (24), test the 8 non-IE; and the reverse (8 train, 24 test; reported as underpowered by design) | the hardest generalisation claim |
| **S-code** | folds: brace-delimited {c cpp c-sharp java go rust javascript typescript php}, indentation or keyword-block {python ruby bash}, markup and data {html css json}, non-Latin or esoteric {aheui wenyan ezhil nadesiko qalb}; typed by the architect from the languages' own references (giver: the references; sensitivity: folds re-derived by clustering `h06`) | code transfer, where measurable |
| **S-prospective** | any system whose file first appears (manifest `firstSeen`) after the freeze timestamp. It is NEVER used to choose a bin, a threshold or an alternative, and every prediction on it is scored exactly once, in `run.mjs --prospective` | the confirmatory set; the data tree is growing (ces, srp, hrv, slk, slv, ron, cat arrived during this design), so there will be one |
| **S-twin** | within-system controls: cmn vs cmn-hans (same text, two scripts), kor-GSD vs kor-KAIST (same language, two treebanks), UD vs UDHR text of the same language | annotation-convention and script nuisance |

**Non-independence (Galton).** Any significance computed over systems as exchangeable is anti-conservative. Therefore: (i)
nulls that permute systems permute WITHIN branch strata unless the claim is about branches or lineages; (ii) tests report the sign test
across LINEAGES as the primary statistic, with n = number of lineages that have the quantity defined (4.6 reachability table); (iii) cluster bootstrap
resamples lineages after nested averaging; (iv) areal contact (Balkan, Sprachbund) and borrowing are NOT modelled and are listed as risk R4.

### 3.7 The system list now (manifest)

`eval/barker/profiles.mjs::discoverSystems()` writes `/private/tmp/claude-501/barker/out/manifest.json`: one row per system
with the sha256 of every input, `firstSeen`, tier availability (R/T/D/M/G), the family label, the script (DERIVED: Unicode
script shares of the train text, dominant script plus the share vector; not typed), and the gap list. At reading time:

| Class | Systems | Tiers measurable now | Not measurable now (typed gap) |
|---|---|---|---|
| NL-full | every language above that has a `tb/<stem>/train.conllu` and `ud-eval/<stem>/dev.conllu` (all 33 at the last listing, subject to the manifest check) | R T D M G, t01-t04 | cards for some rungs |
| NL-partial | any stem with priors but no train or dev file at the run | T from priors | D, M, R-from-train |
| NL-priors-only | lat, grc, san | T (POS only; r2 cards exist) | D, M, t01 |
| Code-grammar | 20 languages (law priors) | G | B, C, D, I (no corpus); EO-shaped `byFace` banned |
| Code-corpus | c (17 files), go (4), python (3), js (48 name-prior files), cpp 3... | thin: I partial | everything needing more than 5 repos per language |
| Notation | 0 | none | all (heads only) |

### 3.8 Typed numbers, listed (P4: a bare integer is provisional)

| Constant | Value | Status | What would derive it |
|---|---|---|---|
| alpha | 0.05 (`adapters/text/keyness.js::KEY_ALPHA`) | repo-declared | per-battery Holm correction on top (section 6.0) |
| null draws | 999 | declared; p floor 0.001 so Holm over about a dozen tests is attainable | none; the floor is the point |
| bootstrap resamples | 2,000 cluster bootstrap over lineages or lemmas; 1,000 over sentences | declared | convergence check reported |
| seeds | resamples {1..5}; null seed `SEED = 20261005` mixed with test id and purpose through `seedFrom` | declared | none |
| binning | median split (2 bins), tercile split (3) as sensitivity; the bins of one feature are a BLOCK that every null moves as a unit (4.3) | PROVISIONAL | the bin count maximising held-out kind stability inside the ceiling's search |
| **SESOI, one per test** | the table in 6.0a and 4.7a (EO-1 S1 0.02 bits per token; EO-2 0.05 above chance; the 13 arch cards; the L-tasks 5 percent relative) | PROVISIONAL until signed (Appendix B5); written BEFORE any power card | a decision-relevant unit named by the claim's defender; sensitivity at half and double is printed, never selected from |
| copula nulls | Ledoit-Wolf analytic shrinkage; one-factor variant unshrunk; D = 999 (report), 99 (calibration worlds), 49 (continuum grid) | declared | convergence check; the calibration worlds measure the realised false-kind rate |
| calibration worlds | 200 copula worlds per group; 100 continuum worlds per grid cell; rejection by exact binomial test at 0.05 against alpha (16 of 200; 10 of 100) | declared | none: a rule on the rate, not a threshold on a statistic |
| lineage reachability | the sign test needs at least 5 defined lineages; passing counts 5/5, 6/6, 7/7, 7/8, 8/9 | derived (binomial) | none |
| cell floor (arcs) | 30 | PROVISIONAL (v0) | smallest n whose Wilson half-width meets the consuming test's SESOI |
| feature-value floor (tokens) | 100 | PROVISIONAL | likewise |
| Kanada `bondQuantile` .75, `minAffinity` .12, `quantile` .95, `neighborCount` ceil(sqrt n) | the organ's own defaults | PROVISIONAL (organ's) | `neighborCount` sensitivity is mandatory output (2 to 6): a level count that moves with the knob is a knob artifact |
| Xunzi depth thresholds | {2,4,8,16} | PROVISIONAL (organ's) | powers of two up to the system's own 99th percentile |
| family for code | the typed list in S-code | typed | cluster on `h06` |
| EO-1 lemma floor (5 held-out tokens), frame vocabulary (top 32), oblique-marker vocabulary (top 20), Ward k range 2..40 | as stated | PROVISIONAL | sensitivity at half and double reported, never selected from |


---

## 4. THE INDUCTION PIPELINE (B): kinds, and candidate arches

### 4.1 Three levels of entity, one family of organs

Kind induction in khora takes **entities with features** (`kernel/kind-induction.js`, Kanada: "a kind is induced from what its
instances share, nothing declared in advance") and returns candidate kinds. Barker runs it at four levels; each level names its
entity, its features, the organ that takes them, and where the labels that are NOT features live (as gold, afterwards).

| Level | Entity | Features (label-free) | Organ(s) | Gold used only AFTER induction |
|---|---|---|---|---|
| **S** kinds of systems | a system (33 languages; 20 code grammars; notations later) | binned signatures of profile cells, group by group (section 3.2) | `induceEntityKindCandidates` (Kanada), `characteristicSetKinds`, Barker's spectral splitter, all under one ceiling (4.3) | family, script (answer keys); rival partitions registered as explicit classifications |
| **R** kinds of relations | a (system, deprel-base) pair with at least `floor` arcs (about 700 entities across 33 languages) | direction, dependent and head UPOS profile collapsed to closed/open + top classes, mean dependency length, dependent subtree size, valency of head, projectivity, depth: all as binned signatures; the deprel LABEL is the entity's name, never a feature | `induceEntityKindCandidates` on a feature index built with `kindEvidence`/`createKindInductionIndex`; `induceKindsAndFunctions` for the one-valuedness ledger (A11) | UD deprel labels (NMI), UD relation inventory size |
| **W** kinds of word types, within one system | a word type of one system (5,000 to 25,000) | company: `before=`/`after=` neighbours on gold-tokenised text | `organs/kind-standing.js::discoverCompanyKinds` with its `nullArm` (within-phrase shuffle, declared `draws, seed, alpha`), `contextVectors`, `kindMembership` | UPOS; closed/open |
| **K** kinds of kinds | an induced kind from R or W, described by a LANGUAGE-FREE descriptor (share closed-class among members, median frequency rank, dominant head direction, mean out-degree, mean subtree size) | the descriptor, binned | the Level-S organs; the resemblance graph (A13 below) | none |

Two caveats written into the card of every induction. (1) `discoverCompanyKinds` splits on whitespace; on unspaced scripts
(cmn, jpn) it is fed GOLD tokens joined by spaces and the channel is stamped `ud:tok`, never `raw`. (2) `kindEvidence`
silently drops entries without `sequencePosition` and collapses duplicate ids; `barker.js::featureIndexOf` assigns
`sequencePosition` explicitly, asserts the entity count it built equals the entity count the index reports, and records the
difference as a gap.

**The feature index (Level S).** For each system s and signature j (a `featureKey=binLabel` pair such as `e01=hi`), the evidence
count `c[s,j]` is the number of the ten resamples (five seeds by two halves) in which s falls in bin j. The index entry is
`{ signature, featureKey, featureValue, firstAt: 0, lastAt: 0, evidenceIds: Set(<c ids>), witnessRefs: Set([input sha256s]) }`,
so the organ's own `activity = 1 + ln(count)` becomes a stability weight (1 to 3.3) rather than a size. Bins are cut at the
median (and tercile as sensitivity) of the TRAINING systems of the current fold; a held-out system is binned with the training
cuts. **The signatures of one feature (`e01=lo`, `e01=hi`) are one BLOCK**: exactly one is 1 per system, and every null in 4.3 moves blocks, never single
columns. For Levels R, W and K (entities nested in systems) the nulls redeal within system strata, because entities of one system are not exchangeable
with another system's (architect's addition to the review, section 11), and a kind is labelled by the LINEAGE span of its members' systems.

**Rival partitions** (family, script, UD's own inventory, Peirce, the integral quadrants, EO's cells in the battery) enter the
same index as `kindEvidence({ evidenceType: "explicit_classification", kindKey, kindSurface, witness: <giver> })`; the
organ projects them as `received_explicit_classification`, `witnessed: false`, beside the induced ones. Declared and induced
kinds are never merged; they are compared (4.5).

### 4.2 Group-wise induction and the pluralism question

Because the pilot's concatenated vector did not carry typology (section 2.3), kinds are induced SEPARATELY on each feature
group (A typological, B hierarchical, C boundary, D recurrence, E inventory, F morphology, G role-marking; H and I for code),
and on the concatenation as a secondary run. The partitions of systems that different groups induce are then compared
(A12: do independent channels converge on one consensus partition, or on several stable incompatible ones). FoA assumes that
arbitrary pluralism is a stage before a non-arbitrary unity that it expects is waiting to be found (FoA p.60); that
assumption is measured here, not made.

### 4.3 The instrument menu, four nulls, ONE search-aware ceiling, and the kind-versus-gradient discriminator

Let X be the n-by-m binary signature matrix (n systems, m signatures) and `a[s,j] = 1 + ln c[s,j]` the activity. Signatures come in FEATURE BLOCKS:
`e01=lo` and `e01=hi` are one feature's one-hot block (three columns under the tercile sensitivity) and every system has exactly one 1 per block. A
redeal that permutes single columns breaks this and manufactures null systems that are both `hi` and `lo` on one feature, which no real matrix can
be (the null would then differ from the observation in more than one axis, II.10; review F1). **Every null below moves whole blocks.** The strong
correlations among real features (head-direction `a01..a12`, depth shares `b03..b08` that sum to one, Zipf/Heaps/hapax `d01..d06`, morphology `f*`)
survive only the covariance-preserving null, and that is the point of having one.

| Instrument | Statistic T_i |
|---|---|
| **I1 Kanada** | `T_K = max over candidates of (cohesionNull.observed - cohesionNull.threshold)`: the largest margin by which a basin's binding energy (internal minus boundary affinity) exceeds the (1-alpha) quantile of random subsets of ITS OWN size. Eligible candidates only: `fallbackNomination` is never read; `field.stable` required; `memberCount <= floor(n/2)` (a basin larger than its complement is judged as its complement). The size-matched margin was chosen because the raw maximum binding energy FAILED the resolution test in the sibling's probe (real 0.235 against a null maximum 0.386: the giant basins win). |
| **I2 characteristic sets** | `T_C = max lift` over licensed kinds of `characteristicSetKinds(features, {draws, alpha, seed})`, whose own redeal null reruns the whole group-and-merge procedure. Meaningful only on crisp matrices (all-or-none signatures); on noisy matrices it licenses nothing (sibling probe), and that is reported, not hidden. |
| **I3 spectral splitter** (Barker-owned, pure) | `T_S = sigma_1^2 / sum_k sigma_k^2` of the column-centred, column-standardised matrix; split by the sign of the first left singular vector; recurse into each side while the side has at least twice the minimum kind size and its own `T_S` beats its own ceiling (alpha divided by the number of splits tested so far, Holm over depth). The sibling's probe: the sign-split recovered planted kinds at strength 0.3 in 5 of 10 and at 0.5 in 10 of 10 where the flagged Kanada route recovered 0 of 10 at 0.5. **`T_S` and Kanada's binding energy both reward one dominant correlated factor, that is, a gradient.** They stay in the menu because N-cov (below) preserves that factor: against N-cov a plain gradient does not clear the ceiling by it. |

**The four nulls** (run separately; the ceiling takes the largest):

| Null | Redeals | Preserves | Destroys | A kind that survives it has |
|---|---|---|---|---|
| **N-feat** | each FEATURE BLOCK (the bin-label vector, as a unit) permuted across systems, independently per feature | every feature's marginal bin shares and the one-hot structure | all cross-feature co-variation | structure of any kind (the weakest null; never reported alone) |
| **N-cov** | Gaussian-copula draws of the n-by-p CONTINUOUS profile matrix (the `FeatureCell.value`s before binning) with the observed marginals and correlation: per column rank to normal score, Spearman matrix shrunk by the parameter-free Ledoit-Wolf estimator, n iid rows from N(0, R), mapped back through each column's empirical quantiles, binned with the SAME cuts. **N-cov1** (SigClust-style parametric bootstrap, Liu, Hayes, Nobel and Marron 2008): a one-factor model (principal factor plus independent residual variances) fitted to the real matrix and redrawn, unshrunk, because shrinkage biases the draws toward weaker correlation. The ceiling takes the larger of the two | the marginals and the WHOLE correlation structure, so every gradient (analytic to synthetic, spaced to unspaced) | discreteness: gaps, clumps, any dependence beyond second order | a CLUSTER beyond a correlated continuum: the null for "any clustering finds clusters" |
| **N-fam** | feature blocks permuted only among systems of the same BRANCH stratum; the 7 single-system lineages and Hellenic are pooled into ONE stratum "singletons" (so they stay exchangeable lineages instead of being frozen) | branch-level feature composition | within-branch co-variation | structure beyond branch composition. **Informative only for a kind with at least 4 members in multi-system branches**; otherwise the card records `fam_uninformative` (typed) and the kind cannot be labelled CROSS-LINEAGE by this null: the lineage-span rule below carries it |
| **N-curve** (Curveball) | row and column sums kept | co-occurrence at fixed size and frequency | co-occurrence | beyond how many signatures an entity has. Defined ONLY for presence matrices without one-hot blocks (Levels R, W, K; code inventories); NOT applied to Level-S bin matrices, where it would break the blocks |

**The ceiling.** For d = 1..D (D = 999): redeal X into `X^(d)` under every applicable null, run the WHOLE menu on it, record `z_i^(d) = (T_i^(d) -
mu_i) / sigma_i` (mu, sigma the null mean and standard deviation of instrument i over the D draws of that null) and keep `M^(d) = max_i z_i^(d)`. The
ceiling is the largest over the nulls of the (1-alpha) quantile of M. An observed kind found by instrument i passes iff `(T_i - mu_i)/sigma_i > ceiling`,
with `p = (1 + #{d: M^(d) >= z_obs}) / (D + 1)` under the null that set the ceiling. **A kind must beat the maximum over N-cov as well as over
N-feat.** Adding an instrument can only raise the bar (`organs/signal.js`); there is no switch to opt out.

**The kind-versus-gradient discriminator (after the ceiling; review F1 items 4 and 5).** Passing the ceiling says there is structure beyond the
nulls; it does not say the structure is DISCRETE. For each kind that passes:
1. its separating coordinate `u_s` (for Kanada and characteristic-set kinds, the projection of each system on the line through the member centroid and the
   complement centroid in signature space; for spectral kinds, the first left singular vector);
2. the Hartigan dip statistic of `u` (no tuning parameter) and `p_dip` = the share of N-cov draws, each run through the SAME instrument with its axis
   re-derived inside the draw (so the selection of the axis is paid for; in a draw the axis is that of the instrument's top-ranked candidate whether or not it passes), whose dip is at least the observed;
3. the **effective feature dimension** `PR = (sum lambda)^2 / sum lambda^2` of the correlation spectrum, printed beside every kind, every group and
   every null (a group with PR near 1 is one dominant gradient; the number is reported, not a gate).

| Label | Rule |
|---|---|
| **CLUSTER (CROSS-LINEAGE)** | passes the ceiling AND `p_dip <= alpha` AND the smaller side still spans at least 3 lineages after the members of its largest branch are dropped AND is not `fam_uninformative` on that count alone |
| **FAMILY-BOUND** | passes the ceiling but spans fewer than 3 lineages after that drop, or loses where N-fam is informative (genealogy) |
| **GRADIENT** | passes the ceiling but `p_dip > alpha`: a graded latent coordinate, not a discrete kind. Reported as a finding in its own right (it is the A05 graded middle seen in systems), never as a kind |
| REFUSED | the control survived, the basin is the whole population, or the instrument was INSTRUMENT_FAILED in 4.4 |

**Controls built to fail (II.23).** (a) The same pipeline on the BLOCK-permuted real matrix must produce zero kinds above the ceiling at the declared
alpha (`organs/signal.js::REFUSALS.control_survived`, same posture: a survivor means INSTRUMENT_FAILED and no kind is reported). (b) **The covariance calibration**: the whole
pipeline on 200 W-copula worlds per group (4.4): the kind-found rate must not be rejected as "<= alpha" by the exact binomial test; if it is,
INSTRUMENT_FAILED for that group. (c) The planted continuum and planted gap worlds of 4.4. **Whole-population basin:** a basin of size n is refused
before the null is spent (`testKindMembers` already refuses `no_boundary`; `induceEntityKindCandidates` does not, which is proposal P3 in 8.3).

### 4.4 Power cards and calibration worlds: written and run FIRST

`barker.js::plantSystems({ world, branchSizes, strength, signatureCount, noiseCount, commonCount, seed })` generates a CONTINUOUS n-by-p profile matrix
with the real branch-size vector (9, 7, 4, 3, 2 and eight ones; 33 systems) and bins it through the SAME pipeline as the real data (training-median
cuts, one-hot blocks), so binning, blocks and every null are exercised. Three matched worlds:

- **W-kind (planted gap).** One planted kind that SPANS at least 4 branches in at least 3 lineages, and one planted kind inside one branch. Members of a
  kind are shifted by `delta(strength) = Phi^-1((1 + strength)/2)` standard deviations on `signatureCount` signature features (strength 0.3, 0.5, 0.8
  give about 0.39, 0.67, 1.28 SD), 10 common features are shifted for every system, and `noiseCount` = 60 features are independent noise. (The first
  draft planted independent Bernoulli signatures; it is superseded because it never produced a correlated continuum, so no control was built to fail
  on the exact confusion "any clustering finds clusters".)
- **W-continuum (planted gradient, no gap).** ONE latent coordinate `t ~ N(0,1)` per system (variant a: independent of branch; variant b: `t` = branch
  offset plus noise, so it is genealogy-correlated), loading on the same `signatureCount` features with loadings chosen so that the pairwise correlation
  among the signature features EQUALS W-kind's at the same cell (closed form, tested), the same common and noise features. **There is no kind in this
  world.** The pipeline must label nothing CLUSTER (GRADIENT is the correct call).
- **W-copula (the real covariance, no clusters).** Gaussian-copula draws with the real correlation matrix and marginals of each feature group (N-cov, 4.3);
  200 worlds per group, plus a Student-t copula with 4 degrees of freedom (100 worlds, a printed SENSITIVITY, not a gate: heavy-tailed continuous dependence is the likeliest way N-cov could be too kind to the null).

**Grid.** `strength` in {0.3, 0.5, 0.8} x `signatureCount` in {6, 12, 24}; per cell 30 W-kind replicates at D = 99 and 100 W-continuum replicates (each
variant) at D = 49 (p floors 0.01 and 0.02 still resolve alpha 0.05; the ceiling is re-derived at D = 999 for report cells). Every rate carries its
Wilson or Clopper-Pearson 95 percent interval, and every world's `PR` is recorded.
**detected** := a candidate is labelled CLUSTER (ceiling AND dip) and its smaller side has F1 >= 0.9 against the planted membership.
**A cell is admissible iff all three hold:** (i) W-kind power >= 0.8; (ii) in W-continuum, for both variants, the CLUSTER false-call rate is NOT rejected as
"<= alpha" by the exact binomial test at 0.05 (10 or more of 100 worlds rejects); (iii) the continuum call equals the planted truth (GRADIENT or nothing).
A cell where either world fails is INADMISSIBLE: the instrument cannot tell a kind from a gradient there, and a null result there means nothing.
**W-copula calibration (the review's test).** The whole pipeline (menu, ceiling over the four nulls, discriminator) runs on the 200 W-copula worlds of each
group at D = 99; INSTRUMENT_FAILED for that group iff the any-kind rate (any CLUSTER, or any kind above the ceiling) is rejected as "<= alpha" by the exact binomial
test at 0.05 (16 or more of 200; the test's own power against a true rate of 0.10 is 0.86 and is printed). Because a copula draw carries every
gradient the real data carry and no cluster, this is the direct answer to "any clustering finds clusters". The calibration reads the real correlation
matrix and marginals but computes NO kind statistic on the real data; it is an inventory-and-calibration step in R2.
**Minimum detectable effect and SESOI for kinds.** The MDE is the weakest admissible cell. The registered SESOI for kinds (6.0a): a kind of at least 4
systems spanning at least 3 lineages, carried by at least 12 signature features at strength at least 0.5. **A statement of absence ("no kind of type X among
these systems") is licensed only if the SESOI cell is admissible**; otherwise absence is UNDERPOWERED. Every induced kind is reported with its
**detectability class** (the weakest admissible planted cell at which a kind of its observed size, span and signature count would be detected at power 0.8).
The architect's expectation, recorded before any run (section 10): only the strongest cells (strength 0.8, signatureCount >= 12) are admissible with 33
systems, so the SESOI cell is probably inadmissible and nearly all kind absences will read UNDERPOWERED.
Arch cards plant their own structures (4.7); those power cards run before any real-data statistic and are frozen in `cards/power/*.json` with their hash.

### 4.5 Seeds, alpha, draws, outputs

Seeds: resamples {1..5}; every null draw is `createSeededRng({ seed: 20261005, test, purpose, d })` (`kernel/rng.js`; the same
declared-seed practice as `characteristicSetKinds`, which refuses undeclared draws, alpha and seed). Alpha 0.05, D = 999,
cluster bootstrap B = 2,000 (lineages or lemmas), Holm within each battery (applied to pooled-effect tests, 4.6). An induced kind record carries:

```
{ id: stableHash(level|group|instrument|members), level, group, instrument, memberRefs, smallerSide,
  coreSignatures, statistic: { T, mu, sigma, z }, ceiling: { value, nulls: ["feat","cov","cov1","fam","curve"], D, alpha },
  p, survives: { feat, cov, cov1, fam, curve },          // curve null only where defined; fam may be "fam_uninformative"
  gap: { u, dip, pDip }, effectiveDimension: { group, kind },
  status: "CLUSTER"|"FAMILY-BOUND"|"GRADIENT"|"REFUSED", lineageSpan,
  detectability: { strength, signatureCount, power, admissible },
  stability: { ari: [quantiles] },                 // section 7, S1
  frame: <declareFrame id>, giver: "kernel/kind-induction via organs/barker" }
```

Level-S kinds are compared with every registered rival partition by held-out cross-entropy at EQUAL k (6.0): the same rule
that judges EO's cells judges Barker's kinds.

### 4.6 What makes a regularity an ARCH CANDIDATE: the persistence rule

An arch candidate is a regularity R with a statistic `theta` (oriented so larger is more arch-like), a direction, a **SESOI `s_R` in theta's own units**
(4.7a; registered with its justification BEFORE any power card), and a kill rule written BEFORE the run (4.7). The replication unit is the LINEAGE (U = 9;
2.1). `theta_l` is the nested mean (systems, then branches, then lineage) and:

- **`h_l`** (defined precisely; review F9). `h_l = 1` iff `theta_l - median(null_l) > 0` and `h_l = 0` otherwise. That is the SIGN only: a lineage is not asked
  to be significant by itself, because the sign test is the aggregation. **`h_l` is UNDEFINED** (a typed gap that leaves the denominator, never a 0) when the card's
  planted power at that lineage's own system count, token budget and denominators is below 0.8 at `2 s_R`, or when its denominator floor fails. That exclusion is
  decided by the power card BEFORE real data, so no lineage is dropped for what it showed.
- **Reachability.** `n_l` = number of lineages with `h_l` defined; `k` = number with `h_l = 1`. The smallest attainable sign p is `2^-n_l`, so alpha = 0.05 is
  reachable only when `n_l >= 5`; the passing counts are n_l = 9: k >= 8 (p 0.0195); 8: 7 (0.0352); 7: 7 (0.0078); 6: 6 (0.0156); 5: 5 (0.0313). A card with
  `n_l < 5` is UNDERPOWERED BY REACHABILITY and says so.
- **Multiplicity, stated explicitly.** Holm (over the 13 cards) applies to the POOLED-effect test only. The sign test is a replication GATE at alpha, not a
  significance claim: PERSISTENT is a CONJUNCTION of gates, and a conjunction's false-pass rate cannot exceed its weakest member's. Holm on the 13 sign tests
  would require p <= 0.05/13 = 0.0038, which 11 of 13 (p 0.011) and 8 of 9 (0.0195) both fail and only unanimity of 9 (0.00195) passes: PERSISTENT would be
  unreachable by construction, which is not a test. The LIST-level false-arch rate is instead bounded empirically by S6 (section 7), which counts false
  PERSISTENT cards over null worlds.

| Status | Rule (all pre-registered) |
|---|---|
| **PERSISTENT** | (1) the lineage-nested pooled `theta`: its lineage-cluster bootstrap 95 percent interval has LOWER bound above `s_R`, and it beats its branch-blocked null (Holm over the 13 cards); (2) the sign gate: `n_l >= 5` and `k` at or above the passing count; (3) at least 2 channels with distinct givers agree (S7); (4) the control built to fail failed; (5) the card's planted `R` at `2 s_R` is detected at power >= 0.8 at the real n AND its planted `0.5 s_R` is called below `s_R` at rate >= 0.8 (the card can both pass and fail); (6) no registered trivial null (random typing, shape-matched random trees, label permutation) reaches `theta - s_R` (theta exceeds the null's 95th percentile by at least `s_R`) |
| **PERSISTENT-OUTSIDE-IE** | (1)-(2) over the 8 non-IE lineages alone (`n_l >= 5`; 7 of 8 gives p 0.035, 8 of 8 gives 0.0039) |
| **FAMILY-BOUND** | pooled passes, but the sign gate fails, or the pooled effect is carried by one lineage (leave-one-lineage-out drops the lower bound to `s_R` or below): genealogy or areal contact, not an arch |
| **CHANNEL-BOUND** | holds in one channel (for instance UD `deprel`) and not in an independent channel (tree-sitter, a second treebank, UniMorph): a property of the annotation or the instrument |
| **TRIVIAL** | explained by the registered baseline null: reported as recovered prior art, not as an arch |
| **ABSENT** | the 95 percent interval's UPPER bound is below `s_R` AND the planted truth `0.5 s_R` is called below `s_R` at rate >= 0.8 (equivalence power) AND the controls failed: a statement in the units of the statistic, never in units of the planted grid |
| **UNDERPOWERED** | any of: planted power at `2 s_R` below 0.8; `n_l < 5`; the interval straddles `s_R` (significant but unable to exclude a negligible effect, or not significant and unable to exclude `s_R`). No verdict either way |
| **INSTRUMENT_FAILED** | the control built to fail survived |

Unit tests (`barker-registry.test.js`): a planted effect of `2 s_R` is called PERSISTENT-capable at rate >= 0.8; `0.5 s_R` at large n is called ABSENT at rate
>= 0.8; `0.1 s_R` at ten times the real n is NOT called PERSISTENT (rate <= alpha); an effect exactly at `s_R` is called neither PERSISTENT nor ABSENT more
often than alpha each.

"Arch" here means PERSISTENT or PERSISTENT-OUTSIDE-IE, and only about the SYSTEMS measured. Whether FoA's arch is shown is a
separate, weaker statement: the card reports "operationalisation of FoA arch N: status" and never "arch N confirmed".

### 4.7 The arch cards (pre-registered). Each card fixes: the regularity, systems and channels, statistic, nulls, control, planted power, kill rule, prior art, and the architect's recorded P(PERSISTENT)

Common to all cards: units are systems, **replication is by lineage and blocking is by branch (wherever a card below says "family", read lineage for the
sign test and the bootstrap, branch for the null)**, a card whose feature cannot be computed for a system lists the system in `gaps` with the denominator. **Kill
rules written below as "inside the null's 95 percent band" are the first-draft wording; the operative rule is 4.6 condition (6): theta must exceed the null's 95th
percentile by at least the card's SESOI (4.7a).** The per-card probabilities below are the architect's recorded values after the review; section 10.1 repeats them.

**A01 CLOSED / OPEN SPLIT** (FoA arch 5, function-word types, p.57; classes, pp.32-34).
*R:* every system separates a small high-frequency, low-context-diversity, low-ambiguity inventory carrying relational function from a large open inventory, and the cutoff can be DERIVED from the distribution, with the derivation fitted on other families transferring.
*Instrument:* per (form, UPOS) type: log frequency f, context diversity (distinct left plus right neighbour types per occurrence), tag entropy (from `pos-<stem>`). Derived cutoff: the largest r such that the r most frequent types have mean context diversity below the (1-alpha) quantile of the same statistic over frequency-mass-matched random type sets (D = 999, role-config's max-statistic pattern: `scripts/build-role-config.mjs::discoverMarker`). Gold: UD closed UPOS {ADP, AUX, CCONJ, DET, PART, PRON, SCONJ} on `dev`.
*Baselines:* B1 a single global typed rank cutoff (fitted on training families); B2 tag entropy alone; B3 per-language oracle.
*Gain/pass:* held-out F1(derived) - F1(B1) with lineage-cluster-bootstrap CI lower bound above `s_R` and the lineage sign gate (4.6); plus the matched-frequency control (closed coverage exceeds open coverage in frequency-matched dev bins; sign test over cells, ties excluded and counted; the claim "closure, not mere frequency").
*Controls to fail:* UPOS labels permuted within frequency deciles (F1 at chance); monkey-typing corpus with matched Zipf (no closed class by construction).
*Power:* planted corpora with a closed class of share rho in {0.05, 0.10, 0.20} of types; report the MDE.
*Kill:* no gain over B1 means "closed class exists" stays descriptive (TRIVIAL as an arch, since frequency alone separates it).
*Code:* keyword versus identifier needs a corpus (typed gap). *Prior art:* function versus content words. *P(PERSISTENT) = 0.55* (first draft 0.70).

**A02 RECURSION WITH TYPES** (FoA arch 1, universal computation, pp.20-21, 78-80; Chomsky row in Table 4, p.113).
*R:* a small set of relation types embeds in same-type descendants more than tree shape and label frequency alone produce, the embedding mass is concentrated on specific types, and composition-free systems show none.
*Instrument:* `s_t` = share of tokens of relation type t having a same-type proper descendant; statistic `S` = sum of s_t over t weighted by frequency, and `G` = Gini of s over types. UD trees; tree-sitter ASTs where a corpus exists.
*Nulls:* (i) label permutation within each tree (shape fixed); (ii) shape-matched random trees from the system's own arity distribution with its own label marginals.
*Control:* a flat control (sentences re-attached as a single level) must give S = 0; bag-of-words star trees likewise.
*Power:* plant a bracket language with nesting rate p in {0.02, 0.05, 0.10}; report the minimum detectable p.
*Kill:* S and G inside the (i) 95 percent quantile in held-out families. Tautology risk: any hierarchical data can be redescribed as recursive, so only type-concentration and the flat control can discriminate. *Prior art:* Everett 2005 and replies. *P = 0.25* (first draft 0.35).

**A03 HIERARCHICAL COMPLEXITY LADDER** (FoA arch 2, complexity, pp.22-23, axioms p.23; horizontal/vertical/diagonal, p.57).
*R:* node counts by Strahler order fall geometrically with a bifurcation ratio Rb stable across cut depth (the equal-spacing axiom) and differing from a shape-matched random-tree null in a family-consistent way; horizontal (valency), vertical (depth), diagonal (non-projective links) are separable.
*Instrument:* `N_k` by Strahler order k on UD trees and ASTs; fit `log N_k` on k, Rb = exp(-slope); R-squared as the spacing statistic; bootstrap over sentences.
*Null:* random trees matched on size and arity distribution, SIMULATED here (branching nulls give Rb near 4 in the literature; verified by simulation, not imported). *Control:* planted trees with a non-geometric order law.
*Power:* plant Rb in {2, 3, 5}; require recovery inside the interval.
*Kill:* real Rb intervals overlap the matched null in held-out families (Horton behaviour is generic to branching): TRIVIAL. *Prior art:* Strahler, Shreve. FoA's MHC scores BEHAVIOUR; this measures PRODUCTS, so the proxy can fail while MHC stands. EO cites MHC (THE-THREE-MATHEMATICS header), so EO agreeing with an MHC-derived arch is NOT independent. *P = 0.20* (first draft 0.30).

**A04 SELF-SIMILARITY** (FoA arch 3, fracticality, pp.23-25, 80-81).
*R:* arity profiles match across levels after rescaling, and unit-type series show long-range correlation and burstiness that matched random-typing generators do not.
*Instrument:* Jensen-Shannon divergence between arity profiles at consecutive tree depths; `d07` burstiness, `d08` Hurst (DFA) at three levels (character, word, clause).
*Nulls:* within-sentence/file shuffle; monkey typing matched to the rank-frequency (reproduces Zipf by construction); level-shuffled arity profiles. *Control:* a series with Hurst 0.5 must read 0.5.
*Power:* plant a multiplicative cascade or a fractional series with Hurst 0.7.
*Kill:* inside the monkey-typing 95 percent band at 2 or more of 3 levels. Recurrence ALONE is never admitted (EO's own refutation). *Prior art:* Montemurro and Pury; Altmann et al. *P = 0.12* (first draft 0.20).

**A05 GRADED MIDDLE** (FoA arch 4, the included middle, p.25, p.57; also the reading's own ambiguity-preserved design).
*R:* between any two induced word kinds there is a structured set of members belonging to both; the same kind pairs host it across families; the closed/open boundary is a continuum.
*Instrument:* the ambiguity graph from `pos-<stem>` (each form keeps every UPOS it ever had, with counts); edge weight = forms carrying both tags.
*Null:* configuration null (permute tags across forms keeping per-form tag counts and tag marginals). Cross-family recurrence of the top-k kind-pair edges (Jaccard) against shuffled edges. Bimodality of (log frequency, context diversity): 2-component mixture versus 1 by held-out likelihood; a clean gap in at least half the systems kills "continuum".
*Power:* plant ambiguity rate p in {0.02, 0.05, 0.10} between two planted kinds and recover the pair. *Code probe:* the share of tokens that are keyword in one grammar position and identifier in another (soft keywords; py 4, js 0 in `code-kw`): too few for a verdict (typed gap). *P = 0.35* (first draft 0.50).

**A06 LEVELS FROM SURPRISE** (FoA arch 6, integrative levels, p.22 laws, pp.32-34; our r1 ear, "boundary as surprise").
*R:* each system has at least three nested levels recoverable from predictability breaks alone: boundary strength has 3 or more modes aligned with a gold boundary rank (inside a token < token boundary < clause boundary < sentence boundary; AST depth in code); inventories saturate upward.
*Instrument:* local boundary strength at each inter-character gap (surprisal of the next character given the previous two minus the mean within its token); mode count by 2-to-5-component mixture with held-out likelihood; Spearman rho against the gold rank.
*Nulls:* gold rank permuted across gaps within sentence; random boundaries (r1's own arm); within-sentence character shuffle. *Power:* a planted 4-level grammar with known boundary strengths. *Knob check:* the number of modes under a bandwidth/neighbour sweep (the sibling found basin counts moving with `neighborCount` 2 to 6: a count that moves with the knob is an artifact).
*Honest scope:* spaced scripts supply token boundaries free (r1 cards: `ear_inert_not_needed` in 12 of 26), so the recovery claim is informative only for unspaced systems (cmn, jpn) at the token level, and for ALL systems at the clause and sentence level. READING-SPEC S43 already records a surprise-boundary "door" built, measured, refuted and kept as a diagnostic: this card re-asks it as a cross-system regularity and may well replicate the refutation. *P = 0.15* (first draft 0.25).

**A07 ROLE-IDENTIFIABILITY CONSERVATION** (Barker's own derivation step: the same function carried by inverted carriers, FoA pp.77-79; the user's "role-marking strategies").
*R:* the total identifiability of a core role, `R_s = I(role ; order, case, adposition, agreement) / H(role)` (cluster bootstrap, Miller-Madow correction), varies less across systems than independent channel strengths would make it, because the channels TRADE OFF (partial association of order entropy `g01` and case share `g02` negative after controlling family and script).
*Null:* each channel's contribution permuted across systems independently (destroys the trade-off), D = 999, also within family strata; statistic = variance of `R_s` and partial Spearman. *Control:* synthetic languages with independent channels must NOT show conservation; planted trade-off languages must.
*Kill:* variance inside the null band, or partial association not negative in the sign test over lineages. *Prior art:* Sapir; Blake 2001; Sinnemaki 2008; Gibson et al. 2013: if it holds it is RECOVERED. *P = 0.30* (first draft 0.45).

**A08 ZIPF RECURRENCE** (the user's recurrence/Zipf; FoA arch 3 neighbour).
*R:* rank-frequency exponent in the Clauset window varies in a narrow band across families and exceeds what random typing produces.
*Null:* monkey typing matched on alphabet size and space probability; rank-shuffled lexicon. *Kill:* inside the monkey band (mean plus or minus 2 sd). The architect's expectation is TRIVIAL (random typing reproduces it). Kept as a CALIBRATION card: EO's own record refutes recurrence-alone admission, and any other card that leans on recurrence must beat this card's null. *P(PERSISTENT) = 0.10; P(TRIVIAL) = 0.90.*

**A09 UNIT / RELATION / SYSTEM TRIAD** (FoA pp.77-84: static, dynamic, multinamic; unit, relation, system; the nine-state table p.84 has no observable and is a typed gap).
*R:* node types in trees split three ways by measured structure into terminal (unit-like), binary linking (relation-like) and 3-or-more-child collection (system-like) types, non-randomly; system-like types at depth d occur as unit-like children at d+1 (promotion) more often than in matched-arity random trees.
*Instrument:* mixture over node feature vectors (arity, depth, log subtree size, leaf indicator, sibling index) pooled with leave-one-FAMILY-out; k = 2..6 by held-out likelihood; promotion rate against matched random trees.
*Control:* planted 2-role and 3-role grammars must be told apart. *Kill:* k = 3 not preferred over 2 and 4 in at least half of held-out families, or promotion inside the random 95 percent quantile. Note EO asserts the whole-and-part idea itself (THE-WHEEL, THE-ADDRESS section 4), so agreement here is not independent of EO. *P(k = 3 preferred) = 0.10* (first draft 0.15).

**A10 SAMENESS UNDER INVERSION** (FoA pp.77-79 the derivation step; pp.83-85 forward/backward comparison).
*R:* pairs of systems related by an inversion (opposite head direction `a12`, or marker side reversed) share a common core of the induced Level-R kind graph larger than a degree-preserving null; a core shared across 2 or more families is the candidate.
*Instrument:* typed kind graphs per system (Level R kinds, edges = role co-occurrence weighted by arcs); align with arc reversal allowed; statistic = weight of the maximum common core; null = configuration-model graphs with the same degree sequence and kind sizes.
*Controls to fail:* a system aligned with a deliberately scrambled copy of itself must NOT beat the null; aligned with itself it must. *Power:* a planted mirrored pair of synthetic grammars.
*Kill:* cross-family cores do not exceed the null, or vanish when pairs sharing a family or script are removed (kinship, not arch). *P = 0.18* (first draft 0.30).

**A11 FUNCTIONAL-DETERMINATION UNIVERSALS (a ledger, not a test).** Through `induceKindsAndFunctions` each induced relation kind gets, per feature, exactly one of three standings, read off the member systems under the organ's own grain theorem: **unexposed** (no member asserts it more than once: never tested), **refuted** (a member holds two values that disagree: a named counterexample), **candidate** (at least `exposureFloor` members asserted it more than once, all agree, nothing refutes it: defeasible forever). A corpus can refute a single-valued claim and can never establish one, so "established" is not an outcome. The card publishes the ledger with the counterexample systems named; this is the Popperian form of "arches hold across systems" and it is the one place the repo's organ already has the right shape.

**A12 CROSS-GROUP CONSENSUS** (FoA p.60, pluralism and unity).
*R:* independent feature groups induce one consensus partition of systems rather than several stable, mutually incompatible ones.
*Statistic:* inter-group adjusted Rand index (ARI) against a permutation null, and within-group stability under resampling. Refuted-as-unity iff inter-group ARI is not above null while within-group stability is high (several stable incompatible partitions: genuine pluralism). *Power:* planted worlds with one latent partition versus three independent latent partitions. *P(unity) = 0.18* (first draft 0.25).

**A13 THE KIND GRAPH IS NOT A TREE** (Xunzi, `kernel/kind-graph-structure.js`: "kinds relate by resemblance in a graph, never a strict tree"). A test of the organ's own design claim: on the Level-K resemblance graph, the fraction of triples violating the ultrametric (three-point) condition and the four-point delta-hyperbolicity, against an ultrametric null of the same size; if violations do not exceed what noise on a true tree produces, the graph claim is refuted for this material. *P = 0.40* (first draft 0.55). (Feeding Xunzi's ledger directly needs `EOHyperedge@1` entries with `scope.sequencePosition`; its `depthThresholds` default {2,4,8,16} is provisional.)

### 4.7a SESOI for each card (registered BEFORE any power card; PROVISIONAL until signed, Appendix B5)

Each SESOI is in the statistic's own units and carries its justification; the power cards plant AT `2 s_R`, `0.5 s_R` and `0.1 s_R` (not on an unrelated
grid), and sensitivity at half and double each SESOI is printed, never selected from.

| Card | theta (unit) | s_R | Justification |
|---|---|---|---|
| A01 | held-out F1(derived) minus F1(B1), lineage-nested | 0.03 | about one closed-class type in thirty mislabelled; below it a derived cutoff is not worth the machinery |
| A02 | frequency-weighted same-type-descendant share S minus the label-permutation null median (share of tokens); and Gini G excess | 0.02; 0.05 | two percentage points of tokens; a Gini excess of 0.05 |
| A03 | absolute difference of Rb from the shape-matched random-tree null median | 0.25 | a quarter of one branching ratio |
| A04 | Hurst H minus the upper edge of the monkey-typing band | derived at run: one SD of the DFA estimator on the Hurst-0.5 control at the real length (floor 0.03) | derived, not typed (P4) |
| A05 | Jaccard of the top-k kind-pair edges across lineages minus the shuffled-edge median | 0.10 | a tenth of the edge set |
| A06 | Spearman rho of boundary strength against the gold rank minus the within-sentence-permuted median | 0.20 | Cohen's small-to-medium convention |
| A07 | partial Spearman of `g01` and `g02` given branch and script (negative is the claim); and Var(R_s) over its null median | rho <= -0.30; ratio <= 0.80 | Cohen's medium convention; a fifth less variance than independent channels give |
| A08 | Zipf exponent distance outside the monkey band | 0.10 | a tenth of an exponent unit; the card is a calibration card |
| A09 | promotion rate minus matched-random median; held-out log-likelihood gain per node of k = 3 over the better of 2 and 4 | 0.05; 0.01 nats | five percentage points; one hundredth of a nat per node |
| A10 | maximum common core weight over the degree-preserving null median (ratio) | 1.25 | a quarter more shared weight than a degree-matched graph |
| A11 | ledger, no test | n/a | n/a |
| A12 | inter-group ARI minus the permutation-null median | 0.20 | Cohen's small-to-medium convention |
| A13 | ultrametric-violation share minus the ultrametric-null median | 0.05 | five percentage points of triples |

A kind (4.4) has the SESOI stated there. Where a card cannot plant `2 s_R` with the real denominators at power 0.8, it is UNDERPOWERED before it is looked at.

### 4.8 FoA's arches and parts with NO observable here (typed gaps, never "supported")

| Item | Why no observable | What would make one |
|---|---|---|
| Ruliad and multicomputation (FoA pp.29-31, arch 8) | an analogy to a physics programme; no statement of what it is for a given system to exhibit it | an operational definition from its proponents; not available |
| Singularity (arch 9, pp.31-32, 49, 55) | a forecast | none |
| Nine-state phase table and nine ratiocinations (pp.84-86) | each mapping is by analogy | a published procedure that assigns a measurable state to data |
| Matter / life / mind as demonstration domains (arch 7, pp.32-34) | our systems are symbolic artifacts, not tiers of nature | cross-domain systems (genetic code, physical signalling) with measured structure |
| 6W interrogatives (arch 5 part) | only `PronType=Int` PRON versus ADV is readable | interrogative-labelled treebanks per language |
| Transjectivity (arch 4 part) | a subject-object relation, not a distribution | a coreference/perspective-labelled corpus |
| Alderman's six word classes read as onto-epistemic elements (FoA p.28) | measurable only as a PARTITION claim (6 functional classes), done in A01 and in the EO-2 alternatives | none beyond that |

---

## 5. LEARN BETTER (C): transfer, thresholds, donors, structural failures

A gain is claimed only against controls on held-out SYSTEMS, by whole branch, judged by lineage. Four tasks; one gain rule.

### 5.0 The gain rule (all tasks)

A gain is judged on LINEAGES (2.1). Let `loss_l(M)` be the held-out loss of model M on lineage l, by nested averaging (systems within a branch, branches within a
lineage); the folds are leave-one-BRANCH-out (13), so each of the five IE branches contributes a fold and IE counts once. Let `M0*` be the BEST of the non-kind
baselines on that target. Let **`s_L` be the task's SESOI in the loss's own units: a 5 percent relative reduction of `loss(M0*)`** (L1, L3), and a regret
reduction of 0.01 in the outcome's own units (L2) (PROVISIONAL; sensitivity at half and double is printed, never selected from; signature requested in
Appendix B5). **Barker claims a gain on a target iff all of (a)-(e):**

- (a) the lineage-cluster bootstrap (B = 2,000) 95 percent LOWER bound of `mean_l [ loss_l(M0*) - loss_l(M3) ]` exceeds `s_L`;
- (b) `loss(M3)` is below the median of `loss(M4)` (random kinds of the same size profile, 1,000 draws) with p <= alpha after Holm over the task's targets;
- (c) the sign test over lineages on `loss_l(M0*) - loss_l(M3) > 0`, with `n_l` = lineages where the target is defined: 8 of 9 (p 0.0195) at `n_l = 9`, the
  reachability table of 4.6 otherwise; `n_l < 5` is UNDERPOWERED. (The first draft required 10 of 13 branches, counting five IE branches as independent.)
  The sign test is a replication gate at alpha, not Holm-corrected (4.6 explains why);
- (d) the gain survives dropping any single lineage and any single branch (jackknife);
- (e) a PLANTED transfer (target = kind mean + noise, kinds spanning lineages) with effect `2 s_L` is recovered with power >= 0.8 at the real n, AND a planted
  null transfer with effect `0.5 s_L` is called NO GAIN at rate >= 0.8 (the rule can both pass and fail).

If (a)-(e) hold and `loss(M3) <= loss(M5) + 1 SE`: "kinds help beyond a continuous regressor". If they hold and `loss(M3) > loss(M5)`:
"structure helps; the kind is a summary of it, not the mechanism". If the first half of (e) fails: UNDERPOWERED. If (e) holds and the interval's upper bound is
below `s_L`: NO GAIN as operationalised, reported with the numbers. Otherwise UNDERPOWERED (the interval straddles `s_L`). The models:

| M | Model |
|---|---|
| M0 | global mean over training systems (and, separately, mean of lineage means; the better is M0) |
| M1 | nearest SCRIPT: cosine over Unicode-script share vectors (derived), mean of the nearest training system(s); global if none shares |
| M2 | nearest RELATIVE (leave-one-SYSTEM-out only; undefined under LOBO) |
| **M3** | **Barker kinds**: kinds induced on training systems only (4.3, per group and consensus; CLUSTER-labelled kinds only, GRADIENT structure enters as a continuous coordinate in M5, not as a kind); a held-out system is assigned by `kindMembership`-style cosine with the population null at alpha; prediction = mean target of the best-fit kind; `not_member` or `unknown` falls back to M0 and is counted (`no_kind` rate is reported: a model that abstains on half the lineages has not generalised) |
| M4 | random kinds: same kind-size profile, members dealt at random from the training systems, 1,000 draws |
| M5 | continuous regressors on the same features: 3-nearest-neighbour on z-scores, and ridge with lambda from inner leave-one-branch-out |

### 5.1 L1: transfer of a system's parameters (the headline)

**Targets** (`t01`, `t02`, from `role-config-<stem>`): object-before share (`object.before / object.total`), subject-before
share, object marker present, subject marker present, object and subject `reliability`, `dominantSide`. Loss: squared error for
shares, Brier for binary.
**Predictors, STRICT (primary):** groups C, D, E, F plus `a13..a21`, `b01..b16`: NO direction feature (`a01..a12`), because
role-config is built from the same arcs and `a01/a02` ARE the target. **LEAKY (diagnostic, labelled):** adds A. The strict
variant is the realistic one for a low-resource system with raw text and POS but no parser. Greenberg and Dryer's head-direction
correlations are prior art for what the leaky variant will predict; they are not Barker's gain.
**Splits:** LOBO (13 folds, aggregated to 9 lineages), S-macro (IE to non-IE), and LOSO as a second table (M2 allowed). **Prediction recorded:** P(a gain by
(a)-(e) on at least one target in the strict variant) = 0.25 (first draft 0.35: 8 of 9 lineages and a 5 percent SESOI are stricter than 10 of 13 and bare significance); P(M3 <= M5) = 0.25.

### 5.2 L2: derive the thresholds the reading types in by hand

`eval/barker/thresholds.json` (generated at freeze by a scan of `scripts/build-*.mjs`, `adapters/text/keyness.js`, the-fold kind
callers) lists every typed numeric gate with file, line and the OUTCOME function a UD-only instrument can score. First registry
(each only if its outcome is implementable from gold, with the received builder's own value reproduced to 1e-9 at the typed
setting as an integrity check, like the pilot's G0):

| Typed gate | Outcome Y(system, tau) scored on dev gold |
|---|---|
| `build-role-config.mjs` `MIN_VOLUME = 20` | marker discovery: precision and recall of the discovered object/subject marker |
| `min_frame = 5` (`frame-eng` provenance) | held-out OOV UPOS log-loss under the resulting frame prior |
| proclitic `min_count = 100` (`proclitics-heb` provenance), enclitic `min_count = 20` (`enclitics-kor` provenance) | held-out multiword-token splitting F1 (r1's own scoring) |
| r1 `need_share` floor 0.02 | agreement with the confidence interval it gates |

**Method.** Scan tau over a pre-registered grid (powers of two times the typed value); `tau*(s)` = argmax; a **flatness check
first**: if `max_tau Y - Y(typed)` is within the bootstrap SE for at least the number of lineages that makes the sign test
significant, the gate is INERT and no derivation can help (reported as such, and counted as a positive result for the
reading: the typed number is harmless). Otherwise fit `log tau* ~ log N + log vocabulary + zipf alpha` on training families
(LOFO), predict `tau_hat` for the held-out family, and compare REGRET = `Y(tau*) - Y(tau)` for the derived value versus the
typed value, with the gain rule 5.0 (baselines: typed, and the median `tau*` of training families). *Recorded:* P(a derivation
beats typed on at least one gate) = 0.20; P(at least one gate INERT) = 0.70. The builders are read-only: `transfer.mjs` carries
a minimal re-implementation of each outcome function (a second implementation of a received measurement is itself a risk, R7,
mitigated by the equality check at the typed setting).

### 5.3 L3: which prior family to borrow (donor choice for the non-lexical frame prior)

Lexical priors do not cross languages; the FRAME prior does (it is a distribution over UPOS given neighbouring UPOS classes).
**Target:** the held-out language's own OOV tokens on `dev` (forms absent from its train), gold UPOS, with contexts resolved
through the language's own `pos-<stem>` majority classes. **Donor rules:** `D_kind` (training systems in the kind(s) the target is
a member of), `D_global`, `D_script`, `D_random` (same donor count as `D_kind`, 1,000 draws), `D_oracle` (best single donor in
hindsight: an upper bound, never a claim), `D_family` (LOSO only). Donor prior = equal-weight mixture of donor frame tables with
additive smoothing `1 / (|UPOS| x total)`. **Loss:** mean cross-entropy bits per OOV token. **Value of transfer:** `n_even` =
number of the target's OWN train sentences (50, 200, 1,000, 5,000) at which its own estimated frame prior first beats the borrowed
prior; reported with a bootstrap interval; gain rule 5.0. The reading's own r2 card shows the frame arm failing to beat all-nominal
in English (F1 0.8128 against 0.8524), so this task also measures how good ANY frame prior is; if the best donor is worse than
"all nominal" the result is "no donor helps", which is information. *Recorded:* P(D_kind beats D_global) = 0.30.

### 5.4 L4: which rungs fail for a structural reason shared across a kind

**Outcomes** (read-only, from `competence/*.json`): r1 margin sign and gap reason, r2 pass, r3 pass and gap reason, with
`pass: null` kept as its own state. **Question:** do kinds induced WITHOUT the cards predict those outcomes better than script,
family, or morphological type, leave-one-branch-out (aggregated to lineages), exact permutation p within branch strata? **Known structural causes serve
as a positive control on REAL data (power on real data, II.23):** r3 `script_without_case` (6 of 11 cards: arb, cmn-hans, heb,
hin, jpn, kor: five families, one script property) and r1 `ear_inert_not_needed` (12 of 26: spaced scripts supply word
boundaries free). Barker must RECOVER both from raw-text kinds alone (`a21` whitespace per word; caseless share) before any
other outcome is read; if it cannot, L4 is UNDERPOWERED. **Recorded prediction:** P(kinds beat script on any outcome) = 0.10: the
structural kind IS script (a known property), and finding nothing more at this n is the expected result, reported as such.
**Also:** the cards are the SYSTEM UNDER TEST; Barker's use of them is to say where the instrument is structurally inert, never to
grade it.

### 5.5 What Barker emits from C

Only for gains that passed 5.0: a `BarkerPrior@1` PROPOSAL (kind to parameter mean, number of systems, families, interval,
giver `organs/barker`, frame id) written to `/private/tmp/claude-501/barker/out/`, not to `priors/` (which other workflows
own). A failed gain emits nothing and a card saying so.

---

## 6. THE EO FALSIFICATION BATTERY (D)

*EO (Experiential Ontology) is one unification metatheory among others. By FoA's own admission criteria (pp.52-53) it
qualifies: an architectural schema (27 cells = 9 operators x 3 grains, THE-27-CELLS section 1), a processual schema (operators
and modes), a stratification (floors F0-F6 and strata S0-S3, LEVELS.md), ordered universals (the operator chain). That makes it a
unit of comparison, not an exemption. It also means that EO exhibiting arches FoA lists (holons: THE-WHEEL, THE-ADDRESS section 4;
MHC: THE-THREE-MATHEMATICS header, P44/P78) is **not** independent confirmation of either side.*

### 6.0 Battery-wide rules

**Independence.** Gold is UD gold annotation, tree-sitter grammars and ASTs, real parsers, or priors counted from treebanks:
nothing EO produced. EO's instruments (`kernel/cube.js::cellOf/grammarCell/CELL_OF_GRAMMAR`, `adapters/text/phasepost.js`,
`the-fold/relation-kinds.js`, `ActPrior@1`) are the SYSTEM UNDER TEST, imported only in `eval/barker/eo-claims.mjs` and only
inside functions named `underTest*`; the source scan of section 8 enforces it. The competence cards are likewise system-under-test
outputs, never gold.

**Steelman policy, bearing, and the BRIDGE rule.** Each claim is first stated as EO's own documents state it (file and section), then its strongest reading,
then the *bearing* of the test: **DIRECT** (the test reads the thing EO states), **PROXY** (a statistical shadow of it), or **PROXY-BRIDGE** (the test
conjoins EO's claim with an AUXILIARY hypothesis that is Barker's: a failure refutes the conjunction, Duhem-Quine, not EO). A verdict always prints its
bearing and `eoSentence`: a quote of at most 15 words, with file and section, from EO's own text that states the observable the test reads. Before freeze the
EO defender (Appendix B6) writes ONE sentence per test saying which observable would count against the claim; Barker registers it verbatim and hashes it. **Without
a licensing `eoSentence`, REFUTED is not available**: a failure prints as WEAKENED with `bridge: failed`, and a pass prints as SURVIVES with `bridge:
unlicensed`; in either case the result is excluded from the headline tally, so neither a win nor a loss is scored for EO on a hypothesis that is Barker's (rule 9: honesty in both
directions). EO's repeated cautions are part of every claim: cells classify MOVES never content; the wheel and 0/n/1 are "a mnemonic, never an argument" and
"numerology as flag, not evidence" (THE-WHEEL, last list); a stance is a proven instantiation, not a proven isomorphism (THE-THREE-MATHEMATICS section VI.2).
**Consumed data.** A language, treebank or table the claim's authors consumed in deriving or revising the claim is not out-of-sample for it. Every result row
carries `consumed: false | true | near`; the headline uses `false` only and the others are printed apart (6.3).

**Alternatives roster, each rival in exactly ONE role.** Each rival is registered in the hashed `RIVAL_REGISTRY` with its id, giver, exact mapping (hash), `k` and
ONE role, BEFORE the run; Barker never writes a rival's mapping after seeing data. Roles: **null** (EO must exceed its 95th percentile by at least the SESOI),
**must-beat** (an a-priori, un-fitted rival of the same `k`: EO must beat it by the SESOI), **reference** (fitted to the data or finer than EO: EO is NOT
required to beat it; the information gap is printed and enters the verdict only through the capture ratio `r` of the test, 6.2 and 6.3). Where a rival has no
received operational mapping it is NOT run (a mapping the architect invents is Barker's lens and can be built to lose; FoA itself warns that interpreting one
framework through another is not yet an archtheory and that the lens's bias must be tracked, p.56). **Registry lint** (`barker-registry.test.js`): every
rival has exactly one role, a `k`, a giver and a mapping hash, and the verdict code fails if it reads a role absent from the registry.

| Id | Rival | Giver / mapping | k | Role | Used in |
|---|---|---|---|---|---|
| N1 | Random re-assignment of acts among classes, same group sizes | the null | 9 | null (calibration only: vacuous by design, see 6.2) | EO-1 |
| N1b | Acts permuted only among the classes of the SAME Levin major group | null built on the VerbNet class numbering | 9 | null (structure-preserving) | EO-1 |
| N1c | Random contiguous coarsenings of the Levin-numbered class list with EO's group-size profile (and random cut points) | same | 9 | null (structure-preserving) | EO-1 |
| P3 | Peirce's three categories read as valence: the modal number of syntactic arguments in the class's VerbNet FRAMES (1, 2, 3 or more); evaluated on ALL four blocks; compared with EO coarsened to 3 by train-only agglomeration (and with EO's own mode-3 and domain-3 groupings, printed) | VerbNet 3 frames (independent of UD and of EO); Peirce's valency analogy | 3 | must-beat | EO-1 |
| D9 | Data-driven 9: train-only agglomeration of class centroids | the data | 9 | reference | EO-1 |
| L9 | Levin major group (integer prefix, about 57) coarsened to 9 by train-only agglomeration | Levin 1993 via VerbNet | 9 | reference | EO-1 |
| LN, V311 | Levin major group and native VerbNet classes at native `k` (CE printed at native `k`) | Levin; VerbNet | 57, 311 | reference | EO-1 |
| G-null | Grain labels permuted over a feature's values, multiset kept (exact enumeration) | the null | 3 | null | EO-2 |
| BL | Blake's case hierarchy (Nom, Acc, Gen, Dat, Loc/Ins/Abl by rank gap) | Blake 2001, a received ordering | rank | must-beat (Case only) | EO-2 |
| CO | Core versus oblique (UD's own core-argument split) | UD guidelines | 2 | must-beat (Case only) | EO-2 |
| TR | Person 1 / 2 / 3 read as the I / we / it perspectives of the integral Big Three (FoA pp.32-33, 28) | integral literature as FoA reports it; lens-risk flagged | 3 | must-beat (Person only) | EO-2 |
| DD | Data-driven 3-partition WITHIN each feature, learned on the OTHER languages' count-equalised profiles for the values they share | the data (leave-one-language-out; leave-one-lineage-out as the stricter) | 3 | reference | EO-2 |
| UDI | UD's own inventories (17 UPOS, 37 deprel bases, FEATS values) | UD | native | reference | all |

**Model-comparison rule (held-out cross-entropy at EQUAL k; the first draft's BIC-style penalty is withdrawn).** Held-out cross-entropy already pays for
over-fitting, so adding a parameter-count penalty on top would double-penalise finer rivals and flatter EO's nine groups (review F4). The score of a
partition is `CE(M)`, bits per held-out observation, with every comparison made at the SAME `k`: a rival of another `k` is coarsened to the comparison `k` by
TRAIN-ONLY agglomeration (merge the pair of groups whose merger least raises train cross-entropy), and the cross-entropy at native `k` is printed separately,
never used in a verdict. EO beats a must-beat rival iff the paired cluster-bootstrap 95 percent interval of `CE(rival) - CE(EO)` has its LOWER bound above the
test's SESOI `s`; an interval inside `[-s, +s]` is a TIE and reads "does not beat". EO beats a null iff its statistic exceeds the null's 95th percentile
(Holm over the battery) and `theta` (the statistic minus the null's median) clears `s`.

**6.0a SESOI registry (written BEFORE any power card; PROVISIONAL until signed by the claim's defender, Appendix B5; sensitivity at half and double printed, never selected from).**

| Test | Statistic `theta` (unit) | SESOI `s` | Justification |
|---|---|---|---|
| EO-1 S1 | `G_EO - max(median G under N1b, median G under N1c)`, bits per held-out verb token | 0.02 | at 0.02 bits per token it takes about 50 verb tokens to accumulate one bit (a factor of two) of evidence for a reading; a partition that needs more than that is not doing work at reading scale. Printed beside the global-centroid cross-entropy as a percentage |
| EO-1 S2 | median over placements of `NA` minus `NA_EO` (share of centroid variance) | 0.06 | Cohen's medium eta-squared convention: the grid must explain six more points of variance than the typical arrangement |
| EO-1 S3 | capture ratio `r = (CE_global - CE_EO) / (CE_global - CE_D9)` | 1/3 | EO's nine capture at least a third of what the data's best nine capture; below it the nine are a vocabulary, not a finding |
| EO-1 rivals | `CE(rival) - CE(EO)` at equal k | same `s` as S1 (0.02 bits) | one unit, one test |
| EO-2 (O1 and O2) | `Gamma - 0.5` after count equalisation, lineage-nested mean over unconsumed lineages | 0.05 | 55 percent against 50 percent chance that the same-grain pair is the closer: fewer than one prediction in twenty is changed below it |
| EO-3 rung `k` | `Delta_k`, bits per character | 0.01 | under half a percent of an order-2 character model's code length |
| EO-4 | `CR_EO` minus the mean `CR` of the other 23 orders (and EO's order ranks first of 24) | 0.05 | Guttman reproducibility is conventionally judged against 0.90; five points above the mean of the alternative orders is the least that separates an order from its permutations |
| Arch cards | 4.7a | per card | per card |
| Kinds | a kind of at least 4 systems, at least 3 lineages, at least 12 signature features at strength at least 0.5 (4.4) | the cell | the smallest kind a typological claim would name |
| L-tasks | 5.0 | 5 percent relative; 0.01 regret | below it a borrowed prior is not worth its dependency |

**Power TRIO for every test (replaces the single `delta = MDE`).** Each test's power card plants three worlds whose true effect is stated in `theta`'s own units:
`2s` (claim true), `0.5s` (claim negligible) and `0.1s` at ten times the real n (a tiny effect with n large). **P_up** := in the `2s` world the real-n pipeline reaches
`theta` interval lower bound above `s` at rate >= 0.8. **P_down** := in the `0.5s` world it reaches interval upper bound below `s` at rate >= 0.8. The `0.1s` world
must NOT reach SURVIVES (rate <= alpha). Unit tests: `2s` is called SURVIVES at rate >= 0.8; `0.5s` is called REFUTED at rate >= 0.8; an effect exactly at `s` is called
neither at more than alpha each (it sits on the decision boundary, so a rule that called it SURVIVES at power 0.8 would be calling every interval that straddles `s` a
pass); `0.1s` with huge n is not SURVIVES. (The review asked for "an effect exactly at SESOI called SURVIVES at power >= 0.8"; that is incoherent with an interval-above-SESOI
rule, so the trio replaces it, and it is stricter.)

**Verdict function (pre-registered; one function for the whole battery).** Components per test: **P_up**, **P_down** (above); **C** every control built to fail
failed; **N** the observed effect beats its null (Holm over the battery); **M** the minimum-effect test: the 95 percent interval's LOWER bound of `theta` exceeds `s`;
**A** EO beats every must-beat rival by the rule above and clears every null's 95th percentile by `s`; **F** the lineage sign gate (4.6 reachability, not Holm-corrected: a
conjunct cannot inflate the conjunction); **I** at least two channels with distinct givers agree where more than one exists; **B** the bridge is licensed
(`eoSentence` present); **K** the headline rows are unconsumed.

| Verdict | Condition |
|---|---|
| **INSTRUMENT_FAILED** | not C: a control built to fail survived (II.23), or a calibration of 6.8 failed |
| **UNDERPOWERED** | the real-data interval is not decided against `s`: `theta` interval straddles `s`; or not P_up when the claim would need it, or not P_down when a refutation would need it (decided BEFORE real data); or reachability fails. The real-data statistic is then reported with this label, never as a verdict |
| **REFUTED (as operationalised)** | P_down and C and the interval's UPPER bound below `s` and B. The line `bearing` and `eoSentence` are printed with it. If N holds the line reads "an effect exists and is smaller than the SESOI" |
| **WEAKENED** | M holds (above `s`) but not A, or not F, or not I, or (unlicensed bridge) the proxy failed |
| **SURVIVES (this test)** | P_up and C and N and M and A and F and I and B and K. Survival is not confirmation; it is the claim passing one test it could have failed |
| **NOT_TESTABLE_NOW** | typed gap with the exact missing data (6.9) |

**Fair-test certificate.** The architect's probability that EO's claim survives each test is recorded NOW (section 10) for the PRIMARY statistic of each test
(the SESOI version against the structure-preserving nulls). A test whose recorded probability lies outside [0.10, 0.90] is labelled **near-foregone** and does not
enter the headline tally; it is still run and reported, and it is a calibration of the instrument, not evidence about EO. Plain N1 in EO-1 is a standing
example: passing it is reported as "near-foregone calibration, not support". The same rule applies in both directions: a test is not kept because EO is expected to
survive it, and not dropped because it is expected to fall. **There is no aggregate "EO score".** The report lists claims.

### 6.1 The claim registry (what is, and is not, testable now)

| Id | Claim (EO's words, file) | Status | Bearing |
|---|---|---|---|
| **EO-1** | The nine acts are a closed universe of relation kinds; a verb's semantics performs one of nine acts = (mode, domain) pairs, and "9 = 3 subjects x 3 operation types, the grid closes" (`the-fold/relation-kinds.js` header; `ActPrior@1`; THE-27-CELLS section 1; THE-THREE-MATHEMATICS sections I, V) | **TESTABLE NOW** (English, via `act-prior-en.json` and UD-EWT); the PRIMARY S1 faces structure-preserving nulls (plain N1 is a near-foregone calibration) | DIRECT on the table's partition; PROXY on "closed universe" |
| **EO-2** | The cube projects onto grammar: a language's Case, Person, Number, Tense, Mood, Voice, Aspect values are cells worn by its surfaces; "the mapping is the theory; the priors are its measurement" (`kernel/cube.js::CELL_OF_GRAMMAR`, derived from Ancient Greek, tallied for Latin and Vedic) | **TESTABLE NOW as a bridge-dependent proxy** in every language that did not derive or consume it (rus CONSUMED, ell NEAR, grc/lat/san derived and not on disk; the rest of the 33 unconsumed); two operationalisations, O1 (role profiles) and O2 (word-final endings, nearer EO's own derivation), printed separately and both required to survive | **PROXY-BRIDGE** (O1), **PROXY** (O2); never DIRECT unless the EO defender's sentence quotes the observable |
| **EO-3** | Grains are three orders of difference: constant (Ground), value (Figure), rate (Pattern); 0 / n / 1 (THE-THREE-MATHEMATICS section III; THE-WHEEL) | testable only in its WEAK form; **near-foregone** | PROXY-WEAK |
| **EO-4** | A floor can starve when the floor below did not individuate enough events; the operator chain is a dependency order (THE-CORE-MECHANISM; LEVELS ladder 1; READING-SPEC S14) | testable on cards in principle; expected **UNDERPOWERED** | PROXY (cards are SUT outputs) |
| EO-5 | Cells classify moves, never content; deriving a cell from a passage is refuted (95.7 percent survived within-paragraph shuffle) | **ON RECORD REFUTED as a content reading**; used as calibration (6.8) | n/a |
| EO-6 | Recurrence alone is not admission; company is not act | **ON RECORD REFUTED**; calibration (6.8) | n/a |
| EO-7 | Omnilingual invariance: translation-equivalent connectors land on one cell | NOT_TESTABLE_NOW (6.9) | DIRECT |
| EO-8 | Occurrence-level grain (27 not 9) | NOT_TESTABLE_NOW (6.9) | DIRECT |
| EO-9 | Moves have cells (independent move gold) | NOT_TESTABLE_NOW (6.9) | DIRECT |
| EO-10 | Presence is not identity (an index of existence is not an index of establishment, P38) | NOT_TESTABLE_NOW (6.9) | DIRECT |
| EO-11 | Three mathematics are the three domains; stances are isomorphic across them | no operational reading; EO records specimen-scale support (binding transfer 5/5) and states it as untested beyond one stance | not run |
| EO-12 | Every structure-finder is one act (destroy one relation); three comparison families | a claim about the code base, audited by reading, not by data | not run |

### 6.2 EO-1: the nine-act table

**Claim and steelman.** EO's declared translation maps 325 VerbNet classes to the nine operators (`build-act-prior.mjs`, named in
`act-priors/README.md` and not present in this checkout; the table's rows each carry a `because`), giving a verb form one act, or a candidate set when the classes disagree (3,697 of
4,569 forms unanimous, 872 contested). The strongest reading is not that verbs are "about" operators but that the PARTITION of
verb classes into nine groups carries behavioural information that a grouping of the same classes which merely respects Levin neighbourhoods does not, and that
the 3x3 arrangement of the nine is not arbitrary: behaviour is better organised by the (mode, domain) grid than by a random grid.
Steelman's concessions, from EO's own file: grain is deliberately absent at this level; REC "enters only through alt readings"
(a real absence, named in `disclosed.recSparse`): re-grounding is plausibly a discourse move, not a lexical one.
**Bearing:** DIRECT on the partition. Default `eoSentence` (to be confirmed by the defender, B6): the act prior README's "which of the engine's nine acts ... its VerbNet class's own semantics perform".

**Why the plain null is vacuous (review F3).** VerbNet classes extend Levin's, and Levin's classes are DEFINED by syntactic alternation behaviour; blocks `b1`
(argument frame) and `b4` (oblique marker) are exactly such behaviours. A table that merely respects Levin neighbourhoods, for example nine contiguous ranges of
the Levin numbering with no EO input at all, beats a null that scatters classes over acts, whether or not EO adds anything. So **N1 (unconstrained class
permutation) is kept as a CALIBRATION, not as the test**: a table built from Levin ranges must PASS it (this shows N1 is vacuous), and EO passing it alone is
reported as "near-foregone calibration, not support". The claim EO is held to is the structure-preserving one in S1.

**Data and independent gold.** UD_English-EWT (`tb/eng/train.conllu`, 12,544 sentences; `ud-eval/eng/{dev,test}.conllu`). Gold is
UD annotation of what verbs DO; VerbNet class numbering and frames (`/Users/mlacy/nltk_data/corpora/verbnet3`, 325 class files, on disk) are the independent
giver of the structure-preserving nulls and of the Peirce valence rival. The act table is the SYSTEM UNDER TEST.

**Units: one rule, applied identically to the real mapping and to every null mapping (review F3, item 2).** PRIMARY unit set: every verb lemma (UPOS VERB, AUX excluded)
with at least 5 held-out tokens (PROVISIONAL) that appears in `ActPrior.forms`, contested and unanimous alike. A lemma's act under ANY mapping (EO's or a null's) is the act of its
FIRST listed class (`classes[0]` of the unanimous entry, or of the first candidate); sensitivity: tokens split uniformly over all the lemma's listed classes' acts. The unit
set is the same across all draws. Reported apart and labelled SELECTION-BIASED: (i) the original unanimity-filtered set fixed by EO's own mapping (unanimity selects
non-polysemous lemmas in one semantic area, an advantage the nulls lack); (ii) the unanimity filter RECOMPUTED under each null mapping (a lemma is a unit iff all its
listed classes map to one act under that mapping). Operators with zero units (expected: REC) are typed gaps; the measured set is at most 8.
**Behaviour vector.** Four categorical outcome blocks over a lemma's tokens, equal block weight 1/4:
- `b1` argument frame: the sorted multiset of the dependents' deprel bases among {nsubj, nsubj:pass, obj, iobj, obl, ccomp, xcomp, advcl, csubj, expl, compound:prt}, as one symbol; the 32 most frequent frames pooled on train plus "other";
- `b2` voice and finiteness: (VerbForm, Voice, Mood) values from FEATS;
- `b3` tense-polarity company: Tense, Polarity=Neg, presence of aux or aux:pass dependent;
- `b4` oblique marker: the lemma of the `case` dependent of the verb's obl dependents (20 most frequent plus "other").

**Double hold-out.** Lemmas are dealt into 5 folds (seeded). Group centroids (one categorical distribution per block per group,
smoothed with `1 / total`) are fitted on TRAIN tokens of lemmas outside the fold; scoring is on DEV+TEST tokens of the held-out
lemmas. Lemma and sentence are both held out.

**S1 (does the grouping carry information beyond what class locality gives?).** `G(M) = CE(global centroid) - CE(group centroid under mapping M)`, bits per held-out
token, lemma-weighted. Nulls: **N1** (act permuted among classes keeping the number of classes per act; calibration only), **N1b** (act labels permuted only among the classes of the SAME
Levin major group, the integer prefix of the class id; per group the acts EO uses there are redealt over that group's classes; 9,999 draws), **N1c** (nine contiguous
blocks of the Levin-numbered class list with EO's group-size profile in random order, plus a second family with random cut points; 9,999 draws). **Statistic of record:**
`theta_S1 = G_EO - max(median G | N1b, median G | N1c)`, SESOI `s = 0.02` bits per token (6.0a). `p_b`, `p_c` = shares of draws with `G >= G_EO`. S1 passes N iff both `p_b` and `p_c`
are at or below the Holm-adjusted alpha, and M iff the lemma-cluster bootstrap interval's lower bound of `theta_S1` exceeds `s`. If EO's table is mostly whole Levin groups, N1b
has no room to differ from EO and S1 will read no excess: the finding would be "EO's nine acts are Levin's neighbourhoods relabelled", which is a result and is stated so.

**S2 (is the grid special?).** For each measured act a centroid log-probability vector V (the four blocks concatenated). Fit
`V_(m,d) = mu + alpha_m + beta_d` by least squares over the measured cells (train lemmas), and score the non-additivity share
`NA` = held-out residual sum of squares / total held-out variance of the centroids. EO's arrangement is (mode, domain) from
`cube.js`. Null **N2**: every injective placement of the measured acts into the nine cells, ENUMERATED EXACTLY (9!/(9-8)! =
362,880 for 8 acts); `p2 = #{arrangements with NA <= NA_EO} / 362,880`. This keeps the acts and their centroids fixed and moves only the grid, so it is
structure-preserving in the right way, and it is the numerology check EO's own wheel header asks for. `theta_S2` = median over placements of NA minus `NA_EO`; SESOI 0.06.

**S3 (does the data want nine?).** The ~311 classes are clustered by Ward linkage on train-lemma centroids for k = 2..40; held-out CE(k) per k at equal-k coarsening (no
penalty term). Report `k*` (1-SE rule), the knee of `CE(k)` by a two-segment piecewise-linear fit with bootstrap CI over lemma folds, and the capture ratio
`r = (CE_global - CE_EO) / (CE_global - CE_D9)` with its N1b and N1c nulls. SESOI for r is 1/3: `r` below it with its interval's upper bound under 1/3 prints WEAKENED for
"closed universe of nine"; a missing knee at 9 is printed but cannot by itself refute (nine is a vocabulary; the data may simply not force it). 27 cannot be placed: grain is absent from the table (typed gap EO-8).

**Alternatives (6.0 roster, one role each).** Nulls: N1 (calibration), N1b, N1c. Must-beat: P3 (Peirce valence from VerbNet frames, all four blocks, k = 3, against EO
coarsened to 3). References: D9, L9, LN and V311, with the gap printed. EO SURVIVES S1 iff N and M hold against both structure-preserving nulls AND EO beats P3 by the
SESOI; S2 iff `p2` is at or below the Holm-adjusted alpha and its `theta` clears 0.06.

**Controls built to fail.** (i) Act labels assigned by the first letter of the lemma: S1 must read no gain; (ii) behaviour vectors permuted across lemmas (the act labels then carry no information about
a lemma's behaviour): S1 and S2 must read nothing; (iii) **a table built from nine contiguous Levin ranges with NO EO input must PASS plain N1 (documenting that N1 is vacuous) and must NOT beat N1b or N1c
by more than alpha** (it is itself a draw from N1c); (iv) EO's own acts shuffled WITHIN major groups (a draw of N1b) must not beat N1b at more than alpha. A failed control is INSTRUMENT_FAILED.
**Power trio (6.0).** Synthetic lemma behaviour built on the REAL class sizes and lemma counts: a lemma's vector = its class centroid + within-class noise (the class-level
variance share is estimated from the real train split with NO act labels, so no EO input), and the planted group component adds a nine-group mean to the class centroids
so that the expected `theta_S1` equals `2s`, `0.5s` and 0, with within-class heterogeneity retained (class-coherent groups, not lemma-level eta2). A planted additive 3x3
organisation of size matched to `2 s_S2` and `0.5 s_S2` over 8 cells for S2. **P_up** and **P_down** must hold for S1, S2 and S3; the world with class locality and NO group component must not
pass N1b or N1c (rate <= alpha). MDE and trio rates are printed beside the verdict.
**Gaps recorded up front:** REC unmeasurable; contested forms (872 of 4,569) excluded only in the labelled secondary; English only; EWT only.
**Recorded probabilities (section 10):** P(passes plain N1) = 0.97 (near-foregone calibration, not entered in the tally); **P(S1 survives: both structure-preserving nulls and the SESOI) = 0.25** (first draft 0.65 was
mostly the probability that the test could not fail); P(S2 survives: EO's grid in the top 5 percent of 362,880 and theta above 0.06) = 0.12; P(r >= 1/3) = 0.45; P(knee within CI of 9) = 0.20.

### 6.3 EO-2: the cube as grammar (`CELL_OF_GRAMMAR`)

**Claim and steelman.** `kernel/cube.js` (2026-09-17, "declared, revisable theory") assigns grammatical values to cells: Case
Nom to SEG-Figure, Acc to CON-Figure, Gen to CON-Pattern, Dat to CON-Ground, Voc and Loc to SIG-Ground, Ins to SIG-Pattern, Abl to
SEG-Ground; Person 1, 2, 3 to SIG-Ground, SIG-Figure, INS-Figure; Number, Tense, Mood, Voice, Aspect, VerbForm likewise. The strongest reading: a
table fitted to three ancient inflectional languages TRANSFERS, that is, in a language that did not derive it values the table puts at the SAME grain are more
alike than values it puts at DIFFERENT grains, within a feature (so feature identity cannot explain it).

**What EO states, and what Barker adds (the bridge; review F5).** `cube.js` says the cells are "derived by consequence, not assertion" from the word-final
ENDINGS that Ancient Greek (PROIEL, Perseus) settle to when tallied (Latin and Vedic tallied after), that "The mapping is the theory; the priors are its
measurement", and, in its header, that the grains are clause positions (Ground the clause frame, Figure the argument, Pattern the agreement system). It does NOT say that same-grain values
have more similar distributions of INCOMING DEPREL. That is Barker's AUXILIARY hypothesis, so a failure of the role-profile test refutes the conjunction, not the table. Two
operationalisations are therefore run and printed separately, and SURVIVES requires both:
- **O1 role profiles (PROXY-BRIDGE).** `rho_v` = the distribution over the deprel base of the INCOMING arc of the tokens that carry value `v` (for a verb value, the verb's own deprel).
- **O2 endings (PROXY, nearer EO's own derivation).** `epsilon_v` = the distribution of the WORD-FINAL 2 CHARACTERS (the cube builders' own declared `endingLength: 2`) of the tokens that carry `v`, over the 50
  commonest endings of the language plus "other", restricted to the content-word UPOS the feature lives on (nominals: NOUN, PROPN, ADJ, PRON, NUM, DET; verbal features: VERB, AUX). The question it asks is whether
  the table's grain predicts which ENDING-SHAPE a value fills in an inflecting language that did not derive it. Isolating and non-suffixing systems (cmn, vie, ind; jpn and kor by script) are typed gaps for O2.
Distance: `d(F; u, v) = JSD(profile_u, profile_v)`, base 2, on COUNT-EQUALISED profiles (below). **Document audit (no data; reported separately, not a falsification):** the header prose of `cube.js` (Existence = the nominal
system, Structure = syntax, Interpretation = the verbal/functional system; "Lens = voice/person"; "Paradigm = tense-aspect") disagrees with the TABLE in at least four places (Person goes to SIG and INS (Existence); Mood-Imp to NUL-Ground; Tense-Pres to EVA-Figure (Lens) and
Tense-Fut to SYN-Pattern; Aspect to NUL, INS, SIG). Which grain semantics EO means is therefore itself unsettled (proposal P7). Before freeze the EO defender states in ONE sentence which observable would count against the table, the
header reading or the table reading (B6); Barker tests the TABLE (it is what the code uses). If the defender names the header reading as operative, the defender supplies the mapping for it; Barker does not write it.

**Consumed languages (review F8).** The table was declared 2026-09-17 as "revisable", tallied on grc, lat and san, applied to rus (`ethos/derived-priors/case-priors/case-marking-rus.json` is a `CasePrior@1` built from UD_Russian-GSD train through the
table, with each ending's cell printed), and has a Greek person tier. A language the table's authors looked at is not out-of-sample. The registry therefore carries `consumedLanguages`: **grc, lat, san** (derivation; no `tb/` directory, so not among the 33), **rus** (CONSUMED: the table
was applied to its endings and the result printed), **ell** (NEAR: Modern Greek follows Ancient), plus any language the revision history shows the table was revised after seeing (requested from the main agent, B7; until it is supplied the claim "unconsumed" is conditional
and printed as such). `cube.js::CELL_OF_GRAMMAR` serialised with sorted keys is sha256'd into `PREREG.lock.json` as `cellOfGrammarSha`; a run whose table differs from the locked hash is refused. The headline sign test and the lineage-nested means use **unconsumed languages only**;
consumed and near rows are printed apart; the registry lint requires every EO-2 row to carry `consumed`.

**Triple inventory, from the table alone (computed 2026-10-05 from `cube.js`; no data).** A triple `(u, v | w)` has `grain(u) = grain(v) != grain(w)`.

| Feature | Values by grain | Triples | Same-grain pairs | Distinct grain labelings (min attainable permutation p) |
|---|---|---|---|---|
| Case | Figure {Nom, Acc}; Pattern {Gen, Ins}; Ground {Dat, Voc, Loc, Abl} | 36 (oblique-only 16, mixed 20, core-only 0) | 8 | 420 (0.0024) |
| Person | Figure {2, 3}; Ground {1} | 1 | 1 | 3 (0.33) |
| Number | Figure {Sing}; Pattern {Plur}; Ground {Dual} | **0** (all three grains differ) | 0 | 6 |
| VerbForm | Pattern {Fin, Part, Ger}; Figure {Inf} | 3 | 3 | 4 (0.25) |
| Mood | Ground {Ind, Imp}; Pattern {Sub, Opt} | 4 | 2 | 6 (0.17) |
| Voice | Figure {Act, Pass}; Ground {Mid} | 1 | 1 | 3 (0.33) |
| Tense | Pattern {Past, Fut}; Figure {Pres} | 1 (review F7 said none; the table has one, but Fut is periphrastic in most UD treebanks, so it is usually a gap) | 1 | 3 (0.33) |
| Aspect | Pattern {Perf, Prog}; Ground {Imp} | 1 | 1 | 3 (0.33) |

Total 47 triples over 7 features, 36 of them Case. A language contributes only triples whose three values each have at least 100 tokens (PROVISIONAL) in it, and the dual, Opt, Prog, Voc, Mid and Fut values are absent from nearly all languages. In
practice the sample is Case plus a few Person, Mood, VerbForm and Voice contrasts, and every language replicates THE SAME small set of contrasts: **a sign test over lineages is a handful of repeats of one small experiment, and the card says so.** The core/oblique split is the
rival explanation, so Case triples are STRATIFIED: **oblique-only** (16: the grain contrast cannot be a core/oblique contrast), **mixed** (20: a core/oblique split can manufacture the effect) and core-only (empty, by the table's structure).

**Inventory step (R2, counts only; no role or ending profile is read).** `tripleInventory(L)` lists, per language and feature, the available triples, their token counts, the number of distinct same-grain PAIRS (independent contrasts; triples sharing a pair are dependent), the number of distinct
labelings and the minimum attainable permutation p. A language with fewer than 3 independent contrasts is excluded with a typed gap. The power card runs on THESE sets and THESE token counts, not on synthetic languages with free parameters.

**Count equalisation (review F6).** The plug-in JSD of sparse profiles is biased upward in inverse proportion to the count, and the same-grain pairs in the table are the FREQUENT values (Nom and Acc are the two commonest cases), so "same grain closer than different grain" can follow from
count-dependent bias and the core-versus-oblique split with no grain content; a permutation null that keeps counts fixed carries the artefact in the observation and not in the null. **Primary: every value of (L, F) is downsampled WITHOUT replacement to `n_min` = the smallest count among the triple's values
(floor 100) before profiles are formed, and `d` is averaged over 200 downsamples.** The bias-corrected variant (Miller-Madow on each entropy term of the JSD) is a sensitivity, and the un-equalised `Gamma` is printed beside to show the size of the artefact.

**Statistic.** `Gamma_{L,F}` = mean over triples of `1[d(u,v) < d(u,w)]` (ties 0.5; chance 0.5); `Gamma_L` = mean over features (feature-weighted; the pooled-triple version is a sensitivity). Reported in strata: **Case-oblique-only, Case-mixed, Case-all, non-Case** (Person, VerbForm, Mood, Voice, Tense, Aspect: 11 triples). **Null.** Within each (L, F) the grain
labels are permuted over the feature's values preserving the multiset (exact enumeration, at most 8!); `Gamma_L`'s null by joint draws (9,999) on the equalised data; `z_L = (Gamma_L - E_null)/SD_null`; lineage means nested over unconsumed languages. `theta = Gamma - 0.5` after equalisation, SESOI 0.05.
**Replication.** The sign test over lineages that have the stratum defined (4.6 reachability; the power card decides which lineages are defined); the unit is the lineage (IE counts once, with its unconsumed Slavic, Romance, Germanic, Indo-Iranian and Hellenic branches nested).
**Headline rule (review F7).** Two components are named and BOTH must pass for SURVIVES: **H1 non-Case** (testable only if its power card passes at the real inventories; otherwise the whole test cannot exceed UNDERPOWERED) and **H2 Case** (oblique-only stratum, with Case-all printed). A Case-only pass is not a survival of the table: it
is one feature that the core/oblique rival explains with fewer parameters.

**Alternatives (6.0 roster, one role each).** Must-beat: BL (Blake's hierarchy: Spearman between `d(u,v)` and the rank gap, Case only), CO (core versus oblique, Case only), TR (Person triad). Reference: DD, a data-driven 3-partition WITHIN each feature learned on the OTHER languages' count-equalised profiles for the values they
share (leave-one-language-out; leave-one-lineage-out as the stricter), scored only on triples where both EO and DD are defined with coverage printed (values absent from the other languages, such as Finnish Ill or Ela, cannot be assigned and drop out of both). Because DD is a within-feature partition it cannot mix parts of speech. The head-to-head
"a table derived from Greek" versus "a partition learned from the other languages" is the strongest statement of EO's claim; EO is not required to beat DD (a reference), and the capture ratio `r2 = (Gamma_EO - 0.5)/(Gamma_DD - 0.5)` below 1/3 with its interval's upper bound under 1/3 prints WEAKENED.
**Controls built to fail.** (c1) Grains assigned by the alphabetical order of the value names (Gamma near 0.5); (c2) grains permuted across features; (c3) **grains assigned by FREQUENCY RANK within each feature with the table's own grain multiset**: what the table gets if the effect is count-driven; EO must exceed it by the SESOI (`Gamma_table - Gamma_rank >= s`), on equalised data; (c4) **a planted
artefact language**: role (and ending) profiles IDENTICAL across all values but token counts unequal like the real feature: `Gamma` must read 0.5 after equalisation and exceed 0.5 BEFORE it (proving the artefact exists and the fix removes it). A failed control is INSTRUMENT_FAILED.
**Power trio (6.0).** Synthetic languages built on the REAL per-language triple sets and token counts, with profile similarity set so that `Gamma - 0.5` equals `2s` = 0.10, `0.5s` = 0.025 and 0, with noise epsilon in {0.1, 0.3, 0.5}; run separately for H1, H2 and each of O1 and O2; the card prints, per language, the number of independent contrasts and the minimum attainable permutation p. **Likely reading, stated in advance:** where Case passes, much of the effect will be the core-versus-oblique split;
that outcome is WEAKENED by rule A, not SURVIVES.
**Recorded probabilities:** P(non-Case component testable at power 0.8) = 0.35; P(Case O1 beats the null by SESOI) = 0.40; P(EO-2 SURVIVES: both components, both operationalisations, must-beat rivals, the frequency-rank control) = 0.08; P(UNDERPOWERED overall) = 0.55.

### 6.4 EO-3: the difference ladder (grain proxy; near-foregone, a calibration)

**Claim and steelman.** Grains are three orders of difference: the ground (constant), a figure (a first difference from its
ground), a pattern (the difference a figure made to the NEXT ground; "literally a difference equation", THE-THREE-MATHEMATICS
section III). EO's wheel adds that the fold re-forms the prior that primes the next read (THE-WHEEL, item 3), so higher orders are
the same Pattern act iterated. **Therefore the claim "exactly three, and no fourth" is not a claim about material that a ladder of
models could refute**: any finite ladder can be extended by iterating Pattern, and EO's own definition licenses the iteration.
What IS testable is the weak form: the rungs it names are non-trivial in real sequences.

**Models** (character stream of each system's train text; bits per character on a held-out half): M0 static unigram (the ground);
M1 interpolated context model of order k <= 6 chosen on train (a figure against the ground); M2 = M1 + one decayed cache
mixed online (the ground re-formed by what just happened); M3 = M2 + two-timescale caches (adaptation of the adaptation); M4 =
M3 + a sentence-level cache. `Delta_k = L(M_{k-1}) - L(M_k)`, paired bootstrap over blocks.
**Pre-registered readout:** the lower bound of `Delta_1` and of `Delta_2` exceeds the SESOI 0.01 bits per character, with the lineage sign gate (8 of 9) (6.0a); the saturation depth per system is
reported as a DESCRIPTIVE statistic and is **not** compared with 3. **Controls built to fail:** within-document unit shuffle
(M1 and M2 gains must vanish with marginals kept). **Power card:** generators with a planted number K of difference orders (K in
{1, 2, 3, 4}); the instrument must read `Delta_K > 0` and `Delta_{K+1}` near 0 at the real stream lengths.
**Verdict vocabulary here is limited to "rungs 1 and 2 hold / do not hold"**; the battery prints no REFUTED/SURVIVES for "three".
**Recorded probabilities:** P(Delta_1 > 0) = 0.99; P(Delta_2 > 0) = 0.90; P(Delta_3 > 0) = 0.70 (which, by the reading above, would not
touch EO). Near-foregone by the certificate; kept as a calibration of the sequential-structure instrument that A04, A06 and A08 reuse.

### 6.5 EO-4: floors as a dependency order (cards)

**Claim and steelman.** "The reason a floor can starve is that the floor below did not individuate enough events" (THE-CORE-MECHANISM);
S14 holds that every adjacency of the chain is a presupposition. The strongest reading: across systems, outcomes on the ladder form
an implicational (Guttman) scale in floor order, failures cascading upward and not downward.
**Data.** `competence/r1..r4-*-dev.json` (r0 is language identification and r5 is cross-language agreement on parallel text: neither
is a floor and both are excluded), `pass` in {true, false, null}; `null` (arm inert or not applicable) is MISSING, not failure.
The cards are the SUT's outputs; the claim tested is structural (their order), never their level.
**Statistic.** Coefficient of reproducibility CR of the Guttman scalogram for the ladder order r1 < r2 < r3 < r4 over languages
with at least 3 non-missing rungs, against ALL 24 orders of the four rungs (EO's rank among 24), against the null that permutes
each rung's column across languages, and STRATIFIED by script (r3's `script_without_case` is a script property, so a script
confound is the first alternative: a rung order explained by script is not a dependency).
**Power card (computed before reading the cards).** Guttman-scaled synthetic matrices with 10 percent response error at the real
numbers of languages per rung (r3: 11, r4: 6 at reading time). **Expected: UNDERPOWERED** (r4 has 6 cards; r1 and r2 are near ceiling
in many languages); this is stated now so the UNDERPOWERED verdict is not mistaken for a surprise. **SESOI (6.0a):** `CR_EO` exceeds the mean CR of the other 23 orders by 0.05 and EO's order ranks first of 24; the power card plants Guttman-scaled matrices at `2s` and `0.5s` above the permutation mean at the real numbers per rung. **Recorded probabilities:** P(testable)
= 0.15; P(survives | testable) = 0.40.

### 6.6 Optional extensions (run only if their power card passes; none is assumed)

- **Within-language replication of EO-1** on a second English treebank (EWT is the only English treebank on disk); until then EO-1 is
one corpus.
- **Verb-class tables in other languages** (VerbNet-like resources for Spanish, German) with an EO act prior built by a DECLARED
procedure from the English table's classes only if the mapping can be made without Barker's judgement; otherwise EO-7.

### 6.7 The crosswalk (COMPARATIVE phase: structure claimed, operational reading, where tested; no verdicts)

| Framework (giver, FoA page) | Structural claim, paraphrased | Operational reading available now? | Where |
|---|---|---|---|
| **EO** | 9 operators = 3 modes x 3 domains; 3 grains (void, beings, fold; 0/n/1); cells classify moves | partly: the act table (EO-1), the grammar table (EO-2), floor order on cards (EO-4); moves: no | 6.2-6.5 |
| Peirce (Table 4 lists his semiotics; the valence reading is a received analogy, not FoA's) | three categories: monadic, dyadic, triadic | yes, as valency | EO-1 rival |
| Integral theory (Wilber; FoA pp.19, 26-27) | four quadrants; Big Three I, we, it | partly: Person only | EO-2 rival (lens-risk) |
| Henriques' Unified Theory of Knowledge (FoA pp.19, 31-32) | joint points energy-matter, life, mind, culture | no (not a property of text) | none |
| Commons' model of hierarchical complexity (FoA pp.22-23) | orders by coordination of lower-order actions | proxy on products (Strahler order) | A03 |
| Chomsky's universal grammar (FoA Table 4, p.113) | interfaces plus recursion | partly: self-embedding | A02 |
| Alderman's integral grammatology (FoA p.28) | six parts of speech as onto-epistemic elements | partly: a six-class partition claim | A01, EO-2 context |
| Nicolescu (FoA p.25) | included middle | yes: graded boundary | A05 |
| Feibleman's laws of levels (FoA p.22) | levels organise those below plus an emergent quality | partly | A06 |
| Wolfram's ruliad (FoA pp.29-31) | the limit of all possible rule applications | no | gap |
| UD (practical typology) | 17 UPOS, 37 deprels, FEATS | yes: the gold | everywhere |
| **Barker's own induced metastructure** | the kinds and arches section 4 finds | yes, by construction | section 7 |

The last row is the point of section 7: the map is a row in its own table and is scored by the same held-out rule.

### 6.8 Calibration claims known false (the instrument must call them false)

EO's own record supplies claims that are already refuted. Barker's battery must reproduce the refutation on PLANTED analogues;
failing to do so is INSTRUMENT_FAILED for the battery. K5 to K7 are the review's additions: instrument calibrations on exactly the confusions the panel named.
| Calibration | Planted analogue | Required reading |
|---|---|---|
| K1 recurrence alone admits identity | a corpus where frequency is the only available signal and truth is independent of it | every card that uses recurrence returns TRIVIAL |
| K2 cells from content | labels generated from word identity; scoring = label stability under within-unit shuffle | stability near 1 reads as "content-determined"; the battery marks such a structure REFUTED as a move taxonomy |
| K3 company as act | a planted act that is independent of company | company statistics at chance |
| K4 wrong k | a world with 4 true levels | A06 and A09 read "3 is not preferred" |
| K5 gradient is not a kind | W-continuum (4.4): one latent coordinate driving 12 to 24 correlated features, no gap | CLUSTER false-call rate not rejected as <= alpha; GRADIENT or nothing is the call |
| K6 the plain N1 is vacuous | a nine-range Levin table with no EO input (6.2 control iii) | passes N1, fails N1b and N1c |
| K7 count artefact | profiles identical across values, token counts unequal (6.3 control c4) | Gamma above 0.5 before equalisation and 0.5 after |

### 6.9 NOT testable now, with the exact missing data

| Claim | Why not | Missing data (exact) |
|---|---|---|
| EO-7 omnilingual invariance (relation-kinds.js header: a Hebrew copula, an English "is", a Russian copula land on one cell) | EO's act prior and `phasepost` lexicon are English only (`lang/en`); any non-English table written by Barker is Barker's lens | (a) sentence-aligned parallel treebanks (UD PUD: about 20 languages, not on disk) and (b) an act prior for at least two non-English languages built by a declared procedure |
| EO-8 occurrence-level grain, the 27 versus 9 | grain is a mechanical heuristic in `phasepost.js` (universal-quantified subject to Pattern; locative or absent object to Ground; else Figure) with no independent gold | occurrence-level gold of "what an act lands on" (none exists); the heuristic can only be unit-tested, not falsified |
| EO-9 cells have moves | no move gold | dialogue-act corpora with human acts (Switchboard-DAMSL, ICSI-MRDA, AMI, MapTask) AND an EO-supplied mapping from act tags to the 27 cells (not supplied; Barker writing it would be Barker's lens) |
| EO operator chain as a presupposition order (S14, "only this one of nearly thirteen hundred orderings survives") | the consistency checks are internal to EO | independent sequences of acts with an independent "presupposes" relation (for instance human-annotated procedural text) |
| EO-10 presence is not identity | needs coreference gold | CorefUD or OntoNotes coreference plus EO's establishment ladder (`clearance.js`) as the SUT |
| REC | lexically unpopulated (`ActPrior@1.disclosed.recSparse`) | discourse-level re-framing gold |
| FoA arches 7 (matter/life/mind), 8, 9; the nine-state table | no observable (4.8) | none |
| Code and notation arches (A01, A02, A03, A05 on code; any notation claim) | the code corpus is thin (17 C files, 4 Go, 3 Python), no `coding-competence` cards, notation is feasibility heads only | at least 5 repos and 50 files per language across at least 8 languages in at least 3 of the S-code families; at least 3 notation corpora with at least 100,000 units each |

### 6.10 What EO would have to look like for the battery to matter, stated both ways

- If EO-1 S1 and S2 both read nothing and no knee is found at nine, the nine-act table is a **declared vocabulary** (a useful
  discipline) and not a finding about verbs. That would be EO's own stated standing (`nomination`, "analogy with a giver").
- If EO-2 passes BOTH the role-profile (O1) and the ending (O2) operationalisations, in the non-Case component as well as in Case, beyond the frequency-rank control and the core/oblique and Blake rivals, and
  its capture ratio against the data-driven partition is at least a third, the Greek-derived table has real cross-linguistic content, which would be the strongest empirical support EO's grammar claim has had.
  If only Case passes, the table is the core/oblique split in other words. If O2 passes and O1 fails, the bridge (Barker's) failed and the endings claim (EO's own derivation) held.
- If EO-4 turns out UNDERPOWERED as predicted, nothing is said about the floors, and the missing data are the cards of r3 and r4
  across more languages, which the competence workflow is producing.

---

## 7. SELF-APPLICATION (E): the map takes its own tests

"The map is itself coordinated; it never claims to stand outside." Operationally: Barker's kinds, arch list and transfer models
are entities in the same machinery, scored by the same rules. Eight tests, all pre-registered, all in `eval/barker/self.mjs`.

| Id | Test | Statistic and rule (derived, not typed) | Control built to fail | Power |
|---|---|---|---|---|
| **S1** stability under resampling | For every induced kind (all levels) and every arch status: recompute from B = 200 bootstrap resamples of each system's sentences (induction at D = 99) and take the adjusted Rand index (ARI) between each resample's partition and the original. | A kind is **stable** iff the 5th percentile of its resample ARI exceeds the 95th percentile of the ARI between TWO INDEPENDENT N-col-null partitions of the same matrix (the bar is the null's own, not a typed 0.8). An unstable kind is withdrawn from every downstream use. | within-system sentence labels shuffled across systems: every kind must read unstable | planted kinds at the admissible cells of 4.4 must read stable |
| **S2** held-out-system consistency | Leave one SYSTEM out, induce on the rest, assign the left-out system by membership; compare with its assignment when included (consistency rate). Second: split the signatures into two seeded halves; induce on half A; predict the left-out system's half-B signatures by kind mean; mean log-loss against the global marginals and against random kinds (gain rule 5.0). | gain rule 5.0 with M0 = marginals, M4 = random kinds | half-B signatures column-permuted: no gain | planted kind worlds |
| **S3** label permutation | (a) ARI of kinds against family, against script, and the conditional mutual information of kinds with each given the other, against a permutation null WITHIN script strata (for family) and within family strata (for script). (b) System ids permuted across profiles. | the decomposition reports how much of the kind structure is genealogy and how much is script: "kinds equal families" and "kinds equal script" are measured findings | (b) every kind must dissolve | planted cross-family kinds must survive N-fam |
| **S4** leave-one-branch-out and leave-one-lineage-out stability of the arch list | Recompute ALL arch cards with each of the 13 branches removed, and again with each of the 9 lineages removed. | An arch is **stable** iff its status never changes in a single-family removal; otherwise it is flagged FAMILY-FRAGILE with the family that flips it. The published list is the stable PERSISTENT set. The flip table is printed whole. | a planted arch carried by exactly one family must flip when that family is removed | the same |
| **S5** the map is a row in its own table | Register Barker's induced partition as a rival (explicit classification, giver `organs/barker`) beside family, script, UD inventories and (where relevant) EO's cells; score every row by the held-out cross-entropy at equal k of 6.0 on held-out systems. | Barker's kinds must beat the null and the simple rivals (script, family under LOSO) on held-out systems, else the report states "Barker's metastructure does not beat script at this n" | n/a | n/a |
| **S6** false-arch rate and detection power of the WHOLE procedure | (a) 999 NULL WORLDS: the stored null draws of every arch card and of the kind ceiling, joined by draw index (world d = every card's statistic at null draw d); apply the persistence rule 4.6 in each world and count worlds with at least one PERSISTENT arch or one kind above the ceiling. Cards are independent under their own nulls, so this is conservative against the union bound; the dependence between cards on the real data is reported beside it. (b) PLANTED WORLDS: the per-card power cards combined, with m in {1, 3, 5} cards planted at once; joint recall surface. (c) COPULA AND CONTINUUM WORLDS (4.4): the W-copula and W-continuum worlds pass through the kind pipeline; the list-level count of CLUSTER kinds must not be rejected as <= alpha by the exact binomial test. | The list-level false-arch rate (share of null worlds with at least one PERSISTENT arch) must have an exact binomial upper 95 percent bound <= 0.10 (alpha plus the interval slack at 999 worlds is smaller; 0.10 is deliberately loose, tightening it later would need an addendum); otherwise the arch list is WITHHELD (INSTRUMENT_FAILED for the list). Detection reported as a recall surface. | (a) is the control | (b) is the power |
| **S7** independence audit | Matrix of channels by ancestors (treebank sha, builder, prior file, shared kernel organ, annotator pool); effective independent channels = number of connected components of the channel graph where two channels are joined when they share an ancestor. An arch seen in channels that all share an ancestor is "unreplicated". | the status CHANNEL-BOUND of 4.6 reads this | inject a duplicated channel (UD `deprel` under a second name): the audit must collapse to one component | an arch planted in 1 of 3 independent channels must read CHANNEL-BOUND |
| **S8** prospective | Systems that first appear after the freeze are scored exactly once by the frozen kinds, bins, rivals and models (`run.mjs --prospective`). | the same gain rule and persistence rule; nothing is refit | n/a | n/a |

**Recursion stops where the data stop.** Barker could be turned on FoA's Table 4 (about 190 frameworks) to ask whether the arch
"levels" persists beyond the selection that built the table (it carries many frameworks catalogued by Kleineberg, whose subject
is integrative levels, FoA p.108; my crude count of "categories-of / levels-of" labels finds about 30 plus about 30, so persistence
of levels there is partly a selection artifact). That requires extracting the table into data, which FoA's licence does not clearly
allow (a derivative or adaptation needs ARC's permission, FoA p.1). **Not done; one open question to the user (B3).** Nothing in
Barker depends on it.

---

## 8. MODULES, EXACT SIGNATURES, SOURCE RULES, AND PROPOSALS

New files only; no existing file is edited.

```
organs/barker.js                      pure organ (no fs, no fetch, no model): contracts, induction, nulls, verdicts
eval/barker/profiles.mjs              builds SystemProfile@1; writes manifest
eval/barker/induce.mjs                induction pipeline and arch cards A01-A13
eval/barker/eo-claims.mjs             EO battery EO-1..EO-4, crosswalk, calibration
eval/barker/transfer.mjs              L1-L4 under 5.0
eval/barker/self.mjs                  S1-S8
eval/barker/run.mjs                   driver: freeze, power, controls, battery, report
eval/barker/ast_extract.py            OPTIONAL adjunct (venv only): tree-sitter AST statistics to JSON for code systems
eval/barker/PREREG.lock.json          written by `run.mjs --freeze` (sha256 of the registry, data manifest, timestamp)
tests/barker-profile.test.js  tests/barker-induce.test.js  tests/barker-eo.test.js
tests/barker-calibration.test.js tests/barker-registry.test.js
tests/barker-transfer.test.js tests/barker-self.test.js    tests/barker-prereg.test.js
```

`package.json`'s `npm test` already globs `tests/*.test.js`, so these run with the suite. Outputs go to
`/private/tmp/claude-501/barker/out/` (manifest, profiles, cards, reports), never into `priors/` or `eval/competence`.

### 8.1 `organs/barker.js` (imports ONLY `kernel/rng.js`, `kernel/nullcheck.js`, `kernel/entity-kind-induction.js`,
`kernel/kind-induction.js`, `kernel/kind-functional-induction.js`, `organs/kind-standing.js`)

The blocks below are CONTRACTS: a `: Type` after a signature and a declaration ending in `;` without a body document the
return shape and are not JavaScript syntax. The implementation is plain ESM JavaScript.

```js
export const BARKER_VERSION = "1";
export const SEED = 20261005;
export const ALPHA = 0.05;          // asserted equal to adapters/text/keyness.js KEY_ALPHA by test
export const DRAWS = 999;
export const EO_BAN;                // frozen array of tokens, section 3.4
export const VERDICTS;              // ["INSTRUMENT_FAILED","UNDERPOWERED","REFUTED","WEAKENED","SURVIVES","NOT_TESTABLE_NOW"]
export const ARCH_STATUS;           // ["PERSISTENT","PERSISTENT-OUTSIDE-IE","FAMILY-BOUND","CHANNEL-BOUND","TRIVIAL","ABSENT","UNDERPOWERED","INSTRUMENT_FAILED"]

/** { ok, offenders: [{ path, token }] } — rejects EO vocabulary in ids, groups, bins, signatures, builders. */
export function assertEoFree(profileOrCells);

/** Validates and freezes a SystemProfile@1. Throws TypeError on a cell without giver, channel, n or ci95 policy,
 *  on an EO token, on a train/target channel overlap. Returns { schema, id, kind, inputs, labels, budget, cells, gaps, eoFree, contentHash }. */
export function makeSystemProfile({ id, kind, inputs, labels, budget, cells, gaps, provenance });

/** Signature index for the inducers. Bins cut on `reference` (training systems only). Assigns sequencePosition explicitly,
 *  asserts entity count equals the index's, returns gaps for any dropped entity.
 *  Map<systemId, Map<signature, { signature, featureKey, featureValue, firstAt, lastAt, evidenceIds:Set, witnessRefs:Set }>> */
export function featureIndexOf(profiles, { groups, reference, bins = 2 });

/** Planted CONTINUOUS world, then binned by the real pipeline. world: "kind" (planted gap) | "continuum" (one latent coordinate, no gap; variant "free"|"branch") | "copula"
 *  (Gaussian or Student-t copula with a supplied correlation matrix and marginals). Returns { continuous, matrix, blocks, truth: { kinds:[{ members, lineageSpan }] | null }, branches, lineages, pr } */
export function plantSystems({ world, branchSizes, lineageOf, strength, signatureCount, noiseCount = 60, commonCount = 10, correlation = null, marginals = null, df = null, variant = "free", seed });
/** Loading that makes the continuum world's pairwise signature correlation equal the kind world's at the same cell (closed form). */
export function matchedLoading({ strength, signatureCount, memberShare });
/** Effective feature dimension (sum lambda)^2 / sum lambda^2 of a correlation matrix. */
export function participationRatio(corr);
/** Hartigan dip statistic of a score vector; p by comparison with N-cov draws re-run through the same instrument (axis re-derived per draw). */
export function dipStatistic(u);
export function kindOrGradient(kind, matrix, { draws, alpha, seed, branches, lineages }): { label: "CLUSTER"|"FAMILY-BOUND"|"GRADIENT"|"REFUSED", u, dip, pDip, lineageSpan, pr };

/** Redeal under a null, moving whole FEATURE BLOCKS: kind "feat" | "cov" | "cov1" | "fam" | "curve" (curve only on matrices without blocks). `cov`/`cov1` need the continuous matrix.
 *  "fam" pools single-system lineages into one stratum and returns { famInformative }. Pure, seeded. */
export function redeal(matrix, { kind, blocks, continuous = null, branches = null, strata = null, rng });

/** Divisive spectral splitter (I3). splits: [{ members, other, T, depth, p }] */
export function spectralSplits(matrix, { draws = DRAWS, alpha = ALPHA, seed = SEED, minKindSize });

/** The ONE ceiling over the whole menu, four nulls (the largest ceiling kept), control built to fail.
 *  { ceiling, nulls:{feat,cov,cov1,fam,curve}, mu, sigma, tried, control:{ survivors, passed } } */
export function searchAwareCeiling(matrix, { instruments, draws = DRAWS, alpha = ALPHA, seed = SEED, branches, lineages, blocks, continuous });

/** Runs Kanada (never reading fallbackNomination), characteristic sets, spectral; judges all under the ceiling.
 *  Then runs the kind-versus-gradient discriminator on every survivor. Refuses (typed) when the control survived, the copula calibration failed, or a basin equals the population.
 *  { kinds:[KindRecord], refused:[{ type, detail }], ceiling, diagnostics, gaps } */
export function induceSystemKinds(matrix, { instruments = ["kanada","charset","spectral"], draws = DRAWS, alpha = ALPHA, seed = SEED, branches, lineages, blocks, continuous, population });

/** Power grid over strength x signatureCount on W-kind AND W-continuum; { cells:[{ strength, signatureCount, power, continuumFalseRate, admissible }], mde, copula:{ rate, rejected } } */
export function copulaCalibration(group, { worlds = 200, draws = 99, alpha = ALPHA, seed = SEED });   // { rate, ci95, rejected }
export function powerGrid({ branchSizes, lineageOf, strengths, signatureCounts, reps = 30, draws = 99, alpha = ALPHA, seed = SEED });

/** Weakest admissible planted cell at which a kind of this size/span would be detected. */
export function detectability(kind, grid);

/** Held-out assignment by cosine with the population null: { verdict:"member"|"not_member"|"unknown", kind, fit, p }. */
export function assignSystem(kindSet, signatures, { alpha = ALPHA });

/** Exact binomial upper tail P(X >= k), n trials, chance p0. */
export function signTestP(k, n, p0 = 0.5);
export function holm(ps, alpha = ALPHA);                       // boolean[] reject flags
export function clusterBootstrap(values, clusters, stat, { B = 2000, seed = SEED });   // { est, ci95:[lo,hi] }
export function coarsenToK(partition, k, trainStats);              // train-only agglomeration to equal k (6.0); no parameter-count penalty exists
export function reachability(nLineages, alpha = ALPHA);           // { minP, kNeeded } | { unreachable: true } (4.6)
export function nestedMean(valuesBySystem, branchOf, lineageOf);  // systems -> branches -> lineages
export function minimumEffectVerdict({ theta, ci95, sesoi, powerUp, powerDown, bridge, consumed, controlsOk, nullOk, mustBeatOk, signGate, channelsOk });   // 6.0 -> VERDICTS entry with reasons
export function powerTrio(runWorld, { sesoi, worlds, seed });   // plants 2s, 0.5s, and 0.1s at 10x n; returns { up, down, tiny }
export function persistence({ perLineage, sesoi, channels, nullOk, controlOk, powerUp, powerDown, trivialNull });   // 4.6 -> { status, k, nLineages, signP, reachability }
// verdictOf is replaced by minimumEffectVerdict above (no `delta = MDE`): the SESOI is registered, not read off the instrument
export function independenceAudit(channels);                   // S7 -> { components, effectiveN, collapsed }
export function archonStanding();                              // { trust: "checked", reason } until S1-S8 pass
/** Earned-cast seam (the-fold/earned-cast.js: state.mapLines -> "how the pieces fit together: ..."). Plain prose, no covert
 *  vocabulary, no apparatus nouns, always says what was NOT shown. Returns [] unless trust is "cleared". */
export function mapLines(report, { maxLines = 3, banned = [] });
```

### 8.2 `eval/barker/*.mjs` exports

Each file opens with a `// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══` leading comment block (the convention
`eval/competence/*.mjs` use); `eval/competence/lib.mjs::headerDigest(file)` stamps its sha256 into every card as
`details.prereg_sha256`.

```js
// profiles.mjs
export const FEATURE_REGISTRY;                                  // id -> { group, tier, channel, definitionId, floorRule, giver }
export function discoverSystems({ tbDir, evalDir, priorsDir, cardsDirs, codePriorDir }): Manifest;   // sha256 of every input, firstSeen, gaps
export function buildNlProfile(stem, { N, seeds = [1,2,3,4,5] }): SystemProfile;
export function buildCodeProfile(language, { corpusDir = null }): SystemProfile;       // grammar-only when corpusDir is null
export function buildNotationProfile(sampleId, { dir }): SystemProfile;                 // returns a gap profile now
export function writeProfiles(outDir, profiles): string[];
export function loadProfiles(outDir): SystemProfile[];                                  // re-runs assertEoFree

// induce.mjs
export const ARCH_REGISTRY;                                     // A01..A13: { id, foaArch, regularity, statistic, sesoi, nulls, control, power, kill, priorArt, pPersistent }
export function runInduction({ profiles, level: "S"|"R"|"W"|"K", groups, seed, draws, alpha }): InductionCard;
export function wordKinds(system): KindRecord[];                // Level W through discoverCompanyKinds on gold tokens
export function relationKinds(profiles): KindRecord[];          // Level R through the feature index
export function runArch(id, ctx): ArchCard;                    // 4.7
export function archLedger(cards): LedgerCard;                  // A11 functional-determination ledger

// eo-claims.mjs
export const EO_CLAIMS;                                         // 6.1 registry
export const RIVAL_REGISTRY;                                    // 6.0 roster: { id, giver, mappingSha, k, role: "null"|"must-beat"|"reference" }, one role each; registryLint() throws otherwise
export const SESOI;                                             // 6.0a: { testId, statistic, unit, value, justification, signedBy }; freeze refused while signedBy is empty
export const EO_SENTENCES;                                     // per test: { testId, bearing, eoSentence (<= 15 words, file+section), licensed }, hashed
export const CONSUMED_LANGUAGES;                               // 6.3: { grc, lat, san: "derived", rus: "consumed", ell: "near", ... } with source
export function cellOfGrammarSha(): string;                    // sha256 of CELL_OF_GRAMMAR (sorted keys); compared with PREREG.lock.json
export function underTestActTable(): { forms, classToAct };     // ActPrior@1, the ONLY place act-prior is read
export function underTestGrammarCells(): CELL_OF_GRAMMAR;       // the ONLY place cube.js is read
export function runEo1(ctx): TestCard;  export function runEo2(ctx): TestCard;   // EO-2 returns { O1, O2 } cards, each with H1 (non-Case) and H2 (Case) strata
export function tripleInventory(lang): { features, triples, perFeatureCounts, independentContrasts, minPermP };   // counts only, no role/ending profile read
export function equalisedJsd(profilesByValue, { floor = 100, downsamples = 200, seed });   // count-equalised divergence; also the un-equalised value for the artefact print
export function contiguousLevinCoarsenings(classes, { sizeProfile, draws, seed });         // N1c
export function withinMajorGroupPermutations(classToAct, { draws, seed });                   // N1b
export function runEo3(ctx): TestCard;  export function runEo4(ctx): TestCard;
export function crosswalk(): Table;                             // COMPARATIVE phase, no verdicts
export function calibration(ctx): TestCard[];                   // 6.8

// transfer.mjs
export function lofoFolds(profiles, { by: "branch"|"lineage"|"macro"|"system"|"codeFamily" }): [{ fold, train, test }];   // "branch" = the 13 LOBO folds, aggregated by nestedMean to 9 lineages
export function runTransfer(task: "L1"|"L2"|"L3"|"L4", ctx): TransferCard;
export function gainRule(perLineageLoss, { sesoi }): { gain, components:{ a,b,c,d,e }, ci95 };     // 5.0 (lower bound above SESOI; sign gate by reachability)

// self.mjs
export function runSelf(ctx): SelfCard[];                       // S1..S8

// run.mjs   node eval/barker/run.mjs --freeze | --check | --power | --controls | --comparative | --critical | --transfer | --self | --prospective | --all
export function main(argv): Promise<number>;
```

### 8.3 Source rules enforced by `tests/barker-prereg.test.js`, and proposals (none applied)

Enforced by a static scan (no execution):
1. **Zero model:** no Barker file matches `model-server|mouth\.js|node:https?|fetch\(|anthropic|openai|embedding`.
2. **EO-free inputs:** only `eval/barker/eo-claims.mjs` may import or read `cube.js`, `phasepost`, `relation-kinds`, `act-prior`, `case-priors`, `hyperlexicon`, `byFace`, and only inside `underTest*` functions.
3. **`fallbackNomination`** appears in Barker code only in a position that excludes it.
4. `ALPHA` equals `KEY_ALPHA`; `SEED` and `DRAWS` as above.
5. Every `eval/barker/*.mjs` has the pre-registration header; the BARKER.md registry hash equals `PREREG.lock.json` once frozen.
6. `mapLines` output contains none of `COVERT_TERMS` and `APPARATUS_NOUNS` from `the-fold/earned-cast.js` (imported by the TEST, not by the organ).
7. **Registry lint:** `RIVAL_REGISTRY` rows each have exactly one role, a `k`, a giver and a mapping hash; no EO-1 or EO-2 verdict code reads a role absent from it; `SESOI` rows each have a unit, a justification and (at freeze) `signedBy`; every EO result row carries `bearing`, `eoSentence`, `consumed`.
8. No `dl(`, no BIC-style penalty, and no `delta = MDE` verdict input anywhere in Barker code (the SESOI is registered, not read off the instrument).

Tests (behaviour): `barker-profile` (a contaminated cell is rejected; every cell has giver, channel, n; a duplicate stem resolves by file hash); `barker-induce` (planted kinds are recovered at admissible cells; the column-permuted control yields nothing above the ceiling; a whole-population basin is refused; the ceiling is non-decreasing in the number of instruments; `fallbackNomination` is never returned); `barker-eo` (the planted additive grid is detected and a random grid is not; enumeration of 9!/1! arrangements is exact; Gamma is 0.5 for alphabetical grains; calibration K1-K4 return their required readings); `barker-transfer` (a planted transfer is recovered; random kinds do not beat M0; the gain rule's five components behave on constructed cases); `barker-self` (S6's null worlds yield no persistent arch at the declared rate; a duplicated channel collapses).
**Tests added by the review.** `barker-calibration` (a W-copula world with the real correlation matrix and 200 replicates yields an any-kind rate not rejected as <= alpha, else INSTRUMENT_FAILED; a W-continuum world is called GRADIENT or nothing, never CLUSTER, at a rate <= the exact-binomial bound; a W-kind world is called CLUSTER at power >= 0.8 at admissible cells; blocks survive every redeal: `e01=hi` and `e01=lo` stay exact complements; `participationRatio` of a one-factor matrix is near 1); `barker-registry` (the SESOI trio: `2s` SURVIVES at rate >= 0.8, `0.5s` REFUTED at rate >= 0.8, `s` neither above alpha, `0.1s` at ten times n not SURVIVES; `reachability` table 9:8, 8:7, 7:7, 6:6, 5:5, 4:unreachable; rival and SESOI lint; an unlicensed bridge can never return REFUTED); `barker-eo` additions (a nine-range Levin table with no EO input passes N1 and fails N1b and N1c at <= alpha; a planted language with identical profiles and unequal counts reads Gamma 0.5 after equalisation and above 0.5 before; the frequency-rank control reproduces a count-driven Gamma; `tripleInventory` returns 47 potential triples over 7 features from the table and a per-language count; a language with fewer than 3 independent contrasts is a typed gap; rows for consumed languages are excluded from the headline).

**Proposals for the main agent (edits to files Barker may not touch):**
- **P1** `the-fold/earned-cast.js`: where `state.mapLines` is built, call `organs/barker.js::mapLines` (a seam already waiting: the "map-ask" trigger and the `barker` fact line). Keep `DEFAULT_TRUST.barker = "checked"` until S1-S8 pass; `mapLines` returns `[]` for any other trust level.
- **P2** `README.md` Handle table: add the Barker rows above.
- **P3** `kernel/entity-kind-induction.js::induceEntityKindCandidates`: refuse a basin whose size approaches the population (`no_boundary`, as `testKindMembers` does), and stop emitting `fallbackNomination` as a `candidate` (it is present in 31 of 40 structureless controls here and 77-80 of 100 in the sibling's); or return it under a separate key. This is READING-SPEC S41's own "real unstarted work".
- **P4** `kernel/kind-induction.js`: `kindEvidence` accepts entries lacking `sequencePosition` that `ingestFeature` then drops silently, and duplicate evidence ids collapse silently; return a typed gap or throw.
- **P5** `kernel/kind-induction.js`: numeric `0.5` and string `"0.5"` produce different signatures (`stableValue`); document or normalise.
- **P6** `kernel/kind-graph-structure.js`: `DEFAULT_DEPTH_THRESHOLDS = [2,4,8,16]` is a typed schedule (P4): derive from the entity's own participation distribution.
- **P7** `kernel/cube.js::CELL_OF_GRAMMAR` header prose versus the table (6.3 audit): reconcile one to the other.
- **P8** `organs/kind-standing.js::discoverCompanyKinds` splits on `/\s+/`: unspaced scripts need gold tokens (Barker supplies them; the organ should say so in its refusal).
- **P9** (a request, not a source edit) `kernel/cube.js::CELL_OF_GRAMMAR`: supply the table's revision history and the list of treebanks and languages its authors consumed after 2026-09-17 (B7), so that `CONSUMED_LANGUAGES` is complete; and the EO defender's per-test `eoSentence` (B6).

### 8.4 How Barker's outputs enter the system

1. **Report** (`BarkerReport@1`, JSON and a generated markdown table; failures printed first). 2. **Proposed priors**
(`BarkerPrior@1` for gains that passed 5.0; written only to the scratch output directory). 3. **`mapLines`** for the earned cast:
only when `archonStanding().trust === "cleared"`, which requires S1-S8 to pass and the false-arch bound of S6 to hold, and every
line states what was NOT shown ("how the pieces fit together, as far as nine lineages can say; this reading is itself one of the
pieces"). Until then Barker stays `checked`: it may be consulted, it may not speak unprompted.

---

## 9. PRE-REGISTRATION PROTOCOL, RUN ORDER, REPORT

**Freeze.** The text between the `PREREG:BEGIN` marker (start of section 3) and the `PREREG:END` marker (after section 11) is the
registry: sections 3 through 11 and both appendices. `node eval/barker/run.mjs --freeze` computes its sha256, the manifest's sha256 and a timestamp into
`PREREG.lock.json`; every card embeds `preregSha`. After the freeze: nothing above the freeze line is edited; changes are
**ADDENDA** appended below, each stating the date, what had been SEEN when it was written (which cards, which numbers), and
that no rule it changes was evaluated after that sight. A bug found after seeing results gets an addendum and BOTH runs are
reported. Each `eval/barker/*.mjs` header holds its own pre-registration and digest (the `eval/competence` convention).

**Freeze gates (added by the review; `--freeze` refuses until all hold).** (i) Every `SESOI` row has `signedBy` (EO rows by the EO defender, Barker rows by the user; Appendix B5); (ii) the EO defender's per-test `eoSentence`s are recorded and hashed, or recorded as ABSENT with the verdict cap of 6.0 applied (B6); (iii) `cellOfGrammarSha` and `CONSUMED_LANGUAGES` are written (B7); (iv) `RIVAL_REGISTRY` lint passes; (v) the unit tests of 4.6 and 6.0 (the SESOI trio) and `barker-calibration` pass on synthetic worlds.

**Order (no peeking).**
| Step | Content | Rule |
|---|---|---|
| R0 | manifest, hashes, gaps | writes `manifest.json` |
| R1 | integrity (G0): the JS profile reproduces the received priors' counts to 1e-9 (role-config `before/total`, pos `tokens_read`) for every stem whose source file is identical; and agrees with the Python pilot's profile within the bootstrap SE on the 10-language set | a mismatch means the profile is suspect; nothing later runs |
| R2 | **ALL power cards and calibration worlds** (4.4 W-kind, W-continuum, W-copula; arch cards; the SESOI trio of every EO test; transfer; self) and the inventories that need counts only (EO-2 `tripleInventory`) | frozen with their hash BEFORE any real-data STATISTIC (the copula worlds read the real correlation matrix and marginals but compute no kind statistic on real data); a test whose power card fails is NOT run on real data (UNDERPOWERED, no peek); a group whose copula calibration is rejected is INSTRUMENT_FAILED |
| R3 | controls built to fail on real data | a surviving control is INSTRUMENT_FAILED |
| R4 | COMPARATIVE phase: induction, alignment, crosswalk tables | descriptive, no verdicts |
| R5 | CRITICAL phase: arch cards, EO battery | one real-data run per test per freeze |
| R6 | transfer L1-L4 | gain rule 5.0 |
| R7 | self-application S1-S7 | S6 gates the arch list |
| R8 | prospective (later, repeatable as data arrive) | scored once per system |

**Report (`BarkerReport@1`).** Failures first: INSTRUMENT_FAILED, then UNDERPOWERED, then REFUTED, WEAKENED, then SURVIVES; the
near-foregone tests in their own table; per card: id, phase, claim, bearing, steelman reference, power (with MDE), controls
(each: expected failure, observed), result with interval, verdict, gaps with denominators, frame id, `preregSha`,
`prereg_sha256` of the module header, input hashes. The report contains no sentence that is not generated from a card.

**Cost (declared so a silent cap cannot hide).** UD parse of 33 treebanks (about 5 million lines) once, cached by sha; kind
induction about 40 to 70 ms per matrix at n = 33 to 50. Real-data ceilings: three nulls x D = 999 x about 8 groups x levels S
and K, about half an hour. Power grid 4.4: 9 cells x 30 replicates x 99 draws x 3 nulls, about 1.5 hours. S1: 200 resamples at
D = 99, about 1 hour per level and group. Level R (n about 700) is heavier and bounded by `neighborCount`. EO-1 N2 is 362,880
closed-form fits (seconds); bootstraps B = 2,000 over lineages or lemmas. Added by the review: the W-copula calibration is 200 worlds x D = 99 x 4 nulls x about 70 ms, about 1.5 hours per feature group (groups in parallel processes); the continuum grid is 9 cells x 100 worlds x 2 variants x D = 49, about 3 hours per variant; EO-1 N1b and N1c are 2 x 9,999 centroid refits (minutes); EO-2 is 200 downsamples then 9,999 joint draws per language on cached equalised profiles. Any truncation is a typed gap in the card, never a
quiet cap.

---

## 10. RECORDED PREDICTIONS (before any run) AND RISKS

### 10.1 What the architect expects, with probabilities

These are written now so that surprise is measurable. They are the architect's guesses, not findings, and were formed after
reading EO's documents, the pilot's reported results and the architect's own inducer probe (section 2.4); the pilot's author saw
the role-config numbers before writing its textbook checklist (its Addendum C), and v1 inherits that disclosure.

| Item | Prediction | P |
|---|---|---|
| Power (4.4) | only strength 0.8 with signatureCount >= 12 is admissible at n = 33 | 0.7 |
| Level-S: at least one CLUSTER (beats the four-null ceiling AND the dip discriminator) in any group | at least one | 0.30 |
| Level-S: at least one GRADIENT (beats the ceiling, fails the dip test): script, spacing or head-direction axes | at least one | 0.80 |
| Calibration | the W-copula any-kind rate is not rejected in at least 6 of the 8 feature groups, and the SESOI kind cell is admissible | 0.60; 0.25 |
| A01 | derived cutoff beats the typed rank by at least the SESOI | 0.55 |
| A02 / A03 / A04 | PERSISTENT | 0.25 / 0.20 / 0.12 |
| A05 | PERSISTENT | 0.35 |
| A06 | PERSISTENT (S43 refuted the door once) | 0.15 |
| A07 | PERSISTENT (recovers Sapir/Blake/Gibson) | 0.30 |
| A08 | TRIVIAL | 0.90 |
| A09 (k = 3 preferred) | PERSISTENT | 0.10 |
| A10 / A12 / A13 | PERSISTENT / unity / non-tree | 0.18 / 0.18 / 0.40 |
| L1 gain (strict) | any target passes 5.0 | 0.25; M3 <= M5: 0.25 |
| L2 | a derivation beats typed on a gate; at least one gate INERT | 0.20; 0.70 |
| L3 | D_kind beats D_global | 0.30 |
| L4 | kinds beat script | 0.10 |
| EO-1 plain N1 (calibration, near-foregone) / S1 primary / S2 / r >= 1/3 / knee at 9 | passes / survives / survives / holds / within CI | 0.97 / 0.25 / 0.12 / 0.45 / 0.20 |
| EO-2 | non-Case component testable; Case O1 beats the null by the SESOI; SURVIVES (both components, both operationalisations, must-beat rivals, frequency-rank control); UNDERPOWERED overall | 0.35; 0.40; 0.08; 0.55 |
| EO-3 | Delta_1 > 0, Delta_2 > 0, Delta_3 > 0 | 0.99, 0.90, 0.70 (near-foregone) |
| EO-4 | testable; survives if testable | 0.15; 0.40 |
| S6 | the false-arch bound holds | 0.50 |
| Headline | of the non-near-foregone EO tests that are not UNDERPOWERED, EO survives fewer than half | 0.60 |

The headline line is recorded because it is a real expectation that EO is weaker than its documents hope on content-facing
operationalisations; the same table also records where Barker expects to be underpowered, so the two directions are symmetric. **Re-recorded after the review (before any run):** the first-draft 0.55 for "a Level-S kind survives
N-fam" is WITHDRAWN: the panel showed that the first-draft nulls could not tell a kind from a correlated continuum, so the quantity was near 1 for a reason that carried no information (the reviewer
put it above 0.95). The kind rows above replace it. The arch, L1 and EO rows fell because 8 of 9 lineages, a registered SESOI and (EO-1) structure-preserving nulls are stricter than 10 of 13 branches,
bare significance and plain N1. The headline row counts only tests with a licensed bridge and unconsumed languages (6.0).

### 10.2 Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **EO contamination** of features, rivals or gold: the wenyan prior's `byFace`; `case-priors` and the act prior built through EO tables; `.eot.json` files; competence cards (EO instruments' outputs); a Barker feature quietly derived from a cell | the ban list and scan (3.4, 8.3); `underTest*` isolation; cards read as SUT only; a planted contaminated cell must be rejected |
| R2 | **Over-claiming from few systems:** 9 lineages (13 branches, 8 singletons among them), 73 percent Indo-European, code thin, notation absent | the unit of replication is the LINEAGE (U = 9); the sign gate needs 8 of 9 and is unreachable below 5 defined lineages; PERSISTENT-OUTSIDE-IE needs 7 or 8 of 8; every kind carries its detectability class; UNDERPOWERED is a first-class verdict; no statement of absence outside admissible cells; every verdict is relative to a registered SESOI |
| R3 | **The temptation to rig, in BOTH directions:** choose rivals EO beats, or rivals it cannot; choose operationalisations after seeing numbers; read a failure as "the proxy was bad" and a success as "EO confirmed" | rivals registered with giver and hashed mappings BEFORE the run; the fair-test certificate and near-foregone label; no aggregate EO score; failures printed first; the same verdict function for EO and for Barker's own list; both the EO-hostile and EO-friendly probabilities recorded; **the first review panel's findings and dispositions are section 11 (pre-freeze, inside the registry); a SECOND independent look at the amended text, instructed to find how each test could still be rigged for or against EO, remains requested (B2)** |
| R4 | **Galton's problem and contact:** relatives are not independent; Balkan and other areal convergence (bul, ell, ron, srp) is unmodelled | branch-blocked nulls, N-fam (informative only in multi-system branches), sign test over lineages, S-twin controls; areal convergence stays an open confound, stated |
| R5 | **Treebank convention and genre confounds:** UD conventions differ by treebank (the pilot's head-final feature failed to separate jpn/kor/tur); genre differs (EWT is web text) | within-language second-treebank control (kor GSD/KAIST), cmn/cmn-hans script twin, UD-versus-UDHR text, treebank name as a stratifier; claims about "the language" are claims about "the treebank" until twins agree |
| R6 | **Multiplicity and forking paths:** 13 arch cards, 4 EO tests, 4 transfer tasks, 3 instruments, 3 nulls, bins, groups | Holm within each battery; one ceiling over the whole instrument menu; every operationalisation choice listed in the registry; sensitivity tables printed, never selected from |
| R7 | **Two implementations** of measurements the builders already made (JS here, a Python pilot, the received builders) | G0 equality to 1e-9 at the typed setting; the pilot is a cross-check, not an input |
| R8 | **The inducer is weak at this n** (probe 2.4): findings may be script or genealogy only | detectability classes; spectral instrument added under the same ceiling; S3 decomposition reports exactly that |
| R9 | **Fidelity to FoA:** its arches are claims about frameworks, not data claims; ours are operationalisations that can be strawmen; a failed proxy refutes the proxy, not the arch as FoA states it | every card says "operationalisation of arch N"; the steelman precedes each test; licence respected; no endorsement implied; FoA's own immunising moves refused (1.4) |
| R10 | **Names and vocabulary leaks:** the persona in prompts, EO terms in Barker's text (the earned cast bans "cell", "grain", "operator", "phase" in model-facing prose); the `eo_` files are Esperanto | `mapLines` is checked against the cast's ban lists; the EO-free scan is token-bounded and file-prefix aware |
| R11 | **A moving data tree** (ces, srp, hrv, slk, slv, ron, cat, glg arrived during design) | manifest hashes and `firstSeen`; S-prospective; nothing fitted on a system that arrived after the freeze |
| R12 | **Competence cards are in flux and owned elsewhere** | read-only, schema-checked, hashed at read; a card that changes between freeze and run is a typed gap |
| R13 | **Barker's own typed choices** (family labels for code, median bins, floors, the `n_min` tokens) | listed in 3.8; sensitivity reported; derivations named for later |
| R14 | **Authority of the booklet's name** being used to lend weight to a result | the name is a handle; cards carry khora's frame and falsifiers are labelled Barker-in-khora |
| R15 | **Kind versus gradient:** any clustering finds clusters in a correlated continuum; N-cov is Gaussian, so a non-Gaussian continuum (heavy tails) could still be called a cluster | four nulls with N-cov, the dip discriminator, `PR` printed, the W-continuum and W-copula calibrations, the t-copula sensitivity; a calibration failure withdraws every kind of that group |
| R16 | **The SESOI is the architect's guess until signed:** an unsigned SESOI can still be tuned toward either verdict | registered before any power card, signed by the defender (B5), sensitivity at half and double printed, never selected from; the freeze refuses unsigned rows |
| R17 | **Consumed or revised data:** the grammar table's revision history is unknown, so "unconsumed" is conditional | `CONSUMED_LANGUAGES` with sources, `cellOfGrammarSha`, the history requested (B7), unconsumed-only headline |

---

## Appendix A. What was taken from FoA, by page (paraphrase; no passage reproduced)

| Page(s) | What FoA says, in our words | Used for |
|---|---|---|
| 15, 52 | archdisciplinarity compares unification metatheories as units, from an approach external to them | the scope shift in 1.2; the "outside" wording we do NOT adopt |
| 16-17 | an evidence ladder from opinion to absolute truth; a law needs independent repeated demonstration | the observation that p.79's claim outruns the ladder (1.4) |
| 18, 73, 76 | no framework fully represents itself; each scope inherits the errors below it; archtheory is expected to be self-referential | the stance "the map is itself coordinated"; section 7 |
| 20-21, 78-80 | recursion, types, operations, functions persist at every reflective iteration | A02 |
| 22-23 | orders of hierarchical complexity; five axioms; horizontal/vertical | A03 |
| 23-25 | self-similarity across levels | A04 |
| 25 | the included middle | A05 |
| 22, 32-34, 57 | integrative levels; universal classes | A06, A01 |
| 27-29, 57 | six word classes and function-word types as onto-epistemic elements | A01, EO-2 rival |
| 29-31 | ruliad and multicomputation | typed gap |
| 35 | the nine proposed arches; "more arches remain" | the registry's origin; permeative boundaries are NOT in this list |
| 52-53 | five criteria for a unification metatheory (permissive: one or more) | EO qualifies as comparable (6) |
| 54 | arch = a pattern shown in two or more unification metatheories; base hypotheses; two archtheories built from the same content at the same level should come out about the same | the definition; A12 |
| 55-58 | three routes of classification (history, conventional category, arch presence) | S3, S5, L4 |
| 56 | a framework read through another is not yet an archtheory; track the lens's bias | 6.0 rivals rule |
| 60-61 | arbitrary versus non-arbitrary pluralism; a ladder of pluralism | A12 |
| 63-66 | verification needs an external reference one rank up; mutual respect; critique kept apart from comparison | the two phases (1.3) |
| 66-72 | meta-mapping, meta-hermeneutics, perspective coordination, application; preservative versus non-preservative synthesis; transcendent versus immanent critique | the immanent form of the EO tests (1.3) |
| 76-87 | the derivation of the first arch: same unit-relation-system form in two frameworks with sides inverted; forward/backward comparison; arches identified without judging truth | A07, A09, A10; the only imitable step (1.5) |
| 59, 64, 91, 48 | persistence regardless of fit; unverifiable by ordinary methods; arches found inside the argument against them; rejection pre-labelled as transition | the four refused moves (1.4) |
| 88 | the discoverer revises his own framework with the arch | the report "revises" Barker's own list (S4, S5) |
| 108-133 | Table 4, about 190 frameworks; exhaustive but incomplete | not extracted (7) |

## Appendix B. Decisions requested of the user

- **B1.** Approve the optional Python adjunct `eval/barker/ast_extract.py` (tree-sitter in the existing venv, no global install), needed only for code systems with a corpus.
- **B2.** Choose the independent reviewer for the pre-freeze rigging review (R3): another agent, or the user.
- **B3.** Ask ARC whether Table 4 may be extracted as data for the section-7 recursion; until then it is not.
- **B4.** Decide whether `mapLines` (8.4, P1) should ever be wired; the design keeps Barker `checked` until S1-S8 pass.
- **B5.** SIGN the SESOI table (6.0a, 4.7a, 5.0): the EO defender (main agent or user) for the EO rows, the user for the Barker rows. The freeze refuses an unsigned row. A signer may change a number BEFORE the freeze, and the changed number is the one registered; after the freeze none may be changed.
- **B6.** The EO defender writes, per EO test, ONE sentence naming the observable that would count against the claim (for EO-2, whether the header's grain semantics or the table's is operative); Barker registers it verbatim. Without it, REFUTED is unavailable for that test (6.0).
- **B7.** Provide `cube.js::CELL_OF_GRAMMAR`'s revision history after 2026-09-17 and every language or treebank its authors consumed, so that the consumed-language list (6.3) is complete.

## 11. Amendments from review (2026-10-05)

*Placed after the appendices so that the numbering of sections 1 to 10 and Appendices A and B, which other text cites, is unchanged. It is inside the registry and is hashed with it.*

The first review panel returned `needs_fixes` with three blockers and (at least) six majors. Each finding is listed with its disposition: **accepted** (done as stated),
**accepted with modification** (done, with the changed element named and why it is stricter or necessary), or **rejected** (with reason). No finding was resolved by deleting a
claim or loosening a rule; where a finding said a test could not fail, the test was made able to fail and the claim kept. These amendments were made BEFORE the freeze, so they are
edits to the registry above, not addenda; the pre-review text is kept in the architect's scratch directory only.

**The panel text received is incomplete.** It ends mid-sentence in finding 9 ("h_f is") and then runs into a copy of the original design summary. The remainder of finding 9, and any
finding after it, was NOT received and is not addressed by name. For finding 9 the visible parts (replication unit, Holm on the sign tests) are fixed and `h_l` is defined in 4.6 because the cut-off sentence
evidently concerned it. The orchestrator is asked to resend the remainder; it will get a second table here.

| # | Sev | Finding (short) | Disposition | Where |
|---|---|---|---|---|
| F1 | blocker | Nulls cannot tell a discrete kind from a correlated continuum: column-wise permutation destroys real feature correlations and breaks one-hot blocks, N-fam does nothing for singletons, spectral and binding-energy statistics reward a dominant factor, the power grid never plants a continuum, and P = 0.55 was miscalibrated | **Accepted**, all five fixes. (1) Every null moves whole FEATURE BLOCKS. (2) N-cov and N-cov1 (Gaussian copula with the observed correlation and marginals; one-factor SigClust-style bootstrap) join the ceiling, which takes the maximum over all nulls. (3) W-continuum (must be called GRADIENT or nothing) and W-kind worlds, with cell admissibility requiring both. (4) The participation ratio is printed next to every kind, group and null. (5) The Hartigan dip test on the separating coordinate, against N-cov draws, separates CLUSTER from GRADIENT. N-fam: the single-system lineages share one stratum and N-fam is declared `fam_uninformative` for kinds with fewer than 4 members in multi-system branches, the lineage-span rule carrying the genealogy claim. **Modification:** the panel's test read "kind-found rate must be <= alpha"; a correctly calibrated instrument at alpha exceeds the observed rate 0.05 about 44 percent of the time at 200 worlds, so the rule is the exact one-sided binomial test at 0.05 (16 of 200 rejects; its power against a true rate of 0.10 is 0.86 and is printed), which is a standard calibration and still fails an instrument whose rate is inflated by half. The 0.55 prediction is withdrawn and replaced (10.1) | 4.1, 4.3, 4.4, 4.5, 6.8 (K5), 7 (S6), 8.1, 10.1, R15 |
| F2 | blocker | No instrument-independent SESOI: `delta` was the instrument's own MDE and the planted grid was arbitrary, so REFUTED was unreachable when the instrument was weak and SURVIVES trivially reachable with large n | **Accepted** with a corrected unit test. A SESOI is registered per test, in the statistic's own units, with justification, before any power card (6.0a, 4.7a, 5.0), signed by the defender at freeze (B5). SURVIVES requires the interval's lower bound above `s`; REFUTED requires its upper bound below `s` with power to say so; UNDERPOWERED otherwise. Power cards plant at `2s`, `0.5s` and `0.1s` at ten times n. **Modification:** an effect exactly at `s` has an interval that straddles `s` by construction, so "called SURVIVES at power 0.8" is incoherent with an interval-above-SESOI rule; the unit test is the trio plus "exactly at `s` is neither more often than alpha", which is stricter on both sides. 4.6 ABSENT is likewise restated in the statistic's units. | 6.0, 6.0a, 4.6, 4.7a, 5.0, 8.3 |
| F3 | blocker | EO-1 S1 close to foregone: N1 destroys Levin locality; the unanimity filter is fixed by EO's own mapping and not redone in the nulls; the power card plants lemma-level eta2 | **Accepted**, all four fixes. N1b (acts permuted inside the same Levin major group) and N1c (random contiguous coarsenings with EO's size profile) are the nulls of record; the unit set is one rule applied to the real mapping and to every null (first listed class; the unanimity-filtered set is a labelled secondary); the power card plants class-coherent groups with within-class noise from the real class sizes; plain N1 is a labelled near-foregone calibration. **Modification:** the panel's test said the contiguous-range table must be "indistinguishable from EO under the structure-preserving null"; that is a data outcome, not a unit test, so the unit test is that the table passes N1 and fails N1b and N1c at <= alpha, while "EO indistinguishable from Levin neighbourhoods" is stated in advance as a possible result. P(S1) re-recorded 0.65 to 0.25 | 6.2, 6.8 (K6), 10.1 |
| F4 | major | Rival taxonomy ambiguous (data-driven partition both must-beat and reference); Levin major group fits no category; BIC term double-penalises held-out CE; Peirce valence is a weak 3-group rival on blocks that exclude b1 | **Accepted.** Every rival has one role in the hashed `RIVAL_REGISTRY` (null, must-beat, reference) with `k`, giver and mapping hash; the penalty is dropped and comparison is held-out CE at EQUAL k by train-only agglomeration, native-k CE printed apart; Levin is coarsened to 9 (reference) and the contiguous-Levin distribution is a null. **Modification:** the panel asked that the data-driven 9 be both "must-beat" and "non-required to win"; those cannot both hold, so it is a REFERENCE with teeth through the capture ratio `r` (below 1/3 is WEAKENED). Peirce valence is now read from VerbNet FRAMES (independent of UD and of EO), scored on all four blocks and compared with EO coarsened to 3. Registry lint added | 6.0, 6.2, 6.3, 8.3 |
| F5 | major | EO-2 tests a bridge hypothesis EO does not state; cube.js grains derive from ENDINGS and the header defines grains as clause positions; header prose and table disagree | **Accepted.** Bearing is PROXY-BRIDGE (O1); a second, ending-level operationalisation O2 (word-final 2 characters, the builders' own declared `endingLength`) is added and BOTH must pass for SURVIVES; each EO verdict prints bearing and a quoted `eoSentence`; the defender writes one observable per test before freeze (B6). **Modification:** without a licensing sentence REFUTED is unavailable (a failure is WEAKENED, `bridge: failed`); a pass is SURVIVES, `bridge: unlicensed`; neither enters the headline, so no win or loss is scored for EO on a hypothesis that is Barker's (rule 9, symmetric) | 6.0, 6.3, 6.1 |
| F6 | major | EO-2 JSD sampling artefact: frequent values are the same-grain pairs and JSD bias scales inversely with count; the null keeps counts | **Accepted**, all three. Count equalisation by downsampling to the smallest count in each triple (floor 100) averaged over 200 downsamples; a frequency-rank grain control that the table must beat by the SESOI; Gamma reported for oblique-only and mixed Case triples and for non-Case apart; the planted identical-profile unequal-count language | 6.3, 6.8 (K7), 8.2 |
| F7 | major | EO-2 effective sample far smaller than 33 x triples; power card uses synthetic languages; data-driven rival under-specified | **Accepted.** The triple inventory is computed from the table (47 triples over 7 features, 36 of them Case) and per language from counts; the power card runs on the real per-language sets; independent contrasts and minimum attainable p printed; languages with fewer than 3 contrasts are typed gaps; the DD rival is a within-feature 3-partition learned on other languages' equalised profiles, scored only where both are defined, coverage printed; Case and non-Case are separate headline components (H1, H2). **Factual correction:** the review said Tense has no same-grain triple; the table gives Past and Fut the same grain (Pattern), so Tense has one, though Fut is usually absent in UD. Number has none | 6.3 |
| F8 | major | "Languages that did not derive it" not shown; the table was revisable and its prior exists for rus | **Accepted.** `cellOfGrammarSha` locked; `CONSUMED_LANGUAGES` = grc, lat, san (derived), rus (consumed: `case-marking-rus.json` is a CasePrior built through the table), ell (near); revision history requested (B7, P9); headline uses unconsumed languages only; rows carry `consumed` and the registry lint requires it | 6.0, 6.3, 8.2, 8.3 |
| F9 | major | Replication unit overcounted: five IE branches called top-level families (about 9 independent lineages); the sign test needs 8 of 9 not 10 of 13; Holm on sign tests across 13 cards makes 12 of 13 necessary so PERSISTENT is unreachable; `h_f` ... (text cut) | **Accepted** for everything received. Lineage (9) is the independence unit, branch (13) the blocking unit, with nested averaging; every sign gate and bootstrap uses lineages; the reachability table (5/5, 6/6, 7/7, 7/8, 8/9) is printed with each card. Holm is applied to the pooled-effect tests only; the sign test is a gate at alpha (a conjunct cannot inflate a conjunction) and the list-level false-arch rate is bounded empirically by S6; this resolves the "unreachable by construction" objection without weakening either gate. `h_l` is defined (sign only; UNDEFINED, and out of the denominator, where the card's planted power at that lineage's own n is below 0.8 at `2 s_R`, a decision made before real data). **If the panel intended Holm over the sign tests as well, PERSISTENT would be reachable only by unanimity of nine lineages and the arch layer would reduce to a power report; that reading is rejected for that reason and flagged for the panel** | 2.1, 3.6, 4.6, 5.0, 7 (S4), 10.2 |

**Architect's own additions found while applying the review.** (a) Levels R, W and K: entities nested in systems are not exchangeable across systems, so their nulls redeal within system strata and a kind is labelled by lineage span (4.1). (b) The
copula calibration reads the real correlation matrix and marginals, which is real data; it computes no kind statistic on it and is declared an R2 inventory-and-calibration step (4.4, 9). (c) GRADIENT structure may not enter the transfer model M3 as a kind (it is a continuous coordinate in M5) (5.0).
(d) A t-copula sensitivity (4 degrees of freedom) is printed because heavy-tailed continuous dependence is the likeliest way N-cov could be too kind to the null (4.4, R15). (e) The per-card and per-task probabilities were re-recorded lower, before any run, because the gates are stricter (10.1). (f) The EO-2 rival "data-driven 3-partition" moved from an implicit must-beat to a reference
with a capture-ratio rule (6.3).

**Not changed, on purpose.** EO-3 stays a near-foregone calibration (EO's own definition licenses iterating Pattern); EO-5 and EO-6 stay as calibration claims, not re-litigated; the six NOT_TESTABLE_NOW claims keep their exact missing data; there is still no aggregate EO score; FoA's four immunising moves stay refused (1.4).

**Residual limits these amendments do not remove.** With 9 lineages, 8 singletons among 13 branches, and 33 systems, the sign gate is coarse and most arch cards and kind absences are expected to read UNDERPOWERED (the registered expectation, 10.1); the SESOIs are the architect's proposals until
signed (B5); N-cov models dependence as Gaussian, and the calibration worlds measure only the copula families built (Gaussian, plus a t sensitivity); a systematic error shared by all of UD's annotation conventions is outside every null here (R5).

<!-- PREREG:END -->

---

## ADDENDA (below the freeze line)

*None yet. Each addendum states its date, what had been SEEN when it was written (which cards, which numbers), and which rule it
changes; no rule may be changed after the result it governs has been seen, only reported alongside a corrected rerun.*
