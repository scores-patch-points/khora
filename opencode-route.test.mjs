import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { routeOf } from "./opencode-route.mjs";

test("ROUTER: an essay about a world topic is an account that needs research", async () => {
  const r = await routeOf("write me an essay about dolphins");
  assert.equal(r.kind, "account");
  assert.equal(r.research, true);
});
test("ROUTER: a polite request is routed by its verb, not taken for a question about the model", async () => {
  assert.equal((await routeOf("can you explain how photosynthesis works?")).kind, "account");
  assert.equal((await routeOf("do you know who invented the telephone?")).kind, "account");
});
test("ROUTER: invented work, the model's own view, code and a followup need no research", async () => {
  assert.equal((await routeOf("write a poem about autumn")).research, false);
  assert.equal((await routeOf("what do you think about modern art?")).kind, "chat");
  assert.equal((await routeOf("fix the failing test in auth.test.ts")).kind, "work");
  assert.equal((await routeOf("make it shorter", { history: [{ role: "assistant", text: "…" }] })).kind, "followup");
});
test("ROUTER: an empty ask is a typed gap, never a guess", async () => {
  assert.equal((await routeOf("  ")).gap, "empty-ask");
});
test("ROUTER: the source holds no regular expression", () => {
  const src = fs.readFileSync(new URL("./opencode-route.mjs", import.meta.url), "utf8");
  assert.ok(!src.includes("RegExp") && !src.includes(".test(") && !src.includes(".match("));
  // a regex literal after = ( , : ! & | ? starts with / and is not //
  for (const line of src.split("\n")) {
    const code = line.split("//")[0];
    for (const lead of ["= /", "( /", ", /", ": /", "! /", "&& /", "|| /", "? /", "=/", "(/"]) assert.ok(!code.includes(lead) || code.includes('"') || code.includes("'") || code.includes("`"), `a regex literal in: ${line}`);
  }
});

test("ROUTER: the same intent routes the same in other languages (a dictionary of kinds, not an English lexicon)", async () => {
  assert.equal((await routeOf("escríbeme un ensayo sobre los delfines")).kind, "account");
  assert.equal((await routeOf("给我写一篇关于海豚的文章")).research, true);
  assert.equal((await routeOf("напиши стихотворение об осени")).kind, "creative");
  assert.equal((await routeOf("bonsoir !")).kind, "chat");
  assert.equal((await routeOf("17乘以23等于多少？")).kind, "mechanical");
  assert.equal((await routeOf("リスボン行きの安い航空券を探して")).kind, "search");
  assert.equal((await routeOf("اكتب لي مقالا عن الدلافين")).kind, "account");
});
test("ROUTER: an ask in a language the dictionary does not cover is a typed gap, never a guess", async () => {
  const r = await routeOf("Skriv en uppsats om delfiner");
  assert.ok(r.gap || r.kind, "returns something typed");
  if (r.gap) assert.ok(r.detail.length > 0);
});

test("ROUTER: a research ask carries its topic, the request's frame taken out, in each language", async () => {
  const want = { "write me an essay about dolphins": "dolphins", "escríbeme un ensayo sobre los delfines": "delfines", "écris-moi un essai sur les dauphins": "dauphins", "给我写一篇关于海豚的文章": "海豚", "イルカについてのエッセイを書いて": "イルカ" };
  for (const [ask, topic] of Object.entries(want)) {
    const r = await routeOf(ask);
    assert.equal(r.research, true);
    assert.ok(r.topic.includes(topic), `${ask} -> ${r.topic}`);
    assert.ok(!r.topic.toLowerCase().includes("essay") && !r.topic.includes("ensayo") && !r.topic.includes("essai"), `${ask} -> ${r.topic}`);
  }
  assert.equal((await routeOf("write a poem about autumn")).topic, undefined);   // no research, no topic
});

test("the gather session's misses: codebase searches are work, 'tell me about' is an account, a sort over numbers is computed, a freshness or ranking word makes a topic a search", async () => {
  const kind = async (ask) => (await routeOf(ask)).kind;
  assert.equal(await kind("search the codebase for TODO comments"), "work");
  assert.equal(await kind("add a README to this project"), "work");
  assert.equal(await kind("tell me about the French Revolution"), "account");
  assert.equal(await kind("sort these numbers: 5 3 9 1"), "mechanical");
  assert.equal(await kind("latest news about SpaceX"), "search");
  assert.equal(await kind("best laptops of 2026"), "search");
  assert.equal(await kind("weather in Chicago today"), "search");
  assert.match((await routeOf("what is the weather in Chicago today")).topic, /weather/, "the predicate stays in the topic of a search");
  assert.equal(await kind("ما هي عاصمة أستراليا"), "account");
  assert.equal(await kind("écris une histoire sur un dragon"), "creative");
  assert.equal(await kind("raconte moi l histoire de France"), "account");
});

test("'tell me about X' is an account in every covered language; 'tell me a story' stays creative", async () => {
  for (const ask of ["háblame de los delfines", "parle-moi des dauphins", "erzähl mir von Delfinen", "расскажи про дельфинов", "给我讲讲海豚", "イルカについて教えて", "حدثني عن الدلافين"]) assert.equal((await routeOf(ask)).kind, "account", ask);
  assert.equal((await routeOf("raconte moi une histoire de dragon")).kind, "creative");
  assert.equal((await routeOf("dis moi une blague")).kind, "creative");
});

test("the topic keeps what the question asks about: the attribute noun and the predicate verb survive a mis-tagged parse", async () => {
  const topic = async (ask) => (await routeOf(ask)).topic;
  assert.match(await topic("what height do commerical airlines fly at?"), /height/, "the asked-about attribute");
  assert.match(await topic("what height do commerical airlines fly at?"), /fly/, "the predicate");
  assert.match(await topic("how does photosynthesis work"), /photosynthesis/, "a word the prior has never seen is not dropped as a verb");
  assert.match(await topic("what do dolphins eat"), /dolphins/);
  assert.equal((await routeOf("who invented the telephone")).kind, "account", "a sentence-initial who is a question, not the verb 'invent' asked of the model");
  assert.equal((await routeOf("invent a name for my cat")).kind, "creative");
});

// THE ISTHMUS: a mechanical verdict no organ settled is typed, never presented as computed (native/docs/THE-ISTHMUS.md).
test("Isthmus: a mechanical verdict says whether an organ settled it", async () => {
  const en = await routeOf("What is 17 times 24?");
  assert.equal(en.kind, "mechanical");
  assert.equal(en.settled, true);
  const es = await routeOf("¿Cuánto es 17 por 24?");
  assert.equal(es.kind, "mechanical");
  assert.equal(es.settled, false, "FALSIFIER: Spanish operator words presented as settled");
  assert.equal(es.gap, "no_codec");
  const notation = await routeOf("¿Cuánto es 17 × 24?");
  assert.equal(notation.kind, "mechanical", "FALSIFIER: a notation span in a Spanish sentence was routed away from computation");
  assert.equal(notation.settled, true);
});
