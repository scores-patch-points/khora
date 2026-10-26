// atoms.js — a sentence's EOTClaim@1 claims as ATOMS: one fact each, over the page's entities (coref.js), with the character span of the words
// that state it. The atom is the unit the meaning check weighs (MEANING-ATOMS.md): a claim is supported atom by atom, so a paraphrase that
// repackages the same facts meets, a misattachment damages one atom and not the claim, and what was not read is reported, atom by atom.
//   atomize({ claims, rows, mentions, entities, text }) → [{ pred, args: [{ entity, name } | { value }], neg, hedged, approx, tense, start, end, from }]
//   tense and time are the sense an atom is said in: the claim's tense ("past" | "present" | "future") and the years its own adjuncts name ("in
//   1900"), or null. A figure takes its clause's (grammar-en.js claimsOf). Atoms of one claim share `from`.
//   realize(atom) → "pred(arg, arg)" in plain words, for reading and judging
// Atoms, and where they come from:
//   is_a(x, kind)          a copula with a noun ("Lake Baikal is a rift lake")
//   named(x, name)         a naming or alias ("also known as", "denominado"), or a copula whose other side is a name
//   <adjective>(x)         an adjective on a referent, or on a copula's predicate ("the deepest lake")
//   <relation>(x, y, z)    a claim's relation over its subject, object and recipient
//   <relation>_<case>(x, y) an oblique of the claim ("situated in Siberia" → situate_in)
//   <case>(x, y)           a modifier phrase of a referent ("the frontier between Bolivia and Peru" → between)
//   has_<attribute>(x, v)  a bound figure, its value in the sentence's own words
// WHERE A NEGATION LANDS. A clause's polarity scopes over its predication; what a participant is said to be in passing stays asserted, because a
// negation leaves its presuppositions standing. "Mercury does not orbit the large star" denies the orbit, not that the star is large; "Mercury is not
// the hottest planet in the solar system" denies hottest, not that Mercury is a planet or is in the solar system. So the modifiers inside a
// participant's noun phrase are asserted whatever the clause's polarity; and when a negated copula's predicate noun phrase carries an adjective, that
// adjective is the focus and the head noun's kind and the clause's frame (its obliques) are presupposed with it. A clause negated through a quantifier
// ("no mountain is higher than Y") keeps every atom under its polarity: atom-support.js's canonical() rewrites them together.
import { NO } from "../kernel/atom-support.js";
const lc = (s) => String(s ?? "").toLowerCase();

export function atomize({ claims, rows, mentions, entities, text }) {
  const byId = (id) => rows.find((r) => r.id === id), E = new Map(entities.map((e) => [e.id, e]));
  const mentionOf = (hid) => mentions.find((m) => m.hid === hid) ?? mentions.find((m) => m.ids?.includes(hid)) ?? null;
  const textOfIds = (ids) => { const ws = ids.map(byId).filter(Boolean); if (!ws.length) return ""; return text.slice(Math.min(...ws.map((w) => w.start)), Math.max(...ws.map((w) => w.end))); };
  const arg = (end) => {
    if (!end) return null;
    const m = end.hid != null ? mentionOf(end.hid) : null;
    if (m?.entity && E.get(m.entity)) return { entity: m.entity, name: E.get(m.entity).name, ids: end.ids ?? [] };
    const ws = (end.ids ?? []).map(byId).filter((w) => w && !/^(DET|ADP|PUNCT)$/.test(w.upos));
    return { value: ws.length ? textOfIds(ws.map((w) => w.id)) : end.text, ids: end.ids ?? [] };
  };
  const dropped = (vid) => { const m = mentions.find((x) => x.how === "dropped" && x.hid === vid); return m?.entity && E.get(m.entity) ? { entity: m.entity, name: E.get(m.entity).name, ids: [] } : null; };
  const caseOf = (end) => { const w = (end?.ids ?? []).map(byId).find((r) => r && r.upos === "ADP"); return w ? lc(w.lemma && w.lemma !== "_" ? w.lemma : w.form) : null; };
  const out = [], seen = new Set();
  const push = (pred, args, base, idsUsed) => {
    const as = args.filter(Boolean); if (!pred || !as.length) return;
    const key = JSON.stringify([pred, as.map((a) => a.entity ?? lc(a.value)), base.neg]); if (seen.has(key)) return; seen.add(key);
    const ws = [...new Set(idsUsed.flat().filter((x) => x != null))].map(byId).filter(Boolean);
    out.push({ pred, args: as.map(({ ids, ...a }) => a), neg: !!base.neg, hedged: !!base.hedged, approx: !!base.approx, tense: base.tense ?? null, time: base.time ?? null, start: ws.length ? Math.min(...ws.map((w) => w.start)) : null, end: ws.length ? Math.max(...ws.map((w) => w.end)) : null, from: base.from });
  };
  // an adjective keeps its degree: "the largest lake" is most:large, "más alto" more:tall (a "more" word or the Degree feature; with a
  // definite article on its noun, the comparative is a superlative)
  const MORE = new Set(["more", "most", "más", "plus", "mehr", "meist", "最も", "もっと", "最"]);
  const degreeOf = (w) => {
    const ks = rows.filter((k) => k.head === w.id), noun = byId(w.head), defNoun = noun && rows.some((k) => k.head === noun.id && /^det/.test(k.deprel) && /Definite=Def/.test(k.feats ?? ""));
    if (/Degree=Sup/.test(w.feats ?? "") || /est$/i.test(w.form) && lc(w.lemma) !== lc(w.form) || ks.some((k) => /^(most|最も|最)$/i.test(k.form))) return "most:";
    if (/Degree=Cmp/.test(w.feats ?? "") || ks.some((k) => MORE.has(lc(k.form)))) return defNoun ? "most:" : "more:";
    return "";
  };
  const word = (w) => { const l = lc(w.lemma && w.lemma !== "_" ? w.lemma : w.form), f = lc(w.form); return l.slice(0, 3) === f.slice(0, 3) || /[^\x00-\x7f]/.test(f) ? l : f; };
  const adjAtoms = (end, owner, base) => {
    const head = end?.hid != null ? byId(end.hid) : null; if (!head || head.upos === "PROPN" || !owner) return;
    for (const w of rows.filter((x) => x.head === head.id && x.upos === "ADJ" && /^(amod|acl)$/.test(x.deprel))) push(degreeOf(w) + word(w), [owner], base, [[w.id], owner?.ids ?? []]);
  };
  // a modifier phrase is a relation between its owner and it; a coordinated word repeats the relation of the word it is coordinated with.
  // `inner` is the polarity of what sits inside a noun phrase (see WHERE A NEGATION LANDS); a repeated oblique relation keeps its parent's own
  const modAtoms = (end, owner, inner, parent = null) => {
    for (const n of end?.nmods ?? []) {
      const a = arg(n);
      if (n.conj) { if (parent) push(parent.pred, [parent.owner, a], parent.base ?? inner, [parent.owner?.ids ?? [], n.ids ?? []]); adjAtoms(n, a, inner); modAtoms(n, a, inner, parent); continue; }
      const pred = caseOf(n) ?? "of";
      if (!skipMod.has(n.hid)) push(pred, [owner, a], inner, [owner?.ids ?? [], n.ids ?? []]);
      adjAtoms(n, a, inner); modAtoms(n, a, inner, { pred, owner });
    }
  };
  let skipMod = new Set();
  for (const c of claims) {
    const base = { neg: c.polarity === "-", hedged: c.asserted === false, from: c.id, tense: c.tense ?? null, time: c.time ?? null };
    const quantified = [c.ARG0, c.ARG1, c.ARG2].some((e) => NO.test(e?.text ?? ""));
    const pres = base.neg && !quantified ? { ...base, neg: false } : base;
    const predHead = c.rel === "be" && c.ARG1?.hid != null ? byId(c.ARG1.hid) : null;
    const focus = pres !== base && !c.alias && !!predHead && predHead.upos !== "PROPN" && rows.some((x) => x.head === predHead.id && x.upos === "ADJ" && /^(amod|acl)$/.test(x.deprel));
    const frame = focus ? pres : base;
    if (c.rel === "fig") {
      const being = arg(c.ARG0), f = c.fig ?? {};
      const inBr = (c.ids ?? []).some((id) => { let d = 0; for (const r of rows) { if (r.id >= id) break; if (r.form === "(") d++; else if (r.form === ")") d--; } return d > 0; });
      // a figure in brackets is a second atom only when it repeats one outside them; when the brackets hold the only figures ("depth (923 ft;
      // 281 m)") they are the figure
      const outside = claims.some((d) => d !== c && d.rel === "fig" && d.fig?.measure === f.measure && d.ARG0?.hid === c.ARG0?.hid && !(d.ids ?? []).some((id) => { let k = 0; for (const r of rows) { if (r.id >= id) break; if (r.form === "(") k++; else if (r.form === ")") k--; } return k > 0; }));
      if (f.measure === "date" || (inBr && outside) || !being?.entity || /^(PRON|DET|NUM)$/.test(byId(c.ARG0?.hid)?.upos ?? "")) continue;
      const pred = `has_${f.attribute ?? String(f.measure ?? "value").replace(/^count:/, "number_of_")}`;
      // the value keeps its measure in base units and its bracketed equivalents, so "281 metres" meets "923 ft (281 m)"
      push(pred, [being, { value: textOfIds(c.ids ?? []), ids: c.ids ?? [], measure: f.measure ?? null, base: f.base ?? null, alts: f.alts ?? [] }], { ...base, approx: !!f.approx }, [c.ids ?? [], being?.ids ?? []]);
      continue;
    }
    const A0 = arg(c.ARG0) ?? (c.ARG1 && c.voice !== "passive" ? dropped(c.vid) : null) ?? (c.rel === "be" ? dropped(c.vid) : null);
    const A1 = arg(c.ARG1), A2 = arg(c.ARG2), V = c.vid ? [c.vid] : [];
    const junk = (end) => { const h = end?.hid != null ? byId(end.hid) : null; return !h || /^(PRON|DET|NUM|PUNCT|ADP|SYM)$/.test(h.upos) || h.form.length < 2; };
    if (c.rel === "be" && (junk(c.ARG0) && !A0?.entity || junk(c.ARG1) || !(c.ARG1?.ids ?? []).map(byId).some((w) => w && /^(NOUN|PROPN|ADJ)$/.test(w.upos)))) continue;
    if (c.rel === "be") {
      const m1 = c.ARG1?.hid != null ? mentionOf(c.ARG1.hid) : null;
      if (c.alias || m1?.how === "name") push("named", [A0, { value: c.ARG1?.text, ids: c.ARG1?.ids ?? [] }], base, [V, A0?.ids ?? [], c.ARG1?.ids ?? []]);
      else {
        const kind = (c.ARG1?.ids ?? []).map(byId).filter((w) => w && /^(NOUN|PROPN)$/.test(w.upos) && w.id === c.ARG1.hid || (w && w.upos === "NOUN" && w.deprel === "compound")).map((w) => w.form).join(" ");
        push("is_a", [A0, { value: kind || c.ARG1?.text, ids: c.ARG1?.ids ?? [] }], frame, [V, A0?.ids ?? [], c.ARG1?.ids ?? []]);
        adjAtoms(c.ARG1, A0, base);
      }
    } else push(c.rel, [A0, A1, A2], base, [V, A0?.ids ?? [], A1?.ids ?? [], A2?.ids ?? []]);
    for (const o of c.OBL ?? []) push(`${c.rel}_${caseOf(o) ?? "at"}`, [A0 ?? A1, arg(o)], frame, [V, o.ids ?? []]);
    // an oblique already said as the claim's own place or time is not said again as a modifier of its predicate noun
    skipMod = new Set((c.OBL ?? []).map((o) => o.hid));
    for (const [end, a] of [[c.ARG0, A0], [c.ARG1, c.rel === "be" ? A0 : A1], [c.ARG2, A2], ...(c.OBL ?? []).map((o) => [o, arg(o)])]) {
      // inside a noun phrase the polarity is the participant's, not the clause's — except the predicate noun phrase of a copula without a focus adjective
      const inner = c.rel === "be" && end === c.ARG1 ? frame : pres;
      if (c.rel !== "be" || end !== c.ARG1) adjAtoms(end, a, pres);
      // an oblique's coordinated words repeat its relation ("borders … Wisconsin, Iowa, Illinois"), under the clause's polarity; a modifier's do as before
      const isObl = (c.OBL ?? []).includes(end);
      modAtoms(end, end === c.ARG1 && c.rel === "be" ? A0 : a, inner, isObl ? { pred: `${c.rel}_${caseOf(end) ?? "at"}`, owner: A0 ?? A1, base: frame } : null);
    }
  }
  // every other name the sentence gives an entity is a fact of the sentence (named), and a name joined to a common noun through "de" / "of"
  // ("la ciudad de Barranquilla") says the entity's kind
  for (const m of mentions) {
    const e = m.entity && E.get(m.entity); if (!e) continue;
    if (m.how === "alias" && m.text && lc(m.text) !== lc(e.name)) push("named", [{ entity: e.id, name: e.name, ids: [] }, { value: m.text, ids: m.ids ?? [] }], { from: "alias" }, [m.ids ?? []]);
    const h = m.hid != null ? byId(m.hid) : null;
    if (h && h.upos === "NOUN" && (m.how === "name" || m.how === "alias") && rows.some((k) => k.head === h.id && k.upos === "PROPN" && k.deprel === "nmod" && rows.some((c) => c.head === k.id && c.deprel === "case")))
      push("is_a", [{ entity: e.id, name: e.name, ids: [] }, { value: h.form, ids: [h.id] }], { from: "name" }, [m.ids ?? []]);
  }
  return out;
}

export function realize(a) {
  return `${a.neg ? "NOT " : ""}${a.pred}(${a.args.map((x) => x.name ?? x.value).join(", ")})${a.hedged ? " [hedged]" : ""}${a.approx ? " [approx]" : ""}`;
}
