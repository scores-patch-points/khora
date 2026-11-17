// fold.mjs — PREREG-PARAPHRASE.md. A mechanical word fold from counts only: positive PMI context vectors over a background text, cosine, and a threshold in the word's OWN
// robust units (median and 1.4826 x MAD of cosine(w, u) over every vocabulary word u sharing a context with w), at the universal threshold sqrt(2 ln V) for V such comparisons.
// No model, no word list, no hand-set threshold.
export const wordsOf = (s) => (String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

export function buildFold(texts, { window = 4, minCount = 5 } = {}) {
  const count = new Map(); const toks = texts.map(wordsOf); for (const t of toks) for (const w of t) count.set(w, (count.get(w) ?? 0) + 1);
  const vocab = [...count.entries()].filter(([, c]) => c >= minCount).map(([w]) => w).sort(); const id = new Map(vocab.map((w, i) => [w, i])); const V = vocab.length;
  const co = Array.from({ length: V }, () => new Map()); let T = 0; const cw = new Float64Array(V);
  for (const t of toks) { const ids = t.map((w) => id.get(w) ?? -1); for (let i = 0; i < ids.length; i++) { const a = ids[i]; if (a < 0) continue; cw[a]++; T++; for (let d = 1; d <= window; d++) { const b = ids[i + d]; if (b === undefined || b < 0) continue; co[a].set(b, (co[a].get(b) ?? 0) + 1); co[b].set(a, (co[b].get(a) ?? 0) + 1); } } }
  // positive PMI, then unit-normalise each vector; inverted index context -> [(word, value)]
  const vec = new Array(V), inv = Array.from({ length: V }, () => []); let pairs = 0;
  for (let a = 0; a < V; a++) { const m = new Map(); let n2 = 0; for (const [b, c] of co[a]) { const p = Math.log((c * T) / (cw[a] * cw[b])); if (p > 0) { m.set(b, p); n2 += p * p; } } const nrm = Math.sqrt(n2) || 1; for (const [b, p] of m) { m.set(b, p / nrm); inv[b].push([a, p / nrm]); pairs++; } vec[a] = m; }
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : 0; };
  const cache = new Map();
  /** the words folded with w: [{ word, cos, z }], strongest first; [] when w is not in the vocabulary or nothing clears the threshold */
  function foldOf(w) {
    if (cache.has(w)) return cache.get(w); const a = id.get(w); let out = [];
    if (a !== undefined) {
      const dot = new Map(); for (const [c, val] of vec[a]) for (const [u, uv] of inv[c]) if (u !== a) dot.set(u, (dot.get(u) ?? 0) + val * uv);
      const cos = [...dot.values()]; const n = cos.length;
      if (n > 2) { const med = median(cos), mad = 1.4826 * median(cos.map((x) => Math.abs(x - med))) || 1e-9, thr = Math.sqrt(2 * Math.log(n));
        for (const [u, x] of dot) { const z = (x - med) / mad; if (z >= thr) out.push({ word: vocab[u], cos: x, z }); } out.sort((p, q) => q.z - p.z); }
    }
    cache.set(w, out); return out;
  }
  return { V, tokens: T, pairs, foldOf, has: (w) => id.has(w) };
}
