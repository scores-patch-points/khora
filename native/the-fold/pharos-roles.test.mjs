// pharos-roles: the roles (kāraka), polarity and question form the read already had, woven by kind. Each test names how it could be false. Needs PHAROS_HOME and the priors home (KHORA_PRIORS_DIR or janus beside the workspace).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
import { shapeOf, weaveShape, ROLES_KIND, POLARITY_KIND, QUESTION_KIND, ROLE_KINDS } from "./pharos-roles.mjs"; import { writeReading, grammarFor, readingRows, pharosLib } from "./pharos-reading.mjs";
const lib = pharosLib(), g = await grammarFor("eng"), skip = !lib ? "no pharos (set PHAROS_HOME)" : g.gap ? `no English parser prior: ${g.why}` : false;
const T = "Mina gave the book to Jonathan with a smile. Never delete this clip. Should I trim this clip? Who gave the book to Mina?";
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "kroles-"));
const open = async (dir) => { const P = await import(pathToFileURL(lib).href); return { P, h: P.open("t", { writer: "reader", dir }) }; };

test("FALSE IF the roles are not the kāraka organ's: on real rows Mina is kartṛ, book karman, Jonathan sampradāna, smile karaṇa, the verb kriyā; every row has a label; 'clip' is karman of the negated 'delete'", { skip }, async () => {
  const sh = await shapeOf(T, { language: "eng" }), rows = readingRows(g, T), lab = (form, s = 0) => { const r = rows.find((x) => x.s === s && x.form === form); return sh.roles.rows.find((x) => x.s === s && x.id === r.id); };
  assert.deepEqual(["Mina", "book", "Jonathan", "smile", "gave"].map((f) => lab(f).panini), ["kartṛ", "karman", "sampradāna", "karaṇa", "kriyā"]); assert.equal(lab("clip", 1).karaka, "karman");
  assert.equal(sh.roles.rows.length, rows.length, "total: one label per row"); assert.ok(sh.roles.rows.every((r) => typeof r.panini === "string")); assert.equal(sh.roles.markers, "eng"); assert.equal(sh.roles.coverage.labelledRate, 1);
});
test("FALSE IF polarity is a word list or misplaced: 'Never delete this clip.' negates delete (via PronType=Neg, an advmod), and no other sentence here is negated", { skip }, async () => {
  const sh = await shapeOf(T, { language: "eng" }), rows = readingRows(g, T); assert.equal(sh.polarity.negated.length, 1); const n = sh.polarity.negated[0];
  assert.equal(rows.find((r) => r.s === n.s && r.id === n.id).lemma, "delete"); assert.equal(n.s, 1); assert.equal(n.via[0].deprel, "advmod"); assert.ok(sh.polarity.source.available);
});
test("FALSE IF question form is not the question adapter's: statement, statement, deliberative (deontic), wh (person)", { skip }, async () => {
  const sh = await shapeOf(T, { language: "eng" }); if (!sh.question) { assert.ok(sh.gaps.some((x) => x.gap === "no_question_parser_prior")); return; }
  assert.deepEqual(sh.question.sentences.map((q) => q.form), ["statement", "statement", "deliberative", "wh"]); assert.equal(sh.question.sentences[2].modality, "deontic"); assert.equal(sh.question.sentences[3].admits, "person");
});
test("woven by kind at Existence/Structure cells, each of the text entry; a second weave writes nothing; without the text entry it is the typed gap no_text_entry", { skip }, async () => {
  const dir = tmp(); assert.equal((await weaveShape(T, { language: "eng", log: "t", dir })).gap, "no_text_entry");
  await writeReading(T, { language: "eng", log: "t", dir }); const a = await weaveShape(T, { language: "eng", log: "t", dir }); assert.ok(a.written.includes(ROLES_KIND) && a.written.includes(POLARITY_KIND));
  const { P, h } = await open(dir), text = P.fold(h, { kind: "text" }).entries[0];
  for (const k of ROLE_KINDS) { const es = P.fold(h, { kind: k.kind }).entries; if (k.kind === QUESTION_KIND && !a.written.includes(QUESTION_KIND)) continue; assert.equal(es.length, 1, k.kind); assert.equal(es[0].cell, k.cell); assert.deepEqual(es[0].of, [text.id]); assert.ok(["SIG", "INS", "SEG", "CON", "SYN", "NUL"].includes(es[0].cell.split("·")[0])); }
  assert.deepEqual((await weaveShape(T, { language: "eng", log: "t", dir })).written, []);
});
test("FALSE IF another language is read as English: a language with no question adapter and no marker table gets typed gaps (no_question_grammar, no_marker_table) and NO text-question entry; a language with no parser prior is the reading's own gap", { skip }, async () => {
  assert.equal((await shapeOf("x", { language: "zzz" })).gap, "no_parser_prior");
  const fra = await grammarFor("fra"); if (fra.gap) return; const sh = await shapeOf("Le chat ne dort pas sur le tapis.", { language: "fra" });
  assert.equal(sh.question, null); assert.deepEqual(sh.gaps.map((x) => x.gap).sort(), ["no_marker_table", "no_question_grammar"]); assert.equal(sh.roles.markers, null); assert.ok(sh.roles.rows.length > 0, "the universal relation map still labels every row");
});
