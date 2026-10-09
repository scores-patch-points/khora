import fs from "node:fs";
const eot = JSON.parse(fs.readFileSync("eot-odyssey-521664.json", "utf8"));
const scene = eot.sceneSignal;
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const fin = scene.filter(Number.isFinite).sort((a, b) => a - b);
const blink = fin[Math.floor(fin.length * 0.9)] ?? 0;
const nullish = new Set(["…", "", "null", "undefined", "?"]);
const named = (h) => { const n = name.get(h); return n && !n.startsWith("?") && !nullish.has(n); };
const particles = new Set(["μὲν", "ἀλλ", "ἦ", "εἰ", "κεν", "εἰς", "ἢ", "ἡ", "μέν", "μάλ", "ἄλλ", "ὡς", "δ", "γάρ", "καὶ", "οὐ", "τε", "δᾶ", "γ", "δη", "περ", "τά", "τ"]);
const actReal = (a) => { const s = String(a ?? "").trim(); return s.length > 1 && !particles.has(s); };
const survivor = eot.edges.map((e, i) => ({ e, i, d: scene[i] })).filter(({ e, i, d }) => {
  const subj = e.subject && named(e.subject), obj = e.object && named(e.object);
  return (subj && actReal(e.action)) || obj || (Number.isFinite(d) && d >= blink);
});
console.log("meaningful-record edges:", survivor.length, "of", eot.edges.length, "(" + ((survivor.length / eot.edges.length) * 100).toFixed(1) + "%)");
for (const { e, i, d } of survivor.filter(({ e }) => String(e.action).includes("βαῖν"))) {
  console.log("  boarding: i", i, "a", e.at, "subj", name.get(e.subject), "Δ", d.toFixed(4));
}