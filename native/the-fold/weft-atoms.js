// weft-atoms.js — the meaning layer reads THE reader's entry: atoms from a WeftEntry@4, with no second cut and no second parse.
//
//   atomsFromWeft(entry, { claimsOf, corefModel, pack, lang, same, lookup, keysOf }) → { atoms, sentences: [{ order, offset, text, atoms }], gaps }
//
// The master reader (read-core.mjs) decides the language, makes the one sentence cut and, when a surface hands it a parser (reading.js: rows: true), keeps each sentence's
// dependency rows on the entry (entry.parse). This module is the join the meaning check was missing: the atoms of a sentence are read from THOSE rows (readAtoms with a
// grammar whose rowsOf answers from the entry), and the sentences before it are its page, so a pronoun or a dropped subject takes the page's topic exactly as readAtoms
// does. It holds no parser. A sentence the entry carries no rows for is a typed gap (`no_rows`), and a text the entry's cut does not hold is `cut_disagrees`; neither is
// silently re-parsed, because a second parse is the very thing this exists to remove (THE-READING-PIPELINE.md: "nothing assembles a second reader").
// `claimsOf` is the language's grammar's claim extractor (grammar-en / grammar-ud), the one organ the entry does not carry.
import { readAtoms, cleanText } from "../organs/read-atoms.js";
import { PACKS } from "../adapters/text/grammar-packs.js";

export function weftGrammar(entry, { claimsOf }) {
  // keyed by the sentence's CLEANED text: the parse was of the sentence with its bracketed pronunciation cut out (reading.js), and readAtoms asks for exactly that
  const rowsByText = new Map((entry?.parse ?? []).filter((p) => p.rows).flatMap((p) => [[p.text, p.rows], [cleanText(p.text).text, p.rows]]));
  const missed = [];
  return {
    missed,
    rowsOf: (text) => { const r = rowsByText.get(text); if (r) return r; missed.push(text); throw new Error("cut_disagrees"); },
    claimsOf,
  };
}

export function atomsFromWeft(entry, { claimsOf, corefModel = null, pack, lang, same = null, lookup = null, keysOf = null, title = null } = {}) {
  const gaps = [];
  if (!entry?.parse) return { atoms: [], sentences: [], gaps: [{ gap: "no_rows", detail: "the entry carries no parse (read with rows: true)" }] };
  const code = lang ?? entry.language?.declared ?? null;
  const grammar = weftGrammar(entry, { claimsOf });
  const sents = (entry.sentences ?? []).map((s) => s.text);
  const out = [];
  for (const p of entry.parse) {
    if (!p.rows) { gaps.push({ gap: "no_rows", sentence: p.order, detail: "the entry holds no rows for this sentence" }); continue; }
    try {
      const r = readAtoms({ text: p.text, lang: code, title, previous: sents.slice(0, p.order), grammar, pack: pack ?? PACKS[code] ?? null, same, lookup, corefModel, keysOf });
      // each atom's place in the DOCUMENT, in the entry's own address (character offsets into the text the reader read), beside its place in its sentence: the proof of a
      // verdict can cite `<document>#<offset>` and a reader of the weft can re-expand it (the sentence's offset is the entry's, read-core.mjs)
      const atoms = r.atoms.map((a) => (a.start != null && a.end != null ? { ...a, doc: { start: p.offset + a.start, end: p.offset + a.end } } : a));
      out.push({ order: p.order, offset: p.offset, text: p.text, atoms, unread: r.unread ?? [] });
    } catch (e) { gaps.push({ gap: String(e?.message) === "cut_disagrees" ? "cut_disagrees" : "atoms_failed", sentence: p.order, detail: String(e?.message ?? e).slice(0, 80) }); }
  }
  return { atoms: out.flatMap((s) => s.atoms), unread: out.flatMap((s) => s.unread), sentences: out, gaps };
}
