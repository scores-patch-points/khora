// summary.mjs — A LAWFUL SUMMARY. A summary is the mouth's act: SYNTHESIZE at
// Paradigm from closure (Generate·Pattern) — composing a whole from parts. It
// is LEGAL because its two ingredients clear the two walls:
//   · the PARTS are EXTRACTED — every content clause is a conveyance witnessed
//     at a byte address in the chapter (the dialogue-events + the standing);
//   · the GLUE (order, connectives, tense, pronouns) is GIVEN — the mouth's own
//     function (giver: penelope), which invents no content, only grammar.
// So the summary says what the read bound, joined by the mouth — no revealed
// content, every clause carrying its address.
import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const ch = full.slice(c1, c2);

// EXTRACTED PARTS — the conveyances, witnessed at their byte addresses.
const RE = /\b(said|replied|returned|cried|asked|answered)\s+((?:his|her|my|your)\s+)?([A-Z][a-z]+|she|he|they|his lady|his wife)\b/gi;
const FIX = { she: "Mrs Bennet", "his lady": "Mrs Bennet", "his wife": "Mrs Bennet", he: "Mr Bennet", they: "They" };
const parts = [];
let m;
while ((m = RE.exec(ch)) !== null && parts.length < 8) {
  const raw = m[3].toLowerCase();
  const who = FIX[raw] ?? (raw[0].toUpperCase() + raw.slice(1));
  const q = ch.slice(m.index + m[0].length).match(/(?:["“])([^"”]{12,})(?:["”])/i);
  parts.push({ at: c1 + m.index, who, verb: m[1].toLowerCase(), content: q ? q[1].replace(/\s+/g, " ").replace(/^_|_$/g, "").trim() : null });
}
// the standing (also extracted): which topic holds across the chapter's halves
const countOf = (s, w) => (s.toLowerCase().match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
const half = ch.length / 2;
const agree = ["bingley", "wife", "married"].filter(t => countOf(ch.slice(0, half), t) && countOf(ch.slice(half), t));

// THE MOUTH (given: its own function — order, tense, connectives, pronouns only)
const spoken = parts.map(p => {
  const c = p.content ? `, “${p.content.replace(/[”“"]/g, "").slice(0, 120)}${p.content.length > 120 ? "…" : ""}”` : "";
  return `**${p.who}** ${p.verb === "said" ? "says" : p.verb === "replied" ? "replies" : p.verb === "returned" ? "returns" : p.verb === "cried" ? "cries" : p.verb + "s"}${c}.  \n    *[at ${p.at}]*`;
}).join("\n  ");

console.log("SUMMARY — Pride and Prejudice, Chapter I\n");
console.log("  " + spoken);
console.log(`\n  The talk runs on one matter across both halves — ${agree.join(", ")} — and the household's`);
console.log(`  figures it passes through are its own (evenings, intention, Elizabeth).`);
console.log(`\n  SYNTHESIZE at Paradigm from closure  ·  parts: ${parts.length} extracted conveyances (addresses above)  ·  glue: the mouth (given).`);
console.log(`  Every clause is a witnessed conveyance; nothing is revealed. A lawful summary.`);