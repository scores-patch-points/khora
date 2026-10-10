// build-priors.mjs — builds the RECEIVED priors of the taxonomy notation family from TRAIN only.
//
//   node eval/notation-competence/taxonomy-data/build-priors.mjs [--out priors-dir]      (default: /Users/mlacy/Documents/3.0/khora/native/priors)
//
// Inputs (TRAIN only; the dev and test splits are never opened by this file):
//   $TAXONOMY_ROOT/corpus/train.jsonl.gz   Plazi treatments as text (build_corpus.py)
//   $TAXONOMY_ROOT/gold/train.gold.jsonl.gz curators AND gnparser agreeing (build_gold.py)
//   $TAXONOMY_ROOT/corpus/foreign/train.jsonl.gz  strangers for the R0 rates and threshold (build_foreign.py)
// Outputs: priors/notation-taxonomy-{lexicon,genera,refusal,classifier,identity}.json, each naming its giver and the TRAIN counts it holds.
//
// GIVERS. lexicon: the ICZN Code (4th ed., 1999) and the ICN Shenzhen Code (2018): rank markers, rank words, family-group suffix tables,
// year window, connector words; every entry that was also counted in TRAIN carries train_count. genera / refusal / classifier / identity: the
// Plazi TRAIN journals (ZooKeys, PhytoKeys, MycoKeys, Biodiversity Data Journal), where "name" = the gold of build_gold.py.
//
// LEAKAGE CONTROL (declared). The lexical priors (gazetteer, vocabularies, refusal sets) would contain every positive the classifier is
// trained on, so a naive classifier learns "in the gazetteer => name" with certainty and meets the opposite at test time. Therefore the
// classifier tables and every threshold are fitted CROSS-SOURCE: TRAIN is cut into two folds by journal (animals+fungi | plants+mixed),
// the features of a fold's candidates are computed with lexical priors built from the OTHER fold only, and thresholds are the F1-optimal cut
// of held-out scores. The shipped lexical priors are built from all of TRAIN.
//
// CASE AUGMENTATION. Every TRAIN document is scanned twice, as written and lower-cased with the same offsets, so the count tables also hold the case-blind
// candidates (a lower-case genus slot read through the gazetteer or the cast): capitalisation is ONE witness, and the tables say how much it weighs.
//
// TWO PASSES. Pass A scans each fold teacher-forced (the gold decides what is admitted, so the cast of earlier genera is the gold's);
// pass B scans each fold reader-driven with the pass-A classifier (the cast is the reader's own, as at test time) and the shipped tables are
// the pass-B counts. Thresholds: argmax F1 over a declared grid [-8, 8] step 0.25 on the held-out scores.
//
// DECLARED CONSTANTS (P4): FLOOR = 3 documents (a word refuses only when it recurs as non-name in >= 3 documents), MINSUP = 40 occurrences
// for a suffix to become a bucket, 60 buckets per table, ALPHA = 1 (in the adapter), W = 60 words per R0 stream, FPR budget 0.01.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import * as A from "../../../adapters/notation/taxonomy.js";
import { dmdWindow } from "../../../kernel/activation.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.TAXONOMY_ROOT ?? "/private/tmp/claude-501/notation/taxonomy";
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : path.resolve(HERE, "../../../priors");
const FLOOR = 3, MINSUP = 40, NBUCKET = 60, W = 60, FPR = 0.01;
const BUILT = new Date().toISOString().slice(0, 10);
const readGz = (p) => zlib.gunzipSync(fs.readFileSync(p)).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const log = (...a) => console.error(...a);

// ── mulberry32 for seeded window offsets ──
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── static lexicon (standards tables) ──
const ICZN = "International Code of Zoological Nomenclature, 4th ed. (1999)";
const ICN = "International Code of Nomenclature for algae, fungi, and plants (Shenzhen Code, 2018)";
const RANK_MARKERS = {
  subsp: { rank: "subspecies", giver: `${ICN} Art. 4.2, 24.1; ${ICZN} Art. 45.6` }, ssp: { rank: "subspecies", giver: "abbreviation of subspecies (ICZN Art. 45.6; usage)" },
  var: { rank: "variety", giver: `${ICN} Art. 4.2` }, subvar: { rank: "subvariety", giver: `${ICN} Art. 4.2` },
  f: { rank: "form", giver: `${ICN} Art. 4.2` }, fo: { rank: "form", giver: `${ICN} Art. 4.2 (variant abbreviation)` }, forma: { rank: "form", giver: `${ICN} Art. 4.2` },
  subf: { rank: "subform", giver: `${ICN} Art. 4.2` }, morph: { rank: "morph", giver: `${ICZN} Art. 45.6.4 (infrasubspecific, not regulated)` },
  ab: { rank: "aberration", giver: `${ICZN} Art. 45.6.4 (infrasubspecific, not regulated)` }, nothosubsp: { rank: "nothosubspecies", giver: `${ICN} Art. H.3` }, nothovar: { rank: "nothovariety", giver: `${ICN} Art. H.3` },
};
const QUALIFIERS = {
  cf: "open nomenclature (Bengtson 1988): compare with", aff: "open nomenclature: affinity", sp: `${ICZN} Art. 16.1 'sp. nov.' / unidentified species`, spp: "plural of sp.",
  nov: `${ICZN} Art. 16.1; ${ICN} Art. 36.1 ('sp. nov.', 'gen. nov.', 'comb. nov.')`, n: "'n. sp.', 'n. gen.' (German/French usage of Art. 16)", gen: "genus (gen. nov.)", comb: `${ICN} Art. 6.10 'comb. nov.'`, stat: `${ICN} Art. 6.9 'stat. nov.'`,
  nom: "nomenclatural act: nom. nov., nom. nud., nom. illeg.", nud: "nomen nudum", syn: "synonym", sensu: `${ICZN} Art. 11.? / ${ICN} Art. 46.?: sensu`, auct: "auctorum", emend: `${ICZN} Art. 33.2.? emendation`, ined: "ineditus",
  non: "homonymy (non Author year)", nec: "homonymy (nec Author year)", al: "'et al.'", sect: "section", subg: "subgenus", ser: "series",
};
const RANK_WORDS = {
  genus: "genus", genera: "genus", gen: "genus", subgenus: "genus", subgen: "genus", subg: "genus", family: "family", families: "family", fam: "family", subfamily: "family", subfam: "family", superfamily: "family", tribe: "family", subtribe: "family",
  order: "order", orders: "order", suborder: "order", superorder: "order", class: "class", subclass: "class", phylum: "class", division: "class", kingdom: "class", clade: "class",
};
const FAMILY_SUFFIXES = [
  ["oidea", "iczn", "superfamily", `${ICZN} Art. 29.2`], ["idae", "iczn", "family", `${ICZN} Art. 29.2`], ["inae", "iczn", "subfamily", `${ICZN} Art. 29.2`], ["ini", "iczn", "tribe", `${ICZN} Art. 29.2`], ["ina", "iczn", "subtribe", `${ICZN} Art. 29.2`],
  ["phyta", "icn", "division (plants, algae)", `${ICN} Art. 16.3`], ["mycota", "icn", "division (fungi)", `${ICN} Art. 16.3`], ["phytina", "icn", "subdivision", `${ICN} Art. 16.3`], ["mycotina", "icn", "subdivision (fungi)", `${ICN} Art. 16.3`],
  ["opsida", "icn", "class (plants)", `${ICN} Art. 16.3`], ["phyceae", "icn", "class (algae)", `${ICN} Art. 16.3`], ["mycetes", "icn", "class (fungi)", `${ICN} Art. 16.3`], ["phycidae", "icn", "subclass (algae)", `${ICN} Art. 16.3`], ["mycetidae", "icn", "subclass (fungi)", `${ICN} Art. 16.3`],
  ["ales", "icn", "order", `${ICN} Art. 17.1`], ["ineae", "icn", "suborder", `${ICN} Art. 17.1`], ["aceae", "icn", "family", `${ICN} Art. 18.1`], ["oideae", "icn", "subfamily", `${ICN} Art. 19.1`], ["eae", "icn", "tribe", `${ICN} Art. 19.1`], ["inae", "icn", "subtribe", `${ICN} Art. 19.1`],
];

// ── data ──
function loadSplit(split) {
  const docs = readGz(path.join(ROOT, "corpus", `${split}.jsonl.gz`));
  const gold = new Map(readGz(path.join(ROOT, "gold", `${split}.gold.jsonl.gz`)).map((g) => [g.id, g.mentions]));
  return docs.map((d) => ({ id: d.id, journal: d.journal, text: d.text, lang: d.lang, mentions: gold.get(d.id) ?? [] }));
}
const FOLD1 = new Set(["ZooKeys", "MycoKeys"]);
const foldOf = (d) => (FOLD1.has(d.journal) ? 1 : 2);

function staticLexicon(counts = {}) {
  const lx = { schema: "TaxonomyLexicon@1", giver: `${ICZN}; ${ICN}; open nomenclature (Bengtson 1988)`, built: BUILT, split: "train (counts only)" };
  lx.rank_markers = Object.fromEntries(Object.entries(RANK_MARKERS).map(([k, v]) => [k, { ...v, train_count: counts.rank?.[k] ?? 0 }]));
  const q = {};
  for (const [k, g] of Object.entries(QUALIFIERS)) { q[k] = { giver: g, train_count: counts.qual?.[k] ?? 0 }; q[k + "."] = { giver: g, train_count: 0 }; }
  lx.qualifiers = q;
  lx.dot_words = Object.fromEntries([...new Set([...Object.keys(RANK_MARKERS), ...Object.keys(QUALIFIERS), "al", "fil", "f"])].map((k) => [k, 1]));
  lx.rank_words = Object.fromEntries(Object.entries(RANK_WORDS).map(([k, v]) => [k, { class: v, giver: `${ICZN} Art. 1-2; ${ICN} Art. 2-4 (rank terms)` }]));
  lx.family_suffixes = { giver: `${ICZN} Art. 29.2; ${ICN} Art. 16-19`, rows: FAMILY_SUFFIXES.map(([suffix, code, rank, art]) => ({ suffix, code, rank, art })) };
  lx.year_window = { min: 1753, max: 2027, giver: `${ICN} Art. 13.1 (Linnaeus, Species Plantarum 1753); ${ICZN} Art. 3 (1 January 1758); max = year of the build + 1 (declared)` };
  lx.author_particles = counts.particles ?? {};
  lx.author_connectors = counts.connectors ?? {};
  lx.author_abbrev = counts.abbrev ?? {};
  lx.author_connector_giver = `${ICN} Art. 46.2-46.4 ('&' / 'et', 'ex', 'in'); other-language connectors counted in TRAIN`;
  return lx;
}

const sortedByLen = (arr) => arr.sort((a, b) => b.length - a.length || a.localeCompare(b));

/** lexical priors from a list of {text, mentions} docs. */
function buildLexical(docs) {
  const c0 = A.compilePriors({ lexicon: staticLexicon(), gaps: [] });
  const counts = { rank: {}, qual: {}, particles: {}, connectors: {}, abbrev: {} };
  const names = new Map(), epi = new Map(), authw = new Map();
  const bump = (m, k, d) => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(d); };
  const capNon = new Map(), lowNon = new Map();
  const sufCnt = { g: new Map(), e: new Map(), u: new Map() }, prevCnt = new Map();
  const inc = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  const nm = (w, kind, d) => { let o = names.get(w); if (!o) names.set(w, (o = { genus: new Set(), higher: new Set() })); o[kind].add(d); };
  for (const d of docs) {
    const text = d.text;
    // gold-derived tables
    const spans = [];
    for (const m of d.mentions) {
      spans.push([m.s, m.e]);
      if (m.status !== "gold") continue;
      if (m.kind === "genus") nm(m.id, "genus", d.id);
      else if (m.kind === "higher") nm(m.id, "higher", d.id);
      else if (m.full_genus && m.id) nm(m.id.split(" ")[0], "genus", d.id);
      const authToks = [];
      for (const [s, e, cl] of m.tokens ?? []) {
        const w = text.slice(s, e);
        if (cl === "epithet" || cl === "infra") bump(epi, w, d.id);
        else if (cl === "author") {
          authToks.push([s, e, w]);
          bump(authw, w.replace(/\.$/, ""), d.id);
          if (/\.$/.test(w)) bump(authw, "\u0001" + w, d.id);
        } else if (cl === "rank") { const k = w.toLowerCase().replace(/\.$/, ""); counts.rank[k] = (counts.rank[k] ?? 0) + 1; }
        else if (cl === "marker") { const k = w.toLowerCase().replace(/\.$/, ""); counts.qual[k] = (counts.qual[k] ?? 0) + 1; }
      }
      for (let k = 0; k < authToks.length; k++) {
        const [s, e, w] = authToks[k];
        if (/^\p{Ll}/u.test(w)) counts.particles[w] = (counts.particles[w] ?? 0) + 1;
        if (k + 1 < authToks.length) {
          const gap = text.slice(e, authToks[k + 1][0]).trim();
          if (/^\p{L}{1,4}$/u.test(gap)) counts.connectors[gap.toLowerCase()] = (counts.connectors[gap.toLowerCase()] ?? 0) + 1;
        }
      }
    }
    spans.sort((a, b) => a[0] - b[0]);
    const inName = (s, e) => { let lo = 0, hi = spans.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (spans[mid][1] <= s) lo = mid + 1; else hi = mid; } return lo < spans.length && spans[lo][0] < e; };
    const T = A.lex(text, c0);
    for (let i = 0; i < T.length; i++) {
      const t = T[i];
      if (t.shape === "cap" && t.t.length >= 3) {
        inc(sufCnt.u, "x"); // placeholder to keep map non-empty
        for (let L = 2; L <= 4; L++) if (t.t.length > L + 1) inc(sufCnt.u, t.t.toLowerCase().slice(-L));
        const nxt = T[i + 1];
        if (nxt && !nxt.nl && nxt.shape === "low") for (let L = 2; L <= 4; L++) if (t.t.length > L + 1) inc(sufCnt.g, t.t.toLowerCase().slice(-L));
        if (!inName(t.s, t.e)) bump(capNon, t.t, d.id);
        const p = i > 0 && !t.nl ? T[i - 1] : null;
        if (p && p.shape === "low") inc(prevCnt, p.t.toLowerCase());
      }
      if (t.shape === "low" && i > 0 && !t.nl && T[i - 1].shape === "cap" && T[i - 1].t.length >= 3) {
        for (let L = 2; L <= 4; L++) if (t.t.length > L + 1) inc(sufCnt.e, t.t.slice(-L));
        if (!inName(T[i - 1].s, t.e)) bump(lowNon, t.t, d.id);
      }
      if (t.shape === "punct" || t.shape === "num") continue;
    }
  }
  // author abbreviations (with their dot) seen in >= 2 documents
  const abbrev = {};
  for (const [k, s] of authw) if (k.startsWith("\u0001") && s.size >= 2) abbrev[k.slice(1)] = s.size;
  const particles = Object.fromEntries(Object.entries(counts.particles).filter(([, n]) => n >= 2));
  const connectors = Object.fromEntries(Object.entries(counts.connectors).filter(([w, n]) => n >= 2 && !["ex", "in"].includes(w)));
  const lexicon = staticLexicon({ rank: counts.rank, qual: counts.qual, particles, connectors, abbrev });
  const nameObj = {};
  for (const [w, o] of names) nameObj[w] = { genus: o.genus.size, higher: o.higher.size };
  const epiObj = Object.fromEntries([...epi].map(([w, s]) => [w, s.size]));
  const authObj = Object.fromEntries([...authw].filter(([k]) => !k.startsWith("\u0001")).map(([w, s]) => [w, s.size]));
  const top = (m) => sortedByLen([...m].filter(([k, n]) => n >= MINSUP && k !== "x").sort((a, b) => b[1] - a[1]).slice(0, NBUCKET).map(([k]) => k));
  const prev = [...prevCnt].filter(([, n]) => n >= MINSUP).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k]) => k);
  const genera = { schema: "TaxonomyGenera@1", giver: "Plazi TreatmentBank TRAIN journals; gold = curators' <taxonomicName> spans AND gnparser agreeing (build_gold.py)", built: BUILT, split: "train",
    counts_are: "documents in which the word is a gold name part", names: nameObj, epithets: epiObj, author_words: authObj, suffix_genus: top(sufCnt.g), suffix_epithet: top(sufCnt.e), suffix_uninomial: top(sufCnt.u), prev_words: prev, minsup: MINSUP };
  const refusal = { schema: "TaxonomyRefusal@1", giver: "Plazi TRAIN running text: words that recur as NON-name (outside every curator span) in >= FLOOR documents and are never a gold name part", built: BUILT, split: "train", floor: FLOOR,
    cap_refuse: {}, low_stop: {} };
  for (const [w, s] of capNon) if (s.size >= FLOOR && !names.has(w) && !authw.has(w.replace(/\.$/, ""))) refusal.cap_refuse[w] = s.size;
  for (const [w, s] of lowNon) if (s.size >= FLOOR && !epi.has(w)) refusal.low_stop[w] = s.size;
  return { lexicon, genera, refusal };
}

// ── labels from gold ──
function makeLabeler(mentions) {
  const ms = [...mentions].sort((a, b) => a.s - b.s);
  return (type, core) => {
    let lo = 0, hi = ms.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ms[mid].e <= core[0]) lo = mid + 1; else hi = mid; }
    const hits = [];
    for (let k = lo; k < ms.length && ms[k].s < core[1]; k++) hits.push(ms[k]);
    if (!hits.length) return "neg";
    if (hits.length === 1) {
      const m = hits[0];
      if (m.status === "gold" && m.core && m.core[0] === core[0] && m.core[1] === core[1]) {
        if (type === "binom" && (m.kind === "species" || m.kind === "infraspecific")) return "pos";
        if (type === "uni" && (m.kind === "genus" || m.kind === "higher")) return "pos";
      }
    }
    return "skip";
  };
}

function tabulate(cands) {
  const tab = { prior: { pos: 0, neg: 0 }, f: {} };
  for (const c of cands) {
    if (c.label !== "pos" && c.label !== "neg") continue;
    const li = c.label === "pos" ? 0 : 1;
    tab.prior[c.label]++;
    for (const [k, v] of Object.entries(c.feats)) {
      const row = (tab.f[k] ??= { K: 0, v: {} });
      (row.v[v] ??= [0, 0])[li]++;
    }
  }
  for (const row of Object.values(tab.f)) row.K = Object.keys(row.v).length;
  return tab;
}
function bestThreshold(scored, metric = "f1") {
  const pts = scored.filter((c) => c.label === "pos" || c.label === "neg");
  let best = { theta: 0, f1: -1 };
  for (let th = -8; th <= 8.0001; th += 0.25) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const c of pts) { const p = c.score >= th; if (p && c.label === "pos") tp++; else if (p) fp++; else if (c.label === "pos") fn++; else tn++; }
    const f1 = metric === "acc" ? (tp + tn) / Math.max(1, pts.length) : (2 * tp) / Math.max(1, 2 * tp + fp + fn);
    if (f1 > best.f1) best = { theta: th, f1, tp, fp, fn, tn };
  }
  return best;
}

function toPriors(L, extra = {}) { return { lexicon: L.lexicon, genera: L.genera, refusal: L.refusal, classifier: extra.classifier ?? null, identity: extra.identity ?? null, gaps: [] }; }

/** every doc twice: as written and lower-cased (same offsets), so the tables also hold the case-blind candidates (genus slots read through the gazetteer / cast). */
const withLower = (docs) => docs.flatMap((d) => [d, { ...d, text: A.lowerSafe(d.text), lowered: true }]);
/** scan fold docs and return labelled candidates. */
function collect(docs, priors, { teacher }) {
  const out = { binom: [], uni: [] };
  for (const d of docs) {
    const lab = makeLabeler(d.mentions);
    const oracle = teacher ? (cand) => lab(cand.type, cand.core) === "pos" : undefined;
    const r = A.scan(d.text, priors, { collect: true, oracle });
    for (const c of r.candidates) { c.label = lab(c.type, c.core); (c.type === "binom" ? out.binom : out.uni).push(c); }
  }
  return out;
}

function kindCands(docs, L) {
  const c = A.compilePriors(toPriors(L));
  const out = [];
  for (const d of docs) {
    const T = A.lex(d.text, c);
    const byStart = new Map(T.map((t, i) => [t.s, i]));
    for (const m of d.mentions) {
      if (m.status !== "gold" || (m.kind !== "genus" && m.kind !== "higher")) continue;
      const i = byStart.get(m.core[0]);
      if (i === undefined) continue;
      out.push({ feats: A.kindFeatures(T[i].t, T, i, c), label: m.kind === "higher" ? "pos" : "neg" });
    }
  }
  return out;
}

// ── main ──
const train = loadSplit("train");
log(`TRAIN docs ${train.length}  gold mentions ${train.reduce((n, d) => n + d.mentions.filter((m) => m.status === "gold").length, 0)}`);
const folds = { 1: train.filter((d) => foldOf(d) === 1), 2: train.filter((d) => foldOf(d) === 2) };
log(`fold1 ${folds[1].length} (${[...new Set(folds[1].map((d) => d.journal))]})  fold2 ${folds[2].length} (${[...new Set(folds[2].map((d) => d.journal))]})`);
// ── identity: activation window by dmdWindow; R0 rates + threshold from TRAIN streams ──
function activationWindow(docs) {
  const wins = []; let unresolved = 0, n = 0;
  const cands = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
  for (const d of docs) {
    const obs = [];
    for (const m of d.mentions) {
      if (m.status !== "gold" || !m.id) continue;
      const genus = m.id.split(" ")[0];
      if (m.kind !== "genus" && m.kind !== "species" && m.kind !== "infraspecific") continue;
      const t0 = (m.tokens ?? [])[0];
      const abbr = !!t0 && t0[2] === "genus" && /^\p{Lu}\.?$/u.test(d.text.slice(t0[0], t0[1]));
      if (abbr && (m.kind === "species" || m.kind === "infraspecific")) {
        const letter = genus[0].toLowerCase();
        const derive = (h) => { for (let k = h.length - 1; k >= 0; k--) if (h[k][0].toLowerCase() === letter) return h[k]; return null; };
        if (obs.length && derive(obs)) {
          const r = dmdWindow(obs, derive, { candidates: cands, equal: (a, b) => a === b });
          n++;
          if (r.window === null) unresolved++; else wins.push(r.window);
        }
      }
      obs.push(genus);
    }
  }
  wins.sort((a, b) => a - b);
  const q = (p) => wins[Math.min(wins.length - 1, Math.floor(p * wins.length))];
  return { n, unresolved, window: wins.length ? q(0.9) : null, p50: wins.length ? q(0.5) : null, p90: wins.length ? q(0.9) : null, candidates: cands };
}


const act = activationWindow(train);
const IDACT = { activation: { window: act.window } };
log("activation window", JSON.stringify(act));
const Lf = { 1: buildLexical(folds[2]), 2: buildLexical(folds[1]) };  // features of fold f use lexical priors from the OTHER fold
const Lall = buildLexical(train);
log(`gazetteer all ${Object.keys(Lall.genera.names).length}  epithets ${Object.keys(Lall.genera.epithets).length}  refuse caps ${Object.keys(Lall.refusal.cap_refuse).length}  stop lows ${Object.keys(Lall.refusal.low_stop).length}`);

// pass A: teacher-forced
const candA = { 1: collect(withLower(folds[1]), toPriors(Lf[1], { identity: IDACT }), { teacher: true }), 2: collect(withLower(folds[2]), toPriors(Lf[2], { identity: IDACT }), { teacher: true }) };
const nbOf = (cands) => ({ binom: tabulate(cands.flatMap((c) => c.binom)), uni: tabulate(cands.flatMap((c) => c.uni)) });
function crossTheta(cand, kinds = ["binom", "uni"]) {
  const th = {}, detail = {};
  for (const kd of kinds) {
    const held = [];
    for (const f of [1, 2]) {
      const tab = tabulate(cand[3 - f][kd]);
      for (const c of cand[f][kd]) held.push({ score: A.llr(tab, c.feats).score, label: c.label });
    }
    const b = bestThreshold(held);
    th[kd] = b.theta; detail[kd] = b;
  }
  return { th, detail };
}
const tA = crossTheta(candA);
log("pass A thresholds", JSON.stringify(tA.detail));
const nbA = { 1: nbOf([candA[2]]), 2: nbOf([candA[1]]) };               // classifier for fold f trained on the other fold
const kindA = { 1: tabulate(kindCands(folds[2], Lf[2])), 2: tabulate(kindCands(folds[1], Lf[1])) };
// pass B: reader-driven
const candB = { 1: null, 2: null };
for (const f of [1, 2]) {
  const cl = { binom: nbA[f].binom, uni: nbA[f].uni, kind: kindA[f], theta: { binom: tA.th.binom, uni: tA.th.uni, kind: 0 }, params: {} };
  candB[f] = collect(withLower(folds[f]), toPriors(Lf[f], { classifier: cl, identity: IDACT }), { teacher: false });
  log(`pass B fold ${f}: binom cands ${candB[f].binom.length} (pos ${candB[f].binom.filter((c) => c.label === "pos").length}) uni cands ${candB[f].uni.length} (pos ${candB[f].uni.filter((c) => c.label === "pos").length})`);
}
const tB = crossTheta(candB);
log("pass B thresholds", JSON.stringify(tB.detail));
const nbB = nbOf([candB[1], candB[2]]);
// kind table (genus vs higher): cross-fitted accuracy threshold
const kc = { 1: kindCands(folds[1], Lf[1]), 2: kindCands(folds[2], Lf[2]) };
const heldK = [];
for (const f of [1, 2]) { const tab = tabulate(kc[3 - f]); for (const c of kc[f]) heldK.push({ score: A.llr(tab, c.feats).score, label: c.label }); }
const bk = bestThreshold(heldK, "acc");
const kindTab = tabulate([...kc[1], ...kc[2]]);
log("kind threshold", JSON.stringify(bk));

const classifier = {
  schema: "TaxonomyClassifier@1", giver: "Plazi TreatmentBank TRAIN journals (gold = curators AND gnparser agreeing); naive-Bayes count tables, Laplace alpha = 1 (adapter)", built: BUILT, split: "train",
  binom: nbB.binom, uni: nbB.uni, kind: kindTab,
  theta: { binom: tB.th.binom, uni: tB.th.uni, kind: bk.theta },
  params: { floor: FLOOR, minsup: MINSUP, nbucket: NBUCKET, alpha: 1, fit: "cross-source 2-fold (animals+fungi | plants+mixed); features of a fold use lexical priors of the other fold; shipped lexical priors use all TRAIN", pass_b: "reader-driven candidates (own cast)" },
  train: { binom: { pos: nbB.binom.prior.pos, neg: nbB.binom.prior.neg, heldout: tB.detail.binom }, uni: { pos: nbB.uni.prior.pos, neg: nbB.uni.prior.neg, heldout: tB.detail.uni }, kind: { heldout: bk } },
};

function wordWindows(text, r, k) {
  const ws = []; const re = /\S+/g; let m;
  while ((m = re.exec(text))) ws.push([m.index, m.index + m[0].length]);
  if (ws.length < W + 3) return [];
  const out = [];
  for (let t = 0; t < k; t++) { const s = Math.floor(r() * (ws.length - W)); out.push([ws[s][0], ws[s + W - 1][1]]); }
  return out;
}
const rr = rng(20261006);
const posStreams = [], negStreams = [];
for (const d of train) {
  const wins = wordWindows(d.text, rr, 12);
  let np = 0, nn = 0;
  for (const [a, b] of wins) {
    const inside = d.mentions.filter((m) => m.e > a && m.s < b);
    const gold = inside.filter((m) => m.status === "gold" && m.s >= a && m.e <= b).length;
    if (!inside.length && nn < 2) { negStreams.push({ f: foldOf(d), text: d.text.slice(a, b), kind: "plazi_nonname" }); nn++; }
    else if (gold >= 2 && inside.length === gold && np < 2) { posStreams.push({ f: foldOf(d), text: d.text.slice(a, b), kind: "plazi" }); np++; }
  }
}
const foreignTrain = readGz(path.join(ROOT, "corpus", "foreign", "train.jsonl.gz"));
for (const s of foreignTrain) negStreams.push({ f: negStreams.length % 2 + 1, text: s.text, kind: s.kind });
log(`R0 TRAIN streams: positives ${posStreams.length}, negatives ${negStreams.length} (strangers ${foreignTrain.length})`);

const clFinal = { binom: nbB.binom, uni: nbB.uni, kind: kindTab, theta: classifier.theta, params: {} };
const PRI = { 1: toPriors(Lf[1], { classifier: clFinal, identity: IDACT }), 2: toPriors(Lf[2], { classifier: clFinal, identity: IDACT }) };
function eventCounts(streams) {
  const tot = { words: 0, n: Object.fromEntries(A.EVENT_TYPES.map((k) => [k, 0])) };
  const per = [];
  for (const s of streams) {
    const pri = PRI[s.f];
    const r = A.scan(s.text, pri);
    const c = A.compilePriors(pri);
    const ev = A.eventsOf(r.mentions, c);
    const words = s.text.split(/\s+/).filter(Boolean).length;
    tot.words += words;
    for (const e of ev) tot.n[e.type]++;
    per.push({ s, ev, words });
  }
  return { tot, per };
}
const P = eventCounts(posStreams), N = eventCounts(negStreams);
const rates = { T: {}, F: {} };
for (const k of A.EVENT_TYPES) {
  rates.T[k] = (P.tot.n[k] + 0.5) / (P.tot.words + 1);
  rates.F[k] = (N.tot.n[k] + 0.5) / (N.tot.words + 1);
}
function latched(per, rates) {
  return per.map((p) => {
    const counts = {}; let best = -Infinity;
    const evs = p.ev.sort((a, b) => a.at - b.at);
    const wordAt = (at) => { const upto = p.s.text.slice(0, at + 1); return Math.max(1, upto.split(/\s+/).filter(Boolean).length); };
    const llrAt = (t) => A.EVENT_TYPES.reduce((s, k) => s + (counts[k] ?? 0) * Math.log(rates.T[k] / rates.F[k]) - t * (rates.T[k] - rates.F[k]), 0);
    for (const e of evs) { counts[e.type] = (counts[e.type] ?? 0) + 1; best = Math.max(best, llrAt(Math.min(p.words, wordAt(e.at)))); }
    best = Math.max(best, llrAt(p.words));
    return best;
  });
}
const negMax = latched(N.per, rates).sort((a, b) => a - b);
const theta = negMax[Math.min(negMax.length - 1, Math.ceil((1 - FPR) * negMax.length))] + 1e-9;
const posMax = latched(P.per, rates);
const tpr = posMax.filter((v) => v >= theta).length / Math.max(1, posMax.length);
log(`R0 theta ${theta.toFixed(3)}  TRAIN resubstitution TPR ${tpr.toFixed(3)}  neg latched max>=theta ${negMax.filter((v) => v >= theta).length}/${negMax.length}`);
const identity = {
  schema: "TaxonomyIdentity@1", giver: "Plazi TRAIN windows (positives: >= 2 gold names, no neutral span) vs TRAIN strangers (Plazi windows with no name span + foreign pool); activation window by kernel dmdWindow on TRAIN gold name sequences", built: BUILT, split: "train",
  activation: { window: act.window, basis: "P90 over abbreviated gold mentions of the shallowest depth at which dropping older mentions leaves the most-recent-genus-with-this-initial unchanged", stats: act },
  r0: { W, events: A.EVENT_TYPES, rates, theta, fpr_budget: FPR, streams: { positives: posStreams.length, negatives: negStreams.length, stranger_kinds: Object.fromEntries([...new Set(foreignTrain.map((s) => s.kind))].map((k) => [k, foreignTrain.filter((s) => s.kind === k).length])) },
    train_resubstitution_tpr: tpr, latch: "identity latches: named = the evidence curve crossed theta at any word" },
};

const lexiconOut = { ...Lall.lexicon };
fs.mkdirSync(OUT, { recursive: true });
const wr = (n, o) => fs.writeFileSync(path.join(OUT, `notation-taxonomy-${n}.json`), JSON.stringify(o) + "\n");
wr("lexicon", lexiconOut); wr("genera", Lall.genera); wr("refusal", Lall.refusal); wr("classifier", classifier); wr("identity", identity);
log("wrote priors to", OUT);
