// adapters/text/classical-chinese-reader.mjs — the Ground-tributary reader for Classical Chinese.
//
// Classical Chinese (文言文) has no inflection, no morphology, no case endings, no spaces between words.
// Its grammar is carried by a small closed set of particles (虚词) that attach to bare units (实词).
// This reader produces EOT marks (referents in kārakas) from particles + word order, not from a
// dependency parser. The kārakas (Panini's six semantic roles) are the upstream; the particles and
// word order are the surface signal.
//
// THE PIPELINE:
//   1. Break text into sentences (by 。；，/)
//   2. Break each sentence into words (character-level segmenter, trained on UD Chinese GSD)
//   3. Identify particles and their kārakas (surface form match)
//   4. Assign kārakas to content words by position (SVO order: subject=before verb, object=after verb)
//   5. Produce EOT marks: { referent: word, role: kāraka }
//
// THE KĀRAKAS (Panini's six semantic roles):
//   kartṛ (agent) — subject position (before the verb)
//   karman (patient) — object position (after the verb)
//   karaṇa (instrument) — 以 (by, with, using)
//   sampradāna (recipient) — 于/于 (to, for)
//   apādāna (source) — 于 (from)
//   adhikaraṇa (locus) — 于 (in, at)
//
// GENITIVE (NOT a kāraka): 之, 其 (possessive/attributive)
// NOMINALIZER (NOT a kāraka): 者, 所 (the one who, that which)
//
// This is a DECLARED reader, not a measured one. The segmenter is trained (93.7% boundary accuracy
// on Modern Chinese). The particle recognizer is declared. The kāraka mapper is declared (Panini).
// Nothing here is tuned on the Tao Te Ching — it is a first pass, and the result is a measurement.
import { tokenizeUnspaced } from "./ud-tokenizer.js";
import { isParticle, particleKaraka } from "./classical-chinese-particles.js";

export const CLASSICAL_CHINESE_READER_SCHEMA = "ClassicalChineseReader@1";

/** The Classical Chinese particles that carry kārakas (from classical-chinese-particles.js). */
const PARTICLE_KARAKA = {
  "以": "karaṇa",     // instrumental: by, with, using
  "于": "adhikaraṇa", // locative: in, at
  "於": "adhikaraṇa", // locative variant
  "之": "genitive",    // possessive/attributive (NOT a kāraka)
  "其": "genitive",    // possessive pronoun (NOT a kāraka)
  "所": "nominalizer", // that which is
  "者": "nominalizer", // the one who
  "把": "karman",      // accusative (later Chinese)
  "被": "karman",      // passive patient
  "向": "sampradāna",  // recipient
  "從": "apādāna",     // source
  "用": "karaṇa",      // instrument
};

/** Read a Classical Chinese text into EOT marks (referents in kārakas). */
export function readClassicalChinese(text, { segmenter = null } = {}) {
  const str = String(text ?? "").trim();
  if (!str) return { schema: CLASSICAL_CHINESE_READER_SCHEMA, sentences: [], marks: [], gaps: [{ gap: "empty_text" }] };

  // 1. Split into sentences (by 。；，/)
  const rawSentences = str.split(/[。；，\/\n]+/).filter((s) => s.trim().length > 1);

  const sentences = [];
  const marks = []; // EOT marks: { referent, role, sentence }
  const gaps = [];

  for (const [si, raw] of rawSentences.entries()) {
    const s = raw.trim();
    if (!s) continue;

    // 2. Break into words
    let tokens;
    if (segmenter) {
      tokens = tokenizeUnspaced(s, segmenter);
    } else {
      // No segmenter: character-level (each character is a token)
      tokens = [...s];
    }

    // 3. Identify particles and their kārakas
    const particleRoles = tokens.map((t) => ({ token: t, karaka: PARTICLE_KARAKA[t] ?? null, isParticle: isParticle(t) }));

    // 4. Assign kārakas to content words by position
    // Find the verb (the content word that is not a particle and not a particle marker)
    const contentWords = tokens.filter((t) => !isParticle(t));
    const particles = tokens.filter(isParticle);

    // Simple SVO assignment: first content word = kartṛ, last = karman, middle = adhikaraṇa
    // Particles override: 以 = karaṇa, 于/於 = adhikaraṇa, 把/被 = karman
    const roles = new Array(tokens.length).fill(null);
    for (let i = 0; i < tokens.length; i++) {
      if (PARTICLE_KARAKA[tokens[i]]) {
        roles[i] = PARTICLE_KARAKA[tokens[i]];
      }
    }
    // For content words without a particle, assign by position
    const contentIndices = tokens.map((t, i) => isParticle(t) ? null : i).filter((i) => i !== null);
    if (contentIndices.length >= 1) roles[contentIndices[0]] = roles[contentIndices[0]] ?? "kartṛ";
    if (contentIndices.length >= 2) roles[contentIndices[contentIndices.length - 1]] = roles[contentIndices[contentIndices.length - 1]] ?? "karman";
    if (contentIndices.length >= 3) for (let i = 1; i < contentIndices.length - 1; i++) roles[contentIndices[i]] = roles[contentIndices[i]] ?? "adhikaraṇa";

    sentences.push({ text: s, order: si, tokens, roles });

    // 5. Produce EOT marks
    for (let i = 0; i < tokens.length; i++) {
      if (roles[i] && roles[i] !== "genitive" && roles[i] !== "nominalizer") {
        marks.push({ referent: tokens[i], role: roles[i], sentence: si, grain: "Ground" });
      }
    }
  }

  return {
    schema: CLASSICAL_CHINESE_READER_SCHEMA,
    sentences,
    marks,
    gaps: gaps.length ? gaps : [],
    particleCount: marks.filter((m) => PARTICLE_KARAKA[m.referent]).length,
    contentCount: marks.filter((m) => !PARTICLE_KARAKA[m.referent]).length,
  };
}
