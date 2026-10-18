// opencode-stigmergy-grain.test.mjs — "collapse and expand grain at will": the holograph claim that every
// line is small, exact, addressed, and re-expandable to the bytes it stands for, at any grain, without loss.
// G1 round trip is lossless   G2 an address names exactly one thing   G3 ascent compresses
// G4 every rung's address is one the expander resolves   G5 a cursor can pick the grain/time   G6 expansion never lies about truncation
// G1b/c/d and G4 were removed: they tested the derived sentence index, not the byte store (see opencode-stigmergy-pointer.test.mjs).
// Red = a place where collapse then expand does not return what was collapsed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "grain-"));
const E = await import("./opencode-eot.mjs");
const { surf } = await import("./opencode-surf.mjs");
let n = 0;
const fresh = () => `g${process.pid}x${++n}`;
const settle = (task, agent, answer, k = 1) => E.recordTurns({ task, agent, turns: [{ n: k, ask: "q", answer }] });
const ref = (agent, k, i) => `${String(agent).replace(/^ses_/, "").slice(0, 8)}#t${k}.s${i}`;

// ── G1: collapse (turn -> sentences in the log) then expand (log -> turn text) returns the same turn ──
test("G1a plain prose survives the round trip", () => {
  const task = fresh(), a = "The cache key omits the locale. Add it to the hash. Tests pass.";
  settle(task, "A", a);
  assert.equal(E.turnsFromLog(task)[0].text, a);
});
// ── G2: an address names one thing ──
test("G2a FALSIFIER: two sessions whose ids share a prefix get distinct commons addresses", () => {
  const task = fresh(); // opencode ids are time-ordered, so sessions started together share leading characters
  settle(task, "ses_5f3a1b2c0001aaaa", "Alpha owns the parser.");
  settle(task, "ses_5f3a1b2c0002bbbb", "Beta owns the lexer.");
  const c = E.projectCommons(task, "ses_other", { ask: "parser lexer owns", max: 6 });
  const refs = c.map((x) => x.ref);
  assert.equal(new Set(refs).size, refs.length, `addresses collide: ${refs.join(" ")}`);
});
test("G2b FALSIFIER: an address resolves to the sentence it was minted for", () => {
  const task = fresh();
  settle(task, "ses_5f3a1b2c0001aaaa", "Alpha owns the parser.");
  settle(task, "ses_5f3a1b2c0002bbbb", "Beta owns the lexer.");
  for (const c of E.projectCommons(task, "ses_other", { ask: "parser lexer owns", max: 6 })) {
    const s = E.snip({ task, ref: c.ref });
    assert.equal(s.bytes, c.text, `${c.ref} resolved to a different sentence`);
  }
});
test("G2c addresses stay valid as the log grows", () => {
  const task = fresh();
  settle(task, "A1234567x", "The queue is bounded.");
  const before = E.projectCommons(task, "B", { ask: "queue bounded" })[0].ref;
  for (let k = 2; k < 30; k++) settle(task, "A1234567x", `Later note number ${k} stands.`, k);
  assert.equal(E.snip({ task, ref: before }).bytes, "The queue is bounded.");
});

// ── G3: ascent compresses (the ladder must be smaller than what it stands for, else the abstraction failed) ──
const mk = (len, textLen) => Array.from({ length: len }, (_, i) => ({ n: i + 1, ask: `work on ${["parser", "deploy", "billing", "search"][i % 4]} item ${i}`, answer: `Done with item ${i}. ${"Details follow here. ".repeat(textLen)}Tests pass.`, grounds: [i % 3 ? "edit" : "bash"] }));
const raw = (turns) => turns.reduce((s, t) => s + t.ask.length + t.answer.length, 0);
test("G3a the ladder is smaller than the history once the history is long", () => {
  const t = mk(60, 6);
  assert.ok(surf({ ask: "x", turns: t }).chars < raw(t) / 4);
});
test("G3b FALSIFIER: the ladder is never larger than what it replaces, even for a short history", () => {
  for (const len of [1, 2, 3, 4, 5]) {
    const t = mk(len, 0);
    const s = surf({ ask: "x", turns: t });
    assert.ok(s.chars <= raw(t), `${len} turns: ladder ${s.chars} > raw ${raw(t)}`);
  }
});

// ── G5: a cursor picks the time of the view ("objects condense on demand at a cursor") ──
test("G5 FALSIFIER: the commons can be read as of an earlier cursor", () => {
  const task = fresh();
  E.append({ task, agent: "A", stage: "turn", source: { kind: "turn", locator: "Early finding stands." }, unit: "t1.s0", now: 1000 });
  E.append({ task, agent: "A", stage: "turn", source: { kind: "turn", locator: "Late finding stands." }, unit: "t2.s0", now: 9000 });
  const asOf = E.projectCommons(task, "B", { ask: "finding stands", max: 6, asOf: 2000 });
  const texts = asOf.map((c) => c.text);
  assert.deepEqual(texts, ["Early finding stands."], `the cursor option is ignored: ${JSON.stringify(texts)}`);
});

// ── G6: expansion never lies about what it cut ──
test("G6a FALSIFIER: an expanded span that was truncated says so", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "root-")), task = fresh();
  fs.writeFileSync(path.join(root, "big.txt"), "x".repeat(9000));
  const out = E.expand("see ⟨big.txt#0-9000⟩", { task, root });
  assert.ok(out.text.length < 9000, "premise: the span was cut at SNIP_MAX");
  assert.match(out.text, /truncat|…|\.\.\./i, "9000 bytes requested, 4000 delivered, nothing said");
});
test("G6b an unresolvable address stays visible with its gap", () => {
  const out = E.expand("see ⟨nowhere#t9.s9⟩", { task: fresh() });
  assert.match(out.text, /\{not_found\}|\{unresolvable_ref\}/);
});
test("G6c a file read is witnessed with a hash, so the expanded bytes are checkable", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "root-")), task = fresh();
  fs.writeFileSync(path.join(root, "a.txt"), "one\ntwo\nthree\n");
  const s = E.snip({ task, agent: "A", ref: "a.txt#L2-L2", root });
  assert.equal(s.bytes, "two\n");
  assert.match(s.provenance.sha256, /^[0-9a-f]{16}$/);
});
