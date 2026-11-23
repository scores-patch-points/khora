// span-resolver.test.mjs — the prediction layer: the kāraka slot votes which word class fits, and the
// look/sound cues confirm. Pins the falsifiable claim that the DAG resolves what no single cue can:
// "rite" sounds like both "right" and "write" but a predicate slot admits only a verb; "fone" looks
// like "one" but sounds like "phone" and a patient slot admits only a nominal. Skips when espeak-ng is
// absent (the sound cue is the one that needs it).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeResolver, ROLE_CLASS } from "./span-resolver.js";
import { execFileSync } from "node:child_process";

const hasEspeak = (() => { try { execFileSync("espeak-ng", ["--version"]); return true; } catch { return false; } })();

const FORMS = {
  phone: { NOUN: 20, VERB: 5 }, through: { ADP: 40 }, cough: { NOUN: 8, VERB: 4 },
  night: { NOUN: 30 }, right: { ADJ: 25, NOUN: 6 }, write: { VERB: 15 }, white: { ADJ: 12 },
  one: { NUM: 50 }, true: { ADJ: 18 }, coffee: { NOUN: 12 }, definitely: { ADV: 9 },
};

test("the kāraka slot narrows an ambiguous homophone: rite -> write (predicate) vs right (patient)", { skip: !hasEspeak }, () => {
  const r = makeResolver({ forms: FORMS });
  const asVerb = r.resolve({ surface: "rite", role: "predicate" });
  assert.equal(asVerb.claimed, true);
  assert.equal(asVerb.nearest, "write", "a predicate slot admits only a verb");
  assert.equal(asVerb.method, "predict");

  const asNoun = r.resolve({ surface: "rite", role: "karman" });
  assert.equal(asNoun.claimed, true);
  assert.equal(asNoun.nearest, "right", "a patient slot admits only a nominal");
});

test("the slot resolves look-vs-sound disagreement: fone -> phone (patient), not one", { skip: !hasEspeak }, () => {
  const r = makeResolver({ forms: FORMS });
  // look says "one" (one edit), sound says "phone" (homophone); the patient slot admits a nominal,
  // and "one" is a numeral, so it is cut and "phone" survives.
  const c = r.resolve({ surface: "fone", role: "karman" });
  assert.equal(c.claimed, true);
  assert.equal(c.nearest, "phone");
  assert.ok(c.candidates.includes("one") && c.candidates.includes("phone"), "both cues contributed a candidate");
});

test("the DMD trace names the difference each constraint made", { skip: !hasEspeak }, () => {
  const r = makeResolver({ forms: FORMS });
  const c = r.resolve({ surface: "fone", role: "karman" });
  const roleStep = c.dmd.find((s) => s.step === "role:karman");
  assert.ok(roleStep, "the role filter ran");
  assert.equal(roleStep.kept, 1, "the role filter cut the candidates to one");
  const confirm = c.dmd.find((s) => s.step === "confirmation");
  assert.ok(confirm.oneEdit >= 1 && confirm.homophone >= 1, "both cues admitted candidates");
});

test("a known form is a no-op; an empty surface abstains", () => {
  const r = makeResolver({ forms: FORMS });
  assert.equal(r.resolve({ surface: "phone", role: "karman" }).method, "known");
  assert.equal(r.resolve({ surface: "", role: "karman" }).reason, "empty");
});

test("ROLE_CLASS is declared with reasons, every kāraka and the predicate named", () => {
  for (const k of ["kartṛ", "karman", "karaṇa", "sampradāna", "apādāna", "adhikaraṇa"]) assert.ok(ROLE_CLASS[k], `${k} has a class`);
  assert.deepEqual(ROLE_CLASS.predicate, ["VERB", "AUX"]);
  assert.ok(ROLE_CLASS.function.includes("ADP"));
});
