# FIXES.md — atlas-run phase log (append-only)

Rules: PROTOCOL.md (sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc), lib/pocket.mjs and run-atlas.mjs are never edited by this phase. Fixes to loaders/laws made by
this workflow, interpretations of ambiguous protocol text, and AMENDMENT PROPOSALS are logged here, each with the reason. Entries are never rewritten; corrections are new entries.

## Entry 0 (2026-10-07, before any atlas output existed) — interpretations fixed in advance, instrument verification

0.1 Verified: PROTOCOL.md sha256 unchanged. All seven law families import and expose FAMILY, STATS, compute, PREDICT (burst 11, comp 12, fig 12, freq 12, order 11, para 12, phys 11 = 81 statistics).
    Re-derived the PREDICT tables: burst, freq, order, para, phys match their frozen sha256; comp matches its AMENDED hash de2c7cd9 (the original eca34245 held divSlope universal-, amended to
    universal+ before the new definition was computed, as comp's report says); fig matches its frozen predict object entry by entry (its hash is over a different serialisation).
0.2 Verified: every loader's load([id]) builds all 399 manifest pockets one by one (results/validate/*.jsonl): 0 errors, 0 thin, 0 over the cap, ids unique, 55,581,538 tokens.
    Smallest half is 7,950 tokens (ud-cmn-hans); ml-arb-kalam and ml-pc-gulliver-fr have 7 documents in the confirm half.
0.3 New group "ct" (loaders/ctrl.mjs, loaders/ctrl.manifest.json): 20 SHUFFLED-REAL LAW-FREE CONTROLS. A control keeps one real pocket's unigram counts, multiset of unit lengths and units-per-document,
    and destroys everything else (global token shuffle; unit lengths re-assigned by a global shuffle). Added because the planted iid worlds have synthetic vocabularies; the controls measure the
    false-PRESENT rate on real vocabularies, sizes and unit-length laws. Controls are instrument checks and are excluded from every law-level count, like the planted pockets.
0.4 Interpretations of PROTOCOL.md, fixed now and implemented in classify-atlas.mjs / classify-config.mjs (sha256 of classify-config.mjs at this moment:
    d346c7b9ec13714aa27b005ad0fcac22ab525256a1de3587b2d02196f6382595):
    a. DEFINED cell = finite v and finite z in BOTH halves (z is finite only when the 10 null draws have sd > 0). A cell with finite v but a null z (zero-variance null, inert statistic) is
       'zUndefined': neither PRESENT nor ABSENT, not in N; counted and reported per statistic. Pocket-level v = mean of the two half values; pocket-level |z| = min over the two halves.
    b. POCKET-SPECIFIC counts PRESENT of either sign (PRESENT in >= 2 pockets, PRESENT in <= 59% of N, ABSENT in >= 25% of N). UNIVERSAL/MAJORITY use the larger single-sign count / N.
    c. SHARED PROPERTY: indicator PRESENT(any sign) vs not-PRESENT among defined cells, against group, register, script (Cramer V^2 = eta^2 of the indicator on the category) and log10 tokens,
       log10 mean unit length, log10 doc count (eta^2 of the attribute on the indicator = r^2). 2000 label permutations (seeded). The attribute with the largest eta^2 is reported with its own
       permutation p (the protocol's wording; selection gate p < 0.05). I also report a max-over-attributes permutation p (multiplicity-honest) and, for REVERSAL statistics, the sign-split
       comparison PRESENT+ vs PRESENT-. The max-p and the sign-split are reported but do not gate selection.
    d. CONSTANT VARIES: among PRESENT pockets of UNIVERSAL/MAJORITY statistics, spread (IQR/median|v| and sd) and eta^2 of v on group, register, script with 2000 permutations.
    e. G1 uses pocket-level v (mean of halves) against log10(tokens) and mean unit length, over non-planted non-control non-thin pockets with a defined cell; also reported on z.
    f. Heterogeneity = IQR(v pocket-level among PRESENT pockets)/median|v| (null when median|v| < 1e-12). Universal selection ranks by median over defined cells of min-half |z|.
    g. Statistics that fail the planted instrument check (iid-world false PRESENT, sign contradiction in a world where they are candidates, or z-inert) are excluded from selection but stay in the table.
    h. Pre-registered G0 candidate-statistic mapping for every planted phenomenon is in classify-config.mjs (written from planted-truth.json 'sign' fields); the phenomena 'company-classes'
       (clusterability of types by neighbour profile) has an EMPTY candidate set because no statistic of the atlas measures it, and is reported as unrecovered by construction.
    i. Grain classes for G3 (word / charbigram / code / notation) are derived from pocket ids and tokenisation strings in classify-config.mjs. Headline statuses pool all grains, as the protocol
       counts; per-grain breakdowns are reported next to them, and a word-grain-only status is computed as a sensitivity.
0.5 Known limitation of G2 as worded: run-atlas.mjs writes a wall-clock `seconds` field, so two atlas JSONs of the same pocket are never byte-identical. G2 is checked on the JSON with `seconds` removed.
    AMENDMENT PROPOSAL (for PROTOCOL.md, not applied): G2 should read "byte-identical atlas JSON except the wall-clock field `seconds`".

## Entry 1 (2026-10-07, atlas processes started; no atlas output had been read)
1.1 Atlas launched: 6 background processes (nice 5) over all 419 ids (399 real+planted, 20 controls), partitions in results/logs/part-*.txt (balanced by tokens, about 9.93M tokens each),
    logs in results/logs/atlas-*.err, output in results/atlas/ (run-atlas.mjs default). --resume is used so a crashed process can be restarted unchanged.
1.2 Statistic-level instrument rule extended BEFORE reading outputs (supplements 0.4g): a statistic also FAILS the planted check if it has a PRESENT cell (both halves |z| >= 4, same sign) in any of
    the 20 shuffled-real controls. Under the null a given statistic does this with probability about 1e-4 over 20 controls, so a hit means the statistic is not null-calibrated on real-shaped data.
    classify-atlas.mjs implements this rule; classify-config.mjs is unchanged (hash in 0.4).

## Entry 2 (2026-10-07, after the atlas finished: 419 pockets, 0 run errors; classify-atlas.mjs first run)
2.1 No loader or law bug was found by the atlas run: results/atlas has 419 JSON files, `errors` is empty in every one, no pocket is thin. Nothing in loaders/ or laws/ was changed.
2.2 Additions to the classifier after seeing the first table (all REPORT-ONLY, none changes a status, G0/G1 verdict or the selection): per-register and per-script PRESENT breakdowns (byRegister, byScript),
    a group-balanced PRESENT share (mean over the six groups), exceptions list for UNIVERSAL statistics (leads), the exploratory sign-split of REVERSAL statistics (already computed, see 0.4c).
2.3 G0 reading: the pre-registered negative control (burst.repAdj must NOT be PRESENT in pl-mix) FAILED (P+, z +10.5/+26.5). planted-truth.json states the cancellation for the adjacent-identical-token rate under a
    within-unit null (reference z about +1); burst.repAdj is a log ratio under a token-global null, where the burst documents dominate. The mapping chosen in classify-config.mjs therefore did not match the
    statistic's null; the failure is reported as it is (it is not hidden by editing the config) and is read as a limit of the control, not as evidence of a miscalibrated statistic, because the
    statistic is also exact on iid worlds and controls (no PRESENT cell there).
2.4 G0 reading: pl-frames/company-classes has no candidate statistic (declared in advance), so "every planted phenomenon recovered" cannot hold; 14 of 15 testable phenomena are recovered.

## Entry 3 (2026-10-07, classification run, atlas complete)
3.1 Provenance: results/provenance.json (atlas-provenance.mjs) records sha256 + mtime of every laws/*, loaders/*, lib, run-atlas, PROTOCOL and classify-* file. No file in laws/ or loaders/ (other than the new
    ctrl.mjs, written 02:20 CDT before the atlas started 02:21) was modified after the atlas started. laws/phys.mjs and laws/_phys_attr.mjs were last modified at 02:12 CDT (the phys builder's final edit,
    before this phase read them), so the atlas ran the final on-disk phys version in all six processes.
3.2 Correction of 2.3: the reason burst.repAdj is PRESENT+ in pl-mix (v +0.27/+0.46) is arithmetic, not a miscalibration: repAdj is the log of the POOLED adjacent-repeat rate over chance, the burst component
    has by far the highest absolute repeat rate (v +1.1 in pl-burst against -0.6 in pl-markov and -2.3 in pl-frames), so in linear space the 40% burst share outweighs the 60% below-chance share.
    repAdj is calibrated on law-free data (pl-null z +1.1/-0.1, pl-null2 +0.0/-1.3, the 20 shuffled-real controls: 0 PRESENT cells over 1,447 defined cells).
3.3 classify-atlas.mjs is deterministic: two consecutive runs gave identical sha256 for results/law-table.json and results/atlas-matrix.json.
3.4 G2 (atlas-g2.mjs, 3 pockets re-run in a fresh process): byte-identical except the wall-clock `seconds` field (see 0.5).

## Entry 4 (2026-10-07, final readings, report-only)
4.1 freq.abbrev, freq.lenCV and freq.lenLogSkew are z-inert (all three nulls keep unigram counts, string lengths and the multiset of unit lengths), so they are excluded from PRESENT/ABSENT and from selection. Read on raw v only
    (DESCRIPTIVE, not a protocol cell status): freq.abbrev (Spearman count vs code-point length over the 500 commonest types) is negative in 380 of 382 real pockets with >= 500 types (median -0.34;
    word grain -0.36, code -0.26, notation -0.42, char-bigram -0.12 where tokens have nearly constant length); the law-free value is 0 with sd about 1/sqrt(499) = 0.045, so the median is about 7.6 sd below it.
4.2 Sensitivity readings reported next to the headline statuses, none used for selection: word-grain-only status (21 of 81 statuses differ; para.prefixCopy and para.suffixCopy lose their REVERSAL status when code,
    notation and diagram pockets are removed, because their 3-4 negative pockets are all non-word-grain), z-undefined counts per statistic (para.formulaCov 148 of 391 pockets, 83 of them with the observation off a
    zero-variance null mean in one direction in both halves), and per-group PRESENT shares.
