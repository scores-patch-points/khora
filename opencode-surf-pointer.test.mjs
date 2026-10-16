// opencode-surf-pointer.test.mjs — the CLAIM: pointer mode is lossless. The window carries turn ADDRESSES only;
// the bytes live in the trail on disk (<task>/<agent>.turns.md, written by the door). Falsifier: a turn the pointer
// note prints that does NOT resolve byte-exact in the trail, or a sentence that leaks into the pointer note.
// The control: ladder mode carries the sentences, so the two modes differ and the drop is real.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptr-mode-"));
process.env.FOLD_WORKNOTES_DIR = dir;
process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
const W = await import("./opencode-worknotes.mjs");
const { surf } = await import("./opencode-surf.mjs");
let n = 0;
const fresh = () => `pp${process.pid}x${++n}`;
const turn = (k, a) => ({ n: k, ask: `ask ${k}`, answer: a, grounds: ["edit"] });
const bytes = (task, sid, k) => W.turnsOf({ task }).find((t) => t.agent === sid && t.n === k)?.text;
const SENTENCE = "The cache key omits the locale.";
const HISTORY = (len) => Array.from({ length: len }, (_, i) => turn(i + 1, `Done with ${["parser", "deploy", "billing", "search"][i % 4]} item ${i}. ${SENTENCE} Tests pass.`));

// ── the drop is real: pointer carries no sentence, ladder does ──
test("pointer mode drops the sentences; ladder mode keeps them (the control)", () => {
  const turns = HISTORY(20);
  const p = surf({ ask: "tune the cache key", turns, mode: "pointer" }).note;
  const l = surf({ ask: "tune the cache key", turns, mode: "ladder" }).note;
  assert.doesNotMatch(p, /cache key omits the locale/, "a sentence leaked into the pointer note");
  assert.match(l, /cache key omits the locale/, "the ladder must still carry the sentence, or there is nothing to falsify");
  assert.ok(p.length < l.length, `pointer (${p.length}) must be smaller than ladder (${l.length})`);
});

// ── losslessness: every turn the pointer note names resolves byte-exact in the trail (the bytes were folded out of the window, never dropped) ──
test("every turn the pointer note names resolves byte-exact in the byte store", async () => {
  const task = fresh(), sid = "ses_ptr0000aaaa";
  const turns = HISTORY(40);
  process.env.FOLD_SURF_MODE = "pointer";
  try {
    const r = await answer({ event: "surf", sessionID: sid, task, ask: "tune the cache key", turns });
    const printed = [...r.note.matchAll(/turns? ([\d,]+)|turn (\d+):?/g)].flatMap((m) => (m[1] ?? m[2]).split(",").map(Number));
    assert.ok(printed.length > 0, "the pointer note named no turn — nothing to drill into");
    const have = new Set(W.turnsOf({ task }).map((t) => t.n));
    for (const k of printed) {
      assert.ok(have.has(k), `pointer names turn ${k}; the trail has no such turn`);
      assert.equal(bytes(task, sid, k), turns[k - 1].answer, `turn ${k} did not resolve byte-exact`);
    }
  } finally {
    delete process.env.FOLD_SURF_MODE;
  }
});

// ── FALSIFIER: the pointer is lossless ONLY while the bytes persist. A pointer with no bytes behind it loses the content. ──
test("FALSIFIER: addresses are not the bytes — a trail that never got the turns resolves to nothing", () => {
  const turns = HISTORY(20);
  const printed = [...surf({ ask: "x", turns, mode: "pointer" }).note.matchAll(/turn (\d+)/g)].map((m) => Number(m[1]));
  assert.ok(printed.length > 0, "premise: the pointer prints turn numbers");
  const empty = new Set(W.turnsOf({ task: fresh() }).map((t) => t.n));
  assert.ok(printed.some((k) => !empty.has(k)), "premise: a pointer into a store with no turns resolves to nothing");
  assert.ok(!surf({ ask: "x", turns, mode: "pointer" }).note.includes(SENTENCE), "the note is addresses, not bytes");
});
