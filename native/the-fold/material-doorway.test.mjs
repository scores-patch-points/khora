// the-fold/material-doorway.test.mjs — the read doorway's two live cases and its falsifying control.
//
// Run: node --test khora/native/the-fold/material-doorway.test.mjs
//
// Case 1 (notation): a short PGN movetext through chess_pgn.js with notation-chess_pgn-*.json -> 4 plies read.
// Case 2 (code):     a 6-line Python snippet through adapters/code/* with code-kw-python.json + code-lex-python.json.
// Case 3 (falsify):  the SAME reads with an injected prior reader that reports every prior absent -> typed gaps,
//                    never a throw and never a fabricated extract.
import test from "node:test";
import assert from "node:assert/strict";
import { readMaterial, PRIOR_DIR, WORKSPACE_ROOT, MATERIAL_SCHEMA } from "./material-doorway.js";

const PGN = "1. e4 e5 2. Nf3 Nc6";
const PY = `def add(a, b):
    total = a + b
    return total

print(add(2, 3))`;

const absentPrior = (file) => ({ file, ok: false, error: "ENOENT" });

test("the module resolves janus/priors from the workspace root", () => {
  assert.equal(PRIOR_DIR, `${WORKSPACE_ROOT}/janus/priors`);
});

test("notation: a PGN movetext is read as 4 chess plies, with the three chess priors used", () => {
  const r = readMaterial(PGN, { family: "notation", kind: "chess_pgn" });
  assert.equal(r.family, "notation");
  assert.equal(r.language, "chess_pgn");
  assert.equal(r.schema, MATERIAL_SCHEMA);
  assert.deepEqual(r.gaps, []);
  for (const f of ["notation-chess_pgn-lexicon.json", "notation-chess_pgn-rules.json", "notation-chess_pgn-identity.json"]) {
    assert.ok(r.priorsUsed.includes(f), `prior used: ${f}`);
  }
  assert.equal(r.priorsUsed.length, 3);
  const plies = r.result.plies;
  assert.equal(plies.length, 4);
  assert.deepEqual(plies.map((p) => `${p.color}:${p.piece}:${p.from}-${p.to}`), ["w:P:e2-e4", "b:P:e7-e5", "w:N:g1-f3", "b:N:b8-c6"]);
  const tokens = r.shapes.find((s) => s.output === "tokens");
  assert.equal(tokens.count, 6);
});

test("notation: the suite names chess from the material alone when no kind is given", () => {
  const r = readMaterial(PGN, { family: "notation" });
  assert.equal(r.language, "chess_pgn");
  assert.equal(r.gaps.length, 0);
});

test("code: a 6-line Python snippet is lexed and edge-read with the python priors; declared is a typed gap", () => {
  const r = readMaterial(PY, { family: "code", language: "python" });
  assert.equal(r.family, "code");
  assert.equal(r.language, "python");
  assert.ok(r.priorsUsed.includes("code-lex-python.json"), "code-lex-python.json read");
  assert.ok(r.priorsUsed.includes("code-kw-python.json"), "code-kw-python.json read");
  assert.ok(r.priorsUsed.includes("code-identify.json"), "code-identify.json read");

  const lex = r.shapes.find((s) => s.output === "lex");
  assert.ok(lex, "lexer output present");
  assert.equal(lex.count, 24);
  assert.deepEqual(lex.counts, { keyword: 2, identifier: 9, punctuation: 9, operator: 2, literal: 2 });
  assert.deepEqual(lex.sample.slice(0, 2).map((t) => [t.text, t.class]), [["def", "keyword"], ["add", "identifier"]]);

  const edges = r.shapes.find((s) => s.output === "edges");
  assert.ok(edges, "edges output present");
  assert.deepEqual(edges.declared, [{ name: "add", kind: "function", at: 4 }]);
  assert.deepEqual(edges.calls.map((c) => c.callee), ["print", "add"]);

  // the declaration-frame reader is NOT drivable from the received priors: disclosed, not patched
  const gap = r.gaps.find((g) => g.reason === "declared_prior_absent");
  assert.ok(gap, "declared prior absence is a typed gap");
  assert.match(gap.wall, /CodeDeclarationFramePrior@1/);
});

test("falsifying: absent priors yield typed gaps and never throw, for notation and for code", () => {
  const n = readMaterial(PGN, { family: "notation", kind: "chess_pgn", readPrior: absentPrior });
  assert.equal(n.language, "chess_pgn");
  assert.equal(n.result.plies.length, 0, "no plies fabricated without a prior");
  assert.equal(n.gaps.filter((g) => g.reason === "prior_missing").length, 3);
  assert.ok(n.gaps.every((g) => typeof g.reason === "string"));

  const c = readMaterial(PY, { family: "code", language: "python", readPrior: absentPrior });
  assert.equal(c.language, "python", "a declared language is kept; the extract is empty, not guessed");
  assert.equal(c.shapes.find((s) => s.output === "lex"), undefined, "no lexer output without a prior");
  assert.ok(c.gaps.some((g) => g.reason === "prior_missing" && g.key === "lex"));
  assert.ok(c.gaps.some((g) => g.reason === "prior_missing" && g.key === "keywords"));
});

test("falsifying: an unresolved family is a typed gap, not a crash", () => {
  const r = readMaterial("hello", { family: "diagram" });
  assert.equal(r.language, null);
  assert.equal(r.gaps[0].reason, "family_unknown");
});
