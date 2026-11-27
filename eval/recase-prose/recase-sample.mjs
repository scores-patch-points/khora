// recase-sample.mjs — HOW OFTEN DOES THE READER RECASE A WORD IN WELL-FORMED PROSE, AND IN WHAT SENTENCE? (EXPLORATORY; the sample of the pin pin:recaser-capitalises-common-nouns-in-formal-prose)
// Reads 196 sentences (6 to 40 words) of the Wikipedia article on Aristotle, characters 2,000 to 60,000 of the Zenodotus file, through a checkout's reader and prints each recased token with its whole sentence,
// and whether anything is passed as `known` (nothing is: the reader is called with rowsOf(sentence) alone).
//   KHORA_NATIVE=/path/to/other/checkout/native node eval/recase-prose/recase-sample.mjs      (default: this checkout's native/)
import fs from "node:fs";
const K = process.env.KHORA_NATIVE ? `file://${process.env.KHORA_NATIVE.replace(/\/?$/, "/")}` : new URL("../../native/", import.meta.url).href;
const FILE = process.env.SAMPLE_FILE ?? "/Users/mlacy/Downloads/workspace/zenodotus-gh/02-encyclopedic/wikipedia/Aristotle.txt";
const { rowsOfFor } = await import(K + "reading.js"), { splitSentences } = await import(K + "adapters/text/spans.js"), P = await rowsOfFor("eng");
const text = fs.readFileSync(FILE, "utf8").slice(2000, 60000), sents = splitSentences(text, { abbreviations: new Set() }).map((c) => c.text.replace(/\s+/g, " ").trim()).filter((t) => t.split(" ").length >= 6 && t.split(" ").length <= 40).slice(0, 220);
let toks = 0, n = 0; const out = [];
for (const s of sents) { const rows = P.rowsOf(s) ?? []; toks += rows.length; for (const r of rows) if (r.recased) { n++; out.push({ typed: r.recased.typed, now: `${r.form}/${r.upos}`, by: r.recased.by, capitalsInSentence: (s.match(/[A-Z]/g) ?? []).length, sentence: s }); } }
console.log(JSON.stringify({ reader: K, file: FILE, sentences: sents.length, tokens: toks, recased: n }));
for (const o of out) console.log(`\n${o.typed} -> ${o.now} (by ${o.by}; capital letters in the sentence: ${o.capitalsInSentence})\n   ${o.sentence}`);
process.exit(0);
