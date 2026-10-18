import test from "node:test";
import assert from "node:assert/strict";
import { receiptsOf, workspaceView, stepTask } from "./step-fold.js";
import { runOpenCodingLoop, ACTION_FORMAT } from "./sandboxed-agent.js";

test("receipts: one line per round, newest kept, older counted", () => {
  const rounds = Array.from({ length: 30 }, (_, i) => ({ turn: i + 1, action: "write", path: `f${i}.js`, contentChars: 10 }));
  const r = receiptsOf(rounds, 5).split("\n");
  assert.equal(r.length, 6);
  assert.match(r[0], /25 earlier step/);
  assert.match(r.at(-1), /step 30: wrote f29\.js/);
});

test("view: shows CURRENT bytes (a rewrite replaces, never stacks), newest touch last, bounded", () => {
  const files = new Map([["a.js", "NEW_A"], ["b.js", "B".repeat(500)], ["c.js", "C".repeat(500)]]);
  const rounds = [{ turn: 1, action: "write", path: "a.js" }, { turn: 2, action: "write", path: "b.js" }, { turn: 3, action: "write", path: "c.js" }, { turn: 4, action: "write", path: "a.js" }];
  const v = workspaceView(files, rounds, 700);
  assert.ok(v.text.includes("NEW_A"));
  assert.equal(v.text.split("--- a.js ---").length, 2); // once
  assert.ok(v.text.lastIndexOf("--- a.js ---") > v.text.lastIndexOf("--- c.js ---")); // newest touch last
  assert.deepEqual(v.omitted, ["b.js"]); // oldest touch dropped to fit
  assert.match(v.text, /not shown: b\.js/);
});

test("view: a single file larger than the cap is clipped, not dropped", () => {
  const v = workspaceView(new Map([["big.js", "X".repeat(5000)]]), [{ turn: 1, action: "write", path: "big.js" }], 300);
  assert.ok(v.text.includes("--- big.js ---") && v.text.length < 400);
});

test("loop: every later turn sees its receipts and the current files; the window stays bounded over 25 turns", async () => {
  const seen = [];
  const script = [
    "ACTION: list",
    "ACTION: write\nPATH: a.js\n<<<CONTENT>>>\nexport const v = 'FIRST_VERSION';\n<<<END>>>",
    "ACTION: read\nPATH: a.js",
    "ACTION: write\nPATH: a.js\n<<<CONTENT>>>\nexport const v = 'SECOND_VERSION';\n<<<END>>>",
    ...Array.from({ length: 20 }, (_, i) => `ACTION: write\nPATH: g${i}.js\n<<<CONTENT>>>\nexport const n = ${i};\n<<<END>>>`),
    "ACTION: done\n<<<ANSWER>>>\nfinished\n<<<END>>>",
  ];
  let i = 0;
  const turnRunner = async ({ task }) => { seen.push(task); return { text: script[i++] }; };
  const out = await runOpenCodingLoop({ sessionId: "s", model: "m", task: "TASKTEXT", turnRunner });
  assert.equal(out.done, true);
  assert.ok(seen[4].includes("step 2: wrote a.js"), "a later turn names what earlier turns did");
  assert.ok(seen[4].includes("SECOND_VERSION") && !seen[4].includes("FIRST_VERSION"), "the view is the current bytes, not a stale read");
  assert.ok(seen.slice(1).every((t) => t.includes("TASKTEXT") && t.includes(ACTION_FORMAT)));
  const sizes = seen.map((t) => t.length);
  assert.ok(Math.max(...sizes) < sizes[0] + 12000 + ACTION_FORMAT.length, `window bounded: ${Math.max(...sizes)}`);
  assert.ok(sizes.at(-1) < 2.5 * sizes[8], "the last turn is not much larger than a mid-run turn (receipts and view are capped)");
});
