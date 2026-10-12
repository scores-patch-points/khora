// scene/read-english-kinds.mjs — Kind induction over ONE well-bound translation.
//
//   node native/eval/the-fold/scene/read-english-kinds.mjs
//
// The falsification record's two requirements for Kind: (a) a COHERENT population
// (one language, not 32), (b) features that CARRY MEANING (the reader's own act
// labels + who keeps company with whom), never function-word punctuation. The
// population is the English UDHR reading: 70 referents, 23 bound relations.

import fs from "node:fs";
import { parseWeftJsonl } from "../../../the-fold/eot-weft.mjs";
import { kindEvidence, createKindInductionIndex, kindDiagnostics } from "../../../kernel/kind-induction.js";

const weft = parseWeftJsonl(fs.readFileSync("native/eval/the-fold/scene/corpus.eot.jsonl", "utf8"));
const eng = weft.find((p) => p.address.includes("udhr-eng"));
if (!eng) throw new Error("no English pass in the weft");

const witnesses = (rel) => [`${eng.address}#${rel.at ?? 0}`];
const evidence = [];
let i = 0;
for (const rel of eng.relations ?? []) {
  const [a, b] = rel.participants ?? [];
  if (!a?.ref || !b?.ref || !rel.relation) continue;
  for (const [self, other] of [[a, b], [b, a]]) {
    const seq = Number.isFinite(rel.at) ? rel.at : i;
    evidence.push(kindEvidence({ id: `ev:${i++}`, entityRef: self.ref, featureKey: "company", featureValue: other.surface, sequencePosition: seq, witness: witnesses(rel)[0], witnessRefs: witnesses(rel) }));
    evidence.push(kindEvidence({ id: `ev:${i++}`, entityRef: self.ref, featureKey: "act", featureValue: rel.relation, sequencePosition: seq, witness: witnesses(rel)[0], witnessRefs: witnesses(rel) }));
  }
}

const entities = new Set(evidence.map((e) => e.entityRef));
console.log(`population: ${entities.size} referents · ${evidence.length} features · ${(eng.relations ?? []).length} relations`);

const index = createKindInductionIndex(evidence, {});
const diag = kindDiagnostics(index);
console.log(`\npopulation kind basins: ${diag.populationKinds?.basins ?? "?"} · validated(mechanical): ${diag.populationKinds?.validated ?? "?"} · clusters: ${diag.populationKinds?.clusters ?? "?"}`);
console.log(`\ncandidates (the standing gate is IN the data path — released:false unless a consequence is earned):`);
for (const c of diag.populationKindCandidates ?? []) {
  console.log(`  ${c.kindKey}`);
  console.log(`     members=${c.memberCount}  cohesion=${c.cohesion?.toFixed?.(3) ?? c.cohesion}  cohesionPassed=${c.cohesionPassed}  bindingEnergy=${c.bindingEnergy?.toFixed?.(3) ?? c.bindingEnergy}  released=${c.released}  standing=${c.standing}`);
  console.log(`     distinguishing: ${(c.distinguishingParameters ?? []).slice(0, 4).map((p) => `${p.featureKey}=${p.featureValue}`).join(" · ")}`);
}

// what the members ARE — surface names for the basins
const surfaceOf = new Map();
for (const c of eng.cast ?? []) surfaceOf.set(c.ref, c.surface);
console.log(`\nmember surfaces (first basins):`);
for (const c of (diag.populationKindCandidates ?? []).slice(0, 3)) {
  console.log(`  ${c.kindKey.slice(0, 40)}…: ${(c.memberRefs ?? []).map((r) => surfaceOf.get(r) ?? r.split("::").pop()).join(", ")}`);
}
