// kernel/trail-rules.test.mjs — the promotion of a trail to a rule, and the rules about rules.
// Written before the module. Each test says what would falsify the rule it checks.
import test from "node:test";
import assert from "node:assert/strict";
import { promoteRoute, promoteHead, ruleEntry, META_RULES, metaRuleTable, mulberry32, PROMOTE_NULL_N } from "./trail-rules.js";

const DAY = 86400000, T0 = Date.UTC(2026, 10, 1);
// deposits for one head: [{route, ok, at}], one per day, in order
const mk = (rows) => rows.map(([route, ok], i) => ({ head: "h", route, ok, ms: 5, at: T0 + i * DAY }));
const alternating = (n, f) => Array.from({ length: n }, (_, i) => [i % 2 ? "B" : "A", f(i)]);

test("M4: a route that resolves every time where the other never does is promoted, on a held-out third", () => {
  const d = mk(alternating(60, (i) => i % 2 === 0));          // A always ok, B never
  const r = promoteRoute(d, "h", "A");
  assert.equal(r.state, "promoted", JSON.stringify(r));
  assert.ok(r.obs > r.nullMax, "the observed hits must exceed every shuffled run, not a typed threshold");
  assert.equal(r.nullN, PROMOTE_NULL_N);
  assert.ok(r.train > r.test && r.test > 0, "the later third is held out from the nomination");
  assert.equal(promoteRoute(d, "h", "B").state, "undecided", "the route that never resolves is not promoted");
});

test("M4: the same input and seed give the same verdict (a verdict can be re-derived from the log)", () => {
  const d = mk(alternating(60, (i) => i % 2 === 0));
  assert.deepEqual(promoteRoute(d, "h", "A"), promoteRoute(d, "h", "A"));
  assert.notEqual(promoteRoute(d, "h", "A", { seed: 7 }).seed, promoteRoute(d, "h", "A").seed);
});

test("M4: too few deposits cannot beat the null, so nothing is promoted and no minimum was typed", () => {
  for (const n of [2, 4, 6]) assert.notEqual(promoteRoute(mk(alternating(n, (i) => i % 2 === 0)), "h", "A").state, "promoted", `n=${n}`);
});

test("M4: one route alone has nothing to be better than: undecided, with the reason", () => {
  const r = promoteRoute(mk(Array.from({ length: 40 }, () => ["A", true])), "h", "A");
  assert.equal(r.state, "undecided"); assert.match(r.why, /no other route/);
});

test("M4 control built to fail: routes whose successes are chance are not promoted (false-promotion rate measured over many heads)", () => {
  let rng = mulberry32(12345), promoted = 0, heads = 200;
  for (let k = 0; k < heads; k++) {
    const rows = Array.from({ length: 45 }, (_, i) => [["A", "B", "C"][Math.floor(rng() * 3)], rng() < 0.5]);
    const d = mk(rows);
    for (const r of ["A", "B", "C"]) if (promoteRoute(d, "h", r).state === "promoted") promoted++;
  }
  // 600 route-tests on pure noise. Report the rate; the rule is falsified if it is not small.
  console.log(`# false promotions on chance labels: ${promoted} of ${heads * 3} route-tests`);
  assert.ok(promoted / (heads * 3) < 0.02, `false promotion rate ${promoted}/${heads * 3}`);
});

test("M4: a route that worked only early is not promoted: the later third decides (held out)", () => {
  const d = mk(alternating(60, (i) => (i < 30 ? i % 2 === 0 : false)));   // A ok in the first half, then never
  assert.notEqual(promoteRoute(d, "h", "A").state, "promoted");
});

test("M2 meets M4: an alarm forgets what the route had deposited before it, so a wrong answer unpromotes", () => {
  const d = mk(alternating(60, (i) => i % 2 === 0));
  assert.equal(promoteRoute(d, "h", "A").state, "promoted");
  const vetoAt = T0 + 59 * DAY;                                   // the route gave a wrong answer at the end
  const r = promoteRoute(d, "h", "A", { vetoes: { A: vetoAt } });
  assert.equal(r.state, "demoted"); assert.match(r.why, /alarm/);
});

test("M4: promoteHead judges every route of a head and never mutates its input", () => {
  const d = mk(alternating(60, (i) => i % 2 === 0)), before = JSON.stringify(d);
  const out = promoteHead(d, "h");
  assert.deepEqual(out.map((x) => [x.route, x.state]).sort(), [["A", "promoted"], ["B", "undecided"]]);
  assert.equal(JSON.stringify(d), before);
});

test("M6: a promotion is an entry for the pharos by cell and kind: it names its seed, its null and its inputs, and holds no text", () => {
  const d = mk(alternating(60, (i) => i % 2 === 0)), r = promoteRoute(d, "h", "A"), e = ruleEntry(r);
  assert.equal(e.kind, "trail-rule"); assert.match(e.cell, /^[A-Z]{3}·(Ground|Figure|Pattern)$/);
  assert.equal(e.addr, "trail-rule:h|A"); assert.equal(e.basis.seed, r.seed); assert.equal(e.basis.instrument, "trail-rules@1");
  assert.ok(!/\s/.test(e.body.head), "a head is marks, never the question's words");
  assert.throws(() => ruleEntry({ ...r, head: "two words" }), /head/);
});

test("M6: the rules about rules are declared as data, each with a falsifier, and shown as a table", () => {
  assert.deepEqual(META_RULES.map((m) => m.id), ["M1", "M2", "M3", "M4", "M5", "M6"]);
  for (const m of META_RULES) { assert.ok(m.rule && m.falsifier && m.enforcedBy, m.id); assert.ok(Object.isFrozen(m), m.id); }
  const t = metaRuleTable();
  assert.equal(t.length, 6); assert.ok(t.every((row) => row.id && row.rule && row.falsifier && row.enforcedBy && typeof row.built === "boolean"));
  assert.equal(t.find((r) => r.id === "M4").built, true);
});
