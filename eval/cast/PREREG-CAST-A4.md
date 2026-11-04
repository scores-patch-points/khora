# PREREG-CAST-A4 — one name, one being (layer 3, round A4)

Written before any release of a new exam. Branch `cast-identity`. **Supersedes** PREREG-CAST-A3 (head `366b604`, sha256 `c85d3c836efa6cb6190e84c245a930879427fbd8da9c843e699cb44b4b40dd57`, code `69ebed4`), whose candidate scored **49 of 61 (0.8033)** on exam v2 (RESULT-CAST-A3.md: failures published, nothing re-run). A3 stays in the repo unchanged. The parent is building a third exam from new articles that I have not seen and will not see, and will score it on a `git archive` snapshot of the frozen code commit below.

**Frozen code commit for this round: `29cfe25`.** The commit after it (`1eaac51`, which adds dev material) and the one that adds this file touch only `eval/cast/`: `git diff 29cfe25 HEAD -- native package.json` is empty.

## Target

LAYER3 = 1.000 on the new exam. A lower score is a miss, reported entity by entity. I expect a miss.

## Scorer version

`score-cast.mjs` sha256 `db15e251abaa9792f4fddbfb562de504aa4337a03a512c5885a657b46efc5e43`, `score-cast.test.mjs` sha256 `dc898a2c04a8f7af641498cff265003c9b1a188d3d6fa0e6f9311cac9b60975a` (unchanged since A2). Every dev number below was measured with it through the real pipeline: `score-cast.mjs <clone> <inventory> <text dir> <out> --reader-options '{"castIdentity":true}'`.

## Declared option values for the registered run

`readerOptions` unset; `--reader-options '{"castIdentity":true}'`: every sub-switch on (`lead, hapax, variants, rescue, claims, initials, unmerge, fold, casing, spans`), `RECUR = { unit: 2, connector: 3, share: 0.8 }`. Off by default; with the option absent or `false` the entry is JSON-identical to base (R1). `readToWeft` still does not forward `castIdentity`; not changed.

## What the A3 exam showed, entity by entity (12 unclean of 61)

The A3 exam is spent and is development material (`eval/cast/dev5/`: my copy of the parent's inventory with the label gaps fixed, next to the original; the parent's file is untouched).

| A3-unclean entity | verdict | cause and what A4 does |
|---|---|---|
| Copenhagen, Copenhagen Airport (merged) | reader defect | the A3 "introduced" fold joined a bare name to a longer name because the text first writes the bare name inside it. A one-word name beside "that name + one common noun" (a word the text writes in lower case at least as often, or the prior uses mostly as a noun) is the place or the thing: not joined; a typed gap (`cast_identity_short_form_open`) names it. |
| Millau, Millau Viaduct | reader defect, plus one label gap | same cause and fix. "Viaduc de Millau" (the French name of the viaduct, which contains the form) is a label gap: ignored in my copy. |
| Petronas, Petronas Towers | **not fixed** | the base reader holds "Petronas" and "Petronas Towers" in one being, and 10 of its 13 mentions lie inside the longer name, so the majority fold keeps them together; a typed ambiguity (the company or the towers) that the text does not settle. |
| Saturn V (5 carriers) | reader defect | a full stop after a single capital was kept as an initial's: beings "Saturn V. Consequently", "Saturn I. The Saturn", "Saturn V. Calculation". A period after a single capital is the name's own only if the name before it does not recur without the period (3 times or more); "Saturn V" recurs 52 times, "Robert F" does not. Sentence-crossing surfaces are dropped; "Saturn V Apollo" (written once; "Apollo" stands alone 31 times, not after a capital) is trimmed by HAPAX, which now runs after RESCUE too. |
| F-1, J-2 (modifier cut at the hyphen) | reader defect | a unit that ends in a designation (a token with a digit and a joiner) the reader already holds as a being ("Rocketdyne F-1" beside "F-1") is that being with a modifier; a designation recurring twice makes its first unit. |
| Edward I | reader defect | same period rule as Saturn V: the sentence's full stop is no longer kept. |
| Sputnik 1 ("PS-1") | **label gap** | the text never defines PS-1 as Sputnik 1 (it is the name of a satellite in "PS-1 and PS-2 … approved"), so the alias cannot be earned from the text. Removed from the forms in my copy. |
| Soviet Union ("USSR") | **label gap** | the text never defines "USSR" as "Soviet Union" (no parenthesis, no initialism of any name in the text). Removed in my copy. |

Typed gaps and defects that need a word list or the world, named and left: (1) whether a bare name is the same thing as a longer name that begins with it ("Valdez" and "Valdez Marine Terminal": no; "Alyeska" and "Alyeska Pipeline Service Company": yes; "Petronas" and "Petronas Towers": either): cannot be told from the text; the pass joins when the text first writes the bare name inside a longer name that does not end in a common noun after a one-word name, otherwise leaves a typed gap. (2) A title before a name attached once by the reader ("President Emmanuel Macron"): kept. (3) A person's name glued to a ship's ("Carpathia Harold Cottam"). (4) An alias the text does not define ("USSR", "PS-1").

## Rules added or changed in A4 (all in `native/organs/cast-identity.js`)

1. **Initial's period** (`initialOwn`, SPANS, LEAD): a full stop after a single capital belongs to the name only if the name before it does not recur without the stop (RECUR.connector times).
2. **Sentence-crossing surfaces** are dropped even when no prefix of them is a being.
3. **Designations**: a token with a digit and a joiner is a name token; its unit with a modifier is attached to the being that already holds the bare designation; a designation recurring twice makes a first unit.
4. **Typed gap for a one-word name beside that name plus one common noun** (no introduced fold). The join by majority (most of the short form's mentions inside the longer name) is unchanged.
5. **HAPAX also after RESCUE** (a once-written extension of a name that rescue created).
6. The fold report names the rule (`majority`, `introduced`, `variant`).

Rules 1 to 3 and 5 are structural or take the text's own recurrence; rule 4 takes the text's lower-case use and the prior's tag for the common noun. No new list. G1 below.

## Development numbers (fitted: do not read them as predictions)

Real pipeline, parent's scorer, frozen code `29cfe25`. Files in `eval/cast/dev/`, `dev3/`, `dev5/`.

| set | base | `castIdentity: true` |
|---|---|---|
| exam v2 (A3 exam), 10 articles, 61 entities, reviewed inventory (fitted in A4) | 10 / 61 | **59 / 61** (Petronas ×2) |
| 23 census articles, 58 entities (fitted in A1 to A3) | 7 / 58 | **58 / 58** |
| 6 spent articles, 21 entities (used in A2 and A3) | 1 / 21 | **21 / 21** |
| exam v1.1 (A2 exam), 50 entities, reviewed inventory (fitted in A3) | 6 / 50 | **43 / 50** (A3 had 44: "Emaar" is now a typed gap beside "Emaar Properties", the cost of rule 4) |
| 3 spent articles read in A3 (Apollo 11, Mississippi River, Cumberland River), 19 entities | 4 / 19 | **18 / 19** (the one miss: "Neil Armstrong", a second carrier "Commander Neil Armstrong", the title case) |

The honest estimate of generalisation is still the exam record: A2 21/50 (0.42), A3 49/61 (0.80). Each exam improved because its failures were fitted, and the next set of articles shows new failures; two of A4's rules (the typed gap and the hapax trim) trade a known failure for a possible one elsewhere ("Emaar").

## R1 and G1

R1: with `castIdentity` absent or `false`, the entry is JSON-identical to base `15f82fcd` (ms excluded) on the three fixtures in `eval/cast/fixtures/` (`eval/cast/r1-base-hashes.json`), tested by `native/organs/cast-identity.test.mjs` (17 tests pass). G1: `node eval/cast/cast-identity-gate.mjs` passes on `native/organs/cast-identity.js` and on the lines this branch added to `read-core.mjs` (no array or set of five or more string literals, no alternation of five or more plain words, no object of five or more string values); it fails on a positive control. Protected files `native/the-fold/corpus-session.js`, `native/kernel/eot-claim-match.js`, `native/the-fold/read-process.mjs` are byte-identical to base.

## Preflight

`canon-check.mjs <clone>` on the clean tree at `1eaac51` (code identical to `29cfe25`), `KHORA_PRIORS_DIR=$HOME/Downloads/workspace/janus/priors`: CANON-OK, exit 0, `dirty_files: 0`, all ten priors identical, no gaps, clauses present. Output hash `1cc6bc43753c20cb6197fa70650337c2a7b8b5455abda0b49e240844b62fe783`. The parent should run it again on the snapshot.

## Failure modes I expect on the new exam

1. A bare name beside a longer name that begins with it. Joined when the text first writes it inside a longer name whose extra part is not one common noun after a one-word name; left apart (typed gap) otherwise. Wrong whenever the inventory counts the bare name as the same thing ("Emaar"/"Emaar Properties", "Alyeska") or as a different one ("Valdez", "Petronas").
2. Aliases the text does not define are not joined; if the inventory lists them as forms, the entity fails (C1/C3) — this is the right behaviour and a label question.
3. A title or modifier the reader attached once ("President", "Commander"): kept; gold that omits it is inexact (C4).
4. Hapax trim (rules HAPAX): an inventory that lists a once-written compound as its own entity fails.
5. Named things containing a form that the inventory neither lists nor ignores give a second carrier.
6. Connectors, coordinating pairs, numbered series, designations: as A3's list. A designation that recurs twice but is not a name ("Queensland 400 km" needs a joiner or a letter, and a unique unit) can still be joined.
7. A full stop after a single capital that is an initial and whose name recurs without the stop ("Franklin D. Roosevelt" if "Franklin D" recurs three times) is stripped.
8. English, cased script only; the connector and common-noun tests depend on the English prior and degrade to "unknown, allowed".

## What this round does not change

`attention-binder.js`, `attention-switch.js`, PR 95, the binder clone, `readToWeft`, the held-out exams, the scorer; nothing is merged.
