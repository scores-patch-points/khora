# ROUND 4 RESULT — PARA-GOLD-BIND v3 (held-out, 40 cases, six new articles), scored once, 2026-11-03

Frozen binder: commit `923d062`; pre-registration `PREREG-ATTENTION-A4.md` sha256 `da2a4f8e…` (bars fixed there). Set: `PARA-GOLD-BIND-V3.binder.json` sha256 `ddce67b57ad8…` (parent's full labels were not read before scoring). Ruling: `text_evidence` (no Wiktionary pack). No loader change; the scorer was run once with `--json` and once with `--controls`, and nothing was re-run after the result was seen. Raw: `V3-RAW.json`, `V3-CONTROL-RAW.txt`. (The summary's `"set":"dev2"` is the scorer's default label.) `--dir` was the folder that CONTAINS `text/` (the release named `text/` itself; the loader appends it).

## Bars (pre-registered)
| bar | result | number |
|---|---|---|
| P1 precision ≥ 0.80 (testable with ≥ 8 bound) | **held** | 14 / 14 right (14 bound) |
| P2′ right-bound ÷ all attended ≥ 0.45 | **held** | 14 / 22 = 0.64 |
| T1 trap wrong-bind ≤ 0.20 | **held** | 1 / 18 = 0.06 |
| **S1 zero silent outcomes** | **FAILED** | **4 silent**: x21, x22, y17, y18 |
| K1 shuffled control fails P1 on every seed | held | right / bound: 0/13, 1/11, 0/11, 0/11, 0/9 |
| G1/G2/G3, rounds 1–3 reproduce | held | `gates.mjs`; checked at freeze |

**Round 4 does not pass: S1 failed.** By the registration, a pass needs P1, P2′, T1, S1, K1 and the gates. Four of the 40 cases ended with neither a binding nor a typed gap. The other bars held with room: this is the first held-out round in which precision, right-bound coverage and the trap rate all hold together. S1 is a law (typed gaps, never silence), not a score, and it is the one that failed.

## The four silent outcomes
x21 and x22 (attended, "The ISS", both section openers), y17 ("The LHC Computing Grid", a name-contains-topic trap, part-whole) and y18 ("The Mayflower crew", a part-whole trap). **Cause, from the code:** the binder's description target requires the word after the article to be lower-case (`!isCapital(toks[1])`): a capitalised word after "The" is treated as a name, which is the cast's business, and the binder files nothing. An alias or a part-whole name that begins with a capital ("The ISS", "The LHC Computing Grid", "The Mayflower crew") is therefore neither bound nor gapped. Round 2's `neverSilent` covered a neuter pronoun inside a naming; it did not cover a capitalised noun phrase after the article. The silence is a defect of the binder, found by this set; it was not tuned against, and nothing was changed.

## Per case
Attended (22): **14 right, 0 wrong, 6 gaps, 2 silent.**
- Right (14): x01, x02, x03, x05, x07, x09, x10 (pronouns and possessives); x13, x15, x16, x20 (descriptions by a word of the name); x14 "The stele" and x17 "The ship" (predicate-kind), x18 "The vessel" (context word).
- Gaps (6): x04 `pronoun_no_margin` (margin 0.00, a tie the text did not decide); x06, x08 `center_not_carried`; x11 "The site" `description_unbound`; x12 "The site" `description_below_floor`; x19 "The mountain" `description_no_margin`.
- Silent (2): x21, x22.

Traps (18): **1 wrong, 1 right by stated entity, 14 gaps, 2 silent.** Wrong y08; right-by-stated-entity y02 (bound to "Unity", the stated entity); gaps y01, y03, y04, y05, y06, y07, y09, y10, y11, y12, y13, y14, y15, y16 (14); silent y17, y18 (2). Total 1 + 1 + 14 + 2 = 18.
- **Wrong binding (1): y08** (a new-entity "It", a thing the previous sentence introduces) bound to "Stonehenge", the topic, at activation 7.66, margin 0.48.
- Expletives (4: y09, y10, y11, y12): 4 unbound. y09 and y12 by the expletive rule; **y10 by `pronoun_no_margin` and y11 by `center_elsewhere`, not by the expletive rule.**
- Definite-other (6: y13–y18): 0 wrong; 4 gaps (y13, y14, y16 `description_unbound`; y15 `description_no_margin`), 2 silent (y17, y18).
- New-entity (8: y01–y08): 1 wrong (y08), 1 right by stated entity (y02), 6 gaps. y03 was caught by the expletive rule (the "It" is cleft-like), y04 `center_not_carried`, y05 and y01 and y06 `center_elsewhere`, y07 `pronoun_no_margin`.

## Groups reported apart (as requested)
- **Part-whole (y13, y14, y15, y18):** all traps. 0 wrong, 3 gaps, **1 silent (y18)**.
- **Section openers (x14, x20, x21, x22):** 2 right (x14, x20), **2 silent (x21, x22)**; none wrong, none gapped.
- **Name-contains-topic traps (y03, y04, y05, y17):** 0 wrong, 3 gaps (y03 expletive rule, y04 not carried, y05 centre), **1 silent (y17)**.
- **Different-head attended (x11, x12, x14, x17, x18, x19):** 3 right (x14 stele, x17 ship, x18 vessel), 3 gaps (x11, x12 "The site", x19 "The mountain"), 0 wrong, 0 silent. Of the three right, two came by predicate-kind and one by the context-word route, so the earned routes did work on this set.

## What the round showed
- The bearer test did what it was built for on the failure it targets: no description bound to a lone owner of its head word. 0 wrong descriptions on 12 attended and 6 definite-other cases. (The test could not fail on the topic-owns-the-word trap, because none of the 6 definite-other cases is one.)
- The one wrong binding is a pronoun to the topic (y08), the kind the "It for a new thing" traps always risked; margin 0.48, centre not vetoed.
- Right-bound coverage 0.64 against 0.40 in round 3: a real change, on a set that is not harder or easier in a way this registration can measure (different articles, a different genre mix, more name-word descriptions).
- The sets are not comparable on precision alone: v3 had no truncated topic names and no digit or slash, so the reader defect of v2 was not exercised.

## Caveats
40 cases, one labeller (not blind), six articles, one genre. 14/14 has a 95% lower bound of about 0.78; 1/18 traps wrong has an interval of about 0.01–0.27. The bars P1, P2′ and T1 held, but only a repeat on a different set would show whether they transfer. The text-evidence ruling, not the giver's; the binder is unwired and default off.

## Where this leaves the approach (not a recommendation to continue)
Round 4 of 4 failed one law, S1, on a defect that was not on the diagnosis list (a capitalised noun phrase after "The"). The three scored bars held. Whether to fix the silent case and score once more on a fifth set is the user's decision, as the parent session said before the round.
