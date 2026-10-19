// direct-bridge.mjs — the fold's model lane with NO heimdall.
//
// The fold page talks OpenAI-compatible to one URL. Heimdall was that URL: a router,
// a privacy gate, a ration, a fleet directory — and, on the frontier lane, a bouncer
// that dropped the `tools` field. For a single box running local models this is a hop
// that blocks the tool path and buys nothing. This serves the same wire straight from
// the model door (ollama by default): no router, no gate, no ration — and `tools` pass
// through untouched.
//
//   node native/the-fold/direct-bridge.mjs [port]
//
//   port      default 8791 (or DIRECT_BRIDGE_PORT)
//   upstream  default http://127.0.0.1:11435 (or DIRECT_BRIDGE_UPSTREAM) — any
//             OpenAI-compatible base: ollama, llama.cpp, vLLM, LM Studio, a frontier
//             proxy. `heimdall_privacy` is dropped here; the upstream never sees it.
//
// Routes:
//   GET  /bridge/hello          { bridge: true, schema: "DirectBridge@1" }
//   GET  /api/tags              the upstream's models, in the fold's tag shape
//   POST /v1/chat/completions   forwarded verbatim (streaming), tools intact
//
// What you give up versus heimdall: the seal (re-add a check at this edge before
// sending raw workspace bytes to a frontier), the fleet, the audit ledger, the ration.
// What you gain: the model lane works, and tools reach the model.

import http from "node:http";

export const DIRECT_BRIDGE_SCHEMA = "DirectBridge@1";
export const DEFAULT_PORT = 8791;
export const DEFAULT_UPSTREAM = "http://127.0.0.1:11435";

const readBody = (req) => new Promise((ok) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => ok(d)); req.on("error", () => ok("")); });
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" };
const sendJson = (res, code, o) => { res.writeHead(code, { "content-type": "application/json", ...cors }); res.end(JSON.stringify(o)); };

/**
 * createDirectBridge({ upstream, port, fetchImpl }) — the bridge as a value, so a
 * test can stand it up on port 0 with a fake upstream.
 */
export function createDirectBridge({ upstream = DEFAULT_UPSTREAM, port = DEFAULT_PORT, fetchImpl = fetch } = {}) {
  const base = String(upstream).replace(/\/+$/, "");
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }

    if (req.method === "GET" && url.pathname === "/bridge/hello")
      return sendJson(res, 200, { bridge: true, schema: DIRECT_BRIDGE_SCHEMA, note: "no heimdall", upstream: base });

    if (req.method === "GET" && url.pathname === "/api/tags") {
      try {
        const j = await (await fetchImpl(`${base}/v1/models`)).json();
        const models = (j.data ?? j.models ?? []).map((m) => ({ name: m.id ?? m.name, model: m.id ?? m.name, heimdall: { local: true } }));
        return sendJson(res, 200, { models });
      } catch (e) { return sendJson(res, 502, { error: String(e?.message || e) }); }
    }

    if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
      let body;
      try { body = JSON.parse((await readBody(req)) || "{}"); } catch { return sendJson(res, 400, { error: "malformed JSON body" }); }
      delete body.heimdall_privacy; // the bouncer's label — dropped; there is no gate here
      let up;
      try {
        up = await fetchImpl(`${base}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      } catch (e) { return sendJson(res, 502, { error: "upstream unreachable: " + String(e?.message || e) }); }
      res.writeHead(up.status, { "content-type": up.headers.get("content-type") || "text/event-stream", ...cors });
      if (up.body) { for await (const chunk of up.body) res.write(chunk); }
      return res.end();
    }

    sendJson(res, 404, { error: "no such route" });
  });
  return {
    schema: DIRECT_BRIDGE_SCHEMA,
    server,
    upstream: base,
    listen: () => new Promise((ok, err) => { server.once("error", err); server.listen(port, "127.0.0.1", () => ok(server.address())); }),
    close: () => new Promise((r) => server.close(() => r())),
  };
}

const isMain = (() => { try { return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href; } catch { return false; } })();
if (isMain) {
  const port = Number(process.argv[2] ?? process.env.DIRECT_BRIDGE_PORT ?? DEFAULT_PORT);
  const bridge = createDirectBridge({ upstream: process.env.DIRECT_BRIDGE_UPSTREAM ?? DEFAULT_UPSTREAM, port });
  await bridge.listen();
  console.log(`direct-bridge: :${port} -> ${bridge.upstream} (no heimdall)`);
}
