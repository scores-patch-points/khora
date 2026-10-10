// attack-R1_first_slot_share/postdiag.mjs: POST-HOC EXPLORATORY diagnostics after attacks A, B, C (no kill bars; these interpret the numbers, they cannot confirm the rule). Usage: node postdiag.mjs p1|p2|p3|p4 (never "run").
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this script; status: POST-HOC, announced as such) ═══
// DISCLOSURE. I had read ALL results of attackA.mjs, attackB.mjs, attackC.mjs before writing this header (see their headers and results/*.json): S0 pairs RC 0.871; strict keys 1-1 RC S1 0.81, S2 0.74, S3 0.69 (VOID: rec control 0.552), S4 0.68, S5 0.77, S6 0.81, S7 0.72, pooled-stratified RC 0.86 0.83 0.80 0.79 0.84 0.83 0.78;
//   facets 1-1 INIT/NONINIT: S0 0.877/0.824, S1 0.855/0.747, S3 0.79/0.66 (VOID), S6 0.863/0.722; rivals on S0 pairs: rec 0.70, c32 0.74, c128 0.76, count-only probe 0.77, wordshuf same rows 0.575, msgshuf same rows 0.872; history ladder b=1 0.77 ... b>=9 0.88;
//   NONEN pooled D+C 1-1 0.873 (lc control 0.553, out of band), stratified 0.895; big EN days 29 of 30 AUC >= 0.70 (ubuntu 2010-07-15 0.678); era permutation p 0.21; gold forks all >= 0.83 (minSpoke 1: 0.829); threshold 0.67 on R TPR 0.71 FPR 0.11.
// QUESTIONS (the numbers above leave them open): (p1) the headline AUC is MENTION-weighted; is it form-balanced? (p2) form-level coverage: of the gold nick forms of a big day, what share is flagged at least once, by number of LATER mentions; and what share of ever-flagged forms are nicks?
//   (p3) NONINIT vs INIT under strict causal keys with the pooled stratified estimator (the 1-1 NONINIT cells were VOID or weak). (p4) EVIDENCE-MIX vs RECENCY: the strict keys S2, S3, S7 lose 0.13-0.18 AUC against S0; is that (a) the rule using recency, or (b) the strict keys selecting low-evidence pairs?
//   Test: on the SAME strict-key rows compare ishare with ishareMS (message order permuted, recency destroyed; the type-level counts a and b are kept in distribution), and reweight S0 pairs to the pos.b distribution of the strict-key pairs.
// DATA. EN, set RC = R (14 reserve) + C (23 confirm) EN days; p2 on RC days with >= 1500 messages. Gold, score, S0..S7 keys, matcher: lib.mjs / match.mjs (own).
// PREDICTIONS (P, made now): p1 form-balanced AUC in [0.74,0.85] (0.6), lower than the mention-weighted 0.871 (0.8); p2 share of nick forms with >= 2 LATER mentions ever flagged in [0.35,0.75] (0.6), with exactly 1 LATER mention flagged: 0 (0.95), share of ever-flagged forms that are nicks in [0.5,0.8] (0.55);
//   p3 NONINIT stratified under S7 in [0.62,0.78] (0.6) and below INIT S7 (0.9); p4 ishareMS within 0.04 of ishare on S2/S3/S7 rows (0.7); reweighted S0 within 0.05 of the S3 AUC (0.5).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, buildIx, feat, laterOccs, SETS, headerSha, LANG, rngOf, shuffleIn } from "./lib.mjs";
import { matchDay, pAuc, bootPairs, byDay, byForm, strat, sumStrat, round } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), part = process.argv[2], EN = (k) => LANG[k.split("/")[0]] === "en", t0 = Date.now(), log = (m) => console.error(((Date.now() - t0) / 1000).toFixed(0) + "s " + m), out = { part, headerSha256: SHA, status: "POST-HOC exploratory" };
const RC = [...SETS.R, ...SETS.C].filter(EN), mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const withMS = (d, pairs) => { const r = rngOf("post-ms", d.key), n = d.T.length, perm = shuffleIn([...Array(n).keys()], r), Tm = Array(n); perm.forEach((to, from) => { Tm[to] = d.T[from]; }); const ix = buildIx(Tm); for (const p of pairs) for (const s of [p.pos, p.neg]) { s.ishareMS = feat(ix, perm[s.k], s.w).ishare; delete s._f; } return pairs; };
const keyPairs = (keyName) => RC.flatMap((k) => { const d = loadDay(k), m = matchDay(d, keyName, { max: 400 }); return withMS(d, m.pairs); });
if (part === "p1") {
  const P = keyPairs("S0"), by = new Map(); for (const p of P) (by.get(byForm(p)) ?? by.set(byForm(p), []).get(byForm(p))).push(p);
  const cl = [...by.values()], w = (ps) => mean(ps.map((p) => (p.pos.ishare > p.neg.ishare ? 1 : p.pos.ishare === p.neg.ishare ? 0.5 : 0)));
  out.mentionWeighted = round(pAuc(P, "ishare")); out.formBalanced = round(mean(cl.map(w))); out.forms = cl.length;
  out.byMentions = Object.fromEntries([[1, 1], [2, 3], [4, 9], [10, 29], [30, 1e9]].map(([lo, hi]) => { const g = cl.filter((c) => c.length >= lo && c.length <= hi); return [`m${lo}-${hi}`, { forms: g.length, pairs: g.reduce((s, c) => s + c.length, 0), auc: round(mean(g.map(w))) }]; }));
  const r = rngOf("p1"), v = []; for (let b = 0; b < 300; b++) { let s = 0; for (let j = 0; j < cl.length; j++) s += w(cl[Math.floor(r() * cl.length)]); v.push(s / cl.length); } v.sort((a, b) => a - b); out.formBalancedCi = [round(v[7]), round(v[292])];
}
if (part === "p2") {
  const BINS = [[1, 1], [2, 2], [3, 4], [5, 9], [10, 24], [25, 1e9]], nick = {}, ord = {}, flagged = { nick: 0, ord: 0 }; for (const [lo] of BINS) { nick[lo] = { forms: 0, ever: 0, rankSum: 0 }; ord[lo] = { forms: 0, ever: 0 }; }
  const binOf = (n) => BINS.find(([lo, hi]) => n >= lo && n <= hi)[0];
  for (const k of RC) { const d = loadDay(k); if (d.T.length < 1500) continue; const ix = buildIx(d.T), F = new Map();
    for (const o of laterOccs(d)) { const s = feat(ix, o.k, o.w).ishare >= 0.67, f = F.get(o.w) ?? F.set(o.w, { cls: o.cls, L: 0, first: 0 }).get(o.w); f.L++; if (s && !f.first) f.first = f.L; }
    for (const f of F.values()) { const b = binOf(f.L), T = f.cls === "P" ? nick : ord; T[b].forms++; if (f.first) { T[b].ever++; if (f.cls === "P") { T[b].rankSum += f.first; flagged.nick++; } else flagged.ord++; } } log(k); }
  out.nickForms = Object.fromEntries(BINS.map(([lo, hi]) => [`L${lo}-${hi}`, { forms: nick[lo].forms, everFlagged: nick[lo].ever, share: round(nick[lo].ever / Math.max(1, nick[lo].forms)), meanMentionRankOfFirstFlag: round(nick[lo].rankSum / Math.max(1, nick[lo].ever), 2) }]));
  out.ordinaryForms = Object.fromEntries(BINS.map(([lo, hi]) => [`L${lo}-${hi}`, { forms: ord[lo].forms, everFlagged: ord[lo].ever, share: round(ord[lo].ever / Math.max(1, ord[lo].forms), 5) }]));
  out.everFlaggedForms = { nick: flagged.nick, ordinary: flagged.ord, nickShare: round(flagged.nick / Math.max(1, flagged.nick + flagged.ord)) };
}
if (part === "p3") {
  const ds = RC.map((k) => loadDay(k)); out.cells = {};
  for (const key of ["S0", "S2", "S5", "S6", "S7"]) for (const [fn, pred] of [["INIT", (o) => o.i === 0], ["NONINIT", (o) => o.i > 0]]) { const s = sumStrat(strat(ds, key, { pred, seed: "P3" + key + fn })); out.cells[`${key}|${fn}`] = s; log(`${key} ${fn} cov=${s.covered} auc=${s.auc.ishare}`); }
}
if (part === "p4") {
  out.cells = {}; const R0 = keyPairs("S0"), bb = (b) => (b <= 4 ? b : b <= 8 ? 5 : b <= 16 ? 6 : 7);
  for (const key of ["S0", "S2", "S3", "S7"]) { const P = key === "S0" ? R0 : keyPairs(key); const c = { n: P.length, ishare: round(pAuc(P, "ishare")), ishareMS: round(pAuc(P, "ishareMS")), bDistPos: {} }; for (const p of P) c.bDistPos[bb(p.pos.b)] = (c.bDistPos[bb(p.pos.b)] ?? 0) + 1; out.cells[key] = c; log(key + " " + c.ishare); }
  for (const key of ["S2", "S3", "S7"]) { const tgt = out.cells[key].bDistPos, tot = out.cells[key].n, src = {}; for (const p of R0) src[bb(p.pos.b)] = (src[bb(p.pos.b)] ?? 0) + 1; const w = (p) => (tgt[bb(p.pos.b)] ?? 0) / tot / ((src[bb(p.pos.b)] ?? 1) / R0.length); let s = 0, ws = 0; for (const p of R0) { const x = w(p), win = p.pos.ishare > p.neg.ishare ? 1 : p.pos.ishare === p.neg.ishare ? 0.5 : 0; s += x * win; ws += x; } out.cells[key].S0reweightedToPosB = round(s / ws); }
}
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL(`./results/post.${part}.json`, import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ part, sha: SHA, seconds: out.seconds }));
