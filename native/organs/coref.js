// coref.js — COREFERENCE over a page: every mention of every sentence (names, aliases, descriptions, pronouns, possessives, relative pronouns,
// subjects a language leaves out) and the entity each refers to. Language-neutral over UD parses: the language adds its closed classes
// (grammar-packs.js: third-person pronouns, first-person plural, possessives, naming verbs, whether it drops subjects); English's are declared
// here. Rules, in page order (measured: eval/meaning PREREG run 13, then run 14 on a second held-out set):
//   name          one entity per name: a later mention with the same last name token (or the same whole name) is the same entity, unless the
//                 two are headed by different common nouns ("Amazon basin" is not "Amazon River")
//   alias         a name given as another name for a mention: its appositive, a name in brackets right after it, a name a naming verb or
//                 participle gives it ("llamado", "also known as"), or a name coordinated with an alias ("A o B")
//   we / our / us the page's own author or subject (in a filing, the company)
//   pronoun       a third-person pronoun or possessive: the most recent known entity that agrees in number — named or already resolved, never a
//                 description introduced as new, never the phrase the possessive sits in
//   relative      who / which / qui / die …: the noun its clause modifies
//   description   a definite description ("the lake", "der Strom"): the page's own entity when its name or stated kind matches, else the most
//                 recent named entity of that kind agreeing in number; a subject description that matches nothing is the page's topic;
//                 a negated or "other" description ("kein anderer Fluss") is new and never an antecedent
//   dropped       a subject the sentence leaves out (Spanish, Japanese): the page's own subject, its title
//   resolvePage({ lang, title, sentences, rowsOf, pack }) → { entities: [{ id, name, names, head, kinds }], sentences: [{ text, rows, mentions }] }
//   mention = { text, start, end, ids, hid, how, entity }

const EN = {
  pronouns: new Set(["it", "its", "itself", "they", "them", "their", "theirs", "themselves", "he", "him", "his", "himself", "she", "her", "hers", "herself"]),
  we: new Set(["we", "us", "our", "ours", "ourselves"]),
  possessive: new Set(["its", "their", "his", "her"]),
  naming: new Set(["call", "name", "dub", "term", "nickname", "rename", "know", "refer", "designate"]),
};
const PLURAL = new Set(["they", "them", "their", "theirs", "themselves", "ils", "elles", "leur", "leurs", "eux", "ellos", "ellas", "sus", "ses", "ces", "derniers", "dernières"]);
const RELATIVE = new Set(["who", "whom", "which", "that", "whose", "qui", "que", "qu'", "qu’", "dont", "lequel", "laquelle", "lesquels", "quien", "quienes", "cual", "cuales", "cuyo", "cuya", "der", "die", "das", "welche", "welcher", "welches", "denen", "dessen", "deren"]);
const DEFINITE = new Set(["the", "this", "these", "el", "la", "los", "las", "le", "les", "l'", "l’", "der", "die", "das", "den", "dem", "des", "dieser", "diese", "dieses", "este", "esta", "estos", "estas", "ce", "cet", "cette", "ces", "この", "同", "du", "del", "al", "au", "aux", "im", "am", "vom", "zum", "zur"]);
const NEGATED = new Set(["no", "kein", "keine", "keinen", "keinem", "keiner", "ningún", "ninguna", "ninguno", "aucun", "aucune", "nul", "another", "other", "otro", "otra", "autre", "anderer", "andere", "anderen", "anderes"]);
const lc = (s) => String(s ?? "").toLowerCase();
const lem = (r) => lc(r?.lemma && r.lemma !== "_" ? r.lemma : r?.form);
const feat = (r, k) => new RegExp(`(^|\\|)${k}(\\||$)`).test(r?.feats ?? "");
// what belongs to a mention's own words: its determiners, modifiers, name parts and numbers, not its clauses or its phrases
const OWN = /^(det|det:poss|amod|compound|compound:prt|flat|flat:name|fixed|nummod|goeswith)$/;

export function mentionsOf(rows, { lang = "en", pack = null } = {}) {
  const P = lang === "en" ? EN : { pronouns: pack?.pronouns ?? new Set(), we: pack?.we ?? new Set(), possessive: pack?.possessive ?? new Set(), naming: new Set([...(pack?.naming ?? []), ...(pack?.namingAs ?? [])]) };
  const namingPart = (r) => [...(pack?.namingPart ?? []), ...(pack?.namingPartAs ?? [])].some((p) => lc(r.form).startsWith(p));
  const kids = (id) => rows.filter((r) => r.head === id), byId = (id) => rows.find((r) => r.id === id);
  const out = [];
  // a common noun with a name in its own words, or right after it through "de" ("cordillera de los Andes", "lago Cocibolca") is a name
  const nameParts = (r) => kids(r.id).filter((k) => k.upos === "PROPN" && (/^(flat|flat:name|appos|compound)$/.test(k.deprel) && Math.abs(k.id - r.id) <= 2 || /^nmod$/.test(k.deprel) && k.id === r.id + 2 + (byId(r.id + 2)?.upos === "DET" ? 1 : 0) - (byId(r.id + 2)?.upos === "DET" ? 0 : 0) && kids(k.id).some((c) => c.deprel === "case" && /^(de|del|des|du|von|of)$/i.test(c.form))));
  const label = (k, x) => k.upos === "ADJ" && k.deprel === "amod" && byId(x)?.upos === "PROPN" && /^\p{Ll}/u.test(k.form);
  const span = (id) => { const ids = [id], st = [id]; while (st.length) { const x = st.pop(); for (const k of kids(x)) if (OWN.test(k.deprel) && !label(k, x)) { ids.push(k.id); st.push(k.id); } } return ids.sort((a, b) => a - b); };
  for (const r of rows) {
    const f = lc(r.form), poss = (r.upos === "DET" || r.upos === "PRON") && (feat(r, "Poss=Yes") || P.possessive.has(f));
    const head = byId(r.head);
    if (r.upos === "PRON" || poss || (RELATIVE.has(f) && /relcl/.test(head?.deprel ?? "") && /^(nsubj|nsubj:pass|obj|obl|nmod)/.test(r.deprel))) {
      if (RELATIVE.has(f) && head && /relcl/.test(head.deprel)) { out.push({ ids: [r.id], hid: r.id, how: "relative", antecedent: head.head }); continue; }
      if (P.we.has(f) || (feat(r, "Person=1") && feat(r, "Number=Plur"))) out.push({ ids: [r.id], hid: r.id, how: "we" });
      else if (P.pronouns.has(f) || poss || (feat(r, "PronType=Prs") && feat(r, "Person=3"))) out.push({ ids: [r.id], hid: r.id, how: "pronoun", poss, plural: feat(r, "Number=Plur") || PLURAL.has(f), inside: poss ? r.head : null });
      continue;
    }
    if (!/^(NOUN|PROPN)$/.test(r.upos) || /^(compound|flat|flat:name|fixed|goeswith)$/.test(r.deprel)) continue;
    // a copula's predicate noun states a kind of its subject ("Lake Geneva is a deep lake"); it is not a mention of anything
    if (kids(r.id).some((k) => k.deprel === "cop") && r.upos === "NOUN" && !nameParts(r).length) continue;
    // a name part already taken into a common noun's name ("lago Cocibolca") is not a second mention
    if (r.upos === "PROPN" && head && /^(NOUN)$/.test(head.upos) && nameParts(head).some((k) => k.id === r.id) && !/^nmod$/.test(r.deprel)) continue;
    const parts = r.upos === "NOUN" ? nameParts(r) : [];
    const ids = [...new Set([...span(r.id), ...parts.flatMap((k) => span(k.id))])].sort((a, b) => a - b), ws = ids.map(byId);
    const named = ws.some((w) => w.upos === "PROPN");
    const dets = kids(r.id).filter((k) => /^det/.test(k.deprel) || k.deprel === "amod");
    const negated = dets.some((k) => NEGATED.has(lc(k.form)));
    const definite = dets.some((k) => DEFINITE.has(lc(k.form)) || feat(k, "Definite=Def") || feat(k, "PronType=Dem")) || (kids(r.id).some((k) => k.deprel === "case" && DEFINITE.has(lc(k.form))));
    // how the name came: an appositive of a mention, in brackets right after one, given by a naming verb or participle, or "A o B" with an alias
    const inBrackets = rows.some((x) => x.form === "(" && x.id < r.id && !rows.some((y) => y.form === ")" && y.id > x.id && y.id < r.id) && rows.some((y) => y.form === ")" && y.id > r.id));
    const viaNaming = head && (/^(VERB|ADJ)$/.test(head.upos) && (P.naming.has(lem(head)) || namingPart(head)));
    // an appositive or bracketed name is another name only for a NAME, alone in its brackets (a plural noun with names in brackets lists them)
    const bracketNames = inBrackets ? rows.filter((x) => x.upos === "PROPN" && x.head !== r.id && x.id !== r.id && !/^(flat|flat:name|compound)$/.test(x.deprel) && Math.abs(x.id - r.id) < 8 && rows.some((y) => y.form === "(" && y.id < Math.min(x.id, r.id))).length : 0;
    const headIsName = head && (head.upos === "PROPN" || kids(head.id).some((k) => k.upos === "PROPN" && /^(flat|flat:name|compound)$/.test(k.deprel)));
    const prep = kids(r.id).some((k) => k.deprel === "case" && k.upos === "ADP");
    const bracketHead = inBrackets ? (() => { const open = [...rows].reverse().find((x) => x.form === "(" && x.id < r.id); const before = open && [...rows].reverse().find((x) => x.id < open.id && x.upos !== "PUNCT"); return before && (before.upos === "PROPN" ? rows.find((x) => x.id === before.id && x.deprel !== "flat") ?? before : null); })() : null;
    const bracketTarget = bracketHead ? (byId(bracketHead.head)?.upos === "PROPN" && /^(flat|flat:name)$/.test(bracketHead.deprel) ? byId(bracketHead.head) : bracketHead) : null;
    const aliasOf = named && inBrackets && bracketTarget && !prep && !feat(bracketTarget, "Number=Plur") && bracketTarget.id !== r.id ? bracketTarget.id
      : named && head && headIsName && !feat(head, "Number=Plur") && ((r.deprel === "appos" && r.id - head.id <= 4) || (inBrackets && r.id > head.id && bracketNames === 0)) ? head.id
      // a naming verb names its OBJECT when active ("Brazilians call this stretch the Solimões"), its subject when passive or reflexive ("is
      // known as", "se llama"), and the noun it modifies as a participle ("denominado"); the name itself is never the namer
      : named && viaNaming ? (/^(amod|acl)$/.test(head.deprel) ? head.head
        : kids(head.id).some((k) => /^(aux:pass|nsubj:pass|expl|expl:pv|expl:pass)$/.test(k.deprel) || (k.deprel === "obj" && feat(k, "Reflex=Yes")) || /^(se|sich|s'|s’)$/i.test(k.form)) ? rows.find((x) => x.head === head.id && /^nsubj/.test(x.deprel))?.id ?? null
        : rows.find((x) => x.head === head.id && /^(obj|iobj)$/.test(x.deprel) && x.id !== r.id)?.id ?? null)
      : named && r.deprel === "conj" && head ? -head.id : null; // a conjunct: resolved with its head's entity when the head is an alias
    out.push({ ids, hid: r.id, how: negated ? "new" : named ? (aliasOf != null ? "alias" : "name") : definite ? "description" : "new", aliasOf, negated, plural: feat(r, "Number=Plur") || /s$/i.test(r.form) && lc(r.form) !== lem(r),
      headNoun: r.upos === "NOUN" ? lem(r) : null, names: ws.filter((w) => w.upos === "PROPN").map((w) => lc(w.form)) });
  }
  // a reading in kana, in brackets right after a name ("利根川（とねがわ）"), is another name for it
  const KANA = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・]+$/u;
  for (const open of rows.filter((x) => /^[(（]$/.test(x.form))) {
    const inner = []; for (const x of rows.filter((y) => y.id > open.id)) { if (/^[)）、,]$/.test(x.form)) break; inner.push(x); }
    const before = rows.find((y) => y.id === open.id - 1);
    if (inner.length && inner.every((x) => KANA.test(x.form)) && before && /^(PROPN|NOUN)$/.test(before.upos)) out.push({ ids: inner.map((x) => x.id), hid: inner.at(-1).id, how: "alias", aliasOf: before.id, names: [inner.map((x) => x.form).join("")], headNoun: null, plural: false, reading: true });
  }
  // a place name inside a Japanese compound chain ("長野県北佐久郡軽井沢町及び御代田町"): a name followed by its suffix is a mention of its own
  if (lang === "ja") for (const r of rows) {
    const nx = rows.find((y) => y.id === r.id + 1);
    if (r.upos === "PROPN" && nx && /^(県|都|府|道|郡|町|村|市|区|川|湖|山|岳|島|半島|湾|平野|峠|浦|沼)$/.test(nx.form) && !out.some((m) => m.hid === nx.id && m.ids.length === 2))
      out.push({ ids: [r.id, nx.id], hid: nx.id, how: "name", names: [r.form + nx.form], headNoun: null, plural: false, unit: true });
  }
  // a subject the sentence leaves out: a finite main predicate with no subject, in a language that drops subjects
  // any finite clause with no subject of its own (a main clause, a second predicate, a clause under "donde"), including the impersonal
  // reflexive ("se trata de"), unless it shares its head's subject or its relative pronoun is its subject
  if (pack?.proDrop) for (const v of rows) {
    if (!/^(VERB|AUX|ADJ|NOUN|PROPN)$/.test(v.upos) || !/^(root|conj|advcl|acl:relcl|parataxis|ccomp)$/.test(v.head === 0 ? "root" : v.deprel)) continue;
    if (/^(NOUN|PROPN|ADJ)$/.test(v.upos) && !kids(v.id).some((k) => k.deprel === "cop") && lang !== "ja") continue;
    const ks = kids(v.id);
    if (ks.some((k) => /^(nsubj|csubj)/.test(k.deprel) || k.deprel === "expl" && !/^(se|s')$/i.test(k.form))) continue;
    if (!(lang === "ja" || [v, ...ks.filter((k) => /^(aux|cop)/.test(k.deprel))].some((w) => feat(w, "VerbForm=Fin")) || ks.some((k) => k.deprel === "cop"))) continue;
    if (v.deprel === "conj" && kids(v.head).some((k) => /^nsubj/.test(k.deprel))) continue; // a conjoined verb shares its head's subject
    if (/relcl/.test(v.deprel) && ks.some((k) => RELATIVE.has(lc(k.form)) && /^nsubj/.test(k.deprel))) continue;
    const cop = ks.filter((k) => /^(cop|aux)$/.test(k.deprel)).sort((a, b) => a.id - b.id);
    out.push({ ids: [], hid: v.id, how: "dropped", at: cop.length ? cop.map((k) => k.form).join("") : v.form });
  }
  return out.map((m) => {
    const ws = m.ids.map(byId).filter(Boolean);
    return { ...m, start: ws.length ? Math.min(...ws.map((w) => w.start ?? 0)) : null, end: ws.length ? Math.max(...ws.map((w) => w.end ?? 0)) : null, head: lem(byId(m.hid)),
      subject: /^nsubj/.test(byId(m.hid)?.deprel ?? "") || m.how === "dropped" };
  });
}

// same(a, b): optional, two common nouns that mean the same (wikt-gloss.js makeSynonymy), so "der Strom" can find an entity of the kind "Fluss"
// lookup(lang, word): optional, the dictionary (wikt-slim.js entries), so an abbreviation can be expanded
export function resolvePage({ lang = "en", title = null, sentences = [], rowsOf, pack = null, same = null, lookup = null }) {
  const entities = [], recent = []; // recent: the known entities in mention order, most recent last, with their number
  const newEntity = (name, names, head, plural = false, headNoun = null) => { const e = { id: `E${entities.length + 1}`, name, names: [...new Set(names)], head, headNoun, kinds: new Set(head ? [head] : []), plural, known: false }; entities.push(e); return e; };
  // a name links to the entity that holds all its name words with the fewest others ("ALLETE" is "ALLETE, Inc.", not "ALLETE Clean Energy";
  // "Amazon" is "Amazon River"), never across two different common-noun heads ("Amazon basin")
  const byName = (m) => {
    const cands = entities.filter((e) => e.names.length && m.names.every((n) => e.names.includes(n)) && !(m.headNoun && e.headNoun && m.headNoun !== e.headNoun));
    if (!cands.length) return null;
    cands.sort((a, b) => (a.names.length - m.names.length) - (b.names.length - m.names.length) || entities.indexOf(b) - entities.indexOf(a));
    return cands[0];
  };
  // the page's own subject: its title
  let page = null;
  if (title) {
    const tr = rowsOf(title), ms = mentionsOf(tr, { lang, pack }), m = ms.find((x) => x.how === "name" || x.how === "alias") ?? ms[0];
    page = newEntity(title, m?.names?.length ? m.names : title.toLowerCase().split(/\s+/), m?.head ?? null);
    page.headNoun = m?.headNoun ?? null; page.known = true;
    for (const w of title.toLowerCase().split(/\s+/)) if (!/^\p{Lu}/u.test(w)) page.kinds.add(w);
  }
  const out = [];
  sentences.forEach((text, si) => {
    const rows = rowsOf(text), ms = mentionsOf(rows, { lang, pack });
    const textOf = (m) => (m.start == null ? "" : text.slice(m.start, m.end));
    const byHid = (hid) => ms.find((x) => x.hid === hid || x.ids.includes(hid));
    // the most recent known entity that agrees in number, before this point; never the phrase a possessive sits in
    const antecedent = (m) => {
      const inside = m.inside != null ? byHid(m.inside) : null;
      const mainDropped = ms.find((x) => x.how === "dropped" && rows.find((r) => r.id === x.hid)?.head === 0);
      if (m.poss && mainDropped?.entity) return mainDropped.entity;
      const here = ms.filter((x) => x.entity && x !== m && x !== inside && (x.start ?? 1e9) < (m.start ?? 0) && x.entity.known && !x.negated && x.how !== "we" && x.how !== "relative");
      const agree = (x) => (m.plural ? x.plural || x.entity.plural : !(x.plural || x.entity.plural));
      // in the sentence: only an earlier SUBJECT (a name met in passing — "in Brazil", "of France" — is not what "it" picks up)
      const inSentence = [...here].reverse().find((x) => agree(x) && x.subject && x.how !== "new" && (x.entity.names.length > 0 || x.entity === page));
      if (inSentence) return inSentence.entity;
      // across sentences, the subjects come first: the most recent earlier sentence's subject that agrees, then any known entity that does
      // across sentences a pronoun picks up a NAMED entity or the page, never a description the text has only introduced
      const ok = (r) => r.si < si && (m.plural ? r.plural : !r.plural) && r.entity.known && r.how !== "new" && (r.entity.names.length > 0 || r.entity === page) && !r.entity.negated;
      const before = [...recent].reverse().find((r) => ok(r) && r.subject) ?? [...recent].reverse().find(ok);
      return before?.entity ?? (m.plural ? null : page);
    };
    const ordered = [...ms].sort((a, b) => (a.start ?? (rows.find((r) => r.id === a.hid)?.start ?? 1e9)) - (b.start ?? (rows.find((r) => r.id === b.hid)?.start ?? 1e9)));
    for (const m of ordered) {
      let e = null;
      // an alias attaches to a NAMED entity (the parse may hang it on a common noun: "pléonasme"): else the sentence's main name, else the page
      if (m.how === "alias" && m.aliasOf != null && m.aliasOf > 0) { e = byHid(m.aliasOf)?.entity ?? null; if (e && !e.names.length && e !== page) e = ordered.find((x) => x !== m && (x.how === "name" || x.how === "alias") && x.entity?.names.length)?.entity ?? page; }
      if (m.how === "alias" && m.aliasOf != null && m.aliasOf < 0) { const h = byHid(-m.aliasOf); if (h?.how === "alias") e = h.entity ?? null; else m.how = "name"; }
      if (!e && (m.how === "name" || m.how === "alias") && lookup && /^[A-Z][A-Z.&]{1,7}$/.test(textOf(m).replace(/^the\s+/i, ""))) {
        const ab = textOf(m).replace(/^the\s+/i, ""), exps = [];
        for (const en of [...(lookup(lang, ab) ?? []), ...(lang !== "en" ? lookup("en", ab) ?? [] : [])]) for (const sn of en.senses ?? []) { if (sn.form_of?.[0]?.word) exps.push(sn.form_of[0].word); const g = (sn.glosses ?? []).at(-1) ?? ""; const x = /(?:abbreviation|initialism|acronym) of ([^.;,(]+)/i.exec(g); if (x) exps.push(x[1].trim()); }
        const low = (t) => t.toLowerCase().replace(/^the\s+/, "");
        e = entities.find((x) => exps.some((t) => low(t) === low(x.name) || x.names.join(" ") === low(t))) ?? null;
      }
      if (!e && (m.how === "name" || m.how === "alias")) { e = byName(m); if (!e) { e = newEntity(textOf(m), m.names, m.head, m.plural, m.headNoun); } else if (m.how === "alias" && (!m.headNoun || !e.headNoun || m.headNoun === e.headNoun)) { for (const n of m.names) if (!e.names.includes(n)) e.names.push(n); } }
      // a name headed by a common noun ("lac Léman", "Lake Baikal") says its entity's kind: a later "le lac" finds it
      if (e && (m.how === "name" || m.how === "alias") && m.headNoun) e.kinds.add(m.headNoun);
      else if (m.how === "alias" && e) { if (!m.headNoun || !e.headNoun || m.headNoun === e.headNoun) for (const n of m.names) if (!e.names.includes(n)) e.names.push(n); }
      else if (m.how === "we") e = page ?? newEntity("we", ["we"], null);
      else if (m.how === "pronoun") e = antecedent(m);
      else if (m.how === "relative") {
        const a = m.antecedent != null ? rows.find((r) => r.id === m.antecedent) : null;
        // the noun the clause modifies; a copula's predicate noun is no mention, so its subject ("le Massif central est un massif … qui")
        e = (a ? byHid(a.id)?.entity : null) ?? (a ? byHid(rows.find((r) => r.head === a.id && /^nsubj/.test(r.deprel))?.id ?? -1)?.entity : null) ?? null;
      }
      else if (m.how === "dropped") e = page ?? null;
      else if (m.how === "description") {
        const fits = (x) => x.head === m.headNoun || x.kinds.has(m.headNoun) || x.headNoun === m.headNoun || (!!same && !!m.headNoun && [...x.kinds].some((k) => k !== m.headNoun && same(k, m.headNoun)));
        const agree = (x) => !!x.plural === !!m.plural;
        e = (page && fits(page) && !m.plural ? page : null)
          ?? [...recent].reverse().map((r) => r.entity).find((x) => x.known && x.names.length && fits(x) && agree(x))
          ?? [...recent].reverse().map((r) => r.entity).find((x) => fits(x) && agree(x) && !x.negated)
          ?? Object.assign(newEntity(textOf(m), [], m.headNoun ?? m.head, m.plural, m.headNoun), { created: si });
      } else { e = newEntity(textOf(m), [], m.headNoun ?? m.head, m.plural, m.headNoun); if (m.negated) e.negated = true; }
      m.entity = e;
      if (e && (m.how === "name" || m.how === "alias" || m.how === "description" || m.how === "pronoun" || m.how === "relative" || m.how === "dropped" || m.how === "we")) e.known = true;
      if (e) recent.push({ entity: e, si, plural: !!(m.plural || e.plural) && m.how !== "dropped", subject: !!m.subject, how: e.created === si && m.how === "description" ? "new" : m.how });
    }
    // a description with an appositive name is that name ("ALLETE's largest business, Minnesota Power")
    for (const m of ms.filter((x) => x.how === "description")) {
      const ap = rows.find((r) => r.head === m.hid && r.deprel === "appos" && r.upos === "PROPN"), am = ap && byHid(ap.id);
      if (am?.entity) m.entity = am.entity;
    }
    // a copula states a kind of its subject ("Lake Baikal is a rift lake"): later descriptions of that kind find it
    for (const r of rows.filter((x) => rows.some((c) => c.head === x.id && c.deprel === "cop") && /^(NOUN)$/.test(x.upos))) {
      const subj = rows.find((c) => c.head === r.id && /^nsubj/.test(c.deprel)), sm = subj ? byHid(subj.id) : ms.find((m) => m.how === "dropped" && m.hid === r.id);
      if (sm?.entity) sm.entity.kinds.add(lem(r));
    }
    out.push({ text, rows, mentions: ms.map((m) => ({ text: textOf(m), start: m.start, end: m.end, ids: m.ids, hid: m.hid, how: m.how === "relative" ? "pronoun" : m.how, at: m.at, entity: m.entity?.id ?? null })) });
  });
  return { entities: entities.map((e) => ({ id: e.id, name: e.name, names: e.names, head: e.head, kinds: [...e.kinds] })), sentences: out };
}
