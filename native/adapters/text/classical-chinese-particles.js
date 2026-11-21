// adapters/text/classical-chinese-particles.js — the particles of Classical Chinese, the Ground-language grammar.
// Classical Chinese (文言文) has no inflection, no morphology, no case endings. Its grammar is carried by a small
// closed set of particles (虚词) that attach to bare units (实词). These are the Ground tributary's kāraka
// carriers: the particles that mark grammatical relations the way case endings do in Pattern languages.
//
// THE PARTICLES (declared, not tuned — from the standard Classical Chinese grammars):
//   而 (ér) — and, but, then, and so (connective, adverbial)
//   以 (yǐ) — by, with, using, in order to, because (instrumental, causal, purposive)
//   于 (yú) — in, at, to, from, by (locative, directional, passive)
//   且 (qiě) — moreover, and, also (connective)
//   也 (yě) — assertion, topic marker (declarative)
//   矣 (yǐ) — completion, already (perfective)
//   乎 (hū) — interrogative, particle (question, exclamatory)
//   哉 (zāi) — exclamation (exclamatory)
//   焉 (yān) — there, in it, how, where (locative, interrogative)
//   之 (zhī) — possessive, attributive (genitive)
//   者 (zhě) — nominalizer (the one who, that which)
//   所 (suǒ) — nominalizer (that which is, the place where)
//   其 (qí) — possessive pronoun (his, her, its, their)
//   也 (yě) — topic marker
//   矣 (yǐ) — completion
//   乎 (hū) — particle
//   哉 (zāi) — exclamation
//
// KĀRAKA MAPPING (Panini's semantic roles, carried by particles + word order):
//   kartṛ (agent)      — subject position (before the verb), or 其 (possessive) + noun
//   karman (patient)   — object position (after the verb), or 把 (accusative marker, in later Chinese)
//   karaṇa (instrument) — 以 (by, with, using)
//   sampradāna (recipient) — 于 (to, for)
//   apādāna (source)   — 于 (from)
//   adhikaraṇa (locus) — 于 (in, at)
//
// This is a DECLARED mapping, not measured. It is the Ground tributary's kāraka layer.
// The particles are the Ground grammar: bare units that carry grammatical relations.

export const CLASSICAL_CHINESE_PARTICLES = Object.freeze(new Set([
  "而", "以", "于", "且", "也", "矣", "乎", "哉", "焉", "之", "者", "所", "其",
  "於", "而", "以", "于", "且", "也", "矣", "乎", "哉", "焉", "之", "者", "所", "其",
]));

/** Is this form a Classical Chinese particle? */
export function isParticle(form) {
  const f = String(form ?? "").trim();
  return CLASSICAL_CHINESE_PARTICLES.has(f);
}

/** The kāraka a particle carries, or null if it is not a kāraka marker. */
export function particleKaraka(form) {
  const f = String(form ?? "").trim();
  const map = {
    "以": "karaṇa",    // instrumental: by, with, using
    "于": "adhikaraṇa", // locative: in, at
    "於": "adhikaraṇa", // locative variant
    "之": "genitive",    // possessive/attributive
    "其": "genitive",    // possessive pronoun
    "所": "nominalizer", // that which is
    "者": "nominalizer", // the one who
  };
  return map[f] ?? null;
}

/** The Classical Chinese word order is SVO (subject-verb-object), with the particle
 *  carrying the role. This is the Ground tributary's Figure: arrangement carries
 *  meaning when particles are absent. */
export const GROUND_KARAKA_ORDER = Object.freeze({
  subject: "before-verb",
  object: "after-verb",
  instrument: "以 before verb",
  locative: "于 after verb",
  genitive: "之 or 其 before noun",
});
