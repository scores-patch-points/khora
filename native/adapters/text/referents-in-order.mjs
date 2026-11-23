// referents-in-order.mjs — THE CAST, READ IN ORDER OFF THE TREES (no pattern: rows, heads, deprels, feats).
//
// A name is what the reader marks as one: a PROPN with its flat and compound PROPN parts. In reading order each mention joins
// the one being it can be, or opens a new one (causal: linked against what was read before it, never after):
//   the same written form (of two or more words)                         → that being
//   a shorter form of one of its names ("Natásha" in "Natásha Rostóva"), or a longer form holding one of its names whole
//   ("Anna Pávlovna Schérer" after "Anna Pávlovna")                         → that being; several → the one mentioned last, counted contested
//   otherwise                                                              → a new being ("Anna Mikháylovna" holds neither "Anna Pávlovna" whole
//                                                                            nor is held by it: two beings)
// Names side by side ("Sónya Natásha": a run that holds two beings' names whole) are linked by their head word and widen no being;
// a contested link never widens a being either, so one doubtful mention cannot bridge two.
// Names side by side ("Sónya Natásha", "Petersburg Pierre": the parser chained two names) are split: each word is linked to its
// own being, and none is widened. A contested link never widens a being either, so one doubtful mention cannot bridge two.
// TWO LAYERS (low = possibility, high = probability): the GROUND is the text's own word classes, read off every tree before the fold
// (a word the reader writes in lower case as a common noun RECUR times or more, "the prince", "the countess", is a TITLE, with the POS
// prior's common nouns: context-free, like the prior itself); the FOLD links names causally on that ground. A title stays in the written
// form but never identifies; a title alone ("Prince") is the last being that carried it.
import { boundProforms, proformOf } from "./gender-from-corpus.js";

const NAME_PART = new Set(["flat", "flat:name", "compound"]);
const key = (s) => String(s).normalize("NFC").toLowerCase();
const within = (a, b) => a.every((t) => b.includes(t));
// how often a word must have been read as a lower-case common noun before it counts as a title (declared: a word seen once could be
// a slip of the parser; the same recurrence the door's cast-identity asks of a unit, RECUR.unit = 2)
export const TITLE_RECUR = 2;

/** referentsInOrder(parse, { commonNoun }) → { referents: [...], mentionOf: { "order.id": ref }, mentions, contested, titles } */
export function referentsInOrder(parse, { commonNoun = () => false } = {}) {
  // the ground: the text's own lower-case common nouns, from every tree
  const lowerNoun = new Map();
  for (const p of parse ?? []) for (const r of p?.rows ?? []) if (r.upos === "NOUN") { const k = key(r.form); if (k === r.form) lowerNoun.set(k, (lowerNoun.get(k) ?? 0) + 1); }
  const memo = new Map(), isTitle = (t) => { let v = memo.get(t); if (v === undefined) memo.set(t, (v = !!commonNoun(t) || (lowerNoun.get(t) ?? 0) >= TITLE_RECUR)); return v; };
  const beings = [], bySurface = new Map(), byToken = new Map(), titleOf = new Map(), mentionOf = {};
  let mentions = 0, contested = 0;
  const open = (order) => { const bi = beings.length; beings.push({ ref: `r${bi + 1}`, forms: new Map(), idents: [], calledBy: new Set(), proforms: new Map(), classes: {}, mentions: 0, contested: 0, first: order, last: order }); return bi; };
  // the beings a name (its identifying words) can be: one of whose names holds it whole ("in"), or whose name it holds whole ("ext")
  const fitsFor = (id) => { const cand = new Set(); for (const t of id) for (const b of byToken.get(t) ?? []) cand.add(b); return [...cand].map((b) => ({ b, rel: beings[b].idents.some((F) => within(id, F)) ? "in" : beings[b].idents.some((F) => within(F, id)) ? "ext" : null })).filter((x) => x.rel); };
  // several beings fit: the ONE already called by exactly this name, in a link without doubt ("Mary" for Princess Mary, whose first
  // mention was "Princess Mary Bolkónskaya", not Mary Ivánovna) takes it without doubt; else the one read last, contested
  const exactOf = (fit, id) => { const k = id.join(" "), e = fit.filter((x) => beings[x.b].calledBy.has(k)); return e.length === 1 ? e[0].b : null; };
  const pick = (fit) => fit.map((x) => x.b).sort((a, b) => beings[b].last - beings[a].last || b - a)[0];
  const note = (bi, form, order, wasContested) => { const b = beings[bi]; b.forms.set(form, (b.forms.get(form) ?? 0) + 1); b.mentions++; b.last = order; mentions++; if (wasContested) { b.contested++; contested++; } };
  const widen = (bi, id) => { const b = beings[bi]; if (b.idents.some((F) => within(id, F))) return; b.idents.push(id); for (const t of id) { let s = byToken.get(t); if (!s) byToken.set(t, (s = new Set())); s.add(bi); } };
  for (const p of parse ?? []) {
    const rows = p?.rows; if (!Array.isArray(rows) || !rows.length) continue;
    const byId = new Map(), kids = new Map();
    for (const r of rows) { byId.set(r.id, r); const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
    for (const r of rows) {
      if (r.upos !== "PROPN") continue;
      if (NAME_PART.has(r.deprel) && byId.get(r.head)?.upos === "PROPN") continue; // a part of a name, not its head
      const parts = [r, ...(kids.get(r.id) ?? []).filter((c) => NAME_PART.has(c.deprel) && c.upos === "PROPN")].sort((a, b) => a.id - b.id);
      const surface = parts.map((x) => x.form).join(" "), toks = parts.map((x) => key(x.form)), ident = toks.filter((t) => !isTitle(t));
      let bi = ident.length > 1 ? bySurface.get(key(surface)) : undefined, headBeing;
      if (bi !== undefined) { note(bi, surface, p.order, false); headBeing = bi; for (const x of parts) mentionOf[`${p.order}.${x.id}`] = beings[bi].ref; }
      else if (!ident.length) { // a title alone: the last being that carried it
        const t = toks.find((x) => titleOf.has(x)); bi = t !== undefined ? titleOf.get(t) : open(p.order);
        note(bi, surface, p.order, false); headBeing = bi; for (const x of parts) mentionOf[`${p.order}.${x.id}`] = beings[bi].ref;
      } else {
        const fit = fitsFor(ident), ext = new Set(fit.filter((x) => x.rel === "ext").map((x) => x.b));
        const joined = fit.length === 1 ? fit[0].b : null;
        // names side by side: the run holds two beings' names whole, or the being it would join does not hold a word another being holds
        const side = ident.length > 1 && (ext.size > 1 || (joined !== null && ident.some((t) => !beings[joined].idents.some((F) => F.includes(t)) && [...(byToken.get(t) ?? [])].some((o) => o !== joined))));
        if (side) {
          for (const x of parts) {
            const t = key(x.form); if (isTitle(t)) continue;
            const f1 = fitsFor([t]), ex1 = f1.length > 1 ? exactOf(f1, [t]) : null; const b1 = f1.length === 1 ? f1[0].b : ex1 ?? (f1.length ? pick(f1) : open(p.order));
            if (!f1.length) widen(b1, [t]);
            note(b1, x.form, p.order, f1.length > 1 && ex1 === null); if (f1.length <= 1 || ex1 !== null) beings[b1].calledBy.add(t); mentionOf[`${p.order}.${x.id}`] = beings[b1].ref; if (x === r || headBeing === undefined) headBeing = b1;
          }
          for (const x of parts) if (!mentionOf[`${p.order}.${x.id}`]) mentionOf[`${p.order}.${x.id}`] = beings[headBeing].ref;
        } else {
          const ex = fit.length > 1 ? exactOf(fit, ident) : null, wasContested = fit.length > 1 && ex === null;
          bi = joined ?? ex ?? (wasContested ? pick(fit) : open(p.order));
          if (!wasContested) { widen(bi, ident); beings[bi].calledBy.add(ident.join(" ")); if (ident.length > 1) bySurface.set(key(surface), bi); }
          note(bi, surface, p.order, wasContested); headBeing = bi; for (const x of parts) mentionOf[`${p.order}.${x.id}`] = beings[bi].ref;
        }
      }
      for (const t of toks) if (isTitle(t)) titleOf.set(t, headBeing);
      if (r.deprel === "nsubj" || r.deprel === "nsubj:pass") {
        const v = byId.get(r.head), b = beings[headBeing];
        // the bound pro-form points at the same node: "her" in "Natásha raised her head" is a form of Natásha's referent
        if (v) for (const { row, cls } of boundProforms(kids, v, r)) { const f = key(row.form); b.proforms.set(f, (b.proforms.get(f) ?? 0) + 1); b.classes[cls] = (b.classes[cls] ?? 0) + 1; mentionOf[`${p.order}.${row.id}`] = b.ref; }
      }
    }
  }
  const byCount = (m) => [...m].sort((a, b) => b[1] - a[1]);
  return {
    referents: beings.map((b) => ({ ref: b.ref, names: b.idents.map((F) => F.join(" ")), forms: byCount(b.forms), mentions: b.mentions, contested: b.contested, first: b.first, last: b.last, proformForms: byCount(b.proforms), proform: proformOf({ classes: b.classes }) })),
    mentionOf, mentions, contested, titles: [...memo].filter(([, v]) => v).map(([k]) => k),
  };
}
