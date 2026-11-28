# RESULTS: ocr-reread run 1 (PREREG stamped 2026-11-28T13:59:49Z; FREEZE.md) — GATE FAILED

One run on held-out pages: 5 FCIC memoranda not read before, 30 pages, each rendered grey at 80 and 65 dpi and read by tesseract 5.3.4 (`eng`); the PDF's own text layer is the answer key. Split: **held-out**, one genre, one agency, English.

| dpi | arm | aligned tokens | wrong before | fixed | broken | net | 95% interval (page bootstrap) |
|---|---|---|---|---|---|---|---|
| 65 | FOLD | 9,487 | 783 | 163 | 79 | **+84** | [51, 119] |
| 65 | UNIFORM (no channel) | 9,487 | 783 | 83 | 106 | −23 | [−47, 2] |
| 65 | NEAREST (strings twin) | 9,487 | 783 | 121 | 467 | −346 | [−426, −271] |
| 80 | FOLD | 10,144 | 105 | 13 | 84 | **−71** | [−99, −46] |
| 80 | UNIFORM | 10,144 | 105 | 5 | 122 | −117 | [−144, −92] |
| 80 | NEAREST | 10,144 | 105 | 6 | 521 | −515 | [−599, −438] |

Segmentation (tokens the OCR split or merged, outside the claim): 858 at 65 dpi, 201 at 80 dpi. FOLD's slots: 65 dpi 391 proposed, 432 contested, 360 unknown; 80 dpi 114, 193, 290.

**Gate.** (1) net > 0 with the interval clear of zero at BOTH resolutions: **failed** (holds at 65 dpi, fails at 80 dpi). (2) FOLD > NEAREST: holds at both. (3) the first reading recoverable from the revised text and the rereading: 60 of 60 pages.

**Reading.** On a badly degraded page the rereading helps a little (163 of 783 fixed, 79 broken). On a mostly clean page it does harm: there are few errors to fix and it "repairs" words that were right. The proposals must not be applied as a revised text; the organ stays off by default, and what it writes is the open slots.
The measured channel matters (FOLD against UNIFORM, both resolutions). The strings twin is far worse than doing nothing.

**Why it breaks right words (development pages, IN SAMPLE, exploratory, loose check by membership in the page's word set):** of 4,266 tokens the codec did not know, 1,586 were words the page really has. The form list is the POS prior's 16,654 forms from one treebank; a finance memorandum's vocabulary is not in it. The collapse has no evidence but form frequency and character confusions: no expectation from context, no regional or register prior, no hyperlexicon (the owner, 2026-11-28: that is where they prove their worth). Those are run 2's arms.
**What holding buys (same exploratory check):** of 2,680 unknown tokens not on the page, the top candidate is a page word for 1,323 and one of the three held candidates for 1,561: 238 more answers are in the held set than at its top.

**Falsifier kept.** A run on fresh pages where FOLD's net at a low error rate is above zero with its interval clear would overturn this; none exists.

**Not measured.** Any other engine, language or genre; real paper damage; whether the parse of a revised text is better; segmentation; the several-eyes arm (Alhazen `eval/eyes-ocr.cjs`, written, not run).

**Deviations.** In FREEZE.md (the organ changed after the stamp and before any held-out page was read: bounded search, the undecided shape). The dial `floor` was fitted at the edge of its grid.
