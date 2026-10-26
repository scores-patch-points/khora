// Features that can cancel only where the things are one (arrangement-features.js): a canonical predicate with a giver, the position as direction, the measure as a unit, the year as as-of.
import test from "node:test";
import assert from "node:assert/strict";
import { makeCanon, featuresOf, figureFeatures, PERSPECTIVE } from "./arrangement-features.js";
import { cancelIdentity } from "../kernel/identity-cancel.js";
const E = (id, name) => ({ entity: id, name }), V = (value) => ({ value });
const atom = (pred, args, extra = {}) => ({ pred, args, neg: false, time: null, ...extra });
// a giver that lists two synonym pairs; everything else is its own class
const same = (lang, a, b) => ({ same: new Set(["sell|vend", "vend|sell", "buy|purchase", "purchase|buy"]).has(`${a}|${b}`) });

test("the canonical key is the alphabetically first member of the class, whichever word was seen first", () => {
  const c1 = makeCanon(same); c1("vend"); assert.equal(c1("sell"), "sell"); assert.equal(c1("vend"), "sell");
  const c2 = makeCanon(same); assert.equal(c2("sell"), "sell"); assert.equal(c2("vend"), "sell"); assert.equal(c2("orbit"), "orbit");
});
test("the position in the atom is the direction: a seller and a buyer of one sale do not cancel", () => {
  const canon = makeCanon(same);
  const A = [atom("sell", [E("s", "Sagard"), E("r", "receivables")]), atom("sell_to", [E("s", "Sagard"), E("u", "us")])];
  const fs = featuresOf(A, "s", { canon }), fu = featuresOf(A, "u", { canon });
  assert.ok(fs.includes("v:sell@0") && fs.includes("v:sell_to@0"), fs.join(" "));
  assert.ok(fu.includes("v:sell_to@1") && !fu.includes("v:sell_to@0"), fu.join(" "));
  // the claim's "us" (sold TO) against the page's "we" (who sold): the positions differ, so the predicate feature does not cancel
  const r = cancelIdentity({ mention: fu, candidates: [{ id: "page-we", feats: ["v:sell@0", "v:sell_to@0", "w:sagard", "w:receivables"] }, { id: "page-us", feats: ["v:sell_to@1", "w:sagard"] }] });
  assert.equal(r.verdict, "same"); assert.equal(r.id, "page-us");
});
test("a synonym on the page cancels with the claim's word (the giver says so), once both sides are registered", () => {
  const claimAtoms = [atom("vend", [E("c", "Sagard"), E("x", "receivables")])], pageAtoms = [atom("sell", [E("p", "Sagard"), E("y", "receivables")])];
  const canon = makeCanon(same).registerAtoms(claimAtoms).registerAtoms(pageAtoms);
  const claim = featuresOf([atom("vend", [E("c", "Sagard"), E("x", "receivables")])], "c", { canon }), page = featuresOf([atom("sell", [E("p", "Sagard"), E("y", "receivables")])], "p", { canon });
  assert.deepEqual(claim, page);
});
test("a figure's measure travels: a radius in metres and a radius in dollars are different beings' facts", () => {
  const canon = makeCanon(same);
  const a = featuresOf([atom("has_radius", [E("m", "Mercury"), { value: "2,440 km", measure: "length" }])], "m", { canon });
  assert.ok(a.includes("m:length") && a.includes("w:length") && a.includes("v:has_radius@0"), a.join(" "));
  assert.deepEqual(figureFeatures({ value: "2,440 km", measure: "length" }), ["unit=length"]);
});
test("the years an atom states are a one-valued as-of; a kind is a k: feature; named is not a feature", () => {
  const canon = makeCanon(same);
  const f = featuresOf([atom("has_population", [E("c", "Cleveland"), { value: "3 million", measure: "count" }], { time: ["1900"] }), atom("is_a", [E("c", "Cleveland"), V("city")]), atom("named", [E("c", "Cleveland"), V("Forest City")])], "c", { canon });
  assert.ok(f.includes("asof=1900") && f.includes("k:city"), f.join(" ")); assert.ok(!f.some((x) => /forest/.test(x)));
});

test("written BEFORE the other side is registered, the key is not stable: the organ requires registering the material first", () => {
  const c = makeCanon(same); const before = featuresOf([atom("vend", [E("c", "x"), E("y", "z")])], "c", { canon: c }); c.register(["sell"]);
  assert.notDeepEqual(before, featuresOf([atom("vend", [E("c", "x"), E("y", "z")])], "c", { canon: c }));
});

test("a passive with no agent keeps its role: the patient is @1, not the first argument", () => {
  const canon = makeCanon(same);
  // atoms.js writes slots when an argument was dropped: draw(climbers) with slots [1]
  const f = featuresOf([{ pred: "draw", args: [E("c", "climbers")], slots: [1] }, { pred: "draw_to", args: [E("c", "climbers"), E("h", "Hood")], slots: [1, 2] }], "c", { canon });
  assert.ok(f.includes("v:draw@1") && !f.includes("v:draw@0"), f.join(" "));
  const page = featuresOf([{ pred: "draw", args: [E("h", "Hood"), E("c", "climbers")] }], "c", { canon });
  assert.ok(page.includes("v:draw@1"));
});
