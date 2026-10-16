import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { read } from "./opencode-eot.mjs";

process.env.FOLD_LOOK_IDLE_MS = "50";
const boot = async () => {
  process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  return import(`./opencode-doorway.mjs?t=${Date.now()}${Math.random()}`);
};

test("a finished turn naming a ghost path is refuted in the next note, and the log keeps it", async () => {
  const { answer } = await boot();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const sessionID = "ses_standing0001", task = "standing-t1";
  await answer({ event: "context", sessionID, ask: "fix the parser", workspace, task });
  await answer({ event: "event", type: "session.text.ended", sessionID, data: { text: "I rewrote the loop in src/ghost/nowhere.js and it is cleaner now." } });
  const r = await answer({ event: "surf", sessionID, workspace, task, ask: "continue", turns: [{ n: 1, ask: "fix the parser", answer: "I rewrote the loop in src/ghost/nowhere.js.", grounds: [] }] });
  assert.match(r.note, /standing of your last answer: 0 licensed, 1 refuted \(standing\.t1\.s0\), 0 untested/);
  assert.match(r.note, /unknown_path src\/ghost\/nowhere\.js/, "the mechanical flag still rides");
  await answer({ event: "event", type: "session.text.ended", sessionID, data: { text: "Also touched lib/phantom.js." } });
  const r2 = await answer({ event: "surf", sessionID, workspace, task, ask: "again", turns: [] });
  assert.match(r2.note, /refuted \(standing\.t2\.s0\)/, "the second answer is turn 2, not turn 1 again");
  const ev = read(task).events.find((e) => e.stage === "reason" && e.detail?.op === "SPIRAL");
  assert.ok(ev, "the standing is in the one store");
  assert.deepEqual(ev.detail.refuted, ["standing.t1.s0"]);
});

test("penelope is the default prosifier, and a miss falls back to the extractive projection", async () => {
  delete process.env.FOLD_COMMONS_PROSIFY;
  process.env.FOLD_PROSIFY_MS = "300"; // no mouth here: the weave cannot answer in time
  const { answer } = await boot();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
  const task = "prosify-t1";
  await answer({ event: "context", sessionID: "ses_otheragent01", ask: "settle the cache contract", workspace, task });
  await answer({ event: "event", type: "session.text.ended", sessionID: "ses_otheragent01", data: { text: "The cache contract requires idempotent writes." } });
  await answer({ event: "surf", sessionID: "ses_otheragent01", workspace, task, ask: "settle the cache contract", turns: [{ n: 1, ask: "settle the cache contract", answer: "The cache contract requires idempotent writes.", grounds: [] }] });
  const c = await answer({ event: "context", sessionID: "ses_myagent00001", ask: "extend the cache writes", workspace, task });
  assert.match(c.commons ?? "", /idempotent writes/, "the extractive projection still rides when penelope returns nothing");
});
