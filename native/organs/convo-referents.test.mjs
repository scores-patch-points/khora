// convo-referents.test.mjs — who "he" is: the conversation's referents and the binding of a follow-up's pronouns on the reader's rows. The reader is real (skipped without one); names that read as names under both priors homes.
import test from "node:test"; import assert from "node:assert/strict";
import { makeConversation } from "./convo-referents.js";
let read = null, voidOf = null, VQ = null, why = null;
try { const K = new URL("../", import.meta.url).href, { rowsOfFor } = await import(K + "reading.js"), { voidOfQuestion } = await import(K + "organs/void-hunt.js"), P = await rowsOfFor("eng"); read = (s) => P.rowsOf(s) ?? []; VQ = voidOfQuestion; voidOf = (s) => voidOfQuestion(read(s)); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: read ? false : `no reader here: ${why}` };
const forms = (rows) => rows.map((r) => r.form).join(" ");

test("“Where was Plato born?” then “When did he die?”: he is Plato, on the rows, so the void of the second question names its subject; the binding says why", T, () => {
  const c = makeConversation(); c.note({ void: voidOf("Where was Plato born?"), answer: { text: "Athens", admits: "place" } });
  const b = c.bind(read("When did he die?")); assert.equal(forms(b.rows), "When did Plato die ?"); assert.deepEqual(b.bindings.map((x) => [x.pronoun, x.referent, x.kind]), [["he", "Plato", "person"]]); assert.match(b.bindings[0].why, /the person the last question was about/);
  const v = voidOf("When did he die?"); assert.equal(v.ok, false, "without the conversation the question names nothing");
  const voidOfQuestion = VQ; const v2 = voidOfQuestion(b.rows); assert.equal(v2.ok, true); assert.deepEqual(v2.anchors.map((a) => a.text), ["Plato"]); assert.equal(v2.relation.lemma, "die");
  assert.equal(b.rows.find((r) => r.form === "Plato").deprel, "nsubj", "the pronoun's relation to its verb is kept"); assert.deepEqual(c.bind(read("When did he die?")).unresolved, []);
});

test("agreement is the reader's: “it” is not a person, “he” is not a thing; the answer of a who-question is a person and can be “he”", T, () => {
  const c = makeConversation(); c.note({ void: voidOf("Who wrote Faust?"), answer: { text: "Goethe", admits: "person" } });
  assert.deepEqual(c.referents().map((r) => [r.text, r.kind, r.how]).sort(), [["Faust", "thing", "asked"], ["Goethe", "person", "answered"]]);
  assert.equal(forms(c.bind(read("When was it written?")).rows), "When was Faust written ?"); assert.equal(forms(c.bind(read("Where was he born?")).rows), "Where was Goethe born ?");
});

test("nothing to bind to is said, not guessed: no referent yet, a plural with no plural referent, and an “it” when only persons have been mentioned", T, () => {
  const c = makeConversation(); const none = c.bind(read("When did he die?")); assert.equal(none.bindings.length, 0); assert.match(none.unresolved[0].why, /nothing has been mentioned/); assert.equal(forms(none.rows), "When did he die ?");
  c.note({ void: voidOf("Where was Plato born?"), answer: null });
  assert.match(c.bind(read("What did they write?")).unresolved[0].why, /plural/); assert.match(c.bind(read("Who wrote it?")).unresolved[0].why, /not a person/);
});

test("the latest turn is the most salient, a gender the user's own pronoun told is kept, and a she cannot be a he the conversation has already called he", T, () => {
  const c = makeConversation({ genderOf: (w) => (w[0] === "Mary" ? "female" : null) }); c.note({ void: voidOf("Where was Plato born?"), answer: null }); c.bind(read("When did he die?"));
  c.note({ void: voidOf("Where was Mary Shelley born?"), answer: null });
  assert.equal(forms(c.bind(read("When did she die?")).rows), "When did Mary Shelley die ?"); assert.equal(forms(c.bind(read("When did he die?")).rows), "When did Plato die ?", "he is not Mary: the earlier man");
  assert.equal(c.bind(read("When did she die?")).bindings[0].referent, "Mary Shelley");
  c.note({ void: voidOf("Where was Kant born?"), answer: null }); const b = c.bind(read("When did he die?")); assert.equal(b.bindings[0].referent, "Kant", "the latest man leads"); assert.deepEqual(b.bindings[0].alternatives, []);
});

test("a possessive pronoun is bound too, and the rest of the question keeps its structure: “Who was his father?”", T, () => {
  const c = makeConversation(); c.note({ void: voidOf("Where was Plato born?"), answer: null }); const b = c.bind(read("Who was his father?"));
  assert.equal(forms(b.rows), "Who was Plato father ?"); const poss = b.rows.find((r) => r.form === "Plato"); assert.equal(poss.deprel, "nmod:poss"); assert.equal(b.rows.find((r) => r.form === "father").id, 4);
  const voidOfQuestion = VQ; const v = voidOfQuestion(b.rows); assert.deepEqual(v.anchors.map((a) => a.text), ["Plato"]); assert.equal(v.relation?.lemma, "father");
});

test("a multi-word referent becomes one flat name on the rows, and the ids and heads after it are renumbered", T, () => {
  const c = makeConversation(); c.note({ void: voidOf("Where was Immanuel Kant born?"), answer: null }); const b = c.bind(read("When did he die?"));
  assert.equal(forms(b.rows), "When did Immanuel Kant die ?"); assert.deepEqual(b.rows.map((r) => r.id), [1, 2, 3, 4, 5, 6]); const kant = b.rows.find((r) => r.form === "Kant"), die = b.rows.find((r) => r.form === "die");
  assert.equal(kant.head, die.id); assert.equal(b.rows.find((r) => r.form === "Immanuel").head, kant.id); assert.equal(b.rows.find((r) => r.form === "?").head, die.id);
});
