// parse-consistency: structural fingerprints of a wrong parse, as typed gaps. Synthetic rows state each invariant; the real-row tests need the English parser prior (skipped with the reason otherwise).
import test from "node:test"; import assert from "node:assert/strict";
import { consistencyOf, CONSISTENCY_GAPS } from "./parse-consistency.mjs"; import { karakaRows } from "./karaka-total.mjs";
const R = (id, form, upos, head, deprel, karaka = null) => ({ id, form, lemma: form.toLowerCase(), upos, feats: "", head, deprel, karaka });
const gapsOf = (rows, o) => consistencyOf(rows, o).gaps.map((g) => g.gap);
test("a well-formed clause is consistent; a verbless fragment is consistent (there is no verb the root should have been)", () => {
  assert.equal(consistencyOf([R(1, "dog", "NOUN", 2, "nsubj", "kartṛ"), R(2, "chased", "VERB", 0, "root"), R(3, "cat", "NOUN", 2, "obj", "karman")]).consistent, true);
  assert.equal(consistencyOf([R(1, "Good", "ADJ", 2, "amod"), R(2, "morning", "NOUN", 0, "root")]).consistent, true);
  assert.equal(consistencyOf([R(1, "sky", "NOUN", 3, "nsubj", "kartṛ"), R(2, "is", "AUX", 3, "cop"), R(3, "blue", "ADJ", 0, "root")]).consistent, true, "a copular predicate is a predicate");
});
test("root_not_predicate: a noun root while the sentence has a verb makes root, polarity and roles unknown", () => {
  const c = consistencyOf([R(1, "dog", "NOUN", 0, "root"), R(2, "that", "PRON", 3, "nsubj", "kartṛ"), R(3, "barked", "VERB", 1, "acl:relcl")]); assert.deepEqual(c.gaps.map((g) => g.gap), ["root_not_predicate"]); assert.deepEqual(c.unknown, { root: true, polarity: true, roles: true });
});
test("duplicate_kartr and karman_contested fire on two uncoordinated participants of one action, and NOT when the second is a conjunct; they leave the root and polarity known", () => {
  assert.deepEqual(gapsOf([R(1, "cat", "NOUN", 3, "nsubj", "kartṛ"), R(2, "dog", "NOUN", 3, "nsubj", "kartṛ"), R(3, "chased", "VERB", 0, "root")]), ["duplicate_kartr"]);
  const two = consistencyOf([R(1, "sent", "VERB", 0, "root"), R(2, "students", "NOUN", 1, "obj", "karman"), R(3, "message", "NOUN", 1, "obj", "karman")]); assert.deepEqual(two.gaps.map((g) => g.gap), ["karman_contested"]); assert.deepEqual(two.unknown, { root: false, polarity: false, roles: true });
  assert.equal(consistencyOf([R(1, "saw", "VERB", 0, "root"), R(2, "cat", "NOUN", 1, "obj", "karman"), R(3, "dog", "NOUN", 2, "conj", "karman")]).consistent, true, "coordination shares a role");
});
test("clausal_participant: a verb labelled as the patient of another verb; unattested_closed_class: a function word the lexicon never saw, skipped (and said) with no lexicon", () => {
  assert.deepEqual(gapsOf([R(1, "cat", "NOUN", 2, "nsubj", "kartṛ"), R(2, "got", "VERB", 0, "root"), R(3, "chased", "VERB", 2, "xcomp", "karman")]), ["clausal_participant"]);
  const rows = [R(1, "dog", "NOUN", 3, "nsubj", "kartṛ"), R(2, "didn't", "PART", 3, "advmod"), R(3, "chase", "VERB", 0, "root")], lex = { form: { "not|PART": "not\tPolarity=Neg" } };
  const c = consistencyOf(rows, { lexicon: lex }); assert.deepEqual(c.gaps.map((g) => g.gap), ["unattested_closed_class"]); assert.equal(c.unknown.polarity, true);
  assert.equal(consistencyOf([R(1, "dog", "NOUN", 3, "nsubj", "kartṛ"), R(2, "not", "PART", 3, "advmod"), R(3, "chase", "VERB", 0, "root")], { lexicon: lex }).consistent, true);
  assert.deepEqual(consistencyOf(rows).skipped, ["unattested_closed_class: no lexicon given"]); assert.equal(consistencyOf(rows).consistent, true);
  assert.ok(Object.values(CONSISTENCY_GAPS).every((s) => s === "all" || s === "roles"));
});
const PF = await import("../../the-fold/pharos-reading.mjs"), g = await PF.grammarFor("eng"), skip = g.gap ? `no English parser prior: ${g.why}` : false;
test("on real rows (DEV: the sentences these checks were built on, eval/falsify-shape): plain actives, passives and imperatives stay consistent; the relative clause, the unsplit contraction and the double object are flagged", { skip }, () => {
  const c = (t) => consistencyOf(karakaRows(PF.readingRows(g, t).filter((r) => r.s === 0), { stem: "eng" }), { lexicon: g.parser.lexicon });
  for (const t of ["The dog chased the cat.", "The cat was chased by the dog.", "Trim this clip.", "Never delete this clip.", "Did the dog chase the cat?"]) assert.equal(c(t).consistent, true, t);
  assert.ok(c("The dog that chased the cat barked.").gaps.some((x) => x.gap === "root_not_predicate")); assert.ok(c("The dog didn't chase the cat.").gaps.some((x) => x.gap === "unattested_closed_class")); assert.ok(c("The teacher sent the students a message.").gaps.some((x) => x.gap === "karman_contested"));
});
