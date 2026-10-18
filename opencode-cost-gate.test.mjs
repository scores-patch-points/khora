import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { breakEven, makeGateTracker } from "./opencode-cost-gate.mjs";
import { read } from "./opencode-eot.mjs";

// prices in $/Mtok, from the measured cost facts: deepseek cache read is 2% of uncached input, sonnet 10%
const DEEPSEEK = { priceIn: 0.15, priceCacheRead: 0.003, priceCacheWrite: 0.15 };
const SONNET = { priceIn: 3, priceCacheRead: 0.3, priceCacheWrite: 3.75 };
const tok = (n) => n * 4; // chars for n tokens

test("warm, after a keep, the gate IS the inequality: (H-N)·R·p_cr > N·(p_w-p_cr)", () => {
  for (const price of [DEEPSEEK, SONNET]) {
    for (const H of [200, 1000, 2600, 2700, 5000, 40000]) {
      for (const N of [50, 200, 800]) {
        for (const R of [1, 2, 4, 10]) {
          const d = breakEven({ removedChars: tok(H), noteChars: tok(N), remainingCalls: R, ...price, cold: false, lastArm: "keep" });
          const lhs = (H - N) * R * price.priceCacheRead;
          const rhs = N * (price.priceCacheWrite - price.priceCacheRead);
          if (Math.abs(lhs - rhs) < 1e-9) continue; // the knife edge is a tie, not a claim
          assert.equal(d.fire, lhs > rhs, `H=${H} N=${N} R=${R} ${price.priceIn}`);
          assert.equal(d.arm, d.fire ? "cut" : "keep");
        }
      }
    }
  }
});

test("the 50x case: on deepseek flash a 4-call ask with a 200-token note needs about 13x the note kept out", () => {
  const N = 200;
  const refuse = breakEven({ removedChars: tok(2000), noteChars: tok(N), remainingCalls: 4, ...DEEPSEEK, lastArm: "keep" });
  const fire = breakEven({ removedChars: tok(4000), noteChars: tok(N), remainingCalls: 4, ...DEEPSEEK, lastArm: "keep" });
  assert.equal(refuse.fire, false, "2000 tokens kept out does not repay re-billing 200 at 50x");
  assert.equal(fire.fire, true, "4000 does");
  assert.match(refuse.basis, /cut refused/);
  assert.ok(refuse.margin < 0 && fire.margin > 0);
});

test("a cold cache means the prefix is already gone: the cut wins whenever it removes anything", () => {
  const d = breakEven({ removedChars: tok(300), noteChars: tok(200), remainingCalls: 1, ...DEEPSEEK, cold: true });
  assert.equal(d.fire, true);
  assert.match(d.basis, /cache cold/);
  const warm = breakEven({ removedChars: tok(300), noteChars: tok(200), remainingCalls: 1, ...DEEPSEEK, cold: false, lastArm: "keep" });
  assert.equal(warm.fire, false, "the same numbers, warm, refuse");
});

test("a flip is priced: after a cut the keep arm must rebuild the whole history, so staying cut wins", () => {
  const stay = breakEven({ removedChars: tok(1500), noteChars: tok(200), remainingCalls: 2, ...DEEPSEEK, lastArm: "cut" });
  const fromKeep = breakEven({ removedChars: tok(1500), noteChars: tok(200), remainingCalls: 2, ...DEEPSEEK, lastArm: "keep" });
  assert.equal(stay.fire, true);
  assert.equal(fromKeep.fire, false);
});

test("no cache discount priced: the penalty vanishes and the cut fires iff it removes tokens", () => {
  const d = breakEven({ removedChars: tok(500), noteChars: tok(200), remainingCalls: 3, priceIn: 1, priceCacheRead: 0, priceCacheWrite: 0, lastArm: "keep" });
  assert.equal(d.decided, true);
  assert.equal(d.fire, true);
  assert.equal(d.inputs.cached, false);
  const none = breakEven({ removedChars: tok(100), noteChars: tok(200), remainingCalls: 3, priceIn: 1 });
  assert.equal(none.fire, false, "a note bigger than what it replaces is never a cut");
});

test("a missing quantity is ungated and says so — never guessed", () => {
  for (const bad of [{ removedChars: undefined, noteChars: 10, priceIn: 1 }, { removedChars: 100, noteChars: 10 }, { removedChars: 0, noteChars: 10, priceIn: 1 }]) {
    const d = breakEven(bad);
    assert.equal(d.decided, false);
    assert.equal(d.fire, true, "ungated = the old behaviour");
    assert.match(d.basis, /^ungated: /);
  }
});

test("tracker: first call of an ask is flagged, later calls reuse its arm, cold follows the TTL", () => {
  const t = makeGateTracker({ ttlMs: 1000, defaultCalls: 4 });
  const a = t.observe({ session: "s", ask: "q1", now: 0 });
  assert.equal(a.first, true);
  assert.equal(a.cold, true, "never seen: cold");
  assert.equal(a.callsSource, "assumed");
  assert.equal(a.remainingCalls, 4);
  t.settle({ session: "s", arm: "keep" });
  const b = t.observe({ session: "s", ask: "q1", now: 100 });
  assert.equal(b.first, false);
  assert.equal(b.arm, "keep", "the ask's arm is reused");
  assert.equal(b.remainingCalls, 3);
  const c = t.observe({ session: "s", ask: "q2", now: 600 });
  assert.equal(c.first, true);
  assert.equal(c.cold, false, "within the TTL");
  assert.equal(c.lastArm, "keep");
  assert.equal(c.arm, null, "a new ask decides afresh");
  const d = t.observe({ session: "s", ask: "q3", now: 600 + 5000 });
  assert.equal(d.cold, true, "past the TTL");
});

test("tracker: R is learned from the session's own asks once two have finished, and memory is bounded", () => {
  const t = makeGateTracker({ defaultCalls: 9, maxSessions: 3 });
  let now = 0;
  for (const [ask, n] of [["a", 2], ["b", 2], ["c", 2]]) for (let i = 0; i < n; i++) t.observe({ session: "s", ask, now: (now += 10) });
  const o = t.observe({ session: "s", ask: "d", now: (now += 10) });
  assert.equal(o.callsSource, "median of 3 earlier asks");
  assert.equal(o.remainingCalls, 2);
  for (const s of ["x1", "x2", "x3", "x4", "x5"]) t.observe({ session: s, ask: "q", now: 1 });
  assert.ok(t.size() <= 3);
});

// ── the door ───────────────────────────────────────────────────────────────────────────────────────────
const boot = async () => {
  process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "wn-"));
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  delete process.env.FOLD_COST_GATE;
  return import(`./opencode-doorway.mjs?t=${Date.now()}${Math.random()}`);
};
const turns = (n) => Array.from({ length: n }, (_, i) => ({ n: i + 1, ask: `fix the ${["parser", "lexer", "emitter", "scheduler", "planner", "linker"][i % 6]} bug number ${i} that drops the trailing token`, answer: Array.from({ length: 6 }, (_, k) => `I changed the ${["parser", "lexer", "emitter"][i % 3]} loop in src/mod${i}.js so token ${i}.${k} is handled before the flush and the buffer is reset.`).join(" "), grounds: ["read", "edit"] }));

test("door: a cut the cache cannot repay is refused (uncut, nothing ledgered), and the decision is in the one store", async () => {
  const { answer } = await boot();
  const task = "gate-refuse", sessionID = "ses_gaterefuse1";
  // an unseen session is cold, and a cold cache has nothing to burn: warm it first with an ask whose history is too small to cut
  const warm = await answer({ event: "surf", sessionID, task, ask: "warm", turns: turns(6), keptOutChars: 100, ...DEEPSEEK });
  assert.equal(warm.gate.arm, "keep");
  const r = await answer({ event: "surf", sessionID, task, ask: "continue", turns: turns(6), keptOutChars: 2000, ...DEEPSEEK });
  assert.equal(r.uncut, true);
  assert.equal(r.gated, true);
  assert.equal(r.gate.arm, "keep");
  assert.equal(r.gate.fire, false);
  assert.match(r.gate.basis, /cut refused/);
  const evs = read(task).events.filter((e) => e.stage === "reason" && e.detail?.op === "COST_GATE");
  assert.equal(evs.length, 2, "one decision per ask");
  const ev = evs.at(-1);
  assert.equal(ev.detail.arm, "keep");
  assert.equal(ev.detail.inputs.cold, false);
  assert.equal(ev.detail.inputs.pcr, DEEPSEEK.priceCacheRead);
  assert.ok(ev.detail.costCut > ev.detail.costKeep);
  const m = await answer({ event: "meter" });
  assert.equal(m.saved?.projectedChars ?? m.projectedChars ?? 0, 0, "a refused cut keeps nothing out, so it is not counted as savings");
});

test("door: a cut the cache can repay fires, and later calls of the same ask keep that arm", async () => {
  const { answer } = await boot();
  const task = "gate-fire", sessionID = "ses_gatefire0001";
  const big = 400_000; // 100k tokens of history kept out
  const first = await answer({ event: "surf", sessionID, task, ask: "continue", turns: turns(6), keptOutChars: big, ...DEEPSEEK });
  assert.equal(first.uncut, undefined);
  assert.equal(first.gate.arm, "cut");
  assert.match(first.note, /<fold-said>|\[fold:/, "the ladder note rides");
  const again = await answer({ event: "surf", sessionID, task, ask: "continue", turns: turns(6), keptOutChars: big, ...DEEPSEEK });
  assert.equal(again.gate.arm, "cut");
  assert.match(again.gate.basis, /reused/);
  const evs = read(task).events.filter((e) => e.stage === "reason" && e.detail?.op === "COST_GATE");
  assert.equal(evs.length, 1, "decided once per ask, logged once");
});

test("door: with no prices the gate stays out of the way; FOLD_COST_GATE=0 removes it", async () => {
  const { answer } = await boot();
  const plain = await answer({ event: "surf", sessionID: "ses_gateplain01", task: "gate-plain", ask: "continue", turns: turns(6), keptOutChars: 6000 });
  assert.equal(plain.gate.decided, false);
  assert.notEqual(plain.uncut, true, "ungated = the cut proceeds as before");
  process.env.FOLD_COST_GATE = "0";
  try {
    const off = await answer({ event: "surf", sessionID: "ses_gateoff0001", task: "gate-off", ask: "continue", turns: turns(6), keptOutChars: 6000, ...DEEPSEEK });
    assert.equal(off.gate, undefined);
    assert.notEqual(off.uncut, true);
  } finally { delete process.env.FOLD_COST_GATE; }
});
