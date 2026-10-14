import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "./pinax.js";
import { readCorpus } from "./callimachus.js";
import { interpret, cubeTelling, renderPlain } from "./cube-telling.js";
import { answerLadder } from "./answer-ladder.js";
import { readWhom, heldIn, VOID_READER } from "./whom.js";
import { questionVoid } from "./question-void.js";
import { lintSentence } from "./prose-laws.js";
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
const AUTHOR = { "https://a.test/1": "Pat Quinn", "https://b.test/2": "Sam Ortiz" };
const page = (url, text) => makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw: `<html><head><meta property=article:author content="${AUTHOR[url] ?? ""}"/></head><body><p>${text}</p></body></html>`, text: `${text}\n\n${BULK}` }).then((r) => Object.assign(r, { declared: { published: "2026-10-01", modified: null, links: [] } }));

async function setup() {
  const recs = [await page("https://a.test/1", A), await page("https://b.test/2", B)];
  const store = Object.fromEntries(recs.map((r) => [r.entry.id, r]));
  const slice = async (address) => { const p = parseAddress(address); const rec = store[p.pinax]; if (!rec) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const q = sp.ok === false ? null : await quoteOf(sp, rec); return q?.ok ? q.text : null; };
  const record = readCorpus(recs, { question: "Who approved the depot lease?" });
  const interp = interpret(record);
  return { record, slice, interp };
}
const ask = async (q, { lang = en, reader = qen } = {}) => {
  const { record, slice, interp } = await setup();
  const telling = await cubeTelling(record, { slice, interp, grammar: lang });
  const qv = questionVoid(reader.readQuestion(q, { model }), record);
  return { qv, record, ladder: await answerLadder(record, { question: qv, slice, grammar: lang, telling }) };
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
  for (const st of [line, para, brief]) assert.ok(["bound", "contradicted", "contested", "unbound"].includes(st.verdict) && st.corner.says, `${st.size}: ${st.verdict}`);
  assert.equal(brief.experiencer.who, "the asker", "pathos names its experiencer");
});

test("the line answers from the record: the figure that ACTS, for the kind asked", async () => {
  const { ladder } = await ask("Who opposed the depot lease?");
  assert.match(ladder.stages[0].sentences[0].text, /Daniel Reyes opposed the depot lease/);
});

test("no evidence is not an answer: a question nothing in the record carries is refused, not filled", async () => {
  const { ladder } = await ask("When did the lighthouse keeper retire?");
  assert.equal(ladder.stages[0].verdict, "unbound", "the void's outcome is hl.js's own string: neither");
  assert.equal(ladder.stages[0].corner.says, "neither");
  assert.match(ladder.stages[0].sentences[0]?.text ?? "", /Nothing in this record carries/);
});

test("omnilingual: the same record and ladder realize in Spanish; copied bytes stay verbatim; CLDR supplies the joins", async () => {
  const { ladder } = await ask("Who opposed the depot lease?", { lang: es });
  const s = ladder.stages[0].sentences[0];
  assert.match(s.text, /^(Pat Quinn|Sam Ortiz) escribe: «Daniel Reyes opposed the depot lease\.»\.$/, "the author is cited, never the publication");
  assert.deepEqual(lintSentence(s, es), []);
  const { record, slice, interp } = await setup();
  const t = await cubeTelling(record, { slice, interp, grammar: es });
  assert.ok(t.cells.filter((c) => c.status === "voiced").length >= 10);
  assert.match(renderPlain(t), /Qué se leyó/);
  for (const c of t.cells) for (const x of (c.sentences ?? []).flatMap((y) => y.segs.filter((g) => g.kind === "source"))) assert.equal(await slice(x.address), x.t);
});

test("the reader is the second operand: W = ∅ is the catalog exactly; a reader holding the lead gets a lead it does not hold", async () => {
  const q = "Who approved the depot lease?";
  const { record, slice, interp } = await setup();
  const telling = await cubeTelling(record, { slice, interp, grammar: en });
  const qv = questionVoid(qen.readQuestion(q, { model }), record);
  const run = (whom) => answerLadder(record, { question: qv, slice, grammar: en, telling, ...(whom ? { whom } : {}) });
  const strip = (l) => JSON.stringify(l, (k, v) => (k === "a" ? undefined : v));
  const none = await run(null);
  assert.equal(strip(await run(VOID_READER)), strip(none), "the void reader reproduces the ladder with no reader, byte for byte");
  assert.equal(none.reader, undefined);
  const leadAtom = record.atoms.find((a) => a.id === none.stages[0].lead.atom);
  const leadBytes = await slice(leadAtom.span);
  const W = readWhom([await makePinax({ url: "whom:t.md", raw: `Shown earlier:\n\n${leadBytes}`, text: `Shown earlier:\n\n${leadBytes}`, extractor: { name: "test" } })]);
  const r = await run(W);
  assert.ok(r.reader.held.some((h) => h.atom === leadAtom.id && h.reason === "held" && /#b\d+-\d+$/.test(h.at)), "the held lead is dropped, typed, with the W bytes that hold it");
  assert.equal(r.candidates, none.candidates - r.reader.held.length);
  for (const st of r.stages.slice(0, 3)) if (st.lead) assert.equal(heldIn(W, await slice(record.atoms.find((a) => a.id === st.lead.atom).span)), null, `stage ${st.stage}: the lead is not one the reader holds`);
  assert.equal(strip(await run(W)), strip(r), "a function of W: the same holdings give the same fold");
});

// ---- who is cited: the author or speaker on the record, never a publication; an encyclopedia is an index ----------------------------------

async function askOver(pages, q = "Who opposed the depot lease?") {
  const recs = [];
  for (const [url, text, byline] of pages) {
    const raw = `<html><head>${byline ? `<meta property=article:author content="${byline}"/>` : ""}</head><body><p>${text}</p></body></html>`;
    recs.push(Object.assign(await makePinax({ url, retrievedAt: "2026-10-14T00:00:00Z", raw, text: `${text}\n\n${BULK}` }), { declared: { published: null, modified: null, links: [] } }));
  }
  const store = Object.fromEntries(recs.map((r) => [r.entry.id, r]));
  const slice = async (address) => { const p = parseAddress(address); const rec = store[p.pinax]; if (!rec) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const x = sp.ok === false ? null : await quoteOf(sp, rec); return x?.ok ? x.text : null; };
  const record = readCorpus(recs, { question: q });
  const interp = interpret(record);
  const telling = await cubeTelling(record, { slice, interp, grammar: en });
  const qv = questionVoid(qen.readQuestion(q, { model }), record);
  return { record, ladder: await answerLadder(record, { question: qv, slice, grammar: en, telling }) };
}

test("a claim in a page's own voice is cited to its AUTHOR, never to the publication", async () => {
  const { ladder } = await askOver([["https://news.test/a", A, "Pat Quinn"], ["https://other.test/b", B, "Sam Ortiz"]]);
  const line = ladder.stages[0].sentences[0].text;
  assert.match(line, /^(Pat Quinn|Sam Ortiz) (writes|puts it this way): “|^In (Pat Quinn|Sam Ortiz)’s words, “|^Per (Pat Quinn|Sam Ortiz), “/);
  assert.doesNotMatch(line, /news\.test|other\.test|puts it,/i, "no host or publication name in the citation");
  assert.ok(ladder.stages[0].sentences[0].via, "the page rides as the path (`via`), not as the party");
});

test("a page that names no one is not citable: no answer line leans on it, and the record says so", async () => {
  const { record, ladder } = await askOver([["https://news.test/a", A, null], ["https://other.test/b", B, null]]);
  assert.equal(ladder.stages[0].lead, null, "no named giver, no line");
  assert.match(ladder.stages[0].sentences[0]?.text ?? "", /Nothing in this record carries/);
  assert.ok(record.atoms.length > 0, "the claims are still in the record: they are typed, not discarded");
  assert.ok(record.sources.every((s) => s.byline?.no_named_giver === true));
});

test("an encyclopedia is an INDEX: its sentences never lead, even with a named author", async () => {
  const { record, ladder } = await askOver([["https://en.wikipedia.org/wiki/Depot_lease", A, "Pat Quinn"], ["https://other.test/b", B, "Sam Ortiz"]]);
  assert.equal(record.sources.find((s) => /wikipedia/.test(s.url)).role, "index");
  const used = new Set(ladder.stages.slice(0, 3).flatMap((st) => st.sentences.flatMap((s) => s.grounds)));
  const wikiAtoms = new Set(record.atoms.filter((a) => /wikipedia/.test(record.sources.find((s) => s.id === a.pinax).url)).map((a) => a.id));
  assert.ok([...used].every((id) => !wikiAtoms.has(id)), "no answer sentence rests on the index page");
});

test("pathos: a passage of attributed sentences spends each construction once when it can (a control that can fail)", async () => {
  const { ladder } = await askOver([["https://news.test/a", A, "Pat Quinn"], ["https://other.test/b", B, "Sam Ortiz"]], "Who approved the depot lease?");
  const brief = ladder.stages[2].sentences.filter((s) => s.variant != null);
  assert.ok(brief.length >= 2, "positive control: the brief holds several attributed sentences");
  const vs = brief.map((s) => s.variant);
  assert.equal(new Set(vs).size, Math.min(vs.length, 4), `constructions repeated: ${vs.join(",")}`);
});

test("number follows the giver: two authors write, one writes", async () => {
  const raw2 = (text) => `<html><head><meta name=author content="Pat Quinn"/><meta name=author content="Sam Ortiz"/></head><body><p>${text}</p></body></html>`;
  const pg = Object.assign(await makePinax({ url: "https://news.test/two", retrievedAt: "2026-10-14T00:00:00Z", raw: raw2(A), text: `${A}\n\n${BULK}` }), { declared: {} });
  const store = { [pg.entry.id]: pg };
  const slice = async (address) => { const p = parseAddress(address); const rec = store[p.pinax]; if (!rec) return null; const sp = await makeSpan(rec, p.layer, p.start, p.end); const x = sp.ok === false ? null : await quoteOf(sp, rec); return x?.ok ? x.text : null; };
  const record = readCorpus([pg], { question: "q" });
  const a = record.atoms.find((x) => x.why_kind !== "quotation" && x.relation?.pred === "approved");
  const qv = questionVoid(qen.readQuestion("Who approved the depot lease?", { model }), record);
  const telling = await cubeTelling(record, { slice, interp: interpret(record), grammar: en });
  const ladder = await answerLadder(record, { question: qv, slice, grammar: en, telling });
  const texts = ladder.stages.slice(0, 3).flatMap((s) => s.sentences.map((x) => x.text));
  assert.ok(a && texts.length);
  assert.ok(texts.some((t) => /^Pat Quinn and Sam Ortiz (write|put it this way): |^Per Pat Quinn and Sam Ortiz, /.test(t)), texts.join(" | "));
  assert.ok(!texts.some((t) => /and Sam Ortiz (writes|puts it)/.test(t)), "a plural giver never takes a singular verb");
});

test("a question asserts nothing: a page's own heading is never the answer", async () => {
  const text = "Why do critics oppose the depot lease? Daniel Reyes opposed the depot lease. Daniel Reyes approved the bus route. Maria Lopez opposed the fare increase.";
  const { ladder } = await askOver([["https://news.test/a", text, "Pat Quinn"]], "Who opposed the depot lease?");
  const line = ladder.stages[0].sentences[0]?.text ?? "";
  assert.doesNotMatch(line, /Why do critics oppose/);
  assert.match(line, /Daniel Reyes opposed the depot lease/);
});
