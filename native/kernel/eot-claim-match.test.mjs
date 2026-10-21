// eot-claim-match.test.mjs — NL → grammar → EOT → verdict: meaning, not wording. English through grammar-en.js; the matcher sees no words.
//   node --test native/kernel/eot-claim-match.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { claimsOf } from "../adapters/text/grammar-en.js";
import { verdict, linked } from "./eot-claim-match.js";
import { janusContradictions } from "../organs/eot-janus.js";
const v = (claim, source) => verdict(claimsOf(claim), claimsOf(source)).v;

test("the same proposition in the other voice is supported; the roles swapped are contradicted", () => {
  assert.equal(v("Brutus stabbed Caesar.", "Caesar was stabbed by Brutus."), "E");
  assert.equal(v("Caesar stabbed Brutus.", "Brutus stabbed Caesar."), "C");
});

test("a flipped polarity and a different figure for the same measure are contradictions", () => {
  assert.equal(v("Chlorophyll does not give plants their green color.", "Chlorophyll gives plants their green color."), "C");
  assert.equal(v("Jaguars weigh 60 kg.", "Jaguars weigh 36 kg."), "C");
});

test("known reader gap: an adjective-led subject before 'weigh' gives no claim (the parse loses the verb)", { todo: "parser: 'Female jaguars weigh 60 kg.' reads no verb" }, () => {
  assert.equal(v("Female jaguars weigh 60 kg.", "Female jaguars weigh 36 kg."), "C");
});

test("a source that only reports a thing does not support it asserted", () => {
  assert.notEqual(v("The bridge is unsafe.", "Some residents claim that the bridge is unsafe."), "E");
});

test("two ends sharing a head word are not one being when their modifiers exclude each other", () => {
  const end = (head, keys) => ({ head, keys, names: [], figs: [] });
  assert.equal(linked(end("whale", ["toothed", "whale"]), end("whale", ["baleen", "whale"])), false, "toothed whales and baleen whales are two beings");
  assert.equal(linked(end("jaguar", ["female", "jaguar"]), end("jaguar", ["jaguar"])), true, "a kind read at two grains is one being");
});

test("janus finds a second maker of one made thing", () => {
  const ids = janusContradictions([{ id: "p1", C: claimsOf("Joseph Priestley discovered photosynthesis."), S: claimsOf("Jan Ingenhousz discovered photosynthesis.") }]);
  assert.ok(ids.has("p1"));
});

test("a sentence-opening phrase frames the event and is never its argument (layer 4)", () => {
  const [c] = claimsOf("In March 2014, we entered into a license agreement with GSK.");
  assert.equal(c.rel, "enter");
  assert.ok(!/March/.test(c.ARG1?.text ?? ""), `the opening date is not the second end: ${c.ARG1?.text}`);
  assert.ok((c.OBL ?? []).some((o) => /March 2014/.test(o.text)), "it stays an oblique (time)");
  assert.equal(v("In addition, in March 2014, we entered into a license agreement with GSK.", "In March 2014, we entered into a license agreement with GSK."), "E");
});
