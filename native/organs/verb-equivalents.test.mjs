// verb-equivalents.test.mjs — the organ's logic, with a fixed table of directions standing in for the embedder (a codec stands in for a codec), and one live check with the
// real embedder (skipped without ollama and the POS prior).
import test from "node:test"; import assert from "node:assert/strict";
import { makeVerbEquivalence, referenceVerbs, standsIn } from "./verb-equivalents.js";

const D = 24, dir = (i, ...o) => { const v = new Array(D).fill(0); v[i] = 1; o.forEach(([j, x]) => { v[j] = x; }); return v; };
const VEC = { make: dir(0, [10, 0.1]), create: dir(0, [10, 0.2]), build: dir(0, [11, 0.3]), give: dir(1, [0, 0.4]), love: dir(2), like: dir(2, [12, 0.5]), hate: dir(2, [13, 0.5]), craft: dir(0, [14, 2.3]) };
const rnd = (key) => { let a = 0; for (const c of key) a = (a * 31 + c.charCodeAt(0)) >>> 0; return Array.from({ length: D }, () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 - 0.5; }); };
const embed = async (ts) => ts.map((t) => VEC[t.replace(/^to /, "")] ?? rnd(t));
const reference = Array.from({ length: 80 }, (_, i) => `ref${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`);

test("verbs that say the same thing are found in the pool, nearest first, above the spread of random verbs; the others are not", async () => {
  const E = makeVerbEquivalence({ embed, reference }), eq = await E.equivalents("make", ["create", "build", "give", "love"]);
  assert.deepEqual(eq.map((x) => x.verb), ["create", "build"]); assert.ok(eq[0].similarity > eq[1].similarity); assert.ok(eq.every((x) => x.mutual));
  assert.ok((await E.threshold()) > 0 && (await E.threshold()) < eq[1].similarity, "the threshold is the null's, and the equivalents are above it");
});

test("the verb itself is never its own equivalent, an empty pool gives nothing, and a pool with nothing near it gives nothing", async () => {
  const E = makeVerbEquivalence({ embed, reference });
  assert.deepEqual((await E.equivalents("make", ["make"])).map((x) => x.verb), []); assert.deepEqual(await E.equivalents("make", []), []); assert.deepEqual(await E.equivalents("make", ["give", "love"]), []);
});

test("opposites that an embedding puts together are the reader's to separate, and this organ says so by returning both (it does not pretend to tell them apart)", async () => {
  const E = makeVerbEquivalence({ embed, reference }), eq = await E.equivalents("love", ["like", "hate"]);
  assert.deepEqual(new Set(eq.map((x) => x.verb)), new Set(["like", "hate"]));
});

test("live: with the real embedder, 'make' finds 'create' in a pool of verbs and 'give' is not an equivalent", async (t) => {
  let ok = null; try { const N = new URL("../", import.meta.url).href, { priorsFor } = await import(N + "the-fold/read-core.mjs"), { makeEmbedder } = await import(N + "adapters/text/embed-personhood.js"), e = makeEmbedder({ prefix: "classification: " }); const ref = referenceVerbs(priorsFor("eng").posPrior); if (ref.length < 60) throw new Error("no prior"); ok = { e, ref }; } catch (e) { t.skip(`no embedder or prior: ${String(e?.message).slice(0, 60)}`); return; }
  const E = makeVerbEquivalence({ embed: (x) => ok.e.embed(x), reference: ok.ref }), eq = await E.equivalents("make", ["create", "give", "run"]); ok.e.save();
  assert.ok(eq.some((x) => x.verb === "create"), JSON.stringify(eq)); assert.ok(!eq.some((x) => x.verb === "run"));
});

// ---- the DMD guard: a near verb stands in only when choosing among the near verbs would not move the answer
const eqs = [{ verb: "created", similarity: 0.93, mutual: true }, { verb: "built", similarity: 0.88, mutual: true }];
test("DMD guard: near verbs that give the same answer stand in, nearest first, and every verb that agreed is named", async () => {
  const r = await standsIn(eqs, async (v) => ({ created: ["Anthropic"], built: ["Anthropic"] })[v]);
  assert.equal(r.verdict, "same"); assert.equal(r.chosen.verb, "created"); assert.deepEqual(r.agreeing, ["created", "built"]); assert.deepEqual(r.chosen.answer, ["Anthropic"]);
});
test("DMD guard: near verbs that give different answers make a difference, so none is picked and both are listed under their verb", async () => {
  const r = await standsIn(eqs, async (v) => ({ created: ["Anthropic"], built: ["Acme"] })[v]);
  assert.equal(r.verdict, "other"); assert.equal(r.chosen, null); assert.deepEqual(r.answers.map((x) => [x.verb, x.answer[0]]), [["created", "Anthropic"], ["built", "Acme"]]);
});
test("DMD guard: a verb with no answer does not vote; one candidate with an answer stands alone; nothing heard leaves the gap", async () => {
  const one = await standsIn(eqs, async (v) => (v === "built" ? ["Acme", "Acme"] : null)); assert.equal(one.verdict, "same"); assert.equal(one.chosen.verb, "built"); assert.deepEqual(one.chosen.answer, ["Acme"]);
  const none = await standsIn(eqs, async () => []); assert.equal(none.verdict, "none"); assert.equal(none.chosen, null); assert.deepEqual(none.tried, ["created", "built"]);
  assert.equal((await standsIn([], async () => ["x"])).verdict, "none");
});
test("DMD guard: answers are compared as sets, in any order; and the caller must say how the fold is asked", async () => {
  const r = await standsIn(eqs, async (v) => (v === "created" ? ["A", "B"] : ["B", "A"])); assert.equal(r.verdict, "same");
  await assert.rejects(() => standsIn(eqs), /answerFor/);
});
test("DMD guard: a rival answer under a verb that is not near enough is said beside the answer, never blocks it, never votes", async () => {
  const ask = async (v) => ({ created: ["Anthropic"], built: ["Acme"], made: ["Anthropic"] })[v];
  const r = await standsIn([{ verb: "created", similarity: 0.93, mutual: true }], ask, { rivals: ["built", "made", "sang"] });
  assert.equal(r.verdict, "same"); assert.equal(r.chosen.verb, "created"); assert.deepEqual(r.alsoSays, [{ verb: "built", answer: ["Acme"] }], "the verb that agrees is not a rival, one with no answer is not a rival");
  assert.deepEqual((await standsIn([{ verb: "created", similarity: 0.93, mutual: true }], ask)).alsoSays, []);
});

test("near misses: with a band, verbs just below the bar come back after the ones that clear it, flagged; without a band they do not; the bar and its spread are exposed", async () => {
  const E = makeVerbEquivalence({ embed, reference }), pool = ["create", "build", "craft", "love"], sp = await E.spread();
  assert.deepEqual((await E.equivalents("make", pool)).map((x) => x.verb), ["create", "build"], "default: unchanged, no near misses");
  const b = await E.equivalents("make", pool, { band: 1 });
  assert.deepEqual(b.map((x) => [x.verb, x.near_miss]), [["create", false], ["build", false], ["craft", true]], "the near miss comes last and is flagged; the unrelated verb is not offered");
  assert.ok(sp.sd > 0 && b[2].similarity < sp.bar && b[2].similarity >= sp.nearMissFloor && sp.nearMissFloor < sp.bar, JSON.stringify({ sp, sim: b[2].similarity }));
});
test("near misses in the list are rivals for standsIn: they never become the answer and never block it, but a different answer under one is said beside it", async () => {
  const list = [{ verb: "created", similarity: 0.93, mutual: true, near_miss: false }, { verb: "built", similarity: 0.85, mutual: true, near_miss: true }];
  const r = await standsIn(list, async (v) => ({ created: ["Anthropic"], built: ["Acme"] })[v]);
  assert.equal(r.verdict, "same"); assert.equal(r.chosen.verb, "created"); assert.deepEqual(r.agreeing, ["created"]); assert.deepEqual(r.alsoSays, [{ verb: "built", answer: ["Acme"] }]); assert.deepEqual(r.tried, ["created"]);
  assert.deepEqual((await standsIn(list, async (v) => ({ created: ["Anthropic"], built: ["Anthropic"] })[v])).alsoSays, [], "a near miss that agrees is not a rival");
  assert.equal((await standsIn([list[1]], async () => ["Acme"])).verdict, "none", "a near miss alone is not a candidate");
});
