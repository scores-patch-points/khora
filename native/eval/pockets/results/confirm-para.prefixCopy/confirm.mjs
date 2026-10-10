// results/confirm-para.prefixCopy/confirm.mjs — SIBLING REPLICATION of the atlas law para.prefixCopy. PRE-REGISTRATION HEADER = every byte above the END marker line (sha256 in PREREG.sha256, re-checked at every run).
// Written 2026-10-07 BEFORE any para statistic was computed on any sibling pocket (the sibling pockets were only built and counted: tokens, units, documents, vocabulary).
//
// STATISTIC. para.prefixCopy = laws/para.mjs STATS id "prefixCopy", null "unit-order": P(a unit begins with the same 2 tokens as the previous unit of its document), over same-document adjacent pairs with both units >= 2 tokens (null when < 50 pairs).
//  Per half: v, nullMean, nullSd over 10 unit-order draws, z = (v - nullMean)/nullSd. v of a sibling = mean of its two halves' v. Defined sibling = finite v and finite z in both halves (else UNDEFINED, listed, never scored).
//  Status (PROTOCOL): PRESENT+ = z >= 4 in BOTH halves; PRESENT- = z <= -4 in both; ABSENT = |z| < 2 in both; AMBIGUOUS = anything else. Halves = lib/pocket.mjs halves() (document-hash parity); the family compute() and nullView() are called exactly as run-atlas.mjs
//  does (all para STATS, kinds {unit-order, within-unit}, 10 draws per kind per half, seed seedOf(pocketId, which, "para", kind, k)). PROTOCOL.md sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc (unchanged).
// LAW UNDER TEST (results/law-table.json): MAJORITY(+) and REVERSAL, 299 PRESENT+ / 3 PRESENT- (cd-mscx, cd-sbgn, ml-lat-summa) / 23 ABSENT of 385 pockets (78%); code 47/47, scripture 26/26, legal 30/31, academic 12/12, chat 19/20, dialect 11/13, novel 21/25, treebank 21/30
//  (5 ABSENT), book 13/19; weaker in children 6/17 (1 ABSENT, 10 AMBIGUOUS), poetry 7/12, history 3/8; absent in SMILES / IUPAC / protein (notation 8/16). Constant: median v 0.0168, IQR/median 2.0, register eta2 0.65 (p<0.001). Not sizeConfounded (G1 rho tokens 0.33,
//  unit length -0.19; z vs tokens +0.50, z vs unit length -0.53: ABSENT calls are power-limited). Rival para.posPar (rho 0.90). The atlas G0 gate record says pass=false overall (cancelPass false); its iid-world false-PRESENT rate is 8.5e-5 per cell.
// WHAT I HAVE SEEN (disclosure; predictions are informed by atlas data and blind only to the siblings). (1) PROTOCOL.md, lib/pocket.mjs, run-atlas.mjs, laws/para.mjs, _para_prep.mjs, _para_adj.mjs (statistic code and its KNOWN LIMITS). (2) The law-table row of
//  para.prefixCopy and gates/falsePresent blocks. (3) From results/atlas/*.json: v and z (both halves) of para.prefixCopy for ALL children, poetry, history, drama, notation, nomenclature, treebank and prose-en (novel, memoir, reportage, treatise, essay) pockets, quantiles of v by
//  class (also the v and z of the atlas code pockets cd-cc-javascript 0.061, cd-cc-python 0.047, cd-cc-typescript 0.048, cd-cc-bash 0.050, cd-e09-eoapp-js 0.028: all PRESENT+), and the atlas PRESENT+ rate by token-size bin: prose-en 42 P+ / 8 AMB / 0 ABSENT of 50 (tokens < 30k: 1 P+ 1 AMB of 2; 30-45k 5/1 of 6; 45-70k 7/2 of 9); children < 30k tokens 0 P+ / 6 AMB of 6, 30-70k 5 P+ of 8; treebank 21 P+ / 5 ABSENT / 4 AMB / 4 UNDEFINED of 34
//  (< 45k tokens: 13 P+ of 23). Atlas v of PRESENT+ pockets (5% / 50% / 95%): code 0.0270 / 0.0580 / 0.1350 (n 47); prose-en 0.0059 / 0.0112 / 0.0269 (42); treebank 0.0028 / 0.0097 / 0.0342 (21); children 0.0066 / 0.0093 / 0.0155 (6). Atlas protein (cd-protein-aa) z 0.59 / 1.14 (ABSENT);
//  SMILES: 4 of 5 pockets ABSENT; their unit order is a seeded random shuffle (exchangeable by construction). (4) For the siblings ONLY sizes (tokens, units, documents, vocabulary, mean unit length), the first and last two units of each English book (cut check), UD sentence-overlap counts
//  with dev/test, the atlas-reproduction check of sp-protein-aa (293,973 tokens / 894 units / 91 documents reproduced exactly) and dedupe counts. (5) I read the HEADER TEXT of results/confirm-fig.introRight and confirm-order.depLen (they list the same underlying documents as siblings of other statistics: the three JS
//  repositories, the vendored Python virtualenv, the misfiled English books, UD train splits); I did not open their numeric results; neither computed any para statistic. NO para statistic of any kind has been computed on any sibling pocket before this header was frozen.
// SIBLINGS (loaders/_sibling-para-{code,prose,ud,notation}.mjs; underscore: ignored by the atlas; none read by any atlas pocket; sizes tokens/units/documents as built). All ids are NEW ids "sp-*" (halves and caps hash these ids).
//  CODE (atlas kind: PRESENT+ 47/47; user's repositories + vendored libraries; exact-bytes dedupe against the atlas code corpus and ethos 09; JS siblings share authorship and are not independent): sp-js-fold 291042/23200/211, sp-js-heimdall 160415/18614/99, sp-js-eoreader7 291147/31511/191,
//   sp-py-foldvenv 293941/64285/227 (third-party), sp-py-first 232966/33095/172 (first-party Python). Not scored (thin, 10836 tokens): sp-sh-first.
//  PROSE (atlas kind: novel 21/25, memoir 11/13, reportage 3/4, treatise 18/26; English books misfiled in ethos 11-multi-language/gutenberg-non-en, skipped by the atlas): sp-en-poe-works2 96647/4199/42, sp-en-chopin-awakening 64408/4440/44, sp-en-hesse-siddhartha 39270/1871/30,
//   sp-en-zola-mouret 128496/8046/80, sp-en-waikna 85322/3386/34, sp-en-about-london 55661/2229/30, sp-en-warren-forces 35736/2020/30, sp-en-kafka-metamorphosis 22048/783/29. Not scored (thin): sp-en-evolution-plain (13722).
//  UD (atlas kind: treebank 21/30 PRESENT+; TRAIN splits of the 19 stems the atlas dropped as thin): sp-ud-{afr 30498/1315/53, ces 299923/17378/696, dan 68296/4369/175, ell 37783/1632/66, gle 85922/3997/160, hye 65187/4352/175, ita 240871/13060/523, kat 33092/2214/89, lit 37825/2340/94,
//   mlt 20056/1120/45, nld 163958/12277/492, rus 58306/3850/154, tur 30973/3430/138, wol 20635/1188/48}. Not scored (thin): hun 17043, mar 2447, tam 5562, tel 3925, uig 15492 tokens.
//  CHILDREN (atlas WEAKER kind: 6/17): sp-en-aesop-stickney 29256/1879/30 (Aesop for young readers), sp-en-pooh 22984/2146/30 (Winnie-the-Pooh). Both are under 30k tokens, the size bin where the atlas has 0 PRESENT of 6 children's pockets, so AMBIGUOUS is the modal outcome.
//  NOTATION (atlas ABSENT kind; HELD-OUT DOCUMENTS of the atlas's own corpora, not new worlds): sp-protein-aa 292094/888/92 (the 1107 gene blocks the atlas did not take; genome order), sp-smiles-ccd 156499/6000/60 (45,513 wwPDB components the atlas did not sample; seeded random order,
//   i.e. exchangeable by construction like the atlas pocket, so this one is an instrument check of the null rather than a probe of text order).
// BLIND PREDICTIONS (per sibling; status as above; v = mean of halves; hard v range = atlas 5%-95% of v among PRESENT+ pockets of the class, applied only to a sibling that is PRESENT+; point guess in brackets).
//  P-CODE (each of 5): PRESENT+ ; v in [0.0270, 0.1350] [0.058]. Class holds iff EVERY defined code sibling is PRESENT+.
//  P-PROSE (each of 8): z > 0 in both halves, never PRESENT-, never ABSENT (atlas 0 ABSENT of 50); PRESENT+ is the modal outcome (about 6-7 of 8: atlas rate 84%, lower under 45k tokens); v in [0.0059, 0.0269] [0.0112]. Class holds iff PRESENT+ share >= 65% of defined siblings (>= 6 of 8)
//   AND none is PRESENT- AND none is ABSENT.
//  P-UD (each of 14): never PRESENT-; PRESENT+ in about 60-70% (point: 9 of 14); ABSENT allowed (atlas 5/30); v in [0.0028, 0.0342] [0.0097]. Class holds iff PRESENT+ share >= 50% of defined siblings AND none is PRESENT-.
//  P-CHILDREN (each of 2): z > 0 in both halves; AMBIGUOUS modal (z>0 in 15 of 17 atlas children's pockets); never PRESENT-; v in [0.0066, 0.0155] if PRESENT+ [0.0093]. Class holds iff every defined sibling has z > 0 in both halves AND none is PRESENT- AND the PRESENT+ share <= 50%.
//  P-NOTATION (each of 2): ABSENT (|z| < 2 in both halves); d = v - nullMean in [-0.03, +0.03] (protein) and [-0.02, +0.02] (SMILES). Class holds iff no sibling is PRESENT of either sign AND at least one is ABSENT.
//  P-CONSTANT (reported with its own verdict, does not enter the main verdict): (i) hit rate of the v ranges above among PRESENT+ siblings >= 75%; (ii) median v of PRESENT+ code siblings >= 3 x median v of PRESENT+ prose siblings (atlas ratio 5.2).
//  P-GLOBAL: no natural-language sibling (prose, UD, children) is PRESENT-. Weaker-kind contrast (reported): PRESENT+ share of children < PRESENT+ share of prose.
// PASS RULE. REPLICATES iff all five classes (CODE, PROSE, UD, CHILDREN, NOTATION) hold. FAILS iff none of CODE, PROSE, UD holds. PARTIAL otherwise (the verdict names the classes that hold and the ones that do not). AMBIGUOUS siblings are never counted as confirmations and, where the class rule
//  asks for a share, they count in the denominator. Per-sibling results (status, z and v per half, d) are reported whatever the verdict.
// ADVERSARY (reported, not gating): (a) rival para.posPar: z next to prefixCopy and Spearman rho over sibling cells (atlas rho 0.90); (b) size and unit length: Spearman of mean z with log tokens and with mean unit length over siblings (atlas +0.50 / -0.53), also within natural-language siblings;
//  (c) leakage: dedupe counts, UD train/dev-test sentence overlap, the exact-duplicate share of adjacent unit pairs and of prefixCopy hits (identical units); (d) topic: z against a WITHIN-DOCUMENT unit-order null (units re-dealt only inside their own document, 10 draws), because the atlas null re-deals units across the whole
//  view so document topic (names) is part of what it calls anaphora; (e) multiplicity: 31 scored cells x the atlas iid false-PRESENT rate 8.5e-5 = 0.003 expected false PRESENT cells (P(>=1) 0.26%); under no effect P(|z| < 2 in both halves) is about 0.83 (t9 reference), so a lone ABSENT call is weak evidence;
//  (f) supplementary: z against 50 unit-order draws (z50), suffixCopy and adjNg2 cells. HARNESS CHECK before scoring: the same code must reproduce results/atlas/{bk-alice,ud-slk,cd-smiles-chebi}.json para cells (all 12 statistics, both halves) to 1e-9, else nothing is scored.
// No threshold, sibling, prediction or rule above is changed after any sibling statistic is seen; deviations, if any, are logged in the output JSON field "deviations".
export const PREREG = Object.freeze({
  stat: "para.prefixCopy", protocolSha256: "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc", draws: 10, supplementaryDraws: 50, docNullDraws: 10,
  classes: {
    code: { loader: "_sibling-para-code", ids: ["sp-js-fold", "sp-js-heimdall", "sp-js-eoreader7", "sp-py-foldvenv", "sp-py-first"], vRange: [0.0270, 0.1350], guess: 0.058 },
    prose: { loader: "_sibling-para-prose", ids: ["sp-en-poe-works2", "sp-en-chopin-awakening", "sp-en-hesse-siddhartha", "sp-en-zola-mouret", "sp-en-waikna", "sp-en-about-london", "sp-en-warren-forces", "sp-en-kafka-metamorphosis"], vRange: [0.0059, 0.0269], guess: 0.0112, minShare: 0.65 },
    ud: { loader: "_sibling-para-ud", ids: ["afr", "ces", "dan", "ell", "gle", "hye", "ita", "kat", "lit", "mlt", "nld", "rus", "tur", "wol"].map((s) => `sp-ud-${s}`), vRange: [0.0028, 0.0342], guess: 0.0097, minShare: 0.5 },
    children: { loader: "_sibling-para-prose", ids: ["sp-en-aesop-stickney", "sp-en-pooh"], vRange: [0.0066, 0.0155], guess: 0.0093, maxShare: 0.5 },
    notation: { loader: "_sibling-para-notation", ids: ["sp-protein-aa", "sp-smiles-ccd"], dRange: { "sp-protein-aa": [-0.03, 0.03], "sp-smiles-ccd": [-0.02, 0.02] } },
  },
  notScoredThin: ["sp-sh-first", "sp-en-evolution-plain", "sp-ud-hun", "sp-ud-mar", "sp-ud-tam", "sp-ud-tel", "sp-ud-uig"],
  constant: { minRangeHitRate: 0.75, codeOverProseMedianRatio: 3 },
  harnessCheck: [{ id: "bk-alice", loader: "books" }, { id: "ud-slk", loader: "ud" }, { id: "cd-smiles-chebi", loader: "codemisc" }],
});
// ===== END OF PRE-REGISTRATION HEADER (sha256 of every byte above this line is recorded in PREREG.sha256) =====

// ---------------------------------------------------------------- computation (below the pre-registration header; nothing below changes a rule above)
//   node confirm.mjs --verify              re-hash the header and compare with PREREG.sha256
//   node confirm.mjs --harness             reproduce atlas para cells of PREREG.harnessCheck (writes harness.json)
//   node confirm.mjs --run id1,id2,...     compute siblings (writes siblings/<id>.json); "--run all" = every scored sibling
//   node confirm.mjs --score               aggregate siblings/*.json -> confirm-result.json (+ table on stdout)
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf, rngOf } from "../../lib/pocket.mjs";
import * as para from "../../laws/para.mjs";

const SELF = fileURLToPath(import.meta.url), HERE = path.dirname(SELF), POCKETS = path.resolve(HERE, "../..");
const argv = process.argv.slice(2), has = (k) => argv.includes(k), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const MARK = "// ===== END OF PRE-REGISTRATION HEADER";
const ALL = Object.entries(PREREG.classes).flatMap(([cls, c]) => c.ids.map((id) => ({ id, cls, loader: c.loader })));
const CLASS_OF = Object.fromEntries(ALL.map((x) => [x.id, x.cls]));

function verifyHeader() {
  const src = fs.readFileSync(SELF, "utf8"), i = src.indexOf(MARK), got = createHash("sha256").update(src.slice(0, i)).digest("hex");
  const want = fs.readFileSync(path.join(HERE, "PREREG.sha256"), "utf8").split(/\s+/)[0];
  if (got !== want) throw new Error(`pre-registration header changed: ${got} != ${want}`);
  return got;
}
const headerSha = verifyHeader();

// the same mean / sd (n-1) as run-atlas.mjs
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const cell = (v, xs) => {
  const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
};
/** exactly the per-half block of run-atlas.mjs for the family "para": all STATS, one draw set per null kind, seed seedOf(id, which, "para", kind, k). */
function atlasCells(p, view, which, DRAWS) {
  const obs = para.compute(view), kinds = [...new Set(para.STATS.map((s) => s.null))], draws = {};
  for (const kind of kinds) { draws[kind] = []; for (let k = 0; k < DRAWS; k++) draws[kind].push(para.compute(nullView(view, kind, seedOf(p.id, which, para.FAMILY, kind, k)))); }
  const out = {};
  for (const s of para.STATS) out[`para.${s.id}`] = cell(obs[s.id], draws[s.null].map((d) => d[s.id]).filter((x) => Number.isFinite(x)));
  return { out, obs };
}
const same = (a, b) => (a == null || b == null ? a === b : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)));

async function loadPocket(id) {
  const spec = ALL.find((x) => x.id === id), loaderName = spec ? spec.loader : PREREG.harnessCheck.find((h) => h.id === id)?.loader;
  if (!loaderName) throw new Error(`no loader for ${id}`);
  const m = await import(pathToFileURL(path.join(POCKETS, "loaders", `${loaderName}.mjs`)).href);
  const ps = (await m.load([id])).filter((p) => p.id === id);
  if (ps.length !== 1) throw new Error(`loader ${loaderName} returned ${ps.length} pockets for ${id}`);
  return ps[0];
}

// ---- harness: the code above must reproduce the atlas cells of three atlas pockets (every para statistic, both halves) before anything is scored
async function harness() {
  const rows = []; let pass = true;
  for (const h of PREREG.harnessCheck) {
    const p = await loadPocket(h.id), H = halves(p), atlas = JSON.parse(fs.readFileSync(path.join(POCKETS, "results/atlas", `${h.id}.json`), "utf8")), row = { id: h.id, maxAbsDiff: 0, mismatches: [], cells: {} };
    for (const which of ["discover", "confirm"]) {
      const { out } = atlasCells(p, H[which], which, PREREG.draws);
      for (const [k, mine] of Object.entries(out)) {
        const a = atlas.halves[which][k];
        for (const f of ["v", "nullMean", "nullSd", "z", "n"]) {
          if (!same(mine[f], a[f])) { pass = false; row.mismatches.push(`${which}/${k}/${f}: ${mine[f]} vs ${a[f]}`); }
          else if (mine[f] != null && a[f] != null) row.maxAbsDiff = Math.max(row.maxAbsDiff, Math.abs(mine[f] - a[f]));
        }
      }
      row.cells[which] = { prefixCopy: { mine: out["para.prefixCopy"], atlas: atlas.halves[which]["para.prefixCopy"] } };
    }
    rows.push(row); console.error(`harness ${h.id}: maxAbsDiff ${row.maxAbsDiff}, mismatches ${row.mismatches.length}`);
  }
  fs.writeFileSync(path.join(HERE, "harness.json"), JSON.stringify({ pass, tolerance: 1e-9, headerSha256: headerSha, rows }, null, 1));
  console.error(`HARNESS ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exitCode = 1;
}

// ---- supplementary measurements (reported, never scored)
/** units re-dealt only inside their own document (adversary d: removes document topic from what "adjacent" means) */
function docUnitOrder(view, seed) {
  const rnd = rngOf(seed), units = view.units.slice(), n = units.length;
  for (let a = 0; a < n;) {
    let b = a; while (b < n && view.docOf[b] === view.docOf[a]) b++;
    for (let i = b - 1; i > a; i--) { const j = a + Math.floor(rnd() * (i - a + 1)); [units[i], units[j]] = [units[j], units[i]]; }
    a = b;
  }
  return { ...view, units };
}
const sameUnit = (u, w) => u.length === w.length && u.every((t, i) => t === w[i]);
/** pair counts of prefixCopy (same document, both units >= 2 tokens), hits, and how many hits / pairs are EXACT duplicates of the previous unit */
function dupStats(view) {
  const U = view.units; let np = 0, hit = 0, dupHit = 0, dupPair = 0;
  for (let u = 1; u < U.length; u++) {
    if (view.docOf[u] !== view.docOf[u - 1] || U[u].length < 2 || U[u - 1].length < 2) continue;
    np++; const d = sameUnit(U[u], U[u - 1]); if (d) dupPair++;
    if (U[u][0] === U[u - 1][0] && U[u][1] === U[u - 1][1]) { hit++; if (d) dupHit++; }
  }
  return { pairs: np, hits: hit, dupHits: dupHit, dupPairs: dupPair };
}
const SUP = ["prefixCopy", "suffixCopy", "posPar", "adjNg2"];
function supplementary(p, view, which, atlasObs) {
  const z50 = {}, draws = Object.fromEntries(SUP.map((s) => [s, []]));
  for (let k = 0; k < PREREG.supplementaryDraws; k++) { const d = para.compute(nullView(view, "unit-order", seedOf(p.id, which, para.FAMILY, "unit-order", k))); for (const s of SUP) if (Number.isFinite(d[s])) draws[s].push(d[s]); }
  for (const s of SUP) z50[s] = cell(atlasObs[s], draws[s]);
  const dn = Object.fromEntries(SUP.map((s) => [s, []]));
  for (let k = 0; k < PREREG.docNullDraws; k++) { const d = para.compute(docUnitOrder(view, seedOf(p.id, which, para.FAMILY, "doc-unit-order", k))); for (const s of SUP) if (Number.isFinite(d[s])) dn[s].push(d[s]); }
  const docNull = Object.fromEntries(SUP.map((s) => [s, cell(atlasObs[s], dn[s])]));
  return { z50, docNull, dup: dupStats(view) };
}

async function runOne(id) {
  const t0 = Date.now(), p = await loadPocket(id), meta = validate(p), H = halves(p), res = { id, class: CLASS_OF[id], headerSha256: headerSha, meta: { ...meta, group: p.group, register: p.register, language: p.language, script: p.script ?? null, vocab: new Set(p.units.flat()).size, meanUnitLength: meta.tokens / meta.units,
    leak: p.meta?.leak ?? null, atlasCheck: p.meta?.atlasCheck ?? null, notes: String(p.meta?.notes ?? "").slice(0, 700), source: String(p.meta?.source ?? "").slice(0, 400) }, halves: {} };
  if (meta.thin) { res.skipped = "thin"; }
  else for (const which of ["discover", "confirm"]) {
    const view = H[which], { out, obs } = atlasCells(p, view, which, PREREG.draws);
    res.halves[which] = { tokens: view.units.reduce((n, u) => n + u.length, 0), units: view.units.length, docs: new Set(view.docOf).size, cells: out, ...supplementary(p, view, which, obs) };
  }
  fs.mkdirSync(path.join(HERE, "siblings"), { recursive: true });
  fs.writeFileSync(path.join(HERE, "siblings", `${id}.json`), JSON.stringify(res));
  console.error(`${id}: ${meta.tokens} tokens, ${((Date.now() - t0) / 1000).toFixed(1)} s${res.skipped ? " (thin)" : ""}`);
}

// ---- scoring
const statusOf = (a, b) => {
  if (!a || !b || a.v == null || b.v == null || a.z == null || b.z == null) return "UNDEFINED";
  if (a.z >= 4 && b.z >= 4) return "PRESENT+"; if (a.z <= -4 && b.z <= -4) return "PRESENT-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "ABSENT"; return "AMBIGUOUS";
};
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const ranks = (xs) => { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < ix.length;) { let j = i; while (j < ix.length && ix[j][0] === ix[i][0]) j++; for (let k = i; k < j; k++) r[ix[k][1]] = (i + j - 1) / 2 + 1; i = j; } return r; };
const pearson = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null; };
const spearman = (x, y) => (x.length >= 4 ? pearson(ranks(x), ranks(y)) : null);
const inR = (v, r) => v >= r[0] && v <= r[1];

function sibRow(r) {
  const D = r.halves.discover, C = r.halves.confirm, a = D.cells["para.prefixCopy"], b = C.cells["para.prefixCopy"], st = statusOf(a, b);
  const row = { id: r.id, class: r.class, status: st, tokens: r.meta.tokens, units: r.meta.units, docs: r.meta.docs, vocab: r.meta.vocab, meanUnitLength: r.meta.meanUnitLength };
  if (st === "UNDEFINED") return { ...row, discover: a, confirm: b };
  const nm = (x) => x.nullMean;
  Object.assign(row, { discover: a, confirm: b, v: (a.v + b.v) / 2, d: ((a.v - nm(a)) + (b.v - nm(b))) / 2, zMean: (a.z + b.z) / 2, zBothPositive: a.z > 0 && b.z > 0 });
  const st50 = statusOf(D.z50.prefixCopy, C.z50.prefixCopy), stDoc = statusOf(D.docNull.prefixCopy, C.docNull.prefixCopy);
  row.supplementary = { z50: [D.z50.prefixCopy.z, C.z50.prefixCopy.z], status50: st50, docNullZ: [D.docNull.prefixCopy.z, C.docNull.prefixCopy.z], statusDocNull: stDoc,
    posParZ: [D.cells["para.posPar"].z, C.cells["para.posPar"].z], suffixCopyZ: [D.cells["para.suffixCopy"].z, C.cells["para.suffixCopy"].z], adjNg2Z: [D.cells["para.adjNg2"].z, C.cells["para.adjNg2"].z],
    posParStatus: statusOf(D.cells["para.posPar"], C.cells["para.posPar"]), suffixCopyStatus: statusOf(D.cells["para.suffixCopy"], C.cells["para.suffixCopy"]),
    dup: { discover: D.dup, confirm: C.dup, dupHitShare: (D.dup.dupHits + C.dup.dupHits) / Math.max(1, D.dup.hits + C.dup.hits), dupPairShare: (D.dup.dupPairs + C.dup.dupPairs) / Math.max(1, D.dup.pairs + C.dup.pairs), hitRate: (D.dup.hits + C.dup.hits) / Math.max(1, D.dup.pairs + C.dup.pairs) } };
  return row;
}
function judge(rows) {
  const by = (cls) => rows.filter((r) => r.class === cls), def = (cls) => by(cls).filter((r) => r.status !== "UNDEFINED"), n = (xs, s) => xs.filter((r) => r.status === s).length;
  const C = {};
  const code = def("code"); C.code = { rule: "every defined code sibling PRESENT+", defined: code.length, present: n(code, "PRESENT+"), holds: code.length > 0 && n(code, "PRESENT+") === code.length };
  const pr = def("prose"); C.prose = { rule: "PRESENT+ share >= 0.65, none PRESENT-, none ABSENT", defined: pr.length, present: n(pr, "PRESENT+"), share: n(pr, "PRESENT+") / Math.max(1, pr.length), nPresentMinus: n(pr, "PRESENT-"), nAbsent: n(pr, "ABSENT"), nAmbiguous: n(pr, "AMBIGUOUS"),
    holds: pr.length > 0 && n(pr, "PRESENT+") / pr.length >= PREREG.classes.prose.minShare && n(pr, "PRESENT-") === 0 && n(pr, "ABSENT") === 0 };
  const ud = def("ud"); C.ud = { rule: "PRESENT+ share >= 0.50, none PRESENT-", defined: ud.length, present: n(ud, "PRESENT+"), share: n(ud, "PRESENT+") / Math.max(1, ud.length), nPresentMinus: n(ud, "PRESENT-"), nAbsent: n(ud, "ABSENT"), nAmbiguous: n(ud, "AMBIGUOUS"),
    holds: ud.length > 0 && n(ud, "PRESENT+") / ud.length >= PREREG.classes.ud.minShare && n(ud, "PRESENT-") === 0 };
  const ch = def("children"); C.children = { rule: "every defined sibling z > 0 in both halves, none PRESENT-, PRESENT+ share <= 0.50", defined: ch.length, present: n(ch, "PRESENT+"), share: n(ch, "PRESENT+") / Math.max(1, ch.length), allZPositive: ch.every((r) => r.zBothPositive), nPresentMinus: n(ch, "PRESENT-"),
    holds: ch.length > 0 && ch.every((r) => r.zBothPositive) && n(ch, "PRESENT-") === 0 && n(ch, "PRESENT+") / ch.length <= PREREG.classes.children.maxShare };
  const nt = def("notation"); C.notation = { rule: "no sibling PRESENT of either sign, at least one ABSENT", defined: nt.length, nPresent: n(nt, "PRESENT+") + n(nt, "PRESENT-"), nAbsent: n(nt, "ABSENT"), holds: nt.length > 0 && n(nt, "PRESENT+") + n(nt, "PRESENT-") === 0 && n(nt, "ABSENT") >= 1 };
  const nl = [...pr, ...ud, ...ch]; C.global = { rule: "no natural-language sibling PRESENT-", nNaturalLanguageDefined: nl.length, nPresentMinus: n(nl, "PRESENT-"), holds: n(nl, "PRESENT-") === 0 };
  C.weakerKindContrast = { childrenShare: C.children.share, proseShare: C.prose.share, childrenBelowProse: C.children.share < C.prose.share };
  const keys = ["code", "prose", "ud", "children", "notation"], holding = keys.filter((k) => C[k].holds), failing = keys.filter((k) => !C[k].holds);
  const verdict = holding.length === keys.length ? "REPLICATES" : !["code", "prose", "ud"].some((k) => C[k].holds) ? "FAILS" : "PARTIAL";
  return { classes: C, holding, failing, verdict };
}
function constants(rows) {
  const out = { rangeHits: [], d: [] }, cl = PREREG.classes;
  for (const r of rows.filter((x) => x.status === "PRESENT+" && cl[x.class]?.vRange)) out.rangeHits.push({ id: r.id, class: r.class, v: r.v, range: cl[r.class].vRange, hit: inR(r.v, cl[r.class].vRange), guess: cl[r.class].guess });
  for (const r of rows.filter((x) => x.class === "notation" && x.status !== "UNDEFINED")) out.d.push({ id: r.id, d: r.d, range: cl.notation.dRange[r.id], hit: inR(r.d, cl.notation.dRange[r.id]) });
  const hits = out.rangeHits.filter((x) => x.hit).length; out.hitRate = out.rangeHits.length ? hits / out.rangeHits.length : null;
  const mc = med(rows.filter((r) => r.status === "PRESENT+" && r.class === "code").map((r) => r.v)), mp = med(rows.filter((r) => r.status === "PRESENT+" && r.class === "prose").map((r) => r.v));
  out.medianV = { code: mc, prose: mp, ud: med(rows.filter((r) => r.status === "PRESENT+" && r.class === "ud").map((r) => r.v)), children: med(rows.filter((r) => r.status === "PRESENT+" && r.class === "children").map((r) => r.v)) };
  out.codeOverProse = mc != null && mp != null ? mc / mp : null;
  out.holds = out.hitRate != null && out.hitRate >= PREREG.constant.minRangeHitRate && out.codeOverProse != null && out.codeOverProse >= PREREG.constant.codeOverProseMedianRatio;
  return out;
}

function adversary(rows) {
  const ok = rows.filter((r) => r.status !== "UNDEFINED"), nl = ok.filter((r) => ["prose", "ud", "children"].includes(r.class)), A = {};
  const col = (xs, f) => xs.map(f);
  const zpp = (r) => (r.supplementary.posParZ[0] + r.supplementary.posParZ[1]) / 2, zpc = (r) => r.zMean;
  const fin = ok.filter((r) => Number.isFinite(zpp(r)));
  A.rivalPosPar = { n: fin.length, spearmanZ: spearman(col(fin, zpc), col(fin, zpp)), spearmanV: null, statusPosPar: Object.fromEntries(fin.map((r) => [r.id, r.supplementary.posParStatus])), atlasRho: 0.90 };
  A.sizeAndLength = { n: ok.length, rhoZLogTokens: spearman(col(ok, (r) => r.zMean), col(ok, (r) => Math.log(r.tokens))), rhoZUnitLength: spearman(col(ok, (r) => r.zMean), col(ok, (r) => r.meanUnitLength)),
    nlOnly: { n: nl.length, rhoZLogTokens: spearman(col(nl, (r) => r.zMean), col(nl, (r) => Math.log(r.tokens))), rhoZUnitLength: spearman(col(nl, (r) => r.zMean), col(nl, (r) => r.meanUnitLength)) }, atlas: { rhoZLogTokens: 0.495, rhoZUnitLength: -0.525 },
    presentRateByTokenBin: [[0, 40000], [40000, 100000], [100000, 1e9]].map(([lo, hi]) => { const s = nl.filter((r) => r.tokens >= lo && r.tokens < hi); return { tokens: [lo, hi], n: s.length, present: s.filter((r) => r.status === "PRESENT+").length }; }) };
  A.leakage = { dupHitShare: Object.fromEntries(ok.map((r) => [r.id, +r.supplementary.dup.dupHitShare.toFixed(4)])), dupPairShare: Object.fromEntries(ok.map((r) => [r.id, +r.supplementary.dup.dupPairShare.toFixed(4)])), hitRate: Object.fromEntries(ok.map((r) => [r.id, +r.supplementary.dup.hitRate.toFixed(5)])) };
  A.topic = { statusUnitOrder: Object.fromEntries(ok.map((r) => [r.id, r.status])), statusDocNull: Object.fromEntries(ok.map((r) => [r.id, r.supplementary.statusDocNull])), docNullZ: Object.fromEntries(ok.map((r) => [r.id, r.supplementary.docNullZ.map((z) => (z == null ? null : +z.toFixed(2)))])),
    presentUnitOrder: ok.filter((r) => r.status === "PRESENT+").length, presentAlsoUnderDocNull: ok.filter((r) => r.status === "PRESENT+" && r.supplementary.statusDocNull === "PRESENT+").length,
    meanZRatioDocNullOverUnitOrder: med(ok.filter((r) => r.status === "PRESENT+").map((r) => ((r.supplementary.docNullZ[0] + r.supplementary.docNullZ[1]) / 2) / r.zMean)) };
  A.z50 = { status50: Object.fromEntries(ok.map((r) => [r.id, r.supplementary.status50])), disagreeWithPrimary: ok.filter((r) => r.supplementary.status50 !== r.status).map((r) => r.id) };
  const nCells = ok.length, p = 8.488e-5; A.multiplicity = { scoredSiblings: nCells, atlasIidFalsePresentRate: p, expectedFalsePresent: nCells * p, pAtLeastOneFalsePresent: 1 - (1 - p) ** nCells, note: "under no effect P(|z|<2 in both halves) is about 0.83-0.85, so a lone ABSENT is weak evidence" };
  return A;
}
function score() {
  const rows = [], missing = [], thin = [];
  for (const x of ALL) {
    const f = path.join(HERE, "siblings", `${x.id}.json`);
    if (!fs.existsSync(f)) { missing.push(x.id); continue; }
    const r = JSON.parse(fs.readFileSync(f, "utf8")); if (r.skipped) { thin.push(x.id); continue; }
    rows.push(sibRow(r));
  }
  const J = judge(rows), K = constants(rows), A = adversary(rows);
  const harnessF = path.join(HERE, "harness.json"), harnessPass = fs.existsSync(harnessF) ? JSON.parse(fs.readFileSync(harnessF, "utf8")).pass : null;
  const deviations = [];
  if (missing.length) deviations.push(`siblings not computed: ${missing.join(", ")}`);
  if (harnessPass !== true) deviations.push(`harness check not passed (${harnessPass})`);
  const res = { stat: PREREG.stat, headerSha256: headerSha, harnessPass, verdict: harnessPass === true && !missing.length ? J.verdict : "NOT SCORED", verdictIfScored: J.verdict, holding: J.holding, failing: J.failing, classes: J.classes, constant: K, adversary: A, rows, thinNotScored: [...thin, ...PREREG.notScoredThin.filter((t) => !thin.includes(t))], missing, deviations };
  fs.writeFileSync(path.join(HERE, "confirm-result.json"), JSON.stringify(res, null, 1));
  const f = (x, d = 2) => (x == null ? "  null" : (+x).toFixed(d).padStart(7));
  console.log("id".padEnd(26), "class".padEnd(9), "tokens".padStart(7), "meanLen".padStart(7), "vD".padStart(7), "vC".padStart(7), "zD".padStart(7), "zC".padStart(7), "status".padEnd(10), "z50 st".padEnd(10), "docNull st");
  for (const r of rows) console.log(r.id.padEnd(26), r.class.padEnd(9), String(r.tokens).padStart(7), f(r.meanUnitLength, 1), f(r.discover.v, 4), f(r.confirm.v, 4), f(r.discover.z, 1), f(r.confirm.z, 1), r.status.padEnd(10), (r.supplementary?.status50 ?? "").padEnd(10), r.supplementary?.statusDocNull ?? "");
  console.log("VERDICT", res.verdict, "holding", J.holding.join(","), "failing", J.failing.join(","), "| constant holds:", K.holds, "| global:", J.classes.global.holds);
}
if (has("--verify")) console.log(headerSha);
else if (has("--harness")) await harness();
else if (has("--run")) { const a = opt("--run", ""), ids = a === "all" ? ALL.map((x) => x.id) : a.split(","); for (const id of ids) await runOne(id); }
else if (has("--score")) score();
