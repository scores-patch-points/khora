// cli/tests/claude-code-recall.test.mjs — the UserPromptSubmit recall hook
// (cli/claude-code-recall.mjs) against the REAL ledger writer
// (cli/reasoning-ledger.mjs appendReasoningLedger), the REAL fold
// (cli/claude-code-context.mjs) and the REAL relevance filter — no stand-ins,
// an isolated EO_LEDGER_DIR. Each polarity assertion carries the control that
// must stay unchanged: a positive claim still prints positive.
//
// Live failure this pins (2026-10-13, session b58008db): the claim
// {rel:"calls", ARG0:"claude-code-spiral", ARG1:"saveState", polarity:"-"} was
// recalled as "claude-code-spiral calls saveState" — its opposite.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "recall-polarity-"));
process.env.EO_LEDGER_DIR = DIR; // read at import time by reasoning-ledger.mjs
const { appendReasoningLedger } = await import("../reasoning-ledger.mjs");
const { recallContextFor } = await import("../claude-code-recall.mjs");

const G = "/repo/cli/spiral.mjs";
const claim = (rel, a0, a1, polarity, verdict = "unattributed") => ({
  ground: G, rel, roles: { ARG0: a0, ARG1: a1 }, polarity, verdict,
  said: `${a0} ${polarity === "-" ? "never " : ""}${rel} ${a1}.`,
});
let n = 0;
const seed = (session, claims) => appendReasoningLedger({ declaredClaims: claims, session, runAt: `2026-10-13T00:00:0${n++}.000Z`, dir: DIR });
const recall = (session, prompt) => recallContextFor({ session_id: session, prompt });
const lineFor = (ctx, needle) => ctx.split("\n").find((l) => l.startsWith("- ") && l.includes(needle));

test("a claim only ever denied prints as denied, never as its opposite", () => {
  seed("pol-neg", [claim("calls", "claude-code-spiral", "saveState", "-"), claim("reads", "claude-code-spiral", "loadState", "+")]);
  const ctx = recall("pol-neg", "does claude-code-spiral call saveState or loadState");
  const neg = lineFor(ctx, "saveState");
  assert.ok(neg, ctx);
  assert.match(neg, /NOT: claude-code-spiral calls saveState/);
  // The bug's exact output shape: the proposition with no NOT between the bracket and the subject.
  assert.doesNotMatch(neg, /\] claude-code-spiral calls saveState/);
});

test("control: an asserted claim in the same recall still prints positive", () => {
  const ctx = recall("pol-neg", "does claude-code-spiral call saveState or loadState");
  const pos = lineFor(ctx, "loadState");
  assert.ok(pos, ctx);
  assert.match(pos, /\] claude-code-spiral reads loadState/);
  assert.doesNotMatch(pos, /NOT/);
});

test("a claim both asserted and denied prints as contested, naming both sides", () => {
  seed("pol-both", [claim("calls", "recall", "saveState", "+"), claim("calls", "recall", "saveState", "-")]);
  const ctx = recall("pol-both", "does recall call saveState");
  const line = lineFor(ctx, "recall calls saveState");
  assert.ok(line, ctx);
  assert.match(line, /contested/);
  assert.match(line, /denied 1×/);
  assert.match(line, /asserted 1×/);
});

test("the legend says what ungrounded means, and a cited run still reads as grounded", () => {
  seed("pol-cite", [claim("exports", "context", "describeNote", "+", "cited"), claim("calls", "context", "saveState", "+")]);
  const ctx = recall("pol-cite", "context exports describeNote and calls saveState");
  assert.match(lineFor(ctx, "describeNote"), /1 grounded run\(s\)\] context exports describeNote/);
  assert.doesNotMatch(lineFor(ctx, "describeNote"), /ungrounded/);
  assert.match(lineFor(ctx, "saveState"), /ungrounded · stated 1×, no run cited its ground/);
  assert.match(ctx, /\[ungrounded\] means only that none did here/);
  assert.match(ctx, /not that it is false/);
  assert.match(ctx, /janus record/);
});

test("unchanged: another session's claims never leak in, and a system notice injects nothing", () => {
  assert.equal(recall("pol-nobody", "does claude-code-spiral call saveState"), null);
  assert.equal(recall("pol-neg", "<task-notification>claude-code-spiral saveState</task-notification>"), null);
});
