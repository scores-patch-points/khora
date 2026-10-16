// opencode-eot.mjs — THE ONE STORE. A task's EOT log (Provenance@2 shape: sources stored once under a
// content key, events pointing at a source and a parent, byte anchors where material exists) is the only
// thing written; the note, commons, record, claims and provenance are PROJECTIONS of it at a cursor.
//
//   <root>/<task>/eot/<agent>.jsonl     one writer per file (append-only, whole lines, no contention);
//                                       the task's log is the UNION of its writers' files.
//   rows:  { t:"src", source_id, kind, locator, anchor?, meta? }            (a source, once)
//          { t:"evt", event_id, stage, agent, ts, standing, source_id?, parent?, unit?, range?, detail? }
//
// IDS are penelope's derivation (organs/generation/provenance.mjs: sha256 of the JSON value, first 20 hex,
// `src_`/`evt_`); a test pins parity against the real function. Content-addressing is what makes a repeated
// sentence ONE source (it costs the model once) and what lets agents' logs merge by union.
//
// THE LAW THAT MAKES HALLUCINATION UNABLE TO ENTER (enforced here, not requested in a prompt):
//   · `standing` is COMPUTED from the source's kind and its anchor; a caller cannot set it.
//     "witnessed" = anchored in material that exists (a file span inside the file's bytes, a tool
//     result, a test exit code judged by the box or the loop). Anything an agent or a model SAID
//     (turn, mark, claim) is "asserted": a holder's standpoint, never a fact (MODEL_NOT_WITNESS).
//   · An `admit` (a change entering the verified record) requires a parent `verify` event that is
//     witnessed and exited 0. Words cannot admit themselves; the append is refused, typed.
//   · A file anchor beyond the file's size is refused, typed: a span cannot be claimed that isn't there.
//   · The projections that reach a model say which is which. Nothing asserted is relayed as witnessed.
//
// PURE of any model. Fails typed, never throws past the caller.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { taskDir } from "./opencode-worknotes.mjs";

export const EOT_SCHEMA = "OpenCodeEOT@1";
export const STAGES = Object.freeze(["read", "turn", "mark", "claim", "done", "draw", "hunt", "refuse", "verify", "admit", "reject", "reason", "flag", "ibid", "contend", "edit", "exec", "wt"]);
const WITNESS_KINDS = new Set(["file", "tool", "test", "fs"]);
// THE FIREWALL. Two origins, never merged: MECHANICAL (bytes a tool/fs/test produced or the stack snipped;
// anchored) and MODEL (anything an agent or a model said). The origin is a function of the source's kind,
// stamped on every row, and checked at every boundary: a model-origin source cannot author a mechanical
// stage (verify/admit/read/contend), and model text is stripped of the markers that would let it pass for
// a snip or an address (⟨…⟩, [[snip:…]], <fold-…>, evt_/src_ ids) before it is ever stored.
const MODEL_KINDS = new Set(["turn", "mark", "model", "claim"]);
const MECHANICAL_STAGES = new Set(["verify", "admit", "read", "contend", "edit", "exec", "wt"]);
export const originOf = (kind) => (MODEL_KINDS.has(kind) ? "model" : "mechanical");

/** Defang the markers a model could forge to look mechanical. Visible, but no longer parseable. */
export function neutralize(text) {
  return String(text ?? "")
    .replace(/⟨/g, "‹").replace(/⟩/g, "›").replace(/⟦/g, "‹").replace(/⟧/g, "›")
    .replace(/\[\[\s*snip:/gi, "[ snip:")
    .replace(/<\s*\/?\s*fold-/gi, (m) => m.replace(/fold-/i, "fold_"))
    .replace(/\b(evt|src)_([0-9a-f]{20})\b/g, "$1-$2");
}
const ident = (s) => { const v = String(s ?? ""); return /^[\w.-]+$/.test(v) && v !== "." && v !== ".." ? v : null; };
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** penelope's id: sha256 of the JSON value, first 20 hex, behind a prefix. */
export const stableId = (value, prefix = "src") => `${prefix}_${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20)}`;
export const sourceIdOf = ({ kind, locator }) => stableId({ kind, locator }, "src");

const dirOf = (task) => { const d = taskDir(task); return d ? path.join(d, "eot") : null; };
const fileOf = (task, agent) => { const d = dirOf(task); const a = ident(agent); return d && a ? path.join(d, `${a}.jsonl`) : null; };

const readRows = (file) => {
  try { return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); }
  catch { return []; }
};

/** The task's merged log: sources by id, events in time order. A line that does not parse is dropped. */
export function read(task) {
  const d = dirOf(task);
  const sources = new Map(), events = [];
  if (!d || !fs.existsSync(d)) return { sources, events };
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".jsonl"))) {
    for (const r of readRows(path.join(d, f))) {
      if (r.t === "src" && r.source_id) sources.set(r.source_id, r);
      else if (r.t === "evt" && r.event_id) events.push(r);
    }
  }
  events.sort((a, b) => (a.ts - b.ts) || String(a.event_id).localeCompare(String(b.event_id)));
  return { sources, events };
}

/** Compute the standing of an event from its source: the one place it is decided. */
function standingOf(source, range) {
  if (!source || !WITNESS_KINDS.has(source.kind)) return "asserted";
  const m = source.meta ?? {};
  if (source.kind === "test") return (m.judge === "box" || m.judge === "loop") && Number.isFinite(m.exit) ? "witnessed" : "asserted";
  if (source.kind === "file") return range || m.sha256 ? "witnessed" : "asserted";
  return range || m.sha256 || m.exit != null ? "witnessed" : "asserted";
}

/**
 * append({ task, agent, stage, source, parent, unit, range, detail, now }) → { ok, event_id, source_id, standing } | { ok:false, gap }
 */
export function append({ task, agent, stage, source = null, parent = null, unit = null, range = null, detail = null, now = Date.now() } = {}) {
  const file = fileOf(task, agent);
  if (!file) return { ok: false, gap: "bad-address" };
  if (!STAGES.includes(stage)) return { ok: false, gap: "bad-stage" };
  let src = null, source_id = null;
  if (source) {
    if (!source.kind || source.locator == null) return { ok: false, gap: "bad-source" };
    const origin = originOf(source.kind);
    if (origin === "model" && MECHANICAL_STAGES.has(stage)) return { ok: false, gap: "firewall_origin", detail: `a ${source.kind} cannot author a ${stage}` };
    // model content is stored defanged; the content key is taken over the DEFANGED text, so a forged
    // marker and its clean twin are the same source and neither can impersonate a snip
    source = origin === "model" ? { ...source, locator: neutralize(source.locator) } : source;
    source_id = sourceIdOf(source);
    src = { t: "src", source_id, origin, kind: source.kind, locator: String(source.locator).slice(0, 2000), ...(source.anchor ? { anchor: source.anchor } : {}), ...(source.meta ? { meta: source.meta } : {}) };
    // a span cannot be claimed that is not there
    if (source.kind === "file" && range && path.isAbsolute(String(source.locator))) {
      let size = null;
      try { size = fs.statSync(String(source.locator)).size; } catch { return { ok: false, gap: "anchor_file_missing" }; }
      if (!(Number.isFinite(range.start) && Number.isFinite(range.end) && range.start >= 0 && range.end >= range.start && range.end <= size)) return { ok: false, gap: "anchor_out_of_bounds" };
    }
  }
  // the admission law: words cannot admit themselves
  if (stage === "admit") {
    const { events, sources } = read(task);
    const v = events.find((e) => e.event_id === parent && e.stage === "verify");
    const vsrc = v ? sources.get(v.source_id) : null;
    if (!v || v.standing !== "witnessed" || !vsrc || Number(vsrc.meta?.exit) !== 0) return { ok: false, gap: "unwitnessed_admit" };
  }
  // an admit passed the law above: its parent verify is witnessed and exited 0, so it is witnessed
  const standing = stage === "admit" ? "witnessed" : standingOf(src, range);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const n = readRows(file).filter((r) => r.t === "evt").length;
  if (detail && origin_of_detail(stage)) detail = neutralizeDetail(detail);
  const body = { n, agent: String(agent), stage, source_id, parent, unit, range, detail: detail ?? null };
  const event_id = stableId(body, "evt");
  const origin = src ? src.origin : (MECHANICAL_STAGES.has(stage) ? "mechanical" : "model");
  const row = { t: "evt", event_id, stage, agent: String(agent), ts: now, origin, standing, ...(source_id ? { source_id } : {}), ...(parent ? { parent } : {}), ...(unit ? { unit } : {}), ...(range ? { range } : {}), ...(detail ? { detail } : {}) };
  // one O_APPEND write of the whole pair, so concurrent writers interleave whole lines
  fs.appendFileSync(file, `${src ? `${JSON.stringify(src)}\n` : ""}${JSON.stringify(row)}\n`);
  return { ok: true, event_id, source_id, standing };
}

const origin_of_detail = (stage) => !MECHANICAL_STAGES.has(stage);
const neutralizeDetail = (d) => { const o = {}; for (const [k, v] of Object.entries(d)) o[k] = typeof v === "string" ? neutralize(v) : v; return o; };

// ── writers' adapters: today's stores become events ───────────────────────────────────────────────

const sentencesOf = (text) => String(text ?? "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z0-9`"'(\[])/).map((s) => s.trim()).filter((s) => s.length > 1);

/** This agent's settled turns, one `turn` event per sentence (idempotent: the same unit+text is never twice). */
export function recordTurns({ task, agent, turns = [] } = {}) {
  const file = fileOf(task, agent);
  if (!file) return { ok: false, gap: "bad-address" };
  const have = new Set(readRows(file).filter((r) => r.t === "evt" && r.stage === "turn").map((r) => `${r.unit}|${r.source_id}`));
  let wrote = 0;
  for (const t of turns) {
    const sents = sentencesOf(t.answer || "(no text reply)").slice(0, 8);
    sents.forEach((s, i) => {
      const unit = `t${t.n}.s${i}`;
      const sid = sourceIdOf({ kind: "turn", locator: s });
      if (have.has(`${unit}|${sid}`)) return;
      const r = append({ task, agent, stage: "turn", source: { kind: "turn", locator: s }, unit, detail: i === 0 ? { ask: oneLine(t.ask).slice(0, 200), tools: t.grounds ?? [] } : null });
      if (r.ok) { wrote += 1; have.add(`${unit}|${sid}`); }
    });
  }
  return { ok: true, wrote };
}

export const recordMark = ({ task, agent, kind, text, now }) =>
  append({ task, agent, stage: "mark", source: { kind: "mark", locator: oneLine(text).slice(0, 500) }, detail: { kind }, now });
export const recordContention = ({ task, agent, item, holder, now }) =>
  append({ task, agent, stage: "contend", source: { kind: "tool", locator: `contended ${oneLine(item)}`, meta: { exit: null, holder, system: true, sha256: stableId({ item, holder, agent }, "sys").slice(4) } }, unit: oneLine(item), detail: { item: oneLine(item), holder }, now });
export const recordClaim = ({ task, agent, item, ttlMs, now }) =>
  append({ task, agent, stage: "claim", source: { kind: "claim", locator: oneLine(item) }, detail: { item: oneLine(item), ttlMs }, now });
export const recordDone = ({ task, agent, item, now }) =>
  append({ task, agent, stage: "done", source: { kind: "claim", locator: oneLine(item) }, detail: { item: oneLine(item) }, now });

/** A judged draw: the check's own exit code is the witness (`verify`); only a witnessed pass is admitted. */
export function recordJudged({ task, agent, referent, delta, check, exit, judge, address = null, draw = null, now }) {
  const v = append({ task, agent, stage: "verify", unit: referent, source: { kind: "test", locator: oneLine(check), meta: { exit, judge } }, detail: { referent }, now });
  if (!v.ok) return v;
  if (exit === 0) {
    const a = append({ task, agent, stage: "admit", parent: v.event_id, unit: referent, source: { kind: "file", locator: address ?? referent, meta: { delta: oneLine(delta).slice(0, 300) } }, detail: { delta: oneLine(delta).slice(0, 300), check: oneLine(check) }, now });
    return { ...a, verified: v.event_id };
  }
  const r = append({ task, agent, stage: "reject", parent: v.event_id, unit: referent, source: draw ? { kind: "model", locator: String(draw).slice(0, 300) } : null, detail: { delta: oneLine(delta).slice(0, 300) }, now });
  return { ...r, verified: v.event_id };
}

// ── the work tree: every transformation of the files is an event, the tree is a FOLD of the log ─────
// An `edit` is a witnessed observation (the door read the bytes off disk): path, op, and the before/after
// bytes stored ONCE each under a content key in eot/blobs/. `exec` is a command the box ran; `wt` is a
// worktree operation (create/remove). The work tree at any cursor is the fold of the edits up to it, so
// "what did the tree look like before agent B touched it" and "undo this" are reads, not git archaeology.
const BLOB_MAX = 2 * 1024 * 1024;
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const asBuf = (x) => (x == null ? null : Buffer.isBuffer(x) ? x : Buffer.from(String(x), "utf8"));
const blobFile = (task, id) => { const d = dirOf(task); return d && /^blob_[0-9a-f]{20}$/.test(String(id)) ? path.join(d, "blobs", id) : null; };

/** Store bytes once under their content key. Returns the blob id, or null when too large (hash still recorded by the caller). */
export function putBlob(task, bytes) {
  const buf = asBuf(bytes);
  if (!buf || buf.length > BLOB_MAX) return null;
  const id = `blob_${sha(buf).slice(0, 20)}`;
  const f = blobFile(task, id);
  if (!f) return null;
  if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); }
  return id;
}
export function getBlob(task, id) { const f = blobFile(task, id); try { return f ? fs.readFileSync(f) : null; } catch { return null; } }

const relOf = (root, file) => { const r = path.relative(root, file); return r && !r.startsWith("..") && !path.isAbsolute(r) ? r.split(path.sep).join("/") : null; };

/**
 * One file transformation. `before`/`after` are bytes (or null = absent). When `before` is omitted the tree's
 * own last state for the path stands in, so the chain never has a hole. A no-op (same bytes) is not an event.
 */
export function recordEdit({ task, agent, root, file, before, after, tool = "edit", now, tree = null } = {}) {
  const rel = relOf(root, file);
  if (!rel) return { ok: false, gap: "outside_root" };
  const prior = (tree ?? projectTree(task).files).get(rel) ?? null;
  const b = before === undefined ? (prior ? getBlob(task, prior.after) : null) : asBuf(before);
  const a = asBuf(after);
  const shaB = b ? sha(b) : prior?.sha ?? null, shaA = a ? sha(a) : null;
  if (shaB === shaA) return { ok: true, noop: true };
  const beforeId = b ? putBlob(task, b) : null, afterId = a ? putBlob(task, a) : null;
  const r = append({
    task, agent, stage: "edit", unit: rel, parent: prior?.event_id ?? null, now,
    source: { kind: "fs", locator: rel, meta: { sha256: shaA ?? "deleted" } },
    detail: { path: rel, op: !a ? "delete" : shaB == null ? "create" : "edit", tool, before: beforeId, after: afterId, shaBefore: shaB, sha: shaA, bytes: a ? a.length : 0 },
  });
  // a caller holding the fold (a sweep) keeps it current instead of re-reading the whole log per file
  if (r.ok && tree) { if (a) tree.set(rel, { path: rel, after: afterId, sha: shaA, bytes: a.length, event_id: r.event_id, agent: String(agent), ts: now ?? Date.now() }); else tree.delete(rel); }
  return r;
}

/** A command the box ran. The door saw the result, so it is witnessed; it is not a `verify`, and cannot admit. */
export const recordExec = ({ task, agent, command, ok, cwd = null, tool = "bash", now }) =>
  append({ task, agent, stage: "exec", unit: oneLine(command).slice(0, 80), now,
    source: { kind: "tool", locator: oneLine(command).slice(0, 500), meta: { exit: ok ? 0 : 1, judge: "door", sha256: stableId({ command, cwd, agent, now }, "x").slice(4) } },
    detail: { ok: !!ok, cwd, tool } });

/** A worktree operation: op is create | remove | update. */
export const recordWorktree = ({ task, agent, op, directory, branch = null, now }) =>
  append({ task, agent, stage: "wt", unit: String(directory), now,
    source: { kind: "fs", locator: String(directory), meta: { sha256: stableId({ op, directory, branch }, "wt").slice(3) } },
    detail: { op, directory: String(directory), branch } });

const IGNORE = new Set([".git", "node_modules", ".next", "dist", "build", ".turbo", ".cache", "target", ".venv"]);
function* walk(dir, root, since, budget) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (budget.n <= 0) return;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (!IGNORE.has(e.name)) yield* walk(f, root, since, budget); }
    else if (e.isFile()) { try { if (fs.statSync(f).mtimeMs >= since) { budget.n -= 1; yield f; } } catch { /* gone */ } }
  }
}

/**
 * After a command whose writes we cannot see (bash), record what changed on disk since `since`: files whose
 * mtime moved and whose bytes differ from the tree, plus tracked paths that vanished. Bounded; typed when capped.
 */
export function sweepEdits({ task, agent, root, since, tool = "bash", max = 200, now } = {}) {
  let wrote = 0;
  const budget = { n: max };
  const tree = projectTree(task).files;
  for (const f of walk(root, root, since - 2, budget)) {
    let buf = null;
    try { buf = fs.readFileSync(f); } catch { continue; }
    const r = recordEdit({ task, agent, root, file: f, after: buf, tool, now, tree });
    if (r.ok && !r.noop) wrote += 1;
  }
  for (const rel of [...tree.keys()]) {
    if (!fs.existsSync(path.join(root, rel)) && recordEdit({ task, agent, root, file: path.join(root, rel), after: null, tool, now, tree }).noop === undefined) wrote += 1;
  }
  return { ok: true, wrote, capped: budget.n <= 0 };
}

// ── projections: pure functions of the log ───────────────────────────────────────────────────────

/** The verified record: the latest WITNESSED admit per unit (last-wins), each citing its verify. */
export function projectRecord(task) {
  const { events } = read(task);
  const latest = new Map();
  for (const e of events) if (e.stage === "admit" && e.standing === "witnessed") latest.set(e.unit, e);
  return [...latest.values()].map((e) => ({ referent: e.unit, id: e.event_id, delta: e.detail?.delta ?? "", check: e.detail?.check ?? "", agent: e.agent, verify: e.parent }));
}

/** What others hold: live claims (a decaying trace) minus anything `done`, excluding this agent's own. */
export function projectTaken(task, agent, { now = Date.now(), ttlMs = 15 * 60_000 } = {}) {
  const { events } = read(task);
  const done = new Set(events.filter((e) => e.stage === "done").map((e) => e.detail?.item));
  const latest = new Map();
  for (const e of events) if (e.stage === "claim") latest.set(`${e.detail?.item}|${e.agent}`, e);
  return [...latest.values()]
    .filter((e) => e.agent !== agent && !done.has(e.detail?.item) && now - e.ts <= (e.detail?.ttlMs ?? ttlMs))
    .map((e) => ({ item: e.detail.item, agent: e.agent }));
}

/** Contention the system observed: another live agent held the path this agent edited. MECHANICAL. */
export function projectContention(task, agent, { limit = 3 } = {}) {
  const { events } = read(task);
  return events.filter((e) => e.stage === "contend" && (e.agent === agent || e.detail?.holder === agent))
    .slice(-limit).map((e) => ({ item: e.detail.item, contender: e.agent, holder: e.detail.holder }));
}

/** The blocks other agents raised, newest last. (Agent-authored: MODEL origin, never in the mechanical section.) */
export function projectBlocks(task, agent, limit = 3) {
  const { events, sources } = read(task);
  return events.filter((e) => e.stage === "mark" && e.detail?.kind === "block" && e.agent !== agent)
    .slice(-limit).map((e) => ({ agent: e.agent, text: sources.get(e.source_id)?.locator ?? "" }));
}

/**
 * The commons: other agents' asserted sentences, ONE per content key (the same sentence said twice, or by
 * two agents, is one source), ranked by term overlap with the ask, each holder's best match guaranteed,
 * each with its address. Standing is always "asserted": a standpoint, never relayed as fact.
 */
export function projectCommons(task, agent, { ask = "", max = 4 } = {}) {
  const { events, sources } = read(task);
  const askTerms = new Set(String(ask).toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []);
  const score = (t) => (String(t).toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []).filter((w) => askTerms.has(w)).length;
  const bySource = new Map();
  for (const e of events) {
    if (e.stage !== "turn" || e.agent === agent) continue;
    if (!bySource.has(e.source_id)) bySource.set(e.source_id, { ...e, text: sources.get(e.source_id)?.locator ?? "", holders: new Set() });
    bySource.get(e.source_id).holders.add(e.agent);
  }
  const all = [...bySource.values()].map((e, i) => ({ ...e, i, score: score(e.text) }));
  const picked = new Map();
  const holders = [...new Set(all.map((e) => e.agent))];
  for (const h of holders) {
    const best = all.filter((e) => e.agent === h).sort((a, b) => b.score - a.score || b.i - a.i)[0];
    if (best) picked.set(best.source_id, best);
  }
  for (const e of all.slice().sort((a, b) => b.score - a.score || b.i - a.i)) { if (picked.size >= max) break; picked.set(e.source_id, e); }
  return [...picked.values()].sort((a, b) => a.i - b.i).slice(0, Math.max(max, holders.length)).map((e) => ({
    text: e.text, ref: `${String(e.agent).replace(/^ses_/, "").slice(0, 8)}#${e.unit}`, agent: e.agent, source_id: e.source_id, standing: "asserted", also: [...e.holders].filter((h) => h !== e.agent),
  }));
}

/** The task's settled turns, reconstructed from the log in the shape the readers already use:
 *  [{ agent, n, ask, tools, text }]. Sentences are re-joined in order; the log is the only source. */
export function turnsFromLog(task) {
  const { events, sources } = read(task);
  const by = new Map();
  for (const e of events) {
    if (e.stage !== "turn") continue;
    const m = /^t(\d+)\.s(\d+)$/.exec(e.unit ?? "");
    if (!m) continue;
    const key = `${e.agent}|${m[1]}`;
    if (!by.has(key)) by.set(key, { agent: e.agent, n: Number(m[1]), ask: "", tools: [], parts: [] });
    const t = by.get(key);
    if (e.detail?.ask) t.ask = e.detail.ask;
    if (Array.isArray(e.detail?.tools)) t.tools = e.detail.tools;
    t.parts[Number(m[2])] = sources.get(e.source_id)?.locator ?? "";
  }
  return [...by.values()].map((t) => ({ agent: t.agent, n: t.n, ask: t.ask, tools: t.tools, text: t.parts.filter(Boolean).join(" ") }));
}

/** The provenance chain of a unit: every event about it in order, with the parents that justify it. */
export function projectProvenance(task, unit) {
  const { events, sources } = read(task);
  return events.filter((e) => e.unit === unit).map((e) => ({
    event_id: e.event_id, stage: e.stage, agent: e.agent, standing: e.standing, parent: e.parent ?? null,
    source: e.source_id ? { id: e.source_id, kind: sources.get(e.source_id)?.kind, meta: sources.get(e.source_id)?.meta ?? null } : null,
  }));
}


/**
 * THE WORK TREE as a fold of the log. asOf is an event_id (inclusive) or a ms timestamp; omitted = now.
 * Returns { files: Map<path, {path, after, sha, bytes, event_id, agent, ts}>, worktrees: Set<dir> }.
 */
export function projectTree(task, { asOf = null } = {}) {
  const { events } = read(task);
  const files = new Map(), worktrees = new Set();
  for (const e of events) {
    if (typeof asOf === "number" && e.ts > asOf) break;
    if (e.stage === "edit" && e.detail?.path) {
      if (e.detail.op === "delete") files.delete(e.detail.path);
      else files.set(e.detail.path, { path: e.detail.path, after: e.detail.after, sha: e.detail.sha, bytes: e.detail.bytes, event_id: e.event_id, agent: e.agent, ts: e.ts });
    } else if (e.stage === "wt" && e.detail?.directory) {
      if (e.detail.op === "remove") worktrees.delete(e.detail.directory); else worktrees.add(e.detail.directory);
    }
    if (typeof asOf === "string" && e.event_id === asOf) break;
  }
  return { files, worktrees };
}


/** The log as the panel's spine: compact events (no bytes) up to a cursor, newest last. Bytes are fetched per path. */
export function projectLog(task, { asOf = null, limit = 400 } = {}) {
  const { events } = read(task);
  const out = [];
  for (const e of events) {
    if (typeof asOf === "number" && e.ts > asOf) break;
    out.push({ id: e.event_id, ts: e.ts, stage: e.stage, agent: e.agent, standing: e.standing, origin: e.origin, ...(e.parent ? { parent: e.parent } : {}), ...(e.unit ? { unit: e.unit } : {}), ...(e.detail?.path ? { path: e.detail.path, op: e.detail.op } : {}), ...(e.detail?.directory ? { directory: e.detail.directory, op: e.detail.op } : {}) });
    if (typeof asOf === "string" && e.event_id === asOf) break;
  }
  return { total: out.length, events: out.slice(-limit) };
}

const textOf = (buf) => (buf == null ? "" : buf.includes(0) ? null : buf.toString("utf8"));
/** Every edit of one path up to a cursor, with before/after text (null = binary, "" = absent). */
export function editsOf(task, rel, { asOf = null } = {}) {
  const { events } = read(task);
  const out = [];
  for (const e of events) {
    if (typeof asOf === "number" && e.ts > asOf) break;
    if (e.stage === "edit" && e.detail?.path === rel) out.push({ id: e.event_id, at: e.ts, by: e.agent, op: e.detail.op, tool: e.detail.tool, standing: e.standing, before: textOf(e.detail.before ? getBlob(task, e.detail.before) : null), after: textOf(e.detail.after ? getBlob(task, e.detail.after) : null) });
    if (typeof asOf === "string" && e.event_id === asOf) break;
  }
  return out;
}

/** The bytes of a path at a cursor, from the blob store (null when absent or never stored). */
export function fileAt(task, rel, opts) { const f = projectTree(task, opts).files.get(rel); return f?.after ? getBlob(task, f.after) : null; }

/** What changed between two cursors: { added, removed, changed } of paths. */
export function treeDiff(task, a, b = null) {
  const A = projectTree(task, { asOf: a }).files, B = projectTree(task, { asOf: b }).files;
  const added = [], removed = [], changed = [];
  for (const [p, f] of B) { const o = A.get(p); if (!o) added.push(p); else if (o.sha !== f.sha) changed.push(p); }
  for (const p of A.keys()) if (!B.has(p)) removed.push(p);
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

/** Write the tree as of a cursor into `dir`. A path whose bytes were never stored is a typed gap, not a guess. */
export function materialize(task, dir, opts) {
  const gaps = []; let wrote = 0;
  for (const [rel, f] of projectTree(task, opts).files) {
    const buf = f.after ? getBlob(task, f.after) : null;
    if (!buf) { gaps.push(rel); continue; }
    const out = path.join(dir, rel);
    if (!relOf(dir, out)) { gaps.push(rel); continue; }
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf); wrote += 1;
  }
  return { ok: true, wrote, gaps };
}

/** Disk vs the fold: paths whose bytes moved outside the log (a `break`), the log's only blind spot. */
export function treeVsDisk(task, root) {
  const drift = [];
  for (const [rel, f] of projectTree(task).files) {
    let d = null; try { d = sha(fs.readFileSync(path.join(root, rel))); } catch { /* absent */ }
    if (d !== f.sha) drift.push({ path: rel, fold: f.sha?.slice(0, 12) ?? null, disk: d?.slice(0, 12) ?? null, last: f.agent });
  }
  return drift;
}
/** Close the blind spot by recording drift as an `external` edit, so nothing on disk is ever off the record. */
export function reconcile({ task, agent, root, now } = {}) {
  let wrote = 0;
  for (const d of treeVsDisk(task, root)) {
    let buf = null; try { buf = fs.readFileSync(path.join(root, d.path)); } catch { /* deleted */ }
    const r = recordEdit({ task, agent, root, file: path.join(root, d.path), after: buf, tool: "external", now });
    if (r.ok && !r.noop) wrote += 1;
  }
  return { ok: true, wrote };
}

/** The tree for the note: who touched what, folded by directory. Bounded; no bytes. */
export function projectTreeNote(task, { max = 6 } = {}) {
  const { files, worktrees } = projectTree(task);
  const by = new Map();
  for (const f of files.values()) { const d = f.path.includes("/") ? f.path.split("/")[0] + "/" : "."; const c = by.get(d) ?? { n: 0, agents: new Set(), ts: 0 }; c.n += 1; c.agents.add(String(f.agent).slice(0, 8)); c.ts = Math.max(c.ts, f.ts); by.set(d, c); }
  const lines = [...by].sort((a, b) => b[1].ts - a[1].ts).slice(0, max).map(([d, c]) => `${d} ${c.n} file(s) by ${[...c.agents].join(",")}`);
  return { files: files.size, worktrees: [...worktrees], lines };
}

// ── the guard: what a model SAID, typed against the log and the disk ─────────────────────────────

const PATH_RE = /(?<![\w/.-])((?:[\w.-]+\/)*[\w.-]+\.(?:mjs|cjs|js|jsx|ts|tsx|py|json|md|css|html|sh|yaml|yml|toml|go|rs|java|rb))(?![\w/-])/g;
const PASS_RE = /\b(?:all\s+)?(?:tests?|checks?|suite|build|specs?)\b[^.!?]{0,30}\b(?:pass(?:es|ed|ing)?|green|succeed(?:s|ed)?)\b|\ball\s+green\b|\b\d+\s*\/\s*\d+\s+(?:tests?\s+)?pass/i;

/**
 * groundCheck({ task, text, root, now, passWindowMs }) → { sentences:[{text, type, ref?}], flags:[{kind, detail}], summary }
 * type: "grounded" (it carries a witnessed event's content: ref names it), "asserted" (it echoes what an agent
 * said), "self:model" (it carries nothing from the log). Flags are the verifiable failures: a path that exists
 * neither on disk nor in the log, and a claim that checks pass with no witnessed passing check in the window.
 */
export function groundCheck({ task, text, root = null, now = Date.now(), passWindowMs = 30 * 60_000 } = {}) {
  const { events, sources } = read(task);
  const known = new Set();
  for (const s of sources.values()) if (s.kind === "file" || s.kind === "claim") known.add(String(s.locator).replace(/^edit\s+/, ""));
  for (const e of events) if (e.unit) known.add(String(e.unit));
  const witnessedPass = events.some((e) => e.stage === "verify" && e.standing === "witnessed" && now - e.ts <= passWindowMs && Number(sources.get(e.source_id)?.meta?.exit) === 0);
  // content terms: 4+ letters, a trailing plural/3rd-person "s" folded, so "continues" meets "continue"
  // and the function words ("the", "now", "and") never count as evidence of grounding
  const terms = (t) => new Set((String(t).toLowerCase().match(/[\p{L}\p{N}_]{4,}/gu) ?? []).map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)));
  const witnessedText = events.filter((e) => e.standing === "witnessed").map((e) => ({ e, t: terms(`${e.detail?.delta ?? ""} ${sources.get(e.source_id)?.locator ?? ""} ${e.unit ?? ""}`) }));
  const saidText = events.filter((e) => e.stage === "turn" || e.stage === "mark").map((e) => ({ e, t: terms(sources.get(e.source_id)?.locator ?? "") }));
  const flags = [], out = [];
  for (const s of sentencesOf(text)) {
    const w = terms(s);
    const overlap = (cands) => { let best = null, bestN = 0; for (const c of cands) { if (!c.t.size) continue; const n = [...w].filter((x) => c.t.has(x)).length; const r = n / Math.min(w.size || 1, c.t.size); if (n >= 2 && r >= 0.6 && n > bestN) { best = c; bestN = n; } } return best; };
    const g = overlap(witnessedText);
    const a = g ? null : overlap(saidText);
    out.push({ text: s, type: g ? "grounded" : a ? "asserted" : "self:model", ...(g ? { ref: g.e.event_id } : a ? { ref: a.e.event_id } : {}) });
    for (const m of s.matchAll(PATH_RE)) {
      const p = m[1];
      const onDisk = root ? fs.existsSync(path.join(root, p)) : false;
      const inLog = [...known].some((k) => k === p || k.endsWith(`/${p}`) || p.endsWith(`/${k}`));
      if (!onDisk && !inLog) flags.push({ kind: "unknown_path", detail: p });
    }
    if (PASS_RE.test(s) && !witnessedPass) flags.push({ kind: "unverified_pass", detail: s.slice(0, 120) });
  }
  const uniq = [...new Map(flags.map((f) => [`${f.kind}|${f.detail}`, f])).values()];
  return { sentences: out, flags: uniq, summary: { sentences: out.length, grounded: out.filter((o) => o.type === "grounded").length, asserted: out.filter((o) => o.type === "asserted").length, selfModel: out.filter((o) => o.type === "self:model").length, flagged: uniq.length } };
}

// ── snip: the model composes by REFERENCE, the stack supplies the bytes ─────────────────────────────
// A model's output work is mostly addresses. `snip(ref)` resolves one to the verbatim bytes plus the
// provenance that justifies them, and logs the read as a witnessed event, so what the model was shown
// is on the record. There is nothing to invent: an unresolvable ref is a typed gap, never a guess.
//
//   <agent8>#t3.s1        a sentence another agent settled (the commons address)
//   evt_… / src_…         an event or a source in this task's log
//   path/to/file.js#120-340   a byte span;  path/to/file.js#L10-L20   a line span   (inside the project root)
const SNIP_MAX = Number(process.env.FOLD_SNIP_MAX_BYTES ?? 4000);

export function snip({ task, agent = null, ref, root = null, now = Date.now() } = {}) {
  const r = String(ref ?? "").trim().replace(/^[⟨\[]+|[⟩\]]+$/g, "");
  if (!r) return { ok: false, gap: "no_ref" };
  const { events, sources } = read(task);

  // 1) a log id
  if (/^(?:evt|src)_[0-9a-f]{20}$/.test(r)) {
    const e = r.startsWith("evt_") ? events.find((x) => x.event_id === r) : null;
    const sid = e ? e.source_id : r.startsWith("src_") ? r : null;
    const s = sid ? sources.get(sid) : null;
    if (!s) return { ok: false, gap: "not_found", ref: r };
    return { ok: true, ref: r, bytes: String(s.locator).slice(0, SNIP_MAX), standing: e?.standing ?? standingOf(s, null), provenance: { event_id: e?.event_id ?? null, source_id: sid, kind: s.kind, agent: e?.agent ?? null } };
  }

  // 2) a commons address: <agent prefix>#t<n>.s<i>
  const c = /^([\w.-]+)#(t\d+\.s\d+)$/.exec(r);
  if (c) {
    const hit = events.find((e) => e.stage === "turn" && e.unit === c[2] && String(e.agent).replace(/^ses_/, "").startsWith(c[1].replace(/^ses_/, "")));
    const s = hit ? sources.get(hit.source_id) : null;
    if (!s) return { ok: false, gap: "not_found", ref: r };
    return { ok: true, ref: r, bytes: String(s.locator).slice(0, SNIP_MAX), standing: "asserted", provenance: { event_id: hit.event_id, source_id: hit.source_id, kind: "turn", agent: hit.agent } };
  }

  // 3) a file span under the project root
  const f = /^(.+?)#(?:L(\d+)(?:-L?(\d+))?|(\d+)-(\d+))$/.exec(r);
  if (f && root) {
    const abs = path.resolve(root, f[1]);
    const rootReal = (() => { try { return fs.realpathSync(root); } catch { return path.resolve(root); } })();
    let real; try { real = fs.realpathSync(abs); } catch { return { ok: false, gap: "not_found", ref: r }; }
    if (real !== rootReal && !real.startsWith(rootReal + path.sep)) return { ok: false, gap: "out_of_root", ref: r };
    let buf; try { buf = fs.readFileSync(real); } catch { return { ok: false, gap: "not_found", ref: r }; }
    let start, end;
    if (f[2]) {
      const lines = buf.toString("utf8").split("\n");
      const a = Number(f[2]), b = Number(f[3] ?? f[2]);
      if (a < 1 || b < a || a > lines.length) return { ok: false, gap: "out_of_bounds", ref: r };
      const upto = (n) => Buffer.byteLength(lines.slice(0, n).map((l) => `${l}\n`).join(""));
      start = upto(a - 1); end = Math.min(buf.length, upto(Math.min(b, lines.length)));
    } else { start = Number(f[4]); end = Number(f[5]); }
    if (!(start >= 0 && end > start && end <= buf.length)) return { ok: false, gap: "out_of_bounds", ref: r };
    const slice = buf.subarray(start, Math.min(end, start + SNIP_MAX));
    const sha = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
    const rel = path.relative(rootReal, real);
    // the read is a WITNESSED event: this span of these bytes was shown, here is its hash
    let logged = null;
    if (agent) logged = append({ task, agent, stage: "read", source: { kind: "file", locator: real, meta: { sha256: sha, rel } }, unit: rel, range: { unit: "byte", start, end: start + slice.length }, now });
    return { ok: true, ref: r, bytes: slice.toString("utf8"), standing: "witnessed", provenance: { kind: "file", file: rel, range: { start, end: start + slice.length }, sha256: sha, event_id: logged?.event_id ?? null }, truncated: end - start > slice.length };
  }
  return { ok: false, gap: f ? "no_root" : "unresolvable_ref", ref: r };
}

/** Expand ⟨ref⟩ / [[snip:ref]] tokens in a model's output with their verbatim bytes (mouth-last). Unresolved
 *  tokens are left visible with their gap, never silently dropped or guessed. */
export function expand(text, { task, agent = null, root = null } = {}) {
  const used = [];
  const out = String(text ?? "").replace(/⟨([^⟩\n]+)⟩|\[\[snip:([^\]\n]+)\]\]/g, (m, a, b) => {
    const s = snip({ task, agent, ref: a ?? b, root });
    if (!s.ok) return `${m}{${s.gap}}`;
    used.push({ ref: s.ref, standing: s.standing, provenance: s.provenance });
    return s.bytes;
  });
  return { text: out, used };
}
