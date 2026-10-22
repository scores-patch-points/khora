# Gold atoms, coreference and synonyms: the labelling guide (written 2026-10-22, before any labeller or system saw the sentences; run 18 clarified that a first-mentioned proper name is `name`)

You label `sentences.json`: 100 sentences, each with its page title and the sentences before it on its page. Judge **only from the
sentence and its page context**, never from what you know of the world. Write `gold.json` (format at the end).

## 1. Entities, per page

For each page, list the entities its sentences mention: `{ "id": "E1", "name": "Lake Baikal" }`, with ids unique within the page (`E1`, `E2`, …). An
entity is any person, place, organization, body of water, product, event, quantity-holder or kind that a sentence states something about. A kind
mentioned generically ("lakes", "renewable energy") is not an entity unless something is stated about it.

## 2. Mentions and coreference, per sentence

For every mention of an entity in the sentence, write `{ "text": "<exact words from the sentence>", "entity": "E1", "how": "<kind>" }`, kinds:

| how | when | example |
|---|---|---|
| `name` | a proper name or its part | "Lake Baikal", "Baikal", "ALLETE" |
| `alias` | another name the text gives for the same entity | "the GSK Agreement", "Titiqaqa" |
| `description` | a description that refers back to a known entity | "the lake", "the company", "ALLETE's largest business" |
| `pronoun` | a pronoun | "it", "its", "elle", "er", "それ", "our", "we" |
| `dropped` | a subject the sentence leaves out (Spanish, Japanese) | text "" — write `"text": "", "at": "<the verb it is the subject of>"` |
| `new` | a first mention of an entity that is not a proper name (a proper name is `name` at its first mention too) | "a rift lake" |

"We", "our" and "us" in the filing are the company. A mention that refers to nothing on the page (an indefinite new entity) is `new`.

## 3. Atoms, per sentence

An atom is ONE fact the sentence states, as `{ "pred", "args", "neg", "hedged", "span" }`:

- `pred`: one English word or short phrase, base form, lowercase ("deep", "located_in", "is_a", "flows_into", "has_area", "provide", "largest").
- `args`: entity ids (`"E1"`), or literal values with units exactly as needed to compare (`"31722 km2"`, `"1642 m"`, `"2023-01-09"`,
  `"70 percent"`), or a literal kind (`"rift lake"`). The first argument is the one the fact is about.
- `neg`: true when the sentence denies it. `hedged`: true when the sentence says it is only possible, planned, reported or approximate in a
  way that changes what is asserted ("may", "plans to", "is expected to", "reportedly"). An approximate number ("about 85 000 km2") is NOT
  hedged; write the value and add `"approx": true`.
- `span`: the exact words of the sentence that state it (a substring).

Rules:
1. One predicate per atom. "the deepest lake in the world" gives `is_a(E1, lake)` and `deepest(E1, lakes of the world)`.
2. Modifiers are atoms: "a rift lake" gives `is_a(E1, rift lake)` (or `is_a(E1, lake)` + `rift(E1)`; prefer the shortest kind that is still
   stated). A place phrase is an atom (`located_in`), a time is an atom (`time(<event or fact>, value)` or as an argument of the fact).
3. Figures are atoms with their unit: `has_area(E1, "31722 km2")`; a bracketed equivalent ("(12,248 sq mi)") is not a second atom.
4. Comparisons and superlatives keep their comparison class: `larger_than(E1, E5)`, `seventh_largest(E1, "lakes by surface area")`.
5. Names and aliases are atoms: `named(E1, "Titiqaqa")` for "also called / known as / in Aymara: Titiqaqa".
6. Only what is stated. Do not infer ("deepest lake" does not state "deep"). Do not split a fixed name ("Minnesota Power" is one entity).
7. Write about 3–10 atoms per sentence; a long list sentence may need more.

## 4. Synonym pairs

Write 100 word pairs, 20 per language (en, es, fr, de, ja), each `{ "lang", "a", "b", "pos": "NOUN|VERB|ADJ", "same": true|false, "kind" }`:
- 10 with `same: true`: two words that mean the same in at least one common sense (kind `synonym`), drawn from or prompted by the sentences.
- 10 with `same: false`: a near miss — an antonym (`antonym`), a broader or narrower word (`hypernym`), or a related word that does not mean the
  same (`related`). At least 3 antonyms per language.
Use lemmas (base forms). Do not use the same word in more than two pairs.

## gold.json

```
{ "schema": "GoldAtoms@1", "labeller": "…", "entities": { "<page title>": [ { "id", "name" } ] },
  "sentences": [ { "sid": "g001", "mentions": [ … ], "atoms": [ … ] } ],
  "synonyms": [ { "lang", "a", "b", "pos", "same", "kind" } ] }
```
