import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "./pinax.js";
import { readCorpus } from "./callimachus.js";
import { interpret, cubeTelling, renderPlain } from "./cube-telling.js";
import { answerLadder } from "./answer-ladder.js";
import { questionVoid } from "./question-void.js";
import { lintSentence } from "./prose-laws.js";
import { declareWhom } from "./whom.js";
import en from "../adapters/text/telling-grammar.en.js";
import es from "../adapters/text/telling-grammar.es.js";
import qen from "../adapters/text/question-grammar.en.js";
import qes from "../adapters/text/question-grammar.es.js";
import { loadModel } from "../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")));
const NOUNS = "lantern harbor meadow orchard quarry ribbon saddle tavern valley willow anchor basket candle desert engine feather garden hammer island jacket kettle ladder mirror needle".split(" ");
const BULK = NOUNS.flatMap((n, i) => NOUNS.slice(i + 1, i + 6).map((m) => `the ${n} of the ${m} was in the old ${NOUNS[(i * 7) % NOUNS.length]} and the ${m} was near it.`)).join(" ");
const A = `Daniel Reyes said the council delayed the vote. Maria Lopez approved the hiring freeze. Maria Lopez opposed the fare increase. Maria Lopez said the budget office approved the plan. "The program saved the city money," said Maria Lopez. The council approved the depot lease in March 2026. "We will fight this decision in every court," said Daniel Reyes. Daniel Reyes approved the bus route.`;
const B = `"Riders deserve better service from this city," said Maria Lopez. Maria Lopez said the council delayed the hearing. The council approved the depot lease after a long hearing. Daniel Reyes opposed the depot lease.`;
const page = (url, text) => makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw: `<p>${text}</p>`, text: `${text}\n\n${BULK}` }).then((r) => Object.assign(r, { declared: { published: "2026-10-01", modified: null, links: [] } }));

async function setup() {
  const recs = [await page("https://a.test/1", A), await page("https://b.test/2", B)];
  const store = Object.fromEntries(recs.map((r) => [r.entry.id, r]));
  const slice = async (address) => { const p = parseAddress(address); const rec = store[p.pinax]; if (!rec) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const q = sp.ok === false ? null : await quoteOf(sp, rec); return q?.ok ? q.text : null; };
  const record = readCorpus(recs, { question: "Who approved the depot lease?" });
  const interp = interpret(record);
  return { record, slice, interp };
}
const ask = async (q, { lang = en, reader = qen, whom = null } = {}) => {
  const { record, slice, interp } = await setup();
  const telling = await cubeTelling(record, { slice, interp, grammar: lang });
  const qv = questionVoid(reader.readQuestion(q, { model }), record);
  return { qv, record, ladder: await answerLadder(record, { question: qv, slice, grammar: lang, telling, whom }) };
};

test("question grammar (en): UD parse → form, admits, modality; a clause-initial wh-word is interrogative whatever the tag", () => {
  const r = (q) => qen.readQuestion(q, { model });
  assert.deepEqual([r("Who approved the depot lease?").form, r("Who approved the depot lease?").admits], ["wh", "person"]);
  assert.equal(r("When did the council approve the lease?").admits, "time");
  assert.equal(r("How many routes did Reyes approve?").admits, "quantity");
  assert.deepEqual([r("Should the city keep the depot?").form, r("Should the city keep the depot?").modality], ["deliberative", "deontic"]);
  assert.equal(r("Did the council approve the lease?").form, "polar");
});

test("question grammar (es): closed classes only, and it says so", () => {
  const r = qes.readQuestion("¿Quién aprobó el contrato?");
  assert.deepEqual([r.form, r.admits], ["wh", "person"]);
  assert.equal(qes.readQuestion("¿Por qué se retrasó la audiencia?").admits, "reason");
  assert.equal(qes.readQuestion("¿Debería la ciudad mantener el depósito?").form, "deliberative");
  assert.ok(r.gaps.some((g) => g.field === "parse"));
});

test("the question is declared as a void (EOVoidDeclaration@1), with its own id and typed gaps for what it does not state", async () => {
  const { qv } = await ask("Who approved the depot lease?");
  assert.equal(qv.schema, "EOVoidDeclaration@1");
  assert.match(qv.id, /^void:[0-9a-f]+$/);
  assert.equal(qv.cells.find((c) => c.field === "admits").declared, "person");
  assert.ok(qv.undeclared.some((u) => u.field === "cardinality"), "cardinality is not stated by the question: a typed gap, never a default");
});

test("every stage is a whole lawful answer, and each stage carries at least as much as the one below", async () => {
  const { ladder } = await ask("Who approved the depot lease?");
  const [line, para, brief, dossier] = ladder.stages;
  assert.equal(line.sentences.length, 1);
  for (const st of [line, para, brief]) for (const s of st.sentences) assert.deepEqual(lintSentence(s, en), [], s.text);
  assert.ok(para.sentences.length >= line.sentences.length && brief.sentences.length >= para.sentences.length && dossier.sentences.length >= brief.sentences.length);
  assert.ok(para.contest && ["bound", "no_margin", "contested_no_margin", "below_floor"].includes(para.contest.verdict));
  assert.equal(brief.experiencer.who, "the asker", "pathos names its experiencer");
});

test("the line answers from the record: the figure that ACTS, for the kind asked", async () => {
  const { ladder } = await ask("Who opposed the depot lease?");
  assert.match(ladder.stages[0].sentences[0].text, /Daniel Reyes opposed the depot lease/);
});

test("no evidence is not an answer: a question nothing in the record carries is refused, not filled", async () => {
  const { ladder } = await ask("When did the lighthouse keeper retire?");
  assert.equal(ladder.stages[0].verdict, "below_floor");
  assert.match(ladder.stages[0].sentences[0]?.text ?? "", /Nothing in this record carries/);
});

test("omnilingual: the same record and ladder realize in Spanish; copied bytes stay verbatim; CLDR supplies the joins", async () => {
  const { ladder } = await ask("Who opposed the depot lease?", { lang: es });
  const s = ladder.stages[0].sentences[0];
  assert.match(s.text, /^Según .*: «Daniel Reyes opposed the depot lease\.»\.$/);
  assert.deepEqual(lintSentence(s, es), []);
  const { record, slice, interp } = await setup();
  const t = await cubeTelling(record, { slice, interp, grammar: es });
  assert.ok(t.cells.filter((c) => c.status === "voiced").length >= 10);
  assert.match(renderPlain(t), /Qué se leyó/);
  for (const c of t.cells) for (const x of (c.sentences ?? []).flatMap((y) => y.segs.filter((g) => g.kind === "source"))) assert.equal(await slice(x.address), x.t);
});

test("the fold contract holds on every stage: every source segment is addressed, and each stage reports its seams and its mouth", async () => {
  const { ladder } = await ask("Who approved the depot lease?");
  for (const st of ladder.stages) {
    assert.equal(st.seams.contract.ok, true, `${st.size}: ${JSON.stringify(st.seams.contract.violations)}`);
    assert.ok(st.seams.addressedShare > 0 && st.seams.addressedShare <= 1, `${st.size} has addressed bytes`);
    assert.equal(st.seams.mouthShare, 0, "no model call is made in the ladder: the mouth's share is exactly zero, as a number");
    assert.ok(Math.abs(st.seams.addressedShare + st.seams.seamDensity - 1) < 1e-9);
  }
  assert.equal(ladder.whom.declared, false, "without a whom the result says so rather than implying one");
  assert.equal(ladder.distance, null);
});

test("a refused question still reports its contract: all seam, no addressed bytes, no invention", async () => {
  const { ladder } = await ask("When did the lighthouse keeper retire?");
  assert.equal(ladder.stages[0].seams.contract.ok, true);
  assert.equal(ladder.stages[0].seams.addressedShare, 0);
});

test("two whoms, the same words, one record: distance differs, the lead stays addressed, and the placeholder is gone", async () => {
  const q = "Who approved the depot lease?";
  const base = await ask(q);
  const leadAtom = base.ladder.stages[0].lead.atom;

  const far = declareWhom({ giver: "reader-B", told: [], seen: [] });
  const near = declareWhom({ giver: "reader-A", told: [leadAtom], seen: [] });
  const voidReader = declareWhom({ kind: "void", told: [], seen: [] });

  const a = (await ask(q, { whom: near })).ladder, b = (await ask(q, { whom: far })).ladder, v = (await ask(q, { whom: voidReader })).ladder;
  assert.ok(a.distance.touched > 0 && a.distance.touched === b.distance.touched, "one universe: both whoms touch the same claims");
  assert.equal(b.distance.told, 1, "the empty whom is at the catalog pole");
  assert.ok(a.distance.told < b.distance.told, "the reader who was told the lead claim is nearer");
  assert.equal(v.distance.pole, "catalog");
  assert.equal(a.stages[2].experiencer.who, "reader-A", "pathos is declared for a named whom, not 'the asker'");
  assert.match(a.stages[2].experiencer.read, /1 told claims/);
  for (const l of [a, b, v]) for (const st of l.stages) assert.equal(st.seams.contract.ok, true);
  // far reader: exactly the base answer. Near reader: the claim they were already told is no longer the lead.
  assert.equal(b.stages[0].lead.atom, leadAtom);
  assert.notEqual(a.stages[0].lead.atom, leadAtom, "the lens re-orders by what the whom holds: held is placed after fresh");
  assert.deepEqual(a.stages[0].held, [], "the near reader's line is a claim that is new to them");
  assert.deepEqual(b.stages[0].held, []);
  assert.equal(base.ladder.stages[0].held, undefined, "no whom declared, no held claim is made");
  // the held claim is accounted for in every stage: placed typed as held, or on the drop list with its own reason (never silently gone)
  for (const st of a.stages.slice(0, 3)) {
    const placed = st.held.map((h) => h.atom), dropped = st.droppedHeld.map((h) => h.atom);
    assert.ok(placed.includes(leadAtom) || dropped.includes(leadAtom), `${st.size}: the held lead is placed typed held or dropped as held`);
    assert.equal(placed.filter((x) => dropped.includes(x)).length, 0);
  }
  assert.ok(a.stages[0].droppedHeld.some((h) => h.atom === leadAtom && /already told to this whom/.test(h.text)), "the line has room for one claim: the held lead is a typed drop");
  for (const x of a.stages.flatMap((st) => st.sentences).filter((y) => y.heldBy)) assert.equal(x.heldBy.kind, "held");
  assert.deepEqual(b.stages.slice(0, 3).flatMap((st) => st.droppedHeld), [], "the far reader had nothing held to leave out");
  // the same words, the same whom's holdings, the same output: byte-identical
  const a2 = (await ask(q, { whom: declareWhom({ giver: "reader-A", told: [leadAtom], seen: [] }) })).ladder;
  const texts = (l) => l.stages.map((st) => st.sentences.map((x) => x.text));
  assert.deepEqual(texts(a2), texts(a));
  // swap-null: differences follow the HOLDINGS, not the giver. Reader-B holding what A held reads what A read; A holding nothing reads what B read.
  const bWithAHoldings = (await ask(q, { whom: declareWhom({ giver: "reader-B", told: [leadAtom], seen: [] }) })).ladder;
  const aWithNothing = (await ask(q, { whom: declareWhom({ giver: "reader-A", told: [], seen: [] }) })).ladder;
  assert.deepEqual(texts(bWithAHoldings), texts(a));
  assert.deepEqual(texts(aWithNothing), texts(b));
  // a whom holding something the question never touches changes nothing
  const unrelated = (await ask(q, { whom: declareWhom({ giver: "reader-C", told: ["a_not_in_this_record"], seen: [] }) })).ladder;
  assert.deepEqual(texts(unrelated), texts(b));
});

test("a whom told everything the question touches is answered with the lead, typed held — a reminder, never presented as new", async () => {
  const q = "Who approved the depot lease?";
  const { record, ladder: base } = await ask(q);
  const all = declareWhom({ giver: "reader-D", told: new Map(record.atoms.map((a) => [a.id, "out/earlier#s0"])), seen: [] });
  const { ladder } = await ask(q, { whom: all });
  assert.equal(ladder.stages[0].lead.atom, base.stages[0].lead.atom, "nothing is fresh, so the lead is the record's lead");
  assert.equal(ladder.stages[0].held.length, 1);
  assert.equal(ladder.stages[0].held[0].at, "out/earlier#s0");
  assert.equal(ladder.stages[0].sentences[0].heldBy.kind, "held");
  assert.equal(ladder.distance.told, 0);
  assert.equal(ladder.distance.pole, "held");
});
