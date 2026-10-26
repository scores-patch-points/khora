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
  // the parse's offsets are into the reader's cleaned text; spanMap takes them back to the sentence as given
  const M = reading.spanMap ?? null, orig = (i) => (M ? M[Math.min(i, M.length - 1)] : i);
  const spanOfIds = (ids) => { const ws = (ids ?? []).map((i) => byRow.get(i)).filter(Boolean); return ws.length ? byteSpan(text, orig(Math.min(...ws.map((w) => w.start))), orig(Math.max(...ws.map((w) => w.end)))) : null; };
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
  // a kind is its words as the copula's noun gives them (atoms.js's own kind): the head noun and the nouns compounded with it; its other
  // modifiers are facts of their own (an adjective is an arrangement to holds; a phrase, an arrangement of its case word)
  const kindAnchor = (headRow, t, via) => {
    const kids = headRow ? rows.filter((r) => r.head === headRow.id && /^(compound|flat)/.test(r.deprel) && /^(NOUN|PROPN)$/.test(r.upos)) : [];
    const ws = headRow ? [...kids, headRow].sort((x, y) => x.id - y.id) : [];
    const ls = ws.length ? ws.map(lemmaOf) : lemmasOfText(t);
    const a = anchor(`${docId}#k:${fold(ls.join(" ") || t)}`, "kind", via, { label: t || ws.map((r) => r.form).join(" "), head: headRow ? lemmaOf(headRow) : (ls.at(-1) ?? fold(t)), modifiers: kids.map(lemmaOf).sort() });
    if (t) a.names.add(t); for (const l of ls) a.lemmas.add(l); return a.id;
  };
  const endOf = (atom, arg, i) => {
    if (arg?.entity != null) return referent(arg.entity);
    const t = String(arg?.value ?? arg?.name ?? ""), ls = arg?.ids?.length ? lemmasOfIds(arg.ids) : lemmasOfText(t);
    if (arg?.measure != null || (/^has_/.test(atom.pred) && i === 1)) {
      const a = anchor(`${docId}#q:${fold(arg?.measure ?? "")}:${arg?.base ?? ""}:${fold(t)}`, "quantity", "figure", { label: t, measure: arg?.measure ?? null, attribute: arg?.attribute ?? null, base: arg?.base ?? null, alts: arg?.alts ?? [] });
      a.names.add(t); return a.id;
    }
    if (atom.pred === "is_a" && i === 1) {
      const ws = (arg?.ids ?? []).map((x) => byRow.get(x)).filter((r) => r && CONTENT.test(r.upos));
      return kindAnchor(ws.find((r) => !ws.some((o) => o.id === r.head)) ?? ws.at(-1) ?? null, t, "copula");
    }
    if (atom.pred === "named" && i === 1) { const a = anchor(`${docId}#n:${fold(t)}`, "name", "naming", { label: t }); a.names.add(t); for (const l of lemmasOfText(t)) a.lemmas.add(l); return a.id; }
    // an end the reading left unresolved stays an end: an anchor that says so, and a gap over its words
    const a = anchor(`${docId}#v:${fold(t)}`, "referent", "unresolved", { label: t }); a.names.add(t); for (const l of ls) a.lemmas.add(l);
    gaps.push({ kind: "end_unresolved", span: spanOfIds(arg?.ids), text: t });
    return a.id;
  };
  const arrangements = [], headOf = new Map();
  const place = (atom, flags = {}) => {
    const args = atom.args ?? []; if (!args.length) return null;
    const ends = args.map((x, i) => endOf(atom, x, i));
    const s = ends[0], o = args.length === 1 ? HOLDS : ends[1], key = args.length >= 3 ? ends[2] : null;
    if (args.length === 1) anchor(HOLDS, "holds", "reserved");
    const span = byteSpan(text, atom.start, atom.end), polarity = atom.neg ? "-" : "+";
    const headRow = atom.head != null ? byRow.get(atom.head) : null;
    const rel = { lang, lemma: String(atom.pred), surface: headRow ? headRow.form : null, senses: [] };
    const id = hex([docId, span, rel.lemma, s, o, polarity, key]);
    const r = { id, rel, s, o, key, polarity, layer: atom.hedged ? "reported" : "asserted", span, approx: !!atom.approx,
      ...(identifying(atom) ? { identifying: true } : {}), ...(atom.rewritten ? { rewritten: atom.rewritten } : {}), ...flags,
      head: headRow ? { form: headRow.form, upos: headRow.upos, feats: headRow.feats ?? null } : null };
    arrangements.push(r); if (headRow) headOf.set(r, headRow); return r;
  };
  // the atoms as read, and the reader's canonical forms of them (atom-forms.js, RC6): an atom a rewrite consumed is kept, marked superseded
  // (a claim's formula leaves it out); a rewritten atom is added, marked rewritten. Nothing is dropped.
  const forms = reading.forms ? new Set(reading.forms) : null;
  for (const atom of reading.atoms ?? []) place(atom, forms && !forms.has(atom) ? { superseded: true } : {});
  for (const atom of reading.forms ?? []) if (atom.rewritten) place(atom);
  // RC6, superlatives: a superlative is an edge from its comparison class to its holder, and the class has one holder (functional). The class is
  // the noun the degree word qualifies (with the nouns compounded with it) and the phrases that qualify that noun; the license's giver is the
  // language's own Degree feature on the word: Degree=Sup; or Degree=Cmp on a definite noun (the definite comparative, "el lago más profundo");
  // or, for the reader's no-comparative rewrite, Degree=Cmp under a PronType=Neg quantifier. A degree word with none of these (the parse gave
  // no feature) yields no class edge: it stays a one-place fact, and no license is declared for it.
  const feat = (r, f) => !!r && String(r.feats ?? "").split("|").includes(f);
  const licenses = [];
  for (const r of [...arrangements]) {
    if (!/^most:/.test(r.rel.lemma) || r.o !== HOLDS || r.superseded) continue;
    const w = headOf.get(r); if (!w) continue;
    const kids = rows.filter((k) => k.head === w.id), up = byRow.get(w.head);
    const noun = up && /^(NOUN|PROPN)$/.test(up.upos) ? up : kids.find((k) => /^nsubj/.test(k.deprel) && /^(NOUN|PROPN)$/.test(k.upos)) ?? null;
    const det = (f) => !!noun && rows.some((k) => k.head === noun.id && /^det/.test(k.deprel) && feat(k, f));
    const sup = feat(w, "Degree=Sup") || kids.some((k) => k.upos === "ADV" && feat(k, "Degree=Sup"));
    const cmp = feat(w, "Degree=Cmp") || kids.some((k) => k.upos === "ADV" && feat(k, "Degree=Cmp"));
    const giver = sup ? `${lang} Degree=Sup (the language's grammar)` : cmp && det("Definite=Def") ? `${lang} Degree=Cmp on a Definite=Def noun (the language's grammar)` : cmp && r.rewritten === "no-comparative" && det("PronType=Neg") ? `${lang} Degree=Cmp under a PronType=Neg quantifier (the language's grammar)` : null;
    if (!giver || !noun) continue;
    const kindId = kindAnchor(noun, "", "comparison-class");
    const places = [...new Set(arrangements.filter((x) => x.s === r.s && x.o !== HOLDS && !x.derived && (() => { const c = headOf.get(x); return c && c.upos === "ADP" && byRow.get(c.head)?.head === noun.id; })()).map((x) => x.o))].sort();
    const A = anchors.get(kindId), classId = `${docId}#c:${hex([kindId, places]).slice(0, 16)}`;
    const cls = anchor(classId, "kind", "comparison-class", { label: [A?.label, ...places.map((p) => anchors.get(p)?.label)].filter(Boolean).join(" · "), parts: { kind: kindId, places } });
    for (const l of A?.lemmas ?? []) cls.lemmas.add(l);
    const id = hex([docId, r.span, r.rel.lemma, classId, r.s, r.polarity, null]);
    arrangements.push({ id, rel: r.rel, s: classId, o: r.s, key: null, polarity: r.polarity, layer: r.layer, span: r.span, approx: false, derived: "superlative", head: r.head });
    licenses.push({ kind: "functional", rels: [r.rel.lemma], giver, standing: "given" });
  }
  // RC3's license: a figure whose binding named its attribute ("a surface area of …" → area) is one value of that attribute at one time, so
  // has_<attribute> is functional; its key is the time the text gives, and no time is read today, so the key is empty on both sides. A figure
  // named only by its measure (has_length for a height, a depth or a prominence alike) is not licensed.
  for (const r of arrangements) { const q = anchors.get(r.o); if (q?.kind === "quantity" && q.attribute && r.rel.lemma === `has_${q.attribute}` && !r.superseded) licenses.push({ kind: "functional", rels: [r.rel.lemma], giver: "a being has one value of an attribute at one time (the stage spec, §6); key: the time the text gives (none read)", standing: "given" }); }
  // RC7, coverage as gaps: every word the reading left unread (read-atoms.js `unread`: a claim word no claim read, a content word no atom
  // carries) is an unread_word gap over its own bytes; what the reader cut before reading (a pronunciation in brackets) is one too, marked cut
  for (const w of reading.unread ?? []) { const r = rows.find((x) => x.form === w); gaps.push({ kind: "unread_word", span: r ? spanOfIds([r.id]) : null, text: w, why: "unread" }); }
  for (const c of reading.cuts ?? []) gaps.push({ kind: "unread_word", span: byteSpan(text, c.start, c.end), text: c.text, why: "cut" });
  // every referent of the page's reading is an anchor of this stage, stated about here or not: the universe a claim end may be bound into
  for (const e of reading.entities ?? []) referent(e.id);
  return finish({ schema: STAGE_SCHEMA, reader, doc, anchors: [...anchors.values()].map((a) => ({ ...a, names: [...a.names], lemmas: [...a.lemmas] })), arrangements, licenses, gaps });
}

// sorted lists, fixed key order: the same reading gives the same bytes
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function finish(st) {
  const anchors = st.anchors.map((a) => { const { id, kind, names, lemmas, via, ...rest } = a; return { id, kind, names: [...new Set(names)].sort(cmp), lemmas: [...new Set(lemmas)].sort(cmp), via, ...Object.fromEntries(Object.keys(rest).sort().map((k) => [k, rest[k]])) }; }).sort((a, b) => cmp(a.id, b.id));
  const seen = new Set(), arrangements = [];
  for (const r of [...st.arrangements].sort((a, b) => cmp(a.id, b.id))) { if (seen.has(r.id)) continue; seen.add(r.id); arrangements.push(r); }
  const gk = (g) => JSON.stringify([g.kind, g.span, g.text ?? null]), gseen = new Set(), gaps = [];
  for (const g of [...st.gaps].sort((a, b) => cmp(gk(a), gk(b)))) { if (gseen.has(gk(g))) continue; gseen.add(gk(g)); gaps.push({ kind: g.kind, span: g.span ?? null, text: g.text ?? null, ...(g.why ? { why: g.why } : {}) }); }
  const lk = (l) => JSON.stringify([l.kind, l.rels, l.giver]), lseen = new Set(), licenses = [];
  for (const l of [...st.licenses].sort((a, b) => cmp(lk(a), lk(b)))) { if (lseen.has(lk(l))) continue; lseen.add(lk(l)); licenses.push({ kind: l.kind, rels: [...l.rels], giver: l.giver, standing: l.standing ?? "given" }); }
  return { schema: st.schema, reader: st.reader, doc: st.doc, anchors, arrangements, licenses, gaps };
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
  return st.arrangements.filter((r) => !r.derived && !r.rewritten).map((r) => ({ pred: r.rel.lemma, args: [r.s, ...(r.o === HOLDS ? [] : [r.o]), ...(r.key != null ? [r.key] : [])].map(argOf), neg: r.polarity === "-", hedged: r.layer === "reported", approx: !!r.approx }));
}

/** an HL stage over a Stage@1: every anchor, and every arrangement in the named layers as an edge whose provenance is the arrangement's id */
// layered (RC5): the stage is read in two views of one HL stage. An asserted edge is an edge of the asserted view (A:rel) and of the union
// view (U:rel); a reported edge (hedged text) only of the union view. An asserted claim reads the asserted view, so a reported edge neither
// binds nor contradicts it; a hedged claim reads the union view, supported by either. Licenses hold in both views.
export const viewRel = (layer, rel) => `${layer === "reported" ? "U" : "A"}:${rel}`;
export function hlStageOf(st, { layers = ["asserted", "reported"], licenses = st.licenses ?? [], extraAnchors = [], layered = false } = {}) {
  const H = createStage();
  for (const a of st.anchors) addAnchor(H, a.id, a.kind);
  for (const a of extraAnchors) addAnchor(H, a.id, a.kind);
  for (const r of st.arrangements) {
    if (!layers.includes(r.layer)) continue;
    const rels = layered ? (r.layer === "asserted" ? [`A:${r.rel.lemma}`, `U:${r.rel.lemma}`] : [`U:${r.rel.lemma}`]) : [r.rel.lemma];
    for (const rel of rels) addEdge(H, { rel, s: r.s, o: r.o, key: r.key ?? null, polarity: r.polarity, source: r.id });
  }
  const views = (rel) => (layered ? [`A:${rel}`, `U:${rel}`] : [rel]);
  for (const l of licenses) {
    if (l.kind === "functional") for (const rel of l.rels) for (const v of views(rel)) declareFunctional(H, v, { giver: l.giver });
    else if (l.kind === "transitive") for (const rel of l.rels) for (const v of views(rel)) declareTransitive(H, v, { giver: l.giver });
  }
  return H;
}
