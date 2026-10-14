// organs/lenient-receive.js — receive a patch the door's grammar refuses, by the declaration it names (2026-10-13).
// Cell: CON · Figure → Relate / Structure / Link (kernel/cube.js cellOf). A block of code that names a declaration is a
// figure that needs a link to the place the declaration lives; this organ makes that link or says why it cannot.
//
// WHY THIS ORGAN EXISTS (CENNINI.md, the first assembled run). The door's patch grammar needs a <<<FIND>>> anchor
// (code-loop.js PATCH_RE). A small local mouth, shown a stub, wrote the right function under `<<<ADD>>>` with no FIND:
// the whole answer was refused as `unparsed_proposal` and the correct body was lost to a format error (cart.mjs
// formatTotal, gemma2:2b, 2026-10-13). The doctrine is to widen the mechanical receiver, never to ask the model
// harder. This is the narrowest widening: an ADD-only block is anchored by the declaration it states.
//
// WHAT IT ACCEPTS. `<<<ADD>>> … <<<END>>>` (END or end of text), an optional `PATH:` line that must name the located
// file, an optional ``` fence around the body, and NO <<<FIND>>> (a FIND is the door's own grammar and stays the door's).
// The body's top-level declarations (parseDeclarations, the file's own syntax) are the anchor:
//   same name as a top-level declaration in `before`  -> that declaration's span is replaced (the stub, the old body)
//   a name `before` does not declare                  -> appended at the end of the file
// Import lines in the body that `before` does not already hold go to the top. Anything else outside a declaration is a
// typed gap (`undeclared-text`), never silently kept or dropped.
//
// CARRY (off by default). `carryExport: true` keeps a replaced declaration exported when the answer drops `export`. Re-scored
// offline on all 24 stored live draws, on and off: 0 draws changed (the one failure that dropped `export` also had a wrong
// body), so by the lesson rule it is not admitted; it stays a switch and a test until a draw needs it.
//
// WHAT IT DOES NOT DO. No model, no network, nothing written, no test run. It does not decide whether the result is
// RIGHT; the test does. It never replaces more than the spans the body's own declarations name, and a name declared
// twice in `before` is a typed gap (`ambiguous-name`), never a pick.
import path from "node:path";
import { parseDeclarations } from "../adapters/text/code-structure.js";

export const RECEIVE_SCHEMA = "EOLenientReceive@1";

const FIND_RE = /<<<FIND>>>/i;
const ADD_RE = /<<<ADD>>>[ \t]*\n([\s\S]*?)(?:\n[ \t]*<<<END>>>|$)/i;
const PATH_RE = /^[ \t]*PATH:[ \t]*(\S+)[ \t]*$/im;
const FENCE_LINE = /^[ \t]*```[\w.+-]*[ \t]*$/;
const IMPORT_LINE = /^\s*(import\s|(?:const|let|var)\s+[\w{},\s*]+=\s*require\()/;
const COMMENT_LINE = /^\s*(\/\/|#|\/\*|\*)/;
const EXPORT_PREFIX = /^\s*export\s+(?:default\s+)?/;

const gap = (kind, reason, extra = {}) => ({ ok: false, schema: RECEIVE_SCHEMA, gap: { kind, reason, ...extra } });

/** the top-level declarations: those not contained in another declaration's span */
const topLevel = (decls) => decls.filter((d) => !decls.some((o) => o !== d && o.start <= d.start && d.end <= o.end && (o.start < d.start || d.end < o.end)));

const unfence = (body) => {
  const lines = body.split("\n");
  while (lines.length && FENCE_LINE.test(lines[0])) lines.shift();
  while (lines.length && (FENCE_LINE.test(lines[lines.length - 1]) || lines[lines.length - 1].trim() === "")) lines.pop();
  return lines.join("\n");
};

/**
 * receive({ text, before, file }) -> { ok:true, after, replaced, added, imports, via } | { ok:false, gap:{kind,reason} }
 * `text` is the model's answer; `before` the located file's current bytes; `file` its path (extension picks the syntax).
 */
export function receive({ text, before, file, carryExport = false } = {}) {
  if (typeof before !== "string" || !file) return gap("no-file", "no located file bytes to anchor against");
  const raw = String(text ?? "");
  if (FIND_RE.test(raw)) return gap("has-find", "the answer carries a <<<FIND>>> anchor; that grammar is the door's own");
  const m = ADD_RE.exec(raw);
  if (!m) return gap("no-add-block", "the answer has no <<<ADD>>> block");
  const named = PATH_RE.exec(raw.slice(0, m.index));
  if (named && path.basename(named[1]) !== path.basename(file)) {
    return gap("path-not-file", `the block names ${named[1]}, the located file is ${path.basename(file)}`);
  }
  const body = unfence(m[1]);
  if (!body.trim()) return gap("empty-block", "the <<<ADD>>> block is empty");

  const added = topLevel(parseDeclarations(body, file));
  if (!added.length) return gap("no-declaration", "the block states no declaration to anchor by");
  const there = topLevel(parseDeclarations(before, file));

  // text outside every declaration: imports go to the top; comments are skipped; the rest is refused
  const outside = [];
  let at = 0;
  for (const d of [...added].sort((a, b) => a.start - b.start)) { outside.push(body.slice(at, d.start)); at = Math.max(at, d.end); }
  outside.push(body.slice(at));
  const imports = [];
  for (const line of outside.join("\n").split("\n")) {
    if (!line.trim() || COMMENT_LINE.test(line)) continue;
    if (IMPORT_LINE.test(line)) { imports.push(line.trim()); continue; }
    return gap("undeclared-text", "the block holds code outside any declaration that is not an import", { line: line.trim().slice(0, 120) });
  }

  const edits = [], fresh = [], replaced = [], appended = [], carried = [];
  for (const d of added) {
    const hits = there.filter((b) => b.name === d.name);
    if (hits.length > 1) return gap("ambiguous-name", `${d.name} is declared ${hits.length} times in the file`, { name: d.name });
    const snippet = body.slice(d.start, d.end);
    if (hits.length === 1) {
      // THE FILE'S SURFACE IS GROUND: a replaced declaration the file exports stays exported (the mouth often drops `export`)
      const was = EXPORT_PREFIX.exec(before.slice(hits[0].start, hits[0].end));
      const carry = carryExport && was && !/^\s*export\b/.test(snippet);
      edits.push({ start: hits[0].start, end: hits[0].end, snippet: carry ? was[0] + snippet.replace(/^\s+/, "") : snippet });
      if (carry) carried.push(`export:${d.name}`);
      replaced.push(d.name);
    }
    else { fresh.push(snippet); appended.push(d.name); }
  }
  let after = before;
  for (const e of edits.sort((a, b) => b.start - a.start)) after = after.slice(0, e.start) + e.snippet + after.slice(e.end);
  if (fresh.length) after = after.replace(/\n*$/, "\n") + "\n" + fresh.join("\n\n") + "\n";
  const held = new Set(before.split("\n").map((l) => l.trim()));
  const newImports = [...new Set(imports)].filter((l) => !held.has(l));
  if (newImports.length) after = newImports.join("\n") + "\n" + after;
  if (after === before) return gap("no-change", "the block reproduces the file's bytes");
  return { ok: true, schema: RECEIVE_SCHEMA, after, replaced, added: appended, imports: newImports, carried, via: "add-only" };
}
