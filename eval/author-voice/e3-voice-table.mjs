// e3-voice-table.mjs — WHAT AN AUTHOR'S CHOICES LOOK LIKE (descriptive, not a test): among verb pairs the near-verb organ calls equivalent, where the author reaches for the other
// one than the rest of the corpus does. Counts come from the ingestion session's per-document `lex` (checkpoint v3, the one E0 and E1 were stamped on).
//   node eval/author-voice/e3-voice-table.mjs --author Austen [--exclude pg158] [--min 8] [--top 14]
import fs from "node:fs"; import readline from "node:readline"; import path from "node:path";
const K = new URL("../../native/", import.meta.url).href, HERE = path.dirname(new URL(import.meta.url).pathname);
const LEX = process.env.CORPUS_LEXICON_CHECKPOINT ?? "/Users/mlacy/Downloads/workspace/Zenodotus/derived-priors/corpus-lexicon/checkpoint-en-v3.jsonl";
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; }, AUTHOR = arg("--author"), EXCL = (arg("--exclude", "") || "").split(",").filter(Boolean), MIN = Number(arg("--min", 8)), TOP = Number(arg("--top", 14));
const authors = JSON.parse(fs.readFileSync(path.join(HERE, "authors.json"), "utf8")).authors, stemOf = (f) => path.basename(f).replace(/\.txt$/, "");
const mine = new Map(), rest = new Map(); let nBooks = 0;
for await (const line of readline.createInterface({ input: fs.createReadStream(LEX), crlfDelay: Infinity })) {
  if (!line.trim()) continue; const r = JSON.parse(line), stem = stemOf(r.file), au = authors[stem]; if (EXCL.some((x) => stem.startsWith(x))) continue;
  const target = au === AUTHOR ? mine : rest; if (au === AUTHOR) nBooks++;
  for (const [w, e] of Object.entries(r.lex)) if (e.upos === "VERB" && /^[a-z]{3,}$/.test(w)) target.set(w, (target.get(w) ?? 0) + e.count);
}
const { makeEmbedder } = await import(K + "adapters/text/embed-personhood.js"), { priorsFor } = await import(K + "the-fold/read-core.mjs"), { makeVerbEquivalence, referenceVerbs } = await import(K + "organs/verb-equivalents.js");
const e = makeEmbedder({ prefix: "classification: " }), E = makeVerbEquivalence({ embed: (t) => e.embed(t), reference: referenceVerbs(priorsFor("eng").posPrior) });
const pool = [...mine].filter(([w, c]) => c >= MIN).map(([w]) => w).sort(), pairs = new Map();
for (const a of pool) for (const x of await E.equivalents(a, pool)) { const [p, q] = a < x.verb ? [a, x.verb] : [x.verb, a]; pairs.set(`${p}|${q}`, { a: p, b: q, s: x.similarity }); }
e.save();
const lr = (m, a, b) => Math.log(((m.get(a) ?? 0) + 0.5) / ((m.get(b) ?? 0) + 0.5)), tot = (m) => [...m.values()].reduce((s, c) => s + c, 0), tm = tot(mine), tr = tot(rest);
const rows = [...pairs.values()].map((p) => { const dev = lr(mine, p.a, p.b) - lr(rest, p.a, p.b); const hi = dev > 0 ? [p.a, p.b] : [p.b, p.a]; return { ...p, dev, favoured: hi[0], over: hi[1], mine: [mine.get(hi[0]) ?? 0, mine.get(hi[1]) ?? 0], rest: [rest.get(hi[0]) ?? 0, rest.get(hi[1]) ?? 0] }; }).filter((r) => r.mine[0] >= 4).sort((x, y) => Math.abs(y.dev) - Math.abs(x.dev));
console.log(`${AUTHOR}: ${nBooks} book(s), ${tm} verb tokens; ${pool.length} verbs used at least ${MIN} times; ${pairs.size} near pairs (bar 0.855); the rest of the corpus: ${tr} verb tokens.`);
console.log(`The ${TOP} pairs where ${AUTHOR} reaches furthest from the rest (deviation = log-ratio of the author minus log-ratio of the others):`);
for (const r of rows.slice(0, TOP)) console.log(`  ${r.favoured.padEnd(12)} over ${r.over.padEnd(12)} ${AUTHOR}: ${r.mine[0]} vs ${r.mine[1]}   others: ${r.rest[0]} vs ${r.rest[1]}   dev ${Math.abs(r.dev).toFixed(2)}  (embedder ${r.s})`);
process.exit(0);
