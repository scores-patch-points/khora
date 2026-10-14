// cli/tests/cennini-ladder.test.mjs — the ladder, tested with a fake door that returns canned answers.
// A fake door makes `live` false, so nothing here is evidence about the real door; it proves the LADDER's logic: what each
// rung wins, what it costs, and what is recorded as lost. The one real answer (LOST_ANSWER) is kept verbatim.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PANEL } from "../cennini-assemble.mjs";
import { ladderRun, attemptOf, summarize, SURFACE } from "../cennini-ladder.mjs";
import { parseProposal } from "../../native/the-fold/code-loop.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ask = (id) => PANEL.find((a) => a.id === id);

// verbatim: gemma2:2b via the Fold's door, 2026-10-13, for the `total` ask — right function, ADD with no FIND
const LOST_ANSWER = "ACTION: patch\nPATH: cart.mjs\n<<<ADD>>>\nexport function formatTotal(items) {\n  let total = 0;\n  for (const item of items) {\n    total += item.price;\n  }\n  return `$${total.toFixed(2)}`;\n}\n<<<END>>> \n";
const ADD_NO_IMPORT = '<<<ADD>>>\nexport function formatTotal(items) {\n  return "$" + sum(items.map((i) => i.price)).toFixed(2);\n}\n<<<END>>>';
const FIND_ADD_NO_IMPORT = 'PATH: cart.mjs\n<<<FIND>>>\nexport function formatTotal() {\n  throw new Error("TODO: formatTotal");\n}\n<<<ADD>>>\nexport function formatTotal(items) {\n  return "$" + sum(items.map((i) => i.price)).toFixed(2);\n}\n<<<END>>>';
const EVEN_ADD = "<<<ADD>>>\nexport function isEven(n) {\n  return n % 2 === 0;\n}\n<<<END>>>";

/** a fake door: returns `raw` as round 1; optionally leaves a file on disk and says done (an attempt the door kept) */
const door = (raw, { done = false, write = null, gap = null } = {}) => async (_url, init) => {
  const { workspace, task, testCommand, maxRounds } = JSON.parse(init.body);
  const a = PANEL.find((x) => x.task === task);
  door.last = { testCommand, maxRounds };
  if (write) fs.writeFileSync(path.join(workspace, a.target), write);
  return { ok: true, status: 200, json: async () => ({ done, rounds: [{ round: 1, raw, ...(gap ? { gap: { kind: gap } } : {}) }] }) };
};
const run = (id, fetchImpl, o = {}) => ladderRun({ ask: ask(id), fetchImpl, parse: parseProposal, ...o });

test("a signed panel is recorded as signed and the door's workspace holds the stated signature", async () => {
  let seen = null;
  const spy = async (url, init) => {
    const { workspace } = JSON.parse(init.body);
    seen = fs.readFileSync(path.join(workspace, "stats.mjs"), "utf8");
    return door("")(url, init);
  };
  const r = await run("mean", spy, { signed: true });
  assert.equal(r.signed, true);
  assert.match(seen, /export function mean\(xs\) \{/);
  const u = await run("mean", spy);
  assert.equal(u.signed, false);
  assert.match(seen, /export function mean\(\) \{/);
});

test("the door is given its OWN real test and one draw — never a stub marker", async () => {
  await run("total", door(LOST_ANSWER, { gap: "unparsed_proposal" }));
  assert.equal(door.last.testCommand, "node test.mjs");
  assert.equal(door.last.maxRounds, 1);
});

test("THE LOST ANSWER: the door kept nothing (A fails); the receiver takes the ADD-only block (R passes); FINISH has nothing to add", async () => {
  const r = await run("total", door(LOST_ANSWER, { gap: "unparsed_proposal" }));
  assert.equal(r.live, false);
  assert.equal(r.answer.gap, "unparsed_proposal");
  assert.equal(r.A.pass, false, "the door reverted / kept nothing");
  assert.equal(r.attempt.made, true);
  assert.equal(r.attempt.via, "add-only");
  assert.equal(r.R.pass, true, "the right function, once received");
  assert.deepEqual(r.F.proposals, []);
  assert.equal(r.F.pass, true);
});

test("an attempt that forgot the import: A and R fail, FINISH wins it, and the wrong world does NOT (the control built to fail)", async () => {
  const r = await run("total", door(ADD_NO_IMPORT, { gap: "unparsed_proposal" }));
  assert.equal(r.A.pass, false);
  assert.equal(r.R.pass, false, "received, still unbound");
  assert.equal(r.F.pass, true);
  assert.deepEqual(r.F.proposals.map((p) => [p.kind, p.name, p.spec]), [["import", "sum", "./numbers.mjs"]]);
  assert.equal(r.C.pass, false, "completed against the wrong world it stays broken, so F's win was about the files the session holds");
  assert.equal(r.needsBound, false);
});

test("the door's own grammar is used first: a FIND/ADD answer is applied by its FIND, via 'door-grammar'", async () => {
  const r = await run("total", door(FIND_ADD_NO_IMPORT));
  assert.equal(r.attempt.via, "door-grammar");
  assert.equal(r.R.pass, false);
  assert.equal(r.F.pass, true);
});

test("an attempt the door itself kept is graded as it is: via 'door', A passes, and no rung changes it", async () => {
  const kept = 'import { sum } from "./numbers.mjs";\n\nexport function formatTotal(items) {\n  return "$" + sum(items.map((i) => i.price)).toFixed(2);\n}\n';
  const r = await run("total", door("", { done: true, write: kept }));
  assert.equal(r.door.done, true);
  assert.equal(r.attempt.via, "door");
  assert.equal(r.A.pass, true);
  assert.equal(r.R.pass, true);
  assert.equal(r.F.pass, true);
  assert.deepEqual(r.F.proposals, []);
  assert.equal(r.needsBound, true);
});

test("an answer nothing can read is LOST with its typed reason, and no rung is faked", async () => {
  for (const [raw, why] of [["", "no-add-block"], ["I think you should add a function.", "no-add-block"], ["<<<ADD>>>\nconsole.log(1)\nexport function formatTotal(){}\n<<<END>>>", "undeclared-text"]]) {
    const r = await run("total", door(raw, { gap: "unparsed_proposal" }));
    assert.equal(r.attempt.made, false);
    assert.equal(r.attempt.lost, why);
    assert.equal(r.R, null);
    assert.equal(r.F, null);
    assert.equal(r.A.pass, false);
  }
});

test("a FIND that is not in the file is lost as 'find-unlocated' (the door's own gap), never repaired by guessing", () => {
  const got = attemptOf({ raw: "PATH: cart.mjs\n<<<FIND>>>\nnot in the file\n<<<ADD>>>\nx\n<<<END>>>", before: "export function a() {}\n", file: "/w/cart.mjs", parse: parseProposal, target: "cart.mjs" });
  assert.deepEqual([got.attempt, got.gap], [null, "find-unlocated"]);
});

test("CONTROL ASK: a self-contained answer needs nothing from FINISH and FINISH proposes nothing", async () => {
  const r = await run("even", door(EVEN_ADD, { gap: "unparsed_proposal" }));
  assert.equal(r.control, true);
  assert.equal(r.R.pass, true);
  assert.equal(r.F.pass, true);
  assert.deepEqual(r.F.proposals, []);
  assert.equal(r.F.changed, false);
});

test("a door that fails is recorded as a failure, never a pass; a fake door is never live; the surface is named", async () => {
  const r = await run("total", async () => ({ ok: false, status: 503, json: async () => ({}) }));
  assert.equal(r.door.ok, false);
  assert.match(r.door.error, /503/);
  assert.equal(r.attempt.lost, "door-failed");
  assert.equal(r.live, false);
  assert.equal(r.surface, SURFACE);
});

test("LOOK is real in the ladder: the file the ask names is ranked first", async () => {
  const r = await run("greeting", door(""));
  assert.equal(r.looked.found, true);
  assert.equal(r.looked.top, "greet.mjs");
});

test("summarize: wins by rung, harm by rung, the wrong world, what was lost; fake runs are never live", async () => {
  const recs = [
    await run("total", door(LOST_ANSWER, { gap: "unparsed_proposal" })),     // won by receive
    await run("mean", door('<<<ADD>>>\nexport function mean(xs) {\n  return sum(xs) / count(xs);\n}\n<<<END>>>', { gap: "unparsed_proposal" })), // won by finish
    await run("slug", door("", { gap: "unparsed_proposal" })),               // lost
    await run("even", door(EVEN_ADD, { gap: "unparsed_proposal" })),         // control, won by receive
  ];
  assert.equal(summarize(recs).live, 0);
  assert.equal(summarize(recs).all.n, 0, "fixtures are never evidence");
  const s = summarize(recs.map((r) => ({ ...r, live: true })));
  assert.equal(s.all.n, 4);
  assert.equal(s.all.A, 0);
  assert.equal(s.all.R, 2);
  assert.equal(s.all.F, 3);
  assert.equal(s.all.wonByReceive, 2);
  assert.equal(s.all.wonByFinish, 1);
  assert.equal(s.all.harmedByReceive, 0);
  assert.equal(s.all.harmedByFinish, 0);
  assert.equal(s.all.C_wouldFix, 0);
  assert.deepEqual(s.lost, { "no-add-block": 1 });
  assert.deepEqual(s.via, { "add-only": 3 });
  assert.deepEqual([s.control.n, s.control.wonByReceive], [1, 1]);
});

test("the driver uses no token, writes no records inside the repo, and removes its workspace", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "cennini-ladder.mjs"), "utf8");
  assert.doesNotMatch(src, /x-heimdall-token|\.heimdall|HEIMDALL_TOKEN/i);
  assert.match(src, /refusing to write run records inside the khora repo/);
  assert.match(src, /rmSync\(workspace/);
});
