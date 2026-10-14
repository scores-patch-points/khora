#!/usr/bin/env node
// cli/claude-code-spiral.mjs — JANUS HOLDS WHAT FOLLOWS ACROSS TURNS (2026-10-13).
// The user: "make all work done in claude follow the full janus reasoning
// pipeline" — "check the new full power of janus". cli/reason.mjs grades ONE
// run (khora's reasoning-lint: coherence, falsification, citation) and then
// forgets it; nothing carried a conclusion's STANDING forward, so turn 5 could
// withdraw what turn 2's later conclusions rested on and every gate stayed
// green. janus owns that: organs/reasoning-spiral.js (ReasoningSpiral@1, the
// append-only record whose projection makes a withdrawn premise SUSPEND its
// descendants and a re-assessed one make them STALE) and
// organs/consequence-verdict.js (EOConsequenceVerdict@1: earned / withheld /
// defeated, read off that record, never edited). This file is the wiring only
// — it holds no reasoning of its own:
//
//   LIBRARY (imported by cli/reason.mjs after its verdict): each run's claims
//   become spiral events for the session — propose (relation, for whom,
//   witnesses = the citation reason.mjs itself earned, premises = the claim's
//   own optional "premises"), then assess with the instrument that actually
//   tested it. Nothing is invented: an uncited, premise-less claim stays
//   UNLICENSED (janus's low gate), a coherent but untested one UNRESOLVED.
//
//   STOP HOOK (run as a script, after claude-code-reason-gate.mjs in the
//   doorway table): blocks when this turn moved a conclusion that stood
//   SUPPORTED at the turn's start to suspended / stale / refuted, naming each
//   and janus's own question for it — and EACH VERDICT IS DELIVERED AT MOST
//   ONCE (nesting-fix J D4, 2026-10-14). The loop guard used to be
//   stop_hook_active, which shadowed this gate in exactly the turn where the
//   reason-gate had blocked Stop #1 and the model's reasoning run moved a
//   claim: Stop #2 is stop_hook_active, so the verdict was never spoken. The
//   guard is now the verdict's own key (claim, standing, the record position
//   it began standing there): recordRun appends it to a small append-only
//   pending record (~/.claude/eo-reason/pending/<session>.jsonl), the Stop
//   gate delivers every pending verdict still true, and a `delivered` line
//   retires it — so a verdict is carried forward until it is heard, then
//   never again, active stop or not, and a verdict that stopped being true
//   is retired as `resolved` without a word.
//   Off switch: ~/.claude/eo-reason/steer.off. Fails open, logged. Never
//   writes the session state file (the lost-update class the ledger's other
//   Stop readers are written against).
//
// THE MAPPING, declared (cli/reason.mjs's own outputs → janus's vocabulary):
//   id        the claim's content, `[¬]rel(ARG0, ARG1) @ ground` — a run-local
//             "id" ("a", "c1") is reused across runs, so it never names a node.
//   witness   reason.mjs's `cited` source at file:line, as `file#L-(L+1)` (a
//             LINE span: citeGround reports lines, not bytes — disclosed). A
//             citation whose polarity guard is unreachable (it cannot tell the
//             claim from its own denial) is NOT a witness for it.
//   refuted   an error finding that names the claim (findings carry `claims`);
//             method perturbation for a falsification kind, else deduction.
//   supported perturbation, when falsifyGfp confirmed the strict claim's guard
//             reachable; else testimony, when cited. Premises must themselves
//             stand supported (janus refuses otherwise, on the record).
//   regrounded  a claim first proposed with no ground (unlicensed) and later
//             restated WITH one is withdrawn ("re-proposed with a ground") and
//             re-proposed as `<id> ·rN` — janus fixes a proposal's ground when it is
//             proposed, so later evidence needs a new proposal. Premises resolve to the latest revision.
//   revision  a claim WITHDRAWS an earlier live one in its slot (same ground,
//             rel, ARG0) when it flips the polarity of the same ARG1
//             (retraction), or when the run declares rel functional and the
//             ARG1 differs (one-valued revision). Nothing else supersedes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { probeSpiral, layerRecord, absentLine } from "./spiral-layer.mjs";
import { str, claimKey, claimId, slotOf, metaOf, functionalRels, revisionKind } from "./claim-identity.mjs";
export { claimKey, claimId };
import { EO_DIR, steeringOff, sidOf, loadState, logError } from "./claude-code-state.mjs";
import { readEdges, keywordsFor, resolveLanguage } from "../native/adapters/code/edges.js";

// THE LAYER, TYPED (2026-10-14, nesting-fix J D1). janus's spiral organs exist only on its unmerged branch; their
// absence is a state this file reports ("spiral-absent", naming the module — cli/spiral-layer.mjs), never an import
// error. Resolved once at load; EO_JANUS_ROOT points it at another janus checkout.
export const spiralLayer = await probeSpiral();
export class SpiralAbsent extends Error {
  constructor(layer) { super(absentLine(layer)); this.name = "SpiralAbsent"; this.code = "spiral-absent"; this.layer = layerRecord(layer); }
}
const need = () => { if (spiralLayer.state !== "present") throw new SpiralAbsent(spiralLayer); return spiralLayer; };
const appendReasoning = (...a) => need().appendReasoning(...a);
const reasoningAt = (...a) => need().reasoningAt(...a);
const consequenceVerdict = (...a) => need().consequenceVerdict(...a);

// The record's location and reader live in cli/spiral-read.mjs (so recall can read the same record).
import { SPIRAL_DIR, safeSid, spiralFile, loadSpiral } from "./spiral-read.mjs";
export { SPIRAL_DIR, spiralFile, loadSpiral };

// Identity (claimKey/claimId, slotOf, revisionKind) lives in cli/claim-identity.mjs — ONE place, shared with the
// ledger's claim lines, so the spiral node id and the ledger's `claimId` are the same string for one claim.
const FALSIFY_KIND = /falsif|strict|ant_/;

/** Pure: one reason.mjs run → the spiral log with this run's events appended. */
export function spiralEventsOf(log, run, { forWhom, at = new Date().toISOString(), readGround = null } = {}) {
  const { declared = [], inputClaims = [], findings = [], sources = [], declare = {} } = run;
  const functional = functionalRels(declare);
  const localKey = new Map(declared.map((c, i) => [str(inputClaims[i]?.id ?? c.id), claimId(c)]));
  let out = log;
  const meta = new Map(); // id → { key, slot, object, polarity } from the record's own propose events
  const current = new Map(); // content key → the id of its latest proposal (a revision is `<key> ·rN`)
  const revisions = new Map();
  const noteProposal = (id, claim) => { meta.set(id, claim); current.set(claim.key ?? id, id); revisions.set(claim.key ?? id, (revisions.get(claim.key ?? id) ?? 0) + 1); };
  for (const e of out) if (e.kind === "propose" && e.claim) noteProposal(e.id, e.claim);
  const idOf = (k) => current.get(k) ?? k; // a content key IS the claim id (claimId); a revision is `<id> ·rN`

  declared.forEach((c, i) => {
    const key = claimId(c);
    const fold = reasoningAt(out);
    let id = idOf(key);
    const node = fold.claims.find((n) => n.id === id);
    const here = metaOf(c);

    // Revision: retire what this claim supersedes in its own slot.
    for (const n of fold.claims) {
      const m = meta.get(n.id);
      if (!m || (m.key ?? n.id) === key || m.slot !== here.slot || n.standing === "withdrawn") continue;
      const kind = revisionKind({ ...m, key: m.key ?? n.id }, here, functional);
      if (kind) out = appendReasoning(out, { kind: "withdraw", id: n.id, basis: `${kind === "retraction" ? "retracted" : "one-valued revision"} by ${key}`, at });
    }

    const src = sources[i] ?? {};
    const reading = typeof readGround === "function" ? readGround(c) : null;
    const witnesses = [
      ...(reading?.witness ? [reading.witness] : []),
      ...(src.verdict === "cited" && Number.isInteger(src.line) && src.guard?.reachable !== false ? [`${src.file ?? c.ground}#${src.line}-${src.line + 1}`] : []),
    ];
    const premises = (inputClaims[i]?.premises ?? []).map((p) => idOf(localKey.get(str(p)) ?? str(p))).filter(Boolean);
    const propose = (pid) => {
      out = appendReasoning(out, { kind: "propose", id: pid, relation: { subject: str(c.roles?.ARG0), verb: str(c.rel), object: str(c.roles?.ARG1) },
        forWhom, premises, witnesses, claim: here, said: inputClaims[i]?.said ?? null, at,
        ...(run.ledger?.claims?.[i] ? { ledger: { run: run.ledger.runId ?? null, line: run.ledger.claims[i] } } : {}) });
      noteProposal(pid, here);
      id = pid;
    };

    if (!node) propose(key);
    else if (!node.low.ok && (witnesses.length || premises.length)) {
      // janus fixes a proposal's ground at proposal; a ground that arrives later is a NEW proposal of the same
      // claim. The ungrounded one is withdrawn on the record (never erased), then the claim is re-proposed.
      out = appendReasoning(out, { kind: "withdraw", id, basis: `re-proposed with a ground: ${witnesses[0] ?? `premises ${premises.join(", ")}`}`, at });
      propose(`${key} ·r${(revisions.get(key) ?? 1) + 1}`);
    } else if (node.standing === "withdrawn") {
      out = appendReasoning(out, { kind: "reopen", id, basis: "restated", at });
    }
    // janus's low gate: nothing to test against → stays unlicensed, never assessed.
    const proposed = reasoningAt(out).claims.find((n) => n.id === id);
    if (!proposed?.low.ok) return;

    const cid = str(c.id ?? inputClaims[i]?.id);
    const errs = findings.filter((f) => f.severity === "error" && (f.claims ?? []).includes(cid));
    const reachable = c.force === "strict" && findings.some((f) => f.kind === "strict_guard_reachable" && (f.claims ?? []).includes(cid));
    const verdict = errs.length
      ? { verdict: "refuted", method: FALSIFY_KIND.test(errs[0].kind) ? "perturbation" : "deduction", by: `khora:reason.mjs#${errs[0].kind}`, basis: str(errs[0].detail).split("\n")[0] }
      : reading ? { verdict: reading.holds ? "supported" : "refuted", method: "testimony", by: reading.by, basis: reading.basis }
      : reachable ? { verdict: "supported", method: "perturbation", by: "khora:falsifyGfp", basis: "the strict claim's declared guard was reached by a synthetic counterexample and held" }
      : witnesses.length ? { verdict: "supported", method: "testimony", by: "khora:citeGround", basis: `cited at ${witnesses[0]}` }
      : { verdict: "unresolved", method: "deduction", by: "khora:lintGfp", basis: "coherent with this run's claims; not tested by any instrument" };
    const prior = proposed.assessment;
    if (prior && prior.verdict === verdict.verdict && prior.method === verdict.method && proposed.standing !== "withdrawn") return; // a restatement is not a re-assessment
    out = appendReasoning(out, { kind: "assess", id, ...verdict, witnesses, at });
  });
  return out;
}

// THE GROUND, READ BY KHORA (2026-10-13). citeGround's citation mostly cannot
// tell a claim from its denial (measured on this file's first live run: 1 of
// 12 earned), and khora's PROSE reader reads ~nothing true off code (0 of 12;
// it reads punctuation as verbs there — adapters/code/scan.js's own header
// says why). khora's CODE reader (adapters/code/edges.js readEdges) reads what
// a file ORDERS — imports, calls, extends, declarations — causally, over every
// byte, each edge at its offsets. A claim whose rel is one of those orders, at
// a ground that resolves to a code file, is read here; its witness is the
// edge's exact UTF-8 byte span (`file#from-to`), so it re-expands to the bytes.
//   positive claim, edge read      → holds (witness: the edge's span)
//   positive claim, no edge read   → null: the reader not finding is not a refutation
//   negative claim, no edge, whole file consumed → holds (witness: the whole file's span — absence over a full read)
//   negative claim, edge read      → does NOT hold (witness: the edge that contradicts it)
// ARG1 matches a module by its last path segment without extension, a callee by
// its last member segment. A scope after the file (<file>/<fn>) restricts calls
// to that caller. Every other rel, and every non-code file, is not read here.
const CODE_ORDERS = new Set(["imports", "calls", "extends", "declares"]);
const lastSeg = (s) => str(s).split(/[/.]/).filter(Boolean).at(-1)?.toLowerCase() ?? "";
const moduleStem = (m) => str(m).split("/").at(-1).replace(/\.[A-Za-z0-9]+$/, "").toLowerCase();
const byteAt = (text, i) => Buffer.byteLength(text.slice(0, i));

export function codeGroundReader() {
  const cache = new Map();
  const fileOf = (g) => { let p = str(g); while (p && p !== "/" && !fs.existsSync(p)) p = path.dirname(p); try { return p && fs.statSync(p).isFile() ? p : null; } catch { return null; } };
  return (c) => {
    if (!CODE_ORDERS.has(str(c.rel))) return null;
    const file = fileOf(c.ground);
    const language = file && resolveLanguage(null, file);
    if (!language) return null;
    if (!cache.has(file)) {
      const text = fs.readFileSync(file, "utf8");
      cache.set(file, { text, r: readEdges({ text, language, fileName: file, keywords: keywordsFor(language)?.keywords ?? null }) });
    }
    const { text, r } = cache.get(file);
    const scope = str(c.ground).slice(file.length).split("/").filter(Boolean).at(-1) ?? null;
    const want = str(c.roles?.ARG1).toLowerCase();
    const hits = c.rel === "imports" ? r.imports.filter((e) => moduleStem(e.module) === want || str(e.module).toLowerCase() === want)
      : c.rel === "calls" ? r.calls.filter((e) => lastSeg(e.callee) === lastSeg(want) && (!scope || e.caller === scope))
      : c.rel === "extends" ? r.extends.filter((e) => lastSeg(e.base) === lastSeg(want))
      : r.declared.filter((e) => str(e.name).toLowerCase() === want);
    const negative = c.polarity === "-";
    const by = "khora:adapters/code/edges.js#readEdges";
    if (hits.length) {
      const h = hits[0], from = byteAt(text, h.at), to = byteAt(text, h.end ?? h.at + 1);
      return { holds: !negative, witness: `${file}#${from}-${Math.max(to, from + 1)}`, by, basis: `${negative ? "read the order the claim denies" : "read"}: ${c.rel} ${h.module ?? h.callee ?? h.base ?? h.name}${h.caller ? ` from ${h.caller}` : ""} (${hits.length} occurrence(s))` };
    }
    if (negative && r.consumed >= text.length) return { holds: true, witness: `${file}#0-${Buffer.byteLength(text)}`, by, basis: `no ${c.rel} ${want}${scope ? ` from ${scope}` : ""} in a read of the whole file` };
    return null;
  };
}

/** What this stretch of the record moved: conclusions SUPPORTED at `fromSeq` that no longer are. */
export function movedSince(log, fromSeq) {
  const before = new Map(reasoningAt(log, { asOf: fromSeq }).claims.map((n) => [n.id, n.standing]));
  const now = reasoningAt(log);
  const question = new Map(now.openings.map((o) => [o.id, o.question]));
  return now.claims
    .filter((n) => before.get(n.id) === "supported" && ["suspended", "stale", "refuted"].includes(n.standing))
    .map((n) => ({ id: n.id, standing: n.standing, because: n.because, question: question.get(n.id) ?? "What now supports or refutes this?" }));
}

// ── PENDING VERDICTS (nesting-fix J D4) ─────────────────────────────────────
export const PENDING_DIR = path.join(EO_DIR, "pending");
export const pendingFile = (sid) => path.join(PENDING_DIR, `${safeSid(sid)}.jsonl`);
export function loadPending(sid) {
  let raw = "";
  try { raw = fs.readFileSync(pendingFile(sid), "utf8"); } catch { return []; }
  const out = [];
  for (const l of raw.split("\n")) { if (!l) continue; try { out.push(JSON.parse(l)); } catch { /* a torn line is not a verdict */ } }
  return out;
}
export function appendPending(sid, entries) {
  if (!entries.length) return;
  fs.mkdirSync(PENDING_DIR, { recursive: true });
  fs.appendFileSync(pendingFile(sid), entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
}
const ADVERSE = new Set(["suspended", "stale", "refuted"]);

/** The record position at which `id` began standing at `standing`, unbroken until now — what tells a claim that was
 *  suspended, re-earned and suspended again from the same suspension heard twice. */
function sinceSeq(log, id, standing) {
  let since = log.length;
  for (let k = log.length - 1; k >= 0; k--) {
    const n = reasoningAt(log, { asOf: k }).claims.find((x) => x.id === id);
    if (n?.standing !== standing) break;
    since = k;
  }
  return since;
}
/** One moved conclusion, as a verdict with the key that makes it deliverable once. */
export const verdictOf = (log, m) => ({ key: `${m.id}|${m.standing}|${sinceSeq(log, m.id, m.standing)}`, id: m.id, standing: m.standing, because: m.because, question: m.question });

const renderVerdicts = (moved, { carried = false } = {}) => [
  `**janus: ${carried ? "an earlier turn" : "this turn"} moved earlier conclusions off their standing.** These stood SUPPORTED before:`,
  "",
  ...moved.map((m) => `- **${m.id}**: now **${m.standing}** (${(m.because ?? []).join("; ")}). ${m.question}`),
  "",
  "Re-run `cli/reason.mjs` with each restated (and its `premises`) to re-earn it, or say plainly that it no longer holds. Each verdict is spoken once; the record keeps the history either way.",
].join("\n");

/** What the Stop gate owes the session now: every pending-or-derived verdict that is still true and not yet
 *  delivered. Pure over (pending lines, log, turnStart). Returns {reason, deliver:[keys], resolved:[keys]}. */
export function pendingDecision(pending, log, turnStart) {
  const delivered = new Set(pending.filter((e) => e.kind === "delivered").map((e) => e.key));
  const cands = new Map();
  for (const e of pending) if (e.kind === "verdict" && !delivered.has(e.key)) cands.set(e.key, { ...e, carried: !!(turnStart && e.turnStart && e.turnStart < turnStart) });
  if (log.length && turnStart) { // this turn's own moves, even if recordRun never wrote them (another writer, an older run)
    const first = log.findIndex((e) => typeof e.at === "string" && e.at >= turnStart);
    if (first >= 0) for (const m of movedSince(log, first)) { const v = verdictOf(log, m); if (!delivered.has(v.key) && !cands.has(v.key)) cands.set(v.key, { ...v, carried: false }); }
  }
  if (!cands.size) return { reason: null, deliver: [], resolved: [] };
  const now = new Map(reasoningAt(log).claims.map((n) => [n.id, n]));
  const live = [], resolved = [];
  for (const v of cands.values()) { const n = now.get(v.id); (n && ADVERSE.has(n.standing) && n.standing === v.standing ? live : resolved).push(v); }
  return {
    reason: live.length ? renderVerdicts(live, { carried: live.every((v) => v.carried) }) : null,
    deliver: live.map((v) => v.key), resolved: resolved.map((v) => v.key),
  };
}

/** I/O: append one run's events to the session's spiral; return janus's verdict on it. */
export function recordRun(sid, run, { at = new Date().toISOString() } = {}) {
  // Absent layer: nothing to record on and no verdict to give — a TYPED result, never an exception, never an OK.
  if (spiralLayer.state !== "present") return { ...layerRecord(spiralLayer), recorded: false, line: absentLine(spiralLayer) };
  const log = loadSpiral(sid);
  const next = spiralEventsOf(log, run, { forWhom: `session:${safeSid(sid)}`, at, readGround: codeGroundReader() });
  if (next.length > log.length) {
    fs.mkdirSync(SPIRAL_DIR, { recursive: true });
    fs.appendFileSync(spiralFile(sid), next.slice(log.length).map((e) => JSON.stringify(e)).join("\n") + "\n");
  }
  const v = consequenceVerdict(next);
  // Count each claim once, at its CURRENT revision: a superseded proposal (`<key>` after `<key> ·r2`) stays on
  // the record — janus keeps it, unlicensed — but is not a second claim. The superseded count is disclosed.
  const latest = new Map();
  for (const e of next) if (e.kind === "propose") latest.set(e.claim?.key ?? e.id, e.id);
  const live = new Set(latest.values());
  const only = (ids) => ids.filter((x) => live.has(x)).length;
  const earned = only(v.earned), defeated = only(v.defeated);
  const moved = movedSince(next, log.length);
  if (moved.length) {
    // Carry each moved conclusion forward until the Stop gate has spoken it (J D4). Never throws into the run.
    try {
      const have = new Set(loadPending(sid).filter((e) => e.kind === "verdict").map((e) => e.key));
      const turnStart = loadState(sid).turnStart ?? null;
      appendPending(sid, moved.map((m) => verdictOf(next, m)).filter((v) => !have.has(v.key)).map((v) => ({ kind: "verdict", ...v, at, turnStart })));
    } catch (e) { logError("claude-code-spiral:pending", e); }
  }
  return { state: "present", file: spiralFile(sid), events: next.length, earned, withheld: only(v.withheld), defeated,
    retainedMind: earned - defeated, superseded: v.earned.length + v.withheld.length + v.defeated.length - live.size, byStanding: v.byStanding, refused: v.refused.filter((r) => r.seq >= log.length),
    moved };
}

/** Pure Stop decision over a session's spiral and the turn start (ISO) the ledger recorded. */
export function stopDecision(log, turnStart) {
  if (!log.length || !turnStart) return null;
  need();
  const firstThisTurn = log.findIndex((e) => typeof e.at === "string" && e.at >= turnStart);
  if (firstThisTurn < 0) return null;
  const moved = movedSince(log, firstThisTurn);
  if (!moved.length) return null;
  return [
    "**janus: this turn moved earlier conclusions off their standing.** These stood SUPPORTED when the turn began:",
    "",
    ...moved.map((m) => `- **${m.id}**: now **${m.standing}** (${m.because.join("; ")}). ${m.question}`),
    "",
    "Re-run `cli/reason.mjs` with each restated (and its `premises`) to re-earn it, or say plainly that it no longer holds. This gate blocks once; the record keeps the history either way.",
  ].join("\n");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    const ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
    if (spiralLayer.state !== "present") {
      // Typed, on the error log and in the exit path: no verdict can be given, and the doorway records the same state
      // on the reason ledger. The script itself exits 0 — an absent layer must not look like a crashed gate.
      logError("claude-code-spiral", new SpiralAbsent(spiralLayer));
    } else if (ev.hook_event_name === "Stop" && !steeringOff()) {
      // stop_hook_active does NOT pass this gate (J D4): the guard against a loop is that each verdict is delivered
      // once — recorded before the answer is written, so a verdict can never be spoken twice.
      const sid = sidOf(ev);
      const d = pendingDecision(loadPending(sid), loadSpiral(sid), loadState(sid).turnStart);
      const at = new Date().toISOString();
      appendPending(sid, [...d.deliver.map((key) => ({ kind: "delivered", key, at, viaActiveStop: !!ev.stop_hook_active })),
        ...d.resolved.map((key) => ({ kind: "delivered", key, at, outcome: "resolved" }))]);
      if (d.reason) process.stdout.write(JSON.stringify({ decision: "block", reason: d.reason }));
    }
  } catch (e) { logError("claude-code-spiral", e); }
}
