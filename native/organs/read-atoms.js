// read-atoms.js — one sentence, read with its page, as ATOMS over the page's referents: the whole reading path in one call (rows → mentions and
// entities by coref.js, or by the learned ranker → EOTClaim@1 claims → atoms.js, plus the learned producer's further atoms when given).
// The meaning check reads a claim and its source this way and weighs atom against atom (atom-support.js).
//   readAtoms({ text, lang, title, previous, grammar, pack, same, lookup, corefModel, producer, chooser, filter, keysOf })
//     → { atoms, forms, entities, mentions, claims, rows, unread, page, spanMap, cuts }
//   readPage({ sentences, from, ...same }) → [{ atoms, … }] one per sentence from `from`, the page resolved ONCE (entity ids stable across the page)
//   grammar: { rowsOf(text), claimsOf(text, rows) } (grammar-en.js, or grammar-ud.js's loadGrammar)
import { resolvePage } from "./coref.js";
import { resolveWithModel } from "./coref-learned.js";
import { atomize, realize } from "./atoms.js";
import { produce } from "./atom-produce.js";
import { canonicalForms } from "./atom-forms.js";

// a pronunciation in brackets is no part of the sentence: Wikipedia's respelling or IPA, or the empty brackets an audio link leaves ("Mount
// Rainier ( ray-NEER), also known as …", "Lake Michigan (  MISH-ig-ən)"); it breaks the parse, so it is taken out before reading, and spans
// are mapped back. A reading in kana （びわこ） stays: it names the referent.
const PRON = /\((?:\s*|\s+[^()\d]{1,40}|[^()\d]*[ˈˌːəɪʊæɑɔʃʒθðŋɜɒʌʁɛøœɲçʎɥɐɨ][^()\d]*|\s*[A-Za-zəɪ]+(?:-[A-Za-zəɪ]+)*-[A-Z]{2,}[A-Za-z-]*\s*)\)/gu;
export function cleanText(text) {
  const map = [], cuts = []; let out = "", last = 0;
  for (const m of text.matchAll(PRON)) {
    cuts.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    for (let i = last; i < m.index; i++) { map.push(i); out += text[i]; }
    last = m.index + m[0].length;
    if (out.endsWith(" ") && (text[last] === " " || /[,.;:)]/.test(text[last] ?? ""))) { out = out.slice(0, -1); map.pop(); } // no space left before a mark
  }
  for (let i = last; i < text.length; i++) { map.push(i); out += text[i]; }
  map.push(text.length);
  return { text: out, map, cuts };
}
// atoms in the CLEANED text's offsets → the text as given (the cleaned text's map), each with its words and its span
export const mapAtoms = (atoms, C, original) => atoms.map((a) => { const start = a.start != null ? C.map[a.start] : null, end = a.end != null ? C.map[Math.min(a.end, C.map.length - 1)] : null;
  return { ...a, start, end, text: realize(a), span: start != null ? original.slice(start, end) : null }; });
// readPage({ sentences, ... }) → one reading per sentence from `from` on, the page resolved ONCE: an entity keeps its id from the sentence that
// introduces it to the last, so a document read as a page has nodes with real occurrence counts (adapters/text/atom-world.js). Each reading's `page` is
// the page up to and including its sentence, as readAtoms (one sentence with the page before it) gives it: readAtoms is readPage from the last sentence.
export function readPage({ sentences, from = 0, lang = "en", title = null, grammar, pack = null, same = null, lookup = null, corefModel = null, producer = null, chooser = null, filter = null, keysOf = null }) {
  const cleaned = sentences.map((t) => cleanText(t));
  const R0 = resolvePage({ lang, title, sentences: cleaned.map((c) => c.text), rowsOf: grammar.rowsOf, pack, same, lookup });
  let entities = R0.entities, pageMentions = R0.sentences.map((s) => s.mentions);
  if (corefModel) { const L = resolveWithModel(R0, { lang, title, same, proDrop: !!pack?.proDrop }, corefModel); entities = L.entities; pageMentions = L.sentences.map((s) => s.mentions); }
  // the page as read: each sentence's rows and mentions, so a referent's every naming on the page is at hand
  const pageAll = R0.sentences.map((s, i) => ({ text: s.text, rows: s.rows, mentions: pageMentions[i] ?? [] }));
  const low = (x) => String(x ?? "").normalize("NFKC").toLowerCase();
  const reads = [];
  for (let si = Math.max(0, from); si < sentences.length; si++) {
    const C = cleaned[si], original = sentences[si], text = C.text, mentions = pageMentions[si], rows = R0.sentences[si].rows, claims = grammar.claimsOf(text, rows);
    const ctx = { rows, mentions, entities, text, lang, keysOf };
    const base = atomize({ claims, ...ctx });
    const atoms = producer ? [...base, ...produce(ctx, producer, { have: base, chooser, filter })] : base;
    const out = mapAtoms(atoms, C, original);
    // what this reading did not read: the grammar's own unread words (claim-coverage.js), less those a produced atom carries
    const carried = low(out.filter((a) => a.from === "path").map((a) => a.text).join(" "));
    const all = low(out.map((a) => a.text).join(" ")), heads = new Set(claims.map((c) => c.vid).filter((x) => x != null));
    // and a content word no atom carries, unless it heads a claim (its predicate is then written by its English key)
    const missed = rows.filter((r) => /^(NOUN|PROPN|ADJ|NUM)$/.test(r.upos) && !/^(det|case|mark|punct|fixed|compound:prt)/.test(r.deprel) && !heads.has(r.id) && !all.includes(low(r.form)) && !(r.lemma && r.lemma !== "_" && all.includes(low(r.lemma).slice(0, Math.max(4, low(r.lemma).length - 2))))).map((r) => r.form);
    const unread = [...new Set([...claims.flatMap((c) => c.unread ?? []), ...missed])].filter((w) => !carried.includes(low(w)));
    // the atoms in their canonical forms (atom-forms.js): what a claim says, as a check reads it; `atoms` stay as read
    // the reading's own offsets map back to the sentence as given (spanMap: cleaned offset → original), and what was cut is said (cuts)
    reads.push({ atoms: out, forms: canonicalForms(out), entities, mentions, claims, rows, unread, page: pageAll.slice(0, si + 1), spanMap: C.map, cuts: C.cuts });
  }
  return reads;
}
export function readAtoms({ text, previous = [], ...rest }) {
  return readPage({ ...rest, sentences: [...previous, text], from: previous.length })[0];
}
