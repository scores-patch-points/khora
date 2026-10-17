import test from "node:test";
import assert from "node:assert/strict";
import { answer, route } from "./opencode-doorway.mjs";

test("the doorway exposes the dream: answer({event:'dream'}) returns the settled view", async () => {
  const r = await answer({ event: "dream", task: "no-such-task-xyz" });
  assert.equal(r.schema, "OpenCodeDream@1");
  assert.deepEqual(r.settled.contests, []);
  assert.deepEqual(r.settled.candidates, []);
});

test("the dream event is advertised in the doorway's own event list", async () => {
  let payload = "";
  const req = { method: "GET", url: "/v1/hooks/opencode" };
  const res = { writeHead() {}, end(s) { payload = s; } };
  const handled = await route(req, res, { log: () => {} });
  assert.equal(handled, true);
  assert.ok(JSON.parse(payload).events.includes("dream"), "the door lists the dream event");
});
