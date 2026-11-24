// verb-equivalents.js — WHICH VERBS SAY THE SAME THING: "made", "created", "built", "developed".
// The persona audit (eval/prompted) found that a question is matched to what a prompt says by the verb's own lemma, so "Who made Claude?" gets nothing from "Claude was
// created by Anthropic", and the reverse. A man with a notebook would read "created" as the answer to "made". This organ names the verbs of a pool (the verbs the
// notebook holds) that are the question's verb said otherwise, and says how sure it is. It does not rewrite anything and it does not pick: the caller (the matcher)
// is handed the candidates with their similarity and uses them only when the exact verb found nothing, and says so in its trace.
//
// WHAT "SAME THING" IS HERE, MEASURED. A frozen embedder (a codec, never generation) puts "to make" next to "to create" (0.93), "to build" (0.85); the null is the
// spread of RANDOM pairs of verbs (mean + 2.5 sd, the repo's usual rule): about 0.84 for nomic-embed-text, so "make" and "build" are barely above it and "make"
// and "give" are below. A candidate must also be MUTUAL: the question's verb is among the candidate's three nearest verbs in the pool plus the reference sample, so
// a verb that is merely near everything is not an equivalent of anything. Antonyms and neighbours in a topic ("love" and "like": 0.80) stay below the null.
// WHAT IT CANNOT DO: tell "love" from "hate" (embeddings put opposites together; the reader's negation mark and the kind of the arguments decide that, not this
// organ), or know that a verb means something different in a narrow sense.
// PURE except the injected embedder.
export const DIALS = Object.freeze({ nullSigma: { value: 2.5, why: "above the spread of random verb pairs, the rule the repo's embedders use elsewhere" }, mutualK: { value: 3, why: "the question's verb must be among the candidate's three nearest, so a verb near everything is not an equivalent of anything" } });
const norm = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(v, (x) => x / n); };
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** referenceVerbs(posPrior, { n }) -> n verbs spread evenly over the prior's verbs (a deterministic sample, not a choice) */
export function referenceVerbs(posPrior, { n = 300 } = {}) {
  // the prior's `forms`: word -> { UPOS: count }; verbs are the words the treebank tagged VERB at least 90% of the time, at least 20 times
  const vs = Object.entries(posPrior?.forms ?? {}).filter(([w, c]) => { const tot = Object.values(c).reduce((x, y) => x + y, 0); return (c.VERB ?? 0) >= 20 && (c.VERB ?? 0) / tot >= 0.9 && w.length > 2 && !w.includes(" ") && w === w.toLowerCase(); }).map(([w]) => w).sort();
  const step = Math.max(1, Math.floor(vs.length / n)); return vs.filter((_, i) => i % step === 0).slice(0, n);
}

export function makeVerbEquivalence({ embed, reference = [] } = {}) {
  if (typeof embed !== "function") throw new TypeError("makeVerbEquivalence: an embedder must be supplied (a frozen codec)");
  let R = null, tau = null;
  const vec = async (vs) => (await embed(vs.map((v) => `to ${v}`))).map(norm);
  const ready = async () => { if (R) return; R = await vec(reference); let sum = 0, sq = 0, n = 0; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const c = dot(R[i], R[j]); sum += c; sq += c * c; n++; } const m = n ? sum / n : 0; tau = m + DIALS.nullSigma.value * Math.sqrt(Math.max(0, n ? sq / n - m * m : 0)); };
  /** equivalents(verb, pool) -> [{ verb, similarity, mutual }] nearest first; empty when nothing in the pool is above the null and mutual */
  async function equivalents(verb, pool) {
    await ready(); const cands = [...new Set((pool ?? []).filter((p) => p && p !== verb))]; if (!cands.length) return [];
    const [q] = await vec([verb]), C = await vec(cands), all = [...C.map((v, i) => ({ v, w: cands[i] })), ...R.map((v, i) => ({ v, w: reference[i] }))].filter((x) => x.w !== verb);
    return cands.map((w, i) => ({ verb: w, similarity: +dot(q, C[i]).toFixed(2), i })).filter((x) => x.similarity >= tau)
      .map((x) => { const near = [{ w: verb, s: dot(C[x.i], q) }, ...all.filter((y) => y.w !== x.verb).map((y) => ({ w: y.w, s: dot(C[x.i], y.v) }))].sort((a, b) => b.s - a.s).slice(0, DIALS.mutualK.value).map((y) => y.w); return { verb: x.verb, similarity: x.similarity, mutual: near.includes(verb) }; })
      .filter((x) => x.mutual).sort((a, b) => b.similarity - a.similarity);
  }
  return { equivalents, threshold: async () => { await ready(); return +tau.toFixed(2); } };
}
