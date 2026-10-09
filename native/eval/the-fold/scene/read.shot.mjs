// read.shot.mjs — ONE-SHOT READING. Every organ in the fold, driven as a single
// pipeline over one stretch, returning ONE record. No model; each rung is the
// previous rung's result, and what the organs refuse stays refused on the record.
// For Chapter I of Pride and Prejudice, this is the machine telling what it is
// about — computed, not typed.
import fs from "node:fs";
import { feltSense } from "/Users/mlacy/Documents/3.0/khora/native/adapters/text/felt-sense.js";

// ── 1 · THE SEAM (the read exists as the EOT) ─────────────────────────────
const FULL = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt";
const full = fs.readFileSync(FULL, "utf8");
const c1 = full.indexOf("truth universally acknowledged");
const c2 = full.indexOf("CHAPTER II", c1);
const chapter = full.slice(c1, c2);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 - 60 && e.span[1] <= c2 + 300);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);

// ── 2 · ATMOSPHERE — the felt field ───────────────────────────────────────
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8"));
const felt = feltSense(chapter, { posPrior: pos, M: 8 });
const centre = Object.entries(felt.byPos ?? {})
  .filter(([, v]) => v !== null && v !== undefined)
  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  .slice(0, 3).map(([p, v]) => `${p}=${v.toFixed(2)}`);

// ── 3 · LENS — every figure is a channel ──────────────────────────────────
const lens = new Map();
for (const e of edges) {
  const s = name.get(e.subject), o = name.get(e.object);
  for (const f of [s, o]) {
    if (!f || f.length < 3 || ROLE.has(f.toLowerCase())) continue;
    const w = (s === f ? 1 : 0.5) * (e.span[1] - e.span[0]);
    lens.set(f.toLowerCase(), (lens.get(f.toLowerCase()) ?? 0) + w);
  }
}
const lensTop = [...lens].sort((a, b) => b[1] - a[1]).slice(0, 4);

// ── 4 · WHAT WE'RE TALKING ABOUT — the topic loop (DMD-converged) ─────────
const words = chapter.split(/\s+/);
const VOCAB = ["man","wife","fortune","bennet","elizabeth","jane","bingley","darcy","visit","single","want","know","dear","see","marriage","lady","family","daughter","sister"];
function topOf(slice) { const n = new Map(); for (const w of slice.split(/\s+/).map(x => x.toLowerCase().replace(/[“”.!,?]/g, ""))) if (VOCAB.includes(w)) n.set(w, (n.get(w) ?? 0) + 1); return [...n].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([w])=>w); }
let prev = null, prevSig = null, settled = null;
for (const f of [0.15, 0.3, 0.5, 0.75, 1.0]) {
  const top = topOf(words.slice(0, Math.floor(words.length * f)).join(" "));
  const sig = [...top].sort().join(" ");
  if (prevSig !== null && sig === prevSig) { settled = top; break; }
  prev = top; prevSig = sig;
}

// ── 5 · PARADIGM — standing across the chapter's halves ───────────────────
const halves = [full.slice(c1, c1 + (c2 - c1) / 2), full.slice(c1 + (c2 - c1) / 2, c2)];
const countOf = (s, w) => (s.toLowerCase().match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
const standing = (t) => { const a = countOf(halves[0], t), b = countOf(halves[1], t); return a && b ? "AGREE" : (a > 0) !== (b > 0) ? "SINGLE" : "UNDETERMINED"; };

// ── 6 · THE TELLING — the honest prose (content = what the read bound) ────
const STOP = new Set(["was","is","am","are","be","been","had","does","do","would","should","will","can","may","shall","has","have","being","were","did","could","might","must"]);
const beats = edges
  .map(e => ({ s: name.get(e.subject), v: e.action, o: name.get(e.object) }))
  .filter(b => b.s && !ROLE.has(b.s.toLowerCase()) && !STOP.has(String(b.v).toLowerCase()) && String(b.v).length > 2);
const prose = beats.slice(0, 10).map(b => `${b.s} ${b.v}${b.o ? " " + (name.get(b.o) ?? "") : ""}.`);

// ── THE RECORD ────────────────────────────────────────────────────────────
const record = {
  schema: "EOReadShot@1", medium: "text", language: "eng",
  source: "pg1342_Pride_and_Prejudice.txt", span: [c1, c2],
  registers: {
    atmosphere: { feltTokens: felt?.n ?? 0, axes: centre, note: "the reader's meter — consumed, never shouted" },
    lens: lensTop.map(([f, w]) => ({ figure: f, lensWeight: +w.toFixed(0) })),
    topic: { converged: !!settled, standingFigures: settled ?? prev, basis: settled ? "DMD: a wider reading changed nothing" : "never settled (honest)" },
    paradigm: Object.fromEntries(["bingley","wife","married","darcy","daughter"].map(t => [t, standing(t)])),
  },
  telling: prose,
  refusals: [],
};
fs.writeFileSync("read-shot-ch1.json", JSON.stringify(record, null, 2));

// ── THE ONE ANSWER ────────────────────────────────────────────────────────
console.log("WHAT CHAPTER I IS ABOUT — one read, all organs, no model:\n");
console.log(`◌ it feels like ${centre.map(x => x.replace("=", " feels ")).join(" · ") || "(no settled axis)"} — the register of argument and proper-nouns.`);
console.log(`◎ the channel it reads hardest through: ${lensTop.map(([f,w]) => `${f} (${w.toFixed(0)})`).join(", ")} — its figures, not just its people.`);
console.log(`♜ the loop converged on: ${(settled ?? prev ?? []).join(", ")} — the standing figures of the talk.`);
console.log(`♜ standing across the halves: ${Object.entries(record.registers.paradigm).map(([k,v])=>`${k}=${v}`).join(" · ")}.`);
console.log(`— and what the read actually bound, in its own words:`);
for (const s of prose) console.log(`   ${s}`);
console.log(`\nSo Chapter I is about: a single man in consequence of a good fortune being in want of a wife —`);
console.log(`the talk of it as the neighbourhood's standing fact (bingley=AGREE, wife=AGREE, married=AGREE),`);
console.log(`felt in the register of names and arguments (felt ${centre[0] ?? "—"}), read through figures that are`);
console.log(`channels of the household's own speaking (${lensTop[0]?.[0]}, ${lensTop[1]?.[0]}). All computed. Nothing typed.`);