// opencode-doorway.mjs — OPENCODE, AS A CLIENT OF THE ONE PIPELINE.
//
// The opencode-fold fork (the real opencode, rebased on upstream, plus one
// internal plugin: packages/core/src/plugin/fold.ts) forwards three things
// here and carries no fold logic of its own:
//
//   context   a new ask is about to reach the frontier model. The doorway
//             answers { system } — text the plugin appends to the system
//             prompt — or nothing. Today that is the hunt-first recall: this
//             exact ask was settled before; here is how it ended.
//   title     opencode wants a session title. The local mouth writes it, so
//             the frontier is never consulted for it ({ title }).
//   event     the turn's own events (steps, tools, text, usage, boundary).
//             They are folded into a turn record and appended to the record
//             at the turn's end. The record is what the fold learns from.
//
//   POST /v1/hooks/opencode          the three events above
//   GET  /v1/hooks/opencode/meter    what the frontier cost, first ask vs repeat
//
// WHAT THIS DOES NOT DO YET (THE-ONE-TIME-TEACHER.md §XII, none of it built):
// a record here is an INSTANCE — the ask, the plan the frontier took, how it
// ended, what it cost. Nothing is compiled into a skill, nothing is promoted
// to a lower rung, and nothing is claimed as learned: that needs checks
// authored before the lesson and a held trial. `kind` says so on every row.
//
// Fails open: an unknown event, a malformed body or a missing local model
// answers {} and opencode carries on exactly as upstream would.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = process.env.FOLD_OPENCODE_STATE ?? path.join(HERE, "state", "opencode");
const RECORD = path.join(STATE, "record.jsonl");
const MOUTH = (process.env.ER7_MOUTH_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
const TITLE_MODEL = process.env.FOLD_TITLE_MODEL ?? "qwen2.5-coder:1.5b";
const RECALL = (process.env.FOLD_RECALL ?? "1") !== "0";

// Normalized ask → address. Same words, same address; nothing fuzzier. An
// embedding may nominate a near ask one day, never decide (the teacher doc §IV).
export const addressOf = (ask) =>
  crypto.createHash("sha256").update(String(ask ?? "").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);

const sessions = new Map(); // sessionID -> the open turn
const counters = { titlesLocal: 0, titlesFailed: 0, recallsServed: 0, turnsRecorded: 0 };

const blankTokens = () => ({ input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 });

function turnFor(sessionID) {
  let turn = sessions.get(sessionID);
  if (!turn) {
    turn = { sessionID, ask: "", address: null, model: null, steps: 0, tools: new Map(), answer: "", tokens: blankTokens(), cost: 0, startedAt: Date.now(), recalled: false };
    sessions.set(sessionID, turn);
  }
  return turn;
}

function readRecord() {
  try {
    return fs.readFileSync(RECORD, "utf8").split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch { return []; }
}

function append(row) {
  fs.mkdirSync(STATE, { recursive: true });
  fs.appendFileSync(RECORD, JSON.stringify(row) + "\n");
}

// ── context ──────────────────────────────────────────────────────────────
function recallNote(address) {
  const prior = readRecord().filter((r) => r.address === address && r.settled).at(-1);
  if (!prior) return null;
  const plan = [...prior.plan.reduce((m, t) => m.set(t.name, (m.get(t.name) ?? 0) + 1), new Map())]
    .map(([name, n]) => `${name}×${n}`).join(", ");
  return [
    "<fold-recall>",
    `This exact request was settled before (${prior.when}). The plan then used: ${plan || "no tools"}.`,
    `It ended with: ${String(prior.answer).slice(0, 600)}`,
    "</fold-recall>",
  ].join("\n");
}

function onContext(body) {
  const turn = turnFor(body.sessionID);
  turn.ask = String(body.ask ?? "");
  turn.address = addressOf(turn.ask);
  turn.model = body.model ?? turn.model;
  if (!RECALL || !turn.ask.trim()) return {};
  const note = recallNote(turn.address);
  if (!note) return {};
  turn.recalled = true;
  counters.recallsServed++;
  return { system: note };
}

// ── title ────────────────────────────────────────────────────────────────
async function onTitle(body) {
  const ask = String(body.ask ?? "").slice(0, 1500);
  if (!ask.trim()) return {};
  try {
    const r = await fetch(`${MOUTH}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-er7-surface": "opencode", "x-er7-caller": "opencode-title" },
      body: JSON.stringify({
        model: TITLE_MODEL,
        stream: false,
        options: { temperature: 0, num_predict: 24 },
        messages: [
          { role: "system", content: "Reply with a title of three to six words for the user's request. Reply with the title only." },
          { role: "user", content: ask },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`mouth ${r.status}`);
    const j = await r.json();
    const title = String(j?.message?.content ?? j?.choices?.[0]?.message?.content ?? "")
      .split("\n")[0].replace(/^["'`#*\s]+|["'`.\s]+$/g, "").slice(0, 60);
    if (title.length < 3) throw new Error("empty title");
    counters.titlesLocal++;
    return { title };
  } catch {
    counters.titlesFailed++;
    return {};
  }
}

// ── event ────────────────────────────────────────────────────────────────
const TURN_END = new Set(["session.execution.succeeded", "session.execution.failed", "session.execution.interrupted"]);

function onEvent(body) {
  const { type, data = {} } = body;
  if (!body.sessionID) return {};
  const turn = turnFor(body.sessionID);
  switch (type) {
    case "session.step.started":
      turn.model = data.model ?? turn.model;
      break;
    case "session.step.ended": {
      turn.steps++;
      const t = data.tokens ?? {};
      turn.tokens.input += t.input ?? 0;
      turn.tokens.output += t.output ?? 0;
      turn.tokens.reasoning += t.reasoning ?? 0;
      turn.tokens.cacheRead += t.cache?.read ?? 0;
      turn.tokens.cacheWrite += t.cache?.write ?? 0;
      turn.cost += Number(data.cost ?? 0);
      // The last step of an agent loop (it stopped, it did not hand back tool
      // calls) is the turn's end; the execution boundary may never arrive when
      // the process exits right after.
      if (data.finish === "stop") { finish(turn, "session.execution.succeeded"); return {}; }
      break;
    }
    case "session.tool.input.started":
      turn.tools.set(data.id, { name: data.name, input: null, ok: null });
      break;
    case "session.tool.called": {
      const tool = turn.tools.get(data.id) ?? { name: "?", input: null, ok: null };
      tool.input = data.input;
      turn.tools.set(data.id, tool);
      break;
    }
    case "session.tool.success":
    case "session.tool.failed": {
      const tool = turn.tools.get(data.id) ?? { name: "?", input: null, ok: null };
      tool.ok = type === "session.tool.success";
      turn.tools.set(data.id, tool);
      break;
    }
    case "session.text.ended":
      turn.answer = String(data.text ?? "");
      break;
    default:
      break;
  }
  if (TURN_END.has(type)) finish(turn, type);
  return {};
}

function finish(turn, endType) {
  sessions.delete(turn.sessionID);
  if (!turn.ask.trim() && turn.steps === 0) return; // a boundary with nothing under it
  const plan = [...turn.tools.values()].map((t) => ({ name: t.name, ok: t.ok }));
  const prior = turn.address ? readRecord().filter((r) => r.address === turn.address) : [];
  append({
    when: new Date().toISOString(),
    sessionID: turn.sessionID,
    address: turn.address,
    ask: turn.ask.slice(0, 2000),
    model: turn.model,
    steps: turn.steps,
    plan,
    answer: turn.answer.slice(0, 4000),
    tokens: turn.tokens,
    cost: turn.cost,
    recalled: turn.recalled,
    settled: endType === "session.execution.succeeded" && plan.every((t) => t.ok !== false),
    repeat: prior.length, // how many times this exact ask was already bought
    kind: "instance", // never "skill": nothing here is compiled or held-trialed
    ms: Date.now() - turn.startedAt,
  });
  counters.turnsRecorded++;
}

// ── meter ────────────────────────────────────────────────────────────────
// Rate AND health together, never the rate alone (teacher doc §X). Health here
// is only what is honestly knowable: how often a recalled ask still needed the
// frontier to run a full plan. Held-out error is not measured, and says so.
export function meter() {
  const rows = readRecord();
  const sum = (rs) => rs.reduce((a, r) => a + (r.tokens.input + r.tokens.output + r.tokens.cacheRead + r.tokens.cacheWrite), 0);
  const first = rows.filter((r) => r.repeat === 0);
  const repeats = rows.filter((r) => r.repeat > 0);
  return {
    turns: rows.length,
    classes: new Set(rows.map((r) => r.address)).size,
    firstAsks: { n: first.length, tokens: sum(first) },
    repeatAsks: { n: repeats.length, tokens: sum(repeats), recalled: repeats.filter((r) => r.recalled).length },
    titlesServedLocally: counters.titlesLocal,
    titlesFellThrough: counters.titlesFailed,
    recallsServed: counters.recallsServed,
    unmeasured: ["held-out error", "decoy rejection", "necessity audit", "promotion with held trial"],
  };
}

// ── door ─────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 4_000_000) req.destroy(); });
    req.on("end", () => resolve(raw));
    req.on("error", () => resolve(""));
  });
}

export async function answer(body) {
  if (process.env.FOLD_DOOR_DEBUG) console.error(`door ← ${body?.event} ${body?.type ?? ""} ${body?.sessionID ?? ""}`);
  switch (body?.event) {
    case "context": return onContext(body);
    case "title": return onTitle(body);
    case "event": return onEvent(body);
    default: return {};
  }
}

// Returns false for anything that is not this door's, so the proxy mounts it
// with one line ahead of its other routes.
export async function route(req, res, { log = () => {} } = {}) {
  const url = String(req.url ?? "").split("?")[0];
  if (url === "/v1/hooks/opencode/meter" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(meter(), null, 2));
    return true;
  }
  if (url !== "/v1/hooks/opencode") return false;
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ door: "opencode", events: ["context", "title", "event"] }));
    return true;
  }
  if (req.method !== "POST") return false;
  let body = {};
  try { body = JSON.parse((await readBody(req)) || "{}"); } catch { /* answered below as {} */ }
  let out = {};
  try { out = await answer(body); } catch (e) { log(`opencode doorway: ${body?.event} failed open: ${e.message}`); }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(out ?? {}));
  return true;
}

// Standalone: `node opencode-doorway.mjs --serve [port]` — the same route(), for
// a box whose proxy has not been restarted onto the mount yet, and for tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes("--serve")) {
  const port = Number(process.argv[process.argv.indexOf("--serve") + 1]) || 11470;
  http.createServer(async (req, res) => {
    if (!(await route(req, res, { log: console.error }))) { res.writeHead(404); res.end(); }
  }).listen(port, "127.0.0.1", () => console.error(`opencode doorway on :${port}, record ${RECORD}`));
}
