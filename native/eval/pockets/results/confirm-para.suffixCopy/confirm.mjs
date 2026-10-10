// ===== PREREG-BEGIN  (header frozen BEFORE any para-family statistic was computed on any sibling pocket; its sha256 is stored in prereg-header.sha256.txt and re-checked at every run)
// SIBLING REPLICATION of para.suffixCopy  (atlas law table: MAJORITY(+)+REVERSAL; 275 PRESENT+ / 4 PRESENT- / 22 ABSENT of 353 cells with a defined status, 38 z-undefined; heterogeneity 1.93; shared property = register eta2 0.27)
// Protocol: eval/pockets/PROTOCOL.md sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc (unchanged). Statistic: laws/para.mjs STATS suffixCopy = P(unit ends with the same 2 tokens as the previous unit of its
// document), pairs with both len >= 2, null "unit-order". compute() and nullView() are called exactly as run-atlas.mjs does (halves() by document-hash parity of the pocket id, 10 draws per half, seed seedOf(pocketId, which, "para",
// "unit-order", k), z = (v-nullMean)/nullSd, null sd by n-1). The within-unit null draws of run-atlas.mjs belong to four other para statistics and are NOT computed here (suffixCopy does not use them).
// Cell status (PROTOCOL): PRESENT+ = z >= 4 in BOTH halves; PRESENT- = z <= -4 in both; ABSENT = |z| < 2 in both; anything else (including a z that is undefined because the 10 null draws are identical) AMBIGUOUS.
//
// WHAT THE WRITER HAS SEEN (disclosure): PROTOCOL.md, lib/pocket.mjs, run-atlas.mjs, laws/para.mjs (statement, nulls, comments) and laws/_para_adj.mjs / _para_prep.mjs (the code of suffixCopy); the full law-table.json entry of
//  para.suffixCopy (counts by group, register, script, grain, size correlations, absentPockets and negative pockets list); the atlas per-pocket values (v, nullMean, nullSd, z, both halves) of para.suffixCopy for ALL atlas pockets
//  as class summaries (code, English books by register and size, children, UD) and in full for the ten UD stems used below, the bk English non-dialect books and the children's pockets; v quantiles over all half-cells: code
//  (47 pockets, all PRESENT+) 5/25/50/75/95% = 0.015/0.025/0.037/0.052/0.104, English non-dialect books (n=54: 37 PRESENT+, 3 ABSENT, 11 AMBIGUOUS, 3 z-undefined) 0.0006/0.0024/0.0041/0.0075/0.016; among the 53 novel / reportage /
//  treatise / memoir / essay / academic English books: PRESENT+ in 31 of 41 with >= 60k tokens and in 6 of 12 with < 60k.
//  I also read the loaders and the PREREG header of the sibling replications of other laws (fig.introRight, order.depLen, order.entSlope, para.prefixCopy: loaders only) for method; I opened NO result file of any other
//  replication. Sibling material: only token / unit / document counts, file-drop counters, UD train versus dev+test sentence-overlap counts and the loader size line. NO para statistic (suffixCopy or any other) was computed
//  or printed on any sibling pocket before this header was frozen.
//
// SIBLINGS (all NEW: no document of any atlas pocket; loaders loaders/_sibling-sfx-code.mjs, _sibling-sfx-en.mjs, _sibling-sfx-ud.mjs, which reuse the atlas helper modules, so tokenisation, units, documents and the 300k whole-document
// cap are those of the atlas "cd", "bk" and "ud" groups; group label "sib"). tokens / units / documents as built.
//  CODE (the kind where suffixCopy is PRESENT+ in 47 of 47 atlas code pockets). Software that ships with this machine, never in the atlas (exact-bytes dedupe against code-corpus and ethos 09 files dropped 0 files):
//   sfx-cd-py314 291020/62494/153 (Python 3.14 stdlib), sfx-cd-rb26 291169/82941/354 (Ruby 2.6 stdlib), sfx-cd-chdr 291492/55463/276 (macOS 14.4 SDK C headers), sfx-cd-npmjs 291137/63363/568 (npm CLI JavaScript).
//  ENGLISH PROSE (the kind where it is PRESENT+ in 37 of 54 atlas English non-dialect books). English books misfiled in ethos 11-multi-language/gutenberg-non-en (the atlas ml loader skipped them; file names are wrong, contents read;
//   the material is also used by the siblings of other laws, the pocket ids and hence the half splits are new): CONFIRMATORY sfx-en-poe-works2 96647/4199/42, sfx-en-chopin-awakening 64408/4440/44, sfx-en-zola-mouret 128496/8046/80,
//   sfx-en-waikna 85322/3386/34, sfx-en-about-london 55661/2229/30; EXPLORATORY (under 40k tokens, low power) sfx-en-hesse-siddhartha 39270/1871/30, sfx-en-warren-forces 35736/2020/30.
//  CHILDREN'S BOOKS (atlas: PRESENT+ in 9 of 17 bk + ml children's pockets), EXPLORATORY (n = 2, under 30k tokens): sfx-en-aesop-stickney 29256/1879/30, sfx-en-pooh 22984/2146/30.
//  UD TRAIN SPLITS of stems that have an atlas pocket built from dev+test (disjoint sentence sets; identical sentence strings that occur in both are counted in meta.leak: eng 627 of 12544, kor 138 of 4400, others < 20):
//   atlas PRESENT+ stems (z >= 4 in both halves): sfx-ud-eng 176883/12470/499, sfx-ud-hrv 132085/6913/277, sfx-ud-slv 179497/10900/436, sfx-ud-heb 119348/5165/207, sfx-ud-urd 102096/4043/162, sfx-ud-slk 65159/8476/340;
//   atlas ABSENT stems (|z| < 2 in both halves): sfx-ud-fas 299972/19350/774 (capped), sfx-ud-ind 80944/4481/180, sfx-ud-jpn 146279/7050/282, sfx-ud-kor 49012/4400/176 (read from tb/kor-gsd: the atlas ud-kor is GSD, tb/kor is KAIST).
// NOT TESTED (no wholly unused material was found on disk): scripture (14-holy-texts), legal (world-legislation), academic (NTRS, open-access books), chat (ubuntu-irc, cosem, nus-sms), dialect (WPA volumes), notation / chemistry:
//  every file of these sources is read by some atlas pocket. Capped atlas pockets (French and Spanish law, the four Talmud pockets, some IRC eras, WPA states) drop only whole pieces of files they did read; those leftover pieces were
//  NOT used as siblings (same files, same register, same editorial pipeline: not independent). The claim's SMILES / IUPAC, cryptic-clue, Homer and tweet ABSENT pockets therefore have no sibling here.
//
// BLIND PREDICTIONS (per sibling; v = observed suffixCopy in a half).
//  P1 CODE, each of the 4: PRESENT+ and v in [0.010, 0.140] in both halves.
//  P2 ENGLISH PROSE, each confirmatory: v > 0 in both halves; class prediction PRESENT+ in at least 4 of 5; v in [0.0008, 0.030] in both halves wherever PRESENT+. Exploratory two: v > 0, PRESENT+ allowed but not required.
//  P3 UD PRESENT-side stems: PRESENT+ in at least 4 of 6; v per stem (both halves, where PRESENT+) in eng [0.003, 0.070], hrv [0.0012, 0.025], slv [0.0006, 0.014], heb [0.0014, 0.031], urd [0.005, 0.092], slk [0.0005, 0.016]
//     (atlas dev+test v of the same stem divided by 4 and multiplied by 4).
//  P4 UD ABSENT-side stems fas, ind, jpn, kor: status ABSENT for each (AMBIGUOUS is inconclusive); none PRESENT+ or PRESENT-. Power caveat written in advance: the atlas ABSENT statuses of these stems rest on 20-45k-token pockets with 0-5
//     events per half, so a bigger train split may show a small excess; PRESENT+ in one of them would mean "absent in these treebanks" was a power artefact, and the report will say so.
//  P5 NO SIBLING (all 23, confirmatory and exploratory) is PRESENT-: no new natural-language, code or treebank pocket reverses (the 4 atlas negatives are two music-XML pockets, a Romanian law file and the Latin Summa).
//  P6 CONSTANT (median over the 2 halves x pockets of v): code in [0.020, 0.070]; English prose confirmatory in [0.002, 0.012]; UD present-side in [0.003, 0.025].
//  E1 (exploratory, not in the verdict) children's pockets: PRESENT+ in at most 1 of 2, never PRESENT-, v > 0 in both halves. E2 (exploratory) siddhartha, warren-forces: not PRESENT-.
//
// PASS RULE (frozen). Decisive sibling = PRESENT+, PRESENT- or ABSENT; AMBIGUOUS (including undefined z) is inconclusive and counts as a miss only where a PRESENT+ COUNT is required (H1-H3).
//  H1 code: PRESENT+ in 4 of 4, P1 ranges hold.     H2 prose: >= 4 of 5 confirmatory PRESENT+, none decisively contradicting (no PRESENT- or ABSENT), P2 ranges hold wherever PRESENT+.
//  H3 UD present-side: >= 4 of 6 PRESENT+, none PRESENT- or ABSENT, P3 ranges hold wherever PRESENT+.     H4 UD absent-side: none PRESENT+ or PRESENT-, and >= 2 of the 4 ABSENT.
//  H5 no PRESENT- among all 23.     H6 constant: P6 holds for the three classes.
//  REPLICATES = H1..H6 all hold (prediction holds in every decisive sibling and the counts are met).  FAILS = PRESENT+ in <= 2 of 4 code siblings, or PRESENT+ in fewer than half (<= 7) of the 15 present-side confirmatory siblings
//  (4 code + 5 prose + 6 UD), or PRESENT- in >= 2 siblings.  PARTIAL = everything else; the report names which of H1..H6 held, which siblings failed and the scope that is confirmed.
//  Statuses use the 10-draw z of PROTOCOL. A 100-draw rerun of the unit-order null (draws 0-9 identical) is a robustness check only and cannot change the verdict.
// ADVERSARY PLAN (post-hoc.mjs; reported next to the verdict, cannot change it; tokens carry no punctuation by contract, so unit-final punctuation removal is already built in and the checks below target what "units end in the same word" could still be):
//  A1 exact duplicates of the previous unit removed from numerator and denominator; A2 only pairs with both units >= 6 tokens (unit-length rho -0.38 in the atlas); A3 last-token-only rate (suffix1) and the conditional rate
//  P(second-last equal | last equal) against the unit-order null (does the 2-token law add anything to a one-word ending?); A4 near-duplicate family members prefixCopy and adjNg3: status in each sibling and the Spearman rho of v
//  across siblings; A5 size: Spearman rho of v and z with log tokens across the 23 siblings; A6 multiplicity: atlas false-PRESENT reference (law-table.json falsePresent: p = 8.5e-5 per cell, binomial mean 2.5 over 29,680 cells)
//  applied to 23 siblings x 1 statistic; A7 instrument self-check: this script reproduces v, nullMean, nullSd and z of the atlas JSON on three atlas pockets exactly.
// ===== PREREG-END

// ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// CODE (below the frozen header).  node confirm.mjs [--pockets id1,id2] [--draws 10] [--out siblings]      one JSON per sibling pocket (all unit-order para statistics, both halves, same draws as run-atlas.mjs)
//                                  node confirm.mjs --atlas-check [--pockets bk-pride-prej,...]            instrument self-check: recompute atlas pockets and compare with results/atlas/<id>.json
// summarise.mjs applies the frozen pass rule to the JSON files; posthoc.mjs is the adversary plan.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf, sha256 } from "../../lib/pocket.mjs";
import * as para from "../../laws/para.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), LOADERS = path.resolve(HERE, "../../loaders");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DRAWS = Number(opt("--draws", 10)), OUT = path.resolve(HERE, opt("--out", "siblings")), ONLY = opt("--pockets", null)?.split(",") ?? null, ATLAS_CHECK = argv.includes("--atlas-check");
export const SIBLING_LOADERS = ["_sibling-sfx-code.mjs", "_sibling-sfx-en.mjs", "_sibling-sfx-ud.mjs"];

/** The frozen header must hash to the recorded value, or nothing is computed. */
export function headerIntact() {
  const txt = fs.readFileSync(path.join(HERE, "confirm.mjs"), "utf8"), END = "// ===== PREREG-END\n", k = txt.indexOf(END) + END.length;
  const want = fs.readFileSync(path.join(HERE, "prereg-header.sha256.txt"), "utf8").split(/\s+/)[0], got = sha256(txt.slice(0, k));
  return { ok: want === got, want, got };
}
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const R40 = (x) => Math.round(x * 1099511627776) / 1099511627776;

/** pair and event counts of suffixCopy / prefixCopy / last-token only, recounted independently of laws/_para_adj.mjs (same pair definition: same document, both units >= 2 tokens). */
export function pairCounts(view) {
  let np = 0, suf = 0, pre = 0, suf1 = 0, dupPairs = 0, longPairs = 0, sufLong = 0;
  for (let u = 1; u < view.units.length; u++) {
    if (view.docOf[u] !== view.docOf[u - 1]) continue;
    const a = view.units[u - 1], b = view.units[u];
    if (a.length < 2 || b.length < 2) continue;
    np++;
    const s2 = a[a.length - 1] === b[b.length - 1] && a[a.length - 2] === b[b.length - 2];
    if (s2) suf++;
    if (a[0] === b[0] && a[1] === b[1]) pre++;
    if (a[a.length - 1] === b[b.length - 1]) suf1++;
    if (a.length === b.length && a.every((w, i) => w === b[i])) dupPairs++;
  }
  return { pairs: np, suffixEvents: suf, prefixEvents: pre, lastTokenEvents: suf1, identicalPairs: dupPairs, vRecount: np >= 50 ? R40(suf / np) : null };
}

/** One pocket -> {meta, halves:{discover,confirm:{cells:{"para.<id>":{v,nullMean,nullSd,z,n}}, counts}}}. Calls compute() and nullView() exactly as run-atlas.mjs does for the "unit-order" draws. */
export function analyse(p, nDraws = DRAWS) {
  const meta = validate(p), H = halves(p), res = { meta: { id: p.id, group: p.group, register: p.register, language: p.language, script: p.script ?? null, tokens: meta.tokens, units: meta.units, docs: meta.docs, thin: meta.thin, extra: p.meta ?? null }, draws: nDraws, halves: {} };
  for (const which of ["discover", "confirm"]) {
    const view = H[which], obs = para.compute(view), draws = [], cells = {};
    for (let k = 0; k < nDraws; k++) draws.push(para.compute(nullView(view, "unit-order", seedOf(p.id, which, para.FAMILY, "unit-order", k))));
    for (const s of para.STATS.filter((x) => x.null === "unit-order")) {
      const xs = draws.map((d) => d[s.id]).filter((x) => Number.isFinite(x)), v = obs[s.id];
      const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
      cells[`${para.FAMILY}.${s.id}`] = { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
    }
    res.halves[which] = { tokens: view.units.reduce((a, u) => a + u.length, 0), units: view.units.length, docs: new Set(view.docOf).size, cells, counts: pairCounts(view) };
  }
  return res;
}

/** instrument self-check mode: atlas pockets are rebuilt by the atlas loaders and recomputed; every unit-order para cell must equal the atlas JSON byte for byte (as parsed numbers). */
const ATLAS_LOADER = (id) => (id.startsWith("bk-") ? "books.mjs" : id.startsWith("ud-") ? "ud.mjs" : id.startsWith("oc-") ? "organic.mjs" : "codemisc.mjs");
async function atlasCheck(ids) {
  const out = [];
  for (const id of ids) {
    const mod = await import(pathToFileURL(path.join(LOADERS, ATLAS_LOADER(id))).href), ps = await mod.load([id]), p = ps.find((x) => x.id === id);
    if (!p) { out.push({ id, error: "pocket not built" }); continue; }
    const mine = analyse(p, 10), atlas = JSON.parse(fs.readFileSync(path.resolve(HERE, "../atlas", `${id}.json`), "utf8")), diffs = [];
    for (const which of ["discover", "confirm"]) for (const [k, c] of Object.entries(mine.halves[which].cells)) {
      const a = atlas.halves[which][k];
      for (const f of ["v", "nullMean", "nullSd", "z", "n"]) if (!(a?.[f] === c[f] || (a?.[f] != null && c[f] != null && Math.abs(a[f] - c[f]) < 1e-12 * Math.max(1, Math.abs(a[f]))))) diffs.push({ which, k, f, atlas: a?.[f] ?? null, mine: c[f] });
    }
    out.push({ id, tokens: mine.meta.tokens, cellsCompared: 2 * 8, identical: diffs.length === 0, diffs: diffs.slice(0, 10), suffixCopy: ["discover", "confirm"].map((w) => mine.halves[w].cells["para.suffixCopy"]) });
  }
  return out;
}

async function main() {
  const h = headerIntact();
  if (!h.ok) { console.error(`PREREG HEADER CHANGED (want ${h.want}, got ${h.got}); refusing to compute`); process.exit(2); }
  if (ATLAS_CHECK) {
    const ids = ONLY ?? ["bk-pride-prej", "ud-eng", "cd-cc-ruby"], r = await atlasCheck(ids);
    fs.writeFileSync(path.join(HERE, "check-vs-atlas.json"), JSON.stringify({ headerSha256: h.got, results: r }, null, 1)); console.error(JSON.stringify(r.map((x) => ({ id: x.id, identical: x.identical, n: x.diffs?.length }))));
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of SIBLING_LOADERS) {
    const mod = await import(pathToFileURL(path.join(LOADERS, f)).href);
    if (ONLY && !mod.IDS.some((i) => ONLY.includes(i))) continue;
    for (const p of await mod.load(ONLY ? mod.IDS.filter((i) => ONLY.includes(i)) : null)) {
      const file = path.join(OUT, `${p.id}.json`), res = analyse(p, DRAWS);
      res.headerSha256 = h.got;
      fs.writeFileSync(file, JSON.stringify(res));
      const c = res.halves, z = (w) => c[w].cells["para.suffixCopy"];
      console.error(`${p.id}: ${res.meta.tokens} tokens, suffixCopy v ${z("discover").v?.toPrecision(3)}/${z("confirm").v?.toPrecision(3)} z ${z("discover").z?.toFixed(1)}/${z("confirm").z?.toFixed(1)}`);
    }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
