import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax } from "./pinax.js";
import { readCorpus } from "./callimachus.js";
import { readPerspectives, edgesOf, stancesOf, STANCE_FRAMES } from "./perspectives.js";
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


test("an evaluation is a stance: 'experts argue that X is better' puts the experts on X's side; 'than X' flips it; affix antonymy extends the seed", () => {
  const stances = (text, surf) => stancesOf(text, "x", { model, focusSurfaces: surf });
  const a = stances("Scientists and health experts argue that permanent standard time is better for human health.", ["permanent standard time"]);
  const ev = a.find((r) => r.evaluation);
  assert.ok(ev, "the copular clause is read");
  assert.equal(ev.pred, "good", "better is the comparative of good (morphology prior)");
  assert.match(ev.holder.text, /experts/);
  assert.equal(ev.negated, false);
  const b = stances("The current system is better than permanent standard time for evenings.", ["permanent standard time"]);
  const flipped = b.find((r) => r.evaluation);
  assert.ok(flipped && flipped.negated === true && flipped.flipped_by_than, "the topic is what the other is better than: the evaluation is reversed");
  // CONTROL that can fail: a copular clause about something else is not a stance on the topic
  assert.ok(!stances("The weather is better in March.", ["permanent standard time"]).some((r) => r.evaluation));
});

import { discoverOptions, exclusivity, cornersOf, spectrum, optionKey } from "./options.js";
test("options come from what the pages declare; exclusivity is NOMINATED with its spans and REFUTED by a holder on both; four corners per option", () => {
  const texts = new Map([
    ["px_a", "The new analysis examines the health effects of permanent standard time versus permanent daylight saving time for riders."],
    ["px_b", "Lawmakers prefer permanent daylight saving time rather than permanent standard time in the spring."],
    ["px_c", "Fifty-six percent support permanent daylight saving time, compared to 42% for permanent standard time."],
  ]);
  const opts = discoverOptions({ texts, model, topicNames: ["permanent daylight saving time"] });
  assert.equal(opts.length, 1);
  assert.equal(opts[0].key, optionKey("permanent standard time"));
  assert.equal(opts[0].pages.length, 3);
  assert.ok(opts[0].declared.every((d) => ["versus", "rather than", "compared to"].includes(d.marker)));
  const pos = [
    { option: "topic", pole: "+", holder: "Rounds", holder_display: "Rounds", text: "a", span: "s1" },
    { option: opts[0].id, pole: "-", holder: "Doe", holder_display: "Doe", text: "b", span: "s2" },
  ];
  const ex = exclusivity(opts, pos);
  assert.equal(ex[0].status, "nominated");
  // a holder on the SAME pole of both refutes it, and the refutation names the holder and both spans
  const ex2 = exclusivity(opts, [...pos, { option: opts[0].id, pole: "+", holder: "Rounds", holder_display: "Rounds", text: "c", span: "s3" }]);
  assert.equal(ex2[0].status, "refuted");
  assert.deepEqual(ex2[0].refuted_by.map((r) => r.holder), ["Rounds"]);
  // four corners from the one lattice
  assert.equal(cornersOf("topic", pos).says, "is-not", "only an opposer is on record: is-not");
  assert.equal(cornersOf("nothing", pos).says, "neither");
  const both = cornersOf("topic", [...pos, { option: "topic", pole: "-", holder: "Lee", holder_display: "Lee", text: "d", span: "s4" }]);
  assert.equal(both.says, "both");
  // the cross-option reading is typed `consistent_with` and never asserted
  const sp = spectrum({ perspectives: { positions: pos }, options: opts });
  assert.ok(sp.implied.every((i) => i.asserted === false && i.relation === "consistent_with"));
  // CONTROL that can fail: with no declaring marker there is no option
  assert.deepEqual(discoverOptions({ texts: new Map([["px_a", "Permanent standard time is discussed widely in the press this month."]]), model, topicNames: ["permanent daylight saving time"] }), []);
});

import { withStanceAtoms, stanceAtoms } from "./perspectives.js";
import { giverOf } from "./giver.js";
test("a stance is cited to its HOLDER: it replaces the page-author atom on the same sentence; a quotation atom and other pages are untouched", () => {
  const record = {
    sources: [{ id: "px_a", byline: { authors: [{ name: "Chantelle Lee", address: "px_a/raw@aaaaaaaaaaaa#b1-5" }] } }, { id: "px_b", byline: { authors: [{ name: "Pat Quinn", address: "px_b/raw@bbbbbbbbbbbb#b1-5" }] } }],
    atoms: [
      { id: "a1", pinax: "px_a", span: "px_a/text@111111111111#b100-200", why_kind: "own_voice", _sentence: "Sleep experts have opposed it." },
      { id: "a2", pinax: "px_a", span: "px_a/text@111111111111#b300-400", why_kind: "quotation", giver: { surface: "px_a/text@111111111111#b410-420", surface_verbatim: "Maria Lopez", pronoun: false }, _sentence: "q" },
      { id: "a3", pinax: "px_b", span: "px_b/text@222222222222#b100-200", why_kind: "own_voice", _sentence: "Another page." },
    ],
  };
  const perspectives = { positions: [{ pole: "+", option: "topic", span: "px_a/text@111111111111#b100-200", text: "Sleep experts have opposed it.", holder: "experts", holder_at: "px_a/text@111111111111#b108-114", pinax: "px_a", url: "u", pred: "oppose", negated: false, basis: "asserted", via: ["Chantelle Lee"] }] };
  const out = withStanceAtoms(record, perspectives);
  assert.deepEqual(out.atoms.map((a) => a.id).filter((i) => !i.startsWith("a_s")).sort(), ["a2", "a3"], "the page-author atom on that sentence is replaced; the quotation and the other page stay");
  const st = out.atoms.find((a) => a.why_kind === "stance");
  assert.ok(st);
  const g = giverOf(st, out);
  assert.equal(g.kind, "speaker");
  assert.equal(g.names[0].name, "experts", "cited to the holder, not to the byline");
  // CONTROL that can fail: with no asked-pole row nothing changes
  assert.equal(withStanceAtoms(record, { positions: [] }), record);
  assert.equal(stanceAtoms({ positions: [{ pole: "-", span: "x", holder_at: "y", holder: "h" }] }).length, 0);
});

import { giverSlot } from "./giver.js";
import { ATTRIBUTION } from "../adapters/text/telling-grammar.en.js";
test("a CLASS holder is plural (no possessive, no singular verb); a stance sentence with an unbalanced inner quote is narrowed to the clause before it, bytes unedited", () => {
  const rec = { sources: [], atoms: [] };
  const slot = giverSlot(giverOf({ why_kind: "stance", giver: { surface: "px_a/text@111111111111#b8-14", surface_verbatim: "experts" } }, rec));
  assert.equal(slot.plural, true);
  assert.equal(ATTRIBUTION[1]({ giver: slot, quote: [] }), null, "no 'experts’s words'");
  const named = giverSlot(giverOf({ why_kind: "stance", giver: { surface: "px_a/text@111111111111#b0-11", surface_verbatim: "Maria Lopez" } }, rec));
  assert.ok(!named.plural, "a named person is not made plural");
  const text = "Senator Mike Rounds told reporters that he opposes it: “It does not work in South Dakota. I mean, kids in the dark.";
  const at = stanceAtoms({ positions: [{ pole: "+", option: "topic", span: "px_a/text@111111111111#b100-200", text, holder: "Senator Mike Rounds", holder_at: "px_a/text@111111111111#b100-119", pinax: "px_a", url: "u", pred: "oppose", negated: false, basis: "asserted", via: [] }] });
  assert.equal(at.length, 1);
  assert.equal(at[0]._sentence, "Senator Mike Rounds told reporters that he opposes it");
  const end = +/#b\d+-(\d+)$/.exec(at[0].span)[1];
  assert.equal(end, 100 + new TextEncoder().encode(at[0]._sentence).length, "the narrowed span ends exactly where the kept bytes end");
});
