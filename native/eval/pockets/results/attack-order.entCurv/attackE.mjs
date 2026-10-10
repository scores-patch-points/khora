// attackE.mjs -- ATTACK E (the confirmer's own siblings): reload the 13 sibling pockets of results/confirm-order.entCurv with its own loaders (read-only), reproduce its entCurv cell exactly,
// then apply the attacks that matter: half-octave bins, 4 equal-mass bins, plug-in entropy, unit-length strata (ranks fixed), third-entropy decomposition.   node attackE.mjs -> E_siblings.json
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { halves, prep, cell, entc, statusOf, HERE } from "./lib.mjs";
const LD = path.join(HERE, "../../loaders"), files = fs.readdirSync(LD).filter((f) => f.startsWith("_sibling-entcurv-") && f.endsWith(".mjs") && !f.includes("common")).sort();
const IDS = ["ec-en-yonge", "ec-en-mouret", "ec-en-awakening", "ec-en-swisshelm", "ec-en-children", "ec-en-shakespeare", "ec-en-dolls-lysistrata", "ec-ud-lat-perseus", "ec-cd-js", "ec-cd-ts", "ec-cd-py", "ec-ctl-yonge", "ec-ctl-js"];
const FN = { half: (P) => entc(P, { scheme: "half" })?.curv, mass4: (P) => entc(P, { scheme: "mass4" })?.curv, plugin: (P) => entc(P, { mm: false })?.curv };
const STR = [[3, 5], [6, 9], [10, 15], [16, 30]];
const out = { pockets: [] };
for (const f of files) {
  const m = await import(pathToFileURL(path.join(LD, f)).href);
  for (const p of await m.load(IDS)) {
    if (!IDS.includes(p.id)) continue;
    const H = halves(p), Ps = { discover: prep(H.discover), confirm: prep(H.confirm) }, rep = JSON.parse(fs.readFileSync(path.join(HERE, "../confirm-order.entCurv/pockets", `${p.id}.json`), "utf8")), o = { id: p.id, tokens: p.units.reduce((n, u) => n + u.length, 0), units: p.units.length, contentMatchesConfirmer: null, variants: {} };
    const base = ["discover", "confirm"].map((w) => cell(H[w], { P: Ps[w] }));
    o.variants.oct = { status: statusOf(base[0], base[1]), v: base.map((c) => c.v), z: base.map((c) => c.z) };
    o.confirmerZ = ["discover", "confirm"].map((w) => rep.halves[w]["order.entCurv"].z); o.maxAbsZDiffToConfirmer = Math.max(...base.map((c, i) => Math.abs(c.z - o.confirmerZ[i])));
    for (const [k, fn] of Object.entries(FN)) { const c = ["discover", "confirm"].map((w) => cell(H[w], { P: Ps[w], fn })); o.variants[k] = { status: statusOf(c[0], c[1]), v: c.map((x) => x.v), z: c.map((x) => x.z) }; }
    for (const [a, b] of STR) { const k = `L${a}-${b}`, c = ["discover", "confirm"].map((w) => cell(H[w], { P: Ps[w], fn: (P) => entc(P, { minL: a, maxL: b })?.curv })); o.variants[k] = c.every((x) => x && x.z != null) ? { status: statusOf(c[0], c[1]), v: c.map((x) => x.v), z: c.map((x) => x.z) } : { status: "undef" }; }
    const th = ["discover", "confirm"].map((w) => entc(Ps[w])); o.thirds = { midMinusFirst: th.map((e) => (e.H[1] - e.H[0]) / e.Hp), midMinusLast: th.map((e) => (e.H[1] - e.H[2]) / e.Hp) };
    out.pockets.push(o);
    console.error(`${o.id} z-diff-to-confirmer ${o.maxAbsZDiffToConfirmer.toExponential(1)} oct ${o.variants.oct.status} half ${o.variants.half.status} mass4 ${o.variants.mass4.status} plugin ${o.variants.plugin.status} strata ${STR.map(([a, b]) => o.variants[`L${a}-${b}`].status).join(",")}`);
  }
}
fs.writeFileSync(path.join(HERE, "E_siblings.json"), JSON.stringify(out, null, 1));
