// eval/beings-ladder.mjs — the recursive measurement of three changes to the beings tier.
//
//   node eval/beings-ladder.mjs run    --stage <label> [--stems a,b,c] [--source dev|tail] [--priors-dir DIR] [--tail 0.2]
//   node eval/beings-ladder.mjs report --stage <label> [--vs <label>]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5: written before the first run of this file) ═══
//
// THE THREE CHANGES (each is an option on the reader, off by default until its measurement is in):
//   S  standing: "salience"   the 5% keyness test stops being a MEMBERSHIP test and becomes a field of each being
//                             (listening-cast.js). Existence = nominated at the structural floor and not refused.
//   R  refusal: "loss-bounded" an UNSEEN word is refused only when its frame distribution's NAMING mass is under
//                             KEY_ALPHA (listening-cast.js); a seen word keeps the type-level rule.
//   A  affix layer            a derived ContractionPrior@1 (scripts/build-contraction-prior.mjs) read by the ear:
//                             whole-surface splits (del -> de el, don't -> do n't), apostrophe-bound affixes (l' d' 's n't),
//                             host-guarded bound suffixes. Absent a prior file for a language, the ear is unchanged.
//
// THE DESIGN. A full 2x2x2 factorial over (S,R,A): config "SRA" with each bit 0/1, so each change has a MAIN EFFECT
// measured in four contexts, and the cumulative ladder is 000 -> 100 -> 110 -> 111. After each change is built the whole
// ladder is re-run under a new --stage label and `report --vs <previous stage>` prints what the new change did to
// everything already measured, so a regression elsewhere cannot hide behind the gain it bought (the recursion).
//
// THE DATA. 25 stems of the competence card, held-out DEV gold, case-stripped, the DECLARED listener, blocks planned and
// gold built by eval/competence/r3-beings.mjs (planBlocks, goldSets: recurring PROPN / PROPN|NOUN forms), exact string
// match. DISCLOSURE: the TEST split was read once per stem for the competence card and is SPENT; DEV was read by the
// instrument authors and by me (diagnostics motivated these three changes), so DEV is DEVELOPMENT evidence, not a blind
// test. The CONFIRMATION is `--source tail`: the last 20% of each TRAIN treebank, with every prior (pos, frame, proclitic,
// enclitic, contraction) REBUILT on the first 80% only, so neither the priors nor any diagnostic has seen those sentences.
// It is run once per final configuration, after the DEV decisions are made, and its numbers are reported even if they
// disagree with DEV.
//
// INSTRUMENTS (all computed here, none tuned):
//   M1  R3-style block scores, macro over blocks with gold: PROPN F1/P/R, PROPN|NOUN F1, and PROPN F1 on the SEEN and UNSEEN
//       strata (seen = own key of the stem's posPrior). The reader arm is the production configuration of r3-beings.mjs
//       (commonNouns = !cased script).
//   M2  refusal quality on UNSEEN word occurrences (R2's token grid, r2-class.mjs prepare): LOST = share of true naming
//       occurrences the rule would refuse (B3, ceiling KEY_ALPHA); CAUGHT = share of non-naming occurrences it refuses.
//   M3  affix recall: over the surface words of the held-out text (a UD multi-word token, or glued apostrophe tokens, is one
//       surface word with known components), SPLIT-RECALL = share whose ear.peel output is exactly the components joined by
//       a space; FALSE-SPLIT = share of one-component words the ear changes. Space-delimited scripts only.
//   M4  salience AUC: among the beings a salience-mode cast names, does `salience` rank gold PROPN above the rest, and does it
//       beat plain mentions? (paired per block.)
//
// CONTROLS (built to fail):
//   C1 licence      the keyed arm scored against the NEXT block's gold (misaligned): must score far below the real arm.
//   C2 equivalence  config 000 must equal the production declared-listener cast, set for set, on block 0 (instrument check).
//   C3 prefix       beings after 60% of block 0 equal a fresh cast fed that 60% (S3), for every config.
//   C4 deranged     the contraction prior with its component lists dealt among its own surfaces: M3 split-recall must fall to ~0
//                   and PROPN F1 must not rise (an affix gain that survives a deranged prior is not the prior's).
//   C5 null stems   for stems with no contraction file, A=1 must be identical to A=0 bit for bit.
//
// PREDICTIONS (blind; the ORDERS are the claims, magnitudes are guesses):
//   PS1 S=1 beats S=0 on PROPN macro F1 in >= 18 of 25 stems (the card: the gate-off lexicon filter beat the gate in 20 of 25);
//       not in English, where the two were within 0.005 (|dF1| < 0.02).
//   PS2 salience is weak as a RANK within the existent beings: mean AUC of `salience` for gold PROPN lies in [0.50, 0.70], and
//       salience beats plain mentions in fewer than half of the stems (the gate's information was frequency in disguise).
//   PS3 S=1 raises recall and lowers precision in every stem with a baseline (it admits a superset).
//   PR1 R=1 brings LOST under 0.05 in >= 22 of 25 stems (plurality: 9 of 25 on the TEST card); CAUGHT falls by >= 0.15 absolute
//       in the median stem (the rule that refuses on a bare plurality catches far more than the rule that waits for 5%).
//   PR2 R=1 does NOT raise PROPN macro F1: mean change in [-0.03, +0.01]; the across-stem sign test does not reject at 5%
//       in favour of R=1. The case for R is the bound on loss (B3), not F1.
//   PR3 on the UNSEEN stratum R=1 raises recall in >= 15 stems and lowers precision in >= 20.
//   PA1 A=1 raises split-recall in every stem that has a contraction file: English from ~0 to >= 0.90 of its split surfaces,
//       French >= 0.95; FALSE-SPLIT <= 0.01 in every such stem.
//   PA2 A=1 raises PROPN macro F1 in >= 6 of the 8 stems with the largest MWT/glue share (eng fra ita spa por deu ind pol) and
//       lowers it by more than 0.01 in none.
//   PA3 C5 holds exactly: stems with no contraction file are unchanged.
//   PA4 C4 holds: the deranged contraction prior leaves split-recall < 0.10 and does not raise PROPN F1.
//   PI  exploratory, no prediction: the interaction R x A (apostrophe forms are unseen words).
//   HEADLINE guess: the full ladder 000 -> 111 moves mean PROPN macro F1 by +0.02 to +0.08, almost all of it from S and A.
//
// A prediction that fails is reported as a failure.
//
// ═══ AMENDMENT 1 — written after stage s0 was read, BEFORE stage s1 is run ═══════════════════════════════════════════
// WHAT s0 SHOWED (DEV, 25 stems, S = "salience", R = KEY_ALPHA floor, A not yet built so inert):
//   PS1 FAILED  S=1 beat S=0 in 15 of 25 stems, not >= 18 (mean dF1 +0.021, across-stem sign p 0.15). It is a large win in
//               cased scripts (12 up / 3 down of 16, mean about +0.03: por +0.19, ind +0.12, spa +0.07, pol +0.06) and a small
//               loss in caseless scripts (cmn -0.019, heb -0.026, hin +0.035 the exception), where common nouns are admitted by design.
//   PS2 HELD    salience AUC within the existent beings: mean 0.524, beats plain mentions in 9 of 25 stems; below 0.5 in pol 0.18,
//               ita 0.29, rus 0.35, por 0.39, fin 0.41: as a RANK on NAMES it is anti-informative (a name the language also says
//               often scores low). So a name is not less of a being for being common; salience belongs to DESCRIPTORS.
//   PR1 HELD    R=1 (floor KEY_ALPHA) brings LOST under 0.05 in 25 of 25 stems (plurality 9 of 25) — and CAUGHT falls from a median
//               0.363 to 0.035: the bound is met by refusing almost nothing. A vacuous bound, not a loss-bounded refusal.
//   PR2 HELD    R=1 did not raise PROPN F1 (mean -0.004; 8 up, 14 down; ita -0.048, ukr -0.024, pol -0.022, swe -0.021).
//   PS3, PI     not read here.
// THE REDESIGN (what s1 measures; the A bit is still inert, so s1 is s0 with S and R redone):
//   S'  standing: "descriptors" — only a word the prior settles as a COMMON NOUN needs to earn standing (keyness.js was written
//       for the recurring descriptor, "the maid"); a name or an unseen word exists at the structural floor. In cased scripts
//       (commonNouns = false) common nouns are already excluded, so S' = S there.
//   R'  refusal: "loss-bounded" with a DERIVED floor per language (RefusalFloor@1: the naming mass below which only KEY_ALPHA of the
//       true naming occurrences the prior had not met fall, measured on held-out folds of its own treebank).
// PREDICTIONS for s1 (blind to s1; the orders are the claims):
//   PS4 S' = S exactly on every cased-script stem (same sets); on the caseless stems (cmn cmn-hans arb heb fas kor jpn hin urd) S'
//       beats the gate (S=0) on PROPN macro F1 in >= 6 of 9 and its mean dF1 there is > 0.
//   PR4 the calibrated floor keeps LOST <= 0.05 on DEV in >= 20 of 25 stems (the calibration is a different split, so some slack),
//       and its CAUGHT is above the vacuous bound's 0.035 in the median stem and below the plurality rule's 0.363.
//   PR5 R' does better than R: mean PROPN dF1 of R' over the four contexts is >= R's -0.004, with <= 10 stems down (R: 14).
//   PR6 R' is not a net gain either: mean dF1 in [-0.01, +0.01]; the case for R' is that its loss is bounded, not that F1 moves.
// The A bit stays inert in s1 (check C5 holds on every stem); A is built and measured as stage s2.
//
// ═══ AMENDMENT 2 — written after stages s1, s2 and s3 were read, BEFORE stage s4 is run ═════════════════════════════
// WHAT s1-s3 SHOWED (DEV): S' (descriptors) beat the gate in 19 of 25 stems (mean +0.037, across-stem p 0.0013) and fixed the caseless
//   scripts; R' (calibrated floor) is neutral on F1 (+0.003) and keeps LOST <= 0.05 in 13 of 25 stems (plurality 9) at a median CAUGHT 0.31
//   (plurality 0.36, vacuous floor 0.035) — PR4 FAILED on its first clause (expected >= 20 of 25: the floor is calibrated on folds of the
//   training treebank and DEV is a shifted domain, so the bound drifts: eng 0.048 spa 0.055 cmn 0.090 tur 0.091); PR5 failed on its second
//   clause (11 stems down, not <= 10, each by <= 0.016); A is a real gain (mean +0.018, 10 up 2 down 13 flat, p 0.019; ita +0.21 fra +0.07 eng
//   +0.05 ell +0.04 por +0.04 deu +0.03) with split-recall 0.83-1.00 on most stems and FALSE-SPLIT <= 0.0062 everywhere (PA2 held, PA3 held;
//   PA1 failed on English recall 0.83 < 0.90: the misses are annotated typos, its = it 's, your = you 're); PA4 FAILED: a DERANGED contraction
//   prior still raised PROPN F1 in 7 stems (ita +0.15, ell +0.04, deu +0.02, pol +0.02): the SURFACE LIST alone (del, della, nel: unseen words
//   in a POS prior built on split tokens) removes fused contractions from the ledger; only the remainder (ita +0.07, eng +0.05, fra +0.07)
//   needs the components to be right. Two instrument fixes after s2, both about what a "surface word" is, said here: a multi-word token written
//   against the next word (dell'+italia) is one surface word (the builder gained fused prefixes), and a quote mark made of apostrophes is not a
//   word to glue to (it had made nld hin swe urd look like they had splits).
// WHAT IS LEFT: S' still loses to the gate in ita (-0.04), eng (-0.006), swe (-0.004), kor (-0.002). The false positives there are SEEN words that
//   are not settled common nouns (tramonto freddo caldo politiche disciplina: nouns the prior has met once or twice, or at < 0.7 NOUN) — they pass
//   S' because only a SETTLED common noun has to earn standing.
// THE CHANGE for s4 (S''): standing "names-exempt" — a word is exempt from earning standing only if the prior itself NOMINATES it as a name:
//   the prior has never met it (a name, a new word), or its own tally says PROPN or X (a transliterated name) at >= MIN_SHARE (0.5, the one declared
//   settledness cut). Every other seen word is a descriptor or furniture and must be KEY against the received rate, as keyness.js was written for.
//   (Settled common nouns are still excluded outright where capitals exist: commonNouns=false.)
// PREDICTIONS for s4 (blind to s4):
//   PN1 S'' beats S' on PROPN macro F1 in ita, eng and swe (the stems where S' lost to the gate): its S effect there is >= -0.01.
//   PN2 S'' keeps S''s gain elsewhere: across the 25 stems its mean S effect is >= +0.038 (S''s) - 0.005, with no stem more than 0.02 worse than S'.
//   PN3 the caseless gains hold: cmn cmn-hans fas jpn hin urd within 0.02 of S'.
//   PN4 unchanged by construction (instrument check): R and A main effects within 0.01 of s3's in every stem.
//
// ═══ AMENDMENT 3 — the CONFIRMATION, written after s4 was read, BEFORE the held-out tail is read ═══════════════════════
// WHAT s4 SHOWED (DEV): all four PN predictions held. S'' (names-exempt) main effect +0.049, 22 stems up / 0 down / 3 flat; ita -0.041 -> +0.009;
//   R neutral (+0.003); A +0.019 (10 up / 2 down / 13 flat); the full ladder 000 -> 111 moves eng .495 -> .586, fra .526 -> .698, ita .544 -> .771,
//   por .460 -> .711, ind .568 -> .717, spa .679 -> .785, hin .422 -> .560.  THREE rounds of redesign were done on DEV (S, S', S''; A and its two
//   instrument fixes), so DEV numbers are optimistic by construction. The tail confirms or does not.
// THE CONFIRMATION RUN (once, no tuning after it). eval/make-fold-priors.mjs cut each TRAIN treebank at 80%: every prior the reader loads (POS, frame,
//   refusal floor, contraction, proclitic, enclitic) is rebuilt on the first 80% by the SAME builders; the last 20% is the text. Neither the priors nor
//   any diagnostic have seen it. S = names-exempt, R = calibrated floor, A = on. C2 (equivalence with the shipped declared-listener cast) is undefined
//   there (different priors) and is not computed.
// PREDICTIONS (final claims; a failure is reported as a failure):
//   F1 the full configuration 111 beats the original 000 on PROPN macro F1 in >= 18 of 25 stems; mean dF1 >= +0.04; across-stem sign test (one-sided) p <= 0.05;
//      no stem is more than 0.02 worse.
//   F2 S main effect up in >= 17 of 25 stems with mean >= +0.03; A main effect up in >= 6 of the 8 stems with the most surface splits (eng fra ita por deu ell pol
//      ind) and down by > 0.01 in none; |mean R main effect| <= 0.01.
//   F3 the refusal floor holds where its calibration domain is the test domain: LOST <= 0.05 in >= 20 of 25 stems on the tail (DEV had 13). If it fails here too,
//      the calibration is at fault, not the domain shift.
//   F4 M3 on the tail: FALSE-SPLIT <= 0.01 in every stem with a file; split-recall >= 0.80 in >= 8 of the stems that have a file.
//   F5 controls C1, C3, C5 hold on every stem.
//
// ═══ AMENDMENT 4 — the REPLICATION on a second fresh draw, written after the tail (t1) was read, BEFORE fold B is read ═══
// WHAT t1 SHOWED (fold A: the last 20% of each TRAIN treebank): F1 held (111 vs 000: 23 stems up, 0 down, 2 flat, mean +0.077, p ~ 1e-7), F2 held (S +0.064,
//   22 up / 0 down; A +0.013, 12 up / 0 down, all 8 big-split stems up; R +0.001), F4 held (false-split <= 0.0063; split-recall >= 0.80 in 11 of 13
//   stems with a file), F5 held except C1 is undefined for arb and kor (their PROPN gold is empty on the tail: real F1 = 0 = misaligned F1, typed
//   underpowered, not failed); F3 FAILED: the refusal floor kept LOST <= 0.05 in 15 of 25 stems, not 20 (medians: plurality ~0.08, floor ~0.05, so it
//   is a better trade than plurality, not the bound it is named for).
// FOLD B: eval/make-fold-priors.mjs --side head holds out the FIRST 20% of each treebank and rebuilds every prior on the other 80%. Same final
//   configuration (names-exempt, calibrated floor, affix on), no change of any rule or threshold. The point is to ask whether fold A was a lucky draw.
// PREDICTIONS: F1, F2, F4 and F5 as above hold again (same numbers, same thresholds). F3 is predicted to FAIL AGAIN: LOST <= 0.05 in no more than 17
//   of 25 stems.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createListeningCast } from "../adapters/text/listening-cast.js";
import { makeEar } from "../adapters/text/ear.js";
import { classAt } from "../adapters/text/heard-nominals.js";
import { receivedRate, KEY_ALPHA } from "../adapters/text/keyness.js";
import { casedFraction, CASED_SCRIPT_FLOOR } from "../the-fold/language-context.js";
import { PRIORS_DIR } from "../the-fold/language-grammar.js";
import { createLanguageListener } from "../the-fold/language-listener.js";
import { readConllu, parseConllu, mulberry32, derangement, auc, signTest, minDiscordantFor, TB_DIR, EVAL_DIR } from "./competence/lib.mjs";
import { planBlocks, goldSets, sentenceText, prf, aggregate, pairedTest, norm } from "./competence/r3-beings.mjs";
import { prepare, refusedBy } from "./competence/r2-class.mjs";
import { surfaceWords } from "../scripts/lib/surface-words.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, "beings-ladder-results");
const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const DENSE = new Set(["cmn", "cmn-hans", "jpn", "kor", "vie"]); // no whitespace word boundary in the treebank's own tokenisation (M3 does not apply)
const CONFIGS = ["000", "100", "010", "001", "110", "101", "011", "111"];
const TRAIN_DIRS = { kor: "kor-gsd" };

const readJson = (dir, f) => { const p = path.join(dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const WORDISH = /^[\p{L}\p{M}\p{N}'’]+$/u;

/** The received grammar of a stem from a priors directory (the declared language: nothing is heard, nothing guessed). */
export function loadGrammar(stem, { dir = PRIORS_DIR, affix = false, deranged = false, floor = false } = {}) {
  const posPrior = readJson(dir, `pos-${stem}.json`);
  if (!posPrior?.forms) return null;
  let contractions = affix ? readJson(dir, `contractions-${stem}.json`) : null;
  if (contractions && deranged) contractions = derangeContractions(contractions, fnv(`${stem}|c4`));
  const proclitics = readJson(dir, `proclitics-${stem}.json`)?.proclitics ?? null;
  const enclitics = readJson(dir, `enclitics-${stem}.json`)?.enclitics ?? null;
  return { posPrior, framePrior: readJson(dir, `frame-${stem}.json`), proclitics, enclitics, contractions, refusalFloor: floor ? readJson(dir, `refusal-${stem}.json`) : null };
}
/** C4: component lists dealt among the prior's own surfaces (no surface keeps its own); the affix lists are left alone. */
export function derangeContractions(c, seed) {
  const keys = Object.keys(c.splits ?? {});
  const perm = derangement(keys.length, mulberry32(seed));
  if (!perm) return c;
  const splits = {};
  keys.forEach((k, i) => { splits[k] = c.splits[keys[perm[i]]]; });
  const rev = (list) => (list ?? []).map((a) => ({ ...a, affix: [...a.affix].reverse().join("") }));
  return { ...c, splits, suffixes: rev(c.suffixes), prefixes: rev(c.prefixes), derangedSeed: seed };
}
const earOf = (g) => makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics, contractions: g.contractions });
const hearOf = (stem, g) => { const ear = earOf(g); const ctx = { language: stem, grammar: { posPrior: g.posPrior, framePrior: g.framePrior, refusalFloor: g.refusalFloor }, ear, declared: true }; return { hear: () => ctx, ear }; };

// ── data ───────────────────────────────────────────────────────────────────
let TAIL_DIR = null; // eval/make-fold-priors.mjs output: <dir>/<stem>/tail.conllu is the confirmation text
function sentencesFor(stem, source, tail) {
  if (source === "tail") {
    const p = path.join(TAIL_DIR ?? "", stem, "tail.conllu");
    return TAIL_DIR && fs.existsSync(p) ? readConllu(p) : null;
  }
  if (source === "dev") {
    const p = path.join(EVAL_DIR, stem, "dev.conllu");
    return fs.existsSync(p) ? readConllu(p) : null;
  }
  const p = path.join(TB_DIR, TRAIN_DIRS[stem] ?? stem, "train.conllu");
  if (!fs.existsSync(p)) return null;
  const all = parseConllu(fs.readFileSync(p, "utf8"));
  return all.slice(all.length - Math.floor(all.length * tail));
}

// ── M3: the surface words of a sentence and what the ear does to them ──────────
const straight = (w) => w.replace(/’/g, "'");
export function affixScore(sentences, ear) {
  let split = 0, splitOk = 0, plain = 0, falseSplit = 0;
  const miss = new Map();
  for (const s of sentences) for (const w of surfaceWords(s)) {
    const out = straight(ear.peel ? ear.peel(w.surface) : w.surface);
    if (w.comps.length > 1) { split++; if (out === straight(w.comps.join(" "))) splitOk++; else miss.set(w.surface, (miss.get(w.surface) ?? 0) + 1); }
    else { plain++; if (out !== straight(w.surface)) falseSplit++; }
  }
  return { split, splitOk, splitRecall: split ? splitOk / split : null, plain, falseSplit, falseSplitRate: plain ? falseSplit / plain : null, topMissed: [...miss].sort((a, b) => b[1] - a[1]).slice(0, 5) };
}

// ── M2: refusal quality on unseen occurrences ───────────────────────────────
export function refusalQuality(sentences, g) {
  const rows = prepare(sentences).rows.filter((r) => !Object.hasOwn(g.posPrior.forms, r.unit));
  const floor = g.refusalFloor?.floor ?? KEY_ALPHA;
  const acc = { n: rows.length, gold: 0, non: 0, lostPlur: 0, lostMass: 0, caughtPlur: 0, caughtMass: 0, abstain: 0 };
  for (const r of rows) {
    const { dist } = classAt(r.unit, r.prev, r.next, { posPrior: g.posPrior, framePrior: g.framePrior, minShare: 0.5 });
    if (!dist) acc.abstain++;
    const plur = refusedBy(dist), mass = dist != null && (dist.NOUN ?? 0) + (dist.PROPN ?? 0) < floor;
    if (r.gold) { acc.gold++; if (plur) acc.lostPlur++; if (mass) acc.lostMass++; } else { acc.non++; if (plur) acc.caughtPlur++; if (mass) acc.caughtMass++; }
  }
  const d = (a, b) => (b ? a / b : null);
  return { ...acc, floor, lostPlurality: d(acc.lostPlur, acc.gold), lostLossBounded: d(acc.lostMass, acc.gold), caughtPlurality: d(acc.caughtPlur, acc.non), caughtLossBounded: d(acc.caughtMass, acc.non) };
}

// ── M1: one block, one config ───────────────────────────────────────────────
const sig = (list) => JSON.stringify(list.map((b) => [b.surface, b.mentions]).sort());
const forms = (list) => new Set(list.map((x) => norm(x.surface)));
let RMODE = "naive";    // what R=1 means: "naive" (floor = KEY_ALPHA) or "calibrated" (the RefusalFloor@1 file)
let SMODE = "salience"; // what S=1 means at this stage (s0: "salience"; from AMENDMENT 1: "descriptors")
const castOpts = (bits) => ({ standing: bits[0] === "1" ? SMODE : "gate", refusal: bits[1] === "1" ? "loss-bounded" : "plurality" });
function readConfig({ texts, hear, cn, bits }) {
  const cast = createListeningCast({ hear, commonNouns: cn, ...castOpts(bits) });
  texts.forEach((t) => cast.add(t));
  return cast;
}

async function runStem(stem, { source, priorsDir, tail }) {
  const sentences = sentencesFor(stem, source, tail);
  if (!sentences?.length) return { stem, source, gap: "no_gold" };
  const floor = RMODE === "calibrated";
  const g0 = loadGrammar(stem, { dir: priorsDir, affix: false, floor });
  if (!g0) return { stem, source, gap: "no_prior" };
  const g1 = loadGrammar(stem, { dir: priorsDir, affix: true, floor });
  const hasAffixFile = Boolean(g1.contractions);
  const gD = hasAffixFile ? loadGrammar(stem, { dir: priorsDir, affix: true, deranged: true, floor }) : null;
  const posPrior = g0.posPrior;
  const isSeen = (f) => Object.hasOwn(posPrior.forms, f);
  const plan = planBlocks(sentences.length);
  const res = { stem, source, n: sentences.length, plan, hasAffixFile, smode: SMODE, rmode: RMODE, refusalFloor: g0.refusalFloor?.floor ?? null, configs: {}, checks: {} };
  if (!plan.count) return { ...res, gap: "no_block" };
  const used = sentences.slice(0, plan.used);
  const H = { 0: hearOf(stem, g0), 1: hearOf(stem, g1) };
  const HD = gD ? hearOf(stem, gD) : null;

  // M3 / M2 on the whole held-out text
  if (!DENSE.has(stem)) {
    res.m3 = { off: affixScore(used, H[0].ear), on: affixScore(used, H[1].ear), deranged: HD ? affixScore(used, HD.ear) : null };
  } else res.m3 = { gap: "script_without_word_boundaries" };
  res.m2 = refusalQuality(used, g0);
  res.baseline = typeof posPrior?.provenance?.tokens_read === "number";

  const per = Object.fromEntries(CONFIGS.map((c) => [c, { propn: [], nominal: [], unseen: [], seen: [], size: [], keyedPropn: [], keyedSize: [], mis: [] }]));
  const aucRows = [];
  const derangedPropn = [];
  const blocks = [];
  for (let b = 0; b < plan.count; b++) {
    const sl = used.slice(b * plan.size, (b + 1) * plan.size);
    const texts = sl.map((s) => sentenceText(s).text.toLowerCase());
    const gold = goldSets(sl);
    blocks.push(gold);
    const cn = !(casedFraction(texts.join("\n")) >= CASED_SCRIPT_FLOOR);
    const goldUn = new Set([...gold.propn].filter((f) => !isSeen(f))), goldSeen = new Set([...gold.propn].filter(isSeen));
    for (const c of CONFIGS) {
      const hear = H[c[2]].hear;
      const cast = readConfig({ texts, hear, cn, bits: c });
      const list = cast.beings();
      const all = forms(list);
      const keyedSet = forms(list.filter((x) => x.standing === "keyed"));
      const P = per[c];
      P.propn.push(prf(all, gold.propn)); P.nominal.push(prf(all, gold.nominal));
      P.unseen.push(prf(new Set([...all].filter((f) => !isSeen(f))), goldUn)); P.seen.push(prf(new Set([...all].filter(isSeen)), goldSeen));
      P.keyedPropn.push(prf(keyedSet, gold.propn)); P.size.push(all.size); P.keyedSize.push(keyedSet.size);
      if (c === "100" && gold.propn.size) {
        const scored = list.filter((x) => x.salience != null);
        if (scored.length && res.baseline) {
          const y = scored.map((x) => gold.propn.has(norm(x.surface)));
          aucRows.push({ salience: auc(scored.map((x) => x.salience), y), mentions: auc(scored.map((x) => x.mentions), y), n: scored.length, pos: y.filter(Boolean).length });
        }
      }
      if (b === 0) {                                              // C3: the 60% prefix answer equals the mid-read answer
        const k = Math.max(1, Math.floor(texts.length * 0.6));
        const mid = createListeningCast({ hear, commonNouns: cn, ...castOpts(c) });
        const fresh = createListeningCast({ hear, commonNouns: cn, ...castOpts(c) });
        let snap = null;
        texts.forEach((t, i) => { mid.add(t); if (i + 1 === k) snap = sig(mid.beings()); });
        texts.slice(0, k).forEach((t) => fresh.add(t));
        (res.checks.c3 ??= {})[c] = sig(fresh.beings()) === snap;
        if (c === "000" && priorsDir === PRIORS_DIR) {            // C2: the production declared-listener cast (only meaningful with the shipped priors)
          const l = createLanguageListener({ declared: stem });
          const prod = createListeningCast({ hear: (t, si) => l.listen(t, si), commonNouns: cn });
          texts.forEach((t) => prod.add(t));
          res.checks.c2_equals_production = sig(prod.beings()) === sig(list);
        }
      }
    }
    if (HD) { const castD = readConfig({ texts, hear: HD.hear, cn, bits: "000" }); derangedPropn.push(prf(forms(castD.beings()), gold.propn)); }
  }
  // C1: misaligned gold for the 000 arm, and C5: a stem with no affix file reads identically with A=1
  const B = blocks.length;
  const misaligned = per["000"].propn.map((_, i) => { const p = per["000"].propn[i]; return { size: p.size, tp: 0 }; });
  res.checks.c1_licence = (() => {
    const rows = [];
    for (let i = 0; i < B; i++) {
      const sl = used.slice(i * plan.size, (i + 1) * plan.size);
      const texts = sl.map((s) => sentenceText(s).text.toLowerCase());
      const cn = !(casedFraction(texts.join("\n")) >= CASED_SCRIPT_FLOOR);
      rows.push(prf(forms(readConfig({ texts, hear: H[0].hear, cn, bits: "000" }).beings()), blocks[(i + 1) % B].propn));
    }
    return { misalignedF1: round(aggregate(rows).macroF1), realF1: round(aggregate(per["000"].propn).macroF1) };
  })();
  if (!hasAffixFile) res.checks.c5_null_stem_identical = CONFIGS.filter((c) => c[2] === "0").every((c) => JSON.stringify(per[c].propn) === JSON.stringify(per[c.slice(0, 2) + "1"].propn));
  void misaligned;

  const agg = (rows) => { const a = aggregate(rows); return { F1: round(a.macroF1), P: round(a.macroP), R: round(a.macroR), blocks: a.blocks, size: round(a.meanSize, 1) }; };
  for (const c of CONFIGS) {
    const P = per[c];
    res.configs[c] = { propn: agg(P.propn), nominal: agg(P.nominal), unseenPropn: agg(P.unseen), seenPropn: agg(P.seen), keyedPropn: agg(P.keyedPropn), meanSize: round(mean(P.size), 1), meanKeyedSize: round(mean(P.keyedSize), 1),
      blockF1: { propn: P.propn.map((r) => (r.gold ? r.f1 ?? 0 : null)), nominal: P.nominal.map((r) => (r.gold ? r.f1 ?? 0 : null)) } };
  }
  if (derangedPropn.length) res.configs.deranged000 = { propn: agg(derangedPropn) };
  if (aucRows.length) res.m4 = { blocks: aucRows.length, salienceAUC: round(mean(aucRows.map((r) => r.salience).filter((x) => x != null))), mentionsAUC: round(mean(aucRows.map((r) => r.mentions).filter((x) => x != null))), salienceBeatsMentions: aucRows.filter((r) => (r.salience ?? 0) > (r.mentions ?? 0)).length };
  return res;
}

// ── report ───────────────────────────────────────────────────────────────────
const load = (stage) => { const d = path.join(OUT_DIR, stage); return fs.existsSync(d) ? Object.fromEntries(fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))])) : {}; };
const bitIx = { S: 0, R: 1, A: 2 };
const flip = (c, k) => c.slice(0, bitIx[k]) + (c[bitIx[k]] === "0" ? "1" : "0") + c.slice(bitIx[k] + 1);
const f = (x, d = 3) => (x == null ? "  -  " : Number(x).toFixed(d));
const sgn = (x) => (x == null ? "  -  " : (x >= 0 ? "+" : "") + Number(x).toFixed(3));

function mainEffect(r, k, key = (c) => c.propn.F1) {
  const ds = CONFIGS.filter((c) => c[bitIx[k]] === "0").map((c) => key(r.configs[flip(c, k)]) - key(r.configs[c]));
  return mean(ds);
}
function ladderTable(R, label) {
  const stems = STEMS25.filter((s) => R[s]?.configs);
  const lines = [`\n## ${label}: PROPN macro F1 per config (blocks with gold), and the ladder\n`, "stem      " + CONFIGS.join("  ").padEnd(36) + "   dS      dR      dA     (main effects over 4 contexts)"];
  const sums = {};
  for (const s of stems) {
    const r = R[s];
    lines.push(`${s.padEnd(9)} ` + CONFIGS.map((c) => f(r.configs[c].propn.F1)).join(" ") + "   " + ["S", "R", "A"].map((k) => sgn(mainEffect(r, k))).join(" "));
    for (const k of ["S", "R", "A"]) (sums[k] ??= []).push(mainEffect(r, k));
  }
  lines.push("mean      " + " ".repeat(CONFIGS.length * 6) + "   " + ["S", "R", "A"].map((k) => sgn(mean(sums[k]))).join(" "));
  for (const k of ["S", "R", "A"]) {
    const up = sums[k].filter((x) => x > 0.0005).length, down = sums[k].filter((x) => x < -0.0005).length;
    const t = signTest(up, down);
    lines.push(`  ${k}: stems up ${up}, down ${down}, flat ${sums[k].length - up - down}; across-stem sign test (one-sided, up) p=${f(t.p, 4)}`);
  }
  return lines.join("\n");
}
function cumulative(R) {
  const lines = ["\n## cumulative ladder 000 -> 100 -> 110 -> 111 (block-level paired sign test on PROPN F1, per stem)\n", "stem      000    100    110    111    s:000>100  r:100>110  a:110>111"];
  for (const s of STEMS25.filter((x) => R[x]?.configs)) {
    const c = R[s].configs;
    const el = c["000"].blockF1.propn.map((x, i) => (x == null ? -1 : i)).filter((i) => i >= 0);
    const pt = (a, b) => { const t = pairedTest(el.map((i) => c[b].blockF1.propn[i]), el.map((i) => c[a].blockF1.propn[i])); return `${t.wins}-${t.losses}${t.significant ? "*" : " "}`; };
    lines.push(`${s.padEnd(9)} ${["000", "100", "110", "111"].map((k) => f(c[k].propn.F1)).join(" ")}   ${pt("000", "100").padEnd(10)} ${pt("100", "110").padEnd(10)} ${pt("110", "111")}`);
  }
  return lines.join("\n");
}
function strata(R) {
  const lines = ["\n## strata: unseen-PROPN and seen-PROPN, P/R/F1, config 000 vs 100 vs 110 (R: the refusal change acts on unseen words)\n", "stem      cfg   all(P/R/F1)           unseen(P/R/F1)        seen(P/R/F1)     size"];
  for (const s of STEMS25.filter((x) => R[x]?.configs)) for (const c of ["000", "100", "110", "111"]) {
    const x = R[s].configs[c];
    const t = (a) => `${f(a.P, 2)}/${f(a.R, 2)}/${f(a.F1, 2)}`;
    lines.push(`${s.padEnd(9)} ${c}   ${t(x.propn).padEnd(20)}  ${t(x.unseenPropn).padEnd(20)}  ${t(x.seenPropn).padEnd(15)} ${x.meanSize}`);
  }
  return lines.join("\n");
}
function m2Table(R) {
  const lines = ["\n## M2 refusal on UNSEEN occurrences (B3 ceiling 0.05): LOST = true naming refused; CAUGHT = non-naming refused\n", "stem      unseen  gold   lostPlur lostMass | caughtPlur caughtMass"];
  const lp = [], lm = [], cp = [], cm = [];
  for (const s of STEMS25.filter((x) => R[x]?.m2)) {
    const m = R[s].m2;
    lines.push(`${s.padEnd(9)} ${String(m.n).padStart(6)} ${String(m.gold).padStart(6)}   ${f(m.lostPlurality)}    ${f(m.lostLossBounded)}  |  ${f(m.caughtPlurality)}     ${f(m.caughtLossBounded)}`);
    if (m.lostPlurality != null) { lp.push(m.lostPlurality); lm.push(m.lostLossBounded); cp.push(m.caughtPlurality); cm.push(m.caughtLossBounded); }
  }
  lines.push(`stems with LOST <= ${KEY_ALPHA}: plurality ${lp.filter((x) => x <= KEY_ALPHA).length}/${lp.length}, loss-bounded ${lm.filter((x) => x <= KEY_ALPHA).length}/${lm.length}; median CAUGHT plurality ${f(med(cp))} -> loss-bounded ${f(med(cm))}`);
  return lines.join("\n");
}
const med = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
function m3Table(R) {
  const lines = ["\n## M3 affix: split-recall and false-split, ear off (A=0) vs on (A=1) vs deranged prior\n", "stem      split-words   off      on     deranged | false-split off  on    | file"];
  for (const s of STEMS25.filter((x) => R[x]?.m3)) {
    const m = R[s].m3;
    if (m.gap) { lines.push(`${s.padEnd(9)} ${m.gap}`); continue; }
    lines.push(`${s.padEnd(9)} ${String(m.on.split).padStart(8)}     ${f(m.off.splitRecall, 2)}    ${f(m.on.splitRecall, 2)}    ${f(m.deranged?.splitRecall, 2)}   |   ${f(m.off.falseSplitRate, 4)} ${f(m.on.falseSplitRate, 4)} | ${R[s].hasAffixFile ? "yes" : "no"}`);
  }
  return lines.join("\n");
}
function checks(R) {
  const lines = ["\n## controls and checks\n"];
  const bad = [];
  for (const s of STEMS25.filter((x) => R[x]?.checks)) {
    const c = R[s].checks;
    if (c.c2_equals_production === false) bad.push(`${s}: C2 production-equivalence FAILED`);
    for (const [k, v] of Object.entries(c.c3 ?? {})) if (!v) bad.push(`${s}: C3 prefix invariance FAILED at ${k}`);
    if (c.c5_null_stem_identical === false) bad.push(`${s}: C5 null-stem identity FAILED`);
    if (c.c1_licence && !(c.c1_licence.misalignedF1 < 0.5 * c.c1_licence.realF1)) bad.push(`${s}: C1 licence weak (misaligned ${c.c1_licence.misalignedF1} vs real ${c.c1_licence.realF1})`);
    const d = R[s].configs?.deranged000;
    if (d && R[s].configs["000"]) lines.push(`  C4 ${s}: PROPN F1 with deranged prior (A bit off) ${f(d.propn.F1)} vs ${f(R[s].configs["000"].propn.F1)} (ear is the real one at 000; see m3.deranged for the split-recall)`);
  }
  lines.push(bad.length ? "FAILED: " + bad.join("; ") : "all of C1 C2 C3 C5 hold on every stem measured");
  const m4 = STEMS25.filter((s) => R[s]?.m4);
  if (m4.length) {
    lines.push("\n## M4 salience AUC (config 100): salience vs plain mentions, among the beings named\n");
    for (const s of m4) lines.push(`  ${s.padEnd(9)} salience ${f(R[s].m4.salienceAUC)}  mentions ${f(R[s].m4.mentionsAUC)}  salience>mentions in ${R[s].m4.salienceBeatsMentions}/${R[s].m4.blocks} blocks`);
    lines.push(`  mean salience AUC ${f(mean(m4.map((s) => R[s].m4.salienceAUC)))}; stems where salience beats mentions: ${m4.filter((s) => R[s].m4.salienceAUC > R[s].m4.mentionsAUC).length}/${m4.length}`);
  }
  return lines.join("\n");
}
function diff(R, P, a, b) {
  const lines = [`\n## what the new stage did to everything already measured (${b} minus ${a}), PROPN macro F1 per config\n`, "stem      " + CONFIGS.join("   ") + "   (regressions marked <)"];
  for (const s of STEMS25.filter((x) => R[x]?.configs && P[x]?.configs)) {
    const d = CONFIGS.map((c) => R[s].configs[c].propn.F1 - P[s].configs[c].propn.F1);
    lines.push(`${s.padEnd(9)} ${d.map((x) => sgn(x) + (x < -0.0005 ? "<" : " ")).join("")}`);
  }
  return lines.join("\n");
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = { stage: null, vs: null, stems: null, source: "dev", priorsDir: PRIORS_DIR, tail: 0.2 };
  for (let i = 0; i < rest.length; i++) { const a = rest[i]; if (a === "--stage") o.stage = rest[++i]; else if (a === "--vs") o.vs = rest[++i]; else if (a === "--stems") o.stems = rest[++i].split(","); else if (a === "--source") o.source = rest[++i]; else if (a === "--priors-dir") o.priorsDir = rest[++i]; else if (a === "--tail") o.tail = Number(rest[++i]); else if (a === "--tail-dir") TAIL_DIR = rest[++i]; else if (a === "--smode") SMODE = rest[++i]; else if (a === "--rmode") RMODE = rest[++i]; }
  if (!o.stage) { console.error("usage: beings-ladder.mjs run|report --stage <label> [--vs <label>] [--stems a,b] [--source dev|tail] [--priors-dir DIR] [--tail 0.2]"); process.exit(2); }
  if (cmd === "run") {
    const dir = path.join(OUT_DIR, o.stage); fs.mkdirSync(dir, { recursive: true });
    for (const stem of o.stems ?? STEMS25) {
      const t0 = Date.now();
      const r = await runStem(stem, o);
      r.ms = Date.now() - t0;
      fs.writeFileSync(path.join(dir, `${stem}.json`), JSON.stringify(r));
      console.error(`${stem}: ${r.gap ?? "ok"} ${r.ms}ms`);
    }
  } else if (cmd === "report") {
    const R = load(o.stage), P = o.vs ? load(o.vs) : null;
    console.log(`# beings ladder — stage ${o.stage}${o.vs ? ` (vs ${o.vs})` : ""}`);
    console.log(ladderTable(R, o.stage)); console.log(cumulative(R)); console.log(strata(R)); console.log(m2Table(R)); console.log(m3Table(R)); console.log(checks(R));
    if (P) console.log(diff(R, P, o.vs, o.stage));
  } else { console.error("unknown command"); process.exit(2); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
