// coref-learned.js — what a mention refers to, decided by a LEARNED ranker over the page's entities so far (coref.js finds the mentions and
// their cues; its rules' own choice is one cue among the others). For each mention in page order the candidates are every entity built so
// far, the page itself and a new entity; a linear model scores each (mention, candidate) pair by its features and the best one wins.
// The weights are learned (an averaged ranking perceptron, trainRanker below) from gold-labelled pages; no rule here says which cue wins.
//   resolveLearned(page, model) → { entities: [{ id, name }], sentences: [{ mentions: [{ …mention, entity, entityName }] }] }
//   page: a CorefMentions@1 page (eval/meaning/atoms/dump-mentions.mjs): { lang, title, entities (the rules'), syn, sentences: [{ text, mentions }] }
//   model: { w: { feature: weight } } (CorefRanker@1)

const bucket = (n, cuts) => { for (const c of cuts) if (n <= c) return String(c); return `>${cuts.at(-1)}`; };
const low = (s) => String(s ?? "").toLowerCase();

// a candidate entity: what its mentions so far say about it
function entityOf(id, { page = false, title = null } = {}) {
  return { id, page, name: page ? title : null, mentions: [], names: new Set(), heads: new Set(), kinds: new Set(), rule: new Set(), subjSi: new Set(), firstSi: page ? 0 : -1, lastSi: -1, lastSubject: false, lastHow: page ? "page" : null, plural: false };
}
function addTo(e, m, ruleKinds) {
  e.mentions.push(m);
  if (!e.name && (m.how === "name" || m.how === "alias") && m.text) e.name = m.text;
  for (const n of m.cues.names) e.names.add(low(n));
  for (const h of [m.cues.head, m.cues.headNoun]) if (h && !/^(pronoun|dropped|we)$/.test(m.how)) e.heads.add(low(h));
  for (const k of ruleKinds(m.entity)) e.kinds.add(low(k));
  if (m.entity) e.rule.add(m.entity);
  if (e.firstSi < 0) e.firstSi = m.si;
  if (m.cues.subject) e.subjSi.add(m.si);
  e.lastSi = m.si; e.lastSubject = m.cues.subject; e.lastHow = m.how; e.plural = m.how === "dropped" ? e.plural : m.cues.plural || e.plural;
}

// the pair's features, each also crossed with the mention's kind (a pronoun and a name weigh the same cue differently)
export function featuresOf(m, c, { rank, synonym, sentenceHas }) {
  const f = [];
  const how = m.how, cu = m.cues;
  if (c.isNew) {
    f.push("new", `new:names=${cu.names.length ? 1 : 0}`, `new:at=${bucket(m.si, [0, 1, 3])}`, `new:alias=${cu.alias ? 1 : 0}`, `new:rulePage=${m.entity === m.rulePage ? 1 : 0}`, `new:ruleFirst=${m.ruleFirst ? 1 : 0}`, `new:neg=${cu.negated ? 1 : 0}`, `new:plural=${cu.plural ? 1 : 0}`);
  } else {
    const e = c.e, mn = cu.names.map(low), head = low(cu.headNoun ?? cu.head);
    const allNames = mn.length > 0 && mn.every((n) => e.names.has(n)), someName = mn.some((n) => e.names.has(n));
    const headHit = !!head && (e.heads.has(head) || e.kinds.has(head)), synHit = !!head && !headHit && [...e.heads, ...e.kinds].some((k) => synonym(head, k));
    f.push(e.page ? "page" : "ent",
      `dist=${e.lastSi < 0 ? "none" : bucket(m.si - e.lastSi, [0, 1, 2, 4, 8])}`,
      `rank=${bucket(rank, [0, 1, 2, 4])}`,
      `names=${allNames ? "all" : someName ? "some" : mn.length ? "none" : "-"}`,
      `extra=${allNames ? bucket(e.names.size - mn.length, [0, 1, 3]) : "-"}`,
      `head=${headHit ? "hit" : synHit ? "syn" : head ? "miss" : "-"}`,
      `entNamed=${e.names.size ? 1 : 0}`,
      `agree=${!!cu.plural === !!e.plural ? 1 : 0}`,
      `lastSubj=${e.lastSubject ? 1 : 0}`, `lastHow=${e.lastHow ?? "-"}`,
      `size=${bucket(e.mentions.length, [0, 1, 3, 8])}`,
      `rule=${m.entity && e.rule.has(m.entity) ? 1 : 0}`,
      `rulePage=${m.entity && m.entity === m.rulePage ? 1 : 0}`,
      `inSentence=${sentenceHas(e) ? 1 : 0}`,
      `neg=${cu.negated ? 1 : 0}`, `det=${m.detected ? 1 : 0}`,
      `prevSubj=${e.subjSi.has(m.si - 1) ? 1 : 0}`, `everSubj=${e.subjSi.size ? 1 : 0}`,
      `first=${bucket(e.firstSi, [0, 1, 3])}`, `at=${bucket(m.si, [0, 1, 3, 8])}`,
      `poss=${cu.poss ? 1 : 0}`, `alias=${cu.alias ? 1 : 0}`);
    if (e.page) f.push(`page:at=${bucket(m.si, [0, 1, 3])}`, `page:head=${headHit ? 1 : 0}`, `page:rule=${m.entity === m.rulePage ? 1 : 0}|names=${mn.length ? 1 : 0}`);
    if (m.entity && e.rule.has(m.entity)) f.push(`rule&dist=${e.lastSi < 0 ? "none" : bucket(m.si - e.lastSi, [0, 1, 3])}`, `rule&names=${allNames ? 1 : 0}`);
    if (headHit && allNames) f.push("head+names");
    if (e.page && m.si === 0) f.push("page:first");
  }
  const out = [];
  for (const x of f) out.push(x, `${how}|${x}`, `${m.lang}|${how}|${x}`);
  out.push(`bias|${how}|${c.isNew ? "new" : c.e.page ? "page" : "ent"}`);
  return out;
}

// read one page with the model; trainer(m, cands, featsOf) is called for each mention when training (it returns the candidate to take)
export function resolveLearned(page, model, { trainer = null } = {}) {
  const w = model?.w ?? {}, drop = model?.drop ? new RegExp(model.drop) : null;
  const ruleKinds = (id) => page.entities.find((e) => e.id === id)?.kinds ?? [];
  const synSet = new Set((page.syn ?? []).flatMap(([a, b]) => [`${low(a)}\t${low(b)}`, `${low(b)}\t${low(a)}`]));
  const synonym = (a, b) => synSet.has(`${a}\t${b}`);
  const ents = [], pageE = page.title ? entityOf("P", { page: true, title: page.title }) : null;
  if (pageE) { ents.push(pageE); for (const w of low(page.title).split(/\s+/)) pageE.names.add(w); }
  const rulePage = page.entities[0]?.id ?? null, seenRule = new Set();
  const out = [];
  page.sentences.forEach((s, si) => {
    const here = new Set(), ms = [];
    for (const m0 of s.mentions) {
      const m = { ...m0, si, lang: page.lang, rulePage, ruleFirst: !!m0.entity && !seenRule.has(m0.entity) };
      if (m0.entity) seenRule.add(m0.entity);
      // the candidates, most recently mentioned first
      const order = [...ents].sort((a, b) => b.lastSi - a.lastSi || b.mentions.length - a.mentions.length);
      // GRAMMATICAL PERSON is a law, not a cue to weigh: a first-person mention (how "we", read from Person=1 by coref.js) and a third-person one (a
      // pronoun, a relative pronoun: Person=3) are never one being in the same voice, so an entity already holding a third-person pronoun is no
      // candidate for a "we", and one holding a "we" is none for a third-person pronoun. A name or a description may still join a "we" (a filing's
      // "the Company ... we"). The feature is UD's, so the rule reads every language the grammar reads; no word is listed.
      const THIRD = /^(pronoun|relative)$/, voice = (e, f) => e.mentions.some((x) => f(x.how));
      const person = (e) => (m.how === "we" ? voice(e, (h) => THIRD.test(h)) : THIRD.test(m.how) ? voice(e, (h) => h === "we") : false);
      // BINDING (Principle B), for SUBJECT pronouns only: a personal pronoun that is the subject of its predicate (UD nsubj) is not one being with another
      // argument of that same predicate: "In May, we entered" ("May" and "we" both depend on "entered"), "Avec une altitude de 4 807 m, il est ..." (il is not
      // the altitude). Measured on the 448 non-English sentences of the spent sets, the rule for every pronoun was wrong where a language doubles or
      // fuses an object with a clitic (Spanish "este pico lo visitan", French "en", "se"): those are objects or expletives, never nsubj, and UD marks the
      // difference, so the rule reads the dependency and lists no word.
      const rowOf = (x) => (s.rows ?? []).find((r) => r.id === x.hid);
      const me = rowOf(m), subj = (m.how === "we" || m.how === "pronoun") && me && /^nsubj/.test(me.deprel) && me.head !== 0;
      const coarg = (e) => subj && e.mentions.some((x) => x.si === si && x.hid !== m.hid && rowOf(x)?.head === me.head);
      const cands = [...order.filter((e) => !person(e) && !coarg(e)).map((e, rank) => ({ e, rank })), { isNew: true, rank: order.length }];
      const featsOf = (c) => { const fs = featuresOf(m, c, { rank: c.rank, synonym, sentenceHas: (e) => here.has(e) }); return drop ? fs.filter((x) => !drop.test(x)) : fs; };
      const score = (fs) => fs.reduce((a, x) => a + (w[x] ?? 0), 0);
      let pick = null;
      if (trainer) pick = trainer(m, cands, featsOf, score);
      if (!pick) { let best = -Infinity; for (const c of cands) { const v = score(featsOf(c)); if (v > best) { best = v; pick = c; } } }
      let e = pick.isNew ? null : pick.e;
      if (!e) { e = entityOf(`L${ents.length + 1}`); ents.push(e); }
      addTo(e, m, ruleKinds); here.add(e);
      if (!e.name && !/^(pronoun|dropped|we)$/.test(m.how)) e.name = m.text;
      ms.push({ ...m0, entity: e.id, entityRef: e });
    }
    out.push({ text: s.text, mentions: ms });
  });
  for (const s of out) for (const m of s.mentions) { m.entityName = m.entityRef.name ?? m.entityRef.mentions[0]?.text ?? m.text; delete m.entityRef; }
  return { entities: ents.map((e) => ({ id: e.id, name: e.name ?? e.mentions[0]?.text ?? null })), sentences: out };
}

// an averaged ranking perceptron: for each gold-labelled mention, when the model's choice is not among the right ones, move toward the
// best-scoring right one and away from its choice. golds(page) → (m) → [right candidates] | null (null: no label, read but not learned)
export function trainRanker(pages, rightOf, { epochs = 10, seed = 1, drop = null } = {}) {
  const w = {}, tot = {}, ts = {}; let t = 0;
  const upd = (f, d) => { for (const x of f) { tot[x] = (tot[x] ?? 0) + (t - (ts[x] ?? 0)) * (w[x] ?? 0); ts[x] = t; w[x] = (w[x] ?? 0) + d; } };
  let r = seed; const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const model = { w, drop };
  for (let ep = 0; ep < epochs; ep++) {
    const order = [...pages].sort(() => rand() - 0.5);
    for (const p of order) {
      const right = rightOf(p);
      resolveLearned(p, model, { trainer: (m, cands, featsOf, score) => {
        const ok = right(m, cands); if (!ok?.length) return null;
        t++;
        let pred = null, pv = -Infinity; for (const c of cands) { const v = score(featsOf(c)); if (v > pv) { pv = v; pred = c; } }
        if (ok.includes(pred)) return pred;
        let gold = null, gv = -Infinity; for (const c of ok) { const v = score(featsOf(c)); if (v > gv) { gv = v; gold = c; } }
        upd(featsOf(gold), 1); upd(featsOf(pred), -1);
        return gold; // learn as if the right choice had been taken (the page's entities stay right for the mentions after it)
      } });
    }
  }
  const avg = {};
  for (const x of Object.keys(w)) { const a = ((tot[x] ?? 0) + (t - (ts[x] ?? 0)) * w[x]) / Math.max(1, t); if (Math.abs(a) > 1e-9) avg[x] = +a.toFixed(5); }
  return { schema: "CorefRanker@1", updates: t, w: avg, drop };
}

// ── mentions the rules did not find, proposed by the parse and kept by a learned classifier ──
// candidates: every noun, proper noun, pronoun or demonstrative's phrase (its subtree without clauses, appositions or conjuncts, each
// conjunct its own candidate), and in a pro-drop language every predicate with no subject (a dropped subject, at its verb)
const CUT = /^(acl|acl:relcl|appos|conj|cc|parataxis|punct|advcl|ccomp|xcomp|dep|list|reparandum|orphan)$/;
const feat = (r, f) => (r.feats ?? "").split("|").includes(f);
export function candidatesOf(rows, { lang = "en", proDrop = false } = {}) {
  const kids = new Map(); for (const r of rows) (kids.get(r.head) ?? kids.set(r.head, []).get(r.head)).push(r);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const span = (h) => { const ids = [h.id], st = [h]; while (st.length) { const x = st.pop(); for (const k of kids.get(x.id) ?? []) if (!CUT.test(k.deprel)) { ids.push(k.id); st.push(k); } } return ids.sort((a, b) => a - b); };
  const out = [];
  for (const r of rows) {
    const pron = r.upos === "PRON" || (r.upos === "DET" && /PronType=Dem/.test(r.feats ?? "") && /^(nsubj|obj|obl|nmod)/.test(r.deprel));
    if (!/^(NOUN|PROPN)$/.test(r.upos) && !pron) continue;
    if (r.deprel === "compound" || r.deprel === "flat" || r.deprel === "fixed" || r.deprel === "flat:name") continue;
    const ids = pron ? [r.id] : span(r), ws = ids.map((i) => byId.get(i));
    // a leading case word ("de", "of") is not the mention
    while (ws.length > 1 && /^(ADP|PUNCT|CCONJ)$/.test(ws[0].upos)) ws.shift();
    while (ws.length > 1 && /^(PUNCT|ADP)$/.test(ws.at(-1).upos)) ws.pop();
    out.push({ kind: pron ? "pronoun" : r.upos === "PROPN" ? "name" : "description", hid: r.id, ids: ws.map((w) => w.id), start: ws[0].start, end: ws.at(-1).end, r, ws });
  }
  if (proDrop) for (const v of rows) {
    if (!/^(VERB|AUX|ADJ|NOUN|PROPN)$/.test(v.upos)) continue;
    if (!/^(root|conj|advcl|acl|acl:relcl|parataxis|ccomp|xcomp)$/.test(v.head === 0 ? "root" : v.deprel)) continue;
    const ks = kids.get(v.id) ?? [];
    if (ks.some((k) => /^(nsubj|csubj|expl)/.test(k.deprel))) continue;
    out.push({ kind: "dropped", hid: v.id, ids: [], start: null, end: null, at: v.form, r: v, ws: [], ks });
  }
  return out.map((c) => {
    const r = c.r, head = byId.get(r.head), ks = c.ks ?? kids.get(r.id) ?? [];
    const f = [`k=${c.kind}`, `upos=${r.upos}`, `dep=${r.head === 0 ? "root" : r.deprel}`, `hupos=${head?.upos ?? "-"}`, `hdep=${head ? (head.head === 0 ? "root" : head.deprel) : "-"}`,
      `len=${bucket(c.ws.length, [1, 2, 3, 5])}`, `cap=${/^\p{Lu}/u.test(r.form) ? 1 : 0}`, `first=${rows[0]?.id === r.id ? 1 : 0}`,
      `det=${ks.some((k) => k.deprel === "det") ? 1 : 0}`, `fin=${feat(r, "VerbForm=Fin") || ks.some((k) => /^(aux|cop)/.test(k.deprel) && feat(k, "VerbForm=Fin")) ? 1 : 0}`,
      `part=${feat(r, "VerbForm=Part") ? 1 : 0}`, `cop=${ks.some((k) => k.deprel === "cop") ? 1 : 0}`, `num=${/Number=Plur/.test(r.feats ?? "") ? "p" : "s"}`,
      `prontype=${/PronType=(\w+)/.exec(r.feats ?? "")?.[1] ?? "-"}`, `poss=${feat(r, "Poss=Yes") ? 1 : 0}`, `lemma=${low(r.lemma)}`, `hlemma=${low(head?.lemma)}`];
    return { ...c, feats: [...f, ...f.map((x) => `${lang}|${x}`), "bias"] };
  });
}
export function trainDetector(examples, { epochs = 10, seed = 3 } = {}) {
  const w = {}, tot = {}, ts = {}; let t = 0, r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const upd = (fs, d) => { for (const x of fs) { tot[x] = (tot[x] ?? 0) + (t - (ts[x] ?? 0)) * (w[x] ?? 0); ts[x] = t; w[x] = (w[x] ?? 0) + d; } };
  for (let ep = 0; ep < epochs; ep++) for (const [fs, y] of [...examples].sort(() => rand() - 0.5)) {
    t++; const v = fs.reduce((a, x) => a + (w[x] ?? 0), 0);
    if ((v > 0) !== y) upd(fs, y ? 1 : -1);
  }
  const avg = {}; for (const x of Object.keys(w)) { const a = ((tot[x] ?? 0) + (t - (ts[x] ?? 0)) * w[x]) / Math.max(1, t); if (Math.abs(a) > 1e-9) avg[x] = +a.toFixed(5); }
  return { schema: "MentionDetector@1", w: avg };
}
// a page's mentions with the detector's additions: a kept candidate that overlaps none of the rules' mentions joins them, with the cues the
// parse gives it (its proper-noun words as names, its head lemma, its number)
export function addDetected(page, detector, { proDrop = false, bias = 0 } = {}) {
  const w = detector?.w ?? {};
  return { ...page, sentences: page.sentences.map((s) => {
    if (!s.rows) return s;
    const taken = (c) => s.mentions.some((m) => c.kind === "dropped" ? m.hid === c.hid || (m.how === "dropped" && m.hid === c.hid) : (m.ids ?? []).some((i) => c.ids.includes(i)));
    const add = candidatesOf(s.rows, { lang: page.lang, proDrop }).filter((c) => !taken(c) && c.feats.reduce((a, x) => a + (w[x] ?? 0), 0) > bias).map((c) => ({
      text: c.start == null ? "" : s.text.slice(c.start, c.end), start: c.start, end: c.end, ids: c.ids, hid: c.hid, how: c.kind, at: c.at ?? null, entity: null, detected: true,
      cues: { names: c.ws.filter((x) => x.upos === "PROPN").map((x) => low(x.form)), head: c.r.lemma, headNoun: c.r.upos === "NOUN" ? c.r.lemma : null, plural: /Number=Plur/.test(c.r.feats ?? ""), subject: /^nsubj/.test(c.r.deprel) || c.kind === "dropped", negated: false, poss: feat(c.r, "Poss=Yes") || c.r.deprel === "nmod:poss", relative: /PronType=Rel/.test(c.r.feats ?? ""), alias: false } }));
    const all = [...s.mentions, ...add].sort((a, b) => (a.start ?? s.rows.find((r) => r.id === a.hid)?.start ?? 1e9) - (b.start ?? s.rows.find((r) => r.id === b.hid)?.start ?? 1e9));
    return { ...s, mentions: all };
  }) };
}

// a coref.js reading as the page this module reads: the rules' mentions with their cues and rows, and the synonym pairs among the page's heads
export function pageOf(R, { lang, title, same = null }) {
  const heads = [...new Set([...R.sentences.flatMap((s) => s.mentions.flatMap((m) => [m.cues?.head, m.cues?.headNoun])), ...R.entities.flatMap((e) => e.kinds)].filter(Boolean))];
  const syn = []; if (same) for (let i = 0; i < heads.length; i++) for (let j = i + 1; j < heads.length; j++) if (same(heads[i], heads[j])) syn.push([heads[i], heads[j]]);
  return { lang, title, entities: R.entities, syn, sentences: R.sentences.map((s) => ({ text: s.text, rows: s.rows, mentions: s.mentions })) };
}
// read a page with a trained model (CorefRanker@1, its detector inside): the mentions the detector adds, then the ranker's entities
export function resolveWithModel(R, { lang, title, same = null, proDrop = false }, model) {
  let page = pageOf(R, { lang, title, same });
  if (model.detector) page = addDetected(page, model.detector, { proDrop });
  return resolveLearned(page, model);
}
