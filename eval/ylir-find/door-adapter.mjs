// door-adapter.mjs — the real Ýlir-One read-only door (Zenodotus/scripts/ylir-one.mjs, by the ingestion session) as the interface organs/hunt-source-ylir.js is written against:
//   lookup(lemma) -> [{ doc, count, at }]   catalog(doc) -> { file, sha256 }   sentences(doc) -> [{ k, from, to, text }] | null   total
// It writes nothing. sentences() uses the door's bulk Y.sentences(doc) if it has one; until then it cuts sentence by sentence with Y.sentence(doc, k) (the door re-reads the file on each call),
// and only for documents of at most MAX_SENTENCES sentences: a bigger one is a typed gap (null), not a slow guess.
import { pathToFileURL } from "node:url";
const DOOR = process.env.YLIR_DOOR ?? "/Users/mlacy/Downloads/workspace/Zenodotus/scripts/ylir-one.mjs", MAX_SENTENCES = Number(process.env.YLIR_MAX_SENTENCES ?? 3000);
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();   // regex-ok: whitespace folding of a quotation, not language
export async function ylirDoor({ lang = "eng" } = {}) {
  const { openYlir } = await import(pathToFileURL(DOOR).href), Y = await openYlir({ lang }), cache = new Map();
  return {
    Y, total: Y.documents, lemmaOf: (w) => Y.lemmaOf(w),
    lookup: (w) => Y.lookup(w),
    catalog: (doc) => { const c = Y.catalog(doc), d = Y.docOf(doc); return c ? { file: c.file ?? d?.file, sha256: c.sha256, sentences: c.sentences ?? null, title: c.title ?? null } : null; },
    sentences: (doc) => {
      if (cache.has(doc)) return cache.get(doc);
      let out = null;
      if (typeof Y.sentences === "function") { const all = Y.sentences(doc); out = Array.isArray(all) ? all.map((s, k) => ({ k: s.k ?? k, from: s.start ?? s.from, to: s.end ?? s.to, text: clean(s.text) })) : null; }
      else { const n = Y.catalog(doc)?.sentences ?? 0; if (n > 0 && n <= MAX_SENTENCES) { out = []; for (let k = 0; k < n; k++) { const s = Y.sentence(doc, k); if (s.gap) { out = null; break; } out.push({ k, from: s.start, to: s.end, text: clean(s.text) }); } } }
      cache.set(doc, out); return out;
    },
  };
}
