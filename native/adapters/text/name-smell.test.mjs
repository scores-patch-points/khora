// adapters/text/name-smell.test.mjs — does a surface SMELL like a name? Every signal is a WEIGHT on a log-odds score; the answer is a probability, never a veto.
// Written to survive casual speech and typos: casing evidence is scaled by how reliably the document uses case at all, the part-of-speech prior is a Bayesian offset (not a rule), and strong contrary evidence can outvote any single signal.
// The tests inject simple weights so they check the DIRECTION and SHAPE of the model; the fitted weights are measured separately (native/scripts/fit-name-smell.mjs) and falsified under noise.
import test from "node:test"; import assert from "node:assert/strict";
import { nameSmell, casingReliability, sentenceStartsOf, logit, sigmoid } from "./name-smell.js";

const W = { intercept: -1.2, w: { mid: 3.0, init: -0.4, tag: 1.6, repeat: 0.9 }, prior: { pseudo: 2, base: 0.2 } };   // test weights, plainly directional
const POS = { i: { PRON: 900 }, and: { CCONJ: 999 }, day: { NOUN: 170, PROPN: 8 }, man: { NOUN: 36 }, yea: { INTJ: 3 }, see: { VERB: 205 }, kitty: { NOUN: 3, PROPN: 2 }, elizabeth: { PROPN: 2 }, "shed": { VERB: 4 } };
const text = "Kitty coughed. Day came and the day went. Yea, said Bennet. See the man and the man saw Kitty. I think Bennet knew. Hast thou eaten? Wherefore did Mrs. Long call Bennet? Bennet saw Long.";
const S = sentenceStartsOf(text);
const p = (surface, o = {}) => nameSmell({ surface, text, sentenceStarts: S, pos: POS, weights: W, ...o });

test("the answer is a probability with its evidence: p, logit and each signal's contribution", () => {
  const r = p("Bennet"); assert.ok(r.p > 0 && r.p < 1); assert.ok(Math.abs(logit(r.p) - r.logit) < 1e-9); assert.ok(r.contributions && "mid" in r.contributions && "prior" in r.contributions);
  assert.ok(Math.abs(Object.values(r.contributions).reduce((a, b) => a + b, 0) + W.intercept - r.logit) < 1e-9, "the contributions sum to the logit");
});
test("ORDER: a name capitalised mid-sentence and repeated outranks a word that also occurs lowercase, a sentence-opener and a pronoun", () => {
  const b = p("Bennet").p; for (const w of ["Day", "Yea", "Hast", "See", "I"]) assert.ok(b > p(w).p, `Bennet ${b.toFixed(2)} > ${w} ${p(w).p.toFixed(2)}`);
  assert.ok(b > 0.5, `a clear name is more likely than not: ${b}`);
});
test("MONOTONE: each lowercase occurrence of the same word lowers its probability; each capitalised mid-sentence one raises it", () => {
  const base = (t) => nameSmell({ surface: "Rowan", text: t, sentenceStarts: sentenceStartsOf(t), pos: {}, weights: W }).p;
  const t0 = "Then Rowan came. We saw Rowan.", t1 = t0 + " A rowan tree grew.", t2 = t1 + " The rowan fell.", t3 = t0 + " Then Rowan left.";
  assert.ok(base(t0) > base(t1) && base(t1) > base(t2), `${base(t0)} ${base(t1)} ${base(t2)}`); assert.ok(base(t3) > base(t0));
});
test("CASUAL SPEECH: in text with no capitalisation the casing signals carry no weight, so a name is still found by what remains (the parser's tag, repetition, the prior), and a stopword is not", () => {
  const t = "howard shore wrote it. i think howard shore is great. you know howard shore. the man said it and the man left.", s = sentenceStartsOf(t), posAt = new Map([[0, "PROPN"], [t.indexOf("howard", 20), "PROPN"], [t.indexOf("howard", 60), "PROPN"]]);
  assert.ok(casingReliability(t, s) < 0.2, `a lowercase text is not casing-reliable: ${casingReliability(t, s)}`);
  const h = nameSmell({ surface: "howard", text: t, sentenceStarts: s, pos: {}, posAt, weights: W }), m = nameSmell({ surface: "man", text: t, sentenceStarts: s, pos: POS, posAt: new Map(), weights: W });
  assert.ok(Math.abs(h.contributions.mid) < 0.05 && Math.abs(h.contributions.init) < 0.05, "no casing evidence in a lowercase text"); assert.ok(h.p > m.p, `howard ${h.p.toFixed(2)} > man ${m.p.toFixed(2)}`);
  assert.ok(h.p > 0.5, `the tag and the repetition carry it: ${h.p}`);
});
test("TYPOS: a name misspelled in one place and spelled right in others stays a name; a one-off mistyped COMMON word does not become one", () => {
  const t = "Then Bingley came. We saw Bingley. Bingly left. Later Bingley wrote. teh man came.", s = sentenceStartsOf(t);
  assert.ok(nameSmell({ surface: "Bingley", text: t, sentenceStarts: s, pos: {}, weights: W }).p > 0.5);
  assert.ok(nameSmell({ surface: "Bingly", text: t, sentenceStarts: s, pos: {}, weights: W }).p > nameSmell({ surface: "teh", text: t, sentenceStarts: s, pos: {}, weights: W }).p, "a capitalised mid-sentence one-off outranks a lowercase typo");
});
test("SOFT, NOT A VETO: a word the prior knows as a pronoun only a couple of times, used as a capitalised name over and over, can be a name; one the prior knows from 900 uses cannot", () => {
  const t = "Then Ye came. We saw Ye. Ye left. Ye wrote. Ye said.", s = sentenceStartsOf(t);
  const rare = nameSmell({ surface: "Ye", text: t, sentenceStarts: s, pos: { ye: { PRON: 2 } }, posAt: new Map(), weights: W }).p, common = nameSmell({ surface: "Ye", text: t, sentenceStarts: s, pos: { ye: { PRON: 900 } }, posAt: new Map(), weights: W }).p;
  assert.ok(rare > 0.5, `rare pronoun use is outvoted by the text: ${rare}`); assert.ok(common < 0.05, `900 pronoun uses dominate: ${common}`); assert.ok(common > 0 && common < rare);
});
test("the parser's tag is evidence, not a veto: PROPN in context raises, VERB in context lowers, and a single mis-tag can be outvoted by the text", () => {
  const t = "Then Shed came. We saw Shed. Shed left.", s = sentenceStartsOf(t), at = (n) => { let i = -1; for (let k = 0; k <= n; k++) i = t.indexOf("Shed", i + 1); return i; };
  const mk = (tags) => nameSmell({ surface: "Shed", text: t, sentenceStarts: s, pos: {}, posAt: new Map(tags.map((u, n) => [at(n), u])), weights: W }).p;
  assert.ok(mk(["PROPN", "PROPN", "PROPN"]) > mk(["PROPN", "PROPN", "VERB"]) && mk(["PROPN", "PROPN", "VERB"]) > mk(["VERB", "VERB", "VERB"])); assert.ok(mk(["PROPN", "PROPN", "VERB"]) > 0.5, "one mis-tag in three is outvoted");
});
test("a title with its name is judged on the name; a bare title is just a token, and joining it to the name is the cast builder's job (no special case here)", () => {
  const t2 = "Then Mr. Bennet came. We saw Mr. Bennet. Mr. Bennet left.", r2 = nameSmell({ surface: "Mr.", text: t2, sentenceStarts: sentenceStartsOf(t2), pos: {}, weights: W });
  assert.ok(p("Mrs. Long").p > 0.5); assert.equal(r2.schema, "NameSmell@2"); assert.ok(r2.p > 0 && !("abbreviation" in r2.contributions), "scored by the same joint model, no disconnected branch for abbreviations");
});
test("a surface not in the text, or weights not given, are typed gaps, never a default answer", () => {
  assert.equal(p("Zebulun").p, null); assert.equal(p("Zebulun").gap, "not_in_text");
  const r = nameSmell({ surface: "Bennet", text, sentenceStarts: S, pos: POS, weights: null, weightsFile: "/nonexistent.json" }); assert.equal(r.p, null); assert.equal(r.gap, "no_name_smell_weights");
});
test("no prior is a typed note on the answer, and the answer still stands", () => {
  const r = nameSmell({ surface: "Bennet", text, sentenceStarts: S, pos: null, weights: W }); assert.ok(r.p > 0.5); assert.equal(r.priorGap, "no_pos_prior");
});
test("casingReliability is the share of sentence starts that are capitalised: 1 for ordinary prose, 0 for a lowercase chat message", () => {
  assert.equal(casingReliability("Then he came. And she left. So it went.", sentenceStartsOf("Then he came. And she left. So it went.")), 1);
  assert.equal(casingReliability("then he came. and she left.", sentenceStartsOf("then he came. and she left.")), 0);
});
test("sigmoid and logit are inverses", () => { for (const x of [-4, -0.3, 0, 2.2]) assert.ok(Math.abs(logit(sigmoid(x)) - x) < 1e-9); });

// ── STACKING: the signals are ONE joint model, so evidence that agrees collapses the uncertainty and evidence that conflicts widens it (no branches that do not connect) ──
// `cov` is the posterior covariance of [intercept, mid, init, tag, repeat] from the fit (Laplace approximation); the model returns the logit's standard deviation and a certainty = |logit| / sd.
const WC = { ...W, cov: [[0.05, 0, 0, 0, 0], [0, 0.05, 0, 0, 0], [0, 0, 0.05, 0, 0], [0, 0, 0, 0.05, 0], [0, 0, 0, 0, 0.05]] };
test("STACKING: each signal that agrees raises the certainty; a signal that conflicts lowers it relative to the agreeing case", () => {
  const t = "Then Rowan came. We saw Rowan. Later Rowan left. Rowan wrote.", s = sentenceStartsOf(t), at = (n) => { let i = -1; for (let k = 0; k <= n; k++) i = t.indexOf("Rowan", i + 1); return i; };
  const tags = (u) => new Map([0, 1, 2, 3].map((n) => [at(n), u]));
  const f = (posAt) => nameSmell({ surface: "Rowan", text: t, sentenceStarts: s, pos: {}, posAt, weights: WC });
  const none = f(undefined), agree = f(tags("PROPN")), conflict = f(tags("VERB"));
  assert.ok(agree.certainty > none.certainty, `casing + tag agree: ${agree.certainty} > casing alone ${none.certainty}`);
  assert.ok(agree.certainty > conflict.certainty, `agreeing ${agree.certainty} > conflicting ${conflict.certainty}`);
  assert.ok(agree.sd > 0 && "sd" in none);
});
test("STACKING: with no covariance given, the model still answers and says it has no uncertainty estimate (typed), never a made-up one", () => {
  const r = nameSmell({ surface: "Bennet", text, sentenceStarts: S, pos: POS, weights: W }); assert.ok(r.p > 0.5); assert.equal(r.sd, null); assert.equal(r.uncertaintyGap, "no_covariance");
});

// ── the SHIPPED weights: they are the file that passed the gate, and the test pins what the gate decided ──
import { loadWeights } from "./name-smell.js";
test("the shipped weights are the gate's: no 'repeat' signal, a covariance, the gate's own numbers, and the weak-label (circular) fit is not what is installed", () => {
  const w = loadWeights(); assert.ok(w, "weights file present"); assert.equal(w.schema, "NameSmellWeights@2"); assert.deepEqual(w.signals, ["mid", "init", "tag"]); assert.equal(w.w.repeat, 0);
  assert.ok(w.w.mid > 0 && w.w.init < 0 && w.w.tag > 0, "the signs a reader would expect once the labels are independent of the parser: capitalised mid-sentence and the parser's PROPN raise, sentence-initial-only lowers");
  assert.ok(Array.isArray(w.cov) && w.cov.length === 4 && w.covOrder.join() === "intercept,mid,init,tag"); assert.equal(w.gate.passed, true); assert.ok(w.gate.heldOutAUC.lowercase > 0.9 && w.gate.heldOutAUC.ALL > w.gate.baselines.priorOnly);
});
test("with the shipped weights a name outranks a common word, a stopword and a sentence-opener, in clean prose and in a lowercase chat message, and the answer carries its uncertainty", () => {
  const t = "Then Bingley came. We saw Bingley. The day was fine and the day ended. Yea, said Bingley. See the man.", s = sentenceStartsOf(t), tl = t.toLowerCase(), sl = sentenceStartsOf(tl);
  const tg = (txt, sm, w) => new Map(); const run = (txt, st, w) => nameSmell({ surface: w, text: txt, sentenceStarts: st, pos: POS, posAt: undefined });
  const a = run(t, s, "Bingley"), b = run(t, s, "Day"); assert.ok(a.p > b.p && a.p > 0.5, `${a.p} ${b.p}`); assert.ok(a.sd > 0 && a.certainty > 0 && !a.uncertaintyGap);
  const c = run(tl, sl, "bingley"), d = run(tl, sl, "day"); assert.ok(c.p > d.p, `lowercase chat: bingley ${c.p} > day ${d.p}`);
});
