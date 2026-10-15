import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOD = path.join(HERE, "opencode-worknotes.mjs");
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "wn-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const wn = await import("./opencode-worknotes.mjs");
const child = (dir, code) => new Promise((resolve, reject) => {
  const p = spawn(process.execPath, ["--input-type=module", "-e", `import * as wn from ${JSON.stringify(MOD)}; ${code}`], { env: { ...process.env, FOLD_WORKNOTES_DIR: dir } });
  let out = ""; p.stdout.on("data", (d) => (out += d)); p.on("error", reject); p.on("exit", () => resolve(out.trim()));
});

test("marks are merged by time and malformed lines are ignored", () => {
  fresh();
  wn.mark({ task: "t", agent: "a", kind: "fact", text: "lexer fix is in tokens.js", now: 2000 });
  wn.mark({ task: "t", agent: "b", kind: "block", text: "tests need a network", now: 1000 });
  fs.appendFileSync(wn.agentFile("t", "a"), "garbage line\n");
  const v = wn.read({ task: "t" });
  assert.deepEqual(v.marks.map((m) => m.agent), ["b", "a"]);
});

test("no mark is lost under real multi-process concurrent appends", async () => {
  const dir = fresh();
  const N = 6, PER = 150;
  await Promise.all(Array.from({ length: N }, (_, i) =>
    child(dir, `for (let k = 0; k < ${PER}; k++) wn.mark({ task: "par", agent: "w${i}", text: "m" + k });`)));
  // all agents also hammer ONE shared agent file, the worst case for interleaving
  await Promise.all(Array.from({ length: N }, (_, i) =>
    child(dir, `for (let k = 0; k < ${PER}; k++) wn.mark({ task: "par", agent: "shared", text: "w${i}-" + k });`)));
  const v = wn.read({ task: "par", limit: 100000 });
  assert.equal(v.marks.filter((m) => m.agent.startsWith("w")).length, N * PER);
  assert.equal(v.marks.filter((m) => m.agent === "shared").length, N * PER);
});

test("exactly one of many concurrent claimants wins an item", async () => {
  const dir = fresh();
  const outs = await Promise.all(Array.from({ length: 8 }, (_, i) =>
    child(dir, `console.log(JSON.stringify(wn.claim({ task: "c", agent: "w${i}", item: "fix the lexer" })))`)));
  const wins = outs.map((o) => JSON.parse(o)).filter((r) => r.ok);
  assert.equal(wins.length, 1);
  assert.equal(wn.read({ task: "c" }).open.length, 1);
});

test("a claim lapses after its ttl and can be taken over; done is final", () => {
  fresh();
  assert.ok(wn.claim({ task: "d", agent: "a", item: "x", ttlMs: 1000, now: 0 }).ok);
  const held = wn.claim({ task: "d", agent: "b", item: "x", ttlMs: 1000, now: 500 });
  assert.equal(held.ok, false); assert.equal(held.holder, "a");
  assert.ok(wn.claim({ task: "d", agent: "b", item: "x", ttlMs: 1000, now: 5000 }).ok, "lapsed claim is takeable");
  wn.done({ task: "d", agent: "b", item: "x", now: 6000 });
  const again = wn.claim({ task: "d", agent: "c", item: "x", ttlMs: 1000, now: 7000 });
  assert.equal(again.ok, false);
  assert.equal(again.done, true);
  assert.deepEqual(wn.read({ task: "d", now: 7000 }).finished.map((f) => f.item), ["x"]);
});

test("the context note shows what others hold and how to mark", () => {
  fresh();
  wn.claim({ task: "n", agent: "other", item: "write the parser tests" });
  wn.mark({ task: "n", agent: "other", kind: "fact", text: "parser lives in lib/p.js" });
  const note = wn.noteFor({ task: "n", agent: "me" });
  assert.match(note, /taken by others.*write the parser tests \[other\]/);
  assert.match(note, /fact \[other\]: parser lives in lib\/p\.js/);
  assert.match(note, /me\.md/);
  assert.doesNotMatch(wn.noteFor({ task: "n", agent: "other" }), /taken by others/);
});

test("task and agent names cannot escape the root", () => {
  fresh();
  for (const bad of ["../x", "..", "a/b", ""]) {
    assert.equal(wn.mark({ task: bad, agent: "a", text: "t" }).ok, false);
    assert.equal(wn.mark({ task: "t", agent: bad, text: "t" }).ok, false);
  }
});
