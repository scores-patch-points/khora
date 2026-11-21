// variety-surprise.mjs — select the variety by SURPRISE MINIMIZATION, not cosine match.
// The water flows to where the surprise is least: a text's kāraka distribution is read
// against each variety's prior, and the variety that makes the text LEAST surprising
// (lowest cross-entropy) is the one it is. This replaces the cosine match in
// variety-detector.mjs (a dot product, not a principled surprise). The surprise is the
// cross-entropy of the observed distribution under the prior: -Σ p(k) log q(k). A text
// read by the wrong variety is surprising; by the right one, expected.
//
// Forward note: this first cut computes surprise over the WHOLE distribution (a
// whole-document measure). The causal, forward-only form — sliding the calibration as
// the text reveals itself, surprising tokens shifting the variety — is the next rung;
// this is the honest static version of the same downhill.

const KARAKA_LABELS = ["kartṛ", "karman", "karaṇa", "sampradāna", "apādāna", "adhikaraṇa", "kāla", "hetu", "prayojana"];
import { VARIETY_FINGERPRINTS } from "./variety-detector.mjs";

const SMOOTH = 1e-9;

/** Cross-entropy H(text, prior) = -Σ p(k) log q(k): the average surprise of the text under the variety's prior. */
export function crossEntropy(distribution, prior) {
  let ce = 0;
  for (const k of KARAKA_LABELS) {
    const p = distribution[k] ?? 0;
    if (p === 0) continue;             // zero-probability events contribute no surprise
    const q = (prior[k] ?? 0) + SMOOTH; // smooth: a prior that never saw this role is maximally surprising
    ce -= p * Math.log(q);
  }
  return ce;
}

/** The variety that minimizes surprise (cross-entropy) for a text's kāraka distribution. */
export function surpriseVariety(distribution, language = "eng") {
  let best = null, bestCE = Infinity;
  for (const [key, fp] of Object.entries(VARIETY_FINGERPRINTS)) {
    if (!key.startsWith(language + ":")) continue;
    const ce = crossEntropy(distribution, fp);
    if (ce < bestCE) { bestCE = ce; best = key; }
  }
  return best ? { variety: best.split(":")[1], surprise: bestCE, nearest: best } : { variety: "unknown", surprise: null, nearest: null };
}

/** Surprise under every variety, ranked — so the reader can see the whole downhill, not just the bottom. */
export function surpriseRanking(distribution, language = "eng") {
  return Object.entries(VARIETY_FINGERPRINTS)
    .filter(([k]) => k.startsWith(language + ":"))
    .map(([key, fp]) => ({ variety: key.split(":")[1], surprise: crossEntropy(distribution, fp) }))
    .sort((a, b) => a.surprise - b.surprise);
}
