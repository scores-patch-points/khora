// node --test pharos-reading.test.mjs   needs the English parser prior (KHORA_PRIORS_DIR) and the pharos library (PHAROS_HOME)
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { writeReading, readingRows, grammarFor, sha16 } from "./pharos-reading.mjs";
const g = await grammarFor("eng"), hasPharos = !!process.env.PHAROS_HOME && fs.existsSync(path.join(process.env.PHAROS_HOME, "lib", "pharos.mjs"));
const skip = g.gap ? `no English parser prior (${g.why})` : !hasPharos ? "set PHAROS_HOME to a pharos checkout" : false;
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "kread-"));
test("rows carry the sentence, the token, the head and the relation; a root exists in every sentence", { skip: g.gap ? skip : false }, () => {
  const rows = readingRows(g, "Bell defeated Greene in 1912. Greene did not defeat Bell.");
  assert.deepEqual([...new Set(rows.map((r) => r.s))], [0, 1]);
  for (const r of rows) { assert.equal(typeof r.form, "string"); assert.ok(Number.isInteger(r.id) && Number.isInteger(r.head) && r.head >= 0); assert.equal(typeof r.deprel, "string"); }
  for (const s of [0, 1]) assert.ok(rows.some((r) => r.s === s && r.head === 0), `sentence ${s} has a root`);
  assert.ok(rows.some((r) => /^nsubj/.test(r.deprel)), "a subject is read");
});
test("the reading is written as a text entry and a text-reading entry the other repos read by kind; a second write adds nothing", { skip }, async () => {
  const d = dir(), text = "Bell defeated Greene in 1912.", a = await writeReading(text, { log: "t", dir: d });
  assert.deepEqual(a.written, ["text", "text-reading"]); assert.equal(a.addr.text, `text:${sha16(text)}`); assert.equal(a.addr.reading, `reading:${sha16(text)}`);
  const P = await import(path.join(process.env.PHAROS_HOME, "lib", "pharos.mjs")), h = P.open("t", { dir: d, writer: "reader", frame: false });
  const t = P.fold(h, { kind: "text" }).entries[0], r = P.fold(h, { kind: "text-reading" }).entries[0];
  assert.equal(t.cell, "INS·Ground"); assert.deepEqual(t.body, { text, language: "eng" }); assert.equal(r.cell, "INS·Figure"); assert.deepEqual(r.of, [t.id]); assert.ok(r.body.rows.length >= 5);
  const b = await writeReading(text, { log: "t", dir: d }); assert.deepEqual(b.written, []); assert.deepEqual(b.skipped, ["text", "text-reading"]);
  const c = await writeReading("Greene fled.", { log: "t", dir: d }); assert.deepEqual(c.written, ["text", "text-reading"]);
});
test("a language with no parser prior is a typed gap, never another language's parse; no pharos is a typed gap", { skip: g.gap ? skip : false }, async () => {
  const x = await writeReading("Bonjour.", { language: "zzz", log: "t", dir: dir() }); assert.equal(x.gap, hasPharos ? "no_parser_prior" : "no_pharos");
});
test("rows carry character offsets that point at the token in the text", { skip: g.gap ? skip : false }, () => {
  const text = "Bell defeated Greene in 1912. Greene fled.", rows = readingRows(g, text);
  for (const r of rows) if (r.at != null) assert.equal(text.slice(r.at, r.end), r.form);
  assert.ok(rows.filter((r) => r.at != null).length >= rows.length - 1, "offsets are found for (nearly) every token");
  assert.equal(rows.find((r) => r.form === "1912").at, text.indexOf("1912"));
});
test("referents are written only through the canonical door, injected: the cast with its mention spans and the pronouns bound by presence; without it a typed gap", { skip }, async () => {
  const d = dir(), text = "Bell defeated Greene. He fled.", weft = { cast: [{ ref: "ref:auto:bell", surface: "Bell", mentionSpans: [[0, 4]] }, { ref: "ref:auto:greene", surface: "Greene", mentionSpans: [[14, 20]] }], pronounsPresence: [{ pronoun: "he", at: [22, 24], ref: "ref:auto:bell", surface: "Bell" }] };
  const a = await writeReading(text, { log: "t", dir: d, referents: true }); assert.equal(a.gap, "no_door");
  const b = await writeReading(text, { log: "t", dir: d, referents: true, readWeft: () => weft }); assert.ok(b.referents);
  const P = await import(path.join(process.env.PHAROS_HOME, "lib", "pharos.mjs")), h = P.open("t", { dir: d, writer: "reader", frame: false }), e = P.fold(h, { kind: "text-referents" }).entries[0], bell = e.body.referents.find((x) => x.face === "Bell");
  assert.deepEqual(bell.spans, [[0, 4]]); assert.deepEqual(bell.pronouns, [[22, 24]], "the pronoun's span is bound to Bell by the reader's presence rung"); assert.equal(e.cell, "INS·Figure");
  const c = await writeReading(text, { log: "t", dir: d, referents: true, readWeft: () => weft }); assert.ok(c.skipped.includes("text-referents"));
});
