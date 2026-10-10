// laws/tests/phys/_t_worlds.mjs — inline synthetic worlds for the phys test. Deterministic (seeded); lexicon and Zipf machinery from loaders/_planted-core.mjs.
import { rngOf, seedOf } from "../../../lib/pocket.mjs";
import { lexicon, zipfW, cdfOf, drawCdf, makeLen } from "../../../loaders/_planted-core.mjs";
export { iidWorld, topicalWorld } from "../freq/_t_worlds.mjs";
const LEX = lexicon("A"), ZC = cdfOf(zipfW(5000, 1.0)), D1 = makeLen("D1");
/** iid Zipf tokens, every unit exactly L tokens long, documents of ~1000 tokens: the pure unit-length control (no structure of any kind) */
export function fixedLenWorld(id, ndocs, L, seedTag = "fixed") {
  const units = [], docOf = [];
  for (let d = 0; d < ndocs; d++) { const rnd = rngOf(seedOf("phys-test-world", seedTag, id, d)); let t = 0; while (t < 1000) { units.push(Array.from({ length: L }, () => LEX[drawCdf(ZC, rnd())])); docOf.push(d); t += L; } }
  return { id, which: "discover", units, docOf };
}
/** iid world with a different seed tag (replicates for the calibration of the null: law-free by construction) */
export function iidReplicate(id, ndocs, rep) {
  const units = [], docOf = [];
  for (let d = 0; d < ndocs; d++) { const rnd = rngOf(seedOf("phys-test-world", "iid-rep", rep, d)); let t = 0; while (t < 1000) { const L = D1(rnd); units.push(Array.from({ length: L }, () => LEX[drawCdf(ZC, rnd())])); docOf.push(d); t += L; } }
  return { id, which: "discover", units, docOf };
}
