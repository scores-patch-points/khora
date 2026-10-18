// Falsification: the box governor.
//
// Claims under test:
//   1. THRESHOLDS — under soft, nothing runs; at soft, the soft evictors run; at critical, soft+critical.
//   2. PRIORITY — evictors run in priority order (higher first).
//   3. CONTAINMENT — an evictor that throws is skipped, never blocks the rest.
//   4. THE MODEL EVICTOR is a lease-breaker: it asks every resident model to leave (keep_alive: 0).
//   5. INERT WITHOUT A SIGNAL — a budget of 0 (no reading) never sheds.
import test from "node:test";
import assert from "node:assert/strict";
import { createGovernor, modelsEvictor, systemSample, MB } from "./box-governor.mjs";

const quiet = () => {};
const sample = (bytes) => async () => ({ bytes, swapUsed: 0, swapTotal: 6_000 * MB, source: "test" });

test("thresholds: nothing under soft; soft at soft; soft+critical at critical", async () => {
  const budget = 100 * MB;
  const ran = [];
  const g = createGovernor({ budgetBytes: budget, sample: sample(70 * MB), warn: quiet });
  g.registerEvictor("soft-unload", async () => { ran.push("soft"); return true; }, { level: "soft" });
  g.registerEvictor("critical-drop", async () => { ran.push("critical"); return true; }, { level: "critical" });
  assert.equal((await g.check()).level, null, "under soft sheds nothing");
  assert.deepEqual(ran, []);
  g.check; // reassign sample via a new governor for the next two
  const g2 = createGovernor({ budgetBytes: budget, sample: sample(85 * MB), warn: quiet });
  const ran2 = [];
  g2.registerEvictor("s", async () => { ran2.push("s"); return true; }, { level: "soft" });
  g2.registerEvictor("c", async () => { ran2.push("c"); return true; }, { level: "critical" });
  await g2.check();
  assert.deepEqual(ran2, ["s"], "at soft, only soft evictors run");
  const g3 = createGovernor({ budgetBytes: budget, sample: sample(95 * MB), warn: quiet });
  const ran3 = [];
  g3.registerEvictor("s", async () => { ran3.push("s"); return true; }, { level: "soft" });
  g3.registerEvictor("c", async () => { ran3.push("c"); return true; }, { level: "critical" });
  await g3.check();
  assert.deepEqual(ran3.sort(), ["c", "s"], "at critical, both levels run");
});

test("priority: higher sheds first", async () => {
  const order = [];
  const g = createGovernor({ budgetBytes: 10 * MB, sample: sample(9 * MB), warn: quiet });
  g.registerEvictor("low", async () => { order.push("low"); return true; }, { priority: 1 });
  g.registerEvictor("high", async () => { order.push("high"); return true; }, { priority: 9 });
  await g.check();
  assert.deepEqual(order, ["high", "low"]);
});

test("containment: a thrown evictor is skipped, the rest still run", async () => {
  const ran = [];
  const g = createGovernor({ budgetBytes: 10 * MB, sample: sample(9 * MB), warn: quiet });
  g.registerEvictor("bad", async () => { throw new Error("boom"); }, { priority: 9 });
  g.registerEvictor("good", async () => { ran.push("good"); return true; });
  const r = await g.check();
  assert.deepEqual(r.ran, ["good"]);
});

test("the model evictor is a lease-breaker: every resident model gets keep_alive 0", async () => {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push([url, opts.method || "GET", opts.body ? JSON.parse(opts.body) : null]);
    if (url.endsWith("/api/ps")) return { json: async () => ({ models: [{ name: "gemma2:2b" }, { name: "qwen2.5-coder:1.5b" }] }) };
    return { json: async () => ({}) };
  };
  const freed = await modelsEvictor({ host: "http://x", fetchImpl })();
  assert.equal(freed, true);
  const unloads = calls.filter(([u, m]) => u.endsWith("/api/generate"));
  assert.equal(unloads.length, 2, "both resident models unloaded");
  assert.ok(unloads.every(([, , body]) => body.keep_alive === 0), "keep_alive 0 = leave now");
});

test("inert without a signal: budget 0 never sheds", async () => {
  let ran = false;
  const g = createGovernor({ budgetBytes: 0, sample: sample(999 * MB), warn: quiet });
  g.registerEvictor("x", async () => { ran = true; return true; });
  await g.check();
  assert.equal(ran, false);
});

test("systemSample reports a shape (bytes + swap fields)", () => {
  const s = systemSample();
  assert.equal(typeof s.bytes, "number");
  assert.ok(s.bytes > 0);
  assert.ok("swapUsed" in s && "swapTotal" in s);
});
