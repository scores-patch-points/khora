// notes — a void is re-zeroed by its filler on the CANONICAL id, not raw end strings
// (D5), and `hear` — raw by design — says so when a heard note would have
// re-zeroed an open void (D4). kernel/notes.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeNotes } from "../kernel/notes.js";

const strip = (s) => String(s).toLowerCase().replace(/^the\s+/, "");
const withIdentity = () => makeNotes({ identity: (a, l, b) => ({ end1: strip(a), label: l, end2: strip(b) }) });
const SCOPE = { sources: ["s"], read: 1 };
const SPAN = [{ ref: "s", start: 0, end: 3 }];

test("D5 — a void on canonical ends is re-zeroed by an arrival worn in its faces (identity organ in play)", () => {
  const N = withIdentity();
  let l = N.createNotes({});
  l = N.declareVoid(l, { end1: "cat", label: "chases", end2: "mouse", scope: SCOPE }).log;
  const a = N.admit(l, [{ end1: "the cat", label: "chases", end2: "the mouse", spans: SPAN }], { witness: "s#0-3" });
  assert.equal(a.heard[0].id, "cat|chases|mouse");
  assert.equal(a.rezeroed.length, 1);
  assert.equal(N.foldVoids(a.log).length, 0, "the void did not survive its own filler");
  assert.equal(N.voidTimeline(a.log, a.rezeroed[0].void).standing, "filled");
});

test("D5 — a void declared in FACE ends is re-zeroed by the canonical arrival, and a wildcard end2 is read in the arrival's context", () => {
  const N = withIdentity();
  let l = N.createNotes({});
  l = N.declareVoid(l, { end1: "the cat", label: "chases", end2: "the mouse", scope: SCOPE }).log;
  l = N.declareVoid(l, { end1: "the dog", label: "chases", end2: null, scope: SCOPE }).log;
  assert.equal(N.foldVoids(l).length, 2);
  const a = N.admit(l, [{ end1: "cat", label: "chases", end2: "mouse", spans: SPAN }], { witness: "s#0-3" });
  assert.equal(a.rezeroed.length, 1);
  const b = N.admit(a.log, [{ end1: "dog", label: "chases", end2: "the bone", spans: SPAN }], { witness: "s#0-3" });
  assert.equal(b.rezeroed.length, 1);
  assert.equal(N.foldVoids(b.log).length, 0);
});

test("D5 — positive control: with no identity organ the raw match still re-zeroes (unchanged)", () => {
  const N = makeNotes();
  let l = N.createNotes({});
  l = N.declareVoid(l, { end1: "cat", label: "chases", end2: "mouse", scope: SCOPE }).log;
  const a = N.admit(l, [{ end1: "Cat", label: "chases", end2: "mouse", spans: SPAN }], { witness: "s#0-3" });
  assert.equal(a.rezeroed.length, 1);
  assert.equal(N.foldVoids(a.log).length, 0);
});

test("D5 — negative control: an identity organ does not widen the match to a different end or label", () => {
  const N = withIdentity();
  let l = N.createNotes({});
  l = N.declareVoid(l, { end1: "cat", label: "chases", end2: "mouse", scope: SCOPE }).log;
  const a = N.admit(l, [
    { end1: "the dog", label: "chases", end2: "the mouse", spans: SPAN },
    { end1: "the cat", label: "fears", end2: "the mouse", spans: SPAN },
    { end1: "the cat", label: "chases", end2: "the bird", spans: SPAN },
  ], { witness: "s#0-3" });
  assert.equal(a.rezeroed.length, 0);
  assert.equal(N.foldVoids(a.log).length, 1);
});

test("D5 — declareVoid over a span whose canonical filler is already heard is refused not_empty", () => {
  const N = withIdentity();
  let l = N.createNotes({});
  l = N.admit(l, [{ end1: "the cat", label: "chases", end2: "the mouse", spans: SPAN }], { witness: "s#0-3" }).log;
  const r = N.declareVoid(l, { end1: "cat", label: "chases", end2: "mouse", scope: SCOPE });
  assert.equal(r.refused?.type, "not_empty");
  assert.equal(N.declareVoid(l, { end1: "cat", label: "chases", end2: "bird", scope: SCOPE }).refused, null);
});

test("D4 — hear is raw by design and says so: a heard note that would have re-zeroed carries a typed heard-not-rezeroed", () => {
  const N = withIdentity();
  let l = N.createNotes({});
  const d = N.declareVoid(l, { end1: "cat", label: "chases", end2: "mouse", scope: SCOPE });
  l = N.hear(d.log, { end1: "the cat", label: "chases", end2: "the mouse", spans: SPAN, witness: "s#0-3" });
  assert.equal(N.foldVoids(l).length, 1, "hear never re-zeroes (its by-design raw door)");
  assert.deepEqual(l.heardNotRezeroed, [{ type: "heard-not-rezeroed", void: d.id, by: "cat|chases|mouse", detail: l.heardNotRezeroed[0].detail }]);
  assert.match(l.heardNotRezeroed[0].detail, /admit/);
  // the report does not enter the record: the log's own enumerable shape is unchanged
  assert.deepEqual(Object.keys(l).sort(), ["admits", "entries", "nextSeq"]);
});

test("D4 — hear: no flag when nothing would have re-zeroed (a cut, a different end, or no void at all)", () => {
  const N = withIdentity();
  let l = N.createNotes({});
  assert.equal(N.hear(l, { end1: "a", label: "is", end2: "b", spans: SPAN, witness: "s#0-3" }).heardNotRezeroed, undefined);
  const d = N.declareVoid(l, { end1: "cat", label: "chases", end2: "mouse", scope: SCOPE });
  const other = N.hear(d.log, { end1: "dog", label: "chases", end2: "mouse", spans: SPAN, witness: "s#0-3" });
  assert.equal(other.heardNotRezeroed, undefined);
  const cut = N.hear(d.log, { end1: "cat", label: "chases", end2: "mouse", spans: SPAN, witness: "s#0-3", cut: true, because: "no" });
  assert.equal(cut.heardNotRezeroed, undefined);
});

test("D4 — positive control: admit re-zeroes the same filler and reports no heard-not-rezeroed", () => {
  const N = withIdentity();
  const d = N.declareVoid(N.createNotes({}), { end1: "cat", label: "chases", end2: "mouse", scope: SCOPE });
  const a = N.admit(d.log, [{ end1: "the cat", label: "chases", end2: "the mouse", spans: SPAN }], { witness: "s#0-3" });
  assert.equal(a.rezeroed.length, 1);
  assert.equal(a.log.heardNotRezeroed, undefined);
});
