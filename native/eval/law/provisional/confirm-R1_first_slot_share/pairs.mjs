// confirm-R1_first_slot_share/pairs.mjs — matched pairs (own implementation of the scoper's design), controls, shuffles. New file.
// EXACT key (all parts exact, no relaxation, as the scoper): index bucket in message, quarter-octave whole-stream form count floor(4*log2 n), exact character length (11+ pooled), message-length bucket.
// COARSE key (tiny streams only): same index bucket, half-octave count, 4 char-length buckets, 4 message-length buckets. Matching is without replacement. Stratum LATER = the form occurred earlier in the stream (token level, as the scoper).
import { streamIndex, ishare, cntEarlier, cnt128, rngOf, shuffleIn, SEED } from "./lib.mjs";
const ibk = (i) => (i <= 3 ? i : i <= 5 ? 4 : i <= 9 ? 5 : 6);
const fq = (n) => Math.floor(4 * Math.log2(Math.max(1, n)));
const fq2 = (n) => Math.floor(2 * Math.log2(Math.max(1, n)));
const mlb = (n) => (n <= 7 ? n : n <= 9 ? 8 : n <= 11 ? 9 : n <= 14 ? 10 : n <= 19 ? 11 : n <= 27 ? 12 : n <= 40 ? 13 : 14);
const clb = (w) => Math.min(11, [...w].length);
const clb4 = (w) => { const l = [...w].length; return l <= 4 ? 0 : l <= 6 ? 1 : l <= 8 ? 2 : 3; };
const mlb4 = (n) => (n <= 4 ? 0 : n <= 8 ? 1 : n <= 16 ? 2 : 3);
export const KEY_EXACT = (o, ix) => [ibk(o.i), fq(ix.count.get(o.w)), clb(o.w), mlb(o.len)].join("|");
/** UD sentences are long: index bucket EXACT up to 20 (21+ pooled); everything else as EXACT. */
export const KEY_UD = (o, ix) => [Math.min(o.i, 21), fq(ix.count.get(o.w)), clb(o.w), mlb(o.len)].join("|");
export const KEY_COARSE = (o, ix) => [ibk(o.i), fq2(ix.count.get(o.w)), clb4(o.w), mlb4(o.len)].join("|");
/** Shuffle controls. wordshuf: tokens permuted inside every message (gold labels travel with their token); msgshuf: messages permuted inside the stream (tokens intact). */
export function transform(doc, mode) {
  if (mode === "real") return doc;
  const r = rngOf(SEED, "shuf", mode, doc.key), n = doc.T.length, out = { ...doc };
  if (mode === "wordshuf") {
    out.T = doc.T.map((t) => t.slice()); if (doc.G) { out.G = doc.G.map((g) => g.slice()); out.D = doc.D.map((g) => g.slice()); }
    out.T.forEach((t, k) => { const idx = shuffleIn(t.map((_, j) => j), r), t0 = doc.T[k]; out.T[k] = idx.map((j) => t0[j]); if (doc.G) { out.G[k] = idx.map((j) => doc.G[k][j]); out.D[k] = idx.map((j) => doc.D[k][j]); } });
  } else if (mode === "msgshuf") {
    const idx = shuffleIn([...Array(n).keys()], r), pick = (a) => a && idx.map((k) => a[k]);
    out.T = pick(doc.T); out.S = pick(doc.S); out.G = pick(doc.G); out.D = pick(doc.D); out.genre = pick(doc.genre); out.docid = pick(doc.docid);
  } else throw new Error("mode " + mode);
  return out;
}
/** Matched pairs over one or more streams. classOf(doc, k, i, w) -> "P" | "N" | null (gold used only here). opt: {max per stream, pooled (negatives pooled across streams, each scored inside its own stream), keyFn, mode, tag}. */
export function matchPairs(docs, classOf, opt = {}) {
  const { max = 400, pooled = false, keyFn = KEY_EXACT, mode = "real", tag = "" } = opt, P = [], pool = new Map(), IX = new Map(), info = [];
  for (const doc of docs) {
    const ix = streamIndex(doc.T), seen = new Map(); IX.set(doc, ix); let nP = 0;
    doc.T.forEach((m, k) => m.forEach((w, i) => {
      const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk === 0) return;
      const c = classOf(doc, k, i, w); if (!c) return; const o = { doc, w, m: k, i, len: m.length }; o.key = (pooled ? "" : doc.key + "#") + keyFn(o, ix);
      if (c === "P") { P.push(o); nP++; } else (pool.get(o.key) ?? pool.set(o.key, []).get(o.key)).push(o);
    }));
    info.push({ stream: doc.key, nPos: nP });
  }
  const rnd = rngOf(SEED, "pairs", docs.map((d) => d.key).join(","), mode, tag); for (const a of pool.values()) shuffleIn(a, rnd);
  const rec = (o) => { const ix = IX.get(o.doc); return { w: o.w, m: o.m, i: o.i, len: o.len, cl: [...o.w].length, lc: Math.log2(ix.count.get(o.w)), init: o.i === 0, ishare: ishare(ix, o.w, o.m), cnt128: cnt128(ix, o.w, o.m), b: cntEarlier(ix, o.w, o.m), mday: o.m, g: o.doc.genre?.[o.m], up: o.doc.G?.[o.m]?.[o.i], dep: o.doc.D?.[o.m]?.[o.i] }; };
  const out = [], perDoc = new Map(); let dropped = 0;
  for (const p of shuffleIn(P, rnd)) {
    const c = perDoc.get(p.doc) ?? 0; if (c >= max) continue;
    const a = pool.get(p.key); if (!a?.length) { dropped++; continue; }
    const q = a.pop(); perDoc.set(p.doc, c + 1);
    out.push({ pos: rec(p), neg: rec(q), day: p.doc.docid ? p.doc.docid[p.m] : p.doc.key, stream: p.doc.key, negStream: q.doc.key });
  }
  return { pairs: out, dropped, nPos: P.length, info };
}
export const ircClass = (doc, k, i, w) => (doc.nicks.has(w) ? (!doc.topic.has(w) && w !== doc.S[k] ? "P" : null) : [...w].length >= 3 ? "N" : null);
const LEXNEG = new Set(["PROPN", "PUNCT", "SYM", "X", "NUM"]);
/** UD gold: P = PROPN token; N = any lexical non-PROPN token (UPOS not PROPN/PUNCT/SYM/X/NUM), or with open=true only NOUN/VERB/ADJ/ADV. minLen characters. */
export const udClass = (minLen = 3, open = false) => (doc, k, i, w) => { if ([...w].length < minLen) return null; const g = doc.G[k][i]; if (g === "PROPN") return "P"; if (open) return ["NOUN", "VERB", "ADJ", "ADV"].includes(g) ? "N" : null; return LEXNEG.has(g) ? null : "N"; };
