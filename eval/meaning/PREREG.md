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

## Run 11 (2026-10-21): the mechanical bugs fresh-ml found (post hoc on fresh-ml)
- French elisions match a curly apostrophe ("L’influence"); "pas", "plus", "jamais" … negate only beside "ne" ("plus d'un cinquième").
- Figures: area units in every pack and in English (km², km2, m², hectare); a thousands mark written as a space ("1 006", "4 807,47",
  "117 000"); a year said with its unit is a date (1936年), a small number with it a duration.
- Japanese ではない: a negator fixed under the copula negates.
- Glossary: a word in another language reads its gloss as translations (the first word of each comma item: "relier" → connect, link, join,
  relate; "cuello" → neck, not "part"), all carried as alternative keys that the matcher meets; a sense tagged reflexive holds only when the
  verb has its reflexive pronoun ("verläuft" → run; "sich verlaufen" → get lost).
Each fix takes effect on its pair (609, 611, 614, 616, 619, 620, 621, 630, 631, 645, 653, 658). No verdict changes on any set: every one of
those pairs is also held by another layer — referents (a pronoun or dropped subject, an alias by participle: 609, 611, 620, 653, 658), word
senses ("s'écouler" → sell, 619; a German compound, 645), a fraction as a figure (621), relations (remonter / extend, 631), parse (657).
All sets: main 76.7, cf 78.6, held-out 80.0, other 100, fresh 83.3, relations 81.8, fresh-ml 51.6 (FA 0%), filing 96.9 — unchanged.

## Run 12 (2026-10-21): referents from the page, and namings as identity (post hoc on fresh-ml)
- A source sentence is read with its page (title and the sentences before it, from <set>.sources.json): a third-person pronoun subject takes
  the nearest earlier sentence's subject ("Elle se jette …", "Er besteht aus …"); in a language that drops subjects (Spanish, Japanese), a
  subject left out takes the page's own subject, its title ("Se encuentra en los Andes", Japanese sentences carrying their topic). Following
  the chain of earlier subjects for a dropped subject was tried first and resolved 653 to "Fuji worship"; the title is what such a sentence
  is about.
- Naming verbs (declared per language: llamar, denominar, appeler, heißen, 呼ぶ, call, name; conocer, connaître, bezeichnen, know only with
  their "as" word) and their participles, including those the tagger reads as adjectives (AnCora "denominado", "conocido"), give "be"
  claims marked alias; an alias substitutes both ways in the source (held-out 214: "also known as the Calvin cycle").
- A claim's oblique meets a source oblique's sub-ends too ("… d'Europe occidentale et de l'Union européenne").
fresh-ml (post hoc): 51.6 → 57.8%, false-accept 0%, contradictions 4 of 23 (609, 618, 620, 653 now supported). held-out 80.0 → 83.3% (214).
main 76.7, cf 78.6, other 100, fresh 83.3, relations 81.8, filing 96.9 unchanged.

## Run 13 (2026-10-22): atoms, coreference and synonyms — PRE-REGISTERED (written before the labeller or any system saw the sentences)
Set: eval/meaning/atoms/sentences.json, 100 sentences none of the earlier sets touch, each with its page and the sentences before it: English
Wikipedia 21 (Lake Baikal, Amazon River), ALLETE 2024 10-K 20 (Item 1 Overview), Spanish 13 (Aconcagua, Río de la Plata, Lago Cocibolca),
French 16 (Léman, Massif central), German 15 (Donau, Matterhorn), Japanese 15 (阿蘇山, 信濃川); sources with revision ids in sources.json.
Gold by an independent labeller (sentences and GUIDE.md only, no code, no results): atoms with spans, every mention's entity (names, aliases,
descriptions, pronouns, dropped subjects), and 100 synonym / near-miss word pairs. The atomizer and the coreference resolver are built
without reading gold.json; their outputs are scored by a separate judge agent (blind to which list is the system's for precision, per atom
"does the sentence state this?"; for recall, per gold atom "is it among these?").
Bars:
 A1 atom precision ≥ 85% (system atoms the judge finds stated);  A2 atom recall ≥ 70% (gold atoms the system has).
 C1 coreference of pronouns, dropped subjects and descriptions to an earlier entity: ≥ 90% resolved to the gold entity (target 100%);
 C2 names and aliases: ≥ 95% to the gold entity.
 S1 synonym judgements: ≥ 90% right; S2 near misses judged the same ≤ 5% (an antonym judged a synonym is the worst error).
Reported per language and per source; every miss listed.
Wiktionary (slim pack 2026-10-01, measured before the run, not a bar): an English key for the 500 most frequent content lemmas of each UD
test split — en 98.2%, es 98.0%, fr 98.4%, de 97.0%, ja 88.2%; synonym / antonym lists absent from the slim build (asked for); translation
tables present (129,603 English entries), indexed in reverse by cli/wikt-translations.mjs.
RESULT (first run, the system as committed in c9bf70c7, its output written before gold.json existed; gold: 202 entities, 399 mentions,
499 atoms, 100 word pairs, by an independent labeller; atoms judged by four separate judge agents, precision blind to gold):
 A1 atom precision 52.9% (435 of 822)   FAIL   — de 69, es 67, fr 61, en Wikipedia 51, filing 44, ja 38
 A2 atom recall    35.3% (176 of 499)   FAIL   — en Wikipedia 50, es 39, fr 36, de 35, ja 25, filing 23
 C1 pronouns, descriptions, dropped subjects 35.3% (42 of 119)   FAIL   — pronouns 25/59, descriptions 9/46, dropped 8/14
 C2 names and aliases 86.1% (198 of 230)   FAIL   — names 193/207, aliases 5/23
 S1 synonym judgements 79% (79 of 100)   FAIL   — synonyms found 31/50 (ja 55%: no shared key); en 85, es 90, fr 80, de 85
 S2 near misses judged the same 4% (2 of 50)   PASS   — fleuve ~ rivière, puy ~ montagne; no antonym judged a synonym
 Causes read from the misses (post hoc): a definite description goes to the most recent entity of that head, not the page's own ("the lake" →
 "the North American Great Lakes"); a possessive resolves to the phrase it sits in; pronouns pick abstract descriptions ("Il" → "Sa
 formation"); relative pronouns are not mentions; bracketed and "X o Y" aliases are not linked; names over-merge on a shared token ("Amazon
 basin" with "Amazon River"); "X de los Y" names are not read as names. Wrong atoms: adjectives 77, figures 76, modifier phrases 72,
 relations 59, obliques 52, kinds 40, names 11 — mostly a wrong or fragmentary argument (the referent behind it). Synonyms: no synonym lists
 in the slim build (asked for); Japanese and verbs (situate ~ locate, formar ~ constituir) have no shared key.
 The atomizer is not yet fit to build on. Any fix from here is post hoc on this set; the next measure is a second held-out set.
Run 13b (post hoc, synonyms only): the v2 English Wiktionary pack (local, unpublished: wiktionary-slim-2026-10-01-v2.pack, sha256 3ca48e8a…,
per-sense syn / ant / hyper / hypo and per-entry rel lists) read by wikt-slim.js; the synonym judgement reads listed synonyms first, vetoes
listed antonyms, then shared keys, then — for words of other languages — keys that are themselves English synonyms (listed, or translated
alike in at least half the pivot languages). S1 79 → 83% (synonyms found 31 → 36 of 50; es 100, en 90, fr 85, de 85, ja 55); S2 4 → 6% (3 of
50, over the bar: puy ~ montagne and Meer ~ See are listed by Wiktionary, fleuve ~ rivière share the key "river"). A one-step English link
through 2 of 8 languages let Berg ~ Erhebung through; requiring half the languages refused it. Japanese misses have no shared or synonymous
key (標高 / 海抜, 呼称 / 名称): the Japanese entries carry no lists.

## Run 13c (2026-10-22): fixes from run 13's misses — POST HOC on the run-13 set
- Coreference (coref.js): pronouns take a named entity or the page (the current clause's earlier subject, else the most recent earlier
  subject that names a known entity), never a description the text only introduced, nor the phrase a possessive sits in; number agrees;
  relative pronouns are mentions (the noun their clause modifies, or a copula's subject); definite descriptions prefer the page's entity,
  then a named entity of that kind (kinds from copulas, from names headed by a common noun, and from dictionary synonyms); negated and
  "other" descriptions are never antecedents; aliases from appositives, brackets after a singular name, naming verbs (the object when
  active, the subject when passive or reflexive) and participles; names link to the entity holding all their name words with the fewest
  others, never across two common-noun heads; possessors are their own mentions; a dropped subject before a copula is reported at it.
  Run-13 set, name-based (as pre-registered): C1 35.3 → 56.3%, C2 86.1 → 89.1%. Cluster-based (the system entity's defining name against
  every text the gold groups under its entity, so another name for the same entity is not a miss): C1 65.5 → 81.5%, C2 94.8 → 93.5%.
- Atoms (atoms.js): no date attributes (the event's oblique states them), no bracketed equivalents, no figure on a pronoun or fragment;
  adjectives only from the head noun's own modifiers and never on a name; no kind or name atom from a pronoun, wh-word, letter or number.
  822 → 655 atoms; not re-judged on run 13.
- Synonyms (wikt-gloss.js): translations read by part of speech (a short noun item's head is last, a long one's translation first; a verb
  item skips adverbs and "for … to V" frames); a Japanese する verb reads its noun; a noun key and a verb key of one derivation meet; keys
  meet only through a word's first key. S1 79 → 85%, S2 4 → 8% (puy ~ montagne, Meer ~ See listed by Wiktionary; fleuve ~ rivière and
  lac ~ étang share "river" / "lake").
The system is frozen here for run 14.

## Run 14 (2026-10-22): atoms, coreference and synonyms on a SECOND held-out set — PRE-REGISTERED (written before the labeller saw it)
Set: eval/meaning/atoms14/sentences.json, 100 sentences from pages no earlier set touched: English Wikipedia 21 (Lake Victoria, Mississippi
River), Utah Medical Products 10-K 20 (ITEM 1 – BUSINESS), Spanish 13 (Río Orinoco, Chimborazo, Lago de Maracaibo, Río Magdalena, Lago de
Atitlán), French 16 (Lac d'Annecy, Lac du Bourget, Garonne), German 15 (Elbe, Großglockner, Weser), Japanese 15 (利根川, 浅間山, 富士川, 八ヶ岳,
霞ヶ浦, 十和田湖); sources with revision ids in sources.json. Same guide (atoms/GUIDE.md), a new independent labeller, the same judging.
The system is frozen at b36991d7 (run 13c); the v2 Wiktionary pack (local) is the dictionary.
Bars, as run 13: A1 ≥ 85%, A2 ≥ 70%, C1 ≥ 90% (target 100%), C2 ≥ 95%, S1 ≥ 90%, S2 ≤ 5%.
Coreference is scored both ways; the bars apply to the CLUSTER measure (the system entity's defining name against every text the gold groups
under the gold entity), declared here before the run because the name measure fails a correct link whose entity is named differently ("a
law" for "the 2040 law"); the name measure is reported beside it.
RESULT (system frozen at b36991d7, its output written before the gold existed; gold by two independent labellers, A: en, filing, es; B: fr,
de, ja — 259 entities, 468 mentions, 546 atoms, 100 word pairs; atoms judged by four judge agents, precision blind to the gold):
 A1 atom precision 69.0% (489 of 709)   FAIL   — ja 81, en 72, fr 72, es 68, filing 64, de 62   (run 13: 52.9%)
 A2 atom recall    42.3% (231 of 546)   FAIL   — en 50, de 46, ja 44, es 42, filing 39, fr 34   (run 13: 35.3%)
 C1 pronouns, descriptions, dropped subjects, by cluster 73.6% (92 of 125)   FAIL   (run 13 system by cluster: 65.5%); by name 58.4%
 C2 names and aliases, by cluster 92.2% (259 of 281)   FAIL   (run 13 system by cluster: 94.8%); by name 86.8%
 S1 synonym judgements 83% (83 of 100)   FAIL   — synonyms found 39/50; es 95, de 90, en 85, fr 80, ja 65   (run 13: 79%)
 S2 near misses judged the same 12% (6 of 50)   FAIL   (run 13: 4%)
 The run-13 fixes carried to unseen text for atoms (+16 points precision, +7 recall) and for pronoun/description/dropped coreference
 (+8 points), not for names (−2.6) and not for near misses (the one-step English link and the shared-key rule let more related words through).
 No bar is met; the atomizer is still not fit to build on, and the synonym near-miss rate is now the worst number.

## Run 14b (2026-10-22): fixes from run 14's misses — POST HOC on runs 13 and 14
- Atoms: an oblique's coordinated words repeat its relation (lists of places); every alias mention is a named atom; a name joined to a common
  noun through "de" / "of" ("la ciudad de Barranquilla") gives its kind. Run 14 re-judged by four new judges: precision 69.0 → 67.2%,
  recall 42.3 → 46.9% (783 atoms).
- Names: a lowercase label adjective is no part of a name ("niederdeutsch Elv"); a kana reading in brackets after a name is an alias; a
  Japanese place name inside a compound chain is a mention of its own; the bracket rule precedes the appositive rule and an appositive alias
  sits within four words of its head; an abbreviation the dictionary expands ("U.S.") links to its expansion's entity; an alias adds its name
  only to an entity of its own kind. Dropped subjects: any finite clause without a subject in a language that drops them (not only main
  clauses; the impersonal reflexive included); a possessive in a sentence whose main subject is dropped takes it.
  Cluster measure, run 13: C1 81.5 → 83.2%, C2 93.5%; run 14: C1 73.6 → 79.2%, C2 92.2 → 95.0%.
- Synonyms: a word's first key meets any of the other's, vetoed when the dictionary lists the two first keys as antonyms, hypernym or hyponym;
  two first glosses that are different phrases do not meet; the one-step English link compares the first three keys and keeps listed
  synonyms. Run 13: S1 85 → 82%, S2 8 → 4%; run 14: S1 83 → 81%, S2 12 → 6%. (Stricter rules were measured and dropped: first-to-first keys
  76% / 79%, symmetric top-two 72% / 74%.)
The system is frozen here for run 15.

## Run 15 (2026-10-22): a THIRD held-out set — PRE-REGISTERED (written before the labellers saw it)
Set: eval/meaning/atoms15/sentences.json, 100 sentences from pages no earlier set touched: English Wikipedia 21 (Lake Superior, Columbia
River), Sterling Infrastructure 10-K 20 (Item 1. Business), Spanish 13 (Río Paraná, Popocatépetl, Lago Nahuel Huapi, Río Bravo), French 16
(Lac de Neuchâtel, Dordogne, Mont Ventoux), German 15 (Neckar, Watzmann, Chiemsee), Japanese 15 (最上川, 桜島, 諏訪湖, 四万十川, 支笏湖, 大雪山);
sources with revision ids in sources.json. Same guide, two new independent labellers (A: en, filing, es; B: fr, de, ja), four judge agents.
The system is frozen at 0e20e8f0 (run 14b). Bars as runs 13–14: A1 ≥ 85%, A2 ≥ 70%, C1 ≥ 90%, C2 ≥ 95% (cluster measure), S1 ≥ 90%, S2 ≤ 5%.
RESULT (system frozen at 0e20e8f0; output written before the gold; gold by two new independent labellers — 244 entities, 417 mentions,
552 atoms, 100 pairs; atoms judged by four judge agents; judge 3 recorded its verdicts by script lists rather than atom by atom):
 A1 atom precision 58.7% (399 of 680)   FAIL   — filing 75, en 68, ja 60, de 58, fr 49, es 39   (run 14 frozen: 69.0%)
 A2 atom recall    41.3% (228 of 552)   FAIL   — filing 52, fr 42, en 39, ja 39, es 37, de 33   (run 14 frozen: 42.3%)
 C1 by cluster 69.2% (72 of 104)   FAIL   (run 14 frozen: 73.6%); by name 55.8%
 C2 by cluster 86.1% (149 of 173)  FAIL   (run 14 frozen: 92.2%); by name 79.8%
 S1 78% (synonyms found 33/50; es 100, en 85, fr 85, ja 65, de 55)   FAIL   (run 14 frozen: 83%)
 S2 10% (5 of 50)   FAIL   (run 14 frozen: 12%)
 The round-14b fixes, which raised run 14 post hoc (coreference 79.2 / 95.0 by cluster, synonyms 81% / 6%), did NOT carry to a third
 unseen set: every measure is at or below the run-14 frozen result. Rule-by-rule fixing from seen misses has stopped generalizing; the
 numbers now move with the set more than with the fixes.
