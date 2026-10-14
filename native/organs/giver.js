// organs/giver.js — WHO CAN BE CITED for an atom. The user, 2026-10-14: "we can't cite a publication, we should cite the author or the
// speaker of the content within the publication." Pure; reads only the record (organs/callimachus.js readCorpus attaches each source's
// role and byline from the page's own bytes: byline.js, index-source.js).
//
//   giverOf(atom, record) → { kind: "speaker" }                          a quotation's attributed speaker (the source's own verb is copied)
//                           { kind: "author" | "institution", names }    the page's author(s) from its markup; or a body its markup types
//                           { kind: "none", why: "no_named_giver" }      no one is on record as making the claim: not citable
//                           { kind: "unread" }                           no byline was read (a record built before byline.js): nothing excludes it
//   isIndex(record, pinaxId)    an encyclopedia page: a pointer to a source, never one
export function giverOf(a, record) {
  const src = (record.sources ?? []).find((s) => s.id === a.pinax);
  // a STANCE atom (perspectives.js stanceAtoms) is cited to the holder whose address it carries: the page's author only reports it
  if (a.why_kind === "stance" && a.giver?.surface_verbatim && a.giver.surface) return { kind: "speaker", names: [{ name: a.giver.surface_verbatim, address: a.giver.surface }] };
  if (a.why_kind === "quotation" && a.giver?.surface && !a.giver.pronoun && /^\p{Lu}/u.test(a.giver.surface_verbatim ?? "")) return { kind: "speaker" };
  const by = src?.byline;
  if (!by) return { kind: "unread", note: "no byline was read for this page: nothing excludes it (a record built before byline.js)" };
  if (by.authors?.length) return { kind: "author", names: by.authors.map((x) => ({ name: x.name, address: x.address })), page: src.id };
  if (by.institutional) return { kind: "institution", names: [{ name: by.institutional.name, address: by.institutional.address }], page: src.id };
  return { kind: "none", why: "no_named_giver" };
}
export const isIndex = (record, pinaxId) => (record.sources ?? []).some((s) => s.id === pinaxId && s.role === "index");

/** A giver as the slot the grammars take: { names: [{ span } | { text }], rest?: { count }, kind }. At most two names; the rest are counted. */
export function giverSlot(g) {
  const names = (g.names ?? []).map((x) => (x.address ? { span: x.address } : { text: x.name }));
  if (!names.length) return null;
  const top = names.slice(0, 2), rest = names.length - top.length;
  return { names: top, ...(rest > 0 ? { rest: { count: rest } } : {}), kind: g.kind };
}
