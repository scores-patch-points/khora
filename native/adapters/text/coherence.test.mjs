// coherence.test.mjs — the self-emergent thread ontology: the identity assertions of what the system
// IS and DOES must stick together (they all share the referent `you`) and stay apart from the
// world-facts (which share `mina`/`jonathan`). No hand-written "this is an instruction" label.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cohere, threadsOf, threadOf } from "./coherence.js";

// what the system is and does — identity assertions, all about `you` (the system).
const identity = [
  { predicate: "be", kartṛ: ["you"], karman: ["system"] },
  { predicate: "answer", kartṛ: ["you"], karman: ["questions"] },
  { predicate: "be", kartṛ: ["you"], karman: ["smart"] },
];
// world-facts, about other beings.
const world = [
  { predicate: "give", kartṛ: ["jonathan"], karman: ["book"], adhikaraṇa: ["mina"] },
  { predicate: "live", kartṛ: ["mina"], adhikaraṇa: ["village"] },
];

test("the identity assertions cohere into one thread, the world-facts into another", () => {
  assert.ok(cohere(identity[0], identity[1]), "be(you,system) and answer(you,questions) share `you`");
  assert.ok(!cohere(identity[0], world[0]), "be(you,system) and give(jonathan,…) share nothing");

  const threads = threadsOf([...identity, ...world]);
  assert.equal(threads.length, 2, "exactly two threads emerge");
  assert.deepEqual(threads.map((t) => t.length).sort(), [2, 3], "one of 3 (identity), one of 2 (world)");
  const idThread = threads.find((t) => t.length === 3);
  assert.ok(idThread.every((t) => (t.kartṛ ?? []).includes("you")), "the 3-thread is the identity thread");
});

test("a query scopes to its own thread: jacob kupin shares no referent with the identity assertions", () => {
  const scope = threadOf([...identity, ...world], { predicate: "be", kartṛ: ["jacob kupin"] });
  assert.equal(scope.length, 0, "nothing coheres with a person the fold does not hold");
  const minaScope = threadOf([...identity, ...world], { predicate: "live", kartṛ: ["mina"] });
  assert.equal(minaScope.length, 2, "mina coheres with both world-facts, none of the identity assertions");
});
