// POST-HOC (not preregistered): false merges by evidence strength. Derived from the experiment for IDENTITY-PREREG.md. usage: node identity-exp.mjs <khoraDir> <warrantModulePath> <worldsPerD> <h3WorldsPerD> <noise>
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [KH, WMOD, WORLDS = '300', H3W = '100', NOISE = '0'] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(p).href);
const { gfpClaim } = await imp(path.join(KH, 'native/kernel/gfp-claim.js'));
const { lintGfp } = await imp(path.join(KH, 'native/organs/reasoning-lint.js'));
const { warrantIdentity } = await imp(WMOD);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261118), int = (n) => Math.floor(rng() * n), noise = +NOISE;
const F = ['f0', 'f1', 'f2'], FUNCTIONAL = F.map((rel) => ({ rel, role: 'ARG1', giver: 'world' }));
const OPTS = { functional: FUNCTIONAL, identityRels: ['same-as'] };
const CONFLICT = new Set(['standing_contradiction', 'polarity_contradiction', 'overridden_in_scope', 'refuted_in_scope']);

function world(D) {
  const ents = Array.from({ length: 10 }, () => ({ f: F.map(() => int(D)), q: [0, 1, 2, 3].filter(() => rng() < 0.5) }));
  const names = []; let n = 0;
  ents.forEach((_, e) => { for (let k = 0, m = 1 + int(2); k < m; k++) names.push({ name: `n${n++}`, e }); });
  for (let i = names.length - 1; i > 0; i--) { const j = int(i + 1); [names[i], names[j]] = [names[j], names[i]]; }
  const truth = new Map(names.map((x) => [x.name, x.e]));
  const fact = (name, rel, id, wrong = false) => {
    const e = ents[truth.get(name)];
    if (rel === 'q') { const v = int(4); return gfpClaim({ ground: '/', rel: 'q', roles: { ARG0: name, ARG1: `w${v}` }, polarity: e.q.includes(v) ? '+' : '-', id }); }
    const r = F.indexOf(rel); let v = e.f[r];
    if (wrong) v = (v + 1 + int(D - 1)) % D;
    return gfpClaim({ ground: '/', rel, roles: { ARG0: name, ARG1: `v${v}` }, id });
  };
  const claims = Array.from({ length: 10 + int(16) }, (_, i) => { const nm = names[int(names.length)].name, rel = rng() < 0.75 ? F[int(3)] : 'q'; return fact(nm, rel, `c${i}`, rel !== 'q' && rng() < noise); });
  return { names: names.map((x) => x.name), truth, claims, fact };
}

const R = { worldsPerD: +WORLDS, noise, H1: { pairs: 0, sameEntityPairs: 0, violations: 0 }, H2: { unjudged: 0, closed: 0, violations: 0, fetches: 0 }, H3: { checked: 0, violations: 0 },
  verdicts: { same: 0, different: 0, unjudged: 0 }, strength: {}, falseMerge: {}, falseSplit: { sameEntity: 0, saidDifferent: 0 }, examples: [] };
const keep = (o) => { if (R.examples.length < 3) R.examples.push(o); };
for (const D of [2, 3, 5]) {
  for (let w = 0; w < +WORLDS; w++) {
    const W = world(D), base = w < +H3W && !noise ? lintGfp(W.claims, OPTS) : null;
    const baseKeys = base ? new Set(base.findings.map((f) => `${f.kind}|${f.at}|${(f.claims || []).join(',')}`)) : null;
    for (let i = 0; i < W.names.length; i++) for (let j = i + 1; j < W.names.length; j++) {
      const x = W.names[i], y = W.names[j], same = W.truth.get(x) === W.truth.get(y);
      const v = warrantIdentity(W.claims, x, y, { functional: FUNCTIONAL });
      R.H1.pairs++; R.verdicts[v.verdict]++;
      if (same) { R.H1.sameEntityPairs++; R.falseSplit.sameEntity++; if (v.verdict === 'different') R.falseSplit.saidDifferent++; }
      if (!noise && same && v.verdict === 'different') { R.H1.violations++; keep({ H: 'H1', D, x, y, conflicts: v.conflicts }); }
      if (v.verdict === 'same') {
        // strength: each DISTINCT agreeing key contributes 1/p, p = how often that value occurs for that relation among all
        // claims in this world (no truth used). log10 of the product = bits-of-coincidence, in decimal.
        const keys = new Map(v.agree.map((a) => [a.key, a.value]));
        let lr = 0; for (const [key, val] of keys) { const rel = key.split('\u0001')[0]; const xs = W.claims.filter((c) => c.rel === rel && c.polarity === '+'); const p = xs.filter((c) => c.roles.ARG1 === val).length / xs.length; lr += Math.log10(1 / p); }
        const sb = `s${Math.min(Math.floor(lr * 2) / 2, 2.5).toFixed(1)}`; const sbk = R.strength[sb] || (R.strength[sb] = { same: 0, distinct: 0 }); sbk.same++; if (!same) sbk.distinct++;
        const kd = `distinctKeys${Math.min(keys.size, 3)}`; const kk = R.strength[kd] || (R.strength[kd] = { same: 0, distinct: 0 }); kk.same++; if (!same) kk.distinct++;
        const k = `D${D}:k${Math.min(v.agree.length, 3)}`; const b = R.falseMerge[k] || (R.falseMerge[k] = { same: 0, distinct: 0 }); b.same++; if (!same) b.distinct++; }
      if (v.verdict === 'unjudged') { // H2: satiate the hunger list from the world (true facts), then decide again
        R.H2.unjudged++;
        const got = []; let f = 0;
        for (const it of v.hunger.live) got.push(W.fact(it.missingFor, it.rel, `h${f++}`));
        for (const it of v.hunger.cold) { got.push(W.fact(x, it.rel, `h${f++}`)); got.push(W.fact(y, it.rel, `h${f++}`)); }
        R.H2.fetches += got.length;
        const v2 = warrantIdentity([...W.claims, ...got], x, y, { functional: FUNCTIONAL });
        if (v2.verdict === 'unjudged') { R.H2.violations++; keep({ H: 'H2', D, x, y, hunger: v.hunger }); } else R.H2.closed++;
      }
      if (base) { // H3: the kernel's own conflict rules, with the identity declared
        const withId = lintGfp([...W.claims, gfpClaim({ ground: '/', rel: 'same-as', roles: { ARG0: x, ARG1: y }, id: 'sid' })], OPTS);
        const about = new Set(W.claims.filter((c) => c.roles.ARG0 === x || c.roles.ARG0 === y).map((c) => c.id));
        const raised = withId.findings.some((f) => CONFLICT.has(f.kind) && (f.claims || []).some((id) => about.has(id)) && !baseKeys.has(`${f.kind}|${f.at}|${(f.claims || []).join(',')}`));
        R.H3.checked++;
        if (raised !== (v.verdict === 'different')) { R.H3.violations++; keep({ H: 'H3', D, x, y, verdict: v.verdict, raised }); }
      }
    }
  }
}
R.H2.meanFetches = R.H2.unjudged ? +(R.H2.fetches / R.H2.unjudged).toFixed(2) : 0;
for (const b of [...Object.values(R.falseMerge), ...Object.values(R.strength)]) b.rate = +(b.distinct / b.same).toFixed(3);
R.falseSplit.rate = +(R.falseSplit.saidDifferent / R.falseSplit.sameEntity).toFixed(3);
console.log(JSON.stringify(R, null, 1));
process.exit(noise ? 0 : R.H1.violations + R.H2.violations + R.H3.violations ? 1 : 0);
