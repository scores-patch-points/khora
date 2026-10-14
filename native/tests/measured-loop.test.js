// measured-loop — the DMD stopping test must not read a limit cycle as decay (D12).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as M from "../kernel/measured-loop.js";

const { makeMeasuredLoop } = M;
const trace = (seq, ceiling = 20) => {
  const m = makeMeasuredLoop({ ceiling });
  const out = [];
  for (const x of seq) { m.push(x); const v = m.verdict(); out.push(v); if (!v.continue) break; }
  return out;
};

test("D12 — a limit cycle (4,2,4,2) is 'cycling' and stops, not 'decaying' until the ceiling", () => {
  const t = trace([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]);
  const last = t.at(-1);
  assert.equal(last.verdict, "cycling");
  assert.equal(last.continue, false);
  assert.equal(last.period, 2);
  assert.equal(t.length, 4, "stops at the first full repeat (round 4), not at the ceiling");
  assert.ok(t.slice(0, -1).every((v) => v.continue === true), "no earlier round was already a stop");
});

test("D12 — a 3-cycle and a cycle that starts mid-run are found by the same rule (no threshold)", () => {
  assert.equal(trace([6, 4, 2, 6, 4, 2]).at(-1).verdict, "cycling");
  assert.equal(trace([6, 6, 4, 2, 4, 2]).at(-1).verdict, "cycling");
  assert.equal(trace([6, 6, 4, 2, 4, 2]).at(-1).period, 2);
});

test("D12 — positive control: monotone decay is still 'decaying' and continues", () => {
  const t = trace([8, 6, 5, 3, 2]);
  assert.deepEqual(t.map((v) => v.verdict), ["insufficient_history", "insufficient_history", "decaying", "decaying", "decaying"]);
  assert.ok(t.every((v) => v.continue === true));
});

test("D12 — positive control: resolved, converged, diverging and ceiling read exactly as before", () => {
  assert.equal(trace([3, 1, 0]).at(-1).verdict, "resolved");
  assert.equal(trace([5, 5, 5]).at(-1).verdict, "converged");
  assert.equal(trace([2, 3, 5]).at(-1).verdict, "diverging");
  assert.equal(trace([9, 7, 6, 5, 4], 3).at(-1).verdict, "ceiling");
});

test("D12 — negative control: a count that returns once is not yet a cycle (needs a full repeat of the block)", () => {
  const t = trace([4, 2, 4]);
  assert.ok(t.every((v) => v.verdict !== "cycling"));
  const u = trace([5, 3, 4, 2, 1]);
  assert.ok(u.every((v) => v.verdict !== "cycling"), "progress through a bump is not a cycle");
});

test("D12 — a constant block is stillness, not a cycle: 'converged' still wins", () => {
  assert.equal(trace([7, 7, 7, 7]).at(-1).verdict, "converged");
});

test("D12 — the verdict is declared in VERDICTS", () => {
  assert.equal(M.VERDICTS.CYCLING, "cycling");
});
