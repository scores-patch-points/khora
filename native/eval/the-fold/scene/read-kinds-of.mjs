// scene/read-kinds-of.mjs <eot.json> — Kind induction over one reading's COMPANY.
//
//   node native/eval/the-fold/scene/read-kinds-of.mjs <path-to-eot.json> [--acts]
//
// The falsification record's requirements for Kind: a COHERENT population (one
// reading, one language) and features that CARRY MEANING. THE-KINDS-ON-KINDS
// names the seam: company — who keeps company with whom — for both-bound ends.
// Default is company-only (the seam); --acts adds the predicate labels.

import fs from "node:fs";
import { kindEvidence, createKindInductionIndex, kindDiagnostics } from "../../../kernel/kind-induction.js";

const file = process.argv[2];
if (!file) { console.error("usage: node read-kinds-of.mjs <eot.json> [--acts]"); process.exit(1); }
const WITH_ACTS = process.argv.includes("--acts");
const e = JSON.parse(fs.readFileSync(file, "utf8"));
const name = new Map((e.referents ?? []).map((r) => [r.hash ?? r.ref, r.name ?? r.surface]));

const evidence = [];
let i = 0;
const add = (entityRef, featureKey, featureValue, witness, sequencePosition) => evidence.push(
  kindEvidence({ id: `ev:${i++}`, entityRef, featureKey, featureValue, sequencePosition, witness, witnessRefs: witness ? [witness] : [] }),
);
for (const [ei, edge] of (e.edges ?? []).entries()) {
  const s = edge.subject, o = edge.object;
  if (!s || !o) continue;
  const sn = name.get(s) ?? s, on = name.get(o) ?? o;
  const seq = Number.isFinite(edge.at) ? edge.at : ei;
  const w = edge.span ? `${e.source}#${Array.isArray(edge.span) ? edge.span[0] : edge.span}` : `edge:${ei}`;
  add(s, "company", on, w, seq); add(o, "company", sn, w, seq);
  if (WITH_ACTS) { add(s, "act", edge.action, w, seq); add(o, "act", edge.action, w, seq); }
}
const entities = new Set(evidence.map((x) => x.entityRef));
console.log(`${file.split("/").pop()} — ${entities.size} referents · ${evidence.length} features · ${(e.edges ?? []).length} edges ${WITH_ACTS ? "(company+acts)" : "(company only)"}`);

const index = createKindInductionIndex(evidence, {});
const diag = kindDiagnostics(index);
const pk = diag.populationKinds ?? {};
console.log(`  basins ${pk.basins ?? "?"} · validated(mechanical null) ${pk.validated ?? "?"} · clusters ${pk.clusters ?? "?"}`);
console.log(`  candidates (standing gate: released:false unless a consequence is earned):`);
for (const c of (diag.populationKindCandidates ?? []).slice(0, 8)) {
  const members = (c.memberRefs ?? []).map((r) => name.get(r) ?? r).slice(0, 12).join(", ");
  console.log(`   ${c.kindKey.slice(0, 46)}… members=${c.memberCount} cohesionPassed=${c.cohesionPassed} released=${c.released}`);
  console.log(`      ${members}`);
  console.log(`      distinguishing: ${(c.distinguishingParameters ?? []).slice(0, 4).map((p) => `${p.featureKey}=${p.featureValue}`).join(" · ")}`);
}
