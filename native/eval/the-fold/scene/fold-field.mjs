// scene/fold-field.mjs — FOLD THE CORPUS EOT INTO THE HYPERLEXICON FIELD, and
// measure what generation is possible MODELESSLY.  (2026-10-11)
//
//   node eval/the-fold/scene/fold-field.mjs
//
// The weft (corpus.eot.jsonl) is folded, through its addressed attestations,
// into the hyperlexicon field (janus's ruliad — the ONLY home the fold has).
// The field is a MODEL-FREE prior: every row is `candidate`, giver `the weft`,
// witnesses = the weft addresses (re-expandable by `reopen`). Composition
// chains are then evaluated against the field with ZERO model tokens. This
// driver reports the measured field and the measured generation — nothing is
// asserted.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fieldFromWeft, licenseRows } from "../../../../../janus/native/organs/ruliad.js";
import { parseWeftJsonl, foldOf, holographAll, candidateJoins } from "../../../the-fold/eot-weft.mjs";
import { evaluateRelationCompositions } from "../../../kernel/relation-composition.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEFT_PATH = path.join(HERE, "corpus.eot.jsonl");

const weft = parseWeftJsonl(fs.readFileSync(WEFT_PATH, "utf8"));

// ── 1. The field (the hyperlexicon instance over THIS corpus) ─────────────
const field = fieldFromWeft(weft);
const rows = Object.values(field.hyperlexicon.composition)
  .map((r) => ({
    left: r.left, right: r.right, standing: r.standing, giver: r.giver,
    witnesses: r.witnesses.length, labels: r.meta?.labels ?? {},
  }))
  .sort((a, b) => b.witnesses - a.witnesses);

// ── 2. Composition generation, model-free ────────────────────────────────
const entries = foldOf(weft).graphEntries.map((e) => ({
  ...e,
  participants: e.participants.map((p) => ({ ...p, standing: "referent", role: null })),
}));
const comp = evaluateRelationCompositions(entries, field.hyperlexicon);

// ── 3. The cross-source identity layer (what must be adjudicated, not merged)
const cloth = holographAll(weft);
const cands = candidateJoins(weft);

console.log(`weft: ${weft.length} passes`);
console.log("");
console.log("── THE HYPERLEXICON FIELD (folded, model-free) ──");
console.log(`  attestations folded: ${field.stats.attestations}`);
console.log(`  composition rows:    ${field.stats.pairs}`);
console.log(`  distinct labels:     ${field.stats.distinctLabels}`);
console.log(`  distinct witnesses:  ${field.stats.distinctWitnesses}`);
console.log(`  standing:            ${(rows[0] ? rows[0].standing : "-")} (giver: ${rows[0] ? rows[0].giver : "-"}) — the honest extracted tier`);
console.log(`  top rows:`);
for (const r of rows.slice(0, 5)) console.log(`    ${r.left} —${Object.keys(r.labels).join("/")}→ ${r.right}  (${r.witnesses} witness)`);
console.log("");
console.log(`── MODEL-FREE COMPOSITION (0 model tokens) ──`);
console.log(`  chains evaluated:  ${comp.withheld.length + comp.licensed.length} (${comp.licensed.length} licensed · ${comp.withheld.length} withheld)`);
if (comp.licensed.length) console.log(`  licensed sample:    ${JSON.stringify(comp.licensed[0], null, 1).slice(0, 300)}`);
else console.log(`  licensed:          none — every chain withheld: “${(comp.withheld[0]?.reason ?? "").slice(0, 80)}”`);
console.log(`  byLabel: ${JSON.stringify(field.stats.byLabel).slice(0, 200)}`);
console.log("");
console.log(`── CROSS-SOURCE IDENTITY (the next adjudication) ──`);
console.log(`  cloth referents (points, no spelling merge): ${cloth.referents.length}`);
console.log(`  candidate joins nominated, awaiting the meet:  ${cands.length}`);

const licensed = licenseRows(field);
console.log("");
console.log(`── THE WALL (every row's license) ──`);
console.log(`  given:  ${licensed.filter((r) => r.license.licensed).length} · refused: ${licensed.filter((r) => !r.license.licensed).length}`);
console.log(`  sample reason: ${(licensed[0]?.license.why ?? "").slice(0, 110)}`);