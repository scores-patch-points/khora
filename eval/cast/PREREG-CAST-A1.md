# PREREG-CAST-A1 — one name, one being (layer 3, round A1)

Written before any release of the held-out set. Branch `cast-identity`, cut from khora main `15f82fcd` (2026-11-03). The held-out set has not been seen, read, searched for or run; nothing below was tuned on it.

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

## Declared option values for the registered run

`readerOptions` unset. The scorer is invoked as `node score-cast.mjs <clone> <inventory.json> <text dir> <out.json> --reader-options '{"castIdentity":true}'` (every sub-switch on, `RECUR = { unit: 2, connector: 3 }`). A control run without the option is the baseline. `readToWeft` destructures a fixed list and does not forward `castIdentity`; not changed (note for the owner of that file).

## Bars (fixed before the held-out release)

- LAYER3 = 1.000 (51 of 51 entities clean) on the held-out set, scored once. Anything lower is a miss of the target, reported entity by entity.
- R1: option absent and option `false` give a JSON-identical entry (ms excluded) to base `15f82fcd` on the fixtures in `eval/cast/fixtures/` (sha256 pinned in `eval/cast/r1-base-hashes.json`; `native/organs/cast-identity.test.mjs`).
- G1: `node eval/cast/cast-identity-gate.mjs` passes (no array or set of five or more string literals, no alternation of five or more plain words, no object of five or more string values) on the new file and on the lines added to `read-core.mjs`; the gate fails on a positive control.
- Protected files byte-identical to base: `native/the-fold/corpus-session.js`, `native/kernel/eot-claim-match.js`, `native/the-fold/read-process.mjs`. (`attention-binder.js` and `attention-switch.js` are not in this branch's base; they are on the binder branch and untouched.)

## Development set (spent; every number below is optimistic: flagged)

The 23 census articles (bind-v1, bind-v2, bindgold3, bindgold4 text folders). My own hand-made inventory of 60 entities in the scorer's schema: `eval/cast/dev/inv.dev.json`. The `ignore` patterns in it were generated by a rule, not by hand: a gold mention directly attached to a neighbouring capitalised word that this text does not mostly write lower case is treated as inside a longer name and ignored (`eval/cast/dev/loadinv.mjs`). The rules above were developed against these articles and against the census's failure list (CAST-CENSUS-2.md); the dev inventory was made first and the rules were then adjusted to it, so these numbers measure fit, not generalisation.

Scored with the parent's scorer (`score-cast.mjs`, sha256 `db15e251abaa9792f4fddbfb562de504aa4337a03a512c5885a657b46efc5e43`, the version with the main-carrier tie-break by coverage, then exact spans, then longest surface; its unit test `score-cast.test.mjs` sha256 `dc898a2c04a8f7af641498cff265003c9b1a188d3d6fa0e6f9311cac9b60975a` passes; I copied it after the change and the dev numbers below were measured with it) through the real pipeline, 60 entities in 23 articles (`eval/cast/dev/out.base.json`, `eval/cast/dev/out.on.json`):

| run | clean | LAYER3 | whole | unique carrier | no merge | span exact |
|---|---|---|---|---|---|---|
| base (option absent) | 6 / 60 | 0.1000 | 0.900 | 0.317 | 0.783 | 0.200 |
| `castIdentity: true` | 30 / 60 | 0.5000 | 0.817 | 0.533 | 0.950 | 0.767 |

**The dev set is not at the bar.** 30 of 60 dev entities are not clean even though the rules were fitted to these articles. Of the 30: 15 fail only on a second carrier (a longer being that also covers a mention of the entity, almost always a nested compound name such as "Hagia Sophia Museum" or "Suez Canal Company" that my generated `ignore` list did not cover and that a real inventory may or may not ignore); 10 fail on whole + carrier + exactness together (a topic whose bare short form or a modifier-prefixed mention sits in another being: "San Francisco" inside "San Francisco Bay", "New York City" beside "New York City Designated Landmarks"); 2 fail on exactness alone ("Wall Street" held by "Wall Street Crash", "Wide Field Camera" held by "Wide Field Camera 3"); 3 involve a merge ("Great Barrier Reef" with "Great Barrier Reef Marine Park", "Pope Benedict" absent from the cast). I expect the held-out LAYER3 to be below 1.000 and I do not claim otherwise.

Fixed on dev by the pass (base to option): the n-gram duplicates ("Golden Gate Bridge", "Hagia Sophia", "Empire State Building", "Great Barrier Reef"), "Machu Picchu", "Trans-Siberian Railway", "Voyager 1", "Great Wall of China" (connector), the "LHC" fold into "LHC Computing Grid", "Rosetta Stone"/"Ezana Stone", "Mount Everest"/"Everest", "Antikythera Mechanism"/"mechanism", "ISS"/"International Space Station", and the trailing full stop on spans (the census counted 1638 of 22626 mention spans, 7%).

## Preflight

`node ~/…/castdev/canon-check.mjs <clone>` run on frozen code commit `9236e1e` (branch `cast-identity`, 1 commit ahead of `15f82fcd`, `KHORA_PRIORS_DIR=$HOME/Downloads/workspace/janus/priors`): verdict **CANON-OK**, exit 0, all ten priors identical, probe gaps none, clauses present. Output hash: `e5456dc2b42c72335be637e69494d442c7e8e1239a60cd9e8a7ea2f8e075f4bc`. That run saw one untracked file (this prereg, `dirty_files: 1`); the same check on the pushed head will differ in its `head` and `dirty_files` fields only, and the parent should run it again before the released run.

## Failure modes I expect on the held-out set

1. Nested compound names. A mention of the topic inside a longer name ("Mount Everest" in "Swiss Mount Everest expedition") belongs to a longer being by the "longer mention keeps the place" rule. If the held-out inventory counts such a mention for the entity and does not ignore it, that entity has two carriers and is not clean (C3). This is the largest residue on the dev set.
2. The bare place name beside a bridge, canal or mountain ("Brooklyn", "Panama", "Mount") is folded into the topic when the text first writes it inside the topic's name. If the inventory lists the borough, country or region as a separate entity, the two are merged (C2).
3. A short form first used before the full name in a dense citation, followed by the full name once, is not unmerged when it is a suffix, but is when it is a prefix or interior. A prefix short form that really is the same name and is mostly used before its long form is first written would leave its being.
4. Connectors: a name joined by a preposition the text writes fewer than three times is not joined ("University of Illinois" at two). A coincidental preposition phrase that recurs three times and is the way the text first introduces its left side is joined wrongly.
5. A title or modifier the reader attached to a mention ("President Gamal Abdel Nasser", "July Pope Francis", "Receding Red Sea" at a heading) is not stripped unless it is a lead capital by the LEAD rule; gold spans that omit it are inexact (C4). A modifier that the inventory counts as part of the name is likewise inexact if the pass strips it.
6. Dates and numbered series ("April 2022", "Long Shutdown 1") are rescued only when introduced with the head; "Wide Field Camera 3" becomes one being, which suits an inventory that names the model and fails one that names the family.
7. Diacritics and transliterations ("Gatún"/"Gatun") are left as the base has them.
8. A parenthetical that is not a definition but shares a token ("San Francisco Junior College (City College)") is claimed.
9. Caseless scripts are not addressed; this is a cased-script, English pass.
10. A newline-normalised text with carriage returns: the pass runs on the normalised text, as the base's matcher does.

## What this round does not change

`attention-binder.js`, `attention-switch.js`, PR 95, the binder clone, `readToWeft`, the held-out set, the scorer.
