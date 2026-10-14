#!/usr/bin/env node
// cli/apprentice-mover.mjs — THE SECOND TEACHING INSTRUMENT: MAKING THE CHANGE AT THE PLACE (2026-10-13).
//
// The trail test (apprentice-trail.mjs) asks whether the mechanical unconscious would REACH the place the master
// (Claude Code) edited. This file asks the complementary question: standing at the right place, can it MAKE THE
// CHANGE? No model is called anywhere here. The local model is only the mouth; everything below is the mechanical
// unconscious: native/adapters/code/mechanical.js derives candidate edit bytes from the file's own bytes plus
// received priors, and khora's code reader (readEdges, through apprentice-replay.mjs's deltaOf) grades them.
//
// TWO TESTS, on in-scope edits whose before/after is known at FILE grade and whose structural delta is nonempty:
//
//   1. FOLLOW-THROUGH. The master's delta for one edit is split into a SEED and the REST. The rest is what the
//      edit added that the seed may imply: the import statements and the whole top-level declarations it added.
//      SEEDED = the after-text with those statements and declarations cut out (so it holds the master's calls but
//      not their support). REST = deltaOf(seeded → after), its non-call edges (readEdges-normalised keys). SEED =
//      the calls deltaOf(before → seeded) adds. What the edit added that cannot be cut out cleanly (a method added
//      inside an existing class, a declaration whose parsed extent swallows a neighbour) is the typed gap
//      `unseparable`, counted, never scored as rest. The unconscious then proposes, from SEEDED alone:
//        names    missingImports(seeded) minus missingImports(before): names the seed left unbound
//        C callee keep only names the seed CALLS (missingImports also flags params and locals it cannot bind)
//        G ambient LESSON: drop names that earlier sessions' master left unbound more often than it bound them
//                 (globals such as parseInt; there is no received builtins prior in the repo)
//        W world  resolve a name to an import specifier from files this session holds entire at that moment
//                 (in-scope files whose bytes it Read or wrote): an exported declaration, else another file's
//                 import binding. A specifier the seeded text already imports is an EXTEND (no new edge).
//        L lesson LESSON: resolve a name from earlier sessions' import bindings and exported declarations
//        S stub   synthesizeStub(name, callArityOf arity) when nothing resolves it
//      Each proposal's keys are read by deltaOf on its own snippet; the FULL proposal is also assembled into the
//      file (imports at importAnchor, stubs appended) and read whole, and the agreement is reported (a control).
//      Score per edit: signed-edge Jaccard of predicted vs REST (both empty = 1), recall, extras.
//      NULL: the same FULL unconscious with the seed SWAPPED: the edit's own seed lines are removed from SEEDED
//      and another session's seed lines (same language, an IN edit already read; the null is not a lesson, so its
//      donors need not be earlier in time) are put in their place.
//
//   2. RIPPLE. Given the first code file the master edited in a turn, predict which other code files the turn also
//      edited (fileId co-occurrence LESSON) and which signed move kinds it made there (move-kind co-occurrence
//      LESSON: the first file's signed-kind signature → each partner's kinds). OFF predicts nothing beyond the first
//      file. NULL: lessons learned from a SHUFFLED HISTORY (file labels permuted across all history slots, keeping
//      turn sizes and file frequencies; partner kind sets permuted across partner slots, keeping signatures).
//      Files: R-precision (k = the master's own number of other files, a disclosed oracle on how many) and a
//      majority rule (predict g iff P(g | first) > 1/2, no oracle). Moves: majority rule per kind, Jaccard.
//      N norm: a component that reads a file's identity as its path below the in-scope root (worktrees and repo
//      copies collapse) instead of its absolute path.
//
// A DIFFERENCE THAT MAKES A DIFFERENCE (the-fold-latest/handbook/102; memory feedback_lesson_must_make_a_difference):
// a lesson or component counts only if switching it ON changes the result against the same run with it OFF, on
// the same held-out units, by a PAIRED sign-flip permutation (cluster = session, two-sided), p at its draw floor
// 1/(draws+1). One that changes nothing is reported "noticed, not learned".
// PREQUENTIAL: every lesson is learned only from OTHER sessions' units strictly earlier (by timestamp) than the
// unit being scored, inserted in time order; the world (W) is the scored session's own bytes at that moment.
//
// PRIVACY, unchanged from the replay instrument. Rows are structural only: opaque fileIds, identifiers, module
// specifiers (absolute ones cut to their last segment by deltaOf; any specifier naming the home directory is cut
// the same way here), kinds, counts and scores. No prompt, code text or path is ever emitted. Goffman's
// piiFindings is a FAIL-CLOSED gate on every emitted ledger row (a finding withholds the row, its category
// counted) and scrubDeep runs over the whole report. --ledger/--out refuse a tracked path in this repo.
//
// DISCLOSED SIMPLIFICATIONS (each also a typed gap or a count in the report):
//   - import bindings and `export const` names are read by small regexes over the import statement the reader
//     located (ESM import/require; Python from/import). Python specifiers are never synthesised from a file path.
//   - a statement's extent is the lines from its opening keyword to the end of the line its specifier ends on.
//   - seed lines are whole lines holding a seed call; a multi-line call leaves its tail behind in the null base.
//   - stub keys come from synthesizeStub's own bytes; the reader may declare one stub twice (multiset noise that
//     set-Jaccard ignores).
//
//   node cli/apprentice-mover.mjs [--root DIR] [--scope FILE] [--sample N] [--seed S] [--draws B] [--donors K]
//                                 [--nulls K] [--ts-as-js] [--ledger FILE.jsonl] [--out FILE.json] [--json]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  reconstruct, gradeEditFull, deltaOf, languageFor, loadScope, scopeOfTurn, editScope, opaque, piiCategoriesOf,
  scrubDeep, assertUntrackedOutput, listTranscripts, promptOf,
} from "./apprentice-replay.mjs";
import { missingImports, synthesizeStub, importAnchor, callArityOf } from "../native/adapters/code/mechanical.js";
import { readEdges, keywordsFor } from "../native/adapters/code/edges.js";
import { parseDeclarations } from "../native/adapters/text/code-structure.js";
import { mulberry32 } from "../native/adapters/code/lex.js";

export const MOVER_VERSION = "apprentice-mover-1";
const bump = (m, k, n = 1) => { m[k] = (m[k] ?? 0) + n; return m; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// ═════════════════════════════ 0. reading helpers ═════════════════════════════
const kwOf = (language) => keywordsFor(language)?.keywords ?? null;
const readOf = (text, language, file) => readEdges({ text, language, fileName: file, keywords: kwOf(language) });
const lineStart = (t, i) => t.lastIndexOf("\n", i - 1) + 1;
const lineEndAfter = (t, i) => { const k = t.indexOf("\n", i); return k === -1 ? t.length : k + 1; };
const inRegions = (at, regions) => regions.some(([a, b]) => at >= a && at < b);
const countBy = (list, keyOf) => { const m = new Map(); for (const e of list) { const k = keyOf(e); m.set(k, (m.get(k) ?? 0) + 1); } return m; };

/** the occurrences of A in surplus over B's counts, changed-region occurrences first, then file order */
function pickSurplus(listA, countB, keyOf, regions) {
  const groups = new Map();
  for (const e of listA) { const k = keyOf(e); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
  const out = [];
  for (const [k, list] of groups) {
    const n = list.length - (countB.get(k) ?? 0);
    if (n <= 0) continue;
    const ordered = [...list.filter((e) => inRegions(e.at, regions)), ...list.filter((e) => !inRegions(e.at, regions))];
    for (const e of ordered.slice(0, n)) out.push({ ...e, key: k });
  }
  return out.sort((a, b) => a.at - b.at);
}

const OPENER = /^\s*(import|export|from|const|let|var|require)\b/;
/** an import statement's extent: from the line its opening keyword sits on to the end of the line its specifier ends on */
export function stmtRange(text, at, end) {
  let ls = lineStart(text, at);
  for (let i = 0; i < 40 && !OPENER.test(text.slice(ls, lineEndAfter(text, ls))); i++) {
    if (ls === 0) { ls = lineStart(text, at); break; }
    ls = lineStart(text, ls - 1);
  }
  if (!OPENER.test(text.slice(ls, lineEndAfter(text, ls)))) ls = lineStart(text, at);
  return [ls, lineEndAfter(text, Math.max(end - 1, at))];
}

function mergeRanges(ranges) {
  const s = ranges.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const r of s) { const last = out.at(-1); if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else out.push([...r]); }
  return out;
}
const cutRanges = (t, ranges) => { let o = "", i = 0; for (const [a, b] of ranges) { o += t.slice(i, a); i = b; } return o + t.slice(i); };
/** an offset in the uncut text → its offset in the cut text (a position inside a cut lands at the cut) */
const mapThrough = (p, ranges) => { let s = 0; for (const [a, b] of ranges) { if (b <= p) s += b - a; else if (a < p) s += p - a; } return p - s; };

// ═════════════════════════════ 1. the split: seed and rest ═════════════════════════════
/**
 * splitSeed({ before, after, file, regions, created, tsAsJs }) →
 *   { language, seeded, base, insertAt, seedBlock, seedCallees:[...], seedKeys:[...], restKeys:[...], unseparable:[...], restBound:[...], seededImports:[...] }
 * `restBound` is every name the cut-out statements and declarations bind: what the master supplied for the seed.
 *   or { gap }
 * `regions` are the edit's changed char ranges (reconstruct's), used to prefer the changed occurrence of a repeated edge.
 */
export function splitSeed({ before, after, file, regions = { before: [], after: [] }, created = before === "", tsAsJs = false }) {
  const lang = languageFor(file, { tsAsJs });
  if (!lang) return { gap: "no-reader" };
  const language = lang.language;
  const rB = readOf(before, language, file), rA = readOf(after, language, file);
  if (rB.disclosure?.error || rA.disclosure?.error) return { gap: "reader-error" };
  const ranges = [], unseparable = [], restBound = new Set();
  for (const e of pickSurplus(rA.imports, countBy(rB.imports, (x) => x.module), (x) => x.module, regions.after)) {
    const r = stmtRange(after, e.at, e.end ?? e.at + 1);
    ranges.push(r);
    for (const n of bindingsOf(after.slice(r[0], r[1]), language)) restBound.add(n);
  }
  const decls = parseDeclarations(after, file);
  const addedDecl = pickSurplus(rA.declared, countBy(rB.declared, (x) => x.name), (x) => x.name, regions.after);
  const addedNames = new Set(addedDecl.map((e) => e.name));
  const taken = new Set();
  // the bytes the edit itself wrote, widened to whole lines: a declaration cut out must lie inside them (an Edit),
  // or the file is new (nothing pre-existed); an overwrite has no regions, so there only a partial overrun refuses
  const wrote = regions.after.map(([a, b]) => [lineStart(after, a), lineEndAfter(after, Math.max(a, b - 1))]);
  for (const e of addedDecl) {
    const own = decls.filter((d) => d.name === e.name && d.start <= e.at && e.at < d.end).sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];
    if (!own) { unseparable.push(`declare:${e.name}`); continue; }
    if (taken.has(own)) continue;
    let b = own.end;
    if (after[b] === "\n") b++;
    const a = lineStart(after, own.start);
    const insideWrite = wrote.some(([x, y]) => a >= x && b <= y);
    const overrun = decls.some((d) => d !== own && d.start > own.start && d.start < own.end && d.end > own.end);
    if (created ? overrun : wrote.length ? !insideWrite : overrun || decls.some((d) => d !== own && d.start > own.start && d.start < own.end && !addedNames.has(d.name))) { unseparable.push(`declare:${e.name}`); continue; }
    taken.add(own);
    restBound.add(String(own.name));
    ranges.push([a, b]);
  }
  const cut = mergeRanges(ranges);
  const seeded = cutRanges(after, cut);
  const seededRegions = regions.after.map(([a, b]) => [mapThrough(a, cut), mapThrough(b, cut)]);
  const rS = readOf(seeded, language, file);
  if (rS.disclosure?.error) return { gap: "reader-error" };
  const seedCalls = pickSurplus(rS.calls, countBy(rB.calls, (c) => c.callee), (c) => c.callee, seededRegions);
  const rest = deltaOf({ before: seeded, after, file, tsAsJs });
  if (rest.gap) return { gap: rest.gap };
  const restKeys = [...new Set(rest.added.filter((e) => e.kind !== "call").map((e) => `+${e.key}`))].sort();
  // the seed's own lines: removed for the swapped-seed null, whose donor lines go where the first one was
  const lines = [...new Set(seedCalls.map((c) => lineStart(seeded, c.at)))].sort((a, b) => a - b);
  const lineRanges = mergeRanges(lines.map((s) => [s, lineEndAfter(seeded, s)]));
  const base = cutRanges(seeded, lineRanges);
  const insertAt = lineRanges.length ? mapThrough(lineRanges[0][0], lineRanges) : base.length;
  let seedBlock = lineRanges.map(([a, b]) => seeded.slice(a, b)).join("");
  if (seedBlock && !seedBlock.endsWith("\n")) seedBlock += "\n";
  return {
    language, seeded, base, insertAt, seedBlock,
    seedCallees: [...new Set(seedCalls.map((c) => String(c.callee)))].sort(),
    seedKeys: [...new Set(seedCalls.map((c) => `+call:${c.callee}`))].sort(),
    restKeys, unseparable: [...new Set(unseparable)].sort(), restBound: [...restBound].sort(),
    restRemoved: rest.removed.length, seededImports: [...new Set(rS.imports.map((e) => String(e.module)))],
  };
}

/** the names missingImports flags in `text`, as a Set */
export const missingSet = (text, file, language) => new Set(missingImports(text, file, { keywords: kwOf(language) }).map((m) => m.name));

// ═════════════════════════════ 2. where a name comes from: roots, specifiers, bindings ═════════════════════════════
/** a path's in-scope root: the last segment an `in` pattern matches (plus a .claude/worktrees/<name> below it) */
export function rootOf(p, scope) {
  const segs = String(p ?? "").split("/");
  let i = -1, fam = -1;
  for (let k = 0; k < segs.length - 1; k++) { const f = scope.in.findIndex((r) => r.test(segs[k])); if (f !== -1) { i = k; fam = f; } }
  if (i === -1) return null;
  let j = i;
  if (segs[i + 1] === ".claude" && segs[i + 2] === "worktrees" && segs.length > i + 4) j = i + 3;
  return { root: segs.slice(0, j + 1).join("/"), family: fam, tail: segs.slice(j + 1).join("/") };
}

/** a target as a string: "bare:<spec>" or "tail:<family>:<path below the root>" (never emitted) */
export function targetOf(spec, fromFile, scope) {
  const s = String(spec ?? "");
  if (!s) return null;
  if (!s.startsWith(".") && !s.startsWith("/")) return `bare:${s}`;
  const abs = s.startsWith("/") ? s : path.posix.resolve(path.posix.dirname(fromFile), s);
  const r = rootOf(abs, scope);
  return r ? `tail:${r.family}:${r.tail}` : null;
}

/** the specifier `file` would write for `target` (null: unresolvable, e.g. a Python file path) */
export function specFor(file, target, scope, language) {
  if (!target) return null;
  if (target.startsWith("bare:")) return target.slice(5);
  if (language === "python") return null;
  const [, fam, ...rest] = target.split(":");
  const r = rootOf(file, scope);
  if (!r || String(r.family) !== fam) return null;
  const abs = `${r.root}/${rest.join(":")}`;
  let rel = path.posix.relative(path.posix.dirname(file), abs);
  if (!rel.startsWith("../")) rel = `./${rel}`;
  return rel;
}

const JS_IDENT = "[A-Za-z_$][\\w$]*";
/** the local names one import statement binds (disclosed regexes over the statement text) */
export function bindingsOf(stmt, language) {
  const s = String(stmt ?? "");
  const out = [];
  const add = (n) => { const t = n.trim(); if (new RegExp(`^${JS_IDENT}$`).test(t)) out.push(t); };
  if (language === "python") {
    const from = /^\s*from\s+[\w.]+\s+import\s+\(?([^)#\n]*)/m.exec(s);
    if (from) { for (const part of from[1].split(",")) { if (part.trim() === "*") continue; const b = part.trim().split(/\s+as\s+/); add(b.at(-1)); } return out; }
    const imp = /^\s*import\s+(.+)$/m.exec(s);
    if (imp) for (const part of imp[1].split(",")) { const b = part.trim().split(/\s+as\s+/); add(b.length > 1 ? b[1] : b[0].split(".")[0]); }
    return out;
  }
  if (/^\s*export\b/.test(s) && !/^\s*export\s+(default\s+)?(const|let|var|function|class)/.test(s)) return out; // a re-export binds nothing here
  const named = /\{([^}]*)\}/.exec(s);
  if (named && /\bimport\b|\brequire\s*\(/.test(s)) for (const part of named[1].split(",")) { const b = part.trim().split(/\s+as\s+|\s*:\s*/); add(b.at(-1)); }
  const def = new RegExp(`\\bimport\\s+(${JS_IDENT})\\s*(?:,|\\s+from\\b)`).exec(s);
  if (def) add(def[1]);
  const star = new RegExp(`\\*\\s+as\\s+(${JS_IDENT})`).exec(s);
  if (star) add(star[1]);
  const req = new RegExp(`\\b(?:const|let|var)\\s+(${JS_IDENT})\\s*=\\s*(?:await\\s+)?(?:require|import)\\s*\\(`).exec(s);
  if (req) add(req[1]);
  return [...new Set(out)];
}

/** what a file offers other files: exported declarations and its import bindings → [{ name, target, kind }] */
export function offersOf(text, file, scope, { tsAsJs = false } = {}) {
  const lang = languageFor(file, { tsAsJs });
  if (!lang) return [];
  const language = lang.language;
  const r = readOf(text, language, file);
  if (r.disclosure?.error) return [];
  const out = [];
  const self = targetOf(file, file, scope);
  for (const d of r.declared) {
    if (d.kind === "method") continue;
    const pre = text.slice(lineStart(text, d.at), d.at);
    if (language === "python" ? pre === "" || /^(def|class|async def)\s*$/.test(pre) : /\bexport\b/.test(pre)) if (self) out.push({ name: String(d.name), target: self, kind: "decl" });
  }
  if (language === "javascript" && self) for (const m of text.matchAll(new RegExp(`^\\s*export\\s+(?:const|let|var)\\s+(${JS_IDENT})`, "gm"))) out.push({ name: m[1], target: self, kind: "decl" });
  for (const e of r.imports) {
    const [a, b] = stmtRange(text, e.at, e.end ?? e.at + 1);
    const t = targetOf(String(e.module), file, scope);
    if (!t) continue;
    for (const n of bindingsOf(text.slice(a, b), language)) out.push({ name: n, target: t, kind: "bind" });
  }
  const seen = new Set();
  return out.filter((o) => { const k = `${o.name}\u0000${o.target}\u0000${o.kind}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** the files one session holds entire (in scope only), indexed lazily for resolution */
export class World {
  constructor(scope, { tsAsJs = false } = {}) { this.scope = scope; this.tsAsJs = tsAsJs; this.texts = new Map(); this.cache = new Map(); }
  set(p, text, ts) { if (editScope(p, this.scope).verdict === "in" && languageFor(p, { tsAsJs: this.tsAsJs })) this.texts.set(p, { text, ts }); else this.texts.delete(p); }
  delete(p) { this.texts.delete(p); }
  /** re-index changed files; each new offer is handed to `observe(offer, ts)` (the lessons' raw material) */
  refresh(observe = null) {
    for (const [p, { text, ts }] of this.texts) {
      const c = this.cache.get(p);
      if (c && c.text === text) continue;
      const offers = offersOf(text, p, this.scope, { tsAsJs: this.tsAsJs });
      this.cache.set(p, { text, ts, offers });
      if (observe) for (const o of offers) observe(o, ts);
    }
    for (const p of this.cache.keys()) if (!this.texts.has(p)) this.cache.delete(p);
  }
  /** a name → a target: an exported declaration in another held file (most recent), else the most common binding */
  resolve(name, fromFile) {
    let decl = null, binds = new Map();
    for (const [p, c] of this.cache) {
      if (p === fromFile) continue;
      for (const o of c.offers) {
        if (o.name !== name) continue;
        if (o.kind === "decl") { if (!decl || c.ts > decl.ts) decl = { target: o.target, ts: c.ts }; }
        else binds.set(o.target, (binds.get(o.target) ?? 0) + 1);
      }
    }
    if (decl) return decl.target;
    let best = null, bn = 0;
    for (const [t, n] of binds) if (n > bn || (n === bn && t < best)) { best = t; bn = n; }
    return best;
  }
}

// ═════════════════════════════ 3. transcripts → turns, with the bytes each edit needs ═════════════════════════════
/**
 * Stream one transcript (the replay's turn semantics: a human/sdk prompt opens a turn, each Edit/Write is graded at
 * its result while the file's replayed state is what it was then). `onEdit({ turn, edit, row, rec, world, ts })` is
 * called for every graded edit BEFORE the state moves on, with `rec` the verified file-grade reconstruction when the
 * row is a file-grade structural delta. Texts live in memory only.
 */
export async function readTranscript(file, { root, seen = new Set(), stats = {}, tsAsJs = false, scope, onEdit = null, onTurnClose = null } = {}) {
  const session = path.basename(file, ".jsonl");
  const project = path.relative(root ?? path.dirname(path.dirname(file)), path.dirname(file)).split(path.sep)[0] || path.basename(path.dirname(file));
  const turns = [];
  let cur = null;
  const byId = new Map();
  const state = new Map();
  const world = new World(scope, { tsAsJs });
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  const open = (d) => {
    if (cur && onTurnClose) onTurnClose(cur);
    // `prompt` is the ask's own words, held in memory for instruments that read them (apprentice-assembled.mjs); it is
    // never emitted, and the turn object is not part of any report.
    cur = { session, project, ts: d?.timestamp ?? null, prompted: !!d, prompt: d ? promptOf(d) : null, edits: [] };
    turns.push(cur);
  };
  for await (const line of rl) {
    stats.records = (stats.records ?? 0) + 1;
    if (!line.includes('"user"') && !line.includes('"tool_use"')) continue;
    let d;
    try { d = JSON.parse(line); } catch { stats.badLines = (stats.badLines ?? 0) + 1; continue; }
    if (d.type === "user") {
      if (promptOf(d)) { open(d); continue; }
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
          if (f && typeof f.content === "string" && f.startLine === 1 && f.numLines === f.totalLines) { state.set(u.file, f.content); world.set(u.file, f.content, d.timestamp ?? null); }
          continue;
        }
        const e = { id: b.tool_use_id, tool: u.tool, file: u.file, input: u.input, result: r };
        const prior = state.get(u.file);
        const g = gradeEditFull(e, { state: prior, tsAsJs });
        u.edit.row = g.row;
        u.edit.ts = d.timestamp ?? null;
        u.edit.applied = g.applied;
        if (onEdit) {
          let rec = null;
          if (g.row.frame === "file" && g.row.category === "structural") { try { rec = reconstruct(e, { state: prior }); } catch { rec = null; } }
          onEdit({ turn: u.turn, edit: u.edit, row: g.row, rec: rec && rec.grade === "file" ? rec : null, world, ts: d.timestamp ?? null });
        }
        if (g.after !== null) { state.set(u.file, g.after); world.set(u.file, g.after, d.timestamp ?? null); }
        else if (g.applied) { state.delete(u.file); world.delete(u.file); }
      }
    } else if (d.type === "assistant" && !d.isSidechain && Array.isArray(d.message?.content)) {
      for (const b of d.message.content) {
        if (b?.type !== "tool_use" || !["Edit", "Write", "Read"].includes(b.name)) continue;
        const fp = b.input?.file_path ?? "";
        if (b.name === "Read") { byId.set(b.id, { tool: "Read", file: fp }); continue; }
        if (seen.has(b.id)) { stats.duplicateEdits = (stats.duplicateEdits ?? 0) + 1; continue; }
        seen.add(b.id);
        if (!cur) open(null);
        const edit = { id: b.id, tool: b.name, file: fp, fileId: opaque(fp), row: { id: b.id, tool: b.name, fileId: opaque(fp), gap: "no-result" }, ts: d.timestamp ?? null, applied: false };
        if (!cur.ts) cur.ts = d.timestamp ?? null;
        byId.set(b.id, { tool: b.name, file: fp, input: b.input ?? {}, edit, turn: cur });
        cur.edits.push(edit);
      }
    }
  }
  if (cur && onTurnClose) onTurnClose(cur);
  return turns.filter((t) => t.edits.length);
}

// ═════════════════════════════ 4. follow-through: one unit, its arms, its proposals ═════════════════════════════
const arityOf = (text, file, name) => { const a = callArityOf(text, file, name).arities; return a.length ? Math.max(...a) : 0; };

/** what the unconscious can know about one seeded text: the names it left unbound, their arity, the world's answers */
export function armOf({ text, file, language, beforeMissing, callees, world }) {
  const missing = [...missingSet(text, file, language)].filter((n) => !beforeMissing.has(n)).sort();
  const arity = {}, resolved = {};
  for (const n of missing) { arity[n] = arityOf(text, file, n); resolved[n] = world ? world.resolve(n, file) : null; }
  const r = readOf(text, language, file);
  return { missing, callees: [...callees], arity, world: resolved, imports: r.disclosure?.error ? [] : [...new Set(r.imports.map((e) => String(e.module)))] };
}

/**
 * prepareUnit({ before, after, file, regions, world, tsAsJs, scope }) → the follow-through unit for one edit, or { gap }.
 * Texts are used here and dropped; the unit keeps only names, keys and the null's base/seed lines (in memory).
 */
export function prepareUnit({ before, after, file, regions, created = before === "", world = null, tsAsJs = false }) {
  const s = splitSeed({ before, after, file, regions, created, tsAsJs });
  if (s.gap) return { gap: s.gap };
  const beforeMissing = missingSet(before, file, s.language);
  const real = armOf({ text: s.seeded, file, language: s.language, beforeMissing, callees: s.seedCallees, world });
  // what the master did about each name the seed left unbound: bound it (a statement or declaration it cut out binds
  // the name) or left it. Read from the split itself: missingImports(after) cannot see every import binding.
  const bound = new Set(s.restBound);
  const masterBound = Object.fromEntries(real.missing.map((n) => [n, bound.has(n)]));
  return {
    language: s.language, seedKeys: s.seedKeys, seedCallees: s.seedCallees, restKeys: s.restKeys, unseparable: s.unseparable,
    restRemoved: s.restRemoved, real, masterBound, beforeMissing, base: s.base, insertAt: s.insertAt, seedBlock: s.seedBlock, seeded: s.seeded,
  };
}

/** the swapped-seed arm: the unit's own seed lines out, a donor's in, the same unconscious */
export function donorArm(unit, donor, file, world) {
  const text = unit.base.slice(0, unit.insertAt) + donor.seedBlock + unit.base.slice(unit.insertAt);
  return armOf({ text, file, language: unit.language, beforeMissing: unit.beforeMissing, callees: donor.seedCallees, world });
}

export const FULL = Object.freeze({ callee: true, ambient: true, world: true, lesson: true, stub: true });
export const CONFIGS = {
  full: FULL,
  "no-callee": { ...FULL, callee: false },
  "no-ambient": { ...FULL, ambient: false },
  "no-world": { ...FULL, world: false },
  "no-lesson": { ...FULL, lesson: false },
  "no-stub": { ...FULL, stub: false },
  mechanical: { callee: true, ambient: false, world: false, lesson: false, stub: true },
  none: null,
};

const snippetCache = new Map();
/** the keys the reader gives a proposal's own bytes (non-call edges, "+"-signed) */
function snippetKeys(snippet, file, language) {
  const k = `${language}\u0000${path.extname(file)}\u0000${snippet}`;
  if (snippetCache.has(k)) return snippetCache.get(k);
  const d = deltaOf({ before: "", after: snippet, file, tsAsJs: true });
  const keys = d.gap ? [] : [...new Set(d.added.filter((e) => e.kind !== "call").map((e) => `+${e.key}`))];
  if (snippetCache.size > 50000) snippetCache.clear();
  snippetCache.set(k, keys);
  return keys;
}
export const importSnippet = (name, spec, language) => (language === "python" ? `from ${spec} import ${name}\n` : `import { ${name} } from "${spec}";\n`);

/**
 * propose(arm, { file, language, scope }, cfg, lessons) → { keys:Set, proposals:[{kind,name,spec?,via}], counts }
 * lessons = { binding(name) → target|null, ambient(name) → bool }
 */
export function propose(arm, ctx, cfg, lessons = { binding: () => null, ambient: () => false }) {
  const keys = new Set(), proposals = [], counts = { names: arm.missing.length, kept: 0, imports: 0, extends: 0, stubs: 0, ambientDropped: 0, unresolvedPython: 0 };
  if (!cfg) return { keys, proposals, counts };
  let names = arm.missing;
  if (cfg.callee) names = names.filter((n) => arm.callees.includes(n));
  if (cfg.ambient) { const before = names.length; names = names.filter((n) => !lessons.ambient(n)); counts.ambientDropped = before - names.length; }
  counts.kept = names.length;
  for (const n of names) {
    let spec = null, via = null;
    if (cfg.world && arm.world[n]) { spec = specFor(ctx.file, arm.world[n], ctx.scope, ctx.language); via = "world"; if (!spec && ctx.language === "python") counts.unresolvedPython++; }
    if (!spec && cfg.lesson) { const t = lessons.binding(n); if (t) { spec = specFor(ctx.file, t, ctx.scope, ctx.language); via = "lesson"; } }
    if (spec) {
      if (arm.imports.includes(spec)) { counts.extends++; proposals.push({ kind: "extend", name: n, spec, via }); continue; }
      counts.imports++;
      proposals.push({ kind: "import", name: n, spec, via });
      for (const k of snippetKeys(importSnippet(n, spec, ctx.language), ctx.file, ctx.language)) keys.add(k);
      continue;
    }
    if (cfg.stub) {
      const st = synthesizeStub({ name: n, arity: arm.arity[n] ?? 0, language: ctx.language, keywords: kwOf(ctx.language) });
      if (!st.ok) continue;
      counts.stubs++;
      proposals.push({ kind: "stub", name: n, arity: arm.arity[n] ?? 0 });
      for (const k of snippetKeys(st.add, ctx.file, ctx.language)) keys.add(k);
    }
  }
  return { keys, proposals, counts };
}

/**
 * the FULL proposal assembled into the file: imports, then stubs, at importAnchor (snapped to a line start). Stubs go
 * at the anchor, not the end: a file whose lexing state the reader loses near its end would swallow an appended stub
 * (measured: 4 of 59 on a sample), and a function declaration hoists, so the place is free.
 */
export function assemble(seeded, proposals, language) {
  let a = importAnchor(seeded).index;
  if (a > 0 && seeded[a - 1] !== "\n") { const k = seeded.indexOf("\n", a); a = k === -1 ? seeded.length : k + 1; }
  const imports = proposals.filter((p) => p.kind === "import").map((p) => importSnippet(p.name, p.spec, language)).join("");
  const stubs = proposals.filter((p) => p.kind === "stub").map((p) => synthesizeStub({ name: p.name, arity: p.arity, language, keywords: kwOf(language) })).filter((s) => s.ok).map((s) => s.add).join("\n\n");
  return seeded.slice(0, a) + imports + (stubs ? `${stubs}\n\n` : "") + seeded.slice(a);
}

/** signed-edge set scores: Jaccard (both empty = 1), hits, predicted size, rest size */
export function scoreSets(pred, rest) {
  const P = pred instanceof Set ? pred : new Set(pred), R = rest instanceof Set ? rest : new Set(rest);
  let hit = 0;
  for (const k of P) if (R.has(k)) hit++;
  const u = P.size + R.size - hit;
  return { jac: u === 0 ? 1 : hit / u, hit, pred: P.size, rest: R.size, recall: R.size ? hit / R.size : null };
}

// ═════════════════════════════ 5. prequential lessons ═════════════════════════════
/** a name → target table from OTHER sessions' observations strictly earlier than the query (inserted in time order) */
export class BindingLesson {
  constructor() { this.t = new Map(); }
  add(name, target, session) {
    if (!this.t.has(name)) this.t.set(name, new Map());
    const m = this.t.get(name);
    if (!m.has(target)) m.set(target, new Set());
    m.get(target).add(session);
  }
  lookup(name, session) {
    const m = this.t.get(name);
    if (!m) return null;
    let best = null, bn = 0;
    for (const [t, ss] of m) { const n = ss.size - (ss.has(session) ? 1 : 0); if (n > bn || (n === bn && n > 0 && t < best)) { best = t; bn = n; } }
    return bn > 0 ? best : null;
  }
}

/** a name the master, in other earlier sessions, left unbound more often than it bound it: ambient */
export class AmbientLesson {
  constructor() { this.t = new Map(); }
  add(name, bound, session) {
    if (!this.t.has(name)) this.t.set(name, { b: new Map(), u: new Map() });
    const m = this.t.get(name)[bound ? "b" : "u"];
    m.set(session, (m.get(session) ?? 0) + 1);
  }
  ambient(name, session) {
    const e = this.t.get(name);
    if (!e) return false;
    const other = (m) => { let s = 0; for (const [k, v] of m) if (k !== session) s += v; return s; };
    return other(e.u) > other(e.b);
  }
}

// ═════════════════════════════ 6. paired permutation null ═════════════════════════════
/** paired sign-flip null at cluster level: two-sided on the mean difference, p at its draw floor 1/(draws+1) */
export function pairedNull(d, cluster, { draws = 1000, seed = 1 } = {}) {
  const n = d.length;
  if (!n) return { n: 0, note: "no pairs" };
  const obs = mean(d);
  const groups = new Map();
  d.forEach((x, i) => groups.set(cluster[i], (groups.get(cluster[i]) ?? 0) + x));
  const sums = [...groups.values()];
  const rnd = mulberry32(seed);
  let reached = 0;
  for (let b = 0; b < draws; b++) {
    let s = 0;
    for (const v of sums) s += rnd() < 0.5 ? -v : v;
    if (Math.abs(s / n) >= Math.abs(obs) - 1e-12) reached++;
  }
  return {
    n, clusters: groups.size, mean: obs, plus: d.filter((x) => x > 0).length, minus: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length,
    draws, reached, p: (1 + reached) / (draws + 1), floor: 1 / (draws + 1),
  };
}

/** the verdict the canon allows: learned only when ON beats OFF with p at its floor; else noticed, not learned */
export const verdictOf = (t) => (!t || !t.n ? "no units" : t.p <= t.floor + 1e-12 && t.mean > 0 ? "a difference that makes a difference" : t.p <= t.floor + 1e-12 && t.mean < 0 ? "makes a difference, the WRONG way (ON is worse)" : "noticed, not learned");

// ═════════════════════════════ 7. follow-through over a set of units, in time order ═════════════════════════════
const cmpTs = (a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0);

/**
 * scoreFollowThrough(units, observations, { scope, draws, seed }) — units: { session, ts, file, language, real,
 * nulls:[arm], masterBound, restKeys, ... }; observations: [{ name, target, session, ts }]. Lessons are inserted
 * strictly before each unit's timestamp, from other sessions only. Returns per-unit scores and the differences.
 */
export function scoreFollowThrough(units, observations, { scope, draws = 1000, seed = 1 } = {}) {
  const us = units.slice().sort(cmpTs);
  const obs = observations.slice().sort(cmpTs);
  const L = new BindingLesson(), G = new AmbientLesson();
  let oi = 0, gi = 0;
  const rows = [];
  for (const u of us) {
    while (oi < obs.length && obs[oi].ts !== null && obs[oi].ts < u.ts) { L.add(obs[oi].name, obs[oi].target, obs[oi].session); oi++; }
    while (gi < us.length && us[gi].ts < u.ts) { const g = us[gi]; for (const [n, b] of Object.entries(g.masterBound)) G.add(n, b, g.session); gi++; }
    const lessons = { binding: (n) => L.lookup(n, u.session), ambient: (n) => G.ambient(n, u.session) };
    const ctx = { file: u.file, language: u.language, scope };
    const scores = {}, counts = {};
    let fullProp = null;
    for (const [name, cfg] of Object.entries(CONFIGS)) {
      const p = propose(u.real, ctx, cfg, lessons);
      scores[name] = scoreSets(p.keys, u.restKeys);
      counts[name] = p.counts;
      if (name === "full") fullProp = p;
    }
    const nullScores = u.nulls.map((arm) => scoreSets(propose(arm, ctx, FULL, lessons).keys, u.restKeys));
    let assembledAgrees = null;
    if (u.seeded !== undefined && fullProp.proposals.some((p) => p.kind !== "extend")) {
      const cand = assemble(u.seeded, fullProp.proposals, u.language);
      const d = deltaOf({ before: u.seeded, after: cand, file: u.file, tsAsJs: true });
      const whole = d.gap ? null : new Set(d.added.filter((e) => e.kind !== "call").map((e) => `+${e.key}`));
      assembledAgrees = whole !== null && whole.size === fullProp.keys.size && [...fullProp.keys].every((k) => whole.has(k));
    }
    rows.push({
      u, scores, counts, predicted: [...fullProp.keys].sort(), proposals: fullProp.proposals,
      nullJac: nullScores.length ? mean(nullScores.map((s) => s.jac)) : null, nullN: nullScores.length, assembledAgrees,
    });
  }
  return { rows, differences: differencesOf(rows, { draws, seed }) };
}

function differencesOf(rows, { draws, seed }) {
  const strata = {
    all: rows,
    "rest nonempty": rows.filter((r) => r.u.restKeys.length),
    "rest empty": rows.filter((r) => !r.u.restKeys.length),
    "edits (not created files)": rows.filter((r) => r.u.mode !== "write-create"),
    "created files": rows.filter((r) => r.u.mode === "write-create"),
  };
  const out = {};
  let k = 0;
  for (const [sname, rs] of Object.entries(strata)) {
    const cl = rs.map((r) => r.u.session);
    const diff = (a, b) => pairedNull(rs.map((r) => r.scores[a].jac - (b === null ? 0 : r.scores[b].jac)), cl, { draws, seed: seed + 31 * ++k });
    const withNull = rs.filter((r) => r.nullJac !== null);
    const block = {
      n: rs.length,
      jac: Object.fromEntries(Object.keys(CONFIGS).map((c) => [c, mean(rs.map((r) => r.scores[c].jac))])),
      precision: Object.fromEntries(Object.keys(CONFIGS).map((c) => { const p = rs.reduce((s, r) => s + r.scores[c].pred, 0); return [c, p ? rs.reduce((s, r) => s + r.scores[c].hit, 0) / p : null]; })),
      recall: Object.fromEntries(Object.keys(CONFIGS).map((c) => { const t = rs.reduce((s, r) => s + r.scores[c].rest, 0); return [c, t ? rs.reduce((s, r) => s + r.scores[c].hit, 0) / t : null]; })),
      nullJac: mean(withNull.map((r) => r.nullJac)),
      seedVsSwapped: pairedNull(withNull.map((r) => r.scores.full.jac - r.nullJac), withNull.map((r) => r.u.session), { draws, seed: seed + 31 * ++k }),
      fullVsNone: diff("full", "none"),
      mechanicalVsNone: diff("mechanical", "none"),
      components: Object.fromEntries(["callee", "ambient", "world", "lesson", "stub"].map((c) => [c, diff("full", `no-${c}`)])),
    };
    block.verdicts = {
      seedVsSwapped: verdictOf(block.seedVsSwapped), fullVsNone: verdictOf(block.fullVsNone), mechanicalVsNone: verdictOf(block.mechanicalVsNone),
      ...Object.fromEntries(Object.entries(block.components).map(([c, t]) => [c, verdictOf(t)])),
    };
    out[sname] = block;
  }
  return out;
}

// ═════════════════════════════ 8. ripple ═════════════════════════════
const KINDS = ["+call", "-call", "+import", "-import", "+declare", "-declare", "+extends", "-extends"];

/** an IN turn → its ripple record: code files in order of first edit, each with its signed move kinds (null = ungraded) */
export function rippleTurnOf(turn, scope) {
  const files = new Map();
  for (const e of turn.edits) {
    if (!scope.codeExt.has(path.extname(e.file ?? "").toLowerCase())) continue;
    const r = e.row;
    if (!e.applied && (r.gap === "edit-failed" || r.gap === "no-result" || r.gap === "no-edit-strings")) continue;
    if (!files.has(e.file)) {
      const ro = rootOf(e.file, scope);
      files.set(e.file, { id: opaque(e.file), nid: ro ? opaque(`${ro.family}:${ro.tail}`) : opaque(e.file), kinds: null });
    }
    const f = files.get(e.file);
    if (!r.gap) {
      f.kinds ??= new Set();
      if (r.category === "structural") { for (const x of r.added ?? []) f.kinds.add(`+${x.kind}`); for (const x of r.removed ?? []) f.kinds.add(`-${x.kind}`); }
    }
  }
  return { session: turn.session, ts: turn.ts, files: [...files.values()] };
}

const sigOf = (kinds) => (kinds ? KINDS.filter((k) => kinds.has(k)).join(",") || "∅" : null);

/** the co-change lessons for ripple, with per-session contributions so a query can exclude its own session */
class CoChange {
  constructor() { this.count = new Map(); this.cooc = new Map(); this.sCount = new Map(); this.sCooc = new Map(); this.sig = new Map(); this.sSig = new Map(); this.glob = { n: 0, k: {} }; this.sGlob = new Map(); }
  static inc2(m, a, b, n = 1) { if (!m.has(a)) m.set(a, new Map()); const x = m.get(a); x.set(b, (x.get(b) ?? 0) + n); }
  add(session, ids, first, partners) {
    if (!this.sCount.has(session)) { this.sCount.set(session, new Map()); this.sCooc.set(session, new Map()); this.sSig.set(session, new Map()); this.sGlob.set(session, { n: 0, k: {} }); }
    const uniq = [...new Set(ids)];
    for (const a of uniq) {
      this.count.set(a, (this.count.get(a) ?? 0) + 1);
      const sc = this.sCount.get(session); sc.set(a, (sc.get(a) ?? 0) + 1);
      for (const b of uniq) if (a !== b) { CoChange.inc2(this.cooc, a, b); CoChange.inc2(this.sCooc.get(session), a, b); }
    }
    // move kinds: the first file's signature → each partner's kinds (only graded partners)
    if (first === null) return;
    for (const pk of partners) {
      if (!pk) continue;
      for (const [table, glob] of [[this.sig, this.glob], [this.sSig.get(session), this.sGlob.get(session)]]) {
        if (!table.has(first)) table.set(first, { n: 0, k: {} });
        const e = table.get(first); e.n++; glob.n++;
        for (const k of pk) { bump(e.k, k); bump(glob.k, k); }
      }
    }
  }
  /** other sessions' co-occurrence of each g with a, and a's own count */
  partnersOf(a, session) {
    const all = this.cooc.get(a) ?? new Map(), own = this.sCooc.get(session)?.get(a) ?? new Map();
    const out = [];
    for (const [g, n] of all) { const m = n - (own.get(g) ?? 0); if (m > 0) out.push({ g, n: m }); }
    const ca = (this.count.get(a) ?? 0) - (this.sCount.get(session)?.get(a) ?? 0);
    const cg = (g) => (this.count.get(g) ?? 0) - (this.sCount.get(session)?.get(g) ?? 0);
    out.sort((x, y) => y.n - x.n || cg(y.g) - cg(x.g) || (x.g < y.g ? -1 : 1));
    return { list: out, count: ca };
  }
  /** majority-rule kinds for a partner of a first file with signature `sig` (else the global partner distribution) */
  kindsFor(sig, session) {
    const sub = (e, o) => { const n = (e?.n ?? 0) - (o?.n ?? 0); const k = {}; for (const x of KINDS) k[x] = (e?.k[x] ?? 0) - (o?.k[x] ?? 0); return { n, k }; };
    let d = sig !== null ? sub(this.sig.get(sig), this.sSig.get(session)?.get(sig)) : { n: 0 };
    let via = "signature";
    if (!(d.n > 0)) { d = sub(this.glob, this.sGlob.get(session)); via = "global"; }
    if (!(d.n > 0)) return { kinds: new Set(), via: "none" };
    return { kinds: new Set(KINDS.filter((k) => d.k[k] / d.n > 0.5)), via };
  }
}

/**
 * rippleScores(turns, { idKey, perm }) → per-turn scores under the lessons learned from `history` (the same turns,
 * optionally with file labels / partner kinds permuted for the null). Truth always comes from the real turns.
 */
function rippleRun(real, history, idKey) {
  const order = real.map((_, i) => i).sort((a, b) => cmpTs(real[a], real[b]) || a - b);
  const cc = new CoChange();
  const out = new Array(real.length);
  let hi = 0;
  for (const i of order) {
    const t = real[i];
    while (hi < order.length && real[order[hi]].ts < t.ts) {
      const h = history[order[hi]];
      const ids = h.files.map((f) => f[idKey]);
      cc.add(h.session, ids, h.files.length ? sigOf(h.files[0].kinds) : null, h.files.slice(1).map((f) => f.kinds));
      hi++;
    }
    if (!t.files.length) { out[i] = null; continue; }
    const first = t.files[0][idKey];
    const truth = [...new Set(t.files.slice(1).map((f) => f[idKey]).filter((g) => g !== first))];
    const { list, count } = cc.partnersOf(first, t.session);
    const k = truth.length;
    const topk = list.slice(0, k).map((x) => x.g);
    const rprec = k ? topk.filter((g) => truth.includes(g)).length / k : null;
    const maj = count > 0 ? list.filter((x) => x.n / count > 0.5).map((x) => x.g) : [];
    const ms = scoreSets(new Set(maj), new Set(truth));
    const graded = t.files.slice(1).filter((f) => f.kinds !== null && f[idKey] !== first);
    const sig = sigOf(t.files[0].kinds);
    const pk = cc.kindsFor(sig, t.session);
    const moves = graded.length ? mean(graded.map((f) => scoreSets(pk.kinds, f.kinds).jac)) : null;
    const movesOff = graded.length ? mean(graded.map((f) => scoreSets(new Set(), f.kinds).jac)) : null;
    out[i] = { truthN: k, rprec, majJac: ms.jac, majHit: ms.hit, majPred: ms.pred, moves, movesOff, movesVia: pk.via, firstSeen: count > 0 };
  }
  return out;
}

function shuffleInPlace(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** the shuffled history: file labels permuted across every slot (turn sizes and file frequencies kept); partner kind sets permuted across partner slots */
export function shuffledHistory(turns, rnd) {
  const slots = [], kslots = [];
  turns.forEach((t, i) => t.files.forEach((f, j) => { slots.push([i, j]); if (j > 0) kslots.push([i, j]); }));
  const labels = shuffleInPlace(slots.map(([i, j]) => ({ id: turns[i].files[j].id, nid: turns[i].files[j].nid })), rnd);
  const kinds = shuffleInPlace(kslots.map(([i, j]) => turns[i].files[j].kinds), rnd);
  const out = turns.map((t) => ({ session: t.session, ts: t.ts, files: t.files.map((f) => ({ ...f })) }));
  slots.forEach(([i, j], x) => { out[i].files[j].id = labels[x].id; out[i].files[j].nid = labels[x].nid; });
  kslots.forEach(([i, j], x) => { out[i].files[j].kinds = kinds[x]; });
  return out;
}

export function scoreRipple(turns, { draws = 1000, seed = 1, nulls = 20 } = {}) {
  const real = { id: rippleRun(turns, turns, "id"), nid: rippleRun(turns, turns, "nid") };
  const rnd = mulberry32(seed + 7);
  const nullRuns = [];
  for (let b = 0; b < nulls; b++) nullRuns.push(rippleRun(turns, shuffledHistory(turns, rnd), "nid"));
  const idx = turns.map((_, i) => i).filter((i) => real.nid[i] !== null);
  const multi = idx.filter((i) => real.nid[i].truthN > 0);
  const single = idx.filter((i) => real.nid[i].truthN === 0);
  const nullMean = (i, f) => { const v = nullRuns.map((r) => r[i]?.[f]).filter((x) => x !== null && x !== undefined); return v.length ? mean(v) : null; };
  const cl = (is) => is.map((i) => turns[i].session);
  let k = 100;
  const t = (is, f) => pairedNull(is.map(f), cl(is), { draws, seed: seed + ++k });
  const movesIdx = idx.filter((i) => real.nid[i].moves !== null);
  const files = {
    turns: multi.length,
    rprec: { on: mean(multi.map((i) => real.nid[i].rprec)), off: 0, null: mean(multi.map((i) => nullMean(i, "rprec"))) },
    majJac: { on: mean(multi.map((i) => real.nid[i].majJac)), off: 0, null: mean(multi.map((i) => nullMean(i, "majJac"))) },
    onVsOff: t(multi, (i) => real.nid[i].rprec),
    onVsShuffled: t(multi, (i) => real.nid[i].rprec - nullMean(i, "rprec")),
    majOnVsOff: t(multi, (i) => real.nid[i].majJac),
    majOnVsShuffled: t(multi, (i) => real.nid[i].majJac - nullMean(i, "majJac")),
    normOnVsRawId: t(multi, (i) => real.nid[i].rprec - real.id[i].rprec),
    rawId: { rprec: mean(multi.map((i) => real.id[i].rprec)) },
    firstFileSeenBefore: multi.filter((i) => real.nid[i].firstSeen).length,
    singleFileTurns: { n: single.length, falseAlarms: single.filter((i) => real.nid[i].majPred > 0).length, majJacOn: mean(single.map((i) => real.nid[i].majJac)) },
    allTurnsMajJac: { on: mean(idx.map((i) => real.nid[i].majJac)), off: mean(idx.map((i) => (real.nid[i].truthN ? 0 : 1))), onVsOff: t(idx, (i) => real.nid[i].majJac - (real.nid[i].truthN ? 0 : 1)) },
  };
  const moves = {
    turns: movesIdx.length,
    on: mean(movesIdx.map((i) => real.nid[i].moves)), off: mean(movesIdx.map((i) => real.nid[i].movesOff)), null: mean(movesIdx.map((i) => nullMean(i, "moves"))),
    onVsOff: t(movesIdx, (i) => real.nid[i].moves - real.nid[i].movesOff),
    onVsShuffled: t(movesIdx, (i) => real.nid[i].moves - nullMean(i, "moves")),
    via: movesIdx.reduce((m, i) => bump(m, real.nid[i].movesVia), {}),
  };
  files.verdicts = { onVsOff: verdictOf(files.onVsOff), onVsShuffled: verdictOf(files.onVsShuffled), majOnVsOff: verdictOf(files.majOnVsOff), majOnVsShuffled: verdictOf(files.majOnVsShuffled), norm: verdictOf(files.normOnVsRawId) };
  moves.verdicts = { onVsOff: verdictOf(moves.onVsOff), onVsShuffled: verdictOf(moves.onVsShuffled) };
  return { files, moves, nulls, perTurn: real.nid };
}

// ═════════════════════════════ 9. what may leave ═════════════════════════════
const HOME_SEGS = new Set(os.homedir().split(path.sep).filter(Boolean));
/** a key as it may be emitted: a specifier naming any home-directory segment is cut to its last segment */
export function safeKey(k) {
  const m = /^([+-]?import:)(.*)$/.exec(String(k));
  if (!m) return k;
  const segs = m[2].split(/[\\/]/).filter(Boolean);
  return segs.some((s) => HOME_SEGS.has(s)) ? `${m[1]}<rel>/${segs.at(-1) ?? ""}` : k;
}

/** the fail-closed gate on an emitted row: a Goffman finding withholds it (category counted) */
export function gateRow(row, pii) {
  const cats = piiCategoriesOf(row);
  if (!cats.length) return row;
  pii.rowsWithheld = (pii.rowsWithheld ?? 0) + 1;
  for (const c of cats) bump((pii.byCategory ??= {}), c);
  return null;
}

// ═════════════════════════════ 10. the whole run ═════════════════════════════
export async function runMover({
  root = path.join(os.homedir(), ".claude", "projects"), files = null, scopeFile = undefined, sample = null, seed = 1, draws = 1000,
  donors = 3, nulls = 20, tsAsJs = false, ledger = null,
} = {}) {
  if (ledger) assertUntrackedOutput(ledger);
  const scope = loadScope(scopeFile);
  let list = files ?? listTranscripts(root);
  if (sample) { const rnd = mulberry32(seed); list = shuffleInPlace(list.slice(), rnd); }
  const seen = new Set();
  const stats = { transcripts: 0 };
  const gaps = {};
  const units = [], observations = [], rippleTurns = [];
  const donorPool = new Map(); // language → [{ session, seedBlock, seedCallees }]
  const rnd = mulberry32(seed + 3);
  const acct = { inTurns: 0, outTurns: 0, mixedTurns: 0, structuralFileGradeEdits: 0, units: 0, unitsNoSeed: 0, byMode: {} };
  let inTurnsSampled = 0;
  for (const f of list) {
    stats.transcripts++;
    const pending = new Map(); // turn → [unit] (kept only if the turn is IN)
    const obsPending = new Map();
    // coverage is tallied per turn and lands only when the turn closes IN (a MIXED turn's in-scope edits are withheld whole)
    const tallies = new Map();
    const tally = (turn) => { if (!tallies.has(turn)) tallies.set(turn, { gaps: {}, structural: 0, noSeed: 0 }); return tallies.get(turn); };
    const close = (turn) => {
      const v = scopeOfTurn(turn, scope);
      const us = pending.get(turn) ?? [];
      const tl = tallies.get(turn);
      tallies.delete(turn);
      if (v !== "in") { pending.delete(turn); obsPending.delete(turn); return; }
      if (tl) { acct.structuralFileGradeEdits += tl.structural; acct.unitsNoSeed += tl.noSeed; for (const [k, n] of Object.entries(tl.gaps)) bump(gaps, k, n); }
      for (const u of us) { units.push(u); const pool = donorPool.get(u.language) ?? []; pool.push({ session: u.session, seedBlock: u.seedBlock, seedCallees: u.seedCallees }); donorPool.set(u.language, pool); }
      for (const o of obsPending.get(turn) ?? []) observations.push(o);
      pending.delete(turn); obsPending.delete(turn);
    };
    const turns = await readTranscript(f, {
      root, seen, stats, tsAsJs, scope, onTurnClose: close,
      onEdit: ({ turn, edit, row, rec, world, ts }) => {
        if (row.gap?.startsWith("withheld:pii")) { bump(tally(turn).gaps, row.gap); return; } // the replay's extraction gate, fail-closed
        if (row.gap || row.frame !== "file" || row.category !== "structural") return;
        if (editScope(edit.file, scope).verdict !== "in") return;
        const tl = tally(turn);
        if (!rec) { bump(tl.gaps, "no-file-bytes"); return; }
        tl.structural++;
        // the world as the session holds it now; its offers are the binding lesson's raw material (kept if the turn is IN)
        const ob = obsPending.get(turn) ?? [];
        world.refresh((o, ots) => ob.push({ name: o.name, target: o.target, session: turn.session, ts: ots ?? ts }));
        obsPending.set(turn, ob);
        let u;
        try { u = prepareUnit({ before: rec.before, after: rec.after, file: edit.file, regions: rec.regions ?? undefined, created: !!rec.created, world, tsAsJs }); }
        catch (err) { bump(tl.gaps, "prepare-error"); return; }
        if (u.gap) { bump(tl.gaps, `split:${u.gap}`); return; }
        if (!u.seedKeys.length) { tl.noSeed++; bump(tl.gaps, "no-seed"); return; }
        u.session = turn.session; u.ts = ts; u.file = edit.file; u.fileId = edit.fileId; u.id = edit.id; u.mode = row.mode;
        // the swapped-seed null: donors from OTHER sessions' IN edits already read, in the same language
        const pool = (donorPool.get(u.language) ?? []).filter((d) => d.session !== u.session && d.seedBlock);
        u.nulls = [];
        for (let k = 0; k < donors && pool.length; k++) u.nulls.push(donorArm(u, pool[Math.floor(rnd() * pool.length)], edit.file, world));
        delete u.base; // the base text is no longer needed once the nulls are built
        const p = pending.get(turn) ?? []; p.push(u); pending.set(turn, p);
      },
    });
    for (const t of turns) {
      const v = scopeOfTurn(t, scope);
      if (v === "in") { acct.inTurns++; rippleTurns.push(rippleTurnOf(t, scope)); inTurnsSampled++; }
      else if (v === "out") acct.outTurns++; else acct.mixedTurns++;
    }
    if (sample && inTurnsSampled >= sample) break;
  }
  for (const u of units) bump(acct.byMode, u.mode);
  acct.units = units.length;
  const ft = scoreFollowThrough(units, observations, { scope, draws, seed });
  const rp = scoreRipple(rippleTurns.filter((t) => t.ts), { draws, seed, nulls });
  const pii = { rowsWithheld: 0 };
  if (ledger) {
    const fd = fs.openSync(ledger, "w");
    for (const r of ft.rows) {
      const row = gateRow({
        test: "follow-through", session: r.u.session, id: r.u.id, fileId: r.u.fileId, language: r.u.language, mode: r.u.mode, ts: r.u.ts,
        seed: r.u.seedKeys.map(safeKey), rest: r.u.restKeys.map(safeKey), unseparable: r.u.unseparable.map(safeKey), predicted: r.predicted.map(safeKey),
        proposals: r.proposals.map((p) => ({ kind: p.kind, name: p.name, ...(p.spec ? { spec: safeKey(`import:${p.spec}`).slice(7) } : {}), ...(p.via ? { via: p.via } : {}) })),
        jac: Object.fromEntries(Object.entries(r.scores).map(([c, s]) => [c, s.jac])), nullJac: r.nullJac, assembledAgrees: r.assembledAgrees,
      }, pii);
      if (row) fs.writeSync(fd, JSON.stringify(row) + "\n");
    }
    rippleTurns.filter((t) => t.ts).forEach((t, i) => {
      const s = rp.perTurn[i];
      const row = gateRow({ test: "ripple", session: t.session, ts: t.ts, files: t.files.map((f) => ({ fileId: f.id, normId: f.nid, kinds: f.kinds ? [...f.kinds] : null })), score: s }, pii);
      if (row) fs.writeSync(fd, JSON.stringify(row) + "\n");
    });
    fs.closeSync(fd);
  }
  const ftRows = ft.rows;
  const report = {
    version: MOVER_VERSION, root: root.startsWith(os.homedir() + path.sep) ? `~${path.sep}${path.relative(os.homedir(), root)}` : "(custom root)",
    sample, seed, draws, donors, nulls, tsAsJs, stats, gaps, acct,
    followThrough: {
      differences: ft.differences,
      coverage: {
        units: ftRows.length, restNonempty: ftRows.filter((r) => r.u.restKeys.length).length,
        restKeys: ftRows.reduce((m, r) => { for (const k of r.u.restKeys) bump(m, k.split(":")[0]); return m; }, {}),
        unseparable: ftRows.reduce((m, r) => { for (const k of r.u.unseparable) bump(m, k.split(":")[0]); return m; }, {}),
        unitsWithUnseparable: ftRows.filter((r) => r.u.unseparable.length).length,
        restRemovedAnomalies: ftRows.filter((r) => r.u.restRemoved).length,
        withNull: ftRows.filter((r) => r.nullN).length,
        assembled: { checked: ftRows.filter((r) => r.assembledAgrees !== null).length, agree: ftRows.filter((r) => r.assembledAgrees === true).length },
        proposals: ftRows.reduce((m, r) => { for (const p of r.proposals) bump(m, `${p.kind}${p.via ? `:${p.via}` : ""}`); return m; }, {}),
        fullCounts: ftRows.reduce((m, r) => { for (const [k, v] of Object.entries(r.counts.full)) bump(m, k, v); return m; }, {}),
        byLanguage: ftRows.reduce((m, r) => bump(m, r.u.language), {}),
      },
    },
    ripple: { files: rp.files, moves: rp.moves, nulls: rp.nulls, coverage: { inTurns: rippleTurns.length, withTs: rippleTurns.filter((t) => t.ts).length, withCodeFile: rippleTurns.filter((t) => t.files.length).length, multiFile: rippleTurns.filter((t) => t.files.length > 1).length } },
    pii: { ledger: pii, basis: "rows hold opaque fileIds, identifiers, specifiers (absolute or home-naming ones cut to the last segment), kinds, counts and scores; Goffman fail-closed on every ledger row; scrubDeep on the report" },
  };
  const scrubbed = {};
  const clean = scrubDeep(report, scrubbed);
  clean.pii.reportScrubbed = scrubbed.strings ?? 0;
  return clean;
}

// ═════════════════════════════ 11. rendering ═════════════════════════════
const f3 = (x) => (x === null || x === undefined || Number.isNaN(x) ? "n/a" : x.toFixed(3));
const tline = (label, t, v) => (!t || !t.n ? `  ${label}: no units` : `  ${label}: Δ=${t.mean >= 0 ? "+" : ""}${f3(t.mean)} (n=${t.n}, ${t.clusters} sessions; +${t.plus}/−${t.minus}/=${t.zero}) p=${t.p.toFixed(4)} (floor ${t.floor.toFixed(4)}) → ${v}`);

export function renderMover(rep) {
  const L = [];
  const D = rep.followThrough.differences, all = D.all, ne = D["rest nonempty"];
  const R = rep.ripple;
  L.push(`apprentice-mover ${rep.version} — ${rep.sample ? `sample (${rep.sample} IN turns, seed ${rep.seed})` : "all transcripts"} · draws ${rep.draws} · donors ${rep.donors} · shuffled histories ${rep.nulls}`);
  L.push("");
  L.push("THE TWO DIFFERENCES (paired sign-flip, cluster = session, two-sided)");
  L.push(`FOLLOW-THROUGH, the seed's own content vs a swapped seed (FULL unconscious, signed-edge Jaccard vs the master's rest), all ${all.n} units:`);
  L.push(`  real ${f3(all.jac.full)} vs swapped ${f3(all.nullJac)}`);
  L.push(tline("seed vs swapped", all.seedVsSwapped, all.verdicts.seedVsSwapped));
  L.push(`  where the master's rest is nonempty (n=${ne.n}): real ${f3(ne.jac.full)} vs swapped ${f3(ne.nullJac)}; recall ${f3(ne.recall.full)}, precision ${f3(ne.precision.full)}`);
  L.push(tline("seed vs swapped, rest nonempty", ne.seedVsSwapped, ne.verdicts.seedVsSwapped));
  L.push(`RIPPLE, co-change lessons vs a shuffled history (R-precision of the other files, n=${R.files.turns} multi-file turns):`);
  L.push(`  ON ${f3(R.files.rprec.on)} · OFF ${f3(R.files.rprec.off)} · shuffled ${f3(R.files.rprec.null)}`);
  L.push(tline("ON vs shuffled", R.files.onVsShuffled, R.files.verdicts.onVsShuffled));
  L.push(tline("ON vs OFF", R.files.onVsOff, R.files.verdicts.onVsOff));
  L.push(`  majority rule (no oracle on how many): ON ${f3(R.files.majJac.on)} · shuffled ${f3(R.files.majJac.null)}`);
  L.push(tline("majority ON vs shuffled", R.files.majOnVsShuffled, R.files.verdicts.majOnVsShuffled));
  L.push(`  moves at the true partner files (n=${R.moves.turns} turns): ON ${f3(R.moves.on)} · OFF ${f3(R.moves.off)} · shuffled ${f3(R.moves.null)} · via ${JSON.stringify(R.moves.via)}`);
  L.push(tline("moves ON vs OFF", R.moves.onVsOff, R.moves.verdicts.onVsOff));
  L.push(tline("moves ON vs shuffled", R.moves.onVsShuffled, R.moves.verdicts.onVsShuffled));
  L.push("");
  L.push("FOLLOW-THROUGH, component by component (FULL vs FULL with one switched OFF)");
  for (const [sname, b] of Object.entries(D)) {
    L.push(`[${sname}] n=${b.n} · Jaccard ${Object.entries(b.jac).map(([c, v]) => `${c} ${f3(v)}`).join(" · ")}`);
    L.push(`   precision ${Object.entries(b.precision).filter(([c]) => c !== "none").map(([c, v]) => `${c} ${f3(v)}`).join(" · ")}`);
    L.push(tline("FULL vs nothing", b.fullVsNone, b.verdicts.fullVsNone));
    L.push(tline("mechanical.js alone vs nothing", b.mechanicalVsNone, b.verdicts.mechanicalVsNone));
    for (const [c, t] of Object.entries(b.components)) L.push(tline(`component ${c}`, t, b.verdicts[c]));
  }
  L.push(tline("ripple: path-below-root identity vs absolute path", R.files.normOnVsRawId, R.files.verdicts.norm));
  L.push(`  ripple single-file turns ${R.files.singleFileTurns.n}: majority-rule false alarms ${R.files.singleFileTurns.falseAlarms}`);
  L.push("");
  const c = rep.followThrough.coverage, a = rep.acct;
  L.push("COVERAGE");
  L.push(`  transcripts ${rep.stats.transcripts} · IN turns ${a.inTurns} (OUT ${a.outTurns}, MIXED withheld ${a.mixedTurns}) · in-scope file-grade structural edits ${a.structuralFileGradeEdits} · units ${a.units} ${JSON.stringify(a.byMode)} · no seed ${a.unitsNoSeed}`);
  L.push(`  rest nonempty ${c.restNonempty}/${c.units} · rest keys ${JSON.stringify(c.restKeys)} · units with an unseparable addition ${c.unitsWithUnseparable} ${JSON.stringify(c.unseparable)} · with a swapped-seed null ${c.withNull}`);
  L.push(`  FULL proposals ${JSON.stringify(c.proposals)} · counts ${JSON.stringify(c.fullCounts)} · assembled-vs-snippet keys agree ${c.assembled.agree}/${c.assembled.checked}`);
  L.push(`  ripple: IN turns ${R.coverage.inTurns}, with a code file ${R.coverage.withCodeFile}, multi-file ${R.coverage.multiFile}; first file seen before in another session ${R.files.firstFileSeenBefore}/${R.files.turns}`);
  L.push(`  typed gaps ${JSON.stringify(rep.gaps)}`);
  L.push(`  PII: ledger rows withheld ${rep.pii.ledger.rowsWithheld} ${JSON.stringify(rep.pii.ledger.byCategory ?? {})} · report strings scrubbed ${rep.pii.reportScrubbed}`);
  return L.join("\n");
}

// ═════════════════════════════ CLI ═════════════════════════════
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const val = (k, d = null) => { const i = a.indexOf(k); return i === -1 ? d : a[i + 1]; };
  if (val("--out")) assertUntrackedOutput(val("--out"));
  const rep = await runMover({
    root: val("--root") ?? undefined, scopeFile: val("--scope") ?? undefined, sample: val("--sample") ? Number(val("--sample")) : null,
    seed: Number(val("--seed", 1)), draws: Number(val("--draws", 1000)), donors: Number(val("--donors", 3)), nulls: Number(val("--nulls", 20)),
    tsAsJs: a.includes("--ts-as-js"), ledger: val("--ledger"),
  });
  if (val("--out")) fs.writeFileSync(val("--out"), JSON.stringify(rep, null, 1));
  console.log(a.includes("--json") ? JSON.stringify(rep, null, 1) : renderMover(rep));
}
