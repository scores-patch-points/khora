# Round 27: what counts for the question — grain, containment, and what the asker holds

Preregistered (PREREG-ROUND27.md, 2026-11-19T00:02:48Z), frozen (FREEZE-ROUND27.md, 01:03:56Z), held-out (odd hash of the Wikidata id) scored once. Code: `native/adapters/text/place-grain.js` (the judge, the question-grain reader), `identity/place-grain/` (fetch, harness, `results-heldout.json`). Giver: Wikidata SPARQL, 885 politicians with a birthplace, the located-in chain of their 711 birthplaces (class-filtered to first-level divisions and countries; 735 KB, hash in the freeze file).

## What it does
For "Which state was X born in?" the answer "Topeka" counts (it rolls up into Kansas), "Kansas" counts, "United States" is too coarse (a gap, not wrong). For "Where was X born?" it depends on what the asker already holds: to someone who holds Kansas, "Kansas" is already held (nothing fresh) and "Topeka" counts; to someone who holds nothing, both count. The question's grain is read by the reader's own parser from the noun the wh-word governs ("which STATE").

## Held-out result (147 people with a complete chain, 3,564 items, 60 string-ambiguous)
| system | four-way verdict accuracy | accept/reject accuracy |
|---|---|---|
| JUDGE (grain + containment + holdings) | 0.972 | 0.985 |
| B3 chain lookup, grain-blind | 0.629 | 0.753 |
| B1 string equality at the asked level | 0.508 | 0.754 |
| B2 string containment at the asked level | 0.500 | 0.745 |

- C1 (the hierarchy is needed): MET. String containment false-accepted all 36 trap answers ("Kansas City" for Kansas, "West Virginia" for Virginia); the JUDGE accepted none.
- C2 (the question's grain is needed): HALF MET, and my stated prediction was half wrong. The grain-blind chain lookup gets every too-coarse item wrong (0 of 441: it accepts "United States" for "which city"), which the JUDGE gets right (0.989). But it gets every finer-than-asked item right (441 of 441, because accepting any chain label happens to accept a roll-up), which I had predicted it would fail. The two string baselines fail roll-ups (0.011, 0.025).
- C3 (the asker's holdings are needed): MET. On "where" with holdings, the JUDGE is right on 0.996 of 1,323 items; the three baselines, which cannot change with holdings, on 0.667 to 0.674.
- C4 (the grain read from the question): 40 of 42 phrasings. Misses: "Which US state did {N} come from?" and "Which state does {N} hail from?": the parser attaches them so no grain noun is found, so those items score no verdict (86 items, counted wrong). A parser failure.
- C5 (the giver): only 147 of 436 held-out people (33.7%) have a complete chain. 248 have no first-level division found, because the chain query accepts only 11 direct instance-of classes; "state of Brazil", "region of Italy" and similar subclasses are missed. Eleven have more than one first-level division. So the giver reaches a third of the people: the judge's numbers describe that third.

## Limits
- The items' gold comes from the same Wikidata chain the judge reads, so agreement is partly by construction. What the run shows is that the baselines fail where grain and containment matter. It does not show that a reader can pull the answer string out of free text, nor that the declared rule for "where" is right for every asker.
- Cities named like their state (Lima, Lima; New York, New York): a bare string cannot say which level it names. 60 of 3,564 items; no string-only system can get both right. The question's grain would resolve it (the judge takes the first level the string matches), and it does not yet.
- Development was run before the freeze to debug; it showed the two parser misses and the Lima case; the judge was not changed for either.
- Not done: the answer string read from free text; fluent claims and time (offices held over an interval); widening the chain classes; non-place invariants.
