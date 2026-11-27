// verb-equivalents.js — WHICH VERBS SAY THE SAME THING: "made", "created", "built", "developed".
// The persona audit (eval/prompted) found that a question is matched to what a prompt says by the verb's own lemma, so "Who made Claude?" gets nothing from "Claude was
// created by Anthropic", and the reverse. A man with a notebook would read "created" as the answer to "made". This organ names the verbs of a pool (the verbs the
// notebook holds) that are the question's verb said otherwise, and says how sure it is. It does not rewrite anything and it does not pick: the caller (the matcher)
// is handed the candidates with their similarity and uses them only when the exact verb found nothing, and says so in its trace.
//
// WHAT "SAME THING" IS HERE, MEASURED. A frozen embedder (a codec, never generation) puts "to make" next to "to create" (0.93), "to build" (0.85); the null is the
// spread of RANDOM pairs of verbs (mean + 2.5 sd, the repo's usual rule): about 0.75 plus 2.5 times 0.04, a bar of about 0.86, for nomic-embed-text, so "make" and "build" (0.85) are a hair
// under it (a near miss, see equivalents' band) and "make" and "give" are far below. (An earlier version of this comment said 0.84: that was the bar of a smaller sample.) A candidate must also be MUTUAL: the question's verb is among the candidate's three nearest verbs in the pool plus the reference sample, so
// a verb that is merely near everything is not an equivalent of anything. Antonyms and neighbours in a topic ("love" and "like": 0.80) stay below the null.
// WHAT IT CANNOT DO: tell "love" from "hate" (embeddings put opposites together; the reader's negation mark and the kind of the arguments decide that, not this
// organ), or know that a verb means something different in a narrow sense.
// PURE except the injected embedder.
export const DIALS = Object.freeze({ nullSigma: { value: 2.5, why: "above the spread of random verb pairs, the rule the repo's embedders use elsewhere" }, nearMissSigma: { value: 1, why: "a verb within one spread of random verb pairs below the bar is not the same verb, but it is near enough that an answer under it may be worth saying beside the answer (see standsIn)" }, mutualK: { value: 3, why: "the question's verb must be among the candidate's three nearest, so a verb near everything is not an equivalent of anything" } });
const norm = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(v, (x) => x / n); };
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** referenceVerbs(posPrior, { n }) -> n verbs spread evenly over the prior's verbs (a deterministic sample, not a choice) */
export function referenceVerbs(posPrior, { n = 300 } = {}) {
  // the prior's `forms`: word -> { UPOS: count }; verbs are the words the treebank tagged VERB at least 90% of the time, at least 20 times
  const vs = Object.entries(posPrior?.forms ?? {}).filter(([w, c]) => { const tot = Object.values(c).reduce((x, y) => x + y, 0); return (c.VERB ?? 0) >= 20 && (c.VERB ?? 0) / tot >= 0.9 && w.length > 2 && !w.includes(" ") && w === w.toLowerCase(); }).map(([w]) => w).sort();
  const step = Math.max(1, Math.floor(vs.length / n)); return vs.filter((_, i) => i % step === 0).slice(0, n);
}

/** THE DMD GUARD. The owner, 2026-11-24, asked whether a near-synonym may stand in for a question's verb: "if it's within a DMD then why not?" A difference that makes a difference
 *  (Bateson; the repo's idiom is the destroy test of penelope organs/asker-dmd.mjs) is one that moves the thing the asker cares about, and here that is the ANSWER. So a near verb
 *  stands in only when swapping it for each of the other near verbs would not move the answer: the fold is asked the question under EVERY candidate verb (`answerFor`, the
 *  caller's: it asks the fold, this organ never reads text) and the answers must be one and the same.
 *    "same"  every candidate that has an answer gives the same one: the differences among these verbs make no difference to the asker; it stands (nearest first), and `agreeing` names every verb that agreed
 *    "other" two near verbs give different answers: the verb choice makes a difference, so NONE is picked; `answers` lists each under its verb, to be said as they are (a typed gap, never a vote)
 *    "none"  no candidate has an answer: the gap stays what it was
 *  `rivals` (optional): verbs of the fold that are NOT near enough to count as the same verb but that the caller knows fill the same role (the engine's frames know that); when the verdict is
 *  "same" the fold is asked under each, and those that say something DIFFERENT are returned as `alsoSays`, to be said next to the answer: the notebook holds a second answer under a verb
 *  we could not call the same, and a man would mention it. They never block the answer and never vote.
 *  The exact verb is always the caller's first try and is never replaced by this. `answerFor(verb)` -> an array of answers (strings or ids; compared as sets) or null/[] when the fold has none.
 *  WHAT IT DOES NOT SHOW: that "make" and "create" mean the same in general; only that, for this question and this fold, choosing between the near verbs would not change what is said. */
export async function standsIn(equivalents, answerFor, { rivals = [] } = {}) {
  if (typeof answerFor !== "function") throw new TypeError("standsIn: answerFor(verb) must be supplied: the fold is asked once per candidate verb");
  const key = (a) => JSON.stringify([...new Set((a ?? []).map(String))].sort()), heard = [], all = equivalents ?? []; equivalents = all.filter((c) => !c.near_miss); rivals = [...new Set([...rivals, ...all.filter((c) => c.near_miss).map((c) => c.verb)])];   // a near miss (equivalents(..., { band })) is a rival, never a candidate
  for (const c of equivalents ?? []) { const a = await answerFor(c.verb); if (a && a.length) heard.push({ verb: c.verb, similarity: c.similarity, answer: [...new Set(a.map(String))].sort() }); }
  if (!heard.length) return { verdict: "none", chosen: null, answers: [], agreeing: [], tried: equivalents.map((c) => c.verb) };
  const distinct = new Set(heard.map((h) => key(h.answer)));
  if (distinct.size === 1) { const alsoSays = []; for (const v of rivals) { const a = await answerFor(v); if (a && a.length && key(a) !== key(heard[0].answer)) alsoSays.push({ verb: v, answer: [...new Set(a.map(String))].sort() }); } return { verdict: "same", chosen: heard[0], answers: heard, agreeing: heard.map((h) => h.verb), alsoSays, tried: equivalents.map((c) => c.verb) }; }
  return { verdict: "other", chosen: null, answers: heard, agreeing: [], tried: equivalents.map((c) => c.verb) };
}

export function makeVerbEquivalence({ embed, reference = [] } = {}) {
  if (typeof embed !== "function") throw new TypeError("makeVerbEquivalence: an embedder must be supplied (a frozen codec)");
  let R = null, tau = null, mean = 0, sd = 0;
  const vec = async (vs) => (await embed(vs.map((v) => `to ${v}`))).map(norm);
  const ready = async () => { if (R) return; R = await vec(reference); let sum = 0, sq = 0, n = 0; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const c = dot(R[i], R[j]); sum += c; sq += c * c; n++; } const m = n ? sum / n : 0; mean = m; sd = Math.sqrt(Math.max(0, n ? sq / n - m * m : 0)); tau = m + DIALS.nullSigma.value * sd; };
  /** equivalents(verb, pool, { band }) -> [{ verb, similarity, mutual, near_miss }] nearest first; empty when nothing in the pool is above the null and mutual.
   *  `band` (in spreads of random verb pairs, default 0 = none; DIALS.nearMissSigma is the usual) also returns the verbs that are MUTUAL and fall within that many spreads BELOW the bar,
   *  flagged `near_miss: true`, after the ones that clear it; standsIn says their answers beside the answer and never lets them vote. */
  async function equivalents(verb, pool, { band = 0 } = {}) {
    await ready(); const cands = [...new Set((pool ?? []).filter((p) => p && p !== verb))]; if (!cands.length) return [];
    const [q] = await vec([verb]), C = await vec(cands), all = [...C.map((v, i) => ({ v, w: cands[i] })), ...R.map((v, i) => ({ v, w: reference[i] }))].filter((x) => x.w !== verb);
    return cands.map((w, i) => ({ verb: w, similarity: +dot(q, C[i]).toFixed(2), i })).filter((x) => x.similarity >= tau - band * sd)
      .map((x) => { const near = [{ w: verb, s: dot(C[x.i], q) }, ...all.filter((y) => y.w !== x.verb).map((y) => ({ w: y.w, s: dot(C[x.i], y.v) }))].sort((a, b) => b.s - a.s).slice(0, DIALS.mutualK.value).map((y) => y.w); return { verb: x.verb, similarity: x.similarity, mutual: near.includes(verb), near_miss: x.similarity < tau }; })
      .filter((x) => x.mutual).sort((a, b) => (a.near_miss - b.near_miss) || b.similarity - a.similarity);
  }
  return { equivalents, threshold: async () => { await ready(); return +tau.toFixed(2); }, spread: async () => { await ready(); return { mean: +mean.toFixed(3), sd: +sd.toFixed(3), bar: +tau.toFixed(3), nearMissFloor: +(tau - DIALS.nearMissSigma.value * sd).toFixed(3) }; } };
}
