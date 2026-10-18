// opencode-stigmergy-pointer.test.mjs — collapse is lossless IF the pointer reaches the bytes. The bytes of record are
// <agent>.turns.md (verbatim turns, written by the door) and the session; the sentence log is a derived index.
// P1 every turn pointer ("turn N") returns the original turn byte-exact   P2 climbing and descending the ladder agree
// P3 the byte store is never shrunk by a later, shorter window   P4 pointer resolution survives awkward bytes
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptr-"));
process.env.FOLD_WORKNOTES_DIR = dir;
process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
const W = await import("./opencode-worknotes.mjs");
const { surf } = await import("./opencode-surf.mjs");
let n = 0;
const fresh = () => `p${process.pid}x${++n}`;
const turn = (k, a) => ({ n: k, ask: `ask ${k}`, answer: a, grounds: ["edit"] });
const send = (task, sid, turns) => answer({ event: "surf", sessionID: sid, task, ask: "q", turns });
const bytes = (task, sid, k) => W.turnsOf({ task }).find((t) => t.agent === sid && t.n === k)?.text;

const AWKWARD = {
  twelve: Array.from({ length: 12 }, (_, i) => `Step ${i + 1} is finished.`).join(" "),
  code: "Use this:\n```js\nif (x) {\n  return 1;\n}\n```\nThat fixes it.",
  marker: "Render [[snip:abc]] and <fold-recall>x</fold-recall> literally.",
  heading: "Summary of the work.\n\n## turn 3\n\nThis heading is inside the answer.\n",
  askline: "Explanation.\nask: this line begins like a header\ntools: and so does this one\nDone.",
  trailing: "keeps  double  spaces\nand a final blank line\n\n",
  unicode: "naïve façade — 日本語 ⟨x⟩ 🙂",
};

// ── P1: the pointer reaches the original bytes ──
for (const [name, text] of Object.entries(AWKWARD)) {
  test(`P1 ${name}: turn pointer -> bytes is exact`, async () => {
    const task = fresh(), sid = "ses_aaaa1111bbbb";
    await send(task, sid, [turn(1, "first."), turn(2, text), turn(3, "third.")]);
    assert.equal(bytes(task, sid, 2), text);
  });
}

// ── P2: ladder and byte store agree on what exists ──
test("P2 every turn number the ladder prints resolves in the byte store", async () => {
  const task = fresh(), sid = "ses_cccc2222dddd";
  const turns = Array.from({ length: 40 }, (_, i) => turn(i + 1, `Done with ${["parser", "deploy", "billing", "search"][i % 4]} item ${i}. Tests pass.`));
  const note = surf({ ask: "x", turns }).note;
  await send(task, sid, turns);
  const have = new Set(W.turnsOf({ task }).map((t) => t.n));
  const printed = [...note.matchAll(/turns? ([\d,]+)|turn (\d+):/g)].flatMap((m) => (m[1] ?? m[2]).split(",").map(Number));
  assert.ok(printed.length > 0);
  for (const k of printed) assert.ok(have.has(k), `ladder points at turn ${k}; the byte store has no such turn`);
});

// ── P3: the byte store only grows ──
test("P3 FALSIFIER: a later surf that carries only a recent window does not erase older turns' bytes", async () => {
  const task = fresh(), sid = "ses_eeee3333ffff";
  const all = Array.from({ length: 12 }, (_, i) => turn(i + 1, `Answer number ${i + 1} stands.`));
  await send(task, sid, all);
  await send(task, sid, all.slice(6)); // the host passes only what it still holds
  assert.equal(bytes(task, sid, 1), "Answer number 1 stands.", "turn 1 is gone from the byte store");
});
test("P3b FALSIFIER: two sessions of one task do not overwrite each other's bytes", async () => {
  const task = fresh();
  await send(task, "ses_aaaa0000x1", [turn(1, "from one.")]);
  await send(task, "ses_aaaa0000x2", [turn(1, "from two.")]);
  assert.equal(bytes(task, "ses_aaaa0000x1", 1), "from one.");
  assert.equal(bytes(task, "ses_aaaa0000x2", 1), "from two.");
});

// ── P4: climbing is reversible: from any rung you can go to the member turns, and from a turn to its sentence ──
test("P4 every Kind rung's member turns exist and their bytes match the original", async () => {
  const task = fresh(), sid = "ses_gggg4444hhhh";
  const turns = Array.from({ length: 30 }, (_, i) => turn(i + 1, `Done with ${["parser", "deploy", "billing"][i % 3]} item ${i}. Tests pass.`));
  await send(task, sid, turns);
  const note = surf({ ask: "x", turns }).note;
  for (const m of note.matchAll(/kind \[[^\]]*\][^:]*: turns ([\d,]+)/g))
    for (const k of m[1].split(",").map(Number)) assert.equal(bytes(task, sid, k), turns[k - 1].answer);
});
