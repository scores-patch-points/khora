import fs from "node:fs";
// dialogue-events — THE EVENTS OF CHAPTER ONE ARE INFORMATIONS CONVEYED.
// "said his lady to him", "replied he", "returned she" are the chapter's
// acts: speaker — conveys — (addressee or content). The word-order seam is
// inverted-blind (subject after the verb); this tier binds the speech-act
// event directly, speaker-first.
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const ch = full.slice(c1, c2);

const SPEAK = ["said", "replied", "returned", "cried", "asked", "answered", "began", "exclaimed", "muttered", "added", "observed", "resumed", "interrupted"];
// speaker after the verb: "his lady", "Mr. Bennet", "he", "she", "his wife"
const SPEAKER_AFTER = /\b(said|replied|returned|cried|asked|answered|exclaimed|muttered|added|observed|resumed|interrupted)\s+(?:to\s+(?:him|her|Mr\.?\s?\w+|his\s+(?:wife|lady|daughters?|sister))[,;„“]?\s*)?(?:\x97|\u2014|\u2014)?\s*,?\s*("|“)?(his lady|Mr\.?\s*Bennet|Mrs\.?\s*Bennet|she|he|his wife|her mother|her father|the lady|one of the daughters|his friend|his sister)\b/gi;
// the conveyed content follows in quotes
const QUOTE = /("|“)([^"”]{8,})("|”)/;

const events = [];
let m;
while ((m = SPEAKER_AFTER.exec(ch)) !== null) {
  const verb = m[1].toLowerCase();
  const rawSpeaker = m[7] ?? m[6] ?? "";
  const speaker = rawSpeaker === "his lady" || rawSpeaker === "his wife" ? "mrs b." : rawSpeaker.replace(/^Mr\.?\s*/i, "mr ").toLowerCase().replace(/[“”]/g, "");
  const after = ch.slice(m.index + m[0].length, m.index + m[0].length + 220);
  const q = after.match(QUOTE) ?? null;
  const content = q ? q[2].replace(/\s+/g, " ").replace(/^mr\.?\s+/i, "").slice(0, 90) : null;
  const addr = (() => { const t = after.slice(0, 60); const am = t.match(/to\s+(him|her|his\s+wife|his\s+lady|Mr\.?\s*\w+|the\s+\w+s?)/i); return am ? am[1].toLowerCase() : null; })();
  events.push({ verb, speaker, addressee: addr, content });
  SPEAKER_AFTER.lastIndex = m.index + 4; // step past the verb, allow the next
  if (events.length >= 12) break;
}

console.log("THE DIALOGUE-EVENTS OF CHAPTER I — information conveyed (each one an event):\n");
for (const e of events) {
  console.log(`  ${e.speaker.padEnd(10)} ${e.verb}${e.addressee ? " → " + e.addressee : ""}${e.content ? `  · conveyed: "${e.content}…"` : ""}`);
}
console.log(`\n${events.length} speech-act events bound. These are what Chapter 1 IS: `);
if (events[0]) console.log(`  ${events[0].speaker} ${events[0].verb}${events[0].addressee ? " " + events[0].addressee : ""}${events[0].content ? `: "${events[0].content}…"` : ""}`);
if (events[1]) console.log(`  ${events[1].speaker} ${events[1].verb}${events[1].content ? `: "${events[1].content}…"` : ""}`);