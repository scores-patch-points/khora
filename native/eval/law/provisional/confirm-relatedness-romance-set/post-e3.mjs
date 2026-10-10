// confirm-relatedness-romance-set/post-e3.mjs — POST-HOC EXPLORATORY analysis E3 (not part of the registered verdict): is the Romance bonus larger than donor-set luck, and who are the best donors?
//   NAME_COMPANY_PAIRBLOCK=1 node post-e3.mjs <A|B|C>
//
// ═══ PRE-REGISTRATION OF A POST-HOC ANALYSIS (written AFTER the registered cells and E2 were run and read) ═══════════════════════════════════════════════════════════════════════
// DISCLOSURE. Seen before writing: all registered cell results and E2. In the registered cells the different-genus triple had a large draw-to-draw sd (0.03-0.07) because triples of non-Romance donors differ
//   widely, so the bonus relative to a random non-Romance triple needs an explicit empirical p. Also seen: for some targets the same-word-order other-genus set b (0.59-0.62) sits between e and a.
// QUESTIONS. (1) Genus-label permutation null: for each primary target draw 200 random triples of NON-Romance donors (100 pairs each); empirical p = fraction of those triples whose AUC >= the mean AUC of
//   20 Romance triples (the registered set a, recomputed here with the same seeds family). (2) Single-donor ranking: AUC of a probe fitted on ONE donor language (100 pairs, 4 draws) on each primary
//   target, all eligible donors of the set; report the rank of the Romance donors and the best non-Romance donors.
// DATA. P form, FIRST-BOTH, fresh windows of the given set, primary targets cat fra ita por spa (ita thin in A), real target, real donors. Probe as the rule.
// BLIND PREDICTIONS. (1) empirical p <= 0.05 for >= 12 of the 14 target-sets (the observed bonus is about +2 sd of the triple distribution, so a few target-sets will sit at p 0.03-0.10). (2) For every target
//   the median rank of the Romance single donors is within the top 8 of ~40, and the best non-Romance single donors are SVO Latin-script European languages (eng nld deu dan swe nob ell pol ces slk), not
//   SOV or non-Latin-script ones; at least one non-Romance donor out-transfers at least one Romance donor for at least 2 of the 5 targets (ron/glg are weak Romance donors).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { round, mean, headerHash, pairSample, fitProbe, aucOn, shuffleIn } from "../family-vs-relatedness/lib.mjs";
import { genus, STEMS } from "../family-vs-relatedness/groups.mjs";
import { CAP_TRAIN } from "../family-vs-relatedness/analysis.mjs";
import { HERE } from "./lib-fresh.mjs";
import { loadRoster, rs, PRIMARY, eligibleTarget, frozenCheck } from "./confirm-lib.mjs";

const SELF = fileURLToPath(import.meta.url), set = process.argv[2], tag = `E3-${set}`;
if (!["A", "B", "C"].includes(set)) throw new Error("usage: node post-e3.mjs <A|B|C>");
const real = loadRoster(set, "FIRST"), ROM = STEMS.filter((s) => genus(s) === "Romance"), NON = STEMS.filter((s) => genus(s) !== "Romance");
const auc1 = (picks, target, rnd) => aucOn(fitProbe(picks.map((x) => ({ L: real[x], idx: pairSample(real[x], Math.min(CAP_TRAIN, real[x].pairs), rnd) })), "BOTH"), target, "BOTH");
const elig = (pool, t) => pool.filter((x) => x !== t && real[x] && real[x].pairs >= 100);
const out = { cell: tag, set, headerSha256: headerHash(SELF), scoperHashes: frozenCheck(), targets: {} };
for (const t of PRIMARY) {
  const R = real[t]; if (!eligibleTarget(R)) { out.targets[t] = { thin: R ? R.pairs : 0 }; continue; }
  const rom = elig(ROM, t), non = elig(NON, t), a = [], e = [], single = {};
  for (let d = 0; d < 20; d++) { const rnd = rs(tag, "a", t, d), v = auc1(shuffleIn(rom.slice(), rnd).slice(0, 3), R, rnd); if (v != null) a.push(v); }
  for (let d = 0; d < 200; d++) { const rnd = rs(tag, "e", t, d), v = auc1(shuffleIn(non.slice(), rnd).slice(0, 3), R, rnd); if (v != null) e.push(v); }
  for (const x of [...rom, ...non]) { const v = []; for (let d = 0; d < 4; d++) { const rnd = rs(tag, "s", t, x, d), z = auc1([x], R, rnd); if (z != null) v.push(z); } single[x] = round(mean(v)); }
  const am = mean(a), p = (e.filter((v) => v >= am).length + 1) / (e.length + 1), rank = Object.entries(single).sort((u, w) => w[1] - u[1]).map(([k]) => k);
  out.targets[t] = { pairs: R.pairs, aMean: round(am), eMean: round(mean(e)), eSd: round(Math.sqrt(mean(e.map((v) => (v - mean(e)) ** 2)))), eMax: round(Math.max(...e)), eQ95: round(e.slice().sort((u, w) => u - w)[Math.floor(0.95 * e.length)]), empiricalP: round(p, 4), singleRank: rank.map((k) => `${k}:${single[k]}`), romanceRanks: rom.map((k) => rank.indexOf(k) + 1), bestNonRomance: rank.filter((k) => !ROM.includes(k)).slice(0, 8) };
  console.error(`${tag} ${t}: a ${out.targets[t].aMean} e ${out.targets[t].eMean}+-${out.targets[t].eSd} max ${out.targets[t].eMax} p ${out.targets[t].empiricalP} romRanks ${out.targets[t].romanceRanks} bestNon ${out.targets[t].bestNonRomance.slice(0, 5)}`);
}
fs.writeFileSync(path.join(HERE, "results", `post-${tag}.json`), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cell: tag, p: Object.fromEntries(Object.entries(out.targets).map(([k, v]) => [k, v.empiricalP])) }));
