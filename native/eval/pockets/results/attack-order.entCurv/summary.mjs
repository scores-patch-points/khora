// summary.mjs -- compose attack-summary.json (headline numbers only; every number is read from the per-attack JSON files) and print it.
import fs from "node:fs";
import path from "node:path";
import { HERE } from "./lib.mjs";
const J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8"));
const A5 = J("A5_summary.json"), A = J("A_summary.json"), A3 = J("A3_summary.json"), A4 = J("A4_summary.json"), B = J("B_rival.json"), C = J("C_multiplicity.json"), D = J("D_summary.json"), E = J("E_siblings.json");
const v = (k) => ({ plus: A.variants[k].plus, minus: A.variants[k].minus });
const fmt = (x) => `${x.Psame}+${x.Popp}opp / sign ${x.signKept}/${x.evaluated}`;
const S = {
  protocolSha256: "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc",
  A: {
    baseReproducesAtlasMaxAbsDiff: A.baseMaxAbsDiffToAtlas,
    size: Object.fromEntries(["tok7500_r0", "tok7500_r1", "tok20000"].map((k) => [k, { Pplus: fmt(v(k).plus), Pminus: fmt(v(k).minus) }])),
    tokenisation: Object.fromEntries(["drop1pct", "dropHapax", "trunc5", "plugin"].map((k) => [k, { Pplus: fmt(v(k).plus), Pminus: fmt(v(k).minus) }])),
    binGranularityPresentPockets: Object.fromEntries(["binHalf", "binMass4"].map((k) => [k, { Pplus: fmt(v(k).plus), Pminus: fmt(v(k).minus), medianRetentionMinus: v(k).minus.medianRetention }])),
    binSweepAllPockets: Object.fromEntries(Object.entries(A3.schemes).map(([k, s]) => [k, { all: `P+${s.all["P+"]} P-${s.all["P-"]}`, word: `P+${s.word["P+"]} P-${s.word["P-"]} pos ${s.word.shareVpos}`, code: `P+${s.code["P+"]} P-${s.code["P-"]} pos ${s.code.shareVpos}` }])),
    meanUnitLength10_reRanked: { len10full_minusRetention: v("len10full").minus.medianRetention, len10full_minusSignKept: `${v("len10full").minus.signKept}/${v("len10full").minus.evaluated}`, tok7500len10_minusRetention: v("tok7500len10_r0").minus.medianRetention, tok7500len10_minusSignKept: `${v("tok7500len10_r0").minus.signKept}/${v("tok7500len10_r0").minus.evaluated}`, signByKind: A.signByKindUnderVariant.len10full },
    meanUnitLength10_fixedRanks: A4.vsReRanked,
    strataFixedRanks: A3.fixedLengthSplit, withinPocketSignChange: A3.withinPocket,
  },
  B: { n: B.n, maxPartialRho2: B.maxRho2, top: B.top12V.slice(0, 5), topSign: B.top12Sign.slice(0, 4), rivalReaches07: B.rivalReaches07, forward: B.forward, residual: B.residualStructure, signAccuracy: B.signAccuracy },
  C: { C0: { exactNullTail: C.C0.exactNullTail, entCurv: C.C0.entCurv, iid: C.C0.iidWorlds, controls: C.C0.lawFreeControls, selection: C.C0.selection }, C1: { presence: C.C1.presence.rows, sign: C.C1.sign.rows, expectedEta2: [C.C1.registerEta2ExpectedUnderPermutation_presence, C.C1.registerEta2ExpectedUnderPermutation_sign] }, C2: C.C2, C3: { presence: C.C3.presence, sign: C.C3.sign }, C4_nocode: C.C4.sign.removeCodeAndCharbigramAndHebrew, C5: C.C5, C6: C.C6 },
  A5_edgeAblation: A5.groups,
  D: { claims: D.claims, atlasPlanted: D.atlasPlanted, newWorlds: D.newWorlds.map((w) => ({ id: w.id, oct: w.entCurv_oct, v: w.v, zmin: w.zmin, half: w.entCurv_half, mass4: w.entCurv_mass4, rareCurve: w.rareCurve, entSlope: w.entSlope })) },
  E: E.pockets.map((p) => ({ id: p.id, zDiffToConfirmer: p.maxAbsZDiffToConfirmer, oct: p.variants.oct.status, half: p.variants.half.status, mass4: p.variants.mass4.status, plugin: p.variants.plugin.status })),
};
fs.writeFileSync(path.join(HERE, "attack-summary.json"), JSON.stringify(S, null, 1));
console.log(JSON.stringify(S.A, null, 0).slice(0, 5000));
