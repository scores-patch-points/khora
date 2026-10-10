// results/confirm-para.formulaCov/confirm.mjs — SIBLING REPLICATION of the atlas law para.formulaCov. PRE-REGISTRATION HEADER = every byte above the END marker line (sha256 in PREREG.sha256, re-checked at every run).
// Written 2026-10-07 BEFORE any para statistic was computed on any sibling pocket (the sibling pockets were only built and counted: tokens, units, documents, vocabulary; logs/sizes-*.out).
//
// STATISTIC. para.formulaCov = laws/para.mjs STATS id "formulaCov", null "within-unit": share of the tokens of units with len >= 4 covered by within-unit 4-grams that occur >= 3 times in the view (null when the view has < 1000 such tokens).
//  Per half: v, nullMean, nullSd over 10 within-unit draws, z = (v - nullMean)/nullSd (z null when nullSd == 0 or < 3 finite draws). The family compute() and nullView() are called exactly as run-atlas.mjs does: all 12 para STATS, kinds {unit-order, within-unit},
//  10 draws per kind per half, seed seedOf(pocketId, which, "para", kind, k), halves = lib/pocket.mjs halves() (document-hash parity). v of a sibling = mean of its two halves' v.
//  Cell status (PROTOCOL, unchanged, sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc): PRESENT+ = z >= 4 in BOTH halves; PRESENT- = z <= -4 in both; ABSENT = |z| < 2 in both; AMBIGUOUS = any other pair of two defined z.
//  UNDEFINED = z null (nullSd 0) in at least one half: never scored as present or absent, always listed (sub-type ABOVE-NULL when v > nullMean in both halves).
// LAW UNDER TEST (results/law-table.json): UNIVERSAL(+): 242 PRESENT+ of 243 pockets with a defined z in both halves (1 AMBIGUOUS: ml-grc-comedy, z +22.9 / +3.79; 0 PRESENT-, 0 ABSENT); z undefined in 148 of 391 real pockets (all 148 by nullSd = 0).
//  Constant pocket-class-specific: eta2 0.51 (group), 0.67 (register), permutation p < 0.001; atlas median v by register: diagram 0.62, notation 0.56, code 0.35 (n 47, 5/50/95% 0.152 / 0.352 / 0.542), legal 0.33, nomenclature 0.34, scripture 0.16, academic 0.13, docs 0.21 (n 2),
//  reportage 0.060, treebank 0.012 (defined ones 0.019-0.069), novel 0.030, treatise 0.028, memoir 0.023, poetry 0.008, drama 0.007. Not sizeConfounded (G1 rho tokens 0.19, unit length -0.40), nearest rival phys.voidRescue (rho 0.92), no planted world exercises it.
// WHAT I HAVE SEEN (disclosure; predictions are informed by atlas data and are blind only to the siblings). (1) PROTOCOL.md, lib/pocket.mjs, run-atlas.mjs, laws/para.mjs (header text, KNOWN LIMITS), _para_prep.mjs, _para_bag.mjs (the statistic's code).
//  (2) The law-table row of para.formulaCov and the selection block. (3) From results/atlas/*.json: v, nullMean, nullSd and z (both halves) of para.formulaCov for ALL pockets, summarised by register (defined / undefined counts, quantiles of v), the individual values of the
//  atlas code pockets (cd-cc-c 0.42, cpp 0.29, go 0.35, java 0.41, javascript 0.27, python 0.37, ruby 0.38, rust 0.22, cd-e09-c 0.15, e09-cpp 0.14, e09-eoapp-js 0.16, e09-go 0.13, e09-python 0.38; every z in the hundreds), and the share of DEFINED z by pocket size for the prose-like
//  registers (novel, memoir, treatise, reportage, essay, history, book, biography, children, drama, treebank, poetry): tokens < 30k 0 of 32, 30-60k 10 of 50, 60-100k 9 of 29, 100-200k 23 of 39, >= 200k 24 of 26; atlas ud-* cells (dev+test) including the stems whose TRAIN split I use below.
//  (4) For the siblings ONLY sizes (logs/sizes-*.out) and the notes the loaders put in meta (candidate-file counts, dedupe counts); NO para statistic of any kind. (5) I read the header text (first 6000 characters) of results/confirm-para.prefixCopy/confirm.mjs, which names ITS siblings
//  (sp-*: other JS repositories, the-fold venv Python, misfiled English books, UD train splits of the 19 thin stems); I opened no numeric result of any other confirmation and no para statistic computed on any sp-* or ec-* pocket. sf-en-poe2 / mouret / waikna / chopin are the same TEXTS as sp-en-poe-works2 /
//  zola-mouret / waikna / chopin-awakening (the misfiled English books are otherwise used up: the other files are atlas texts, a slang dictionary, plays or under the floor) but under new ids (new halves, new null seeds); sf-en-shakespeare is the same plays as ec-en-shakespeare under a new id.
// SIBLINGS (loaders/_sibling-fcov-{code,prose,ud,docs}.mjs; underscore: ignored by the atlas; none read by any atlas pocket; ids "sf-*"; sizes tokens / units / documents / vocabulary / mean unit length as built; sha256 of the four loader files frozen below):
//  CODE (atlas kind: PRESENT+ 47/47; unit = physical line, document = file, atlas cd-cc-* tokenisation; exact-bytes dedupe against the atlas code corpus and ethos 09; pockets disjoint by file): sf-js-misc 293206 / 36496 / 180 / 15168 / 8.03 (JavaScript of 13 of the user's other repositories),
//   sf-c-sdk 292093 / 55223 / 307 / 24944 / 5.29 (macOS 14.4 SDK usr/include C headers: licence boilerplate in most files), sf-py-myenv 292330 / 64228 / 219 / 16253 / 4.55 (third-party Python in /Users/mlacy/myenv), sf-py-nbvenv 292516 / 67561 / 199 / 27322 / 4.33 (third-party Python in the notebook venv).
//  DOCS (atlas kind: cd-cc-markdown, cd-e09-docs, PRESENT+ 2/2): sf-md-docs 296429 / 13378 / 286 / 13394 / 22.16 (Markdown files of the user's repositories, sentences as units; templated agent-written documents are in it).
//  PROSE (atlas kind: novel / reportage; English books misfiled in ethos 11): sf-en-poe2 96647 / 4199 / 42 / 10270 / 23.0, sf-en-mouret 128496 / 8046 / 80 / 9965 / 15.97, sf-en-waikna 85322 / 3386 / 34 / 9140 / 25.2, sf-en-chopin 64408 / 4440 / 44 / 6863 / 14.5.
//  DRAMA (atlas kind: the one AMBIGUOUS cell and 11 z-undefined pockets are drama): sf-en-shakespeare 299990 / 24000 / 240 / 16470 / 12.5 (35 plays; Henry IV Part 1, an atlas text, left out).
//  TREEBANK (atlas kind: treebank; UD TRAIN splits of eight stems whose atlas pocket read dev+test only; fixed list chosen before any statistic): sf-ud-eng 176883 / 12470 / 499, sf-ud-deu 222711 / 13811 / 553, sf-ud-fra 299897 / 14100 / 564, sf-ud-spa 299978 / 11000 / 440,
//   sf-ud-por 216033 / 9615 / 385, sf-ud-cat 299927 / 10400 / 416, sf-ud-pol 232578 / 17722 / 709, sf-ud-nob 212469 / 15685 / 628 (tokens / units / documents; leak counts against dev+test are recorded in the sibling JSON).
//  KIND WHERE THE LAW IS ABSENT: none exists. The atlas has 0 ABSENT cells (0 of 243 defined). The nearest kinds are the WEAK ones, where v is 10 times smaller and z is undefined in most pockets: prose, drama, treebank. They serve as the weak-kind siblings (13 of the 18: 4 books, 1 drama, 8 treebanks; the other 5 are code and docs).
//  sha256 of loader files: _sibling-fcov-code.mjs cccaad622a50148055265d39cb6d100fe900707256eb6a9efa4b672ebfb8247f; _sibling-fcov-prose.mjs fc6dd413ac3c501182b9473bc2bcb72af721ace7f4c84b73b548ebba4910a6e2;
//   _sibling-fcov-ud.mjs d6b5a5e03aa5411fd3ad8cbcac1d795df630ec3138da514bf28a74a5735f78ce; _sibling-fcov-docs.mjs 86bdc4d8a04a5798f629aa60207de8b845b61e480c515ddc79dbc57a6b5839e3; lib/pocket.mjs 529a5bc7c80a4d01653aab9fa688598b5aa25fadc4a848b90cf7c85b34f78637;
//   laws/para.mjs 5c3ac3f52b6a594a54aa82ca53a539de11585e4b0c5dfa2e244fa9bf8858171b; laws/_para_bag.mjs 10470c9cca5152dfb573fb6949f0c6d8520ba45c39ba0ddc5e19c571b8295cb0; laws/_para_prep.mjs 008af5e381bc27d7481cc98ab8d1ca00eb2fbcf6b3ba6cba64bcc6d0e46ab78e.
// BLIND PREDICTIONS (fixed now; D = z defined in both halves; v = mean of the two halves' v).
//  P-CODE  sf-js-misc, sf-c-sdk, sf-py-myenv, sf-py-nbvenv: D in all four (atlas code 47/47 defined; atlas 5%-quantile of the smaller half's z 222); status PRESENT+ in all four; v in [0.10, 0.65] each. Licence boilerplate (sf-c-sdk) may push v to the top of the range.
//  P-DOCS  sf-md-docs: D; PRESENT+; v in [0.04, 0.50].
//  P-WEAK  sf-en-poe2, sf-en-mouret, sf-en-waikna, sf-en-chopin, sf-en-shakespeare, sf-ud-{eng,deu,fra,spa,por,cat,pol,nob}: PRESENT+ IF D; v in [0.003, 0.12] each (atlas v 5/50/95% over prose-like pockets 0.003 / 0.025 / 0.105). No prediction that z is defined, only the expectation (not scored)
//   that D is likelier in the large ones: D expected for sf-en-shakespeare (halves ~150k tokens; atlas 100-200k bin 59% defined), sf-ud-fra, sf-ud-spa, sf-ud-cat (300k); D expected in about 40% of the four books (halves 32-64k tokens; atlas 30-100k bins 20-31% defined) and about 60% of the other five treebanks.
//  P-ORDER the constant is class-specific: median v of the four code siblings >= 3 times the median v of the five weak-prose siblings (4 books + shakespeare); expected ratio ~10 (0.35 / 0.03). Median v of the eight treebank siblings is reported against the code median as well.
//  P-NEG   no defined half-cell of any sibling has z < 0 (the atlas has none: its smallest half z is +3.79).
// PASS RULE. Let Dset = siblings with D. R1 PRESENCE: every sibling in Dset is PRESENT+; |Dset| >= 6; the four code siblings and sf-md-docs are all in Dset. R2: P-NEG holds. R3: P-ORDER holds. R4 RANGE: v inside its registered range for >= 80% of the siblings that have a finite v in both halves.
//  REPLICATES = R1 and R2 and R3 and R4 and no adversary downgrade. FAILS = fewer than 2/3 of Dset are PRESENT+, or any code sibling is not PRESENT+ (UNDEFINED, AMBIGUOUS, ABSENT or PRESENT-). PARTIAL = anything else, with the failed items and sibling ids listed.
//  ADVERSARY DOWNGRADE: any of A2, A3 below leaves fewer than 4 of the 5 strong-class siblings (4 code + sf-md-docs) PRESENT+ -> the verdict is at most PARTIAL and the scope is restated as repetition at the level that survived. A1 and A4 are reported and do not downgrade.
// ADVERSARIES (definitions fixed now; each is a transformation of a sibling pocket's units BEFORE the unchanged halves() split, document indices kept; same pocket id, same seeds; statistic recomputed exactly as above; no sibling statistic was seen).
//  A1 HEADER DROP     drop the first 20 units of every document (licence headers, imports, front matter).    A2 BOILERPLATE   drop every unit whose exact token sequence occurs in >= 5 different documents of the pocket.
//  A3 DEDUP           keep only the first occurrence of each distinct unit (exact token sequence) in the pocket (a cheaper rival: whole-line / whole-sentence duplication).    A4 SIZE   keep only documents with an even index.
//  A5 UNDEFINED SHARE report, per class, the share of (sibling, half) cells with z null and the share ABOVE-NULL; and the Spearman rho between z of formulaCov and z of para.refrain / para.dupShare (the cheaper rival statistics) over the siblings where both are defined.
// MULTIPLICITY. 18 siblings x 1 statistic x 2 halves. The atlas calibration on law-free iid halves has |z| >= 4 in 0.50% of defined cells (planted G0), so both halves PRESENT by chance is ~3e-5 per sibling: expected false PRESENT+ ~ 5e-4 over 18 siblings (binomial P(>= 1) ~ 5e-4); no adjustment needed.
// DETERMINISM. No Math.random, no Date; same input gives byte-identical output (sibling JSON carries no timings). SELF-CHECK: the same code is run on three atlas pockets (cd-e09-go, ud-glg, bk-treasure-island) and must reproduce results/atlas/<id>.json cells for every para statistic exactly.
// ==== END OF PRE-REGISTRATION HEADER ====
// ---- code below the header (not part of the frozen hash; its sha256 is printed at each run) ----
//   node confirm.mjs main [--only id1,id2]      compute the para family for each sibling pocket -> siblings/<id>.json (resumable: --resume skips existing)
//   node confirm.mjs score                      apply the pre-registered pass rule to siblings/*.json (+ adversary/*.json when present) -> confirm-result.json
//   node confirm.mjs adversary [--only ids]     A1..A4 on the strong-class siblings (code + docs) -> adversary/<id>.json
//   node confirm.mjs selfcheck                  reproduce three atlas pockets exactly -> self-check.json
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf } from "../../lib/pocket.mjs";
import * as para from "../../laws/para.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), LOADERS = path.resolve(HERE, "../../loaders"), ATLAS = path.resolve(HERE, "../atlas");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const argv = process.argv.slice(2), mode = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ONLY = opt("--only", null)?.split(","), RESUME = argv.includes("--resume"), DRAWS = 10;
const MARK = "// ==== END OF PRE-REGISTRATION HEADER ====\n";
const SELF = fs.readFileSync(fileURLToPath(import.meta.url), "utf8"), HEADER = SELF.slice(0, SELF.indexOf(MARK));
const FROZEN = fs.readFileSync(path.join(HERE, "PREREG.sha256"), "utf8").trim();
if (sha(HEADER) !== FROZEN) { console.error(`PRE-REGISTRATION HEADER CHANGED: ${sha(HEADER)} != ${FROZEN}`); process.exit(2); }
console.error(`header sha256 ${FROZEN} verified; confirm.mjs sha256 ${sha(SELF)}`);

export const CLASSES = {
  code: ["sf-js-misc", "sf-c-sdk", "sf-py-myenv", "sf-py-nbvenv"], docs: ["sf-md-docs"],
  books: ["sf-en-poe2", "sf-en-mouret", "sf-en-waikna", "sf-en-chopin"], drama: ["sf-en-shakespeare"],
  treebank: ["eng", "deu", "fra", "spa", "por", "cat", "pol", "nob"].map((s) => `sf-ud-${s}`),
};
export const ALL_IDS = Object.values(CLASSES).flat();
export const LOADER_FILES = ["_sibling-fcov-code.mjs", "_sibling-fcov-prose.mjs", "_sibling-fcov-ud.mjs", "_sibling-fcov-docs.mjs"];
export const RANGE = (id) => (CLASSES.code.includes(id) ? [0.10, 0.65] : CLASSES.docs.includes(id) ? [0.04, 0.50] : [0.003, 0.12]);
const classOf = (id) => Object.keys(CLASSES).find((k) => CLASSES[k].includes(id));

/** Exactly run-atlas.mjs for one pocket and the para family: observed compute on each half, DRAWS draws per null kind with seed seedOf(id, which, FAMILY, kind, k), z = (v - mean)/sd (sd > 0), sample sd (n - 1). */
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
export function evalPocket(p, fam = para) {
  const meta = validate(p), res = { meta: { ...meta, group: p.group, register: p.register, language: p.language, extra: p.meta ?? null }, halves: {}, errors: [] };
  const H = halves(p);
  for (const which of ["discover", "confirm"]) {
    const view = H[which]; res.halves[which] = {};
    const obs = fam.compute(view), kinds = [...new Set(fam.STATS.map((s) => s.null))], draws = {};
    for (const kind of kinds) { draws[kind] = []; for (let k = 0; k < DRAWS; k++) draws[kind].push(fam.compute(nullView(view, kind, seedOf(p.id, which, fam.FAMILY, kind, k)))); }
    for (const s of fam.STATS) {
      const xs = draws[s.null].map((d) => d[s.id]).filter((x) => Number.isFinite(x)), v = obs[s.id];
      const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
      res.halves[which][`${fam.FAMILY}.${s.id}`] = { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
    }
    res.halves[which].views = { units: view.units.length, tokens: view.units.reduce((a, u) => a + u.length, 0), docs: new Set(view.docOf).size };
  }
  return res;
}
const STAT = "para.formulaCov";
/** PROTOCOL status of one result for one statistic key. */
export function statusOf(res, key = STAT) {
  const d = res.halves.discover[key], c = res.halves.confirm[key];
  if (!d || !c || d.v == null || c.v == null) return { status: "UNDEFINED", sub: "V-NULL" };
  if (d.z == null || c.z == null) return { status: "UNDEFINED", sub: d.v > (d.nullMean ?? Infinity) && c.v > (c.nullMean ?? Infinity) ? "ABOVE-NULL" : "NOT-ABOVE-NULL" };
  const z = [d.z, c.z];
  if (z.every((x) => x >= 4)) return { status: "PRESENT+" };
  if (z.every((x) => x <= -4)) return { status: "PRESENT-" };
  if (z.every((x) => Math.abs(x) < 2)) return { status: "ABSENT" };
  return { status: "AMBIGUOUS" };
}

const OUTD = path.join(HERE, "siblings"), ADVD = path.join(HERE, "adversary");
const loadSiblings = async (ids) => {
  const out = [];
  for (const f of LOADER_FILES) { const m = await import(pathToFileURL(path.join(LOADERS, f)).href); for (const p of await m.load(ids)) if (ids.includes(p.id)) out.push(p); }
  return out;
};
const brief = (res, id) => { const s = statusOf(res), d = res.halves.discover[STAT], c = res.halves.confirm[STAT]; return `${id}: ${s.status}${s.sub ? "/" + s.sub : ""} v ${d.v?.toFixed(4)} ${c.v?.toFixed(4)} z ${d.z?.toFixed(1) ?? "null"} ${c.z?.toFixed(1) ?? "null"}`; };

if (mode === "main") {
  fs.mkdirSync(OUTD, { recursive: true });
  const ids = (ONLY ?? ALL_IDS).filter((id) => !(RESUME && fs.existsSync(path.join(OUTD, `${id}.json`))));
  for (const p of await loadSiblings(ids)) {
    const res = evalPocket(p);
    res.meta.cls = classOf(p.id); res.meta.range = RANGE(p.id);
    fs.writeFileSync(path.join(OUTD, `${p.id}.json`), JSON.stringify(res));
    console.error(brief(res, p.id));
  }
}

if (mode === "selfcheck") {
  const specs = [["codemisc.mjs", "cd-e09-go"], ["ud.mjs", "ud-glg"], ["books.mjs", "bk-treasure-island"]], out = { pockets: {}, allIdentical: true };
  for (const [f, id] of specs) {
    const m = await import(pathToFileURL(path.join(LOADERS, f)).href), p = (await m.load([id])).find((x) => x.id === id);
    const mine = evalPocket(p), atlas = JSON.parse(fs.readFileSync(path.join(ATLAS, `${id}.json`), "utf8")), diffs = [];
    for (const which of ["discover", "confirm"]) for (const s of para.STATS) {
      const k = `para.${s.id}`, a = atlas.halves[which][k], b = mine.halves[which][k];
      for (const f2 of ["v", "nullMean", "nullSd", "z", "n"]) if (a[f2] !== b[f2]) diffs.push({ which, k, field: f2, atlas: a[f2], mine: b[f2] });
    }
    out.pockets[id] = { cells: 2 * para.STATS.length, diffs: diffs.length, formulaCov: { discover: mine.halves.discover[STAT], confirm: mine.halves.confirm[STAT] }, firstDiffs: diffs.slice(0, 5) };
    if (diffs.length) out.allIdentical = false;
    console.error(`${id}: ${diffs.length} differing fields of ${out.pockets[id].cells * 5}`);
  }
  fs.writeFileSync(path.join(HERE, "self-check.json"), JSON.stringify(out, null, 1));
}

// ---- adversary: the transformations A1..A4 of the header (units dropped; document indices kept, so halves() splits identically) ----
const keyOf = (u) => u.join(" ");
const keep = (p, pred) => { const units = [], docOf = []; p.units.forEach((u, k) => { if (pred(u, k)) { units.push(u); docOf.push(p.docOf[k]); } }); return { ...p, units, docOf }; };
export const TRANSFORMS = {
  A1: (p) => { const seen = new Map(); return keep(p, (u, k) => { const d = p.docOf[k], n = seen.get(d) ?? 0; seen.set(d, n + 1); return n >= 20; }); },
  A2: (p) => { const docs = new Map(); p.units.forEach((u, k) => { const s = keyOf(u); if (!docs.has(s)) docs.set(s, new Set()); docs.get(s).add(p.docOf[k]); }); return keep(p, (u) => docs.get(keyOf(u)).size < 5); },
  A3: (p) => { const seen = new Set(); return keep(p, (u) => { const s = keyOf(u); if (seen.has(s)) return false; seen.add(s); return true; }); },
  A4: (p) => keep(p, (u, k) => p.docOf[k] % 2 === 0),
};
if (mode === "adversary") {
  fs.mkdirSync(ADVD, { recursive: true });
  const ids = ONLY ?? ALL_IDS;
  for (const p of await loadSiblings(ids)) {
    const out = { id: p.id, cls: classOf(p.id), tokensBefore: p.units.reduce((a, u) => a + u.length, 0), unitsBefore: p.units.length, transforms: {} };
    for (const [name, f] of Object.entries(TRANSFORMS)) {
      const q = f(p), v = validate(q), res = evalPocket(q), s = statusOf(res);
      out.transforms[name] = { tokens: v.tokens, units: v.units, docs: v.docs, status: s.status, sub: s.sub ?? null, discover: res.halves.discover[STAT], confirm: res.halves.confirm[STAT] };
      console.error(`${p.id} ${name}: ${v.tokens} tokens ${s.status}${s.sub ? "/" + s.sub : ""} z ${res.halves.discover[STAT].z?.toFixed(1) ?? "null"} ${res.halves.confirm[STAT].z?.toFixed(1) ?? "null"} v ${res.halves.discover[STAT].v?.toFixed(4)} ${res.halves.confirm[STAT].v?.toFixed(4)}`);
    }
    fs.writeFileSync(path.join(ADVD, `${p.id}.json`), JSON.stringify(out));
  }
}

// ---- score: the pre-registered pass rule (R1..R4, adversary downgrade) ----
const median = (a) => { a = a.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[a.length >> 1] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const ranks = (a) => { const ix = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const spearman = (x, y) => { if (x.length < 4) return null; const a = ranks(x), b = ranks(y), n = a.length, ma = a.reduce((s, t) => s + t, 0) / n, mb = b.reduce((s, t) => s + t, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa && sbb ? sab / Math.sqrt(saa * sbb) : null; };
if (mode === "score") {
  const R = {}; for (const id of ALL_IDS) R[id] = JSON.parse(fs.readFileSync(path.join(OUTD, `${id}.json`), "utf8"));
  const rows = ALL_IDS.map((id) => {
    const r = R[id], d = r.halves.discover[STAT], c = r.halves.confirm[STAT], s = statusOf(r), rg = RANGE(id);
    const v = d.v != null && c.v != null ? (d.v + c.v) / 2 : null;
    return { id, cls: classOf(id), tokens: r.meta.tokens, status: s.status, sub: s.sub ?? null, vDiscover: d.v, vConfirm: c.v, v, zDiscover: d.z, zConfirm: c.z, nullMeanDiscover: d.nullMean, nullMeanConfirm: c.nullMean, nullSdDiscover: d.nullSd, nullSdConfirm: c.nullSd, range: rg, inRange: v == null ? null : v >= rg[0] && v <= rg[1] };
  });
  const D = rows.filter((r) => r.status !== "UNDEFINED"), hits = D.filter((r) => r.status === "PRESENT+"), strong = [...CLASSES.code, ...CLASSES.docs];
  const negCells = rows.flatMap((r) => [["discover", r.zDiscover], ["confirm", r.zConfirm]].filter(([, z]) => z != null && z < 0).map(([w, z]) => ({ id: r.id, half: w, z })));
  const vCode = median(rows.filter((r) => r.cls === "code").map((r) => r.v)), weak = rows.filter((r) => r.cls === "books" || r.cls === "drama");
  const vWeak = median(weak.map((r) => r.v)), vTb = median(rows.filter((r) => r.cls === "treebank").map((r) => r.v)), vDocs = median(rows.filter((r) => r.cls === "docs").map((r) => r.v));
  const finite = rows.filter((r) => r.v != null), nIn = finite.filter((r) => r.inRange).length;
  const R1 = { allDPresent: D.every((r) => r.status === "PRESENT+"), nD: D.length, nDge6: D.length >= 6, strongAllD: strong.every((id) => D.some((r) => r.id === id)) };
  R1.pass = R1.allDPresent && R1.nDge6 && R1.strongAllD;
  const R2 = { negativeCells: negCells, pass: negCells.length === 0 };
  const R3 = { medianVcode: vCode, medianVweakProse: vWeak, ratio: vCode / vWeak, medianVtreebank: vTb, ratioCodeOverTreebank: vCode / vTb, medianVdocs: vDocs, pass: vCode >= 3 * vWeak };
  const R4 = { inRange: nIn, finite: finite.length, share: nIn / finite.length, outOfRange: finite.filter((r) => !r.inRange).map((r) => ({ id: r.id, v: r.v, range: r.range })), pass: nIn / finite.length >= 0.8 };
  // adversary
  const ADV = {}; for (const id of ALL_IDS) { const f = path.join(ADVD, `${id}.json`); if (fs.existsSync(f)) ADV[id] = JSON.parse(fs.readFileSync(f, "utf8")); }
  const adv = { present: Object.keys(ADV).length === ALL_IDS.length, byTransform: {} };
  for (const t of Object.keys(TRANSFORMS)) {
    adv.byTransform[t] = { strongPresent: strong.filter((id) => ADV[id]?.transforms[t].status === "PRESENT+").length, strongOf: strong.length,
      allStatuses: Object.fromEntries(ALL_IDS.filter((id) => ADV[id]).map((id) => [id, ADV[id].transforms[t].status + (ADV[id].transforms[t].sub ? "/" + ADV[id].transforms[t].sub : "")])),
      vRetained: Object.fromEntries(strong.filter((id) => ADV[id]).map((id) => { const x = ADV[id].transforms[t], v0 = rows.find((r) => r.id === id).v; const vv = x.discover.v != null && x.confirm.v != null ? (x.discover.v + x.confirm.v) / 2 : null; return [id, vv == null ? null : +(vv / v0).toFixed(3)]; })) };
  }
  adv.downgrade = adv.present ? (adv.byTransform.A2.strongPresent < 4 || adv.byTransform.A3.strongPresent < 4) : null;
  // A5
  const cls = {}; for (const r of rows) { const o = (cls[r.cls] ??= { siblings: 0, cells: 0, undefinedCells: 0, aboveNullCells: 0 }); o.siblings++; for (const w of ["discover", "confirm"]) { const x = R[r.id].halves[w][STAT]; o.cells++; if (x.z == null) { o.undefinedCells++; if (x.v != null && x.nullMean != null && x.v > x.nullMean) o.aboveNullCells++; } } }
  const both = (key) => ALL_IDS.map((id) => { const a = R[id].halves, f = (w, k) => a[w][k].z; const ok = ["discover", "confirm"].every((w) => f(w, STAT) != null && f(w, key) != null); return ok ? [(f("discover", STAT) + f("confirm", STAT)) / 2, (f("discover", key) + f("confirm", key)) / 2] : null; }).filter(Boolean);
  const rivals = Object.fromEntries(["para.refrain", "para.dupShare"].map((k) => { const p = both(k); return [k, { n: p.length, spearmanZ: spearman(p.map((q) => q[0]), p.map((q) => q[1])) }]; }));
  const leakUd = Object.fromEntries(CLASSES.treebank.map((id) => [id, R[id].meta.extra?.leak ?? null]));
  const failures = [];
  if (!R1.pass) failures.push({ rule: "R1", detail: R1, notPresent: D.filter((r) => r.status !== "PRESENT+").map((r) => `${r.id}:${r.status}`), strongNotDetermined: strong.filter((id) => !D.some((r) => r.id === id)) });
  if (!R2.pass) failures.push({ rule: "R2", detail: negCells });
  if (!R3.pass) failures.push({ rule: "R3", detail: R3 });
  if (!R4.pass) failures.push({ rule: "R4", detail: R4.outOfRange });
  if (adv.downgrade) failures.push({ rule: "ADVERSARY", detail: { A2: adv.byTransform.A2.strongPresent, A3: adv.byTransform.A3.strongPresent } });
  const codeAllPresent = CLASSES.code.every((id) => rows.find((r) => r.id === id).status === "PRESENT+");
  const verdict = (hits.length < (2 / 3) * D.length || !codeAllPresent) ? "FAILS" : failures.length === 0 ? "REPLICATES" : "PARTIAL";
  const result = { stat: STAT, headerSha256: FROZEN, protocolSha256: "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc", verdict, nSiblings: rows.length, nDetermined: D.length, nPresentPlus: hits.length,
    undefinedSiblings: rows.filter((r) => r.status === "UNDEFINED").map((r) => `${r.id}:${r.sub}`), R1, R2, R3, R4, adversary: adv, undefinedShareByClass: cls, rivalSpearman: rivals, udLeak: leakUd, failures, rows };
  fs.writeFileSync(path.join(HERE, "confirm-result.json"), JSON.stringify(result, null, 1));
  console.error(`verdict ${verdict}: ${hits.length} PRESENT+ of ${D.length} determined (${rows.length} siblings); R1 ${R1.pass} R2 ${R2.pass} R3 ${R3.pass} (${R3.ratio?.toFixed(1)}x) R4 ${R4.pass} (${nIn}/${finite.length}) adversaryDowngrade ${adv.downgrade}`);
}
