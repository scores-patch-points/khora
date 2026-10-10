// attack-PM-R1-unit-initial-excess/attack-A.mjs -- ATTACK A (LEAKAGE AND CONFOUNDS) on rule PM-R1 (unit-initial excess pInitX). New file; edits nothing.
//
//   node attack-A.mjs ud|irc|code|book   -> results/A-<name>.jsonl      node attack-A.mjs summary -> results/A-summary.json + A-summary.txt (mechanical verdicts)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; thresholds below may be tightened, never loosened, after any result) ════════════════════════
// DISCLOSURE (what I have seen). (1) The rule JSON and the confirmer's whole directory: confirm.mjs/lib.mjs/verdict.mjs, tables.txt, results/*.jsonl (all its numbers, incl. its per-language table, strata
//   evalInitial/evalNonInitial, the sham/shuffle rows) and its manifest. (2) ONE smoke test of attack-lib.mjs (smoke.mjs): the K0 key (= the confirmer's matching key re-implemented) on en_ewt FULL gave 0.593
//   [0.539,0.649] (confirmer 0.582) and on irc-en-fresh FULL 0.902 [0.875,0.926] (confirmer 0.915): my builder reproduces its numbers up to pair draws. NO stricter key, no variant below and no other cell has
//   been run. (3) A STATIC AUDIT of the observables (reading code, no run): (a) IRC/UD tokens are lowercased, the speaker field never enters a feature; (b) the UD loader drops PUNCT tokens by gold UPOS
//   (a cleaning step, not a name cue); (c) the BOOK loader (confirmer's bookBase) calls splitSentences(text) WITHOUT an abbreviation prior, and spans.js documents that its fallback derive-abbreviations recovers
//   nothing on Pride and Prejudice ("Mr. Darcy" stays split) -> a title's period ends a "sentence" and the name after a title becomes UNIT-INITIAL by segmentation, a format artefact that favours names;
//   (d) matching exactness: the confirmer matches exactly on log2 count bin, unit-index BUCKET {0,1,2-3,4+}, char-length BUCKET {<=2,3-4,5-6,7+} and log2 unit-length bucket of the EVALUATED occurrence only,
//   with a relaxation of the unit-length bucket when no exact match exists; it does not match count within the bin, exact index, exact unit length, recency or local mention count; (e) in IRC, 91% of the
//   confirmer's positive evaluated occurrences sit at message index 0 (strata evalInitial 544/600), and in Python the effect lives in evalNonInitial (933/991 pairs, AUC 0.665; evalInitial 0.328).
// DATA (all FRESH tier of the confirmer, rebuilt with ITS seeds so the streams are identical): UD train windows of 59 treebanks (manifest ud.files, 40000-token windows seeded by seedFor(pm-r1-confirm,tb,window));
//   IRC en: 50 fresh days pooled (primary) + REPLICATE tier (the scoper's reserved en/de/es/it days, NOT fresh, supplementary, flagged); novels Dracula, Dorian Gray, Moby Dick, Sherlock (fresh) and Tom Sawyer,
//   Middlemarch, Frankenstein (replicate); code: the 16 js + 16 py fresh lexed files. Gold (UPOS, nickname metadata, capital-share labels, parser classes) selects and evaluates pairs only.
// TESTS. Matching ladder (attack-lib.mjs SPECS): K0 = confirmer's key; K1 = K0 key without relaxation + total count within tol (1 if n<=20 else 5%); K2 = K1 + EXACT unit index + EXACT unit length (<=15);
//   K3 = K2 + EXACT character length; K4 = K3 + local mention count (+-25 units) within 1 + recency (octave of units since previous mention). <= 3 pairs per form and side, <= 600 pairs per cell (code 1000 over
//   16 files, per-file cap as the confirmer), exact matches only (no relaxation) from K1 on. Feature: pInitX FULL (all mentions), CAUSAL4 (4 mentions before), LOO (all but the evaluated one). Cluster bootstrap
//   B=300 over positive forms. Variants at fixed rung: LONG6 (units of >=6 tokens only; K0 and K2); DIST25 (pInitX from mentions > 25 units away from the evaluated one, >=2 of them required; K0 and K2);
//   IRC only: NOBOT (drop messages whose speaker nick contains "bot": evaluation-side use of metadata), EVALINIT / EVALNON (K2 restricted to evaluated index 0 / index >= 1). BOOKS: bookBase's default
//   segmenter vs the same book segmented with a title-abbreviation prior (Mr Mrs Ms Dr St Mme Mlle Messrs Col Capt Prof Rev Gen Lt Sr Jr Hon Esq) = the production reader's language prior.
// VERDICT RULES (mechanical; summary mode). A cell is VALID if pairs >= 60 and position control in [0.45,0.55]; POS = CI lower > 0.5 and AUC >= 0.53; NEG = CI upper < 0.5 and AUC <= 0.47.
//   IRC set at a rung: HOLD if AUC >= 0.80 with CI lower > 0.5 and >= 60 pairs and valid; DEGRADED if 0.65 <= AUC < 0.80; BROKEN if < 0.65. UD at a rung: over valid cells, HOLD if median (lower median) >= 0.55
//   AND POS share >= 0.40 AND >= 12 valid cells; DEGRADED if median in [0.53,0.55) or POS share in [0.25,0.40); BROKEN if median < 0.53 or POS share < 0.25; UNDERPOWERED if < 12 valid cells (then only the paired
//   comparison on cells valid at K0 and at that rung is reported). CODE (py, js separately) at a rung: HOLD if AUC >= 0.55 and CI lower > 0.5. BOOKS: the segmenter is a MATERIAL LEAK if the median over the
//   7 novels of (AUC default segmenter - AUC title-prior segmenter) at K0 FULL exceeds 0.03. ATTACK SUCCEEDS on a family if that family is not HOLD at K3 (the strictest rung that is not underpowered) in FULL mode.
// BLIND PREDICTIONS (probability my prior gives). IRC fresh pooled HOLD at K3: 0.90, at K4: 0.75; IRC NOBOT HOLD 0.90; LONG6 HOLD 0.80; DIST25 HOLD 0.80; IRC de/es/it replicate HOLD at K2: 0.70 each. UD HOLD at K1: 0.60,
//   K2: 0.40, K3: 0.30 (UNDERPOWERED likelier at K3/K4: 0.60); UD LONG6 HOLD 0.35; UD DIST25 HOLD 0.35. Python HOLD at K3: 0.80; js HOLD at K3: 0.35. Books: segmenter MATERIAL leak 0.50; the fresh-novel AUCs
//   with the title prior drop for >= 3 of 4 novels: 0.60.
// NOT TESTED. First mentions; fitted classifiers; company/ablation observables; any other language prior; de/es/it fresh chat (does not exist).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, MAN, IRCDIR, CPRE, ircFiles, udWindow, ircBase, bookBase, codeBase, prep, occsOf, buildPairs, evalPairs, SPECS, UD_DEFS, IRC_DEFS, BOOK_DEFS, CODE_DEFS, rngFor, seedFor, headerSha, sha256, round, mean, quantile, lowMed, trueMed, sign, validCell, featuresOf, log, readConllu, splitSentences, labelBook, ircLoad } from "./attack-lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), name = process.argv[2], HDR = headerSha(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
const OUT = path.join(HERE, "results", `A-${name}.jsonl`);
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, ...o }) + "\n");
const RUNGS = ["K0", "K1", "K2", "K3", "K4"], B = 300;
const CONF = path.join(HERE, "..", "confirm-PM-R1-unit-initial-excess"), G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/";
// ── one cell at one rung ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** distant-mention pInitX: mentions of the form more than 25 units from the evaluated one (the evaluated one excluded), >= 2 required, else null */
function distFeat(o) {
  const P = o.P, oc = P.occ.get(o.w), n = oc.length / 2; let init = 0, inv = 0, m = 0;
  for (let j = 0; j < n; j++) { if (j === P.kArr[o.s][o.i]) continue; const a = oc[2 * j], b = oc[2 * j + 1]; if (Math.abs(a - o.s) <= 25) continue; const len = P.stream[a].length; if (b === 0) init++; inv += 1 / len; m++; }
  return m >= 2 ? (init - inv) / m : null;
}
function runRung(b, def, mode, rung, tag, { maxPairs = 600, filt = null, dist = false } = {}) {
  const occs0 = occsOf(b.P, b.gold, def, mode === "LOO" ? "FULL" : mode, null, b.name), occs = filt ? occs0.filter(filt) : occs0;
  const { pairs, dropped } = buildPairs(b.P, occs, SPECS[rung], rngFor(seedFor(PRE, "A", tag, rung, mode, dist ? "d" : "")), { maxPairs });
  let use = pairs, featFn = null;
  if (dist) { use = pairs.filter(([p, q]) => distFeat(p) !== null && distFeat(q) !== null); featFn = distFeat; }
  return { dropped, kept: dist ? use.length : undefined, ...evalPairs(b.P, use, mode, tag + rung + (dist ? "d" : ""), { B, Bperm: 0, name: b.name, featFn }) };
}
const refilter = (b, keepUnit, name2) => { const st = [], gd = []; b.P.stream.forEach((u, s) => { if (keepUnit(s)) { st.push(u); gd.push(b.gold[s]); } }); return { name: b.name + name2, P: prep(st), gold: gd }; };
// ── UD ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ud() {
  for (const tb of Object.keys(MAN.ud.files)) {
    const b = udWindow(tb), def = UD_DEFS.PN, base = { tier: "FRESH", reg: tb };
    for (const mode of ["FULL", "CAUSAL4"]) for (const r of RUNGS) emit({ ...base, variant: "base", rung: r, mode, ...runRung(b, def, mode, r, tb) });
    for (const r of ["K0", "K2", "K3"]) emit({ ...base, variant: "base", rung: r, mode: "LOO", ...runRung(b, def, "LOO", r, tb) });
    const L = refilter(b, (s) => b.P.stream[s].length >= 6, "-long6");
    for (const r of ["K0", "K2"]) emit({ ...base, variant: "LONG6", rung: r, mode: "FULL", ...runRung(L, def, "FULL", r, tb + "L") });
    for (const r of ["K0", "K2"]) emit({ ...base, variant: "DIST25", rung: r, mode: "FULL", ...runRung(b, def, "FULL", r, tb, { dist: true }) });
    log(`ud ${tb} done`);
  }
}
// ── IRC ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function irc() {
  const sets = { "irc-en-fresh": ["FRESH", MAN.irc.freshEnAll.map((x) => x.id)], ...Object.fromEntries(Object.entries(MAN.irc.replicate.conf).map(([lg, ids]) => [`irc-${lg}-conf`, ["REPLICATE", ids]])) };
  for (const [reg, [tier, ids]] of Object.entries(sets)) {
    const b = ircLoad(reg, ircFiles(ids)), def = IRC_DEFS.NK, base = { tier, reg };
    if (reg === "irc-en-fresh") { const ob = ircBase(reg, ircFiles(ids)); emit({ ...base, variant: "loaderCheck", sameStream: sha256(JSON.stringify(ob.P.stream)) === sha256(JSON.stringify(b.P.stream)), nMsg: b.P.stream.length }); }
    for (const mode of ["FULL", "CAUSAL4"]) for (const r of RUNGS) emit({ ...base, variant: "base", rung: r, mode, ...runRung(b, def, mode, r, reg) });
    for (const r of ["K0", "K2", "K3"]) emit({ ...base, variant: "base", rung: r, mode: "LOO", ...runRung(b, def, "LOO", r, reg) });
    log(`${reg} base done`);
    if (reg !== "irc-en-fresh") continue;
    const botSp = [...new Set(b.spk.filter((n) => /bot/i.test(n)))]; emit({ ...base, variant: "botInfo", botSpeakers: botSp.slice(0, 20), nBotMsgs: b.spk.filter((n) => /bot/i.test(n)).length });
    const NB = (() => { const st = [], gd = []; b.P.stream.forEach((u, s) => { if (!/bot/i.test(b.spk[s])) { st.push(u); gd.push(b.gold[s]); } }); return { name: reg + "-nobot", P: prep(st), gold: gd }; })();
    for (const r of ["K0", "K2", "K3"]) emit({ ...base, variant: "NOBOT", rung: r, mode: "FULL", ...runRung(NB, def, "FULL", r, reg + "N") });
    const L = refilter(b, (s) => b.P.stream[s].length >= 6, "-long6");
    for (const r of ["K0", "K2"]) emit({ ...base, variant: "LONG6", rung: r, mode: "FULL", ...runRung(L, def, "FULL", r, reg + "L") });
    for (const r of ["K0", "K2"]) emit({ ...base, variant: "DIST25", rung: r, mode: "FULL", ...runRung(b, def, "FULL", r, reg, { dist: true }) });
    emit({ ...base, variant: "EVALINIT", rung: "K2", mode: "FULL", ...runRung(b, def, "FULL", "K2", reg + "I", { filt: (o) => o.i === 0 }) });
    emit({ ...base, variant: "EVALNON", rung: "K2", mode: "FULL", ...runRung(b, def, "FULL", "K2", reg + "O", { filt: (o) => o.i >= 1 }) });
    emit({ ...base, variant: "EVALNON", rung: "K0", mode: "FULL", ...runRung(b, def, "FULL", "K0", reg + "O", { filt: (o) => o.i >= 1 }) });
    log(`${reg} variants done`);
  }
}
// ── CODE (16 lexed files per language; pairs built per file with the confirmer's per-file cap, pooled) ──────────────────────────────────────
function code() {
  for (const lg of ["py", "js"]) {
    const bases = Array.from({ length: 16 }, (_, i) => codeBase(`code-${lg}-${i}`, path.join(CONF, "data", "lex", `${lg}-${i}.json`))), per = Math.ceil(1000 / bases.length);
    const run = (mode, rung, filt, tag) => { const pairs = []; let dropped = 0; for (const b of bases) { const oc = occsOf(b.P, b.gold, CODE_DEFS.PE, mode === "LOO" ? "FULL" : mode, null, b.name), occs = filt ? oc.filter(filt) : oc, r = buildPairs(b.P, occs, SPECS[rung], rngFor(seedFor(PRE, "A", "code", lg, b.name, rung, mode, tag)), { maxPairs: per }); pairs.push(...r.pairs); dropped += r.dropped; } return { dropped, ...evalPairs(null, pairs, mode, `code${lg}${rung}${tag}`, { B, Bperm: 0, name: `code-${lg}` }) }; };
    for (const mode of ["FULL", "CAUSAL4"]) for (const r of RUNGS) emit({ tier: "FRESH", reg: `code-${lg}`, variant: "base", rung: r, mode, ...run(mode, r, null, "") });
    emit({ tier: "FRESH", reg: `code-${lg}`, variant: "base", rung: "K2", mode: "LOO", ...run("LOO", "K2", null, "") });
    emit({ tier: "FRESH", reg: `code-${lg}`, variant: "EVALNON", rung: "K2", mode: "FULL", ...run("FULL", "K2", (o) => o.i >= 1, "O") });
    emit({ tier: "FRESH", reg: `code-${lg}`, variant: "EVALINIT", rung: "K2", mode: "FULL", ...run("FULL", "K2", (o) => o.i === 0, "I") });
    log(`code-${lg} done`);
  }
}
// ── BOOKS: default segmenter (confirmer) vs title-abbreviation prior ──────────────────────────────────────────────────────────────────────
const TITLES = ["Mr", "Mrs", "Ms", "Dr", "St", "Mme", "Mlle", "Messrs", "Col", "Capt", "Prof", "Rev", "Gen", "Lt", "Sr", "Jr", "Hon", "Esq"];
function bookBase2(nm, file, abbreviations) { // copy of the confirmer's bookBase with the abbreviation prior as a parameter
  let text = fs.readFileSync(file, "utf8").replace(/^﻿/, ""); const a = text.indexOf("*** START OF"), b = text.indexOf("*** END OF");
  if (a >= 0) text = text.slice(text.indexOf("\n", a) + 1, b > a ? b : undefined);
  text = text.split("\n").filter((l) => !/^\s*((CHAPTER|Chapter|BOOK|Book|PART|Part|VOLUME|Volume) [\p{L}\d.:IVXLC ]*|[IVXLC]+\.?)\s*$/u.test(l)).join("\n");
  const stream = [], orig = [];
  for (const s of splitSentences(text, abbreviations ? { abbreviations } : {})) { const t = [], o = []; for (const m of s.text.matchAll(WORDB)) { const w = m[0].replace(/^['’]+|['’]+$/g, ""); if (!w || /^\p{N}+$/u.test(w)) continue; t.push(w.normalize("NFC").toLowerCase()); o.push(w); } if (t.length >= 3) { stream.push(t); orig.push(o); } }
  const { cls } = labelBook({ stream, orig });
  return { name: nm, P: prep(stream), gold: stream.map((u) => u.map((w) => cls.get(w) ?? null)), nUnits: stream.length };
}
const WORDB = /[\p{L}\p{M}\p{N}'’]+/gu;
function book() {
  const bks = [...MAN.books.map((x) => ["FRESH", x.name, x.file]), ...[["book-tom-sawyer", "pg1661_The_Adventures_of_Tom_Sawyer.txt"], ["book-middlemarch", "pg145_Middlemarch-George-Eliot.txt"], ["book-frankenstein", "pg84_Frankenstein.txt"]].map(([n, f]) => ["REPLICATE", n, G + f])];
  for (const [tier, nm, file] of bks) for (const [seg, ab] of [["default", null], ["titlePrior", TITLES]]) {
    const b = bookBase2(nm, file, ab);
    const init = (() => { let t = 0, m = 0; b.P.stream.forEach((u, s) => u.forEach((w, i) => { if (b.gold[s][i] === "CHAR" || b.gold[s][i] === "NAME") { m++; if (i === 0) t++; } })); return round(t / m); })();
    for (const mode of ["FULL", "CAUSAL4"]) for (const r of ["K0", "K2"]) emit({ tier, reg: nm, variant: `seg-${seg}`, rung: r, mode, nUnits: b.nUnits, nameInitShare: init, ...runRung(b, BOOK_DEFS.NAMES, mode, r, nm + seg) });
    log(`${nm} ${seg} done`);
  }
}
if (name === "ud") ud(); else if (name === "irc") irc(); else if (name === "code") code(); else if (name === "book") book(); else if (name === "summary") summary(); else throw new Error("usage: attack-A.mjs ud|irc|code|book|summary");
// ── SUMMARY (mechanical implementation of the verdict rules of the header) ────────────────────────────────────────────────────────────────
function summary() {
  const rd = (n) => (fs.existsSync(path.join(HERE, "results", `A-${n}.jsonl`)) ? fs.readFileSync(path.join(HERE, "results", `A-${n}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const U = rd("ud"), I = rd("irc"), C = rd("code"), K = rd("book"), T = [], out = { hdr: HDR }, say = (s) => T.push(s), f3 = (x) => (x === null || x === undefined ? "  -  " : Number(x).toFixed(3));
  const verdictIrc = (c) => (!c || !(c.pairs >= 60) ? "UNDERPOWERED" : !validCell(c) ? "VOID" : c.auc >= 0.8 && c.lo > 0.5 ? "HOLD" : c.auc >= 0.65 ? "DEGRADED" : "BROKEN");
  // UD
  out.ud = {}; const udKey = (v, r, m) => `${v}|${r}|${m}`;
  for (const k of [...new Set(U.filter((x) => x.rung).map((x) => udKey(x.variant, x.rung, x.mode)))]) {
    const cells = U.filter((x) => udKey(x.variant, x.rung, x.mode) === k && x.tier === "FRESH"), val = cells.filter(validCell), aucs = val.map((x) => x.auc), pos = val.filter((x) => sign(x) === "POS").length, neg = val.filter((x) => sign(x) === "NEG").length;
    const k0 = U.filter((x) => udKey(x.variant === "base" ? "base" : x.variant, "K0", x.mode) === udKey(k.split("|")[0], "K0", k.split("|")[2])); const k0v = new Map(k0.filter(validCell).map((x) => [x.reg, x.auc]));
    const common = val.filter((x) => k0v.has(x.reg)), med = lowMed(aucs), share = val.length ? pos / val.length : 0;
    const v = val.length < 12 ? "UNDERPOWERED" : med >= 0.55 && share >= 0.4 ? "HOLD" : med >= 0.53 || share >= 0.25 ? "DEGRADED" : "BROKEN";
    out.ud[k] = { nCells: cells.length, nValid: val.length, medLower: med, medTrue: trueMed(aucs), POS: pos, NEG: neg, posShare: round(share), verdict: v, nCommonWithK0: common.length, medCommon: lowMed(common.map((x) => x.auc)), medK0Common: lowMed(common.map((x) => k0v.get(x.reg))), meanPairs: round(mean(val.map((x) => x.pairs)), 0) };
  }
  say("UD (FRESH train windows; median over valid cells; verdict per header)"); for (const [k, o] of Object.entries(out.ud)) say(`  ${k.padEnd(22)} valid ${String(o.nValid).padStart(2)}/${o.nCells}  medLower ${f3(o.medLower)}  POS ${o.POS} NEG ${o.NEG} (share ${f3(o.posShare)})  ${o.verdict.padEnd(12)}  common-with-K0 n=${o.nCommonWithK0}: ${f3(o.medCommon)} vs K0 ${f3(o.medK0Common)}  meanPairs ${o.meanPairs}`);
  // IRC
  out.irc = []; say("\nIRC"); for (const x of I.filter((z) => z.rung)) { const v = verdictIrc(x); out.irc.push({ reg: x.reg, tier: x.tier, variant: x.variant, rung: x.rung, mode: x.mode, pairs: x.pairs, auc: x.auc, lo: x.lo, hi: x.hi, posCtl: x.posCtl, verdict: v }); say(`  ${x.reg.padEnd(14)} ${x.tier.padEnd(9)} ${x.variant.padEnd(9)} ${x.rung} ${x.mode.padEnd(8)} pairs ${String(x.pairs).padStart(4)} AUC ${f3(x.auc)} [${f3(x.lo)},${f3(x.hi)}] posCtl ${f3(x.posCtl)} lenCtl ${f3(x.lenCtl)} slenCtl ${f3(x.slenCtl)} ${v}`); }
  for (const x of I.filter((z) => !z.rung)) say(`  info ${JSON.stringify(x).slice(0, 300)}`);
  // CODE
  out.code = []; say("\nCODE"); for (const x of C) { const v = x.pairs >= 60 && x.auc >= 0.55 && x.lo > 0.5 ? "HOLD" : x.pairs < 60 ? "UNDERPOWERED" : "FAIL"; out.code.push({ reg: x.reg, variant: x.variant, rung: x.rung, mode: x.mode, pairs: x.pairs, auc: x.auc, lo: x.lo, hi: x.hi, verdict: v }); say(`  ${x.reg} ${x.variant.padEnd(8)} ${x.rung} ${x.mode.padEnd(8)} pairs ${String(x.pairs).padStart(4)} AUC ${f3(x.auc)} [${f3(x.lo)},${f3(x.hi)}] ${v}`); }
  // BOOKS
  say("\nBOOKS (segmenter: default vs title prior)"); const bk = {}; for (const x of K) { const key = `${x.reg}|${x.rung}|${x.mode}`; (bk[key] ??= {})[x.variant] = x; }
  const diffs = []; out.book = [];
  for (const [key, o] of Object.entries(bk)) { const d = o["seg-default"], t = o["seg-titlePrior"]; if (!d || !t) continue; const dd = round(d.auc - t.auc); out.book.push({ key, tier: d.tier, default: d.auc, defaultLo: d.lo, titlePrior: t.auc, titleLo: t.lo, delta: dd, nameInitDefault: d.nameInitShare, nameInitTitle: t.nameInitShare, pairsD: d.pairs, pairsT: t.pairs }); if (key.endsWith("K0|FULL")) diffs.push(dd); say(`  ${key.padEnd(34)} default ${f3(d.auc)} [${f3(d.lo)},${f3(d.hi)}] (${d.pairs}) | title-prior ${f3(t.auc)} [${f3(t.lo)},${f3(t.hi)}] (${t.pairs}) | delta ${f3(dd)} | name-initial share ${f3(d.nameInitShare)} -> ${f3(t.nameInitShare)}`); }
  out.bookMedianDelta = lowMed(diffs); out.bookMaterialLeak = out.bookMedianDelta !== null && out.bookMedianDelta > 0.03; say(`  median (default - titlePrior) over ${diffs.length} novels at K0 FULL = ${f3(out.bookMedianDelta)}  MATERIAL LEAK: ${out.bookMaterialLeak}`);
  fs.writeFileSync(path.join(HERE, "results", "A-summary.json"), JSON.stringify(out, null, 1)); fs.writeFileSync(path.join(HERE, "results", "A-summary.txt"), T.join("\n") + "\n"); console.log(T.join("\n"));
}
