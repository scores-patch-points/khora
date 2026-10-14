#!/usr/bin/env node
// cli/apprentice-trail.mjs — THE TRAIL-FOLLOWING TEST FOR THE UNCONSCIOUS (2026-10-13).
//
// The apprentice's unconscious is mechanical: no model is called anywhere here (the local model is only the
// mouth). This file asks, per turn the master (Claude Code) spent editing eoreader/the-Fold code, whether a
// mechanical walker, standing in the repo as it stood when the turn began, would have REACHED the file the master
// edited, within the master's own number of hops, and what each component of that walker adds:
//
//   A  search only      seeds -> git-grep emulation at the rev -> candidates ranked by IDF-weighted hits; no following.
//   B  search + trail   also follows the addresses its OWN answers name, newest answer first, in order of appearance.
//   Bf B read FIFO      the literal "breadth by order of appearance" reading: A's whole ranked list first, then the
//                       trail queued behind it. Reported beside B, never instead of it.
//   C  null for B       B seeded by the ask of ANOTHER turn of the same project (K measured draws, averaged).
//   E  B + lesson       B plus a PREQUENTIAL region memory: ask-word -> edited-file associations from turns of OTHER
//                       sessions strictly earlier than this turn (turn timestamp), nothing later, nothing same-session.
//
// "A difference that makes a difference": a component counts only if switching it ON changes what is reached,
// against the same run with it OFF, on the same turns. Each difference is a PAIRED sign-flip permutation (turn
// level, so one turn's targets move together) with its p at its draw floor 1/(draws+1). One that changes nothing
// is reported "noticed, not learned" (the E arm also reports how often the memory fired at all).
//
// DEFINITIONS (all mechanical, none hand-set)
//   target   a code file (scope codeExt) a successful Edit/Write changed in an IN turn that existed at the turn's
//            start. A file the turn created is the typed gap `target-created`, never scored.
//   hops     the MASTER's hop count to a target = the 1-based index, among the turn's tool calls in order, of the
//            first call whose input strings contain the target's absolute path or its last two path segments
//            ("dir/name"). The master's budget is that number; its horizon is the turn's whole call count.
//   an arm's hops   each ACTION is one hop: opening a file, listing a directory (ls), or the one grep. An address
//            the ask itself names (a path fragment resolving into the tree) is opened without a grep; the grep runs
//            when the walker first needs a content candidate.
//   reach    the arm opened the target at hop <= budget (also reported <= horizon). hops-to-target is censored at
//            budget+1 for paired differences.
//   world    the repo as it stood at the turn's first timestamp, read ONLY through read-only git (rev-list, ls-tree,
//            cat-file, grep at a rev; an allow-list that REFUSES every other subcommand). The rev is the latest
//            commit at or before the turn in the target's own checkout; if the file is not in it (the history
//            starts later, as khora's does at its 2026-10-04 squash), the other known checkouts are searched for the
//            same repo-relative path at their own latest commit at or before the turn, closest in time wins, and the
//            row says worldSource:"fallback". Nothing recoverable is the typed gap `no-rev`.
//   seeds   word tokens ([A-Za-z0-9_]+, lowercased) and path fragments of redactPii(ask) ONLY. Weight of a word =
//            ln(N/df) over the code files of that tree (rarer words weigh more; df = N weighs 0), measured on the
//            rev itself. The index is an exact emulation of `git grep -l -i -w -F` over code-extension files plus
//            the path's own words; `--validate N` checks that emulation against real git grep.
//   address grammar (GIVEN rules, each with its giver)
//            git-grep `path:line:` output (git-grep's documented format) · ESM `import … from`/`import "x"`/
//            `export … from` and CommonJS `require("x")`/`import("x")` specifiers resolved relative to the reading
//            file with Node's extension and index.js completion (Node module resolution) · Python `from .x import`/
//            `import a.b` (the import system's relative/dotted resolution) · C `#include "x"` · HTML
//            `<script src>` · Node `at f (path:line:col)` and Python `File "p", line n` stack-trace frames · `ls`
//            listings (git ls-tree order). Bare package specifiers are not resolvable and are counted, not guessed.
//
// PII / OUTPUT discipline is apprentice-replay.mjs's, unchanged: the ask is redactPii'd at extraction and only its
// word tokens are used; rows hold opaque ids, counts and hops, never a path, token, ask or content; Goffman
// scrubs the report; --ledger/--out refuse a tracked path.
//
//   node cli/apprentice-trail.mjs [--root DIR] [--scope FILE] [--draws B] [--nulls K] [--seed S] [--sample N]
//                                 [--seed-mode words|identifiers] [--validate N] [--ledger FILE.jsonl] [--out FILE.json] [--json]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "../native/adapters/code/lex.js";
import {
  turnsOfTranscript, listTranscripts, loadScope, scopeOfTurn, editScope, opaque, scrubDeep, assertUntrackedOutput,
} from "./apprentice-replay.mjs";

export const TRAIL_VERSION = "apprentice-trail-1";
const bump = (m, k, n = 1) => { m[k] = (m[k] ?? 0) + n; return m; };

// ═════════════════════════════ 1. the world, through read-only git ═════════════════════════════
const READONLY = new Set(["rev-list", "log", "ls-tree", "cat-file", "show", "grep", "rev-parse", "for-each-ref", "worktree"]);

/** run a git subcommand in `repo` if (and only if) it cannot write; null on a nonzero exit */
export function git(repo, args, { input = null, raw = false, maxBuffer = 1 << 30 } = {}) {
  const sub = args[0];
  if (!READONLY.has(sub)) throw new Error(`git ${sub}: refused, not on the read-only allow-list`);
  if (sub === "worktree" && args[1] !== "list") throw new Error(`git worktree ${args[1]}: refused`);
  const opts = { input: input ?? undefined, maxBuffer, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" } };
  if (!raw) opts.encoding = "utf8";
  const r = spawnSync("git", ["-C", repo, ...args], opts);
  if (r.status !== 0) return null;
  return r.stdout;
}

/** realpath of the deepest existing ancestor of `p`, with the rest appended (a moved/deleted file keeps its name) */
export function realOf(p) {
  let d = p, rest = [];
  while (d && d !== "/" && !fs.existsSync(d)) { rest.unshift(path.basename(d)); d = path.dirname(d); }
  try { return path.join(fs.realpathSync(d || "/"), ...rest); } catch { return p; }
}

const topCache = new Map();
/** the work-tree root containing `p` (nearest existing ancestor), or null */
export function toplevelOf(p) {
  let d = path.dirname(p);
  while (d && d !== "/" && !fs.existsSync(d)) d = path.dirname(d);
  if (!d || !fs.existsSync(d)) return null;
  if (topCache.has(d)) return topCache.get(d);
  const out = git(d, ["rev-parse", "--show-toplevel"]);
  const top = out ? fs.realpathSync(out.trim()) : null;
  topCache.set(d, top);
  return top;
}

/** repo-relative path of `p` in its own checkout, or null */
export function relInOwn(p) {
  const rp = realOf(p);
  const top = toplevelOf(rp);
  if (!top || !rp.startsWith(top + path.sep)) return null;
  return { top, rel: path.relative(top, rp).split(path.sep).join("/") };
}

/** known checkouts: depth-1 scan of the given parent dirs for work trees, plus their `git worktree list` */
export function discoverRepos(parents, extra = []) {
  const tops = new Set(extra);
  for (const parent of parents) {
    let names = [];
    try { names = fs.readdirSync(parent); } catch { continue; }
    for (const n of names) {
      if (n === "node_modules") continue;
      const d = path.join(parent, n);
      if (fs.existsSync(path.join(d, ".git"))) { const t = toplevelOf(path.join(d, "x")); if (t) tops.add(t); }
    }
  }
  for (const t of [...tops]) {
    const out = git(t, ["worktree", "list", "--porcelain"]);
    if (!out) continue;
    for (const m of out.matchAll(/^worktree (.+)$/gm)) { try { if (fs.existsSync(m[1])) tops.add(fs.realpathSync(m[1])); } catch { /* gone */ } }
  }
  return [...tops].filter((t) => git(t, ["rev-parse", "--git-dir"]) !== null).sort();
}

const timelineCache = new Map();
/** every commit reachable from HEAD of `top` as [ct, rev], newest first (one git call per checkout, then memory) */
function timeline(top) {
  if (timelineCache.has(top)) return timelineCache.get(top);
  const out = git(top, ["rev-list", "--format=%ct", "HEAD"]);
  const list = [];
  if (out) for (const m of out.matchAll(/^commit ([0-9a-f]{40})\n(\d+)$/gm)) list.push([Number(m[2]), m[1]]);
  timelineCache.set(top, list);
  return list;
}

/** the latest commit at or before `iso` on HEAD of `top`: { rev, ct } or null */
export function revAt(top, iso) {
  const sec = Math.floor(Date.parse(iso) / 1000);
  let best = null;
  for (const [ct, rev] of timeline(top)) if (ct <= sec && (!best || ct > best.ct)) best = { rev, ct };
  return best;
}

const treeCache = new Map();
/** every tracked path at a rev -> blob oid (a Map; insertion order = git's byte order) */
export function treeAt(top, rev) {
  const key = `${top}\0${rev}`;
  if (treeCache.has(key)) { const t = treeCache.get(key); treeCache.delete(key); treeCache.set(key, t); return t; }
  const out = git(top, ["ls-tree", "-r", "-z", "--full-tree", rev]);
  const tree = new Map();
  if (out) for (const rec of out.split("\0")) {
    if (!rec) continue;
    const tab = rec.indexOf("\t");
    const [, type, oid] = rec.slice(0, tab).split(" ");
    if (type === "blob") tree.set(rec.slice(tab + 1), oid);
  }
  treeCache.set(key, tree);
  if (treeCache.size > 40) treeCache.delete(treeCache.keys().next().value);
  return tree;
}

/** the project directory segment of `P` (its first segment matching an IN pattern) and the path below it */
export function projectOf(P, scope) {
  const segs = P.split("/").filter(Boolean);
  const i = segs.findIndex((g) => scope.in.some((r) => r.test(g)));
  if (i === -1 || i === segs.length - 1) return null;
  return { name: segs[i], parent: "/" + segs.slice(0, i).join("/"), rel: segs.slice(i + 1).join("/") };
}

/**
 * { top, rev, ct, rel, source } for target path `P` at turn time `iso`, or { gap }.
 * source "own": the target's own checkout holds the file at its latest commit at or before the turn.
 * Otherwise the other known checkouts are searched for the same repo-relative path at their own latest commit at or
 * before the turn: a checkout of the same family (its directory name starts with the project directory's) first,
 * then the latest commit; source "fallback-family" or "fallback-other".
 */
export function resolveWorld(P, iso, repos, scope) {
  const own = relInOwn(P);
  const proj = projectOf(P, scope);
  const rel = own ? own.rel : proj?.rel;
  if (!rel) return { gap: "no-checkout" }; // neither a work tree nor a project directory in the path
  const r = own ? revAt(own.top, iso) : null;
  if (own && r && treeAt(own.top, r.rev).has(rel)) return { top: own.top, rev: r.rev, ct: r.ct, rel, source: "own" };
  const family = (t) => !!proj && (path.basename(t).startsWith(proj.name) || proj.name.startsWith(path.basename(t)));
  // a checkout of the same family is preferred, so the others are only searched when no family member holds the file
  const pick = (cands, source) => {
    let best = null;
    for (const t of cands) {
      if (own && t === own.top) continue;
      const q = revAt(t, iso);
      if (!q || (best && q.ct <= best.ct) || !treeAt(t, q.rev).has(rel)) continue;
      best = { top: t, rev: q.rev, ct: q.ct, rel, source };
    }
    return best;
  };
  const best = pick(repos.filter(family), "fallback-family") ?? pick(repos.filter((t) => !family(t)), "fallback-other");
  if (best) return best;
  if (!own) return { gap: "checkout-gone" }; // its checkout no longer exists and no known one held the file then
  if (!r) return { gap: "no-rev" };
  // why the file is not in the world: first added to this checkout's history AFTER the turn (it lived only in the
  // working tree then), or never found at that time
  const adds = git(own.top, ["log", "--format=%ct", "--diff-filter=A", "HEAD", "--", rel]);
  const lines = adds ? adds.split("\n").filter(Boolean).map(Number) : [];
  if (lines.length && Math.min(...lines) > Math.floor(Date.parse(iso) / 1000)) return { gap: "target-uncommitted" };
  return { gap: "target-not-in-rev" };
}

// ═════════════════════════════ 2. the index: git grep -l -i -w -F, emulated over a tree ═════════════════════════════
const INTERN = new Map();
const intern = (w) => { let i = INTERN.get(w); if (i === undefined) { i = INTERN.size; INTERN.set(w, i); } return i; };
// oid -> Int32Array of unique word ids, per seed mode:
//   "words"        every whole word of the file, comments and strings included (what `git grep -w -i` sees)
//   "identifiers"  only words outside comments and string literals (the code's own identifiers and keywords)
const BLOB_TOKENS = { words: new Map(), identifiers: new Map() };
const blobTokens = BLOB_TOKENS.words; // validateIndex compares this one to real git grep
const WORD = /[a-z0-9_]+/g;
const JS_LIKE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[\s\S]*?-->|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g;
const HASH_LIKE = /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g;
/** text with comments and string literals removed (a mechanical, language-family approximation, never a parser) */
export function stripNonCode(text, ext) {
  const hash = ext === ".py" || ext === ".rb" || ext === ".sh";
  return text.replace(hash ? HASH_LIKE : JS_LIKE, " ");
}

function tokensOfBytes(buf, mode, ext) {
  const ids = new Set();
  let text = buf.toString("latin1");
  if (mode === "identifiers") text = stripNonCode(text, ext);
  for (const m of text.toLowerCase().matchAll(WORD)) ids.add(intern(m[0]));
  return Int32Array.from(ids);
}

/** make sure every {oid, ext} in `entries` has its word set for `mode`; one `cat-file --batch` per chunk */
export function ensureTokens(top, entries, mode = "words") {
  const map = BLOB_TOKENS[mode];
  const extOf = new Map();
  for (const e of entries) if (!map.has(e.oid)) extOf.set(e.oid, e.ext);
  const need = [...extOf.keys()];
  for (let i = 0; i < need.length; i += 400) {
    const chunk = need.slice(i, i + 400);
    const buf = git(top, ["cat-file", "--batch"], { input: chunk.join("\n") + "\n", raw: true });
    if (!buf) continue;
    let pos = 0;
    while (pos < buf.length) {
      const nl = buf.indexOf(10, pos);
      if (nl === -1) break;
      const [oid, type, size] = buf.toString("latin1", pos, nl).split(" ");
      if (type === "missing") { pos = nl + 1; map.set(oid, new Int32Array(0)); continue; }
      const n = Number(size);
      map.set(oid, tokensOfBytes(buf.subarray(nl + 1, nl + 1 + n), mode, extOf.get(oid)));
      pos = nl + 1 + n + 1;
    }
  }
}

const contentCache = new Map();
/** the text of a blob (small LRU): the walker's "open a file" */
export function blobText(top, oid) {
  if (contentCache.has(oid)) { const t = contentCache.get(oid); contentCache.delete(oid); contentCache.set(oid, t); return t; }
  const out = git(top, ["cat-file", "blob", oid], { raw: true });
  const text = out ? out.toString("utf8") : "";
  contentCache.set(oid, text);
  if (contentCache.size > 400) contentCache.delete(contentCache.keys().next().value);
  return text;
}

export const pathWords = (p) => [...new Set([...p.toLowerCase().matchAll(WORD)].map((m) => m[0]))];

/** an index of the CODE files of one tree: word -> files, N, df */
export class RevIndex {
  constructor(top, rev, tree, codeExt, mode = "words") {
    this.top = top; this.rev = rev; this.tree = tree; this.mode = mode;
    this.files = [];
    for (const [p, oid] of tree) { const ext = path.extname(p).toLowerCase(); if (codeExt.has(ext)) this.files.push({ path: p, oid, ext }); }
    ensureTokens(top, this.files, mode);
    const tok = BLOB_TOKENS[mode];
    this.postings = new Map();
    this.files.forEach((f, i) => {
      const ids = new Set(tok.get(f.oid) ?? []);
      for (const w of pathWords(f.path)) ids.add(intern(w));
      for (const id of ids) { let a = this.postings.get(id); if (!a) { a = []; this.postings.set(id, a); } a.push(i); }
    });
    this.N = this.files.length;
    this.allPaths = [...tree.keys()];
    this.dirs = dirsOf(tree);
  }
  df(word) { const id = INTERN.get(word); return id === undefined ? 0 : (this.postings.get(id)?.length ?? 0); }
  /** candidates ranked by IDF-weighted distinct-seed hits, ties by path: [{path, score, hits}] */
  rank(words) {
    const score = new Map(), hits = new Map();
    for (const w of words) {
      const id = INTERN.get(w);
      const post = id === undefined ? null : this.postings.get(id);
      if (!post) continue;
      const idf = Math.log(this.N / post.length);
      for (const i of post) { score.set(i, (score.get(i) ?? 0) + idf); hits.set(i, (hits.get(i) ?? 0) + 1); }
    }
    return [...score].map(([i, s]) => ({ path: this.files[i].path, score: s, hits: hits.get(i) })).sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }
}

// ═════════════════════════════ 3. seeds, from the redacted ask only ═════════════════════════════
const NAMEABLE_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".py", ".rb", ".c", ".h", ".go", ".java", ".sh", ".html", ".css", ".scss", ".md", ".json"]);

/** { words, fragments } from an (already redacted) ask */
export function seedsOf(ask) {
  const text = String(ask ?? "");
  const words = [...new Set([...text.toLowerCase().matchAll(WORD)].map((m) => m[0]))];
  const fragments = [];
  for (const m of text.matchAll(/[\w.@\-]+(?:\/[\w.@\-]+)+\/?|[\w.@\-]+\/(?![\w.@\-])|[\w\-]+\.[A-Za-z0-9]{1,6}\b/g)) {
    const f = m[0].replace(/^[./]+/, "").replace(/[.,;:]+$/, "");
    if (!f) continue;
    if (!f.includes("/") && !NAMEABLE_EXT.has(path.extname(f).toLowerCase())) continue;
    if (!fragments.includes(f)) fragments.push(f);
  }
  return { words, fragments };
}

export function dirsOf(tree) {
  const d = new Set();
  for (const p of tree.keys()) { let i = p.lastIndexOf("/"); while (i > 0) { const q = p.slice(0, i); if (d.has(q)) break; d.add(q); i = q.lastIndexOf("/"); } }
  return d;
}

/** the addresses the ask itself NAMES in a tree: a fragment -> exactly one file, or a directory to ls */
export function askNamed(fragments, paths, dirs) {
  const out = [];
  for (const f of fragments) {
    const frag = f.replace(/\/$/, "");
    const hit = paths.filter((p) => p === frag || p.endsWith("/" + frag));
    if (hit.length === 1) { if (!out.includes(hit[0])) out.push(hit[0]); continue; }
    if (hit.length > 1) continue; // ambiguous: it names no single address
    for (const d of dirs) if (d === frag || d.endsWith("/" + frag)) { if (!out.includes(d + "/")) out.push(d + "/"); break; }
  }
  return out;
}

// ═════════════════════════════ 4. the address grammar ═════════════════════════════
const JS_EXT = [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".json"];
const addrCache = new Map(); // oid -> [{ at, kind, spec }]

/** the raw addresses a file's text names, in order of appearance */
export function addressesIn(text, file) {
  const ext = path.extname(file).toLowerCase();
  const out = [];
  const add = (re, kind, group = 1) => { for (const m of text.matchAll(re)) out.push({ at: m.index, kind, spec: m[group] }); };
  if (JS_EXT.includes(ext) || ext === ".html") {
    add(/(?:^|[\s;}])(?:import|export)\s[^'";]*?\bfrom\s*['"]([^'"\n]+)['"]/g, "esm");
    add(/(?:^|[\s;}])import\s*['"]([^'"\n]+)['"]/g, "esm");
    add(/\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g, "cjs");
    add(/\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g, "esm");
    if (ext === ".html") add(/<script[^>]+src\s*=\s*["']([^"']+)["']/gi, "script");
  } else if (ext === ".py") {
    add(/^\s*from\s+(\.*[\w.]*)\s+import\b/gm, "py");
    for (const m of text.matchAll(/^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm)) for (const part of m[1].split(",")) out.push({ at: m.index, kind: "py", spec: part.trim() });
  } else if (ext === ".c" || ext === ".h") add(/^\s*#\s*include\s*"([^"]+)"/gm, "c");
  // stack-trace frames (Node and Python), in any file
  add(/\bat\s+(?:[^\s(]+\s+\()?((?:\/|[A-Za-z]:\\)?[^\s():'"]+\.[A-Za-z0-9]+):\d+(?::\d+)?\)?/g, "frame");
  add(/File "([^"]+)", line \d+/g, "frame");
  return out.sort((a, b) => a.at - b.at);
}

/** resolve one raw address to a path in the tree, or null (bare specifiers and the unknown are not guessed) */
export function resolveAddress(a, from, tree) {
  const has = (p) => tree.has(p);
  const norm = (p) => path.posix.normalize(p).replace(/^\.\//, "");
  const dir = path.posix.dirname(from) === "." ? "" : path.posix.dirname(from);
  const tryJs = (base) => {
    const cands = [base, ...JS_EXT.map((e) => base + e), ...JS_EXT.slice(0, 6).map((e) => `${base}/index${e}`)];
    return cands.find((c) => has(c)) ?? null;
  };
  switch (a.kind) {
    case "esm": case "cjs": case "script": {
      const s = a.spec;
      if (s.startsWith("./") || s.startsWith("../") || s === "." || s === "..") return tryJs(norm(path.posix.join(dir, s)));
      if (s.startsWith("/")) return tryJs(norm(s.slice(1)));
      return null; // bare package or node: builtin
    }
    case "py": {
      const m = /^(\.*)([\w.]*)$/.exec(a.spec);
      if (!m) return null;
      const dots = m[1].length, mod = m[2].replace(/\./g, "/");
      if (!mod) return null;
      const bases = dots ? [path.posix.join(dir, ...Array(Math.max(dots - 1, 0)).fill(".."))] : [dir, ""];
      for (const b of bases) {
        const base = norm(path.posix.join(b, mod));
        for (const c of [`${base}.py`, `${base}/__init__.py`]) if (has(c)) return c;
      }
      return null;
    }
    case "c": { const p = norm(path.posix.join(dir, a.spec)); return has(p) ? p : null; }
    case "frame": {
      const p = a.spec.replace(/^file:\/\//, "");
      if (has(p)) return p;
      // an absolute path from another machine state: the longest segment-aligned suffix present in the tree
      const segs = p.split(/[\\/]/).filter(Boolean);
      for (let i = 0; i < segs.length - 1; i++) { const cand = segs.slice(i).join("/"); if (has(cand)) return cand; }
      return null;
    }
    default: return null;
  }
}

/** the paths a file's content NAMES, resolved, in order of appearance, unique; `stats.unresolved` counts bare specifiers */
export function namedBy(top, oid, from, tree, stats = null) {
  if (!addrCache.has(oid)) addrCache.set(oid, addressesIn(blobText(top, oid), from));
  const seen = new Set(), out = [];
  for (const a of addrCache.get(oid)) {
    const r = resolveAddress(a, from, tree);
    if (r === null) { if (stats && a.kind !== "frame") bump(stats, "unresolved"); continue; }
    if (r === from || seen.has(r)) continue;
    seen.add(r); out.push(r);
  }
  return out;
}

// ═════════════════════════════ 5. the walker (arms A, B, Bf, E) ═════════════════════════════
/**
 * walk({ index, seeds, policy, memory, target, horizon }) -> { hops: number|null, steps }
 *   policy "none"    A: ask-named, [memory], then the ranked grep candidates; no following
 *   policy "trail"   B: as A, but each opened file's named addresses become the newest answer and are followed first
 *   policy "fifo"    Bf: A's whole sequence first, followed addresses queued behind it
 * `memory` is an ordered list of paths nominated by the lesson (E), or null.
 * One action = one hop (open / ls / the one grep). `hops` is the action count at which `target` was opened, or
 * null when the walk exhausted its sequence or `horizon` actions without opening it.
 */
export function walk({ index, seeds, policy, memory = null, target, horizon }) {
  const { tree } = index;
  const opened = new Set();
  const answers = []; // newest last; each { addrs, i }
  const fifo = [];
  const push = (addrs) => { if (addrs.length) answers.push({ addrs, i: 0 }); };
  const named = askNamed(seeds.fragments, index.allPaths, index.dirs);
  const initial = [];
  if (named.length) initial.push(named);
  if (memory && memory.length) initial.push(memory.filter((p) => tree.has(p)));
  if (policy === "fifo") for (const s of initial) fifo.push(...s);
  else for (let k = initial.length - 1; k >= 0; k--) push(initial[k]); // the first source is the newest: tried first
  const next = () => {
    if (policy === "fifo") { while (fifo.length) { const a = fifo.shift(); if (!opened.has(a)) return a; } return null; }
    for (let k = answers.length - 1; k >= 0; k--) {
      const ans = answers[k];
      while (ans.i < ans.addrs.length) { const a = ans.addrs[ans.i++]; if (!opened.has(a)) return a; }
    }
    return null;
  };
  let hops = 0, grepDone = false;
  while (hops < horizon) {
    const a = next();
    if (a === null) {
      if (grepDone || !seeds.words.length) return { hops: null, steps: hops };
      hops++; grepDone = true; // the one grep
      const c = index.rank(seeds.words).map((x) => x.path);
      if (policy === "fifo") fifo.push(...c); else push(c);
      continue;
    }
    hops++;
    opened.add(a);
    if (a.endsWith("/")) { // ls: the listing, in git's order
      const kids = new Set();
      for (const p of index.allPaths) if (p.startsWith(a)) { const rest = p.slice(a.length); const j = rest.indexOf("/"); kids.add(j === -1 ? a + rest : a + rest.slice(0, j + 1)); }
      if (policy === "fifo") fifo.push(...kids); else if (policy === "trail") push([...kids]);
      continue;
    }
    if (a === target) return { hops, steps: hops };
    if (policy !== "none") {
      const oid = tree.get(a);
      if (oid) {
        const named2 = namedBy(index.top, oid, a, tree).filter((p) => !opened.has(p));
        if (policy === "fifo") fifo.push(...named2); else push(named2);
      }
    }
  }
  return { hops: null, steps: hops };
}

// ═════════════════════════════ 6. turns -> units, the master's hops ═════════════════════════════
/** the 1-based index of the first call whose input names `abs` (or its last two segments); null if none */
export function masterHops(calls, abs) {
  const tail = abs.split("/").filter(Boolean).slice(-2).join("/");
  for (let i = 0; i < calls.length; i++) if (calls[i].strs.some((s) => s.includes(abs) || (tail && s.includes(tail)))) return i + 1;
  return null;
}

/** targets of a turn: successful Edit/Write on IN code files; a file the turn created carries created:true */
export function targetsOf(turn, scope) {
  const seen = new Map();
  for (const e of turn.edits) {
    const g = e.row?.gap;
    if (g === "edit-failed" || g === "no-result") continue;
    if (!scope.codeExt.has(path.extname(e.file).toLowerCase())) continue;
    if (editScope(e.file, scope).verdict !== "in") continue;
    const created = e.tool === "Write" && e.row?.mode === "write-create";
    const prev = seen.get(e.file);
    seen.set(e.file, { abs: e.file, created: prev ? prev.created : created });
  }
  return [...seen.values()];
}

// ═════════════════════════════ 7. the prequential region memory (the lesson) ═════════════════════════════
export class RegionMemory {
  constructor() { this.assoc = new Map(); } // word -> Map(rel -> Set(session))
  learn(words, rels, session) {
    for (const w of words) {
      let m = this.assoc.get(w);
      if (!m) { m = new Map(); this.assoc.set(w, m); }
      for (const r of rels) { let s = m.get(r); if (!s) { s = new Set(); m.set(r, s); } s.add(session); }
    }
  }
  /** nominated rels, strongest first: each word votes its empirical share of earlier OTHER-session associations */
  nominate(words, session) {
    const score = new Map();
    for (const w of words) {
      const m = this.assoc.get(w);
      if (!m) continue;
      let total = 0;
      const cnt = [];
      for (const [r, s] of m) { const n = s.size - (s.has(session) ? 1 : 0); if (n > 0) { cnt.push([r, n]); total += n; } }
      for (const [r, n] of cnt) score.set(r, (score.get(r) ?? 0) + n / total);
    }
    return [...score].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([r]) => r);
  }
}

// ═════════════════════════════ 8. paired permutation nulls ═════════════════════════════
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** paired sign-flip null at cluster level: two-sided on the mean difference, p at its draw floor 1/(draws+1) */
export function pairedNull(d, cluster, { draws = 1000, seed = 1 } = {}) {
  const n = d.length;
  if (!n) return { n: 0, note: "no pairs" };
  const obs = mean(d);
  const groups = new Map();
  d.forEach((x, i) => { const c = cluster[i]; groups.set(c, (groups.get(c) ?? 0) + x); });
  const sums = [...groups.values()];
  const rnd = mulberry32(seed);
  let reached = 0, ss = 0;
  for (let b = 0; b < draws; b++) {
    let s = 0;
    for (const v of sums) s += rnd() < 0.5 ? -v : v;
    const m = s / n;
    ss += m * m;
    if (Math.abs(m) >= Math.abs(obs) - 1e-12) reached++;
  }
  return {
    n, clusters: groups.size, mean: obs, plus: d.filter((x) => x > 0).length, minus: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length,
    nullSd: Math.sqrt(ss / Math.max(draws, 1)), draws, reached, p: (1 + reached) / (draws + 1), floor: 1 / (draws + 1),
  };
}

// ═════════════════════════════ 9. the run ═════════════════════════════
const cmpTs = (a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0);

function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** check the index against real `git grep -l -i -w -F` for up to `n` words; { checked, mismatches } */
export function validateIndex(index, words, codeExt, rnd, n = 5) {
  const specs = [...codeExt].map((e) => `*${e}`);
  const out = { checked: 0, mismatches: 0 };
  for (const w of shuffled(words, rnd).slice(0, n)) {
    const real = git(index.top, ["grep", "-l", "-i", "-w", "-F", "-e", w, index.rev, "--", ...specs]);
    const fromGit = new Set((real ?? "").split("\n").filter(Boolean).map((l) => l.slice(index.rev.length + 1)));
    const id = INTERN.get(w);
    const mine = new Set(index.files.filter((f) => id !== undefined && blobTokens.get(f.oid)?.includes(id)).map((f) => f.path));
    out.checked++;
    if (mine.size !== fromGit.size || [...fromGit].some((p) => !mine.has(p))) out.mismatches++;
  }
  return out;
}

const T0 = Date.now();
const lap = (m) => { if (process.env.TRAIL_TIMING) console.error(`[trail ${((Date.now() - T0) / 1000).toFixed(1)}s] ${m}`); };

export async function runTrail({
  root = path.join(os.homedir(), ".claude", "projects"), scopeFile = undefined, draws = 1000, nulls = 10, seed = 1,
  sample = null, validate = 0, ledger = null, files = null, repos = null, seedMode = "words",
} = {}) {
  if (ledger) assertUntrackedOutput(ledger);
  const scope = loadScope(scopeFile);
  const stats = { transcripts: 0 };
  const seen = new Set();
  let turns = [];
  let list = files ?? listTranscripts(root);
  if (sample) list = shuffled(list, mulberry32(seed));
  const acct = { turnsIn: 0, turnsOut: 0, turnsMixed: 0 };
  for (const f of list) {
    stats.transcripts++;
    for (const t of await turnsOfTranscript(f, { root, seen, stats })) {
      const v = scopeOfTurn(t, scope);
      if (v === "in") { acct.turnsIn++; turns.push({ session: t.session, project: t.project, promptId: t.promptId, ts: t.ts, prompt: t.prompt, calls: t.calls, targets: targetsOf(t, scope) }); }
      else if (v === "mixed") acct.turnsMixed++; else acct.turnsOut++;
    }
    if (sample && turns.filter((t) => t.targets.length).length >= sample) break;
  }
  turns.sort(cmpTs);
  if (sample) { let k = 0; turns = turns.filter((t) => t.targets.length && ++k <= sample); }
  const withTargets = turns.filter((t) => t.targets.length);

  // known checkouts, from where the targets live
  const own = new Set(), parents = new Set();
  for (const t of withTargets) for (const x of t.targets) {
    const o = relInOwn(x.abs);
    if (o) { own.add(o.top); parents.add(path.dirname(o.top)); }
    const pr = projectOf(x.abs, scope);
    if (pr) parents.add(pr.parent);
  }
  const known = repos ?? discoverRepos([...parents], [...own]);

  lap(`transcripts read: ${turns.length} IN turns`);
  const gaps = {};
  const units = [];
  for (const t of turns) {
    if (!t.targets.length) { bump(gaps, "no-code-target"); continue; }
    if (t.prompt === null || !t.prompt.trim()) { bump(gaps, "no-ask", t.targets.length); continue; }
    for (const x of t.targets) {
      if (x.created) { bump(gaps, "target-created"); continue; }
      const w = resolveWorld(x.abs, t.ts, known, scope);
      if (w.gap) { bump(gaps, w.gap); continue; }
      const mh = masterHops(t.calls, x.abs);
      if (mh === null) { bump(gaps, "no-master-touch"); continue; }
      units.push({ turn: t, abs: x.abs, world: w, budget: mh, horizon: Math.max(t.calls.length, mh) });
    }
  }

  lap(`worlds resolved: ${units.length} units, gaps ${JSON.stringify(gaps)}`);
  // prequential memory + paired arms, in time order
  const memory = new RegionMemory();
  const projectAsks = new Map();
  for (const t of withTargets) if (t.prompt && t.prompt.trim()) { if (!projectAsks.has(t.project)) projectAsks.set(t.project, []); projectAsks.get(t.project).push(t); }
  const learnTurns = withTargets.filter((t) => t.prompt && t.prompt.trim());
  const relsOf = (t) => t.targets.map((x) => relInOwn(x.abs)?.rel).filter(Boolean);
  const rnd = mulberry32(seed + 7);
  const idxCache = new Map();
  const getIndex = (w) => {
    const k = `${w.top}\0${w.rev}`;
    if (idxCache.has(k)) { const v = idxCache.get(k); idxCache.delete(k); idxCache.set(k, v); return v; }
    const idx = new RevIndex(w.top, w.rev, treeAt(w.top, w.rev), scope.codeExt, seedMode);
    idxCache.set(k, idx);
    if (idxCache.size > 3) idxCache.delete(idxCache.keys().next().value);
    return idx;
  };
  const rows = [];
  const validation = { checked: 0, mismatches: 0 };
  let learned = 0, unitNo = 0;
  const ordered = units.slice().sort((a, b) => cmpTs(a.turn, b.turn));
  for (const u of ordered) {
    while (learned < learnTurns.length && learnTurns[learned].ts < u.turn.ts) {
      const lt = learnTurns[learned++];
      memory.learn(seedsOf(lt.prompt).words, relsOf(lt), lt.session);
    }
    const idx = getIndex(u.world);
    const target = u.world.rel;
    const seeds = seedsOf(u.turn.prompt);
    const go = (s, policy, mem = null) => walk({ index: idx, seeds: s, policy, memory: mem, target, horizon: u.horizon });
    const A = go(seeds, "none"), B = go(seeds, "trail"), Bf = go(seeds, "fifo");
    const nominated = memory.nominate(seeds.words, u.turn.session).filter((p) => idx.tree.has(p));
    const E = go(seeds, "trail", nominated);
    const EA = go(seeds, "none", nominated); // the lesson with no trail: does memory beat search on its own?
    const others = (projectAsks.get(u.turn.project) ?? []).filter((t) => t.promptId !== u.turn.promptId);
    const drawn = shuffled(others, rnd).slice(0, nulls);
    const C = drawn.map((t) => go(seedsOf(t.prompt), "trail"));
    // E0: the same machinery and the real ask, but the memory is consulted with ANOTHER turn's ask: is the lesson
    // about THIS ask, or only a front-loaded list of files
    const otherNominated = drawn.map((t) => memory.nominate(seedsOf(t.prompt).words, u.turn.session).filter((p) => idx.tree.has(p)));
    const E0 = otherNominated.map((m) => go(seeds, "trail", m));
    const EA0 = otherNominated.map((m) => go(seeds, "none", m)); // and with no trail
    if (validate && seedMode === "words" && validation.checked < validate && unitNo % 11 === 0) {
      const v = validateIndex(idx, seeds.words.filter((w) => idx.df(w) > 0), scope.codeExt, rnd, 3);
      validation.checked += v.checked; validation.mismatches += v.mismatches;
    }
    unitNo++;
    const hit = (r) => (r.hops !== null && r.hops <= u.budget ? 1 : 0);
    const cens = (r) => (r.hops !== null && r.hops <= u.budget ? r.hops : u.budget + 1);
    rows.push({
      session: u.turn.session, projectId: opaque(u.turn.project), promptId: u.turn.promptId, ts: u.turn.ts,
      targetId: opaque(target), ext: path.extname(target).toLowerCase(), worldSource: u.world.source, repoId: opaque(path.basename(u.world.top)),
      budget: u.budget, horizon: u.horizon, files: idx.N, seedWords: seeds.words.filter((w) => idx.df(w) > 0).length,
      askNamedFiles: askNamed(seeds.fragments, idx.allPaths, idx.dirs).length, memoryNominated: nominated.length,
      A: { reach: hit(A), hops: A.hops, reachHorizon: A.hops !== null ? 1 : 0 },
      B: { reach: hit(B), hops: B.hops, reachHorizon: B.hops !== null ? 1 : 0 },
      Bf: { reach: hit(Bf), hops: Bf.hops, reachHorizon: Bf.hops !== null ? 1 : 0 },
      E: { reach: hit(E), hops: E.hops, reachHorizon: E.hops !== null ? 1 : 0 },
      EA: { reach: hit(EA), hops: EA.hops, reachHorizon: EA.hops !== null ? 1 : 0 },
      E0: { n: E0.length, reach: E0.length ? mean(E0.map(hit)) : null, reachHorizon: E0.length ? mean(E0.map((r) => (r.hops !== null ? 1 : 0))) : null, censHops: E0.length ? mean(E0.map(cens)) : null },
      EA0: { n: EA0.length, reach: EA0.length ? mean(EA0.map(hit)) : null, reachHorizon: EA0.length ? mean(EA0.map((r) => (r.hops !== null ? 1 : 0))) : null, censHops: EA0.length ? mean(EA0.map(cens)) : null },
      C: { n: C.length, reach: C.length ? mean(C.map(hit)) : null, reachHorizon: C.length ? mean(C.map((r) => (r.hops !== null ? 1 : 0))) : null, censHops: C.length ? mean(C.map(cens)) : null },
      censHops: { A: cens(A), B: cens(B), Bf: cens(Bf), E: cens(E), EA: cens(EA) },
    });
  }

  lap(`arms run: ${rows.length} rows`);
  const report = summarize(rows, { draws, seed, gaps, acct, withTargets: withTargets.length, candidates: units.length, stats, known: known.length, validation });
  report.seedMode = seedMode;
  if (ledger) {
    const fd = fs.openSync(ledger, "w");
    for (const r of rows) fs.writeSync(fd, JSON.stringify(r) + "\n");
    fs.closeSync(fd);
  }
  const scrub = {};
  const clean = scrubDeep(report, scrub);
  clean.reportScrubbed = scrub.strings ?? 0;
  return { report: clean, rows };
}

export function summarize(rows, { draws, seed, gaps, acct, withTargets, candidates, stats, known, validation }) {
  const arms = {};
  for (const k of ["A", "B", "Bf", "E", "EA"]) {
    const reached = rows.filter((r) => r[k].reach === 1);
    arms[k] = {
      reachAtBudget: mean(rows.map((r) => r[k].reach)), reachAtHorizon: mean(rows.map((r) => r[k].reachHorizon)),
      reachedUnits: reached.length, meanHopsWhenReached: reached.length ? mean(reached.map((r) => r[k].hops)) : null, meanCensoredHops: mean(rows.map((r) => r.censHops[k])),
    };
  }
  const withC = rows.filter((r) => r.C.n > 0);
  arms.C = { reachAtBudget: mean(withC.map((r) => r.C.reach)), reachAtHorizon: mean(withC.map((r) => r.C.reachHorizon)), meanCensoredHops: mean(withC.map((r) => r.C.censHops)), unitsWithDraws: withC.length, drawsPerUnit: mean(withC.map((r) => r.C.n)) };
  const withE0 = rows.filter((r) => r.E0.n > 0);
  arms.E0 = { reachAtBudget: mean(withE0.map((r) => r.E0.reach)), reachAtHorizon: mean(withE0.map((r) => r.E0.reachHorizon)), meanCensoredHops: mean(withE0.map((r) => r.E0.censHops)), unitsWithDraws: withE0.length, drawsPerUnit: mean(withE0.map((r) => r.E0.n)) };
  arms.EA0 = { reachAtBudget: mean(withE0.map((r) => r.EA0.reach)), reachAtHorizon: mean(withE0.map((r) => r.EA0.reachHorizon)), meanCensoredHops: mean(withE0.map((r) => r.EA0.censHops)), unitsWithDraws: withE0.length, drawsPerUnit: mean(withE0.map((r) => r.EA0.n)) };
  const cl = (rs) => rs.map((r) => r.promptId ?? r.session);
  const diff = (rs, get, k) => pairedNull(rs.map(get), cl(rs), { draws, seed: seed + k });
  const D = {};
  D["B-A"] = { reach: diff(rows, (r) => r.B.reach - r.A.reach, 1), hopsSaved: diff(rows, (r) => r.censHops.A - r.censHops.B, 2) };
  D["Bf-A"] = { reach: diff(rows, (r) => r.Bf.reach - r.A.reach, 3), hopsSaved: diff(rows, (r) => r.censHops.A - r.censHops.Bf, 4) };
  D["B-C"] = { reach: diff(withC, (r) => r.B.reach - r.C.reach, 5), hopsSaved: diff(withC, (r) => r.C.censHops - r.censHops.B, 6) };
  D["E-B"] = { reach: diff(rows, (r) => r.E.reach - r.B.reach, 7), hopsSaved: diff(rows, (r) => r.censHops.B - r.censHops.E, 8) };
  D["E-E0"] = { reach: diff(withE0, (r) => r.E.reach - r.E0.reach, 11), hopsSaved: diff(withE0, (r) => r.E0.censHops - r.censHops.E, 12) };
  D["EA-EA0"] = { reach: diff(withE0, (r) => r.EA.reach - r.EA0.reach, 17), hopsSaved: diff(withE0, (r) => r.EA0.censHops - r.censHops.EA, 18) };
  D["EA0-A"] = { reach: diff(withE0, (r) => r.EA0.reach - r.A.reach, 19), hopsSaved: diff(withE0, (r) => r.censHops.A - r.EA0.censHops, 20) };
  D["EA-A"] = { reach: diff(rows, (r) => r.EA.reach - r.A.reach, 13), hopsSaved: diff(rows, (r) => r.censHops.A - r.censHops.EA, 14) };
  D["E-A"] = { reach: diff(rows, (r) => r.E.reach - r.A.reach, 15), hopsSaved: diff(rows, (r) => r.censHops.A - r.censHops.E, 16) };
  const fired = rows.filter((r) => r.memoryNominated > 0);
  D["E-B | memory fired"] = { reach: diff(fired, (r) => r.E.reach - r.B.reach, 9), hopsSaved: diff(fired, (r) => r.censHops.B - r.censHops.E, 10), units: fired.length };
  const by = (keyFn) => {
    const m = {};
    for (const r of rows) {
      const s = (m[keyFn(r)] ??= { units: 0, A: 0, B: 0, Bf: 0, E: 0, EA: 0, C: 0, cn: 0 });
      s.units++; s.A += r.A.reach; s.B += r.B.reach; s.Bf += r.Bf.reach; s.E += r.E.reach; s.EA += r.EA.reach;
      if (r.C.n) { s.C += r.C.reach; s.cn++; }
    }
    for (const s of Object.values(m)) { s.A /= s.units; s.B /= s.units; s.Bf /= s.units; s.E /= s.units; s.EA /= s.units; s.C = s.cn ? s.C / s.cn : null; delete s.cn; }
    return m;
  };
  return {
    version: TRAIL_VERSION, draws, seed, turnsInScope: acct.turnsIn, turnsOut: acct.turnsOut, turnsMixed: acct.turnsMixed,
    turnsWithCodeTarget: withTargets, units: { scored: rows.length, candidates, typedGaps: gaps },
    checkoutsKnown: known, transcripts: stats.transcripts,
    worldSource: by((r) => r.worldSource), arms, differences: D, coverageByExt: by((r) => r.ext),
    budgetShape: { medianBudget: median(rows.map((r) => r.budget)), meanBudget: mean(rows.map((r) => r.budget)), unitsWithBudget1: rows.filter((r) => r.budget === 1).length },
    seeding: { unitsWithAnySeedWord: rows.filter((r) => r.seedWords > 0).length, unitsWithAskNamedFile: rows.filter((r) => r.askNamedFiles > 0).length },
    memory: { unitsNominated: fired.length },
    indexValidation: validation,
  };
}

// ═════════════════════════════ 10. rendering + CLI ═════════════════════════════
const pc = (x) => (x === null || x === undefined ? "n/a" : `${(100 * x).toFixed(1)}%`);
const sg = (x) => (x >= 0 ? "+" : "") + x.toFixed(4);

export function renderTrail(rep) {
  const L = [];
  const row = (label, d) => (d.note ? `  ${label}: ${d.note}` :
    `  ${label.padEnd(22)} ${sg(d.mean)}  (+${d.plus}/−${d.minus}/=${d.zero} of ${d.n} units, ${d.clusters} turns)  null sd ${d.nullSd.toFixed(4)}  reached by ${d.reached}/${d.draws}  p=${d.p.toFixed(4)} (floor ${d.floor.toFixed(4)})`);
  L.push(`apprentice-trail ${rep.version} — seeds against ${rep.seedMode === "identifiers" ? "code identifiers only (comments and strings stripped)" : "whole words, as git grep -w -i sees them"} — the three differences first (paired sign-flip nulls, turn-level)`);
  for (const k of ["B-A", "B-C", "E-B"]) {
    const d = rep.differences[k];
    L.push(`${k}`);
    L.push(row("reach within budget", d.reach));
    L.push(row("hops saved (censored)", d.hopsSaved));
  }
  const f = rep.differences["E-B | memory fired"];
  L.push(`E-B where the memory fired (${f.units} units)`);
  L.push(row("reach within budget", f.reach)); L.push(row("hops saved (censored)", f.hopsSaved));
  L.push(`Bf-A (the literal FIFO trail)`);
  L.push(row("reach within budget", rep.differences["Bf-A"].reach));
  L.push(`controls for the lesson: is it about THIS ask, and does it beat search alone?`);
  for (const k of ["E-E0", "EA-EA0", "EA0-A", "EA-A", "E-A"]) { L.push(`${k}`); L.push(row("reach within budget", rep.differences[k].reach)); L.push(row("hops saved (censored)", rep.differences[k].hopsSaved)); }
  L.push("");
  L.push(`arms: reach within budget / within the master's whole turn / mean censored hops`);
  for (const k of ["A", "B", "Bf", "C", "E", "E0", "EA", "EA0"]) {
    const a = rep.arms[k];
    L.push(`  ${k.padEnd(3)} ${pc(a.reachAtBudget)} / ${pc(a.reachAtHorizon)} / ${a.meanCensoredHops === null || a.meanCensoredHops === undefined ? "n/a" : a.meanCensoredHops.toFixed(2)}${k === "C" || k === "E0" || k === "EA0" ? `  (${a.unitsWithDraws} units, ${(a.drawsPerUnit ?? 0).toFixed(1)} draws each)` : ""}`);
  }
  L.push("");
  L.push(`scope: ${rep.turnsInScope} IN turns (${rep.turnsOut} OUT, ${rep.turnsMixed} mixed withheld) · ${rep.turnsWithCodeTarget} with a code target · ${rep.units.candidates} target units · SCORED ${rep.units.scored}`);
  L.push(`typed gaps: ${JSON.stringify(rep.units.typedGaps)}`);
  L.push(`checkouts known ${rep.checkoutsKnown} · world source ${JSON.stringify(Object.fromEntries(Object.entries(rep.worldSource).map(([k, v]) => [k, v.units])))}`);
  L.push(`master budget: median ${rep.budgetShape.medianBudget}, mean ${rep.budgetShape.meanBudget.toFixed(2)}, ${rep.budgetShape.unitsWithBudget1} units with budget 1 · units with any ask word present in the code ${rep.seeding.unitsWithAnySeedWord}, with an ask-named file ${rep.seeding.unitsWithAskNamedFile} · memory nominated on ${rep.memory.unitsNominated}`);
  L.push(`index vs real git grep: ${rep.indexValidation.mismatches} mismatches of ${rep.indexValidation.checked} words checked`);
  L.push("by world source (A / B / Bf / C / E reach):");
  for (const [k, v] of Object.entries(rep.worldSource)) L.push(`  ${k.padEnd(9)} ${String(v.units).padStart(5)} units  ${pc(v.A)} / ${pc(v.B)} / ${pc(v.Bf)} / ${pc(v.C)} / ${pc(v.E)}`);
  L.push("by extension:");
  for (const [k, v] of Object.entries(rep.coverageByExt).sort((a, b) => b[1].units - a[1].units)) L.push(`  ${k.padEnd(9)} ${String(v.units).padStart(5)} units  ${pc(v.A)} / ${pc(v.B)} / ${pc(v.Bf)} / ${pc(v.C)} / ${pc(v.E)}`);
  return L.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const val = (k, d = null) => { const i = a.indexOf(k); return i === -1 ? d : a[i + 1]; };
  if (val("--out")) assertUntrackedOutput(val("--out"));
  const { report } = await runTrail({
    root: val("--root") ?? undefined, scopeFile: val("--scope") ?? undefined, draws: Number(val("--draws", 1000)), nulls: Number(val("--nulls", 10)),
    seed: Number(val("--seed", 1)), sample: val("--sample") ? Number(val("--sample")) : null, validate: Number(val("--validate", 0)), ledger: val("--ledger"),
    seedMode: val("--seed-mode", "words"),
  });
  if (val("--out")) fs.writeFileSync(val("--out"), JSON.stringify(report, null, 1));
  console.log(a.includes("--json") ? JSON.stringify(report, null, 1) : renderTrail(report));
}
