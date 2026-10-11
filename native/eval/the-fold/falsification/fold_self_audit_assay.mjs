#!/usr/bin/env node
// Fold self-audit experiment, 2026-10-10.
// Usage: node fold_self_audit_assay.mjs /path/to/eoreader7/native
// Runs the actual kernel modules from a checkout in isolated shadow copies.
// Never modifies the user's checkout; candidate edits are temporary.

import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const native = path.resolve(process.argv[2] || './native');
const kernel = path.join(native, 'kernel');
const filenames = ['rng.js', 'entity-kind-induction.js', 'kind-functional-induction.js'];
const original = new Map();
for (const f of filenames) original.set(f, await readFile(path.join(kernel, f), 'utf8'));
const work = await mkdtemp(path.join(tmpdir(), 'fold-self-audit-'));

function patchEntity(src, mode) {
  if (mode === 'baseline') return src;
  const cutoff = '.slice(0, neighborCount);';
  const tieAware = '.filter((entry, idx, sorted) => sorted.length <= neighborCount || entry.affinity >= sorted[Math.min(neighborCount, sorted.length) - 1].affinity);';
  if (!src.includes(cutoff)) throw new Error('Neighbor cutoff changed; inspect the real source before patching');
  src = src.replace(cutoff, tieAware);
  if (mode === 'ties') return src;
  const bondDecl = '  const bonds = [];\n  for (let i = 0; i < entityIds.length; i += 1) {';
  const bondPush = '      bonds.push(freeze({ a, b, affinity: affinityBetween(field, a, b) }));';
  if (!src.includes(bondDecl) || !src.includes(bondPush)) throw new Error('Bond assembly changed; this patch is no longer valid');
  src = src.replace(bondDecl, `  const bonds = [];
  const parent = new Map(entityIds.map(id => [id, id]));
  const find = x => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  for (let i = 0; i < entityIds.length; i += 1) {`);
  src = src.replace(bondPush, `      const pa = find(a), pb = find(b);
      if (pa === pb) continue;
      parent.set(pa, pb);
      bonds.push(freeze({ a, b, affinity: affinityBetween(field, a, b) }));`);
  // IMPORTANT: field.bonds is now a connected-component witness forest,
  // not the original exhaustive bond list. This is not a drop-in release.
  return src;
}

async function loadVariant(mode) {
  const dir = path.join(work, mode);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'package.json'), '{"type":"module"}\n');
  for (const file of filenames) {
    let contents = original.get(file);
    if (file === 'entity-kind-induction.js') contents = patchEntity(contents, mode);
    await writeFile(path.join(dir, file), contents);
  }
  const fn = await import(pathToFileURL(path.join(dir, 'kind-functional-induction.js')).href);
  const entity = await import(pathToFileURL(path.join(dir, 'entity-kind-induction.js')).href);
  const rng = await import(pathToFileURL(path.join(dir, 'rng.js')).href);
  return { fn, entity, rng };
}

function random(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(xs, seed) {
  const a = [...xs], rand = random(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function world(spec, seed, rename = 0, dialect = 'heldout') {
  const { family, n = 40, depth = 2, groupSize = 5 } = spec;
  const nodes = [], roots = [];
  if (family === 'chain') {
    for (let i = 0; i < n; i++) {
      const t = i % 2, leaf = `leaf${i}`;
      const ls = dialect === 'audit' ? (t ? ['b', 'c', 'd'] : ['e', 'f', 'g'])
        : (t ? ['v', 'w', 'x'] : ['a', 'b', 'c']);
      nodes.push({ id: leaf, as: ls.map(rel => ({ rel, value: true })) });
      let prev = leaf;
      for (let j = depth - 1; j >= 1; j--) {
        const name = `inter${j}_${i}`;
        nodes.push({ id: name, as: [{ rel: dialect === 'audit' ? 'link' : 'feeds', value: prev }] });
        prev = name;
      }
      const root = `root${i}`;
      nodes.push({ id: root, as: [{ rel: 'uses', value: prev }] });
      roots.push(root);
    }
  } else if (family === 'cohort') {
    for (let i = 0; i < n; i++) {
      const group = Math.floor(i / groupSize), id = `cohort${i}`;
      const prefix = dialect === 'audit' ? ['role', 'channel', 'r'] : ['role', 'context', 'action'];
      nodes.push({ id, as: prefix.map(rel => ({ rel: rel + group, value: true })) });
      roots.push(id);
    }
  } else if (family === 'noise') {
    const rand = random(seed);
    for (let i = 0; i < n; i++) {
      const id = `noise${i}`, count = 1 + Math.floor(rand() * 3), as = [];
      for (let j = 0; j < count; j++) as.push({ rel: 'feature' + Math.floor(rand() * 15), value: true });
      nodes.push({ id, as }); roots.push(id);
    }
  } else if (family === 'flat') {
    for (let i = 0; i < n; i++) {
      const id = `flat${i}`;
      nodes.push({ id, as: [{ rel: 'single', value: true }] }); roots.push(id);
    }
  } else throw new Error(`Unknown world family: ${family}`);
  const old = nodes.map(x => x.id), order = rename ? shuffle(old, rename) : old;
  const map = new Map(old.map(id => [id, rename ? `node${String(order.indexOf(id)).padStart(4, '0')}` : id]));
  const converted = nodes.map(x => ({ id: map.get(x.id), as: x.as.map((a, i) => ({
    ...a, value: map.get(a.value) ?? a.value, id: `${map.get(x.id)}:${i}`, seq: i
  })) }));
  const ids = converted.map(x => x.id);
  return { ids, known: new Set(ids), rows: new Map(converted.map(x => [x.id, x.as])), roots: roots.map(x => map.get(x)) };
}
function induce(engine, w, spec, population) {
  return engine.fn.induceKindsAndFunctions(w.ids, {
    assertionsOf: id => w.rows.get(id),
    sameValue: (a, b) => a === b,
    exposureFloor: 2,
    kindOptions: { population, permutations: 32 },
    objectKinds: { rounds: Math.max(2, spec.depth ?? 2), referentOf: x => w.known.has(x) ? x : null }
  });
}
const key = (result, id) => [...result.kindsOf(id)].sort().join('|') || 'NONE';
function adjustedRand(a, b) {
  if (a.length !== b.length) throw new Error('Mismatched sample lengths');
  const n = a.length, aa = new Map(), bb = new Map(), both = new Map();
  const comb = x => x * (x - 1) / 2;
  for (let i = 0; i < n; i++) {
    aa.set(a[i], (aa.get(a[i]) || 0) + 1);
    bb.set(b[i], (bb.get(b[i]) || 0) + 1);
    const pair = a[i] + '\u0000' + b[i];
    both.set(pair, (both.get(pair) || 0) + 1);
  }
  const sum = m => [...m.values()].reduce((s, count) => s + comb(count), 0);
  const A = sum(aa), B = sum(bb), C = sum(both), expect = A * B / comb(n);
  const denominator = (A + B) / 2 - expect;
  return Math.abs(denominator) < 1e-10 ? 1 : (C - expect) / denominator;
}
function metricCase(spec, seed, dialect, renameSeed, baseline, forest) {
  const w = world(spec, seed, 0, dialect), wr = world(spec, seed, renameSeed, dialect);
  const a = induce(baseline, w, spec, dialect), b = induce(baseline, wr, spec, dialect);
  const c = induce(forest, w, spec, dialect), d = induce(forest, wr, spec, dialect);
  const signatures = new Map();
  for (const id of w.ids) {
    const signature = [...new Set(w.rows.get(id).map(row => row.rel))].sort().join('|');
    signatures.set(signature, (signatures.get(signature) || 0) + 1);
  }
  const baselineARI = adjustedRand(w.roots.map(id => key(a, id)), wr.roots.map(id => key(b, id)));
  const repairedARI = adjustedRand(w.roots.map(id => key(c, id)), wr.roots.map(id => key(d, id)));
  return {
    family: spec.family, n: w.ids.length, seed,
    depth: spec.depth ?? null, groupSize: spec.groupSize ?? null,
    maxMultiplicity: Math.max(...signatures.values()),
    k: Math.ceil(Math.sqrt(w.ids.length)), kinds: a.kinds.length,
    coverage: w.roots.filter(id => key(a, id) !== 'NONE').length / w.roots.length,
    baselineARI, repairedARI, gain: repairedARI - baselineARI
  };
}
const atoms = {
  multiplicity_above_cutoff: x => x.maxMultiplicity > x.k + 1,
  multiplicity_ratio_over_two: x => x.maxMultiplicity > 2 * x.k,
  kinds_earned: x => x.kinds > 0,
  multiple_kinds: x => x.kinds > 1,
  cover_nonzero: x => x.coverage > 0,
  coverage_complete: x => x.coverage === 1,
  large_population: x => x.n >= 100,
  small_population: x => x.n < 60
};
const featureNames = Object.keys(atoms);
function ruleCandidates() {
  const out = featureNames.map(n => [n]);
  for (let i = 0; i < featureNames.length; i++) for (let j = i + 1; j < featureNames.length; j++)
    out.push([featureNames[i], featureNames[j]]);
  return out;
}
const candidateRules = ruleCandidates();
function chooseRule(cases) {
  return candidateRules.map(terms => {
    let TP = 0, FP = 0, TN = 0, FN = 0;
    for (const c of cases) {
      const prediction = terms.every(t => atoms[t](c)), actual = c.gain > 0.01;
      if (prediction && actual) TP++;
      else if (prediction && !actual) FP++;
      else if (!prediction && !actual) TN++;
      else FN++;
    }
    return { terms, TP, FP, TN, FN, errors: FP + FN };
  }).sort((a, b) => a.errors - b.errors || a.terms.length - b.terms.length || b.TP - a.TP ||
    a.terms.join('|').localeCompare(b.terms.join('|')))[0];
}
function predict(rule, row) { return rule.terms.every(t => atoms[t](row)); }
function featuresFromAudits(rows) {
  const f = new Map();
  rows.forEach((r, i) => {
    const attributes = {
      'topology.profile_cutoff': r.maxMultiplicity > r.k + 1 ? 'over' : r.maxMultiplicity === r.k + 1 ? 'at' : 'under',
      'topology.profile_size_overK': r.maxMultiplicity / r.k > 2 ? 'large' : r.maxMultiplicity / r.k > 1 ? 'medium' : 'small',
      'prior.kinds': r.kinds === 0 ? 'none' : r.kinds <= 4 ? 'few' : 'many',
      'prior.coverage': r.coverage === 0 ? 'none' : r.coverage < 1 ? 'partial' : 'full',
      'source.extent': r.n >= 100 ? 'large' : r.n >= 60 ? 'medium' : 'small',
      'source.repeated_profile': r.maxMultiplicity > 1 ? 'repeat' : 'unique'
    };
    const m = new Map();
    for (const [featureKey, featureValue] of Object.entries(attributes)) {
      const signature = featureKey + '=' + featureValue;
      m.set(signature, { featureKey, featureValue, evidenceIds: new Set([`audit:${i}:${signature}`]),
        witnessRefs: new Set([`audit:${i}`]), firstAt: i, lastAt: i });
    }
    f.set(`audit${i}`, m);
  });
  return f;
}
function nullFeatures(events) {
  const m = new Map();
  events.forEach(({ id, rel }, i) => {
    if (!m.has(id)) m.set(id, new Map());
    const row = m.get(id), signature = rel + '=true';
    if (!row.has(signature)) row.set(signature, { featureKey: rel, featureValue: true,
      evidenceIds: new Set(), firstAt: i, lastAt: i });
    row.get(signature).evidenceIds.add(i);
  });
  return m;
}
function nullExperiment(engine, shuffled, makeRng) {
  const random = randomFactory(1170), events = [];
  for (let i = 0; i < 68; i++) {
    const count = 1 + Math.floor(random() * 3);
    for (let j = 0; j < count; j++) events.push({ id: `noise${i}`, rel: 'feature' + Math.floor(random() * 15) });
  }
  const induce = (rows, population) => engine.entity.induceEntityKindCandidates(nullFeatures(rows),
    { population, permutations: 40 });
  const real = induce(events, 'noise-observed');
  const distribution = [];
  for (let s = 0; s < 45; s++) {
    const rs = shuffled(events.map(x => x.rel), makeRng({ purpose: 'outer-null', seed: s }));
    distribution.push(induce(events.map((x, i) => ({ ...x, rel: rs[i] })), 'noise-outer-null-' + s).diagnostics.validated);
  }
  const actual = real.diagnostics.validated;
  const exceeds = distribution.filter(n => n >= actual).length;
  const histogram = {};
  for (const n of distribution) histogram[n] = (histogram[n] || 0) + 1;
  return { nReferents: 68, nEvidence: events.length, validated: actual,
    candidateInternalP: real.candidates.filter(c => c.field?.stable).map(c => c.cohesionNull.pValue),
    nullDraws: distribution.length, nullHistogram: histogram,
    outerP: (exceeds + 1) / (distribution.length + 1),
    meanValidatedUnderNull: distribution.reduce((a, b) => a + b, 0) / distribution.length };
}
function randomFactory(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

try {
  const baseline = await loadVariant('baseline');
  const forest = await loadVariant('forest');
  const ties = await loadVariant('ties');
  const trainSpecs = [];
  for (const n of [24, 32, 40]) for (const depth of [2, 3]) trainSpecs.push({ family: 'chain', n, depth });
  for (const groupSize of [3, 4, 5, 8, 12]) trainSpecs.push({ family: 'cohort', n: groupSize * 8, groupSize });
  for (const n of [36, 48, 60]) trainSpecs.push({ family: 'noise', n });
  const training = trainSpecs.map((spec, i) => metricCase(spec, 100 + i, 'audit', 1001 + i, baseline, forest));
  const kinds = baseline.entity.induceEntityKindCandidates(featuresFromAudits(training),
    { population: 'self-audit:rename', neighborCount: 14, permutations: 99, minKindSize: 2 });
  const metaKinds = kinds.candidates.map(c => ({
    members: c.memberRefs, nullP: c.cohesionNull.pValue, stable: c.field.stable,
    meanRepairGain: c.memberRefs.reduce((s, ref) => s + training[Number(ref.slice(5))].gain, 0) / c.memberRefs.length,
    distinguishing: c.distinguishingParameters.map(p => p.signature)
  }));
  const firstRule = chooseRule(training);
  const challenges = [60, 84].map((n, i) => metricCase({ family: 'flat', n }, 160 + i,
    'heldout', 10160 + i, baseline, forest));
  const revisedRule = chooseRule([...training, ...challenges]);
  const testSpecs = [
    { family: 'chain', n: 28, depth: 2 }, { family: 'chain', n: 28, depth: 3 },
    { family: 'chain', n: 36, depth: 2 }, { family: 'chain', n: 36, depth: 3 },
    { family: 'cohort', n: 32, groupSize: 4 }, { family: 'cohort', n: 56, groupSize: 7 },
    { family: 'cohort', n: 80, groupSize: 10 }, { family: 'cohort', n: 112, groupSize: 14 },
    { family: 'noise', n: 42 }, { family: 'noise', n: 56 }, { family: 'noise', n: 68 },
    { family: 'flat', n: 50 }, { family: 'flat', n: 70 }
  ];
  const heldout = testSpecs.map((spec, i) => {
    const seed = 800 + i * 37;
    const measured = metricCase(spec, seed, 'heldout', 10000 + seed, baseline, forest);
    return { ...measured, helped: measured.gain > 0.01,
      beforePrediction: predict(firstRule, measured), afterPrediction: predict(revisedRule, measured) };
  });
  const confusion = (field) => heldout.reduce((m, item) => {
    const p = item[field], t = item.helped;
    m[p ? (t ? 'TP' : 'FP') : (t ? 'FN' : 'TN')]++;
    return m;
  }, { TP: 0, FP: 0, TN: 0, FN: 0 });
  const bondCounts = [];
  for (const n of [60, 120, 180]) {
    const f = new Map();
    for (let i = 0; i < n; i++) {
      const id = 'a' + i, signature = 'same=true';
      f.set(id, new Map([[signature, { featureKey: 'same', featureValue: true,
        evidenceIds: new Set([id]), firstAt: i, lastAt: i }]]));
    }
    const run = engine => engine.entity.induceEntityKindCandidates(f,
      { population: 'all-tie', permutations: 12, neighborCount: Math.ceil(Math.sqrt(n)) });
    const dense = run(ties), sparse = run(forest);
    bondCounts.push({ n, denseBonds: dense.candidates[0]?.field?.bonds?.length ?? 0,
      witnessForestBonds: sparse.candidates[0]?.field?.bonds?.length ?? 0 });
  }
  const nullControl = nullExperiment(baseline, baseline.rng.shuffled, baseline.rng.createSeededRng);
  const provenance = Object.fromEntries(filenames.map(file => {
    const source = original.get(file);
    const header = Buffer.from(`blob ${Buffer.byteLength(source, 'utf8')}\0`, 'utf8');
    return [file, createHash('sha1').update(header).update(source).digest('hex')];
  }));
  console.log(JSON.stringify({ schema: 'EORecursiveSelfAudit@1', repoNativePath: native,
    provenance, training, metaKinds, firstRule, challenges, revisedRule,
    heldout, before: confusion('beforePrediction'), after: confusion('afterPrediction'),
    bondCounts, nullControl, limitations: [
      'Candidate rules are selected from a researcher-supplied finite grammar.',
      'Repair effectiveness is measured against alpha-renaming invariance, not semantic truth.',
      'K-means-style Kind candidates are provisional; group cohesion is not predictive validity.',
      'Spanning forest changes field.bonds semantics and is not a production-safe drop-in patch.',
      'All substantive intervention outcomes here are synthetic, not open-domain corpora.'
    ] }, null, 2));
} finally {
  await rm(work, { recursive: true, force: true });
}
