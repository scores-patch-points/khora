// results/confirm-para.formulaCov/posthoc.mjs — POST-HOC diagnostics, written AFTER confirm-result.json was produced (labelled as such; none of this enters the pre-registered verdict).
//   (1) atlas controls / planted / templated rows of para.formulaCov (read from results/atlas).  (2) paired comparison: sibling UD train split vs the atlas dev+test pocket of the same stem.
//   (3) excess coverage v - nullMean by class.  (4) HIGH-DRAW null (200 within-unit draws, seeds seedOf(id, which, "para", "within-unit-posthoc", k)) for the z-undefined cells: how many null draws reach the observed v.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves, nullView, seedOf } from "../../lib/pocket.mjs";
import * as para from "../../laws/para.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ATLAS = path.resolve(HERE, "../atlas"), K = "para.formulaCov";
const res = JSON.parse(fs.readFileSync(path.join(HERE, "confirm-result.json"), "utf8")), out = { note: "post hoc; not part of the pre-registered verdict" };
const cell = (j) => ["discover", "confirm"].map((w) => j.halves?.[w]?.[K]);
const atlasRow = (id) => { const f = path.join(ATLAS, `${id}.json`); if (!fs.existsSync(f)) return null; const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.skipped) return { id, skipped: j.skipped }; const [d, c] = cell(j); return { id, register: j.meta.register, tokens: j.meta.tokens, vD: d.v, vC: c.v, zD: d.z, zC: c.z, nullMeanD: d.nullMean, nullMeanC: c.nullMean }; };
const ids = fs.readdirSync(ATLAS).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
out.controlsAndPlanted = ids.filter((i) => /^(ct-|pl-)/.test(i)).map(atlasRow);
out.templatedFactbook = atlasRow("fm-factbook");
out.pairedUd = res.rows.filter((r) => r.cls === "treebank").map((r) => ({ sibling: r.id, siblingTokens: r.tokens, siblingStatus: r.status, siblingV: r.v, siblingZ: [r.zDiscover, r.zConfirm], atlas: atlasRow(r.id.replace("sf-ud-", "ud-")) }));
const by = {}; for (const r of res.rows) { const e = (by[r.cls] ??= []); e.push({ id: r.id, excessD: r.vDiscover - r.nullMeanDiscover, excessC: r.vConfirm - r.nullMeanConfirm }); }
out.excessCoverageByClass = by;
const todo = [["sf-ud-pol", "discover"], ["sf-ud-pol", "confirm"], ["sf-en-chopin", "confirm"]];
if (process.argv[2] === "highdraw") {
  const load = async (f, id) => (await (await import(pathToFileURL(path.resolve(HERE, "../../loaders", f)).href)).load([id])).find((p) => p.id === id);
  out.highDraw = [];
  for (const [id, which] of todo) {
    const p = await load(id.startsWith("sf-ud") ? "_sibling-fcov-ud.mjs" : "_sibling-fcov-prose.mjs", id), view = halves(p)[which], obs = para.compute(view)[K.split(".")[1]];
    const xs = []; for (let k = 0; k < 200; k++) xs.push(para.compute(nullView(view, "within-unit", seedOf(id, which, "para", "within-unit-posthoc", k)))[K.split(".")[1]]);
    const m = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
    out.highDraw.push({ id, which, observed: obs, nullMean: m, nullSd: sd, nullMax: Math.max(...xs), nullDistinctValues: new Set(xs).size, drawsAtOrAboveObserved: xs.filter((x) => x >= obs).length, draws: xs.length, zHigh: sd > 0 ? (obs - m) / sd : null });
    console.error(JSON.stringify(out.highDraw.at(-1)));
  }
}
fs.writeFileSync(path.join(HERE, process.argv[2] === "highdraw" ? "posthoc.json" : "posthoc-nodraw.json"), JSON.stringify(out, null, 1));
