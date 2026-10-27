// Identity from the reader's side (reader-identity.js): same if meeting B moves the reader as meeting A again would; new if it moves like a new thing; a slot that moves is a discrepancy;
// a deranged-order null licenses "same". Constructed first.
import test from "node:test";
import assert from "node:assert/strict";
import { createReader, admit, meet, arrangementsOf, valuesMeet } from "./reader-identity.js";
// each being: what all share (orbits the sun, is a planet) and THREE things of its own (a radius, a day, a count of moons). THE NULL'S ARITHMETIC: values are shuffled independently per
// relation among n addresses, so k distinctive facts co-land on one address by chance with probability n^-(k-1); the floor is the (1 - 1/n) quantile, so TWO facts sit exactly AT the
// floor (measured: saving = ceiling to six places) and three sit above it. One fact is a coincidence; two is the floor; three is a finding.
const P = (r, d, m, x = []) => [{ rel: "orbit@0", value: "sun" }, { rel: "has_radius@0", value: `length:${r}` }, { rel: "has_day@0", value: `time:${d}` }, { rel: "has_moons@0", value: `count:${m}` }, { rel: "is_a@0", value: "planet" }, ...x];
const A = P(2440000, 5068800, 0), V = P(6052000, 20995200, 0.5), E = P(6371000, 86400, 1, [{ rel: "has_moon@0", value: "moon" }]);
const M = P(3389500, 88775, 2), J = P(69911000, 35730, 95);
// five beings: with three, a third of deranged orders land both of a being's facts on one address and the chance floor sits at the real saving (measured); the null needs a pool
const reader = admit(admit(admit(admit(admit(createReader(), "mercury", A), "venus", V), "earth", E), "mars", M), "jupiter", J);
test("meeting A again moves the reader least at A's address: same, recalled, and it moves less than a new thing", () => {
  const r = meet(reader, A); assert.equal(r.verdict, "same"); assert.equal(r.recall, "mercury"); assert.ok(r.noise < r.bitsNew); assert.deepEqual(r.moved, []);
});
test("a thing with another value in a one-valued slot is recalled to the nearest address AND the slot's movement is reported (the discrepancy)", () => {
  // Mercury's day, a planet, orbits the sun, but a radius of 6,000 km: the reader recalls Mercury (the day is its own) and the radius slot moves
  const B = [{ rel: "orbit@0", value: "sun" }, { rel: "has_radius@0", value: "length:6000000" }, { rel: "has_day@0", value: "time:5068800" }, { rel: "has_moons@0", value: "count:0" }, { rel: "is_a@0", value: "planet" }];
  const r = meet(reader, B, { oneValued: (rel) => /^has_/.test(rel) }); assert.equal(r.verdict, "same"); assert.equal(r.recall, "mercury"); assert.equal(r.moved.length, 1); assert.equal(r.moved[0].rel, "has_radius@0"); assert.ok(r.moved[0].bits > 0);
  // a thing sharing only what every planet shares is met as NEW, not forced onto the nearest address
  assert.equal(meet(reader, [{ rel: "orbit@0", value: "sun" }, { rel: "has_radius@0", value: "length:6000000" }, { rel: "is_a@0", value: "planet" }]).verdict, "new");
});
test("a thing that shares nothing moves the reader like a new thing: new, never forced onto an address", () => {
  const r = meet(reader, [{ rel: "flow_into@0", value: "sea" }, { rel: "is_a@0", value: "river" }]); assert.equal(r.verdict, "new");
});
test("two addresses that move the reader equally tie: undecided, named", () => {
  const twin = admit(admit(createReader(), "x", [{ rel: "r@0", value: "a" }]), "y", [{ rel: "r@0", value: "a" }]);
  const r = meet(twin, [{ rel: "r@0", value: "a" }]); assert.equal(r.verdict, "undecided"); assert.deepEqual(r.tied.sort(), ["x", "y"]);
});
test("no arrangement: refused; an empty reader: everything is new", () => {
  assert.equal(meet(reader, []).verdict, "refused"); assert.equal(meet(createReader(), A).verdict, "new");
});
test("the null: a same that a deranged order reproduces is below the null; a rich meeting is above it; deterministic", () => {
  const r = meet(reader, A); assert.equal(r.standing, "same_above_null", JSON.stringify(r));
  // two distinctive facts sit AT the floor in expectation (the arithmetic above); the sampled quantile over 20 worlds lands on either side of it by the seed, so the standing is not pinned here
  const two = meet(reader, [{ rel: "orbit@0", value: "sun" }, { rel: "has_radius@0", value: "length:2440000" }, { rel: "has_day@0", value: "time:5068800" }, { rel: "is_a@0", value: "planet" }]);
  assert.equal(two.verdict, "same"); assert.equal(two.recall, "mercury"); assert.ok(["same_above_null", "same_below_null"].includes(two.standing));
  // ONE distinguishing fact per being: a deranged order reproduces the saving exactly, so a same on it is below the null (a coincidence-level finding)
  const thin = admit(admit(admit(createReader(), "p", [{ rel: "r@0", value: "a" }]), "q", [{ rel: "r@0", value: "b" }]), "s", [{ rel: "r@0", value: "c" }]);
  const t = meet(thin, [{ rel: "r@0", value: "a" }]); assert.equal(t.verdict, "same"); assert.equal(t.standing, "same_below_null", JSON.stringify(t));
  assert.equal(JSON.stringify(meet(reader, A)), JSON.stringify(r));
});
test("the log is the state: admissions are appended, never rewritten, and the reader before an admission is unchanged", () => {
  const r0 = createReader(), r1 = admit(r0, "a", [{ rel: "r@0", value: "v" }]); assert.equal(r0.admissions.length, 0); assert.equal(r1.admissions.length, 1); assert.equal(r1.admissions[0].at, 0);
});
test("arrangementsOf reads a being's arrangements from atoms with the role position and a figure by its base value", () => {
  const atoms = [{ pred: "has_radius", args: [{ entity: "m", name: "Mercury" }, { value: "2,440 km", measure: "length", base: 2440000 }] }, { pred: "draw", args: [{ entity: "m", name: "Mercury" }], slots: [1] }];
  assert.deepEqual(arrangementsOf(atoms, "m"), [{ rel: "name", value: "mercury" }, { rel: "has_radius@0", value: "length:2440000" }, { rel: "draw@1", value: "" }]);
  assert.deepEqual(arrangementsOf(atoms, "m", { name: false })[0], { rel: "has_radius@0", value: "length:2440000" });
});

test("a slot value meets a held one within the margin the two state: 2,440 km meets 1,516 miles converted; 6,000 km does not; 79 lb meets 36 kg", () => {
  assert.equal(valuesMeet("length:2440000", "length:2439765.504"), true); assert.equal(valuesMeet("length:2440000", "length:6000000"), false); assert.equal(valuesMeet("mass:36", "mass:35.8344"), true);
  assert.equal(valuesMeet("length:100", "mass:100"), false); assert.equal(valuesMeet("planet", "planet"), true);
  // with a stated resolution: 2,440 (to the ten) and 2,445 (to the unit) meet; 2,440 and 2,460 do not
  const res = (v) => ({ "length:2440": 5, "length:2445": 0.5, "length:2460": 5 })[v];
  assert.equal(valuesMeet("length:2440", "length:2445", { res }), true); assert.equal(valuesMeet("length:2440", "length:2460", { res }), false);
  const reader = admit(createReader(), "m", [{ rel: "name", value: "mercury" }, { rel: "has_radius@0", value: "length:2439765.504" }]);
  assert.deepEqual(meet(reader, [{ rel: "name", value: "mercury" }, { rel: "has_radius@0", value: "length:2440000" }], { oneValued: (r) => /^has_/.test(r) }).moved, []);
});
