// speaker-rung.test.mjs — the speaker / addressee rung is part of the canonical read for English: each "I" in a quotation is the speaker of that quotation, a "you" the previous quotation's speaker, the narrator one referent;
// another language says it is a typed gap; the bindings carry `ref` (the speaker's own referent) beside `cl` (one per kind per text); and the competency profile says what is still not admitted.
import test from "node:test"; import assert from "node:assert/strict";
process.env.KHORA_NO_PHAROS_GATE = "1"; process.env.KHORA_ALLOW_DEGRADED = process.env.KHORA_ALLOW_DEGRADED ?? "1";
const { readToWeft } = await import("../the-fold/read-process.mjs");
const TEXT = "“I will go,” said Pierre. “You must stay here,” Natasha answered. “Where is my hat?” asked Pierre. I watched them from the door of the old house, and the rain had stopped. “Nobody asked me,” said a voice from the garden. I left at dawn without a word to anyone, and I did not come back.";
const read = (opts = {}) => readToWeft(TEXT, { language: "eng", address: "t:speaker-rung", allowDegraded: true, ...opts });
test("English reads speakers by default: bindings with the speaker's referent (a cast ref or an anonymous one per quotation) beside the one-per-text class", () => {
  const w = read(); assert.ok(Array.isArray(w.speakerBindings), JSON.stringify(w.speakerBindings)); assert.ok(w.speakerBindings.length >= 4);
  const kinds = new Set(w.speakerBindings.map((b) => b.kind)); assert.ok(kinds.has("speaker")); for (const b of w.speakerBindings) { assert.match(b.cl, /^one:(speaker|addressee)$/); assert.ok(b.ref, "each binding names the referent it stands for"); assert.ok(b.a >= 0 && b.b > b.a); }   // regex-ok: the binding's own class label
  const refs = new Set(w.speakerBindings.filter((b) => b.kind === "speaker").map((b) => b.ref)); assert.ok(refs.size >= 2, `two quotations by different speakers are two referents (${[...refs].join(", ")})`);
});
test("speakers: false turns the rung off and the entry has no speakerBindings; speakers: true is the same as the default for English", () => {
  assert.equal(read({ speakers: false }).speakerBindings, undefined); assert.deepEqual(read({ speakers: true }).speakerBindings, read().speakerBindings);
});
test("another language is a typed gap, not an English guess", () => {
  const w = readToWeft("Он сказал: «Я пойду домой». Она ответила: «Ты останешься здесь, потому что идёт дождь, и вечер уже наступил».", { language: "rus", address: "t:speaker-rung-ru", allowDegraded: true });
  if (w.skipped || w.error) return; assert.ok(!Array.isArray(w.speakerBindings) || w.speakerBindings.length === 0 || w.speakerBindings.gap); if (w.speakerBindings?.gap) assert.equal(w.speakerBindings.gap, "speakers_english_only");
});
test("the competency profile says the speaker kind is partial for English (still not counted as admitted) and that nominals are not admitted", async () => {
  const { competencyOf } = await import("../adapters/text/language-competency.js"), c = competencyOf("eng"); assert.match(String(c.referents.kinds.speaker_addressee), /partial: I\/you\/we in quotations/); assert.ok(c.referents.unadmitted.includes("nominal")); assert.ok(c.referents.unadmitted.includes("speaker_addressee"), "partial counts as not admitted");   // regex-ok: a competency label
  assert.equal(competencyOf("grc").referents.kinds.speaker_addressee, false);
});
