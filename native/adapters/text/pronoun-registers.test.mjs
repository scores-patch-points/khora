// pronoun registers: shipped first, priors second, none = a typed gap; unspaced scripts are matched without a word boundary and bound by presence.
import test from "node:test"; import assert from "node:assert/strict";
import { registerFor, presenceOptionsFor, UNSPACED_STEMS, clearRegisterCache } from "./pronoun-registers.js";
import { resolvePronounsByPresence } from "./pronouns.js"; import { defaultPronounPresence } from "./pronoun-presence-chosen.js";
test("English uses the built-in class with the default dials; no register file is needed", () => { const o = presenceOptionsFor("eng"); assert.equal(o.pronounClass, undefined); assert.equal(o.floor, defaultPronounPresence().floor); assert.equal(presenceOptionsFor("en").window, 4); });
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const withPriors = (files, fn) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pronreg-")); const old = process.env.KHORA_PRIORS_DIR; try { for (const [n, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), JSON.stringify(body)); process.env.KHORA_PRIORS_DIR = dir; clearRegisterCache(); return fn(); } finally { if (old === undefined) delete process.env.KHORA_PRIORS_DIR; else process.env.KHORA_PRIORS_DIR = old; clearRegisterCache(); fs.rmSync(dir, { recursive: true, force: true }); } };
const FORMS = { "x": { gender: { Masc: 9 }, number: { Sing: 9 } } };
const EVAL = { documents: 30, answerable: 200, precision: 0.7, coverage: 0.5, nullPrecision: 0.45, resultsFile: "identity/pronouns-multilingual/zzz/RESULTS.md", method: "gold" };
test("a register WITH its evaluation binds by default, with its origin", () => withPriors({ "pronoun-zzz.json": { schema: "PronounPrior@1", language: "zzz", forms: FORMS, evaluation: EVAL } }, () => { const o = presenceOptionsFor("zzz"); assert.equal(o.registerOrigin, "priors"); assert.equal(o.gap, undefined); assert.equal(o.unspaced, false); }));
test("NO UNMEASURED BINDING SHIPS: a register without its evaluation (or with a hole in it) is a typed gap", () => withPriors({ "pronoun-yyy.json": { schema: "PronounPrior@1", language: "yyy", forms: FORMS }, "pronoun-www.json": { schema: "PronounPrior@1", language: "www", forms: FORMS, evaluation: { ...EVAL, nullPrecision: undefined } } }, () => {
  assert.equal(presenceOptionsFor("yyy").gap.gap, "pronoun_presence_unmeasured"); assert.equal(presenceOptionsFor("www").gap.gap, "pronoun_presence_unmeasured"); assert.equal(presenceOptionsFor("yyy").pronounClass, undefined);
}));
test("the shipped grc register is the unmeasured baseline today: a typed gap, not a binding", () => { clearRegisterCache(); assert.equal(presenceOptionsFor("grc").gap?.gap, "pronoun_presence_unmeasured"); });
test("a language with no register gets a typed gap, never the English class", () => { clearRegisterCache(); const o = presenceOptionsFor("xxx"); assert.equal(o.gap.gap, "pronoun_presence_no_register"); assert.equal(o.pronounClass, undefined); assert.equal(registerFor("xxx"), null); });
test("unspaced scripts are declared: Chinese yes, Greek no", () => { assert.ok(UNSPACED_STEMS.has("cmn")); assert.ok(!UNSPACED_STEMS.has("grc")); });
const REG_ZH = { schema: "PronounPrior@1", language: "cmn", provenance: { test: true }, forms: { "他": { gender: { "_": 5 }, number: { Sing: 5 } }, "她": { gender: { "_": 5 }, number: { Sing: 5 } } } };
const sents = [{ text: "小明和小明走了。", offset: 0, order: 0 }, { text: "他的朋友说他回家了。", offset: 8, order: 1 }];
const mentions = [{ ref: "ref:xm", start: 0, end: 2 }, { ref: "ref:xm", start: 3, end: 5 }];
test("unspaced: 他 flush against 的 and 说 is found and bound by presence; the spaced finder finds nothing", () => {
  const d = defaultPronounPresence(); const spaced = resolvePronounsByPresence(sents, mentions, { ...d, language: "cmn", pronounClass: REG_ZH, unspaced: false });
  assert.equal(spaced.bindings.length, 0, "the letter boundary cannot see a pronoun inside unspaced text");
  const un = resolvePronounsByPresence(sents, mentions, { ...d, language: "cmn", pronounClass: REG_ZH, unspaced: true });
  assert.equal(un.bindings.length, 2); assert.ok(un.bindings.every((b) => b.referentId === "ref:xm"));
});
