// POST-HOC DIAGNOSTIC (not preregistered): rarity from the survey corpus, pair left out. Derived from the experiment for STOPRULE-PREREG.md (6afa67c7…). usage: node stoprule-exp.mjs <khoraDir> <module> <mode: declared|estimated|noise> [worlds]
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [KH, MOD, MODE = 'declared', WORLDS = '40'] = process.argv.slice(2);
const { gfpClaim } = await import(pathToFileURL(path.join(KH, 'native/kernel/gfp-claim.js')).href);
const { warrantIdentity, estimatePrior } = await import(pathToFileURL(MOD).href);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const WORLD_TYPES = { RICH: { R: 12, D: 4, zipf: false }, POOR: { R: 4, D: 2, zipf: false }, SKEWED: { R: 12, D: 6, zipf: true } };
const noise = MODE === 'noise' ? 0.1 : 0;
const report = { mode: MODE, worlds: +WORLDS, types: {} };
for (const [TYPE, { R, D, zipf }] of Object.entries(WORLD_TYPES)) {
  if (MODE === 'noise' && TYPE !== 'RICH') continue;
  const rng = mulberry32(20261120 + R * 100 + D), int = (n) => Math.floor(rng() * n);
  const zw = Array.from({ length: D }, (_, k) => 1 / (k + 1)), zs = zw.reduce((a, b) => a + b, 0);
  const draw = () => { if (!zipf) return int(D); let u = rng() * zs; for (let k = 0; k < D; k++) { u -= zw[k]; if (u <= 0) return k; } return D - 1; };
  const F = Array.from({ length: R }, (_, i) => `f${i}`), FUNCTIONAL = F.map((rel) => ({ rel, role: 'ARG1' }));
  const m = { pairs: 0, trueSame: 0, merged: 0, falseMerge: 0, mergedTrue: 0, held: 0, heldTrue: 0, falseSplit: 0, fetches: 0, estimates: [], trueRates: [] };
  for (let w = 0; w < +WORLDS; w++) {
    const ents = Array.from({ length: 10 }, () => F.map(() => draw()));
    const names = []; ents.forEach((_, e) => { for (let k = 0, n = 1 + int(2); k < n; k++) names.push({ n: `n${names.length}`, e }); });
    const ent = new Map(names.map((x) => [x.n, x.e])), N = names.map((x) => x.n);
    let h = 0;
    const fact = (n, rel) => { let v = ents[ent.get(n)][F.indexOf(rel)]; if (noise && rng() < noise) v = (v + 1 + int(D - 1)) % D; return gfpClaim({ ground: '/', rel, roles: { ARG0: n, ARG1: `v${v}` }, id: `h${h++}` }); };
    const base = Array.from({ length: 15 }, () => fact(N[int(N.length)], F[int(R)]));
    let truePairs = 0, allPairs = 0;
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { allPairs++; if (ent.get(N[i]) === ent.get(N[j])) truePairs++; }
    const trueRate = truePairs / allPairs; m.trueRates.push(trueRate);
    let rate = trueRate;
    const survey = [...base, ...Array.from({ length: 60 }, () => fact(N[int(N.length)], F[int(R)]))];
    if (MODE === 'estimated') { rate = estimatePrior(survey, N, { functional: FUNCTIONAL }).rate; m.estimates.push(rate); }
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const x = N[i], y = N[j], truth = ent.get(x) === ent.get(y); m.pairs++; if (truth) m.trueSame++;
      let claims = [...base], v;
      for (let step = 0; step < 200; step++) {
        v = warrantIdentity(claims, x, y, { functional: FUNCTIONAL, prior: { rate }, background: survey });
        if (v.verdict !== 'unjudged') break;
        const it = v.hunger.live[0];
        if (it) claims.push(fact(it.missingFor, it.rel)); else { const c = v.hunger.cold[0]; claims.push(fact(x, c.rel), fact(y, c.rel)); }
        m.fetches++;
      }
      if (v.verdict === 'same') { m.merged++; if (truth) m.mergedTrue++; else m.falseMerge++; }
      if (v.verdict === 'held') { m.held++; if (truth) m.heldTrue++; }
      if (v.verdict === 'different' && truth) m.falseSplit++;
    }
  }
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  report.types[TYPE] = { pairs: m.pairs, trueSame: m.trueSame, merged: m.merged, falseMergeRate: +(m.falseMerge / (m.merged || 1)).toFixed(4), recall: +(m.mergedTrue / m.trueSame).toFixed(4),
    held: m.held, heldTrue: m.heldTrue, falseSplits: m.falseSplit, fetchesPerPair: +(m.fetches / m.pairs).toFixed(2),
    trueRateMean: +mean(m.trueRates).toFixed(4), ...(m.estimates.length ? { estimateMean: +mean(m.estimates).toFixed(4), estimateRatio: +(mean(m.estimates) / mean(m.trueRates)).toFixed(3) } : {}) };
}
const T = report.types, ok = (t) => t && t.falseMergeRate <= 0.05 && t.recall >= 0.9;
report.verdict = MODE === 'noise' ? 'measured only' : {
  S1: MODE === 'declared' ? ok(T.RICH) && ok(T.SKEWED) : undefined,
  S2: MODE === 'declared' ? T.POOR.falseMergeRate <= 0.05 : undefined,
  S3: Object.values(T).every((t) => t.falseSplits === 0),
  S4: MODE === 'estimated' ? ['RICH', 'SKEWED'].every((k) => T[k].estimateRatio >= 0.5 && T[k].estimateRatio <= 2 && ok(T[k])) : undefined,
};
console.log(JSON.stringify(report, null, 1));
