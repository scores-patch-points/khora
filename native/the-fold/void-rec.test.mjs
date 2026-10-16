// void-rec.test.mjs — "when the defs don't eva, ya rec'em", falsified.
//
// The claim: in runVoidLoop a failed EVA RESTRUCTURES the slot DEF onto new
// ground (spiral-contract.js voidGate names the rung) instead of re-drawing
// the same DEF with a sharper note; when no rung adds ground the unit is
// walled, disclosed, never re-drawn flat. A scripted mouth stands in for the
// model so the DEF it is handed can be read back exactly.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runVoidLoop } from "./code-loop.js";
import { voidGate, VOID_REC_RUNGS } from "./spiral-contract.js";

const hasPython = spawnSync("python3", ["--version"]).status === 0;
const opts = { skip: !hasPython && "python3 not available" };

function workspace() {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "void-rec-"));
  fs.writeFileSync(path.join(ws, "lib.py"), 'def is_palindrome(s):\n    """Return True if s reads the same forwards and backwards."""\n    raise NotImplementedError\n');
  fs.writeFileSync(path.join(ws, "check.py"), [
    "import sys",
    "from lib import is_palindrome",
    "bad = []",
    "if is_palindrome('Level') is not True: bad.append(\"is_palindrome('Level') expected True (case is ignored)\")",
    "if is_palindrome('abc') is not False: bad.append(\"is_palindrome('abc') expected False\")",
    "if bad:",
    "    print('FAIL:', '; '.join(bad)); sys.exit(1)",
    "",
  ].join("\n"));
  return ws;
}

test("voidGate: a won or carried draw passes; a refuted one names the next rung of new ground, then none", () => {
  assert.equal(voidGate.high({ unit: "f", outcome: "won" }).pass, true);
  assert.equal(voidGate.high({ unit: "f", outcome: "carried" }).pass, true);
  const high = voidGate.high({ unit: "f", outcome: "implicated" });
  assert.equal(high.pass, false);
  assert.equal(voidGate.revise({ unit: "f", rungs: [] }, high).rec, VOID_REC_RUNGS[0]);
  assert.equal(voidGate.revise({ unit: "f", rungs: [...VOID_REC_RUNGS] }, high), null, "every rung spent: no new ground, no instruction");
});

test("a failed EVA RECs the slot DEF: the next draw stands on the test that decides", opts, async () => {
  const ws = workspace();
  const seen = [];
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement is_palindrome", workspace: ws,
    testCommand: "python3 check.py", maxRounds: 3, candidates: 3,
    turn: async (args) => { seen.push(String(args.task)); return { text: seen.length === 1 ? "    return s == s[::-1]" : "    return s.lower() == s.lower()[::-1]" }; },
  });
  assert.equal(r.done, true);
  assert.equal(seen.length, 2);
  assert.doesNotMatch(seen[0], /The test that decides/, "the first DEF is the plain slot");
  assert.match(seen[1], /The test that decides[\s\S]*check\.py:\d+: .*is_palindrome\('Level'\)/, "the REC'd DEF carries the dependence lines");
  const recs = r.rounds.filter((x) => x.action === "REC");
  assert.equal(recs.length, 1);
  assert.equal(recs[0].rung, "dependence");
});

test("no new ground: a mouth that never passes climbs every rung once, then the unit is walled — never a flat re-draw", opts, async () => {
  const ws = workspace();
  const seen = [];
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement is_palindrome", workspace: ws,
    testCommand: "python3 check.py", maxRounds: 6, candidates: 6,
    turn: async (args) => { seen.push(String(args.task)); return { text: `    return ${seen.length % 2 ? "True" : "False"}` }; },
  });
  assert.equal(r.done, false);
  assert.equal(new Set(seen).size, seen.length, "every draw was handed a DIFFERENT DEF (no circle)");
  const recs = r.rounds.filter((x) => x.action === "REC");
  const climbed = recs.filter((x) => x.rung).map((x) => x.rung);
  assert.ok(climbed.length >= 1 && climbed.every((g, i) => VOID_REC_RUNGS.includes(g) && climbed.indexOf(g) === i), `each rung at most once: ${climbed}`);
  const wall = recs.find((x) => x.gap);
  assert.ok(wall, "the stop is a disclosed REC gap");
  assert.match(wall.gap.kind, /^(no_new_ground|measured_)/);
  assert.equal(seen.length, climbed.length + 1, "one draw per DEF: the plain slot plus one per REC");
  assert.equal(fs.readFileSync(path.join(ws, "lib.py"), "utf8").includes("raise NotImplementedError"), true, "refuted draws were reverted on disk");
});

test("wrongUnit: a draw that defines another unit and never the slot is named", async () => {
  const { wrongUnit } = await import("./code-loop.js");
  assert.equal(wrongUnit("def clamp(x, lo, hi):\n    return x", "is_palindrome"), "clamp");
  assert.equal(wrongUnit("```python\ndef clamp(x):\n    pass\n```", "is_palindrome"), "clamp");
  assert.equal(wrongUnit("def is_palindrome(s):\n    return s == s[::-1]", "is_palindrome"), null, "the slot's own def passes");
  assert.equal(wrongUnit("    return s == s[::-1]", "is_palindrome"), null, "a bare body passes");
  assert.equal(wrongUnit("def helper(s):\n    pass\ndef is_palindrome(s):\n    return helper(s)", "is_palindrome"), null, "own def present beats a helper");
  assert.equal(wrongUnit("function clamp(x) { return x }", "isPalindrome"), "clamp");
});

test("a mouth that answers the wrong unit is refused before any test, then narrowed, then succeeds", opts, async () => {
  const ws = workspace();
  const seen = [];
  let tests = 0;
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement clamp and is_palindrome", workspace: ws,
    testCommand: "python3 check.py", maxRounds: 4, candidates: 4,
    turn: async (args) => {
      seen.push(String(args.task));
      return { text: seen.length === 1 ? "def clamp(x, lo, hi):\n    return max(lo, min(x, hi))" : "    return s.lower() == s.lower()[::-1]" };
    },
  });
  assert.equal(r.done, true);
  const wrong = r.rounds.find((x) => x.gap?.kind === "wrong_unit");
  assert.ok(wrong, "the wrong-unit draw was refused");
  assert.equal(wrong.rung, "narrow");
  assert.equal(wrong.applied, undefined, "nothing was applied for it");
  assert.equal(wrong.testExitCode, undefined, "no test run was spent on it");
  assert.match(seen[1], /This slot is `is_palindrome` \(not `clamp`, which has its own slot\)/, "the second DEF is narrowed, in facts");
  assert.doesNotMatch(seen[1], /do not|don't|never/i, "no imperative negation in the ground (it trips the gate)");
  assert.equal(seen.length, 2);
});
