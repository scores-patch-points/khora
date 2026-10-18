import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "eco-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };

const wn = await import("./opencode-worknotes.mjs");
const plan = await import("./opencode-plan.mjs");
const eco = await import("./opencode-ecology.mjs");
const dream = await import("./opencode-dream.mjs");
const act = await import("./opencode-activation-score.mjs");
const sm = await import("./opencode-self-monitor.mjs");

test("activation A = R*U*C - K, clamped inputs", () => {
  assert.equal(act.activation({ R: 1, U: 1, C: 1, K: 0 }), 1);
  assert.equal(act.activation({ R: 1, U: 1, C: 1, K: 1 }), 0);
  assert.equal(act.activation({ R: 2, U: 2, C: 2, K: 0 }), 1); // clamped to 1
  assert.ok(act.activation({ R: 0.5, U: 0.5, C: 0.5, K: 0.1 }) < 0.5);
});

test("rankActions orders by activation desc", () => {
  const r = act.rankActions([
    { id: "a", R: 0.1, U: 0.1, C: 0.1, K: 0 },
    { id: "b", R: 1, U: 1, C: 1, K: 0 },
  ]);
  assert.equal(r[0].id, "b");
});

test("scopeOf escalates by signal", () => {
  assert.equal(act.scopeOf({}), "local");
  assert.equal(act.scopeOf({ reopenCount: 3 }), "task");
  assert.equal(act.scopeOf({ duplicateCount: 1 }), "session");
  assert.equal(act.scopeOf({ recurringFailureCount: 1 }), "project");
  assert.equal(act.scopeOf({ mechanismFailureCount: 1 }), "system");
});

test("plan: create, dep, resolve keeps dependents open", () => {
  fresh();
  const a = plan.planCreate({ task: "p", goal: "fix parser" });
  const b = plan.planCreate({ task: "p", goal: "add tests" });
  assert.ok(a.ok && b.ok);
  assert.ok(plan.planDep({ task: "p", from: a.id, to: b.id }).ok);
  plan.planResolve({ task: "p", id: a.id, evidence: "tests green" });
  const nodes = plan.planView({ task: "p" }).nodes;
  assert.equal(nodes.find((n) => n.id === a.id).status, "resolved");
  assert.equal(nodes.find((n) => n.id === b.id).status, "open");
});

test("plan: refuting a node blocks its dependents (mechanical)", () => {
  fresh();
  const a = plan.planCreate({ task: "p2", goal: "assume X" });
  const b = plan.planCreate({ task: "p2", goal: "build on X" });
  plan.planDep({ task: "p2", from: a.id, to: b.id });
  plan.planRefute({ task: "p2", id: a.id, reason: "X false" });
  const nodes = plan.planView({ task: "p2" }).nodes;
  assert.equal(nodes.find((n) => n.id === b.id).status, "blocked");
  assert.equal(nodes.find((n) => n.id === b.id).blockedBy, a.id);
});

test("plan: next returns a ready open node, none when all blocked/refuted", () => {
  fresh();
  const a = plan.planCreate({ task: "p3", goal: "a" });
  const b = plan.planCreate({ task: "p3", goal: "b" });
  plan.planDep({ task: "p3", from: a.id, to: b.id });
  assert.equal(plan.planNext({ task: "p3" }).node.id, a.id); // b not ready (a unresolved)
  plan.planRefute({ task: "p3", id: a.id });
  assert.equal(plan.planNext({ task: "p3" }).ok, false); // b blocked
});

test("ecology: workers leave traces; meta-worker nominates a goal from recurrence", () => {
  fresh();
  eco.workerAct({ task: "e", agent: "w1", observation: "parser module broken" });
  eco.workerAct({ task: "e", agent: "w2", observation: "parser module flaky" });
  eco.workerAct({ task: "e", agent: "w3", observation: "parser module slow" });
  const m = eco.metaWorkerTick({ task: "e" });
  assert.ok(m.recurring.includes("parser"));
  assert.ok(m.plan.ok);
  const view = plan.planView({ task: "e" });
  assert.equal(view.nodes.length, 1);
});

test("dream: promotes recurrence with >=2 witnesses, appends only (monotone)", () => {
  fresh();
  wn.mark({ task: "d", agent: "a", kind: "fact", text: "lexer needs rewrite" });
  wn.mark({ task: "d", agent: "b", kind: "fact", text: "lexer is slow" });
  const before = wn.read({ task: "d" }).marks.length;
  const r = dream.dream({ task: "d" });
  assert.ok(r.promoted.some((p) => p.term === "lexer"));
  const after = wn.read({ task: "d" }).marks.length;
  assert.ok(after >= before); // monotone: never deletes
});

test("dream: a single witness is never promoted (no said-only promotion)", () => {
  fresh();
  wn.mark({ task: "d2", agent: "a", kind: "fact", text: "solitary term zzzz" });
  const r = dream.dream({ task: "d2" });
  assert.equal(r.promoted.length, 0);
});

test("dream: a contradiction (block) suppresses promotion", () => {
  fresh();
  wn.mark({ task: "d3", agent: "a", kind: "fact", text: "widget is stable" });
  wn.mark({ task: "d3", agent: "b", kind: "fact", text: "widget is stable" });
  wn.mark({ task: "d3", agent: "c", kind: "block", text: "widget refuted by test" });
  const r = dream.dream({ task: "d3" });
  assert.equal(r.promoted.some((p) => p.term === "widget"), false);
});

test("self-monitor reports scope and counts without fabricating a level profile", () => {
  fresh();
  wn.mark({ task: "s", agent: "a", kind: "fact", text: "x" });
  wn.mark({ task: "s", agent: "b", kind: "fact", text: "y" });
  const r = sm.selfCheck({ task: "s" });
  assert.equal(r.ok, true);
  assert.equal(r.agents, 2);
  assert.equal(r.scope, "local");
  assert.equal(sm.selfCheck({ task: "s", signals: { duplicateCount: 1 } }).scope, "session");
});

const assay = await import("./opencode-assay.mjs");

test("assay: the eot colony deposits traces and is recoverable; single leaves none", () => {
  fresh();
  const r = assay.assay({ task: "as" });
  const single = r.rows.find((x) => x.config === "single");
  const eot = r.rows.find((x) => x.config === "eot");
  assert.equal(single.marksAdded, 0);
  assert.ok(eot.marksAdded > 0);
  assert.equal(eot.recovery.recoverable, true);
});

test("assay: cross-task discovery names a term no single worker's trace named alone", () => {
  fresh();
  wn.mark({ task: "cd", agent: "w0", kind: "fact", text: "lexer module broken" });
  wn.mark({ task: "cd", agent: "w1", kind: "fact", text: "lexer module flaky" });
  wn.mark({ task: "cd", agent: "w2", kind: "fact", text: "lexer module slow" });
  eco.metaWorkerTick({ task: "cd" });
  const d = assay.crossTaskDiscovery({ task: "cd" });
  assert.ok(d.shared.includes("lexer"));
  assert.ok(d.shared.includes("module"));
});

test("runEcology: workers claim DISTINCT opportunities by activation (no collision)", () => {
  fresh();
  const cands = [
    { id: "a", R: 0.9, U: 0.9, C: 0.9, K: 0 },
    { id: "b", R: 0.7, U: 0.7, C: 0.7, K: 0 },
    { id: "c", R: 0.5, U: 0.5, C: 0.5, K: 0 },
    { id: "d", R: 0.3, U: 0.3, C: 0.3, K: 0 },
  ];
  const r = eco.runEcology({ task: "r", candidates: cands, workers: 3 });
  const ids = r.assignments.map((x) => x.id);
  assert.equal(new Set(ids).size, 3); // distinct
  assert.equal(ids[0], "a"); // highest activation first
});

test("workerPick: returns no-free-opportunity when all are claimed", () => {
  fresh();
  eco.workerPick({ task: "wp", agent: "w0", candidates: [{ id: "only", R: 1, U: 1, C: 1, K: 0 }] });
  const second = eco.workerPick({ task: "wp", agent: "w1", candidates: [{ id: "only", R: 1, U: 1, C: 1, K: 0 }] });
  assert.equal(second.ok, false);
  assert.equal(second.gap, "no-free-opportunity");
});

const R = await import("./opencode-record.mjs");
const L = await import("./opencode-ledger.mjs");

test("B1 write-through (FOLD_ONE_LEDGER=1): an admit lands a lean EOTBlock@1 row on the one ledger", () => {
  fresh();
  const prev = process.env.FOLD_ONE_LEDGER;
  process.env.FOLD_ONE_LEDGER = "1";
  try {
    const r = R.admit({ task: "ol", agent: "a", referent: "parser", delta: "parser handles trailing commas", check: "true", exitCode: 0 });
    assert.ok(r.ok && r.kept);
    const blockRows = L.rows("ol", { schema: "EOTBlock@1" });
    assert.equal(blockRows.length, 1);
    assert.equal(blockRows[0].op, "ADMIT");
    assert.equal(blockRows[0].referent, "parser");
    assert.equal(blockRows[0].m.verdict, "green");
  } finally {
    if (prev === undefined) delete process.env.FOLD_ONE_LEDGER;
    else process.env.FOLD_ONE_LEDGER = prev;
  }
});

test("B1 off by default: an admit leaves no EOTBlock@1 row", () => {
  fresh();
  R.admit({ task: "ol2", agent: "a", referent: "parser", delta: "d", check: "true", exitCode: 0 });
  assert.equal(L.rows("ol2", { schema: "EOTBlock@1" }).length, 0);
});

test("C6 cloth retirement: a stale, unstaked referent drops from the default cloth; a staked one stays", () => {
  fresh();
  const prev = process.env.FOLD_ONE_LEDGER;
  process.env.FOLD_ONE_LEDGER = "1";
  try {
    R.admit({ task: "c6", agent: "a", referent: "parser", delta: "parser handles commas", check: "true", exitCode: 0 });
    const stale = L.clothLive("c6", { now: Date.now() + 10 * 24 * 3600_000, horizonMs: 7 * 24 * 3600_000 });
    assert.deepEqual([...stale.retired], ["parser"]);
    const staked = L.clothLive("c6", { now: Date.now(), stakeReferents: ["parser"] });
    assert.equal(staked.referents.length, 1);
    assert.equal(staked.retired.length, 0);
  } finally {
    if (prev === undefined) delete process.env.FOLD_ONE_LEDGER;
    else process.env.FOLD_ONE_LEDGER = prev;
  }
});

const MIG = await import("./opencode-ledger-migrate.mjs");

test("B3 migration is idempotent (content-addressed) and B2 renders EOT/LOG from the ledger", () => {
  fresh();
  const prev = process.env.FOLD_ONE_LEDGER;
  process.env.FOLD_ONE_LEDGER = "1";
  try {
    R.admit({ task: "m", agent: "a", referent: "parser", delta: "parser handles commas", check: "true", exitCode: 0 });
    const m1 = MIG.migrate({ task: "m" });
    const m2 = MIG.migrate({ task: "m" });
    assert.ok(m1.wrote > 0);
    assert.equal(m2.wrote, 0); // idempotent
    assert.equal(m2.skipped, m1.wrote);
    const e = MIG.renderEot({ task: "m" });
    assert.match(e, /referent: `parser`/);
    assert.match(MIG.renderLog({ task: "m" }), /"verdict":"green"/);
  } finally {
    if (prev === undefined) delete process.env.FOLD_ONE_LEDGER;
    else process.env.FOLD_ONE_LEDGER = prev;
  }
});

test("D2 firewall: the model-facing note carries no impression/audit field", async () => {
  fresh();
  const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
  const r = await answer({ event: "surf", sessionID: "ses_fw", task: "fw", ask: "q", turns: [{ n: 1, ask: "a", answer: "b", grounds: [] }] });
  const note = String(r.note ?? "");
  for (const forbidden of ["bayes", "generation", "MeaningDelta", "Stake@1", "slots", "divergence", "holograph"]) {
    assert.equal(note.includes(forbidden), false, `note leaked audit field: ${forbidden}`);
  }
});

const DELTA = await import("./opencode-delta.mjs");
const FRAME = { giver: "person", question: "q", ground: "tests" };

test("D1 impressionOf names the reader's slots for the audit view; C4 fade re-derives at sleep", () => {
  fresh();
  const r = R.admit({ task: "imp", agent: "a", referent: "parser@1", delta: "parser handles commas", check: "true", exitCode: 0 });
  const b = R.blocks("imp").find((x) => x.id === r.id);
  DELTA.measure({ task: "imp", block: b, judge: "box", frame: FRAME });
  const imp = DELTA.impressionOf({ task: "imp" });
  assert.equal(imp.schema, "Impression@1");
  assert.ok(imp.slots.kind, "the kind slot is named");
  const f = DELTA.fade({ task: "imp" });
  assert.equal(f.rededuced, true);
  assert.ok(f.gamma > 0);
});

test("dream carries the fade result (C4 wired)", () => {
  fresh();
  const r = dream.dream({ task: "fd" });
  assert.ok(r.faded && r.faded.rededuced === true);
});
