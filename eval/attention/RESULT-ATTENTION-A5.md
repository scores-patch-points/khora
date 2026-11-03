# ROUND 5 RESULT — PARA-GOLD-BIND v4 (held-out, 40 cases, six new articles), scored once, 2026-11-03

Frozen binder: commit `a8302ab`; pre-registration `PREREG-ATTENTION-A5.md` sha256 `9a882e87…` (bars fixed there). Set: `PARA-GOLD-BIND-V4.binder.json` sha256 `186b2224…` (the full-label file with the by-meaning reject lists was not read before scoring). Ruling: `text_evidence` (no Wiktionary pack). No loader change; one `--json` run and one `--controls` run, nothing re-run after the result. `--dir` was the folder that contains `text/`. Raw: `V4-RAW.json` (each bound being's full surface list in `boundSurfaces`, `boundRef`, `viaAlias`), `V4-CONTROL-RAW.txt`. (The summary's `"set":"dev2"` is the scorer's default label.)

## Bars (as scored; pre-registered)
| bar | result | number |
|---|---|---|
| **P1 precision ≥ 0.80** (≥ 8 bound) | **FAILED** | 6 / 9 right (9 bound, so testable) = 0.67 |
| **P2′ right-bound ÷ all attended ≥ 0.45** | **FAILED** | 6 / 22 = 0.27 |
| **T1 trap wrong-bind ≤ 0.20** | **FAILED** | 6 / 18 = 0.33 |
| S1 zero silent (capitalised targets included) | **held** | 0 silent of 40 |
| K1 shuffled control fails P1 on every seed | held | right / bound: 0/11, 1/12, 0/11, 0/12, 0/12 |
| G1/G2/G3, rounds 1–4 reproduce | held | `gates.mjs`; round-4 outputs reproduced with the option absent, checked at freeze |

**Round 5 does not pass.** Three of the six bars failed, and it is worse than round 4 on every accuracy number (round 4 on v3: precision 14/14, coverage 14/22, traps 1/18). The one thing round 5 was built to fix, silence, is fixed: zero silent outcomes, with the six capitalised-target cases all ending as typed gaps. The accuracy numbers do not transfer to this set.

**By meaning (proxy, as the registration says; the parent's recount is the one that counts).** Counting only bindings whose bound being's PRIMARY surface matches the case: precision 5/9 = 0.56, right-bound coverage 5/22 = 0.23. The one right binding that is right only through an alias is x04 (bound to a being named "James", whose surfaces include "James Webb Space Telescope"; it is the topic here, so it may be right by meaning). Some wrong ones may also be the topic under a truncated or split name (below).

## Wrong bindings (9), with the bound being's full surface list
Attended, bound wrong (3):
- **x01** "It" → `["The Antikythera"]` (act 3, margin 0.69). The being's name is a truncation of the topic "Antikythera mechanism" (the cast drops the head). Wrong under the registered rule; plausibly the topic by meaning.
- **x08** "It" → `["Siberian"]` (act 3, margin 0.69). A fragment of the topic "Trans-Siberian Railway"; same remark.
- **x16** "The telescope" → `["Hubble Near Infrared Camera", "Hubble Near", "Hubble Near Infrared", "Hubble", "Hubble Space", "Hubble Space Telescope", "Hubble Telescope"]` (surface-word). The topic is the James Webb Space Telescope; the owner of "telescope" was a merged Hubble being. Wrong by meaning too.

Traps, bound wrong (6):
- **y01** "It" → `["Ming", "Ming Great", "Ming Great Wall", "Ming China"]` (act 7.02, margin 0.36); **y03** "It" → `["Webb"]` (the topic itself, margin 0.85); **y07** "It" → `["Picchu"]` (the topic, margin 0.41); **y04** "It" → `["Lake Baikal", "Baikal", "Baikal Amur", "Baikal Amur Mainline", "SS Baikal"]` (margin 0.67; the stated referent is the Baikal–Amur Mainline, which this being's surfaces contain, but the as-scored rule judged it wrong); **y05** "It" → `["Siberian"]` (attended-tie, margin 0.01).
- **y18** "The third primary route" → `["Moscow Kursky", "Moscow Kursky Rail", "Moscow Kursky Rail Terminal", "Moscow"]` via **context-word** (margin 0.96). The trap built to test a head word the topic owns went to a different being through a different route; the binder never reached the case the registration called out as undetected.
Five of the six wrong traps are new-entity "It" sentences (the pronoun route), one is a description.

## Right (6)
x14 "The wall", x22 "The reef" (a word of the name); x06, x07 (Machu Picchu), x09 ("The Great Barrier Reef"), x04 ("James …", through an alias).

## Gap reasons for every attended gap (13)
`description_unbound` ×3 (x11 "The artefact", x12 "The instrument", x18 "The site"); `capitalised_name_open_word` ×3 (x13 "The Antikythera mechanism", x15 "The Great Wall of China", x20 "The Trans-Siberian Railway": the topic's own names, each a cast mention followed by a lower-case word); `pronoun_no_margin` ×2 (x02, x05, margins 0.13 and 0.09); `center_elsewhere` ×2 (x03, x10); `description_no_margin` ×2 (x17, x21); `description_off_topic` ×1 (x19 "The site").

## Groups reported apart
- **Capitalised targets (x13, x15, x20 attended; y13, y14, y15 traps):** 6 of 6 typed gaps (`capitalised_name_open_word`), 0 silent, 0 bound. Safe on the traps; on the attended side, 3 of 3 topic names lost as coverage, exactly the registered failure mode.
- **Part-whole (y14, y16, y17):** 3 gaps (`capitalised_name_open_word`, `description_weak_word`, `description_off_topic`), 0 wrong.
- **y18 (head owned by the topic's alias):** wrong (bound to "Moscow Kursky …" through a context word).
- **Different-head attended (x11, x12, x18, x19):** 0 bound; 4 gaps (3 `description_unbound`, 1 `description_off_topic`).

## What the round showed
- Silence is closed by construction and holds on a harder set.
- **The new-entity "It" traps are the dominant failure now (5 of 6 wrong traps; 5 of 8 bound wrong).** Three of the five bound the topic or a fragment of it (Webb, Picchu, Ming). The binder has no evidence for "this sentence's 'it' is the thing the previous sentence introduced" beyond the centre and carry vetoes, and on this set those let the pronoun through where the previous sentence still named the topic.
- Cast splits and truncations again decide cases in both directions: x01, x08, x04 (the topic under a fragment or alias) and x16, y04 (a merged being).
- Coverage collapsed from 0.64 (v3) to 0.27: three topic names became gaps by design, four different-head descriptions had no earned evidence, and two pronouns tied.
- The bearer test did not fail on a description this time (the one wrong description, y18, took a different route), and caught x19.

## Caveats
40 cases, one labeller (not blind), six articles, one genre, chosen to be harder on part-whole names and topic-owned descriptions. 6/9 has a 95% interval of about 0.35–0.88; 6/18 traps wrong about 0.16–0.55. The ruling is text_evidence, not the giver's. A by-meaning recount may change which attended bindings are right (x01, x08 may be the topic) and so move P1 and P2′; it cannot make P2′ reach 0.45 without eleven right bindings out of 22 (the as-scored count is six; a by-meaning recount adding x01 and x08 gives eight). T1 would stay above 0.20 unless several of the wrong traps (y03, y07, y04) are judged to have bound the stated or a right entity; y03 and y07 bound the topic, which the set scores wrong for a new-entity trap.

## Where this leaves the approach
Five rounds, five held-out sets. Over them the binder never passed together on a set it had not seen: precision and traps hold on the sets nearest to the ones it was tuned on and fall on the next one (round 4's v3 passed three bars, this round's v4 fails three). The user authorised no further round; whether to stop is theirs.
