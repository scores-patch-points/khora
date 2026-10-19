// opencode-lane-doorway.test.mjs — the door-level control for the lane pass:
// `answer({ event: "context", ask })` must carry a typed <fold-lane> block to
// the plugin. The module test (opencode-lane.test.mjs) proves the classifier;
// this proves the WIRING — the door computes it on the context call and hands
// it out, which is what fold.ts injects into the window.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// A generous budget: this test measures the wiring, not the parser load.
process.env.FOLD_LANE = "1";
process.env.FOLD_LANE_MS = "60000";
const boot = async () => {
  process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  return import(`./opencode-doorway.mjs?t=${Date.now()}${Math.random()}`);
};

test("the door's context call carries the lane block (the wiring is live)", async () => {
  const { answer } = await boot();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const out = await answer({ event: "context", sessionID: "ses_lane000001", ask: "write me an essay about justice", workspace, task: "lane-t1" });
  assert.equal(typeof out.lane, "string", "the door must return a lane block on the context call");
  assert.match(out.lane, /^<fold-lane /);
  assert.match(out.lane, /shape="imperative"/, "an essay ask is a demand");
  assert.match(out.lane, /grounding="full"/, "the essay ask is English — full grounding");
});

test("a non-English ask's door block is structural-only", async () => {
  const { answer } = await boot();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const out = await answer({ event: "context", sessionID: "ses_lane000002", ask: "¿qué es la justicia?", workspace, task: "lane-t2" });
  assert.match(out.lane ?? "", /grounding="structural-only"/, "a Spanish ask must never be advertised as full grounding");
});
