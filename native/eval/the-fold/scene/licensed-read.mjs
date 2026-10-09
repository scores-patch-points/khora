// licensed-read.mjs — THE READ THAT ONLY MOVES LAWFULLY. Every register the
// reader emits carries its STANDING (janus's wall): given (a named giver) or
// extracted (witnesses = addresses, standing candidate). A revealed move — no
// giver, no address — is not emitted; it is refused on the record. So the read
// cannot say "this chapter is about marriage" (revealed); it can only lay out
// the extracted witnesses and a given formatic, and let them license what they
// license. No model.
import fs from "node:fs";
import { feltSense } from "/Users/mlacy/Documents/3.0/khora/native/adapters/text/felt-sense.js";

const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const chapter = full.slice(c1, c2);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 - 60 && e.span[1] <= c2 + 300);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);

// every move is a row { op, terrain, stance, standing, giver|witnesses, claim }
const moves = [];
const given = (op, terrain, stance, giver, claim) => moves.push({ op, terrain, stance, standing: "given", giver, claim });
const extracted = (op, terrain, stance, witnesses, claim) => moves.push({ op, terrain, stance, standing: "extracted", witnesses, claim });
const revealed = (claim, why) => moves.push({ op: "DEF", terrain: "Paradigm", stance: "Generate·Pattern", standing: "revealed", claim, why });

// ── EXTRACTED moves — each carries the addresses that witness it ──
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8"));
const felt = feltSense(chapter, { posPrior: pos, M: 8 });
if (felt?.n) extracted("EVA", "Atmosphere", "Relate·Ground", [`tokens 0..${felt.n}`], `the felt field: ${Object.entries(felt.byPos ?? {}).filter(([,v])=>v!=null).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,3).map(([p,v])=>`${p}=${v.toFixed(2)}`).join(", ")}`);

const lens = new Map();
for (const e of edges) { const s = name.get(e.subject), o = name.get(e.object); for (const f of [s, o]) { if (!f || f.length < 3 || ROLE.has(f.toLowerCase())) continue; const w = (s === f ? 1 : 0.5) * (e.span[1] - e.span[0]); lens.set(f.toLowerCase(), (lens.get(f.toLowerCase()) ?? 0) + w); } }
for (const [f, w] of [...lens].sort((a,b)=>b[1]-a[1]).slice(0,3)) {
  const wits = edges.filter(e => String(name.get(e.subject) ?? "").toLowerCase() === f || String(name.get(e.object) ?? "").toLowerCase() === f).map(e => e.span[0]);
  extracted("SIG", "Entity", "Relate·Figure", wits.slice(0, 4), `figure '${f}' is a channel, weight ${w.toFixed(0)}`);
}
// the standing across halves — extracted, witnessed by both halves' counts
const countOf = (s, w) => (s.toLowerCase().match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
for (const t of ["bingley", "wife", "married", "darcy"]) {
  const a = countOf(chapter.slice(0, chapter.length/2), t), b = countOf(chapter.slice(chapter.length/2), t);
  const both = a && b;
  extracted("EVA", "Paradigm", "Relate·Pattern", both ? [`half1 ×${a}`, `half2 ×${b}`] : [], `${t}: ${both ? "AGREE across the halves" : "not witnessed across both (UNDETERMINED)"}`);
}
// the conveyances — extracted, witnessed by byte addresses (the chapter's events)
const RE = /\b(said|replied|returned|cried|asked|answered)\s+((?:his|her|my|your)\s+)?([A-Z][a-z]+|she|he|they|his lady|his wife)\b/gi;
const FIX = { she: "Mrs Bennet", "his lady": "Mrs Bennet", "his wife": "Mrs Bennet", he: "Mr Bennet" };
let m, n = 0;
while ((m = RE.exec(chapter)) !== null && n < 6) {
  const raw = m[3].toLowerCase(); const sp = FIX[raw] ?? (raw[0].toUpperCase() + raw.slice(1));
  const q = chapter.slice(m.index + m[0].length).match(/(?:["“])([^"”]{12,})(?:["”])/i);
  extracted("SYN", "Link", "Generate·Figure", [c1 + m.index], `${sp} ${m[1]}${q ? ` — “${q[1].replace(/\s+/g," ").slice(0,80)}”` : ""}`);
  n++;
}

// ── GIVEN moves — the formatic the cube/prior supplies (a named giver) ──
given("SEG", "Figure", "Differentiate·Figure", "cube.js::cellOf", "every sentence is cut at clause joints (SEG·Figure — the seam's own formatic)");
given("CON", "Figure", "Relate·Figure", "relations-gfp.js + pos-eng", "every clause is read as figure·connector·figure (GFP, P72/P76)");

// ── REVEALED moves — refused, on the record (what would have been typed) ──
revealed("Chapter I is about a single man in want of a wife", "typed from Austen's own opening; no address, no giver");
revealed("the household seen from its own threshold", "my framing; no witness");

// ── THE RECORD: split by standing; a revealed move licenses nothing. ──
const legal = moves.filter(m => m.standing === "given" || (m.standing === "extracted" && m.witnesses?.length));
const refused = moves.filter(m => !legal.includes(m));
console.log("THE LICENSED READ — Chapter I, only lawful moves (two walls cleared):\n");
for (const mv of legal) {
  const w = mv.giver ? `giver ${mv.giver}` : `witnesses ${mv.witnesses.slice(0,3).join(", ")}`;
  console.log(`   ✓ [${mv.standing}] ${mv.op}·${mv.terrain} (${mv.stance}) — ${mv.claim}`);
  console.log(`        ${w}`);
}
console.log("\nREFUSED — revealed moves license nothing (generation from no-where):");
for (const mv of refused) console.log(`   ✗ ${mv.claim}\n        ${mv.why ?? "no giver, no witnesses"}`);
console.log(`\n${legal.length} licensed moves (${legal.filter(m=>m.standing==="extracted").length} extracted, ${legal.filter(m=>m.standing==="given").length} given) · ${refused.length} refused.`);
console.log("The read may not TELL you what the chapter is about — it may only lay out the witnessed moves and let them license what they license.");