import test from "node:test";
import assert from "node:assert/strict";
import { makePinax, makeSpan, quoteOf, parseAddress } from "./pinax.js";
import { readCorpus } from "./callimachus.js";
import { interpret, cubeTelling, FRAME_WORDS, renderPlain, readingOrder } from "./cube-telling.js";
import { seg, sentence, lintSentence, verifyWords, cleanSpan, quotesBalance } from "./prose-laws.js";

const NOUNS = "lantern harbor meadow orchard quarry ribbon saddle tavern valley willow anchor basket candle desert engine feather garden hammer island jacket kettle ladder mirror needle".split(" ");
const BULK = NOUNS.flatMap((n, i) => NOUNS.slice(i + 1, i + 6).map((m) => `the ${n} of the ${m} was in the old ${NOUNS[(i * 7) % NOUNS.length]} and the ${m} was near it.`)).join(" ");
const A = `Maria Lopez said the budget office approved the plan. "The program saved the city money," said Maria Lopez. Daniel Reyes said the council delayed the vote. "We will fight this decision in every court," said Daniel Reyes. Daniel Reyes approved the bus route.`;
const B = `"Riders deserve better service from this city," said Maria Lopez. Maria Lopez said the council delayed the hearing. Daniel Reyes approved the depot lease. The budget office approved the plan.`;
const page = (url, text) => makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw: `<html><head><meta property="og:site_name" content="${url}"></head><p>${text}</p></html>`, text: `${text}\n\n${BULK}` }).then((r) => Object.assign(r, { declared: { published: "2026-10-01", modified: null, links: [] } }));

async function told() {
  const recs = [await page("https://a.test/1", A), await page("https://b.test/2", B)];
  const store = Object.fromEntries(recs.map((r) => [r.entry.id, r]));
  const slice = async (address) => { const p = parseAddress(address); const rec = store[p.pinax]; if (!rec) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const q = sp.ok === false ? null : await quoteOf(sp, rec); return q?.ok ? q.text : null; };
  const record = readCorpus(recs, { question: "Did Maria Lopez approve the plan?", absences: [{ type: "bot_blocked", url: "https://c.test/x" }] });
  const interp = interpret(record);
  return { record, slice, telling: await cubeTelling(record, { slice, interp }) };
}

test("all 27 cells answer, each in exactly one of four ways; SYN·Ground is a desert, REC·Pattern the author's gap", async () => {
  const { telling } = await told();
  assert.equal(telling.cells.length, 27);
  for (const c of telling.cells) assert.ok(["voiced", "silent", "gap", "desert"].includes(c.status), c.key);
  assert.equal(telling.cells.find((c) => c.key === "SYN·Ground").status, "desert");
  assert.equal(telling.cells.find((c) => c.key === "REC·Pattern").status, "gap");
  assert.ok(telling.cells.filter((c) => c.status === "voiced").length >= 10, "positive control: the fixture voices most cells");
});

test("every shipped sentence is lawful, grounded, and uses only its cell's declared frame words", async () => {
  const { telling } = await told();
  for (const c of telling.cells.filter((x) => x.status === "voiced")) for (const s of c.sentences) {
    assert.deepEqual(lintSentence(s), [], s.text);
    assert.deepEqual(verifyWords(s, FRAME_WORDS[c.key]), [], s.text);
    assert.ok(s.grounds.length, s.text);
  }
});

test("byte-addressed: every copied segment re-slices to exactly its text", async () => {
  const { telling, slice } = await told();
  let n = 0;
  for (const c of telling.cells) for (const s of c.sentences ?? []) for (const x of s.segs.filter((y) => y.kind === "source")) { n++; assert.equal(await slice(x.address), x.t); }
  assert.ok(n >= 3, `positive control: some segments were copied (${n})`);
});

test("speech is copied whole: a speaker, their verb and their words are three addressed spans", async () => {
  const { telling } = await told();
  const link = telling.cells.find((c) => c.key === "CON·Figure");
  assert.equal(link.status, "voiced");
  const s = link.sentences.find((x) => /Maria Lopez said/.test(x.text));
  assert.ok(s, link.sentences.map((x) => x.text).join(" | "));
  assert.deepEqual(s.segs.filter((x) => x.kind === "source").map((x) => x.t).slice(0, 2), ["Maria Lopez", "said"]);
});

test("controls that can fail: an undeclared frame word, a numeral opener, unbalanced quotes, citation debris", () => {
  assert.equal(verifyWords(sentence([seg.frame("The figures obviously matter.")], ["x"]), new Set(["the", "figures", "matter"]))[0].law, "PL14");
  assert.ok(lintSentence(sentence([seg.value("7"), seg.frame(" pages were read.")], ["x"])).some((v) => v.law === "PL3"));
  assert.equal(quotesBalance("He said “yes."), false);
  assert.equal(quotesBalance("It’s “fine” and ‘ok’."), true);
  const q = { ...seg.source("[ 57 ] President Trump lobbied for the bill.", "px_0000/text@000000000000#b0-44"), quoted: true };
  assert.ok(lintSentence(sentence([seg.frame("He has “"), q, seg.frame("”.")], ["x"])).some((v) => v.law === "PL8"));
  const c = cleanSpan("px_0000/text@000000000000#b10-60", "[ 57 ] President Trump lobbied for the bill.,");
  assert.equal(c.text, "President Trump lobbied for the bill.");
  assert.equal(c.address, "px_0000/text@000000000000#b17-54");
});

test("reading order is terrain by terrain, and the plain text holds every sentence in that order", async () => {
  const { telling } = await told();
  const plain = renderPlain(telling);
  let at = 0;
  for (const c of readingOrder(telling)) for (const s of c.sentences ?? []) { const i = plain.indexOf(s.text, at); assert.ok(i >= at, s.text); at = i + s.text.length; }
});

test("omnilingual: every proposition type has a construction in BOTH grammars, and the two tellings answer every cell the same way", async () => {
  const en = (await import("../adapters/text/telling-grammar.en.js")).default;
  const es = (await import("../adapters/text/telling-grammar.es.js")).default;
  const src = (await import("node:fs")).readFileSync(new URL("./cube-telling.js", import.meta.url), "utf8");
  const types = new Set([...src.matchAll(/\bP\("([a-z_]+)"/g)].map((m) => m[1]));
  assert.ok(types.size >= 30, `positive control: the lens's proposition types were read (${types.size})`);
  for (const t of types) { assert.ok(en.constructions[t], `en lacks ${t}`); assert.ok(es.constructions[t], `es lacks ${t}`); }
  const { record, slice } = await told();
  const interp = interpret(record);
  const [te, ts] = [await cubeTelling(record, { slice, interp, grammar: en }), await cubeTelling(record, { slice, interp, grammar: es })];
  // SYN·Figure is the one declared difference: Spanish declines indirect speech rather than code-switch (telling-grammar.es.js header).
  for (const c of te.cells.filter((x) => x.key !== "SYN·Figure")) assert.equal(ts.cells.find((x) => x.key === c.key).status, c.status, c.key);
});
