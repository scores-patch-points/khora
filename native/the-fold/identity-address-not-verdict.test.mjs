// identity-address-not-verdict.test.mjs — an address change is never an identity verdict.
//   KHORA_PRIORS_DIR=<ten English priors> node --test native/the-fold/identity-address-not-verdict.test.mjs
//
// recursive.js writes two identity events: EOReferentMerge@1 {kept, folded, witness, provenance} — TESTIMONY that two addresses are one being — and
// EOReferentReassignment@1 {from, to, surface} — a SURFACE now points at a new address. The second is a re-address; it says nothing about who is who.
// The fixture is the reader's own: the same pair (ref:auto:petrovitch -> ref:auto:pyotr) arrives once as each.
import test from "node:test";
import assert from "node:assert/strict";
import { foldReading, readingIndexFromLog } from "./reading-log.js";
import { identityEvents, touchedByEvent, hindsightFromLog } from "./hindsight-log.js";
import { projectHypergraph } from "../kernel/hypergraph-projection.js";
import { reviewIdentityMerges } from "../organs/fold-gate.js";
import { diaNorm } from "../adapters/text/surfaces.js";
import { assertCanon, PYOTR_TEXT, readLog, withoutSchema, mergeOf, reassignmentOf, pipelineSplitter } from "./identity-fixture.mjs";

const MERGE = "EOReferentMerge@1", REASSIGN = "EOReferentReassignment@1";
const fx = await readLog(PYOTR_TEXT);
const merge = mergeOf(fx.graph), re = reassignmentOf(fx.graph);
const mergeOnly = withoutSchema(fx.log, REASSIGN), reassignOnly = withoutSchema(fx.log, MERGE);
// no namesCorefer: the coreference organ is a SECOND tier that may join the same two beings by containment; the record is the tier under test here
const fold = (log) => foldReading(log, { diaNorm });

test("canon: the reader is not degraded", async () => { await assertCanon(assert); });

test("fixture: the real reader writes a Merge and a Reassignment for the same pair", () => {
  assert.ok(merge && re, "the fixture text must make the reader emit both events");
  assert.equal(re.from, "ref:auto:petrovitch");
  assert.equal(re.to, "ref:auto:pyotr");
  assert.equal(merge.kept, re.to);
  assert.deepEqual([...merge.folded], [re.from]);
});

test("reading-log: a Merge unions the two addresses; a Reassignment alone does not", () => {
  const m = fold(mergeOnly), r = fold(reassignOnly), both = fold(fx.log);
  assert.equal(m.identity.beings, 1);
  assert.equal(m.identity.mergedByRecord, 1);
  assert.equal(r.identity.beings, 2, "the same pair, read only as a Reassignment, is still two beings");
  assert.equal(r.identity.mergedByRecord, 0);
  assert.equal(r.identity.reassignments, 1, "the re-address is counted as a re-address");
  assert.equal(both.identity.beings, 1);
  assert.equal(both.identity.mergedByRecord, 1);
  assert.equal(both.identity.reassignments, 1);
});

test("reading-log index: a Reassignment re-points the surface, leaves both beings in the index; a Merge removes one", () => {
  const idx = (log) => readingIndexFromLog(log, { diaNorm });
  const r = idx(reassignOnly), m = idx(mergeOnly);
  assert.deepEqual([...r.referents].sort(), ["ref:auto:petrovitch", "ref:auto:pyotr"]);
  assert.deepEqual([...r.resolve("Petrovitch")], [re.to], "the surface is re-addressed");
  assert.deepEqual([...m.referents], ["ref:auto:pyotr"]);
});

test("hindsight-log: both events re-address the same ids but stay distinguishable, and neither answer is an identity claim", () => {
  const events = identityEvents(fx.graph);
  const em = events.find((e) => e.schema === MERGE), er = events.find((e) => e.schema === REASSIGN);
  assert.ok(em && er);
  assert.deepEqual([...em.touched].sort(), [...er.touched].sort(), "same pair touched");
  assert.notEqual(em.schema, er.schema);
  const hm = hindsightFromLog(fx.graph, em.index, { trials: 5, rng: () => 0.5 });
  const hr = hindsightFromLog(fx.graph, er.index, { trials: 5, rng: () => 0.5 });
  for (const h of [hm, hr]) {
    assert.equal(h.schema, "EOHindsight@1");
    for (const k of ["kept", "folded", "merged", "same", "verdict"]) assert.equal(k in h, false, `hindsight must not carry an identity field: ${k}`);
  }
  // the reassignment sits AFTER the merge on the log, so the walk before it reaches the merge entry itself; the walk before the merge cannot reach the reassignment
  assert.ok(hr.rows.some((x) => x.id === merge.id));
  assert.ok(!hm.rows.some((x) => x.id === re.id));
  assert.notDeepEqual(hm.rows.map((x) => x.id), hr.rows.map((x) => x.id), "the two events do not give the same answer");
  // an entry that is not an identity event is refused, typed
  assert.equal(hindsightFromLog(fx.graph, 0).gap, "not_an_identity_event");
  assert.deepEqual(touchedByEvent({ schema: "EOMention@1", referent: "x" }), null);
});

test("hypergraph-projection: merges and reassignments are two lists, neither fills the other, and nodes are never folded by either", () => {
  const all = projectHypergraph(fx.log), m = projectHypergraph(mergeOnly), r = projectHypergraph(reassignOnly);
  assert.equal(all.merges.length, 1); assert.equal(all.reassignments.length, 1);
  assert.deepEqual([...all.merges[0].folded], [re.from]);
  assert.equal(all.merges[0].kept, re.to);
  assert.equal(all.merges[0].from, undefined, "a merge row has no from/to");
  assert.equal(all.reassignments[0].kept, undefined, "a reassignment row has no kept/folded");
  assert.equal(all.reassignments[0].folded, undefined);
  assert.equal(all.reassignments[0].surface, "Petrovitch");
  assert.equal(r.merges.length, 0, "a log with only a Reassignment projects no merge");
  assert.equal(m.reassignments.length, 0);
  const ids = (h) => h.nodes.map((n) => n.id).sort();
  assert.deepEqual(ids(r), ids(m)); assert.deepEqual(ids(r), ids(all));
  assert.ok(ids(all).includes(re.from) && ids(all).includes(re.to));
});

test("fold-gate reviewIdentityMerges: a Reassignment is never a witnessed merge — it is never confirmed or refuted", async () => {
  const splitSentences = await pipelineSplitter(PYOTR_TEXT);
  const run = (list) => reviewIdentityMerges([{ text: PYOTR_TEXT }], list, { splitSentences, population: [], alpha: 0.05 });
  const r = run([re]), m = run([merge]);
  assert.equal(r.confirmed.length, 0); assert.equal(r.refuted.length, 0);
  // same from/to pair, once each: the results differ — the Merge has surfaces to measure (a witness), the Reassignment has none
  assert.equal(r.undetermined[0].reason, "merge record carries no surfaces");
  assert.equal(m.undetermined[0].reason, undefined);
  assert.equal(m.undetermined[0].a, merge.witness, "the Merge is read by its witness surface");
  assert.notDeepEqual(r, m);
});

// GAP (confirmed failing on 2aa08b3): reviewIdentityMerges reports "every reported merge lands in exactly one bucket" and sorts ANY record it is handed. A
// Reassignment handed to it lands in `undetermined`, so a consumer that totals the buckets counts a re-address as a reviewed merge. It should not be reviewed at all.
test("fold-gate reviewIdentityMerges: a Reassignment is not reviewed as a merge at all (in no bucket)", { todo: "reviewIdentityMerges has no schema check: a Reassignment lands in `undetermined` as if it were a merge" }, async () => {
  const splitSentences = await pipelineSplitter(PYOTR_TEXT);
  const r = reviewIdentityMerges([{ text: PYOTR_TEXT }], [re], { splitSentences, population: [], alpha: 0.05 });
  assert.equal(r.confirmed.length + r.refuted.length + r.undetermined.length, 0);
});

// GAP (confirmed failing on 2aa08b3): the real Merge's `folded` is a list of ADDRESSES (ref:auto:petrovitch), but the function reads `String(m.folded)` as a SURFACE
// to measure. A real merge is therefore never measured; it comes back undetermined because it is asked about an id, not because the evidence is thin.
test("fold-gate reviewIdentityMerges: a real Merge is measured by surfaces, not by the address it folded", { todo: "reviewIdentityMerges measures String(merge.folded) = 'ref:auto:petrovitch' — an address, not a surface" }, async () => {
  const splitSentences = await pipelineSplitter(PYOTR_TEXT);
  const r = reviewIdentityMerges([{ text: PYOTR_TEXT }], [merge], { splitSentences, population: [], alpha: 0.05 });
  const entry = [...r.confirmed, ...r.refuted, ...r.undetermined][0];
  assert.ok(!String(entry.b).startsWith("ref:"), `measured b = ${entry.b}`);
});
