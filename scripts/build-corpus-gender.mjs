// build-corpus-gender.mjs — build the corpus-backed pro-form agreement table for a language from
// already-ingested material (the Zenodotus books), then write it as a giver the read loads offline
// (native/adapters/text/name-gender/corpus-<lang>.json). Run once per language; the table is a
// derived giver with provenance, never a hand-built list.
//
//   node scripts/build-corpus-gender.mjs en /path/to/books...
//
// The table records, per name surface, the pro-form agreement classes attested against it in the
// corpus (m/f/n/x), open and time/place-specific. A pro-drop language cannot use this overt-only
// builder: its agreement rides the verb (see gender-from-corpus.js's pro-drop gap).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { buildCorpusTable } from "../native/adapters/text/gender-from-corpus.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [, , lang = "en", ...bookPaths] = process.argv;
if (!bookPaths.length) { console.error("usage: node scripts/build-corpus-gender.mjs <lang> <book.txt>..."); process.exit(1); }

const texts = bookPaths.map((p) => fs.readFileSync(p, "utf8").replace(/\r/g, ""));
const built = buildCorpusTable(texts, { language: lang, provenance: { source: bookPaths.map((p) => path.basename(p)), built: new Date().toISOString(), giver: "corpus" } });
const table = Object.fromEntries([...built.table.entries()].map(([n, c]) => [n, Object.fromEntries(c)]));
const outFile = path.join(HERE, "..", "native", "adapters", "text", "name-gender", `corpus-${lang}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ table, language: lang, provenance: built.provenance }, null, 0));
console.log(`wrote ${outFile}: ${built.table.size} names with agreement evidence, ${built.provenance.docs} documents (${lang})`);
