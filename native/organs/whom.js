// organs/whom.js — the reader as the SECOND OPERAND of a fold. No model.
//
// The user, 2026-10-14: "a prompt is a stated 'for whom', a lens, telling the universe to fold, bounded by differences that make a
// difference, to unfold itself from a particular perspective." Callimachus alone is the catalog (W = ∅). The whom is what folds it.
//
//   readWhom(pinned)          → whom: the reader-state corpus W (their thread, answers shown, pages seen), read from Pinax records
//   VOID_READER               → W = ∅, the catalog: every W-relative measure reduces to today's source-relative one
//   heldIn(whom, text)        → the W byte address that already holds these bytes, or null
//   sentenceHeld(whom, s)     → a told sentence is held when every copied segment is held (or, with none, its whole text)
//   restrictWhom(whom, depth) → the last `depth` units of the thread (dmdWindow's recency axis over the reader)
//   seamsOf(sentences)        → seam density: words and bytes by provenance kind, seams between kinds, seams per word
//
// W IS BYTES. Each file is pinned with makePinax like any source; its units are blank-line-separated blocks in thread order, each with a
// versioned byte address into W's own text layer. "Held" is exact containment on normalized bytes (NFC, whitespace collapsed), never a
// fuzzy match: holding something is surprisal −log2(1) = 0. W never leaves the machine: this module reads only what it is handed.
const enc = new TextEncoder();
const norm = (t) => String(t ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
const stemOf = (w) => String(w ?? "").toLowerCase().slice(0, 4);
const bigramsOf = (t) => { const w = String(t).toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) ?? []; return w.slice(1).map((x, i) => `${w[i]} ${x}`); };

export const VOID_READER = Object.freeze({ empty: true, units: Object.freeze([]), pinax: Object.freeze([]), size: 0 });

/** Read W from pinned records ({ entry, layers }) in thread order. An empty list is the void reader. */
export function readWhom(pinned = []) {
  const units = [];
  for (const rec of pinned) {
    const text = new TextDecoder().decode(rec.layers.text);
    const re = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g;
    let m;
    while ((m = re.exec(text))) {
      const t = norm(m[0]);
      if (!t) continue;
      const b0 = enc.encode(text.slice(0, m.index)).length, b1 = b0 + enc.encode(m[0]).length;
      units.push({ text: t, at: `${rec.entry.id}/text@${rec.entry.text.sha256.slice(0, 12)}#b${b0}-${b1}` });
    }
  }
  if (!units.length) return VOID_READER;
  return makeWhom(units, pinned.map((r) => r.entry.id));
}

function makeWhom(units, pinax) {
  const stems = units.map((u) => new Set((u.text.toLowerCase().match(/[\p{L}]{4,}/gu) ?? []).map(stemOf)));
  return Object.freeze({ empty: units.length === 0, units: Object.freeze(units), pinax: Object.freeze(pinax), size: units.length, stems, bigrams: new Set(units.flatMap((u) => bigramsOf(u.text))) });
}

/** The last `depth` units of the thread: the reader with everything older forgotten (depth 0 = the void reader). */
export function restrictWhom(whom, depth) {
  if (!whom || whom.empty || depth <= 0) return VOID_READER;
  return makeWhom(whom.units.slice(Math.max(0, whom.units.length - depth)), whom.pinax);
}

/** The address of the W unit that already holds these bytes, or null. Exact containment after normalization. */
export function heldIn(whom, text) {
  if (!whom || whom.empty) return null;
  const t = norm(text);
  if (!t) return null;
  for (const u of whom.units) if (u.text.includes(t)) return u.at;
  return null;
}

/** A told sentence ({ text, segs }) is held when every copied segment is held; with no copied segment, when its whole text is. */
export function sentenceHeld(whom, s) {
  if (!whom || whom.empty || !s) return null;
  const copied = (s.segs ?? []).filter((x) => x.kind === "source" && /[\p{L}\p{N}]/u.test(x.t));
  if (!copied.length) return heldIn(whom, s.text);
  let at = null;
  for (const x of copied) { at = heldIn(whom, x.t); if (!at) return null; }
  return at;
}

/** Document frequency of 4-letter stems across W's units: the reader's own base rate for the question-word witness. */
export function whomStemDf(whom) {
  const df = new Map();
  if (!whom || whom.empty) return df;
  for (const set of whom.stems) for (const s of set) df.set(s, (df.get(s) ?? 0) + 1);
  return df;
}

/**
 * Seam density: the first number a fold should report. Per fold: words and UTF-8 bytes by provenance kind (copied `source`, computed
 * `value`, `frame`, the mouth's `self:model`), seams (adjacent non-blank segments of different kinds) and seams per word.
 */
export function seamsOf(sentences = []) {
  const kinds = {};
  let seams = 0, words = 0;
  for (const s of sentences) {
    let prev = null;
    for (const x of s?.segs ?? []) {
      const t = x.t ?? x.text ?? "";
      if (!/[\p{L}\p{N}]/u.test(t)) continue;
      const k = x.kind === "model" ? "self:model" : x.kind;
      const w = (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
      kinds[k] ??= { words: 0, bytes: 0 };
      kinds[k].words += w; kinds[k].bytes += enc.encode(t).length;
      words += w;
      if (prev && prev !== k) seams += 1;
      prev = k;
    }
  }
  return { density: words ? +(seams / words).toFixed(4) : 0, seams, words, kinds };
}
