// form-witness.test.mjs — the shape check, falsified. A draw is refused only when its shape is
// KNOWN and DISJOINT from what the deciding material implies; everything else goes on to the
// real test. The controls built to fail are the ones that must NOT be refused.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { formInvariants, returnKinds, checkForm, deviationNote } from "./form-witness.js";
import { runVoidLoop } from "./code-loop.js";

const hasPython = spawnSync("python3", ["--version"]).status === 0;
const opts = { skip: !hasPython && "python3 not available" };
const PAL = ["from lib import is_palindrome", "if is_palindrome('Level') is not True: bad.append('x')", "if is_palindrome('abc') is not False: bad.append('y')"].join("\n");

test("invariants: bool expectations, arity and the evidence lines are read from the calls", () => {
  const inv = formInvariants({ unit: "is_palindrome", texts: [PAL] });
  assert.deepEqual(inv.expect, ["bool"]);
  assert.deepEqual(inv.arities, [1]);
  assert.equal(inv.calls, 2);
  assert.ok(inv.evidence[0].includes("is_palindrome('Level')"));
});

test("invariants: numbers, strings, None and non-None, assertEqual and toBe forms", () => {
  assert.deepEqual(formInvariants({ unit: "clamp", texts: ["assert clamp(5, 0, 3) == 3"] }).expect, ["number"]);
  assert.deepEqual(formInvariants({ unit: "clamp", texts: ["assert clamp(5, 0, 3) == 3"] }).arities, [3]);
  assert.deepEqual(formInvariants({ unit: "up", texts: ["assert up('a') == 'A'"] }).expect, ["str"]);
  assert.equal(formInvariants({ unit: "f", texts: ["assert f(1) is not None"] }).nonNull, true);
  assert.deepEqual(formInvariants({ unit: "f", texts: ["assert f(1) is None"] }).expect, ["none"]);
  assert.deepEqual(formInvariants({ unit: "f", texts: ["self.assertEqual(f(2), 4)"] }).expect, ["number"]);
  assert.deepEqual(formInvariants({ unit: "isEven", texts: ["expect(isEven(4)).toBe(true)"] }).expect, ["bool"]);
});

test("invariants: a declaration is not a use, and an unrelated name is not matched", () => {
  const inv = formInvariants({ unit: "add", texts: ["def add(a, b):\n    return a + b\nassert add(1, 2) == 3\nassert address(1) == 9"] });
  assert.equal(inv.calls, 1);
  assert.deepEqual(inv.expect, ["number"]);
});

test("returnKinds reads literals, comparisons and falling off the end", () => {
  assert.deepEqual(returnKinds("return True").kinds, ["bool"]);
  assert.deepEqual(returnKinds("return s == s[::-1]").kinds, ["bool"]);
  assert.deepEqual(returnKinds("return s.lower() == s.lower()[::-1]").kinds, ["bool"]);
  assert.deepEqual(returnKinds("return").kinds, ["none"]);
  assert.deepEqual(returnKinds("pass").kinds, ["none"]);
  assert.equal(returnKinds("pass").fallsOff, true);
  assert.deepEqual(returnKinds("if x:\n    return 1\nreturn 2").kinds, ["number", "number"]);
  assert.equal(returnKinds("return mystery(x)").known, false);
});

test("REFUSED: a body that can only return None / a number / a string where the test compares to bool", () => {
  const inv = formInvariants({ unit: "is_palindrome", texts: [PAL] });
  for (const body of ["pass", "return None", "return 7", "return 'yes'", "x = s[::-1]"]) {
    const r = checkForm({ body, invariants: inv });
    assert.equal(r.verdict, "deviates", `body ${JSON.stringify(body)} should deviate`);
    assert.ok(r.deviations[0].detail.length > 10);
  }
});

test("CONTROLS that must pass: correct draws in unusual shapes are not punished", () => {
  const inv = formInvariants({ unit: "is_palindrome", texts: [PAL] });
  for (const body of [
    "return s.lower() == s.lower()[::-1]",
    "return not (s.lower() != s.lower()[::-1])",
    "t = ''.join(c for c in s.lower() if c.isalnum())\nreturn t == t[::-1]",
    "return all(a == b for a, b in zip(s.lower(), reversed(s.lower())))",
    "return bool(s) and s.lower() == s.lower()[::-1]",
    "if not s:\n    return True\nreturn s.lower() == s.lower()[::-1]",
    "return helper(s)",            // unreadable: flagged, never refused
    "return s.lower() == s[::-1].lower()",
  ]) assert.notEqual(checkForm({ body, invariants: inv }).verdict, "deviates", `body ${JSON.stringify(body)} must not be refused`);
});

test("CONTROL: True satisfies a number expectation (True == 1), a number does not satisfy a bool one", () => {
  const num = formInvariants({ unit: "count", texts: ["assert count([1]) == 1"] });
  assert.notEqual(checkForm({ body: "return True", invariants: num }).verdict, "deviates");
  const bool = formInvariants({ unit: "ok", texts: ["assert ok(1) is True"] });
  assert.equal(checkForm({ body: "return 5", invariants: bool }).verdict, "deviates");
});

test("no evidence, no verdict: material that states no expected shape is unlicensed", () => {
  const inv = formInvariants({ unit: "f", texts: ["print('hello')"] });
  assert.equal(checkForm({ body: "pass", invariants: inv }).verdict, "unlicensed");
});

test("the note hands back the SHAPE and the call lines, never the answer", () => {
  const inv = formInvariants({ unit: "is_palindrome", texts: [PAL] });
  const r = checkForm({ body: "return None", invariants: inv });
  const note = deviationNote("is_palindrome", r.deviations, inv);
  assert.match(note, /can only return none/i);
  assert.match(note, /is_palindrome\('Level'\)/);
  assert.doesNotMatch(note, /\[::-1\]|reversed|lower\(\)/);
});

function ws() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "form-"));
  fs.writeFileSync(path.join(d, "lib.py"), 'def is_palindrome(s):\n    """Return True if s reads the same forwards and backwards, ignoring case."""\n    raise NotImplementedError\n');
  fs.writeFileSync(path.join(d, "check.py"), "import sys\nfrom lib import is_palindrome\nbad = []\nif is_palindrome('Level') is not True: bad.append(\"is_palindrome('Level') expected True\")\nif is_palindrome('abc') is not False: bad.append(\"is_palindrome('abc') expected False\")\nif bad:\n    print('FAIL:', '; '.join(bad)); sys.exit(1)\n");
  return d;
}

test("in the loop: a wrong-shape draw is refused BEFORE the test, then the next DEF carries the shape", opts, async () => {
  const dir = ws();
  const seen = [];
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement is_palindrome", workspace: dir,
    testCommand: "python3 check.py", maxRounds: 4, candidates: 4,
    turn: async (a) => { seen.push(String(a.task)); return { text: seen.length === 1 ? "    return None" : "    return s.lower() == s.lower()[::-1]" }; },
  });
  assert.equal(r.done, true);
  const refused = r.rounds.find((x) => x.gap?.kind === "form_deviation");
  assert.ok(refused, "the None body was refused by the shape check");
  assert.equal(refused.rung, "form");
  assert.equal(refused.testExitCode, undefined, "no test run was spent on it");
  assert.equal(refused.applied, undefined, "nothing was written");
  assert.match(seen[1], /Shape check — before the test ran: .*None.*is_palindrome\('Level'\)/s);
  assert.equal(r.rounds.filter((x) => typeof x.testExitCode === "number").length, 1, "exactly one real test run for the whole chase");
});

test("in the loop: a CORRECT draw in an unusual shape goes straight to the real test", opts, async () => {
  const dir = ws();
  let n = 0;
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement is_palindrome", workspace: dir,
    testCommand: "python3 check.py", maxRounds: 3, candidates: 3,
    turn: async () => { n++; return { text: "    t = ''.join(c for c in s.lower() if c.isalnum())\n    return t == t[::-1]" }; },
  });
  assert.equal(r.done, true);
  assert.equal(n, 1);
  assert.equal(r.rounds.some((x) => x.gap?.kind === "form_deviation"), false);
});

test("in the loop: a right-shape but WRONG draw is still caught by the real test (well-formed is not verified)", opts, async () => {
  const dir = ws();
  let n = 0;
  const r = await runVoidLoop({
    sessionId: "t", model: "scripted", task: "implement is_palindrome", workspace: dir,
    testCommand: "python3 check.py", maxRounds: 3, candidates: 3,
    turn: async () => { n++; return { text: n === 1 ? "    return s == s[::-1]" : "    return s.lower() == s.lower()[::-1]" }; },
  });
  assert.equal(r.done, true);
  const judged = r.rounds.filter((x) => typeof x.testExitCode === "number");
  assert.equal(judged.length, 2, "the case-sensitive draw was well-formed and so reached the test, which refuted it");
  assert.equal(judged[0].reverted, true);
});
