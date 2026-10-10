// results/confirm-fig.introRight/confirm.mjs — SIBLING REPLICATION of the atlas law fig.introRight. The PRE-REGISTRATION HEADER is everything above the END marker line; the code below it computes.
// PRE-REGISTRATION (written 2026-10-07 before any fig statistic was computed on any sibling pocket, and before the sibling pockets were run through ANY statistic).
//
// STATISTIC. fig.introRight = laws/fig.mjs STATS id "introRight": stratified standardised difference in RIGHT-company rank bin between the first occurrence of a type that goes on to recur and the first occurrence of a hapax (strata: 8 unit-index buckets x position class x
//  unit-length class), NULL "within-unit" (laws/_fig_adj.mjs). Per half: v, nullMean/nullSd over 10 within-unit draws, z = (v - nullMean)/nullSd. Defined cell = finite v and finite z in both halves (FIXES.md 0.4a). d := mean over the two halves of (v - nullMean) (excess over the null).
//  Cell status (PROTOCOL): PRESENT+ / PRESENT- = |z| >= 4 in BOTH halves with the same sign; ABSENT = |z| < 2 in both halves; AMBIGUOUS = anything else; UNDEFINED = not a defined cell (never scored). Halves = lib/pocket.mjs halves() (document hash parity).
// LAW UNDER TEST (atlas row, results/law-table.json, PROTOCOL.md sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc): REVERSAL+POCKET-SPECIFIC, PRESENT in 31 of 384 pockets (14+, 17-), shared property register (eta2 0.25, p<0.001): code 11+ / 2- of 47; diagram 5- of 7;
//  novels, memoirs, dramas, chat, treebanks, scripture 0 PRESENT; word-grain pockets 5 of 296. Heterogeneity 2.38 (rank 1), medianMinZ 0.94 (a weak candidate), not sizeConfounded, no planted world exercises it. Rival: fig.introLeft (rho 0.49 over atlas pockets).
//
// WHAT I HAVE SEEN (disclosure). (1) PROTOCOL.md, lib/pocket.mjs, run-atlas.mjs, laws/fig.mjs + _fig_adj/_fig_prep/_fig_init (the family's own documentation of dev-data tests; no sibling). (2) The law-table row of fig.introRight and, from results/atlas/*.json, the per-pocket v, nullMean, z of fig.introRight in
//  ALL code, diagram, markup, config and notation pockets, and quantiles for the ud and bk groups. From them the ranges below were drawn: among 47 code pockets 30 have z>0 in both halves, 10 z<0 in both, 7 mixed; atlas JS-like pockets (cd-cc-javascript z 6.7/3.7, cd-e09-eoapp-js 5.3/3.5, cd-cc-typescript 6.6/2.7) and
//  cd-cc-python (5.1/11.4) are positive; the four BPMN pockets cd-bpmn-{miwg,kogito,activiti,camunda} are PRESENT- (d -0.67..-0.36). Predictions are therefore informed by atlas data, and are blind only to the siblings. (3) For the siblings I have seen ONLY sizes (tokens, units, documents, vocabulary), file lists, the first and last
//  units of the English books (to cut front and back matter), the token count of the repositories' svg files (2,171), and the leftover sizes of the BPMN corpora. NO fig statistic of any kind has been computed on any sibling pocket or on any file of eoreader7, heimdall or the-fold.
// SIBLINGS (loaders/_sibling-*.mjs; all underscore-ignored; none read by the atlas; sizes in tokens/documents):
//  CODE (independent corpora, authored by the user + AI assistants; three JS pockets are NOT independent of each other, they share authorship and conventions): sib-js-fold 291340/151, sib-js-heimdall 160415/99, sib-js-eoreader7 294591/174 (checkout eoreader7-latest: /3.0/eoreader7 holds only
//   JSON), sib-py-foldvenv 292993/275 (third-party Python in the-fold/scripts/pii/.venv, data modules excluded by location). Exact-bytes dedupe against code corpus JS/TS/Python/HTML/Bash + ethos 09 files and across siblings.
//  DIAGRAM (held-out DOCUMENTS of the atlas's own BPMN corpora, i.e. the files the atlas pockets did not take: same exporter families, NOT new worlds): sib-bpmn-miwg-heldout 292035/100, sib-bpmn-kogito-heldout 161917/190, sib-bpmn-activiti-heldout 68568/233. UNTESTABLE as independent diagram worlds: the .svg files of the three repositories total 2,171 tokens
//   (< 20,000 floor), there are no .bpmn/.drawio/.dot files there, cd-dot/cd-mermaid/cd-sbgn/cd-bpmn-camunda were read whole by the atlas.
//  NATURAL LANGUAGE, ABSENT KIND. UD TRAIN splits (atlas read dev+test only) of the stems the atlas dropped as thin: sib-ud-{afr 30498/53, ces 299945/691, dan 68296/175, ell 37783/66, gle 85922/160, hye 65187/175, ita 240871/523, kat 33092/89, lit 37825/94, mlt 20056/45, nld 163958/492, rus 58306/154, tur 30973/138, wol 20635/48}-train (14);
//   English books misfiled in ethos 11-multi-language/gutenberg-non-en and skipped by the atlas: sib-en-{poe-works2 96647/42, chopin-awakening 64408/44, hesse-siddhartha 39270/30, zola-mouret 128496/80, waikna 85322/34, aesop-stickney 29256/30, warren-forces 35736/30, about-london 55661/30, kafka-metamorphosis 22048/29, cary-dante 108709/44} (10).
//   Not scored (thin under 20,000 tokens or 20 documents, reported only): UD hun, mar, tam, tel, uig train; sib-en-evolution-plain. Excluded on reading the text: the file named Zarathustra is Pride and Prejudice (= atlas bk-pride-prej), nl/pg1232 = bk-prince, it/pg174 = bk-dorian-gray, fr/pg42108 is a slang dictionary (lexicon register), plays (Doll's House, Lysistrata, James IV).
// BLIND PREDICTIONS (per sibling; sign is the sign of z, a PRESENT/ABSENT status is as defined above; d range = hard range for the constant, point guess in brackets):
//  P-CODE (each of the 4): z > 0 in BOTH halves (excess above the within-unit null), never PRESENT-; d in [0.00, 0.45] [guess 0.09]. Expected PRESENT+ in about 1 of 3 (atlas rate 0.23 per code pocket, 0.37 given z>0 in both); I expect sib-py-foldvenv and the JS pockets to be PRESENT+ or AMBIGUOUS-with-both-z>0, not ABSENT-by-reversal. At least 1 of 4 PRESENT+ (power clause).
//  P-DIAGRAM (each of the 3): PRESENT- (z <= -4 in both halves); d in [-0.85, -0.25] [guess -0.40].
//  P-NL (each of the 24 scored): status ABSENT or AMBIGUOUS (not PRESENT of either sign); d in [-0.12, 0.12] [guess 0]; ABSENT in >= 35% of the UD-train siblings and >= 50% of the English books (atlas: ud 18/34, bk 57/81; reported, not gating).
// PASS RULE. Class CODE holds iff all defined code siblings satisfy P-CODE and at least one is PRESENT+. Class DIAGRAM holds iff all defined diagram siblings are PRESENT-. Class NL holds iff at least 90% of defined NL siblings are not PRESENT and none is PRESENT+ (reference: at the atlas word-grain rate 5/296 PRESENT and 2/296 PRESENT+, a lone PRESENT+ among 24
//  has probability about 0.15, so such a lone hit would fail the class by this rule and be read with that reference). VERDICT: REPLICATES iff CODE and DIAGRAM and NL all hold; PARTIAL iff at least one of CODE, DIAGRAM holds but not all three (the verdict names which); FAILS iff neither CODE nor DIAGRAM holds. DIAGRAM alone (held-out documents) never lifts a verdict to REPLICATES
//  without CODE. The d ranges are scored and reported (hit/miss per sibling) but do not gate. Per-sibling results are reported whatever the verdict.
// COMPUTATION. As run-atlas.mjs: pocket -> halves(); for each half fam.compute(view); 10 draws per null kind, kinds = those in laws/fig.mjs STATS (within-unit, unit-order), nullView(view, kind, seedOf(pocketId, which, "fig", kind, k)), k = 0..9; stat() mean and sd (n-1). Primary scoring uses ONLY these 10-draw cells.
//  SUPPLEMENTARY (reported, not scored): the within-unit draws extended to k = 0..49 (z50); introLeft and introLeftFq cells; hapax share of types, mean unit length, tokens. HARNESS CHECK before scoring: the same code must reproduce results/atlas/cd-mermaid.json and cd-e09-go.json fig.introRight (v, nullMean, nullSd, z both halves) to 1e-9, else nothing is scored.
// ADVERSARY (reported, not gating): (a) rival fig.introLeft and introLeftFq z next to introRight, rho(z_introRight, z_introLeft) over the sibling cells (atlas rho 0.49); (b) unit length, tokens, hapax share against z (size/length/identifier-versus-literal-mix proxy: hapax share needs no word list); (c) leakage: dedupe counts and held-out construction above;
//  (d) multiplicity: 31 scored sibling cells x the instrument's null PRESENT rate 8.5e-5 = 0.003 false PRESENT expected, but the atlas PRESENT rate in word-grain pockets 5/296 is the realistic reference for the NL class (P(>=3 of 24) = 0.01); (e) the within-unit null sd does not include document sampling variance, so z is read together with the half-to-half sign agreement and d.
// No threshold, sibling, prediction or rule above is changed after any sibling statistic is seen; deviations, if any, are logged in the output JSON field "deviations".
export const PREREG = Object.freeze({
  stat: "fig.introRight", protocolSha256: "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc", draws: 10, supplementaryDraws: 50,
  code: ["sib-js-fold", "sib-js-heimdall", "sib-js-eoreader7", "sib-py-foldvenv"], diagram: ["sib-bpmn-miwg-heldout", "sib-bpmn-kogito-heldout", "sib-bpmn-activiti-heldout"],
  ud: ["afr", "ces", "dan", "ell", "gle", "hye", "ita", "kat", "lit", "mlt", "nld", "rus", "tur", "wol"].map((s) => `sib-ud-${s}-train`),
  en: ["poe-works2", "chopin-awakening", "hesse-siddhartha", "zola-mouret", "waikna", "aesop-stickney", "warren-forces", "about-london", "kafka-metamorphosis", "cary-dante"].map((s) => `sib-en-${s}`),
  notScoredThin: ["sib-ud-hun-train", "sib-ud-mar-train", "sib-ud-tam-train", "sib-ud-tel-train", "sib-ud-uig-train", "sib-en-evolution-plain"],
  dRange: { code: [0, 0.45], diagram: [-0.85, -0.25], nl: [-0.12, 0.12] },
  harnessCheck: ["cd-mermaid", "cd-e09-go"],
});
// ===== END OF PRE-REGISTRATION HEADER (sha256 of every byte above this line is recorded in PREREG.sha256) =====

// ---------------------------------------------------------------- computation (below the pre-registration header)
//   node confirm.mjs --harness                 reproduce atlas cells of PREREG.harnessCheck (writes harness.json)
//   node confirm.mjs --run id1,id2,...         compute siblings (writes siblings/<id>.json)
//   node confirm.mjs --score                   aggregate siblings/*.json -> confirm-result.json (+ table on stdout)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf } from "../../lib/pocket.mjs";
import * as fig from "../../laws/fig.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), POCKETS = path.resolve(HERE, "../..");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ALL = [...PREREG.code, ...PREREG.diagram, ...PREREG.ud, ...PREREG.en], STAT = "fig.introRight";
const LOADER = (id) => (id.startsWith("sib-js-") ? "_sibling-js" : id.startsWith("sib-py-") ? "_sibling-py" : id.startsWith("sib-bpmn-") ? "_sibling-bpmn" : id.startsWith("sib-ud-") ? "_sibling-ud" : id.startsWith("sib-en-") ? "_sibling-en" : "codemisc");
async function loadPocket(id) {
  const m = await import(pathToFileURL(path.join(POCKETS, "loaders", `${LOADER(id)}.mjs`)).href);
  const ps = await m.load([id]);
  if (ps.length !== 1) throw new Error(`loader ${LOADER(id)} returned ${ps.length} pockets for ${id}`);
  return ps[0];
}
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };   // as run-atlas.mjs
const cellOf = (v, xs) => { const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN }; return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length }; };
const INTRO = ["introRight", "introLeft", "introLeftFq"];

/** exactly the run-atlas.mjs loop for family "fig" on one half; supplementary = within-unit draws k = 10..49 for the intro statistics. */
function halfCells(p, which, view, supplementary) {
  const obs = fig.compute(view), kinds = [...new Set(fig.STATS.map((s) => s.null))], draws = {}, cells = {};
  for (const kind of kinds) { draws[kind] = []; for (let k = 0; k < PREREG.draws; k++) draws[kind].push(fig.compute(nullView(view, kind, seedOf(p.id, which, fig.FAMILY, kind, k)))); }
  for (const s of fig.STATS) cells[`fig.${s.id}`] = cellOf(obs[s.id], draws[s.null].map((d) => d[s.id]).filter(Number.isFinite));
  if (supplementary) {
    const extra = []; for (let k = PREREG.draws; k < PREREG.supplementaryDraws; k++) extra.push(fig.compute(nullView(view, "within-unit", seedOf(p.id, which, fig.FAMILY, "within-unit", k))));
    for (const id of INTRO) { const xs = [...draws["within-unit"], ...extra].map((d) => d[id]).filter(Number.isFinite), c = cellOf(obs[id], xs); cells[`fig.${id}`].z50 = c.z; cells[`fig.${id}`].nullMean50 = c.nullMean; cells[`fig.${id}`].nullSd50 = c.nullSd; cells[`fig.${id}`].n50 = c.n; }
  }
  return cells;
}
function profile(p) {
  const cnt = new Map(); let N = 0;
  for (const u of p.units) for (const w of u) { cnt.set(w, (cnt.get(w) || 0) + 1); N++; }
  let hap = 0; for (const c of cnt.values()) if (c === 1) hap++;
  return { tokens: N, units: p.units.length, docs: new Set(p.docOf).size, meanUnitLength: +(N / p.units.length).toFixed(3), types: cnt.size, hapaxShareOfTypes: +(hap / cnt.size).toFixed(4), hapaxShareOfTokens: +(hap / N).toFixed(4) };
}

// ---- status and scoring (definitions of the header)
const finite = Number.isFinite;
export function statusOf(a, b) {
  if (!a || !b || a.v == null || b.v == null || !finite(a.z) || !finite(b.z)) return "UNDEFINED";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && Math.sign(a.z) === Math.sign(b.z)) return a.z > 0 ? "PRESENT+" : "PRESENT-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "ABSENT";
  return "AMBIGUOUS";
}
const dOf = (a, b) => (a?.v == null || b?.v == null || a.nullMean == null || b.nullMean == null ? null : ((a.v - a.nullMean) + (b.v - b.nullMean)) / 2);
const klass = (id) => (PREREG.code.includes(id) ? "code" : PREREG.diagram.includes(id) ? "diagram" : "nl");
const inRange = (d, r) => d != null && d >= r[0] && d <= r[1];
/** per-sibling prediction of the header: code = z > 0 in both halves (hence never PRESENT-); diagram = PRESENT-; nl = not PRESENT of either sign. null for UNDEFINED. */
export function holds(id, rec) {
  const c = klass(id);
  if (rec.status === "UNDEFINED") return null;
  if (c === "code") return rec.zDiscover > 0 && rec.zConfirm > 0;
  if (c === "diagram") return rec.status === "PRESENT-";
  return rec.status === "ABSENT" || rec.status === "AMBIGUOUS";
}

async function runOne(id, supplementary) {
  const t0 = Date.now(), p = await loadPocket(id), v = validate(p), H = halves(p), prof = profile(p);
  const out = { id, group: p.group, register: p.register, language: p.language, script: p.script ?? null, profile: prof, thin: v.thin, loader: LOADER(id), meta: { tokenisation: p.meta?.tokenisation, docDef: p.meta?.docDef, source: p.meta?.source, notes: p.meta?.notes }, halfProfile: {}, halves: {} };
  for (const which of ["discover", "confirm"]) { out.halfProfile[which] = { tokens: H[which].units.reduce((n, u) => n + u.length, 0), units: H[which].units.length, docs: new Set(H[which].docOf).size }; out.halves[which] = halfCells(p, which, H[which], supplementary); }
  const a = out.halves.discover[STAT], b = out.halves.confirm[STAT];
  out.introRight = { status: statusOf(a, b), d: dOf(a, b), zDiscover: a.z, zConfirm: b.z, vDiscover: a.v, vConfirm: b.v };
  console.error(`${id}: ${prof.tokens} tokens ${((Date.now() - t0) / 1000).toFixed(1)} s ${out.introRight.status} z=(${a.z?.toFixed(2)}, ${b.z?.toFixed(2)}) d=${out.introRight.d?.toFixed(3)}`);
  return out;
}

async function harness() {
  const rows = [];
  for (const id of PREREG.harnessCheck) {
    const p = await loadPocket(id), H = halves(p), atlas = JSON.parse(fs.readFileSync(path.join(POCKETS, "results/atlas", `${id}.json`), "utf8")), row = { id, maxAbsDiff: 0, cells: {} };
    for (const which of ["discover", "confirm"]) {
      const mine = halfCells(p, which, H[which], false)[STAT], ref = atlas.halves[which][STAT];
      row.cells[which] = { mine, atlas: ref };
      for (const k of ["v", "nullMean", "nullSd", "z"]) row.maxAbsDiff = Math.max(row.maxAbsDiff, Math.abs(mine[k] - ref[k]));
    }
    rows.push(row); console.error(`harness ${id}: max |diff| = ${row.maxAbsDiff}`);
  }
  const pass = rows.every((r) => r.maxAbsDiff <= 1e-9);
  fs.writeFileSync(path.join(HERE, "harness.json"), JSON.stringify({ pass, tolerance: 1e-9, rows }, null, 1)); console.error(`HARNESS ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

// ---- aggregation
const rank = (xs) => { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const pearson = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null; };
const spearman = (x, y) => (x.length >= 4 ? pearson(rank(x), rank(y)) : null);
const binomTail = (n, p, k) => { let s = 0, c = 1; for (let i = 0; i < k; i++) { s += c * p ** i * (1 - p) ** (n - i); c = (c * (n - i)) / (i + 1); } return 1 - s; };   // P(X >= k)
const round = (x, d = 4) => (x == null ? null : +x.toFixed(d));

function score() {
  const dir = path.join(HERE, "siblings"), recs = [], missing = [];
  for (const id of ALL) { const f = path.join(dir, `${id}.json`); if (fs.existsSync(f)) recs.push(JSON.parse(fs.readFileSync(f, "utf8"))); else missing.push(id); }
  const rows = recs.map((r) => {
    const R = r.introRight, c = klass(r.id), h = holds(r.id, R), range = PREREG.dRange[c], L = r.halves.discover["fig.introLeft"], L2 = r.halves.confirm["fig.introLeft"], Q = r.halves.discover["fig.introLeftFq"], Q2 = r.halves.confirm["fig.introLeftFq"];
    const a = r.halves.discover[STAT], b = r.halves.confirm[STAT], z50 = { ...a, z: a.z50 }, z50b = { ...b, z: b.z50 };
    return { id: r.id, class: c, tokens: r.profile.tokens, status: R.status, zDiscover: round(R.zDiscover, 2), zConfirm: round(R.zConfirm, 2), vDiscover: round(R.vDiscover), vConfirm: round(R.vConfirm), d: round(R.d), predictionHolds: h, dInRange: inRange(R.d, range),
      z50: [round(a.z50, 2), round(b.z50, 2)], status50: statusOf(z50, z50b), nullSd: [round(a.nullSd), round(b.nullSd)],
      introLeft: { status: statusOf(L, L2), z: [round(L.z, 2), round(L2.z, 2)], v: [round(L.v), round(L2.v)], d: round(dOf(L, L2)) }, introLeftFq: { status: statusOf(Q, Q2), z: [round(Q.z, 2), round(Q2.z, 2)] },
      profile: r.profile, halfProfile: r.halfProfile, thin: r.thin };
  });
  const by = (c) => rows.filter((r) => r.class === c), def = (xs) => xs.filter((r) => r.predictionHolds !== null);
  const code = def(by("code")), dia = def(by("diagram")), nl = def(by("nl"));
  const nPlus = nl.filter((r) => r.status === "PRESENT+").length, nPres = nl.filter((r) => r.status.startsWith("PRESENT")).length;
  const CODE = code.length > 0 && code.every((r) => r.predictionHolds) && code.some((r) => r.status === "PRESENT+");
  const DIAGRAM = dia.length > 0 && dia.every((r) => r.predictionHolds);
  const NL = nl.length > 0 && (nl.length - nPres) / nl.length >= 0.9 && nPlus === 0;
  const verdict = CODE && DIAGRAM && NL ? "REPLICATES" : CODE || DIAGRAM ? "PARTIAL" : "FAILS";
  const cnt = (xs) => xs.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
  const udRows = nl.filter((r) => r.id.startsWith("sib-ud-")), enRows = nl.filter((r) => r.id.startsWith("sib-en-"));
  const pooled = rows.filter((r) => r.status !== "UNDEFINED");
  const zm = (r) => (r.zDiscover + r.zConfirm) / 2, zl = (r) => (r.introLeft.z[0] + r.introLeft.z[1]) / 2;
  const rho = (f, g, set) => round(spearman(set.map(f), set.map(g)), 3);
  const cd = pooled.filter((r) => r.class !== "nl");
  const result = {
    stat: STAT, verdictRule: "see header", verdict, classes: { CODE, DIAGRAM, NL }, missing, preregHeaderSha256: fs.readFileSync(path.join(HERE, "PREREG.sha256"), "utf8").split(/\s+/)[0],
    counts: { code: cnt(code), diagram: cnt(dia), nl: cnt(nl), ud: cnt(udRows), en: cnt(enRows) },
    codeSummary: { n: code.length, zBothPositive: code.filter((r) => r.predictionHolds).length, presentPlus: code.filter((r) => r.status === "PRESENT+").length, dInRange: code.filter((r) => r.dInRange).length, atlasReference: "30/47 z>0 both, 11/47 PRESENT+; P(all n z>0 both | 0.64 each) = " + round(0.64 ** code.length, 3) },
    diagramSummary: { n: dia.length, presentMinus: dia.filter((r) => r.status === "PRESENT-").length, dInRange: dia.filter((r) => r.dInRange).length },
    nlSummary: { n: nl.length, presentAny: nPres, presentPlus: nPlus, absent: nl.filter((r) => r.status === "ABSENT").length, absentUd: udRows.filter((r) => r.status === "ABSENT").length / Math.max(1, udRows.length), absentEn: enRows.filter((r) => r.status === "ABSENT").length / Math.max(1, enRows.length), dInRange: nl.filter((r) => r.dInRange).length,
      binomialReference: { pPresentWordGrain: 5 / 296, pPresentPlusWordGrain: 2 / 296, P_ge1_present: round(binomTail(nl.length, 5 / 296, 1), 3), P_ge3_present: round(binomTail(nl.length, 5 / 296, 3), 4), P_ge1_presentPlus: round(binomTail(nl.length, 2 / 296, 1), 3) } },
    adversary: { rhoZ_introRight_vs_introLeft_allCells: rho(zm, zl, pooled), rhoZ_codeAndDiagram: rho(zm, zl, cd), atlasRho: 0.485, rhoZ_vs_log10tokens: rho(zm, (r) => Math.log10(r.tokens), pooled), rhoZ_vs_meanUnitLength: rho(zm, (r) => r.profile.meanUnitLength, pooled), rhoZ_vs_hapaxShareOfTypes: rho(zm, (r) => r.profile.hapaxShareOfTypes, pooled),
      rhoZ_vs_hapaxShareOfTypes_codeAndDiagram: rho(zm, (r) => r.profile.hapaxShareOfTypes, cd), rhoZ_vs_meanUnitLength_codeAndDiagram: rho(zm, (r) => r.profile.meanUnitLength, cd),
      expectedFalsePresent: { cells: pooled.length, atInstrumentNullRate: round(pooled.length * 8.488e-5, 4) }, status50Changes: rows.filter((r) => r.status50 !== r.status).map((r) => `${r.id}: ${r.status} -> ${r.status50}`) },
    notScoredThin: PREREG.notScoredThin, deviations: [], rows,
  };
  fs.writeFileSync(path.join(HERE, "confirm-result.json"), JSON.stringify(result, null, 1));
  const f = (x) => (x == null ? "NA" : x.toFixed(2));
  for (const r of rows) console.log(`${r.id.padEnd(28)} ${r.class.padEnd(7)} tok=${String(r.tokens).padStart(6)} ${r.status.padEnd(9)} z=(${f(r.zDiscover)}, ${f(r.zConfirm)}) z50=(${f(r.z50[0])}, ${f(r.z50[1])}) d=${f(r.d)} holds=${r.predictionHolds} L=${r.introLeft.status}(${f(r.introLeft.z[0])},${f(r.introLeft.z[1])})`);
  console.log(JSON.stringify({ verdict, classes: result.classes, counts: result.counts, missing }));
  return result;
}

// ---- main
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  if (argv.includes("--harness")) { const ok = await harness(); process.exit(ok ? 0 : 3); }
  else if (argv.includes("--run")) {
    const ids = opt("--run", "").split(",").filter(Boolean), dir = path.join(HERE, "siblings"); fs.mkdirSync(dir, { recursive: true });
    for (const id of ids) { if (!ALL.includes(id)) throw new Error(`not a registered sibling: ${id}`); fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(await runOne(id, !argv.includes("--no-supplementary")))); }
  } else if (argv.includes("--score")) score();
  else console.error("usage: node confirm.mjs --harness | --run id1,id2 | --score");
}
