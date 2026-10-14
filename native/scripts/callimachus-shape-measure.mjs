// scripts/callimachus-shape-measure.mjs — the two measurements in docs/CALLIMACHUS-SHAPE.md §7. No model, no network.
//   node native/scripts/callimachus-shape-measure.mjs roundtrip <telling.addressed.json>
//   node native/scripts/callimachus-shape-measure.mjs lean <telling.addressed.json> [more …]
//   node native/scripts/callimachus-shape-measure.mjs seams <telling.addressed.json> [more …]   (§7.3: share of bytes not copied)
import fs from "node:fs";
import { elementsOf } from "../the-fold/medium.js";
import { attachArc } from "../the-fold/arc.js";
import { createSeededRng } from "../kernel/rng.js";

const [mode, ...files] = process.argv.slice(2);
const load = (f) => JSON.parse(fs.readFileSync(f, "utf8")).sentences;

if (mode === "roundtrip") {
  const S = load(files[0]);
const terr = [...new Set(S.map((s) => s.terrain))];
const groups = terr.map((g) => ({ g, ss: S.filter((s) => s.terrain === g) }));
// Plain-language titles: the telling's own (renderPlain) would supply these; here the terrain name stands in.
const media = {
  prose: () => groups.map(({ g, ss }) => `${g}\n\n${ss.map((s) => s.text).join(" ")}`).join("\n\n"),
  bullets: () => groups.map(({ g, ss }) => `## ${g}\n\n${ss.map((s) => `- ${s.text}`).join("\n")}`).join("\n\n"),
  numbered: () => S.map((s, i) => `${i + 1}. ${s.text}`).join("\n"),
  table: () => ["| Cell | Says |", "|---|---|", ...S.map((s) => `| ${s.cell} | ${s.text.replace(/\|/g, "\\|")} |`)].join("\n"),
  slides: () => groups.map(({ g, ss }) => `# ${g}\n\n${ss.map((s) => `* ${s.text}`).join("\n")}`).join("\n\n---\n\n"),
  lines: () => S.map((s) => s.text).join("\n"),
};
for (const [name, f] of Object.entries(media)) {
  const text = f();
  const E = elementsOf(text).elements;
  const by = {}; for (const e of E) by[e.cls] = (by[e.cls] ?? 0) + 1;
  const lost = S.filter((s) => !E.some((e) => e.text.includes(s.text))).length;
  // one element per sentence? (content classes only)
  const content = E.filter((e) => e.cls === "line" || e.cls === "item").length;
  console.log(`${name.padEnd(9)} classes ${JSON.stringify(by)}  content=${content} (want ${name === "prose" ? groups.length : S.length})  sentences not found whole in one element: ${lost}/${S.length}`);
}
} else if (mode === "lean") {
  const S = files.flatMap(load);
// one unit per sentence, so each is its own element; baseline = the whole collection
const r = await attachArc(S.map((s) => s.text), { moves: false });
const got = r.units.map((u) => u.elements[0] ?? {});
const pairs = S.map((s, i) => ({ dT: s.terrain, dS: s.stance, aT: got[i].terrain, aS: got[i].stance })).filter((p) => p.aT);
const agree = (ps, k) => ps.filter((p) => p["d" + k] === p["a" + k]).length;
const rnd = createSeededRng({ purpose: "callimachus-shape.lean-null", n: pairs.length });
const draws = 999;
for (const k of ["T", "S"]) {
  const real = agree(pairs, k);
  let ge = 0;
  for (let d = 0; d < draws; d++) {
    const lab = pairs.map((p) => p["d" + k]);
    for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; }
    if (pairs.filter((p, i) => lab[i] === p["a" + k]).length >= real) ge++;
  }
  console.log(`${k === "T" ? "terrain" : "stance "}: declared = parse-lean on ${real}/${pairs.length}; label-shuffle null p = ${((ge + 1) / (draws + 1)).toFixed(3)} (${draws} draws)`);
}
const tab = {}; for (const p of pairs) { const k = `${p.dT} -> ${p.aT}`; tab[k] = (tab[k] ?? 0) + 1; }
console.log(Object.entries(tab).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${v} ${k}`).join("; "));
} else if (mode === "seams") {
  for (const f of files) {
    const k = {}; let tot = 0;
    for (const s of load(f)) for (const g of s.segments) { const b = Buffer.byteLength(g.text ?? ""); k[g.kind] = (k[g.kind] ?? 0) + b; tot += b; }
    console.log(`${f}  bytes ${tot}  seam density ${((tot - (k.source ?? 0)) / tot).toFixed(3)}  ${JSON.stringify(k)}`);
  }
} else console.log("usage: roundtrip <file> | lean <file …> | seams <file …>");
