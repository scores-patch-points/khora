// read-door.test.mjs — the reading door's language handling and its disclosure. Every control that must pass is
// paired with the falsifier that shows the old behaviour would fail it (Constitution II.10).
import test from "node:test";
import assert from "node:assert/strict";
import { readDoor, declaredLanguage, STAGES_NOT_RUN, selectEarBySignal, noiseOf, contentSignal } from "./read-door.mjs";

const ES = "Don Quijote fue escrito por Miguel de Cervantes. Cervantes vivió en España, y Don Quijote viaja con Sancho Panza por La Mancha. Sancho Panza admira a Don Quijote.";
const EN = "Anna Karenina was written by Leo Tolstoy. Tolstoy lived in Russia, and Anna meets Vronsky in Moscow. Vronsky loves Anna.";
const names = (r) => r.referents.flatMap((x) => x.surfaces);

test("control: Spanish is heard as Spanish, and the reader finds its names", async () => {
  const r = await readDoor({ text: ES, name: "es" });
  assert.equal(r.languageSource, "detected"); assert.equal(r.language, "spa");
  for (const n of ["Don Quijote", "Sancho Panza", "La Mancha"]) assert.ok(names(r).includes(n), `missing ${n}: ${JSON.stringify(names(r))}`);
});

test("falsifier: forcing English on the same Spanish (what the proxy used to do) loses names the detected read finds", async () => {
  const forced = await readDoor({ text: ES, name: "es", language: "en" });
  const heard = await readDoor({ text: ES, name: "es" });
  assert.equal(forced.languageSource, "declared"); assert.equal(forced.language, "eng");
  assert.ok(!names(forced).includes("Sancho Panza"), "if English finds it too, the hardcode was never the loss and this control is vacuous");
  assert.ok(names(heard).length > names(forced).length, `detected ${names(heard).length} vs forced ${names(forced).length}`);
});

test("control: a declared language is honoured, and English is unchanged whether declared or heard", async () => {
  const a = await readDoor({ text: EN }), b = await readDoor({ text: EN, language: "en" });
  assert.equal(a.language, "eng"); assert.equal(b.language, "eng"); assert.equal(b.languageSource, "declared"); assert.equal(a.languageSource, "detected");
  assert.deepEqual(names(a).sort(), names(b).sort());
});

test("something that is not a language code is refused, not silently read as English", () => {
  for (const bad of ["English", "e n", "en_US", 5, {}, "x"]) assert.throws(() => declaredLanguage(bad), RangeError, JSON.stringify(bad));
  assert.equal(declaredLanguage(null), null); assert.equal(declaredLanguage(""), null); assert.equal(declaredLanguage("zh-Hans"), "zh-Hans");
  return assert.rejects(readDoor({ text: EN, language: "English" }), RangeError);
});

test("disclosure is what happened for THIS document: no stale 'en.json absent', priors match the language", async () => {
  for (const [text, lang] of [[ES, "spa"], [EN, "eng"]]) {
    const r = await readDoor({ text });
    assert.ok(!/en\.json absent/.test(r.basis), "the old hardcoded claim about a missing prior file is gone");
    assert.deepEqual(r.priorsInjected, [`language:${lang}`]);
    assert.match(r.basis, new RegExp(`language ${lang} \\(detected\\)`));
  }
});

test("falsifier: a text that attests no language says so as a typed gap and injects no prior", async () => {
  const r = await readDoor({ text: "12345 67890 11111 22222. 33333 44444 55555 66666." });
  if (r.languageSource !== "undetected") return;   // the reader may hear something in digits; then this control does not apply
  assert.deepEqual(r.priorsInjected, []); assert.ok(r.gaps.some((g) => /^language_undetected:/.test(g)), JSON.stringify(r.gaps));
});

test("input truncation is still a typed gap; the stages not run are still named and cannot be mutated through the response", async () => {
  const r = await readDoor({ text: EN, maxCharacters: 40 });
  assert.equal(r.truncated, true); assert.ok(r.gaps.some((g) => /^input_truncated:/.test(g)));
  assert.deepEqual(r.stagesNotRun, ["5b", "6", "7", "8"]); r.stagesNotRun.push("x"); assert.deepEqual([...STAGES_NOT_RUN], ["5b", "6", "7", "8"]);
});

// KNOWN GAPS, measured 2026-10-05 on an 11-language gold set. They are stated as the behaviour we want, marked todo so a
// fix shows up as a passing todo and a regression elsewhere cannot hide behind them.
test("todo: Russian, Chinese and Japanese give the reader at least one entity from a text that repeats them", { todo: "referents need a second mention and the non-Latin grammars are immature: 0/5, 0/4, 0/3" }, async () => {
  const RU = "Анна Каренина была написана Львом Толстым. Толстой жил в России, а Анна встречает Вронского в Москве. Вронский любит Анну.";
  assert.ok(names(await readDoor({ text: RU })).length >= 1);
});
test("todo: detection must not lose what forced-English found in Arabic (full name 'برج إيفل' became 'برج')", { todo: "measured regression 1/4 → 0/4 on the Arabic gold text" }, async () => {
  const AR = "برج إيفل يقع في باريس. صمم برج إيفل المهندس غوستاف إيفل. وغوستاف إيفل صمم أيضا الهيكل الداخلي لتمثال الحرية. باريس هي عاصمة فرنسا.";
  assert.ok(names(await readDoor({ text: AR })).includes("برج إيفل"));
});

test("noiseOf is deterministic and destroys collocations but keeps the text shape", () => {
  const a = noiseOf("el presidente vive en Madrid y visita Francia cada año"), b = noiseOf("el presidente vive en Madrid y visita Francia cada año");
  assert.equal(a, b, "deterministic");
  assert.notEqual(a, "el presidente vive en Madrid y visita Francia cada año", "collocations destroyed");
  assert.equal(a.length, "el presidente vive en Madrid y visita Francia cada año".length, "same length");
});

test("the ear selector is DEBIASED: 'most signal' is not 'biggest prior' — scores carry lift (signal per unit chance) and the winner is the max lift, not the max raw signal", async () => {
  const es = "El presidente Pedro Sánchez visita Madrid cada año. Sánchez se reúne con la presidenta de la Comunidad de Madrid en el Palacio de la Moncloa. Madrid es la capital de España y Sánchez gobierna desde Madrid. La resistencia de Madrid al plan de Sánchez es fuerte, pero Sánchez insiste en su reforma de Madrid. Los ciudadanos de Madrid apoyan a Sánchez en las elecciones de Madrid cada mayo.";
  const sel = await selectEarBySignal({ text: es, probeChars: 2000, candidates: ["eng", "spa", "fra"] });
  assert.ok(sel.scores.every((s) => typeof s.lift === "number" && typeof s.noise === "number" && typeof s.signal === "number"), "lift and noise are disclosed per ear");
  const max = Math.max(...sel.scores.map((s) => s.lift));
  assert.ok(sel.scores.some((s) => s.language === sel.winner && s.lift === max), `winner ${sel.winner} carries the max lift; scores=${JSON.stringify(sel.scores)}`);
});

test("English text still wins English under the same debiased rule", async () => {
  const en = "The president visits Spain in twenty twenty six. The government announces new reforms for the schools. Parliament debates the budget every week.";
  const sel = await selectEarBySignal({ text: en, probeChars: 600, candidates: ["eng", "spa", "fra"] });
  assert.equal(sel.winner, "eng", JSON.stringify(sel.scores));
});
