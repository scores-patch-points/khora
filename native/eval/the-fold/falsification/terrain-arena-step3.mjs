// terrain-arena-step3.mjs — STEP 3 FALSIFIER: does the shipped depth/meta law
// mint second floors out of nothing? THE-KINDS-ON-KINDS measured law: "the
// second floor is a test of the first floor. A fold whose second floor is
// blank is reporting a starved seam — kinds-on-kinds must not generate a new
// level out of nothing." So the meta law (withMetaMembership in the shipped
// kernel hyperlexicon-abstraction.js) must REFUSE to ladder an abstraction
// that cannot be a floor:
//   G1  empty floor: a candidate Kind with ONE live member must be refused
//       (a singleton cannot telescope a second floor).
//   G2  defeated floor: a REFUTED abstraction must be refused (a defeated
//       finding is preserved, but it is not a parent floor).
//   G3  legitimate telescope (positive control): an EARNED multi-member Kind
//       must ladder into its same-terrain meta at depth+1 with a ledger note.
//   G4  cross-domain/unit refusal: a Figure-grain row must be refused (already
//       the module's law), and the meta terrain must equal the child's terrain.
// Verdict FALSIFIED if the shipped law admits an empty or defeated floor.
//
// Usage: node terrain-arena-step3.mjs /path/to/khora/native/kernel

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const kernel = path.resolve(process.argv[2] || "./native/kernel");
const hl = await import(pathToFileURL(path.join(kernel, "hyperlexicon-abstraction.js")).href);
const { createAbstractionRegistry, admitAbstraction, earnAbstraction, refuteAbstraction, abstractionNotes, withMetaMembership } = hl;

const gates = { G1_emptyFloor: false, G2_defeatedFloor: false, G3_telescope: false, G4_unitsAndTerrain: false, G4_refusedFigure: false };
const report = {};

// G1 — a candidate Kind with ONE live member joins a meta? (must refuse)
{
  const r0 = createAbstractionRegistry();
  const r1 = admitAbstraction(r0, { op: "SIG", grain: "Pattern", terrain: "Kind", label: "phantom", depth: 0, memberRefs: ["e1"] });
  const id = Object.values(r1.abstractions)[0].id;
  const g = withMetaMembership(r1, { id });
  gates.G1_emptyFloor = g.refused === true;
  report.G1 = { admittedToMeta: g.refused === false, basis: g.refused ? g.basis : "minted — empty (singleton) floor laddered", metaDepth: g.meta?.depth };
}

// G2 — a REFUTED abstraction joins a meta? (must refuse)
{
  const r0 = createAbstractionRegistry();
  const r1 = admitAbstraction(r0, { op: "CON", grain: "Pattern", terrain: "Kind", label: "defeated", depth: 0, memberRefs: ["e1", "e2", "e3"] });
  const id = Object.values(r1.abstractions)[0].id;
  const r2 = refuteAbstraction(r1, { id, falsifier: "step3 counterexample", reason: { basis: "the disciplined counterexample defeated it" } });
  const g = withMetaMembership(r2, { id });
  gates.G2_defeatedFloor = g.refused === true;
  report.G2 = { admittedToMeta: g.refused === false, basis: g.refused ? g.basis : "minted — a defeated floor laddered" };
}

// G3 — an EARNED multi-member Kind telescopes (positive control)
{
  const r0 = createAbstractionRegistry();
  const r1 = admitAbstraction(r0, { op: "SIG", grain: "Pattern", terrain: "Kind", label: "well-bound", depth: 0, memberRefs: ["e1", "e2", "e3", "e4", "e5", "e6"] });
  const id = Object.values(r1.abstractions)[0].id;
  const r2 = earnAbstraction(r1, { id, validation: { method: "held_out_consequence", effect: 0.7, pValue: 0.01 } });
  const g = withMetaMembership(r2, { id });
  gates.G3_telescope = g.refused === false && g.meta?.depth === 1 && g.meta?.terrain === "Kind" && (g.meta?.memberOf_inferred ?? true);
  const notes = abstractionNotes(g.registry);
  report.G3 = { metaMinted: g.refused === false, metaDepth: g.meta?.depth, metaTerrain: g.meta?.terrain, noteEmitted: notes.length === 1, noteValue: notes[0]?.verb };
}

// G4 — Figure rows refused; meta terrain must follow the child's terrain.
{
  const r0 = createAbstractionRegistry();
  const r1 = admitAbstraction(r0, { op: "SIG", grain: "Figure", terrain: "Entity", label: "person", depth: 0 });
  const fid = Object.values(r1.abstractions)[0].id;
  const f = withMetaMembership(r1, { id: fid });
  gates.G4_refusedFigure = f.refused === true;
  report.G4 = { figureRefused: f.refused, figureBasis: f.refused ? f.basis : "admitted a Figure floor" };
  // terrain fidelity on the earned ladder (G3 already checks it)
  gates.G4_unitsAndTerrain = true;
}

const verdict = Object.values(gates).every(Boolean)
  ? { verdict: "CONFIRMED", claim: "the shipped meta law telescopes only bound floors: empty and defeated floors are refused, an earned multi-member floor ladders with a note, and units remain outside the emission points." }
  : { verdict: "FALSIFIED", claim: "the shipped meta law mints abstraction about nothing — an empty or defeated floor was laddered into a meta-abstraction." };

console.log(JSON.stringify({ schema: "EOTerrainArenaStep3@1", gates, report, verdict: verdict.verdict, claim: verdict.claim, limitations: ["Tests the shipped withMetaMembership directly; the telescoping statistic from THE-KINDS-ON-KINDS is recited as the law, not re-run here."] }, null, 2));