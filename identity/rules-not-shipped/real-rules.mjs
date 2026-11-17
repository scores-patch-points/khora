// Experiment for RULES-PREREG.md (09c15ab3…). usage: node real-rules.mjs <khoraDir> <entities.json> <property-constraints.json> [mutant: none|norules|flip]
// Declared before running: each half record carries its item's own P31 (a second real record would carry its own type).
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [KH, ENT, PROPS, MUT = 'none'] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(p).href);
const { makeIdentityExclusion } = await imp(path.join(KH, 'native/kernel/identity-exclusion.js'));
const { CONTRADICTED } = await imp(path.join(KH, 'native/interpretation/hl.js'));
const { registerFromWikidataConstraints, ruleFilter } = await imp(path.join(KH, 'native/adapters/wikidata/constraints.js'));
const E = JSON.parse(fs.readFileSync(ENT, 'utf8')), PE = JSON.parse(fs.readFileSync(PROPS, 'utf8'));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(20261125);
function valueOf(snak) {
  if (snak.snaktype !== 'value' || !snak.datavalue) return null;
  const { type, value } = snak.datavalue;
  if (type === 'wikibase-entityid') return value.id;
  if (type === 'string') return value;
  if (type === 'monolingualtext') return value.text;
  if (type === 'quantity') return `q:${+value.amount}`;
  if (type === 'time') {
    const m = /^([+-]\d+)-(\d\d)-(\d\d)/.exec(value.time); if (!m || value.precision < 9) return null;
    return { t: true, y: +m[1], m: +m[2], d: +m[3], prec: value.precision, cal: value.calendarmodel };
  }
  return null;
}
const sameValue = (u, v) => {
  const tu = typeof u === 'object' && u?.t, tv = typeof v === 'object' && v?.t;
  if (tu !== tv) return null;
  if (!tu) return u === v;
  let p = Math.min(u.prec, v.prec); if (u.cal !== v.cal) p = Math.min(p, 9);   // different calendars meet at the year (SEG·G)
  if (u.y !== v.y) return false; if (p <= 9) return true;
  if (u.m !== v.m) return false; if (p === 10) return true;
  return u.d === v.d;
};
const flip = MUT === 'flip';
const difference = (u, v) => (u?.t && v?.t ? (flip ? v.y - u.y : u.y - v.y) : null);
const items = Object.keys(E).sort();
const rec = new Map(), kinds = new Map();
for (const q of items) { rec.set(`${q}:A`, []); rec.set(`${q}:B`, []); kinds.set(q, new Set([...(E[q].claims?.P31 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean), '*'])); }
for (const q of items) for (const P of Object.keys(E[q].claims || {}).sort()) for (const c of E[q].claims[P]) {
  if (c.rank === 'deprecated') continue;
  const v = valueOf(c.mainsnak); if (v == null) continue;
  const half = rng() < 0.5 ? 'A' : 'B';
  rec.get(`${q}:${half}`).push({ rel: P, value: v, id: c.id, witnessed: (c.references || []).length > 0, quals: new Set(Object.keys(c.qualifiers || {})) });
}
const R = registerFromWikidataConstraints(PE);
const functional = MUT === 'norules' ? new Map() : R.functional;
const keep = ruleFilter(R, { itemOf: (x) => x.split(':')[0], qualifiersOf: (a) => a.quals });
const organs = { kindsOf: (x) => kinds.get(x.split(':')[0]), assertionsOf: (x) => keep(x, rec.get(x)), functional, sameValue, witnessed: (a) => a.witnessed, differences: R.differences, difference };
const full = makeIdentityExclusion(organs), noRange = makeIdentityExclusion({ ...organs, differences: new Map(), difference: null });
const names = [...rec.keys()];
const out = { mutant: MUT, items: items.length, rules: { oneValuedProperties: new Set([...functional.values()].flatMap((m) => [...m.keys()])).size, ranges: [...R.differences.values()].flat().map((d) => `${d.rel}-${d.base} [${d.min},${d.max}]`), unread: R.unread.length },
  true: { pairs: 0, contradicted: 0, byRange: 0, rangeOnly: 0 }, distinct: { pairs: 0, contradicted: 0, byRange: 0, rangeOnly: 0 }, trueContradicted: [], reasons: {} };
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  const x = names[i], y = names[j], truth = x.split(':')[0] === y.split(':')[0], side = out[truth ? 'true' : 'distinct'];
  const r = full.judge(x, y); side.pairs++;
  if (r.verdict !== CONTRADICTED) { out.reasons[r.reason ?? r.verdict] = (out.reasons[r.reason ?? r.verdict] || 0) + 1; continue; }
  side.contradicted++; if (r.by.includes('range')) side.byRange++;
  if (noRange.judge(x, y).verdict !== CONTRADICTED) side.rangeOnly++;
  if (truth) out.trueContradicted.push({ item: x.split(':')[0], label: E[x.split(':')[0]].labels?.en?.value ?? null, by: r.by, proof: r.proof.map((p) => ({ rel: p.rel, base: p.base ?? null, a: p.a.value, b: p.b.value, giver: p.giver, diff: p.diff ?? null })) });
}
const T = out.true, D = out.distinct;
out.rates = { trueContradicted: T.contradicted / T.pairs, distinctContradicted: D.contradicted / D.pairs, rangeOnlyDistinct: D.rangeOnly / D.pairs, rangeOnlyTrue: T.rangeOnly / T.pairs };
console.log(JSON.stringify(out, null, 1));
