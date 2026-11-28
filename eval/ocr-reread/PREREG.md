# PREREG: does the OCR rereading repair more than it breaks? (2026-11-28)

**Claim.** `native/the-fold/ocr-reread.mjs`, with a character channel measured on development pages and dials fitted there, leaves an OCR page closer to what the page says than it found it, without ever changing the first reading.

**Data.** FCIC staff memoranda (born-digital PDFs with embedded fonts, so the text layer is the answer key), each page rendered to a grey image and read by tesseract 5.3.4 (`eng`). Two resolutions, 80 and 65 dpi, chosen on one development page because they give errors (about 8% and 19% of tokens there); nothing else was looked at.
- development: 10 documents (already in Zenodotus), up to 6 pages each spread across the document: channel and dials are fitted here. In sample; not a result.
- held-out: 5 other memoranda, downloaded and counted (pages, fonts, words) but **not read and not yet OCRed** when this was stamped.

**Arms.** FOLD (measured channel, fitted dials) · UNIFORM (same organ, no channel) · NEAREST (strings twin: every unknown token becomes its most frequent known neighbour at one plain edit).

**Score.** Per OCR token aligned one-to-one with a page token: fixed (wrong before, right after), broken (right before, wrong after), net = fixed − broken; cores compared with typographic apostrophes folded, case kept. Split or merged tokens are counted as segmentation and are outside the claim.

**Gate (all must hold on held-out, at BOTH resolutions).**
1. FOLD net > 0, and the lower end of its 95% interval (page bootstrap, 2000 draws, fixed seed) > 0.
2. FOLD net > NEAREST net.
3. The first reading is recoverable exactly from the revised text and the rereading on every held-out page (invariant; a single failure fails the gate).

**Falsifiers.** Net ≤ 0 or an interval that includes 0: the rereading does not help and must not be switched on. FOLD ≤ NEAREST: the measured channel and the margin buy nothing over a string neighbour. FOLD ≈ UNIFORM is reported either way (it says whether the channel matters).

**Not measured by this run.** Any engine but tesseract; any language but English; scans with real paper damage (the Lehman exhibits that prompted this have no answer key); whether the READING (parse, roles) of the revised text is better; segmentation errors; five held-out documents of one genre from one agency is a small, narrow sample.

**One run.** After the stamp and the freeze, `build-pairs.mjs` on the held-out PDFs, then `measure.mjs test` once. A slip is a deviation and is written down.

**Stamp.** sha256 of this file above this line: `14ce8c873f998e3697ce471d6277a7e0ed5115bcd56c65af8e9872e8c53201cb`, 2026-11-28T13:59:49Z. Held-out pages not yet OCRed.
