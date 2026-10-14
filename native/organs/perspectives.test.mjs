import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax } from "./pinax.js";
import { readCorpus } from "./callimachus.js";
import { readPerspectives, edgesOf, STANCE_FRAMES } from "./perspectives.js";
import { readRows } from "./claim-realize.js";
import { loadModel } from "../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")), { morphology: JSON.parse(readFileSync(join(here, "../priors/morphology-eng.json"), "utf8")) });
const NOUNS = "lantern harbor meadow orchard quarry ribbon saddle tavern valley willow anchor basket candle desert engine feather garden hammer island jacket kettle ladder mirror needle".split(" ");
const BULK = NOUNS.flatMap((n, i) => NOUNS.slice(i + 1, i + 6).map((m) => `the ${n} of the ${m} was in the old ${NOUNS[(i * 7) % NOUNS.length]} and the ${m} was near it.`)).join(" ");
const TEXT_A = `Daniel Reyes approved the Sunshine Bill, but Maria Lopez opposed the Sunshine Bill. Rosa Diaz did not approve the Sunshine Bill. Maria Lopez said the council delayed the vote. Daniel Reyes approved the bus route. Maria Lopez opposed the fare increase. "I support the Sunshine Bill," said Daniel Reyes. "The program saved the city money," said Maria Lopez.`;
const TEXT_B = `Critics say the Sunshine Bill would harm riders. The council approved the depot lease. Daniel Reyes opposed the depot lease. "We will fight the Sunshine Bill in every court," said Daniel Reyes.`;
const AUTHOR = { "https://a.test/1": "Pat Quinn", "https://b.test/2": "Sam Ortiz" };
const page = (url, text) => makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw: `<html><head><meta property=article:author content="${AUTHOR[url]}"/></head><body><p>${text}</p></body></html>`, text: `${text}\n\n${BULK}` }).then((r) => Object.assign(r, { declared: { published: "2026-10-01", modified: null, links: [] } }));

async function setup() {
  const recs = [await page("https://a.test/1", TEXT_A), await page("https://b.test/2", TEXT_B)];
  const record = readCorpus(recs, { question: "Who opposed the Sunshine Bill?" });
  const texts = new Map(recs.map((r) => [r.entry.id, `${r.layers.text instanceof Uint8Array ? new TextDecoder().decode(r.layers.text) : r.layers.text}`]));
  return { record, texts };
}

test("a contrast conjunction sets two predicates against each other; negation flips the parity", () => {
  const e1 = edgesOf(readRows(model, "Daniel Reyes approved the Sunshine Bill, but Maria Lopez opposed the Sunshine Bill."));
  assert.deepEqual(e1.map((e) => [e.a, e.b, e.parity, e.kind]), [["approve", "oppose", 1, "contrast"]]);
  const e2 = edgesOf(readRows(model, "The Senate passed the bill in 2022 but did not become law."));
  assert.deepEqual(e2.map((e) => e.parity), [0], "'A but not B' sets A and B on the SAME side of what they are contrasted for");
});

test("poles come from the corpus: the asked predicate is +, its contrast is -, a negated contrast is +; unlinked predicates are unresolved", async () => {
  const { record, texts } = await setup();
  const q = { focus: [], reading: { relation: { lemma: "oppose" } } };
  const r = readPerspectives(record, { model, question: q, texts, topicSurfaces: ["sunshine bill"] });
  const by = (name) => r.positions.find((p) => p.holder === name);
  assert.equal(by("Maria Lopez")?.pole, "+", "she opposed it");
  assert.equal(by("Daniel Reyes")?.pole === "-" || r.positions.filter((p) => p.holder === "Daniel Reyes").some((p) => p.pole === "-"), true, "he approved it: the opposite pole");
  assert.equal(by("Rosa Diaz")?.pole, "+", "'did not approve' is on the asked side");
  assert.ok(r.poles["-"].includes("approve") && r.poles["+"].includes("oppose"));
  // the stance is the HOLDER'S, never the page author's
  assert.ok(!r.positions.some((p) => p.holder === "Pat Quinn" || p.holder === "Sam Ortiz"));
  assert.ok(r.positions.every((p) => p.via.every((v) => ["Pat Quinn", "Sam Ortiz"].includes(v))));
});

test("the topic as AGENT is an effect, not a stance toward it: typed refusal, no side", async () => {
  const { record, texts } = await setup();
  const q = { focus: [], reading: { relation: { lemma: "oppose" } } };
  const r = readPerspectives(record, { model, question: q, texts, topicSurfaces: ["sunshine bill"] });
  assert.ok(!r.positions.some((p) => p.pred === "harm"));
  assert.ok(r.refused.some((x) => x.why === "topic_as_agent" && x.pred === "harm") || r.unresolved.every((x) => x.pred !== "harm"));
});

test("CONTROL that can fail: with no contrast construction in the corpus nothing but the asked predicate resolves", async () => {
  const recs = [await page("https://a.test/1", "Daniel Reyes approved the Sunshine Bill. Maria Lopez opposed the Sunshine Bill. Rosa Diaz said the council delayed the vote. Maria Lopez opposed the fare increase. Daniel Reyes approved the bus route.")];
  const record = readCorpus(recs, { question: "x" });
  const texts = new Map(recs.map((r) => [r.entry.id, new TextDecoder().decode(r.layers.text)]));
  const r = readPerspectives(record, { model, question: { focus: [], reading: { relation: { lemma: "oppose" } } }, texts, topicSurfaces: ["sunshine bill"] });
  assert.ok(r.unresolved.some((x) => x.pred === "approve" && x.why === "predicate_not_linked_to_asked"), "approve is not guessed to be the opposite of oppose");
  assert.deepEqual(r.poles["-"], []);
});

import { huntPlan, probeQuestions } from "./stance-probes.js";
test("the hunt plan asks for the EMPTY pole in plain words, asked pole first; a filled spectrum asks for nothing", async () => {
  const filled = { asked: "oppose", positions: [{ pole: "+", holder: "Maria Lopez" }, { pole: "-", holder: "Daniel Reyes" }] };
  assert.deepEqual(huntPlan(filled, { topic: "the Sunshine Bill" }).probes, []);
  const noCon = { asked: "oppose", positions: [{ pole: "-", holder: "Daniel Reyes" }, { pole: "+", holder: "he" }] };
  const plan = huntPlan(noCon, { topic: "the Sunshine Bill" });
  assert.deepEqual(plan.need, ["+"], "a pronoun is not a holder: the asked pole is still empty");
  assert.equal(plan.probes[0].q, "Who is against the Sunshine Bill?");
  assert.ok(plan.probes.some((p) => p.q === "Who doesn't like the Sunshine Bill?"));
  assert.ok(plan.probes.every((p) => p.pole === "con"));
  assert.ok(probeQuestions("the Act").length > 10);
});

import { answerLadder, candidatesOf } from "./answer-ladder.js";
import { parseAddress, makeSpan, quoteOf } from "./pinax.js";
import { questionVoid } from "./question-void.js";
import qen from "../adapters/text/question-grammar.en.js";
import en from "../adapters/text/telling-grammar.en.js";
import { interpret, cubeTelling } from "./cube-telling.js";

test("the ladder does not let a supporter lead 'who opposed …' when an opposer is on record (the regression); with no opposer nothing is dropped", async () => {
  const recs = [await page("https://a.test/1", TEXT_A), await page("https://b.test/2", TEXT_B)];
  const store = Object.fromEntries(recs.map((r) => [r.entry.id, r]));
  const slice = async (address) => { const p = parseAddress(address); const rec = store[p.pinax]; if (!rec) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const q = sp.ok === false ? null : await quoteOf(sp, rec); return q?.ok ? q.text : null; };
  const record = readCorpus(recs, { question: "Who opposed the Sunshine Bill?" });
  const texts = new Map(recs.map((r) => [r.entry.id, new TextDecoder().decode(r.layers.text)]));
  const qv = questionVoid(qen.readQuestion("Who opposed the Sunshine Bill?", { model }), record);
  const telling = await cubeTelling(record, { slice, interp: interpret(record), grammar: en });
  // positions as perspectives.js would state them, put on the candidates the ladder actually has: one asked-side, one wrong-side
  const cands = candidatesOf(record, {});
  assert.ok(cands.length >= 2, "the record has candidates");
  const mine = { positions: [{ pole: "+", span: cands[0].span, holder: "A" }, { pole: "-", span: cands[1].span, holder: "B" }] };
  const base = await answerLadder(record, { question: qv, slice, grammar: en, telling });
  const withS = await answerLadder(record, { question: qv, slice, grammar: en, telling, perspectives: mine });
  assert.ok(!base.wrong_side);
  assert.deepEqual(withS.wrong_side.map((x) => x.atom), [cands[1].id], "only the wrong-pole candidate is set aside, typed");
  assert.equal(withS.candidates, base.candidates - 1);
  // CONTROL that can fail: no holder on the asked pole → nothing is dropped
  const onlyPro = { positions: [{ pole: "-", span: cands[1].span, holder: "B" }] };
  const kept = await answerLadder(record, { question: qv, slice, grammar: en, telling, perspectives: onlyPro });
  assert.ok(!kept.wrong_side);
  assert.equal(kept.candidates, base.candidates);
});

