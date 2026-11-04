# ATTENTION BINDER: "it" and "The tower" bound to the attended referent — pre-registration, written before PARA-GOLD is scored

Date: 2026-11-03. Agent: the attention-binder session (started by "Fold MVP scope"). Base: khora `15f82fc`, branch `attention-binder`.
Step 2 of the approved plan (`~/.claude/plans/composed-snuggling-tower.md`). Scored once on PARA-GOLD v0 (`PARA-GOLD.json`, sha256
`1f7541487e02175d9cb6c9f498f66bde38c2e802277122a5eb32aeb20ee3354f`, frozen 2026-11-03T17:01:18Z). This file is hashed (`PREREG-ATTENTION.sha256`,
`.time`) before the gold set is read by this code. Nothing in `PARA-GOLD.json` was edited or consulted while building: its 15 binding cases were
read once to learn their shape (task brief) and its Eiffel / Concorde / Cumberland texts were not used to develop or tune anything.

## The defect

`adapters/text/pronouns.js` binds the gendered third-person singular only (its header: "nothing here reads definite descriptions"), and
`eval/referents/PREREG-PRONOUN-GAPS.md` records that it / its / itself are never looked at. On the Eiffel Tower lead 9 of 45 sentences ("It …",
"The tower …") stay about nothing, with no gap reported.

## The change (one opt-in function; the reader is not wired to it)

`native/adapters/text/attention-binder.js::bindAttended(sentences, mentions, dials)`, plus one additive closed class in `priors.js`
(`NEUTER_THIRD_PERSON` = it, its, itself; the gendered table `THIRD_PERSON_SINGULAR` is untouched). It returns `{ bindings, gaps, ruling }`; every
target the binder looks at either binds or files a typed gap.

- **Targets.** The neuter pronouns anywhere in a sentence (not inside a cast mention), and a sentence-initial `The <word>` (the article is the
  received definite determiners minus the demonstratives, which point at something nearer than the attended referent).
- **The attended referent.** The candidate with the highest decayed presence (`kernel/activation.js::createActivation`, the gradient the he/she
  rungs read), read over the sentences BEFORE the target's. The sentence's first naming counts `boost` times (a position proxy for the subject, as
  `resolvePronounsByPresence`'s own `boost`). A mention that overlaps a longer mention of another being is not that being's firing (longest naming
  claims its bytes, `pronouns.js`'s matcher rule).
- **A definite description reaches a referent only through words the text gave it** (no noun list): the words of its own cast surface; the words of
  the noun phrase that contains the name ("the Statue of | Liberty"); and the kind the text predicates of it with a copula ("Concorde is a
  British-French supersonic airliner" → airliner; the phrase ends at the first determiner, clause opener, coordinator or comma; capitalised words are
  names and are left out). All closed classes used are the received ones of `priors.js` / `phasepost.js`. A word no referent was given is the typed
  gap `description_unbound`.
- **Typed gaps, never guesses:** `pronoun_no_candidate`, `pronoun_below_floor`, `pronoun_no_margin`, `description_*` likewise, `center_elsewhere` (the
  previous sentence began with another candidate, or with a description the cast does not know: the pronoun most likely continues THAT; this is
  the centering preference, and it is what is expected to catch b09), and `clause_mate` (off in the scored run, see the dev sweep).
- **Who may be "it".** With the caller's `nonPersonal` ruling (`non-personal.js`: time names + the lexicon giver) exactly that set. **On this
  machine the Wiktionary pack is absent (`localLexicon("en").giver` is null), so every run in this registration, development and gold, uses the
  fallback `ruling: "text_evidence"`: every cast referent that the text does not show to be a person (a he/she in the same clause as its sole naming).
  That is weaker than the giver's ruling and it is reported on every result. How the binder behaves under the giver's ruling is NOT tested here.**

## Declared dials (chosen on the development set below; `eval/attention/score.mjs::DECLARED`)

`window` 12 · `minActivation` 0.5 · `minMargin` 0.2 · `boost` 2 · `feed` true · `centerVeto` true · `clauseMateVeto` false.
The 27-point sweep over window {6,12,24} × margin {0.1,0.2,0.3} × boost {1,2,3} on the development set is in `DEV-RESULT.md`: boost 1 is unstable
(precision 0.50–0.89, coverage 0.32–0.63: mostly gaps, because without a subject proxy the first sentence ties); boost ≥ 2 is a plateau (precision 0.83–0.94, coverage 0.58–0.84); window 6–24 and margin 0.1–0.3 move little at boost 2. The values
are the plateau's middle, not its maximum. `clauseMateVeto` cost one right binding and saved no trap on the development set, so it ships off (the option
and its unit test remain).

## Sets

| set | what | role |
|---|---|---|
| DEV | `DEV-SET.json`: 24 hand-labelled tokens (19 attended, 5 traps where "it" refers to something else) in 5 frozen texts (Statue of Liberty, Gateway Arch, Hoover Dam, Mississippi River, Apollo 11), byte-addressed; builder `build-dev.mjs`. sha256 `ed01e0d3c9356f89d729722b5a830b5e4bae3ae58442545d6b7ab8ec5f8904c7` | DEVELOPMENT: tuned on, never scored on |
| GOLD | PARA-GOLD v0 `binding`: b01–b15 | CONFIRMATION: scored once |

DEV history, stated plainly: labelled from the text and its neighbouring sentences before the binder was written (first hash `67902a42…`). Two
corrections were made after the first binder run and before any dial was chosen: the builder found the token with a bare substring search ("it" inside
"United"); and the label accept-list was widened then narrowed again to the declared match rule below (hashes `35a9150e…`, then `ed01e0d3…`). The
labels' referents were not changed.

## Terms (gold side)

In scope: b01–b07 and b10–b15 (13 attended cases: 8 pronouns/possessives, 5 definite descriptions). **b08** ("He later established…", a person) is the
he/she resolver's business: reported `out_of_scope`, in no denominator. **b09** is the trap (the "It" is the preceding debate, not the tower).
A case is addressed by its sentence span; the token is the first whole-word occurrence of the case's `surface` inside it. **Bound** = a binding
whose address equals the token's. **Right** = the bound referent has a cast surface that EQUALS the gold referent string (case-insensitive) or is a
whole-word suffix of it or has it as a whole-word suffix ("Liberty" for "Statue of Liberty"). A prefix does not count ("Mississippi" is also a state).
A cast that names the referent with no matching surface therefore scores WRONG; that is the conservative direction and is declared now.

## Bars (numbers decided now; each reported held / failed / untestable with its number)

- **P1 precision.** Of the bound in-scope attended cases, ≥ 0.80 right. Untestable if fewer than 5 are bound.
- **P2 coverage.** ≥ 0.50 of the 13 in-scope attended cases bound (≥ 7).
- **P3 the trap.** b09 is not bound to the Eiffel Tower. A typed gap or a binding to anything else holds the bar (a binding to a wrong thing is
  reported as a wrong binding).
- **K1 shuffled-referent control.** Every mention of every cast being is reassigned to a random cast being (5 seeds, 20261103–20261107) before binding.
  The control must FAIL P1 on every seed (precision below 0.80 or fewer than 5 bound). If any seed passes P1 the binder's score is not evidence
  of reading.
- **G1 grep gate.** `attention-binder.js` keeps no Set, Map, array or regex alternation of words in its code (`gates.mjs`; the unit test repeats it).
- **G2 he/she regression gate.** `pronouns.js`, `non-personal.js`, `memory/activation.js`, `kernel/activation.js`, `organs/hypergraph.js` and `reading.js` are
  byte-identical to `15f82fc`; `priors.js` only gained lines; the existing pronoun and non-personal tests pass (one needs the Wiktionary pack and fails
  identically at base on this machine; it is named in the report).

Descriptive, no bar: per-case table with the bound referent, activation and margin; the wrong bindings; the gap reasons; the same scoring of the
five development traps.

## What this can and cannot show

15 cases: a pass rate of 11/13 has a 95% Wilson interval of about 0.57 to 0.96, so a bar can only detect a large difference. All 14 in-scope cases are
one author's labels, unreviewed by a second reader. Every gold text is a Wikipedia lead about a single thing, the easiest discourse for "attend to
the topic"; a text that changes topic often, a dialogue, or an "it" with an expletive use ("It is raining", "It is said that") is not covered:
expletive "it" is not detected and would bind to the attended referent. It was not tested under the lexicon giver's ruling. Binding does not show
that two statements are equivalent; it supplies what a sentence is about.
