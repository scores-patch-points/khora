// Falsification, END TO END: does the workplan carry typed phaseposts THROUGH THE DOOR and the PLAN,
// not just in the module? Drives the real door (opencode-doorway.mjs), the real plan graph
// (opencode-plan.mjs) and the real medium (opencode-worknotes.mjs). A red test is a FALSIFIED claim.
//
//   E1 the DOOR's marks are typed — every kind carries its phasepost
//   E2 the DOOR's claim is typed on the mark AND survives read()
//   E3 the DOOR's scent is a declared void on the trail, and it rides the note
//   E4 the PLAN graph stamps the cell on every node (open/resolved/refuted/blocked)
//   E5 the plan's helix is LOAD-BEARING: it holds for a well-ordered plan and catches a corrupted log
//   E6 FALSIFIER — every cell the whole workplan emits is one of the cube's 27 (no drift, end to end)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "wpe2e-"));
process.env.FOLD_WORKNOTES_DIR = ROOT;
process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "wpe2e-s-"));
process.env.FOLD_LOOK_IDLE_MS = "50";
process.env.FOLD_COMMONS_PROSIFY = "extractive"; // pin the extractive projection; penelope would be slow here

const door = await import("./opencode-doorway.mjs");
const W = await import("./opencode-worknotes.mjs");
const plan = await import("./opencode-plan.mjs");
const E = await import("./opencode-eot.mjs");
import * as cube from "./native/kernel/cube.js";

const CELLS = new Set(cube.algebraAddresses().map((c) => `${c.op}·${c.grain}`));
let n = 0;
const fresh = () => `e${process.pid}x${++n}`;
const repo = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "wpe2e-proj-")); fs.mkdirSync(path.join(d, ".git")); fs.mkdirSync(path.join(d, "src")); return d; };

test("E1 the DOOR writes a typed mark: every kind carries its phasepost", async () => {
  const task = fresh();
  const want = { fact: "DEF·Figure", claim: "INS·Figure", done: "EVA·Figure", block: "DEF·Ground" };
  for (const kind of ["fact", "claim", "done", "block"]) await door.answer({ event: "mark", task, agent: "a", kind, text: `${kind} via the door` });
  const marks = W.read({ task }).marks;
  for (const kind of ["fact", "claim", "done", "block"]) {
    const m = marks.find((x) => x.kind === kind);
    assert.ok(m, `the door wrote no ${kind} mark`);
    assert.equal(m.cell, want[kind], `the door's ${kind} mark carried ${m.cell}`);
  }
});

test("E2 the DOOR's claim is typed on the mark AND survives read()", async () => {
  const task = fresh();
  const r = await door.answer({ event: "claim", task, agent: "A", item: "migrate users" });
  assert.equal(r.ok, true, "the door refused the claim");
  const mark = W.read({ task }).marks.find((m) => m.kind === "claim");
  assert.equal(mark?.cell, "INS·Figure", "the claim mark is not a birth");
  const open = W.read({ task }).open.find((c) => c.item === "migrate users");
  assert.equal(open?.cell, "INS·Figure", "the open claim dropped its cell in read()");
});

test("E3 the DOOR's scent is a declared void on the trail, and it rides the note", async () => {
  const task = fresh();
  await door.answer({ event: "scent", task, agent: "a", q: "where is the parser", at: "turn 3" });
  const trail = W.scentsOf({ task });
  assert.equal(trail[0]?.cell, "DEF·Ground", "the door's open scent is not a declared void");
  const out = await door.answer({ event: "surf", task, sessionID: "a", ask: "x", turns: [] });
  assert.match(out.note ?? "", /<fold-trail>/, "the trail did not ride the note");
});

test("E4 the PLAN graph stamps the cell on every node (open/resolved/refuted/blocked)", () => {
  const task = fresh();
  const a = plan.planCreate({ task, goal: "fix parser" });
  const b = plan.planCreate({ task, goal: "add tests" });
  plan.planDep({ task, from: a.id, to: b.id });
  plan.planResolve({ task, id: a.id, evidence: "tests green" });
  plan.planRefute({ task, id: b.id, reason: "not needed" });
  const c = plan.planCreate({ task, goal: "assume X" });
  const d = plan.planCreate({ task, goal: "build on X" });
  plan.planDep({ task, from: c.id, to: d.id });
  plan.planRefute({ task, id: c.id });
  const nodes = plan.planView({ task }).nodes;
  const cell = (id) => nodes.find((x) => x.id === id)?.cell;
  assert.equal(cell(a.id), "EVA·Figure", "a resolved node is not judged");
  assert.equal(cell(b.id), "SEG·Figure", "a refuted node is not the cut");
  assert.equal(cell(d.id), "CON·Figure", "a blocked node is not an unbound bond");
});

test("E5 the plan's helix is LOAD-BEARING: clean when ordered, red when the log is corrupted", () => {
  const task = fresh();
  const a = plan.planCreate({ task, goal: "one" });
  plan.planResolve({ task, id: a.id });
  assert.equal(plan.planView({ task }).helix.ok, true, "a well-ordered plan failed its own helix");
  const f = path.join(W.taskDir(task), "plan.json");
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  p.log = [{ resolution: "plan:resolved", target: "ghost", at: new Date().toISOString() }];
  fs.writeFileSync(f, JSON.stringify(p));
  const h = plan.planView({ task }).helix;
  assert.equal(h.ok, false, "a resolve-before-open was NOT caught by the helix");
  assert.match(h.violations[0].why, /never instantiated|ever claimed/);
});

test("E6 FALSIFIER: every cell the whole workplan emits is one of the cube's 27", async () => {
  const task = fresh();
  for (const kind of ["fact", "claim", "done", "block"]) W.mark({ task, agent: "a", kind, text: kind });
  W.scent({ task, agent: "a", q: "q", at: "t1" });
  W.claim({ task, agent: "b", item: "x" });
  const a = plan.planCreate({ task, goal: "g" });
  plan.planResolve({ task, id: a.id });
  const emitted = [
    ...W.read({ task }).marks.map((m) => m.cell),
    ...W.read({ task }).open.map((c) => c.cell),
    ...W.scentsOf({ task }).map((s) => s.cell),
    ...plan.planView({ task }).nodes.map((x) => x.cell),
  ].filter(Boolean);
  assert.ok(emitted.length >= 8, `too few cells emitted: ${emitted.length}`);
  for (const c of emitted) assert.ok(CELLS.has(c), `${c} is not one of the cube's 27`);
});

test("E7 the DOOR's note surfaces the phasepost on the taken line", async () => {
  const ws = repo();
  const file = path.join(ws, "src", "lexer.js");
  fs.writeFileSync(file, "x");
  await door.answer({ event: "event", sessionID: "ses_e7A", type: "session.tool.input.started", data: { id: "e7c1", name: "edit" } });
  await door.answer({ event: "event", sessionID: "ses_e7A", type: "session.tool.called", data: { id: "e7c1", input: { filePath: file } } });
  const s = await door.answer({ event: "surf", sessionID: "ses_e7B", workspace: ws, ask: "lexer", turns: [{ n: 1, ask: "a", answer: "b" }, { n: 2, ask: "c", answer: "d" }] });
  assert.match(s.note ?? "", /taken: edit src\/lexer\.js \[[^\]]*\] \(INS·Figure\)/, `the cell did not ride the note: ${s.note}`);
});

test("E8 the EOT record's event rows carry the phasepost of their stage", () => {
  const task = fresh();
  E.recordClaim({ task, agent: "A", item: "x", ttlMs: 1000, now: 5 });
  E.recordMark({ task, agent: "A", kind: "block", text: "blocked on the network" });
  E.recordMark({ task, agent: "A", kind: "claim", text: "take it" });
  const { events } = E.read(task);
  assert.equal(events.find((e) => e.stage === "claim")?.cell, "INS·Figure", "a claim event is not a birth");
  assert.equal(events.find((e) => e.stage === "mark" && e.detail?.kind === "block")?.cell, "DEF·Ground", "a block mark event is not a declared void");
  assert.equal(events.find((e) => e.stage === "mark" && e.detail?.kind === "claim")?.cell, "INS·Figure", "a claim mark event is not a birth");
});

test("E9 a contention writes the CONTEST (CON·Figure), not a bare block", async () => {
  const ws = repo();
  const file = path.join(ws, "src", "parse.js");
  fs.writeFileSync(file, "x");
  const edit = async (sid, id) => {
    await door.answer({ event: "event", sessionID: sid, type: "session.tool.input.started", data: { id, name: "edit" } });
    await door.answer({ event: "event", sessionID: sid, type: "session.tool.called", data: { id, input: { filePath: file } } });
  };
  await edit("ses_e9A", "e9c1");
  await edit("ses_e9B", "e9c2"); // B on A's live claim → contention
  const task = W.projectKey(ws);
  const mark = W.read({ task }).marks.find((m) => m.kind === "block" && String(m.text).startsWith("contended:"));
  assert.ok(mark, "no contention mark was written");
  assert.equal(mark.cell, "CON·Figure", "the contention is not typed as the contest");
});

test("E10 the mechanical ascent releases BY MERGE (SYN·Ground), distinguishable from a reframe", () => {
  const task = fresh();
  W.writeTurnsFile({ file: W.turnsFile(task, "b"), agent: "b", turns: [{ n: 1, ask: "where is the parser defined", grounds: [], answer: "lib/p.js holds it" }] });
  W.scent({ task, agent: "a", q: "where is the parser defined", at: "turn 3", now: 1000 });
  const r = W.releaseByMerge({ task, now: 2000 });
  assert.equal(r.released, 1, "the ascent released nothing");
  const raw = fs.readFileSync(path.join(W.taskDir(task), "scents", "a.md"), "utf8");
  assert.match(raw, /released · cell=SYN·Ground · passes=\d+ · by=merge/, `the merge was not typed: ${raw}`);
});

test("cleanup", () => fs.rmSync(ROOT, { recursive: true, force: true }));