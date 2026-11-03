# Read-only diagnosis of the round-3 misses on BIND v2: were the gold referents never made candidates?

Asked by the parent session. Uses only the committed round-3 output (`V2-RAW.json`), the cast the reader produces for the six v2 texts, and the binder's own rules. No binder change, no re-scoring (the verdicts are read from `V2-RAW.json`), no v2 file edited. `diag-round3.mjs` (a one-off analysis script, not wired anywhere; its two hard-coded paths point at the author's scratch folders) wrote `DIAG-ROUND3.json`.

**Method and its limits.** Gold = the cast beings whose surfaces match the case's `accept` under the registered rule; where none does, a truncated form (the Voyager and WF cases), reported as such. "Prior mentions" = that being's mentions that end before the anaphor, after the binder's longest-naming overlap filter. "Candidate" = in the cast and not ruled a person by the text-evidence rule (re-implemented from the binder: a gendered pronoun in the clause of its sole naming). Activation = a replay of the presence the binder reads (kernel gradient, window 12, first-naming boost 2) over the sentences before the anaphor, **without** the binder's self-feed, so it is approximate; the activation and margin of the binder's own choice are the ones in `V2-RAW.json`. Case labels and the cast are the parent's and the reader's; none was changed.

## Answer in one line
**The hypothesis explains none of the 12 attended misses and part of the trap errors.** On the attended cases the gold was always in the cast and always a candidate; the correct cases were the ones with a single prior mention; the misses have the gold seen more often, and are caused by something else (below).

## Attended misses and correct cases (20)
| group | n | gold not in cast | gold a candidate, 1 or 2 prior mentions | gold a candidate, 3+ prior mentions |
|---|---|---|---|---|
| correct | 8 | 0 | **6** (w01, w03, w05, w09, w10, w15; five of them with exactly 1 prior mention) | 2 (w08, w17) |
| wrong or gap | 12 | 0 (the Voyager pair is in the cast under the truncated name "Voyager": 3–4 prior mentions) | 4 (w04, w11, w12, w16) | **8** (w02, w06, w07, w13, w14, w18, w19, w20) |

A referent soon after its first mention is where the binder does BEST (a "chick" case: w01 "Its" and w03/w05 "It" right after one mention bind correctly, activation 1–2, margin 0.5). Misses rise, not fall, with the number of prior mentions.

## What does cause the 12 attended misses
| cause | cases | n | note |
|---|---|---|---|
| a description whose head noun no name or earned word owns (`description_unbound`) | w11, w12, w16, w18 | 4 | the gold had 2–7 prior mentions and was the top or near-top candidate by activation (w12: tied for top at 2.98); the word is simply not one the text gave it |
| the centre veto (`center_elsewhere`), the previous sentence began with another being | w02, w04, w06 | 3 | w06: the gold (Hubble) was the top candidate at 6.74 and was vetoed; w02: the gold (activation 2.64, last named 7 sentences earlier) trailed "New York City" (3.72); w04: gold prior 1, trailing "Roman Greece" by 0.3 |
| a lone owner of the head word bound instead of the topic (the description route ranks only the owners of the word, never the topic) | w13, w19 | 2 | w13: the gold was the TOP candidate by activation (6.68) and 5 mentions old; the binder chose "Eastern Orthodox Church" (activation 2) because it alone owned "church". w19: gold last named 31 sentences earlier (activation 0.29), the word owner "Suez Canal Company" bound |
| the topic's name is truncated in the cast ("Voyager" for Voyager 1), scored wrong by the registered rule | w07, w14 | 2 | the binder chose the right being |
| presence faded: a section opener far from the last mention | w18, w19, w20 | (counted above; w20 `description_no_margin`) | last named 80, 31 and 56 sentences earlier; activations 0.01–0.29. This is the opposite of "too new": the topic is too OLD |

So the dominant causes, in order: the word-owner route for descriptions (w11–w14, w16, w18, w19; 7 including the unbound ones), the centre veto (3), and truncated names (2). Presence decay explains the section openers (w18–w20) after the fact.

## The four wrong traps
| trap | gold in the cast? | what happened |
|---|---|---|
| t13 "The first church" | no (a new entity: the first church on the site) | bound to "Eastern Orthodox Church", the owner of "church" |
| t14 "The spacecraft" | no | bound to "Hubble" (predicate-kind) |
| t15 "The tomb" | no | bound to "Shah Jahan" (a person the text-evidence rule does not catch) |
| t02 Hubble instrument "It" | stated referent "WF/PC" exists as "WF" (truncated) | bound to "WF" |
Here the hypothesis fits part of the picture: in 3 of the 4, the referent the sentence is about **was never a candidate** (a lower-case new thing, not a name in the cast), and the binder attached the anaphor to an older, more active being that merely owns the word. The remedy is not earlier admission of the new thing but a way to say "this description introduces something the cast does not hold". Of the 8 new-entity "It" traps, 4 have no cast being for the gold (t01, t05, t06, t08) and all four ended as gaps (right); the other four are in the cast with 1–3 mentions (t02, t03, t04, t07): three were gapped or bound to the stated entity, one (t02) bound to the truncated name.

## Other things the table shows
- Nothing was abstained for lack of a candidate: no `pronoun_no_candidate` and no `below_floor` appeared on v2. Every abstention was a veto, a tie, or an unowned word.
- Where the gold was the top candidate by presence (w06, w12, w13, w18's neighbours), the binder's own other rules overrode it; presence was not the bottleneck.
- Cast quality matters in two ways the hypothesis does not cover: names truncated at a digit or a slash ("Voyager", "WF"), and one thing split across several beings ("Hagia", "Sophia", "Hagia Sophia"; 150–156 mentions each).

## What this does not show
20 attended and 16 trap cases, one set, one labeller; the replayed activation is approximate; the person rule is re-implemented. The v2 texts begin with the topic named in the first sentence, so "soon after the first mention" is well covered at 1 mention (8 cases) but the identity-from-first-encounter idea is not tested against a text where the topic is first met mid-sentence or by description only.
