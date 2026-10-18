// opencode-trail.test.mjs — the door's `trail` event: off by default, gated by the cost gate, monotone, and it holds no bytes.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "trail-"));
process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "trail-st-"));
const { answer } = await import(`./opencode-doorway.mjs?t=${Date.now()}`);
const results = Array.from({ length: 12 }, (_, i) => ({ id: `call_${i}`, key: `read:src/f${i % 8}.js`, step: i }));
const ask = (extra = {}) => answer({ event: "trail", sessionID: "ses_trail1", results, idleMs: 0, tokens: 10_000, window: 200_000, ...extra });

test("T1 off by default: FOLD_TRAIL unset answers go:false and changes nothing", async () => {
  delete process.env.FOLD_TRAIL;
  assert.deepEqual(await ask({ idleMs: 999_999 }), { go: false, why: "off" });
});
test("T2 on, but a warm cache and a small prompt: no compaction", async () => {
  process.env.FOLD_TRAIL = "1";
  const r = await ask();
  assert.equal(r.go, false);
  assert.equal(r.why, "cache_warm");
});
test("T3 on and the cache is cold: keep 5 keys' latest results, handles for the rest, none content-shaped", async () => {
  process.env.FOLD_TRAIL = "1";
  const r = await ask({ idleMs: 400_000 });
  assert.equal(r.go, true);
  assert.equal(r.why, "cache_cold");
  assert.equal(r.keep.length, 5);
  assert.equal(r.keep.length + Object.keys(r.point).length, results.length);
  for (const h of Object.values(r.point)) assert.match(h, /^r[0-9a-z]{5,}$/);
  assert.equal(new Set(Object.values(r.point)).size, Object.keys(r.point).length, "handles are unique");
  assert.ok(!JSON.stringify(r).includes("src/f"), "no path in the answer");
});
test("T4 window pressure compacts even while the cache is warm; and the plan is monotone over `already`", async () => {
  process.env.FOLD_TRAIL = "1";
  const r = await ask({ tokens: 150_000 });
  assert.equal(r.why, "window_pressure");
  const again = await ask({ tokens: 150_000, already: Object.keys(r.point) });
  for (const id of Object.keys(r.point)) assert.ok(again.point[id], `${id} came back`);
  assert.deepEqual(Object.fromEntries(Object.entries(again.point).filter(([id]) => r.point[id])), r.point, "the same handles, so the stubs never change the prefix");
});
test("T5 deterministic across calls: the same result keeps the same handle", async () => {
  process.env.FOLD_TRAIL = "1";
  const a = await ask({ idleMs: 400_000 }), b = await ask({ idleMs: 400_000 });
  assert.deepEqual(a.point, b.point);
});
