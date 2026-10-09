// falsify-mouth.mjs — TRY TO BREAK THE CENSOR. The censor claims: "a sentence
// survives only if a bound edge underwrites it." Attack surface: edgeSupports is
// existential (ANY matching word) and polarity-blind. If a fabricated sentence
// that merely CONTAINS a bound word survives, the guarantee is false.
import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const roman = "I II III IV V VI VII VIII IX X XI XII XIII".split(" ");
const marks = []; for (let i = 0; i < roman.length; i++) { const p = full.indexOf(`\nCHAPTER ${roman[i]}.`); if (p > 0) marks.push([i + 1, p]); }
const idx = marks.findIndex(([n]) => n === 10);
const c1 = marks[idx][1], c2 = marks[idx + 1][1];
const ch = full.slice(c1, c2);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 && e.span[1] <= c2);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const BOUND = edges.map(e => ({ s: name.get(e.subject), v: String(e.action ?? "").toLowerCase(), o: name.get(e.object) })).filter(e => e.s && e.v.length > 2);

// the censor as built (existential word-match)
const edgeSupports = (sentence) => {
  const words = new Set(sentence.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const hit = BOUND.find(e => words.has(e.v) && (words.has(String(e.s).toLowerCase()) || (e.o && words.has(String(e.o).toLowerCase()))));
  return hit ? { ok: true, via: `${hit.s} ${hit.v}` } : { ok: false };
};

console.log("FALSIFICATION of the censor's guarantee: 'a sentence survives only if a bound edge underwrites it.'\n");
const attacks = [
  ["Elizabeth examined the furniture.", "fabricated agent: the read bound 'furniture examined', never Elizabeth-examined"],
  ["Furniture examined the room and left.", "the artifact itself, asserted with an invented action"],
  ["Elizabeth spoke, then murdered Darcy on the lawn.", "one bound word smuggles two fabrications"],
  ["Darcy did not write to his sister.", "a NEGATION of an unbound claim"],
  ["Elizabeth never withdrew.", "negates a BOUND edge (elizabeth withdrew) — polarity-blind?"],
  ["Whales examined furniture in Paris.", "bound deed+being words, wholly invented content"],
];
let fired = 0;
for (const [s, why] of attacks) {
  const g = edgeSupports(s);
  if (g.ok) { fired++; console.log(`   ✗ KEPT (should be snipped): "${s}"\n        matched '${g.via}' — ${why}`); }
  else console.log(`   ✓ correctly snipped: "${s}"`);
}
console.log(`\nVERDICT: ${fired}/6 attacks defeat the censor.`);
console.log(fired ? "The guarantee is FALSE: edgeSupports is EXISTENTIAL (any matching word) and POLARITY-BLIND.\n" +
  "A fabricated sentence survives by containing one bound word; a negation of a bound edge is treated\n" +
  "identically to the edge itself. The censor enforces COHERENCE-with-the-read's-vocabulary, not correspondence.\n\n" +
  "THE FIX (what the censor must become): parse each sentence into CLAIMS (subject·predicate·object + polarity),\n" +
  "and require EVERY claim to match a bound edge — universal, not existential — with polarity checked.\n" +
  "And even then it certifies only coherence with the READ, not the text: 'furniture examined' is a bound\n" +
  "edge and is FALSE; the correspondence check is the raw address, which the censor never visits." :
  "the guarantee holds against these attacks.");
