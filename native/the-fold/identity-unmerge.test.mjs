// identity-unmerge.test.mjs — a bad merge is reversible from the ledger by REPLAY, not by assertion.
//   KHORA_PRIORS_DIR=<ten English priors> node --test native/the-fold/identity-unmerge.test.mjs
//
// The log is append-only. A merge is one entry on it; the beings it joined are still on it. What exists today: replaying the log WITHOUT the merge entry (or to a
// cursor before it) gives the pre-merge beings. What does not exist: a RETRACTION — an entry appended to the log that says "that merge was wrong" and that the
// consumers honour on replay. The proposed schema name below is a placeholder for the missing piece, not an existing one.
import test from "node:test";
import assert from "node:assert/strict";
import { foldReading, mentionBookFromLog } from "./reading-log.js";
import { identityEvents } from "./hindsight-log.js";
import { projectHypergraph } from "../kernel/hypergraph-projection.js";
import { diaNorm } from "../adapters/text/surfaces.js";
import { assertCanon, PYOTR_TEXT, readLog, withoutSchema, mergeOf, reassignmentOf } from "./identity-fixture.mjs";

const fx = await readLog(PYOTR_TEXT);
const merge = mergeOf(fx.graph), re = reassignmentOf(fx.graph);
const [KEPT, FOLDED] = [merge.kept, merge.folded[0]];
const fold = (log) => foldReading(log, { diaNorm });
const idsOfBeings = (log) => [...fold(log).referents.keys()].sort();
const mentionsByAddress = (log) => {
  // per original address: the encounters (by anchor start) its EOMention@1 rows name — what replay must restore
  const out = new Map();
  for (const e of log.flatMap((x) => [x, ...(x.graphEntries ?? [])])) if (e.schema === "EOMention@1") out.set(e.referent, [...(out.get(e.referent) ?? []), e.anchor?.start]);
  return out;
};
// the log up to (not including) the Observation row that carries the merge: the reader's own state one step before it decided
const mergeRow = fx.log.findIndex((e) => e.graphEntries?.some((g) => g.id === merge.id));
const beforeMerge = fx.log.slice(0, mergeRow);
const proposedRetraction = (log) => [...log, { schema: "EOReferentMergeRetraction@1", id: "retraction:proposed", retracts: merge.id, kept: merge.kept, folded: [...merge.folded], provenance: { giver: "test", tier: "witness", basis: "a bad merge, retracted" } }];

test("canon: the reader is not degraded", async () => { await assertCanon(assert); });

test("the merge is on the log and joins two beings; the log itself keeps both addresses (append-only)", () => {
  assert.ok(mergeRow > 0);
  assert.equal(fold(fx.log).identity.beings, 1);
  assert.deepEqual(fold(fx.log).referents.get(KEPT).members.sort(), [KEPT, FOLDED].sort());
  const mentions = mentionsByAddress(fx.log);
  assert.ok(mentions.get(KEPT)?.length && mentions.get(FOLDED)?.length, "both addresses have EOMention@1 rows on the log after the merge");
});

test("replay is pure: folding the log does not change the log", () => {
  const before = JSON.stringify(fx.log);
  fold(fx.log); projectHypergraph(fx.log); identityEvents(fx.graph);
  assert.equal(JSON.stringify(fx.log), before);
});

test("REPLAY WITHOUT THE MERGE restores the pre-merge addresses and their mentions", () => {
  const replay = withoutSchema(fx.log, "EOReferentMerge@1");
  assert.deepEqual(idsOfBeings(replay), [FOLDED, KEPT].sort(), "two addresses again");
  assert.equal(fold(replay).identity.mergedByRecord, 0);
  assert.deepEqual(mentionsByAddress(replay), mentionsByAddress(fx.log), "no mention was lost or moved by taking the merge out");
  // and the replay equals what the reader had before it decided: same addresses, and every pre-merge mention is in the book at the same address
  assert.deepEqual(idsOfBeings(beforeMerge), idsOfBeings(replay));
  const before = mentionBookFromLog(beforeMerge, { diaNorm }), after = mentionBookFromLog(replay, { diaNorm });
  for (const [id, rows] of before.byId) for (const r of rows) {
    const key = before.sentences[r].ref;
    assert.ok((after.byId.get(id) ?? []).some((i) => after.sentences[i].ref === key), `${id} lost the sentence ${key} after replay`);
  }
});

test("REPLAY TO A CURSOR BEFORE THE MERGE: the projection shows two nodes and no merge; at the end the merge is on the list and the nodes are still two", () => {
  const early = projectHypergraph(fx.log, { atSeq: mergeRow });
  assert.equal(early.merges.length, 0);
  assert.deepEqual(early.nodes.map((n) => n.id).sort(), [FOLDED, KEPT].sort());
  const late = projectHypergraph(fx.log);
  assert.equal(late.merges.length, 1);
  assert.deepEqual(late.nodes.map((n) => n.id).sort(), [FOLDED, KEPT].sort(), "the merge never deleted a node, so un-merging needs nothing back");
});

test("the re-address survives the un-merge as a re-address only (replay without the merge keeps the Reassignment)", () => {
  const replay = withoutSchema(fx.log, "EOReferentMerge@1");
  assert.equal(fold(replay).identity.reassignments, 1);
  assert.equal(replay.flatMap((e) => e.graphEntries ?? []).filter((g) => g.id === re.id).length, 1);
});

// GAPS (confirmed failing on 2aa08b3): there is no retraction event. A reader of the ledger cannot be TOLD a merge was wrong; the only un-merge is to rebuild a
// log without the entry, which an append-only ledger forbids (and which loses the fact that the merge was ever made). Missing piece: a retraction schema
// (placeholder name EOReferentMergeRetraction@1, `retracts: <merge id>`, with a giver) that reading-log.js, hypergraph-projection.js and hindsight-log.js honour.
test("a retraction appended to the log restores the pre-merge beings on replay (reading-log)", { todo: "no retraction schema exists; reading-log.js::foldReading ignores an unknown entry and the merge still stands" }, () => {
  assert.deepEqual(idsOfBeings(proposedRetraction(fx.log)), [FOLDED, KEPT].sort());
  assert.equal(fold(proposedRetraction(fx.log)).identity.mergedByRecord, 0);
});
test("a retraction appended to the log removes the merge from the projection (hypergraph-projection)", { todo: "no retraction schema exists; projectHypergraph lists every EOReferentMerge@1 it finds" }, () => {
  assert.equal(projectHypergraph(proposedRetraction(fx.log)).merges.length, 0);
});
test("a retraction is itself an identity event the hindsight walk can cut at (hindsight-log)", { todo: "no retraction schema exists; touchedByEvent knows only Merge and Reassignment" }, () => {
  assert.ok(identityEvents(proposedRetraction(fx.log)).some((e) => e.schema === "EOReferentMergeRetraction@1"));
});
