// eval/kinds-swarm/ant-shape/summary.mjs — aggregate the results/ JSON into the pre-registered verdicts V1-V6 (PREREG.md). Prints a compact JSON; writes results/summary.json.
import fs from "node:fs";
import path from "node:path";
import { RES, round, mean, quantile, signTestOneSided, bootMean, families, STEMS25 } from "./cvlib.mjs";
import { SIG_LABELS, ATM_LABELS, SPAN_LABELS, C_LABELS } from "../../law/impact.mjs";

const rd = (p) => { const f = path.join(RES, p); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const dirOf = (d) => (fs.existsSync(path.join(RES, d)) ? fs.readdirSync(path.join(RES, d)).filter((x) => x.endsWith(".json")).map((x) => x.replace(".json", "")) : []);
const fam = families();
const S = { sesoi: 0.03 };
const L1 = {}; for (const s of dirOf("l1")) { const r = rd(`l1/${s}.json`); if (r && !r.gap) L1[s] = r; }
const stems = STEMS25.filter((s) => L1[s]);
const NI = stems.length, NEED = Math.ceil(0.6 * NI);
S.informative = stems; S.nInformative = NI; S.need = NEED;
S.thin = STEMS25.filter((s) => !L1[s]);
const arms = Object.keys(L1[stems[0]]?.auc ?? {});
S.armMeans = Object.fromEntries(arms.map((a) => [a, round(mean(stems.map((s) => L1[s].auc[a]).filter((x) => x != null)))]));
S.perLanguage = Object.fromEntries(stems.map((s) => [s, { n: L1[s].n, FULL: L1[s].auc.FULL, SHAPE24: L1[s].auc.SHAPE24, MAGNITUDE: L1[s].auc.MAGNITUDE, RIVALS: L1[s].auc.RIVALS, "FULL+RIVALS": L1[s].auc["FULL+RIVALS"], POSITION: L1[s].auc.POSITION, permQ95: L1[s].permFullQ95, formBlock: L1[s].aucFullFormBlock }]));
// V1
const full = stems.map((s) => L1[s].auc.FULL);
const nulls = []; const B = Math.min(...stems.map((s) => L1[s].permFull?.length ?? 0));
for (let b = 0; b < B; b++) nulls.push(mean(stems.map((s) => L1[s].permFull[b])));
S.V1 = { nAtLeast060: full.filter((x) => x >= 0.6).length, of: NI, need: NEED, literalNeed15of25: full.filter((x) => x >= 0.6).length >= 15, meanFULL: round(mean(full)), permNullMean: round(mean(nulls)), permNullQ95: round(quantile(nulls, 0.95)), permDraws: B };
S.V1.holds = S.V1.nAtLeast060 >= NEED && S.V1.meanFULL > S.V1.permNullQ95;
// controls
S.K4_position = { mean: S.armMeans.POSITION, inside: S.armMeans.POSITION >= 0.47 && S.armMeans.POSITION <= 0.53 };
// V4, V5 and other differences
const diff = (a, b) => stems.map((s) => L1[s].auc[a] - L1[s].auc[b]);
const dd = (a, b) => { const d = diff(a, b); return { mean: round(mean(d)), ci95: bootMean(d, 2000, 7), nGe003: d.filter((x) => x >= 0.03).length, nPos: d.filter((x) => x > 0).length }; };
S.V4 = { ...dd("FULL", "SHAPE24") }; S.V4.holds = S.V4.mean >= 0.05;
S.V5 = { ...dd("FULL+RIVALS", "RIVALS") }; S.V5.holds = S.V5.nGe003 >= NEED;
S.diffs = { "FULL-MAGNITUDE": dd("FULL", "MAGNITUDE"), "FULL-RIVALS": dd("FULL", "RIVALS"), "FULL-SLOT": dd("FULL", "SLOT"), "FULL-SPAN": dd("FULL", "SPAN"), "FULL-ATM": dd("FULL", "ATM"), "FULL-C": dd("FULL", "C"), "FULL-POSITION": dd("FULL", "POSITION") };
// A2 form-block
const fb = stems.map((s) => L1[s].aucFullFormBlock).filter((x) => x != null);
S.A2_formBlock = { meanFormBlock: round(mean(fb)), meanPositionBlock: S.V1.meanFULL, gap: round(S.V1.meanFULL - mean(fb)) };
// A6 per class
S.A6_perClass = Object.fromEntries(["NOUN", "VERB", "ADJ"].map((c) => { const v = stems.map((s) => L1[s].perClass?.[c]?.auc).filter((x) => x != null); return [c, { mean: round(mean(v)), nLang: v.length, nGe060: v.filter((x) => x >= 0.6).length }]; }));
{ const v = stems.map((s) => { const p = L1[s].perClass; return p?.VERB?.auc != null && p?.NOUN?.auc != null ? Math.abs(p.VERB.auc - p.NOUN.auc) : null; }).filter((x) => x != null); S.A6_perClass.meanAbsVerbMinusNoun = round(mean(v)); const sgn = stems.map((s) => { const p = L1[s].perClass; return p?.VERB?.auc != null && p?.NOUN?.auc != null ? p.VERB.auc - p.NOUN.auc : null; }).filter((x) => x != null); S.A6_perClass.meanSignedVerbMinusNoun = round(mean(sgn)); S.A6_perClass.nVerbHigher = sgn.filter((x) => x > 0).length; }
// A7 feature carriers
const LAB = [...SIG_LABELS.map((x) => `sig:${x}`), ...ATM_LABELS.map((x) => `atm:${x}`), ...SPAN_LABELS.map((x) => `span:${x}`), ...C_LABELS.map((x) => `c:${x}`)];
const feats = LAB.map((lab, j) => { const v = stems.map((s) => L1[s].uniAuc?.[j]).filter((x) => x != null); const m = mean(v) - 0.5; const same = v.filter((x) => (x - 0.5) * m > 0).length; return { lab, meanDev: round(m), signConsistent: same, of: v.length }; });
S.A7_topFeatures = feats.filter((f) => f.of && Math.abs(f.meanDev) > 0).sort((a, b) => Math.abs(b.meanDev) - Math.abs(a.meanDev)).slice(0, 14);
const riv = ["logWinBefore", "logPrefix", "logGap", "logWinSents", "burst", "logLast16", "logLeftWinFreq", "logRightWinFreq", "leftDiv", "rightDiv", "sameLeft", "sameRight", "sentInitial", "sentFinal", "logSentLen", "logWordLen"];
S.A7_rivals = riv.map((lab, j) => { const v = stems.map((s) => L1[s].rivalUniAuc?.[j]).filter((x) => x != null); return { lab, meanDev: round(mean(v) - 0.5), signConsistent: v.filter((x) => (x - 0.5) * (mean(v) - 0.5) > 0).length, of: v.length }; }).sort((a, b) => Math.abs(b.meanDev) - Math.abs(a.meanDev)).slice(0, 8);
S.nullShare = { pos: round(mean(stems.map((s) => L1[s].nullShare.pos))), neg: round(mean(stems.map((s) => L1[s].nullShare.neg))) };
// by family (descriptive)
for (const [name, lab] of [["2", fam.two]]) { const g = {}; for (const s of stems) (g[lab[s]] ??= []).push(L1[s].auc.FULL); S.FULL_byFamily = Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { n: v.length, mean: round(mean(v)) }])); }
// L2
const l2 = {};
for (const [tag, file] of [["2", "s2"], ["3", "s3"], ["2z", "s2z"], ["3z", "s3z"]]) {
  const rs = stems.map((s) => rd(`l2/${file}-${s}.json`)).filter((r) => r && !r.gap);
  if (!rs.length) continue;
  const d = rs.map((r) => r.same - r.other), wins = rs.filter((r) => r.same > r.other).length;
  l2[tag] = { n: rs.length, meanSame: round(mean(rs.map((r) => r.same))), meanOther: round(mean(rs.map((r) => r.other))), meanAll: round(mean(rs.map((r) => r.all))), meanDiff: round(mean(d)), ci95: bootMean(d, 2000, 11), sameGtOther: wins, signP: round(signTestOneSided(wins, rs.length), 4), nDiffGe003: d.filter((x) => x >= 0.03).length, gaps: stems.filter((s) => rd(`l2/${file}-${s}.json`)?.gap) };
  l2[tag].V2 = l2[tag].meanDiff >= 0.03 && wins >= Math.ceil(0.6 * rs.length) && l2[tag].signP <= 0.05;
  l2[tag].perLanguage = Object.fromEntries(rs.map((r) => [r.stem, [r.same, r.other, r.all, r.k]]));
}
S.L2 = l2; S.L2b = rd("l2b.json");
// L3
S.L3 = rd("l3.json");
if (S.L3) { const a = S.L3["a UD-eng -> IRC"]; S.V3 = { auc: a?.auc, q95: a?.q95, holds: a ? a.auc >= 0.6 && a.auc > a.q95 : null }; }
// L4
const l4 = stems.map((s) => ({ s, sh: rd(`l4/${s}.json`), real: L1[s] })).filter((x) => x.sh && !x.sh.gap);
if (l4.length) {
  const real = l4.map((x) => x.real.auc.FULL), sh = l4.map((x) => x.sh.auc.FULL), d = real.map((r, k) => r - sh[k]);
  S.V6 = { n: l4.length, meanReal: round(mean(real)), meanShuffled: round(mean(sh)), meanDrop: round(mean(d)), ci95: bootMean(d, 2000, 13), nDropGe003: d.filter((x) => x >= 0.03).length, permNullQ95: S.V1.permNullQ95, rivalsReal: round(mean(l4.map((x) => x.real.auc.RIVALS))), rivalsShuffled: round(mean(l4.map((x) => x.sh.auc.RIVALS))), magnitudeReal: round(mean(l4.map((x) => x.real.auc.MAGNITUDE))), magnitudeShuffled: round(mean(l4.map((x) => x.sh.auc.MAGNITUDE))), shape24Real: round(mean(l4.map((x) => x.real.auc.SHAPE24))), shape24Shuffled: round(mean(l4.map((x) => x.sh.auc.SHAPE24))) };
  S.V6.dependent = S.V6.meanDrop >= 0.03; S.V6.collapses = S.V6.meanShuffled < S.V6.permNullQ95; S.V6.perLanguage = Object.fromEntries(l4.map((x) => [x.s, [x.real.auc.FULL, x.sh.auc.FULL]]));
}
S.L4irc = { real: rd("l4/irc-real.json"), shuffled: rd("l4/irc-shuffled.json") };
fs.writeFileSync(path.join(RES, "summary.json"), JSON.stringify(S, null, 1));
console.log(JSON.stringify(S, null, 1));
