// POST-HOC (not preregistered): run the identity hunger to satiety and measure false merges against a strength threshold T.
// usage: node satiety-posthoc.mjs <khoraDir> <warrantModule> <R relations> <D values> <worlds>
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [KH, WMOD, RR = '12', DD = '4', WORLDS = '40'] = process.argv.slice(2);
const { gfpClaim } = await import(pathToFileURL(path.join(KH, 'native/kernel/gfp-claim.js')).href);
const { warrantIdentity } = await import(pathToFileURL(WMOD).href);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261119), int = (n) => Math.floor(rng() * n);
const R = +RR, D = +DD, F = Array.from({ length: R }, (_, i) => `f${i}`), FUNCTIONAL = F.map((rel) => ({ rel, role: 'ARG1' }));
const TS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
const out = Object.fromEntries(TS.map((t) => [t, { merged: 0, falseMerge: 0, trueSame: 0, mergedTrue: 0, held: 0, fetches: 0 }]));
let pairs = 0, sameEntity = 0, distinctIdentical = 0, distinctPairs = 0;

// strength of a coincidence, computed from the claims alone: for each DISTINCT agreeing key, log10(1/p), p = smoothed
// frequency of that value among all + claims of that relation. No truth is used.
function strength(claims, w) {
  const keys = new Map(w.agree.map((a) => [a.key, a.value])); let s = 0;
  for (const [key, val] of keys) { const rel = key.split('\u0001')[0]; const xs = claims.filter((c) => c.rel === rel && c.polarity === '+'); const vals = new Set(xs.map((c) => c.roles.ARG1)); s += Math.log10((xs.length + vals.size + 1) / (xs.filter((c) => c.roles.ARG1 === val).length + 1)); }
  return s;
}
for (let w = 0; w < +WORLDS; w++) {
  const ents = Array.from({ length: 10 }, () => F.map(() => int(D)));
  const names = []; ents.forEach((_, e) => { for (let k = 0, m = 1 + int(2); k < m; k++) names.push({ n: `n${names.length}`, e }); });
  const ent = new Map(names.map((x) => [x.n, x.e]));
  let h = 0; const fact = (n, rel) => gfpClaim({ ground: '/', rel, roles: { ARG0: n, ARG1: `v${ents[ent.get(n)][F.indexOf(rel)]}` }, id: `h${h++}` });
  const base = Array.from({ length: 15 }, () => fact(names[int(names.length)].n, F[int(R)]));
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const x = names[i].n, y = names[j].n, truth = ent.get(x) === ent.get(y); pairs++;
    if (truth) sameEntity++; else { distinctPairs++; if (ents[ent.get(x)].every((v, k) => v === ents[ent.get(y)][k])) distinctIdentical++; }
    // the hunger, to satiety: fetch the next missing one-valued fact (live first: known for one name only), until discerned or exhausted
    let claims = [...base]; const traj = []; let discernedAt = Infinity;
    for (let step = 0; ; step++) {
      const v = warrantIdentity(claims, x, y, { functional: FUNCTIONAL });
      if (v.verdict === 'different') { discernedAt = step; break; }
      traj.push({ step, s: v.verdict === 'same' ? strength(claims, v) : 0 });
      const kx = new Set(claims.filter((c) => c.roles.ARG0 === x).map((c) => c.rel)), ky = new Set(claims.filter((c) => c.roles.ARG0 === y).map((c) => c.rel));
      const live = F.filter((r) => kx.has(r) !== ky.has(r)), cold = F.filter((r) => !kx.has(r) && !ky.has(r));
      if (live.length) { const r = live[0]; claims.push(fact(kx.has(r) ? y : x, r)); }
      else if (cold.length) { claims.push(fact(x, cold[0]), fact(y, cold[0])); }
      else break; // exhausted: everything observable is known for both
    }
    for (const t of TS) {
      const o = out[t]; if (truth) o.trueSame++;
      const cross = traj.find((p) => p.s >= t && p.s > 0);
      if (cross && cross.step < discernedAt) { o.merged++; o.fetches += cross.step; if (truth) o.mergedTrue++; else o.falseMerge++; }
      else if (discernedAt === Infinity) o.held++; // indiscernible on everything, yet too weak to merge: held as a typed gap
    }
  }
}
console.log(`world R=${R} D=${D}: ${pairs} pairs, ${sameEntity} same-entity (${(sameEntity / pairs).toFixed(3)}); distinct pairs identical on all ${R} relations: ${distinctIdentical}/${distinctPairs}`);
console.log('T(decades)  merges  false-merge  recall  held  mean-fetches-to-merge');
for (const t of TS) { const o = out[t]; console.log(`${String(t).padEnd(11)} ${String(o.merged).padEnd(7)} ${(o.merged ? o.falseMerge / o.merged : 0).toFixed(3).padEnd(12)} ${(o.mergedTrue / o.trueSame).toFixed(3).padEnd(7)} ${String(o.held).padEnd(5)} ${(o.merged ? o.fetches / o.merged : 0).toFixed(1)}`); }
