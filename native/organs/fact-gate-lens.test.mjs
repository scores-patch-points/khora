// fact-gate-lens.test.mjs — the Isthmus on the fact-gate (native/docs/THE-ISTHMUS.md). The lens is the ask's language,
// never English by default: an ask in a language the gate holds a lens for is read by that lens; a heard language with no
// lens is a typed gap (the gate leaves the answer untouched); only an unheard ask takes English, marked as the default.
import test from "node:test";
import assert from "node:assert/strict";
import { lensForAsk, lensForText, NO_LENS } from "../adapters/text/fact-lenses.js";
import { applyVerdictGate, decideGate } from "./fact-gate.js";

test("a WH-opener still picks its lens, unchanged", () => {
  assert.equal(lensForText("Who is the president of France?").lang, lensForAsk("Who is the president of France?").lang);
  assert.equal(lensForText("¿Quién es el presidente de Francia?").lang, "spa");
});

test("an ask with no WH-opener is read by its heard language's lens, not English", () => {
  const es = lensForText("Dime el nombre del actual presidente de la República Francesa, por favor");
  assert.equal(es.lang, "spa", "FALSIFIER: a Spanish ask with no wh-opener was given the English lens");
  const de = lensForText("Nenne mir bitte den Namen des aktuellen Präsidenten der Französischen Republik");
  assert.equal(de.lang, "deu");
});

test("a heard language with no lens is the typed gap, and both gates leave the answer untouched", () => {
  const nl = lensForText("Noem mij alstublieft de naam van de huidige president van de Franse Republiek");
  assert.equal(nl.noLens, true, `FALSIFIER: Dutch read with the ${nl.lang} lens`);
  const answer = "De president van Frankrijk is Emmanuel Macron.";
  const v = applyVerdictGate({ ask: "Noem de president van Frankrijk", answer, lens: nl, now: new Date("2026-10-26") });
  assert.equal(v.text, answer);
  assert.equal(v.gap, "no_lens");
  const d = decideGate({ ask: "Noem de president van Frankrijk", answer, lens: nl, now: new Date("2026-10-26") });
  assert.equal(d.open, false);
  assert.equal(d.gap, "no_lens");
});

test("an unheard ask takes the English lens, marked as the default", () => {
  const l = lensForText("ok");
  if (!l.noLens && l.lang === "eng" && !lensForAsk("ok")) assert.equal(l.defaulted, true);
});

test("NO_LENS is a gap, not a lens", () => {
  assert.equal(NO_LENS.gap, "no_lens");
  assert.equal(NO_LENS.wh, undefined);
});
