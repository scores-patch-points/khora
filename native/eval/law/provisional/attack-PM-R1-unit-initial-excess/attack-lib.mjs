// attack-PM-R1-unit-initial-excess/attack-lib.mjs -- shared INFRASTRUCTURE (no test, no result) for attacks A (leakage/confounds), B (forking paths), C (count rival) on rule PM-R1 (pInitX).
// Imports the confirmer's lib.mjs (prep, featuresOf, pairAuc, loaders, rng). Adds: a pair builder whose matching key can be made STRICTER than the confirmer's (count tolerance, exact index,
// exact unit length, exact character length, local-count and recency matching) and a cell evaluator. NEW FILE; edits nothing; the NAME_COMPANY_PAIRBLOCK env is set by the confirmer's lib.
import fs from "node:fs"; import path from "node:path";
const CL = await import("../confirm-PM-R1-unit-initial-excess/lib.mjs");
export const { prep, featuresOf, pairAuc, rngFor, seedFor, udBase, ircBase, bookBase, codeBase, readConllu, UD_DEFS, IRC_DEFS, BOOK_DEFS, CODE_DEFS, round, mean, quantile, shuffleIn, sha256, headerSha, shamOf, shuffledOf, FEATS, splitSentences, labelBook } = CL;
export const PRE = "attack-pm-r1";
export const MAN = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/khora/native/eval/law/provisional/confirm-PM-R1-unit-initial-excess/data/manifest.json", "utf8"));
export const IRCDIR = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc/";
// bucket functions identical to name-company.mjs (the confirmer's matching key)
export const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
export const cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; };
export const lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
export const fb = (n) => Math.floor(Math.log2(Math.max(1, n)));
const ul = (n) => (n <= 15 ? n : 16 + Math.floor(Math.log2(n / 16))); // exact unit length up to 15, then octave buckets
export const wr = (x, y) => (x > y ? 1 : x === y ? 0.5 : 0);

/** local structure of every mention of form w: dist[j] = units since the previous mention (Infinity for j=0); loc[j] = number of OTHER mentions within +-W units. memoised per P. */
export function localOf(P, w, W = 25) {
  P._loc ??= new Map(); const key = w + "|" + W; let r = P._loc.get(key); if (r) return r;
  const o = P.occ.get(w), n = o.length / 2, dist = new Array(n), loc = new Array(n); let a = 0, b = 0;
  for (let j = 0; j < n; j++) { dist[j] = j === 0 ? Infinity : o[2 * j] - o[2 * (j - 1)]; const s = o[2 * j]; while (o[2 * a] < s - W) a++; if (b < j) b = j; while (b + 1 < n && o[2 * (b + 1)] <= s + W) b++; loc[j] = b - a; }
  r = { dist, loc }; P._loc.set(key, r); return r;
}
const lg = (d) => (d === Infinity ? 99 : Math.floor(Math.log2(1 + d)));

/** matching specs: rung 0 reproduces the confirmer's key; later rungs only ADD constraints */
export const SPECS = {
  K0: { relax: true },
  K1: { count: true },                                   // K0 key (no relaxation) + total count within tol(n)
  K2: { count: true, exactI: true, exactUL: true },      // + exact unit index, exact unit length (<=15)
  K3: { count: true, exactI: true, exactUL: true, exactChar: true },
  K4: { count: true, exactI: true, exactUL: true, exactChar: true, local: true }, // + local count (+-25 units) within 1 and recency octave
  K5: { count: true, local: true, span: true },                                     // (attack C2) K1 + local count + recency octave + SPAN octave exact (dispersion-matched)
  K6: { count: true, exactI: true, exactUL: true, local: true, span: true },        // (attack C2) K5 + exact index + exact unit length
};
export const tolOf = (n) => (n <= 20 ? 1 : Math.max(1, Math.floor(0.05 * n)));

function formCap(pairs, cap, maxPairs) {
  const cp = new Map(), cn = new Map(), out = [];
  for (const [p, q] of pairs) { if (out.length >= maxPairs) break; const a = cp.get(p.w) ?? 0, b = cn.get(q.w) ?? 0; if (a >= cap || b >= cap) continue; cp.set(p.w, a + 1); cn.set(q.w, b + 1); out.push([p, q]); }
  return out;
}
/** enumerate eligible LATER occurrences of a stream with class; def(gold, form) -> "P" | "N" | null. mode FULL: form has >=3 mentions; CAUSAL4: >=4 earlier mentions. unitOk(s) optionally filters units. */
export function occsOf(P, gold, def, mode, unitOk = null, name = null) {
  const out = [];
  P.stream.forEach((u, s) => { if (unitOk && !unitOk(s)) return; u.forEach((w, i) => {
    const k = P.kArr[s][i]; if (k < 1) return; const o = P.occ.get(w), n = o.length / 2;
    if (mode === "CAUSAL4" ? k < 4 : n < 3) return;
    const c = def(gold[s][i], w); if (!c) return; out.push({ s, i, w, k, n, len: u.length, c, P, name });
  }); });
  return out;
}
/** build matched pairs under spec; returns {pairs:[[p,q]], dropped}. rnd: seeded rng. */
export function buildPairs(P, occs, spec, rnd, { maxPairs = 600, cap = 3, rawMax = 3000, W = 25, mode = "FULL" } = {}) {
  const key = (o) => [fb(o.n), spec.exactI ? Math.min(o.i, 30) : ib(o.i), spec.exactChar ? [...o.w].length : cb(o.w), spec.exactUL ? ul(o.len) : lb(o.len), ...(spec.span ? [o.sp] : [])].join("|");
  const pos = [], neg = new Map();
  for (const o of occs) { if (spec.local) { const L = localOf(o.P ?? P, o.w, W); o.loc = L.loc[o.k]; o.rec = lg(L.dist[o.k]); } if (spec.span) { const oc = (o.P ?? P).occ.get(o.w), nn = oc.length / 2, d = mode === "CAUSAL4" ? o.s - oc[2 * (o.k - 4)] : oc[2 * (nn - 1)] - oc[0]; o.sp = Math.floor(Math.log2(1 + d)); } if (o.c === "P") pos.push(o); else { const kk = key(o); (neg.get(kk) ?? neg.set(kk, []).get(kk)).push(o); } }
  for (const a of neg.values()) shuffleIn(a, rnd);
  const out = []; let dropped = 0;
  for (const p of shuffleIn(pos, rnd)) {
    if (out.length >= rawMax) break;
    let q = null; const arr = neg.get(key(p));
    if (arr?.length) {
      for (let t = arr.length - 1; t >= 0; t--) { const c = arr[t];
        if (spec.count && Math.abs(c.n - p.n) > tolOf(Math.max(c.n, p.n))) continue;
        if (spec.local && (Math.abs(c.loc - p.loc) > 1 || c.rec !== p.rec)) continue;
        q = c; arr.splice(t, 1); break; }
    }
    if (!q && spec.relax) { const e = [...neg.entries()].find(([k2, a]) => a.length && k2.split("|").slice(0, 3).join("|") === key(p).split("|").slice(0, 3).join("|")); if (e) q = e[1].pop(); }
    if (!q) { dropped++; continue; } out.push([p, q]);
  }
  return { pairs: formCap(out, cap, maxPairs), dropped };
}
/** evaluate a feature function over pairs -> AUC with cluster bootstrap (clusters = positive form) and permutation p */
export function evalPairs(P, pairs, mode, tag, { B = 400, Bperm = 1000, featFn = null, name = "doc" } = {}) {
  if (!pairs.length) return { pairs: 0 };
  const f = featFn ?? ((o) => featuresOf(o.P ?? P, o.s, o.i, mode).pInitX), vp = pairs.map(([p]) => f(p)), vn = pairs.map(([, q]) => f(q)), cl = pairs.map(([p]) => (p.name ?? name) + "|" + p.w);
  const rnd = rngFor(seedFor(PRE, "boot", tag, name, mode)), r = pairAuc(vp, vn, cl, B, rnd, Bperm);
  const ctl = (fn) => round(pairAuc(pairs.map(([p]) => fn(p)), pairs.map(([, q]) => fn(q)), cl, 0, rnd).auc);
  return { pairs: pairs.length, ...r, posCtl: ctl((o) => ib(o.i)), lenCtl: ctl((o) => [...o.w].length), slenCtl: ctl((o) => o.len), logn: ctl((o) => Math.log2(o.n)), mP: round(mean(vp)), mN: round(mean(vn)) };
}
export const sign = (c) => (!c || !c.pairs ? null : c.lo > 0.5 && c.auc >= 0.53 ? "POS" : c.hi < 0.5 && c.auc <= 0.47 ? "NEG" : "FLAT");
export const validCell = (c) => c && c.pairs >= 60 && c.posCtl >= 0.45 && c.posCtl <= 0.55;
export const lowMed = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null);
export const trueMed = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b), n = s.length; return round(n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2); };
export const t0 = Date.now();
export const log = (m) => console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s ${m}`);
export const CPRE = CL.PRE; // the confirmer's seed prefix: windows are rebuilt from seedFor(CPRE, treebank, "window") so streams are IDENTICAL to the confirmer's
export const udWindow = (tb) => udBase(`ud-${tb}-train`, MAN.ud.files[tb], { budget: MAN.ud.windowTokens, rnd: rngFor(seedFor(CPRE, tb, "window")) });
export const ircFiles = (ids) => ids.map((id) => path.join(IRCDIR, id));

// ── IRC (own loader = the confirmer's ircBase rules, plus speaker and day per message; stream identity checked against ircBase) ─────────────────
export const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const toks = (t) => [...String(t).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
export function ircLoad(name, files) {
  const stream = [], gold = [], spk = [], day = [];
  files.forEach((file, di) => {
    const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean), spoke = new Map();
    for (const [, n] of lines) spoke.set(n, (spoke.get(n) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase(), nicks = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const msgs = lines.map(([, n, t]) => ({ n: form(n), t: toks(t) })).filter((m) => m.t.length >= 1), tot = new Map(); let all = 0;
    for (const m of msgs) for (const w of m.t) { tot.set(w, (tot.get(w) ?? 0) + 1); all++; }
    const topic = new Set([...nicks].filter((n) => (tot.get(n) ?? 0) / all >= 1 / 300));
    for (const m of msgs) { stream.push(m.t); gold.push(m.t.map((w) => (nicks.has(w) && !topic.has(w) && w !== m.n ? "P" : !nicks.has(w) && [...w].length >= 3 ? "N" : null))); spk.push(m.n); day.push(di); }
  });
  return { name, P: prep(stream), gold, spk, day };
}
