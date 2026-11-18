// static-smell.js — the fast smell: frames built by averaging stored WORD vectors, no model call at read time (identity/novels PREREG-ROUND16.md).
// Word vectors come from the vector library (organs/vector-library.js), embedded once for the vocabulary; a word it lacks is skipped and counted.
import { cosine, normalise } from "./embed-personhood.js";
export const wordsOf = (s) => String(s ?? "").match(/[\p{L}\p{N}’'-]+/gu) ?? [];
export function makeWordVecs(lookup) { const memo = new Map(); let seen = 0, missing = 0; const vec = (w) => { if (memo.has(w)) return memo.get(w); const v = lookup(w) ?? null; memo.set(w, v); return v; };
  const mean = (words) => { let acc = null, n = 0; for (const w of words) { const v = vec(w); seen++; if (!v) { missing++; continue; } acc ??= new Float64Array(v.length); for (let i = 0; i < v.length; i++) acc[i] += v[i]; n++; } return acc && n ? acc.map((x) => x / n) : null; };
  return { vec, mean, get oov() { return seen ? missing / seen : 0; } }; }
const add = (a, b, w = 1) => { if (!b) return a; if (!a) return Float64Array.from(b, (x) => x * w); for (let i = 0; i < a.length; i++) a[i] += w * b[i]; return a; };
const unit = (a) => (a ? normalise(a) : null);
/** SS: the string */ export const ssVec = (W, string) => unit(W.mean(wordsOf(string)));
/** SR: the role frame — mean of [role word, verb lemma, SS] */ export const srVec = (W, role, lemma, string) => { let a = null; const ss = ssVec(W, string); a = add(a, role ? W.vec(role) : null); a = add(a, lemma ? W.vec(lemma) : null); a = add(a, ss); return unit(a); };
/** sentenceMeans: the mean word vector of each sentence (null when it has none) */ export const sentenceMeans = (W, sentences) => sentences.map((s) => W.mean(wordsOf(s.text ?? s)));
/** SWr: the string plus the mean word vector of each sentence within r sentences of the mention's own (included) */ export function swVec(W, sIdx, r, string, means) { let a = add(null, ssVec(W, string)); for (let j = Math.max(0, sIdx - r); j <= Math.min(means.length - 1, sIdx + r); j++) a = add(a, means[j] ? unit(means[j]) : null); return unit(a); }
export const scoreStatic = (v, cent) => (v ? cosine(v, cent.person) - cosine(v, cent.not) : 0);
