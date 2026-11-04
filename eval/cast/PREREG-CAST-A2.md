# PREREG-CAST-A2 — one name, one being (layer 3, round A2)

Written before any release of the held-out set. Branch `cast-identity`. **Supersedes** PREREG-CAST-A1 (head `bdc4e8c`, sha256 `b0ea609461630b5870970c28826b8d5cbf52eface6eef9dcc12eb8cd201364a6`, code `9236e1e`), whose candidate was withheld by the parent because it stood at 30 of 60 on dev. A1 is kept in the repo unchanged. The held-out set has not been seen, read, searched for or run.

**Frozen code commit for this round: `dad781f`** (clean tree; the pre-registration file is added in the next commit and changes no code).

## Target (updated)

LAYER3 = 1.000 on the held-out exam v1.1: **50 of 50 entities clean** (it was 51 of 51 in A1). The parent revised the exam before release: the tail sections of every article (See also, Notes, References, Bibliography, Further reading, External links, Sources) are ignored, named things containing a form are ignored or listed, one ambiguous entity dropped. A lower score is a miss of the target, reported entity by entity.

## Scorer version

`score-cast.mjs` sha256 `db15e251abaa9792f4fddbfb562de504aa4337a03a512c5885a657b46efc5e43` and `score-cast.test.mjs` sha256 `dc898a2c04a8f7af641498cff265003c9b1a188d3d6fa0e6f9311cac9b60975a`: the version with the main-carrier tie-break by coverage, then exact spans, then longest surface. Every dev number below was measured with it; its test passes.

## What changed since A1 (code `9236e1e` to `dad781f`)

All inside `native/organs/cast-identity.js`; the option, the call site and the default (off, byte-identical) are unchanged.

1. **casing**: a lower-case variant of a multi-token name ("Antikythera mechanism") counts only when that variant recurs `RECUR.connector` (3) times as its own unit, not when it appears once ("Hagia Sophia mosque"). It had made rare compound beings take the topic's mention.
2. **unmerge**: a short form that is not the last tokens of the long name also leaves when most of its mentions lie outside the long name (the topic "Antikythera Mechanism" was being held in "Antikythera Mechanism Research Project").
3. **rescue, long runs and headed runs** are no longer dropped as "explained" by a longer candidate (they are counted only where they are closed on both sides, so they are independent of it); the dedupe of other candidates now requires that every occurrence lie inside the longer one's occurrences (the possessive "John A. Roebling's Sons" had swallowed "John A. Roebling").
4. **rescue windows** may open on a word the text also writes in lower case when that occurrence is capitalised away from a sentence's opening ("the Statue of Liberty", "John A. Roebling"); before, a common noun or a name that appears in a URL in lower case could not start a name.
5. **rescue, initial**: an initial with its period before a surname the cast already holds needs one mention, not two.

Nothing else changed. G1 passes; 11 unit tests pass; R1 (option absent or false is JSON-identical to base on three fixtures, hashes in `eval/cast/r1-base-hashes.json`) passes. Protected files (`corpus-session.js`, `eot-claim-match.js`, `read-process.mjs`) are byte-identical to base.

## Declared option values for the registered run

`readerOptions` unset; `node score-cast.mjs <clone> <inventory.json> <text dir> <out.json> --reader-options '{"castIdentity":true}'` (every sub-switch on, `RECUR = { unit: 2, connector: 3 }`). The rules of each step are those listed under "What is built" below (A1 text, unchanged except for items 1 to 5 above).

## Hand review of the dev inventory (the 30 A1 failures)

Done entity by entity. The A1 inventory's `ignore` list was rule-generated and missed named things. Now: the parent's tail-section ignore applies to every article; a gold mention directly followed by a capitalised word, or preceded by one that does not open a sentence, is ignored as inside a longer named thing (`eval/cast/dev/loadinv.mjs`, rule-generated again, but with the parent's tail ignore added); and two hand edits.

| class | entities | outcome |
|---|---|---|
| labelling gap (a longer named thing that contains the form was not ignored) | 14 of A1's 30 (Hagia Sophia Museum, Suez Canal Company, San Francisco Bay, Queensland Government, Golden Gate Bridge District, Stonehenge Aerodrome, ISS National Laboratory, New York City Landmarks, and similar) | covered by the generated ignore; no reader change |
| labelling gap, hand-fixed | "Pope Benedict" and "Ezana Stone" (their only mentions sat in tail sections or inside named things: no gold mention left, entity dropped); "Wide Field Camera" (the name in the text is "Wide Field Camera 3": relabelled); "John A. Roebling" (relabelled to the full name only: bare "Roebling" is also Washington and Emily Roebling in that text, so it is ambiguous, as the parent dropped one such entity); "John A. Roebling's Sons" ignored | inventory 58 entities |
| reader defect | the lower-case variant taking the topic's mention (casing); the topic folded into a longer rare name ("Antikythera Mechanism Research Project"); "Great Barrier Reef Marine Park" truncated at four tokens; "John A. Roebling" and "Statue of Liberty" not formed | fixed by items 1 to 5 |

## Development numbers (spent set; optimistic: the rules were fitted to it)

Parent's scorer, real pipeline. Files in `eval/cast/dev/`.

| set | run | clean | LAYER3 |
|---|---|---|---|
| 23 census articles, 58 hand-reviewed entities (`out.base.json`, `out.on.json`) | base | 7 / 58 | 0.1207 |
| | `castIdentity: true` | **58 / 58** | **1.0000** |
| 6 other spent articles never used to fit (Eiffel Tower, Hoover Dam, Mount Rushmore, Statue of Liberty, Gateway Arch, Concorde; 21 entities; `out2.*.json`) | base | 1 / 21 | 0.0476 |
| | `castIdentity: true` (run before the last two fixes of the five above were tested on it) | 20 / 21 | 0.9524 |
| | the one failure, "Statue of Liberty": a second carrier, "Liberty–Ellis Island Foundation", which is a named thing containing the form (a labelling gap: en-dash joined, not caught by the generated ignore); with that one ignore added, re-run on that article (`out2.statue-label-fix.json`) | 4 / 4 | |

The second set is the only measure here that is not fitted to: I labelled it from the base reader's recurring capitalised strings and scored it once after the A1 rules were fixed, then looked at its one failure and added the ignore. It is small (21 entities, 6 articles) and one genre; I do not read 21 of 21 as a prediction of 50 of 50 on the held-out set.

## Preflight

`canon-check.mjs <clone>` run on the clean frozen tree at `dad781f` with `KHORA_PRIORS_DIR=$HOME/Downloads/workspace/janus/priors`: CANON-OK, exit 0, `dirty_files: 0`, all ten priors identical, no gaps, clauses present. Output hash `fb2bfef71d077b2cf70ac3e0c39a456f00f3bcdb662de8240ed9e54d81cd23ef`. The parent should run it again on the pushed head before the released run.

## Expected failure modes on the held-out set

As A1's list, with these changes. The largest remaining risk is annotation-dependent: a topic mention inside a longer name that the inventory neither lists nor ignores gives a second carrier; the generated ignore rule I use on dev is not the parent's. Also: the bare place beside a bridge/canal/mountain is folded into the topic when the text first writes it inside the topic's name (merge if the inventory lists the place); a surname shared by several people is not folded into one of them; a connector phrase seen fewer than 3 times is not joined; titles or modifiers attached by the reader to a mention ("President Gamal Abdel Nasser") are kept; dates and numbered series are rescued only when introduced with their head; hyphen-joined suffixes beyond the first token ("Statue of Liberty–Ellis Island") make a distinct being. I could not fix without a word list: telling a title-cased common noun that really is part of a name ("Sydney Opera House") from one that is only capitalised in a heading ("Museum") when both recur, and telling the borough from the bridge in "Brooklyn". Those are results, not omissions.

## What is built

One opt-in `readWith` option, `castIdentity` (default `false`; `true` or an object of sub-switches). With the option absent or `false`, nothing new runs and the entry is JSON-identical to base (R1 below). With it on, a pass (`native/organs/cast-identity.js`, called from a guarded block in `native/the-fold/read-core.mjs::readWith`) repairs the cast the reader built, before the entry is assembled. Rows are rebuilt the way the base builds them (`mentionsOf` is the base's own matcher, handed in); `pronouns[].ref` is remapped; the referent ledger is built afterwards from the repaired cast. `edges[]` are keyed by surface strings and source refs, not by cast refs, so there is nothing to remap there (verified in the entry: `refs` holds `material#…` addresses).

Steps, in order. Every rule is structural or reads the text's own evidence or the part-of-speech prior (data); the file holds no list of words (G1).

| step | sub-switch | rule |
|---|---|---|
| LEAD | `lead` | A surface is dropped when its first token is one this text writes in lower case at least as often as it writes it capitalised away from a sentence opening, the rest is another surface, and most mentions open a sentence ("The Colosseum", "On December"); or when every mention runs across a line or a sentence's end ("Colosseum A"). Its mentions are the rest's own. |
| RESCUE | `rescue` | A name the capital tier truncated is added as its own being when it recurs as that unit: an inner joiner in a token (`-`, `–`, `/`: "Trans-Siberian", "WF/PC"); a number ending a name ("Voyager 1"); a single-letter initial with its period ("John A. Roebling"); one lower-case connector between capitalised runs ("Great Wall of China"); a run of five or more capitalised tokens (the base keeps prefixes up to four); a sentence-initial head whose remainder is already a surface ("Machu Picchu"). Recurrence floors `RECUR = { unit: 2, connector: 3 }`. A connector must be one the part-of-speech prior tags mostly ADP, DET or PART (not a conjunction); the unit must be how the text first introduces its left side; the unit must be written capitalised in most of its case-blind occurrences; a candidate wholly explained by a longer one with the same count is dropped. |
| CLAIMS | `claims` | A parenthesis after a capitalised name that holds only capitalised runs, numbers and lower-case joiners claims each run that is the name's initialism or shares a token with it (without being a part of it): "Large Hadron Collider (LHC)". The form leaves any other being. |
| INITIALS | `initials` | An all-capital short form that is the capitals of exactly one multi-token name in the text joins it. Two such names are a typed gap (`cast_identity_initials_tie`). |
| UNMERGE | `unmerge` | A short form (not the last tokens of the long name) that the text mostly uses before the long name is first written is not that name's later mention, so it leaves ("LHC" beside "LHC Computing Grid"). Two multi-token surfaces in one being, neither holding the other's words, are two beings; the one with fewer mentions leaves with what only it holds ("Ezana Stone" beside "Rosetta Stone"). |
| FOLD | `fold` | A being most of whose mentions lie inside the mentions of ONE longer being folds into it ("Golden", "Golden Gate", "Gate", "Gate Bridge" into "Golden Gate Bridge"); so does a being whose first mention lies inside a longer being's mention (the text introduced the short form with the long one: "Everest" after "Mount Everest"). A tie of equal-length containers is a typed gap (`cast_identity_tie`), never a guess. |
| casing | `casing` | A later token of a multi-token surface may be lower case in a mention ("Antikythera mechanism") when the part-of-speech prior does not use that token mostly as a non-nominal. |
| SPANS | `spans` | No mention overlaps a longer mention of another being. A mention is cut at a line break. A final period is dropped unless the last token is in this read's abbreviation set, holds a period inside, or is a single capital letter before another capital ("Robert F. Kennedy"). |

## Bars (fixed before the held-out release)

- LAYER3 = 1.000 (50 of 50 entities clean) on the held-out set, scored once. Anything lower is a miss of the target, reported entity by entity.
- R1: option absent and option `false` give a JSON-identical entry (ms excluded) to base `15f82fcd` on the fixtures in `eval/cast/fixtures/` (sha256 pinned in `eval/cast/r1-base-hashes.json`; `native/organs/cast-identity.test.mjs`).
- G1: `node eval/cast/cast-identity-gate.mjs` passes (no array or set of five or more string literals, no alternation of five or more plain words, no object of five or more string values) on the new file and on the lines added to `read-core.mjs`; the gate fails on a positive control.
- Protected files byte-identical to base: `native/the-fold/corpus-session.js`, `native/kernel/eot-claim-match.js`, `native/the-fold/read-process.mjs`. (`attention-binder.js` and `attention-switch.js` are not in this branch's base; they are on the binder branch and untouched.)


A1's section "What this round does not change" applies unchanged: `attention-binder.js`, `attention-switch.js`, PR 95, the binder clone, `readToWeft`, the held-out set, the scorer.
