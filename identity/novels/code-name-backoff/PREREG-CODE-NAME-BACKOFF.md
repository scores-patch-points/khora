# PREREG — does a meaning back-off for unseen name heads raise how well a unit's name predicts what it does? (REUSED SPLIT)

Written 2026-11-24, before the one run. Frozen with `FREEZE-CODE-NAME-BACKOFF.md` (sha256 and UTC of this file, `backoff-test.mjs`, the files it imports, the wired prior it reads, and the code-roles data it reads). This is joint work with the code generation session ("Code generation in mini app"), which asked for it (answers 1 to 3 of its message): it holds `eval/code-roles/`; I read `data/dev.jsonl` and `data/fresh.jsonl` read-only, change nothing there, import none of its scripts (its AUC and shrinkage are re-implemented here), and write only in this folder.

## The gap, from its own results
Its H1 (`eval/code-roles/PREREG.md`, `RESULTS.md`) scores a fresh unit by the shrunk dev rate of the target among units with the same head word, `(k + 5·p0) / (n + 5)`, p0 the dev global rate; the bridge from name to effect is supported in Python and JavaScript for both targets (writes, returnsBool; AUC against a 2,000-shuffle null). But a head with fewer than 5 dev units gets almost only p0: **67% of fresh Python units and 45% of fresh JavaScript units**. Counts only, read before this prereg: uncovered fresh units Python 3,002 (841 distinct heads; 335 write-positives, 101 boolean-positives), JavaScript 3,049 (1,000 heads; 641 and 109); both languages clear the 30-positives rule on the uncovered subset.

## The question
For those uncovered heads, replace the prior p0 by a prior built from what the head word MEANS (the same formula, `(k_head + 5·q) / (n_head + 5)`, with q for p0, the head's own dev counts kept). Does the AUC on the uncovered units rise, beyond what chance structure gives, and beyond a plain verb-or-noun flag?

## Arms (declared now)
Anchors are all dev heads with at least one dev unit; a head's own counts are always left out of its own prior (leave-self-out).
- **B1, the wired sniffer (primary).** The head word is embedded with `qwen3-embedding:4b` and assigned the top-1 operator class of the WIRED prior `janus/priors/unit-cells-qwen3-embedding_4b-op.json` (nine classes). q = the shrunk dev rate of the other anchors in its class.
- **B3, the control (no embedding).** The head word's class is "verb-capable" (UniMorph English `VERB` or `NOUN|VERB`, `janus/priors/pos-eng-lexicon.json`, the giver code-roles already uses) or "other". q = the shrunk dev rate of the other anchors in its class.
- **B2, embedding neighbours (secondary).** q = the shrunk dev rate of the anchors weighted by max(0, z-score of cosine between the head's and the anchor's embedding) times n/(n+5); no k, no temperature. Falls back to p0 if no anchor has weight.

## Statistic and decision (no hand-set threshold beyond code-roles' own a = 5 and 30-positives rule)
On the **uncovered fresh units** of each (language, target): gain = AUC(arm) − AUC(baseline), AUC by average ranks, as in code-roles. The `--gate` mode of `backoff-test.mjs` reproduces code-roles' four published baseline AUCs to 1e-9 and the run refuses if it does not.
- **Null of the gain, 2,000 draws:** B1 and B3, the head words' class labels dealt out again at random (same marginal) and the priors rebuilt; B2, the anchors' rates dealt out at random among the anchors (the neighbour structure becomes noise).
- **An arm is supported for a (language, target)** iff gain > 0, the gain is above the 97.5th percentile of its null, **and** the arm's AUC beats the verb-or-noun control B3 (bootstrap over files, 1,000 resamples, 95% lower bound of AUC(arm) − AUC(B3) above 0). **Supported for a target** iff supported in both languages (their rule for the bridge); PARTIAL if in one; underpowered (fewer than 30 positives or negatives in the uncovered subset) is undecided.
- B1 is the verdict of what I built; B2 is reported with the same rule; B3 with its null as the reference.
- Descriptive: the AUC on all fresh units when the back-off replaces the score of uncovered heads only (covered heads are unchanged by construction); the number of distinct priors each arm produces; the head words' operator mix.

## REUSED SPLIT, and what I already know
The fresh split is spent (code-roles ran H1 and H2 once on it; its decision and AUCs are public). The back-off arms are new hypotheses on the same units, fixed before any back-off AUC was computed; I have seen the baseline AUCs and the counts above. A held-out split of dev by directory is not available for JavaScript (all dev JavaScript is under `khora-chat/native`) and was not used.

## My prediction, recorded before the run
B3 (a verb flag) helps a little: verbs and nouns differ in whether they write and whether they return booleans. B1 does no better than B3: nine noisy classes from a sniffer built on natural-language verbs, with junk and noun heads pulled toward DEF. B2 helps most, and most for returnsBool and for JavaScript (579 covered-dev-head anchors and 2,778 anchors against Python's far fewer), since synonyms of is/has/can/get/set/delete share an effect; small gains. So I expect B1 NOT SUPPORTED, B2 PARTIAL or SUPPORTED on returnsBool, and I am unsure about Python.

## What it would and would not show
A SUPPORTED B2 would show that what a head word means carries code-effect information that the dev table cannot give for words it has not seen: a general capacity (a back-off from names to meaning) that the code work could use. It would not show a back-off for the covered heads, composition, or that any generated code is right. It speaks for syntactic writes and returned booleans, English names, two languages, one machine's code.

## Known limits, stated now
Syntactic writes only (a call like list.append is invisible to the codec); English head words; the embedder read the head word alone, not the unit; B1's nine classes came from verbs; the uncovered units are the ones with rare or unseen heads, which may differ in kind from the rest; Python has few anchors with real counts; the split is reused.

## Deviations log
(empty; any change after the freeze is written here, never hidden)
