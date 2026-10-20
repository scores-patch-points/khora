// opencode-summary.mjs — A SUMMARY IS AN ABSTRACTION OVER SEVERAL SOURCE SENTENCES, so it is checked as one.
//
// The per-claim judge (The Fold's falsifier) asks whether ONE source sentence states a claim. A summary sentence is true when
// SEVERAL do, jointly ("the council approved a smaller version after a debate over jobs and the oyster beds" rests on four
// sentences), and a summary is also answerable for what it LEAVES OUT. Three readings, all mechanical, none by a model:
//
//   DERIVED    the smallest set of source sentences whose UNION carries the claim: its content words, every figure, every name,
//              the same polarity. Shown with the sentences it abstracts (many-to-one), addressed in the passages' own bytes.
//   ADDED      what no union reaches: the claim's own words the source never says ("federal grant", "governor"). Unsupported,
//              with the words that are the addition named.
//   LEFT OUT   beings the material individuates (referents, not tokens) that it speaks of more than once and the summary never
//              names, and figures it states that the summary never carries. Disclosed as a list — a summary may choose to leave
//              things out — never a verdict.
//
// What this does NOT do (named, not hidden): a KIND claim ("both opponents were councillors", "stakeholders") needs the kinds the
// material's referents share — terrain induction over their features (khora/native/kernel/terrain-induction.js) — and is not wired;
// such a sentence reads as added when its words are not the source's. Declared constants below say so and name their giver.
import { splitSentences } from "./native/adapters/text/spans.js";

// Declared, not measured (the author, 2026-10-19; the same status as the judge's own thresholds): a union carries a claim when it
// covers this share of the claim's content words; at most this many source sentences are joined; a being is "spoken of" at this count.
export const SUMMARY = Object.freeze({ cover: 0.75, maxSources: 4, minContent: 2, spokenOf: 2, maxLeftOut: 6, minWords: 20 });

const STOP = new Set("the and for with from that this was were has have had its into onto upon over under about after before which when where what who whom whose their they them then than also been being such these those there here very more most much many some any each every both either neither not but nor yet will would shall should may might must can could".split(" "));
const NEG = /\b(not|never|no|none|neither|nor|without|cannot|n't|rejected|denied|refused|declined|withdrew|withdrawn)\b/i;
const NUMW = new Set("two three four five six seven eight nine ten eleven twelve".split(" "));

const words = (t) => String(t ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
// A shallow common stem: enough for approved/approve/approval, expand/expansion; the same crude fold the judge declares.
const stem = (w) => w.replace(/(?:ational|ations|ation|ings|ing|ions|ion|ness|ments|ment|ed|es|s|ly|al)$/u, "").slice(0, 6);
const contentStems = (t) => [...new Set(words(t).filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w) && !NUMW.has(w)).map(stem))];
const FIGURE = /\b\d[\d,.]*(?:\s+(?:to|of|-)\s+\d[\d,.]*)?(?:\s+(?:million|billion|thousand|percent|per cent|dollars|years?|jobs))?/gi;
const figuresOf = (t) => [...new Set((String(t).match(FIGURE) ?? []).map((x) => x.replace(/[,.]+$/, "").replace(/(\d),(\d)/g, "$1$2").replace(/\s+/g, " ").trim()))];
const namesOf = (t) => [...new Set((String(t).match(/(?<=[^.!?]\s)\p{Lu}[\p{L}'-]{2,}/gu) ?? []).map((n) => n.toLowerCase()))];

/** The summary-shaped ask or answer: the ask says so, or the answer is a small fraction of what it was handed. */
export function isSummary(ask, answer, passages) {
  // nothing handed to it, nothing to summarize
  if (!passages.length) return false;
  // a word inside a file name ("opencode-summary.mjs") is a name, not the ask
  const words = String(ask ?? "").replace(/\S*\.[A-Za-z0-9]{1,6}\b/g, " ");
  if (/\b(summar(?:y|ise|ize|ised|ized)|tl;?dr|recap|overview|in brief|gist|abstract|key points|main points|what happened)\b/i.test(words)) return true;
  const have = passages.reduce((n, p) => n + words(p.text).length, 0);
  const said = words(answer).length;
  // An eight-word note after a big read ("I'll read the file.") is not a summary of it: the shape needs some substance.
  return have >= 120 && said >= SUMMARY.minWords && said / have <= 0.25 && passages.length <= 3;
}

/** The source's sentences, each with its passage and line (the passage's own address). */
export function sourceSentences(passages) {
  const out = [];
  for (const p of passages) {
    const text = String(p.text ?? "");
    let at = 0;
    for (const raw of splitSentences(text)) {
      const s = String(typeof raw === "string" ? raw : raw?.text ?? "").trim();
      if (s.length < 12) continue;
      const i = text.indexOf(s, at);
      if (i >= 0) at = i + s.length;
      const before = i < 0 ? "" : text.slice(0, i);
      const col = before.length - (before.lastIndexOf("\n") + 1) + 1;
      out.push({ text: s, source: p.name, ref: `${p.name}:${before.split("\n").length}${col > 1 ? `:${col}` : ""}`, stems: new Set(contentStems(s)), figures: new Set(figuresOf(s)), names: new Set(namesOf(s)), neg: NEG.test(s) });
    }
  }
  return out;
}

/** The smallest union of source sentences that carries the claim, or the best it can do with what is missing. */
export function deriveClaim(claim, sources) {
  const want = contentStems(claim);
  const figs = figuresOf(claim);
  const names = namesOf(claim);
  if (want.length < SUMMARY.minContent) return null;
  const chosen = [];
  const covered = new Set();
  while (chosen.length < SUMMARY.maxSources) {
    let best = null, gain = 0;
    for (const s of sources) {
      if (chosen.includes(s)) continue;
      const g = want.filter((k) => s.stems.has(k) && !covered.has(k)).length + figs.filter((f) => s.figures.has(f)).length * 0.5;
      if (g > gain) { best = s; gain = g; }
    }
    if (!best || gain < 1) break;
    chosen.push(best);
    for (const k of want) if (best.stems.has(k)) covered.add(k);
    if (covered.size / want.length >= SUMMARY.cover) break;
  }
  const missingStems = want.filter((k) => !covered.has(k));
  const original = (k) => words(claim).find((w) => stem(w) === k) ?? k;
  const missing = missingStems.map(original);
  const coverage = covered.size / want.length;
  const figsMissing = figs.filter((f) => !chosen.some((s) => s.figures.has(f)));
  const namesMissing = names.filter((n) => !chosen.some((s) => s.names.has(n) || [...s.stems].some((k) => k === stem(n))));
  // polarity: a negated claim needs a negated source in the union, and an affirmed claim must not rest on a union that is only negated
  const claimNeg = NEG.test(claim);
  const polarityOk = chosen.length === 0 ? true : claimNeg ? chosen.some((s) => s.neg) : chosen.some((s) => !s.neg);
  return { chosen, coverage, missing, figsMissing, namesMissing, polarityOk, want, ok: chosen.length > 0 && coverage >= SUMMARY.cover && !figsMissing.length && !namesMissing.length && polarityOk };
}

const cite = (s) => ({ source: s.source, ref: s.ref, text: s.text.length > 220 ? s.text.slice(0, 217) + "…" : s.text });

/** Re-read the claims of a summary: unsupported ones become derived (with their sources) or named additions. Supported and
 *  contradicted verdicts from the judge stand untouched — a summary may not be derived into a fact the sources contradict. */
export function derive(claims, passages) {
  const sources = sourceSentences(passages);
  return claims.map((c) => {
    if (c.standing !== "unsupported" || !sources.length) return c;
    const d = deriveClaim(c.text, sources);
    if (!d) return c;
    // nothing in the sources shares a word with it: the purest addition
    if (!d.chosen.length) return { ...c, added: true, from: [], why: `nothing in the sources carries it: its words ${d.missing.join(", ")} are not theirs` };
    if (d.ok) {
      return { ...c, standing: "supported", derived: true, from: d.chosen.map(cite), evidence: cite(d.chosen[0]), why: `abstracts ${d.chosen.length} source sentence${d.chosen.length === 1 ? "" : "s"} (${Math.round(d.coverage * 100)}% of its words)`, residue: undefined };
    }
    const added = [d.missing.length ? `its own words the source never says: ${d.missing.join(", ")}` : "", d.figsMissing.length ? `figure ${d.figsMissing.join(", ")} is not in them` : "", d.namesMissing.length ? `${d.namesMissing.join(", ")} is not in them` : "", !d.polarityOk ? "the sources say the opposite way" : ""].filter(Boolean);
    return { ...c, added: true, from: d.chosen.map(cite), why: `the closest source sentences leave it uncarried: ${added.join("; ")}` };
  });
}

/** What the summary leaves out: beings the material speaks of more than once and figures it states, never carried. */
export function leftOut(answer, passages, resolveBeings = () => []) {
  const sources = sourceSentences(passages);
  const mentioned = new Set(resolveBeings(answer));
  const spoken = new Map();
  for (const s of sources) for (const b of new Set(resolveBeings(s.text))) spoken.set(b, (spoken.get(b) ?? 0) + 1);
  const beings = [...spoken.entries()].filter(([b, n]) => n >= SUMMARY.spokenOf && !mentioned.has(b)).sort((a, b) => b[1] - a[1]).slice(0, SUMMARY.maxLeftOut).map(([name, n]) => ({ name, mentions: n }));
  const said = new Set(figuresOf(answer));
  const figures = [];
  for (const s of sources) for (const f of s.figures) if (!said.has(f) && !figures.some((x) => x.figure === f) && !/^(19|20)\d\d$/.test(f) && f.length > 0) figures.push({ figure: f, text: s.text.length > 160 ? s.text.slice(0, 157) + "…" : s.text, ref: s.ref });
  return { beings, figures: figures.slice(0, SUMMARY.maxLeftOut) };
}
