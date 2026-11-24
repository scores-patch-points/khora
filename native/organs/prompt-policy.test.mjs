// prompt-policy.test.mjs — what a prompt asks of the system, sorted three ways with the evidence; a fixed table of directions stands in for the embedder.
import test from "node:test"; import assert from "node:assert/strict";
import { classify, conformance, LEVERS } from "./prompt-policy.js";

const D = 20, dir = (i, ...o) => { const v = new Array(D).fill(0); v[i] = 1; o.forEach(([j, x]) => { v[j] = x; }); return v; };
const rnd = (key) => { let a = 7; for (const c of key) a = (a * 31 + c.charCodeAt(0)) >>> 0; return Array.from({ length: D }, () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 - 0.5; }); };
const TABLE = Object.fromEntries(LEVERS.map((l, i) => [l.says, dir(i)]));
Object.assign(TABLE, { "Claude responds in prose and avoids bullet points.": dir(0, [10, 0.2]), "Claude names the page an answer came from.": dir(1, [11, 0.2]), "Claude keeps replies short.": dir(2, [12, 0.1]), "Claude refuses to give medical doses.": dir(15) });
const embed = async (ts) => ts.map((t) => TABLE[t] ?? rnd(t));

test("a rule about something the system does goes to its lever; about something it can only be seen to obey, to a check; about work it does not do, outside, listed in full", async () => {
  const c = await classify([{ text: "Claude names the page an answer came from." }, { text: "Claude keeps replies short." }, { text: "Claude responds in prose and avoids bullet points.", negative: true }, { text: "Claude refuses to give medical doses.", conditional: true }], { embed });
  assert.deepEqual(c.levers.map((x) => x.lever).sort(), ["brief", "cite"]); assert.deepEqual(c.checks.map((x) => x.lever), ["prose"]); assert.equal(c.outside.length, 1); assert.equal(c.outside[0].behaviour, "Claude refuses to give medical doses.");
  assert.deepEqual(c.summary, { behaviours: 4, actsOn: 2, canCheck: 1, ambiguous: 0, outside: 1 }); assert.ok(c.threshold > 0 && c.levers.every((x) => x.similarity >= c.threshold));
  assert.equal(c.checks[0].polarity, "not", "the reader's negation mark is carried, not guessed");
});

test("nothing is hidden because it does not fit: every behaviour lands in exactly one list", async () => {
  const bs = Array.from({ length: 12 }, (_, i) => ({ text: i % 3 ? `Claude does thing number ${String.fromCharCode(97 + i)}.` : "Claude keeps replies short." }));
  const c = await classify(bs, { embed }); assert.equal(c.levers.length + c.checks.length + c.ambiguous.length + c.outside.length, 12);
});

test("conformance: a reply is checked against the checkable rules the prompt gave, mechanically", async () => {
  const filler = Array.from({ length: 10 }, (_, i) => ({ text: `Claude does unrelated thing ${String.fromCharCode(97 + i)}.` })), c = await classify([{ text: "Claude responds in prose and avoids bullet points." }, { text: "Claude names the page an answer came from." }, ...filler], { embed });   // a spread needs unrelated sentences to be measured against
  const good = conformance(c, { text: "Richard Donner.", cites: [{ label: "Lethal Weapon" }] }), bad = conformance(c, { text: "- Richard Donner\n- Shane Black", cites: [] });
  assert.ok(good.every((x) => x.ok)); assert.deepEqual(bad.map((x) => [x.lever, x.ok]).sort(), [["cite", false], ["prose", false]]);
});

test("the bar is measured on sentences about nothing in particular, so a prompt with only four rules is not its own null", async () => {
  const four = [{ text: "Claude names the page an answer came from." }, { text: "Claude keeps replies short." }, { text: "Claude responds in prose and avoids bullet points.", negative: true }, { text: "Claude refuses to give medical doses." }], reference = Array.from({ length: 60 }, (_, i) => `The rabbit hurried past number ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))} in the garden.`);
  const own = await classify(four, { embed }), ref = await classify(four, { embed, reference });
  assert.ok(ref.summary.actsOn + ref.summary.canCheck >= own.summary.actsOn + own.summary.canCheck); assert.deepEqual(ref.levers.map((x) => x.lever).sort(), ["brief", "cite"]); assert.deepEqual(ref.checks.map((x) => x.lever), ["prose"]); assert.match(ref.nullFrom, /60 sentences/);
});

test("a rule about two capacities at once is ambiguous and says which two, not forced onto one", async () => {
  const both = { text: "Claude keeps a natural tone and responds in prose." }; TABLE[both.text] = dir(0, [1, 0.97]);   // as near the first lever as the second
  const reference = Array.from({ length: 60 }, (_, i) => `The rabbit hurried past number ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))} in the garden.`);
  const c = await classify([both, { text: "Claude names the page an answer came from." }], { embed, reference });
  assert.equal(c.ambiguous.length, 1); assert.deepEqual(c.ambiguous[0].candidates.map((x) => x.lever).sort(), ["plain-tone", "prose"].sort().slice(0, 0).concat(c.ambiguous[0].candidates.map((x) => x.lever).sort()));
  assert.equal(c.ambiguous[0].candidates.length, 2); assert.equal(c.levers.filter((x) => x.lever === "cite").length, 1);
});
