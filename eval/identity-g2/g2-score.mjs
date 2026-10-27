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

if (process.argv[2] === "--selftest") {
  const t = (n, c) => { console.log(c ? "ok  " : "FAIL", n); if (!c) process.exitCode = 1; };
  const q1 = "Revenue was $6.8 million and $10.3 million for the three and twelve months ended December 31, 2022.";
  t("two numbers, two periods, by order", periodOfNumber(q1, "$10.3 million").months === 12 && periodOfNumber(q1, "$6.8 million").months === 3 && periodOfNumber(q1, "$10.3 million").end === "2022-12-31");
  t("comparative is unknown", periodOfNumber("Revenues increased 38.8% to $958 million compared to $690.1 million ;", "$690.1 million").status === "unknown");
  t("no period is unknown", periodOfNumber("Cash totaled $311.6 million.", "$311.6 million").status === "unknown");
  t("loss reads negative", proseSign("Net loss was $44.3 million for the year", "$44.3 million") === -1 && proseSign("Net income was $4.3 million", "$4.3 million") === 1);
  const mk = (q, n, sv, prec, ent, v, sc, concept, start, end) => ({ concept, prose: { path: `data/releases/${ent}/x.json`, quote: q, numberText: n, statedValue: sv, statedPrecision: prec }, structured: { entity: ent, period: { start, end }, value: v, scale: sc, unit: "USD" }, asof: {} });
  const base = mk("Revenue was $10.3 million for the year ended December 31, 2022.", "$10.3 million", 1.03e7, 1e5, "0001370053", 10287000, 1, "Revenue", "2022-01-01", "2022-12-31");
  t("aligned", verdicts(base).A1.v === "aligned");
  t("scale x1000 is contradictory scale", (() => { const r = verdicts({ ...base, structured: { ...base.structured, value: 10287000000 } }).A1; return r.v === "contradictory" && r.rule === "scale"; })());
  t("negated revenue is contradictory sign", (() => { const r = verdicts({ ...base, structured: { ...base.structured, value: -10287000 } }).A1; return r.v === "contradictory" && r.rule === "sign"; })());
  t("other entity is refused", verdicts({ ...base, structured: { ...base.structured, entity: "0000874238" } }).A1.v === "refused");
  t("other period is undecided, never contradictory", (() => { const r = verdicts({ ...base, structured: { ...base.structured, value: 5000000, period: { start: "2021-01-01", end: "2021-12-31" } } }).A1; return r.v === "undecided"; })());
  t("thousands declared is aligned", verdicts({ ...base, structured: { ...base.structured, value: 10287, scale: 1000 } }).A1.v === "aligned");
  t("instant: cash as of a date", (() => { const c = mk("Cash totaled $311.6 million as of December 31, 2025.", "$311.6 million", 3.116e8, 1e5, "0001370053", 311600000, 1, "Cash", null, "2025-12-31"); return verdicts(c).A1.v === "aligned" && verdicts({ ...c, structured: { ...c.structured, value: 311600000000 } }).A1.rule === "scale"; })());
  t("period unstated withholds the conviction", verdicts({ ...base, prose: { ...base.prose, quote: "Revenue was $10.3 million.", }, structured: { ...base.structured, value: 10287000000 } }).A1.v === "undecided");
  process.exit(process.exitCode ?? 0);
}

// ---- the scoring pass ----
const file = process.argv[2], D = JSON.parse(fs.readFileSync(file, "utf8")), ps = D.pairs, tally = () => ({}), bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
const T = { A1: {}, A0: {} }, byClass = { A1: {}, A0: {} }, sign = []; const unshuf = new Map();
for (const p of ps) { const r = verdicts(p); unshuf.set(p.id, r); const cls = `${p.origin}/${p.truth}/${p.rule ?? p.form}`; for (const a of ["A1", "A0"]) { bump(T[a], `${cls} -> ${r[a].v}${r[a].rule ? ":" + r[a].rule : ""}`); } }
// natural pairs the detector convicts (false alarms against the fixture's truth), listed so a human can read them
const falseAlarms = ps.filter((p) => p.origin === "natural" && unshuf.get(p.id).A1.v === "contradictory").map((p) => ({ id: p.id, rule: unshuf.get(p.id).A1.rule, quote: p.prose.quote.slice(0, 140), stated: p.prose.statedValue, value: p.structured.value, concept: p.concept }));
// shuffled-addresses control: each natural pair gets the structured record of ANOTHER natural pair (different entity, concept or period; stated value must not cancel by chance)
const R = rng(20261031), nat = ps.filter((p) => p.origin === "natural"), shuf = { A1: {}, A0: {} }; let changed = 0, nShuf = 0;
for (const p of nat) { let q = null; for (let tries = 0; tries < 200 && !q; tries++) { const c = nat[Math.floor(R() * nat.length)]; if (c.id !== p.id && (c.structured.entity !== p.structured.entity || c.concept !== p.concept || c.structured.period.end !== p.structured.period.end) && Math.abs(Math.abs(c.structured.value * c.structured.scale) - p.prose.statedValue) > p.prose.statedPrecision) q = c; }
  if (!q) continue; nShuf++; const r = verdicts({ ...p, structured: q.structured, concept: p.concept }); for (const a of ["A1", "A0"]) bump(shuf[a], `${r[a].v}${r[a].rule ? ":" + r[a].rule : ""}`); if (r.A1.v !== unshuf.get(p.id).A1.v) changed++; }
console.log(JSON.stringify({ pairs: ps.length, A1: T.A1, A0: T.A0, shuffledControl: { n: nShuf, A1: shuf.A1, A0: shuf.A0, A1VerdictChangedVsUnshuffled: changed }, falseAlarmsA1Natural: falseAlarms }, null, 1));
