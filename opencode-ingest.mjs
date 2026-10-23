// opencode-ingest.mjs — an attachment kept by the machine, outside the model's window, and served page by page.
//
// A file attached to a turn is a one-time message part: the first compaction summarises it away and nothing can bring it back
// (foldcode-poc/FAILURES.md F8: a 40-page archive, both arms, 2-3 of 10). The plugin now hands the attachment's text to the door
// once; the door cuts it into addressed pages (`<name>#p<n>`) and, on every later ask of that session, returns the pages that ask
// bears on, chosen mechanically: exact identity first (an id like IR-20709 or MIN-3, a hyphenated or multi-word proper name like
// Rotterdam-North, matched as written so its near-miss sibling Rotterdam-South is not), then word overlap weighted by rarity (BM25).
// No model reads or condenses the pages. A page is quoted whole, with its address.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const DIR = () => process.env.FOLD_INGEST_DIR ?? path.join(os.homedir(), ".fold", "ingest");
const STOP = new Set("a an and are as at be by for from has have in is it its of on or that the this to was were what which who whom how many much does did do with when where why your our my their there these those than then into about over under between during each every any all can could would should will shall may might must".split(" "));
const words = (s) => String(s ?? "").toLowerCase().match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [];
// identities written in the text: an id (letters, hyphen, digits) or a proper name joined by a hyphen or spaces (Rotterdam-North, Halvorsen Reefer Services)
export const identitiesOf = (s) => {
  const t = String(s ?? "");
  const ids = t.match(/\b[A-Z]{1,5}-\d{2,}\b/g) ?? [];
  const names = t.match(/\b[A-Z][a-z]+(?:(?:-| & | )[A-Z][a-z]+)+\b/g) ?? [];
  return [...new Set([...ids, ...names])];
};

export const pagesOf = (text, { chunk = 3000 } = {}) => {
  const t = String(text ?? "");
  const marked = t.split(/^-{2,}\s*Page\s+\d+(?:\s+of\s+\d+)?\s*-{2,}\s*$/m).map((s) => s.trim()).filter(Boolean);
  if (marked.length > 1) return marked;
  const out = []; let cur = "";
  for (const para of t.split(/\n\s*\n/)) {
    if (cur && cur.length + para.length > chunk) { out.push(cur.trim()); cur = ""; }
    cur += para + "\n\n";
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

const docs = new Map(); // sessionID -> [{ id, name, pages, df, len }]
const file = (sid) => path.join(DIR(), `${String(sid).replace(/[^\w.-]/g, "_")}.json`);
const load = (sid) => {
  if (docs.has(sid)) return docs.get(sid);
  let d = [];
  try { d = JSON.parse(fs.readFileSync(file(sid), "utf8")); } catch { /* nothing ingested */ }
  for (const doc of d) index(doc);
  docs.set(sid, d);
  return d;
};
function index(doc) {
  doc.tf = doc.pages.map((p) => { const m = new Map(); for (const w of words(p)) m.set(w, (m.get(w) ?? 0) + 1); return m; });
  doc.df = new Map(); for (const m of doc.tf) for (const w of m.keys()) doc.df.set(w, (doc.df.get(w) ?? 0) + 1);
  doc.lens = doc.pages.map((p) => p.length); doc.avg = doc.lens.reduce((a, b) => a + b, 0) / Math.max(1, doc.lens.length);
}
const pending = new Map(); // `${sid}|${id}` -> [parts]

/** Receive an attachment (possibly in parts: a door request is capped at 4 MB). Returns its address and size once whole. */
export function ingest({ sessionID, id, name = "attachment", text = "", part = 0, parts = 1 }) {
  const sid = String(sessionID ?? ""); if (!sid) return { ok: false, gap: "no-session" };
  const key = `${sid}|${id}`, buf = pending.get(key) ?? Array(parts).fill(null);
  buf[part] = String(text); pending.set(key, buf);
  if (buf.some((x) => x === null)) return { ok: true, received: part + 1, of: parts };
  pending.delete(key);
  const list = load(sid);
  let doc = list.find((d) => d.id === id);
  if (!doc) {
    doc = { id: String(id), name: String(name), pages: pagesOf(buf.join("")) };
    list.push(doc);
    try { fs.mkdirSync(DIR(), { recursive: true }); fs.writeFileSync(file(sid), JSON.stringify(list.map(({ id, name, pages }) => ({ id, name, pages })))); } catch { /* memory still serves it */ }
    index(doc);
  }
  return { ok: true, id: doc.id, name: doc.name, pages: doc.pages.length, chars: doc.pages.reduce((n, p) => n + p.length, 0),
    note: `[Attachment ${doc.name}: ${doc.pages.length} pages kept by the machine outside your window. With each question you are given the pages that question bears on, in <fold-pages>, each with its address (${doc.name}#p<n>). Quote them; do not guess beyond them.]` };
}

/** The pages an ask bears on: exact identities first, then BM25 over words. */
export function pagesNote({ sessionID, ask, maxPages = 10, maxChars = 18000 }) {
  const list = load(String(sessionID ?? ""));
  if (!list.length || !String(ask ?? "").trim()) return { gap: list.length ? "empty-ask" : "none" };
  const q = words(ask).filter((w) => !STOP.has(w) && w.length > 1), ids = identitiesOf(ask);
  const scored = [];
  for (const doc of list) {
    const N = doc.pages.length;
    doc.pages.forEach((p, i) => {
      let s = 0;
      for (const w of q) {
        const f = doc.tf[i].get(w); if (!f) continue;
        const idf = Math.log(1 + (N - doc.df.get(w) + 0.5) / (doc.df.get(w) + 0.5));
        s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * doc.lens[i] / doc.avg));
      }
      const hits = ids.filter((x) => p.includes(x)).length;
      s += hits * 25; // an exact identity outranks any amount of word overlap
      if (s > 0) scored.push({ s, doc, i });
    });
  }
  scored.sort((a, b) => b.s - a.s);
  const out = []; let size = 0;
  for (const x of scored) {
    if (out.length >= maxPages) break;
    const block = `[${x.doc.name}#p${x.i + 1}]\n${x.doc.pages[x.i]}`;
    if (size + block.length > maxChars && out.length) break;
    out.push(block); size += block.length;
  }
  if (!out.length) return { gap: "no-page-bears-on-the-ask" };
  const note = `<fold-pages source="pages of the attached document(s), chosen by the machine for this question (exact names and ids first, then word overlap); quoted whole">\n${out.join("\n\n")}\n</fold-pages>`;
  return { note, pages: out.length, chars: note.length };
}
export const _resetForTest = () => { docs.clear(); pending.clear(); };
