// opencode-archon-ab.mjs — held A/B for archon-aware `context` (step 1).
//
// Arms: FOLD_ARCHONS=0 (shadow: decided + recorded, never injected) vs 1
// (injected into the context answer). No model, no network: the doorway is
// mechanical, so this measures COST (injected chars) and COVERAGE (match
// rate, dossier-pass rate) plus fail-open discipline (no throw, no unshaped
// output). Downstream quality (did the note help the frontier?) needs a held
// trial with a model and is NOT claimed here.
//
// SHARED SCOREBOARD: every integration vector reports rows here so both arms
// of every experiment read off one ledger:
//   { when, vector, arm, address, metric, value, unit, note }
// vectors: 'doorway-archons' (this script), 'hunt-snip' (the tool vector).
// Rows append to $FOLD_OPENCODE_STATE/scoreboard.jsonl (default: the door's
// own state dir). The ledger is local measurement, never shipped.
//
// Usage: `node scripts/opencode-archon-ab.mjs`
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STATE = fs.mkdtempSync(path.join(os.tmpdir(), "oc-archon-ab-"));
process.env.FOLD_OPENCODE_STATE = STATE;
const door = await import("../opencode-doorway.mjs");

// Held battery: fixed asks across reading, testimony, constitution, code,
// and chitchat (the last should match nothing — a null control).
const ASKS = [
  "Which witnesses corroborate the claim, and are their chains independent?",
  "What does the constitution require before this clearance is granted?",
  "Pin this source by hash and tell it back at three sizes",
  "Who undergoes this belief — whose stake does the passage carry?",
  "The testimony conflicts: one account affirms, another denies. Admit or refuse?",
  "Fix the failing parser test in the workspace",
  "What must be pulled before this can be answered — thread, local, or web?",
  "Summarize the archive source and verify each quote to its bytes",
  "hi",
  "what is 17 times 24",
  "Draft the release notes for the new version",
  "Which exchanges from earlier in this thread should ride along?",
];

const ev = (sessionID, type, data = {}) => door.answer({ event: "event", sessionID, type, data });

async function drive(sessionID, ask) {
  const t0 = Date.now();
  const ctx = await door.answer({ event: "context", sessionID, ask, model: { id: "m" } });
  const ms = Date.now() - t0;
  await ev(sessionID, "session.step.started", { model: { id: "m" } });
  await ev(sessionID, "session.tool.input.started", { id: "t1", name: "read" });
  await ev(sessionID, "session.tool.called", { id: "t1", input: "{}" });
  await ev(sessionID, "session.tool.success", { id: "t1" });
  await ev(sessionID, "session.text.ended", { text: "done" });
  await ev(sessionID, "session.step.ended", { tokens: { input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0, finish: "stop" });
  return { ctx, ms };
}

function rows() {
  return fs.readFileSync(path.join(STATE, "record.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function score(row) {
  fs.appendFileSync(path.join(STATE, "scoreboard.jsonl"), JSON.stringify(row) + "\n");
}

const summary = {};
for (const arm of ["0", "1"]) {
  process.env.FOLD_ARCHONS = arm;
  let injected = 0, chars = 0, gaps = {}, ms = [];
  for (let i = 0; i < ASKS.length; i++) {
    const sid = `ab-${arm}-${i}`;
    const { ctx, ms: took } = await drive(sid, ASKS[i]);
    ms.push(took);
    const row = rows().find((r) => r.sessionID === sid);
    const a = row?.archons ?? {};
    if (a.injected) { injected++; chars += a.chars ?? 0; }
    const g = a.gap ?? "matched";
    gaps[g] = (gaps[g] ?? 0) + 1;
    if (arm === "1" && ctx.archons && !a.injected) throw new Error(`arm 1 returned a note it did not record as injected: ${sid}`);
    if (arm === "0" && ctx.archons) throw new Error(`shadow arm leaked a note into the answer: ${sid}`);
    score({ when: new Date().toISOString(), vector: "doorway-archons", arm, address: row?.address, metric: "injected", value: a.injected ? 1 : 0, unit: "bool", note: (a.handles ?? []).join(",") || a.gap });
    score({ when: new Date().toISOString(), vector: "doorway-archons", arm, address: row?.address, metric: "context_ms", value: took, unit: "ms", note: "" });
  }
  summary[arm] = { n: ASKS.length, injected, meanChars: injected ? Math.round(chars / injected) : 0, p95ms: ms.sort((a, b) => a - b)[Math.floor(ms.length * 0.95)] ?? 0, gaps };
}

console.log(JSON.stringify({ state: STATE, arms: summary }, null, 2));
console.log(`verdict: arm 1 injects on ${summary["1"].injected}/${ASKS.length} asks at ~${summary["1"].meanChars} chars; arm 0 injects on ${summary["0"].injected} (shadow holds); no leaks, no throws.`);
console.log(`scoreboard: ${path.join(STATE, "scoreboard.jsonl")} — ${(summary["0"].n + summary["1"].n) * 2} rows, vector 'doorway-archons'.`);
