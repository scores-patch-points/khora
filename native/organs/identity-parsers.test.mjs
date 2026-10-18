import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber, parseDate } from './identity-parsers.js';

test('finding 4 — German "21.05" is refused without a locale giver', () => {
  assert.equal(parseNumber('21.05').ok, false);
  assert.match(parseNumber('21.05').refused, /locale giver/);
  // with a named locale, the interpretation is explicit, not guessed
  assert.equal(parseNumber('21.05', { locale: 'de' }).value, 2105);
  assert.equal(parseNumber('21.05', { locale: 'en-US' }).value, 21.05);
});

test('finding 4 — a Thai Buddhist year is refused without an era giver', () => {
  assert.equal(parseDate('๒๕๖๗').ok, false);
  assert.match(parseDate('๒๕๖๗').refused, /era/);
  assert.equal(parseDate('2567').ok, false);           // bare Buddhist-range year refused, not read as Gregorian
  const r = parseDate('2567', { era: 'buddhist' });
  assert.equal(r.ok, true);
  assert.equal(r.value.year, 2024);                    // 2567 BE = 2024 CE
});

test('a 2-digit year is refused without a century giver', () => {
  assert.equal(parseDate('1/17/25').ok, false);
  assert.match(parseDate('1/17/25').refused, /2-digit year/);
  const r = parseDate('1/17/25', { twoDigitYearBase: 2000 });
  assert.equal(r.ok, true);
  assert.equal(r.value.year, 2025);
  assert.equal(r.value.month, 1);
  assert.equal(r.value.day, 17);
});

test('an ambiguous day/month order is refused without an order giver', () => {
  assert.equal(parseDate('03/04/2025').ok, false);
  assert.match(parseDate('03/04/2025').refused, /day\/month ordering/);
  const r = parseDate('03/04/2025', { order: 'MDY' });
  assert.equal(r.value.year, 2025);
  assert.equal(r.value.month, 3);
  assert.equal(r.value.day, 4);
});

test('an unambiguous date parses without a giver', () => {
  const r = parseDate('1/17/2024');
  assert.equal(r.ok, true);
  assert.equal(r.value.year, 2024);
  assert.equal(r.value.month, 1);
  assert.equal(r.value.day, 17);
});
