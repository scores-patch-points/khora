#!/usr/bin/env node
// cli/claude-code-recall.mjs — REASONING CARRIES FORWARD, NOT ONLY BACKWARD
// (2026-09-25). claude-code-steer.mjs and claude-code-reason-gate.mjs make
// eoreader7 reasoning a precondition for LEAVING a turn (deny a write, block
// a Stop) — enforcement at the boundary, once. Nothing fed the other
// direction: what an earlier turn in this same session already proved
// through cli/reason.mjs never re-entered a later turn's own context, so
// turn 5 could restate — or quietly contradict — something turn 2 already
// ran through falsifyGfp and left standing. A UserPromptSubmit hook.
//
// Read-only, and reuses rather than reimplements: findMatches/foldMatches
// are cli/claude-code-context.mjs's own fold, exported from that file for
// this import (tests/reasoning-claims-ledger.test.mjs T1-T4 already pin
// that fold correct; this file adds no new folding logic of its own). Seed
// "/" is that file's own documented no-special-case default — every claim
// THIS SESSION declared matches, the same siloed scope its own T3 test
// requires (a different session's claims never leak in). The folded set is
// then filtered by native/organs/claim-relevance.js's relevantClaims
// before the CAP below ever applies — see that file's own header for the
// measured, no-hand-set-threshold design (and its disclosed limits) that
// decides which of them are worth this turn's tokens. Never blocks,
// never writes session state (no saveState call — nothing here can race
// claude-code-ledger.mjs's own writes to the same per-turn state file, the
// lost-update class this repo's own memory documents against this file's
// siblings) — this only ever reads the durable, cross-turn
// documents/eoreader7-reasoning:1.jsonl ledger, a different file from that
// per-turn state entirely. Silent when nothing is folded yet (a session's
// first turn, or one with no reasoned claims) — no padding.
//
// No off-switch by design: ~/.claude/eo-reason/steer.off governs
// ENFORCEMENT (claude-code-state.mjs's own header), and this never denies
// or blocks anything to enforce. Fails open on its own error, logged, same
// as every sibling hook.
import fs from "node:fs";
import { sidOf, logError } from "./claude-code-state.mjs";
import { findMatches, foldMatches, describeNote } from "./claude-code-context.mjs";
import { relevantClaims } from "../native/organs/claim-relevance.js";
import { annotateWithSpiral } from "./spiral-read.mjs";

// A system notice is not the user's own ask — claude-code-ledger.mjs's own
// UserPromptSubmit branch defines the identical table for the identical
// reason (a background task finishing must not act like a fresh turn).
// Duplicated literally rather than imported: the same call
// claude-code-context.mjs's own header makes for structuralIdentity — a
// four-item literal both files must keep matching is cheaper and safer
// duplicated than behind a new shared module neither owns yet.
const NOTICE_OPENINGS = ["<task-notification>", "<cross-session-message", "[SYSTEM NOTIFICATION", "<system-reminder>"];

// A disclosed size bound on how much gets injected per turn — an
// engineering cap on token cost, not a claim about the world, so this
// repo's own refusal of hand-picked SCIENTIFIC thresholds (measured nulls
// over detection/significance judgments) does not apply to it; the same
// distinction claude-code-ledger.mjs's own EXCERPT constant already draws.
const CAP = 20;

/** Pure: the additionalContext string for this UserPromptSubmit event, or
 *  null to inject nothing. Exported so tests can drive it directly against
 *  a real, isolated ledger (EO_LEDGER_DIR) without going through stdin. */
export function recallContextFor(ev) {
  if (NOTICE_OPENINGS.some((o) => String(ev?.prompt ?? "").trimStart().startsWith(o))) return null;
  const sid = sidOf(ev);
  const result = findMatches("/", { allSessions: false, session: sid });
  const folded = foldMatches(result.matches);
  if (!folded.notes.length) return null;
  // JANUS'S VERDICT (nesting-fix J D3, 2026-10-14). A claim the session's spiral record holds refuted, suspended,
  // stale or withdrawn is shown as that, ahead of the ledger's own standing: this hook used to say "Build on
  // these" over claims janus had already refuted.
  annotateWithSpiral(folded.notes, sid);
  // RELEVANCE (2026-09-25, native/organs/claim-relevance.js): the user,
  // after this file's first cut surfaced every standing claim up to CAP
  // unconditionally — "not get ALL the tokens, only the ones the SURF
  // believes are relevant". Filters BEFORE the size cap, so CAP now bounds
  // an already-relevant set rather than an arbitrary recency window.
  const relevant = relevantClaims(String(ev?.prompt ?? ""), folded.notes);
  if (!relevant.length) return null;
  const shown = relevant.slice(0, CAP);
  const lines = [
    `eoreader7 — ${relevant.length}/${folded.notes.length} claim(s) this session already ran through reasoning (cli/reason.mjs), surfaced because they bond to this prompt more than this session's claims typically do:`,
    // POLARITY (2026-10-13). This line used to be its own template —
    // `[standing, N witness(es)] subject rel object` — which never read
    // n.polarity, so a claim only ever DENIED on the record (claude-code-spiral
    // `calls` saveState, polarity "-") printed as its opposite, and a "±"
    // contested one printed as if merely asserted. The fold carried polarity
    // all along (claude-code-context.mjs, POLARITY AND GROUNDING); this was the
    // one place it was dropped. describeNote is the renderer that file's own
    // header says recall and the CLI share, so a denial reads "NOT:" and a
    // contest names both sides here exactly as it does there.
    ...shown.map((n) => `- ${describeNote(n)}`),
  ];
  if (relevant.length > shown.length) lines.push(`… and ${relevant.length - shown.length} more relevant — node cli/claude-code-context.mjs --json for the full set.`);
  // WHAT THE BRACKET MEANS. "ungrounded" is this ledger's own basis and no
  // more: no reasoning run's citation (ground-cite.js citeGround — the claim's
  // own words found at the ground it named) cleared for that claim. It is not
  // a verdict that the claim is false, and a different instrument may have
  // earned it. The session's janus spiral record (~/.claude/eo-reason/spiral)
  // IS read here since 2026-10-14: a claim it holds refuted / suspended /
  // stale / withdrawn leads with that. "NOT:" marks a claim only ever
  // denied: the denial is what stands.
  lines.push("Reading these: \"N grounded run(s)\" means that many runs' citation of the claim's ground cleared; [ungrounded] means only that none did here (stated, not cited — not that it is false, and the session's janus record may hold its own verdict); NOT: means the claim was reasoned as denied.");
  if (shown.some((n) => n.spiral)) lines.push("[refuted|suspended|stale|withdrawn · janus: …] is the session's janus record holding that claim against itself — do not build on it; its ledger standing follows the bar for reference. Re-state it with its premises and re-run reason.mjs to re-earn it, or say it no longer holds.");
  lines.push("Build on these rather than re-deriving or quietly contradicting them; if one no longer holds, say so and re-run reason.mjs.");
  return lines.join("\n");
}

function main() {
  const ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const additionalContext = recallContextFor(ev);
  if (additionalContext) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } }));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (e) { logError("claude-code-recall", e); }
  process.exit(0);
}
