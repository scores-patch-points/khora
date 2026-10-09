// all-summaries.mjs — THERE ARE ALL KINDS OF WAYS TO SUMMARIZE. The summary is
// not one output; it is an OPERATOR FAMILY — you summarize BY something (by
// kind, by conveyance, by register, by standing, by topic, by channel), and the
// choice of "by" is the lens. Each is computed on the fly from what the read
// holds; each is lawful (given or witnessed); none is revealed. One chapter,
// many summaries, side by side.
import fs from "node:fs";
import { feltSense } from "/Users/mlacy/Documents/3.0/khora/native/adapters/text/felt-sense.js";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const ch = full.slice(c1, c2), low = ch.toLowerCase();
const sentences = ch.split(/(?<=[.!?])\s+/);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 - 60 && e.span[1] <= c2 + 300);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);

const out = [];
const line = (mode, cell, standing, what) => out.push({ mode, cell, standing, what });

// ── BY KIND (INS·Pattern) — induced from the cast's co-presence ──
{
  const CAST = ["man","wife","woman","bennet","elizabeth","jane","lady","sir","girl","girls","sister","sisters","daughter","daughters","mother","father","friend","lucas","william","bingley","darcy"];
  const present = CAST.filter(b => low.includes(b));
  const comp = new Map(present.map(b => [b, new Map()]));
  for (const s of sentences) { const p = present.filter(b => s.toLowerCase().includes(b)); for (const a of p) for (const b of p) if (a !== b) comp.get(a).set(b, 1); }
  const jac = (a, b) => { const A = new Set(comp.get(a).keys()), B = new Set(comp.get(b).keys()); const i = [...A].filter(x => B.has(x)).length, u = new Set([...A, ...B]).size; return u ? i / u : 0; };
  const seen = new Set(), kinds = [];
  for (const a of present) { if (seen.has(a)) continue; const c = [a]; seen.add(a); for (const b of present) if (!seen.has(b) && jac(a, b) >= 0.34) { c.push(b); seen.add(b); } kinds.push(c); }
  const wits = (k) => sentences.filter(s => k.some(m => s.toLowerCase().includes(m))).length;
  kinds.sort((x, y) => wits(y) - wits(x));
  line("BY KIND", "INS·Pattern", "extracted (co-presence)", "a " + kinds.slice(0, 4).map(k => "{" + k.join(", ") + "}").join(", a ") + " — the induced standing kinds");
}
// ── BY CONVEYANCE (SYN·Link) — the dialogue events, witnessed at bytes ──
{
  const RE = /\b(said|replied|returned|cried)\s+((?:his|her|my|your)\s+)?([A-Z][a-z]+|she|he|his lady|his wife)\b/gi;
  const FIX = { she: "Mrs Bennet", "his lady": "Mrs Bennet", "his wife": "Mrs Bennet", he: "Mr Bennet" };
  const CONJ = { said: "says", replied: "replies", returned: "returns", cried: "cries" };
  const conv = []; let m;
  while ((m = RE.exec(ch)) !== null && conv.length < 6) conv.push(`${FIX[m[3].toLowerCase()] ?? m[3]} ${CONJ[m[1]] ?? m[1]}`);
  line("BY CONVEYANCE", "SYN·Link", "extracted (byte addresses)", conv.join("; ") + " — the news conveyed, one to another");
}
// ── BY REGISTER (EVA·Ground) — the felt field ──
{
  const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8"));
  const felt = feltSense(ch, { posPrior: pos, M: 8 });
  const ax = Object.entries(felt.byPos ?? {}).filter(([, v]) => v != null).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([p, v]) => `${p} ${v.toFixed(2)}`);
  line("BY REGISTER", "EVA·Ground", "extracted (tokens)", `it reads ${ax.join(" · ")} — the felt field of names and argument`);
}
// ── BY STANDING (EVA·Pattern) — what holds across the halves ──
{
  const half = ch.length / 2, cnt = (s, w) => (s.toLowerCase().match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
  const ag = ["bingley", "wife", "married"].filter(t => cnt(ch.slice(0, half), t) && cnt(ch.slice(half), t));
  line("BY STANDING", "EVA·Pattern", "extracted (halves)", `${ag.join(", ")} hold AGREE across both halves — the standing fact`);
}
// ── BY TOPIC (REC·Pattern) — the DMD-converged loop ──
{
  const VOCAB = ["man","wife","fortune","bennet","single","want","know","dear","see","marriage","daughter","sister"];
  const words = ch.split(/\s+/), topOf = (s) => { const n = new Map(); for (const w of s.split(/\s+/).map(x => x.toLowerCase().replace(/[“”.!,?]/g, ""))) if (VOCAB.includes(w)) n.set(w, (n.get(w) ?? 0) + 1); return [...n].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w); };
  let prev = null, prevSig = null, settled = null;
  for (const f of [0.15, 0.3, 0.5, 0.75, 1.0]) { const t = topOf(words.slice(0, Math.floor(words.length * f)).join(" ")); const sig = [...t].sort().join(" "); if (prevSig !== null && sig === prevSig) { settled = t; break; } prev = t; prevSig = sig; }
  line("BY TOPIC", "REC·Pattern", "extracted (windows)", `the loop converged (DMD) on ${(settled ?? prev ?? []).join(", ")}`);
}
// ── BY CHANNEL (SIG·Entity) — the figures it reads through ──
{
  const lens = new Map();
  for (const e of edges) { const s = name.get(e.subject), o = name.get(e.object); for (const f of [s, o]) { if (!f || f.length < 3 || ROLE.has(f.toLowerCase())) continue; lens.set(f.toLowerCase(), (lens.get(f.toLowerCase()) ?? 0) + (s === f ? 1 : 0.5)); } }
  line("BY CHANNEL", "SIG·Entity", "extracted (edges)", `${[...lens].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f).join(", ")} — the figures it reads hardest through`);
}
// ── BY CAST (SIG·Figure) — who acts ──
{
  const c = new Map();
  for (const e of edges) { const s = name.get(e.subject); if (s && !ROLE.has(s.toLowerCase()) && s.length > 2) c.set(s, (c.get(s) ?? 0) + 1); }
  line("BY CAST", "SIG·Figure", "extracted (edges)", `${[...c].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f, n]) => `${f}×${n}`).join(", ")} — who acts`);
}

console.log("CHAPTER I, SUMMARIZED SEVEN WAYS — computed on the fly, each lawful:\n");
for (const o of out) {
  console.log(`  ▸ ${o.mode.padEnd(14)} [${o.cell}]  (${o.standing})`);
  console.log(`      ${o.what}\n`);
}
console.log("Same chapter, seven lenses. The summary is an operator family — you summarize BY something,");
console.log("and every 'by' is computed from what the read holds. None is revealed; none is THE summary.");