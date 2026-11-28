# PREREG round 31: does a capital mark a name in THIS text? A convention rung for the being ladder

Written 2026-11-28 before any gold run of the rung below. Stamp: the sha256 and UTC in `PREREG-ROUND31-CONVENTION.md.sha256` and `.time` beside this file.

## What prompted it (exploratory, disclosed)

On 16 Old Bailey trials (Zenodotus `20-first-person-voices/old-bailey`, early-modern English, no gold), the canonical read admitted 4,701 beings; 52% of their 10,436 mentions have a head whose lower-case form the POS prior (UD English EWT, `janus/priors/pos-eng.json`) holds mostly as a common noun (Prisoner, Evidence, Jury, Felony, Death), 3% an adjective (Guilty), 3% a verb (Tryed, Stealing). The parser itself tags 56% of the common-noun group NOUN, not PROPN; their kāraka profile is patient-heavy (karman 24%, kartṛ 15%) where names are agent-heavy (kartṛ 24%, karman 8%). The cast admits by the capital tier (`surfaces.js`) and the form-usage rung (`form-usage.js`), which refuses a capital only when the form is used mostly as a non-NOMINAL, NOMINAL being NOUN, PROPN and ADJ; it cannot tell a capitalized common noun from a name. That analysis is the hypothesis's origin and is NOT evidence for it.

## The rung (frozen before the held-out run)

`readerOptions.nameConvention: true` (off by default; off, the read is byte-identical). Applied to the capital tier's surfaces before the cast is admitted (`read-core.mjs`, after `extractSurfaces`). Two steps:

1. GROUND (the text's convention). For every token of every sentence except the sentence's first (the reader's own sentence cut and tokenizer), whose lower-case form the POS prior holds with dominant class NOUN: n counts it, k counts it if it is written with a capital first letter. r0 is the prior's own rate: over the same set of forms (prior-dominant NOUN, lower-case key), the share of their occurrences the prior holds under a capitalized key (all positions, so r0 over-counts and the test is conservative). The text capitalizes common nouns if the exact one-sided tail P(X >= k | n, r0) < 0.05 (the alpha of `surfaces.js` `CAP_SIG_ALPHA`, the same `upperTail` as `form-usage.js`). If it does not, nothing below runs.
2. FIGURE (each capital surface, only when GROUND fired). A capital surface is kept as a name if at least one of its tokens supports a name: its lower-case form is not in the prior (a name the treebank never heard), or the prior's dominant class for it is PROPN. Otherwise it is refused from the capital set; the referent stays in the read as a `heard` row (demoted, never deleted). The rung reports `{ fired, k, n, r0, p, refused }` on the entry, non-enumerable (the wire is unchanged).

No dial is chosen: alpha is the codebase's, r0 and the classes are the prior's.

## Data

- DEV (mechanics only, may be read freely): GUM train slice B (`eval/referents/pronoun-golden.mjs` `slicesOf`), unmodified and shifted (below); Old Bailey.
- HELD OUT, one run: GUM **test** (30 documents) and GUM **dev** (30 documents), `UniversalDependencies/UD_English-GUM` master, sha256 test `40854b004a1475412c8cdd0ba9536d77e4876467238d8e035718dd33bd29c1e3`, dev `ed955aa38fe62d3c2670701ef92dd577608a9a10c5ee452e6990dc3d1fe3c7ce`. Both were read by earlier rounds for other questions (round 17 POS smell, round 14 name veto), never for being admission under a convention.
- SHIFTED: the same documents with every gold NOUN token's first letter upper-cased (lengths and gold offsets unchanged): a controlled 17th-century convention with the gold intact.

## Measures (per document, then pooled; spans are the cast's `mentionSpans`)

- NB: cast spans overlapping a gold mention whose gold head is PROPN.
- FB (false being): cast spans overlapping a gold mention whose gold head is NOUN, and no gold mention headed PROPN.
- P = NB / (NB + FB). R = share of gold mentions headed PROPN overlapped by a cast span.
- Pronouns: `identity/novels/gum-falsify3.mjs` CANON and CONTROL right/wrong on slices E, C, D, F with the rung on.

Intervals: document bootstrap, 2,000 resamples, seed 20261128, 95% percentile.

## Hypotheses and decisions

- H1 (no harm on modern English): on held-out test+dev UNMODIFIED, GROUND fires on few documents (prediction: 0 of 60), and both ΔR = R(on) − R(off) and ΔP have 95% intervals that include 0 or lie above it. H1 FAILS if either interval lies wholly below 0.
- H2 (the convention is read): on held-out test+dev SHIFTED, ΔFB's interval lies wholly below 0 and ΔP's wholly above 0. ΔR is reported, with no decision (a loss of names there is the cost, disclosed). H2 FAILS otherwise.
- K (falsifier for H2): per shifted document, refuse the same number of capital surfaces at random (20 seeds) from the surfaces GROUND would consider; the rung's pooled ΔP must exceed the 95th percentile of the 20 random ΔP. If not, the rung's selection carries nothing beyond refusing that many surfaces, and H2 is withdrawn.
- H4 (the canonical read is untouched where it should be): pronoun CANON and CONTROL on E, C, D, F are identical with the rung on (GROUND does not fire on modern text). A difference is reported as a finding.
- H3 (Old Bailey, gold-free, exploratory, no decision): the share of admitted-being mentions whose head is a prior-dominant common noun, off vs on.

## What does not change on a pass

The rung stays off by default unless H1, H2, K and H4 all hold; turning it on in the canonical options is a separate commit with the baseline re-recorded and this round's numbers cited. A fail is recorded with its falsifier and the rung stays off.

## Deviations

Any change after the stamp is logged in the results file as a deviation, with why, never hidden.
