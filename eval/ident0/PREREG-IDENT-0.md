# PREREG-IDENT-0 — does janus `same()` over the reader's own edges separate names of one thing from names of different things, better than the string rules?

Written 2026-11-04, before any pair was scored. Feasibility measurement only: the reader is not changed, nothing is wired, nothing is merged. Branch `ident-0`, from `cast-identity` (60bc133, the accepted layer-3 repair).

## What was and was not looked at before this was written

- Looked at: the shape of one `readDocument` entry (Apollo 13, castIdentity off: its field names, the first edges, the cast entries); the three inventories (they are the data); a **synthetic toy world** (planted aliases; not khora data) used to test the scripts.
- Not looked at: any verdict, any edge or cast entry of any pair's article, any score. The 56 reads (28 articles × castIdentity off / on) were started before this was written and were not opened.
- Found on the toy, before any real pair, and written into the design below: `kindCentroid` takes the first of equally frequent values as a kind's "average", and every node's own string is unique, so the alphabetically first node of a world is its kind's average and has Δ = 0 and λ = 0. Pairs containing that node are flagged `firstNode` and counted, not removed.

## Provenance (recorded before scoring)

- Real pipeline: `native/reading.js::readDocument(text, {language:'en', minCharacters:0, lexicon:false, castIdentity: false|true})`, canon preflight `canon-check.mjs` on this clone: **CANON-OK**; its own printed line `preflight sha256: e0512e68fe80e30268acbac1a4c95a1c282d97fcd0fc7aaf77624a481909dfbd`; sha256 of the whole captured output file `71f5be484af092f406b5842f5f53985c900b0520ac052257eb795fe56635f9e6`. `KHORA_PRIORS_DIR=$HOME/Downloads/workspace/janus/priors`. `lexicon:false`: no hyperlexicon door on this machine, so nothing is asked of it (the entry's aliasReport says so).
- janus: `scores-patch-points/janus` main at **b1cc37f189e28d85c3bc2539039dc0f676002159**, files fetched read-only into a scratch folder outside the repository and imported by path (`JANUS_DIR`), never copied into khora. sha256: same.mjs `225a40a3…89c0`, fold-depth.mjs `7c97ae67…43fd`, referents.mjs `064c6225…918c`, resolve.mjs `1bea96f5…d68`, README.md `a4a23889…c7e28`, STATUS.md `c171505b…84070`, RESOLVE.md `57bd9079…8b9b` (full values in RESULT). `same.mjs` imports only `fold-depth.mjs`; `fold-depth.mjs` imports only `same.mjs`. referents.mjs and resolve.mjs are not used here (they decide among candidates a mention may refer to, not whether two names are one).
- Scripts (sha256, at the time of this document): `pairs.mjs` ac75b97e…, `score.mjs` 69f14325…, `summarize.mjs` cc57246f…, `read-all.mjs` 15036b3b…, `pairs.json` 7be2a55b24458f701427e006e54ff80cc16378fd1303ba95118c20940ea0314e. (Full hashes: `HASHES.txt`, written with this file.)

## Data and pairs (mechanical; no new labelling)

Spent material: `spent-castgold-v1`, `-v2`, `-v3` (inventories `CastInventory@1`, hand-labelled by one labeller, not blind). `pairs.mjs` derives:

- **Positive**: two different name forms (case-insensitive distinct strings) listed under one entity of one article.
- **Negative**: a form of entity A and a form of entity B, same article, A ≠ B, where one form contains the other (case-insensitive substring) or the two share a word. Words are runs of letters/digits; a token that is lowercase in the source and ≤ 3 letters, and any one-character token, is not a word (so "of", "de", "the" never make a pair). A form string listed under two entities of an article is dropped from every pair (0 occurred).
- **Counts: 64 positive pairs, 132 negative form pairs (94 distinct entity pairs; 46 by containment, 86 by a shared word) over 28 articles.** v1: 36 pos / 54 neg; v2: 11 / 26; v3: 17 / 52. The unit of every share below is the pair.

## The world (the mapping, the lens, the fold stop — all declared here)

Per article, from the entry's own `edges` (`end1`, `end2`; labels are not used; spans/sentences are used only in M2):

- **M1 (primary mapping).** A node is a distinct lowercased NFC end string; a link is an edge (undirected, de-duplicated, no self-loop). A name form maps to the node whose string equals the lowercased NFC form (whitespace collapsed). A form with no such node is the typed gap `unmapped` (counted, never correct).
- **M2 (coverage extension, secondary).** M1 plus, for every pair form that is not an edge end, a node for it, linked to every edge-end string that occurs (whole word, case-insensitive) in a sentence in which the form occurs, with the form's own occurrences blanked out of the sentence first.
- **Lens W (configuration A, primary).** `{attrs:['t'], giver:null}` where every node has `kind:'term'`, `attrs:{t:<own string>}`: the features that count are the strings of the beings in the fold (a being's neighbours' strings are what its fold carries); the frame is the one article's own edges. **Tolerance** (not typed): the 5th percentile of `diffMaps(U(x),U(y))` over 300 seeded random node pairs of the same world, so "U(a) ≈ U(b)" means closer than 95% of random pairs of this article. `foldNull` = `estimateNull(world, lens)` (default seed); `deltaNull`, `cosNull` defaults (displacement-profile median, 0). Nothing is tuned.
- **Fold stop.** Primary A: the default cumulative fold with `estimateNull`. **B (secondary, descriptive):** `fold:'dmd'`, tolerance 0, on a bipartite incidence world (a name node `N:x`, attribute-free, linked to term nodes `T:y` carrying `t=y`, for every edge x–y in both directions), which keeps a name's own string out of its own fold. B's `same()` verdict is expected to be `different` whenever U holds, because Δ = 0 for attribute-free nodes; B is therefore read at **the level of U**: `supported` (close, rarer than chance under re-paired links), `unsupported` (the fourth verdict), `different`.
- **Reads:** castIdentity **off** is primary (the reader's own candidates); the same A configuration on the **on** entries is reported as secondary (A1on).
- **Verdicts recorded per pair:** same / different / unsupported / refused / unmapped, with Uclose, Δ-distinct, λ-aligned, the fold record, and the sizes below.
- **Baselines.** (1) string: one normalised name contains the other → same, else different. (2) cast pass: both forms are surfaces (`surface` or `allSurfaces`, normalised) of one cast being → same; both found, no common being → different; either not found → `unseen` (a gap). Computed on the castIdentity-on entries (what the pass does) and, for reference, on the off entries.
- **Size around a name:** edges within two hops (every distinct edge touching the name's node or one of its neighbours) and degree; a pair's size is the min of its two names; bins 0, 1–9, 10–49, ≥ 50. Per article: nodes, edges, max degree, hub share (max degree / nodes).
- **Shuffled-edges control:** 20 seeds (1000…1019); links re-paired at random (degree-preserving stub shuffle), node set unchanged, tolerance and fold null recomputed on the shuffled world, same pairs, A1 configuration.

## Bars (fixed now; may be sharpened, never loosened)

On the primary A1 (reads off, M1, default stop), pairs as the unit, **gaps count against, never as correct**:

- **B1** negatives called `same` ≤ 10%.
- **B2** positives called `different` ≤ 10%.
- **B3** correct (pos = same, neg = different) ≥ 80% in each class (so that all-gap cannot pass B1–B2).
- **B4** control: J = P(same | pos) − P(same | neg) on real edges exceeds the maximum J over the 20 shuffles, and the mean shuffled J ≤ 0.10.
- **B5** beyond the string rule: within the stratum where baseline 1 says `same` (all containment pairs, positive and negative), J ≥ 0.5 and above the max shuffled J of that stratum.

Overall: **PASS** only if B1–B5 all hold; **PARTIAL** if some; **NEGATIVE** if none. Also reported, no bar: U-only discrimination (Uclose) against the shuffle; macro-correct of A1, A1on, A2, string, cast-on, cast-off; verdicts by size bin; the Δ and λ conjuncts' shares; every failure. Wilson 95% intervals throughout. Scored once; a code error found afterwards is published as a rerun with its reason, not replaced.

## Limits (stated in advance)

Spent material that other builders developed on (a pass at 0.75–0.80 on exams of this family is not a held-out figure, and no held-out set exists for this step); one labeller, not blind; single articles (a name's world is one article's edges, which may be sparse); English only; 64 positive pairs, so a 10% bar is ≤ 6 pairs and intervals are wide; negatives are defined by string overlap, so they are the hard kind for string rules and say nothing about unrelated names; `lexicon:false`; the reader's end strings are lowercased and can truncate numerals (an "Apollo 13" may arrive as "apollo"), which M1 counts as `unmapped`, a real cost of the reader not of janus. janus's own STATUS warns that two degree-one beings look alike and that a hub defeats the fold; the size table is there to show whether that is what the verdicts depend on.
