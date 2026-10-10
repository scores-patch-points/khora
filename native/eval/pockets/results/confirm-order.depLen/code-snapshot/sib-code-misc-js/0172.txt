import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createPenelopeHandlers } from "./handlers.mjs";

async function withServer(handlers, fn) {
  const server = createServer((req, res) => handlers.handle(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try { await fn(`http://127.0.0.1:${port}`); } finally { await new Promise((resolve) => server.close(resolve)); }
}

const post = async (base, path, body) => {
  const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
};

test("the door answers a purpose through penelope's conduct and says the gate decided", async () => {
  const handlers = await createPenelopeHandlers({ run: async (p) => ({ ok: true, status: "verified", artifact: { value: "x" }, evidence: { verdict: { ok: true, reason: "spec-conformance" } } }) });
  await withServer(handlers, async (base) => {
    const r = await post(base, "/v1/agenda/conduct", { purpose: { id: "v", op: "INS", grain: "Figure", about: "the artifact", detail: "absent" } });
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.match(r.json.rule, /spec-conformance/);
  });
});

test("FALSIFY: a conduct that throws is a held void, never a crash", async () => {
  const handlers = await createPenelopeHandlers({ run: async () => { throw new Error("executor exploded"); } });
  await withServer(handlers, async (base) => {
    const r = await post(base, "/v1/agenda/conduct", { purpose: { id: "v", about: "x" } });
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, false);
    assert.match(r.json.detail, /executor exploded/);
  });
});

test("unparseable purpose is a typed 400; wrong method is 405; anything else falls through", async () => {
  const handlers = await createPenelopeHandlers({ run: async () => ({ ok: true }) });
  await withServer(handlers, async (base) => {
    const bad = await fetch(base + "/v1/agenda/conduct", { method: "POST", body: "not json" });
    assert.equal(bad.status, 400);
    const wrong = await fetch(base + "/v1/agenda/conduct", { method: "GET" });
    assert.equal(wrong.status, 405);
  });
  // the fall-through is a handle() contract, checked directly, not over a server
  const res = { writeHead() {}, end() {} };
  assert.equal(await handlers.handle({ url: "http://x/not-ours", method: "GET" }, res), false);
  assert.equal(await handlers.handle({ url: "http://x/health", method: "GET" }, res), false);
});

test("the door OPTIONS-answers so a cross-origin ladder can discover it", async () => {
  const handlers = await createPenelopeHandlers({ run: async () => ({ ok: true }) });
  await withServer(handlers, async (base) => {
    const r = await fetch(base + "/v1/agenda/conduct", { method: "OPTIONS" });
    assert.equal(r.status, 204);
  });
});