// reading-full — the composed reading (native/reading-full.js). Needs the janus priors, like every real-reader test (see the-fold/prior-source.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFull } from "../reading-full.js";
import { THRAX_MAP } from "../legacy-ported/packages/engine/perceiver/text/wordclass.js";

const stageOf = (r, name) => r.wiring.find((w) => w.stage === name);
const EN = "Maria bought a red car on March 3. The council never approved the plan.";

test("every stage reports, in the helix order, and the unwired one says so", async () => {
  const r = await readFull(EN, { language: "en", lens: { minShare: 0.5 } });
  assert.deepEqual(r.wiring.map((w) => w.stage), ["read", "claims", "units", "class", "lens", "notes", "moves", "ablation-pos"]);
  for (const s of ["read", "claims", "units", "class", "lens", "notes", "moves"]) assert.equal(stageOf(r, s).status, "ran", s);
  assert.equal(stageOf(r, "ablation-pos").status, "gap");
  assert.match(stageOf(r, "ablation-pos").reason, /embedding model/);
});

test("units: each parsed token is addressed and says what the claims placed it as", async () => {
  const r = await readFull("Maria bought a red car.", { language: "en" });
  const by = Object.fromEntries(r.units.filter((u) => u.upos !== "PUNCT").map((u) => [u.form, u]));
  assert.equal(by.Maria.placed, "end"); assert.equal(by.bought.placed, "act"); assert.equal(by.car.placed, "end"); assert.equal(by.red.placed, "end");
  assert.ok(by.bought.start < by.bought.end && by.bought.start > by.Maria.end - 1, "absolute character spans, in order");
  assert.equal(by.bought.open, true); assert.equal(r.units.find((u) => u.upos === "PUNCT").open, false);
});

test("a token the claims never placed is reported silent, not hidden", async () => {
  const r = await readFull(EN, { language: "en" });
  const u = stageOf(r, "units");
  assert.equal(u.silent, r.units.filter((x) => x.open && !x.placed).length);
  assert.ok(u.placed + u.silent === u.open);
});

test("class: Thrax is laid over the instance class through the giver-declared map, with the measured prior beside it", async () => {
  const r = await readFull("Maria bought a red car.", { language: "en" });
  const by = Object.fromEntries(r.units.filter((u) => u.upos !== "PUNCT").map((u) => [u.form, u]));
  assert.equal(by.bought.class.thrax, THRAX_MAP.VERB); assert.equal(by.car.class.thrax, THRAX_MAP.NOUN);
  assert.equal(by.red.class.thrax, null, "a UD class Thrax does not cover is a disclosed absence, never a guess");
  assert.equal(by.bought.class.witness, "agrees"); assert.ok(by.bought.class.attested.some((a) => a.upos === "VERB"));
  assert.match(stageOf(r, "class").declaredBy, /Thrax/); assert.match(stageOf(r, "class").measuredBy, /Universal Dependencies/);
});

test("lens: minShare is declared, never defaulted — without it the stage is skipped and says why", async () => {
  const r = await readFull(EN, { language: "en" });
  assert.equal(stageOf(r, "lens").status, "skipped"); assert.match(stageOf(r, "lens").reason, /never a default/);
  assert.equal(r.relationClasses, null);
});

test("lens: a relation label's type-level class sits beside the parse, and does not override it", async () => {
  const r = await readFull("Maria bought a red car.", { language: "en", lens: { minShare: 0.5 } });
  assert.ok(r.relationClasses.every((x) => "thraxClass" in x && "settled" in x));
  assert.equal(r.claims.find((c) => c.rel === "buy").polarity, "+", "the claim is untouched by the lens");
});

test("notes: a denial is heard as a cut, not as a link with a minus sign", async () => {
  const r = await readFull("The council never approved the plan.", { language: "en" });
  assert.equal(stageOf(r, "notes").cuts, 1); assert.equal(r.notes.cuts[0].label, "approve");
  assert.equal(r.notes.rows.length, 0, "a cut stays off the link fold: it is listed, not folded");
});

test("notes: an act the ledger cannot hear (an end missing) is listed, never dropped silently", async () => {
  const r = await readFull("It rained.", { language: "en" });
  const lone = r.claims.filter((c) => c.rel && c.rel !== "fig" && !(c.ARG0 && c.ARG1)).length;
  assert.equal(r.notes.unheard.length, lone); assert.equal(stageOf(r, "notes").unheard, lone);
});

test("moves: a phasepost per act where a received act prior exists", async () => {
  const r = await readFull("Maria bought a red car.", { language: "en" });
  assert.equal(stageOf(r, "moves").status, "ran"); assert.ok(r.moves.every((m) => "standing" in m));
  assert.equal(r.moves.find((m) => m.rel === "buy").cell, "CON·Figure");
});

test("another language: the stages that have their priors run, the rest are typed gaps", async () => {
  const r = await readFull("Maria kaufte ein rotes Auto. Der Rat genehmigte den Plan nicht.", { language: "deu" });
  for (const s of ["read", "claims", "units", "class", "notes"]) assert.equal(stageOf(r, s).status, "ran", s);
  assert.equal(stageOf(r, "moves").status, "gap"); assert.match(stageOf(r, "moves").reason, /no act prior/);
  assert.equal(stageOf(r, "notes").cuts >= 1, true, "German negation is heard as a cut");
});

test("readDocument is untouched: the composed reading wraps it and changes no default", async () => {
  const { readDocument } = await import("../reading.js");
  const a = await readDocument("Maria bought a red car.", { language: "en", rows: true, lexicon: false, minCharacters: 0 });
  const b = (await readFull("Maria bought a red car.", { language: "en" })).entry;
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
  assert.equal(JSON.stringify(a.parse.map((p) => p.rows.map((r) => r.upos))), JSON.stringify(b.parse.map((p) => p.rows.map((r) => r.upos))));
});
