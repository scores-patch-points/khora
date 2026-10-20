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
