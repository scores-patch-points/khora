// pud-cell-profile-test.mjs — do translations get more alike under the cube's cells than under arbitrary groupings?
// Preregistered in PREREG-CROSS-LANGUAGE-CELL-PROFILE.md; frozen in FREEZE-CROSS-LANGUAGE-CELL-PROFILE.md before the one run.
//
// The claim under test: the kernel's table (kernel/universal-grammar.js) puts every UD part of speech, relation and feature value
// into one of 27 cells, and the cells are language-independent, so the same meaning, said by an ending in one language and a
// word in another, lands in the same cells. PUD gives the same 1,000 sentences in 21 languages with matching sentence ids.
// A sentence's PROFILE is its count of tokens-placements per cell. If the table carries meaning across languages, an English
// sentence's profile should be closer to its own translation's than to other sentences' in that language, and closer than it
// would be under a table that groups the same categories into the same-sized cells at random.
//
//   node pud-cell-profile-test.mjs --selftest   synthetic data only
//   node pud-cell-profile-test.mjs              the one run over UD *-PUD
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { addressOfFeature, addressOfRelation, addressOfUpos } from "../../../native/kernel/universal-grammar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.UD_ROOT ?? "/Users/mlacy/Downloads/workspace/ud-treebanks";
const SEED = 20261123, D_PRIMARY = 200, D_PAIRS = 100, B_NULL_A = 200, B_NULL_DIAG = 100, B_BOOT = 1000;
const OPS = ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"], GRAINS = ["Ground", "Figure", "Pattern"];
export const CELLS = OPS.flatMap((op) => GRAINS.map((g) => `${op}·${g}`));
const cellId = (cell) => CELLS.indexOf(cell);
const CHAN = { U: 0, R: 1, F: 2 };

// ── categories: every (channel, key) seen in the data, with its real cell ───────────────────────────────────────────
const CAT = { ids: new Map(), keys: [], chan: [], cell: [] };
const catId = (key, chan, cell) => { let i = CAT.ids.get(key); if (i === undefined) { i = CAT.keys.length; CAT.ids.set(key, i); CAT.keys.push(key); CAT.chan.push(chan); CAT.cell.push(cell); } return i; };
const baseOf = (d) => String(d ?? "").split(":")[0];

/** Parse CoNLL-U text into [{id, cats: Int32Array, cnt: Int32Array}] and tally what could not be placed. */
export function parseSentences(text, stats = { unplaced: new Map(), form: 0 }) {
  const sents = []; let id = null, m = new Map();
  const flush = () => { if (id !== null && m.size) { const cats = Int32Array.from(m.keys()), cnt = Int32Array.from(m.values()); sents.push({ id, cats, cnt }); } id = null; m = new Map(); };
  const add = (chan, key, a) => {
    if (!a) { stats.unplaced.set(key, (stats.unplaced.get(key) ?? 0) + 1); return; }
    if (a.form) { stats.form++; return; }
    const c = catId(key, CHAN[chan], cellId(a.cell)); m.set(c, (m.get(c) ?? 0) + 1);
  };
  for (const line of text.split("\n")) {
    if (line.startsWith("# sent_id")) { flush(); id = line.split("=")[1].trim(); continue; }
    if (line.startsWith("#")) continue;
    if (!line.trim()) { flush(); continue; }
    const f = line.split("\t"); if (f.length < 8 || !/^\d+$/.test(f[0])) continue;
    add("U", `U:${f[3]}`, addressOfUpos(f[3]));
    const rel = baseOf(f[7]); add("R", `R:${rel}`, addressOfRelation(rel));
    if (f[5] !== "_") for (const kv of f[5].split("|")) {
      const i = kv.indexOf("="); if (i < 1) continue;
      const name = kv.slice(0, i), dim = name.replace(/\[.*\]/, "");
      for (const v of kv.slice(i + 1).split(",")) add("F", `F:${dim}=${v}`, addressOfFeature(name, v));
    }
  }
  flush();
  return sents;
}

// ── numerics ────────────────────────────────────────────────────────────────────────────────────────────────────────
const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mean = (xs) => { let s = 0, n = 0; for (const x of xs) if (!Number.isNaN(x)) { s += x; n++; } return n ? s / n : NaN; };
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];

/** The profiles of one language's sentences under a category->cell table, counting only the channels in `mask`. */
export function profiles(sents, cellOf, mask, dims = 27, rawCats = false) {
  const n = sents.length, P = new Float64Array(n * dims), N = new Float64Array(n);
  for (let s = 0; s < n; s++) {
    const { cats, cnt } = sents[s];
    for (let k = 0; k < cats.length; k++) { const c = cats[k]; if (!mask[CAT.chan[c]]) continue; P[s * dims + (rawCats ? c : cellOf[c])] += cnt[k]; }
    let ss = 0; for (let d = 0; d < dims; d++) { const v = P[s * dims + d]; ss += v * v; } N[s] = Math.sqrt(ss);
  }
  return { P, N };
}

/** For each query i (a sentence of A): the share of D other sentences of B that are LESS like it than its own translation (ties half). NaN when empty. */
export function queryAUCs(A, B, dist, D, dims = 27) {
  const n = A.N.length, out = new Float32Array(n).fill(NaN);
  const cos = (i, j) => { let s = 0; const pi = i * dims, pj = j * dims; for (let d = 0; d < dims; d++) s += A.P[pi + d] * B.P[pj + d]; return s / (A.N[i] * B.N[j]); };
  for (let i = 0; i < n; i++) {
    if (A.N[i] === 0 || B.N[i] === 0) continue;
    const sT = cos(i, i); let less = 0, tie = 0, valid = 0;
    for (let k = 0; k < D; k++) { const j = dist[i * D + k]; if (B.N[j] === 0) continue; valid++; const s = cos(i, j); if (s < sT) less++; else if (s === sT) tie++; }
    if (valid) out[i] = (less + 0.5 * tie) / valid;
  }
  return out;
}

/** A random table with the SAME multiset of cells over the categories in `mask`'s channels: the cells are dealt out again. */
export function shuffledTable(real, mask, rand) {
  const t = Uint8Array.from(real); const ids = []; for (let c = 0; c < t.length; c++) if (mask[CAT.chan[c]]) ids.push(c);
  const cells = ids.map((c) => real[c]);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const x = cells[i]; cells[i] = cells[j]; cells[j] = x; }
  ids.forEach((c, k) => { t[c] = cells[k]; });
  return t;
}

const makeDist = (n, D, rand) => { const d = new Int32Array(n * D); for (let i = 0; i < n; i++) for (let k = 0; k < D; k++) { let j = Math.floor(rand() * (n - 1)); if (j >= i) j++; d[i * D + k] = j; } return d; };

// ── selftest ────────────────────────────────────────────────────────────────────────────────────────────────────────
function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  const text = "# sent_id = s1\n1\tShe\tshe\tPRON\t_\tCase=Nom|Number=Sing\t2\tnsubj\t_\t_\n2\tleft\tleave\tVERB\t_\tTense=Past\t0\troot\t_\t_\n3\t.\t.\tPUNCT\t_\t_\t2\tpunct\t_\t_\n\n# sent_id = s2\n1\tgo\tgo\tVERB\t_\tMood=Imp|Abbr=Yes\t0\troot\t_\t_\n";
  const stats = { unplaced: new Map(), form: 0 };
  const ss = parseSentences(text, stats);
  eq(ss.map((s) => s.id), ["s1", "s2"], "two sentences with their ids");
  const keys = (s) => [...s.cats].map((c) => `${CAT.keys[c]}x${s.cnt[[...s.cats].indexOf(c)]}`).sort();
  eq(keys(ss[0]).includes("F:Case=Nom" + "x1"), true, "a feature value becomes a counted category");
  eq(keys(ss[0]).includes("U:PUNCTx1") && keys(ss[0]).includes("R:punctx1"), true, "UPOS and relation are counted too");
  eq(stats.form, 1, "a surface feature (Abbr) is skipped and counted");
  // retrieval: two languages whose sentences are identical bags -> every true pair is the most similar -> AUC 1; identical rows everywhere -> all ties -> 0.5
  const mk = (rows) => { const n = rows.length, P = new Float64Array(n * 27), N = new Float64Array(n); rows.forEach((r, s) => { r.forEach((v, d) => { P[s * 27 + d] = v; }); N[s] = Math.hypot(...r, 0); }); return { P, N }; };
  const rows = [[3, 0, 1], [0, 2, 2], [1, 1, 0], [0, 0, 4]];
  const dist = makeDist(4, 3, mulberry32(1));
  eq([...queryAUCs(mk(rows), mk(rows), dist, 3)].map((x) => +x.toFixed(2)), [1, 1, 1, 1], "a perfect match ranks above every distractor");
  const same = [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]];
  eq([...queryAUCs(mk(same), mk(same), dist, 3)].map((x) => +x.toFixed(2)), [0.5, 0.5, 0.5, 0.5], "all-equal similarities are ties: 0.5");
  eq(Number.isNaN(queryAUCs(mk([[0, 0, 0]]), mk([[0, 0, 0]]), new Int32Array([0]), 1)[0]), true, "an empty profile is skipped");
  // shuffled table keeps the multiset of cells
  const before = CAT.cell.slice().sort((a, b) => a - b); const t = shuffledTable(Uint8Array.from(CAT.cell), [true, true, true], mulberry32(7));
  eq([...t].sort((a, b) => a - b), before, "a shuffled table has the same multiset of cells");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); }
  console.log("selftest passed");
}

// ── the one run ─────────────────────────────────────────────────────────────────────────────────────────────────────
function run() {
  const stats = { unplaced: new Map(), form: 0 };
  const langs = new Map();
  for (const d of fs.readdirSync(ROOT).filter((x) => /^UD_.+-PUD$/.test(x)).sort()) {
    const files = fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".conllu")); if (!files.length) continue;
    langs.set(d.replace(/^UD_|-PUD$/g, ""), files.flatMap((f) => parseSentences(fs.readFileSync(path.join(ROOT, d, f), "utf8"), stats)));
  }
  const en = langs.get("English"); if (!en) throw new Error("English-PUD missing");
  const ids = en.map((s) => s.id), others = [...langs.keys()].filter((l) => l !== "English");
  const aligned = new Map([["English", en]]); const missing = {};
  for (const l of others) { const by = new Map(langs.get(l).map((s) => [s.id, s])); const a = ids.map((i) => by.get(i) ?? { id: i, cats: new Int32Array(0), cnt: new Int32Array(0) }); missing[l] = a.filter((s) => !s.cats.length).length; aligned.set(l, a); }
  const nCat = CAT.keys.length; CAT.chan = Int8Array.from(CAT.chan); const real = Uint8Array.from(CAT.cell);
  const n = ids.length;

  // fixed distractors per (English -> X) pair, reused by every table and analysis so observed and null are paired
  const dist = new Map(others.map((l, k) => [l, makeDist(n, D_PRIMARY, mulberry32(SEED + 100 + k))]));
  const ANALYSES = { A: { mask: [true, true, true], what: "every channel: part of speech, relation, feature value", B: B_NULL_A }, B: { mask: [false, false, true], what: "feature values only (the stated signals)", B: B_NULL_DIAG }, C: { mask: [false, true, false], what: "relations only", B: B_NULL_DIAG }, D: { mask: [true, false, false], what: "parts of speech only", B: B_NULL_DIAG } };

  const macroUnder = (table, mask) => {
    const E = profiles(en, table, mask), per = {};
    for (const l of others) per[l] = queryAUCs(E, profiles(aligned.get(l), table, mask), dist.get(l), D_PRIMARY);
    return { per, macro: mean(others.map((l) => mean(per[l]))) };
  };

  const out = { seed: SEED, languages: [...langs.keys()], sentences: n, categories: nCat, unplacedTop: [...stats.unplaced].sort((a, b) => b[1] - a[1]).slice(0, 12), formFeaturesSkipped: stats.form, sentencesMissingByLanguage: missing, analyses: {} };
  const rand = mulberry32(SEED + 1);
  for (const [key, an] of Object.entries(ANALYSES)) {
    const obs = macroUnder(real, an.mask);
    const nullMacro = []; for (let b = 0; b < an.B; b++) nullMacro.push(macroUnder(shuffledTable(real, an.mask, rand), an.mask).macro);
    nullMacro.sort((a, b) => a - b);
    // sentence bootstrap of the observed macro AUC
    const br = mulberry32(SEED + 7), boots = [];
    for (let b = 0; b < B_BOOT; b++) { const ms = []; for (const l of others) { const v = Array.from(obs.per[l]).filter((x) => !Number.isNaN(x)); if (!v.length) continue; let s = 0; for (let i = 0; i < v.length; i++) s += v[Math.floor(br() * v.length)]; ms.push(s / v.length); } boots.push(mean(ms)); }
    boots.sort((a, b) => a - b);
    const res = { what: an.what, observedMacroAUC: obs.macro, bootstrapCI95: [pct(boots, 0.025), pct(boots, 0.975)], nullMacroAUC: { n: an.B, mean: mean(nullMacro), median: pct(nullMacro, 0.5), p025: pct(nullMacro, 0.025), p975: pct(nullMacro, 0.975), max: nullMacro[nullMacro.length - 1] }, pValueOneSided: (1 + nullMacro.filter((v) => v >= obs.macro).length) / (an.B + 1), perLanguage: Object.fromEntries(others.map((l) => [l, { auc: mean(obs.per[l]), queries: Array.from(obs.per[l]).filter((x) => !Number.isNaN(x)).length }])) };
    if (key === "A") res.verdict = (obs.macro > res.nullMacroAUC.p975 && res.bootstrapCI95[0] > res.nullMacroAUC.median) ? "SUPPORTED" : "NOT SUPPORTED";
    out.analyses[key] = res;
  }

  // the ceiling: the same retrieval on the raw categories, no cells at all (finer than any 27-cell table)
  { const mask = [true, true, true], E = profiles(en, null, mask, nCat, true), per = others.map((l) => mean(queryAUCs(E, profiles(aligned.get(l), null, mask, nCat, true), dist.get(l), D_PRIMARY, nCat))); out.rawCategoriesMacroAUC = mean(per); }

  // descriptive: all language pairs (A, real table), and per-cell agreement with English
  { const names = [...aligned.keys()], mask = [true, true, true], prof = new Map(names.map((l) => [l, profiles(aligned.get(l), real, mask)]));
    const sum = Object.fromEntries(names.map((l) => [l, { s: 0, c: 0 }])); let k = 0;
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const a = mean(queryAUCs(prof.get(names[i]), prof.get(names[j]), makeDist(n, D_PAIRS, mulberry32(SEED + 1000 + k++)), D_PAIRS)); for (const l of [names[i], names[j]]) { sum[l].s += a; sum[l].c++; } }
    out.allPairsMeanAUCByLanguage = Object.fromEntries(names.map((l) => [l, sum[l].s / sum[l].c])); }
  { const corr = (x, y) => { const m = x.length; let mx = 0, my = 0; for (let i = 0; i < m; i++) { mx += x[i]; my += y[i]; } mx /= m; my /= m; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < m; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN; };
    const perCell = {}; for (const [key, mask] of [["A", [true, true, true]], ["B", [false, false, true]]]) { const E = profiles(en, real, mask); const rows = CELLS.map((cell, c) => { const rs = others.map((l) => { const X = profiles(aligned.get(l), real, mask); const x = new Float64Array(n), y = new Float64Array(n); for (let i = 0; i < n; i++) { x[i] = E.P[i * 27 + c]; y[i] = X.P[i * 27 + c]; } return corr(x, y); }); return { cell, meanR: mean(rs), languagesDefined: rs.filter((v) => !Number.isNaN(v)).length, englishTokens: (() => { let t = 0; for (let i = 0; i < n; i++) t += E.P[i * 27 + c]; return t; })() }; }); perCell[key] = rows; }
    out.perCellAgreementWithEnglish = perCell; }

  fs.writeFileSync(path.join(HERE, "RESULTS-CROSS-LANGUAGE-CELL-PROFILE.json"), JSON.stringify(out, null, 1));
  const a = out.analyses;
  console.log(JSON.stringify({ verdictA: a.A.verdict, A: { observed: a.A.observedMacroAUC, ci: a.A.bootstrapCI95, null: a.A.nullMacroAUC, p: a.A.pValueOneSided }, B: { observed: a.B.observedMacroAUC, null: a.B.nullMacroAUC, p: a.B.pValueOneSided }, C: { observed: a.C.observedMacroAUC, null: a.C.nullMacroAUC, p: a.C.pValueOneSided }, D: { observed: a.D.observedMacroAUC, null: a.D.nullMacroAUC, p: a.D.pValueOneSided }, rawCategoriesMacroAUC: out.rawCategoriesMacroAUC, languages: out.languages.length, categories: nCat }, null, 1));
}

if (process.argv.includes("--selftest")) selftest();
else if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
