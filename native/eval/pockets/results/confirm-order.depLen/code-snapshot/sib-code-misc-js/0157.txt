// mouth/server.test.mjs — penelope is MOUNTABLE: createPenelopeHandlers(opts)
// obeys the Fold's handler contract, startMouth is a thin standalone wrapper,
// and the draw door's in-process seam is the HTTP path minus the hop.
// Ephemeral ports only; the bridge is a fake channel.

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "penelope-fold-"));
process.env.PENELOPE_RECORD_FILE = path.join(tmp, "swatch.jsonl");

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const shut = (server) => new Promise((resolve) => { server.close(() => resolve()); server.closeAllConnections?.(); });

// The door reads PENELOPE_MOUTH_URL at load: pin it to a port we own BEFORE importing.
const MOUTH_PORT_PINNED = await freePort();
process.env.PENELOPE_MOUTH_URL = `http://127.0.0.1:${MOUTH_PORT_PINNED}`;
const { createPenelopeHandlers, startMouth } = await import("./server.mjs");
const { runDrawDoor, setMouthTransport } = await import("../organs/generation-door.mjs");
const { HOUSE } = await import("../organs/mouth.mjs");

// A fake bridge (Heimdall's channel): records what it was asked, answers ollama-shaped.
async function fakeChannel(handler = null) {
  const seen = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
      seen.push({ url: req.url, headers: req.headers, body });
      if (handler) return handler(req, res, body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ model: body.model, response: `echo:${body.prompt ?? ""}`, prompt_eval_count: 3, eval_count: 5 }));
    });
  });
  const port = await listen(server);
  return { url: `http://127.0.0.1:${port}`, seen, close: () => shut(server) };
}

// Serve a handlers object the way the Fold's composition root would.
async function serve(h) {
  const server = http.createServer(async (req, res) => {
    if (await h.handle(req, res)) return;
    res.writeHead(404, { "content-type": "application/json" });
    res.end('{"error":"caller-default-deny"}');
  });
  const port = await listen(server);
  return { base: `http://127.0.0.1:${port}`, close: () => shut(server) };
}

const post = (url, body, headers = {}) => fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const fakeReq = (method, url) => ({ method, url, headers: {}, on() {} });
const spyRes = () => { const r = { calls: 0, writeHead() { r.calls += 1; }, write() { r.calls += 1; }, end() { r.calls += 1; }, headersSent: false }; return r; };

test("handle returns false for foreign paths and writes nothing", async () => {
  const h = createPenelopeHandlers({ channel: "http://127.0.0.1:1" });
  for (const [m, u] of [["GET", "/heimdall/peers"], ["POST", "/v1/messages"], ["GET", "/v1/draw"], ["GET", "/api/weave"], ["POST", "/v1/mouth/nope"], ["GET", "/"], ["DELETE", "/v1/draw"], ["POST", "/api/chat"], ["POST", "/api/generate"]]) {
    const res = spyRes();
    assert.equal(await h.handle(fakeReq(m, u), res), false, `${m} ${u} must not be consumed`);
    assert.equal(res.calls, 0, `${m} ${u} must not be written to`);
  }
  await h.close();
});

test("GET /v1/mouth/status is served by handle", async () => {
  const h = createPenelopeHandlers({ channel: "http://bridge.test:9/", port: 4242 });
  const s = await serve(h);
  const r = await fetch(`${s.base}/v1/mouth/status`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-mouth"), "Mouth@1");
  const j = await r.json();
  assert.equal(j.schema, "Mouth@1");
  assert.equal(j.bridge, "http://bridge.test:9");
  assert.equal(j.port, 4242);
  assert.deepEqual(j.house, HOUSE);
  assert.ok(j.lanes.includes("chat"));
  assert.equal((await fetch(`${s.base}/v1/draw`)).status, 404, "GET /v1/draw falls through to the caller's default-deny");
  await s.close(); await h.close();
});

test("admission: 429 shape (error, retryAfterMs, retry-after header) is preserved on admit and draw", async () => {
  const drawLog = new Map([["hog", Array.from({ length: HOUSE.ration }, () => ({ ts: Date.now(), kind: "chat" }))]]);
  const h = createPenelopeHandlers({ channel: "http://127.0.0.1:1", drawLog });
  const s = await serve(h);
  for (const [u, body] of [["/v1/mouth/admit", {}], ["/v1/draw", { prompt: "hi" }]]) {
    const r = await post(s.base + u, body, { "x-er7-caller": "hog" });
    assert.equal(r.status, 429, u);
    const j = await r.json();
    assert.match(j.error, /drew its ration/);
    assert.ok(j.retryAfterMs >= 1000);
    assert.equal(Number(r.headers.get("retry-after")), Math.ceil(j.retryAfterMs / 1000));
  }
  const ok = await post(`${s.base}/v1/mouth/admit`, {}, { "x-er7-caller": "polite" });
  assert.deepEqual(await ok.json(), { ok: true, mouth: "Mouth@1" });
  await s.close(); await h.close();
});

test("drawLog is per instance, not a module singleton", async () => {
  const ch = await fakeChannel();
  const a = createPenelopeHandlers({ channel: ch.url, wireRoutes: true });
  const b = createPenelopeHandlers({ channel: ch.url, wireRoutes: true });
  const sa = await serve(a);
  await post(`${sa.base}/api/generate`, { prompt: "x" }, { "x-er7-caller": "who" });
  assert.equal(a.drawLog.get("who").length, 1);
  assert.equal(b.drawLog.get("who"), undefined);
  await sa.close(); await a.close(); await b.close(); await ch.close();
});

test("wire routes are off by default, opt-in with wireRoutes, and ON in startMouth", async () => {
  const ch = await fakeChannel();
  const off = createPenelopeHandlers({ channel: ch.url });
  const on = createPenelopeHandlers({ channel: ch.url, wireRoutes: true });
  for (const p of ["/api/chat", "/api/generate", "/api/embed", "/api/embeddings", "/v1/chat/completions", "/v1/embeddings"]) {
    const res = spyRes();
    assert.equal(await off.handle(fakeReq("POST", p), res), false, `${p} must not be claimed by default`);
    assert.equal(res.calls, 0);
  }
  const son = await serve(on);
  const r = await post(`${son.base}/api/generate`, { model: "er7:gemma2:2b", prompt: "hello" });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).response, "echo:hello", "wire route is a drop-in: bridge payload verbatim");
  assert.equal(ch.seen[0].url, "/api/generate");
  assert.equal(ch.seen[0].body.model, "gemma2:2b", "er7: prefix stripped for the bridge");
  await son.close(); await on.close(); await off.close();

  const std = startMouth({ port: 0, channel: ch.url });
  await new Promise((r2) => std.once("listening", r2));
  const base = `http://127.0.0.1:${std.address().port}`;
  assert.equal((await post(`${base}/api/chat`, { messages: [{ role: "user", content: "q" }] })).status, 200, "startMouth serves wire aliases");
  const nf = await fetch(`${base}/nope`);
  assert.equal(nf.status, 404);
  assert.equal((await nf.json()).error, "default-deny");
  assert.equal((await post(`${base}/v1/mouth/nope`, {})).status, 404);
  assert.equal((await fetch(`${base}/v1/mouth/status`)).status, 200);
  await shut(std); await ch.close();
});

test("a thrown error becomes a JSON error for that request only", async () => {
  const ch = await fakeChannel((req, res) => { res.writeHead(500); res.end("boom"); });
  const h = createPenelopeHandlers({ channel: ch.url, wireRoutes: true });
  const s = await serve(h);
  const bad = await post(`${s.base}/v1/draw`, { prompt: "p" });
  assert.equal(bad.status, 500);
  assert.deepEqual(await bad.json(), { error: "ER7_BRIDGE_ERROR" });
  const dead = createPenelopeHandlers({ channel: `http://127.0.0.1:${await freePort()}` });
  const sd = await serve(dead);
  const down = await post(`${sd.base}/v1/draw`, { prompt: "p" });
  assert.equal(down.status, 502);
  assert.ok(typeof (await down.json()).error === "string");
  assert.equal((await fetch(`${s.base}/v1/mouth/status`)).status, 200, "the handler is still alive for the next request");
  const raw = await fetch(`${s.base}/v1/draw`, { method: "POST", body: "{not json" });
  assert.equal(raw.status, 400);
  assert.deepEqual(await raw.json(), { error: "bad json" });
  await s.close(); await sd.close(); await h.close(); await dead.close(); await ch.close();
});

test("/api/weave is owned and a weave that throws is a Weaving error, not a crash", async () => {
  const h = createPenelopeHandlers({ weave: async (r) => { if (r.intent === "boom") throw new Error("kaboom"); return { schema: "Weaving@1", ok: true, echo: r.intent }; } });
  const s = await serve(h);
  const good = await post(`${s.base}/api/weave`, { intent: "ok" });
  assert.equal(good.status, 200);
  assert.equal((await good.json()).echo, "ok");
  const bad = await post(`${s.base}/api/weave`, { intent: "boom" });
  assert.equal(bad.status, 422);
  assert.match((await bad.json()).error, /kaboom/);
  await s.close(); await h.close();
});

test("a plain import is inert: no listener, no output, the process exits by itself", () => {
  const r = spawnSync(process.execPath, ["-e", `import(${JSON.stringify(path.join(HERE, "server.mjs"))}).then((m) => console.log(typeof m.createPenelopeHandlers, typeof m.startMouth))`], {
    encoding: "utf8", timeout: 15000, env: { ...process.env, PENELOPE_MOUTH_PORT: String(MOUTH_PORT_PINNED) },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "function function", "nothing printed by a mouth that never started");
});

test("the in-process draw seam yields the same result as the HTTP path", async () => {
  const ch = await fakeChannel();
  // HTTP leg: the standalone mouth on the port the door was pinned to; the door's DEFAULT transport.
  const std = startMouth({ port: MOUTH_PORT_PINNED, channel: ch.url });
  await new Promise((r) => std.once("listening", r));
  const viaHttp = await runDrawDoor({ prompt: "weave this", kind: "probe", maxTokens: 12 });
  const httpSeen = ch.seen.length;
  await shut(std);
  // In-process leg: no listener at all on the mouth port; the door calls the mouth function directly.
  const mounted = createPenelopeHandlers({ channel: ch.url, drawViaMouth: true });
  const viaProc = await runDrawDoor({ prompt: "weave this", kind: "probe", maxTokens: 12 });
  assert.equal(ch.seen.length, httpSeen + 1, "exactly one bridge call on the in-process path");
  assert.equal(viaHttp.ok, true);
  const strip = ({ ms, ...rest }) => rest;
  assert.deepEqual(strip(viaProc), strip(viaHttp));
  assert.equal(viaProc.text, "echo:weave this");
  assert.deepEqual(ch.seen.at(-1).body, ch.seen[0].body, "identical forwarded body");
  for (const k of ["x-er7-caller", "x-er7-kind", "x-er7-priority"]) assert.equal(ch.seen.at(-1).headers[k], ch.seen[0].headers[k], k);
  assert.equal(mounted.drawLog.get("penelope-gym").length, 1, "the in-process draw is rationed against the same identity");
  // identical admission semantics: a full ration is the same typed 429 on both paths.
  const hog = () => new Map([["penelope-gym", Array.from({ length: HOUSE.ration }, () => ({ ts: Date.now(), kind: "probe" }))]]);
  const p = createPenelopeHandlers({ channel: ch.url, drawLog: hog() });
  const t = await p.transport({ path: "/api/generate", headers: { "x-er7-caller": "penelope-gym" }, body: { prompt: "x" } });
  const std2 = startMouth({ port: 0, channel: ch.url, drawLog: hog() });
  await new Promise((r) => std2.once("listening", r));
  const h = await post(`http://127.0.0.1:${std2.address().port}/api/generate`, { prompt: "x" }, { "x-er7-caller": "penelope-gym" });
  assert.equal(t.status, 429);
  assert.equal(t.status, h.status);
  const [tj, hj] = [await t.json(), await h.json()];
  assert.equal(tj.error, hj.error);
  assert.ok(Math.abs(tj.retryAfterMs - hj.retryAfterMs) < 5000, "same wait, up to clock drift between the two calls");
  assert.ok(Math.abs(Number(t.headers.get("retry-after")) - Number(h.headers.get("retry-after"))) <= 5);
  // close() restores the HTTP default: the dead mouth port now refuses.
  await mounted.close();
  const after = await runDrawDoor({ prompt: "x", kind: "probe", transport: () => Promise.reject(new Error("seam used")) }).catch((e) => e.message);
  assert.equal(after, "seam used", "an explicit per-call transport still wins");
  await shut(std2); await p.close(); await ch.close();
});

test("setMouthTransport installs and restores; PENELOPE_RECORD_FILE receives the swatch rows", async () => {
  const calls = [];
  const restore = setMouthTransport(async (req) => { calls.push(req); return new Response(JSON.stringify({ response: "seam", model: "gemma2:2b" }), { status: 200 }); });
  const out = await runDrawDoor({ prompt: "q", kind: "probe" });
  restore();
  assert.equal(out.text, "seam");
  assert.equal(calls[0].path, "/api/generate");
  assert.equal(calls[0].headers["x-er7-caller"], "penelope-gym");
  const rows = fs.readFileSync(process.env.PENELOPE_RECORD_FILE, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(rows.some((r) => r.weave === "draw:probe" && r.verdict === "mouth"));
});
