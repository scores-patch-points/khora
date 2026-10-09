import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged");
let end = full.indexOf("Chapter II", c1); if (end < 0) end = c1 + 9000;
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const startIdx = eot.edges.findIndex(e => e.span && e.span[0] >= c1);
const chEdges = [];
for (let i = startIdx; i < eot.edges.length; i++) { const e = eot.edges[i]; if (e.span[1] > end + 400) break; chEdges.push({ e, i }); }
const STOP_VERBS = new Set(["was", "is", "am", "are", "be", "been", "had", "does", "do", "would", "should", "will", "can", "may", "shall", "has", "have", "being", "were", "did", "could", "might", "must"]);
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one","who","which"]);
const cast = new Map(), verbs = new Map(), patient = new Map();
const frames = [];
for (const { e, i } of chEdges) {
  const s = name.get(e.subject), o = name.get(e.object);
  const delta = eot.sceneSignal?.[i] ?? 0;
  if (s && !ROLE.has(s.toLowerCase()) && s.length > 2) cast.set(s, (cast.get(s) ?? 0) + 1);
  if (o && !ROLE.has(o.toLowerCase()) && o.length > 2) patient.set(o, (patient.get(o) ?? 0) + 1);
  const v = String(e.action ?? "");
  if (s && !STOP_VERBS.has(v.toLowerCase()) && v.length > 2) verbs.set(v, (verbs.get(v) ?? 0) + 1);
  // the standing frame: beings co-present near this edge
  frames.push({ s, o, v, delta });
}
const sortedCast = [...cast].sort((a,b) => b[1] - a[1]).slice(0, 10);
const sortedPatient = [...patient].sort((a,b) => b[1] - a[1]).slice(0, 6);
const topVerbs = [...verbs].sort((a,b)=>b[1]-a[1]).slice(0, 10);

console.log("MECHANICAL SUMMARY — P R I D E   &   P R E J U D I C E, Chapter I (no model):\n");
console.log(`· READ: ${chEdges.length} bound clauses of this chapter's ${end - c1} chars, from the EOT\n`);
console.log("· WHO IS ON STAGE (the chapter's cast, by participation):");
console.log("   " + sortedCast.map(([s,n]) => `${s}×${n}`).join(" · "));
console.log("\n· WHO IS ACTED UPON (the patients of the chapter):");
console.log("   " + sortedPatient.map(([s,n]) => `${s}×${n}`).join(" · "));
console.log("\n· WHAT HAPPENS (the chapter's real verbs, aggregated):");
console.log("   " + topVerbs.map(([v,n]) => `${v}×${n}`).join(" · "));

// THE PATTERN of the highest-being (Elizabeth, if she's on stage): her mode
const hero = sortedCast[0]?.[0];
if (hero) {
  const her = chEdges.filter(({ e }) => name.get(e.subject) === hero);
  const herActs = {};
  for (const { e } of her) { const v = String(e.action ?? ""); if (!STOP_VERBS.has(v.toLowerCase())) herActs[v] = (herActs[v] ?? 0) + 1; }
  const herMode = Object.entries(herActs).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([v,n])=>`${v}×${n}`).join(", ");
  console.log(`\n· THE PATTERN of ${hero} (its mode across the chapter):`);
  console.log(`   ${herMode || "(no non-copular act recorded)"}`);
  // her standing frame
  const frame = chEdges.filter(({ e }) => e.subject === hero || name.get(e.object) === hero)
    .flatMap(({ e }) => [name.get(e.subject), name.get(e.object)])
    .filter((b) => b && b !== hero && !ROLE.has(b.toLowerCase()));
  console.log(`\n· ${hero} STANDS WITH: ${[...new Set(frame)].slice(0, 6).join(", ")}`);
}
// THE BEATS: the chapter's sharpest edges (highest delta among real verbs)
const sharp = frames.filter((f) => f.s && f.v && !STOP_VERBS.has(f.v.toLowerCase()) && f.delta >= 0.48)
  .sort((a,b)=>b.delta-a.delta).slice(0, 8);
console.log("\n· THE BEATS (the chapter's sharpest bound acts):");
for (const b of sharp) console.log(`   ${b.s} ${b.v}${b.o ? " " + b.o : ""}`);
console.log("\n(refusals: any clause the read could not bind is absent — nothing is invented.)");