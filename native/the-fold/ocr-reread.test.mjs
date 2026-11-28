// ocr-reread: a second reading beside the first. Each test names how it could be false. Needs the priors home (pos-eng.json); the weave test needs PHAROS_HOME and the English parser prior.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { pathToFileURL } from "node:url";
import { rereadOcr, revisedText, initialText, tokensOf, formsOf, undecidedOf, collapseToken, weaveRereading, REREADING_KIND, REREADING_CELL } from "./ocr-reread.mjs"; import { standingOf } from "../kernel/undecided.js"; import { grammarFor, pharosLib, sha16 } from "./pharos-reading.mjs";
const V = formsOf("eng"), skip = V.gap ? `no English form prior: ${V.why}` : false, T = "The agreernent was signed by the hank. Zyxqvwk refused the agreernent, and 1,204 others did.";
test("FALSE IF the first reading can be lost: the initial text is rebuilt exactly from the revised text and the rereading, and tokens tile the text by offset", { skip }, () => {
  const rr = rereadOcr(T, { dials: { docKnown: 0 } }), rev = revisedText(T, rr); assert.notEqual(rev, T, "something is proposed here"); assert.equal(initialText(rev, rr), T); assert.equal(rr.initial.sha16, sha16(T));
  for (const t of tokensOf(T)) assert.equal(T.slice(t.at[0], t.at[1]), t.pre + t.core + t.post); for (const r of rr.tokens) assert.equal(T.slice(r.at[0], r.at[1]), r.initial);
});
test("FALSE IF a known word, a number or a mark is touched, or an unknown word with no attested neighbour is 'repaired': only unknown tokens are listed; 'Zyxqvwk' is unknown and stays; '1,204' is kept", { skip }, () => {
  const rr = rereadOcr(T, { dials: { docKnown: 0 } }), by = (w) => rr.tokens.find((r) => r.initial === w); assert.equal(by("signed"), undefined); assert.equal(by("1,204"), undefined); assert.equal(by("Zyxqvwk").status, "unknown");
  assert.equal(rr.counts.kept + rr.counts.proposed + rr.counts.contested + rr.counts.unknown, rr.counts.tokens); assert.ok(revisedText(T, rr).includes("Zyxqvwk"));
});
test("FALSE IF the organ invents its own shape: every listed token is an EOUndecided@1 slot whose candidate 0 is the first reading; a collapse is appended for a for-whom under a named rule and never rewrites the slot; a second for-whom may collapse differently and both stand", { skip }, () => {
  const rr = rereadOcr(T, { dials: { docKnown: 0 } }), slots = undecidedOf(T, rr); assert.equal(slots.length, rr.tokens.length);
  for (const [i, s] of slots.entries()) { assert.equal(s.schema, "EOUndecided@1"); assert.equal(s.standing, "open"); assert.equal(s.candidates[0].value, rr.tokens[i].initial); assert.equal(s.candidates[0].via, "first reading"); }
  const slot = slots.find((s) => s.candidates[0].value === "agreernent"), strict = collapseToken(slot, { forWhom: { id: "strict-reader" }, dials: { floor: 1e9, margin: 0 } }), easy = collapseToken(slot, { forWhom: { id: "easy-reader" }, dials: { floor: -1e9, margin: 0 } });
  assert.equal(easy.verdict, "chosen"); assert.equal(easy.chosen.value, "agreement"); assert.notEqual(strict.verdict, "chosen"); assert.equal(slot.standing, "open", "the slot itself is never rewritten");
  assert.equal(standingOf(slot, [strict, easy], { id: "easy-reader" }).standing, "chosen"); assert.equal(standingOf(slot, [strict, easy], { id: "strict-reader" }).standing, strict.verdict); assert.equal(standingOf(slot, [], { id: "nobody" }).standing, "open");
});
test("FALSE IF another language is read as English: a language with no form prior is the typed gap no_form_prior", () => { assert.equal(rereadOcr("x y z", { language: "zzz" }).gap, "no_form_prior"); });
const lib = pharosLib(), g = await grammarFor("eng"), skipW = skip || (!lib ? "no pharos (set PHAROS_HOME)" : g.gap ? `no English parser prior: ${g.why}` : false);
test("FALSE IF the weave replaces anything: the initial text and its reading are in the log unchanged; the rereading is INS·Figure of the initial (and the revised) text; a second weave writes nothing", { skip: skipW }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kocr-")), a = await weaveRereading(T, { language: "eng", log: "t", dir, dials: { docKnown: 0 } }); assert.ok(a.written.includes(REREADING_KIND), JSON.stringify(a));
  const P = await import(pathToFileURL(lib).href), h = P.open("t", { writer: "reader", dir }), texts = P.fold(h, { kind: "text" }).entries, rr = P.fold(h, { kind: REREADING_KIND }).entries;
  assert.equal(texts.length, 2); assert.ok(texts.some((e) => e.body.text === T), "the first reading is in the log as read"); assert.equal(P.fold(h, { kind: "text-reading" }).entries.length, 2);
  assert.equal(rr.length, 1); assert.equal(rr[0].cell, REREADING_CELL); assert.equal(rr[0].addr, `reread:${sha16(T)}`); assert.equal(rr[0].of.length, 2); assert.equal(rr[0].body.initialReading, `reading:${sha16(T)}`);
  assert.deepEqual((await weaveRereading(T, { language: "eng", log: "t", dir, dials: { docKnown: 0 } })).written, []);
});
