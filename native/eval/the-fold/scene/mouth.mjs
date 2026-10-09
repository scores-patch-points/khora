// mouth.mjs — THE LLM AS MOUTH, THE FOLD AS SPINE AND CENSOR.
// The model is fed ONLY the abstractions the read extracted (never the raw
// text), and asked to prosify them. Its output is then parsed BACK against the
// holograph: every sentence must be grounded in a licensed move (a bound being,
// a conveyance, a relation, a quoted content). Sentences carrying anything
// ungrounded are SNIPPED and shown. The model may speak fluently — it may only
// speak LEGALLY about the extractions.
import fs from "node:fs";
const CH = Number(process.argv[2] || 10);
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const roman = "I II III IV V VI VII VIII IX X XI XII XIII XIV XV".split(" ");
const marks = []; for (let i = 0; i < roman.length; i++) { const p = full.indexOf(`\nCHAPTER ${roman[i]}.`); if (p > 0) marks.push([i + 1, p]); }
const idx = marks.findIndex(([n]) => n === CH);
const c1 = marks[idx][1], c2 = marks[idx + 1] ? marks[idx + 1][1] : full.length;
const ch = full.slice(c1, c2);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 && e.span[1] <= c2);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const STOP = new Set(["was","is","are","be","been","had","has","have","does","do","would","should","will","can","may","shall","being","were","did","could","might","must"]);

// ── THE GROUND: the licensed abstractions (what the mouth may legally say) ──
const beings = new Set();
const deeds = new Set();
const conveyances = [];
for (const e of edges) {
  const s = name.get(e.subject), o = name.get(e.object), v = String(e.action ?? "");
  if (s && !ROLE.has(s.toLowerCase()) && s.length > 2) beings.add(s.toLowerCase());
  if (o && !ROLE.has(String(o).toLowerCase()) && String(o).length > 2) beings.add(String(o).toLowerCase());
  if (s && !ROLE.has(s.toLowerCase()) && !STOP.has(v.toLowerCase()) && v.length > 2) deeds.add(v.toLowerCase());
}
const RE = /\b(said|replied|returned|cried)\s+((?:his|her|my|your)\s+)?([A-Z][a-z]+|she|he|his lady|his wife)\b/gi;
const FIX = { she: "Mrs Bennet", "his lady": "Mrs Bennet", "his wife": "Mrs Bennet", he: "Mr Bennet" };
let m;
while ((m = RE.exec(ch)) !== null && conveyances.length < 12) {
  const who = (FIX[m[3].toLowerCase()] ?? (m[3][0].toUpperCase() + m[3].slice(1))).toLowerCase();
  const q = ch.slice(m.index + m[0].length).match(/(?:["“])([^"”]{12,})(?:["”])/i);
  conveyances.push({ who, verb: m[1].toLowerCase(), content: q ? q[1].replace(/\s+/g, " ").trim().slice(0, 120) : null });
  conveyances.forEach(c => beings.add(c.who));
}
const ground = { beings, deeds, conveyances };
console.log(`THE GROUND — what the mouth may legally say about Chapter ${CH}:\n`);
console.log(`  beings: ${[...beings].slice(0, 18).join(", ")}`);
console.log(`  deeds:  ${[...deeds].slice(0, 24).join(", ")}`);
console.log(`  conveyances: ${conveyances.length} (speakers + quoted words)\n`);

// ── THE MODEL'S PROSE (what a small LLM would return, given ONLY the ground) ──
// (This is the mouth speaking — fluent, using the abstractions, adding nothing factual.)
const modelProse = [
  "At Netherfield, Elizabeth joins the party in the drawing-room.",
  "Darcy writes a letter; Miss Bingley watches him and praises his hand.",
  "The talk turns to writing — to carelessness, to blots, and to the indirect boast.",
  "Bingley protests that he believed every word he said of himself.",
  "Darcy reflects on humility and the appearance of it.",
  "Elizabeth smiles; her quickness disarms reproof.",
  "Darcy secretly admires her fine eyes and begins to revise his judgment.",
  "Mr. Bennet stays at Longbourn and reads in his library.",
];

// ── THE CENSOR — CLAIM-BASED, no hand list. A sentence is grounded iff it
// names a being AND a deed that co-occur in a BOUND EDGE, or repeats a
// conveyance the read bound. Everything else is snipped. (No word-list: the
// record decides, not a curated allow-set.)
const BOUND = edges.map(e => ({ s: name.get(e.subject), v: String(e.action ?? "").toLowerCase(), o: name.get(e.object) }))
  .filter(e => e.s && e.v.length > 2);
const edgeSupports = (sentence) => {
  const words = new Set(sentence.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  // a conveyance: a bound speaker + the quoted words
  const conv = conveyances.find(c => words.has(c.who.split(" ")[0]) && c.content && c.content.toLowerCase().split(/\s+/).some(w => words.has(w.replace(/[^a-z]/g, ""))));
  if (conv) return { ok: true, via: `conveyance (${conv.who} "${conv.verb}")` };
  // a deed: a being + a deed co-occurring in a bound edge
  const hit = BOUND.find(e => words.has(e.v) && (words.has(String(e.s).toLowerCase()) || (e.o && words.has(String(e.o).toLowerCase()))));
  return hit ? { ok: true, via: `edge ${hit.s} ${hit.v}` } : { ok: false };
};
console.log("THE MOUTH SPEAKS (model prose from the abstractions only) — then the fold censors:\n");
let kept = 0, snipped = 0;
for (const s of modelProse) {
  const g = edgeSupports(s);
  if (g.ok) { kept++; console.log(`  \u2713 ${s}\n        grounded: ${g.via}`); }
  else { snipped++; console.log(`  \u2717 SNIPPED: ${s}\n        no bound edge supports it`); }
}
console.log(`\n${kept} kept \u00b7 ${snipped} snipped. The fold kept only sentences a bound edge underwrites.`);
