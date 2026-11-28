# PREREG: does the fold read what its own page says it reads? (exploratory, small, one labeller)
Written before any arm is run. Stamp below is sha256 of this file, items.json, gold/gold.json, score.mjs, arm-fold.mjs.

**Claim under test** (from the visual "How The Fold Reads"): for a sentence, the fold recovers (a) whether the main predicate is negated, (b) statement or question, (c) the agent (kartṛ) and (d) the patient (karman) of the main predicate, and where it cannot it abstains rather than answer wrongly.

**Items**: 48 sentences (40 English, 8 French) in 9 categories, written by the session's model (one labeller, an LLM: the gold shares an origin with the LLM arm and favours it; stated, not corrected). Gold per item: negated (bool, of the MAIN predicate only), form (statement|question), agent and patient as accept-lists of lowercase forms (lemma or surface), null when the sentence does not state one.

**Arms** (one run each, no tuning after seeing scores):
1. FOLD: khora `shapeOf` (the-fold/pharos-roles.mjs on PR #117: karaka-total, negation-read, question-grammar) with the DECLARED language. root = the row with deprel root. negated = root is in polarity.negated. form = text-question form ("statement" -> statement, anything else -> question); no question entry -> ABSTAIN. agent = lemma of the first row with karaka kartṛ whose head is the root; patient = same for karman; none -> null. A typed gap from shapeOf -> ABSTAIN on all four.
2. POSITION (the strings/order twin, same parser tags): root = first VERB row (none -> ABSTAIN roles). agent = nearest NOUN/PROPN/PRON before it, patient = nearest after. negated = any token whose lowercase form is in a fixed list (not, n't, never, no, nobody, nothing, ne, pas, jamais, personne). form = text ends with "?".
3. LLM: one fresh subagent on the smallest available model, shown items.json only (never the gold), one pass, answers the same four fields.

**Score**: per field, correct | wrong | abstain. Reported: counts per arm per field, and per category. No threshold. FALSIFIERS: (F1) the fold is not better than POSITION on agent+patient -> the kāraka layer adds nothing over word order on this set. (F2) the fold's WRONG count is not lower than the LLM's -> "abstains instead of being wrong" buys nothing here. (F3) the fold answers wrongly more often than it abstains on its misses -> it does not abstain, it errs. Whatever happens is reported, including a loss.
**Not measured**: any real corpus, more than one labeller, any language but English and French, long text, the decide phase, speed.
