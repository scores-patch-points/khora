# PREREG-RANK-0 — does a graded relatedness score ("smell") built on the reader's own structure improve which sentences are offered as candidate answers?

Branch `rank-0` on scores-patch-points/khora. Not merged. Measurement and a library only; nothing is wired into the holodeck Ask. Written and hashed before any held-out run; the held-out set (QSET-2) has not been seen by the author of this file.

## Code base (recorded)
- `cast-identity` at 3d5a32a. Its code is the accepted A4.1 (ef00e61); the two commits after it (93df357, 3d5a32a) add only `eval/cast/dev/badsurf.mjs` and `eval/cast/PREREG-CAST-A4-1.md` (checked by `git diff --stat ef00e61 3d5a32a`). Nothing else on that branch is used.
- Attention binder from khora PR 95, commit a8302ab (`attention-binder` branch, read-only clone): `native/adapters/text/attention-binder.js`, `attention-switch.js`, and `priors.js` (the binder imports `NEUTER_THIRD_PERSON` from it; the file differs from cast-identity's only by 8 added lines, checked). `activation.js`, `pronouns.js` and `phasepost.js` are byte-identical on both branches. The binder is called only through `attendedBindingsFor(entry,{enabled:true,...DECLARED})` with the binder's own declared round-5 dials (`DECLARED` in `rank0-lib.mjs`, copied from PR 95's `eval/attention/score5.mjs`, not tuned here); no `nonPersonal` is passed, so every run reports `ruling: text_evidence`.
- Run with `KHORA_PRIORS_DIR=$HOME/Downloads/workspace/janus/priors` (stand-in, ten English priors, identical to janus main). Canon preflight (`canon-check.mjs`, verdict CANON-OK, all ten priors identical, probe clean) at the code commit b151448 (the last commit before this file) on a clean tree: **preflight sha256 `0eb14e0be049b1880c91b9b842744b2e52bc303623e4e938cc9d78534a41800a`** (the hash line the script prints; its output contains the head and the dirty count, so it is the hash of the state at b151448). The parent's own run on a snapshot must pass the preflight itself.
- Embedding: local ollama `nomic-embed-text:latest`, digest `0a109f422b47…` (checked by the script; it stops if the prefix differs), prefixes `search_query: ` for the question, `search_document: ` for each candidate. No other model.

## Units and unit text (fixed)
Each text is read once: `readDocument(text,{language:"en",minCharacters:0,lexicon:localLexicon("en"),castIdentity:true})`. The candidate units are the reader's own `sentences`. No splitter, title, heading or window of ours.
Context of a unit, from the reader's own output only:
1. **bound referent**: if the binder returns a *binding* whose span starts at the sentence's first word (the sentence opens with a neuter pronoun or a definite description), the cast being it binds to, by its cast `surface`. A typed *gap* at that position adds nothing and is recorded (`gap` reason per unit; counts in `readStats`/`gapReasons`).
2. **mention beings**: the `surface` of every cast being with a mention span wholly inside the sentence, in order of first mention.
**Unit text** = `names.join(", ") + " — " + sentence`, where names = the bound referent (first) then the mention beings, distinct, each *kept only if it does not already occur literally (case-insensitive) in the sentence*; with no names, the unit text is the bare sentence. This is the whole definition and is not changed after the freeze.

## Arms (fixed)
- **L** = BM25 over the bare sentences of the pool (k1 1.2, b 0.75, lower-case `\w+` tokens of 2+ characters, idf ln(1+(N−n+0.5)/(n+0.5)), unique query terms, no stop list). A stand-in for the Ask's ranking.
- **S0** smell of the bare sentence; **S1** smell of the unit text. Raw cosine of query and document embeddings. **S0g / S1g**: ground g = mean of the pool's document embeddings (of that arm), score = cos(q−g, d−g).
- **F** = reciprocal-rank fusion (k 60, 1-based ranks) of L and the **fusion smell arm = S1g**. Ties in any ranking go to the earlier sentence.
- **SH** shuffled control: the document embeddings of the fusion arm permuted among the units of each question's pool (mulberry32, seed 20261103, one stream in question order), scored as S1g; **FSH** = RRF of L and SH.
- **A** (development only) = the Ask's own recorded top-5 passages from holodeck draft PR 31, `eval/e2e/raw/base.json` (the Ask with layers 3 and 4 off), scored against the same gold; copy in `dev/ask-base.json`, scorer `dev/ask-baseline.mjs`. **Not the same pool**: the Ask ranked statements of all 21 texts, top 5 only. It reproduces the PR's 10 of 27 first answers gold.
- No thresholds anywhere.

**Choice of the fusion arm (rule declared, applied to development data only):** the smell arm with the most gold-in-top-3 on the low-overlap half of the development set; ties by MRR on the full set. Dev: S0 7, S0g 7, S1 9, S1g 9 of 14 → tie S1/S1g → MRR 0.680 vs 0.762 → **S1g**. (The four smell arms had been run once before the rule was written down; the choice is therefore from dev data and optimistic.)

## Pool, gold, strata
- **Pool** (primary, the bars): for each question, all reader sentences of the question's named `doc`. **Secondary** (descriptive, no bar): all reader sentences of every text in the texts dir, as the Ask pools. Both are reported.
- **Gold**: reader sentences of the question's doc whose whitespace-normalised text contains a `gold_start` string (or, for a gold string spanning sentences, is contained in a sentence of 20+ characters). Other sentences that also answer count as misses for every arm alike. The script reports any gold string that matched no sentence (`unmatchedGold`); those questions are not scored. Dev: none unmatched.
- **Measures** per question: first gold in top 1, 3, 5, 10 of the pool; reciprocal rank of the first gold. On the **full set**, the **low-overlap half** (questions whose idf-weighted token overlap with their gold sentence — Σ idf of shared tokens over Σ idf of question tokens, idf from the pool, the best gold sentence if several — is at or below the median; ties in) and the **stratum** (every gold sentence's first token is in the reader's own closed classes `NEUTER_THIRD_PERSON` ∪ `DEFINITE_DETERMINERS` (priors.js) and the binder returned a binding or a typed gap at that position). Dev: 14 of 27 low-overlap, 10 of 27 in the stratum.

## Held-out protocol
`node eval/rank0/rank0.mjs <khora dir> <questions.json> <texts dir> <out.json>` (needs `KHORA_PRIORS_DIR`; optional `RANK0_CACHE=<dir>` for read/embedding caches, leave unset for a clean run; `RANK0_SECONDARY=0` skips the secondary pool). Input schema, as QSET-1.json: `{"new":[{"id","q","doc","gold_start":["first words of the answering sentence", …]}]}`; `doc` names `<texts dir>/<doc>.txt`. (The dev file `dev/DEV-27.json` also uses `gold:[{doc,contains}]` for multi-document gold; the held-out run needs only the first form.) The script prints the measures per arm and subset, the secondary pool, and the bars, and writes everything to `<out.json>`. Run once on QSET-2 by the parent session, on a snapshot of the frozen commit. No arm, unit definition, choice or code is changed after the freeze.

## Bars (registered now; may be sharpened, never loosened)
Counts are numbers of questions with a gold sentence in the top k, on the held-out set.
- **B1 no harm**: F recall@10 on the full set ≥ L.
- **B2 the claim**: on the low-overlap half or on the stratum, F recall@3 ≥ L + 2.
- **B3 the context helps**: on the same two subsets, S1g recall@10 ≥ S0g + 2 on at least one (the ground variant follows the fusion arm).
- **B4 control**: FSH recall@3 − L recall@3 ≤ 1 on the full set, the low-overlap half and the stratum (all three; sharpened from "gains at most 1").
- **Decision rule**: if B1, B2 and B4 hold, the score may feed the Ask's candidate ranking by rank fusion, as "smelled", never as a verdict. Otherwise not. B3 is reported either way; it says whether the structural context, not just the embedding, earns the gain.
A subset with fewer than 6 questions cannot pass B2/B3 (reported as untestable, not as pass).

## Development numbers (SPENT data, OPTIMISTIC: the arm choice and the unit definition were made while looking at these 27 questions; not evidence)
27 items = the 24 of QSET-1 plus the three known failures (Cumberland length, Eiffel height, Concorde cost), labelled in the E2E gold file (`dev/GOLD-E2E-0.json`) before this work. Counts of questions with gold in top k:

| set | arm | R@1 | R@3 | R@5 | R@10 | MRR |
|---|---|---|---|---|---|---|
| full (27) | L | 8 | 17 | 19 | 21 | 0.478 |
| | S0 / S0g | 14 / 17 | 20 / 20 | 20 / 20 | 23 / 23 | 0.636 / 0.702 |
| | S1 / S1g | 16 / 19 | 19 / 21 | 22 / 22 | 23 / 25 | 0.680 / 0.762 |
| | F (L+S1g) | 17 | 22 | 22 | 22 | 0.725 |
| | SH / FSH | 0 / 2 | 0 / 7 | 1 / 7 | 3 / 8 | 0.034 / 0.189 |
| | A (Ask top-5) | 10 | 14 | 16 | – | 0.455 (top 5 only) |
| low-overlap (14) | L | 3 | 6 | 6 | 8 | 0.331 |
| | S0g / S1g | 6 / 9 | 7 / 9 | 7 / 9 | 10 / 12 | 0.508 / 0.678 |
| | F | 6 | 9 | 9 | 9 | 0.540 |
| stratum (10) | L | 2 | 7 | 7 | 7 | 0.443 |
| | S0g / S1g | 7 / 9 | 7 / 9 | 7 / 9 | 8 / 10 | 0.719 / 0.912 |
| | F | 6 | 8 | 8 | 8 | 0.690 |

Dev bars (not evidence): B1 22 vs 21 holds; B2 +3 (low-overlap), +1 (stratum) holds; B3 +2 and +2 holds; B4 −10, −3, −4 holds. Secondary pool (all 21 texts, 3930 sentences): L R@3 10, S0g 17, S1g 18, F 17 of 27; R@10 L 17, S1g 23, F 20. Smell alone is at least as good as F on dev (S1g R@3 21 vs F 22, R@10 25 vs 22); fusion with L did not add to it. The binder bound the opening of 68 of 3930 sentences and returned a typed gap for 188 (reasons in `dev/dev-out.json`); every run is `text_evidence`. The ablation (`dev/ablate.mjs`, `dev/ablate-out.json`, descriptive, no bar) covers the five questions where S1g beats S0g (n07, n09, n11, v05, x03): where a binder-bound referent name is in the unit (n07 Gateway Arch, n09 Hoover Dam, n11 Concorde) dropping that name drops the gold from rank 1 to 7, 27 and 82 respectively (bare ranks 7, 30, 79), so the bound referent name carries those gains; in v05 the gold unit has no context at all (its text is the bare sentence) and the gain comes from the contexts of the competing units, which the single-unit ablation cannot show; in x03 mention beings give a one-place gain. Single-token drops mostly cost 1–10 places, the largest being the subject name and the figure/verb words.

## Expected failure modes (stated before the held-out run)
- The binder covers few sentence openings (68 of 3930 on dev) and gaps most descriptions, so on texts where the answer sentence opens with "it"/"the X" the context is often empty and S1g ≈ S0g.
- Mention-being context can add a name that is wrong for the question (merged aliases, truncated names from the reader), pulling a wrong sentence up.
- Smell does not read quantity: "how tall" vs "how wide" sentences about the same subject smell alike (n01, n02); the ranking offers candidates, never the answer.
- RRF with L may be worse than smell alone (it was on dev); B1 guards that F does not fall below L, not that F beats smell.
- Pool is one document per question in the primary measure, so it is easier than the Ask's all-texts pool; the secondary pool is closer to the Ask and is reported without a bar.
- With about 30 questions and half in a subset, the ±2 bars are coarse: one question's noise in either direction.
- Embedding values from ollama can differ in the last digits between runs; ranks near ties may flip.

## Limits
Dev numbers are optimistic and spent. One labeller for the dev gold. Gold is a sentence-level string match; answers spread over several sentences count as misses. The unit is still a sentence, not a proposition in nested context: that is the aim, not built here. The ground (pool mean) is a declared stand-in for "the declared ground" the smell departs from. Nothing here shows the score decides anything.

## What could not be built without a word list
- A **document subject / title** context (which being the whole text is about) — the reader gives no such field and a title heuristic is a typed rule; not used (an earlier attempt, SMELL-1, was withdrawn for this).
- **Answer-type matching** (a "how tall" question wants a length, "when" a date): needs a typed list of question words and units; not used. The smell cannot tell a height from a width except by what the embedding happens to carry.
- A **topic-owned description** ("the structure", "the airliner") bound without the text's own copula kind: left as the binder's typed gap.
- **Propositions in nested context** instead of sentences: the reader exposes clauses, but a proposition unit needs a rule for which clause carries which context that we have not earned; not built.

## Files
`rank0.mjs` (CLI), `rank0-lib.mjs` (library, arms, bars), `dev/` (DEV-27.json, GOLD-E2E-0.json, ask-base.json, ask-baseline.mjs/.out, ablate.mjs/ablate-out.json, dev-out.json, dev-run.log).
