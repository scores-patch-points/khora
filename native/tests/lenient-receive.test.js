// native/tests/lenient-receive.test.js — the lenient receiver (organs/lenient-receive.js).
// The oracle is the real thing: the answer a real small mouth gave for a real stub (kept verbatim), and `node test.mjs`
// run against the assembled bytes. Nothing here is a stand-in for the door; it is the door's REFUSED shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { receive, RECEIVE_SCHEMA } from "../organs/lenient-receive.js";
import { findCapacity } from "../organs/capacities.js";
import { cellOf } from "../kernel/cube.js";

const STUB = 'export function formatTotal() {\n  throw new Error("TODO: formatTotal");\n}\n';
const TEST = 'import assert from "node:assert";\nimport { formatTotal } from "./cart.mjs";\nassert.strictEqual(formatTotal([{ price: 1.5 }, { price: 2 }]), "$3.50");\nassert.strictEqual(formatTotal([]), "$0.00");\nconsole.log("ok");\n';
// verbatim: gemma2:2b through the Fold's door, 2026-10-13 — the right function, under ADD with no FIND (the door answered
// unparsed_proposal and kept nothing).
const LOST = "ACTION: patch\nPATH: cart.mjs\n<<<ADD>>>\nexport function formatTotal(items) {\n  let total = 0;\n  for (const item of items) {\n    total += item.price;\n  }\n  return `$${total.toFixed(2)}`;\n}\n<<<END>>> \n";
const FILE = "/ws/cart.mjs";

const passes = (files) => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "recv-"));
  try {
    for (const [f, b] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), b);
    return spawnSync("node", ["test.mjs"], { cwd: dir, encoding: "utf8" }).status === 0;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};

test("registered: capacity lenient-receive, CON·Figure → Relate / Structure / Link, fn receive", async () => {
  const c = findCapacity("lenient-receive");
  assert.ok(c, "the capacity exists");
  assert.equal(c.module, "organs/lenient-receive.js");
  assert.equal(c.fn, "receive");
  assert.equal(c.op, "CON");
  const cell = cellOf("CON", "Figure");
  assert.equal(c.terrain, cell.terrain);
  assert.deepEqual([cell.mode, cell.domain, cell.terrain], ["Relate", "Structure", "Link"]);
  const mod = await import(`../${c.module}`);
  assert.equal(typeof mod[c.fn], "function");
});

test("the answer the door lost: the stub is replaced by the declaration the block states, and the real test passes", () => {
  assert.equal(passes({ "cart.mjs": STUB, "test.mjs": TEST }), false, "the stub fails its own test");
  const r = receive({ text: LOST, before: STUB, file: FILE });
  assert.equal(r.ok, true);
  assert.equal(r.schema, RECEIVE_SCHEMA);
  assert.deepEqual(r.replaced, ["formatTotal"]);
  assert.deepEqual(r.added, []);
  assert.equal(r.via, "add-only");
  assert.ok(!r.after.includes("TODO"), "the stub is gone");
  assert.equal(passes({ "cart.mjs": r.after, "test.mjs": TEST }), true, "and the replaced file passes");
});

test("only the declaration the block names is touched; its neighbours keep their bytes", () => {
  const before = "export function a() {\n  return 1;\n}\n\nexport function b() {\n  throw new Error(\"TODO\");\n}\n\nexport function c() {\n  return 3;\n}\n";
  const r = receive({ text: "<<<ADD>>>\nexport function b() {\n  return 2;\n}\n<<<END>>>", before, file: "/ws/m.mjs" });
  assert.equal(r.ok, true);
  assert.equal(r.after, "export function a() {\n  return 1;\n}\n\nexport function b() {\n  return 2;\n}\n\nexport function c() {\n  return 3;\n}\n");
});

test("carryExport (on by default; 4 of 27 live draws, clamp): a replaced declaration the file exports stays exported; one it does not export is not made public", () => {
  const exported = "export function slugify(title) {\n  throw new Error(\"TODO\");\n}\n";
  const dropped = "<<<ADD>>>\n  function slugify(title) {\n    return title.toLowerCase();\n  }\n<<<END>>>";
  const r = receive({ text: dropped, before: exported, file: "/ws/slug.mjs" });
  assert.equal(r.ok, true);
  assert.equal(r.after, "export function slugify(title) {\n    return title.toLowerCase();\n  }\n");
  assert.deepEqual(r.carried, ["export:slugify"]);
  // the off arm: the same answer without the carry leaves the export off (the form the live ladder recorded)
  const off = receive({ text: dropped, before: exported, file: "/ws/slug.mjs", carryExport: false });
  assert.ok(!/^export\b/.test(off.after));
  // an answer that already exports is left alone; a file that did not export is not widened
  const already = receive({ text: "<<<ADD>>>\nexport function slugify(title) {\n  return title;\n}\n<<<END>>>", before: exported, file: "/ws/slug.mjs" });
  assert.deepEqual(already.carried, []);
  const priv = receive({ text: dropped, before: "function slugify(title) {\n  throw new Error(\"TODO\");\n}\n", file: "/ws/slug.mjs" });
  assert.deepEqual(priv.carried, []);
  assert.ok(!/^export\b/.test(priv.after));
});

test("THE SIGNATURE IS GROUND: an empty parameter list takes the list the ask names; another ask's list does not pass; no list, no carry", () => {
  // verbatim: gemma2:2b through the Fold's door, 2026-10-13, unsigned stub — the right body under `mean()` (4 of 5 draws)
  const stub = 'export function mean() {\n  throw new Error("TODO: mean");\n}\n';
  const answer = "ACTION: patch\nPATH: stats.mjs\n<<<ADD>>>\nexport function mean() {\n  return xs.reduce((a, b) => a + b, 0) / xs.length;\n}\n<<<END>>> \n";
  const test = 'import assert from "node:assert";\nimport { mean } from "./stats.mjs";\nassert.strictEqual(mean([2, 4, 6]), 4);\nassert.strictEqual(mean([5]), 5);\nconsole.log("ok");\n';
  const ask = "Implement mean(xs) in stats.mjs so that `node test.mjs` passes.";
  const r = receive({ text: answer, before: stub, file: "/ws/stats.mjs", ask });
  assert.equal(r.ok, true);
  assert.deepEqual(r.carried, ["params:mean"]);
  assert.ok(r.after.includes("export function mean(xs) {"));
  assert.equal(passes({ "stats.mjs": r.after, "test.mjs": test }), true, "the carried file passes its real test");
  // the off arm: no ask, the body's xs stays unbound and the real test fails
  const off = receive({ text: answer, before: stub, file: "/ws/stats.mjs" });
  assert.deepEqual(off.carried, []);
  assert.equal(passes({ "stats.mjs": off.after, "test.mjs": test }), false);
  // CONTROL built to fail: another ask's list (slugify's) — the body uses none of its names, so nothing is carried
  const wrong = receive({ text: answer, before: stub, file: "/ws/stats.mjs", ask: "Implement mean(title) in stats.mjs." });
  assert.deepEqual(wrong.carried, []);
  assert.equal(passes({ "stats.mjs": wrong.after, "test.mjs": test }), false, "the wrong ground does not pass");
  // a list the answer already wrote is never overwritten; an ask that names no list carries nothing
  const kept = receive({ text: answer.replace("mean()", "mean(ys)"), before: stub, file: "/ws/stats.mjs", ask });
  assert.deepEqual(kept.carried, []);
  assert.deepEqual(receive({ text: answer, before: stub, file: "/ws/stats.mjs", ask: "Implement mean in stats.mjs." }).carried, []);
  // a list that is not plain identifiers is not ground (a call in prose, a default value)
  assert.deepEqual(receive({ text: answer, before: stub, file: "/ws/stats.mjs", ask: "Implement mean(xs = []) here." }).carried, []);
});

test("a name the file does not declare is appended; imports it needs go to the top once", () => {
  const before = 'import { x } from "./x.mjs";\nexport function a() {\n  return x;\n}\n';
  const block = '<<<ADD>>>\n```js\nimport { x } from "./x.mjs";\nimport { y } from "./y.mjs";\nexport function d() {\n  return y;\n}\n```\n<<<END>>>';
  const r = receive({ text: block, before, file: "/ws/m.mjs" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.added, ["d"]);
  assert.deepEqual(r.imports, ['import { y } from "./y.mjs";'], "the import the file already holds is not repeated");
  assert.ok(r.after.startsWith('import { y } from "./y.mjs";\nimport { x } from "./x.mjs";'));
  assert.ok(r.after.endsWith("export function d() {\n  return y;\n}\n"));
});

test("TYPED GAPS, each named: a FIND is the door's grammar; a PATH for another file; no declaration; stray code; a doubled name; no change", () => {
  const kind = (text, before = "export function f() {}\n", file = "/ws/a.mjs") => receive({ text, before, file }).gap?.kind;
  assert.equal(kind("<<<FIND>>>\nx\n<<<ADD>>>\ny\n<<<END>>>"), "has-find");
  assert.equal(kind("hello, here is some prose"), "no-add-block");
  assert.equal(kind("PATH: other.mjs\n<<<ADD>>>\nexport function f() { return 1; }\n<<<END>>>"), "path-not-file");
  assert.equal(kind("<<<ADD>>>\nreturn 1;\n<<<END>>>"), "no-declaration");
  assert.equal(kind("<<<ADD>>>\nconsole.log(1);\nexport function f() { return 1; }\n<<<END>>>"), "undeclared-text");
  assert.equal(kind("<<<ADD>>>\nexport function f() { return 1; }\n<<<END>>>", "export function f() {}\nexport function f() {}\n"), "ambiguous-name");
  assert.equal(kind("<<<ADD>>>\nexport function f() {}\n<<<END>>>"), "no-change");
  assert.equal(kind("<<<ADD>>>\n\n<<<END>>>"), "empty-block");
  assert.equal(receive({ text: LOST, before: null, file: FILE }).gap.kind, "no-file");
});

test("a gap is never a guess: on every refusal no bytes come back", () => {
  const r = receive({ text: "<<<ADD>>>\nconsole.log(1);\nexport function f() { return 1; }\n<<<END>>>", before: "export function f() {}\n", file: "/ws/a.mjs" });
  assert.equal(r.ok, false);
  assert.equal(r.after, undefined);
});

test("the organ is pure: it never reaches for the network, a model or a write", () => {
  const src = fs.readFileSync(new URL("../organs/lenient-receive.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\bfetch\s*\(|writeFile|appendFile|child_process|ollama/i);
});
