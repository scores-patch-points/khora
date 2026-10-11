// sealed-agent/server.mjs — THE ACCESS POINT: the opencode session wire,
// spoken by this door (THE-ONE-TIME-TEACHER §VIII). A client that drives
// opencode (TUI, SDK, the opencode-fold fork, heimdall's opencode-lane) can
// drive the sealed agent with NO new wire: the session, the prompt, the parts
// (text + tool), and the event stream are the ones opencode itself speaks.
//
//   POST /session                  create  -> { id }   (+ optional directory)
//   POST /session/:id/message      prompt  -> { info, parts }  (text + tool
//                                    parts; tool parts carry state.status/state.title)
//   GET  /session/:id/message      history                    (limit)
//   GET  /event                    SSE: message.part.updated + session.idle
//   GET  /                         self-describing map
//
// Every session is a real workspace: a named `directory` is used as-is (the
// shared project — chat and door stand in the same place, like the
// conductor); otherwise one is seeded under runsDir. Each session owns its
// lesson store, record, and audit under <workspace>/.sealed-agent/.

import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createAgent } from "./agent.mjs";
import { createPlanner, resolveApiKey } from "./anthropic.mjs";
import { createSealer } from "./seal.mjs";

export const DEFAULT_PORT = Number(process.env.SEALED_AGENT_PORT ?? 4097);

const HERE = fileURLToPath(new URL(".", import.meta.url));
const STATIC = new Map([
  ["/", { file: "web/index.html", type: "text/html; charset=utf-8" }],
  ["/fold-agent.js", { file: "web/fold-agent.js", type: "text/javascript; charset=utf-8" }],
  ["/fold-agent.css", { file: "web/fold-agent.css", type: "text/css; charset=utf-8" }],
]);

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((resolveP) => {
  let data = "";
  req.on("data", (c) => { data += c; if (data.length > 4e6) req.destroy(); });
  req.on("end", () => resolveP(data));
  req.on("error", () => resolveP(""));
});

/** createSealedAgentServer({ port, host, runsDir, planner, sealer }) — one
 *  session per opencode session id. A planner may be injected (tests); the
 *  default is the Anthropic planner, requiring ANTHROPIC_API_KEY. */
export function createSealedAgentServer({ port = DEFAULT_PORT, host = "127.0.0.1", runsDir = null, planner = null, sealer = null } = {}) {
  const base = runsDir ?? mkdtempSync(join(tmpdir(), "sealed-agent-"));
  const sessions = new Map(); // id -> { workspace, agent, history: [], abort }
  const eventClients = new Set(); // res of open SSE listeners

  const broadcast = (type, data) => {
    const line = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of [...eventClients]) {
      try { res.write(line); } catch { eventClients.delete(res); }
    }
  };

  const ensureSession = (id, requestedDir = null, { model = null } = {}) => {
    if (!sessions.has(id)) {
      const workspace = requestedDir
        ? requestedDir
        : join(base, String(id).replace(/[^A-Za-z0-9_-]+/g, "-"));
      mkdirSync(workspace, { recursive: true });
      const agentPlanner = planner ?? createPlanner({ model: model ?? undefined });
      const agent = createAgent({
        workspace,
        planner: agentPlanner,
        sealer: sealer ?? createSealer({ auditPath: join(workspace, ".sealed-agent", "audit.jsonl") }),
      });
      sessions.set(id, { workspace, agent, history: [], abort: null, model: agentPlanner.model ?? null });
    }
    return sessions.get(id);
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;
    try {
      // The surface: the opencode-style page (tabs of sessions) is served from
      // this door's own web/ — one process, nothing else to start.
      if (req.method === "GET" && STATIC.has(path)) {
        const entry = STATIC.get(path);
        const full = join(HERE, entry.file);
        if (!existsSync(full)) return json(res, 404, { error: "surface file missing" });
        res.writeHead(200, { "content-type": entry.type, "cache-control": "no-store" });
        res.end(readFileSync(full));
        return;
      }

      if (req.method === "GET" && path === "/health") {
        return json(res, 200, {
          schema: "SealedAgentDoor@1",
          version: 1,
          name: "the sealed agent door",
          wire: "opencode session wire (POST /session, POST /session/:id/message, GET /session/:id/message, POST /session/:id/abort, GET /event)",
          runsDir: base,
          sessions: sessions.size,
          model: [...sessions.values()][0]?.model ?? null,
          note: "frontier calls are antistrauss-gated and audit-ledgered; lessons compile on green and replay with zero frontier calls",
        });
      }

      if (req.method === "GET" && path === "/event") {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        res.write("event: server.connected\ndata: {}\n\n");
        eventClients.add(res);
        req.on("close", () => eventClients.delete(res));
        return;
      }

      if (req.method === "POST" && path === "/session") {
        const body = await readBody(req);
        let b = {};
        try { b = JSON.parse(body || "{}"); } catch { /* defaults */ }
        const id = String(b.id ?? `sea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
        const s = ensureSession(id, String(b.directory ?? "") || null, { model: b.model ?? null });
        return json(res, 200, { id, info: { title: b.title ?? "sealed agent session", workspace: s.workspace } });
      }

      const msgMatch = path.match(/^\/session\/([^/]+)\/message$/);
      if (msgMatch && (req.method === "POST" || req.method === "GET")) {
        const id = decodeURIComponent(msgMatch[1]);
        const s = ensureSession(id);
        if (req.method === "GET") {
          const limit = Number(url.searchParams.get("limit") || 50);
          return json(res, 200, { messages: s.history.slice(-limit) });
        }
        const body = await readBody(req);
        let b = {};
        try { b = JSON.parse(body || "{}"); } catch { /* defaults */ }
        const parts = Array.isArray(b.parts) ? b.parts : [];
        const ask = String(b.ask ?? "").trim() || String((parts.find((p) => p?.type === "text")?.text) ?? "");
        if (!ask) return json(res, 400, { error: "a text part (or ask) is required" });
        broadcast("message.part.updated", { sessionID: id, part: { type: "text", text: ask } });
        s.abort = new AbortController();
        let result;
        try {
          result = await s.agent.runTurn({
            ask,
            testCommand: String(b.testCommand ?? "").trim() || null,
            sessionId: id,
            signal: s.abort.signal,
            onPart: (part) => broadcast("message.part.updated", { sessionID: id, part }),
          });
        } catch (e) {
          const cancelled = e?.code === "ERR_CANCELLED";
          if (!res.headersSent) res.writeHead(cancelled ? 499 : 500, { "content-type": "application/json" });
          broadcast("session.idle", { sessionID: id, outcome: cancelled ? "cancelled" : "error", error: cancelled ? null : String(e?.message ?? e) });
          res.end(JSON.stringify({ error: cancelled ? "cancelled" : String(e?.message ?? e) }));
          return;
        }
        s.history.push({ role: "user", parts: [{ type: "text", text: ask }] });
        s.history.push({ role: "assistant", parts: result.parts });
        broadcast("session.idle", { sessionID: id, outcome: result.outcome, servedBy: result.servedBy, frontierCalls: result.frontierCalls });
        return json(res, 200, { info: { id }, parts: result.parts, meta: { outcome: result.outcome, servedBy: result.servedBy, frontierCalls: result.frontierCalls } });
      }

      // Stop the in-flight turn — the opencode abort, on the same wire.
      const abortMatch = path.match(/^\/session\/([^/]+)\/abort$/);
      if (abortMatch && req.method === "POST") {
        const id = decodeURIComponent(abortMatch[1]);
        const s = ensureSession(id);
        if (s.abort) {
          try { s.abort.abort(); } catch { /* already aborted */ }
          broadcast("session.idle", { sessionID: id, outcome: "cancelled" });
        }
        return json(res, 200, { ok: true });
      }

      return json(res, 404, { error: "no such route" });
    } catch (e) {
      if (!res.headersSent) json(res, 500, { error: String(e?.message || e) });
      else res.end();
    }
  });

  return {
    server,
    sessions,
    base,
    listen: () => new Promise((ok, err) => { server.once("error", err); server.listen(port, host, () => ok(server.address())); }),
    close: () => new Promise((r) => server.close(() => r())),
  };
}

export const SEALED_AGENT_DOOR = {
  schema: "SealedAgentDoor@1",
  version: 1,
  create: createSealedAgentServer,
  defaultPort: DEFAULT_PORT,
  describe: "the opencode session wire as the sealed agent's access point",
};

// ── the main: boot the door when run directly ─────────────────────────
//   ANTHROPIC_API_KEY=... node native/sealed-agent/server.mjs
// The page is at http://127.0.0.1:4097/ — opencode-style tabs of sessions.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const door = createSealedAgentServer();
  await door.listen();
  const addr = door.server.address();
  console.log(`sealed agent door · ${addr.address}:${addr.port}`);
  console.log(`  surface    http://127.0.0.1:${addr.port}/   (opencode-style tabs; MIT opencode UX attribution)`);
  console.log(`  health     GET  /health   ·  wire  POST /session, POST /session/:id/message, POST /session/:id/abort, GET /event`);
  console.log(`  frontier   ${resolveApiKey() ? "configured (antistrauss-gated, audit-ledgered) — the Fold's own key" : "NOT configured — set ANTHROPIC_API_KEY, heimdall key anthropic <key>, or HEIMDALL_KEY_ANTHROPIC"}`);
  console.log(`  learning   lessons compile on green checks; the same ask replays with 0 frontier calls`);
}