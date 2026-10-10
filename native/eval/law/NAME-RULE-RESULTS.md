# The name rule, tested — results (2026-10-06)

Rule: *a name is that which affects the holographic field like a name* — ablate the token, re-read, and the slots it filled change
(docs/LAW-FALSIFICATION.md C2/R1; single-mention rule 1.5).

Instrument: `eval/law/name-rule-informal.mjs` (pre-registration in its header, one disclosure added before the full runs; header sha256
`80991f9724f24a5fe21d5a9f23a2ec74e4969754a308e17b31851e6801aece82`). Results: `eval/law/results/name-rule-informal.{irc,wp}.json`.

## Design (after the user's correction: no learning from well-formatted text)

- **No classifier, no capitals, no POS prior, no treebank anywhere** in labels or scores. Each token gets a fixed pre-registered number:
  S_ENTRY = how many referent-entry slots change when the token is deleted (higher = more name-like, direction fixed in advance).
- **Gold independent of formatting.** IRC: a word is a name when it equals a nickname that spoke that day (the speaker field is metadata); the
  reader sees only message bodies, lowercase, typos intact. War and Peace (contrast): the hand-verified cast of 48 referents.
- Readers: impact.mjs's three prior-free readers, frame-causal. Windows of about 3,000 word units. Names are paired with frequency-matched
  unlabelled tokens (positive-unlabelled; stated, not corrected).
- Rivals: S_SPAN (the span version of impact), R_BURST (recent burstiness), R_FREQ (mentions in the window), R_POS (position, a control).

## Results (AUC, names vs matched tokens)

| | IRC chat (6 channel-days, 39,939 messages, 19,590 nickname mentions) | War and Peace (cast of 75 name forms) |
|---|---|---|
| later mentions, **S_ENTRY** | **0.843** [0.808, 0.883] (permutation q95 0.533) | **0.513** (q95 0.513) |
| S_OWN / S_ALL / **S_SPAN** | 0.669 / 0.597 / **0.492** | 0.421 / 0.423 / 0.385 |
| R_BURST | 0.760 [0.701, 0.814] | 0.765 |
| **R_FREQ** (matched out "by design") | **0.853** [0.840, 0.866] | 0.767 |
| R_POS (control, must be 0.45–0.55) | 0.484 (ok) | **0.362 (FAILED)** |
| non-null share, names vs unlabelled | 0.82 vs 0.66 | 0.50 vs 0.69 |
| median extent of the effect (tokens) | **352 vs 0** | 0 vs 0 |
| first mention, frame-causal S_ENTRY | 0.500 (names non-null 0.10) | 0.500 |
| first mention, non-causal (+32), S_ENTRY | 0.648 [0.605, 0.690] vs R_BURST 0.625 | 0.514 |
| pre-registered verdict | **HOLDS** (V1 V2 V4 yes, V3 no) | **UNDERPOWERED(reader)** (K4 failed) |

Controls: sham ablation 100% null; determinism 40/40; K5 licence (names leave a trace) 0.82 on IRC, 0.503 on War and Peace.

## Pre-registered predictions

P1 irc AUC in [0.55, 0.75]: **failed** (0.843, higher). P2 wp within 0.05 of irc: **failed** (0.513 vs 0.843). P3 first mention deaf in the causal
arm: held. P4 burstiness beats impact: **failed** (impact 0.843 vs 0.760). P5 span ≥ slot: **failed** (span 0.49 vs slot 0.84; the slot-not-span
refinement R1 is supported on IRC). P6 K5 passes on irc: held (wp passed only barely, 0.503).

## What it says, and what it does not

- On informal chat with no capitals and no priors, ablating a nickname changes the reader's slot structure far more than ablating a
  frequency-matched word, and it is the slot structure, not the span, that carries it.
- **But a plain count of how often the word appeared in the last 256 messages does as well (0.853 vs 0.843).** The pre-registered check that
  this rival would sit near 0.5 failed: matching on whole-day frequency does not match local clustering. V2 holds as registered (against
  R_BURST) and does not hold against the local count. The impact measure is a real signal; it is not shown to be a better one.
- **In the novel the effect is absent (0.513).** Hypothesis, NOT tested: a character mentioned hundreds of times per window loses nothing
  structural when one mention is deleted, whereas a nickname mentioned a few times per window does. If true, "affects the field" measures
  fragility near the reader's recurrence floor, not name-ness.
- **A single mention is invisible to these readers** (causal AUC 0.500 on both corpora; names' non-null share 0.10). The rule "a name appears
  once and is a name" is not falsified here; it cannot be exercised until a reader admits at first mention (a typed gap about the reader).
  Looking 32 messages ahead, first mentions of nicknames separate at 0.648, but no better than the rate rival.
- Not covered: SMS, Singlish chat, Enron email (no metadata gold; they need a separate annotation), non-English text, identity as a fold
  (T11), and any fitted classifier (deliberately).
- The real production pipeline arm on War and Peace (priors on, labelled contaminated; `name-war-and-peace-real.json`): later mentions of
  names change the referent index 0.40 of the time vs 0.05 for common words, but four summary numbers do not add to frequency (−0.03);
  first mentions are deaf causally (0.04 vs 0.00) and 0.25 vs 0.01 with 32 sentences of lookahead.
- The earlier supervised design (`name-war-and-peace.mjs`: labels from capitals, a fitted classifier) is kept as a clean-text control only;
  it does not enter any verdict.

## Control: the supervised War and Peace run (finished; labels from capitals, a fitted classifier — does NOT enter any verdict)

`name-war-and-peace.mjs`: 600 later pairs + 438 first-mention pairs, leave-one-block-out ridge logistic. Capital arm 1.0 by construction (it defines the label).
Later mentions: SLOT+ATM 0.753, SPAN 0.776, frequency 0.725, burstiness 0.649, impact added to the case-free rivals +0.007 (not beyond rivals;
span ≥ slot). First mentions, causal: SLOT+ATM 0.627 (above its permutation limit 0.542): a fitted classifier hears single mentions that the
fixed S_ENTRY score cannot (0.50). Company shuffle: 0.736 → 0.515, so the signal depends on word order/company, not on counts alone.
Position control failed (0.588). Read: the signature carries more than the one scalar uses, but this classifier learned it from labels made of
capitals; whether that transfers to informal text is untested (a transfer test — fit on War and Peace, score IRC nicknames — would say).

## CORRECTION (2026-10-06, found by ant-shape, verified on the raw logs): the IRC result is confounded by message position

In the six IRC channel-days used above, **92.1% of nickname mentions are the first word of a message** (the vocative "nick: ..."), against 9.3% of all tokens
(18,524 of 20,105 gold occurrences). My matched negatives were matched on whole-day word FREQUENCY, not
on position inside the message, and the position control R_POS used the message's index in the stream, not the word's index in the message. So the IRC
AUC of 0.843 for S_ENTRY (and the 0.853 of the local mention count) partly measures "this word opens a message", not "this word affects the field like a name".
ant-shape: a fitted rival that uses only whether the token is message-initial scores AUC 0.918 on IRC; on NON-initial IRC tokens only, the learned full-record
transfers UD-english -> IRC at 0.58 and all-UD -> IRC at 0.67 (34 positives), IRC leave-one-day-out 0.72. Read the IRC numbers above as an UPPER bound.
A re-run with negatives matched on within-message position (and on message-initial status) is needed before any IRC claim is kept.
