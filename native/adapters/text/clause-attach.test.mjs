// clause-attach.js: overlap, pronoun (presence rung, chosen dials), speaker; "you" stays a typed gap.
import test from "node:test"; import assert from "node:assert/strict"; import { attachClauses } from "./clause-attach.js";
const text = '"I am tired," said Anna, and Anna sat. She went home. You were there.';
const at = (s, from = 0) => { const i = text.indexOf(s, from); return [i, i + s.length]; };
const [as, ae] = at("Anna"); const [as2, ae2] = at("Anna", ae); const [i0, i1] = at("I am"); const [she0, she1] = at("She"); const [y0, y1] = at("You");
const sent = [{ text: '"I am tired," said Anna, and Anna sat.', offset: 0, order: 0 }, { text: "She went home.", offset: text.indexOf("She"), order: 1 }, { text: "You were there.", offset: text.indexOf("You"), order: 2 }];
const arg = (s, e) => ({ start: s, end: e, text: text.slice(s, e), head: text.slice(s, e) });
const weft = { sentences: sent, cast: [{ ref: "ref:anna", surface: "Anna", mentionSpans: [[as, ae], [as2, ae2]] }],
  clauses: [{ sentence: 0, subject: arg(i0, i0 + 1) }, { sentence: 0, subject: arg(as, ae) }, { sentence: 1, subject: arg(she0, she1) }, { sentence: 2, subject: arg(y0, y1) }] };
test("a subject that is a cast mention is attached by overlap", () => { assert.equal(attachClauses(text, weft).args["1:subj"], "ref:anna"); });
test("a third-person pronoun is bound by presence to the referent just named", () => { const r = attachClauses(text, weft); assert.equal(r.args["2:subj"], "ref:anna"); assert.equal(r.bindings.length, 1); assert.equal(r.bindings[0].pronoun.toLowerCase(), "she"); });
test('"I" inside a quotation is the speaker named beside the quote', () => { assert.equal(attachClauses(text, weft).args["0:subj"], "ref:anna"); });
test('"you" stays unattached: a typed gap, not a guess', () => { assert.equal(attachClauses(text, weft).args["3:subj"], undefined); });
test("the canonical dials are the default, and the stats count each rung", () => { const s = attachClauses(text, weft).stats; assert.equal(s.subjOverlap, 1); assert.equal(s.subjPron, 1); assert.equal(s.subjSpk, 1); assert.equal(s.subj, 4); });
