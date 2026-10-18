// opencode-semantic.mjs — the semantic fallback for a lexical cue that misses. A synonym ("resend") of a term the work
// actually used ("retry") shares no word with it, so term-overlap cannot find it. The stack already has the semantic
// eye: native/the-fold/corpus-resonance.js (nomic-embed-text through ollama, with a measured NULL CEILING a match must
// beat, so unrelated words do not resonate by coincidence). This module asks it, over a small VOCABULARY (the terms the
// store or the old turns really contain), and hands back the vocabulary words the ask resonates with. Those words are
// then used exactly like words the ask had named; nothing here finds a sentence or writes one.
//
//   semanticTerms({ ask, vocab, embedFn? })  -> { terms, via: "semantic" } | { terms: [], gap, why }
//   LEXICAL-ONLY MODE: FOLD_SEMANTIC=0, an embedder that is down, slow (FOLD_SEMANTIC_MS, default 1200) or answering
//   nonsense all return { terms: [], gap }, and the caller carries on with the lexical result it already had. Never throws.
//   DEFAULTS (margin 0.06 over the null ceiling, top 2) were measured on the real embedder over two fixed sets of 12 paraphrase
//   asks and 8 noise asks each: hit 10/12 on both, noise false positives 0/8 on both. Provisional: both sets informed the choice.
//   Vectors are cached per word for the process, so the vocabulary costs one batch embed and then nothing.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESONANCE = pathToFileURL(path.join(HERE, "native", "the-fold", "corpus-resonance.js")).href;
const TIMEOUT = () => Number(process.env.FOLD_SEMANTIC_MS ?? 1200);
export const semanticOn = (env = process.env) => env.FOLD_SEMANTIC !== "0";

const vecs = new Map(); // text -> vector (the vocabulary, the null queries)
let nullVecs = null;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`embedder slower than ${ms}ms`)), ms))]);
export const _resetForTests = () => { vecs.clear(); nullVecs = null; };

async function vectorsFor(texts, embedFn) {
  const need = [...new Set(texts)].filter((t) => !vecs.has(t));
  if (need.length) {
    const out = await embedFn(need);
    if (!Array.isArray(out) || out.length !== need.length) throw new Error("embedder answered a different count");
    need.forEach((t, i) => vecs.set(t, out[i]));
  }
  return texts.map((t) => vecs.get(t));
}

/**
 * `vocab` is an array of words, or of {term, text}: the term and the SENTENCE it came from. A bare word is a thin thing to
 * embed (one token of context); its sentence carries what the work was saying about it, so the sentence is embedded and
 * the term inherits the best similarity of the sentences it appears in. The null ceiling is measured against the same texts.
 */
export async function semanticTerms({ ask = "", vocab = [], embedFn = null, top = 2, max = 400, margin = Number(process.env.FOLD_SEMANTIC_MARGIN ?? 0.06), env = process.env } = {}) {
  if (!semanticOn(env)) return { terms: [], gap: "semantic_off" };
  const entries = [];
  const seen = new Set();
  for (const v of vocab) {
    const term = String(typeof v === "string" ? v : v?.term ?? "").toLowerCase();
    const text = typeof v === "string" ? term : String(v?.text ?? term);
    if (term.length < 3 || seen.has(`${term}\u0000${text}`)) continue;
    seen.add(`${term}\u0000${text}`);
    entries.push({ term, text });
    if (entries.length >= max) break;
  }
  // an ask with no word of substance ("q", "ok") has nothing to resonate with: no embedder call
  if (!entries.length || !/[\p{L}]{4,}/u.test(String(ask))) return { terms: [], gap: "nothing_to_match" };
  try {
    const R = embedFn ? null : await import(RESONANCE);
    const embed = embedFn ?? ((t) => R.embed(t));
    const cos = R?.cosine ?? ((a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? d / Math.sqrt(na * nb) : 0; });
    const NULLS = R?.NULL_QUERIES ?? ["what time is it", "how do I boil an egg", "tell me a joke", "how far is the moon"];
    return await withTimeout((async () => {
      const texts = entries.map((e) => e.text);
      const [tv, [av]] = await Promise.all([vectorsFor(texts, embed), vectorsFor([String(ask)], embed)]);
      nullVecs ??= await vectorsFor(NULLS, embed);
      // the ceiling: how close genuinely unrelated questions already get to these very texts
      const ceiling = Math.max(0, ...nullVecs.map((n) => Math.max(...tv.map((v) => cos(n, v)))));
      const best = new Map();
      entries.forEach((e, i) => { const s = cos(av, tv[i]); if (s > (best.get(e.term) ?? -1)) best.set(e.term, s); });
      const ranked = [...best].map(([w, s]) => ({ w, s })).filter((x) => x.s > ceiling + margin).sort((a, b) => b.s - a.s).slice(0, top);
      return ranked.length ? { terms: ranked.map((x) => x.w), via: "semantic", ceiling, scores: ranked.map((x) => +x.s.toFixed(3)) } : { terms: [], gap: "below_null_ceiling", ceiling };
    })(), TIMEOUT());
  } catch (e) {
    return { terms: [], gap: "embedder_down", why: String(e?.message ?? e).slice(0, 120) };
  }
}
