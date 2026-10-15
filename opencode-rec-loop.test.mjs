import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const hasPython = spawnSync("python3", ["--version"]).status === 0;

test("runVoidLoop's REC steps land in the task's EOT log and VoidLog", { skip: !hasPython && "python3 not available" }, async () => {
  const notes = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_WORKNOTES_DIR = notes;
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vl-"));
  fs.writeFileSync(path.join(ws, "lib.py"), 'def add(a, b):\n    """Return the sum of a and b."""\n    raise NotImplementedError\n');
  fs.writeFileSync(path.join(ws, "check.py"), "import sys\nfrom lib import add\nif add(1, 2) != 3:\n    print(\"add(1,2) expected 3, got\", add(1, 2)); sys.exit(1)\n");
  const { runVoidLoop } = await import("./native/the-fold/code-loop.js");
  const { recSink, fold, blocks } = await import("./opencode-rec.mjs");
  let calls = 0;
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement add", workspace: ws,
    testCommand: "python3 check.py", maxRounds: 4, candidates: 1,
    turn: async () => ({ text: ++calls === 1 ? "    return a - b" : "    return a + b" }),
    onRec: recSink({ task: "loop1", agent: "mouth" }),
  });
  assert.equal(r.done, true);
  const log = fs.readFileSync(path.join(notes, "loop1", "LOG.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.deepEqual(log.map((l) => l.verdict), ["reverted", "green"], "the red draw is reverted, the green kept");
  assert.equal(log[0].testExitCode, 1);
  assert.equal(log[1].testExitCode, 0);
  assert.equal(log[1].judge, "reported");
  const state = fold({ task: "loop1" });
  assert.equal(state.length, 1, "only the green draw became a block");
  assert.match(state[0].referent, /lib\.py:add$/);
  assert.equal(blocks("loop1").length, 1);
});

test("a throwing sink never kills the loop", { skip: !hasPython && "python3 not available" }, async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vl-"));
  fs.writeFileSync(path.join(ws, "lib.py"), 'def add(a, b):\n    """Sum."""\n    raise NotImplementedError\n');
  fs.writeFileSync(path.join(ws, "check.py"), "import sys\nfrom lib import add\nsys.exit(0 if add(1, 2) == 3 else 1)\n");
  const { runVoidLoop } = await import("./native/the-fold/code-loop.js");
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement add", workspace: ws,
    testCommand: "python3 check.py", maxRounds: 3, candidates: 1,
    turn: async () => ({ text: "    return a + b" }),
    onRec: () => { throw new Error("sink down"); },
  });
  assert.equal(r.done, true);
});
