import test from "node:test"; import assert from "node:assert/strict";
import { registerFor, presenceOptionsFor, UNSPACED_STEMS, clearRegisterCache } from "./pronoun-registers.js";
import { normalizePronounClass, findThirdPersonSingular, resolvePronounsByPresence } from "./pronouns.js";
test("san: the shipped register is derived from treebanks and carries its provenance", () => {
  clearRegisterCache(); const r = registerFor("san"); assert.equal(r.origin, "shipped"); const p = r.register.provenance;
  assert.match(p.license, /CC BY-SA 4.0/); assert.ok(p.tokens.vedic_train > 5000 && p.tokens.ufal > 50); assert.ok(p.third_person_lemmas.lemmas.includes("tad") && p.third_person_lemmas.lemmas.includes("idam"));
  assert.ok(!UNSPACED_STEMS.has("san")); const o = presenceOptionsFor("san"); assert.equal(o.beings, "heard-nominals"); assert.equal(o.unspaced, false); assert.ok(o.pronounClass.endings.length > 50);
});
test("san: gender is clean where the treebank attests one gender and singular, soft where it splits", () => {
  const c = normalizePronounClass(registerFor("san").register);
  assert.deepEqual([c.get("saḥ").gender, c.get("saḥ").clean], ["m", true]); assert.deepEqual([c.get("sā").gender, c.get("sā").clean], ["f", true]); assert.equal(c.get("tasya").clean, false);
  assert.ok(c.has("so") && c.has("taṃ"), "the final-sound closure: so for sah, tam with anusvara"); assert.ok(!c.has("tat") && !c.has("te"), "neuter and plural forms are not in the class");
});
test("san: the finder sees a free-standing pronoun and not one fused into a longer word", () => {
  const reg = registerFor("san").register; const t = "sa tam avadat tasyaiva vacanaṃ sā ca";
  assert.deepEqual(findThirdPersonSingular(t, reg).map((h) => h.token), ["sa", "tam", "sā"]);
});
test("san: a gendered pair binds by presence and the unbound ones carry a reason", () => {
  const reg = registerFor("san").register; const d = presenceOptionsFor("san");
  const sents = [{ text: "rāmo vanaṃ gataḥ", offset: 0 }, { text: "rāmas tatra sa vyacarat", offset: 17 }, { text: "sā nagare ’vasat", offset: 41 }];
  const r = resolvePronounsByPresence(sents, [{ ref: "r", start: 0, end: 4 }, { ref: "r", start: 17, end: 22 }], { ...d, pronounClass: reg });
  assert.equal(r.bindings.length, 1); assert.equal(r.bindings[0].pronoun, "sa"); assert.equal(r.unbound.length, 1); assert.equal(r.unbound[0].reason, "gender_veto");
});
