// stigmergy.test.js — Wilson's kernel trails. Each test states a behaviour and tries to break it.
// The two defects fixed 2026-11-14 are pinned both ways: the new default, and the old order behind its switch.
import test from "node:test";
import assert from "node:assert/strict";
import { deposit, routeOrderFor, trailStats, trailWeight } from "./stigmergy.js";

const DAY = 86400000, NOW = 100 * DAY, R = ["wiki", "web", "local"];
const quiet = () => 0.99; // rng that never scouts
const loud = () => 0;     // rng that always scouts
const fold = (events) => events.reduce(deposit, {});

test("earned trail first; equal strength broken by latency", () => {
  const t = fold([
    { head: "h", route: "wiki", ok: true, ms: 900, at: NOW },
    { head: "h", route: "local", ok: true, ms: 300, at: NOW },
  ]);
  assert.deepEqual(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet }), ["local", "wiki", "web"]);
});

test("DEFECT 1 fixed: a route that only ever failed sorts after never-tried routes", () => {
  const t = fold(Array.from({ length: 5 }, () => ({ head: "h", route: "web", ok: false, ms: 10, at: NOW })));
  assert.deepEqual(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet }), ["wiki", "local", "web"]);
  assert.deepEqual(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet, deadLast: false }), ["web", "wiki", "local"]);
});

test("exponential evaporation never reaches zero: an old success stays earned (disclosed, not a cure for lock-in)", () => {
  const t = fold([{ head: "h", route: "web", ok: true, ms: 10, at: 0 }]);
  // after 100 days at a 7-day half-life the weight is ~6e-7 > 0, so it is still earned; only scouts reopen the choice
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet })[0], "web");
  // ...and with evaporation off it is earned at full strength
  assert.equal(trailStats(t, "h", { now: NOW, routes: R, halfLifeDays: Infinity }).find((s) => s.route === "web").strength, 1);
});

test("half-life is switchable: evaporation lets a fresh trail beat an old strong one", () => {
  const t = fold([
    ...Array.from({ length: 3 }, () => ({ head: "h", route: "wiki", ok: true, ms: 100, at: NOW - 60 * DAY })),
    { head: "h", route: "web", ok: true, ms: 100, at: NOW },
  ]);
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet })[0], "web");
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet, halfLifeDays: Infinity })[0], "wiki");
});

test("scouts probe a never-tried route first", () => {
  const t = fold([{ head: "h", route: "wiki", ok: true, ms: 1, at: NOW }]);
  assert.deepEqual(routeOrderFor(t, "h", { now: NOW, routes: R, rng: loud }), ["web", "wiki", "local"]);
});

test("DEFECT 2 fixed: scouts keep probing after every route is tried (the mill)", () => {
  const t = fold([
    { head: "h", route: "wiki", ok: true, ms: 1, at: NOW },
    { head: "h", route: "web", ok: false, ms: 1, at: NOW - DAY },
    { head: "h", route: "local", ok: false, ms: 1, at: NOW - 2 * DAY },
  ]);
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: loud })[0], "local"); // least recently tried
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: loud, scoutTried: false })[0], "wiki"); // old: no scout
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: loud, explore: 0 })[0], "wiki"); // scouts off
});

test("never-scouting rng gives a deterministic order; one route never scouts", () => {
  assert.deepEqual(routeOrderFor({}, "h", { now: NOW, routes: R, rng: quiet }), R);
  assert.deepEqual(routeOrderFor({}, "h", { now: NOW, routes: ["only"], rng: loud }), ["only"]);
});

test("state is a fold over the deposit log: same events, same order", () => {
  const ev = [
    { head: "h", route: "web", ok: true, ms: 5, at: NOW - DAY },
    { head: "h", route: "wiki", ok: false, ms: 5, at: NOW },
  ];
  assert.deepEqual(routeOrderFor(fold(ev), "h", { now: NOW, routes: R, rng: quiet }), routeOrderFor(fold([...ev]), "h", { now: NOW, routes: R, rng: quiet }));
});

test("routes outside the default list still order (callers filter them)", () => {
  const t = fold([{ head: "h", route: "extra", ok: true, ms: 1, at: NOW }]);
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet })[0], "extra");
});

// --- 2026-11-14: power-law evaporation, measured on real use (ledgers/sig-real-use + its replication) ---
const S = 1000;

test("power law is the default: weight = age_seconds ** -0.5, so 4x older weighs half", () => {
  assert.equal(trailWeight(NOW - 100 * S, NOW), 0.1);
  assert.equal(trailWeight(NOW - 400 * S, NOW) / trailWeight(NOW - 100 * S, NOW), 0.5);
  assert.equal(trailWeight(NOW, NOW), 1); // 1-second floor: a deposit made now has weight 1, never infinity
});

test("strength is the ACT-R power sum: many older uses can outweigh one recent use (recency alone would not)", () => {
  const t = fold([
    ...Array.from({ length: 5 }, () => ({ head: "h", route: "wiki", ok: true, ms: 100, at: NOW - 100 * S })), // 5 x 0.1 = 0.5
    { head: "h", route: "web", ok: true, ms: 100, at: NOW - 10 * S }, // 10 ** -0.5 = 0.316
  ]);
  assert.equal(routeOrderFor(t, "h", { now: NOW, routes: R, rng: quiet })[0], "wiki");
  const st = trailStats(t, "h", { now: NOW, routes: R });
  assert.ok(Math.abs(st.find((s) => s.route === "wiki").strength - 0.5) < 1e-12);
});

test("power law is scale-free: stretching every age by the same factor never changes the order (no half-life to type)", () => {
  const mk = (k) => fold([
    { head: "h", route: "wiki", ok: true, ms: 100, at: NOW - 4 * 3600 * S * k },
    { head: "h", route: "wiki", ok: true, ms: 100, at: NOW - 9 * 3600 * S * k },
    { head: "h", route: "web", ok: true, ms: 100, at: NOW - 1 * 3600 * S * k },
  ]);
  const orders = [1, 24, 1000].map((k) => routeOrderFor(mk(k), "h", { now: NOW + 0, routes: R, rng: quiet }).join(","));
  assert.equal(new Set(orders).size, 1);
  // the exponential law with a 7-day half-life does depend on scale: at the largest stretch the order flips
  const exp = [1, 1000].map((k) => routeOrderFor(mk(k), "h", { now: NOW, routes: R, rng: quiet, law: "exp" })[0]);
  assert.deepEqual(exp, ["wiki", "web"]);
});

test("law: 'exp' has a TRUE half-life now (was exp(-t/h), which left 0.37 after one half-life)", () => {
  assert.equal(trailWeight(NOW - 7 * DAY, NOW, { law: "exp" }), 0.5);
  assert.equal(trailWeight(NOW - 14 * DAY, NOW, { law: "exp", halfLifeDays: 7 }), 0.25);
  assert.equal(trailWeight(0, NOW, { law: "exp", halfLifeDays: Infinity }), 1);
});

test("an unknown evaporation law is refused, never silently defaulted", () => {
  assert.throws(() => trailWeight(0, NOW, { law: "linear" }), /unknown evaporation law/);
});
