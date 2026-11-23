// coherence.js — the self-emergent thread ontology: what belongs to what conversation thread.
//
// Two facts COHERE when they share a referent — a role's filler (kartṛ, karman, adhikaraṇa, …),
// never the predicate and never the surface. A THREAD is a connected component of that graph. Nothing
// is hand-labelled; the components fall out of the shared-referent relation. This is why the identity
// assertions ("you are an AI system", "you answer questions") stick together — they all share the
// referent `you` — and stay apart from the world-facts (which share `mina`/`jonathan`), with no rule
// saying "this is an instruction."
//
// Pure arithmetic (a union-find over a set-of-sets). No model, no threshold.

const referentsOf = (t) => new Set(Object.entries(t).filter(([k]) => k !== "predicate" && k !== "surface" && k !== "neg").flatMap(([, v]) => (Array.isArray(v) ? v : [v])));

/** cohere(a, b) -> do two facts share at least one referent? */
export function cohere(a, b) {
  const ra = referentsOf(a), rb = referentsOf(b);
  if (!ra.size || !rb.size) return false;
  for (const r of ra) if (rb.has(r)) return true;
  return false;
}

/** threadsOf(triples) -> the connected components: each is an array of mutually-cohering facts. */
export function threadsOf(triples) {
  const parent = new Map();
  const find = (x) => { if (!parent.has(x)) parent.set(x, x); let r = x; while (parent.get(r) !== r) r = parent.get(r); while (parent.get(x) !== r) { const n = parent.get(x); parent.set(x, r); x = n; } return r; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (let i = 0; i < triples.length; i++) for (let j = i + 1; j < triples.length; j++) if (cohere(triples[i], triples[j])) union(i, j);
  const groups = new Map();
  for (let i = 0; i < triples.length; i++) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(triples[i]); }
  return [...groups.values()];
}

/** threadOf(triples, query) -> the facts that cohere with a query (its referents), the scope a turn
 *  may narrow over. */
export function threadOf(triples, query) {
  const q = referentsOf(query);
  return triples.filter((t) => [...referentsOf(t)].some((r) => q.has(r)));
}
