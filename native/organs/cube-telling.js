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
// THE ENGINE'S OWN CELL ORGANS (organs/telling-organs.js, thin adapters; the stand-ins that preceded them are retired, before/after
// in docs/CALLIMACHUS.md §10):
//   Kind       — SIG·Pattern `kinds` (kernel/terrain-induction.js) over the figures, each challenged by NUL·Pattern `kindnull`
//                (entity-kind-induction.js testKindMembers); a group is told only when both nulls pass.
//   Atmosphere — REC·Ground `regime` (source.js atmosphereBoundaries → loops/atmosphere.js readAtmosphere) and EVA·Ground `atmosphere`
//                (the-fold/aperture.js meter), the pages read in order of publication.
//   Paradigm   — the same terrain induction over the PAGES (a camp is an induced kind of page), EVA·Pattern `standing`
//                (capacity-runner.js mergeTestimony) per claim; REC·Pattern `reshape` needs the question's void loop, which is not run here.
import { seg, sentence, lintSentence, firstLawful, verifyWords, cleanSpan, narrow, num, agree, LAWS } from "./prose-laws.js";
import { cellOf, GRAINS, OPERATOR_CHAIN } from "../kernel/cube.js";
import { makeComposer, hostOf, monthOf, monthName, dayName, F, V, n, S, joinSegs } from "./composer.js";
import { kindTerrain, paradigmTerrain, atmosphereTerrain, testimonyOf } from "./telling-organs.js";
import english from "../adapters/text/telling-grammar.en.js";
import { giverOf, giverSlot, isIndex } from "./giver.js";


// ---- the three terrains, by their registered organs ----------------------------------------------------------------------------------

/**
 * interpret(record, { textOf }) → { facets, kinds, grounds, atmosphere, frames, paradigm, testimony }. Writes a.facet, a.ground_id and
 * a.frame_id on every atom (read by the telling and the answer ladder) and c.testimony on every claim. `textOf(pageId)` supplies the
 * pinned text the Atmosphere reads; without it the Atmosphere is a typed gap.
 */
export function interpret(record, { textOf = null } = {}) {
  const kind = kindTerrain(record);
  const facets = kind.held.map((k, i) => ({ id: `k_${i}`, kind: k.id, core: k.members, atoms: [] }));
  const share = new Map(record.entities.map((e) => [e.id, e.sources.length]));
  for (const f of facets) f.core.sort((x, y) => (share.get(y) ?? 0) - (share.get(x) ?? 0) || x.localeCompare(y));
  for (const a of record.atoms) {
    let best = null, bestN = 0;
    for (const f of facets) { const k = (a.entities ?? []).filter((e) => f.core.includes(e)).length; if (k > bestN) { best = f; bestN = k; } }
    a.facet = best?.id ?? "unsorted";
    if (best) best.atoms.push(a.id);
  }
  facets.sort((x, y) => y.atoms.length - x.atoms.length);

  const atmosphere = atmosphereTerrain(record, { textOf });
  const grounds = atmosphere.gap || atmosphere.regime.declined ? [] : atmosphere.regime.regions;
  if (atmosphere.gap) for (const a of record.atoms) a.ground_id = null;

  const paradigm = paradigmTerrain(record);
  const frames = paradigm.held.map((k, i) => ({ id: `fr_${i}`, kind: k.id, sources: k.members, figs: k.shares.filter((x) => x.feature === "names").map((x) => x.value) }));
  for (const a of record.atoms) a.frame_id = frames.find((fr) => fr.sources.includes(a.pinax))?.id ?? null;

  const testimony = testimonyOf(record);
  for (const c of record.claims) c.testimony = testimony.get(c.key);

  const organs = { kind: "kinds+kindnull (terrain-induction over figures)", atmosphere: "regime+atmosphere (atmosphereBoundaries, aperture meter)", paradigm: "terrain-induction over pages + standing (mergeTestimony)" };
  record.ladder = { reached: [...new Set([...record.ladder.reached, "kind", "atmosphere", "paradigm"])], skipped: atmosphere.gap ? ["atmosphere"] : [], ...(atmosphere.gap ? { why_skipped: { atmosphere: atmosphere.gap } } : {}), organs };
  return { facets, kinds: kind, grounds, atmosphere, frames, paradigm, testimony: Object.fromEntries(testimony) };
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
  "NUL·Pattern": W("with their pairings shuffled every found tested when again against random sets same size groups group hold holds of claims name no figure in any group"),
  "SIG·Pattern": W("groups group of figures are is named together more often than chance allows no"),
  "INS·Pattern": W("group the largest joins next claims claim and"),
  "SEG·Ground": W("the record holds pages page bytes of text in passages passage each pinned by a hash its exact"),
  "CON·Ground": W("their publication dates run from to page pages declares declare none"),
  "SEG·Figure": W("of claims are in a page’s own voice and report someone else them quotation marks"),
  "CON·Figure": W(""),
  "SYN·Figure": W("that"),
  "SEG·Pattern": W("pairs pair of pages that look separate share their wording or cite each other and counts once"),
  "CON·Pattern": W("independent pages carry the same claim here it is as has no recurs in terms on two"),
  "SYN·Pattern": W("about two voices add to each other rather than conflict has and"),
  "DEF·Ground": W("no claim carries a date of its own so the dates here are when pages were published not claims held"),
  "EVA·Ground": W("page by in order publication no brought wording before it them did not predict kept closer to than chance first had nothing the pages fall into periods period page with rest undated"),
  "REC·Ground": W("taken whole wording shifts once times a new stretch begins with holds as one throughout on a second fetch of every page cited bytes held where they were page pages changed its markup but not text could be reached so and was were"),
  "DEF·Figure": W("of pages page speak speaks mostly in their its own voice every no"),
  "EVA·Figure": W("the pages that quote people give floor to different voices quotes and"),
  "REC·Figure": W("silences show too never names whom all of at least two other pages name"),
  "DEF·Pattern": W("of form forms one by figures name centered on other stand stands apart the pages divide into camps camp by what they center on for and do not the record can detect"),
  "EVA·Pattern": W("claim claims appears appear with opposite polarity on independent pages no is contradicted between"),
  "REC·Pattern": W(""),
};

export async function cubeTelling(record, { slice, interp, fixity = {}, limits = {}, grammar = english }) {
  const L = { speakers: 8, indirect: 3, agree: 2, divergences: 1, ...limits };
  const ent = Object.fromEntries(record.entities.map((e) => [e.id, e]));
  const atomById = new Map(record.atoms.map((a) => [a.id, a]));
  const pageById = Object.fromEntries(record.sources.map((s) => [s.id, s]));
  const nPages = record.sources.length;
  // An encyclopedia is an INDEX, never quoted as a source; and a claim is cited to a person or a body on the record, never a publication.
  const citable = (a) => !isIndex(record, a.pinax) && giverOf(a, record).kind !== "none";
  const quotes = record.atoms.filter((a) => a.why_kind === "quotation" && !isIndex(record, a.pinax));

  const { srcSeg, quoteSeg, nameSegs, names, pageSegs } = makeComposer(record, { slice });
  const blocked = record.absences.filter((a) => a.type === "bot_blocked");
  const loc = record.atoms.filter((a) => a.kind === "located").length;
  // A declared date that does not parse as a calendar date is not a date: that page counts as undated (a page's meta can say anything).
  const pubs = record.sources.map((s) => s.declared?.published).filter((d) => d && !Number.isNaN(Date.parse(`${String(d).slice(0, 10)}T12:00:00Z`))).sort();
  const atm = interp.atmosphere ?? { gap: "not interpreted" };

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

    "NUL·Pattern": async () => {
      // kindnull: every group the inducer nominated, challenged again as a declared membership (testKindMembers).
      const tried = (interp.kinds?.kinds ?? []).filter((k) => !k.induced.fallback && k.challenged.cleared != null);
      const u = record.atoms.filter((a) => a.facet === "unsorted").length;
      return [
        ...(tried.length ? [P("kinds_challenged", { held: { count: tried.filter((k) => k.holds).length }, tried: { count: tried.length } }, tried.map((k) => `kind:${k.id}`))] : []),
        ...(u && interp.facets.length ? [P("unsorted", { claims: { count: record.atoms.length }, unsorted: { count: u } }, ["unsorted"])] : []),
      ];
    },
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
      return ag.map((c) => ({ alts: c.atoms.map((id) => atomById.get(id)).filter(citable).map((a) => { const g = giverOf(a, record); const by = a.why_kind === "quotation" ? (a.giver?.surface ? { names: [{ span: a.giver.surface }], kind: "speaker" } : null) : giverSlot(g); return by ? P("agree", { k: { count: c.independent_count }, by, quote: { span: a.span, quoted: true } }, c.atoms) : null; }).filter(Boolean), take: 1, cap: L.agree }));
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
          const [x, y] = [byPage.get(pages[i]).find(citable), byPage.get(pages[j]).find(citable)];
          if (!x || !y) continue;
          const gx = giverSlot(giverOf(x, record)), gy = giverSlot(giverOf(y, record));
          if (!gx || !gy || JSON.stringify(gx.names) === JSON.stringify(gy.names)) continue; // two pages by one person are one voice, not two
          alts.push(P("differ", { subject: { fig: subj }, giverA: gx, quoteA: { span: x.span, quoted: true }, giverB: gy, quoteB: { span: y.span, quoted: true } }, [x.id, y.id]));
        }
        return { alts, take: 1, cap: L.divergences };
      });
    },

    "DEF·Ground": async () => [P("undated_claims", {}, ["valid_time:none"])],
    "EVA·Ground": async () => {
      // atmosphere: each page, in order of publication, placed against the ground the pages before it built (aperture meter).
      if (atm.gap) return [];
      const pl = atm.meter.placements;
      const moved = pl.filter((x) => x.censored === "above"), steady = pl.filter((x) => x.censored === "below");
      if (!moved.length && !steady.length) return [];
      return [P("ground_meter", { moved: { count: moved.length }, steady: steady.map((x) => ({ page: x.page })), placed: { count: pl.filter((x) => !x.censored && !x.gap).length }, unmeasured: { count: pl.filter((x) => x.gap).length } }, [...moved, ...steady].map((x) => x.page))];
    },
    "REC·Ground": async () => {
      // regime: where, read in order of publication, the text's own ground re-zeros (atmosphereBoundaries). Then fixity: whether it held.
      const out = [];
      if (!atm.gap && !atm.regime.declined) {
        const pub = Object.fromEntries(record.sources.map((s) => [s.id, s.declared?.published]));
        const starts = atm.regime.regions.slice(1).map((g) => ({ page: g.first, ...(pub[g.first] ? { date: pub[g.first] } : {}) }));
        out.push(starts.length ? P("regime", { starts }, atm.regime.regions.slice(1).flatMap((g) => g.pages)) : P("regime_one", {}, atm.order));
      }
      const vs = Object.values(fixity);
      if (!vs.length) return out;
      const c = (k) => vs.filter((v) => v.verdict === k).length;
      return [...out, P("fixity", { held: { count: c("intact") + c("re_encoded") }, reencoded: { count: c("re_encoded") }, changed: { count: c("altered") + c("revised") + c("moved") }, unreached: { count: c("unchecked") } }, Object.keys(fixity))];
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
      // A camp is an induced kind of PAGE (terrain induction over the pages, both nulls passed); it centers on what its pages share most.
      const frames = interp.frames ?? [];
      if (!frames.length) return [P("camps_none", {}, ["paradigm:none_held"])];
      const item = (fr) => ({ figs: fr.figs.slice(0, 2).map((id) => ({ fig: id })), pages: fr.sources.map((sid) => ({ page: sid })) });
      if (frames.length === 1) return [P("camp_one", { ...item(frames[0]), total: { count: nPages }, rest: { count: nPages - frames[0].sources.length } }, frames[0].sources)];
      return [P("camps", { items: frames.map(item) }, frames.flatMap((f) => f.sources))];
    },
    "EVA·Pattern": async () => {
      // standing: mergeTestimony over each claim's chains; DISAGREE and CONTRADICTED are the set-level contests no single page carries.
      const k = record.claims.filter((c) => ["DISAGREE", "CONTRADICTED"].includes(c.testimony?.case));
      return [P("contested", { k: { count: k.length } }, k.length ? k.flatMap((c) => c.atoms) : ["contest:none"])];
    },
    "REC·Pattern": { gap: "nagarjuna", why: "reshape (void-loop.js) re-zeros a question's declared space when the loop's own findings contradict it; the question's void loop (openLoop → proposeFrom → admit) is not run over this record, so there are no findings to reshape on. What the material means for the question stays the author's to say" },
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
