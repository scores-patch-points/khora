// attackC.mjs: ATTACK C (COUNT RIVAL) on rule R2-later-both-fwc32.   modes:  lang STEM... | summary
//   (always run with NAME_COMPANY_PAIRBLOCK=1; never pass "run" as the first argument of name-company.mjs; this script is not name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// DISCLOSURE (everything seen before this header). SEEN: the rule JSON; the confirmer's scripts and all its results; name-company.mjs source and the confirmer's own per-language shuffled-company AUCs (one seed); my own attackA results
//   (results/A/*.json, A.summary.json): tie-break variants lose ~0.00, matching variants lose 0.00-0.03 vs same-n, the raw AUC of RECENCY (tokens since the previous mention of the form) between the matched P and N rows is ~0.41 in scope
//   (names are re-mentioned sooner than their matched nouns: an UNMATCHED quantity), the raw AUCs of count, k, index, length, char length sit within +-0.02 of 0.5, and 53% of in-scope positives have a gold PROPN within +-2 against 15% of negatives.
//   NOT SEEN: any AUC of a rival-only arm (K, REC, DEND, NBR, SENT, RIVALSX) or of BOTH+RIVALSX, and none of the new shuffled seeds.
// WHAT IS ATTACKED. The same rows as the confirmer (primary windows, seeds, matching; regenerated in attackA repro to 0.0015), IN-SCOPE = FWC32 >= 0.2795 and orig pairs >= 250 and eligible. Per language, the ridge-logistic leave-block-out
//   CV AUC (the rule's own probe code) of each ARM on the SAME rows:
//   BOTH (the rule), LEFT, RIGHT;  PURE-COUNT RIVALS: POSITION (index bucket + sentence-length bucket), CHARLEN, FREQ (log2 form count, continuous: keeps the residual the matching bin leaves), RIVALS (those three), K (log2 prior mentions),
//     REC (log2 tokens since the previous mention of the same form: the unmatched quantity), DEND (distance to sentence end), RIVALSX (all of those plus sentence length, index, character length);
//   COMPANY-COLLAPSED RIVALS (company information reduced to a few scalars): NBR (mean rank-bin of the interior neighbours and their number), NBRMAX (rarest neighbour bin), SENT (mean rank-bin and share of rare forms among the OTHER tokens
//     of the sentence; no adjacency), NBR+SENT;
//   COMBINATIONS: BOTH+RIVALS, BOTH+RIVALSX.   SHUFFLED COMPANY: the pipeline rerun on the within-sentence-shuffled stream (company destroyed, sentence composition kept), 3 NEW seeds (confirmer used one), BOTH and POSITION.
// THRESHOLDS (fixed now; may be tightened, never loosened). IN23 = in-scope languages of A+B+C that are eligible; IN12 = in-scope of A+B. Per rival arm X: DELTA_X = AUC_BOTH - AUC_X per language.
//   A rival REPRODUCES the effect if mean DELTA_X over IN23 <= 0.03 AND DELTA_X <= 0.03 in >= 50% of IN23 languages. (The lens criterion: within 0.03 AUC on the same rows.)
//   C5 (beyond rivals): mean over IN23 of AUC(BOTH+RIVALSX) - AUC(RIVALSX) >= 0.03 with a language-bootstrap (B = 2000) lower 95% bound > 0.
//   SHUFFLE: among IN23 languages with AUC_BOTH >= 0.60, >= 80% have shuffled BOTH AUC (mean of 3 seeds) <= 0.55 and the mean shuffled BOTH AUC over IN23 is within 0.45-0.55.
//   VERDICT C: FALLS if any PURE-COUNT rival reproduces, or SHUFFLE fails (mean shuffled AUC > BOTH - 0.03). NARROWS if only a COMPANY-COLLAPSED rival reproduces (the probe is real but 'company' is nothing beyond rarity of the surroundings),
//   or if C5 fails while no pure-count rival reproduces. STANDS if nothing reproduces, C5 holds and SHUFFLE holds. The same is reported for IN12 and for OUT (out-of-scope >= 250 pairs) as contrast.
// BLIND PREDICTIONS (my priors): no PURE-COUNT rival reproduces (P 0.75); REC alone reaches 0.57-0.60 (P 0.5) because names recur in bursts; RIVALSX mean 0.57 (0.54-0.61); NBR within 0.03 of BOTH (P 0.4); NBRMAX within 0.03 (P 0.35);
//   SENT within 0.03 (P 0.10); C5 holds (P 0.80); SHUFFLE holds (P 0.85). P(verdict STANDS) 0.40, NARROWS 0.40, FALLS 0.20.
// REGISTERED CAVEATS. One window per language; the within-language window SD of AUC is ~0.044; relatives are not independent; scalar rivals use the same ridge learner on 1-2 standardised columns; the rivals are fitted with the rule's own
//   CV (so they have the same optimism as BOTH). 'Cheaper' means fewer parameters and no neighbour information, not 'label-free' (all probes use gold labels to FIT).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { HERE, RESULTS, TSCOPE, AUDIBLE, loadWindow, confirmRows, eligible, fwcK, docFrom, shuffleDoc, rngFor, seedFor, round, mean, share, quantile, headerSha, cvAucX, mulberry } from "./common.mjs";
import { buildPairs } from "./pairs.mjs";
const OUT = path.join(RESULTS, "C"); fs.mkdirSync(OUT, { recursive: true });
const SHA = headerSha(import.meta.url), [mode, ...rest] = process.argv.slice(2);
const ARMS_C = ["BOTH", "LEFT", "RIGHT", "POSITION", "CHARLEN", "FREQ", "RIVALS", "K", "REC", "DEND", "RIVALSX", "NBR", "NBRMAX", "SENT", "NBR+SENT", "BOTH+RIVALS", "BOTH+RIVALSX"];
const PURE = ["POSITION", "CHARLEN", "FREQ", "RIVALS", "K", "REC", "DEND", "RIVALSX"], COLLAPSED = ["NBR", "NBRMAX", "SENT", "NBR+SENT"];
if (mode === "lang") {
  const byStem = Object.fromEntries(confirmRows().map((r) => [r.stem, r]));
  for (const stem of rest) {
    const f = path.join(OUT, stem + ".json"); if (fs.existsSync(f)) { console.error(stem, "exists"); continue; }
    const t0 = Date.now();
    try {
      const { sents, upos } = loadWindow(stem), doc = docFrom(stem, sents, upos), pr = buildPairs(doc, "LATER", rngFor(seedFor("confirm-R2", stem, "pairs")), { mode: "orig" }), c = byStem[stem];
      const out = { stem, set: c.set, headerSha256: SHA, fwc32: round(fwcK(sents, 32)), pairs: pr.pairs, arms: {} };
      for (const a of ARMS_C) out.arms[a] = round(cvAucX(pr.rows, a));
      out.reproBoth = { mine: out.arms.BOTH, confirm: c.auc, ok: Math.abs(out.arms.BOTH - c.auc) < 0.0015 };
      const sb = [], sp = [];
      for (let d = 0; d < 3; d++) { const sh = buildPairs(shuffleDoc(stem, sents, upos, rngFor(seedFor("attackR2-C", stem, "shuf", d))), "LATER", rngFor(seedFor("attackR2-C", stem, "shufpairs", d)), { mode: "orig" });
        sb.push(sh.pairs >= 60 ? cvAucX(sh.rows, "BOTH") : null); sp.push(sh.pairs >= 60 ? cvAucX(sh.rows, "POSITION") : null); }
      out.shuffle = { draws: sb.map((x) => round(x)), mean: round(mean(sb.filter((x) => x != null))), positionMean: round(mean(sp.filter((x) => x != null))) };
      out.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(f, JSON.stringify(out));
      console.error(stem, c.set, "fwc", out.fwc32, "pairs", out.pairs, Object.entries(out.arms).map(([k, v]) => `${k}:${v}`).join(" "), "shuf", out.shuffle.mean, out.seconds + "s");
    } catch (e) { console.error(stem, "ERROR", String(e).slice(0, 300)); fs.writeFileSync(f + ".error", String(e.stack ?? e)); }
  }
}
if (mode === "summary") {
  const CR = confirmRows(), by = Object.fromEntries(CR.map((r) => [r.stem, r])), C = {};
  for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith(".json"))) { const o = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); C[o.stem] = o; }
  const inScope = (s) => eligible(by[s]) && by[s].fwc32 >= TSCOPE && by[s].pairs >= 250, outScope = (s) => eligible(by[s]) && by[s].fwc32 < TSCOPE && by[s].pairs >= 250;
  const sets = { IN23: inScope, IN12: (s) => inScope(s) && by[s].set !== "C", OUT: outScope };
  const boot = (xs, B = 2000, seed = 31) => { const r = mulberry(seed), m = []; for (let b = 0; b < B; b++) { let t = 0; for (let k = 0; k < xs.length; k++) t += xs[Math.floor(r() * xs.length)]; m.push(t / xs.length); } return [round(quantile(m, 0.025)), round(quantile(m, 0.975))]; };
  const S = { headerSha256: SHA, generated: new Date().toISOString(), languages: Object.keys(C).length, reproAllOk: Object.values(C).every((o) => o.reproBoth.ok), sets: {} };
  for (const [sn, pred] of Object.entries(sets)) { const ls = Object.keys(C).filter(pred), R = { n: ls.length, meanAuc: {}, delta: {} };
    for (const a of ARMS_C) { R.meanAuc[a] = round(mean(ls.map((s) => C[s].arms[a]))); }
    for (const a of ARMS_C.filter((x) => x !== "BOTH")) { const d = ls.map((s) => C[s].arms.BOTH - C[s].arms[a]); R.delta[a] = { mean: round(mean(d)), shareLe003: round(share(d, (x) => x <= 0.03), 3), reproduces: mean(d) <= 0.03 && share(d, (x) => x <= 0.03) >= 0.5, kind: PURE.includes(a) ? "pure" : COLLAPSED.includes(a) ? "collapsed" : "other" }; }
    const c5 = ls.map((s) => C[s].arms["BOTH+RIVALSX"] - C[s].arms.RIVALSX); R.c5 = { mean: round(mean(c5)), ci95: boot(c5), pass: mean(c5) >= 0.03 && boot(c5)[0] > 0 };
    const aud = ls.filter((s) => C[s].arms.BOTH >= AUDIBLE), shufOk = aud.filter((s) => C[s].shuffle.mean <= 0.55);
    R.shuffle = { meanShuffledBoth: round(mean(ls.map((s) => C[s].shuffle.mean))), meanShuffledPosition: round(mean(ls.map((s) => C[s].shuffle.positionMean))), audible: aud.length, shuffledLe55: shufOk.length, share: round(shufOk.length / (aud.length || 1), 3), meanBothMinusShuffle: round(mean(ls.map((s) => C[s].arms.BOTH - C[s].shuffle.mean))), pass: aud.length ? shufOk.length / aud.length >= 0.8 && mean(ls.map((s) => C[s].shuffle.mean)) >= 0.45 && mean(ls.map((s) => C[s].shuffle.mean)) <= 0.55 : null };
    const pureRep = Object.entries(R.delta).filter(([a, d]) => d.kind === "pure" && d.reproduces).map(([a]) => a), colRep = Object.entries(R.delta).filter(([a, d]) => d.kind === "collapsed" && d.reproduces).map(([a]) => a);
    R.verdict = { pureReproduce: pureRep, collapsedReproduce: colRep, verdict: pureRep.length || R.shuffle.pass === false ? "FALLS" : colRep.length || !R.c5.pass ? "NARROWS" : "STANDS" };
    R.audibleShare = { BOTH: round(share(ls, (s) => C[s].arms.BOTH >= AUDIBLE), 3), NBR: round(share(ls, (s) => C[s].arms.NBR >= AUDIBLE), 3), NBRMAX: round(share(ls, (s) => C[s].arms.NBRMAX >= AUDIBLE), 3), SENT: round(share(ls, (s) => C[s].arms.SENT >= AUDIBLE), 3), REC: round(share(ls, (s) => C[s].arms.REC >= AUDIBLE), 3), RIVALSX: round(share(ls, (s) => C[s].arms.RIVALSX >= AUDIBLE), 3) };
    S.sets[sn] = R; }
  S.perLanguage = Object.keys(C).filter((s) => inScope(s) || outScope(s)).sort().map((s) => ({ stem: s, scope: inScope(s) ? "IN" : "OUT", set: C[s].set, fwc: C[s].fwc32, pairs: C[s].pairs, ...Object.fromEntries(["BOTH", "NBR", "NBRMAX", "SENT", "REC", "RIVALSX", "BOTH+RIVALSX"].map((a) => [a, C[s].arms[a]])), shuf: C[s].shuffle.mean }));
  fs.writeFileSync(path.join(RESULTS, "C.summary.json"), JSON.stringify(S, null, 1)); console.log(JSON.stringify({ reproAllOk: S.reproAllOk, sets: S.sets }, null, 1));
}
