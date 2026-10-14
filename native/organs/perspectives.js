// organs/perspectives.js — the SPECTRUM of perspectives on a topic, and how they fit together. Pure; the parser model is injected.
//
// The user, 2026-10-14: "figure out how to fix this, how to get polarity correct, and how also to find all perspectives … identify the
// full spectrum of perspectives and how they all fit together."
//
//   NL sentence → parse slots (claim-realize.js claimFromSentence: UPOS, deprel, lemma, voice, negation) → HOLDER × STANCE-TOWARD-TOPIC
//   → kernel/perspective.js (Mahavira: a claim is true from a standpoint; standpoints are kept apart) → positions, common ground, divergence.
//
// THE THREE QUESTIONS, EACH WITH ITS GIVER
//   WHO HOLDS IT  A quoted speaker (the quote's own attribution), or the AGENT of a reporting clause ("Critics say …", "the Academy
//                 opposes …"). The page's author is who REPORTS it (`via`), never who holds it: an article that says "AASM opposes the
//                 bill" does not oppose the bill. This is why a supporter's quote could lead a "who opposes" answer before.
//   WHAT IT IS ABOUT  the topic must stand in the claim as its PATIENT (object, or a passive's subject) or an oblique of the predicate.
//                 As the AGENT ("the bill would harm farmers") the claim is an effect, not a stance toward it: typed `topic_as_agent`.
//   WHICH WAY     POLARITY, derived from the corpus with no word list:
//                   - the pole of the question's own predicate is "+" (asked);
//                   - explicit negation (the parser's own advmod "not"/"never") flips the claim's effective pole;
//                   - predicates the corpus itself sets against each other: "A, but B" (contrast conjunction, parity = 1 ^ negA ^ negB)
//                     and "A and B" over one subject (parity 0). A signed union-find propagates parity to the predicate lemmas.
//                 A predicate the corpus never links to the asked one is "?" — typed unresolved, never guessed, never put on a side. A
//                 component whose edges disagree is "contested" and also unresolved.
// THE PRIORS: the polarity prior is the corpus's own contrast constructions plus the parser's negation relation; nothing else. NEGATION
// is the parser's (UD advmod), not a typed list. The cost is recall: a corpus with few contrast constructions resolves few predicates
// (measured, CALLIMACHUS.md §17).
import { claimFromSentence, claimFromRows, readRows } from "./claim-realize.js";
import { giverOf } from "./giver.js";
import { splitSentences } from "../adapters/text/spans.js";
import { offsetMap, convertOffset, formatAddress } from "./pinax.js";
import { quotedSpans, attributeQuotation } from "../adapters/text/attribution.js";
import { projectPerspectives, perspectiveOperation, commonGround, divergence, STANCE, BASIS } from "../kernel/perspective.js";

/**
 * THE PROBE FRAMES — declared, the user's own: "who is against? who doesn't like?" (2026-10-14). They are the frame words of the
 * stance QUESTIONS (as telling-grammar frame words are the frame of the telling), each with the pole it asks relative to the topic.
 * They seed the signed graph; the corpus's own contrast/and constructions extend it to predicates no frame names, and a falsifiable
 * check (`frameCheck`) reports whether the corpus's own edges agree with the seed. English only; another language brings its own.
 */
export const STANCE_FRAMES = Object.freeze({
  giver: "user direction 2026-10-14: 'who is against? who doesn't like?' — declared frame words, English",
  pro: Object.freeze(["support", "back", "favor", "endorse", "champion", "applaud", "like", "want", "welcome"]),
  con: Object.freeze(["oppose", "object", "dislike", "criticize", "reject", "resist", "block", "fight", "hate"]),
  // EVALUATIVE adjectives ("X is better for your health"): a minimal axis; affix antonymy (un-/dis-/non-/anti-) and the corpus's own
  // contrast edges extend it (healthy/unhealthy …). Ablation 2026-10-14 (eval/callimachus/polarity-ablation.mjs): no derived arm
  // covers the corpus's contrast pairs, so this seed stays declared.
  eval: Object.freeze({ pos: Object.freeze(["good", "better", "best"]), neg: Object.freeze(["bad", "worse", "worst"]) }),
});

const CONTRAST = new Set(["but", "while", "whereas", "yet"]);
const kidsOf = (rows, id) => rows.filter((r) => r.head === id);
const isNeg = (rows, v) => kidsOf(rows, v.id).some((r) => r.deprel === "advmod" && /^(not|n't|never)$/i.test(r.form));
const isVerb = (r) => r.upos === "VERB";

/** Signed union-find over predicate lemmas: parity 0 = same pole, 1 = opposite pole. */
function signedGraph() {
  const parent = new Map(), par = new Map(), bad = new Set();
  const find = (x) => {
    if (!parent.has(x)) { parent.set(x, x); par.set(x, 0); }
    if (parent.get(x) === x) return [x, 0];
    const [r, p] = find(parent.get(x));
    parent.set(x, r); par.set(x, par.get(x) ^ p);
    return [r, par.get(x)];
  };
  const link = (a, b, parity) => {
    const [ra, pa] = find(a), [rb, pb] = find(b);
    if (ra === rb) { if ((pa ^ pb) !== parity) bad.add(ra); return; }
    parent.set(ra, rb); par.set(ra, pa ^ pb ^ parity);
    if (bad.has(ra)) bad.add(rb);
  };
  return { find, link, contested: (x) => bad.has(find(x)[0]) };
}

/** The predicate-contrast edges one parsed sentence states. → [{a, b, parity, kind}] */
export function edgesOf(rows) {
  const out = [];
  for (const c of rows.filter((r) => isVerb(r) && r.deprel === "conj")) {
    // LOGOS: a verbal conjunct coordinates a PREDICATE. When the parser hung it on a noun ("approved the Sunshine Bill, but Maria Lopez
    // opposed …" → opposed ← conj ← Bill), the dependency order is broken and the coordinated predicate is the governing verb of that noun.
    let h = rows.find((r) => r.id === c.head);
    for (let hop = 0; h && !isVerb(h) && hop < 8; hop++) h = rows.find((r) => r.id === h.head) ?? null;
    if (!h || !isVerb(h) || h.lemma === c.lemma) continue;
    const cc = kidsOf(rows, c.id).find((r) => r.deprel === "cc");
    const word = cc?.form.toLowerCase();
    const na = isNeg(rows, h) ? 1 : 0, nb = isNeg(rows, c) ? 1 : 0;
    if (word && CONTRAST.has(word)) out.push({ a: h.lemma, b: c.lemma, parity: 1 ^ na ^ nb, kind: "contrast", word });
    else if (word === "and" || word === "or") {
      const same = (x) => kidsOf(rows, x.id).find((r) => r.deprel.startsWith("nsubj"))?.id ?? null;
      // "and"-coordination shares its subject by UD (the second conjunct has no nsubj of its own): the same holder doing both
      if (!same(c)) out.push({ a: h.lemma, b: c.lemma, parity: na ^ nb, kind: "and", word });
    }
  }
  return out;
}

/**
 * LOGOS, repaired on the rows: a verbal conjunct coordinates a PREDICATE. Where the parser hung it on a noun ("approved the Sunshine
 * Bill, but Maria Lopez opposed …": opposed ← conj ← Bill) the dependency order is broken, and the conjunct is re-hung on the governing
 * verb of that noun. Only that one shape is repaired; every other attachment stays the parser's.
 */
export function repairRows(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows.map((r) => {
    if (r.upos !== "VERB" || r.deprel !== "conj") return r;
    let h = byId.get(r.head);
    if (!h || isVerb(h)) return r;
    for (let hop = 0; h && !isVerb(h) && hop < 8; hop++) h = byId.get(h.head);
    return h && isVerb(h) ? { ...r, head: h.id } : r;
  });
}

const spanText = (claim, s) => (s ? claim.text.slice(s.from, s.to) : null);
const headRow = (claim, s) => (s ? claim.rows.find((r) => r.id === s.id) ?? null : null);

const CLAUSAL = new Set(["ccomp", "xcomp", "parataxis", "advcl", "acl", "conj"]);
const base = (d) => String(d).split(":")[0];

/**
 * EVERY verb of one sentence whose clause states something toward the topic → [{ role, pred, negated, voice, holder, reported }].
 * One parse; each verb is read as its own clause (claimFromRows anchored on it). A holder is the verb's own subject; a clause that
 * has none (a coordinated verb sharing its subject, a ccomp) takes the subject of the verb that governs it (UD): "Critics say the
 * bill would harm riders" → the clause "harm" is held by "critics" and REPORTED. A refusal is typed, never dropped.
 */
export function stancesOf(text, address, { model, focusSurfaces, entities = [] }) {
  const rows = repairRows(readRows(model, text));
  if (!rows.length) return [{ refusal: "no_parse" }];
  const out = [];
  // A verb-tagged token INSIDE a mention of the topic ("Daylight SAVING Time") is part of the topic's name, not a predicate about it.
  const low = text.toLowerCase(), inside = [];
  for (const f of focusSurfaces) for (let i = low.indexOf(f); i >= 0; i = low.indexOf(f, i + f.length)) inside.push([i, i + f.length]);
  for (const v of rows.filter((r) => r.upos === "VERB" && !inside.some(([a, b]) => r.at >= a && r.at < b))) {
    // "that" opening a complement clause is a complementiser, not evidence that the clause is subordinate in what it asserts
    const rr = rows.map((r) => (r.head === v.id && r.deprel === "mark" && r.form.toLowerCase() === "that" ? { ...r, deprel: "dep" } : r));
    const claim = claimFromRows(text, address, rr, { predForm: v.form, predAt: v.at });
    if (!claim || claim.untrusted) continue;
    const mentions = (s) => !!s && focusSurfaces.some((f) => spanText(claim, s)?.toLowerCase().includes(f));
    const patient = claim.voice === "passive" ? claim.subj : claim.obj;
    let role = null;
    if (mentions(patient)) role = "patient";
    else if ((claim.obls ?? []).some((o) => mentions(o))) role = "oblique";
    else if (mentions(claim.subj)) role = "agent";
    if (!role) continue;
    if (role === "agent") { out.push({ refusal: "topic_as_agent", pred: claim.pred.lemma, negated: !!claim.neg }); continue; }
    // holder: own agent; else climb the governing verbs
    let holder = null, reported = false, at = v;
    if (claim.voice !== "passive") holder = headRow(claim, claim.subj);
    for (let hop = 0; !holder && hop < 6; hop++) {
      const gov = rows.find((r) => r.id === at.head);
      if (!gov) break;
      if (CLAUSAL.has(base(at.deprel)) && base(at.deprel) !== "conj") reported = true;
      const gc = claimFromRows(text, address, rows, { predForm: gov.form, predAt: gov.at });
      if (gc && !gc.untrusted && gc.subj && gc.voice !== "passive") { holder = headRow(gc, gc.subj); if (holder) holder = { ...holder, _claim: gc }; break; }
      at = gov;
    }
    // a passive's by-phrase agent
    if (!holder && claim.voice === "passive") {
      const by = (claim.obls ?? []).find((o) => claim.rows.some((r) => r.head === o.id && r.deprel === "case" && r.form.toLowerCase() === "by"));
      if (by) holder = headRow(claim, by);
    }
    // A pronoun subject of a REPORTED clause is bound to the reporting clause's subject ("Rounds told reporters that HE opposes …"). A
    // pronoun with no such binder is typed, never resolved by guess (cross-sentence coreference is pronouns.js's job, not this organ's).
    let pronoun = null;
    if (holder && holder.upos === "PRON") {
      let gov = rows.find((r) => r.id === v.head), bound = null;
      for (let hop = 0; gov && !bound && hop < 6; hop++) {
        const gc = claimFromRows(text, address, rows, { predForm: gov.form, predAt: gov.at });
        const sh = gc && !gc.untrusted && gc.subj ? headRow(gc, gc.subj) : null;
        if (sh && sh.upos !== "PRON") bound = { ...sh, _claim: gc };
        gov = rows.find((r) => r.id === gov.head);
      }
      if (bound) { holder = bound; reported = true; } else pronoun = holder.form;
    }
    const hc = holder?._claim ?? claim;
    const hs = holder ? (holder._claim ? holder._claim.subj : claim.voice === "passive" ? (claim.obls ?? []).find((o) => o.id === holder.id) ?? claim.subj : claim.subj) : null;
    let htext = holder && !pronoun ? spanText(hc, hs) ?? holder.form : null, hfrom = hs?.from ?? null, hto = hs?.to ?? null, referent = null;
    // REFERENTS MERGE: a holder is the record's admitted referent, not a string. "Republican Senator" followed in the sentence by an
    // admitted name ("… Senator Mike Rounds …") is that name's referent; a bare title or a surface the record already admitted resolves
    // to the same id, so "Rounds", "Sen. Rounds" and "Mike Rounds" are one holder across pages.
    if (htext && entities.length && hto != null) {
      const after = text.slice(hto).replace(/^\s+/, ""), lead = text.length - text.slice(hto).length;
      const surf = (e) => e.surfaces ?? [e.name].filter(Boolean);
      let best = null;
      for (const e of entities) for (const f of surf(e)) if (f.length >= 3 && after.startsWith(f) && !/[\p{L}\p{N}]/u.test(after[f.length] ?? " ") && (!best || f.length > best.f.length)) best = { e, f };
      if (best) { htext = `${htext} ${best.f}`; hto = hto + (text.slice(hto).length - after.length) + best.f.length; referent = best.e.id; void lead; }
    }
    // A title the parse follows with proper-name tokens ("Republican Senator | Mike Rounds") is that person: the name is attested in the
    // sentence even when the record never admitted it (one occurrence is below the admission floor).
    if (htext && !referent && hto != null) {
      let end = hto, name = [];
      for (const r of rows.filter((x) => x.at >= hto).sort((a, b) => a.at - b.at)) {
        // a name's continuation: PROPN, or a capitalised token the parse hangs as `flat` on the name ("Rounds" tagged NOUN)
        // (the continuation may be mis-tagged — "Rounds" came back NOUN — so once a name has begun, an ADJACENT capitalised token continues it)
        const cap = /^\p{Lu}/u.test(r.form);
        if (!(r.upos === "PROPN" || (cap && (name.length > 0 || /^flat/.test(r.deprel)))) || !/^\s*$/.test(text.slice(end, r.at))) break;
        name.push(r.form); end = r.at + r.form.length;
      }
      if (name.length) { htext = `${htext} ${name.join(" ")}`; hto = end; }
    }
    if (htext && entities.length && !referent) {
      const low = htext.toLowerCase();
      const hit = entities.find((e) => (e.surfaces ?? [e.name]).some((f) => f && f.toLowerCase() === low))
;
      if (hit) referent = hit.id;
    }
    out.push({ role, pred: claim.pred.lemma, negated: !!claim.neg, voice: claim.voice, reported, holder: holder ? { lemma: holder.lemma, upos: holder.upos, text: pronoun ? null : htext, pronoun, from: hfrom, to: hto, referent } : null });
  }
  // EVALUATION: a copular clause whose predicate is an ADJECTIVE and whose subject is the topic ("permanent standard time IS better for
  // health"). The stance is the adjective's pole; a comparative's "than"-complement flips it (the topic is what the other is better than).
  const forms = model.morphology?.forms ?? {};
  for (const a of rows.filter((r) => r.upos === "ADJ")) {
    const kids = rows.filter((r) => r.head === a.id);
    const subjRow = kids.find((r) => base(r.deprel) === "nsubj"), isCop = kids.some((r) => r.deprel === "cop");
    if (!subjRow || !isCop) continue;
    const sub = (id) => { const out = new Set([id]); let grew = true; while (grew) { grew = false; for (const r of rows) if (!out.has(r.id) && out.has(r.head) && !["punct"].includes(r.deprel)) { out.add(r.id); grew = true; } } return rows.filter((r) => out.has(r.id)).sort((x, y) => x.at - y.at); };
    const stext = sub(subjRow.id).map((r) => r.form).join(" ").toLowerCase();
    const onSubject = focusSurfaces.some((f) => stext.includes(f));
    const thanKid = kids.find((r) => base(r.deprel) === "obl" && rows.some((c) => c.head === r.id && c.deprel === "case" && c.form.toLowerCase() === "than"));
    const onThan = !!thanKid && focusSurfaces.some((f) => sub(thanKid.id).map((r) => r.form).join(" ").toLowerCase().includes(f));
    if (!onSubject && !onThan) continue;
    let lemma = String(a.lemma).toLowerCase();
    if (forms[lemma]?.length) lemma = forms[lemma][0]; // "better" → "good" (the morphology prior's irregular table)
    const negated = kids.some((r) => r.deprel === "advmod" && /^(not|n't|never)$/i.test(r.form)) || kids.some((r) => r.deprel === "cop" && false);
    // holder: climb the governing verbs of the adjective (ccomp of "argue"/"say")
    let holder = null, reported = false, at = a;
    for (let hop = 0; !holder && hop < 6; hop++) {
      const gov = rows.find((r) => r.id === at.head);
      if (!gov) break;
      if (CLAUSAL.has(base(at.deprel)) && base(at.deprel) !== "conj") reported = true;
      if (gov.upos === "VERB") {
        const gc = claimFromRows(text, address, rows, { predForm: gov.form, predAt: gov.at });
        if (gc && !gc.untrusted && gc.subj && gc.voice !== "passive") { holder = { ...headRow(gc, gc.subj), _claim: gc }; break; }
      }
      at = gov;
    }
    // a governing clause's pronoun subject cannot be resolved here
    const htxt = holder ? spanText(holder._claim, holder._claim.subj) : null;
    out.push({ role: "evaluated", pred: lemma, negated: negated !== onThan ? true : false, flipped_by_than: onThan, voice: "active", reported, evaluation: true,
      holder: holder ? { lemma: holder.lemma, upos: holder.upos, text: holder.upos === "PRON" ? null : htxt, pronoun: holder.upos === "PRON" ? holder.form : null, from: holder._claim.subj?.from ?? null, to: holder._claim.subj?.to ?? null, referent: null } : null });
  }
  return out.length ? out : [{ refusal: "topic_not_in_claim" }];
}

/**
 * readPerspectives(record, { model, question, texts, topicSurfaces })
 *   texts: Map<pinaxId, text layer> of the NON-index sources (edges are mined from every sentence, not only atoms).
 *   question: a question-void reading (focus referent ids, reading.relation.lemma).
 *   topicSurfaces: lowercased surface strings of the topic (the focus referents' surfaces).
 */
export function readPerspectives(record, { model, question, texts = new Map(), topicSurfaces = [], frames = null, aliases = true } = {}) {
  const askedLemma = String(question?.reading?.relation?.lemma ?? "").toLowerCase() || null;
  const surfaces = topicSurfaces.map((s) => String(s).toLowerCase()).filter((s) => s.length >= 3);
  const focus = new Set(question?.focus ?? []);
  // 1. predicate poles, from the corpus's own constructions
  const G = signedGraph();
  const edges = [];
  // the frame seed: all `pro` lemmas share a pole, all `con` lemmas share the other; the two groups are opposite
  const fr = frames ?? null;
  if (fr) {
    for (const l of fr.pro.slice(1)) G.link(fr.pro[0], l, 0);
    for (const l of fr.con.slice(1)) G.link(fr.con[0], l, 0);
    if (fr.pro[0] && fr.con[0]) G.link(fr.pro[0], fr.con[0], 1);
    const ev = fr.eval;
    if (ev) {
      for (const l of ev.pos.slice(1)) G.link(ev.pos[0], l, 0);
      for (const l of ev.neg.slice(1)) G.link(ev.neg[0], l, 0);
      G.link(ev.pos[0], ev.neg[0], 1);
      if (fr.pro[0]) G.link(fr.pro[0], ev.pos[0], 0); // "X is good" and "supports X" are the same side
    }
  }
  const vocab = new Set();
  const indexIds = new Set((record.sources ?? []).filter((s) => s.role === "index").map((s) => s.id));
  for (const [pinax, text] of texts) {
    if (indexIds.has(pinax)) continue;
    for (const sn of splitSentences(text)) {
      const t = sn.text.trim();
      if (t.length < 25 || t.length > 400) continue;
      let c; try { c = claimFromSentence(t, "x", { model }); } catch { continue; }
      const rows = c?.rows ? repairRows(c.rows) : null;
      if (!rows) continue;
      for (const e of edgesOf(rows)) { G.link(e.a, e.b, e.parity); edges.push(e); }
      for (const r of rows) if (r.upos === "VERB" || r.upos === "ADJ") vocab.add(String(r.lemma).toLowerCase());
    }
  }
  // AFFIX ANTONYMY, from the corpus's own vocabulary: L and un|dis|non|anti|de + L both attested → opposite poles (derivational morphology,
  // no list: the pair must occur in these pages). Ablation: it covers none of the verb contrast pairs, so it only ever ADDS adjectives.
  for (const l of vocab) for (const pre of ["un", "dis", "non", "anti", "de"]) if (l.startsWith(pre) && l.length - pre.length >= 3 && vocab.has(l.slice(pre.length))) G.link(l, l.slice(pre.length), 1);
  // the topic's ALIASES: what the topic itself does ("the Act would make DAYLIGHT SAVING TIME permanent") names its content; a phrase
  // counts only when two different pages write it as that patient (one witness is a coincidence of one writer).
  let topicNames = surfaces;
  const aliasReport = [];
  if (aliases && surfaces.length && model) {
    const seenIn = new Map();
    for (const [pinax, text] of texts) {
      if (indexIds.has(pinax)) continue;
      for (const sn of splitSentences(text)) {
        const t = sn.text.trim();
        if (t.length < 25 || t.length > 400 || !surfaces.some((f) => t.toLowerCase().includes(f))) continue;
        let c; try { c = claimFromSentence(t, "x", { model }); } catch { continue; }
        if (!c?.rows || c.untrusted || !c.subj || !surfaces.some((f) => spanText(c, c.subj)?.toLowerCase().includes(f)) || !c.obj) continue;
        const np = spanText(c, c.obj).toLowerCase().replace(/^(the|a|an|this|that|these|those)\s+/, "").replace(/[^\p{L}\p{N}\s'-]/gu, "").trim();
        if (np.split(/\s+/).length > 5 || np.length < 4) continue;
        if (!seenIn.has(np)) seenIn.set(np, new Set());
        seenIn.get(np).add(pinax);
      }
    }
    for (const [np, pages] of seenIn) if (pages.size >= 2 && !surfaces.includes(np)) aliasReport.push({ alias: np, pages: pages.size });
    topicNames = [...surfaces, ...aliasReport.map((x) => x.alias)];
  }
  const poleOf = (lemma, negated) => {
    if (!askedLemma) return { pole: "?", why: "no_asked_predicate" };
    if (lemma === askedLemma) return { pole: negated ? "-" : "+", why: "asked_predicate" };
    const [ra, pa] = G.find(askedLemma), [rl, pl] = G.find(lemma);
    if (ra !== rl) return { pole: "?", why: "predicate_not_linked_to_asked" };
    if (G.contested(lemma)) return { pole: "?", why: "contested_component" };
    const flip = (pa ^ pl) ^ (negated ? 1 : 0);
    return { pole: flip ? "-" : "+", why: "linked" };
  };
  // 2. holders × stances on the topic. Every sentence of every non-index page is read (not only relation atoms: a page too small to earn
  // a relation vocabulary still states positions); a quotation's attributed speaker comes from its atom.
  const positions = [], unresolved = [], refused = [], ops = [];
  const claimKey = `${askedLemma}:${[...focus][0] ?? surfaces[0] ?? "topic"}`;
  const quotes = (record.atoms ?? []).filter((a) => a.why_kind === "quotation" && a.giver?.surface_verbatim && !a.giver.pronoun);
  const emit = (row, pole, why) => {
    if (pole === "?") { unresolved.push({ ...row, pole, why }); return; }
    positions.push({ ...row, pole, why });
    ops.push(perspectiveOperation({ holder: `holder:${row.holder}`, claim: claimKey, stance: pole === "+" ? STANCE.HOLDS : STANCE.REFUSES, basis: row.basis, via: row.via.map((v) => `holder:${v}`), witness: row.span }));
  };
  for (const src of record.sources ?? []) {
    if (src.role === "index" || !texts.has(src.id)) continue;
    const text = texts.get(src.id), map = offsetMap(text);
    const author = src.byline?.authors?.[0]?.name ?? src.byline?.institutional?.name ?? null;
    const addr = (u0, u1) => formatAddress({ pinax: src.id, layer: "text", layerSha256: src.text.sha256, start: convertOffset(map, "u", "b", u0), end: convertOffset(map, "u", "b", u1) });
    for (const sn of splitSentences(text)) {
      const t = sn.text.trim();
      if (t.length < 20 || t.length > 500 || !topicNames.some((f) => t.toLowerCase().includes(f))) continue;
      const span = addr(sn.offset, sn.offset + sn.text.trimEnd().length);
      let rs; try { rs = stancesOf(t, span, { model, focusSurfaces: topicNames, entities: record.entities ?? [] }); } catch { rs = [{ refusal: "parse_error" }]; }
      for (const r of rs) {
      if (r.refusal) { refused.push({ span, why: r.refusal, pred: r.pred ?? null }); continue; }
      // A quotation's speaker holds it; the page's author only REPORTS it.
      const q = quotes.find((a) => a.pinax === src.id && a.span && String(a._sentence ?? "").length > 3 && t.includes(String(a._sentence).trim().slice(0, 40)));
      // ATTRIBUTION (adapters/text/attribution.js, the house's own): where no atom named the speaker, the quotation frame's trailing or
      // leading "said NAME" is read with the POS prior's verb call and the record's ADMITTED referents (it refuses; it never invents).
      let speaker = q?.giver?.surface_verbatim ?? null, speakerRef = null;
      if (!speaker && /["“”]/.test(t)) {
        const isVerb = (w) => !!model.lexicon?.form?.[`${String(w).toLowerCase()}|VERB`];
        const referentFor = (surface) => (record.entities ?? []).find((e) => (e.surfaces ?? [e.name]).some((f) => f && f.toLowerCase() === String(surface).toLowerCase()))?.id ?? null;
        // attribution.js reads typographic quotes; straight pairs are the same convention (same length, so offsets hold)
        const curly = t.replace(/"([^"]*)"/g, "\u201c$1\u201d");
        for (const qs of quotedSpans(curly).spans) {
          const att = attributeQuotation(qs.before, qs.after, { isVerb, referentFor });
          if (att.speaker) { speakerRef = att.speaker; speaker = (record.entities ?? []).find((e) => e.id === att.speaker)?.name ?? null; break; }
        }
      }
      const who = speaker ?? r.holder?.text ?? null;
      const lead = sn.text.length - sn.text.trimStart().length;
      const holder_at = !speaker && r.holder?.from != null && r.holder.to != null ? addr(sn.offset + lead + r.holder.from, sn.offset + lead + r.holder.to) : null;
      const row = { span, text: t, holder_at, pinax: src.id, url: src.final_url ?? src.url, holder: who, referent: speakerRef ?? r.holder?.referent ?? null, pred: r.pred, negated: r.negated, role: r.role, voice: r.voice, basis: speaker || !r.reported ? BASIS.ASSERTED : BASIS.REPORTED, via: author && author !== who ? [author] : [] };
      if (!who) { unresolved.push({ ...row, pole: "?", why: r.holder?.pronoun ? `pronoun_holder:${r.holder.pronoun}` : "no_holder" }); continue; }
      const { pole, why } = poleOf(r.pred, r.negated);
      emit(row, pole, why);
      }
    }
  }
  const projected = projectPerspectives(ops);
  // 3. how they fit together: each side's holders, the shared holders' ground, and the typed divergences
  // one holder per REFERENT: "Mike Rounds", "Rounds" and "Republican Senator Mike Rounds" are one holder, shown by the longest surface
  const full = [...new Set(positions.map((x) => x.holder).filter((h) => h && /\s/.test(h)))];
  const nameOf = (x) => { if (!x.referent) { const last = String(x.holder ?? "").split(/\s+/).pop(); const m = full.filter((f) => f !== x.holder && f.split(/\s+/).pop() === last && /^\p{Lu}/u.test(last)); return m.length === 1 && String(x.holder).split(/\s+/).length === 1 ? m[0] : x.holder; } const e = (record.entities ?? []).find((y) => y.id === x.referent); return e ? [e.name, ...(e.surfaces ?? [])].filter(Boolean).sort((a, b) => b.length - a.length)[0] : x.holder; };
  for (const x of positions) x.holder_display = nameOf(x);
  const side = (p) => [...new Set(positions.filter((x) => x.pole === p).map((x) => x.holder_display))];
  const sides = { "+": side("+"), "-": side("-") };
  const fit = [];
  for (const a of sides["+"]) for (const b of sides["-"]) fit.push({ a, b, divergence: divergence(projected, `holder:${a}`, `holder:${b}`) });
  const poles = { "+": new Set(), "-": new Set(), "?": new Set() };
  for (const p of new Set([...positions, ...unresolved].map((x) => x.pred).filter(Boolean))) poles[poleOf(p, false).pole].add(p);
  return {
    schema: "Perspectives@1", topic: { focus: [...focus], surfaces }, asked: askedLemma,
    positions, unresolved, refused,
    sides, poles: { "+": [...poles["+"]], "-": [...poles["-"]], "?": [...poles["?"]] },
    edges: { count: edges.length, contrast: edges.filter((e) => e.kind === "contrast").length, and: edges.filter((e) => e.kind === "and").length },
    projected, fit,
    aliases: aliasReport,
    edgeList: edges,
    topicNames,
    // the live graph, for an incremental reader (scripts/hunt-stance.mjs): read ONE new page without re-parsing the corpus
    poleOf,
    learn: (rows) => { for (const e of edgesOf(repairRows(rows))) { G.link(e.a, e.b, e.parity); edges.push(e); } },
    // FALSIFIABLE: corpus edges between two frame lemmas must agree with the frame seed (pro~pro, con~con: parity 0; pro~con: 1).
    frameCheck: fr ? (() => {
      const grp = (l) => (fr.pro.includes(l) ? "pro" : fr.con.includes(l) ? "con" : null);
      const both = edges.filter((e) => grp(e.a) && grp(e.b));
      const agree = both.filter((e) => ((grp(e.a) === grp(e.b)) ? 0 : 1) === e.parity);
      return { edges_between_frame_lemmas: both.length, agree: agree.length, disagree: both.filter((e) => !agree.includes(e)).map((e) => `${e.a}~${e.b}(${e.word})`) };
    })() : null,
    giver: "corpus constructions (contrast/and coordination) + parser negation; no word list (perspectives.js header)",
  };
}

export { commonGround, divergence };

/**
 * STANCE ATOMS — a position the pages state is a claim in its own right, cited to its HOLDER (never to the page's author). Built from a
 * position row's own sentence bytes and the holder's own address; a holder with no address (a pronoun, a quote's speaker) is skipped,
 * since a claim with no addressed holder is not citable (giver.js). The ladder takes them as extra candidates; a sentence that is
 * already an atom of the record is left to that atom (candidatesOf keeps the first atom per span).
 */
export function stanceAtoms(perspectives, { poles = ["+"] } = {}) {
  const seen = new Set(), out = [];
  for (const r of perspectives?.positions ?? []) {
    if (!poles.includes(r.pole) || !r.holder_at || !r.holder || r.pronoun || seen.has(r.span)) continue;
    seen.add(r.span);
    let h = 5381; for (const ch of r.span) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
    out.push({
      schema: "ClaimAtom@1", id: `a_s${(h >>> 0).toString(16)}`, pinax: r.pinax, url: r.url, span: r.span,
      kind: "reported", why_kind: "stance",
      giver: { surface: r.holder_at, surface_verbatim: r.holder, referent: null, pronoun: false, attitude: null, attitude_verbatim: null, via: "perspective_agent" },
      relation: null, entities: [], valid_time: { value: null, precision: null, why: "undated" }, document_time: null, transaction_time: null,
      _sentence: r.text, _object: "", stance: { pole: r.pole, pred: r.pred, negated: r.negated, basis: r.basis, via: r.via },
    });
  }
  return out;
}
