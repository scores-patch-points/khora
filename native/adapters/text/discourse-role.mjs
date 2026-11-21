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
