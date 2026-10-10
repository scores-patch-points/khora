// confirm-relatedness-romance-set/post-e4.mjs — POST-HOC EXPLORATORY analysis E4 (not part of the registered verdict): donor-set HOMOGENEITY versus Romance relatedness.
//   NAME_COMPANY_PAIRBLOCK=1 node post-e4.mjs <A|B|C>
//
// ═══ PRE-REGISTRATION OF A POST-HOC ANALYSIS (written AFTER the registered cells, E2 and E3 were run and read) ═════════════════════════════════════════════════════════════════════
// DISCLOSURE. Seen before writing: in E3 a single Romance donor gives mean AUC 0.62 on the Romance targets and a single Germanic donor 0.58-0.61, yet the registered TRIPLE of Romance donors gives 0.68
//   while the registered different-genus triple (a random mix of non-Romance donors) gives 0.59. So the registered +0.09 may partly be a homogeneity effect (three donors sharing one profile reinforce it,
//   three unrelated donors average out) rather than a Romance-specific match. The rule's equalised control (random cross-genus triple) cannot separate the two.
// QUESTION. Fix the target (cat fra ita por spa, real, FIRST-BOTH, fresh windows of set X) and compare homogeneous triples: Romance (a, as registered, other Romance languages), Germanic (afr dan deu eng nld nob swe),
//   Slavic (bul ces hrv pol rus slk slv srp ukr) and the heterogeneous non-Romance triple (e). Reciprocal check on Germanic targets (eng deu nld dan nob swe afr where eligible): Germanic triple (other Germanic
//   languages) versus Romance triple versus heterogeneous non-Romance-non-Germanic triple. K=3 x 100 pairs, 20 draws.
// BLIND PREDICTIONS. On the Romance targets: Germanic triple 0.62 (0.58-0.66), Slavic triple 0.57 (0.54-0.61), so a - Germanic >= +0.04 in >= 10 of 14 target-sets (a Romance-specific part exists) and
//   Germanic - e = +0.03 (a homogeneity part exists). Reciprocal: Germanic triple on Germanic targets beats the Romance triple on them by >= +0.03 in most targets.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { round, mean, headerHash, pairSample, fitProbe, aucOn, shuffleIn } from "../family-vs-relatedness/lib.mjs";
import { genus, STEMS } from "../family-vs-relatedness/groups.mjs";
import { CAP_TRAIN } from "../family-vs-relatedness/analysis.mjs";
import { HERE } from "./lib-fresh.mjs";
import { loadRoster, rs, PRIMARY, eligibleTarget, frozenCheck } from "./confirm-lib.mjs";

const SELF = fileURLToPath(import.meta.url), set = process.argv[2], tag = `E4-${set}`;
if (!["A", "B", "C"].includes(set)) throw new Error("usage: node post-e4.mjs <A|B|C>");
const real = loadRoster(set, "FIRST"), G = (g) => STEMS.filter((s) => genus(s) === g), ROM = G("Romance"), GER = G("Germanic"), SLA = G("Slavic");
const triple = (pool, t, name, R, draws = 20) => {
  const P = pool.filter((x) => x !== t && real[x] && real[x].pairs >= 100); if (P.length < 3) return null; const v = [];
  for (let d = 0; d < draws; d++) { const rnd = rs(tag, name, t, d), pick = shuffleIn(P.slice(), rnd).slice(0, 3); const a = aucOn(fitProbe(pick.map((x) => ({ L: real[x], idx: pairSample(real[x], Math.min(CAP_TRAIN, real[x].pairs), rnd) })), "BOTH"), R, "BOTH"); if (a != null) v.push(a); }
  return round(mean(v));
};
const out = { cell: tag, set, headerSha256: headerHash(SELF), scoperHashes: frozenCheck(), romance: {}, germanic: {} };
for (const t of PRIMARY) {
  const R = real[t]; if (!eligibleTarget(R)) continue;
  const nonRom = STEMS.filter((s) => genus(s) !== "Romance"), rec = { pairs: R.pairs, a: triple(ROM, t, "a", R), ger: triple(GER, t, "ger", R), sla: triple(SLA, t, "sla", R), e: triple(nonRom, t, "e", R) };
  out.romance[t] = rec; console.error(`${tag} ${t}: a ${rec.a} ger ${rec.ger} sla ${rec.sla} e ${rec.e}`);
}
for (const t of GER) {
  const R = real[t]; if (!eligibleTarget(R)) continue;
  const other = STEMS.filter((s) => genus(s) !== "Romance" && genus(s) !== "Germanic"), rec = { pairs: R.pairs, ger: triple(GER, t, "ger", R), rom: triple(ROM, t, "rom", R), e: triple(other, t, "e2", R) };
  out.germanic[t] = rec; console.error(`${tag} GERMANIC ${t}: ger ${rec.ger} rom ${rec.rom} e ${rec.e}`);
}
const m = (o, f) => { const v = Object.values(o).map(f).filter((x) => x != null); return v.length ? round(mean(v)) : null; };
out.means = { romance: { a: m(out.romance, (r) => r.a), ger: m(out.romance, (r) => r.ger), sla: m(out.romance, (r) => r.sla), e: m(out.romance, (r) => r.e), aMinusGer: m(out.romance, (r) => r.a - r.ger), gerMinusE: m(out.romance, (r) => r.ger - r.e), n: Object.keys(out.romance).length },
  germanic: { ger: m(out.germanic, (r) => r.ger), rom: m(out.germanic, (r) => r.rom), e: m(out.germanic, (r) => r.e), gerMinusRom: m(out.germanic, (r) => r.ger - r.rom), gerMinusE: m(out.germanic, (r) => r.ger - r.e), n: Object.keys(out.germanic).length } };
fs.writeFileSync(path.join(HERE, "results", `post-${tag}.json`), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cell: tag, means: out.means }));
