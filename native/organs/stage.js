// stage.js — Stage@1: one sentence as the reader read it, written as one record HL can reason over (the stage spec, proposal 2026-10-25).
//
// The reader (read-atoms.js) writes atoms: n-ary facts over the page's referents. HL (interpretation/hl.js) reads binary edges between
// anchors. Before this file the meaning check never met HL: it scored atoms against atoms with its own matcher (atom-support.js). A stage is
// the bridge, and it is only a re-encoding: nothing is merged, resolved or dropped here. The record keeps
//   reader        { grammar, priors, version }      what read it (reproducibility stamp)
//   doc           { id, bytes, lang }               what was read (id: a hash of the reading's input, bytes: of the sentence)
//   anchors       [{ id, kind, names, lemmas, via }] referent | quantity | kind | name | holds
//   arrangements  [{ id, rel, s, o, key, polarity, layer, span, approx }]
//   licenses      [{ kind, rels, giver, standing }]  declared rules, each with its giver (none are read off a sentence)
//   gaps          [{ kind, span, text }]            end_unresolved | unread_word | no_correspondence | parser_absent
// How an atom becomes arrangements (RC1): a two-argument atom is one ordered edge; a third argument is its key; a one-place atom (an
// adjective) is an edge from its referent to the reserved anchor `holds`. Anchors are referents, not strings (RC2): an entity of the page's
// reading is `<doc>#<entity id>`; an end the reading did not resolve is kept, as an anchor whose `via` says so, with an end_unresolved gap over
// its words. A copula's kind (is_a) and a naming's name (named) are anchors of their own kind, identified by their words. Every arrangement
// keeps its byte span in the original sentence and a content address (RC8); every list is sorted by id, so the same bytes give the same stage.
//   readStage(reading, { text, lang, title, previous, grammar, priors }) → Stage@1
//   fromArrangements(stage) → atoms (the atoms the arrangements encode, for checking that nothing was lost)
//   serializeStage(stage) → the canonical JSON text; stageHash(stage) → its sha256
//   hlStageOf(stage, { layers, licenses }) → an HL stage (createStage …) carrying the arrangements as edges, with provenance
import { sha256hex } from "../adapters/text/sha256hex.js";
import { createStage, addAnchor, addEdge, declareFunctional, declareTransitive } from "../interpretation/hl.js";

export const STAGE_SCHEMA = "Stage@1";
export const STAGE_READER_VERSION = "stage-reader@1 (2026-10-25)";
export const HOLDS = "holds";

export const low = (s) => String(s ?? "").normalize("NFKC").toLowerCase();
export const fold = (s) => low(s).normalize("NFD").replace(/\p{M}+/gu, "").replace(/\s+/g, " ").trim();
const utf8len = (s) => { let n = 0; for (const ch of String(s)) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; } return n; };
// a span in UTF-8 bytes of the original sentence (the reader's offsets are string offsets; the cleanText map already restored them)
export const byteSpan = (text, start, end) => (start == null || end == null ? null : [utf8len(String(text).slice(0, start)), utf8len(String(text).slice(0, end))]);
const hex = (x) => sha256hex(typeof x === "string" ? x : JSON.stringify(x));
const CONTENT = /^(NOUN|PROPN|ADJ|NUM)$/;
const lemmaOf = (r) => low(r.lemma && r.lemma !== "_" ? r.lemma : r.form);
const DEG = /^(most|more|less|least):/;
const predWords = (p) => low(p).replace(DEG, "").split(/[_\s]+/).filter((w) => w && w.length > 1);
const stem = (w) => low(w).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 5);
const ART = /^(the|a|an|el|la|los|las|lo|un|una|le|les|l'|l’|un|une|des|du|de la|der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/u;
const words = (s) => low(s).replace(ART, "").replace(/[’']/g, " ").replace(/[“”"«»()\[\],.:;!?]/g, " ").split(/\s+/).filter(Boolean);
const argText = (a) => (a && typeof a === "object" ? a.name ?? a.value ?? "" : String(a ?? ""));

// a one-place fact taken from a word of its referent's own name ("lago Menor" → menor) identifies the referent; it is flagged, never dropped
// (the claim's NUL cell leaves it out of what would have to be true, as atom-support.js does)
function identifying(atom) {
  if ((atom.args ?? []).length !== 1) return false;
  const w = predWords(atom.pred).at(-1), t = argText(atom.args[0]);
  return !!w && /(^|\s)\p{Lu}/u.test(t) && words(t).some((x) => stem(x) === stem(w)) && /\p{Lu}/u.test(t.split(/\s+/).find((x) => stem(x) === stem(w)) ?? "");
}

/** reading: read-atoms.js's result ({ atoms, entities, mentions, rows, page }). text: the sentence as given (spans are into it). */
export function readStage(reading, { text, lang = "en", title = null, previous = [], grammar = null, priors = null } = {}) {
  const docId = "d" + hex([lang, title ?? null, previous ?? [], text]).slice(0, 16);
  const doc = { id: docId, bytes: hex(String(text)), lang };
  const reader = { grammar: grammar ?? null, priors: priors ?? null, version: STAGE_READER_VERSION };
  if (!reading) return finish({ schema: STAGE_SCHEMA, reader, doc, anchors: [], arrangements: [], licenses: [], gaps: [{ kind: "parser_absent", span: null, text: lang }] });
  const rows = reading.rows ?? [], byRow = new Map(rows.map((r) => [r.id, r]));
  const E = new Map((reading.entities ?? []).map((e) => [e.id, e]));
  // label: the reading's own text for the end (the entity's name, the value as written); names: every text the page names it by
  const anchors = new Map(), gaps = [];
  const lemmasOfIds = (ids, rs = byRow) => (ids ?? []).map((i) => rs.get(i)).filter((r) => r && CONTENT.test(r.upos)).map(lemmaOf);
  const lemmasOfText = (t) => words(t).filter((w) => w.length > 1 || /\p{Script=Han}/u.test(w));
  const anchor = (id, kind, via, extra = {}) => { let a = anchors.get(id); if (!a) { a = { id, kind, names: new Set(), lemmas: new Set(), via, ...extra }; anchors.set(id, a); } return a; };
  const spanOfIds = (ids) => { const ws = (ids ?? []).map((i) => byRow.get(i)).filter(Boolean); return ws.length ? byteSpan(text, Math.min(...ws.map((w) => w.start)), Math.max(...ws.map((w) => w.end))) : null; };
  // every naming of an entity on the page (title, earlier sentences, this one): its texts and the lemmas of their content words
  const namings = new Map();
  for (const s of reading.page ?? [{ rows, mentions: reading.mentions ?? [] }]) {
    const rs = new Map((s.rows ?? []).map((r) => [r.id, r]));
    for (const m of s.mentions ?? []) {
      if (!m.entity || /^(pronoun|dropped|we|relative)$/.test(m.how ?? "")) continue;
      const n = namings.get(m.entity) ?? namings.set(m.entity, { names: new Set(), lemmas: new Set() }).get(m.entity);
      if (m.text) n.names.add(m.text);
      const ls = m.ids?.length ? lemmasOfIds(m.ids, rs) : lemmasOfText(m.text);
      for (const l of ls) n.lemmas.add(l);
    }
  }
  const referent = (entityId) => {
    const e = E.get(entityId), a = anchor(`${docId}#${entityId}`, "referent", "coref", { entity: entityId, label: e?.name ?? null });
    if (e?.name) { a.names.add(e.name); for (const l of lemmasOfText(e.name)) a.lemmas.add(l); }
    for (const n of namings.get(entityId)?.names ?? []) a.names.add(n);
    for (const l of namings.get(entityId)?.lemmas ?? []) a.lemmas.add(l);
    return a.id;
  };
  const endOf = (atom, arg, i) => {
    if (arg?.entity != null) return referent(arg.entity);
    const t = String(arg?.value ?? arg?.name ?? ""), ls = arg?.ids?.length ? lemmasOfIds(arg.ids) : lemmasOfText(t);
    if (arg?.measure != null || (/^has_/.test(atom.pred) && i === 1)) {
      const a = anchor(`${docId}#q:${fold(arg?.measure ?? "")}:${arg?.base ?? ""}:${fold(t)}`, "quantity", "figure", { label: t, measure: arg?.measure ?? null, base: arg?.base ?? null, alts: arg?.alts ?? [] });
      a.names.add(t); return a.id;
    }
    if (atom.pred === "is_a" && i === 1) {
      // a kind is its words: the head noun and its modifiers, as the parse gives them
      const ws = (arg?.ids ?? []).map((x) => byRow.get(x)).filter((r) => r && CONTENT.test(r.upos));
      const head = ws.find((r) => !ws.some((o) => o.id === r.head)) ?? ws.at(-1);
      const a = anchor(`${docId}#k:${fold(ls.join(" ") || t)}`, "kind", "copula", { label: t, head: head ? lemmaOf(head) : (ls.at(-1) ?? fold(t)), modifiers: ws.filter((r) => r !== head).map(lemmaOf).sort() });
      a.names.add(t); for (const l of ls) a.lemmas.add(l); return a.id;
    }
    if (atom.pred === "named" && i === 1) { const a = anchor(`${docId}#n:${fold(t)}`, "name", "naming", { label: t }); a.names.add(t); for (const l of lemmasOfText(t)) a.lemmas.add(l); return a.id; }
    // an end the reading left unresolved stays an end: an anchor that says so, and a gap over its words
    const a = anchor(`${docId}#v:${fold(t)}`, "referent", "unresolved", { label: t }); a.names.add(t); for (const l of ls) a.lemmas.add(l);
    gaps.push({ kind: "end_unresolved", span: spanOfIds(arg?.ids), text: t });
    return a.id;
  };
  const arrangements = [];
  for (const atom of reading.atoms ?? []) {
    const args = atom.args ?? []; if (!args.length) continue;
    const ends = args.map((x, i) => endOf(atom, x, i));
    const s = ends[0], o = args.length === 1 ? HOLDS : ends[1], key = args.length >= 3 ? ends[2] : null;
    if (args.length === 1) anchor(HOLDS, "holds", "reserved");
    const span = byteSpan(text, atom.start, atom.end), polarity = atom.neg ? "-" : "+";
    const headRow = atom.head != null ? byRow.get(atom.head) : null;
    const rel = { lang, lemma: String(atom.pred), surface: headRow ? headRow.form : null, senses: [] };
    const id = hex([docId, span, rel.lemma, s, o, polarity, key]);
    arrangements.push({ id, rel, s, o, key, polarity, layer: atom.hedged ? "reported" : "asserted", span, approx: !!atom.approx,
      ...(identifying(atom) ? { identifying: true } : {}), ...(atom.rewritten ? { rewritten: atom.rewritten } : {}),
      head: headRow ? { form: headRow.form, upos: headRow.upos, feats: headRow.feats ?? null } : null });
  }
  // every referent of the page's reading is an anchor of this stage, stated about here or not: the universe a claim end may be bound into
  for (const e of reading.entities ?? []) referent(e.id);
  return finish({ schema: STAGE_SCHEMA, reader, doc, anchors: [...anchors.values()].map((a) => ({ ...a, names: [...a.names], lemmas: [...a.lemmas] })), arrangements, licenses: [], gaps });
}

// sorted lists, fixed key order: the same reading gives the same bytes
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function finish(st) {
  const anchors = st.anchors.map((a) => { const { id, kind, names, lemmas, via, ...rest } = a; return { id, kind, names: [...new Set(names)].sort(cmp), lemmas: [...new Set(lemmas)].sort(cmp), via, ...Object.fromEntries(Object.keys(rest).sort().map((k) => [k, rest[k]])) }; }).sort((a, b) => cmp(a.id, b.id));
  const seen = new Set(), arrangements = [];
  for (const r of [...st.arrangements].sort((a, b) => cmp(a.id, b.id))) { if (seen.has(r.id)) continue; seen.add(r.id); arrangements.push(r); }
  const gk = (g) => JSON.stringify([g.kind, g.span, g.text ?? null]), gseen = new Set(), gaps = [];
  for (const g of [...st.gaps].sort((a, b) => cmp(gk(a), gk(b)))) { if (gseen.has(gk(g))) continue; gseen.add(gk(g)); gaps.push({ kind: g.kind, span: g.span ?? null, text: g.text ?? null }); }
  return { schema: st.schema, reader: st.reader, doc: st.doc, anchors, arrangements, licenses: [...st.licenses], gaps };
}

export const serializeStage = (st) => JSON.stringify(st);
export const stageHash = (st) => hex(serializeStage(st));

/** the atoms the arrangements encode: each edge back to pred(args), so a check can show nothing was lost in the re-encoding (S2) */
export function fromArrangements(st) {
  const A = new Map(st.anchors.map((a) => [a.id, a]));
  const argOf = (id) => {
    const a = A.get(id); if (!a) return { value: id };
    if (a.kind === "referent" && a.entity != null) return { entity: a.entity, name: a.label ?? null };
    if (a.kind === "quantity") return { value: a.label ?? "", measure: a.measure, base: a.base, alts: a.alts };
    return { value: a.label ?? "" };
  };
  return st.arrangements.filter((r) => !r.derived).map((r) => ({ pred: r.rel.lemma, args: [r.s, ...(r.o === HOLDS ? [] : [r.o]), ...(r.key != null ? [r.key] : [])].map(argOf), neg: r.polarity === "-", hedged: r.layer === "reported", approx: !!r.approx }));
}

/** an HL stage over a Stage@1: every anchor, and every arrangement in the named layers as an edge whose provenance is the arrangement's id */
export function hlStageOf(st, { layers = ["asserted", "reported"], licenses = st.licenses ?? [], extraAnchors = [] } = {}) {
  const H = createStage();
  for (const a of st.anchors) addAnchor(H, a.id, a.kind);
  for (const a of extraAnchors) addAnchor(H, a.id, a.kind);
  for (const r of st.arrangements) if (layers.includes(r.layer)) addEdge(H, { rel: r.rel.lemma, s: r.s, o: r.o, key: r.key ?? null, polarity: r.polarity, source: r.id });
  for (const l of licenses) {
    if (l.kind === "functional") for (const rel of l.rels) declareFunctional(H, rel, { giver: l.giver });
    else if (l.kind === "transitive") for (const rel of l.rels) declareTransitive(H, rel, { giver: l.giver });
  }
  return H;
}
