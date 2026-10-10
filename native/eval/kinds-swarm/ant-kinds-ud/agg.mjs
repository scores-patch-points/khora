// agg.mjs — ant-kinds-ud aggregation: K1 (induced/*.json), K2/K3 (results/<src>/lang/*.json), K4 (sig/*.rec.json), and the pre-registered predictions P1-P13.
//   node agg.mjs --stems a,b,c --verdict a,b [--src dev]      -> results/<src>/AGG.json, AGG.txt
// Pre-registration: PREREG.md (sha256 in PREREG.sha256). `swe` (debug) is never in --verdict. cmn (same text as cmn-hans) is dropped from K4.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rngFor, seedFor } from "../../law/impact.mjs";
import { mean, median, quantile, round } from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STEMS = opt("--stems", "").split(",").filter(Boolean), VERDICT = opt("--verdict", "").split(",").filter(Boolean);
const SRC = opt("--src", "dev"); const TAG = opt("--tag", "");
const IND = path.join(HERE, SRC === "dev" ? "induced" : "induced-" + SRC), SIG = path.join(HERE, SRC === "dev" ? "sig" : "sig-" + SRC), RES = path.join(HERE, "results", SRC);
const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const shuf = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const FAM3 = { SOV: "fas kor jpn nld hin urd tur", SVOA: "eng cmn cmn-hans fra por vie ind swe", SVOB: "spa rus arb heb deu ita pol ukr ell fin" };
const fam3Of = {}; for (const [f, s] of Object.entries(FAM3)) for (const l of s.split(" ")) fam3Of[l] = f;
const fam2Of = Object.fromEntries(Object.entries(fam3Of).map(([l, f]) => [l, f === "SOV" ? "SOV" : "SVO"]));
const vecOf = (r) => [...r.sig, ...r.atm, ...r.ext];

const out = { src: SRC, stems: STEMS, verdict: VERDICT, headerSha256: fs.readFileSync(path.join(HERE, "PREREG.sha256"), "utf8").trim(), languages: {}, K1: {}, K2: {}, K3: {}, K4: {}, predictions: {} };
const L = {}, I = {};
for (const s of STEMS) { I[s] = rd(path.join(IND, `${s}.json`)); const f = path.join(RES, "lang", `${s}.json`); if (fs.existsSync(f)) L[s] = rd(f); }
const inV = (s) => VERDICT.includes(s);
const V = VERDICT.filter((s) => I[s] && !I[s].gap);

// ── K1 ──
for (const s of STEMS) {
  const r = I[s]; if (r.gap) { out.languages[s] = { gap: r.gap }; continue; }
  const lv = r.leaves;
  const o = { tokens: r.tokens, nForms: r.nForms, Kstar: r.Kstar, margin: r.margin, leaves: r.nLeaves, curve: r.curve.map((c) => `${c.K}:${c.margin}`).join(" "),
    chronoMargin: r.k1.b_chrono?.margin, chronoPass: r.k1.b_chrono?.pass, tercilesPassed: r.k1.tercilesPassed, nmiBands: r.k1.nmiKindsVsFreqBands, nmiUpos: r.k1.nmiKindsUpos, nmiUposShuffled: r.k1.nmiShuffledKindsUpos, nmiLeavesUpos: r.k1.nmiLeavesUpos,
    k1pass: r.k1.pass, ctrlShareK1: r.control.shareK1, ctrlEmpiricalP: r.control.empiricalP ?? null, obsMargin: r.control.obsMargin ?? r.margin,
    nominalKinds: lv.filter((l) => l.nominal >= 0.5).length, propnKinds: lv.filter((l) => l.propn >= 0.5).length, maxPropnShare: Math.max(...lv.map((l) => l.propn)), maxNominalShare: Math.max(...lv.map((l) => l.nominal)),
    propnForms5: r.forms ? null : null };
  out.languages[s] = o;
}
const K1v = V.map((s) => out.languages[s]);
out.K1 = {
  verdictLanguages: V.length,
  passAll: K1v.filter((o) => o.k1pass).length, passA: K1v.filter((o) => o.Kstar >= 2).length, passB: K1v.filter((o) => o.chronoPass).length, passC: K1v.filter((o) => o.tercilesPassed >= 2).length,
  ctrlShareMean: round(mean(K1v.map((o) => o.ctrlShareK1))), ctrlEmpiricalPle0p1: K1v.filter((o) => o.ctrlEmpiricalP != null && o.ctrlEmpiricalP <= 0.1).length, medianKstar: median(K1v.map((o) => o.Kstar)),
  nmiBandsMedian: round(median(K1v.map((o) => o.nmiBands))), nmiBandsBelow030: K1v.filter((o) => o.nmiBands < 0.3).length,
  nmiUposVsShuffled: `${round(median(K1v.map((o) => o.nmiUpos)))} vs ${round(median(K1v.map((o) => o.nmiUposShuffled).filter((x) => x != null)))}`,
  languagesWithNominalKind: K1v.filter((o) => o.nominalKinds >= 1).length, languagesWithPropnKind: K1v.filter((o) => o.propnKinds >= 1).length,
};

// ── K2 ──
const LV = V.filter((s) => L[s]);
const g = (f) => LV.map((s) => { try { return f(L[s]); } catch { return undefined; } });
out.K2 = {
  verdictLanguages: LV.length,
  T2a_all_pass: LV.filter((s) => L[s].T2a_all?.freqStratified?.p <= 0.05).length, T2a_all_available: LV.filter((s) => L[s].T2a_all).length,
  T2a_all_unrestricted_pass: LV.filter((s) => L[s].T2a_all?.unrestricted?.p <= 0.05).length,
  T2a_nominal_pass: LV.filter((s) => L[s].T2a_nominal?.freqStratified?.p <= 0.05).length, T2a_nominal_available: LV.filter((s) => L[s].T2a_nominal).length,
  T2b_shadow_pass: LV.filter((s) => L[s].joint?.dispersion?.shadow?.pass).length, T2b_imprint_pass: LV.filter((s) => L[s].joint?.dispersion?.imprint?.pass).length, T2b_collateral_pass: LV.filter((s) => L[s].joint?.dispersion?.collateral?.pass).length,
  T2b_available: LV.filter((s) => L[s].joint?.dispersion?.shadow?.obs != null).length,
  slopeP_le05: LV.filter((s) => L[s].T2a_all?.freqStratified?.slopeP != null && L[s].T2a_all.freqStratified.slopeP <= 0.05).length,
  simpson: Object.fromEntries(["PROPN", "NOUN"].map((c) => [c, { reversalAbove: LV.filter((s) => L[s].simpson?.[c]?.reversal?.above).length, cancellationAbove: LV.filter((s) => L[s].simpson?.[c]?.cancellation?.above).length, anyAbove: LV.filter((s) => L[s].simpson?.[c]?.reversal?.above || L[s].simpson?.[c]?.cancellation?.above).length, available: LV.filter((s) => L[s].simpson?.[c]?.pairs).length }])),
  goldPropnSpecific: LV.filter((s) => L[s].joint?.gold?.PROPN?.specific).length, goldPropnCos: Object.fromEntries(LV.map((s) => [s, L[s].joint?.gold?.PROPN?.cosToRand])),
  goldNounSpecific: LV.filter((s) => L[s].joint?.gold?.NOUN?.specific).length,
  shamAllNull: LV.every((s) => (L[s].joint?.sham ?? 0) === 0), determinismAll: LV.every((s) => L[s].joint?.determinism !== false),
};
// P6: proper-noun-like kind with larger shadow z than pooled PROPN
const p6 = [];
for (const s of LV) {
  const j = L[s].joint; if (!j?.perKind || !j.gold?.PROPN || j.gold.PROPN.gap) continue;
  const zP = j.gold.PROPN.z; const pk = Object.entries(j.perKind).filter(([, v]) => (v.desc?.propn ?? 0) >= 0.5 && v.z != null);
  if (!pk.length || zP == null) continue;
  const best = pk.sort((a, b) => b[1].z - a[1].z)[0];
  p6.push({ stem: s, kind: best[0], zKind: best[1].z, zPooled: zP, specificKind: best[1].specific, higher: best[1].z > zP });
}
out.K2.P6 = { languagesWithBoth: p6.length, higher: p6.filter((x) => x.higher).length, specificKinds: p6.filter((x) => x.specificKind).length, detail: p6 };
// P6x (EXPLORATORY, post hoc, not pre-registered): the most PROPN-rich kind (whatever its share) against pooled gold PROPN, since no kind reaches 0.5
const p6x = [];
for (const s of LV) {
  const j = L[s].joint; if (!j?.perKind || !j.gold?.PROPN || j.gold.PROPN.gap) continue;
  const pk = Object.entries(j.perKind).filter(([, v]) => v.z != null); if (!pk.length) continue;
  const best = pk.sort((a, b) => (b[1].desc?.propn ?? 0) - (a[1].desc?.propn ?? 0))[0];
  p6x.push({ stem: s, kind: best[0], propnShare: best[1].desc?.propn, cosKind: best[1].cosToRand, cosPooled: j.gold.PROPN.cosToRand, specificKind: best[1].specific, specificPooled: j.gold.PROPN.specific, kindFartherThanPooled: best[1].cosToRand < j.gold.PROPN.cosToRand });
}
out.K2.P6x_exploratory = { n: p6x.length, kindFartherThanPooled: p6x.filter((x) => x.kindFartherThanPooled).length, kindSpecific: p6x.filter((x) => x.specificKind).length, pooledSpecific: p6x.filter((x) => x.specificPooled).length, detail: p6x };
// kinds that are specific (any kind), counts
out.K2.kindsSpecific = Object.fromEntries(LV.map((s) => { const pk = Object.values(L[s].joint?.perKind ?? {}); return [s, `${pk.filter((v) => v.specific).length}/${pk.length}`]; }));
// top coordinates (named) pooled over languages: how often a coordinate is among the language's significant coordinates
const coordFreq = new Map();
for (const s of LV) for (const c of L[s].T2a_all?.topCoords ?? []) if (c.p <= 0.05) coordFreq.set(c.coord, (coordFreq.get(c.coord) ?? 0) + 1);
out.K2.topCoordinatesByLanguageCount = [...coordFreq].sort((a, b) => b[1] - a[1]).slice(0, 12);

// ── K3 ──
const k3 = LV.filter((s) => L[s].K3a?.PROPN && !L[s].K3a.PROPN.gap);
const dp = (s, cls, name) => L[s].K3a[cls]?.diffs?.[name];
out.K3 = {
  languages: k3.length,
  PROPN: Object.fromEntries(["C-P", "PK-Kd", "C-PK", "PK-P", "C-Kd"].map((n) => [n, { mean: round(mean(k3.map((s) => dp(s, "PROPN", n).point))), positiveLoGt0: k3.filter((s) => dp(s, "PROPN", n).lo > 0).length, atLeast003LoGt0: k3.filter((s) => dp(s, "PROPN", n).point >= 0.03 && dp(s, "PROPN", n).lo > 0).length, negativeHiLt0: k3.filter((s) => dp(s, "PROPN", n).hi < 0).length }])),
  PROPN_supported: k3.filter((s) => L[s].K3a.PROPN.supported).length,
  meanAuc: Object.fromEntries(["P", "Kd", "PK", "C"].map((a) => [a, round(mean(k3.map((s) => L[s].K3a.PROPN.auc[a]).filter((x) => x != null)))])),
  NOUN: (() => { const kk = LV.filter((s) => L[s].K3a?.NOUN && !L[s].K3a.NOUN.gap); return { languages: kk.length, supported: kk.filter((s) => L[s].K3a.NOUN.supported).length, meanAuc: Object.fromEntries(["P", "Kd", "PK", "C"].map((a) => [a, round(mean(kk.map((s) => L[s].K3a.NOUN.auc[a]).filter((x) => x != null)))])), PKminusKdLoGt0: kk.filter((s) => L[s].K3a.NOUN.diffs["PK-Kd"].lo > 0).length, CminusPKLoGt0: kk.filter((s) => L[s].K3a.NOUN.diffs["C-PK"].lo > 0).length }; })(),
  K3b: { languagesWithDetectableKind: LV.filter((s) => Object.values(L[s].K3b ?? {}).some((x) => x.detectable)).length, detectableKinds: Object.fromEntries(LV.map((s) => { const v = Object.values(L[s].K3b ?? {}); return [s, `${v.filter((x) => x.detectable).length}/${v.length}`]; })) },
  withinKindAucP: Object.fromEntries(k3.map((s) => [s, Object.entries(L[s].K3a.PROPN.within).map(([l, w]) => `k${l}:${w.aucP}`).join(" ")])),
};

// ── K4 ──
const K4L = V.filter((s) => s !== "cmn" && fam3Of[s]);
const recs = {}; for (const s of K4L) { const f = path.join(SIG, `${s}.rec.json`); if (fs.existsSync(f)) recs[s] = rd(f); }
const K4S = K4L.filter((s) => recs[s]);
// global standardisation over all kind-role records of the K4 languages
const allV = []; for (const s of K4S) for (const r of recs[s].records) if (r.roles.includes("kind") && r.leaf >= 0) allV.push(vecOf(r));
const d = allV[0]?.length ?? 0, mu = new Array(d).fill(0), sg = new Array(d).fill(0);
for (const v of allV) for (let c = 0; c < d; c++) mu[c] += v[c] / allV.length;
for (const v of allV) for (let c = 0; c < d; c++) sg[c] += (v[c] - mu[c]) ** 2 / allV.length;
const keep = []; for (let c = 0; c < d; c++) if (Math.sqrt(sg[c]) > 1e-9) keep.push(c);
const zv = (r) => { const v = vecOf(r); return keep.map((c) => (v[c] - mu[c]) / Math.sqrt(sg[c])); };
function centroids(rows, labelOf) {
  const g = new Map(); rows.forEach((r, i) => { const l = labelOf[i]; (g.get(l) ?? g.set(l, []).get(l)).push(i); });
  const Z = rows.map(zv), m = new Array(keep.length).fill(0); Z.forEach((z) => z.forEach((x, c) => { m[c] += x / Z.length; }));
  const cs = []; for (const idx of g.values()) { if (idx.length < 20) continue; const c = new Array(keep.length).fill(0); for (const i of idx) Z[i].forEach((x, k) => { c[k] += x / idx.length; }); cs.push(c.map((x, k) => x - m[k])); }
  return cs;
}
const align = (A, B) => { if (A.length < 2 || B.length < 2) return null; const best = (X, Y) => mean(X.map((a) => Math.max(...Y.map((b) => cos(a, b) ?? -1)))); return (best(A, B) + best(B, A)) / 2; };
const rndK4 = rngFor(seedFor("kinds-ud-k4", SRC));
const partitions = { kinds: {}, freqBands: {}, random: [] };
const kindRows = {}; for (const s of K4S) kindRows[s] = recs[s].records.filter((r) => r.roles.includes("kind") && r.leaf >= 0);
for (const s of K4S) {
  const rows = kindRows[s]; const lab = rows.map((r) => r.leaf);
  const sizes = {}; lab.forEach((l) => { sizes[l] = (sizes[l] ?? 0) + 1; });
  const sz = Object.values(sizes).filter((n) => n >= 20).sort((a, b) => b - a); const Kn = sz.length;
  partitions.kinds[s] = centroids(rows, lab);
  const ord = rows.map((r, i) => i).sort((a, b) => rows[a].fb - rows[b].fb || rows[a].nw - rows[b].nw);
  const bandLab = new Array(rows.length); ord.forEach((i, r) => { bandLab[i] = Math.floor((r * Kn) / rows.length); });
  partitions.freqBands[s] = centroids(rows, bandLab);
}
const NR = 10;
for (let b = 0; b < NR; b++) { const p = {}; for (const s of K4S) { const rows = kindRows[s]; const lab = shuf(rows.map((r) => r.leaf), rndK4); p[s] = centroids(rows, lab); } partitions.random.push(p); }
const pairsOf = (P) => { const o = []; for (let i = 0; i < K4S.length; i++) for (let j = i + 1; j < K4S.length; j++) o.push([K4S[i], K4S[j], align(P[K4S[i]], P[K4S[j]])]); return o.filter((x) => x[2] != null); };
function famGap(pairs, famOf, sign = 1) { const w = pairs.filter(([a, b]) => famOf[a] === famOf[b]).map((p) => p[2]), x = pairs.filter(([a, b]) => famOf[a] !== famOf[b]).map((p) => p[2]); return w.length && x.length ? sign * (mean(w) - mean(x)) : null; }
function permP(pairs, famOf, sign = 1, B = 10000) {
  const langs = [...new Set(pairs.flatMap((p) => [p[0], p[1]]))]; const obs = famGap(pairs, famOf, sign); if (obs == null) return null;
  const labs = langs.map((l) => famOf[l]); let ge = 0;
  for (let b = 0; b < B; b++) { const sh = shuf(labs, rndK4); const f = Object.fromEntries(langs.map((l, i) => [l, sh[i]])); const gp = famGap(pairs, f, sign); if (gp != null && gp >= obs - 1e-12) ge++; }
  return { gap: round(obs), p: round((1 + ge) / (B + 1), 4), within: round(mean(pairs.filter(([a, b]) => famOf[a] === famOf[b]).map((p) => p[2]))), across: round(mean(pairs.filter(([a, b]) => famOf[a] !== famOf[b]).map((p) => p[2]))) };
}
const kinPairs = pairsOf(partitions.kinds), fbPairs = pairsOf(partitions.freqBands), rndPairs = partitions.random.map(pairsOf);
const Kstar = Object.fromEntries(K4S.map((s) => [s, I[s].Kstar])), Nleaf = Object.fromEntries(K4S.map((s) => [s, I[s].nLeaves]));
const kPairs = (M) => { const o = []; for (let i = 0; i < K4S.length; i++) for (let j = i + 1; j < K4S.length; j++) o.push([K4S[i], K4S[j], Math.abs(M[K4S[i]] - M[K4S[j]])]); return o; };
out.K4 = {
  languages: K4S, families3: Object.fromEntries(K4S.map((s) => [s, fam3Of[s]])),
  alignmentMean: { kinds: round(mean(kinPairs.map((p) => p[2]))), freqBands: round(mean(fbPairs.map((p) => p[2]))), randomPartitions: round(mean(rndPairs.map((pp) => mean(pp.map((p) => p[2]))))) },
  signature3: permP(kinPairs, fam3Of), signature2: permP(kinPairs, fam2Of), freqBand3: permP(fbPairs, fam3Of), freqBand2: permP(fbPairs, fam2Of),
  randomPartitionGap3_mean: round(mean(rndPairs.map((pp) => famGap(pp, fam3Of)).filter((x) => x != null))),
  Kstar3: permP(kPairs(Kstar), fam3Of, -1), Kstar2: permP(kPairs(Kstar), fam2Of, -1), leaves3: permP(kPairs(Nleaf), fam3Of, -1), leaves2: permP(kPairs(Nleaf), fam2Of, -1),
  Kstar: Kstar, leaves: Nleaf,
};
out.K4.supported = !!(out.K4.signature3 && out.K4.signature3.p <= 0.05 && out.K4.signature2?.p <= 0.05 && !(out.K4.freqBand3 && out.K4.freqBand3.p <= 0.05));

// ── predictions (thresholds of the PREREG are counts out of 10; scaled to the number of verdict languages n, ceil for ">=", floor for "<=") ──
const P = out.predictions, n = V.length, nl = LV.length;
const ge = (x, k) => Math.ceil((k / 10) * x), le = (x, k) => Math.floor((k / 10) * x);
P.P1 = { claim: ">= 8/10 pass K1 (a,b,c); median K* in [3,12]", observed: `${out.K1.passAll}/${n} pass all; a:${out.K1.passA} b:${out.K1.passB} c:${out.K1.passC}; median K*=${out.K1.medianKstar}`, held: out.K1.passAll >= ge(n, 8) && out.K1.medianKstar >= 3 && out.K1.medianKstar <= 12 };
P.P2 = { claim: "NMI(kinds, freq bands) < 0.30 in a majority", observed: `${out.K1.nmiBandsBelow030}/${n}, median ${out.K1.nmiBandsMedian}`, held: out.K1.nmiBandsBelow030 > n / 2 };
P.P3 = { claim: ">=1 noun-like kind in every language; >=1 proper-noun-like (PROPN share >= 0.5) kind in >= 5/10", observed: `nominal-kind languages ${out.K1.languagesWithNominalKind}/${n}; PROPN-majority-kind languages ${out.K1.languagesWithPropnKind}/${n}`, held: out.K1.languagesWithNominalKind === n && out.K1.languagesWithPropnKind >= ge(n, 5) };
P.P4 = { claim: "T2a (freq-stratified) in >= 7/10; nominal stratum >= 5/10", observed: `all ${out.K2.T2a_all_pass}/${out.K2.T2a_all_available}; nominal ${out.K2.T2a_nominal_pass}/${out.K2.T2a_nominal_available}`, held: out.K2.T2a_all_pass >= ge(out.K2.T2a_all_available, 7) && out.K2.T2a_nominal_pass >= ge(out.K2.T2a_nominal_available, 5) };
P.P5 = { claim: "T2b shadow dispersion beats all 20 null draws in >= 6/10", observed: `${out.K2.T2b_shadow_pass}/${out.K2.T2b_available} (imprint ${out.K2.T2b_imprint_pass}, collateral ${out.K2.T2b_collateral_pass})`, held: out.K2.T2b_shadow_pass >= ge(out.K2.T2b_available, 6) };
P.P6 = { claim: "a PROPN-like kind has larger shadow z than pooled gold PROPN in >= 6/10 of the languages having both", observed: `${out.K2.P6.higher}/${out.K2.P6.languagesWithBoth}`, held: out.K2.P6.languagesWithBoth > 0 && out.K2.P6.higher >= ge(out.K2.P6.languagesWithBoth, 6) };
P.P7 = { claim: "Simpson reversal or cancellation above chance in >= 3/10 languages (PROPN or NOUN stratum)", observed: `PROPN ${out.K2.simpson.PROPN.anyAbove}/${out.K2.simpson.PROPN.available}, NOUN ${out.K2.simpson.NOUN.anyAbove}/${out.K2.simpson.NOUN.available}`, held: Math.max(out.K2.simpson.PROPN.anyAbove, out.K2.simpson.NOUN.anyAbove) >= ge(nl, 3) };
P.P8 = { claim: "mention-count slopes differ between kinds (p <= 0.05) in >= 5/10", observed: `${out.K2.slopeP_le05}/${nl}`, held: out.K2.slopeP_le05 >= ge(nl, 5) };
P.P9 = { claim: "C - P > 0 (lower bound > 0) in >= 8/10", observed: `${out.K3.PROPN["C-P"].positiveLoGt0}/${out.K3.languages}`, held: out.K3.PROPN["C-P"].positiveLoGt0 >= ge(out.K3.languages, 8) };
P.P10 = { claim: "PK - Kd >= 0.03 (lower > 0) in <= 3/10", observed: `${out.K3.PROPN["PK-Kd"].atLeast003LoGt0}/${out.K3.languages}`, held: out.K3.PROPN["PK-Kd"].atLeast003LoGt0 <= le(out.K3.languages, 3) };
P.P11 = { claim: "C - PK >= 0.03 (lower > 0) in <= 3/10", observed: `${out.K3.PROPN["C-PK"].atLeast003LoGt0}/${out.K3.languages}`, held: out.K3.PROPN["C-PK"].atLeast003LoGt0 <= le(out.K3.languages, 3) };
P.P12 = { claim: "K3b: >= 1 detectable kind in every language", observed: `${out.K3.K3b.languagesWithDetectableKind}/${LV.length}`, held: out.K3.K3b.languagesWithDetectableKind === LV.length };
P.P13 = { claim: "K4 NOT supported (p > 0.05); alignment of kind signatures above the random-partition baseline", observed: `signature3 p=${out.K4.signature3?.p} signature2 p=${out.K4.signature2?.p} K* p=${out.K4.Kstar3?.p}; alignment kinds ${out.K4.alignmentMean.kinds} vs random ${out.K4.alignmentMean.randomPartitions} vs freq bands ${out.K4.alignmentMean.freqBands}`, held: !out.K4.supported && out.K4.alignmentMean.kinds > out.K4.alignmentMean.randomPartitions };
out.verdict = { K1: out.K1.passAll >= Math.ceil(0.8 * n) ? "SUPPORTED" : "NOT SUPPORTED (fewer than 80% pass a-c)", K2: (out.K2.T2a_all_pass < LV.length / 2 && out.K2.T2b_shadow_pass < LV.length / 2) ? "FALSIFIED (T2a and T2b both pass in fewer than half)" : `NOT FALSIFIED by the registered rule, but weak: T2a ${out.K2.T2a_all_pass}/${out.K2.T2a_all_available}, T2b shadow ${out.K2.T2b_shadow_pass}/${out.K2.T2b_available}`, K3: out.K3.PROPN_supported >= 0.4 * out.K3.languages ? "SUPPORTED" : "FALSIFIED (supported in < 40% of languages)", K4: out.K4.supported ? "SUPPORTED" : "NOT SUPPORTED" };

fs.mkdirSync(RES, { recursive: true });
fs.writeFileSync(path.join(RES, `AGG${TAG}.json`), JSON.stringify(out, null, 1));
const T = [];
T.push(`AGG ${SRC} verdict=${VERDICT.join(",")}  stems=${STEMS.join(",")}  prereg ${out.headerSha256.slice(0, 16)}`);
T.push("\nK1 per language: tokens forms K* margin leaves | chronoM terc nmiBand nmiUpos/shuf | ctrlK1 ctrlP | nominalK propnK maxPropn");
for (const s of STEMS) { const o = out.languages[s]; if (o.gap) { T.push(`${s} gap ${o.gap}`); continue; } T.push(`${s.padEnd(9)} ${String(o.tokens).padStart(6)} ${String(o.nForms).padStart(5)} K*=${String(o.Kstar).padStart(2)} m=${o.margin} lv=${o.leaves} | ${o.chronoMargin} ${o.tercilesPassed} ${o.nmiBands} ${o.nmiUpos}/${o.nmiUposShuffled} | ${o.ctrlShareK1} ${o.ctrlEmpiricalP} | ${o.nominalKinds} ${o.propnKinds} ${o.maxPropnShare}`); }
T.push("\n" + JSON.stringify(out.K1)); T.push("\nK2 " + JSON.stringify({ ...out.K2, P6: { ...out.K2.P6, detail: undefined } }));
T.push("\nK3 " + JSON.stringify(out.K3)); T.push("\nK4 " + JSON.stringify({ ...out.K4, Kstar: undefined }));
T.push("\nPREDICTIONS");
for (const [k, v] of Object.entries(P)) T.push(`${k} ${v.held ? "HELD  " : "FAILED"} | ${v.claim} | observed ${v.observed}`);
T.push("\nVERDICTS " + JSON.stringify(out.verdict));
fs.writeFileSync(path.join(RES, `AGG${TAG}.txt`), T.join("\n"));
console.log(T.join("\n"));
