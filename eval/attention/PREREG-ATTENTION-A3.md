# ROUND 3 — coverage without giving back the trap safety: pre-registration, written and hashed before held-out set v2 is released

Date: 2026-11-03. Same branch and PR (`attention-binder`, khora#95). No round-1 or round-2 file or hash is edited. PARA-GOLD v0 (b01–b15) and PARA-GOLD-BIND v1 (v01–v30) are SPENT: used for diagnosis and as development material (`DEV-SET-3.json`, 91 cases: the 61 of `DEV-SET-2` + the 30 of v1). Round 3 is scored once on the parent's v2 (about 36 cases from six unseen articles).

## Why (round 2, published)
Held-out v1: trap wrong-bind 1/14 (held) but coverage 5/16 = 0.31 (failed), and three targets ended with no binding and no gap.

## Diagnosis from the spent v1
- **Three silent outcomes** had two causes. v15 followed a section heading on the same text line, so its sentence-initial `The` was not the first token. v14 and v28 were found and gapped, but the binder's address covered only the word after the article ("The expanded") while the case addresses the whole noun phrase, so the scorer saw nothing: a scoring-address mismatch plus a head-word defect (the word after "The" was an adjective).
- **Tied candidates** were mostly one thing split by the cast ("Panama" / "The Panama Canal"; "Brooklyn Bridge" / "The Brooklyn Bridge").
- **Description gaps** were synonym head nouns. "waterway" was earned (the first copula predicate), "building" was in no predicate.

## The changes (optional arguments of `bindAttended`; absent = the round-2 call, byte for byte: the round-1 gold output and the round-2 v1 output are both reproduced exactly with them off)
1. **`lineStarts`.** A line break ends a unit: each line is read as a sentence of its own; a line that is only heading markup is not read. The target is found after a heading, in a table row, in a list item.
2. **`npHead`.** After the article, up to three lower-case words, ended by a closed class (copula, auxiliary, determiner, clause opener, coordinator), a capital or punctuation. The head is the rightmost word of that run that some candidate owns; the address ends there. If none, the target is a typed `description_unbound`.
3. **`tieResolve`.** When the top two candidates are within `minMargin`, decide from the text before refusing: (a) the candidate whose name contains every other tied candidate's name words (determiners left out) wins ("Panama Canal" over "Panama"; identical names: the more mentioned); else (b) the candidate the previous sentence made its subject; else (c) the single tied candidate the previous sentence named or bound. If none holds the gap `pronoun_no_margin` stays. Every other veto (centre, carry, expletive) still applies after it.
4. **`foldPlural`.** Words are compared with a trailing plural "s" folded (length above 3, not "ss").
5. **`contextMinUses` = 2 (the earned rule for a head noun that is in no name).** A word counts as one of a being's own nouns if, in at least 2 earlier sentences about that being (its first naming, else what it bound), the word appeared lower-cased, and those sentences are at least half of all earlier sentences that used the word. A word that was used for other things, or only once, gives nothing: a typed gap. The topic's predicate-kind route (round 1) is unchanged.
6. **`neverSilent`.** A neuter pronoun that falls inside a cast naming files `inside_cast_mention`. With `lineStarts` and `npHead`, every sentence-initial target and every neuter pronoun ends as a binding or a typed gap by construction; the scorer matches by the START of the token, so a longer or shorter address is not a miss, and a case with neither is reported SILENT.
Declared round-3 values (`score3.mjs::DECLARED`): the round-2 values plus `lineStarts` `npHead` `tieResolve` `foldPlural` `neverSilent` on and `contextMinUses` 2.

## Sets
| set | role |
|---|---|
| `DEV-SET-3.json` (sha256 `DEV-SET-3.sha256`): 91 cases, 53 attended, 37 traps, 1 out of scope | DEVELOPMENT (optimistic: includes spent sets) |
| v2: about 36 cases from six unseen articles (structures plus a spacecraft and a telescope): about 20 attended (8 pronouns or possessives, at least 4 with a competing candidate; 8 definite descriptions, at least 4 with a different head noun; 4 sentences that open a section) and about 16 traps (8 "It" for an entity or event of the previous sentence, 4 expletive, 4 descriptions naming something other than the topic). Hand-labelled by the parent, not blind, hashed before release | CONFIRMATION, scored once |

Scoring as in the v1 pre-registration (restated): attended is right only if bound to the topic; a trap is right if a typed gap or bound to the entity the set states (when it is a cast candidate); an expletive is right only if unbound; a wrong binding on a trap is wrong whatever it is bound to. Match rule as rounds 1–2 (a bound being is the case's when a cast surface equals an accepted name or is a whole-word suffix of it or has it as one). Command: `node eval/attention/score3.mjs --file <v2.json> --dir <v2 folder> [--controls]`.

## Bars (numbers decided now)
- **P1 precision** of bound attended cases ≥ 0.80, testable only if at least **8** are bound (otherwise reported untestable, not held).
- **P2 coverage** of attended cases ≥ 0.50.
- **T1 trap wrong-bind rate** over all traps ≤ 0.20.
- **S1 zero silent outcomes**: every attended case and every trap ends as a binding, a typed gap, or (expletive marked out of scope) out_of_scope. One silent case fails S1.
- **K1 shuffled-referent control** (5 seeds 20261103–07) fails P1 on every seed (precision below 0.80, or fewer than 8 bound).
- **G1** no word list in `attention-binder.js` (`gates.mjs`); **G2** the he/she resolver's files, `corpus-session.js` and `eot-claim-match.js` byte-identical to base `15f82fc`, `priors.js` only gained lines, existing tests pass (the one pack-dependent test excepted); **G3** nothing existing imports the binder (off by default); **R1/R2** the round-1 and round-2 outputs reproduce exactly with the new options absent (done on this code).
- **Honest reading, fixed in advance.** Round 3 passes only if P1, P2, T1, S1, K1 and the gates all hold. If coverage rises only because traps get bound (P2 holds and T1 or P1 fails) the round FAILED. A pass by abstention is not possible here: P2 needs coverage. Also reported, no bar: bound traps by kind, gap reasons for the attended gaps, and any wrong attended binding.

## What this can and cannot show
About 36 cases, one labeller (the parent), not blind; one genre (encyclopedic articles about single objects). Dev numbers (coverage 0.62, precision 32/33, trap wrong 4/37, silent 0) are optimistic: tuned on, and the v1 cases were seen. The expected failure mode is the one in the dev result: synonym head nouns without earned evidence stay gaps, so coverage on the "different head noun" and "section opening" cases may sit below 0.5 even when the pronoun cases pass. Still the `text_evidence` ruling (no Wiktionary pack), still unwired, still default off.
