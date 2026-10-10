// mouth/server.mjs — the mouth as a server: the only door a draw enters.
//
// Every draw — penelope's own gym, eoreader7's native organs, and (next)
// the proxy doors — lands HERE first. The mouth applies its own admission
// (organs/mouth.mjs: ration per identity, typed 429/503 + Retry-After), picks
// the wire, then forwards to the BRIDGE (Heimdall's channel, 11434) which
// runs the AntiStrauss gate, the host picker and the upstream lanes. The
// mouth never draws itself; it decides and the bridge executes.
//
// Surfaces:
//   POST /v1/draw          — the mouth API (kind, model, prompt/messages)
//   POST /api/generate     — bridge wire (kind=probe, for native code draws)
//   POST /api/chat         — bridge wire (kind=chat)
//   POST /api/embed        — bridge wire (kind=embed, embeddings)
//   POST /v1/chat/completions, /v1/embeddings — wire aliases (default-deny body)
//   GET  /v1/mouth/status  — schema, house rules, lane availability
//   POST /api/weave        — THE GENERATION DOOR (2026-10-04): the fold's
//                            generate lane reaches penelope's generation here.
//                            The mouth decides draws; the weave orchestrates
//                            generation (read units → field/hunt → mouth →
//                            test → EOT). Both are penelope's — one server.
// Everything else: 404, never a silent pass.
//
// Identity rides headers (x-er7-user / x-er7-caller), the house rule; a
// bridge-wire caller that sends none is admitted as "eoreader7-native" —
// one place in line, never anonymous.

import http from "node:http";
import { admit, route, modelForWire, MOUTH_SCHEMA, HOUSE, KIND_WIRE } from "../organs/mouth.mjs";

export const MOUTH_PORT = Number(process.env.PENELOPE_MOUTH_PORT ?? 11439);
const CHANNEL = String(process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
const ID = { "x-er7-user": "penelope", "x-er7-caller": "penelope-mouth" };

const drawLog = new Map(); // identity -> [{ ts, kind }]
function logDraw(identity, kind) {
  const now = Date.now();
  const list = (drawLog.get(identity) ?? []).filter((d) => now - d.ts < HOUSE.windowMs);
  list.push({ ts: now, kind });
  drawLog.set(identity, list);
}

const ROUTE_BY_PATH = {
  "/api/generate": "probe",
  "/api/chat": "chat",
  "/v1/chat/completions": "chat",
  "/api/embed": "embed",
  "/api/embeddings": "embed",
  "/v1/embeddings": "embed",
};

function json(res, status, obj, extra = {}) {
  res.writeHead(status, { "content-type": "application/json", "x-mouth": MOUTH_SCHEMA, ...extra });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function identityFor(req) {
  return String(req.headers["x-er7-caller"] ?? req.headers["x-er7-user"] ?? "eoreader7-native");
}

const hopOf = (req) => Number(req.headers["x-heimdall-hop"] ?? 0);

/** Forward one draw to the bridge with bounded backoff; a typed refusal on
 *  exhaustion — never a silent stop, never a wedge (the house rule).
 *  Identity/kind/hop headers ride through: the caller's x-er7-* and any
 *  x-heimdall-hop stay hers, so the box's fair-share round robin and the
 *  hop mark are never lost between the mouth and the bridge. */
async function bridge(identity, { model, path, body, headers = {}, stream = false }) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), HOUSE.slaMs);
  try {
    const r = await fetch(`${CHANNEL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...ID, "x-er7-priority": body.priority ?? "batch", ...headers },
      body: JSON.stringify(body.forward),
      signal: ac.signal,
    });
    if (r.status === 429 || r.status === 503) {
      const wait = Math.min(HOUSE.retryBackoffMaxMs, (Number(r.headers.get("retry-after")) || 20) * 1000);
      throw Object.assign(new Error(`bridge-refused (${r.status})`), { code: "ER7_BRIDGE_BUSY", status: r.status, retryAfterMs: wait });
    }
    if (!r.ok) throw Object.assign(new Error(`bridge-http-${r.status}`), { code: "ER7_BRIDGE_ERROR", status: r.status });
    if (stream) return { ok: true, stream: r.body, headers: r.headers };
    const j = await r.json();
    logDraw(identity, body.kind);
    return { ok: true, raw: j, text: j.response ?? j.message?.content ?? j.choices?.[0]?.message?.content ?? j.text ?? null, embed: j.embeddings ?? null, usage: j.prompt_eval_count ?? j.usage ?? null, model };
  } finally {
    clearTimeout(t);
  }
}

const PASS_THROUGH_HEADERS = ["x-er7-user", "x-er7-caller", "x-er7-kind", "x-er7-priority", "x-heimdall-hop", "x-er7-session"];
function passHeaders(req) {
  const out = {};
  for (const h of PASS_THROUGH_HEADERS) if (req.headers[h]) out[h] = req.headers[h];
  return out;
}

const WIRE_BY_PATH = {
  "/api/generate": "/api/generate",
  "/api/chat": "/api/chat",
  "/api/embed": "/api/embed",
  "/api/embeddings": "/api/embeddings",
  "/v1/chat/completions": "/v1/chat/completions",
  "/v1/embeddings": "/v1/embeddings",
};

async function handleDraw(req, res) {
  const identity = identityFor(req);
  const raw = await readBody(req);
  let parsed = {};
  try { parsed = JSON.parse(raw.toString() || "{}"); } catch { return json(res, 400, { error: "bad json" }); }
  const kind = String(parsed.kind ?? "chat");
  const requested = parsed.model ?? null;
  const rt = route(kind, requested);
  const admission = admit(identity, { log: drawLog.get(identity) ?? [], now: Date.now(), hop: hopOf(req) });
  if (!admission.ok) {
    return json(res, admission.status, { error: admission.reason, retryAfterMs: admission.retryAfterMs }, { "retry-after": Math.ceil(admission.retryAfterMs / 1000) });
  }
  const messages = Array.isArray(parsed.messages) && parsed.messages.length ? parsed.messages : [{ role: "user", content: String(parsed.prompt ?? "") }];
  const model = modelForWire(rt.wire, requested);
  // The generate wire takes a prompt; the chat wire takes messages — never
  // the one for the other.
  const forward = rt.wire === "/api/generate"
    ? { model, prompt: String(parsed.prompt ?? messages.map((m) => m.content ?? "").join("\n")), stream: false, options: { temperature: 0, ...(parsed.num_predict ? { num_predict: parsed.num_predict } : {}) } }
    : rt.kind === "embed"
      ? { model, input: parsed.input ?? parsed.prompt, stream: false }
      : { model, messages, stream: false, options: { temperature: 0, ...(parsed.num_predict ? { num_predict: parsed.num_predict } : {}) } };
  const priority = parsed.interactive ? "interactive" : rt.interactive ? "interactive" : "batch";
  const out = await bridge(identity, { kind: rt.kind, model, path: rt.wire, body: { forward, priority }, headers: passHeaders(req) });
  if (!out.ok) return json(res, out.status ?? 502, { error: out.error, retryAfterMs: out.retryAfterMs });
  return json(res, 200, { model, kind: rt.kind, text: out.text, ...(rt.kind === "embed" ? { embeddings: out.embed } : {}), usage: out.usage, mouth: MOUTH_SCHEMA, bridge: "eoreader7 channel" });
}

async function handleWire(req, res, path) {
  const identity = identityFor(req);
  const kind = ROUTE_BY_PATH[path];
  const raw = await readBody(req);
  let parsed = {};
  try { parsed = JSON.parse(raw.toString() || "{}"); } catch { return json(res, 400, { error: "bad json" }); }
  const rt = route(kind, parsed.model ?? null);
  const admission = admit(identity, { log: drawLog.get(identity) ?? [], now: Date.now(), hop: hopOf(req) });
  if (!admission.ok) {
    return json(res, admission.status, { error: admission.reason, retryAfterMs: admission.retryAfterMs }, { "retry-after": Math.ceil(admission.retryAfterMs / 1000) });
  }
  const model = modelForWire(path, parsed.model ?? null);
  const headers = passHeaders(req);
  if (parsed.stream) {
    const forward = { ...parsed, model, stream: true };
    const out = await bridge(identity, { kind: rt.kind, model, path, body: { forward, priority: "interactive" }, headers, stream: true });
    if (!out.ok) return json(res, out.status ?? 502, { error: out.error, retryAfterMs: out.retryAfterMs });
    res.writeHead(200, { "content-type": out.headers?.get("content-type") || "application/x-ndjson", "cache-control": "no-cache", connection: "keep-alive" });
    const reader = out.stream.getReader();
    const pump = async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        logDraw(identity, rt.kind);
      } catch (e) { res.write(`data: ${JSON.stringify({ err: String(e.message ?? e) })}\n\n`); }
      res.end();
    };
    pump().catch(() => { try { res.end(); } catch { /* the caller left */ } });
    return;
  }
  const forward = { ...parsed, model, stream: false };
  if (rt.wire === "/api/generate" && forward.options) forward.options = { temperature: 0, ...forward.options };
  const out = await bridge(identity, { kind: rt.kind, model, path, body: { forward, priority: rt.interactive ? "interactive" : "batch" }, headers });
  if (!out.ok) return json(res, out.status ?? 502, { error: out.error, retryAfterMs: out.retryAfterMs });
  // A wire route is a DROP-IN for the channel: the bridge's own payload goes
  // back verbatim (ollama shape on /api/*, openai shape on /v1/*), so a
  // caller that pointed at the channel needs no parsing change — only its
  // base URL points at the mouth. The mouth's admission already ran.
  return json(res, 200, out.raw);
}

// Heimdall, embedded (heimdall/docs/EMBED.md): this server carries its own heimdall — a floor of its own, peers optional. NEVER
// fatal: if heimdall is absent or fails to mount, the mouth runs exactly as before. HEIMDALL_EMBED overrides the module path,
// HEIMDALL_PEERS is a comma list of peer /heimdall/peers URLs (empty = no peers, the floor alone).
async function loadHeimdall(port) {
  try {
    const href = process.env.HEIMDALL_EMBED ?? new URL("../../heimdall/src/embed.js", import.meta.url).href;
    const { mountHeimdall } = await import(href);
    const peerUrls = String(process.env.HEIMDALL_PEERS ?? "").split(",").map((u) => u.trim()).filter(Boolean);
    return mountHeimdall({ name: "penelope-mouth", selfUrl: `http://127.0.0.1:${port}/heimdall/peers`, peerUrls });
  } catch (err) {
    console.warn(`mouth: heimdall not embedded (${err.message}) — running without it`);
    return null;
  }
}

export function startMouth({ port = MOUTH_PORT } = {}) {
  let hm = { handle: async () => false, close() {} };
  loadHeimdall(port).then((m) => { if (m) hm = m; });
  const server = http.createServer(async (req, res) => {
    if (await hm.handle(req, res)) return; // /heimdall/* — before the default-deny below
    const path = (req.url ?? "/").split("?")[0];
    try {
      if (req.method === "GET" && path === "/v1/mouth/status") {
        return json(res, 200, { schema: MOUTH_SCHEMA, port, bridge: CHANNEL, house: HOUSE, lanes: Object.keys(KIND_WIRE) });
      }
      if (req.method === "POST" && path === "/v1/mouth/admit") {
        // The verdict only — no draw. The bridge's own doors (Heimdall's
        // admission) call this before they draw, so every draw the engine
        // runs is hers before it is the bridge's. The draw itself stays on
        // the bridge (the machinery never forks).
        const admission = admit(identityFor(req), { log: drawLog.get(identityFor(req)) ?? [], now: Date.now(), hop: hopOf(req) });
        if (!admission.ok) return json(res, admission.status, { error: admission.reason, retryAfterMs: admission.retryAfterMs }, { "retry-after": Math.ceil(admission.retryAfterMs / 1000) });
        return json(res, 200, { ok: true, mouth: MOUTH_SCHEMA });
      }
      // THE GENERATION DOOR: penelope's weave() over HTTP — the fold surfaces'
      // generate lane. The mouth's admission does not gate an ORCHESTRATION
      // (the weave owns its own retries and draws through the door below);
      // the weave's internal draws each enter the mouth as usual.
      if (req.method === "POST" && path === "/api/weave") {
        let raw;
        try { raw = await readBody(req); } catch { return json(res, 400, { error: "bad request" }); }
        let j = {};
        try { j = JSON.parse(raw.toString() || "{}"); } catch { return json(res, 400, { error: "bad json" }); }
        const { weave } = await import("../organs/generation/api.mjs");
        const result = await weave({
          intent: j.intent,
          artifact: j.artifact,
          constraints: j.constraints,
          context: j.context,
          verification: j.verification,
          model: j.model,
          noModel: j.noModel === true,
          output: j.output ?? null,
        }).catch((e) => ({ schema: "Weaving@1", ok: false, status: "error", error: String(e?.message ?? e).slice(0, 500) }));
        return json(res, result.ok ? 200 : 422, result);
      }
      if (req.method !== "POST") return json(res, 404, { error: "default-deny" });
      if (path === "/v1/draw") return await handleDraw(req, res);
      if (ROUTE_BY_PATH[path]) return await handleWire(req, res, path);
      return json(res, 404, { error: `unknown mouth route ${path} — default-deny` });
    } catch (err) {
      return json(res, err.status ?? 502, { error: err.code ?? err.message });
    }
  });
  server.on("close", () => hm.close());
  server.listen(port, () => console.log(`mouth: ${MOUTH_SCHEMA} on :${port}, bridge=${CHANNEL}`));
  return server;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) startMouth();