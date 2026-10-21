// relation-defs.test.mjs — relation identity nominated by definitions; transfer frames decide direction in the meaning check.
//   node --test native/organs/relation-defs.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { makeRelationDefs, headsOf } from "./relation-defs.js";
import { claimsOf } from "../adapters/text/grammar-en.js";
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
