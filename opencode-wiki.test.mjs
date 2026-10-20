// opencode-wiki.test.mjs — the Wikimedia gate's entity store: an entity is fetched once, ever.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_RESEARCH_CACHE = fs.mkdtempSync(path.join(os.tmpdir(), "fold-wiki-test-"));
process.env.FOLD_WIKI_GAP_MS = "0";
const { makeGetJson, seedEntities, entityStats } = await import("./opencode-wiki.mjs");

const calls = [];
const fetchImpl = async (url) => {
  calls.push(url);
  const a = new URL(url).searchParams;
  const entities = Object.fromEntries((a.get("ids") ?? "").split("|").map((id) => [id, { id, labels: { en: { value: `label of ${id}` } }, aliases: { en: [{ value: `alias of ${id}` }] }, datatype: "time", claims: {} }]));
  return { ok: true, status: 200, json: async () => ({ entities }) };
};
const ask = (ids, props = "labels|aliases|datatype") => `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${ids.join("|")}&props=${props}&languages=en`;

test("FALSIFIER: an id is fetched once; the second ask for the same ids, or a subset of what was held, makes no request", async () => {
  const get = makeGetJson({ fetchImpl });
  const first = await get(ask(["P569", "P570", "P19"]));
  assert.equal(Object.keys(first.entities).length, 3);
  assert.equal(calls.length, 1);
  await get(ask(["P569", "P570"]));
  await get(ask(["P19"], "labels"));
  assert.equal(calls.length, 1, "the held ids were served from the store (a subset of the props held)");
});

test("FALSIFIER: a mixed ask fetches ONLY the ids not held, in one batch", async () => {
  const get = makeGetJson({ fetchImpl });
  const before = calls.length;
  const r = await get(ask(["P569", "P1619", "P2044"]));
  assert.equal(calls.length, before + 1);
  assert.equal(new URL(calls.at(-1)).searchParams.get("ids"), "P1619|P2044", "P569 was held");
  assert.deepEqual(Object.keys(r.entities).sort(), ["P1619", "P2044", "P569"]);
});

test("FALSIFIER: props not yet held are fetched even for a held id (a record keeps which props it has)", async () => {
  const get = makeGetJson({ fetchImpl });
  const before = calls.length;
  await get(ask(["P569"], "claims"));
  assert.equal(calls.length, before + 1, "labels were held, claims were not");
});

test("a response seeded from another request is served with no request, and a known item's pageprops needs none", async () => {
  seedEntities({ entities: { Q7186: { id: "Q7186", labels: { en: { value: "Marie Curie" } }, claims: { P569: [] } } } }, ["labels", "claims"], ["en", "mul"]);
  const get = makeGetJson({ fetchImpl, known: { pageprops: { "Marie Curie": "Q7186" } } });
  const before = calls.length;
  const e = await get(ask(["Q7186"], "claims|labels"));
  assert.equal(e.entities.Q7186.labels.en.value, "Marie Curie");
  const pp = await get("https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&titles=Marie%20Curie&redirects=1&format=json");
  assert.equal(Object.values(pp.query.pages)[0].pageprops.wikibase_item, "Q7186");
  assert.equal(calls.length, before, "neither needed a request");
  assert.ok(entityStats.served >= 5);
});
