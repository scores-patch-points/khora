// chat/speech-frames.test.mjs — the MARK-FREE layer: speech reported by a verb of saying, with no quotation marks (KJV Genesis: "And God said, Let there be light"; 35 of 65 Genesis editions mark nothing).
// The layer reads UD rows (the codec contract: id, form, lemma, upos, head, deprel, start, end), so it is codec-neutral; the only language-specific input is WHICH verbs are speech verbs, and that is a prior's answer, injected.
// Written before the module; each test says what would falsify it.
import test from "node:test"; import assert from "node:assert/strict";
import { speechFrames, speechVerbFromActPrior, heldAt } from "./speech-frames.js";

// UD rows by hand, so the pure rule is tested without any parser. "God said , Let there be light"
const R = (id, form, upos, head, deprel, start) => ({ id, form, lemma: form.toLowerCase(), upos, head, deprel, start, end: start + form.length });
const GOD_SAID = [R(1, "God", "PROPN", 2, "nsubj", 0), R(2, "said", "VERB", 0, "root", 4), R(3, ",", "PUNCT", 2, "punct", 8), R(4, "Let", "VERB", 2, "dep", 10), R(5, "there", "PRON", 6, "expl", 14), R(6, "be", "VERB", 4, "xcomp", 20), R(7, "light", "NOUN", 6, "nsubj", 23)];
const isSpeech = (lemma) => ["said", "replied", "cried"].includes(lemma);

test("a speech verb, a comma, then a clause: the clause is held by the verb's subject, direct", () => {
  const f = speechFrames(GOD_SAID, isSpeech); assert.equal(f.length, 1);
  assert.equal(f[0].holder.text, "God"); assert.equal(f[0].holder.head, "God"); assert.equal(f[0].mode, "direct"); assert.deepEqual(f[0].complement, [9, 28]);
  assert.equal(heldAt(f, 12).holder.text, "God"); assert.equal(heldAt(f, 4), null, "the speech verb itself is narration");
});
test("the parser may INVERT the attachment (the speech verb hangs from the quoted clause as advcl or parataxis): the position decides, not the tree", () => {
  const rows = [R(1, "woman", "NOUN", 2, "nsubj", 0), R(2, "said", "VERB", 7, "parataxis", 6), R(3, ",", "PUNCT", 2, "punct", 10), R(4, "The", "DET", 5, "det", 12), R(5, "serpent", "NOUN", 7, "nsubj", 16), R(6, "also", "ADV", 7, "advmod", 24), R(7, "beguiled", "VERB", 0, "root", 29)];
  const f = speechFrames(rows, isSpeech); assert.equal(f.length, 1); assert.equal(f[0].holder.text, "woman"); assert.equal(heldAt(f, 29).holder.text, "woman");
});
test("indirect speech: a 'that' complementizer after the speech verb opens a reported frame", () => {
  const rows = [R(1, "Bennet", "PROPN", 2, "nsubj", 0), R(2, "replied", "VERB", 0, "root", 7), R(3, "that", "SCONJ", 5, "mark", 15), R(4, "he", "PRON", 5, "nsubj", 20), R(5, "had", "VERB", 2, "ccomp", 23)];
  const f = speechFrames(rows, isSpeech); assert.equal(f[0].mode, "indirect"); assert.equal(heldAt(f, 23).holder.text, "Bennet");
});
test("TRAP: a clause coordinated after the speech ('...: and there was light') is UNKNOWN, never silently narration and never silently speech", () => {
  const rows = [...GOD_SAID, R(8, ":", "PUNCT", 11, "punct", 28), R(9, "and", "CCONJ", 11, "cc", 30), R(10, "there", "PRON", 11, "expl", 34), R(11, "was", "VERB", 4, "conj", 40), R(12, "light", "NOUN", 11, "nsubj", 44)];
  const f = speechFrames(rows, isSpeech); assert.equal(heldAt(f, 12).holder.text, "God"); const w = heldAt(f, 40); assert.equal(w.unknown, true, "the coordinated clause is marked unknown"); assert.ok(f[0].partial);
});
test("TRAP: a speech verb that is the tag of a MARKED quotation has no mark-free complement ('“Hello,” said Pierre, and he left.' must not make 'left' Pierre's speech)", () => {
  const rows = [R(1, "Hello", "INTJ", 3, "discourse", 1), R(2, ",", "PUNCT", 3, "punct", 6), R(3, "said", "VERB", 0, "root", 9), R(4, "Pierre", "PROPN", 3, "nsubj", 14), R(5, ",", "PUNCT", 3, "punct", 20), R(6, "and", "CCONJ", 8, "cc", 22), R(7, "he", "PRON", 8, "nsubj", 26), R(8, "left", "VERB", 3, "conj", 29)];
  const f = speechFrames(rows, isSpeech, { quotes: [{ open: 0, close: 7, depth: 0 }] }); assert.equal(f.length, 0);
});
test("TRAP: a verb that is not a speech verb never opens a frame, comma or not", () => {
  const rows = [R(1, "He", "PRON", 2, "nsubj", 0), R(2, "ran", "VERB", 0, "root", 3), R(3, ",", "PUNCT", 2, "punct", 6), R(4, "Go", "VERB", 2, "dep", 8)];
  assert.deepEqual(speechFrames(rows, isSpeech), []);
});
test("nested speech: 'he said, Yea, hath God said, Ye shall not eat' is two frames, the inner one deeper and held by God", () => {
  const rows = [R(1, "he", "PRON", 2, "nsubj", 0), R(2, "said", "VERB", 0, "root", 3), R(3, ",", "PUNCT", 2, "punct", 7), R(4, "God", "PROPN", 5, "nsubj", 9), R(5, "said", "VERB", 2, "ccomp", 13), R(6, ",", "PUNCT", 5, "punct", 17), R(7, "Ye", "PRON", 9, "nsubj", 19), R(8, "shall", "AUX", 9, "aux", 22), R(9, "eat", "VERB", 5, "ccomp", 28)];
  const f = speechFrames(rows, isSpeech); assert.equal(f.length, 2); const inner = heldAt(f, 28); assert.equal(inner.holder.text, "God"); assert.equal(inner.depth, 2); assert.equal(inner.chain.at(-1).holder.text, "he");
});
test("a speech verb with no complement (a tag at the end) opens nothing", () => {
  const rows = [R(1, "Pierre", "PROPN", 2, "nsubj", 0), R(2, "said", "VERB", 0, "root", 7)]; assert.deepEqual(speechFrames(rows, isSpeech), []);
});

// ── the speech-verb predicate is a PRIOR's answer, never a typed list ──
test("speech verbs come from the act prior's communication classes (VerbNet 37.x); a missing prior is a typed gap, not a default list", () => {
  const prior = { forms: { say: { classes: ["say-37.7"] }, tell: { classes: ["see-30.1", "transfer_mesg-37.1.1"] }, run: { classes: ["run-51.3.2"] }, cry: { standing: "contested", candidates: [{ classes: ["breathe-40.1.2"] }, { classes: ["manner_speaking-37.3"] }] }, answer: { classes: ["reciprocate-112"] } } };
  const p = speechVerbFromActPrior(prior); assert.equal(p.gap, null); assert.equal(p.isSpeech("say"), true); assert.equal(p.isSpeech("tell"), true); assert.equal(p.isSpeech("cry"), true); assert.equal(p.isSpeech("run"), false);
  assert.equal(p.isSpeech("answer"), false, "a stated limit: the prior does not hold 'answer' as communication");
  // FOUND by the KJV oracle: one communication reading among many is not a speech verb ("go" has one, "dwell" has lecture-37.11 'dwell on'); where a verb's readings sit decides
  const prior2 = { forms: { go: { standing: "contested", candidates: [{ classes: ["escape-51.1"] }, { classes: ["meander-47.7"] }, { classes: ["occur-48.3"] }, { classes: ["lecture-37.11"] }] }, dwell: { classes: ["exist-47.1", "focus-87.1", "lecture-37.11", "lodge-46"] }, say: { standing: "contested", candidates: [{ classes: ["indicate-78", "say-37.7"] }, { classes: ["pronounce-29.3.1"] }] } } };
  const q = speechVerbFromActPrior(prior2); assert.equal(q.isSpeech("go"), false); assert.equal(q.isSpeech("dwell"), false); assert.equal(q.isSpeech("say"), true);
  const none = speechVerbFromActPrior(null); assert.equal(none.gap?.gap, "no_act_prior"); assert.equal(none.isSpeech("say"), false);
});

// ── on a thread, over real KJV Genesis (no quotation marks anywhere), hand-labelled from the verses: `reported` is true inside what was said, false for narration, null where the text cannot say ──
let mk = null, ingestDocument = null, askFramed = null, why = null;
try { const { makeThread } = await import("../../chat/thread.mjs"); ({ ingestDocument, askFramed } = await import("../../chat/ingest.mjs")); mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-26T10:00:00") }); await mk(); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: mk ? false : `no reader here: ${why}` };
const KJV = ["And God said, Let there be light: and there was light.", "And the LORD God said unto the woman, What is this that thou hast done?", "And the woman said, The serpent beguiled me, and I did eat.", "Now the serpent was more subtil than any beast of the field which the LORD God had made.", "Mr. Bennet replied that he had not.", "“Hello,” said Pierre, and he left.", "And he said unto the woman, Yea, hath God said, Ye shall not eat of every tree of the garden?"];
// [paragraph, verb form, reported, holder]
const GOLD = [[0, "said", false, null], [0, "was", null, "God"], [1, "said", false, null], [1, "done", true, "LORD"], [2, "said", false, null], [2, "beguiled", true, "woman"], [2, "eat", null, "woman"], [3, "made", false, null], [4, "replied", false, null], [4, "had", true, "Bennet"], [5, "left", false, null], [6, "eat", true, "God"]];
test("GOLD: unmarked speech in KJV Genesis: each verb is held, narration or unknown exactly as hand-labelled", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, KJV.join("\n\n")); const wrong = [], miss = [];
  for (const [pi, form, want, holder] of GOLD) { const hit = r.frames.find((x) => x.para === pi && x.form === form); if (!hit) { miss.push(`${pi}:${form}`); continue; } if (hit.reported !== want || (holder && hit.reportedHead !== holder)) wrong.push(`${pi}:${form} reported=${hit.reported} head=${hit.reportedHead} want=${want}/${holder}`); }
  console.log(`# kjv gold: ${GOLD.length - miss.length} of ${GOLD.length} verbs found; wrong ${wrong.length}; not found ${miss.join(",") || "-"}`);
  assert.deepEqual(wrong, [], wrong.join(" | ")); assert.ok(miss.length <= 3, `missing ${miss}`);
});
test("TRAP: narration with no speech verb is never reported; a marked quotation's tag does not turn the narration after it into speech", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, KJV.join("\n\n"));
  for (const f of r.frames.filter((x) => x.para === 3 || x.para === 5)) assert.notEqual(f.reported, true, `${f.para}:${f.form}`);
});
test("the pre-existing mark layer is unchanged: `framed` still means inside quotation marks, and KJV has none", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, KJV.slice(0, 5).join("\n\n")); assert.ok(r.frames.length > 0); assert.ok(r.frames.every((f) => f.framed === false));
});
test("an answer that lies inside what was said, in an edition with no quotation marks, says whose words it is; one from narration is unchanged", T, async () => {
  const th = await mk(); await ingestDocument(th, KJV.join("\n\n"));
  const a = await askFramed(th, "Who beguiled me?"); assert.match(a.text, /^According to the woman: /); assert.match(a.text, /serpent/i); assert.equal(a.framed, true); assert.equal(a.holder, "the woman");
  const n = await askFramed(th, "Who replied that he had not?"); assert.doesNotMatch(n.text, /^According to/); assert.equal(n.framed, false);
});
test("a missing act prior is a typed gap on the result and nothing is reported (never a default verb list)", T, async () => {
  const th = await mk(); const r = await ingestDocument(th, KJV[0], { actPrior: null }); assert.ok(r.quoteGaps.some((g) => g.gap === "no_act_prior")); assert.ok(r.frames.every((f) => f.reported === null || f.reported === false));
});

test("a conjunction the parser hangs under the subject is not part of the speaker ('And God' is God)", () => {
  const rows = [R(1, "And", "CCONJ", 2, "cc", 0), R(2, "God", "PROPN", 3, "nsubj", 4), R(3, "said", "VERB", 0, "root", 8), R(4, ",", "PUNCT", 3, "punct", 12), R(5, "Go", "VERB", 3, "dep", 14)];
  assert.equal(speechFrames(rows, isSpeech)[0].holder.text, "God");
});

test("FOUND by the oracle: a clause that begins with a coordinating 'and' after the separator continues the same sentence, it is not what was said ('there went up a mist, and watered the ground')", () => {
  const rows = [R(1, "mist", "NOUN", 2, "nsubj", 0), R(2, "said", "VERB", 0, "root", 5), R(3, ",", "PUNCT", 2, "punct", 9), R(4, "and", "CCONJ", 5, "cc", 11), R(5, "watered", "VERB", 2, "conj", 15), R(6, "ground", "NOUN", 5, "obj", 23)];
  assert.deepEqual(speechFrames(rows, isSpeech), []);
});
