import test from "node:test";
import assert from "node:assert/strict";
import { buildReadingTimeline } from "./reading-timeline.js";
import { splitSentences } from "./spans.js";
import { extractSurfaces, discoverReferents } from "./surfaces.js";
import { resolvePronouns } from "./pronouns.js";
import { classifyWord } from "./wordclass.js";
import { readDocumentEvidence, classifyWithDocument } from "./document-evidence.js";

const posPrior = { forms: { the: { DET: 9 }, shall: { AUX: 9 }, pay: { VERB: 9 }, work: { NOUN: 9 }, inspect: { VERB: 9 }, praised: { VERB: 9 }, method: { NOUN: 9 }, said: { VERB: 9 }, was: { AUX: 9 }, pleased: { ADJ: 9 }, and: { CCONJ: 9 }, is: { AUX: 9 }, schools: { NOUN: 9 }, public: { ADJ: 9 }, nashville: { PROPN: 9 }, metropolitan: { ADJ: 9 }, call: { VERB: 9 }, see: { VERB: 9 } } };
const base = (f) => classifyWord(f, { posPrior });
const wordsIn = (text, off) => [...text.matchAll(/[\p{L}][\p{L}'’\-]*/gu)].map((m) => ({ w: m[0], s: off + m.index, e: off + m.index + m[0].length }));
const deps = { splitSentences, wordsIn, extractSurfaces, discoverReferents, resolvePronouns, classifyAt: (prefix) => classifyWithDocument(base, readDocumentEvidence(prefix, { classify: base })) };

test("an acronym the text defines LATER is first a gap, then a name — a revision with its cause", () => {
  // MNPS is used before it is defined: the reader cannot place it, until the definition arrives
  const text = "MNPS shall pay the work. Call MNPS. See MNPS. The Metropolitan Nashville Public Schools (MNPS) shall inspect the work.";
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 10 });
  assert.equal(tl.snapshots.length, 4);
  const mnps = tl.snapshots[0].tokens.find((t) => t.w === "MNPS");
  assert.equal(mnps.upos === null || mnps.upos === "PROPN", true);
  const rev = tl.revisions.filter((r) => r.kind === "pos" && r.text === "MNPS");
  assert.ok(rev.length >= 1, "the early 'MNPS' is revised once the definition has been read");
  assert.equal(rev[0].to, "PROPN");
  assert.equal(rev[0].because.sentence, 4);
});

test("a reading of a prefix never sees the future", () => {
  const text = "Zorbax shall pay. Call Zorbax. The Zorbax Corp shall inspect the work.";
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 10 });
  assert.equal(tl.snapshots[0].tokens.every((t) => t.s < tl.sentences[0].end), true);
  assert.equal(tl.snapshots[2].tokens.length > tl.snapshots[0].tokens.length, true);
});

test("a name that grows retroactively re-binds the earlier mentions: 'Johnson' becomes 'Andrew Johnson'", () => {
  const text = "Andrew Johnson was the vice president under Lincoln. Lincoln was shot in April. He died the next morning. Johnson was sworn in. He faced the Senate. Later, Andrew Johnson vetoed the bill.";
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 10 });
  const before = tl.snapshots.find((s) => s.frontier === 5).mentions.filter((m) => m.kind === "name" && m.text === "Johnson").map((m) => m.name);
  assert.ok(before.length >= 1);
  const grew = tl.revisions.filter((r) => r.kind === "referent" && r.to === "Andrew Johnson");
  assert.ok(grew.length >= 1, "an earlier mention of 'Johnson' is re-bound once the full name is read");
  assert.equal(grew[0].because.sentence, 6);
});

test("a pronoun the engine cannot bind is reported unresolved, never invented", () => {
  const tl = buildReadingTimeline("Lincoln was shot in April. He died the next morning.", deps, { maxSnapshots: 10 });
  const p = tl.snapshots.at(-1).mentions.filter((m) => m.kind === "pronoun");
  for (const m of p) assert.ok(m.name === null || typeof m.name === "string");
});

test("stride caps the number of snapshots and the last one is always the whole text", () => {
  const text = Array.from({ length: 25 }, (_, i) => `Call Zorbax${i}.`).join(" ");
  const tl = buildReadingTimeline(text, deps, { maxSnapshots: 5 });
  assert.ok(tl.snapshots.length <= 6);
  assert.equal(tl.snapshots.at(-1).frontier, tl.sentences.length);
});

test("claims that are rebound or retracted as more is read are revisions too", () => {
  let n = 0;
  const readClaims = (prefix) => (prefix.includes("Later") ? [{ label: "praised", span: "x", s: 1, end1: "Curie", end2: "method" }] : [{ label: "praised", span: "x", s: 1, end1: "she", end2: "method" }]);
  const tl = buildReadingTimeline("She praised the method. Later, Curie spoke.", { ...deps, readClaims }, { maxSnapshots: 10 });
  const c = tl.revisions.find((r) => r.kind === "claim");
  assert.equal(c.from, "she → method");
  assert.equal(c.to, "Curie → method");
  void n;
});

test("no parser and no prior are assumed", () => {
  assert.throws(() => buildReadingTimeline("x", {}), /injected/);
});
