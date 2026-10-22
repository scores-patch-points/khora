#!/usr/bin/env node
// wikt-translations.mjs — from the slim English Wiktionary, the REVERSE translation index: for each language, word → the English entries
// whose translation tables list it ({ word: [[english, pos], …] }). A word of another language then has English keys from two places, its own
// entry's gloss and the English entries that translate to it; two English words that share translations in several languages are a synonym
// candidate (pivoting), which wikt-gloss.js's sameMeaning reads.
//   node cli/wikt-translations.mjs <pack | slim dir> <out dir> [--langs es,fr,de,ja,it,pt,ru,nl,sv,pl,zh]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { openSlim } from "../native/organs/wikt-slim.js";

const [src, out] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const li = process.argv.indexOf("--langs"), LANGS = (li > 0 ? process.argv[li + 1] : "es,fr,de,ja,it,pt,ru,nl,sv,pl,zh").split(",");
if (!src || !out) { console.error("usage: wikt-translations.mjs <pack|dir> <out dir> [--langs …]"); process.exit(2); }
const slim = openSlim(src), idx = Object.fromEntries(LANGS.map((l) => [l, new Map()]));
let rows = 0, en = 0;
for (const r of slim.rows()) {
  rows++;
  for (const e of r.e ?? []) {
    if (e.c !== "en" || !e.t?.length || !/^(noun|verb|adj|adv)$/.test(e.p)) continue;
    en++;
    for (const [code, word] of e.t) {
      const m = idx[code]; if (!m || !word) continue;
      const w = String(word).trim(); if (!w || w.length > 60) continue;
      const k = /^(de)$/.test(code) ? w : w.toLowerCase(), cur = m.get(k) ?? [];
      if (!cur.some(([a, p]) => a === e.w && p === e.p)) cur.push([e.w, e.p]);
      m.set(k, cur);
    }
  }
}
fs.mkdirSync(out, { recursive: true });
for (const [l, m] of Object.entries(idx)) {
  const body = JSON.stringify({ schema: "WiktTranslations@1", language: l, snapshot: slim.snapshot, licence: slim.licence, words: Object.fromEntries(m) });
  fs.writeFileSync(path.join(out, `translations-${l}.json.gz`), zlib.gzipSync(body, { level: 9 }));
  console.log(l, m.size, "words");
}
console.log(`${rows} rows, ${en} English entries with translations`);
