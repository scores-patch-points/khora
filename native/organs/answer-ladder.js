// organs/answer-ladder.js — one research record, answered at growing size, each stage a whole answer, each higher stage re-weighting the
// stage below. No model. Spec: CALLIMACHUS §9 (lenses), with the user's direction of 2026-10-14: "every stage should build a useful answer,
// a more and more useful answer coming the more complexity is added … higher layers recursively adjust the lower layers' probabilities",
// using "the full stack of perception, logos and pathos".
//
//   answerLadder(record, { question, slice, grammar, telling, fixity, seed }) → { stages: [line, paragraph, brief, dossier], ... }
//
// THE THREE LAYERS, each the engine's own organs, each adding log-odds to every candidate claim:
//   PERCEPTION  what is there — the perceivers' record (Pinax fixity, relations, surfaces) read against the question's declared void
//               (organs/question-void.js): does the claim carry the question's figures (SIG anchor), the kind it asks for (INS admits),
//               its relation (CON), its words. Each witness weighs its surprisal against the record's own base rate: −log2(share of
//               candidates that carry it). Nothing is hand-weighted.
//   LOGOS       is it sound — independent chains (Bukhari: log2 of the chain count), standing (AGREE / CONTRADICTED), claim cycles
//               (organs/logos.js, Kelsen's findClaimCycle), and whether the lead actually BINDS: kernel/contest.js adjudicate (Túngara)
//               with margins from a seeded permutation null over the witness columns — never declared by hand.
//   PATHOS      for whom, and how it lands — the experiencer is DECLARED (organs/experiencer.js: the asker, reading this record; pathos for
//               no one is refused); strainOf (organs/pathos.js) turns logos's findings into report / standard / strict, which sets how many
//               sides the answer must carry; camps (Paradigm) are balanced so no side speaks twice before another speaks once; the brief
//               opens on the tension (where pages differ) and closes on the release (what holds); pathosOf reads the draft's rhythm (Murch)
//               and a flatlined draft swaps a candidate for one of different length. The curve is a typed gap (no fold is run).
//
// THE READER (organs/whom.js). Every measure above is taken against a population; the reader decides which. With W = ∅ (the void
// reader, the catalog) the population is the record's candidates, and the ladder is exactly what it was. With a reader, a candidate
// whose span bytes W already holds is HELD (surprisal −log2 1 = 0): it leaves the population and is dropped with its W address. Every
// witness's base rate is then the share among what is new to this reader, the question-word witness also counts W's own units in its
// document frequency, and the margin null is drawn over the same population. A told cell sentence W already holds is not told again.
//
// RECURSION. A stage re-scores EVERY candidate with all layers up to it, so the lead of a bigger answer is chosen by more of the stack;
// each stage reports whether its lead moved and which layer's witnesses moved it.
import { logos } from "./logos.js";
import { parseAddress } from "./pinax.js";
import { chooseVariants } from "./pathos-variants.js";
import { giverOf, giverSlot } from "./giver.js";
export { giverOf };
import { pathosOf, strainOf } from "./pathos.js";
import { requireExperiencer } from "./experiencer.js";
import { adjudicate, CONTEST_VERDICTS } from "../kernel/contest.js";
import { BOUND, CONTRADICTED, CONTESTED, UNBOUND, verdictOfSupport } from "../interpretation/hl.js";
import { realizer } from "./cube-telling.js";
import { lintSentence } from "./prose-laws.js";
import { VOID_READER, heldIn, sentenceHeld, whomStemDf, seamsOf } from "./whom.js";

const log2 = Math.log2;
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const stemOf = (w) => String(w ?? "").toLowerCase().slice(0, 4);
const YEAR = /\b(1[5-9]\d\d|20\d\d)\b/;
const MONTHS = new Set(Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, m, 15))).toLowerCase()));
const hasDate = (t) => YEAR.test(t) || (t.toLowerCase().match(/[a-z]+/g) ?? []).some((w) => MONTHS.has(w));
const hasNumber = (t) => /\b\d[\d,.]*\b/.test(t);
const contentWords = (t) => new Set((String(t).toLowerCase().match(/[\p{L}]{4,}/gu) ?? []));

// ---- the candidates and their witnesses ----------------------------------------------------------------------------------------------

export function candidatesOf(record, fixity) {
  const altered = new Set(Object.entries(fixity ?? {}).filter(([, v]) => v.verdict === "altered").map(([k]) => k));
  const index = new Set((record.sources ?? []).filter((s) => s.role === "index").map((s) => s.id));
  const bySpan = new Map();
  for (const a of record.atoms) {
    if (altered.has(a.pinax)) continue; // perception: a span whose bytes are gone is not a candidate
    if (index.has(a.pinax)) continue; // an encyclopedia is an INDEX: its sentences lead to a source and are never one (index-source.js)
    if (giverOf(a, record).kind === "none") continue; // a claim no one is on record as making is not citable
    const named = a.giver?.surface && !a.giver.pronoun && /^\p{Lu}/u.test(a.giver.surface_verbatim ?? "");
    if (a.why_kind === "quotation" && !named) continue;
    // A claim quoted in a page's own voice is a whole sentence: terminal punctuation, not a list item or a heading.
    if (a.why_kind !== "quotation" && !/[.!?]["”’)\]]*\s*$/.test(String(a._sentence ?? "").trim())) continue;
    // A question asserts nothing: an article's own heading ("Why do critics oppose it?") is not an answer to anyone's question.
    if (/\?["”’)\]]*\s*$/.test(String(a._sentence ?? "").trim())) continue;
    const prior = bySpan.get(a.span);
    if (!prior || (a.why_kind === "quotation" && prior.why_kind !== "quotation")) bySpan.set(a.span, a);
  }
  // The same bytes twice (a page repeating its own sentence) are one candidate, not two readings.
  const byText = new Map();
  for (const a of bySpan.values()) { const k = `${a.why_kind === "quotation" ? "q" : "s"}|${String(a._sentence ?? "").replace(/\s+/g, " ").trim()}`; if (!byText.has(k)) byText.set(k, a); }
  return [...byText.values()];
}

/** The witness table: one column per witness, one boolean or count per candidate. Columns are grouped by layer. */
function witnesses(cands, { question, record, pointed = null, askedSide = null }) {
  const focus = new Set(question.focus ?? []);
  const rel = stemOf(question.reading?.relation?.lemma);
  const qWords = new Set((question.reading?.words ?? []).filter((w) => w.length >= 4).map(stemOf));
  const admits = question.reading?.admits;
  // A named speaker: a quotation's attributed name, or a report whose giver is an admitted figure (a capitalised subject like "A similar
  // version" is not a speaker).
  const named = (a) => (a.why_kind === "quotation" ? !!(a.giver?.surface && !a.giver.pronoun && /^\p{Lu}/u.test(a.giver.surface_verbatim ?? "")) : !!a.giver?.referent);
  const admitsOf = (a) => {
    const t = a._sentence ?? "";
    switch (admits) {
      case "person": return named(a) || !!askedSide?.has(a.id);
      case "time": return hasDate(t);
      case "quantity": return hasNumber(t);
      case "position": return a.kind === "reported";
      case "proposition": return !!rel && stemOf(a.relation?.pred) === rel;
      default: return !!rel && stemOf(a.relation?.pred) === rel;
    }
  };
  const frames = new Map((record.sources ?? []).map((s) => [s.id, null]));
  return {
    perception: {
      // a claim perspectives.js read as stating a stance toward the topic (its alias surfaces) is about the topic, whatever referent id
      // relations.js gave it; its predicate is on the asked pole and its holder is named
      anchor: cands.map((a) => (a.entities ?? []).some((e) => focus.has(e)) || !!askedSide?.has(a.id)),
      // Figure grain (CON·Link): the question's figure ACTS in the claim — it is the relation's subject, not merely named in it.
      actor: cands.map((a) => !!a.relation?.subj && focus.has(a.relation.subj)),
      admits: cands.map(admitsOf),
      relation: cands.map((a) => (!!rel && stemOf(a.relation?.pred) === rel) || !!askedSide?.has(a.id)),
      words: cands.map((a) => [...new Set([...contentWords(a._sentence ?? "")].map(stemOf))].filter((s) => qWords.has(s))),
      // POINTED (pointer-match.js): an index sentence that carries the question's figures led here, matched slot to slot against the
      // origin sentence. The index is the query; this sentence is the source it found.
      pointed: cands.map((a) => !!pointed?.has(a.id)),
    },
    logos: {
      chains: cands.map((a) => a.independent_count ?? 1),
      agree: cands.map((a) => a.standing === "AGREE"),
      // When the question asks for a person, "has a named speaker" is already perception's admits witness; counted once, not twice.
      speaker: admits === "person" ? cands.map(() => false) : cands.map(named),
    },
    frames,
  };
}

const NO_PRIOR = Object.freeze({ m: 0, df: new Map() });

/** Surprisal weight of a boolean column: −log2(share present). A witness every candidate carries says nothing (weight 0). */
const surprisal = (col) => { const k = col.filter(Boolean).length; return k === 0 || k === col.length ? 0 : log2(col.length / k); };

function scoreWith(cols, layers, n, prior = NO_PRIOR) {
  const s = new Array(n).fill(0);
  const why = Array.from({ length: n }, () => ({}));
  if (layers.includes("perception")) for (const [name, col] of Object.entries(cols.perception)) {
    if (name === "words") {
      // Each question word the claim carries is its own witness, weighed by its own surprisal across the candidates.
      const df = new Map();
      // The reader's own units are part of the word population: a stem W already carries everywhere says nothing new (W = ∅: m = 0).
      for (const ws of col) for (const w of ws) df.set(w, (df.get(w) ?? 0) + 1);
      const N = n + prior.m;
      const dfOf = (x) => df.get(x) + (prior.df.get(x) ?? 0);
      col.forEach((ws, i) => { const w = ws.reduce((k, x) => k + (dfOf(x) === N ? 0 : log2(N / dfOf(x))), 0); if (w) { s[i] += w; why[i]["perception.words"] = +w.toFixed(3); } });
      continue;
    }
    // INS (what kind may stand here) only qualifies a binding SIG or CON made: the kind witness counts for a candidate only when a
    // content witness (anchor, actor, relation, words) already ties it to what the question is about. A date alone answers no "when".
    const bound = (i) => cols.perception.anchor[i] || cols.perception.pointed?.[i] || cols.perception.stance?.[i] || cols.perception.actor[i] || cols.perception.relation[i] || (cols.perception.words[i]?.length ?? 0) > 0;
    const w = surprisal(col);
    col.forEach((v, i) => { if (v && (name !== "admits" || bound(i))) { s[i] += w; why[i][`perception.${name}`] = +w.toFixed(3); } });
  }
  if (layers.includes("logos")) {
    cols.logos.chains.forEach((k, i) => { if (k > 1) { s[i] += log2(k); why[i]["logos.chains"] = +log2(k).toFixed(3); } });
    for (const name of ["agree", "speaker"]) { const col = cols.logos[name]; const w = surprisal(col); col.forEach((v, i) => { if (v) { s[i] += w; why[i][`logos.${name}`] = +w.toFixed(3); } }); }
  }
  return { s, why };
}

/** The margin null: shuffle each witness column independently (seeded) and read the top-vs-runner-up odds margin; p95 is the bar. */
function marginNull(cols, layers, n, { seed = 20261014, draws = 199, prior = NO_PRIOR } = {}) {
  const rnd = mulberry(seed);
  const shuffle = (col) => { const c = col.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const margins = [];
  for (let d = 0; d < draws; d++) {
    const sh = { perception: Object.fromEntries(Object.entries(cols.perception).map(([k, c]) => [k, shuffle(c)])), logos: Object.fromEntries(Object.entries(cols.logos).map(([k, c]) => [k, shuffle(c)])) };
    const { s } = scoreWith(sh, layers, n, prior);
    const [a, b] = s.slice().sort((x, y) => y - x);
    margins.push(1 - 2 ** -((a ?? 0) - (b ?? 0)));
  }
  margins.sort((x, y) => x - y);
  return { p95: margins[Math.floor(0.95 * (margins.length - 1))], p99: margins[Math.floor(0.99 * (margins.length - 1))], draws };
}

// ---- the void's outcome: the four corners --------------------------------------------------------------------------------------------

/**
 * Every stage reports its outcome in Nagarjuna's four corners: hl.js's Belnap–Dunn lattice, the ONE lattice (organs/nagarjuna.js),
 * computed from two independent supports through hl.js verdictOfSupport — never a re-typed synonym. For a question's void, as
 * precision-race.js already reads the same lattice:
 *   is      (bound)        one filler is determined: the lead binds past its runner-up (contest.js adjudicate)
 *   is-not  (contradicted) what carries the question's terms denies it: every evidence-bearing candidate is negative, or a polar
 *                          question's bound lead is
 *   both    (contested)    more than one filler holds: the lead does not clear its runner-up past the null
 *   neither (unbound)      nothing in the record decides it: no candidate carries anything the question declared
 */
export const CORNER_SAYS = Object.freeze({ [BOUND]: "is", [CONTRADICTED]: "is-not", [CONTESTED]: "both", [UNBOUND]: "neither" });
export function cornerOf({ evidence, contest, denies = false }) {
  const carried = evidence > 0;
  const rival = [CONTEST_VERDICTS.NO_MARGIN, CONTEST_VERDICTS.CONTESTED_NO_MARGIN].includes(contest?.verdict);
  const verdict = verdictOfSupport(carried && !denies, carried && (denies || rival));
  return Object.freeze({ verdict, says: CORNER_SAYS[verdict], contest: contest?.verdict ?? null });
}

// ---- the ladder ---------------------------------------------------------------------------------------------------------------------

export async function answerLadder(record, { question, slice, grammar, telling = null, fixity = {}, seed = 20261014, whom = VOID_READER, pointed = null, perspectives = null } = {}) {
  const reading = whom && !whom.empty;
  const experiencer = requireExperiencer({ who: "the asker", read: reading ? `${question.id} over ${record.sources.length} pinned pages, for a reader holding ${whom.size} units (${whom.pinax.join(", ")})` : `${question.id} over ${record.sources.length} pinned pages`, revision: null });
  const realize = realizer(record, { slice, grammar });
  let all = candidatesOf(record, fixity);
  // STANCE (perspectives.js): a claim whose holder sits on the OPPOSITE pole of what the question asked ("who opposes …" ← a supporter's
  // quote) is not an answer while any candidate sits on the asked pole. Typed, never silent; with no asked-pole holder nothing is dropped.
  const wrongSide = [];
  let askedSide = null;
  if (perspectives?.positions?.length) {
    const within = (a, row) => { try { const x = parseAddress(a.span), y = parseAddress(row.span); return x.pinax === y.pinax && x.start < y.end && y.start < x.end; } catch { return false; } };
    // a sentence can hold both poles ("Reyes approved it, but Lopez opposed it"): it is on the wrong side only when every holder in it is
    const polesOf = (a) => new Set(perspectives.positions.filter((row) => (!row.option || row.option === "topic") && within(a, row)).map((row) => row.pole));
    askedSide = new Set(all.filter((a) => polesOf(a).has("+")).map((a) => a.id));
    if (askedSide.size) {
      const keep = [];
      for (const a of all) { const ps = polesOf(a); (ps.size && !ps.has("+") ? wrongSide : keep).push(a); }
      if (wrongSide.length) all = keep;
    }
  }
  // The reader's population: what this reader does not already hold. Held candidates are dropped, typed, with the W bytes that hold them.
  const held = [];
  const cands = [];
  for (const a of all) {
    const at = reading ? heldIn(whom, (await slice(a.span)) ?? a._sentence) : null;
    if (at) held.push({ atom: a.id, reason: "held", at }); else cands.push(a);
  }
  const prior = reading ? { m: whom.size, df: whomStemDf(whom) } : NO_PRIOR;
  const told = (ss) => (reading ? ss.filter((s) => !sentenceHeld(whom, s)) : ss);
  const n = cands.length;
  const cols = witnesses(cands, { question, record, pointed, askedSide });
  const frameOf = new Map();
  for (const a of record.atoms) if (a.frame_id) frameOf.set(a.pinax, a.frame_id);

  // A candidate is said as its SPEAKER's words (the source's own attitude verb, copied) or, in a page's own voice, as its AUTHOR's (or the
  // body's, where the markup types one). Never as a publication's: the page is the path (the sentence's `via`), not the party.
  const propOf = (a, variant = 0) => {
    const g = giverOf(a, record);
    if (a.why_kind === "quotation") return { type: "said", slots: { who: { span: a.giver.surface }, verb: { span: a.giver.attitude }, quote: { span: a.span, quoted: true } }, grounds: [a.id] };
    const slot = giverSlot(g);
    if (!slot) return { type: "page_says", slots: { page: { page: a.pinax }, quote: { span: a.span, quoted: true } }, grounds: [a.id] };
    return { type: "attributed", slots: { giver: slot, quote: { span: a.span, quoted: true }, variant }, grounds: [a.id] };
  };
  const nVariants = grammar.attributionVariants ?? 1;
  const urlOf = new Map((record.sources ?? []).map((x) => [x.id, x.final_url ?? x.url]));
  const sayCache = new Map();
  const sayVariant = async (a, v) => {
    const k = `${a.id}#${v}`;
    if (!sayCache.has(k)) { const r = await realize(propOf(a, v)); const s = r.sentence ?? null; if (s) { s.via = urlOf.get(a.pinax) ?? null; s.variant = v; } sayCache.set(k, s); }
    return sayCache.get(k);
  };
  const say = (a) => sayVariant(a, 0);
  // Every lawful construction of a candidate (a quotation has one).
  const variantsOf = async (a) => {
    if (propOf(a).type !== "attributed") { const s = await sayVariant(a, 0); return s ? [s] : []; }
    const out = [];
    for (let v = 0; v < nVariants; v++) { const s = await sayVariant(a, v); if (s) out.push(s); }
    return out;
  };
  /** PATHOS (organs/pathos-variants.js): choose, jointly for a passage, the constructions that give it a cadence. Returns the picks re-said. */
  const vary = async (picked) => {
    if (picked.length < 2) return picked;
    const alts = await Promise.all(picked.map((p) => variantsOf(p.a)));
    const ch = chooseVariants(alts);
    return picked.map((p, i) => (ch.index[i] >= 0 ? { ...p, s: alts[i][ch.index[i]] } : p));
  };
  /** Pick k lawful candidates in score order; `diverse(a, picked)` returns a log2 penalty for redundancy with what is already picked. */
  const pick = async (scores, k, diverse = () => 0) => {
    const picked = [];
    const pool = cands.map((a, i) => ({ a, i }));
    while (picked.length < k) {
      let best = null, bestS = -Infinity;
      for (const c of pool) { if (picked.some((p) => p.i === c.i)) continue; const v = scores[c.i] - diverse(c.a, picked); if (v > bestS) { best = c; bestS = v; } }
      if (!best) break;
      const s = await say(best.a);
      pool.splice(pool.indexOf(best), 1);
      if (s) picked.push({ ...best, s, score: scores[best.i], adjusted: bestS });
    }
    return picked;
  };
  const leadOf = (picked, why) => (picked[0] ? { atom: picked[0].a.id, score: +picked[0].score.toFixed(3), witnesses: why[picked[0].i] } : null);
  const stages = [];

  // STAGE 1 — PERCEPTION: the line.
  const p1 = scoreWith(cols, ["perception"], n, prior);
  // No evidence is not an answer: when no candidate carries anything the question declared, the line says so — the corner "neither".
  const evidence = Math.max(0, ...p1.s);
  const carriers = cands.filter((_, i) => p1.s[i] > 0);
  const negOnly = carriers.length > 0 && carriers.every((a) => a.relation?.polarity === "-");
  const denies = (lead) => negOnly || (question.form === "polar" && lead?.relation?.polarity === "-");
  const nothing = async () => { const s = grammar.constructions.nothing_carries ? grammar.finish(grammar.constructions.nothing_carries({}), [question.id]) : null; return s && !lintSentence(s, grammar).length ? [s] : []; };
  // The reader already holds everything that carries the question: for this reader the void is held, not empty.
  const allHeld = reading && evidence <= 0 && held.length > 0 && Math.max(0, ...scoreWith(witnesses(all, { question, record, pointed, askedSide }), ["perception"], all.length).s) > 0;
  if (evidence <= 0) {
    const s = allHeld && grammar.constructions.already_held ? (() => { const x = grammar.finish(grammar.constructions.already_held({}), [question.id]); return lintSentence(x, grammar).length ? [] : [x]; })() : await nothing();
    const why = allHeld ? `held: every candidate that carries the question is already in this reader's W (${held.length} held)` : "no candidate carries any perception witness: the question's figures, kind, relation and words are absent from the record (a question in another language than the record's needs a bilingual lexicon, which is not on disk)";
    const corner = cornerOf({ evidence, contest: null });
    for (const [i, size] of ["line", "paragraph", "brief"].entries()) stages.push({ stage: i + 1, size, layers: ["perception", "logos", "pathos"].slice(0, i + 1), lead: null, verdict: corner.verdict, corner, why, sentences: s, ...(i === 1 ? { contest: { verdict: null, margin: null, bar: null, why: "not run: there is no candidate to adjudicate" } } : {}), ...(i === 2 ? { experiencer, strain: "report", sides: 0, rhythm: { flatline: false, ratio: 0, n: 0 } } : {}) });
    stages.push({ stage: 4, size: "dossier", layers: ["perception", "logos", "pathos", "cube"], sentences: (telling?.cells ?? []).flatMap((c) => c.sentences ?? []) });
    return { question: { id: question.id, form: question.form, admits: question.reading?.admits, modality: question.modality, focus: question.focus, undeclared: question.undeclared.map((u) => u.field) }, candidates: n, ...(askedSide ? { asked_side: askedSide.size } : {}), ...(wrongSide.length ? { wrong_side: wrongSide.map((a) => ({ atom: a.id, why: "holder on the opposite pole of the asked stance (perspectives.js)" })) } : {}), stages, ...(reading ? { reader: readerReport(whom, all.length, held, stages) } : {}) };
  }
  const line = await pick(p1.s, 1);
  const bar1 = marginNull(cols, ["perception"], n, { seed, prior });
  const contest1 = adjudicate({ scores: new Map(cands.map((a, i) => [a.id, 2 ** p1.s[i]])), coPresent: [], minActivation: 1, minMargin: bar1.p95, contestedMargin: Math.max(bar1.p95, bar1.p99) });
  const corner1 = cornerOf({ evidence, contest: contest1, denies: denies(line[0]?.a) });
  stages.push({ stage: 1, size: "line", layers: ["perception"], lead: leadOf(line, p1.why), verdict: corner1.verdict, corner: corner1, sentences: line.map((x) => x.s) });

  // STAGE 2 — + LOGOS: the paragraph. The lead is re-chosen; contest decides whether it binds.
  const p2 = scoreWith(cols, ["perception", "logos"], n, prior);
  const bar = marginNull(cols, ["perception", "logos"], n, { seed, prior });
  const odds = new Map(cands.map((a, i) => [a.id, 2 ** p2.s[i]]));
  const notes = cands.filter((a) => a.relation?.subj).map((a) => ({ end1: a.relation.subj, label: String(a.relation.pred).toLowerCase(), end2: (a.relation.obj_refs ?? [])[0] ?? null })).filter((x) => x.end2);
  const cycles = logos(notes);
  const contestedIds = record.claims.filter((c) => c.standing === "CONTRADICTED").flatMap((c) => c.atoms);
  const contestedLead = (ids) => ids.some((id) => contestedIds.includes(id));
  const verdict = adjudicate({ scores: odds, coPresent: contestedIds.filter((id) => odds.has(id)), minActivation: 1, minMargin: bar.p95, contestedMargin: Math.max(bar.p95, bar.p99) });
  const byPage = (a, picked) => log2(1 + picked.filter((p) => p.a.pinax === a.pinax).length);
  const para = await vary(await pick(p2.s, 3, byPage));
  let paraSentences = para.map((x) => x.s);
  if (verdict.verdict !== "bound" && para.length >= 2) {
    // The lead does not clear its runner-up past the null: say both, never pick one silently.
    // An embedded reading continues the sentence: its own final stop is dropped and a frame opener is lower-cased.
    const strip = (s) => s.segs.slice(0, s.segs.length - (s.segs.at(-1)?.t === "." ? 1 : 0)).map((x, i) => (i === 0 && x.kind === "frame" ? { ...x, t: x.t.charAt(0).toLowerCase() + x.t.slice(1) } : x));
    const both = grammar.constructions[contestedLead([para[0].a.id, para[1].a.id]) ? "both" : "both_weigh"]?.({ a: strip(para[0].s), b: strip(para[1].s) });
    if (both) { const s = grammar.finish(both, [para[0].a.id, para[1].a.id]); if (!lintSentence(s, grammar).length) paraSentences = [s, ...para.slice(2).map((x) => x.s)]; }
  }
  // What holds across sources is told only when it touches THIS question: a sentence whose grounds include a candidate that carried a
  // perception witness. A claim the pages agree on that has nothing to do with the ask is a different answer, not this one's release.
  const carrierIds = new Set(carriers.map((a) => a.id));
  const touches = (ss) => ss.filter((s) => (s.grounds ?? []).some((g) => carrierIds.has(g)));
  const holds = touches(told((telling?.cells ?? []).find((c) => c.key === "CON·Pattern")?.sentences ?? []));
  const corner2 = cornerOf({ evidence, contest: verdict, denies: denies(para[0]?.a) });
  stages.push({
    stage: 2, size: "paragraph", layers: ["perception", "logos"], verdict: corner2.verdict, corner: corner2,
    lead: leadOf(para, p2.why), moved: line[0] && para[0] && line[0].a.id !== para[0].a.id ? { from: line[0].a.id, to: para[0].a.id, by: Object.keys(p2.why[para[0].i]).filter((k) => k.startsWith("logos")) } : null,
    contest: { verdict: verdict.verdict, margin: verdict.margin, bar: +bar.p95.toFixed(3), null: `p95 of ${bar.draws} seeded shuffles` },
    cycles: cycles.length,
    sentences: [...paraSentences, ...holds.slice(0, 1)],
  });

  // STAGE 3 — + PATHOS: the brief, for a declared experiencer.
  const strain = strainOf({ contested: contestedIds, contradictions: [], cycles: cycles.length });
  const sides = strain === "report" && question.form !== "deliberative" ? 3 : 5;
  const byCamp = (a, picked) => byPage(a, picked) + log2(1 + picked.filter((p) => frameOf.get(p.a.pinax) && frameOf.get(p.a.pinax) === frameOf.get(a.pinax)).length);
  let brief = await vary(await pick(p2.s, sides, byCamp));
  let draft = brief.map((x) => x.s.text).join(" ");
  let rhythm = pathosOf({ text: draft || "—", experiencer, state: { contested: contestedIds } }).rhythm;
  if (rhythm.flatline && brief.length > 1) {
    // Murch: a flatlined draft trades its last pick for the next lawful candidate of the most different length.
    const more = await pick(p2.s, sides + 3, byCamp);
    const lens = brief.map((x) => x.s.text.length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const alt = more.filter((m) => !brief.some((b) => b.i === m.i)).sort((x, y) => Math.abs(y.s.text.length - mean) - Math.abs(x.s.text.length - mean))[0];
    if (alt) { brief = [...brief.slice(0, -1), alt]; draft = brief.map((x) => x.s.text).join(" "); rhythm = pathosOf({ text: draft, experiencer, state: { contested: contestedIds } }).rhythm; }
  }
  const cell = (k) => told((telling?.cells ?? []).find((c) => c.key === k)?.sentences ?? []);
  const tension = [...cell("SYN·Pattern"), ...cell("DEF·Pattern")];
  const release = [...touches(cell("CON·Pattern")), ...cell("EVA·Pattern"), ...cell("REC·Ground")];
  stages.push({
    stage: 3, size: "brief", layers: ["perception", "logos", "pathos"], verdict: cornerOf({ evidence, contest: verdict, denies: denies(brief[0]?.a) }).verdict, corner: cornerOf({ evidence, contest: verdict, denies: denies(brief[0]?.a) }),
    lead: leadOf(brief, p2.why), experiencer, strain, sides,
    rhythm: { flatline: rhythm.flatline, ratio: rhythm.ratio, n: rhythm.n }, curve: "unmeasured: no fold is run over the answer (a typed gap, not a verdict)",
    // Useful first: the lead answers; then the tension (where pages differ), the other sides, and the release (what holds).
    sentences: [brief[0]?.s, ...tension.slice(0, 2), ...brief.slice(1).map((x) => x.s), ...release.slice(0, 3)].filter(Boolean),
  });

  // STAGE 4 — the whole cube: the telling. STAGE 5 (the claim sheet) is every atom, rendered by the claim-sheet lens.
  stages.push({ stage: 4, size: "dossier", layers: ["perception", "logos", "pathos", "cube"], sentences: (telling?.cells ?? []).flatMap((c) => c.sentences ?? []) });

  return { question: { id: question.id, form: question.form, admits: question.reading?.admits, modality: question.modality, focus: question.focus, undeclared: question.undeclared.map((u) => u.field) }, candidates: n, ...(askedSide ? { asked_side: askedSide.size } : {}), ...(wrongSide.length ? { wrong_side: wrongSide.map((a) => ({ atom: a.id, why: "holder on the opposite pole of the asked stance (perspectives.js)" })) } : {}), stages, ...(reading ? { reader: readerReport(whom, all.length, held, stages) } : {}) };
}

/** What the reader changed: the population before and after, every held drop with its W address, and the told sentences that W held. */
function readerReport(whom, before, held, stages) {
  return { units: whom.size, pinax: whom.pinax, population: { record: before, reader: before - held.length }, held };
}

/** Seam density per stage (stages 1–3 and the dossier): reported first on every fold, for any reader, the void reader included. */
export const seamsByStage = (stages) => stages.map((st) => ({ stage: st.stage, size: st.size, ...seamsOf(st.sentences ?? []) }));
