// The meaning layer reads THE reader's entry (weft-atoms.js): one cut, one parse, one language decision. Constructed violations first (lesson 70): an entry with no
// parse must be a typed gap, a text the cut does not hold must not be silently re-parsed, a declared-unknown language must get no parse, and the default read must
// be byte-identical to a read that did not ask for rows (the additive law of WeftEntry@4).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const K = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { readDocument, rowsOfFor } = await import(path.join(K, "native/reading.js"));
const { atomsFromWeft, weftGrammar } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(K, "eval/meaning/atoms/coref-ranker.json"), "utf8"));
const read = (t, o = {}) => readDocument(t, { language: "en", lexicon: false, minCharacters: 0, ...o });
const P = await rowsOfFor("eng");
const strip = (w) => { const { parse, parseBy, ms, ...r } = JSON.parse(JSON.stringify(w)); return JSON.stringify(r); };

test("asking for rows is additive: the entry is the same bytes but for the parse", async () => {
  const t = "Sagard sold additional receivables to us. We sold additional receivables to Sagard.";
  const a = await read(t), b = await read(t, { rows: true });
  assert.equal("parse" in a, false);
  assert.equal(strip(a), strip(b));
  assert.deepEqual(b.parse.map((p) => p.order), [0, 1]);
  assert.ok(b.parse.every((p) => p.rows.length > 2 && p.rows[0].head != null && p.rows[0].deprel));
});
test("the atoms through the entry are the atoms of the text read the old way (recipient and person class included)", async () => {
  const t = "Sagard sold additional receivables to us.";
  const via = atomsFromWeft(await read(t, { rows: true }), { claimsOf: P.claimsOf, corefModel, lang: "en" });
  const direct = readAtoms({ text: t, lang: "en", grammar: { rowsOf: P.rowsOf, claimsOf: P.claimsOf }, corefModel });
  assert.deepEqual(via.atoms.map((a) => a.text), direct.atoms.map((a) => a.text));
  assert.ok(via.atoms.some((a) => a.pred === "sell_to" && a.args[1].person === "1pl"));
  assert.deepEqual(via.gaps, []);
});
test("an atom says where it sits in the DOCUMENT, not only in its sentence", async () => {
  const t = "Sagard is a lender. Sagard sold additional receivables to us.";
  const w = await read(t, { rows: true }), via = atomsFromWeft(w, { claimsOf: P.claimsOf, corefModel, lang: "en" });
  const a = via.atoms.find((x) => x.pred === "sell");
  assert.ok(a.doc.start >= w.sentences[1].offset && t.slice(a.doc.start, a.doc.end).includes("sold"), JSON.stringify(a.doc));
});
test("an entry with no parse is a typed gap, not a second parse", async () => {
  const r = atomsFromWeft(await read("Sagard sold receivables to us."), { claimsOf: P.claimsOf, corefModel, lang: "en" });
  assert.deepEqual(r.atoms, []); assert.equal(r.gaps[0].gap, "no_rows");
});
test("a text the entry's cut does not hold is refused, never silently re-parsed", async () => {
  const g = weftGrammar(await read("Sagard sold receivables to us.", { rows: true }), { claimsOf: P.claimsOf });
  assert.throws(() => g.rowsOf("a sentence the reader never cut"), /cut_disagrees/);
  assert.deepEqual(g.missed, ["a sentence the reader never cut"]);
});
test("a declared language with no stem filed gets a typed gap and NO parse (never English applied to it)", async () => {
  const w = await read("Hello world, this is a test sentence.", { language: "tlh", rows: true });
  assert.equal("parse" in w, false);
  assert.ok(w.gaps.some((g) => g.gap === "no_parser") && w.gaps.some((g) => g.gap === "unknown_language"));
});
test("a pronunciation in brackets is cut out before the parse, so the entry's rows are the sentence's own", async () => {
  const t = "Mount Rainier ( ray-NEER), also known as Tahoma, is a large, active stratovolcano.";
  const w = await read(t, { rows: true }), via = atomsFromWeft(w, { claimsOf: P.claimsOf, corefModel, lang: "en" });
  assert.deepEqual(via.gaps, []); assert.ok(via.atoms.length > 0);
  assert.ok(!w.parse[0].rows.some((r) => /NEER/.test(r.form)));
});
test("Spanish reads through the same door and gets the recipient shape from the entry's rows", async () => {
  const w = await read("Ana le dio un libro a Boris.", { language: "es", rows: true });
  assert.equal(w.parseBy, "grammar-ud:es");
  const Pes = await rowsOfFor("spa"), via = atomsFromWeft(w, { claimsOf: Pes.claimsOf, corefModel, lang: "es" });
  assert.ok(via.atoms.some((a) => a.pred === "dar_a"), via.atoms.map((a) => a.text).join(" ; "));
});

// ── the page as one reading (atomsOfPage): one entity id is one being across the whole entry ──
const { atomsOfPage } = await import(path.join(K, "native/the-fold/weft-atoms.js"));
const pageOf = async (t) => atomsOfPage(await read(t, { rows: true }), { claimsOf: P.claimsOf, corefModel, lang: "en" });
test("a page is resolved ONCE: a pronoun in a later sentence is the being of an earlier one, under one id", async () => {
  const pg = await pageOf("Sagard is a lender. It sold additional receivables to us.");
  const kind = pg.atoms.find((a) => a.pred === "is_a"), sold = pg.atoms.find((a) => a.pred === "sell");
  assert.equal(sold.args[0].entity, kind.args[0].entity, pg.atoms.map((a) => a.text).join(" ; "));
  assert.equal(new Set(pg.entities.map((e) => e.id)).size, pg.entities.length);
});
test("entity ids are page-wide: two sentences never reuse an id for two beings", async () => {
  const pg = await pageOf("Anna wrote a letter. Boris read the report.");
  const ids = pg.sentences.map((s) => new Set(s.atoms.flatMap((a) => a.args.map((x) => x.entity)).filter((x) => x != null)));
  assert.equal([...ids[0]].filter((i) => ids[1].has(i)).length, 0);
});
// KNOWN, observed failing: the learned ranker opens a NEW entity for a later mention of an already-named being ("Sagard" ... "Sagard"), so an identity world built on the page
// holds two nodes for one being. A coreference fault (coref-learned.js), not this module's.
test("the same name later on the page is the same being", { todo: "coref-learned.js opens a new entity for a repeated name" }, async () => {
  const pg = await pageOf("Sagard is a lender. We sold additional receivables to Sagard.");
  const ids = new Set(pg.atoms.flatMap((a) => a.args.filter((x) => /sagard/i.test(x.name ?? x.value ?? "")).map((x) => x.entity)));
  assert.equal(ids.size, 1, [...ids].join(","));
});
