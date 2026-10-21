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

## Run 6 (2026-10-21): relation identity, both arms (bars as in run 5; post hoc on relations.json, which run 5 had already seen)
- Arm A, induction on CONSEQUENCES (what follows a relation in the pocket, not its arguments; scratch, not kept): enter ~ terminate still binds
  as SAME; pay ~ receive and enter ~ sign still do not bind. Negative, not wired.
- Arm B, definitions nominate (native/organs/relation-defs.js): Wiktionary REST verb senses, read on demand and cached (FOLD_WIKT_CACHE), give
  each verb its head verbs, passive heads and exchange; synonyms, converses (passive of the other, or opposite sides of a transfer with the
  same exchange), never a converse on one side. The matcher's transfer frames (giver / recipient / thing, from ARG0, ARG2 or a to-/from-oblique)
  decide direction. grammar-en.js now emits ARG2 for an indirect object and folds pronoun case (us → we).
  relations 45.5% → 68.2%, false-accept 10.0% → 0%, contradictions 1 → 6 of 7; filing 98.5% → 99.2%, false-accept 1.5% → 0%, contradictions
  31 → 33 of 34; main, counterfactual, held-out, other, fresh unchanged. Left: enter ~ sign (no definitional link), out-license (no entry),
  double-object and passive parse failures, coordinated objects. The pocket veto hook exists but is unused (induction never says "against").

## Run 7 (2026-10-21): a local Wiktionary, two-sided verbs, shape repairs (post hoc: every failing pair here was seen in run 6)
- Local Wiktionary: relation-defs.js now reads wiktextract entries and a VerbIndex@1 file (cli/wikt-verbs.mjs builds one from wiktextract JSONL;
  FOLD_WIKT_INDEX). Checked on the same 15 verbs taken from kaikki.org (wiktextract's own output): the REST cache and wiktextract agree on
  26 of 30 pairs; the 4 differences are "license", whose wiktextract senses go both ways ("To give formal authorization to use" … "To acquire
  authorization to use"). Rule: a verb with senses on both sides of a transfer joins a relation as the SAME one, never a converse, and the
  frame takes its direction from the case marking (to: giving, from: taking). With it the two sources give identical results on every set.
- A prefixed verb with no entry reads as its stem ("out-license" → license); a hyphenated verb takes its last part's lemma; a hyphenated word
  coordinated right after a verb, whose last part the lexicon allows as a verb, is tagged a verb (EWT splits hyphens: 0 fires on test, dev, train).
- Shape repairs (grammar-en.js repairShape), on UD_English-EWT test, gold fires / parsed fires / labels fixed / broken:
  two objects → the first is the recipient (a name or personal pronoun right after the verb, then a noun or number): 0 / 1 / 1 / 0, LAS 81.42 → 81.43
  (first tries were wider and broke more than they fixed: 0 / 19 / 2 / 10); reduced relative read as the root ("The milestone, achieved when …,
  was paid to Sagard"): 0 / 0 (silent on EWT); a conjunct joins the nearest like word before its "and": 13 / 6 / 0 / 5, DROPPED.
- A reversal needing BOTH parties crossed was tried and reverted: it settles 511 (sold / purchased shares, labelled T) but loses 503, 521
  (paid / received the same payment, labelled C), which have the same shape. 511's label is the odd one out; it stands as pre-registered.
- relations 68.2% → 81.8%, contradictions 6 → 7 of 7, false-accept 0%; filing 99.2%, main 76.7, cf 78.6, held-out 70.0, other 52.9, fresh 87.5,
  unchanged. Left: enter ~ sign (no definitional link: "enter into: To become legally committed to" / "sign: To validate or ratify"), 507
  ("to patent" read as a verb), 511 (label), 515 ("royalties and milestones" joined to "total").

## Run 8 (2026-10-21): grammars for Spanish, French, German, Japanese (post hoc: every pair below was seen; the "other" set is 17 pairs)
- Tokenizers (ud-tokenize.js), learned from each treebank's train split (contractions, elisions, hyphen clitics and policy, abbreviations,
  a character segmenter for unspaced scripts); word F1 on the test split: AnCora 99.6, French GSD 98.3, German GSD 99.2, Japanese GSD 95.3.
- Parsers (ud-parser.js, the English recipe, UniMorph lexicon where one exists), no punct, test split / PUD: Spanish AnCora UAS 88.7 / 87.6,
  French GSD 89.0 / 89.8, German GSD 80.4 / 80.8, Japanese GSD 90.0 / 89.4 (gold words). Shipped pruned |w|>=1 in janus priors.
- Claims (grammar-ud.js): the English builder's UD reading with each language's closed classes declared (grammar-packs.js); keys glossed from
  English Wiktionary (wikt-gloss.js over the slim dictionary, wikt-slim.js), so a Spanish source meets an English claim.
- Matcher, found on these pairs: a one-character word in a logographic script is a word; a bracketed alias is another name ("(JRO)");
  an appositive is not part of a name (also in grammar-en: held-out 215, 217); a proper noun is its own lemma (Jan, not January); with one
  verb on both sides a transfer frame only adds a reversal (fresh 408, "named for", broke once every verb had a definition).
- other: 52.9% (all typed gaps) → 100.0%, false-accept 0%, contradictions 0 → 6 of 8; held-out 70.0 → 80.0%, contradictions 6 → 7 of 10
  (223, 224, 215, 217); main 76.7, cf 78.6, fresh 87.5, relations 81.8, filing 99.2 unchanged. Left: 310 (extinct vs "endormi", glossed
  asleep: the slim dictionary keeps no antonym lists), 314 ("mainly in the roots" vs "the leaves": the verdict's one-place reading, as in
  English 213). A fresh, independently labelled multilingual set is the measure that counts.

## Run 9 (2026-10-21): fresh multilingual set (fresh-ml.json), PRE-REGISTERED — bars written before the pairs were seen
Source: the intros of 8 Wikipedia pages none of the earlier sets touch (es: Lago Titicaca, Cotopaxi; fr: Mont Blanc, Loire; de: Bodensee,
Zugspitze; ja: 富士山, 琵琶湖), fetched 2026-10-21 with revision ids (fresh-ml.sources.json). Pairs written and labelled by a separate agent
from those sentences alone (no code, no other sets, no results): 4 × 12 same-language and 4 × 4 English-claim cross-language pairs.
Bars, for the product arm (grammar-ud: English by grammar-en, the rest by grammar-ud, glossed from the slim Wiktionary, relation definitions on):
 F1 coverage: every pair read (no typed gap).
 F2 false-accept at most 10%.
 F3 at least half the contradictions named (C, not merely T).
 F4 accuracy at least the wording judge's, with fewer false accepts.
Reported per language and same- vs cross-language; every failure assigned to a layer as in MEANING-FAILURES.md. No code changes between
committing the set and the first run; any later fix is post hoc and reported as such.
Label audit, before any run (the pairs' sentences checked against their sources; labels read against the sentence alone): 663 relabelled
C → T ("Climbing Mount Fuji is popular in winter" against "夏季シーズンには富士登山が盛んである": summer popularity neither states nor rules
out winter). Final counts: 64 pairs, 32 E, 23 C, 9 T. Committed before any arm ran.
RESULT (first run, code as of 3c4ae889, no changes since the set was committed):
 product arm (grammar-ud): accuracy 46.9%, false-accept 9.4% (3 of 32), false-reject 96.9% (31 of 32 E missed), contradictions 4 of 23,
 no typed gaps. Wording judge: 70.3%, false-accept 12.5%, contradictions 1 of 23. Same-language 45.8%, cross-language 50.0%; es 41.7,
 fr 41.7, de 41.7, ja 58.3 (each of 12). F1 PASS, F2 PASS (9.4%), F3 FAIL (17%), F4 FAIL.
 The "other" set's 100% (run 8) did not hold on unseen pages: run 8 was fitted to its pairs.
 50 failures by layer: tokens/sentences 4, word senses 5, attachment 3, claim building 8, figures 7, referents 10 (7 of them a pronoun or
 dropped subject the page supplies), relations 11, verdict 2. False accepts: 626 and 642 (the claim's distinguishing phrase was dropped by
 the parse, the rest matched), 602 (antonym modifiers linked: "más bajo" / "más alto").

## Run 10 (2026-10-21): no support for a claim not read whole (post hoc on fresh-ml: these are the three false accepts run 9 found)
- Coverage (claim-coverage.js): each grammar reports the claim sentence's content words (nouns, names, adjectives) that no claim read; the
  verdict never says supported while any are left. Discourse openers ("In addition, …") count as read, set aside on purpose.
- Modifier phrases and coordinated words of an end are carried as its sub-ends (nmods: "an agreement WITH GSK", "a Collaboration AND …
  Agreement", "Groq, Inc."); a claim is met only when each meets something the source says. One claim per coordinated object, as per subject.
- Ends whose modifiers are a declared opposite pair are two beings ("the lowest navigable lake" / "the highest"); the check reads every declared
  pair (the one-partner maps had "short" → "long", never "tall").
- Figures mark every word they bind as read ("88 Earth days").
fresh-ml (post hoc): 46.9 → 51.6%, false-accept 9.4% → 0% (602, 626, 642 now T), contradictions 4 of 23. Costs: filing 99.2 → 96.9% (eo-029,
eo-030, eo-034: fragments ending in a dangling "an exclusive" no claim reads), fresh 87.5 → 83.3% (404: "Mercury orbits the Sun every 88
Earth days" mis-tagged, so "Sun" is read by nothing). main 76.7, cf 78.6, held-out 80.0, other 100, relations 81.8 unchanged; false accepts
are now 0% on every set but main (5.6%) and held-out (7.1%).
