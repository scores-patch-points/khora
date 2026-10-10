// adapters/notation/taxonomy.js — the TAXONOMIC-NOMENCLATURE notation family (scientific names of organisms:
// ICZN / ICN binomials and trinomials, uninomials of every rank, authorities, years, abbreviated genera) as a MEDIUM ADAPTER.
//
// WHAT THIS IS. The system under test for eval/notation-competence/taxonomy.mjs. It is NOT the gold: the gold is the Plazi
// TreatmentBank curators' markup audited by gnparser (Global Names parser, MIT), see the instrument header. The kernel stays
// medium-blind; everything that knows what a binomial, an authority or an abbreviated genus is lives here. The only kernel contact
// is kernel/activation.js (decaying activation: PRESENCE of a genus fades, its IDENTITY does not).
//
// ZERO MODEL. No LLM, no network, no parser engine at run time. Every number comes from (a) a RECEIVED prior file with a named
// giver (priors/notation-taxonomy-*.json), or (b) a count the reader makes on the PREFIX it has already read.
//
// LOVELACE'S LAW applied: the reader recovers what the text ORDERS (a genus word followed by an epithet orders a species being; a
// parenthesis around the authority orders "originally described under another name"), never what an organism "is".
//
// WHAT THE PRIORS DO (priors REFUSE or NOMINATE, never admit):
//   notation-taxonomy-lexicon.json     giver: the International Code of Zoological Nomenclature (4th ed.) and the International Code
//        of Nomenclature for algae, fungi, and plants (Shenzhen 2018): rank markers, author connectors, qualifiers, family-group
//        suffix tables, the year window. Entries carry TRAIN occurrence counts where they were counted.
//   notation-taxonomy-genera.json      giver: Plazi TreatmentBank TRAIN journals (gold = curators AND gnparser agreeing): a genus /
//        higher-taxon gazetteer that NOMINATES a capitalised word, with counts, the epithet and author-word vocabularies, suffix tables.
//   notation-taxonomy-refusal.json     giver: the same TRAIN text: capitalised words and lowercase words that occur in running prose
//        and never as a name part (>= floor documents). REFUSES.
//   notation-taxonomy-classifier.json  giver: the same TRAIN text: count tables (Laplace alpha) of declared feature values for
//        name candidates vs non-name bigrams/uninomials, and the decision thresholds derived on TRAIN.
//   notation-taxonomy-identity.json    giver: TRAIN streams: per-word event rates of name evidence in taxonomic text vs strangers
//        (Poisson), the R0 threshold derived on TRAIN strangers, and the activation window measured by dmdWindow on TRAIN names.
//
// CAUSAL. `scan` is a single left-to-right pass. Every token and every mention carries `at`, the offset of the last character that
// was consulted to decide it (an authority tail is closed by the token that follows it, so a mention is final one token late);
// `prov:true` marks decisions forced by the end of the input. The instrument checks prefix-stability: for every cut,
// the non-provisional items (!prov) of scan(prefix) with at < cut are exactly the non-provisional items of scan(full) with at < cut, in BOTH directions (no revision, and
// no lookahead promotion: an item the full scan has early because of text the prefix has not seen; instrument Amendment 2).
//
// CASING is ONE witness (a capitalised genus word, lowercase epithet); the classifier weighs it with the epithet suffix, the genus
// gazetteer, the refusal vocabularies, the authority tail and the cast, and the instrument ablates it (case-blind arm).
//
// TYPED GAPS (never silent): prior_missing:<name>, abbrev_unresolved, abbrev_ambiguous, hybrid_formula_unread, epithet_only_unread,
// icnp_bacteria_unmeasured, higher_classification_is_world_knowledge.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createActivation } from "../../kernel/activation.js";

export const FAMILY = "taxonomy";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIORS_DIR = path.resolve(HERE, "../../priors");
export const PRIOR_FILES = Object.freeze({
  lexicon: "notation-taxonomy-lexicon.json",
  genera: "notation-taxonomy-genera.json",
  refusal: "notation-taxonomy-refusal.json",
  classifier: "notation-taxonomy-classifier.json",
  identity: "notation-taxonomy-identity.json",
});
export const NAME_CLASSES = Object.freeze(["genus", "subgenus", "epithet", "infra", "uninomial", "rank", "author", "year", "marker", "hybrid"]);
export const CAN_NAME = Object.freeze(new Set(["genus", "subgenus", "epithet", "infra", "uninomial"]));
export const TYPED_GAPS = Object.freeze(["abbrev_unresolved", "abbrev_ambiguous", "hybrid_formula_unread", "epithet_only_unread", "icnp_bacteria_unmeasured", "higher_classification_is_world_knowledge"]);
const ALPHA = 1; // Laplace smoothing of every count table (declared)
export const LOOKAHEAD = 10; // a decision may consult up to this many tokens beyond the one it is attached to: `at` is stamped that far ahead (declared)
const PROV_MARGIN = LOOKAHEAD + 2; // the last tokens of an input are provisional: an undecided dot at the end can merge two tokens, shifting every token index by one (declared)

// ── priors ───────────────────────────────────────────────────────────────────────────────
/** loadPriors({dir}) -> { lexicon, genera, refusal, classifier, identity, gaps, ok }. A missing file is a typed gap, never a throw. */
export function loadPriors({ dir = PRIORS_DIR } = {}) {
  const out = { lexicon: null, genera: null, refusal: null, classifier: null, identity: null, gaps: [], dir };
  for (const [k, f] of Object.entries(PRIOR_FILES)) {
    try { out[k] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch { out.gaps.push({ reason: `prior_missing:${k}`, file: f }); }
  }
  out.ok = out.gaps.length === 0;
  return out;
}

const _compiled = new WeakMap();
/** compilePriors(priors) -> compiled sets/maps (cached by identity). `priors` may be the object loadPriors returns, or an already compiled object. */
export function compilePriors(priors) {
  if (priors && priors.__compiled) return priors;
  if (!priors) return emptyCompiled(["prior_missing:all"]);
  if (_compiled.has(priors)) return _compiled.get(priors);
  const c = emptyCompiled((priors.gaps ?? []).map((g) => g.reason));
  const lx = priors.lexicon;
  if (lx) {
    for (const [w, v] of Object.entries(lx.rank_markers ?? {})) c.rankMarkers.set(w, v.rank ?? v);
    for (const w of Object.keys(lx.qualifiers ?? {})) c.qualifiers.add(w);
    for (const w of Object.keys(lx.dot_words ?? {})) c.dotWords.add(w);
    for (const [w, v] of Object.entries(lx.rank_words ?? {})) c.rankWords.set(w, v.class ?? v);
    c.year = lx.year_window ?? c.year;
    c.suffixes = (lx.family_suffixes?.rows ?? []).map((r) => ({ suffix: r.suffix, code: r.code, rank: r.rank })).sort((a, b) => b.suffix.length - a.suffix.length);
    for (const w of Object.keys(lx.author_particles ?? {})) c.particles.add(w);
    for (const w of Object.keys(lx.author_connectors ?? {})) c.authorConnectors.add(w);
    for (const w of Object.keys(lx.author_abbrev ?? {})) c.authorAbbrev.add(w);
  } else c.gaps.push("prior_missing:lexicon");
  const gz = priors.genera;
  if (gz) {
    for (const [w, v] of Object.entries(gz.names ?? {})) { c.gaz.set(w, v); if (/^\p{Lu}/u.test(w)) c.gazLower.set(w.toLowerCase(), w); }
    for (const w of Object.keys(gz.epithets ?? {})) c.epithets.add(w);
    for (const w of Object.keys(gz.author_words ?? {})) c.authorWords.add(w);
    c.sufG = gz.suffix_genus ?? []; c.sufE = gz.suffix_epithet ?? []; c.sufU = gz.suffix_uninomial ?? []; c.prevWords = new Set(gz.prev_words ?? []);
  } else c.gaps.push("prior_missing:genera");
  const rf = priors.refusal;
  if (rf) {
    c.refuseCap = new Set(Object.keys(rf.cap_refuse ?? {}));
    c.refuseLow = new Set(Object.keys(rf.low_stop ?? {}));
  } else c.gaps.push("prior_missing:refusal");
  const cl = priors.classifier;
  if (cl) { c.nb = { binom: cl.binom, uni: cl.uni, kind: cl.kind }; c.theta = cl.theta ?? {}; c.params = cl.params ?? {}; }
  else c.gaps.push("prior_missing:classifier");
  c.identity = priors.identity ?? null;
  if (!c.identity) c.gaps.push("prior_missing:identity");
  c.ok = c.gaps.length === 0;
  _compiled.set(priors, c);
  return c;
}
function emptyCompiled(gaps) {
  return { __compiled: true, gaps: [...gaps], ok: false, rankMarkers: new Map(), qualifiers: new Set(), dotWords: new Set(), rankWords: new Map(), year: { min: 1753, max: 2027 },
    suffixes: [], particles: new Set(), authorAbbrev: new Set(), authorConnectors: new Set(), gaz: new Map(), gazLower: new Map(), epithets: new Set(), authorWords: new Set(), sufG: [], sufE: [], sufU: [],
    prevWords: new Set(), refuseCap: new Set(), refuseLow: new Set(), nb: null, theta: {}, params: {}, identity: null };
}

// ── NB scoring (counts -> log-likelihood ratio, pos vs neg) ────────────────────────────
/** llr(table, feats) -> { score, parts }. table = { prior:{pos,neg}, f:{ name:{ K, v:{ value:[pos,neg] } } } }. */
export function llr(tab, feats) {
  if (!tab) return { score: 0, parts: {} };
  const P = tab.prior.pos, N = tab.prior.neg;
  let s = Math.log((P + ALPHA) / (N + ALPHA));
  const parts = {};
  for (const [k, v] of Object.entries(feats)) {
    const row = tab.f[k];
    if (!row) continue;
    const e = row.v[v];
    if (!e) continue; // a value unseen in TRAIN contributes 0 (declared)
    const d = Math.log((e[0] + ALPHA) / (P + ALPHA * row.K)) - Math.log((e[1] + ALPHA) / (N + ALPHA * row.K));
    parts[k] = d; s += d;
  }
  return { score: s, parts };
}

// ── lexer ────────────────────────────────────────────────────────────────────────────────
const RE_WORD = /[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*/uy;
const RE_NUM = /\d+/y;
const RE_YEARLET = /[a-z](?![\p{L}])/uy;
export function shapeOf(w) {
  if (/^\p{Lu}$/u.test(w)) return "init";
  const letters = w.replace(/[-'’\p{M}]/gu, "");
  if (letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return "caps";
  if (w === w.toLowerCase()) return "low";
  if (/^\p{Lu}[\p{Ll}\p{M}]+(?:[-'’]\p{Lu}?[\p{Ll}\p{M}]+)*$/u.test(w)) return "cap";
  if (/^\p{Lu}/u.test(w)) return "mix";
  return "other";
}
/**
 * lex(text, c) -> tokens [{s,e,t,shape,nl,at}]. shape: init cap caps mix low num year punct other. A word's trailing '.' belongs to
 * the token when the word is an initial, a lexicon abbreviation or a TRAIN-attested author abbreviation, when a letter follows the dot
 * directly (N.E.Br.), or when the dot is followed by a cue only an abbreviation can precede (a digit, '(' , ',' , '&', ')', ex, in);
 * `at` then points at the cue character (the decision consulted it).
 */
export function lex(text, c = emptyCompiled([])) {
  const toks = [];
  const n = text.length;
  let i = 0, nl = false;
  const ymin = c.year.min, ymax = c.year.max;
  while (i < n) {
    const ch = text[i];
    if (ch === "\n") { nl = true; i++; continue; }
    if (/\s/u.test(ch)) { i++; continue; }
    // emphasis marks (*italic*, _italic_) are typography, not text: transparent to the lexer (an underscore inside a word is not emphasis)
    if (ch === "*" || (ch === "_" && !(/[\p{L}]/u.test(text[i - 1] ?? "") && /[\p{L}]/u.test(text[i + 1] ?? "")))) { i++; continue; }
    RE_WORD.lastIndex = i;
    let m = RE_WORD.exec(text);
    if (m) {
      let e = i + m[0].length;
      let w = m[0];
      let at = e;                                   // the character that ended the word was read (EOF = n: the end is not yet decidable)
      const shape0 = shapeOf(w);
      if (text[e] === ".") {
        const lw = w.toLowerCase();
        let attach = false;
        at = Math.min(n, e + 1);                    // the dot and the character after it are consulted
        if (shape0 === "init") attach = true;
        else if (c.dotWords.has(lw) || c.authorAbbrev.has(w + ".")) attach = true;
        else if (/[\p{L}]/u.test(text[e + 1] ?? "")) attach = true;
        else if (shape0 === "cap" || shape0 === "mix") {
          let k = e + 1;
          while (k < n && (text[k] === " " || text[k] === "\t")) k++;
          at = Math.max(at, Math.min(n, k + 1));
          if (k < n) {
            const cue = text[k];
            if (/[\d(),&)\]]/.test(cue)) attach = true;
            else if ((text.startsWith("ex", k) || text.startsWith("in", k)) && !/[\p{L}]/u.test(text[k + 2] ?? "x")) { attach = true; at = Math.max(at, Math.min(n, k + 3)); }
            else if (k + 2 > n && /^[ei]$/.test(cue)) at = n;     // "Hoffm. e" at the end of the input: ex / in not yet decidable
          }
        }
        if (attach) { e += 1; w = text.slice(i, e); }
      }
      toks.push({ s: i, e, t: w, shape: shapeOf(w.replace(/\.$/, "")), nl, at });
      nl = false; i = e; continue;
    }
    RE_NUM.lastIndex = i;
    m = RE_NUM.exec(text);
    if (m) {
      let e = i + m[0].length, shape = "num";
      const v = Number(m[0]);
      let at = e;
      if (m[0].length === 4 && v >= ymin && v <= ymax) {
        shape = "year";
        RE_YEARLET.lastIndex = e;
        const ml = RE_YEARLET.exec(text);
        at = Math.min(n, e + 2);
        if (ml) e += 1;
      }
      toks.push({ s: i, e, t: text.slice(i, e), shape, nl, at });
      nl = false; i = e; continue;
    }
    toks.push({ s: i, e: i + 1, t: ch, shape: "punct", nl, at: i });
    nl = false; i++;
  }
  return toks;
}

// ── suffix buckets, small helpers ──────────────────────────────────────────────────────
export function sufBucket(word, table) {
  const w = word.toLowerCase().replace(/\.$/, "");
  for (const s of table) if (w.length > s.length && w.endsWith(s)) return s;
  return "other";
}
const lenBucket = (n) => (n <= 3 ? "<=3" : n <= 5 ? "4-5" : n <= 8 ? "6-8" : n <= 12 ? "9-12" : "13+");
/** lower-case a text without changing its length (offsets stay valid): a character whose lower-case form has another length is kept. */
export function lowerSafe(text) {
  let out = "";
  for (const ch of text) { const l = ch.toLowerCase(); out += l.length === ch.length ? l : ch; }
  return out;
}
export function akey(s) { return s.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}]/gu, "").toLowerCase(); }

/** an abbreviation stands for a genus when its first letter is the genus's and its other letters follow in order ("Ud." = Uvariodendron). */
function isAbbrevOf(abbr, genus) {
  if (!abbr || abbr[0] !== genus[0]) return false;
  let k = 0;
  for (let q = 0; q < genus.length && k < abbr.length; q++) if (genus[q] === abbr[k]) k++;
  return k === abbr.length;
}
// ── cast: identity persists, presence fades (kernel activation) ───────────────────────────
class Cast {
  constructor(window) {
    this.genera = new Map();   // genus -> { n, last }   identity: never forgotten
    this.pairs = new Set();    // "Genus epithet"
    this.lower = new Map();    // lower-case form -> genus (identity read back when the casing is gone)
    this.act = createActivation({ window: window ?? null }); // presence: decays with the measured window
    this.tick = 0;
  }
  observe(genus, pair) {
    this.tick++;
    const g = this.genera.get(genus);
    if (g) { g.n++; g.last = this.tick; } else this.genera.set(genus, { n: 1, last: this.tick });
    if (pair) this.pairs.add(pair);
    this.lower.set(genus.toLowerCase(), genus);
    this.act.observe([genus]);
  }
  lowerOf(w) { return this.lower.get(w) ?? null; }
  resolveInitial(letter) {
    const l = letter.toLowerCase();
    const cands = [];
    for (const [g, v] of this.genera) if (isAbbrevOf(l, g.toLowerCase())) cands.push({ g, a: this.act.activationOf(g), last: v.last });
    cands.sort((x, y) => y.a - x.a || y.last - x.last);
    return { genus: cands[0]?.g ?? null, n: cands.length };
  }
}

// ── authority tail ───────────────────────────────────────────────────────────────────────
const isAuthorShape = (t) => !!t && (t.shape === "cap" || t.shape === "caps" || t.shape === "mix" || t.shape === "init");
function epithetWord(t, c) {
  if (!t || t.shape !== "low" || t.nl) return false;
  const w = t.t;
  if (w.length < 2 || /[.']$/.test(w) || /[-]$/.test(w)) return false;
  const lw = w.toLowerCase();
  // the refusal vocabulary VETOES an epithet slot (REFUSE, never admit). A softer variant (the vocabulary as a feature only, so "carina", "radius", "aster" can be
  // epithets) was tried after run 1 and made dev WORSE (binomial F1 0.953 -> 0.935): reverted, recorded in the instrument header (Amendment 2).
  if (c.refuseLow.has(w) && !c.epithets.has(w)) return false;
  if (c.particles.has(lw) || c.qualifiers.has(lw) || c.authorConnectors.has(lw) || c.rankMarkers.has(lw.replace(/\.$/, "")) || lw === "ex" || lw === "in" || lw === "non" || lw === "nec") return false;
  return true;
}
function startsName(T, j, c) {
  const a = T[j], b = T[j + 1];
  // a capitalised word with a dot is an author abbreviation ("Schult. grows"), never the genus of a new name; a bare initial with a dot is an abbreviated genus
  return !!a && !!b && ((a.shape === "cap" && !/\.$/.test(a.t)) || a.shape === "init") && !b.nl && epithetWord(b, c);
}
function authorWordOk(t, c, T, i) {
  if (!isAuthorShape(t)) return false;
  if (t.shape === "init") return true;
  const w = t.t.replace(/\.$/, "");
  if (c.authorWords.has(w)) return true;
  if (c.refuseCap.has(w)) return yearAhead(T, i, c);   // a word that recurs as non-name is an author only when a year anchors the authority ("Kerr, 1792")
  if (t.shape === "caps") return yearAhead(T, i, c);   // an ALL-CAPS word is an author in the old style ("WALKER, 1871"); without a year it is a code ("BOR/MOL")
  return true;
}
/** is a year written within the next few author-like tokens ("Kerr, 1792", "Smith & Jones, 1999")? */
function yearAhead(T, i, c) {
  for (let k = i + 1, n = 0; T[k] && !T[k].nl && n < 7; k++, n++) {
    const x = T[k];
    if (x.shape === "year") return true;
    if (isAuthorShape(x) || x.t === "," || x.t === "&" || x.t === "." || (x.shape === "low" && (c.particles.has(x.t.toLowerCase()) || c.authorConnectors.has(x.t.toLowerCase())))) continue;
    return false;
  }
  return false;
}
/** after ", Jones" an authority list goes on only when a connector, a comma, a year or a closing parenthesis follows the next author unit. */
function listContinues(T, j, c) {
  let k = j, n = 0;
  while (T[k] && !T[k].nl && (isAuthorShape(T[k]) || (T[k].shape === "low" && c.particles.has(T[k].t.toLowerCase())))) { k++; if (++n > 5) break; }
  const f = T[k];
  if (!f || f.nl) return false;
  return f.t === "&" || f.t === "," || f.shape === "year" || f.t === ")" || (f.shape === "low" && c.authorConnectors.has(f.t.toLowerCase()));
}
/**
 * parseAuthority(T, k, c) -> { any, end, stop, words:[{i,cls}], groups:[{label,key}], year, paren, closed }
 * Reads from token k: an optional '(' , authors (initials and particles joined) separated by & / et / and / und / y / e / ', ',
 * a year, ex / in groups, ')' and then combination authors. It stops at the first token that cannot continue an authority: a lowercase
 * word that is neither a particle nor a connector, a line break, ; : . and the start of another binomial. `end` is the index after the
 * last consumed word or closing parenthesis; `stop` is the token that closed the tail (T.length at the end of the input).
 */
export function parseAuthority(T, k, c) {
  const words = [], groups = [];
  let i = k, inParen = false, closed = false, afterParen = false, year = null, any = false, cur = null, label = "authored_by", yearSeen = false;
  let lastUsed = k - 1;
  const flush = () => { if (cur && cur.parts.length) { groups.push({ label, key: akey(cur.parts.join("")) }); } cur = null; };
  if (T[i] && T[i].t === "(" && !T[i].nl && T[i + 1] && !T[i + 1].nl && (isAuthorShape(T[i + 1]) || T[i + 1].shape === "year")) { inParen = true; i++; }
  while (i < T.length) {
    const t = T[i];
    if (t.nl) break;
    if (t.shape === "year") {
      if (yearSeen && !inParen) break;
      if (!year) year = t.t.slice(0, 4);
      words.push({ i, cls: "year" }); any = true; flush(); yearSeen = true; lastUsed = i; i++; continue;
    }
    if (isAuthorShape(t)) {
      if (t.shape === "init" && !/\.$/.test(t.t)) break;      // a bare capital is a figure label (A-H), not an author initial
      if (t.shape !== "init" && !authorWordOk(t, c, T, i)) break;
      if (startsName(T, i, c) && (!cur || t.shape === "cap")) break; // another name begins here
      if (!cur) {
        if (yearSeen && !afterParen) break;                    // "Smith 1999 Jones": the tail ended at the year
      }
      if (!cur) cur = { parts: [] };
      cur.parts.push(t.t); words.push({ i, cls: "author" }); any = true; lastUsed = i; i++; continue;
    }
    if (t.shape === "low") {
      const lw = t.t.toLowerCase().replace(/\.$/, "");
      if (c.particles.has(lw) && isAuthorShape(T[i + 1]) && !T[i + 1].nl && (cur || yearAhead(T, i, c))) { if (!cur) cur = { parts: [] }; cur.parts.push(t.t); words.push({ i, cls: "author" }); any = true; lastUsed = i; i++; continue; }
      if (any && (lw === "ex" || lw === "in") && !/\.$/.test(t.t)) { flush(); label = lw === "ex" ? "ex_author" : "in_author"; words.push({ i, cls: "connector" }); yearSeen = false; i++; continue; }
      if (any && cur && c.authorConnectors.has(lw) && isAuthorShape(T[i + 1]) && !T[i + 1].nl) { flush(); words.push({ i, cls: "connector" }); i++; continue; }
      if (cur && lw === "al" && /\.$/.test(t.t)) { cur.parts.push("al"); words.push({ i, cls: "author" }); lastUsed = i; i++; continue; }
      break;
    }
    if (t.t === "&" && any && cur && isAuthorShape(T[i + 1]) && !T[i + 1].nl) { flush(); words.push({ i, cls: "connector" }); i++; continue; }
    if (t.t === "," && any) {
      const nx = T[i + 1];
      if (nx && !nx.nl && (nx.shape === "year" || (cur && isAuthorShape(nx) && !startsName(T, i + 1, c) && listContinues(T, i + 1, c)))) { flush(); i++; continue; }
      break;
    }
    if (t.t === ")" && inParen) { flush(); closed = true; inParen = false; afterParen = true; label = "recombined_by"; yearSeen = false; lastUsed = i; i++; continue; }
    break;
  }
  flush();
  // drop trailing connectors (an ex / & with nothing after it is not part of the tail)
  while (words.length && words[words.length - 1].cls === "connector") words.pop();
  const lastW = words.length ? words[words.length - 1].i : k - 1;
  const end = Math.max(lastW, closed ? lastUsed : lastW) + 1;
  return { any: words.length > 0, end: words.length ? end : k, stop: i, words, groups, year, paren: inParen || closed, closed };
}

// ── candidates ────────────────────────────────────────────────────────────────────────────
function prevKey(T, i, c) {
  if (i === 0 || T[i].nl) return "BOL";
  const p = T[i - 1];
  if (p.t === "." || p.t === "?" || p.t === "!") return "SENT";
  if (p.t === "(" || p.t === "[") return "(";
  if (p.t === ",") return ",";
  if (p.t === ";") return ";";
  if (p.t === ":") return ":";
  if (p.shape === "low") { const lw = p.t.toLowerCase(); return c.prevWords.has(lw) ? lw : "low"; }
  if (p.shape === "cap" || p.shape === "caps" || p.shape === "mix") return "cap";
  if (p.shape === "year" || p.shape === "num") return "num";
  return "other";
}
/** the rank word written just before a name ("genus Puma", "family: Felidae", "Gen. nov."?): returns its class (genus/family/order/class) or null. */
function rankCue(T, i, c) {
  if (i === 0 || T[i].nl) return null;
  let k = i - 1;
  if ((T[k].t === ":" || T[k].t === ".") && k > 0 && !T[k].nl) k--;
  const w = T[k].t.toLowerCase().replace(/\.$/, "");
  return c.rankWords.get(w) ?? null;
}
/** how specimen-data-like the 8 tokens before the candidate are: digits and commas (locality lists) vs prose. */
function ctxKeys(T, i) {
  let nn = 0, cc = 0;
  for (let k = Math.max(0, i - 8); k < i; k++) { if (T[k].shape === "num" || T[k].shape === "year") nn++; else if (T[k].t === ",") cc++; }
  const b = (n) => (n === 0 ? "0" : n <= 2 ? "1-2" : "3+");
  return { ctx_n: b(nn), ctx_c: b(cc) };
}
function tailKey(a) {
  if (!a || !a.any) return "none";
  const hasAuth = a.words.some((w) => w.cls === "author");
  if (a.paren && a.year) return "paren_auth_year";
  if (a.paren && hasAuth) return "paren_auth";
  if (hasAuth && a.year) return "auth_year";
  if (hasAuth) return "auth";
  return a.year ? "year" : "none";
}
function nextKey(T, j, c) {
  const n = T[j];
  if (!n) return "eof";
  if (n.nl) return "eol";
  if (n.shape === "low") return c && c.qualifiers.has(n.t.toLowerCase()) ? "qual" : "low";
  if (n.shape === "cap" || n.shape === "mix" || n.shape === "caps" || n.shape === "init") return "cap";
  if (n.shape === "num" || n.shape === "year") return "num";
  return [",", ".", ";", ")", ":"].includes(n.t) ? n.t : "punct";
}

function dotTok(T, i) { return !!T[i + 1] && T[i + 1].t === "." && T[i + 1].s === T[i].e; }
function tryBinomial(T, i, c, cast) {
  const g = T[i];
  let mode = null, canon = null;
  if (g.shape === "cap" && g.t.length >= 3) mode = "cap";
  else if (g.shape === "init") mode = "init";
  if (g.shape === "cap" && g.t.length <= 3 && dotTok(T, i) && T[i + 2] && !T[i + 2].nl && epithetWord(T[i + 2], c)) mode = "dotted"; // "Ud. gorgonis"
  else if (g.shape === "low") {
    // casing is ONE witness: a lower-case word is a genus slot when the gazetteer or the cast says it is a known genus (or, written 'p.', an initial of one)
    if (dotTok(T, i) && g.t.length <= 3 && T[i + 2] && !T[i + 2].nl && epithetWord(T[i + 2], c) && cast.resolveInitial(g.t).n > 0) mode = "ldotted";
    else if (T[i + 1] && !T[i + 1].nl && epithetWord(T[i + 1], c) && g.t.length >= 3) { canon = c.gazLower.get(g.t) ?? cast.lowerOf(g.t); if (canon) mode = "lower"; }
  }
  if (!mode) return null;
  const abbrev = mode === "init" || mode === "dotted" || mode === "ldotted";
  const lower = mode === "lower" || mode === "ldotted";
  let j = i + (mode === "dotted" || mode === "ldotted" ? 2 : 1);
  let sub = null, marker = null;
  if (!abbrev && T[j] && T[j].t === "(" && !T[j].nl && T[j + 1] && (T[j + 1].shape === "cap" || (lower && T[j + 1].shape === "low")) && T[j + 2] && T[j + 2].t === ")" ) { sub = j + 1; j += 3; }
  if (T[j] && T[j].shape === "low" && !T[j].nl && c.qualifiers.has(T[j].t.toLowerCase()) && T[j + 1] && !T[j + 1].nl) { marker = j; j++; }
  if (!epithetWord(T[j], c)) return null;
  const e1 = j;
  j++;
  let infra = null, rankIdx = null, auth1 = null, auth = null;
  const a1 = parseAuthority(T, j, c);
  const afterA1 = a1.any ? a1.end : j;
  const rk = T[afterA1];
  const rkBase = rk && rk.shape === "low" ? rk.t.toLowerCase().replace(/\.$/, "") : null;
  if (rkBase && c.rankMarkers.has(rkBase) && !rk.nl && epithetWord(T[afterA1 + 1], c)) {
    rankIdx = afterA1; infra = afterA1 + 1; auth1 = a1.any ? a1 : null;
    auth = parseAuthority(T, infra + 1, c);
  } else {
    auth = a1;
    // a trinomial without a rank marker (zoological practice): the third word must be an epithet-like word that is closed by an authority,
    // is a known epithet, or repeats the species epithet (tautonym); a following lowercase word means prose, so it is not taken.
    const t3 = T[j];
    if (!a1.any && t3 && epithetWord(t3, c)) {
      const a3 = parseAuthority(T, j + 1, c);
      const follows = T[j + 1];
      const proseNext = !a3.any && follows && !follows.nl && follows.shape === "low"; // an authority closes the name; without one, a lower-case word after it means prose
      if (a3.any || (!proseNext && (c.epithets.has(t3.t) || t3.t === T[e1].t))) { infra = j; auth = a3; }
    }
  }
  const fin = auth && auth.any ? auth : null;
  const coreLast = infra ?? e1;
  const last = fin ? fin.end - 1 : coreLast;
  const stop = fin ? fin.stop : coreLast + 1;
  return { abbrev, lower, canon, mode, genusIdx: i, subIdx: sub, markerIdx: marker, epiIdx: e1, rankIdx, infraIdx: infra, auth1, auth: fin, coreFirst: i, coreLast, last, stop };
}

function binomFeatures(b, T, c, cast, opts) {
  const g = T[b.genusIdx], e = T[b.epiIdx];
  const gw = b.canon ?? g.t.replace(/\.$/, "");
  const f = { g_case: b.lower ? "low" : "cap" };
  if (b.abbrev) {
    const r = opts.noCast ? { genus: null, n: 0 } : cast.resolveInitial(gw);
    f.g_cls = "init";
    f.cast = r.n === 0 ? "n" : r.n === 1 ? "u" : "m";
    if (r.genus && cast.pairs.has(`${r.genus} ${e.t}`)) f.cast = "pair";
    b.resolvedGenus = r.genus; b.resolvedN = r.n;
  } else {
    f.g_cls = !opts.noGazetteer && c.gaz.has(gw) ? "gaz" : c.refuseCap.has(gw) ? "refuse" : (b.lower ? "cast" : "oov");
    f.g_suf = sufBucket(gw, c.sufG);
    f.cast = opts.noCast ? "none" : cast.pairs.has(`${gw} ${e.t}`) ? "pair" : cast.genera.has(gw) ? "genus" : "none";
  }
  f.e_cls = c.refuseLow.has(e.t) ? "stop" : c.epithets.has(e.t) ? "known" : "ok";
  f.e_suf = sufBucket(e.t, c.sufE);
  f.e_len = lenBucket(e.t.length);
  f.prev = prevKey(T, b.genusIdx, c);
  f.prev_cap = b.genusIdx > 0 && !g.nl && (T[b.genusIdx - 1].shape === "cap" || T[b.genusIdx - 1].shape === "caps") ? "y" : "n";
  f.tail = (b.infraIdx !== null ? "infra:" : "") + tailKey(b.auth);
  f.next = nextKey(T, b.stop, c);
  Object.assign(f, ctxKeys(T, b.genusIdx));
  f.sub = b.subIdx !== null ? "y" : "n";
  return f;
}

export function uniFeatures(u, T, i, c, cast, opts, canon = null) {
  const w = canon ?? T[i].t;
  const f = { u_case: canon ? "low" : "cap" };
  f.u_cls = !opts.noGazetteer && c.gaz.has(w) ? "gaz" : c.refuseCap.has(w) ? "refuse" : (canon ? "cast" : "oov");
  const lw = w.toLowerCase();
  const code = c.suffixes.find((s) => lw.endsWith(s.suffix) && lw.length > s.suffix.length + 1);
  f.u_suf = code ? "code:" + code.suffix : sufBucket(w, c.sufU);
  f.u_len = lenBucket(w.length);
  const pk = prevKey(T, i, c);
  const rc0 = rankCue(T, i, c);
  f.prev = rc0 ? "rank:" + rc0 : pk;
  f.tail = tailKey(u.auth);
  f.cast = opts.noCast ? "none" : cast.genera.has(w) ? "genus" : "none";
  f.next = nextKey(T, u.stop, c);
  Object.assign(f, ctxKeys(T, i));
  f.pos = i === 0 || T[i].nl ? "BOL" : pk === "SENT" ? "SENT" : "mid";
  return f;
}

export function kindFeatures(w, T, i, c) {
  const lw = w.toLowerCase();
  const code = c.suffixes.find((s) => lw.endsWith(s.suffix) && lw.length > s.suffix.length + 1);
  const g = c.gaz.get(w);
  const rc = rankCue(T, i, c) ?? "none";
  return {
    code: code ? "code:" + code.suffix : "none",
    suf: sufBucket(w, c.sufU),
    gaz_kind: g ? (g.genus > 0 && g.higher > 0 ? "both" : g.higher > 0 ? "higher" : "genus") : "none",
    cue: rc,
  };
}

function relFromAuth(a, id, push) {
  if (!a) return;
  for (const g of a.groups) if (g.key) push({ end1: id, label: g.label, end2: g.key });
  if (a.year) push({ end1: id, label: "year_of", end2: a.year });
}

function setAuthorClasses(a, cls) {
  if (!a) return;
  for (const w of a.words) cls[w.i] = w.cls;
}

/**
 * scan(text, priors, opts) -> { tokens, mentions, gaps, candidates? }
 * opts.oracle(cand) -> boolean | undefined : training only; overrides the decision (teacher forcing).
 * opts.collect : keep every candidate with its feature vector (training only).
 * Ablations: noCase (text lower-cased before the lexer), noGazetteer, noCast, noDecay, noClassifier.
 */
export function scan(text, priors, opts = {}) {
  const c = compilePriors(priors);
  const src = opts.noCase ? lowerSafe(text) : text;
  const T = lex(src, c);
  const gaps = new Map();
  const gap = (r, n = 1) => gaps.set(r, (gaps.get(r) ?? 0) + n);
  for (const g of c.gaps) gap(g, 1);
  const win = opts.noDecay ? null : (c.identity?.activation?.window ?? null);
  const cast = new Cast(win);
  const mentions = [];
  const cands = opts.collect ? [] : null;
  const cls = new Array(T.length).fill("other");
  const used = new Array(T.length).fill(false);
  const nb = c.nb;
  const eof = T.length;
  const reach = (idx) => (eof ? Math.max(T[Math.min(eof - 1, idx)].at, T[Math.min(eof - 1, idx)].e - 1) : 0);
  const finalise = (m, stopIdx) => { m.prov = stopIdx + PROV_MARGIN >= eof; m.at = reach(stopIdx + LOOKAHEAD); };
  let hybrids = 0;

  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === "×") hybrids++;
    if (used[i]) continue;
    const capLike = t.shape === "cap" || t.shape === "init";
    const lowLike = t.shape === "low" && (c.gazLower.has(t.t) || cast.lowerOf(t.t) || (t.t.length <= 3 && T[i + 1] && T[i + 1].t === "." && T[i + 1].s === t.e));
    if (!capLike && !lowLike) continue;
    let admitted = false;
    const b = tryBinomial(T, i, c, cast);
    if (b) {
      const feats = binomFeatures(b, T, c, cast, opts);
      const sc = nb && !opts.noClassifier ? llr(nb.binom, feats) : { score: -Infinity, parts: {} };
      let ok = sc.score >= (c.theta.binom ?? 0);
      const core = [T[b.coreFirst].s, T[b.coreLast].e];
      if (opts.oracle) { const o = opts.oracle({ type: "binom", core, abbrev: b.abbrev }); if (typeof o === "boolean") ok = o; }
      if (cands) cands.push({ type: "binom", core, feats, score: sc.score, accepted: ok, abbrev: b.abbrev });
      if (ok) {
        commitBinom(b, T, cast, cls, used, mentions, finalise, gap, sc.score, feats);
        i = b.last; admitted = true;
      }
    }
    if (admitted) continue;
    // uninomial: a capitalised word, or (casing gone) a lower-case word the gazetteer or the cast knows as a name
    let canon = null;
    if (t.shape === "cap" && t.t.length >= 3) canon = null;
    else if (t.shape === "low" && t.t.length >= 3) { canon = c.gazLower.get(t.t) ?? cast.lowerOf(t.t); if (!canon) continue; }
    else continue;
    const a = parseAuthority(T, i + 1, c);
    const u = { auth: a.any ? a : null, last: a.any ? a.end - 1 : i, stop: a.any ? a.stop : i + 1, canon };
    const feats = uniFeatures(u, T, i, c, cast, opts, canon);
    const sc = nb && !opts.noClassifier ? llr(nb.uni, feats) : { score: -Infinity, parts: {} };
    let ok = sc.score >= (c.theta.uni ?? 0);
    const core = [t.s, t.e];
    if (opts.oracle) { const o = opts.oracle({ type: "uni", core }); if (typeof o === "boolean") ok = o; }
    if (cands) cands.push({ type: "uni", core, feats, score: sc.score, accepted: ok });
    if (ok) {
      commitUni(u, T, i, c, cast, cls, used, mentions, finalise, sc.score, feats, nb, opts);
      i = u.last;
    }
  }
  if (hybrids) gap("hybrid_formula_unread", hybrids);
  const tokAt = T.map((t, k) => Math.max(t.at, reach(k + LOOKAHEAD)));
  const tokProv = T.map((t, k) => k + PROV_MARGIN >= eof || t.at >= src.length - 1);
  for (const m of mentions) for (let k = m.tok[0]; k <= Math.min(T.length - 1, m.tok[1]); k++) { tokAt[k] = Math.max(tokAt[k], m.at); if (m.prov) tokProv[k] = true; }
  const tokens = T.map((t, k) => ({ s: t.s, e: t.e, t: t.t, cls: cls[k], at: tokAt[k], prov: tokProv[k], canName: CAN_NAME.has(cls[k]) }));
  const out = { tokens, mentions, gaps: [...gaps].map(([reason, count]) => ({ reason, count })), cast: { genera: cast.genera.size } };
  if (cands) out.candidates = cands;
  return out;
}

function commitBinom(b, T, cast, cls, used, mentions, finalise, gap, score, feats) {
  const g = T[b.genusIdx], e = T[b.epiIdx];
  const gw = b.canon ?? g.t.replace(/\.$/, "");
  let genus = gw, resolved = true;
  if (b.abbrev) {
    if (b.resolvedGenus) { genus = b.resolvedGenus; if (b.resolvedN > 1) gap("abbrev_ambiguous"); }
    else { genus = gw + "."; resolved = false; gap("abbrev_unresolved"); }
  }
  cls[b.genusIdx] = "genus";
  if (b.subIdx !== null) cls[b.subIdx] = "subgenus";
  if (b.markerIdx !== null) cls[b.markerIdx] = "marker";
  cls[b.epiIdx] = "epithet";
  let id = `${genus} ${e.t}`;
  if (b.infraIdx !== null) {
    if (b.rankIdx !== null) cls[b.rankIdx] = "rank";
    cls[b.infraIdx] = "infra";
    id = `${id} ${T[b.infraIdx].t}`;
  }
  setAuthorClasses(b.auth1, cls); setAuthorClasses(b.auth, cls);
  for (let k = b.coreFirst; k <= b.last; k++) used[k] = true;
  const kind = b.infraIdx !== null ? "infraspecific" : "species";
  const m = { id, kind, span: [T[b.coreFirst].s, T[b.coreLast].e], mention: [T[b.coreFirst].s, T[b.last].e], resolved, abbrev: b.abbrev, score, rel: [], tail: tailKey(b.auth), tok: [b.coreFirst, b.last] };
  finalise(m, b.stop);
  const parts = id.split(" ");
  const rels = [];
  if (resolved) {
    rels.push({ end1: parts[0], label: "genus_of", end2: kind === "species" ? id : parts.slice(0, 2).join(" ") });
    if (kind === "infraspecific") rels.push({ end1: parts.slice(0, 2).join(" "), label: "species_of", end2: id });
  }
  relFromAuth(b.auth, id, (r) => rels.push(r));
  m.rel = rels.map((r) => Object.assign(r, { at: m.at }));
  mentions.push(m);
  if (resolved) cast.observe(parts[0], parts.slice(0, 2).join(" "));
}

function commitUni(u, T, i, c, cast, cls, used, mentions, finalise, score, feats, nb, opts) {
  const w = u.canon ?? T[i].t;
  cls[i] = "uninomial";
  setAuthorClasses(u.auth, cls);
  for (let k = i; k <= u.last; k++) used[k] = true;
  const kf = kindFeatures(w, T, i, c);
  const ks = nb && nb.kind ? llr(nb.kind, kf).score : 0;
  const kind = ks >= (c.theta.kind ?? 0) ? "higher" : "genus";
  const m = { id: w, kind, span: [T[i].s, T[i].e], mention: [T[i].s, T[u.last].e], resolved: true, abbrev: false, score, rel: [], tail: tailKey(u.auth), tok: [i, u.last] };
  finalise(m, u.stop);
  const rels = [];
  relFromAuth(u.auth, w, (r) => rels.push(r));
  m.rel = rels.map((r) => Object.assign(r, { at: m.at }));
  mentions.push(m);
  if (kind === "genus" && !opts.noCast) cast.observe(w, null);
}

// ── public reading API ────────────────────────────────────────────────────────────────────
/** ear(text, priors, opts) -> tokens [{s,e,t,cls,at,canName}] (every word, number and punctuation mark, with the class the reader heard). */
export function ear(text, priors, opts = {}) { return scan(text, priors, opts).tokens; }

/**
 * read(text, priors, opts) -> { beings:[{id,kind,span,at,prov,resolved,abbrev,score}], relations:[{end1,label,end2,at}], tokens, gaps }
 * Beings are MENTION-level (one per name written); the instrument folds them to entities by id. Relations: genus_of, species_of,
 * authored_by, recombined_by, ex_author, in_author, year_of (author ends are letter-only lower-case keys).
 */
export function read(text, priors, opts = {}) {
  const r = scan(text, priors, opts);
  const beings = r.mentions.map((m) => ({ id: m.id, kind: m.kind, span: m.span, mention: m.mention, at: m.at, prov: m.prov, resolved: m.resolved, abbrev: m.abbrev, score: m.score, tail: m.tail }));
  const relations = [];
  for (const m of r.mentions) for (const x of m.rel) relations.push({ end1: x.end1, label: x.label, end2: x.end2, at: x.at, prov: m.prov, span: m.span });
  const gaps = r.gaps.slice();
  gaps.push({ reason: "higher_classification_is_world_knowledge", count: 0 });
  return { beings, relations, tokens: r.tokens, gaps };
}

// ── R0: identify the system from content alone (causal; identity latches, presence is reported) ─────────
export const EVENT_TYPES = Object.freeze(["ay", "pa", "rk", "ab", "bn", "ua", "hi", "un"]);
/** events(mentions, c) -> [{at, type}] : the evidence a stream gives that it is taxonomic nomenclature. */
export function eventsOf(mentions, c) {
  const ev = [];
  for (const m of mentions) {
    let type;
    if (m.kind === "species" || m.kind === "infraspecific") {
      if (m.tail === "auth_year") type = "ay";
      else if (m.tail === "paren_auth_year" || m.tail === "paren_auth") type = "pa";
      else if (m.tail.startsWith("infra:")) type = "rk";
      else if (m.abbrev && m.resolved) type = "ab";
      else type = "bn";
    } else if (m.tail === "auth_year" || m.tail === "auth") type = "ua";
    else if (m.kind === "higher") type = "hi";
    else type = "un";
    ev.push({ at: m.at, type, prov: !!m.prov });
  }
  return ev;
}
/**
 * identify(text, priors, {words}) -> { named, namedAtWord, llr, curve:[{word, llr}], counts, gaps }
 * The identifier is a Poisson naive-Bayes accumulator over name events (rates from TRAIN streams, threshold from TRAIN strangers):
 * llr(t) = sum_k [ n_k ln(lT_k / lF_k) - t (lT_k - lF_k) ] with t the words read so far. `named` = the verdict after the last word
 * (identity latches: once the threshold is crossed it stays crossed); the curve is evaluated at every event and at the last word.
 */
export function identify(text, priors, opts = {}) {
  const c = compilePriors(priors);
  const id = c.identity?.r0;
  const r = scan(text, c, opts);
  const gaps = r.gaps.slice();
  if (!id) return { named: null, namedAtWord: null, llr: null, curve: [], counts: {}, gaps: [...gaps, { reason: "prior_missing:identity", count: 1 }] };
  // word index of every offset: the number of whitespace-separated words that END at or before the offset
  const ends = [];
  const re = /\S+/g; let mm;
  while ((mm = re.exec(text))) ends.push(mm.index + mm[0].length);
  const W = ends.length;
  const wordAt = (off) => { let lo = 0, hi = ends.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (ends[mid] <= off + 1) lo = mid + 1; else hi = mid; } return Math.max(1, lo); };
  const ev = eventsOf(r.mentions, c).filter((e) => !(opts.final && e.prov)).sort((a, b) => a.at - b.at);
  const counts = {};
  const curve = [];
  let named = false, namedAt = null;
  const llrAt = (t) => { let s = 0; for (const k of EVENT_TYPES) { const lt = id.rates.T[k], lf = id.rates.F[k]; s += (counts[k] ?? 0) * Math.log(lt / lf) - t * (lt - lf); } return s; };
  for (const e of ev) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
    const t = Math.min(W, wordAt(e.at));
    const v = llrAt(t);
    curve.push({ word: t, llr: v });
    if (!named && v >= id.theta) { named = true; namedAt = t; }
  }
  const fin = llrAt(W);
  if (!named && fin >= id.theta) { named = true; namedAt = W; }
  return { named, namedAtWord: namedAt, llr: fin, curve, counts, words: W, theta: id.theta, gaps };
}
