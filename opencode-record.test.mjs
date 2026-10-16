import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "rec-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const R = await import("./opencode-record.mjs");
const lines = (d, task) => fs.readFileSync(path.join(d, task, "LOG.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

test("exit 0 is kept as an EOT block; nonzero is reverted with no block", () => {
  const d = fresh();
  const bad = R.admit({ task: "t", agent: "a", referent: "retry@1", delta: "maxRetries 3", check: "bun test retry", exitCode: 1 });
  assert.equal(bad.kept, false);
  assert.equal(R.fold({ task: "t" }).length, 0);
  const ok = R.admit({ task: "t", agent: "a", referent: "retry@1", delta: "maxRetries 3", check: "bun test retry", exitCode: 0 });
  assert.equal(ok.kept, true);
  assert.deepEqual(R.fold({ task: "t" }).map((b) => b.referent), ["retry@1"]);
  const log = lines(d, "t");
  assert.deepEqual(log.map((l) => l.verdict), ["reverted", "green"]);
  assert.equal(log[1].judge, "reported");
});

test("no judge, no keep; the door runs the check itself only when opted in", () => {
  fresh();
  assert.equal(R.admit({ task: "t", agent: "a", referent: "x", delta: "d", check: "true" }).gap, "no-judge");
  delete process.env.FOLD_REC_EXEC;
  assert.equal(R.admit({ task: "t", agent: "a", referent: "x", delta: "d", check: "true", cwd: os.tmpdir() }).gap, "no-judge");
  process.env.FOLD_REC_EXEC = "1";
  try {
    const g = R.admit({ task: "t", agent: "a", referent: "x", delta: "d", check: "true", cwd: os.tmpdir() });
    assert.equal(g.kept, true); assert.equal(g.judge, "box");
    const r = R.admit({ task: "t", agent: "a", referent: "y", delta: "d", check: "echo boom >&2; exit 3", cwd: os.tmpdir() });
    assert.equal(r.kept, false); assert.equal(r.exitCode, 3); assert.match(r.tail, /boom/);
  } finally { delete process.env.FOLD_REC_EXEC; }
});

test("redefining a referent supersedes, and the fold is last-wins", () => {
  fresh();
  const a = R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  const b = R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2 with jitter", check: "c", exitCode: 0, now: 2000 });
  const all = R.blocks("t");
  assert.equal(all.length, 2);
  assert.equal(all[1].supersedes, a.id);
  assert.equal(R.fold({ task: "t" })[0].delta[0], "v2 with jitter");
  assert.match(R.recordNote({ task: "t" }), /retry \[.*\]: v2 with jitter/);
});

test("reconcile folds the heap: a redefinition is a supersession, absorbed — not a contradiction", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2 with jitter", check: "c", exitCode: 0, now: 2000 });
  R.admit({ task: "t", agent: "c", referent: "other", delta: "x", check: "c", exitCode: 0, now: 3000 });
  const all = R.blocks("t");
  const r = R.reconcile({ task: "t" });
  // fold: last-wins per referent, in first-appearance order
  assert.deepEqual(r.fold.map((b) => b.referent), ["retry", "other"]);
  assert.equal(r.fold[0].delta[0], "v2 with jitter");
  // supersession edges: the surviving block redefined the one it superseded
  assert.deepEqual(r.supersedes, [{ referent: "retry", superseded: all[0].id, supersededBy: all[1].id }]);
  // a clean sequential redefinition is progress, not a contradiction
  assert.deepEqual(r.disagreements, [], "a supersession absorbs the fact-change");
});

test("reconcile: a parallel answer (no supersession) is a contradiction, kept parallel", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2", check: "c", exitCode: 0, now: 2000, parallel: true });
  const all = R.blocks("t");
  const r = R.reconcile({ task: "t" });
  assert.equal(all[1].supersedes, "none", "the parallel block declines to supersede");
  assert.deepEqual(r.supersedes, [], "a parallel answer does not supersede");
  assert.deepEqual(r.disagreements, [{ referent: "retry", answers: ["v1", "v2"] }]);
});

test("reconcile is quiet when a referent is re-asserted identically or answered once", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "same", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "same", check: "c", exitCode: 0, now: 2000 });
  R.admit({ task: "t", agent: "c", referent: "other", delta: "x", check: "c", exitCode: 0, now: 3000 });
  const r = R.reconcile({ task: "t" });
  assert.equal(r.disagreements.length, 0, "identical re-assertion is not a contradiction");
  assert.equal(r.fold.length, 2);
});

test("nextVoid nominates the single open void from the record, with a record basis and no model", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "slot", delta: "body", check: "c", exitCode: 0, provisional: true, now: 1000 });
  const v = R.nextVoid({ task: "t" });
  assert.equal(v.kind, "carried");
  assert.equal(v.referent, "slot");
  assert.equal(v.model, null, "the DEF never invokes a model");
  assert.ok(v.basis.length > 0, "every DEF cites record entries");
  assert.match(JSON.stringify(v.basis), /slot/);
});

test("nextVoid: a refuted draw precedes a provisional one; a green block closes the void", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "x", delta: "bad", check: "c", exitCode: 1, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "y", delta: "half", check: "c", exitCode: 0, provisional: true, now: 2000 });
  let v = R.nextVoid({ task: "t" });
  assert.equal(v.kind, "reverted");
  assert.equal(v.referent, "x");
  // a green block for x closes the reverted void, exposing the carried one
  R.admit({ task: "t", agent: "c", referent: "x", delta: "good", check: "c", exitCode: 0, now: 3000 });
  v = R.nextVoid({ task: "t" });
  assert.equal(v.kind, "carried");
});

test("nextVoid: a redefinition is progress, not reopen — the record stays settled", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2", check: "c", exitCode: 0, now: 2000 });
  assert.equal(R.nextVoid({ task: "t" }).void, null, "a supersession is last-wins, not a fork");
});

test("nextVoid: a parallel fork is reopen, kept parallel, never resolved", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2", check: "c", exitCode: 0, now: 2000, parallel: true });
  const v = R.nextVoid({ task: "t" });
  assert.equal(v.kind, "reopen");
  assert.deepEqual(v.answers, ["v1", "v2"], "both answers kept, never merged");
  assert.equal(v.basis.length, 2, "both record entries cited");
  assert.equal(v.model, null);
});

test("nextVoid is quiet when the record is settled", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "x", delta: "d", check: "c", exitCode: 0 });
  assert.equal(R.nextVoid({ task: "t" }).void, null);
});

test("two processes recording different referents keep every block intact", async () => {
  const d = fresh();
  const MOD = path.join(HERE, "opencode-record.mjs");
  const run = (name) => new Promise((res) => {
    const p = spawn(process.execPath, ["--input-type=module", "-e",
      `import { admit } from ${JSON.stringify(MOD)}; for (let i = 0; i < 40; i++) admit({ task: "p", agent: "${name}", referent: "${name}-" + i, delta: "d" + i, check: "c", exitCode: 0 });`],
      { env: { ...process.env, FOLD_WORKNOTES_DIR: d } });
    p.on("exit", res);
  });
  await Promise.all([run("A"), run("B"), run("C")]);
  assert.equal(R.fold({ task: "p" }).length, 120);
  assert.equal(lines(d, "p").length, 120);
});

test("surf's note carries the verified record", async () => {
  const d = fresh();
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
  const r1 = await answer({ event: "admit", task: "t", agent: "s", referent: "lexer@2", delta: "fix in tokens.js", check: "bun test lexer", exitCode: 0 });
  assert.equal(r1.kept, true);
  const turns = [1, 2, 3].map((n) => ({ n, ask: `ask ${n}`, answer: `answer ${n}`, grounds: [] }));
  const r = await answer({ event: "surf", sessionID: "s", task: "t", ask: "q", turns });
  assert.match(r.note, /<fold-mechanical>[\s\S]*verified: [^\n]*lexer@2/);
  void d;
});

test("admit records EVA reasoning with provenance and the draw's model disclosed", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "bun test", exitCode: 1, model: "gemma2:2b" });
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v2", check: "bun test", exitCode: 0, model: "gemma2:2b" });
  const rs = R.reasoning({ task: "t" }).filter((r) => r.op === "EVA");
  assert.equal(rs.length, 2);
  assert.deepEqual(rs.map((r) => r.rule), ["revert", "admit"]);
  assert.equal(rs[1].model, "gemma2:2b", "the draw's model is disclosed, never a reasoner");
  assert.equal(rs[1].basis[0].check, "bun test");
  assert.equal(rs[1].basis[0].judge, "reported");
  assert.equal(rs[1].basis[0].prior, "none");
  assert.equal(rs[1].to.verdict, "green");
});

test("nextVoid records DEF reasoning — the nomination is queryable, model null", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "slot", delta: "body", check: "c", exitCode: 0, provisional: true });
  R.nextVoid({ task: "t" });
  const rs = R.reasoning({ task: "t" }).filter((r) => r.op === "DEF");
  assert.equal(rs.length, 1);
  assert.equal(rs[0].rule, "carried");
  assert.equal(rs[0].model, null, "the DEF never invokes a model");
  assert.match(JSON.stringify(rs[0].basis), /slot/);
  assert.equal(rs[0].to.referent, "slot");
});

test("reconcile records REC reasoning: supersession on a redefinition, model null", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2", check: "c", exitCode: 0, now: 2000 });
  R.reconcile({ task: "t" });
  const rs = R.reasoning({ task: "t" }).filter((r) => r.op === "REC");
  const rules = rs.map((r) => r.rule);
  assert.deepEqual(rules, ["supersede"], "a clean redefinition records only the supersession edge");
  assert.ok(rs.every((r) => r.model === null), "the fold is arithmetic, never a model's judgment");
});

test("reconcile records REC reasoning: a parallel fork is a contradiction, model null", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2", check: "c", exitCode: 0, now: 2000, parallel: true });
  R.reconcile({ task: "t" });
  const rs = R.reasoning({ task: "t" }).filter((r) => r.op === "REC");
  const rules = rs.map((r) => r.rule);
  assert.deepEqual(rules, ["contradiction"], "a parallel fork records the contradiction, never a supersession");
  assert.ok(rs.every((r) => r.model === null), "the fold is arithmetic, never a model's judgment");
});

test("reasonFor folds and surfaces the reasoning with provenance, never silence", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  R.admit({ task: "t", agent: "b", referent: "retry", delta: "v2", check: "c", exitCode: 0, now: 2000 });
  R.reconcile({ task: "t" });
  const q = R.reasonFor({ task: "t", ask: "why did retry change", limit: 6 });
  assert.match(q.note, /<fold-reasoning/);
  assert.match(q.note, /retry/);
  assert.ok(q.provenance >= 1);
  // an ask that matches nothing still shows the newest, never silence
  const q2 = R.reasonFor({ task: "t", ask: "zzz no such referent", limit: 6 });
  assert.match(q2.note, /<fold-reasoning/);
  assert.ok(q2.steps.length > 0);
});

test("the door answers event:reason from the reasoning trace", async () => {
  const d = fresh();
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
  await answer({ event: "admit", task: "t", agent: "s", referent: "lexer@2", delta: "fix", check: "bun test", exitCode: 0 });
  const r = await answer({ event: "reason", task: "t", ask: "lexer" });
  assert.match(r.note, /<fold-reasoning/);
  assert.match(r.note, /lexer@2/);
  void d;
});

// PROOF: the reasoning trace improves prompting, and stays small.
// The null is dumping raw REASON.jsonl into the prompt — it grows one line per
// step, unbounded. reasonFor's fold keeps the prompt bounded (latest per
// referent:op:rule, so repeats collapse to one survivor and superseded "why"
// collapses to the current one) while the live referent and its provenance stay
// present, so the model gets "why, once, drillable" instead of "why, N times".
test("reasonFor keeps the prompt small and current as the reasoning trace grows", () => {
  fresh();
  R.admit({ task: "t", agent: "a", referent: "slot", delta: "body", check: "c", exitCode: 0, provisional: true, now: 1000 });
  for (let i = 0; i < 200; i++) R.nextVoid({ task: "t" }); // 200 identical re-nominations
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 2000 });
  R.admit({ task: "t", agent: "a", referent: "retry", delta: "v2", check: "c", exitCode: 0, now: 3000 });
  R.reconcile({ task: "t" });
  const raw = R.reasoning({ task: "t" });
  // the raw trace grows one line per repeat…
  assert.equal(raw.filter((r) => r.op === "DEF" && r.rule === "carried").length, 200, "raw grows with every repeat");
  const q = R.reasonFor({ task: "t", ask: "", limit: 6 });
  // …but the prompt stays bounded: shown steps capped by limit, note tiny,
  // strictly smaller than the raw trace it replaces — the fold beats the null.
  assert.ok(q.steps.length <= 6, "shown steps are bounded by limit, whatever N");
  assert.ok(q.note.length < JSON.stringify(raw).length, "the folded prompt is smaller than the raw trace it replaces");
  assert.ok(q.note.length < 600, "…and stays tiny");
  // nothing essential is lost: the live referent and its provenance are still there
  assert.match(q.note, /`slot`/);
  assert.match(q.note, /from slot/);
  // superseded reasoning collapses to the current survivor — one admit, not two
  assert.equal((q.note.match(/EVA admit `retry`/g) ?? []).length, 1, "superseded reasoning collapses to the current survivor");
});

test("adapter: a supersede is a REC that deriveSurprise sees; a new referent is a DEF; EVA precedes", async () => {
  const { deriveSurprise } = await import("./native/kernel/dynamics.js");
  fresh();
  R.admit({ task: "t", agent: "a", referent: "retry@1", delta: "maxRetries 3", check: "bun test retry", exitCode: 0 });
  R.admit({ task: "t", agent: "a", referent: "other@1", delta: "x", check: "bun test o", exitCode: 0 });
  const first = R.blocks("t");
  const { operations: ops0 } = R.blocksToOperations(first);
  assert.deepEqual(ops0.map((o) => o.operator), ["EVA", "DEF", "EVA", "DEF"]);
  assert.equal(deriveSurprise(R.blocksToOperations(first)).recanonicalizations.length, 0);
  R.admit({ task: "t", agent: "a", referent: "retry@1", delta: "maxRetries 5", check: "bun test retry", exitCode: 0, supersedes: first[0].id });
  const all = R.blocks("t");
  const s = deriveSurprise(R.blocksToOperations(all));
  const supersedeCount = all.filter((b) => b.supersedes !== "none").length;
  assert.equal(supersedeCount, 1, "fixture must contain a supersede");
  assert.equal(s.recanonicalizations.length, 1);
  assert.deepEqual(s.recanonicalizations[0].inputs, [first[0].id]);
});

test("adapter mutation check: with supersedes ignored, the REC test would fail", () => {
  const blk = [{ id: "e1", referent: "r", supersedes: "none", delta: ["a"], check: "c" }, { id: "e2", referent: "r", supersedes: "e1", delta: ["b"], check: "c" }];
  const broken = blk.map((b) => ({ ...b, supersedes: "none" }));
  assert.equal(R.blocksToOperations(blk).operations.filter((o) => o.operator === "REC").length, 1);
  assert.equal(R.blocksToOperations(broken).operations.filter((o) => o.operator === "REC").length, 0);
});
