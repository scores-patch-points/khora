// lex_js.mjs -- ant-code: JavaScript source -> units of lexical tokens with PARSER GOLD (acorn 8.x, already on the machine; no install).
// usage: node lex_js.mjs FILE > file.json   -- same JSON shape as lex_py.py: {file, lang, units, cls, decl, raw}
// Gold classes per token: U user identifier (name bound in this file: var/let/const/function/class/param/catch/method/class-field/object-property key/
// this.x = ... target), E external (imported, built-in global, property of something external, free name), K keyword (incl. true/false/null/this and the
// contextual of/async/await/static/get/set/from/as/yield/let), L literal (number -> 'n'+alnum; string/template/regex -> 's'+7 hex), P operator/punct,
// A ambiguous (bound here AND imported/global, or one lowercase form in two classes): excluded from every class by the harness.
// decl=1 marks a BINDING occurrence. Units: split at ; { } ${ and at newlines when the bracket depth inside the current brace level is 0.
import fs from "node:fs";
import * as acorn from "/Users/mlacy/Documents/jupyter/node_modules/acorn/dist/acorn.mjs";

const fnv = (s) => { let h = 2166136261; for (const b of Buffer.from(s, "utf8")) { h ^= b; h = Math.imul(h, 16777619) >>> 0; } return (h & 0xfffffff).toString(16).padStart(7, "0"); };
const encName = (t) => (/^[\x00-\x7f]*$/.test(t) ? t.toLowerCase().replace(/[^a-z0-9]/g, "z") : t.toLowerCase());
const CONTEXTUAL = new Set(["of", "async", "await", "static", "get", "set", "from", "as", "yield", "let"]);
const GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis), "require", "module", "exports", "__dirname", "__filename", "console", "process", "Buffer", "undefined", "NaN", "Infinity"].map((x) => x.toLowerCase()));

function parse(src) {
  const tokens = [], base = { ecmaVersion: "latest", locations: false, allowHashBang: true, allowReturnOutsideFunction: true, onToken: tokens, allowAwaitOutsideFunction: true };
  try { tokens.length = 0; return { ast: acorn.parse(src, { ...base, sourceType: "module" }), tokens }; } catch (e1) {
    try { tokens.length = 0; return { ast: acorn.parse(src, { ...base, sourceType: "script" }), tokens }; } catch (e2) { throw new Error(`parse failed: ${e1.message} | ${e2.message}`); }
  }
}
function patternNames(p, out) { // binding identifiers of a pattern
  if (!p) return;
  switch (p.type) {
    case "Identifier": out.push(p); break;
    case "ObjectPattern": for (const q of p.properties) patternNames(q.type === "RestElement" ? q.argument : q.value, out); break;
    case "ArrayPattern": for (const q of p.elements) patternNames(q, out); break;
    case "RestElement": patternNames(p.argument, out); break;
    case "AssignmentPattern": patternNames(p.left, out); break;
    default: break;
  }
}
function collect(ast) {
  const bind = [], imported = [];
  const walk = (n) => {
    if (!n || typeof n.type !== "string") return;
    switch (n.type) {
      case "VariableDeclarator": patternNames(n.id, bind); break;
      case "FunctionDeclaration": case "FunctionExpression": case "ArrowFunctionExpression":
        if (n.id) bind.push(n.id); for (const p of n.params) patternNames(p, bind); break;
      case "ClassDeclaration": case "ClassExpression": if (n.id) bind.push(n.id); break;
      case "CatchClause": patternNames(n.param, bind); break;
      case "MethodDefinition": case "PropertyDefinition": if (!n.computed && n.key.type === "Identifier") bind.push(n.key); break;
      case "ObjectPattern": for (const q of n.properties) q.__pat = true; break;
      case "Property": if (!n.__pat && !n.computed && n.key.type === "Identifier" && !n.shorthand) bind.push(n.key); break;
      case "AssignmentExpression": if (n.left.type === "MemberExpression" && n.left.object.type === "ThisExpression" && !n.left.computed && n.left.property.type === "Identifier") bind.push(n.left.property); break;
      case "ImportSpecifier": case "ImportDefaultSpecifier": case "ImportNamespaceSpecifier": imported.push(n.local); break;
      default: break;
    }
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v); }
  };
  walk(ast);
  return { bind, imported };
}
export function lexJs(file) {
  const src = fs.readFileSync(file, "utf8");
  const { ast, tokens } = parse(src);
  const { bind, imported } = collect(ast);
  const bstart = new Set(bind.map((n) => n.start)), bnames = new Set(bind.map((n) => n.name.toLowerCase()));
  const inames = new Set(imported.map((n) => n.name.toLowerCase()));
  // a `require` destructure/assign is a plain binding here (user); imports are only ES import specifiers
  const units = []; let cur = { f: [], c: [], d: [], r: [] }; const stack = []; let depth = 0;
  const flush = () => { if (cur.f.length) units.push(cur); cur = { f: [], c: [], d: [], r: [] }; };
  const add = (f, c, d, r) => { cur.f.push(f); cur.c.push(c); cur.d.push(d); cur.r.push(r); };
  let prevEnd = 0, prevLab = null;
  const lineOf = (pos) => { let n = 0; for (let i = prevEnd; i < pos; i++) if (src.charCodeAt(i) === 10) n++; return n; };
  for (const t of tokens) {
    if (t.type.label === "eof") break;
    const nl = lineOf(t.start); prevEnd = t.start;
    if (nl > 0 && depth === 0) flush();
    let lab = t.type.label; const text = src.slice(t.start, t.end);
    const afterDot = prevLab === "." || prevLab === "?.";
    if (afterDot) { if (/^[\p{L}$_][\p{L}\p{N}$_]*$/u.test(text)) lab = "name"; }
    prevLab = t.type.label;
    if (lab === "name" || lab === "privateId") {
      const low = text.toLowerCase().replace(/^#/, "");
      if (CONTEXTUAL.has(text) && !bnames.has(low) && t.type.label === "name" && !afterDot) { add(low, "K", 0, text); }
      else if (GLOBALS.has(low) && bnames.has(low) || inames.has(low) && bnames.has(low)) add(encName(low), "A", 0, text);
      else if (bnames.has(low)) add(encName(low), "U", bstart.has(t.start) ? 1 : 0, text);
      else add(encName(low), "E", 0, text);
    } else if (t.type.keyword || lab === "true" || lab === "false" || lab === "null" || lab === "this" || lab === "super") add(text.toLowerCase(), "K", 0, text);
    else if (lab === "num" || lab === "bigint") add("n" + text.toLowerCase().replace(/[^a-z0-9]/g, ""), "L", 0, text);
    else if (lab === "string" || lab === "regexp" || lab === "template" || lab === "invalidTemplate") add("s" + fnv(text), "L", 0, text.slice(0, 20));
    else {
      add(text, "P", 0, text);
      if (lab === "{" || lab === "${") { stack.push(depth); depth = 0; flush(); }
      else if (lab === "}") { flush(); depth = stack.length ? stack.pop() : 0; }
      else if (lab === "(" || lab === "[") depth += 1;
      else if (lab === ")" || lab === "]") depth = Math.max(0, depth - 1);
      else if (lab === ";" && depth === 0) flush();
    }
  }
  flush();
  const byform = new Map();
  for (const u of units) u.f.forEach((f, k) => { if (u.c[k] !== "P") (byform.get(f) ?? byform.set(f, new Set()).get(f)).add(u.c[k]); });
  const bad = new Set([...byform].filter(([, s]) => [...s].filter((x) => x !== "A").length > 1).map(([f]) => f));
  return { file, lang: "js", units: units.map((u) => u.f), cls: units.map((u) => u.c.map((c, k) => (c !== "P" && bad.has(u.f[k]) ? "A" : c))), decl: units.map((u) => u.d), raw: units.map((u) => u.r), nBound: bnames.size, nImported: inames.size };
}
if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(JSON.stringify(lexJs(process.argv[2])));
