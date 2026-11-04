// adapters/text/attention-traps.js — THE BINDER'S TRAP ERRORS (2026-11-04), judged from the reader's own structure.
//
// attention-binder.js binds "It" and "The <noun>" to the attended being, the one the document has been about. It is wrong when the sentence
// instead continues a thing the PREVIOUS sentence has just named, which the cast either cannot hold ("It" after "… a message.") or holds
// under another being than the attended one. This organ keeps every binding the binder made and re-reads each against that previous
// sentence, with measured evidence only; a binding it doubts becomes a typed gap, never a different guess.
// EARNED, NEVER TYPED: no noun, kind or phrase is typed here. The classes read are the received closed classes of priors.js (determiners,
// clause openers, coordinators, copula and auxiliary forms), the cast's own mentions, and the bytes of the text before the sentence.
//
//   bindTraps(sentences, mentions, options) → bindAttended's result; options.traps = false returns the base call. Each binding the
//   evidence overturns moves to `gaps` with reason `trap_*` and the measured evidence in `evidence`.
import { bindAttended } from "./attention-binder.js";
import { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, ANAPHORIC_PRONOUNS, CLAUSE_OPENERS, CLAUSE_COORDINATORS, AUXILIARY_VERBS, NEUTER_THIRD_PERSON, POSSESSIVE_DETERMINERS } from "./priors.js";
import { COPULA_FORMS } from "./phasepost.js";

export const CELL = Object.freeze({ op: "CON", grain: "Figure" });
const TOKEN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const wordsOf = (text) => [...text.matchAll(TOKEN)].map((m) => ({ w: m[0], i: m.index, end: m.index + m[0].length }));
const isCapital = (w) => /^\p{Lu}/u.test(w);
const stem = (w) => { const x = w.toLowerCase().replace(/['’]s$/, ""); return x.length > 3 && x.endsWith("s") && !x.endsWith("ss") ? x.slice(0, -1) : x; };
const closed = (w) => { const l = w.toLowerCase(); return DEFINITE_DETERMINERS.has(l) || INDEFINITE_DETERMINERS.has(l) || POSSESSIVE_DETERMINERS.has(l) || CLAUSE_OPENERS.has(l) || CLAUSE_COORDINATORS.has(l) || AUXILIARY_VERBS.has(l) || COPULA_FORMS.has(l) || NEUTER_THIRD_PERSON.has(l) || ANAPHORIC_PRONOUNS.has(l); };

/** The noun phrases a unit opens with an indefinite determiner, each as { at, words } (the run of up to three words after the determiner, ended by punctuation, a capital or a closed class). */
export function indefiniteNPs(text) {
  const toks = wordsOf(text); const out = [];
  for (let k = 0; k < toks.length; k++) {
    if (!INDEFINITE_DETERMINERS.has(toks[k].w.toLowerCase())) continue;
    const run = [];
    for (let j = k + 1; j < toks.length && run.length < 3; j++) {
      if (/[,;:.()]/.test(text.slice(toks[j - 1].end, toks[j].i)) || isCapital(toks[j].w) || closed(toks[j].w)) break;
      run.push(toks[j]);
    }
    if (run.length) out.push({ at: toks[k].i, end: run[run.length - 1].end, words: run.map((t) => stem(t.w)) });
  }
  return out;
}

export function bindTraps(sentences, mentions, options = {}) {
  const { traps = false, topicShare = null, ...base } = options;
  const out = bindAttended(sentences, mentions, base);
  if (traps === false) return out;
  if (traps !== true) throw new TypeError("bindTraps: traps is true or false");
  if (!Number.isFinite(topicShare) || topicShare <= 0 || topicShare > 1) throw new TypeError("bindTraps: topicShare is declared — the share of the most-named candidate's weight a bound being must carry, in (0, 1]");
  const { sents, kept, candidates } = out.context;
  const unitOf = new Map(sents.map((s) => [s.order, s]));
  const mentionsIn = (s) => kept.filter((m) => m.start >= s.offset && m.end <= s.offset + s.text.length && candidates.has(m.ref)).sort((a, b) => a.start - b.start);
  const keep = [];
  for (const b of out.bindings) {
    const u = unitOf.get(b.sentenceOrder); const p = unitOf.get(b.sentenceOrder - 1);
    const f = b.kind === "name" ? { prev: false } : featuresOf(b, u, p, { mentionsIn, sents });
    const over = overturn(b, u, f, topicShare);
    if (!over) { keep.push(b); continue; }
    const { sentenceOrder, surface, at, kind } = b;
    out.gaps.push({ sentenceOrder, surface, at, kind, reason: over.reason, top: b.referentId, activation: b.activation, margin: b.margin ?? null, evidence: over.evidence, detail: over.detail });
  }
  out.bindings.length = 0; out.bindings.push(...keep);
  out.gaps.sort((a, b) => a.at[0] - b.at[0]);
  return out;
}

/** The evidence that overturns one binding, or null. Each rule reads the measured structure in `f` (featuresOf) and the unit's own words. */
export function overturn(b, u, f, topicShare) {
  if (b.kind === "name") return null;
  // EXPLETIVE OR CLEFT: a complementizer within the first words after "it", in its clause, whatever verb stands between ("It seems likely that…")
  if (b.kind === "pronoun" && b.surface.toLowerCase() === "it") {
    const rest = u.text.slice(b.at[1] - u.offset); const stop = /[,;:.]/.exec(rest); const clause = stop ? rest.slice(0, stop.index) : rest;
    const ws = wordsOf(clause).slice(0, 4);
    if (ws.some((w) => w.w.toLowerCase() === "that")) return { reason: "trap_expletive_or_cleft", evidence: { words: ws.map((w) => w.w) }, detail: "a complementizer follows within the pronoun's clause: the pronoun has no referent" };
  }
  if (!f.prev) return null;
  // THE BOUND BEING MUST BE THE ONE THE DOCUMENT HAS BEEN ABOUT: a being named a small share as often as the most-named candidate is a thing the text came to
  // along the way (a message, a part, an earlier building), not what an "it" or a definite description continues
  if (f.share !== null && f.share < topicShare) return { reason: "trap_not_topic", evidence: { share: f.share }, detail: `the bound being was named ${(f.share * 100).toFixed(0)}% as often as the most-named candidate` };
  // TIED CANDIDATES: the binder broke a near-tie by the fuller name or the previous subject; two candidates this close are a typed gap
  if (b.via === "attended-tie") return { reason: "trap_close_candidates", evidence: { margin: b.margin }, detail: "the winner led the runner-up by less than the declared margin" };
  // THE PREVIOUS SENTENCE'S SUBJECT IS ANOTHER BEING: the unit's first naming, after at most closed-class words, is a candidate other than the bound one
  if (b.kind === "pronoun" && f.subject && !f.subjectIsW) return { reason: "trap_center_elsewhere", evidence: { subject: f.subject }, detail: "the previous sentence opened on another being" };
  return null;
}

export function featuresOf(b, u, p, { mentionsIn, sents }) {
  if (!p) return { prev: false };
  const pm = mentionsIn(p); const W = b.referentId;
  const wm = pm.filter((m) => m.ref === W);
  const toks = wordsOf(p.text);
  // the subject proxy: the first naming of the unit when only closed-class words (a determiner) come before it
  const first = pm[0]; const before = first ? toks.filter((t) => p.offset + t.end <= first.start) : [];
  const subject = first && before.every((t) => closed(t.w)) ? first.ref : null;
  const lastW = wm.length ? wm[wm.length - 1].end : -1;
  const rivalsAfter = [...new Set(pm.filter((m) => m.ref !== W && m.start >= lastW).map((m) => m.ref))];
  // earlier text: the words the document used before the previous unit
  const seen = new Set(); for (const s of sents) { if (s.order >= p.order) break; for (const t of wordsOf(s.text)) seen.add(stem(t.w)); }
  const nps = indefiniteNPs(p.text).map((n) => ({ ...n, newWords: n.words.filter((w) => !seen.has(w)).length, after: p.offset + n.at >= lastW }));
  // the bound being's weight among the candidates: its mentions before this unit over the most-mentioned candidate's
  const count = new Map(), countBeforePrev = new Map();
  for (const s of sents) { if (s.order >= u.order) break; for (const m of mentionsIn(s)) { count.set(m.ref, (count.get(m.ref) ?? 0) + 1); if (s.order < p.order) countBeforePrev.set(m.ref, (countBeforePrev.get(m.ref) ?? 0) + 1); } }
  const topN = Math.max(0, ...count.values()); const share = topN ? (count.get(W) ?? 0) / topN : null;
  // beings the previous unit introduced: first named there (no mention before it), and named after the bound being's last naming there
  const introduced = [...new Set(pm.filter((m) => !countBeforePrev.has(m.ref)).map((m) => m.ref))];
  const introAfter = introduced.filter((r) => r !== W && pm.some((m) => m.ref === r && m.start >= lastW));
  return { prev: true, share, introduced: introduced.filter((r) => r !== W).length, introAfter: introAfter.length, lastIsW: pm.length > 0 && pm[pm.length - 1].ref === W, wMentioned: wm.length > 0, wMentions: wm.length, subject, subjectIsW: subject === W, rivalsAfter: rivalsAfter.length, rivalNames: rivalsAfter, nps: nps.map((n) => ({ words: n.words, newWords: n.newWords, after: n.after })), pnm: pm.length };
}
