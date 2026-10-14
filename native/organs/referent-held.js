// organs/referent-held.js — does a reader's own text MENTION a referent the record admitted? A received entity set, no claim reader. Pure.
//
// WHY. The claim reader's recurrence-admitted subjects and objects carried no topical signal (ledger L53, own-words runs 2, 4, 5, 6):
// what it holds of a region is the volume and commonness of what it admits. L53's own "unless" names the way out: a RECEIVED entity set
// (a referent record) in place of one admitted from W by recurrence. The record already admits its referents by its own gate
// (`record.entities`); this asks only whether W names them.
//
//   mentionsOf(text, entities)         → Set of referent ids whose surface occurs in `text` as a whole word, case-sensitive
//   referentsOfSpan(span, entities)    → ids of referents the span's subject or object surface contains as a whole word
//   heldByReferent(region, mentioned, entities) → { held: [spans], share }
//
// Case-sensitive on purpose: referenthood by capitalisation is one signal (memory: capitalisation), and acronyms are case-bound
// (EOT is not "eot"). Whole word: Unicode letters and digits delimit; `Figure` does not match `Figures`. DECLARED, not measured
// (Constitution II.11): the case rule, giver the author, 2026-10-14; owed a null, which the own-words registration (Amendment 7) is.
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (surface) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(surface)}(?![\\p{L}\\p{N}])`, "u");

const surfacesOf = (entities) => entities.flatMap((e) => (Array.isArray(e.surfaces) ? e.surfaces : [e.surfaces ?? e.name]).filter(Boolean).map((s) => ({ id: e.id, surface: String(s), re: wordRe(s) })));

export function mentionsOf(text, entities = []) {
  const t = String(text ?? "");
  const out = new Set();
  for (const s of surfacesOf(entities)) if (s.re.test(t)) out.add(s.id);
  return out;
}

export function referentsOfSpan(span, entities = []) {
  const parts = [span?.claim?.subj, span?.claim?.obj].filter(Boolean).map(String);
  const out = new Set();
  for (const s of surfacesOf(entities)) if (parts.some((p) => s.re.test(p))) out.add(s.id);
  return out;
}

export function heldByReferent(region = [], mentioned = new Set(), entities = []) {
  const held = region.filter((u) => [...referentsOfSpan(u, entities)].some((id) => mentioned.has(id)));
  return { held, share: region.length ? held.length / region.length : null };
}

/**
 * Aboutness by head (OWN-WORDS-PREREG Amendment 9): a referent is the HEAD of a span's subject or object if that surface, normalized
 * (a trailing possessive and trailing punctuation removed), ENDS with the referent's surface as a whole word, case-sensitive. A
 * conservative head-final English noun-phrase rule: "the EOT" and "EOT" are hits; "the EOT contract" (head: contract) and "EOT's rule"
 * (head: rule) are not. DECLARED, not measured; the loss on modifier-final and appositive surfaces is stated, not tuned.
 */
const headRe = (surface) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(surface)}$`, "u");
const cleanSurface = (t) => String(t ?? "").normalize("NFC").trim().replace(/[\s.,;:!?)"”’']+$/u, "").replace(/(?:'s|’s)$/u, "").trim();

export function headReferentsOfSpan(span, entities = []) {
  const parts = [span?.claim?.subj, span?.claim?.obj].filter(Boolean).map(cleanSurface);
  const out = new Set();
  for (const e of entities) {
    const surfs = (Array.isArray(e.surfaces) ? e.surfaces : [e.surfaces ?? e.name]).filter(Boolean);
    for (const sf of surfs) { const re = headRe(String(sf)); if (parts.some((p) => re.test(p))) out.add(e.id); }
  }
  return out;
}
