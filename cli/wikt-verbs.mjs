#!/usr/bin/env node
// wikt-verbs.mjs — a local English Wiktionary (wiktextract JSONL, plain or .gz) → a VerbIndex@1 file the meaning check's relation definitions read.
//   node cli/wikt-verbs.mjs <wiktextract.jsonl[.gz]> <out.json.gz> [--keep 3]
import fs from "node:fs";
import zlib from "node:zlib";
import readline from "node:readline";
import { verbIndexFromWiktextract } from "../native/organs/relation-defs.js";

const [inFile, outFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const keep = +(process.argv[process.argv.indexOf("--keep") + 1] || 3) || 3;
if (!inFile || !outFile) { console.error("usage: wikt-verbs.mjs <wiktextract.jsonl[.gz]> <out.json.gz> [--keep 3]"); process.exit(2); }
let input = fs.createReadStream(inFile); if (inFile.endsWith(".gz")) input = input.pipe(zlib.createGunzip());
const index = await verbIndexFromWiktextract(readline.createInterface({ input, crlfDelay: Infinity }), { keep });
const body = JSON.stringify(index);
fs.writeFileSync(outFile, outFile.endsWith(".gz") ? zlib.gzipSync(body) : body);
console.log(`${Object.keys(index.words).length} verbs → ${outFile}`);
