// figure-binding.test.mjs — a figure bound to what it measures, of whom, in which event; and the meaning check comparing bound figures.
//   node --test native/adapters/text/figure-binding.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { figureClaimsOf, claimsOf } from "./grammar-en.js";
import { verdict } from "../../kernel/eot-claim-match.js";
const figs = (t) => figureClaimsOf(t).map((c) => ({ being: c.ARG0?.head ?? null, ...c.fig }));
const v = (claim, source) => verdict(claimsOf(claim), claimsOf(source)).v;

test("a figure carries its measure in base units, its bracketed equivalent and its being", () => {
  const [f] = figs("The smallest female jaguars in Central America weigh just 36 kg (79 lbs).");
  assert.equal(f.being, "jaguar"); assert.equal(f.measure, "mass"); assert.equal(f.event, "weigh");
  assert.equal(f.base, 36); assert.ok(Math.abs(f.alts[0] - 35.8) < 0.1, "79 lbs is the same quantity, converted");
});

test("units a modifier away, hyphenated units, ranges and an opening with-phrase are all bound", () => {
  assert.equal(figs("Mercury zips around the Sun every 88 Earth days.")[0].measure, "time");
  assert.equal(figs("The airport is a 45-minute drive from Moshi.")[0].base, 2700);
  const r = figs("About 35 – 40 species are recognized in the dolphin family.")[0];
  assert.equal(r.base, 35); assert.equal(r.hiBase, 40);
  const w = figs("With a radius of 1,516 miles, Mercury is a small planet.")[0];
  assert.equal(w.being, "mercury"); assert.equal(w.attribute, "radius"); assert.equal(w.measure, "length");
});

test("bound figures decide: the same quantity in other units supports, another value contradicts", () => {
  assert.equal(v("Female jaguars in Central America weigh 79 pounds.", "The smallest female jaguars in Central America weigh just 36 kg."), "E");
  assert.equal(v("Mercury has a radius of about 6,000 kilometres.", "With a radius of 1,516 miles (2,440 kilometers), Mercury is a little more than 1/3 the width of Earth."), "C");
  assert.equal(v("The airport is a 3-hour drive from Moshi.", "The airport is a 45-minute drive from Moshi."), "C");
});
