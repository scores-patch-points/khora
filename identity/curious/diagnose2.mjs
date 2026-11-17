// diagnose2.mjs — POST-HOC (not preregistered): why did C0, C1, C4 fail? (curious2.mjs gained one export, factsFor; nothing else changed.)
import fs from 'node:fs';
import { SOURCES, run, makeWorld, surprisalOf, learn, fitsOf, factsFor } from './curious2.mjs';
import { createHolograph } from '../../native/kernel/bayes-surprise.js';
const pools = JSON.parse(fs.readFileSync('passages.json', 'utf8'));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length, sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
console.log('D1 novelty: the source it lives on (share of encounters after tick 20), by seed:');
for (const seed of [1, 2, 3, 4, 5, 6]) { const r = run({ policy: 'novelty', gamma: 0.95, seed }); const top = SOURCES.map((n) => [n, r.share[n]]).sort((a, b) => b[1] - a[1])[0]; console.log(`   seed ${seed}: ${top[0]} ${top[1].toFixed(2)}`); }
console.log('\nD2 held-out bits per fact vs passages learned (khora holograph, alpha 1; the held-out passages are never learned):');
for (const g of ['literature', 'academic']) {
  const W = makeWorld(1), s = W.src[g], holo = createHolograph({ alpha: 1, gamma: 1 }), pts = [];
  for (let k = 0; k <= s.stream.length; k++) { if ([0, 1, 2, 4, 8, 16, 24, s.stream.length].includes(k)) pts.push(`${k}: ${mean(s.held.map((p) => surprisalOf(holo, factsFor(p)))).toFixed(2)}`); if (k < s.stream.length) learn(holo, factsFor(s.stream[k])); }
  console.log(`   ${g.padEnd(11)} passages learned -> held-out bits/fact   ${pts.join('   ')}`);
}
console.log('\nD3 context signal, normalised for prior size (z-score of each prior\'s fit over all four genres\' passages):');
const G = ['literature', 'government-legal', 'encyclopedic', 'academic'], all = G.flatMap((g) => pools[g].map((p) => ({ g, f: fitsOf(p.text) })));
const mu = Object.fromEntries(G.map((x) => [x, mean(all.map((a) => a.f[x]))])), sg = Object.fromEntries(G.map((x) => [x, sd(all.map((a) => a.f[x]))]));
const z = (f, x) => (f[x] - mu[x]) / sg[x];
console.log('   raw fit, mean over all passages:', Object.fromEntries(G.map((x) => [x, +mu[x].toFixed(3)])));
for (const g of G) { const own = pools[g].map((p) => { const f = fitsOf(p.text); return Math.max(...G.filter((x) => x !== g).map((x) => z(f, x))) - z(f, g); }); console.log(`   ${g.padEnd(17)} own genre best (z): ${(own.filter((x) => x < 0).length / own.length).toFixed(2)}`); }
const fp = pools.firstperson.map((p) => { const f = fitsOf(p.text); return Math.max(...G.filter((x) => x !== 'government-legal').map((x) => z(f, x))) - z(f, 'government-legal'); });
console.log(`   first-person text vs the legal prior: fits another genre better (z): ${(fp.filter((x) => x > 0).length / fp.length).toFixed(2)}`);
const hits = Object.fromEntries(G.map((g) => [g, pools[g].filter((p) => { const f = fitsOf(p.text); return G.reduce((b, x) => (z(f, x) > z(f, b) ? x : b), G[0]) === g; }).length / pools[g].length]));
console.log('   best-fitting prior by z picks the true genre for:', Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, +v.toFixed(2)])));
