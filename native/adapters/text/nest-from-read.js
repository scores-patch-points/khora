// nest-from-read.js — nesting computed from the read's own edges, on the fly (identity/novels/PREREG-ROUND29.md). No lookup, no list of places, no class table.
// Place-like is computed from the text (the far end of a locative edge, or on a containment edge with a place-like being); containment cues are declared grammar (end1 inside end2); each cue edge is a vote;
// the text that never says it leaves a typed gap, never a guess.
const LOCATIVE_LAST = /(^|\s)(in|at|to|from|near|into|within)$/; const stripLabel = (l) => String(l ?? "").toLowerCase().replace(/[,;:()"]/g, " ").replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
export const CONTAIN_LABELS = Object.freeze(new Set(["", "in", "of", "at", "within", "inside", "capital of", "seat of", "part of", "city of", "town of", "county of", "state of", "province of", "region of", "village of", "suburb of", "borough of"]));
export function nestFromRead(entry) {
  const refOf = new Map(); const label = new Map(); const surfaces = new Map(); for (const c of entry?.cast ?? []) { label.set(c.ref, c.surface); surfaces.set(c.ref, [...new Set([c.surface, ...(c.allSurfaces ?? [])].map((x) => String(x).toLowerCase()))]); for (const s of [c.surface, ...(c.allSurfaces ?? [])]) { const k = String(s).toLowerCase(); if (!refOf.has(k)) refOf.set(k, c.ref); } }
  const ends = (e) => [refOf.get(String(e.end1).toLowerCase()) ?? refOf.get(String(e.end1Face ?? "").toLowerCase()), refOf.get(String(e.end2).toLowerCase()) ?? refOf.get(String(e.end2Face ?? "").toLowerCase())];
  const place = new Set(); const cue = [];
  for (const e of entry?.edges ?? []) { const [a, b] = ends(e); if (!a || !b || a === b) continue; const l = stripLabel(e.label); if (LOCATIVE_LAST.test(l) && l !== "") place.add(b); if (CONTAIN_LABELS.has(l)) cue.push([a, b, l]); }
  // closure: a being on a containment edge with a place-like being is place-like
  for (let changed = true; changed;) { changed = false; for (const [a, b] of cue) { if (place.has(a) !== place.has(b)) { place.add(a); place.add(b); changed = true; } } }
  const votes = new Map(); const vote = (c, p) => { const m = votes.get(c) ?? votes.set(c, new Map()).get(c); m.set(p, (m.get(p) ?? 0) + 1); };
  for (const [a, b] of cue) if (place.has(a) && place.has(b)) vote(a, b);
  // both directions voted: the larger count wins; a tie goes to the being that recurs with more distinct children (the container)
  const fan = new Map(); for (const [c, m] of votes) for (const p of m.keys()) fan.set(p, (fan.get(p) ?? 0) + 1);
  const nodes = {}; const parentOf = new Map(); const contested = new Map();
  for (const [c, m] of votes) { const ranked = [...m].sort((x, y) => y[1] - x[1] || (fan.get(y[0]) ?? 0) - (fan.get(x[0]) ?? 0) || (x[0] < y[0] ? -1 : 1)); const [p, n] = ranked[0]; const rev = votes.get(p)?.get(c) ?? 0;
    if (rev > n || (rev === n && (fan.get(c) ?? 0) > (fan.get(p) ?? 0))) continue; parentOf.set(c, { p, n }); if (ranked.length > 1) contested.set(c, ranked.slice(1).map(([q, k]) => ({ parent: q, votes: k }))); }
  for (const r of place) nodes[r] = { label: label.get(r), surfaces: surfaces.get(r) ?? [], parents: parentOf.has(r) ? [parentOf.get(r).p] : [], classes: [], votes: parentOf.get(r)?.n ?? 0, contested: contested.get(r) ?? null };
  for (const n of Object.values(nodes)) for (const p of n.parents) if (!nodes[p]) nodes[p] = { label: label.get(p), surfaces: surfaces.get(p) ?? [], parents: [], classes: [], votes: 0, contested: null };
  return { nodes, place: [...place], refOf, cueEdges: cue.length };
}
// NESTING IS BETWEEN REFERENTS, not strings: a node is a cast being (every surface the read gave it is an alias of one referent); an answer string is resolved to its referent here, and the verdict is read off the referents' path.
// the ref of the being a surface names in this read (case-folded), or null (the text does not name it)
export const refOfLabel = (nest, label) => nest.refOf.get(String(label).toLowerCase()) ?? null;
// grain by position on an extracted path (leaf to root), declared: city-like nouns = the subject's own place; country = the root-most; any other noun = the middle holon of a three-holon chain; else a gap
export function askedByPosition(path, noun) { if (!path?.length) return null; if (["city", "town", "village", "municipality"].includes(noun)) return path[0]; if (noun === "country" || noun === "nation") return path.length >= 2 ? path[path.length - 1] : null; return path.length === 3 ? path[1] : null; }

// containmentFromKarakas — containment from the kāraka roles, not surface labels (the fix for the
// raw-label noise above). A predicate with a kartṛ (subject) AND an adhikaraṇa (locus) is a
// containment: the subject is INSIDE the locus. Pāṇini's adhikaraṇa is the locus, so the role IS
// the relation — no regex over "is in the". The place-kind is the proper-noun filter: both ends
// PROPN (a named place), which the read's own UPOS gives and the hyperlexicon's `names` ask
// confirms (name vs noun) — geographic nesting (Topeka ⊂ Kansas), not "book on table".
export function containmentFromKarakas(entry) {
  const byPred = new Map();
  for (const p of entry?.parse ?? []) {
    const headOf = (id) => p.rows.find((x) => x.id === id);
    for (const row of p.rows ?? []) {
      if (row.karaka !== "kartṛ" && row.karaka !== "adhikaraṇa") continue;
      const hd = row.head ? headOf(row.head) : null;
      const pred = (hd?.lemma ?? hd?.form ?? "").toLowerCase();
      if (!pred) continue;
      const g = byPred.get(pred) ?? { kartṛ: [], adhikaraṇa: [] };
      g[row.karaka].push({ lemma: (row.lemma ?? row.form ?? "").toLowerCase(), upos: row.upos });
      byPred.set(pred, g);
    }
  }
  const refOf = new Map();
  for (const c of entry?.cast ?? []) for (const s of [c.surface, ...(c.allSurfaces ?? [])]) if (!refOf.has(String(s).toLowerCase())) refOf.set(String(s).toLowerCase(), c.ref);
  const parts = [];
  for (const [, g] of byPred) {
    if (!g.kartṛ.length || !g.adhikaraṇa.length) continue;
    for (const a of g.kartṛ) for (const b of g.adhikaraṇa) {
      if (a.upos !== "PROPN" || b.upos !== "PROPN") continue;
      const ra = refOf.get(a.lemma), rb = refOf.get(b.lemma);
      if (ra && rb && ra !== rb) parts.push({ child: ra, parent: rb });
    }
  }
  return parts;
}
