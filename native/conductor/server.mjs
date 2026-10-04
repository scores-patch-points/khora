// conductor/server.mjs — the conductor as the heimdall machine door.
//
// fold-chat (:8814) → heimdall bridge (:8790) POST /api/code → this door.
// The bridge speaks the opencode-lane wire:
//
//   POST /session              -> { id }
//   POST /session/:id/message  -> { parts: [ {type:"text",...}, {type:"tool",...} ] }
//   GET  /session/:id/message  -> history (array or { messages })
//
// This server implements that wire with the CONDUCTOR as the executor: every
// coding job becomes a resumable investigation — admit purpose → read (khora)
// → derive (janus) → construct → execute (real tools) → retain (penelope).
// It is the realization point: the derived transition is performed for real in
// a per-session workspace, and the FoldTrace@1 is retained durably so a job can
// interrupt and resume.
//
// Wire it: HEIMDALL_OPENCODE=http://127.0.0.1:<port> (or OPENCODE_URL), then
// `heimdall up`. The fold-chat Code mode then drives the conductor.

import { createServer } from "node:http";
import { mkdtempSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createConductor } from "./conductor.js";
import { createTools } from "./tools.js";
import { createDurableRetention } from "../../../penelope/organs/integration/retention-durable.mjs";
import { seedSessionWorkspace, DOCUMENT } from "./experiment.js";

export const DEFAULT_PORT = 4098;

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolveBody) => {
  let data = "";
  req.on("data", (c) => { data += c; if (data.length > 2e6) req.destroy(); });
  req.on("end", () => resolveBody(data));
  req.on("error", () => resolveBody(""));
});

/**
 * createConductorServer({ port, workspace, runsDir }) — one conductor session
 * per opencode session id. `runsDir` (default a temp dir) holds each session's
 * workspace + durable FoldTrace store, so a job resumes from where it stopped.
 */
export function createConductorServer({ port = DEFAULT_PORT, runsDir = null, host = "127.0.0.1" } = {}) {
  const base = runsDir ?? mkdtempSync(join(tmpdir(), "fold-conductor-"));
  const sessions = new Map(); // sessionId -> { workspace, storeFile, conductor, log: [] }

  const ensureSession = (id, requestedDir = null) => {
    if (!sessions.has(id)) {
      // Bind to the project's folder when the caller names one (the shared
      // project — the chat and the door stand in the same place); otherwise a
      // per-session workspace under runsDir. A named folder is used as-is and
      // never seeded with the experiment corpus; the experiment seed is only
      // for the built-in demo workspace.
      const named = typeof requestedDir === "string" && requestedDir.trim() ? resolve(requestedDir.trim()) : null;
      const dir = named || join(base, String(id).replace(/[^A-Za-z0-9_-]+/g, "-"));
      mkdirSync(dir, { recursive: true });
      // Seed the built-in session workspace with the experiment corpus (the
      // small public document + its present sources; source-c is intentionally
      // absent — the broken citation) ONLY when no project folder was named.
      if (!named) seedSessionWorkspace(dir);
      const storeFile = join(dir, ".conductor", "trace.jsonl");
      mkdirSync(join(dir, ".conductor"), { recursive: true });
      const tools = createTools({ workspace: dir });
      const conductor = createConductor({ workspace: dir, tools, storeFile });
      sessions.set(id, { workspace: dir, storeFile, conductor, log: [] });
    }
    return sessions.get(id);
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;
    try {
      if (req.method === "GET" && (path === "/" || path === "/health")) {
        return json(res, 200, {
          schema: "ConductorDoor@1",
          version: 1,
          name: "fold conductor door",
          wire: "opencode-lane (POST /session, POST /session/:id/message, GET /session/:id/message)",
          runsDir: base,
          sessions: sessions.size,
          note: "each coding job is a resumable investigation: purpose → read → derive → construct → execute → retain",
        });
      }

      if (req.method === "POST" && path === "/session") {
        const body = await readBody(req);
        let b = {};
        try { b = JSON.parse(body || "{}"); } catch {}
        const id = String(b.id ?? `cond-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
        const s = ensureSession(id, b.directory ?? null);
        s.conductor.admitPurpose({ who: b.user ?? "fold-chat", scope: b.scope ?? ["workspace"], evidence: b.evidence ?? [], completion: "a verified finding with the trace retained" });
        return json(res, 200, { id, info: { title: b.title ?? "conductor investigation", workspace: s.workspace } });
      }

      const msgMatch = path.match(/^\/session\/([^/]+)\/message$/);
      if (msgMatch && (req.method === "POST" || req.method === "GET")) {
        const id = decodeURIComponent(msgMatch[1]);
        const s = ensureSession(id);
        if (req.method === "GET") {
          const limit = Number(url.searchParams.get("limit") || 50);
          const arr = s.log.slice(-limit);
          return json(res, 200, { messages: arr.map((m) => ({ parts: m.parts })) });
        }
        const body = await readBody(req);
        let b = {};
        try { b = JSON.parse(body || "{}"); } catch {}
        const parts = Array.isArray(b.parts) ? b.parts : (b.messages ?? []);
        const textPart = (parts.find((p) => p?.type === "text")?.text) ?? "";
        const prompt = String(textPart || b.prompt || "");
        const partsOut = await runInvestigation(s.conductor, prompt, { model: b.model ?? null, agent: b.agent ?? null });
        s.log.push({ role: "user", parts }, { role: "assistant", parts: partsOut });
        return json(res, 200, { info: { id }, parts: partsOut });
      }

      // The inspectable trace: the durable FoldTrace@1 for a session — whose
      // account exists, what ran, what is unresolved (the surface's evidence).
      const traceMatch = path.match(/^\/session\/([^/]+)\/trace$/);
      if (traceMatch && req.method === "GET") {
        const id = decodeURIComponent(traceMatch[1]);
        const s = ensureSession(id);
        const store = createDurableRetention({ file: s.storeFile });
        const retained = store.byId("conductor-001");
        if (!retained) return json(res, 404, { error: "no retained trace for this session yet" });
        const { replay, verifyTrace } = await import("../integration/index.js");
        const chain = verifyTrace(retained);
        const replayed = replay(retained);
        return json(res, 200, { sessionId: id, chain: chain.ok, problems: chain.problems, projection: replayed.projection });
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

/** Run one investigation turn: admit purpose, read the workspace, derive, and
 *  report what is supported / contradictory / unresolved — the addressed
 *  artifact the chat renders. Tool activity becomes the wire's tool parts. */
async function runInvestigation(conductor, prompt, { model = null } = {}) {
  const activity = [];
  const push = (tool, title, status = "done") => activity.push({ tool, title, status });

  conductor.admitPurpose({
    who: "fold-chat",
    scope: ["workspace"],
    evidence: [prompt, ...DOCUMENT.needles],
    completion: "a verified finding with the trace retained",
    needles: DOCUMENT.needles,
    claim: "1907",
    rivals: ["1912"],
  });

  push("conductor", "admit purpose · " + String(prompt).slice(0, 60));
  push("khora", "read the workspace (byte addressing + recurrence)");

  // Read every file in the workspace as an admitted source.
  const { readdirSync, statSync } = await import("node:fs");
  const sources = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(txt|md|json|html|mjs|js)$/.test(name)) sources.push(full);
    }
  };
  if (existsSync(conductor.workspace)) walk(conductor.workspace);
  const readouts = [];
  for (const p of sources.slice(0, 25)) {
    const rel = p.slice(conductor.workspace.length + 1);
    const r = await conductor.tools.read("perm:" + rel);
    readouts.push({ address: "perm:" + rel, ok: r.ok, text: r.ok ? r.result.text : null, reason: r.ok ? null : r.reason });
  }

  const reading = await conductor.read(readouts);
  push("janus", `derive findings over ${readouts.length} source(s)`);
  const derived = conductor.derive(reading);
  const findings = derived.findings ?? [];

  const broken = findings.filter((f) => f.kind === "broken_citation");
  const contradictions = findings.filter((f) => f.kind === "contradiction");
  const supporting = findings.filter((f) => f.kind === "supporting");
  for (const f of broken) push("report_gap", `unresolved: ${f.address} (${f.reason ?? "unretrievable"})`, "gap");
  for (const f of contradictions) push("relate", `contradiction between ${f.between?.[0]} and ${f.between?.[1]}`);
  for (const f of supporting) push("relate", `supporting: ${f.address}`);

  // Construct + execute the next transition for real: materialize the
  // addressed artifact (a finding note) into the workspace. The tool registry
  // is the realization point — the derived operation is performed for real.
  const { constructMaterializePrivateArtifact } = await import("../constructors/index.js");
  const artifactText = [
    "# Finding",
    ...(supporting.length ? ["Supported:"] : []),
    ...supporting.map((f) => `- ${f.address} (carries: ${(f.needles ?? []).join(", ")})`),
    ...(contradictions.length ? ["Contradictory:"] : []),
    ...contradictions.map((f) => `- ${f.between?.[0]} vs ${f.between?.[1]}`),
    ...(broken.length ? ["Unresolved (typed gaps, never invented):"] : []),
    ...broken.map((f) => `- ${f.address} — ${f.reason ?? "unretrievable"}`),
  ].join("\n");
  const materialize = constructMaterializePrivateArtifact({ purpose: "fold-chat-job", encounters: [], artifact: artifactText, scope: "private" });
  const executed = await conductor.step(materialize);
  push("execute", executed.executed?.ok ? "materialized addressed artifact" : "materialize refused: " + (executed.executed?.reason ?? "?"), executed.executed?.ok ? "done" : "blocked");

  const lines = [];
  if (supporting.length) lines.push("Supported:"); for (const f of supporting) lines.push("  · " + f.address);
  if (contradictions.length) lines.push("Contradictory:"); for (const f of contradictions) lines.push(`  · ${f.between?.[0]} vs ${f.between?.[1]} — the sources disagree in their admitted bytes`);
  if (broken.length) lines.push("Unresolved (typed gaps, never invented):"); for (const f of broken) lines.push(`  · ${f.address} — ${f.reason ?? "unretrievable"}`);
  if (!lines.length) lines.push("No findings from the admitted material.");

  const completion = await conductor.complete({ task_id: "fold-chat-job", checks: [] });
  const retained = conductor.interrupt();
  push("penelope", `retain trace (${retained.ok ? "durable, " + retained.size + " trace(s) on disk" : "in-memory only"})`);
  push("completion", completion.completion.completion_state, completion.completion.note ? "note" : "done");

  const text = lines.join("\n");
  const parts = [
    { type: "text", text },
    ...activity.map((a) => ({ type: "tool", tool: a.tool, state: { status: a.status, title: a.title } })),
  ];
  return parts;
}

export const CONDUCTOR_SERVER = {
  schema: "ConductorDoor@1",
  version: 1,
  create: createConductorServer,
  defaultPort: DEFAULT_PORT,
  describe: "the heimdall machine door backed by the conductor: fold-chat code jobs become resumable investigations",
};