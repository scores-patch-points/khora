// opencode-doorway.mjs — OPENCODE, AS A CLIENT OF THE ONE PIPELINE.
//
// The opencode-fold fork (the real opencode, rebased on upstream, plus one
// internal plugin: packages/core/src/plugin/fold.ts) forwards three things
// here and carries no fold logic of its own:
//
//   context   a new ask is about to reach the frontier model. The doorway
//             answers, each from an organ that already exists:
//               system   the hunt-first recall of an exact repeat ask
//               look     LOOK (native/organs/repo-look.js): the places in the
//                        workspace the ask's own words point at, as addresses
//               project  HOUDINI (the-fold fold-chat-houdini.js): which earlier
//                        exchanges ride, and the record that stands in for the
//                        rest — need and moment, not position
//             Adapters: opencode-context.mjs. Each fails open with a typed gap.
//   title     opencode wants a session title. It is derived from the ask by
//             rule (first words, cleaned), so the frontier is never consulted
//             for it ({ title }). No model, local or otherwise.
//   event     the turn's own events (steps, tools, text, usage, boundary).
//             They are folded into a turn record and appended to the record
//             at the turn's end. The record is what the fold learns from.
//
// RETIRED (2026-10-15): a line-level fold of single tool outputs lived here.
// Replayed over 1,010 real tool outputs it lost the identifiers the model went
// on to use as often as head/tail or random lines did at the same size
// (scripts/opencode-fold-replay.mjs). The `fold` event now answers {}.
//
//   POST /v1/hooks/opencode          the events above
//   GET  /v1/hooks/opencode/meter    what the frontier cost, first ask vs
//                                    repeat, and what the fold kept out of it
//
// The savings ledger (state/savings.json) counts, honestly:
//   projectedChars     chars of earlier exchanges left out of a request
//   projectedTokensEst projectedChars/4 — GROSS, an estimate, disclosed as one
//   titleTokensEst     ceil(ask chars/4) + 150 per title — the frontier title
//                      request avoided, disclosed as an estimate
//   savedUSD           accumulated at the priceIn the client sends from the
//                      running model's own catalog entry
//
// WHAT THIS DOES NOT DO YET (THE-ONE-TIME-TEACHER.md §XII, none of it built):
// a record here is an INSTANCE — the ask, the plan the frontier took, how it
// ended, what it cost. Nothing is compiled into a skill, nothing is promoted
// to a lower rung, and nothing is claimed as learned: that needs checks
// authored before the lesson and a held trial. `kind` says so on every row.
//
// Fails open: an unknown event or a malformed body answers {} and opencode
// carries on exactly as upstream would.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lookNote, projectHistory } from "./opencode-context.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = process.env.FOLD_OPENCODE_STATE ?? path.join(HERE, "state", "opencode");
const RECORD = path.join(STATE, "record.jsonl");
const LEDGER = path.join(STATE, "savings.json");
const RECALL = (process.env.FOLD_RECALL ?? "1") !== "0";
// There is no local model anywhere on this path. The door is mechanical:
// recall is a record lookup, titles are derived from the ask, folds are
// extractive. It answers in milliseconds, costs zero tokens, consumes no GPU,
// and is deterministic — the fold stack here decides by rule, never by a
// model's guess. (The box's mouth exists for the reading pipeline; opencode
// does not call it.)

// Normalized ask → address. Same words, same address; nothing fuzzier. An
// embedding may nominate a near ask one day, never decide (the teacher doc §IV).
export const addressOf = (ask) =>
  crypto.createHash("sha256").update(String(ask ?? "").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);

const sessions = new Map(); // sessionID -> the open turn
const counters = { titlesLocal: 0, titlesFailed: 0, recallsServed: 0, turnsRecorded: 0, looksServed: 0, looksDeclined: 0, projections: 0, projectionGaps: 0 };

// The EXACT assembled frontier prompts, verbatim, for the audit: what the model
// was actually sent. Kept per session (last one wins) and persisted. Never
// vectorized, never ranked, never summarized — the bytes the frontier received.
const PROMPTS = path.join(STATE, "prompts.json");
const prompts = new Map();
function loadPrompts() {
  try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(PROMPTS, "utf8")))) prompts.set(k, v); } catch { /* none yet */ }
}
function savePrompts() {
  try { fs.mkdirSync(STATE, { recursive: true }); fs.writeFileSync(PROMPTS, JSON.stringify(Object.fromEntries(prompts))); } catch { /* never blocks a turn */ }
}
loadPrompts();

const blankTokens = () => ({ input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 });

function turnFor(sessionID) {
  let turn = sessions.get(sessionID);
  if (!turn) {
    turn = { sessionID, ask: "", address: null, model: null, steps: 0, tools: new Map(), answer: "", tokens: blankTokens(), cost: 0, startedAt: Date.now(), recalled: false, projectedChars: 0, system: null, look: null, project: null, title: null };
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

// ── savings ledger ───────────────────────────────────────────────────────
// The counter the operator reads. Chars are measured; tokens are chars/4 and
// say so; dollars move only on fold/title rows that carried a priceIn from
// the running model's own catalog entry.
const blankLedger = () => ({
  since: new Date().toISOString(),
  projections: 0,
  projectedChars: 0, // chars of earlier exchanges left out of a request (Houdini's drop), measured on the exchange sizes the client sent
  titleTokensEst: 0, // ceil(ask chars/4) + 150 per title: the frontier title request avoided, disclosed as an estimate
  savedUSD: 0,
  pricedProjections: 0,
  pricedTitles: 0,
});

function readLedger() {
  try { return { ...blankLedger(), ...JSON.parse(fs.readFileSync(LEDGER, "utf8")) }; } catch { return blankLedger(); }
}

function writeLedger(ledger) {
  try {
    fs.mkdirSync(STATE, { recursive: true });
    fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n");
  } catch { /* a ledger that cannot be written never blocks a fold */ }
}

function countPrice(ledger, chars, priceIn, pricedKey) {
  const usd = (chars / 4 / 1_000_000) * Number(priceIn);
  if (Number.isFinite(usd) && usd >= 0) {
    ledger.savedUSD += usd;
    ledger[pricedKey]++;
  }
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

// The context event answers three things, each an existing organ:
//   system   the hunt-first recall of an exact repeat ask (the record)
//   look     LOOK: the places the ask's own words point at, as addresses
//   project  HOUDINI: which earlier exchanges ride, and the record that stands
//            in for the rest. Decided once per ASK; the client holds the
//            decision for the turn's steps so the request prefix is stable.
async function onContext(body) {
  const turn = turnFor(body.sessionID);
  turn.ask = String(body.ask ?? "");
  turn.address = addressOf(turn.ask);
  turn.model = body.model ?? turn.model;
  const out = {};
  if (RECALL && turn.ask.trim()) {
    const note = recallNote(turn.address);
    if (note) { turn.recalled = true; counters.recallsServed++; out.system = note; turn.system = note; }
  }
  if (!turn.ask.trim()) return out;

  const [looked, projected] = await Promise.all([
    body.workspace ? lookNote({ ask: turn.ask, workspace: body.workspace }) : { gap: "no-workspace" },
    Array.isArray(body.exchanges) && body.exchanges.length ? projectHistory({ ask: turn.ask, exchanges: body.exchanges }) : { gap: "no-history" },
  ]);
  if (looked.note) { counters.looksServed++; out.look = looked.note; turn.look = looked.note; } else { counters.looksDeclined++; turn.look = looked.gap ?? null; }
  if (projected.drop) {
    const sizes = new Map(body.exchanges.map((e) => [e.id, e.chars ?? 0]));
    const dropped = projected.drop.reduce((n, id) => n + (sizes.get(id) ?? 0), 0);
    counters.projections++;
    turn.projectedChars += dropped;
    if (projected.drop.length) {
      const ledger = readLedger();
      ledger.projections++;
      ledger.projectedChars += dropped;
      if (body.priceIn !== undefined) countPrice(ledger, dropped, body.priceIn, "pricedProjections");
      writeLedger(ledger);
    }
    out.project = { drop: projected.drop, keep: projected.keep, record: projected.record, droppedChars: dropped };
    turn.project = { drop: projected.drop, keep: projected.keep, record: projected.record, droppedChars: dropped };
  } else if (projected.gap !== "no-history") { counters.projectionGaps++; turn.project = { gap: projected.gap }; }
  return out;
}

// ── title ────────────────────────────────────────────────────────────────
// Mechanical: the first words of the ask, cleaned. No model — the frontier's
// title call is avoided outright, and nothing guesses.
function mechanicalTitle(ask) {
  const cleaned = String(ask ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[#>*-]+/, "")
    .trim();
  if (cleaned.length < 4) return null;
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  const cut = words.length > 56 ? words.slice(0, words.lastIndexOf(" ", 56)) : words;
  const title = cut.replace(/[.,;:!?\s]+$/, "");
  return title.length >= 3 ? title : null;
}

function onTitle(body) {
  const ask = String(body.ask ?? "").slice(0, 1500);
  const title = mechanicalTitle(ask);
  if (!title) {
    counters.titlesFailed++;
    return {};
  }
  counters.titlesLocal++;
  try { turnFor(body.sessionID).title = title; } catch { /* a title with no live turn just records nothing */ }
  // The frontier would have read this ask plus instructions to write the
  // title; ask chars/4 + 150 is that request as an estimate, disclosed as one.
  const est = Math.ceil(ask.length / 4) + 150;
  const ledger = readLedger();
  ledger.titleTokensEst += est;
  if (body.priceIn !== undefined) countPrice(ledger, est * 4, body.priceIn, "pricedTitles");
  writeLedger(ledger);
  return { title };
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
  const settled = endType === "session.execution.succeeded" && plan.every((t) => t.ok !== false);
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
    // How this turn was PROMPTED: the notes the door injected and the cuts it
    // made, kept verbatim so the audit can disclose them (never the model's words).
    system: turn.system,
    look: turn.look,
    project: turn.project,
    title: turn.title,
    settled,
    repeat: prior.length, // how many times this exact ask was already bought
    projected: turn.projectedChars, // chars of earlier exchanges this turn kept out of the frontier's context
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
  const ledger = readLedger();
  return {
    turns: rows.length,
    classes: new Set(rows.map((r) => r.address)).size,
    firstAsks: { n: first.length, tokens: sum(first) },
    repeatAsks: { n: repeats.length, tokens: sum(repeats), recalled: repeats.filter((r) => r.recalled).length },
    titlesServedLocally: counters.titlesLocal,
    titlesFellThrough: counters.titlesFailed,
    recallsServed: counters.recallsServed,
    looksServed: counters.looksServed,
    looksDeclined: counters.looksDeclined,
    projections: counters.projections,
    savings: {
      since: ledger.since,
      formulas: {
        projectedTokensEst: "projectedChars / 4 — GROSS: earlier exchanges left out of a request, not net of anything the model then had to re-open",
        titleTokensEst: "ceil(ask chars / 4) + 150, per title served",
        dollars: "estimated tokens × priceIn the client sent (the running model's own catalog price)",
      },
      projections: ledger.projections,
      projectedChars: ledger.projectedChars,
      projectedTokensEst: Math.round(ledger.projectedChars / 4),
      titleTokensEst: ledger.titleTokensEst,
      savedUSD: Number(ledger.savedUSD.toFixed(4)),
      pricedProjections: ledger.pricedProjections,
      pricedTitles: ledger.pricedTitles,
      note:
        ledger.pricedProjections + ledger.pricedTitles > 0
          ? "priced at the running model's own input price; estimate, not an invoice"
          : "no priced rows yet — the fork sends priceIn from the model in use",
    },
    unmeasured: ["held-out error", "decoy rejection", "necessity audit", "promotion with held trial"],
  };
}

// ── audit ────────────────────────────────────────────────────────────────
// How the last turns were PROMPTED, disclosed: the recall note the door
// injected, the addresses LOOK pointed at, the title it derived by rule, the
// cut HOUDINI made (dropped / kept / the record that stood in), beside what
// the frontier then did with it. Read-only; nothing here is the model's own
// words, and nothing is generated for display.
export function audit({ limit = 20 } = {}) {
  const rows = readRecord().slice(-limit).reverse();
  return {
    door: "opencode",
    schema: "fold-audit/1",
    audited: rows.length,
    turns: rows.map((r) => ({
      when: r.when,
      sessionID: r.sessionID,
      ask: r.ask,
      model: r.model,
      address: r.address,
      recall: r.recalled ? r.system ?? "<fold-recall> (note not recorded on this row)" : null,
      look: r.look ?? null,
      project: r.project ?? null,
      title: r.title ?? null,
      plan: r.plan ?? [],
      steps: r.steps ?? 0,
      settled: !!r.settled,
      repeat: r.repeat ?? 0,
      projectedChars: r.projected ?? 0,
      tokens: r.tokens ?? null,
      cost: r.cost ?? 0,
      answer: r.answer ?? "",
      kind: r.kind ?? "instance",
      // The verbatim request the frontier received for this session (last one
      // captured), beside the door's own decisions. Bytes, never summaries.
      prompt: prompts.get(r.sessionID)?.body ?? null,
      promptModel: prompts.get(r.sessionID)?.model ?? null,
    })),
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

// ── prompt (verbatim audit) ───────────────────────────────────────────────
// The client forwards the exact assembled request body it is about to send the
// frontier. Stored verbatim, per session; served back by the audit. Nothing is
// embedded, scored, or rewritten.
function onPrompt(body) {
  const sessionID = body?.sessionID;
  if (!sessionID) return {};
  prompts.set(sessionID, { when: new Date().toISOString(), model: body.model ?? null, body: String(body.body ?? "") });
  while (prompts.size > 50) prompts.delete(prompts.keys().next().value);
  savePrompts();
  return {};
}

export async function answer(body) {
  if (process.env.FOLD_DOOR_DEBUG) console.error(`door ← ${body?.event} ${body?.type ?? ""} ${body?.sessionID ?? ""}`);
  switch (body?.event) {
    case "context": return onContext(body);
    case "title": return onTitle(body);
    case "fold": return {}; // retired: the line-level fold measured equal to its null (see the replay script)
    case "prompt": return onPrompt(body);
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
  if (url === "/v1/hooks/opencode/audit" && req.method === "GET") {
    const limit = Number(new URL(req.url, "http://x").searchParams.get("limit")) || 20;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(audit({ limit: Math.min(Math.max(limit, 1), 200) }), null, 2));
    return true;
  }
  if (url !== "/v1/hooks/opencode") return false;
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ door: "opencode", events: ["context", "title", "event", "prompt"] }));
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
    // CORS: the app reads the audit from the window (a different origin). The
    // mounted proxy sets this globally; the standalone server must too.
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type, x-er7-surface");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (!(await route(req, res, { log: console.error }))) { res.writeHead(404); res.end(); }
  }).listen(port, "127.0.0.1", () => console.error(`opencode doorway on :${port}, record ${RECORD}`));
}
