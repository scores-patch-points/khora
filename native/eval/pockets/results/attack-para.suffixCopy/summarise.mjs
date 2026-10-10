// summarise.mjs -- one-page consolidation of the attack numbers (reads out/analysis-*.json and out/D.json; writes out/summary.json).
import path from "node:path";
import { HERE, readJson, writeJson } from "./common.mjs";
const J = (n) => readJson(path.join(HERE, "out", n));
const A = J("analysis-A.json"), AP = J("analysis-A-allpockets.json"), B = J("analysis-B.json"), C = J("analysis-C.json"), D = J("analysis-D.json"), E = J("analysis-E.json"), F = J("analysis-F.json"), L = J("analysis-lag.json"), S = J("analysis-size.json"), A2 = J("analysis-A2.json");
const v = (n) => ({ avail: A.variants[n].nAvailable, Pplus: A.variants[n].status["P+"] || 0, expectedIfEffectKept: A.variants[n].expectedPplusIfEffectSizeKept, medianRatio: A.variants[n].medianRatioObsOverNull });
const sum = {
  A: { atlasPresentPockets: A.nPresentAtlas, base20draws: A.baseStatus20, tokenisation: { rare1pct: v("tok-rare1pct"), hapax: v("tok-hapax"), stem5: v("tok-stem5"), nodiacr: v("tok-nodiacr") }, bands: { S: v("band-S"), M: v("band-M"), L: v("band-L") }, equalTokens: { sub40r0: v("sub40-r0"), sub40r1: v("sub40-r1"), sub100: v("sub100-r0"), sub40bandM: v("sub40band-r0") }, bandMeanUnitLengthSpread: A2, allPocketsPplus: AP, prevalenceBySizeBin: S.bins, nonCodeSpearmanZvsLogTokens: S.spearmanZvsLogTokensNonCode },
  B: { cheapRivalsOnV: B.cheapV, controlsAloneR2OnPatternZ: B.controlsAloneR2_z, topAtlasRivalsOnZ: B.rivalsZ.slice(0, 5), topAtlasRivalsOnV: B.rivalsV.slice(0, 5), cheapRivalsSamePairs: B.cheap, decomposition: B.decomposition, statusInPresentPockets: B.statusCounts },
  C: { multiplicity: C.multiplicity, shared: { reproduction: C.shared.reproduction, perm: C.shared.perm, westfallYoung: C.shared.westfallYoungMinP, registerWithinGroup: C.shared.registerWithinGroupStratified, leaveOnePocketOut: C.shared.leaveOnePocketOut, leaveOneRegisterOut: C.shared.leaveOneRegisterOut, afterDroppingAll100pct: C.shared.afterDroppingAllHundredPercentRegisters, panel81: { nTestable: C.shared.panel81.nTestable, nSig05: C.shared.panel81.nSignificantP05, nSig001: C.shared.panel81.nSignificantP001, suffixCopyRank: C.shared.panel81.suffixCopyRank } } },
  D: D, E: { kinds: E.kinds, allPockets: E.allPockets, joint: E.joint, decomposition: E.decomposition, ratioQuantiles: E.ratioQuantiles, byGroup: E.byGroup }, F: F, lag: L.byClass,
};
writeJson("out/summary.json", sum);
console.log("written out/summary.json", JSON.stringify(sum).length, "bytes");
