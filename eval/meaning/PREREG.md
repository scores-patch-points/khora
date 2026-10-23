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

## Run 16a (2026-10-22): LEARNED coreference and atom selection, cross-validated over runs 13–15 (no new gold)
Rule patching stopped. Two learned models, each an averaged perceptron (no frontier model, nothing remote), trained on the 300 gold-labelled
sentences of runs 13–15 and measured by three-fold cross-validation: train on two sets, test on the third.
- Coreference (native/organs/coref-learned.js; eval/meaning/atoms/learn-coref.mjs). coref.js still finds the mentions and their cues; a
  ranker decides what each refers to: for every mention in page order it scores each entity built so far, the page and "new" by the pair's
  features (kinds, name and head overlap, dictionary synonymy of heads, number, sentence distance, recency rank, subjecthood, entity size).
  A detector (same learner) adds parse noun phrases and subjectless predicates the rules did not propose. Five shuffles, weights averaged
  (one shuffle's luck moved C1 ±3 points). The ranker does as well WITHOUT the rules' own choice as a feature (set 15: C1 75.0 vs 76.0%),
  so the frozen model omits it: the decision is the learned weights'. A dropped subject's "at" is now its whole predicate (aux and copula
  with the verb), as the labellers write it.
  Held out, by cluster (frozen rule system on that set when first measured → learned):
    set 13: C1 65.5 → 84.0%, C2 94.8 → 98.3%
    set 14: C1 73.6 → 83.2%, C2 92.2 → 96.8%
    set 15: C1 69.2 → 75.0%, C2 86.1 → 91.3%   (the only fold whose rules were never tuned on it: the cleanest comparison)
  Remaining misses on set 15: 31 of 86 are mentions never proposed (mostly parse errors: "km" as a subject, a Japanese predicate parsed as a
  number), most others entity naming (an alias kept apart from its page, "the Company" as a new entity).
- Atom selection (native/organs/atom-select.js; learn-select.mjs): keep or drop each atom by its shape (kind, argument types, origin,
  span), trained on the precision judges' verdicts, estimated on the held-out set's own judges. NEGATIVE: precision rises only as recall
  falls (set 15: keep 90% → A1 58.7 → 62.3, A2 41.3 → 40.2; keep 70% → 65.1 / 34.2); with the keep share chosen inside the training folds
  the selector keeps everything on sets 13 and 15 and drops 14 of 709 atoms on set 14 (A1 +0.9, A2 −0.4). The judges' "wrong" atoms are wrong
  in content (wrong entity or relation), which an atom's shape does not show. The frozen system keeps every atom.

## Run 16 (2026-10-22): a FOURTH held-out set — PRE-REGISTERED (written before the labellers saw it)
Set: eval/meaning/atoms16/sentences.json, 100 sentences from pages no earlier set touched: English Wikipedia 21 (Lake Tahoe, Colorado
River), AnaptysBio 10-K 20 (Item 1. Business), Spanish 13 (Lago Titicaca, Ebro, Citlaltépetl), French 16 (Loire, Mont Blanc, Lac de
Serre-Ponçon), German 15 (Bodensee, Zugspitze, Mosel), Japanese 15 (琵琶湖, 御嶽山, 猪苗代湖, 北上川, 槍ヶ岳; 木曽川 too short for a sentence);
sources with revision ids in sources.json. Same guide, two new independent labellers (A: en, filing, es; B: fr, de, ja), four judge agents.
System: coreference by the learned ranker trained on all of runs 13–15 (eval/meaning/atoms/coref-ranker.json, config as run 16a), atoms by
atoms.js over its entities, every atom kept, synonyms unchanged since run 15. Bars as runs 13–15: A1 ≥ 85%, A2 ≥ 70%, C1 ≥ 90%,
C2 ≥ 95% (cluster measure), S1 ≥ 90%, S2 ≤ 5%. Expected from run 16a (not a bar): C1 75–84%, C2 91–98%; atoms near run 15.
RESULT (system frozen at 01cc6f01; output written before the gold (4a5277f2); gold by two new independent labellers — 267 entities,
444 mentions, 540 atoms, 100 pairs; atoms judged by four judge agents, precision written before each judge opened the gold):
 A1 atom precision 73.8% (574 of 778)   FAIL   — es 78, en 76, filing 75, fr 75, de 75, ja 60   (run 15 frozen: 58.7%)
 A2 atom recall    49.8% (269 of 540)   FAIL   — en 60, de 57, filing 54, ja 45, es 43, fr 37   (run 15 frozen: 41.3%)
 C1 by cluster 74.1% (83 of 112)   FAIL   (run 15 frozen: 69.2%); by name 58.0%
 C2 by cluster 95.4% (229 of 240)  PASS   (run 15 frozen: 86.1%) — the first coreference bar any run has passed
 S1 83% (synonyms found 35/50; en 90, es 90, fr 85, de 85, ja 65)   FAIL   (run 15 frozen: 78%)
 S2 4% (2 of 50)   PASS   (run 15 frozen: 10%)
 Comparison on this set, not pre-registered: the current RULES alone (the run-14b rules, at as whole predicate) score C1 77.7%, C2 93.8%:
 the learned ranker is 3.6 points BELOW the rules on pronouns/descriptions/dropped subjects and 1.6 above on names. Learning held its
 cross-validated range on names (C2 91–98 → 95.4) and fell to the bottom of it on C1 (75–84 → 74.1); with 300 training sentences it does
 not yet beat the rules where the rules were already tuned. Synonyms are unchanged since run 15, so S1/S2 moved with the set, not a fix.
 Atom precision and recall rose on this set without a change to atoms.js beyond the entities it reads; part of that is the set (the filing
 and the en pages read more cleanly), and none of it is attributable to atom selection, which was not used.

## Run 17a (2026-10-22): a LEARNED atom producer, cross-validated over runs 13–16 (no new gold)
Atom recall was under half (run 16: 49.8%): atoms.js never produces about half the facts the gold states. The producer
(native/organs/atom-produce.js; eval/meaning/atoms/learn-produce.mjs) takes every phrase of the parse (a noun, name, pronoun or number with
its modifiers; a copula's noun stands for its subject) as a possible participant, every dependency path of one to four edges between two
of them as a possible fact (predicate: the verb, noun or adjective words on the path and the second participant's case word; "is_a" for a
copula), and an adjective on a phrase as a one-place fact. An averaged perceptron (five shuffles, weights averaged) scores each by its
path's shape and words; the kept ones join atoms.js's atoms, best first, one per set of arguments, none over arguments atoms.js already
relates. Labels and measure are MECHANICAL: proxy-recall.mjs counts a gold atom met when a system atom's arguments align with its arguments
(two of them for a fact over three or more; a one-place fact also needs a predicate word in common); the predicate of a relation is NOT
compared. Checked against the recall judges of runs 13–16 the proxy agrees on 67–74% of gold atoms and runs below them (judges 35–50%,
proxy 29–35%): the judges also accept a fact assembled from several partial atoms. The threshold is chosen inside the training folds.
  Held out, by the proxy (atoms.js alone → with the producer):
    set 13: recall 34.9 → 51.1%, precision 26.7 → 35.0%   (+483 atoms, 47% of them meet a gold atom)
    set 14: recall 33.5 → 51.3%, precision 28.4 → 35.8%   (+578, 46%)
    set 15: recall 34.4 → 50.2%, precision 32.4 → 37.9%   (+498, 45%)
    set 16: recall 29.4 → 47.2%, precision 22.9 → 29.3%   (+463, 40%)
  What the proxy cannot see: a produced atom's predicate is the path's words ("lake_straddl_border_between(Lake Tahoe, California)"), and
  a wrong path over the right participants counts as met. Japanese parses are often broken (a predicate split as "がり"), and their paths
  with them. The judges on a new set decide.

## Run 17 (2026-10-22): a FIFTH held-out set — PRE-REGISTERED (written before the labellers saw it)
Set: eval/meaning/atoms17/sentences.json, 100 sentences from pages no earlier set touched: English Wikipedia 21 (Crater Lake, Snake
River), Highwater Ethanol 10-K 20 (Item 1. Business), Spanish 13 (Guadalquivir, Teide, Lago Llanquihue), French 14 (Rhône, Puy de Dôme,
Lac de Gérardmer — all their sentences), German 15 (Ammersee, Brocken, Main), Japanese 17 (富士山, 石狩川, 洞爺湖, 天竜川, 立山, 摩周湖);
sources with revision ids in sources.json. Same guide, two new independent labellers (A: en, filing, es; B: fr, de, ja), four judge agents.
System: as run 16 (coreference eval/meaning/atoms/coref-ranker.json, unchanged) plus the atom producer trained on all of runs 13–16
(eval/meaning/atoms/atom-producer.json, threshold −0.5 from the inner folds). Bars as runs 13–16: A1 ≥ 85%, A2 ≥ 70%, C1 ≥ 90%,
C2 ≥ 95% (cluster measure), S1 ≥ 90%, S2 ≤ 5%. Also pre-registered: the judged recall of atoms.js's atoms alone (the same judges' verdicts
restricted to them), so the producer's share of A2 is measured, and the judged precision of the produced atoms alone.
Expected (not a bar): A2 up by 10–20 points from atoms.js alone; A1 down, as produced atoms are judged stated less often than atoms.js's.
RESULT (system frozen at 008c3b73; output written before the gold (6419edff); gold by two new independent labellers — 234 entities,
394 mentions, 514 atoms, 100 pairs; atoms judged by four judge agents, precision written before each judge opened the gold; the judges
were not told which atoms the producer made):
 A1 atom precision 65.2% (688 of 1056)   FAIL   — de 73, filing 67, en 66, fr 66, es 61, ja 49   (run 16: 73.8%)
      atoms.js's atoms 80.8% (515 of 637); the producer's 41.3% (173 of 419)
 A2 atom recall    59.3% (305 of 514)   FAIL   — fr 78, en 70, de 65, filing 63, es 56, ja 19   (run 16: 49.8%)
      found through an atoms.js atom 47.9% (246); found only through a produced atom 11.5% (59)
 C1 by cluster 81.9% (95 of 116)   FAIL   (run 16: 74.1%); coreference model unchanged since run 16
 C2 by cluster 96.9% (62 of 64)    PASS   — NOT comparable with run 16: these labellers tagged most first mentions of names "new", not
      "name", so C2 covers 64 mentions here against 240 (the guide does not say which a first-mentioned name is; it should)
 S1 77% (synonyms found 33/50)   FAIL   (run 16: 83%);  S2 12% (6 of 50)   FAIL   (run 16: 4%) — synonyms unchanged since run 15
 The producer did what was pre-registered: judged recall rose 11.5 points over atoms.js alone (expected 10–20), and precision fell (the
 produced atoms are stated 41% of the time against atoms.js's 81%). By the proxy, recall went 29.2 → 42.8% (cross-validated: +16–18).
 Japanese is where it fails (A2 19%, A1 49%): the parse, not the producer, splits its predicates. Neither atom bar is met; the next lever
 for precision is the produced predicates (the path's words joined, "variar_encontrar_entre"), which the proxy never checked and the
 judges do; and for recall the Japanese parse.

## Run 18a (2026-10-22): a LEARNED predicate for produced atoms, and a filter trained on the run-17 judges (no new gold)
Run 17's produced atoms were judged stated 41% of the time; their predicate was every word on the path joined
("lake_straddl_border_between"). Two learned stages, both averaged perceptrons, both local:
- Predicate chooser (native/organs/atom-predicate.js; eval/meaning/atoms/learn-predicate.mjs). The options are each path word alone, each
  ordered pair (a verb and its case word: "flow_into"), and all of them; the ranker scores each by its words' roles, parts of speech,
  relations, lemmas and English dictionary keys (so languages share weights). Labels from GOLD predicates (runs 13–17): for a candidate whose
  participants meet a gold atom, the right options are those whose words best name that atom's predicate, directly or through a key
  (1,470 labelled of 3,853 aligned: most gold predicates use no path word). Five-fold, each set held out in turn, share of labelled
  candidates whose chosen predicate is a right one: learned 59.7 / 68.3 / 67.5 / 61.0 / 64.5% (sets 13–17); all words joined, as run 17
  produced them, 25.8 / 22.5 / 19.8 / 22.4 / 23.9%; first word alone 38.5 / 41.9 / 47.2 / 42.7 / 43.6%.
- Produced-atom filter (learn-filter.mjs; filterFeatures in atom-produce.js): keep or drop a produced atom by its path, its chosen
  predicate's option and how that was built, trained on the run-17 precision judges' 419 verdicts on produced atoms. Left out one page at a
  time on run 17 (verdicts were given to the joined predicates): the produced atoms kept 190 of 419, judged stated 41.3 → 59.5%; the
  whole set A1 65.2 → 75.9%, A2 59.3 → 55.8% (the producer's share of recall 11.5 → 7.9 points).
- Guide: a first-mentioned proper name is `name`, not `new` (run 17's labellers read it the other way; C2 then covered 64 mentions).

## Run 18 (2026-10-22): a SIXTH held-out set — PRE-REGISTERED (written before the labellers saw it)
Set: eval/meaning/atoms18/sentences.json, 100 sentences from pages no earlier set touched: English Wikipedia 21 (Lake Champlain, Ohio
River), Wabash National 10-K 20 (Item 1, Business), Spanish 13 (Río Biobío, Volcán Osorno, Laguna de Términos), French 16 (Seine, Lac du
Der-Chantecoq, Mont Aigoual), German 15 (Starnberger See, Feldberg, Isar), Japanese 15 (十勝岳, 阿寒湖, 筑後川, 那須岳, 中禅寺湖, 吉野川); sources
with revision ids. The guide as run 17 with the `name` clarification; two new independent labellers (A: en, filing, es; B: fr, de, ja);
four judge agents, not told which atoms are produced.
System: run 17's (coreference coref-ranker.json and producer atom-producer.json, both unchanged) plus the predicate chooser trained on runs
13–17 (eval/meaning/atoms/predicate-chooser.json) and the filter trained on the run-17 verdicts (produced-filter.json, threshold 0).
Bars as before: A1 ≥ 85%, A2 ≥ 70%, C1 ≥ 90%, C2 ≥ 95% (cluster measure), S1 ≥ 90%, S2 ≤ 5%. Also measured, as run 17: the judged
precision of atoms.js's and of the produced atoms apart, and the recall found only through produced atoms.
Expected (not a bar): produced atoms judged stated 55–65% (run 17: 41%); A1 near 75%; A2 a few points under run 17's.
RESULT (system frozen at 5dc5aa31; output written before the gold (93a78129); gold by two new independent labellers — 271 entities,
448 mentions, 580 atoms, 100 pairs; atoms judged by four judge agents, not told which atoms were produced; judge 1's first run had a file
read declined and judged nothing, and was relaunched with the same brief):
 A1 atom precision 68.8% (671 of 976)   FAIL   — es 79, fr 74, ja 71, de 70, en 69, filing 60   (run 17: 65.2%)
      atoms.js's atoms 71.6% (562 of 785; run 17: 80.8%); the produced atoms 57.1% (109 of 191; run 17: 41.3%)
 A2 atom recall    50.2% (291 of 580)   FAIL   — fr 60, filing 54, en 53, ja 45, de 45, es 40   (run 17: 59.3%)
      through an atoms.js atom 42.8% (run 17: 47.9%); only through a produced atom 7.4% (run 17: 11.5%)
 C1 by cluster 74.8% (95 of 127)   FAIL   (run 16: 74.1%, run 17: 81.9%)
 C2 by cluster 96.5% (245 of 254)  PASS   (with the `name` clarification it covers 254 mentions again; run 16: 95.4%)
 S1 81% (33/50 synonyms found)   FAIL;   S2 4% (2 of 50)   PASS   — synonyms unchanged since run 15
 The chooser and filter did what was pre-registered for the produced atoms: judged stated 41.3 → 57.1% (expected 55–65), and they keep
 7.4 points of recall (run 17 page-out estimate: 7.9). The whole-set numbers moved with the set more than with the change: atoms.js,
 untouched, fell from 80.8 to 71.6% precision and from 47.9 to 42.8% recall on this set. Five sets in, atom recall sits at 42–60% and
 precision at 65–74% across sets, far from the 70 / 85 bars; the next measure is the one the atoms are for (run 19: the verdict).

## Run 19a (2026-10-22): the ATOM VERDICT, post hoc on the existing pair sets (MEANING-ATOMS step B)
The claim and its source are each read as atoms (native/organs/read-atoms.js: the page's referents by the learned coreference ranker, then
atoms.js) and weighed atom by atom (native/kernel/atom-support.js). A claim atom is met when a source atom has:
- the same predicate: the same word, a dictionary synonym (also between two English keys across languages), or a shared English key;
  one declared canonical form, a verb of being somewhere (lie, sit, be located, se trouver, ある …) with a place, is "be_in";
- the same referents: the same number within 2%, one name inside the other, every content word of the claim's met by the source's
  (directly, as a synonym or by key), or the same capitalised name word; a referent's names include what a named() atom calls it;
- a compatible standing: a hedged or reported source does not support an asserted claim.
The source atom's arguments may carry one more than the claim's, in order. A one-place atom taken from a word of the referent's own name
("lago Menor" → menor) identifies the referent and is not checked as a further fact. The atom verdict is supported when every claim atom is
met and the claim's grammar left no content word unread (claim-coverage.js), contradicted when a source atom holds a claim atom with the other
polarity. The "atoms" arm of eval/meaning/run.mjs (MEANING_ATOMS=1) takes grammar-ud's verdict and turns it into the atom verdict when that is
supported or contradicted. Post hoc (every set seen; the rules above were written from these misses), grammar-ud → atoms:
  main 76.7 → 76.7%, cf 78.6 → 78.6%, heldout 83.3 → 83.3%, other 100 → 100%, fresh 83.3 → 87.5%, relations 81.8 → 81.8%,
  fresh-ml 56.3 → 60.9% (false-reject 84.4 → 75.0%); false accepts unchanged on every set. Step B's bar (no set loses accuracy, false accepts
  stay, fresh-ml recall rises) is met, post hoc. The learned producer (MEANING_ATOMS=produce, or on the source only) changed no verdict.
  What remains is mostly the source's reading: a parse that loses a figure or splits a predicate leaves the source atom the claim needs
  unwritten (fresh-ml 604, 610, 619, 638), and some pairs need inference (621: 20% against "un cinquième").

## Run 19 (2026-10-22): a fresh pair set for the VERDICT — PRE-REGISTERED (written before the pairs were written)
Source: the intros of 19 Wikipedia pages no earlier set touched (en: Lake Michigan, Mount Rainier; es: Río Uruguay, Volcán Nevado del Ruiz;
fr: Durance, Lac de Vassivière, Lot, Mont Mézenc, Lac d'Aiguebelette; de: Müritz, Fichtelberg, Schluchsee, Großer Arber; ja: 黒部川,
八甲田山, 白山, 阿武隈川, 屈斜路湖, 大山), fetched 2026-10-22 with revision ids (eval/meaning/fresh19.sources.json). Pairs written and labelled
by a separate agent from those sentences alone (no code, no other sets, no results): per language (en, es, fr, de, ja) 16 same-language pairs
(about 8 E, 5 C, 3 T), and per other language 4 English-claim cross-language pairs (2 E, 1 C, 1 T); then audited by a second agent, labels
read against the sentence alone, before any arm runs. The system is frozen at the commit that adds this entry.
Bars, for the atoms arm (MEANING_ATOMS=1; the slim Wiktionary v2 pack; coreference coref-ranker.json):
 V1 coverage: every pair read (no typed gap).
 V2 false-accept at most 10%.
 V3 accuracy at least grammar-ud's on the same pairs.
 V4 accuracy at least the wording judge's, with fewer false accepts (run 9's F4).
 V5 at least half the contradictions named C (run 9's F3).
Reported per language and same- vs cross-language, with each failure assigned to a layer. No code changes between committing the pairs and
the first run; any later fix is post hoc and reported as such.
Set committed before any arm ran: eval/meaning/fresh19.json, 96 pairs (48 E, 29 C, 19 T; 80 same-language, 16 English-claim cross-language),
covering 79 of the 89 sentences and all 19 pages. Label audit by a second agent, labels hidden, from the sentence alone: 96 of 96 agreed
(fresh19.audit.json empty). Borderline, kept as given: 738 ("la Creuse" as river or département), 736 and 762 (a stated figure or list read
as complete), 755/756 and 764 (a disambiguation line and a cut sentence, intact where the claim needs it), 793/794 (names transliterated).
RESULT (first run, code as of 8bd3b8e2, no changes since the set was committed at 5747afa3):
 atoms arm: accuracy 45.8%, false-accept 8.3% (4 of 48 not-E), false-reject 100% (0 of 48 E accepted), contradictions 2 of 29, no gaps.
 grammar-ud: 46.9%, false-accept 6.3%, false-reject 100%, contradictions 2 of 29. Wording judge: 53.1%, false-accept 12.5%, false-reject
 81.3%, contradictions 2 of 29. Per language (atoms): en 50, es 50, fr 38, de 44, ja 44, cross-language 50.
 V1 PASS, V2 PASS (8.3%), V3 FAIL (45.8 < 46.9), V4 FAIL, V5 FAIL (7%).
 The atom verdict did not carry: on a set written as real paraphrase it accepts nothing, as the claim matcher accepts nothing. Its two new
 false accepts are matcher faults: 758 (a direction word in the predicate, "lie_nordwestlich", met by plain "lie"), 746 (the claim's
 "inhabitées" carried by no atom yet not counted unread). The 48 rejected E pairs, by what is missing (from the atom tables):
 - the reading of real Wikipedia text: a pronunciation in brackets breaks the parse ("Mount Rainier ( ray-NEER), also known as Tahoma" →
   mount(Rainier)); a figure in brackets is never an atom ("depth (923 ft; 281 m)"); a long list sentence loses its members;
 - paraphrase that needs a canonical rewrite: a superlative against a negated comparative ("the highest mountain in Washington" / "no
   mountain in Washington is higher"), an ordinal against "only X is more" ("second-largest after Lake Superior"), "also known as" against
   "another name for";
 - claim atoms the source does state but under another predicate or referent name (derive_from / come_from met; think / believe not).

## Run 19b (2026-10-22): five fixes from the run-19 triage — POST HOC on every pair set (fresh19 is spent; no bar is re-judged)
The fixes, each from a run-19 failure:
 1. english-parser.js: a suffix rule may cut at most k letters and leave a lemma of 3 or more (closest → clogood, red → r); a lemma attested
    in UniMorph in the same class (priorLemma) is taken before the irregular check.
 2. atoms.js: a bracketed figure is skipped only when the same measure of the same being is also stated outside brackets; the figure arg
    carries measure, base value and alternates ("923 ft; 281 m").
 3. atom-support.js: figures meet by base value or an alternate within 2%; a predicate meets only if every content word of it (over 4
    letters, or CJK) meets (758 lie_nordwestlich); canonical rewrites for a negated comparative ("no mountain in W is higher than X" →
    most:high(X), in(X, W)) and for "Y is another name for X" → named(X, Y).
 4. read-atoms.js: pronunciations in brackets (respellings, IPA, an audio link's empty brackets; kana readings kept) are cut before reading,
    spans mapped back.
 5. read-atoms.js: unread also counts a content word (NOUN/PROPN/ADJ/NUM, not a claim head) that no atom carries (746 inhabitées).
Atoms arm (MEANING_ATOMS=1), before (8bd3b8e2) → after; grammar-ud is unchanged on every set:
 main 76.7 → 76.7 · cf 78.6 → 78.6 · heldout 83.3 → 86.7 (false-reject 25.0 → 18.8) · other 100 → 100 · fresh 87.5 → 87.5 · relations
 81.8 → 81.8 · fresh-ml 60.9 → 60.9 · fresh19 45.8 → 47.9 (false-accept 8.3 → 6.3; false-reject 100 → 97.9). No set lost; no false accept rose.
 Native tests (relation-defs, eot-claim-match, grammar-ud) pass. The door e2e test (opencode-workplan-live-e2e) fails 0/8 with and without
 these changes (stashed), so it is environmental, not from them.
What still rejects the 47 fresh19 E pairs, from the atom tables:
 - 22 by the unread guard (claim words no claim atom carries; in 11 every such word is in the source sentence: the claim's reading drops
   them, "one of North America's Great Lakes" → has_count(Lake Michigan, one));
 - 25 by unmet claim atoms: of the unmet atoms, 39 have every argument in the source but meet no source predicate (derive_from / come_from,
   sit_at / same surface elevation, pour_en / desemboca), 19 some arguments, 14 none (the source reading or its coreference lost them).
 The largest single fault is now predicate equivalence across paraphrase; rules have stopped paying there (fix 3 moved one pair). Next: a
 LEARNED atom-pair matcher, trained cross-validated on the eight existing pair sets, measured on run 20.

## Run 20 (2026-10-22): a fresh pair set for a LEARNED atom-pair matcher — PRE-REGISTERED (written before the pairs were written)
Set: 122 sentences from 18 Wikipedia pages not used before (en Lake Erie, Mount Hood; es Lago de Chapala, Pico Duarte, Río Grijalva; fr
Lac de Grand-Lieu, Mont Lozère, Vienne (affluent de la Loire), Lac de Paladru; de Tegernsee, Hohe Acht, Fulda (Fluss), Schweriner See; ja
宍道湖, 鳥海山, 球磨川, 浜名湖, 日光白根山), fetched 2026-10-22 with revision ids (eval/meaning/fresh20.sources.json). Pairs written and
labelled by a separate agent from those sentences alone (no code, no other sets, no results), as run 19: per language 16 same-language
pairs (about 8 E, 5 C, 3 T), and per other language 4 English-claim cross-language pairs (2 E, 1 C, 1 T); audited by a second agent from
the sentence alone before any arm runs.
What is measured: the atoms arm with a learned atom-pair matcher (which claim atom a source atom meets, by predicate and arguments), trained
cross-validated on the eight existing pair sets (main, cf, heldout, other, fresh, relations, fresh-ml, fresh19) and frozen at the commit
that adds it; the arm as of 67b3d503 (run 19b) is the baseline. This set is seen by no training.
Bars, for the matcher arm:
 M1 coverage: every pair read (no typed gap).
 M2 false-accept at most 10%.
 M3 accuracy at least the 67b3d503 atoms arm's on the same pairs, and at least grammar-ud's.
 M4 at least a quarter of the E pairs accepted (run 19: 0 of 48; 19b: 1 of 47).
 M5 accuracy at least the wording judge's, with fewer false accepts.
Reported per language and same- vs cross-language, each failure assigned to a layer. Any change after the matcher is frozen is post hoc.
Set committed before any arm ran: eval/meaning/fresh20.json, 96 pairs (48 E, 29 C, 19 T; 80 same-language, 16 English-claim cross-language),
over 90 of the 122 sentences and all 18 pages. Label audit by a second agent, labels hidden, from the sentence alone: 96 of 96 agreed
(fresh20.audit.json). Borderline, kept as given: 849 (a rank without its measure), 860/872 (a sentence cut before its subject, the title
supplies it), 852, 804 (third after two is smaller than both), 807 (a bearing read from the other end).

## Run 20a (2026-10-23): a LEARNED atom matcher, with and without aligned word vectors — cross-validated on the eight existing sets (negative; run 20 NOT run)
Matcher (native/kernel/atom-match.js): each claim atom is met by its best source atom, or left aside, under a linear score of what the rules
measure; each unread claim word is scored by whether the source sentence carries it; a pair is supported when its weakest unit scores above
zero. Trained on pair labels only (E against not-E), leave-one-set-out over main, cf, heldout, other, fresh, relations, fresh-ml, fresh19.
Vector features (native/organs/word-vectors.js; ~/.cache/live_priors/vectors/muse5): MUSE aligned vectors for en, es, fr, de; ja fastText
mapped into that space by Procrustes on MUSE's ja-en dictionary (held-out dictionary pairs: nearest English word right 198 of 511).
Pooled accuracy, E against not-E, by the penalty on a wrong accept (NEGW):
 rules 63.1 · no vectors: NEGW 1 → 61.5, 3 → 67.5, 8 → 63.1 · with vectors: NEGW 1 → 58.7, 3 → 67.8, 5 → 63.9
 At NEGW 3 (best pooled) false accepts rise: fresh19 6.5 → 10.9 (no vectors 17.4), heldout 14.3 → 42.9, main 7.1 → 28.6. At NEGW 5, where false
 accepts do not rise, it accepts 2 of 47 fresh19 E pairs. The vectors add 0.3 points pooled at NEGW 3: nothing.
Bar set before this (freeze only if it beats the rules without raising false accepts): NOT MET. The matcher is not frozen and run 20 is not
run; fresh20 stays untouched. Reading: the matcher can only move the accept threshold. Word nearness (a bag of word vectors per predicate)
does not separate "derive from the Ojibwe word" from "come from the Ojibwe word" any better than a synonym list does, and the units it
scores are the rules' own atoms, many of which are wrongly read (the unmet-atom triage of 19b: 14 of 72 had no source argument at all).
Next candidate, not tried: a small local multilingual NLI/cross-encoder scoring claim against sentence, as a feature or as the check.
