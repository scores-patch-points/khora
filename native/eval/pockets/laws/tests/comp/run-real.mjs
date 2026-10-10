// real-text test of the comp family: ethos books through the bk loaders' own tokeniser (cap 60k tokens), atlas-identical z, plus raw values on controls. node run-real.mjs > results-real.json
import * as fam from "../../comp.mjs";
import { bookView, atlasCells, cpuMs, round, tokensOf, regroup, regroupRandom } from "./_t_util.mjs";
import { prep } from "../../_comp_prep.mjs";
import { neighbourTypeStats } from "../../_comp_neigh.mjs";
const BOOKS = [["bk-great-expect", "01-literature-books/gitenberg/pg1400_Great-Expectations.txt"], ["bk-prince", "01-literature-books/gitenberg/pg1232_The-Prince.txt"]];
const out = { note: "real ethos books; cap 60,000 tokens of whole sentences from the start; atlas-identical z (10 draws per null kind)", books: {} };
for (const [id, rel] of BOOKS) {
  const v = bookView(rel, id, 60000), t = cpuMs(() => fam.compute(v)), P = prep(v), nb = neighbourTypeStats(P);
  out.books[id] = { tokens: tokensOf(v), units: v.units.length, cpuMs: round(t.cpu, 1), cells: atlasCells(v, 10, "real-test"), rigidHard: { L: round(nb.hardL, 4), R: round(nb.hardR, 4), eligL: nb.eligL, eligR: nb.eligR },
    controls: {} };
  for (const [name, w] of [["regroup-L5", regroup(v, 5)], ["regroup-L20", regroup(v, 20)], ["regroup-iidD1", regroupRandom(v, id)]]) out.books[id].controls[name] = { units: w.units.length, cells: atlasCells(w, 10, "real-test-ctl") };
  console.error(id, "done");
}
console.log(JSON.stringify(out));
