// common.mjs — attack-R2 (lens chat-scope). OWN implementation of day loading, the R2 score and its rivals, gold variants, and a generalised matcher.
// Written from the rule text; shares NO code with confirm-R2_first_mention_lookahead/lib.mjs (only the tokenisation DEFINITION: lowercase word forms, digits-only dropped).
// Observables (scores) read ONLY the token stream T (and message boundaries). Speaker field / spoke counts are read only by the gold labeller and by clearly-marked DIAGNOSTICS.
import fs from "node:fs";
export const ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const LANG = { ubuntu: "en", kubuntu: "en", xubuntu: "en", "ubuntu-server": "en", "ubuntu-de": "de", "ubuntu-es": "es", "ubuntu-it": "it" };
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export const nickForm = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
export const rnd4 = (x) => (typeof x === "number" && Number.isFinite(x) ? Math.round(x * 10000) / 10000 : x);
export function rngOf(...parts) { let h = 2166136261; for (const c of parts.join("|")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } let a = h || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const era = (y) => (y <= 2007 ? "2004-07" : y <= 2011 ? "2008-11" : "2012-15");
export const lb = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
export const ub = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
/** mode: real | msgshuf (permute message order) | wordshuf (permute tokens inside each message) | blockshuf (permute messages inside blocks of 64)
 *        | firstswap (permute FIRST words across messages, rest stays) | restshuf (first words stay, the remaining tokens are dealt out at random to other messages, lengths kept). */
export function loadDay(key, mode = "real") {
  const [channel, file] = key.split("/"), lines = [];
  for (const l of fs.readFileSync(`${ROOT}/${key}`, "utf8").split("\n")) { const m = /^<([^>]+)>\s?(.*)$/.exec(l); if (m) lines.push([m[1], m[2]]); }
  const spoke = new Map(); for (const [n] of lines) { const f = nickForm(n); spoke.set(f, (spoke.get(f) ?? 0) + 1); }
  let M = lines.map(([n, t]) => ({ s: nickForm(n), t: toks(t), bang: /^\s*!/.test(t) })).filter((m) => m.t.length >= 1);
  const r = rngOf("attackR2-load", key, mode);
  if (mode === "msgshuf") M = shuffle(M.slice(), r);
  if (mode === "blockshuf") { const o = []; for (let b = 0; b < M.length; b += 64) o.push(...shuffle(M.slice(b, b + 64), r)); M = o; }
  if (mode === "wordshuf") M = M.map((m) => ({ ...m, t: shuffle(m.t.slice(), r) }));
  if (mode === "firstswap") { const f = shuffle(M.map((m) => m.t[0]), r); M = M.map((m, k) => ({ ...m, t: [f[k], ...m.t.slice(1)] })); }
  if (mode === "restshuf") { const rest = shuffle(M.flatMap((m) => m.t.slice(1)), r); let p = 0; M = M.map((m) => ({ ...m, t: [m.t[0], ...rest.slice(p, (p += m.t.length - 1))] })); }
  const T = M.map((m) => m.t), S = M.map((m) => m.s), BANG = M.map((m) => m.bang), tot = new Map(); let all = 0;
  for (const t of T) for (const w of t) { tot.set(w, (tot.get(w) ?? 0) + 1); all++; }
  return { key, channel, lang: LANG[channel], year: Number(file.slice(0, 4)), era: era(Number(file.slice(0, 4))), N: T.length, nTok: all, T, S, BANG, spoke, tot, mode, ix: buildIx(T) };
}
const push = (mp, w, v) => (mp.get(w) ?? mp.set(w, []).get(w)).push(v);
export function buildIx(T) {
  const count = new Map(), msgIdx = new Map(), initIdx = new Map(), secIdx = new Map(), lastIdx = new Map(), first = new Map();
  T.forEach((m, k) => { const seen = new Set(); m.forEach((w, i) => { count.set(w, (count.get(w) ?? 0) + 1); if (!first.has(w)) first.set(w, [k, i]); if (!seen.has(w)) { seen.add(w); push(msgIdx, w, k); } }); push(initIdx, m[0], k); if (m.length > 1) push(secIdx, m[1], k); push(lastIdx, m[m.length - 1], k); });
  return { count, msgIdx, initIdx, secIdx, lastIdx, first };
}
const oth = (a, m) => (a ? a.length - (a[lb(a, m)] === m ? 1 : 0) : 0);
const near = (a, m, W) => (a ? ub(a, m + W) - lb(a, m - W) - (a[lb(a, m)] === m ? 1 : 0) : 0);
const fwd = (a, m, W) => (a ? ub(a, m + W) - ub(a, m) : 0);
export const ibk = (i) => (i <= 3 ? i : i <= 5 ? 4 : i <= 9 ? 5 : 6);
export const clb = (w) => Math.min(11, [...w].length);
export const mlb = (n) => (n <= 7 ? n : n <= 9 ? 8 : n <= 11 ? 9 : n <= 14 ? 10 : n <= 19 ? 11 : n <= 27 ? 12 : n <= 40 ? 13 : 14);
/** All FIRST occurrences (stream order) of forms with >= 3 characters, with scores. Label-free except the diagnostic fields (sp, self, topic) used only by gold(). */
export function candidates(doc, minCl = 3) {
  const { ix, T, N } = doc, out = [];
  for (const [w, [m, i]] of ix.first) {
    const cl = [...w].length; if (cl < minCl) continue; const c = ix.count.get(w), msgs = ix.msgIdx.get(w), inits = ix.initIdx.get(w), nxt = msgs[lb(msgs, m + 1)];
    const rec = { day: doc.key, channel: doc.channel, lang: doc.lang, era: doc.era, big: N >= 5000, w, m, i, L: T[m].length, cl, c, lc: Math.log2(c), rel: m / N, rem: Math.log2(1 + N - m),
      sp: doc.spoke.get(w) ?? 0, self: doc.S[m] === w, topic: (doc.tot.get(w) ?? 0) / doc.nTok >= 1 / 300, init0: i === 0,
      INIT_Tinf: oth(inits, m), CNT_Tinf: oth(msgs, m), SEC_Tinf: oth(ix.secIdx.get(w), m), LAST_Tinf: oth(ix.lastIdx.get(w), m), gap: nxt === undefined ? 20 : Math.log2(1 + nxt - m) };
    for (const W of [8, 32, 128, 512]) { rec[`CNT_T${W}`] = near(msgs, m, W); rec[`INIT_T${W}`] = near(inits, m, W); }
    for (const W of [8, 32, 128]) { rec[`INIT_F${W}`] = fwd(inits, m, W); rec[`CNT_F${W}`] = fwd(msgs, m, W); }
    out.push(rec);
  }
  return out;
}
/** Gold variants. g = {min: positive speaker threshold (messages that day), max: optional upper, negClean: negatives must be forms of NO speaker, topic: exclude topic-word nicks}. Baseline = the rule's gold = {min:3, negClean:false, topic:true}.
 *  Baseline negatives: forms equal to no nick-form of a >=3-message speaker. */
export const GOLD0 = { min: 3, max: Infinity, negClean: false, topic: true };
export function gold(r, g = GOLD0) {
  if (r.sp >= g.min && r.sp <= g.max) return (!g.topic || !r.topic) && !r.self ? "P" : null;
  if (g.negClean) return r.sp === 0 ? "N" : null;
  return r.sp >= 3 ? null : "N";
}
/** Generalised matcher. keyFn(rec) -> cell string. Positives in random order, negative drawn at random from the cell pool, no replacement; unmatched positives dropped. */
export function matchPairs(cands, g, keyFn, seed, tag = "") {
  const r = rngOf("attackR2-match", cands[0]?.day ?? "", tag, seed), P = [], pool = new Map();
  for (const x of cands) { const l = gold(x, g); if (l === "P") P.push(x); else if (l === "N") { const k = keyFn(x); (pool.get(k) ?? pool.set(k, []).get(k)).push(x); } }
  for (const a of pool.values()) shuffle(a, r); const pairs = []; let dropped = 0;
  for (const p of shuffle(P, r)) { const a = pool.get(keyFn(p)); if (!a?.length) { dropped++; continue; } pairs.push({ pos: p, neg: a.pop(), day: p.day }); }
  return { pairs, dropped, nPos: P.length };
}
export const K0 = (Q = 4) => (x) => [ibk(x.i), Math.floor(Q * x.lc), clb(x.w), mlb(x.L)].join("|");
