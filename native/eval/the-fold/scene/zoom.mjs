// zoom.mjs — ZOOM UP AND DOWN ON DEMAND. The grain axis as a dial over one
// contiguous record. At any (chapter, level) the reader returns the view at
// that grain; every higher level cites its CHILD ADDRESSES, so zooming down is
// always possible (to the bytes), and zooming up always aggregates. Computed on
// the fly; nothing stored. Usage: node zoom.mjs <chapter> <level 0..5>
//   5 GIST · 4 STANDING (kinds/cast) · 3 EPISODES · 2 EVENTS · 1 CLAUSES · 0 BYTES
import fs from "node:fs";
const CH = Number(process.argv[2] || 6), LEVEL = Number(process.argv[3] ?? 4);
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const roman = "I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII XXIII XXIV XXV XXVI XXVII XXVIII XXIX XXX XXXI XXXII XXXIII".split(" ");
const marks = [];
for (let i = 0; i < roman.length; i++) { const p = full.indexOf(`\nCHAPTER ${roman[i]}.`); if (p > 0) marks.push([i + 1, p]); }
marks.sort((a, b) => a[0] - b[0]);
const idx = marks.findIndex(([n]) => n === CH);
const c1 = marks[idx][1], c2 = marks[idx + 1] ? marks[idx + 1][1] : full.length;
const ch = full.slice(c1, c2), low = ch.toLowerCase();
const sentences = ch.split(/(?<=[.!?])\s+/);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const STOP = new Set(["was","is","are","be","been","had","has","have","does","do","would","should","will","can","may","shall","being","were","did","could","might","must"]);
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 && e.span[1] <= c2);

const level = Math.max(0, Math.min(5, LEVEL));
console.log(`ZOOM — Chapter ${CH}, level ${level}  (${["BYTES", "CLAUSES", "EVENTS", "EPISODES", "STANDING", "GIST"][level]})  ·  bytes ${c1}→${c2}\n`);

if (level === 0) {
  // BYTES — the raw span, with the child (clause) addresses it will expand into
  console.log(ch.slice(0, 900).replace(/\s+/g, " ").trim() + " …");
  console.log(`\n  ↳ ${ch.length} bytes; zoom down is the floor. Zoom up = level 1 (clauses).`);
} else if (level === 1) {
  // CLAUSES — the seam's cuts, each with its byte range
  const cl = edges.slice(0, 20);
  console.log(`  ${cl.length} clause-edges shown of ${edges.length}; each is a byte range:`);
  for (const e of cl) console.log(`    [${e.span[0]}–${e.span[1]}] ${String(e.action)}`);
  console.log(`\n  ↳ children carry byte ranges (zoom down to 0); zoom up = level 2 (events).`);
} else if (level === 2) {
  // EVENTS — bound propositions (subject·verb·object), at addresses
  const ev = edges.map(e => ({ at: e.span[0], s: name.get(e.subject), v: String(e.action), o: name.get(e.object) }))
    .filter(e => e.s && !ROLE.has(e.s.toLowerCase()) && !STOP.has(e.v.toLowerCase()) && e.v.length > 2).sort((a, b) => a.at - b.at);
  for (const e of ev.slice(0, 16)) console.log(`    [${e.at}] ${e.s} ${e.v}${e.o ? " " + (name.get(e.o) ?? "") : ""}`);
  console.log(`\n  ↳ ${ev.length} events; each cites its byte address (zoom down to 0/1); zoom up = 3 (episodes).`);
} else if (level === 3) {
  // EPISODES — contiguous same-agent runs composed into one line
  const ev = edges.map(e => ({ at: e.span[0], s: name.get(e.subject), v: String(e.action) }))
    .filter(e => e.s && !ROLE.has(e.s.toLowerCase()) && !STOP.has(e.v.toLowerCase()) && e.v.length > 2).sort((a, b) => a.at - b.at);
  const eps = []; let run = null;
  for (const e of ev) { if (!run || run.s !== e.s) { run = { at: e.at, s: e.s, v: [e.v], lo: e.at, hi: e.at }; eps.push(run); } else { run.v.push(e.v); run.hi = e.at; } }
  for (const ep of eps.slice(0, 12)) console.log(`    [${ep.lo}–${ep.hi}] ${ep.s}: ${[...new Set(ep.v)].slice(0, 5).join(", ")}`);
  console.log(`\n  ↳ ${eps.length} episodes; each cites its event span (zoom down to 2); zoom up = 4 (standing).`);
} else if (level === 4) {
  // STANDING — the kinds and the cast (aggregate over the episodes)
  const CAST = ["man","woman","wife","lady","gentleman","sir","miss","bennet","elizabeth","jane","darcy","bingley","sister","sisters","friend","family","daughter","girl","mother","father"];
  const present = CAST.filter(b => low.includes(b));
  const comp = new Map(present.map(b => [b, new Map()]));
  for (const s of sentences) { const p = present.filter(b => s.toLowerCase().includes(b)); for (const a of p) for (const b of p) if (a !== b) comp.get(a).set(b, 1); }
  const jac = (a, b) => { const A = new Set(comp.get(a).keys()), B = new Set(comp.get(b).keys()); const i = [...A].filter(x => B.has(x)).length, u = new Set([...A, ...B]).size; return u ? i / u : 0; };
  const seen = new Set(), kinds = [];
  for (const a of present) { if (seen.has(a)) continue; const c = [a]; seen.add(a); for (const b of present) if (!seen.has(b) && jac(a, b) >= 0.4) { c.push(b); seen.add(b); } kinds.push(c); }
  const wits = (k) => sentences.filter(s => k.some(m => s.toLowerCase().includes(m))).length;
  kinds.sort((x, y) => wits(y) - wits(x));
  console.log(`  standing kinds (INS·Pattern):`);
  for (const k of kinds.slice(0, 5)) console.log(`    { ${k.join(", ")} }  ·  ${wits(k)} sentences`);
  console.log(`\n  ↳ each kind cites the sentences (zoom down to 3/2); zoom up = 5 (gist).`);
} else {
  // GIST — the macrostructure sentence (deletion · generalization · construction)
  const ev = edges.map(e => ({ at: e.span[0], s: name.get(e.subject), v: String(e.action), o: name.get(e.object) }))
    .filter(e => e.s && !ROLE.has(e.s.toLowerCase()) && !STOP.has(e.v.toLowerCase()) && e.v.length > 2).sort((a, b) => a.at - b.at);
  const pairN = new Map(); for (const e of ev) pairN.set(`${e.s} ${e.v}`, (pairN.get(`${e.s} ${e.v}`) ?? 0) + 1);
  const sal = (e) => -Math.log2((pairN.get(`${e.s} ${e.v}`) ?? 1) / (ev.length || 1));
  const dev = [...ev].sort((a, b) => sal(b) - sal(a))[0];
  const out = ev[ev.length - 1];
  console.log(`  SETTING: the chapter's cast stands in society (zoom down to level 4 for the kinds).`);
  console.log(`  DEVIATION: [${dev?.at}] ${dev ? dev.s + " " + dev.v : "—"}`);
  console.log(`  OUTCOME: [${out?.at}] ${out ? out.s + " " + out.v : "—"}`);
  console.log(`\n  ⟹ GIST: the cast of Chapter ${CH} moves through its social round; the chapter turns on ${dev ? dev.s + " " + dev.v : "—"} and comes to ${out ? out.s + " " + out.v : "—"}.`);
  console.log(`\n  ↳ the gist cites two event addresses (zoom down to 5→2→0). Zoom in and the sentence decomposes into its events.`);
}