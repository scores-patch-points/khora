// organs/belief-movement.js — a passage is relevant to a question to the extent that admitting it MOVES what the reader believes the
// answer is, and the list of what matters stops where one more passage no longer changes the conclusion.
//
// The user, 2026-10-14: "it either makes what happened less surprising or more surprising, but it doesn't do nothing." That is the
// repo's own definition, not a new one: kernel/bayes-surprise.js measures "how far an observation moves belief, the divergence of the
// posterior from the prior" (zero only if nothing moved; its sign is not a thing — corroboration and contradiction both move it), and
// kernel/activation.js `dmdWindow` is "the shallowest depth at which forgetting everything older no longer changes what the reader
// concludes". This file joins them for one reader and one question. It invents no measure and no constant.
//
//   THE BELIEF   is the reader's distribution over the VALUES the question's slot can take, as the holograph keeps a slot: a Dirichlet
//                over the values seen, symmetric concentration alpha (declared, 1), the unseen kept possible.
//   THE SLOT     is the question's own: the answer type the question admits (a time, a person, a polarity), carried by a passage whose
//                subject is the question's figure and whose predicate is the question's relation. A passage that carries no value for
//                that slot moves nothing about the answer: it is context, and says so.
//   THE ORDER    is greedy by Bayesian surprise: at each step the passage that moves the CURRENT belief most is laid down, then admitted,
//                so a second passage saying the same thing moves less (diminishing returns is the difference window's own premise).
//   THE CUT      is dmdWindow over that order: the shallowest prefix whose conclusion (the modal answer, and whether a rival value is
//                held) equals the conclusion of the whole list. Everything beyond it is context.
//
// WHAT THIS IS NOT. It is not the referent model (entities, links, merges): a passage that would add a link or merge two names moves
// that and not this. The slot is one question's one answer type; a deliberative question ("Should…?") has none and gets an empty list,
// said plainly. Value extraction for a time is the year token, the ladder's own crude YEAR test made explicit.
import { klAdmit } from "../kernel/bayes-surprise.js";
import { dmdWindow } from "../kernel/activation.js";

const LN2 = Math.LN2;

/** The four-digit year tokens of a text (1000-2999), by character class, never a pattern guess over meaning. */
export function yearsIn(text) {
  const out = [];
  let cur = "";
  for (const ch of `${String(text ?? "")} `) {
    if (ch >= "0" && ch <= "9") { cur += ch; continue; }
    if (cur.length === 4 && (cur[0] === "1" || cur[0] === "2")) out.push(cur);
    cur = "";
  }
  return [...new Set(out)];
}

/** The values a passage carries for the question's slot. `c` = { admits, actor, relation, sentence, subj, polarity }. */
export function valuesFor(admits, c) {
  // A "who" question is answered by the SUBJECT of the relation, so the question's figure is not required to be that subject
  // (amendment 1, GRAIN-R5-PREREG.md: run 1 required it, which made every person question empty by construction).
  if (admits === "person") return c.relation && c.subj ? [String(c.subj)] : [];
  if (!c.actor || !c.relation) return [];
  if (admits === "time") return yearsIn(c.sentence);
  if (admits === "proposition" || admits === "polar") return [c.polarity === "-" ? "not" : "yes"];
  return [];
}

/** Bayesian surprise, in bits, of admitting `value` into a slot with `counts` (Map value → count). The holograph's own arithmetic. */
export function bitsOf(counts, value, alpha = 1) {
  let N = 0; for (const c of counts.values()) N += c;
  const K = counts.size + (counts.has(value) ? 0 : 1) + 1;
  const bv = (counts.get(value) ?? 0) + alpha, B = N + alpha * K;
  return klAdmit(bv, B) / LN2;
}
const admitTo = (counts, values) => { for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1); };
// The modal value, or null when two or more values tie for the lead: a tie is "no single answer yet", never an alphabetical pick
// (amendment 2, GRAIN-R5-PREREG.md: run 2 broke ties by string order, which made the answer flip on a 1-1 count).
const modeOf = (counts) => {
  let best = null, bc = 0, tied = false;
  for (const [v, c] of counts) { if (c > bc) { best = v; bc = c; tied = false; } else if (c === bc && c > 0) tied = true; }
  return tied ? null : best;
};
const conclusion = (counts) => ({ answer: modeOf(counts), rival: [...counts.keys()].length > 1 });
const probOf = (counts, v, alpha = 1) => { let N = 0; for (const c of counts.values()) N += c; const K = counts.size + (counts.has(v) ? 0 : 1) + 1; return ((counts.get(v) ?? 0) + alpha) / (N + alpha * K); };

/**
 * rankByBelief({ held, passages, alpha }) → { slot, before, order, context, window, after }
 *   held:     [{ id, values }]    what the reader already holds, as slot values
 *   passages: [{ id, values }]    the passages new to them
 * `order` is the passages that move the belief, greedily, each with the bits it moved, the answer before/after and the direction
 * (`strengthens` / `rival` / `changes`); `context` is the passages that carry no value for the slot (moves exactly nothing).
 */
export function rankByBelief({ held = [], passages = [], alpha = 1 } = {}) {
  const counts = new Map();
  for (const h of held) admitTo(counts, h.values ?? []);
  const before = { ...conclusion(counts), distribution: [...counts].map(([v, c]) => ({ value: v, count: c })) };
  const carrying = passages.filter((p) => (p.values ?? []).length);
  const context = passages.filter((p) => !(p.values ?? []).length).map((p) => p.id);
  const pool = carrying.map((p) => ({ ...p }));
  const order = [];
  const states = [];
  while (pool.length) {
    let bi = -1, bb = -Infinity;
    pool.forEach((p, i) => {
      const tmp = new Map(counts); let bits = 0;
      for (const v of p.values) { bits += bitsOf(tmp, v, alpha); admitTo(tmp, [v]); }
      if (bits > bb) { bb = bits; bi = i; }
    });
    const p = pool.splice(bi, 1)[0];
    const was = conclusion(counts);
    const pBefore = probOf(counts, was.answer, alpha);
    admitTo(counts, p.values);
    const now = conclusion(counts);
    const pAfter = probOf(counts, was.answer, alpha);
    order.push({ id: p.id, values: p.values, bits: bb, answerBefore: was.answer, answerAfter: now.answer, direction: now.answer !== was.answer ? "changes" : p.values.every((v) => v === was.answer) ? "strengthens" : "rival", probOfAnswer: { before: pBefore, after: pAfter } });
    states.push(now);
  }
  // The cut: dmdWindow over the order, restricted to prefixes, conclusion = the modal answer and whether a rival is held.
  const derive = (prefix) => { const c = new Map(); for (const h of held) admitTo(c, h.values ?? []); for (const o of prefix) admitTo(c, o.values); return conclusion(c); };
  const depths = Array.from({ length: order.length + 1 }, (_, i) => i);
  const w = dmdWindow(order, derive, { candidates: depths, restrict: (obs, depth) => obs.slice(0, depth) });
  const k = w.window ?? order.length;
  return { before, order, context, window: k, beyondWindow: order.slice(k).map((o) => o.id), after: { ...conclusion(counts), distribution: [...counts].map(([v, c]) => ({ value: v, count: c })) }, dmd: w };
}
