// karaka-equivalence.mjs — equivalence up to kāraka: two sentences are equivalent if they have
// the same referents in the same kārakas. This is the kāraka-aware equivalence measure.
// It complements the existing equivalence judge (which takes stops from the finder) by providing
// a kāraka-based stop: "same up to kāraka" means same referents in same roles.

export function karakaSignature(rows) {
  // Extract (form, karaka) pairs for kāraka-carrying tokens
  const sig = [];
  for (const r of rows) {
    if (r.karaka) sig.push(`${r.karaka}:${(r.lemma || r.form || "").toLowerCase()}`);
  }
  return sig.sort().join("|");
}

export function karakaEquivalent(rowsA, rowsB) {
  const sigA = karakaSignature(rowsA);
  const sigB = karakaSignature(rowsB);
  return { equivalent: sigA === sigB, sigA, sigB, overlap: sigA && sigB ? sigA.split("|").filter((x) => sigB.split("|").includes(x)).length : 0 };
}

export function karakaOverlap(rowsA, rowsB) {
  const setA = new Set(karakaSignature(rowsA).split("|").filter(Boolean));
  const setB = new Set(karakaSignature(rowsB).split("|").filter(Boolean));
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return { jaccard: union.size ? intersection.length / union.size : 0, intersection: intersection.length, union: union.size };
}
