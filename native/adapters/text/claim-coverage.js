// claim-coverage.js — which content words of a sentence its claims never read. A grammar adapter's claims are what the meaning check
// compares; a word the parse dropped (a phrase hung where no claim looks: "nordöstlich von Garmisch-Partenkirchen", "jusqu'au port de
// Bordeaux") is a part of the sentence nothing checked. The adapter reports those words on its claims (`unread`); eot-claim-match.js then
// never calls a claim with unread words supported — what it did read may match, but the claim was not read whole. Language-neutral: UD
// parts of speech and the claims' own spans.
//   unreadWords(rows, props, figures, { isUnit, key }) → [key] of NOUN / PROPN / ADJ words in no claim's predicate, ends, obliques or figures
const CONTENT = /^(NOUN|PROPN|ADJ)$/;

export function unreadWords(rows, props, figures = [], { isUnit = () => false, key = (r) => String(r.lemma || r.form).toLowerCase() } = {}) {
  const seen = new Set();
  const addEnd = (e) => { if (!e) return; for (const id of e.ids ?? []) seen.add(id); addEnd(e.agent); for (const n of e.nmods ?? []) addEnd(n); };
  for (const p of props) { if (p.vid) seen.add(p.vid); for (const e of [p.ARG0, p.ARG1, p.ARG2, ...(p.OBL ?? [])]) addEnd(e); }
  for (const f of figures) { for (const id of f.ids ?? []) seen.add(id); if (f.beingId) seen.add(f.beingId); }
  return rows.filter((r) => CONTENT.test(r.upos) && !seen.has(r.id) && !isUnit(r.form)).map(key);
}
