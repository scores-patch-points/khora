import { test } from "node:test";
import assert from "node:assert/strict";
import { createDirectBridge } from "./direct-bridge.mjs";

// The claim: the fold's model lane runs with NO heimdall, and the `tools` field —
// which heimdall's frontier lane dropped — reaches the upstream untouched.

// A fake model door: records what it received, answers OpenAI-shaped.
function fakeUpstream() {
  const seen = [];
  const server = (async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    seen.push({ url: String(url), body });
    if (String(url).endsWith("/v1/models")) {
      return new Response(JSON.stringify({ object: "list", data: [{ id: "qwen2.5-coder:1.5b" }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).endsWith("/v1/chat/completions")) {
      return new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "PONG" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("no", { status: 404 });
  });
  return { seen, fetchImpl: server };
}

test("hello names the bridge and its upstream", async () => {
  const fake = fakeUpstream();
  const b = createDirectBridge({ upstream: "http://fake:1", port: 0, fetchImpl: fake.fetchImpl });
  await b.listen();
  const addr = b.server.address();
  const r = await (await fetch(`http://127.0.0.1:${addr.port}/bridge/hello`)).json();
  assert.equal(r.bridge, true);
  assert.equal(r.schema, "DirectBridge@1");
  await b.close();
});

test("api/tags is the upstream's models in the fold's shape", async () => {
  const fake = fakeUpstream();
  const b = createDirectBridge({ upstream: "http://fake:1", port: 0, fetchImpl: fake.fetchImpl });
  await b.listen();
  const { port } = b.server.address();
  const r = await (await fetch(`http://127.0.0.1:${port}/api/tags`)).json();
  assert.deepEqual(r.models.map((m) => m.name), ["qwen2.5-coder:1.5b"]);
  await b.close();
});

test("chat forwards verbatim, drops heimdall_privacy, and passes tools THROUGH", async () => {
  const fake = fakeUpstream();
  const b = createDirectBridge({ upstream: "http://fake:1", port: 0, fetchImpl: fake.fetchImpl });
  await b.listen();
  const { port } = b.server.address();
  const tools = [{ type: "function", function: { name: "run_shell", parameters: { type: "object" } } }];
  const r = await (await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "qwen2.5-coder:1.5b", messages: [{ role: "user", content: "hi" }], tools, heimdall_privacy: "sealed-external" }),
  })).json();
  assert.equal(r.choices[0].message.content, "PONG");
  const sent = fake.seen.find((s) => s.url.endsWith("/v1/chat/completions")).body;
  assert.deepEqual(sent.tools, tools, "tools must reach the model door");
  assert.equal("heimdall_privacy" in sent, false, "the bouncer's label must be dropped");
  await b.close();
});
