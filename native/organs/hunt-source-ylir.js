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
// THE SCORE: for each lemma the void names (every anchor's tokens, and the relation's lemma) a document gets the BM25 term score: idf x tf (k1 + 1) / (tf + k1 (1 - b + b x length / average length)), idf = log(1 + (N - df + 0.5) / (df + 0.5)), length = the document's sentences
// (the catalog's). The two dials are BM25's conventional defaults (k1 = 1.2, b = 0.75), not tuned here: the first scoring, log(1 + count) x log(N / df), let the Complete Works of Shakespeare outrank every article for common-word anchors.
// A document NAMED FOR an anchor (its title, a page "Johann Wolfgang von Goethe" for the anchor "Goethe") is always among the documents handed over, first, whatever its score.
// WHICH PASSAGES: the sentences that contain a surface form of the RAREST anchor word (by df), at most `maxPassages` per document: a retrieval step like the postings, not a reading; the hunt then reads
// every one of them and keeps only those that carry every anchor.
import { namedFor } from "./void-hunt.js";
export const YLIR_SCHEMA = "YlirSource@1";
const low = (s) => String(s ?? "").toLowerCase();
// the page markup left in the extracted text: a non-breaking space written as an entity is a space (the byte address still points at the file's own bytes)
// the extraction writes a link as its target followed by its display text: “Stagira (ancient city)Stagira”. The qualifier and the repeat are the link, and what is said is “Stagira”.
const unlinked = (t) => { let x = String(t), guard = 0; const isW = (ch) => ch !== ch.toUpperCase() || ch !== ch.toLowerCase(); for (let k = x.indexOf(")"); k >= 0 && guard++ < 50; k = x.indexOf(")", k + 1)) { const o = x.lastIndexOf("(", k), after = x[k + 1]; if (o < 2 || x[o - 1] !== " " || !after || !isW(after)) continue; let b = o - 1; while (b > 0 && (isW(x[b - 1]) || x[b - 1] === "-")) b--; let e = k + 1; while (e < x.length && (isW(x[e]) || x[e] === "-")) e++; const w1 = x.slice(b, o - 1), w2 = x.slice(k + 1, e); if (w1 && w1 === w2) { x = x.slice(0, o - 1) + x.slice(e); k = o - 2; } } return x; };
const plain = (t) => { const c = [...unlinked(String(t ?? "").split("&nbsp;").join(" ").split("&amp;").join("&"))]; let o = ""; for (let i = 0; i < c.length; i++) { o += c[i]; if (c[i] === "." && i > 0 && c[i - 1] !== c[i - 1].toUpperCase() && i + 1 < c.length && c[i + 1] !== c[i + 1].toLowerCase() && c[i + 1] === c[i + 1].toUpperCase()) o += " "; } return o; };   // and a lower-case letter, a full stop and a capital with no space between are two sentences the extraction ran together ("... on 25 August.Concurring reports ...")
const stemOf = (file) => String(file ?? "").split("/").pop().replace(/\.txt$/, "");   // regex-ok: strips the .txt extension from a file path, not language

export function ylirSource({ lookup, catalog, sentences, total, k = 3, maxPassages = 300, maxOwnPage = 3000, k1 = 1.2, b = 0.75, name = "ylir-one" } = {}) {
  let last = { docs: [], gaps: [] }, index = null;
  // the title index and the document lengths, built once from the catalog: a normalised title (the file's name with underscores as spaces, and a Gutenberg “pg123” prefix dropped) and its last word, for pages named with more of a name
  const buildIndex = async () => { const titles = new Map(), lastWord = new Map(), lens = new Float64Array(total); let sum = 0, n = 0; for (let d = 0; d < total; d++) { const c = await catalog(d); if (!c) continue; lens[d] = Number(c.sentences) || 0; if (lens[d]) { sum += lens[d]; n++; } const words = stemOf(c.file).split("_").join(" ").split(" ").filter(Boolean); if (words.length && words[0].startsWith("pg") && words[0].length > 2 && [...words[0].slice(2)].every((ch) => ch >= "0" && ch <= "9")) words.shift(); const t = words.join(" ").toLowerCase(); if (!t) continue; (titles.get(t) ?? titles.set(t, []).get(t)).push(d); if (words.length > 1) { const lw = words.at(-1).toLowerCase(); (lastWord.get(lw) ?? lastWord.set(lw, []).get(lw)).push(d); } } return { titles, lastWord, lens, avg: n ? sum / n : 0 }; };
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
      index ??= await buildIndex();
      const score = new Map(), df = new Map();
      for (const w of words) { const posts = (await lookup(w)) ?? []; df.set(w, posts.length); if (!posts.length) continue; const idf = Math.log(1 + (total - posts.length + 0.5) / (posts.length + 0.5)); for (const p of posts) { const tf = p.count ?? 1, len = index.lens[p.doc] || index.avg || 1, norm = index.avg ? 1 - b + b * (len / index.avg) : 1; score.set(p.doc, (score.get(p.doc) ?? 0) + idf * (tf * (k1 + 1)) / (tf + k1 * norm)); } }
      // the documents NAMED FOR an anchor (a page whose title is the anchor, or a one-word anchor that is the last word of a fuller title) come first, up to two, then the best by score
      const named = [...new Set(anchors.flatMap((a) => { const t = (a.tokens ?? []).map(low).join(" "); return [...(index.titles.get(t) ?? []), ...((a.tokens ?? []).length === 1 ? (index.lastWord.get(t) ?? []) : [])]; }))].slice(0, 2);
      const top = [...named.map((d) => [d, score.get(d) ?? 0]), ...[...score].filter(([d]) => !named.includes(d)).sort((a, b) => b[1] - a[1])].slice(0, Math.max(k, named.length));
      // the rarest anchor word, and the surface forms the question gave for it
      const anchorWords = anchors.flatMap((a) => (a.tokens ?? []).map((t, i) => ({ t: low(t), form: low(a.forms?.[i] ?? t) }))).filter((x) => df.has(x.t)).sort((a, b) => (df.get(a.t) || Infinity) - (df.get(b.t) || Infinity));
      const needle = anchorWords[0]?.form ?? null, out = [];
      for (const [doc, s] of top) {
        const cat = await catalog(doc); if (!cat) { gap({ kind: "no_catalog_entry", doc }); continue; }
        const ss = await sentences(doc); if (!ss) { gap({ kind: "sentences_unavailable", doc, file: cat.file, why: "the file's bytes do not match the catalog, or the file is missing" }); continue; }
        // a document NAMED FOR the anchor is about it: its sentences name the subject by a shorter form (“Dante was born in Florence.”) or by a pronoun (“He was born in Frankfurt.”), and the rarest word of the anchor (“alighieri”) is in neither, so a word filter would drop exactly the sentences that state its birth. All of its sentences go to the reader (up to maxOwnPage); any other document is filtered by the anchor's rarest word.
        const title = stemOf(cat.file).split("_").join(" "), own = anchors.some((a) => namedFor(title, a)), picked = own ? ss.slice(0, maxOwnPage) : needle ? ss.filter((x) => low(x.text).includes(needle)).slice(0, maxPassages) : [];
        last.docs.push({ doc, file: cat.file, score: +s.toFixed(2), sentences: ss.length, passages: picked.length, ownPage: own });
        out.push({ title: stemOf(cat.file).split("_").join(" "), url: `ylir-one:${cat.file}`, address: { file: cat.file, sha256: cat.sha256 ?? null }, passages: picked.map((x) => ({ section: `bytes ${x.from}-${x.to}`, text: plain(x.text) })) });
      }
      return out;
    },
  };
}
