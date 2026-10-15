import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const hasPython = spawnSync("python3", ["--version"]).status === 0;
const mkws = (check) => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "ch-"));
  fs.writeFileSync(path.join(ws, "lib.py"), 'def add(a, b):\n    """Sum."""\n    raise NotImplementedError\n');
  fs.writeFileSync(path.join(ws, "check.py"), check ?? "import sys\nfrom lib import add\nif add(1, 2) != 3:\n    print('add(1,2) expected 3, got', add(1, 2)); sys.exit(1)\n");
  return ws;
};
const boot = async () => {
  process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  return import(`./opencode-doorway.mjs?t=${Date.now()}${Math.random()}`);
};
const opts = { skip: !hasPython && "python3 not available" };

test("chase is refused unless exec is opted in", opts, async () => {
  const { answer } = await boot();
  delete process.env.FOLD_REC_EXEC;
  const r = await answer({ event: "chase", workspace: mkws(), testCommand: "python3 check.py", agent: "a" });
  assert.equal(r.gap, "exec-disabled");
});

test("chase with a scripted mouth: red draw reverted, green kept, record folded", opts, async () => {
  const { answer } = await boot();
  process.env.FOLD_REC_EXEC = "1";
  try {
    let n = 0;
    const ws = mkws();
    const r = await answer({ event: "chase", workspace: ws, testCommand: "python3 check.py", agent: "m", task: "tk", maxRounds: 4 },
      { turn: async () => ({ text: ++n === 1 ? "    return a - b" : "    return a + b" }) });
    assert.equal(r.done, true);
    assert.equal(r.record.length, 1);
    assert.match(fs.readFileSync(path.join(ws, "lib.py"), "utf8"), /return a \+ b/);
    const note = await answer({ event: "surf", sessionID: "m", task: "tk", ask: "q", turns: [1, 2, 3].map((k) => ({ n: k, ask: `a${k}`, answer: `r${k}`, grounds: [] })) });
    assert.match(note.note, /record \(verified, last-wins\):[\s\S]*lib\.py:add/);
  } finally { delete process.env.FOLD_REC_EXEC; }
});

test("a mouth that never passes leaves the file as it was and keeps nothing", opts, async () => {
  const { answer } = await boot();
  process.env.FOLD_REC_EXEC = "1";
  try {
    const ws = mkws();
    const before = fs.readFileSync(path.join(ws, "lib.py"), "utf8");
    const r = await answer({ event: "chase", workspace: ws, testCommand: "python3 check.py", agent: "m", task: "tk2", maxRounds: 3 },
      { turn: async () => ({ text: "    return a * b" }) });
    assert.equal(r.done, false);
    assert.equal(r.record.length, 0, "nothing red enters the record");
    assert.equal(fs.readFileSync(path.join(ws, "lib.py"), "utf8"), before, "red draws are reverted on disk");
  } finally { delete process.env.FOLD_REC_EXEC; }
});

test("bad workspace, missing command and path-like names are refused", opts, async () => {
  const { answer } = await boot();
  process.env.FOLD_REC_EXEC = "1";
  try {
    assert.equal((await answer({ event: "chase", workspace: "relative/dir", testCommand: "true" })).gap, "bad-workspace");
    assert.equal((await answer({ event: "chase", workspace: "/nonexistent-zzz", testCommand: "true" })).gap, "bad-workspace");
    assert.equal((await answer({ event: "chase", workspace: os.tmpdir(), testCommand: "  " })).gap, "no-test-command");
    assert.equal((await answer({ event: "chase", workspace: os.tmpdir(), testCommand: "true", agent: "a/b" })).gap, "bad-address");
    assert.equal((await answer({ event: "chase", workspace: os.tmpdir(), testCommand: "true", agent: "a", task: ".." })).gap, "bad-address");
  } finally { delete process.env.FOLD_REC_EXEC; }
});

test("a correct unit carried while the suite is red is logged provisional, then promoted when green", opts, async () => {
  const { answer } = await boot();
  process.env.FOLD_REC_EXEC = "1";
  try {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), "ch-"));
    fs.writeFileSync(path.join(ws, "lib.py"), 'def add(a, b):\n    """Sum."""\n    raise NotImplementedError\n\n\ndef neg(a):\n    """Negate a."""\n    raise NotImplementedError\n');
    fs.writeFileSync(path.join(ws, "check.py"), "import sys\nfrom lib import add, neg\nbad=[]\nif add(1, 2) != 3: bad.append('add(1,2) expected 3')\nif neg(4) != -4: bad.append('neg(4) expected -4')\nif bad:\n    print('FAIL:', '; '.join(bad)); sys.exit(1)\n");
    const bodies = { add: "    return a + b", neg: "    return -a" };
    const r = await answer({ event: "chase", workspace: ws, testCommand: "python3 check.py", agent: "m", task: "prom", maxRounds: 5 },
      { turn: async (args) => ({ text: bodies[/filling one function[\s\S]*?def (\w+)\(/.exec(String(args.task))?.[1]] ?? "    return None" }) });
    assert.equal(r.done, true);
    assert.equal(r.record.length, 2, "both units are in the record once the suite is green");
    const log = fs.readFileSync(path.join(process.env.FOLD_WORKNOTES_DIR, "prom", "LOG.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.ok(log.some((l) => l.verdict === "carried"), "the first unit was logged provisional while the suite was red");
    assert.ok(log.some((l) => l.source === "suite-green" && l.verdict === "green"), "and promoted when the suite went green");
  } finally { delete process.env.FOLD_REC_EXEC; }
});

test("the spiral climbs: a same-name implementation in the field is snipped before any model draw", opts, async () => {
  const { answer } = await boot();
  process.env.FOLD_REC_EXEC = "1";
  try {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), "ch-"));
    fs.writeFileSync(path.join(ws, "lib.py"), 'def is_even(n):\n    """Return True if n is even."""\n    raise NotImplementedError\n');
    fs.mkdirSync(path.join(ws, "vendor"));
    fs.writeFileSync(path.join(ws, "vendor", "nums.py"), 'def is_even(n):\n    """Return True if n is even."""\n    return n % 2 == 0\n');
    fs.writeFileSync(path.join(ws, "check.py"), "import sys\nfrom lib import is_even\nbad=[]\nif is_even(4) is not True: bad.append('is_even(4) expected True')\nif is_even(7) is not False: bad.append('is_even(7) expected False')\nif bad:\n    print('FAIL:', '; '.join(bad)); sys.exit(1)\n");
    let drawn = 0;
    const r = await answer({ event: "chase", workspace: ws, testCommand: "python3 check.py", agent: "m", task: "hunt1", maxRounds: 4 },
      { turn: async () => { drawn++; return { text: "    return False" }; } });
    const log = fs.readFileSync(path.join(process.env.FOLD_WORKNOTES_DIR, "hunt1", "LOG.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(r.done, true);
    assert.equal(drawn, 0, "the mouth was never asked");
    assert.ok(log.some((l) => l.action === "HUNT" && l.verdict === "green"), `a HUNT rung kept it: ${JSON.stringify(log.map((l) => [l.action, l.by, l.verdict]))}`);
    assert.equal(r.mouthShare, 0);
  } finally { delete process.env.FOLD_REC_EXEC; }
});
