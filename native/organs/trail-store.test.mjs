// trail-store.test.mjs — the environment: deposits strengthen, they evaporate, an alarm forgets, a scout sometimes goes first, and two sessions that
// never call each other see each other's marks through the file.
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { makeTrailStore } from "./trail-store.mjs";

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trails-")), "t.json");
const DAY = 86400000;

test("a route that resolved is tried first next time, and a route never tried waits behind it", () => {
  let t = 1_000_000; const s = makeTrailStore({ file: tmp(), now: () => t });
  s.deposit("capital:thing", "wikipedia:lead", true, 900); t += 1000; s.deposit("capital:thing", "wikidata:claims", true, 300);
  assert.deepEqual(s.orderFor("capital:thing", ["wikipedia:search", "wikipedia:lead", "wikidata:claims"], { explore: 0 }), ["wikidata:claims", "wikipedia:lead", "wikipedia:search"], "equal strength, the faster one first; the untried one last");
  assert.deepEqual(s.known("capital:thing"), ["wikidata:claims", "wikipedia:lead"]);
});

test("trails evaporate: a week-old success counts 1/e of a fresh one (the kernel's 7-day constant is an e-folding time, not a half-life), and five weeks later it is almost gone", () => {
  let t = 0; const s = makeTrailStore({ file: tmp(), now: () => t });
  s.deposit("h", "a", true, 1); t = 7 * DAY; const half = s.stats("h", ["a"])[0].strength; t = 35 * DAY; const old = s.stats("h", ["a"])[0].strength;
  assert.ok(Math.abs(half - Math.exp(-1)) < 0.01, `e-folding, got ${half}`); assert.ok(old < 0.05, `got ${old}`);
});

test("an alarm forgets what the route had deposited, and a later success counts again", () => {
  let t = 1000; const s = makeTrailStore({ file: tmp(), now: () => t });
  s.deposit("who-wrote:person", "page:The Magic Flute|Composition", true, 5); assert.deepEqual(s.known("who-wrote:person"), ["page:The Magic Flute|Composition"]);
  t += 10; s.veto("who-wrote:person", "page:The Magic Flute|Composition", "it gave the librettist"); assert.deepEqual(s.known("who-wrote:person"), []);
  t += 10; s.deposit("who-wrote:person", "page:The Magic Flute|Composition", true, 5); assert.equal(s.known("who-wrote:person").length, 1, "only deposits after the alarm count");
});

test("a scout sometimes goes first, and the draw is the caller's own (a seed), so a replay is the same", () => {
  const s = makeTrailStore({ file: tmp() }); s.deposit("h", "a", true, 1);
  const first = (rng) => s.orderFor("h", ["a", "b", "c"], { explore: 0.5, rng })[0];
  assert.equal(first(() => 0.9), "a", "no scout"); assert.equal(first(() => 0.1), "b", "the first never-tried route is probed");
});

test("two stores on one file (two sessions) see each other's deposits and marks, and neither loses the other's", () => {
  const file = tmp(); let t = 5000;
  const a = makeTrailStore({ file, now: () => t, name: "a" }), b = makeTrailStore({ file, now: () => t, name: "b" });
  a.mark("wikipedia:throttled", t + 30000, "retry-after 30"); b.deposit("h", "x", true, 1); a.deposit("h", "y", true, 2);
  assert.ok(b.markedUntil("wikipedia:throttled") > t, "b learns of a's throttle mark without being told");
  assert.deepEqual(new Set(b.known("h")), new Set(["x", "y"])); assert.deepEqual(new Set(a.known("h")), new Set(["x", "y"]));
  t += 31000; assert.equal(b.markedUntil("wikipedia:throttled"), 0, "a mark lapses when its time has passed");
});

test("every deposit, alarm and mark is also offered to the caller's log", () => {
  const seen = []; const s = makeTrailStore({ file: tmp(), onMark: (m) => seen.push(m.kind) });
  s.deposit("h", "r"); s.veto("h", "r"); s.mark("k", Date.now() + 1000);
  assert.deepEqual(seen, ["trail-deposit", "trail-veto", "trail-mark"]);
});
