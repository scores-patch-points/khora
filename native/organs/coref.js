// coref.js — COREFERENCE over a page: every mention of every sentence (names, descriptions, pronouns, possessives, subjects a language leaves
// out) and the entity each refers to. Language-neutral over UD parses: the language adds its closed classes (grammar-packs.js: third-person
// pronouns, first-person plural, possessives, whether it drops subjects); English's are declared here. Rules, in page order:
//   name          one entity per name: a later mention with the same last name token (or the same whole name) is the same entity
//   we / our / us the page's own author or subject (in a filing, the company)
//   pronoun       a third-person pronoun or possessive: the most recent subject (earlier in the same sentence, else the sentences before)
//   description   a definite description ("the lake", "la compañía", "der Fluss"): the most recent entity whose head or stated kind it names;
//                 a description that names no known entity is new
//   dropped       a subject the sentence leaves out (Spanish, Japanese): the page's own subject, its title
//   resolvePage({ lang, title, sentences, rowsOf, pack }) → { entities: [{ id, name, names, head, kinds }], sentences: [{ text, rows, mentions }] }
//   mention = { text, start, end, ids, hid, how, entity }

const EN = {
  pronouns: new Set(["it", "its", "itself", "they", "them", "their", "theirs", "themselves", "he", "him", "his", "himself", "she", "her", "hers", "herself"]),
  we: new Set(["we", "us", "our", "ours", "ourselves"]),
  possessive: new Set(["its", "their", "his", "her"]),
  definite: new Set(["the", "this", "that", "these", "those", "such"]),
};
const DEFINITE = new Set(["the", "this", "these", "el", "la", "los", "las", "le", "les", "l'", "l’", "der", "die", "das", "den", "dem", "des", "dieser", "diese", "dieses", "este", "esta", "estos", "estas", "ce", "cet", "cette", "ces", "この", "同"]);
const lc = (s) => String(s ?? "").toLowerCase();
const lem = (r) => lc(r?.lemma && r.lemma !== "_" ? r.lemma : r?.form);
const feat = (r, k) => new RegExp(`(^|\\|)${k}(\\||$)`).test(r?.feats ?? "");
// what belongs to a mention's own words: its determiners, modifiers, name parts and numbers, not its clauses or its phrases
const OWN = /^(det|det:poss|amod|compound|compound:prt|flat|flat:name|fixed|nummod|nmod:poss|goeswith|case)$/;

export function mentionsOf(rows, { lang = "en", pack = null } = {}) {
  const P = lang === "en" ? EN : { pronouns: pack?.pronouns ?? new Set(), we: pack?.we ?? new Set(), possessive: pack?.possessive ?? new Set() };
  const kids = (id) => rows.filter((r) => r.head === id), byId = (id) => rows.find((r) => r.id === id);
  const out = [];
  const span = (id) => { const ids = [id], st = [id]; while (st.length) { const x = st.pop(); for (const k of kids(x)) if (OWN.test(k.deprel) && k.deprel !== "case") { ids.push(k.id); st.push(k.id); } } return ids.sort((a, b) => a - b); };
  for (const r of rows) {
    const f = lc(r.form), poss = (r.upos === "DET" || r.upos === "PRON") && (feat(r, "Poss=Yes") || P.possessive.has(f));
    if (r.upos === "PRON" || poss) {
      if (P.we.has(f) || (feat(r, "Person=1") && feat(r, "Number=Plur"))) out.push({ ids: [r.id], hid: r.id, how: "we" });
      else if (P.pronouns.has(f) || poss || (feat(r, "PronType=Prs") && feat(r, "Person=3"))) out.push({ ids: [r.id], hid: r.id, how: "pronoun", poss });
      continue;
    }
    if (!/^(NOUN|PROPN)$/.test(r.upos) || /^(compound|flat|flat:name|fixed|goeswith)$/.test(r.deprel)) continue;
    // a copula's predicate noun states a kind of its subject ("Lake Geneva is a deep lake"); it is not a mention of anything
    if (kids(r.id).some((k) => k.deprel === "cop") && r.upos === "NOUN") continue;
    const ids = span(r.id), ws = ids.map(byId);
    const named = ws.some((w) => w.upos === "PROPN");
    const definite = kids(r.id).some((k) => /^det/.test(k.deprel) && (DEFINITE.has(f === "" ? "" : lc(k.form)) || feat(k, "Definite=Def") || feat(k, "PronType=Dem")));
    out.push({ ids, hid: r.id, how: named ? "name" : definite ? "description" : "new", names: ws.filter((w) => w.upos === "PROPN").map((w) => lc(w.form)) });
  }
  // a subject the sentence leaves out: a finite main predicate with no subject, in a language that drops subjects
  if (pack?.proDrop) for (const v of rows) {
    const main = v.head === 0 || (v.deprel === "conj" && byId(v.head)?.head === 0);
    if (!main || !/^(VERB|AUX|ADJ|NOUN|PROPN)$/.test(v.upos)) continue;
    const ks = kids(v.id);
    if (ks.some((k) => /^(nsubj|csubj|expl)/.test(k.deprel))) continue;
    if (!(lang === "ja" || [v, ...ks.filter((k) => /^(aux|cop)/.test(k.deprel))].some((w) => feat(w, "VerbForm=Fin")) || ks.some((k) => k.deprel === "cop"))) continue;
    if (v.deprel === "conj" && kids(v.head).some((k) => /^nsubj/.test(k.deprel))) continue; // a conjoined verb shares its head's subject
    out.push({ ids: [], hid: v.id, how: "dropped", at: v.form });
  }
  return out.map((m) => {
    const ws = m.ids.map(byId).filter(Boolean);
    return { ...m, start: ws.length ? Math.min(...ws.map((w) => w.start ?? 0)) : null, end: ws.length ? Math.max(...ws.map((w) => w.end ?? 0)) : null, head: lem(byId(m.hid)),
      subject: /^nsubj/.test(byId(m.hid)?.deprel ?? "") || m.how === "dropped" };
  });
}

export function resolvePage({ lang = "en", title = null, sentences = [], rowsOf, pack = null }) {
  const entities = [], salient = []; // salient: the subject entities, most recent last
  const newEntity = (name, names, head) => { const e = { id: `E${entities.length + 1}`, name, names: [...new Set(names)], head, kinds: new Set(head ? [head] : []), last: -1 }; entities.push(e); return e; };
  const byName = (names) => { const last = names.at(-1); return [...entities].reverse().find((e) => e.names.includes(last) || (names.length > 1 && names.join(" ") === e.names.join(" "))); };
  // the page's own subject: its title
  let page = null;
  if (title) {
    const tr = rowsOf(title), ms = mentionsOf(tr, { lang, pack }), m = ms.find((x) => x.how === "name") ?? ms[0];
    page = newEntity(title, m?.names?.length ? m.names : title.toLowerCase().split(/\s+/), m?.head ?? null);
  }
  const out = [];
  sentences.forEach((text, si) => {
    const rows = rowsOf(text), ms = mentionsOf(rows, { lang, pack });
    const textOf = (m) => (m.start == null ? "" : text.slice(m.start, m.end));
    const recentSubject = (beforeHid) => {
      const here = ms.filter((x) => x.subject && x.hid < beforeHid && x.entity && x.how !== "we");
      return here.at(-1)?.entity ?? salient.at(-1) ?? page;
    };
    for (const m of ms.sort((a, b) => (a.start ?? 1e9) - (b.start ?? 1e9))) {
      let e = null;
      if (m.how === "name") e = byName(m.names) ?? newEntity(textOf(m), m.names, m.head);
      else if (m.how === "we") e = page ?? newEntity("we", ["we"], null);
      else if (m.how === "pronoun") e = recentSubject(m.hid);
      else if (m.how === "dropped") e = page ?? salient.at(-1) ?? null;
      else if (m.how === "description") e = [...entities].reverse().find((x) => x.head === m.head || x.kinds.has(m.head)) ?? newEntity(textOf(m), [], m.head);
      else e = newEntity(textOf(m), [], m.head);
      m.entity = e; if (e) e.last = si;
    }
    // a copula states a kind of its subject ("Lake Baikal is a rift lake"): later descriptions of that kind find it
    for (const r of rows.filter((x) => rows.some((c) => c.head === x.id && c.deprel === "cop") && /^(NOUN)$/.test(x.upos))) {
      const subj = rows.find((c) => c.head === r.id && /^nsubj/.test(c.deprel)), sm = subj && ms.find((m) => m.hid === subj.id);
      if (sm?.entity) sm.entity.kinds.add(lem(r));
    }
    const subj = ms.filter((m) => m.subject && m.entity && m.how !== "we").map((m) => m.entity);
    for (const e of subj) salient.push(e);
    out.push({ text, rows, mentions: ms.map((m) => ({ text: textOf(m), start: m.start, end: m.end, ids: m.ids, hid: m.hid, how: m.how, at: m.at, entity: m.entity?.id ?? null })) });
  });
  return { entities: entities.map((e) => ({ id: e.id, name: e.name, names: e.names, head: e.head, kinds: [...e.kinds] })), sentences: out };
}
