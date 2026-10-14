// cli/tests/cennini-assemble.test.mjs — the first assembled run, tested with a fake door that writes canned attempts.
// A fake door makes `live` false, so nothing here is evidence about the real door; it proves the ASSEMBLY's logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PANEL, PARAMS, filesOf, complete, assembledRun, summarize, missingNames, SURFACE } from "../cennini-assemble.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = () => fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "asm-test-"));
const ask = (id) => PANEL.find((a) => a.id === id);

const SOLUTIONS = {
  total: 'import { sum } from "./numbers.mjs";\n\nexport function formatTotal(items) {\n  return "$" + sum(items.map((i) => i.price)).toFixed(2);\n}\n',
  greeting: 'import { upper } from "./strings.mjs";\n\nexport function greeting(name) {\n  return "Hello, " + upper(name) + "!";\n}\n',
  mean: 'import { sum, count } from "./numbers.mjs";\n\nexport function mean(xs) {\n  return sum(xs) / count(xs);\n}\n',
  slug: 'import { lower, dashed } from "./strings.mjs";\n\nexport function slugify(title) {\n  return dashed(lower(title));\n}\n',
  even: "export function isEven(n) {\n  return n % 2 === 0;\n}\n",
  clamp: "export function clamp(x, lo, hi) {\n  return Math.min(hi, Math.max(lo, x));\n}\n",
};
const NO_IMPORT = {
  total: 'export function formatTotal(items) {\n  const t = sum(items.map((i) => i.price));\n  return "$" + t.toFixed(2);\n}\n',
  greeting: 'export function greeting(name) {\n  return "Hello, " + upper(name) + "!";\n}\n',
  mean: "export function mean(xs) {\n  return sum(xs) / count(xs);\n}\n",
  slug: "export function slugify(title) {\n  return dashed(lower(title));\n}\n",
};
const door = (text) => async (_url, init) => {
  const { workspace, task } = JSON.parse(init.body);
  const a = PANEL.find((x) => x.task === task);
  fs.writeFileSync(path.join(workspace, a.target), text);
  return { ok: true, status: 200, json: async () => ({ done: true }) };
};

function inWorkspace(a, files, fn) {
  const dir = tmp();
  try {
    for (const [f, b] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), b);
    return fn(dir);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const passes = (dir) => spawnSync("node", ["test.mjs"], { cwd: dir, encoding: "utf8" }).status === 0;

test("NON-VACUITY of the panel: every stub fails its own test, and a correct solution passes it", () => {
  assert.equal(PANEL.length, 6);
  for (const a of PANEL) {
    inWorkspace(a, filesOf(a), (dir) => assert.equal(passes(dir), false, `${a.id} stub must fail`));
    inWorkspace(a, { ...filesOf(a), [a.target]: SOLUTIONS[a.id] }, (dir) => assert.equal(passes(dir), true, `${a.id} solution must pass`));
  }
  assert.deepEqual(PANEL.filter((a) => a.control).map((a) => a.id), ["even", "clamp"]);
  assert.ok(PANEL.filter((a) => !a.control).every((a) => a.needs.length >= 1), "a needs-helper ask names what it needs");
});

test("SIGNED stubs carry the parameter list the ask states, still fail their own test, and the unsigned panel stays paramless", () => {
  for (const a of PANEL) {
    const signed = filesOf(a, { signed: true });
    assert.match(signed[a.target], new RegExp(`export function ${a.fn}\\(${PARAMS[a.id].replace(/[,]/g, ",")}\\)`));
    inWorkspace(a, signed, (dir) => assert.equal(passes(dir), false, `${a.id} signed stub must fail`));
    assert.match(filesOf(a)[a.target], new RegExp(`export function ${a.fn}\\(\\) \\{`));
  }
});

test("an attempt that forgot the import FAILS alone and PASSES once FINISH completes it; the re-read says which names landed", async () => {
  const r = await assembledRun({ ask: ask("total"), fetchImpl: door(NO_IMPORT.total) });
  assert.equal(r.live, false);
  assert.equal(r.A.pass, false, "the raw attempt references sum without importing it");
  assert.match(r.A.detail, /sum|not defined/);
  assert.equal(r.B.pass, true);
  assert.deepEqual(r.B.proposals.map((p) => [p.kind, p.name, p.spec]), [["import", "sum", "./numbers.mjs"]]);
  assert.deepEqual(r.B.reread.fixed, ["sum"]);
  assert.deepEqual(r.B.reread.stillMissing, []);
  assert.equal(r.importedByAttempt, false);
});

test("the same holds for a two-name need: both imports are found and applied", async () => {
  const r = await assembledRun({ ask: ask("mean"), fetchImpl: door(NO_IMPORT.mean) });
  assert.equal(r.A.pass, false);
  assert.equal(r.B.pass, true);
  assert.deepEqual(r.B.proposals.map((p) => p.name).sort(), ["count", "sum"]);
});

test("CONTROL BUILT TO FAIL (wrong world): the same attempt completed against files that do not hold the helper is NOT fixed", async () => {
  const r = await assembledRun({ ask: ask("total"), fetchImpl: door(NO_IMPORT.total) });
  assert.equal(r.B.pass, true);
  assert.equal(r.C.pass, false, "a wrong world must not fix it, or arm B would prove nothing");
  assert.ok(!r.C.proposals.some((p) => p.kind === "import" && p.spec === "./numbers.mjs"));
});

test("CONTROL ASK: a self-contained attempt proposes nothing, the text is unchanged, and the verdict is the same in both arms", async () => {
  const r = await assembledRun({ ask: ask("even"), fetchImpl: door(SOLUTIONS.even) });
  assert.equal(r.control, true);
  assert.deepEqual(r.B.proposals, []);
  assert.equal(r.B.changed, false);
  assert.equal(r.A.pass, true);
  assert.equal(r.B.pass, true);
});

test("an attempt that already imported what it needs is left alone (no spurious second import)", async () => {
  const r = await assembledRun({ ask: ask("greeting"), fetchImpl: door(SOLUTIONS.greeting) });
  assert.equal(r.A.pass, true);
  assert.deepEqual(r.B.proposals, []);
  assert.equal(r.B.changed, false);
  assert.equal(r.importedByAttempt, true);
});

test("an attempt that is simply WRONG stays wrong: the assembly completes support, it does not repair logic", async () => {
  const r = await assembledRun({ ask: ask("total"), fetchImpl: door('import { sum } from "./numbers.mjs";\n\nexport function formatTotal(items) {\n  return "$" + sum(items.map((i) => i.price));\n}\n') });
  assert.equal(r.A.pass, false);
  assert.equal(r.B.pass, false);
  assert.equal(r.B.changed, false);
});

test("LOOK is real in the assembly: the file the ask names is among the first candidates for every ask", async () => {
  for (const a of PANEL) {
    const r = await assembledRun({ ask: a, fetchImpl: door(SOLUTIONS[a.id]) });
    assert.equal(r.looked.found, true, `${a.id}: the look finds ${a.target}`);
    assert.equal(r.looked.top, a.target, `${a.id}: and ranks it first`);
  }
});

test("a door that fails is recorded as a failure, never as a pass, and the fake door is never live", async () => {
  const r = await assembledRun({ ask: ask("total"), fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
  assert.equal(r.door.ok, false);
  assert.match(r.door.error, /503/);
  assert.equal(r.attempted, false);
  assert.equal(r.live, false);
  assert.equal(r.surface, SURFACE);
});

test("summarize counts transitions, harm and the wrong-world arm; fake runs are never counted as live", async () => {
  const recs = [
    await assembledRun({ ask: ask("total"), fetchImpl: door(NO_IMPORT.total) }),
    await assembledRun({ ask: ask("even"), fetchImpl: door(SOLUTIONS.even) }),
  ];
  const sFake = summarize(recs);
  assert.equal(sFake.live, 0);
  assert.equal(sFake.all.n, 0, "fixtures are never evidence");
  const asLive = recs.map((r) => ({ ...r, live: true }));
  const s = summarize(asLive);
  assert.equal(s.needsHelper.fixed, 1);
  assert.equal(s.needsHelper.harmed, 0);
  assert.equal(s.needsHelper.C_fixed, 0);
  assert.deepEqual([s.control.n, s.control.fixed, s.control.harmed], [1, 0, 0]);
});

test("missingNames reads unbound names from text (the re-read), and the driver makes no write outside its workspace and no token use", () => {
  assert.deepEqual(missingNames(NO_IMPORT.total, "cart.mjs").filter((n) => n === "sum"), ["sum"]);
  assert.deepEqual(missingNames(SOLUTIONS.total, "cart.mjs").filter((n) => n === "sum"), []);
  const src = fs.readFileSync(path.join(HERE, "..", "cennini-assemble.mjs"), "utf8");
  assert.doesNotMatch(src, /x-heimdall-token|\.heimdall|HEIMDALL_TOKEN/i);
  assert.match(src, /refusing to write run records inside the khora repo/);
  assert.match(src, /rmSync\(workspace/);
});
