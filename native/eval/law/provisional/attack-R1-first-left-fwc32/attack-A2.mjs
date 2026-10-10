// attack-A2.mjs: ATTACK A2 (gold tokenisation, gold punctuation, training-set size) on rule R1-first-left-fwc32.   modes: equaln w1|w2 OUT | mwt w1|w2 OUT | punct w1|w2 OUT | summary
//   run: NAME_COMPANY_PAIRBLOCK=1 node attack-A2.mjs mwt w1 results/A2.mwt.w1.json     (never pass "run" as first argument)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE. Seen when written: attack A (all variants survive except V4 name-chain removal which narrows), attack C (SENTCOMP 0.505, S2 0.607, L1only 0.624, RIGHT 0.618 in the clean zone, FINE 0.546), attack B (robust gradient, BUNDLE moderators, clade-within rho 0.42),
//   attack D collect jobs launched (no D result read). Counted from the TB train files before writing: number of multiword-token (MWT) lines per treebank: heb 31428, arb 30459, ita 18377, por 17915, cat 12441, spa 10129, fra 9686, glg 7529, fas 6508, deu 4610,
//   kat 2634, eng 2614, pol 2010, ind 1734, ell 1114, tur 1082, ces 1015 (others fewer). A TIMING PROBE of mode mwt on two w1 languages was printed before the full run: fra word-stream FWC32 0.422 / LEFT 0.716 vs surface-stream 0.395 / 0.713 (MWT share 0.033); heb word 0.398 / 0.705 vs surface 0.145 / 0.528 (MWT share 0.361). NOT seen: any other surface-stream number, any equal-n or char-class-punctuation number.
// THREE SMALL ATTACKS ON THE OBSERVABLES' DEPENDENCE ON GOLD MARKUP.
//  (1) MWT (gold tokenisation). The rule's stream is UD SYNTACTIC WORDS (an MWT such as Hebrew/Arabic prefixed clitics, Romance "del" = de+el, German "zum" is split into words by the annotators). A zero-model reader sees SURFACE tokens. mode mwt rebuilds the same window
//      with surface tokens (MWT unsplit, one token with the MWT's own form; MWT tokens are never targets, they stay as neighbours; PUNCT dropped as before; sentences are the same), recomputes FWC32 and the V0b LEFT probe (5 draws). Alignment with the confirmer's window is
//      verified token by token (word-level reconstruction must equal windows/<stem>.json). Languages with MWT share >= 5% of surface tokens are "MWT languages".
//      DECISION: tokenisation-dependent scope iff (a) >= 3 MWT languages change side of the 0.2378 cut (word FWC32 >= cut and surface FWC32 < cut, or the reverse) or (b) the mean AUC of MWT languages that are in scope by word-FWC32 falls by >= 0.03 on the surface stream.
//  (2) PUNCT. The stream drops tokens whose gold UPOS is PUNCT. mode punct replaces that by a character-class rule (drop a token iff its form consists only of Unicode punctuation/symbol characters), keeping the sentence set (kept by the UPOS rule) so that windows align.
//      Report the counts (PUNCT-tagged tokens that are not pure punctuation; non-PUNCT tokens that are) per treebank. DECISION: no dependence iff |mean change of the LEFT AUC| <= 0.01 and the gradient rho changes by <= 0.05.
//  (3) EQUAL-N. The probe is trained on the language's own pairs (leave-quartile-out), so a language with 80 pairs has about 60 training pairs and a language with 600 pairs has 450: AUC depends on training size (the measurement-level Spearman of pairs with AUC is +0.335 in attack B).
//      mode equaln subsamples every language's V0b rows to n = 100 and n = 200 pairs (both members of a pair kept; 3 base draws x 6 subsamples = 18 CV runs per cell) and recomputes the gradient and zone means among languages with >= n pairs.
//      DECISION: survives iff Spearman(FWC32, AUC) >= 0.40 with p <= 0.05 (B = 2000) and clean-zone mean >= 0.60 at both n.
// BLIND PREDICTIONS. (1) heb and arb surface FWC32 below 0.2378: 0.80; (a) holds: 0.50; (b) holds: 0.40. (2) no dependence: 0.85. (3) survives at both n: 0.85; clean-zone mean at n = 100 is 0.02-0.04 below the full-n mean: 0.6.
// NOT TESTED: raw-text sentence segmentation (gold sentence boundaries are kept), whitespace segmentation of zh/ja (those scripts have no spaces; a zero-model word-stream does not exist for cmn/jpn/lzh without a segmenter; reported as a scope remark only).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { win1, win2, listWin, rngFor, seedFor, pairsX, cvArm, A, S2r, pairedScore, headerSha, round, mean, share, permRho, mulberry, shuffleIn, inBand, describe, fwcK, TB, rdj, CONF } from "./lib-attack.mjs";
const norm = (s) => s.normalize("NFC").toLowerCase(), PUNCTRE = /^[\p{P}\p{S}]+$/u;
const [mode, a1, a2, a3] = process.argv.slice(2);
function readTB(file, charClass = false) {
  const wordsS = [], wordsU = [], surfS = [], surfU = [], counts = { punctTagged: 0, punctTaggedNotPure: 0, nonPunctPure: 0, tokens: 0 };
  let words = [], mwts = [];
  const flush = () => {
    const np = words.filter((x) => x.upos !== "PUNCT"); if (!np.length) { words = []; mwts = []; return; }
    const start = new Map(mwts.map((m) => [m.a, m])); const ws = [], wu = [], ss = [], su = []; let k = 0;
    const drop = (x) => (charClass ? PUNCTRE.test(x.form) : x.upos === "PUNCT");
    for (const x of words) { if (!drop(x)) { ws.push(norm(x.form)); wu.push(x.upos); } }
    while (k < words.length) { const w = words[k], m = start.get(w.id); if (m) { const inside = words.filter((x) => x.id >= m.a && x.id <= m.b); k += inside.length; if (inside.every(drop)) continue; ss.push(norm(m.form)); su.push("MWT"); } else { k += 1; if (drop(w)) continue; ss.push(norm(w.form)); su.push(w.upos); } }
    if (ws.length) { wordsS.push(ws); wordsU.push(wu); surfS.push(ss); surfU.push(su); } else { /* keep alignment with the UPOS rule */ wordsS.push(ws); wordsU.push(wu); surfS.push(ss); surfU.push(su); }
    words = []; mwts = [];
  };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; } if (line[0] === "#") continue; const f = line.split("\t"); if (f.length < 10) continue;
    if (/^\d+-\d+$/.test(f[0])) { const [a, b] = f[0].split("-").map(Number); mwts.push({ a, b, form: f[1] }); } else if (/^\d+$/.test(f[0])) { const u = f[3]; words.push({ id: +f[0], form: f[1], upos: u }); counts.tokens++; const pure = PUNCTRE.test(f[1]); if (u === "PUNCT") { counts.punctTagged++; if (!pure) counts.punctTaggedNotPure++; } else if (pure) counts.nonPunctPure++; }
  }
  flush(); return { wordsS, wordsU, surfS, surfU, counts };
}
const winOf = (wk, stem) => (wk === "w1" ? win1(stem) : win2(stem));
const tagOf = (wk) => (wk === "w1" ? "" : "-w2");
function drawAuc(sents, upos, stem, tag, R = 5) {
  const out = []; for (let k = 0; k < R; k++) { const pr = pairsX(sents, upos, {}, { P: rngFor(seedFor("attack-R1", stem, "P" + tag + "#" + k)), N: rngFor(seedFor("attack-R1", stem, "NV0b" + tag + "#" + k)) }); if (pr.pairs < 60) continue; out.push({ pairs: pr.pairs, auc: cvArm(pr.rows, A.LEFT), pos: cvArm(pr.rows, A.POSITION), S2: pairedScore(pr.rows, S2r) }); }
  return out.length >= 3 ? { pairs: round(mean(out.map((x) => x.pairs)), 1), auc: round(mean(out.map((x) => x.auc))), pos: round(mean(out.map((x) => x.pos))), S2: round(mean(out.map((x) => x.S2))), draws: out.length } : { thin: true, pairs: round(mean(out.map((x) => x.pairs)) || 0, 1) };
}
const stems = (wk) => listWin(wk === "w1" ? "windows" : "windows2").filter((s) => !process.env.ONLY || process.env.ONLY.split(",").includes(s));
const trainFile = (stem) => path.join(TB, stem === "kor" ? "kor-gsd" : stem, "train.conllu");
if (mode === "mwt" || mode === "punct") {
  const wk = a1, R = { headerSha256: headerSha(import.meta.url), mode, window: wk, rows: [] };
  for (const stem of stems(wk)) {
    const w = winOf(wk, stem), t = readTB(trainFile(stem), mode === "punct"), off = w.offset, take = w.taken;
    const ws = t.wordsS.slice(off, off + take), wu = t.wordsU.slice(off, off + take), ss = t.surfS.slice(off, off + take), su = t.surfU.slice(off, off + take);
    const row = { name: stem, nSentFile: t.wordsS.length }; row.aligned = mode === "punct" ? null : JSON.stringify(ws) === JSON.stringify(w.sents);
    if (mode === "mwt") { if (!row.aligned) { row.error = "ALIGNMENT FAILED"; } else { const nM = su.reduce((a, u) => a + u.filter((x) => x === "MWT").length, 0), nT = su.reduce((a, u) => a + u.length, 0); row.mwtShare = round(nM / nT); row.fwcWord = round(fwcK(ws, 32)); row.fwcSurf = round(fwcK(ss, 32)); row.tokensWord = ws.reduce((a, s) => a + s.length, 0); row.tokensSurf = nT;
      if (row.mwtShare >= 0.01) { row.word = drawAuc(ws, wu, stem, tagOf(wk)); row.surf = drawAuc(ss, su, stem, tagOf(wk)); } } }
    else { row.counts = t.counts; row.fwc = round(fwcK(ws, 32)); row.fwcOrig = round(describe(w.sents).fwc32); row.cc = drawAuc(ws, wu, stem, tagOf(wk)); }
    R.rows.push(row); fs.writeFileSync(a2, JSON.stringify(R)); console.error(stem, mode, JSON.stringify(row).slice(0, 260));
  }
  console.log("collected", mode, wk, R.rows.length);
}
if (mode === "equaln") {
  const wk = a1, R = { headerSha256: headerSha(import.meta.url), mode, window: wk, rows: [] }, NS = [100, 200];
  for (const stem of stems(wk)) {
    const w = winOf(wk, stem), d = describe(w.sents), row = { name: stem, fwc32: round(d.fwc32), full: {}, n: {} }, tag = tagOf(wk), rnd = mulberry(seedFor("attack-R1", stem, "sub" + tag) >>> 0);
    const per = Object.fromEntries(NS.map((n) => [n, { auc: [], pos: [], pairs: [] }])); const full = [];
    for (let k = 0; k < 3; k++) { const pr = pairsX(w.sents, w.upos, {}, { P: rngFor(seedFor("attack-R1", stem, "P" + tag + "#" + k)), N: rngFor(seedFor("attack-R1", stem, "NV0b" + tag + "#" + k)) }); if (pr.pairs < 60) continue; full.push({ pairs: pr.pairs, auc: cvArm(pr.rows, A.LEFT) });
      for (const n of NS) { if (pr.pairs < n) continue; for (let b = 0; b < 6; b++) { const ids = shuffleIn(Array.from({ length: pr.pairs }, (_, i) => i), rnd).slice(0, n).sort((x, y) => x - y), rows = []; for (const i of ids) rows.push(pr.rows[2 * i], pr.rows[2 * i + 1]); per[n].auc.push(cvArm(rows, A.LEFT)); per[n].pos.push(cvArm(rows, A.POSITION)); } } }
    if (full.length) row.full = { pairs: round(mean(full.map((x) => x.pairs)), 1), auc: round(mean(full.map((x) => x.auc))) };
    for (const n of NS) if (per[n].auc.length >= 6) row.n[n] = { auc: round(mean(per[n].auc)), pos: round(mean(per[n].pos)), cells: per[n].auc.length };
    R.rows.push(row); fs.writeFileSync(a2, JSON.stringify(R)); console.error(stem, "fwc", row.fwc32, "full", JSON.stringify(row.full), "n100", row.n[100]?.auc ?? "-", "n200", row.n[200]?.auc ?? "-");
  }
  console.log("collected", mode, wk, R.rows.length);
}
if (mode === "summary") {
  // summary MWT.w1 MWT.w2 PUNCT.w1 PUNCT.w2 EQN.w1 EQN.w2 -> a3 handled via argv list
  const files = process.argv.slice(3), rd = (f) => JSON.parse(fs.readFileSync(f, "utf8")), [m1, m2, p1, p2, e1, e2, outf] = files, out = { headerSha256: headerSha(import.meta.url) };
  const cut = 0.2378, M = [...rd(m1).rows.map((r) => ({ ...r, win: "w1" })), ...rd(m2).rows.map((r) => ({ ...r, win: "w2" }))].filter((r) => !r.error && r.mwtShare != null && r.word && r.name !== "cmn-hans");
  const ml = M.filter((r) => r.mwtShare >= 0.05);
  out.mwt = { nMwtLanguageWindows: ml.length, rows: ml.sort((a, b) => b.mwtShare - a.mwtShare).map((r) => ({ name: r.name, win: r.win, mwtShare: r.mwtShare, fwcWord: r.fwcWord, fwcSurf: r.fwcSurf, aucWord: r.word.auc ?? null, aucSurf: r.surf.auc ?? null, pairsWord: r.word.pairs, pairsSurf: r.surf.pairs, S2Word: r.word.S2 ?? null, S2Surf: r.surf.S2 ?? null, posSurf: r.surf.pos ?? null })) };
  const changed = ml.filter((r) => (r.fwcWord >= cut) !== (r.fwcSurf >= cut)); out.mwt.changedSide = changed.map((r) => `${r.name}:${r.win} ${r.fwcWord}->${r.fwcSurf}`);
  const inWord = ml.filter((r) => r.fwcWord >= cut && r.word.auc != null && r.surf.auc != null), drop = mean(inWord.map((r) => r.surf.auc - r.word.auc)); out.mwt.inScopeByWordN = inWord.length; out.mwt.meanAucChangeInScope = round(drop);
  out.mwt.meanFwcChange = round(mean(ml.map((r) => r.fwcSurf - r.fwcWord))); const uniqChanged = new Set(changed.map((r) => r.name)); out.mwt.nLanguagesChanged = uniqChanged.size; out.mwt.dependent = uniqChanged.size >= 3 || drop <= -0.03;
  const rule = ml.filter((r) => r.surf.auc != null && inBand(r.surf.pos)), hitW = rule.filter((r) => (r.fwcWord >= cut) === (r.word.auc >= 0.6)).length, hitS = rule.filter((r) => (r.fwcSurf >= cut) === (r.surf.auc >= 0.6)).length; out.mwt.ruleHits = { n: rule.length, byWordFwc: hitW, bySurfaceFwc: hitS };
  // gradient on the whole set using surface FWC for the MWT languages and word FWC elsewhere (all rows of the mwt run, windows pooled)
  const all = M.filter((r) => r.surf.auc != null && inBand(r.surf.pos) && r.word.auc != null && inBand(r.word.pos)); const gW = permRho(all.map((r) => r.fwcWord), all.map((r) => r.word.auc), 2000), gS = permRho(all.map((r) => r.fwcSurf), all.map((r) => r.surf.auc), 2000);
  out.mwt.gradientAmongStemsWithMwtLines = { n: all.length, wordRho: round(gW.rho, 3), surfRho: round(gS.rho, 3), surfP: round(gS.p, 4) };
  const P = [...rd(p1).rows.map((r) => ({ ...r, win: "w1" })), ...rd(p2).rows.map((r) => ({ ...r, win: "w2" }))].filter((r) => r.cc && !r.cc.thin && r.name !== "cmn-hans");
  // baseline AUC from attack A V0b (same seeds)
  const A1 = rd(path.join(path.dirname(a1 === undefined ? "." : m1), "A.w1.json")).rows, A2 = rd(path.join(path.dirname(m1), "A.w2.json")).rows, base = (r) => { const s = (r.win === "w1" ? A1 : A2).find((x) => x.name === r.name)?.V?.V0b; return s && !s.thin ? s.auc : null; };
  const pc = P.filter((r) => base(r) != null), dd = pc.map((r) => r.cc.auc - base(r)); out.punct = { n: pc.length, meanChange: round(mean(dd)), maxAbs: round(Math.max(...dd.map(Math.abs))), gradBase: round(permRho(pc.map((r) => r.fwcOrig), pc.map(base), 1000).rho, 3), gradCC: round(permRho(pc.map((r) => r.fwc), pc.map((r) => r.cc.auc), 1000).rho, 3),
    notPureShare: round(mean(rd(p1).rows.map((r) => r.counts.punctTaggedNotPure / Math.max(1, r.counts.punctTagged))), 4), nonPunctPureShare: round(mean(rd(p1).rows.map((r) => r.counts.nonPunctPure / r.counts.tokens)), 4), worstNotPure: rd(p1).rows.map((r) => ({ n: r.name, v: round(r.counts.punctTaggedNotPure / Math.max(1, r.counts.punctTagged), 3) })).sort((a, b) => b.v - a.v).slice(0, 5), worstNonPunctPure: rd(p1).rows.map((r) => ({ n: r.name, v: round(r.counts.nonPunctPure / r.counts.tokens, 4) })).sort((a, b) => b.v - a.v).slice(0, 5) };
  out.punct.noDependence = Math.abs(out.punct.meanChange) <= 0.01 && Math.abs(out.punct.gradCC - out.punct.gradBase) <= 0.05;
  const E = [...rd(e1).rows.map((r) => ({ ...r, win: "w1" })), ...rd(e2).rows.map((r) => ({ ...r, win: "w2" }))].filter((r) => r.name !== "cmn-hans"); out.equaln = {};
  for (const n of [100, 200]) { const us = E.filter((r) => r.n[n] && inBand(r.n[n].pos)); const p = permRho(us.map((r) => r.fwc32), us.map((r) => r.n[n].auc), 2000), cl = us.filter((r) => r.fwc32 >= 0.28), dl = us.filter((r) => r.fwc32 < 0.24), fullAuc = us.map((r) => r.full.auc);
    out.equaln[n] = { nUnits: us.length, rho: round(p.rho, 3), p: round(p.p, 4), cleanMean: round(mean(cl.map((r) => r.n[n].auc))), nClean: cl.length, deafMean: round(mean(dl.map((r) => r.n[n].auc))), nDeaf: dl.length, cleanShareAudible: round(share(cl, (r) => r.n[n].auc >= 0.6)), fullMeanSameUnits: round(mean(fullAuc)), fullRhoSameUnits: round(permRho(us.map((r) => r.fwc32), fullAuc, 1000).rho, 3), cleanFullSameUnits: round(mean(cl.map((r) => r.full.auc))) };
    out.equaln[n].survives = p.rho >= 0.4 && p.p <= 0.05 && mean(cl.map((r) => r.n[n].auc)) >= 0.6; }
  fs.writeFileSync(outf, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
