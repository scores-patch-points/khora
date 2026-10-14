// organs/repo-look.js — LOOK: from the ask's own words, which places in a repo does it point at?
// Cell: SEG · Figure → Differentiate / Structure / Link / Dissecting (kernel/cube.js cellOf). The ask's words are cut
// against the repo and each word that lands is a LINK from a word to a place, with its bytes (line + UTF-8 span).
//
// WHY THIS ORGAN EXISTS (CENNINI.md, "the movement"). The Fold's agent loop draws before it looks: J7 `looks-first`
// failed on 3 of 3 live runs, and the only look the loop has is khora reading the ASK itself. This is the part that
// looks at the MATERIAL. It is the search arm the trail test graded (cli/apprentice-trail.mjs, arm A): on the in-scope
// history, search alone reached the master's file within the master's own hops on 38.3% of 1,647 units, and an ask's
// own words beat another ask's words by +4.6 points (p = 0.001). A newest-first TRAIL walk made it worse, so there is
// no trail-following here, by measurement. A tested equivalence against that instrument's RevIndex (and against real
// `git grep -w -i`) is what carries the grade from the instrument to this part.
//
// THE ALGORITHM, exactly the graded one:
//   seeds     the ask's lowercase whole words (`[a-z0-9_]+`), plus path-looking FRAGMENTS (a/b.js, dir/, name.ext)
//   index     per code file, the set of lowercase whole words of its bytes read as latin1 (what `git grep -w -i` sees),
//             plus the words of its own path
//   named     a fragment that names exactly one file (suffix match) or a directory, first
//   ranked    the rest by sum over distinct seed words of ln(N / df): rarer words weigh more, df = N weighs 0; ties
//             by path
//   matches   for each shown candidate, where its seed words are: line + UTF-8 byte span, so the bytes can be re-read
//
// LAWS. No model, no network, nothing written. The ask is redacted by Goffman BEFORE a seed is taken (PII is ON by
// default). A place is an ADDRESS (path, line, byte span), never a summary. An ask with no word the repo contains
// returns a typed gap, never a guess. The index is a pure function of the files it is given; the only IO is
// `indexWorktree`, which reads `git ls-files` and the files it lists.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { redactPii } from "./goffman.js";

export const LOOK_SCHEMA = "RepoLook@1";

/** code-like extensions the index reads (the same set the in-scope history was graded over) */
export const CODE_EXT = Object.freeze([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".py", ".rb", ".c", ".h", ".go", ".java", ".sh", ".html", ".css", ".scss"]);
const NAMEABLE_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".py", ".rb", ".c", ".h", ".go", ".java", ".sh", ".html", ".css", ".scss", ".md", ".json"]);
const WORD = /[a-z0-9_]+/g;

const extOf = (p) => path.extname(p).toLowerCase();
export const pathWords = (p) => [...new Set([...String(p).toLowerCase().matchAll(WORD)].map((m) => m[0]))];

/** { words, fragments } from an ask. The ask is redacted FIRST; the caller never sees a PII value in a seed. */
export function seedsOf(ask) {
  const text = redactPii(String(ask ?? ""));
  const words = [...new Set([...text.toLowerCase().matchAll(WORD)].map((m) => m[0]))];
  const fragments = [];
  for (const m of text.matchAll(/[\w.@\-]+(?:\/[\w.@\-]+)+\/?|[\w.@\-]+\/(?![\w.@\-])|[\w\-]+\.[A-Za-z0-9]{1,6}\b/g)) {
    const f = m[0].replace(/^[./]+/, "").replace(/[.,;:]+$/, "");
    if (!f) continue;
    if (!f.includes("/") && !NAMEABLE_EXT.has(extOf(f))) continue;
    if (!fragments.includes(f)) fragments.push(f);
  }
  return { words, fragments };
}

const latin1Words = (bytes) => {
  const b = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : Buffer.from(bytes);
  return new Set([...b.toString("latin1").toLowerCase().matchAll(WORD)].map((m) => m[0]));
};

function dirsOf(paths) {
  const d = new Set();
  for (const p of paths) { let i = p.lastIndexOf("/"); while (i > 0) { const q = p.slice(0, i); if (d.has(q)) break; d.add(q); i = q.lastIndexOf("/"); } }
  return d;
}

/**
 * Build the index. `files` is [{ path, bytes }] for the files whose WORDS are read (code files); `allPaths` is every
 * path in the tree (default: the given paths), used only so an ask can NAME a file or directory.
 */
export function buildIndex(files, { allPaths = null, codeExt = CODE_EXT } = {}) {
  const ext = new Set(codeExt);
  const kept = files.filter((f) => ext.has(extOf(f.path)));
  const postings = new Map();
  kept.forEach((f, i) => {
    const words = latin1Words(f.bytes);
    for (const w of pathWords(f.path)) words.add(w);
    for (const w of words) { let a = postings.get(w); if (!a) { a = []; postings.set(w, a); } a.push(i); }
  });
  const paths = allPaths ?? files.map((f) => f.path);
  const index = {
    files: kept.map((f) => ({ path: f.path, bytes: f.bytes })), N: kept.length, postings, allPaths: paths, dirs: dirsOf(paths),
    df: (w) => postings.get(w)?.length ?? 0,
    /** [{ path, score, hits }] by IDF-weighted distinct-seed hits, ties by path */
    rank(words) {
      const score = new Map(), hits = new Map();
      for (const w of words) {
        const post = postings.get(w);
        if (!post) continue;
        const idf = Math.log(kept.length / post.length);
        for (const i of post) { score.set(i, (score.get(i) ?? 0) + idf); hits.set(i, (hits.get(i) ?? 0) + 1); }
      }
      return [...score].map(([i, s]) => ({ path: kept[i].path, score: s, hits: hits.get(i) }))
        .sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    },
  };
  return index;
}

/** the addresses the ask itself NAMES: a fragment -> exactly one file, or a directory (trailing slash) */
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

/** where the seed words are in one file: [{ word, line, from, to }] (1-based line; UTF-8 byte span [from, to)) */
export function matchesIn(bytes, words, { max = 3 } = {}) {
  const want = new Set(words);
  const buf = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : Buffer.from(bytes);
  const latin = buf.toString("latin1");
  const out = [];
  const perWord = new Map();
  let line = 1, lastAt = 0;
  for (const m of latin.matchAll(/[A-Za-z0-9_]+/g)) {
    const w = m[0].toLowerCase();
    if (!want.has(w)) continue;
    if ((perWord.get(w) ?? 0) >= max) continue;
    // a whole word, as `-w` sees it: the neighbours are not word characters
    for (let k = lastAt; k < m.index; k++) if (latin.charCodeAt(k) === 10) line++;
    lastAt = m.index;
    perWord.set(w, (perWord.get(w) ?? 0) + 1);
    // latin1 decoding is one char per byte, so the index IS the UTF-8 byte offset
    out.push({ word: w, line, from: m.index, to: m.index + m[0].length });
  }
  return out;
}

/**
 * LOOK. Pure over an index. Returns the places the ask points at, with their bytes.
 * `limit` bounds the candidates shown (the ranking itself is complete).
 */
export function look({ index, ask, limit = 20, matchesPer = 3 } = {}) {
  const seeds = seedsOf(ask);
  const named = askNamed(seeds.fragments, index.allPaths, index.dirs);
  const ranked = index.rank(seeds.words);
  const byPath = new Map(index.files.map((f) => [f.path, f]));
  const candidates = [];
  const seen = new Set();
  for (const p of named) {
    if (seen.has(p)) continue;
    seen.add(p);
    const f = byPath.get(p);
    candidates.push({ path: p, named: true, score: null, hits: null, matches: f ? matchesIn(f.bytes, seeds.words, { max: matchesPer }) : [] });
  }
  for (const r of ranked) {
    if (candidates.length >= limit) break;
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    candidates.push({ path: r.path, named: false, score: r.score, hits: r.hits, matches: matchesIn(byPath.get(r.path).bytes, seeds.words, { max: matchesPer }) });
  }
  const gaps = [];
  if (!seeds.words.length) gaps.push({ kind: "no-seed-words", why: "the ask has no word to look for" });
  else if (!named.length && !ranked.length) gaps.push({ kind: "nothing-found", why: "no word of the ask appears in any file of this tree" });
  return { schema: LOOK_SCHEMA, seeds, named, candidates, shown: candidates.length, ofRanked: ranked.length, N: index.N, gaps };
}

/** IO edge: every tracked or untracked-not-ignored file of a worktree, via git (read-only). */
export function indexWorktree(root, { codeExt = CODE_EXT, maxFileBytes = 2 * 1024 * 1024, limit = 60000 } = {}) {
  const r = spawnSync("git", ["-C", root, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "buffer", maxBuffer: 1 << 28 });
  if (r.status !== 0) return { gap: "not-a-git-worktree", why: String(r.stderr || "").slice(0, 120) };
  const allPaths = [...new Set(r.stdout.toString("utf8").split("\0").filter(Boolean))].slice(0, limit);
  const ext = new Set(codeExt);
  const files = [];
  for (const p of allPaths) {
    if (!ext.has(extOf(p))) continue;
    try {
      const abs = path.join(root, p);
      const st = fs.lstatSync(abs);
      if (!st.isFile() || st.size > maxFileBytes) continue;
      files.push({ path: p, bytes: fs.readFileSync(abs) });
    } catch { /* a path that vanished between ls-files and the read is simply not in the index */ }
  }
  return buildIndex(files, { allPaths, codeExt });
}
