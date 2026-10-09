// speak.mjs — WHAT THE SYSTEM ACTUALLY GENERATES, in plain sentences. No
// labels, no annotations, no framework words — only what the read bound, said
// as English. Usage: node speak.mjs [chapter]
import fs from "node:fs";
const CH = Number(process.argv[2] || 10);
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const roman = "I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII XXIII XXIV XXV XXVI XXVII XXVIII XXIX XXX".split(" ");
const marks = []; for (let i = 0; i < roman.length; i++) { const p = full.indexOf(`\nCHAPTER ${roman[i]}.`); if (p > 0) marks.push([i + 1, p]); }
const idx = marks.findIndex(([n]) => n === CH);
const c1 = marks[idx][1], c2 = marks[idx + 1] ? marks[idx + 1][1] : full.length;
const ch = full.slice(c1, c2);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 && e.span[1] <= c2).sort((a, b) => a.span[0] - b.span[0]);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const STOP = new Set(["was","is","are","be","been","had","has","have","does","do","would","should","will","can","may","shall","being","were","did","could","might","must"]);

// plain sentences: the bound clauses, in order
const said = [];
for (const e of edges) {
  const s = name.get(e.subject), o = name.get(e.object), v = String(e.action ?? "");
  if (!s || ROLE.has(s.toLowerCase()) || STOP.has(v.toLowerCase()) || v.length < 3) continue;
  said.push(`${s} ${v}${o && !ROLE.has(String(o).toLowerCase()) ? " " + o : ""}.`);
}
// plain sentences: the dialogue
const RE = /\b(said|replied|returned|cried|asked|answered)\s+((?:his|her|my|your)\s+)?([A-Z][a-z]+|she|he|his lady|his wife)\b/gi;
const FIX = { she: "Mrs. Bennet", "his lady": "Mrs. Bennet", "his wife": "Mrs. Bennet", he: "Mr. Bennet" };
const spoken = []; let m;
const V = { said: "says", replied: "replies", returned: "returns", cried: "cries", asked: "asks", answered: "answers" };
while ((m = RE.exec(ch)) !== null && spoken.length < 10) {
  const who = FIX[m[3].toLowerCase()] ?? (m[3][0].toUpperCase() + m[3].slice(1));
  const q = ch.slice(m.index + m[0].length).match(/(?:["“])([^"”]{12,})(?:["”])/i);
  if (q) spoken.push(`${who} ${V[m[1]] ?? m[1]}: "${q[1].replace(/\s+/g, " ").trim()}"`);
}
// the named beings
const cast = new Map();
for (const e of edges) { const s = name.get(e.subject); if (s && !ROLE.has(s.toLowerCase()) && s.length > 2) cast.set(s, (cast.get(s) ?? 0) + 1); }
const who = [...cast].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f]) => f);

console.log(`Chapter ${CH}.`);
console.log();
console.log(`The people: ${who.join(", ")}.`);
console.log();
for (const s of said.slice(0, 30)) console.log(s);
if (spoken.length) { console.log(); for (const s of spoken.slice(0, 6)) console.log(s); }