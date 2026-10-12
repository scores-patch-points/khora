// kernel/prior-recognizer.js — THE RETAINED MIND'S OPERATIVE CONSUMER.
//
// An EOReceivedPrior@1 entry that carries a data recognizer (mode: "surface",
// with the forms the retained reading saw) nominates a PerceptCandidate when
// the encounter's material shows one of its forms — evidence anchored at the
// span, whole-word, case- and diacritic-normalized. Nomination ONLY: witness
// still decides admission (perception.js's standing rule: priors nominate,
// they never admit; Amendment XVII). The entry keeps its referent — the POINT
// the retained reading kept — so recognition is by-surface nomination of a
// kept point, never a spelling-identity claim (S113: a shared form nominates,
// identity is a subsequent act).
//
// node:-free and JSON-portable by construction: the sealed mind carries no
// functions, so the recognizer travels as data and is interpreted here.

const freeze = (value) => Object.freeze(value);

export const PRIOR_RECOGNIZER_EVIDENCE = "EORecognizedSurface@1";
export const PRIOR_RECOGNIZED_REFERENT = "EORecognizedReferent@1";

/** The material an encounter offers perception. Declared channels, in order:
 *  encounter.material.text, encounter.text, encounter.content.text. Absent
 *  material is a typed gap (null) — never an empty-string guess. */
export function materialOf(encounter) {
  const text = encounter?.material?.text ?? encounter?.text ?? encounter?.content?.text ?? null;
  return typeof text === "string" && text.length > 0 ? text : null;
}

/** The norm a surface is compared by — for NOMINATION ONLY. Matching is on the
 *  lowered raw text (offsets stay true to the material); a candidate slice is
 *  admitted only when its normalized form equals the entry's normalized form. */
export function normForm(s) {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lowercase + strip diacritics (NFD), keeping an index map back to the RAW
 *  text so every match's offsets stay true to the material. Precomposed and
 *  decomposed forms both land (é and e+U+0301 both strip to "e"). */
export function loweredStrippedWithMap(text) {
  const stripped = [];
  const map = [];
  let i = 0;
  for (const ch of text) {
    const d = ch.normalize("NFD");
    for (const c of d) {
      if (/[\u0300-\u036f]/u.test(c)) continue;
      stripped.push(c.toLowerCase());
      map.push(i);
    }
    i += ch.length;
  }
  return { text: stripped.join(""), map };
}

/** Whole-word surface hits in the raw material. Returns per hit:
 *  { form, start, end, quote } with offsets into the ORIGINAL text and a quote
 *  equal to material.slice(start, end). Boundaries are checked explicitly
 *  (the V8 g-flag iteration misfires with combined lookaround escapes, so
 *  wordhood is decided per hit, not inside the regex). */
export function surfaceMatches(text, forms) {
  if (typeof text !== "string" || text.length === 0) return [];
  const { text: stripped, map } = loweredStrippedWithMap(text);
  const out = [];
  for (const form of forms ?? []) {
    const target = normForm(form);
    if (!target) continue;
    for (const match of stripped.matchAll(new RegExp(escapeRe(target), "gu"))) {
      const at = match.index;
      const after = stripped[at + target.length] ?? "";
      if (/[\p{L}\p{N}]/u.test(after)) continue;
      if (at > 0 && /[\p{L}\p{N}]/u.test(stripped[at - 1])) continue;
      const start = map[at];
      const end = map[at + target.length - 1] + 1;
      const quote = text.slice(start, end);
      if (normForm(quote) !== target) continue;
      out.push(freeze({ form, start, end, quote }));
    }
  }
  return out;
}

const entryDistinctions = (entry) => {
  const d = { referent: entry.referent, standing: entry.standing ?? null, terrain: entry.terrain ?? null, basis: entry.basis ?? null };
  return freeze(entry.rate != null ? { ...d, rate: entry.rate } : d);
};

/**
 * The interpreter: an EOReceivedPrior@1 whose entries carry a surface
 * recognizer nominates candidates anchored at the material's matches. Each
 * candidate carries (a) the retained referent and its standing as the
 * distinction, (b) the matched span as EORecognizedSurface@1 evidence, and
 * (c) one EORecognizedReferent@1 graph entry so an admitted observation
 * lands in the fold (applyObservation upserts graphEntries). Pure and
 * deterministic: entry order, then span order.
 */
export function recognizerNominations(prior, encounter, orientation = {}) {
  if (!prior || prior.schema !== "EOReceivedPrior@1") return [];
  const text = materialOf(encounter);
  if (text == null) return [];
  const out = [];
  for (const entry of prior.entries ?? []) {
    const rec = entry?.recognizer;
    if (!rec || rec.mode !== "surface" || !Array.isArray(rec.forms)) continue;
    for (const hit of surfaceMatches(text, rec.forms)) {
      const referentId = `recognized:${entry.referent}:${hit.start}`;
      out.push(freeze({
        schema: "PerceptCandidate@1",
        candidate: freeze({
          distinctions: freeze([entryDistinctions(entry)]),
          form: hit.form,
        }),
        anchor: encounter.anchor ?? null,
        evidence: freeze({ schema: PRIOR_RECOGNIZER_EVIDENCE, form: hit.form, referent: entry.referent, start: hit.start, end: hit.end, quote: hit.quote }),
        graphEntries: freeze([freeze({
          schema: PRIOR_RECOGNIZED_REFERENT,
          id: referentId,
          referent: entry.referent,
          form: hit.form,
          standing: entry.standing ?? null,
          terrain: entry.terrain ?? null,
          basis: entry.basis ?? null,
          at: encounter.at ?? null,
        })]),
        hyperedges: [],
        perceiver: "received_prior:recognizer",
        nominationCause: freeze(["received_prior", "recognized_surface"]),
        prior: freeze({ schema: prior.schema, giver: prior.giver ?? null, provenance: prior.provenance ?? null }),
      }));
    }
  }
  return out;
}