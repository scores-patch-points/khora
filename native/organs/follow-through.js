// organs/follow-through.js — FINISH: the support a first move implies (imports, stubs), as snippets with their anchor.
// Cell: SYN · Figure → Generate / Structure / Link / Making (kernel/cube.js cellOf). A call the move added is a figure
// that needs a link to where its callee lives; this organ makes that link, or a declaration for it.
//
// WHY THIS ORGAN EXISTS (CENNINI.md, "the movement": Finish). It is the follow-through arm cli/apprentice-mover.mjs
// graded on Claude Code's own history: on 1,179 in-scope edits where the master also wrote imports or declarations,
// these proposals matched the master's at signed-edge Jaccard 0.360 against 0.010 for the same unconscious fed another
// edit's calls (paired sign-flip, p = 0.001, the draw floor). The grade travels here by EQUIVALENCE
// (tests/follow-through.test.js against that instrument's `propose` + `assemble`), never by re-measurement.
//
// THE ALGORITHM, exactly the graded arm (the instrument's FULL configuration minus the ambient lesson, which was noticed,
// not learned: Δ +0.001, p = 0.61):
//   seed      the callees whose call count rises from `before` to `after` (readEdges)
//   names     missingImports(after) minus missingImports(before): what the move left unbound
//   callee    keep only names the seed calls (missingImports also flags params and locals it cannot bind)
//   world     a name resolves to an import from the files the session holds: an exported declaration in another file
//             (most recent wins), else the binding other files use most (ties by target); a specifier `after` already
//             imports is an EXTEND, no new statement
//   lesson    else `lessons.binding(name)`: where earlier sessions got the name (the one admitted lesson, Δ +0.018,
//             p = 0.001)
//   stub      else synthesizeStub(name, callArityOf arity)
//   anchor    every snippet goes at importAnchor(after), snapped to a line start: imports first, then stubs
//
// THE STUB GUARD (the one change from the graded arm, each a typed gap that names the stub it withheld, so the
// equivalence test can prove the rest is unchanged). The graded stub arm was measurably WRONG where the master wrote no
// support at all (−0.030, p = 0.001): it declared names the master left alone. A stub is never synthesised for
//   not-called-by-seed  a name the move does not call (the callee filter, kept as a gap so nothing is silent)
//   declared-in-file    a name the reader already sees declared somewhere in `after` (an inner function, an arrow
//                       const): missingImports reads top-level declarations only
//   runtime-global      a JavaScript name the running engine's own global object holds (parseInt, fetch, structuredClone):
//                       the runtime is the giver; the repo has no builtins prior and none is typed by hand here
// A snippet carrying a Goffman finding is withheld (`withheld:pii:<category>`), fail-closed.
//
// WHAT IT DOES NOT DO. No search (the world is what the caller says the session holds; Look finds places). No lesson
// but the binding lesson. Additions only: a call the move removed is a typed gap `removal-not-followed`, never an
// unused-import cleanup (mechanical.js has no organ for it). Python specifiers are never synthesised from a file path.
// No model, no network, nothing written.
import path from "node:path";
import { piiFindings } from "./goffman.js";
import { missingImports, synthesizeStub, importAnchor, callArityOf } from "../adapters/code/mechanical.js";
import { readEdges, keywordsFor, resolveLanguage } from "../adapters/code/edges.js";

export const FINISH_SCHEMA = "FollowThrough@1";

const kwOf = (language) => keywordsFor(language)?.keywords ?? null;
const readOf = (text, language, file) => readEdges({ text, language, fileName: file, keywords: kwOf(language) });
const lineStart = (t, i) => t.lastIndexOf("\n", i - 1) + 1;
const lineEndAfter = (t, i) => { const k = t.indexOf("\n", i); return k === -1 ? t.length : k + 1; };
const countBy = (list, keyOf) => { const m = new Map(); for (const e of list) { const k = keyOf(e); m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const missingSet = (text, file, language) => new Set(missingImports(text, file, { keywords: kwOf(language) }).map((m) => m.name));

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

// ── where a name comes from: roots, targets, specifiers, bindings ──
/** with a scope ({ in: RegExp[] }), a path's root is its last in-scope segment (plus a .claude/worktrees/<name> below it) */
export function rootOf(p, scope) {
  if (!scope?.in) return null;
  const segs = String(p ?? "").split("/");
  let i = -1, fam = -1;
  for (let k = 0; k < segs.length - 1; k++) { const f = scope.in.findIndex((r) => r.test(segs[k])); if (f !== -1) { i = k; fam = f; } }
  if (i === -1) return null;
  let j = i;
  if (segs[i + 1] === ".claude" && segs[i + 2] === "worktrees" && segs.length > i + 4) j = i + 3;
  return { root: segs.slice(0, j + 1).join("/"), family: fam, tail: segs.slice(j + 1).join("/") };
}

/** a target: "bare:<spec>", "tail:<family>:<path below the root>" (with a scope) or "abs:<path>" (without one) */
export function targetOf(spec, fromFile, scope = null) {
  const s = String(spec ?? "");
  if (!s) return null;
  if (!s.startsWith(".") && !s.startsWith("/")) return `bare:${s}`;
  const abs = s.startsWith("/") ? s : path.posix.resolve(path.posix.dirname(fromFile), s);
  if (!scope) return `abs:${abs}`;
  const r = rootOf(abs, scope);
  return r ? `tail:${r.family}:${r.tail}` : null;
}

/** the specifier `file` would write for `target` (null: unresolvable, e.g. a Python file path) */
export function specFor(file, target, scope = null, language = null) {
  if (!target) return null;
  if (target.startsWith("bare:")) return target.slice(5);
  if (language === "python") return null;
  let abs;
  if (target.startsWith("abs:")) abs = target.slice(4);
  else {
    const [, fam, ...rest] = target.split(":");
    const r = rootOf(file, scope);
    if (!r || String(r.family) !== fam) return null;
    abs = `${r.root}/${rest.join(":")}`;
  }
  let rel = path.posix.relative(path.posix.dirname(file), abs);
  if (!rel.startsWith("../")) rel = `./${rel}`;
  return rel;
}

const JS_IDENT = "[A-Za-z_$][\\w$]*";
/** the local names one import statement binds (small regexes over the statement the reader located; disclosed) */
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
  if (/^\s*export\b/.test(s) && !/^\s*export\s+(default\s+)?(const|let|var|function|class)/.test(s)) return out;
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
export function offersOf(text, file, scope = null) {
  const language = resolveLanguage(null, file);
  if (!language) return [];
  // a path with no leading "/" would read as a BARE package specifier (targetOf), so it offers nothing: an
  // unresolved name is a gap, never a wrong "import { x } from 'x.mjs'" (found by the first assembled run, 2026-10-13)
  if (!path.isAbsolute(String(file ?? ""))) return [];
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

/**
 * a resolver over the files the session holds: [{ path, text, ts? }] (or a Map path → text | { text, ts }), in the
 * order the session came to hold them. resolve(name, fromFile) → target | null.
 */
export function worldOf(files, scope = null) {
  const list = files instanceof Map ? [...files].map(([p, v]) => (typeof v === "string" ? { path: p, text: v, ts: null } : { path: p, ...v })) : [...(files ?? [])];
  const offered = list.map((f) => ({ path: f.path, ts: f.ts ?? null, offers: offersOf(f.text, f.path, scope) }));
  return {
    resolve(name, fromFile) {
      let decl = null;
      const binds = new Map();
      for (const c of offered) {
        if (c.path === fromFile) continue;
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
    },
  };
}

export const importSnippet = (name, spec, language) => (language === "python" ? `from ${spec} import ${name}\n` : `import { ${name} } from "${spec}";\n`);
const arityOf = (text, file, name) => { const a = callArityOf(text, file, name).arities; return a.length ? Math.max(...a) : 0; };

/** where every snippet goes: importAnchor(after), snapped forward to a line start */
export function anchorOf(after) {
  const an = importAnchor(after);
  let a = an.index;
  if (a > 0 && after[a - 1] !== "\n") { const k = after.indexOf("\n", a); a = k === -1 ? after.length : k + 1; }
  return { index: a, byte: Buffer.byteLength(after.slice(0, a), "utf8"), basis: an.basis };
}

/**
 * finish({ before, after, file, world, lessons, scope }) → { schema, language, seed, proposals, gaps }
 *   world    files the session holds ([{ path, text, ts }] / Map) or a resolver { resolve(name, file) → target }
 *   lessons  { binding(name) → target | null } (earlier sessions only; the caller keeps it prequential)
 *   scope    optional { in: RegExp[] }: targets are read below an in-scope root, so a worktree and its checkout agree
 * proposals: [{ kind: "import"|"extend"|"stub", name, spec?, via?, arity?, snippet, anchor }] (an extend has no snippet)
 * gaps: typed; a gap that withholds a proposal carries `would` (the proposal it withheld)
 */
export function finish({ before = "", after = "", file, world = null, lessons = null, scope = null } = {}) {
  const language = resolveLanguage(null, file);
  if (!language) return { schema: FINISH_SCHEMA, language: null, seed: [], proposals: [], gaps: [{ kind: "no-reader", ext: path.extname(String(file ?? "")) || "(none)" }] };
  // specifiers are computed from ABSOLUTE paths (the graded instrument always had them); a relative path is refused
  // with a typed gap, because it would be read as a bare package and produce an import that cannot resolve
  if (!path.isAbsolute(String(file ?? ""))) return { schema: FINISH_SCHEMA, language, seed: [], proposals: [], gaps: [{ kind: "path-not-absolute", file: String(file ?? ""), why: "a relative path reads as a bare package specifier; pass the absolute path" }] };
  const rB = readOf(before, language, file), rA = readOf(after, language, file);
  if (rB.disclosure?.error || rA.disclosure?.error) return { schema: FINISH_SCHEMA, language, seed: [], proposals: [], gaps: [{ kind: "reader-error" }] };
  const gaps = [];
  const cB = countBy(rB.calls, (c) => String(c.callee)), cA = countBy(rA.calls, (c) => String(c.callee));
  const seed = [...cA].filter(([k, n]) => n > (cB.get(k) ?? 0)).map(([k]) => k).sort();
  const removed = [...cB].filter(([k, n]) => n > (cA.get(k) ?? 0)).map(([k]) => k).sort();
  if (removed.length) gaps.push({ kind: "removal-not-followed", names: removed });
  const worldList = world instanceof Map ? [...world.keys()] : Array.isArray(world) ? world.map((f) => f?.path) : [];
  const relWorld = worldList.filter((p) => !path.isAbsolute(String(p ?? "")));
  if (relWorld.length) gaps.push({ kind: "world-path-not-absolute", count: relWorld.length, why: "those files offer nothing: a relative path reads as a bare package specifier" });
  const resolver = !world ? null : typeof world.resolve === "function" ? world : worldOf(world, scope);
  const beforeMissing = missingSet(before, file, language);
  const missing = [...missingSet(after, file, language)].filter((n) => !beforeMissing.has(n)).sort();
  const seedSet = new Set(seed);
  const uncalled = missing.filter((n) => !seedSet.has(n));
  if (uncalled.length) gaps.push({ kind: "not-called-by-seed", names: uncalled });
  const names = missing.filter((n) => seedSet.has(n));
  const imported = new Set(rA.imports.map((e) => String(e.module)));
  const declaredHere = new Set(rA.declared.map((d) => String(d.name)));
  const anchor = anchorOf(after);
  const proposals = [];
  const emit = (p) => {
    const cats = p.snippet ? Object.keys(piiFindings(p.snippet).counts) : [];
    if (cats.length) { gaps.push({ kind: `withheld:pii:${cats.sort()[0]}`, would: { kind: p.kind, name: p.name } }); return; }
    proposals.push(p);
  };
  for (const n of names) {
    let spec = null, via = null;
    const wt = resolver ? resolver.resolve(n, file) : null;
    if (wt) { spec = specFor(file, wt, scope, language); via = "world"; if (!spec && language === "python") gaps.push({ kind: "python-specifier-not-synthesised", name: n }); }
    if (!spec && lessons?.binding) { const t = lessons.binding(n); if (t) { spec = specFor(file, t, scope, language); via = "lesson"; } }
    if (spec) {
      if (imported.has(spec)) { proposals.push({ kind: "extend", name: n, spec, via, snippet: null, anchor: null }); continue; }
      emit({ kind: "import", name: n, spec, via, snippet: importSnippet(n, spec, language), anchor });
      continue;
    }
    const arity = arityOf(after, file, n);
    const would = { kind: "stub", name: n, arity };
    if (declaredHere.has(n)) { gaps.push({ kind: "declared-in-file", name: n, would }); continue; }
    if (language === "javascript" && Object.prototype.hasOwnProperty.call(globalThis, n)) { gaps.push({ kind: "runtime-global", name: n, would }); continue; }
    const st = synthesizeStub({ name: n, arity, language, keywords: kwOf(language) });
    if (!st.ok) { gaps.push({ kind: `stub-refused:${st.gap.kind}`, name: n }); continue; }
    emit({ kind: "stub", name: n, arity, snippet: st.add, anchor });
  }
  return { schema: FINISH_SCHEMA, language, seed, proposals, gaps };
}

/** `after` with the proposals applied at their anchor: imports, then stubs (each separated by a blank line) */
export function applyFinish(after, proposals) {
  const ps = proposals.filter((p) => p.snippet);
  if (!ps.length) return after;
  const a = ps[0].anchor.index;
  const imports = ps.filter((p) => p.kind === "import").map((p) => p.snippet).join("");
  const stubs = ps.filter((p) => p.kind === "stub").map((p) => p.snippet).join("\n\n");
  return after.slice(0, a) + imports + (stubs ? `${stubs}\n\n` : "") + after.slice(a);
}
