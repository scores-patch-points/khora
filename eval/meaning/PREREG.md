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

## Run 3 (2026-10-21): layers, gates and the opening-phrase fix
- One-word re-readings (layer 2's runner-up on one word, claim or source side) reach the right verdict for 27 of 66 failing pairs and break 122
  of 162 passing pairs, cheaper than they fix (median tagger cost 27.7 vs 36.9): choosing among tag runner-ups does more harm than good.
- Layer 3's tree-shape gate (native/adapters/text/parse-gate.js) is not a discriminator on EWT (gold trees fail it about as often as greedy
  parses); not wired.
- Layer 4, the opening-phrase fix (an object-less verb's second end is the first oblique AFTER the verb): on EWT test sentences that open with a
  phrase, claims putting that phrase in an argument slot fell 18 → 3 of 126 on gold trees, 15 → 4 on parsed ones. EO-terminal's 130 planted
  filing pairs (EO-terminal/data/relations/meaning-pairs.jsonl; MEANING_EXTRA=filing=…): 82.3% → 98.5%, false-reject 34.4% → 1.6%,
  false-accept 1.5%. Post hoc on that set (the failure was found on it); the EWT measure was defined before the fix. Other sets unchanged.

## Run 4 (2026-10-21): figure binding (native/adapters/text/figure-binding.js)
- UD_English-EWT test, 440 figures (361 counts, 40 dates, 27 times, 10 shares): bound on the gold tree and on the parsed tree; the parsed binding
  agrees with the gold one on measure 73.4%, attribute 97.5%, being 82.7%, event 85.7%, all four 57.0%; a being is found for 58.9% (gold trees),
  64.3% (parsed). EWT is web text and mostly counts: a figure-dense set is needed for a fuller measure.
- Meaning sets: fresh 79.2% → 87.5%, false-accept 18.2% → 0%, contradictions 4 → 6 of 8; held-out contradictions 5 → 6 of 10 (accuracy 70.0%);
  filing 98.5%, Fold C3 main 76.7% and counterfactual 78.6% unchanged. Post hoc: the failing figure pairs were seen in run 3.

## Run 5 (2026-10-21): relation identity, induced over a pocket (relations.json, 22 pairs pre-registered from AnaptysBio's 10-K)
- Baseline: 36.4% (no synonym or converse met; 12 of 12 E rejected). A conjunction fix in grammar-en.js (a subject-less conjoined verb shares its
  head's negation: "never declared or paid") takes it to 45.5%; other sets unchanged.
- Induction (eval/meaning/relid-pocket.mjs): the company's filings, 2,511 sentences read into claims; relations tested as SAME and as CONVERSES
  (role swaps) by identity-induction over role-labelled ends. enter ~ terminate binds as SAME (opposites share every argument); pay ~ receive,
  enter ~ sign do not bind; buy, out-license, declare never occur in the pocket (gap). Not wired: binding by shared arguments would accept
  "we terminated the agreement" against "we entered into it".
