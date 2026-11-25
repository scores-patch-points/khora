// chat/ingest.test.mjs — a document is READ, never routed: the ingest door reads every paragraph of a text into the thread's fold, whatever the paragraph looks like.
// Why it exists (measured 2026-11-25, pg1342 chapter I, 27 paragraphs): handed one at a time through turn(), only 9 of the first 14 paragraphs were read; the rest, which hold a quoted question or
// open with a quotation, were routed to ANSWERING (act_open, action_not_in_text, fragment_unclear) and their facts never entered the fold. Handed to say() directly, all 27 were read and the
// dialogue answered ("What did Mrs. Long say?"). The reader was never the limit; the routing was. Needs the reader's priors (KHORA_PRIORS_DIR); skips without them.
import test from "node:test"; import assert from "node:assert/strict";
let mk = null, why = null, ingestDocument = null;
try { const { makeThread } = await import("./thread.mjs"); ({ ingestDocument } = await import("./ingest.mjs")); mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-25T14:00:00") }); await mk(); } catch (e) { why = String(e?.message ?? e).slice(0, 120); if (!String(e?.code ?? e).includes("ERR_MODULE_NOT_FOUND") || String(e?.message).includes("ingest.mjs")) throw e; }
const T = { skip: mk ? false : `no reader here: ${why}` };
// Pride and Prejudice, chapter I (public domain; Zenodotus 01-literature-books/gutenberg/pg1342), hard-wrapped as in the file
const CH1 = [
  "“My dear Mr. Bennet,” said his lady to him one day, “have you heard that\nNetherfield Park is let at last?”",
  "Mr. Bennet replied that he had not.",
  "“But it is,” returned she; “for Mrs. Long has just been here, and she\ntold me all about it.”",
  "Mr. Bennet made no answer.",
  "“Do not you want to know who has taken it?” cried his wife, impatiently.",
  "“Why, my dear, you must know, Mrs. Long says that Netherfield is taken\nby a young man of large fortune from the north of England; that he came\ndown on Monday in a chaise and four to see the place.”",
  "“What is his name?”",
  "“Bingley.”",
].join("\n\n");

test("every paragraph is read, including those that open with a quotation or hold a quoted question", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, CH1);
  assert.equal(r.paragraphs, 8); assert.equal(r.read, 8, JSON.stringify(r.setAside)); assert.deepEqual(r.setAside, []);
  assert.ok(r.facts >= 8, `facts ${r.facts}`); assert.ok(r.sentences >= 8);
  assert.equal(r.gap, null);
});

test("what was said inside the dialogue can be asked afterwards, with its sentence as evidence", T, async () => {
  const th = await mk(); await ingestDocument(th, CH1);
  const a = await th.turn("What did Mrs. Long say?"); assert.equal(a.handled, true); assert.match(a.text, /Netherfield is taken by a young man/); assert.ok(a.evidence.length >= 1);
  assert.match((await th.turn("When did he come down?")).text, /Monday/);
  assert.match((await th.turn("Who made no answer?")).text, /Mr\. Bennet/);
});

test("control built to fail: the same text through turn() loses paragraphs that ingest keeps (the routing the door exists to avoid)", T, async () => {
  const th = await mk(); let viaTurn = 0; for (const p of CH1.split("\n\n")) if ((await th.turn(p.split("\n").join(" "))).type === "read") viaTurn++;
  const r = await ingestDocument(await mk(), CH1);
  console.log(`# read via turn(): ${viaTurn} of ${r.paragraphs}; via ingest: ${r.read} of ${r.paragraphs}`);
  assert.ok(r.read > viaTurn, `ingest ${r.read} must read more than turn ${viaTurn}`);
});

test("ingest does not change how a typed message is handled: a question afterwards is answered, not read", T, async () => {
  const th = await mk(); await ingestDocument(th, CH1);
  const q = await th.turn("Who replied that he had not?"); assert.notEqual(q.type, "read");
});

test("an empty text is a typed gap; a paragraph the reader holds nothing from is reported, never dropped silently", T, async () => {
  const th = await mk(); const e = await ingestDocument(th, "  \n\n  "); assert.equal(e.read, 0); assert.equal(e.gap, "empty_text");
  const r = await ingestDocument(await mk(), "Mr. Bennet made no answer.\n\n“Go away,” said Mr. Bennet.");
  assert.equal(r.paragraphs, 2); assert.equal(r.read + r.setAside.length, 2, "every paragraph is either read or reported");
  for (const s of r.setAside) assert.ok(s.text && s.why, "a set-aside paragraph says which and why");
});

test("each read is offered to the caller, so the log is written by the caller, not by this door", T, async () => {
  const th = await mk(), seen = []; await ingestDocument(th, CH1, { onRead: (p, res) => seen.push([p.slice(0, 12), res.type]) });
  assert.equal(seen.length, 8); assert.ok(seen.every(([, t]) => t === "read"));
});
