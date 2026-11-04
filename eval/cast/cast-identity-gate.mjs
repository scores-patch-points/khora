// G1 — the no-lists gate for the cast-identity pass (PREREG-CAST-A1.md). Earned, never typed: this scans the new code for a list of words.
//   node eval/cast/cast-identity-gate.mjs [file ...]        exit 1 when any file holds
//     - an array literal (a `new Set([...])` included) with five or more string-literal elements, or
//     - a regular expression or a string with an alternation of five or more plain words (a|b|c|d|e), or
//     - an object literal with five or more string-literal values.
// It reads only code: comments are skipped. The default scope is the pass itself and the lines this branch added to read-core.mjs
// (read-core.mjs has older tables of its own, which are not this branch's).
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { execFileSync } from "node:child_process";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const BASE = "15f82fcd";
const explicit = process.argv.slice(2);
const sources = explicit.length ? explicit.map((f) => ({ name: f, src: fs.readFileSync(f, "utf8") })) : [
  { name: "native/organs/cast-identity.js", src: fs.readFileSync(path.join(root, "native/organs/cast-identity.js"), "utf8") },
  { name: "native/the-fold/read-core.mjs (added lines)", src: execFileSync("git", ["-C", root, "diff", "-U0", BASE, "--", "native/the-fold/read-core.mjs"], { encoding: "utf8" }).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1)).join("\n") },
];

export function scanSource(src) {
  const hits = []; const stack = []; let i = 0, line = 1, prevSig = "";
  const push = (kind) => stack.push({ kind, strings: 0, line, items: 0 });
  const closeTop = () => { const t = stack.pop(); if (t && t.strings >= 5) hits.push({ line: t.line, what: `${t.kind === "[" ? "array" : "object"} of ${t.strings} string literals` }); };
  const alt = (body, ln) => { for (const m of body.matchAll(/\(\??:?([A-Za-z]{2,}(?:\|[A-Za-z]{2,}){4,})\)/g)) hits.push({ line: ln, what: `alternation of ${m[1].split("|").length} plain words` }); };
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") { line++; i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c, start = i, ln = line; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; if (src[i] === "\n") line++; i++; }
      i++; const body = src.slice(start + 1, i - 1);
      if (q !== "`") { const top = stack[stack.length - 1]; if (top && (prevSig === "[" || prevSig === "," || prevSig === ":")) top.strings++; }
      alt(body, ln); prevSig = "s"; continue;
    }
    if (c === "/" && /[(,=:[!&|?{};]|^$/.test(prevSig) ) {
      const ln = line; let j = i + 1, cls = false;
      while (j < src.length && (src[j] !== "/" || cls)) { if (src[j] === "\\") j++; else if (src[j] === "[") cls = true; else if (src[j] === "]") cls = false; j++; }
      alt(src.slice(i + 1, j), ln); i = j + 1; while (/[a-z]/.test(src[i] ?? "")) i++; prevSig = "r"; continue;
    }
    if (c === "[" || c === "{") { push(c); prevSig = c; i++; continue; }
    if (c === "]" || c === "}") { closeTop(); prevSig = c; i++; continue; }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return hits;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let bad = 0;
  for (const f of sources) { const hits = scanSource(f.src); for (const h of hits) { bad++; console.log(`${f.name}:${h.line}  ${h.what}`); } }
  console.log(bad ? `G1 FAIL: ${bad} list(s)` : `G1 PASS: no list of five or more string literals in ${sources.length} source(s): ${sources.map((f) => f.name).join(", ")}`);
  process.exit(bad ? 1 : 0);
}
