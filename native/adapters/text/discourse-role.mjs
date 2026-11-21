// discourse-role.mjs — a sentence's functional role relative to its paragraph, read from
// the RELATIONAL space (marker edges between sentences), not from the sentence's content.
// GL-TH-07: negative-space ablation is circular in content space; it reveals role only in
// relational space. Here the relation is the discourse marker that binds a sentence to the
// one before it. The role is read from edge DIRECTION:
//   incoming marker  → the sentence IS that role (it supports the previous)
//   outgoing marker  → the sentence is kartṛ (main claim; its successor supports it)
//   both             → bridge: the incoming marker names its role, and it also initiates
//   neither          → isolated (no role declared for it)
// This is the sentence-level analog of the kāraka system: same 9 operators, one level up.

export const DISCOURSE_GROUND = Object.freeze({
  kartṛ:       { markers: [],                 gloss: "assert/initiate — the main claim" },
  karman:      { markers: ["for example", "for instance", "specifically", "namely"], gloss: "elaboration — acted upon" },
  karaṇa:      { markers: ["by means of", "through", "using"], gloss: "instrument — the means" },
  sampradāna:  { markers: ["in order to", "so as to"], gloss: "recipient/purpose — directed at" },
  apādāna:     { markers: ["from", "out of"], gloss: "source — derived from" },
  adhikaraṇa:  { markers: ["in", "regarding", "with respect to", "concerning"], gloss: "frame/locus — the context" },
  kāla:        { markers: ["during", "after", "before", "when", "then", "subsequently", "later"], gloss: "time — when" },
  hetu:        { markers: ["because", "since", "as a result", "due to", "owing to"], gloss: "premise/cause — why" },
  prayojana:   { markers: ["therefore", "thus", "hence", "consequently", "so that"], gloss: "conclusion/purpose — what for" },
});

/** The discourse role a sentence declares via a leading marker, or null. */
export function markerRole(sentence) {
  const s = String(sentence ?? "").toLowerCase();
  for (const [role, def] of Object.entries(DISCOURSE_GROUND)) {
    for (const m of def.markers) {
      if (!m) continue;
      const idx = s.indexOf(m);
      if (idx < 0) continue;
      const after = s[idx + m.length];
      if (idx !== 0 && !/[.·,;]\s*$/.test(s.slice(0, idx))) continue; // must be sentence-initial
      if (after === undefined || !/[a-z]/i.test(after)) return role; // whole word
    }
  }
  return null;
}

/** Read sentence i's discourse role from marker-edge DIRECTION across the paragraph. */
export function readDiscourseRole(i, sentences) {
  const incoming = i > 0 ? markerRole(sentences[i]) : null;
  const outgoing = i < sentences.length - 1 ? markerRole(sentences[i + 1]) : null;
  if (incoming) return incoming;      // it supports the previous: its own marker names the role
  if (outgoing) return "kartṛ";       // no incoming but its successor supports it: main claim
  return null;                        // isolated
}

/** Read every sentence's role in a paragraph (sentences = array of strings). */
export function paragraphRoles(sentences) {
  return sentences.map((_, i) => readDiscourseRole(i, sentences));
}


// ── Given/new coreference (embedding-free): does a sentence continue the previous
// sentence's referents, or introduce new ones? This is the implicit-relation signal
// that explicit markers miss (GL-TH-09). The role maps given→karman (elaboration on
// an existing referent), new→kartṛ (initiation of a new referent). Read from the
// kāraka field (lemma of kartṛ/karman tokens), no embedding, no marker.

/** The referents a sentence's parse rows carry: lemmas of its kāraka-bearing tokens. */
export function sentenceReferents(rows) {
  const refs = new Set();
  for (const r of rows) if (r.karaka && r.lemma) refs.add(String(r.lemma).toLowerCase());
  return refs;
}
/** The subjects (kartṛ lemmas) only — who the sentence is about. */
export function sentenceSubjects(rows) {
  const refs = new Set();
  for (const r of rows) if (r.karaka === "kartṛ" && r.lemma) refs.add(String(r.lemma).toLowerCase());
  return refs;
}

/** Given/new role for sentence i: does its subject continue the previous sentence's referents? */
export function givenNewRole(i, refsOf) {
  if (i === 0) return "new";               // the first sentence introduces
  const prev = refsOf[i - 1];
  const cur = refsOf[i];
  if (!cur || cur.size === 0) return null; // no referent to judge
  for (const r of cur) if (prev.has(r)) return "given";
  return "new";
}

/** Full role for sentence i: prefer the coreference read, fall back to the marker read. */
export function readDiscourseRoleFull(i, sentences, rowsOf) {
  // marker read (explicit connectives)
  const mr = readDiscourseRole(i, sentences);
  if (mr) return { role: mr, signal: "marker" };
  // coreference read (implicit given/new), if rows are available
  if (rowsOf) {
    const gn = givenNewRole(i, rowsOf.map(sentenceReferents));
    if (gn) return { role: gn === "given" ? "karman" : "kartṛ", signal: "coref" };
  }
  return { role: null, signal: null };
}

// ── Clause-relation → discourse role (the real signal, read from the parse's deprel,
// not from regex markers). The UD clause relation IS the discourse relation: root = the
// sentence's main claim (kartṛ); advcl/adverbial = premise/condition/time (hetu/kāla);
// ccomp/complement = elaboration (karman); xcomp/open-complement = means (karaṇa);
// acl/relative = frame (adhikaraṇa); conj/coordinate = parallel (sampradāna).

export const CLAUSE_RELATION_ROLE = Object.freeze({
  root: "kartṛ",
  adverbial: "hetu",        // advcl — premise/condition/time
  complement: "karman",     // ccomp — "that…" elaboration
  "open-complement": "karaṇa", // xcomp — "to…" means
  adnominal: "adhikaraṇa",  // acl — frame
  relative: "adhikaraṇa",   // acl:relcl — "which…" frame
  parataxis: "kartṛ",       // juxtaposed claim
  coordinate: "sampradāna", // conj — parallel
  nmod: "adhikaraṇa",       // locus
  obl: "adhikaraṇa",        // locus
});

/** The discourse role of one clause, from its relation type. */
export function clauseRole(clause) {
  return CLAUSE_RELATION_ROLE[clause?.relation] ?? null;
}

/** A sentence's discourse structure: its main claim (root) plus its subordinate roles. */
export function sentenceDiscourse(clauses) {
  const roles = { root: null, subordinate: [] };
  for (const c of clauses) {
    const r = clauseRole(c);
    if (!r) continue;
    if (c.relation === "root") roles.root = { marker: c.marker, polarity: c.polarity, predicate: c.predicate?.text ?? null };
    else roles.subordinate.push({ role: r, relation: c.relation, marker: c.marker ?? null, polarity: c.polarity });
  }
  return roles;
}
