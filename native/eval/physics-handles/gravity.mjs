// eval/physics-handles/gravity.mjs — GRAVITY / ATTRACTION: how the company of a body falls off with distance, in tokens and in sentences; is the law a power with a stable exponent;
// does it depend on word order; what do the nulls do. Also the BURST CLOCK (self-attraction in sentence lags: is memory longer for heavier bodies?) and the VACUUM (the null band).
//
//   node eval/physics-handles/gravity.mjs run --corpus ud:<stem>:<A|B>|irc|wp|sms|cosem [--half H1] [--out DIR]
//   node eval/physics-handles/gravity.mjs report --out DIR
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file on any corpus) ════════════════════════════════════════════
// DISCLOSURE. Seen before this header: nothing produced by this file. The planted-law power check (plant.mjs, same attraction.mjs code path) was run first and went through two
// estimator fixes (plug-in TV saturates; selecting bins above the band biases the exponent) with its pass rules unchanged; the estimator is VALID at the scale of ~10^4 mentions and
// not at ~2,400 (results/plant.scale4.json, plant.third-run-scale1.json). The old scaffolding in /private/tmp/claude-501/physics/space reported a first-run lag-MI curve for English
// (a fast local component over a long plateau that never reached the shuffle null); that is the one prior observation, and it is a hint, not a prediction rule.
//
// OBJECT (attraction.mjs header holds the definitions): for a body b (a word type with >= 8 mentions in the corpus; at most 240 bodies per mention-count bin {8-15, 16-31, 32-63,
//   64-127, 128+}, drawn by seed) the EXCESS COINCIDENCE A_b(d) of the company of b at token-lag bins d = {1, 2, 3-4, 5-8, 9-16, 17-32, 33-64, 65-128} on each side, inside the
//   document, minus the mean of K = 5 random placements of b (K = 5 more give the null band: the largest |pooled null mean| per bin). The force-like AMPLITUDE is
//   a(d) = sqrt(pooled D(d)). Units: a distance between word distributions (dimensionless). The SENTENCE-LAG BURST kernel L(d) = observed / expected pairs of sentences both
//   containing b at sentence lag d in {1,2,3,4,6,8,12,16,24,32,48,64}, expected = (S - d) m (m - 1) / (S (S - 1)) for m sentences of b among S (exactly the sentence-permutation
//   null), minus 1; pooled as sum observed / sum expected. Typed numbers and why: 8 mentions (below it the unbiased estimator's noise exceeds the effect: plant.mjs scale 1); the cap
//   240 per bin (cost); dyadic lag bins (the repo's own ladder); K = 5 + 5 and B = 200 (cost); the 12-lag ladder (dyadic with 3/2 steps); everything else below.
// CORPORA. UD held-out folds A (fold80 tail) and B (fold80B tail) for the 25 stems of the competence card (cmn-hans is the same text as cmn in another script: it is run but excluded
//   from every across-language statistic); informal English: Ubuntu IRC (6 channel-days), NUS SMS (en), CoSEM (Singlish chat); a novel: War and Peace (Maude). UD word segmentation
//   (including Chinese and Japanese) is the treebank's, not the readers' ear (a stated limit). Documents: `# newdoc` for UD; channel-days; files; the book. Lags never cross documents.
//   WORD-ORDER FAMILIES are derived from the role-config priors (subject-before and object-before shares; k-means K = 3: strict-SVO-like, SOV-like, freer-order; lib.mjs).
// LAWS, FALSIFIERS, PREDICTIONS (blind; thresholds fixed here, "bare provisional numbers" in the repo's SESOI practice, not changed after any result).
//  G1 EXISTENCE. Law: bodies attract their company at range. Rule: D(d) above its null band in >= 6 of 8 token bins. FALSIFIED (no attraction) if < 4 bins in >= 50% of the corpora.
//     Prediction PG1: >= 6 bins in >= 90% of the corpora with >= 10^4 mentions.
//  G2 FORM. Law: the attraction decays as a power of the distance. Rule: the weighted fit over all 8 bins (attraction.mjs fitWeighted) has dAIC >= 4 for the power over the exponential
//     (point estimate AND >= 80% of the body-bootstrap resamples). The power law SURVIVES iff it wins in >= 75% of the corpora that have a fit; FALSIFIED if it wins in < 50%.
//     Prediction PG2: it survives; the pooled median amplitude exponent alpha lies in [0.2, 1.0].
//  G3 STABILITY. Law: the exponent is a property of the language, not of the sample. Rule: over the languages with a fit on both folds, Spearman(alpha_A, alpha_B) >= 0.6 AND the median
//     |alpha_A - alpha_B| <= 0.15. Prediction PG3: holds.
//  G4 FAMILY. Law (the user's belief): structure is specific to word-order families. Rule: permutation test (B = 10,000, labels permuted) of (mean |alpha_i - alpha_j| across families minus
//     within families) p <= 0.05 on BOTH folds; the same test for the LEFT/RIGHT ASYMMETRY at the two shortest lags, (D_right - D_left) / (D_right + D_left) at d in {1, 2}.
//     Prediction PG4: alpha is NOT family-specific (p > 0.05 on at least one fold: the range of attraction is a property of discourse, not of order); the asymmetry IS (p <= 0.05
//     on both folds: the direction of attraction is a property of order). Either way a measurement of the user's belief, not a confirmation of it.
//  G5 NULLS (controls built to fail). N3 random placement: D within its band by construction (instrument control: it is the baseline). N1 WITHIN-SENTENCE SHUFFLE (company inside a
//     sentence destroyed, membership kept): predicted PG5a the ratio A_N1 / A_real at d in {1, 2} is <= 0.5 and at d in {33-64, 65-128} is >= 0.75, in >= 75% of corpora.
//     N2 SENTENCE-ORDER SHUFFLE inside the document (cross-sentence company destroyed): predicted PG5b the ratio at d in {33-64, 65-128} is <= 0.5 and at d in {1, 2} >= 0.75, in >= 75%
//     of corpora. The burst kernel L(d) under N2 must lie inside its band (instrument control). If the exponent is fitted on a shuffled corpus it is reported as such; "the exponent
//     differs in the null" means: the typed gap (no law) under N3, and a different curve under N1/N2.
//  G6 NOT A CONSTANT. Law: per-neighbour attraction does not depend on the body's mass. Rule: Spearman between mention count n and A_b(d = 1) over bodies, block-bootstrap interval;
//     FALSIFIED (as a universal coupling) if the interval excludes 0 in >= 2/3 of the corpora. Prediction PG6: negative (frequent bodies pull each neighbour less): so the coupling
//     is a property of the body, not a constant G.
//  G7 BURST CLOCK. Law: bodies cluster in time; the clustering decays as a power of the sentence lag. Rule as G1/G2 on L(d) (12 lags; >= 6 above the band; power vs exponential,
//     dAIC >= 4 in >= 75% of corpora). Prediction PG7: holds. TIME DILATION (heavier bodies remember longer): reach(n bin) = the largest lag with L above its band; Spearman(n bin, reach).
//     Prediction PG8: no dilation, Spearman <= 0.3 in >= 60% of corpora (the burst reach is not longer for frequent bodies); if it is >= 0.5 in >= 60% the dilation metaphor survives.
//  G8 VACUUM. Law: the ground is empty and its fluctuation is counting noise. Rule: on three corpora (ud:eng:A, wp, irc) the null band (mean over the first three bins) at N/4, N/2 and N
//     tokens (document prefixes) has log-log slope in [-0.65, -0.35]. Prediction PG9: holds (slope about -0.5).
//  G9 SCALE. A corpus with fewer than 10^4 mentions among the sampled bodies is labelled UNDERPOWERED and enters no verdict (the planted check's scale rule).
//  NOT TESTED HERE: a cross-body (semantic) attraction between two DIFFERENT bodies b and c; the curvature and the warp-gravity relation (curvature.mjs); the reader's own
//  force law (reader-handles.mjs); the equivalence principle (equivalence.mjs, which reads the per-body energies written by `--half H1`).
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { HERE, STEMS25, seedFor, rngFor, mulberry32, shuffleInPlace, round, mean, median, quantile, spearman, blockBootstrap, permP, familiesOf, loadUD, loadIRC, loadWP, loadLines, SMS_ROOT, COSEM_ROOT, headerSha256, argv, sum } from "./lib.mjs";
import { buildIndex, pooledAttraction, summarizeAttraction, nullMeans, fitWeighted, energyOf, LAG_BINS, NLAG, LAG_CENTER, SENT_LAGS } from "./attraction.mjs";

const { opt, has, cmd } = argv();
const NMIN = 8, CAP_PER_BIN = 240, NEQ = 12, MENTION_FLOOR = 1e4;
const NBINS_N = [[8, 15], [16, 31], [32, 63], [64, 127], [128, Infinity]];
const nbinOf = (n) => NBINS_N.findIndex(([a, b]) => n >= a && n <= b);

async function loadCorpus(spec) {
  if (spec === "irc") return loadIRC(6, "irc-g");
  if (spec === "wp") return loadWP();
  if (spec === "sms") return loadLines(SMS_ROOT, "sms-en");
  if (spec === "cosem") return loadLines(COSEM_ROOT, "cosem");
  const [, stem, fold] = spec.split(":");
  return loadUD(stem, fold);
}
/** the first half of every document (UD slices are merged first: their documents are a few sentences long), for the equivalence test */
function firstHalf(c) {
  const docs = c.kind === "ud" ? [{ sents: c.docs.flatMap((d) => d.sents) }] : c.docs;
  return { ...c, docs: docs.map((d) => ({ ...d, sents: d.sents.slice(0, Math.floor(d.sents.length / 2)) })) };
}
function pickBodies(ix, nmin, seed) {
  const bins = NBINS_N.map(() => []);
  for (let v = 0; v < ix.V; v++) if (ix.count[v] >= nmin) { const b = nbinOf(ix.count[v]); if (b >= 0) bins[b].push(v); }
  const rnd = mulberry32(seed), out = [];
  bins.forEach((arr, b) => { for (const v of shuffleInPlace(arr, rnd).slice(0, CAP_PER_BIN)) out.push({ id: v, nbin: b }); });
  return out;
}
const withinSentence = (docs, seed) => { const rnd = mulberry32(seed); return docs.map((d) => ({ ...d, sents: d.sents.map((s) => shuffleInPlace(s.slice(), rnd)) })); };
const sentenceOrder = (docs, seed) => { const rnd = mulberry32(seed); return docs.map((d) => ({ ...d, sents: shuffleInPlace(d.sents.slice(), rnd) })); };

// ── the sentence-lag burst kernel ───────────────────────────────────────────────────────────────────────────────────────────────────────
function burst(ix, bodies, { K = 10, seed = 1, B = 200 } = {}) {
  const maxS = Math.max(...ix.sentOf.map((so) => (so.length ? so[so.length - 1] + 1 : 0)));
  const mark = new Uint8Array(maxS + 1), nS = ix.sentOf.map((so) => (so.length ? so[so.length - 1] + 1 : 0));
  const rnd = mulberry32(seed);
  const perms = Array.from({ length: K }, () => nS.map((S) => shuffleInPlace(Array.from({ length: S }, (_, i) => i), rnd)));
  const nl = SENT_LAGS.length;
  const per = bodies.map(({ id, nbin }) => {
    const byDoc = new Map();
    ix.occDoc[id].forEach((d, i) => { const s = ix.sentOf[d][ix.occPos[id][i]]; (byDoc.get(d) ?? byDoc.set(d, new Set()).get(d)).add(s); });
    const N = new Float64Array(nl), E = new Float64Array(nl), Nk = Array.from({ length: K }, () => new Float64Array(nl));
    for (const [d, set] of byDoc) {
      const S = nS[d], P = [...set], m = P.length;
      if (S < 2 || m < 2) continue;
      const count = (sentences) => { for (const s of sentences) mark[s] = 1; const out = new Float64Array(nl); SENT_LAGS.forEach((lag, li) => { let c = 0; for (const s of sentences) if (s + lag < S && mark[s + lag]) c++; out[li] = c; }); for (const s of sentences) mark[s] = 0; return out; };
      const o = count(P); SENT_LAGS.forEach((lag, li) => { N[li] += o[li]; if (S > lag) E[li] += ((S - lag) * m * (m - 1)) / (S * (S - 1)); });
      for (let k = 0; k < K; k++) { const pk = perms[k][d], o2 = count(P.map((s) => pk[s])); for (let li = 0; li < nl; li++) Nk[k][li] += o2[li]; }
    }
    return { id, nbin, N, E, Nk };
  });
  const pool = (pick) => { const L = new Float64Array(nl), Lk = Array.from({ length: K }, () => new Float64Array(nl)); for (let li = 0; li < nl; li++) { let n = 0, e = 0; const nk = new Float64Array(K); for (const p of pick) { n += per[p].N[li]; e += per[p].E[li]; for (let k = 0; k < K; k++) nk[k] += per[p].Nk[k][li]; } L[li] = e > 0 ? n / e - 1 : NaN; for (let k = 0; k < K; k++) Lk[k][li] = e > 0 ? nk[k] / e - 1 : NaN; } return { L, Lk }; };
  const summarize = (pick) => {
    if (pick.length < 5) return { gap: "too_few_bodies", bodies: pick.length };
    const { L, Lk } = pool(pick), band = Array.from(L, (_, li) => Math.max(...Lk.map((x) => Math.abs(x[li]))));
    const r2 = mulberry32(seed + 3), boots = []; for (let t = 0; t < B; t++) boots.push(pool(Array.from({ length: pick.length }, () => pick[Math.floor(r2() * pick.length)])).L);
    const sigma = Array.from({ length: nl }, (_, li) => { const v = boots.map((b) => b[li]).filter(Number.isFinite); if (v.length < 3) return NaN; const m = mean(v); return Math.sqrt(sum(v.map((x) => (x - m) ** 2)) / (v.length - 1)); });
    const above = Array.from(L).filter((v, li) => v > band[li]).length, X = Array.from(SENT_LAGS);
    const fit = above >= 4 ? fitWeighted(X, Array.from(L), sigma, { squared: false }) : { gap: "too_few_usable_lags", usable: above };
    const alphas = [], dA = []; if (above >= 4) for (const b of boots) { const f = fitWeighted(X, Array.from(b), sigma, { squared: false }); if (f.alpha !== undefined) { alphas.push(f.alpha); dA.push(f.dAIC); } }
    const reach = SENT_LAGS.filter((_, li) => L[li] > band[li]).pop() ?? 0;
    return { bodies: pick.length, L: Array.from(L), band, sigma, above, fit, alphaCI: alphas.length ? [quantile(alphas, 0.025), quantile(alphas, 0.975)] : null, dAICshare: dA.length ? dA.filter((d) => d >= 4).length / dA.length : null, reach, nullInBand: Array.from({ length: K }, (_, k) => Array.from(Lk[k]).every((v, li) => Math.abs(v) <= band[li] + 1e-12)).filter(Boolean).length };
  };
  const all = per.map((_, i) => i), out = { all: summarize(all), byNbin: NBINS_N.map((_, b) => summarize(all.filter((i) => per[i].nbin === b))) };
  const reaches = out.byNbin.map((s) => (s.reach ?? null)), idx = reaches.map((r, b) => b).filter((b) => reaches[b] !== null);
  out.dilation = { reaches, spearman: idx.length >= 3 ? round(spearman(idx, idx.map((b) => reaches[b]))) : null };
  return out;
}

// ── one corpus ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function analyze(c, { half = false, controls = true, vacuum = false } = {}) {
  const t0 = Date.now(), tag = c.name + (half ? ".H1" : "");
  const ix = buildIndex(c.docs), nmin = half ? NEQ : NMIN;
  const bodies = pickBodies(ix, nmin, seedFor("gravity-bodies", tag));
  const mentions = sum(bodies.map((b) => ix.count[b.id]));
  const res = { corpus: c.name, kind: c.kind, stem: c.stem ?? null, fold: c.fold ?? null, half, tokens: ix.N, docs: ix.nDocs, types: ix.V, bodies: bodies.length, mentions, underpowered: mentions < MENTION_FLOOR };
  const pooled = pooledAttraction(ix, bodies.map((b) => b.id), { seed: seedFor("gravity", tag) % 100000 });
  res.token = summarizeAttraction(pooled, { B: 200, seed: 7 });
  const picks = (b) => pooled.per.map((p, i) => (bodies[i].nbin === b ? i : -1)).filter((i) => i >= 0);
  res.tokenByNbin = NBINS_N.map((_, b) => { const pick = picks(b); const s = summarizeAttraction({ per: pooled.per, pick }, { B: 100, seed: 11 + b }); return pick.length >= 5 ? { bodies: pick.length, D: s.D, band: s.band, amplitudeBin0: s.amplitude?.[0] ?? null, fit: s.fit ? { alpha: s.fit.alpha ?? null, gap: s.fit.gap ?? null } : null } : { bodies: pick.length, gap: "too_few_bodies" }; });
  const A0 = pooled.per.map((p) => p.A[0]), nn = pooled.per.map((p) => p.n), ok = A0.map((v, i) => i).filter((i) => Number.isFinite(A0[i]));
  const bs = blockBootstrap(ok.map((i) => i), (rows) => spearman(rows.map((r) => nn[ok[r]]), rows.map((r) => A0[ok[r]])), { B: 300, seed: 5 });
  res.massDependence = { spearmanNvsA1: round(bs.point), lo: round(bs.lo), hi: round(bs.hi), bodies: ok.length };
  res.asym12 = (() => { const L = res.token.DLeft, R = res.token.DRight; if (!L || !R) return null; const f = (b) => (R[b] + L[b] !== 0 ? (R[b] - L[b]) / (R[b] + L[b]) : null); return { d1: round(f(0)), d2: round(f(1)), mean: round(mean([f(0), f(1)].filter((x) => x !== null))) }; })();
  res.burst = burst(ix, bodies, { seed: seedFor("burst", tag) % 100000 });
  res.energies = half ? pooled.per.map((p, i) => ({ w: ix.words[p.id], n: p.n, E: round(energyOf(p.A), 6), A: Array.from(p.A, (v) => round(v, 6)) })) : undefined;
  if (controls && !half && !res.token.gap) {
    const mapBodies = (ix2) => bodies.map((b) => ({ id: ix2.id.get(ix.words[b.id]), nbin: b.nbin })).filter((b) => b.id !== undefined);
    const runCtl = (docs2, label) => { const ix2 = buildIndex(docs2), b2 = mapBodies(ix2), pl = pooledAttraction(ix2, b2.map((b) => b.id), { seed: seedFor("gravity-ctl", tag, label) % 100000, kBase: 3, kBand: 2 }); const s = summarizeAttraction(pl, { B: 50, seed: 13 }); const bu = burst(ix2, b2, { K: 5, seed: 17, B: 50 }); return { D: s.D, band: s.band, burstL: bu.all.L ?? null, burstBand: bu.all.band ?? null, burstNullInBand: bu.all.nullInBand ?? null }; };
    res.N1 = runCtl(withinSentence(c.docs, seedFor("n1", tag)), "n1"); res.N2 = runCtl(sentenceOrder(c.docs, seedFor("n2", tag)), "n2");
    const ratio = (ctl, bins) => { const real = bins.map((b) => res.token.D[b]), c2 = bins.map((b) => ctl.D[b]); const r = sum(real); return r > 0 ? round(sum(c2) / r) : null; };
    res.controlRatios = { N1_near: ratio(res.N1, [0, 1]), N1_far: ratio(res.N1, [6, 7]), N2_near: ratio(res.N2, [0, 1]), N2_far: ratio(res.N2, [6, 7]) };
  }
  if (vacuum) {
    const sizes = [0.25, 0.5, 1], rows = [];
    for (const f of sizes) { const total = ix.N; let used = 0; const docs2 = []; for (const d of c.docs) { if (used >= f * total) break; const toks = d.sents.reduce((a, s) => a + s.length, 0); if (used + toks <= f * total) { docs2.push(d); used += toks; } else { const keep = []; let u = 0; for (const s of d.sents) { if (used + u + s.length > f * total) break; keep.push(s); u += s.length; } if (keep.length) docs2.push({ ...d, sents: keep }); used += u; } }
      const ix2 = buildIndex(docs2), b2 = pickBodies(ix2, NMIN, 99).map((b) => b.id), pl = pooledAttraction(ix2, b2, { seed: 5 }), s = summarizeAttraction(pl, { B: 30, seed: 9 });
      rows.push({ fraction: f, tokens: ix2.N, bodies: b2.length, band012: s.band ? mean(s.band.slice(0, 3)) : null }); }
    const xs = rows.filter((r) => r.band012 > 0).map((r) => Math.log(r.tokens)), ys = rows.filter((r) => r.band012 > 0).map((r) => Math.log(r.band012));
    const mx = mean(xs), my = mean(ys); let sxx = 0, sxy = 0; xs.forEach((x, i) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (ys[i] - my); });
    res.vacuum = { rows, slope: xs.length >= 3 && sxx > 0 ? round(sxy / sxx) : null };
  }
  res.seconds = round((Date.now() - t0) / 1000, 1);
  return res;
}

async function run() {
  const spec = opt("--corpus", null); if (!spec) throw new Error("--corpus is required");
  const OUT = opt("--out", path.join(HERE, "results", "gravity")), halfMode = opt("--half", null) === "H1";
  let c = await loadCorpus(spec); if (!c) throw new Error(`no corpus ${spec}`);
  if (halfMode) c = firstHalf(c);
  console.error(`${c.name}${halfMode ? ".H1" : ""}: ${c.docs.length} doc(s), ${c.docs.reduce((a, d) => a + d.sents.reduce((x, s) => x + s.length, 0), 0)} tokens`);
  const vacuumOn = !halfMode && ["ud-eng-A", "wp", "irc"].includes(c.name);
  const res = analyze(c, { half: halfMode, controls: !halfMode, vacuum: vacuumOn });
  res.headerSha256 = headerSha256(new URL(import.meta.url).pathname);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${c.name}${halfMode ? ".H1" : ""}.json`), JSON.stringify(res));
  console.log(JSON.stringify({ corpus: res.corpus, half: halfMode, bodies: res.bodies, mentions: res.mentions, above: res.token.binsAboveBand, alpha: res.token.fit?.alpha ?? null, dAIC: res.token.fit?.dAIC ?? null, seconds: res.seconds }));
}

if (cmd === "run") await run();
else if (cmd === "report") { const { report } = await import("./gravity-report.mjs"); await report(opt("--out", path.join(HERE, "results", "gravity"))); }
else { console.error("usage: gravity.mjs run --corpus <spec> [--half H1] | report --out DIR"); process.exit(2); }
