// eval/competence/r3-beings.mjs — RUNG R3: FIND BEINGS, CASE-STRIPPED.
//
//   node eval/competence/r3-beings.mjs --stem <stem> [--split dev|test] [--limit N] [--verbose]
//   node eval/competence/r3-beings.mjs --all [--split dev|test]        (one JSON line per stem)
//   import { RUNG, measure } from "./r3-beings.mjs"      measure({stem, split, limit}) -> result card
//   Result card is also written to /private/tmp/claude-501/competence/r3-<stem>-<split>.json.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5: written before the first run of this file; ═══
// ═══ no threshold below is tuned after a result; a failure is reported as a failure)       ═══
// DISCLOSURE. Before this header was written two exploratory runs touched the API only: one timed the
// cast on 300 DEV sentences per stem and printed list LENGTHS (no gold, no scores); one printed the
// extractSurfaces output shape. Neither chose a rule below.
//
// CLAIM. Read with every capital stripped, one sentence at a time, causally, through the DECLARED
// listener of its language, the listening cast (listening-cast.js) names the recurring beings the
// treebank's gold names (PROPN; and PROPN|NOUN), unseen words included, in cased and caseless scripts
// alike, better than counting words (no prior) and better than a baseline that knows nothing about
// the words. The capital tier is reported as the strongest rival WITNESS where a script has case; it
// is not a control and is not required to be beaten (one witness, never THE signal).
//
// UNIT AND INPUT. A BLOCK of consecutive held-out sentences. Block size S = clamp(floor(N/8), 60, 300)
// for N sentences read (--limit caps N): ~300 as specified when the split is big enough; smaller when
// it is not, because 8 = the smallest block count at which an exact one-sided sign test at the declared
// 5% can still reach significance with ONE dissenting block (computed in code: minBlocksForDissent).
// 60 is a PROVISIONAL floor (a bare integer, P4). Only full blocks are used; the tail is a typed gap.
// Every block gets a FRESH cast; the sentence TEXT (`# text =` line) is lowercased before it is added.
//
// GOLD (system-independent: from the treebank only). Gold item = the lowercase NFC FORM of a token
// tagged PROPN (set `propn`) / PROPN or NOUN (set `nominal`), kept when it occurs >= 2 times in the
// block (= listening-cast ARRIVALS_FLOOR, S16) and contains a letter. EXCEPTION, declared: where the
// treebank itself annotates the bound-morpheme split (lemma column with `+`, xpos with `+`, Sejong
// tags — Korean), the item is the nominal STEM: the form minus the trailing morphemes tagged J*, E* or
// VCP, accepted only if it is a prefix of the form. No ear, prior or reader output enters the gold.
// MATCH. EXACT string equality of NFC-lowercased forms: no tolerance for bound morphemes, segmentation
// or clitics (a reader that hears a name inside `서울에서` or `del` wrongly is not credited; R1 owns that
// and R3 is read AFTER it). Gold the reader cannot name by its own declared tokenisation (below
// wordFloor, non-word characters, numerals, reduplication) STAYS in gold; `details.arms.*.*Reach`
// reports the same table on the REACHABLE gold, and gaps type how much was unreachable.
//
// ARMS (all read the same lowercased block; sets of forms; every arm but capital is case-blind):
//   keyed       cast.beings()   nominated 2 arrivals + standing vs the received baseline (REAL ARM)
//   nominated   cast.nominated() same ledger, NO standing test   (ablation of the gate; reported)
//   rawTop      cast.rawTop()   every word unit >= 2 arrivals, NO prior at all           [control]
//   rawTopK     top-K of rawTop by frequency, K = |keyed| (size-matched)                 [control]
//   deranged    full pipeline, rateOf = ONE constant = mean of the prior's received rates [control]
//   shuffled    full pipeline, received rates PERMUTED among the prior's forms by a seeded
//               Sattolo derangement (no form keeps its own rate)                          [control]
//   capital     surfaces.js extractSurfaces on the ORIGINAL-case text, mentions >= 2, split to words;
//               EMPTY with a typed gap when scriptCoverage says the script has no usable case
//   union       keyed ∪ capital (informational)
//   misaligned  INSTRUMENT control: keyed of block b scored against the gold of block b+1 (cyclic)
// METRICS per arm and gold set: precision, recall, F1 (= 2|P∩G|/(|P|+|G|)); macro = mean over blocks
// with non-empty gold; micro = pooled counts. An empty prediction is F1 0, never "undefined = good".
//
// PASS RULE (PASS iff ALL; PASS RULE is not softened after a run):
//  (K) on PROPN gold, keyed F1 beats EACH of rawTop, rawTopK, deranged, shuffled, per block, by the
//      exact one-sided sign test (lib.signTest, ties dropped) at p <= 0.05 over eligible blocks
//      (eligible = >= 1 recurring PROPN gold form). All four must reject (intersection test: no
//      correction needed). [spec asked rawTop and deranged; rawTopK and shuffled are STRICTER additions]
//  (L) LICENCE: keyed beats `misaligned` by the same test — the statistic moves when the gold is
//      perturbed. If not, the instrument or the mechanism is broken: pass=false, note says so (II.23).
//  (C) CAUSAL CHECK (S3) on block 0: beings after 60% of the block, snapshotted mid-read, equal a fresh
//      cast fed only that 60% prefix.
//  (Z) CASELESS CLAUSE: on a caseless script (cmn cmn-hans jpn kor arb heb fas hin urd, or every block
//      gapped by scriptCoverage) pooled keyed PROPN recall > 0 where the capital arm is empty.
//  pass = null (typed gap `underpowered`) when eligible blocks < minDiscordantFor(0.05) = 5, or when
//  there is no gold/prior (`unmeasured`). With 5..7 eligible blocks only a unanimous win can pass.
//  score = keyed PROPN macro F1; control = max F1 over the four controls IN THE RULE; margin = score -
//  control. Best arm over ALL arms (capital, nominated, union included) is reported honestly in details.
//
// PREDICTIONS (written blind; ranges are guesses, the ORDERS are the claims):
//  P1 keyed > rawTop and rawTopK on PROPN F1 in every measured stem (prior refusals alone do that).
//  P2 keyed > deranged and shuffled significantly only where the prior is big (eng, spa, arb); NOT
//     in cmn-hans and kor (blocks of ~60-150 sentences: few gold forms, ties) — the pass rule is
//     predicted to be met by <= half of the dev stems. The 5%-gate was falsified on recurrence
//     (reading-helps-falsify.mjs); this is the first test against gold, and I expect it to be mixed.
//  P3 capital F1 > keyed F1 on PROPN in eng and spa (capital is the stronger witness where it exists).
//  P4 keyed F1 <= nominated F1 on PROPN|NOUN (the gate refuses common nouns that gold counts); and on
//     PROPN keyed >= nominated (the gate helps the named beings).
//  P5 licence holds on PROPN in every stem (names are block-specific); on PROPN|NOUN the misaligned
//     control scores near the real arm (common nouns recur everywhere), so nominal is DESCRIPTIVE only.
//  P6 caseless clause: keyed PROPN recall > 0 in cmn-hans, arb; kor lowest (unseen names keep their
//     particle: the ear peels only attested stems).
//  Headline guess: keyed PROPN macro F1 in [0.15, 0.50] for eng/spa, lower for kor/cmn-hans.
//
// DEPARTURES FROM THE SPEC, said once: (1) block size shrinks with the split (above); (2) two stricter
// controls (rawTopK, shuffled) and two extra clauses (L, C) are part of the pass rule; (3) every arm
// reads with commonNouns=true (the heard-only configuration: nothing defers to capitals); the
// production cased setting (commonNouns=false + capital tier) is approximated by `union`; (4) capital
// uses mentions >= 2 and word-splits multiword surfaces; discoverReferents is NOT used (it groups,
// it does not select candidates). Held-out discipline: develop on DEV; TEST once, by the orchestrator.
// LIMITS: exact matching charges the ear's errors to R3; gold is the treebank's idea of a being
// (compounds, MWT clitics, annotation noise); block-level significance has few degrees of freedom.
//
// ═══ AMENDMENT A — dated 2026-10-06, written BEFORE the re-run of this file ═══════════════════════════════════════
// The text ABOVE is the registration as first written and is left as it was; where it disagrees with this block, THIS
// BLOCK governs from the re-run on (the PASS RULE, ARMS and PREDICTIONS above are superseded where named below).
//
// WHY. An independent review of the first DEV cards (eng spa cmn-hans kor) found defects in the instrument. Its numbers
// were SEEN by the author before this block was written (eng keyed 0.360 vs a prior-lexicon filter 0.491; spa 0.448 vs
// 0.746; deranged_constant == nominated to four decimals; 69-79% of recurring PROPN gold forms are keys of the TRAIN
// prior). So this is a post-hoc amendment prompted by a result, not a blind one, and it is said so here. Every change
// below ADDS a control or a clause, or relabels or re-configures an arm to match production; none lowers a bar, and no
// numeric threshold of the registration is touched (ALPHA 5%, the 5-discordant minimum, the 8-block plan, floor 60).
// Review finding 5 reached the author cut off mid-sentence ("every arm reads with comm..."); what is addressed is its
// two readable claims (the trivial prior-lexicon filter, and the commonNouns=true handicap). Anything after the cut is
// NOT addressed here.
//
// A1 STRATA  (finding: "unseen words included" was claimed and never tested; the headline PROPN F1 is largely lookup of
//    TRAIN-prior labels). Every arm's P/R/F1 is also computed on two strata of BOTH the prediction and the gold:
//    SEEN = the lowercase NFC form is an own key of the TRAIN posPrior.forms; UNSEEN = it is absent. The seen share of
//    gold is a typed denominator (gap gold_propn_seen_in_train_prior, form-block pairs). NEW CLAUSE (U), part of PASS:
//    on the UNSEEN stratum of PROPN gold, keyed F1 beats EACH of UNSEEN_CONTROLS = rawTop, rawTopK, prior_scrambled,
//    randomK, per block, by the same exact sign test at 5%, over blocks with >= 1 unseen PROPN gold form (eligible).
//    Why these four: they are the controls whose perturbation touches what the reader does with a word the prior has
//    never met (counting it; counting it at the keyed size; reading it with a deranged class prior and frame prior;
//    a random pick of the ledger). The gate-off controls (nominated, lexicon_filter, shuffled, rate_permuted) are NOT
//    in U for a stated reason: the standing gate meets an unseen word at the add-one floor rate, so on the unseen
//    stratum they equal keyed by construction and could only tie. If a U control cannot be computed, or the unseen
//    stratum has < 5 eligible blocks while nothing else failed, pass = null (typed gap), never true.
// A2 CONTROLS THAT COST SOMETHING  (finding: deranged_constant == nominated; shuffled differs from nominated by a few
//    forms; no control perturbs the POS prior or the frame prior, which do the work). CONTROLS_IN_RULE is now:
//      rawTop rawTopK                      no prior (kept)
//      nominated                           the ledger with the standing gate OFF (kept; it now stands in the rule for
//                                          deranged, which IS the gate switched off: one constant ~1/V rate lets every
//                                          form with 2 arrivals through. `deranged` stays REPORTED, as an instrument
//                                          self-check against the gate-off ledger under the arm's own configuration
//                                          (nominated where commonNouns=true, lexicon_filter where false), and is not
//                                          counted as a separate control. [wording fixed 2026-10-06 after a first
//                                          functional smoke run on eng DEV: no rule, control or prediction changed]
//      lexicon_filter                      NEW. nominated minus the forms the prior itself settles as common nouns
//                                          (NOUN share >= 0.7 of >= 3 tokens: listening-cast.js isCommon, mirrored as
//                                          COMMON_NOUN_SHARE / COMMON_NOUN_MIN, whose bare integers are the cast's own
//                                          and provisional, P4). No standing test, no frame prior: the "trivial
//                                          prior-lexicon filter" of review finding 5. keyed must beat it.
//      shuffled                            kept (rates deranged among the PRIOR's forms; nearly gate-off, honest label)
//      rate_permuted                       NEW. Per block, the real received rates of the block's own nominated forms are
//                                          deranged AMONG those forms (Sattolo, seeded): the rate multiset, hence the
//                                          admission size, is preserved; the form-to-rate link is destroyed. Built from
//                                          the finished block's candidate list: a CONTROL, not a reader.
//      prior_scrambled                     NEW. The full cast on a grammar whose posPrior class-count vectors are
//                                          deranged among its forms (so refusals AND received rates move) and whose
//                                          framePrior distributions are deranged among its frame keys. The ear is left
//                                          alone (its word lexicon is not the class knowledge under test).
//      randomK                             NEW. A seeded random subset of nominated of size |keyed|.
//    A control that does as well as keyed (mean F1 >= keyed) is reported in the notes as II.23 "instrument or mechanism
//    broken" evidence, not as a footnote. `deranged` and `shuffled` are not independent of `nominated`; the card says so.
// A3 REAL ARM = THE PRODUCTION CONFIGURATION  (finding 5: every arm read with commonNouns=true, which handicaps the real
//    arm on PROPN gold in cased scripts). Production defers settled common nouns to the descriptor tier wherever the
//    script has case (language-context.js: commonNouns: !casedScript; reading-helps-falsify.mjs the same). `keyed` is
//    now cast.beings() with commonNouns = !(casedFraction(block) >= CASED_SCRIPT_FLOOR), the production rule, computed
//    from the LOWERCASED block (script casedness needs no capital). In caseless scripts that is commonNouns=true, so
//    `keyed` is unchanged there. The pre-registered arm (commonNouns=true everywhere) is KEPT as `keyedAll`, reported in
//    the arms table, and `details.preregistered_arm` re-runs the whole pass rule with it as the real arm. `union` is
//    now exactly production's cased setting (keyed + capital tier). This arm change favours the real arm on PROPN
//    gold; it is offset by A2 and A1 and is declared here, not hidden. nominated, rawTop, rawTopK are unaffected.
// A4 CAPITAL AND UNION ARE NON-CAUSAL AND ENGLISH-LISTED  (finding). extractSurfaces runs over the WHOLE block and its
//    physics filter compares capitalised vs lowercase counts over the whole block (surfaces.js ~696): lookahead in the
//    sense of S3 for every unit it judges. It also applies lang/en NEVER_A_NAME and HONORIFIC_TITLES (priors.js) to every
//    stem. `capital` and `union` are therefore labelled WHOLE-BLOCK, NON-CAUSAL, ENGLISH-LISTED in `details.arm_provenance`
//    and in the notes, are EXCLUDED from the "best causal arm" ranking (`details.best.causal*`), and the clause C check
//    does not cover them. `details.capital_lookahead` (block 0) counts what a 60% prefix answer says that the whole-block
//    answer reverses. They remain reported as the strongest rival witness; they are still not a control.
// A5 PREDICTIONS FOR THE AMENDED RULE (written blind to the re-run; the ORDERS are the claims):
//  PA1 keyed (production config) does NOT beat lexicon_filter significantly in eng and spa: the standing gate adds nothing
//      measurable over the prior's own common-noun refusal (|F1 diff| <= 0.03). => K:lexicon_filter FAILS in eng, spa.
//  PA2 prior_scrambled F1 is below keyed by >= 0.10 in eng and spa and significantly: the statistic moves when the prior
//      is deranged (II.23 licence for the prior); rate_permuted is below keyed by >= 0.05 in eng and spa.
//  PA3 on the UNSEEN stratum keyed is within 0.05 F1 of rawTop in eng and spa, so U vs rawTop is NOT significant:
//      the knowledge-free count names unseen words about as well. U vs prior_scrambled and randomK is significant.
//  PA4 cmn-hans: keyed (caseless: commonNouns=true, common nouns admitted by design) loses to lexicon_filter on PROPN gold,
//      so pass = false. kor and arb stay `underpowered` (PROPN gold is annotation-thin there: pass null).
//  PA5 no measured stem passes the amended rule on DEV (expected 0 of 5). That would be the finding, not a defect.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createListeningCast, ARRIVALS_FLOOR, ORIGINAL } from "../../adapters/text/listening-cast.js"; // the instrument measures the ORIGINAL design (standing gate, plurality refusal); the new default is measured by eval/beings-ladder.mjs
import { receivedRate } from "../../adapters/text/keyness.js";
import { extractSurfaces, scriptCoverage } from "../../adapters/text/surfaces.js";
import { wordFloor } from "../../adapters/text/script-floor.js";
import { createLanguageListener } from "../../the-fold/language-listener.js";
import { casedFraction, CASED_SCRIPT_FLOOR } from "../../the-fold/language-context.js";
import { grammarFor, availableStems } from "../../the-fold/language-grammar.js";
import {
  readConllu, conlluPath, mulberry32, derangement, signTest, minDiscordantFor, binomUpperTail,
  parseArgs, writeResult, headerDigest, EVAL_DIR, KEY_ALPHA,
} from "./lib.mjs";

// ── ADDENDUM (AFTER the first DEV run; outside the pre-registered header; changes NO rule) ───────────────
// The first DEV run showed that PROPN gold is annotation-thin in two treebanks (arb PADT tags names X; kor GSD tags names
// NOUN/NNG: 27 and 72 PROPN tokens in the whole DEV file), so the PROPN-based pass rule is `underpowered` (pass=null) there,
// which is the pre-registered outcome and is reported as such. Added then, descriptive only: `details.tests_descriptive`
// (the same paired sign test on BOTH gold sets against EVERY other arm) and a licence note that distinguishes "failed"
// from "untestable". Neither enters `pass`.
export const RUNG = Object.freeze({
  id: "r3",
  name: "find beings (case-stripped)",
  question: "with every capital stripped, does the causal listening cast name the recurring beings the gold names, better than counting words or a baseline that knows nothing?",
});

// ── declared constants ──────────────────────────────────────────────────────
export const BLOCK_TARGET = 300;          // the spec's block
export const MIN_BLOCK = 60;              // PROVISIONAL floor: a bare integer (P4), below this "recurs twice" means nothing
export const GOLD_RECUR = ARRIVALS_FLOOR; // 2: one observation is not a distribution (S16) — same minimum as the reader's
export const ALPHA = KEY_ALPHA;           // the declared 5%
export const CAUSAL_FRACTION = 0.6;       // snapshot at 60% of block 0 (off the dyadic checkpoint grid)
// AMENDMENT A2: `deranged` (= the gate switched off, by construction) is replaced in the rule by `nominated`; four controls are added.
export const CONTROLS_IN_RULE = Object.freeze(["rawTop", "rawTopK", "nominated", "lexicon_filter", "shuffled", "rate_permuted", "prior_scrambled", "randomK"]);
// AMENDMENT A1: the controls whose perturbation touches what the reader does with a word the prior has never met.
export const UNSEEN_CONTROLS = Object.freeze(["rawTop", "rawTopK", "prior_scrambled", "randomK"]);
// AMENDMENT A4: arms computed over the WHOLE block (S3 lookahead) and with English lists: excluded from the causal ranking.
export const NONCAUSAL_ARMS = Object.freeze(["capital", "union"]);
// Mirrors listening-cast.js isCommon (a bare 0.7 and 3 THERE: provisional, P4). Checked against the real cast in readBlock (`commonMirrorOk`).
export const COMMON_NOUN_SHARE = 0.7;
export const COMMON_NOUN_MIN = 3;
export const CASELESS_DECLARED = Object.freeze(new Set(["cmn", "cmn-hans", "jpn", "kor", "arb", "heb", "fas", "hin", "urd"]));
const EPS = 1e-12;

// ── forms ───────────────────────────────────────────────────────────────────
export const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase();
const WORDISH = /^[\p{L}\p{M}\p{N}'’]+$/u;   // the cast's own unit alphabet
const NUMERIC = /^[\p{N}'’]+$/u;
const HAS_LETTER = /\p{L}/u;
const isReduplication = (w) => { const cs = [...w]; return cs.length >= 4 && new Set(cs).size <= 2; };
/** Could the reader's own tokenisation, floor and refusals ever emit this form? (listening-cast.add's pre-filters.) */
export const isReachable = (f) => WORDISH.test(f) && !NUMERIC.test(f) && f.length >= wordFloor(f, 3) && !isReduplication(f);

// ── gold from the treebank ──────────────────────────────────────────────────
/** The nominal STEM the treebank's own morpheme annotation gives (lemma `+`, Sejong xpos), or null. */
export function boundStem(tok) {
  if (!tok?.lemma || !tok?.xpos || !tok.lemma.includes("+") || !tok.xpos.includes("+")) return null;
  const lem = tok.lemma.split("+"), tag = tok.xpos.split("+");
  if (lem.length !== tag.length || lem.some((m) => !m)) return null;
  let end = lem.length;
  while (end > 1 && /^(J|E|VCP$)/.test(tag[end - 1])) end -= 1;
  if (end === lem.length) return null;                // nothing bound to strip
  const stem = norm(lem.slice(0, end).join(""));
  return stem && norm(tok.form).startsWith(stem) ? stem : null;
}
export const goldForm = (tok) => boundStem(tok) ?? norm(tok.form);

/** The sentence surface the reader is given: the `# text =` line, else rebuilt from the tokens (counted). */
export function sentenceText(s) {
  if (s.text) return { text: s.text, rebuilt: false };
  const skip = new Set();
  const parts = [];
  const rangeAt = new Map((s.ranges ?? []).map((r) => [r.from, r]));
  for (const t of s.tokens) {
    const r = rangeAt.get(t.id);
    if (r) { parts.push(r.form + (r.spaceAfter ? " " : "")); for (let k = r.from; k <= r.to; k++) skip.add(k); continue; }
    if (skip.has(t.id)) continue;
    parts.push(t.form + (t.spaceAfter ? " " : ""));
  }
  return { text: parts.join("").trim(), rebuilt: true };
}

/**
 * goldSets(sentences) → { propn:Set, nominal:Set, stats } — forms recurring >= `recur` times in these sentences.
 * stats are typed gap denominators: tokens read, tokens tagged, non-letter forms dropped, forms absent from the surface text.
 */
export function goldSets(sentences, { recur = GOLD_RECUR } = {}) {
  const propn = new Map(), nominal = new Map();
  const stats = { sentences: sentences.length, tagged: 0, nonLetter: 0, notInText: 0, stemmed: 0 };
  for (const s of sentences) {
    const low = norm(sentenceText(s).text);
    for (const t of s.tokens) {
      if (t.upos !== "PROPN" && t.upos !== "NOUN") continue;
      stats.tagged += 1;
      const f = goldForm(t);
      if (!HAS_LETTER.test(f)) { stats.nonLetter += 1; continue; }
      if (boundStem(t)) stats.stemmed += 1;
      if (!low.includes(f)) stats.notInText += 1;
      nominal.set(f, (nominal.get(f) ?? 0) + 1);
      if (t.upos === "PROPN") propn.set(f, (propn.get(f) ?? 0) + 1);
    }
  }
  const keep = (m) => new Set([...m].filter(([, n]) => n >= recur).map(([f]) => f));
  return { propn: keep(propn), nominal: keep(nominal), stats };
}

// ── blocks ──────────────────────────────────────────────────────────────────
/** The smallest block count at which an exact one-sided sign test at `alpha` survives ONE dissenting block. */
export function minBlocksForDissent(alpha = ALPHA) {
  for (let b = 2; b <= 200; b++) if (binomUpperTail(b - 1, b, 0.5) <= alpha) return b;
  return 200;
}
/** planBlocks(n) → { size, count, want, used, unused, underpowered } — blocks of ~300, shrunk (floor 60) so `want` blocks exist. */
export function planBlocks(n, { target = BLOCK_TARGET, minBlock = MIN_BLOCK, alpha = ALPHA } = {}) {
  const want = minBlocksForDissent(alpha);
  const size = Math.max(minBlock, Math.min(target, Math.floor(n / want)));
  const count = n >= size ? Math.floor(n / size) : 0;
  return { size, count, want, used: size * count, unused: n - size * count, underpowered: count < minDiscordantFor(alpha) };
}

// ── metrics ─────────────────────────────────────────────────────────────────
/** prf(predicted:Set, gold:Set) — exact-match precision/recall/F1; F1 = 2tp/(|P|+|G|), 0 when nothing is predicted. */
export function prf(pred, gold) {
  let tp = 0;
  for (const p of pred) if (gold.has(p)) tp += 1;
  const P = pred.size, G = gold.size;
  return { tp, size: P, gold: G, p: P ? tp / P : null, r: G ? tp / G : null, f1: P + G ? (2 * tp) / (P + G) : null };
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const filterSet = (s, keep) => new Set([...s].filter(keep));

/** Aggregate per-block prf rows (blocks with gold only): macro P/R/F1 and micro P/R/F1 and mean prediction size. */
export function aggregate(rows) {
  const r = rows.filter((x) => x.gold > 0);
  const tp = r.reduce((a, x) => a + x.tp, 0), P = r.reduce((a, x) => a + x.size, 0), G = r.reduce((a, x) => a + x.gold, 0);
  return {
    blocks: r.length,
    macroF1: mean(r.map((x) => x.f1 ?? 0)),
    macroP: mean(r.filter((x) => x.size > 0).map((x) => x.p)),
    macroR: mean(r.map((x) => x.r ?? 0)),
    microP: P ? tp / P : null, microR: G ? tp / G : null, microF1: P + G ? (2 * tp) / (P + G) : null,
    meanSize: mean(r.map((x) => x.size)), tp, predicted: P, gold: G,
  };
}

/** Paired exact sign test of "a beats b" over per-block F1s (ties dropped). */
export function pairedTest(a, b, alpha = ALPHA) {
  let wins = 0, losses = 0, ties = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; if (d > EPS) wins++; else if (d < -EPS) losses++; else ties++; }
  const t = signTest(wins, losses);
  const meanDiff = mean(a.map((x, i) => x - b[i]));
  return { wins, losses, ties, n: t.n, p: t.p, meanDiff, canReach: t.n >= minDiscordantFor(alpha), significant: t.n >= minDiscordantFor(alpha) && wins > losses && t.p <= alpha };
}

/**
 * scoreBlocks(blocks, {caseless, causalOk, realArm, isSeen, rule, uRule}) — the pure instrument core, tested on a toy.
 * blocks[i] = { gold:{propn:Set, nominal:Set}, arms:{ name: Set } } (arms must include the `realArm`, default `keyed`).
 * `isSeen(form)` says whether a form is a key of the TRAIN posPrior (AMENDMENT A1): without it no strata exist and the
 * unseen clause U cannot be evaluated, so pass can never be true (it is null, typed).
 * Returns { table, tests, unseen, licence, eligible, pass, passReason, perBlock, best }.
 */
export function scoreBlocks(blocks, { caseless = false, causalOk = true, alpha = ALPHA, rule = CONTROLS_IN_RULE, uRule = UNSEEN_CONTROLS, realArm = "keyed", isSeen = null } = {}) {
  const B = blocks.length;
  const GOLDS = ["propn", "nominal"];
  const armNames = [...new Set(blocks.flatMap((b) => Object.keys(b.arms)))];
  const sub = (set, want) => filterSet(set, (f) => Boolean(isSeen(f)) === want);
  const perBlock = blocks.map((b, i) => {
    const next = blocks[(i + 1) % B];
    const rec = { gold: { propn: b.gold.propn.size, nominal: b.gold.nominal.size }, goldStrata: null, arms: {} };
    if (isSeen) rec.goldStrata = Object.fromEntries(GOLDS.map((g) => [g, { seen: sub(b.gold[g], true).size, unseen: sub(b.gold[g], false).size }]));
    for (const a of armNames) {
      const set = b.arms[a] ?? new Set();
      const setR = filterSet(set, isReachable);
      rec.arms[a] = {
        propn: prf(set, b.gold.propn), nominal: prf(set, b.gold.nominal),
        propnReach: prf(setR, filterSet(b.gold.propn, isReachable)), nominalReach: prf(setR, filterSet(b.gold.nominal, isReachable)),
      };
      if (isSeen) rec.arms[a].strata = Object.fromEntries(GOLDS.map((g) => [g, { seen: prf(sub(set, true), sub(b.gold[g], true)), unseen: prf(sub(set, false), sub(b.gold[g], false)) }]));
    }
    const k = b.arms[realArm] ?? new Set();
    rec.misaligned = { propn: prf(k, next.gold.propn), nominal: prf(k, next.gold.nominal) };
    return rec;
  });
  const table = {};
  for (const a of armNames) {
    table[a] = {};
    for (const g of ["propn", "nominal", "propnReach", "nominalReach"]) table[a][g] = aggregate(perBlock.map((r) => r.arms[a][g]));
    if (isSeen) table[a].strata = Object.fromEntries(GOLDS.map((g) => [g, { seen: aggregate(perBlock.map((r) => r.arms[a].strata[g].seen)), unseen: aggregate(perBlock.map((r) => r.arms[a].strata[g].unseen)) }]));
  }
  const misaligned = { propn: aggregate(perBlock.map((r) => r.misaligned.propn)), nominal: aggregate(perBlock.map((r) => r.misaligned.nominal)) };
  const elig = perBlock.map((r) => r.gold.propn > 0);
  const eligible = elig.filter(Boolean).length;
  const f1s = (get) => perBlock.filter((_, i) => elig[i]).map((r) => get(r) ?? 0);
  const keyedF1 = f1s((r) => r.arms[realArm].propn.f1);

  const tests = {};
  for (const c of rule) {
    if (!armNames.includes(c)) { tests[c] = { unmeasured: true }; continue; }
    tests[c] = pairedTest(keyedF1, f1s((r) => r.arms[c].propn.f1), alpha);
  }
  const licence = pairedTest(keyedF1, f1s((r) => r.misaligned.propn.f1), alpha);

  // AMENDMENT A1: the same paired test on the UNSEEN stratum of PROPN gold (blocks with >= 1 unseen PROPN gold form).
  const eligU = isSeen ? perBlock.map((r) => r.goldStrata.propn.unseen > 0) : [];
  const eligibleUnseen = eligU.filter(Boolean).length;
  const uPick = (get) => perBlock.filter((_, i) => eligU[i]).map((r) => get(r) ?? 0);
  const unseenTests = {};
  for (const c of uRule) {
    if (!isSeen || !armNames.includes(c)) { unseenTests[c] = { unmeasured: true }; continue; }
    unseenTests[c] = pairedTest(uPick((r) => r.arms[realArm].strata.propn.unseen.f1), uPick((r) => r.arms[c].strata.propn.unseen.f1), alpha);
  }

  // DESCRIPTIVE (never enters `pass`): the same paired sign test on BOTH gold sets against EVERY other arm, whole gold and,
  // where strata exist, the unseen stratum — so a stem whose PROPN gold is annotation-thin still says what the gate does.
  const descriptive = {}, descriptiveUnseen = {};
  for (const g of GOLDS) {
    const el = perBlock.map((r) => r.gold[g] > 0);
    const pick = (get) => perBlock.filter((_, i) => el[i]).map((r) => get(r) ?? 0);
    const kf = pick((r) => r.arms[realArm][g].f1);
    descriptive[g] = { eligible: el.filter(Boolean).length, misaligned: pairedTest(kf, pick((r) => r.misaligned[g].f1), alpha) };
    for (const a of armNames) if (a !== realArm) descriptive[g][a] = pairedTest(kf, pick((r) => r.arms[a][g].f1), alpha);
    if (isSeen) {
      const eu = perBlock.map((r) => r.goldStrata[g].unseen > 0);
      const pu = (get) => perBlock.filter((_, i) => eu[i]).map((r) => get(r) ?? 0);
      const ku = pu((r) => r.arms[realArm].strata[g].unseen.f1);
      descriptiveUnseen[g] = { eligible: eu.filter(Boolean).length };
      for (const a of armNames) if (a !== realArm) descriptiveUnseen[g][a] = pairedTest(ku, pu((r) => r.arms[a].strata[g].unseen.f1), alpha);
    }
  }
  const recallMicro = table[realArm]?.propn.microR ?? 0;
  const capitalEmpty = (table.capital?.propn.predicted ?? 0) === 0;

  let pass, passReason;
  const need = minDiscordantFor(alpha);
  if (!B) { pass = null; passReason = "unmeasured: no blocks"; }
  else if (eligible < need) { pass = null; passReason = `underpowered: ${eligible} eligible PROPN block(s) < ${need}, the fewest at which the sign test can reach ${alpha}`; }
  else {
    const failed = [], untested = [];
    for (const c of rule) if (tests[c].unmeasured || !tests[c].significant) failed.push(`K:${c}`);
    if (!licence.significant) failed.push("L:licence");
    if (!causalOk) failed.push("C:causal");
    if (caseless && !(recallMicro > 0)) failed.push("Z:caseless_recall");
    for (const c of uRule) {
      if (unseenTests[c].unmeasured) untested.push(`U:${c}`);
      else if (eligibleUnseen < need) untested.push(`U:${c}`);
      else if (!unseenTests[c].significant) failed.push(`U:${c}`);
    }
    if (failed.length) { pass = false; passReason = `failed ${failed.join(", ")}`; }
    else if (untested.length) {
      pass = null;
      passReason = `untested: every K L C Z clause holds but the unseen-stratum clause ${untested.join(", ")} could not be evaluated (${isSeen ? `${eligibleUnseen} eligible unseen-PROPN block(s) < ${need}` : "no seen/unseen split supplied"})`;
    } else { pass = true; passReason = "all of K L C Z U hold"; }
  }
  const rank = (g, skip = []) => Object.entries(table).filter(([n]) => !skip.includes(n)).map(([n, v]) => [n, v[g].macroF1]).filter(([, f]) => f != null).sort((a, b) => b[1] - a[1]);
  return {
    table, misaligned, tests, unseen: { eligible: eligibleUnseen, tests: unseenTests }, licence, descriptive, descriptiveUnseen, eligible, pass, passReason, recallMicro, capitalEmpty, perBlock, realArm,
    best: {
      propn: rank("propn")[0] ?? null, nominal: rank("nominal")[0] ?? null, rankPropn: rank("propn"), rankNominal: rank("nominal"),
      causalPropn: rank("propn", NONCAUSAL_ARMS)[0] ?? null, causalNominal: rank("nominal", NONCAUSAL_ARMS)[0] ?? null,
      rankCausalPropn: rank("propn", NONCAUSAL_ARMS), rankCausalNominal: rank("nominal", NONCAUSAL_ARMS),
    },
  };
}

// ── reading one block ───────────────────────────────────────────────────────
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const forms = (list) => new Set(list.map((x) => norm(x.surface ?? x)));
const sig = (beings) => JSON.stringify(beings.map((b) => [b.surface, b.mentions]).sort());
const jaccard = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const sumOf = (m) => Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
const argmaxClass = (m) => Object.entries(m ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

/** The received rates and the two perturbed baselines for a language's POS prior (constant mean; seeded derangement). */
export function controlRates(posPrior, seed) {
  const real = receivedRate(posPrior);
  const names = Object.keys(posPrior?.forms ?? {});
  if (!(Number(posPrior?.provenance?.tokens_read) > 0) || !names.length) return { baseline: false, real, flat: null, shuf: new Map() };
  const rates = names.map((f) => real(f));
  const flat = mean(rates);
  const perm = derangement(names.length, mulberry32(seed));
  const shuf = new Map();
  if (perm) names.forEach((f, i) => shuf.set(f, rates[perm[i]]));
  return { baseline: true, real, flat, shuf };
}

/** Does the prior itself settle `w` as a common noun? A mirror of listening-cast.js isCommon (the cast does not export it). */
export function isCommonForm(posPrior, w) {
  const c = posPrior?.forms?.[w];
  if (!c) return false;
  const t = sumOf(c);
  return t >= COMMON_NOUN_MIN && (c.NOUN ?? 0) / t >= COMMON_NOUN_SHARE;
}

/**
 * AMENDMENT A2 (prior_scrambled): a copy of the grammar's priors with the posPrior class-count VECTORS deranged among its
 * forms (Sattolo: no form keeps its own vector, so refusals AND received rates move) and the framePrior's class
 * DISTRIBUTIONS deranged among its frame keys (the backoff keys stay). Null-prototype objects, so a form named
 * "__proto__" stays a key. `stats.classChanged` counts forms whose majority class moved: the licence that the perturbation
 * touched the knowledge under test.
 */
export function scramblePrior(posPrior, framePrior, seed) {
  const rng = mulberry32(seed);
  const names = Object.keys(posPrior?.forms ?? {});
  const perm = derangement(names.length, rng);
  const out = Object.create(null);
  names.forEach((n, i) => { out[n] = posPrior.forms[perm ? names[perm[i]] : n]; });
  const classChanged = names.filter((n) => argmaxClass(out[n]) !== argmaxClass(posPrior.forms[n])).length;
  let fp = framePrior ?? null, frameKeys = 0;
  if (framePrior?.frames) {
    const keys = Object.keys(framePrior.frames);
    frameKeys = keys.length;
    const p2 = derangement(keys.length, rng);
    const frames = Object.create(null);
    keys.forEach((k, i) => { frames[k] = framePrior.frames[p2 ? keys[p2[i]] : k]; });
    fp = { ...framePrior, frames };
  }
  return { posPrior: { ...posPrior, forms: out }, framePrior: fp, stats: { forms: names.length, classChanged, frameKeys } };
}

/** AMENDMENT A2 (rate_permuted): the candidates' real rates dealt back among the candidates by a seeded derangement. */
export function ratePermutation(cands, rateOf, rng) {
  const map = new Map();
  const perm = derangement(cands.length, rng);
  if (!perm) return map;
  const rates = cands.map((f) => rateOf(f));
  cands.forEach((f, i) => map.set(f, rates[perm[i]]));
  return map;
}

/**
 * Read one block of lowercased sentences: the real cast and the controls. `snapshotAt` takes a mid-read beings() signature
 * (causal check). `commonNouns` is the PRODUCTION setting (AMENDMENT A3) for the real arm and for every gate control; the
 * pre-registered heard-only arm (commonNouns=true) is kept as `keyedAll`. Default true = the first registration's reading.
 */
export function readBlock({ texts, hear, posPrior, seed, snapshotAt = null, commonNouns = true }) {
  const cast = createListeningCast({ hear, commonNouns, ...ORIGINAL });
  let snap = null;
  texts.forEach((t, i) => { cast.add(t); if (snapshotAt === i + 1) snap = sig(cast.beings()); });
  const keyed = forms(cast.beings());
  const nominatedList = cast.nominated();
  const nominated = forms(nominatedList);
  const rawList = cast.rawTop().map((x) => norm(x.surface));
  const rawTop = new Set(rawList);
  const rawTopK = new Set(rawList.slice(0, keyed.size));

  // the pre-registered arm: every settled common noun allowed through (only beings() differs; add() does not read commonNouns)
  let keyedAll = keyed;
  if (!commonNouns) { const ca = createListeningCast({ hear, commonNouns: true, ...ORIGINAL }); texts.forEach((t) => ca.add(t)); keyedAll = forms(ca.beings()); }

  // gate controls on ONE cast whose rate is switched at beings() time (the rate is only read there)
  const rates = controlRates(posPrior, seed);
  const permMap = rates.baseline ? ratePermutation([...nominated], (f) => rates.real(f), mulberry32((seed ^ 0x9e3779b9) >>> 0)) : new Map();
  const mode = { m: "real" };
  const rateFor = (f) => (mode.m === "real" ? rates.real(f) : mode.m === "flat" ? rates.flat : mode.m === "shuf" ? (rates.shuf.get(f) ?? rates.real(f)) : (permMap.get(f) ?? rates.real(f)));
  const sw = createListeningCast({ hear, rateOf: (_lang, f) => rateFor(f), commonNouns, ...ORIGINAL });
  texts.forEach((t) => sw.add(t));
  mode.m = "real"; const swReal = forms(sw.beings());
  mode.m = "flat"; const deranged = forms(sw.beings());
  mode.m = "shuf"; const shuffled = forms(sw.beings());
  mode.m = "perm"; const ratePermuted = forms(sw.beings());

  // prior_scrambled: the whole cast on a grammar with deranged class knowledge (the ear is the real one, untouched)
  const scrCache = new WeakMap();
  let scrambleStats = null;
  const scrHear = (t, si) => {
    const c = hear(t, si);
    if (!c?.grammar?.posPrior?.forms) return c;
    let s = scrCache.get(c.grammar.posPrior);
    if (!s) { s = scramblePrior(c.grammar.posPrior, c.grammar.framePrior, (seed ^ 0x85ebca6b) >>> 0); scrCache.set(c.grammar.posPrior, s); scrambleStats ??= s.stats; }
    return { ...c, grammar: { ...c.grammar, posPrior: s.posPrior, framePrior: s.framePrior } };
  };
  const scr = createListeningCast({ hear: scrHear, commonNouns, ...ORIGINAL });
  texts.forEach((t) => scr.add(t));
  const priorScrambled = forms(scr.beings());

  // lexicon_filter: the nominated ledger minus what the prior itself settles as common nouns (no standing test, no frame prior)
  const lexiconFilter = new Set([...nominated].filter((f) => !isCommonForm(posPrior, f)));
  // randomK: a seeded random subset of nominated of size |keyed|
  const pool = [...nominated];
  const rngK = mulberry32(fnv(`${seed}|randomK`));
  const K = Math.min(keyed.size, pool.length);
  for (let i = 0; i < K; i++) { const j = i + Math.floor(rngK() * (pool.length - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const randomK = new Set(pool.slice(0, K));

  // instrument self-checks
  const refusedByCast = [...keyedAll].filter((f) => !keyed.has(f));
  const commonMirrorOk = commonNouns ? null : refusedByCast.every((f) => isCommonForm(posPrior, f)) && [...keyed].every((f) => !isCommonForm(posPrior, f));
  const permChanged = permMap.size ? [...permMap].filter(([f, r]) => r !== rates.real(f)).length / permMap.size : null;
  return {
    arms: { keyed, keyedAll, nominated, rawTop, rawTopK, deranged, shuffled, lexicon_filter: lexiconFilter, rate_permuted: ratePermuted, prior_scrambled: priorScrambled, randomK },
    snap,
    extra: {
      switchEquivalent: setEq(swReal, keyed), baseline: rates.baseline, commonNouns, commonMirrorOk,
      keyedN: keyed.size, keyedAllN: keyedAll.size, nominatedN: nominated.size, rawN: rawTop.size, lexiconN: lexiconFilter.size,
      gateRefusedShare: nominated.size ? 1 - keyed.size / nominated.size : null,
      gateRefusedShareOfLexicon: lexiconFilter.size ? 1 - [...keyed].filter((f) => lexiconFilter.has(f)).length / lexiconFilter.size : null,
      keyedInsideLexicon: keyed.size ? [...keyed].filter((f) => lexiconFilter.has(f)).length / keyed.size : null,
      jaccardKeyedDeranged: jaccard(keyed, deranged), jaccardKeyedShuffled: jaccard(keyed, shuffled),
      derangedEqualsGateOff: setEq(deranged, commonNouns ? nominated : lexiconFilter),
      scrambleClassChangedShare: scrambleStats?.forms ? scrambleStats.classChanged / scrambleStats.forms : null,
      ratePermutedChangedShare: permChanged,
      report: cast.report(),
    },
  };
}

/** The capital witness on the ORIGINAL-case sentences; empty + typed gap when the script has no usable case. WHOLE-BLOCK, NON-CAUSAL, English-listed (AMENDMENT A4). */
export function capitalWitness(rawTexts) {
  const sents = rawTexts.map((text, order) => ({ text, order }));
  const cov = scriptCoverage(sents);
  if (cov.gap) return { forms: new Set(), gap: cov.gap.reason, casedShare: cov.casedShare };
  let surfaces = [];
  try { surfaces = extractSurfaces(sents, {}); } catch (e) { return { forms: new Set(), gap: "capital_tier_threw", casedShare: cov.casedShare }; }
  const words = new Set();
  for (const s of surfaces) {
    if ((s.mentions ?? 0) < ARRIVALS_FLOOR) continue;
    for (const w of String(s.surface).split(/\s+/)) { const n = norm(w); if (HAS_LETTER.test(n)) words.add(n); }
  }
  return { forms: words, gap: null, casedShare: cov.casedShare };
}

// ── the measurement ─────────────────────────────────────────────────────────
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const unmeasured = (base, why, detail) => ({ ...base, pass: null, gaps: [{ reason: "unmeasured", count: 1, detail: why }, ...base.gaps], notes: [...base.notes, detail ?? why] });
const THIS_FILE = fileURLToPath(import.meta.url);

/** Provenance of every arm, written once: which are causal, which read case, which list English. (AMENDMENT A4) */
export const ARM_PROVENANCE = Object.freeze({
  keyed: { role: "REAL ARM", causal: true, reads: "lowercased text", config: "commonNouns = !casedScript (production, A3)" },
  keyedAll: { role: "pre-registered arm", causal: true, reads: "lowercased text", config: "commonNouns = true everywhere" },
  nominated: { role: "control (gate off)", causal: true, reads: "lowercased text" },
  rawTop: { role: "control (no prior)", causal: true, reads: "lowercased text" },
  rawTopK: { role: "control (no prior, size-matched)", causal: true, reads: "lowercased text" },
  deranged: { role: "instrument self-check: the gate switched off by construction, NOT an independent control", causal: true, reads: "lowercased text" },
  shuffled: { role: "control (rates deranged among the prior's forms; nearly gate-off)", causal: true, reads: "lowercased text" },
  lexicon_filter: { role: "control (trivial prior-lexicon filter)", causal: true, reads: "lowercased text" },
  rate_permuted: { role: "control (rates deranged among the block's candidates; built from the finished block)", causal: "end-of-block construct", reads: "lowercased text" },
  prior_scrambled: { role: "control (posPrior classes + framePrior deranged)", causal: true, reads: "lowercased text" },
  randomK: { role: "control (random subset of nominated, size |keyed|)", causal: "end-of-block construct", reads: "lowercased text" },
  capital: { role: "rival WITNESS, not a control", causal: false, reads: "ORIGINAL-case text", scope: "WHOLE BLOCK: extractSurfaces' physics filter compares capitalised vs lowercase counts over the whole block (S3 lookahead)", lists: "English-only NEVER_A_NAME + HONORIFIC_TITLES (priors.js, giver lang/en) applied to every stem" },
  union: { role: "informational (keyed + capital = production's cased setting)", causal: false, reads: "ORIGINAL-case text for its capital half", scope: "inherits capital's whole-block scope", lists: "inherits capital's English lists" },
});

/**
 * measureSentences(sentences, { stem, split, hear, posPrior }) — the whole instrument on parsed sentences.
 * `hear(text, si)` is the language leg (the DECLARED listener in production; a toy in tests).
 */
export function measureSentences(sentences, { stem, split = "dev", hear, posPrior, caselessDeclared = CASELESS_DECLARED.has(stem) }) {
  const base = { stem, rung: RUNG.id, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} };
  const N = sentences.length;
  const plan = planBlocks(N);
  if (!plan.count) return unmeasured(base, "no_block", `${N} sentences < the ${MIN_BLOCK}-sentence block floor`);
  const used = sentences.slice(0, plan.used);
  const isSeen = (f) => Boolean(posPrior?.forms) && Object.hasOwn(posPrior.forms, f);
  const blocks = [], extras = [], castCN = [];
  let causal = null, capitalLookahead = null, rebuilt = 0, gold = { tagged: 0, nonLetter: 0, notInText: 0, stemmed: 0 };
  for (let b = 0; b < plan.count; b++) {
    const sl = used.slice(b * plan.size, (b + 1) * plan.size);
    const rawTexts = sl.map((s) => { const t = sentenceText(s); if (t.rebuilt) rebuilt += 1; return t.text; });
    const texts = rawTexts.map((t) => t.toLowerCase());               // CASE-STRIPPED: the reader never sees a capital
    const g = goldSets(sl);
    for (const k of Object.keys(gold)) gold[k] += g.stats[k];
    // A3: the production setting. Script casedness is a fact of the script, read off the LOWERCASED block (no capital needed).
    const casedScript = casedFraction(texts.join("\n")) >= CASED_SCRIPT_FLOOR;
    const cn = !casedScript;
    castCN.push(cn);
    const snapshotAt = b === 0 ? Math.max(1, Math.floor(texts.length * CAUSAL_FRACTION)) : null;
    const r = readBlock({ texts, hear, posPrior, seed: fnv(`${stem}|${b}`), snapshotAt, commonNouns: cn });
    if (b === 0) {                                                      // S3: the prefix answer equals the mid-read answer (real arm's own configuration)
      const fresh = createListeningCast({ hear, commonNouns: cn, ...ORIGINAL });
      texts.slice(0, snapshotAt).forEach((t) => fresh.add(t));
      causal = { k: snapshotAt, ok: sig(fresh.beings()) === r.snap, items: JSON.parse(r.snap).length, commonNouns: cn };
    }
    const cap = capitalWitness(rawTexts);
    if (b === 0 && !cap.gap) {                                          // A4: how much does the whole-block capital answer reverse of a causal 60% prefix answer
      const pre = capitalWitness(rawTexts.slice(0, snapshotAt));
      capitalLookahead = { k: snapshotAt, prefixForms: pre.forms.size, wholeForms: cap.forms.size, prefixFormsReversedByLookahead: [...pre.forms].filter((f) => !cap.forms.has(f)).length };
    }
    const union = new Set([...r.arms.keyed, ...cap.forms]);
    blocks.push({ gold: { propn: g.propn, nominal: g.nominal }, arms: { ...r.arms, capital: cap.forms, union } });
    extras.push({ ...r.extra, capitalGap: cap.gap, casedShare: cap.casedShare });
  }
  const capGapBlocks = extras.filter((e) => e.capitalGap).length;
  const caseless = caselessDeclared || capGapBlocks === plan.count;
  const causalOk = causal?.ok !== false;
  const S = scoreBlocks(blocks, { caseless, causalOk, isSeen });
  const SA = scoreBlocks(blocks, { caseless, causalOk, isSeen, realArm: "keyedAll" });   // the first registration's arm under the amended rule
  const T = S.table;
  const row = (a, g = "propn") => T[a]?.[g];
  const f1 = (a, g = "propn") => round(row(a, g)?.macroF1 ?? null);

  // the controls: macro PROPN F1 per arm; `control` = the strongest of the controls IN THE (amended) PASS RULE
  const controls = {
    rawTop: f1("rawTop"), rawTop_at_K: f1("rawTopK"), nominated_ablation: f1("nominated"), lexicon_filter: f1("lexicon_filter"),
    deranged_shuffled: f1("shuffled"), rate_permuted: f1("rate_permuted"), prior_scrambled: f1("prior_scrambled"), size_matched_random: f1("randomK"),
    deranged_constant: f1("deranged"),     // = the gate switched off by construction (self-check against nominated_ablation), NOT an independent control
    misaligned_gold: round(S.misaligned.propn.macroF1),
  };
  controls.capital_witness = f1("capital"); // WHOLE-BLOCK, non-causal, English-listed; 0 where the script has no usable case (typed gap), never skipped
  const ruleF1 = CONTROLS_IN_RULE.map((c) => row(c)?.macroF1 ?? 0);
  const score = round(row("keyed").macroF1 ?? 0);
  const control = round(Math.max(...ruleF1));
  const reports = extras.map((e) => e.report);
  const heardLangs = [...new Set(reports.flatMap((r) => r.languages.map((l) => l.language)))];
  const unheard = reports.reduce((a, r) => a + r.languageUnheard, 0);
  const gaps = [];
  const gap = (reason, count, of, detail) => { if (count) gaps.push({ reason, count, of, ...(detail ? { detail } : {}) }); };
  gap("language_unheard", unheard, N);
  if (extras.some((e) => !e.baseline)) gaps.push({ reason: "no_baseline", count: extras.filter((e) => !e.baseline).length, of: plan.count, detail: "the prior carries no tokens_read: the gate admits nothing (S137)" });
  gap(caseless ? "script_without_case" : "capital_gapped_block", capGapBlocks, plan.count, "capital arm EMPTY by scriptCoverage; scored 0, not skipped");
  gap("empty_gold_blocks", S.perBlock.filter((r) => r.gold.propn === 0).length, plan.count, "no recurring PROPN in the block: excluded from PROPN aggregates and tests");
  gap("unused_tail_sentences", plan.unused, N);
  gap("gold_token_not_in_text", gold.notInText, gold.tagged, "tagged token whose gold form is not a substring of its surface text (MWT/normalised forms): counted in gold, cannot be matched");
  gap("gold_non_letter_excluded", gold.nonLetter, gold.tagged, "NOUN/PROPN-tagged forms with no letter (numerals, symbols) dropped from gold");
  gap("text_reconstructed", rebuilt, N, "no `# text` line; rebuilt from tokens");
  const unreach = [...blocks.reduce((u, b) => { for (const f of b.gold.propn) if (!isReachable(f)) u.add(`${f}`); return u; }, new Set())];
  const reachShare = (() => { let tot = 0, un = 0; for (const b of blocks) for (const f of b.gold.propn) { tot++; if (!isReachable(f)) un++; } return { un, tot }; })();
  gap("gold_propn_unreachable_by_reader_tokenisation", reachShare.un, reachShare.tot, "below the word floor / non-word characters: stays in gold; see *Reach tables");
  // AMENDMENT A1: the seen share of gold, a typed denominator (form-block pairs): the part of the headline that is lookup of TRAIN-prior labels
  const goldStrata = Object.fromEntries(["propn", "nominal"].map((g) => [g, { seen: S.perBlock.reduce((a, r) => a + r.goldStrata[g].seen, 0), unseen: S.perBlock.reduce((a, r) => a + r.goldStrata[g].unseen, 0) }]));
  const gs = goldStrata.propn;
  gap("gold_propn_seen_in_train_prior", gs.seen, gs.seen + gs.unseen, "recurring PROPN gold form-block pairs whose form is a key of the TRAIN posPrior: the headline PROPN F1 on these is partly lookup, not heard competence; see details.strata");
  if (S.pass === null) gaps.push({ reason: S.passReason.startsWith("untested") ? "unseen_stratum_untested" : "underpowered", count: S.passReason.startsWith("untested") ? S.unseen.eligible : S.eligible, of: minDiscordantFor(ALPHA), detail: S.passReason });

  const bestCausal = S.best.causalPropn, bestCausalNom = S.best.causalNominal;
  const keyedF1 = row("keyed").macroF1 ?? 0;
  const noBetter = CONTROLS_IN_RULE.filter((c) => (row(c)?.macroF1 ?? 0) >= keyedF1 - EPS);
  const notes = [
    `block plan: ${plan.count} blocks x ${plan.size} sentences of ${N} read (want ${plan.want} blocks for one-dissent tolerance); eligible PROPN blocks ${S.eligible}; eligible unseen-PROPN blocks ${S.unseen.eligible}`,
    `pass: ${S.pass === null ? "null" : S.pass} — ${S.passReason}`,
    `real arm = production configuration: commonNouns=${castCN.every((x) => x === castCN[0]) ? castCN[0] : "mixed"} (casedScript=${castCN[0] ? "false" : "true"}); the pre-registered arm keyedAll scores PROPN F1 ${f1("keyedAll")} and passes ${SA.pass === null ? "null" : SA.pass} under the amended rule`,
    `best CAUSAL arm on PROPN F1: ${bestCausal ? `${bestCausal[0]} ${round(bestCausal[1])}` : "none"}; on PROPN|NOUN F1: ${bestCausalNom ? `${bestCausalNom[0]} ${round(bestCausalNom[1])}` : "none"}. Best over ALL arms incl. the non-causal capital witness: ${S.best.propn ? `${S.best.propn[0]} ${round(S.best.propn[1])}` : "none"} (capital and union are WHOLE-BLOCK, non-causal and English-listed: excluded from the causal ranking)`,
    `keyed vs nominated (the gate${castCN.some((x) => !x) ? " plus the production common-noun deferral" : ""}) on PROPN F1: ${f1("keyed")} vs ${f1("nominated")}; keyed vs lexicon_filter (nominated minus the prior's settled common nouns, no gate${castCN.every((x) => !x) ? ": the gate ALONE, since keyed already defers them" : castCN.every((x) => x) ? ": keyed ADMITS common nouns by design in a caseless script, so PROPN-only gold charges it for them" : ""}): ${f1("keyed")} vs ${f1("lexicon_filter")}; on PROPN|NOUN: ${f1("keyed", "nominal")} vs ${f1("nominated", "nominal")}${castCN.some((x) => !x) ? ` (the production arm defers settled common nouns on purpose where case exists; keyedAll ${f1("keyedAll", "nominal")})` : ""}`,
    `seen/unseen (TRAIN prior): ${gs.seen} of ${gs.seen + gs.unseen} recurring PROPN gold form-block pairs are seen (${round(gs.seen / Math.max(1, gs.seen + gs.unseen), 3)}); keyed PROPN F1 seen ${round(T.keyed.strata.propn.seen.macroF1)} unseen ${round(T.keyed.strata.propn.unseen.macroF1)}; rawTop seen ${round(T.rawTop.strata.propn.seen.macroF1)} unseen ${round(T.rawTop.strata.propn.unseen.macroF1)}; keyed vs rawTop on the unseen stratum: ${S.unseen.tests.rawTop.unmeasured ? "unmeasured" : `${S.unseen.tests.rawTop.wins} wins, ${S.unseen.tests.rawTop.losses} losses, ${S.unseen.tests.rawTop.ties} ties, p ${round(S.unseen.tests.rawTop.p)}`}`,
    `controls independent of the gate: rawTop rawTopK randomK rate_permuted prior_scrambled lexicon_filter; deranged_constant (${controls.deranged_constant}) is the gate switched off by construction and nominated_ablation is ${controls.nominated_ablation}; shuffled (${controls.deranged_shuffled}) is nearly gate-off`,
  ];
  if (noBetter.length) notes.push(`II.23: control(s) ${noBetter.join(", ")} score(s) at or above the real arm on PROPN macro F1 (${keyedF1 ? round(keyedF1) : 0}): a control that does as well as the real arm means the mechanism it is meant to be tested against adds nothing here, or the instrument is broken`);
  if (!S.licence.significant) {
    const lic = `keyed vs misaligned-gold sign test wins ${S.licence.wins}/losses ${S.licence.losses}/ties ${S.licence.ties}, p ${round(S.licence.p)}`;
    notes.push(S.licence.canReach
      ? `LICENCE FAILED: ${lic} — the statistic did not move under the perturbation: instrument or mechanism broken, no pass allowed (II.23)`
      : `licence NOT ESTABLISHED (too few discordant blocks to test, needs ${minDiscordantFor(ALPHA)}): ${lic} — absence of power, not evidence of a broken instrument`);
  }
  const scrShare = mean(extras.map((e) => e.scrambleClassChangedShare).filter((x) => x != null));
  if (scrShare != null && scrShare < 0.5) notes.push(`prior_scrambled licence: only ${round(scrShare, 3)} of the prior's forms changed majority class under the derangement: the perturbation is weak`);
  if (causal && !causal.ok) notes.push("CAUSALITY VIOLATED: the beings at 60% of block 0 differ from a fresh read of the prefix (S3 lookahead)");
  if (extras.some((e) => !e.switchEquivalent)) notes.push("instrument check: the rateOf-switchable cast in `real` mode did NOT equal the production cast on >=1 block");
  if (extras.some((e) => e.commonMirrorOk === false)) notes.push("instrument check: the mirrored common-noun definition (COMMON_NOUN_SHARE/MIN) disagrees with the cast's own commonNouns=false refusals on >=1 block: lexicon_filter is not the cast's rule");
  const dEq = extras.filter((e) => e.derangedEqualsGateOff).length;
  if (dEq) notes.push(`deranged_constant equals the production-config ledger with the gate off (nominated where commonNouns=true, lexicon_filter where false) as a set on ${dEq} of ${extras.length} blocks: the "deranged" control is the gate switched off, not a second control (A2)`);
  if (caseless && !S.capitalEmpty) notes.push("caseless script but the capital arm is non-empty (cased debris in the file): reported, not credited");
  if (S.eligible >= minDiscordantFor(ALPHA) && S.eligible < plan.want) notes.push(`only ${S.eligible} eligible blocks: a pass needs (near-)unanimity`);
  if (capitalLookahead) notes.push(`capital arm lookahead (block 0, 60% prefix vs whole block): ${capitalLookahead.prefixFormsReversedByLookahead} of ${capitalLookahead.prefixForms} prefix-admitted forms are reversed by the whole-block answer`);

  const sx = (a) => ({ F1: round(a.macroF1), P: round(a.macroP), R: round(a.macroR), microP: round(a.microP), microR: round(a.microR), microF1: round(a.microF1), size: round(a.meanSize, 1), gold: a.gold, blocks: a.blocks });
  const compact = (a) => ({ propn: { F1: round(a.propn.macroF1), P: round(a.propn.macroP), R: round(a.propn.macroR), microF1: round(a.propn.microF1), size: round(a.propn.meanSize, 1) }, nominal: { F1: round(a.nominal.macroF1), P: round(a.nominal.macroP), R: round(a.nominal.macroR), microF1: round(a.nominal.microF1), size: round(a.nominal.meanSize, 1) },
    propnReach: { F1: round(a.propnReach.macroF1), P: round(a.propnReach.macroP), R: round(a.propnReach.macroR) }, nominalReach: { F1: round(a.nominalReach.macroF1), P: round(a.nominalReach.macroP), R: round(a.nominalReach.macroR) } });
  const arms = Object.fromEntries(Object.keys(T).map((a) => [a, compact(T[a])]));
  const strataArms = Object.fromEntries(Object.keys(T).map((a) => [a, Object.fromEntries(["propn", "nominal"].map((g) => [g, { seen: sx(T[a].strata[g].seen), unseen: sx(T[a].strata[g].unseen) }]))]));
  const testOut = (t) => (t.unmeasured ? t : { wins: t.wins, losses: t.losses, ties: t.ties, p: round(t.p), meanDiff: round(t.meanDiff), significant: t.significant });
  const testsDesc = (o) => Object.fromEntries(Object.entries(o).map(([g, v]) => [g, Object.fromEntries(Object.entries(v).map(([k, t]) => [k, typeof t === "number" ? t : testOut(t)]))]));
  const details = {
    prereg_sha256: headerDigest(THIS_FILE),
    plan, caseless, caselessDeclared, capitalGapBlocks: capGapBlocks, causal, heardLanguages: heardLangs,
    production_config: { commonNounsPerBlock: castCN, rule: "commonNouns = !(casedFraction(lowercased block) >= CASED_SCRIPT_FLOOR)  (language-context.js)" },
    arm_provenance: ARM_PROVENANCE,
    capital_lookahead: capitalLookahead,
    gold: { ...gold, propnFormsPerBlock: S.perBlock.map((r) => r.gold.propn), nominalFormsPerBlock: S.perBlock.map((r) => r.gold.nominal), unreachableExamples: unreach.slice(0, 12), seenInTrainPrior: goldStrata },
    arms,
    strata: { definition: "SEEN = lowercase NFC form is an own key of the TRAIN posPrior.forms; UNSEEN = absent. Applied to the prediction AND the gold of each arm.", eligibleUnseenPropnBlocks: S.unseen.eligible, arms: strataArms, tests_unseen: Object.fromEntries(Object.entries(S.unseen.tests).map(([k, v]) => [`keyed_beats_${k}`, testOut(v)])), tests_descriptive_unseen: testsDesc(S.descriptiveUnseen) },
    tests: { ...Object.fromEntries(Object.entries(S.tests).map(([k, v]) => [`keyed_beats_${k}`, testOut(v)])), keyed_beats_misaligned: testOut(S.licence) },
    tests_descriptive: testsDesc(S.descriptive),
    preregistered_arm: { arm: "keyedAll", note: "the first registration's real arm (commonNouns=true everywhere) under the AMENDED rule; descriptive, never the card's pass", propnF1: f1("keyedAll"), pass: SA.pass, passReason: SA.passReason, tests: Object.fromEntries(Object.entries(SA.tests).map(([k, v]) => [`keyedAll_beats_${k}`, testOut(v)])), tests_unseen: Object.fromEntries(Object.entries(SA.unseen.tests).map(([k, v]) => [`keyedAll_beats_${k}`, testOut(v)])) },
    keyedPropnMicroRecall: round(S.recallMicro), capitalEmpty: S.capitalEmpty,
    best: { propn: S.best.propn, nominal: S.best.nominal, causalPropn: S.best.causalPropn, causalNominal: S.best.causalNominal,
      rankPropn: S.best.rankPropn.map(([n, f]) => [n, round(f)]), rankNominal: S.best.rankNominal.map(([n, f]) => [n, round(f)]),
      rankCausalPropn: S.best.rankCausalPropn.map(([n, f]) => [n, round(f)]), rankCausalNominal: S.best.rankCausalNominal.map(([n, f]) => [n, round(f)]) },
    gate: { meanKeyed: round(mean(extras.map((e) => e.keyedN)), 1), meanKeyedAll: round(mean(extras.map((e) => e.keyedAllN)), 1), meanNominated: round(mean(extras.map((e) => e.nominatedN)), 1), meanLexicon: round(mean(extras.map((e) => e.lexiconN)), 1), meanRaw: round(mean(extras.map((e) => e.rawN)), 1),
      meanRefusedShare: round(mean(extras.map((e) => e.gateRefusedShare ?? 0))), meanRefusedShareOfLexicon: round(mean(extras.map((e) => e.gateRefusedShareOfLexicon ?? 0))), meanKeyedInsideLexicon: round(mean(extras.map((e) => e.keyedInsideLexicon ?? 1))),
      meanJaccardKeyedDeranged: round(mean(extras.map((e) => e.jaccardKeyedDeranged))), meanJaccardKeyedShuffled: round(mean(extras.map((e) => e.jaccardKeyedShuffled))),
      derangedEqualsGateOffBlocks: dEq, scrambleClassChangedShare: round(scrShare, 3), ratePermutedChangedShare: round(mean(extras.map((e) => e.ratePermutedChangedShare).filter((x) => x != null)), 3) },
    perBlock: S.perBlock.map((r, i) => ({ block: i, goldPropn: r.gold.propn, goldNominal: r.gold.nominal, goldPropnSeen: r.goldStrata.propn.seen, goldPropnUnseen: r.goldStrata.propn.unseen, propnF1: Object.fromEntries(Object.entries(r.arms).map(([a, v]) => [a, round(v.propn.f1)])), misalignedPropnF1: round(r.misaligned.propn.f1) })),
  };
  return { ...base, n: plan.used, score, control, margin: round(score - control), pass: S.pass, controls, gaps, notes, details };
}

/** measure({stem, split, limit}) → the rung's result card. Never throws for a stem lacking data. */
export async function measure({ stem, split = "dev", limit = null, evalDir = null } = {}) {
  const base = { stem, rung: RUNG.id, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} };
  const file = evalDir ? path.join(evalDir, stem ?? "", `${split}.conllu`) : conlluPath(stem, split);
  if (!file || !fs.existsSync(file)) return unmeasured(base, "no_gold", `no held-out gold at ${evalDir ?? EVAL_DIR}/${stem}/${split}.conllu`);
  const grammar = grammarFor(stem);
  if (!grammar.language || !grammar.posPrior?.forms) return unmeasured(base, "no_prior", grammar.gap ?? `no POS prior for ${stem}: a typed gap, never another language's grammar`);
  const sentences = readConllu(file, limit ? { limit } : {});
  const listener = createLanguageListener({ declared: stem });
  return measureSentences(sentences, { stem, split, hear: (t, si) => listener.listen(t, si), posPrior: grammar.posPrior });
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const slim = (r, verbose) => (verbose ? r : { ...r, details: { ...r.details, perBlock: undefined, arm_provenance: undefined } });
async function main() {
  const a = parseArgs();
  const verbose = a.flags.has("verbose");
  const stems = a.all ? availableStems().filter((s) => fs.existsSync(path.join(EVAL_DIR, s))) : a.stem ? [a.stem] : [];
  if (!stems.length) { console.error("usage: r3-beings.mjs --stem <stem> [--split dev|test] [--limit N] | --all"); process.exit(2); }
  for (const stem of stems) {
    const r = await measure({ stem, split: a.split, limit: a.limit });
    writeResult(RUNG.id, stem, a.split, r);
    console.log(JSON.stringify(slim(r, verbose)));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
