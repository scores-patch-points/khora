// confirm-PM-R1-unit-initial-excess/confirm.mjs -- FRESH-DATA CONFIRMATION of provisional rule PM-R1 (unit-initial excess pInitX) with an INDEPENDENT implementation (lib.mjs). New file.
//
//   node confirm.mjs ud|irc|book|code|repl-ud|repl-irc|repl-book|repl-code   ->  results/<name>.jsonl      (verdict.mjs turns the rows into results/verdict.json)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file and before any pInitX was computed on any of the fresh data below) ═══════════════════════════
// RULE UNDER TEST (PM-R1, found by the polarity-map scoper on discovery data; a HYPOTHESIS). If a form recurs in a stream (>=3 mentions; or causally at its 5th+ mention using only the 4 mentions
//   before) in chat, English novels, treebank prose of most languages, or source code, a high unit-initial excess pInitX = (#mentions at unit index 0 - sum over mentions of 1/len(unit)) / #mentions
//   implies it is a name / nickname / user identifier rather than a frequency-, position-, length-matched open-class form (matched-pair AUC > 0.5). Observables: token positions and unit lengths of
//   the stream only (no capitals, POS, lists, labels or speaker field). FIXED SCORE, direction fixed (higher = name), no classifier, no fitted weight. Gold (UD UPOS PROPN, IRC nickname metadata,
//   capital-share book labels, parser classes) selects and evaluates matched pairs only.
// DISCLOSURE (what I have seen). (1) The rule JSON, the scoper's files (confirm.mjs/verdict.mjs headers, results/verdict.json: its numbers on ITS confirmation data: IRC en 0.864 de 0.926 es 0.928 it 0.953,
//   UD PN median 0.587 over 35 valid, 18 POS / 2 NEG, causal 0.570, Delta 0.100; novels Tom Sawyer 0.633 Middlemarch 0.691 Frankenstein 0.597; code js 0.553 py 0.645, Delta 0.038 for code). (2) A smoke test of lib.mjs
//   on DISCOVERY dev data only (ud-eval dev eng/deu/spa, PN FULL): 0.604 / 0.654 / 0.594 (the scoper's own pipeline: 0.617 / 0.654 / 0.600, so the independent implementation reproduces it up to pair draws);
//   sham 0.47-0.49, within-unit shuffle 0.54 / 0.49 / 0.51. (3) File names, sizes, message counts and language headers used to build data/manifest.json (sha256 below). I have NOT computed pInitX or any
//   other feature on: the 59 UD train windows, the 50 fresh en IRC days, the 4 novels, the 32 fresh code files.
// DATA. data/manifest.json (sha256 0d45c42c643ef58ce4b5764add3a928d53ea54ee93b11104800b21124c247c4d; confirm.mjs refuses to run on any other manifest), built result-blind by select-data.mjs.
//   FRESH tier (gates the verdict): F1 UD: the TRAIN split (/Users/mlacy/Documents/data/ud, 59 treebanks, one cell each; a seeded contiguous window of >= 40000 non-PUNCT word units; no khora eval ever read
//     this directory) -- also covers languages the scoper never had (la/grc/got/cu-PROIEL, is, fo, sa-Vedic, lzh, ug, wo, ...). F2 IRC en: the 50 en days of the 7 ubuntu-irc channels that were neither read for
//     pInitX by the scoper (its 48 disc+conf days) nor by the earlier name tests (name-rule-informal, name-company(+pairblocks), name-floor1, USED14); 38 of these 50 were read by a sibling lens (chat-scope /
//     ablation-scope) for COMPANY and first-mention features, 12 tiny days by nobody; pooled into one stream (unit = message) = PRIMARY set, per-channel pools (kubuntu 13, ubuntu 2, ubuntu-server 17,
//     xubuntu 18 days) = secondary. de/es/it: every one of the 32 non-en days was read by the scoper (disc or conf) -> NO fresh de/es/it day exists (UNTESTABLE on fresh data, said now). F3 books: Dracula (pg345),
//     The Picture of Dorian Gray (pg174), Moby Dick (pg2701), Sherlock Holmes (pg768), none read by the scoper for pInitX. F4 code: 16 js + 16 py files drawn by ant-code's hash rule with a new salt, excluding
//     ant-code's 24 and the scoper's 24 files.
//   REPLICATE tier (NOT fresh, reported, never gates): the scoper's consumed confirmation data re-read with this independent pipeline and new pair draws: UD test.conllu (52 stems, cmn-hans dropped), the scoper's
//     reserved IRC days per language (en 8, de 5, es 5, it 5), Tom Sawyer / Middlemarch / Frankenstein, its 12 js + 12 py files.
// CELLS. Matched pairs by name-company.mjs pairsOf(doc, "LATER") with NAME_COMPANY_PAIRBLOCK=1: positive and negative matched EXACTLY on log2 form-frequency bin, unit-index bucket {0,1,2-3,4+} of the evaluated
//   occurrence, character-length bucket and unit-length bucket (the last relaxed only if no match); <= 3 pairs per form (positive and negative side); <= 600 pairs per cell (code 1000). Eligibility: FULL = form has
//   >= 3 mentions, evaluated occurrence is a later one (k >= 1), feature over ALL mentions; CAUSAL4 = k >= 4, feature over the 4 mentions before (prefix only). Classes: UD PN = PROPN vs NOUN (primary), PO = PROPN vs
//   NOUN/VERB/ADJ (secondary); IRC NK = nickname forms vs ordinary tokens >= 3 chars (the lib.mjs rule, = name-rule-informal's); books NAMES vs COMMON (labelBook); code PE = user identifier vs external, len >= 3.
//   Statistic = matched-pair AUC (win rate, ties 1/2) with a 95% cluster bootstrap CI (clusters = positive form, B = 400) and a one-sided cluster sign-flip permutation p (B = 1000). VALID cell = pairs >= 60 and
//   position control (AUC of the unit-index bucket within pairs) in [0.45, 0.55]; STRICT-valid additionally log-frequency, character-length and unit-length controls in [0.45, 0.55] (sensitivity only).
//   "POS" cell = CI lower > 0.5 and AUC >= 0.53; "NEG" cell = CI upper < 0.5 and AUC <= 0.47.
// CONTROLS BUILT TO FAIL. SHUF = the same pipeline on within-unit shuffled streams (unit lengths kept, gold moves with the token): AUC must fall to ~0.5; control valid if the median |AUC - 0.5| over cells of the
//   family is <= 0.03; Delta = AUC(real) - AUC(shuf). SHAM = pseudo-positives drawn from the NEGATIVE class by form-hash parity (true positives dropped): must read 0.5 (median |AUC - 0.5| <= 0.03 else the family
//   comparison is VOID). POSITION control as above. pFinalX (unit-FINAL excess; the rule says it is NOT a name signal in UD) is a feature-specificity control reported next to pInitX. pInit (raw, length-
//   contaminated) and invLen (the pure unit-length part) are reported to show the excess version is not carried by unit length. LOO = FULL without the evaluated mention itself (robustness).
// PASS CRITERIA (verdict.mjs implements these verbatim; those marked [T] are TIGHTENINGS of the rule's passIf, none loosens it).
//   C-IRC  fresh en pooled set: FULL AUC >= 0.80, CI lower > 0.5, permutation p < 0.01 [T], CAUSAL4 AUC >= 0.75, Delta >= 0.05, sham valid. (de/es/it: UNTESTABLE fresh; replicate tier only.)
//   C-UD   over VALID fresh train cells (PN, FULL): median AUC >= 0.55; over valid CAUSAL4 cells median >= 0.55; NEG cells <= 10% of valid cells; share of valid cells with AUC > 0.5 >= 0.70 [T]; POS cells >= 40%
//          of valid cells [T]; median Delta >= 0.05; shuffle and sham control validity as above.
//   C-BOOK >= 3 of the 4 novels [T: the rule's 2 of 3 = 67%; 3 of 4 = 75%] with FULL AUC >= 0.55 and CI lower > 0.5; median Delta >= 0.05; sham valid.
//   C-CODE python: FULL AUC >= 0.55 with CI lower > 0.5 and Delta >= 0.05; javascript: the same, literally as the passIf demands although the rule lists JS as out of scope (weak in discovery).
//   OVERALL. CONFIRMED only if every family above passes on FRESH data in every language/register the rule names, de/es/it included. PARTIAL = at least one family passes: the confirmed scope is exactly the
//   passing families (with the per-cell numbers), the falsified parts the failing ones, untested = what had no fresh data. NOT_CONFIRMED = no family passes (or a control voids the headline family).
//   Because de/es/it have no fresh data, CONFIRMED is unreachable by construction; PARTIAL is the best this test can return. Pre-stated.
// BLIND PREDICTIONS (probability my prior gives). C-IRC: fresh en FULL >= 0.80: 0.90 (point 0.86); CAUSAL4 >= 0.75: 0.85; Delta >= 0.05: 0.97. C-UD: median FULL >= 0.55: 0.85 (point 0.58); median CAUSAL4 >= 0.55: 0.65
//   (point 0.57); NEG <= 10%: 0.75; share>0.5 >= 0.70: 0.85; POS >= 40%: 0.65; Delta >= 0.05: 0.85; the whole of C-UD: 0.35. C-BOOK: each novel 0.55-0.70; >= 3 of 4 pass with CI lower > 0.5: 0.45 (the CI is the
//   binding part: ~200-400 pairs per novel). C-CODE python passes: 0.65 (point 0.64); javascript passes: 0.25 (point 0.55, Delta ~0.04). Sham and shuffle controls valid: 0.85. pFinalX stays within 0.5 +- 0.04
//   (median over UD cells): 0.70. I expect PARTIAL with chat (en), UD and probably py inside the scope and JS outside.
// NOT TESTED / OUT OF SCOPE. First mentions (a recurrence statistic needs recurrence); fresh de/es/it chat; languages whose cell has < 60 pairs (reported as thin, excluded from medians); non-English novels; any fitted
//   classifier; company/ablation observables (this is a POSITION/RECURRENCE rule); a causal CAUSAL4 test below 5 mentions.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRE, rngFor, seedFor, sha256, headerSha, round, shuffledOf, shamOf, runCell, udBase, ircBase, bookBase, codeBase, UD_DEFS, IRC_DEFS, BOOK_DEFS, CODE_DEFS } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), name = process.argv[2];
const MANIFEST_SHA = "0d45c42c643ef58ce4b5764add3a928d53ea54ee93b11104800b21124c247c4d";
const manText = fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8");
if (sha256(manText) !== MANIFEST_SHA) throw new Error("manifest sha mismatch: refusing to run");
const man = JSON.parse(manText), HDR = headerSha(fileURLToPath(import.meta.url)), PM = path.join(HERE, "..", "polarity-map");
const OUT = path.join(HERE, "results", `${name}.jsonl`);
const IRC = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc/", G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/";
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, tier: name.startsWith("repl") ? "REPLICATE" : "FRESH", ...o }) + "\n");
const t0 = Date.now(), log = (m) => console.error(`${((Date.now() - t0) / 1000).toFixed(0)}s ${m}`);

/** all cells of one register: real FULL / CAUSAL4 / LOO, shuffled FULL, sham FULL (primary class) and optional extra classes (FULL only) */
function doRegister(reg, fam, bases, defs, { maxPairs = 600, extra = {} } = {}) {
  const o = { maxPairs }, cache = new Map(), shufGet = (b) => { let x = cache.get(b.name); if (!x) cache.set(b.name, (x = shuffledOf(b, seedFor(PRE, "shuf", b.name)))); return x; };
  const [d0] = Object.keys(defs);
  for (const [d, def] of Object.entries(defs)) {
    for (const mode of ["FULL", "CAUSAL4", "LOO"]) emit({ reg, fam, def: d, mode, ctl: "real", ...runCell(bases, def, mode, `real:${d}`, o) });
    emit({ reg, fam, def: d, mode: "FULL", ctl: "shuf", ...runCell(bases, def, "FULL", `shuf:${d}`, { ...o, Bperm: 0, get: shufGet }) });
  }
  emit({ reg, fam, def: d0, mode: "FULL", ctl: "sham", ...runCell(bases, shamOf(defs[d0], "sham1"), "FULL", `sham:${d0}`, { ...o, Bperm: 0 }) });
  for (const [d, def] of Object.entries(extra)) emit({ reg, fam, def: d, mode: "FULL", ctl: "real", ...runCell(bases, def, "FULL", `real:${d}`, { ...o, Bperm: 0 }) });
  emit({ reg, fam, info: { files: bases.map((b) => b.name), nTok: bases.reduce((a, b) => a + b.nTok, 0) || null } });
  log(`${reg} done`);
}
const ircFiles = (ids) => ids.map((id) => path.join(IRC, id));
async function main() {
  if (name === "ud") {
    for (const [tb, file] of Object.entries(man.ud.files)) {
      const b = udBase(`ud-${tb}-train`, file, { budget: man.ud.windowTokens, rnd: rngFor(seedFor(PRE, tb, "window")) });
      emit({ reg: `ud-${tb}`, fam: "ud", info: { window: b.window, nSent: b.nSent, nTok: b.nTok } });
      doRegister(`ud-${tb}`, "ud", [b], { PN: UD_DEFS.PN }, { extra: { PO: UD_DEFS.PO } });
    }
  } else if (name === "repl-ud") {
    for (const stem of man.udReplicate.stems) { const b = udBase(`ud-${stem}-test`, path.join(man.udReplicate.root, stem, "test.conllu"), null); doRegister(`ud-${stem}`, "ud", [b], { PN: UD_DEFS.PN }, { extra: { PO: UD_DEFS.PO } }); }
  } else if (name === "irc") {
    const all = man.irc.freshEnAll.map((x) => x.id), sets = { "irc-en-fresh": all, ...Object.fromEntries(Object.entries(man.irc.freshEnByChannel).map(([c, v]) => [`irc-en-${c}`, v])), "irc-en-neverread": man.irc.neverReadByAnyone };
    for (const [reg, ids] of Object.entries(sets)) doRegister(reg, "irc", [ircBase(reg, ircFiles(ids))], { NK: IRC_DEFS.NK });
  } else if (name === "repl-irc") {
    for (const [lg, ids] of Object.entries(man.irc.replicate.conf)) doRegister(`irc-${lg}`, "irc", [ircBase(`irc-${lg}-conf`, ircFiles(ids))], { NK: IRC_DEFS.NK });
  } else if (name === "book") {
    for (const bk of man.books) doRegister(bk.name, "book", [bookBase(bk.name, bk.file)], { NAMES: BOOK_DEFS.NAMES });
  } else if (name === "repl-book") {
    for (const [nm, f] of [["book-tom-sawyer", "pg1661_The_Adventures_of_Tom_Sawyer.txt"], ["book-middlemarch", "pg145_Middlemarch-George-Eliot.txt"], ["book-frankenstein", "pg84_Frankenstein.txt"]]) doRegister(nm, "book", [bookBase(nm, G + f)], { NAMES: BOOK_DEFS.NAMES });
  } else if (name === "code") {
    for (const lg of ["js", "py"]) doRegister(`code-${lg}`, "code", man.code[lg].map((_, i) => codeBase(`code-${lg}-${i}`, path.join(HERE, "data", "lex", `${lg}-${i}.json`))), { PE: CODE_DEFS.PE }, { maxPairs: 1000 });
  } else if (name === "repl-code") {
    for (const lg of ["js", "py"]) doRegister(`code-${lg}`, "code", Array.from({ length: 12 }, (_, i) => codeBase(`code-${lg}-${i}`, path.join(PM, "results", "lex-confirm", `${lg}-${i}.json`))), { PE: CODE_DEFS.PE }, { maxPairs: 1000 });
  } else throw new Error("usage: confirm.mjs ud|irc|book|code|repl-ud|repl-irc|repl-book|repl-code");
}
await main();
