// c1-loro.mjs: C1 LEX, DEV-OPTIMISM CHECK by leave-one-REPOSITORY-out inside TRAIN. A cross-check of c1-lex.mjs; it never gates it
// and it never reads DEV or TEST.
//
// WHY. c1-lex.mjs discloses (DISCLOSURE, A3..A7) that the lexer and the prior builder were revised while looking at DEV boundary
// misses, so the DEV numbers (F1 0.958 to 1.000) are an instrument built by looking at DEV, optimistic by an unknown amount. The
// shipped priors cannot be scored on TRAIN (they were built from it). What can be scored is this: for each TRAIN repository r, derive a
// prior with the SAME builder function and the SAME declared thresholds (adapters/code/lex.js deriveLexPrior, DERIVE) from every OTHER
// TRAIN repository, then lex r's files and score them against the tree-sitter gold. r never entered that prior, and no file of r was
// ever opened while the lexer was revised (the revisions answered DEV file errors, plus two TRAIN prior-build summaries for A1/A2:
// aggregates, no file). So the LORO number is an estimate of unseen-repository performance that the DEV iteration did not shape. The
// gap DEV - LORO is the measured part of the DEV optimism.
//
// =====================================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written 2026-10-06 BEFORE this file's code had been run on any file (it was smoke-run on
// the toy fixture in tests/coding-c1.test.js only). The rule and the predictions below are fixed; later changes are AMENDMENTS at the
// foot of this header, dated, with the numbers that prompted them.
// =====================================================================================================================
// CLAIM (L1). The c1-lex.mjs DEV scores are not inflated by DEV iteration beyond a small tolerance, and the lexer's pass clauses hold
// on repositories its prior never saw and that nobody read while the lexer was revised:
//   per language, over all held-out TRAIN files pooled (micro), with the held-out repo's own leave-one-out prior in every arm:
//   (i)   F1 optimism   F1(DEV, shipped prior) - F1(LORO)  <= OPTIMISM_TOL (0.02: the same two points c1-lex.mjs calls a licence
//                       drop, i.e. the size at which a difference is a real effect for the downstream rungs)
//   (ii)  ACC optimism  ACC(DEV) - ACC(LORO)               <= OPTIMISM_TOL (0.02)
//   (iii) the c1-lex.mjs clauses (a) boundary vs whitespace (>= 0.10, bootstrap lower end > 0), (b) class vs majority (>= 0.10,
//         lower end > 0), (c1) deranged keywords move class accuracy (>= 0.02, lower end > 0), (c2) removing the delimiter prior
//         moves boundary F1 (>= 0.02, lower end > 0), all on the pooled LORO files, same constants, same paired file bootstrap
//         (B=1000, seed 20261005)
//   (iv)  no held-out repo with >= 3 files has F1(LORO) < F1(whitespace) + 0.10 (every repo agrees in sign)
//   pass = (i) and (ii) and (iii) and (iv). pass:false names the failed clause; pass:null when unmeasurable (typed gap: fewer than 3
//   TRAIN repositories with eligible files, the gold extractor absent, or the DEV reference file missing).
// DEV REFERENCE. F1(DEV) and ACC(DEV) are read from /private/tmp/claude-501/coding-competence/c1-lex-<language>-dev.json, which must
// be a FULL dev run (no --limit; its details.sample.limit is null) of the same shipped prior; otherwise (i) and (ii) are typed gaps
// and the language is pass:null.
//
// PREDICTIONS (point guess and band; a band that misses is a reported miss of the prediction):
//   language    LORO F1             LORO class acc
//   python      0.995 [0.980,1.000] 0.998 [0.990,1.000]
//   javascript  0.985 [0.960,0.998] 0.990 [0.960,0.999]
//   c           0.975 [0.930,0.995] 0.995 [0.970,1.000]
//   go          0.999 [0.990,1.000] 0.999 [0.990,1.000]
//   ruby        0.930 [0.850,0.970] 0.960 [0.900,0.985]
//   java        0.998 [0.990,1.000] 0.997 [0.990,1.000]
//   DEV - LORO F1 gap: within +-0.02 for python, javascript, go, java; within +-0.04 for c and ruby (their TRAIN repositories differ
//   more in macro / heredoc use). Expected verdict: python, go, java pass; javascript, c, ruby are the ones that may fail (i) or (iv).
//   Why the gap could go either way: the LORO prior is built from one repository fewer than the shipped prior (slightly weaker), and the
//   held-out repository is a different population from the DEV repositories (repository heterogeneity: inside DEV itself ruby ranges
//   0.944 to 0.999 per repository). The comparison is between populations, not a paired test; with 3 to 10 repositories a sharper
//   statistic is not honest, so the tolerance is declared, not tested.
//   WHAT WOULD FALSIFY THE CLAIM (DEV numbers can stand as an estimate of unseen-repository performance): F1 optimism or ACC optimism
//   above 0.02 in any language (the DEV iteration inflated it by at least that much); a licence clause (iii c1/c2) failing on LORO
//   (the received knowledge did not move the statistic on unseen repositories); a repository below whitespace + 0.10. If three or more
//   languages fail (i), the DEV scores must not be quoted as held-out performance.
//
// LIMITS (declared): (1) TRAIN repositories were not wholly unread by the author: A1/A2 were made after reading TRAIN prior-build
// summaries; (2) the tree-sitter gold is both authority and the prior's giver, so LORO measures reproduction of that grammar's lexical
// conventions on unseen repositories, not a truth about code (c1-xauth.mjs is the cross-check against an independent engine);
// (3) the lexer CODE (not the prior) was designed by looking at DEV errors; LORO is blind to that only insofar as the held-out TRAIN
// repositories differ from DEV; (4) the same MAX_BYTES / restricted-row / parse-error exclusions as c1-common.mjs apply.
//
// USAGE  node eval/coding-competence/c1-loro.mjs --language python [--limit N]    (N = max held-out files per repository; default all)
//        writes /private/tmp/claude-501/coding-competence/c1-loro-<language>-train.json; prints one JSON line.
//        split is always "train": c1-loro refuses dev and test.
//
// AMENDMENTS AND RUN LOG (append only; nothing above this line is edited after the first run)
// L1 FIRST RUN (2026-10-06; TRAIN only, every eligible file, no --limit; the lexer, the builder and this file were not revised between
//   the pre-registration above and these runs; DEV reference = the full DEV runs of c1-lex.mjs made the same day, identical at the logged
//   four decimals to the 2026-10-05 second dev run). Reported as run:
//   lang        files repos LORO F1  ws F1   LORO acc  maj(share)        dKw acc noDel F1 | DEV F1  DEV acc | F1 opt   acc opt  | pass
//   python      240   4     0.9996   0.2686  0.9997    punct 0.3994      0.8637  0.8017   | 0.9979  0.9995  | -0.0017  -0.0002  | True
//   javascript  240   4     0.9958   0.2463  0.9953    punct 0.5180      0.9172  0.7553   | 0.9960  0.9976  | +0.0002  +0.0023  | True
//   c           227   8     0.9908   0.2301  0.9973    punct 0.4429      0.9218  0.7790   | 0.9842  0.9992  | -0.0066  +0.0019  | True
//   go          185   5     1.0000   0.2715  0.9999    punct 0.4580      0.8884  0.7392   | 1.0000  1.0000  | +0.0000  +0.0001  | True
//   ruby        241   5     0.9580   0.2511  0.9878    punct 0.3950      0.8582  0.7148   | 0.9576  0.9720  | -0.0004  -0.0158  | True
//   java        204   4     0.9989   0.2486  0.9972    punct 0.4870      0.8865  0.8358   | 0.9998  0.9980  | +0.0009  +0.0008  | True
//   (opt = DEV - LORO; negative = LORO is HIGHER than DEV.) Clauses (iii): a = F1 - whitespace in [0.707,0.761] with every lower
//   bound >= 0.671; b = acc - majority in [0.477,0.600], lower bounds >= 0.464; c1 = deranged keywords drop class accuracy by [0.076,
//   0.136], lower bounds >= 0.066; c2 = no delimiters drop F1 by [0.163,0.261], lower bounds >= 0.127; (iv) every held-out repository
//   with >= 3 files is above whitespace + 0.10 (worst: ruby Homebrew/brew F1 0.9076, c holzschu/a-shell 0.9251). All five clauses hold
//   in all six languages: pass=True x6, no failed clause.
//   RESULT: the measured DEV optimism is NIL to NEGATIVE (the largest positive gap is 0.0009 F1 and 0.0023 acc). The DEV iteration did
//   not inflate the headline numbers; the held-out TRAIN repositories score as well as the DEV ones. What this does NOT show: that TEST
//   will score the same (no TEST run exists), or that the lexer is right about code (see LIMITS (2)).
//   PREDICTION SCORECARD: LORO F1 inside its band in all six (python .9996 in [.980,1.000], javascript .9958 in [.960,.998], c .9908 in
//   [.930,.995], go 1.0000 in [.990,1.000], ruby .9580 in [.850,.970], java .9989 in [.990,1.000]); LORO class accuracy inside its band in
//   five and ABOVE it for ruby (.9878 vs [.900,.985]); every DEV - LORO F1 gap inside the predicted +-0.02 (+-0.04 for c, ruby). The
//   hedge that javascript, c or ruby might fail (i), (iv) did not happen. The point guesses were again slightly pessimistic.
//   Repository heterogeneity is large and real inside the pooled number: ruby Homebrew/brew 0.9076 vs postalserver/postal 0.9971; c
//   holzschu/a-shell 0.9251 vs apache/thrift 0.9964. Several C repositories contributed 1 to 2 eligible files (the 200 kB cap and the
//   copyleft-row exclusion removed the rest), so their per-repo numbers are single-file anecdotes; only pooled and >= 3-file rows count.
// L1-A1 (2026-10-06, STRUCTURE ONLY, same day as the first run): the DEV class accuracy is now read from details.class.strictAcc of the
//   c1-lex.mjs DEV file (c1-lex.mjs A10 removed classAccReal from its controls{}), and controls{} here no longer lists the real arm's
//   own class accuracy or the DEV reference. All six leave-one-repository-out runs were repeated: every statistic, interval, per-repo row
//   and verdict is identical to the first run.
// =====================================================================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { goldAvailable } from "./gold.mjs";
import { loadManifest, selectRows, loadDocs, OUT_DIR } from "./c1-common.mjs";
import { deriveLexPrior, lexCode, whitespaceSplit, derangeKeywords, withoutDelimiters } from "../../adapters/code/lex.js";
import { scoreFile, zeroVec, addVec, f1Of, accOf, majorityOf, majShareOf, bootstrap, CONSTANTS } from "./c1-lex.mjs";

export const ID = "c1-loro";
export const RUNG = {
  id: "R1",
  name: "hear tokens, leave-one-repository-out optimism check",
  question: "Do the DEV scores of the lexer survive repositories the prior never saw and that nobody read while the lexer was revised?",
};
export const LORO_CONSTANTS = Object.freeze({ OPTIMISM_TOL: 0.02, MIN_REPOS: 3, MIN_FILES: 10, REPO_MIN_FILES: 3 });
const ALIASES = { py: "python", js: "javascript", golang: "go", rb: "ruby" };
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);

/**
 * loroPlan(docs) -> [{repo, trainDocs, heldDocs}] one entry per repository, `trainDocs` being every file of every OTHER repository.
 * Pure (exported so the instrument test can check that the held-out repository never leaks into its own prior).
 */
export function loroPlan(docs, limit = null) {
  const repos = [...new Set(docs.map((d) => d.repo))].sort();
  return repos.map((repo) => {
    const held = docs.filter((d) => d.repo === repo);
    return { repo, trainDocs: docs.filter((d) => d.repo !== repo), heldDocs: limit ? held.slice(0, limit) : held };
  });
}

function emptyResult(lang) {
  return { id: ID, rung: RUNG.id, language: lang, split: "train", n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: { language: lang } };
}

/** devReference(lang) -> {f1, acc, n, full} from the saved full DEV run of c1-lex.mjs, or null */
function devReference(lang) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(OUT_DIR, `c1-lex-${lang}-dev.json`), "utf8"));
    return { f1: j.score, acc: j.details?.class?.strictAcc, n: j.n, full: j.details?.sample?.limit === null };
  } catch { return null; }
}

export async function measure({ language, split = "train", limit = null, _docs = null, _derive = deriveLexPrior } = {}) {   // _docs/_derive: test hooks (toy docs instead of the corpus)
  const lang = ALIASES[String(language ?? "").toLowerCase()] ?? String(language ?? "").toLowerCase();
  const res = emptyResult(lang);
  const gap = (reason, count = 1) => res.gaps.push({ reason, count });
  try {
    if (!lang) { gap("unmeasured: no language given"); return res; }
    if (split !== "train") { gap(`refused: c1-loro is TRAIN-only (leave-one-repository-out inside TRAIN); split=${split} is never read here`); return res; }
    let docs = _docs;
    if (!docs) {
      const av = goldAvailable();
      if (!av.available) { gap(`unmeasured: gold extractor unavailable (${av.reason})`); return res; }
      let manifest;
      try { manifest = loadManifest(); } catch { gap("unmeasured: corpus manifest missing"); return res; }
      const sel = selectRows(manifest, lang, "train", null);
      if (sel.missing) { gap(`unmeasured: manifest has no train split for ${lang}`); return res; }
      if (sel.excluded.restricted) gap("excluded: restricted (copyleft) rows", sel.excluded.restricted);
      if (sel.excluded.tooBig) gap("excluded: over the byte cap", sel.excluded.tooBig);
      const loaded = await loadDocs(lang, sel.rows);
      for (const g of loaded.gaps) gap(g.reason, g.count);
      docs = loaded.docs;
    }
    const repos = [...new Set(docs.map((d) => d.repo))];
    res.details.repos = repos.length;
    if (repos.length < LORO_CONSTANTS.MIN_REPOS) { gap(`unmeasured: ${repos.length} TRAIN repositories with eligible files (< ${LORO_CONSTANTS.MIN_REPOS}): no leave-one-repository-out`); return res; }

    const t0 = Date.now();
    const perFile = [];
    const repoRows = [];
    const plan = loroPlan(docs, limit);
    for (const { repo, trainDocs, heldDocs } of plan) {
      if (!heldDocs.length) continue;
      const P = _derive(trainDocs.map((d) => ({ repo: d.repo, text: d.text, tokens: d.tokens })), { language: lang, grammar: docs[0]?.gold?.grammar ?? null, giver: "tree-sitter grammar via gold.mjs, TRAIN repositories other than the held-out one", trainRepos: [...new Set(trainDocs.map((d) => d.repo))].map((r) => ({ repo: r })), trainFiles: [] });
      const kw = CONSTANTS.KW_SEEDS.map((s) => ({ seed: s, prior: derangeKeywords(P, s) }));
      const noDel = withoutDelimiters(P);
      const rowArms = {};
      for (const d of heldDocs) {
        const G = d.tokens;
        const arms = { real: scoreFile(G, lexCode(d.text, P)), whitespace: scoreFile(G, whitespaceSplit(d.text, P)), noDelims: scoreFile(G, lexCode(d.text, noDel)) };
        for (const k of kw) arms[`kw${k.seed}`] = scoreFile(G, lexCode(d.text, k.prior));
        perFile.push(arms);
        for (const a of Object.keys(arms)) addVec(rowArms[a] ??= zeroVec(), arms[a]);
      }
      repoRows.push({ repo, files: heldDocs.length, f1: r4(f1Of(rowArms.real)), wsF1: r4(f1Of(rowArms.whitespace)), acc: r4(accOf(rowArms.real)), majShare: r4(majShareOf(rowArms.real)),
        priorFromRepos: new Set(trainDocs.map((d) => d.repo)).size, priorKeywords: P.words.keyword.length, priorComments: P.comments.length, priorStrings: P.strings.length });
    }
    res.n = perFile.length;
    if (perFile.length < LORO_CONSTANTS.MIN_FILES) { gap(`n<${LORO_CONSTANTS.MIN_FILES}: ${perFile.length} held-out files, no verdict`); return res; }

    const arms = Object.keys(perFile[0]);
    const total = Object.fromEntries(arms.map((a) => [a, zeroVec()]));
    for (const f of perFile) for (const a of arms) addVec(total[a], f[a]);
    const R = total.real;
    const kwBest = CONSTANTS.KW_SEEDS.map((s) => ({ seed: s, acc: accOf(total[`kw${s}`]) })).sort((a, b) => b.acc - a.acc)[0];
    const kwArm = `kw${kwBest.seed}`;
    const A = bootstrap(perFile, (s) => f1Of(s.real) - f1Of(s.whitespace));
    const Bc = bootstrap(perFile, (s) => accOf(s.real) - majShareOf(s.real));
    const C1 = bootstrap(perFile, (s) => accOf(s.real) - accOf(s[kwArm]));
    const C2 = bootstrap(perFile, (s) => f1Of(s.real) - f1Of(s.noDelims));
    const clauseA = A.point >= CONSTANTS.F1_MARGIN && A.lo > 0;
    const clauseB = Bc.point >= CONSTANTS.ACC_MARGIN && Bc.lo > 0;
    const clauseC1 = C1.point >= CONSTANTS.LICENCE_DROP && C1.lo > 0;
    const clauseC2 = C2.point >= CONSTANTS.LICENCE_DROP && C2.lo > 0;
    const repoOk = repoRows.filter((r) => r.files >= LORO_CONSTANTS.REPO_MIN_FILES).every((r) => r.f1 - r.wsF1 >= CONSTANTS.F1_MARGIN);

    const f1 = f1Of(R), acc = accOf(R);
    const dev = devReference(lang);
    let optF1 = null, optAcc = null;
    if (!dev) gap(`unmeasured: DEV reference c1-lex-${lang}-dev.json missing (run c1-lex.mjs --language ${lang} first)`);
    else if (!dev.full) gap("unmeasured: the saved DEV reference is a --limit run, not a full dev run");
    else { optF1 = dev.f1 - f1; optAcc = dev.acc - acc; }
    const failed = [];
    if (optF1 != null && !(optF1 <= LORO_CONSTANTS.OPTIMISM_TOL)) failed.push("i:F1-optimism-over-0.02");
    if (optAcc != null && !(optAcc <= LORO_CONSTANTS.OPTIMISM_TOL)) failed.push("ii:ACC-optimism-over-0.02");
    if (!clauseA) failed.push("iii-a:boundary-vs-whitespace");
    if (!clauseB) failed.push("iii-b:class-vs-majority");
    if (!clauseC1) failed.push("iii-c1:deranged-keywords-did-not-move-class-accuracy");
    if (!clauseC2) failed.push("iii-c2:no-delimiters-did-not-move-boundary-F1");
    if (!repoOk) failed.push("iv:a-repository-is-not-above-whitespace+0.10");
    res.score = r4(f1);
    res.control = r4(f1Of(total.whitespace));
    res.margin = r4(f1 - f1Of(total.whitespace));
    res.pass = dev && dev.full ? failed.length === 0 : null;
    const maj = majorityOf(R);
    // controls{} lists only arms built to fail; the real arm's class accuracy and the DEV reference live in details (see c1-lex.mjs A10)
    res.controls = {
      whitespaceF1: r4(f1Of(total.whitespace)), majorityClassAcc: r4(maj.share),
      derangedKeywordsClassAcc: r4(kwBest.acc), noDelimitersF1: r4(f1Of(total.noDelims)),
    };
    res.details = {
      language: lang, files: perFile.length, repos: repoRows.length, predictedTokens: R[1],
      loro: { f1: r4(f1), classAcc: r4(acc), majorityClass: maj.cls },
      dev: dev ? { n: dev.n, f1: r4(dev.f1), classAcc: r4(dev.acc), fullRun: dev.full } : null,
      optimism: { f1: r4(optF1), classAcc: r4(optAcc), tolerance: LORO_CONSTANTS.OPTIMISM_TOL },
      clauses: {
        a: { diff: r4(A.point), ci95: [r4(A.lo), r4(A.hi)], pass: clauseA }, b: { diff: r4(Bc.point), ci95: [r4(Bc.lo), r4(Bc.hi)], pass: clauseB },
        c1: { drop: r4(C1.point), ci95: [r4(C1.lo), r4(C1.hi)], pass: clauseC1, strongestSeed: kwBest.seed }, c2: { drop: r4(C2.point), ci95: [r4(C2.lo), r4(C2.hi)], pass: clauseC2 },
        iv: { everyRepoAboveWhitespacePlusMargin: repoOk }, failed,
      },
      perRepo: repoRows,
      constants: { ...LORO_CONSTANTS, ...CONSTANTS },
      seconds: Math.round((Date.now() - t0) / 100) / 10,
    };
    return res;
  } catch (e) {
    gap(`unmeasured: ${e?.code ?? "error"}: ${String(e?.message ?? e).split("\n")[0].slice(0, 200)}`);
    res.pass = null;
    return res;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const language = opt("--language");
  if (!language) { console.error("usage: node eval/coding-competence/c1-loro.mjs --language <lang> [--limit N]"); process.exit(2); }
  const r = await measure({ language, split: "train", limit: opt("--limit", null) ? Number(opt("--limit")) : null });
  try { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(OUT_DIR, `c1-loro-${r.details.language}-train.json`), JSON.stringify(r, null, 1) + "\n"); } catch { /* printing is enough */ }
  console.log(JSON.stringify(r));
}
