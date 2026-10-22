// atom-produce.js — atoms the parse offers beyond atoms.js, kept by a LEARNED score. Every phrase of the sentence (a noun, name, pronoun or
// number with its modifiers) is a possible participant; every short dependency path between two of them is a possible fact, its predicate
// the words on the path (the verb, the noun or adjective between, the case word that marks the second participant); an adjective or a
// copula's noun on one phrase is a possible one-place fact. An averaged perceptron, trained on gold atoms (runs 13–16), says which paths
// state facts; the path's shape and words are its features, and no rule here says which shapes to keep.
//   candidatesOf({ rows, mentions, entities, text, lang }) → [{ pred, args, start, end, feats, from: "path" }]
//   produce(ctx, model, { have }) → the candidates scoring above model.threshold that no atom in `have` already states over the same arguments
import { optionsOf, optionFeatures, choosePredicate } from "./atom-predicate.js";
const low = (s) => String(s ?? "").normalize("NFC").toLowerCase();
const bucket = (n, cuts) => { for (const c of cuts) if (n <= c) return String(c); return `>${cuts.at(-1)}`; };
// a phrase stops at its clauses, appositions, conjuncts and, when it is a copula's noun, at that clause's subject, copula and obliques
const CUT = /^(acl|acl:relcl|appos|conj|cc|parataxis|punct|advcl|ccomp|xcomp|csubj|dep|list|reparandum|orphan|mark|nsubj|nsubj:pass|cop|aux|aux:pass|obl|obl:agent|advmod|expl|expl:pass)$/;
const lem = (r) => low(r.lemma && r.lemma !== "_" ? r.lemma : r.form);

// keysOf(lemma, upos): optional, a word's English keys (wikt-gloss.js gloss.all), carried on each path word for the predicate chooser
export function candidatesOf({ rows, mentions = [], entities = [], text = "", lang = "en", keysOf = null }) {
  const byId = new Map(rows.map((r) => [r.id, r])), kids = new Map();
  for (const r of rows) (kids.get(r.head) ?? kids.set(r.head, []).get(r.head)).push(r);
  const E = new Map(entities.map((e) => [e.id, e]));
  const span = (h) => { const ids = [h.id], st = [h]; while (st.length) { const x = st.pop(); for (const k of kids.get(x.id) ?? []) if (!CUT.test(k.deprel)) { ids.push(k.id); st.push(k); } } return ids.sort((a, b) => a - b).map((i) => byId.get(i)); };
  const trim = (ws) => { ws = [...ws]; while (ws.length > 1 && /^(ADP|PUNCT|CCONJ|DET|SCONJ)$/.test(ws[0].upos)) ws.shift(); while (ws.length > 1 && /^(PUNCT|ADP|CCONJ)$/.test(ws.at(-1).upos)) ws.pop(); return ws; };
  // the participants: phrase heads
  const parts = rows.filter((r) => /^(NOUN|PROPN|PRON|NUM)$/.test(r.upos) && !/^(compound|flat|flat:name|fixed|nummod|det)$/.test(r.deprel)).map((r) => {
    const ws = r.upos === "PRON" ? [r] : trim(span(r)), m = mentions.find((x) => x.hid === r.id) ?? mentions.find((x) => (x.ids ?? []).includes(r.id));
    const e = m?.entity && E.get(m.entity);
    const t = text.slice(ws[0].start, ws.at(-1).end);
    return { r, ws, start: ws[0].start, end: ws.at(-1).end, arg: e ? { entity: e.id, name: e.name } : { value: t }, how: m?.how ?? (r.upos === "NUM" ? "number" : "phrase"), surface: t };
  });
  // a copula's noun is its subject's description, not a second referent ("Lake Tahoe is a freshwater lake in …"): it stands for the subject,
  // and only the copula's own candidate (is_a) keeps it as itself
  const copSubj = (r) => (kids.get(r.id) ?? []).some((k) => k.deprel === "cop") ? (kids.get(r.id) ?? []).find((k) => /^nsubj/.test(k.deprel)) : null;
  const asPart = new Map(parts.map((p) => [p.r.id, p]));
  for (const p of parts) { const sj = copSubj(p.r), sp = sj && asPart.get(sj.id); if (sp) p.stand = sp; }
  const up = (id) => { const p = []; let x = byId.get(id); while (x) { p.push(x); x = x.head ? byId.get(x.head) : null; } return p; };
  const caseOf = (r) => (kids.get(r.id) ?? []).filter((k) => k.deprel === "case" || k.deprel === "mark" && k.upos === "ADP").map(lem).join("_");
  const out = [];
  const feat = (f) => { const o = []; for (const x of f) o.push(x, `${lang}|${x}`); o.push("bias", `bias|${lang}`); return o; };
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    let a = parts[i], b = parts[j];
    if (a.ws.some((w) => b.ws.includes(w)) && !(b.r.head === a.r.id || a.r.head === b.r.id)) continue; // one inside the other, not head to head
    let pa = up(a.r.id), pb = up(b.r.id), lca = pa.find((x) => pb.includes(x));
    if (!lca) continue;
    let ua = pa.slice(0, pa.indexOf(lca)), ub = pb.slice(0, pb.indexOf(lca));
    const len = ua.length + ub.length;
    if (len < 1 || len > 4) continue;
    // the first participant: the one whose path rises from a subject, else the head of the other, else the earlier
    const subj = (u) => u.length >= 1 && /^nsubj/.test(u.at(-1).deprel);
    if (subj(ub) && !subj(ua) || ub.length === 0 && ua.length > 0) { [a, b] = [b, a]; [ua, ub] = [ub, ua]; }
    const between = [...ua.slice(1), ...(lca === a.r || lca === b.r ? [] : [lca]), ...ub.slice(1)].filter((x) => /^(VERB|ADJ|NOUN|AUX)$/.test(x.upos) && x.deprel !== "cop" && !a.ws.includes(x) && !b.ws.includes(x));
    const copula = lca === b.r && (kids.get(b.r.id) ?? []).some((k) => k.deprel === "cop") && ua.length === 1 && /^nsubj/.test(a.r.deprel);
    const cs = caseOf(b.r);
    const pred = copula ? "is_a" : [...between.map(lem), cs].filter(Boolean).join("_") || "of";
    const A = !copula && a.stand ? a.stand : a, B = !copula && b.stand ? b.stand : b;
    if (A === B) continue;
    const sig = [...ua.map((x) => `${x.deprel}^`), lca.upos, ...[...ub].reverse().map((x) => `v${x.deprel}`)].join(" ");
    const f = [`sig=${sig}`, `len=${len}`, `lca=${lca.upos}`, `lcaDep=${lca.head === 0 ? "root" : lca.deprel}`, `copula=${copula ? 1 : 0}`,
      `case=${cs || "-"}`, `aU=${a.r.upos}`, `bU=${b.r.upos}`, `aHow=${a.how}`, `bHow=${b.how}`, `aDep=${a.r.deprel}`, `bDep=${b.r.deprel}`,
      `between=${between.length}`, `betweenU=${between.map((x) => x.upos).join("+") || "-"}`, `lcaLemma=${lem(lca)}`, `gap=${bucket(Math.abs(a.r.id - b.r.id), [1, 3, 6, 12])}`,
      `aEnt=${a.arg.entity ? 1 : 0}`, `bEnt=${b.arg.entity ? 1 : 0}`, `sigCase=${sig}|${cs ? "case" : "-"}`, `neg=${(kids.get(lca.id) ?? []).some((k) => /Polarity=Neg/.test(k.feats ?? "") || /^(not|no|ne|nicht|kein|no|ない)$/.test(low(k.form))) ? 1 : 0}`];
    f.push(`stand=${A !== a || B !== b ? 1 : 0}`);
    // the path's words, for the predicate chooser (atom-predicate.js): the content words between, then the case words of the second
    const wordOf = (x, role) => ({ lemma: lem(x), upos: x.upos, deprel: x.head === 0 ? "root" : x.deprel, role, lca: x === lca, keys: lang === "en" ? [lem(x)] : (keysOf?.(lem(x), x.upos) ?? []).slice(0, 4) });
    const words = copula ? [] : [...between.map((x) => wordOf(x, "between")), ...(kids.get(b.r.id) ?? []).filter((k) => k.deprel === "case" || k.deprel === "mark" && k.upos === "ADP").map((k) => wordOf(k, "case"))];
    out.push({ pred, args: [A.arg, B.arg], start: Math.min(a.start, b.start), end: Math.max(a.end, b.end), from: "path", feats: feat(f), surfaces: [A.surface, B.surface], words, copula, sig, lang });
  }
  // one-place facts: an adjective on a phrase
  for (const a of parts) for (const k of (kids.get(a.r.id) ?? []).filter((x) => x.upos === "ADJ" && /^amod/.test(x.deprel))) {
    const f = [`one=amod`, `aU=${a.r.upos}`, `aHow=${a.how}`, `adj=${lem(k)}`, `deg=${/Degree=(\w+)/.exec(k.feats ?? "")?.[1] ?? "-"}`, `aEnt=${a.arg.entity ? 1 : 0}`, `pos=${k.id < a.r.id ? "pre" : "post"}`];
    const A = a.stand ?? a;
    out.push({ pred: lem(k), args: [A.arg], start: Math.min(k.start, a.start), end: Math.max(k.end, a.end), from: "path", feats: feat(f), surfaces: [A.surface] });
  }
  return out;
}
export const scoreOf = (c, model) => c.feats.reduce((s, x) => s + (model?.w?.[x] ?? 0), 0);
const key = (a) => a.entity ?? low(a.value);
// keep the candidates the model scores above its threshold, best first, one per set of arguments, and none over arguments an atom in
// "have" (atoms.js's atoms) already relates; a one-place fact only once per predicate
export function select(cands, model, { have = [] } = {}) {
  const seen = new Set(have.map((a) => ((a.args ?? []).length > 1 ? (a.args ?? []).map(key).sort().join("\t") : `${a.pred}\t${key(a.args?.[0] ?? {})}`)));
  const scored = cands.map((c) => [c, scoreOf(c, model)]).filter(([, v]) => v > (model?.threshold ?? 0)).sort((x, y) => y[1] - x[1]);
  const out = [];
  for (const [c, v] of scored) {
    const k = c.args.length > 1 ? c.args.map(key).sort().join("\t") : `${c.pred}\t${key(c.args[0])}`;
    if (seen.has(k)) continue; seen.add(k); out.push([c, v]);
  }
  return out;
}
// the produced atom's predicate chosen from its path's words (chooser: PredicateChooser@1, atom-predicate.js), then a second stage that keeps
// or drops it (filter: ProducedFilter@1, trained on the precision judges' verdicts) by its path, its chosen predicate and how that was built
export function filterFeatures(c, lang, chooser = null) {
  const cand = { ...c, lang }, os = optionsOf(cand);
  const pick = chooser ? os.find((o) => o.pred === choosePredicate(cand, chooser)) ?? os[0] : os.find((o) => o.pred === c.pred) ?? os[0];
  return [...c.feats, ...(c.words?.length ? optionFeatures(cand, pick).map((x) => `opt|${x}`) : ["opt|none"]), `nwords=${(c.words ?? []).length}`];
}
export function produce(ctx, model, { have = [], chooser = null, filter = null } = {}) {
  const out = [];
  for (const [c, v] of select(candidatesOf(ctx), model, { have })) {
    if (filter && filterFeatures(c, ctx.lang, chooser).reduce((a, x) => a + (filter.w[x] ?? 0), 0) <= (filter.threshold ?? 0)) continue;
    const { feats, surfaces, words, copula, sig, lang, ...a } = c;
    out.push({ ...a, pred: chooser && c.args.length > 1 ? choosePredicate({ ...c, lang: ctx.lang }, chooser) : c.pred, neg: false, hedged: false, approx: false, score: +v.toFixed(3) });
  }
  return out;
}
export function trainProducer(examples, { epochs = 10, seed = 7 } = {}) {
  const w = {}, tot = {}, ts = {}; let t = 0, r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const upd = (fs, d) => { for (const x of fs) { tot[x] = (tot[x] ?? 0) + (t - (ts[x] ?? 0)) * (w[x] ?? 0); ts[x] = t; w[x] = (w[x] ?? 0) + d; } };
  for (let ep = 0; ep < epochs; ep++) for (const [fs, y] of [...examples].sort(() => rand() - 0.5)) { t++; if ((fs.reduce((a, x) => a + (w[x] ?? 0), 0) > 0) !== y) upd(fs, y ? 1 : -1); }
  const avg = {}; for (const x of Object.keys(w)) { const a = ((tot[x] ?? 0) + (t - (ts[x] ?? 0)) * w[x]) / Math.max(1, t); if (Math.abs(a) > 1e-9) avg[x] = +a.toFixed(5); }
  return { schema: "AtomProducer@1", w: avg, threshold: 0 };
}
