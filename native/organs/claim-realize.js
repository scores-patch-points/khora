// organs/claim-realize.js — NET-NEW PARAPHRASE of a claim, mechanically: the claim's own arguments, as copied and addressed bytes,
// recombined by the language's grammar into a sentence the source never wrote. No model.
//
//   realizeClaim({ claim, grounds, lang, whom }, { slice, grammar, model, forms }) → { ok, alternatives: [{ alternation, text, segs,
//                                                   lint, equate, novelty }], refusals }
//   claimFromSentence(text, address, { model }) → the claim the sentence's own UD parse states (root, subject, object, obliques, report)
//
// HOW (the house pipeline NL → grammar → EOT → grammar → NL, at clause grain):
//   READ     khora's UD English parser (adapters/text/english-parser.js, trained on UD English-EWT) reads the source sentence; the claim is
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
import { parseText } from "../adapters/text/english-parser.js";
import { normFeats } from "../kernel/eot-realize.js";
import { seg, sentence, lintSentence, verifyWords, narrow } from "./prose-laws.js";
import { runDMCA } from "./run-dmca.js";

const rowsOf = (conllu) => String(conllu).split("\n").filter((l) => /^\d+\t/.test(l)).map((l) => {
  const c = l.split("\t");
  return { id: Number(c[0]), form: c[1], lemma: c[2], upos: c[3], feats: c[5], head: Number(c[6]), deprel: c[7], at: Number((c[9].match(/Offset=(\d+)/) ?? [])[1] ?? -1) };
});
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

/** The claim a sentence's own parse states. Returns null when the sentence has no verbal root. */
export function claimFromSentence(text, address, { model, predForm = null }) {
  const rows = rowsOf(parseText(model, text));
  // The clause is anchored on the predicate an INDEPENDENT reader named, wherever the parser put the root; else on the root itself.
  const named = predForm ? rows.find((r) => r.form.toLowerCase() === String(predForm).toLowerCase() && (r.upos === "VERB" || r.upos === "AUX")) : null;
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
    return core ? { ...core, adjuncts: pp.map((k) => span(k)).filter(Boolean), appositives: ap.map((k) => span(k)).filter(Boolean) } : null;
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

// ---- the English alternations ----------------------------------------------------------------------------------------------------------

const EN_FRAME = { passive: new Set(["was", "were", "is", "are", "by"]), adjunct: new Set([]), according: new Set(["according", "to"]) };

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

  // 1. ACTIVE → PASSIVE: "[obj] was/were [participle] by [subj] [obls]."
  if (c.voice === "active" && c.subj && c.obj && !c.aux.length && !c.neg) {
    if (!participle) refusals.push({ alternation: "passive", why: `no participle of “${c.pred.lemma}” attested in UD English-EWT` });
    else {
      const be = tense === "Past" ? (c.obj.number === "Plur" ? "were" : "was") : (c.obj.number === "Plur" ? "are" : "is");
      const tail = [...c.obj.adjuncts, ...c.obls].sort((a, b) => a.from - b.from);
      out.push({ alternation: "passive", words: EN_FRAME.passive, omitted: c.obj.appositives.map((a) => a.text), parts: [{ span: c.obj, start: true }, { frame: ` ${be} ` }, { form: participle, lemma: c.pred.lemma }, { frame: " by " }, { span: c.subj }, ...tail.map((o) => [{ frame: " " }, { span: o }]).flat(), { frame: "." }] });
    }
  }
  // 2. ADJUNCT MOVED: a fronted oblique goes to the end; a final one comes to the front.
  if (c.subj && c.obls.length) {
    const head = Math.min(...[c.subj, c.obj, ...c.obls].filter(Boolean).map((s) => s.from));
    const fronted = c.obls.find((o) => o.from === head);
    const core = { from: Math.min(c.subj.from, c.pred.at), to: Math.max(c.pred.at + c.pred.form.length, c.obj?.to ?? 0, ...(c.obj?.adjuncts ?? []).map((a) => a.to), ...c.obls.filter((o) => o !== fronted).map((o) => o.to)) };
    if (fronted && core.to > core.from) {
      const coreSpan = { ...core, text: c.text.slice(core.from, core.to), first: c.subj.first };
      out.push({ alternation: "adjunct-to-end", words: EN_FRAME.adjunct, parts: [{ span: coreSpan, start: true }, { frame: " " }, { span: fronted }, { frame: "." }] });
    } else if (!fronted) {
      const last = c.obls.at(-1);
      const rest = { from: c.subj.from, to: last.from, text: c.text.slice(c.subj.from, last.from).replace(/[\s,]+$/, ""), first: c.subj.first };
      rest.to = rest.from + rest.text.length;
      if (rest.text) out.push({ alternation: "adjunct-to-front", words: EN_FRAME.adjunct, parts: [{ span: last, start: true }, { frame: ", " }, { span: rest }, { frame: "." }] });
    }
  }
  // 3. REPORT: "[subj] [argue|say…] [clause]" → "According to [subj], [clause]."
  if (c.report && c.subj && c.voice === "active") {
    out.push({ alternation: "according-to", words: EN_FRAME.according, parts: [{ frame: "According to " }, { span: c.subj }, { frame: ", " }, { span: c.report }, { frame: "." }] });
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
    const wasStart = sp.from === 0;
    const proper = sp.first?.upos === "PROPN";
    if (atStart && /^\p{Ll}/u.test(t)) { t = t[0].toUpperCase() + t.slice(1); caseFolded = true; }
    else if (!atStart && wasStart && !proper && /^\p{Lu}\p{Ll}/u.test(t)) { t = t[0].toLowerCase() + t.slice(1); caseFolded = true; }
    segs.push({ ...seg.source(t, nn.address), ...(caseFolded ? { caseFolded: true } : {}) });
  }
  return segs;
}

/** Parse the paraphrase back and require the same predicate and the same argument bytes in their new roles. */
function reverseEquate(alt, c, text, { model }) {
  const back = claimFromSentence(text, null, { model });
  const same = (a, b) => !!a && !!b && a.replace(/^\p{L}/u, (x) => x.toLowerCase()) === b.replace(/^\p{L}/u, (x) => x.toLowerCase());
  if (!back) return { ok: false, why: "the paraphrase has no verbal root when read back" };
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
  if (alt.alternation === "according-to") {
    const inner = claimFromSentence(c.report.text, null, { model });
    return inner && text.includes(c.report.text.slice(1)) && text.includes(c.subj.text.slice(1)) ? { ok: true, recovered: { giver: c.subj.text, clause: inner.pred.lemma } } : { ok: false, why: "the reported clause did not survive intact" };
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

/**
 * realizeClaim — the interface agreed with the Wald session (2026-10-14). `claim` is either a parsed claim (claimFromSentence) or
 * { text, address } of the source sentence to read. `grounds` are carried onto every sentence. `whom` is recorded, never used to change
 * the content. Only English realizes a paraphrase today; another language returns a typed refusal (no bilingual lexicon is on disk, and
 * the claim's predicate is an English lemma).
 */
export async function realizeClaim({ claim, grounds = [], lang = "en", whom = null, witness = null } = {}, { slice, grammar, model, forms = null } = {}) {
  forms = forms ?? formsFromParserLexicon(model);
  if (lang !== "en") return { ok: false, alternatives: [], refusals: [{ why: `no ${lang} construction for an English predicate: a paraphrase across languages needs a bilingual lexicon, which is not on disk` }], whom };
  const c = claim?.pred ? claim : claimFromSentence(claim.text, claim.address, { model, predForm: witness?.pred ?? null });
  if (!c) return { ok: false, alternatives: [], refusals: [{ why: "the sentence has no verbal root the parser could read" }], whom };
  if (c.untrusted) return { ok: false, alternatives: [], refusals: [{ why: c.why }], whom };
  // The independent witness: the relation reader's own predicate and subject for this sentence.
  if (!witness?.pred) return { ok: false, alternatives: [], refusals: [{ why: "no independent witness: the relation reader found no claim in this sentence, so the parser's reading stands alone" }], whom };
  const low = (x) => String(x ?? "").toLowerCase();
  const subjAgrees = !witness.subj || !c.subj || low(c.subj.text).includes(low(witness.subj)) || low(witness.subj).includes(low(c.subj.text));
  if (low(c.pred.form) !== low(witness.pred) || !subjAgrees) return { ok: false, alternatives: [], refusals: [{ why: `the parser and the relation reader disagree: parser “${c.subj?.text ?? "∅"} ${c.pred.form}”, relations.js “${witness.subj ?? "∅"} ${witness.pred}”` }], whom };
  const { out, refusals } = englishAlternations(c, { forms });
  const alternatives = [];
  for (const alt of out) {
    const segs = partsToSegs(alt.parts, c);
    const s = sentence(segs, grounds.length ? grounds : [c.address]);
    const lint = [...lintSentence(s, grammar), ...verifyWords(s, alt.words)];
    // Copied bytes must re-verify; a case-folded segment differs from its bytes only in its first letter.
    const verified = await Promise.all(segs.filter((x) => x.kind === "source").map(async (x) => { const b = await slice(x.address); return b === x.t || (x.caseFolded && b && b.slice(1) === x.t.slice(1)); }));
    const equate = reverseEquate(alt, c, s.text, { model });
    // NET NEW, with no constant: the source clause is its own null. A paraphrase is net-new when it holds at least one word adjacency
    // (ordered bigram) the source never holds; a copy holds none. The DMCA 6-gram count is reported beside it, never gated on.
    const bigrams = (t) => { const w = t.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) ?? []; return new Set(w.slice(1).map((x, i) => `${w[i]} ${x}`)); };
    const srcBi = bigrams(c.text);
    const fresh = [...bigrams(s.text)].filter((b) => !srcBi.has(b));
    const dm = runDMCA({ text: s.text, sources: new Map([["src", c.text]]), n: 6 });
    const novelty = { newAdjacencies: fresh.length, examples: fresh.slice(0, 3), dmcaCopied6: dm.copied ?? 0, netNew: fresh.length > 0 };
    const outLow = s.text.toLowerCase();
    const omittedLow = (alt.omitted ?? []).join(" ").toLowerCase();
    const dropped = c.anchors.filter((a) => !outLow.includes(a.toLowerCase()) && !omittedLow.includes(a.toLowerCase()));
    const carries = { ok: dropped.length === 0, dropped };
    // Logos: parse the paraphrase and hold it to the source's dependency order within every argument.
    const outRows = rowsOf(parseText(model, s.text));
    const sourceOwn = new Set(subtree(c.rows, c.rows.find((r) => r.form === c.pred.form && r.at === c.pred.at)?.id ?? -1).map((t) => t.id));
    // A prepositional phrase moved between the object noun and its verb is the reader's attachment ambiguity, not a change of sense:
    // its head word is exempt from the outrank test (it is still carried, and still checked as a head of its own dependents).
    const ppHeads = new Set((c.obj?.adjuncts ?? []).map((a) => a.id));
    const logos = logosOrder(c.rows.filter((r) => sourceOwn.has(r.id)), outRows, { predId: c.rows.find((r) => r.at === c.pred.at)?.id, exempt: ppHeads });
    const ok = !lint.length && verified.every(Boolean) && equate.ok && novelty.netNew && carries.ok && logos.ok;
    alternatives.push({ alternation: alt.alternation, text: s.text, segs, lint, verified: verified.every(Boolean), equate, novelty, carries, logos, ok, ...(alt.omitted?.length ? { omitted: alt.omitted } : {}) });
  }
  return { ok: alternatives.some((a) => a.ok), source: { text: c.text, address: c.address }, claim: { pred: c.pred.lemma, voice: c.voice, subj: c.subj?.text ?? null, obj: c.obj?.text ?? null }, alternatives, refusals, whom };
}
