import { test } from "node:test";
import assert from "node:assert/strict";
import { extractArtifact, deriveEdit, routeToolCall } from "./tool-call-physics.js";
import { deltaOps } from "./code-scout.js";
import { readOps, applyOps } from "./patch.js";

// The claim under test: a tool call can be DERIVED from the model's own bytes
// (physics), and the derivation is trustworthy because it reconstructs the model's
// output exactly or refuses — it never lands a guess. The falsifier is the
// non-unique-anchor case: a raw deltaOps→readOps→applyOps pipeline mis-moves the
// edit on repetitive material, and deriveEdit must catch it and refuse.

// The raw pipeline, WITHOUT the reconstruction check — the hazard deriveEdit guards.
function rawEdit(before, after) {
  const d = deltaOps(before, after);
  if (!d) return { refuse: true };
  const ops = readOps([{ find: d.find, add: d.add }]);
  if (!ops) return { refuse: true };
  const r = applyOps(before, ops);
  return { ok: r.ok, code: r.code };
}

test("extractArtifact: a fenced block, with a language tag, prose around it", () => {
  assert.equal(extractArtifact("here:\n```js\nconst x = 1;\n```\ndone"), "const x = 1;\n");
  assert.equal(extractArtifact("```\nplain\n```"), "plain\n");
});

test("extractArtifact: a reply with no fence carries no artifact", () => {
  assert.equal(extractArtifact("The answer is 4."), null);
  assert.equal(extractArtifact(""), null);
});

test("deriveEdit: a simple edit derives an op that reconstructs the model's output exactly", () => {
  const before = "export function median(nums) {\n  nums.sort();\n  return nums[nums.length / 2];\n}\n";
  const after = "export function median(nums) {\n  nums.sort((a, b) => a - b);\n  return nums[nums.length / 2];\n}\n";
  const r = deriveEdit(before, after);
  assert.equal(r.ok, true);
  assert.equal(r.code, after);
  assert.ok(r.ops.length >= 1 && ["INS", "SEG", "SYN"].includes(r.ops[0].op));
});

test("deriveEdit: no change is refused, not applied", () => {
  const r = deriveEdit("same\n", "same\n");
  assert.deepEqual(r, { ok: false, refuse: true, reason: "no-change" });
});

test("FALSIFIER: the non-unique-anchor case — the raw pipeline mis-moves the edit, deriveEdit refuses it", () => {
  const before = "line\nline\nline\nline\nline\nTAIL";
  const after = "line\nline\nlinQe\nline\nline\nTAIL"; // the change is on the THIRD line
  // The hazard is real: without the reconstruction check, the op lands on the wrong line.
  const raw = rawEdit(before, after);
  assert.equal(raw.ok, true);
  assert.notEqual(raw.code, after);
  // The hardening catches it.
  const r = deriveEdit(before, after);
  assert.equal(r.ok, false);
  assert.equal(r.refuse, true);
  assert.equal(r.reason, "reconstruction-mismatch");
});

test("routeToolCall: an open file + a changed reply derives an edit, verified", () => {
  const state = { open: { path: "median.js", text: "a();\nb();\n" } };
  const r = routeToolCall(state, "```js\na();\nfix();\nb();\n```");
  assert.equal(r.tool, "edit");
  assert.equal(r.args.path, "median.js");
  assert.equal(r.verified, true);
});

test("routeToolCall: no open file + an artifact derives a write", () => {
  const r = routeToolCall({ suggestedPath: "greet.js" }, "```js\nexport const hi = 1;\n```");
  assert.equal(r.tool, "write");
  assert.deepEqual(r.args, { path: "greet.js", content: "export const hi = 1;\n" });
});

test("routeToolCall: a reply that is an answer, not an act, calls no tool", () => {
  assert.equal(routeToolCall({ open: null }, "The answer is 4.").tool, "none");
});

test("routeToolCall: byte-identical reply is a no-op, not an edit", () => {
  const text = "const x = 1;\n";
  assert.equal(routeToolCall({ open: { path: "x.js", text } }, "```js\nconst x = 1;\n```").tool, "none");
});

test("routeToolCall: a non-unique-anchor change escalates instead of applying", () => {
  const before = "line\nline\nline\nline\nline\nTAIL";
  const after = "line\nline\nlinQe\nline\nline\nTAIL";
  const r = routeToolCall({ open: { path: "f.txt", text: before } }, "```\n" + after + "```");
  assert.equal(r.tool, "refuse");
  assert.equal(r.escalate, true);
  assert.equal(r.reason, "reconstruction-mismatch");
});

test("FUZZ: on realistic source, deriveEdit is exact or refuses — NEVER ok-with-wrong (3000 edits)", () => {
  const base = (n) => {
    let s = "import x from 'y'\n";
    for (let i = 0; i < n; i++) s += `const v${i} = f${i}(${i}); // step ${i}\n`;
    return s + "export default run;\n";
  };
  const edit = (s) => {
    const i = Math.floor(Math.random() * s.length);
    const j = Math.min(s.length, i + Math.floor(Math.random() * 20) + 1);
    const ins = `const z${Math.random().toString(36).slice(2, 6)} = 1;\n`;
    const k = Math.random();
    if (k < 0.34) return s.slice(0, i) + ins + s.slice(i);
    if (k < 0.67) return s.slice(0, i) + ins + s.slice(j);
    return s.slice(0, i) + s.slice(j);
  };
  let exact = 0, refused = 0, wrong = 0;
  for (let n = 0; n < 3000; n++) {
    const before = base(3 + Math.floor(Math.random() * 10));
    const after = edit(before);
    const r = deriveEdit(before, after);
    if (!r.ok) { refused++; continue; }
    if (r.code === after) exact++;
    else wrong++;
  }
  assert.equal(wrong, 0, "deriveEdit must never return ok with a code that is not the model's output");
  assert.ok(exact > 2900, `expected nearly all exact, got ${exact}`);
});

test("FUZZ: on repetitive source the raw pipeline corrupts, and deriveEdit refuses every corruption", () => {
  const base = (n) => "line\n".repeat(n) + "TAIL";
  let rawWrong = 0, hardenedWrong = 0, refused = 0;
  for (let n = 2; n <= 8; n++) {
    const before = base(n);
    for (let i = 0; i < before.length; i++) {
      const after = before.slice(0, i) + "Q" + before.slice(i);
      const raw = rawEdit(before, after);
      if (!raw.refuse && (!raw.ok || raw.code !== after)) rawWrong++;
      const h = deriveEdit(before, after);
      if (!h.ok) { refused++; continue; }
      if (h.code !== after) hardenedWrong++;
    }
  }
  assert.ok(rawWrong > 0, "the hazard must be present on repetitive material");
  assert.equal(hardenedWrong, 0, "deriveEdit must refuse every case the raw pipeline corrupts");
  assert.ok(refused > 0);
});
