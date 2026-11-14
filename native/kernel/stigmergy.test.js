// stigmergy.test.js — Wilson's kernel trails. Each test states a behaviour and tries to break it.
// The two defects fixed 2026-11-14 are pinned both ways: the new default, and the old order behind its switch.
import test from "node:test";
import assert from "node:assert/strict";
import { deposit, routeOrderFor, trailStats } from "./stigmergy.js";

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
