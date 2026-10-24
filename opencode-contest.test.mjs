// opencode-contest.test.mjs — the contest: two claims of one piece on the same ends whose typed values cannot both hold; the null collapses it.
import test from "node:test";
import assert from "node:assert/strict";
import { claimGraph, contests, rest, shuffleEnds } from "./opencode-contest.mjs";

const DOLPHINS = [
  { text: "Thirty-six dolphin species are found in every ocean.", standing: "grounded", at: "marinebio#1" },
  { text: "There are around forty to forty-five dolphin species living in nearly all aquatic environments, from oceans to fresh water, at temperatures below 0°C to above 30°C.", standing: "grounded", at: "marinebio#2" },
];
const run = async (claims) => { const graph = await claimGraph({ claims }); return { graph, cs: contests({ graph }) }; };

test("C1 the dolphins pair is a contest carrying both addresses, resting", async () => {
  const { graph, cs } = await run(DOLPHINS);
  assert.equal(cs.length, 1);
  assert.deepEqual([cs[0].a.at, cs[0].b.at], ["marinebio#1", "marinebio#2"]);
  assert.equal(cs[0].type, "count");
  assert.equal(cs[0].settled, null);
  assert.ok(cs[0].ends.includes("dolphin"));
  const r = rest({ graph, contests: cs });
  assert.deepEqual([r.rests.length, r.contests, r.conceded], [0, 1, 0]);
});

test("C2 36 species against '36 species in every ocean' is not a contest", async () => {
  const { cs } = await run([
    { text: "Thirty-six dolphin species are recognised.", at: "x1" },
    { text: "There are 36 dolphin species in every ocean.", at: "x2" },
  ]);
  assert.equal(cs.length, 0);
});

test("C3 a range containing the value is consistent; a round number at its grain is consistent; a disjoint range is a contest", async () => {
  const inside = await run([{ text: "Varmouth Hall has 36 rooms.", at: "r1" }, { text: "Varmouth Hall has between 30 and 40 rooms.", at: "r2" }]);
  assert.equal(inside.cs.length, 0);
  const round = await run([{ text: "Varmouth Hall stands 8,849 metres from the harbour.", at: "r3" }, { text: "Varmouth Hall stands about 9,000 metres from the harbour.", at: "r4" }]);
  assert.equal(round.cs.length, 0);
  const apart = await run([{ text: "Varmouth Hall has 36 rooms.", at: "r5" }, { text: "Varmouth Hall has 40 to 45 rooms.", at: "r6" }]);
  assert.equal(apart.cs.length, 1);
});

test("C4 completed 1759 / completed 1882 contests on one referent and not when third/fourth index different referents", async () => {
  const same = await run([
    { text: "The Eddystone Lighthouse was completed in 1759.", at: "e1" },
    { text: "The Eddystone Lighthouse was completed in 1882.", at: "e2" },
  ]);
  assert.equal(same.cs.length, 1);
  assert.equal(same.cs[0].type, "date");
  const indexed = await run([
    { text: "The third Eddystone Lighthouse was completed in 1759.", at: "e3" },
    { text: "The fourth Eddystone Lighthouse was completed in 1882.", at: "e4" },
  ]);
  assert.equal(indexed.cs.length, 0);
  assert.ok(indexed.graph.nodes[0].ends.some((e) => e.endsWith("#3")));
  assert.ok(indexed.graph.nodes[1].ends.some((e) => e.endsWith("#4")));
});

test("C5 a date under a different relation on the same ends is not a contest (born / died)", async () => {
  const { cs } = await run([{ text: "Marie Curie was born in 1867.", at: "m1" }, { text: "Marie Curie died in 1934.", at: "m2" }]);
  assert.equal(cs.length, 0);
});

test("C6 table rows are claims like any unit: 'Species | 36' against 'Species | 40–45' is the same contest", async () => {
  const { graph, cs } = await run([
    { text: "Species | 36", standing: "grounded", at: "table:r1", kind: "table" },
    { text: "Species | 40–45", standing: "grounded", at: "table:r2", kind: "table" },
  ]);
  assert.equal(cs.length, 1);
  assert.deepEqual([cs[0].a.at, cs[0].b.at], ["table:r1", "table:r2"]);
  assert.equal(graph.nodes[0].kind, "table");
});

test("C7 settled: a third claim that carries both values concedes; a time-scoped side concedes to the scoped claim", async () => {
  const third = await run([
    { text: "Varmouth Hall has 36 bells.", at: "s1" },
    { text: "Varmouth Hall has 40 bells.", at: "s2" },
    { text: "Varmouth Hall's bells rose from 36 to 40.", at: "s3" },
  ]);
  assert.equal(third.cs.length, 1);
  assert.equal(third.cs[0].settled?.by, "s3");
  const r = rest({ graph: third.graph, contests: third.cs });
  assert.deepEqual([r.contests, r.conceded, r.rests.length], [1, 1, 1]);
  const scoped = await run([{ text: "In 2010 Varmouth Hall had 36 bells.", at: "s4" }, { text: "Varmouth Hall has 40 bells.", at: "s5" }]);
  assert.equal(scoped.cs.length, 1);
  assert.equal(scoped.cs[0].settled?.by, "s4");
  const twoScopes = await run([{ text: "In 2010 Varmouth Hall had 36 bells.", at: "s6" }, { text: "In 2020 Varmouth Hall had 40 bells.", at: "s7" }]);
  assert.equal(twoScopes.cs.length, 0);
});

test("C8 gaps are typed, never guessed: no ends, no value", async () => {
  const { graph, cs } = await run([{ text: "It was a fine morning.", at: "g1" }, { text: "Varmouth Hall is old.", at: "g2" }, { text: "Varmouth Hall has 36 bells.", at: "g3" }]);
  assert.equal(cs.length, 0);
  assert.deepEqual(graph.gaps.map((g) => g.gap).sort(), ["no_ends", "no_value"]);
});

test("C9 shuffled ends collapse the contest count", async () => {
  const claims = [];
  const names = ["Ashbury", "Caldmere", "Dunford", "Elswick", "Fenwick", "Garrow", "Holmby", "Ickford"];
  const heads = ["bells", "rooms", "floors", "steps", "windows", "doors", "clocks", "gardens"];
  names.forEach((n, i) => {
    claims.push({ text: `${n} Tower has ${20 + i} ${heads[i]}.`, at: `${n}-1` });
    claims.push({ text: `${n} Tower has ${40 + i} ${heads[i]}.`, at: `${n}-2` });
  });
  const graph = await claimGraph({ claims });
  const real = contests({ graph }).length;
  assert.equal(real, names.length);
  let seed = 11;
  const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  let shuffled = 0;
  for (let k = 0; k < 20; k += 1) shuffled += contests({ graph: shuffleEnds(graph, rng) }).length;
  assert.ok(shuffled / 20 <= 0.5 * real, `shuffled mean ${shuffled / 20} against real ${real}`);
});
