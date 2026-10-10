// scripts/lib/surface-words.mjs — the surface words of a parsed UD sentence.
//
// A surface word is what a reader sees between spaces: a multi-word token (UD range line
// "del" = de + el) or a run of glued word tokens ("l'" + "homme", "do" + "n't") is ONE surface
// word whose components are known from the treebank. The contraction builder derives the ear's
// affix rules from these, and the beings ladder scores the ear against them — one definition.
// Input: eval/competence/lib.mjs parseConllu sentences ({tokens, ranges}).
const WORDISH = /^[\p{L}\p{M}\p{N}'’]+$/u;
const SUBSTANCE = /[\p{L}\p{M}\p{N}]/u; // a quote mark is made of apostrophes and is not a word to glue to
const straight = (w) => w.replace(/’/g, "'");

/**
 * [{surface, comps, classes, fused?}] lowercase, apostrophes straight; only words made wholly of letters, marks, digits and apostrophes,
 * with at least one letter or digit in every piece. A multi-word token written against the next word ("dell'" + "italia": di l' italia)
 * is one surface word whose `fused` field names the multi-word-token part: {surface:"dell'", comps:["di","l'"]}.
 */
export function surfaceWords(s) {
  const out = [];
  const rangeAt = new Map((s.ranges ?? []).map((r) => [r.from, r]));
  const toks = s.tokens;
  const glueable = (t) => WORDISH.test(t.form) && SUBSTANCE.test(t.form);
  for (let i = 0; i < toks.length;) {
    const r = rangeAt.get(toks[i].id);
    let comps = [], classes = [], j = i, fused = null, surface = null, spaceAfter;
    if (r) {
      while (j < toks.length && toks[j].id <= r.to) { comps.push(straight(toks[j].form.toLowerCase())); classes.push(toks[j].upos); j++; }
      surface = straight(String(r.form).toLowerCase()); spaceAfter = r.spaceAfter;
      fused = { surface, comps: comps.slice() };
      j -= 1; // j = the last token of the range
    } else {
      comps = [straight(toks[i].form.toLowerCase())]; classes = [toks[i].upos]; spaceAfter = toks[i].spaceAfter;
    }
    // glue the following word tokens that are written against this one
    let glued = false;
    while (!spaceAfter && j + 1 < toks.length && !rangeAt.has(toks[j + 1].id) && (r || glued ? true : glueable(toks[j])) && glueable(toks[j + 1]) && (r ? true : glueable(toks[i]))) {
      j++; comps.push(straight(toks[j].form.toLowerCase())); classes.push(toks[j].upos); spaceAfter = toks[j].spaceAfter; glued = true;
    }
    const written = r ? (glued ? surface + comps.slice(fused.comps.length).join("") : surface) : comps.join("");
    out.push({ surface: written, comps, classes, ...(r && glued ? { fused } : {}), ...(r && !glued ? { range: true } : {}) });
    i = j + 1;
  }
  return out.filter((w) => WORDISH.test(w.surface) && SUBSTANCE.test(w.surface) && w.comps.every((c) => WORDISH.test(c) && SUBSTANCE.test(c)));
}
