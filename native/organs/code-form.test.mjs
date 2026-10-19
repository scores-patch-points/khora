// Falsification: attribution in code-form. A failing test that names only its CALLER must not blind REC
// to a defect in a CALLEE — the blame is read off the failure's own stack when there is one, and expands
// along the record's own call bonds; the trial still decides. A red test is a FALSIFIED claim.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeCodeForm } from "./code-form.js";

const TOKENIZE = 'function tokenize(src) { return (src.replace(/\\s+/g, "").match(/\\d+|[+\\-*/()]/g) || []); }';
const PARSE = `function parse(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const expr = () => { let v = term(); while (peek() === "+" || peek() === "-") { const op = tokens[i++]; const r = term(); v = op === "+" ? v + r : v - r; } return v; };
  const term = () => { let v = unary(); while (peek() === "*" || peek() === "/") { const op = tokens[i++]; const r = unary(); v = op === "*" ? v * r : v / r; } return v; };
  const unary = () => { if (peek() === "-") { i++; return -unary(); } return atom(); };
  const atom = () => { const t = tokens[i++]; if (t === "(") { const v = expr(); if (tokens[i] !== ")") throw new Error("expected )"); i++; return v; } return Number(t); };
  const out = expr();
  if (i !== tokens.length) throw new Error("trailing tokens");
  return out;
}`;
const EVALUATE = "function evaluate(src) { return parse(tokenize(src)); }";
const WRONG_PARSE = "function parse(tokens) { return 0; }";

const SPEC = { program: "a tiny expression evaluator", modules: [{ name: "engine", functions: [
  { name: "tokenize", signature: "tokenize(src)", says: "split a source string into number and operator tokens" },
  { name: "parse", signature: "parse(tokens)", says: "evaluate a token array with + - * / and parentheses" },
  { name: "evaluate", signature: "evaluate(src)", says: "tokenize then parse a source string" },
] }] };

// the suite names ONLY the caller (evaluate); the defect lives in its callee (parse)
const TEST = `import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./index.js";
test("evaluate [evaluate]", () => {
  assert.equal(evaluate("1+2"), 3);
  assert.equal(evaluate("2*3+4"), 10);
  assert.equal(evaluate("2*(3+4)"), 14);
});
`;

const scripted = (wrongParseFirst) => async (prompt, opts = {}) => {
  const stage = String(opts.stage ?? "");
  if (stage.startsWith("calls:")) return stage.slice(6) === "evaluate" ? "tokenize, parse" : "none";
  if (stage.startsWith("body:")) {
    const fn = stage.slice(5);
    if (fn === "tokenize") return TOKENIZE;
    if (fn === "evaluate") return EVALUATE;
    if (fn === "parse") return wrongParseFirst && !/fail/i.test(prompt) ? WRONG_PARSE : PARSE;
  }
  return "none";
};

async function build(wrongParseFirst) {
  const testFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cf-t-")), "check.mjs");
  fs.writeFileSync(testFile, TEST);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-w-"));
  const form = makeCodeForm({ ask: scripted(wrongParseFirst), mouth: "scripted", log: () => {}, spec: SPEC, testFile });
  let notes = form.stipulate();
  ({ notes } = await form.askCalls({ notes }));
  const wb = await form.writeBodies({ notes });
  form.assemble({ notes: wb.notes, store: wb.store, dir });
  const r = await form.revise({ notes: wb.notes, store: wb.store, dir });
  const map = form.assemble({ notes: r.notes, store: r.store, dir }).map;
  const final = form.test({ dir, map });
  return { final, history: r.history, engine: fs.readFileSync(path.join(dir, "engine.js"), "utf8") };
}

test("control: all bodies correct — the build is green at round 0, no revision", async () => {
  const { final, history } = await build(false);
  assert.equal(final.passed, final.total, `${final.passed}/${final.total}`);
  assert.deepEqual(history.map((h) => h.kept ?? []).flat(), [], "a clean build still revised");
});

test("FALSIFIER: a defect in a CALLEE is reached though the test names only its CALLER", async () => {
  const { final, history, engine } = await build(true);
  assert.equal(final.passed, final.total, `the build never reached green (${final.passed}/${final.total}) — the callee was never reached`);
  assert.ok(history.some((h) => (h.kept ?? []).includes("parse")), `parse was never revised: ${JSON.stringify(history)}`);
  assert.match(engine, /function parse\(tokens\) \{\n  let i = 0;/, "the fixed parse did not survive in the workspace");
});
