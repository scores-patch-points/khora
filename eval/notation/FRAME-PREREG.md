# The notation codec's frame bound — pre-registration (2026-10-26, written before any measurement)

`arithmetic.js::notationSpan` (khora #68) accepts a notation span only when the words around it, its FRAME, number at
most `NOTATION_FRAME_WORDS`. That constant is 8 and is declared, not earned (II.11). This file fixes how it is earned
before anything is counted.

## What is counted

The frame word count is the number of `Intl.Segmenter("und", { granularity: "word" })` word-like segments in the text,
after the numbers and the operator symbols are removed. Operator WORDS (times, por, fois, mal) stay in the count. That
makes it an upper bound for an ask that would carry a symbol instead.

## Sets (fixed now)

- **P_dev**, the positives that choose the bound: every ask with `kind: "mechanical"` in `eval/route/battery.mjs` and
  `eval/route/battery-multi.mjs`.
- **P_held**, the positives that test it: every `kind: "mechanical"` ask in `eval/route/battery-held.mjs` and
  `eval/route/battery-multi-held.mjs`. These are never used to choose the bound.
- **N**, real text that contains a span and is not an ask to this system. The source is the Zenodotus corpus:
  - the first 400 `.txt` files, in byte order of their paths, under each of `02-encyclopedic`,
    `05-academic-papers`, `08-news-current` and `11-multi-language`;
  - cut into sentences on newlines and the terminators of every script;
  - kept only if the sentence carries exactly one span that the codec's OTHER gates admit (one span, no digit
    outside it, no code punctuation, no comma between digits);
  - and only if it carries no question mark of any script.

  These are statements that contain arithmetic, the case the bound exists to refuse.

## The decision rule (fixed now)

1. `N* = max(frame count over P_dev)`.
2. Report the recall of P_held at `N*` and at the declared 8.
3. Report the acceptance of N (the share of N with frame ≤ bound) at `N*` and at 8.
4. **Adopt `N*`** if P_held recall at `N*` ≥ 0.95 **and** N acceptance at `N*` ≤ N acceptance at 8. Otherwise the bound
   stays 8, and the comment says it was measured and not adopted, with the numbers.
5. Nothing is tuned after the first run. A second run would be a new pre-registration.

## Falsifying control

If P_held recall at `N*` is below 0.95, the dev batteries do not represent held asks and the bound is not earned. If N
acceptance at the adopted bound is above 0.5, the frame bound does not separate asks from statements. Then the frame
bound is the wrong gate, and the honest next one is the ask's own mood (a question mark of any script, or the lane's
intents), not a word count.
