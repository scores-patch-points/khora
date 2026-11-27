// puzzle-reader.test.mjs — a puzzle's text, read by the reader into rows, read by the organ into readings, run by the reasoner.
// Real reader rows (needs the reader's priors; skips without them), through the same sentence splitting the thread uses. Pure rows are also
// tested by hand-built rows so the organ is checked apart from any one parser.
import test from "node:test"; import assert from "node:assert/strict";
import { readPuzzle, solve, READER } from "./puzzle-reader.js";

const BOARD = `A teacher writes six words on a board: "cat dog has max dim tag." She gives three students, Albert, Bernard and Cheryl each a piece of paper with one letter from one of the words. Then she asks, "Albert, do you know the word?" Albert immediately replies yes. She asks, "Bernard, do you know the word?" He thinks for a moment and replies, "Yes." Then, she asks Cheryl the same question. She thinks and then replies, "Yes." What is the word?`;
const CHERYL = `Albert and Bernard just became friends with Cheryl, and they want to know when her birthday is. Cheryl gave them a list of 10 possible dates: May 15, May 16, May 19, June 17, June 18, July 14, July 16, August 14, August 15, August 17. Cheryl then tells Albert and Bernard separately the month and the day of her birthday respectively. Albert: I don't know when Cheryl's birthday is, but I know that Bernard does not know too. Bernard: At first I don't know when Cheryl's birthday is, but I know now. Albert: Then I also know when Cheryl's birthday is. So when is Cheryl's birthday?`;

let sentencesOf = null, why = null;
try {
  const K = new URL("../", import.meta.url).href;
  const { rowsOfFor } = await import(K + "reading.js"), { splitSentences } = await import(K + "adapters/text/spans.js"), { priorsFor, abbreviationsFor } = await import(K + "the-fold/read-core.mjs");
  const P = await rowsOfFor("eng"), pr = priorsFor("eng");
  sentencesOf = (text) => splitSentences(text, { abbreviations: abbreviationsFor(text, { priors: pr, aliases: [], abbreviations: null }).set }).map((c, order) => ({ order, text: c.text, rows: P.rowsOf(c.text) ?? [] }));
} catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: sentencesOf ? false : `no reader here: ${why}` };

test("the board puzzle: the scene is read off the rows, six readings are listed, and exactly one holds: dog", T, () => {
  const r = readPuzzle(sentencesOf(BOARD));
  assert.equal(r.ok, true);
  assert.deepEqual(r.read.items.items, ["cat", "dog", "has", "max", "dim", "tag"]); assert.equal(r.read.items.kind, "word"); assert.equal(r.read.items.count.found, 6);
  assert.deepEqual(r.read.agents, ["Albert", "Bernard", "Cheryl"]); assert.equal(r.read.holding.partKind, "letter");
  assert.deepEqual(r.read.turns.map((t) => [t.agent, t.reply]), [["Albert", "yes"], ["Bernard", "yes"], ["Cheryl", "yes"]], "the third question is “the same question”, put to Cheryl, and she is the one who answers");
  assert.equal(r.candidates.length, 6, "three ways the letters can be held, two ways “yes” can be meant");
  const by = (h, p) => r.candidates.find((c) => c.holding === h && Object.values(c.polarity)[0] === p);
  assert.equal(by("distinct", "knows").standing, "holds"); assert.deepEqual(by("distinct", "knows").answers, ["dog"]);
  assert.equal(by("positional", "knows").standing, "refuted", "the first, second and third letters: no word fits");
  assert.equal(by("independent", "knows").standing, "open", "two may hold the same place: nothing narrows past five words");
  assert.equal(r.candidates.filter((c) => c.standing === "holds").length, 1);
  assert.equal(r.resolved.answer, "dog"); assert.equal(r.resolved.alone, true); assert.match(r.rule, /exactly one answer/);
  assert.deepEqual(by("distinct", "knows").trace.map((t) => t.answers), [5, 3, 1]);
});

test("the readings are listed, not picked: with the polarity flipped nothing resolves", T, () => {
  const s = sentencesOf(BOARD), r = readPuzzle(s);
  const flipped = r.candidates.filter((c) => Object.values(c.polarity)[0] === "does_not_know");
  assert.equal(flipped.length, 3); assert.ok(flipped.every((c) => c.standing !== "holds"));
});

test("a candidate is data: its spec, run again by the reasoner, gives the same standing", T, () => {
  const r = readPuzzle(sentencesOf(BOARD)), c = r.candidates.find((x) => x.standing === "holds");
  const again = solve(JSON.parse(JSON.stringify(c.spec)));
  assert.equal(again.standing, "holds"); assert.deepEqual(again.answers, ["dog"]);
});

test("renaming the people and the words changes nothing about the structure; the answer follows the words", T, () => {
  const text = BOARD.split("Albert").join("Xavier").split("Bernard").join("Yolanda").split("Cheryl").join("Zoe").split("cat dog has max dim tag").join("pen owl has map dim tag");
  const r = readPuzzle(sentencesOf(text));
  assert.deepEqual(r.read.agents, ["Xavier", "Yolanda", "Zoe"]);
  assert.equal(r.candidates.length, 6);
  assert.ok(r.resolved === null || ["pen", "owl", "has", "map", "dim", "tag"].includes(r.resolved.answer), "a different list may resolve to a different word, or to none, but never to a word that was not on the board");
});

test("a name the reader does not take for a name never makes a smaller puzzle: the gap says who is missing", T, () => {
  const r = readPuzzle(sentencesOf(BOARD.split("Cheryl").join("Zed")));
  if (r.read.agents.length === 3) return;   // the reader took “Zed” for a name: nothing to check here
  assert.equal(r.ok, false); assert.equal(r.candidates.length, 0); assert.ok(r.gap.kind && r.gap.detail);
});

test("Cheryl's birthday: the list and the people are read; the announcements are not, and the gap says what they are", T, () => {
  const r = readPuzzle(sentencesOf(CHERYL));
  assert.equal(r.ok, false); assert.equal(r.resolved, null); assert.deepEqual(r.candidates, []);
  assert.equal(r.read.items.items.length, 10); assert.equal(r.read.items.count.agrees, true);
  assert.ok(r.gaps.length >= 1); assert.ok(r.gaps.every((g) => g.kind && g.detail));
  assert.ok(r.gaps.some((g) => ["compound_announcement_not_read", "holding_not_read", "knowledge_about_another_not_read"].includes(g.kind)), "the gap names what a statement like “I know that Bernard does not know” would need");
});

test("no list in the text is a typed gap, not a guess", () => {
  const r = readPuzzle([{ order: 0, rows: [{ id: 1, form: "Hello", upos: "INTJ", head: 0, deprel: "root" }] }]);
  assert.equal(r.ok, false); assert.equal(r.gap.kind, "no_items");
});

test("a language with another epistemic verb needs its own reader table, and says so", T, () => {
  const r = readPuzzle(sentencesOf(BOARD), { reader: { ...READER, epistemic: ["wissen"] } });
  assert.equal(r.ok, false); assert.equal(r.gap.kind, "predicate_not_epistemic");
});
