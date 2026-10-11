// tests/change-log.test.js — the record as READER-CHANGES, not inventory.
// The three falsifying controls of the change-log doctrine, pinned:
//   · a change-log whose ground can't be REPLAYED from its deltas breaks it;
//   · a reread that MOVES the reader but writes NOTHING breaks it;
//   · an understanding-change with NO byte address breaks it.

import test from "node:test";
import assert from "node:assert/strict";
import { eventsFromWeft, groundFromEvents, classifyEvents, assertEvent } from "../the-fold/change-log.js";

const rel = (i, label, subj, obj, { at, polarity = "+", src = "s1" } = {}) => ({
  relation: label,
  at: at ?? i,
  polarity,
  participants: [
    { ref: `${src}::r${subj}`, surface: subj },
    { ref: `${src}::r${obj}`, surface: obj },
  ],
});
const pass = (seq, address, cast, relations) => Object.freeze({ seq, address, cast, relations });

// ── 1. REPLAY: the ground folds deterministically and every delta has a base ─
test("groundFromEvents is a deterministic projection of the log (P159)", () => {
  const weft = [
    pass(0, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }],
      [rel(0, "is", "A", "B"), rel(1, "is", "B", "A")]),
  ];
  const e = eventsFromWeft(weft);
  const g1 = groundFromEvents(e), g2 = groundFromEvents(eventsFromWeft(weft));
  assert.deepEqual(g2, g1, "replay must be byte-identical");
  assert.equal(g1.rows.length, 2, "two relations seeded by the read");
  // every row's base is its NEW event's address — a delta with a base
  for (const row of g1.rows) assert.match(row.seeded, /#\d+$/, "the ground's base is a byte address");
});

test("the ground is NOT a separate inventory — it is the fold of the events", () => {
  const weft = [
    pass(0, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }],
      [rel(0, "is", "A", "B")]),
    // the same relation re-sighted at a new byte: CORROBORATE (the change is "now ×2")
    pass(1, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }],
      [rel(5, "is", "A", "B")]),
  ];
  const events = eventsFromWeft(weft);
  assert.equal(events.filter((e) => e.type === "NEW").length, 1);
  assert.equal(events.filter((e) => e.type === "CORROBORATE").length, 1);
  const ground = groundFromEvents(events);
  assert.equal(ground.rows[0].witnesses.length, 2, "the fold accrued the witness");
});

// ── 2. NO-CHANGE WRITES NOTHING ───────────────────────────────────────────
test("a reread that changes nothing does not write an event", () => {
  const weft = [
    pass(0, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }], [rel(0, "is", "A", "B")]),
    // identical re-sighting at the SAME byte: nothing is new
    pass(1, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }], [rel(0, "is", "A", "B")]),
    // an empty read: nothing
    pass(2, "s1", [], []),
  ];
  assert.equal(eventsFromWeft(weft).length, 1, "only the seed exists — rereads wrote nothing");
});

test("FALSIFIER: a reread that MOVED the reader but wrote nothing is caught", () => {
  // the movement IS the corroboration: if a new-byte re-sighting of a held
  // relation was NOT logged, the reader moved but the record is silent — the
  // test asserts it IS logged.
  const weft = [
    pass(0, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }], [rel(0, "is", "A", "B")]),
    pass(1, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }], [rel(9, "is", "A", "B")]),
  ];
  const types = eventsFromWeft(weft).map((e) => e.type);
  assert.deepEqual(types, ["NEW", "CORROBORATE"], "the move is on the record");
});

// ── 3. AN UNDERSTANDING-CHANGE NEEDS ITS TWO BYTE ADDRESSES ───────────────
test("FALSIFIER: an understanding-change with no byte address is refused", () => {
  assert.throws(() => assertEvent({ type: "NEW", at: null }), /byte address/i);
  assert.throws(() => assertEvent({ type: "CORROBORATE", at: "s1" }), /byte address/i);
  // the JOIN_NOMINEE lane built from a real two-source weft must carry both bytes
  const weft = [
    pass(0, "s1", [{ ref: "s1::rX", surface: "rights" }], []),
    pass(1, "s2", [{ ref: "s2::rX", surface: "rights" }], []),
  ];
  const evs = eventsFromWeft(weft);
  const joiner = evs.find((e) => e.type === "JOIN_NOMINEE");
  assert.ok(joiner, "a same surface across two sources is an understanding-change");
  assert.ok(joiner.witnesses.length >= 2 && joiner.witnesses.every((w) => /#\d+$/.test(w)), "both source addresses travel with it");
});

// ── the accounting a 125-built-nothing read demands ───────────────────────
test("classifyEvents separates seed from change (NEW vs CORROBORATE/CONTEST/JOIN)", () => {
  const weft = [
    pass(0, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }, { ref: "s1::rC", surface: "C" }, { ref: "s1::rD", surface: "fear" }],
      [rel(0, "is", "A", "B"), rel(1, "is", "B", "C"), rel(2, "not", "A", "B", { polarity: "-" })]),
    pass(1, "s1", [{ ref: "s1::rA", surface: "A" }, { ref: "s1::rB", surface: "B" }], [rel(9, "is", "B", "C")]),
    pass(0, "s2", [{ ref: "s2::rD", surface: "fear" }], []),
  ];
  const c = classifyEvents(eventsFromWeft(weft));
  assert.equal(c.NEW, 2, "two relations first sighted seed the ground");
  assert.equal(c.CORROBORATE, 1, "the re-sighting at a new byte is a change");
  assert.equal(c.CONTEST, 1, "the negative sighting is a cut");
  assert.ok(c.JOIN_NOMINEE >= 1, "the shared surface across sources is an understanding-change");
  assert.equal(c.change, c.CORROBORATE + c.CONTEST + c.JOIN_NOMINEE);
});