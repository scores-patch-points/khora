// g2-score.mjs — identity-8 verdict, PLAIN ARM (rules and typed comparison, no model), scored on g2-pairs.json (G2Pairs@1).
//   node g2-score.mjs --selftest            synthetic sentences only (never the pair set)
//   node g2-score.mjs /path/g2-pairs.json   the single scoring pass
// Reads from a pair ONLY: prose.{path, quote, numberText, statedValue, statedPrecision, delivered} and structured.{entity, period, value, scale, unit, delivered}, and the pair's concept.
// Never reads: truth, form, rule, basedOn, plantedFrom, the pair-level period or entity (those are the planter's labels).
import fs from "node:fs";
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const NUMW = { three: 3, six: 6, nine: 9, twelve: 12, 3: 3, 6: 6, 9: 9, 12: 12 };
const SIGNED = new Set(["Net income", "Operating cash flow"]), NONNEG = new Set(["Revenue", "Cash"]);   // declared domain of the concept (a giver, not learned)
const MONEY = /\$\s?[\d,]+(?:\.\d+)?\s?(?:million|billion)?/gi;
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(), iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** the periods a sentence states, in order: [{months, end|null}] */
export function periodsOf(q) {
  const t = q.toLowerCase(), out = [];
  const endM = t.match(/ended\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/);
  const end = endM ? iso(+endM[3], MONTHS[endM[1]], +endM[2]) : null;
  const multi = t.match(/\b(three|six|nine|twelve|3|6|9|12)((?:\s*(?:,|and|or)\s*(?:three|six|nine|twelve|3|6|9|12))+)\s+months?\b/);
  if (multi) { out.push(NUMW[multi[1]]); for (const m of multi[2].matchAll(/(three|six|nine|twelve|3|6|9|12)/g)) out.push(NUMW[m[1]]); }
  else { const re = /\b(three|six|nine|twelve|3|6|9|12)\s+months?\b|\b(?:first|second|third|fourth)\s+quarter\b|\b(?:fiscal\s+year|full[- ]year|year)\s+ended\b|\bfull[- ]year\b/g; let m; while ((m = re.exec(t))) out.push(m[1] ? NUMW[m[1]] : /quarter/.test(m[0]) ? 3 : 12); }
  return out.map((months) => ({ months, end }));
}
const monthsOf = (a, b) => { if (!a) return null; const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2 - y1) * 12 + (m2 - m1) + 1; };   // null start: an instant (a balance-sheet item)
/** the period of THE number in this sentence: {status: known|unknown, months, end} */
export function periodOfNumber(quote, numberText) {
  const ps = periodsOf(quote), toks = [...quote.matchAll(MONEY)].map((m) => ({ t: m[0].trim(), i: m.index })), at = toks.findIndex((x) => numberText.includes(x.t.replace(/\s+/g, " ")) || x.t.replace(/\s+/g, " ") === numberText.replace(/\s+/g, " ")), pos = quote.indexOf(numberText);
  const before = quote.slice(Math.max(0, pos - 30), pos).toLowerCase();
  if (/(compared (to|with)|versus|\bvs\.?|\bfrom|year[- ]ago|prior[- ]year|previous)\s*(a |an |the )?[\w\s,-]{0,12}$/.test(before)) return { status: "unknown", why: "comparative" };
  const asOf = quote.toLowerCase().match(/\b(?:as of|at)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!ps.length && asOf) return { status: "known", instant: true, months: null, end: iso(+asOf[3], MONTHS[asOf[1]], +asOf[2]) };
  if (!ps.length) return { status: "unknown", why: "no period stated" };
  let p = null;
  if (ps.length === 1) p = ps[0]; else if (ps.length === toks.length && at >= 0) p = ps[at]; else return { status: "unknown", why: "periods and numbers do not pair" };
  return p.end ? { status: "known", months: p.months, end: p.end } : { status: "unknown", why: "no end date" };
}
/** polarity the prose states for the number: 1, -1, or 0 unknown */
export function proseSign(quote, numberText) {
  const pos = quote.indexOf(numberText), w = quote.slice(Math.max(0, pos - 80), pos).toLowerCase();
  if (/loss|used in|deficit|negative|outflow/.test(w)) return -1; if (/income|profit|provided by|earnings|generated|inflow/.test(w)) return 1; return 0;
}
const cikOf = (path) => (path.match(/releases\/(\d{10})\//) ?? [])[1] ?? null;

export function verdicts(pair) {
  const P = pair.prose, S = pair.structured, actual = S.value * (S.scale ?? 1), mag = Math.abs(actual), stated = P.statedValue, tol = P.statedPrecision / 2 + 1e-6 * stated;
  const cancel = Math.abs(mag - stated) <= tol, ratio = stated ? mag / stated : NaN, k = Math.round(Math.log10(ratio) / 3), isScale = !cancel && k !== 0 && Math.abs(ratio / Math.pow(10, 3 * k) - 1) < 0.01;
  const per = periodOfNumber(P.quote, P.numberText), sper = { months: monthsOf(S.period.start, S.period.end), end: S.period.end };
  const perStatus = per.status !== "known" ? "unknown" : (sper.months === null) !== (per.months === null) ? "unknown" : (per.months === sper.months && per.end === sper.end ? "equal" : "unequal");   // an instant against a duration is a difference of form, not a known inequality
  const ps = proseSign(P.quote, P.numberText), ss = Math.sign(actual), c = pair.concept;
  const signConflict = NONNEG.has(c) ? ss < 0 : SIGNED.has(c) ? (ps !== 0 && ss !== 0 && ps !== ss) : false;
  const signUnknown = SIGNED.has(c) && ps === 0 && ss < 0;
  const frame = { asofProse: pair.asof?.prose ?? P.delivered, asofRecord: pair.asof?.structured ?? S.delivered, period: perStatus, periodWhy: per.why ?? null, pool: ["the single record given with the pair"] };
  // A1: identity-8 as designed (strict): a conviction needs entity, period and polarity known and equal
  const A1 = (() => {
    if (cikOf(P.path) !== S.entity) return { v: "refused", rule: "entity", frame };
    if (perStatus === "unequal") return { v: "undecided", rule: "period", frame };
    if (cancel) { if (signConflict) return perStatus === "equal" ? { v: "contradictory", rule: "sign", frame } : { v: "undecided", rule: "period-unstated", frame }; if (signUnknown) return { v: "undecided", rule: "polarity", frame }; return { v: "aligned", frame }; }
    return perStatus === "equal" ? { v: "contradictory", rule: isScale ? "scale" : "value", frame } : { v: "undecided", rule: "period-unstated", frame };
  })();
  // A0: the extraction oracle: the stated number against the record's value, ignoring entity and period
  const A0 = cancel ? (signConflict ? { v: "contradictory", rule: "sign" } : { v: "aligned" }) : { v: "contradictory", rule: isScale ? "scale" : "value" };
  return { A1, A0, cancel, signConflict, signUnknown };
}

