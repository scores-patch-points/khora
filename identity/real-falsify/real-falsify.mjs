// Experiment for REAL-FALSIFY-PREREG.md (d8b60475…). usage: node real-falsify.mjs <khoraLintDir> <khoraOrderDir> <entities.json> <arm Y|D>
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [KL, KO, ENT, ARM = 'Y'] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(p).href);
const { gfpClaim } = await imp(path.join(KL, 'native/kernel/gfp-claim.js'));
const { warrantIdentity, estimatePrior } = await imp(path.join(KL, 'native/organs/identity-warrant.js'));   // the SHIPPED module, unchanged
const { induceKindsAndFunctions } = await imp(path.join(KO, 'native/kernel/kind-functional-induction.js'));
const E = JSON.parse(fs.readFileSync(ENT, 'utf8'));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261125);

function valueOf(snak) {
  if (snak.snaktype !== 'value' || !snak.datavalue) return null;
  const { type, value } = snak.datavalue;
  if (type === 'wikibase-entityid') return value.id;
  if (type === 'string') return value;
  if (type === 'monolingualtext') return value.text;
  if (type === 'quantity') return String(+value.amount);
  if (type === 'time') {
    const m = /^([+-]\d+)-(\d\d)-(\d\d)/.exec(value.time); if (!m) return null;
    if (value.precision < 9) return null;
    if (ARM === 'D' && value.precision >= 11) return `${m[1]}-${m[2]}-${m[3]}`;
    return m[1];
  }
  return null; // coordinates and others dropped
}
// statements per item, in a fixed order; deprecated rank excluded
const items = Object.keys(E).sort(), stmts = new Map(), p31 = new Map();
for (const q of items) {
  const out = [];
  for (const P of Object.keys(E[q].claims || {}).sort()) for (const c of E[q].claims[P]) {
    if (c.rank === 'deprecated') continue;
    const v = valueOf(c.mainsnak); if (v == null) continue;
    out.push({ rel: P, value: v, id: c.id, witnessed: (c.references || []).length > 0 });
  }
  stmts.set(q, out);
  p31.set(q, (E[q].claims?.P31 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean));
}
// ONE-VALUED RELATIONS: induced by khora over the whole items, kinds = each item's own P31 (nothing hand-set)
const kinds = new Map(); for (const q of items) for (const k of p31.get(q)) (kinds.get(k) || kinds.set(k, []).get(k)).push(q);
const induced = induceKindsAndFunctions(items, { assertionsOf: (q) => stmts.get(q), sameValue: (a, b) => a === b, witnessed: (a) => a.witnessed, exposureFloor: 3,
  declaredKinds: [...kinds].map(([k, m]) => ({ kindKey: `kind:${k}`, memberRefs: m })) });
const rels = induced.relations.get('kind:Q5') || {};
const FIXED = Object.entries(rels).filter(([, r]) => r.standing === 'fixed').map(([rel]) => rel).sort();
const FUNCTIONAL = FIXED.map((rel) => ({ rel, role: 'ARG1' }));
// SPLIT-HALF: each statement dealt to A or B
const claims = [], byName = new Map(), names = [];
for (const q of items) for (const half of ['A', 'B']) { names.push(`${q}:${half}`); byName.set(`${q}:${half}`, []); }
for (const q of items) for (const s of stmts.get(q)) {
  const name = `${q}:${rng() < 0.5 ? 'A' : 'B'}`;
  const c = gfpClaim({ ground: '/', rel: s.rel, roles: { ARG0: name, ARG1: s.value }, id: `${s.id}` });
  claims.push(c); byName.get(name).push(c);
}
const N = names.length, truePairs = items.length, allPairs = (N * (N - 1)) / 2, trueRate = truePairs / allPairs;
const est = estimatePrior(claims, names, { functional: FUNCTIONAL });
const out = { arm: ARM, items: items.length, statements: claims.length, fixedRelations: FIXED.map((r) => ({ rel: r, ...rels[r] && { exposed: rels[r].exposed, agreed: rels[r].agreed } })),
  standings: Object.fromEntries(Object.entries(rels).map(([r, x]) => [r, x.standing])),
  prior: { estimate: est.rate, truth: trueRate, ratio: est.rate / trueRate, pairsCompared: est.pairs },
  verdicts: { true: { same: 0, different: 0, unjudged: 0, held: 0 }, distinct: { same: 0, different: 0, unjudged: 0, held: 0 } }, falseSplits: [], falseMerges: [] };
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const x = names[i], y = names[j], truth = x.split(':')[0] === y.split(':')[0];
  const v = warrantIdentity([...byName.get(x), ...byName.get(y)], x, y, { functional: FUNCTIONAL, prior: { rate: est.rate }, background: claims });
  out.verdicts[truth ? 'true' : 'distinct'][v.verdict]++;
  if (truth && v.verdict === 'different') out.falseSplits.push({ item: x.split(':')[0], label: E[x.split(':')[0]].labels?.en?.value ?? null, conflicts: v.conflicts.map((c) => ({ why: c.why, rel: c.key.split('\u0001')[0], values: c.values ?? null, x: c.x, y: c.y })) });
  if (!truth && v.verdict === 'same' && out.falseMerges.length < 20) out.falseMerges.push({ x, y, agree: v.agree.map((a) => [a.key.split('\u0001')[0], a.value]), posterior: v.posterior });
}
const T = out.verdicts.true, Dd = out.verdicts.distinct, sameAll = T.same + Dd.same;
out.metrics = { falseSplitRate: T.different / truePairs, falseMergeRate: sameAll ? Dd.same / sameAll : 0, recall: T.same / truePairs };
out.falsifiers = { R1_discernment: out.metrics.falseSplitRate > 0.05, R2_mergePrecision: out.metrics.falseMergeRate > 0.05, R3_vacuous: FIXED.length < 3 || out.metrics.recall < 0.2, R4_prior: !(out.prior.ratio >= 0.5 && out.prior.ratio <= 2) };
console.log(JSON.stringify(out, null, 1));
