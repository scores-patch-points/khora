// hunt-source-ylir.js — Ýlir-ONE AS A HUNT SOURCE: local, no network, next to Wikipedia (the owner, 2026-11-24: "the hyperlexicon shouldn't carry the facts but the newly made Ýlir-One should").
// A source is { name, find(void) -> [{ title, url, passages: [{ section, text }] }] } (hunt-sources.js, void-hunt.js). This one finds the DOCUMENTS of the ingested corpus that the void's own words
// point to, then hands the hunt the passages of those documents that carry the thing asked about, each LABELLED WITH ITS BYTE ADDRESS in the file (so the chat can cite the document and the span,
// not only the sentence). It reads no language: the hunt's reader decides what a passage says; this file only fetches and divides.
//
// THE INTERFACE IT IS WRITTEN AGAINST (the ingestion session's planned read interface for the Ýlir-One index; injected, so the source works over the real index when it exists and over a stand-in until then):
//   lookup(lemma)  -> [{ doc, count, at }]    the documents a lemma occurs in, how often, and the sentence index of its first occurrence   (sync or async)
//   catalog(doc)   -> { file, sha256 } | null   what the document is
//   sentences(doc) -> [{ k, from, to, text }] | null   the document's sentences cut from the FILE's bytes by their spans, after checking the file's sha256 is the catalog's; null if it cannot be
//   total          the number of documents (the N of the score)
// Where an interface function is missing the source says so (a typed gap in `lastRun().gaps`) and finds nothing; it never degrades silently.
//
// THE SCORE: for each lemma the void names (every anchor's tokens, and the relation's lemma), each document gets log(1 + count) x log(total / df), df the number of documents the lemma is in. No free dial.
// WHICH PASSAGES: the sentences that contain a surface form of the RAREST anchor word (by df), at most `maxPassages` per document: a retrieval step like the postings, not a reading; the hunt then reads
// every one of them and keeps only those that carry every anchor.
export const YLIR_SCHEMA = "YlirSource@1";
const low = (s) => String(s ?? "").toLowerCase();
const stemOf = (file) => String(file ?? "").split("/").pop().replace(/\.txt$/, "");   // regex-ok: strips the .txt extension from a file path, not language

export function ylirSource({ lookup, catalog, sentences, total, k = 3, maxPassages = 300, name = "ylir-one" } = {}) {
  let last = { docs: [], gaps: [] };
  const gap = (g) => { last.gaps.push(g); return []; };
  return {
    name,
    lastRun: () => last,
    async find(v) {
      last = { docs: [], gaps: [] };
      for (const [fn, f] of [["lookup", lookup], ["catalog", catalog], ["sentences", sentences]]) if (typeof f !== "function") return gap({ kind: "interface_missing", fn, how: "inject the Ýlir-One read interface (lookup, catalog, sentences, total); the index is built by the ingestion session on the owner's go" });
      if (!Number.isFinite(total) || total <= 0) return gap({ kind: "interface_missing", fn: "total", how: "give the number of documents" });
      const anchors = v?.anchors ?? [], words = [...new Set([...anchors.flatMap((a) => a.tokens ?? []), ...(v?.relation?.lemma ? [v.relation.lemma] : [])].map(low).filter(Boolean))];
      if (!words.length) return gap({ kind: "no_words", why: "the void names no word to look up" });
      const score = new Map(), df = new Map();
      for (const w of words) { const posts = (await lookup(w)) ?? []; df.set(w, posts.length); if (!posts.length) continue; const idf = Math.log(total / posts.length); for (const p of posts) score.set(p.doc, (score.get(p.doc) ?? 0) + Math.log(1 + (p.count ?? 1)) * idf); }
      const top = [...score].sort((a, b) => b[1] - a[1]).slice(0, k);
      // the rarest anchor word, and the surface forms the question gave for it
      const anchorWords = anchors.flatMap((a) => (a.tokens ?? []).map((t, i) => ({ t: low(t), form: low(a.forms?.[i] ?? t) }))).filter((x) => df.has(x.t)).sort((a, b) => (df.get(a.t) || Infinity) - (df.get(b.t) || Infinity));
      const needle = anchorWords[0]?.form ?? null, out = [];
      for (const [doc, s] of top) {
        const cat = await catalog(doc); if (!cat) { gap({ kind: "no_catalog_entry", doc }); continue; }
        const ss = await sentences(doc); if (!ss) { gap({ kind: "sentences_unavailable", doc, file: cat.file, why: "the file's bytes do not match the catalog, or the file is missing" }); continue; }
        const picked = needle ? ss.filter((x) => low(x.text).includes(needle)).slice(0, maxPassages) : [];
        last.docs.push({ doc, file: cat.file, score: +s.toFixed(2), sentences: ss.length, passages: picked.length });
        out.push({ title: stemOf(cat.file), url: `ylir-one:${cat.file}`, address: { file: cat.file, sha256: cat.sha256 ?? null }, passages: picked.map((x) => ({ section: `bytes ${x.from}-${x.to}`, text: x.text })) });
      }
      return out;
    },
  };
}
