// organs/pointer-match.js — an index sentence is a QUERY for its origin: match it to the origin page's sentence by typed POS slots.
//
//   NL sentence → the parser's POS/dependency slots (claim-realize.js claimFromSentence: predicate, agent, patient, obliques, anchors)
//   → compared slot to slot in the language-neutral shape (role, UPOS, lemma) → the origin sentence that carries the index claim.
//
// The user, 2026-10-14: "be sure you're making full use of the POS slots, NL to specific POS to EOT and back". A bag of shared words
// cannot tell "the Senate passed the bill" from "the bill passed the Senate"; a slot can. Roles are VOICE-NORMALISED (a passive's
// subject is its patient), so the same event stated active in one page and passive in another still matches.
//
// THE PAGE IS GIVEN BY THE MARKUP; THE SENTENCE IS NOT. The footnote already names the origin page, so the question is only which
// sentence of THAT page carries the claim. The born null is therefore that page's own other sentences: a sentence is "pointed" only
// when it is the UNIQUE best on typed slots (a tie is no match) and the agreement includes at least TWO role slots (predicate, agent, patient, oblique): a verb alone says
// only the verb, and names and numbers alone say nothing about what happened. The best agreement of pages the index
// does NOT point to is reported as `rival`, not used as a gate: measured on Permanent DST, same-topic pages carry the same slots
// (CALLIMACHUS.md §15), so a cross-page null could never be beaten and would only have said "this topic is one topic".
import { claimFromSentence } from "./claim-realize.js";

const head = (claim, span) => (span ? claim.rows.find((r) => r.id === span.id) ?? null : null);
const key = (role, r) => `${role}:${r.upos}:${String(r.lemma ?? r.form).toLowerCase()}`;

/** The typed slot fillers of a claim: a Set of "role:UPOS:lemma" keys, roles voice-normalised. */
export function slotsOf(claim) {
  const out = new Set();
  if (!claim || !claim.rows) return out;
  out.add(key("pred", { upos: "VERB", lemma: claim.pred.lemma }));
  const passive = claim.voice === "passive";
  // A passive's agent is its "by"-oblique (UD obl with a case marker "by"); it fills the same slot an active subject does.
  const byAgent = passive ? (claim.obls ?? []).find((o) => claim.rows.some((r) => r.head === o.id && r.deprel === "case" && r.form.toLowerCase() === "by")) : null;
  const agent = passive ? head(claim, byAgent) : head(claim, claim.subj), patient = passive ? head(claim, claim.subj) : head(claim, claim.obj);
  if (agent) out.add(key("agent", agent));
  if (patient) out.add(key("patient", patient));
  for (const o of claim.obls ?? []) { if (o === byAgent) continue; const h = head(claim, o); if (h) out.add(key("obl", h)); }
  // The anchors (proper names, numbers) of the clause, whichever slot they sit in: they are what a paraphrase must carry.
  for (const r of claim.rows) if ((r.upos === "PROPN" || r.upos === "NUM") && claim.anchors.includes(r.form)) out.add(key("anchor", r));
  return out;
}

const slotsOfSentence = (text, address, model) => {
  try { const c = claimFromSentence(text, address, { model }); return c && c.rows && !c.untrusted ? slotsOf(c) : new Set(); } catch { return new Set(); }
};
const overlap = (a, b) => [...a].filter((k) => b.has(k));

const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const isRole = (k) => !k.startsWith("anchor:");

/**
 * A synthesized index sentence is carried by a SET of origin sentences, not one. Greedy cover of its role slots by the page's sentences
 * (each pick must add a role slot; ties broken by document order), then a born null: the coverage k RANDOM sentences of the same page
 * reach (seeded, `draws` permutations; the convention of the margin null, 199). The set is pointed only when its coverage covers at
 * least two role slots and is not reached by chance (p <= 0.05, the house convention).
 */
export function coverSet(q, sents, { draws = 199, seed = 20261014 } = {}) {
  const want = new Set([...q].filter(isRole));
  if (want.size < 2 || !sents.length) return null;
  const covered = new Set(), chosen = [];
  for (;;) {
    let best = -1, gain = 0;
    sents.forEach((x, i) => { if (chosen.includes(i)) return; const g = [...x.keys].filter((k) => want.has(k) && !covered.has(k)).length; if (g > gain) { gain = g; best = i; } });
    if (best < 0) break;
    chosen.push(best); sents[best].keys.forEach((k) => want.has(k) && covered.add(k));
  }
  if (covered.size < 2) return null;
  const rnd = mulberry(seed), k = chosen.length;
  let ge = 0;
  for (let d = 0; d < draws; d++) {
    const pick = new Set(); while (pick.size < Math.min(k, sents.length)) pick.add(Math.floor(rnd() * sents.length));
    const c = new Set(); for (const i of pick) sents[i].keys.forEach((x) => want.has(x) && c.add(x));
    if (c.size >= covered.size) ge++;
  }
  const p = (ge + 1) / (draws + 1);
  return { chosen, covered: [...covered], wanted: want.size, p, pointed: p <= 0.05 };
}

/**
 * pointedAtoms(record, { model }) → { atoms: Map<atomId, {from, via, agree, set_size, p}>, pages: Map<sourceId, {from, via, covered, p, pointed}> }
 * `record.sources[].index_trail` names the origin hrefs; an origin source is the pinned source whose url/final_url is that href.
 * `pages` is the markup's own witness (the footnote names the page) and is kept whether or not any sentence set is found.
 */
export function pointedAtoms(record, { model, draws = 199, seed = 20261014 }) {
  const bySource = new Map();
  for (const a of record.atoms) { if (!bySource.has(a.pinax)) bySource.set(a.pinax, []); bySource.get(a.pinax).push(a); }
  const norm = (u) => String(u ?? "").replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
  const sourceOf = new Map(record.sources.flatMap((s) => [[norm(s.url), s], [norm(s.final_url), s]]).filter(([k]) => k));
  const sentencesOf = (s) => { const seen = new Set(); return (bySource.get(s.id) ?? []).filter((a) => a._sentence && !seen.has(a.span) && seen.add(a.span)); };
  const atoms = new Map(), pages = new Map();
  for (const ix of record.sources.filter((s) => s.role === "index")) for (const t of ix.index_trail ?? []) {
    const origins = [...new Set(t.hrefs.map((h) => sourceOf.get(norm(h))).filter((s) => s && s.role !== "index"))];
    if (!origins.length) continue;
    for (const s of origins) if (!pages.has(s.id)) pages.set(s.id, { from: t.span, via: s.final_url ?? s.url, covered: [], p: null, pointed: false });
    // the footnote marks ("[ 57 ]") are markup the index page put between words, not words (index-source.js marksOf)
    const q = slotsOfSentence(t.text.replace(/\[\s*\d+\s*\]/g, " ").replace(/\s+/g, " ").trim(), t.span, model);
    if (!q.size) continue;
    for (const s of origins) {
      const cands = sentencesOf(s), sents = cands.map((a) => ({ a, keys: slotsOfSentence(a._sentence, a.span, model) }));
      const r = coverSet(q, sents, { draws, seed });
      if (!r) continue;
      const prev = pages.get(s.id);
      if (prev.p == null || r.p < prev.p) pages.set(s.id, { ...prev, from: t.span, covered: r.covered, p: r.p, pointed: r.pointed });
      if (!r.pointed) continue;
      for (const i of r.chosen) {
        const a = sents[i].a, mine = sents[i].keys, agree = r.covered.filter((k) => mine.has(k));
        const old = atoms.get(a.id);
        if (!old || old.agree.length < agree.length) atoms.set(a.id, { from: t.span, via: s.final_url ?? s.url, agree, set_size: r.chosen.length, p: r.p });
      }
    }
  }
  return { atoms, pages };
}
