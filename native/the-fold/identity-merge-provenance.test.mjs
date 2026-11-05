// identity-merge-provenance.test.mjs — a merge claims a sameness and says who gave it.
//   KHORA_PRIORS_DIR=<ten English priors> node --test native/the-fold/identity-merge-provenance.test.mjs
//
// "Same" is several different claims: an identity claim (these two addresses are one being, at INS grain Figure), a meaning claim (these say one thing, at DEF),
// a kind claim. A merge that does not name the CELL it claims sameness at (an operator and a grain) is read as the strongest one by whoever consumes it.
// Today recursive.js writes provenance {giver, tier, basis} and no cell. The desired record: provenance.cell = {op, grain} plus provenance.giver.
import test from "node:test";
import assert from "node:assert/strict";
import { foldReading } from "./reading-log.js";
import { projectHypergraph } from "../kernel/hypergraph-projection.js";
import { diaNorm } from "../adapters/text/surfaces.js";
import { assertCanon, PYOTR_TEXT, readLog, mapGraphEntry, mergeOf, reassignmentOf } from "./identity-fixture.mjs";

const fx = await readLog(PYOTR_TEXT);
const merge = mergeOf(fx.graph);
const mergesOf = (graph) => graph.filter((g) => g.schema === "EOReferentMerge@1");
const cellOf = (m) => m?.provenance?.cell ?? m?.cell ?? null;
const namedCell = (m) => { const c = cellOf(m); return !!c && typeof c.op === "string" && c.op.trim() && typeof c.grain === "string" && c.grain.trim(); };
const CELL = { op: "INS", grain: "Figure" }; // an identity claim at Figure, the example the scope gave; the test needs any named cell
const applied = (log) => foldReading(log, { diaNorm }).identity.mergedByRecord;

test("canon: the reader is not degraded", async () => { await assertCanon(assert); });

test("every merge and reassignment the reader emits on the fixed text carries a giver, a tier and a basis", () => {
  const events = fx.graph.filter((g) => g.schema === "EOReferentMerge@1" || g.schema === "EOReferentReassignment@1");
  assert.ok(mergesOf(fx.graph).length >= 1 && reassignmentOf(fx.graph), "the fixture must emit both kinds");
  for (const e of events) {
    for (const k of ["giver", "tier", "basis"]) assert.ok(typeof e.provenance?.[k] === "string" && e.provenance[k].trim(), `${e.schema} ${e.id}: provenance.${k} is missing or empty`);
  }
  assert.equal(merge.provenance.giver, "surfaces/discoverReferents");
  assert.equal(merge.provenance.tier, "engine");
});

test("a merge names the surface that witnessed it, and its id hashes the act (same text, same id)", async () => {
  assert.ok(merge.witness && typeof merge.witness === "string");
  const again = mergeOf((await readLog(PYOTR_TEXT)).graph);
  assert.equal(again.id, merge.id);
});

test("control: a merge carrying giver and a named cell is applied by the record", () => {
  const full = mapGraphEntry(fx.log, merge.id, (m) => ({ ...m, provenance: { ...m.provenance, cell: CELL } }));
  assert.equal(applied(full), 1);
});

// GAP (confirmed failing on 2aa08b3): provenance has giver/tier/basis and NO named cell.
test("every merge the reader emits names the cell (operator and grain) it claims sameness at", { todo: "recursive.js writes provenance {giver, tier, basis}; no merge names the cell it claims" }, () => {
  for (const m of mergesOf(fx.graph)) assert.ok(namedCell(m), `merge ${m.id} claims no named cell (${JSON.stringify(cellOf(m))})`);
});

// GAP (confirmed failing on 2aa08b3): nothing refuses a merge. reading-log's fold unions every EOReferentMerge@1 it is handed whether or not it names a cell.
test("a merge with no named cell is refused by the record (not applied)", { todo: "reading-log.js::foldReading unions every EOReferentMerge@1; there is no cell to check and no refusal" }, () => {
  const noGrain = mapGraphEntry(fx.log, merge.id, (m) => ({ ...m, provenance: { ...m.provenance, cell: undefined } }));
  assert.equal(applied(noGrain), 0);
});

// GAP (confirmed failing on 2aa08b3): same, for the giver.
test("a merge with no giver is refused by the record (not applied)", { todo: "reading-log.js::foldReading never reads provenance.giver; a merge from nobody is applied" }, () => {
  const noGiver = mapGraphEntry(fx.log, merge.id, (m) => ({ ...m, provenance: { ...m.provenance, cell: CELL, giver: undefined } }));
  assert.equal(applied(noGiver), 0);
});

// GAP (confirmed failing on 2aa08b3): the projection keeps kept/folded/witness and drops the provenance, so a reader of the projection cannot see who gave a merge.
test("hypergraph-projection keeps a merge's provenance (giver and basis) on the projected row", { todo: "kernel/hypergraph-projection.js maps merges to {id, kept, folded, witness, encounterRef}; provenance is dropped" }, () => {
  const row = projectHypergraph(fx.log).merges[0];
  assert.equal(row.provenance?.giver, merge.provenance.giver);
  assert.equal(row.provenance?.basis, merge.provenance.basis);
});
