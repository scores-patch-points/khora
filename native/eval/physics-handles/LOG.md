# LOG — physics handles (2026-10-06)

Running log so nothing is lost if the session stops. Newest entries at the bottom. Files in this directory are ALL new; no existing file is edited.

## 15:40 orientation (read, not run)
- Read: THE-HOLOGRAPH, THE-WHEEL, THE-CORE-MECHANISM, kernel/activation.js, BEINGS-LADDER, NAME-RULE-RESULTS, impact.mjs (slot ablation instrument), name-rule-informal.mjs, name-shape.mjs (header + code), listening-cast deriveCast/dmdWindow use, memory notes.
- Old scaffolding /private/tmp/claude-501/physics: space/ (PPMI+SVD prototype with gates G1-G6, plant.mjs power check) produced only a FIRST-RUN note: the kernel rule (excess lag-MI above shuffle band) returned reach_exceeds_candidates at Dmax=32 (fast local component, ~5 tokens, over a plateau 0.05-0.09 bits that never reaches the within-doc shuffle null) and the held-out PPMI rank rule was DEFECTIVE (negative Pearson at every k). Only the ear arm wrote results. dynamics-map/ is cost sizing, explicitly "not results". typology/ is a different (word-order typology) job; its genealogy labels are typed from memory and unverified. Verdict: none of it establishes any physical handle; the one reusable fact is the lag-MI shape (local part + long plateau), which I re-measure here.
- Machine: load 138-236 on 8 cores, but measured wall/CPU slowdown is only ~2x. Real reader cost: M=128 snapshot ~0.3 s, one ablation re-read ~0.4 s (eng DEV).
- name-shape.mjs is RUNNING (pid seen at 15:46, eng done in 70 s). I do not touch eval/law/results/name-shape/. At the end I will COPY its per-stem json files to the scratchpad and run its `report` there (read-only on theirs).

## plan (decided before any run)
1. lib.mjs (loaders, stats). 2. reader-handles.mjs (mass additivity, inertia, density, horizon, force law in the reader, conservation; the long job: start first, run in background). 3. gravity.mjs (company attraction kernel, nulls, families). 4. curvature.mjs (company geometry, warp, geodesic, warp-vs-gravity, impulse arithmetic). 5. clock-energy.mjs (activation accounting, tick invariance of dmdWindow, burst memory). 6. equivalence.mjs (join). 7. report.
Discipline: header = pre-registration written BEFORE the first run of that file; sha256 of each header recorded below at the moment it is written. Smoke runs only on planted/synthetic streams or on UD DEV English (never on the sampled corpora), disclosed.

## 16:25 reader-handles.mjs header written (pre-registration) — sha256 of header (first line to END marker) = 23f812eddcf279682cf20fb4dcbb539d1a692571c25c5c99b1a57c162bcbfb03
- lib.mjs written (loaders, stats). Families (derived by k-means K=3 on role-config subject-before / object-before): strict-SVO-like {eng cmn cmn-hans fra por vie ind swe}, SOV-like {fas kor jpn nld hin urd tur}, freer-order {spa rus arb heb deu ita pol ukr ell fin}.
- Next: smoke run of reader-handles on ud:eng:dev (2 snapshots; NOT in any verdict), then launch real waves in background (irc, wp, ud:{eng,spa,deu,hin,fas,tur}:A).

## 16:50 reader-handles.mjs header AMENDED before any real run (timing smoke showed 2-3 s per snapshot, not 20 s): S 24 -> 150 per corpus, thresholds "of 8" -> "60% of corpora passing K5", corpora and waves paragraph added. New header sha256 = 7af658b90aae3803c93ef81b4fa18ab300e2a724e9feac18068d0d2900cd8c98
- Smoke runs (not in any verdict): ud:eng:dev x2 snapshots (structure check; K1 sham 0 changed of 875 slots, K2 determinism true), irc wave 9 x1 and wp wave 9 x1 in /private/tmp/claude-501/ph-scratch/smoke (timing and K1/K2 only; seconds 1.8 and 2.9).
- Observation from the smoke that matters for the design: a deletion at n=1 can still change slots (e.g. "itself" n=1: S=3) because relation edges carry connector words in their labels; the readers are not deaf to n=1 tokens at the relation tier. The n=1 deletions are the adjacency/label BASELINE (already in the header as I5), not zero.
- LAUNCHING wave 1 in the background: results in native/eval/physics-handles/results/reader/*.jsonl (3 parallel streams).

## 17:15 plant.mjs header written (pre-registration of the power check) sha256 = be0a486101dc788ef839ad05cc328d8b22492c420e721a53360a543a6d5e5626
- attraction.mjs written (TV/KL company kernel, random-placement baseline, pooled curves, power-vs-exponential fit, body bootstrap). plant.mjs about to run (synthetic only).
- Reader wave 1 running in the background (3 streams).

## 17:50 planted-law power check (plant.mjs): three runs, two estimator defects found and fixed, rules unchanged
- run 1 (plug-in total variation; header v1 sha be0a486101dc788ef839ad05cc328d8b22492c420e721a53360a543a6d5e5626, results/plant.first-run.json): V1 FAILED (alpha 0.5/1.0/1.5 recovered 0/6/2 of 10; mean fitted 0.15/0.88/0.83). Diagnosis: TV saturates near 1 at small samples (A(1)=0.015 vs planted 0.5). FIX: unbiased excess-coincidence estimator (attraction.mjs header).
- run 2 (coincidence estimator, log-fit on bins above the band; results/plant.second-run.json): alpha 0.5 recovered 10/10 (mean .529), alpha 1.0 4/10 (mean .866), alpha 1.5 gaps. Diagnosis: selecting bins above the band truncates noise and biases the tail up. FIX: weighted LS in linear space over all bins (fitWeighted).
- run 3 (scale 1; results/plant.third-run-scale1.json): unbiased (means .524 / 1.07 / 1.42) but per-seed precision at alpha=1 about +-0.2 (4/10 within +-0.15) and alpha=1.5 mostly gaps: V1 FAILS as registered at scale 1.
- run 4 (scale 4 = ~9,600 mentions, the order of the real corpora; header sha 08438495de60bfe61c970157b406f479f976bbe3fe53221b977661244b1fecc0; results/plant.scale4.json): VALID. recovered 10/10, 10/10, 8/10 (means .52, 1.012, 1.5), exponential 10/10, null 10/10 gaps.
- Reading: the attraction estimator is validated for exponents up to ~1.5 at >= ~10^4 mentions; on a corpus with fewer, treat a reported exponent as underpowered. Thresholds were never changed; the scale-4 variant was added and both scales are reported.

## 18:05 gravity.mjs header written (pre-registration) sha256 = c5d29e2ac02cb56460bd54456f4d2c64f5208b50e81df94b81e8eb69014fabce
- Timing/plumbing smoke on ud:eng:dev only (3.5 s). I saw one summary line from it (alpha 1.24, dAIC 25, 5 bins above the band); the header predictions (PG2 exponent in [0.2, 1.0]) were already written. Dev is in no verdict.
- LAUNCHING gravity runs: UD fold A and B for the 25 stems, irc, wp, sms, cosem, and --half H1 versions (for equivalence) of the reader corpora.

## 18:35 curvature.mjs header written (pre-registration) sha256 = 56f4c0fc6c13a18aeec1aa7a583bb87063a3178eca08d7309df8b765604e2ea5
- Smoke on ud:eng:dev only (24 bodies, 8.6 s, K1 sham C=0, K2 determinism true). One structural fact seen in the smoke (a property of the construction, not a result): MASK and COLDROP give identical C by construction in this geometry (a placeholder that is not a context type acts exactly as dropping the column), so C4 is read as COLDROP/DELETE and the MASK arm is redundant; stated in the report.
- LAUNCHING curvature runs (full and --half H1): irc wp, UD folds A and B for eng fra spa deu hin fas tur jpn.

## 19:20 reader wave 1 complete (10 corpora x 150 snapshots). Launching wave 2 (confirmation: UD fold B, irc seed irc-w2, wp grid shifted) BEFORE reading any wave-1 result, so the replication is blind to them.

## 19:45 resumed after watchdog. State: gravity runs DONE (72 files); reader wave 1 DONE and report w1 computed (results/reader/_report.w1.json); reader wave 2 and curvature runs STILL RUNNING (polling in short steps). hin-A fails K5 (share 0.13), all others pass. K1 sham 0 changes in all 10 corpora x 150 snapshots; K2 determinism holds.
- Wave-1 first read: MASS-ADD far pairs ratio exactly 1 in 99.9% (additive), K3 informativeness gain 0.46 (not vacuous); mention-additivity SUB-additive at n=2 (whole 4.5 vs sum of parts 9.5) — predicted super-additive (P2) is FALSIFIED.

## 19:55 wave-1 reader results read (pre-registered rules applied by reader-report.mjs; nothing re-tuned). Headlines: far pairs additive (ratio 1.000 in 99.9%); mentions of one body exactly additive from n=3 (91% equal) but SUB-additive at n=2 (floor cliff, whole 4.5 vs parts 9.5) so P2 (super-additive) FAILED; INERTIA hypothesis FAILED: n>=3 fragility is flat in n (Spearman -0.009 [-0.029,0.009], CV form = constant), only a floor cliff (n=2 mean S 4.2 vs 2.0 at n=3-4, n=1 0.9); IRC nicknames stay more fragile than non-names WITHIN exact n (AUC 0.81) so P5 FAILED, W&P 0.53 and UD PROPN ~0.5; density: n, n/L and Born share all tie with the constant (no handle); horizon tracks recency only partially (rho 0.50 < 0.6) and has no mass scaling (partial -0.07 [-0.22,0.09]); reader force law: collateral change probability falls as r^-1.52 [1.38,1.69] beyond 2 tokens (power beats exp in 9/9) but 93.6% of changed collateral is at slot radius 1 (locality of the relation extractor); conservation: median net 0 (rule passes vacuously), mean emptied 1.18 vs born 0.02 (dissipative); collateral share 0.54.

## 20:10 gravity report computed (results/gravity/_report.json). Pre-registered rules applied as written. Headlines: PG1 24/33 corpora have >=6 bins above band (73% < 90%); PG2 power beats exponential in 20/31 (65% < 75%, > 50%: neither survives nor falsified); median amplitude exponent 1.14 (IQR .90-1.42), outside the predicted [0.2,1.0]; large corpora IRC 0.80 [0.78,0.84], SMS 0.66, CoSEM 0.82, W&P 1.12 (with a long plateau), eng-B 0.86; PG3 STABILITY FAILS (Spearman alpha_A vs alpha_B -0.11 on 13 powered languages; 0.13 on 21): the exponent is not a stable per-language constant at these sizes; PG4 family: alpha not family-specific (A p=.039 on 13 languages, B p=.73), asymmetry p=.18/.045: not shown on both folds; PG5: N1 (within-sentence shuffle) near-ratio median 0.02, far 0.98; N2 (sentence-order shuffle) near 1.00, far 0.01 -> the instrument responds exactly as it should, but the 75%-of-corpora rule narrowly fails for N1 (24/33); PG6 weakly negative (median rho -0.12, 21/33 < 2/3 needed); PG7 burst kernel is EXPONENTIAL not power (power wins in 2/21; lambda 3-36 sentences); PG8 dilation inconclusive; PG9 vacuum slope -0.14..-0.35 (not -0.5).
- ud-fra-A has burst L(d)=0 at every lag (its sentences are not in discourse order): a natural no-discourse control for the sentence-scale kernel.

## 20:25 curvature-report.mjs and reliability.mjs written. curvature-report tested on the 8 finished corpora only (rules unchanged): interim, NOT final: C1 excess-over-matched-random positive share median 0.48 (warp not distinguishable from "removing that many tokens"), C2 slopes 0.95 (delete) vs 0.89 (random), WG partial rho(E_even, C_odd | log n) about -0.06 in every corpus, momentum persistence R = 1.0003 (company stationary). reliability.mjs is a POST-HOC power diagnostic for WG (split-half reliability of per-body attraction energy); labelled as not pre-registered.

## 20:40 clock-energy.mjs header written (pre-registration) sha256 = 001970f0823e00ed519b1cfefb0fb68c43de90611a3c8a793f9cb3cadc5ab041. Disclosed in the header: the ceiling/gap distribution of the cast dmdWindow was read from reader wave 1 BEFORE this header (every found window = top candidate; 58-85% gaps).

## 20:50 clock-energy.mjs run (cheap). E1 identity FAILED and the reason is a CODE DEFECT, verified by hand: in kernel/activation.js observe() stamps a cell at t = now + 1 but decays the old value only to now, so a key observed on consecutive ticks is never decayed (a key observed every tick for 400 ticks has activationOf = 400.0, while total = 8.0 = W for W=8 and the intended steady state is W); sum over keys of activationOf != total. Keys observed once decay correctly (gamma^t). Effect: per-key activation of a continuously present being grows with its count instead of saturating at W. (Not edited: no existing file is touched; reported.) E1b steady state of the total = s*W within 1% (holds); E1c same decay factor for all keys (holds: no body-dependent decay exists in the code: no time dilation mechanism). E2: all 24 (corpus, grouping) cells are the top candidate or the typed gap (ceiling share 1.0): the cast-conclusion dmdWindow never measures a duration; PE2 holds.
- 20:55 launched an extra stream for curvature --half H1 of fold A (wp, 8 UD) so the equivalence join does not wait for the tail of the B stream; the B stream will later recompute the same H1 files (deterministic, identical).

## 21:05 equivalence.mjs header written (pre-registration) sha256 = 3ca5319938d8eb20036ceaa69a3f492b7c1dc5d5ca5d39c773f31e7fa300ebaf. Disclosed in it: reader wave-1 headline (flat fragility) was read before; IRC excluded (reader and gravity/curvature half-runs use different channel-days: design gap).
- 21:15 name-shape (not mine) finished; read-only: eval/law/results/name-shape/_report.json: shapeExists FALSE, familySpecific FALSE (T1 1/20 informative, T2 12/25, T3 mean AUC .545, T4a p=.16, T4c imprint p=.90 collateral p=.21, T6 PROPN amplification 2.42 vs random 2.80, higher in 4/25).

## CORRECTION (real clock 17:40 on the machine): the HH:MM stamps written in the headings of entries after "15:40 orientation" were my estimates, not clock readings, and several run ahead of the machine clock (the machine says 17:40 now). Treat the ORDER of entries as the record, not the stamps; sha256 values and file contents are exact.
- (order note) stopped my own curvature stream-B loop (its fas-B child continues) and started stream E: tur-B, jpn-B full runs then the eight fold-B H1 runs; the irc/wp/A-fold H1 runs are in stream D (fold A) so nothing is duplicated.
- order note: reordered the fold-A H1 curvature stream so the eight UD corpora run before the slow wp.H1 (already running as its own process).
- order note: parallelised reader wave 2 (eng-B, fra-B, spa-B, hin-B as separate processes; irc w2, deu-B, tur-B, jpn-B continue in their own loops). Same code, same seeds: no change of design.
- (order) PHYSICS-HANDLES.md first full draft written with wave-1 reader, gravity, clock, name-shape numbers and INTERIM curvature numbers (11 corpora); sections 4, 7, 8, 11 and the wave-2 replication still to be finalised when jobs finish.
- resumed after a second watchdog stall: equivalence.mjs (header + code, ~70 lines) already exists; running it on wave 1 now (gravity half-run energies are complete; curvature H1 files are still being produced, so m_g2 is partial).
- REPORT.md part 1 (summary) written
- REPORT.md summary trimmed to <400 words
- REPORT.md section 1-2 written
- REPORT.md ledger 3a-3c written (curvature ledger 3d pending final numbers)
- REPORT.md sections 4-5 written
- REPORT.md sections 4-5 written
- REPORT.md 3d (curvature ledger) written from the 11-corpus interim report
- REPORT.md sections 6-9 written; remaining: wave-2 numbers, final curvature/equivalence refresh, PHYSICS-HANDLES.md edits, final message
- PHYSICS-HANDLES.md updated with equivalence numbers and explicit warp/gravity verdict
- wave-2 reader report computed on partial data (8 licensed corpora); REPORT.md section 7 rewritten with the replication table
- REPORT.md section 10 (state at end) written; final message next
