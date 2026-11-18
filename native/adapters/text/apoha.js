// apoha.js — DIGNĀGA'S EMBEDDING SYSTEM: a thing belongs to a class by what it excludes within its ground (identity/novels PREREG-ROUND20 NOTE-6).
// Handle: Dignāga — apoha, meaning by exclusion; support is counted. OUR handle, not his argument (organs/archon-dossiers.js: verdict partial; "a claim is a hypothesis with counted support" is not found in his sources).
// A GROUND is a kind in a slice (members with classes). Everything is measured RELATIVE to it, in the ground's own units: rel(v) = (v - G) / s, G the ground's centroid, s its spread (RMS distance of its members to G).
// A class is the members of that class; its CONTRAST is the rest of the same ground (exclusion within the ground, never a fixed opposite). A claim needs the null (Smell@1: the 95th percentile over NULLS random members with shuffled labels); below it the system abstains.
// Pure and synchronous: it holds the vectors it is given (organs/vector-library.js holds them) and never calls a model. A proposal, not a verdict: it stands by what follows from it. Status: EXPERIMENTAL.
export const APOHA_SCHEMA = "Apoha@1"; export const NULLS = 50;
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const norm = (a) => Math.sqrt(dot(a, a)) || 1; const cosine = (a, b) => dot(a, b) / (norm(a) * norm(b));
const mean = (vs, dim) => { const o = new Float64Array(dim); for (const v of vs) for (let i = 0; i < dim; i++) o[i] += v[i]; for (let i = 0; i < dim; i++) o[i] /= Math.max(1, vs.length); return o; };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
/** makeGround({ kind, slice, members: [{ id, vec, cls }], seed }) -> ground { kind, slice, size, classes, counts, spread, centroid, rel, score(x, c, ablate), claim(x, ablate) }
 *  SCORE of x for class c = how far x sits along the axis that separates c from the REST OF THE GROUND (w = C_c - C_notc, in relative coordinates), measured from the midpoint of the two and in units of the pooled within-class spread of the ground's own members along that axis:
 *  z_c(x) = (rel(x) . w - midpoint) / sigma. A claim is made when z clears the null: the same z for random members under class labels shuffled (95th percentile of NULLS draws); below it the system abstains.
 *  ablate: { ground: false } uses absolute coordinates (no translation to the ground's centroid, no scale); { contrast: false } uses the class centroid alone (no subtraction of the rest); { null: false } always claims. */
export function makeGround({ kind, slice = null, members, seed = 1 } = {}) {
  if (!Array.isArray(members) || members.length < 4) throw new TypeError("makeGround: a ground needs members (with their classes)");
  const dim = members[0].vec.length; const G = mean(members.map((m) => m.vec), dim); let ss = 0; for (const m of members) { let d2 = 0; for (let i = 0; i < dim; i++) d2 += (m.vec[i] - G[i]) ** 2; ss += d2; } const s = Math.sqrt(ss / members.length) || 1;
  const relOf = (v) => { const o = new Float64Array(dim); for (let i = 0; i < dim; i++) o[i] = (v[i] - G[i]) / s; return o; };
  const classes = [...new Set(members.map((m) => m.cls))].sort(); const abs = (v) => Float64Array.from(v);
  // an axis model per class and per ablation: w, midpoint and sigma from labelled members
  const model = (labels, abl) => { const coord = abl.ground ? relOf : abs; const P = members.map((m) => coord(m.vec)); const out = {};
    for (const k of classes) { const inC = [], outC = []; P.forEach((p, i) => (labels[i] === k ? inC : outC).push(p)); if (!inC.length || !outC.length) { out[k] = null; continue; } const Cc = mean(inC, dim), Cn = mean(outC, dim); const w = new Float64Array(dim); for (let i = 0; i < dim; i++) w[i] = abl.contrast ? Cc[i] - Cn[i] : Cc[i];
      const proj = P.map((p) => dot(p, w)); const mc = inC.reduce((a, p) => a + dot(p, w), 0) / inC.length, mn = outC.reduce((a, p) => a + dot(p, w), 0) / outC.length; const mid = abl.contrast ? (mc + mn) / 2 : mc / 2; const pc = inC.map((p) => dot(p, w)), pn = outC.map((p) => dot(p, w)); const ss2 = pc.reduce((a, b2) => a + (b2 - mc) ** 2, 0) + pn.reduce((a, b2) => a + (b2 - mn) ** 2, 0); const sd = Math.sqrt(ss2 / (pc.length + pn.length)) || 1; /* the POOLED WITHIN-class spread of the projection: z is a discriminability in the ground's own units */ out[k] = { w, mid, sd }; }
    return out; };
  const z = (x, k, mdl, abl) => { const m = mdl[k]; if (!m) return -Infinity; const c = abl.ground ? relOf(x) : abs(x); return (dot(c, m.w) - m.mid) / m.sd; };
  const models = new Map(); const modelFor = (abl) => { const key = JSON.stringify(abl); if (!models.has(key)) models.set(key, model(members.map((m) => m.cls), abl)); return models.get(key); };
  const nullCache = new Map(); const nullFor = (abl) => { const key = JSON.stringify(abl); if (nullCache.has(key)) return nullCache.get(key); const r = rng(seed); const labs = members.map((m) => m.cls); for (let i = labs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [labs[i], labs[j]] = [labs[j], labs[i]]; }
    const sh = model(labs, abl); const xs = []; for (let n = 0; n < NULLS; n++) { const mm = members[Math.floor(r() * members.length)]; const k = classes[Math.floor(r() * classes.length)]; xs.push(Math.abs(z(mm.vec, k, sh, abl))); } xs.sort((a, b) => a - b); const p95 = xs[Math.min(xs.length - 1, Math.ceil(0.95 * xs.length) - 1)]; nullCache.set(key, p95); return p95; };
  const norm2 = (a = {}) => ({ ground: a.ground !== false, contrast: a.contrast !== false });
  const score = (x, k, ablate = {}) => { const abl = norm2(ablate); return z(x, k, modelFor(abl), abl); };
  const claim = (x, ablate = {}) => { const abl = norm2(ablate); const mdl = modelFor(abl); let best = null, bs = -Infinity, second = -Infinity; for (const k of classes) { const v = z(x, k, mdl, abl); if (v > bs) { second = bs; bs = v; best = k; } else if (v > second) second = v; } const p95 = ablate.null === false ? 0 : nullFor(abl); return { cls: best, score: bs, margin: bs - second, claimed: ablate.null === false ? true : bs >= p95, null: p95 }; };
  return { schema: APOHA_SCHEMA, kind, slice, size: members.length, classes, counts: Object.fromEntries(classes.map((k) => [k, members.filter((m) => m.cls === k).length])), spread: s, centroid: G, rel: relOf, score, claim };
}
