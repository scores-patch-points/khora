# ROUND 3 RESULT — PARA-GOLD-BIND v2 (held-out, 36 cases, six new articles), scored once, 2026-11-03

Frozen binder: commit `539f9f4`; pre-registration `PREREG-ATTENTION-A3.md` sha256 `91ac5da1…` (bars fixed there). Set: `PARA-GOLD-BIND-V2.binder.json` sha256 `47b59cffea02ee6826747e64c5bcb2e70e7500cbaf14eb6ac0bf9bda2bc4d6ee` (parent's full labels `PARA-GOLD-BIND-V2.json` sha256 `e4e7caae…`). No loader change, no binder change after the release. Ruling: `text_evidence` (no Wiktionary pack). Raw: `V2-RAW.json` (rows and summary), `V2-CONTROL-RAW.txt`. (The summary's `"set":"dev2"` is the scorer's default label, not the set scored.)

## Bars (pre-registered)
| bar | result | number |
|---|---|---|
| P1 precision ≥ 0.80 (testable with ≥ 8 bound) | **FAILED** | 8 / 12 right = **0.67** (12 bound, so testable) |
| P2 coverage ≥ 0.50 | held | 12 / 20 = 0.60 (but 4 of the 12 are wrong bindings; right-bound coverage is 8/20 = 0.40) |
| **T1 trap wrong-bind ≤ 0.20** | **FAILED** | 4 / 16 = **0.25** |
| S1 zero silent outcomes | **held** | 0 silent (round 2 had 3) |
| K1 shuffled control fails P1 on every seed | held | right / bound: 0/12, 1/12, 0/13, 0/12, 0/14 |
| G1/G2/G3, R1/R2 | held | `gates.mjs`; round-1 and round-2 outputs reproduced with options off |

**Round 3 does not pass: P1 and T1 failed.** The honest reading fixed in advance applies: coverage rose against round 2 (0.31 → 0.60) but the gain came with wrong bindings, on attended cases and on traps. Not a pass by the pre-registered rule, whatever the sensitivity note below says.

## What worked
- **Silence is gone** (S1): all 36 cases ended as a binding or a typed gap. The line-start and noun-phrase-head fixes found w17–w20 (section openers) and the multi-word descriptions.
- **Expletives**: 4 of 4 unbound (t09, t10, t11 by the expletive rule; t12 by the carry check).
- **New-entity traps**: 7 of 8 right (6 typed gaps, plus t07 bound to its stated entity "New York Times", counted right); 1 wrong (t02).
- **Pronouns**: w01, w03, w05, w08 right. w02, w04, w06 gaps (`center_elsewhere`). w07 wrong (see below).

## Failures, plainly (all binder-side unless marked)
Attended, bound wrong (4):
- **w13 "The church"** (topic Hagia Sophia) bound to "Eastern Orthodox Church", surface-word, margin 1.0: a lone owner of the word, alone in its pool, with a word share high enough to pass `minWordShare` 0.25. The round-1 failure mode (a lone wrong-word candidate) is back, and the share rule did not stop it.
- **w19 "The canal"** (Suez Canal) bound to "Suez Canal Company": same mechanism, a being whose name contains the word.
- **w07 "It"** (Voyager 1) and **w14 "The probe"** (Voyager 1) bound to the cast being "Voyager". **Rule-driven, label-adjacent:** the article's cast has a single being "Voyager" (111 mentions) and no "Voyager 1" (the digit is dropped), so the binder named the right entity under a truncated name; the pre-registered match rule (equality or whole-word suffix; a prefix does not count) scores it wrong. Counted wrong here, as registered.

Traps, bound wrong (4):
- **t13 "The first church"** → "Eastern Orthodox Church" (the same lone owner as w13); **t14 "The spacecraft"** → "Hubble" (predicate-kind route; the stated referent is the spacecraft that houses the instruments, not the telescope); **t15 "The tomb"** → "Shah Jahan" (a person the text-evidence ruling does not rule out; the word reached him through his own naming). These are the definite-description traps: the pool of one is trusted when the word is owned. **3 of the 4 definite-other traps bound wrong**; only t16 "The site" (no owner) was a gap.
- **t02 "It"** (a Hubble instrument sentence) → "WF". The stated referent is "WF/PC"; the cast truncated at the slash, so this is the same truncation effect as Voyager (wrong under the registered rule).

Attended gaps (8 of 20): w02, w04, w06 `center_elsewhere` (3); w11 "The building complex", w16 "The complex", w18 "The complex", w12 "The current structure" `description_unbound` (4); w20 "The canal" `description_no_margin` (1). The synonym-head-noun cases stay typed gaps, as predicted: **of the 5 different-head-noun attended cases (w11–w14, w16), 0 were right: 3 gaps, 2 wrong.**

## Groups reported apart
- **Part-whole (w11, w16, w18, t14, t15):** attended 3, bound 0 (all gaps); traps 2, both wrong (t14, t15). Without them: precision 8/12 unchanged (none of the attended was bound), trap wrong 2/14.
- **Section openers (w17–w20, t13, t16):** attended 4: 1 right (w17), 1 wrong (w19), 2 gaps; traps 2: t13 wrong, t16 gap. The openers are found now (no silence) but not reliably bound.
- **Hubble instrument traps (t01–t04), one pattern:** 3 typed gaps (t01 `center_elsewhere`, t03 `center_not_carried`, t04 `pronoun_no_margin`), 1 wrong (t02). The pattern is mostly held.
- **Different head noun, attended (w11–w14, w16):** 0 right / 2 wrong / 3 gaps.

## Sensitivity (information only, does not change the verdict)
If a cast being that is a truncated form of the topic or stated name counted as that entity (a head or prefix match), w07 and w14 would be right (precision 10/12 = 0.83) and t02 would be right (T1 3/16 = 0.19), and both failed bars would hold. That rule was not registered; prefix matches were excluded in round 1 on purpose ("Mississippi" is also a state, "Gateway" is a park), and the cast's truncation is itself a finding about the reader, not something to score away. The real defects are the other six wrong bindings: three lone owners of a word (Eastern Orthodox Church ×2, Suez Canal Company) and the descriptions bound to a being that owns the word without being what the sentence is about.

## What this did not show
36 cases, one labeller, not blind, six articles, one genre. Dev numbers (coverage 0.62, 32/33, traps 4/37) were optimistic by about 0.1–0.3 on each bar: the cases were seen. The `text_evidence` ruling, not the giver's. K1 held, so the rest is not a chance artefact; but P1 and T1 are measured on 12 and 16 cases.

## Where this leaves the binder
Over three rounds: pronouns after a continuing subject bind reliably (about 11 of 13 bound pronouns right across the held-out sets); traps built from "It" are mostly typed gaps; **definite descriptions are the unsolved part**: bound correctly when the head word is the topic's own name (w09, w15, w17 and the earlier "The tower", "The canal", "The bridge"), wrongly when another being owns the word, and gapped when nobody does. A next step would need to judge a description's candidate against the topic (does the sentence continue the topic?) rather than only against the word's owner; it would need its own held-out set, and this one is spent.
