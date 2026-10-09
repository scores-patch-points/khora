// lexeme.mjs — THE HYPERLEXICON, ANY WORD. Every word the read touches can be
// looked up, nothing is a hard "?" wall:
//   1. received dictionary — a NAME lens gloss, giver-named;
//   2. hyperlexicon relations — what the word composes with (candidate
//      affordances over the read's own edges, witnesses = the addresses);
//   3. attestation — "seen ×N" in this read.
// The ledger is the kernel's own hyperlexicon organ (createHyperlexicon +
// admitHyperlexiconCandidates); experience nominates candidates, only a given
// affordance with a named giver licenses composition (hyperlexicon.js's rule).
import { createHyperlexicon, admitHyperlexiconCandidates, pairKey } from "../../../kernel/hyperlexicon.js";
const KHOR = "/Users/mlacy/Documents/3.0/khora";

export function makeHyperlexicon(clauses) {
  const hl = createHyperlexicon({ meta: { source: "the read's own clause edges (candidate tier)" } });
  const candidates = [];
  const relations = new Map(); // w -> Map(other -> {n, witnesses[]})
  const popular = new Map();   // w -> count of raw occurrences
  const slab = (x) => String(x ?? "").trim();

  const add = (a, b, at) => {
    if (!a || !b || a === b) return;
    candidates.push({ left: a, right: b, witnesses: [at] });
    if (!relations.has(a)) relations.set(a, new Map());
    const mm = relations.get(a);
    if (!mm.has(b)) mm.set(b, { n: 0, witnesses: [] });
    mm.get(b).n++; mm.get(b).witnesses.push(at);
  };

  for (const c of clauses) {
    const s = slab(c.subject?.head ?? c.subject), v = slab(c.verb), o = slab(c.object?.head ?? c.object);
    for (const w of [s, v, o]) if (w) popular.set(w, (popular.get(w) ?? 0) + 1);
    add(s, v, c.order); add(v, o, c.order); add(s, o, c.order);
  }

  const ledger = admitHyperlexiconCandidates(hl, candidates);
  return { ledger, relations, popular };
}

export function lexeme(w, { ledger = null, relations = new Map(), popular = new Map(), dict = null } = {}) {
  if (!w) return null;
  // tier 1 — the received dictionary (a NAMES lens, giver-named)
  if (dict) { const d = dict(w); if (d && !d.startsWith("?")) return { tier: "named", text: d }; }
  // tier 2 — hyperlexicon relations: what this word composes with, attested
  const rels = relations.get(w) ?? new Map();
  if (rels.size) {
    const top = [...rels.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 4)
      .map(([other, rec]) => `${rec.n}×(${other})`);
    return { tier: "record", text: `composes with ${top.join(", ")}`, witnesses: [...rels.values()][0]?.witnesses ?? [] };
  }
  // tier 3 — attestation
  const n = popular.get(w) ?? 0;
  return { tier: "attestation", text: n ? `seen ${n}× in this read` : "not seen in this read" };
}

export { KHOR };