// confirm-relatedness-romance-set/post-e2.mjs — POST-HOC EXPLORATORY analysis E2 (not part of the registered verdict). What does the donor-shuffled control mean?
//   NAME_COMPANY_PAIRBLOCK=1 node post-e2.mjs <A|B|C>
//
// ═══ PRE-REGISTRATION OF A POST-HOC ANALYSIS (written AFTER the registered cells of confirm.mjs were run and summarised) ═══════════════════════════════════════════════════════════
// DISCLOSURE. Seen before writing this: all registered cell results (results/cell-*.json), in particular that the donor-shuffled control (a probe trained on within-sentence-SHUFFLED donor windows, scored
//   on the REAL target) was 0.50 in set A but 0.558 (B) and 0.574 (C) for the primary five, above the registered cap of 0.55, while the rule's own controls (position 0.50, shuffled-target <= 0.535, sham 0.50)
//   were in band; and D cells (dev donors) stayed at 0.540-0.548. Hence this analysis is a diagnosis, not a test of the rule, and it changes no registered verdict.
// QUESTION. A within-sentence shuffle keeps the sentence BAG (which words co-occur in one sentence) and destroys local order. (1) How much of the profile's AUC is order-free sentence-bag company? (2) Does the
//   Romance bonus (same-genus donors minus different-genus donors) survive when the donors' order is destroyed? (3) Which single donor language carries the order-free transfer (ita is absent from set A)?
// DATA. P form, FIRST-BOTH, fresh windows of set X (A|B|C), primary targets cat fra ita por spa (target real; ita thin in A). Probe, K=3 donors x 100 pairs as the rule; 20 draws (single donors: 10 draws, K=1).
//   Cells reported per target: RR = real donors -> real target (rule), RS = real donors -> shuffled target, SR = shuffled donors -> real target, SS = shuffled donors -> shuffled target; pools a (Romance) and e
//   (non-Romance, all eligible); single-donor matrix over the Romance donors, real versus shuffled. Plus SR-a without ita (sets B, C).
// BLIND PREDICTIONS. SR-a 0.50 in A and 0.55-0.58 in B and C (as seen); SS-a >= SR-a (bag signal in-distribution) at 0.55-0.60; the order-free bonus SR-a minus SR-e is +0.015 (0.00 to +0.04), i.e. the
//   Romance bonus mostly needs order (real RR bonus is +0.09); single-donor SR is carried by ita (AUC >= 0.55) and near 0.50 for the others, so SR-a without ita drops to <= 0.53.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { round, mean, headerHash, pairSample, fitProbe, aucOn, shuffleIn } from "../family-vs-relatedness/lib.mjs";
import { genus, STEMS } from "../family-vs-relatedness/groups.mjs";
import { CAP_TRAIN } from "../family-vs-relatedness/analysis.mjs";
import { loadFresh, HERE } from "./lib-fresh.mjs";
import { loadRoster, rs, PRIMARY, eligibleTarget, frozenCheck } from "./confirm-lib.mjs";

const SELF = fileURLToPath(import.meta.url), set = process.argv[2], tag = `E2-${set}`;
if (!["A", "B", "C"].includes(set)) throw new Error("usage: node post-e2.mjs <A|B|C>");
const real = loadRoster(set, "FIRST"), shuf = loadRoster(set, "FIRST", true), ROM = STEMS.filter((s) => genus(s) === "Romance"), NON = STEMS.filter((s) => genus(s) !== "Romance");
/** mean AUC of a probe fitted on K donors (100 pairs each) drawn from `pool` of `donors` (a roster), scored on targetL; null if the pool is smaller than K. */
function xfer(donors, pool, targetL, lang, K, draws, ...key) {
  const P = pool.filter((x) => x !== lang && donors[x] && donors[x].pairs >= 100); if (P.length < K) return null; const out = [];
  for (let d = 0; d < draws; d++) { const rnd = rs(tag, ...key, lang, d), pick = shuffleIn(P.slice(), rnd).slice(0, K); const f = fitProbe(pick.map((x) => ({ L: donors[x], idx: pairSample(donors[x], Math.min(CAP_TRAIN, donors[x].pairs), rnd) })), "BOTH"); const a = aucOn(f, targetL, "BOTH"); if (a != null) out.push(a); }
  return out.length ? round(mean(out)) : null;
}
const out = { cell: tag, set, headerSha256: headerHash(SELF), scoperHashes: frozenCheck(), targets: {} };
for (const t of PRIMARY) {
  const R = real[t], S = loadFresh(set, t, "FIRST", true); if (!eligibleTarget(R)) { out.targets[t] = { thin: R ? R.pairs : 0 }; continue; }
  const rec = { pairs: R.pairs };
  for (const [name, donors, tg] of [["RR", real, R], ["RS", real, S], ["SR", shuf, R], ["SS", shuf, S]]) rec[name] = { a: xfer(donors, ROM, tg, t, 3, 20, name, "a"), e: xfer(donors, NON, tg, t, 3, 20, name, "e") };
  rec.SRnoIta = xfer(shuf, ROM.filter((x) => x !== "ita"), R, t, 3, 20, "SRnoIta", "a"); rec.RRnoIta = xfer(real, ROM.filter((x) => x !== "ita"), R, t, 3, 20, "RRnoIta", "a");
  rec.single = {}; for (const d of ROM) if (d !== t) rec.single[d] = { real: xfer(real, [d], R, t, 1, 10, "s-real", d), shuf: xfer(shuf, [d], R, t, 1, 10, "s-shuf", d) };
  out.targets[t] = rec; console.error(`${tag} ${t}: RR a ${rec.RR.a} e ${rec.RR.e} | SR a ${rec.SR.a} e ${rec.SR.e} | SS a ${rec.SS.a} | SRnoIta ${rec.SRnoIta}`);
}
const ok = Object.values(out.targets).filter((r) => r.RR), m = (f) => { const v = ok.map(f).filter((x) => x != null); return v.length ? round(mean(v)) : null; };
out.means = { RRa: m((r) => r.RR.a), RRe: m((r) => r.RR.e), RSa: m((r) => r.RS.a), SRa: m((r) => r.SR.a), SRe: m((r) => r.SR.e), SSa: m((r) => r.SS.a), SSe: m((r) => r.SS.e), SRnoIta: m((r) => r.SRnoIta), RRnoIta: m((r) => r.RRnoIta), orderFreeBonus: m((r) => (r.SR.a != null && r.SR.e != null ? r.SR.a - r.SR.e : null)), realBonus: m((r) => (r.RR.a != null && r.RR.e != null ? r.RR.a - r.RR.e : null)), n: ok.length };
fs.writeFileSync(path.join(HERE, "results", `post-${tag}.json`), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cell: tag, means: out.means }));
