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
