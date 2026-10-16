import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const hasPython = spawnSync("python3", ["--version"]).status === 0;
const opts = { skip: !hasPython && "python3 not available" };
process.env.FOLD_LOOK_IDLE_MS = "50";
const boot = async () => {
  process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  process.env.FOLD_REC_EXEC = "1";
  return import(`./opencode-doorway.mjs?t=${Date.now()}${Math.random()}`);
};
const ws = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prov-"));
  fs.writeFileSync(path.join(d, "lib.py"), 'def is_palindrome(s):\n    """Return True if s reads the same forwards and backwards, ignoring case."""\n    raise NotImplementedError\n');
  fs.writeFileSync(path.join(d, "check.py"), "import sys\nfrom lib import is_palindrome\nbad=[]\nif is_palindrome('Level') is not True: bad.append(\"is_palindrome('Level') expected True\")\nif is_palindrome('abc') is not False: bad.append(\"is_palindrome('abc') expected False\")\nif bad:\n    print('FAIL:', '; '.join(bad)); sys.exit(1)\n");
  return d;
};
const readLog = (task) => fs.readFileSync(path.join(process.env.FOLD_WORKNOTES_DIR, task, "LOG.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

test("every judged action carries the byte chain, the rungs, the def digest and the draw", opts, async () => {
  const { answer } = await boot();
  let n = 0;
  const r = await answer({ event: "chase", workspace: ws(), testCommand: "python3 check.py", agent: "a", task: "p1", maxRounds: 5 },
    { turn: async () => ({ text: ++n === 1 ? "    return s == s[::-1]" : "    return s.lower() == s.lower()[::-1]" }) });
  assert.equal(r.done, true);
  const log = readLog("p1");
  assert.deepEqual(log.map((l) => l.verdict), ["reverted", "green"]);
  for (const l of log) { assert.match(l.before, /^[0-9a-f]{16}$/); assert.match(l.after, /^[0-9a-f]{16}$/); assert.ok(l.draw); }
  assert.equal(log[0].before, log[1].before, "the reverted draw left the file where it was");
  assert.notEqual(log[1].before, log[1].after);
  assert.deepEqual(log[0].rungs, [], "the first draw stood on the plain slot");
  assert.deepEqual(log[1].rungs, ["dependence"], "the second stood on the REC'd DEF");
  assert.notEqual(log[0].def, log[1].def, "a different DEF digest");
  assert.equal(log[1].parent, log[0].seq);
  const p = (await answer({ event: "provenance", task: "p1" }));
  assert.equal(p.breaks.length, 0);
  assert.equal(p.referents[0].actions.length, 2);
});

test("provenance names a break (bytes changed outside the log) and a regression (green then refuted)", async () => {
  const { provenance } = await import("./opencode-record.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_WORKNOTES_DIR = dir;
  fs.mkdirSync(path.join(dir, "t"), { recursive: true });
  const row = (o) => JSON.stringify({ schema: "VoidLog@1", target: "f.py:g", ...o }) + "\n";
  fs.writeFileSync(path.join(dir, "t", "LOG.jsonl"),
    row({ seq: 0, verdict: "green", before: "aaaa", after: "bbbb", by: "x" }) +
    row({ seq: 1, verdict: "green", before: "cccc", after: "dddd", by: "y" }) +     // before != previous after: a break
    row({ seq: 2, verdict: "reverted", before: "dddd", after: "eeee", by: "z", dissent: "boom" })); // refuted after green
  const p = provenance({ task: "t" });
  assert.deepEqual(p.breaks.map((b) => [b.seq, b.expected, b.found]), [[1, "bbbb", "cccc"]]);
  assert.deepEqual(p.regressions.map((r) => [r.green, r.refuted]), [[1, 2]]);
});

test("one agent's refuted body is another agent's ground: never re-drawn from scratch", opts, async () => {
  const { answer } = await boot();
  // agent A is refuted on this unit (a wrong body)
  let n = 0;
  await answer({ event: "chase", workspace: ws(), testCommand: "python3 check.py", agent: "a", task: "shared", maxRounds: 2 },
    { turn: async () => { n++; return { text: "    return 'A_WRONG_BODY_MARKER'" }; } });
  const aRefusals = readLog("shared").filter((l) => (l.verdict === "reverted" || l.verdict === "refused") && String(l.draw).includes("A_WRONG_BODY_MARKER"));
  assert.ok(aRefusals.length >= 1, "A's refutation (test or shape) is in the log with the draw");
  assert.ok(aRefusals.every((l) => l.testExitCode === null ? l.judge === "shape" : true), "a shape refusal is never recorded as a test verdict");
  // agent B, same task, same unit: it must be told A's body was refuted, by the refusals rung
  const seen = [];
  await answer({ event: "chase", workspace: ws(), testCommand: "python3 check.py", agent: "b", task: "shared", maxRounds: 4 },
    { turn: async (args) => { seen.push(String(args.task)); return { text: seen.length < 3 ? "    return False" : "    return s.lower() == s.lower()[::-1]" }; } });
  const withRefusals = seen.find((t) => /refuted them/.test(t));
  assert.ok(withRefusals, `a REC'd DEF carried the refusals rung: ${seen.length} draws`);
  assert.match(withRefusals, /A_WRONG_BODY_MARKER/, "agent A's refuted body is in agent B's ground");
});
