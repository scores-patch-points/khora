# RESULT: the codec per region, as a mixture over root codecs (2026-11-28)

**The owner's ruling (2026-11-28):** the per-language UD codecs on disk are ROOT codecs, hardcoded seeds. The codec a text is read under is generated on demand for the text's own region, era and register, and must work organically and at once on mixed text (Spanglish, a business-formal creole). The design is janus `DESIGN-COMPUTED-CODEC.md` (`codecFor(material, context)`, a derivation record on every reading), of which nothing was built. `the-fold/codec-regions.mjs` is the first built piece: WHERE each root applies in a text, with a `CodecDerivation@1`.

## How
All held roots with a word cut are candidates. Roots are chosen by description length: add the root that explains the most still-unexplained tokens, keep it only if the fitted chain then describes the text in fewer bits by more than log2(H), the cost of naming one root out of H. Where each applies: a hidden Markov chain over the chosen roots, one price for a known word under every root, the stay probability fitted to the text itself (Baum-Welch on one parameter). No model, nothing trained, no hand-set threshold.

## Measured (`native/scripts/measure-codec-regions.mjs`; mixed text BUILT from Genesis, gold free: each token's language is the edition it came from)
Split: **held-out verses** (Genesis table rows 600 to 623; the method's structure was fixed on rows 1200 to 1223, where the first version failed and was repaired, see below). One run, stamp in `STAMP.txt`, raw output in `heldout-from600.txt`. 10 language pairs, about 450 to 640 tokens each.

| condition | REGIONS | SINGLE (one codec for the text) | TOKEN (each word alone, given the true pair: an upper bound for a context-free reader) | both roots found and no other |
|---|---|---|---|---|
| alternate (switch between verses) | 0.906 | 0.441 | 0.729 | 5 of 10 |
| splice (switch inside a line) | 0.899 | 0.451 | 0.734 | 5 of 10 |

Token accuracy, mean over pairs. Per pair: 0.89 to 0.99, except English with Tagalog (0.70, 0.68: the Tagalog root has a table of 209 forms). Time: 12 to 60 ms per text after the first call loads the root tables (about 1.5 s once).
**Control (one language alone, 10 languages): one root in 4 of 10.** The others gain a spurious second or third root that takes 1% to 5% of the tokens (Tagalog 25%): Indonesian, Nigerian Pidgin, Danish and French tables explain a few names and loan forms. So the method OVER-SEGMENTS monolingual text slightly, and the extra roots in the mixed runs (5 of 10 pairs) are the same thing.

## The first version failed (kept)
On the development rows the first version scored 0.63 (worse than TOKEN): it took its candidates from codec-fold's whole-text alphabet pass, which assumes one language and drops English as soon as a text also holds Swedish or Turkish letters; and it admitted a root whenever it beat a letter-shuffled null, which let ten roots in. Repaired by taking all held roots as candidates and choosing by description length. Development rows after the repair: 0.917 and 0.924.

## What this is not
- **Not real code-switching.** The mixes are built from translations: no borrowings, no word with one language's stem and another's ending, no shared words a bilingual would not notice switching on.
- **Not era or register.** Each root is one treebank. "Per my last email, kindly revert by EOD ... align on the deliverables" comes back English plus INDONESIAN: business vocabulary no English form table holds is explained by another table (a kept failing example in the test file). A register is not a root; it needs its own source of evidence (`codec-evidence` in the design), which does not exist.
- **Not a composed reader.** This says where each root applies; reading each region under its root's parser, and weaving the derivation with the reading, is not built. Nothing is woven to the pharos by this module yet.
- Unspaced scripts are not candidates (typed in `derivation.gaps`). The probabilities are not calibrated against gold.
