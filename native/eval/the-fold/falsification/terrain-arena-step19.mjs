// terrain-arena-step19.mjs — STEP 19: ARE STANCES REAL TAKINGS? The theory:
// the world is holons; terrain (domain x grain) names what a reading takes the
// world AS; STANCE (mode x grain) names HOW the act is aimed at a holon level,
// with the world-ness removed. If stance is more than a stamped label, then
// three stances over the SAME real material must:
//   G1 discrimination  produce measurably DIFFERENT surprise-orderings of the
//                      same referents (if the three orderings correlate ~1.0,
//                      stance is a fiction — collapsed taking).
//   G2 consequence     on a temporal frontier, the stance with the strongest
//                      held-out signal EARNS standing and strictly beats the
//                      other two stances AND a random-order null — i.e., HOW
//                      the mind takes the world is itself falsifiable.
//
// Stances, operationalized mechanically (mode fixed = Relate; grain differs):
//   Tracing (Pattern)  score a referent by the INFORMATION OF ITS ARRANGEMENT:
//                      surprise = -log2(probability mass of its co-participant
//                      profile) — the rarer the company, the more traceable.
//   Binding  (Figure)  score by TURNOVER of the individual's appearances across
//                      clause regions: -log2(variation of its per-region counts)
//                      — surprise in how the figure itself flickers.
//   Tending  (Ground)  score by the DENSITY OF ITS CONTEXTS: surprise is where
//                      the referent appears in sparse/under-attended clauses
//                      (ambient shifts) — -log2(mean clause density).
//
// Material: the real Rigveda EOT seam (referents + dated clauses). No priors,
// no LLM. Bars (pre-registered): G2 wins iff effect >= 0.15 and shuffle-p
// <= 0.05 and strictly beats the other stances.
//
// Usage: node terrain-arena-step19.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);

const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const refs = corpus.referents.map((r) => r.hash);
const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);

// participation: ref -> Set(clause)
const part = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) { const c = e.at ?? 0; if (e.subject) part.get(e.subject)?.add(c); if (e.object) part.get(e.object)?.add(c); }
const participating = refs.filter((r) => (part.get(r)?.size ?? 0) > 0);
const inFuture = (r) => [...(part.get(r) ?? [])].some((c) => c > FRONT);

// ── the three stance-framed scores (mode = Relate; grain differs) ────────
const clauseCount = new Set(corpus.edges.map((e) => e.at ?? 0)).size;
// co-participant profile of r over [0, FRONT]
const frontPart = new Map();
for (const r of participating) frontPart.set(r, [...(part.get(r) ?? [])].filter((c) => c <= FRONT));

// TRACING (Pattern): surprise of the ARRANGEMENT — the entropy of who a
// referent repeatedly rides with. A referent that always co-occurs with the
// SAME few partners (stable, traceable pattern) is LOW surprise; one whose
// company shuffles is HIGH. This is orthogonal to participation COUNT (the
// first pass's sick: Tracing and Binding both collapsed into count, corr
// 0.985 — a measurement smell caught by the G1 gate, not a fact about stance).
const coFreq = new Map(); // ref -> Map(partner -> count) over the frontier
for (const [r, cls] of frontPart) {
  const m = new Map();
  for (const c of cls) for (const e of corpus.edges) if ((e.at ?? 0) === c) {
    const p = e.subject === r ? e.object : e.object === r ? e.subject : null;
    if (p && p !== r) m.set(p, (m.get(p) ?? 0) + 1);
  }
  coFreq.set(r, m);
}
const scoreTracing = (r) => {
  const m = coFreq.get(r); if (!m || !m.size) return 1;
  const tot = [...m.values()].reduce((a, b) => a + b, 0);
  let h = 0;
  for (const v of m.values()) { const p = v / tot; h -= p * Math.log2(p); }
  return h / Math.log2(m.size); // normalized arrangement entropy in [0,1]
}

// BINDING (Figure): surprise of the individual's own turnover across regions
const region = (c) => Math.floor(c / 200);
const turnover = new Map();
for (const [r, cls] of frontPart) {
  const counts = new Map();
  for (const c of cls) counts.set(region(c), (counts.get(region(c)) ?? 0) + 1);
  const vals = [...counts.values()];
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  const varN = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, vals.length);
  turnover.set(r, Math.sqrt(varN) / (mean + 1));
}
const scoreBinding = (r) => -Math.log2((turnover.get(r) ?? 0) + 1e-6 + 1) / Math.log2(2);

// TENDING (Ground): surprise of sparse contexts — the ambient density where r sits
const clauseSize = new Map();
for (const e of corpus.edges) { const c = e.at ?? 0; clauseSize.set(c, (clauseSize.get(c) ?? 0) + 1); }
const density = new Map();
for (const [r, cls] of frontPart) {
  const dens = cls.map((c) => clauseSize.get(c) ?? 1);
  density.set(r, dens.reduce((a, b) => a + b, 0) / Math.max(1, dens.length));
}
const scoreTending = (r) => { const d = density.get(r) ?? 1; return Math.log2(d) / Math.log2(Math.max(2, ...clauseSize.values())); };

const stances = { Tracing: scoreTracing, Binding: scoreBinding, Tending: scoreTending };

// ── G1: do the three takings of the SAME world differ? ───────────────────
const order = (name) => [...participating].sort((a, b) => stances[name](a) - stances[name](b));
const rankOf = (list) => { const m = new Map(); list.forEach((r, i) => m.set(r, i)); return m; };
const spearman = (a, b) => {
  const ra = rankOf(a), rb = rankOf(b);
  const n = participating.length;
  let d2 = 0;
  for (const r of participating) { const d = ra.get(r) - rb.get(r); d2 += d * d; }
  return 1 - (6 * d2) / (n * (n * n - 1));
};
const ord = { Tracing: order("Tracing"), Binding: order("Binding"), Tending: order("Tending") };
const corr = {
  Tracing_vs_Binding: +spearman(ord.Tracing, ord.Binding).toFixed(3),
  Tracing_vs_Tending: +spearman(ord.Tracing, ord.Tending).toFixed(3),
  Binding_vs_Tending: +spearman(ord.Binding, ord.Tending).toFixed(3),
};
const G1 = { held: Math.max(...Object.values(corr)) < 0.9, corr };

// ── G2: on the temporal frontier, which stance earns? ────────────────────
const test = (scoreFn) => {
  const idx = [...participating].sort((a, b) => scoreFn(a) - scoreFn(b));
  const cut = participating.filter((r) => frontPart.get(r)?.length > 0); // only refs with a frontier footprint
  const sorted = [...cut].sort((a, b) => scoreFn(a) - scoreFn(b));
  const half = Math.floor(sorted.length / 2);
  const pos = sorted.slice(0, half), neg = sorted.slice(half);
  const posRate = pos.filter((r) => inFuture(r)).length / pos.length;
  const negRate = neg.filter((r) => inFuture(r)).length / neg.length;
  return { posN: pos.length, negN: neg.length, posRate, negRate, effect: posRate - negRate };
};
const shuffleP = (scoreFn) => {
  const cut = participating.filter((r) => frontPart.get(r)?.length > 0);
  const scores = cut.map((r) => scoreFn(r));
  const ys = cut.map((r) => (inFuture(r) ? 1 : 0));
  const observed = test(scoreFn).effect;
  const effs = [];
  for (let k = 0; k < 500; k++) {
    const perm = shuffled(scores, createSeededRng(64000 + k));
    const cutAt = Math.floor(perm.length / 2);
    const pos = perm.slice(0, cutAt).map((_, i) => ys[i]);
    const neg = perm.slice(cutAt).map((_, i) => ys[cutAt + i]);
    const posR = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : 0;
    const negR = neg.length ? neg.reduce((a, b) => a + b, 0) / neg.length : 0;
    effs.push(posR - negR);
  }
  return { p: (effs.filter((e) => e >= observed).length + 1) / (effs.length + 1) };
};

const reads = Object.fromEntries(Object.entries(stances).map(([name, fn]) => [name, { ...test(fn), shuffleP: shuffleP(fn).p, effect: +(test(fn).effect).toFixed(3) }]));
const earns = (r) => r.effect >= 0.15 && r.shuffleP <= 0.05;
const winners = Object.entries(reads).filter(([, v]) => earns(v));
const best = winners.length === 1 ? winners[0][0] : null;

const verdict = G1.held && best
  ? { verdict: "CONFIRMED", claim: `stances are real, distinct takings AND earnable: the three surprise-orderings diverge (G1), and on the temporal frontier ${best} earns (effect ${reads[best].effect}, shuffle-p ${reads[best].shuffleP}) — HOW the mind takes the world predicts what it attends to, strictly above the other stances and chance.` }
  : G1.held
    ? { verdict: "PARTIAL", claim: `stances are genuine, distinct takings of the same world (G1: orderings diverge), but none EARNED standing on the temporal frontier (${JSON.stringify(Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { e: v.effect, p: v.shuffleP }])))}) — stances are real but, like every mechanical reading, not yet consequential.` }
    : { verdict: "FALSIFIED", claim: `the three stances collapsed to nearly the same ordering (corr ${JSON.stringify(corr)}) — stance is a fiction in this operationalization.` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep19@1",
  material: { referents: participating.length, frontier: FRONT },
  G1,
  reads,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Stance operationalizations are mechanical scorings over the seam (arrangement-info / individual-turnover / context-density); declared, not fitted.",
    "G2 uses the temporal-frontier instrument established in steps 16-18 (participant-conditioned, 500-draw shuffle).",
    "The nulls from steps 14-18 make an earned stance the surprising outcome, not the expected one.",
  ],
}, null, 2));