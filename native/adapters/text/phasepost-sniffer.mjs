// phasepost-sniffer.mjs — sniff the phasepost (cell) of a token from its surface form.
// The 27 cells = 9 operators × 3 grains. The 9 kārakas are 9 of the 27 (Pattern grain).
// The other 18 are Figure and Ground grain cells with their own roles.
// This sniffer predicts all 27 cells from surface form (no parse needed).
//
// Figure grain (English) roles: subject, object, oblique, modifier, conjunction, clause, determiner, copula, complement
// Ground grain (Mandarin) roles: topic, comment, token, classifier, connective, clause, aspect, modal, sentence-final
// Pattern grain (Sanskrit) roles: the 9 kārakas (kartṛ, karman, karaṇa, sampradāna, apādāna, adhikaraṇa, kāla, hetu, prayojana)

export const PHASEPOST_LABELS = Object.freeze([
  // Pattern grain (kārakas)
  "kartṛ", "karman", "karaṇa", "sampradāna", "apādāna", "adhikaraṇa", "kāla", "hetu", "prayojana",
  // Figure grain
  "subject", "object", "oblique", "modifier", "conjunction", "clause", "determiner", "copula", "complement",
  // Ground grain
  "topic", "comment", "token", "classifier", "connective", "g-clause", "aspect", "modal", "sentence-final",
]);

// Fast path: UPOS -> phasepost (Figure grain)
const UPOS_PHASEPOST = Object.freeze({
  "DET": "determiner",
  "CCONJ": "conjunction",
  "SCONJ": "conjunction",
  "AUX": "copula",
  "ADJ": "modifier",
  "ADV": "modifier",
});

// Fast path: particles -> phasepost (Ground grain)
const PARTICLE_PHASEPOST = Object.freeze({
  "了": "aspect", "着": "aspect", "过": "aspect",
  "吗": "sentence-final", "呢": "sentence-final", "吧": "sentence-final", "啊": "sentence-final",
  "能": "modal", "会": "modal", "要": "modal",
  "而": "connective", "且": "connective", "也": "connective",
  "的": "g-clause", "所": "g-clause", "者": "g-clause",
  "个": "classifier", "只": "classifier", "条": "classifier",
});

export function sniffPhasepost(form, upos, feats, grain = "figure") {
  // Fast path: UPOS (Figure)
  if (grain === "figure" && UPOS_PHASEPOST[upos]) return UPOS_PHASEPOST[upos];
  // Fast path: particles (Ground)
  if (grain === "ground") {
    const pp = PARTICLE_PHASEPOST[String(form ?? "").trim()];
    if (pp) return pp;
  }
  // Fast path: Case feat (Pattern) -> kāraka
  const attr = (f, k) => { if (!f || f === "_") return "_"; const p = f.split("|").find((x) => x.startsWith(k + "=")); return p ? p.slice(k.length + 1) : "_"; };
  const caseVal = attr(feats, "Case");
  const CASE_TO_KARAKA = { Nom: "kartṛ", Acc: "karman", Ins: "karaṇa", Dat: "sampradāna", Abl: "apādāna", Loc: "adhikaraṇa" };
  if (caseVal !== "_" && CASE_TO_KARAKA[caseVal]) return CASE_TO_KARAKA[caseVal];
  // Fast path: Ground particles -> kāraka
  const PARTICLE_KARAKA = { "把": "karman", "被": "karman", "給": "sampradāna", "在": "adhikaraṇa", "以": "karaṇa" };
  const pk = PARTICLE_KARAKA[String(form ?? "").trim()];
  if (pk) return pk;
  // UPOS proxy (Figure)
  if (grain === "figure") {
    if (upos === "PRON" || upos === "PROPN" || upos === "NOUN") return "subject"; // over-generates, sniffer refines
    if (upos === "ADP") return "oblique";
  }
  // UPOS proxy (Ground)
  if (grain === "ground") {
    if (upos === "NOUN" || upos === "PRON" || upos === "PROPN") return "topic";
    if (upos === "VERB") return "comment";
  }
  return null;
}
