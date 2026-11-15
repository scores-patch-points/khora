// native/organs/text-reading.mjs — a text, read, as a log entry's rows (2026-11-15).
// Khora's ARITHMETIC for the paraphrase seam: it turns a readFull result into the
// rows of one `text-reading` entry and says which `text` entries still need one.
// Pure: no reading, no log, no clock, no file. The runner (cli/paraphrase-read.mjs)
// does the reading and the weaving; this file only shapes and counts.
//
//   text          INS·Ground  addr text:<sha16(text)>     body { text, language }       (the asker's)
//   text-reading  INS·Figure  addr reading:<sha16(text)>  of [the text entry]
//                             body { reader: "khora readFull", language, rows: [{ s, id, form, lemma, upos, feats, head, deprel, key }] }
//
// rowsOf reproduces, character for character in behaviour, rowsOf(R) of
// ledgers/paraphrase-100/exp/diff-first/src/lib.mjs: rows in reading order, rows
// the parser tags PUNCT dropped, key = String(lemma || form).toLowerCase(), s = the
// sentence index. Nothing is judged here: no share, no match, no bound. Whether
// two readings say the same thing is not khora's to write.
import crypto from "node:crypto";

export const TEXT_KIND = "text";
export const READING_KIND = "text-reading";
export const READING_CELL = "INS·Figure";
export const READER = "khora readFull";
export const READING_WHY = "one text as khora's readFull reads it: its rows (form, lemma, upos, feats, head, deprel, key) in reading order, PUNCT rows left out; counts only, no judgement";

/** sha16(x): the first 16 hex chars of sha256 of the UTF-8 string x */
export const sha16 = (x) => crypto.createHash("sha256").update(String(x), "utf8").digest("hex").slice(0, 16);
export const textAddr = (text) => `text:${sha16(text)}`;
export const readingAddr = (text) => `reading:${sha16(text)}`;

/** reader rows of a readFull result, in reading order, minus rows the parser tags PUNCT (the ledger's rowsOf, unchanged) */
export function rowsOf(R) {
  const parses = R.entry?.parse ?? R.parse ?? [];
  const sents = Array.isArray(parses[0]) ? parses : (parses[0]?.rows || parses[0]?.tokens) ? parses.map((s) => s.rows ?? s.tokens) : [parses];
  const out = [];
  sents.forEach((s, si) => { for (const r of s) if (r.upos !== "PUNCT") out.push({ s: si, id: r.id, form: r.form, lemma: r.lemma, upos: r.upos, feats: r.feats ?? null, head: r.head, deprel: r.deprel, key: String(r.lemma || r.form).toLowerCase() }); });
  return out;
}

/**
 * textOf(entry) -> { ok: true, text, language } | { ok: false, why }.
 * A text entry is read only when its address is the address of its own text:
 * the reading's address is computed from the text, so a text filed at some other
 * address would get a reading nobody can find from it. language defaults to "en"
 * only when the asker left it out; it is never guessed from the text.
 */
export function textOf(entry) {
  const b = entry?.body;
  if (!b || typeof b.text !== "string") return { ok: false, why: "body.text is not a string" };
  if (entry.addr !== textAddr(b.text)) return { ok: false, why: `addr ${entry.addr} is not ${textAddr(b.text)}` };
  const language = b.language ?? "en";
  if (typeof language !== "string" || !language) return { ok: false, why: "body.language is not a string" };
  return { ok: true, text: b.text, language };
}

/**
 * toRead(texts, readings) -> { todo: [{ entry, text, language, addr }], skipped: [{ id, addr, why }] }.
 * Every text entry with no live reading at its reading address, once per address
 * (the first such text entry in log order). Rerunning after the readings are woven
 * yields nothing.
 */
export function toRead(texts = [], readings = []) {
  const have = new Set(readings.map((e) => e.addr));
  const todo = [], skipped = [];
  for (const e of texts) {
    const t = textOf(e);
    if (!t.ok) { skipped.push({ id: e?.id ?? null, addr: e?.addr ?? null, why: t.why }); continue; }
    const addr = readingAddr(t.text);
    if (have.has(addr)) continue;
    have.add(addr);
    todo.push({ entry: e, text: t.text, language: t.language, addr });
  }
  return { todo, skipped };
}

/** readingInput(item, R) -> the weave input of the text-reading for one toRead item, given R = readFull(item.text, { language: item.language }) */
export function readingInput({ entry, language, addr }, R) {
  return {
    cell: READING_CELL, kind: READING_KIND, addr, of: [entry.id],
    body: { reader: READER, language, rows: rowsOf(R) },
  };
}
