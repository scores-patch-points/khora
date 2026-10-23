// word-vectors.js — the local ALIGNED word vectors (one space for en, es, fr, de, ja; built by eval/meaning/atoms/build-vectors.mjs from MUSE
// and fastText): how near two words or phrases are in meaning, across languages, with no model. A phrase is the mean of its words' vectors;
// a word of a language written without spaces (ja) is cut into the longest words the vocabulary holds.
//   loadVectors(dir) → { has(lang), vec(lang, text) → Float32Array | null, sim(la, a, lb, b) → cosine | null }
import fs from "node:fs";
import path from "node:path";

const low = (s) => String(s ?? "").normalize("NFKC").toLowerCase();
const NOSPACE = new Set(["ja", "zh"]);
const STOP = new Set(["the", "a", "an", "of", "de", "del", "la", "le", "el", "los", "las", "les", "der", "die", "das", "des", "du", "y", "et", "und", "and", "in", "en", "à", "to", "is", "be", "has", "von", "no", "の", "は", "が", "を", "に", "で", "と"]);
export function loadVectors(dir) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")), D = meta.dim, L = {};
  const lang = (l) => {
    if (L[l] !== undefined) return L[l];
    if (!meta.langs.includes(l)) return (L[l] = null);
    const words = fs.readFileSync(path.join(dir, `${l}.words`), "utf8").split("\n"), idx = new Map();
    words.forEach((w, i) => { const k = low(w); if (!idx.has(k)) idx.set(k, i); });
    const b = fs.readFileSync(path.join(dir, `${l}.i8`)), i8 = new Int8Array(b.buffer, b.byteOffset, b.length);
    const s = fs.readFileSync(path.join(dir, `${l}.scale`)), sc = new Float32Array(s.buffer.slice(s.byteOffset, s.byteOffset + s.length));
    let maxLen = 0; if (NOSPACE.has(l)) for (const k of idx.keys()) maxLen = Math.max(maxLen, [...k].length);
    return (L[l] = { idx, i8, sc, maxLen: Math.min(maxLen, 8) });
  };
  const add = (acc, T, i) => { const s = T.sc[i]; for (let d = 0; d < D; d++) acc[d] += T.i8[i * D + d] * s; };
  const tokens = (l, text) => {
    const T = lang(l); if (!T) return [];
    const ws = low(text).replace(/[“”"«»()\[\],.:;!?’'_]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d/.test(w));
    if (!NOSPACE.has(l)) return ws.map((w) => T.idx.get(w)).filter((i) => i != null);
    const out = [];
    for (const w of ws) { const cs = [...w]; let i = 0; while (i < cs.length) { let hit = null, n = 0; for (let k = Math.min(T.maxLen, cs.length - i); k >= 1; k--) { const sub = cs.slice(i, i + k).join(""); if (T.idx.has(sub) && !STOP.has(sub)) { hit = T.idx.get(sub); n = k; break; } } if (hit != null) { out.push(hit); i += n; } else i++; } }
    return out;
  };
  const vec = (l, text) => {
    // a word written in plain Latin letters in a predicate is an English key (atoms.js), so it is looked up in English first
    const T = lang(l); let ids = tokens(l, text), from = T;
    if (l !== "en" && /^[a-z_\s]+$/.test(low(text))) { const e = tokens("en", text); if (e.length >= ids.length) { ids = e; from = lang("en"); } }
    if (!ids.length || !from) return null;
    const acc = new Float32Array(D); for (const i of ids) add(acc, from, i);
    let n = 0; for (const x of acc) n += x * x; n = Math.sqrt(n) || 1; for (let d = 0; d < D; d++) acc[d] /= n;
    return acc;
  };
  const sim = (la, a, lb, b) => { const x = vec(la, a), y = vec(lb, b); if (!x || !y) return null; let s = 0; for (let d = 0; d < D; d++) s += x[d] * y[d]; return s; };
  return { meta, has: (l) => !!lang(l), vec, sim };
}
