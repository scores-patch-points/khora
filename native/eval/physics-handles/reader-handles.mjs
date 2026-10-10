// eval/physics-handles/reader-handles.mjs — MASS, INERTIA, DENSITY, HORIZON, THE REAL READER'S FORCE LAW, CONSERVATION: measured on the real readers.
//
//   node eval/physics-handles/reader-handles.mjs run --corpus irc|wp|ud:<stem>:<A|B|dev> [--snaps 24] [--wave 1] [--out DIR] [--max-seconds N]
//   node eval/physics-handles/reader-handles.mjs report --out DIR
//
// WHY (user, 2026-10-06): "mass, inertia, gravity, density, the warp ... today those are metaphors". This file turns the ones that live INSIDE the reader
// (what happens to the slot structure when a body is deleted) into measured quantities, states the law each metaphor implies, and tries to break it.
// Instrument: eval/law/impact.mjs (slot ablation at the SLOT not the span; three prior-free shipped readers, null ceiling held fixed, frame-causal
// prefix windows) and kernel/activation.js (createActivation, dmdWindow). NO model, NO prior, NO capital, NO POS tag, NO treebank in any score. Gold
// (IRC speaker metadata, the hand-verified War and Peace cast, UD UPOS) is attached to a sampled mention only to STRATIFY / EVALUATE, never a feature.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file on any corpus) ════════════════════════════════════════════
// DISCLOSURE. Seen before this header: the beings ladder, the name-rule results (IRC AUC 0.843 of S_ENTRY but a local count ties it at 0.853; War and Peace 0.513),
// the cost of impact.mjs (eng DEV M=128: snapshot 0.3 s, one ablation 0.43 s), and NOTHING produced by this file. name-shape.mjs is running in the background;
// its results were not read. Smoke runs of THIS file are on UD DEV English (ud:eng:dev) and on a planted tiny stream only; that corpus is not in any verdict.
//
// OBJECTS (operational definitions; each is computed by named code below).
//   WINDOW X0 = the prefix of M sentences ending at sentence s of one document (frame-causal: nothing after s is read). M = 256 messages (IRC), 128 sentences
//     (War and Peace, UD): about 3,000 word units, the scale at which the readers hear a being at all (name-rule-informal.mjs M choice).
//   BODY = a word type (identity string) that the readers can see (length >= 3, >= 2 in Han/Kana/Hangul: impact.mjs minWordLength). MENTION = one occurrence of it
//     in X0. n = the number of mentions of the body in X0.
//   DELETION of a set D of mentions: the readers re-read X0 with those tokens removed (adjacency repaired), the null ceiling of X0 held fixed (impact.mjs
//     readWindow). Slot records are aligned by structure (impact.mjs slotDeltas): every slot of X0 gets a type {emptied, retyped, rebound, refilled, shifted,
//     unchanged}; slots only in the re-read are `born`.
//   SHADOW S(D) = the number of X0 slot records whose type is emptied, retyped, rebound or refilled (a SUBSTANTIVE change of what fills a slot). shifted (an
//     ordinal moved after a deletion: bookkeeping) and born (new slots made when adjacency is repaired) are kept separate: BORN(D), EMPTIED(D), SHIFTED(D).
//     Units: slot-changes (a count). DIRECT = changed slots the deleted tokens themselves filled (impact.mjs tokenSlotsOf); COLLATERAL = every other changed
//     slot (the field rearranging around the hole). All three are invariant to case (the stream is lowercased) and to the tokenizer only to the extent the
//     readers are (stated limit); they are NOT invariant to M (that is what the density test measures).
//   Candidate MASSES of a body (all computed per body per window): m_n = n; m_act = kernel/activation.js createActivation activation at s with gamma from the
//     window MEASURED by dmdWindow over the sentence-level cast (listening-cast deriveCast, dyadic candidates; on a gap the declared ceiling M is used and the
//     body is flagged); m_born = the Born share a_b^2 / sum_c a_c^2 of that activation over the window's bodies; m_slots = the distinct X0 slots the body fills;
//     m_shadow = S(all mentions of the body); m_ext = the frame extent of deleting ONE mention (frames).
//   FRAGILITY phi(m) of a mention = S({m}) (also phi_ent = the entry-family part). INERTIA is the inverse reading: a body is inert to the degree phi is small.
//
// SAMPLING (seeded by corpus and wave; never by outcome). S = 150 snapshot sentences per corpus (changed from 24 before any real run, after a timing-only smoke showed ~2-3 s per snapshot; no result was read), spread evenly over the SECOND HALF of each document,
//   s >= mid + M, so every window lies in the half no gravitational statistic (gravity.mjs, curvature.mjs, which use the FIRST half) has read. Per snapshot:
//   S1 14 single deletions: 8 mentions of the final sentence stratified by n bin {1, 2, 3, 4-5, 6-9, 10-19, 20+}, 4 mentions of "targeted" bodies (word types with
//     >= 12 mentions in the first half of the document, the equivalence set) and 2 random mentions of older sentences; S4 the same 8 final-sentence mentions re-read
//     in windows of M/2 and M/4 (density); a within-sentence-SHUFFLED copy of the window is re-read for every second snapshot (company destroyed, membership kept).
//   S2 3 reads per pair for 2 pairs of distinct bodies that each fill >= 1 slot with 2 <= n <= 12 (one pair sharing a sentence = NEAR, one sharing none = FAR):
//     S(A), S(B), S(A and B deleted together); and one body with 2 <= n <= 6 deleted whole and mention by mention (additivity across the mentions of ONE body).
//   S3 the horizon ladder {2,4,8,16,32,64,128,M}: the window re-read with only its last D sentences; for each sampled body derive_b = (its entry key, the relation
//     edges of the final sentence that carry it); H_slot(b) = the shallowest D whose derive_b equals that of the whole window (kernel dmdWindow, the real function);
//     H_cast(b) = the shallowest D holding >= 2 of its mentions (the cast rule's own recency). A body whose derive_b is empty in the whole window is `inert`.
//   K1 sham: a deletion of nothing (must leave every slot unchanged); K2 determinism: two snapshots' deletions re-run byte-identically.
//   Typed numbers and why: M, S (cost and the reader's hearing scale); 14/8/4/2 per snapshot (cost: ~50 reads per snapshot, 2-3 s measured); n <= 12 and n <= 6 (cost
//   caps for the joint reads); the n bin edges and the ladder are dyadic (the repo's own candidate ladder); n >= 3 for the inertia law (at n = 2 a single
//   deletion crosses the readers' recurrence floor of 2: a threshold event, not inertia; reported separately as the FLOOR CLIFF); denominators below 3 are not
//   ratioed (integer noise); tolerance 0.15 for "additive" and 0.05 / 0.15 below are bare provisional numbers (SESOI practice of the repo), not derived.
//
// CORPORA AND WAVES. Wave 1 (discovery): irc (3 channel-days, seed irc-w1), wp, and UD held-out fold A (fold80 tail) for eng fra spa deu hin fas tur jpn (families derived
//   from the role-config priors: strict-SVO {eng fra}, freer-order {spa deu}, SOV {hin fas tur jpn}). Wave 2 (confirmation, run only if wave 1 completes): irc seed irc-w2,
//   wp with the snapshot grid shifted by a quarter step, UD held-out fold B. Rules and thresholds below are FIXED before wave 1; a form chosen on wave 1 must also
//   win on wave 2 or the claim is reported as not replicated. "Corpora" in a rule = the corpora that pass K5 in that wave.
//
// LAWS TESTED, FALSIFIERS AND PREDICTIONS (blind; the orders are the claims; thresholds are not changed after any result).
//  MASS-ADD  Law: the shadow of deleting two bodies together is the sum of their shadows when they do not touch: S(A+B) = S(A) + S(B).
//    Rule: over FAR pairs with S(A)+S(B) >= 3, the OLS slope of S(A+B) on S(A)+S(B) (block bootstrap over snapshots, B = 500) has its 95% interval inside
//    [0.85, 1.15] AND the median ratio is inside [0.85, 1.15]. FALSIFIED if the interval excludes that band. Control built to fail (informativeness): replace
//    S(B) by the shadow of a random other body of the same n bin; the fit of S(A+B) on S(A)+S(B) must beat the fit on S(A)+S(C) by >= 0.10 in R^2, else the
//    test cannot distinguish a real sum from a wrong one (VACUOUS, not "additive"). NEAR pairs: predicted P1 median ratio below the FAR median.
//    Across the mentions of ONE body: Omega = S(whole body) / sum over its mentions of S(one mention); predicted P2 Omega > 1.15 (the being is more than the
//    sum of its mentions: the recurrence floor is a collective effect) with the interval above 1.15 for n in 2..3.
//  MASS-DEF  Is there ONE definition that behaves the same across corpora? For each corpus the rank correlations among m_n, m_act, m_born, m_slots, m_shadow
//    and the OLS slope of log(m_shadow + 0.5) on log n with its standard error; heterogeneity Q across corpora (chi-square, df = corpora - 1). Rule: a definition is
//    the same across corpora if Q gives p > 0.05 AND every corpus has rank correlation with m_n >= 0.3. Extensivity (shadow proportional to mentions) is slope = 1.
//    Prediction P3: the slope is below 1 (sub-extensive: a body's effect saturates) with interval excluding 1, and it is NOT the same across corpora (Q p < 0.05).
//  INERTIA   Law: a mention of a body with more mentions is less fragile. Rule (restricted to n >= 3): I1 Spearman(n, phi) < 0 with the block-bootstrap interval
//    upper bound < -0.05, pooled AND in >= 60% of the corpora that pass K5. FALSIFIED if the pooled interval includes 0. I2 FORM: Poisson (log link) models of phi on
//    (a) a constant, (b) log n (power law phi ~ n^-a), (c) n (exponential), compared by leave-one-snapshot-out Poisson deviance; the form is DERIVED (lowest CV
//    deviance), never assumed; the exponent of (b) with a block-bootstrap interval is reported and compared to 1 (the arithmetic of a running mean). I3 FLOOR
//    CLIFF: mean phi at n = 2 over mean phi at n in {3,4}; predicted P4 >= 2. I4 NAME-NESS AFTER MATCHING: AUC of phi_ent between gold-name mentions and gold
//    non-name mentions WITHIN exact n (n >= 3, weighted by pairs), IRC and War and Peace and UD (UPOS PROPN, evaluation only); predicted P5: IRC <= 0.60 (the
//    0.843 of name-rule-informal was a count effect) and War and Peace in [0.45, 0.55]. I5 SHAM: phi at n = 1 (the reader cannot hear a single mention)
//    has median 0; its collateral change is the ADJACENCY-REPAIR BASELINE every later quantity is compared to. Prediction P6: pooled Spearman(n, phi | n >= 3)
//    < 0 in >= 60% of the corpora; P7: the CV-selected form is a power law with exponent in [0.3, 1.5] and consistent with 1.
//  DENSITY   Law: what controls fragility is mass per unit window, rho = n / (tokens in window) (or the Born share), not n. Rule: for the 8 final-sentence
//    mentions re-read at M, M/2, M/4: CV Poisson deviance of phi on log n vs on log rho vs on log (Born share); density WINS in a corpus if its deviance is lower
//    than that of n by >= 2%. Prediction P8: n wins in >= 60% of the corpora (the floor is a count, so the density metaphor fails).
//  HORIZON   Law: each body has a range beyond which dropping older material no longer changes the reading (kernel dmdWindow, per body), and that range grows
//    with its mass (a Schwarzschild-like r ~ m was suggested). Rule: Spearman(H_slot, H_cast); partial Spearman(H_slot, m_shadow | H_cast, n). FALSIFIED (as a
//    mass law) if the partial correlation is below 0.2 or its interval includes 0. Prediction P9: H_slot tracks H_cast (rho >= 0.6): the reader's horizon is the
//    recency of the second-last mention; P10: partial < 0.2. The share of the sampled windows whose cast dmdWindow returns reach_exceeds_candidates is reported.
//  FORCE LAW (the reader's own gravity)  Law: the probability that a slot at token distance r from a deleted mention changes (COLLATERAL slots only) falls as a
//    power of r. g(r) = changed collateral slots / collateral slots in X0, in dyadic distance bins; EXCESS = g(n >= 3) minus g(n = 1) (adjacency baseline).
//    Rule: where the excess is positive over >= 5 bins, fit a power law and an exponential (2 parameters each, residuals in log space); power wins if
//    delta AIC >= 4. Predictions P11: monotone fall (Spearman of log r against g < -0.7) in >= 60% of the corpora; P12 power beats exponential in >= 60%; P13 the
//    SHUFFLED-window excess at r >= 64 tokens is <= 50% of the real excess in >= 60% of the corpora (the long-range part needs company).
//  CONSERVATION  Law: slots are conserved (what a deletion empties it re-creates elsewhere). Rule: over single deletions with n >= 3, the median of
//    (BORN - EMPTIED) / (BORN + EMPTIED + 1) lies in [-0.2, 0.2]. Prediction P14: FAILS, the median is below -0.2 (a deletion removes more structure than the repair
//    births); at n = 1 the sign is positive or zero (repair births).
//  AFFECT  What it means that a body "affects" the holograph: P(S >= 1 | n) beyond the n = 1 baseline, split DIRECT vs COLLATERAL, by slot-graph radius (impact.mjs
//    bands). Prediction P15: for n >= 3 the collateral share of changed slots is >= 0.5 (to affect is mostly to change the neighbours, not to occupy slots).
//  CONTROLS (built to fail) K1 sham deletion changes nothing (share of unchanged slots = 1, every snapshot); K2 determinism (re-read hashes equal); K3 the
//    informativeness control of MASS-ADD; K4 the shuffled window (company destroyed) must NOT show the real long-range excess (P13); K5 licence: the readers
//    are not deaf: the share of single deletions with S >= 1 at n >= 3 must be >= 0.2 in a corpus, else that corpus is typed UNDERPOWERED(reader) and does not
//    enter any verdict (the same licence as name-rule-informal K5).
//  NOT TESTED HERE: first mentions (the readers are deaf to them: NAME-RULE-RESULTS); non-causal windows; the equivalence principle (equivalence.mjs joins this
//    file's per-body fragility to the gravitational mass of gravity.mjs / curvature.mjs); informal registers other than IRC (no annotated gold).
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { makeSnapshot, impactOfToken, readWindow, slotStructure, slotDeltas, tokenSlotsOf, sentenceText } from "../law/impact.mjs";
import { dmdWindow, createActivation } from "../../kernel/activation.js";
import { HERE, STEMS25, seedFor, rngFor, shuffleInPlace, round, mean, median, quantile, spearman, partialSpearman, ols, auc, blockBootstrap, readerVisible, loadUD, loadIRC, loadWP, headerSha256, argv, writeJSON, sum } from "./lib.mjs";

const { opt, has, cmd } = argv();
const NBINS = 13, DIST_EDGES = [0, 1, 2, 3, 5, 9, 17, 33, 65, 129, 257, 513, 1025]; // bin b holds distances [edge_b, edge_{b+1}); the last bin is open
const distBin = (d) => { let b = 0; while (b + 1 < NBINS && d >= DIST_EDGES[b + 1]) b++; return b; };
const NB_N = 7, nBin = (n) => (n <= 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : n <= 5 ? 3 : n <= 9 ? 4 : n <= 19 ? 5 : 6);
const SUBST = new Set(["emptied", "retyped", "rebound", "refilled"]);
const cumLens = (sents) => { const out = []; let c = 0; for (const s of sents) { out.push(c); c += s.length; } return out; };
const dyadic = (n) => { const out = []; for (let d = 2; d < n; d *= 2) out.push(d); return out; };

// ── one deletion, read at the slot ─────────────────────────────────────────────────────────────────────────────────────────────────────
function readDelete(snap, del, { single = null } = {}) {
  const sents1 = snap.sents.map((sent, k) => sent.filter((_, i) => !del.has(`${k}:${i}`)));
  const reading1 = readWindow(sents1.map(sentenceText), snap.ropts, snap.ceiling === undefined ? null : snap.ceiling);
  const sl1 = slotStructure(reading1);
  const I = new Set(); let noSlot = 0, entryMember = false;
  for (const key of del) { const [k, i] = key.split(":").map(Number); const ids = tokenSlotsOf(snap.sl0, snap.sents, k, i); if (!ids.length) noSlot++; for (const id of ids) { I.add(id); if (id.startsWith("0:k:")) entryMember = true; } }
  const ctx = { tokenSlots: [...I] };
  if (single) { const cum0 = cumLens(snap.sents); Object.assign(ctx, { coord0: { cum: cum0 }, coord1: { cum: cumLens(sents1) }, tCoord: cum0[single.k] + single.i, shiftAfter: 1 }); }
  const sd = slotDeltas(snap.sl0, sl1, ctx);
  return summarize(sd, I, single, noSlot, entryMember);
}
function summarize(sd, I, single, noSlot, entryMember) {
  const t = { emptied: 0, retyped: 0, rebound: 0, refilled: 0, shifted: 0, born: 0 };
  let S = 0, dir = 0, col = 0, entryCh = 0, frames = 0, nAll = 0;
  const dAll = new Array(NBINS).fill(0), dCh = new Array(NBINS).fill(0), rAll = new Array(6).fill(0), rCh = new Array(6).fill(0);
  const rb = (r) => (r === Infinity || !Number.isFinite(r) ? 5 : Math.min(4, r));
  for (const r of sd.records) {
    if (r.type !== "unchanged") t[r.type] += 1;
    if (r.side !== 0) { if (single && r.type === "born" && r.e != null) frames = Math.max(frames, Math.abs(r.e - single.e)); continue; }
    nAll += 1;
    const subst = SUBST.has(r.type), direct = I.has(r.id);
    if (subst) { S += 1; if (r.fam === 3) entryCh += 1; if (direct) dir += 1; else col += 1; if (single && r.e != null) frames = Math.max(frames, Math.abs(r.e - single.e)); }
    if (!direct) {
      if (single && r.dist != null) { const b = distBin(r.dist); dAll[b] += 1; if (subst) dCh[b] += 1; }
      const q = rb(r.radius); rAll[q] += 1; if (subst) rCh[q] += 1;
    }
  }
  return { S, shifted: t.shifted, born: t.born, emptied: t.emptied, retyped: t.retyped, rebound: t.rebound, refilled: t.refilled, entryCh, dir, col, nSlots: nAll, nTokenSlots: I.size, noSlot, entryMember, frames, dAll, dCh, rAll, rCh };
}

// ── corpora ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function loadCorpus(spec, wave) {
  if (spec === "irc") { const c = loadIRC(3, `irc-w${wave}`); return { ...c, M: 256, snaps: 150, merge: false }; }
  if (spec === "wp") { const c = await loadWP(); return { ...c, M: 128, snaps: 150, merge: false }; }
  const [, stem, fold] = spec.split(":");
  const c = loadUD(stem, fold, { merge: true });
  if (!c) throw new Error(`no UD slice for ${spec}`);
  return { ...c, M: 128, snaps: 150 };
}
const isNameAt = (doc, k, i) => (doc.nameGold ? doc.nameGold.has(`${k}:${i}`) : doc.upos ? doc.upos[k][i] === "PROPN" : null);

// ── a snapshot ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function inventory(sents) {
  const pos = new Map();
  sents.forEach((sent, k) => sent.forEach((w, i) => { if (!readerVisible(w)) return; (pos.get(w) ?? pos.set(w, []).get(w)).push([k, i]); }));
  return pos;
}
function massOf(sents, M) {
  const obs = sents.map((s) => s.filter(readerVisible));
  const deriveCast = (o) => { const c = new Map(); for (const keys of o) for (const k of new Set(keys)) c.set(k, (c.get(k) ?? 0) + 1); return [...c].filter(([, n]) => n >= 2).map(([k]) => k).sort(); };
  const cand = dyadic(obs.length);
  const m = cand.length ? dmdWindow(obs, deriveCast, { candidates: cand }) : { window: null, gap: "too_short" };
  const act = createActivation({ window: m.window != null && m.window > 1 ? m.window : Math.max(2, M) });
  for (const o of obs) act.observe(o);
  const snap = act.snapshot(); let s2 = 0; for (const [, v] of snap.freq) s2 += v * v;
  return { window: m.window, windowGap: m.gap ?? null, activationOf: (w) => act.activationOf(w), bornOf: (w) => (s2 > 0 ? act.activationOf(w) ** 2 / s2 : 0), totalActivation: snap.total };
}
function pickStratified(cands, want, rnd) {
  // cands: [{k,i,form,n}] ; one per n bin in random bin order, then wrap
  const byBin = Array.from({ length: NB_N }, () => []);
  for (const c of cands) byBin[nBin(c.n)].push(c);
  const out = [], used = new Set();
  const order = shuffleInPlace([...Array(NB_N).keys()], rnd);
  for (let round_ = 0; out.length < want && round_ < 4; round_++) for (const b of order) { if (out.length >= want) break; const pool = byBin[b].filter((c) => !used.has(`${c.k}:${c.i}`)); if (!pool.length) continue; const c = pool[Math.floor(rnd() * pool.length)]; used.add(`${c.k}:${c.i}`); out.push(c); }
  return out;
}

function runSnapshot(corpus, doc, docIdx, s, snapIdx, wave, targetSet, withShuf) {
  const M = corpus.M, stream = doc.sents;
  const rnd = rngFor("reader", corpus.name, wave, docIdx, s);
  const t0 = Date.now();
  const snap = makeSnapshot(stream, s, { M, F: 0, seedTag: `${corpus.name}:w${wave}:${docIdx}` });
  const lastK = snap.self, inv = inventory(snap.sents), mass = massOf(snap.sents, M);
  const nOf = (w) => (inv.get(w) ?? []).length;
  const rec = { corpus: corpus.name, doc: docIdx, s, snapIdx, M, lo: snap.lo, L: snap.sents.reduce((a, x) => a + x.length, 0), nRel: snap.sl0.rel.length, nEntries: snap.sl0.ref.length, massWindow: mass.window, massWindowGap: mass.windowGap, singles: [], density: [], pairs: [], mentionAdd: null, horizon: [], bodies: {}, shuf: [] };
  const noteBody = (w) => { if (!(w in rec.bodies)) rec.bodies[w] = { n: nOf(w), act: round(mass.activationOf(w), 5), born: round(mass.bornOf(w), 7) }; };
  // S1: singles
  const all = []; snap.sents.forEach((sent, k) => sent.forEach((w, i) => { if (readerVisible(w)) all.push({ k, i, form: w, n: nOf(w) }); }));
  const fin = all.filter((c) => c.k === lastK), old = all.filter((c) => c.k < lastK);
  const chosen = pickStratified(fin, 8, rnd).map((c) => ({ ...c, final: true, targeted: false }));
  const tgt = shuffleInPlace(old.filter((c) => targetSet.has(c.form)), rnd).slice(0, 4).map((c) => ({ ...c, final: false, targeted: true }));
  const rest = shuffleInPlace(old.filter((c) => !targetSet.has(c.form)), rnd);
  const extra = pickStratified(rest, 2, rnd).map((c) => ({ ...c, final: false, targeted: false }));
  const picks = [...chosen, ...tgt, ...extra];
  for (const c of picks) {
    const r = readDelete(snap, new Set([`${c.k}:${c.i}`]), { single: { k: c.k, i: c.i, e: c.k } });
    noteBody(c.form);
    rec.singles.push({ k: c.k, i: c.i, form: c.form, n: c.n, age: lastK - c.k, final: c.final, targeted: c.targeted, isName: isNameAt(doc, snap.lo + c.k, c.i), upos: doc.upos ? doc.upos[snap.lo + c.k][c.i] : null, ...r });
  }
  // S4: density (the final-sentence mentions at M/2 and M/4)
  for (const c of chosen) {
    const row = { form: c.form, n: c.n, L: rec.L, S: rec.singles.find((x) => x.k === c.k && x.i === c.i).S, small: [] };
    for (const div of [2, 4]) {
      const Msm = Math.floor(M / div), sn = makeSnapshot(stream, s, { M: Msm, F: 0, seedTag: `${corpus.name}:w${wave}:${docIdx}:d${div}` });
      const nn = sn.sents.flat().filter((w) => w === c.form).length;
      const msm = massOf(sn.sents, Msm);
      const r = readDelete(sn, new Set([`${sn.self}:${c.i}`]), { single: { k: sn.self, i: c.i, e: sn.self } });
      row.small.push({ M: Msm, L: sn.sents.reduce((a, x) => a + x.length, 0), n: nn, S: r.S, born: round(msm.bornOf(c.form), 7) });
    }
    row.bornM = round(mass.bornOf(c.form), 7);
    rec.density.push(row);
  }
  // S2: pairs and mention additivity
  const fills = (w) => (inv.get(w) ?? []).some(([k, i]) => tokenSlotsOf(snap.sl0, snap.sents, k, i).length > 0);
  const pool = [...inv.keys()].filter((w) => { const n = nOf(w); return n >= 2 && n <= 12 && fills(w); });
  const sentsOf = (w) => new Set(inv.get(w).map(([k]) => k));
  const delOf = (ws) => { const d = new Set(); for (const w of ws) for (const [k, i] of inv.get(w)) d.add(`${k}:${i}`); return d; };
  const shadowOf = new Map();
  const bodyShadow = (w) => { if (!shadowOf.has(w)) shadowOf.set(w, readDelete(snap, delOf([w]))); return shadowOf.get(w); };
  let near = null, far = null;
  for (let g = 0; g < 400 && (!near || !far) && pool.length >= 2; g++) {
    const a = pool[Math.floor(rnd() * pool.length)], b = pool[Math.floor(rnd() * pool.length)];
    if (a === b) continue;
    const A = sentsOf(a), B = sentsOf(b); let share = 0; for (const x of A) if (B.has(x)) share++;
    if (share >= 1 && !near) near = [a, b, share]; else if (share === 0 && !far) far = [a, b, 0];
  }
  for (const [kind, p] of [["near", near], ["far", far]]) {
    if (!p) continue;
    const [a, b, share] = p, sa = bodyShadow(a), sb = bodyShadow(b), sab = readDelete(snap, delOf([a, b]));
    noteBody(a); noteBody(b);
    rec.pairs.push({ kind, a, b, nA: nOf(a), nB: nOf(b), share, SA: sa.S, SB: sb.S, SAB: sab.S, bornA: sa.born, bornB: sb.born, bornAB: sab.born, emptiedA: sa.emptied, emptiedB: sb.emptied, emptiedAB: sab.emptied, dirAB: sab.dir, colAB: sab.col, slotsA: sa.nTokenSlots, slotsB: sb.nTokenSlots });
  }
  const small = pool.filter((w) => nOf(w) <= 6);
  if (small.length) {
    const c = small[Math.floor(rnd() * small.length)], whole = bodyShadow(c);
    const singles = inv.get(c).map(([k, i]) => readDelete(snap, new Set([`${k}:${i}`])).S);
    noteBody(c);
    rec.mentionAdd = { form: c, n: nOf(c), Swhole: whole.S, Ssingles: singles, bornWhole: whole.born, emptiedWhole: whole.emptied, slots: whole.nTokenSlots };
  }
  // m_shadow for every body whose whole shadow was read; m_slots for them
  for (const [w, r] of shadowOf) { noteBody(w); rec.bodies[w].mShadow = r.S; rec.bodies[w].mSlots = r.nTokenSlots; }
  // S3: horizon ladder (the window re-read with only its last D sentences)
  const ladder = [...dyadic(M).filter((d) => d >= 2), M];
  const readers = new Map();
  const readerAt = (D) => { if (!readers.has(D)) readers.set(D, D >= snap.sents.length ? snap.reading0 : readWindow(snap.texts0.slice(snap.texts0.length - D), snap.ropts)); return readers.get(D); };
  const deriveFor = (w) => (obsSlice) => {
    const r = readerAt(obsSlice.length), lastEdges = r.edges[r.edges.length - 1] ?? [];
    const involves = (ed) => String(ed.end1).split(/[\s_]+/).includes(w) || String(ed.end2).split(/[\s_]+/).includes(w);
    return { entry: r.surfaceEntry.get(w) ?? null, edges: lastEdges.filter(involves).map((ed) => `${ed.end1}|${ed.label}|${ed.end2}`).sort() };
  };
  const horizonBodies = new Set([...picks.map((c) => c.form), ...(near ? [near[0], near[1]] : []), ...(far ? [far[0], far[1]] : []), ...(rec.mentionAdd ? [rec.mentionAdd.form] : [])]);
  for (const w of horizonBodies) {
    const whole = deriveFor(w)(snap.texts0);
    const inert = whole.entry === null && whole.edges.length === 0;
    let H = null, gap = null;
    if (!inert) { const m = dmdWindow(snap.texts0, deriveFor(w), { candidates: ladder.filter((d) => d < snap.texts0.length) }); H = m.window; gap = m.gap ?? null; }
    const ages = (inv.get(w) ?? []).map(([k]) => lastK - k).sort((x, y) => x - y);
    const second = ages.length >= 2 ? ages[1] + 1 : null;               // sentences needed to hold two mentions
    const Hcast = second === null ? null : (ladder.find((d) => d >= second) ?? null);
    noteBody(w);
    rec.horizon.push({ form: w, n: nOf(w), inert, Hslot: H, gap, Hcast, second });
  }
  // shuffled-window control (company destroyed): the same single mentions, same sentences, tokens scrambled inside each sentence
  if (withShuf) {
    const rs = rngFor("reader-shuf", corpus.name, wave, docIdx, s);
    const shufStream = stream.map((x, k) => (k >= snap.lo && k <= snap.hi ? shuffleInPlace(x.slice(), rs) : x));
    const sh = makeSnapshot(shufStream, s, { M, F: 0, seedTag: `${corpus.name}:w${wave}:${docIdx}:shuf` });
    for (const c of picks) {
      const i2 = sh.sents[c.k].findIndex((w) => w === c.form);
      if (i2 < 0) continue;
      const r = readDelete(sh, new Set([`${c.k}:${i2}`]), { single: { k: c.k, i: i2, e: c.k } });
      rec.shuf.push({ k: c.k, form: c.form, n: c.n, S: r.S, dir: r.dir, col: r.col, dAll: r.dAll, dCh: r.dCh, born: r.born, emptied: r.emptied });
    }
  }
  // K1 sham, K2 determinism
  const sham = readDelete(snap, new Set());
  rec.K1 = { S: sham.S, born: sham.born, shifted: sham.shifted, slots: sham.nSlots };
  if (snapIdx < 2 && picks.length) { const c = picks[0], again = readDelete(snap, new Set([`${c.k}:${c.i}`]), { single: { k: c.k, i: c.i, e: c.k } }); const first = rec.singles[0]; rec.K2 = { same: JSON.stringify([again.S, again.born, again.emptied, again.dAll, again.dCh]) === JSON.stringify([first.S, first.born, first.emptied, first.dAll, first.dCh]) }; }
  rec.seconds = round((Date.now() - t0) / 1000, 1);
  return rec;
}

async function run() {
  const spec = opt("--corpus", null); if (!spec) throw new Error("--corpus is required");
  const wave = Number(opt("--wave", 1)), OUT = opt("--out", path.join(HERE, "results", "reader")), maxSec = Number(opt("--max-seconds", Infinity));
  const corpus = await loadCorpus(spec, wave);
  const nSnaps = Number(opt("--snaps", corpus.snaps)), M = corpus.M;
  fs.mkdirSync(OUT, { recursive: true });
  const tag = `${corpus.name}.w${wave}`, file = path.join(OUT, `${tag}.jsonl`);
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).snapIdx) : []);
  // plan: per document, spread evenly over the second half, windows entirely inside it
  const plan = [];
  const totalSent = corpus.docs.reduce((a, d) => a + d.sents.length, 0);
  corpus.docs.forEach((d, di) => {
    const N = d.sents.length, mid = Math.floor(N / 2), room = N - (mid + M);
    if (room < 4) return;
    const quota = Math.max(1, Math.round((nSnaps * N) / totalSent));
    for (let q = 0; q < quota; q++) plan.push({ doc: di, s: mid + M + Math.floor(((q + (wave === 1 ? 0.5 : 0.25)) * room) / quota) });
  });
  const picked = plan.slice(0, nSnaps);
  console.error(`${tag}: ${corpus.docs.length} doc(s), ${totalSent} sentences/messages, M=${M}, ${picked.length} snapshots planned, ${done.size} already done`);
  const t0 = Date.now();
  let targetSets = new Map();
  corpus.docs.forEach((d, di) => { const c = new Map(); const half = Math.floor(d.sents.length / 2); for (let k = 0; k < half; k++) for (const w of d.sents[k]) if (readerVisible(w)) c.set(w, (c.get(w) ?? 0) + 1); targetSets.set(di, new Set([...c].filter(([, n]) => n >= 12).map(([w]) => w))); });
  for (let q = 0; q < picked.length; q++) {
    if (done.has(q)) continue;
    if ((Date.now() - t0) / 1000 > maxSec) { console.error("budget reached"); break; }
    const p = picked[q];
    const rec = runSnapshot(corpus, corpus.docs[p.doc], p.doc, p.s, q, wave, targetSets.get(p.doc), q % 2 === 0);
    fs.appendFileSync(file, JSON.stringify(rec) + "\n");
    console.error(`${tag}: snapshot ${q + 1}/${picked.length} s=${p.s} ${rec.seconds}s (rel ${rec.nRel}, entries ${rec.nEntries})`);
  }
  const sha = headerSha256(new URL(import.meta.url).pathname);
  fs.writeFileSync(path.join(OUT, `${tag}.meta.json`), JSON.stringify({ spec, wave, M, headerSha256: sha, snaps: picked.length, finishedAt: new Date().toISOString() }));
  console.log(JSON.stringify({ tag, headerSha256: sha, snapshotsDone: picked.length }));
}

if (cmd === "run") await run();
else if (cmd === "report") { const { report } = await import("./reader-report.mjs"); await report(opt("--out", path.join(HERE, "results", "reader")), { wave: Number(opt("--wave", 1)) }); }
else { console.error("usage: reader-handles.mjs run --corpus <spec> | report --out DIR"); process.exit(2); }
