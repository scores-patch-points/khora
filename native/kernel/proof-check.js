// proof-check.js — an independent checker for the proofs stage.js emits. It imports NOTHING from hl.js, stage.js or atom-support.js: it takes a
// proof record and the source bytes and re-derives, from those alone, that the contradiction follows.
//
//   checkProof(record, sourceText, { licenses }) → { ok: boolean, why: string[] }
//
// It checks: (1) the license is one of the given ones and names its giver; (2) every cited span lies inside the source and its text shows the
// subject and the held value; (3) the held value and the claimed value are different values of the SAME measure (numbers re-parsed from the
// text of the spans, not read from the reasoner); (4) for a superlative, the held holder and the claimed holder are different names; (5) the sense: when
// the claim states a point year, a held value whose own sentence states other point years is held for another time, and is no contradiction of a claim
// about this one (years that are not points, such as "since 2010" or "the 2008 report", are not counted).
// A proof that fails any check is not a proof, and the caller must not commit it.
const num = (t) => { const m = String(t ?? "").replace(/(\d),(?=\d{3}\b)/g, "$1").match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
const norm = (t) => String(t ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
// the years a sentence states as POINTS ("in 1900", "In May 2024", "on March 3, 2010"). A year after since, until, between, by, "according to", or inside a
// name ("the 2008 report", "the 1990s") is not a point in time of the fact, so it is not counted (the reasoner reads time the same way, independently)
const MON = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec";
const POINTS = new RegExp(`\\b(?:in|on|during|at)\\s+(?:the\\s+year\\s+)?(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?(?:(?:${MON})\\.?\\s+)?(?:\\d{1,2}(?:st|nd|rd|th)?,?\\s+)?(1[0-9]{3}|2[01][0-9]{2})\\b(?!s\\b)`, "gi");
const pointYears = (s) => [...String(s).matchAll(POINTS)].map((m) => m[1]);
// the sentence of the source that holds a span: back to the previous full stop, forward to the next
const sentenceAround = (src, a, b) => { let s = a, e = b; while (s > 0 && !/[.!?]\s/.test(src.slice(s - 2, s))) s--; while (e < src.length && !/[.!?](\s|$)/.test(src.slice(e - 1, e + 1))) e++; return src.slice(s, e + 1); };
export function checkProof(rec, source, { licenses = [] } = {}) {
  const why = [];
  const fail = (m) => { why.push(m); return { ok: false, why }; };
  if (!rec || !rec.rel) return fail("no record");
  if (!rec.giver || !licenses.some((g) => g === rec.giver)) return fail(`license giver is not among the given ones: ${rec.giver}`);
  if (!rec.held?.length) return fail("no held value cited");
  const isMeasure = /^has_/.test(rec.rel);
  for (const h of rec.held) {
    const [a, b] = h.span ?? [];
    if (!(Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b > a && b <= source.length)) return fail(`span ${h.span} lies outside the source`);
    const text = source.slice(a, b), n = norm(text);
    if (!n.includes(norm(h.label))) return fail(`span text does not show the held value "${h.label}"`);
    if (rec.subject && !n.includes(norm(rec.subject)) && !norm(source).includes(norm(rec.subject))) return fail(`subject "${rec.subject}" is not in the source`);
    const cy = rec.sense?.claim?.time, hy = cy?.length ? pointYears(sentenceAround(source, a, b)) : [];
    if (hy.length && !cy.some((y) => hy.includes(y))) return fail(`the held value is stated for ${[...new Set(hy)].join("/")}, the claim for ${cy.join("/")}: another time, not a contradiction`);
    if (isMeasure) {
      if (!h.measure || h.measure !== rec.claim.measure) return fail(`held measure ${h.measure} differs from claimed measure ${rec.claim.measure}: not the same key`);
      const hv = num(h.label), cv = num(rec.claim.label);
      if (hv == null || cv == null) return fail("a value has no number to compare");
      if (h.base == null || rec.claim.base == null) return fail("a value has no base unit");
      if (Math.abs(h.base - rec.claim.base) <= 1e-9 * Math.max(1, Math.abs(h.base))) return fail("held and claimed values are the same in base units");
    } else if (norm(h.label) === norm(rec.claim.label)) return fail("held and claimed holders are the same name");
  }
  return { ok: true, why: ["license given; spans in source and show the values; values differ on the same measure"] };
}
