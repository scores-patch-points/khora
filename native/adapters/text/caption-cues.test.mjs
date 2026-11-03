// A caption cue is not a word: "[laughter]", "[music]" and a clock like "[0:05:01]" lead a sentence
// in auto-captions, which pushed the real first word to token 1 and made it read as a mid-sentence
// capital. Found reading a real transcript, where "Oh", "Getting" and "With Oracle" were admitted as
// beings. The cue is recognised by shape (brackets around a clock or lowercase words), never by a list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { splitSentences } from './spans.js';
import { extractSurfaces } from './surfaces.js';

const surfacesOf = (text) => new Set(extractSurfaces(splitSentences(text), {}).map((e) => e.surface));

const CAPTION = [
  '[laughter] Oh, it is really easy. Then we kept going on the same track today.',
  '[0:05:01] Oh, it is really easy. Then we kept going on the same track today.',
  '[music] Getting better every day. We moved along to the next question on the list.',
  '[applause] Getting better every day. We moved along to the next question on the list.',
  '[laughter] With Oracle, the work never stops. It carries on well into the evening hours.',
  '[music playing] With Oracle, the work never stops. It carries on well into the evening hours.',
].join('\n');

test('a sentence opener behind a caption cue is not admitted as a name', () => {
  const s = surfacesOf(CAPTION);
  for (const opener of ['Oh', 'Getting', 'With Oracle', 'With']) assert.equal(s.has(opener), false, `${opener} is an opener, not a name`);
});

test('a real name inside the same cue-led sentences is still found', () => {
  const text = [
    '[laughter] Then Paul Jeninson spoke about the plan. Later Paul Jeninson left the room.',
    '[0:01:02] Soon Paul Jeninson came back with the notes. Again Paul Jeninson sat down.',
  ].join('\n');
  assert.equal(surfacesOf(text).has('Paul Jeninson'), true);
});

test('a bracketed capitalised word is not a cue: an editor\'s insertion keeps its name', () => {
  const text = 'He said that [Pierre] had gone home. She said that [Pierre] had gone out. They said that [Pierre] had come back. We said that [Pierre] was late.';
  assert.equal(surfacesOf(text).has('Pierre'), true);
});
