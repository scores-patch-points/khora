// chat/quote-frames.test.mjs — a quotation is a FRAME: words held by someone, not asserted by the narrator. Written before the module; each test says what would falsify it.
// Boundary tables are declared data per language (typographic conventions, not a reading of the language); a language with no table is a typed gap, never an English default.
import test from "node:test"; import assert from "node:assert/strict";
import { quoteSpans, speakerOfSpan, innermostAt, dashDialogue, QUOTE_TABLES } from "./quote-frames.js";

test("English: curly quotes pair, nest, and report an unbalanced one as a typed gap with its position", () => {
  const t = "He said, “She said, “no,” and left.” Then silence.";
  const { spans, gap } = quoteSpans(t, "eng"); assert.equal(gap, null); assert.equal(spans.length, 2);
  assert.deepEqual(spans.map((s) => s.depth), [0, 1]); assert.ok(spans[0].open < spans[1].open && spans[1].close < spans[0].close);
  const open = quoteSpans("He said, “no and left.", "eng"); assert.equal(open.gap?.gap, "quotation_continues"); assert.equal(open.gap.at, 9); assert.equal(open.spans.length, 1); assert.equal(open.spans[0].continues, true);
});
test("straight double quotes toggle; an apostrophe is never a quote", () => {
  const { spans } = quoteSpans('Pierre said "I am here" and it\'s true.', "eng"); assert.equal(spans.length, 1);
});
test("other languages' conventions come from the declared table: guillemets, corner brackets", () => {
  assert.equal(quoteSpans("Он сказал: «Я здесь», и ушёл.", "rus").spans.length, 1);
  assert.equal(quoteSpans("彼は「ここにいる」と言った。", "jpn").spans.length, 1);
  assert.equal(quoteSpans("Il a dit : « Je suis là », puis il est parti.", "fra").spans.length, 1);
});
test("a language with no table is a typed gap, not an English reading", () => {
  const r = quoteSpans("“hello”", "xxx"); assert.equal(r.spans.length, 0); assert.equal(r.gap?.gap, "no_quote_table"); assert.ok(r.gap.lang === "xxx");
  assert.ok(Object.isFrozen(QUOTE_TABLES));
});

const NAMES = ["Pierre", "Natasha", "Mr.", "Bennet", "Mrs. Long"];
const holder = (t, i = 0, lang = "eng") => { const { spans } = quoteSpans(t, lang); return speakerOfSpan(t, spans, i, NAMES, lang); };
test("the speaker is the name in the tag after the quotation, else before it", () => {
  assert.deepEqual(pick(holder("“I am hungry,” said Pierre.")), { holder: "Pierre", via: "tag after" });
  assert.deepEqual(pick(holder("Natasha replied, “I am not.”")), { holder: "Natasha", via: "tag before" });
});
test("TRAP: a name INSIDE the quotation (a vocative) is the addressee, never the speaker; an unnamed speaker stays anonymous", () => {
  const h = holder("“My dear Mr. Bennet,” said his lady to him one day, “have you heard?”");
  assert.equal(h.holder, null); assert.equal(h.via, "anonymous");
});
test("TRAP: two separate names that make one title and surname are one holder", () => {
  assert.equal(holder("“Hello,” said Mr. Bennet.").holder, "Mr. Bennet");
});
test("a name that is only part of a longer word is not a match", () => {
  assert.equal(holder("“Hello,” said Natashaville.").holder, null);
});
test("innermostAt finds the deepest quotation holding a position, and null outside", () => {
  const { spans } = quoteSpans("He said, “She said, “no,” and left.” Then silence.", "eng");
  assert.equal(innermostAt(spans, 0), null); assert.equal(innermostAt(spans, 22).depth, 1); assert.equal(innermostAt(spans, 12).depth, 0); assert.equal(innermostAt(spans, 40), null);
});
function pick(h) { return { holder: h.holder, via: h.via }; }

// ── on a thread: which verbs are framed, against a hand-labelled gold (pg1342 chapter I, paragraphs 1 to 8; labelled from the text, not from the output) ──
let mk = null, ingestDocument = null, askFramed = null, why = null;
try { const { makeThread } = await import("../../chat/thread.mjs"); ({ ingestDocument, askFramed } = await import("../../chat/ingest.mjs")); mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-25T14:00:00") }); await mk(); } catch (e) { why = String(e?.message ?? e).slice(0, 100); if (String(e?.message).includes("ingest.mjs")) throw e; }
const T = { skip: mk ? false : `no reader here: ${why}` };
const CH1 = [
  "“My dear Mr. Bennet,” said his lady to him one day, “have you heard that\nNetherfield Park is let at last?”", "Mr. Bennet replied that he had not.",
  "“But it is,” returned she; “for Mrs. Long has just been here, and she\ntold me all about it.”", "Mr. Bennet made no answer.",
  "“Do not you want to know who has taken it?” cried his wife, impatiently.",
  "“Why, my dear, you must know, Mrs. Long says that Netherfield is taken\nby a young man of large fortune from the north of England; that he came\ndown on Monday in a chaise and four to see the place.”",
].join("\n\n");
// [verb form, framed?]. A verb outside every quotation is narration (false); inside one it is held by a speaker (true).
const GOLD = [["said", false], ["heard", true], ["let", true], ["replied", false], ["had", false], ["returned", false], ["been", true], ["told", true], ["made", false], ["want", true], ["know", true], ["taken", true], ["cried", false], ["says", true], ["came", true]];

test("GOLD: every verb the chat found is framed exactly when it sits inside a quotation (hand-labelled, 15 verbs)", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, CH1); const idx = r.frames;
  const miss = [], wrong = [];
  for (const [form, want] of GOLD) { const hit = idx.filter((x) => x.form === form); if (!hit.length) { miss.push(form); continue; } if (!hit.every((x) => x.framed === want)) wrong.push(`${form}:${hit.map((x) => x.framed)}`); }
  console.log(`# gold verbs found ${GOLD.length - miss.length} of ${GOLD.length}; wrong ${wrong.length}; not found: ${miss.join(",") || "-"}`);
  assert.deepEqual(wrong, [], `framed wrongly: ${wrong}`); assert.ok(miss.length <= 3, `the chat found too few gold verbs: missing ${miss}`);
});
test("TRAP: narration is never framed (false-frame rate on verbs outside every quotation is zero)", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, CH1);
  const narr = r.frames.filter((x) => ["said", "replied", "returned", "made", "cried"].includes(x.form)); assert.ok(narr.length >= 4);
  assert.deepEqual(narr.filter((x) => x.framed), []);
});
test("TRAP: the unnamed speakers of chapter I stay anonymous; none is attributed to a name that only occurs inside a quotation (Mr. Bennet is addressed, he is not the speaker of those)", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, CH1);
  for (const x of r.frames.filter((y) => y.framed && ["heard", "let", "want", "know", "taken", "says"].includes(y.form))) assert.equal(x.holder, null, `${x.form} → ${x.holder}`);
});
test("an answer from inside a quotation says whose words they are; an answer from narration is unchanged", T, async () => {
  const th = await mk(); await ingestDocument(th, CH1);
  const a = await askFramed(th, "Who made no answer?"); assert.equal(a.text, "Mr. Bennet."); assert.equal(a.framed, false);
  const q = await askFramed(th, "When did he come down?"); assert.match(q.text, /^According to /); assert.match(q.text, /Monday/); assert.equal(q.framed, true); assert.equal(q.holder, null);
});
test("an answer that mixes narration and quotation is left alone and marked mixed, never rewritten by guess", T, async () => {
  const th = await mk(); await ingestDocument(th, "“Hello,” said Pierre.\n\nPierre left."); const a = await askFramed(th, "Who left?");
  assert.doesNotMatch(a.text, /^According to/);
});

// ── falsifiers found on real text (2026-11-25): pg1342 has 1,523 “ against 1,503 ” (a quotation continued into the next paragraph reopens without closing the last); the French War and Peace has a » that closes a letter opened paragraphs earlier;
// and 43% of the Russian and 58% of the French War and Peace lines are dialogue opened by a dash with NO closing mark, which a bracket table cannot see and would have left as the narrator's own assertions.
test("an opener with no closer is a quotation that CONTINUES (typed, and still a frame); a closer with no opener closes one that began before", () => {
  const a = quoteSpans("“He went on and on, and then", "eng"); assert.equal(a.spans.length, 1); assert.equal(a.spans[0].continues, true); assert.equal(a.gaps[0].gap, "quotation_continues");
  const b = quoteSpans("and so it ended.” Then he left.", "eng"); assert.equal(b.spans.length, 1); assert.equal(b.spans[0].continued, true); assert.equal(b.spans[0].open, -1); assert.equal(b.gaps[0].gap, "quotation_continued");
  assert.equal(innermostAt(b.spans, 5)?.continued, true); assert.equal(innermostAt(b.spans, 25), null);
});
test("a language that writes dialogue with a leading dash and no closing mark is told so: the paragraph is NOT narration, it is a typed gap", () => {
  assert.equal(dashDialogue("— Dieu, quelle virulente sortie! — отвечал князь.", "rus"), true);
  assert.equal(dashDialogue("— Eh bien ! Maintenant, Gênes et Lucques.", "fra"), true);
  assert.equal(dashDialogue("He paused — and then spoke.", "eng"), false);
  assert.equal(dashDialogue("— a dash opening an English paragraph is punctuation", "eng"), false);
  assert.equal(dashDialogue("“quoted”", "rus"), false);
  assert.equal(dashDialogue("— x", "xxx"), false, "no table: no claim");
});
test("Italian has a table: guillemets and curly quotes", () => { assert.equal(quoteSpans("Disse: «Vieni qui», e partì.", "ita").spans.length, 1); });

test("FALSIFIER: a dash-dialogue paragraph, or a language with no table, is framed UNKNOWN (null), never narration (false): the narrator must not be made to assert someone's speech", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, "— Pierre ate the bread.\n\nNatasha left.", { lang: "fra" });
  const dash = r.frames.filter((f) => f.para === 0), narr = r.frames.filter((f) => f.para === 1);
  assert.ok(dash.length >= 1 && dash.every((f) => f.framed === null && f.via === "dash_dialogue_not_read"), JSON.stringify(dash));
  assert.ok(narr.length >= 1 && narr.every((f) => f.framed === false), JSON.stringify(narr));
  assert.ok(r.quoteGaps.some((g) => g.gap === "dash_dialogue_not_read"));
  const u = await ingestDocument(await mk(), "“Hello,” said Pierre.", { lang: "xxx" });
  assert.ok(u.frames.length >= 1 && u.frames.every((f) => f.framed === null), JSON.stringify(u.frames)); assert.ok(u.quoteGaps.some((g) => g.gap === "no_quote_table"));
});

// ── found by the Genesis run (65 languages, 2026-11-25): the Spanish table found 0 quotations in a Bible that marks 224 with straight quotes, and said nothing; 45 languages used marks and had no table. ──
import { registerQuoteTable } from "./quote-frames.js";
test("FALSIFIER: marks the table does not know are a typed gap that lists them, never a silent zero", () => {
  const r = quoteSpans("Dijo ‹hola› y se fue.", "spa"); assert.equal(r.spans.length, 0); assert.equal(r.gaps.some((g) => g.gap === "marks_outside_table"), true);
  assert.deepEqual(r.gaps.find((g) => g.gap === "marks_outside_table").marks, { "‹": 1, "›": 1 });
});
test("a language with no table says which quotation marks the text uses, so a codec author can write the table", () => {
  const g = quoteSpans("Он сказал «да» и «нет».", "xxx").gap; assert.equal(g.gap, "no_quote_table"); assert.deepEqual(g.marks, { "«": 2, "»": 2 });
});
test("straight double quotes are read in Spanish, French, Italian and Russian too (a plain-text edition)", () => {
  for (const l of ["spa", "fra", "ita", "rus"]) assert.equal(quoteSpans('Dijo "hola" y se fue.', l).spans.length, 1, l);
});
test("a codec registers its own table; a built-in cannot be silently replaced; a malformed table is refused", () => {
  assert.equal(quoteSpans("«a»", "swh").gap.gap, "no_quote_table");
  registerQuoteTable("swh", { pairs: [["«", "»"]], toggle: [], end: ["."] }); assert.equal(quoteSpans("Alisema «habari».", "swh").spans.length, 1);
  assert.throws(() => registerQuoteTable("eng", { pairs: [["“", "”"]], toggle: [], end: ["."] }), /built-in/);
  assert.throws(() => registerQuoteTable("zzz", { pairs: "no" }), /pairs/);
});
