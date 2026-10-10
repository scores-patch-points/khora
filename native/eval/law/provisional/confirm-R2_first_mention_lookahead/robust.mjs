// robust.mjs — POST-HOC robustness of the registered primary cell (written AFTER results/irc.json existed; it does not change the registered verdict, it can only add a caveat).
// Disclosure: I have seen results/irc.json (primary AUC 0.6845 M4, controls i/len/cl/lc in band). I have NOT looked at stream position of pairs or at forward-window scores.
// R-A  STREAM-POSITION CONTROL. The registered controls do not include where in the day the first mention falls. rel = m / nMsg and rem = log2(1 + nMsg - m) are added as controls.
//      Pre-stated rule: if either control AUC is outside [0.45, 0.55] the AUC is re-computed on pairs with equal log2(1+rem) bin and on pairs with |d rel| <= 0.05; the registered CONFIRMED is then
//      reported with a caveat unless the re-computed AUC >= 0.62 with pair-CI lower bound >= 0.55 (in which case the signal is not a stream-position artefact). Blind prediction: controls out of band (nicks start earlier), re-computed AUC >= 0.62.
// R-B  FORWARD-DELAY CURVE. INIT_F{8,32,128,512} = messages in (m, m+W] whose first word is the form (a reader that decides W messages after the first mention). Blind prediction: AUC non-decreasing in W,
//      F8 in [0.52, 0.62], F32 in [0.56, 0.66], F128 in [0.60, 0.69], F512 in [0.62, 0.71], Finf = registered 0.6845.
// R-C  FALSE-POSITIVE ANATOMY. For pairs where the matched NEGATIVE fires (INIT_Tinf >= 2): share whose form equals a nickname of a speaker with 1-2 messages that day (gold label noise: a real nick labelled ordinary).
//      Blind prediction: >= 25% of firing negatives are 1-2-message speakers' nicks. Also the AUC after relabelling those negatives as missing (pairs dropped), predicted >= registered AUC.
import fs from "node:fs";
import { loadIrc, nickForm, rngOf, round, IRC_ROOT } from "./lib.mjs";
import { firstPairs, lb, ub } from "./ix.mjs";
import { pAuc, bootPairs, bootDays, ctlOf } from "./stats.mjs";
const DAYS = JSON.parse(fs.readFileSync(new URL("./days.json", import.meta.url), "utf8")).confirmSet.EN, OUT = { note: "post-hoc robustness; see header" }, pairs = [];
const speakersOf = (key) => { const c = new Map(); for (const l of fs.readFileSync(`${IRC_ROOT}/${key}`, "utf8").split("\n")) { const m = /^<([^>]+)>/.exec(l); if (m) c.set(nickForm(m[1]), (c.get(nickForm(m[1])) ?? 0) + 1); } return c; };
for (const key of DAYS) {
  const d = loadIrc(key, "real"), r = firstPairs(d, 400, 4, "real"), ix = d.ix, spk = speakersOf(key), N = d.nMsg;
  for (const p of r.pairs) {
    for (const o of [p.pos, p.neg]) { o.rel = o.m / N; o.rem = Math.log2(1 + N - o.m); for (const W of [8, 32, 128, 512]) { const a = ix.initIdx.get(o.w) ?? []; o[`INIT_F${W}`] = ub(a, o.m + W) - ub(a, o.m); } }
    p.day = key; p.negSpoke = spk.get(p.neg.w) ?? 0; p.posSpoke = spk.get(p.pos.w) ?? 0; pairs.push(p);
  }
}
OUT.n = pairs.length; OUT.registeredAuc = round(pAuc(pairs, "INIT_Tinf")); OUT.ctlRegistered = ctlOf(pairs);
OUT.RA = { relControl: round(pAuc(pairs, "rel")), remControl: round(pAuc(pairs, "rem")) };
const f = (x) => Math.floor(Math.log2(1 + x));
const sub = { equalRemBin: pairs.filter((p) => Math.floor(p.pos.rem) === Math.floor(p.neg.rem)), relWithin05: pairs.filter((p) => Math.abs(p.pos.rel - p.neg.rel) <= 0.05), relWithin02: pairs.filter((p) => Math.abs(p.pos.rel - p.neg.rel) <= 0.02) };
OUT.RA.subsets = Object.fromEntries(Object.entries(sub).map(([k, ps]) => [k, { n: ps.length, auc: round(pAuc(ps, "INIT_Tinf")), ci: ps.length >= 20 ? bootPairs(ps, "INIT_Tinf", 1000, "ra-" + k) : null, dayCi: ps.length >= 20 ? bootDays(ps, "INIT_Tinf", 1000, "rad-" + k) : null, relCtl: round(pAuc(ps, "rel")) }]));
OUT.RB = Object.fromEntries(["INIT_F8", "INIT_F32", "INIT_F128", "INIT_F512", "INIT_Tinf"].map((c) => [c, { auc: round(pAuc(pairs, c)), ci: bootPairs(pairs, c, 500, "rb" + c), tpr_ge2: round(pairs.filter((p) => p.pos[c] >= 2).length / pairs.length), fpr_ge2: round(pairs.filter((p) => p.neg[c] >= 2).length / pairs.length), tpr_ge1: round(pairs.filter((p) => p.pos[c] >= 1).length / pairs.length), fpr_ge1: round(pairs.filter((p) => p.neg[c] >= 1).length / pairs.length) }]));
const fire = pairs.filter((p) => p.neg.INIT_Tinf >= 2), noisy = fire.filter((p) => p.negSpoke >= 1);
OUT.RC = { firingNegatives: fire.length, negFormSpokeAtAll: noisy.length, share: round(noisy.length / Math.max(1, fire.length)), forms: fire.slice(0, 400).map((p) => `${p.neg.w}:${p.negSpoke}:${p.neg.INIT_Tinf}`).sort().slice(0, 120) };
const clean = pairs.filter((p) => p.negSpoke === 0); OUT.RC.cleanNegPairs = { n: clean.length, auc: round(pAuc(clean, "INIT_Tinf")), ci: bootPairs(clean, "INIT_Tinf", 1000, "rc"), tpr: round(clean.filter((p) => p.pos.INIT_Tinf >= 2).length / clean.length), fpr: round(clean.filter((p) => p.neg.INIT_Tinf >= 2).length / clean.length) };
OUT.RC.allNegSpokeShare = round(pairs.filter((p) => p.negSpoke >= 1).length / pairs.length);
fs.writeFileSync(new URL("./results/robust.json", import.meta.url), JSON.stringify(OUT, null, 1)); console.log(JSON.stringify({ ...OUT, RC: { ...OUT.RC, forms: undefined } }, null, 1));
