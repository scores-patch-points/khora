// opencode-doorway.mjs — OPENCODE, AS A CLIENT OF THE ONE PIPELINE.
//
// The opencode-fold fork (the real opencode, rebased on upstream, plus one
// internal plugin: packages/core/src/plugin/fold.ts) forwards four things
// here and carries no fold logic of its own:
//
//   context   a new ask is about to reach the frontier model. The doorway
//             answers { system } — text the plugin appends to the system
//             prompt — or nothing. Today that is the hunt-first recall: this
//             exact ask was settled before; here is how it ended.
//   title     opencode wants a session title. It is derived from the ask by
//             rule (first words, cleaned), so the frontier is never consulted
//             for it ({ title }). No model, local or otherwise.
//   fold      a tool output is about to enter the frontier's context. The
//             doorway answers { folded } — a smaller text the plugin swaps
//             in. The fold is extractive (exact head, exact tail, exact
//             counts between, cut on line boundaries): instant, deterministic,
//             and honest about what it dropped. The chars kept out are the
//             tokens saved.
//   event     the turn's own events (steps, tools, text, usage, boundary).
//             They are folded into a turn record and appended to the record
//             at the turn's end. The record is what the fold learns from.
//
//   POST /v1/hooks/opencode          the four events above
//   GET  /v1/hooks/opencode/meter    what the frontier cost, first ask vs
//                                    repeat, and what the fold kept out of it
//
// The savings ledger (state/savings.json) counts, honestly:
//   foldedChars        chars the frontier never received because of folds
//   savedTokensEst     foldedChars/4 — an estimate, disclosed as one
//   titleTokensEst     ceil(ask chars/4) + 150 per title — the frontier title
//                      request avoided, disclosed as an estimate
//   savedUSD           accumulated at the priceIn the client sends from the
//                      running model's own catalog entry, per fold and title
// Only priced rows move savedUSD; an unpriced deployment keeps the token
// count and says so.
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
const counters = { titlesLocal: 0, titlesFailed: 0, recallsServed: 0, turnsRecorded: 0 };

const blankTokens = () => ({ input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 });

function turnFor(sessionID) {
  let turn = sessions.get(sessionID);
  if (!turn) {
    turn = { sessionID, ask: "", address: null, model: null, steps: 0, tools: new Map(), answer: "", tokens: blankTokens(), cost: 0, startedAt: Date.now(), recalled: false, foldedChars: 0 };
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
  folds: 0,
  foldedChars: 0,
  titleTokensEst: 0, // ceil(ask chars/4) + 150 per title: the frontier title request avoided, disclosed as an estimate
  savedUSD: 0,
  pricedFolds: 0,
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

// ── fold ─────────────────────────────────────────────────────────────────
// The ask decides what the frontier sees. Nothing here is a model: the ask's
// content words are scored against the output's lines (rarer terms weigh
// more), the best windows are kept in document order, and every elision is
// receipted with its line range. What is not needed is not sent.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "what", "when", "where", "which", "how",
  "does", "did", "you", "your", "are", "was", "were", "will", "would", "can", "could", "should",
  "just", "about", "into", "only", "then", "than", "them", "they", "have", "has", "had", "not",
  "but", "its", "read", "file", "here", "reply", "please", "tell", "give", "show", "find", "need",
]);
const FOLD_CONTEXT_LINES = Number(process.env.FOLD_CONTEXT_LINES ?? 3);
const FOLD_KEEP_CHARS = Number(process.env.FOLD_KEEP_CHARS ?? 3500);

// Terms are ASCII and code-shaped by design: opencode asks and the identifiers
// in tool output are. A non-ASCII ask simply matches nothing and falls to the
// edges fold — a declared scope, never a guess.
const termsOf = (ask) =>
  [...new Set(
    String(ask ?? "").toLowerCase().split(/[^a-z0-9_$-]+/).filter((term) => term.length >= 3 && !STOPWORDS.has(term)),
  )];

// Head/tail: the fold when there is no ask to steer by, or when nothing in the
// ask appears in the output. Exact edges, exact counts between, line cut.
function edges(text, headChars = 3000, tailChars = 800) {
  if (text.length <= headChars + tailChars + 200) return text;
  const headCut = text.lastIndexOf("\n", headChars);
  const head = headCut > 0 ? text.slice(0, headCut) : text.slice(0, headChars);
  const tailStart = text.indexOf("\n", text.length - tailChars);
  const tail = tailStart > 0 ? text.slice(tailStart) : text.slice(-tailChars);
  const dropped = text.length - head.length - tail.length;
  return `${head}\n… [fold: ${dropped} chars between this head and the tail are in the session record; re-read the exact range if needed] …\n${tail}`;
}

function selectForAsk(text, ask) {
  const lines = text.split("\n");
  const lower = lines.map((line) => line.toLowerCase());
  const terms = termsOf(ask);
  if (terms.length === 0) return null;
  const df = new Map(terms.map((term) => [term, lower.filter((line) => line.includes(term)).length]));
  if ([...df.values()].every((n) => n === 0)) return null;
  const weight = (term) => 1 + Math.log((lines.length + 1) / (df.get(term) + 1));
  const hits = lines
    .map((_, index) => ({
      index,
      score: terms.reduce((score, term) => (lower[index].includes(term) ? score + weight(term) : score), 0),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score);

  const keep = new Set();
  let chars = 0;
  for (const hit of hits) {
    const from = Math.max(0, hit.index - FOLD_CONTEXT_LINES);
    const to = Math.min(lines.length - 1, hit.index + FOLD_CONTEXT_LINES);
    for (let i = from; i <= to; i++) {
      if (keep.has(i) || chars + lines[i].length + 1 > FOLD_KEEP_CHARS) continue;
      keep.add(i);
      chars += lines[i].length + 1;
    }
  }
  if (keep.size === 0) return null;
  // the head (imports, banner, first definitions) and the last lines are
  // structural, not topic: keep them cheap, bounded so they cannot flood
  for (let i = 0; i < Math.min(10, lines.length); i++) if (lines[i].length < 200) keep.add(i);
  for (let i = Math.max(0, lines.length - 3); i < lines.length; i++) if (lines[i].length < 200) keep.add(i);

  const order = [...keep].sort((a, b) => a - b);
  const out = [];
  let prev = -1;
  for (const i of order) {
    if (i > prev + 1) {
      out.push(
        prev === -1
          ? `… [fold: lines 1–${i} elided — not needed for this ask; full output in the session record] …`
          : `… [fold: lines ${prev + 2}–${i} elided] …`,
      );
    }
    out.push(lines[i]);
    prev = i;
  }
  if (prev < lines.length - 1) out.push(`… [fold: lines ${prev + 2}–${lines.length} elided] …`);
  return out.join("\n");
}

function fold(text, ask) {
  if (text.length <= FOLD_KEEP_CHARS + 200) return text;
  return selectForAsk(text, ask) ?? edges(text);
}

function onFold(body) {
  const text = String(body.text ?? "");
  if (!text) return {};
  const folded = fold(text, body.ask);
  const savedBytes = Math.max(0, text.length - folded.length);
  if (savedBytes === 0) return {};
  const ledger = readLedger();
  ledger.folds++;
  ledger.foldedChars += savedBytes;
  if (body.priceIn !== undefined) countPrice(ledger, savedBytes, body.priceIn, "pricedFolds");
  const turn = sessions.get(body.sessionID);
  if (turn) turn.foldedChars += savedBytes;
  writeLedger(ledger);

  return { folded, savedBytes };
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
    folded: turn.foldedChars, // chars this turn kept out of the frontier's context
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
    savings: {
      since: ledger.since,
      formulas: {
        savedTokensEst: "foldedChars / 4",
        titleTokensEst: "ceil(ask chars / 4) + 150, per title served",
        dollars: "estimated tokens × priceIn the client sent (the running model's own catalog price)",
      },
      folds: ledger.folds,
      foldedChars: ledger.foldedChars,
      savedTokensEst: Math.round(ledger.foldedChars / 4),
      titleTokensEst: ledger.titleTokensEst,
      savedUSD: Number(ledger.savedUSD.toFixed(4)),
      pricedFolds: ledger.pricedFolds,
      pricedTitles: ledger.pricedTitles,
      note:
        ledger.pricedFolds + ledger.pricedTitles > 0
          ? "priced at the running model's own input price; estimate, not an invoice"
          : "no priced rows yet — the fork sends priceIn from the model in use",
    },
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
    case "fold": return onFold(body);
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
    res.end(JSON.stringify({ door: "opencode", events: ["context", "title", "fold", "event"] }));
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
