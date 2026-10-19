// reading-timeline.js — a text is read in order, and what has been read keeps changing what was thought.
//
// The layered pipeline reads the whole text once per layer. A reader does not: it meets a sentence,
// forms a reading, and the NEXT sentence can overturn it — a name it could not place is defined two
// sentences on; "Curie" turns out to be "Marie Curie"; "she" was nobody until a name arrived; a
// relation it bound to the wrong endpoint is rebound. This organ replays that. It reads the text as
// of the end of each sentence (the reading of a PREFIX, never a reading that has seen the future),
// then diffs consecutive prefixes: every difference is a REVISION, and a revision names what
// changed, what it was, what it became, and the sentence whose arrival changed it.
//
// Nothing here owns a prior or a parser: the classifier, the sentence splitter and the engine's own
// surface/referent/pronoun organs are injected. A snapshot is a candidate reading — as revisable as
// the next sentence — never a settled fact.
export const READING_TIMELINE_SCHEMA = "EOReadingTimeline@1";

const topUpos = (c) => (c?.found && c.candidates?.length ? c.candidates[0].upos : null);
const labelOf = (c) => {
  if (!c?.found) return { upos: null, ambiguous: false, attested: null, via: [] };
  const via = (c.via ?? []).map((v) => v.step).filter((x) => x !== "edge-punctuation" && x !== "apostrophe" && x !== "unicode");
  return { upos: topUpos(c), ambiguous: c.candidates.length > 1, attested: c.attested ?? (c.inferred ? "act" : "treebank"), via, evidence: c.evidence ?? null };
};
const sameLabel = (a, b) => a.upos === b.upos && a.attested === b.attested;

/** every occurrence of `surface` (whole-word) in `text`, as [start, end] */
const occurrences = (text, surface) => {
  const out = [];
  if (!surface) return out;
  const esc = surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "gu");
  for (const m of text.matchAll(re)) out.push([m.index, m.index + surface.length]);
  return out;
};

/** names and pronouns of one prefix, each bound to the referent it currently belongs to */
function corefOf(prefixSents, prefixText, deps, { minActivation, minMargin }) {
  const { extractSurfaces, discoverReferents, resolvePronouns } = deps;
  const out = { referents: [], mentions: [] };
  if (!extractSurfaces || !discoverReferents || !prefixSents.length) return out;
  let discovery;
  try { discovery = discoverReferents(extractSurfaces(prefixSents, {}), {}); } catch { return out; }
  const events = discovery?.events ?? [];
  if (!events.length) return out;
  const surfaceToRef = new Map(events.map((e) => [e.surface, e.referent_id]));
  const best = new Map();
  const members = new Map();
  for (const e of events) {
    const p = best.get(e.referent_id);
    if (!p || e.surface.length > p.length) best.set(e.referent_id, e.surface);
    (members.get(e.referent_id) ?? members.set(e.referent_id, new Set()).get(e.referent_id)).add(e.surface);
  }
  // the longest surface wins an overlap: "Marie Curie" is one mention, not "Marie" + "Curie" + "Marie Curie"
  const cands = [];
  for (const [surface, id] of surfaceToRef) for (const [s, e] of occurrences(prefixText, surface)) cands.push({ s, e, id });
  cands.sort((a, b) => (b.e - b.s) - (a.e - a.s) || a.s - b.s);
  for (const c of cands) {
    if (out.mentions.some((m) => m.s < c.e && c.s < m.e)) continue;
    out.mentions.push({ kind: "name", s: c.s, e: c.e, text: prefixText.slice(c.s, c.e), ref: c.id });
  }
  if (resolvePronouns) {
    try {
      const r = resolvePronouns(prefixSents, surfaceToRef, { minActivation, minMargin });
      for (const b of r?.bindings ?? []) out.mentions.push({ kind: "pronoun", s: b.offset, e: b.offset + b.pronoun.length, text: b.pronoun, ref: b.referentId });
      for (const g of r?.gaps ?? []) if (g?.offset != null && g.pronoun) out.mentions.push({ kind: "pronoun", s: g.offset, e: g.offset + g.pronoun.length, text: g.pronoun, ref: null });
    } catch { /* a reader that cannot bind pronouns still reads names */ }
  }
  out.mentions.sort((a, b) => a.s - b.s);
  for (const m of out.mentions) m.name = m.ref != null ? best.get(m.ref) ?? null : null;
  out.referents = [...best].map(([id, name]) => ({ id, name, surfaces: [...members.get(id)].sort(), mentions: out.mentions.filter((m) => m.ref === id).length }));
  return out;
}

/**
 * @param {string} text
 * @param {{splitSentences: Function, wordsIn: (text:string, base:number)=>Array<{w:string,s:number,e:number}>,
 *   classifyAt: (prefixText:string)=>((form:string)=>object), extractSurfaces?: Function, discoverReferents?: Function,
 *   resolvePronouns?: Function, readClaims?: (prefixText:string)=>Array<object>}} deps
 * @param {{maxSnapshots?: number, minActivation?: number, minMargin?: number}} [opts]
 */
export function buildReadingTimeline(text, deps, opts = {}) {
  const { splitSentences, wordsIn, classifyAt, readClaims = null } = deps;
  if (typeof splitSentences !== "function" || typeof wordsIn !== "function" || typeof classifyAt !== "function")
    throw new TypeError("buildReadingTimeline: splitSentences, wordsIn and classifyAt are injected — the organ owns no parser and no prior");
  const { maxSnapshots = 40, minActivation = 0.05, minMargin = 0.2 } = opts;
  const src = String(text ?? "");
  const sents = splitSentences(src).map((s, i) => ({ n: i + 1, offset: s.offset, end: s.offset + s.text.length, text: s.text }));
  const n = sents.length;
  const words = [];
  sents.forEach((s, si) => { for (const w of wordsIn(s.text, s.offset)) words.push({ w: w.w, s: w.s, e: w.e, si }); });
  const stride = Math.max(1, Math.ceil(n / maxSnapshots));
  const fronts = [];
  for (let j = stride; j < n; j += stride) fronts.push(j);
  if (n) fronts.push(n);

  const snaps = [];
  for (const f of fronts) {
    const prefixText = src.slice(0, sents[f - 1].end);
    const classify = classifyAt(prefixText);
    const tokens = new Map();
    for (const w of words) if (w.si < f) tokens.set(w.s, { w: w.w, s: w.s, e: w.e, ...labelOf(classify(w.w)) });
    const coref = corefOf(sents.slice(0, f).map((s) => ({ text: s.text, offset: s.offset, order: s.n - 1 })), prefixText, deps, { minActivation, minMargin });
    let claims = [];
    if (readClaims) { try { claims = readClaims(prefixText).map((c) => ({ key: `${c.label}|${c.span ?? ""}|${c.s ?? ""}`, end1: c.end1, label: c.label, end2: c.end2, polarity: c.polarity ?? "+", located: c.located !== false, s: c.located === false ? null : (c.s ?? null), e: c.located === false ? null : (c.e ?? null), verdict: c.verdict ?? null, raw: c })); } catch { claims = []; } }
    snaps.push({ frontier: f, tokens, mentions: coref.mentions, referents: coref.referents, claims });
  }

  // revisions: what the sentences just read changed about what had already been read
  const revisions = snaps.map(() => []);
  for (let i = 1; i < snaps.length; i++) {
    const a = snaps[i - 1], b = snaps[i], newFrom = sents[a.frontier]?.offset ?? Infinity;
    const cause = (at) => ({ sentence: sents.findIndex((s) => s.offset <= at && at < s.end) + 1 });
    for (const [s, tb] of b.tokens) {
      const ta = a.tokens.get(s); if (!ta || sameLabel(ta, tb)) continue;
      const ev = (tb.evidence ?? []).filter((x) => x.at && x.at[0] >= newFrom);
      revisions[i].push({ kind: "pos", s: tb.s, e: tb.e, text: tb.w, from: ta.upos ?? "no entry", to: tb.upos ?? "no entry", fromBy: ta.attested, toBy: tb.attested, evidence: tb.evidence ?? null,
        because: ev.length ? { ...cause(ev[0].at[0]), kinds: [...new Set(ev.map((x) => x.kind))], at: ev[0].at } : { sentence: b.frontier } });
    }
    const nameAt = (snap) => new Map(snap.mentions.map((m) => [m.s, m]));
    const ma = nameAt(a);
    for (const m of b.mentions) {
      const p = ma.get(m.s); if (!p) continue;
      if (p.kind !== m.kind || p.name === m.name) continue;
      revisions[i].push({ kind: m.kind === "pronoun" ? "pronoun" : "referent", s: m.s, e: m.e, text: m.text, from: p.name ?? (p.kind === "pronoun" ? "unresolved" : "—"), to: m.name ?? "unresolved", because: { sentence: b.frontier } });
    }
    // a name that grew: a mention that was "Curie" and is now inside the longer "Marie Curie"
    for (const m of b.mentions) {
      if (m.kind !== "name" || ma.has(m.s)) continue;
      const inner = a.mentions.filter((p) => p.kind === "name" && p.s >= m.s && p.e <= m.e && p.text !== m.text);
      if (inner.length) revisions[i].push({ kind: "referent", s: m.s, e: m.e, text: m.text, from: inner.map((p) => p.text).join(" + "), to: m.text, because: { sentence: b.frontier } });
    }
    // a referent the reading had established and now no longer does: retracted by what was just read
    const namesB = new Set(b.referents.map((r) => r.name));
    for (const r of a.referents) {
      if (namesB.has(r.name)) continue;
      const absorbed = b.referents.find((x) => x.surfaces.some((sf) => r.surfaces.includes(sf)));
      if (absorbed) continue; // renamed or merged — reported as a referent revision on its mentions
      revisions[i].push({ kind: "referent-retracted", s: null, e: null, text: r.name, from: `${r.name} ×${r.mentions}`, to: "no longer established", because: { sentence: b.frontier, why: "no longer admitted by the engine at this length — its admission floor is derived from the text read so far, so a longer text can drop a referent a shorter one admitted" } });
    }
    const ca = new Map(a.claims.map((c) => [c.key, c]));
    for (const c of b.claims) {
      const p = ca.get(c.key); if (!p) continue;
      if (p.end1 !== c.end1 || p.end2 !== c.end2) revisions[i].push({ kind: "claim", s: c.s, e: c.e, text: c.label, from: `${p.end1} → ${p.end2}`, to: `${c.end1} → ${c.end2}`, because: { sentence: b.frontier } });
    }
    const cb = new Set(b.claims.map((c) => c.key));
    for (const p of a.claims) if (!cb.has(p.key)) revisions[i].push({ kind: "claim-retracted", s: p.s, e: p.e, text: p.label, from: `${p.end1} —${p.label}→ ${p.end2}`, to: "no longer bound", because: { sentence: b.frontier } });
  }
  return {
    schema: READING_TIMELINE_SCHEMA, unit: "utf16", stride, sentences: sents, words,
    snapshots: snaps.map((sn, i) => ({ frontier: sn.frontier, tokens: [...sn.tokens.values()], mentions: sn.mentions, referents: sn.referents, claims: sn.claims, revisions: revisions[i] })),
    revisions: revisions.flat(),
  };
}
