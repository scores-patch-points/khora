// cli/tests/claude-code-doorway.test.mjs — the doorway's one-answer rule (oneAnswer) and its hook table.
import { test } from "node:test";
import assert from "node:assert/strict";
import { oneAnswer, HOOKS, handlersFor } from "../../claude-code-doorway.mjs";

const block = (reason) => JSON.stringify({ decision: "block", reason });
const deny = (why) => JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: why } });

test("two Stop blocks merge into one block carrying both reasons, in table order", () => {
  const j = JSON.parse(oneAnswer([block("reason gate"), "", block("janus gate")]));
  assert.equal(j.decision, "block");
  assert.ok(j.reason.indexOf("reason gate") < j.reason.indexOf("janus gate"));
});

test("control: a single block passes through unchanged", () => {
  assert.equal(oneAnswer(["{\"systemMessage\":\"x\"}", block("only")]), block("only"));
});

test("a PreToolUse deny is the answer, never merged", () => {
  assert.equal(oneAnswer([deny("not covered"), "{\"ok\":true}"]), deny("not covered"));
});

test("with no block, the last answer given; with none, empty", () => {
  assert.equal(oneAnswer(["{\"a\":1}", "{\"b\":2}"]), "{\"b\":2}");
  assert.equal(oneAnswer([]), "");
});

test("the table runs the ledger first on Stop and steers only write-capable tools", () => {
  const stop = handlersFor({ hook_event_name: "Stop" }).map((h) => h.script);
  assert.equal(stop[0], "cli/claude-code-ledger.mjs");
  assert.ok(stop.includes("cli/claude-code-reason-gate.mjs") && stop.includes("cli/claude-code-spiral.mjs"));
  assert.equal(handlersFor({ hook_event_name: "PreToolUse", tool_name: "Read" }).length, 0);
  assert.equal(handlersFor({ hook_event_name: "PreToolUse", tool_name: "Edit" })[0].script, "cli/claude-code-steer.mjs");
  assert.ok(HOOKS.length >= 8);
});
