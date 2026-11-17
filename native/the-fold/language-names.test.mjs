// languages are identified by their own name in their own script, with English names and ISO codes as aliases; nothing is invented for a language with no source.
import test from "node:test"; import assert from "node:assert/strict";
import { LANGUAGES, languageIdentity, stemFromName, stemsForName, autonymOf, describeLanguage } from "./language-names.js"; import { LANGUAGE_NAMES } from "./language-names.data.js";
test("Ancient Greek, Sanskrit and Mandarin are found by their own names in their own scripts and by English names and codes", () => {
  for (const n of ["Ἑλληνική", "ancient greek", "Ancient Greek", "grc"]) assert.equal(stemFromName(n), "grc", n);
  for (const n of ["संस्कृतम्", "Sanskrit", "sanskrit", "sa", "san"]) assert.equal(stemFromName(n), "san", n);
  for (const n of ["國語", "Mandarin", "國語"]) assert.equal(stemFromName(n), "cmn", n);
  for (const n of ["普通话", "Putonghua", "普通話"]) assert.equal(stemFromName(n), "cmn-hans", n);
  assert.equal(stemFromName("国语"), "cmn");
});
test("an autonym is stored in its own script (not English) for the three target languages", () => {
  assert.equal(autonymOf("grc"), "Ἑλληνική"); assert.equal(autonymOf("san"), "संस्कृतम्"); assert.equal(autonymOf("cmn-hans"), "普通话");
  assert.match(describeLanguage("grc"), /^Ἑλληνική \(Ancient Greek, grc\)$/); assert.match(describeLanguage("san"), /संस्कृतम्/);
});
test("a name shared by two stems is reported as ambiguous, not silently chosen (Chinese: Traditional or Simplified)", () => {
  const id = languageIdentity("Chinese"); assert.ok(id.ambiguousWith?.length >= 1); assert.deepEqual(new Set([id.stem, ...id.ambiguousWith]), new Set(["cmn", "cmn-hans"]));
  assert.equal(languageIdentity("Ἑλληνική").ambiguousWith, undefined);
});
test("every language with an autonym is found by it; every stem by its own code; no collision except the declared ones (Chinese Traditional/Simplified, Persian fas/pes)", () => {
  const collisions = new Map();
  for (const [stem, r] of Object.entries(LANGUAGES)) { assert.ok(stemsForName(stem).includes(stem), stem); if (r.autonym) assert.ok(stemsForName(r.autonym).includes(stem), `${stem}: ${r.autonym}`); }
  for (const r of Object.values(LANGUAGES)) for (const n of [r.autonym, ...r.english, ...r.aliases].filter(Boolean)) { const l = stemsForName(n); if (l.length > 1) collisions.set(n, l); }
  // the DECLARED ambiguities: a name that really names two prior stems. Anything else is a defect in the data.
  const DECLARED = [["cmn", "cmn-hans"], ["fas", "pes"]].map((g) => [...g].sort().join("+"));
  for (const [n, l] of collisions) assert.ok(DECLARED.includes([...l].sort().join("+")), `unexpected name collision ${n}: ${l}`);
});
test("a language with no autonym source carries a gap, never an invented name", () => {
  const none = Object.values(LANGUAGES).filter((r) => !r.autonym); assert.ok(none.length > 0 && none.every((r) => /no autonym source/.test(r.gap)));
  assert.ok(Object.values(LANGUAGES).filter((r) => r.autonym).every((r) => r.source && !r.gap)); assert.equal(languageIdentity("not-a-language"), null);
});
test("the data says where it came from (the ICU it was built on)", () => { assert.equal(LANGUAGE_NAMES.schema, "LanguageNames@1"); assert.ok(LANGUAGE_NAMES.icu && LANGUAGE_NAMES.count > 100); });
