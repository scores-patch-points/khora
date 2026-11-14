// finder-witness.js: the reader of questions for janus's text finder. Pure tests: the crossing is a stub.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinderMessages, readFinderAnswer, finderWitness, FINDER_WITNESS_SCHEMA } from './finder-witness.js';
import { allInformation, carries, sameThing, sameKind } from './finder-questions.js';

// The words of each question belong to a ground's baseline event. A stand-in for one:
const Q = { system: 'SYSTEM LINE', says: 'SAYS?', part: 'PART?', figure: 'FIGURE?', mentions: 'MENTIONS?', denies: 'DENIES?', about: 'ABOUT?', kind: 'KIND?' };

test('the words of a question come from the ground; without them the giver refuses', () => {
  assert.throws(() => buildFinderMessages('says', { passage: 'p', sentence: 's' }), /come from the ground/);
  assert.throws(() => buildFinderMessages('weighs', { passage: 'p', questions: { ...Q, weighs: 'W?' } }), /unknown question/);
  const whole = buildFinderMessages('says', { passage: 'p', sentence: 's', questions: Q });
  assert.deepEqual(whole, [{ role: 'system', content: 'SYSTEM LINE' }, { role: 'user', content: 'PASSAGE: p\n\nSENTENCE: s\n\nSAYS?' }]);
  assert.match(buildFinderMessages('says', { passage: 'p', sentence: 's', part: 'x', questions: Q })[1].content, /PART: x\n\nPART\?$/);
  assert.match(buildFinderMessages('figure', { passage: 'p', part: 'for 17 years', figure: '17', questions: Q })[1].content, /FIGURE: 17\n\nFIGURE\?$/);
  assert.match(buildFinderMessages('kind', { passage: 'p', kind: 'an invoice', questions: Q })[1].content, /KIND: an invoice\n\nKIND\?$/);
});

test('anything but yes or no is a typed gap, never a guess', () => {
  assert.equal(readFinderAnswer('{"answer":"Yes"}'), 'yes'); assert.equal(readFinderAnswer({ answer: 'no' }), 'no');
  assert.equal(readFinderAnswer('{"answer":"maybe"}'), null); assert.equal(readFinderAnswer('not json'), null); assert.equal(readFinderAnswer(null), null);
  assert.deepEqual(FINDER_WITNESS_SCHEMA.properties.answer.enum, ['yes', 'no']);
});

test('the caller owns the crossing; the giver names itself, never draws the same question twice, and survives a failed draw', async () => {
  assert.throws(() => finderWitness({ by: 'x' }), /draw function is required/);
  assert.throws(() => finderWitness({ draw: async () => null }), /named on the record/);
  let n = 0;
  const w = finderWitness({ draw: async (messages, schema) => { n++; assert.equal(schema, FINDER_WITNESS_SCHEMA); return '{"answer":"no"}'; }, by: 'stub reader' });
  assert.equal(await w.says({ passage: 'p', sentence: 's', questions: Q }), 'no');
  assert.equal(await w.says({ passage: 'p', sentence: 's', questions: Q }), 'no');
  assert.equal(n, 1); assert.equal(w.draws, 1); assert.equal(w.by, 'stub reader');
  await w.says({ passage: 'p', sentence: 's', questions: { ...Q, says: 'ANOTHER BASELINE?' } });
  assert.equal(n, 2, 'the same texts under another baseline are another question');
  let k = 0;
  const flaky = finderWitness({ draw: async () => { k++; if (k === 1) throw new Error('mouth closed'); return '{"answer":"yes"}'; }, by: 'stub reader' });
  assert.equal(await flaky.about({ passage: 'p', sentence: 's', questions: Q }), null);
  assert.equal(await flaky.about({ passage: 'p', sentence: 's', questions: Q }), 'yes', 'a failed draw is asked again, not remembered as no answer');
});

test('the three ready question shapes each name their asker', () => {
  assert.equal(allInformation('me').of, 'information'); assert.equal(allInformation('me').directions, 'both'); assert.equal(allInformation('me').by, 'me');
  assert.equal(carries('a-carries-b', 'me').directions, 'a-carries-b');
  assert.equal(sameThing('me').of, 'identity'); assert.deepEqual([sameKind('an invoice', 'me').of, sameKind('an invoice', 'me').kind], ['kind', 'an invoice']);
});
