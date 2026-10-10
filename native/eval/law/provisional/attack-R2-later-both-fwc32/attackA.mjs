// attackA.mjs: ATTACK A (LEAKAGE AND CONFOUNDS) on rule R2-later-both-fwc32.   modes:  repro STEM... | lang STEM... | summary
//   (always run with NAME_COMPANY_PAIRBLOCK=1; never pass "run" as the first argument of name-company.mjs; this script is not name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// DISCLOSURE (everything seen before this header). SEEN: the rule JSON; the confirmer's confirm.mjs, lib.mjs, extend.mjs and ALL their results (results/rows/*.json: per-language FWC32, pairs, AUC BOTH, position, shuffled AUC,
//   verdict.json, ext/*.json); name-company.mjs source (pairsOf, featuresOf, rankBins, ARMS). SEEN as arithmetic only, before any run of mine: with 12 PRIMARY in-scope languages of 20 PRIMARY languages with >= 250 pairs, 12 audible in
//   all, the hypergeometric P(>= 9 of 12 in-scope audible) = 0.113 (used in attackB, not here). NOT SEEN: any AUC of a stricter matching, of a tie-handling variant, of a form-unique pairing, of an interior-only subset or of a
//   no-PROPN-neighbour subset; no rival-feature AUC.
// WHAT IS ATTACKED. The rule's probe (BOTH arm, ridge-logistic, leave-sentence-quartile-out CV, pair-blocks) on the confirmer's own primary windows (windows.json; same seeds), IN-SCOPE = FWC32 >= 0.2795 and orig pairs >= 250 and
//   eligible (position control in [0.45, 0.55] and pairs >= 60), as the confirmer defined them. The confirmer's rows are REGENERATED and must reproduce its BOTH and POSITION AUC to 0.0015 (mode repro) or every number is void.
// OBSERVABLE AUDIT (read from the code, stated here): features = rank-bin of the 4 neighbours in a LOWERCASED stream (capitals absent), no POS, list, label, speaker. Gold UPOS (a) selects P (PROPN) and N (NOUN/VERB/ADJ),
//   (b) DROPS PUNCT tokens and fixes SENTENCE boundaries when the stream is built (readConllu), (c) is needed to count 'matched pairs' for the >= 250 scope. These are disclosed as gold-dependent PREPARATION, not tested here.
// VARIANTS (each re-run on the same windows, same seeds; per language; BOTH AUC and POSITION AUC; the language is VOID for a variant if pairs < 60 or POSITION outside [0.45, 0.55]):
//   TIE-mid, TIE-rand: rank bins computed with ties given the mid-rank (mid) or a seeded random order (rand, mean of 3 seeds) instead of the alphabetical tie-break of form strings (hapax and singletons are ordered by letters in
//     the original: a possible character-identity leak through the rank bin of rare neighbours). The pairs are identical to the original pairs.
//   S1: matching on exact within-sentence-index bucket, char-length bucket, sentence-length bucket AND form count within +-1 (instead of floor(log2 count)); no relaxation; unmatched positives dropped.
//   S2: matching on exact index (cap 10), exact distance to sentence end (cap 3), exact character length (cap 12), form-count bin, sentence length within +-3 (the original does not match distance to the sentence end).
//   S3: S2's exact keys + exact log2 bucket of prior mentions k + exact log2 bucket of recency (tokens since the previous mention of the form) + form count within +-1 + sentence length within +-3 (local count and recency matched).
//   U: ONE occurrence per positive form and per negative form (original keys, sentence-length bucket relaxed if needed): removes form-level memorisation of recurring contexts across CV blocks.
//   INTERIOR: original pairs restricted to pairs in which neither member has an edge (^ or $) among its four neighbour slots.   NOPROP: original pairs restricted to pairs in which neither member has a gold-PROPN within +-2
//     (gold used to define the SUBSET only: does the signal exist for names that have no name beside them?).
//   For every variant the comparator is the ORIGINAL pairing subsampled (3 seeded draws) to the same number of pairs (the pair count enters AUC), reported as dropVsOrigSameN = origSameN - variant.
// AUDIT (orig rows, no CV): raw AUC of single unmatched quantities (log2 count, k, recency, distance to end, sentence length, index, char length) between P and N rows, to show what the matching leaves unmatched.
// THRESHOLDS (fixed now; may be tightened, never loosened). IN12 = in-scope languages of sets A+B (12 as the confirmer found); IN23 = in-scope languages of A+B+C. Per variant V over its VALID in-scope languages:
//   SURVIVES: IN23 audible share (AUC >= 0.60) >= 0.70 AND IN12 audible share >= 0.60 AND mean dropVsOrigSameN < 0.03 over IN23.
//   FALLS: IN23 audible share < 0.50 OR IN23 mean AUC < 0.55 (needs >= 5 valid in-scope languages).   Otherwise NARROWS (numbers reported). The rule's own failIf for the sufficient condition: share < ~0.60.
//   A variant is a SUCCESSFUL ATTACK if its verdict is not SURVIVES. A leak is declared for TIE if dropVsOrigSameN >= 0.03 mean over IN23.
// BLIND PREDICTIONS (my priors): TIE-mid and TIE-rand drop <= 0.01 (P 0.80). S1 drop <= 0.01 (P 0.75). S2 drop 0.01-0.03 (P 0.5). S3 pairs retained >= 250 in fewer than half of in-scope languages; drop 0.01-0.04. U: pairs fall
//   below 250 in most languages; drop >= 0.03 (P 0.55; memorisation of recurring names' contexts). INTERIOR drop <= 0.02 (P 0.6). NOPROP drop >= 0.04 (P 0.6; a share of the signal is names beside names). P(rule SURVIVES all variants) 0.20.
// REGISTERED CAVEATS. Single window per language (within-language SD of window AUC ~0.044), so a variant's per-language AUC has ~0.02 noise; the same-n subsample comparator has its own noise; PRIMARY has 12 in-scope languages;
//   relatives are not independent; the probe is a fitted existence test, not a reading rule.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { HERE, RESULTS, TSCOPE, AUDIBLE, loadWindow, confirmRows, eligible, fwcK, docFrom, rngFor, seedFor, round, mean, share, headerSha, cvAucX, aucOf } from "./common.mjs";
import { buildPairs, filterPairs, subsample } from "./pairs.mjs";
const OUT = path.join(RESULTS, "A"); fs.mkdirSync(OUT, { recursive: true });
const SHA = headerSha(import.meta.url), [mode, ...rest] = process.argv.slice(2);
const stemSeed = (stem, ...x) => rngFor(seedFor("attackR2", stem, ...x));
function origBuild(stem, extra = {}) { const { sents, upos } = loadWindow(stem), doc = docFrom(stem, sents, upos); return { doc, sents, pr: buildPairs(doc, "LATER", rngFor(seedFor("confirm-R2", stem, "pairs")), { mode: "orig", ...extra }) }; }
const pairAuc = (rows, arm) => (rows.length >= 120 ? round(cvAucX(rows, arm)) : null);
function sameN(rows, m, stem, tag) { const a = []; for (let d = 0; d < 3; d++) a.push(cvAucX(subsample(rows, m, stemSeed(stem, tag, d)), "BOTH")); return round(mean(a.filter((x) => x != null))); }
function rawAuc(rows, f) { const v = rows.map(f), y = rows.map((r) => r.y); return round(aucOf(v, y)); }
if (mode === "repro") {
  const byStem = Object.fromEntries(confirmRows().map((r) => [r.stem, r])), res = [];
  for (const stem of rest) { const { pr } = origBuild(stem), c = byStem[stem], a = cvAucX(pr.rows, "BOTH"), p = cvAucX(pr.rows, "POSITION");
    res.push({ stem, pairs: pr.pairs, confirmPairs: c.pairs, mine: round(a), confirm: c.auc, positionMine: round(p), positionConfirm: c.position, ok: pr.pairs === c.pairs && Math.abs(a - c.auc) < 0.0015 && Math.abs(p - c.position) < 0.0015 }); }
  console.log(JSON.stringify({ headerSha256: SHA, res, valid: res.every((x) => x.ok) }));
}
if (mode === "lang") {
  const byStem = Object.fromEntries(confirmRows().map((r) => [r.stem, r]));
  for (const stem of rest) {
    const f = path.join(OUT, stem + ".json"); if (fs.existsSync(f)) { console.error(stem, "exists"); continue; }
    const t0 = Date.now();
    try {
      const { doc, sents, pr } = origBuild(stem), c = byStem[stem], rows = pr.rows, n0 = pr.pairs;
      const out = { stem, set: c.set, headerSha256: SHA, fwc32: round(fwcK(sents, 32)), orig: { pairs: n0, auc: round(cvAucX(rows, "BOTH")), position: round(cvAucX(rows, "POSITION")), confirmAuc: c.auc } };
      const P = rows.filter((r) => r.y === 1), N = rows.filter((r) => r.y === 0), pd = (g) => round(mean(P.map(g)) - mean(N.map(g)), 4);
      out.audit = { rawAuc: { log2count: rawAuc(rows, (r) => Math.log2(r.count)), k: rawAuc(rows, (r) => r.k), logrec: rawAuc(rows, (r) => Math.log2(1 + r.rec)), dend: rawAuc(rows, (r) => r.dend), loglen: rawAuc(rows, (r) => Math.log2(r.len)), idx: rawAuc(rows, (r) => r.i), clen: rawAuc(rows, (r) => r.clen) },
        meanDiffPminusN: { log2count: pd((r) => Math.log2(r.count)), k: pd((r) => r.k), logrec: pd((r) => Math.log2(1 + r.rec)), dend: pd((r) => r.dend), len: pd((r) => r.len), idx: pd((r) => r.i), clen: pd((r) => r.clen) },
        shareNbrPropn: { P: round(share(P, (r) => r.nbP), 3), N: round(share(N, (r) => r.nbP), 3) }, shareEdge: { P: round(share(P, (r) => r.edge), 3), N: round(share(N, (r) => r.edge), 3) }, distinctPosForms: new Set(P.map((r) => r.w)).size, distinctNegForms: new Set(N.map((r) => r.w)).size };
      const V = {};
      for (const m of ["S1", "S2", "S3", "U"]) { const v = buildPairs(doc, "LATER", stemSeed(stem, "match", m), { mode: m }), o = { pairs: v.pairs, dropped: v.dropped };
        if (v.pairs >= 60) { o.auc = pairAuc(v.rows, "BOTH"); o.position = pairAuc(v.rows, "POSITION"); o.origSameN = sameN(rows, v.pairs, stem, "sameN-" + m); o.drop = round(o.origSameN - o.auc); if (m !== "U") o.audit = { log2count: rawAuc(v.rows, (r) => Math.log2(r.count)), k: rawAuc(v.rows, (r) => r.k), dend: rawAuc(v.rows, (r) => r.dend), loglen: rawAuc(v.rows, (r) => Math.log2(r.len)) }; }
        V[m] = o; }
      const mid = buildPairs(doc, "LATER", rngFor(seedFor("confirm-R2", stem, "pairs")), { tie: "mid" }), same = mid.rows.length === rows.length && mid.rows.every((r, k) => r.s === rows[k].s && r.i === rows[k].i && r.y === rows[k].y);
      V.TIEmid = { pairs: mid.pairs, samePairs: same, auc: pairAuc(mid.rows, "BOTH"), position: pairAuc(mid.rows, "POSITION") }; V.TIEmid.origSameN = out.orig.auc; V.TIEmid.drop = round(out.orig.auc - V.TIEmid.auc);
      const ra = [], rp = []; for (let d = 0; d < 3; d++) { const rr = buildPairs(doc, "LATER", rngFor(seedFor("confirm-R2", stem, "pairs")), { tie: "rand", rndTie: stemSeed(stem, "tie", d) }); ra.push(cvAucX(rr.rows, "BOTH")); rp.push(cvAucX(rr.rows, "POSITION")); }
      V.TIErand = { pairs: n0, samePairs: same, auc: round(mean(ra)), draws: ra.map((x) => round(x)), position: round(mean(rp)), origSameN: out.orig.auc }; V.TIErand.drop = round(out.orig.auc - V.TIErand.auc);
      for (const [m, cond] of [["INTERIOR", (r) => !r.edge], ["NOPROP", (r) => !r.nbP]]) { const sub = filterPairs(rows, cond), n = sub.length / 2, o = { pairs: n, shareOfPairs: round(n / n0, 3) };
        if (n >= 60) { o.auc = pairAuc(sub, "BOTH"); o.position = pairAuc(sub, "POSITION"); o.origSameN = sameN(rows, n, stem, "sameN-" + m); o.drop = round(o.origSameN - o.auc); } V[m] = o; }
      out.variants = V; out.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(f, JSON.stringify(out));
      console.error(stem, c.set, "fwc", out.fwc32, "pairs", n0, "orig", out.orig.auc, Object.entries(V).map(([k, v]) => `${k}:${v.pairs}/${v.auc ?? "-"}`).join(" "), out.seconds + "s");
    } catch (e) { console.error(stem, "ERROR", String(e).slice(0, 300)); fs.writeFileSync(f + ".error", String(e.stack ?? e)); }
  }
}
if (mode === "summary") {
  const CR = confirmRows(), by = Object.fromEntries(CR.map((r) => [r.stem, r])), A = {};
  for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith(".json"))) { const o = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); A[o.stem] = o; }
  const inScope = (s) => { const r = by[s]; return eligible(r) && r.fwc32 >= TSCOPE && r.pairs >= 250; }, outScope = (s) => { const r = by[s]; return eligible(r) && r.fwc32 < TSCOPE && r.pairs >= 250; };
  const sets = { IN12: (s) => inScope(s) && by[s].set !== "C", IN23: inScope, OUT: outScope, OUT12: (s) => outScope(s) && by[s].set !== "C" };
  const valid = (v) => v && v.auc != null && v.position != null && v.position >= 0.45 && v.position <= 0.55;
  const S = { headerSha256: SHA, generated: new Date().toISOString(), languages: Object.keys(A).length, variants: {} };
  const names = ["S1", "S2", "S3", "U", "TIEmid", "TIErand", "INTERIOR", "NOPROP"];
  for (const m of names) { S.variants[m] = {};
    for (const [sn, pred] of Object.entries(sets)) { const ls = Object.keys(A).filter(pred), ok = ls.filter((s) => valid(A[s].variants[m])), V = ok.map((s) => A[s].variants[m]);
      S.variants[m][sn] = { inSet: ls.length, valid: ok.length, meanAuc: round(mean(V.map((v) => v.auc))), audibleShare: round(share(V, (v) => v.auc >= AUDIBLE), 3), audible: V.filter((v) => v.auc >= AUDIBLE).length, meanOrigSameN: round(mean(V.map((v) => v.origSameN))), meanDrop: round(mean(V.map((v) => v.drop))),
        meanOrigFull: round(mean(ok.map((s) => A[s].orig.auc))), meanPairs: round(mean(V.map((v) => v.pairs)), 1), pairsGe250: V.filter((v) => v.pairs >= 250).length, voided: ls.filter((s) => A[s].variants[m]?.pairs >= 60 && !valid(A[s].variants[m])).map((s) => s + ":" + A[s].variants[m].position), tooFew: ls.filter((s) => !(A[s].variants[m]?.pairs >= 60)).length }; }
    const a = S.variants[m].IN23, b = S.variants[m].IN12;
    a.verdict = a.valid < 5 ? "NOT EVALUABLE" : a.audibleShare < 0.5 || a.meanAuc < 0.55 ? "FALLS" : a.audibleShare >= 0.7 && b.audibleShare >= 0.6 && a.meanDrop < 0.03 ? "SURVIVES" : "NARROWS"; }
  S.origReference = {}; for (const [sn, pred] of Object.entries(sets)) { const ls = Object.keys(A).filter(pred); S.origReference[sn] = { n: ls.length, meanAuc: round(mean(ls.map((s) => A[s].orig.auc))), audibleShare: round(share(ls, (s) => A[s].orig.auc >= AUDIBLE), 3) }; }
  const feats = ["log2count", "k", "logrec", "dend", "loglen", "idx", "clen"]; S.audit = {}; for (const [sn, pred] of Object.entries({ IN23: inScope, OUT: outScope })) { const ls = Object.keys(A).filter(pred); S.audit[sn] = Object.fromEntries(feats.map((ft) => [ft, { meanRawAuc: round(mean(ls.map((s) => A[s].audit.rawAuc[ft]))), meanAbsDev: round(mean(ls.map((s) => Math.abs(A[s].audit.rawAuc[ft] - 0.5)))), maxAbsDev: round(Math.max(...ls.map((s) => Math.abs(A[s].audit.rawAuc[ft] - 0.5)))) }]));
    S.audit[sn + "_nbrPropnShare"] = { P: round(mean(ls.map((s) => A[s].audit.shareNbrPropn.P)), 3), N: round(mean(ls.map((s) => A[s].audit.shareNbrPropn.N)), 3) }; S.audit[sn + "_edgeShare"] = { P: round(mean(ls.map((s) => A[s].audit.shareEdge.P)), 3), N: round(mean(ls.map((s) => A[s].audit.shareEdge.N)), 3) }; }
  S.tiePairsIdentical = Object.values(A).every((o) => o.variants.TIEmid.samePairs && o.variants.TIErand.samePairs);
  S.perLanguageInScope = Object.keys(A).filter(inScope).sort().map((s) => ({ stem: s, set: A[s].set, fwc: A[s].fwc32, pairs: A[s].orig.pairs, orig: A[s].orig.auc, ...Object.fromEntries(names.map((m) => [m, A[s].variants[m]?.auc ?? null])), pairsV: Object.fromEntries(names.map((m) => [m, A[s].variants[m]?.pairs])) }));
  fs.writeFileSync(path.join(RESULTS, "A.summary.json"), JSON.stringify(S, null, 1));
  console.log(JSON.stringify({ origReference: S.origReference, tiePairsIdentical: S.tiePairsIdentical, variants: Object.fromEntries(names.map((m) => [m, { IN23: S.variants[m].IN23, IN12: S.variants[m].IN12, OUT: S.variants[m].OUT }])) }, null, 1));
}
