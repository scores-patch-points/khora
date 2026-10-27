// declension-wiring.test.mjs — the declension fold behind the read (read-core.mjs `declension` option, gated by the part-of-speech prior).
//
// "Пьер", "Пьера", "Пьеру" are one name in different cases. adapters/text/declension.js (a UniMorph rule table, janus/priors/declension-rus.json) was never reached by the
// reader: cast.js passes no `sameStem`. This option hands it to the organs the index already takes, and refuses a form the language's own part-of-speech prior uses more as
// something other than a noun, a name or an adjective. No lexicon, no GUM, no Wiktionary pack: the repo's priors (janus, by the native/priors symlink) and crafted priors for the gate.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readWith, declensionOrgansFor } from "./read-core.mjs";

const read = (t, o = {}) => readWith(t, { language: "ru", minCharacters: 0, ...o });
const stable = (e) => JSON.stringify({ ...e, ms: 0 });
const rusPrior = () => JSON.parse(fs.readFileSync(new URL("../priors/declension-rus.json", import.meta.url), "utf8"));
const RU = "Пьер вошёл в гостиную. Князь Андрей встретил Пьера у камина. Наташа смотрела на Пьера, и Пьер улыбнулся Наташе. Потом Пьеру подали чай, и Пьер долго говорил с Андреем о войне. Наташа слушала Пьера, а Андрей смотрел на Наташу.";
const rowOf = (e, surface) => e.cast.find((c) => c.allSurfaces.some((s) => s.toLowerCase() === surface.toLowerCase()));

test("off by default: no key, no gap, byte-identical (the option is additive)", () => {
  const plain = read(RU), off = read(RU, { declension: false }), nul = read(RU, { declension: null });
  assert.equal(plain.declension, undefined);
  assert.equal(stable(plain), stable(off));
  assert.equal(stable(plain), stable(nul));
  assert.equal(plain.gaps.some((g) => /declension/.test(g.gap)), false);
});

test("on: Пьер, Пьера, Пьеру are one being; so are the cases of Андрей and Наташа; the fold says what it used", () => {
  const plain = read(RU), on = read(RU, { declension: true });
  // the failure: the reader holds every case form as a being of its own
  const pierre = (e) => e.cast.filter((c) => /^Пьер/.test(c.surface));
  assert.ok(pierre(plain).length >= 3, "the plain read keeps Пьер, Пьера and Пьеру apart");
  assert.equal(pierre(on).length, 1);
  const row = pierre(on)[0];
  for (const f of ["Пьер", "Пьера", "Пьеру"]) assert.ok(row.allSurfaces.includes(f), `${f} is in the one being`);
  assert.equal(row.mentionSpans.length, 7);
  assert.equal(rowOf(on, "Андреем"), rowOf(on, "Андрей"));
  assert.equal(rowOf(on, "Наташе"), rowOf(on, "Наташу"));
  assert.ok(on.cast.length < plain.cast.length);
  assert.equal(on.declension.folded, true);
  assert.match(on.declension.giver, /unimorph/i);
  assert.match(on.declension.gate.prior, /Universal Dependencies/);
  // nothing else moved: the sentences are the plain read's
  assert.equal(JSON.stringify(on.sentences), JSON.stringify(plain.sentences));
});

test("a control built to fail: a prior whose endings lead nowhere folds nothing; two different names stay two", () => {
  const base = rusPrior();
  const nowhere = { ...base, rules: base.rules.map((r) => ({ ...r, to: `ъ${r.to}` })) };   // no word of the text ends so
  const e = read(RU, { declension: { prior: nowhere } });
  assert.notEqual(rowOf(e, "Пьера"), rowOf(e, "Пьер"), "a prior that leads nowhere does not fold Пьера into Пьер");
  const two = read("Пьер вошёл в гостиную. Князь Андрей встретил Пьера у камина. Пётр сел у окна, и Пьер улыбнулся Андрею. Потом Пётр подал чай, и Пьер долго говорил с Андреем о войне. Пётр слушал Пьера, а Андрей смотрел на Петра.", { declension: true });
  const a1 = rowOf(two, "Пьер"), a2 = rowOf(two, "Пётр");
  assert.ok(a1 && a2, "both names are beings");
  assert.notEqual(a1, a2, "Пьер and Пётр share no stem and stay two");
  // known limit, not asserted as right: Пётр and Петра differ by a vowel alternation (ё/е) that an ending rule does not reach, so they stay two here
});

test("the gate: a form the part-of-speech prior uses more as other than as a nominal is not folded; an unseen form is", () => {
  const prior = { schema: "DeclensionPrior@1", rules: [{ from: "а", to: "", count: 100 }] };
  const posPrior = { forms: { приехала: { VERB: 9, NOUN: 1 }, приехал: { VERB: 10 }, она: { PRON: 50 }, он: { PRON: 80 }, пьер: { PROPN: 3 } } };
  const captured = {};
  const organs = declensionOrgansFor({ prior }, { stem: "rus", pr: { posPrior }, discoverReferents: () => null, namesCorefer: (a, b, o) => { captured.gated = o.sameStem; return false; }, gaps: [], report: () => {} });
  organs.namesCorefer("x", "y");
  const sameStem = captured.gated;
  assert.equal(sameStem("приехала", "приехал"), false, "a verb is not folded though the ending rule reaches it");
  assert.equal(sameStem("она", "он"), false, "a pronoun is not folded");
  assert.equal(sameStem("наташа", "наташ"), true, "an unseen form is folded by the rule");
  // the same pair under a part-of-speech prior that does not know it: the rule reaches it (so it was the gate that refused it above)
  const open = declensionOrgansFor({ prior }, { stem: "rus", pr: { posPrior: { forms: { другое: { NOUN: 1 } } } }, discoverReferents: () => null, namesCorefer: (a, b, o) => { captured.open = o.sameStem; return false; }, gaps: [], report: () => {} });
  open.namesCorefer("x", "y");
  assert.equal(captured.open("приехала", "приехал"), true);
});

test("the fold reaches the index through discoverReferents too, with the gate", () => {
  const prior = { rules: [{ from: "а", to: "", count: 100 }] };
  let seen = null;
  const organs = declensionOrgansFor({ prior }, { stem: "rus", pr: { posPrior: { forms: { x: { NOUN: 1 } } } }, discoverReferents: (s, o) => { seen = o; return "found"; }, namesCorefer: () => null, gaps: [], report: () => {} });
  assert.equal(organs.discoverReferents([], { minSentences: 0 }), "found");
  assert.equal(seen.minSentences, 0, "the index's own options pass through");
  assert.equal(typeof seen.sameStem, "function");
});

test("no declension prior for the language: a typed gap, the exact-token read is unchanged", () => {
  const T = "Anna met Boris in Paris. Anna liked Paris. Boris left Paris and Anna cried.";
  const plain = readWith(T, { language: "en", minCharacters: 0 }), on = readWith(T, { language: "en", minCharacters: 0, declension: true });
  assert.equal(JSON.stringify(on.cast), JSON.stringify(plain.cast));
  const g = on.gaps.find((x) => x.gap === "no_declension_prior");
  assert.ok(g && g.stem === "eng");
  assert.equal(on.declension.folded, false);
});

test("no part-of-speech prior: the fold is not run ungated; a typed gap says so", () => {
  const gaps = [];
  let reported = null;
  const organs = declensionOrgansFor({ prior: { rules: [{ from: "а", to: "", count: 1 }] } }, { stem: "xxx", pr: { posPrior: null }, discoverReferents: () => null, namesCorefer: () => null, gaps, report: (r) => { reported = r; } });
  assert.deepEqual(organs, {});
  assert.equal(gaps[0].gap, "declension_ungated");
  assert.equal(reported.folded, false);
});

test("the module keeps the reader's import graph free of node: (declension.js imports nothing)", () => {
  const src = fs.readFileSync(new URL("../adapters/text/declension.js", import.meta.url), "utf8");
  assert.equal(/^\s*import\s/m.test(src), false);
});
