// verb-equivalents.test.mjs — the organ's logic, with a fixed table of directions standing in for the embedder (a codec stands in for a codec), and one live check with the
// real embedder (skipped without ollama and the POS prior).
import test from "node:test"; import assert from "node:assert/strict";
import { makeVerbEquivalence, referenceVerbs } from "./verb-equivalents.js";

const D = 24, dir = (i, ...o) => { const v = new Array(D).fill(0); v[i] = 1; o.forEach(([j, x]) => { v[j] = x; }); return v; };
const VEC = { make: dir(0, [10, 0.1]), create: dir(0, [10, 0.2]), build: dir(0, [11, 0.3]), give: dir(1, [0, 0.4]), love: dir(2), like: dir(2, [12, 0.5]), hate: dir(2, [13, 0.5]) };
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
