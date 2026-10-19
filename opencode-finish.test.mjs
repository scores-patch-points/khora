// opencode-finish.test.mjs — the falsifying controls for THE MECHANICAL STEP
// (opencode-finish.mjs). The model's draw is one step; the step SHOWS THE GROUND
// of what is said, mechanically, and never rewrites the words.
import test from "node:test";
import assert from "node:assert/strict";
import { finish } from "./opencode-finish.mjs";
import { warm } from "./opencode-lane.mjs";

test.before(async () => {
  await warm();
});

test("FALSIFIER: the output is the draw unchanged; the step only ADDS the ground", async () => {
  const draft = "Curie discovered radium. The sea was calm.";
  const r = await finish({
    ask: "write a short note about Curie",
    draft,
    ground: [{ end1: "curie", label: "discovered", end2: "radium", span: { start: 0 }, source: "mat.txt" }],
  });
  assert.equal(r.output, draft, "the step must not rewrite the model's words");
  assert.equal(r.superseded, null, "nothing settled, so nothing is superseded");
  assert.ok(Array.isArray(r.ground_trace), "the ground is shown per sentence");
});

test("FALSIFIER: paraphrase is typed MATERIAL by the fact's ends, not by string containment", async () => {
  // The draft says "Curie's discovery of radium" — not the source's exact
  // sentence — yet it carries the fact's ends (curie, radium), so it is
  // MATERIAL, with the fact's byte address as its ref.
  const r = await finish({
    ask: "write a short note about Curie",
    draft: "Curie's discovery of radium changed physics. The sea was calm.",
    ground: [{ end1: "curie", label: "discovered", end2: "radium", span: { start: 42 }, source: "mat.txt" }],
  });
  const [first, second] = r.grounded;
  assert.equal(first.standing, "grounded", "a paraphrase carrying the fact's ends is grounded");
  assert.equal(first.ref, "mat.txt#42", "the ground's byte address rides with it");
  assert.equal(second.standing, "self:model", "a sentence with no fact's ends is the mouth's own");
});

test("FALSIFIER: the grounded output resolves a paraphrase to its being, model-free", async () => {
  // "Curie" is not in the material's spelling ("Marie Curie") — the holograph
  // identity resolves the paraphrase to the being, so the sentence is GROUNDED
  // on it. The invented sentence resolves to no being and is SELF:MODEL.
  const r = await finish({
    ask: "write a note about Curie",
    draft: "Curie discovered radium. The element radium glows in the dark.",
    material: "Marie Curie discovered radium in 1898. Radium is a radioactive element.",
  });
  assert.equal(r.output, "Curie discovered radium. The element radium glows in the dark.", "the words are not rewritten");
  assert.equal(r.grounded[0].standing, "grounded", "a paraphrase naming a being is grounded");
  assert.ok(r.grounded[0].beings.includes("Marie Curie"), "the paraphrase resolved to the material's being");
  assert.equal(r.grounded[1].standing, "self:model", "a claim resolving to no being is the mouth's own");
});

test("FALSIFIER: a settled ask's output is the computed value and keeps the draw as superseded", async () => {
  const r = await finish({ ask: "what is 17 times 24", draft: "The answer is 400." });
  assert.equal(r.output, "408", "the observation outweighs the prediction");
  assert.equal(r.superseded, "The answer is 400.", "a win keeps the loser — the draw is not erased");
  assert.match(r.disclosure, /the machine settled this ask/);
});

test("FALSIFIER: the draw is parsed into POS + EOT (the language-appropriate parse)", async () => {
  const r = await finish({ ask: "write a note", draft: "The judge ruled that the association had violated the law." });
  assert.equal(typeof r.eot, "number", "the output is parsed into EOT records");
  assert.ok(r.eot >= 1, "one sentence reads to at least one record");
});

test("FALSIFIER: an empty ask yields no output (the empty guard)", async () => {
  const r = await finish({ ask: "   ", draft: "anything" });
  assert.equal(r.ok, false);
  assert.equal(r.gap, "empty-ask");
  assert.equal(r.output, undefined);
});
