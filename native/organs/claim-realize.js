// organs/claim-realize.js — NET-NEW PARAPHRASE of a claim, mechanically: the claim's own arguments, as copied and addressed bytes,
// recombined by the language's grammar into a sentence the source never wrote. No model.
//
//   realizeClaim({ claim, grounds, lang, whom, witness, roles }, { slice, grammar, model, forms }) → { ok, clause, alternatives: [{ alternation, text, segs,
//                                                   lint, equate, novelty, disclosure, omitted }], refusals }
//   claimFromSentence(text, address, { model }) → the claim the sentence's own UD parse states (root, subject, object, obliques, report)
//
// HOW (the house pipeline NL → grammar → EOT → grammar → NL, at clause grain):
//   READ     khora's UD English parser (adapters/text/english-parser.js, trained on UD English-EWT; tags held to what EWT attests) reads
//            the source sentence CLAUSE BY CLAUSE (segmentClauses, readClause: §10 of docs/CALLIMACHUS.md); the claim is
//            its root predicate and the BYTE SPANS of its argument subtrees (nsubj, obj, obl…, ccomp). Arguments are never retyped.
//   VOICE    is read off the ARCS (nsubj + obj and no aux:pass = active), never off the tagger's feature guess; TENSE off the surface
//            form against the past form UD English-EWT attests for the lemma (kernel/eot-realize.js learnForms).
//   REWRITE  grammatical ALTERNATIONS, each a closed English construction (giver: CGEL ch. 16 passive, ch. 15 adjunct position,
//            ch. 10 reporting frames; the author, 2026-10-14): active → passive · adjunct moved · "According to X, …". Only grammar words
//            are generated (was/were, by, according to, the participle); every content word is a copied span with its address.
//   GATE     (1) the prose laws (prose-laws.js lintSentence + verifyWords); (2) REVERSE EQUATE — the output is parsed back and must
//            recover the same predicate lemma and the same argument bytes in their new roles; (3) NET NEW, no constant — the source
//            clause is its own null: at least one word adjacency the source never holds; (4) a needed verb form not attested in EWT is a
//            typed refusal, never a guessed inflection; (5) ANCHORS — every number and proper name of the clause is carried or disclosed
//            as omitted (prosify.js's law); (6) LOGOS — the dependency order of what makes sense: no carried word outlives or outranks
//            its head, and no predicate hangs on a non-predicate (see logosOrder and claimFromSentence).
//   WITNESS  the reverse equate parses with the SAME parser, so alone it is one reader agreeing with itself (Pearl: two readings of one
//            giver are not two witnesses). The claim must ALSO agree with an independent reader: the Callimachus relation (relations.js,
//            measured verb vocabulary, a different instrument) — same predicate surface, overlapping subject. Without that witness the
//            paraphrase is refused, never shown.
//   TYPOGRAPHY  a span that moves onto or off sentence start has its first letter case-folded unless its first token is a proper noun
//            (UD PROPN). Declared, recorded on the segment (`caseFolded`); the address still names the original bytes.
import { tokenize, analyseAttested, CLOSED_UPOS_GIVER } from "../adapters/text/english-parser.js";
import { normFeats } from "../kernel/eot-realize.js";
import { seg, sentence, lintSentence, verifyWords, narrow } from "./prose-laws.js";
import { runDMCA } from "./run-dmca.js";

const kids = (rows, id) => rows.filter((r) => r.head === id);
// A parse can carry a head cycle; the walk visits each token once.
function subtree(rows, id, seen = new Set()) { if (seen.has(id)) return []; seen.add(id); const out = [rows.find((r) => r.id === id)]; for (const k of kids(rows, id)) out.push(...subtree(rows, k.id, seen)); return out.filter(Boolean); }
/** The [from, to) UTF-16 extent of a subtree in the sentence, punctuation at its edges excluded. */
function extent(rows, id, { without = [] } = {}) {
  const ts = subtree(rows, id).filter((r) => !without.includes(r.id)).sort((a, b) => a.at - b.at);
  while (ts.length && ts[0].upos === "PUNCT") ts.shift();
  while (ts.length && ts.at(-1).upos === "PUNCT") ts.pop();
  if (!ts.length) return null;
  return { from: ts[0].at, to: ts.at(-1).at + ts.at(-1).form.length, first: ts[0], tokens: ts };
}

/**
 * READ: one stretch of text, tokenized and analysed as ONE unit (no sentence splitting inside it), with every tag held to what UD
 * English-EWT attests for the form (english-parser.js analyseAttested, scope "all": a form the treebank saw takes only a tag it saw it
 * with; an unseen form keeps every class). Chosen by measurement, not assertion: on the official EWT dev+test splits (4,078 sentences
 * the tagger never trained on) LAS is 74.68 plain, 74.77 closed classes only, 75.23 all classes; sign-flip null p ≤ 0.002 for each
 * step (scripts/eval-attested-tags.mjs, CALLIMACHUS.md §10). Offsets are UTF-16 positions in the enclosing sentence: `base` is where
 * the stretch starts in it.
 */
export const READ_SCOPE = "all";
export function readRows(model, text, base = 0) {
  const toks = tokenize(text);
  if (!toks.length) return [];
  return analyseAttested(model, toks.map((t) => t.form), { scope: READ_SCOPE }).map((r, k) => ({ id: r.id, form: r.form, lemma: r.lemma, upos: r.upos, feats: r.feats, head: r.head, deprel: r.deprel, at: base + toks[k].start }));
}

/** The claim a sentence's own parse states. Returns null when the sentence has no verbal root. */
export function claimFromSentence(text, address, { model, predForm = null, predAt = null }) {
  return claimFromRows(text, address, readRows(model, text), { predForm, predAt });
}

/** The claim a parse of `text` states; `rows` carry offsets into `text` (a clause parse is shifted into its sentence's offsets). */
export function claimFromRows(text, address, rows, { predForm = null, predAt = null } = {}) {
  // The clause is anchored on the predicate an INDEPENDENT reader named, wherever the parser put the root; else on the root itself.
  const isNamed = (r) => r.form.toLowerCase() === String(predForm).toLowerCase() && (r.upos === "VERB" || r.upos === "AUX");
  const named = predForm ? (predAt != null ? rows.find((r) => r.at === predAt && isNamed(r)) : null) ?? rows.find(isNamed) : null;
  const root = named ?? rows.find((r) => r.deprel === "root");
  if (!root || !(root.upos === "VERB" || (named && root.upos === "AUX"))) return null;
  // LOGOS, at the clause: a predicate is the sentence's root or hangs on another PREDICATE by a clausal relation. A finite verb with its
  // own subject that depends on a number or a noun ("2026 ← parataxis ← passed") is a parse that broke the order of what makes sense;
  // nothing read from it is trusted.
  if (root.head !== 0) {
    const h = rows.find((r) => r.id === root.head);
    const clausal = ["conj", "ccomp", "advcl", "xcomp", "parataxis", "acl", "csubj"].includes(root.deprel.split(":")[0]);
    if (!h || !clausal || !(h.upos === "VERB" || h.upos === "AUX" || h.upos === "ADJ")) return { untrusted: true, why: `the predicate “${root.form}” hangs as ${root.deprel} on “${h?.form ?? "∅"}” (${h?.upos ?? "∅"}): the parse broke the clause's order` };
  }
  // A predicate that carries a subordinating MARK ("the House has yet TO take action", "…THAT it passed") is a subordinate or
  // non-finite predicate, whatever the parser made its head: the sentence does not assert it in this form (UD v2 mark).
  const mk = kids(rows, root.id).find((r) => r.deprel === "mark");
  if (mk) return { untrusted: true, why: `the predicate “${root.form}” carries the subordinating mark “${mk.form}”: not a main-clause predicate` };
  const rel = (name) => kids(rows, root.id).filter((r) => r.deprel.split(":")[0] === name || r.deprel === name);
  const span = (r, opts) => { const e = r ? extent(rows, r.id, opts) : null; return e ? { ...e, id: r.id, text: text.slice(e.from, e.to), number: /Number=Plur/.test(r.feats) ? "Plur" : "Sing" } : null; };
  // An object's own core: its prepositional modifiers (nmod with a case marker) and appositives are set apart, so a passive can carry
  // them after the agent (adjuncts either way) or disclose an appositive it leaves out — never silently re-scoped onto the subject.
  const objCore = (o) => {
    if (!o) return null;
    const pp = kids(rows, o.id).filter((k) => k.deprel.startsWith("nmod") && kids(rows, k.id).some((x) => x.deprel === "case"));
    const ap = kids(rows, o.id).filter((k) => k.deprel === "appos");
    const without = [...pp, ...ap].flatMap((k) => subtree(rows, k.id).map((t) => t.id));
    const core = span(o, { without });
    const adjuncts = pp.map((k) => span(k)).filter(Boolean), appositives = ap.map((k) => span(k)).filter(Boolean);
    // The split holds only when the parts are disjoint stretches of the sentence; a parse that interleaves them keeps the object whole.
    if (core && [...adjuncts, ...appositives].some((a) => a.from < core.to && core.from < a.to)) { const whole = span(o); return { ...whole, adjuncts: [], appositives: [] }; }
    return core ? { ...core, adjuncts, appositives } : null;
  };
  const subj = rel("nsubj")[0] ?? null;
  const obj = rel("obj")[0] ?? null;
  const passive = kids(rows, root.id).some((r) => r.deprel === "aux:pass") || !!rel("nsubj:pass")[0];
  const auxes = kids(rows, root.id).filter((r) => r.deprel === "aux" || r.deprel === "aux:pass");
  // THE ANCHORS (prosify.js anchorsFor, the same law): the clause's numbers and proper names. A paraphrase carries every one of them,
  // or names it as omitted. Other clauses hung on the predicate (advcl, parataxis, conj) are their own claims and are not demanded.
  const own = new Set(subtree(rows, root.id).map((t) => t.id));
  for (const k of kids(rows, root.id).filter((k) => ["advcl", "parataxis", "conj", "punct"].includes(k.deprel.split(":")[0]))) for (const t of subtree(rows, k.id)) own.delete(t.id);
  const anchors = rows.filter((r) => own.has(r.id) && (r.upos === "NUM" || r.upos === "PROPN")).map((r) => r.form);
  return {
    text, address, rows, anchors,
    pred: { lemma: root.lemma, form: root.form, at: root.at, upos: root.upos },
    voice: passive ? "passive" : "active",
    aux: auxes.map((a) => a.form),
    neg: kids(rows, root.id).some((r) => r.deprel === "advmod" && /^(not|n't|never)$/i.test(r.form)),
    subj: span(subj), obj: objCore(obj),
    obls: rel("obl").map((o) => span(o)).filter(Boolean),
    report: rel("ccomp")[0] ? span(rel("ccomp")[0], { without: kids(rows, rel("ccomp")[0].id).filter((k) => k.deprel === "mark").map((k) => k.id) }) : null,
  };
}

// ---- CLAUSE SEGMENTATION, before the claim is read ----------------------------------------------------------------------------------
//
// One parser over a whole long sentence misreads it in ways no alternation can survive: a fronted date made the root ("2026 ← passed"),
// a predicate hung on a noun. A clause read ON ITS OWN is a shorter, easier input. The sentence is cut into clauses, each clause is
// parsed separately, and a clause reading is accepted only where the WHOLE-sentence parse and the CLAUSE parse agree on the predicate
// and its arguments (two readings, one giver: an agreement check, never counted as an independent witness — that stays relations.js).
//
// The cuts, each a closed class or a punctuation convention, each with its giver:
//   FRONTED     comma-delimited segments at the head of the sentence, while the rest still holds a predicate: a verbless one with no
//               subject in it is an introductory ADJUNCT (CMOS 6.25, the comma after an introductory phrase); one opened by a
//               subordinator is a fronted SUBORDINATE clause (CMOS 6.26).
//   COORDINATE  a coordinator (UPOS CCONJ, a UD closed class) between two stretches that each hold a predicate, after a comma (CMOS
//               6.22, independent clauses joined by a conjunction) or where the parse makes it the cc of a predicate.
//   SUBORDINATE a subordinator: UPOS SCONJ (closed), a wh-word (EWT feature PronType=Rel|Int), or a token the parse marks `mark` — after
//               a comma, or the mark of an adverbial or adnominal clause. A complement clause (ccomp, csubj, xcomp) is an ARGUMENT of
//               its predicate and is never cut off it.
// Closed classes are held to what UD English-EWT enumerates (english-parser.js CLOSED_UPOS). A cut is a candidate; agreement decides.
export const CLAUSE_CUT_GIVERS = Object.freeze({
  closed: CLOSED_UPOS_GIVER,
  fronted: "CMOS 6.25 (comma after an introductory phrase), 6.26 (introductory dependent clause)",
  coordinate: "CMOS 6.22 (comma between independent clauses joined by a conjunction); UD v2 cc/conj",
  subordinate: "UD v2 SCONJ and mark; EWT features PronType=Rel|Int; complement clauses (ccomp, csubj, xcomp) are arguments, after UD v2 core/non-core",
});
const PRED = (r) => r.upos === "VERB" || r.upos === "AUX";
const COMMA = (r) => r.upos === "PUNCT" && r.form === ",";
const SUBORD = (r) => r.upos === "SCONJ" || /PronType=(Rel|Int)/.test(r.feats ?? "") || r.deprel === "mark";
const ARGUMENT_CLAUSE = new Set(["ccomp", "csubj", "xcomp"]);
const CLAUSAL = new Set(["acl", "advcl", "ccomp", "xcomp", "csubj", "parataxis"]);
const SUBJECTISH = /^(nsubj|csubj|expl)/;

/**
 * segmentClauses(text, rows) — the sentence's clauses, read off its whole-sentence parse `rows` (offsets into `text`).
 * → { fronted: [{ kind: "adjunct"|"subordinate", from, to }], clauses: [{ kind: "main"|"coordinate"|"subordinate", from, to, cut }] }
 * Offsets are UTF-16 [from, to) with edge punctuation and the cutting coordinator trimmed off.
 */
export function segmentClauses(text, rows) {
  // A QUOTATION IS OPAQUE: no cut falls inside quotation marks (the quoted words are the speaker's own clause structure, one argument of
  // the reporting verb). Regions are paired marks, curly or straight, read off the text (CMOS 6.9).
  const quoted = [];
  for (const m of text.matchAll(/“[^”]*”|"[^"]*"/g)) quoted.push([m.index, m.index + m[0].length]);
  const opaque = (r) => quoted.some(([a, b]) => r.at > a && r.at < b - 1);
  const toks = [...rows].sort((a, b) => a.at - b.at).map((r) => (opaque(r) && (COMMA(r) || r.upos === "CCONJ" || SUBORD(r)) ? { ...r, upos: "X", deprel: "opaque", feats: "_" } : r));
  const end = (r) => r.at + r.form.length;
  const span = (ts) => {
    const t = ts.filter(Boolean);
    while (t.length && t[0].upos === "PUNCT") t.shift();
    while (t.length && t.at(-1).upos === "PUNCT") t.pop();
    return t.length ? { from: t[0].at, to: end(t.at(-1)), toks: t } : null;
  };
  const byId = new Map(rows.map((r) => [r.id, r]));
  // FRONTED segments.
  const fronted = [];
  let i = 0;
  for (;;) {
    const j = toks.findIndex((r, k) => k >= i && COMMA(r));
    if (j < 0) break;
    const segT = toks.slice(i, j), rest = toks.slice(j + 1);
    if (!segT.length || !rest.some(PRED)) break;
    const opener = segT[0].upos === "CCONJ" && fronted.length ? segT[1] : segT[0];
    let kind = null;
    if (!segT.some(PRED) && !segT.some((r) => SUBJECTISH.test(r.deprel) && byId.get(r.head) && rest.includes(byId.get(r.head)))) kind = "adjunct";
    else if (opener && SUBORD(opener) && segT.some(PRED)) kind = "subordinate";
    if (!kind) break;
    const sp = span(segT[0].upos === "CCONJ" && fronted.length ? segT.slice(1) : segT);
    if (!sp) break;
    // Consecutive adjunct segments are one adjunct ("On July 14, 2026,").
    const last = fronted.at(-1);
    if (last && last.kind === "adjunct" && kind === "adjunct") { last.to = sp.to; last.toks.push(...sp.toks); }
    else fronted.push({ kind, ...sp });
    i = j + 1;
  }
  // CUTS in the rest.
  const rest = toks.slice(i);
  const cuts = [];
  const hasPred = (a, b) => rest.slice(a, b).some(PRED);
  for (let k = 1; k < rest.length; k++) {
    const r = rest[k], prev = rest[k - 1];
    const nextCut = () => { const n = rest.findIndex((x, m) => m > k && COMMA(x)); return n < 0 ? rest.length : n; };
    const from = cuts.length ? cuts.at(-1).k : 0;
    if (r.upos === "CCONJ" && hasPred(from, k) && hasPred(k + 1, nextCut())) {
      const head = byId.get(r.head);
      if (COMMA(prev) || (head && PRED(head) && head.deprel.split(":")[0] === "conj")) { cuts.push({ k, kind: "coordinate", by: r.form }); continue; }
    }
    if (SUBORD(r) && hasPred(k + 1, rest.length)) {
      const head = byId.get(r.head);
      const argument = head && ARGUMENT_CLAUSE.has(head.deprel.split(":")[0]);
      if (!argument && (COMMA(prev) || (r.deprel === "mark" && head && /^(advcl|acl)/.test(head.deprel)))) cuts.push({ k, kind: "subordinate", by: r.form });
    }
  }
  const clauses = [];
  const bounds = [{ k: 0, kind: "main", by: null }, ...cuts];
  for (const [n, b] of bounds.entries()) {
    const stop = n + 1 < bounds.length ? bounds[n + 1].k : rest.length;
    const sp = span(rest.slice(b.kind === "coordinate" ? b.k + 1 : b.k, stop));
    if (sp) clauses.push({ kind: b.kind, cut: b.by, from: sp.from, to: sp.to, toks: sp.toks });
  }
  // A subordinate clause runs until the next cut; a clause it interrupts is not rejoined (that reading is refused, never stitched).
  return { fronted: fronted.map(({ toks: _t, ...f }) => f), clauses: clauses.map(({ toks: _t, ...c }) => c), text };
}

const CORE = new Set(["nsubj", "obj", "iobj", "ccomp", "xcomp", "csubj"]);
/** A predicate's arguments inside [lo, hi), as "relation@from-to" strings: the agreement key between two parses. */
function argsKey(rows, predId, lo, hi) {
  const out = [];
  for (const k of rows.filter((r) => r.head === predId)) {
    const base = k.deprel.split(":")[0];
    if (!CORE.has(base) && base !== "obl") continue;
    const ts = subtree(rows, k.id).filter((t) => t.at >= lo && t.at < hi && t.upos !== "PUNCT").sort((a, b) => a.at - b.at);
    if (!ts.length || k.at < lo || k.at >= hi) continue;
    out.push(`${k.deprel}@${ts[0].at}-${ts.at(-1).at + ts.at(-1).form.length}`);
  }
  return out.sort();
}

/**
 * readClause — the claim of the clause that holds the witness's predicate, parsed on its own, re-joined to any fronted adjunct (parsed
 * on its own too, hung on the predicate as an oblique), and accepted only when the whole-sentence parse agrees with it.
 * → { claim, seg, whole } or { refusal }.
 */
export function readClause(text, address, { model, predForm, subjText = null }) {
  const whole = readRows(model, text);
  const s0 = subjText ? text.toLowerCase().indexOf(String(subjText).toLowerCase()) : -1;
  const low = String(predForm).toLowerCase();
  let p = whole.find((r) => r.form.toLowerCase() === low && r.at >= Math.max(0, s0)) ?? whole.find((r) => r.form.toLowerCase() === low);
  if (!p) return { refusal: "the witness's predicate is not a token of the sentence" };
  const lf = p.form.toLowerCase();
  if (!PRED(p) && !model.lexicon.form[`${lf}|VERB`] && !model.lexicon.form[`${lf}|AUX`]) return { refusal: "the witness names a word UD English-EWT never attests as a verb: no predicate to read" };
  // THE VERB GROUP: when the witness names an auxiliary ("Sleep experts have opposed…" → relations.js "have"), the two readers agree on
  // the clause and differ only on which word of the verb group names it (CGEL ch. 3: auxiliary + lexical head). The claim is anchored
  // on the lexical head; the auxiliary stays in the claim's own aux list. A copula's head is a nominal, not a verb: still refused below.
  if (/^aux/.test(p.deprel)) { const h = whole.find((r) => r.id === p.head); if (h && h.upos === "VERB") p = h; }
  const seg = segmentClauses(text, whole);
  const inF = seg.fronted.find((f) => p.at >= f.from && p.at < f.to);
  if (inF) return { refusal: `the predicate sits in a fronted ${inF.kind} clause: the sentence does not assert it`, seg, whole };
  const cl = seg.clauses.find((c) => p.at >= c.from && p.at < c.to);
  if (!cl) return { refusal: "the predicate falls outside every clause the segmentation found", seg, whole };
  if (cl.kind === "subordinate") return { refusal: "the predicate sits in a subordinate clause: the sentence does not assert it", seg, whole };
  const whole1 = seg.fronted.length === 0 && seg.clauses.length === 1;
  const crows = whole1 ? whole : readRows(model, text.slice(cl.from, cl.to), cl.from);
  const cp = crows.find((r) => r.at === p.at);
  if (!cp || !PRED(cp)) return { refusal: "the clause parse does not read the witness's predicate as a verb", seg, whole };
  // TWO PARSES AGREE: same predicate token and lemma, the same arguments over the same bytes inside the clause.
  if (!whole1) {
    const a = argsKey(whole, p.id, cl.from, cl.to), b = argsKey(crows, cp.id, cl.from, cl.to);
    if (!PRED(p) || p.lemma !== cp.lemma || a.join("|") !== b.join("|")) return { refusal: `the sentence parse and the clause parse disagree on the predicate's arguments`, detail: { sentence: a, clause: b }, seg, whole };
  }
  // Fronted ADJUNCTS belong to the main clause; each is parsed alone and hung on the predicate as an oblique (CMOS 6.25: it modifies
  // the clause it introduces). A coordinate clause does not inherit them; they are then disclosed as omitted.
  let rows = crows;
  const attached = [];
  if (cl.kind === "main") {
    let next = Math.max(...crows.map((r) => r.id)) + 1;
    for (const f of seg.fronted.filter((x) => x.kind === "adjunct")) {
      const fr = readRows(model, text.slice(f.from, f.to), f.from);
      const shift = next - 1;
      const roots = fr.filter((r) => r.head === 0);
      rows = [...rows, ...fr.map((r) => ({ ...r, id: r.id + shift, head: r.head === 0 ? cp.id : r.head + shift, deprel: r.head === 0 ? "obl" : r.deprel }))];
      next += fr.length;
      attached.push({ ...f, roots: roots.map((r) => r.id + shift) });
    }
  }
  const claim = claimFromRows(text, address, rows, { predForm: p.form, predAt: p.at });
  if (claim && !claim.untrusted) { claim.clause = { kind: cl.kind, from: cl.from, to: cl.to, fronted: attached.map(({ roots: _r, ...f }) => f), parsed: whole1 ? "whole sentence" : "clause alone" }; claim.segmentation = seg; claim.whole = whole; }
  return { claim, seg, whole };
}

// ---- the English alternations ----------------------------------------------------------------------------------------------------------

const EN_FRAME = { passive: new Set(["was", "were", "is", "are", "by", "be", "been", "has", "have", "had"]), adjunct: new Set([]), according: new Set(["according", "to"]) };

/**
 * Verb forms from the parser prior's own lexicon (adapters/text/english-parser.js, trained on UD English-EWT): form|UPOS → lemma +
 * features, inverted to the learnForms key shape "UPOS|lemma|feats" → form. Same treebank as the gold fixture, already on the record;
 * a caller holding the gold sentences may pass kernel/eot-realize.js learnForms(...) instead.
 */
export function formsFromParserLexicon(model) {
  const forms = new Map();
  for (const [key, val] of Object.entries(model?.lexicon?.form ?? {})) {
    const [form, upos] = key.split("|");
    if (upos !== "VERB" && upos !== "AUX") continue;
    const [lemma, feats] = String(val).split("\t");
    const k = `${upos}|${lemma}|${normFeats(feats)}`;
    if (!forms.has(k)) forms.set(k, form);
  }
  return forms;
}

const pastIndex = new WeakMap();
/** Every past-finite and past-participle form UD English-EWT attests, per verb lemma (feature sets vary by person and number). */
function pastFormsOf(forms, lemma) {
  let idx = pastIndex.get(forms);
  if (!idx) {
    idx = new Map();
    for (const [key, form] of forms) {
      const [upos, lem, feats] = key.split("|", 3).concat(key.split("|").slice(3).join("|") ? [] : []);
      const f = key.slice(upos.length + lem.length + 2);
      if (upos !== "VERB" && upos !== "AUX") continue;
      const e = idx.get(lem) ?? idx.set(lem, { fin: new Set(), part: new Set() }).get(lem);
      if (/Tense=Past/.test(f) && /VerbForm=Fin/.test(f)) e.fin.add(form.toLowerCase());
      if (/Tense=Past/.test(f) && /VerbForm=Part/.test(f)) e.part.add(form.toLowerCase());
    }
    pastIndex.set(forms, idx);
  }
  return idx.get(lemma) ?? { fin: new Set(), part: new Set() };
}

export function englishAlternations(c, { forms }) {
  const out = [];
  const src = (sp) => seg.source(sp.text, null); // address filled by the caller (needs the sentence's own address arithmetic)
  const refusals = [];
  // TENSE from the surface form against EWT's attested past form of the lemma.
  const attested = pastFormsOf(forms, c.pred.lemma);
  // A participle-shaped form standing as the clause's only verb (no auxiliary) is the simple past ("the Senate passed the bill").
  const f = c.pred.form.toLowerCase();
  const tense = attested.fin.has(f) || (attested.part.has(f) && !c.aux.length) ? "Past" : "Pres";
  // The participle: the EWT-attested past participle (for a regular verb it is the attested past form itself).
  const participle = [...attested.part][0] ?? null;

  // THE AUXILIARY CHAIN (CGEL ch. 3 §2: modal < perfect < progressive < passive, in that order). A passive keeps the chain and adds
  // passive "be" after it: a MODAL is copied from the source with its address ("could create" → "could be created"); the PERFECT "have"
  // is re-agreed with the new subject ("experts have opposed the idea" → "the idea has been opposed"), or copied bare after a modal
  // ("would have been opposed"). A progressive or do-support chain has no alternation here and is left alone.
  const auxRows = c.rows.filter((r) => r.head === c.rows.find((x) => x.at === c.pred.at)?.id && /^aux/.test(r.deprel)).sort((a, b) => a.at - b.at);
  const modal = auxRows.filter((r) => !["be", "have", "do", "get"].includes(r.lemma));
  const perfect = auxRows.find((r) => r.lemma === "have");
  const chainOk = auxRows.every((r) => modal.includes(r) || r === perfect) && modal.length <= 1;
  // 1. ACTIVE → PASSIVE: "[obj] was/were [participle] by [subj] [obls]."
  // An "object" that holds its own subject is a clause the parser read as a noun phrase ("studies have shown [X results in Y]"); a
  // finite clause cannot be a passive's bare subject (CGEL ch. 11: it needs "that"). No passive is built from it.
  const objIsClause = !!c.obj && c.obj.tokens.some((t) => /^nsubj/.test(t.deprel));
  if (c.voice === "active" && c.subj && c.obj && chainOk && !c.neg && !objIsClause) {
    if (!participle) refusals.push({ alternation: "passive", why: `no participle of “${c.pred.lemma}” attested in UD English-EWT` });
    else {
      const plur = c.obj.number === "Plur";
      const chain = [];
      for (const m of modal) chain.push({ span: { from: m.at, to: m.at + m.form.length, text: m.form, first: m }, aux: true }, { frame: " " });
      if (perfect && modal.length) chain.push({ span: { from: perfect.at, to: perfect.at + perfect.form.length, text: perfect.form, first: perfect }, aux: true }, { frame: " been " });
      else if (perfect) chain.push({ frame: `${/^had$/i.test(perfect.form) ? "had" : plur ? "have" : "has"} been ` });
      else if (modal.length) chain.push({ frame: "be " });
      const be = auxRows.length ? null : tense === "Past" ? (plur ? "were" : "was") : (plur ? "are" : "is");
      const tail = [...c.obj.adjuncts, ...c.obls].sort((a, b) => a.from - b.from);
      out.push({ alternation: "passive", words: EN_FRAME.passive, parts: [{ span: c.obj, start: true }, { frame: " " }, ...chain, ...(be ? [{ frame: `${be} ` }] : []), { form: participle, lemma: c.pred.lemma }, { frame: " by " }, { span: c.subj }, ...tail.map((o) => [{ frame: " " }, { span: o, moved: c.obj.adjuncts.includes(o) ? "object" : "predicate" }]).flat(), { frame: "." }] });
    }
  }
  // 2. ADJUNCT MOVED: a fronted oblique goes to the end; a final one comes to the front.
  if (c.subj && c.obls.length) {
    const head = Math.min(...[c.subj, c.obj, ...c.obls].filter(Boolean).map((s) => s.from));
    const fronted = c.obls.find((o) => o.from === head);
    const core = { from: Math.min(c.subj.from, c.pred.at), to: Math.max(c.pred.at + c.pred.form.length, c.obj?.to ?? 0, ...(c.obj?.adjuncts ?? []).map((a) => a.to), ...c.obls.filter((o) => o !== fronted).map((o) => o.to)) };
    if (fronted && core.to > core.from) {
      const coreSpan = { ...core, text: c.text.slice(core.from, core.to), first: c.subj.first };
      out.push({ alternation: "adjunct-to-end", words: EN_FRAME.adjunct, parts: [{ span: coreSpan, start: true }, { frame: " " }, { span: fronted, moved: "predicate" }, { frame: "." }] });
    } else if (!fronted) {
      const last = c.obls.at(-1);
      const rest = { from: c.subj.from, to: last.from, text: c.text.slice(c.subj.from, last.from).replace(/[\s,]+$/, ""), first: c.subj.first };
      rest.to = rest.from + rest.text.length;
      if (rest.text) out.push({ alternation: "adjunct-to-front", words: EN_FRAME.adjunct, parts: [{ span: last, start: true, moved: "predicate" }, { frame: ", " }, { span: rest }, { frame: "." }] });
    }
  }
  // 3. REPORT: "[subj] [argue|say…] [clause]" → "According to [subj], [clause]."
  if (c.report && c.subj && c.voice === "active") {
    out.push({ alternation: "according-to", words: EN_FRAME.according, parts: [{ frame: "According to " }, { span: c.subj, moved: "predicate" }, { frame: ", " }, { span: c.report }, { frame: "." }] });
  }
  return { out, refusals };
}

// ---- assembling, gating -----------------------------------------------------------------------------------------------------------------

const enc = new TextEncoder();
function partsToSegs(parts, c) {
  const segs = [];
  for (const [i, p] of parts.entries()) {
    if (p.frame != null) { segs.push(seg.frame(p.frame)); continue; }
    if (p.form != null) { segs.push({ ...seg.value(p.form), form: true, lemma: p.lemma }); continue; }
    const sp = p.span;
    const nn = narrow(c.address, c.text, sp.from, sp.to);
    let t = nn.text, caseFolded = false;
    const atStart = i === 0;
    // A POSITIONAL capital: nothing but non-letters before it in the sentence ("[ 10 ] It passed…"), a line start, or after a colon
    // (CMOS 6.63). A capital anywhere else is a name's, and stays.
    const before = c.text.slice(0, sp.from);
    const wasStart = !/\p{L}/u.test(before) || /(\n|:)\P{L}*$/u.test(before);
    const proper = sp.first?.upos === "PROPN";
    if (atStart && /^\p{Ll}/u.test(t)) { t = t[0].toUpperCase() + t.slice(1); caseFolded = true; }
    else if (!atStart && wasStart && !proper && /^\p{Lu}(\p{Ll}|\s)/u.test(t)) { t = t[0].toLowerCase() + t.slice(1); caseFolded = true; }
    const sg = { ...seg.source(t, nn.address), ...(caseFolded ? { caseFolded: true } : {}) };
    Object.defineProperty(sg, "_part", { value: { ...p, from: sp.from, to: sp.to }, enumerable: false });
    segs.push(sg);
  }
  return segs;
}

/**
 * A MOVED span must read back inside the clause it moved in. "In July" carried to the end of a long object that ends in a relative
 * clause reads back as a modifier inside that relative clause: the bytes are the same, the claim is not. Hanging on the predicate or on
 * one of its own nominal arguments is the reader's prepositional-attachment ambiguity (stacked PPs, the object's PP) and stays licensed;
 * crossing a clausal relation on the way to the root (UD v2 acl advcl ccomp xcomp csubj parataxis, or a conjoined predicate) is not.
 */
function movedReadBack(alt, text, { model }) {
  const rows = readRows(model, text);
  const root = rows.find((r) => r.deprel === "root");
  if (!root) return { ok: false, why: "the paraphrase has no root when read back" };
  let at = 0;
  for (const seg of alt.segs) {
    const p = seg._part;
    const from = at, to = at + seg.t.length;
    at = to;
    if (!p?.moved) continue;
    const inside = rows.filter((r) => r.at >= from && r.at < to && r.upos !== "PUNCT");
    const tops = inside.filter((r) => !inside.some((x) => x.id === r.head));
    if (tops.length !== 1) return { ok: false, why: `the moved span “${seg.t}” does not read back as one constituent` };
    const byId = new Map(rows.map((r) => [r.id, r]));
    let h = byId.get(tops[0].head), crossed = null;
    for (let guard = 0; h && h.id !== root.id && guard < 200; guard++, h = byId.get(h.head)) {
      const base = h.deprel.split(":")[0];
      if (CLAUSAL.has(base) || (base === "conj" && PRED(h))) { crossed = h; break; }
    }
    if (crossed) return { ok: false, why: `the moved span “${seg.t}” reads back inside another clause (“${crossed.form}”, ${crossed.deprel})` };
  }
  return { ok: true };
}

/** Parse the paraphrase back and require the same predicate and the same argument bytes in their new roles. */
function reverseEquate(alt, c, text, { model }) {
  const moved = movedReadBack(alt, text, { model });
  if (!moved.ok) return moved;
  return reverseEquateRoles(alt, c, text, { model });
}
function reverseEquateRoles(alt, c, text, { model }) {
  if (alt.alternation === "according-to") {
    // The reported clause is the paraphrase's main clause: its head reads back as the root, and reads as the root when the report is
    // parsed alone too. Its head need not be a verb ("…would be more beneficial": a copular clause has an adjective head, UD v2 cop).
    const head = c.rows.find((r) => r.id === c.report.id);
    const root = readRows(model, text).find((r) => r.deprel === "root");
    const alone = readRows(model, c.report.text).find((r) => r.deprel === "root");
    const intact = text.includes(c.report.text.slice(1)) && text.includes(c.subj.text.slice(1));
    return head && root?.form === head.form && alone?.form === head.form && intact
      ? { ok: true, recovered: { giver: c.subj.text, clause: head.lemma } }
      : { ok: false, why: `the reported clause did not survive intact: its head “${head?.form}” reads back as “${root?.form ?? "∅"}”` };
  }
  const back = claimFromSentence(text, null, { model });
  const same = (a, b) => !!a && !!b && a.replace(/^\p{L}/u, (x) => x.toLowerCase()) === b.replace(/^\p{L}/u, (x) => x.toLowerCase());
  if (!back) return { ok: false, why: "the paraphrase has no verbal root when read back" };
  if (back.untrusted) return { ok: false, why: `read back, ${back.why}` };
  if (back.pred.lemma !== c.pred.lemma && !(alt.alternation === "according-to")) return { ok: false, why: `predicate read back as “${back.pred.lemma}”, not “${c.pred.lemma}”` };
  if (alt.alternation === "passive") {
    const rows = back.rows;
    const root = rows.find((r) => r.deprel === "root");
    const pass = rows.find((r) => r.head === root.id && /^nsubj/.test(r.deprel));
    const agentObl = rows.filter((r) => r.head === root.id && r.deprel.startsWith("obl")).map((r) => extent(rows, r.id)).find((e) => e && /^by\s/i.test(text.slice(e.from, e.to)));
    const passText = pass ? text.slice(extent(rows, pass.id).from, extent(rows, pass.id).to) : null;
    const agentText = agentObl ? text.slice(agentObl.from, agentObl.to).replace(/^by\s+/i, "") : null;
    return same(passText, c.obj.text) && same(agentText, c.subj.text)
      ? { ok: true, recovered: { pred: c.pred.lemma, patient: passText, agent: agentText } }
      : { ok: false, why: `read back patient “${passText}” / agent “${agentText}”` };
  }
  return same(back.subj?.text, c.subj.text) && (!c.obj || same(back.obj?.text, c.obj.text))
    ? { ok: true, recovered: { pred: back.pred.lemma, subj: back.subj.text, obj: back.obj?.text ?? null } }
    : { ok: false, why: `read back subject “${back.subj?.text}”, object “${back.obj?.text}”` };
}

// ---- LOGOS: the dependency order of what makes sense --------------------------------------------------------------------------------
//
// User direction, 2026-10-14: "logos is good for catching grammar problems because they violate the dependency order of what makes
// sense." A paraphrase may move arguments around the predicate (that is what an alternation is), but inside every argument the order of
// dependence must hold: a carried word may not OUTLIVE its head (a modifier whose head was dropped: "A Sunshine Protection Act was
// passed" lost "bill" and kept its compound) and may not OUTRANK it (the source head no longer dominates it). Content words only
// (NOUN PROPN VERB ADJ NUM ADV); arcs from the predicate itself are exempt — re-placing arguments is the alternation's licensed move.
const CONTENT = new Set(["NOUN", "PROPN", "VERB", "ADJ", "NUM", "ADV"]);
export function logosOrder(sourceRows, outRows, { predId, exempt = new Set() } = {}) {
  const low = (x) => String(x).toLowerCase();
  // Align carried tokens by form, in order, each output token used once.
  const used = new Set();
  const map = new Map();
  for (const r of sourceRows) {
    if (!CONTENT.has(r.upos)) continue;
    const m = outRows.find((o) => !used.has(o.id) && low(o.form) === low(r.form));
    if (m) { used.add(m.id); map.set(r.id, m.id); }
  }
  const outHead = new Map(outRows.map((o) => [o.id, o.head]));
  const dominates = (a, b) => { let x = outHead.get(b), guard = 0; while (x && guard++ < 200) { if (x === a) return true; x = outHead.get(x); } return false; };
  const byId = new Map(sourceRows.map((r) => [r.id, r]));
  const violations = [];
  for (const r of sourceRows) {
    if (!map.has(r.id) || r.head === predId || exempt.has(r.id)) continue;
    const h = byId.get(r.head);
    if (!h || !CONTENT.has(h.upos) || h.id === predId) continue;
    if (!map.has(h.id)) violations.push({ kind: "outlives_head", word: r.form, head: h.form });
    else if (!dominates(map.get(h.id), map.get(r.id))) violations.push({ kind: "outranks_head", word: r.form, head: h.form });
  }
  return { ok: violations.length === 0, violations };
}

// ---- WHAT A PARAPHRASE LEAVES OUT: disclosed, or refused --------------------------------------------------------------------------
//
// Every CONTENT word of the source sentence (NOUN PROPN VERB ADJ NUM ADV) that no copied segment carries is accounted for. Dropped
// words are grouped into units: inside the paraphrased clause, the highest dropped ancestor below the predicate (its whole dropped
// subtree); outside it, the whole segment it sits in (another clause, a fronted subordinate, an adjunct the clause did not inherit).
//   · a unit that is a CORE argument of the predicate (UD v2 core: nsubj obj iobj ccomp xcomp csubj) → REFUSED: the claim lost an
//     argument, and disclosure would not give it back;
//   · a dropped NEGATION in the clause (EWT features Polarity=Neg or PronType=Neg) → REFUSED: the claim's polarity changed;
//   · anything else → DISCLOSED as `omitted` on the paraphrase, with its byte address.
// Before this, only numbers and proper names were demanded, and "yet for ending the twice-yearly clock change" was dropped silently.
const NEGATION = (r) => /Polarity=Neg|PronType=Neg/.test(r.feats ?? "");
export function omissionLedger(c, carried) {
  const whole = c.whole ?? c.rows;
  const predRow = c.rows.find((r) => r.at === c.pred.at);
  // The predicate and its auxiliaries are re-rendered by the alternation (an attested form, a re-agreed "has"), never dropped.
  const verbGroup = new Set(c.rows.filter((r) => r === predRow || (r.head === predRow?.id && /^aux/.test(r.deprel))).map((r) => r.at));
  const isCarried = (r) => verbGroup.has(r.at) || carried.some(([a, b]) => r.at >= a && r.at + r.form.length <= b);
  const inClause = (r) => !c.clause || (r.at >= c.clause.from && r.at < c.clause.to) || c.clause.fronted.some((f) => r.at >= f.from && r.at < f.to);
  const byId = new Map(c.rows.map((r) => [r.id, r]));
  const units = new Map(), refusals = [];
  const add = (u) => { const k = `${u.from}-${u.to}`; if (!units.has(k)) units.set(k, u); };
  for (const t of whole) {
    if (isCarried(t)) continue;
    const content = CONTENT.has(t.upos);
    if (inClause(t)) {
      const r = c.rows.find((x) => x.at === t.at && x.form === t.form);
      if (!r) { if (content) refusals.push({ word: t.form, why: "a dropped word the clause parse does not hold" }); continue; }
      if (NEGATION(r)) { refusals.push({ word: r.form, why: "a dropped negation changes the claim's polarity" }); continue; }
      if (!content) continue;
      let u = r;
      for (let guard = 0; guard < 200; guard++) { const h = byId.get(u.head); if (!h || h.id === predRow?.id || isCarried(h)) break; u = h; }
      if (u.head === predRow?.id && CORE.has(u.deprel.split(":")[0])) { refusals.push({ word: r.form, why: `a core argument (${u.deprel}) of the predicate is dropped` }); continue; }
      // A phrasal verb's particle is part of the predicate's own lexeme ("set back" is not "set"; UD v2 compound:prt).
      if (u.head === predRow?.id && u.deprel === "compound:prt") { refusals.push({ word: r.form, why: "a phrasal verb's particle (compound:prt) is dropped: the predicate changes" }); continue; }
      // The unit's dropped words, as CONTIGUOUS runs of the sentence (a carried word between two dropped ones splits them).
      const ts = subtree(c.rows, u.id).filter((x) => !isCarried(x) && x.upos !== "PUNCT").sort((a, b) => a.at - b.at);
      let run = [ts[0]];
      const flush = () => add({ kind: "modifier", relation: u.deprel, from: run[0].at, to: run.at(-1).at + run.at(-1).form.length });
      for (const x of ts.slice(1)) {
        const gap = c.rows.some((y) => y.at > run.at(-1).at && y.at < x.at && isCarried(y) && y.upos !== "PUNCT");
        if (gap) { flush(); run = [x]; } else run.push(x);
      }
      flush();
    } else if (content) {
      const seg = c.segmentation;
      const f = seg?.fronted.find((x) => t.at >= x.from && t.at < x.to);
      const cl = seg?.clauses.find((x) => t.at >= x.from && t.at < x.to);
      const host = f ?? cl;
      add(host ? { kind: f ? `fronted ${f.kind}` : `${cl.kind} clause`, from: host.from, to: host.to } : { kind: "word", from: t.at, to: t.at + t.form.length });
    }
  }
  const omitted = [...units.values()].sort((a, b) => a.from - b.from).map((u) => ({ ...u, ...narrow(c.address, c.text, u.from, u.to) }));
  return { omitted, refusals };
}
/** The gate: every dropped content word lies inside a disclosed unit, and nothing was refused. A paraphrase with its disclosure
 *  stripped fails here (the control in the tests). */
export function checkDisclosure(c, carried, omitted, refusals = []) {
  const isCarried = (r) => carried.some(([a, b]) => r.at >= a && r.at + r.form.length <= b);
  const silent = (c.whole ?? c.rows).filter((t) => CONTENT.has(t.upos) && t.at !== c.pred.at && !isCarried(t) && !omitted.some((u) => t.at >= u.from && t.at < u.to)).map((t) => t.form);
  return { ok: !silent.length && !refusals.length, silent, refused: refusals };
}

/**
 * Two laws of form a recombination can break even when every copied byte is right:
 *   CASE   a pronoun moved into the object of a frame preposition ("by", "according to") must not be nominative: "According to he",
 *          "passed by they" (CGEL ch. 5 §16.2: a preposition's pronoun complement is accusative). It applies only where English has a
 *          DISTINCT accusative: a pronoun lemma EWT attests with a Case=Acc form other than this one (he/him, they/them); "it" and "you"
 *          have none, so "by it" stands.
 *   PAIRS  a copied segment holds its brackets and parentheses in pairs: narrowing to a parse extent can cut "[ 69 ]" to "[ 69"
 *          (CMOS 6.95, 6.101: parentheses and brackets are used in pairs).
 */
const accIndex = new WeakMap();
function hasDistinctAccusative(lexicon, form, lemma) {
  let idx = accIndex.get(lexicon);
  if (!idx) {
    idx = new Map();
    for (const [k, v] of Object.entries(lexicon?.form ?? {})) {
      const [f, upos] = k.split("|");
      const [lem, feats] = String(v).split("\t");
      if (upos === "PRON" && /Case=Acc/.test(feats ?? "")) (idx.get(lem) ?? idx.set(lem, new Set()).get(lem)).add(f);
    }
    accIndex.set(lexicon, idx);
  }
  return [...(idx.get(lemma) ?? [])].some((f) => f !== form.toLowerCase());
}
function formLaws(segs, c, lexicon) {
  const v = [];
  for (const [i, x] of segs.entries()) {
    if (x.kind !== "source" || !x._part) continue;
    const opens = (x.t.match(/[([]/g) ?? []).length, closes = (x.t.match(/[)\]]/g) ?? []).length;
    if (opens !== closes) v.push({ law: "PAIRS", detail: x.t.slice(0, 40) });
    const prev = segs[i - 1];
    if (prev?.kind === "frame" && /\b(by|to)\s$/i.test(prev.t)) {
      const ts = c.rows.filter((r) => r.at >= x._part.from && r.at < x._part.to && r.upos !== "PUNCT");
      if (ts.length === 1 && ts[0].upos === "PRON" && /Case=Nom/.test(ts[0].feats ?? "") && hasDistinctAccusative(lexicon, ts[0].form, ts[0].lemma)) v.push({ law: "CASE", detail: `${prev.t.trim()} ${x.t}` });
    }
  }
  return v;
}
/**
 * ROLES, from the record: a passive makes the object the patient and the subject the agent. When the RECORD itself attests the new
 * patient as the doer of this very verb ("the Senate passed the bill"), the active clause used the verb with a path object ("It passed
 * the Senate": went through it), and the passive "The Senate was passed by it" reverses an attested role. `roles` maps a predicate's
 * LEMMA to the subjects (lowercased) the relation reader found for it across the record; absent, the law does not run.
 */
function roleLaw(alt, c, roles) {
  if (alt.alternation !== "passive" || !roles) return [];
  const doers = roles.get?.(c.pred.lemma);
  return doers?.has(c.obj.text.toLowerCase()) ? [{ law: "ROLES", detail: `the record attests “${c.obj.text}” as the one who ${c.pred.form}` }] : [];
}

/**
 * realizeClaim — the interface agreed with the Wald session (2026-10-14). `claim` is either a parsed claim (claimFromSentence) or
 * { text, address } of the source sentence to read. `grounds` are carried onto every sentence. `whom` is recorded, never used to change
 * the content. Only English realizes a paraphrase today; another language returns a typed refusal (no bilingual lexicon is on disk, and
 * the claim's predicate is an English lemma).
 */
export async function realizeClaim({ claim, grounds = [], lang = "en", whom = null, witness = null, roles = null } = {}, { slice, grammar, model, forms = null } = {}) {
  forms = forms ?? formsFromParserLexicon(model);
  if (lang !== "en") return { ok: false, alternatives: [], refusals: [{ why: `no ${lang} construction for an English predicate: a paraphrase across languages needs a bilingual lexicon, which is not on disk` }], whom };
  // The independent witness comes first: without it there is nothing to segment toward.
  if (!claim?.pred && !witness?.pred) return { ok: false, alternatives: [], refusals: [{ why: "no independent witness: the relation reader found no claim in this sentence, so the parser's reading stands alone" }], whom };
  let c = claim?.pred ? claim : null;
  if (!c) {
    const rc = readClause(claim.text, claim.address, { model, predForm: witness.pred, subjText: witness.subj ?? null });
    if (!rc.claim) return { ok: false, alternatives: [], refusals: [{ why: rc.refusal ?? "the sentence has no verbal root the parser could read", ...(rc.detail ? { detail: rc.detail } : {}) }], whom };
    c = rc.claim;
  }
  if (!c) return { ok: false, alternatives: [], refusals: [{ why: "the sentence has no verbal root the parser could read" }], whom };
  if (c.untrusted) return { ok: false, alternatives: [], refusals: [{ why: c.why }], whom };
  // The independent witness: the relation reader's own predicate and subject for this sentence.
  if (!witness?.pred) return { ok: false, alternatives: [], refusals: [{ why: "no independent witness: the relation reader found no claim in this sentence, so the parser's reading stands alone" }], whom };
  const low = (x) => String(x ?? "").toLowerCase();
  const subjAgrees = !witness.subj || !c.subj || low(c.subj.text).includes(low(witness.subj)) || low(witness.subj).includes(low(c.subj.text));
  const groupAgrees = low(c.pred.form) === low(witness.pred) || c.aux.some((a) => low(a) === low(witness.pred));
  if (!groupAgrees || !subjAgrees) return { ok: false, alternatives: [], refusals: [{ why: `the parser and the relation reader disagree: parser “${c.subj?.text ?? "∅"} ${c.pred.form}”, relations.js “${witness.subj ?? "∅"} ${witness.pred}”` }], whom };
  const { out, refusals } = englishAlternations(c, { forms });
  const alternatives = [];
  for (const alt of out) {
    const segs = partsToSegs(alt.parts, c);
    const s = sentence(segs, grounds.length ? grounds : [c.address]);
    const lint = [...lintSentence(s, grammar), ...verifyWords(s, alt.words), ...formLaws(segs, c, model?.lexicon), ...roleLaw(alt, c, roles)];
    // Copied bytes must re-verify; a case-folded segment differs from its bytes only in its first letter.
    const verified = await Promise.all(segs.filter((x) => x.kind === "source").map(async (x) => { const b = await slice(x.address); return b === x.t || (x.caseFolded && b && b.slice(1) === x.t.slice(1)); }));
    const equate = reverseEquate({ ...alt, segs }, c, s.text, { model });
    // NET NEW, with no constant: the source clause is its own null. A paraphrase is net-new when it holds at least one word adjacency
    // (ordered bigram) the source never holds; a copy holds none. The DMCA 6-gram count is reported beside it, never gated on.
    const bigrams = (t) => { const w = t.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) ?? []; return new Set(w.slice(1).map((x, i) => `${w[i]} ${x}`)); };
    const srcBi = bigrams(c.text);
    const fresh = [...bigrams(s.text)].filter((b) => !srcBi.has(b));
    const dm = runDMCA({ text: s.text, sources: new Map([["src", c.text]]), n: 6 });
    const novelty = { newAdjacencies: fresh.length, examples: fresh.slice(0, 3), dmcaCopied6: dm.copied ?? 0, netNew: fresh.length > 0 };
    // What the paraphrase leaves out: disclosed with addresses, or refused (omissionLedger).
    const carriedRanges = segs.filter((x) => x._part).map((x) => [x._part.from, x._part.to]);
    const ledger = omissionLedger(c, carriedRanges);
    const omitted = ledger.omitted;
    const disclosure = checkDisclosure(c, carriedRanges, omitted, ledger.refusals);
    const outLow = s.text.toLowerCase();
    const omittedLow = omitted.map((u) => u.text).join(" ").toLowerCase();
    const dropped = c.anchors.filter((a) => !outLow.includes(a.toLowerCase()) && !omittedLow.includes(a.toLowerCase()));
    const carries = { ok: dropped.length === 0, dropped };
    // Logos: parse the paraphrase and hold it to the source's dependency order within every argument.
    const outRows = readRows(model, s.text);
    const sourceOwn = new Set(subtree(c.rows, c.rows.find((r) => r.form === c.pred.form && r.at === c.pred.at)?.id ?? -1).map((t) => t.id));
    // A prepositional phrase moved between the object noun and its verb is the reader's attachment ambiguity, not a change of sense:
    // its head word is exempt from the outrank test (it is still carried, and still checked as a head of its own dependents).
    const ppHeads = new Set((c.obj?.adjuncts ?? []).map((a) => a.id));
    const logos = logosOrder(c.rows.filter((r) => sourceOwn.has(r.id)), outRows, { predId: c.rows.find((r) => r.at === c.pred.at)?.id, exempt: ppHeads });
    const ok = !lint.length && verified.every(Boolean) && equate.ok && novelty.netNew && carries.ok && disclosure.ok && logos.ok;
    alternatives.push({ alternation: alt.alternation, text: s.text, segs, lint, verified: verified.every(Boolean), equate, novelty, carries, disclosure, logos, ok, ...(omitted.length ? { omitted } : {}) });
  }
  return { ok: alternatives.some((a) => a.ok), source: { text: c.text, address: c.address }, claim: { pred: c.pred.lemma, voice: c.voice, subj: c.subj?.text ?? null, obj: c.obj?.text ?? null }, ...(c.clause ? { clause: c.clause } : {}), alternatives, refusals, whom };
}
