// tests/mimir.test.js — THE MIND's laws, held at the organ. Mímir records
// takings that cite the source underlying bytes; appends, never rewrites;
// preserves defeat; and refuses an "earned" standing with no measurement
// (coherence alone earns nothing).
import test from "node:test";
import assert from "node:assert/strict";

import { createMind, remember, defeat, mindAt, verifyCitations, cite, parseMind } from "../kernel/mimir.js";

const CITE = () => [cite({ source: "/corpus/udhr-eng.txt", byte: 2478, length: 12 })];

test("a row with no citation is refused (no generation from nowhere)", () => {
  const mind = createMind();
  assert.throws(() => remember(mind, { kind: "paradigm", claim: { p: 1 }, cites: [] }), /cite the source underlying bytes/);
});

test("a citation needs a real source and byte offset", () => {
  assert.throws(() => cite({ byte: 0 }), /source path is required/);
  assert.throws(() => cite({ source: "/x" }), /byte offset is required/);
});

test("coherence alone earns nothing — 'earned' requires a measured consequence", () => {
  const mind = createMind();
  assert.throws(() => remember(mind, { kind: "kind", claim: { k: "x" }, cites: CITE(), standing: "earned" }), /measured consequence/);
  const earned = remember(mind, { kind: "kind", claim: { k: "x" }, cites: CITE(), standing: "earned", measurement: { method: "temporal-frontier", effect: 0.175, pValue: 0.004 } });
  assert.equal(earned.rows[0].standing, "earned");
});

test("append-only: remember returns a NEW mind, the prior is untouched", () => {
  const m0 = createMind();
  const m1 = remember(m0, { kind: "obligation", claim: { a: 1 }, cites: CITE() });
  const m2 = remember(m1, { kind: "obligation", claim: { a: 2 }, cites: CITE() });
  assert.equal(m0.rows.length, 0);
  assert.equal(m1.rows.length, 1);
  assert.equal(m2.rows.length, 2);
  assert.equal(m2.rows[0].seq, 0);
  assert.equal(m2.rows[1].seq, 1);
});

test("defeat is preserved — the target row stays; the projection refutes it", () => {
  let mind = remember(createMind(), { kind: "kind", claim: { k: "elizabeth-basin" }, cites: CITE(), standing: "candidate" });
  const id = mind.rows[0].id;
  mind = defeat(mind, id, { by: "swarm", reason: "the basin is inside its own null on the temporal instrument" });
  assert.equal(mind.rows.length, 2, "the defeat is a new line");
  assert.equal(mind.rows[0].id, id, "the target row is untouched");
  assert.equal(mindAt(mind).standingById[id], "refuted");
  // a refuted row is never silently re-earned: the record keeps both lines
  assert.equal(mind.rows.filter((r) => r.id === id).length, 1);
});

test("the log is truth — mindAt replays a cursor", () => {
  let mind = remember(createMind(), { kind: "obligation", claim: { a: 1 }, cites: CITE() });
  mind = remember(mind, { kind: "obligation", claim: { a: 2 }, cites: CITE() });
  const at1 = mindAt(mind, { asOf: 0 });
  assert.equal(at1.rows.length, 1);
  assert.ok(at1.standingById[mind.rows[0].id]);
  assert.equal(at1.standingById[mind.rows[1].id], undefined);
});

test("the store round-trips — the JSONL reads back whole (log is truth, store is its projection)", () => {
  let mind = remember(createMind(), { kind: "obligation", claim: { a: 1 }, cites: CITE() });
  mind = remember(mind, { kind: "kind", claim: { k: "x" }, cites: CITE(), standing: "earned", measurement: { method: "held_out_recognition", effect: 0.435, pValue: 0.005 } });
  const jsonl = `${JSON.stringify({ schema: "EOMind@1", handle: "Mimir", note: "test store" })}\n` + mind.rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const back = parseMind(jsonl);
  assert.equal(back.rows.length, 2);
  assert.equal(back.rows[1].standing, "earned");
  assert.equal(back.meta.handle, "Mimir");
  assert.deepEqual(back.rows.map((r) => r.id), mind.rows.map((r) => r.id));
});

test("citations are verified against real bytes, never assumed", () => {
  const src = Buffer.from("the universal declaration of human rights");
  const read = (s) => { if (s !== "/corpus/udhr-eng.txt") throw new Error("ENOENT"); return src; };
  const good = remember(createMind(), { kind: "obligation", claim: { t: "dignity" }, cites: [cite({ source: "/corpus/udhr-eng.txt", byte: 4, length: 9 })] });
  assert.equal(verifyCitations(good, { read }).ok, true);
  const bad = remember(createMind(), { kind: "obligation", claim: { t: "past the end" }, cites: [cite({ source: "/corpus/udhr-eng.txt", byte: 9999 })] });
  const report = verifyCitations(bad, { read });
  assert.equal(report.ok, false);
  assert.match(report.findings[0].why, /beyond the source/);
  const missing = remember(createMind(), { kind: "obligation", claim: { t: "no file" }, cites: [cite({ source: "/nope.txt", byte: 0 })] });
  assert.equal(verifyCitations(missing, { read }).ok, false);
});
