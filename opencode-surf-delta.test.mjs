import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// SYNTHETIC arms test (the spec's step 6): ladder vs pointer-only vs delta-ordered keep, planted fact at turn 12 of 60.
// This is a synthetic stream, not the real-data falsifier; it checks the arm's wiring, not the claim that delta-order wins in the wild.
const d = fs.mkdtempSync(path.join(os.tmpdir(), "surfd-")); process.env.FOLD_WORKNOTES_DIR = d;
const { surf } = await import("./opencode-surf.mjs");
const R = await import("./opencode-record.mjs");
const D = await import("./opencode-delta.mjs");
const L = await import("./opencode-ledger.mjs");
const FRAME = { giver: "person", question: "q", ground: "g" };

const N = 60, PLANT = 12;
const turns = Array.from({ length: N }, (_, i) => ({ n: i + 1, ask: `step ${i + 1} routine edit`, answer: i + 1 === PLANT ? "The key is the zorblax constant." : "Routine edit applied." }));
// every turn admits one block; most restate the same referent (no difference), turn PLANT supersedes an established referent
let t0 = Date.now();
const turnOfBlock = new Map();
for (let i = 1; i <= N; i++) {
  const ref = i <= 10 ? `mod${i}@1` : "mod1@1";
  const delta = i === PLANT ? "mod1 redefined: zorblax" : i <= 10 ? `defines ${i}` : "defines 1";
  const r = R.admit({ task: "t", agent: "a", referent: ref, delta, check: "true", exitCode: 0, now: t0 + i });
  if (r.kept) { const b = R.blocks("t").find((x) => x.id === r.id); turnOfBlock.set(b.id, i); D.measure({ task: "t", block: b, judge: "box", frame: FRAME }); }
}
const order = D.rankOf("t");
const rank = new Map(order.map((id, pos) => [turnOfBlock.get(id), pos]));
const mentions = (note) => /turn 12\b/.test(note);

test("the planted supersede is the top of the delta order", () => {
  assert.equal(rank.get(PLANT), 0);
});
test("arms: pointer-only and ladder (newest figure) lose the turn from the figure rung; delta-ordered keeps it", () => {
  const ask = "what was the key?";
  const pointer = surf({ ask, turns, mode: "pointer" });
  const ladder = surf({ ask, turns, mode: "ladder" });
  const delta = surf({ ask, turns, mode: "delta", rank });
  const fig = (r) => r.rungs.filter((x) => x.rung === "Figure").map((x) => x.turn);
  assert.ok(!fig(pointer).includes(PLANT));
  assert.ok(!fig(ladder).includes(PLANT));
  assert.ok(fig(delta).includes(PLANT));
  assert.ok(mentions(delta.note));
  assert.ok(!/\d+\.\d{3}/.test(delta.note), "no delta number reaches the note");
});
test("delta mode without a rank is exactly the pointer arm", () => {
  const a = surf({ ask: "x", turns, mode: "pointer" }), b = surf({ ask: "x", turns, mode: "delta" });
  assert.equal(a.note.replace(/fold:.*\n/, ""), b.note.replace(/fold:.*\n/, ""));
});
