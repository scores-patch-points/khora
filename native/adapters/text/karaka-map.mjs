// karaka-map.mjs — the KARAKA MAP: UD case tags + deprels -> Panini's six semantic roles.
// This is the upstream of Thrax's 8 parts of speech. Thrax's categories are Pattern-language
// surface forms; the kārakas are the semantic roles that ALL languages instantiate. The map is
// a DECLARED translation (like THRAX_MAP), with a named giver (Panini, Aṣṭādhyāyī, ~5th century BCE).
//
// The six kārakas:
//   kartṛ (कर्तृ) — agent/doer → nominative, nsubj
//   karman (कर्मन्) — patient/object → accusative, obj
//   karaṇa (करण) — instrument → instrumental, obl:instr
//   sampradāna (सम्प्रदान) — recipient → dative, iobj
//   apādāna (अपादान) — source/origin → ablative, obl:from
//   adhikaraṇa (अधिकरण) — locus/location → locative, obl:loc
//
// Genitive (ṣaṣṭhī) and vocative (sambodhana) are NOT kārakas — they are relations, not roles.
//
// THE MAP IS DECLARED, NOT MEASURED. It is a translation between two schemes (UD and Panini),
// not a fact inherited from either. A kāraka is a semantic role; a UD tag is a surface form.
// The mapping is a hypothesis, falsifiable by a language where the mapping fails.
//
// For Pattern languages (Sanskrit, Greek): kārakas are carried by case endings (vibhakti).
// For Figure languages (English): kārakas are carried by word order + function words.
// For Ground languages (Mandarin): kārakas are carried by particles + word order.
//
// The surface signal differs; the kāraka is the same. This is the "one river" principle:
// all tributaries carry the same kārakas to the same EOT marks.

export const KARAKA_MAP = Object.freeze({
  // UD deprel -> kāraka (the relation carries the role)
  "nsubj": "kartṛ",
  "nsubj:pass": "kartṛ",  // passive agent (still kartṛ, marked passive)
  "obj": "karman",
  "iobj": "sampradāna",
  "obl": "adhikaraṇa",     // default: locative (the most common oblique role)
  "obl:agent": "kartṛ",    // passive agent
  "obl:patient": "karman", // passive patient
  "obl:instr": "karaṇa",   // instrumental
  "obl:from": "apādāna",  // source/origin
  "obl:loc": "adhikaraṇa", // location
  "obl:tmod": "adhikaraṇa", // temporal (a kind of locus)
  "nmod": "adhikaraṇa",    // nominal modifier (often locative/genitive)
  "nmod:poss": "genitive", // possessive (NOT a kāraka — a relation)
  "appos": "adhikaraṇa",   // apposition (same entity, different description)
  "vocative": "vocative",  // NOT a kāraka (sambodhana)
  "root": null,            // the verb itself; no kāraka
  "aux": null,             // auxiliary; no kāraka
  "det": null,             // determiner; no kāraka
  "case": null,            // case marker; no kāraka
  "cc": null,              // conjunction; no kāraka
  "conj": null,            // coordinated; inherits from head
  "punct": null,           // punctuation; no kāraka
});

// UD Case feat -> kāraka (for Pattern languages where case endings carry roles)
export const CASE_KARAKA = Object.freeze({
  "Nom": "kartṛ",
  "Acc": "karman",
  "Ins": "karaṇa",
  "Dat": "sampradāna",
  "Abl": "apādāna",
  "Loc": "adhikaraṇa",
  "Gen": "genitive",   // NOT a kāraka
  "Voc": "vocative",   // NOT a kāraka
});

export const KARAKA_GIVER = "Panini, Aṣṭādhyāyī, ~5th century BCE (kāraka theory: semantic roles carried by surface forms; the NINE are kartṛ, karman, karaṇa, sampradāna, apādāna, adhikaraṇa, kāla, hetu, prayojana; the core six are present in all languages with clear surface signals; the extended three (kāla, hetu, prayojana) are there too but only surface as deprel subtypes in Pattern languages; genitive and vocative are relations, not roles)";

/** Given a UD row (form, upos, feats, deprel, head), return the kāraka it carries, or null. */
export function karakaOf(row) {
  // Genitive and vocative are NOT kārakas (relations, not roles). Check case first.
  const caseVal = attr(row.feats, "Case");
  if (caseVal === "Gen" || caseVal === "Voc") return null;
  // For Pattern languages: case ending carries the kāraka
  const c = CASE_KARAKA[caseVal];
  if (c && c !== "genitive" && c !== "vocative") return c;
  // For Figure/Ground languages: deprel carries the kāraka
  const k = KARAKA_MAP[row.deprel?.split(":")[0]];
  if (k && k !== "genitive" && k !== "vocative") return k;
  return null;
}

/** The kāraka a particle carries (for Ground languages where particles mark roles). */
const GROUND_PARTICLE_KARAKA = Object.freeze({
  "把": "karman",     // 把 marks the patient (accusative)
  "被": "karman",     // 被 marks the passive patient
  "給": "sampradāna", // 給 marks the recipient (dative)
  "向": "sampradāna", // 向 marks the recipient
  "從": "apādāna",    // 從 marks the source (ablative)
  "在": "adhikaraṇa", // 在 marks the locus (locative)
  "於": "adhikaraṇa", // 於 marks the locus
  "用": "karaṇa",     // 用 marks the instrument
  "以": "karaṇa",     // 以 marks the instrument
  "的": "genitive",    // 的 marks genitive (NOT a kāraka — a relation)
});
export function particleKaraka(form, lang = "zh") {
  return GROUND_PARTICLE_KARAKA[String(form ?? "").trim()] ?? null;
}

const attr = (feats, key) => { if (!feats || feats === "_") return "_"; const p = feats.split("|").find((x) => x.startsWith(key + "=")); return p ? p.slice(key.length + 1) : "_"; };
