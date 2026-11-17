// thoughts.js on synthetic streams: a right thought removes surprise, a wrong one adds it, the pharos ledger replays exactly, a refused write throws.
import test from "node:test"; import assert from "node:assert/strict";
import { runReader, sumRange, assessThoughts, thoughtSet, thoughtRows, learnMeta, metaAdmits, recordThoughts, replayThoughts, recordMeta, replayMeta, THOUGHT_CELL } from "./thoughts.js";
import { seeded } from "../kernel/attend.js";

// a stream: sentences 0..N-1; A and B alternate as scenes; descriptions "d:girl" always mean A; the pronoun "he" always means A; B always follows A.
function synth(N = 240, seed = 3) {
  const R = seeded(seed); const events = [], occ = []; const refs = ["ref:A", "ref:B", "ref:C", "ref:D"]; let pos = 0, scene = 0;
  for (let t = 0; t < N; t++) {
    if (t % 6 === 0) scene = Math.floor(R() * 2); const main = scene === 0 ? "ref:A" : "ref:C";
    events.push({ pos: pos++, end: pos, t, kind: "N", ref: main }); if (main === "ref:A" && R() < 0.8) events.push({ pos: pos++, end: pos, t: t + 0 === t ? t : t, kind: "N", ref: "ref:B" });
    if (main === "ref:A") { events.push({ pos: pos++, end: pos, t, kind: "P", pron: "he", bound: "ref:A" }); const o = { pos: pos++, sent: t, head: "girl", bound: "ref:A", cands: ["ref:A", "ref:B"] }; occ.push(o); events.push({ pos: o.pos, end: o.pos + 4, t, kind: "D", head: "girl", bound: "ref:A", cands: o.cands }); }
    else { events.push({ pos: pos++, end: pos, t, kind: "P", pron: "he", bound: "ref:C" }); }
  }
  events.sort((a, b) => a.pos - b.pos || a.t - b.t); events.forEach((e, i) => { e.pos = i; e.end = i + 1; });
  return { text: "x".repeat(events.length + 10), weft: {}, S: Array.from({ length: N }, () => ({})), N, events, occ: occ.map((o) => ({ ...o, pos: events.findIndex((e) => e.kind === "D" && e.t === o.sent) })), sentOf: (p) => p };
}
const tot = (events, th) => runReader(events, th).reduce((a, b) => a + b, 0);

test("a surprise is finite and positive for every event, and the first event is a birth", () => { const { events } = synth(); const bits = runReader(events, {}); assert.ok([...bits].every((x) => Number.isFinite(x) && x >= 0)); assert.ok(bits[0] > 0); });
test("the pronoun rule (every pronoun is its referent) removes surprise; an inverted rule would not", () => {
  const { events } = synth(); const base = tot(events, {}), withRule = tot(events, { rule: true });
  assert.ok(withRule < base, `rule ${withRule} vs base ${base}`);
  const wrong = events.map((e) => (e.kind === "P" ? { ...e, bound: e.bound === "ref:A" ? "ref:D" : "ref:D" } : e)); assert.ok(tot(wrong, { rule: true }) > withRule, "a rule that binds pronouns to a referent that never appears must cost more than the right rule");
});
test("a right wormhole (girl = A) removes surprise; a wrong one (girl = D, never present) adds it", () => {
  const { events } = synth(); const base = tot(events, {}), right = tot(events, { worm: new Map([["girl", "ref:A"]]) }), wrong = tot(events, { worm: new Map([["girl", "ref:D"]]) });
  assert.ok(right < base, `right ${right} base ${base}`); assert.ok(wrong > right, `wrong ${wrong} right ${right}`);
});
test("a synapse A -> B (B follows A) removes surprise at B; the reverse-direction control on an absent referent does not help", () => {
  const { events } = synth(); const base = tot(events, {}); const good = tot(events, { pairs: [{ i: "ref:A", j: "ref:B", w: 0.8, win: 4 }] }), bad = tot(events, { pairs: [{ i: "ref:C", j: "ref:B", w: 0.8, win: 4 }] });
  assert.ok(good < base, `good ${good} base ${base}`); assert.ok(good < bad, `good ${good} bad ${bad}`);
});
test("assessThoughts proposes and costs thoughts; the random null does not beat the real set", () => {
  const B = synth(300); const res = assessThoughts(B); assert.ok(res.thoughts.some((t) => t.kind === "rule"));
  assert.ok(Number.isFinite(res.jointFore)); assert.ok(res.nullFore <= res.realNoRuleFore + 1e-9 || res.admittedN === 0, `null ${res.nullFore} real(no rule) ${res.realNoRuleFore}`);
});
// a minimal in-memory pharos door
function fakeDoor({ refuse = false } = {}) { const entries = []; let n = 0; const kinds = new Set(); return { counts: { woven: 0, lastReason: refuse ? "UNKNOWN_CELL" : null }, declare: (k) => { kinds.add(k); }, weave: (x) => { if (refuse || x.cell !== THOUGHT_CELL) return null; const e = { ...x, id: "e" + n++, of: x.of ?? [] }; entries.push(e); return e; }, fold: ({ kind }) => entries.filter((e) => e.kind === kind), entries }; }
test("the ledger records admitted thoughts, retracts the ones with negative foresight, and REPLAYS exactly", () => {
  const B = synth(300); const res = assessThoughts(B); const door = fakeDoor(); recordThoughts({ door, B, res, source: "sha", bookId: "t" }); const r = replayThoughts({ door, B, res });
  assert.equal(r.replayMatch, true); assert.equal(r.retractions, res.thoughts.filter((t) => t.admitted && t.fore < 0).length);
  for (const e of door.entries.filter((x) => x.kind === "thought-retract")) assert.equal(e.of.length, 1);
});
test("a refused pharos write throws (the door otherwise fails silently)", () => { const B = synth(300); const res = assessThoughts(B); assert.throws(() => recordThoughts({ door: fakeDoor({ refuse: true }), B, res, source: "s", bookId: "t" }), /refused/); });
test("a meta-thought learned from other books is rebuilt from its log entry and decides the same", () => {
  const books = [synth(300, 1), synth(300, 2), synth(300, 3)].map((B, i) => ({ id: "b" + i, ths: thoughtRows(assessThoughts(B)) })); const model = learnMeta(books.slice(0, 2)); const door = fakeDoor();
  recordMeta({ door, model, learnedFrom: ["b0", "b1"], addr: "meta:test" }); const re = replayMeta({ door, addr: "meta:test" });
  assert.deepEqual(metaAdmits(re, books[2].ths).map((t) => t.idx), metaAdmits(model, books[2].ths).map((t) => t.idx));
});
