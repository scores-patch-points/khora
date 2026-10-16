import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { surf } from "./opencode-surf.mjs";

const T = ["parser lexer", "deploy staging", "database migration", "css layout", "auth token"];
const mk = (len) => Array.from({ length: len }, (_, i) => ({
  n: i + 1, ask: `please work on the ${T[i % 5]} item ${i}`,
  answer: `Done with ${T[i % 5]} in file${i}. Tests pass.`, grounds: [i % 3 ? "edit" : "bash"],
}));

test("window growth is bounded by rungs, not turns", () => {
  const small = surf({ ask: "x", turns: mk(20) }).chars;
  const big = surf({ ask: "x", turns: mk(160) }).chars;
  assert.ok(big < small * 3, `160 turns (${big}) must stay near 20 turns (${small})`);
});

test("kinds are admitted only with gain and independent grounds", () => {
  const same = mk(10).map((t) => ({ ...t, grounds: ["edit"] }));
  assert.equal(surf({ ask: "x", turns: same }).rungs.filter((r) => r.rung === "Kind").length, 0);
  assert.ok(surf({ ask: "x", turns: mk(20) }).rungs.some((r) => r.rung === "Kind"));
});

test("no inline address tags a model could imitate", () => {
  assert.doesNotMatch(surf({ ask: "x", turns: mk(6) }).note, /#\d+-\d+\]/);
});

test("surf writes this agent's turns file and a note with the task directory", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_WORKNOTES_DIR = dir;
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
  const r = await answer({ event: "surf", sessionID: "s1", task: "t1", ask: "q", turns: mk(5) });
  assert.match(fs.readFileSync(path.join(dir, "t1", "s1.turns.md"), "utf8"), /## turn 5/);
  assert.match(r.note, /marks: append .*t1\/s1\.md/, "the cue (once per session) names the task directory and the agent file");
  assert.ok(r.note.length <= 700, `the note stays tiny: ${r.note.length}`);
  const bad = await answer({ event: "surf", sessionID: "s1", task: "../evil", ask: "q", turns: mk(2) });
  assert.doesNotMatch(bad.note, /evil/);
  assert.ok(!fs.existsSync(path.join(dir, "..", "evil")));
});
