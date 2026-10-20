// opencode-keyed.test.mjs — a claim checked by identity (opencode-keyed.mjs). Wikidata and Wikipedia are STUBBED; every organ above them is real.
import test from "node:test";
import assert from "node:assert/strict";
import { checkByIdentity, fillerOf, relationWordsOf } from "./opencode-keyed.mjs";

const QID = "Q7186";
// a tiny Wikidata: Marie Curie, her class (human), and the properties
const PROPS = {
  P569: { datatype: "time", labels: { en: "date of birth" }, aliases: { en: ["born", "birth date"] }, single: true },
  P570: { datatype: "time", labels: { en: "date of death" }, aliases: { en: ["died", "death date"] }, single: true },
  P19: { datatype: "wikibase-item", labels: { en: "place of birth" }, aliases: { en: ["born in"] }, single: true },
  P166: { datatype: "wikibase-item", labels: { en: "award received" }, aliases: { en: ["won"] }, single: false },
  P2044: { datatype: "quantity", labels: { en: "elevation above sea level" }, aliases: { en: ["elevation"] }, single: false },
};
const time = (t) => ({ rank: "normal", mainsnak: { datavalue: { type: "time", value: { time: t, precision: 11 } } } });
const item = (id) => ({ rank: "normal", mainsnak: { datavalue: { type: "wikibase-entityid", value: { id } } } });
const stub = () => async (url) => {
  const u = new URL(url), a = u.searchParams;
  if (u.host.endsWith("wikipedia.org")) return { query: { pages: { 1: { pageprops: { wikibase_item: QID } } } } };
  const ids = (a.get("ids") || "").split("|");
  const ents = {};
  for (const id of ids) {
    if (id === QID) ents[id] = { labels: { en: { value: "Marie Curie" } }, claims: { P31: [item("Q5")], P569: [time("+1867-11-07T00:00:00Z")], P570: [time("+1934-07-04T00:00:00Z")], P19: [item("Q270")], P166: [item("Q38104"), item("Q44585")], P2044: [{ rank: "normal", mainsnak: { datavalue: { type: "quantity", value: { amount: "+8848.86", unit: "1" } } } }] } };
    else if (id === "Q5") ents[id] = { labels: { en: { value: "human" } }, claims: { P1963: Object.keys(PROPS).map((p) => ({ mainsnak: { datavalue: { value: { id: p } } } })) } };
    else if (id === "Q270") ents[id] = { labels: { en: { value: "Warsaw" } } };
    else if (id === "Q38104") ents[id] = { labels: { en: { value: "Nobel Prize in Physics" } } };
    else if (id === "Q44585") ents[id] = { labels: { en: { value: "Nobel Prize in Chemistry" } } };
    else if (PROPS[id]) ents[id] = { datatype: PROPS[id].datatype, labels: { en: { value: PROPS[id].labels.en } }, aliases: { en: PROPS[id].aliases.en.map((v) => ({ value: v })) }, claims: PROPS[id].single ? { P2302: [{ mainsnak: { datavalue: { value: { id: "Q19474404" } } } }] } : {} };
  }
  return { entities: ents };
};
const entity = { qid: QID, label: "Marie Curie", enwiki: "Marie Curie" };
const check = (claim, anchorNames = ["Marie Curie"]) => checkByIdentity({ claim, anchorNames, entity, getJson: stub() });

test("FALSIFIER: the sentence's year against the entity's own dated statement: supported when it equals, contradicted when a single-valued property says otherwise", async () => {
  const ok = await check("Marie Curie was born in 1867.");
  assert.equal(ok.standing, "supported");
  assert.equal(ok.evidence.ref, "Q7186#P569");
  const bad = await check("Marie Curie was born in 1869.");
  assert.equal(bad.standing, "contradicted");
  assert.match(bad.why, /date of birth is .*1867.*not 1869/);
});

test("FALSIFIER: the SAME door answers a different relation with no code for it (death), and a place by item identity", async () => {
  assert.equal((await check("Marie Curie died in 1934.")).standing, "supported");
  assert.equal((await check("Marie Curie died in 1940.")).standing, "contradicted");
  assert.equal((await check("Marie Curie's death was in 1934.")).standing, "supported");
  assert.equal((await check("Marie Curie was born in Warsaw.")).evidence.ref, "Q7186#P19");
  assert.equal((await check("Marie Curie was born in Warsaw.")).standing, "supported");
  assert.equal((await check("Marie Curie was born in Berlin.")).standing, "contradicted");
});

test("FALSIFIER: a property that lists several values and not the sentence's is UNSUPPORTED with the list shown, never contradicted", async () => {
  const r = await check("Marie Curie won the Nobel Prize in Literature.");
  assert.equal(r.standing, "unsupported");
  assert.match(r.why, /Nobel Prize in Physics; Nobel Prize in Chemistry/);
  assert.equal((await check("Marie Curie won the Nobel Prize in Physics.")).standing, "supported");
  assert.notEqual((await check("Marie Curie won the Nobel Prize.")).standing, "supported", "the bare name inside a longer label is not the label");
});

test("FALSIFIER: a quantity matches at the sentence's own precision (8,849 against 8848.86), and a different number differs", async () => {
  const a = { ...entity, label: "Marie Curie" };
  const ok = await checkByIdentity({ claim: "Marie Curie has an elevation of 8,849 metres.", anchorNames: ["Marie Curie"], entity: a, getJson: stub() });
  assert.equal(ok.standing, "supported");
  const bad = await checkByIdentity({ claim: "Marie Curie has an elevation of 9,000 metres.", anchorNames: ["Marie Curie"], entity: a, getJson: stub() });
  assert.notEqual(bad.standing, "supported", "a different number is not supported");
});

test("FALSIFIER: a relation no key of the kind names is a TYPED refusal, never a guess (the verb with no noun label)", async () => {
  const r = await check("Marie Curie loved poetry in 1900.");
  assert.equal(r.standing, undefined);
  assert.equal(r.gap, "no_matching_key");
  assert.match(r.detail, /no key of Marie Curie's kind is named by/);
  assert.equal((await check("Marie Curie passed away in 1934.")).gap, "no_matching_key");
});

test("the filler and the relation words are read off the sentence without the anchor's own words", async () => {
  const f = fillerOf("Albert Einstein was born in Ulm in 1879.", ["Albert Einstein"]);
  assert.deepEqual(f.years, [1879]);
  assert.deepEqual(f.names, ["Ulm"]);
  assert.equal(f.admits, "date");
  assert.deepEqual(await relationWordsOf("Albert Einstein was born in Ulm in 1879.", ["Albert Einstein"], f), ["born"]);
  assert.equal(fillerOf("The Eiffel Tower has a height of 330 metres.", ["Eiffel Tower"]).admits, "count");
});
