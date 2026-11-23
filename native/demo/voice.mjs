// demo/voice.mjs — the mouth: turn an answer into a sentence. The read was surface -> fold; this is
// fold -> surface, the same codec facing the other way. Definitional answers become "A dog is a
// mammal of the family Canidae."; a matched relation becomes "Jonathan gave the book to Mina." from
// the read's own surface forms (the parser's surfaces and markers, not invented words).
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const trim = (s) => String(s ?? "").replace(/[:;,]\s*$/, "").replace(/\s+/g, " ").trim();

export function voiceDefinition(word, primary) {
  const g = trim(primary);
  const article = /^[aeiou]/i.test(String(word)) ? "An" : "A";
  if (!g) return `${cap(word)} is not defined on record.`;
  const mid = g[0].toLowerCase() + g.slice(1); // "A mammal..." -> "a mammal..." once it sits after "is"
  return `${article} ${word} is ${mid.endsWith(".") ? mid : mid + "."}`;
}

const ROLE_ORDER = ["kartṛ", "predicate", "karman", "karaṇa", "sampradāna", "apādāna", "adhikaraṇa", "kāla", "hetu", "prayojana"];

/** voiceRelation(surface) -> the relation spoken from its surface forms, in kāraka order. */
export function voiceRelation(surface) {
  const parts = [];
  for (const k of ROLE_ORDER) if (surface?.[k]) parts.push(trim(surface[k]));
  if (!parts.length) return null;
  return cap(parts.join(" ")) + ".";
}

/** voiceSummary(triples) -> the whole fold spoken, one relation after another. "What is this about?" */
export function voiceSummary(triples) {
  const parts = (triples ?? []).map((t) => voiceRelation(t.surface)).filter(Boolean);
  if (!parts.length) return "Nothing has been read into the fold yet.";
  return "It is about: " + parts.join(" ");
}

/** voiceIdentity(name, relations) -> who a cast member is, from their place in the fold, not the
 *  dictionary. "who is Mina" -> "Mina is in the fold: Mina lives in the village. ..." */
export function voiceIdentity(name, relations) {
  const parts = (relations ?? []).map(voiceRelation).filter(Boolean);
  if (!parts.length) return `${cap(name)} is a name the fold holds, with no relations read yet.`;
  return `${cap(name)} is in the fold: ` + parts.join(" ");
}
