// relation-defs.test.mjs — relation identity nominated by definitions; transfer frames decide direction in the meaning check.
//   node --test native/organs/relation-defs.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { makeRelationDefs, headsOf, verbIndexFromWiktextract, verbSensesOf } from "./relation-defs.js";
import { claimsOf, rowsOf } from "../adapters/text/grammar-en.js";
import { verdict } from "../kernel/eot-claim-match.js";
// definition payloads in the shape of Wiktionary's REST API (short paraphrases of each entry's first senses)
const P = (...defs) => ({ en: [{ partOfSpeech: "Verb", definitions: defs.map((d) => ({ definition: d })) }] });
const DEFS = {
  pay: P("To give money or other compensation to in exchange for goods or services."), receive: P("To be <a>given</a>, <a>sent</a>, or <a>paid</a> something."),
  sell: P("To transfer goods or provide services in exchange for money."), buy: P("To obtain (something) in exchange for money or goods."),
  purchase: P("To buy, obtain by payment of a price in money."), enter: P("To go or come into an enclosed space."), terminate: P("To end something."),
};
const D = makeRelationDefs((w) => DEFS[w] ?? null);

test("a definition's head verbs and passive heads are read", () => {
  assert.deepEqual(headsOf("To be <a>given</a>, <a>sent</a>, or <a>paid</a> something.").passive, ["give", "sent", "pay"]);
  assert.deepEqual(headsOf("To buy, obtain by payment").heads, ["buy", "obtain"]);
});

test("definitions nominate synonyms and converses, and keep opposites apart", () => {
  assert.equal(D.relate("pay", "receive"), "converse");
  assert.equal(D.relate("sell", "buy"), "converse");
  assert.equal(D.relate("purchase", "buy"), "same");
  assert.equal(D.relate("enter", "terminate"), null, "an end is not an entry");
  assert.equal(D.relate("buy", "receive"), null, "two takings are not converses");
});

test("with the frames, a converse with the roles swapped supports and a reversed direction contradicts", () => {
  const v = (a, b) => verdict(claimsOf(a), claimsOf(b), { relations: D }).v;
  assert.equal(v("Sagard bought additional receivables from us.", "We sold additional receivables to Sagard."), "E");
  assert.equal(v("Sagard sold additional receivables to us.", "We sold additional receivables to Sagard."), "C");
  assert.equal(v("We bought 3.4 million shares.", "We purchased 3.4 million shares."), "E");
});

test("wiktextract entries read like the REST payload, and a form-of sense says nothing", async () => {
  const lines = [JSON.stringify({ word: "sell", lang_code: "en", pos: "verb", senses: [{ glosses: ["To transfer goods or provide services in exchange for money."] }] }),
    JSON.stringify({ word: "sold", lang_code: "en", pos: "verb", senses: [{ glosses: ["simple past of sell"], form_of: [{ word: "sell" }] }] })];
  const ix = await verbIndexFromWiktextract(lines);
  assert.deepEqual(Object.keys(ix.words), ["sell"]);
  assert.deepEqual(verbSensesOf(ix.words.sell), verbSensesOf(DEFS.sell));
});

test("a two-sided verb joins a relation as the same one, and its case marking gives the direction", () => {
  const T = makeRelationDefs((w) => ({ ...DEFS, license: ["To authorize officially.", "To give formal authorization to use.", "To acquire authorization to use, usually in exchange for compensation."], grant: ["To give (permission or wish)."] })[w] ?? null);
  assert.equal(T.classOf("license"), "both");
  assert.equal(T.relate("license", "grant"), "same");
  assert.equal(T.relate("out-license", "license"), "same", "a prefixed verb with no entry reads as its stem");
  const v = (a, b) => verdict(claimsOf(a), claimsOf(b), { relations: T }).v;
  assert.equal(v("We licensed rights from Vanda.", "We granted rights to Vanda."), "C");
  assert.equal(v("We licensed rights to Vanda.", "We granted rights to Vanda."), "E");
});

test("shape repairs: two objects make the first the recipient; a reduced relative is not the main verb", () => {
  const r = rowsOf("We paid Centessa an upfront cash payment of $4.0 million.");
  assert.equal(r.find((x) => x.form === "Centessa").deprel, "iobj");
  const q = rowsOf("The $50.0 million milestone, achieved when sales exceeded $750.0 million was paid to Sagard.");
  assert.equal(q.find((x) => x.head === 0).form, "paid");
  assert.equal(q.find((x) => x.form === "milestone").deprel, "nsubj:pass");
  assert.equal(rowsOf("We discovered and out-licensed antibodies.").find((x) => x.form === "out-licensed").lemma, "out-license");
});
