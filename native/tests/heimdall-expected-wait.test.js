// native/tests/heimdall-expected-wait.test.js — the expected-wait hold must be able to come back down (2026-10-13).
// Live, the local host's daemon-queue estimate sat at 12.6 s with nothing in flight: past the 12 s promise, so every
// /v1/code call was a 429, no turn ended, and hostEnd (the only thing that refreshes it) never ran. These pin the rule
// that broke the loop: the queue term waits BEHIND work, so with nothing ahead it is not a hold.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hostByName, hostBegin, hostEnd, expectedWaitMs, slaWaitMs } from "../../heimdall.mjs";

const MODEL = "gemma2:2b";
const local = () => {
  const h = hostByName("local");
  assert.ok(h, "the local host exists");
  h.downAt = null; h.shapeMismatch = false;
  h.inflight = 0; h.inflightBy = new Map();
  h.meanMs.set(MODEL, 24790); h.queueMs = 12577; // the stuck state, verbatim from heimdall-log.jsonl
  return h;
};

test("the stuck state seen live: a stale queue estimate past the promise, nothing in flight -> admitted, not held", () => {
  local();
  const ew = expectedWaitMs(MODEL);
  assert.equal(ew.inflight, 0);
  assert.ok(12577 > slaWaitMs(), "the stale estimate alone is past the promise (the old formula held on it)");
  assert.ok(ew.ms <= slaWaitMs(), `with nothing ahead the wait is inside the promise (got ${ew.ms})`);
  assert.equal(ew.queueMs, 12577, "the estimate is still disclosed, only not counted");
});

test("CONTROL: with one turn ahead the queue counts again and the same estimate holds the next caller", () => {
  local();
  hostBegin("local", MODEL);
  try {
    const ew = expectedWaitMs(MODEL);
    assert.equal(ew.inflight, 1);
    assert.equal(ew.ms, 24790 + 12577);
    assert.ok(ew.ms > slaWaitMs(), "a real line past the promise still holds");
  } finally { hostEnd("local", { model: MODEL, ok: true }); }
});

test("the admitted turn is what measures the queue again: hostEnd folds the new queue into the estimate", () => {
  const h = local();
  hostBegin("local", MODEL);
  hostEnd("local", { model: MODEL, ms: 9000, ok: true, queueMs: 0 });
  assert.ok(h.queueMs < 12577, `an empty queue measured pulls the estimate down (now ${h.queueMs})`);
});
