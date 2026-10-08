// native/tests/dynamics-live.test.js — the canonical cycle's surprise is
// REAL, not recorded: `deriveSurprise` profiles operations, and the reader
// produces operations through the MECHANICAL door (`revise`, reviseTextFold —
// the production adapter; `ask` is the agent/model door, forbidden for a
// model-free read by no-model-reasoning). This pins the S97 finding so it
// cannot regress twice: a reader with NO adapter reports zero surprise
// operations (the inert path S97 measured), and the same reader with `revise`
// wired reports operations on the turns that actually revised the fold.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../kernel/reading.js";

const TEXT = [
  "Stevenson wrote Treasure Island in the year 1881.",
  "Stevenson travelled through France and Belgium before he wrote the book.",
  "The author admired the engineer and the doctor in the story.",
  "Treasure Island tells the story of Jim Hawkins and the pirate Long John Silver.",
  "Jim Hawkins found the map in the chest of the old captain.",
  "Long John Silver served as the cook on the ship Hispaniola.",
  "Stevenson wrote the novel while he lived in Scotland.",
  "The doctor treated the pirates on the island.",
  "Jim Hawkins carried the map to the ship at the harbour.",
  "The captain drank the rum in the inn by the sea.",
  "Stevenson admired the doctor and the captain of the vessel.",
  "Treasure Island inspired many readers and many writers after the author died.",
].join(" ");

function assembledReader(adapters) {
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25 });
  return createRecursiveReader({ perceivers: [perceiver], adapters });
}

test("S97 inert path: a reader with no revise and no ask profiles zero surprise operations", async () => {
  const reading = await assembledReader({}).read(textEncounters(`${TEXT} ${TEXT} ${TEXT}`, { source: "dynamics" }));
  const ops = reading.turns.reduce((n, t) => n + (t.surprise?.operations?.length ?? 0), 0);
  assert.equal(ops, 0, "the inert path S97 measured — a bare reader surprises nothing");
});

test("the mechanical door (revise) makes deriveSurprise live: revisions profile, per turn", async () => {
  const reading = await assembledReader({ revise: (a) => reviseTextFold(a) }).read(textEncounters(`${TEXT} ${TEXT} ${TEXT}`, { source: "dynamics" }));
  const surpriseTurns = reading.turns.filter((t) => (t.surprise?.operations?.length ?? 0) > 0);
  const ops = reading.turns.reduce((n, t) => n + (t.surprise?.operations?.length ?? 0), 0);
  assert.ok(reading.turns.length >= 30, "the reader stepped the material");
  assert.ok(ops > 0, `total surprise operations ${ops}`);
  assert.ok(surpriseTurns.length >= 1, `surprising turns ${surpriseTurns.length}`);
  for (const turn of surpriseTurns) assert.equal(turn.surprise.schema, "SurpriseProfile@1");
});