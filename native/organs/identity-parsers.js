// parsers.mjs — number and date parsers that refuse rather than guess.
//
// A parser returns { ok: true, value } or { ok: false, refused: reason }.
// Nothing is built in: an interpretation requires a named giver, or is refused.
//   - a Thai Buddhist year is not read as Gregorian without an era giver
//   - German "21.05" is not read as 2105 (nor as a decimal) without a locale giver
//   - a 2-digit year is refused without a century giver
//   - an ambiguous day/month order is refused without an order giver

const THAI = '๐๑๒๓๔๕๖๗๘๙';

function refuse(reason) {
  return { ok: false, refused: reason };
}

export function parseNumber(s, giver = null) {
  const raw = String(s).trim();
  // A dot can be a decimal point or a thousands separator.
  if (/^\d{1,3}\.\d{1,2}$/.test(raw)) {
    if (!giver || !giver.locale) {
      return refuse(`"${raw}" is ambiguous (decimal or thousands grouping); need a locale giver`);
    }
    if (giver.locale === 'de' || giver.locale === 'de-DE') return { ok: true, value: Number(raw.replace(/\./g, '')) };
    if (giver.locale === 'en-US' || giver.locale === 'en-GB') return { ok: true, value: Number(raw) };
    return refuse(`unhandled locale "${giver.locale}"`);
  }
  const n = Number(raw.replace(/,/g, ''));
  if (Number.isFinite(n)) return { ok: true, value: n };
  return refuse(`not a number: "${s}"`);
}

export function parseDate(s, giver = null) {
  const raw = String(s).trim();

  // Thai digits ⇒ Thai/Buddhist-era surface; refuse without an era giver.
  if (/[๐-๙]/.test(raw)) {
    if ((giver?.era ?? giver?.calendar) !== 'buddhist') {
      return refuse(`Thai-script date "${raw}" needs an era/calendar giver (buddhist vs gregorian)`);
    }
    const latin = raw.replace(/[๐-๙]/g, (d) => String(THAI.indexOf(d)));
    const be = parseInt(latin.match(/\d+/)?.[0] ?? NaN, 10);
    if (Number.isFinite(be)) return { ok: true, value: { year: be - 543, era: 'buddhist', original: raw } };
    return refuse(`could not read Thai year from "${raw}"`);
  }

  // A bare 4-digit year in the Buddhist range is refused without an era giver.
  if (/^\d{4}$/.test(raw)) {
    const y = parseInt(raw, 10);
    if (giver?.era === 'buddhist' || giver?.calendar === 'buddhist') {
      return { ok: true, value: { year: y - 543, era: 'buddhist', original: raw } };
    }
    if (y >= 2400 && y <= 2700) return refuse(`"${raw}" is in the Buddhist-era range; refuse without an era giver`);
    return { ok: true, value: { year: y } };
  }

  const m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const [, a, b, c] = m;
    const ai = parseInt(a, 10), bi = parseInt(b, 10), ci = parseInt(c, 10);
    if (c.length === 2) {
      const base = giver?.twoDigitYearBase ?? giver?.century;
      if (!base) return refuse(`"${raw}" has an ambiguous 2-digit year; need a century giver`);
      const year = base + ci;
      return finish(year, ai, bi, giver, raw);
    }
    const year = ci;
    return finish(year, ai, bi, giver, raw);
  }
  return refuse(`unrecognised date: "${raw}"`);
}

function finish(year, ai, bi, giver, raw) {
  if (ai <= 12 && bi <= 12 && !giver?.order) {
    return refuse(`"${raw}" is ambiguous day/month ordering; need an order giver (DMY vs MDY)`);
  }
  const [day, month] = giver?.order === 'DMY' ? [ai, bi] : [bi, ai];
  return { ok: true, value: { year, month, day } };
}
