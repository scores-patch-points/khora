// terrains2.mjs — THE REGISTERS, ORGAN-DRIVEN (v2, 2026-10-09). Two
// corrections against v1:
//   (1) A FIGURE IS NOT JUST A PERSON. GFP figures are end1/end2 of an
//       arrangement — fortune, wife, neighbourhood, single are figures too.
//       The LENS is the activated subset of the read that passes THROUGH a
//       figure, being or not (its channel).
//   (2) ATMOSPHERE LIVES IN THE FELT FIELD. The reader's metered ground is the
//       felt sense (adapters/text/felt-sense.js): per-token span-delta ablation
//       projected onto POS axes — how verby / nouny this stretch FEELS. That,
//       not traffic, is the register's content.
//   (3) PARADIGM stays the cross-channel standing (mergeTestimony's
//       AGREE/SINGLE/DISAGREE across independent witnesses).
import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const c1 = full.indexOf("truth universally acknowledged");
const c2 = full.indexOf("CHAPTER II", c1);
const chapter = full.slice(c1, c2);
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 - 60 && e.span[1] <= c2 + 300);

console.log("THE REGISTERS OF CHAPTER I — figures (not just persons), felt field, standing:\n");

// ── ATMOSPHERE · the FELT FIELD ────────────────────────────────────────────
// Run felt sense over the chapter: full-token ablation, span deltas, one axis
// per part of speech. The FELT CENTRE per POS is this stretch's atmosphere —
// how it reads FEELS mechanical/perceptual/grammatical — mechanically.
import { feltSense } from "/Users/mlacy/Documents/3.0/khora/native/adapters/text/felt-sense.js";
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8"));
const felt = feltSense(chapter, { posPrior: pos, M: 8 });
const centre = Object.entries(felt.byPos ?? {})
  .filter(([, v]) => v !== null && v !== undefined)
  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  .slice(0, 4)
  .map(([p, v]) => `${p}=${v.toFixed(2)}`);
console.log("◌ ATMOSPHERE — the FELT field of the chapter (span-delta, per-POS projection):");
console.log(felt && felt.n ? `   ${felt.n} tokens felt · axis-centres: ${centre.join(" · ") || "(none settled)"}`
  : "   (felt-sense returned no settled axis — the field is thin; reported, not invented)");
if (felt?.n) {
  const verby = Number(felt.byPos?.VERB ?? null) !== null ? `verbs feel ${felt.byPos.VERB.toFixed(2)}` : null;
  const nouny = Number(felt.byPos?.NOUN ?? null) !== null ? `nouns feel ${felt.byPos.NOUN.toFixed(2)}` : null;
  console.log(`   ${[verby, nouny].filter(Boolean).join(" · ")} — the meter the reader would carry; consumed, never shouted.`);
}

// ── LENS · the FIGURE-channels ─────────────────────────────────────────────
// Every figure = a channel: its own activated subset of the read (as
// subject-weighted or patient-weighted, per arrangement). Not just beings.
const lens = new Map();
for (const e of edges) {
  const s = name.get(e.subject), o = name.get(e.object);
  for (const f of [s, o]) {
    if (!f || f.length < 3 || /^(you|she|him|her|them|this|that|there|one)$/.test(f.toLowerCase())) continue;
    const w = (s === f ? 1.0 : 0.5) * (e.span[1] - e.span[0]);
    lens.set(f.toLowerCase(), (lens.get(f.toLowerCase()) ?? 0) + w);
  }
}
const lensTop = [...lens].sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log("\n◎ LENS — every FIGURE is a channel (its own activated subset):");
for (const [f, w] of lensTop) {
  const act = edges.filter(e => String(name.get(e.subject) ?? "").toLowerCase() === f || String(e.span ? f : f) === f && String(name.get(e.subject) ?? "").toLowerCase() === f).length;
  const asSubj = edges.filter(e => String(name.get(e.subject) ?? "").toLowerCase() === f).length;
  const asPat = edges.filter(e => String(name.get(e.object) ?? "").toLowerCase() === f).length;
  console.log(`   ${String(f).padEnd(12)} lens ${w.toFixed(0)} · acts ${asSubj} · endured ${asPat}`);
}

// ── PARADIGM · the standing ACROSS channels ────────────────────────────────
// The topic across the chapter's halves: AGREE = both witnesses hold.
const halves = [full.slice(c1, c1 + (c2 - c1) / 2), full.slice(c1 + (c2 - c1) / 2, c2)];
const countOf = (s, w) => (s.toLowerCase().match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
const standing = (t) => { const a = countOf(halves[0], t), b = countOf(halves[1], t); return a > 0 && b > 0 ? "AGREE" : (a > 0) !== (b > 0) ? "SINGLE" : "UNDETERMINED"; };
console.log("\n♜ PARADIGM — the standing across the chapter's two halves (the SET, not any one):");
for (const t of ["bingley", "darcy", "married", "wife", "daughter"]) console.log(`   ${t.padEnd(9)} ${standing(t)}`);
console.log("\n(Atmosphere = the felt field · Lens = the figure-channels · Paradigm = the standing.");
console.log(" No name pinned onto the paragraph; every register computed from the reading.)");