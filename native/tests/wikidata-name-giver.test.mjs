import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { makeWikidataNameGiver, genderPriorFromGiver, nonPersonalFromGiver, capitalisedWords, Q } from "../adapters/text/wikidata-name-giver.js";
const FAKE = { mary: [{ id: "Q1", label: "Mary", p31: [Q.female] }, { id: "Q2", label: "Mary", p31: [Q.human] }], tianjin: [{ id: "Q3", label: "Tianjin", p31: ["Q1"] }], john: [{ id: "Q4", label: "John", p31: [Q.male] }], quinn: [{ id: "Q5", label: "Quinn", p31: [Q.male] }, { id: "Q6", label: "Quinn", p31: [Q.female] }] };
const fetchFake = (calls) => async (url) => { calls.push(url); const u = new URL(url); const p = u.searchParams; return { ok: true, json: async () => p.get("action") === "wbsearchentities" ? { search: (FAKE[p.get("search").toLowerCase()] ?? []).map((e) => ({ id: e.id, label: e.label })) } : { entities: Object.fromEntries(Object.values(FAKE).flat().map((e) => [e.id, { claims: { P31: e.p31.map((id) => ({ mainsnak: { datavalue: { value: { id } } } })) } }])) } }; };
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wd-")), "c.jsonl");
test("one search and one claims call per unseen word, a cache that replays offline, and no text sent", async () => {
  const f = tmp(); const calls = []; const g = makeWikidataNameGiver({ cacheFile: f, fetchImpl: fetchFake(calls), rps: 1000 }); await g.ask(["Mary", "John", "Mary"]); assert.equal(calls.length, 4); assert.equal(g.size, 2);
  const calls2 = []; const g2 = makeWikidataNameGiver({ cacheFile: f, fetchImpl: fetchFake(calls2), rps: 1000 }); await g2.ask(["Mary", "John"]); assert.equal(calls2.length, 0, "the cache answers"); assert.ok(g2.get("Mary").exact.length === 2);
  assert.ok(calls.every((u) => !/room|letter/.test(u)));
});
test("gender: a categorical given-name attestation; unisex or both genders say nothing", async () => {
  const g = makeWikidataNameGiver({ cacheFile: tmp(), fetchImpl: fetchFake([]), rps: 1000 }); await g.ask(["Mary", "John", "Quinn"]);
  const text = "Mary John Quinn"; const cast = [{ ref: "m", mentionSpans: [[0, 4]] }, { ref: "j", mentionSpans: [[5, 9]] }, { ref: "q", mentionSpans: [[10, 15]] }];
  const p = genderPriorFromGiver({ text, cast, giver: g }); assert.equal(p.get("m"), "f"); assert.equal(p.get("j"), "m"); assert.ok(!p.has("q"), "Quinn is both: unknown");
});
test("kind: a being with an answered word and no person reading is non-personal; a person reading anywhere keeps it", async () => {
  const g = makeWikidataNameGiver({ cacheFile: tmp(), fetchImpl: fetchFake([]), rps: 1000 }); await g.ask(["Mary", "Tianjin", "Zzzz"]);
  const text = "Tianjin Mary Zzzz Tianjin Mary"; const cast = [{ ref: "city", mentionSpans: [[0, 7]] }, { ref: "mary", mentionSpans: [[8, 12]] }, { ref: "unk", mentionSpans: [[13, 17]] }];
  const np = nonPersonalFromGiver({ text, cast, giver: g }); assert.ok(np.has("city")); assert.ok(!np.has("mary")); assert.ok(!np.has("unk"), "a word the giver has no answer for rules nothing"); assert.deepEqual(capitalisedWords(text, cast).sort(), ["Mary", "Tianjin", "Zzzz"]);
});
