import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

// Integration: the SYSTEM does the stigmergy. A drill carries the ask in front of the model; the door records
// the tension mechanically and the surf note carries the open trail back — across a fold or a restart (P1).
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "door-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const door = await import("./opencode-doorway.mjs");

test("a drill's ask deposits a tension that the surf note's <fold-trail> carries back", async () => {
  fresh();
  const dep = await door.answer({ event: "scent", task: "dtest", agent: "a", q: "confirm the app's default home", at: "rs1", parent: "turn 18" });
  assert.equal(dep.ok, true);
  const out = await door.answer({ event: "surf", task: "dtest", sessionID: "a", ask: "what holds the header", turns: [] });
  assert.match(out.note, /<fold-trail>/);
  assert.match(out.note, /confirm the app's default home/);
  assert.match(out.note, /at="rs1"/);
  assert.match(out.note, /parent="turn 18"/);
});

test("no open scent → no trail block rides the note", async () => {
  fresh();
  const out = await door.answer({ event: "surf", task: "empty", sessionID: "b", ask: "x", turns: [] });
  assert.doesNotMatch(out.note ?? "", /<fold-trail>/);
});

test("the trail event reads back the open questions for a non-fork agent", async () => {
  fresh();
  await door.answer({ event: "scent", task: "dtest2", agent: "z", q: "is the gauge a counter?", at: "turn 3" });
  const back = await door.answer({ event: "scent", task: "dtest2", agent: "z" });
  assert.equal(back.trail.length, 1);
  assert.equal(back.trail[0].at, "turn 3");
});

test("a re-asked question stops riding, and the release machinery is NEVER disclosed (transcendental)", async () => {
  fresh();
  for (let i = 0; i < 3; i++) await door.answer({ event: "scent", task: "loop", agent: "a", q: "what is this app", at: "rs1" });
  const out = await door.answer({ event: "surf", task: "loop", sessionID: "a", ask: "x", turns: [] });
  assert.doesNotMatch(out.note ?? "", /- open q="what is this app"/); // released (walled), not re-fed
  assert.doesNotMatch(out.note ?? "", /loop:|settled:/); // the condition of the window is not an object in it
});

test("a successful drill RELEASES its tension by arrival (the void re-zeros on one arrival)", async () => {
  const dir = fresh();
  fs.writeFileSync(path.join(dir, "x.txt"), "LINE1\nLINE2\n");
  await door.answer({ event: "scent", task: "arr", agent: "a", q: "what is in x", at: "x.txt#0-5" });
  const s = await door.answer({ event: "snip", task: "arr", agent: "a", ref: "x.txt#0-5", root: dir });
  assert.equal(s.ok, true);
  const out = await door.answer({ event: "surf", task: "arr", sessionID: "a", ask: "x", turns: [] });
  assert.doesNotMatch(out.note ?? "", /- open q="what is in x"/); // released, not re-fed
});

test("a re-asked question is WALLED by the surf pass, then never rides again", async () => {
  fresh();
  for (let i = 0; i < 3; i++) await door.answer({ event: "scent", task: "wall", agent: "a", q: "same", at: "rs1" });
  const first = await door.answer({ event: "surf", task: "wall", sessionID: "a", ask: "x", turns: [] });
  const second = await door.answer({ event: "surf", task: "wall", sessionID: "a", ask: "x", turns: [] });
  assert.doesNotMatch(first.note ?? "", /- open q=|loop:|settled:/); // walled silently
  assert.doesNotMatch(second.note ?? "", /- open q=|loop:|settled:/); // and never again
});

test("an answer in prose releases the tension it addresses (no snip needed)", async () => {
  fresh();
  await door.answer({ event: "scent", task: "prose", agent: "a", q: "where is the parser defined", at: "turn 3" });
  await door.answer({ event: "ground", task: "prose", sessionID: "a", text: "The parser is defined in lib/p.js.", workspace: process.cwd() });
  const out = await door.answer({ event: "surf", task: "prose", sessionID: "a", ask: "x", turns: [] });
  assert.doesNotMatch(out.note ?? "", /- open q="where is the parser/);
});

test("the SETTLED material releases a tension mechanically — the ascent, with no model act", async () => {
  fresh();
  const wn = await import("./opencode-worknotes.mjs");
  wn.writeTurnsFile({ file: wn.turnsFile("asc", "b"), agent: "b", turns: [{ n: 1, ask: "where is the parser defined", grounds: [], answer: "lib/p.js holds it" }] });
  await door.answer({ event: "scent", task: "asc", agent: "a", q: "where is the parser defined", at: "turn 3" });
  const out = await door.answer({ event: "surf", task: "asc", sessionID: "a", ask: "x", turns: [] });
  assert.doesNotMatch(out.note ?? "", /- open q="where is the parser/); // released by the settled material
});

test("the SYSTEM derives the tension from the ask: a failed drill opens it, a successful one releases it (no model-authored why)", async () => {
  const dir = fresh();
  const bad = await door.answer({ event: "snip", task: "derive", agent: "a", ref: "nope#0-5", ask: "where is the parser defined", root: dir });
  assert.equal(bad.ok, false);
  let out = await door.answer({ event: "surf", task: "derive", sessionID: "a", ask: "x", turns: [] });
  assert.match(out.note, /where is the parser defined/); // the ask itself is the open tension (system-derived)
  fs.writeFileSync(path.join(dir, "nope"), "hello\n");
  const good = await door.answer({ event: "snip", task: "derive", agent: "a", ref: "nope#0-5", ask: "where is the parser defined", root: dir });
  assert.equal(good.ok, true);
  out = await door.answer({ event: "surf", task: "derive", sessionID: "a", ask: "x", turns: [] });
  assert.doesNotMatch(out.note ?? "", /where is the parser defined/); // arrival released it
});

test("an arrival at a DIFFERENT address releases the ask's tension (the void is the question, not the address)", async () => {
  const dir = fresh();
  await door.answer({ event: "snip", task: "askrel", agent: "a", ref: "missing#0-5", ask: "what does the package declare", root: dir });
  fs.writeFileSync(path.join(dir, "pkg.json"), "[ok]\n");
  let out = await door.answer({ event: "surf", task: "askrel", sessionID: "a", ask: "x", turns: [] });
  assert.match(out.note, /what does the package declare/);
  await door.answer({ event: "snip", task: "askrel", agent: "a", ref: "pkg.json#0-4", ask: "what does the package declare", root: dir });
  out = await door.answer({ event: "surf", task: "askrel", sessionID: "a", ask: "x", turns: [] });
  assert.doesNotMatch(out.note ?? "", /what does the package declare/);
});

test("a coarse arrival releases the tensions nested under it (door wiring)", async () => {
  const dir = fresh();
  fs.writeFileSync(path.join(dir, "f.txt"), "a\nb\nc\n");
  await door.answer({ event: "scent", task: "nest", agent: "a", q: "whole file", at: "f.txt" });
  await door.answer({ event: "scent", task: "nest", agent: "a", q: "first span", at: "f.txt#0-1" });
  await door.answer({ event: "snip", task: "nest", agent: "a", ref: "f.txt#0-1", root: dir }); // the child arrives
  const out = await door.answer({ event: "surf", task: "nest", sessionID: "a", ask: "x", turns: [] });
  assert.match(out.note, /whole file/); // the whole stays (a part does not carry the whole)
  assert.doesNotMatch(out.note ?? "", /first span/); // the part is released
});

test("THE PROMPT IS DISCLOSED as a content-addressed source and resolves verbatim — and a forged address cannot lie", async () => {
  fresh();
  const body = JSON.stringify({ messages: [{ role: "user", content: "hello world" }], model: "m" });
  await door.answer({ event: "prompt", sessionID: "a", task: "ptest", model: "m", body });
  const sha = crypto.createHash("sha256").update(body).digest("hex");
  const s = await door.answer({ event: "snip", task: "ptest", agent: "a", ref: `prompt#${sha.slice(0, 16)}` });
  assert.equal(s.ok, true);
  assert.equal(s.bytes, body);
  assert.equal(s.provenance.kind, "prompt");
  const bad = await door.answer({ event: "snip", task: "ptest", agent: "a", ref: "prompt#deadbeefdeadbeef" });
  assert.equal(bad.ok, false); // a wrong address is a typed gap, never a guess
});
