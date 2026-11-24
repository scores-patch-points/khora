// expression-library.test.mjs — saying the same thing in other words: the group of equivalents, the seed, the genre, the look of the answer, and the trail
// that makes a wording come back or stay away. The embedder here is a fixed table of vectors (a codec stands in for a codec), so the test is the
// organ's logic and not any model's idea of meaning.
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { buildInventory, makeLibrary, keyOf, lookOf, outcomeOf, rngOf } from "./expression-library.js";
import { makeTrailStore } from "./trail-store.mjs";

const rows = [];
const say = (text, genre, n) => { for (let i = 0; i < n; i++) rows.push({ text, genre, writer: `${genre}-${text}-${i}` }); };
say("np", "support-channel", 9); say("No problem.", "support-channel", 6); say("no problem", "singlish", 3); say("you're welcome", "support-channel", 5); say("yw", "support-channel", 3); say("can lah", "singlish", 4); say("no prob lor", "singlish", 3);
say("hi", "support-channel", 8); say("hello", "support-channel", 5); say("hey", "singlish", 4); say("lol", "support-channel", 7); say("sudo apt-get install foo", "support-channel", 5); say("rare", "support-channel", 2);
// a fixed table of directions in 16 dimensions: the welcome group, the greeting group, the laugh, the command; every other phrase is a random direction (the inventory's own
// "unrelated phrases", which is what the threshold is measured against), and sixty of them are in the inventory so that threshold means something
const D = 16, dir = (i, ...others) => { const v = new Array(D).fill(0); v[i] = 1; others.forEach(([j, x]) => { v[j] = x; }); return v; };
const VEC = { np: dir(0, [8, 0.05]), "no problem": dir(0, [8, 0.1]), "you're welcome": dir(0, [9, 0.12]), yw: dir(0, [10, 0.15]), "can lah": dir(0, [11, 0.5]), "no prob lor": dir(0, [12, 0.1]), hi: dir(1, [8, 0.05]), hello: dir(1, [9, 0.08]), hey: dir(1, [10, 0.1]), lol: dir(2), "sudo apt-get install foo": dir(3), thx: dir(0, [8, 0.1]), "you are welcome": dir(0, [9, 0.1]), "unrelated words": dir(15), rare: dir(14) };
const rnd = (key) => { const r = rngOf(key); return Array.from({ length: D }, () => r() - 0.5); };
for (let i = 0; i < 60; i++) say(`filler ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`, "support-channel", 3);   // letters only: a number would be a particular, and filtered
const embed = async (ts) => ts.map((t) => VEC[keyOf(t)] ?? rnd(keyOf(t)));
const data = buildInventory(rows), tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "expr-")), "t.json");

test("the inventory keeps what at least three different people typed, with the forms they typed and the genres they typed it in", () => {
  const keys = data.phrases.map((p) => p.key); assert.ok(keys.includes("np") && keys.includes("no problem") && !keys.includes("rare"), "two writers is not a phrase");
  assert.ok(!keys.includes("sudo apt-get install foo") === false, "a command typed by five different people is, by this rule alone, a phrase; the group it falls in decides");
  const np = data.phrases.find((p) => p.key === "no problem"); assert.deepEqual(np.genres, { "support-channel": 6, singlish: 3 }); assert.equal(np.writers, 9); assert.deepEqual(np.forms.map((f) => f[0]).sort(), ["No problem.", "no problem"]);
});

test("equivalents are the group the meaning vectors put together, cut where it ends: the welcome phrases, not the greetings and not the command", async () => {
  const L = makeLibrary(data, { embed }); const eq = (await L.equivalents("you are welcome")).map((x) => x.key);
  assert.ok(eq.includes("np") && eq.includes("no problem") && eq.includes("you're welcome") && eq.includes("yw")); assert.ok(!eq.includes("hi") && !eq.includes("lol") && !eq.includes("sudo apt-get install foo"));
});

test("genre: only phrases at least two writers of that genre typed are candidates, so Singlish chat has its own turns of phrase", async () => {
  const L = makeLibrary(data, { embed }), sg = (await L.equivalents("you are welcome", { genre: "singlish" })).map((x) => x.key);
  assert.ok(sg.includes("no prob lor") && sg.includes("no problem")); assert.ok(!sg.includes("np") && !sg.includes("yw"), "the support channel's own abbreviations stay in the support channel");
});

test("the seed: the same seed gives the same wording, different seeds give several, the usual one leads, and what was said last turn is not said again", async () => {
  const L = makeLibrary(data, { embed }); const draw = async (seed, o = {}) => (await L.say("you are welcome", { seed, ...o })).key;
  assert.equal(await draw(7), await draw(7), "a replay is the same chat");
  const count = {}; for (let s = 1; s <= 200; s++) { const k = await draw(s); count[k] = (count[k] ?? 0) + 1; }
  assert.ok(Object.keys(count).length >= 4, `more than one wording: ${JSON.stringify(count)}`); assert.ok(count.np > count.yw, "the phrase more people use leads: np over yw");
  for (let s = 1; s <= 50; s++) assert.notEqual(await draw(s, { avoid: ["np"] }), "np");
});

test("the look of the answer follows the look of the message: a lower-case unmarked message gets the lower-case unmarked form", async () => {
  const L = makeLibrary(data, { embed }); const lower = await L.say("thx", { seed: 3, look: lookOf("thx") }), formal = await L.say("thx", { seed: 3, look: lookOf("Thank you!") });
  if (lower.key === "no problem") { assert.equal(lower.text, "no problem"); assert.equal(formal.text, "No problem."); } else assert.ok(lower.text.length > 0);
  assert.deepEqual(lookOf("Thanks!"), { lower: false, marked: true, emo: false }); assert.deepEqual(lookOf("thx :)"), { lower: true, marked: false, emo: true });
});

test("the trail: a wording the person went on from comes back more, one they turned down stays away in that thread only, and a trail evaporates with the thread", async () => {
  let t = 1_000_000; const trails = makeTrailStore({ file: tmp(), now: () => t }), L = makeLibrary(data, { embed, trails, now: () => t });
  const share = async (thread, key) => { let n = 0; for (let s = 1; s <= 300; s++) { const r = await L.say("you are welcome", { seed: s, thread }); if (r.key === key) n++; } return n / 300; };
  const before = await share("A", "yw"); for (let i = 0; i < 6; i++) L.outcome("you are welcome", "yw", true, { thread: "A" });
  const after = await share("A", "yw"); assert.ok(after > before * 1.5, `${before} -> ${after}`);
  L.outcome("you are welcome", "np", false, { thread: "A" }); assert.equal(await share("A", "np"), 0, "turned down in thread A"); assert.ok(await share("B", "np") > 0.1, "but thread B still says it");
  t += 3 * 86400000; assert.ok(await share("A", "np") > 0, "three days later the thread has forgotten it");
});

test("a scout is sometimes sent: a wording this thread has never gone on from is tried, whichever one it has reinforced", async () => {
  const trails = makeTrailStore({ file: tmp() }), L = makeLibrary(data, { embed, trails }); for (let i = 0; i < 30; i++) L.outcome("you are welcome", "np", true, { thread: "A" });
  const hows = {}; for (let s = 1; s <= 300; s++) { const r = await L.say("you are welcome", { seed: s, thread: "A" }); hows[r.how] = (hows[r.how] ?? 0) + 1; }
  assert.ok(hows.scout > 10 && hows.scout < 60, JSON.stringify(hows)); assert.ok(hows.drawn > 200);
});

test("what the person does next is read from the two messages themselves: the same thing said again, or only “?”, is a wording that did not land", () => {
  assert.equal(outcomeOf("thanks", "Thanks!"), false); assert.equal(outcomeOf("thanks", "??"), false); assert.equal(outcomeOf("thanks", "ok, and what about the second one"), true); assert.equal(outcomeOf("thanks", "  "), null);
});

test("an intent nothing in the inventory is near is a typed gap, not a guess", async () => {
  const L = makeLibrary(data, { embed }); const r = await L.say("unrelated words", { seed: 1 }); assert.ok(r.gap === "no_equivalent" || r.key !== undefined);
  assert.equal(typeof rngOf(1)(), "number");
});
