// e0-author-signal.mjs — DO THE INGESTED PRIORS CARRY AN AUTHOR AT ALL? (the sanity check before asking whether they carry a voice)
// Burrows' Delta over the per-document `lex` of the ingestion session's corpus-lexicon build: the most frequent words of the corpus (by lemma, proper nouns left out, so a
// character's name cannot give the author away), each book's relative frequencies z-scored over the books, Delta(i, j) = mean |z_i - z_j|. For a query book by an author who has
// another book in the set, the question is the rank of that other book among all the other books by Delta (rank 1 = the nearest book is the same author's). Under no author
// signal the rank of one given same-author book among N others is uniform on 1..N. A negative result is a finding.   EXPLORATORY until a PREREG is stamped.
//   node eval/author-voice/e0-author-signal.mjs [--words 200] [--query Sense_and,Pride,Alice_s,Looking_Glass]
import fs from "node:fs"; import readline from "node:readline"; import path from "node:path"; import { createHash } from "node:crypto";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const LEX = process.env.CORPUS_LEXICON_CHECKPOINT ?? "/Users/mlacy/Downloads/workspace/Zenodotus/derived-priors/corpus-lexicon/checkpoint-en-v3.jsonl";
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const NWORDS = Number(arg("--words", 200)), QUERY = (arg("--query", "Sense-and-Sensibility,Pride_and_Prejudice,Alice_s,Looking_Glass")).split(",");
const authors = JSON.parse(fs.readFileSync(path.join(HERE, "authors.json"), "utf8")).authors, stemOf = (f) => path.basename(f).replace(/\.txt$/, "");
const docs = [];
for await (const line of readline.createInterface({ input: fs.createReadStream(LEX), crlfDelay: Infinity })) {
  if (!line.trim()) continue; const r = JSON.parse(line), stem = stemOf(r.file), m = new Map(); let total = 0;
  for (const [w, e] of Object.entries(r.lex)) { total += e.count; if (e.upos !== "PROPN" && /^[a-z]+$/.test(w)) m.set(w, e.count); }
  docs.push({ stem, author: authors[stem] ?? `?${stem}`, m, total });
}
const corpus = new Map(); for (const d of docs) for (const [w, c] of d.m) corpus.set(w, (corpus.get(w) ?? 0) + c);
const words = [...corpus].sort((a, b) => b[1] - a[1]).slice(0, NWORDS).map(([w]) => w);
const rel = docs.map((d) => words.map((w) => (d.m.get(w) ?? 0) / d.total));
const mu = words.map((_, k) => rel.reduce((s, r) => s + r[k], 0) / rel.length), sd = words.map((_, k) => Math.sqrt(rel.reduce((s, r) => s + (r[k] - mu[k]) ** 2, 0) / rel.length) || 1);
const z = rel.map((r) => r.map((x, k) => (x - mu[k]) / sd[k])), delta = (i, j) => z[i].reduce((s, x, k) => s + Math.abs(x - z[j][k]), 0) / words.length;
const out = { schema: "E0-author-signal@1", split: "EXPLORATORY", at: new Date().toISOString(), checkpoint: { file: LEX, sha256: createHash("sha256").update(fs.readFileSync(LEX)).digest("hex") }, words: NWORDS, documents: docs.length, queries: [] };
for (const q of QUERY) {
  const i = docs.findIndex((d) => d.stem.includes(q)); if (i < 0) throw new Error(`no book matches ${q}`);
  const ranked = docs.map((d, j) => ({ j, stem: d.stem, author: d.author, delta: delta(i, j) })).filter((x) => x.j !== i).sort((a, b) => a.delta - b.delta);
  const same = ranked.map((x, r) => ({ ...x, rank: r + 1 })).filter((x) => x.author === docs[i].author);
  out.queries.push({ query: docs[i].stem, author: docs[i].author, nOthers: ranked.length, sameAuthorBooks: same.map((x) => ({ book: x.stem, rank: x.rank, delta: +x.delta.toFixed(3) })), nearest3: ranked.slice(0, 3).map((x) => `${x.stem} (${x.author}) ${x.delta.toFixed(3)}`) });
}
fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); const f = path.join(HERE, "results", `E0-w${NWORDS}.json`); fs.writeFileSync(f, JSON.stringify(out, null, 1));
for (const q of out.queries) console.log(`${q.query} (${q.author}): same-author rank ${q.sameAuthorBooks.map((s) => `${s.rank}/${q.nOthers} ${s.book}`).join("; ") || "none"}\n   nearest: ${q.nearest3.join(" | ")}`);
console.log("written", f);
