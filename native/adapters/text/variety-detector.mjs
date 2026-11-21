// variety-detector.mjs — detect the variety (period, genre, region) of a text from its kāraka distribution.
// The kāraka distribution IS the genre fingerprint: legal English has more adhikaraṇa (locus),
// scientific English has more karaṇa (instrument), literary English has more kāla/hetu (temporal/causal).
// This is kind induction at the variety level: the sniffer induces kārakas, the distribution induces variety.
//
// Usage: detectVariety(text, { language }) -> { variety, confidence, distribution, nearestKnown }

const KARAKA_LABELS = ["kartṛ", "karman", "karaṇa", "sampradāna", "apādāna", "adhikaraṇa", "kāla", "hetu", "prayojana"];

// Known variety fingerprints (kāraka distributions, normalized to sum to 1)
// These are DECLARED, not measured. They should be calibrated on held-out data.
// Variety priors. eng:web and eng:legal are DERIVED from data (2026-11-21): the kāraka
// distribution of UD_English-EWT train gold deprels (web) and the UDHR parsed through the
// English codec (legal). The rest are DECLARED, not measured — a typed gap until their own
// treebank supplies the distribution. A derived prior carries only the roles its corpus
// actually attests; a role absent from the prior is maximally surprising under it (cross-entropy).
export const VARIETY_FINGERPRINTS = Object.freeze({
  "eng:legal": { kartṛ: 0.2318, karman: 0.1636, adhikaraṇa: 0.6045 },   // derived: UDHR parsed, n=440
  "eng:web": { kartṛ: 0.4091, karman: 0.1889, adhikaraṇa: 0.3993, sampradāna: 0.0027 }, // derived: UD_English-EWT gold, n=59338
  "zh:classical": { kartṛ: 0.10, karman: 0.10, karaṇa: 0.05, sampradāna: 0.02, apādāna: 0.03, adhikaraṇa: 0.60, kāla: 0.03, hetu: 0.04, prayojana: 0.03 },
  "zh:modern": { kartṛ: 0.25, karman: 0.20, karaṇa: 0.05, sampradāna: 0.03, apādāna: 0.02, adhikaraṇa: 0.30, kāla: 0.05, hetu: 0.05, prayojana: 0.05 },
  "grc:attic": { kartṛ: 0.30, karman: 0.25, karaṇa: 0.05, sampradāna: 0.03, apādāna: 0.04, adhikaraṇa: 0.20, kāla: 0.05, hetu: 0.04, prayojana: 0.04 },
  "grc:koine": { kartṛ: 0.35, karman: 0.25, karaṇa: 0.04, sampradāna: 0.03, apādāna: 0.03, adhikaraṇa: 0.18, kāla: 0.04, hetu: 0.03, prayojana: 0.05 },
});

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k of KARAKA_LABELS) {
    dot += (a[k] ?? 0) * (b[k] ?? 0);
    na += (a[k] ?? 0) ** 2;
    nb += (b[k] ?? 0) ** 2;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export function computeDistribution(karakas) {
  const counts = {};
  for (const k of KARAKA_LABELS) counts[k] = 0;
  let total = 0;
  for (const k of karakas) {
    if (k && counts[k] !== undefined) { counts[k]++; total++; }
  }
  const dist = {};
  for (const k of KARAKA_LABELS) dist[k] = total ? counts[k] / total : 0;
  return dist;
}

export function detectVariety(distribution, language = "eng") {
  const prefix = language + ":";
  let best = null, bestSim = -1;
  for (const [key, fp] of Object.entries(VARIETY_FINGERPRINTS)) {
    if (!key.startsWith(prefix)) continue;
    const sim = cosineSim(distribution, fp);
    if (sim > bestSim) { bestSim = sim; best = key; }
  }
  return {
    variety: best ? best.split(":")[1] : "unknown",
    confidence: bestSim,
    distribution,
    nearestKnown: best,
  };
}
