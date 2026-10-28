// opencode-contest.mjs — THE CONTEST (penelope layer 5): the claims of one piece faced against EACH OTHER, not only against their sources.
//
// The judge (vendor/the-fold/fold-chat-falsify-answer.js) asks of every sentence whether a source states or contradicts it; it never asks whether
// two sentences of the same piece can both hold. The dolphins essay said "Thirty-six dolphin species" and, one sentence on, "forty to forty-five
// species", and the judge counted 0 contradictions, because each sentence had a source. Here the admitted claims of a piece form a graph by the
// ENDS they share (the referents a claim is about), and two claims on the same ends whose TYPED values cannot both hold are kept as a named
// contest carrying both addresses. A contest the record itself settles is conceded with the settling fact; what remains is counted for the
// confession (opencode-confession.mjs), never resolved by a model.
//
// Laws this keeps (fold-suite/THE-META-PLAN.md; eval/contest/PREREG.md, frozen before any run):
//   - ENDS are identity, not strings: the referents builder (native/the-fold/referents.js) individuates the beings of the whole piece and every
//     claim resolves against it, so "Curie" and "Marie Curie" are one end. The builder admits names and recurrent definite descriptors; a bare
//     common nominal ("dolphin species") it cannot see is admitted here by the same bar the builder's descriptor tier holds — the received parser
//     prior reads it as a noun, and it RECURS across distinct claims. No word decides anything by being on a list.
//   - a VALUE is typed and carries its GRAIN: a count of a head ("36 of {dolphin, species}", a unit is a head), a date as a calendar interval, a range
//     or a bound as an interval. Two values cannot both hold only when their intervals, widened to their own grain, do not meet; a range containing a
//     point, a round number against an exact one at the round number's grain, are consistent. Values of different kinds or heads never meet at all.
//   - the numeral grammar (number words, ordinals, "to", "between ... and", bound words, month names) is the language's closed class, written as
//     grammar the way digits are read; it is not content knowledge. Another language is the typed gap `no_numeral_grammar`.
//   - the null discipline of janus resolve.mjs: a claim with no ends or no value is a typed gap, never guessed into a contest; the ends of the piece
//     shuffled across its claims must collapse the contest count (eval/contest/run.mjs reports it) or the contests were never about shared ends.
//   - a claim is any admitted UNIT of a generated piece — a sentence, a table row ("Species | 36"), a list item, a code comment: `{ text, standing,
//     at, kind? }` as the residue ledger gives it. Nothing here assumes prose beyond what the referents builder needs.
//
//   - ENDS are weighed by surprisal as janus resolve.mjs weighs company (PREREG Amendment 3): an end carried by more claims than the pool's chance
//     floor (T/m: the pool's end tokens dealt evenly over its distinct ends) is a HUB and neither joins nor separates; nestedness, the concessions
//     and the edges are judged over each claim's WEIGHTED ends (ends minus hubs). A claim with only hub ends is the typed gap `hub_ends`.
//
//   claimGraph({ claims }, { weighting })  -> { nodes, edges, byEnd, gaps, hubs }   weighting: "surprisal" (default) | "none" (runs 1-3, diagnostic)
//   contests({ graph })                    -> [{ a, b, ends, kind, values, settled }]
//   rest({ graph, contests })              -> { rests, contests, conceded }
//   shuffleEnds(graph, rng)                -> the same graph with its ends dealt across claims at random (the null)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(here, "native");

export const CONTEST_SCHEMA = "Contest@1";

// ── the received organs, loaded once (the same priors opencode-keyed.mjs reads) ───────────────────────────────────────────────────────────────
let organs = null;
async function organsOnce() {
  if (organs) return organs;
  const { loadModel, analyseAttested } = await import(path.join(NATIVE, "adapters/text/english-parser.js"));
  const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/parser-eng-ewt.json"), "utf8")));
  let sameAct = null;
  try {
    const { morphologyFromPrior, createLemmatizer } = await import(path.join(NATIVE, "adapters/text/morphology.js"));
    const p = morphologyFromPrior(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/morphology-eng.json"), "utf8")));
    const lem = createLemmatizer(p.forms, { language: p.language });
    sameAct = (a, b) => lem.sameAct(a, b);
  } catch { sameAct = null; }
  const cache = new Map();
  const dominantOf = (w) => {
    const k = String(w).toLowerCase();
    if (!cache.has(k)) { const r = analyseAttested(model, [k], { scope: "all" })[0]; cache.set(k, r ? { upos: r.upos, lemma: String(r.lemma ?? k).toLowerCase() } : null); }
    return cache.get(k);
  };
  const { buildReferents } = await import(path.join(NATIVE, "the-fold/referents.js"));
  organs = { dominantOf, sameAct: sameAct ?? ((a, b) => a === b), buildReferents };
  return organs;
}

// ── the numeral grammar: a closed class, read the way digits are ───────────────────────────────────────────────────────────────────────────────
const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9 };
const ORDINALS = { first: 1, second: 2, third: 3, fifth: 5, eighth: 8, ninth: 9, twelfth: 12 };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
// a bound is the open side of an interval; "nearly"/"almost" close on the number from below, so they read as the number at its grain
const LOWER = [["more", "than"], ["over"], ["above"], ["at", "least"], ["upwards", "of"]];
const UPPER = [["less", "than"], ["fewer", "than"], ["under"], ["below"], ["at", "most"], ["up", "to"]];

/** An ordinal word to its index: the irregular forms, then cardinal + th/eth ("fourth", "twentieth", "forty-fifth"), then "4th". */
function ordinalOf(word) {
  const w = String(word).toLowerCase();
  if (ORDINALS[w] != null) return ORDINALS[w];
  const m = /^(\d+)(?:st|nd|rd|th)$/.exec(w);
  if (m) return Number(m[1]);
  const parts = w.split("-");
  const last = parts[parts.length - 1];
  let base = null;
  if (ORDINALS[last] != null) base = ORDINALS[last];
  else if (/ieth$/.test(last) && TENS[last.replace(/ieth$/, "y")] != null) base = TENS[last.replace(/ieth$/, "y")];
  else if (/th$/.test(last)) { const c = last.replace(/th$/, ""); base = UNITS[c] ?? SCALES[c] ?? null; }
  if (base == null) return null;
  const head = parts.slice(0, -1).map((p) => TENS[p] ?? UNITS[p]).filter((x) => x != null);
  return head.reduce((a, b) => a + b, 0) + base;
}

/** A number word (or hyphenated pair) to its value, or null. "forty-five" -> 45; "hundred" -> 100. */
function wordNumber(word) {
  const w = String(word).toLowerCase();
  if (UNITS[w] != null) return UNITS[w];
  if (TENS[w] != null) return TENS[w];
  if (SCALES[w] != null) return SCALES[w];
  const m = /^([a-z]+)-([a-z]+)$/.exec(w);
  if (m && TENS[m[1]] != null && UNITS[m[2]] != null && UNITS[m[2]] < 10) return TENS[m[1]] + UNITS[m[2]];
  return null;
}

/** The grain of a written number: 10^-decimals for a decimal; for an integer of a thousand or more, the span of its trailing zeros (9,000 -> 1000,
 *  a round figure at the comma-group scale is how English writes an approximation); below a thousand an integer is exact (40 is 40, not 35-45;
 *  PREREG Amendment 1). */
function grainOfDigits(raw) {
  const s = String(raw).replace(/,/g, "");
  if (s.includes(".")) return 10 ** -(s.split(".")[1].length);
  const n = Number(s);
  if (!(n >= 1000)) return 1;
  const z = /0+$/.exec(s)?.[0]?.length ?? 0;
  return z ? 10 ** z : 1;
}

const TOKEN = /\d(?:[\d,]*\d)?(?:\.\d+)?(?:°[cf]|%)?|[\p{L}][\p{L}'’-]*|[|:;,.()–—-]/giu;
function tokenize(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(TOKEN)) out.push({ t: m[0], lower: m[0].toLowerCase(), at: m.index });
  return out;
}

/**
 * The numerals of a unit, each as { lo, hi, grain, i, j (token span), raw, ordinal? , symbol? }.
 * Digits with comma groups and decimals; number words, including runs ("two hundred", "forty-five thousand"); ordinals.
 */
function numerals(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const tk = tokens[i];
    const digit = /^\d[\d,]*(?:\.\d+)?(°[cf]|%)?$/i.exec(tk.t);
    if (digit) {
      const sym = digit[1]?.toLowerCase() ?? null;
      const body = tk.t.replace(/(°[cf]|%)$/i, "");
      const n = Number(body.replace(/,/g, ""));
      if (!Number.isFinite(n)) continue;
      out.push({ lo: n, hi: n, grain: grainOfDigits(body), i, j: i + 1, raw: tk.t, symbol: sym, comma: body.includes(",") });
      continue;
    }
    const ord = ordinalOf(tk.lower);
    if (ord != null) { out.push({ lo: ord, hi: ord, grain: 1, i, j: i + 1, raw: tk.t, ordinal: true }); continue; }
    let v = wordNumber(tk.lower);
    if (v == null) continue;
    // a run of number words: units/tens accumulate into the current group, a scale multiplies the group and carries it
    let total = 0, group = v, j = i + 1;
    if (SCALES[tk.lower] != null) { group = 1 * v; }
    while (j < tokens.length) {
      const w = tokens[j].lower;
      const nv = wordNumber(w);
      if (nv == null) break;
      if (SCALES[w] != null) { group = (group || 1) * nv; if (nv >= 1000) { total += group; group = 0; } }
      else if (UNITS[w] != null || TENS[w] != null || /-/.test(w)) group += nv;
      j += 1;
    }
    total += group;
    const lastWord = tokens[j - 1].lower;
    const grain = SCALES[lastWord] != null && total >= 1000 ? SCALES[lastWord] : 1;
    out.push({ lo: total, hi: total, grain, i, j, raw: tokens.slice(i, j).map((x) => x.t).join(" ") });
    i = j - 1;
  }
  return out;
}

const seqAt = (tokens, k, seq) => seq.every((w, n) => tokens[k + n]?.lower === w);

/**
 * Ranges and bounds over the numerals: "40 to 45", "40–45", "between 40 and 45" are one interval; "more than 40" is open above.
 * A date range keeps both years as its ends.
 */
function intervals(tokens, nums) {
  const out = [];
  for (let k = 0; k < nums.length; k += 1) {
    const a = nums[k], b = nums[k + 1];
    if (a.ordinal) { out.push(a); continue; }
    const between = tokens[a.i - 1]?.lower === "between";
    const gap = b ? tokens.slice(a.j, b.i).map((x) => x.lower) : null;
    if (b && !b.ordinal && gap && gap.length === 1 && (gap[0] === "to" || gap[0] === "–" || gap[0] === "-" || gap[0] === "—" || (between && gap[0] === "and"))) {
      out.push({ lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi), grain: Math.min(a.grain, b.grain), i: between ? a.i - 1 : a.i, j: b.j, raw: tokens.slice(a.i, b.j).map((x) => x.t).join(" "), symbol: a.symbol ?? b.symbol ?? null, range: true, comma: a.comma || b.comma });
      k += 1;
      continue;
    }
    let lo = a.lo, hi = a.hi, from = a.i;
    for (const seq of LOWER) if (seqAt(tokens, a.i - seq.length, seq)) { hi = Infinity; from = a.i - seq.length; }
    for (const seq of UPPER) if (seqAt(tokens, a.i - seq.length, seq)) { lo = -Infinity; from = a.i - seq.length; }
    out.push({ ...a, lo, hi, i: from, bound: hi === Infinity || lo === -Infinity });
  }
  return out;
}

// ── nouns, as the prior reads them ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const NOMINAL = new Set(["NOUN", "PROPN"]);
const OPEN_HEAD = new Set(["NOUN", "PROPN", "ADJ"]);

/** The noun lemma of a word, by the prior's dominant class; a one-word singular fold only when the prior itself attests the singular. */
function nounLemma(dominantOf, word) {
  const w = String(word).toLowerCase().replace(/['’]s$/, "");
  if (!/^[\p{L}][\p{L}-]*$/u.test(w) || w.length < 3) return null;
  if (wordNumber(w) != null || ordinalOf(w) != null || MONTHS.includes(w)) return null;
  const d = dominantOf(w);
  if (!d || !NOMINAL.has(d.upos)) return null;
  let lemma = d.lemma || w;
  if (lemma.length > 3 && lemma.endsWith("s") && !lemma.endsWith("ss")) {
    const s = lemma.slice(0, -1);
    const ds = dominantOf(s);
    if (ds && NOMINAL.has(ds.upos)) lemma = s;
  }
  return lemma;
}

/** The verb a date belongs to: the nearest word the prior classes VERB in the same unit, before the date first ("was completed in 1759"), then after
 *  it ("In 1759 X was completed"); a table row's cells are one unit, so "X | completed | 1759" reads across the separator (PREREG Amendment 2).
 *  Auxiliaries are AUX in the prior, so "was completed" gives complete. */
function relationOf(dominantOf, tokens, i, j) {
  const verbAt = (k) => { const tk = tokens[k]; if (!tk || /^[;.()]$/.test(tk.t)) return undefined; const d = /^[\p{L}]/u.test(tk.t) ? dominantOf(tk.lower) : null; return d?.upos === "VERB" ? d.lemma : null; };
  for (let k = i - 1; k >= 0 && k >= i - 10; k -= 1) { const v = verbAt(k); if (v === undefined) break; if (v) return v; }
  for (let k = j; k < tokens.length && k < j + 10; k += 1) { const v = verbAt(k); if (v === undefined) break; if (v) return v; }
  return null;
}

/** The nouns a numeral quantifies, in two tiers: AFTER it ("36 dolphin species", "4 metres", "3 of the towers"), and failing those, BEFORE it in the
 *  same cell ("Species | 36", "the population is 5,000") — a table row names its measure before the separator, prose usually after the numeral. */
function headOf(dominantOf, tokens, iv) {
  const after = [];
  let k = iv.j;
  let sawOf = false;
  while (k < tokens.length) {
    const tk = tokens[k];
    if (!/^[\p{L}]/u.test(tk.t)) break;
    if (tk.lower === "of" && !sawOf) { sawOf = true; k += 1; continue; }
    if (sawOf && ["the", "a", "an", "its", "all"].includes(tk.lower)) { k += 1; continue; }
    if (/^\p{Lu}/u.test(tk.t) && k > 0) break; // a capitalised word after a numeral names a being ("In 2010 Varmouth Hall"), it is not what the numeral counts
    const d = dominantOf(tk.lower);
    if (!d || !OPEN_HEAD.has(d.upos)) break;
    const n = nounLemma(dominantOf, tk.lower);
    if (n) after.push(n);
    k += 1;
  }
  if (iv.symbol) after.unshift(iv.symbol);
  const before = [];
  let b = iv.i - 1;
  while (b >= 0 && /^[|:–—-]$/.test(tokens[b].t)) b -= 1; // one cell separator may stand between a row's label and its figure
  for (; b >= 0; b -= 1) {
    const tk = tokens[b];
    if (/^[|:;.()]$/.test(tk.t)) break;
    if (!/^[\p{L}]/u.test(tk.t)) continue;
    const n = nounLemma(dominantOf, tk.lower);
    if (n) { before.push(n); break; } // the nearest noun names the measure ("Species | 36", "the population is 5,000", "bells rose from 36 to 40")
  }
  return { after: [...new Set(after)], before: [...new Set(before)] };
}

const yearLike = (iv) => Number.isInteger(iv.lo) && Number.isInteger(iv.hi) && iv.lo >= 1000 && iv.hi <= 2099 && !iv.comma && !iv.symbol && !iv.bound;


/** The month and day written beside a year, if any: "12 March 1759", "March 1759", "1759-03-12". */
function dateGrain(tokens, iv) {
  const prev = tokens[iv.i - 1], prev2 = tokens[iv.i - 2], next = tokens[iv.j];
  const monthAt = (tk) => (tk ? MONTHS.indexOf(tk.lower) : -1);
  if (monthAt(prev) >= 0) {
    const day = prev2 && /^\d{1,2}$/.test(prev2.t) ? Number(prev2.t) : null;
    return { month: monthAt(prev) + 1, day };
  }
  if (monthAt(prev2) >= 0 && prev && /^\d{1,2}$/.test(prev.t)) return { month: monthAt(prev2) + 1, day: Number(prev.t) };
  if (monthAt(next) >= 0) { const d = tokens[iv.j + 1]; return { month: monthAt(next) + 1, day: d && /^\d{1,2}$/.test(d.t) ? Number(d.t) : null }; }
  return { month: null, day: null };
}

/** A date interval in days-from-epoch-like units: years as [y, y+1), months as [m, m+1)/12, days as 1/366. */
function dateInterval(year, month, day) {
  if (month == null) return { lo: year, hi: year + 1, grain: "year" };
  const m0 = year + (month - 1) / 12;
  if (day == null) return { lo: m0, hi: m0 + 1 / 12, grain: "month" };
  const d0 = m0 + (day - 1) / 12 / 31;
  return { lo: d0, hi: d0 + 1 / 12 / 31, grain: "day" };
}

/**
 * The typed values of one unit: counts (with head), dates (with relation), and the scope year a count carries.
 * Also the ordinal indexes that qualify a referent surface ("the fourth lighthouse" -> lighthouse#4).
 */
function valuesOf(dominantOf, text) {
  const tokens = tokenize(text);
  const ivs = intervals(tokens, numerals(tokens));
  const values = [];
  const ordinals = [];
  for (const iv of ivs) {
    if (iv.ordinal) {
      // the noun the ordinal qualifies: the next noun lemma within three tokens
      for (let k = iv.j; k < Math.min(tokens.length, iv.j + 3); k += 1) {
        const n = /^[\p{L}]/u.test(tokens[k].t) ? nounLemma(dominantOf, tokens[k].lower) : null;
        if (n) { ordinals.push({ noun: n, index: iv.lo }); break; }
      }
      continue;
    }
    const heads = headOf(dominantOf, tokens, iv);
    if (!heads.after.length && yearLike(iv)) {
      const g = dateGrain(tokens, iv);
      const d = iv.range ? { lo: iv.lo, hi: iv.hi + 1, grain: "year" } : dateInterval(iv.lo, g.month, g.day);
      values.push({ kind: "date", lo: d.lo, hi: d.hi, grain: d.grain, relation: relationOf(dominantOf, tokens, iv.i, iv.j), raw: tokens.slice(iv.i, iv.j).map((x) => x.t).join(" "), i: iv.i });
      continue;
    }
    const head = heads.after.length ? heads.after : heads.before;
    if (!head.length) continue; // a bare number with nothing it counts: nothing to compare it with
    values.push({ kind: "count", lo: iv.lo, hi: iv.hi, grain: iv.grain, head, raw: iv.raw, i: iv.i, j: iv.j });
  }
  // a year beside a count is the count's TIME SCOPE, not a value of its own, when no verb claims the year: it opens the unit ("In 2020 ...") or
  // follows the count with no verb between ("had 5,000 inhabitants in 2020"); "completed in 1759, has 3 floors" keeps its date
  const counts = values.filter((v) => v.kind === "count");
  const dates = values.filter((v) => v.kind === "date");
  if (counts.length && dates.length === 1) {
    const d = dates[0];
    const after = counts.filter((c) => c.j <= d.i);
    const noVerbBetween = after.some((c) => !tokens.slice(c.j, d.i).some((tk) => /^[\p{L}]/u.test(tk.t) && dominantOf(tk.lower)?.upos === "VERB"));
    const opens = d.i <= 1 && counts.every((c) => c.i > d.i); // "In 2020 ..." before every count: the year frames the unit
    if (!d.relation || noVerbBetween || opens) {
      for (const c of counts) c.scope = { year: Math.floor(d.lo), raw: d.raw };
      return { values: counts, ordinals };
    }
  }
  return { values, ordinals };
}

// ── the graph ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s ?? "").toLowerCase().replace(/['’]s\b/g, "").replace(/^(the|a|an)\s+/, "").replace(/\s+/g, " ").trim();

/**
 * claimGraph({ claims }) -> { nodes, edges, byEnd, gaps }
 * Each node: { id, text, standing, at, kind, ends: [..], proper: [..], values: [..], gap? }. Ends are referent ids from the builder over the
 * whole piece plus recurrent noun lemmas; an ordinal qualifies its noun ("lighthouse#4"). Edges join nodes sharing at least one end.
 */
export async function claimGraph({ claims = [] } = {}, { weighting = "surprisal" } = {}) {
  const { dominantOf, buildReferents, sameAct } = await organsOnce();
  const units = (Array.isArray(claims) ? claims : []).map((c, i) => (typeof c === "string" ? { text: c } : c ?? {})).map((c, i) => ({
    id: i, text: String(c.text ?? "").replace(/\s+/g, " ").trim(), standing: c.standing ?? null, at: c.at ?? null, kind: c.kind ?? "prose", given: Array.isArray(c.ends) ? c.ends.map(norm).filter(Boolean) : [],
  })).filter((u) => u.text);
  let R = null;
  try { R = buildReferents(units.map((u) => u.text).join("\n\n")); } catch { R = null; }
  // tier 1: the piece's own referents (names, recurrent descriptors), as the builder represents them
  // a month name is calendar grammar, never a being, however the builder capitalises it
  const proper = units.map((u) => { try { return R ? [...R.resolveText(u.text)].map((id) => norm(R.represent(id))).filter((e) => e && !MONTHS.includes(e)) : []; } catch { return []; } });
  // tier 2: bare common nominals the prior reads as nouns, admitted only on recurrence across distinct units (the descriptor tier's bar)
  const nouns = units.map((u) => [...new Set(tokenize(u.text).map((tk) => nounLemma(dominantOf, tk.lower)).filter(Boolean))]);
  const seen = new Map();
  nouns.forEach((ns) => ns.forEach((n) => seen.set(n, (seen.get(n) ?? 0) + 1)));
  const nodes = units.map((u, i) => {
    const { values, ordinals } = valuesOf(dominantOf, u.text);
    const ends = new Set(u.given);
    for (const p of proper[i]) ends.add(p);
    for (const n of nouns[i]) if ((seen.get(n) ?? 0) >= 2) ends.add(n);
    // an ordinal indexes its noun, on both tiers: "the fourth Eddystone Lighthouse" is not the lighthouse of "the third"
    for (const o of ordinals) {
      for (const e of [...ends]) if (e === o.noun || e.split(" ").includes(o.noun)) { ends.delete(e); ends.add(`${e}#${o.index}`); }
    }
    return { id: u.id, text: u.text, standing: u.standing, at: u.at, kind: u.kind, ends: [...ends].sort(), proper: [...new Set(proper[i])], values };
  });
  const graph = { schema: CONTEST_SCHEMA, weighting, nodes, edges: [], byEnd: {}, gaps: [], hubs: [] };
  Object.defineProperty(graph, "organs", { value: { sameAct, dominantOf }, enumerable: false });
  return relink(graph);
}

/** The pool's hub ends (PREREG Amendment 3): over the claims that carry at least one end, c(e) is how many carry e, T the end tokens, m the distinct
 *  ends; an end is a hub when c(e) > T / m — carried by more claims than the pool's chance floor, the count an end has when the pool's end tokens
 *  are dealt evenly over its distinct ends (the deal the shuffled null draws from). In resolve's terms its surprisal, -log((c + 0.5) / (n + 1)), is
 *  below that of a chance-dealt end. No constant is chosen; a pool of one end per claim has no hub. */
export function hubEnds(nodes) {
  const count = new Map();
  let T = 0;
  for (const n of nodes) for (const e of n.ends) { count.set(e, (count.get(e) ?? 0) + 1); T += 1; }
  const m = count.size;
  if (!m) return [];
  const floor = T / m;
  return [...count.entries()].filter(([, c]) => c > floor).map(([e]) => e).sort();
}

/** Rebuild hubs, weighted ends, gaps, edges and byEnd from the nodes' ends (used after a shuffle). Edges join nodes sharing a weighted end. */
function relink(graph) {
  const hubs = graph.weighting === "none" ? [] : hubEnds(graph.nodes);
  const hubSet = new Set(hubs);
  for (const n of graph.nodes) {
    n.hubs = n.ends.filter((e) => hubSet.has(e));
    n.weighted = n.ends.filter((e) => !hubSet.has(e));
    const gap = !n.ends.length ? "no_ends" : !n.weighted.length ? "hub_ends" : !n.values.length ? "no_value" : null;
    if (gap) n.gap = gap; else delete n.gap;
  }
  const byEnd = {};
  for (const n of graph.nodes) for (const e of n.weighted) (byEnd[e] ??= []).push(n.id);
  const edges = [];
  for (let i = 0; i < graph.nodes.length; i += 1) for (let j = i + 1; j < graph.nodes.length; j += 1) {
    const shared = graph.nodes[i].weighted.filter((e) => graph.nodes[j].weighted.includes(e));
    if (shared.length) edges.push({ a: graph.nodes[i].id, b: graph.nodes[j].id, shared });
  }
  graph.hubs = hubs;
  graph.edges = edges;
  graph.byEnd = byEnd;
  graph.gaps = graph.nodes.filter((n) => n.gap).map((n) => ({ id: n.id, at: n.at, gap: n.gap }));
  return graph;
}

/** The null: the ends dealt across the claims at random (values stay with their claims). rng() in [0,1). */
export function shuffleEnds(graph, rng = Math.random) {
  const pool = graph.nodes.map((n) => n.ends);
  for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const nodes = graph.nodes.map((n, i) => ({ ...n, ends: pool[i] }));
  const out = { ...graph, nodes };
  Object.defineProperty(out, "organs", { value: graph.organs, enumerable: false });
  return relink(out);
}

// ── contests ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sameHead = (a, b) => a.length === b.length && a.every((h) => b.includes(h));
const meet = (x, y) => {
  // each interval widened by half its grain; dates carry their grain in the interval already
  const gx = x.kind === "date" ? 0 : x.grain / 2, gy = y.kind === "date" ? 0 : y.grain / 2;
  // strictly: two neighbouring integers (36, 37) or two neighbouring years touch at the boundary and are still two values
  return x.lo - gx < y.hi + gy && y.lo - gy < x.hi + gx;
};
/** Do two typed values speak of the same cell: same kind, same head (counts) or same relation (dates)? */
function comparable(x, y, sameAct) {
  if (x.kind !== y.kind) return false;
  if (x.kind === "count") return sameHead(x.head, y.head);
  if (x.relation == null && y.relation == null) return true;
  if (x.relation == null || y.relation == null) return false;
  return x.relation === y.relation || !!sameAct?.(x.relation, y.relation);
}
const nested = (A, B) => A.every((e) => B.includes(e)) || B.every((e) => A.includes(e));

/**
 * contests({ graph }) -> [{ a, b, ends, kind, values, settled }]
 * Two claims on equal or nested ends, with comparable values whose intervals do not meet at grain. Settled when a third claim on those ends carries
 * both values, when exactly one side is time-scoped, or (counts) when one side's ends strictly include the other's by proper referents.
 */
export function contests({ graph } = {}) {
  const out = [];
  const sameAct = graph?.organs?.sameAct ?? ((a, b) => a === b);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const e of graph.edges) {
    const A = byId.get(e.a), B = byId.get(e.b);
    if (A.gap || B.gap || !nested(A.weighted, B.weighted)) continue; // hubs neither join nor separate (Amendment 3)
    for (const x of A.values) for (const y of B.values) {
      if (!comparable(x, y, sameAct) || meet(x, y)) continue;
      // both sides scoped to different years are two cells, not one contest
      if (x.scope && y.scope && x.scope.year !== y.scope.year) continue;
      const ends = e.shared;
      let settled = null;
      if (!!x.scope !== !!y.scope) {
        const s = x.scope ? A : B;
        settled = { by: s.at, how: `time-scoped: ${(x.scope ?? y.scope).raw}` };
      } else if (x.kind === "count" && A.weighted.length !== B.weighted.length) {
        const [wide, narrow] = A.weighted.length < B.weighted.length ? [A, B] : [B, A];
        const extras = narrow.weighted.filter((k) => !wide.weighted.includes(k));
        if (extras.length && extras.every((k) => narrow.proper.includes(k))) settled = { by: narrow.at, how: `narrower scope: ${extras.join(", ")}` };
      }
      if (!settled) {
        // a third claim on these ends that carries both values states the relation between them
        for (const C of graph.nodes) {
          if (C === A || C === B || C.gap || !nested(C.weighted, ends)) continue;
          const covers = (v) => C.values.some((z) => comparable(z, v, sameAct) && meet(z, v));
          if (covers(x) && covers(y)) { settled = { by: C.at, how: `a third claim carries both: ${C.text.slice(0, 120)}` }; break; }
        }
      }
      out.push({ a: { id: A.id, at: A.at, text: A.text }, b: { id: B.id, at: B.at, text: B.text }, ends, kind: "value", type: x.kind, values: [x.raw, y.raw], settled });
    }
  }
  return out;
}

/** rest({ graph, contests }) -> the undisputed claims and the confession's counts. */
export function rest({ graph, contests: cs = [] } = {}) {
  const disputed = new Set(cs.flatMap((c) => [c.a.id, c.b.id]));
  const rests = graph.nodes.filter((n) => !n.gap && !disputed.has(n.id)).map((n) => ({ id: n.id, at: n.at, text: n.text }));
  return { rests, contests: cs.length, conceded: cs.filter((c) => c.settled).length, gaps: graph.gaps.length };
}

export default { CONTEST_SCHEMA, claimGraph, contests, rest, shuffleEnds, hubEnds };
