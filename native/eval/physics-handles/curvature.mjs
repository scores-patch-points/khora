// eval/physics-handles/curvature.mjs — CURVATURE (the "warp"), GEODESICS, the WARP-vs-GRAVITY question, and the IMPULSE ARITHMETIC behind "momentum".
//
//   node eval/physics-handles/curvature.mjs run --corpus irc|wp|ud:<stem>:<A|B> [--half H1] [--bodies 150] [--out DIR]
//   node eval/physics-handles/curvature.mjs report --out DIR
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file on any corpus) ════════════════════════════════════════════
// DISCLOSURE. Seen before this header: the planted-law check of the attraction estimator (plant.mjs) and a one-line smoke of gravity.mjs on UD DEV English. Nothing produced by this file.
// No model, no prior, no capital, no gold: UD UPOS and IRC/War-and-Peace gold are not read here at all.
//
// THE GEOMETRY (a metric on word types, built only from company). Stream = the sentences of the corpus (documents concatenated; company never crosses a sentence). COMPANY FEATURES of a
//   token = the types at positions i-1, i-2 (left) and i+1, i+2 (right) in its sentence, as (side, type) features restricted to the CTX = 600 most frequent types; vector of a type x =
//   log(1 + count) of its features, L2-normalised; DISTANCE d(x, y) = 1 - cos. TARGETS T = the 250 most frequent types (count >= 5). Typed numbers and why: window 2 (adjacency, the repo's
//   before=/after= company features), CTX 600 and T 250 (cost: one distance matrix per ablation), kNN k = the smallest k that connects T (derived, not typed).
// THE WARP of a body b (word type with >= 12 mentions; <= 150 bodies per corpus, stratified over mention-count quartiles, by seed): rebuild the geometry with b ABLATED and measure how the
//   distances among OTHER targets move: Delta(x, y) = d'(x, y) - d(x, y) over the pairs of T minus {b and its two matched controls}.
//   CURVATURE C(b) = mean |Delta| over those pairs (units: cosine distance per pair), Cs(b) = the signed mean. Four ablations: DELETE (every mention removed, adjacency repaired: the repo's
//   perturbation), MASK (every mention replaced by an unknown placeholder: identity removed, adjacency kept), COLDROP (only b's features removed from the vectors: pure bookkeeping, no re-scan),
//   and MATCHED-RANDOM (DELETE of two other types whose mention count is closest to b's): the baseline "removing that many tokens", so EXCESS = C(b) minus the matched mean.
//   RADIAL PROFILE: pairs binned in 5 quantile bins of r = min(d(x, b), d(y, b)) in the ORIGINAL geometry: mean |Delta| per bin. GEODESIC: the kNN graph (k as above, edge length d) of T;
//   shortest paths; for b in T the BENDING = the change of the geodesic of the pairs whose original shortest path passes through b (THROUGH) against the other pairs; BETWEENNESS(b) = the share
//   of pairs through b. Both are computed after the DELETE rebuild with b removed.
// THE ATTRACTION of the same body (attraction.mjs): energy E_b = sum of the excess coincidence over the 8 lag bins x 2 sides weighted by width (units: probability x tokens).
//   WARP-vs-GRAVITY uses a SPLIT-OCCURRENCE design so that the two quantities share no sampled token: E from the EVEN-numbered mentions of b, C from deleting only the ODD-numbered ones.
// THE IMPULSE ARITHMETIC (momentum). For a body with >= 24 mentions: company vectors of blocks of 8 consecutive mentions; the mean ANGLE between consecutive blocks, REAL order against the same
//   mentions in random order (20 permutations). PERSISTENCE ratio R = angle_real / angle_permuted: R < 1 means the body's company drifts slowly in text time (a velocity); R = 1 means the
//   company is stationary (no velocity; the only "impulse law" is the 1/n arithmetic of a running mean). Also J(n) = the angle between the vector from the first n and from the first n+1 mentions;
//   its log-log slope against n (the arithmetic of a mean predicts -1).
// LAWS, FALSIFIERS, PREDICTIONS (blind; thresholds fixed here, bare provisional numbers; not changed after any result). "Corpora" = those with >= 40 bodies.
//  C1 A BODY WARPS ITS NEIGHBOURHOOD BEYOND ITS COUNT. Rule: EXCESS > 0 for >= 60% of the bodies (one-sided sign test p <= 0.05) in >= 60% of the corpora. FALSIFIED if the share is in [0.4, 0.6]
//     (the warp is just "removing that many tokens"). Prediction PC1: holds (bodies differ in what their removal does, not only in how many tokens go).
//  C2 SCALING. Law: the warp grows with mass. Rule: the OLS slope of log C(b) on log n over bodies, with a body-bootstrap interval, for DELETE and for MATCHED-RANDOM. Prediction PC2: slope in
//     [0.3, 1.2] for both and the two slopes within 0.15 of each other (the scaling with mass is the arithmetic of how many tokens are removed, not a property of beings).
//  C3 FALLS WITH DISTANCE. Rule: Spearman(bin index, mean |Delta|) <= -0.7 for DELETE in >= 75% of the corpora, and the same for COLDROP. Prediction PC3: holds for both (the fall-off is
//     already present in the bookkeeping: it does not need adjacency).
//  C4 WHAT THE WARP IS MADE OF. Rule: C_MASK / C_DELETE (identity removal alone against identity plus adjacency repair). Prediction PC4: >= 0.5 in >= 75% of the corpora (most of the warp is the
//     loss of the body as a context, not the new adjacency).
//  C5 GEODESICS. Rule: over bodies in T, BENDING(through) > BENDING(other) in >= 75% of the bodies, and Spearman(BETWEENNESS, log n) with its interval. Prediction PC5: through-pairs lengthen more
//     (a path of least resistance runs through heavy bodies) and betweenness rises with n; the partial correlation of betweenness with E_b given log n is reported, no threshold.
//  WG WARP IS GRAVITY? Law (the user's suspicion): the curvature a body induces and the attraction it exerts are one quantity. Rule: the PARTIAL Spearman of E_even(b) and C_odd(b) given log n,
//     with a body-bootstrap interval; DEFERRED CONTROLS built to fail: (a) a deranged control: C_odd permuted among bodies of the same count quartile (B = 2,000); (b) the same two quantities
//     measured on the WITHIN-SENTENCE-SHUFFLED corpus (company destroyed). ONE QUANTITY iff the partial rho >= 0.30 with interval lower bound > 0.10, above the deranged q95 by >= 0.15, and the
//     shuffled-corpus partial is <= half the real one, in >= 60% of the corpora; and the sign and size agree across the two folds (UD fold A vs B: |rho_A - rho_B| <= 0.20 in >= 6 of 8 stems).
//     Prediction PW1: the raw Spearman(E, C) is >= 0.5 (they co-vary through frequency); PW2: the partial given log n is positive but below 0.30 (warp and attraction are two readouts of how
//     specific a body's company is; they share a cause, they are not one quantity once mass is held fixed).
//  M MOMENTUM. Rule M1: R < 1 with a body-bootstrap interval excluding 1 in >= 60% of the corpora; M2: split-half reliability of the per-body persistence (first half of the blocks against the
//     second half) Spearman >= 0.30 (velocity is a property of the being). Prediction PM1: R < 1 (company drifts slowly); PM2: reliability < 0.30 (the velocity is not a stable property of a being).
//     The slope of J(n) is reported against -1.
//  CONTROLS built to fail. K1 SHAM: ablating a placeholder type that is absent from the text leaves every distance unchanged (|Delta| = 0). K2 DETERMINISM: a re-run of one body reproduces C.
//  K3 the matched-random baseline itself (a body must not be its own match). K4 the shuffled corpus for WG. K5 a body below 12 mentions is not measured.
//  NOT TESTED HERE: the reader's own warp (the collateral slot shadow, reader-handles.mjs); a metric built from the slot graph rather than from company.
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { HERE, seedFor, mulberry32, shuffleInPlace, round, mean, median, quantile, spearman, partialSpearman, ols, blockBootstrap, loadUD, loadIRC, loadWP, headerSha256, argv, sum } from "./lib.mjs";
import { buildIndex, attractionExcess, energyOf } from "./attraction.mjs";

const { opt, cmd } = argv();
const WIN = 2, CTX = 600, TT = 250, NMIN = 12, KNN_NEAR = 20;

async function loadCorpus(spec) {
  if (spec === "irc") return loadIRC(6, "irc-g");
  if (spec === "wp") return loadWP();
  const [, stem, fold] = spec.split(":");
  return loadUD(stem, fold);
}
const firstHalf = (c) => { const docs = c.kind === "ud" ? [{ sents: c.docs.flatMap((d) => d.sents) }] : c.docs; return { ...c, docs: docs.map((d) => ({ ...d, sents: d.sents.slice(0, Math.floor(d.sents.length / 2)) })) }; };

// ── the geometry ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function makeSpace(sents) {
  const count = new Map(); for (const s of sents) for (const w of s) count.set(w, (count.get(w) ?? 0) + 1);
  const ranked = [...count].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return { count, ctxRank: new Map(ranked.slice(0, CTX).map(([w], i) => [w, i])), targets: ranked.filter(([, n]) => n >= 5).slice(0, TT).map(([w]) => w) };
}
/** raw feature counts of the given rows (a Map word -> row) over a stream; columns 2*rank + side */
function countsOf(sents, ctxRank, rowOf, R) {
  const F = 2 * CTX, C = new Float32Array(R * F);
  for (const s of sents) {
    for (let i = 0; i < s.length; i++) {
      const row = rowOf.get(s[i]); if (row === undefined) continue;
      for (let o = 1; o <= WIN; o++) {
        if (i - o >= 0) { const r = ctxRank.get(s[i - o]); if (r !== undefined) C[row * F + 2 * r] += 1; }
        if (i + o < s.length) { const r = ctxRank.get(s[i + o]); if (r !== undefined) C[row * F + 2 * r + 1] += 1; }
      }
    }
  }
  return C;
}
function normalise(C, R, dropCols = null) {
  const F = 2 * CTX, V = new Float32Array(R * F);
  for (let r = 0; r < R; r++) { let n2 = 0; for (let f = 0; f < F; f++) { if (dropCols && dropCols.has(f)) continue; const x = Math.log1p(C[r * F + f]); V[r * F + f] = x; n2 += x * x; } const z = n2 > 0 ? 1 / Math.sqrt(n2) : 0; for (let f = 0; f < F; f++) V[r * F + f] *= z; }
  return V;
}
function distances(V, R) {
  const F = 2 * CTX, D = new Float32Array(R * R);
  for (let i = 0; i < R; i++) for (let j = i + 1; j < R; j++) { let d = 0; const a = i * F, b = j * F; for (let f = 0; f < F; f++) d += V[a + f] * V[b + f]; D[i * R + j] = D[j * R + i] = 1 - d; }
  return D;
}
/** rows = targets (in order) then extras; returns {D, V, rowOf} for a stream and a fixed ctx ranking */
function geometry(sents, space, extras = [], dropWords = []) {
  const rows = [...space.targets, ...extras], rowOf = new Map(rows.map((w, i) => [w, i]));
  const C = countsOf(sents, space.ctxRank, rowOf, rows.length);
  const drop = new Set(); for (const w of dropWords) { const r = space.ctxRank.get(w); if (r !== undefined) { drop.add(2 * r); drop.add(2 * r + 1); } }
  const V = normalise(C, rows.length, drop.size ? drop : null);
  return { D: distances(V, rows.length), R: rows.length, rowOf, rows };
}
const deleteWords = (sents, set) => sents.map((s) => s.filter((w) => !set.has(w)));
const maskWords = (sents, set) => sents.map((s) => s.map((w) => (set.has(w) ? "§" : w)));
const deleteMentions = (sents, positions) => { const del = new Set(positions.map(([k, i]) => `${k}:${i}`)); return sents.map((s, k) => s.filter((_, i) => !del.has(`${k}:${i}`))); };

/** pair statistics between two geometries on the same rows, over pairs of `keep` rows */
function warpStats(g0, g1, keep, bRowInG0, nearSet) {
  let sa = 0, ss = 0, n = 0;
  const pairs = [];
  for (let a = 0; a < keep.length; a++) for (let b = a + 1; b < keep.length; b++) {
    const i = keep[a], j = keep[b], d0 = g0.D[g0.rowOf.get(g0.rows[i]) * g0.R + g0.rowOf.get(g0.rows[j])], d1 = g1.D[i * g1.R + j];
    const delta = d1 - d0; sa += Math.abs(delta); ss += delta; n++;
    if (bRowInG0 !== undefined) pairs.push([Math.min(g0.D[i * g0.R + bRowInG0], g0.D[j * g0.R + bRowInG0]), delta]);
  }
  return { C: n ? sa / n : NaN, Cs: n ? ss / n : NaN, n, pairs };
}
// shortest paths on the kNN graph
function knnGraph(D, R, k, skip = new Set()) {
  const INF = 1e9, G = new Float32Array(R * R).fill(INF);
  for (let i = 0; i < R; i++) { if (skip.has(i)) continue; G[i * R + i] = 0; const nb = []; for (let j = 0; j < R; j++) if (j !== i && !skip.has(j)) nb.push([D[i * R + j], j]); nb.sort((x, y) => x[0] - y[0]); for (const [d, j] of nb.slice(0, k)) { G[i * R + j] = Math.min(G[i * R + j], d); G[j * R + i] = Math.min(G[j * R + i], d); } }
  return G;
}
function floyd(G, R, skip = new Set()) { const A = Float32Array.from(G); for (let k = 0; k < R; k++) { if (skip.has(k)) continue; for (let i = 0; i < R; i++) { const ik = A[i * R + k]; if (ik >= 1e8) continue; for (let j = 0; j < R; j++) { const v = ik + A[k * R + j]; if (v < A[i * R + j]) A[i * R + j] = v; } } } return A; }
function connected(G, R) { const seen = new Uint8Array(R); const st = [0]; seen[0] = 1; let c = 1; while (st.length) { const i = st.pop(); for (let j = 0; j < R; j++) if (G[i * R + j] < 1e8 && !seen[j]) { seen[j] = 1; c++; st.push(j); } } return c === R; }

// ── one corpus ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function analyze(c, nBodies, { half }) {
  const t0 = Date.now(), tag = c.name + (half ? ".H1" : "");
  const sents = c.docs.flatMap((d) => d.sents);
  const space = makeSpace(sents), T = space.targets;
  const ix = buildIndex(c.docs);
  const rnd = mulberry32(seedFor("curv-bodies", tag));
  // bodies: >= NMIN mentions, stratified over count quartiles
  const cand = [...space.count].filter(([w, n]) => n >= NMIN && w !== "§").map(([w, n]) => ({ w, n })).sort((a, b) => a.n - b.n || (a.w < b.w ? -1 : 1));
  const q = (k) => cand.slice(Math.floor((k * cand.length) / 4), Math.floor(((k + 1) * cand.length) / 4));
  const bodies = [0, 1, 2, 3].flatMap((k) => shuffleInPlace(q(k).slice(), rnd).slice(0, Math.ceil(nBodies / 4))).map((x) => ({ ...x, quartile: Math.min(3, cand.indexOf(x) * 4 / cand.length | 0) }));
  const res = { corpus: c.name, half, tokens: sum(sents.map((s) => s.length)), sentences: sents.length, bodies: bodies.length, targets: T.length, per: [], seconds: null };
  if (bodies.length < 5) { res.gap = "too_few_bodies"; return res; }
  const g0 = geometry(sents, space, bodies.map((b) => b.w).filter((w) => !T.includes(w)));
  // derived k: the smallest k that connects the targets
  const nT = T.length; let kNN = 2; { const sub = new Float32Array(nT * nT); for (let i = 0; i < nT; i++) for (let j = 0; j < nT; j++) sub[i * nT + j] = g0.D[i * g0.R + j]; for (; kNN < 30; kNN++) if (connected(knnGraph(sub, nT, kNN), nT)) break; }
  res.kNN = kNN;
  const mentions = new Map(); sents.forEach((s, k) => s.forEach((w, i) => { (mentions.get(w) ?? mentions.set(w, []).get(w)).push([k, i]); }));
  const radial = { del: Array.from({ length: 5 }, () => []), col: Array.from({ length: 5 }, () => []) };
  const byCount = [...space.count].filter(([w]) => w !== "§").sort((a, b) => a[1] - b[1]);
  const wow = (ablated, words, extras = []) => geometry(ablated, space, extras);
  let K2 = null;
  for (const b of bodies) {
    const w = b.w, set = new Set([w]), inT = T.includes(w);
    // matched random: the two types whose count is closest to n (not b)
    const cl = byCount.filter(([x]) => x !== w).map(([x, n]) => [Math.abs(n - b.n), x, n]).sort((p, q2) => p[0] - q2[0] || (p[1] < q2[1] ? -1 : 1)).slice(0, 8);
    const matches = shuffleInPlace(cl.slice(), rnd).slice(0, 2).map((x) => x[1]);
    const excl = new Set([w, ...matches]);
    const keep = []; T.forEach((x, i) => { if (!excl.has(x)) keep.push(i); });
    const bRow = g0.rowOf.get(w);
    // DELETE, MASK, COLDROP
    const gDel = geometry(deleteWords(sents, set), space), gMask = geometry(maskWords(sents, set), space), gCol = geometry(sents, space, [], [w]);
    const sDel = warpStats(g0, gDel, keep, bRow), sMask = warpStats(g0, gMask, keep), sCol = warpStats(g0, gCol, keep, bRow);
    const sRand = matches.map((m) => warpStats(g0, geometry(deleteWords(sents, new Set([m])), space), keep));
    // ODD-mention deletion (for the split-occurrence design) and EVEN-mention attraction
    const ms = mentions.get(w), odd = ms.filter((_, i) => i % 2 === 1), even = ms.filter((_, i) => i % 2 === 0);
    const gOdd = geometry(deleteMentions(sents, odd), space), sOdd = warpStats(g0, gOdd, keep);
    const id = ix.id.get(w);
    const evenDocs = [], evenPos = []; ix.occDoc[id].forEach((d, i) => { if (i % 2 === 0) { evenDocs.push(d); evenPos.push(ix.occPos[id][i]); } });
    const Aeven = attractionExcess(ix, id, evenDocs, evenPos, { seed: seedFor("curvA", tag, w) % 100000 }), Aall = attractionExcess(ix, id, ix.occDoc[id], ix.occPos[id], { seed: seedFor("curvAall", tag, w) % 100000 });
    // radial profile (quantile bins of r over the DELETE pair set)
    const prs = sDel.pairs.slice().sort((x, y) => x[0] - y[0]), prc = sCol.pairs.slice().sort((x, y) => x[0] - y[0]);
    const bins = (arr) => Array.from({ length: 5 }, (_, k) => { const sl = arr.slice(Math.floor((k * arr.length) / 5), Math.floor(((k + 1) * arr.length) / 5)); return sl.length ? mean(sl.map((p) => Math.abs(p[1]))) : null; });
    const bd = bins(prs), bc = bins(prc);
    for (let k = 0; k < 5; k++) { if (bd[k] !== null) radial.del[k].push(bd[k]); if (bc[k] !== null) radial.col[k].push(bc[k]); }
    // near share: the share of total |Delta| carried by pairs touching the KNN_NEAR nearest rows of b
    const near = new Set(Array.from({ length: g0.R }, (_, j) => j).filter((j) => j !== bRow && !excl.has(g0.rows[j])).sort((x, y) => g0.D[bRow * g0.R + x] - g0.D[bRow * g0.R + y]).slice(0, KNN_NEAR));
    let nearAbs = 0, allAbs = 0; for (let a = 0; a < keep.length; a++) for (let bb = a + 1; bb < keep.length; bb++) { const i = keep[a], j = keep[bb], d0 = g0.D[i * g0.R + j], d1 = gDel.D[i * gDel.R + j], dl = Math.abs(d1 - d0); allAbs += dl; if (near.has(i) || near.has(j)) nearAbs += dl; }
    const rec = { w, n: b.n, quartile: b.quartile, inT, nOdd: odd.length, nEven: even.length, Cdel: sDel.C, Csdel: sDel.Cs, Cmask: sMask.C, Ccol: sCol.C, Crand: mean(sRand.map((r) => r.C)), Codd: sOdd.C, Eeven: energyOf(Aeven.A), Eall: energyOf(Aall.A), rad: bd, radCol: bc, nearShare: allAbs > 0 ? nearAbs / allAbs : null, pairs: sDel.n };
    // geodesics (bodies in T only)
    if (inT) {
      const bi = T.indexOf(w), skip = new Set([bi]);
      const sub0 = new Float32Array(nT * nT); for (let i = 0; i < nT; i++) for (let j = 0; j < nT; j++) sub0[i * nT + j] = g0.D[i * g0.R + j];
      const A0 = floyd(knnGraph(sub0, nT, kNN), nT);
      // after deleting b: the geometry gDel has the same rows (b has an empty vector; skip it)
      const sub1 = new Float32Array(nT * nT); for (let i = 0; i < nT; i++) for (let j = 0; j < nT; j++) sub1[i * nT + j] = gDel.D[i * gDel.R + j];
      const A1 = floyd(knnGraph(sub1, nT, kNN, skip), nT, skip);
      let thr = [], oth = [], through = 0, tot = 0;
      for (const i of keep) for (const j of keep) { if (j <= i) continue; const d0 = A0[i * nT + j]; if (d0 >= 1e8) continue; const d1 = A1[i * nT + j]; if (d1 >= 1e8) continue; tot++; const isThrough = A0[i * nT + bi] + A0[bi * nT + j] <= d0 + 1e-6; if (isThrough) { through++; thr.push(d1 - d0); } else oth.push(d1 - d0); }
      rec.geo = { through: tot ? through / tot : null, bendThrough: thr.length ? mean(thr) : null, bendOther: oth.length ? mean(oth) : null, pairs: tot };
    }
    if (!K2) { const again = warpStats(g0, geometry(deleteWords(sents, set), space), keep); K2 = { same: Math.abs(again.C - sDel.C) < 1e-9, C: sDel.C }; }
    res.per.push(rec);
  }
  res.K2 = K2;
  // K1 sham: a placeholder type that is absent from the text
  { const keep = T.map((_, i) => i); const gs = geometry(deleteWords(sents, new Set(["zqxabsentxqz"])), space); res.K1 = { C: warpStats(g0, gs, keep).C }; }
  res.radialMean = { del: radial.del.map((a) => (a.length ? mean(a) : null)), col: radial.col.map((a) => (a.length ? mean(a) : null)) };
  // WG on the within-sentence-shuffled corpus (the company-destroyed control): same bodies' even attraction / odd deletion, on a smaller subset
  if (!half) {
    const rs = mulberry32(seedFor("curv-shuf", tag)), shuf = sents.map((s) => shuffleInPlace(s.slice(), rs));
    const spaceS = makeSpace(shuf), gS = geometry(shuf, spaceS), ixS = buildIndex([{ sents: shuf }]), mentS = new Map(); shuf.forEach((s, k) => s.forEach((x, i) => { (mentS.get(x) ?? mentS.set(x, []).get(x)).push([k, i]); }));
    res.shufPer = [];
    for (const b of bodies.slice(0, Math.min(60, bodies.length))) {
      const w = b.w, id = ixS.id.get(w), ms = mentS.get(w); if (id === undefined || !ms || ms.length < NMIN) continue;
      const keep = []; spaceS.targets.forEach((x, i) => { if (x !== w) keep.push(i); });
      const odd = ms.filter((_, i) => i % 2 === 1), gOdd = geometry(deleteMentions(shuf, odd), spaceS), sOdd = warpStats(gS, gOdd, keep);
      const eD = [], eP = []; ixS.occDoc[id].forEach((d, i) => { if (i % 2 === 0) { eD.push(d); eP.push(ixS.occPos[id][i]); } });
      res.shufPer.push({ w, n: ms.length, Codd: sOdd.C, Eeven: energyOf(attractionExcess(ixS, id, eD, eP, { seed: 3 }).A) });
    }
  }
  // MOMENTUM: persistence of the company direction across blocks of 8 consecutive mentions, real order against permuted order
  const ctxF = 2 * CTX, blockVec = (ms) => { const C = new Float32Array(ctxF); for (const [k, i] of ms) { const s = sents[k]; for (let o = 1; o <= WIN; o++) { if (i - o >= 0) { const r = space.ctxRank.get(s[i - o]); if (r !== undefined) C[2 * r] += 1; } if (i + o < s.length) { const r = space.ctxRank.get(s[i + o]); if (r !== undefined) C[2 * r + 1] += 1; } } } let n2 = 0; for (let f = 0; f < ctxF; f++) { C[f] = Math.log1p(C[f]); n2 += C[f] * C[f]; } const z = n2 > 0 ? 1 / Math.sqrt(n2) : 0; for (let f = 0; f < ctxF; f++) C[f] *= z; return C; };
  const ang = (a, b) => { let d = 0; for (let f = 0; f < ctxF; f++) d += a[f] * b[f]; return Math.acos(Math.max(-1, Math.min(1, d))); };
  const meanAngle = (ms) => { const blocks = []; for (let i = 0; i + 8 <= ms.length; i += 8) blocks.push(blockVec(ms.slice(i, i + 8))); const a = []; for (let i = 0; i + 1 < blocks.length; i++) a.push(ang(blocks[i], blocks[i + 1])); return a.length ? mean(a) : null; };
  res.momentum = [];
  const rM = mulberry32(seedFor("momentum", tag));
  for (const b of bodies) {
    const ms = mentions.get(b.w); if (ms.length < 24) continue;
    const real = meanAngle(ms), perms = []; for (let p = 0; p < 20; p++) perms.push(meanAngle(shuffleInPlace(ms.slice(), rM)));
    const half1 = meanAngle(ms.slice(0, Math.floor(ms.length / 2))), half1p = mean(Array.from({ length: 10 }, () => meanAngle(shuffleInPlace(ms.slice(0, Math.floor(ms.length / 2)), rM))).filter((x) => x !== null)), half2 = meanAngle(ms.slice(Math.floor(ms.length / 2))), half2p = mean(Array.from({ length: 10 }, () => meanAngle(shuffleInPlace(ms.slice(Math.floor(ms.length / 2)), rM))).filter((x) => x !== null));
    // J(n): angle between the vector of the first n and the first n+1 mentions, n = 4, 8, 16
    const J = [4, 8, 16, 32].filter((n) => n + 1 <= ms.length).map((n) => [n, ang(blockVec(ms.slice(0, n)), blockVec(ms.slice(0, n + 1)))]);
    res.momentum.push({ w: b.w, n: ms.length, real, permuted: mean(perms.filter((x) => x !== null)), R: real !== null && mean(perms) ? real / mean(perms.filter((x) => x !== null)) : null, R1: half1 !== null && half1p ? half1 / half1p : null, R2: half2 !== null && half2p ? half2 / half2p : null, J });
  }
  res.seconds = round((Date.now() - t0) / 1000, 1);
  return res;
}

async function runCmd() {
  const spec = opt("--corpus", null); if (!spec) throw new Error("--corpus is required");
  const OUT = opt("--out", path.join(HERE, "results", "curvature")), half = opt("--half", null) === "H1", nBodies = Number(opt("--bodies", 150));
  let c = await loadCorpus(spec); if (!c) throw new Error(`no corpus ${spec}`);
  if (half) c = firstHalf(c);
  console.error(`${c.name}${half ? ".H1" : ""}: ${c.docs.length} doc(s)`);
  const res = analyze(c, nBodies, { half });
  res.headerSha256 = headerSha256(new URL(import.meta.url).pathname);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${c.name}${half ? ".H1" : ""}.json`), JSON.stringify(res));
  console.log(JSON.stringify({ corpus: res.corpus, half, bodies: res.bodies, k: res.kNN, K1: res.K1, K2: res.K2, seconds: res.seconds }));
}

if (cmd === "run") await runCmd();
else if (cmd === "report") { const { report } = await import("./curvature-report.mjs"); await report(opt("--out", path.join(HERE, "results", "curvature"))); }
else { console.error("usage: curvature.mjs run --corpus <spec> [--half H1] | report --out DIR"); process.exit(2); }
