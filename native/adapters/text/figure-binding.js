// figure-binding.js — every figure in a sentence, BOUND: what it measures, of whom, in which event. Language-neutral: it reads a UD parse; the
// language's own number words, unit words, month names and hedges come in as `lex` from that language's grammar adapter.
//
//   value / hi     the number (a range "35–40" keeps both ends); a scale word after it multiplies ("1.2 billion")
//   measure        the unit's class (length, mass, time, temperature, share, date) with the value converted to base units; a number with no unit
//                  counts the noun it modifies ("count:species")
//   alts           the same quantity said again in brackets right after it ("36 kg (79 lbs)"), converted: any of them may meet
//   attribute      the noun that HAS the figure ("a radius of 2,440 km" → radius) or the adjective it qualifies ("8,849 m tall" → tall)
//   being          the subject of the clause the figure sits in (climbing participles and conjuncts to it), or the counted noun when the
//                  figure counts the subject itself ("Twelve astronauts walked")
//   event          the lemma of the clause's predicate
// A figure that names no being is still returned (being null): the matcher can only compare it as "said somewhere in the sentence".

const kidsOf = (rows, id) => rows.filter((r) => r.head === id);
const byId = (rows, id) => rows.find((r) => r.id === id);
const lem = (r) => String(r?.lemma || r?.form || "").toLowerCase();
const isPred = (rows, r) => r && (/^(VERB|AUX)$/.test(r.upos) || kidsOf(rows, r.id).some((c) => c.deprel === "cop"));

/** the predicate a word belongs to: up the tree to the first verb or copula head */
function predicateOf(rows, r) { let x = r; for (let i = 0; i < 12 && x; i++) { if (isPred(rows, x)) return x; x = byId(rows, x.head); } return null; }
/** a predicate's subject; a conjoined or participle clause borrows its head's */
function subjectOf(rows, p) {
  for (let x = p, i = 0; x && i < 5; i++) {
    const s = kidsOf(rows, x.id).find((k) => /^nsubj/.test(k.deprel)); if (s) return s;
    if (x.deprel === "conj" || /^(advcl|xcomp)$/.test(x.deprel)) { x = byId(rows, x.head); continue; }
    if (/^acl/.test(x.deprel)) return byId(rows, x.head);
    return null;
  }
  return null;
}

/** bindFigures(rows, lex) → [{ value, hi, base, alts, measure, attribute, beingId, eventLemma, approx, ids }] */
export function bindFigures(rows, lex) {
  const out = [], used = new Set();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; if (used.has(r.id)) continue;
    const mine = [], take = (id) => { used.add(id); mine.push(id); };
    const num = lex.numberOf(r.form, rows[i + 1]?.form);
    if (!num) continue;
    take(r.id);
    let value = num.value, hi = num.hi ?? null, unitWord = num.unit ?? null, unitRow = null;
    // a thousands mark written as a space ("1 006 kilomètres", "4 807,47 mètres", "117 000 km2"): the next word is three digits, nothing between
    for (let at = r; !num.unit && /^\d{1,3}$/.test(at.form) && rows[i + 1] && /^\d{3}([.,]\d+)?$/.test(rows[i + 1].form) && (at.end == null || rows[i + 1].start - at.end === 1); ) {
      const nx = rows[i + 1]; value = value * 1000 + +nx.form.replace(",", "."); take(nx.id); i++; at = nx; if (/[.,]/.test(nx.form)) break;
    }
    // a range said with a dash or "to" between two numbers ("35 – 40", "35 to 40")
    if (hi == null && rows[i + 1] && /^(–|-|—|to)$/.test(rows[i + 1].form) && rows[i + 2]) { const n2 = lex.numberOf(rows[i + 2].form); if (n2 && !n2.unit) { hi = n2.value; take(rows[i + 1].id); take(rows[i + 2].id); i += 2; } }
    // a scale word right after it multiplies ("1.2 billion")
    const scale = rows[i + 1] && lex.scaleOf(rows[i + 1].form); if (scale) { value *= scale; if (hi != null) hi *= scale; take(rows[i + 1].id); }
    let next = rows[i + (scale ? 2 : 1)];
    // the unit may stand one modifier away ("88 Earth days", "45 metric tons")
    const next2 = rows[i + (scale ? 3 : 2)];
    if (!unitWord && next && !lex.unitOf(next.form) && next2 && lex.unitOf(next2.form) && next2.head !== r.id && /^(PROPN|ADJ|NOUN)$/.test(next.upos)) { unitWord = next2.form; unitRow = next2; take(next2.id); take(next.id); }
    if (!unitWord && next && lex.unitOf(next.form)) { unitWord = next.form; unitRow = next; take(next.id); }
    // "100 degrees Celsius": the scale word after "degree" names the scale
    if (unitWord && /^degrees?$/i.test(unitWord)) { const sc = rows[rows.indexOf(unitRow ?? next) + 1]; if (sc && lex.unitOf(sc.form)) { unitWord = sc.form; take(sc.id); } }
    const U = unitWord ? lex.unitOf(unitWord) : null;
    // a year said with its unit is a date (1936年), where the same unit after a small number is a duration (3年)
    const dateByUnit = U && lex.dateUnit?.(unitWord) && Number.isInteger(value) && value >= 1000 && value <= 2100;
    const date = dateByUnit || (!U && lex.isYear(value, r.form, rows, i));
    const counted = !U && !date ? (r.upos === "NUM" || num.word) && byId(rows, r.head) && /^(NOUN|PROPN)$/.test(byId(rows, r.head).upos) ? byId(rows, r.head) : null : null;
    const measure = dateByUnit ? "date" : U ? U[0] : date ? "date" : counted ? `count:${lex.singular(lem(counted))}` : "count";
    const toBase = (v) => (U && !dateByUnit ? (v + (U[2] ?? 0)) * U[1] : v);
    // the same quantity again in brackets: "36 kg (79 lbs)"
    const alts = [];
    const after = rows.slice(i + 1, i + 8), open = after.findIndex((x) => x.form === "(");
    if (U && open >= 0 && open <= 3) {
      const inside = after.slice(open + 1, open + 4), n2 = inside[0] && lex.numberOf(inside[0].form, inside[1]?.form);
      const u2 = n2 && (n2.unit ? lex.unitOf(n2.unit) : inside[1] && lex.unitOf(inside[1].form));
      if (u2 && u2[0] === U[0]) { alts.push((n2.value + (u2[2] ?? 0)) * u2[1]); for (const x of inside.slice(0, 2)) take(x.id); }
    }
    // the attribute: a noun that has the figure through "of" ("a radius of 1,516 miles"), or the adjective it qualifies ("8,849 metres tall")
    const anchor = unitRow ?? counted ?? r;
    let attribute = null;
    const up = byId(rows, anchor.head);
    if (up && /^(NOUN)$/.test(up.upos) && /^nmod/.test(anchor.deprel)) attribute = lex.singular(lem(up));
    const adj = rows.find((x) => x.upos === "ADJ" && (x.id === anchor.id + 1 || x.head === anchor.id || anchor.head === x.id) && lex.isDimension(lem(x)));
    if (!attribute && adj) attribute = lem(adj);
    // the being and the event: the clause the figure sits in
    const pred = predicateOf(rows, counted ?? r);
    let being = pred ? subjectOf(rows, pred) : null;
    // "With a radius of 1,516 miles, Mercury is …": an opening with-phrase belongs to the main clause's subject
    if (!being) { const root = rows.find((x) => x.head === 0); being = root ? subjectOf(rows, root) : null; }
    // the figure counts the subject itself: "Twelve astronauts walked on the Moon"
    if (counted && being && counted.id === being.id) being = counted;
    out.push({ value, hi, base: toBase(value), hiBase: hi != null ? toBase(hi) : null, alts, measure, attribute, beingId: being?.id ?? null, eventLemma: pred ? lem(pred) : null, approx: lex.isApprox(rows, i), ids: mine });
  }
  return out;
}
