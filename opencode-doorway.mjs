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
//               archons  the archon ground note (opencode-archons.mjs):
//                        matchArchons over the ask, dossier-gated, capped.
//                        Recorded always; injected only when FOLD_ARCHONS=1
//                        (default 0 is shadow).
//             Adapters: opencode-context.mjs. Each fails open with a typed gap.
//   title     opencode wants a session title. It is derived from the ask by
//             rule (first words, cleaned), so the frontier is never consulted
//             for it ({ title }). No model, local or otherwise.
//   event     the turn's own events (steps, tools, text, usage, boundary).
//             They are folded into a turn record and appended to the record
//             at the turn's end. The record is what the fold learns from.
//   perceive  a media attachment as bytes, before the frontier is sent it.
//   shadow    observe-only draft capture for the draft-lint shadow trial
//             (the-fold/docs/DRAFT-LINT-PREREG.md): full draft text and full
//             tool I/O, appended to shadow.jsonl. Local-only, never shipped,
//             never scored, never injected anywhere. The fork sends it only
//             when FOLD_SHADOW=1; the door answers {} either way.//             Answered from the khora local backends (khora/perceive/local.mjs:
//             tesseract, ffmpeg, poppler, whisper.cpp when installed) with the
//             source's own text plus provenance — never a model call. Honors
//             the perceive config (vision/transcription routing, OCR lang),
//             which the Perceive tab reads and writes. Unhandled media answers
//             { passthrough: true } and rides upstream exactly as it would
//             without the door.
//
// RETIRED (2026-10-15): a line-level fold of single tool outputs lived here.
// Replayed over 1,010 real tool outputs it lost the identifiers the model went
// on to use as often as head/tail or random lines did at the same size
// (scripts/opencode-fold-replay.mjs). The `fold` event now answers {}.
//
//   POST /v1/hooks/opencode          the events above, plus draft + act
//                                    (DRAFT-LINT shadow: recorded, never
//                                    enforced until the composer is built)
//   GET  /v1/hooks/opencode/meter    what the frontier cost, first ask vs
//                                    repeat, and what the fold kept out of it
//   GET  /v1/hooks/opencode/perceive-config
//   POST /v1/hooks/opencode/perceive-config
//                                    the Perceive tab's routing config
//                                    (vision/transcription backends, OCR lang)
//                                    plus a live backend-availability probe
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
import os from "node:os";
import { surf as surfLadder } from "./opencode-surf.mjs";
import { rec as recChange, fold as foldRecord, recNote, recSink } from "./opencode-rec.mjs";
import { mark as markNote, claim as claimItem, done as doneItem, read as readNotes, noteFor, turnsFile } from "./opencode-worknotes.mjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lookNote, projectHistory } from "./opencode-context.mjs";
import { archonNote } from "./opencode-archons.mjs";
import { connect as matrixConnect } from "./fold-matrix.mjs";
import { connect as driveConnect } from "./fold-gdrive.mjs";
import { perceiveMedia, probeBackends, PERCEIVE_VERSION } from "./khora/perceive/local.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = process.env.FOLD_OPENCODE_STATE ?? path.join(HERE, "state", "opencode");
const RECORD = path.join(STATE, "record.jsonl");
const LEDGER = path.join(STATE, "savings.json");
// The record also rides to the account's Matrix room as EODB operators (fold-matrix.mjs)
// once `login` has run on this box; before that, or offline, it is purely local.
const matrix = matrixConnect({ state: STATE });
const drive = driveConnect({ state: STATE }); // the same record, sealed, in Google Drive's hidden app folder
const RECALL = (process.env.FOLD_RECALL ?? "1") !== "0";
// Step 1 of the doorway plan (archon-aware context): FOLD_ARCHONS=1 injects
// the archon ground note into the context answer. Default 0 is shadow — the
// decision is computed and recorded on every turn, but never injected, so a
// held A/B can measure cost and coverage before anything ships.
const ARCHONS_ON = () => (process.env.FOLD_ARCHONS ?? "0") !== "0";
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
    turn = { sessionID, ask: "", address: null, model: null, steps: 0, tools: new Map(), answer: "", tokens: blankTokens(), cost: 0, startedAt: Date.now(), recalled: false, projectedChars: 0, system: null, look: null, project: null, title: null, archons: null };
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

let appended = null;
const lastRow = () => appended;
function append(row) {
  appended = row;
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

// The context event answers four things, each an existing organ:
//   system   the hunt-first recall of an exact repeat ask (the record)
//   look     LOOK: the places the ask's own words point at, as addresses
//   project  HOUDINI: which earlier exchanges ride, and the record that stands
//            in for the rest. Decided once per ASK; the client holds the
//            decision for the turn's steps so the request prefix is stable.
//   archons  the archon ground note (opencode-archons.mjs): matchArchons over
//            the ask, dossier-gated, top 2 hits, ≤600 chars. Computed and
//            recorded on every turn; injected into the answer only when
//            FOLD_ARCHONS=1 (default 0 is shadow).
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
  // Archon ground: computed on every turn (cheap, mechanical), recorded on
  // every turn, injected only when the operator opts in. Fail-open by
  // construction — archonNote answers gaps, never throws past this line.
  const arch = await archonNote(turn.ask);
  turn.archons = arch.handles
    ? { handles: arch.handles, chars: arch.chars, injected: false }
    : { gap: arch.gap, ...(arch.why ? { why: arch.why } : {}) };
  if (ARCHONS_ON() && arch.note) {
    out.archons = { note: arch.note, handles: arch.handles, chars: arch.chars };
    turn.archons.injected = true;
  }
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
    archons: turn.archons,
    settled,
    repeat: prior.length, // how many times this exact ask was already bought
    projected: turn.projectedChars, // chars of earlier exchanges this turn kept out of the frontier's context
    kind: "instance", // never "skill": nothing here is compiled or held-trialed
    ms: Date.now() - turn.startedAt,
  });
  counters.turnsRecorded++;
  try { if (matrix.enqueue(lastRow())) matrix.push().catch(() => {}); } catch { /* the record is already local */ }
  try { if (drive.enqueue(lastRow())) drive.push().catch(() => {}); } catch { /* the record is already local */ }
}

// ── meter ────────────────────────────────────────────────────────────────
// Rate AND health together, never the rate alone (teacher doc §X). Health here
// is only what is honestly knowable: how often a recalled ask still needed the
// frontier to run a full plan. Held-out error is not measured, and says so.
export function meter() {
  const rows = readRecord().filter((r) => (r.kind ?? "instance") !== "draft-lint");
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
  const rows = readRecord().filter((r) => (r.kind ?? "instance") !== "draft-lint").slice(-limit).reverse();
  return {
    door: "opencode",
    schema: "fold-audit/1",
    audited: rows.length,
    // The turns still open — what the model is being prompted with RIGHT NOW. The panel reads this to animate the
    // fold processing a request while it streams, not just its settled record afterwards.
    live: [...sessions.values()].map((turn) => ({
      sessionID: turn.sessionID,
      ask: turn.ask,
      address: turn.address,
      model: turn.model,
      steps: turn.steps,
      tools: [...turn.tools.values()].map((t) => ({ name: t.name, ok: t.ok })),
      recalled: turn.recalled,
      projectedChars: turn.projectedChars,
      startedAt: turn.startedAt,
      system: turn.system,
      look: turn.look,
      project: turn.project,
      title: turn.title,
      archons: turn.archons,
      prompt: prompts.get(turn.sessionID)?.body ?? null,
    })),
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
      archons: r.archons ?? null,
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

// ── workspace (serve the repo the fold is reading, for the holodeck) ──────
// The holodeck explores the CODEBASE, so the door serves it: a tree and file reads, scoped to FOLD_WORKSPACE.
const WORKSPACE = process.env.FOLD_WORKSPACE ?? null;
const WS = WORKSPACE ? path.resolve(WORKSPACE) : null;
function safeJoin(rel) {
  if (!WS) return null;
  const target = path.resolve(WS, String(rel ?? ""));
  return target === WS || target.startsWith(WS + path.sep) ? target : null;
}
function workspaceTree(rel = "") {
  const dir = safeJoin(rel);
  if (!dir) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.name !== ".git" && e.name !== "node_modules")
      .map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file", path: path.relative(WS, path.join(dir, e.name)) }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    return { root: WS, path: path.relative(WS, dir), entries };
  } catch { return null; }
}

// ── documents (the ER7 read the holodeck calls, over the workspace) ───────
// The holodeck's reader POSTs /v1/documents {task, documents} and polls. We answer with a MECHANICAL read of the
// WORKSPACE (FOLD_WORKSPACE): the task is the plan, the passages that share its words are the parts, verbatim and
// address-stamped. No model, no embeddings. The controls the holodeck checks (plan before parts, parts answer the
// plan, projection held in the ledger, EOT schema) are met by construction.
const jobs = new Map();
const EOT = "EOTObservation@1";
const wordsOf = (t) => new Set(String(t ?? "").toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || []);
function workspaceTexts(limitFiles = 300) {
  const out = [];
  if (!WS) return out;
  const walk = (rel) => {
    if (out.length >= limitFiles) return;
    const dir = safeJoin(rel);
    if (!dir) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= limitFiles) return;
      if (e.name === ".git" || e.name === "node_modules") continue;
      const child = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { walk(child); continue; }
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|go|rs|sh|yml|yaml|toml)$/.test(e.name)) continue;
      try { out.push({ name: child, text: fs.readFileSync(safeJoin(child), "utf8").slice(0, 20000) }); } catch { /* unreadable */ }
    }
  };
  walk("");
  return out;
}
function mechanicalRead(task, documents) {
  // With a workspace configured, the door reads IT (the codebase the fold is in); otherwise the documents it is handed.
  const docs = WS ? workspaceTexts() : Array.isArray(documents) && documents.length ? documents : [];
  const want = wordsOf(task);
  const now = Date.now();
  const id = (n) => `$read-${now.toString(36)}-${n.toString(36)}`;
  const q = String(task ?? "").trim() || "what does this workspace say?";
  const rows = [{ schema: EOT, id: id(0), role: "plan", title: "the void plan", text: `- ${q}`, giver: "eoreader7:plan", supersedes: [] }];
  const passages = [];
  for (const doc of docs) {
    const text = String(doc?.text ?? "");
    for (const s of text.split(/(?<=[.!?\n])\s+/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 4)) {
      const hit = [...wordsOf(s)].filter((w) => want.has(w)).length;
      if (hit > 0) passages.push({ s, hit, name: doc.name });
    }
  }
  passages.sort((a, b) => b.hit - a.hit);
  const keep = passages.slice(0, 8);
  let n = 1;
  if (keep.length) for (const p of keep) rows.push({ schema: EOT, id: id(n++), role: "part", title: q, text: p.s, giver: `eoreader7:snip ${p.name}`, supersedes: [] });
  else rows.push({ schema: EOT, id: id(n++), role: "part", title: "No ground", text: "No ground: nothing in this workspace shares a word with the task.", giver: "eoreader7:ground", supersedes: [] });
  const projection = keep.length
    ? keep.map((p) => `${p.s}\n\n— ${p.name}`).join("\n\n")
    : "DISCLOSED UNGROUNDED\n\nNo passage in the workspace shares a word with the task, so nothing here states anything about it.";
  return { rows, projection };
}
function startDocumentJob(body) {
  const jobId = String(body?.sessionId || body?.jobId || `hd-${Date.now().toString(36)}`);
  const { rows, projection } = mechanicalRead(body?.task, body?.documents);
  jobs.set(jobId, { jobId, rows, projection, status: "complete", satisfaction: { ok: true, basis: "mechanical read of the workspace" } });
  return { jobId, status: "complete" };
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

// ── perceive (local-first media perception + its tab-facing config) ───────
// Attachments reach the door as bytes, never as model calls. The door runs
// the khora local backends (khora/perceive/local.mjs: tesseract, ffmpeg,
// poppler, whisper.cpp when installed) and returns the source's own text plus
// provenance — so the client can splice transcription in place of raw media
// and the frontier never needs eyes or ears.
//
// Defaults are local-first: vision goes through the khora, transcription
// through the local whisper binary. The Perceive tab reads and writes this
// config; the client enforces it per attachment. Anything unhandled fails
// open: { passthrough: true } tells the client to send the media upstream
// exactly as it would without the door.
const PERCEIVE_CONFIG = path.join(STATE, "perceive.json");
const PERCEIVE_DEFAULTS = Object.freeze({
  vision: "khora-local", // khora-local | frontier
  transcription: "local", // local | off
  pdf: "layer-then-ocr", // layer-then-ocr | layer-only
  ocrLang: "eng",
  replaceMedia: true, // splice transcription in place of the media part
});
const PERCEIVE_MAX_BYTES = 25 * 1024 * 1024;

function loadPerceiveConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(PERCEIVE_CONFIG, "utf8"));
    return { ...PERCEIVE_DEFAULTS, ...raw };
  } catch { return { ...PERCEIVE_DEFAULTS }; }
}

function savePerceiveConfig(patch) {
  const next = { ...loadPerceiveConfig() };
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (key in PERCEIVE_DEFAULTS && typeof value === typeof PERCEIVE_DEFAULTS[key]) next[key] = value;
  }
  try {
    fs.mkdirSync(STATE, { recursive: true });
    fs.writeFileSync(PERCEIVE_CONFIG, JSON.stringify(next, null, 2) + "\n");
  } catch { /* a config that cannot be written never blocks a turn */ }
  return next;
}

async function onPerceive(body) {
  const cfg = loadPerceiveConfig();
  const mime = String(body?.mime ?? "application/octet-stream").toLowerCase();
  const name = String(body?.name ?? "attachment");
  const b64 = body?.dataBase64;
  if (typeof b64 !== "string" || b64.length === 0) {
    return { passthrough: true, gap: "no_media_bytes", detail: "perceive needs dataBase64" };
  }
  let bytes;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch {
    return { passthrough: true, gap: "bad_media_bytes", detail: "dataBase64 did not decode" };
  }
  if (bytes.length === 0 || bytes.length > PERCEIVE_MAX_BYTES) {
    return { passthrough: true, gap: "media_too_large", detail: `${bytes.length} bytes (cap ${PERCEIVE_MAX_BYTES})` };
  }
  // Operator-routed pass-throughs: the tab sent this modality straight to
  // the frontier. Recorded, never second-guessed here.
  if (mime.startsWith("image/") && cfg.vision === "frontier") {
    return { passthrough: true, via: "frontier-direct", perceiver: PERCEIVE_VERSION };
  }
  if (mime.startsWith("audio/") && cfg.transcription === "off") {
    return { passthrough: true, via: "frontier-direct", perceiver: PERCEIVE_VERSION };
  }
  const lang = typeof body?.lang === "string" && body.lang ? body.lang : cfg.ocrLang;
  try {
    const out = await perceiveMedia(bytes, { mime, name, lang });
    if (cfg.pdf === "layer-only" && out.via === "pdf-ocr") {
      return { ...out, text: "", chars: 0, via: "text-layer-only", gaps: [...out.gaps, { reason: "ocr_skipped_by_config", detail: "pdf mode is layer-only" }] };
    }
    return { ...out, replaceMedia: cfg.replaceMedia };
  } catch (e) {
    return { passthrough: true, gap: "perceive_failed", detail: String(e?.message ?? e).slice(0, 200) };
  }
}

// ── shadow ─────────────────────────────────────────────────────────────────
// Observe-only draft capture for the draft-lint shadow trial. Full bytes in,
// one JSON row out, no verdict, no injection, no shipping. A row the door
// cannot write is lost, never blocking — the trial measures what it can.
const SHADOW = path.join(STATE, "shadow.jsonl");

function onShadow(body) {
  const sessionID = body?.sessionID;
  const kind = String(body?.kind ?? "");
  const text = String(body?.text ?? "");
  if (!sessionID || !kind || !text) return {};
  try {
    fs.mkdirSync(STATE, { recursive: true });
    fs.appendFileSync(SHADOW, JSON.stringify({
      when: new Date().toISOString(),
      sessionID,
      kind, // 'draft-text' | 'tool-io'
      name: String(body?.name ?? ""),
      chars: text.length,
      text: text.slice(0, 200_000),
    }) + "\n");
  } catch { /* a shadow that cannot be written never blocks a turn */ }
  return {};
}

// ── draft / act (DRAFT-LINT shadow) ────────────────────────────────────
// the-fold/docs/DRAFT-LINT.md §3, rollout step 1: observe-only. The door
// records the draft (or proposed act) as a kind:"draft-lint" row and answers
// pass/allow with no findings — the lint composer (draft-lint.js) is not
// built, so there is nothing to enforce yet and the verdict is recorded,
// never acted on. Fail-open: junk answers {} and writes nothing.
function draftLintRow(phase, body, extra = {}) {
  const turn = body?.sessionID ? sessions.get(body.sessionID) : null;
  const text = String(body?.text ?? body?.input ?? "");
  return {
    when: new Date().toISOString(),
    kind: "draft-lint",
    phase, // 'draft' | 'act'
    sessionID: body?.sessionID ?? null,
    address: turn?.address ?? (body?.ask ? addressOf(body.ask) : null),
    ask: String(body?.ask ?? turn?.ask ?? "").slice(0, 2000),
    model: body?.model ?? turn?.model ?? null,
    attempt: Number(body?.attempt ?? 1),
    tool: phase === "act" ? String(body?.tool ?? "") : null,
    draftHash: crypto.createHash("sha256").update(text).digest("hex").slice(0, 16),
    draftChars: text.length,
    draft: text.slice(0, 8000),
    findings: [],
    lintMs: 0,
    escalated: false,
    note: "shadow — composer not built; verdict recorded, never enforced",
    ...extra,
  };
}

function onDraft(body) {
  if (!body?.sessionID || !String(body?.text ?? "")) return {};
  const row = draftLintRow("draft", body, { verdict: "pass" });
  try { append(row); } catch { /* shadow never blocks */ }
  return { verdict: "pass", findings: [], spans: [] };
}

function onAct(body) {
  if (!body?.sessionID || !body?.tool) return {};
  const row = draftLintRow("act", body, { verdict: "allow" });
  try { append(row); } catch { /* shadow never blocks */ }
  return { verdict: "allow", findings: [] };
}

export { loadPerceiveConfig, savePerceiveConfig, onPerceive, PERCEIVE_DEFAULTS };

// Worknotes: the stigmergic medium (opencode-worknotes.mjs). Per task, one
// append-only marks file per agent plus atomic claims; this session's settled
// turns go in its own single-writer turns file. The context carries the ladder
// and the open claims; detail is read from the files on demand. `task`
// defaults to the sessionID, so a lone session behaves as before.
function onSurf(body) {
  const turns = Array.isArray(body.turns) ? body.turns : [];
  const out = surfLadder({ ask: String(body.ask ?? ""), turns });
  const agent = String(body.sessionID ?? "");
  const task = String(body.task ?? agent);
  const file = turnsFile(task, agent);
  if (file) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const sections = turns.map((t) => `## turn ${t.n}\n\nask: ${t.ask}\n${t.grounds?.length ? `tools: ${t.grounds.join(", ")}\n` : ""}\n${t.answer || "(no text reply)"}\n`);
      fs.writeFileSync(file, `# turns ${agent}\n\n${sections.join("\n")}`);
      out.note += `\nturns: ${file} (one "## turn N" section per turn above)`;
    } catch { /* never blocks a turn */ }
  }
  const note = noteFor({ task, agent });
  if (note) out.note += `\n${note}`;
  const record = recNote({ task });
  if (record) out.note += `\n${record}`;
  return out;
}

function onMark(body) { return markNote({ task: body.task, agent: body.agent, kind: body.kind, text: body.text }); }
function onClaim(body) { return claimItem({ task: body.task, agent: body.agent, item: body.item, ttlMs: body.ttlMs }); }
function onDone(body) { return doneItem({ task: body.task, agent: body.agent, item: body.item }); }
function onRec(body) { return recChange({ task: body.task, agent: body.agent, referent: body.referent, delta: body.delta, check: body.check, cwd: body.cwd, exitCode: body.exitCode, address: body.address, source: body.source, model: body.model }); }
function onRecord(body) { return { record: foldRecord({ task: body.task }) }; }
// CHASE: run the DEF->EVA->REC void loop over a workspace. The loop executes
// the caller's declared testCommand, so this is OFF unless FOLD_REC_EXEC=1 (the
// same opt-in as the box judge), takes only an absolute existing directory, and
// is bounded by maxRounds. Every judged draw lands in the task's record.
async function onChase(body, opts = {}) {
  if (process.env.FOLD_REC_EXEC !== "1") return { ok: false, gap: "exec-disabled" };
  const workspace = String(body.workspace ?? "");
  const testCommand = String(body.testCommand ?? "").trim();
  if (!path.isAbsolute(workspace) || !fs.existsSync(workspace) || !fs.statSync(workspace).isDirectory()) return { ok: false, gap: "bad-workspace" };
  if (!testCommand) return { ok: false, gap: "no-test-command" };
  const agent = String(body.agent ?? body.sessionID ?? "chase");
  const task = String(body.task ?? agent);
  if (!/^[\w.-]+$/.test(agent) || !/^[\w.-]+$/.test(task) || task === ".." || agent === "..") return { ok: false, gap: "bad-address" };
  const { runVoidLoop } = await import("./native/the-fold/code-loop.js");
  const maxRounds = Math.min(6, Math.max(1, Math.floor(Number(body.maxRounds) || 3)));
  const result = await runVoidLoop({
    sessionId: agent, model: String(body.model ?? "qwen2.5-coder:1.5b"), task: String(body.ask ?? "fill the stubs so the test passes"),
    workspace, testCommand, maxRounds, candidates: 1, ...(opts.turn ? { turn: opts.turn } : {}),
    onRec: recSink({ task, agent }),
  });
  return {
    ok: true, done: !!result.done, gap: result.gap?.kind ?? null,
    rounds: (result.rounds ?? []).map((r) => ({ action: r.action ?? null, by: r.by ?? null, target: r.target ?? null, applied: r.applied ?? null, reverted: r.reverted ?? null, testExitCode: r.testExitCode ?? null })),
    record: foldRecord({ task }).map((b) => ({ referent: b.referent, id: b.id })),
  };
}
function onRead(body) { return readNotes({ task: body.task }); }

export async function answer(body, opts = {}) {
  if (process.env.FOLD_DOOR_DEBUG) console.error(`door ← ${body?.event} ${body?.type ?? ""} ${body?.sessionID ?? ""}`);
  switch (body?.event) {
    case "context": return onContext(body);
    case "title": return onTitle(body);
    case "fold": return {}; // retired: the line-level fold measured equal to its null (see the replay script)
    case "surf": return onSurf(body);
    case "mark": return onMark(body);
    case "claim": return onClaim(body);
    case "done": return onDone(body);
    case "notes": return onRead(body);
    case "rec": return onRec(body);
    case "chase": return onChase(body, opts);
    case "record": return onRecord(body);
    case "prompt": return onPrompt(body);
    case "event": return onEvent(body);
    case "perceive": return onPerceive(body);
    case "shadow": return onShadow(body);
    case "draft": return onDraft(body);
    case "act": return onAct(body);
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
  if (url === "/v1/workspace/tree" && req.method === "GET") {
    const rel = new URL(req.url, "http://x").searchParams.get("path") ?? "";
    const tree = workspaceTree(rel);
    res.writeHead(tree ? 200 : 404, { "content-type": "application/json" });
    res.end(JSON.stringify(tree ?? { error: WORKSPACE ? "no such path" : "no workspace configured (set FOLD_WORKSPACE)" }));
    return true;
  }
  if (url === "/v1/workspace/file" && req.method === "GET") {
    const rel = new URL(req.url, "http://x").searchParams.get("path") ?? "";
    const abs = safeJoin(rel);
    let text = null;
    try { if (abs) text = fs.readFileSync(abs, "utf8"); } catch { /* unreadable or missing */ }
    res.writeHead(text === null ? 404 : 200, { "content-type": "application/json" });
    res.end(JSON.stringify(text === null ? { error: "no such file" } : { path: rel, text }));
    return true;
  }
  if (url === "/v1/hooks/opencode/perceive-config" && (req.method === "GET" || req.method === "POST")) {
    let out = loadPerceiveConfig();
    if (req.method === "POST") {
      let patch = {};
      try { patch = JSON.parse((await readBody(req)) || "{}"); } catch { /* defaults below */ }
      out = savePerceiveConfig(patch);
    }
    const backends = req.method === "GET" ? await probeBackends().catch(() => null) : undefined;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ config: out, defaults: PERCEIVE_DEFAULTS, ...(backends ? { backends } : {}) }));
    return true;
  }
  // POST /v1/perceive { path } → the local vision sense: OCR the image on this box (tesseract), no network, no
  // vision model. Returns the measured text with a giver; the model reads this, never the pixels.
  if (url === "/v1/perceive" && req.method === "POST") {
    let body = {};
    try { body = JSON.parse((await readBody(req)) || "{}"); } catch { /* answered as an empty read */ }
    const file = typeof body.path === "string" ? body.path : "";
    let text = "";
    let giver = "image-khora (tesseract)";
    try {
      const r = spawnSync("tesseract", [file, "stdout"], { encoding: "utf8", timeout: 60_000 });
      if (r.error) throw r.error;
      text = r.status === 0 ? String(r.stdout ?? "").trim() : "";
    } catch (e) {
      giver = `image-khora (tesseract unavailable: ${e.message})`;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ text, giver, source: file }));
    return true;
  }
  if (url === "/v1/documents" && req.method === "POST") {
    let body = {};
    try { body = JSON.parse((await readBody(req)) || "{}"); } catch { /* answered as an empty job */ }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(startDocumentJob(body)));
    return true;
  }
  if (url.startsWith("/v1/documents/") && req.method === "GET") {
    const rest = url.slice("/v1/documents/".length);
    if (rest.endsWith(".jsonl")) {
      const job = jobs.get(decodeURIComponent(rest.slice(0, -".jsonl".length)).replace(/_1$/, ""));
      res.writeHead(job ? 200 : 404, { "content-type": "application/x-ndjson" });
      res.end(job ? job.rows.map((r) => JSON.stringify(r)).join("\n") : "");
      return true;
    }
    const job = jobs.get(decodeURIComponent(rest));
    if (!job) { res.writeHead(404, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "no such job" })); return true; }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: job.status, projection: job.projection, job: { satisfaction: job.satisfaction } }));
    return true;
  }
  if (url.startsWith("/v1/hooks/opencode/matrix") && ["GET", "POST"].includes(req.method)) {
    const act = url.slice("/v1/hooks/opencode/matrix".length).replace(/^\//, "") || "status";
    let b = {};
    if (req.method === "POST") { try { b = JSON.parse((await readBody(req)) || "{}"); } catch { /* empty */ } }
    let out;
    try {
      out = act === "login" ? await matrix.login({ base: b.base, user: b.user, password: b.password ?? process.env.FOLD_MATRIX_PASSWORD })
        : act === "pull" ? await matrix.pull() : act === "push" ? await matrix.push()
        : act === "logout" ? matrix.logout() : matrix.status();
    } catch (e) { out = { ok: false, gap: "matrix-unreachable", why: e.message }; }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
    return true;
  }
  if (url.startsWith("/v1/hooks/opencode/drive") && ["GET", "POST"].includes(req.method)) {
    const act = url.slice("/v1/hooks/opencode/drive".length).replace(/^\//, "") || "status";
    let out;
    try { out = act === "login" ? await drive.login() : act === "pull" ? await drive.pull() : act === "push" ? await drive.push() : act === "logout" ? drive.logout() : drive.status(); }
    catch (e) { out = { ok: false, gap: "drive-unreachable", why: e.message }; }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
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
    res.end(JSON.stringify({ door: "opencode", events: ["context", "surf", "mark", "claim", "done", "notes", "rec", "record", "chase", "title", "event", "prompt", "perceive", "draft", "act"] }));
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
