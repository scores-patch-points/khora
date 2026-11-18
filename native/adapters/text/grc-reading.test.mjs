// Ancient Greek reading: the measured pronoun register (articles are not "he"), the case-fold and the case-run break, and that every other language reads as it did.
import test from "node:test"; import assert from "node:assert/strict";
import { registerFor } from "./pronoun-registers.js"; import { normalizePronounClass } from "./pronouns.js";
import { shippedDeclensionFor } from "./declension-shipped.js"; import { createDeclensionFolder, createRunBreak } from "./declension.js";
import { extractSurfaces } from "./surfaces.js"; import { resolvePronounsByPresence } from "./pronouns.js"; import { defaultPronounPresence } from "./pronoun-presence-chosen.js";
import { readToWeft } from "../../the-fold/read-process.mjs";

const reg = registerFor("grc").register; const cls = normalizePronounClass(reg);
test("grc register: PronounPrior@1 with a measured filter and counts", () => { assert.equal(reg.schema, "PronounPrior@1"); assert.match(reg.provenance.filter, /UPOS PRON/); assert.ok(reg.provenance.tokens_read_proiel > 100000); for (const f of Object.values(reg.forms)) assert.ok(f.gender && f.number); });
test("grc register: the article forms the old register counted as he are out", () => { for (const f of ["οἱ", "τὰ", "τὸν", "τῷ", "τοὺς", "τοῖσι", "ὁ", "ἡ"]) assert.ok(!cls.has(f), f); });
test("grc register: αὐτοῦ and αὐτῷ are soft (masculine or neuter), the feminine forms are clean", () => { assert.equal(cls.get("αὐτοῦ").clean, false); assert.equal(cls.get("αὐτῷ").clean, false); for (const f of ["αὐτῆς", "αὐτῇ"]) { assert.equal(cls.get(f).clean, true); assert.equal(cls.get(f).gender, "f"); } });
test("grc register: no member is mostly neuter or mostly plural", () => { for (const [f, r] of Object.entries(reg.forms)) { const g = Object.entries(r.gender).sort((a, b) => b[1] - a[1])[0][0]; assert.ok(g === "Masc" || g === "Fem", f); assert.ok((r.number.Sing ?? 0) > (r.number.Plur ?? 0), f); } });
test("trace: a pronoun the rung does not bind says why; absent, the bindings are the same", () => {
  const sents = [{ text: "αὐτοῦ", offset: 0, order: 0 }]; const d = { ...defaultPronounPresence(), language: "grc", pronounClass: reg };
  const trace = []; const a = resolvePronounsByPresence(sents, [], { ...d, trace }); const b = resolvePronounsByPresence(sents, [], d);
  assert.deepEqual(a.bindings, b.bindings); assert.equal(trace.length, 1); assert.equal(trace[0].reason, "no_candidate");
});
const prior = shippedDeclensionFor("grc");
test("declension: Greek ships a co-lemma prior; no other stem does (their reads are unchanged)", () => { assert.equal(prior.prior.mode, "co-lemma"); assert.equal(shippedDeclensionFor("eng"), null); assert.equal(shippedDeclensionFor("rus"), null); assert.equal(shippedDeclensionFor(""), null); });
test("declension: case forms of one name reach each other, two different names do not", () => {
  const { sameStem } = createDeclensionFolder(prior.prior);
  assert.ok(sameStem("Πέτρον", "Πέτρος")); assert.ok(sameStem("Χριστόν", "Χριστοῦ"), "both reach Χριστός"); assert.ok(sameStem("Ἰησοῦν", "Ἰησοῦς"));
  assert.ok(!sameStem("Πέτρος", "Παῦλος")); assert.ok(!sameStem("Πέτρος", "Πέτρος"));
});
test("a prior without mode is the old pairwise fold: Russian's is untouched", () => { const { sameStem } = createDeclensionFolder({ rules: [{ from: "а", to: "" }] }); assert.ok(sameStem("Пьера", "Пьер")); assert.ok(!sameStem("Πέτρον", "Πέτρος")); });
test("run break: names of different case are not one run; the same case is; an unseen form breaks nothing; no table, no function", () => {
  const rb = createRunBreak(prior.prior);
  assert.equal(rb("Ἰησοῦ", "Πέτρος"), true); assert.equal(rb("Ἰησοῦν", "Χριστόν"), false); assert.equal(rb("Ἰησοῦς", "Χριστός"), false); assert.equal(rb("Ἰησοῦ", "Ξξξξ"), false);
  assert.equal(createRunBreak({ rules: [] }), null); assert.equal(createRunBreak(null), null);
});
test("run break reaches the surfaces: 'τῷ Ἰησοῦ Πέτρος' is two names with the break and one run without", () => {
  const s = [{ text: "ἠκολούθει δὲ τῷ Ἰησοῦ Πέτρος καὶ ἄλλος", order: 0, offset: 0 }];
  assert.ok(extractSurfaces(s, {}).some((x) => x.surface === "Ἰησοῦ Πέτρος"));
  const out = extractSurfaces(s, { runBreak: createRunBreak(prior.prior) }).map((x) => x.surface); assert.ok(!out.includes("Ἰησοῦ Πέτρος"));
});
const EN = "Anna Karenina met Vronsky at the station. She smiled at him. Vronsky bowed to Anna. He said that she was kind. Anna thanked him. She left the station and Vronsky watched her go.";
test("English and Russian reads do not change: no declension, same entry with or without the shipped function", () => {
  const a = readToWeft(EN, { language: "eng", address: "t" }), b = readToWeft(EN, { language: "eng", address: "t", declension: false });
  assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.equal(a.declension, undefined);
});
test("Greek read: the cast folds Πέτρον into Πέτρος", () => {
  const t = "ὁ Πέτρος ἦλθεν εἰς τὴν πόλιν καὶ εἶδεν τὸν Ἰωάννην. ὁ Ἰωάννης εἶπεν τῷ Πέτρῳ ὅτι οὐκ ἔστιν ἐνταῦθα. καὶ ἰδὼν τὸν Πέτρον ὁ Ἰωάννης ἐξῆλθεν ἐκ τῆς οἰκίας· ὁ δὲ Πέτρος ἔμεινεν ἐν τῇ πόλει ἕως ἑσπέρας. τῇ δὲ ἐπαύριον ἦλθεν ὁ Ἰωάννης πρὸς τὸν Πέτρον.";
  const w = readToWeft(t, { language: "grc", address: "t" }); assert.ok(w.declension?.folded); const peter = w.cast.filter((c) => [...c.allSurfaces].some((s) => /Πέτρ/.test(s))); assert.equal(peter.length, 1);
  assert.equal(readToWeft(t, { language: "grc", address: "t", declension: false }).cast.filter((c) => [...c.allSurfaces].some((s) => /Πέτρ/.test(s))).length > 1, true);
});
