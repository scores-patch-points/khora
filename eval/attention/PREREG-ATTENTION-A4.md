# ROUND 4 — descriptions judged against the topic: pre-registration, written and hashed before held-out set v3 is released

Date: 2026-11-03. Same branch and PR (`attention-binder`, khora#95). No round-1, round-2 or round-3 file or hash, and no v1 or v2 file, is edited. **PARA-GOLD v0, PARA-GOLD-BIND v1 and v2 are SPENT and are development material** (`DEV-SET-4.json`, 127 cases). Round 4 is scored once on the parent's v3 (40 cases, six articles none of which is in any earlier set), which this session has not seen. This is round 4 of 4 for this approach: if it fails, the next step is the user's decision.

## Why (round 3, published)
Held-out v2: precision 8/12 (failed), trap wrong-bind 4/16 (failed), silent 0 (held). The read-only diagnosis (`NOTE-ROUND3-DIAGNOSIS.md`) named four causes: (1) a description judged only by who owns its head word; (2) a description that introduces something the cast does not hold; (3) the centre veto over-ruling a top candidate; (4) presence decayed before a section opener.

## **The options were tuned on v2's misses, stated plainly**
The round-4 options were designed from the diagnosis of v2's misses and chosen by scoring them on `DEV-SET-4`, which contains v2 and v1 (and v0). The dev numbers below are therefore not evidence of transfer; v3 is. A first design was scored on the dev set before freezing and **abandoned because it lowered right-bound coverage (0.55 → 0.47)**; that is recorded in `DEV-RESULT-4.md`.

## The change (optional arguments of `bindAttended`; absent = the round-3 call, byte for byte: the round-3 dev rows and the round-3 v2 rows are reproduced exactly with them off, checked on this code)
1. **`bearerShare` (cause 1; declared 0.2).** A description whose head word is owned by a candidate binds to that candidate only if the candidate is the document's topic, or carries at least 20% of the topic's weight. The topic is who the DOCUMENT has been about so far (the undecayed count of mentions, which a split cast or a recent aside does not move); the weight is the same count. Otherwise the typed gap `description_off_topic` records the owner and the topic. "The church" in a text about Hagia Sophia no longer binds to "Eastern Orthodox Church".
2. Cause 2: addressed only as far as 1 reaches (an owner that is light against the topic ends as a gap). A description whose owner IS the topic but that introduces something new (v2's "The spacecraft") is not detected: **no evidence in the binder separates it, and none was invented.**
3. Cause 3 (`centerRivalShare`) and cause 4 (`openerReset`, `weakRouteCarry` as a continuity requirement on kind routes) are implemented as options and **declared OFF**: on the dev set they show no effect (centre, opener) or cost right bindings (continuity). They are not claimed to be fixes.
4. Truncated cast names ("Voyager" for Voyager 1, "WF" for WF/PC) are a reader defect, not scored differently: the registered match rule stands.
Declared round-4 values (`score4.mjs::DECLARED`): the round-3 values plus `bearerShare` 0.2; `weakRouteCarry` false; `centerRivalShare` null; `openerReset` false.

## Sets
| set | role |
|---|---|
| `DEV-SET-4.json` (sha256 `DEV-SET-4.sha256`): 127 cases = DEV-SET-3 (the 61 of DEV-SET-2 + v1) + v2; 73 attended, 53 traps, 1 out of scope | DEVELOPMENT; tuned on, includes v2 |
| v3: 40 cases, six unseen articles, hand-labelled by the parent, frozen before this registration | CONFIRMATION, scored once |

Dev numbers (not evidence): round-3 options only: precision 40/45 = 0.89, right-bound coverage 40/73 = 0.55, trap wrong 8/53 = 0.15, silent 0. Round-4 declared: precision 40/43 = 0.93, right-bound coverage 40/73 = 0.55, trap wrong 7/53 = 0.13, silent 0.

## Scoring (as before)
Attended is right only if bound to the topic; a trap is right if a typed gap or bound to the entity the set states when it is a cast candidate; an expletive is right only if unbound; any other binding on a trap is wrong. Match rule as rounds 1–3 (equality or whole-word suffix either way; a prefix does not count; **no prefix matching is added to the scorer**). A case is matched by the start of its token; a case with neither binding nor gap nor out_of_scope is silent. Command: `node eval/attention/score4.mjs --file <v3.json> --dir <v3 folder> [--controls]`.

## Bars (numbers decided now; kept from round 3 except P2)
- **P1 precision** of bound attended cases ≥ 0.80, testable only if at least **8** are bound.
- **P2′ right-bound coverage** = RIGHT-bound attended cases ÷ ALL attended cases ≥ **0.45**. (Round 3 counted wrong bindings as coverage; 4 of its 12 were wrong. Its right-bound figure on v2 was 8/20 = 0.40, so 0.45 asks for a real improvement; dev is 0.55, optimistic.)
- **T1 trap wrong-bind rate** over all traps ≤ 0.20.
- **S1** zero silent outcomes.
- **K1 shuffled-referent control** (5 seeds 20261103–07) fails P1 on every seed.
- **G1** no word list in `attention-binder.js` (`gates.mjs`); **G2** the he/she resolver's files, `corpus-session.js` and `eot-claim-match.js` byte-identical to base `15f82fc`, `priors.js` only gained lines, existing tests pass (the one pack-dependent test excepted); **G3** nothing existing imports the binder; **R** rounds 1–3 reproduce exactly with the new options absent.
- **Honest reading, fixed in advance.** The round passes only if P1, P2′, T1, S1, K1 and the gates all hold. Passing P1 and T1 by gaps while missing P2′ is a failed round, not a partial one.

## Expected failure modes (stated before release)
- **Coverage is the likely failure.** The round-4 mechanism removes wrong bindings; it adds no right ones (dev: 40 → 40). Synonym head nouns without earned evidence ("The span", "The facility") stay typed gaps, so P2′ may land under 0.45 on a set heavy in them.
- A description that introduces something new but whose head word the TOPIC owns will still bind to the topic (v2's "The spacecraft").
- A person whose weight clears the bearer share can still be bound to as the owner of a word (v2's "The tomb" → Shah Jahan): the `text_evidence` ruling does not rule people out; no lexicon giver is present on this machine.
- Pronoun errors from a cast that splits the topic or binds to a neighbouring being.
- Truncated names are not counted as the topic.

## What this can and cannot show
40 cases, one labeller (the parent), not blind, six articles, encyclopedic prose about single objects. Even a pass on v3 would not show the binder works on text unlike this; a fail with these bars is the third in a row on a held-out set. Still `text_evidence`, still unwired, still default off.
