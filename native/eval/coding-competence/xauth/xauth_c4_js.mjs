// xauth_c4_js.mjs: acorn (the ECMAScript parser bundled inside Node) as an independent authority for the C4 edges of a javascript
// file: calls (caller, callee), imports, inheritance. Used only by eval/coding-competence/xauth-c4-edges.mjs.
// Run:   node --expose-internals eval/coding-competence/xauth/xauth_c4_js.mjs      (the flag only exposes Node's own bundled copy)
// stdin: JSON list of file paths. stdout: JSON {path: {calls:[[caller,callee]], imports:[...], extends:[[child,base]]} | {error}}.
// A file acorn rejects (JSX, TypeScript, Flow, decorators, a syntax error) is a typed per-file error, never a guess.
//
// Edge definitions (declared in xauth-c4-edges.mjs amendment X0; the SAME syntactic rules c4-edges.mjs states for the gold):
//   calls    CallExpression with an Identifier callee (name) or a non-computed MemberExpression callee (property name, a private
//            `#x` keeps its `#`), seen through optional chaining; TaggedTemplateExpression with such a tag. NOT calls: new X(),
//            super(...), unnamed callees (call results, sequences, functions, computed members), and require("literal") /
//            import("literal"), which are imports.
//            caller = innermost enclosing NAMED scope: FunctionDeclaration id; MethodDefinition key (a constructor, and a
//            class-field initializer, belong to the class); ClassDeclaration id (heritage, fields, computed keys belong to it);
//            a function/arrow VALUE named by what it is assigned to (VariableDeclarator id, assignment left Identifier or final
//            property, object Property key) or by its own id; `<top>` otherwise. A ClassExpression is not a named scope.
//   imports  ImportDeclaration / ExportNamedDeclaration / ExportAllDeclaration source, ImportExpression and require() with a
//            string literal.
//   extends  ClassDeclaration with an Identifier / non-computed MemberExpression superClass (final name). Class expressions are
//            values and are not read.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const acorn = require("internal/deps/acorn/acorn/dist/acorn");

const OPTS = { ecmaVersion: "latest", allowHashBang: true, allowReturnOutsideFunction: true, locations: false };

function parse(src) {
  try { return acorn.parse(src, { ...OPTS, sourceType: "module", allowAwaitOutsideFunction: true }); } catch (e1) {
    try { return acorn.parse(src, { ...OPTS, sourceType: "script", allowAwaitOutsideFunction: true }); } catch (e2) { throw e1; }
  }
}

const keyName = (k, computed) => {
  if (computed) return null;
  if (k.type === "Identifier") return k.name;
  if (k.type === "Literal" && typeof k.value === "string") return k.value;
  if (k.type === "PrivateIdentifier") return `#${k.name}`;
  return null;
};
const strLit = (n) => (n && n.type === "Literal" && typeof n.value === "string" ? n.value : null);

function nameOfValue(parent, node) {
  // a function / arrow VALUE named by what it is assigned to
  if (!parent) return null;
  if (parent.type === "VariableDeclarator" && parent.init === node && parent.id.type === "Identifier") return parent.id.name;
  if (parent.type === "AssignmentExpression" && parent.right === node && parent.operator === "=") {
    const l = parent.left;
    if (l.type === "Identifier") return l.name;
    if (l.type === "MemberExpression" && !l.computed && l.property.type === "Identifier") return l.property.name;
  }
  if (parent.type === "Property" && parent.value === node) { const k = keyName(parent.key, parent.computed); if (k && parent.key.type !== "PrivateIdentifier") return k; }
  return null;
}

function run(path) {
  const src = fs.readFileSync(path, "utf8");
  const ast = parse(src);
  const calls = [], imports = [], ext = [];
  const callers = ["<top>"];
  const calleeOf = (c) => {
    let f = c;
    while (f && (f.type === "ChainExpression" || f.type === "ParenthesizedExpression")) f = f.expression;
    if (!f) return null;
    if (f.type === "Identifier") return f.name;
    if (f.type === "MemberExpression" && !f.computed) return f.property.type === "PrivateIdentifier" ? `#${f.property.name}` : f.property.name;
    return null;
  };
  function visit(node, parent) {
    if (!node || typeof node.type !== "string") return;
    let pushed = false;
    const push = (name) => { if (name) { callers.push(name); pushed = true; } };
    switch (node.type) {
      case "FunctionDeclaration": push(node.id && node.id.name); break;
      case "FunctionExpression": case "ArrowFunctionExpression": push((node.type === "FunctionExpression" && node.id && node.id.name) || nameOfValue(parent, node)); break;
      case "ClassDeclaration":
        push(node.id && node.id.name);
        if (node.id && node.superClass) {
          const s = node.superClass;
          if (s.type === "Identifier") ext.push([node.id.name, s.name]);
          else if (s.type === "MemberExpression" && !s.computed && s.property.type === "Identifier") ext.push([node.id.name, s.property.name]);
        }
        break;
      case "MethodDefinition": {
        const k = keyName(node.key, node.computed);
        if (node.kind !== "constructor" && k) push(k);
        break;
      }
      case "ImportDeclaration": case "ExportAllDeclaration": case "ExportNamedDeclaration": { const m = strLit(node.source); if (m !== null) imports.push(m); break; }
      case "ImportExpression": { const m = strLit(node.source); if (m !== null) imports.push(m); break; }
      case "CallExpression": {
        const c = node.callee;
        const isReq = c.type === "Identifier" && c.name === "require" && node.arguments.length >= 1 && strLit(node.arguments[0]) !== null;
        if (isReq) imports.push(strLit(node.arguments[0]));
        else if (c.type !== "Super") { const n = calleeOf(c); if (n) calls.push([callers[callers.length - 1], n]); }
        break;
      }
      case "TaggedTemplateExpression": { const n = calleeOf(node.tag); if (n) calls.push([callers[callers.length - 1], n]); break; }
      default: break;
    }
    // class-field initializers are not named scopes: PropertyDefinition's value (an arrow) must not be named by the field
    for (const key of Object.keys(node)) {
      if (key === "type" || key === "start" || key === "end") continue;
      const v = node[key];
      if (Array.isArray(v)) { for (const it of v) if (it && typeof it.type === "string") visit(it, node); }
      else if (v && typeof v.type === "string") visit(v, node);
    }
    if (pushed) callers.pop();
  }
  visit(ast, null);
  return { calls, imports, extends: ext };
}

const paths = JSON.parse(fs.readFileSync(0, "utf8"));
const out = {};
for (const p of paths) {
  try { out[p] = run(p); } catch (e) { out[p] = { error: `${e.name}: ${String(e.message).slice(0, 80)}` }; }
}
process.stdout.write(JSON.stringify(out));
