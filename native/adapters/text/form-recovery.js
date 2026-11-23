// form-recovery.js — the orthographic fallback for a form the priors do not know.
//
// A form classifyWord cannot place is recovered by TWO static arithmetic codecs, no learned
// parameters, no model, no embedding:
//
//   1. TYPO — Damerau-Levenshtein distance over the prior's vocabulary. A typo is a single slip:
//      the recovered form is CLAIMED only at edit distance 1 (a transposition counts as the one
//      slip it is) AND when that form is unique (no other form within distance 1). Distance 2 or a
//      tie abstains.
//
//   2. JUMBLE (Typoglycaemia) — a word whose first and last letters are right and whose INTERIOR is
//      a permutation of the same letters ("porbelm" for problem, "aoccdrnig" for according). The
//      codec is the interior multiset with fixed endpoints: same first letter, same last letter,
//      same letter-counts inside. It is EXACT — no distance to tune — and it recovers even the
//      "hard" distant-swaps a human struggles with, because a computer is not limited by processing
//      difficulty. Claimed only when exactly ONE known word shares the (first, last, interior)
//      signature: an anagram pair ("calm"/"clam") matches two words and abstains.
//
// WHY THIS, NOT THE EMBEDDING (the recorded falsification, 2026-11-23): a bare word embedded with
// nomic-embed-text degenerates into its subword fragments, so a typo's nearest neighbour is some
// unrelated rare form sharing a fragment (recieve -> cvts, ivpugned -> iv), 6.5% recovery against
// 95.5% for plain Levenshtein on 400 held-out synthetic typos, and a 9.5% false-claim rate the
// guard could not stop. Character-level edit distance — and, for jumbles, character MULTISET
// identity — is the correct grain for orthographic recovery; the embedding's only surviving claim
// is SEMANTIC equivalence at sentence level, a separate giver, not this one.
import { THRAX_MAP } from "../../legacy-ported/packages/engine/perceiver/text/wordclass.js";

export const RECOVERY_SCHEMA = "FormRecovery@1";

export function damerauLevenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n; if (n === 0) return m;
  const d = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

/** the interior-permutation signature: first letter, last letter, and the sorted interior. Two words
 *  share a key iff one is the other with its middle reordered and its endpoints held. Length < 4 has
 *  no jumbleable interior. */
export const jumbleKey = (w) => {
  if (w.length < 4) return null;
  return w[0] + "|" + w[w.length - 1] + "|" + [...w.slice(1, -1)].sort().join("");
};

/**
 * makeFormRecovery({ forms }) -> { recover, recoverJumble, recoverClaim }
 *  `forms` is the prior's own map (form -> { UPOS: count }), exactly posPrior.forms. The typo path
 *  length-buckets so an unknown form is only compared within +-2 characters; the jumble path is an
 *  O(1) lookup into a signature index.
 */
export function makeFormRecovery({ forms } = {}) {
  if (!forms || typeof forms !== "object" || Array.isArray(forms)) throw new TypeError("makeFormRecovery: the prior's forms map is required");
  const byLength = new Map();
  const byJumble = new Map();
  for (const w of Object.keys(forms)) {
    const n = w.length; if (!byLength.has(n)) byLength.set(n, []); byLength.get(n).push(w);
    const k = jumbleKey(w); if (k) { if (!byJumble.has(k)) byJumble.set(k, []); byJumble.get(k).push(w); }
  }
  const near = (n) => { const out = []; for (let l = Math.max(1, n - 2); l <= n + 2; l++) if (byLength.has(l)) out.push(...byLength.get(l)); return out; };

  const recover = (surface) => {
    const s = String(surface ?? "").toLowerCase();
    if (!s) return { surface: s, found: false, recovered: false, nearest: null, distance: null, margin: null, candidates: [] };
    if (forms[s]) return { surface: s, found: true, recovered: false, nearest: s, distance: 0, margin: null, candidates: forms[s] };
    let best = null, bd = Infinity, second = Infinity;
    for (const w of near(s.length)) {
      const d = damerauLevenshtein(s, w);
      if (d < bd) { second = bd; bd = d; best = w; } else if (d < second) second = d;
    }
    return { surface: s, found: false, recovered: true, nearest: best, distance: bd, margin: second - bd, candidates: forms[best] };
  };

  const recoverJumble = (surface) => {
    const s = String(surface ?? "").toLowerCase();
    if (!s) return { surface: s, found: false, jumbled: false, nearest: null, matches: [], candidates: [] };
    if (forms[s]) return { surface: s, found: true, jumbled: false, nearest: s, matches: [s], candidates: forms[s] };
    const k = jumbleKey(s);
    const matches = k ? (byJumble.get(k) ?? []) : [];
    return { surface: s, found: false, jumbled: matches.length > 0, nearest: matches[0] ?? null, matches, candidates: forms[matches[0]] };
  };

  /** nearForms(surface, maxDist) -> every known form within maxDist Damerau-Levenshtein edits, the
   *  candidate SET (not a single nearest) for the prediction layer. */
  const nearForms = (surface, maxDist = 1) => {
    const s = String(surface ?? "").toLowerCase();
    if (!s) return [];
    if (forms[s]) return [s];
    const out = [];
    for (const w of near(s.length)) if (damerauLevenshtein(s, w) <= maxDist) out.push(w);
    return out;
  };

  return {
    recover,
    recoverJumble,
    nearForms,
    /** recoverClaim(surface) -> one claimed best-guess, with the method that made it.
     *  Precedence: known form > jumble > typo. JUMBLE IS DECISIVE: if the surface is a permutation
     *  of some word's interior (first and last held), it is a jumble — a unique match claims, a
     *  match against two words (an anagram pair) abstains, and the typo path never breaks that tie
     *  (edit distance is not allowed to "rescue" an ambiguous jumble toward whichever word happens
     *  to sit one edit away). Only when nothing jumbles does the typo path (distance 1, unique) fire. */
    recoverClaim(surface) {
      const s = String(surface ?? "").toLowerCase();
      if (!s) return { surface: s, found: false, claimed: false, method: null, nearest: null, reason: "empty", candidates: [] };
      if (forms[s]) return { surface: s, found: true, claimed: true, method: "known", nearest: s, reason: null, candidates: forms[s] };
      const j = recoverJumble(s);
      if (j.jumbled) {
        if (j.matches.length === 1) return { surface: s, found: false, claimed: true, method: "jumble", nearest: j.nearest, reason: null, candidates: j.candidates };
        return { surface: s, found: false, claimed: false, method: "jumble", nearest: null, reason: "ambiguous-jumble", candidates: [] };
      }
      const r = recover(s);
      if (r.distance === 1 && r.margin > 0) return { surface: s, found: false, claimed: true, method: "typo", nearest: r.nearest, distance: 1, reason: null, candidates: r.candidates };
      const reason = r.distance === 1 ? "ambiguous-typo" : "too-far";
      return { surface: s, found: false, claimed: false, method: null, nearest: null, reason, candidates: [] };
    },
  };
}

/** candidates -> [{ upos, count, share, thraxClass }], the same shape classifyWord's consumers expect. */
export function candidatesOf(counts) {
  if (!counts) return [];
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([upos, count]) => ({ upos, count, share: total > 0 ? count / total : 0, thraxClass: THRAX_MAP[upos] ?? null }))
    .sort((a, b) => b.count - a.count);
}
