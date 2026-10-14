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
// RECURSION. A stage re-scores EVERY candidate with all layers up to it, so the lead of a bigger answer is chosen by more of the stack;
// each stage reports whether its lead moved and which layer's witnesses moved it.
import { logos } from "./logos.js";
import { pathosOf, strainOf } from "./pathos.js";
import { requireExperiencer } from "./experiencer.js";
import { adjudicate } from "../kernel/contest.js";
import { realizer } from "./cube-telling.js";
import { lintSentence } from "./prose-laws.js";
import { seamReport } from "./seam-ledger.js";
import { distanceOf, partitionByWhom } from "./whom.js";

const log2 = Math.log2;
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const stemOf = (w) => String(w ?? "").toLowerCase().slice(0, 4);
const YEAR = /\b(1[5-9]\d\d|20\d\d)\b/;
const MONTHS = new Set(Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, m, 15))).toLowerCase()));
const hasDate = (t) => YEAR.test(t) || (t.toLowerCase().match(/[a-z]+/g) ?? []).some((w) => MONTHS.has(w));
const hasNumber = (t) => /\b\d[\d,.]*\b/.test(t);
const contentWords = (t) => new Set((String(t).toLowerCase().match(/[\p{L}]{4,}/gu) ?? []));

// ---- the candidates and their witnesses ----------------------------------------------------------------------------------------------

function candidatesOf(record, fixity) {
  const altered = new Set(Object.entries(fixity ?? {}).filter(([, v]) => v.verdict === "altered").map(([k]) => k));
  const bySpan = new Map();
  for (const a of record.atoms) {
    if (altered.has(a.pinax)) continue; // perception: a span whose bytes are gone is not a candidate
    const named = a.giver?.surface && !a.giver.pronoun && /^\p{Lu}/u.test(a.giver.surface_verbatim ?? "");
    if (a.why_kind === "quotation" && !named) continue;
    // A claim quoted in a page's own voice is a whole sentence: terminal punctuation, not a list item or a heading.
    if (a.why_kind !== "quotation" && !/[.!?]["”’)\]]*\s*$/.test(String(a._sentence ?? "").trim())) continue;
    const prior = bySpan.get(a.span);
    if (!prior || (a.why_kind === "quotation" && prior.why_kind !== "quotation")) bySpan.set(a.span, a);
  }
  // The same bytes twice (a page repeating its own sentence) are one candidate, not two readings.
  const byText = new Map();
  for (const a of bySpan.values()) { const k = `${a.why_kind === "quotation" ? "q" : "s"}|${String(a._sentence ?? "").replace(/\s+/g, " ").trim()}`; if (!byText.has(k)) byText.set(k, a); }
  return [...byText.values()];
}

/** The witness table: one column per witness, one boolean or count per candidate. Columns are grouped by layer. */
function witnesses(cands, { question, record }) {
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
      case "person": return named(a);
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
      anchor: cands.map((a) => (a.entities ?? []).some((e) => focus.has(e))),
      // Figure grain (CON·Link): the question's figure ACTS in the claim — it is the relation's subject, not merely named in it.
      actor: cands.map((a) => !!a.relation?.subj && focus.has(a.relation.subj)),
      admits: cands.map(admitsOf),
      relation: cands.map((a) => !!rel && stemOf(a.relation?.pred) === rel),
      words: cands.map((a) => [...new Set([...contentWords(a._sentence ?? "")].map(stemOf))].filter((s) => qWords.has(s))),
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

/** Surprisal weight of a boolean column: −log2(share present). A witness every candidate carries says nothing (weight 0). */
const surprisal = (col) => { const k = col.filter(Boolean).length; return k === 0 || k === col.length ? 0 : log2(col.length / k); };

function scoreWith(cols, layers, n) {
  const s = new Array(n).fill(0);
  const why = Array.from({ length: n }, () => ({}));
  if (layers.includes("perception")) for (const [name, col] of Object.entries(cols.perception)) {
    if (name === "words") {
      // Each question word the claim carries is its own witness, weighed by its own surprisal across the candidates.
      const df = new Map();
      for (const ws of col) for (const w of ws) df.set(w, (df.get(w) ?? 0) + 1);
      col.forEach((ws, i) => { const w = ws.reduce((k, x) => k + (df.get(x) === n ? 0 : log2(n / df.get(x))), 0); if (w) { s[i] += w; why[i]["perception.words"] = +w.toFixed(3); } });
      continue;
    }
    // INS (what kind may stand here) only qualifies a binding SIG or CON made: the kind witness counts for a candidate only when a
    // content witness (anchor, actor, relation, words) already ties it to what the question is about. A date alone answers no "when".
    const bound = (i) => cols.perception.anchor[i] || cols.perception.actor[i] || cols.perception.relation[i] || (cols.perception.words[i]?.length ?? 0) > 0;
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
function marginNull(cols, layers, n, { seed = 20261014, draws = 199 } = {}) {
  const rnd = mulberry(seed);
  const shuffle = (col) => { const c = col.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  const margins = [];
  for (let d = 0; d < draws; d++) {
    const sh = { perception: Object.fromEntries(Object.entries(cols.perception).map(([k, c]) => [k, shuffle(c)])), logos: Object.fromEntries(Object.entries(cols.logos).map(([k, c]) => [k, shuffle(c)])) };
    const { s } = scoreWith(sh, layers, n);
    const [a, b] = s.slice().sort((x, y) => y - x);
    margins.push(1 - 2 ** -((a ?? 0) - (b ?? 0)));
  }
  margins.sort((x, y) => x - y);
  return { p95: margins[Math.floor(0.95 * (margins.length - 1))], p99: margins[Math.floor(0.99 * (margins.length - 1))], draws };
}

// ---- the ladder ---------------------------------------------------------------------------------------------------------------------

export async function answerLadder(record, { question, slice, grammar, telling = null, fixity = {}, seed = 20261014, whom = null } = {}) {
  // The whom is the second operand (CALLIMACHUS-SHAPE.md "For whom"). Declared with holdings (seam-ledger.js declareWhom) it names the
  // experiencer and what they hold; absent, the placeholder stands and the result says the whom was never declared.
  const experiencer = requireExperiencer(whom
    ? { who: whom.giver ?? "the void reader (no whom: the catalog)", read: `${question.id} over ${record.sources.length} pinned pages, for a ${whom.kind} holding ${whom.holdings.told} told claims and ${whom.holdings.seen} seen pages`, revision: null }
    : { who: "the asker", read: `${question.id} over ${record.sources.length} pinned pages`, revision: null });
  // Every stage reports its fold contract (addressed spans vs seams, the mouth's share), and the question reports its distance from the whom.
  const withSeams = (out, touched) => {
    for (const st of out.stages) st.seams = seamReport(st.sentences ?? []);
    out.whom = whom ? { giver: whom.giver, kind: whom.kind, holdings: whom.holdings, empty: whom.empty } : { declared: false, note: "no whom declared: the placeholder asker stands, so no distance is measured" };
    out.distance = whom ? distanceOf(touched, whom) : null;
    return out;
  };
  // A pick this whom already holds is placed TYPED as held — never presented as new (CALLIMACHUS-SHAPE.md Step 0). A held claim that
  // carries evidence and was NOT picked is on the record too, as a drop with its own reason, distinct from "below the floor": the lens
  // outputs what it dropped. `held` = placed typed as held; `droppedHeld` = left out because this whom already holds it.
  const heldOf = (picks) => (whom ? partitionByWhom(picks.map((x) => ({ key: x.a.id, page: x.a.pinax })), whom).held.map((h) => ({ atom: h.item.key, ...h.reason })) : undefined);
  const droppedHeldOf = (picks, scores) => {
    if (!whom) return undefined;
    const out = [];
    cands.forEach((a, i) => {
      if (!whom.told.has(a.id) || !(scores[i] > 0) || picks.some((p) => p.i === i)) return;
      const at = whom.told.get(a.id);
      out.push({ atom: a.id, kind: "held", at, text: `held: already told to this whom${at ? ` at ${at}` : ""}; not placed here` });
    });
    return out;
  };
  const withHeld = (stage, picks, scores) => { const held = heldOf(picks); if (held) { stage.held = held; stage.droppedHeld = droppedHeldOf(picks, scores); } return stage; };
  const realize = realizer(record, { slice, grammar });
  const cands = candidatesOf(record, fixity);
  const n = cands.length;
  const cols = witnesses(cands, { question, record });
  const frameOf = new Map();
  for (const a of record.atoms) if (a.frame_id) frameOf.set(a.pinax, a.frame_id);

  const propOf = (a) => (a.why_kind === "quotation"
    ? { type: "said", slots: { who: { span: a.giver.surface }, verb: { span: a.giver.attitude }, quote: { span: a.span, quoted: true } }, grounds: [a.id] }
    : { type: "page_says", slots: { page: { page: a.pinax }, quote: { span: a.span, quoted: true } }, grounds: [a.id] });
  const sayCache = new Map();
  const say = async (a) => { if (!sayCache.has(a.id)) { const r = await realize(propOf(a)); sayCache.set(a.id, r.sentence ?? null); } return sayCache.get(a.id); };

  // What this whom already holds. Told is exact set membership on the claim's key; a held candidate that carries evidence is placed AFTER
  // every fresh candidate that does, and typed `held` (CALLIMACHUS-SHAPE.md Step 0). Nothing is dropped and no weight constant is added:
  // the tier is an order, so with no whom declared (or one holding nothing the question touches) the pick is exactly what it was.
  const heldAt = new Map();
  if (whom) cands.forEach((a, i) => { if (whom.told.has(a.id)) heldAt.set(i, whom.told.get(a.id)); });
  const tier = (scores, i) => (whom && heldAt.size ? (scores[i] > 0 ? (heldAt.has(i) ? 1 : 0) : 2) : 0);

  /** Pick k lawful candidates in score order (fresh before held, for a declared whom); `diverse(a, picked)` returns a log2 penalty for redundancy with what is already picked. */
  const pick = async (scores, k, diverse = () => 0) => {
    const picked = [];
    const pool = cands.map((a, i) => ({ a, i }));
    while (picked.length < k) {
      let best = null, bestS = -Infinity, bestT = Infinity;
      for (const c of pool) {
        if (picked.some((p) => p.i === c.i)) continue;
        const v = scores[c.i] - diverse(c.a, picked), t = tier(scores, c.i);
        if (t < bestT || (t === bestT && v > bestS)) { best = c; bestS = v; bestT = t; }
      }
      if (!best) break;
      let s = await say(best.a);
      pool.splice(pool.indexOf(best), 1);
      if (s && heldAt.has(best.i)) s = { ...s, heldBy: { kind: "held", at: heldAt.get(best.i) ?? null } };
      if (s) picked.push({ ...best, s, score: scores[best.i], adjusted: bestS, held: heldAt.has(best.i) });
    }
    return picked;
  };
  const leadOf = (picked, why) => (picked[0] ? { atom: picked[0].a.id, score: +picked[0].score.toFixed(3), witnesses: why[picked[0].i] } : null);
  const stages = [];

  // STAGE 1 — PERCEPTION: the line.
  const p1 = scoreWith(cols, ["perception"], n);
  // No evidence is not an answer: when no candidate carries anything the question declared, the line says so (adjudicate's below_floor).
  const evidence = Math.max(0, ...p1.s);
  const nothing = async () => { const s = grammar.constructions.nothing_carries ? grammar.finish(grammar.constructions.nothing_carries({}), [question.id]) : null; return s && !lintSentence(s, grammar).length ? [s] : []; };
  if (evidence <= 0) {
    const s = await nothing();
    const why = "no candidate carries any perception witness: the question's figures, kind, relation and words are absent from the record (a question in another language than the record's needs a bilingual lexicon, which is not on disk)";
    for (const [i, size] of ["line", "paragraph", "brief"].entries()) stages.push({ stage: i + 1, size, layers: ["perception", "logos", "pathos"].slice(0, i + 1), lead: null, verdict: "below_floor", why, sentences: s, ...(i === 1 ? { contest: { verdict: "below_floor", margin: null, bar: null } } : {}), ...(i === 2 ? { experiencer, strain: "report", sides: 0, rhythm: { flatline: false, ratio: 0, n: 0 } } : {}) });
    stages.push({ stage: 4, size: "dossier", layers: ["perception", "logos", "pathos", "cube"], sentences: (telling?.cells ?? []).flatMap((c) => c.sentences ?? []) });
    return withSeams({ question: { id: question.id, form: question.form, admits: question.reading?.admits, modality: question.modality, focus: question.focus, undeclared: question.undeclared.map((u) => u.field) }, candidates: n, stages }, []);
  }
  const touched = cands.filter((_, i) => p1.s[i] > 0).map((a) => ({ key: a.id, page: a.pinax }));
  const line = await pick(p1.s, 1);
  stages.push(withHeld({ stage: 1, size: "line", layers: ["perception"], lead: leadOf(line, p1.why), sentences: line.map((x) => x.s) }, line, p1.s));

  // STAGE 2 — + LOGOS: the paragraph. The lead is re-chosen; contest decides whether it binds.
  const p2 = scoreWith(cols, ["perception", "logos"], n);
  const bar = marginNull(cols, ["perception", "logos"], n, { seed });
  const odds = new Map(cands.map((a, i) => [a.id, 2 ** p2.s[i]]));
  const notes = cands.filter((a) => a.relation?.subj).map((a) => ({ end1: a.relation.subj, label: String(a.relation.pred).toLowerCase(), end2: (a.relation.obj_refs ?? [])[0] ?? null })).filter((x) => x.end2);
  const cycles = logos(notes);
  const contestedIds = record.claims.filter((c) => c.standing === "CONTRADICTED").flatMap((c) => c.atoms);
  const contestedLead = (ids) => ids.some((id) => contestedIds.includes(id));
  const verdict = adjudicate({ scores: odds, coPresent: contestedIds.filter((id) => odds.has(id)), minActivation: 1, minMargin: bar.p95, contestedMargin: Math.max(bar.p95, bar.p99) });
  const byPage = (a, picked) => log2(1 + picked.filter((p) => p.a.pinax === a.pinax).length);
  const para = await pick(p2.s, 3, byPage);
  let paraSentences = para.map((x) => x.s);
  if (verdict.verdict !== "bound" && para.length >= 2) {
    // The lead does not clear its runner-up past the null: say both, never pick one silently.
    // An embedded reading continues the sentence: its own final stop is dropped and a frame opener is lower-cased.
    const strip = (s) => s.segs.slice(0, s.segs.length - (s.segs.at(-1)?.t === "." ? 1 : 0)).map((x, i) => (i === 0 && x.kind === "frame" ? { ...x, t: x.t.charAt(0).toLowerCase() + x.t.slice(1) } : x));
    const both = grammar.constructions[contestedLead([para[0].a.id, para[1].a.id]) ? "both" : "both_weigh"]?.({ a: strip(para[0].s), b: strip(para[1].s) });
    if (both) { const s = grammar.finish(both, [para[0].a.id, para[1].a.id]); if (!lintSentence(s, grammar).length) paraSentences = [s, ...para.slice(2).map((x) => x.s)]; }
  }
  const holds = (telling?.cells ?? []).find((c) => c.key === "CON·Pattern")?.sentences ?? [];
  stages.push(withHeld({
    stage: 2, size: "paragraph", layers: ["perception", "logos"],
    lead: leadOf(para, p2.why), moved: line[0] && para[0] && line[0].a.id !== para[0].a.id ? { from: line[0].a.id, to: para[0].a.id, by: Object.keys(p2.why[para[0].i]).filter((k) => k.startsWith("logos")) } : null,
    contest: { verdict: verdict.verdict, margin: verdict.margin, bar: +bar.p95.toFixed(3), null: `p95 of ${bar.draws} seeded shuffles` },
    cycles: cycles.length,
    sentences: [...paraSentences, ...holds.slice(0, 1)],
  }, para, p2.s));

  // STAGE 3 — + PATHOS: the brief, for a declared experiencer.
  const strain = strainOf({ contested: contestedIds, contradictions: [], cycles: cycles.length });
  const sides = strain === "report" && question.form !== "deliberative" ? 3 : 5;
  const byCamp = (a, picked) => byPage(a, picked) + log2(1 + picked.filter((p) => frameOf.get(p.a.pinax) && frameOf.get(p.a.pinax) === frameOf.get(a.pinax)).length);
  let brief = await pick(p2.s, sides, byCamp);
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
  const cell = (k) => (telling?.cells ?? []).find((c) => c.key === k)?.sentences ?? [];
  const tension = [...cell("SYN·Pattern"), ...cell("DEF·Pattern")];
  const release = [...cell("CON·Pattern"), ...cell("EVA·Pattern"), ...cell("REC·Ground")];
  stages.push(withHeld({
    stage: 3, size: "brief", layers: ["perception", "logos", "pathos"],
    lead: leadOf(brief, p2.why), experiencer, strain, sides,
    rhythm: { flatline: rhythm.flatline, ratio: rhythm.ratio, n: rhythm.n }, curve: "unmeasured: no fold is run over the answer (a typed gap, not a verdict)",
    // Useful first: the lead answers; then the tension (where pages differ), the other sides, and the release (what holds).
    sentences: [brief[0]?.s, ...tension.slice(0, 2), ...brief.slice(1).map((x) => x.s), ...release.slice(0, 3)].filter(Boolean),
  }, brief, p2.s));

  // STAGE 4 — the whole cube: the telling. STAGE 5 (the claim sheet) is every atom, rendered by the claim-sheet lens.
  stages.push({ stage: 4, size: "dossier", layers: ["perception", "logos", "pathos", "cube"], sentences: (telling?.cells ?? []).flatMap((c) => c.sentences ?? []) });

  return withSeams({ question: { id: question.id, form: question.form, admits: question.reading?.admits, modality: question.modality, focus: question.focus, undeclared: question.undeclared.map((u) => u.field) }, candidates: n, stages }, touched);
}
