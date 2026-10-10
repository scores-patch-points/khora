// lib-attack.mjs: shared helpers for the attack on R1-first-left-fwc32 (NEW FILE; edits nothing; computes no outcome by itself).
// Requires NAME_COMPANY_PAIRBLOCK=1 in the environment (the confirmer's lib.mjs refuses to load otherwise). Never pass "run" as argv[2].
// pairsX re-implements name-company.pairsOf with switches (tie-break, negative class, key strictness, row filters) so attacks can change ONE thing at a time.
// With default options and the confirmer's rng it reproduces pairsOf row-for-row (checked by sanity.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aucOf } from "../../name-war-and-peace.mjs";
export * from "../confirm-R1-first-left-fwc32/lib.mjs";
import { cvScores, shuffleIn, rngFor, seedFor, mean } from "../confirm-R1-first-left-fwc32/lib.mjs";
export { aucOf };
export const AHERE = path.dirname(fileURLToPath(import.meta.url));
export const CONF = path.join(AHERE, "..", "confirm-R1-first-left-fwc32");
export const rdj = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
export const win1 = (stem) => rdj(path.join(CONF, "windows", stem + ".json"));
export const win2 = (stem) => rdj(path.join(CONF, "windows2", stem + ".json"));
export const listWin = (dir) => fs.readdirSync(path.join(CONF, dir)).filter((x) => x.endsWith(".json")).map((x) => x.replace(/\.json$/, "")).sort();
export const inBand = (x) => x >= 0.45 && x <= 0.55;

const NB = 13;
const oh = (n, k) => { const v = new Array(k).fill(0); v[Math.min(n, k - 1)] = 1; return v; };
export const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
export const cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; };
export const lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
export const fb = (n) => Math.floor(Math.log2(Math.max(1, n)));
const fnv = (s, salt) => { let h = (2166136261 ^ salt) >>> 0; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
/** rank bins exactly as name-company.rankBins (alphabetical tie-break) or with a hashed tie-break (tie = "hash"), or COUNT bins (tie = "count": bin of the neighbour's own count, no rank at all). */
export function rankBinsX(stream, tie = "alpha") {
  const c = new Map(); for (const s of stream) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1);
  const bins = new Map();
  if (tie === "count") { for (const [w, n] of c) bins.set(w, Math.min(11, Math.floor(Math.log2(n)) )); return { bins, count: c }; }
  const cmp = tie === "hash" ? (a, b) => b[1] - a[1] || fnv(a[0], 7) - fnv(b[0], 7) || (a[0] < b[0] ? -1 : 1) : (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
  [...c].sort(cmp).forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  return { bins, count: c };
}
/** bins from a counts map (alphabetical tie-break = confirmer; "hash" = hashed tie-break) */
export function binsOf(c, tie = "hash") { const cmp = tie === "hash" ? (a, b) => b[1] - a[1] || fnv(a[0], 7) - fnv(b[0], 7) || (a[0] < b[0] ? -1 : 1) : (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1), bins = new Map(); [...c].sort(cmp).forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1))))); return bins; }
/** prefix (causal) snapshots: snaps[k] = rank bins computed from the first k*every tokens only */
export function prefixSnaps(stream, every, tie = "hash") { const c = new Map(), snaps = [new Map()]; let g = 0; for (const s of stream) for (const w of s) { c.set(w, (c.get(w) ?? 0) + 1); g += 1; if (g % every === 0) snaps.push(binsOf(c, tie)); } return snaps; }
const slot = (sent, j, bins) => (j < 0 || j >= sent.length ? 12 : bins.get(sent[j]) ?? 11);
export function featuresX(sent, i, bins, count, w) {
  return { L1: oh(slot(sent, i - 1, bins), NB), L2: oh(slot(sent, i - 2, bins), NB), R1: oh(slot(sent, i + 1, bins), NB), R2: oh(slot(sent, i + 2, bins), NB),
    L3: oh(slot(sent, i - 3, bins), NB), L4: oh(slot(sent, i - 4, bins), NB),
    POS: [...oh(ib(i), 4), ...oh(lb(sent.length), 5)], CHAR: oh(cb(w), 4), FREQ: [Math.log2(Math.max(1, count.get(w) ?? 1))],
    raw: { i, n: sent.length, len: [...w].length, count: count.get(w) ?? 1 } };
}
export const OPEN3 = new Set(["NOUN", "VERB", "ADJ"]);
const PROPN1 = new Set(["PROPN"]);
/** Matched pairs. opts: tie ("alpha"|"hash"|"count"), neg (Set of UPOS; default NOUN VERB ADJ), key ("default"|"strict"|"strict+block"), keep(s,i,sents,upos)->bool (applied to positives AND negatives), split (true: separate rng streams for positives and pools so that the positive order does not depend on the negative set),
 *  max (pairs cap), name, tag. rnd: rng for the default (original-order) mode; for split mode pass {P, N}. */
export function pairsX(sents, upos, opts, rnd) {
  const { tie = "alpha", neg = OPEN3, pos: posSet = PROPN1, key = "default", keep = null, max = 600, causal = null } = opts, split = typeof rnd !== "function", n = sents.length;
  const { bins, count } = rankBinsX(sents, tie), seen = new Map(), P = [], N = [], snaps = causal && !causal.off ? prefixSnaps(sents, causal.every, tie === "alpha" ? "alpha" : "hash") : null; let g = 0;
  const cnt = (w) => count.get(w);
  const mkKey = (w, i, L) => {
    const c = cnt(w);
    if (key === "default") return [fb(c), ib(i), cb(w), lb(L)];
    const cc = c <= 6 ? c : 6 + fb(c), ii = i <= 7 ? i : 8 + Math.min(4, Math.floor(Math.log2(i - 6))), ll = Math.min(14, [...w].length), nn = Math.round(4 * Math.log2(Math.max(2, L)));
    return [cc, ii, ll, nn];
  };
  sents.forEach((sent, s) => sent.forEach((w, i) => {
    const gi = g++, k = seen.get(w) ?? 0; seen.set(w, k + 1); if (k !== 0) return; if (causal && gi < causal.minT) return;
    const u = upos[s][i], c = posSet.has(u) ? "P" : neg.has(u) ? "N" : null; if (!c) return;
    if (keep && !keep(s, i, sents, upos)) return;
    const o = { s, i, w, g: gi, key: mkKey(w, i, sent.length) }; if (key === "strict+block") o.key.push(Math.min(3, Math.floor((s / n) * 4)));
    (c === "P" ? P : N).push(o);
  }));
  const pool = new Map(); for (const o of N) { const kk = o.key.join("|"); (pool.get(kk) ?? pool.set(kk, []).get(kk)).push(o); }
  const rP = split ? rnd.P : rnd, rN = split ? rnd.N : rnd;
  for (const a of pool.values()) shuffleIn(a, rN);
  const rows = []; let dropped = 0;
  for (const p of shuffleIn(P, rP)) {
    if (rows.length >= max * 2) break;
    let q = null;
    for (const relax of key === "default" ? [false, true] : [false]) {
      const kk = relax ? null : p.key.join("|");
      const cand = relax ? [...pool.entries()].find(([k2, a]) => a.length && k2.split("|").slice(0, 3).join("|") === p.key.slice(0, 3).join("|")) : [kk, pool.get(kk)];
      if (cand && cand[1]?.length) { q = cand[1].pop(); break; }
    }
    if (!q) { dropped += 1; continue; }
    for (const [o, y] of [[p, 1], [q, 0]]) rows.push({ f: featuresX(sents[o.s], o.i, causal && !causal.off ? snaps[Math.floor(o.g / causal.every)] : bins, count, o.w), y, s: o.s, i: o.i, w: o.w, block: Math.min(3, Math.floor((p.s / n) * 4)), pairId: rows.length >> 1 });
  }
  return { rows, dropped, pairs: rows.length / 2, bins, count };
}
export const splitRng = (opts, name, tag) => ({ P: rngFor(seedFor("attack-R1", name, "P" + tag)), N: rngFor(seedFor("attack-R1", name, "N" + (opts.tag ?? "") + tag)) });
/** CV AUC of an arm given as a function row -> feature vector (same learner and CV as the confirmer's cvAuc). */
export const cvArm = (rows, fn) => { const y = rows.map((r) => r.y), sc = cvScores(rows.map(fn), y, rows.map((r) => r.block)); return aucOf(sc, y); };
export const A = {
  LEFT: (r) => [...r.f.L1, ...r.f.L2], L12: (r) => [...r.f.L1, ...r.f.L2], POSITION: (r) => r.f.POS, RIGHT: (r) => [...r.f.R1, ...r.f.R2], L34: (r) => [...r.f.L3, ...r.f.L4], L1only: (r) => r.f.L1,
  CHARLEN: (r) => r.f.CHAR, FREQ: (r) => r.f.FREQ,
  /** FINE rivals: exact sentence index, sentence length, character length and form count as one-hots (finer than the matching key) */
  FINE: (r) => [...oh(r.f.raw.i, 16), ...oh(Math.round(2 * Math.log2(Math.max(2, r.f.raw.n))), 14), ...oh(r.f.raw.len, 14), ...oh(r.f.raw.count, 12)],
  FINEPOS: (r) => [...oh(r.f.raw.i, 16), ...oh(Math.round(2 * Math.log2(Math.max(2, r.f.raw.n))), 14), [r.f.raw.i / r.f.raw.n]],
};
/** zero-shot paired AUC of a fixed score over rows laid out as consecutive (positive, negative) pairs */
export function pairedScore(rows, fn) { let w = 0, n = 0; for (let k = 0; k + 1 < rows.length; k += 2) { const a = fn(rows[k]), b = fn(rows[k + 1]); w += a > b ? 1 : a === b ? 0.5 : 0; n += 1; } return n ? w / n : null; }
export const bin1 = (oh1) => oh1.indexOf(1);
export const S2r = (r) => bin1(r.f.L1) + bin1(r.f.L2);
export const S1r = (r) => bin1(r.f.L1);
/** logical filter helpers (use gold UPOS, EVALUATION ONLY: they select which rows are scored, they never enter a score) */
export const leftNotName = (s, i, sents, upos) => !(i >= 1 && upos[s][i - 1] === "PROPN") && !(i >= 2 && upos[s][i - 2] === "PROPN");
export const clades = { Slavic: "rus pol ukr ces slk hrv srp slv bul", Germanic: "eng deu nld swe dan nob afr", Romance: "spa fra ita por cat glg ron", Baltic: "lit lav", Celtic: "gle cym", IndoAryan: "hin urd mar", Iranian: "fas", Greek: "ell", Armenian: "hye", Semitic: "arb heb mlt", Sinitic: "cmn lzh", Japonic: "jpn", Koreanic: "kor", Turkic: "tur uig", Uralic: "fin est hun", Austronesian: "ind", Austroasiatic: "vie", Dravidian: "tam tel", Kartvelian: "kat", Basque: "eus", NigerCongo: "wol" };
export const cladeOf = Object.fromEntries(Object.entries(clades).flatMap(([c, v]) => v.split(" ").map((l) => [l, c])));
export const stats = { mean, shuffleIn, rngFor, seedFor };
