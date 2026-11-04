# PREREG-CAST-A3 — one name, one being (layer 3, round A3)

Written before any release of a new exam. Branch `cast-identity`. **Supersedes** PREREG-CAST-A2 (head `acd59ec`, sha256 `a85be0844e61dfba56b2fc6611f3ad6562feae8f48c484e71e7cf4e7306411df`, code `dad781f`), whose candidate scored **21 of 50** on exam v1.1 (RESULT-CAST-A2.md: failures published, nothing re-run). A2 stays in the repo unchanged. The parent is building a fresh exam from new articles that I have not seen, will not see, and will score on a `git archive` snapshot of the frozen code commit below.

**Frozen code commit for this round: `69ebed4`.** The commits after it (`89b7e9c`, and the one that adds this file) touch only `eval/cast/`: `git diff 69ebed4 HEAD -- native package.json` is empty. `69ebed4` differs from `529b6a9` (the code the dev numbers below were first measured on) in comments only: no code line changed (checked by diff).

## Target

LAYER3 = 1.000 on the new exam: every entity clean (the parent will give the count; the last exam had 50). A lower score is a miss, reported entity by entity.

## Scorer version

`score-cast.mjs` sha256 `db15e251abaa9792f4fddbfb562de504aa4337a03a512c5885a657b46efc5e43`, `score-cast.test.mjs` sha256 `dc898a2c04a8f7af641498cff265003c9b1a188d3d6fa0e6f9311cac9b60975a` (both unchanged since A2). Every dev number below was measured with it through the real pipeline: `score-cast.mjs <clone> <inventory> <text dir> <out> --reader-options '{"castIdentity":true}'`.

## Declared option values for the registered run

`readerOptions` unset; `--reader-options '{"castIdentity":true}'`: every sub-switch on (`lead, hapax, variants, rescue, claims, initials, unmerge, fold, casing, spans`), `RECUR = { unit: 2, connector: 3, share: 0.8 }` (the recurrence a joined unit must show; the recurrence a connector or a lower-case variant needs; the share of each side's mentions a coordinating word's unit must account for). Off by default; with the option absent or `false` the entry is JSON-identical to base (R1). `readToWeft` still does not forward `castIdentity`; not changed.

## What the A2 exam showed

The A2 exam (50 entities, 10 articles) is spent and is now development material. A2 scored 21 of 50 although its dev numbers were 58 of 58 and 20 of 21: the A2 rules were fitted to a small set, and the dev inventory was friendlier than the exam's. I reviewed the 29 unclean entities one by one against the text and the A2 code (`eval/cast/dev3/inv.spent-exam-reviewed.json` is my copy of the parent's inventory with the label gaps fixed; the parent's file is untouched).

| A2-unclean entity | verdict | cause and what A3 does |
|---|---|---|
| Apollo 13, Apollo 11, Apollo 12 (all carried by "Apollo 13") | reader defect | rescue asked that the first mention of the head ("Apollo") stand inside the unit: true for the first sibling only, so "Apollo 11/12" got no being and the bare "Apollo" folded into "Apollo 13". The introduction guard now applies to connectors only; a number or model designation is a name's own when the unit recurs; siblings are each their own being. |
| Boeing 747, 747-400, 747-8 | reader defect | digit-led tokens ("747-400") could not start or end a name; the bare "747" was nothing. Digit-led tokens with joiners are name tokens; the number that ends a unit is also its short form (one unit: attached; several: left to FOLD); a model designation with a joiner recurring twice makes its first unit. |
| St. Peter's Basilica, Old St. Peter's Basilica, St. Peter's Square (one being "St Peter") | reader defect | the base's surface drops "St." and "'s", so the longer names never match any text. A period that recurs between the same two words (the second not a sentence opener), or that follows a token with an inner period, is the words' own: those names are rescued as units; a unit with an abbreviation period also takes its prefix up to the possessive ("St. Peter's"). |
| Michelangelo, Bramante, Valdez (no being) | reader defect | the base drops a bare name that sits in several longer names as ambiguous. A capitalised word never written in lower case, capitalised away from a sentence's opening, recurring outside every being, becomes a being (BARE). |
| "Michelangelo's Pietà" holding "Michelangelo"; "Bramante's Tempietto" | label gap | a possessive named thing that contains the form. Ignored in my copy. |
| Chicago, Los Angeles (merged through "Chicago–Los Angeles") | reader defect | a joiner between two names that each stand alone is a route, not a name. A joiner unit is rejected when every part is written alone, capitalised, three times or more; its last part must be capitalised and the unit closed on the right. |
| Trans-Alaska Pipeline System ("Trans Alaska" vs "Trans-Alaska") | reader defect | two beings for one name. VARIANTS merges beings whose surfaces are equal under hyphen, period and diacritic folding (run before and after RESCUE). |
| Notre-Dame de Paris (5 carriers) | reader defect | "de" is not an adposition in the English prior; "Notre-Dame's" a row of its own; "Paris" folded into the name. A connector the prior does not tag as a conjunction (unknown ones too) joins when the unit is how the text first introduces its left side; a possessive of another surface is dropped; the object of a connector never folds into the name. |
| Viollet-le-Duc, Emmanuel Macron | defect, partly fixed | the possessive row "Viollet-le-Duc's" fixed; Macron: the reader attaches a one-off "President" — see unfixed. |
| Harland and Wolff | reader defect | "and" cannot join by the connector rule. A coordinating word (the prior tags it conjunction) joins only when the unit accounts for 80% of each side's mentions. |
| White Star Line ("April White Star") | reader defect | HAPAX: a surface written once that is another surface plus edge words, the rest standing alone three times or more, the edge words positional, common nouns by the prior, or not a prefix to names. |
| U.S. Route 66, Interstate 40, US 60 | reader defect | "U.S. Route 66", "U.S. Highway 66" and "US 66" were three beings; "US 60" none. CLAIMS now groups the names and forms of "N1 or N2 (A or B)" into the being that holds a member as its own longest name; a period inside a token is the token's own; a number written with a name is a unit. |
| Mission Control, Channel Tunnel, Titanic | label gap | a named thing that contains the form ("Mission Control Center", "Why Not A Channel Tunnel", "RMS Titanic, Inc."). Ignored in my copy. |

Two things I found on a blind check (below) and fixed: a closed run that extends an existing being by one capitalised word, recurring, is a unit ("Cumberland River", "Saturn V": the first token of a sentence is skipped by the base and the tail is a common noun); a lead capital is dropped from a claim ("The Burj Khalifa (Burj Dubai)").

### Unfixed after A3 (6 of the 50 A2 entities), published now

- **Valdez / Valdez Marine Terminal**: merged. The text first writes "Valdez" inside "Valdez Marine Terminal"; the introduction rule joins them; they are two things. Not decidable from the text without knowing that a place and a facility differ.
- **Alyeska** (second carrier "Alyeska Pipeline Service Company"): the text's first "Alyeska pipeline" precedes the company's introduction; the short form is left a being of its own (typed gap `cast_identity_short_form_open`).
- **Carpathia** (second carrier): the base glues a person ("Carpathia Harold Cottam") and the ship is also written "RMS Carpathia"; needs to know the second is a person.
- **Emmanuel Macron**: the reader attaches a one-off "President"; the prior tags "president" mostly as a name, so it is kept.
- **Notre-Dame de Paris**: one second carrier, "Cathédrale" (one mention of "Cathédrale Notre-Dame de Paris").

## Development numbers (spent sets; fitted: do not read them as predictions)

Real pipeline, parent's scorer, frozen code (`529b6a9`, comment-identical to `69ebed4`). Files in `eval/cast/dev/` and `eval/cast/dev3/`.

| set | base | `castIdentity: true` |
|---|---|---|
| 23 census articles, 58 entities (fitted in A1 and A2) | 7 / 58 | **58 / 58** |
| 6 spent articles used as a check in A2, 21 entities | 1 / 21 | **21 / 21** (two A2 fixes were then made on it: it is no longer a check) |
| the A2 exam, 10 articles, 50 entities, with my reviewed inventory (fitted in A3) | 6 / 50 | **44 / 50** (the six above) |
| 3 spent articles never read before this round (Apollo 11, Mississippi River, Cumberland River), 19 entities | 4 / 19 | **17 / 19** (a first, truly blind run scored 14 / 19; I then fixed two rules on it, so 17 is fitted) |

The only number here that was not fitted is the blind 14 of 19 (0.74) before its fixes. That, and 21 of 50 on a real exam, are the honest estimates of generalisation: the rules I add after seeing failures raise the dev numbers more than they raise the exam's. This round adds rules, not removes them; where two readings are possible I left a typed gap instead of a guess (the short-form join), but I expect LAYER3 on the new exam to be well below 1.000.

## R1 and G1

R1: with `castIdentity` absent or `false`, the entry is JSON-identical to base `15f82fcd` (ms excluded) on the three fixtures in `eval/cast/fixtures/`, hashes in `eval/cast/r1-base-hashes.json`, tested by `native/organs/cast-identity.test.mjs` (14 tests pass). G1: `node eval/cast/cast-identity-gate.mjs` passes on `native/organs/cast-identity.js` and on the lines this branch added to `read-core.mjs` (no array or set of five or more string literals, no alternation of five or more plain words, no object of five or more string values); it fails on a positive control. Protected files `native/the-fold/corpus-session.js`, `native/kernel/eot-claim-match.js`, `native/the-fold/read-process.mjs` are byte-identical to base. The part-of-speech tags the pass names (`ADP DET PART`, `CCONJ SCONJ`, `NOUN PROPN`) are the prior's own tag set, in lists of three or fewer.

## Preflight

`canon-check.mjs <clone>` on the clean tree at `89b7e9c` (code identical to `69ebed4`), `KHORA_PRIORS_DIR=$HOME/Downloads/workspace/janus/priors`: CANON-OK, exit 0, `dirty_files: 0`, all ten priors identical, no gaps, clauses present. Output hash `80e666cadf7cd9533dfb24b6458e5645733bd7966ec750e541ed73dd0ac2c5f6`. The parent should run it again on the snapshot.

## Failure modes I expect on the new exam

1. A short form that is the first word of a longer name: joined when the text first writes it inside the longer name (right for "Everest"/"Mount Everest", "Notre-Dame"/"Notre-Dame de Paris", wrong for "Valdez"), left a typed gap otherwise (wrong when the inventory counts it as the same thing, e.g. "Alyeska"). It is a coin the text does not toss.
2. A title or modifier before a name that the reader attached once ("President", "Commander"): kept unless the text or the prior marks it as a common word; gold that omits the title is then inexact (C4) or has two carriers (C3).
3. Hapax edges: a once-written name with extra words (HAPAX) is trimmed to the name that stands alone three times; an inventory that lists a once-written compound as its own entity fails, and a once-written full name of a person with a known surname is kept only if its first name is not a common word.
4. Named things containing a form that the inventory neither lists nor ignores give a second carrier.
5. Connectors: one the prior does not know is allowed under the introduction guard and three recurrences; a coincidental preposition phrase meeting both is joined wrongly. A coordinating pair is joined only if it almost never occurs apart.
6. A model or numbered series the text writes with a number ("Apollo 11") is a being each; if the inventory lists the series as one entity they are split. A number written after a place ("Queensland 400 km") is a unit only if it has a joiner or letter.
7. Diacritic, hyphen and period variants of one name are merged (VARIANTS); two different things that differ only by a hyphen are merged.
8. Possessive and plural forms: a possessive of a surface is the surface; a possessive named thing ("Michelangelo's Pietà") is its own being.
9. Caseless scripts and non-English text are not addressed (the pass is an English, cased-script pass); the connector test depends on the English prior and falls back to "unknown, allowed".

## What this round does not change

`attention-binder.js`, `attention-switch.js`, PR 95, the binder clone, `readToWeft`, the held-out exams, the scorer; nothing is merged.
