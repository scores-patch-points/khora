# PREREG ant-kinds-novel (kinds of beings in long texts) — written in pieces; each piece is hashed (PREREG.sha256) BEFORE the script it covers is first run

## PIECE 0 — DISCLOSURE (2026-10-06, before any induction or ablation result of mine)
Seen before writing: eval/law/NAME-RULE-RESULTS.md (War and Peace: single-token slot-entry AUC 0.513, names leave LESS trace than frequency-matched words);
NAME-SHAPE-RESULTS.md (pooled PROPN shadow ~ random-set shadow); physics-handles/REPORT.md (fragility, i.e. one-mention shadow size, is FLAT above 3 mentions,
Spearman -0.009, with a CLIFF at the 2-mention floor: n=2 over n=3-4 about 2.1x, n=1 about 0.9); ant-kinds-ud/-chat/-shape summaries in marks (company kinds are coarse and
POS-like on short UD sets; IRC nick position confound: 92% of nick mentions are message-initial). One timing probe of impact.mjs on War and Peace (sentence 5000, M=128):
snapshot 215 ms, 113 ms per token, that window had 0 heard beings, 498 edges, 263 figures. No kind, no curve, no cast result was seen. Pride and Prejudice was opened only
to find where the story starts and ends (line 673 of pg1342; "CHISWICK PRESS" at the end), no counts.
CHOICE OF SECOND NOVEL (made before looking at any result): Pride and Prejudice, ethos/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt (Austen, 1813; an
English novel with titles Mr/Mrs/Miss, persons, places, in a different author, register and translation status from Maude's Tolstoy). Dracula is NOT used (kind-standing.js
was developed by reading it live).
MACHINE: stream/readers are impact.mjs's three prior-free readers, M=128, frame-causal F=0 (self sentence + the 128 before), A-DEL ablation. No capital, no POS, no prior, no
word list in anything that induces, reads or scores. Capitals and the cast file are used ONLY to DESCRIBE or SCORE kinds after they are induced.

## PIECE 1 — (a) INDUCING KINDS FROM COMPANY ON WAR AND PEACE, AND WHERE THE CAST FALLS
Method (lib.mjs `induce`, every typed number said): forms = lowercase NFC word units (apostrophes folded to '), n >= NMIN=20 (below ~20 mentions a form has under 40
context tokens spread over thousands of context types, so its vector is sampling noise; thinner forms 5<=n<20 are assigned to a kind afterwards by descending the tree).
Features = the token before and after each mention (kind-standing.js's company: sentence edge is its own token '^' '$'), context vocabulary = forms with n >= CTXMIN=50
(plus ^ $), weight sqrt(count) (variance stabilising; raw cosine is dominated by 'the'), then a seeded random projection to d=192 and L2-normalisation (cost only).
Number of kinds DERIVED, not set: recursive bisection by spherical 2-means; a node splits only if the 2-partition is reproduced by clusterings fitted on DISJOINT
block-random halves of the text (blocks of 100 sentences; 10 observed halvings), measured by the ARI between the two clusterings' labels of the same forms, and the median
observed ARI exceeds the MAXIMUM of 20 draws of the same statistic on company-shuffled text (within-sentence shuffle, marginals kept; p <= 1/21). A child must hold >= MINLEAF=30
forms (a kind needs enough forms for token cells and a size-matched random-partition null). K = number of leaves.
CLAIMS AND FALSIFIERS (War and Peace):
 K1a K >= 4 leaves.                        FALSIFIED if K <= 3.
 K1b the same pipeline on a company-shuffled book yields <= 2 leaves (shuffle must collapse the kinds).   FALSIFIED if > 2.
 K1c halves: the induction run separately on even-blocks and odd-blocks (nmin 10, ctxmin 25) gives partitions with ARI(common forms) > the maximum of 500 permutations of
     one partition's labels within log2-frequency bins (keeps sizes and frequency mix) and ARI >= 0.25 (typed: a quarter of the way from chance to identity).
 K1d NOT JUST FREQUENCY: NMI(kind, log2 frequency bin) of the real kinds < 0.5 (typed: frequency explains under half the shared information).
 C1 CAST: the 48-referent cast (cast core forms = tokens of `name` + surnames - title-like tokens shared by >= 3 displays; lib.mjs castWP) that have a kind (n>=20 or thin
    assigned): the leaf with most of them holds >= 50% of them AND the hypergeometric tail p < 1e-6 of that many cast forms in that leaf.  FALSIFIED otherwise.
 C2 DESCRIBE (not gating): for every leaf, size, token share, mean capital share (non-initial occurrences, descriptive only), top members, top contexts, cast count; say
    which leaves look like persons / places / groups / titles / common nouns.
 C3 Prediction (blind): persons are NOT one kind: surnames-after-title and first names fall in >= 2 leaves; some place/nationality words with capitals form their own leaf.
(Disclosure added before the full run of induce.mjs: a SMOKE of induce.mjs on the first 6000 sentences only ran first (7 leaves, cast top-kind share 0.79). It tested the
code, not a claim; no parameter above was changed after it. The registered result is the full-book run, results/kinds-wp.json.)

## PIECE 2 — (b) JOINT ABLATION PER KIND vs FREQUENCY- AND POSITION-STRATIFIED RANDOM SETS (joint.mjs; kinds from piece 1)
Windows: W=8 windows of M=128 sentences (+ the self sentence = window end), frame-causal F=0, ends evenly spread over [M, N). Per kind (every leaf of piece 1) delete ALL
tokens of its forms in the window at once and read with the same prior-free readers and the held null ceiling (as name-shape.mjs `joint`). Recorded per (kind, window):
SHADOW shape (24 = 4 slot families x 6 delta types, counts of changed records / their sum), MAGNITUDE (changed / all records), DIRECT vs COLLATERAL changed records,
IMPRINT (distinct slots the kind's tokens fill: end1, label, end2, entry, plus tokens filling none), AMPLIFICATION = collateral / direct.
CONTROLS BUILT TO FAIL: (R1) RAND-SET: per kind and window 6 sets of the SAME number of tokens drawn from tokens of OTHER kinds, matched token-for-token on log2 book
frequency of the form AND on within-sentence position class (initial / final / middle) — the position confound (ant-shape, boss) — falling back to frequency only when a cell
is empty (the fallback share is reported); (R2) RAND-PARTITION: 12 relabellings of all kinded forms that keep every kind's number of forms and shuffle labels among forms of
the same log2-frequency bin (a random partition of the same sizes and frequency mix), each read exactly like the real partition; (R3) sham (delete nothing): 0 changed.
TESTS: J1 SPECIFIC: cos(pooled shadow shape of kind k, pooled shadow of its R1 draws) < q05 of the cosines between pairs of independent R1 draws of k (pooled over kinds with
>=2 draws); J2 same for the imprint; J3 AMPLIFICATION: amp_k > mean R1 amp in >= 6 of 8 windows; J4 (this is K2): Dbetween = mean pairwise (1 - cos) of the kinds' pooled shadow
shapes exceeds the q95 of Dbetween over the 12 R2 partitions.  FALSIFIED if J4 fails (kinds do not differ more than random partitions of the same sizes).
PREDICTIONS (blind): PJ1 the kind holding most of the cast is NOT J1-specific (cos to its random set >= q05; the pooled-PROPN result 0.98 of NAME-SHAPE-RESULTS reappears
at kind level once position and frequency are matched). PJ2 J4 HOLDS (>= q95) but is carried by kinds that differ in token mass/structure (function-like kinds), not by the person kind.
PJ3 the cast kind's amplification exceeds its random sets in < 6 of 8 windows. PJ4 sham = 0.

## PIECE 3 — (c) FRAGILITY vs MENTION COUNT, PER KIND (fragility.mjs; kinds from piece 1; War and Peace first, then the second novel with the same code)
UNIT: one deleted mention (A-DEL), token at (s, i), s >= M=128, window = M sentences before + the self sentence (frame-causal), impact.mjs impactOfToken (keepDeltas). Form length
>= 3 only (the reader ignores shorter units, impact.mjs `minWordLength`: they cannot be heard and their curve would be the floor artefact itself).
MENTION COUNT m = occurrences of the form in the window's sentences [s-128, s] counting the deleted one (exactly the reader's tally). Reader floor: heardBeings/figures need >= 2
mentions in the window, so m=1 deletions cannot touch any being or figure of the form (only company of neighbours), m=2 deletions REMOVE the form below the floor (the whole being
or figure goes: the cliff), m>=3 deletions leave the form heard and change only that mention's own slots. This is a mechanism statement made before looking.
BINS of m (typed, half-octave resolution above the floor): {1}, {2}, {3}, {4-5}, {6-9}, {10-17}, {18-33}, {34+}.
DEPENDENT VARIABLES (fixed here): D1 (primary, the "size of the slot change") = log2(1 + changed), changed = number of non-unchanged typed slot records; D2 trace = changed>0;
D3 = changed records in the ref-entry family; D4 = extent.tokens. Descriptors: isFigure, isBeing (form in the reading-of-X0's figure set / being list), position class
(I initial / F final / M middle), log2 book frequency of the form.
SAMPLE: cells kind x m-bin, up to NCELL=30 tokens uniform over tokens of the cell (so every kind has a curve) + the CAST (castWP core forms): up to 40 cast tokens per m-bin,
each with two controls drawn from non-cast tokens: CTRL-F matched on (m-bin, log2 book frequency bin, position class) and CTRL-K matched on (m-bin, same kind, position class),
falling back to dropping position class when empty (fallback share reported). Pooled curves are POST-STRATIFIED to the real token counts of each (kind, m-bin) cell.
TESTS AND FALSIFIERS (blind predictions after each):
 F1 CLIFF: pooled mean D1(m=2) - mean D1(m=3) > 0, block-bootstrap (20 position blocks, B=1000) lower bound > 0.   Pred: HOLDS (physics-handles: ~2x at n=2 vs 3-4; n=1 lowest).
 F2 FLAT ABOVE THE FLOOR: for m>=3 the slope of D1 on log2 m: pooled (post-stratified) |b| < 0.10 log2-units per doubling AND its bootstrap interval contains 0.  Pred: HOLDS.
    DEPARTING KIND = a kind (>= 100 tokens, >= 3 occupied bins with m>=3) whose slope interval excludes 0; SIMPSON REVERSAL = a departing kind whose slope sign is opposite to the pooled
    slope's point sign. Pred: >= 1 departing kind (guess: the kind(s) holding names rise or fall) but reversals are rarer than that: reversals <= 1.
 F3 FORM: per kind, leave-one-block-out CV picks among CONST (one level), FLOOR (separate levels for m=1, m=2, m>=3), FLOOR+LOG (FLOOR with a log2 m slope above 3), LOG (a + b log2 m over
    all m), HYP (a + b/m). Pred: FLOOR is the CV winner in >= 60% of kinds with data at m in {1,2,>=3}; neither LOG nor HYP (power-law-like) wins pooled. (Power law is not assumed; it is a candidate.)
 F4 CAST vs MATCHED: paired difference D1(cast) - D1(CTRL-F) and vs CTRL-K, averaged over m-bins >= 3, bootstrap interval.  Pred (blind): |diff| < 0.2 and interval contains 0 (the novel's
    null persists once position and frequency are matched); at m=2 the cast is NOT more fragile than controls.  FALSIFIED (the user's claim that the cast sits on a different curve is
    SUPPORTED) if the interval excludes 0 above the floor or the cast-by-log2 m slope differs from CTRL-F's with interval excluding 0.
 F5 KIND HETEROGENEITY (K2 for fragility): H = variance across kinds of the kind's mean D1 deviation from the post-stratified pooled curve over m-bins >= 3 (levels), and H_slope = variance
    of per-kind slopes. Null: kind labels permuted among forms within the same log2-frequency bin (same sizes, same frequency mix), 1000 draws. Pred: H > q95 (kinds differ in LEVEL), H_slope <= q95
    (curves are parallel: same flat shape, different level).
 F6 POSITION: the cast/names are not merely sentence-initial: the share of tokens in position class I in the cast vs CTRL-F is reported; F4 is reported also within position class M only.
CONTROLS BUILT TO FAIL: S1 sham deletion (a space) of 100 sampled tokens must give changed=0; S2 determinism: 40 tokens re-read must reproduce every record hash; S3 company-shuffled
book (600 tokens of the same cells; forms keep their real-book kind label): the FLOOR cliff must SURVIVE (it is a count rule) and kind heterogeneity H must fall to its null q95; reported, not gating.

## DISCLOSURES BEFORE THE FULL RUNS OF pieces 2-3 (2026-10-06, written after seeing the kinds, before any joint or fragility result of the full book)
 - SMOKE runs of joint.mjs and fragility.mjs (2 windows / 261 tokens, kinds induced on the first 6000 sentences only) were run to test the code; they showed a cliff m=2 over m=3 of about 1.8
   log2-units, a flat slope above the floor and FLOOR as CV winner in 6/7 kinds; no parameter or prediction was changed after them. The registered numbers are the full runs.
 - The full-book induction (piece 1) was seen before pieces 2-3 were RUN (not before they were written): 12 leaves; the cast (62 core forms with a kind) falls 49/62 in ONE leaf (kind 10,
   592 forms, 37% of tokens, which also holds the pronouns and determiners: the subject-position kind, node r011), the rest in kind 11 (nouns). r011 failed the registered split test by a
   whisker (median ARI 0.787 vs null maximum 0.799) and r1 (nouns) failed clearly (0.53 vs 0.74). Reported as is; the stopping rule is NOT retuned.
 - EXPLORATORY DIAGNOSTIC C4 (not gating, declared as post-hoc, labelled so in the report): inside kind 10, can company vectors alone separate cast forms from the other forms? Leave-one-out
   cosine to the mean of the other cast forms, AUC against non-cast forms of kind 10 matched on log2 frequency. Uses the cast as GOLD for scoring only.

## PIECE 4 — (d) SECOND NOVEL: PRIDE AND PREJUDICE (chosen in piece 0), same code, fresh data (no result of it seen before this piece)
Pipeline identical (induce.mjs, joint.mjs, fragility.mjs with --novel pp; kinds induced on Pride and Prejudice alone; every parameter as in pieces 1-3, M=128, same bins).
Independent gold for P&P (no cast file exists): a hand-written list of person-name forms of the novel, written by me from my knowledge of the book now, before looking at any count:
 elizabeth lizzy eliza jane darcy bingley bennet wickham collins charlotte lydia kitty catherine lucas gardiner georgiana hurst caroline denny phillips philips forster fitzwilliam
 bourgh maria harriet hill reynolds william charles george fanny anne jenkinson.  ("long", "miss", "mr", "mrs", "lady", "sir", "colonel", "aunt", "uncle", "sister" are NOT in it:
 common words or titles.) It is used only to score kinds (C1-style) and to define the cast arm of F4, never in induction or reading.
REPLICATION CLAIMS (each FALSIFIED when it fails; a failure means the War and Peace result was one book):
 R1 K1a/K1b/K1c/K1d hold as in piece 1.  R2 C1: the leaf holding most of the P&P person names holds >= 50% and hypergeometric p < 1e-6.
 R3 F1 cliff m=2 over m=3 > 0 with CI > 0.  R4 F2 pooled flat above floor (as defined) .  R5 F4 same verdict as in War and Peace (interval contains 0 or not; sign if not).
 R6 F5 H and H_slope pass/fail the same way as in War and Peace.  R7 J4 same verdict as in War and Peace.
