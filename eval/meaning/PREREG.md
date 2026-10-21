# Meaning grounding through EOT — pre-registration (2026-10-21, written before the frontier arm or the other-language set was run)

Arms: grammar-en (khora English parser + repairs → EOTClaim@1), frontier (a frontier model reads any language → EOTClaim@1, spans checked), wording (the vendored Fold falsifier). One EOT matcher (eot-match.mjs) decides for both grammar arms; it sees no words of any language.
Sets: The Fold's C3 main (30) and counterfactual (14) — DEV for grammar-en (rules were written against them); held-out 201-230 (English, real page lines, labels fixed before scoring); other 301-317 (es, de, fr, ja, and two English-claim/Spanish-source pairs).
Bars (on held-out + other, the only sets that count):
 B1 an arm is useful only if its false-accept rate is at most 10% AND it names at least half of the contradictions.
 B2 frontier beats wording on accuracy on held-out by at least 10 points, or it is not worth the call.
 B3 on the other-language set, grammar-en must be a typed gap (no-grammar) on every non-English pair, never a verdict.
 B4 cross-language pairs 316/317: the EOT layer meets them only if both adapters emit the same neutral keys.
Not tuned after seeing these sets; any later change is reported as a new run.

## Run 2 (2026-10-21): EOT layer fixes (janus single-holder and state declarations, light "be" needs both ends, claim obliques must be met), fresh set B (fresh.json, 24 English pairs, written before any arm ran on it). The held-out 201-230 and 301-317 are now seen and count as dev.
Bars on fresh set B, for the MECHANICAL arm (grammar-en → EOT → janus), the only arm the product can run:
 B5 false-accept at most 10%, at least half the contradictions named.
 B6 accuracy at least the wording judge's, with fewer false accepts.
If B5/B6 fail, the cause is assigned to the grammar adapter (no proposition / wrong roles) or the EOT layer, pair by pair.
