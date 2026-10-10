// xauth_js.mjs: the JavaScript tokenizer of acorn (the ECMAScript parser bundled inside Node, version printed on stderr) as an
// independent authority for javascript token boundaries. It shares nothing with the tree-sitter grammar the lexer was derived from.
// Run:   node --expose-internals eval/coding-competence/xauth/xauth_js.mjs      (the flag only exposes Node's own bundled copy)
// stdin: JSON list of file paths. stdout: JSON {path: {tokens:[[start,end,type],...]} | {error}} with UTF-16 offsets (JS string indices).
// Normalisation (declared, not tuned): comments come from acorn's onComment (delimiters included); a template literal (the outermost
// backtick pair with every nested `${...}` expression and nested template) is ONE lexeme, because the grammar gold and the lexer treat
// it as one; every other acorn token is the engine's own token. Whitespace is not a lexeme. A hashbang line is a comment-like lexeme.
// A file acorn rejects (JSX, decorators, a syntax error) is a typed per-file error, never a guess.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const acorn = require("internal/deps/acorn/acorn/dist/acorn");

function run(path) {
  const src = fs.readFileSync(path, "utf8");
  const comments = [];
  const toks = [];
  const stack = []; // entries: {k:"tpl"} or {k:"expr", braces}
  let tplStart = -1;
  for (const t of acorn.tokenizer(src, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true, onComment: (_b, _t, s, e) => comments.push([s, e, "COMMENT"]) })) {
    const label = t.type.label;
    if (label === "`") {
      const top = stack[stack.length - 1];
      if (top && top.k === "tpl") {
        stack.pop();
        if (!stack.length) toks.push([tplStart, t.end, "TEMPLATE"]);
      } else {
        if (!stack.length) tplStart = t.start;
        stack.push({ k: "tpl" });
      }
      continue;
    }
    if (stack.length) {
      const top = stack[stack.length - 1];
      if (label === "${") stack.push({ k: "expr", braces: 0 });
      else if (top.k === "expr") {
        if (label === "{" || label === "${") top.braces++;
        else if (label === "}") { if (top.braces === 0) stack.pop(); else top.braces--; }
      }
      continue;
    }
    toks.push([t.start, t.end, label]);
  }
  if (stack.length) throw new Error("unterminated template literal");
  const all = toks.concat(comments).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { tokens: all };
}

const paths = JSON.parse(fs.readFileSync(0, "utf8"));
const res = {};
for (const p of paths) {
  try { res[p] = run(p); } catch (e) { res[p] = { error: `${e?.name ?? "Error"}: ${String(e?.message ?? e).split("\n")[0].slice(0, 120)}` }; }
}
process.stdout.write(JSON.stringify(res));
