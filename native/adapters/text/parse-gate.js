// parse-gate.js — LAYER 3's high gate (native/the-fold/spiral-contract.js: low sets possibility, high sets probability), for a UD parse.
//
// Layer 2 keeps possibilities: every word has its tagger's best reading and its runner-up (on UD_English-EWT test the gold tag is in that pair
// 98.5% of the time, against 94.3% for the best alone; 1,029 of 1,247 tagging errors are confident ones, so no local margin can find them).
// Layer 3 parses the best readings and asks a STRUCTURAL question of the tree, never a tuned threshold:
//   no-predicate     a declarative sentence of four or more words whose tree has no verb or copula predicate
//   nominal-root     the root is a noun, proper noun or adjective with no copula, and a word that could be a verb sits in the sentence
//   bad-subject      a subject slot (nsubj, nsubj:pass) held by a word that cannot name a being (ADP, ADV, CCONJ, SCONJ, DET, PART, PUNCT)
//   bad-object       an object slot (obj, iobj) held by such a word
//   verb-modifier    a word whose runner-up is VERB hangs as a modifier (amod, compound, nmod) of a noun in a sentence with no verb
// A failed gate names the words it implicates; the revision swaps ONE implicated word to its runner-up reading and re-parses, word by word,
// nearest the failure first, within a budget. The revision is kept only if it passes the gate (or fails fewer checks); else the greedy parse
// stands and the failure is reported, never hidden. Language-neutral: it reads UD relations and UPOS only.
//
// MEASURED 2026-10-21, and NOT wired: on UD_English-EWT test gold trees fail these checks about as often as greedy parses (nominal-root 74 vs
// 80, no-predicate 61 vs 63, verb-modifier 31 vs 58), so a tree-shape gate cannot tell a wrong parse from a right one in web text; revising
// through it moved UAS 84.52 → 84.40 (20 sentences better, 36 worse). grammar-en.js's claimsOfGated (the gate one layer up, on claims) never
// fired on the meaning sets. Kept as the measured negative, so the next gate is built from the layer the errors are in.
import { analyse, tagWithMargins } from "./ud-parser.js";

const BEING = /^(NOUN|PROPN|PRON|NUM|X|SYM|ADJ)$/;          // what can fill a subject or object slot (ADJ: "the poor", NUM: "two of them")
const NOT_BEING = /^(ADP|ADV|CCONJ|SCONJ|DET|PART|PUNCT|INTJ)$/;
const isPred = (r, rows) => /^(VERB|AUX)$/.test(r.upos) || rows.some((c) => c.head === r.id && c.deprel === "cop");

/** gateOf(rows, readings?) → failed checks, each { kind, ids: [implicated word ids] }; [] passes */
export function gateOf(rows, readings = null) {
  const out = [], words = rows.filter((r) => r.upos !== "PUNCT"), declarative = /[.!]$/.test(rows.at(-1)?.form ?? "") && words.length >= 4;
  const hasPred = rows.some((r) => isPred(r, rows));
  const couldVerb = (r) => readings?.runnerUp?.[r.id - 1] === "VERB" || readings?.runnerUp?.[r.id - 1] === "AUX";
  if (declarative && !hasPred) out.push({ kind: "no-predicate", ids: rows.filter((r) => couldVerb(r)).map((r) => r.id) });
  const root = rows.find((r) => r.head === 0);
  if (root && /^(NOUN|PROPN|ADJ)$/.test(root.upos) && !rows.some((c) => c.head === root.id && c.deprel === "cop") && declarative) {
    const ids = rows.filter((r) => couldVerb(r)).map((r) => r.id);
    if (ids.length) out.push({ kind: "nominal-root", ids });
  }
  for (const r of rows) {
    if (/^nsubj/.test(r.deprel) && NOT_BEING.test(r.upos)) out.push({ kind: "bad-subject", ids: [r.id] });
    if (/^(obj|iobj)$/.test(r.deprel) && NOT_BEING.test(r.upos)) out.push({ kind: "bad-object", ids: [r.id] });
    if (!hasPred && /^(amod|compound|nmod)$/.test(r.deprel) && couldVerb(r)) out.push({ kind: "verb-modifier", ids: [r.id] });
  }
  return out;
}

/** readGated(model, forms, { budget }) → { rows, tags, gate: failed checks of the kept parse, revised: [{ id, from, to }], greedy } */
// Which checks may trigger a revision is MEASURED, not chosen: a check that gold trees fail is a false alarm, not a gate. On UD_English-EWT test
// (2,077 gold trees) no-predicate fails 61 gold trees, bad-subject 15, bad-object 9; nominal-root and verb-modifier fail none. Only those two revise;
// the others are still reported.
export const REVISING = new Set(["nominal-root", "verb-modifier"]);
export function readGated(model, forms, { budget = 8, revising = REVISING } = {}) {
  const first = tagWithMargins(model.tagger, forms, model.lex, model.clusters);
  const greedy = analyse(model, forms, first.tags);
  const g0 = gateOf(greedy, first), live = (g) => g.filter((f) => revising.has(f.kind));
  if (!live(g0).length) return { rows: greedy, tags: first.tags, gate: g0, revised: [], greedy: true };
  // the implicated words, and their neighbours, each with a runner-up to try; of the revisions that clear the revising checks, the one the
  // tagger gives up least for (its own margin between the two readings) is kept: probability chooses among possibilities
  const named = [...new Set(live(g0).flatMap((f) => f.ids))];
  const near = [...new Set(named.flatMap((id) => [id, id - 1, id + 1]))].filter((id) => id >= 1 && id <= forms.length && first.runnerUp[id - 1]);
  let best = { rows: greedy, tags: first.tags, gate: g0, revised: [], cost: Infinity };
  for (const id of near.slice(0, budget)) {
    const allowed = new Map([[id - 1, new Set([first.runnerUp[id - 1]])]]);
    const re = tagWithMargins(model.tagger, forms, model.lex, model.clusters, allowed);
    const rows = analyse(model, forms, re.tags), g = gateOf(rows, re);
    if (live(g).length) continue;
    const cost = first.margins[id - 1];
    if (cost < best.cost) best = { rows, tags: re.tags, gate: g, revised: [{ id, from: first.tags[id - 1], to: re.tags[id - 1], cost: +cost.toFixed(2) }], cost };
  }
  return { ...best, greedy: best.revised.length === 0 };
}
