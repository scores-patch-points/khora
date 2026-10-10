// lib-book2.mjs — generic capitalisation-gold loader for a Project Gutenberg novel (evaluation labels only; same rules as lib-book.mjs, no hand-curated list except titles/religious words).
import fs from "node:fs";
import { splitSentences } from "../../../../adapters/text/spans.js";
const TITLES = new Set(["mrs", "miss", "sir", "lady", "lord", "madam", "doctor", "dame", "squire", "reverend", "rev", "esq", "dowager", "mister", "master"]);
const NOT_NAMES = new Set(["god", "christmas", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "english", "french", "italian", "german", "latin", "greek", "christian", "lord", "heaven", "providence", "almighty", "january", "february", "march", "april", "june", "july", "august", "september", "october", "november", "december"]);
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const curated = (w) => /^i['’]/.test(w) || /['’]s$/.test(w) || NOT_NAMES.has(w);
export function loadBookCaps(file, name) {
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const a = raw.indexOf("*** START OF"), b = raw.indexOf("*** END OF");
  let text = raw.slice(a >= 0 ? raw.indexOf("\n", a) + 1 : 0, b >= 0 ? b : raw.length);
  text = text.split("\n").filter((l) => !/^\s*(CHAPTER [IVXLC0-9]+\.?.*|BOOK [IVXLC]+.*|Chapter [IVXLC0-9]+\.?.*|STAVE.*|PART [IVXLC]+.*)\s*$/.test(l)).join("\n");
  const stream = [], orig = [];
  for (const s of splitSentences(text)) {
    const toks = [], os = [];
    for (const m of s.text.matchAll(WORD)) { const w = m[0].replace(/^['’]+|['’]+$/g, ""); if (!w || /^\p{N}+$/u.test(w)) continue; toks.push(w.normalize("NFC").toLowerCase()); os.push(w); }
    if (toks.length >= 3) { stream.push(toks); orig.push(os); }
  }
  const mid = new Map();
  stream.forEach((sent, s) => sent.forEach((w, i) => { if (i === 0) return; const o = orig[s][i], cap = o[0] === o[0].toUpperCase() && o[0] !== o[0].toLowerCase() && o !== o.toLowerCase(); const r = mid.get(w) ?? mid.set(w, [0, 0]).get(w); r[0] += 1; if (cap) r[1] += 1; }));
  const gold = new Set([...mid].filter(([w, [n, c]]) => w.length >= 3 && n >= 8 && c / n >= 0.95 && !TITLES.has(w) && !curated(w)).map(([w]) => w));
  const negExclude = new Set([...mid].filter(([w, [n, c]]) => (n >= 3 && c / n >= 0.2) || TITLES.has(w) || curated(w)).map(([w]) => w)); for (const w of gold) negExclude.add(w);
  const goldPos = new Set(); stream.forEach((sent, s) => sent.forEach((w, i) => { if (gold.has(w)) goldPos.add(`${s}:${i}`); }));
  return { name, kind: "book", stream, goldPos, negExclude, goldForms: [...gold] };
}
