// listening-cast.js — beings found the way a person finds them: by LISTENING,
// one sentence at a time, with nothing from the future.
//
// The rules this obeys (READING-POLICY P1/P2/P4/P6.1/A11, READING-SPEC S3 S5 S9
// S10 S11 S15 S16 S81 S92 S137, LEVELS "heard rule"):
//
//  CAUSAL, STREAMING   `add(sentence)` folds ONE sentence into a ledger and
//                      never re-reads the past (A11). `beings()` is a pure
//                      function of the prefix read so far: the answer after k
//                      sentences equals the answer at step k of a longer read
//                      (S3 — a whole-text statistic is lookahead).
//  PER SENTENCE        the language of each sentence is whatever the injected
//                      `hear(sentence)` says it is NOW, from the prefix (S92).
//                      A sentence in a language with no received grammar is a
//                      typed gap (`language_unheard`), never a guess; a mixed
//                      document keeps one ledger per language.
//  IDENTITY ≠ PRESENCE The ledger (arrivals, per-occurrence evidence) is
//                      undecayed — identity does not fade (P1, S15). PRESENCE is
//                      the kernel's `createActivation`: every mention re-fires a
//                      decaying trace, and `presence` is how present a being is
//                      NOW. The window is MEASURED by `dmdWindow` at dyadic
//                      checkpoints (S5); the whole set is never a candidate
//                      depth, and when no shallower depth reproduces the
//                      conclusion the gap `reach_exceeds_candidates` is
//                      reported and the ladder's top is labelled a CEILING,
//                      never "measured" (S81). Presence never admits a being.
//  EVIDENCE PER        a being's evidence is a list of occurrences (sentence,
//   OCCURRENCE         class basis), not a `Map<surface,count>` (S11).
//  PRIORS REFUSE,      the POS prior (and, for an unseen word, the frame prior)
//   NEVER ADMIT        may REFUSE a form it SETTLES as unable to name a being
//                      (a verb, a particle); an unsettled form is KEPT and
//                      flagged `class_unsettled` (S6 S9 S95 S137).
//  STANDING IS EARNED  two arrivals is the structural minimum for nomination
//                      (S16: "one observation is not a distribution"). Standing
//                      is the exact one-sided binomial tail of the arrivals
//                      against the RECEIVED corpus's own rate for the word, at
//                      the declared 5% (keyness.js — the instrument the
//                      lowercase lane already uses). A language whose prior
//                      carries no token count has no baseline: that language
//                      admits nothing and says `no_baseline` (S137).
//  CAPITALS ARE ONE    this tier never reads case. The capital tier
//   WITNESS            (surfaces.js) is a separate, untouched witness; the two
//                      are unioned by the caller, counted once.
//
// PURE. Priors, ears and the language listener are the caller's.

import { createActivation, dmdWindow, gammaFor } from "../../kernel/activation.js";
import { isKeyInMaterial, receivedRate, KEY_ALPHA } from "./keyness.js";
import { classAt } from "./heard-nominals.js";
import { wordFloor } from "./script-floor.js";

export const ARRIVALS_FLOOR = 2; // the structural minimum (S16), not a dial

const UNIT = /[\p{L}\p{M}\p{N}'’]+|[^\s\p{L}\p{M}\p{N}]/gu;
const WORDISH = /^[\p{L}\p{M}\p{N}'’]+$/u;
const NUMERIC = /^[\p{N}'’]+$/u;
const LOCATOR = /\b(?:https?|ftp):\/\/\S+|\bwww\.\S+|\S+@\S+\.\S+/giu;
const NAMING = new Set(["NOUN", "PROPN"]);
const MIN_SHARE = 0.5; // GRAMMAR_MIN_SHARE, the repo's one declared settledness cut
const isReduplication = (w) => { const cs = [...w]; return cs.length >= 4 && new Set(cs).size <= 2; };
const total = (m) => Object.values(m).reduce((a, b) => a + b, 0);

/** The class a distribution SETTLES on, or null when no class reaches MIN_SHARE. */
const settledClass = (dist) => {
  if (!dist) return null;
  const [c, p] = Object.entries(dist).sort((a, b) => b[1] - a[1])[0] ?? [];
  return p >= MIN_SHARE ? c : null;
};

const dyadic = (n) => { const out = []; for (let d = 2; d < n; d *= 2) out.push(d); return out; };

/**
 * createListeningCast({ hear, rateOf, commonNouns })
 *
 * `hear(text)` → { language, grammar:{posPrior, framePrior}, ear:{segment,peel}, gap? } for
 *   THIS sentence (the language listener's current verdict from the prefix), or
 *   { language:null, gap } when it cannot yet say.
 * `rateOf(language, form)` — optional override of the received rate (a control:
 *   a deranged baseline must make the gate admit what it should refuse).
 * `commonNouns` — false where capitals already name the cast (cased scripts):
 *   settled common nouns are the descriptor tier's, not this one's.
 */
export function createListeningCast({ hear, rateOf = null, commonNouns = true } = {}) {
  if (typeof hear !== "function") throw new TypeError("createListeningCast: hear(sentence) is the language leg — required");
  const states = new Map(); // language -> state
  const gaps = { language_unheard: 0 };
  let read = 0;

  const stateFor = (language, grammar) => {
    let st = states.get(language);
    if (st) return st;
    const baseline = grammar.posPrior?.provenance?.tokens_read > 0 ? receivedRate(grammar.posPrior) : null;
    st = {
      language, grammar, tokens: 0, sentences: 0,
      counts: new Map(),       // every word unit above the length floor -> arrivals (the unfiltered control)
      forms: new Map(),        // form -> { arrivals, sents:Set, occ:[{si,basis}], unsettled, lastSeen, refires }
      refused: new Map(),      // reason -> count
      obs: [],                 // per-sentence arrays of admitted-candidate forms (the presence observations)
      activation: null, window: undefined, windowBasis: "unread_extent", windowGap: "unread_extent", checkpoint: 0,
      baseline,
    };
    states.set(language, st);
    return st;
  };

  const rebuildPresence = (st) => {
    const w = Number.isFinite(st.window) && st.window > 1 ? st.window : null;
    st.activation = createActivation({ window: w });
    for (const keys of st.obs) st.activation.observe(keys);
  };

  // The window is MEASURED at dyadic checkpoints, from the prefix only.
  const deriveCast = (obs) => {
    const c = new Map();
    for (const keys of obs) for (const k of new Set(keys)) c.set(k, (c.get(k) ?? 0) + 1);
    return [...c].filter(([, n]) => n >= ARRIVALS_FLOOR).map(([k]) => k).sort();
  };
  const measureWindow = (st) => {
    const n = st.obs.length;
    const candidates = dyadic(n);
    if (!candidates.length) { st.windowGap = "unread_extent"; return; }
    const m = dmdWindow(st.obs, deriveCast, { candidates });
    if (m.window != null) { st.window = m.window; st.windowBasis = "measured: difference-that-makes-a-difference"; st.windowGap = null; }
    else { st.window = candidates[candidates.length - 1]; st.windowBasis = "ceiling: reach_exceeds_candidates — the ladder's top, not a measurement"; st.windowGap = "reach_exceeds_candidates"; }
    rebuildPresence(st);
  };

  const add = (sentence) => {
    const si = read++;
    const text = String(sentence?.text ?? sentence ?? "").toLowerCase().replace(LOCATOR, " ");
    const ctx = hear(text, si);
    if (!ctx?.language || !ctx.grammar?.posPrior?.forms) { gaps.language_unheard += 1; return; }
    const st = stateFor(ctx.language, ctx.grammar);
    const { posPrior, framePrior } = ctx.grammar;
    let t = text;
    if (ctx.ear?.segment) t = ctx.ear.segment(t);
    if (ctx.ear?.peel) t = ctx.ear.peel(t);
    const units = t.match(UNIT) ?? [];
    st.sentences += 1;
    const here = [];
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!WORDISH.test(u)) continue;
      st.tokens += 1; // the material's own size, for the baseline test
      if (u.length < wordFloor(u, 3) || NUMERIC.test(u)) continue;
      st.counts.set(u, (st.counts.get(u) ?? 0) + 1);
      if (isReduplication(u)) { st.refused.set("reduplication", (st.refused.get("reduplication") ?? 0) + 1); continue; }
      const { dist, basis } = classAt(u, units[i - 1], units[i + 1], { posPrior, framePrior, minShare: MIN_SHARE });
      const settled = settledClass(dist);
      // a prior REFUSES a form it settles as unable to name a being — and only that
      if (settled && !NAMING.has(settled)) { st.refused.set("settled_non_nominal", (st.refused.get("settled_non_nominal") ?? 0) + 1); continue; }
      let f = st.forms.get(u);
      if (!f) { f = { arrivals: 0, sents: new Set(), occ: [], unsettled: 0, lastSeen: -1, refires: 0 }; st.forms.set(u, f); }
      f.arrivals += 1; f.sents.add(si);
      f.occ.push({ si, basis: basis.split("|")[0], settled: Boolean(settled) });
      if (!settled) f.unsettled += 1;
      // a RE-FIRE: the trace was still present when the word came again
      if (f.lastSeen >= 0 && Number.isFinite(st.window) && si - f.lastSeen <= st.window) f.refires += 1;
      f.lastSeen = si;
      here.push(u);
    }
    st.obs.push(here);
    if (!st.activation) rebuildPresence(st);
    st.activation.observe(here);
    // dyadic checkpoint: measure the reach of what has been read so far, from the prefix only
    if (st.obs.length >= 4 && (st.obs.length & (st.obs.length - 1)) === 0 && st.obs.length !== st.checkpoint) { st.checkpoint = st.obs.length; measureWindow(st); }
  };

  const isCommon = (posPrior, w) => { const c = posPrior.forms[w]; if (!c) return false; const t = total(c); return t >= 3 && (c.NOUN ?? 0) / t >= 0.7; };

  /** The beings the prefix has earned: nominated at the structural floor, standing earned against the received baseline. */
  const beings = () => {
    const out = [];
    for (const st of states.values()) {
      if (!st.baseline && !rateOf) continue; // no baseline: nothing to earn standing against — typed in gaps()
      const rate = rateOf ? (f) => rateOf(st.language, f) : st.baseline;
      for (const [form, f] of st.forms) {
        if (f.arrivals < ARRIVALS_FLOOR) continue;
        if (!commonNouns && isCommon(st.grammar.posPrior, form)) continue;
        const p0 = rate(form);
        if (!isKeyInMaterial(f.arrivals, st.tokens, p0, { alpha: KEY_ALPHA })) continue;
        out.push({
          surface: form, mentions: f.arrivals, sentences: f.sents.size, language: st.language,
          lane: "heard-nominal", standing: "keyed", alpha: KEY_ALPHA,
          unseen: st.grammar.posPrior.forms[form] ? 0 : f.arrivals,
          presence: st.activation ? Number(st.activation.activationOf(form).toFixed(4)) : null,
          refires: f.refires,
          gaps: f.unsettled ? ["class_unsettled"] : [],
          evidence: f.occ,
        });
      }
    }
    return out.sort((a, b) => b.mentions - a.mentions);
  };

  /** CONTROLS (not part of reading): every nominated form with its arrivals, standing NOT applied — isolates what the standing test adds. */
  const nominated = () => {
    const out = [];
    for (const st of states.values()) for (const [form, f] of st.forms) if (f.arrivals >= ARRIVALS_FLOOR) out.push({ surface: form, mentions: f.arrivals, language: st.language });
    return out.sort((a, b) => b.mentions - a.mentions);
  };
  /** CONTROLS: raw token frequency, no prior at all. */
  const rawTop = () => {
    const out = [];
    for (const st of states.values()) for (const [form, n] of st.counts) if (n >= ARRIVALS_FLOOR) out.push({ surface: form, mentions: n, language: st.language });
    return out.sort((a, b) => b.mentions - a.mentions);
  };

  /** Typed gaps with denominators: reached-and-undecided is not never-read (S22). */
  const report = () => ({
    sentencesRead: read,
    languageUnheard: gaps.language_unheard,
    languages: [...states.values()].map((st) => ({
      language: st.language, sentences: st.sentences, tokens: st.tokens, alpha: KEY_ALPHA, fold_unit: "sentence",
      window: st.window ?? null, windowBasis: st.windowBasis, windowGap: st.windowGap,
      gap: st.baseline || rateOf ? null : "no_baseline", refused: Object.fromEntries(st.refused),
    })),
  });

  return { add, beings, nominated, rawTop, report, get read() { return read; }, presenceOf: (language, form) => states.get(language)?.activation?.activationOf(form) ?? 0 };
}

export { gammaFor };
