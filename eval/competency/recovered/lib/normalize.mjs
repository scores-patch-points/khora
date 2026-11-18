// scripts/lib/normalize.mjs — the omni-lingual invariant.
//
// Lesson (Chomsky): the surface FORM is a parameter; the CLASS is the invariant.
// Every phonetic script carries accents/marks a reader must fold before it can
// recognise a form it HAS seen — and the same fold, applied to both the text and
// the prior, recovers matches exact-string matching loses. Measured across
// languages: Greek +5, Sanskrit/IAST +12, Spanish +3, Persian 0. One mechanism,
// every language — the definition of an omni-lingual fix.
//
// foldToken  — NFD, strip combining marks, lowercase (universal).
// foldSet    — the folded form-vocabulary of a POS prior (apply once, reuse).
// Also restores word-final elision the apostrophe cut (βαῖν' → βαιν), the same
// seam reader.mjs applies by hand for Greek: a universal, not a Greek quirk.

export function foldToken(s) {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC").toLowerCase();
}

// elision restore: a token ending in an apostrophe (straight, curly, or ʼ) with
// its final vowel cut — return the token without the apostrophe so an ending-table
// vote can still fire. Language-neutral; the table decides, this only un-cuts.
export function unElide(w) {
  return String(w ?? "").replace(/['\u2019\u02bc]$/, "");
}

export function foldSet(prior) {
  const forms = prior?.forms ?? {};
  const set = new Set();
  for (const k of Object.keys(forms)) set.add(foldToken(k));
  return set;
}

// folded coverage: the share of a sample's tokens whose folded form the prior
// lists — the honest omni-lingual number (what the reader could recognise once
// accents stop lying).
export function foldedCoverage(tokens, folded) {
  let hit = 0, n = 0;
  for (const t of tokens) {
    const f = foldToken(t.form ?? t);
    n += 1;
    if (folded.has(f) || folded.has(foldToken(unElide(t.form ?? t)))) hit += 1;
  }
  return { coverage: n ? hit / n : 0, hit, total: n };
}
