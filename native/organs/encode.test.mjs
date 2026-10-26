// encode.test.mjs — the Isthmus encode leg (organs/encode.js): a copular fact said through the target language's codec, measured
// against the hand-written fact-gate lens for the same language (two independent givers: the lens's author, the treebank).
import test from "node:test";
import assert from "node:assert/strict";
import { encodeCopula, udGrammar } from "./encode.js";
import { FACT_LENSES } from "../adapters/text/fact-lenses.js";

const D = "26 October 2026";
// the frame each lens builds from its own words (head noun, jurisdiction) — the fixture words are the test's; the frame is the lens's
const CASES = { eng: ["president", "France"], spa: ["presidente", "Francia"], fra: ["président", "France"] };

for (const [lang, [head, jur]] of Object.entries(CASES)) {
  test(`${lang}: the codec says the fact with the frame and value verbatim, and agrees with the lens on the copula`, { skip: !udGrammar(lang) && `no UDGrammar@1 for ${lang}` }, async () => {
    const L = FACT_LENSES[lang];
    const frame = L.frame(head, jur), value = "Emmanuel Macron";
    const r = await encodeCopula({ frame, value, language: lang });
    assert.ok(r.text, `${lang}: ${JSON.stringify(r.gaps)}`);
    assert.ok(r.text.toLowerCase().includes(frame.toLowerCase()), `the frame is the asker's own bytes: ${r.text}`);
    assert.ok(r.text.includes(value));
    const template = L.value(D, frame, value);
    const copula = r.text.replace(new RegExp(frame, "i"), " ").replace(value, " ").trim().split(/\s+/).filter(Boolean);
    assert.equal(copula.length, 1, `one word besides the frame and the value: ${r.text}`);
    assert.ok(template.split(/[\s,.]+/).includes(copula[0]), `FALSIFIER: the codec's copula "${copula[0]}" is not the lens's (${template})`);
  });
}

test("no English word reaches another language: the Spanish clause carries the Spanish copula, never 'is'", { skip: !udGrammar("spa") && "no Spanish codec" }, async () => {
  const r = await encodeCopula({ frame: "el presidente de Francia", value: "Emmanuel Macron", language: "spa" });
  assert.ok(!/\bis\b/.test(r.text)); assert.match(r.text, /\bes\b/);
});

test("a language whose table cannot say which copula form is finite is a gap, never its most frequent form", { skip: !udGrammar("jpn") && "no Japanese codec" }, async () => {
  const r = await encodeCopula({ frame: "フランスの大統領", value: "エマニュエル・マクロン", language: "jpn" });
  assert.equal(r.text, null); assert.equal(r.gaps[0].gap, "form_unmarked");
});

test("a language with no way back is a typed gap", async () => {
  const r = await encodeCopula({ frame: "x", value: "y", language: "zzz" });
  assert.equal(r.text, null); assert.equal(r.gaps[0].gap, "no_codec");
});
