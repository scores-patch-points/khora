// eval/recursion/self-record.mjs — THE OBJECT THAT MAKES READING RECURSIVE: an append-only, time-indexed self-record, read at a
// cursor, with revision-as-append. We learn things later that change what things meant earlier — without forgetting what we
// thought they meant. New dir, new file; nothing is edited.
//
//   node eval/recursion/self-record.mjs [--demo] [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5). Written BEFORE the first run. ═══════════════════════════════════════════════
// THE OBJECT. Three properties, and only these three, enable recursive re-interpretation without amnesia:
//   P1 IMMUTABLE PAST   the log is a grown, frozen list of EOLogEntry@1; entries are never edited. `append` returns a NEW log;
//                       reading `asOf` a past cursor must reproduce what was believed then (a projection of the entries ≤ the
//                       cursor), NOT today's reading.
//   P2 REVISION-AS-APPEND   learning later is a `REVISE` entry that flags a past claim and records how it is now read. It
//                       changes the CURRENT projection; it never touches the earlier entry.
//   P3 CURSOR PROJECTION   meaning_t(x) = fold(log, asOf=t)(x). Past meaning and present meaning are views of one immutable
//                       log at two cursors; both are recoverable, so the reader can take its own past readings as objects.
// ENTRY (EOLogEntry@1):
//   { seq, op: "READ"|"LEARN"|"REVISE", witness:{doc,span?}, giver,
//     claim: { subject, relation, object } | null,      // the meaning as of then
//     revises: <seq | null>                              // for REVISE: the past claim it reinterprets
//     consequence:{ kind, detail } }
// CLAIM KEY = subject|relation|object. A REVISE maps an old key to a new claim ({ subject, relation: SUCCEEDS|SUPERSEDED_BY? , object })...
//   simplified: REVISE says "the claim at seq X is now read as CLAIM Y" (Y carries the new meaning; X stays).
// PROJECTION: for a cursor, the LAST entry ≤ cursor that (a) created a key or (b) revised it, wins; the result maps key -> 
//   { meaning, source: <seq>, revisedFrom: <seq|null>, standing: "current"|"superseded" } ; keys whose only entry is at ≤ cursor
//   are present; a key revised away keeps the ORIGINAL meaning under its own key and adds nothing (the new meaning is its own
//   key) — so the old meaning is never destroyed, only re-read elsewhere.
// THE FALSIFIER (what an in-place editor gets wrong): after a REVISE, project(log, oldSeq).get(oldKey) MUST still equal the
//   ORIGINAL meaning. An editor that mutates the old entry would return the NEW meaning and fail K2. K1 determinism.
// SCOPE: a demonstration of the object on a planted reading (a reader that already projects — the sidecar) uses this shape for
//   its memory; this file is the shape, not the sidecar wiring.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import { pathToFileURL } from "node:url";
// The organ lives in the kernel now (2026-10-07); this eval keeps only the
// numbers and the falsifier. The local definitions were removed so the eval
// measures the SHIPPED module, not a private copy (house rule: an experiment
// that holds moves its organ into the khora).
import { claimKey, emptyLog, readEntry as read, reviseEntry as revise, projectEntries as project } from "../../kernel/self-record.js";

// ── the demo ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function run() {
  let log = emptyLog();
  log = read(log, { subject: "Tesla", relation: "was born in", object: "Smiljan" });
  log = read(log, { subject: "Tesla", relation: "rival of", object: "Edison" });
  log = read(log, { subject: "Tesla", relation: "worked with", object: "Westinghouse" });
  const rivalSeq = 1;
  const before = project(log);
  // LATER LEARNING: the past belief "Tesla rival of Edison" is now read differently; the original stays in the log.
  log = revise(log, rivalSeq, { subject: "Tesla", relation: "collaborated with", object: "Edison" });
  const now = project(log);
  const oldBelief = project(log, rivalSeq);          // what we believed "as of" the past cursor
  const result = {
    entries: log.map((e) => ({ seq: e.seq, op: e.op, claim: e.claim ? `${e.claim.subject} ${e.claim.relation} ${e.claim.object}` : `revises ${e.revises}` })),
    pastAtCursor: [...oldBelief.entries()].map(([k, v]) => [k, v.meaning.relation, v.meaning.object]),
    nowAtEnd: [...now.entries()].map(([k, v]) => [k, v.meaning.relation, v.meaning.object]),
    originalPreserved: oldBelief.get("Tesla|rival of|Edison"),
    currentRevision: now.get("Tesla|collaborated with|Edison"),
  };
  return result;
}
function main() {
  const res = run();
  const originalOk = res.originalPreserved && res.originalPreserved.meaning.relation === "rival of";
  const revisedOk = !!res.currentRevision && res.currentRevision.meaning.relation === "collaborated with";
  const K1 = JSON.stringify(run()) === JSON.stringify(run());
  console.log((process.argv.includes("--json") ? JSON.stringify({ ...res, K1 }, null, 1) : [
    "# self-record — append-only, cursor-indexed, revision-as-append",
    "",
    "log (append-only; nothing edited, nothing lost):",
    ...res.entries.map((e) => `  ${e.seq}  ${e.op.padEnd(6)} ${e.claim}`),
    "",
    "meaning AS OF the past cursor (seq 1):",
    ...res.pastAtCursor.map(([k, r, o]) => `  ${k.replace(/\|/g, ' ')}  ->  ${r} ${o}`),
    "",
    "meaning NOW (after the REVISE):",
    ...res.nowAtEnd.map(([k, r, o]) => `  ${k.replace(/\|/g, ' ')}  ->  ${r} ${o}`),
    "",
    `P1 IMMUTABLE PAST  ${originalOk ? "HOLDS" : "FAILS"}  the original 'rival of' is still projectable at the old cursor`,
    `P2 REVISION       ${revisedOk ? "HOLDS" : "FAILS"}  today's projection reads 'collaborated with'`,
    `K1 determinism    ${K1 ? "ok" : "BROKEN"}`,
    `K2 falsifier      ${originalOk ? "PASS" : "FAIL"}  an in-place editor would return the NEW meaning here and fail`,
  ].join("\n")));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
export { run };