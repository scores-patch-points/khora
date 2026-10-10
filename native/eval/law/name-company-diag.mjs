// eval/law/name-company-diag.mjs — POST-HOC diagnostic of name-company.mjs (not pre-registered; labelled as such). Why does the POSITION control sit at ~0.38?
// Hypothesis: pairs are matched exactly on the position key, but the two members of a pair fall in different sentence-quartile BLOCKS, so removing a block leaves the
// training set cell-imbalanced in the opposite direction (classic leave-block-out anti-learning). Test: re-block each pair by its POSITIVE member's block and re-score.
import { pairsOf, udDoc, ARMS } from "./name-company.mjs";
import { cvScores, aucOf } from "./name-war-and-peace.mjs";
import { rngFor, seedFor } from "./impact.mjs";
const out = {};
for (const stem of ["eng", "spa", "fas", "hin", "fra"]) {
  const doc = udDoc(stem); if (!doc) continue;
  const rows = pairsOf(doc, "LATER", rngFor(seedFor("name-company", stem, "LATER")), 600).rows;
  const y = rows.map((r) => r.y), own = rows.map((r) => r.block), pair = rows.map((r, k) => rows[k - (k % 2)].block);
  const res = {};
  for (const arm of ["POSITION", "RIVALS", "BOTH"]) {
    const X = rows.map((r) => ARMS[arm](r.f));
    res[arm] = { ownBlocks: +aucOf(cvScores(X, y, own), y).toFixed(4), pairBlocks: +aucOf(cvScores(X, y, pair), y).toFixed(4) };
  }
  out[stem] = { pairs: rows.length / 2, ...res };
}
console.log(JSON.stringify(out, null, 1));
