import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "rec-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const R = await import("./opencode-rec.mjs");
const lines = (d, task) => fs.readFileSync(path.join(d, task, "LOG.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

test("exit 0 is kept as an EOT block; nonzero is reverted with no block", () => {
  const d = fresh();
  const bad = R.rec({ task: "t", agent: "a", referent: "retry@1", delta: "maxRetries 3", check: "bun test retry", exitCode: 1 });
  assert.equal(bad.kept, false);
  assert.equal(R.fold({ task: "t" }).length, 0);
  const ok = R.rec({ task: "t", agent: "a", referent: "retry@1", delta: "maxRetries 3", check: "bun test retry", exitCode: 0 });
  assert.equal(ok.kept, true);
  assert.deepEqual(R.fold({ task: "t" }).map((b) => b.referent), ["retry@1"]);
  const log = lines(d, "t");
  assert.deepEqual(log.map((l) => l.verdict), ["reverted", "green"]);
  assert.equal(log[1].judge, "reported");
});

test("no judge, no keep; the door runs the check itself only when opted in", () => {
  fresh();
  assert.equal(R.rec({ task: "t", agent: "a", referent: "x", delta: "d", check: "true" }).gap, "no-judge");
  delete process.env.FOLD_REC_EXEC;
  assert.equal(R.rec({ task: "t", agent: "a", referent: "x", delta: "d", check: "true", cwd: os.tmpdir() }).gap, "no-judge");
  process.env.FOLD_REC_EXEC = "1";
  try {
    const g = R.rec({ task: "t", agent: "a", referent: "x", delta: "d", check: "true", cwd: os.tmpdir() });
    assert.equal(g.kept, true); assert.equal(g.judge, "box");
    const r = R.rec({ task: "t", agent: "a", referent: "y", delta: "d", check: "echo boom >&2; exit 3", cwd: os.tmpdir() });
    assert.equal(r.kept, false); assert.equal(r.exitCode, 3); assert.match(r.tail, /boom/);
  } finally { delete process.env.FOLD_REC_EXEC; }
});

test("redefining a referent supersedes, and the fold is last-wins", () => {
  fresh();
  const a = R.rec({ task: "t", agent: "a", referent: "retry", delta: "v1", check: "c", exitCode: 0, now: 1000 });
  const b = R.rec({ task: "t", agent: "b", referent: "retry", delta: "v2 with jitter", check: "c", exitCode: 0, now: 2000 });
  const all = R.blocks("t");
  assert.equal(all.length, 2);
  assert.equal(all[1].supersedes, a.id);
  assert.equal(R.fold({ task: "t" })[0].delta[0], "v2 with jitter");
  assert.match(R.recNote({ task: "t" }), /retry \[.*\]: v2 with jitter/);
});

test("two processes recording different referents keep every block intact", async () => {
  const d = fresh();
  const MOD = path.join(HERE, "opencode-rec.mjs");
  const run = (name) => new Promise((res) => {
    const p = spawn(process.execPath, ["--input-type=module", "-e",
      `import { rec } from ${JSON.stringify(MOD)}; for (let i = 0; i < 40; i++) rec({ task: "p", agent: "${name}", referent: "${name}-" + i, delta: "d" + i, check: "c", exitCode: 0 });`],
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
  const r1 = await answer({ event: "rec", task: "t", agent: "s", referent: "lexer@2", delta: "fix in tokens.js", check: "bun test lexer", exitCode: 0 });
  assert.equal(r1.kept, true);
  const turns = [1, 2, 3].map((n) => ({ n, ask: `ask ${n}`, answer: `answer ${n}`, grounds: [] }));
  const r = await answer({ event: "surf", sessionID: "s", task: "t", ask: "q", turns });
  assert.match(r.note, /record \(verified, last-wins\):[\s\S]*lexer@2/);
  void d;
});
