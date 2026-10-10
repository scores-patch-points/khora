// sanity.mjs: pipeline-equality check of lib-attack.pairsX against the confirmer's pairsOf numbers (not a test; no outcome). NAME_COMPANY_PAIRBLOCK=1 node sanity.mjs
import { win1, win2, rngFor, seedFor, pairsX, cvArm, A, rdj, CONF, round } from "./lib-attack.mjs";
import path from "node:path";
const R1 = [...rdj(path.join(CONF, "results/collect.new.json")).rows, ...rdj(path.join(CONF, "results/collect.old.json")).rows], W2 = rdj(path.join(CONF, "results/collect.w2.json")).rows;
const out = [];
for (const [s, wk] of [["afr", 1], ["dan", 1], ["glg", 1], ["slv", 2], ["spa", 2]]) {
  const w = wk === 1 ? win1(s) : win2(s), ref = (wk === 1 ? R1 : W2).find((x) => x.name === s), t = wk === 1 ? "" : "-w2";
  const pr = pairsX(w.sents, w.upos, {}, rngFor(seedFor("confirm-R1", s, "pairs" + t)));
  const a = round(cvArm(pr.rows, A.LEFT)), p = round(cvArm(pr.rows, A.POSITION));
  out.push({ s, wk, pairs: pr.pairs, refPairs: ref.pairs, auc: a, refAuc: ref.auc, pos: p, refPos: ref.position, ok: pr.pairs === ref.pairs && a === ref.auc && p === ref.position });
}
console.log(JSON.stringify(out)); process.exit(out.every((x) => x.ok) ? 0 : 3);
