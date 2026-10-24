// eot-claim-match.js — the EOT layer: a claim's EOT claims against a source's, by identity. It never sees a word of any language: keys, names,
// figures (measure + base value), polarity, tense, assertion, quantifier. Relation TYPES are declared here over the neutral keys, each with its
// giver; the grammar adapters are what turn a language's words into those keys.
// DECLARED (giver: comparative adjective pairs, enumerated over the neutral keys, not measured)
const CONVERSE_PAIRS = [["tall", "short"], ["large", "small"], ["big", "small"], ["old", "young"], ["heavy", "light"], ["long", "short"], ["high", "low"], ["fast", "slow"], ["wide", "narrow"], ["deep", "shallow"], ["early", "late"], ["many", "few"], ["much", "little"], ["rich", "poor"], ["hot", "cold"], ["before", "after"], ["above", "below"]];
const CONVERSE = Object.fromEntries(CONVERSE_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]]));
// DECLARED (giver: antonymous predicate pairs over the neutral keys): the same ends with one of these flips polarity
const ANTONYM_PAIRS = [["open", "closed"], ["open", "close"], ["alive", "dead"], ["true", "false"], ["present", "absent"], ["legal", "illegal"], ["possible", "impossible"], ["safe", "dangerous"], ["visible", "invisible"], ["active", "inactive"], ["extinct", "extant"], ["extinct", "dormant"], ["extinct", "active"]];
const ANTONYM = Object.fromEntries(ANTONYM_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]]));
// every declared opposite, both ways (the maps above keep one partner per word, so "short" names only one of "tall" and "long")
const OPPOSITE = new Set([...CONVERSE_PAIRS, ...ANTONYM_PAIRS].flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
// DECLARED: relations whose object is a measure of the subject, and relations that only join their ends (the ends decide)
const STATIVE = new Set(["be", "have", "stand", "measure", "weigh", "reach", "rise", "span", "cover", "total", "number", "carry", "contain", "hold", "boil", "freeze", "melt", "travel"]);
const LIGHT = new Set(["be", "have", "by", "of"]);
const isNum = (k) => /^\d/.test(k);
// Two ends are ONE being when they carry the same name, or the same head with modifiers that do not exclude each other: "toothed whale" and
// "baleen whale" share a head and are two beings; "the smallest female jaguars" and "jaguars" are one kind read at two grains. Sharing
// any one word is not identity ("the largest cat in Africa" is not "a large cat species").
const mods = (e) => e.keys.filter((k) => k !== e.head && !isNum(k));
// two ends that are amounts are one when they are the same amount ("$35.0 million" read twice)
const sameAmount = (a, b) => a.figs?.length && b.figs?.length && a.figs.some((x) => b.figs.some((y) => x.measure === y.measure && Math.abs(x.base - y.base) <= Math.max(0.5, 0.005 * Math.abs(y.base))));
// two keys meet when either's alternatives hold the other's key (a gloss's synonyms: "relier" → connect, link, join)
const headMeet = (a, b) => a.head === b.head || (a.heads ?? []).includes(b.head) || (b.heads ?? []).includes(a.head);
const relMeet = (c, s) => c.rel === s.rel || (c.rels ?? []).includes(s.rel) || (s.rels ?? []).includes(c.rel);
export const linked = (a, b) => { if (!a || !b) return false;
  if (sameAmount(a, b)) return true;
  const sa = a.names.at(-1) ?? null, sb = b.names.at(-1) ?? null;
  // a bracketed alias ("… Airport (JRO)") is another name for the same being: either side's alias meets the other's name or alias
  if (sa && sb && sa !== sb && ((a.aliases ?? []).includes(sb) || (b.aliases ?? []).includes(sa))) return true;
  if (sa && sb) return sa === sb;
  if (sa && (b.head === sa || b.keys.includes(sa))) return true; if (sb && (a.head === sb || a.keys.includes(sb))) return true;
  // a one-letter head is no word in an alphabet ("s", "a"), but one character is a whole word in a logographic script (葉 leaf, 根 root)
  if (!headMeet(a, b) || isNum(a.head) || (a.head.length < 2 && !/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(a.head))) return false;
  const ma = mods(a), mb = mods(b);
  // modifiers that are a declared opposite pair are two beings: "the lowest navigable lake" is not "the highest navigable lake"
  if (ma.some((k) => mb.some((j) => OPPOSITE.has(`${k}|${j}`)))) return false;
  return !(ma.length && mb.length && !ma.some((k) => mb.includes(k))); };
const figs = (p) => [p.ARG0, p.ARG1, ...(p.OBL || [])].filter(Boolean).flatMap((e) => [...e.figs, ...(e.agent?.figs ?? [])]);
const sameValue = (x, y) => { const tol = x.approx || y.approx ? 0.02 : 0.005; return Math.abs(x.base - y.base) <= Math.max(0.5, tol * Math.abs(y.base)); };
const measureMeet = (c, s) => { if (!(c.rel === s.rel || (STATIVE.has(c.rel) && STATIVE.has(s.rel)))) return null;
  const a = figs(c).filter((f) => f.measure !== "date" && f.measure !== "count"), b = figs(s).filter((f) => f.measure !== "date" && f.measure !== "count");
  for (const x of a) for (const y of b) if (x.measure === y.measure) return sameValue(x, y) ? "same" : "differs"; return null; };
const RANK = { C: 3, E: 2, T: 1, U: 0 };
// every end a source says, with their modifier phrases and agents: what a claim's own modifiers may meet
const endsOf = (e, out = []) => { if (!e) return out; out.push(e); endsOf(e.agent, out); for (const n of e.nmods ?? []) endsOf(n, out); return out; };
const unmetMods = (c, S) => {
  const pool = S.flatMap((s) => [s.ARG0, s.ARG1, s.ARG2, ...(s.OBL ?? [])].flatMap((e) => endsOf(e)));
  const out = [], walk = (e) => { for (const n of e?.nmods ?? []) { if (!pool.some((x) => linked(n, x))) out.push(n.head); walk(n); } };
  for (const e of [c.ARG0, c.ARG1, c.ARG2, ...(c.OBL ?? [])]) walk(e);
  return out;
};
/** claims (the answer's) against source claims → { v: E | C | T | U | X, why } */
// TRANSFER FRAMES: a giver, a recipient and a thing, read from a claim by its verb's side of the transfer (relation-defs.js classOf): a verb
// of giving has the giver as subject and the recipient as indirect object or "to" phrase; a verb of taking has the recipient as subject and
// the giver as "from" / "by" phrase. Two claims whose relations are the same or converse meet when their frames do.
const caseOf = (o) => String(o?.text ?? "").split(" ")[0].toLowerCase();
function frameOf(c, cls0) {
  let cls = cls0;
  // a relative pronoun is not a party ("pursuant to which"): it is the clause's link, read where it points, not here
  const obl = (...cs) => (c.OBL ?? []).find((o) => cs.includes(caseOf(o)) && !/^(which|that|who|whom|whose|what)$/.test(o.head)) ?? null;
  // a verb of giving said with a "from" phrase and no recipient is the taking side ("we licensed rights from third parties")
  // (and a verb whose senses give both ways, "license", takes the side its case marking names)
  if ((cls === "out" || cls === "both") && obl("from") && !c.ARG2 && !obl("to")) cls = "in";
  if (cls === "both") cls = "out";
  if (cls === "out") return { giver: c.ARG0, recipient: c.ARG2 ?? obl("to"), thing: c.ARG1 };
  if (cls === "in") return { recipient: c.ARG0, giver: obl("from", "by") ?? c.ARG0?.agent ?? null, thing: c.ARG1 };
  return null;
}
function frameVerdict(fc, fs) {
  const both = (r) => fc[r] && fs[r];
  // one party on the other side of the same thing reverses it ("we paid the $4.0 million" / "we received the $4.0 million"). Requiring both parties
  // crossed was measured (PREREG run 7) and loses three labelled reversals for the one pair (511, sold / purchased shares) it settles
  if ((fc.giver && fs.recipient && linked(fc.giver, fs.recipient) && !(fs.giver && linked(fc.giver, fs.giver))) || (fc.recipient && fs.giver && linked(fc.recipient, fs.giver) && !(fs.recipient && linked(fc.recipient, fs.recipient)))) return "reversed";
  const roles = ["giver", "recipient", "thing"].filter(both), met = roles.filter((r) => linked(fc[r], fs[r]));
  if (met.length >= 2 && met.length === roles.length) return "met";
  if (met.length && met.length === roles.length && roles.length === 1 && roles[0] !== "thing") return "met";
  return met.length ? "partial" : null;
}
export function verdict(C, S, { janus = null, relations = null } = {}) {
  if (!C.length) return { v: "X", why: "no claim read" };
  // a claim its grammar did not read whole (claim-coverage.js: content words in no claim) is never supported: what was read may match, but
  // the words the parse dropped ("… northeast of Garmisch-Partenkirchen", "… to the port of Bordeaux") were checked against nothing
  const unread = [...new Set(C.flatMap((c) => c.unread ?? []))];
  const supported = (why) => (unread.length ? { v: "T", why: `claim partly read (unread: ${unread.join(", ")}); ${why}` } : { v: "E", why });
  // identity inside the source: "Mercury is the fastest planet, zipping around the Sun" — what the source says of "the fastest planet" it
  // says of Mercury. Each source claim is also read with an end that a copula of the same source equates replaced by its other side.
  const eqs = S.filter((x) => x.rel === "be" && x.ARG0 && x.ARG1 && x.polarity === "+");
  // an ALIAS (a naming: "also known as", "denominado") is an identity both ways: an end equal to either side is read with the other
  S = [...S, ...S.flatMap((x) => eqs.flatMap((q) => ["ARG0", "ARG1"].filter((r) => x !== q && x[r] && linked(x[r], q.ARG1)).map((r) => ({ ...x, [r]: q.ARG0 })))),
    ...S.flatMap((x) => eqs.filter((q) => q.alias).flatMap((q) => ["ARG0", "ARG1"].filter((r) => x !== q && x[r] && linked(x[r], q.ARG0)).map((r) => ({ ...x, [r]: q.ARG1 }))))];
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
  if (!C.length) return figVerdicts.includes("E") ? supported("figure") : { v: "X", why: figVerdicts.length ? "figure" : "no claim read" };
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
      // a claim's oblique meets a source oblique, an end, or one of their sub-ends ("… d'Europe occidentale et de l'Union européenne")
      const oblMet = (c.OBL || []).filter((o) => !o.figs?.length).every((o) => [...(s.OBL || []), s.ARG0, s.ARG1].flatMap((x) => endsOf(x)).some((x) => linked(o, x)));
      const sameRel = (relMeet(c, s) && oblMet) || ((LIGHT.has(c.rel) || LIGHT.has(s.rel)) && straight && both && oblMet);
      const measure = c.ARG0 && linked(c.ARG0, s.ARG0) ? measureMeet(c, s) : null;
      const antonym = c.rel === "be" && (s.rel !== "be" ? ANTONYM[c.ARG1?.head] === s.rel : ANTONYM[c.ARG1?.head] === s.ARG1?.head);
      const guard = !s.asserted && c.asserted ? "the source only reports or hedges it" : c.tense === "present" && s.tense === "past" && sameRel ? "other tense" : c.ARG0?.quant && s.ARG0?.quant && c.ARG0.quant !== s.ARG0.quant && /^(all|none)$/.test(c.ARG0.quant) ? "other quantifier" : null;
      let r = null;
      // transfer verbs, the same or a converse by the language's definitions: compare who gives, who gets, what
      const rk = relations ? (relMeet(c, s) ? "same" : relations.relate(c.rel, s.rel)) : null;
      const cc = rk ? relations.classOf(c.rel) : null, sc = rk ? relations.classOf(s.rel) : null;
      // the claim's other obliques (where, when, how) must still be met: "takes place mainly in the roots" is not "… in the leaves"
      const roleCase = new Set(["to", "from", "by"]);
      const otherOblMet = (c.OBL || []).filter((o) => !o.figs?.length && !roleCase.has(caseOf(o))).every((o) => (s.OBL || []).some((x) => linked(o, x)) || [s.ARG0, s.ARG1].some((x) => linked(o, x)));
      if (rk && cc && sc && otherOblMet) {
        const fv = frameVerdict(frameOf(c, cc), frameOf(s, sc));
        if (fv === "reversed") r = { v: "C", why: `direction reversed: ${c.rel}/${s.rel}` };
        else if (fv === "met") r = c.polarity !== s.polarity ? { v: "C", why: `polarity: ${c.rel}/${s.rel}` } : !s.asserted && c.asserted ? { v: "T", why: "the source only reports or hedges it" } : { v: "E", why: `${rk} by definition: ${c.rel}/${s.rel}` };
        // with one verb on both sides the frame only adds a reversal: "partly met" leaves the plain reading to decide ("named for" is a
        // giving only by its definition's head, "to give a name to")
        else if (fv === "partial" && c.rel !== s.rel) r = { v: "T", why: `frame partly met: ${c.rel}/${s.rel}` };
      }
      if (!r && rk === "same" && c.rel !== s.rel && straight) r = c.polarity !== s.polarity ? { v: "C", why: `polarity: ${c.rel}/${s.rel}` } : { v: "E", why: `same by definition: ${c.rel}/${s.rel}` };
      if (r) { if (RANK[r.v] > RANK[best.v]) best = r; if (r.v === "C") break; continue; }
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
    // a claim is met only when its ends' modifier phrases are too: each must link to something the source says ("the port of Bordeaux"
    // meets nothing in "… jusqu'au port de Nantes")
    if (best.v === "E") { const um = unmetMods(c, S); if (um.length) best = { v: "T", why: `modifier unmet: ${um.join(", ")}` }; }
    per.push(best);
  }
  if (per.some((p) => p.v === "C")) return { v: "C", why: per.map((p) => p.why).join("; ") };
  const mainIdx = C.map((c, i) => (c.main ? i : -1)).filter((i) => i >= 0);
  if ((mainIdx.length ? mainIdx.map((i) => per[i]) : per).every((p) => p.v === "E")) return supported(per.map((p) => p.why).join("; "));
  return { v: per.some((p) => p.v === "T" || p.v === "E") ? "T" : "U", why: per.map((p) => `${p.v}:${p.why}`).join("; ") };
}
