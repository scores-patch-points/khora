// eot-claim-match.js — the EOT layer: a claim's EOT claims against a source's, by identity. It never sees a word of any language: keys, names,
// figures (measure + base value), polarity, tense, assertion, quantifier. Relation TYPES are declared here over the neutral keys, each with its
// giver; the grammar adapters are what turn a language's words into those keys.
// DECLARED (giver: comparative adjective pairs, enumerated over the neutral keys, not measured)
const CONVERSE = Object.fromEntries([["tall", "short"], ["large", "small"], ["big", "small"], ["old", "young"], ["heavy", "light"], ["long", "short"], ["high", "low"], ["fast", "slow"], ["wide", "narrow"], ["deep", "shallow"], ["early", "late"], ["many", "few"], ["much", "little"], ["rich", "poor"], ["hot", "cold"], ["before", "after"], ["above", "below"]].flatMap(([a, b]) => [[a, b], [b, a]]));
// DECLARED (giver: antonymous predicate pairs over the neutral keys): the same ends with one of these flips polarity
const ANTONYM = Object.fromEntries([["open", "closed"], ["open", "close"], ["alive", "dead"], ["true", "false"], ["present", "absent"], ["legal", "illegal"], ["possible", "impossible"], ["safe", "dangerous"], ["visible", "invisible"], ["active", "inactive"], ["extinct", "extant"], ["extinct", "dormant"], ["extinct", "active"]].flatMap(([a, b]) => [[a, b], [b, a]]));
// DECLARED: relations whose object is a measure of the subject, and relations that only join their ends (the ends decide)
const STATIVE = new Set(["be", "have", "stand", "measure", "weigh", "reach", "rise", "span", "cover", "total", "number", "carry", "contain", "hold", "boil", "freeze", "melt", "travel"]);
const LIGHT = new Set(["be", "have", "by", "of"]);
const isNum = (k) => /^\d/.test(k);
// Two ends are ONE being when they carry the same name, or the same head with modifiers that do not exclude each other: "toothed whale" and
// "baleen whale" share a head and are two beings; "the smallest female jaguars" and "jaguars" are one kind read at two grains. Sharing
// any one word is not identity ("the largest cat in Africa" is not "a large cat species").
const mods = (e) => e.keys.filter((k) => k !== e.head && !isNum(k));
export const linked = (a, b) => { if (!a || !b) return false;
  const sa = a.names.at(-1) ?? null, sb = b.names.at(-1) ?? null;
  if (sa && sb) return sa === sb;
  if (sa && (b.head === sa || b.keys.includes(sa))) return true; if (sb && (a.head === sb || a.keys.includes(sb))) return true;
  if (a.head !== b.head || isNum(a.head) || a.head.length < 2) return false;
  const ma = mods(a), mb = mods(b);
  return !(ma.length && mb.length && !ma.some((k) => mb.includes(k))); };
const figs = (p) => [p.ARG0, p.ARG1, ...(p.OBL || [])].filter(Boolean).flatMap((e) => [...e.figs, ...(e.agent?.figs ?? [])]);
const sameValue = (x, y) => { const tol = x.approx || y.approx ? 0.02 : 0.005; return Math.abs(x.base - y.base) <= Math.max(0.5, tol * Math.abs(y.base)); };
const measureMeet = (c, s) => { if (!(c.rel === s.rel || (STATIVE.has(c.rel) && STATIVE.has(s.rel)))) return null;
  const a = figs(c).filter((f) => f.measure !== "date" && f.measure !== "count"), b = figs(s).filter((f) => f.measure !== "date" && f.measure !== "count");
  for (const x of a) for (const y of b) if (x.measure === y.measure) return sameValue(x, y) ? "same" : "differs"; return null; };
const RANK = { C: 3, E: 2, T: 1, U: 0 };
/** claims (the answer's) against source claims → { v: E | C | T | U | X, why } */
export function verdict(C, S, { janus = null } = {}) {
  if (!C.length) return { v: "X", why: "no claim read" };
  // identity inside the source: "Mercury is the fastest planet, zipping around the Sun" — what the source says of "the fastest planet" it
  // says of Mercury. Each source claim is also read with an end that a copula of the same source equates replaced by its other side.
  const eqs = S.filter((x) => x.rel === "be" && x.ARG0 && x.ARG1 && x.polarity === "+");
  S = [...S, ...S.flatMap((x) => eqs.flatMap((q) => ["ARG0", "ARG1"].filter((r) => x !== q && x[r] && linked(x[r], q.ARG1)).map((r) => ({ ...x, [r]: q.ARG0 }))))];
  const per = [];
  // FIGURES (figure-binding.js): a claim's figure against the source's figures of the same measure (and attribute, when both name one) of the
  // same being; dates and counts also need the same event. Same value (within the precision a hedge allows; ranges and bracketed equivalents
  // count) supports, another value contradicts, nothing comparable says nothing.
  const figVerdicts = [];
  for (const c of C.filter((x) => x.rel === "fig" && x.ARG0)) {
    let v = null;
    for (const s of S.filter((x) => x.rel === "fig" && x.ARG0)) {
      const a = c.fig, b = s.fig;
      if (a.measure !== b.measure || (a.attribute && b.attribute && a.attribute !== b.attribute) || !linked(c.ARG0, s.ARG0)) continue;
      if ((a.measure === "date" || a.measure.startsWith("count")) && a.event !== b.event && !(STATIVE.has(a.event) && STATIVE.has(b.event))) continue;
      const tol = (x) => Math.max(0.5, (a.approx || b.approx ? 0.03 : 0.015) * Math.abs(x));
      const hit = [b.base, ...(b.alts ?? [])].some((y) => Math.abs(a.base - y) <= tol(y)) || (b.hiBase != null && a.base >= b.base - tol(b.base) && a.base <= b.hiBase + tol(b.hiBase)) || (a.hiBase != null && b.base >= a.base && b.base <= a.hiBase);
      v = hit ? "E" : v ?? "C";
      if (hit) break;
    }
    if (v) figVerdicts.push(v);
  }
  if (figVerdicts.includes("C")) return { v: "C", why: "figure differs" };
  C = C.filter((x) => x.rel !== "fig"); S = S.filter((x) => x.rel !== "fig");
  if (!C.length) return { v: figVerdicts.includes("E") ? "E" : "X", why: figVerdicts.length ? "figure" : "no claim read" };
  for (const c of C) {
    let best = { v: "U", why: "" };
    for (const s of S) {
      const anyEnd = (e) => [s.ARG0, s.ARG1, ...(s.OBL || [])].some((x) => linked(e, x));
      const straight = s.ARG0 ? (!c.ARG0 || linked(c.ARG0, s.ARG0)) && (!c.ARG1 || linked(c.ARG1, s.ARG1) || s.OBL?.some((o) => linked(c.ARG1, o))) : (!c.ARG0 || anyEnd(c.ARG0)) && (!c.ARG1 || anyEnd(c.ARG1));
      const crossed = c.ARG0 && c.ARG1 && linked(c.ARG0, s.ARG1) && linked(c.ARG1, s.ARG0) && !linked(c.ARG0, s.ARG0);
      const byAgent = c.ARG0 && c.ARG1 && s.rel === "be" && linked(c.ARG1, s.ARG0) && s.ARG1?.agent && linked(c.ARG0, s.ARG1.agent);
      const conv = CONVERSE[c.rel] === s.rel;
      // a light relation joins its two ends and nothing more, so BOTH ends must be met (an oblique does not stand in for "be"'s second end);
      // and every oblique the claim carries ("mainly in the roots") must meet one of the source's, or the claim says more than the source
      const both = c.ARG0 && c.ARG1 ? linked(c.ARG0, s.ARG0 ?? s.ARG1) && linked(c.ARG1, s.ARG1) : true;
      const oblMet = (c.OBL || []).filter((o) => !o.figs?.length).every((o) => (s.OBL || []).some((x) => linked(o, x)) || [s.ARG0, s.ARG1].some((x) => linked(o, x)));
      const sameRel = (c.rel === s.rel && oblMet) || ((LIGHT.has(c.rel) || LIGHT.has(s.rel)) && straight && both && oblMet);
      const measure = c.ARG0 && linked(c.ARG0, s.ARG0) ? measureMeet(c, s) : null;
      const antonym = c.rel === "be" && (s.rel !== "be" ? ANTONYM[c.ARG1?.head] === s.rel : ANTONYM[c.ARG1?.head] === s.ARG1?.head);
      const guard = !s.asserted && c.asserted ? "the source only reports or hedges it" : c.tense === "present" && s.tense === "past" && sameRel ? "other tense" : c.ARG0?.quant && s.ARG0?.quant && c.ARG0.quant !== s.ARG0.quant && /^(all|none)$/.test(c.ARG0.quant) ? "other quantifier" : null;
      let r = null;
      if ((sameRel && straight) || byAgent || (conv && crossed) || measure === "same") {
        if (c.polarity !== s.polarity) r = { v: "C", why: `polarity: ${c.rel}` };
        else if (measure === "differs") r = { v: "C", why: `measure differs: ${c.rel}` };
        else if (guard) r = { v: "T", why: guard };
        else r = { v: "E", why: byAgent ? "agent by" : conv ? `converse ${c.rel}/${s.rel}` : measure === "same" ? "same measure" : c.rel };
      } else if (antonym && linked(c.ARG0, s.ARG0 ?? s.ARG1)) r = { v: "C", why: `antonym` };
      else if (c.rel === s.rel && crossed && c.asym) r = { v: "C", why: `roles swapped: ${c.rel}` };
      else if (conv && straight && c.asym) r = { v: "C", why: `converse with the same ends: ${c.rel}/${s.rel}` };
      else if (measure === "differs") r = { v: "C", why: `measure differs: ${c.rel}` };
      else if ([c.ARG0, c.ARG1].some((e) => e && (linked(e, s.ARG0) || linked(e, s.ARG1)))) r = { v: "T", why: "ends linked, relation unmet" };
      if (!r) continue;
      if (RANK[r.v] > RANK[best.v]) best = r;
      if (r.v === "C") break;
    }
    per.push(best);
  }
  if (per.some((p) => p.v === "C")) return { v: "C", why: per.map((p) => p.why).join("; ") };
  const mainIdx = C.map((c, i) => (c.main ? i : -1)).filter((i) => i >= 0);
  if ((mainIdx.length ? mainIdx.map((i) => per[i]) : per).every((p) => p.v === "E")) return { v: "E", why: per.map((p) => p.why).join("; ") };
  return { v: per.some((p) => p.v === "T" || p.v === "E") ? "T" : "U", why: per.map((p) => `${p.v}:${p.why}`).join("; ") };
}
