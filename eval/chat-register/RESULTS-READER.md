# The reader's two chat mechanics: names without capitals (3) and which language a message is in (5)

EXPLORATORY, 2026-11-23/24. Code: khora branch `reader-chat-register` on top of `c7e956b`; janus priors `fe2c3c8` (`KHORA_PRIORS_DIR=~/Documents/janus/priors`, `KHORA_NO_PHAROS_GATE=1` for the evals). No number here is a gate; every one is a descriptive count with its split. Nothing is pushed.
The rule that shaped both: the man in the box (`native/docs/THE-MAN-IN-THE-BOX.md`). A dial is a measured percentile or a declared value with its reason, never a word list; a gate is measured on gold for the languages it will meet, not only on the chat that suggested it.

## 3. Names typed without capitals: `native/adapters/text/recase.mjs`

What it does: before the English parse, a lowercase word gets its capital from (a) the NOTEBOOK (the writer, or the thread via `known`, already capitalised it somewhere that is not a sentence start), (b) the treebank's own casing counted from UD English-EWT train (`native/priors-shipped/truecase-eng.json`, built by `native/scripts/build-truecase-eng.mjs`), (c) a Wikidata given name that the treebank calls a proper noun at least 80% of the time. A given name only Wikidata knows is NOMINATED, not recased (`row.nameCandidate`); a word the writer cased is never touched; every change is marked on its row (`row.recased = { typed, by }`).

| measurement (split) | result |
|---|---|
| EWT dev / test, whole message lowercased (held out from the casing table; Wikidata independent of EWT): non-initial proper nouns coming back with exactly their casing | recall 0.32 / 0.30, precision 0.75 / 0.71 (0.87 / 0.86 counting any proper noun of the sentence) |
| the same with every nominated name taken as a name | recall 0.40 / 0.37 (nominations right at that place 58% / 51%) |
| EWT as written (the text already cased), false recases per 1000 words, after the casing gate below | 0.36 / 0.24 (was 1.0 / 0.5 before it; what remains is sentences EWT itself wrote all in lowercase) |
| invariance on the developer's 56 asks (`invariance.mjs` and its json live in the chat owner's local commit `ca31ac9`, not in this one; the asks are mine to write, so this is the reader's stability, not a claim about real asks): proper nouns still proper nouns when the message is lowercased | base 29.5% -> 45.5% (nopunct 1.00, typo variant 0.827, was 0.846 for a measurement reason) |
| real chat (`recase-chat.mjs`, no gold): words recased per 1000 in lowercase-typed SMS / CoSEM / IRC | 1.4 / 1.7 / 2.6 after the casing gate (14 / 4 / 3.4 before it; 38 / 11 / 9 with unattested given names ON, mostly Hindi in Roman letters, SMS spellings and technical words, which is why they are OFF) |

**Casing gate (found by a peer, 2026-11-24):** the two shelves apply only to text typed WITHOUT capitals. Any capital that is not the pronoun "I" in the message and they stay silent; the notebook (the text's own evidence) always applies. Before the gate, formal prose was recased through the reader ("opera" -> "Opera" in "The Magic Flute is an opera ... by Wolfgang Amadeus Mozart", parsed as a proper noun, which broke a hunt test; 9 words on one Aristotle article). Recall and precision on the lowercased EWT and the invariance numbers did not move (0.315 / 0.300, 0.746 / 0.711, lowercase proper-noun retention 45.5%). The cost: "Hi john, how r u" (a phone capitalised the first word) keeps "john" lowercase.

**Noun-phrase guard on the notebook (found by a peer, 2026-11-24):** "You are Captain Salt, a weathered pirate captain." had its second, lowercase "captain" recased from the notebook ("Captain" was capitalised before a name), so the persona lost its appositive. The notebook now never copies a capital onto a lowercase word inside a noun phrase: walking back over words that can modify (adjective, noun, numeral, a word the prior does not know), a determiner before it means the word is the phrase's head; a verb, preposition, conjunction, pronoun, interjection or punctuation ends the phrase first ("loves natasha", "dear natasha", "to natasha" still recase). Applied to the shelves as well it cost 4 to 5 points of held-out recall (0.269 / 0.250) for no false recase it prevented, so it is the notebook's only. Held-out numbers unchanged (0.315 / 0.300, 0.746 / 0.711). Also fixed: `markRecased` put the mark on the first row wearing the cased form (the writer's own "Captain") instead of the changed row. Cost: "doctor natasha" keeps natasha lowercase when only the notebook knows her.

NOT claimed: that these are names. The unattested-name switch is off by default because an English giver cannot tell a Hindi word or an SMS spelling from a name without knowing the language (that is item 5). The treebank-casing shelf still turns a Hindi word EWT tags PROPN into a name ("hai" -> "Hai") if it is handed Hindi; `readerFor` never hands it any.

## 5. Which language is this message in: `native/adapters/text/language-gate.mjs`, `reading.js::readerFor`

`readerFor(text, { thread, known }) -> { rows, language, evidence, parseBy?, gap }`, per message. `gap` is `null`, `{ gap: "no_codec", language, ... }` (the language is known, no codec reads it: Russian, Italian, Polish...) or `{ gap: "no_language", language: null, evidence, detail, candidate? }` (the language could not be established; `candidate` is the identifier's weak guess, for the words of the reply, never an assertion). Never English by default (nexus rule 8). Also fixed: a false "no codec" for languages janus holds (`rowsOfFor` looked in the wrong priors home).

How a non-English LATIN answer stands (script-decided and thread answers need none of this): English must lose a head-to-head DUEL against the candidate (the identifier re-asked with only the two); the share of the message's words that the CANDIDATE's own POS prior knows must be at least `VOCABULARY_FLOOR` 0.5; the margin over the runner-up at least `LATIN_MARGIN_FLOOR` 11; at least two words. The two floors are the 10th percentile of the identifier's CORRECT answers on UD PUD sentences of 3..8 words (n = 386, Latin script; `language-gate-ud.mjs` prints them). Where the identifier did not decide, English needs a strict majority of the known words and one anchor word the English prior has met 10 times. Names are set aside there: a given name the giver knows, or a word the writer capitalised in mid-sentence that the English prior does not know (found by a peer session: "Madame Defarge wrote a letter." had been left unread, two unknown names against two known words). That rule costs four foreign sentences read as English ("Quanto ha pagato l'IBM per Lotus?", "John di Gaunt morì nel 1399.", a Danish one) out of 3470 gold sentences, against English with an unfamiliar surname now being read.

**History of the design, kept because it is a finding:** the first gate was tuned on real chat (SMS: ~6% confident wrong labels). A support rule of two function-word hits cut chat errors to 1.8% and looked good, but held out on UD PUD it threw away a third of short Polish, Czech, Finnish and Turkish sentences (their function words are not the signal) and let the English-word witness call French and Turkish "English". It was replaced by the duel plus the two measured floors. Without the gold run that over-fit would have shipped.

### Gold: UD PUD (the floors are read from it) and a second treebank per language (VAL, held out from the floors). N = 40 per language and length class, hash-ordered. "right" = read as that language, or a gap that names it; "unnamed" = a gap with no language; "wrong" = read or named as another language. raw = the identifier alone.

| set | n | gate right | gate unnamed | gate wrong | raw right | raw unnamed | raw wrong |
|---|---|---|---|---|---|---|---|
| PUD short (3..8 words) | 603 | 458 (76.0%) | 140 (23.2%) | 5 (0.8%) | 528 | 69 | 6 |
| PUD any length | 640 | 594 (92.8%) | 44 (6.9%) | 2 (0.3%) | 625 | 10 | 5 |
| VAL short | 1227 | 765 (62.3%) | 447 (36.4%) | 15 (1.2%) | 939 | 268 | 20 |
| VAL any length | 1400 | 1158 (82.7%) | 230 (16.4%) | 12 (0.9%) | 1268 | 120 | 12 |

English gold: PUD 40/40 short and any read as English; EWT dev 37/40 short and any (the other 3 are gaps, none wrong; raw identifier alone: 31/40 short, so the gate rescues English the identifier does not decide). VAL includes treebanks the identifier cannot read at all (UD French-FTB's text is blanked to underscores, 0/80; Croatian vs Serbian, Norwegian vs Danish are confusions the identifier has on its own).

**The cost, stated:** the gate unnames 12 to 15 more points of SHORT foreign text than the raw identifier (they become candidates, not wrong), and removes about a third of its confident errors (a quarter on the second treebank, after the name rule below). A caller that wants the raw guess has `gap.candidate`. The cost shrinks with length (PUD any: 5 points).

### Real chat (`language-gate.mjs`, 2500 per source, hash-ordered, no language gold; non-English outcomes read by me)

| | SMS (NUS) | CoSEM | IRC (Ubuntu/Kubuntu) |
|---|---|---|---|
| English via the identifier / via known words | 46.7% / 13.4% | 40.0% / 12.6% | 76.5% / 8.0% |
| gap, language undetected | 33.7% | 29.1% | 13.6% |
| nothing to read (punctuation, one letter) | 5.6% | 17.9% | 1.8% |
| confident non-English labels | 14 (0.56%): "Wat doin"-style SMS spellings as Dutch 11 | 7 | 4, all correct (cmn, ces, spa, tur) |

Before the duel and floors: SMS 6% confident non-English labels, most of them romanised Hindi, Bengali and Tamil read as Wolof, Maltese, Indonesian, Dutch (and so read with the wrong codec). Hindi in Roman letters ("kal milte hai yaar") is now a `no_language` gap with no rows; before it was read as English.

**Open, honestly:** romanised Hindi, Bengali and Tamil are languages with NO prior, so the closed-set identifier can only reject them (vocabulary check), never name them; naming them needs a Latin-script class built from data. SMS English spelled "wat", "der", "bak frm" is English the reader does not yet know to be English (item 4, register normalisation); "Wat doin" is still read as Dutch. "JY" (a Singlish name) reads as Afrikaans.

Reproduce: `node eval/chat-register/language-gate-ud.mjs 40`, `node eval/chat-register/language-gate.mjs`, `node eval/chat-register/recase-check.mjs`, `node eval/chat-register/recase-chat.mjs`, `node eval/chat-register/invariance.mjs`; tests `node --test native/tests/chat-register.test.mjs`.
