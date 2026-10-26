// The reader is a projection of the weft (weft-reader.js): a reading is a pass, a re-entry is another pass at the same address, the reader at a cursor is projected like the cloth.
import test from "node:test";
import assert from "node:assert/strict";
import { emptyWeft, clothAt, weftAttestations } from "./weft.js";
import { appendReading, readerAt } from "./weft-reader.js";
import { meet, stateAt } from "../kernel/reader-identity.js";
const E = (id, name) => ({ entity: id, name }), atom = (pred, args, extra = {}) => ({ pred, args, text: `${pred}(${args.map((a) => a.name ?? a.value).join(", ")})`, ...extra });
const first = [atom("orbit", [E("m", "Mercury"), E("s", "Sun")], { doc: { start: 0, end: 22 } }), atom("has_radius", [E("m", "Mercury"), { value: "2,440 km", measure: "length", base: 2440000 }], { doc: { start: 24, end: 52 } })];
const more = [...first, atom("has_day", [E("m", "Mercury"), { value: "59 days", measure: "time", base: 5097600 }], { doc: { start: 60, end: 80 } })];
test("a reading is a weft pass the weft's own consumers read: the cloth has the beings with addresses, the attestations carry the relations", () => {
  const w = appendReading(emptyWeft(), { address: "planets.txt", atoms: first });
  const cloth = clothAt(w); assert.ok(cloth.referents.some((r) => r.ref === "m" && r.address === "planets.txt#0"));
  const att = [...weftAttestations(w)]; assert.ok(att.some((a) => a.label === "orbit" && a.left.ref === "m" && a.witness === "planets.txt#0"));
});
test("a re-entry is another pass at the same address, carrying only what it added and the keys it retracted; the weft is never rewritten", () => {
  const w0 = appendReading(emptyWeft(), { address: "planets.txt", atoms: first }), w1 = appendReading(w0, { address: "planets.txt", atoms: more, before: first, pass: 1, tier: "k-best", trigger: ["needs_deeper_reading"] });
  assert.equal(w0.length, 1); assert.equal(w1.length, 2); assert.equal(w1[1].relations.length, 1); assert.equal(w1[1].relations[0].relation, "has_day"); assert.deepEqual(w1[1].retracted, []);
  const w2 = appendReading(w1, { address: "planets.txt", atoms: first, before: more, pass: 2, tier: "page" }); assert.deepEqual(w2[2].retracted, [more[2].text]); assert.equal(w2[2].relations.length, 0);
  assert.ok(Object.isFrozen(w1) && Object.isFrozen(w1[1]));
});
test("the reader at a cursor is projected from the passes: after the re-entry it holds the day; after the retraction it does not; the earlier cursor is unchanged", () => {
  const w = appendReading(appendReading(appendReading(emptyWeft(), { address: "planets.txt", atoms: first }), { address: "planets.txt", atoms: more, before: first, pass: 1, tier: "k-best" }), { address: "planets.txt", atoms: first, before: more, pass: 2, tier: "page" });
  const r0 = readerAt(w, { asOf: 0 }), r1 = readerAt(w, { asOf: 1 }), r2 = readerAt(w);
  const B = [{ rel: "name", value: "mercury" }, { rel: "has_day@0", value: "time:5097600" }], ov = (r) => /^has_/.test(r);
  assert.equal(meet(stateAt(r0), B, { oneValued: ov }).verdict, "same"); assert.ok(meet(stateAt(r1), B, { oneValued: ov }).noise < meet(stateAt(r0), B, { oneValued: ov }).noise, "the re-entry made the reader less surprised");
  assert.ok(!stateAt(r2).admissions.some((a) => a.rel === "has_day@0"), "the retraction pass removed it from the projection"); assert.ok(stateAt(r1).admissions.some((a) => a.rel === "has_day@0"));
  assert.equal(r1.admissions.filter((a) => a.rel === "name").length, 2, "a being is named once (mercury, sun), not again on every pass");
});
test("the reader projected from the weft meets a claim end as the reader-log reader did (parity on a discrepancy)", () => {
  const w = appendReading(emptyWeft(), { address: "planets.txt", atoms: first });
  const m = meet(stateAt(readerAt(w)), [{ rel: "name", value: "mercury" }, { rel: "has_radius@0", value: "length:6000000" }], { oneValued: (r) => /^has_/.test(r) });
  assert.equal(m.verdict, "same"); assert.equal(m.recall, "m"); assert.equal(m.moved.length, 1); assert.equal(m.moved[0].rel, "has_radius@0");
});
