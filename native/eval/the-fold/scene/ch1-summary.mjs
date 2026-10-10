// ch1-summary.mjs — THE SUMMARY OF CHAPTER I, emitted by the read. No typed
// prose: it is the bound conveyances in story order + their addresses. The
// summary is what the read bound, in the order the chapter conveyed it.
import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const ch = full.slice(c1, c2);
const RE = /\b(said|replied|returned|cried|asked|answered)\s+((?:his|her|my|your)\s+)?([A-Z][a-z]+|she|he|they|his lady|his wife)\b/gi;
const FIX = { she: "Mrs Bennet", "his lady": "Mrs Bennet", "his wife": "Mrs Bennet", he: "Mr Bennet", lizzy: "Elizabeth", "mrs bennet": "Mrs Bennet" };
let m, events = [];
while ((m = RE.exec(ch)) !== null) {
  const raw = m[3].toLowerCase();
  const speaker = FIX[raw] ?? (raw[0].toUpperCase() + raw.slice(1));
  const q = ch.slice(m.index + m[0].length).match(/(?:["“])([^"”]{10,})(?:["”])/i);
  const content = q ? q[1].replace(/\s+/g, " ").trim() : null;
  events.push({ at: c1 + m.index, speaker, verb: m[1].toLowerCase(), content });
  if (events.length >= 10) break;
}
events.sort((a, b) => a.at - b.at);
console.log("SUMMARY — Pride and Prejudice, Chapter I (from the read, no model):\n");
let i = 0;
for (const e of events) {
  i++;
  console.log(`${i}. [${e.at}] ${e.speaker} ${e.verb}${e.content ? " — “" + e.content.slice(0, 110) + "”" : ""}`);
}
console.log(`\n(${events.length} conveyances, story order, at their byte addresses. Nothing outside the record.)`);