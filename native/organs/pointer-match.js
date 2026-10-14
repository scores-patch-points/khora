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

/**
 * pointedAtoms(record, { model }) → Map<atomId, { from: indexSpan, via: href, agree: [slot keys], runner_up: n, rival: n }>
 * `record.sources[].index_trail` names the origin hrefs; an origin source is the pinned source whose url/final_url is that href.
 */
export function pointedAtoms(record, { model }) {
  const bySource = new Map();
  for (const a of record.atoms) { if (!bySource.has(a.pinax)) bySource.set(a.pinax, []); bySource.get(a.pinax).push(a); }
  const norm = (u) => String(u ?? "").replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
  const sourceOf = new Map(record.sources.flatMap((s) => [[norm(s.url), s], [norm(s.final_url), s]]).filter(([k]) => k));
  const sentencesOf = (s) => { const seen = new Set(); return (bySource.get(s.id) ?? []).filter((a) => a._sentence && !seen.has(a.span) && seen.add(a.span)); };
  const out = new Map();
  for (const ix of record.sources.filter((s) => s.role === "index")) for (const t of ix.index_trail ?? []) {
    const origins = [...new Set(t.hrefs.map((h) => sourceOf.get(norm(h))).filter((s) => s && s.role !== "index"))];
    if (!origins.length) continue;
    // the footnote marks ("[ 57 ]") are markup the index page put between words, not words (index-source.js marksOf)
    const q = slotsOfSentence(t.text.replace(/\[\s*\d+\s*\]/g, " ").replace(/\s+/g, " ").trim(), t.span, model);
    if (!q.size) continue;
    const originIds = new Set(origins.map((s) => s.id));
    // reported, never gating: the best the index sentence reaches on pages it does NOT point to
    let rival = 0;
    for (const s of record.sources) if (s.role !== "index" && !originIds.has(s.id)) for (const a of sentencesOf(s)) rival = Math.max(rival, overlap(q, slotsOfSentence(a._sentence, a.span, model)).length);
    for (const s of origins) {
      const scored = sentencesOf(s).map((a) => ({ a, agree: overlap(q, slotsOfSentence(a._sentence, a.span, model)) })).sort((x, y) => y.agree.length - x.agree.length);
      const top = scored[0];
      if (!top || top.agree.filter((k) => !k.startsWith("anchor:")).length < 2 || (scored[1] && scored[1].agree.length === top.agree.length)) continue;
      const prior = out.get(top.a.id);
      if (!prior || prior.agree.length < top.agree.length) out.set(top.a.id, { from: t.span, via: s.final_url ?? s.url, agree: top.agree, runner_up: scored[1]?.agree.length ?? 0, rival });
    }
  }
  return out;
}
