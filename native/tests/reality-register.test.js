// tests/reality-register.test.js — fiction vs journalism put on a thing's profile.
//
// Direct kernel probes of native/kernel/reality-register.js. The laws under
// test: register is DECLARED, never induced (an undeclared source is refused);
// reality is a fold over where a thing is attested AND an external world
// anchor; the anchor is examined, not a verdict.

import test from "node:test";
import assert from "node:assert/strict";

import {
  REGISTERS,
  normalizeRegister,
  isTruthClaiming,
  classifyAnchor,
  realityRegister,
  buildRealityRegisters,
  registerNotes,
  registerProfileLines,
} from "../kernel/reality-register.js";

test("a source register is declared and normalized; an undeclared one is null", () => {
  assert.equal(normalizeRegister("news"), REGISTERS.JOURNALISM);
  assert.equal(normalizeRegister("Screenplay"), REGISTERS.FICTION);
  assert.equal(normalizeRegister("memoir"), REGISTERS.TESTIMONY);
  assert.equal(normalizeRegister(""), null);
  assert.equal(normalizeRegister("vibes"), null);
  assert.equal(isTruthClaiming(REGISTERS.REPORT), true);
  assert.equal(isTruthClaiming(REGISTERS.FICTION), false);
  assert.equal(isTruthClaiming(REGISTERS.COMMENT), false);
});

test("the world anchor reads fiction from world, and refuses to guess otherwise", () => {
  assert.equal(classifyAnchor({ description: "British transatlantic passenger liner", instanceOf: ["steamship"] }), "world");
  assert.equal(classifyAnchor({ description: "fictional character in the 1997 film", instanceOf: [] }), "fiction");
  assert.equal(classifyAnchor({ description: "1986 video game", instanceOf: ["video game"] }), "fiction");
  assert.equal(classifyAnchor({ description: "a name", instanceOf: [] }), null);
});

test("reality is a fold over attestation and the world anchor", () => {
  const report = { id: "r", register: "report", referents: ["x"] };
  const film = { id: "f", register: "fiction", referents: ["x"] };
  // attested only by fiction, no anchor -> fictional
  assert.equal(realityRegister({ id: "x" }, { sources: [film] }).realityKind, "fictional");
  // attested by a truth-claiming source -> real
  assert.equal(realityRegister({ id: "x" }, { sources: [report] }).realityKind, "real");
  // both -> fictionalized-real
  assert.equal(realityRegister({ id: "x" }, { sources: [report, film] }).realityKind, "fictionalized-real");
  // a fiction work that mentions a world-anchored name -> fictionalized-real
  // (the film's referent corresponds to the real one — reality-kind.js's rule)
  assert.equal(realityRegister({ id: "x" }, { sources: [film], anchor: { found: true, world: true, title: "SS Great Eastern" } }).realityKind, "fictionalized-real");
  // a truth-claiming source over a world anchor -> real
  assert.equal(realityRegister({ id: "x" }, { sources: [report], anchor: { found: true, world: true, title: "RMS Titanic" } }).realityKind, "real");
  // a truth-claiming source over a fiction anchor -> fictional (the anchor wins)
  assert.equal(realityRegister({ id: "x" }, { sources: [report], anchor: { found: true, world: false } }).realityKind, "fictional");
  // no truth-claiming attestation, no anchor -> unexamined
  assert.equal(realityRegister({ id: "x" }, { sources: [{ id: "c", register: "comment", referents: ["x"] }] }).realityKind, "unexamined");
});

test("an undeclared register is a typed refusal, never guessed", () => {
  const p = realityRegister({ id: "x" }, { sources: [{ id: "s", register: "vibes", referents: ["x"] }] });
  assert.equal(p.attested.length, 0);
  assert.equal(p.refused.length, 1);
  assert.equal(p.refused[0].reason, "no_declared_register");
  assert.equal(p.realityKind, "unexamined");
});

test("buildRealityRegisters resolves via an injected anchor and emits hyperlexicon notes", async () => {
  const resolve = async (term) => (term === "Great Eastern" ? { found: true, title: "SS Great Eastern", extract: "SS Great Eastern was an iron-hulled steamship...", url: "https://en.wikipedia.org/wiki/SS_Great_Eastern", world: true } : { found: false, world: null });
  const built = await buildRealityRegisters({
    things: [{ id: "the Great Eastern", surfaces: ["Great Eastern"], context: "a magnificent ship" }],
    sources: [{ id: "walker", register: "comment", referents: ["the Great Eastern"] }],
    resolve,
  });
  const p = built.byId.get("the Great Eastern");
  assert.equal(p.realityKind, "real");
  assert.match(p.anchor.extract, /steamship/);
  const notes = registerNotes(p);
  assert.ok(notes.some((n) => n.verb === "is-reality-kind" && n.object === "real"));
  assert.ok(notes.some((n) => n.verb === "corresponds-to" && n.object === "wikipedia:SS_Great_Eastern"));
  assert.ok(notes.some((n) => n.verb === "attested-by" && n.object === "comment"));
  const lines = registerProfileLines(p).join("\n");
  assert.match(lines, /what it is:\s+SS Great Eastern was an iron-hulled steamship/);
});
