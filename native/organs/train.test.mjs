// train.test.mjs — the order of the steps and the marks they leave, with toy parts: the point is the loop, not any part.
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { makeTrain } from "./train.js";
import { makeTrailStore } from "./trail-store.mjs";

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "train-")), "t.json");
const parts = (over = {}) => {
  const calls = { hunt: 0, say: 0, outcome: [] }, trails = makeTrailStore({ file: tmp() });
  const library = { say: async (intent, o) => { calls.say++; return { key: calls.say % 2 ? "np" : "yw", text: calls.say % 2 ? "np" : "yw", how: "drawn" }; }, outcome: (i, k, ok, o) => calls.outcome.push([i, k, ok, o.thread]) };
  const hunt = async () => { calls.hunt++; return { unique: true, via: "hunt", head: "ask:direct", routes: ["W|Lethal Weapon|"], answer: { answer: "Richard Donner", evidence: [{ title: "Lethal Weapon", sentence: "directed by Richard Donner" }] } }; };
  return { calls, trails, deps: { readAct: (m) => (m.startsWith("thanks") ? { kind: "social", intent: "you're welcome" } : m.endsWith("?") ? { kind: "question", rows: [] } : { kind: "statement" }), voidOf: () => ({ ok: true, admits: "person", relation: { lemma: "direct" } }), notebook: async () => null, hunt, library, trails, ...over } };
};

test("a social act is worded by the library, and the person's NEXT message settles how that wording landed", async () => {
  const { calls, deps } = parts(), T = makeTrain(deps);
  const a = await T.turn("t1", "thanks!", { seed: 1 }); assert.equal(a.kind, "social"); assert.equal(a.reply, "np");
  const b = await T.turn("t1", "ok, and what about the second one", { seed: 2 }); assert.deepEqual(calls.outcome, [["you're welcome", "np", true, "t1"]]); assert.ok(b.steps.some((s) => s.step === "settled" && s.landed === true));
  const c = await T.turn("t1", "thanks!", { seed: 3 }); const d = await T.turn("t1", "thanks!", { seed: 4 }); assert.equal(calls.outcome.at(-1)[2], false, "saying the same thing again is a wording that did not land"); assert.ok(c && d);
});

test("a question the notebook answers never reaches the shelf; one it does not answer sends the man to the shelf, and the answer carries where it came from", async () => {
  const { calls, deps } = parts({ notebook: async (v) => (v.relation.lemma === "known" ? { answer: "Mina", evidence: [{ text: "Mina gave a book" }] } : null) });
  const T = makeTrain(deps); const out = await T.turn("t", "who directed Lethal Weapon?");
  assert.equal(out.reply, "Richard Donner"); assert.equal(calls.hunt, 1); assert.equal(out.cite.title, "Lethal Weapon"); assert.deepEqual(out.steps.map((s) => s.step), ["act", "void", "shelf", "check"]);
  const T2 = makeTrain(parts({ notebook: async () => ({ answer: "Mina", evidence: [] }) }).deps); const n = await T2.turn("t", "who gave it?"); assert.equal(n.reply, "Mina"); assert.ok(n.steps.some((s) => s.step === "notebook"));
});

test("when the check fails, nothing is said and the route that gave the answer is given an alarm, so the next hunt does not follow it", async () => {
  const p = parts({ check: async () => ({ ok: false, why: "another page names someone else more often" }) }); p.trails.deposit("ask:direct", "W|Lethal Weapon|", true, 1); assert.deepEqual(p.trails.known("ask:direct"), ["W|Lethal Weapon|"]);
  const out = await makeTrain(p.deps).turn("t", "who directed it?");
  assert.equal(out.reply, null); assert.equal(out.gap.kind, "check_failed"); assert.deepEqual(p.trails.known("ask:direct"), [], "the trail was forgotten");
});

test("a void that cannot be declared, or a hunt that settles nothing, is a typed gap and no reply: the man says he could not find it", async () => {
  const noAnchor = await makeTrain(parts({ voidOf: () => ({ ok: false, gap: { kind: "no_anchor" } }) }).deps).turn("t", "who wrote it?"); assert.equal(noAnchor.gap.kind, "no_anchor"); assert.equal(noAnchor.reply, null);
  const open = await makeTrain(parts({ hunt: async () => ({ unique: false, gap: { kind: "several_fill_the_void" }, candidates: [1, 2] }) }).deps).turn("t", "who wrote it?"); assert.equal(open.gap.kind, "several_fill_the_void"); assert.equal(open.reply, null);
});
