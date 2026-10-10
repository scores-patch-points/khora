// attackA2.mjs: ATTACK A2 (GOLD-DEFINED PREPARATION AND CLASS MIXTURE) on rule R2-later-both-fwc32.   modes:  lang STEM... | summary
//   (always run with NAME_COMPANY_PAIRBLOCK=1; never pass "run" as the first argument of name-company.mjs; this script is not name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// DISCLOSURE (everything seen before this header). SEEN: the rule, the confirmer's scripts and results, my attackA (matching, tie-break, unique-form, interior, no-PROPN-neighbour), attackC (rivals, shuffles) and attackB (forking paths) results.
//   In attackA results: stricter matching and tie handling cost 0.00-0.03; in attackC: no pure-count rival reproduces the in-scope AUC. NOT SEEN: any AUC with punctuation tokens kept in the stream; any AUC with the negative class restricted to one UPOS.
// WHAT IS ATTACKED (two gold-defined features of the rule's design that no earlier test varied).
//   PUNCTKEEP: the confirmer's streams drop every token whose GOLD UPOS is PUNCT before ranks, neighbours and sentence lengths are computed (readConllu). A reader without POS would see punctuation tokens as the commonest neighbours (and the edge category
//     would be partly replaced by punctuation). Variant: the same windows, same sentences, same lowercasing, but PUNCT tokens KEPT in the stream (they are never positives or negatives); pairs rebuilt by the original matching (same seeds); BOTH and POSITION CV AUC.
//   NEGNOUN / NEGVERB / NEGADJ: the negative class of the rule is the MIXTURE NOUN+VERB+ADJ. Variant: the same positives (PROPN LATER occurrences) matched only against NOUN occurrences (resp. VERB, ADJ), original keys and relaxation, original seeds.
//     Question: is the company signal 'name versus ordinary noun' or mostly 'noun-like versus verb/adjective-like' (a part-of-speech contrast any distributional method hears)? Gold UPOS is used to define the classes (evaluation scope), never as a feature.
//   Comparator for every variant: the ORIGINAL pairing (mixed negatives, punctuation dropped) subsampled to the same number of pairs, 3 seeded draws, and the original full-sample AUC.
// THRESHOLDS (fixed now; may be tightened, never loosened). A language is VOID for a variant if pairs < 60 or POSITION outside [0.45, 0.55]. IN23 = in-scope languages of sets A+B+C, IN12 = A+B (in-scope as the confirmer defined: FWC32 >= 0.2795 from the
//   ORIGINAL stream, orig pairs >= 250, eligible). Per variant: SURVIVES if IN23 audible share (AUC >= 0.60) >= 0.70 AND IN12 audible share >= 0.60 AND mean drop vs same-n original < 0.03. FALLS if IN23 audible share < 0.50 or IN23 mean AUC < 0.55 (>= 5 valid
//   languages). Otherwise NARROWS. For NEGNOUN the question 'do names sound different from nouns' is answered by the IN23 mean AUC: >= 0.60 yes; 0.55-0.60 weakly; < 0.55 no.
// BLIND PREDICTIONS (my priors): PUNCTKEEP: mean AUC within +-0.02 of the original (P 0.7), slightly higher (P 0.45). NEGNOUN: IN23 mean AUC 0.60 (0.55-0.65), below the mixed-negative AUC (P 0.8), drop 0.03-0.06; NEGVERB mean 0.70 (higher than mixed, P 0.85);
//   NEGADJ mean 0.64. P(NEGNOUN verdict SURVIVES) 0.30, NARROWS 0.45, FALLS 0.25.
// REGISTERED CAVEATS. Fewer pairs in NEGNOUN/NEGVERB/NEGADJ for some languages (the same-n comparator removes the size effect, not the class-composition effect); one window per language (SD of window AUC ~0.044); relatives not independent;
//   sentence boundaries remain gold in every variant (not varied here: residual).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { RESULTS, TSCOPE, AUDIBLE, UD, loadWindow, confirmRows, eligible, fwcK, rngFor, seedFor, round, mean, share, headerSha, cvAucX } from "./common.mjs";
import { buildPairs, subsample } from "./pairs.mjs";
const OUT = path.join(RESULTS, "A2"); fs.mkdirSync(OUT, { recursive: true });
const SHA = headerSha(import.meta.url), [mode, ...rest] = process.argv.slice(2);
const W = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "confirm-R2-later-both-fwc32", "windows.json"), "utf8"));
/** read a conllu in lockstep: D = punctuation dropped (the confirmer's stream), K = punctuation kept; a sentence exists iff it has >= 1 non-PUNCT token (as in the confirmer's reader) */
function readBoth(file) {
  const D = { sents: [], upos: [] }, K = { sents: [], upos: [] }; let cd = [], ud = [], ck = [], uk = [];
  const flush = () => { if (cd.length) { D.sents.push(cd); D.upos.push(ud); K.sents.push(ck); K.upos.push(uk); } cd = []; ud = []; ck = []; uk = []; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) { if (!line) { flush(); continue; } if (line[0] === "#") continue; const f = line.split("\t"); if (f.length < 10 || !/^\d+$/.test(f[0])) continue;
    const w = f[1].normalize("NFC").toLowerCase(); ck.push(w); uk.push(f[3]); if (f[3] !== "PUNCT") { cd.push(w); ud.push(f[3]); } }
  flush(); return { D, K };
}
function windowBoth(stem) {
  const w = W[stem], { D, K } = readBoth(w.source), sl = (X) => ({ sents: X.sents.slice(w.offset, w.offset + w.taken), upos: X.upos.slice(w.offset, w.offset + w.taken) }), d = sl(D), k = sl(K);
  if (w.set === "A") return { d, k };
  const dup = new Set(); for (const sp of ["dev", "test"]) { const t = readBoth(path.join(UD, stem, sp + ".conllu")).D; for (const x of t.sents) dup.add(x.join(" ")); }
  const keep = d.sents.map((x) => !dup.has(x.join(" "))); const fl = (X) => ({ sents: X.sents.filter((_, i) => keep[i]), upos: X.upos.filter((_, i) => keep[i]) }); return { d: fl(d), k: fl(k) };
}
const mkDoc = (stem, sents, upos, negSet) => { const n = sents.length; return { name: stem, stream: sents, cls: (s, i) => (upos[s][i] === "PROPN" ? "P" : negSet.has(upos[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) }; };
const stemSeed = (stem, ...x) => rngFor(seedFor("attackR2-A2", stem, ...x));
const pairSeed = (stem) => rngFor(seedFor("confirm-R2", stem, "pairs"));
const sameN = (rows, m, stem, tag) => { const a = []; for (let d = 0; d < 3; d++) a.push(cvAucX(subsample(rows, m, stemSeed(stem, tag, d)), "BOTH")); return round(mean(a.filter((x) => x != null))); };
if (mode === "lang") {
  const byStem = Object.fromEntries(confirmRows().map((r) => [r.stem, r]));
  for (const stem of rest) {
    const f = path.join(OUT, stem + ".json"); if (fs.existsSync(f)) { console.error(stem, "exists"); continue; } const t0 = Date.now();
    try {
      const { d, k } = windowBoth(stem), c = byStem[stem], MIX = new Set(["NOUN", "VERB", "ADJ"]), orig = buildPairs(mkDoc(stem, d.sents, d.upos, MIX), "LATER", pairSeed(stem), { mode: "orig" });
      const out = { stem, set: c.set, headerSha256: SHA, fwc32: round(fwcK(d.sents, 32)), fwc32WithPunct: round(fwcK(k.sents, 32)), orig: { pairs: orig.pairs, auc: round(cvAucX(orig.rows, "BOTH")), position: round(cvAucX(orig.rows, "POSITION")), confirmAuc: c.auc }, variants: {} };
      out.orig.reproOk = out.orig.pairs === c.pairs && Math.abs(out.orig.auc - c.auc) < 0.0015;
      const run = (name, doc) => { const v = buildPairs(doc, "LATER", pairSeed(stem), { mode: "orig" }), o = { pairs: v.pairs, nPos: v.nPos, nNeg: v.nNeg };
        if (v.pairs >= 60) { o.auc = round(cvAucX(v.rows, "BOTH")); o.position = round(cvAucX(v.rows, "POSITION")); o.origSameN = sameN(orig.rows, v.pairs, stem, "sameN-" + name); o.drop = round(o.origSameN - o.auc); o.dropFull = round(out.orig.auc - o.auc); } out.variants[name] = o; };
      run("PUNCTKEEP", mkDoc(stem, k.sents, k.upos, MIX)); for (const [nm, u] of [["NEGNOUN", "NOUN"], ["NEGVERB", "VERB"], ["NEGADJ", "ADJ"]]) run(nm, mkDoc(stem, d.sents, d.upos, new Set([u])));
      out.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(f, JSON.stringify(out));
      console.error(stem, c.set, "orig", out.orig.auc, out.orig.reproOk ? "ok" : "REPRO-FAIL", Object.entries(out.variants).map(([n, v]) => `${n}:${v.pairs}/${v.auc ?? "-"}`).join(" "), out.seconds + "s");
    } catch (e) { console.error(stem, "ERROR", String(e).slice(0, 300)); fs.writeFileSync(f + ".error", String(e.stack ?? e)); }
  }
}
if (mode === "summary") {
  const by = Object.fromEntries(confirmRows().map((r) => [r.stem, r])), A = {};
  for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith(".json"))) { const o = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); A[o.stem] = o; }
  const inScope = (s) => eligible(by[s]) && by[s].fwc32 >= TSCOPE && by[s].pairs >= 250, outScope = (s) => eligible(by[s]) && by[s].fwc32 < TSCOPE && by[s].pairs >= 250;
  const sets = { IN23: inScope, IN12: (s) => inScope(s) && by[s].set !== "C", OUT: outScope }, valid = (v) => v && v.auc != null && v.position >= 0.45 && v.position <= 0.55;
  const S = { headerSha256: SHA, generated: new Date().toISOString(), languages: Object.keys(A).length, reproAllOk: Object.values(A).every((o) => o.orig.reproOk), variants: {} };
  for (const m of ["PUNCTKEEP", "NEGNOUN", "NEGVERB", "NEGADJ"]) { S.variants[m] = {};
    for (const [sn, pred] of Object.entries(sets)) { const ls = Object.keys(A).filter(pred), ok = ls.filter((s) => valid(A[s].variants[m])), V = ok.map((s) => A[s].variants[m]);
      S.variants[m][sn] = { inSet: ls.length, valid: ok.length, meanAuc: round(mean(V.map((v) => v.auc))), audible: V.filter((v) => v.auc >= AUDIBLE).length, audibleShare: round(share(V, (v) => v.auc >= AUDIBLE), 3), meanOrigSameN: round(mean(V.map((v) => v.origSameN))), meanDrop: round(mean(V.map((v) => v.drop))),
        meanDropFull: round(mean(V.map((v) => v.dropFull))), meanOrigFull: round(mean(ok.map((s) => A[s].orig.auc))), meanPairs: round(mean(V.map((v) => v.pairs)), 1), voided: ls.filter((s) => A[s].variants[m]?.pairs >= 60 && !valid(A[s].variants[m])).map((s) => `${s}:${A[s].variants[m].position}`), tooFew: ls.filter((s) => !(A[s].variants[m]?.pairs >= 60)).length }; }
    const a = S.variants[m].IN23, b = S.variants[m].IN12; a.verdict = a.valid < 5 ? "NOT EVALUABLE" : a.audibleShare < 0.5 || a.meanAuc < 0.55 ? "FALLS" : a.audibleShare >= 0.7 && b.audibleShare >= 0.6 && a.meanDrop < 0.03 ? "SURVIVES" : "NARROWS"; }
  S.perLanguageInScope = Object.keys(A).filter(inScope).sort().map((s) => ({ stem: s, set: A[s].set, fwc: A[s].fwc32, fwcWithPunct: A[s].fwc32WithPunct, orig: A[s].orig.auc, ...Object.fromEntries(["PUNCTKEEP", "NEGNOUN", "NEGVERB", "NEGADJ"].map((m) => [m, `${A[s].variants[m]?.pairs}/${A[s].variants[m]?.auc ?? "-"}`])) }));
  fs.writeFileSync(path.join(RESULTS, "A2.summary.json"), JSON.stringify(S, null, 1)); console.log(JSON.stringify({ reproAllOk: S.reproAllOk, variants: S.variants }, null, 1));
}
