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
