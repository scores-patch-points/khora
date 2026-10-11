// sealed-agent/sealed-agent.test.mjs — the wired slice, falsified:
//  · the seal: projections are stamped, bounded, typed; the audit records
//    every outbound body hash; the planner sees only sealed projections.
//  · real execution: read/write/bash do real work; escapes are refused.
//  · Law 1 (one-time): the same ask serves from the compiled lesson with
//    ZERO frontier calls — the second planner call would throw if made.
//  · demotion: a changed ground fails the replay and the lesson is demoted.
//  · checks-before-plan: a failing declared test command compiles no lesson.
//  · the wire: sessions, parts shape, history, SSE idle (opencode-compatible).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgent } from "./agent.mjs";
import { createAgentTools, toolDefs } from "./tools.mjs";
import { createSkillStore } from "./skills.mjs";
import { createSealer, isProjection } from "./seal.mjs";
import { createSealedAgentServer } from "./server.mjs";

const tmpWs = () => {
  const d = mkdtempSync(join(tmpdir(), "sealed-agent-test-"));
  writeFileSync(join(d, "input.txt"), "alpha beta gamma\n");
  return d;
};

/** scriptedPlanner(script) — a stand-in for the frontier at the exact seam
 *  where the HTTP call would happen. Records everything that would have left
 *  (through the sealer when one is given, exactly like the real planner);
 *  throws if told. */
const scriptedPlanner = (script, { sealer = null } = {}) => {
  const inbox = [];
  let calls = 0;
  let offset = 0;
  const planner = {
    plan: async ({ messages }) => {
      calls++;
      inbox.push(messages);
      if (sealer) sealer.recordOutbound({ host: "test-seam", kind: "frontier", body: { messages } });
      const reply = typeof script === "function" ? await script(messages) : script[offset++];
      if (reply === undefined) throw new Error("planner was called but the script was exhausted (lesson did not serve)");
      return reply;
    },
    calls: () => calls,
    inbox,
    setScript(s) { script = s; offset = 0; },
  };
  return planner;
};

const toolResult = (msgs, iFromEnd = 0) => {
  for (let i = msgs.length - 1 - iFromEnd; i >= 0; i--) {
    const m = msgs[i];
    if (Array.isArray(m.content) && m.content[0]?.type === "tool_result") return JSON.parse(m.content[0].content);
  }
  throw new Error("no tool_result in messages");
};

test("the seal: bounded, stamped, audited; the planner sees only sealed projections", async () => {
  const ws = tmpWs();
  const audit = join(ws, "audit.jsonl");
  const sealer = createSealer({ auditPath: audit });
  const proj = sealer.project({ kind: "file", address: "perm:input.txt", content: "x".repeat(100 * 1024) });
  assert.equal(proj.schema, "SealedProjection@1");
  assert.equal(proj.truncated, true);
  assert.ok(proj.content.includes("[cut:"), "a cut is typed, never silent");
  assert.equal(proj.bytes, 100 * 1024);
  assert.ok(proj.sha256.length === 64);

  const planner = scriptedPlanner(
    [
      { text: "read", toolCalls: [{ id: "tu-read", name: "read", input: { path: "input.txt" } }] },
      { text: "done", toolCalls: [] },
    ],
    { sealer }
  );
  const agent = createAgent({ workspace: ws, planner, sealer });
  await agent.runTurn({ ask: "read input.txt", sessionId: "t1" });
  assert.ok(existsSync(audit));
  const lines = readFileSync(audit, "utf8").trim().split("\n");
  assert.ok(lines.length >= 1);
  for (const line of lines) {
    const e = JSON.parse(line);
    assert.equal(e.host, "test-seam"); // the real planner records the anthropic host at the same seam
    assert.equal(typeof e.sha256, "string");
    assert.ok(e.bytes > 0);
  }
  for (const msgs of planner.inbox) {
    for (const m of msgs) {
      if (Array.isArray(m.content) && m.content[0]?.type === "tool_result") {
        const p = JSON.parse(m.content[0].content);
        assert.ok(isProjection(p), "every tool_result is a SealedProjection@1");
      }
    }
  }
  assert.throws(() => sealer.assure({ content: "raw" }), /unsealed/);
});

test("tools: real effects, workspace-bounded", async () => {
  const ws = tmpWs();
  const t = createAgentTools({ workspace: ws });
  const r = t.read({ path: "input.txt", limit: 5 });
  assert.equal(r.ok, true);
  assert.equal(r.result.content, "alpha");
  assert.equal(r.result.address, "perm:input.txt");
  const w = t.write({ path: "sub/out.txt", content: "hello" });
  assert.equal(w.ok, true);
  assert.equal(readFileSync(join(ws, "sub/out.txt"), "utf8"), "hello");
  assert.equal(t.write({ path: "../escape.txt" }).ok, false);
  assert.equal(t.read({ path: "../escape.txt" }).ok, false);
  const b = await t.bash({ command: "echo hi-$((1+1))" });
  assert.equal(b.ok, true);
  assert.ok(b.result.stdout.includes("hi-2"));
  assert.equal(toolDefs().length, 3);
});

test("Law 1: the same ask serves from the compiled lesson with ZERO frontier calls", async () => {
  const ws = tmpWs();
  const planner = scriptedPlanner([
    {
      text: "I will read then write.",
      toolCalls: [
        { id: "tu1", name: "read", input: { path: "input.txt" } },
        { id: "tu2", name: "write", input: { path: "result.txt", content: "alpha beta gamma" } },
      ],
    },
    { text: "done — result.txt written", toolCalls: [] },
  ]);
  const agent = createAgent({ workspace: ws, planner });
  const first = await agent.runTurn({ ask: "copy input.txt to result.txt", testCommand: null, sessionId: "s1" });
  assert.equal(first.outcome, "sealed");
  assert.equal(first.frontierCalls, 2);
  assert.ok(first.skill?.fingerprint);
  assert.equal(first.skill.standing, "provisional");
  assert.equal(readFileSync(join(ws, "result.txt"), "utf8"), "alpha beta gamma");

  const second = await agent.runTurn({ ask: "copy input.txt to result.txt", testCommand: null, sessionId: "s1" });
  assert.equal(second.servedBy, "lesson");
  assert.equal(second.frontierCalls, 0);
  assert.equal(planner.calls(), 2, "the second turn made no frontier call");
  assert.ok(second.parts[0].text.includes("alpha beta gamma") || second.parts[0].text === "done — result.txt written");

  const rec = readFileSync(join(ws, ".sealed-agent", "record.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(rec.length, 2);
  assert.equal(rec[0].outcome, "sealed");
  assert.equal(rec[1].outcome, "lesson");
});

test("demotion: a changed ground fails the replay and the lesson is demoted", async () => {
  const ws = tmpWs();
  const planner = scriptedPlanner([
    { text: "read", toolCalls: [{ id: "tu1", name: "read", input: { path: "input.txt" } }] },
    { text: "done keeping", toolCalls: [] },
  ]);
  const agent = createAgent({ workspace: ws, planner });
  const first = await agent.runTurn({ ask: "observe input.txt", testCommand: null, sessionId: "s2" });
  assert.equal(first.outcome, "sealed");
  writeFileSync(join(ws, "input.txt"), "CHANGED GROUND\n");

  planner.setScript([
    { text: "read again", toolCalls: [{ id: "tu3", name: "read", input: { path: "input.txt" } }] },
    { text: "done", toolCalls: [] },
  ]);
  const second = await agent.runTurn({ ask: "observe input.txt", testCommand: null, sessionId: "s2" });
  assert.equal(second.servedBy, "frontier");
  assert.ok(second.frontierCalls >= 1, "a changed ground licenses a fresh draw");
  const rec = readFileSync(join(ws, ".sealed-agent", "record.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(rec[1].outcome, "lesson_demoted");
  const store = createSkillStore({ workspace: ws });
  const all = store.all();
  assert.ok(all.some((s) => s.standing === "demoted"), "demoted lessons stay on the floor");
  assert.equal(all.filter((s) => s.standing === "demoted").length, 1);
  assert.ok(store.find(first.skill.fingerprint), "the re-taught class is found again (a fresh lesson supersedes)");
});

test("checks-before-plan: a failing declared test command compiles no lesson", async () => {
  const ws = tmpWs();
  const planner = scriptedPlanner([
    { text: "write", toolCalls: [{ id: "tu1", name: "write", input: { path: "made.txt", content: "x" } }] },
    { text: "done", toolCalls: [] },
  ]);
  const agent = createAgent({ workspace: ws, planner });
  const r = await agent.runTurn({ ask: "make made.txt", testCommand: "node -e \"process.exit(1)\"", sessionId: "s3" });
  assert.equal(r.outcome, "checks_failed");
  assert.equal(r.skill, null, "no lesson on red");
  planner.setScript([
    { text: "write", toolCalls: [{ id: "tu2", name: "write", input: { path: "made.txt", content: "x" } }] },
    { text: "done", toolCalls: [] },
  ]);
  const second = await agent.runTurn({ ask: "make made.txt", testCommand: "node -e \"process.exit(1)\"", sessionId: "s3" });
  assert.equal(second.servedBy, "frontier", "a red check never produces a lesson to serve");
});

test("a green declared test command gates a lesson and rides the replay", async () => {
  const ws = tmpWs();
  const planner = scriptedPlanner([
    { text: "write then verify", toolCalls: [{ id: "tu1", name: "write", input: { path: "flag.js", content: "console.log(7)" } }] },
    { text: "done — green check", toolCalls: [] },
  ]);
  const agent = createAgent({ workspace: ws, planner });
  const r = await agent.runTurn({ ask: "write flag.js", testCommand: "node flag.js", sessionId: "s4" });
  assert.equal(r.outcome, "sealed");
  assert.ok(r.skill?.tests?.includes("node flag.js"));
  const second = await agent.runTurn({ ask: "write flag.js", testCommand: "node flag.js", sessionId: "s4" });
  assert.equal(second.frontierCalls, 0);
  assert.equal(second.servedBy, "lesson");
});

test("sealed wire: sessions, opencode parts shape, history", async () => {
  const ws = tmpWs();
  const planner = scriptedPlanner([
    { text: "hello from the planner", toolCalls: [{ id: "tu1", name: "bash", input: { command: "pwd" } }] },
    { text: "done", toolCalls: [] },
  ]);
  const door = createSealedAgentServer({ port: 0, runsDir: join(ws, "runs"), planner });
  await door.listen();
  try {
    const p = door.server.address().port;
    const created = await (await fetch(`http://127.0.0.1:${p}/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ directory: ws, title: "wire test" }) })).json();
    assert.ok(created.id.startsWith("sea-"));
    const turned = await (await fetch(`http://127.0.0.1:${p}/session/${created.id}/message`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parts: [{ type: "text", text: "where am I?" }] }) })).json();
    assert.equal(turned.meta.outcome, "sealed");
    const textPart = turned.parts.find((x) => x.type === "text");
    assert.equal(textPart.text, "done");
    const toolPart = turned.parts.find((x) => x.type === "tool");
    assert.equal(toolPart.tool, "bash");
    assert.equal(typeof toolPart.state.status, "string");
    assert.ok(toolPart.state.title.includes("pwd"));
    const history = await (await fetch(`http://127.0.0.1:${p}/session/${created.id}/message`)).json();
    assert.equal(history.messages.length, 2);
    const ev = await fetch(`http://127.0.0.1:${p}/event`, { signal: AbortSignal.timeout(500) });
    assert.equal(ev.status, 200);
    assert.ok(ev.headers.get("content-type").includes("text/event-stream"));
  } finally {
    await door.close();
  }
});

test("necessity audit primitive: withholding the field falls through", async () => {
  const ws = tmpWs();
  const planner = scriptedPlanner([
    { text: "read", toolCalls: [{ id: "tu1", name: "read", input: { path: "input.txt" } }] },
    { text: "done", toolCalls: [] },
    { text: "read (withheld)", toolCalls: [{ id: "tu4", name: "read", input: { path: "input.txt" } }] },
    { text: "done", toolCalls: [] },
  ]);
  const agent = createAgent({ workspace: ws, planner });
  await agent.runTurn({ ask: "read input.txt", testCommand: null, sessionId: "s5" });
  const without = await agent.runTurn({ ask: "read input.txt", testCommand: null, sessionId: "s5", skipField: true });
  assert.equal(without.servedBy, "frontier", "with the field withheld the low rungs do not hold — the frontier lesson was necessary");
  assert.equal(planner.calls(), 4);
});

test("artifact store: three futures typed in the record", async () => {
  const ws = tmpWs();
  const sealer = createSealer({ auditPath: join(ws, ".sealed-agent", "audit.jsonl") });
  const planner = scriptedPlanner(
    [
      { text: "plan", toolCalls: [{ id: "tu1", name: "read", input: { path: "input.txt" } }] },
      { text: "done", toolCalls: [] },
    ],
    { sealer }
  );
  const agent = createAgent({ workspace: ws, planner, sealer });
  await agent.runTurn({ ask: "first ask", testCommand: null, sessionId: "s6" });
  const lines = readFileSync(join(ws, ".sealed-agent", "record.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(lines[0].outcome, "sealed");
  assert.ok(lines[0].usage.input >= 0);
  assert.ok(readdirSync(join(ws, ".sealed-agent")).includes("audit.jsonl"));
  assert.ok(readdirSync(join(ws, ".sealed-agent")).includes("skills.json"));
});

test("the surface: the opencode-style page and its files are served from the door", async () => {
  const ws = tmpWs();
  const door = createSealedAgentServer({ port: 0, runsDir: join(ws, "runs"), planner: scriptedPlanner([{ text: "d", toolCalls: [] }]) });
  await door.listen();
  try {
    const p = door.server.address().port;
    const page = await fetch(`http://127.0.0.1:${p}/`);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes("sealed agent"));
    const js = await fetch(`http://127.0.0.1:${p}/fold-agent.js`);
    assert.equal(js.status, 200);
    assert.ok((await js.text()).includes("opencode"));
    const health = await (await fetch(`http://127.0.0.1:${p}/health`)).json();
    assert.equal(health.schema, "SealedAgentDoor@1");
    assert.equal((await fetch(`http://127.0.0.1:${p}/../seal.mjs`)).status, 404, "no traversal");
  } finally {
    await door.close();
  }
});

test("abort: a hanging draw is interrupted on the opencode wire", async () => {
  const ws = tmpWs();
  // A draw that never settles: the withAbort race must interrupt it.
  const hang = { plan: () => new Promise(() => {}), calls: () => 1 };
  const door = createSealedAgentServer({ port: 0, runsDir: join(ws, "runs"), planner: hang });
  await door.listen();
  try {
    const p = door.server.address().port;
    const created = await (await fetch(`http://127.0.0.1:${p}/session`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
    const turn = fetch(`http://127.0.0.1:${p}/session/${created.id}/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parts: [{ type: "text", text: "slow turn" }] }),
    });
    await new Promise((r) => setTimeout(r, 120));
    await fetch(`http://127.0.0.1:${p}/session/${created.id}/abort`, { method: "POST", body: "{}" });
    const replied = await turn;
    assert.equal(replied.status, 499, "a stopped turn answers 499, never a partial verdict");
    assert.equal((await replied.json()).error, "cancelled");
  } finally {
    await door.close();
  }
});