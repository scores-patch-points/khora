// legal-moves.mjs — THE LEGAL MOVES OF THINKING, two walls.
// WALL 1 (khora/the-fold/grid.js): the composition law — a well-formed act is
//   `<verb> at <terrain> from <stance>`, with its three syntactic laws.
// WALL 2 (janus nomos/ruliad + kernel/hyperlexicon licenseStanding): a move
//   must be GIVEN (named giver, charter-bound or chemistry) or EXTRACTED
//   (witnesses = addresses, standing candidate). A REVEALED move — no giver, no
//   witnesses — licences nothing: "generation from no-where is refused."
// A move is LEGAL only if it clears BOTH. Learning from Janus: my typed
// registers were revealed; they refuse.
import { makeGrid, VERBS } from "/Users/mlacy/Documents/3.0/khora/native/the-fold/grid.js";
import * as cube from "/Users/mlacy/Documents/3.0/khora/native/kernel/cube.js";
import { licenseStanding } from "/Users/mlacy/Documents/3.0/khora/native/kernel/hyperlexicon.js";

const log = { events: [], append(e) { this.events.push(e); return e; }, get: () => ({ events: log.events }) };
const grid = makeGrid({ operators: cube, taskLog: log });

// ── THINKING MOVES, each with its STANDING — this is the whole point. ──
const moves = [
  { line: "distinguish the-man at Entity from extraction", standing: "extracted", witnesses: [34941, 35343], why: "the read observed it (addresses)" },
  { line: "relate the-man at Link from relate", standing: "extracted", witnesses: [35343, 35443], why: "the bind, at its addresses" },
  { line: "evaluate the-man at Lens from relate", standing: "given", binding: null, chemistry: true, why: "the cube's own DEF/EVA chemistry (a derivation rule)" },
  { line: "synthesize the-novel at Paradigm from closure", standing: "extracted", witnesses: [34941, 42000], why: "the DMD mode, witnessed by the chapters that load it" },
  // THE REVEALED ONES — my hand-typed registers, no giver, no witnesses:
  { line: "define the-marriage-question at Paradigm from generate", standing: "revealed", why: "I typed 'the chapter is about the marriage-question' — no giver, no address" },
  { line: "evaluate the-household at Lens from relate", standing: "revealed", why: "I typed 'the household seen from its threshold' — from no-where" },
];

console.log("THE LEGAL MOVES OF THINKING — two walls, well-formed AND licensed:\n");
for (const m of moves) {
  const g = grid.parseAct(m.line);                                    // WALL 1 — form
  const afford = { standing: m.standing === "extracted" ? "candidate" : (m.standing === "given" ? "given" : "revealed"),
                   binding: m.binding ?? null, witnesses: m.witnesses ?? [], meta: m.chemistry ? { chemistry: true } : {} };
  // WALL 2 — janus: given must be charter-bound or chemistry; extracted carries witnesses; revealed refuses.
  let lic;
  if (afford.standing === "given") lic = licenseStanding(afford, null);
  else if (afford.standing === "candidate") lic = { licensed: afford.witnesses.length > 0, standing: "candidate", why: afford.witnesses.length ? `candidate with ${afford.witnesses.length} witness(es) — ${afford.witnesses.join(",")}` : "candidate with NO witnesses — from no-where" };
  else lic = { licensed: false, standing: "revealed", why: "a revealed move — no giver, no witnesses; generation from no-where is refused" };
  const legal = g.ok && lic.licensed;
  console.log(`   ${legal ? "LEGAL   " : "REFUSED "} ${m.line}`);
  console.log(`            form: ${g.ok ? "ok" : "REFUSED " + (g.refusal?.detail ?? g.refusal?.type)}`);
  console.log(`            standing: ${lic.standing} — ${lic.why}${m.why ? "  [" + m.why + "]" : ""}\n`);
}
console.log("THE LAW (learned from Janus):");
console.log("   a move is legal iff WELL-FORMED (the composition law) AND LICENSED (given | extracted-with-witnesses).");
console.log("   REVEALED — a bare 'this means X' with no giver and no address — licences nothing. Generation from no-where is refused.");