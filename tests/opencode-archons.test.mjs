import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "oc-archons-"));
process.env.FOLD_ARCHONS = "0";
const door = await import("../opencode-doorway.mjs");
const { archonNote, ARCHON_NOTE_MAX_CHARS } = await import("../opencode-archons.mjs");

const MATCH_ASK = "Which witnesses corroborate the testimony — are their chains independent, and is the evidence sworn?";
const NULL_ASK = "hi";

test("archonNote matches mechanically and carries dossier credit", async () => {
  const r = await archonNote(MATCH_ASK);
  assert.ok(r.handles && r.handles.length > 0, `expected a match, got gap ${r.gap}`);
  assert.ok(r.handles.length <= 2);
  assert.ok(r.note.length <= ARCHON_NOTE_MAX_CHARS);
  assert.match(r.note, /<fold-archons>/);
  assert.match(r.note, /verdict:/);
});

test("archonNote answers a typed gap on the null control", async () => {
  const r = await archonNote(NULL_ASK);
  assert.ok(!r.note);
  assert.equal(r.gap, "no-archon-match");
});

test("shadow (default): decided and recorded, never injected", async () => {
  const ctx = await door.answer({ event: "context", sessionID: "sh1", ask: MATCH_ASK, model: { id: "m" } });
  assert.ok(!("archons" in ctx), "shadow arm must not add an answer field");
  await door.answer({ event: "event", sessionID: "sh1", type: "session.step.ended", data: { tokens: {}, finish: "stop" } });
  const rows = fs.readFileSync(path.join(process.env.FOLD_OPENCODE_STATE, "record.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const row = rows.find((r) => r.sessionID === "sh1");
  assert.ok(row.archons, "shadow decision must be recorded");
  assert.equal(row.archons.injected, false);
});

test("opt-in: injected into the answer and recorded", async () => {
  process.env.FOLD_ARCHONS = "1";
  try {
    const ctx = await door.answer({ event: "context", sessionID: "lv1", ask: MATCH_ASK, model: { id: "m" } });
    assert.ok(ctx.archons?.note, "live arm must inject the note");
    assert.ok(ctx.archons.chars <= ARCHON_NOTE_MAX_CHARS);
    await door.answer({ event: "event", sessionID: "lv1", type: "session.step.ended", data: { tokens: {}, finish: "stop" } });
    const rows = fs.readFileSync(path.join(process.env.FOLD_OPENCODE_STATE, "record.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const row = rows.find((r) => r.sessionID === "lv1");
    assert.equal(row.archons.injected, true);
  } finally {
    process.env.FOLD_ARCHONS = "0";
  }
});
