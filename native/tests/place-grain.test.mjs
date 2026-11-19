// place-grain.test.mjs — the question's grain, containment and holdings decide what counts (PREREG-ROUND27). A constructed chain, the real parser.
import test from "node:test"; import assert from "node:assert/strict";
import { loadModel } from "../adapters/text/english-parser.js"; import { priorJson } from "../the-fold/prior-source.mjs"; import { judge, grainOfQuestion, levelsOfChain } from "../adapters/text/place-grain.js";
const chain = { Q1: { label: "Kansas", classes: ["|Q35657"] }, Q2: { label: "United States", classes: ["|Q6256"] } }; const levels = levelsOfChain(chain, "Q3", "Topeka");
const model = loadModel(priorJson("parser-eng-ewt.json"));
test("the grain is the noun the wh-word governs; a bare where is open", () => { assert.equal(grainOfQuestion(model, "Which state was she born in?").grain, "admin1"); assert.equal(grainOfQuestion(model, "In which city was he born?").grain, "settlement"); assert.equal(grainOfQuestion(model, "Where was he born?").grain, "open"); });
test("Topeka and Kansas both answer 'which state'; the country is too coarse for 'which city'; Kansas City is not Kansas", () => {
  const J = (question, answer, holdings = []) => judge({ model, question, levels, answer, holdings }).verdict;
  assert.equal(J("Which state was she born in?", "Kansas"), "same"); assert.equal(J("Which state was she born in?", "Topeka"), "roll_up"); assert.equal(J("Which city was she born in?", "United States"), "too_coarse"); assert.equal(J("Which state was she born in?", "Kansas City"), "other");
});
test("for 'where', only what the asker does not already hold counts", () => { const J = (a, h) => judge({ model, question: "Where was she born?", levels, answer: a, holdings: h }).verdict; assert.equal(J("Kansas", []), "same"); assert.equal(J("Kansas", ["admin1"]), "already_held"); assert.equal(J("Topeka", ["admin1"]), "same"); });
