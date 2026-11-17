import { run, SOURCES } from './curious.mjs';
const t0 = Date.now();
for (const [policy, gamma] of [['random', 0.95], ['roundrobin', 0.95], ['novelty', 0.95], ['curious', 0.95]]) {
  const r = run({ policy, gamma, seed: 1 });
  console.log(policy.padEnd(11), 'held', r.held.toFixed(3), '| shares', SOURCES.map((n) => n.slice(0, 3) + ':' + r.share[n].toFixed(2)).join(' '), '| shift', JSON.stringify(r.shift));
}
console.log('ms', Date.now() - t0);
