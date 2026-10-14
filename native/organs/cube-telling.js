// cube-telling.js — the research record told as prose, one paragraph per cube cell, with no model. Spec: CALLIMACHUS draft 1, §7.6–§7.9
// (increment D: Kind, Atmosphere, Paradigm) and §9.2 (frames). Pure.
//
//   interpret(record)                       → { facets, grounds, frames } — the three terrains increment C left empty, null-gated
//   cubeTelling(record, { slice, interp })  → { cells: [{ cell, cube, title, sentences }], refused, measures }
//   renderMarkdown(telling) / renderPlain(telling)
//
// THE FULL CUBE. Every sentence is addressed to one of the 27 cells op × grain (kernel/cube.js cellOf, called unchanged: act · terrain ·
// stance). Each cell answers in one of four ways, kept apart (after the callimachus_1 proof, prose.mjs):
//   voiced  — the record holds what the cell's frames need; sentences are emitted
//   silent  — the frames ran and the record has nothing to say there: a finding, not a gap
//   gap     — what the cell needs is not built, or is the author's to say: typed, never filled with something nearby
//   desert  — the cube forbids the cell (SYN · Ground: nothing synthesises a statement from the bare background; the-fold fold-blocks.js)
// Each cell declares its frame words. A frame word outside that set fails PL14 (prose-laws.js verifyWords).
//
// HOW PROSE IS MADE WITHOUT A MOUTH (the telling spec's axiom 5: the mouth phrases only the record):
//   Every sentence is built by prose-laws.js from SEGMENTS. A segment is either frame text (the closed set written in this file, giver: the
//   author, 2026-10-14) or bytes copied from a pinned source at a versioned address: a quotation, a speaker's name, the verb that introduces
//   them, a page's own title. Frame text carries only counts, dates, names the record computed, and grammatical joins; it claims no cause.
//   Each sentence must pass every law in prose-laws.js. A quotation that breaks one is passed over for the next candidate; a frame that
//   breaks one is refused and reported, never shipped. Nothing is paraphrased or translated. What no frame can say is left to the author.
//
// DECLARED STAND-INS (the organs the spec names are not in this tree; every output says so):
//   Kind       — facets are components of the figure co-mention graph; an edge is kept only when its co-mention count clears a one-sided
//                binomial against independence (ATTITUDE_ALPHA). Stands in for kernel/kind-induction's Born tests.
//   Atmosphere — grounds are pages grouped by declared publication month. Stands in for loops/atmosphere.js re-zeroing, absent here.
//   Paradigm   — a page's frame is its dominant facet; frames are reported only when ≥2 facets each dominate ≥2 pages.
import { binomTail, ATTITUDE_ALPHA } from "./callimachus.js";
import { seg, sentence, lintSentence, firstLawful, verifyWords, cleanSpan, narrow, num, agree, LAWS } from "./prose-laws.js";
import { cellOf, GRAINS, OPERATOR_CHAIN } from "../kernel/cube.js";
import { makeComposer, hostOf, monthOf, monthName, dayName, F, V, n, S, joinSegs } from "./composer.js";
import english from "../adapters/text/telling-grammar.en.js";


// ---- increment D ------------------------------------------------------------------------------------------------------------------

export function interpret(record, { alpha = ATTITUDE_ALPHA } = {}) {
  const atoms = record.atoms.filter((a) => a.entities?.length);
  const N = atoms.length;
  const freq = new Map();
  const pair = new Map();
  for (const a of atoms) {
    const es = [...new Set(a.entities)].sort();
    for (const e of es) freq.set(e, (freq.get(e) ?? 0) + 1);
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) { const k = `${es[i]}|${es[j]}`; pair.set(k, (pair.get(k) ?? 0) + 1); }
  }
  const adj = new Map();
  let kindEdges = 0;
  for (const [k, x] of pair) {
    const [a, b] = k.split("|");
    if (x >= 2 && binomTail(x, freq.get(a), freq.get(b) / N) < alpha) {
      kindEdges++;
      (adj.get(a) ?? adj.set(a, new Set()).get(a)).add(b);
      (adj.get(b) ?? adj.set(b, new Set()).get(b)).add(a);
    }
  }
  const seen = new Set();
  const facets = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const comp = [];
    const stack = [start];
    while (stack.length) { const v = stack.pop(); if (seen.has(v)) continue; seen.add(v); comp.push(v); for (const w of adj.get(v) ?? []) stack.push(w); }
    if (comp.length >= 2) facets.push({ id: `k_${facets.length}`, core: comp.sort((x, y) => freq.get(y) - freq.get(x)), atoms: [] });
  }
  for (const a of record.atoms) {
    let best = null, bestN = 0;
    for (const f of facets) { const n = (a.entities ?? []).filter((e) => f.core.includes(e)).length; if (n > bestN) { best = f; bestN = n; } }
    a.facet = best?.id ?? "unsorted";
    if (best) best.atoms.push(a.id);
  }
  facets.sort((x, y) => y.atoms.length - x.atoms.length);

  const byMonth = new Map();
  for (const s of record.sources) { const m = monthOf(s.declared?.published) ?? "undated"; (byMonth.get(m) ?? byMonth.set(m, []).get(m)).push(s.id); }
  const grounds = [...byMonth].map(([month, ids]) => ({ id: `atm_${month}`, month, sources: ids })).sort((a, b) => (a.month === "undated") - (b.month === "undated") || a.month.localeCompare(b.month));
  for (const a of record.atoms) a.ground_id = grounds.find((g) => g.sources.includes(a.pinax))?.id ?? null;

  const dom = {};
  for (const s of record.sources) {
    const c = {};
    for (const a of record.atoms) if (a.pinax === s.id && a.facet !== "unsorted") c[a.facet] = (c[a.facet] ?? 0) + 1;
    dom[s.id] = Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "unsorted";
  }
  const groups = new Map();
  for (const [sid, f] of Object.entries(dom)) if (f !== "unsorted") (groups.get(f) ?? groups.set(f, []).get(f)).push(sid);
  const strong = [...groups].filter(([, ids]) => ids.length >= 2);
  const frames = strong.length >= 2 ? strong.map(([f, ids]) => ({ id: `fr_${f}`, facet: f, sources: ids })) : [];
  for (const a of record.atoms) a.frame_id = frames.find((fr) => fr.sources.includes(a.pinax))?.id ?? null;

  record.ladder = { reached: [...new Set([...record.ladder.reached, "kind", "atmosphere", "paradigm"])], skipped: [], stand_ins: { kind: "co-mention graph, binomial-gated", atmosphere: "publication month", paradigm: "dominant facet" } };
  return { facets, grounds, frames: frames.length ? frames : "single_or_undetermined", kind_edges: kindEdges };
}

// ---- the telling: 27 cells ----------------------------------------------------------------------------------------------------------

// Grammatical join words every cell may use (list joins and the definite article). Giver: the author, 2026-10-14.
const COMMON = "and the";
const W = (s) => new Set(`${COMMON} ${s}`.toLowerCase().split(/\s+/).filter(Boolean));
// Declared frame words per cell (giver: the author, 2026-10-14; English only). A cell with no entry is a desert or a gap.
export const FRAME_WORDS = {
  "NUL·Ground": W("publisher publishers refused the request for its their page pages search returned nothing"),
  "SIG·Ground": W("the question names and pages name it them too nothing recurs in as a figure"),
  "INS·Ground": W("of the pages read came from a search built from words question's own question’s and were added by hand"),
  "NUL·Figure": W("of capitalised words in these pages were declined as figures they are dates or never act any claim"),
  "SIG·Figure": W("the figures named on most pages are of"),
  "INS·Figure": W("in all figures recur and act in some claim of them appear on only one page every appears more than"),
  "NUL·Pattern": W("of claims name no figure in any group"),
  "SIG·Pattern": W("groups group of figures are is named together more often than chance allows no"),
  "INS·Pattern": W("the largest joins next claims claim and"),
  "SEG·Ground": W("the record holds pages page bytes of text in passages passage each pinned by a hash its exact"),
  "CON·Ground": W("their publication dates run from to page pages declares declare none"),
  "SEG·Figure": W("of claims are in a page’s own voice and report someone else them quotation marks"),
  "CON·Figure": W(""),
  "SYN·Figure": W("that"),
  "SEG·Pattern": W("pairs pair of pages that look separate share their wording or cite each other and counts once"),
  "CON·Pattern": W("independent pages carry the same claim one of them in these words no recurs terms on two"),
  "SYN·Pattern": W("about the pages add to each other rather than conflict has and"),
  "DEF·Ground": W("no claim carries a date of its own so the dates here are when pages were published not claims held"),
  "EVA·Ground": W("the pages fall into periods period page with rest undated"),
  "REC·Ground": W("on a second fetch of every page cited bytes held where they were page pages changed its markup but not text could be reached so and was were"),
  "DEF·Figure": W("of pages page speak speaks mostly in their its own voice every no"),
  "EVA·Figure": W("the pages that quote people give floor to different voices quotes and"),
  "REC·Figure": W("silences show too never names whom all of at least two other pages name"),
  "DEF·Pattern": W("the pages divide into camps camp by what they center on for and do not the record can detect"),
  "EVA·Pattern": W("claim claims appears appear with opposite polarity on independent pages no is contradicted between"),
  "REC·Pattern": W(""),
};

export async function cubeTelling(record, { slice, interp, fixity = {}, limits = {}, grammar = english }) {
  const L = { speakers: 8, indirect: 3, agree: 2, divergences: 1, ...limits };
  const ent = Object.fromEntries(record.entities.map((e) => [e.id, e]));
  const atomById = new Map(record.atoms.map((a) => [a.id, a]));
  const pageById = Object.fromEntries(record.sources.map((s) => [s.id, s]));
  const nPages = record.sources.length;
  const quotes = record.atoms.filter((a) => a.why_kind === "quotation");

  const { srcSeg, quoteSeg, nameSegs, names, pageSegs } = makeComposer(record, { slice });
  const blocked = record.absences.filter((a) => a.type === "bot_blocked");
  const loc = record.atoms.filter((a) => a.kind === "located").length;
  // A declared date that does not parse as a calendar date is not a date: that page counts as undated (a page's meta can say anything).
  const pubs = record.sources.map((s) => s.declared?.published).filter((d) => d && !Number.isNaN(Date.parse(`${String(d).slice(0, 10)}T12:00:00Z`))).sort();
  const dated = interp.grounds.filter((g) => g.month !== "undated");

  // THE LENS IS MEDIUM-BLIND. Each cell returns PROPOSITIONS — { type, slots, grounds } or { alts: [...] } (the first lawful wins) — and
  // never a word of any language. Slots are typed references the grammar resolves: { fig } a figure id, { page } a page id, { span } a
  // copied byte address, { count }, { date } (ISO), { month } (YYYY-MM), { host }. The language's grammar
  // (adapters/text/telling-grammar.<lang>.js) realizes them: NL ← grammar ← EOT.
  const P = (type, slots = {}, grounds = []) => ({ type, slots, grounds });
  const SAY = {
    "NUL·Ground": async () => [
      ...(blocked.length ? [P("refused", { hosts: blocked.map((a) => ({ host: hostOf(a.url) })) }, blocked.map((a) => `absence:${a.url}`))] : []),
      ...record.absences.filter((x) => x.type === "searched_absent").map((a) => P("search_empty", { query: { text: a.query } }, [`absence:${a.query}`])),
    ],
    "SIG·Ground": async () => {
      const qr = record.presupposition.question_referents;
      return qr.length ? [P("question_names", { figs: qr.map((id) => ({ fig: id })) }, qr.map((id) => `entity:${id}`))] : [P("question_names_none", {}, ["presupposition"])];
    },
    "INS·Ground": async () => {
      const seeds = record.collection?.seeds ?? [];
      if (!seeds.length) return [];
      const byHand = seeds.filter((x) => x.seed === "operator").length;
      return [P("collection", { read: { count: nPages }, search: { count: Math.max(0, nPages - byHand) }, hand: { count: byHand } }, ["collection"])];
    },
    "SYN·Ground": { desert: "the cube forbids it: nothing synthesises a statement from the bare background (the-fold fold-blocks.js DESERT)" },

    "NUL·Figure": async () => { const k = record.unadmitted_surfaces?.length ?? 0; return k ? [P("declined_names", { k: { count: k } }, ["unadmitted"])] : []; },
    "SIG·Figure": async () => {
      const wide = record.entities.slice().sort((a, b) => b.sources.length - a.sources.length || b.sentences - a.sentences).slice(0, 5);
      return wide.length ? [P("most_named", { items: wide.map((e) => ({ fig: e.id, pages: { count: e.sources.length } })), total: { count: nPages } }, wide.map((e) => `entity:${e.id}`))] : [];
    },
    "INS·Figure": async () => [P("figures_total", { k: { count: record.entities.length }, single: { count: record.entities.filter((e) => e.sources.length === 1).length } }, ["entities"])],

    "NUL·Pattern": async () => { const u = record.atoms.filter((a) => a.facet === "unsorted").length; return u ? [P("unsorted", { claims: { count: record.atoms.length }, unsorted: { count: u } }, ["unsorted"])] : []; },
    "SIG·Pattern": async () => interp.facets.length ? [P("groups", { k: { count: interp.facets.length } }, interp.facets.flatMap((f) => f.atoms.slice(0, 2)))] : [P("groups_none", {}, ["facet:none"])],
    "INS·Pattern": async () => interp.facets.length ? [P("largest_groups", { groups: interp.facets.slice(0, 2).map((f) => ({ figs: f.core.slice(0, 3).map((id) => ({ fig: id })), claims: { count: f.atoms.length } })) }, interp.facets.slice(0, 2).flatMap((f) => f.atoms))] : [],

    "SEG·Ground": async () => [P("holdings", { pages: { count: nPages }, bytes: { count: record.sources.reduce((k, s) => k + s.stichometry.bytes, 0) }, passages: { count: record.sources.reduce((k, s) => k + s.stichometry.passages, 0) } }, record.sources.map((s) => s.id))],
    "CON·Ground": async () => pubs.length ? [P("pub_range", { from: { date: pubs[0] }, to: { date: pubs.at(-1) }, undated: { count: nPages - pubs.length } }, record.sources.filter((s) => pubs.includes(s.declared?.published)).map((s) => s.id))] : [],
    "SEG·Figure": async () => [P("voices", { claims: { count: record.atoms.length }, own: { count: loc }, reported: { count: record.atoms.length - loc }, quoted: { count: quotes.length } }, ["claims"])],
    "CON·Figure": async () => {
      const bySpeaker = new Map();
      for (const a of quotes.filter((x) => x.giver?.surface && !x.giver.pronoun && /^\p{Lu}/u.test(x.giver.surface_verbatim ?? ""))) { const k = a.giver.referent ?? `sfc:${a.giver.surface_verbatim}`; (bySpeaker.get(k) ?? bySpeaker.set(k, []).get(k)).push(a); }
      return [...bySpeaker].sort((x, y) => y[1].length - x[1].length).slice(0, L.speakers * 2).map(([, as]) => ({ alts: as.slice().sort((x, y) => y.span.length - x.span.length).map((a) => P("said", { who: { span: a.giver.surface }, verb: { span: a.giver.attitude }, quote: { span: a.span, quoted: true } }, [a.id])), take: 1, cap: L.speakers }));
    },
    "SYN·Figure": async () => {
      // Indirect speech only through verbs this corpus uses to frame direct quotations (earned by quote adjacency).
      const speech = new Set(Object.entries(record.attitudes?.earned ?? {}).filter(([, v]) => v.by === "quote_adjacency").map(([k]) => k));
      const seenGiver = new Set();
      const out = [];
      for (const a of record.atoms.filter((x) => x.why_kind === "embedding" && x.giver?.referent && x.relation?.obj_surface && speech.has(String(x.giver.attitude_verbatim).toLowerCase()))) {
        if (seenGiver.has(a.giver.referent)) continue;
        seenGiver.add(a.giver.referent);
        out.push({ alts: [P("said_that", { who: { span: a.giver.surface }, verb: { span: a.giver.attitude }, clause: { span: a.relation.obj_surface, clause: true } }, [a.id])], take: 1, cap: L.indirect });
      }
      return out;
    },

    "SEG·Pattern": async () => {
      const col = record.claims.flatMap((c) => c.collapses.filter((x) => x.reason !== "same_source"));
      const pairs = new Set(col.map((x) => [atomById.get(x.a).pinax, atomById.get(x.b).pinax].sort().join("|")));
      return pairs.size ? [P("collapses", { pairs: { count: pairs.size } }, col.flatMap((x) => [x.a, x.b]))] : [];
    },
    "CON·Pattern": async () => {
      const ag = record.claims.filter((c) => c.standing === "AGREE");
      if (!ag.length) return [P("agree_none", {}, ["agree:none"])];
      return ag.map((c) => ({ alts: c.atoms.map((id) => P("agree", { k: { count: c.independent_count }, quote: { span: atomById.get(id).span, quoted: true } }, c.atoms)), take: 1, cap: L.agree }));
    },
    "SYN·Pattern": async () => {
      const groups = new Map();
      for (const c of record.claims.filter((x) => x.standing === "UNDETERMINED")) { const [s, p] = c.key.split("|"); (groups.get(`${s}|${p}`) ?? groups.set(`${s}|${p}`, []).get(`${s}|${p}`)).push(c); }
      const divs = [...groups].map(([k, cs]) => [k, cs, new Set(cs.flatMap((c) => c.atoms.map((id) => atomById.get(id).pinax)))]).filter(([, , s]) => s.size >= 2).sort((x, y) => y[2].size - x[2].size);
      return divs.map(([k, cs]) => {
        const [subj] = k.split("|");
        const byPage = new Map();
        for (const c of cs) for (const id of c.atoms) { const a = atomById.get(id); (byPage.get(a.pinax) ?? byPage.set(a.pinax, []).get(a.pinax)).push(a); }
        const pages = [...byPage.keys()];
        const alts = [];
        for (let i = 0; i < pages.length && alts.length < 12; i++) for (let j = i + 1; j < pages.length && alts.length < 12; j++) {
          const [x, y] = [byPage.get(pages[i])[0], byPage.get(pages[j])[0]];
          alts.push(P("differ", { subject: { fig: subj }, pageA: { page: x.pinax }, quoteA: { span: x.span, quoted: true }, pageB: { page: y.pinax }, quoteB: { span: y.span, quoted: true } }, [x.id, y.id]));
        }
        return { alts, take: 1, cap: L.divergences };
      });
    },

    "DEF·Ground": async () => [P("undated_claims", {}, ["valid_time:none"])],
    "EVA·Ground": async () => dated.length ? [P("periods", { items: dated.map((g) => ({ month: g.month, pages: { count: g.sources.length } })), undated: { flag: interp.grounds.some((g) => g.month === "undated") } }, dated.flatMap((g) => g.sources))] : [],
    "REC·Ground": async () => {
      const vs = Object.values(fixity);
      if (!vs.length) return [];
      const c = (k) => vs.filter((v) => v.verdict === k).length;
      return [P("fixity", { held: { count: c("intact") + c("re_encoded") }, reencoded: { count: c("re_encoded") }, changed: { count: c("altered") + c("revised") + c("moved") }, unreached: { count: c("unchecked") } }, Object.keys(fixity))];
    },

    "DEF·Figure": async () => {
      const own = record.sources.filter((s) => { const m = record.atoms.filter((a) => a.pinax === s.id); return m.length && m.filter((a) => a.kind === "reported").length * 2 <= m.length; });
      return [P("own_voice", { pages: { count: nPages }, own: { count: own.length } }, own.length ? own.map((s) => s.id) : ["lens:none"])];
    },
    "EVA·Figure": async () => {
      const floors = [];
      for (const s of record.sources) { const ids = [...new Set(quotes.filter((a) => a.pinax === s.id && a.giver?.referent).map((a) => a.giver.referent))].slice(0, 3); if (ids.length) floors.push([s, ids]); }
      return floors.length ? [P("floors", { items: floors.slice(0, 4).map(([s, ids]) => ({ page: s.id, figs: ids.map((id) => ({ fig: id })) })) }, floors.map(([s]) => s.id))] : [];
    },
    "REC·Figure": async () => {
      const silent = record.sources.map((s) => [s, (record.omissions[s.id] ?? []).filter((id) => ent[id])]).filter(([, om]) => om.length).sort((x, y) => y[1].length - x[1].length);
      if (!silent.length) return [];
      const [s, om] = silent[0];
      return [P("silences", { page: { page: s.id }, figs: om.slice(0, 3).map((id) => ({ fig: id })) }, [s.id])];
    },

    "DEF·Pattern": async () => {
      if (!Array.isArray(interp.frames) || !interp.frames.length) return [P("camps_none", {}, ["paradigm:single_or_undetermined"])];
      return [P("camps", { items: interp.frames.map((fr) => ({ figs: interp.facets.find((x) => x.id === fr.facet).core.slice(0, 2).map((id) => ({ fig: id })), pages: fr.sources.map((sid) => ({ page: sid })) })) }, interp.frames.flatMap((f) => f.sources))];
    },
    "EVA·Pattern": async () => { const k = record.claims.filter((c) => c.standing === "CONTRADICTED"); return [P("contested", { k: { count: k.length } }, k.length ? k.flatMap((c) => c.atoms) : ["contest:none"])]; },
    "REC·Pattern": { gap: "author", why: "what the material means for the question, and what should follow from it, is the author's to say" },
  };

  const realize = realizer(record, { slice, grammar });

  const cells = [];
  const refused = [];
  for (const op of OPERATOR_CHAIN) for (const grain of GRAINS) {
    const key = `${op}·${grain}`;
    const c = cellOf(op, grain);
    const base = { key, op, grain, terrain: c.terrain, stance: c.stance, domain: c.domain };
    const f = SAY[key];
    if (!f) { cells.push({ ...base, status: "gap", why: "no proposition declared" }); continue; }
    if (f.desert) { cells.push({ ...base, status: "desert", why: f.desert }); continue; }
    if (f.gap) { cells.push({ ...base, status: "gap", why: f.why, owner: f.gap }); continue; }
    const items = (await f()) ?? [];
    const ok = [];
    const capHits = new Map();
    for (const it of items) {
      const alts = it.alts ?? [it];
      const cap = it.cap ?? Infinity;
      const capKey = it.alts ? "alts" : "single";
      if ((capHits.get(capKey) ?? 0) >= cap) continue;
      for (const prop of alts) {
        const r = await realize(prop);
        if (r.sentence) { ok.push(r.sentence); capHits.set(capKey, (capHits.get(capKey) ?? 0) + 1); break; }
        refused.push({ cell: key, text: r.refused.text ?? prop.type, violations: r.refused.violations });
      }
    }
    cells.push({ ...base, status: ok.length ? "voiced" : "silent", sentences: ok });
  }
  // Paragraph law across a terrain's three cells read in order: a repeated opener is refused, never reworded.
  return { cells, refused, titles: grammar.titles, lang: grammar.lang, giver: grammar.giver, measures: await measureTelling(cells, { slice, grammar }) };
}


/**
 * The realizer, shared by every lens: a proposition { type, slots, grounds } → a lawful sentence in `grammar`'s language, or a typed
 * refusal. Slots resolve to copied bytes with addresses; the grammar writes only its construction's own words around them.
 */
export function realizer(record, { slice, grammar = english }) {
  const pageById = Object.fromEntries(record.sources.map((s) => [s.id, s]));
  const { srcSeg, quoteSeg, nameSegs, pageSegs } = makeComposer(record, { slice });
  // RESOLVE: a proposition's typed slots become segments — figures and spans as copied bytes with addresses, pages as host or title
  // bytes. Nothing here is language: the grammar receives segments and writes only its own construction's words around them.
  const resolveSlot = async (key, v) => {
    if (v == null) return v;
    if (Array.isArray(v)) { const xs = await Promise.all(v.map((x) => resolveSlot(key, x))); return xs.some((x) => x == null) ? null : xs; }
    if (typeof v !== "object") {
      if (key === "fig") return nameSegs(v);
      if (key === "page") return pageById[v] ? pageSegs(pageById[v]) : null;
      return v;
    }
    const ks = Object.keys(v);
    if (ks.length === 1) {
      if ("fig" in v) return nameSegs(v.fig);
      if ("page" in v) return pageById[v.page] ? pageSegs(pageById[v.page]) : null;
      if ("host" in v) return [V(v.host)];
      if ("count" in v) return v.count;
      if ("date" in v) return v.date;
      if ("text" in v) return [V(v.text)];
      if ("flag" in v) return !!v.flag;
    }
    if ("span" in v) {
      if (v.quoted) return quoteSeg(v.span);
      const t = await srcSeg(v.span);
      if (!t || !v.clause) return t;
      // A reported clause: the source's own complementiser is left out by narrowing (the construction supplies its own), and the clause
      // ends at its first colon or semicolon. Narrowed, never edited.
      const lead = grammar.complementiser?.exec(t.t);
      const stop = t.t.search(/[:;]/);
      const nn = lead || stop > 0 ? narrow(t.address, t.t, lead ? lead[0].length : 0, stop > 0 ? stop : t.t.length) : null;
      return nn ? seg.source(nn.text, nn.address) : t;
    }
    const out = {};
    for (const [k, x] of Object.entries(v)) { out[k] = await resolveSlot(k, x); if (out[k] === null) return null; }
    return out;
  };
  return async (prop) => {
    const make = grammar.constructions[prop.type];
    if (!make) return { refused: { violations: [{ law: "PL14", detail: `no ${grammar.lang} construction for ${prop.type}` }] } };
    const slots = await resolveSlot("", prop.slots);
    if (slots === null) return { refused: { violations: [{ law: "PL13", detail: "a slot did not resolve to verified bytes" }] } };
    const segs = make(slots);
    if (!segs) return { refused: { violations: [{ law: "PL14", detail: `${prop.type}: the construction cannot say this` }] } };
    const s = grammar.finish(segs, prop.grounds);
    s.prop = prop;
    const v = [...lintSentence(s, grammar), ...verifyWords(s, grammar.frameWords[prop.type] ?? new Set())];
    return v.length ? { refused: { text: s.text, violations: v } } : { sentence: s };
  };

}

// ---- measures ---------------------------------------------------------------------------------------------------------------------

/** Same rule as the-fold telling.mjs `referenceContinuity` (adjacent pairs sharing a content word of ≥4 letters). */
export function referenceContinuity(lines) {
  const ls = lines.filter(Boolean);
  if (ls.length < 2) return 100;
  const cw = (t) => new Set((t.toLowerCase().match(/[\p{L}'’]+/gu) ?? []).filter((w) => w.length >= 4));
  let pairs = 0, shared = 0;
  for (let i = 0; i < ls.length - 1; i++) { const a = cw(ls[i]), b = cw(ls[i + 1]); pairs++; if ([...a].some((w) => b.has(w))) shared++; }
  return Math.round((shared / pairs) * 100);
}

async function measureTelling(cells, { slice, grammar = null }) {
  const all = cells.flatMap((c) => c.sentences ?? []);
  let srcSegs = 0, verified = 0;
  for (const s of all) for (const x of s.segs.filter((y) => y.kind === "source")) { srcSegs++; if ((await slice(x.address)) === x.t) verified++; }
  const words = (t) => (String(t).match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
  const total = all.reduce((k, s) => k + words(s.text), 0);
  const by = (kind) => all.reduce((k, s) => k + s.segs.filter((x) => x.kind === kind).reduce((m, x) => m + words(x.t), 0), 0);
  const status = cells.reduce((m, c) => ((m[c.status] = (m[c.status] ?? 0) + 1), m), {});
  const terrains = [...new Set(cells.map((c) => c.terrain))];
  return {
    cells: status,
    sentences: all.length,
    lawful: `${all.filter((s) => !lintSentence(s, grammar).length).length}/${all.length}`,
    grounded: `${all.filter((s) => s.grounds.length).length}/${all.length}`,
    source_segments_verified: `${verified}/${srcSegs}`,
    words: { total, source_bytes: by("source"), values: by("value"), frame: by("frame") },
    continuity_within_terrains: Math.round(terrains.reduce((k, t) => k + referenceContinuity(cells.filter((c) => c.terrain === t).flatMap((c) => (c.sentences ?? []).map((s) => s.text))), 0) / terrains.length),
    model_calls: 0,
  };
}

// ---- rendering ----------------------------------------------------------------------------------------------------------------------

const escHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TERRAIN_TITLE = { Void: "What is missing", Entity: "Who is named", Kind: "What is named together", Field: "What was read", Link: "Who says what", Network: "What holds across pages", Atmosphere: "When, and whether it held", Lens: "Where each page stands", Paradigm: "How the pages divide" };
const TERRAIN_ORDER = ["Void", "Entity", "Kind", "Field", "Link", "Network", "Atmosphere", "Lens", "Paradigm"];

/** The cells in reading order: terrain by terrain, each terrain's three cells in stance (operator) order. Render and address share it. */
export const readingOrder = (t) => TERRAIN_ORDER.flatMap((terrain) => t.cells.filter((c) => c.terrain === terrain));

/** HTML-in-markdown: one paragraph per terrain, its three cells in stance order; every source segment is a <span data-addr>. */
export function renderMarkdown(t) {
  return TERRAIN_ORDER.map((terrain) => {
    const cs = t.cells.filter((c) => c.terrain === terrain);
    const body = cs.map((c) => {
      if (c.status === "voiced") return c.sentences.map((s) => `<span class="s" data-cell="${c.key}" title="${escHtml(`${c.key} · ${c.terrain} · ${c.stance}`)}" data-grounds="${escHtml(s.grounds.slice(0, 12).join(" "))}">${s.segs.map((x) => (x.kind === "source" ? `<span class="src" data-addr="${escHtml(x.address)}">${escHtml(x.t)}</span>` : x.kind === "value" ? `<span class="val">${escHtml(x.t)}</span>` : escHtml(x.t))).join("")}</span>`).join(" ");
      return "";
    }).filter(Boolean).join(" ");
    const marks = cs.map((c) => `<span class="cell ${c.status}" title="${escHtml(`${c.key} · ${c.stance} · ${c.status}${c.why ? `: ${c.why}` : ""}`)}">${c.stance}</span>`).join("");
    return `### ${(t.titles ?? TERRAIN_TITLE)[terrain]}\n<p class="cube">${marks}</p>\n\n<p>${body || "<em>Nothing here.</em>"}</p>`;
  }).join("\n\n");
}

export function renderPlain(t) {
  return TERRAIN_ORDER.map((terrain) => `${(t.titles ?? TERRAIN_TITLE)[terrain]}\n\n${t.cells.filter((c) => c.terrain === terrain && c.status === "voiced").flatMap((c) => c.sentences.map((s) => s.text)).join(" ")}`).join("\n\n");
}

export { LAWS };
