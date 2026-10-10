// explore-beyond.mjs — DISCOVERY-DAYS-ONLY: does a frame statistic (NBIN/NDIV) or the share (ISHARE) carry anything beyond the plain first-word COUNT (INIT) at equal log2(1+INIT) bins? Not a test; informs the shortlist note.
process.env.CHAT_FREQBIN = "4";
const { daysOf, collect } = await import("./collect.mjs");
const { beyondRival, pAuc, round } = await import("./stats.mjs");
const { out } = collect(daysOf("discovery"), "real", 400);
const SC = { EN: (p) => p.lang === "en", DE: (p) => p.channel === "ubuntu-de", ES: (p) => p.channel === "ubuntu-es", IT: (p) => p.channel === "ubuntu-it" };
const res = {};
for (const st of ["LATER", "FIRST"]) for (const [sn, f] of Object.entries(SC)) for (const fa of ["ALL", "INIT", "NONINIT"]) {
  const pairs = out[st].filter((p) => f(p) && (fa === "ALL" || (fa === "INIT") === p.init));
  const r = { n: pairs.length };
  for (const [c, riv] of [["NBIN_Cinf", "INIT_Cinf"], ["NDIV_Cinf", "INIT_Cinf"], ["ISHARE_Cinf", "INIT_Cinf"], ["NBIN_Tinf", "INIT_Tinf"], ["NDIV_Tinf", "INIT_Tinf"], ["ISHARE_Tinf", "INIT_Tinf"], ["INIT_Tinf", "CNT_Tinf"], ["INIT_Cinf", "CNT_Cinf"], ["REC_C", "INIT_Cinf"], ["INIT_C32", "CNT_C32"], ["INIT_C128", "CNT_C128"]]) r[`${c}|${riv}`] = beyondRival(pairs, c, riv);
  res[`${st}|${sn}|${fa}`] = r;
}
import fs from "node:fs"; fs.writeFileSync(new URL("./results/explore-beyond.json", import.meta.url), JSON.stringify(res, null, 1)); console.log("done");
