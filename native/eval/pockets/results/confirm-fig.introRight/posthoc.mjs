// results/confirm-fig.introRight/posthoc.mjs — POST-HOC robustness analyses, run AFTER the pre-registered cells were seen (confirm-result.json). NOT pre-registered, NOT part of the verdict; they only qualify how to read it.
//   (i)  rho(v_introRight, v_introLeft) on the siblings and on the atlas, to see what the atlas rho 0.485 measured;
//   (ii) a document-group check: the within-unit null carries no document-sampling variance, so each sibling with >= 100k tokens is cut into 10 groups of documents (sha256(id:jk:doc) mod 10);
//        per group d_k = v - mean of 10 within-unit draws; mean(d), its standard error across the groups, t, and how many groups have d > 0;
//   (iii) line overlap of each code/diagram sibling with its nearest atlas pockets (share of sibling lines, >= 3 tokens, whose token string also occurs as a line of the atlas pocket) as a leakage measure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves, seedOf, nullView } from "../../lib/pocket.mjs";
import * as fig from "../../laws/fig.mjs";
import { PREREG } from "./confirm.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), POCKETS = path.resolve(HERE, "../..");
const LOADER = (id) => (id.startsWith("sib-js-") ? "_sibling-js" : id.startsWith("sib-py-") ? "_sibling-py" : id.startsWith("sib-bpmn-") ? "_sibling-bpmn" : id.startsWith("sib-ud-") ? "_sibling-ud" : id.startsWith("sib-en-") ? "_sibling-en" : id.startsWith("cd-") ? "codemisc" : null);
const load = async (id) => (await (await import(pathToFileURL(path.join(POCKETS, "loaders", `${LOADER(id)}.mjs`)).href)).load([id]))[0];
const rank = (xs) => { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const pearson = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
const spearman = (x, y) => pearson(rank(x), rank(y)), r3 = (x) => (x == null ? null : +x.toFixed(3));
const out = { note: "post-hoc, not pre-registered, does not enter the verdict" };
const sib = Object.fromEntries([...PREREG.code, ...PREREG.diagram, ...PREREG.ud, ...PREREG.en].map((id) => [id, JSON.parse(fs.readFileSync(path.join(HERE, "siblings", `${id}.json`), "utf8"))]));
// (i)
const atlasDir = path.join(POCKETS, "results/atlas"), A = [];
for (const f of fs.readdirSync(atlasDir)) { if (/^(pl-|ct-)/.test(f)) continue; const d = JSON.parse(fs.readFileSync(path.join(atlasDir, f), "utf8")); if (!d.halves?.discover) continue; const R = [d.halves.discover["fig.introRight"], d.halves.confirm["fig.introRight"]], L = [d.halves.discover["fig.introLeft"], d.halves.confirm["fig.introLeft"]]; if ([...R, ...L].some((c) => !c || c.v == null || c.z == null)) continue; A.push({ vR: (R[0].v + R[1].v) / 2, vL: (L[0].v + L[1].v) / 2, zR: (R[0].z + R[1].z) / 2, zL: (L[0].z + L[1].z) / 2, dR: (R[0].v - R[0].nullMean + R[1].v - R[1].nullMean) / 2, dL: (L[0].v - L[0].nullMean + L[1].v - L[1].nullMean) / 2 }); }
const S = Object.values(sib).filter((r) => r.introRight.status !== "UNDEFINED").map((r) => { const g = (w, s) => r.halves[w][`fig.${s}`]; return { id: r.id, vR: (g("discover", "introRight").v + g("confirm", "introRight").v) / 2, vL: (g("discover", "introLeft").v + g("confirm", "introLeft").v) / 2, zR: (r.introRight.zDiscover + r.introRight.zConfirm) / 2, zL: (g("discover", "introLeft").z + g("confirm", "introLeft").z) / 2, dR: r.introRight.d, dL: ((g("discover", "introLeft").v - g("discover", "introLeft").nullMean) + (g("confirm", "introLeft").v - g("confirm", "introLeft").nullMean)) / 2 }; });
out.rho = { atlas: { n: A.length, v: r3(spearman(A.map((x) => x.vR), A.map((x) => x.vL))), z: r3(spearman(A.map((x) => x.zR), A.map((x) => x.zL))), d: r3(spearman(A.map((x) => x.dR), A.map((x) => x.dL))) }, siblings: { n: S.length, v: r3(spearman(S.map((x) => x.vR), S.map((x) => x.vL))), z: r3(spearman(S.map((x) => x.zR), S.map((x) => x.zL))), d: r3(spearman(S.map((x) => x.dR), S.map((x) => x.dL))) },
  siblingsCodeDiagram: { n: S.filter((x) => !x.id.startsWith("sib-ud-") && !x.id.startsWith("sib-en-")).length, v: r3(spearman(...[S.filter((x) => !/^sib-(ud|en)-/.test(x.id))].map((s) => [s.map((x) => x.vR), s.map((x) => x.vL)])[0])), d: r3(spearman(...[S.filter((x) => !/^sib-(ud|en)-/.test(x.id))].map((s) => [s.map((x) => x.dR), s.map((x) => x.dL)])[0])) } };
// (ii) document-group check
import { createHash } from "node:crypto";
const K = 10, groupOf = (id, d) => parseInt(createHash("sha256").update(`${id}:jk:${d}`).digest("hex").slice(0, 8), 16) % K;
const ids = Object.values(sib).filter((r) => r.profile.tokens >= 100000).map((r) => r.id);
out.docGroups = {};
for (const id of ids) {
  const p = await load(id), g = Array.from({ length: K }, (_, k) => ({ id: p.id, which: `g${k}`, units: [], docOf: [], m: new Map() }));
  p.units.forEach((u, i) => { const G = g[groupOf(p.id, p.docOf[i])]; if (!G.m.has(p.docOf[i])) G.m.set(p.docOf[i], G.m.size); G.units.push(u); G.docOf.push(G.m.get(p.docOf[i])); });
  const ds = [];
  for (const G of g) {
    const v = fig.compute(G).introRight, xs = []; for (let k = 0; k < 10; k++) xs.push(fig.compute(nullView(G, "within-unit", seedOf(p.id, G.which, "fig", "within-unit", k))).introRight);
    const ok = xs.filter(Number.isFinite); if (Number.isFinite(v) && ok.length >= 3) ds.push(v - ok.reduce((a, b) => a + b, 0) / ok.length);
  }
  const n = ds.length, m = ds.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(ds.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  out.docGroups[id] = { groups: n, meanD: r3(m), se: r3(sd / Math.sqrt(n)), t: r3(m / (sd / Math.sqrt(n))), groupsWithDpositive: ds.filter((x) => x > 0).length, dPerGroup: ds.map((x) => r3(x)), preregD: r3(sib[id].introRight.d), preregStatus: sib[id].introRight.status };
  console.error(`docGroups ${id}: mean d ${m.toFixed(3)} se ${(sd / Math.sqrt(n)).toFixed(3)} t ${(m / (sd / Math.sqrt(n))).toFixed(2)} pos ${ds.filter((x) => x > 0).length}/${n}`);
}
// (iii) line overlap with the nearest atlas pockets
const NEAR = { "sib-js-fold": ["cd-cc-javascript", "cd-e09-eoapp-js"], "sib-js-heimdall": ["cd-cc-javascript", "cd-e09-eoapp-js"], "sib-js-eoreader7": ["cd-cc-javascript", "cd-e09-eoapp-js"], "sib-py-foldvenv": ["cd-cc-python", "cd-e09-python"],
  "sib-bpmn-miwg-heldout": ["cd-bpmn-miwg"], "sib-bpmn-kogito-heldout": ["cd-bpmn-kogito"], "sib-bpmn-activiti-heldout": ["cd-bpmn-activiti"] };
out.overlap = {};
for (const [id, near] of Object.entries(NEAR)) {
  const p = await load(id), lines = new Set(), vocab = new Set();
  for (const n of near) { const q = await load(n); if (!q) continue; for (const u of q.units) { if (u.length >= 3) lines.add(u.join(" ")); for (const w of u) vocab.add(w); } }
  let tot = 0, hit = 0, tokTot = 0, tokHit = 0, sv = new Set(), shared = new Set();
  for (const u of p.units) { for (const w of u) { sv.add(w); tokTot++; if (vocab.has(w)) { tokHit++; shared.add(w); } } if (u.length >= 3) { tot++; if (lines.has(u.join(" "))) hit++; } }
  out.overlap[id] = { nearestAtlas: near, lineShare: r3(hit / tot), tokenShareInAtlasVocab: r3(tokHit / tokTot), typeShareInAtlasVocab: r3(shared.size / sv.size) };
  console.error(`overlap ${id}: ${JSON.stringify(out.overlap[id])}`);
}
fs.writeFileSync(path.join(HERE, "posthoc.json"), JSON.stringify(out, null, 1));
console.error("posthoc done");
