// epistemic-core.test.mjs — the reasoner knows nothing of any one puzzle; two different ones go through the same code, and the
// answers are checked against what is established about them, not against anything the reasoner printed.
import test from "node:test"; import assert from "node:assert/strict";
import { makeModel, knows, considers, announce, run, saysKnows, saysDoesNotKnow, answersOf } from "./epistemic-core.js";

// ---- the word on the board: three students each hold one letter of one word (all different letters of that word), and each
// answers in turn that they know the word. Worlds: (word, who holds which letter).
const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
const WORDS = ["cat", "dog", "has", "max", "dim", "tag"];
const boardWorlds = WORDS.flatMap((word) => perms([...word]).map(([A, B, C]) => ({ word, A, B, C })));
const board = () => makeModel(boardWorlds, { Albert: (w) => w.A, Bernard: (w) => w.B, Cheryl: (w) => w.C });
const theWord = (w) => w.word;

test("the word on the board: Albert, Bernard and Cheryl each say yes in turn, and one word is left", () => {
  const r = run(board(), ["Albert", "Bernard", "Cheryl"].map((a) => saysKnows(a, theWord, "the word")), { question: theWord });
  assert.equal(r.inconsistent, false);
  assert.deepEqual(r.trace.map((t) => t.answers), [5, 3, 1], "the words still possible after each yes");
  assert.deepEqual(r.answers.map((a) => a.value), ["dog"]);
  assert.equal(r.unique, true);
  // the model also fixes who holds what: of the 36 ways, one makes all three statements true
  assert.deepEqual(r.final.worlds, [{ word: "dog", A: "o", B: "g", C: "d" }]);
});

test("the trace is the computation: a step removes exactly the worlds in which saying it would have been false", () => {
  const m = board(), step = announce(m, "Albert says yes", saysKnows("Albert", theWord).holds);
  const a = new Set(step.model.worlds), gone = new Set(step.removedWorlds);
  for (const w of m.worlds) assert.equal(knows(m, "Albert", theWord, w), a.has(w));
  assert.equal(a.size + gone.size, m.worlds.length);
  // Albert holds a letter that belongs to one word only: c, o, h, s, x, i; "tag" has none, so it is gone
  assert.ok(!step.model.worlds.some((w) => w.word === "tag"));
});

test("a different order of the worlds, and different names for the agents, give the same answer", () => {
  const shuffled = [...boardWorlds].reverse();
  const m = makeModel(shuffled, { x: (w) => w.A, y: (w) => w.B, z: (w) => w.C });
  const r = run(m, ["x", "y", "z"].map((a) => saysKnows(a, theWord)), { question: theWord });
  assert.deepEqual(r.answers.map((a) => a.value), ["dog"]);
});

test("a statement that nobody could have truthfully made is reported as inconsistent, not answered", () => {
  const m = board();
  const r = run(m, [saysDoesNotKnow("Albert", theWord), saysKnows("Albert", theWord)], { question: theWord });
  assert.equal(r.inconsistent, true);
  assert.deepEqual(r.answers, []);
});

// ---- Cheryl's birthday, never looked at while this was written: nested knowledge ("I know that he doesn't know").
const DATES = [["May", 15], ["May", 16], ["May", 19], ["June", 17], ["June", 18], ["July", 14], ["July", 16], ["August", 14], ["August", 15], ["August", 17]];
const bday = () => makeModel(DATES.map(([month, day]) => ({ month, day })), { Albert: (w) => w.month, Bernard: (w) => w.day });
const date = (w) => `${w.month} ${w.day}`;

test("Cheryl's birthday: knowledge about knowledge, one date left (July 16)", () => {
  const A1 = { label: "Albert: I don't know, and I know Bernard doesn't know", holds: (w, m) => !knows(m, "Albert", date, w) && considers(m, "Albert", w).every((v) => !knows(m, "Bernard", date, v)) };
  const B = { label: "Bernard: at first I didn't know, but now I do", holds: (w, m) => !knows(m.root, "Bernard", date, w) && knows(m, "Bernard", date, w) };
  const A2 = saysKnows("Albert", date, "the date");
  const r = run(bday(), [A1, B, A2], { question: date });
  assert.deepEqual(r.answers.map((a) => a.value), ["July 16"]);
  assert.deepEqual(r.trace.map((t) => t.after), [5, 3, 1], "worlds left after each of the three statements (July and August; then 16, 15, 17; then July 16)");
});

test("answersOf counts the worlds behind each value", () => {
  const a = answersOf(board(), theWord);
  assert.equal(a.length, 6);
  assert.ok(a.every((x) => x.worlds === 6));
});
