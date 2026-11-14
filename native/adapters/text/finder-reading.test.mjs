// finder-reading.js: the reading janus's text finder compares. Pure tests: no model, and no call to the full reading
// (a hand-built result stands in for readFull, in the shape reading-full.js returns).
import test from 'node:test';
import assert from 'node:assert/strict';
import { segment, figureValue, surfaceReading, readingFromFull, finderReader } from './finder-reading.js';

// One sentence of readFull's `entry.parse`, built by hand: "form/UPOS/feats/head/deprel".
function full(text, spec, cast = []) {
  let at = 0;
  const rows = spec.map((s, i) => { const [form, upos, feats, head, deprel] = s.split('/'); const start = text.indexOf(form, at); at = start + form.length; return { id: i + 1, form, lemma: form.toLowerCase(), upos, feats: feats || '_', head: Number(head), deprel, start, end: start + form.length }; });
  return { entry: { parse: [{ order: 0, offset: 0, text, rows }], cast } };
}

test('the floor keeps every token, marks included, and addresses each one', () => {
  const t = 'The fee is $500, not -5%?';
  const toks = segment(t);
  assert.deepEqual(toks.filter((x) => !x.word).map((x) => x.form), ['$', ',', '-', '%', '?']);
  assert.ok(toks.every((x) => t.slice(x.start, x.end) === x.form));
  const R = surfaceReading(t, { language: 'en' });
  assert.equal(R.parsed, false); assert.equal(R.offersNames, false); assert.deepEqual(R.names, []);
  assert.deepEqual(R.amounts.map((a) => [a.text, a.value, a.marks ?? '']), [['500', 500, '$'], ['5', 5, '-%']], 'the sign and the unit written against a figure are kept with it');
  assert.deepEqual(surfaceReading('It cost 10 000 in all.', { language: 'en' }).amounts.map((a) => [a.text, a.value]), [['10 000', null]], 'a spaced figure is one figure, and nobody here values it');
  assert.match(R.by, /no parse/);
});

test('the figure parser refuses what it cannot read one way: the language is the locale giver', () => {
  assert.equal(figureValue('1,200', 'en'), 1200); assert.equal(figureValue('1.5', 'en'), 1.5);
  assert.equal(figureValue('1.200', 'de'), 1200); assert.equal(figureValue('35,5', 'de'), 35.5);
  assert.equal(figureValue('1.200', 'es'), null, 'Spanish regions disagree about the separator: refused');
  assert.equal(figureValue('1.200', 'de-CH'), null); assert.equal(figureValue('1,200', 'es-MX'), null);
  assert.equal(figureValue('12345678901234567', 'en'), null, 'more digits than a number can hold exactly: not valued');
  assert.equal(figureValue('1,200'), null, 'no locale giver: a separator is refused');
  assert.equal(figureValue('1,200', 'ja'), null, 'a locale this parser was not given rules for is refused');
  assert.equal(figureValue('17'), 17, 'plain digits need no giver');
  assert.equal(figureValue('5M', 'en'), null); assert.equal(figureValue('20km', 'en'), null); assert.equal(figureValue('1990s', 'en'), null);
});

test("readFull's parse becomes the finder's reading: tokens, tags and names are the reading's own", () => {
  const t = 'Motorola did not deliver 1,200 cameras to Nashville.';
  const R = readingFromFull(t, full(t, ['Motorola/PROPN//4/nsubj', 'did/AUX//4/aux', 'not/PART/Polarity=Neg/4/advmod', 'deliver/VERB//0/root', '1,200/NUM/NumType=Card/6/nummod', 'cameras/NOUN//4/obj', 'to/ADP//8/case', 'Nashville/PROPN//4/obl', './PUNCT//4/punct'], [{ surface: 'Nashville', mentionSpans: [[42, 52]] }]), { language: 'en', rev: 'test' });
  assert.equal(R.parsed, true); assert.equal(R.offersNames, true); assert.equal(R.by, 'khora readFull@test');
  assert.ok(R.tokens.every((x) => t.slice(x.start, x.end) === x.form));
  assert.equal(R.tokens.find((x) => x.form === 'not').feats, 'Polarity=Neg');
  assert.equal(R.tokens.find((x) => x.form === '.').word, false);
  assert.deepEqual(R.amounts.map((a) => [a.text, a.value]), [['1,200', 1200]]);
  assert.deepEqual(R.names.map((n) => n.text).sort(), ['Motorola', 'Nashville'], 'the cast name loses its full stop; the proper noun the cast did not carry is added');
});

test('a figure is a run that starts at a digit; a numeral written as a word is not offered as a figure', () => {
  const t = 'The council paid 5 million for one of them.';
  const R = readingFromFull(t, full(t, ['The/DET//2/det', 'council/NOUN//3/nsubj', 'paid/VERB//0/root', '5/NUM//5/compound', 'million/NUM//3/obj', 'for/ADP//7/case', 'one/NUM//3/obl', 'of/ADP//9/case', 'them/PRON//7/nmod', './PUNCT//3/punct']), { language: 'en' });
  assert.deepEqual(R.amounts.map((a) => [a.text, a.value]), [['5 million', null]], '"5 million" is one figure nobody valued here; "one" stays a word');
});

test('where the full reading has no parse, the reading falls to the floor and says so; no names are offered', async () => {
  const t = 'Der Stadtrat hat den Vertrag nicht genehmigt.';
  const R = readingFromFull(t, { entry: { parse: [], cast: [{ surface: 'Stadtrat', mentionSpans: [[4, 12]] }] } }, { language: 'de', rev: 'test' });
  assert.equal(R.parsed, false); assert.equal(R.offersNames, false); assert.deepEqual(R.names, []);
  assert.match(R.by, /khora readFull@test \(no parse for language "de"\)/);
  const read = finderReader({ readFull: async () => { throw new Error('boom'); }, rev: 'test' });
  const G = await read('Two words.', { language: 'en' });
  assert.equal(G.parsed, false); assert.match(G.by, /readFull threw: boom/);
  assert.throws(() => finderReader({}), /readFull is required/);
});
