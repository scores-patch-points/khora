import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.FOLD_REGISTER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "reg-"));
const R = await import("./opencode-register.mjs");
const fresh = () => R._resetForTest();

test("declarative statements are kept verbatim; questions, requests and chatter are not", () => {
  fresh();
  const got = R.record({ sessionID: "a", ask: "Heads up: the staging cluster is named Pelican. What is the capital of France? Please explain how TCP works. The Lisbon office has 31 desks. One-line acknowledgement please." });
  assert.deepEqual(got.map((e) => e.text), ["Heads up: the staging cluster is named Pelican.", "The Lisbon office has 31 desks."]);
});

test("a coordinated second clause with its own subject is its own statement", () => {
  fresh();
  const got = R.record({ sessionID: "b", ask: "Our freight vendor is Halvorsen Freight and the contract ends on 2027-03-31." });
  assert.deepEqual(got.map((e) => e.text), ["Our freight vendor is Halvorsen Freight", "the contract ends on 2027-03-31."]);
});

test("a later statement about the same subject replaces the earlier one, and 'It is now' binds to the previous sentence", () => {
  fresh();
  R.record({ sessionID: "c", ask: "Our deploy window is Thursdays at 02:00 UTC." });
  R.record({ sessionID: "c", ask: "Some long explanation request about B-trees." });
  R.record({ sessionID: "c", ask: "Update: the deploy window moved. It is now Fridays at 03:00 UTC." });
  const { note } = R.registerNote({ sessionID: "c", ask: "What is our deploy window now?" });
  assert.match(note, /\[turn 1\] \(replaced at turn 3\) Our deploy window is Thursdays at 02:00 UTC\./);
  assert.match(note, /\[turn 3\] Update: the deploy window moved\. It is now Fridays at 03:00 UTC\./);
});

test("a differently worded fact is not mistaken for a replacement", () => {
  fresh();
  R.record({ sessionID: "d", ask: "The budget code for this work is BX-4471." });
  R.record({ sessionID: "d", ask: "The cost centre for the audit is CC-9020." });
  const { note } = R.registerNote({ sessionID: "d", ask: "x" });
  assert.doesNotMatch(note, /\(replaced at turn/);
});

test("the register survives a door restart, and a repeated ask is not recorded twice", () => {
  fresh();
  R.record({ sessionID: "e", ask: "Our mascot service is called Orbit." });
  R.record({ sessionID: "e", ask: "Our mascot service is called Orbit." });
  fresh(); // a new process: state comes back from disk
  const { note, entries } = R.registerNote({ sessionID: "e", ask: "What is the mascot?" });
  assert.equal(entries, 1);
  assert.match(note, /called Orbit/);
});

test("over budget it sheds replaced statements first and never exceeds the size", () => {
  fresh();
  for (let i = 0; i < 80; i++) R.record({ sessionID: "f", ask: `The widget number ${i} costs ${100 + i} euros per unit.` });
  const r = R.registerNote({ sessionID: "f", ask: "x", maxChars: 2000 });
  assert.ok(r.chars <= 2300, String(r.chars));
  assert.match(r.note, /widget number 79 costs 179/);
});

test("what the person says the assistant said is not the person's own statement of fact", () => {
  fresh();
  assert.equal(R.record({ sessionID: "h", ask: "You told me earlier that the mascot service was called Comet." }).length, 0);
});

test("a message wrapped in quotes by the client is stored without them", () => {
  fresh();
  assert.equal(R.record({ sessionID: "i", ask: '"Our mascot service is called Orbit."' })[0].text, "Our mascot service is called Orbit.");
});

test("no statements, no block", () => {
  fresh();
  assert.equal(R.registerNote({ sessionID: "g", ask: "Explain consistent hashing in 600 words." }).gap, "empty");
});
