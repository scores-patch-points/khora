// grammar-ud.js — the grammar adapter for ANY language with a UD treebank: text → that treebank's words (ud-tokenize.js) → a UD parse
// (ud-parser.js, trained on the treebank) → EOT claims (EOTClaim@1), the same claims grammar-en.js makes for English. It reads UD structure
// only: subjects, objects, obliques, copulas, passives, relative clauses, conjuncts and appositives are UD relations, the same in every
// language. What a language adds is its closed classes (grammar-packs.js) and, for keys shared across languages, a glossary: an injected
// gloss(lang, lemma, upos) → the neutral key (English Wiktionary's gloss of the word), so "descubrir" and "discover" are one relation. With no
// glossary, keys stay the language's own lemmas: two sentences in one language still meet; across languages they do not, and say so.
//   makeGrammar(lang, { model, tokenizer, glossary }) → { rowsOf(text), claimsOf(text) }
import { existsSync } from "node:fs";
import { analyse, loadModel, readJsonMaybeGz, loadLexiconFile } from "./ud-parser.js";
import { tokenizeWith, loadTokenizer } from "./ud-tokenize.js";
import { bindFigures } from "./figure-binding.js";
import { unreadWords } from "./claim-coverage.js";
import { PACKS } from "./grammar-packs.js";

const feat = (r, k) => new RegExp(`(^|\\|)${k}(\\||$)`).test(r?.feats ?? "");
const lem = (r) => String(r?.lemma && r.lemma !== "_" ? r.lemma : r?.form ?? "").toLowerCase();
const low = (r) => String(r?.form ?? "").toLowerCase();
const kidsOf = (rows, id) => rows.filter((r) => r.head === id);
// what a head's own span leaves out: its clauses, its obliques, and its appositive (a second statement about it, not part of its name:
// "Jan Ingenhousz, médico … nacido en los Países Bajos")
const SKIP = /^(punct|acl|acl:relcl|advcl|ccomp|parataxis|conj|cc|nsubj|nsubj:pass|csubj|cop|aux|aux:pass|mark|obl|obl:agent|obl:tmod|obl:npmod|obl:arg|advmod|xcomp|nmod|expl|expl:pass|dislocated|appos)$/;
// a short appositive name is part of the name ("Groq, Inc."), not a second statement
const nameAppos = (rows, r) => r.deprel === "appos" && r.upos === "PROPN" && rows.find((h) => h.id === r.head)?.upos === "PROPN" && Math.abs(r.id - r.head) <= 2;
const spanOf = (rows, id) => { const out = [], st = [id]; while (st.length) { const x = st.pop(); out.push(x); for (const r of rows) if (r.head === x && !(x === id && SKIP.test(r.deprel) && !nameAppos(rows, r)) && !/^(punct|acl:relcl|parataxis|cc)$/.test(r.deprel)) st.push(r.id); } return out.map((i) => rows.find((r) => r.id === i)).sort((a, b) => a.id - b.id); };

/** the figure-binding lexicon a pack gives (figure-binding.js reads the tree; these are the language's number and unit words) */
function figureLex(L) {
  const unit = (w) => { const k = String(w).toLowerCase(); return L.units[k] ?? L.units[k.replace(/\.$/, "")] ?? null; };
  return {
    numberOf(form, next) {
      const f = String(form).replace(/\s/g, "");
      let m;
      if ((m = /^(\d+(?:[.,]\d+)?)[–-](\d+(?:[.,]\d+)?)$/.exec(f))) return { value: +m[1].replace(",", "."), hi: +m[2].replace(",", ".") };
      // "36", "4,0" (a decimal comma), "1.234" / "1,234" (a thousands mark: three digits after it)
      if (/^\d{1,3}([.,]\d{3})+$/.test(f)) return { value: +f.replace(/[.,]/g, "") };
      if (/^\d+([.,]\d+)?$/.test(f)) return { value: +f.replace(",", ".") };
      if ((m = /^(\d+(?:[.,]\d+)?)(\p{L}+|%)$/u.exec(f)) && unit(m[2])) return { value: +m[1].replace(",", "."), unit: m[2] };
      const w = L.numbers[f.toLowerCase()]; if (w != null) return { value: w, word: true };
      return null;
    },
    scaleOf: (w) => L.scale[String(w).toLowerCase()] ?? null,
    dateUnit: (w) => !!L.dateUnits?.has(String(w)),
    unitOf: unit,
    isYear: (v, form, rows, i) => (/^\d{4}$/.test(String(form)) && v >= 1000 && v <= 2100) || [rows[i - 1], rows[i + 1], rows[i - 2]].some((x) => x && L.months.has(low(x))),
    singular: (w) => w,
    isDimension: () => false,
    isApprox: (rows, i) => rows.slice(Math.max(0, i - 3), i).some((x) => L.approx.has(low(x))),
  };
}

/** makeGrammar(lang, { model, tokenizer, glossary }) — model: loadModel(ud-parser JSON); tokenizer: loadTokenizer(ud-tokenize JSON) */
export function makeGrammar(lang, { model, tokenizer, glossary = null }) {
  const L = PACKS[lang]; if (!L) throw new Error(`no grammar pack for ${lang}`);
  const LEX = figureLex(L);
  // the neutral key of a word: the glossary's, else the language's own lemma
  // a verb with its reflexive pronoun ("se llama", "sich verlaufen") reads the senses Wiktionary tags reflexive
  const reflexiveIn = (rows, r) => !!rows && kidsOf(rows, r.id).some((k) => /^(expl|expl:pv|expl:pass|expl:impers|obj|iobj)$/.test(k.deprel) && (feat(k, "Reflex=Yes") || L.reflexive?.has(low(k))));
  const key = (r, rows = null) => { const l = lem(r); if (!glossary || /^(PROPN|NUM|PRON)$/.test(r?.upos)) return l; return glossary(lang, l, r?.upos, { reflexive: reflexiveIn(rows, r) }) ?? l; };
  // every English key the word's gloss gives ("relier: to connect, link, join"), the key first: any of them meets the other side's key
  const keysOf = (r, rows = null) => { const k = key(r, rows); if (!glossary?.all || /^(PROPN|NUM|PRON)$/.test(r?.upos)) return [k]; return [...new Set([k, ...(glossary.all(lang, lem(r), r?.upos, { reflexive: reflexiveIn(rows, r) }) ?? [])])]; };
  const hasCase = (rows, r, words) => kidsOf(rows, r.id).some((c) => /^(case|mark|cc|fixed)$/.test(c.deprel) && (words.has(low(c)) || words.has(lem(c))));

  function rowsOf(text) {
    const tk = tokenizeWith(tokenizer, text); if (!tk.length) return [];
    const rows = analyse(model, tk.map((t) => t.form)).map((r, k) => ({ ...r, lemma: r.upos === "NUM" ? low(r) : r.lemma, start: tk[k].start, end: tk[k].end }));
    return rows;
  }
  const endOf = (rows, id, text) => {
    if (!id) return null; const head = rows.find((r) => r.id === id), ws = spanOf(rows, id);
    const agentN = kidsOf(rows, id).find((k) => /^nmod/.test(k.deprel) && hasCase(rows, k, L.agent));
    let d = 0; const inside = new Set(); for (const r of rows) { if (r.form === "(") d++; else if (r.form === ")") d = Math.max(0, d - 1); else if (d > 0) inside.add(r.id); }
    const inBr = ws.map((w) => inside.has(w.id));
    const names = ws.filter((w, k) => w.upos === "PROPN" && !inBr[k]).map(low).filter((n) => !L.titles.has(n.replace(/\.$/, ""))), aliases = ws.filter((w, k) => /^(PROPN|NOUN|X)$/.test(w.upos) && inBr[k]).map(low);
    return { text: ws.map((w) => w.form).join(" "), ids: ws.map((w) => w.id), head: head.upos === "PROPN" ? low(head) : key(head), heads: head.upos === "PROPN" ? [low(head)] : keysOf(head, rows), sup: null, names, aliases,
      keys: ws.filter((w) => /^(NOUN|PROPN|ADJ)$/.test(w.upos) && !L.titles.has(low(w))).map((w) => (w.upos === "PROPN" ? low(w) : key(w))),
      figs: [], quant: ws.map((w) => L.quant[low(w)]).find(Boolean) ?? null, agent: agentN ? endOf(rows, agentN.id, text) : null,
      nmods: kidsOf(rows, id).filter((k) => (/^nmod(:poss)?$/.test(k.deprel) && k !== agentN) || (k.deprel === "conj" && /^(NOUN|PROPN|ADJ|NUM)$/.test(k.upos))).map((k) => endOf(rows, k.id, text)) };
  };

  function propositionsOf(text, rows) {
    const framed = new Set(), out = [], byId = (id) => rows.find((r) => r.id === id);
    const relPron = (r) => r && (feat(r, "PronType=Rel") || (r.upos === "PRON" && /relcl/.test(byId(r.head)?.deprel ?? "")));
    const reported = (v) => { let x = v; for (let i = 0; i < 6 && x; i++) { const h = byId(x.head); if (!h) return false; if (/^(ccomp|parataxis)$/.test(x.deprel) && L.report.has(lem(h))) return true; x = h; } return false; };
    const subjOf = (v, d = 0) => {
      if (!v || d > 4) return null;
      const s0 = kidsOf(rows, v.id).find((k) => /^nsubj/.test(k.deprel));
      if (s0 && relPron(s0)) { let x = v; for (let i = 0; i < 4 && x; i++) { if (/relcl/.test(x.deprel) || x.deprel === "acl") return byId(x.head); if (x.deprel !== "conj") break; x = byId(x.head); } return s0; }
      if (s0) return s0;
      if (v.deprel === "conj" || /^(advcl|xcomp)$/.test(v.deprel)) return subjOf(byId(v.head), d + 1);
      if (/^acl/.test(v.deprel) && !/relcl/.test(v.deprel)) return byId(v.head);
      return null;
    };
    // a negator; one that needs a partner (French "pas", "plus") only beside it; also one fixed under the copula (Japanese "ではない")
    const isNeg = (k, sibs) => (L.neg.has(low(k)) || L.neg.has(lem(k))) && !(L.negNeedsNe?.has(low(k)) && !sibs.some((x) => L.ne?.has(low(x))));
    const negOwn = (x) => { const ks = kidsOf(rows, x.id), all = [...ks, ...ks.filter((k) => /^(cop|case|aux)$/.test(k.deprel)).flatMap((k) => kidsOf(rows, k.id))];
      return all.some((k) => (feat(k, "Polarity=Neg") && !/^(det)$/.test(k.deprel)) || (/^(advmod|aux|neg|discourse|fixed|mark)$/.test(k.deprel) && isNeg(k, all)))
      || kidsOf(rows, x.id).some((k) => /^(nsubj|obj)/.test(k.deprel) && kidsOf(rows, k.id).some((c) => c.deprel === "det" && (L.neg.has(low(c)) || L.quant[low(c)] === "none")));
    };
    for (const v of rows) {
      if (!/^(VERB|AUX|ADJ|NOUN|PROPN)$/.test(v.upos)) continue;
      const ks = kidsOf(rows, v.id), cop = ks.find((k) => k.deprel === "cop");
      if (!cop && !/^(VERB|ADJ)$/.test(v.upos)) continue;
      // a verb that only carries another ("suelen ser más grandes", "pourrait entrer"): the claim is its complement's
      if (!cop && ks.some((k) => k.deprel === "xcomp" && (/^(VERB|ADJ)$/.test(byId(k.id)?.upos))) && !ks.some((k) => /^obj/.test(k.deprel))) continue;
      const neg = negOwn(v) || (v.deprel === "conj" && !ks.some((k) => /^nsubj/.test(k.deprel)) && negOwn(byId(v.head) ?? { id: -1 })) || (v.deprel === "xcomp" && negOwn(byId(v.head) ?? { id: -1 }));
      const auxes = ks.filter((k) => /^(aux|aux:pass|cop)$/.test(k.deprel)), carrier = v.deprel === "xcomp" ? byId(v.head) : null;
      const passive = ks.some((k) => /^(aux:pass|nsubj:pass|expl:pass)$/.test(k.deprel)) || (v.deprel === "conj" && kidsOf(rows, v.head).some((k) => k.deprel === "aux:pass")) || (L === PACKS.ja && auxes.some((k) => /^(れる|られる)$/.test(lem(k))));
      const subj = subjOf(v);
      let obj = ks.find((k) => k.deprel === "obj") ?? null; const iobj = ks.find((k) => k.deprel === "iobj") ?? null;
      if (obj && relPron(obj) && /relcl/.test(v.deprel)) obj = byId(v.head);
      const inClause = (r) => { let x = r; for (let i = 0; i < 4 && x; i++) { if (x.head === v.id) return true; if (/^(acl|acl:relcl|advcl|ccomp|conj)$/.test(x.deprel)) return false; x = byId(x.head); } return false; };
      const agent = rows.find((r) => /^(obl|obl:agent|nmod)$/.test(r.deprel) && inClause(r) && (r.deprel === "obl:agent" || hasCase(rows, r, L.agent)));
      const tenseOf = (ws) => (ws.some((w) => feat(w, "Tense=Past") || (L === PACKS.ja && /^(た|だっ)$/.test(low(w)))) ? "past" : ws.some((w) => feat(w, "Tense=Fut")) ? "future" : "present");
      const tense = tenseOf([v, ...auxes, ...(carrier ? [carrier, ...kidsOf(rows, carrier.id).filter((k) => /^aux/.test(k.deprel))] : [])]);
      const asserted = !reported(v) && ![v, ...auxes, ...(carrier ? [carrier] : [])].some((w) => feat(w, "Mood=Cnd") || L.modal.has(lem(w)) || L.modal.has(low(w)));
      const discourse = (k) => L.discourse.has(spanOf(rows, k.id).map(low).join("_"));
      const than = (k) => hasCase(rows, k, L.than);
      const obls = ks.filter((k) => /^(obl|obl:tmod|obl:npmod|obl:arg|nmod|advcl)$/.test(k.deprel) && k !== agent && !discourse(k) && (k.deprel !== "advcl" || than(k)))
        .map((k) => ({ ...endOf(rows, k.id, text), than: than(k), with: hasCase(rows, k, L.with) }));
      for (const k of ks) if (/^(obl|obl:tmod|obl:npmod|obl:arg|nmod|advcl)$/.test(k.deprel) && discourse(k)) for (const w of spanOf(rows, k.id)) framed.add(w.id);
      const base = { vid: v.id, polarity: neg ? "-" : "+", tense, asserted, OBL: obls.filter((o) => !o.with && !o.than), main: v.head === 0 || (v.deprel === "conj" && byId(v.head)?.head === 0) || (v.deprel === "xcomp" && carrier?.head === 0) };
      const conjRoot = subj && subj.deprel === "conj" ? byId(subj.head) : subj;
      const subjects = subj ? [...new Set([subj, conjRoot, ...rows.filter((r) => conjRoot && r.head === conjRoot.id && r.deprel === "conj" && /^(NOUN|PROPN)$/.test(r.upos))])].filter(Boolean) : [null];
      for (const S0 of subjects) {
        // the "than" phrase, from the tree; when the parse hung it elsewhere (AnCora's "más grandes que las ballenas …" lands on the final
        // period), from the order every comparison has: a comparative adjective, then the "than" word, then the noun it compares with
        let thanEnd = obls.find((o) => o.than);
        const comparative = v.upos === "ADJ" && (feat(v, "Degree=Cmp") || ks.some((k) => L.more.has(low(k)) || L.less.has(low(k))));
        if (!thanEnd && comparative) {
          const t = rows.find((r) => r.id > v.id && (L.than.has(low(r)) || L.than.has(lem(r))));
          const n = t && rows.find((r) => r.id > t.id && /^(NOUN|PROPN|PRON)$/.test(r.upos));
          if (n && !rows.some((r) => r.id > v.id && r.id < t.id && /^(VERB)$/.test(r.upos))) thanEnd = { ...endOf(rows, n.id, text), than: true };
        }
        // a comparison: "X es más grande que Y", "X ist größer als Y", "XはYより大きい" — the adjective's key, the ends in order; "menos" reverses them
        if (v.upos === "ADJ" && thanEnd && S0) {
          const less = ks.some((k) => L.less.has(low(k)));
          const A = endOf(rows, S0.id, text);
          out.push({ ...base, rel: key(v), rels: keysOf(v), ARG0: less ? thanEnd : A, ARG1: less ? A : thanEnd, asym: true });
        } else if (cop && S0) out.push({ ...base, rel: "be", ARG0: endOf(rows, S0.id, text), ARG1: endOf(rows, v.id, text) });
        else if (/^(VERB|ADJ)$/.test(v.upos) && (S0 || obj)) {
          const A0 = passive ? agent : S0, A1 = passive ? S0 : obj;
          // a participle as a state, with no agent ("le Kibo est éteint"): its own adjective entry says the state ("extinct"), where the
          // verb's first sense would say an act ("éteindre: to turn off")
          const state = passive && !agent && !obj && glossary ? glossary(lang, low(v), "ADJ") : null;
          if (state && S0) { out.push({ ...base, rel: "be", ARG0: endOf(rows, S0.id, text), ARG1: { text: v.form, head: state, names: [], aliases: [], keys: [state], figs: [], quant: null, agent: null } }); continue; }
          const rel = L.have.has(lem(v)) ? "have" : key(v, rows), rels = L.have.has(lem(v)) ? ["have"] : keysOf(v, rows);
          // one claim per coordinated object, as per coordinated subject
          for (const O of !passive && obj ? [obj, ...rows.filter((r) => r.head === obj.id && r.deprel === "conj" && /^(NOUN|PROPN)$/.test(r.upos))] : [A1]) {
            const B = passive ? A1 : O;
            out.push({ ...base, rel, rels, ARG0: endOf(rows, A0?.id, text), ARG1: endOf(rows, (B ?? ks.find((k) => /^(obl|obl:arg|xcomp)$/.test(k.deprel) && k.id > v.id && k !== agent && !discourse(k)))?.id, text), ARG2: iobj ? endOf(rows, iobj.id, text) : null, voice: passive ? "passive" : "active", asym: !!(A0 && B) });
          }
        }
        for (const w of obls.filter((o) => o.with)) if (S0) out.push({ ...base, OBL: [], rel: "have", ARG0: endOf(rows, S0.id, text), ARG1: w, asym: true });
      }
    }
    for (const a of rows.filter((r) => r.deprel === "appos" && !(r.upos === "PROPN" && byId(r.head)?.upos === "PROPN" && Math.abs(r.id - r.head) <= 2))) out.push({ polarity: "+", tense: "present", asserted: true, OBL: [], rel: "be", ARG0: endOf(rows, a.head, text), ARG1: endOf(rows, a.id, text) });
    const kept = out.filter((p) => p.ARG0 || p.ARG1); kept.framed = framed; return kept;
  }
  const keyEnd = (e) => e && { text: e.text, head: e.head, heads: e.heads ?? [e.head], sup: null, names: e.names, aliases: e.aliases ?? [], keys: e.keys, figs: e.figs, quant: e.quant, agent: keyEnd(e.agent), nmods: (e.nmods ?? []).map(keyEnd) };
  function claimsOf(text, rows = rowsOf(text)) {
    const P = propositionsOf(text, rows), bound = bindFigures(rows, LEX);
    const unread = unreadWords(rows.filter((r) => !P.framed.has(r.id)), P, bound, { isUnit: (f) => !!LEX.unitOf(f), key: (r) => (r.upos === "PROPN" ? low(r) : key(r)) });
    const props = P.map((p, i) => ({ main: !!p.main, schema: "EOTClaim@1", id: `c${i + 1}`, lang, by: "grammar-ud", rel: p.rel, rels: p.rels ?? [p.rel], ARG0: keyEnd(p.ARG0), ARG1: keyEnd(p.ARG1), ARG2: keyEnd(p.ARG2 ?? null), OBL: (p.OBL || []).map(keyEnd), polarity: p.polarity, tense: p.tense, asserted: p.asserted, asym: !!p.asym }));
    const figs = bindFigures(rows, LEX).map((f, i) => { const ev = f.eventLemma ? rows.find((r) => lem(r) === f.eventLemma) : null; return { schema: "EOTClaim@1", id: `f${i + 1}`, lang, by: "grammar-ud", rel: "fig", main: false, ARG0: f.beingId ? keyEnd(endOf(rows, f.beingId, text)) : null, ARG1: null, OBL: [], polarity: "+", tense: "present", asserted: true, asym: false,
      fig: { measure: f.measure.startsWith("count:") ? `count:${key(rows.find((r) => lem(r) === f.measure.slice(6)) ?? { lemma: f.measure.slice(6) })}` : f.measure, attribute: f.attribute, event: ev ? (L.have.has(f.eventLemma) ? "have" : key(ev)) : f.eventLemma, base: f.base, hiBase: f.hiBase, alts: f.alts, approx: f.approx } }; });
    return [...props, ...figs].map((c) => ({ ...c, unread }));
  }
  return { lang, rowsOf, claimsOf };
}

// each language's priors (janus priors/, linked as khora native/priors): ISO 639-3 code and treebank, as the English ones are named
export const UD_PRIORS = { es: { code: "spa", treebank: "ancora" }, fr: { code: "fra", treebank: "gsd" }, de: { code: "deu", treebank: "gsd" }, ja: { code: "jpn", treebank: "gsd" } };
const PRIORS = new URL("../../priors", import.meta.url).pathname;
/** loadGrammar(lang, { priors, glossary }) → the language's grammar from its priors (ud-parser-<code>-<treebank>.json.gz, ud-tokenizer-<code>.json.gz,
 *  unimorph-<code>-pos.json.gz when the parser was trained with it), or null when they are not on disk: that language is a typed gap */
export async function loadGrammar(lang, { priors = PRIORS, glossary = null } = {}) {
  const P = UD_PRIORS[lang]; if (!P) return null;
  const m = `${priors}/ud-parser-${P.code}-${P.treebank}.json.gz`, t = `${priors}/ud-tokenizer-${P.code}.json.gz`, lx = `${priors}/unimorph-${P.code}-pos.json.gz`;
  if (!existsSync(m) || !existsSync(t)) return null;
  const model = loadModel(await readJsonMaybeGz(m), { lex: existsSync(lx) ? await loadLexiconFile(lx) : null });
  return makeGrammar(lang, { model, tokenizer: loadTokenizer(await readJsonMaybeGz(t)), glossary });
}
