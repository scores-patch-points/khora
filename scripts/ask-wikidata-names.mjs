#!/usr/bin/env node
// scripts/ask-wikidata-names.mjs <split U|dev|test> — ask the Wikidata name giver (cached) about every capitalised word of the cast beings of the GUM split's cached reads. Only name strings are sent.
import fs from "node:fs"; import path from "node:path"; import { pathToFileURL, fileURLToPath } from "node:url";
const KH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { parseGum } = await imp("eval/referents/pronoun-golden.mjs"); const { makeWikidataNameGiver, capitalisedWords } = await imp("native/adapters/text/wikidata-name-giver.js");
const split = process.argv[2]; const ids = new Set(fs.readFileSync("/tmp/gum-data/u-ids.txt", "utf8").split(/\s+/).filter(Boolean));
const docs = split === "U" ? parseGum("/tmp/gum-data/en_gum-ud-train.conllu").filter((d) => ids.has(d.id)) : parseGum(`/tmp/gum-data/en_gum-ud-${split}.conllu`).filter((d) => d.sents.length >= 20);
const words = new Set(); for (const d of docs) { const cf = `/tmp/gum-data/cache/${split}-${d.id}.json`; if (!fs.existsSync(cf)) continue; const w = JSON.parse(fs.readFileSync(cf, "utf8")); const text = d.sents.map((s) => s.text).join(" "); for (const x of capitalisedWords(text, w.cast)) words.add(x); }
const g = makeWikidataNameGiver(); const need = [...words].filter((w) => !g.get(w)); console.log("distinct capitalised cast words", words.size, "not yet cached", need.length);
const t0 = Date.now(); const r = await g.ask([...words], { onProgress: (p) => { if (p.error) console.log("error", p.word, p.error); else console.log("asked", p.done, "of", p.of, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } }); console.log("done", r, ((Date.now() - t0) / 1000).toFixed(0) + "s");
