// attackB.mjs: ATTACK B (FORKING PATHS / MULTIPLICITY / LUCKY SUBSET) on rule R2-later-both-fwc32.   mode:  analyse   (no recomputation of any probe: this script only reads results)
//   (run with NAME_COMPANY_PAIRBLOCK=1 because common.mjs imports name-company.mjs; NEVER use the mode word "run": name-company.mjs starts its main() when process.argv[2] === "run")
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// DISCLOSURE (everything seen before this header). SEEN: the rule JSON, the confirmer's scripts and all its results (per-language rows of 62 windows: FWC32, pairs, BOTH AUC, position, shuffle; verdict.json; ext/*.json 154 extra windows),
//   the scoper's dev frozen file (frozen.dev.json: 22 dev languages with FWC32, pairs, AUC) and the scoper's single test runs (confirm.new.test.json 28 languages, confirm.old.test.json 25 languages), my own attackA and attackC results.
//   SEEN as arithmetic before this header: PRIMARY (train windows of sets A+B) has 20 eligible languages with >= 250 pairs, 12 of them audible (AUC >= 0.60), 12 in scope by FWC32 >= 0.2795 of which 9 are audible; the exact
//   hypergeometric P(>= 9 of 12 in-scope audible | 12 audible among 20) = 0.113. NOT SEEN: any clade-cluster bootstrap, search-adjusted permutation, re-derived threshold, threshold-sensitivity or window-level cluster interval.
//   PROVENANCE FACTS READ: sha256 of the header text of confirm.mjs and extend.mjs equals the sha recorded in every row (recomputed here); file mtimes are reported (they cannot prove ordering, only contradict it).
// WHAT IS ATTACKED. The choice of SCOPE (FWC32 >= 0.2795, >= 250 matched pairs) and the claim that the confirmed hit rate reflects it, rather than a lucky subset of languages, a post-hoc search, or the pair-count floor alone.
// DATA (no probe is rerun): SAMPLES of (language, FWC32, pairs, BOTH AUC, POSITION AUC): TRAIN = the confirmer's 62 windows (sets A, B, C; eligible = pairs >= 60 and POSITION in [0.45, 0.55]); TEST = the scoper's test.conllu rows (LATER stratum);
//   DEV = name-company own.json + frozen.dev.json (the sample on which the rule was fitted). PRIMARY = TRAIN sets A+B (languages never fitted). FRESH = PRIMARY plus TEST of the 28 NEW stems (stacked observations, clustered by language and clade).
//   CLADES (hand assigned, coarse, to model relatedness; in the script): Germanic, Romance, Slavic, Celtic, Baltic, Hellenic, Indo-Iranian, Afroasiatic, Uralic, Turkic, Sinitic, Dravidian, Niger-Congo, and singletons.
//   IN-SCOPE = FWC32 >= 0.2795 and pairs >= 250; OUT = FWC32 < 0.2795 and pairs >= 250; AUDIBLE = AUC >= 0.60.
// TESTS (fixed now; may be tightened, never loosened):
//   B1 SINGLE-CELL SIGNIFICANCE. On PRIMARY and on TEST-new: exact one-sided hypergeometric p of the observed in-scope audible count given (n_in, audible total, n among >= 250 pairs) = 'FWC32 adds nothing beyond the pair floor'. Needs p <= 0.05.
//   B2 SEARCH-ADJUSTED. Grid of cells T in {0.20, 0.22, ..., 0.40} x pair floors F in {150, 200, 250, 300, 400} (55 cells; valid if >= 4 in and >= 3 out); statistic D = audible share(in) - audible share(out). 10,000 permutations of FWC32 across
//     the languages of the sample (pairs and AUC kept with each language). p_cell = P(D_perm at the rule's cell >= D_obs there); p_search = P(max over valid cells of D_perm >= max over valid cells of D_obs). Reported for DEV (where the rule was found:
//     the search-adjusted value is what the discovery was worth), PRIMARY and TEST-new. Needs p <= 0.10 for 'not a search artefact' on PRIMARY.
//   B3 RE-DERIVATION ON A DIFFERENT SPLIT. The best cell (argmax D, ties by closeness to (0.2795, 250)) is chosen on DEV and scored on PRIMARY and on TEST-new; chosen on PRIMARY and scored on DEV and TEST; and leave-one-clade-out over all stacked
//     observations (DEV + TRAIN + TEST), reporting the held-out in-scope audible share of the chosen cell against the fixed rule cell. 'Reproduced' if the chosen T is within [0.24, 0.32] and F within [200, 300].
//   B4 CLADE-CLUSTER BOOTSTRAP (B = 4000, clades resampled with replacement) of: in-scope audible share, D, and LIFT = share(in) - share(all languages with >= 250 pairs) on PRIMARY and on FRESH. Needs share lower 95% bound >= 0.50 and lift lower bound > 0.
//   B5 AUDIBILITY-THRESHOLD SENSITIVITY: in-scope and out audible share at AUC thresholds 0.58, 0.60, 0.62, 0.65 (PRIMARY, FRESH).
//   B6 WINDOW LEVEL: the confirmer's primary + extension windows (>= 250 pairs, eligible): in-scope vs out audible share per window with language- and clade-cluster bootstrap intervals; language-mean version (>= 3 windows).
//   B7 LEAVE-ONE-CLADE-OUT of the PRIMARY in-scope share (minimum over clades) and the in-scope share excluding the three misses' clades.
// VERDICT B. STANDS (scope not a lucky subset and FWC32 earns its place): B1 p <= 0.05 on PRIMARY AND B2 p_search <= 0.10 on PRIMARY AND B4 FRESH in-scope share lower bound >= 0.50 AND lift lower bound > 0.
//   STANDS_NARROWER (the sufficient condition holds as a hit rate, but FWC32 is not shown to add to the pair floor): B4 FRESH in-scope share point >= 0.60 and lower bound >= 0.50, and at least one of B1, B2, lift-bound fails. FALLS if the FRESH in-scope share point
//   estimate < 0.60 or its lower bound < 0.40.
// BLIND PREDICTIONS (my priors). B1 PRIMARY p 0.11 (fails, P 0.85); TEST-new p 0.25. B2 DEV p_search ~0.10-0.30 (the dev discovery is weak after the grid search); PRIMARY p_search ~0.35 (fails). B3 the dev-chosen cell is NOT within the stated window (P 0.5);
//   B4 FRESH in-scope share 0.74 (lower bound 0.5-0.6); lift lower bound < 0 (P 0.80). B5 in-scope share at 0.62 falls to 0.65 and at 0.65 to <= 0.40. B6 window-level in-scope share 0.75, out 0.40, intervals overlapping for out and in (P 0.5).
//   Verdict B: STANDS_NARROWER (P 0.60), FALLS (P 0.25), STANDS (P 0.15).
// REGISTERED CAVEATS. Samples overlap in languages (the same treebank appears in TRAIN, TEST and DEV), so stacked observations are clustered, not independent; windows within a language are not independent texts; clades are coarse; the pair floor and the
//   in-scope filter use gold labels to COUNT pairs (a scope condition that needs gold, noted); AUC at one 20k window has SD ~0.044 within a language, so 'audible' near 0.60 is noisy.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { HERE, RESULTS, CONF_DIR, TSCOPE, AUDIBLE, confirmRows, eligible, round, mean, share, quantile, headerSha, mulberry, wilson } from "./common.mjs";
const SHA = headerSha(import.meta.url), [mode] = process.argv.slice(2), LAW = path.join(CONF_DIR, "..", "..");
const CLADE = { eng: "Germanic", deu: "Germanic", nld: "Germanic", swe: "Germanic", dan: "Germanic", nob: "Germanic", afr: "Germanic", is: "Germanic", fao: "Germanic", got: "Germanic",
  spa: "Romance", fra: "Romance", ita: "Romance", por: "Romance", ron: "Romance", cat: "Romance", glg: "Romance", lat: "Romance", rus: "Slavic", ukr: "Slavic", pol: "Slavic", ces: "Slavic", slk: "Slavic", slv: "Slavic", hrv: "Slavic", srp: "Slavic", bul: "Slavic", be: "Slavic", chu: "Slavic",
  cym: "Celtic", gle: "Celtic", lav: "Baltic", lit: "Baltic", ell: "Hellenic", grc: "Hellenic", fas: "Indo-Iranian", hin: "Indo-Iranian", urd: "Indo-Iranian", mar: "Indo-Iranian", hye: "Armenian",
  arb: "Afroasiatic", heb: "Afroasiatic", mlt: "Afroasiatic", cop: "Afroasiatic", fin: "Uralic", est: "Uralic", hun: "Uralic", tur: "Turkic", kaz: "Turkic", uig: "Turkic", cmn: "Sinitic", "cmn-hans": "Sinitic", lzh: "Sinitic",
  tam: "Dravidian", tel: "Dravidian", wol: "Niger-Congo", yor: "Niger-Congo", ind: "Austronesian", vie: "Austroasiatic", kat: "Kartvelian", eus: "Basque", jpn: "Japonic", kor: "Koreanic" };
const clade = (s) => CLADE[s] ?? "?" + s;
const TGRID = Array.from({ length: 11 }, (_, k) => round(0.2 + 0.02 * k, 3)), FGRID = [150, 200, 250, 300, 400];
const lf = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
const hyperGe = (x, nIn, K, N) => { let p = 0; for (let t = x; t <= Math.min(nIn, K); t++) { if (K - t > N - nIn) continue; p += Math.exp(lf(K) - lf(t) - lf(K - t) + lf(N - K) - lf(nIn - t) - lf(N - K - nIn + t) - (lf(N) - lf(nIn) - lf(N - nIn))); } return p; };
// ── samples ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function loadSamples() {
  const train = confirmRows().filter(eligible).map((r) => ({ stem: r.stem, set: r.set, fwc: r.fwc32, pairs: r.pairs, auc: r.auc, pos: r.position, sample: "TRAIN" }));
  const test = []; for (const [f, set] of [["confirm.new.test.json", "new"], ["confirm.old.test.json", "old"]]) for (const r of JSON.parse(fs.readFileSync(path.join(CONF_DIR, "..", "company-moderators", "results", f), "utf8")).rows)
    if (r.LATER && !r.LATER.thin && r.LATER.position >= 0.45 && r.LATER.position <= 0.55) test.push({ stem: r.stem, set, fwc: r.fwc32, pairs: r.LATER.pairs, auc: r.LATER.auc, pos: r.LATER.position, sample: "TEST" });
  const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), fz = JSON.parse(fs.readFileSync(path.join(CONF_DIR, "..", "company-moderators", "results", "frozen.dev.json"), "utf8")).models.LATER_M1.devClassAtT;
  const dev = fz.map((d) => ({ stem: d.l, set: "dev", fwc: d.fwc, pairs: d.pairs, auc: d.auc, pos: own[d.l]?.LATER?.POSITION ?? null, sample: "DEV" })).filter((d) => d.pos == null || (d.pos >= 0.45 && d.pos <= 0.55));
  return { train, test, dev };
}
const inS = (o, T = TSCOPE, F = 250) => o.fwc >= T && o.pairs >= F, outS = (o, T = TSCOPE, F = 250) => o.fwc < T && o.pairs >= F;
const aud = (o, thr = AUDIBLE) => o.auc >= thr;
function cell(obs, T, F, thr = AUDIBLE) { const a = obs.filter((o) => inS(o, T, F)), b = obs.filter((o) => outS(o, T, F)); if (a.length < 4 || b.length < 3) return null; return { nIn: a.length, nOut: b.length, shareIn: share(a, (o) => aud(o, thr)), shareOut: share(b, (o) => aud(o, thr)), D: share(a, (o) => aud(o, thr)) - share(b, (o) => aud(o, thr)) }; }
function bestCell(obs) { let best = null; for (const T of TGRID) for (const F of FGRID) { const c = cell(obs, T, F); if (!c) continue; const dist = Math.abs(T - TSCOPE) / 0.1 + Math.abs(F - 250) / 100; if (!best || c.D > best.c.D + 1e-9 || (Math.abs(c.D - best.c.D) < 1e-9 && dist < best.dist)) best = { T, F, c, dist }; } return best; }
// ── analysis ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const shuffleArr = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const q = (xs, p) => quantile(xs.filter((x) => x != null && Number.isFinite(x)), p);
function b1(obs) { const big = obs.filter((o) => o.pairs >= 250), ins = big.filter((o) => o.fwc >= TSCOPE), K = big.filter((o) => aud(o)).length, x = ins.filter((o) => aud(o)).length;
  return { nBig: big.length, audibleBig: K, baseRate: round(K / (big.length || 1), 3), nIn: ins.length, audibleIn: x, shareIn: round(x / (ins.length || 1), 3), nOut: big.length - ins.length, audibleOut: K - x, shareOut: round((K - x) / ((big.length - ins.length) || 1), 3), pHyper: round(hyperGe(x, ins.length, K, big.length), 4), wilsonIn: wilson(x, ins.length).map((v) => round(v, 3)) }; }
function b2(obs, B = 10000, seed = 91) {
  const r = mulberry(seed), ruleCell = (o) => cell(o, TSCOPE, 250), maxD = (o) => { let m = null; for (const T of TGRID) for (const F of FGRID) { const c = cell(o, T, F); if (c && (m == null || c.D > m)) m = c.D; } return m; };
  const obsRule = ruleCell(obs), obsMax = maxD(obs), fw = obs.map((o) => o.fwc); let geCell = 0, geMax = 0, nCell = 0, nMax = 0;
  for (let b = 0; b < B; b++) { const f = shuffleArr(fw.slice(), r), p = obs.map((o, k) => ({ ...o, fwc: f[k] })), c = ruleCell(p), m = maxD(p);
    if (c) { nCell++; if (obsRule && c.D >= obsRule.D - 1e-12) geCell++; } if (m != null) { nMax++; if (obsMax != null && m >= obsMax - 1e-12) geMax++; } }
  return { ruleCell: obsRule && { nIn: obsRule.nIn, nOut: obsRule.nOut, shareIn: round(obsRule.shareIn, 3), shareOut: round(obsRule.shareOut, 3), D: round(obsRule.D, 3) }, maxD: round(obsMax, 3), pCell: round((geCell + 1) / (nCell + 1), 4), pSearch: round((geMax + 1) / (nMax + 1), 4), draws: B };
}
const cellRep = (obs, T, F) => { const c = cell(obs, T, F); return c && { T, F, nIn: c.nIn, nOut: c.nOut, shareIn: round(c.shareIn, 3), shareOut: round(c.shareOut, 3), D: round(c.D, 3) }; };
function bootStat(obs, thr = AUDIBLE) { const big = obs.filter((o) => o.pairs >= 250), a = big.filter((o) => o.fwc >= TSCOPE), b = big.filter((o) => o.fwc < TSCOPE); if (a.length < 2 || b.length < 1) return null;
  const si = share(a, (o) => aud(o, thr)), so = share(b, (o) => aud(o, thr)), base = share(big, (o) => aud(o, thr)); return { shareIn: si, shareOut: so, D: si - so, lift: si - base }; }
function cladeBoot(obs, B = 4000, seed = 5) { const groups = new Map(); for (const o of obs) (groups.get(clade(o.stem)) ?? groups.set(clade(o.stem), []).get(clade(o.stem))).push(o); const keys = [...groups.keys()], r = mulberry(seed), out = { shareIn: [], shareOut: [], D: [], lift: [] };
  for (let b = 0; b < B; b++) { const s = []; for (let k = 0; k < keys.length; k++) s.push(...groups.get(keys[Math.floor(r() * keys.length)])); const st = bootStat(s); if (st) for (const k of Object.keys(out)) out[k].push(st[k]); }
  const pt = bootStat(obs); return { clades: keys.length, valid: out.shareIn.length, ...Object.fromEntries(Object.keys(out).map((k) => [k, { point: round(pt?.[k], 3), lo: round(q(out[k], 0.025), 3), hi: round(q(out[k], 0.975), 3) }])) }; }
function loco(all) { const cl = [...new Set(all.map((o) => clade(o.stem)))], rows = []; let inN = 0, inA = 0, ruleN = 0, ruleA = 0, hit = 0, chosen = 0;
  for (const c of cl) { const tr = all.filter((o) => clade(o.stem) !== c), te = all.filter((o) => clade(o.stem) === c), best = bestCell(tr); if (!best) continue; chosen++; if (best.T >= 0.24 && best.T <= 0.32 && best.F >= 200 && best.F <= 300) hit++;
    const a = te.filter((o) => inS(o, best.T, best.F)), r = te.filter((o) => inS(o)); inN += a.length; inA += a.filter((o) => aud(o)).length; ruleN += r.length; ruleA += r.filter((o) => aud(o)).length; rows.push(`${c}:${best.T}/${best.F}`); }
  return { cladesHeldOut: cl.length, chosenInWindow: hit, of: chosen, heldOutInScopeShare_chosen: round(inA / (inN || 1), 3), nChosenIn: inN, heldOutInScopeShare_rule: round(ruleA / (ruleN || 1), 3), nRuleIn: ruleN, chosen: rows }; }
function provenance() { const out = {}, sh = (f) => { const t = fs.readFileSync(f, "utf8"), k = t.indexOf("END OF PRE-REGISTRATION"); return createHash("sha256").update(t.slice(0, k)).digest("hex"); };
  for (const f of ["confirm.mjs", "extend.mjs"]) { const p = path.join(CONF_DIR, f); out[f] = { sha256: sh(p), mtime: fs.statSync(p).mtime.toISOString() }; }
  const rows = confirmRows(); out.rowsRecordedSha = [...new Set(rows.map((r) => r.headerSha256))]; out.rowsShaMatchesConfirmHeader = out.rowsRecordedSha.length === 1 && out.rowsRecordedSha[0] === out["confirm.mjs"].sha256;
  const rd = path.join(CONF_DIR, "results", "rows"), mt = fs.readdirSync(rd).filter((f) => f.endsWith(".json")).map((f) => fs.statSync(path.join(rd, f)).mtimeMs); out.rowsMtimeRange = [new Date(Math.min(...mt)).toISOString(), new Date(Math.max(...mt)).toISOString()];
  out.windowsJsonMtime = fs.statSync(path.join(CONF_DIR, "windows.json")).mtime.toISOString(); out.verdictMtime = fs.statSync(path.join(CONF_DIR, "results", "verdict.json")).mtime.toISOString(); return out; }
function clusterBoot(obs, key, B = 4000, seed = 17) { const groups = new Map(); for (const o of obs) (groups.get(key(o)) ?? groups.set(key(o), []).get(key(o))).push(o); const ks = [...groups.keys()], r = mulberry(seed), out = { shareIn: [], shareOut: [], D: [], lift: [] };
  for (let b = 0; b < B; b++) { const s = []; for (let k = 0; k < ks.length; k++) s.push(...groups.get(ks[Math.floor(r() * ks.length)])); const st = bootStat(s); if (st) for (const k of Object.keys(out)) out[k].push(st[k]); }
  const pt = bootStat(obs); return { clusters: ks.length, valid: out.shareIn.length, ...Object.fromEntries(Object.keys(out).map((k) => [k, { point: round(pt?.[k], 3), lo: round(q(out[k], 0.025), 3), hi: round(q(out[k], 0.975), 3) }])) }; }
function windowObs() { const out = []; for (const r of confirmRows()) if (eligible(r)) out.push({ stem: r.stem, set: r.set, fwc: r.fwc32, pairs: r.pairs, auc: r.auc, win: "primary" });
  const d = path.join(CONF_DIR, "results", "ext"); for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json"))) { const e = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); for (const w of e.windows ?? []) if (w.pairs >= 60 && w.auc != null && w.position >= 0.45 && w.position <= 0.55) out.push({ stem: e.stem, set: e.set, fwc: w.fwc32, pairs: w.pairs, auc: w.auc, win: "ext" }); } return out; }
const sens = (obs) => Object.fromEntries([0.58, 0.6, 0.62, 0.65].map((t) => { const big = obs.filter((o) => o.pairs >= 250), a = big.filter((o) => o.fwc >= TSCOPE), b = big.filter((o) => o.fwc < TSCOPE); return [t, { nIn: a.length, shareIn: round(share(a, (o) => aud(o, t)), 3), nOut: b.length, shareOut: round(share(b, (o) => aud(o, t)), 3), baseAll: round(share(big, (o) => aud(o, t)), 3) }]; }));
const surface = (obs, F = 250) => Object.fromEntries(TGRID.map((T) => { const c = cell(obs, T, F); return [T, c ? `${c.nIn}/${c.nOut} in ${round(c.shareIn, 2)} out ${round(c.shareOut, 2)} D ${round(c.D, 2)}` : "invalid"]; }));
if (mode === "analyse") {
  const { train, test, dev } = loadSamples(), PRIMARY = train.filter((o) => o.set === "A" || o.set === "B"), TESTNEW = test.filter((o) => o.set === "new"), TESTOLD = test.filter((o) => o.set === "old"), TRAINC = train.filter((o) => o.set === "C"), FRESH = [...PRIMARY, ...TESTNEW], ALL = [...dev, ...train, ...test];
  const R = { headerSha256: SHA, generated: new Date().toISOString(), provenance: provenance(), sizes: { dev: dev.length, trainA: train.filter((o) => o.set === "A").length, trainB: train.filter((o) => o.set === "B").length, trainC: TRAINC.length, testNew: TESTNEW.length, testOld: TESTOLD.length } };
  R.B1 = { DEV: b1(dev), PRIMARY: b1(PRIMARY), TRAINC: b1(TRAINC), TESTNEW: b1(TESTNEW), TESTOLD: b1(TESTOLD), note: "hypergeometric is valid per sample (one observation per language); FRESH stacked is not tested this way" };
  R.B2 = { DEV: b2(dev), PRIMARY: b2(PRIMARY), TESTNEW: b2(TESTNEW) };
  const bd = bestCell(dev), bp = bestCell(PRIMARY), bt = bestCell(TESTNEW);
  R.B3 = { bestOnDev: bd && cellRep(dev, bd.T, bd.F), devChosen_scoredOn: bd && { PRIMARY: cellRep(PRIMARY, bd.T, bd.F), TESTNEW: cellRep(TESTNEW, bd.T, bd.F), TESTOLD: cellRep(TESTOLD, bd.T, bd.F) },
    bestOnPrimary: bp && cellRep(PRIMARY, bp.T, bp.F), primaryChosen_scoredOn: bp && { DEV: cellRep(dev, bp.T, bp.F), TESTNEW: cellRep(TESTNEW, bp.T, bp.F), TESTOLD: cellRep(TESTOLD, bp.T, bp.F) }, bestOnTestNew: bt && cellRep(TESTNEW, bt.T, bt.F),
    ruleCellOn: { DEV: cellRep(dev, TSCOPE, 250), PRIMARY: cellRep(PRIMARY, TSCOPE, 250), TRAINC: cellRep(TRAINC, TSCOPE, 250), TESTNEW: cellRep(TESTNEW, TSCOPE, 250), TESTOLD: cellRep(TESTOLD, TSCOPE, 250) }, loco: loco(ALL), locoFresh: loco(FRESH),
    surfaceF250: { DEV: surface(dev), PRIMARY: surface(PRIMARY), TESTNEW: surface(TESTNEW) } };
  R.B4 = { PRIMARY_clade: cladeBoot(PRIMARY), PRIMARY_language: clusterBoot(PRIMARY, (o) => o.stem), FRESH_clade: cladeBoot(FRESH), FRESH_language: clusterBoot(FRESH, (o) => o.stem), ALLOBS_clade: cladeBoot(ALL) };
  R.B5 = { PRIMARY: sens(PRIMARY), FRESH: sens(FRESH) };
  const W = windowObs(), WAB = W.filter((o) => o.set === "A" || o.set === "B"), byL = new Map(); for (const o of W) (byL.get(o.stem) ?? byL.set(o.stem, []).get(o.stem)).push(o);
  const LM = [...byL].filter(([, v]) => v.length >= 3).map(([s, v]) => ({ stem: s, set: v[0].set, fwc: mean(v.map((x) => x.fwc)), pairs: mean(v.map((x) => x.pairs)), auc: mean(v.map((x) => x.auc)) }));
  R.B6 = { windowsAll: { n: W.length, languages: byL.size, stat: bootStat(W) && Object.fromEntries(Object.entries(bootStat(W)).map(([k, v]) => [k, round(v, 3)])), langBoot: clusterBoot(W, (o) => o.stem), cladeBoot: clusterBoot(W, (o) => clade(o.stem)) },
    windowsFresh: { n: WAB.length, langBoot: clusterBoot(WAB, (o) => o.stem), cladeBoot: clusterBoot(WAB, (o) => clade(o.stem)) },
    languageMeans: { n: LM.length, ge250: LM.filter((o) => o.pairs >= 250).length, ALL: b1(LM), FRESH: b1(LM.filter((o) => o.set === "A" || o.set === "B")), cladeBoot: clusterBoot(LM, (o) => clade(o.stem)) } };
  const ins = PRIMARY.filter((o) => inS(o)), cls = [...new Set(ins.map((o) => clade(o.stem)))], misses = ins.filter((o) => !aud(o)).map((o) => o.stem);
  R.B7 = { inScope: ins.map((o) => `${o.stem}:${clade(o.stem)}:${o.auc}`), looClade: cls.map((c) => { const k = ins.filter((o) => clade(o.stem) !== c); return { without: c, n: k.length, share: round(share(k, (o) => aud(o)), 3) }; }), misses, withoutMissClades: (() => { const mc = new Set(misses.map(clade)), k = ins.filter((o) => !mc.has(clade(o.stem))); return { clades: [...mc], n: k.length, share: round(share(k, (o) => aud(o)), 3) }; })() };
  const F = R.B4.FRESH_clade, P1 = R.B1.PRIMARY, P2 = R.B2.PRIMARY;
  R.verdictB = { b1PrimaryP: P1.pHyper, b1Pass: P1.pHyper <= 0.05, b2PrimarySearchP: P2.pSearch, b2Pass: P2.pSearch <= 0.1, freshShare: F.shareIn, freshShareLowerGe50: F.shareIn.lo >= 0.5, liftLowerPositive: F.lift.lo > 0,
    verdict: P1.pHyper <= 0.05 && P2.pSearch <= 0.1 && F.shareIn.lo >= 0.5 && F.lift.lo > 0 ? "STANDS" : F.shareIn.point < 0.6 || F.shareIn.lo < 0.4 ? "FALLS" : F.shareIn.point >= 0.6 && F.shareIn.lo >= 0.5 ? "STANDS_NARROWER" : "UNDETERMINED_BETWEEN_NARROWER_AND_FALLS" };
  fs.writeFileSync(path.join(RESULTS, "B.summary.json"), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
}
