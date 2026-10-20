// opencode-identity.mjs — WHICH ONE ARE WE TALKING ABOUT. A name the answer uses only NOMINATES candidates (Wikidata's
// search, ambiguity kept: "Curie" is a unit, a family, a crater, two Nobel laureates). IDENTITY decides which one the
// text means, by consequence, never by the name matching:
//
//   1. the holographic identity test (adapters/text/corpus-identity.js → identity-induction): the text's being and each
//      candidate's own reading (its Wikipedia intro), each as occurrences whose features are the other names and the
//      content words around it. BOUND for exactly one candidate settles it.
//   2. when the reading is too thin for that test (a typed gap there, never "different"), the declared consequence
//      overlap: which candidate's own words and dates carry the text's own words and dates — the years the text states
//      against the candidate's Wikidata birth/death and its intro. It binds only with a clear margin.
//   3. otherwise AMBIGUOUS, disclosed with the candidates — and the falsifier judges nothing against a guess.
import { wikidataSearch, wikidataEntities, wikipediaIntros } from "./opencode-wiki.mjs";
import { makeSameBeing } from "./native/adapters/text/corpus-identity.js";

const STOP = new Set("the and for with from that this was were has have had his her she him they them their its into after before which who whom when where also been being than then there here about over under such these those other most more some only first".split(" "));
const key = (w) => w.toLowerCase().slice(0, 5);
const contentKeys = (t, drop = []) => {
  const dropK = new Set(drop.flatMap((d) => d.toLowerCase().split(/\s+/)).map(key));
  return [...new Set(String(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w)).map(key).filter((k) => !dropK.has(k)))];
};
const yearsIn = (t) => [...new Set((String(t).match(/\b1\d{3}\b|\b20\d{2}\b/g) ?? []).map(Number))];
const sentencesOf = (t) => String(t).match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter((s) => s.length > 3) ?? [];

/** One occurrence's features, the way the identity evals build them: other names (w:) and content words (v:), hop 1. */
function featuresOf(sentence, name) {
  const own = new Set(name.toLowerCase().split(/\s+/));
  const names = (sentence.match(/\b\p{Lu}[\p{L}-]{2,}\b/gu) ?? []).filter((n) => !own.has(n.toLowerCase())).map((n) => ({ f: `w:${n}`, hop: 1 }));
  const words = contentKeys(sentence, [name]).map((k) => ({ f: `v:${k}`, hop: 1 }));
  return [...names, ...words];
}

/** The holographic identity test between the text's being and each candidate. Exactly one BOUND → that one. */
function inductionPick(name, textSentences, candidates, intros) {
  try {
    const record = new Map();
    record.set("text", textSentences.map((s) => featuresOf(s, name)));
    for (const c of candidates) {
      const intro = intros.get(c.enwiki) ?? "";
      const occ = sentencesOf(intro).map((s) => featuresOf(s, name)).filter((o) => o.length);
      if (occ.length) record.set(c.qid, occ);
    }
    if (record.size < 2) return { pick: null, reason: "no candidate has a reading to compare" };
    const judge = makeSameBeing().prepare(record);
    const verdicts = candidates.filter((c) => record.has(c.qid)).map((c) => ({ qid: c.qid, v: judge("text", c.qid) }));
    const bound = verdicts.filter((x) => x.v.same);
    if (bound.length === 1) return { pick: bound[0].qid, reason: bound[0].v.basis, verdicts };
    return { pick: null, reason: bound.length ? "more than one candidate bound" : verdicts[0]?.v.reason ?? "not bound", verdicts };
  } catch (e) {
    return { pick: null, reason: `identity test unavailable (${e.message})` };
  }
}

/**
 * whoIs(name, { text, deadline }) → { verdict: "bound" | "ambiguous" | "none" | "skipped", entity?, basis, candidates }
 * `text` is everything the turn says about the being (the answer's sentences and the material's), the context the
 * candidates are judged against.
 */
export async function whoIs(name, { text = "", person = false, deadline = Infinity, fetchImpl } = {}) {
  const opts = { deadline, fetchImpl };
  const found = await wikidataSearch(name, opts);
  if (found.skipped) return { verdict: "skipped", name, basis: found.why, candidates: [] };
  if (!found.found) return { verdict: "none", name, basis: found.why ?? "Wikidata has no item under this name", candidates: [] };
  const ents = await wikidataEntities(found.candidates.map((c) => c.qid), opts);
  if (!ents.ok) return { verdict: ents.skipped ? "skipped" : "none", name, basis: ents.why, candidates: found.candidates };
  // KIND, from the text itself: a being the text calls "she"/"he" is a person, so only a human (P31 = Q5) can be it.
  // A unit, a family name or a ferry that shares the name is not a candidate for who the text means.
  const candidates = ents.entities.filter((e) => !/disambiguation page|Wikimedia list/i.test(e.description ?? "") && (!person || e.instanceOf.includes("Q5")));
  if (!candidates.length) return { verdict: "none", name, basis: person ? "no human among the items this name nominates (the text refers to the being as a person)" : "only disambiguation items", candidates: ents.entities.map(({ qid, label, description }) => ({ qid, label, description })) };
  const intros = (await wikipediaIntros(candidates.map((c) => c.enwiki).filter(Boolean), opts)).intros;

  const textSentences = sentencesOf(text);
  const ctxKeys = contentKeys(text, [name]);
  const ctxYears = yearsIn(text);
  const scored = candidates.map((c) => {
    const own = `${c.label ?? ""} ${c.description ?? ""} ${(c.aliases ?? []).join(" ")} ${intros.get(c.enwiki) ?? ""}`;
    const theirs = new Set(contentKeys(own, [name]));
    const shared = ctxKeys.filter((k) => theirs.has(k));
    const theirYears = new Set([...c.born.map((b) => b.year), ...c.died.map((d) => d.year), ...yearsIn(own)].filter(Boolean));
    const years = ctxYears.filter((y) => theirYears.has(y));
    const score = (ctxKeys.length ? shared.length / ctxKeys.length : 0) + 0.25 * years.length;
    return { ...c, intro: intros.get(c.enwiki) ?? null, score: Number(score.toFixed(3)), shared: shared.length, years };
  }).sort((a, b) => b.score - a.score);
  const listed = scored.map(({ qid, label, description, score, years, enwiki }) => ({ qid, label, description, score, years, enwiki }));

  const ind = inductionPick(name, textSentences, scored, intros);
  if (ind.pick) {
    const entity = scored.find((c) => c.qid === ind.pick);
    return { verdict: "bound", name, entity, basis: `identity-induction: ${ind.reason}`, candidates: listed };
  }
  const [top, second] = scored;
  if (top && top.score >= 0.12 && (!second || top.score >= 1.5 * second.score + 0.02)) {
    return { verdict: "bound", name, entity: top,
      basis: `consequence: carries ${top.shared} of the text's words${top.years.length ? ` and its years ${top.years.join(", ")}` : ""}, against ${second ? `${second.score} for the next (${second.label})` : "no other candidate"} (the identity test: ${ind.reason})`,
      candidates: listed };
  }
  return { verdict: "ambiguous", name, basis: `no candidate carries the text clearly (top ${top?.score ?? 0}, next ${second?.score ?? 0}); the identity test: ${ind.reason}`, candidates: listed };
}
