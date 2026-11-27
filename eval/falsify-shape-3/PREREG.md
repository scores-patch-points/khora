# PREREG 3: does filling the missing English tokenizer regress anything? HELD-OUT A/B.
64 English sentences and gold written by a separate agent that read no file; half contain a contraction, possessive or dotted abbreviation ("contracted"), half none ("plain"). Not read by the author of the change (shape-checked by script only). Code frozen at khora e29920f. One run per arm; the SAME code with one switch.
- PRIOR-TOKENS: `KHORA_UD_TOKENS=prior` (the behaviour before the change: no tokenizer prior, cut on spaces and punctuation), FOLD-V2 rule of PREREG 2.
- ADAPTER-TOKENS: default (the English adapter's tokenizer fills the gap), same rule.
**No-regression gate (declared before the run):** ADAPTER wrong <= PRIOR wrong AND ADAPTER correct >= PRIOR correct, overall and on the "plain" half (where tokens should barely change). If the gate fails the default goes back to PRIOR-TOKENS and the result is recorded as negative.
Also reported: FOLD-V1 (no abstention) under each switch, and the per-category counts. Not measured: other languages (untouched by the change), a corpus, a human labeller.
