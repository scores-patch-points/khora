// the-fold/codec-fold.test.mjs — MEET ANYTHING: find the codec by SURPRISE REDUCTION, as a distribution, folded in on demand. Written before the module; each test says what would falsify it.
// A codec here is a language's UD grammar (janus/priors/ud-grammar-<code>.json.gz): its form table is the vocabulary the text is scored against. No language list, no switch: the least-surprising codecs win,
// the answer is a probability distribution with an entropy, and a text no held codec explains is a TYPED GAP that names the nearest codec and its surprise, never a guess.
import test from "node:test"; import assert from "node:assert/strict";
import { foldCodec, surpriseOf, loadVocab, entropyOf } from "./codec-fold.mjs";

const EN = "Mr. Bennet replied that he had not. The woman said that the serpent beguiled her. My dear, you must know that Netherfield is taken by a young man of large fortune from the north of England.";
const FR = "Au commencement, Dieu créa le ciel et la terre. La terre était informe et vide; il y avait des ténèbres à la surface de l'abîme, et l'esprit de Dieu se mouvait au-dessus des eaux.";
const ES = "En el principio creó Dios los cielos y la tierra. Y la tierra estaba desordenada y vacía, y las tinieblas estaban sobre la faz del abismo, y el Espíritu de Dios se movía sobre la faz de las aguas.";
const DE = "Am Anfang schuf Gott Himmel und Erde. Und die Erde war wüst und leer, und es war finster auf der Tiefe; und der Geist Gottes schwebte auf dem Wasser.";
const ZH = "起初，神创造天地。地是空虚混沌，渊面黑暗；神的灵运行在水面上。神说，要有光，就有了光。";

test("an English text is explained best by the English codec, and the answer is a distribution that sums to one", async () => {
  const r = await foldCodec(EN); assert.equal(r.chosen, "eng"); const s = r.distribution.reduce((a, d) => a + d.p, 0); assert.ok(Math.abs(s - 1) < 1e-9, `sums to ${s}`);
  assert.ok(r.distribution[0].p > r.distribution[1].p); assert.ok(r.distribution[0].coverage > 0.6, `English coverage ${r.distribution[0].coverage}`);
});
for (const [code, text, why] of [["fra", FR, "French"], ["spa", ES, "Spanish"], ["cmn", ZH, "Chinese, a script with no spaces and no case"]]) test(`${why} finds its own codec`, async () => {
  const r = await foldCodec(text); assert.equal(r.chosen, code, `${code} chose ${r.chosen}: ${JSON.stringify(r.distribution.slice(0, 3).map((d) => [d.code, +d.p.toFixed(3)]))}`);
});
test("German: its grammar is POINTED AT (licence) and not held in this checkout, so no codec can be right: the answer must say how poorly the nearest one explains it, not claim certainty", async () => {
  const r = await foldCodec(DE); assert.ok(r.distribution[0].coverage < 0.6, `the nearest codec leaves most tokens surprising: ${r.distribution[0].coverage}`); assert.ok(r.distribution[0].bitsPerToken > 15, "and the surprise is reported");
  assert.ok(r.pOwn < 0.6, `the open-world term says it is probably not that codec's language: pOwn ${r.pOwn}`); assert.ok(r.gap?.gap === "no_codec_explains_it" || r.pOwn >= 0.5, "below one half it is the typed gap");
});
test("SURVIVES CASUAL SPEECH: lowercase text with no punctuation still finds its codec", async () => {
  for (const [code, text] of [["eng", EN], ["fra", FR], ["spa", ES]]) { const r = await foldCodec(text.toLowerCase().replace(/[.,;:]/g, "")); assert.equal(r.chosen, code, `${code} lowercase -> ${r.chosen}`); }
});
test("SURVIVES TYPOS: a text with a typo in one word of twenty still finds its codec, with lower coverage than the clean text", async () => {
  const typo = (t) => t.split(" ").map((w, i) => (i % 12 === 5 && w.length > 4 ? w.slice(0, 2) + w[3] + w[2] + w.slice(4) : w)).join(" ");
  for (const [code, text] of [["eng", EN], ["fra", FR], ["spa", ES]]) { const clean = await foldCodec(text), noisy = await foldCodec(typo(text)); assert.equal(noisy.chosen, code); assert.ok(noisy.distribution[0].coverage <= clean.distribution[0].coverage, "a typo cannot raise coverage"); }
});
test("SHORT TEXT is allowed to be unsure: fewer words give a flatter distribution (higher entropy), never a confident guess", async () => {
  const long = await foldCodec(EN), short = await foldCodec("the woman said");
  assert.ok(entropyOf(short.distribution) >= entropyOf(long.distribution), `short ${entropyOf(short.distribution)} vs long ${entropyOf(long.distribution)}`);
});
test("a language no held codec explains is a TYPED GAP that names the nearest codec and its surprise, not a guess", async () => {
  const r = await foldCodec("Ut quid perditio haec? Poterat enim unguentum istud venumdari multo et dari pauperibus. Hoc autem dixit, non quia de egenis pertinebat ad eum."); // Latin: no grammar among those held with this vocabulary
  assert.ok(r.gap || r.distribution[0].coverage < 0.6, JSON.stringify(r.distribution.slice(0, 2)));
  if (r.gap) { assert.equal(r.gap.gap, "no_codec_explains_it"); assert.ok(r.gap.nearest && typeof r.gap.bitsPerToken === "number"); }
});
test("FOLDED ON DEMAND: a codec's vocabulary is loaded only when it is a candidate, and loading is memoised", async () => {
  const before = loadVocab.stats().loaded; await foldCodec(EN); const mid = loadVocab.stats().loaded; await foldCodec(EN); const after = loadVocab.stats().loaded;
  assert.ok(mid >= before); assert.equal(after, mid, "a second ask loads nothing new"); assert.ok(loadVocab.stats().considered >= loadVocab.stats().loaded, "some codecs were considered and never loaded");
});
test("surprise is in bits per token and is lower under the right codec than a wrong one", async () => {
  const en = await surpriseOf(EN, "eng"), fr = await surpriseOf(EN, "fra"); assert.ok(en.bitsPerToken < fr.bitsPerToken, `${en.bitsPerToken} < ${fr.bitsPerToken}`);
});

test("OPEN WORLD: Traditional Chinese (the held Chinese codec is Simplified) must not choose Japanese with confidence: it is a typed gap naming the nearest codec", { todo: "KNOWN GAP: unspaced scripts have no calibrated open-world term; character coverage cannot tell Traditional Chinese from Japanese (needs word or bigram surprise)" }, async () => {
  const TRAD = "起初神創造天地。地是空虛混沌，淵面黑暗；神的靈運行在水面上。神說、要有光、就有了光。神看光是好的、就把光暗分開了。";
  const r = await foldCodec(TRAD); assert.ok(r.pOwn < 0.5, `pOwn ${r.pOwn} for ${r.distribution[0].code} coverage ${r.distribution[0].coverage}`); assert.equal(r.gap?.gap, "no_codec_explains_it"); assert.ok(r.gap.nearest);
});
test("a text a held codec really explains has a high pOwn", async () => { const r = await foldCodec(EN); assert.ok(r.pOwn > 0.7, `pOwn ${r.pOwn}`); assert.equal(r.gap, undefined); });

test("an unspaced script says its open-world term is uncalibrated, never a number it has no basis for", async () => { const r = await foldCodec(ZH); assert.equal(r.pOwn, null); assert.equal(r.calibrationGap, "uncalibrated_for_unspaced_scripts"); });
