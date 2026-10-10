// eval/physics-handles/reliability.mjs — POST-HOC POWER DIAGNOSTIC for the warp-vs-gravity test (curvature.mjs, WG). NOT in any pre-registration; labelled so wherever it is reported.
// Why it exists: WG found the attraction energy and the warp uncorrelated beyond mass. Before reading that as "different quantities", ask whether the per-body attraction energy is
// measured well enough to correlate with anything: split-half reliability = Spearman between the energy of a body computed from its EVEN-numbered mentions and from its ODD-numbered
// mentions (same bodies as curvature.mjs, same estimator). If the reliability is below 0.30 (a typed provisional number, same as the other rules) the WG null result is UNDERPOWERED, not a finding.
//   node eval/physics-handles/reliability.mjs [--out FILE]
import fs from "node:fs";
import path from "node:path";
import { HERE, seedFor, spearman, partialSpearman, round, median, loadUD, loadIRC, loadWP, argv } from "./lib.mjs";
import { buildIndex, attractionExcess, energyOf } from "./attraction.mjs";

const { opt } = argv();
const dir = path.join(HERE, "results", "curvature"), out = { perCorpus: {} };
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json") && !x.endsWith(".H1.json") && !x.startsWith("_")).sort()) {
  const name = f.replace(".json", ""), res = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (res.gap || res.per.length < 40) continue;
  let c;
  if (name === "irc") c = loadIRC(6, "irc-g"); else if (name === "wp") c = await loadWP(); else { const m = /^ud-(.+)-([AB])$/.exec(name); c = loadUD(m[1], m[2]); }
  const ix = buildIndex(c.docs), rows = [];
  for (const p of res.per) {
    const id = ix.id.get(p.w); if (id === undefined) continue;
    const split = (par) => { const D = [], P = []; ix.occDoc[id].forEach((d, i) => { if (i % 2 === par) { D.push(d); P.push(ix.occPos[id][i]); } }); return energyOf(attractionExcess(ix, id, D, P, { seed: seedFor("rel", name, p.w, par) % 100000 }).A); };
    rows.push({ n: p.n, even: split(0), odd: split(1) });
  }
  const ok = rows.filter((r) => Number.isFinite(r.even) && Number.isFinite(r.odd));
  out.perCorpus[name] = { bodies: ok.length, reliability: round(spearman(ok.map((r) => r.even), ok.map((r) => r.odd))), reliabilityGivenLogN: round(partialSpearman(ok.map((r) => r.even), ok.map((r) => r.odd), [ok.map((r) => Math.log(r.n))])) };
  console.error(name, JSON.stringify(out.perCorpus[name]));
}
const rel = Object.values(out.perCorpus).map((x) => x.reliability);
out.median = round(median(rel)); out.share_ge_030 = round(rel.filter((x) => x >= 0.3).length / Math.max(1, rel.length));
fs.writeFileSync(opt("--out", path.join(HERE, "results", "reliability.json")), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ median: out.median, share_ge_030: out.share_ge_030, corpora: rel.length }));
