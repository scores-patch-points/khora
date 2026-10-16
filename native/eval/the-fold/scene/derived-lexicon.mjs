// scene/derived-lexicon.mjs — WHAT REPLACES A FIXED WORD LIST, WHERE A DERIVATION WAS MEASURED TO LEAVE THE NUMBERS ALONE.  (2026-10-14)
//
// "No fixed lists anywhere" (the user). Each export is a derivation from a received resource or from the collection's own
// statistics, not an enumeration of words:
//
//   greekStemOf(seed)    the Greek stem the Republic's own Stephanus-page grid pinned to a concept (plato-republic-concepts-v1), reduced
//                        by successor variety (Harris 1955): the first prefix of three letters or more after which the corpus'
//                        continuation count peaks. "slavery" → δουλειασ → δουλ; "freedom" → ελευθερια → ελευθερ.
//   negatorForms(model)  the English forms the parser's OWN lexicon types as negation (feats Polarity=Neg or PronType=Neg), kept where
//                        the feature's word class is the form's dominant class in the POS prior ("one" is PRON PronType=Neg in the
//                        lexicon through "no one", but its dominant class is NUM: not a negator).
//   isNegatorRow(row)    the same, read off a parsed row's own feats.
//   topicLexicon()       REPORT ONLY (see NO-FIXED-LISTS-SCENE.md, not wired into any script): the English word types of the Republic
//                        associated with a topic concept's Greek stem at Stephanus-section grain; exact hypergeometric tail, Bonferroni
//                        over the words tested, reciprocal best partner.
//
// Nothing is read at import.
import fs from "node:fs";

export const PRIORS = {
  concepts: "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/plato-republic-concepts-v1.json",
  pos: "/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json",
  greek: "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/plato-republic.txt",
  english: "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg55201_The_Republic_by_Plato.txt",
};
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const cache = new Map();
const once = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
export const foldGreek = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ");

// ── Greek stems ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const greekTypes = () => once("gtypes", () => [...new Set(foldGreek(fs.readFileSync(PRIORS.greek, "utf8")).match(/\p{L}{2,}/gu) ?? [])]);
/** First prefix (≥ minLen) at which the number of distinct next letters, over the corpus' word types, is a local peak. */
export function successorStem(form, types = greekTypes(), minLen = 3) {
  const sv = (L) => { const p = form.slice(0, L), nx = new Set(); for (const t of types) if (t.length > L && t.startsWith(p)) nx.add(t[L]); return nx.size; };
  let prev = sv(minLen - 1);
  for (let L = minLen; L < form.length; L++) { const cur = sv(L); if (cur > prev && cur >= sv(L + 1)) return form.slice(0, L); prev = cur; }
  return form;
}
const lcp = (a) => a.reduce((p, w) => { let i = 0; while (i < p.length && i < w.length && p[i] === w[i]) i++; return p.slice(0, i); });
/** The concept rows whose English form begins with `seed` (rule, ruler, ruled), their Greek forms' common prefix, then the stem. */
export function greekStemOf(seed) {
  const rows = once("concepts", () => readJson(PRIORS.concepts).entries);
  const forms = rows.filter((e) => String(e.meta?.englishForm ?? e.left.replace(/^concept:/, "")).toLowerCase().startsWith(seed)).map((e) => e.right.replace(/^grc:/, ""));
  if (!forms.length) return null;
  const p = lcp(forms);
  return forms.length > 1 ? (p.length <= 3 ? p : successorStem(p)) : successorStem(forms[0]);
}

// ── negation, from the parser's own typing ─────────────────────────────────────────────────────────────────────────────────────
const posPrior = () => once("pos", () => readJson(PRIORS.pos).forms);
const dominantUpos = (f) => { const e = posPrior()[f]; if (!e) return null; let b = null, n = -1; for (const [u, c] of Object.entries(e)) if (c > n) { b = u; n = c; } return b; };
const NEG_FEAT = /(^|\|)(Polarity=Neg|PronType=Neg)(\||$)/;
/** Forms the parser's lexicon types as negation, kept where the class agrees with the form's dominant class. */
export function negatorForms(model) {
  const out = new Set();
  for (const [k, v] of Object.entries(model.lexicon.form)) {
    const [form, upos] = k.split("|"); if (!NEG_FEAT.test(v.split("\t")[1] ?? "")) continue;
    const d = dominantUpos(form); if (d && d !== upos) continue;
    out.add(form);
  }
  return out;
}
/** A parsed row is a negator by its own feats (class agreeing with the form's dominant class), the way a form is in negatorForms. */
export const isNegatorRow = (row) => NEG_FEAT.test(row.feats ?? "") && (dominantUpos(String(row.form).toLowerCase()) ?? row.upos) === row.upos;

// ── REPORT ONLY: English words aligned with a Greek stem ─────────────────────────────────────────────────────────────────────────
export function stephanusSections() {
  return once("sections", () => {
    const gRaw = fs.readFileSync(PRIORS.greek, "utf8"), eRaw = fs.readFileSync(PRIORS.english, "utf8");
    const gS = new Map(); { const re = /\[ (\d{3})([a-e]) \]/g; const mk = []; let m; while ((m = re.exec(gRaw)) !== null) mk.push({ s: m[1] + m[2].toUpperCase(), i: m.index, e: m.index + m[0].length }); mk.forEach((k, i) => gS.set(k.s, (gS.get(k.s) ?? "") + " " + gRaw.slice(k.e, i + 1 < mk.length ? mk[i + 1].i : gRaw.length))); }
    const eS = new Map(); {
      const start = eRaw.indexOf("I went down yesterday to the Piraeus"); const re = /\*(\d{3})([A-Ea-e])?\*/g; re.lastIndex = start; const mk = []; let m, last = 326;
      while ((m = re.exec(eRaw)) !== null) { const p = Number(m[1]); if (p >= last && p <= 621) { mk.push({ s: `${p}${(m[2] ?? "A").toUpperCase()}`, i: m.index, e: m.index + m[0].length }); last = p; } }
      mk.forEach((k, i) => eS.set(k.s, (eS.get(k.s) ?? "") + " " + eRaw.slice(k.e, i + 1 < mk.length ? mk[i + 1].i : k.e + 3000)));
    }
    const ids = [...gS.keys()].filter((s) => eS.has(s));
    return { ids, greek: new Map(ids.map((s) => [s, foldGreek(gS.get(s))])), english: new Map(ids.map((s) => [s, eS.get(s).replace(/\[(?:Footnote|Sidenote)[\s\S]*?\]/g, " ").replace(/\{\d+\}/g, " ").toLowerCase()])) };
  });
}
const LG = (() => { const c = [0]; for (let i = 1; i < 8192; i++) c[i] = c[i - 1] + Math.log(i); return c; })();
const lC = (n, k) => LG[n] - LG[k] - LG[n - k];
/** P(X ≥ k): overlap of an n-set with a random g-subset of N, the exact permutation null of a section label. */
export function hyperTail(k, n, g, N) { let s = 0; for (let x = k; x <= Math.min(n, g); x++) { if (g - x > N - n) continue; s += Math.exp(lC(n, x) + lC(N - n, g - x) - lC(N, g)); } return Math.min(1, s); }
export function alignedEnglish(stem, { minSections = 3 } = {}) {
  const S = stephanusSections(), N = S.ids.length;
  const re = new RegExp("(?:^|[^α-ω])" + stem);
  const G = new Set(S.ids.filter((s) => re.test(S.greek.get(s))));
  const es = new Map();
  for (const s of S.ids) for (const w of new Set(S.english.get(s).match(/[a-z]{3,}/g) ?? [])) { let a = es.get(w); if (!a) es.set(w, (a = new Set())); a.add(s); }
  const wl = [...es].filter(([, a]) => a.size >= minSections); const bar = 1 / wl.length;
  const gs = new Map();
  for (const s of S.ids) for (const w of new Set(S.greek.get(s).match(/\p{L}{3,}/gu) ?? [])) { const k = w.slice(0, 4); let a = gs.get(k); if (!a) gs.set(k, (a = new Set())); a.add(s); }
  const gl = [...gs].filter(([, a]) => a.size >= minSections);
  const own = (k) => stem.startsWith(k) || k.startsWith(stem.slice(0, 4));
  const rows = [];
  for (const [w, a] of wl) {
    let k = 0; for (const x of a) if (G.has(x)) k += 1;
    const p = hyperTail(k, a.size, G.size, N), lift = (k / a.size) / (G.size / N);
    if (!(p < bar && lift > 1)) continue;
    let best = null, bp = 2;
    for (const [gk, ga] of gl) { let kk = 0; for (const x of a) if (ga.has(x)) kk += 1; const pp = hyperTail(kk, a.size, ga.size, N); if (pp < bp) { bp = pp; best = gk; } }
    rows.push({ word: w, sections: a.size, together: k, p, lift, bestGreek: best, reciprocal: best != null && own(best) });
  }
  return { greekSections: G.size, sections: N, tested: wl.length, bar, rows: rows.sort((x, y) => x.p - y.p) };
}
/** { slave: {stems, words:Set, detail}, rule: … } for the declared topic seeds. */
export function topicLexicon(seeds = { slave: ["slavery", "master"], rule: ["rule", "law", "tyrant"] }) {
  const out = {};
  for (const [topic, ws] of Object.entries(seeds)) {
    const words = new Set(), detail = [], stems = [];
    for (const seed of ws) { const st = greekStemOf(seed); if (!st) continue; stems.push(st); for (const r of alignedEnglish(st).rows) { detail.push({ seed, stem: st, ...r }); if (r.reciprocal) words.add(r.word); } }
    out[topic] = { words, stems, detail };
  }
  return out;
}
