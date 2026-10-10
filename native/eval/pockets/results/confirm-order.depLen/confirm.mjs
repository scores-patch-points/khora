// ===== PREREG-BEGIN  (header frozen BEFORE any order-family statistic was computed on any sibling pocket; its sha256 is stored in prereg-header.sha256.txt and re-checked at every run)
// SIBLING REPLICATION of order.depLen  (atlas law table: REVERSAL 91+/49-, ABSENT 44, PRESENT 36% of 390 cells; heterogeneity 2.14; shared property = register eta2 0.25; sign-split register eta2 0.42)
// Protocol: eval/pockets/PROTOCOL.md sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc (unchanged). Statistic: laws/order.mjs STATS depLen, null "within-unit"; compute() and
// nullView() are called exactly as run-atlas.mjs does (halves() by document-hash parity, 10 draws per half, seed seedOf(pocketId, which, "order", "within-unit", k), z = (v-nullMean)/nullSd).
// Cell status (PROTOCOL): PRESENT+ = z>=4 in BOTH halves; PRESENT- = z<=-4 in both; ABSENT = |z|<2 in both; anything else AMBIGUOUS (including opposite-sign |z|>=4).
//
// WHAT THE WRITER HAS SEEN (disclosure): PROTOCOL.md, lib/pocket.mjs, run-atlas.mjs, laws/order.mjs and its helpers (the code of the statistic); the law-table.json entry of order.depLen; the per-pocket
// atlas JSON values of order.depLen (v and z, both halves) for all bk, ud, cd-cc, cd-e09 and oc pockets, and atlas quantiles of v over PRESENT+ cells (bk P+: 5%/50%/95% = 0.011/0.0165/0.0255; ud P+: 0.017/0.024/0.027).
// Sibling material: only token/unit/document counts, first and last two units of the prose siblings (to check where the cut falls), UD train/dev-test sentence-overlap counts, code-candidate drop counts.
// NO order-family statistic value (depLen or any other) was computed or printed on any sibling before this header was frozen (one timing call on a 5000-unit slice of sib-code-py printed seconds only).
//
// SIBLINGS (all NEW: no document of any atlas pocket; loaders in loaders/_sibling-deplen-{prose,ud,code}.mjs, which reuse the atlas helper modules, so tokenisation, sentence/line units, document blocks and
// the 300k whole-document cap are those of the atlas "bk", "ud" and "cd" groups). Sizes are tokens / units / documents as built.
//  PROSE (+ side; kind of the atlas pockets where depLen is PRESENT+: novel 11/25, memoir 6/13, reportage 4/4, translation 4/9). Source: ethos/11-multi-language/gutenberg-non-en, English books that the atlas ml loader
//   deliberately skipped (loaders/_ml_skips.mjs ENGLISH_MISFILED; file names are wrong, contents were read): sib-bk-zola 126436/7975/80 (Zola, Abbe Mouret's Transgression, English translation: novel+translation),
//   sib-bk-chopin 64499/4448/44 (The Awakening + stories: novel), sib-bk-poe 94473/4101/41 (Poe tales vol II: prose fiction), sib-bk-about-london 53609/2104/30 (Ritchie 1860: reportage),
//   sib-bk-waikna 75458/2880/30 (Waikna 1855: first-person travel narrative, memoir kind). Rejected as duplicates of atlas pockets: de/pg42671 (Pride and Prejudice), it/pg174 (Dorian Gray), nl/pg1232 (The Prince).
//  UD (+ side; atlas treebanks: PRESENT+ in 4/34, PRESENT- in 0/34). Source: TRAIN splits /private/tmp/claude-501/tb/<stem>/train.conllu of stems that have NO atlas pocket (their dev+test were under the thin floor:
//   loaders/ud.manifest.json skippedAtBuild): sib-ud-ita 240871/13060/523, sib-ud-nld 163958/12277/492, sib-ud-ces 299983/17353/695 (capped), sib-ud-dan 68296/4369/175, sib-ud-rus 58306/3850/154.
//  CODE (absent side: the claim has code 8 PRESENT- / 4 PRESENT+ / 1 ABSENT / 34 AMBIGUOUS of 47; "the + law is absent or reversed in code"). Source: the user's own repositories under /Users/mlacy/Documents/3.0,
//   never in an atlas pocket; files whose sha256 equals any code-corpus manifest file or any ethos/09-source-code file are dropped: sib-code-khora-core 292009/30848/152, sib-code-khora-eval-js 291120/20662/134,
//   sib-code-fold-js 294584/23711/161, sib-code-misc-js 292957/32056/179 (JavaScript), sib-code-py 233054/33116/173 (Python). (sib-code-sh is 10882 tokens: thin, excluded.) These share authors/style: not independent.
//  EXPLORATORY (computed and reported, NOT in the verdict): low-power prose sib-bk-siddhartha 39283/1874/30 and sib-bk-kafka 22048/783/29; UD sib-ud-{lit,ell,gle,afr,mlt,wol} (20k-86k tokens) and the head-final /
//   agglutinative stems sib-ud-{tur,kat,hye} (the atlas has 7 such treebanks, fin est eus hin jpn kor urd, ALL with |v| <= 0.0085 and status ABSENT in both halves: an observation made from the atlas table AFTER the claim was written).
// NOT TESTED (no unused corpus exists on disk): nomenclature (4/4 PRESENT-), diagram (4/7 PRESENT-), scripture (7/26 PRESENT-, 14-holy-texts is fully consumed by the atlas), chat (the ubuntu-irc day files are all used).
//
// BLIND PREDICTIONS (per sibling). v = observed order.depLen, in each half.
//  P1  every PROSE sibling (5) and every UD sibling (5): PRESENT+ with v_discover and v_confirm in [0.004, 0.040] (atlas bk P+ 5-95% range 0.011-0.0255; ranges deliberately wider than that).
//  P2  every CODE sibling (5): NOT PRESENT+ (status in {PRESENT-, ABSENT, AMBIGUOUS}); constant: |v| <= 0.07 (atlas code range); no sign is predicted for code.
//  P3  constant of the + side: median of v over the 20 half-values of the 10 confirmatory + siblings in [0.008, 0.030].
//  P4  instrument: |nullMean| < 0.003 in every half of every confirmatory sibling (the chance formula (L+1)/(m+1) is exact in expectation; a larger null mean would be a chance-formula artefact).
//  E1  (exploratory) siddhartha, kafka, and UD lit/ell/gle/afr/mlt/wol: v > 0 in both halves and never PRESENT- (low power: AMBIGUOUS is allowed).
//  E2  (exploratory) UD tur, kat, hye (head-final / agglutinative): status ABSENT and |v| <= 0.009 in both halves.
//
// PASS RULE (frozen). Decisive sibling = status PRESENT+, PRESENT- or ABSENT (AMBIGUOUS is inconclusive and never counts against a prediction, but sign persistence H1 still applies to it).
//  H1 sign:      v_discover > 0 and v_confirm > 0 in every PROSE and UD confirmatory sibling.
//  H2 presence:  PRESENT+ in at least 2 of the 5 PROSE siblings AND in at least 2 of the 5 UD siblings (>= 40% each, the atlas rate for novels is 44%).
//  H3 no reversal: no PROSE or UD sibling is PRESENT- or ABSENT (a decisive sibling must hold P1).
//  H4 constant:  every PRESENT+ sibling has both v in [0.004, 0.040], and P3 holds.
//  H5 absent side: among the 5 CODE siblings at most 1 is PRESENT+ and at most 2 are PRESENT (<= 40%).
//  H6 instrument: P4 holds.
//  REPLICATES = H1..H6 all hold.  FAILS = at most 2 of the 10 + siblings are PRESENT+, or at least 2 of them are PRESENT-.  PARTIAL = everything else, and the report names which of H1..H6 held and which siblings failed.
//  Statuses use the 10-draw z of PROTOCOL. A 100-draw rerun (same seeds for draws 0-9) is reported as a robustness check only.
// ADVERSARY PLAN (reported next to the verdict, cannot change it): A1 null mean of v (chance formula) per half; A2 adjacent-pair share: the share of successive same-rank-bin pairs at distance 1, observed vs
//  within-unit null, and the spacing statistic recomputed on pairs at distance >= 2 only (does the law survive without immediate repetition?); A3 rival burst.repAdj: rank correlation of depLen v with repAdj v across
//  atlas pockets, and repAdj of each sibling; A4 size: rank correlation of v and z with log tokens across siblings; A5 multiplicity: atlas false-PRESENT reference (results/law-table.json falsePresent).
// ===== PREREG-END

// ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// CODE (below the frozen header). node confirm.mjs --pockets id1,id2 [--draws 10] [--out siblings] [--rival]   one JSON per pocket; summarise.mjs applies the frozen pass rule to the JSON files.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf, sha256 } from "../../lib/pocket.mjs";
import * as order from "../../laws/order.mjs";
import * as burst from "../../laws/burst.mjs";
import { prep } from "../../laws/_order_prep.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DRAWS = Number(opt("--draws", 10)), OUT = path.resolve(HERE, opt("--out", "siblings")), WANT = opt("--pockets", null)?.split(",") ?? null, RIVAL = argv.includes("--rival");

// header self-check: the bytes from the start of this file to the end of the PREREG-END line must hash to the recorded value
const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8"), endAt = src.indexOf("// ===== PREREG-END\n") + "// ===== PREREG-END\n".length;
export const HEADER_SHA = sha256(src.slice(0, endAt));
const recorded = fs.readFileSync(path.join(HERE, "prereg-header.sha256.txt"), "utf8").split(/\s/)[0];
if (HEADER_SHA !== recorded) { console.error(`confirm.mjs: pre-registration header changed (${HEADER_SHA} != ${recorded}); refusing to run`); process.exit(2); }

const FROZEN = argv.includes("--code-frozen");   // read the five code pockets from the byte-for-byte snapshot (code-snapshot/) instead of the live repository trees
const LOADERS = ["_sibling-deplen-prose.mjs", "_sibling-deplen-ud.mjs", FROZEN ? "_sibling-deplen-code-frozen.mjs" : "_sibling-deplen-code.mjs"];
async function loadPockets(ids) {
  const out = [];
  for (const f of LOADERS) { const m = await import(pathToFileURL(path.join(HERE, "../../loaders", f)).href); const mine = ids.filter((i) => m.ids().includes(i)); if (mine.length) out.push(...await m.load(mine)); }
  return out;
}
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const cell = (v, xs) => { const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN }; return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length }; };

/** Adversary A2: successive same-rank-bin tokens inside a unit (units >= 3, as depLen). share1 = P(gap = 1); meanGE2 = mean gap among gaps >= 2. */
function gapStats(view) {
  const P = prep(view), { U, bs, B, unitStart } = P, last = new Int32Array(B).fill(-1);
  let n = 0, n1 = 0, nGE2 = 0, sGE2 = 0;
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a;
    if (L < 3) continue;
    for (let i = 0; i < L; i++) { const b = bs[a + i]; if (last[b] >= 0) { const g = i - last[b]; n++; if (g === 1) n1++; else { nGE2++; sGE2 += g; } } last[b] = i; }
    for (let i = 0; i < L; i++) last[bs[a + i]] = -1;
  }
  return { share1: n ? n1 / n : NaN, lnMeanGE2: nGE2 ? Math.log(sGE2 / nGE2) : NaN, pairs: n };
}

fs.mkdirSync(OUT, { recursive: true });
const pockets = await loadPockets(WANT ?? []);
for (const p of pockets) {
  const t0 = Date.now(), meta = validate(p), H = halves(p);
  const res = { meta: { ...meta, group: p.group, register: p.register, language: p.language, script: p.script ?? null, extra: p.meta ?? null }, headerSha256: HEADER_SHA, draws: DRAWS, halves: {}, adversary: {}, errors: [] };
  for (const which of ["discover", "confirm"]) {
    const view = H[which]; res.halves[which] = {};
    try {
      // main statistic: exactly run-atlas.mjs (family compute on the view, DRAWS within-unit null draws with seed seedOf(id, which, FAMILY, kind, k))
      const obs = order.compute(view), kind = "within-unit", draws = [];
      for (let k = 0; k < DRAWS; k++) draws.push(order.compute(nullView(view, kind, seedOf(p.id, which, order.FAMILY, kind, k))));
      for (const s of order.STATS) res.halves[which][`order.${s.id}`] = cell(obs[s.id], draws.map((d) => d[s.id]).filter(Number.isFinite));
      // adversary A2 (gap structure), same number of independent within-unit draws with its own seed label
      const g0 = gapStats(view), gd = [];
      for (let k = 0; k < DRAWS; k++) gd.push(gapStats(nullView(view, kind, seedOf(p.id, which, "adv-gap", kind, k))));
      res.adversary[which] = { share1: cell(g0.share1, gd.map((d) => d.share1)), lnMeanGE2: cell(g0.lnMeanGE2, gd.map((d) => d.lnMeanGE2)), pairs: g0.pairs, tokens: view.units.reduce((a, u) => a + u.length, 0), units: view.units.length, docs: new Set(view.docOf).size };
      // adversary A3: rival burst.repAdj (its own null: token-global, as burst.mjs declares)
      if (RIVAL) {
        const bo = burst.compute(view), bd = [];
        for (let k = 0; k < DRAWS; k++) bd.push(burst.compute(nullView(view, "token-global", seedOf(p.id, which, burst.FAMILY, "token-global", k))));
        res.adversary[which].repAdj = cell(bo.repAdj, bd.map((d) => d.repAdj));
      }
    } catch (e) { res.errors.push(`${which}: ${String(e.stack ?? e.message).slice(0, 300)}`); }
  }
  res.seconds = (Date.now() - t0) / 1000;
  fs.writeFileSync(path.join(OUT, `${p.id}.json`), JSON.stringify(res));
  console.error(`${p.id}: ${meta.tokens} tokens, ${res.seconds.toFixed(1)} s, ${res.errors.length} errors`);
}
if (WANT && pockets.length !== WANT.length) console.error(`WARNING: asked for ${WANT.length} pockets, built ${pockets.length} (thin or unknown ids are skipped)`);
