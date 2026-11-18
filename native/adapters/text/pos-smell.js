// pos-smell.js — sniff a word's part of speech by the company its embedding keeps (the THRAX handle: Dionysius Thrax's parts of speech, here a MEASURED reading, ours not his: see the dossier's bends in organs/archon-dossiers.js).
//
// CANONICAL classes: the UD tags a language's POS prior (janus priors pos-<lang>.json, treebank gold) identifies without ambiguity: a form is identified when all its counts fall in one tag. The class centroid is the mean of the unit word vectors of its
// identified forms (equal weight per form, no count threshold). EMERGENT classes: the words that no canonical class claims (best cosine under that class's own null bound) cluster by the same bound; they are named `emergent:<n>`, never given a canonical tag.
// The bound is a NULL, as in janus's Smell@1: for each class, the 95th percentile of the cosines between its centroid and NULLS random identified forms of OTHER classes (NULLS declared 50, the janus smell's own). No hand-set threshold.
// Pure and synchronous: it holds vectors it was given (organs/vector-library.js is where they live) and never calls a model. A smell PROPOSES; what it proposes stands only by what follows from it (identity/novels PREREG-ROUND17.md, NOVELS-RESULTS-ROUND17.md).
export const POS_SMELL_SCHEMA = "PosSmell@1"; export const NULLS = 50;
const cos = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return d; };
const unit = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(v, (x) => x / n); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
/** buildCentroids(entries: [{ word, cls, vec }], { seed = 1 }) -> { schema, classes: { cls: { centroid, n, nullP95 } } } */
export function buildCentroids(entries, { seed = 1 } = {}) {
  const by = new Map(); for (const e of entries) { const l = by.get(e.cls) ?? by.set(e.cls, []).get(e.cls); l.push(e); }
  const dim = entries[0].vec.length; const classes = {};
  for (const [cls, list] of by) { const acc = new Float64Array(dim); for (const e of list) for (let k = 0; k < dim; k++) acc[k] += e.vec[k]; classes[cls] = { centroid: unit(acc), n: list.length }; }
  const r = rng(seed); const others = (cls) => entries.filter((e) => e.cls !== cls);
  for (const cls of Object.keys(classes)) { const pool = others(cls); const xs = []; for (let i = 0; i < Math.min(NULLS, pool.length); i++) xs.push(cos(classes[cls].centroid, pool[Math.floor(r() * pool.length)].vec)); xs.sort((a, b) => a - b); classes[cls].nullP95 = xs.length ? xs[Math.min(xs.length - 1, Math.ceil(0.95 * xs.length) - 1)] : null; }
  return { schema: POS_SMELL_SCHEMA, classes };
}
/** sniff(vec, model) -> { cls, cos, margin, claimed }: the nearest canonical class; `claimed` is true when its cosine clears that class's own null bound (else the word is unclaimed and may fall to an emergent class) */
export function sniff(vec, model) {
  let best = null, bs = -2, second = -2; for (const [cls, c] of Object.entries(model.classes)) { const s = cos(vec, c.centroid instanceof Float32Array ? c.centroid : Float32Array.from(c.centroid)); if (s > bs) { second = bs; bs = s; best = cls; } else if (s > second) second = s; }
  return { cls: best, cos: bs, margin: bs - second, claimed: model.classes[best].nullP95 != null ? bs >= model.classes[best].nullP95 : true };
}
/** emergent(items: [{ word, vec }], model) -> { clusters: [{ name, size, words }], claimed } — leader clustering of the unclaimed, joined at the pooled null bound (the lowest canonical nullP95: no new number) */
export function emergent(items, model) {
  const bound = Math.min(...Object.values(model.classes).map((c) => c.nullP95).filter((x) => x != null)); const unclaimed = [], claimed = []; for (const it of items) (sniff(it.vec, model).claimed ? claimed : unclaimed).push(it);
  const leaders = []; for (const it of unclaimed) { let hit = null, hs = -2; for (const l of leaders) { const s = cos(it.vec, l.vec); if (s > hs) { hs = s; hit = l; } } if (hit && hs >= bound) hit.words.push(it.word); else leaders.push({ vec: it.vec, words: [it.word] }); }
  return { bound, claimed: claimed.length, clusters: leaders.map((l, i) => ({ name: `emergent:${i + 1}`, size: l.words.length, words: l.words })).sort((a, b) => b.size - a.size) };
}
/** load a built model file (JSON: centroids as number arrays) */
export const modelFromJson = (j) => ({ ...j, classes: Object.fromEntries(Object.entries(j.classes).map(([k, v]) => [k, { ...v, centroid: Float32Array.from(v.centroid) }])) });
