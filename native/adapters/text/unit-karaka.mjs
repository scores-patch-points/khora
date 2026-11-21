// unit-karaka.mjs — kāraka and phasepost for larger units (clauses, sentences, paragraphs).
// The 27 cells classify individual tokens (verbs). But larger units also carry kārakas:
//   - A clause's kāraka = the kāraka of its head verb
//   - A sentence's phasepost = the phasepost of its main verb (root)
//   - A paragraph's phasepost = the dominant phasepost across its sentences
//
// This module computes unit-level kārakas from parse rows.

export function clauseKaraka(rows, clauseHeadId) {
  // Find the head verb of the clause and return its kāraka
  const head = rows.find((r) => r.id === clauseHeadId);
  if (!head) return null;
  return head.karaka ?? null;
}

export function sentencePhasepost(rows) {
  // The sentence's phasepost = the phasepost of its root (main verb)
  const root = rows.find((r) => r.head === 0 || r.head === null);
  if (!root) return null;
  return root.phasepost ?? root.karaka ?? null;
}

export function sentenceKarakas(rows) {
  // All kārakas in the sentence, grouped by role
  const karakas = {};
  for (const r of rows) {
    if (r.karaka) {
      if (!karakas[r.karaka]) karakas[r.karaka] = [];
      karakas[r.karaka].push(r.form || r.lemma);
    }
  }
  return karakas;
}

export function paragraphPhasepost(sentences) {
  // The paragraph's phasepost = the most frequent phasepost across its sentences
  const counts = {};
  for (const s of sentences) {
    const pp = s.phasepost;
    if (pp) counts[pp] = (counts[pp] ?? 0) + 1;
  }
  let best = null, bestCount = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestCount) { bestCount = v; best = k; }
  }
  return best;
}

export function paragraphKarakas(sentences) {
  // Aggregate kārakas across all sentences in the paragraph
  const karakas = {};
  for (const s of sentences) {
    for (const [role, forms] of Object.entries(s.karakas ?? {})) {
      if (!karakas[role]) karakas[role] = [];
      karakas[role].push(...forms);
    }
  }
  return karakas;
}

export function documentPhasepost(paragraphs) {
  // The document's phasepost = the most frequent phasepost across its paragraphs
  const counts = {};
  for (const p of paragraphs) {
    const pp = p.phasepost;
    if (pp) counts[pp] = (counts[pp] ?? 0) + 1;
  }
  let best = null, bestCount = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestCount) { bestCount = v; best = k; }
  }
  return best;
}
