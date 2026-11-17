// Experiment for SEVERITY-PREREG.md (cc8f3d29…). usage: node severity-exp.mjs <khoraDir> <module> <order: first|severe|anti> [worlds]
// Fetches are counted as FACTS fetched (a cold item is two). Noise-free, declared true prior.
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [KH, MOD, ORDER = 'first', WORLDS = '40'] = process.argv.slice(2);
const { gfpClaim } = await import(pathToFileURL(path.join(KH, 'native/kernel/gfp-claim.js')).href);
const { warrantIdentity } = await import(pathToFileURL(MOD).href);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const WORLD_TYPES = { RICH: { R: 12, D: 4, zipf: false }, POOR: { R: 4, D: 2, zipf: false }, SKEWED: { R: 12, D: 6, zipf: true } };
const report = { order: ORDER, worlds: +WORLDS, types: {} };
for (const [TYPE, { R, D, zipf }] of Object.entries(WORLD_TYPES)) {
  const rng = mulberry32(20261123 + R * 100 + D), int = (n) => Math.floor(rng() * n);
  const zw = Array.from({ length: D }, (_, k) => 1 / (k + 1)), zs = zw.reduce((a, b) => a + b, 0);
  const draw = () => { if (!zipf) return int(D); let u = rng() * zs; for (let k = 0; k < D; k++) { u -= zw[k]; if (u <= 0) return k; } return D - 1; };
  const F = Array.from({ length: R }, (_, i) => `f${i}`), FUNCTIONAL = F.map((rel) => ({ rel, role: 'ARG1' }));
  const m = { pairs: 0, trueSame: 0, merged: 0, falseMerge: 0, mergedTrue: 0, held: 0, falseSplit: 0, facts: 0 };
  for (let w = 0; w < +WORLDS; w++) {
    const ents = Array.from({ length: 10 }, () => F.map(() => draw()));
    const names = []; ents.forEach((_, e) => { for (let k = 0, n = 1 + int(2); k < n; k++) names.push({ n: `n${names.length}`, e }); });
    const ent = new Map(names.map((x) => [x.n, x.e])), N = names.map((x) => x.n);
    let h = 0; const fact = (n, rel) => gfpClaim({ ground: '/', rel, roles: { ARG0: n, ARG1: `v${ents[ent.get(n)][F.indexOf(rel)]}` }, id: `h${h++}` });
    const base = Array.from({ length: 15 }, () => fact(N[int(N.length)], F[int(R)]));
    const corpus = [...base, ...Array.from({ length: 60 }, () => fact(N[int(N.length)], F[int(R)]))];
    let tp = 0, ap = 0; for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { ap++; if (ent.get(N[i]) === ent.get(N[j])) tp++; }
    const rate = tp / ap;
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const x = N[i], y = N[j], truth = ent.get(x) === ent.get(y); m.pairs++; if (truth) m.trueSame++;
      let claims = [...base], v;
      for (let s = 0; s < 200; s++) {
        v = warrantIdentity(claims, x, y, { functional: FUNCTIONAL, prior: { rate }, background: corpus });
        if (v.verdict !== 'unjudged') break;
        let it;
        if (ORDER === 'first') it = v.hunger.live[0] ?? v.hunger.cold[0];
        else if (ORDER === 'severe') it = v.hunger.next;
        else it = [...v.hunger.live, ...v.hunger.cold].sort((a, b) => a.severity / a.cost - b.severity / b.cost)[0];
        if (it.missingFor) { claims.push(fact(it.missingFor, it.rel)); m.facts++; } else { claims.push(fact(x, it.rel), fact(y, it.rel)); m.facts += 2; }
      }
      if (v.verdict === 'same') { m.merged++; if (truth) m.mergedTrue++; else m.falseMerge++; }
      if (v.verdict === 'held') m.held++;
      if (v.verdict === 'different' && truth) m.falseSplit++;
    }
  }
  report.types[TYPE] = { pairs: m.pairs, factsPerPair: +(m.facts / m.pairs).toFixed(4), falseMergeRate: +(m.falseMerge / (m.merged || 1)).toFixed(4), recall: +(m.mergedTrue / m.trueSame).toFixed(4), held: m.held, falseSplits: m.falseSplit };
}
console.log(JSON.stringify(report, null, 1));
