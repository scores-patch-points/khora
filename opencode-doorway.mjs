// opencode-doorway.mjs — OPENCODE, AS A CLIENT OF THE ONE PIPELINE.
//
// The openfold fork (the real opencode, rebased on upstream, plus one
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
//   swarm     deploy the model-free capacity-swarm on hard material (the `swarm`
//             tool). Reads any language and any modality: a file is resolved by the
//             SENSE-SWARM first — every present organ (khora/senses/registry.mjs:
//             the macOS Vision organ, tesseract, cv-khora, sips, poppler, whisper,
//             each found by the hunt, none assumed) reads the bytes at once, the
//             delta is their agreement, and the representative reading is the one
//             that best agrees with the consensus, never a blend. The swarm points
//             the registry at that ground's referent-physics, and records the
//             surviving read as a task mark the next turn's note carries.
//
//   POST /v1/hooks/opencode          the events above, plus draft + act
//                                    (DRAFT-LINT shadow: recorded, never
//                                    enforced until the composer is built)
//   GET  /v1/hooks/opencode/meter    what the frontier cost, first ask vs
//                                    repeat, and what the fold kept out of it
//   GET  /v1/hooks/opencode/senses   the sense hunt: which organs are present or
//                                    absent, and what the ledger has learned about
//                                    each one's agreement over time
//   GET  /v1/hooks/opencode/perceive-config
//   POST /v1/hooks/opencode/perceive-config
//                                    the Perceive tab's routing config
//                                    (vision/transcription backends, OCR lang)
//                                    plus a live backend-availability probe
//
// The savings ledger (state/savings.json) counts, honestly:
//   projectedChars     chars of earlier exchanges left out of a request — the
//                      Houdini drop (context) and the surf cut (surf), both
//                      measured on the sizes the client sent
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
import { breakEven, makeGateTracker } from "./opencode-cost-gate.mjs";
import { semanticTerms, semanticOn } from "./opencode-semantic.mjs";
import { plan as trailPlan, shouldCompact as trailGate, trailEnabled } from "./opencode-trail.mjs";
import { standingOf } from "./opencode-standing.mjs";
import { admit as admitChange, fold as foldRecord, recordNote, recordSink, reconcile, nextVoid, reasonFor, provenance, refusalsFor, liveAnswers } from "./opencode-record.mjs";
import { dreamTask } from "./opencode-dream.mjs";
import * as eot from "./opencode-eot.mjs";
import { checkAnswer } from "./opencode-ledger-check.mjs";
import { mark as markNote, claim as claimItem, done as doneItem, read as readNotes, noteFor, stateFor, turnsFile, writeTurnsFile, turnsOf, root as notesRoot, projectKey, projectRoot, plans as workPlans, scent as scentNote, scentsOf, stuckScents, scentClose, releaseAnswered, releaseByMerge, releaseByQuestion, releaseNested, ident as identTask, universeInfo } from "./opencode-worknotes.mjs";
import { metaWorkerTick, runEcology } from "./opencode-ecology.mjs";
import { selfCheck } from "./opencode-self-monitor.mjs";
import { planNext } from "./opencode-plan.mjs";
import { dream as dreamPass } from "./opencode-dream.mjs";
import { layers, renderLayersHtml } from "./opencode-layers.mjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lookNote, projectHistory } from "./opencode-context.mjs";
import { recordTurnsToWeft } from "./opencode-weft-record.mjs";
import { findInWeft, findInWeftSemantic } from "./opencode-weft-find.mjs";
import { archonNote, opennessNote } from "./opencode-archons.mjs";
import { memoryNote } from "./opencode-memory.mjs";
import { blocks as recordBlocks } from "./opencode-record.mjs";
import { DELTA_ON, measure as measureDelta, rankTurns } from "./opencode-delta.mjs";
import { STAKES_ON, stakeCheck } from "./opencode-stakes.mjs";
import { ETHOS_ON, ethosShadow } from "./opencode-ethos.mjs";
import { PATHOS_ON, pathosPass } from "./opencode-pathos.mjs";
import * as remember from "./opencode-remember.mjs";
import { connect as matrixConnect } from "./fold-matrix.mjs";
import { connect as driveConnect } from "./fold-gdrive.mjs";
import { perceiveMedia, probeBackends, PERCEIVE_VERSION } from "./khora/perceive/local.mjs";
import { perceiveMany as senseMany, huntOrgans, organStanding } from "./senses/registry.mjs";
import { cube as cubeEvent, cubeMap } from "./opencode-cube.mjs";
import * as cube from "./native/kernel/cube.js";
import { makeStandingCube, cellForFlag } from "./native/the-fold/standing-cube.js";
import { actOf as workplanActOf } from "./native/organs/workplan-acts.js";
// THE LANE PASS (opencode-lane.mjs): the reason-gate (II.9) + the language leg
// on the door's context path. Additive — it classifies the current ask and
// hands the window a typed <fold-lane> block; it changes no turn and reroutes
// no model traffic. The heavy parts (the parser, the mechanism list) are warmed
// OFF the request path below and budgeted per call.
import { LANE_ON, lanePass, warm as warmLane } from "./opencode-lane.mjs";
// THE SHAPE CHECK (opencode-shape.mjs): every hunt act declares its cube cell
// (surf-types.js), checked against the void's declared shape — a wrong-shaped
// hunt is a typed gap, never a silent miss.
import { shapeOf, checkShape } from "./opencode-shape.mjs";
// THE STANDING CUBE (native/the-fold/standing-cube.js): where a reply's claim stands, and which cell
// a failed claim is owed to. Generated from the cube; read-only here, never a model.
const STANDING = makeStandingCube({ operators: cube });

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Siblings (penelope, janus, Zenodotus) live beside the stack on a dev box; under launchd the
// stack is ~/.khora and the box's siblings sit elsewhere. FOLD_SIBLINGS_DIR names where to look
// (default: beside the stack). A missing sibling stays a typed gap (fails open), never an error.
const SIBLINGS = process.env.FOLD_SIBLINGS_DIR ?? path.resolve(HERE, "..");
const STATE = process.env.FOLD_OPENCODE_STATE ?? path.join(HERE, "state", "opencode");
// THE RELEASE KILL SWITCH — the falsifier's control. FOLD_RELEASE=0 keeps the deposits but disables every
// mechanical release (arrival / prose / merge / wall), reproducing the pre-release amplification for an A/B.
const releaseOn = () => process.env.FOLD_RELEASE !== "0";
// Warm the lane's parser + mechanism list once, off the request path, so the
// first context turn does not pay the 16 MB parser load. Fire-and-forget; a
// missing parser is a typed gap on the lane, never a boot failure.
if (LANE_ON()) warmLane().catch(() => {});

// THE MECHANICAL FOLD — penelope/organs/fold-note.mjs, the shared capacity every fold-suite surface uses (it folds
// a session's turns to a bounded note: threads + derivation). Reached lazily and failing open: a missing sibling is
// a typed gap (an empty note), never a broken turn. The door is where the surfaces meet, so it is wired here.
let _foldNote = null;
async function foldNoteOf(turns, ask, opts) {
  if (_foldNote === null) {
    try {
      _foldNote = (await import(path.join(SIBLINGS, "penelope", "organs", "fold-note.mjs"))).foldNote;
    } catch {
      _foldNote = false;
    }
  }
  return _foldNote ? _foldNote(turns, ask, opts) : "";
}
const RECORD = path.join(STATE, "record.jsonl");
const LEDGER = path.join(STATE, "savings.json");
// The record also rides to the account's Matrix room as EODB operators (fold-matrix.mjs)
// once `login` has run on this box; before that, or offline, it is purely local.
const matrix = matrixConnect({ state: STATE });
const drive = driveConnect({ state: STATE }); // the same record, sealed, in Google Drive's hidden app folder
const RECALL = (process.env.FOLD_RECALL ?? "1") !== "0";
// The user-memory surface: facts about the operator, injected when the ask's
// own words bear on them. Mechanical word overlap, no model, milliseconds.
// FOLD_MEMORY=0 removes it; the store lives at ~/.config/opencode/user-memory.md.
const MEMORY_ON = (process.env.FOLD_MEMORY ?? "1") !== "0";
// The other two standing stores the Remember window writes (opencode-remember.mjs):
// refs — addresses the system may read on demand; system — prompt text attached
// to asks like this one. Both are injected by need, never wholesale. FOLD_REFS=0
// / FOLD_SYSTEM=0 removes one; the stores live at ~/.config/opencode/{user-refs.md,
// system-prompts.json}.
const REFS_ON = (process.env.FOLD_REFS ?? "1") !== "0";
const SYSTEM_ON = (process.env.FOLD_SYSTEM ?? "1") !== "0";
// Step 1 of the doorway plan (archon-aware context): FOLD_ARCHONS=1 injects
// the archon ground note into the context answer. Default 0 is shadow — the
// decision is computed and recorded on every turn, but never injected, so a
// held A/B can measure cost and coverage before anything ships.
const ARCHONS_ON = () => (process.env.FOLD_ARCHONS ?? "0") !== "0";
// THE POWER OF OPENNESS — unlocked. The AntiStrauss openness teaching (the
// plain reading, humility, and knowing yourself) is injected into EVERY turn by
// default, so a coder entering this sphere is met with it. FOLD_OPENNESS=0
// removes it; the teaching is small, fixed, and grounded in the canon, never a
// hit and never a verdict.
const OPENNESS_ON = () => (process.env.FOLD_OPENNESS ?? "1") !== "0";
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
const counters = { titlesLocal: 0, titlesFailed: 0, recallsServed: 0, turnsRecorded: 0, looksServed: 0, looksDeclined: 0, projections: 0, projectionGaps: 0, memoriesServed: 0, refsServed: 0, systemServed: 0 };

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
    turn = { sessionID, ask: "", address: null, model: null, steps: 0, tools: new Map(), answer: "", tokens: blankTokens(), cost: 0, startedAt: Date.now(), touched: Date.now(), recalled: false, projectedChars: 0, system: null, look: null, project: null, title: null, archons: null, memory: null, refs: null, systemPrompt: null };
    sessions.set(sessionID, turn);
  }
  turn.touched = Date.now();
  return turn;
}

function readRecord() {
  try {
    return fs.readFileSync(RECORD, "utf8").split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch { return []; }
}

// ONLY THE DMD + SLEEP CLEANING (2026-10-16). The record keeps only the DIFFERENCE THAT MAKES A
// DIFFERENCE: a turn that carries nothing the last recorded turn for the same address lacked — the
// same plan, settled outcome, recall, injected notes and answer — is a repetition, and is not appended.
// When the door has been idle for FOLD_SLEEP_MS it compacts the file, dropping those repetitions, so a
// long session folds to its differences rather than its "did it again"s.
const SLEEP_MS = Number(process.env.FOLD_SLEEP_MS ?? 30 * 60_000);
// The DMD is the OUTCOME of the work — what was done and how it ended — not the prompting that produced
// it: a repeat answered the same way through a recall carries no new difference, so `recalled`/`system`
// are deliberately NOT compared.
const DMD_FIELDS = ["address", "plan", "settled", "answer"];
const dmdSame = (a, b) =>
  !!a && !!b && a.sessionID === b.sessionID && DMD_FIELDS.every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));

let appended = null;
const lastRow = () => appended;
let sleepTimer = null;

// SLEEP CLEANING: idle -> compact. Per address the last row stands; a row identical in the DMD fields to
// the last kept row for its address is a repetition and drops. Atomic rewrite; cleaning never blocks a turn.
function compactRecord() {
  try {
    const rows = readRecord();
    const byAddr = new Map();
    const kept = [];
    for (const r of rows) {
      if (r.address && dmdSame(byAddr.get(r.address), r)) continue;
      if (r.address) byAddr.set(r.address, r);
      kept.push(r);
    }
    if (kept.length === rows.length) return;
    const tmp = `${RECORD}.tmp`;
    fs.writeFileSync(tmp, kept.map((r) => JSON.stringify(r)).join("\n") + (kept.length ? "\n" : ""));
    fs.renameSync(tmp, RECORD);
  } catch { /* cleaning never blocks a turn */ }
}
function scheduleSleep() {
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(compactRecord, SLEEP_MS);
  sleepTimer.unref?.();
}
const DREAM_IDLE_MS = Number(process.env.FOLD_DREAM_IDLE_MS ?? 30 * 60_000);
let dreamTimer = null;
function runDream() {
  try {
    const base = notesRoot();
    if (!fs.existsSync(base)) return;
    for (const d of fs.readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory() || !identTask(d.name)) continue;
      try { dreamPass({ task: d.name }); } catch { /* dream never blocks */ }
    }
  } catch { /* never blocks */ }
}
function scheduleDream() {
  clearTimeout(dreamTimer);
  dreamTimer = setTimeout(() => { runDream(); scheduleDream();
const META_IDLE_MS = Number(process.env.FOLD_META_EVERY_MS ?? 60 * 1000);
let metaTimer = null;
function runMeta() {
  try {
    const base = notesRoot();
    if (!fs.existsSync(base)) return;
    for (const d of fs.readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory() || !identTask(d.name)) continue;
      try { metaWorkerTick({ task: d.name }); } catch { /* never blocks */ }
    }
  } catch { /* never blocks */ }
}
function scheduleMeta() {
  clearTimeout(metaTimer);
  metaTimer = setTimeout(() => { runMeta(); scheduleMeta(); }, META_IDLE_MS);
  metaTimer.unref?.();
}
scheduleMeta(); }, DREAM_IDLE_MS);
  dreamTimer.unref?.();
}
scheduleDream();
function append(row) {
  if (dmdSame(appended, row)) return appended; // carries no difference: not recorded
  appended = row;
  fs.mkdirSync(STATE, { recursive: true });
  fs.appendFileSync(RECORD, JSON.stringify(row) + "\n");
  scheduleSleep();
}
try { appended = readRecord().at(-1) ?? null; } catch { appended = null; }
if (appended) scheduleSleep();

// ── savings ledger ───────────────────────────────────────────────────────
// The counter the operator reads. Chars are measured; tokens are chars/4 and
// say so; dollars move only on fold/title rows that carried a priceIn from
// the running model's own catalog entry.
const blankLedger = () => ({
  since: new Date().toISOString(),
  projections: 0,
  projectedChars: 0, // chars of earlier exchanges left out of a request (the Houdini drop and the surf cut), measured on the sizes the client sent
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

// The context event answers five things, each an existing organ:
//   system   the hunt-first recall of an exact repeat ask (the record)
//   look     LOOK: the places the ask's own words point at, as addresses
//   project  HOUDINI: which earlier exchanges ride, and the record that stands
//            in for the rest. Decided once per ASK; the client holds the
//            decision for the turn's steps so the request prefix is stable.
//   memory   the USER-MEMORY surface: facts about the operator the ask's own
//            words bear on, injected read-only (opencode-memory.mjs). Mechanical
//            word overlap, no model, milliseconds; FOLD_MEMORY=0 removes it.
//   archons  the archon ground note (opencode-archons.mjs): matchArchons over
//            the ask, dossier-gated, top 2 hits, ≤600 chars. Computed and
//            recorded on every turn; injected into the answer only when
//            FOLD_ARCHONS=1 (default 0 is shadow).
async function onContext(body) {
  const turn = turnFor(body.sessionID);
  turn.ask = String(body.ask ?? "");
  turn.address = addressOf(turn.ask);
  turn.model = body.model ?? turn.model;
  if (body.workspace || body.task) turn.task = taskFor(body, String(body.sessionID ?? ""));
  if (body.workspace) turn.workspace = String(body.workspace);
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
  // The project's commons: publish this agent's settled turns, then read the others' through
  // Houdini against this ask. Computed every turn so a first-turn agent hears the others too.
  if (turn.ask.trim() && (body.workspace || body.task)) {
    const agent = String(body.sessionID ?? "");
    const task = taskFor(body, agent);
    if (Array.isArray(body.turns)) writeTurns({ task, agent, turns: body.turns });
    try { const commons = await commonsNote({ task, agent, ask: turn.ask }, { prosify: commonsProsify }); if (commons) { out.commons = commons; turn.commons = commons.length; } } catch { /* never blocks */ }
  }
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
  // The power of openness: the standing AntiStrauss teaching, injected into
  // every turn by default so a coder entering is met with it. Mechanical, small,
  // grounded in the canon — never a hit, never a verdict. Fail-open.
  if (OPENNESS_ON()) {
    const op = await opennessNote();
    turn.openness = op.note
      ? { handle: op.handle, groundRef: op.groundRef, chars: op.chars, injected: true }
      : { gap: op.gap, ...(op.why ? { why: op.why } : {}), injected: false };
    if (op.note) out.openness = { note: op.note, handle: op.handle, groundRef: op.groundRef, chars: op.chars };
  }
  // The operator's own facts: read from the user-memory surface and injected
  // when the ask's words bear on them. Mechanical word overlap — no model, no
  // guess, milliseconds. A missing store or no match is a typed gap (nothing
  // injected), recorded so the audit can disclose what the door kept out.
  const mem = MEMORY_ON ? memoryNote(turn.ask) : { gap: "off" };
  if (mem.note) { counters.memoriesServed++; out.memory = mem.note; turn.memory = mem.note; }
  else turn.memory = mem.gap ?? null;
  // Refs: addresses the operator gave the system, injected when the ask's own
  // words bear on one. The source is named; its bytes are read on demand (the
  // snip tool), never carried in the note. Mechanical word overlap, no model.
  const refs = REFS_ON ? remember.noteFor("refs", turn.ask) : { gap: "off" };
  if (refs.note) { counters.refsServed++; out.refs = refs.note; turn.refs = refs.note; }
  else turn.refs = refs.gap ?? null;
  // System: standing prompt text the operator attached to asks like this one,
  // injected only when it bears — never every prompt. Same mechanical match.
  const system = SYSTEM_ON ? remember.noteFor("system", turn.ask) : { gap: "off" };
  if (system.note) { counters.systemServed++; out.systemPrompt = system.note; turn.systemPrompt = system.note; }
  else turn.systemPrompt = system.gap ?? null;
  // The swarm's learning: what the ants already measured on this task, injected when
  // the ask's own words bear on it. A mechanical read of the swarm's own marks — no
  // model, no guess; the standing the swarm measured rides with each finding.
  if (turn.ask.trim() && (body.workspace || body.task)) {
    const swarmNote = swarmFindingsNote({ task: taskFor(body, String(body.sessionID ?? "")), ask: turn.ask });
    if (swarmNote) { out.swarm = swarmNote; turn.swarm = swarmNote; }
  }
  // THE LANE: the reason-gate's classification of THIS ask + the language leg's
  // grounding disclosure, computed once and injected only when it arrives (the
  // plugin carries no gate logic). Budgeted — a slow first load yields a typed
  // gap, never a stalled turn. Additive: it changes no turn.
  if (LANE_ON() && turn.ask.trim()) {
    const lane = await lanePass({ ask: turn.ask, budgetMs: Number(process.env.FOLD_LANE_MS ?? 800) });
    if (lane?.block) { out.lane = lane.block; turn.lane = lane.lane ?? null; }
    else turn.lane = lane?.gap ?? "off";
    // THE VOID'S SHAPE: a generation ask declares the void's cells (what the
    // piece owes) and takes the shape the hunt must occupy from the first cell —
    // the constraint the shape check enforces on every tool call (a wrong-shaped
    // hunt is a typed gap, never a silent miss). Disclosed; a missing organ is a
    // typed gap, never a guessed shape.
    if (lane?.demand) {
      try {
        // THE TOPIC IS THE ASK'S SUBJECT PHRASE, never the raw ask — khora's own
        // topicPhrase (proxy-runner.mjs), the same one the prose pipeline uses.
        const { topicPhrase } = await import("./proxy-runner.mjs");
        const { voidCellsFor } = await import("./native/the-fold/document-ledger.js");
        const topic = topicPhrase(turn.ask);
        const { cells } = voidCellsFor({ topic, question: turn.ask });
        if (cells?.length) {
          // THE SHAPE IS THE FIRST UNMET CELL THAT REQUIRES REACHING. The void's
          // cells are what the piece owes; the receive cells (NUL — mark the
          // subject off, name it, kind it) are settled by what is handed over,
          // not reached for, so the hunt's shape is the first cell whose operator
          // is a reach op (scout / snip / admit / bind). The shape check holds
          // every tool call to it.
          const HUNT_OPS = new Set(["SIG", "SEG", "INS", "CON"]);
          const need = cells.find((c) => HUNT_OPS.has(c.op)) ?? cells[0];
          turn.shape = need.op;
          turn.shapeCell = `${need.op}·${need.grain}`;
          turn.topic = topic;
          turn.void = cells.slice(0, 8).map((c) => ({ cell: `${c.op}·${c.grain}`, question: c.question }));
        }
      } catch { /* a missing organ is a typed gap */ }
    }
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

// MECHANICAL TRACES (zero prompt cost). An agent that edits a file leaves a claim on it, made by the
// system from the tool event, not by asking the model to write anything. The claim decays (a TTL,
// never `done`), so it is a trace, not a lock. Contention (another live agent holds the path) is
// recorded as a `block` mark that surfaces in the other agents' next note; nothing is refused.
const EDIT_TOOLS = /^(?:edit|write|multiedit|patch|apply_patch|str_replace\w*|notebookedit)$/i;
const CLAIM_TTL_MS = Number(process.env.FOLD_FILE_CLAIM_TTL_MS ?? 10 * 60_000);
// THE WORK TREE LOG. Every file transformation a tool makes is an EOT `edit` event with its bytes stored once
// (opencode-eot.mjs). Single-file tools are captured exactly (before read at `called`, after read at `success`);
// anything whose writes we cannot name (bash, patches) is swept from disk by mtime. Never blocks a turn.
const ONE_FILE_TOOLS = /^(?:edit|write|multiedit|str_replace\w*)$/i;
const SWEEP_TOOLS = /^(?:bash|shell|exec|patch|apply_patch)$/i;
const realOf = (file) => {
  try { return fs.realpathSync(file); } catch { /* new file */ }
  try { return path.join(fs.realpathSync(path.dirname(file)), path.basename(file)); } catch { return file; }
};
// The fork clips a tool's input to a JSON STRING before it leaves the process (fold.ts clip), and a
// string clipped past the cap is not parseable JSON. An object arrives only from clients that send
// the shape raw. Parse once here — the boundary that owns the value — so every reader below sees an
// object or null and never re-checks; a string that will not parse stays null (a typed nothing, never a guess).
function parseToolInput(input) {
  if (input && typeof input === "object") return input;
  if (typeof input !== "string") return null;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}
function traceStart(sessionID, turn, tool) {
  const name = String(tool?.name ?? "");
  tool.t0 = Date.now();
  if (!ONE_FILE_TOOLS.test(name)) return;
  const input = tool.input && typeof tool.input === "object" ? tool.input : null;
  const file = input?.filePath ?? input?.file_path ?? input?.path ?? null;
  if (typeof file !== "string" || !path.isAbsolute(file)) return;
  const real = realOf(file);
  let before = null; try { before = fs.readFileSync(real); } catch { /* new file */ }
  tool.trace = { file: real, before };
}
function traceEnd(sessionID, turn, tool) {
  const name = String(tool?.name ?? "");
  const task = turn.task ?? sessionTask.get(sessionID);
  if (!task) return;
  const ok = tool.ok === true;
  if (tool.trace && ok) {
    const root = projectRoot(tool.trace.file);
    if (!root) return;
    let after = null; try { after = fs.readFileSync(tool.trace.file); } catch { /* deleted */ }
    eot.recordEdit({ task, agent: sessionID, root, file: tool.trace.file, before: tool.trace.before, after, tool: name, universe: universeOf(body) });
  } else if (SWEEP_TOOLS.test(name)) {
    const cmd = tool.input && typeof tool.input === "object" ? String(tool.input.command ?? tool.input.cmd ?? name) : name;
    eot.recordExec({ task, agent: sessionID, command: cmd, ok, cwd: turn.workspace ?? null, tool: name });
    const root = turn.workspace ? realOf(turn.workspace) : null;
    if (root && tool.t0) {
      const swept = eot.sweepEdits({ task, agent: sessionID, root, since: tool.t0, tool: name });
      // THE STIGMERGIC PAIR for swept writes: the sweep deposited the edit claims in the EOT (the
      // ledger's one store); the medium gets the same items, so the file-readers (the plans panel,
      // a legacy stateFor) show the same ledger, never a second one.
      if (swept?.ok && Array.isArray(swept.claimed))
        for (const rel of swept.claimed) { try { claimItem({ task, agent: sessionID, item: `edit ${rel}`, ttlMs: CLAIM_TTL_MS }); } catch { /* the medium never blocks */ } }
    }
  }
  delete tool.trace;
}

// A worktree operation reached the bus: diff `git worktree list` against the tree's last known set and record
// each create/remove as a `wt` event (the mechanical read of what git now says, not a model's account of it).
function traceWorktrees(sessionID, turn, workspace) {
  const task = turn.task ?? sessionTask.get(sessionID) ?? taskFor({ workspace }, sessionID);
  if (!workspace || !task) return;
  let out = "";
  try { out = execFileSync("git", ["-C", workspace, "worktree", "list", "--porcelain"], { encoding: "utf8", timeout: 3000 }); } catch { return; }
  const now = new Map();
  let cur = null;
  for (const l of out.split("\n")) { if (l.startsWith("worktree ")) { cur = l.slice(9); now.set(cur, null); } else if (l.startsWith("branch ") && cur) now.set(cur, l.slice(7)); }
  const known = eot.projectTree(task).worktrees;
  for (const [dir, branch] of now) if (!known.has(dir)) eot.recordWorktree({ task, agent: sessionID, op: "create", directory: dir, branch });
  for (const dir of known) if (!now.has(dir)) eot.recordWorktree({ task, agent: sessionID, op: "remove", directory: dir });
}

function autoClaim(sessionID, turn, tool) {
  if (!EDIT_TOOLS.test(String(tool?.name ?? ""))) return;
  const input = tool.input && typeof tool.input === "object" ? tool.input : null;
  const file = input?.filePath ?? input?.file_path ?? input?.path ?? input?.file ?? null;
  if (typeof file !== "string" || !path.isAbsolute(file)) return;
  // the project root is real-pathed (macOS /var -> /private/var); so must the file be, including a
  // file a `write` is about to create (its directory is real-pathed, the basename kept)
  const real = (() => {
    try { return fs.realpathSync(file); } catch { /* new file */ }
    try { return path.join(fs.realpathSync(path.dirname(file)), path.basename(file)); } catch { return file; }
  })();
  const rootDir = projectRoot(real) ?? projectRoot(path.dirname(real));
  // projectKey needs an existing path; a `write` creating a NEW file has none, so the git root
  // (which rootDir already is) stands in — the claim fires from the first sight of the new path.
  const task = turn.task ?? projectKey(real) ?? (rootDir ? projectKey(rootDir) : null);
  if (!rootDir || !task) return;
  const rel = path.relative(rootDir, real);
  if (!rel || rel.startsWith("..")) return;
  sessionTask.set(sessionID, task);
  const r = claimItem({ task, agent: sessionID, item: `edit ${rel}`, ttlMs: CLAIM_TTL_MS });
  if (r.ok) { try { eot.recordClaim({ task, agent: sessionID, item: `edit ${rel}`, ttlMs: CLAIM_TTL_MS }); } catch { /* */ } }
  if (r.ok === false && r.holder && r.holder !== sessionID && !r.done) {
    try { eot.recordContention({ task, agent: sessionID, item: `edit ${rel}`, holder: r.holder }); } catch { /* the log never blocks */ }
    markNote({ task, agent: sessionID, kind: "block", text: `contended: ${rel} is held by ${r.holder}`, cell: workplanActOf("claim:contended").cell });
    turn.contended = (turn.contended ?? 0) + 1;
  }
}

// THE GUARD. What the model just said is typed against the log and the disk: a path that exists in
// neither, or a claim that checks pass with no witnessed passing check in the log, is a flag. Flags are
// system observations (mechanical); the words themselves stay model-origin. The next note carries them.
const answerCount = new Map(); // sessionID -> answers judged so far, so standing ids name the turn
function guardAnswer(sessionID, turn) {
  const text = String(turn.answer ?? "");
  if (text.length < 8) return;
  const task = turn.task ?? sessionTask.get(sessionID);
  if (!task) return;
  const r = eot.groundCheck({ task, text, root: turn.workspace ?? null });
  turn.flags = r.flags.slice(0, 4);
  turn.groundSummary = r.summary;
  // THE DRAFT, JUDGED. Janus gives each sentence of the answer a standing from the instrument above;
  // the counts ride the next note and the log keeps them (stage "reason"), the model's say-so never decides.
  try {
    const st = standingOf({ agent: sessionID, n: answerCount.set(sessionID, (answerCount.get(sessionID) ?? 0) + 1).get(sessionID), ground: r });
    turn.standing = { ...st.counts, refuted: st.refuted.slice(0, 3) };
    if (st.claims) eot.append({ task, agent: sessionID, stage: "reason", universe: universeOf(body), detail: { op: "SPIRAL", by: "khora:opencode-eot.groundCheck", counts: st.counts, refuted: st.refuted.slice(0, 6) } });
  } catch { /* the spiral never blocks a turn */ }
  if (r.flags.length) eot.append({ task, agent: sessionID, stage: "flag", universe: universeOf(body), detail: { flags: r.flags.slice(0, 6), summary: r.summary } });
}

// THE VISIBLE PROVENANCE, read off the standing cube: what the reply rests on (the ground summary),
// its verifiable failures, and WHERE each failed claim stands (the cell it is owed to). A flagged
// reply is a set-level standing (EVA·Pattern, across witnesses); a clean one is a figure judged
// through the lens (EVA·Figure). The cell's own nulls ride as what the reading watched for.
function standingFor(flags) {
  const cell = STANDING.interrogate("EVA", flags.length ? "Pattern" : "Figure");
  return { cell: cell.cell, meaning: cell.positive, watched: cell.nulls };
}
function reviewOf(turn) {
  const flags = (turn.flags ?? []).map((f) => ({ kind: f.kind, detail: f.detail ?? null, cell: cellForFlag(f.kind) }));
  return { summary: turn.groundSummary ?? null, flags, standing: standingFor(flags) };
}

// THE WORK TREE, asked: a fold of the log at a cursor. op: note | files | diff | drift | reconcile.
function onTree(body) {
  const task = taskFor(body, String(body.agent ?? body.sessionID ?? ""));
  const asOf = body.asOf ?? null, root = body.workspace ? realOf(String(body.workspace)) : null;
  switch (body.op ?? "note") {
    case "files": return { ok: true, files: [...eot.projectTree(task, { asOf }).files.values()].map(({ path: p, sha, bytes, agent, ts }) => ({ path: p, sha, bytes, agent, ts })) };
    case "diff": return { ok: true, ...eot.treeDiff(task, body.from ?? null, body.to ?? null) };
    case "drift": return root ? { ok: true, drift: eot.treeVsDisk(task, root) } : { ok: false, gap: "no-workspace" };
    case "reconcile": return root ? eot.reconcile({ task, agent: String(body.agent ?? body.sessionID ?? "door"), root }) : { ok: false, gap: "no-workspace" };
    case "event": return { ok: true, event: eot.eventDetail(task, String(body.id ?? "")) };
    case "materialize":
      // A write to an arbitrary local path: opt-in, like chase's FOLD_REC_EXEC. The dir is the panel's choice,
      // so the door refuses unless the operator turned writes on, and only then for an absolute existing path.
      if (process.env.FOLD_EOT_WRITE !== "1") return { ok: false, gap: "write-disabled" };
      { const dir = String(body.dir ?? ""); if (!path.isAbsolute(dir)) return { ok: false, gap: "bad-dir" }; return { ok: true, ...eot.materialize(task, dir, { asOf }) }; }
    default: return { ok: true, ...eot.projectTreeNote(task) };
  }
}

function onEvent(body) {
  const { type, data = {} } = body;
  if (type === "worktree.updated" || type === "worktree.resolved") {
    // a bus event, not a turn: it carries no session, only the workspace the plugin was loaded in
    try { traceWorktrees(String(body.sessionID ?? "worktree"), { task: body.task }, body.workspace); } catch { /* the log never blocks */ }
    return {};
  }
  if (!body.sessionID) return {};
  const turn = turnFor(body.sessionID);
  let review = null;
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
      tool.input = parseToolInput(data.input);
      // THE SHAPE CHECK: type the act's cell from its own declared domicile
      // (surf-types.js), and check it against the void's shape when one is
      // declared for this turn. A wrong-shaped hunt rides as a typed gap on the
      // tool — recorded, never blocking. A producing act (write/edit/run) is
      // not surf and carries no cell.
      try {
        const shape = shapeOf(tool.name);
        tool.cell = shape?.cell ?? null;
        if (shape && turn.shape) tool.shape = checkShape({ tool: tool.name, require: turn.shape });
      } catch { /* the shape table never blocks a turn */ }
      turn.tools.set(data.id, tool);
      try { autoClaim(body.sessionID, turn, tool); } catch { /* a trace is never worth a turn */ }
      try { traceStart(body.sessionID, turn, tool); } catch { /* the log never blocks */ }
      break;
    }
    case "session.tool.success":
    case "session.tool.failed": {
      const tool = turn.tools.get(data.id) ?? { name: "?", input: null, ok: null };
      tool.ok = type === "session.tool.success";
      turn.tools.set(data.id, tool);
      try { traceEnd(body.sessionID, turn, tool); } catch { /* the log never blocks */ }
      break;
    }
    case "session.text.ended":
      turn.answer = String(data.text ?? "");
      try { guardAnswer(body.sessionID, turn); } catch { /* the guard never blocks a turn */ }
      // the pathos pass (shadow, FOLD_PATHOS): the person undergoes the turn; a concession lands on the ledger, nothing is injected
      try { if (PATHOS_ON() && turn.task && turn.answer.trim()) pathosPass({ task: turn.task, text: turn.answer, turn: turn.steps }); } catch { /* never blocks a turn */ }
      // the reply's provenance, returned on the same post; the plugin draws it as a notice row.
      review = reviewOf(turn);
      break;
    default:
      break;
  }
  if (TURN_END.has(type)) finish(turn, type);
  return review ? { review } : {};
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
    memory: turn.memory,
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

// LIVE TTL: an in-memory turn is live only while its events arrive. A session whose server dies
// mid-turn (restart churn, a killed process) never sends the boundary, so its turn would show in
// the audit as "being prompted RIGHT NOW" forever. Silence past FOLD_LIVE_TTL_MS is the boundary:
// the turn finishes as interrupted (recorded honestly), never silently dropped.
const LIVE_TTL_MS = Number(process.env.FOLD_LIVE_TTL_MS ?? 30 * 60_000);
function sweepLive(now = Date.now()) {
  for (const turn of [...sessions.values()])
    if (now - (turn.touched ?? turn.startedAt) > LIVE_TTL_MS) finish(turn, "session.execution.interrupted");
}
setInterval(() => { try { sweepLive(); } catch { /* never blocks */ } }, 60_000).unref?.();

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
    memoriesServed: counters.memoriesServed,
    savings: {
      since: ledger.since,
      formulas: {
        projectedTokensEst: "projectedChars / 4 — GROSS: earlier exchanges/turns left out of a request (Houdini's drop and the surf cut), not net of anything the model then had to re-open",
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
  sweepLive();
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
      tools: [...turn.tools.values()].map((t) => ({ name: t.name, ok: t.ok, cell: t.cell ?? null, shape: t.shape ?? null })),
      recalled: turn.recalled,
      projectedChars: turn.projectedChars,
      startedAt: turn.startedAt,
      system: turn.system,
      look: turn.look,
      project: turn.project,
      title: turn.title,
      archons: turn.archons,
      memory: turn.memory,
      shape: turn.shape ?? null,
      shapeCell: turn.shapeCell ?? null,
      topic: turn.topic ?? null,
      void: turn.void ?? null,
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
      memory: r.memory ?? null,
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
// ── the document read: THE REAL READING PIPELINE (2026-10-18) ────────────────
// The door's document read used to be a word-overlap grep over the text's own
// sentences. It now reads through the ONE reader — native/the-fold/read-process
// .mjs::readToWeft (whole document, in order, primed from native/priors) — and
// grounds the turn in what the reader found: the CAST (the beings it admitted)
// and the ADDRESSED edges. The lexical pass only SELECTS which sources to read;
// the reading is the reader's. Model-free; the mouth is never consulted.
let _documentRead = null;
async function mechanicalRead(task, documents) {
  if (!_documentRead) _documentRead = await import("./native/the-fold/document-read.mjs");
  const docs = WS ? workspaceTexts() : Array.isArray(documents) && documents.length ? documents : [];
  return _documentRead.documentRead(task, docs);
}
async function startDocumentJob(body) {
  const jobId = String(body?.sessionId || body?.jobId || `hd-${Date.now().toString(36)}`);
  const { rows, projection } = await mechanicalRead(body?.task, body?.documents);
  jobs.set(jobId, { jobId, rows, projection, status: "complete", satisfaction: { ok: true, basis: "the canonical reading pipeline (readToWeft)" } });
  return { jobId, status: "complete" };
}

// ── prompt (verbatim audit) ───────────────────────────────────────────────
// The client forwards the exact assembled request body it is about to send the
// frontier. Stored verbatim, per session; served back by the audit. Nothing is
// embedded, scored, or rewritten.
function onPrompt(body) {
  const sessionID = body?.sessionID;
  if (!sessionID) return {};
  const text = String(body.body ?? "");
  const note = String(body.note ?? ""); // L1: the fold-index the model was actually handed this turn
  const when = new Date().toISOString();
  const sha = crypto.createHash("sha256").update(text).digest("hex");
  prompts.set(sessionID, { when, model: body.model ?? null, sha, note, body: text });
  while (prompts.size > 50) prompts.delete(prompts.keys().next().value);
  savePrompts();
  // (1) DISCLOSE PRECISELY WHAT THE MODEL WAS PROMPTED. The exact request body is content-addressed and appended
  // under the task, so the record PROVES it and any answer can cite it as `prompt#<sha16>`. Mechanical: the system
  // wrote the bytes it sent. A forged ref hashes to no file and is a typed gap, never a guess (the source cannot lie).
  try {
    const task = taskFor(body, sessionID);
    const pdir = path.join(notesRoot(), task, "prompts");
    fs.mkdirSync(pdir, { recursive: true });
    const blob = path.join(pdir, `${sha}.txt`);
    if (!fs.existsSync(blob)) fs.writeFileSync(blob, text);
    fs.appendFileSync(
      path.join(pdir, "index.jsonl"),
      JSON.stringify({ when, task, agent: sessionID, model: body.model ?? null, sha, ref: `prompt#${sha.slice(0, 16)}`, bytes: text.length, note: note.slice(0, 8000) }) + "\n",
    );
  } catch { /* disclosure never blocks a turn */ }
  return {};
}

// Read a disclosed prompt source back by its content address. The bytes ARE the sha's preimage; a wrong address
// resolves to nothing. This is how "what the model was prompted" becomes citable in an answer's composition.
function readPromptSource({ task, sha, ref }) {
  const pdir = path.join(notesRoot(), task, "prompts");
  let hit = null;
  try { for (const f of fs.readdirSync(pdir).filter((x) => x.endsWith(".txt"))) if (f.startsWith(sha)) { hit = path.join(pdir, f); break; } } catch { /* none */ }
  if (!hit) return { ok: false, gap: "not_found", ref };
  const bytes = fs.readFileSync(hit, "utf8");
  if (!crypto.createHash("sha256").update(bytes).digest("hex").startsWith(sha)) return { ok: false, gap: "hash_mismatch", ref };
  return { ok: true, ref, bytes, standing: "witnessed", provenance: { kind: "prompt", sha, from: "the request the model was sent" } };
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
// THE SEED, reported: the UDHR lexicons (the omnilingual mind seed) and the hyperlexicon that
// composes over them. Read from janus/priors beside this checkout; a missing seed is a typed gap
// in the handshake, never an error. Cached: the directory does not change under a running door.
let seedCache = null;
function seedStatus() {
  if (seedCache) return seedCache;
  const dir = process.env.FOLD_PRIORS_DIR ?? path.join(SIBLINGS, "janus", "priors");
  try {
    const files = fs.readdirSync(dir).filter((f) => /^udhr-.+\.lexicon\.json$/.test(f));
    const languages = files.map((f) => f.replace(/^udhr-/, "").replace(/\.lexicon\.json$/, "")).sort();
    const hl = fs.existsSync(path.join(HERE, "native", "kernel", "hyperlexicon.js"));
    seedCache = { udhr: { lexicons: languages.length, languages }, hyperlexicon: hl, dir };
  } catch (e) { seedCache = { udhr: { lexicons: 0, languages: [] }, hyperlexicon: false, gap: String(e.code ?? "unreadable") }; }
  return seedCache;
}

// The task a call belongs to: an explicit one wins, else the PROJECT the workspace
// belongs to (so every agent in one repository shares one medium), else the agent alone.
// An older client sends no workspace; the door then falls back to the project it already learned
// from that agent's own edits (sessionTask, set by autoClaim), and only then to the agent alone.
const sessionTask = new Map();
const taskFor = (body, agent) => {
  const t = body.task ? String(body.task) : null;
  return t && /^[\w.-]+$/.test(t) && t !== ".." ? t : (projectKey(body.workspace) ?? sessionTask.get(agent) ?? agent);
};
const universeOf = (body) => {
  const u = body?.universe ? String(body.universe) : (process.env.FOLD_UNIVERSE ?? "world");
  return /^[\w.-]+$/.test(u) && u !== ".." ? u : "world";
};

// THE COMMONS: what the OTHER agents of this project have settled, ingested and reasoned
// over before the model sees it. Their turns are read as addressed exchanges and put
// through Houdini against THIS agent's ask (projectHistory: which ride, which are
// recalled by a rare anchor, which become a gist); only that projection is injected.
// Never a raw relay of another agent's text.
let commonsProsify = null;
export const setCommonsProsify = (fn) => { commonsProsify = typeof fn === "function" ? fn : null; };
// PENELOPE AS PROSIFIER (the default; FOLD_COMMONS_PROSIFY=extractive turns it off). Penelope's text weave is the full
// arrangement pipeline, not a note-writer: it runs its own gates (a small ground is REFUSED for
// individuating no being), writes an HTML widget under penelope/organs/arrangement-out, and costs
// seconds. So it is accepted only when it returns prose it verified; anything else is null and the
// commons keeps the extractive, address-typed projection. After a miss it is not asked again for
// FOLD_PROSIFY_COOLDOWN_MS (default 60s), so a mouth that is down costs one wait, not one per turn.
let prosifyBackoffUntil = 0;
async function penelopeProsify(args) {
  if (Date.now() < prosifyBackoffUntil) return null;
  let text = null;
  try { text = await penelopeWeave(args); } catch { text = null; }
  if (!text) prosifyBackoffUntil = Date.now() + Number(process.env.FOLD_PROSIFY_COOLDOWN_MS ?? 60_000);
  return text;
}
async function penelopeWeave({ ask, ground }) {
  const api = path.join(SIBLINGS, "penelope", "organs", "generation", "api.mjs");
  if (!fs.existsSync(api)) return null;
  process.env.PENELOPE_MOUTH_URL ??= process.env.FOLD_PROSIFY_MOUTH ?? "http://127.0.0.1:11435";
  const { weave } = await import(api);
  const r = await weave({
    intent: `In plain sentences, tell another engineer what each agent has said that bears on: ${String(ask).slice(0, 200)}. Say only what is in the material, attributing each statement to its agent.`,
    artifact: "text", model: process.env.FOLD_CHASE_MODEL ?? "qwen2.5-coder:1.5b",
    context: { ground, material: ground.map((g) => `[${g.holder}] ${g.text}`).join("\n") },
  });
  const m = r?.materialization;
  const text = r?.ok === true ? (m?.text ?? m?.prose ?? (typeof m?.bytes === "string" ? m.bytes : null)) : null;
  return typeof text === "string" && text.trim() ? text : null;
}
if (!["extractive", "off"].includes(process.env.FOLD_COMMONS_PROSIFY ?? "")) commonsProsify = penelopeProsify;

const COMMONS_CHARS = Number(process.env.FOLD_COMMONS_CHARS ?? 600);
const COMMONS_SENTENCE_CHARS = Number(process.env.FOLD_COMMONS_SENTENCE_CHARS ?? 150);
const COMMONS_MAX_SENTENCES = Number(process.env.FOLD_COMMONS_SENTENCES ?? 4);
const NOTE_CHARS = Number(process.env.FOLD_NOTE_CHARS ?? 700);
async function commonsNote({ task, agent, ask }, { prosify = null } = {}) {
  const fromLog = (() => { try { return eot.turnsFromLog(task); } catch { return []; } })();
  const theirs = (fromLog.length ? fromLog : turnsOf({ task, universe: universeOf(body) })).filter((t) => t.agent !== agent);
  if (!theirs.length) return "";
  const exchanges = theirs.map((t) => ({
    id: `${t.agent}#${t.n}`, q: t.ask, a: t.text, chars: (t.ask?.length ?? 0) + (t.text?.length ?? 0),
    files: t.tools, failed: 0, open: false, holder: t.agent,
  }));
  const projected = await projectHistory({ ask, exchanges: exchanges.map((e) => ({ ...e, q: `[${e.holder.slice(0, 12)}] ${e.q}` })) });
  const keepIds = new Set(projected.keep ?? []);
  const byHoudini = projected.gap ? exchanges.slice(-3) : exchanges.filter((e) => keepIds.has(e.id));
  // NO STANDPOINT IS SILENCED BY SELECTION. Houdini weighs a term at zero when the thread says it in
  // half its units, so on a small or single-topic thread it keeps only the recent suffix and an
  // agent's matching standpoint would vanish. Selection may rank; it may not erase a holder: each
  // agent's best-matching turn (term overlap with the ask, ties to the most recent) always rides.
  const askTerms = new Set(String(ask).toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []);
  const overlap = (e) => (`${e.q} ${e.a}`.toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []).filter((w) => askTerms.has(w)).length;
  const bestPerHolder = [...new Set(exchanges.map((e) => e.holder))].map((h) =>
    exchanges.filter((e) => e.holder === h).reduce((best, e, i) => (best === null || overlap(e) >= overlap(best) ? e : best), null));
  const chosen = new Map(byHoudini.map((e) => [e.id, e]));
  for (const e of bestPerHolder) if (e) chosen.set(e.id, e);
  const picked = [...chosen.values()].sort((a, b) => exchanges.indexOf(a) - exchanges.indexOf(b)).slice(-8);

  // PERSPECTIVE LAW (antistrauss.mjs PERSPECTIVAL): engagement cannot invalidate a perspective,
  // only contextualize it. Each projected turn is HELD by the agent that settled it (kernel/
  // perspective.js, basis "asserted"), kept apart, never merged into this agent's own facts.
  // Material is scanned as non-user text: hits are contextualized (counted, never dropped).
  let held = [], conflicts = [], contextualized = 0;
  try {
    const { projectPerspectives, perspectiveOperation, divergence, BASIS, STANCE } = await import("./native/kernel/perspective.js");
    // A flat negation is a refusal of the same claim, not a different claim: the claim is keyed on its content stems
    // (negation words and auxiliaries removed), the stance is REFUSES when the sentence carries a received negation word.
    const { NEGATION_WORDS } = await import("./native/adapters/text/priors.js");
    const AUX = new Set(["do", "does", "did", "is", "are", "was", "were", "will", "would", "can", "could", "should", "has", "have", "had", "the", "a", "an"]);
    const toks = (s) => String(s).toLowerCase().replace(/n't\b/g, " not").match(/[a-z0-9_]+/g) ?? [];
    const negated = (s) => toks(s).some((w) => NEGATION_WORDS.has(w) || NEGATION_WORDS.has(`${w}n't`));
    const claimKey = (s) => toks(s).filter((w) => w.length > 2 && !AUX.has(w) && !NEGATION_WORDS.has(w) && w !== "not").map((w) => w.slice(0, 4)).join(" ");
    const textOfKey = new Map();
    const ops = picked.map((e) => {
      const text = String(e.a).replace(/\s+/g, " ").slice(0, 160) || e.q;
      if (!textOfKey.has(claimKey(text) || text)) textOfKey.set(claimKey(text) || text, text);
      return perspectiveOperation({
        holder: `holder:${e.holder}`, claim: claimKey(text) || text, claimText: text,
        stance: negated(text) ? STANCE.REFUSES : STANCE.HOLDS, basis: BASIS.ASSERTED, witness: e.id,
      });
    });
    const view = projectPerspectives(ops.map((op, seq) => ({ ...op, seq })));
    held = picked.map((e) => ({ holder: e.holder, q: e.q, id: e.id }));
    const holders = [...new Set(picked.map((e) => e.holder))];
    for (let i = 0; i < holders.length; i++) for (let j = i + 1; j < holders.length; j++) {
      const d = divergence(view, `holder:${holders[i]}`, `holder:${holders[j]}`);
      for (const c of d?.conflicting ?? []) conflicts.push({ a: holders[i], b: holders[j], claim: textOfKey.get(c.claim) ?? c.claim });
    }
  } catch { held = picked.map((e) => ({ holder: e.holder, q: e.q, id: e.id })); }
  try {
    const { scopeScan } = await import("./native/the-fold/antistrauss.mjs");
    contextualized = scopeScan(picked.map((e) => ({ role: "assistant", content: e.a }))).contextualized.length;
  } catch { /* the scan is a disclosure, never a gate here */ }

  // THE HOLOGRAPH TYPES WHAT THE MODEL IS HANDED. Every picked sentence is a ground fact with its
  // address (<agent>.turns.md#t<turn>.s<sentence>). The prose that rides is either the extractive
  // projection (each sentence IS its ground, so each carries its address) or a prosifier's rewrite
  // (penelope's mouth, injected), and is then typed against that ground: a sentence carrying a
  // ground fact's ends keeps its address; one that carries none is the mouth's own and is marked
  // [M], never laundered into the record (output-holograph.js, the facing-page law).
  let typedLines = null, voice = "extractive", s_voidClaims = 0;
  try {
    const { segmentSentences } = await import("./native/the-fold/admission.js");
    const { holographType } = await import("./native/organs/output-holograph.js");
    const rows = [];
    for (const e of picked) {
      const n = Number(String(e.id).split("#")[1] ?? 0);
      segmentSentences(String(e.a)).slice(0, 6).forEach((sent, i) => {
        const text = String(sent?.text ?? sent).trim();
        if (text.length > 1) rows.push({ end1: text, label: "states", end2: "", source: `${e.holder}.turns.md`, span: { start: `t${n}.s${i}` }, holder: e.holder });
      });
    }
    let prose = null;
    if (typeof prosify === "function" && rows.length) {
      try { prose = await Promise.race([prosify({ ask, ground: rows.map((r) => ({ holder: r.holder, text: r.end1, address: `${r.source}#${r.span.start}` })) }), new Promise((res) => setTimeout(() => res(null), Number(process.env.FOLD_PROSIFY_MS ?? 8000)))]); } catch { prose = null; }
      if (typeof prose === "string" && prose.trim()) voice = "prosified"; else prose = null;
    }
    const sourceText = prose ?? rows.map((r) => r.end1).join(" ");
    const typed = holographType({ prose: sourceText, ground: rows, splitSentences: (t) => segmentSentences(t).map((x) => x?.text ?? x), source: "commons" });
    // A sentence only counts as grounded when it carries enough of a ground fact: carry < 0.3 is
    // the mouth's own prose (disclosed, not silently blended).
    typedLines = typed.prose.map((t) => (t.ground === "material" && t.carry >= 0.3 && t.ref ? `${t.text} ⟨${t.ref}⟩` : `${t.text} [M]`));
    s_voidClaims = typed.prose.filter((t) => t.voidClaim).length;
  } catch { typedLines = null; }
  // TINY BY CONSTRUCTION. No explanatory prose (the attribute `held-apart` says it), no repeated
  // sentence (an agent re-stating itself costs the model once), at most MAX sentences each clipped,
  // addresses shortened to <agent8>#t<turn>.s<i>. Conflicts ride first: they are what needs saying.
  const short = (ref) => String(ref).replace(/^ses_([0-9a-z]{8})[0-9a-z]*\.turns\.md#/i, "$1#").replace(/\.turns\.md#/, "#");
  const seenText = new Set();
  const sentences = [];
  for (const l of (typedLines ?? picked.map((e) => `${String(e.a).replace(/\s+/g, " ").slice(0, 160)} ⟨${e.holder}.turns.md#${e.id.split("#")[1] ? `t${e.id.split("#")[1]}.s0` : "t0.s0"}⟩`))) {
    const text = l.replace(/\s*⟨[^⟩]*⟩\s*$/, "").replace(/\s*\[M\]\s*$/, "").trim().toLowerCase();
    if (!text || seenText.has(text)) continue;
    seenText.add(text);
    sentences.push(l.replace(/⟨([^⟩]*)⟩/, (_m, r) => `⟨${short(r)}⟩`).slice(0, COMMONS_SENTENCE_CHARS));
  }
  const holders = [...new Set(picked.map((e) => e.holder))].map((h) => String(h).replace(/^ses_/, "").slice(0, 8));
  const body = [
    `<fold-commons from="${holders.join(",")}">`,
    ...conflicts.slice(0, 2).map((c) => `! ${String(c.a).replace(/^ses_/, "").slice(0, 8)}≠${String(c.b).replace(/^ses_/, "").slice(0, 8)}: ${String(c.claim).slice(0, 100)}`),
    ...sentences.slice(0, COMMONS_MAX_SENTENCES).map((l) => `- ${l}`),
    "</fold-commons>",
  ].join("\n");
  return body.length > COMMONS_CHARS ? `${body.slice(0, COMMONS_CHARS - 16)}\n</fold-commons>` : body;
}

// This agent's settled turns, single-writer, so the others can read them.
function writeTurns({ task, agent, turns }) {
  try { if (turns.length) eot.recordTurns({ task, agent, turns, universe: universeOf(body) }); } catch { /* the log never blocks a turn */ }
  const file = turnsFile(task, agent);
  if (!file || !turns.length) return null;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeTurnsFile({ file, agent, turns });
    try { recordTurnsToWeft({ task, agent, turns, file }); } catch { /* the weft store never blocks a turn */ }
    return file;
  } catch { return null; }
}

// ── the cost gate's door side ────────────────────────────────────────────────────────────────────────────
const gateTracker = makeGateTracker({ ttlMs: Number(process.env.FOLD_CACHE_TTL_MS ?? 300_000), defaultCalls: Number(process.env.FOLD_GATE_CALLS ?? 4) });
function costGateFor({ body, agent, task, out, now = Date.now() }) {
  if (process.env.FOLD_COST_GATE === "0" || out.uncut || !Array.isArray(body.turns) || !body.turns.length) return null;
  const seen = gateTracker.observe({ session: agent, ask: String(body.ask ?? ""), now });
  // later calls of the ask keep the arm the first call took: switching mid-ask rewrites the prefix call one wrote
  if (!seen.first && seen.arm) return { decided: true, fire: seen.arm === "cut", arm: seen.arm, basis: "reused: the ask's first call decided", margin: null };
  const d = breakEven({
    removedChars: body.keptOutChars, noteChars: String(out.note ?? "").length, remainingCalls: seen.remainingCalls,
    priceIn: body.priceIn, priceCacheRead: body.priceCacheRead, priceCacheWrite: body.priceCacheWrite, cold: seen.cold, lastArm: seen.lastArm,
  });
  gateTracker.settle({ session: agent, arm: d.arm });
  try {
    eot.append({ task, agent, stage: "reason", universe: universeOf(body), detail: { op: "COST_GATE", by: "khora:opencode-cost-gate", arm: d.arm, fire: d.fire, decided: d.decided, margin: d.margin ?? null, costKeep: d.costKeep ?? null, costCut: d.costCut ?? null, inputs: { ...d.inputs, callsSource: seen.callsSource }, basis: d.basis } });
  } catch { /* the log never blocks a turn */ }
  return d;
}

async function onSurf(body) {
  const turns = Array.isArray(body.turns) ? body.turns : [];
  // SEMANTIC FALLBACK: only when the ask shares no term with the old turns (a synonym cue). The embedder is asked over the
  // turns' own vocabulary; down or slow, the ladder is built lexically exactly as before.
  let extraTerms = [];
  if (semanticOn() && turns.length) {
    const WORDS = /[\p{L}\p{N}_]{4,}/gu, SENT = /[^.!?\n]+[.!?]?/g;
    // each word with the sentence it was said in: a sentence carries what the work said about the word, a bare word almost nothing
    const vocab = new Map(), known = new Set();
    for (const t of turns) for (const text of `${t.ask ?? ""}. ${t.answer ?? ""}`.match(SENT) ?? []) {
      const s = text.trim();
      for (const w of s.toLowerCase().match(WORDS) ?? []) { known.add(w); if (s.length > 12 && vocab.size < 600 && !vocab.has(w)) vocab.set(w, s); }
    }
    const askWords = new Set(String(body.ask ?? "").toLowerCase().match(WORDS) ?? []);
    // only a TRUE lexical miss (no ask word appears anywhere in the history) asks the embedder
    if (askWords.size && ![...askWords].some((w) => known.has(w))) extraTerms = (await semanticTerms({ ask: String(body.ask ?? ""), vocab: [...vocab].map(([term, text]) => ({ term, text })) })).terms;
  }
  const surfMode = process.env.FOLD_SURF_MODE ?? "pointer";
  const rank = surfMode === "delta" ? rankTurns(task, {}) : null;
  let out = surfLadder({ ask: String(body.ask ?? ""), turns, extraTerms, mode: surfMode, rank });
  const agent = String(body.sessionID ?? "");
  const task = taskFor(body, agent);
  writeTurns({ task, agent, turns });
  // THE COST GATE (opencode-cost-gate.mjs): a cut rewrites the head of the request and burns the provider's
  // cached prefix, so it fires only when the tokens it keeps out of the remaining calls cost more than the cache
  // it throws away. Decided once per ask (the arm is reused for the ask's later calls), logged as an EOT event.
  // Not decidable (no prices, no measured chars) = the old behaviour, disclosed. FOLD_COST_GATE=0 turns it off.
  const gate = costGateFor({ body, agent, task, out });
  if (gate && !gate.fire) out = { note: "", rungs: [], chars: 0, mode: out.mode, uncut: true, gated: true };
  if (gate) out.gate = { arm: gate.arm, fire: gate.fire, decided: gate.decided, margin: gate.margin ?? null, basis: gate.basis };
  // THE SURF CUT, ledgered. The client measures the chars its own cut kept out of THIS request (the
  // older turns it spliced away) and reports them, so the savings ledger and the top-right tally
  // record the real reduction, not only the title calls. Counted like a Houdini drop (onContext);
  // GROSS per request, disclosed as an estimate, never net of what the model then re-opens.
  const kept = out.gated ? 0 : Number(body.keptOutChars);
  if (Number.isFinite(kept) && kept > 0) {
    turnFor(agent).projectedChars += kept;
    counters.projections++;
    const saved = readLedger();
    saved.projections++;
    saved.projectedChars += kept;
    if (body.priceIn !== undefined) countPrice(saved, kept, body.priceIn, "pricedProjections");
    writeLedger(saved);
  }
  // PRIORITY PACKING under one hard budget (FOLD_NOTE_CHARS). What is actionable first (what others
  // hold, what they raised), then the ladder, then the verified record. The marks cue rides once
  // per session, not every turn. The commons is NOT here: the context event already delivers it.
  // THE FIREWALL, at the prompt. MECHANICAL: what the system observed or snipped (claims by others,
  // contention, the witnessed record). SAID: what an agent or a model wrote (this agent's own ladder,
  // blocks others raised). Two tags, never interleaved; an agent's words never sit inside <fold-mechanical>.
  const mech = [], said = [];
  const short8 = (a) => String(a).replace(/^ses_/, "").slice(0, 8);
  let taken = [], contention = [], blocks = [], recordLines = [], lapsed = [];
  try {
    taken = eot.projectTaken(task, agent);
    contention = eot.projectContention(task, agent);
    blocks = eot.projectBlocks(task, agent);
    lapsed = eot.projectLapsed(task, agent);
    const rec = eot.projectRecord(task);
    recordLines = rec.slice(-3).map((r) => `${r.referent}: ${String(r.delta).slice(0, 80)}`);
  } catch { /* the files answer below */ }
    if (!taken.length && !blocks.length) { const st = stateFor({ task, agent, universe: universeOf(body) }); taken = st.taken; blocks = st.blocks; }
  if (!recordLines.length) { const legacy = recordNote({ task, limit: 3 }); if (legacy) recordLines = legacy.split("\n").slice(1, 4).map((l) => l.replace(/^-\s*/, "").slice(0, 100)); }
  if (taken.length) mech.push({ p: 1, t: `taken: ${taken.slice(0, 4).map((c) => `${c.item} [${short8(c.agent)}]${c.cell ? ` (${c.cell})` : ""}`).join("; ")}${taken.length > 4 ? ` +${taken.length - 4}` : ""}` });
  // THE OWED NULL, PAID, reaches the model: a claim that lapsed is a build that never completed — an
  // abandoned unit, named with its cell and its owed null (INS·Figure · INCOMPLETE), retakeable.
  if (lapsed.length) mech.push({ p: 1, t: `lapsed: ${lapsed.slice(0, 3).map((c) => `${c.item} [${short8(c.agent)}] (${c.cell} · ${c.null})`).join("; ")}${lapsed.length > 3 ? ` +${lapsed.length - 3}` : ""}` });
  for (const c of contention.slice(-2)) mech.push({ p: 2, t: c.holder === agent ? `contended: [${short8(c.contender)}] also edited ${c.item}` : `contended: ${c.item} held by [${short8(c.holder)}]` });
  // THE DREAM: a referent with two LIVE answers (a fork) is a disagreement — surfaced, never
  // collapsed. Computed from the record (no model); the dream never blocks a turn.
  try {
    const contests = dreamTask({ task }).settled.contests;
    if (contests.length) mech.push({ p: 2, t: `open disagreement: ${contests.slice(0, 2).map((c) => `${c.being}: ${c.readings.map((r) => r.value).join(" vs ")}`).join("; ")}`.slice(0, 200) });
  } catch { /* the dream never blocks a turn */ }
  if (recordLines.length) mech.push({ p: 4, t: `verified: ${recordLines.join("; ")}`.slice(0, 240) });
  // THE PLAN (M2): the next actionable goal from the EOT dependency graph, if any. A finding changes what
  // the local workers encounter next — the plan rides the mechanical note, not an agent-to-agent message.
  try { const next = planNext({ task }); if (next.ok && next.node) mech.push({ p: 3, t: `plan${next.node.cell ? ` [${next.node.cell}]` : ""}: ${String(next.node.goal).slice(0, 160)}` }); } catch { /* no plan never blocks */ }
  // OPEN FORKS (C3): a referent with two LIVE verified answers is a parallel fork, kept and never resolved.
  // Read-only (liveAnswers), surfaced so the discrepancy reaches the next turn, never auto-merged.
  try {
    const forks = [...liveAnswers(recordBlocks(task)).entries()].filter(([, list]) => list.length > 1);
    if (forks.length) mech.push({ p: 2, t: `fork: ${forks.slice(0, 2).map(([r, l]) => `${r} (${l.length} live answers)`).join("; ")}`.slice(0, 200) });
  } catch { /* no fork read never blocks */ }
  const turnState = turnFor(agent);
  if (turnState.flags?.length) mech.push({ p: 1, t: `unverified in your last answer: ${turnState.flags.slice(0, 3).map((f) => `${f.kind}${f.kind === "unknown_path" ? ` ${f.detail}` : ""}`).join("; ")}`.slice(0, 200) });
  if (turnState.standing && (turnState.standing.refuted.length || turnState.standing.unresolved)) mech.push({ p: 1, t: `standing of your last answer: ${turnState.standing.licensed} licensed, ${turnState.standing.refuted.length} refuted${turnState.standing.refuted.length ? ` (${turnState.standing.refuted.join(",")})` : ""}, ${turnState.standing.unresolved} untested` });
  for (const b of blocks.slice(-2)) said.push({ p: 2, t: `block [${short8(b.agent)}]: ${String(b.text).slice(0, 110)}` });
  if (!out.uncut) said.push({ p: 3, t: String(out.note ?? "").split("\n").slice(0, 5).join("\n").slice(0, 380) });
  // THE MECHANICAL FOLD (penelope/organs/fold-note.mjs): the turns folded to their threads — the shared capacity
  // every fold-suite surface uses, not a per-surface reimplementation.
  const folded = await foldNoteOf(turns, String(body.ask ?? ""), { budget: 500, threads: 4 });
  if (folded) said.push({ p: 3, t: folded });
  // THE WEFT: where in the raw turns the ask's own beings are (offsets into <agent>.turns.md, from the lean records).
  // A ref is an argument to SNIP, so it rides; the filesystem path it lives at does not — Gary's own rule (P55:
  // the mouth never sees an address), and a path changes no tool the model would call.
  try {
    const w = process.env.FOLD_WEFT === "0" ? null : await findInWeftSemantic({ ask: String(body.ask ?? ""), task, max: 3, root: notesRoot() });
    if (w?.hits.length || w?.conflicts.length) {
      const strip = (a) => a.slice(a.indexOf("/") + 1);
      const parts = [...w.hits.map((h) => strip(h.address)), ...w.conflicts.slice(0, 1).map((c) => `conflict ${c.relation.replace(/\|/g, " ")}: held ${strip(c.holds[0])} denied ${strip(c.denies[0])}`)];
      said.push({ p: 4, atomic: true, t: `weft: ${parts.join(" · ")}` });
    }
  } catch { /* the weft read never blocks a turn */ }
  // The marks cue is GONE (2026-10-16): autoClaim (this file, on every edit) already writes the claim mark and a
  // block on contention — the stack does the bookkeeping, the model never appends a line. The cue named a
  // filesystem path (P55) and narrated a format, and changed no tool the model would call. Only distinctions
  // that change the next call ride.
  const pack = (items, budget) => {
    let used = 0; const kept = [];
    for (const part of items.sort((a, b) => a.p - b.p)) {
      if (!part.t) continue;
      const room = budget - used - (kept.length ? 1 : 0);
      if (room <= 40) continue;
      if (part.atomic && part.t.length > room) continue; // an address cut in half points nowhere: drop the whole part
      const t = part.t.length > room ? `${part.t.slice(0, room - 1)}…` : part.t;
      kept.push(t); used += t.length + (kept.length > 1 ? 1 : 0);
    }
    return kept;
  };
  const mechKept = pack(mech, Math.floor(NOTE_CHARS * 0.45));
  const saidKept = pack(said, NOTE_CHARS - mechKept.join("\n").length - 60);
  // THE TRAIL (P1): the task's open questions, each anchored at the address it motivated. This is what lets a
  // folded window keep its INTENT — the next thought reads why the last drill happened, not just where. Its own
  // block, bounded small; a closed/evaporated scent never rides.
  let trail = [];
  try {
    // THE MECHANICAL RELEASE IS TRANSCENDENTAL — it is a condition of what CAN appear in the window, and it may not
    // appear IN the window. A category that makes the projection possible (here: which tensions are still live)
    // cannot be a conscious determiner the model reasons over or answers — that is transcendental illusion, and
    // the same failure as a person-facing notice reaching the model. So the machine RELEASES (merge, then wall)
    // and says nothing; the model only ever sees the consequence — the question is gone, or rides at a coarser
    // grain. The release is recorded (the scent files' own released/walled lines), never injected.
    if (releaseOn()) {
      try { releaseByMerge({ task }); } catch { /* never blocks */ }
      for (const s of stuckScents({ task })) { try { releaseNested({ task, agent: s.agent, at: s.at, by: "wall" }); } catch { /* never blocks */ } }
    }
    trail = scentsOf({ task, limit: 5, universe: universeOf(body) }).map(
      (s) =>
        `- open [${s.cell ?? "?"}] q="${String(s.q).slice(0, 90)}" at="${s.at}"${s.parent ? ` parent="${s.parent}"` : ""}`,
    );
  } catch { /* the trail read never blocks a turn */ }
  out.note = [
    mechKept.length ? `<fold-mechanical>\n${mechKept.join("\n")}\n</fold-mechanical>` : "",
    saidKept.length ? `<fold-said>\n${saidKept.join("\n")}\n</fold-said>` : "",
    trail.length ? `<fold-trail>\n${trail.join("\n")}\n</fold-trail>` : "",
  ].filter(Boolean).join("\n");
  const __u = universeOf(body);
  if (__u !== "world") {
    const __info = universeInfo({ task, universe: __u });
    const __stips = Array.isArray(__info?.stipulations) ? __info.stipulations : [];
    if (__stips.length) {
      const __lines = __stips.map((x) => `- ${String(x.fact ?? x)} = ${String(x.value ?? "true")} (truth:${x.truth ?? "false"})`).join("\n");
      out.note = `${out.note ? out.note + "\n" : ""}<fold-holding universe="${__u}">\n${__lines}\n</fold-holding>`;
    }
  }
  return out;
}

// TRAIL (layer 3, opencode-trail.mjs): which tool results stay verbatim and which become opaque handles. The client sends the
// results it holds (id, key = what each is about, step) and how long the session has been idle; the door applies the COST GATE
// (compaction rewrites the cached prefix, so only when the cache is cold or the prompt is near its window) and the decayed-trail
// plan. It holds no bytes: the client keeps them and resolves a handle itself. FOLD_TRAIL=1 turns it on; anything else answers go:false.
function onTrail(body) {
  if (!trailEnabled()) return { go: false, why: "off" };
  const results = (Array.isArray(body.results) ? body.results : []).filter((r) => r && typeof r.id === "string" && typeof r.key === "string" && Number.isFinite(r.step)).slice(-2000);
  const gate = trailGate({ idleMs: Number(body.idleMs) || 0, tokens: Number(body.tokens) || 0, window: Number(body.window) || 200_000 });
  if (!gate.go || !results.length) return { go: false, why: gate.why };
  const p = trailPlan({ results, already: new Set((Array.isArray(body.already) ? body.already : []).map(String)) });
  return { go: true, why: gate.why, keep: [...p.keep], point: Object.fromEntries(p.point) };
}

// SNIP: the model composes by reference; the door returns the verbatim bytes and their provenance.
// THE PHEROMONE TRAIL (P1): a drill deposits the OPEN QUESTION it serves (body.why) anchored at the address it
// motivated, so the next thought (or a resumed session) knows WHY it drilled, not only where. Reinforced on
// every re-drill, evaporates by TTL. The motive is echoed back on the answer for the immediate next step.
function onSnip(body) {
  const agent = String(body.agent ?? body.sessionID ?? "");
  const task = taskFor(body, agent);
  const root = body.root ?? body.workspace ?? turnFor(agent).workspace ?? null;
  const ref = String(body.ref ?? "").trim();
  const pm = /^prompt#([0-9a-f]{8,64})$/.exec(ref);
  const result = pm
    ? readPromptSource({ task, sha: pm[1], ref }) // a disclosed prompt source resolves to the exact bytes sent
    : eot.snip({ task, agent: agent || null, ref: body.ref, root: root ? String(root) : null, universe: universeOf(body) });
  // THE MODEL ANSWERS; THE SYSTEM DOES THE STIGMERGY. The tension a drill serves is derived MECHANICALLY from the
  // ask in front of the model (never authored by it): the ask is the open question, the address is where the model
  // went to answer it. On success the arrival releases the tension; on failure it stays open and walls if re-asked.
  const ask = String(body.ask ?? body.why ?? "").trim(); // body.why only until the client is rebuilt onto `ask`
  const at = String(body.ref ?? "");
  if (result && result.ok !== false) {
    if (releaseOn())
      try {
        releaseNested({ task, agent: agent || "session", at, by: "arrival" }); // the address and everything nested under it
        releaseByQuestion({ task, agent: agent || "session", q: ask, by: "arrival" }); // the ask itself — any address it searched
      } catch { /* the trail never blocks a read */ }
  } else if (ask) {
    try { scentNote({ task, agent: agent || "session", q: ask, at }); } catch { /* the trail never blocks a read */ }
  }
  return result;
}
async function onGround(body) {
  const agent = String(body.agent ?? body.sessionID ?? "");
  const task = taskFor(body, agent);
  // RELEASE BY ARRIVAL-IN-PROSE: this answer is an arrival — release every open tension its own words bear on.
  if (releaseOn()) try { releaseAnswered({ task, agent, text: String(body.text ?? "") }); } catch { /* the trail never blocks a turn */ }
  const r = eot.groundCheck({ task, text: String(body.text ?? ""), root: body.workspace ? String(body.workspace) : null });
  // THE LEDGER CHECK, beside the lexical ground: what this answer says against what the task's own
  // turns already heard (opencode-ledger-check.mjs) — a re-sighting is retold, a denial of a standing
  // note is a contest. Display-only; a failed check is a typed gap, never a block.
  let ledger = [];
  try { ledger = checkAnswer({ turns: turnsOf({ task, universe: universeOf(body) }), text: String(body.text ?? "") }).flags ?? []; } catch { ledger = []; }
  const flags = [...(r.flags ?? []), ...ledger].map((f) => ({ ...f, cell: cellForFlag(f.kind) }));
  // THE MECHANICAL STEP (opencode-finish.mjs): the finished answer as ONE STEP —
  // its propositions typed against the ground (MATERIAL @ address vs SELF:MODEL,
  // paraphrase-invariant), and the settled output when a mechanism outweighed the
  // draw (the draw kept as `superseded`). SHOWN, never enforced; the second
  // version the facing renders beside the model's own. Fail-open: a missing step
  // is a typed gap, never a broken turn.
  let step = null;
  if (process.env.FOLD_FINISH !== "0") {
    try {
      const { finish } = await import("./opencode-finish.mjs");
      const f = await finish({ ask: String(body.ask ?? ""), draft: String(body.text ?? ""), material: body.material ?? null, passages: body.passages ?? null, workspace: body.workspace ? String(body.workspace) : null, own: Array.isArray(body.own) ? body.own.map(String) : [], ...(typeof body.research === "boolean" ? { research: body.research } : {}) });
      if (f?.ok) step = { output: f.output, superseded: f.superseded, grounded: f.grounded, ground_trace: f.ground_trace, profile: f.profile, lane: f.lane, disclosure: f.disclosure, eot: f.eot };
    } catch { /* typed gap */ }
  }
  // THE TURN'S SHAPE (the audit's live row, read once more here so the window never reaches for the door):
  // what the void owes, the first unmet reach cell, and the acts with their cube cells and shape verdicts.
  let turn = null;
  const open = sessions.get(String(body.sessionID ?? ""));
  if (open) turn = { topic: open.topic ?? null, shape: open.shape ?? null, shapeCell: open.shapeCell ?? null, void: open.void ?? null, tools: [...open.tools.values()].map((t) => ({ name: t.name, ok: t.ok, cell: t.cell ?? null, shape: t.shape ?? null })) };
  return { ...r, flags, standing: standingFor(flags), ...(step ? { step } : {}), ...(turn ? { turn } : {}) };
}

// The modality of a file by extension, for the local senses. Text-family is the
// fallback (utf8), so code and prose need no enumeration; only the senses that read
// bytes differently (image / PDF / audio) are named. Video and provider refs are the
// local senses' own typed gaps (perceiveMedia), never derived here.
const SWARM_MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff", pdf: "application/pdf", wav: "audio/wav", mp3: "audio/mpeg", m4a: "audio/mp4", flac: "audio/flac", ogg: "audio/ogg", opus: "audio/opus", aac: "audio/aac", webm: "audio/webm", mp4: "video/mp4", mov: "video/quicktime", mkv: "video/x-matroska", avi: "video/x-msvideo" };
const mimeOfPath = (p) => SWARM_MIME[path.extname(String(p)).slice(1).toLowerCase()] ?? "text/plain";

// SWARM: deploy the ant-swarm on hard meaning. The capacity-swarm is model-free
// (pure organ reads, same as proxy.mjs's /v1/swarm), so this runs with no Heimdall
// admission and no model draw. It reads any language and any modality — a file is
// resolved to its own ground by the local senses first (khora/perceive/local.mjs) —
// and points the registry at that ground's referent-physics (the reader's cast and
// relations), never at tokens. It returns the swarm's own report (a measurement,
// never a guess) and records the finding in the task's medium so the next turn's
// note carries it — the cross-session standing rule for the content type is written
// inside runSwarmTurn (preserveHardMeaningRule, content-rules.json).
async function onSwarm(body) {
  const agent = String(body.agent ?? body.sessionID ?? "swarm");
  const task = taskFor(body, agent);
  const workspace = body.workspace ? String(body.workspace) : null;
  const ask = String(body.ask ?? "");
  const lang = typeof body.lang === "string" && body.lang ? body.lang : "eng";
  // Material, in order: a file of any modality (its text read by the local senses
  // first), then the caller's text, then the bytes at an address, then this task's
  // own recent turns. Never guessed into existence; an unreadable or textless sense
  // (video, an unsupported container) is a typed gap, never a swarm over nothing.
  let text = "", via = null, modality = null, materialName = "swarm-material";
  let sense = null;
  if (typeof body.path === "string" && body.path) {
    try {
      const bytes = fs.readFileSync(body.path);
      materialName = path.basename(body.path);
      modality = mimeOfPath(body.path);
      // A named-text extension whose bytes carry a NUL is not text: hand it to the
      // senses as an opaque container instead, so an unreadable binary gaps, never
      // swarms garbage. Keeps code/prose on the utf8 path with no enumeration.
      if (modality === "text/plain" && bytes.includes(0)) modality = "application/octet-stream";
      if (modality.startsWith("text/") || modality === "application/json") {
        // Text-family is its own ground (utf8) — no organ needed; the senses are for
        // what bytes do not already spell out.
        text = bytes.toString("utf8");
        via = "utf8-passthrough";
      } else {
        // THE SENSE-SWARM: every present organ for this modality reads the bytes at
        // once; the representative reading is the one that best agrees with the
        // consensus (never a blend), and the delta rides with the finding.
        sense = await senseMany(bytes, { mime: modality, name: materialName, lang, stateDir: STATE });
        text = String(sense.text ?? "");
        via = sense.via ?? null;
        if (!text) return { ok: false, gap: "no_ground", why: via ?? "unsupported", modality, gaps: sense.gaps ?? [], delta: sense.delta ?? null };
      }
    } catch (e) {
      return { ok: false, gap: "unreadable", why: String(e?.message ?? e).slice(0, 200), modality: mimeOfPath(body.path) };
    }
  }
  if (!text && typeof body.text === "string" && body.text) { text = body.text; via = "text"; modality = "text/plain"; }
  if (!text && typeof body.ref === "string" && body.ref) {
    const s = eot.snip({ task, agent, ref: body.ref, root: workspace });
    if (s && s.ok && typeof s.bytes === "string") { text = s.bytes; via = "snip"; modality = "text/plain"; }
  }
  let history = [];
  if (!text) {
    try { history = (eot.turnsFromLog(task) ?? []).slice(-4).map((t) => ({ name: agent, text: String(t.text ?? "") })).filter((t) => t.text.trim()); } catch { history = []; }
    if (history.length) { via = "session-turns"; modality = "text/plain"; }
  }
  const texts = text ? [{ name: materialName, text }] : [];
  const { runSwarmTurn } = await import("./swarm-server.mjs");
  // Deploy the whole registry: the tool IS "the swarm". The NL is prefixed with the
  // registry's own "everything" pointing (pointCapacities, capacity-swarm.mjs) rather
  // than the raw ask, whose ordinary words otherwise spuriously name a capacity (a
  // bare "what" matches the `what` row). The ask rides for context and hard-meaning.
  const report = runSwarmTurn({ task: `swarm everything — ${ask}`, texts, history, name: "swarm-material", force: true });
  if (!report || report.routed !== true) return { ok: false, gap: "not-routed", why: report?.reason ?? null };
  const best = report.best ?? null;
  const bar = Number(report.bar ?? 0);
  const converged = !!(best && Number.isFinite(best.f) && best.f > bar && best.f > 0);
  // The sense delta rides ahead of the swarm read: which organs read the material,
  // how they agreed, and what they disputed — the ground's own provenance, disclosed.
  const senseLine = sense?.delta?.pairs > 0 ? `[${sense.delta.line}]\n` : "";
  const rawReading = `${senseLine}${String(report.answer ?? "")}`;
  const reading = rawReading.length > 3500 ? `${rawReading.slice(0, 3500)}…[+${rawReading.length - 3500}]` : rawReading;
  const standing = report.mode === "gap" ? "gap" : converged ? "converged" : "unresolved";
  const holes = String(report.residue?.line ?? "");
  // LEARN: the finding enters the task's medium as a fact mark, attributed to the
  // swarm (asserted, never a witness — it is what the swarm measured, disclosed as
  // such), so the next turn's note carries it. Compact by construction: the best
  // capacity, the ones that measured signal, and the residue — not the whole census.
  // Written to both the EOT log and the stigmergic medium, the pair every mark uses.
  const signals = (report.ants ?? []).filter((a) => Number(a.yield) > 0).map((a) => `${(a.ids ?? []).join("+")}(${a.yield})`);
  const bestTxt = best && Array.isArray(best.ids) ? `${best.ids.join("+")} at ${best.f}` : "none";
  const src = `${via ?? "?"}${modality && modality !== "text/plain" ? `/${modality}` : ""}${modality !== "text/plain" && lang ? ` ${lang}` : ""}`;
  const finding = `swarm(${standing}) on "${ask.replace(/\s+/g, " ").slice(0, 80)}" [read ${src}]: best ${bestTxt}${signals.length ? `; signal: ${signals.slice(0, 6).join(", ")}` : "; no capacity measured signal"}${holes ? `; ${holes}` : ""}`;
  try { eot.recordMark({ task, agent: "swarm", kind: "fact", text: finding }); } catch { /* the log never blocks */ }
  try { markNote({ task, agent: "swarm", kind: "fact", text: finding }); } catch { /* the medium never blocks */ }
  return { ok: true, reading, standing, holes, giver: via ?? "ant-swarm", modality, lang, bar, best, mode: report.mode ?? null, meaning: report.meaning ?? null, ants: report.ants ?? [], residue: report.residue ?? null, senses: sense ? { delta: sense.delta, readings: sense.readings } : null };
}

// THE SWARM'S LEARNING, at the next ask. The swarm's own marks (agent "swarm"),
// ranked by term overlap with the ask, injected as one note. Mechanical, no model:
// the standing the swarm measured rides with each finding. Nothing relevant → no note.
// The ledger is read from the EOT (the swarm's fact marks are events there); the file
// medium stays only as the fallback for rows written before the EOT carried them.
function swarmFindingsNote({ task, ask }) {
  let marks = [];
  try { marks = eot.projectMarks(task, { agent: "swarm", kind: "fact" }); } catch { marks = []; }
  if (!marks.length) { try { marks = (readNotes({ task })?.marks ?? []).filter((m) => m.agent === "swarm" && m.kind === "fact"); } catch { return null; } }
  if (!marks.length) return null;
  const terms = new Set(String(ask ?? "").toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []);
  const score = (t) => (String(t).toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []).filter((w) => terms.has(w)).length;
  const ranked = marks.slice().sort((a, b) => score(b.text) - score(a.text) || b.t - a.t);
  const picked = (terms.size ? ranked.filter((m) => score(m.text) > 0) : ranked).slice(0, 3);
  if (!picked.length) return null;
  return [
    `<fold-swarm measured="${marks.length}">`,
    ...picked.map((m) => `- ${String(m.text).replace(/\s+/g, " ").slice(0, 300)}`),
    "</fold-swarm>",
  ].join("\n");
}

// CUBE: the 27-address tool registry — a map that always answers, a call that
// runs in shadow behind FOLD_CUBE=1. The handler lives in opencode-cube.mjs
// (the opencode-surf.mjs pattern); here the door resolves the task whose
// record and medium the finding lands on, exactly as the swarm does.
async function onCube(body) {
  const agent = String(body.agent ?? body.sessionID ?? "cube");
  const task = taskFor(body, agent);
  return cubeEvent({ body, task, agent, stateDir: STATE });
}

function onMark(body) {
  try { eot.recordMark({ task: body.task, agent: body.agent, kind: body.kind, text: body.text }); } catch { /* the log never blocks */ }
  return markNote({ task: body.task, agent: body.agent, kind: body.kind, text: body.text });
}
function onClaim(body) {
  const r = claimItem({ task: body.task, agent: body.agent, item: body.item, ttlMs: body.ttlMs });
  if (r.ok) { try { eot.recordClaim({ task: body.task, agent: body.agent, item: body.item, ttlMs: body.ttlMs }); } catch { /* */ } }
  return r;
}
function onDone(body) {
  try { eot.recordDone({ task: body.task, agent: body.agent, item: body.item }); } catch { /* */ }
  return doneItem({ task: body.task, agent: body.agent, item: body.item });
}
// The meaning framework rides admit in SHADOW: each piece behind its own flag, appends to the task's weft.jsonl ledger,
// injects nothing, and never changes what admit answers (a failure here is swallowed, like the other trace seams).
function onAdmit(body) {
  const res = admitChange({ task: body.task, agent: body.agent, referent: body.referent, delta: body.delta, check: body.check, cwd: body.cwd, exitCode: body.exitCode, address: body.address, source: body.source, model: body.model });
  try {
    if (res?.kept && res.id && (DELTA_ON() || STAKES_ON() || ETHOS_ON())) {
      const block = recordBlocks(body.task).find((b) => b.id === res.id);
      if (block) {
        if (DELTA_ON()) measureDelta({ task: body.task, block, judge: res.judge, frame: body.frame ?? null, git: body.git ?? null });
        if (STAKES_ON()) stakeCheck({ task: body.task, block, judge: res.judge });
        if (ETHOS_ON() && body.closure) ethosShadow({ task: body.task, referent: block.referent, block: block.id, closure: body.closure, known: (r) => recordBlocks(body.task).some((b) => b.referent === r) });
      }
    }
  } catch { /* the shadow never blocks an admit */ }
  return res;
}
function onRecord(body) {
  const r = reconcile({ task: body.task });
  return { record: r.fold, supersedes: r.supersedes, disagreements: r.disagreements };
}
// DREAM: the khora dream over this task's record — the live answers folded (waking dream),
// settled (contests · meet · candidates). Read-only; a fork is disclosed, never collapsed.
function onDream(body) { return dreamTask({ task: taskFor(body, String(body.agent ?? body.sessionID ?? "")) }); }
function onNextVoid(body) { return nextVoid({ task: body.task }); }
function onReason(body) { return reasonFor({ task: body.task, ask: String(body.ask ?? ""), limit: Number(body.limit) || 6 }); }
// THE MECHANICAL STEP (opencode-finish.mjs): the model's finished text is one
// step; this runs the precision race (and, for a generation, the essay fold)
// over it and returns the OUTPUT, keeping the raw draw as `superseded`. Bounded
// and fail-open: a slow first load yields a typed gap; the draw still stands,
// disclosed as un-stepped. Gated by FOLD_FINISH (default on).
async function onFinish(body) {
  if (process.env.FOLD_FINISH === "0") return { ok: false, gap: "finish-off" };
  const budget = Number(process.env.FOLD_FINISH_MS ?? 800);
  const { finish } = await import("./opencode-finish.mjs");
  const run = finish({ ask: String(body.ask ?? ""), draft: String(body.draft ?? ""), material: body.material ?? null });
  const raced = await Promise.race([
    run.catch(() => ({ ok: false, gap: "finish-error" })),
    budget > 0 ? new Promise((r) => setTimeout(() => r({ ok: false, gap: "finish-budget" }), budget)) : run,
  ]);
  return raced;
}
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
  if (body.task != null && (!/^[\w.-]+$/.test(String(body.task)) || String(body.task) === "..")) return { ok: false, gap: "bad-address" };
  const task = taskFor({ task: body.task, workspace }, agent);
  if (!/^[\w.-]+$/.test(agent) || !/^[\w.-]+$/.test(task) || task === ".." || agent === "..") return { ok: false, gap: "bad-address" };
  const { runVoidLoop } = await import("./native/the-fold/code-loop.js");
  const maxRounds = Math.min(6, Math.max(1, Math.floor(Number(body.maxRounds) || 3)));
  // RE-ENTER FROM THE RECORD, NOT A COLD SCAN: when this task's record already
  // holds an open void (a carried/refuted draw, or a referent answered two
  // distinct ways), the chase's first DEF is read off nextVoid's nomination.
  // A settled or empty record yields void:null — the cold scan runs as before.
  const nom = nextVoid({ task });
  const resumeVoid = nom?.ok && nom?.kind ? nom : null;
  const result = await runVoidLoop({
    sessionId: agent, model: String(body.model ?? process.env.FOLD_CHASE_MODEL ?? "qwen2.5-coder:1.5b"), task: String(body.ask ?? "fill the stubs so the test passes"),
    workspace, testCommand, maxRounds, candidates: 1, ...(opts.turn ? { turn: opts.turn } : {}),
    onRecord: recordSink({ task, agent }),
    priorRefusals: ({ unit, file }) => refusalsFor({ task, unit, file }),
    resumeVoid,
  });
  // Suite green: every unit the loop carried on disk is now verified by the same real test.
  // Promote the latest carried draw per referent into the record (source says why).
  if (result.done) {
    const latest = new Map();
    for (const r of result.rounds ?? []) if (r.applied && r.carried && r.target) latest.set(`${r.file ?? "?"}:${r.target}`, r);
    const have = new Set(foldRecord({ task }).map((b) => b.referent));
    for (const [referent, r] of latest) {
      if (have.has(referent)) continue;
      admitChange({ task, agent, referent, delta: r.basis ?? `${r.action ?? "DEF"} ${r.target}`, check: testCommand, exitCode: 0, address: r.address ?? r.file ?? "", source: "suite-green", model: r.model ?? String(body.model ?? process.env.FOLD_CHASE_MODEL ?? "") });
    }
  }
  // The cheap rungs first, disclosed: of the draws the real test judged, how many the box or
  // the field hunt supplied (no model) vs the mouth. Reported, never a quality score.
  const judged = (result.rounds ?? []).filter((r) => r.applied && typeof r.testExitCode === "number");
  const viaMouth = judged.filter((r) => !["BOX", "HUNT"].includes(r.action)).length;
  const mouthShare = judged.length ? viaMouth / judged.length : null;
  return {
    ok: true, done: !!result.done, gap: result.gap?.kind ?? null, judged: judged.length, mouthShare,
    resumed: resumeVoid?.kind ?? null,
    rounds: (result.rounds ?? []).map((r) => ({ action: r.action ?? null, by: r.by ?? null, target: r.target ?? null, applied: r.applied ?? null, reverted: r.reverted ?? null, testExitCode: r.testExitCode ?? null })),
    record: foldRecord({ task }).map((b) => ({ referent: b.referent, id: b.id })),
  };
}
function onRead(body) { return readNotes({ task: body.task }); }

// SCENT: the pheromone trail for agents that are not this fork — deposit one question (q + at), or read the
// task's open trail back. Same store the fork's snip deposits into; the firewall is the worknotes module's.
function onScent(body) {
  const agent = String(body.agent ?? body.sessionID ?? "");
  const task = taskFor(body, agent);
  if (body.q) return scentNote({ task, agent: agent || "session", q: String(body.q), at: String(body.at ?? ""), parent: body.parent ? String(body.parent) : "" });
  return { trail: scentsOf({ task }) };
}

export async function answer(body, opts = {}) {
  if (process.env.FOLD_DOOR_DEBUG) console.error(`door ← ${body?.event} ${body?.type ?? ""} ${body?.sessionID ?? ""}`);
  // FOLD_DOOR_DEBUG also says what a context/surf body CARRIES (never its content): whether the client
  // sent a workspace and a task, how many turns, which key the door will resolve the task from.
  if (process.env.FOLD_DOOR_DEBUG && (body?.event === "context" || body?.event === "surf")) {
    const agent = String(body.sessionID ?? "");
    let resolved = "?";
    try { resolved = taskFor(body, agent); } catch { /* shown as ? */ }
    console.error(`door ${body.event} carries: ws=${body.workspace ? JSON.stringify(String(body.workspace)) : "ABSENT"} task=${body.task ? JSON.stringify(String(body.task)) : "absent"} turns=${Array.isArray(body.turns) ? body.turns.length : "absent"} ask=${body.ask ? String(body.ask).length + "ch" : "absent"} -> task ${resolved === agent ? "PER-SESSION" : "project"} ${resolved}`);
  }
  switch (body?.event) {
    case "context": return onContext(body);
    case "title": return onTitle(body);
    case "fold": return {}; // retired: the line-level fold measured equal to its null (see the replay script)
    case "surf": return onSurf(body);
    case "mark": return onMark(body);
    case "claim": return onClaim(body);
    case "done": return onDone(body);
    case "notes": return onRead(body);
    case "scent": return onScent(body);
    case "admit": return onAdmit(body);
    case "snip": return onSnip(body);
    case "swarm": return onSwarm(body);
    case "cube": return onCube(body);
    case "tree": return onTree(body);
    case "ground": return onGround(body);
    case "provenance": return { ok: true, ...provenance({ task: taskFor(body, String(body.agent ?? body.sessionID ?? "")) }) };
    case "chase": return onChase(body, opts);
    case "record": return onRecord(body);
    case "dream": return onDream(body);
    case "nextVoid": return onNextVoid(body);
    case "reason": return onReason(body);
    case "finish": return onFinish(body);
    case "prompt": return onPrompt(body);
    case "trail": return onTrail(body);
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
  // THE LAYERS — the projected reality at five grains (prompt · projection · answer · sources · record). JSON by
  // default; `?html=1` serves the self-contained toggle view (one grain switch + per-node pins). Read-only.
  if (url === "/v1/hooks/opencode/layers" && req.method === "GET") {
    const q = new URL(req.url, "http://x").searchParams;
    const agent = q.get("agent");
    const task = taskFor({ task: q.get("task"), workspace: q.get("workspace") }, agent ?? "");
    const L = layers({ task, agent, root: q.get("root") });
    if (q.get("html") === "1") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderLayersHtml(L, { task, agent: agent ?? "" }));
      return true;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(L));
    return true;
  }
  if (url === "/v1/hooks/opencode/ecology" && req.method === "POST") {
    let body = {};
    try { body = JSON.parse((await readBody(req)) || "{}"); } catch { /* answered as an empty run */ }
    const task = taskFor(body, String(body.agent ?? body.sessionID ?? ""));
    const r = runEcology({ task, candidates: Array.isArray(body.candidates) ? body.candidates : [], workers: Number(body.workers) || 3 });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
    return true;
  }
  if (url === "/v1/hooks/opencode/self" && req.method === "GET") {
    const q = new URL(req.url, "http://x").searchParams;
    const agent = q.get("agent");
    const task = taskFor({ task: q.get("task"), workspace: q.get("workspace") }, agent ?? "");
    const signals = {
      reopenCount: Number(q.get("reopen") ?? 0) || 0,
      duplicateCount: Number(q.get("duplicate") ?? 0) || 0,
      recurringFailureCount: Number(q.get("recurring") ?? 0) || 0,
      mechanismFailureCount: Number(q.get("mechanism") ?? 0) || 0,
    };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(selfCheck({ task, agent, signals })));
    return true;
  }
  // THE WORK TREE AS THE LOG SAYS IT (read-only folds of the EOT log at a cursor). ?task= or ?workspace= names the
  // task; ?asOf= is an event id or a ms timestamp. The panel never keeps a tree of its own: it asks.
  if (url.startsWith("/v1/hooks/opencode/eot/") && req.method === "GET") {
    const q = new URL(req.url, "http://x").searchParams;
    const task = taskFor({ task: q.get("task"), workspace: q.get("workspace") }, "");
    const raw = q.get("asOf");
    const asOf = raw == null || raw === "" ? null : /^\d+$/.test(raw) ? Number(raw) : raw;
    const what = url.slice("/v1/hooks/opencode/eot/".length);
    let body = { error: "unknown eot view" }, code = 404;
    if (what === "tree") {
      const { files, worktrees } = eot.projectTree(task, { asOf });
      const root = q.get("workspace") ? realOf(q.get("workspace")) : null;
      body = { task, asOf, files: [...files.values()].map(({ path: p, sha, bytes, agent, ts, event_id }) => ({ path: p, sha, bytes, agent, ts, event_id })).sort((a, b) => a.path.localeCompare(b.path)), worktrees: [...worktrees], drift: root ? eot.treeVsDisk(task, root) : null };
      code = 200;
    } else if (what === "log") {
      body = { task, ...eot.projectLog(task, { asOf, limit: Math.min(Number(q.get("limit")) || 400, 2000) }) }; code = 200;
    } else if (what === "file") {
      const p = String(q.get("path") ?? "");
      const buf = eot.fileAt(task, p, { asOf });
      body = { task, path: p, asOf, text: buf == null ? null : buf.includes(0) ? null : buf.toString("utf8"), binary: !!buf?.includes(0), changes: eot.editsOf(task, p, { asOf }) }; code = 200;
    } else if (what === "event") {
      body = { task, event: eot.eventDetail(task, String(q.get("id") ?? "")) }; code = 200;
    } else if (what === "diff") {
      body = { task, ...eot.treeDiff(task, q.get("from"), q.get("to")) }; code = 200;
    }
    res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify(body));
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
    res.end(JSON.stringify(await startDocumentJob(body)));
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
  if (url.split("?")[0] === "/v1/hooks/opencode/plans" && req.method === "GET") {
    const limit = Number(new URL(req.url, "http://x").searchParams.get("limit")) || 20;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ schema: "WorkPlans@1", plans: workPlans({ limit }) }));
    return true;
  }
  // THE REMEMBER WINDOW's backend (opencode-remember.mjs): the operator's three
  // standing stores. GET lists a store read back for the window; POST appends
  // one entry — append-only, and a `supersedes:` names an earlier claim to
  // retire, never an edit of the old line. The same entries reach a prompt only
  // through the context event's by-need match, never wholesale.
  if (["/v1/hooks/opencode/memory", "/v1/hooks/opencode/refs", "/v1/hooks/opencode/system"].includes(url) && (req.method === "GET" || req.method === "POST")) {
    const kind = url.slice("/v1/hooks/opencode/".length);
    let out;
    if (req.method === "GET") out = { schema: "Remember@1", kind, ...remember.readStore(kind) };
    else {
      let entry = {};
      try { entry = JSON.parse((await readBody(req)) || "{}"); } catch { /* answered as a typed gap */ }
      out = { schema: "Remember@1", kind, ...remember.appendEntry(kind, entry), ...(remember.isKind(kind) ? { store: remember.readStore(kind) } : {}) };
    }
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
  // THE SENSE-SWARM, inspected: which organs the hunt found or found absent, and what
  // the ledger has learned about each one's agreement. Read-only; a missing state dir
  // is an empty hunt, never an error.
  if (url === "/v1/hooks/opencode/senses" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ schema: "SenseSwarm@1", hunt: huntOrgans({ stateDir: STATE }), standing: organStanding({ stateDir: STATE }) }, null, 2));
    return true;
  }
  // THE CUBE, inspected: the 27-cell map — registry × locked-venv presence ×
  // the ledger's last agreements. Read-only; the probe is bounded, and with no
  // venv it is a typed gap disclosed in `sidecar`, never a silent absence.
  if (url === "/v1/hooks/opencode/cube" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(cubeMap({ stateDir: STATE }), null, 2));
    return true;
  }
  if (url !== "/v1/hooks/opencode") return false;
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ door: "opencode", priors: seedStatus(), senses: huntOrgans({ stateDir: STATE }), events: ["context", "surf", "mark", "claim", "done", "notes", "scent", "admit", "record", "dream", "provenance", "snip", "swarm", "cube", "ground", "nextVoid", "chase", "title", "event", "prompt", "trail", "perceive", "draft", "act", "memory", "refs", "system"] }));
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
  // Warm BEFORE listening: the first finish() is ~36 s of synchronous work; a closed port fails fast and open (the plugin cools down),
  // where a blocked event loop leaves every connection hanging and the watchdog starting a second door.
  if (process.env.FOLD_FINISH !== "0" && process.env.FOLD_WARM !== "0") {
    const { warmFinish } = await import("./opencode-finish.mjs");
    const w = await warmFinish();
    console.error(`opencode doorway warmed in ${w.ms} ms`);
  }
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
