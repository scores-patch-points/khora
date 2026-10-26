// notation-codec.test.mjs — the Isthmus on the mechanical lane (native/docs/THE-ISTHMUS.md).
// Digits and operator symbols are a notation with its own codec, independent of the language the sentence around them is in.
// Written violation-first: every case below fell to the `register` lane (the model's own sum) before the notation codec.
import test from "node:test";
import assert from "node:assert/strict";
import { create, all } from "mathjs";
import { checkQuantity, checkNotation, notationSpan } from "./arithmetic.js";

const math = create(all);
const q = (s) => checkQuantity(s, { math, now: new Date("2026-10-26T12:00:00Z") });

test("a symbolic product inside a sentence in any language is computed", () => {
  for (const s of ["¿Cuánto es 17 × 24?", "Combien font 17 × 24 ?", "Wie viel ist 17 × 24?", "17 × 24 等于多少？", "17 × 24 はいくつですか？", "Сколько будет 17 × 24?", "ما هو 17 × 24؟"]) {
    const f = q(s);
    assert.ok(f && !f.gap, `FALSIFIER: no computation for ${s}`);
    assert.equal(Number(f.value), 408, s);
    assert.equal(f.codec, "notation", s);
  }
});

test("digits of another script are read as digits (Arabic-Indic, Devanagari, fullwidth)", () => {
  assert.equal(Number(q("ما هو ١٧ × ٢٤؟").value), 408);
  assert.equal(Number(q("१७ × २४ कितना है?").value), 408);
  assert.equal(Number(q("１７×２４は？").value), 408);
});

test("spaced minus and slash are operators; unspaced ones are ranges and dates, never arithmetic", () => {
  assert.equal(Number(q("¿Cuánto es 100 - 58?").value), 42);
  assert.equal(Number(q("Combien font 84 / 2 ?").value), 42);
  assert.equal(notationSpan("las páginas 10-20 del informe"), null);
  assert.equal(notationSpan("la reunión es el 12/05"), null);
});

test("an ambiguous text is not this codec's: two spans, or a digit outside the span", () => {
  assert.equal(notationSpan("En 2020, ¿cuánto era 17 × 24?"), null, "a year beside the expression");
  assert.equal(notationSpan("17 × 24 y 3 × 5"), null, "two expressions");
  assert.equal(notationSpan("el capítulo 7 habla del tema"), null, "no operator");
});

test("a span inside code or inside a longer claim is not an arithmetic ask", () => {
  assert.equal(notationSpan("why does `a = 3 * 4` fail in my loop?"), null, "FALSIFIER: code was computed");
  assert.equal(notationSpan("const total = 3 * 4;"), null);
  assert.equal(notationSpan("Ayer pagué 3 + 4 dólares por las entradas del concierto en el centro de la ciudad"), null, "a long claim, not an ask");
});

test("a decimal comma is a typed gap, never a guessed separator", () => {
  const f = checkNotation("¿Cuánto es 1,5 × 2?", { math });
  assert.ok(f && f.gap, "FALSIFIER: a comma separator was guessed");
});

test("English is unchanged: the English operator words still compute through their own path", () => {
  const f = q("What is 17 times 24?");
  assert.equal(Number(f.value), 408);
  assert.notEqual(f.codec, "notation");
});
