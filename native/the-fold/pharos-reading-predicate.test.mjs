// the opt-in PREDICATE REPAIR (readingRows { predicate: true }): a clause the tagger gave no verb is re-tagged at the NOUN word, after a nominal and governing a following word, closest to VERB by the tagger's own scores.
// Measured on DEV 2026-11-20 (not claimed): "works at" read as a verb 1/12 -> 12/12 on twelve names. Known false repair: "Garden tools sale" (gap 37 against 6-12 for the real cases). Needs the English parser prior (KHORA_PRIORS_DIR); skips without it.
import test from "node:test"; import assert from "node:assert/strict";
import { grammarFor, readingRows } from "./pharos-reading.mjs";
const g = await grammarFor("eng"), skip = g.gap ? `no English parser prior (${g.gap})` : false;
const upos = (rows, form) => rows.find((r) => r.form === form)?.upos;
test("off by default: the tagger's own reading is unchanged", { skip }, () => { assert.ok(!readingRows(g, "Anna works at Acme.").some((r) => r.repaired)); });
test("a clause with no verb gets one, at the word the tagger finds closest to a verb; the row says it was repaired and by how much", { skip }, () => {
  const off = readingRows(g, "Anna works at Acme."), on = readingRows(g, "Anna works at Acme.", { predicate: true }), w = on.find((r) => r.form === "works");
  assert.equal(upos(off, "works"), "NOUN"); assert.equal(upos(on, "works"), "VERB"); assert.equal(w.repaired, "predicate"); assert.ok(w.repairGap > 0);
  assert.equal(on.find((r) => r.form === "works").lemma, "work", "the lemma is the verb's");
});
test("a sentence that already has a predicate is untouched, and a headline that ends on its last noun is left alone", { skip }, () => {
  assert.ok(!readingRows(g, "Tom now lives in Leeds.", { predicate: true }).some((r) => r.repaired));
  for (const h of ["Apple stock", "Our team", "Lunch break"]) assert.ok(!readingRows(g, h, { predicate: true }).some((r) => r.repaired), h);
});
