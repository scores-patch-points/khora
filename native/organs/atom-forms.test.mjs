// atom-forms.test.mjs — the reader's two canonical rewrites (moved unchanged from atom-support.js, the stage spec RC6).
//   node --test organs/atom-forms.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { canonicalForms } from "./atom-forms.js";

const R = { entity: "E1", name: "Mount Rainier" }, NOM = { value: "no mountain" }, W = { entity: "E2", name: "Washington" };
test("a negated comparison from a 'no' quantifier is the superlative of its second referent, and keeps the comparative's word", () => {
  const atoms = [{ pred: "more:high", args: [NOM, R], neg: true, head: 7 }, { pred: "in", args: [NOM, W], neg: true }];
  const out = canonicalForms(atoms);
  assert.deepEqual(out.map((a) => `${a.neg ? "NOT " : ""}${a.pred}(${a.args.map((x) => x.name ?? x.value).join(", ")})`).sort(), ["in(Mount Rainier, Washington)", "most:high(Mount Rainier)"]);
  assert.ok(out.every((a) => a.rewritten === "no-comparative"));
  assert.equal(out.find((a) => a.pred === "most:high").head, 7);
  assert.ok(!out.includes(atoms[0]) && !out.includes(atoms[1]), "the atoms a rewrite consumed are absent from the forms");
});
test("'X is another name for Y' is named(Y, X); atoms no rewrite touches come back as they were", () => {
  const X = { value: "Tahoma" }, Y = { entity: "E1", name: "Mount Rainier" };
  const plain = { pred: "be_in", args: [Y, W], neg: false };
  const out = canonicalForms([{ pred: "is_a", args: [X, { value: "another name" }], neg: false }, { pred: "be_for", args: [X, Y], neg: false }, plain]);
  assert.ok(out.includes(plain));
  assert.deepEqual(out.filter((a) => a.rewritten).map((a) => `${a.pred}(${a.args.map((x) => x.name ?? x.value).join(", ")})`), ["named(Mount Rainier, Tahoma)"]);
});
