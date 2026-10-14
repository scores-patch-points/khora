// grain contact verdict -> an admit-able CONTEST (D11). The pure function only:
// nothing in grain.js or any caller lands it. These tests admit its output into
// a real notes ledger to prove the shape the door will accept.
import test from "node:test";
import assert from "node:assert/strict";
import { contactVerdict } from "./grain.js";
import * as G from "./grain.js";
import { makeNotes } from "../kernel/notes.js";

const contestOf = (...a) => G.contestOf(...a);
let n = 0;
const mk = (side, [subj, pred, obj, polarity = "+"], over = {}) => {
  const i = n++;
  const address = `px_${side.toLowerCase()}${over.doc ?? ""}/text@h#b${i * 100}-${i * 100 + 40}`;
  return { id: `${side}${i}`, address, text: `${subj} ${polarity === "-" ? "did not " : ""}${pred} ${obj}.`, side, claim: { subj, pred, obj, polarity }, activation: 1, ...over };
};
const BUS = ["Daniel Reyes", "approved", "the bus route"];

test("D11 — a CONTRADICTED contact verdict becomes the W claim and the refusing U span, admit-able, and admitting them lands the contest", () => {
  const w = mk("W", [...BUS, "-"]);
  const u = mk("U", [...BUS, "+"]);
  const v = contactVerdict(w, [u]);
  assert.equal(v.case, "CONTRADICTED");
  const c = contestOf(w, v);
  assert.equal(c.contest, true);
  assert.equal(c.case, "CONTRADICTED");
  assert.deepEqual(c.notes.map((x) => x.side), ["W", "U"]);
  const [nw, nu] = c.notes;
  assert.deepEqual(nw.arrangement, { end1: "Daniel Reyes", label: "approved", end2: "the bus route", polarity: "-", spans: [{ at: w.address }], decider: w.text });
  assert.deepEqual(nu.arrangement, { end1: "Daniel Reyes", label: "approved", end2: "the bus route", polarity: "+", spans: [{ at: u.address }] });
  assert.equal(nw.witness, w.address);
  // both orders of arrival land it (S69: a cut meeting its link, either order)
  for (const order of [[nw, nu], [nu, nw]]) {
    const N = makeNotes();
    let log = N.createNotes({});
    let contests = 0;
    for (const x of order) { const r = N.admit(log, [x.arrangement], { witness: x.witness }); log = r.log; contests += r.contests.length; assert.equal(r.turnedAway.length, 0); }
    assert.equal(contests, 1);
    assert.equal(N.disputesOf(log).size, 1);
  }
});

test("D11 — DISAGREE: only the refusing spans are carried; the holding span is not a denial", () => {
  const w = mk("W", [...BUS, "-"]);
  const agrees = mk("U", [...BUS, "-"]);
  const refuses = mk("U", [...BUS, "+"]);
  const v = contactVerdict(w, [agrees, refuses]);
  assert.equal(v.case, "DISAGREE");
  const c = contestOf(w, v);
  assert.equal(c.contest, true);
  assert.deepEqual(c.notes.filter((x) => x.side === "U").map((x) => x.arrangement.spans[0].at), [refuses.address]);
});

test("D11 — a refusing U span that is itself a denial carries its bytes as the decider", () => {
  const w = mk("W", [...BUS, "+"]);
  const u = mk("U", [...BUS, "-"]);
  const c = contestOf(w, contactVerdict(w, [u]));
  const nu = c.notes.find((x) => x.side === "U");
  assert.equal(nu.arrangement.polarity, "-");
  assert.equal(nu.arrangement.decider, u.text);
  const N = makeNotes();
  let log = N.createNotes({});
  let landed = 0;
  for (const x of c.notes) { const r = N.admit(log, [x.arrangement], { witness: x.witness }); log = r.log; landed += r.contests.length; }
  assert.equal(landed, 1);
});

test("D11 — positive controls: AGREE, SINGLE, UNDETERMINED are not a contest and carry nothing", () => {
  const w = mk("W", [...BUS, "-"]);
  const same = mk("U", [...BUS, "-"]);
  const other = mk("U", ["Daniel Reyes", "approved", "the depot lease", "+"]);
  for (const [region, expect] of [[[same], "SINGLE"], [[same, mk("U", [...BUS, "-"])], "AGREE"], [[other], "UNDETERMINED"], [[], "UNDETERMINED"]]) {
    const v = contactVerdict(w, region);
    assert.equal(v.case, expect);
    const c = contestOf(w, v);
    assert.deepEqual({ contest: c.contest, notes: c.notes, reason: c.reason }, { contest: false, notes: [], reason: "not_a_contest" });
  }
});

test("D11 — negative controls: an unaddressed span, a span with no bytes, a same-source span, an unaddressed W claim are typed, never guessed", () => {
  const w = mk("W", [...BUS, "-"]);
  const noAddr = { ...mk("U", [...BUS, "+"]), address: null };
  const noBytes = { ...mk("U", [...BUS, "+"]), text: "" };
  const wDenies = mk("W", [...BUS, "+"]);
  const noBytesDenial = { ...mk("U", [...BUS, "-"]), text: "" };
  assert.equal(contestOf(w, contactVerdict(w, [noAddr])).skipped[0].type, "no_address");
  assert.equal(contestOf(w, contactVerdict(w, [noAddr])).contest, false);
  // an affirmative U span needs no decider (only a cut is decided by bytes): admit-able without text
  assert.equal(contestOf(w, contactVerdict(w, [noBytes])).contest, true);
  assert.equal(contestOf(wDenies, contactVerdict(wDenies, [noBytesDenial])).skipped[0].type, "no_bytes");
  // same document on both sides: the door's wall (a source that witnesses the link cannot deny it) is named up front
  const sameSource = { ...mk("U", [...BUS, "+"]), address: w.address.replace(/#.*/, "#b9000-9040") };
  const s = contestOf(w, contactVerdict(w, [sameSource]));
  assert.equal(s.skipped[0].type, "same_source");
  assert.equal(s.contest, false);
  const wBad = { ...w, address: null };
  const r = contestOf(wBad, contactVerdict(wBad, [mk("U", [...BUS, "+"])]));
  assert.equal(r.contest, false);
  assert.equal(r.reason, "w_unaddressed");
});

test("D11 — pure: it neither reads nor writes any ledger and is not called by foldGrain", () => {
  const w = mk("W", [...BUS, "-"]);
  const u = mk("U", [...BUS, "+"]);
  const v = contactVerdict(w, [u]);
  const before = JSON.stringify(v);
  contestOf(w, v);
  assert.equal(JSON.stringify(v), before);
  const out = G.foldGrain({ region: [u], whom: [w] });
  assert.ok(!("contests" in out));
});
