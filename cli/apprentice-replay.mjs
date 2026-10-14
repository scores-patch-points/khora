#!/usr/bin/env node
// cli/apprentice-replay.mjs — THE FIRST INSTRUMENT FOR THE APPRENTICESHIP TO CLAUDE CODE (2026-10-13).
//
// THE-ONE-TIME-TEACHER.md (Law 2, §V: "the record, read back, is the learned organ") says a frontier turn's
// product is the class it compiled, not its answer. Before any class is compiled, this file measures the one
// thing that decides whether a lesson CAN be compiled from Claude's historical code edits at all:
//
//   Q1  how many edits carry a MECHANICALLY GRADABLE structural delta (an import, call, extends or declaration
//       added or removed, each with its UTF-8 byte span), against edits that only move comments, strings,
//       whitespace, or code the edge reader cannot see?
//   Q2  is that delta PREDICTABLE FROM THE PROMPT better than a null?
//
// It teaches nothing and calls no model. It builds no rule learner (the Fold has none). It reads the
// transcripts it is pointed at (~/.claude/projects/*/*.jsonl) and writes nothing outside --out/--ledger.
//
// BEFORE-BYTES ARE NEVER GUESSED, AND EVERY ROW SAYS HOW IT KNEW. The transcript persists a tool result's
// `originalFile` for only ~1 Edit in 5, so the whole file as it stood is recovered, in this order, and each
// candidate is VERIFIED against the harness's own `structuredPatch` hunks (the hunk's before-lines must sit at its
// oldStart in the candidate, and its after-lines at newStart in the applied result; old_string must be located,
// once unless replaceAll):
//   originalFile  the harness's own record on the result
//   created       a Write result of type "create": the file did not exist, before = ""
//   state         the file replayed through this transcript: a full-file Read, then each Write/Edit result applied
// A candidate that fails verification is a TYPED GAP reason, never used. The edit then falls to the FRAGMENT grade:
// the patch hunks themselves (context + changed lines; old_string/new_string when no hunk exists) read as text.
// A fragment is not the file; its spans are relative to the fragment and the row says frame:"fragment". Because
// the delta is a DIFFERENCE of two reads of the same context, what the fragment lexes wrongly lexes wrongly on
// both sides and cancels; that is a claim, so it is MEASURED: on every edit that has a file-grade before, the
// fragment delta is also computed and the report prints how often it names the same signed edge set.
// No before-bytes AND no hunk (a Write over an unread file, a failed or refused edit) is a typed gap.
//
// THE DELTA is khora's CODE reader (native/adapters/code/edges.js readEdges, with keywordsFor(language)), run on
// before and after: the multiset difference of imports / calls / extends / declared. Each added edge is
// witnessed by its byte span in `after`, each removed edge by its span in `before`; the bytes re-expand. Only
// the languages readEdges has a reader for are read (python javascript ruby c go java); every other extension
// is a typed gap `no-reader:<ext>`, counted by extension. `--ts-as-js` reads .ts/.tsx as javascript and
// labels that arm an ablation (the reader was never measured on TypeScript).
//
// AN EDIT WITH AN EMPTY DELTA is classified, not dropped, by the lineage's own lexer (adapters/code/lex.js
// lexCode + the language's CodeLexPrior): whitespace-only, comment-only, string-only, or code-no-edge-delta
// (tokens changed, none of them an import/call/extends/declaration the reader sees).
//
// Q2's PREDICTORS are mechanical and model-free, and each is scored against a BORN NULL (no hand-set
// thresholds: the null is the same predictor on deltas redealt across prompts, B draws, rank reported):
//   nearest   the delta of the nearest OTHER-SESSION prompt (IDF-weighted cosine over shared identifier
//             tokens; IDF measured on the prompts themselves) vs the true delta; score = Jaccard of edge sets.
//   echo      share of a turn's own delta names that occur as tokens in its own prompt.
// Three redeals, each severing prompt↔delta while keeping what it keeps: GLOBAL (any turn), PROJECT (within
// transcript project dir: keeps the project vocabulary prior), FILE (within turns whose most-edited file is the
// same: keeps the file's vocabulary prior). A predictor that beats GLOBAL but not FILE has learned which file,
// not what to do to it; the report says which.
//
// SCOPE (cli/apprentice-scope.json, a data file the user can change without a code change): only work done
// creating eoreader and the Fold. It is decided by the PATH of each code edit, never by prompt wording; an edit is
// IN iff a directory segment of its file_path matches an `in` pattern and none matches an `out` pattern or names a
// tier-2 directory (OUT wins; anything else is OUT). The unit is the TURN: IN only if every one of its code edits is
// IN. A turn that mixes IN and OUT code edits is withheld whole (its prompt is shared) as `withheld:mixed-scope`;
// OUT turns are not read further. Out-of-scope turns reach no yield, no predictor, no ledger.
//
// NO PERSONAL CONTENT REACHES AN OUTPUT. Two barriers, the first primary:
//   1. STRUCTURAL-ONLY BY CONSTRUCTION. A ledger row holds identifiers, module specifiers, kinds, and UTF-8 byte
//      spans that khora's code reader returned, plus an extension, a language and opaque ids. Never a string
//      literal, a comment, prompt text, tool output, file content or a path (file and project are sha256 prefixes).
//      Goffman has no matcher for names, street addresses, docket numbers, coordinates or plates, so this is
//      what stops those.
//   2. GOFFMAN (native/organs/goffman.js piiFindings/redactPii) as a FAIL-CLOSED gate on top: every string a row
//      or the report would emit is checked; a finding withholds the row as a typed gap `withheld:pii:<category>`
//      and only the category is ever counted, never a value. Prompts are redactPii'd at extraction; the
//      predictors see identifiers of the redacted prompt only. Findings in prompts and in edit content are COUNTED
//      (categories only) and do not by themselves drop a row, because no content is emitted.
// OUTPUT LOCATION. --ledger and --out refuse any path inside this repo that git does not ignore (the repo tracks
// documents/claude-code-*.jsonl); write to a scratchpad or a gitignored directory.
//
//   node cli/apprentice-replay.mjs [--root DIR] [--scope FILE] [--sample N] [--seed S] [--draws B] [--ts-as-js]
//                                  [--json] [--ledger FILE.jsonl] [--out FILE.json]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { piiFindings, redactPii } from "../native/organs/goffman.js";
import { readEdges, keywordsFor, resolveLanguage } from "../native/adapters/code/edges.js";
import { lexCode, loadCodeLexPrior, mulberry32 } from "../native/adapters/code/lex.js";

export const REPLAY_VERSION = "apprentice-replay-1";

// ═════════════════════════════ 0. what may leave: Goffman, opaque ids, output paths ═════════════════════════════
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
/** an opaque, stable id for a path or project: a sha256 prefix, never the name */
export const opaque = (s) => crypto.createHash("sha256").update(String(s ?? "")).digest("hex").slice(0, 12);
/** the Goffman categories present in `text` (counts only, never a value) */
export const piiCounts = (text) => piiFindings(text).counts;
const addCounts = (into, c) => { for (const [k, v] of Object.entries(c)) into[k] = (into[k] ?? 0) + v; return into; };
const strOf = (v) => (typeof v === "string" ? v : "");

/** every string leaf (and object key) of a value, for the fail-closed gate */
function* leaves(v) {
  if (typeof v === "string") yield v;
  else if (Array.isArray(v)) for (const x of v) yield* leaves(x);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { yield k; yield* leaves(x); }
}
/** the sorted Goffman categories across every string leaf of `v` */
export function piiCategoriesOf(v) {
  const cats = new Set();
  for (const t of leaves(v)) if (t) for (const c of Object.keys(piiCounts(t))) cats.add(c);
  return [...cats].sort();
}

/** a prompt as the instrument may hold it: redactPii'd, the redaction markers removed (they are not identifiers) */
export function scrubPrompt(text) {
  return redactPii(text).replace(/\[REDACTED:[a-z-]+\]/g, " ");
}

/** refuse a transcript-derived output path inside this repo unless git ignores it */
export function assertUntrackedOutput(p) {
  const abs = path.resolve(p);
  let dir;
  try { dir = fs.realpathSync(path.dirname(abs)); } catch { dir = path.dirname(abs); }
  const full = path.join(dir, path.basename(abs));
  const rel = path.relative(fs.existsSync(REPO) ? fs.realpathSync(REPO) : REPO, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return abs;
  const r = spawnSync("git", ["-C", REPO, "check-ignore", "-q", "--", rel]);
  if (r.status === 0) return abs;
  throw new Error(`refusing to write transcript-derived output to a tracked path (${rel}); use a scratchpad or a gitignored directory`);
}

// ═════════════════════════════ 0b. scope: which work may teach ═════════════════════════════
export function loadScope(file = path.join(HERE, "apprentice-scope.json")) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    in: j.in.map((r) => new RegExp(r)), out: j.out.map((r) => new RegExp(r)), tier2: new Set(j.tier2 ?? []),
    codeExt: new Set((j.codeExt ?? []).map((x) => x.toLowerCase())), primaryRoot: j.primaryRoot ?? null,
  };
}

/** one edit's path → { verdict: "in"|"out", why } */
export function editScope(file, scope) {
  const segs = String(file ?? "").split("/").filter(Boolean);
  if (segs.some((g) => scope.out.some((r) => r.test(g)))) return { verdict: "out", why: "out-rule" };
  if (segs.some((g) => scope.tier2.has(g))) return { verdict: "out", why: "tier2" };
  if (segs.some((g) => scope.in.some((r) => r.test(g)))) return { verdict: "in", why: "in-rule" };
  return { verdict: "out", why: "no-in-segment" };
}

/** a turn → "in" | "out" | "mixed", judged on its code edits (all its edits when it has none) */
export function scopeOfTurn(turn, scope) {
  const code = turn.edits.filter((e) => scope.codeExt.has(path.extname(e.file ?? "").toLowerCase()));
  const judged = code.length ? code : turn.edits;
  const v = judged.map((e) => editScope(e.file, scope).verdict);
  if (v.every((x) => x === "in")) return "in";
  if (v.every((x) => x === "out")) return "out";
  return "mixed";
}

// ═════════════════════════════ 1. transcripts → turns ═════════════════════════════
const REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;
const AUTOMATIC = /^(<task-notification|<command-name>|<local-command|<user-prompt-submit-hook|Caveat:|\[Request interrupted|Stop hook feedback)/;

/** The human-or-sdk prompt a user record carries, or null (tool results, notifications, peers, meta, empty). */
export function promptOf(d) {
  if (d?.type !== "user" || d.isSidechain || d.isMeta) return null;
  const o = d.origin?.kind ?? null;
  if (o && o !== "human") return null;
  if (["task_notification", "scheduled", "peer"].includes(d.turnOrigin)) return null;
  const c = d.message?.content;
  let text;
  if (typeof c === "string") text = c;
  else if (Array.isArray(c)) {
    if (c.some((b) => b?.type === "tool_result")) return null;
    text = c.filter((b) => b?.type === "text").map((b) => b.text ?? "").join("\n");
  } else return null;
  text = text.replace(REMINDER, "").trim();
  if (!text || AUTOMATIC.test(text)) return null;
  return { text, origin: o === "human" ? "human" : d.turnOrigin === "sdk" ? "sdk" : "legacy" };
}

/** the string values a tool call's input names (clipped), for "does this call touch that path" */
export function callStrings(input) {
  const out = [];
  const walk = (v) => {
    if (out.length >= 12) return;
    if (typeof v === "string") out.push(v.length > 600 ? v.slice(0, 600) : v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(input);
  return out;
}

/**
 * Stream one transcript into turns: { session, project, promptId, ts, prompt, origin, edits:[{id,tool,file,row}] },
 * each edit graded AT ITS RESULT, while the file's replayed state is what it was then. An edit made before any
 * prompt belongs to a turn with prompt = null. `seen` (tool_use ids) dedupes edits copied into forked/continued
 * transcripts; a turn left with no new edit is dropped.
 */
export async function turnsOfTranscript(file, { root, seen = new Set(), stats = {}, tsAsJs = false } = {}) {
  const session = path.basename(file, ".jsonl");
  const project = path.relative(root ?? path.dirname(path.dirname(file)), path.dirname(file)).split(path.sep)[0] || path.basename(path.dirname(file));
  const turns = [];
  let cur = null;
  const byId = new Map(); // tool_use id → { tool, file, input, edit? }
  const state = new Map(); // file → its text as the transcript last knew it entire
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  // the prompt is held only after Goffman: its findings are COUNTED (categories), its text is redacted
  const open = (p, d) => {
    cur = { session, project, promptId: d?.promptId ?? null, ts: d?.timestamp ?? null, cwd: d?.cwd ?? null, prompt: p ? scrubPrompt(p.text) : null, piiPrompt: p ? piiCounts(p.text) : {}, origin: p?.origin ?? null, edits: [], calls: [] };
    turns.push(cur);
  };
  for await (const line of rl) {
    stats.records = (stats.records ?? 0) + 1;
    if (!line.includes('"user"') && !line.includes('"tool_use"')) continue;
    let d;
    try { d = JSON.parse(line); } catch { stats.badLines = (stats.badLines ?? 0) + 1; continue; }
    if (d.type === "user") {
      const p = promptOf(d);
      if (p) { open(p, d); continue; }
      const c = d.message?.content;
      if (!Array.isArray(c)) continue;
      for (const b of c) {
        if (b?.type !== "tool_result") continue;
        const u = byId.get(b.tool_use_id);
        if (!u) continue;
        byId.delete(b.tool_use_id);
        const r = d.toolUseResult ?? { error: typeof b.content === "string" ? b.content : JSON.stringify(b.content) };
        if (u.tool === "Read") {
          const f = r?.file;
          if (f && typeof f.content === "string" && f.startLine === 1 && f.numLines === f.totalLines) state.set(u.file, f.content);
          continue;
        }
        const g = gradeEditFull({ id: b.tool_use_id, tool: u.tool, file: u.file, input: u.input, result: r }, { state: state.get(u.file), tsAsJs });
        u.edit.row = g.row;
        // what the edit's text carried (counted by category here, never kept): old/new strings, or the written content
        const c = {};
        for (const t of [u.input.old_string, u.input.new_string, u.input.content]) if (typeof t === "string" && t) addCounts(c, piiCounts(t));
        u.edit.piiContent = c;
        if (g.after !== null) state.set(u.file, g.after);
        else if (g.applied) state.delete(u.file); // the file changed and the transcript no longer knows it entire
      }
    } else if (d.type === "assistant" && !d.isSidechain && Array.isArray(d.message?.content)) {
      for (const b of d.message.content) {
        // the master's own hop sequence: every tool call of the turn, in order, with the strings it names (never
        // an Edit/Write body: only its file_path). In memory only; the trail test counts hops from it.
        if (b?.type === "tool_use" && cur && !seen.has(b.id) && !(cur.calls.length && cur.calls.some((c) => c.id === b.id))) {
          const body = b.name === "Edit" || b.name === "Write";
          cur.calls.push({ id: b.id, name: b.name, strs: callStrings(body ? { file_path: b.input?.file_path } : b.input) });
        }
        if (b?.type !== "tool_use" || !["Edit", "Write", "Read"].includes(b.name)) continue;
        const fp = b.input?.file_path ?? "";
        if (b.name === "Read") { byId.set(b.id, { tool: "Read", file: fp }); continue; }
        if (seen.has(b.id)) { stats.duplicateEdits = (stats.duplicateEdits ?? 0) + 1; continue; }
        seen.add(b.id);
        if (!cur) open(null, null);
        const edit = { id: b.id, tool: b.name, file: fp, piiContent: {}, row: { id: b.id, tool: b.name, fileId: opaque(fp), ext: path.extname(fp).toLowerCase() || "(none)", gap: "no-result" } };
        byId.set(b.id, { tool: b.name, file: fp, input: b.input ?? {}, edit });
        cur.edits.push(edit);
      }
    }
  }
  return turns.filter((t) => t.edits.length);
}

// ═════════════════════════════ 2. before / after, or a typed gap ═════════════════════════════
const splitLines = (s) => s.split("\n");
const beforeSide = (h) => h.lines.filter((l) => l[0] === " " || l[0] === "-").map((l) => l.slice(1));
const afterSide = (h) => h.lines.filter((l) => l[0] === " " || l[0] === "+").map((l) => l.slice(1));
const hunksOf = (sp) => (Array.isArray(sp) ? sp.filter((h) => h && Array.isArray(h.lines)) : []);

/** does every hunk's `side` sit at its start line in `text`? (the harness's own record vs the candidate bytes) */
export function hunksHold(text, sp, side) {
  const hs = hunksOf(sp);
  const L = splitLines(text);
  for (const h of hs) {
    const want = side === "before" ? beforeSide(h) : afterSide(h);
    const start = (side === "before" ? h.oldStart : h.newStart) - 1;
    const n = side === "before" ? h.oldLines : h.newLines;
    if (want.length !== n || start < 0) return false;
    for (let i = 0; i < n; i++) if (L[start + i] !== want[i]) return false;
  }
  return true;
}

const occurrences = (s, t) => { let n = 0, i = 0; if (!t) return 0; for (;;) { const k = s.indexOf(t, i); if (k === -1) return n; n++; i = k + t.length; } };

/** apply old→new to `before` (all occurrences iff replaceAll) -> { after, regions } */
function applyEdit(before, oldS, newS, all) {
  const regions = { before: [], after: [] };
  let after = "", i = 0, shift = 0;
  for (;;) {
    const k = before.indexOf(oldS, i);
    if (k === -1) break;
    after += before.slice(i, k) + newS;
    regions.before.push([k, k + oldS.length]);
    regions.after.push([k + shift, k + shift + newS.length]);
    shift += newS.length - oldS.length;
    i = k + oldS.length;
    if (!all) break;
  }
  return { after: after + before.slice(i), regions };
}

/** the fragment grade's two texts: the patch hunks (context + changed lines), else old_string/new_string */
export function fragmentOf(e) {
  const r = e.result ?? {};
  const hs = hunksOf(r.structuredPatch);
  if (hs.length) return { before: hs.map((h) => beforeSide(h).join("\n")).join("\n"), after: hs.map((h) => afterSide(h).join("\n")).join("\n"), source: "patch-hunks" };
  if (e.tool === "Edit") {
    const o = typeof r.oldString === "string" ? r.oldString : e.input.old_string, n = typeof r.newString === "string" ? r.newString : e.input.new_string;
    if (typeof o === "string" && typeof n === "string") return { before: o, after: n, source: "old-new-strings" };
  }
  return null;
}

/**
 * The file as it stood before the edit and as it stood after, VERIFIED, or why not:
 *   { grade:"file", via, before, after, created, regions }
 *   { grade:"fragment", via, before, after, why }         (file-grade failed for `why`; the hunks remain)
 *   { gap }                                               (nothing to read)
 */
export function reconstruct(e, { state } = {}) {
  const r = e.result;
  if (!r) return { gap: "no-result" };
  if (typeof r === "string" || r.error !== undefined) return { gap: "edit-failed" };
  const sp = r.structuredPatch;
  const frag = (why) => { const f = fragmentOf(e); return f ? { grade: "fragment", via: f.source, before: f.before, after: f.after, why } : { gap: why }; };

  if (e.tool === "Write") {
    const after = typeof r.content === "string" ? r.content : typeof e.input.content === "string" ? e.input.content : null;
    if (after === null) return { gap: "no-after-bytes" };
    if (r.type === "create") return { grade: "file", via: "created", before: "", after, created: true, regions: { before: [], after: [] } };
    for (const [via, cand] of [["originalFile", r.originalFile], ["state", state]]) {
      if (typeof cand !== "string") continue;
      if (hunksOf(sp).length ? hunksHold(cand, sp, "before") && hunksHold(after, sp, "after") : cand === after) return { grade: "file", via, before: cand, after, created: false, regions: { before: [], after: [] } };
    }
    return frag(typeof r.originalFile === "string" || typeof state === "string" ? "state-diverged" : "no-before-bytes");
  }

  const oldS = typeof r.oldString === "string" ? r.oldString : e.input.old_string;
  const newS = typeof r.newString === "string" ? r.newString : e.input.new_string;
  if (typeof oldS !== "string" || typeof newS !== "string" || oldS === "") return { gap: "no-edit-strings" };
  const all = r.replaceAll === true;
  let why = "no-before-bytes";
  for (const [via, cand] of [["originalFile", r.originalFile], ["state", state]]) {
    if (typeof cand !== "string") continue;
    const n = occurrences(cand, oldS);
    if (n === 0) { why = via === "state" ? "state-diverged" : "old-string-not-located"; continue; }
    if (n > 1 && !all) { why = "state-diverged"; continue; }
    if (hunksOf(sp).length && !hunksHold(cand, sp, "before")) { why = "state-diverged"; continue; }
    const { after, regions } = applyEdit(cand, oldS, newS, all);
    if (hunksOf(sp).length && !hunksHold(after, sp, "after")) { why = "patch-disagrees"; continue; }
    return { grade: "file", via, before: cand, after, created: false, regions };
  }
  return frag(why);
}

// ═════════════════════════════ 3. the structural delta ═════════════════════════════
function byteOffsets(text) {
  if (!/[^\x00-\x7f]/.test(text)) return (i) => i;
  const cum = new Uint32Array(text.length + 1);
  for (let k = 0; k < text.length; k++) {
    const c = text.charCodeAt(k);
    cum[k + 1] = cum[k] + (c < 0x80 ? 1 : c < 0x800 ? 2 : c >= 0xd800 && c <= 0xdbff ? 4 : c >= 0xdc00 && c <= 0xdfff ? 0 : 3);
  }
  return (i) => cum[Math.min(Math.max(i, 0), text.length)];
}

const lastSeg = (s) => String(s ?? "").split(/[/.:]/).filter(Boolean).at(-1) ?? "";

/** every edge a read orders, flattened: { key, kind, name, at, end, ... } (char offsets in the read text) */
function flatten(r, text) {
  const out = [];
  // an ABSOLUTE path specifier names directories (a home directory is a person's name): only its last segment leaves
  const spec = (m) => { const t = String(m); return /^(\/|[A-Za-z]:[\\/])/.test(t) ? `<abs>/${t.split(/[\\/]/).filter(Boolean).at(-1) ?? ""}` : t; };
  for (const e of r.imports) out.push({ kind: "import", key: `import:${spec(e.module)}`, name: spec(e.module), at: e.at, end: e.end ?? e.at + 1 });
  for (const e of r.calls) out.push({ kind: "call", key: `call:${e.callee}`, name: String(e.callee), caller: e.caller, at: e.at, end: e.end ?? e.at + 1 });
  for (const e of r.extends) out.push({ kind: "extends", key: `extends:${e.base}`, name: String(e.base), child: e.child, at: e.at, end: e.end ?? e.at + 1 });
  for (const e of r.declared) {
    const n = String(e.name);
    out.push({ kind: "declare", key: `declare:${n}`, name: n, declKind: e.kind, at: e.at, end: text.startsWith(n, e.at) ? e.at + n.length : e.at + 1 });
  }
  return out;
}

const inside = (at, regions) => regions.some(([a, b]) => at >= a && at < b);

/** the multiset surplus of `A` over `B`, one witness per surplus instance (changed-region occurrences first) */
function surplus(A, B, regions, off) {
  const count = new Map();
  for (const e of B) count.set(e.key, (count.get(e.key) ?? 0) + 1);
  const groups = new Map();
  for (const e of A) { if (!groups.has(e.key)) groups.set(e.key, []); groups.get(e.key).push(e); }
  const out = [];
  for (const [key, list] of groups) {
    const k = list.length - (count.get(key) ?? 0);
    if (k <= 0) continue;
    const ordered = [...list.filter((e) => inside(e.at, regions)), ...list.filter((e) => !inside(e.at, regions))];
    for (const e of ordered.slice(0, k)) out.push({ key, kind: e.kind, name: e.name, from: off(e.at), to: Math.max(off(e.end), off(e.at) + 1), ...(e.caller !== undefined ? { caller: e.caller } : {}), ...(e.declKind !== undefined ? { declKind: e.declKind } : {}) });
  }
  return out.sort((a, b) => a.from - b.from);
}

const TS_AS_JS = { ".ts": "javascript", ".tsx": "javascript", ".mts": "javascript", ".cts": "javascript" };

/** language the reader will read this file as, with the arm it belongs to; or null (typed gap) */
export function languageFor(file, { tsAsJs = false } = {}) {
  const l = resolveLanguage(null, file);
  if (l) return { language: l, arm: "read" };
  const ext = path.extname(file).toLowerCase();
  if (tsAsJs && TS_AS_JS[ext]) return { language: TS_AS_JS[ext], arm: "ts-as-js-ablation" };
  return null;
}

function tokenStream(text, prior) {
  return lexCode(text, prior).map((t) => ({ c: t.class, v: text.slice(t.start, t.end) }));
}
const seqEq = (a, b) => a.length === b.length && a.every((x, i) => x.c === b[i].c && x.v === b[i].v);

/** why an empty-delta edit is empty: whitespace | comment | string | code-no-edge-delta | no-change | gap */
export function classifyNonStructural(before, after, language) {
  if (before === after) return { category: "no-change" };
  const prior = loadCodeLexPrior(language);
  if (!prior) return { category: "unclassified", gap: "no-lex-prior" };
  let A, B;
  try { A = tokenStream(before, prior); B = tokenStream(after, prior); } catch { return { category: "unclassified", gap: "lexer-error" }; }
  if (seqEq(A, B)) return { category: "whitespace" };
  const noCom = (s) => s.filter((t) => t.c !== "comment");
  if (seqEq(noCom(A), noCom(B))) return { category: "comment" };
  const blank = (s) => noCom(s).map((t) => (t.c === "string" ? { c: "string", v: "" } : t));
  if (seqEq(blank(A), blank(B))) return { category: "string" };
  return { category: "code-no-edge-delta" };
}

/**
 * deltaOf({ before, after, file, regions?, tsAsJs? }) →
 *   { language, arm, category: "structural"|"whitespace"|…, added:[…], removed:[…] } or { gap }
 */
export function deltaOf({ before, after, file, regions = { before: [], after: [] }, tsAsJs = false }) {
  const lang = languageFor(file, { tsAsJs });
  if (!lang) return { gap: `no-reader:${path.extname(file).toLowerCase() || "(none)"}` };
  const kw = keywordsFor(lang.language)?.keywords ?? null;
  const read = (text) => readEdges({ text, language: lang.language, fileName: file, keywords: kw });
  const rb = read(before), ra = read(after);
  const err = rb.disclosure?.error ?? ra.disclosure?.error;
  if (err) return { gap: "reader-error", language: lang.language };
  const A = flatten(ra, after), B = flatten(rb, before);
  const added = surplus(A, B, regions.after, byteOffsets(after));
  const removed = surplus(B, A, regions.before, byteOffsets(before));
  if (added.length || removed.length) return { language: lang.language, arm: lang.arm, category: "structural", added, removed };
  return { language: lang.language, arm: lang.arm, added, removed, ...classifyNonStructural(before, after, lang.language) };
}

const signedKeys = (d) => new Set([...d.added.map((e) => `+${e.key}`), ...d.removed.map((e) => `-${e.key}`)]);

/**
 * one edit → { row, after, applied }. `row` is its ledger row (never throws: every failure is a typed gap);
 * `after` is the whole file as it stands now when that is known (it seeds the replayed state); `applied` is
 * whether the harness actually changed the file (a failed or refused edit leaves the state alone).
 */
function gradeEditRaw(e, { state, tsAsJs = false } = {}) {
  const base = { id: e.id, tool: e.tool, fileId: opaque(e.file), ext: path.extname(e.file).toLowerCase() || "(none)" };
  const r = e.result;
  const applied = !!r && typeof r !== "string" && r.error === undefined;
  const writeAfter = applied && e.tool === "Write" ? (typeof r.content === "string" ? r.content : typeof e.input?.content === "string" ? e.input.content : null) : null;
  let rec;
  try { rec = reconstruct(e, { state }); } catch (err) { rec = { gap: "reconstruct-error", detail: String(err?.message ?? err).slice(0, 120) }; }
  const after = rec.grade === "file" ? rec.after : writeAfter;
  if (rec.gap) return { row: { ...base, gap: rec.gap }, after, applied };
  let d;
  try { d = deltaOf({ before: rec.before, after: rec.after, file: e.file, regions: rec.regions ?? undefined, tsAsJs }); }
  catch { return { row: { ...base, gap: "reader-error" }, after, applied }; }
  const mode = e.tool === "Write" ? (rec.created ? "write-create" : "write-overwrite") : "edit";
  const row = { ...base, mode, frame: rec.grade, via: rec.via, ...(rec.why ? { whyNotFile: rec.why } : {}), bytesBefore: Buffer.byteLength(rec.before), bytesAfter: Buffer.byteLength(rec.after), ...d };
  // the control: on a file-grade edit, does the fragment alone name the same signed edge set?
  if (rec.grade === "file" && !rec.created && !d.gap) {
    const f = fragmentOf(e);
    if (f) {
      try {
        const fd = deltaOf({ before: f.before, after: f.after, file: e.file, tsAsJs });
        if (!fd.gap) {
          const A = signedKeys(d), B = signedKeys(fd);
          let i = 0; for (const k of A) if (B.has(k)) i++;
          const u = A.size + B.size - i;
          row.fragment = { source: f.source, category: fd.category, fileN: A.size, fragN: B.size, same: u === 0 || i === u, jaccard: u === 0 ? 1 : i / u };
        }
      } catch { /* a fragment the reader cannot read is simply not a control point */ }
    }
  }
  return { row, after, applied };
}

/**
 * The extraction boundary. Goffman is a FAIL-CLOSED gate over every string the row would emit (identifiers,
 * specifiers, kinds, extension): a finding withholds the row as the typed gap `withheld:pii:<category>`, naming
 * the category only. `after` is untouched (it seeds the in-memory state; it is never emitted).
 */
export function gradeEditFull(e, opts = {}) {
  const g = gradeEditRaw(e, opts);
  const cats = piiCategoriesOf(g.row);
  if (!cats.length) return g;
  return { ...g, row: { id: g.row.id, tool: g.row.tool, fileId: g.row.fileId, ext: "(withheld)", gap: `withheld:pii:${cats[0]}`, piiCategories: cats } };
}

export const gradeEdit = (e, opts = {}) => gradeEditFull(e, opts).row;

// ═════════════════════════════ 4. the yield report ═════════════════════════════
const bump = (m, k, n = 1) => { m[k] = (m[k] ?? 0) + n; return m; };

const blankCats = () => ({ read: 0, structural: 0, whitespace: 0, comment: 0, string: 0, "code-no-edge-delta": 0, "no-change": 0, unclassified: 0 });

/** the yield of a set of ledger rows (callers pass all rows, or only a frame's) */
export function yieldReport(rows) {
  const total = rows.length;
  const gaps = {}, cats = {}, byLang = {}, byMode = {}, byExt = {}, byVia = {};
  for (const r of rows) {
    if (r.gap) {
      bump(gaps, r.gap.startsWith("no-reader:") ? "no-reader" : r.gap);
      if (r.gap.startsWith("no-reader:")) bump(byExt, r.ext);
      continue;
    }
    bump(cats, r.category);
    bump(byVia, `${r.frame}:${r.via}`);
    const L = (byLang[r.language] ??= blankCats());
    L.read++; L[r.category]++;
    const M = (byMode[r.mode] ??= { read: 0, structural: 0 });
    M.read++; if (r.category === "structural") M.structural++;
  }
  const gapN = Object.values(gaps).reduce((a, b) => a + b, 0);
  const read = total - gapN;
  const structural = cats.structural ?? 0;
  return {
    edits: total, read, gaps, gapTotal: gapN, noReaderByExt: byExt, via: byVia,
    categories: cats, structural,
    yieldOfAll: total ? structural / total : null, yieldOfRead: read ? structural / read : null,
    byLanguage: byLang, byMode,
  };
}

/** how often the fragment grade names the same signed edge set as the file grade, over the edits that have both */
export function agreementReport(rows) {
  const p = rows.filter((r) => r.fragment);
  const same = p.filter((r) => r.fragment.same).length;
  const cat = p.filter((r) => (r.category === "structural") === (r.fragment.category === "structural")).length;
  const nonEmpty = p.filter((r) => r.category === "structural");
  return {
    n: p.length, sameSet: same, sameSetRate: p.length ? same / p.length : null,
    sameVerdict: cat, sameVerdictRate: p.length ? cat / p.length : null,
    meanJaccard: p.length ? p.reduce((a, r) => a + r.fragment.jaccard, 0) / p.length : null,
    structuralOnly: { n: nonEmpty.length, meanJaccard: nonEmpty.length ? nonEmpty.reduce((a, r) => a + r.fragment.jaccard, 0) / nonEmpty.length : null, sameSet: nonEmpty.filter((r) => r.fragment.same).length },
  };
}

// ═════════════════════════════ 5. prompt → delta, against a Born null ═════════════════════════════
/** tokens of a prompt: every [\w$.-] run, the run with edge punctuation stripped, and its pieces; lowercased */
export function tokensOf(text) {
  const out = new Set();
  for (const m of String(text ?? "").matchAll(/[A-Za-z0-9_$][\w$.\-/]*/g)) {
    const run = m[0].toLowerCase().replace(/[.\-/]+$/, "");
    if (!run) continue;
    out.add(run);
    for (const p of run.split(/[.\-/]+/)) if (p) out.add(p);
  }
  return out;
}

/** the strings an edge may be written as in a prompt: its whole name, plus what it is commonly called by */
export function nameTokens(e) {
  const n = String(e.name ?? "").toLowerCase();
  const s = new Set([n]);
  if (e.kind === "import") {
    const base = n.split("/").filter(Boolean).at(-1) ?? n; // "./lib/x.mjs" → "x.mjs", "node:fs" → "node:fs"
    s.add(base);
    s.add(base.replace(/\.[a-z0-9]+$/, ""));
    s.add(base.split(":").at(-1));
  } else s.add(lastSeg(n)); // fs.readFileSync → readfilesync; a.b.C → c
  s.delete("");
  return s;
}

/** the unit of prediction: a turn with a prompt and a non-empty delta */
export function unitsOf(turns, rowsByTurn, { kinds = null, skipCreated = false } = {}) {
  const units = [];
  turns.forEach((t, ti) => {
    if (t.prompt === null) return;
    const edges = new Map();
    const files = {};
    for (const r of rowsByTurn[ti] ?? []) {
      if (r.gap || r.category !== "structural") continue;
      if (skipCreated && r.mode === "write-create") continue;
      for (const e of r.added) if (!kinds || kinds.includes(e.kind)) if (!edges.has(e.key)) edges.set(e.key, e);
      for (const e of r.removed) if (!kinds || kinds.includes(e.kind)) if (!edges.has(e.key)) edges.set(e.key, e);
      bump(files, r.fileId);
    }
    if (!edges.size) return;
    const primary = Object.entries(files).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    units.push({ ti, ts: t.ts ?? "", session: t.session, project: t.project, primary, tokens: tokensOf(t.prompt), keys: new Set(edges.keys()), edges: [...edges.values()] });
  });
  return units;
}

const jaccard = (a, b) => {
  if (!a.size && !b.size) return 0;
  let i = 0;
  const [s, l] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of s) if (l.has(x)) i++;
  return i / (a.size + b.size - i);
};

/** IDF-weighted cosine nearest neighbour, one per unit; `ok(i,j)` says whether j may serve i. -1 = abstain (no shared token) */
export function nearest(units, ok) {
  const n = units.length;
  const df = new Map();
  for (const u of units) for (const t of u.tokens) df.set(t, (df.get(t) ?? 0) + 1);
  const vec = units.map((u) => {
    const m = new Map();
    let norm = 0;
    for (const t of u.tokens) { const w = Math.log(1 + n / df.get(t)); m.set(t, w); norm += w * w; }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of m) m.set(t, w / norm);
    return m;
  });
  const post = new Map();
  vec.forEach((m, i) => { for (const t of m.keys()) { if (!post.has(t)) post.set(t, []); post.get(t).push(i); } });
  const nn = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const acc = new Map();
    for (const [t, w] of vec[i]) for (const j of post.get(t)) if (j !== i && ok(i, j)) acc.set(j, (acc.get(j) ?? 0) + w * vec[j].get(t));
    let best = -1, bs = 0;
    for (const [j, s] of acc) if (s > bs || (s === bs && best !== -1 && j < best)) { best = j; bs = s; }
    nn[i] = best;
  }
  return nn;
}

function shuffled(idx, rnd) {
  const a = idx.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** a permutation of 0..n-1 that only permutes inside groups (group = key(i); null = its own singleton) */
export function redeal(n, group, rnd) {
  const pi = new Int32Array(n);
  const buckets = new Map();
  for (let i = 0; i < n; i++) { const g = group ? group(i) : "*"; if (g === null) { pi[i] = i; continue; } if (!buckets.has(g)) buckets.set(g, []); buckets.get(g).push(i); }
  for (const idx of buckets.values()) { const s = shuffled(idx, rnd); idx.forEach((v, k) => { pi[v] = s[k]; }); }
  return pi;
}

/** share of the units whose redeal can move anything (the null's power; a singleton group cannot move) */
const movable = (n, group) => {
  if (!group) return n;
  const c = new Map();
  for (let i = 0; i < n; i++) { const g = group(i); if (g !== null) c.set(g, (c.get(g) ?? 0) + 1); }
  let m = 0;
  for (const v of c.values()) if (v > 1) m += v;
  return m;
};

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };

/**
 * score(i, pi) is a predictor's score for unit i when unit i's delta is the one dealt to pi[i] (and every unit it
 * leans on is read through pi too). Real arm: pi = identity. The null arm: `draws` redeals.
 */
export function againstNull(n, score, { group = null, draws = 1000, seed = 1 } = {}) {
  const ident = Int32Array.from({ length: n }, (_, i) => i);
  const stat = (pi) => { let s = 0; for (let i = 0; i < n; i++) s += score(i, pi); return n ? s / n : 0; };
  const real = stat(ident);
  const rnd = mulberry32(seed);
  const nulls = [];
  for (let b = 0; b < draws; b++) nulls.push(stat(redeal(n, group, rnd)));
  const ge = nulls.filter((x) => x >= real).length;
  return { n, movable: movable(n, group), real, nullMean: mean(nulls), nullSd: sd(nulls), nullMax: nulls.length ? Math.max(...nulls) : 0, reached: ge, draws, p: (1 + ge) / (draws + 1) };
}

/** the three predictors' arms over one unit set */
export function predictability(units, { draws = 1000, seed = 1 } = {}) {
  const n = units.length;
  if (n < 2) return { n, note: "fewer than 2 units: no prediction is measurable" };
  const nnCross = nearest(units, (i, j) => units[i].session !== units[j].session);
  const nnAny = nearest(units, () => true);
  const nearestScore = (nn) => (i, pi) => (nn[i] < 0 ? 0 : jaccard(units[pi[nn[i]]].keys, units[pi[i]].keys));
  // the echo reads the unit's OWN prompt against the delta dealt to it
  const echoScore = (i, pi) => {
    const d = units[pi[i]];
    let hit = 0;
    for (const e of d.edges) { for (const t of nameTokens(e)) if (units[i].tokens.has(t)) { hit++; break; } }
    return d.edges.length ? hit / d.edges.length : 0;
  };
  const groups = {
    global: null,
    project: (i) => units[i].project,
    file: (i) => units[i].primary,
  };
  const arm = (score) => Object.fromEntries(Object.entries(groups).map(([k, g], x) => [k, againstNull(n, score, { group: g, draws, seed: seed + 17 * (x + 1) })]));
  return {
    n,
    abstained: { crossSession: Array.from(nnCross).filter((x) => x < 0).length, anySession: Array.from(nnAny).filter((x) => x < 0).length },
    nearestCrossSession: arm(nearestScore(nnCross)),
    nearestAnySession: arm(nearestScore(nnAny)),
    echo: arm(echoScore),
  };
}

// ═════════════════════════════ 5b. recurrence: what is added that was added before ═════════════════════════════
/**
 * How much of what a turn ADDS or REMOVES is an edge key some EARLIER turn of a DIFFERENT session already
 * carried: the recurrence a compiled class would live on (a name never seen twice has no class). The null redeals
 * whole deltas across the chronological positions, keeping every position's session, so what the null removes is
 * exactly the within-session clustering (the same call repeated while one file is being worked is not recurrence).
 * `pLower` is the share of redeals at or below the real rate; `pUpper` at or above.
 */
export function recurrence(units, { draws = 1000, seed = 1 } = {}) {
  const n = units.length;
  if (n < 2) return { n, note: "fewer than 2 units: no recurrence is measurable" };
  const order = units.map((_, i) => i).sort((a, b) => (units[a].ts < units[b].ts ? -1 : units[a].ts > units[b].ts ? 1 : a - b));
  const rate = (assign) => {
    const first = new Map(), multi = new Set();
    let inst = 0, seen = 0;
    for (let pos = 0; pos < n; pos++) {
      const s = units[order[pos]].session;
      for (const k of units[assign(pos)].keys) {
        inst++;
        const f = first.get(k);
        if (f === undefined) first.set(k, s);
        else { if (f !== s || multi.has(k)) seen++; if (f !== s) multi.add(k); }
      }
    }
    return { inst, seen, rate: inst ? seen / inst : 0 };
  };
  const real = rate((pos) => order[pos]);
  const rnd = mulberry32(seed + 101);
  const nulls = [];
  for (let b = 0; b < draws; b++) { const pi = redeal(n, null, rnd); nulls.push(rate((pos) => pi[order[pos]]).rate); }
  const sess = new Map(), turns = new Map(), kind = new Map();
  for (const u of units) for (const e of u.edges) {
    if (!sess.has(e.key)) sess.set(e.key, new Set());
    sess.get(e.key).add(u.session);
    turns.set(e.key, (turns.get(e.key) ?? 0) + 1);
    kind.set(e.key, e.kind);
  }
  const top = [...sess].map(([key, set]) => ({ key, kind: kind.get(key), sessions: set.size, turns: turns.get(key) })).sort((a, b) => b.sessions - a.sessions || b.turns - a.turns).slice(0, 15);
  const keysSeenInTwoSessions = [...sess.values()].filter((v) => v.size >= 2).length;
  return {
    n, instances: real.inst, seenBefore: real.seen, rate: real.rate,
    nullMean: mean(nulls), nullSd: sd(nulls), nullMax: Math.max(...nulls), draws,
    pLower: (1 + nulls.filter((x) => x <= real.rate).length) / (draws + 1),
    pUpper: (1 + nulls.filter((x) => x >= real.rate).length) / (draws + 1),
    distinctKeys: sess.size, keysInTwoOrMoreSessions: keysSeenInTwoSessions, top,
  };
}

// ═════════════════════════════ 6. the whole run ═════════════════════════════
export function listTranscripts(root) {
  const out = [];
  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(root, d.name))) if (f.endsWith(".jsonl")) out.push(path.join(root, d.name, f));
  }
  return out.sort();
}

/** a deep copy of `v` in which every string (and key) carrying a Goffman finding is replaced; `into` counts them */
export function scrubDeep(v, into) {
  const clean = (t) => {
    const c = piiCounts(t);
    if (!Object.keys(c).length) return t;
    into.strings = (into.strings ?? 0) + 1;
    addCounts((into.byCategory ??= {}), c);
    return "[withheld:pii]";
  };
  const walk = (x) => {
    if (typeof x === "string") return clean(x);
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, y]) => [clean(k), walk(y)]));
    return x;
  };
  return walk(v);
}

/** the transcript root as the report may name it: never an absolute path under a user's name */
const displayRoot = (root) => { const h = os.homedir(); return root.startsWith(h + path.sep) ? `~${path.sep}${path.relative(h, root)}` : "(custom root)"; };

export async function run({ root = path.join(os.homedir(), ".claude", "projects"), sample = null, seed = 1, draws = 1000, tsAsJs = false, files = null, ledger = null, scopeFile = undefined } = {}) {
  if (ledger) assertUntrackedOutput(ledger);
  const scope = loadScope(scopeFile);
  let list = files ?? listTranscripts(root);
  const stats = { transcripts: 0 };
  if (sample) { const rnd = mulberry32(seed); list = shuffled(list.map((_, i) => i), rnd).map((i) => list[i]); }
  const seen = new Set();
  const turns = [];
  const acct = { in: { turns: 0, edits: 0, sessions: new Set(), codeEdits: 0, codeEditsOutsidePrimaryRoot: 0 }, out: { turns: 0, edits: 0 }, mixed: { turns: 0, edits: 0 }, tier2Edits: 0, outRuleEdits: 0 };
  for (const f of list) {
    stats.transcripts++;
    for (const t of await turnsOfTranscript(f, { root, seen, stats, tsAsJs })) {
      const v = scopeOfTurn(t, scope);
      acct[v].turns++; acct[v].edits += t.edits.length;
      for (const e of t.edits) { const w = editScope(e.file, scope); if (w.why === "tier2") acct.tier2Edits++; if (w.why === "out-rule") acct.outRuleEdits++; }
      if (v !== "in") continue; // OUT and MIXED turns are not read further: no yield, no predictor, no ledger
      acct.in.sessions.add(t.session);
      for (const e of t.edits) {
        if (!scope.codeExt.has(path.extname(e.file).toLowerCase())) continue;
        acct.in.codeEdits++;
        if (scope.primaryRoot && !e.file.startsWith(scope.primaryRoot)) acct.in.codeEditsOutsidePrimaryRoot++;
      }
      turns.push(t);
    }
    if (sample && turns.length >= sample) break;
  }
  if (sample) turns.length = Math.min(turns.length, sample);
  const rowsByTurn = turns.map((t) => t.edits.map((e) => e.row));
  const rows = rowsByTurn.flat();

  // PII accounting over the IN corpus: categories only
  const pii = { prompts: { n: 0, withFindings: 0, byCategory: {} }, editContent: { edits: 0, withFindings: 0, byCategory: {} }, emittedWithheld: { rows: 0, byCategory: {} }, ledgerWithheld: { rows: 0, byCategory: {} } };
  for (const t of turns) {
    if (t.prompt !== null) { pii.prompts.n++; if (Object.keys(t.piiPrompt).length) { pii.prompts.withFindings++; addCounts(pii.prompts.byCategory, t.piiPrompt); } }
    for (const e of t.edits) {
      pii.editContent.edits++;
      if (Object.keys(e.piiContent).length) { pii.editContent.withFindings++; addCounts(pii.editContent.byCategory, e.piiContent); }
      if (e.row.piiCategories) { pii.emittedWithheld.rows++; for (const c of e.row.piiCategories) addCounts(pii.emittedWithheld.byCategory, { [c]: 1 }); }
    }
  }

  if (ledger) {
    const fd = fs.openSync(ledger, "w");
    turns.forEach((t, ti) => rowsByTurn[ti].forEach((r) => {
      // structural only: ids, kinds, spans. No prompt, no path, no content.
      const out = { session: t.session, projectId: opaque(t.project), promptId: t.promptId, ts: t.ts, ...r };
      const cats = piiCategoriesOf(out); // defence in depth at the write
      if (cats.length) { pii.ledgerWithheld.rows++; addCounts(pii.ledgerWithheld.byCategory, { [cats[0]]: 1 }); return; }
      fs.writeSync(fd, JSON.stringify(out) + "\n");
    }));
    fs.closeSync(fd);
  }
  const turnStats = {
    turnsWithEdits: turns.length,
    withPrompt: turns.filter((t) => t.prompt !== null).length,
    withStructuralDelta: rowsByTurn.filter((rs) => rs.some((r) => !r.gap && r.category === "structural")).length,
    origins: turns.reduce((m, t) => bump(m, t.origin ?? "none"), {}),
  };
  const all = unitsOf(turns, rowsByTurn);
  const kinds = {};
  for (const k of ["import", "call", "extends", "declare"]) kinds[k] = predictability(unitsOf(turns, rowsByTurn, { kinds: [k] }), { draws, seed });
  const recur = { allKinds: recurrence(all, { draws, seed }), byKind: {} };
  for (const k of ["import", "call", "extends", "declare"]) recur.byKind[k] = recurrence(unitsOf(turns, rowsByTurn, { kinds: [k] }), { draws, seed });
  const report = {
    version: REPLAY_VERSION, root: displayRoot(root), sample, seed, draws, tsAsJs, stats, turns: turnStats,
    scope: {
      in: { turns: acct.in.turns, edits: acct.in.edits, sessions: acct.in.sessions.size, codeEdits: acct.in.codeEdits, codeEditsOutsidePrimaryRoot: acct.in.codeEditsOutsidePrimaryRoot },
      out: acct.out,
      mixed: { ...acct.mixed, gap: "withheld:mixed-scope" },
      editsUnderTier2Dirs: acct.tier2Edits, editsUnderOutRuleDirs: acct.outRuleEdits,
    },
    pii: { ...pii, basis: "Goffman (native/organs/goffman.js): HIPAA-18 / GDPR / CCPA / PCI shapes; categories and counts only. NOT detected by Goffman: person names, street addresses, case/docket numbers, coordinates, plates; those are stopped by the structural-only rule, not by this gate." },
    recurrence: recur,
    yield: yieldReport(rows),
    yieldFileGrade: yieldReport(rows.map((r) => (r.frame === "fragment" ? { id: r.id, ext: r.ext, gap: "fragment-only" } : r))),
    agreement: agreementReport(rows),
    predictability: {
      allKinds: predictability(all, { draws, seed }),
      withoutCreatedFiles: predictability(unitsOf(turns, rowsByTurn, { skipCreated: true }), { draws, seed }),
      byKind: kinds,
    },
  };
  // the last barrier: nothing leaves the report with a finding in it
  const scrubbed = {};
  const clean = scrubDeep(report, scrubbed);
  clean.pii.reportScrubbed = scrubbed.strings ?? 0;
  if (scrubbed.byCategory) clean.pii.reportScrubbedByCategory = scrubbed.byCategory;
  return clean;
}

// ═════════════════════════════ 7. rendering ═════════════════════════════
const pct = (x) => (x === null || x === undefined ? "n/a" : `${(100 * x).toFixed(1)}%`);
const f4 = (x) => x.toFixed(4);

function armLine(label, a) {
  if (!a || a.p === undefined) return `    ${label.padEnd(8)} (no data)`;
  return `    ${label.padEnd(8)} real ${f4(a.real)}  null ${f4(a.nullMean)}±${f4(a.nullSd)} (max ${f4(a.nullMax)})  reached by ${a.reached}/${a.draws} redeals  p=${a.p.toFixed(4)}  movable ${a.movable}/${a.n}`;
}

function yieldBlock(L, title, y) {
  L.push(`${title}: ${y.edits} edits · read ${y.read} · typed gaps ${y.gapTotal} ${JSON.stringify(y.gaps)}`);
  L.push(`  structural delta: ${y.structural} = ${pct(y.yieldOfAll)} of all edits, ${pct(y.yieldOfRead)} of read edits`);
  L.push(`  empty-delta categories: ${JSON.stringify(Object.fromEntries(Object.entries(y.categories).filter(([k]) => k !== "structural")))}`);
  L.push("  per language      read  structural  rate    whitespace comment string code-no-edge no-change");
  for (const [k, v] of Object.entries(y.byLanguage)) L.push(`  ${k.padEnd(16)} ${String(v.read).padStart(5)} ${String(v.structural).padStart(10)}  ${pct(v.structural / v.read).padStart(6)} ${String(v.whitespace).padStart(10)} ${String(v.comment).padStart(7)} ${String(v.string).padStart(6)} ${String(v["code-no-edge-delta"]).padStart(12)} ${String(v["no-change"]).padStart(9)}`);
  L.push("  per mode          read  structural  rate");
  for (const [k, v] of Object.entries(y.byMode)) L.push(`  ${k.padEnd(16)} ${String(v.read).padStart(5)} ${String(v.structural).padStart(10)}  ${pct(v.structural / v.read).padStart(6)}`);
}

export function render(rep) {
  const y = rep.yield, L = [];
  L.push(`apprentice-replay ${rep.version} — ${rep.sample ? `sample of ${rep.sample} turns (seed ${rep.seed})` : "all transcripts"}${rep.tsAsJs ? " [ts-as-js ablation]" : ""}`);
  L.push(`transcripts ${rep.stats.transcripts} · records ${rep.stats.records ?? 0} · duplicate edits removed ${rep.stats.duplicateEdits ?? 0} · bad lines ${rep.stats.badLines ?? 0}`);
  L.push(`turns with edits ${rep.turns.turnsWithEdits} (with a prompt ${rep.turns.withPrompt}; with a structural delta ${rep.turns.withStructuralDelta}) · origins ${JSON.stringify(rep.turns.origins)}`);
  const sc = rep.scope, pc = rep.pii;
  L.push(`SCOPE (cli/apprentice-scope.json; by edit PATH): IN ${sc.in.turns} turns / ${sc.in.edits} edits / ${sc.in.sessions} sessions · ${sc.in.codeEdits} code edits, ${sc.in.codeEditsOutsidePrimaryRoot} of them outside the main checkout · OUT ${sc.out.turns} turns / ${sc.out.edits} edits · MIXED ${sc.mixed.turns} turns / ${sc.mixed.edits} edits withheld whole (${sc.mixed.gap}) · edits under tier-2 dirs ${sc.editsUnderTier2Dirs}`);
  L.push(`PII (Goffman; categories only): prompts with findings ${pc.prompts.withFindings}/${pc.prompts.n} ${JSON.stringify(pc.prompts.byCategory)} · edit content with findings ${pc.editContent.withFindings}/${pc.editContent.edits} ${JSON.stringify(pc.editContent.byCategory)} · rows withheld at extraction ${pc.emittedWithheld.rows} ${JSON.stringify(pc.emittedWithheld.byCategory)} · ledger rows withheld at write ${pc.ledgerWithheld.rows} · report strings scrubbed ${pc.reportScrubbed}`);
  L.push("");
  yieldBlock(L, "YIELD (best grade available per edit)", y);
  if (Object.keys(y.noReaderByExt).length) L.push(`  no-reader by extension: ${Object.entries(y.noReaderByExt).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}:${v}`).join(" ")}`);
  L.push(`  how the bytes were known: ${JSON.stringify(y.via)}`);
  L.push("");
  yieldBlock(L, "YIELD, STRICT (file-grade only; a fragment-graded edit counts as a gap)", rep.yieldFileGrade);
  const g = rep.agreement;
  L.push("");
  L.push(`FRAGMENT vs FILE (control, over ${g.n} edits graded both ways): same signed edge set ${g.sameSet}/${g.n} = ${pct(g.sameSetRate)} · same structural/not verdict ${pct(g.sameVerdictRate)} · mean Jaccard ${g.meanJaccard === null ? "n/a" : f4(g.meanJaccard)}`);
  L.push(`  restricted to edits with a structural delta: ${g.structuralOnly.sameSet}/${g.structuralOnly.n} identical, mean Jaccard ${g.structuralOnly.meanJaccard === null ? "n/a" : f4(g.structuralOnly.meanJaccard)}`);
  L.push("");
  const block = (title, p) => {
    L.push(`${title} — n=${p.n}${p.note ? ` (${p.note})` : ""}`);
    if (p.note) return;
    L.push(`  abstained (no shared token): cross-session ${p.abstained.crossSession}, any-session ${p.abstained.anySession}`);
    for (const [name, key] of [["nearest prompt's delta, OTHER sessions (Jaccard)", "nearestCrossSession"], ["nearest prompt's delta, any session (contaminated by continuation)", "nearestAnySession"], ["own-prompt echo of delta names (share)", "echo"]]) {
      L.push(`  ${name}`);
      for (const k of ["global", "project", "file"]) L.push(armLine(`${k} null`, p[key][k]));
    }
  };
  const rblock = (title, r) => {
    L.push(`${title} — n=${r.n}${r.note ? ` (${r.note})` : ""}`);
    if (r.note) return;
    L.push(`    added/removed edge instances ${r.instances}; seen in an EARLIER turn of a DIFFERENT session: ${r.seenBefore} = ${pct(r.rate)} · redeal null ${pct(r.nullMean)}±${pct(r.nullSd)} (max ${pct(r.nullMax)}) · pLower=${r.pLower.toFixed(4)} pUpper=${r.pUpper.toFixed(4)}`);
    L.push(`    distinct edge keys ${r.distinctKeys}, of which in ≥2 sessions ${r.keysInTwoOrMoreSessions}`);
  };
  rblock("RECURRENCE, all delta kinds", rep.recurrence.allKinds);
  for (const [k, r] of Object.entries(rep.recurrence.byKind)) rblock(`RECURRENCE, ${k} only`, r);
  if (rep.recurrence.allKinds.top) L.push("  most widely recurring keys (sessions/turns): " + rep.recurrence.allKinds.top.map((t) => `${t.key} ${t.sessions}/${t.turns}`).join(" · "));
  L.push("");
  block("PREDICTABILITY, all delta kinds", rep.predictability.allKinds);
  block("PREDICTABILITY, created files excluded", rep.predictability.withoutCreatedFiles);
  for (const [k, p] of Object.entries(rep.predictability.byKind)) block(`PREDICTABILITY, ${k} edges only`, p);
  return L.join("\n");
}

// ═════════════════════════════ CLI ═════════════════════════════
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const val = (k, d = null) => { const i = a.indexOf(k); return i === -1 ? d : a[i + 1]; };
  if (val("--out")) assertUntrackedOutput(val("--out"));
  const rep = await run({
    root: val("--root") ?? undefined, sample: val("--sample") ? Number(val("--sample")) : null, seed: Number(val("--seed", 1)),
    draws: Number(val("--draws", 1000)), tsAsJs: a.includes("--ts-as-js"), ledger: val("--ledger"), scopeFile: val("--scope") ?? undefined,
  });
  if (val("--out")) fs.writeFileSync(val("--out"), JSON.stringify(rep, null, 1));
  console.log(a.includes("--json") ? JSON.stringify(rep, null, 1) : render(rep));
}
