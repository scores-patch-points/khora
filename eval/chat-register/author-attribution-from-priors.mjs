// EXPLORATORY (the table of authors is declared below, by me, from the titles; DEV only; leave-one-book-out; no thresholds). THE OWNER'S QUESTION (2026-11-24): can the ingested priors be used to answer
// FROM and IN THE VOICE OF one of the authors? The first thing a voice needs is that the priors CARRY the author: a held-out book is closer to its own author's other books than to anyone else's.
// The priors read here are the per-document lexicon records of Zenodotus/derived-priors/corpus-lexicon/checkpoint-en-v3.jsonl (written by the ingestion session): per content lemma, its uses, its kāraka
// roles, the events it serves and its company. Features compared: (1) the lemma's relative frequency (what the author talks about and with which words), (2) the same restricted to verbs (the author's
// verbs), (3) role shares (how the author's words sit in events: agent / patient ...). Measured by leave-one-book-out: the held-out book's vector against each candidate author's pooled vector built
// WITHOUT that book (cosine); chance is 1 over the candidates. Only authors with 2 or more books can be tested. Intervals are Wilson 95%.
//   node eval/chat-register/author-attribution-from-priors.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CK = process.env.LEXICON_CHECKPOINT ?? "/Users/mlacy/Downloads/workspace/Zenodotus/derived-priors/corpus-lexicon/checkpoint-en-v3.jsonl";
// DECLARED by me from the book titles (the lexicon records carry no author): file stem -> author
const AUTHOR = { "Treasure-Island": "Stevenson", "The-Prince": "Machiavelli", "Great-Expectations": "Dickens", "The-Federalist-Papers": "Federalist", "Common-Sense": "Paine", "Emma": "Austen", "Sense-and-Sensibility": "Austen", "The-Call-of-the-Wild": "London",
  "Heart-of-Darkness": "Conrad", "The-Jungle-Book": "Kipling", "Crime-and-Punishment": "Dostoevsky", "Dracula": "Stoker", "The-Time-Machine": "Wells", "The-War-of-the-Worlds": "Wells", "Anne-of-Green-Gables": "Montgomery", "Little-Women": "Alcott",
  "The-Life-and-Adventures-of-Robinson-Crusoe": "Defoe", "The-Wonderful-Wizard-of-Oz": "Baum", "Wuthering-Heights": "Bronte", "Gulliver-s-Travels": "Swift", "Alice_s_Adventures_in_Wonderland": "Carroll", "Through_the_Looking_Glass": "Carroll",
  "A_Tale_of_Two_Cities": "Dickens", "Frankenstein": "Shelley", "The_Picture_of_Dorian_Gray": "Wilde", "Pride_and_Prejudice": "Austen", "The_Adventures_of_Sherlock_Holmes": "Doyle", "The_Adventures_of_Tom_Sawyer": "Twain", "Moby_Dick": "Melville",
  "Meditations_by_Marcus_Aurelius": "Aurelius", "Beyond_Good_and_Evil_by_Nietzsche": "Nietzsche", "The_Divine_Comedy_by_Dante": "Dante", "Leaves_of_Grass_by_Whitman": "Whitman", "On_the_Electrodynamics_of_Moving_Bodies__Einstein_": "Einstein",
  "The_Republic_by_Plato": "Plato", "Leviathan_by_Hobbes": "Hobbes", "The_Origin_of_Species_by_Darwin": "Darwin", "The_Iliad__Greek_": "E. Darwin", "Complete_Works_of_Shakespeare": "Shakespeare", "The-Fox-and-the-Grapes": "Aesop" };
const stem = (f) => path.basename(f, ".txt").replace(/^(pg|aesop-)\d+_/, "");
const docs = fs.readFileSync(CK, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => ({ author: AUTHOR[stem(r.file)] ?? null, name: stem(r.file), lex: r.lex, cells: r.phaseposts?.cells ?? {}, reader: r.reader ?? null, parser: r.parser ?? null })).filter((d) => d.author);
const wilson = (k, n) => { const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+((c - m) / d).toFixed(2), +((c + m) / d).toFixed(2)]; };
// feature maps: lemma -> weight, from a document's lexicon record
const FEATS = {
  "the 27-cell grammar profile (how the author's words sit in the cube: structure, not topic)": (lex, d) => { const v = new Map(); let t = 0; for (const [c, n] of Object.entries(d.cells)) { v.set(c, n); t += n; } for (const [c, x] of v) v.set(c, x / t); return v; },
  "lemma frequency": (lex) => { const v = new Map(); let t = 0; for (const [l, e] of Object.entries(lex)) { v.set(l, e.count); t += e.count; } for (const [l, x] of v) v.set(l, x / t); return v; },
  "lemma frequency without proper names (the falsifier: characters shared between a sequel and its first book)": (lex) => { const v = new Map(); let t = 0; for (const [l, e] of Object.entries(lex)) if (e.upos !== "PROPN") { v.set(l, e.count); t += e.count; } for (const [l, x] of v) v.set(l, x / t); return v; },
  "verb frequency": (lex) => { const v = new Map(); let t = 0; for (const [l, e] of Object.entries(lex)) if (e.upos === "VERB") { v.set(l, e.count); t += e.count; } for (const [l, x] of v) v.set(l, x / t); return v; },
  "role share of each lemma": (lex) => { const v = new Map(); let t = 0; for (const [l, e] of Object.entries(lex)) for (const [r, n] of Object.entries(e.roles ?? {})) { v.set(`${l}|${r}`, n); t += n; } for (const [k, x] of v) v.set(k, x / t); return v; },
};
const add = (acc, v, w = 1) => { for (const [k, x] of v) acc.set(k, (acc.get(k) ?? 0) + w * x); };
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) d += x * y; } for (const y of b.values()) nb += y * y; return na && nb ? d / Math.sqrt(na * nb) : 0; };
const byAuthor = new Map(); for (const d of docs) (byAuthor.get(d.author) ?? byAuthor.set(d.author, []).get(d.author)).push(d);
const testable = docs.filter((d) => byAuthor.get(d.author).length >= 2);
const out = { stamp: { recordsReadBy: [...new Set(docs.map((d) => `${d.reader ?? "reader not recorded"}${d.parser ? ` / ${d.parser}` : " / parser not recorded (v3 and earlier: built under the 20-file stand-in priors home, english-parser, per the ingestion session 2026-11-24)"}`))], when: new Date().toISOString(), split: "EXPLORATORY (DEV; leave-one-book-out; authors declared by title)", checkpoint: CK, books: docs.length, authors: byAuthor.size, authorsWithTwoOrMoreBooks: [...byAuthor].filter(([, v]) => v.length >= 2).map(([a, v]) => `${a} (${v.length})`) }, results: {} };
for (const [fname, F] of Object.entries(FEATS)) {
  const vec = new Map(docs.map((d) => [d, F(d.lex, d)])); let right = 0; const rows = [];
  for (const h of testable) {
    const cand = new Map(); for (const d of docs) { if (d === h) continue; add(cand.get(d.author) ?? cand.set(d.author, new Map()).get(d.author), vec.get(d), 1 / byAuthor.get(d.author).length); }   // each author's profile: the mean of their books' vectors, without the held-out book
    const ranked = [...cand].map(([a, v]) => [a, cos(vec.get(h), v)]).sort((x, y) => y[1] - x[1]); const ok = ranked[0][0] === h.author; if (ok) right++; rows.push({ book: h.name, author: h.author, picked: ranked[0][0], rank: ranked.findIndex(([a]) => a === h.author) + 1, of: ranked.length, ok });
  }
  out.results[fname] = { right, of: testable.length, wilson: wilson(right, testable.length), chance: +(1 / (byAuthor.size - 0)).toFixed(3), rows };
  console.log(`${fname}: ${right} of ${testable.length} held-out books attributed to the right author (${wilson(right, testable.length)}); chance about 1 in ${byAuthor.size}\n   ${rows.map((r) => `${r.book} -> ${r.picked}${r.ok ? "" : ` (right author ranked ${r.rank} of ${r.of})`}`).join("\n   ")}`);
}
fs.writeFileSync(path.join(HERE, "author-attribution-from-priors.json"), JSON.stringify(out, null, 1) + "\n");
