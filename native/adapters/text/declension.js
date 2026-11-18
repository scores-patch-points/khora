// native/adapters/text/declension.js — does inflected surface A reach
// EXACTLY observed surface B under a productive case transform this
// language's own noun morphology licenses?
//
// CELL: CON · Structure · Figure (Link) — binding two already-extracted
// surface forms into one identity is a relate act between two specific
// things, not a scout (SIG) or an individuation (INS) of either alone.
//
// THE ONE RULE THAT MAKES THIS SAFE: this file answers a PAIRWISE
// question — "given these two SPECIFIC observed strings, does one reach
// the other" — never "what is this word's lemma." A rule applied to a
// single word in isolation can corrupt it (build-declension-prior.mjs's
// own header: a language's genitive-plural pattern can also match an
// already-nominative proper name that happens to end the same way). A
// rule applied pairwise against a second REAL observed string cannot: a
// false merge needs two unrelated real surfaces in the same document to
// coincide on the exact same transformed string, not one word's own
// identity to be silently rewritten.
//
// INJECTED, not imported: the prior (DeclensionPrior@1, built by
// build-declension-prior.mjs from a received UniMorph paradigm table,
// giver named in the prior's own provenance) arrives as data. This file
// knows nothing about any one language — Russian today, anything else a
// caller builds a prior for tomorrow.

const MIN_STEM = 2; // below this the residual stem after stripping a case ending is too short to trust as one word's own root

/**
 * createDeclensionFolder(prior, { minStem }) -> { sameStem(inflected, base) }
 *
 * `prior`   a DeclensionPrior@1 object ({ rules: [{from, to, count}, ...] })
 *           — omit or pass null and sameStem always returns false, loudly
 *           disclosed via `.gap`, never silently.
 * `minStem` the residual-stem floor (default MIN_STEM, the structural
 *           minimum below which a stripped ending leaves nothing to
 *           anchor an identity claim on).
 */
export const createDeclensionFolder = (prior, { minStem = MIN_STEM } = {}) => {
  if (!prior || !Array.isArray(prior.rules) || !prior.rules.length) {
    const sameStem = () => false;
    sameStem.gap = { reason: "no_declension_prior", tier: "model", detail: "no declension prior injected — names never fold across case, exact-token comparison only" };
    return { sameStem, gap: sameStem.gap };
  }
  const rules = prior.rules;
  // One direction only per call is enough: the consumer (namesCorefer)
  // already tries both (a, b) and (b, a), matching the shared-final-token
  // check it sits beside.
  const sameStem = (inflected, base) => {
    if (!inflected || !base || inflected === base) return false;
    for (const r of rules) {
      if (!inflected.endsWith(r.from)) continue;
      const stemLen = inflected.length - r.from.length;
      if (stemLen < minStem) continue;
      if (inflected.slice(0, stemLen) + r.to === base) return true;
    }
    return false;
  };
  // MODE "co-lemma" (a prior that says so, `mode: "co-lemma"`; Greek's accent shifts between cases make one form rarely reach another directly: Χριστόν and Χριστοῦ both reach Χριστός, not each other):
  // two observed forms are one name when the forms each can reach under the rules, the form itself included, share a string. Still a pairwise question about two OBSERVED strings, never a lemma for one word alone.
  if (prior.mode === "co-lemma") {
    const reach = (x) => { const out = new Set([x]); for (const r of rules) { if (!x.endsWith(r.from)) continue; const stemLen = x.length - r.from.length; if (stemLen < minStem) continue; out.add(x.slice(0, stemLen) + r.to); } return out; };
    const direct = sameStem;
    const co = (a, b) => { if (!a || !b || a === b) return false; if (direct(a, b)) return true; const ra = reach(a), rb = reach(b); for (const c of ra) if (c !== a && rb.has(c)) return true; return false; };
    co.gap = null;
    return { sameStem: co, gap: null };
  }
  sameStem.gap = null;
  return { sameStem, gap: null };
};

/**
 * createRunBreak(prior) -> (prevToken, nextToken) => boolean | null
 *
 * In a case-marked language two capitalised words side by side are not always one name: "τῷ Ἰησοῦ Σίμων Πέτρος" is Jesus (dative) then Simon Peter (nominative), and read as one run it makes a being nobody is.
 * The prior's `nameCases` (measured from a treebank's proper nouns: form -> the cases it takes, a case counted when it is at least half the form's most frequent case, so a form's own spread decides) answers
 * pairwise: the run breaks between two tokens whose case sets are both known and share no case. A form the treebank never saw as a name breaks nothing. No `nameCases`, no function (null) and a run is as it always was.
 */
export const createRunBreak = (prior) => {
  const table = prior?.nameCases;
  if (!table || typeof table !== "object") return null;
  const key = (t) => String(t).normalize("NFC").toLowerCase();
  return (a, b) => {
    const x = table[key(a)], y = table[key(b)];
    if (!x || !y) return false;
    return !x.some((c) => y.includes(c));
  };
};
