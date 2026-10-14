// cli/tests/cennini-exam.test.mjs — the enforcement test of amendment A2 (FOLD-CONSTITUTION.md VI.6).
// It pins the exam's INTEGRITY. It does not say the end state is reached: the exam itself is red until it is.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { judge, rowPasses, loadEndState, loadEvidence, render, END_STATE_FILE } from "../cennini-exam.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const end = loadEndState();
const FACETS = end.clauses.flatMap((c) => c.facets.map((f) => ({ clause: c.id, ...f })));

test("seven clauses; every facet names a test kind, an instrument slot and a KNOWN-BAD control (II.10)", () => {
  assert.equal(end.clauses.length, 7);
  assert.deepEqual(end.clauses.map((c) => c.id), ["J1", "J2", "J3", "J4", "J5", "J6", "J7"]);
  for (const f of FACETS) {
    assert.ok(["beats-null", "not-worse", "holds-on-trace"].includes(f.kind), `${f.clause}.${f.id} kind`);
    assert.ok("instrument" in f, `${f.clause}.${f.id} names its instrument (null when unwired)`);
    assert.ok(typeof f.control === "string" && f.control.length > 10, `${f.clause}.${f.id} names a known-bad control`);
  }
});

test("no hand-set threshold: clauses hold no number, and alpha is the one declared constant", () => {
  const numbers = [];
  (function walk(v, p) {
    if (typeof v === "number") numbers.push(p);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === "object") for (const k of Object.keys(v)) {
      assert.ok(!/threshold|margin|cutoff|minimum|passmark|\bbar\b/i.test(k), `a threshold-shaped key: ${p}.${k}`);
      walk(v[k], `${p}.${k}`);
    }
  })(end.clauses, "clauses");
  assert.deepEqual(numbers, []);
  assert.equal(end.alpha, 0.05);
  assert.match(end.alphaGiver, /declared/);
});

test("unwired is failing: an instrument that is named must exist, and a row for an unwired facet is ignored", () => {
  for (const f of FACETS.filter((x) => x.instrument)) assert.ok(fs.existsSync(path.join(ROOT, f.instrument)), `${f.clause}.${f.id}: ${f.instrument} must exist`);
  const rows = [{ clause: "J1", facet: "no-egress", value: 0, null: 1, p: 0.001, n: 100, controlRejected: true, at: "2026-10-13" }];
  const rep = judge(end, rows);
  const f = rep.clauses[0].facets.find((x) => x.id === "no-egress");
  assert.equal(f.verdict, "gap");
  assert.match(f.why, /unwired/);
  assert.equal(f.ignoredRows, 1);
});

test("a row passes only when its known-bad control was rejected (a vacuous grade never passes)", () => {
  const f = { kind: "beats-null", direction: "higher" };
  const good = { value: 0.4, null: 0.1, p: 0.001, n: 50, controlRejected: true };
  assert.equal(rowPasses(good, f, 0.05).pass, true);
  assert.equal(rowPasses({ ...good, controlRejected: false }, f, 0.05).pass, false);
  assert.equal(rowPasses({ ...good, controlRejected: undefined }, f, 0.05).pass, false);
  assert.equal(rowPasses({ ...good, p: 0.3 }, f, 0.05).pass, false, "does not beat its null");
  assert.equal(rowPasses({ ...good, value: 0.05 }, f, 0.05).pass, false, "significantly the WRONG way is not a pass");
  assert.equal(rowPasses({ ...good, value: 0.05 }, { kind: "beats-null", direction: "lower" }, 0.05).pass, true);
  assert.equal(rowPasses(null, f, 0.05).pass, false);
});

test("not-worse passes only if the pair was not shown worse AND the control was rejected at the same n", () => {
  const f = { kind: "not-worse" };
  assert.equal(rowPasses({ p: 0.4, n: 30, controlRejected: true }, f, 0.05).pass, true);
  assert.equal(rowPasses({ p: 0.4, n: 30, controlRejected: false }, f, 0.05).pass, false, "an underpowered test cannot pass");
  assert.equal(rowPasses({ p: 0.01, n: 30, controlRejected: true }, f, 0.05).pass, false, "shown worse");
});

test("the LATEST row decides: a later failing row supersedes an earlier pass, and the earlier row stays on the ledger", () => {
  const rows = [
    { clause: "J3", facet: "finish", value: 0.36, null: 0.01, p: 0.001, n: 1179, controlRejected: true, at: "2026-10-13" },
    { clause: "J3", facet: "finish", value: 0.02, null: 0.01, p: 0.4, n: 1179, controlRejected: true, at: "2026-10-20" },
  ];
  const f = judge(end, rows).clauses.find((c) => c.id === "J3").facets.find((x) => x.id === "finish");
  assert.equal(f.verdict, "failing");
  assert.equal(rows.length, 2);
});

test("the end state is REACHED only when every wired facet passes: all-good evidence on a fully wired copy reaches it", () => {
  const wired = JSON.parse(JSON.stringify(end));
  for (const c of wired.clauses) for (const f of c.facets) f.instrument = "cli/cennini-exam.mjs";
  const rows = wired.clauses.flatMap((c) => c.facets.map((f) => (f.kind === "holds-on-trace"
    ? { clause: c.id, facet: f.id, n: 40, violations: 0, controlRejected: true, at: "2026-10-13" }
    : f.kind === "not-worse"
    ? { clause: c.id, facet: f.id, p: 0.5, n: 40, controlRejected: true, at: "2026-10-13" }
    : { clause: c.id, facet: f.id, value: f.direction === "lower" ? 0 : 1, null: f.direction === "lower" ? 1 : 0, p: 0.001, n: 40, controlRejected: true, at: "2026-10-13" })));
  assert.equal(judge(wired, rows).reached, true);
  assert.equal(judge(wired, rows.slice(1)).reached, false, "one facet without evidence is not reached");
});

test("CONTROL BUILT TO FAIL: today's real ledger does NOT reach the end state (the exam cannot pass vacuously)", () => {
  const rep = judge(end, loadEvidence());
  assert.equal(rep.reached, false);
  const by = Object.fromEntries(rep.clauses.map((c) => [c.id, c.verdict]));
  assert.equal(by.J1, "gap");
  assert.equal(by.J6, "gap");
  assert.equal(by.J3, "partial", "finish is met; start, whole and lasts are unmeasured");
  assert.equal(by.J4, "partial", "seeding by the ask is met; the ask-specific lesson is noticed, not learned");
  const lesson = rep.clauses.find((c) => c.id === "J4").facets.find((f) => f.id === "ask-specific-lesson");
  assert.equal(lesson.verdict, "failing");
  assert.match(lesson.why, /vacuous/);
});

test("the CLI exits non-zero while the end state is not reached, and prints each clause", () => {
  const r = spawnSync(process.execPath, [path.join(HERE, "..", "cennini-exam.mjs")], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /NOT REACHED/);
  for (const id of ["J1", "J2", "J3", "J4", "J5", "J6", "J7"]) assert.match(r.stdout, new RegExp(`\\b${id}\\b`));
});

test("the exam calls no model and writes nothing", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "cennini-exam.mjs"), "utf8");
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|api\.anthropic|\/v1\/(messages|chat|code)/);
  assert.doesNotMatch(src, /writeFileSync|appendFileSync|createWriteStream/);
});

test("evidence rows carry aggregate numbers and a named source only: no path, prompt or address leaks in", () => {
  for (const r of loadEvidence()) {
    assert.ok(typeof r.source === "string" && r.source.length > 5, "every row names its source");
    const s = JSON.stringify(r);
    assert.doesNotMatch(s, /\/Users\/|@[A-Za-z0-9-]+\.[a-z]{2,}|\b\d{3}-\d{2}-\d{4}\b/);
  }
  assert.ok(render(judge(end, loadEvidence())).includes("alpha 0.05"));
});

test("a mistyped --evidence path fails loudly; the default ledger may be absent (a gap, not an error)", () => {
  const r = spawnSync(process.execPath, [path.join(HERE, "..", "cennini-exam.mjs"), "--evidence", "/nonexistent/ledger.jsonl"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /evidence ledger not found/);
  assert.deepEqual(loadEvidence("/nonexistent/ledger.jsonl"), []);
  assert.throws(() => loadEvidence("/nonexistent/ledger.jsonl", { required: true }), /not found/);
});

test("holds-on-trace passes only on live runs with no violation and a rejected known-bad trace", () => {
  const f = { kind: "holds-on-trace" };
  const row = { n: 5, violations: 0, controlRejected: true };
  assert.equal(rowPasses(row, f, 0.05).pass, true);
  assert.equal(rowPasses({ ...row, violations: 1 }, f, 0.05).pass, false);
  assert.equal(rowPasses({ ...row, controlRejected: false }, f, 0.05).pass, false, "a vacuous judge never passes");
  assert.equal(rowPasses({ ...row, n: 0 }, f, 0.05).pass, false, "no live run, no pass");
  assert.equal(rowPasses({ n: 5, controlRejected: true }, f, 0.05).pass, false, "violations must be stated");
});
