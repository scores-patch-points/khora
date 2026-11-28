// adapters/text/name-convention.js — DOES A CAPITAL MARK A NAME IN THIS TEXT? (round 31, 2026-11-28)
// identity/novels/PREREG-ROUND31-CONVENTION.md and ADDENDUM-1 (stamped before any gold run). Opt-in: read-core.mjs applies it only under
// `readerOptions.nameConvention: true`; off, the read is byte-identical.
//
// The capital tier (surfaces.js) reads by the convention `capital-marks-a-name` (janus priors/conventions-eng.json). Some texts keep another
// one: early-modern English, like German, capitalizes common nouns, and there the capital tier admits Prisoner, Evidence and Felony as beings.
// Two steps, both measured, no dial chosen here:
//   GROUND  the text's own rate of capitalized non-names, against a reference's SPREAD of per-document rates (ADDENDUM-2). Counted: every token
//           not first in its sentence (the capital tier's own whitespace tokens and its start at token 1) whose lower-case form the POS prior holds
//           with a dominant class other than PROPN. r0 is the 95th percentile of the reference's per-document rates (convention-spread-<stem>.json). The text capitalizes common nouns when the exact one-sided tail
//           P(X >= k | n, r0) < ALPHA (form-usage.js, the alpha of surfaces.js CAP_SIG_ALPHA).
//   FIGURE  only when GROUND fired: a capital surface is kept when one of its tokens supports a name (its lower-case form is not in the prior,
//           or the prior's dominant class for it is PROPN); otherwise it is refused, and the read keeps the referent as `heard`.
// Limitation (ADDENDUM-1): the prior holds 16,654 forms, so a common noun it never saw supports a name and is kept.
import { upperTail, ALPHA } from "./form-usage.js";

const isCased = (c) => c.toLowerCase() !== c.toUpperCase();
// a token's word: its letters with the punctuation at its edges set aside (a file-format trim on the token, not a reading of language)
function word(token) {
  const cs = [...String(token ?? "")];
  let a = 0, b = cs.length;
  while (a < b && !isCased(cs[a])) a++;
  while (b > a && !isCased(cs[b - 1])) b--;
  return cs.slice(a, b).join("");
}
function dominantOf(forms) {
  const memo = new Map();
  return (lower) => {
    if (memo.has(lower)) return memo.get(lower);
    const c = forms?.[lower]; let best = null, n = -1;
    if (c) for (const [tag, v] of Object.entries(c)) if (v > n) { n = v; best = tag; }
    memo.set(lower, best); return best;
  };
}
/** The received rate: the convention prior's measured share of capitalized non-names mid-sentence, or null (a typed gap at the caller). */
export function receivedRate(conventions) {
  const c = Array.isArray(conventions?.conventions) ? conventions.conventions.find((x) => x?.stem === "capital-marks-a-name") : null;
  const w = c?.witnesses?.find((x) => x?.figure === "nonNameIsCapitalMidSentence");
  const v = Number(w?.value);
  return v > 0 && v < 1 ? { r0: v, witness: { figure: w.figure, value: v, k: w.k ?? null, of: w.of ?? null, ground: w.ground ?? null, sha256: w.sha256 ?? null } } : null;
}
/** The counts of one text, the same at read time and when the reference is built: { k, n } over tokens not first in their sentence. */
export function conventionCounts(sentences, { forms } = {}) {
  const dominant = dominantOf(forms);
  let n = 0, k = 0;
  for (const s of sentences ?? []) {
    const toks = String(s?.text ?? "").split(/\s+/).filter(Boolean);   // regex-ok: whitespace, the capital tier's own token split
    for (let i = 1; i < toks.length; i++) {
      const w = word(toks[i]); if (!w) continue;
      const d = dominant(w.toLowerCase());
      if (!d || d === "PROPN") continue;
      n++;
      const first = [...w][0];
      if (first !== first.toLowerCase()) k++;
    }
  }
  return { k, n };
}
/** The reference's spread (ADDENDUM-2): the 95th percentile of per-document rates in convention-spread-<stem>.json, or null. */
export function spreadRate(spread) {
  const v = Number(spread?.p95);
  return spread?.schema === "ConventionSpread@1" && v > 0 && v < 1 ? { r0: v, witness: { figure: "p95 of per-document rates", value: v, documents: spread.documents ?? null, ground: spread.ground ?? null, sha256: spread.sha256 ?? null } } : null;
}
/** GROUND: { fired, k, n, r0, p, witness } for this text's sentences ({ text }), or { gap } when a prior is absent. r0 is the reference spread's
 *  95th percentile (ADDENDUM-2); the convention prior's pooled witness is reported beside it, never used as the null. */
export function nameConventionOf(sentences, { forms, conventions, spread } = {}) {
  if (!forms || typeof forms !== "object") return { fired: false, gap: "no_pos_prior" };
  const rate = spreadRate(spread);
  if (!rate) return { fired: false, gap: "no_convention_spread" };
  const { k, n } = conventionCounts(sentences, { forms });
  const p = n > 0 ? upperTail(k, n, rate.r0) : 1;
  return { fired: n > 0 && p < ALPHA, k, n, r0: rate.r0, p, alpha: ALPHA, witness: rate.witness, pooled: receivedRate(conventions)?.witness ?? null };
}
/** FIGURE: the capital surfaces this text's convention refuses (none of their tokens supports a name). */
export function refusedByConvention(surfaces, { forms } = {}) {
  const dominant = dominantOf(forms);
  const refused = [];
  for (const s of surfaces ?? []) {
    const toks = String(s ?? "").split(/\s+/).map(word).filter(Boolean);   // regex-ok: whitespace, the capital tier's own token split
    if (!toks.length) continue;
    const supports = toks.some((t) => { const d = dominant(t.toLowerCase()); return d === null || d === "PROPN"; });
    if (!supports) refused.push(s);
  }
  return refused;
}
/** Round 32's `support` feature: over a row's surfaces, `propn` if a token's lower-case form is PROPN-dominant in the prior, else `unseen` if a
 *  token is not in the prior, else `common` (every token known, none PROPN). The same tokens and the same prior as FIGURE above. */
export function supportOf(surfaces, { forms } = {}) {
  const dominant = dominantOf(forms); let unseen = false;
  for (const s of surfaces ?? []) for (const t of String(s ?? "").split(/\s+/).map(word).filter(Boolean)) {   // regex-ok: whitespace, the capital tier's own token split
    const d = dominant(t.toLowerCase());
    if (d === "PROPN") return "propn";
    if (d === null) unseen = true;
  }
  return unseen ? "unseen" : "common";
}
