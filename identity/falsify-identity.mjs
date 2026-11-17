// Falsification experiment for PREREG.md (sha256 in PREREG.md.sha256). usage: node falsify-identity.mjs <khoraDir> <pharosRepo> [trials] [e3trials]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
const [KH, REPO, TRIALS = '3000', E3N = '200'] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(p)).href);
const { gfpClaim, ancestry, contains } = await imp(path.join(KH, 'native/kernel/gfp-claim.js'));
const { lintGfp } = await imp(path.join(KH, 'native/organs/reasoning-lint.js'));
const P = await imp(path.join(REPO, 'lib/pharos.mjs'));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261117);
const int = (n) => Math.floor(rng() * n);
const pick = (xs) => xs[int(xs.length)];
const GROUNDS = ['/', '/1', '/2', '/1/1', '/1/2', '/2/1', '/1/1/1'];
const POOL = ['a', 'b', 'c', 'd', 'v0', 'v1'];

const genContent = () => Array.from({ length: 4 + int(5) }, (_, i) => {
  const rel = rng() < 0.55 ? 'p' : 'q';
  return gfpClaim({ ground: pick(GROUNDS), rel, roles: { ARG0: pick(POOL), ARG1: pick(POOL) }, polarity: rel === 'q' && rng() < 0.4 ? '-' : '+', id: `c${i}` });
});
const genIds = () => Array.from({ length: int(6) }, () => { const a = pick(POOL); let b = pick(POOL); while (b === a) b = pick(POOL); return { a, b, g: pick(GROUNDS) }; });
const shuffle = (xs) => { const o = [...xs]; for (let i = o.length - 1; i > 0; i--) { const j = int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o; };
function rewrite(ids) { // equivalence-PRESERVING by construction (still checked by measurement, never trusted)
  let o = ids.map((x) => (rng() < 0.4 ? { a: x.b, b: x.a, g: x.g } : { ...x }));
  for (const x of ids) { // implied transitive claims at the deeper ground
    for (const y of ids) {
      if (x === y) continue;
      const shared = [x.a, x.b].find((n) => n === y.a || n === y.b);
      if (!shared) continue;
      const xo = x.a === shared ? x.b : x.a, yo = y.a === shared ? y.b : y.a;
      if (xo === yo) continue;
      const deeper = contains(x.g, y.g) ? y.g : contains(y.g, x.g) ? x.g : null;
      if (deeper && rng() < 0.5) o.push({ a: xo, b: yo, g: deeper });
    }
    const kids = GROUNDS.filter((g) => g !== x.g && contains(x.g, g)); // redundant restatement deeper
    if (kids.length && rng() < 0.4) o.push({ a: x.a, b: x.b, g: pick(kids) });
    if (rng() < 0.2) o.push({ ...x }); // duplicate
  }
  return shuffle(o);
}
function mutate(ids) {
  const o = ids.map((x) => ({ ...x })), r = rng();
  if (r < 0.4 || !o.length) { const a = pick(POOL); let b = pick(POOL); while (b === a) b = pick(POOL); o.push({ a, b, g: pick(GROUNDS) }); }
  else if (r < 0.7) o.splice(int(o.length), 1);
  else o[int(o.length)].g = pick(GROUNDS);
  return o;
}
const idClaims = (ids, tag) => ids.map((x, i) => gfpClaim({ ground: x.g, rel: 'same-as', roles: { ARG0: x.a, ARG1: x.b }, id: `${tag}${i}` }));
const OPTS = { functional: [{ rel: 'p', role: 'ARG1', giver: 'experiment' }], identityRels: ['same-as'] };
const verdict = (r) => JSON.stringify({ ok: r.ok, counts: r.counts, unjudged: r.unjudged, apart: r.apart, findings: r.findings.map((f) => `${f.kind}|${f.at}|${f.severity}|${(f.claims || []).join(',')}`).sort() });
const part = (r, h) => JSON.stringify(r.holons.find((x) => x.at === h)?.identity ?? 'MISSING');
const claimSet = (ids) => JSON.stringify([...new Set(ids.map((x) => `${[x.a, x.b].sort().join('~')}@${x.g}`))].sort());

function toPharos(name, lint, CH) {
  const h = P.open('lint', { dir: fs.mkdtempSync(path.join(os.tmpdir(), `fi-${name}-`)), writer: name });
  for (const [k, cell] of [['source', 'INS·Figure'], ['judgement', 'EVA·Figure']]) P.weave(h, { cell: 'DEF·Figure', kind: 'kind', addr: `kind:${k}`, body: { name: k, cell } });
  const hols = lint.holons.filter((x) => CH.has(x.at));
  const src = (hol) => { const b = { at: hol.at, identity: hol.identity }; return P.weave(h, { cell: 'INS·Figure', kind: 'source', addr: 'src:' + sha(P.canonical(b)), body: b }).id; };
  for (const hol of hols) P.weave(h, { cell: 'EVA·Figure', kind: 'judgement', addr: `holon:${hol.at}`, body: { own: hol.own, below: hol.below, errors: hol.errors }, of: hols.filter((x) => contains(hol.at, x.at)).map(src) });
  for (const f of lint.findings) if (CH.has(f.at)) P.weave(h, { cell: 'EVA·Figure', kind: 'judgement', addr: `finding:${f.kind}@${f.at}`, body: { severity: f.severity }, of: [src(hols.find((x) => x.at === f.at))] });
  return h;
}

const S = { trials: 0, E1: { equalPartitions: 0, equalPartitionsDifferentClaims: 0, violations: 0 }, E2: { differing: 0, probed: 0, violations: 0 }, E3: { n: 0, mismatches: 0 }, E4: { coincident: 0, live: 0, latent: 0 } };
const examples = [];
const keep = (k, o) => { if (examples.length < 3) examples.push({ k, ...o }); };
const tmps = [];
for (let t = 0; t < +TRIALS; t++) {
  S.trials++;
  const content = genContent(), ids1 = genIds(), ids2 = rng() < 0.4 ? rewrite(ids1) : mutate(ids1);
  const A = lintGfp([...content, ...idClaims(ids1, 'iA')], OPTS), B = lintGfp([...content, ...idClaims(ids2, 'iB')], OPTS);
  const CH = new Set(content.flatMap((c) => ancestry(c.ground)));
  const diffH = [...CH].filter((h) => part(A, h) !== part(B, h));
  const equal = diffH.length === 0, vsame = verdict(A) === verdict(B);
  if (equal) { // H1
    S.E1.equalPartitions++;
    if (claimSet(ids1) !== claimSet(ids2)) S.E1.equalPartitionsDifferentClaims++;
    if (!vsame) { S.E1.violations++; keep('H1', { content: content.map((c) => [c.ground, c.rel, c.roles.ARG0, c.roles.ARG1, c.polarity]), ids1, ids2 }); }
  } else { // H2
    S.E2.differing++;
    const h = diffH[0], ca = A.holons.find((x) => x.at === h).identity, cb = B.holons.find((x) => x.at === h).identity;
    const names = [...new Set([...ca.flat(), ...cb.flat()])];
    const merged = (cls, x, y) => cls.some((g) => g.includes(x) && g.includes(y));
    let pair = null, mergingIsA = null;
    for (const x of names) { for (const y of names) if (x < y && merged(ca, x, y) !== merged(cb, x, y)) { pair = [x, y]; mergingIsA = merged(ca, x, y); break; } if (pair) break; }
    if (!pair) { S.E2.violations++; keep('H2-nopair', { h, ca, cb }); }
    else {
      S.E2.probed++;
      const probe = [gfpClaim({ ground: h, rel: 'pr', roles: { ARG0: pair[0], ARG1: 'o' }, polarity: '+', id: 'pr1' }), gfpClaim({ ground: h, rel: 'pr', roles: { ARG0: pair[1], ARG1: 'o' }, polarity: '-', id: 'pr2' })];
      const PA = lintGfp([...content, ...probe, ...idClaims(ids1, 'iA')], OPTS), PB = lintGfp([...content, ...probe, ...idClaims(ids2, 'iB')], OPTS);
      const has = (r) => r.findings.some((f) => f.kind === 'polarity_contradiction' && f.at === h && (f.claims || []).includes('pr1'));
      if (!(mergingIsA ? has(PA) && !has(PB) : has(PB) && !has(PA)) || verdict(PA) === verdict(PB)) { S.E2.violations++; keep('H2', { h, pair, mergingIsA, ca, cb }); }
    }
    if (vsame) { // E4: coincident
      S.E4.coincident++;
      const present = new Set(content.flatMap((c) => [c.roles.ARG0, c.roles.ARG1]));
      const live = diffH.some((hh) => { const a = A.holons.find((x) => x.at === hh).identity, b = B.holons.find((x) => x.at === hh).identity; const nm = [...new Set([...a.flat(), ...b.flat()])]; return nm.some((x) => nm.some((y) => x < y && merged(a, x, y) !== merged(b, x, y) && present.has(x) && present.has(y))); });
      live ? S.E4.live++ : S.E4.latent++;
    }
  }
  if (t < +E3N) { // H3
    const pa = toPharos('A', A, CH), pb = toPharos('B', B, CH); tmps.push(pa.dir, pb.dir);
    const inSync = P.compare(pa, pb).inSync;
    S.E3.n++;
    if (inSync !== equal) { S.E3.mismatches++; keep('H3', { inSync, equal, diffH }); }
  }
}
for (const d of tmps) fs.rmSync(d, { recursive: true, force: true });
console.log(JSON.stringify({ ...S, examples }, null, 1));
process.exit(S.E1.violations + S.E2.violations + S.E3.mismatches ? 1 : 0);
