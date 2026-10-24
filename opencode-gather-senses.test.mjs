// opencode-gather-senses.test.mjs — what a word means before it is searched: Wikipedia's primary use, or its list of senses.
//   node --test opencode-gather-senses.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const S = await import("./opencode-gather-senses.mjs");
const G = await import("./opencode-gather-gate.mjs");

const api = (pages) => async (url) => ({ ok: true, json: async () => ({ query: { pages } }) });
const urls = [];
const fetchFor = (table) => async (url) => { urls.push(url); const u = new URL(url); const key = u.searchParams.get("generator") ? `links:${u.searchParams.get("titles")}` : u.searchParams.get("titles"); return { ok: true, json: async () => ({ query: { pages: table[key] ?? [{ title: key, missing: true }] } }) }; };

test("a word with a primary use is that use; the plural redirect is followed by the API", async () => {
  const r = await S.sensesOf("jaguar", { fetchImpl: fetchFor({ jaguar: [{ title: "Jaguar", description: "Large cat native to the Americas" }] }) });
  assert.deepEqual([r.kind, r.title, r.description], ["primary", "Jaguar", "Large cat native to the Americas"]);
  assert.deepEqual(S.anchorQueries(r), ["Jaguar Large cat native to the Americas"]);
});

test("a disambiguation page gives its senses with their one-line descriptions, and no sense is chosen for the asker", async () => {
  const r = await S.sensesOf("mercury", { fetchImpl: fetchFor({ mercury: [{ title: "Mercury", pageprops: { disambiguation: "" }, description: "Topics referred to by the same term" }], "links:Mercury": [{ title: "Mercury (planet)", description: "Smallest planet" }, { title: "Mercury (element)", description: "Chemical element" }, { title: "Mercury (disambiguation)", description: "Topics referred to by the same term" }, { title: "List of places", description: "" }] }) });
  assert.equal(r.kind, "disambiguation");
  assert.deepEqual(r.senses.map((s) => s.title), ["Mercury (planet)", "Mercury (element)"]);
  assert.deepEqual(S.anchorQueries(r), [], "no anchor until a sense is chosen");
});

test("an unknown word, a long phrase and a dead API are all 'none' and never throw", async () => {
  assert.equal((await S.sensesOf("zzqx", { fetchImpl: fetchFor({}) })).kind, "none");
  assert.equal((await S.sensesOf("the history of the roman empire in the east", { fetchImpl: async () => { throw new Error("must not be called"); } })).kind, "none");
  const dead = await S.sensesOf("jaguar", { fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(dead.kind, "none");
  assert.equal(dead.failed, true);
});

test("a lookup is made once per topic: the second is read from disk", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sense-"));
  urls.length = 0;
  const f = fetchFor({ jaguar: [{ title: "Jaguar", description: "Large cat" }] });
  await S.sensesOf("jaguar", { fetchImpl: f, dir });
  const n = urls.length;
  const again = await S.sensesOf("jaguar", { fetchImpl: async () => { throw new Error("cached"); }, dir });
  assert.equal(again.kind, "primary");
  assert.equal(urls.length, n);
});

test("the sense card is answered by a SENSE line only", () => {
  const senses = [{ title: "Mercury (planet)", description: "Smallest planet" }, { title: "Mercury (element)", description: "Chemical element" }];
  assert.match(S.sensePrompt("write about mercury the metal", senses), /\[2\] Mercury \(element\) \| Chemical element/);
  assert.equal(S.parseSense("SENSE: 2", 2), 1);
  assert.equal(S.parseSense("Mercury the planet is number 1, not 2", 2), null, "a number in prose is not an answer");
  assert.equal(S.parseSense("SENSE: none", 2), null);
  assert.equal(S.parseSense("SENSE: 9", 2), null);
});

test("anchored: when most pages are another sense, the reference is the pages that plainly are the sense, not the median", () => {
  const mk = (n, share) => ({ s: { n }, share });
  // eight car pages near 0.2, three animal pages near 0.45, and the article's own copy at 1.0
  const hits = [...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => mk(n, 0.2)), mk(9, 0.4), mk(10, 0.45), mk(11, 0.5), mk(12, 1)];
  assert.deepEqual(G.doubtful(hits).map((h) => h.s.n), [], "against the median (0.2) nothing is doubtful: the wrong sense is the majority");
  assert.deepEqual(G.doubtful(hits, { anchored: true }).map((h) => h.s.n).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(G.doubtful([mk(1, 0.2), mk(2, 0.2), mk(3, 0.3), mk(4, 0.4)], { anchored: true }), [], "fewer than two pages of the sense: no reference, no verdict");
});

test("the sense an ask points at is picked from its own words, and never guessed when it does not say", () => {
  const senses = [{ title: "Mercury (planet)", description: "First planet from the Sun" }, { title: "Mercury (mythology)", description: "Roman god of trade, merchants and travel" }, { title: "Boeing E-6 Mercury", description: "Airborne command post aircraft" }];
  assert.equal(S.pickByOverlap("write me an essay about mercury the planet", "mercury", senses), 0);
  assert.equal(S.pickByOverlap("write about mercury, the Roman god", "mercury", senses), 1);
  assert.equal(S.pickByOverlap("tell me about mercury", "mercury", senses), null, "no word of the ask names a meaning");
  assert.equal(S.pickByOverlap("write about the mercury aircraft god", "mercury", senses), null, "a tie is no choice");
});
