// confirm-relatedness-romance-set/lib-fresh.mjs — DATA PREPARATION HELPERS ONLY (windows of UD TRAIN text, pair-row caches). No probe is fitted and no AUC is computed here.
// NEW FILE. Imports the scoper's (frozen, hash-checked by confirm.mjs) lib.mjs/groups.mjs read-only and edits none of them. Env NAME_COMPANY_PAIRBLOCK=1 is required before node starts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { ARMS, pairsOf, packRow, unpackRow, readConllu, rngFor, seedFor, shuffleIn, round } from "../family-vs-relatedness/lib.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TB = "/private/tmp/claude-501/tb";           // train.conllu of the SAME treebanks as ud-eval (cat/spa AnCora, fra GSD, ita ISDT, por GSD, glg CTG, ron RRT ...)
export const UDE = "/private/tmp/claude-501/ud-eval";     // dev/test of the same treebanks (used ONLY to remove duplicate sentences from the train windows)
export const UDD = "/Users/mlacy/Documents/data/ud";      // DIFFERENT treebanks for the cross-treebank cells (es_gsd, pt_bosque, gl_treegal)
export const WINDOW_TOKENS = 30000;                       // non-PUNCT word units per window (pre-registered; glg's train has 71.9k so two disjoint windows fit)
export const SETS = ["A", "B", "C"];                      // A, B = two disjoint contiguous windows; C = a spread window (10 chunks of 3000 tokens, one per decile of the train file)
export const CHUNKS = 10;
export const sha = (s) => createHash("sha256").update(s).digest("hex");

/** roster stem -> train file. kor is Korean-GSD (as the R2 prep does); cross-treebank targets are named by a key that is NOT in groups.mjs LANG. */
export const trainFile = (stem) => (stem === "kor" ? path.join(TB, "kor-gsd", "train.conllu") : path.join(TB, stem, "train.conllu"));
export const CROSS = { spaGSD: { lang: "spa", file: `${UDD}/es_gsd/es_gsd-ud-train.conllu`, note: "UD_Spanish-GSD (ud-eval spa is AnCora: different annotators, different text)" },
  porBOS: { lang: "por", file: `${UDD}/pt_bosque/pt_bosque-ud-train.conllu`, note: "UD_Portuguese-Bosque (ud-eval por is pt_gsd)" },
  glgTG: { lang: "glg", file: `${UDD}/gl_treegal/gl_treegal-ud-train.conllu`, note: "UD_Galician-TreeGal (ud-eval glg is CTG)" } };

const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
const key = (s) => s.join(" ");
/** sentences of ud-eval dev+test of a stem (as join-keys): train sentences equal to one of these are removed before windowing. */
export function banSet(stem) {
  const ban = new Set();
  for (const sp of ["dev", "test"]) { const p = path.join(UDE, stem, `${sp}.conllu`); if (fs.existsSync(p)) for (const s of readConllu(p).sents) ban.add(key(s)); }
  return ban;
}
/** smallest end e > s with cum[e]-cum[s] >= W, or -1. cum[i] = tokens before sentence i (length N+1). */
function endFor(cum, s, W) { const N = cum.length - 1; if (cum[N] - cum[s] < W) return -1; let lo = s + 1, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] - cum[s] >= W) hi = m; else lo = m + 1; } return lo; }
/** two disjoint contiguous windows of >= W tokens: A uniform over valid starts, B uniform over the valid starts whose window does not overlap A (null if none). If the file has < W tokens the whole file is A. */
export function pickWindows(cum, W, rnd) {
  const N = cum.length - 1;
  if (cum[N] < W) return { A: [0, N], B: null, whole: true };
  const valid = []; for (let s = 0; s < N; s++) if (endFor(cum, s, W) > 0) valid.push(s); else break;
  const sA = valid[Math.floor(rnd() * valid.length)], eA = endFor(cum, sA, W);
  const cand = valid.filter((s) => s >= eA || endFor(cum, s, W) <= sA);
  if (!cand.length) return { A: [sA, eA], B: null, whole: false };
  const sB = cand[Math.floor(rnd() * cand.length)];
  return { A: [sA, eA], B: [sB, endFor(cum, sB, W)], whole: false };
}
/** set C: CHUNKS chunks of W/CHUNKS tokens, chunk i starting uniformly inside the i-th tenth of the file's token positions (so the window spans the file's genres); whole file if < W tokens. Returns [[s,e],...]. */
export function pickChunks(cum, W, rnd) {
  const N = cum.length - 1, T = cum[N]; if (T < W) return [[0, N]];
  const L = Math.floor(W / CHUNKS), out = [];
  for (let i = 0; i < CHUNKS; i++) {
    const lo = Math.floor((i * T) / CHUNKS), hi = Math.floor(((i + 1) * T) / CHUNKS) - L, p = lo + Math.floor(rnd() * Math.max(1, hi - lo + 1));
    let s = 0, b = N; while (s < b) { const m = (s + b) >> 1; if (cum[m + 1] > p) b = m; else s = m + 1; }
    if (out.length) s = Math.max(s, out[out.length - 1][1]);       // chunks never share a sentence
    const e = endFor(cum, s, L); out.push([s, e < 0 ? N : e]);
  }
  return out;
}
/** build the windows of one source: returns {A:{sents,upos,meta}, B:{...}|null}. */
export function windowsOf(name, file, banStem) {
  const { sents, upos } = readConllu(file), ban = banSet(banStem), keep = [];
  sents.forEach((s, i) => { if (!ban.has(key(s))) keep.push(i); });
  const S = keep.map((i) => sents[i]), U = keep.map((i) => upos[i]), cum = [0]; for (const s of S) cum.push(cum[cum.length - 1] + s.length);
  const w = pickWindows(cum, WINDOW_TOKENS, rngFor(seedFor("conf-rel", "window", name))), out = {};
  const ch = pickChunks(cum, WINDOW_TOKENS, rngFor(seedFor("conf-rel", "windowC", name))); w.C = ch;
  for (const set of SETS) {
    const r = w[set]; if (!r) { out[set] = null; continue; }
    const rr = set === "C" ? r : [r], ss = rr.flatMap(([a, b]) => S.slice(a, b)), uu = rr.flatMap(([a, b]) => U.slice(a, b));
    out[set] = { sents: ss, upos: uu, meta: { name, set, file, sentenceRange: r, sentences: ss.length, tokens: rr.reduce((t, [a, b]) => t + cum[b] - cum[a], 0), trainSentences: sents.length, removedDupOfDevTest: sents.length - keep.length, trainTokensAfterDedupe: cum[cum.length - 1], whole: w.whole, textSha256: sha(ss.map(key).join("\n")) } };
  }
  return out;
}
/** a doc for pairsOf from a window; shuffled = within-sentence permutation (company destroyed, sentence length kept) with the lib's own scheme. */
export function docOf(name, sents, upos, shuffled = false) {
  let S = sents, U = upos;
  if (shuffled) { const rnd = rngFor(seedFor("conf-rel", "shuffle", name)); const idx = S.map((s) => shuffleIn(s.map((_, i) => i), rnd)); S = S.map((s, k) => idx[k].map((j) => s[j])); U = U.map((u, k) => idx[k].map((j) => u[j])); }
  const n = S.length;
  return { name, stream: S, cls: (s, i) => (U[s][i] === "PROPN" ? "P" : OPEN.has(U[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) };
}
export const cachePath = (set, name, stratum, shuf) => path.join(HERE, "cache", set, `${name}.${stratum}${shuf ? ".shuf" : ""}.json`);
export function writeCache(set, name, stratum, shuf, pr) { fs.mkdirSync(path.join(HERE, "cache", set), { recursive: true }); fs.writeFileSync(cachePath(set, name, stratum, shuf), JSON.stringify({ name, set, stratum, shuf, pairs: pr.pairs, dropped: pr.dropped, rows: pr.rows.map(packRow) })); }
/** load a cached window/stratum as the lib's language object {stem,pairs,rows,y,block,X:{BOTH,LEFT,POSITION}} or null. */
export function loadFresh(set, name, stratum, shuf = false) {
  const p = cachePath(set, name, stratum, shuf); if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, "utf8")), rows = j.rows.map(unpackRow), X = {};
  for (const a of ["BOTH", "LEFT", "POSITION"]) X[a] = rows.map((r) => ARMS[a](r.f));
  return { stem: name, split: `train${set}`, stratum, pairs: j.pairs, dropped: j.dropped, rows, y: rows.map((r) => r.y), block: rows.map((r) => r.block), X };
}
export { pairsOf, rngFor, seedFor, round };
