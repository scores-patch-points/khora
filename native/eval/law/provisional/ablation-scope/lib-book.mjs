// lib-book.mjs — a NOT-YET-USED book for confirmation: Middlemarch (Eliot, Gutenberg pg145). Gold is built from CAPITALISATION and is used ONLY to label
// evaluation positives (the reader sees lowercased word units; capitals, priors and the title list below never reach any score or reader).
//   NAME form = a lowercased form (>= 3 chars) with >= 8 non-sentence-initial occurrences, capitalised in >= 95% of them, not a title word.
//   NEGATIVE pool excludes every form capitalised in >= 20% of its >= 3 non-initial occurrences (ambiguous / name-like / proper adjectives).
import fs from "node:fs";
import { splitSentences } from "../../../../adapters/text/spans.js";
import { MIDDLEMARCH } from "./lib-data.mjs";

const TITLES = new Set(["mrs", "miss", "sir", "lady", "lord", "madam", "doctor", "dame", "squire", "reverend", "rev", "esq", "dowager"]);
// Gold curation, decided after reading the gold LIST (not any result): capitalised common nouns / proper adjectives / religious words, and the contraction forms
// "i'm" "i've" "i'll" (capital I) and possessive clitic forms ("lydgate's": the base form is already gold). They are neither positives nor negatives.
const NOT_NAMES = new Set(["court", "vicar", "pioneer", "english", "french", "italian", "german", "greek", "latin", "tory", "christian", "sunday", "christmas", "parliament", "almighty", "jove", "god", "dissenters", "methodist", "hall", "bench", "bank", "college", "church", "chapel"]);
const curated = (w) => /^i['’]/.test(w) || /['’]s$/.test(w) || NOT_NAMES.has(w);
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;

export function loadMiddlemarch() {
  const raw = fs.readFileSync(MIDDLEMARCH, "utf8").replace(/^﻿/, "").split("\n");
  const a = raw.findIndex((l, k) => k > 60 && /^PRELUDE\.\s*$/.test(l)), b = raw.findIndex((l, k) => k > a && /^THE END\s*$/.test(l));
  const body = raw.slice(a + 1, b).filter((l) => !/^\s*(CHAPTER [IVXLC]+\.?|BOOK [IVXLC]+\..*|PRELUDE\.|FINALE\.)\s*$/.test(l)).join("\n");
  const sents = splitSentences(body);
  const stream = [], orig = [];
  for (const s of sents) {
    const toks = [], os = [];
    for (const m of s.text.matchAll(WORD)) {
      const w = m[0].replace(/^['’]+|['’]+$/g, "");
      if (!w || /^\p{N}+$/u.test(w)) continue;
      toks.push(w.normalize("NFC").toLowerCase()); os.push(w);
    }
    if (toks.length >= 3) { stream.push(toks); orig.push(os); }
  }
  const mid = new Map();   // form -> [non-initial occurrences, capitalised among them]
  stream.forEach((sent, s) => sent.forEach((w, i) => {
    if (i === 0) return;
    const o = orig[s][i], cap = o !== o.toLowerCase() && o[0] === o[0].toUpperCase() && o[0] !== o[0].toLowerCase();
    const r = mid.get(w) ?? mid.set(w, [0, 0]).get(w); r[0] += 1; if (cap) r[1] += 1;
  }));
  const gold = new Set([...mid].filter(([w, [n, c]]) => w.length >= 3 && n >= 8 && c / n >= 0.95 && !TITLES.has(w) && !curated(w)).map(([w]) => w));
  const negExclude = new Set([...mid].filter(([w, [n, c]]) => (n >= 3 && c / n >= 0.2) || TITLES.has(w) || curated(w)).map(([w]) => w));
  for (const w of gold) negExclude.add(w);
  const goldPos = new Set();
  stream.forEach((sent, s) => sent.forEach((w, i) => { if (gold.has(w)) goldPos.add(`${s}:${i}`); }));
  return { name: "middlemarch", kind: "book", stream, goldPos, negExclude, goldForms: [...gold] };
}
