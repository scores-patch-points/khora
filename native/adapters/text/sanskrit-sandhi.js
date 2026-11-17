// sanskrit-sandhi.js — what running Sanskrit does to the word-final of forms a treebank gives UNSANDHIED, and what a nominal's case endings let a reader fold.
//
//   finalVariants(form)               the surface variants a form takes at a word boundary (final external sandhi, one table, declared)
//   withSandhiVariants(posPrior)      a POSPrior@1 with every unattested variant of an attested form added, carrying that form's counts (an attested form is never overwritten)
//   foldCaseForms(rows, endings, ...) group heard rows whose surfaces are one stem under two case endings
//
// WHY. UD_Sanskrit-Vedic (the only large Sanskrit treebank, and the source of pos-san.json) is padapatha-like: column 2 equals the Unsandhied field on all 161,959 train tokens. Running text is sandhied:
// in the GRETIL Panchatantra (56,166 words) so (160) outnumbers sah (7), tam ~ tam (96) is outnumbered by tam with anusvara (179), tat (417) by tad (614). A prior built from unsandhied forms
// therefore calls every one of these an UNSEEN word. The table below is the standard external-sandhi alternation of the final sound, declared per language like UNSPACED_STEMS; it is a spelling
// closure, not a word list: it adds nothing the treebank did not attest in another spelling, and it never overrides an attested form. Sandhi that FUSES two words (tasyaiva = tasya + eva, saisa) is NOT closed here: and what the finder can and cannot see of those is measured, not repaired (identity/pronouns-multilingual/san/).
// Declared, not tuned. Status: EXPERIMENTAL.
const NFC = (s) => String(s ?? "").normalize("NFC");

/** Final-sound variants of an IAST (lowercase, NFC) form, excluding the form itself. */
export function finalVariants(form) {
  const f = NFC(form).toLowerCase(), out = new Set();
  if (!f) return [];
  if (f.endsWith("m")) out.add(f.slice(0, -1) + "ṃ");
  if (f.endsWith("ṃ")) out.add(f.slice(0, -1) + "m");
  if (f.endsWith("aḥ")) for (const e of ["o", "a", "as", "aś", "aṣ", "ar"]) out.add(f.slice(0, -2) + e);
  else if (f.endsWith("āḥ")) for (const e of ["ā", "ās", "āś", "āṣ", "ār"]) out.add(f.slice(0, -2) + e);
  else if (/[iīuūṛṝeoai]ḥ$/.test(f)) for (const e of ["r", "s", "ś", "ṣ"]) out.add(f.slice(0, -1) + e);
  // a final dental stop assimilates to what follows (tad before a voiced sound, tac before c, taj before j, tal before l, tan before n)
  if (/[td]$/.test(f)) for (const e of ["t", "d", "c", "j", "l", "n"]) out.add(f.slice(0, -1) + e);
  // a final vowel glides before a vowel: api to apy, iti to ity, vadhu to vadhv, kartṛ to kartr
  if (/[iī]$/.test(f)) out.add(f.slice(0, -1) + "y");
  if (/[uū]$/.test(f)) out.add(f.slice(0, -1) + "v");
  if (/ṛ$/.test(f)) out.add(f.slice(0, -1) + "r");
  out.delete(f);
  return [...out];
}

const closed = new WeakMap();
/** A POSPrior@1 whose `forms` also hold, for each attested form, its unattested final-sound variants (same counts). Memoised per prior object. */
export function withSandhiVariants(posPrior) {
  if (!posPrior?.forms) return posPrior;
  if (closed.has(posPrior)) return closed.get(posPrior);
  const forms = { ...posPrior.forms }; let added = 0;
  for (const [f, c] of Object.entries(posPrior.forms)) for (const v of finalVariants(f)) if (!(v in forms)) { forms[v] = c; added++; }
  const out = { ...posPrior, forms, sandhiVariantsAdded: added };
  closed.set(posPrior, out); return out;
}

/**
 * foldCaseForms(rows, endings, { minStem, maxEnding }) -> { groups: Map(rowIndex -> groupIndex), n }
 * Two heard rows are one being when their surfaces are the same STEM under two case endings from `endings` (the set of endings the language's treebank attests on nominals,
 * closed under finalVariants). The check is PAIRWISE (the pair of observed strings), never "the lemma of one word": a false merge needs two unrelated observed words with the
 * same >= minStem stem and two attested endings. Union-find over rows sharing a stem; a bare stem (empty ending) counts as an ending.
 */
export function foldCaseForms(rows, endings, { minStem = 4, maxEnding = 4 } = {}) {
  const E = endings instanceof Set ? endings : new Set(endings ?? []);
  const surf = rows.map((r) => NFC(r.surface).toLowerCase());
  const parent = rows.map((_, i) => i); const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const byStem = new Map();
  surf.forEach((s, i) => { for (let k = Math.max(minStem, s.length - maxEnding); k <= s.length; k++) { const stem = s.slice(0, k), end = s.slice(k); if (end === "" || E.has(end)) { const l = byStem.get(stem) ?? []; l.push(i); byStem.set(stem, l); } } });
  for (const [, l] of byStem) for (let j = 1; j < l.length; j++) { const a = find(l[0]), b = find(l[j]); if (a !== b) parent[b] = a; }
  const groups = new Map(); rows.forEach((_, i) => groups.set(i, find(i)));
  return { groups, n: new Set(groups.values()).size };
}
