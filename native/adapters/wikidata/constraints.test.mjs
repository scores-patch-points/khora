// constraints.test.mjs — Wikidata property constraints read as a given register (RULES-PREREG.md).
import test from "node:test";
import assert from "node:assert/strict";
import { registerFromWikidataConstraints, ruleFilter, CONSTRAINT } from "./constraints.js";

const ent = (id) => ({ type: "wikibase-entityid", value: { id } });
const snak = (p, dv) => ({ snaktype: "value", property: p, datavalue: dv });
const qty = (amount, unit = "http://www.wikidata.org/entity/Q577") => ({ type: "quantity", value: { amount, unit } });
const constraint = (id, type, quals = {}) => ({ id, mainsnak: snak("P2302", ent(type)), qualifiers: Object.fromEntries(Object.entries(quals).map(([p, vs]) => [p, vs.map((v) => snak(p, v))])) });
// Shaped like the real P569/P570 statements fetched 2026-11-17 (ids shortened).
const P = {
  P569: { claims: { P2302: [constraint("s1", CONSTRAINT.SUBJECT_TYPE, { P2308: [ent("Q5"), ent("Q95074")] }), constraint("s2", CONSTRAINT.SINGLE_BEST, { P4155: [ent("P1480")] })] } },
  P570: { claims: { P2302: [constraint("d1", CONSTRAINT.SUBJECT_TYPE, { P2308: [ent("Q5")] }), constraint("d2", CONSTRAINT.SINGLE_BEST, {}), constraint("d3", CONSTRAINT.DIFF_RANGE, { P2306: [ent("P569")], P2313: [qty("-1")], P2312: [qty("+150")], P2303: [ent("Q999")] })] } },
  P27: { claims: { P2302: [constraint("c1", CONSTRAINT.SUBJECT_TYPE, { P2308: [ent("Q5")] }), constraint("c2", CONSTRAINT.CONTEMPORARY)] } },
  P2048: { claims: { P2302: [constraint("h1", CONSTRAINT.DIFF_RANGE, { P2306: [ent("P569")], P2313: [qty("0", "http://www.wikidata.org/entity/Q11573")] })] } },
};

test("one-valued rules are read from single-(best-)value constraints, filed under the subject-type classes, citing their statement", () => {
  const R = registerFromWikidataConstraints(P);
  assert.equal(R.functional.get("Q5").get("P569").giver, "wikidata:P569#s2");
  assert.ok(R.functional.get("Q95074").has("P569"));
  assert.ok(R.functional.get("Q5").has("P570"));
  assert.equal(R.functional.get("Q5").has("P27"), false, "citizenship states no single value: it is not one-valued");
  assert.deepEqual(R.functional.get("Q5").get("P569").separators, ["P1480"]);
});

test("difference-within-range becomes a range rule in years; another unit is reported unread, never guessed", () => {
  const R = registerFromWikidataConstraints(P);
  const d = R.differences.get("Q5")[0];
  assert.deepEqual([d.rel, d.base, d.min, d.max, d.giver], ["P570", "P569", -1, 150, "wikidata:P570#d3"]);
  assert.equal(R.unread[0].property, "P2048");
  assert.equal(R.other[0].constraint, CONSTRAINT.CONTEMPORARY);
});

test("a statement with a separator qualifier, or an excepted item, is withheld from the rule", () => {
  const R = registerFromWikidataConstraints(P);
  const keep = ruleFilter(R, { itemOf: (x) => x.split(":")[0], qualifiersOf: (a) => a.q });
  const as = [{ rel: "P569", q: new Set(["P1480"]) }, { rel: "P569", q: new Set() }, { rel: "P570", q: new Set() }];
  assert.equal(keep("Q1:A", as).length, 2);
  assert.equal(keep("Q999:A", as).filter((a) => a.rel === "P570").length, 0);
});
