// exploration: do the asymmetry proxy (bin-level and type-level variants), edgeGap and condR-condL separate head-initial from head-final languages? UD DEV splits only (the held-out test split is not read). node explore-asym.mjs
process.env.UD_SPLITS = "dev";
const { load } = await import("../../../loaders/ud.mjs");
import { prep, NB, entropyMM } from "../../_comp_prep.mjs";
import * as fam from "../../comp.mjs";
import { round, tokensOf } from "./_t_util.mjs";
import { asymStat } from "../../_comp_neigh.mjs";
const stems = ["eng", "spa", "fra", "deu", "ita", "por", "swe", "rus", "pol", "arb", "heb", "vie", "ind", "cmn", "jpn", "kor", "tur", "hin", "urd", "fas", "fin", "hun", "eus"];
const rows = [];
for (const p of await load(stems.map((s) => `ud-${s}`))) {
  const P = prep(p), c = fam.compute(p);
  rows.push({ id: p.id, tokens: P.N, meanUnit: round(P.N / p.units.length, 1), asymEq: round(asymStat(P).eq, 4), asymPooled: round(asymStat(P).pooled, 4), edgeGap: round(c.edgeGap, 3), condR: round(c.condR, 4), condL: round(c.condL, 4), initEnt: round(c.initEnt, 3), finEnt: round(c.finEnt, 3) });
}
console.log(["id", "tokens", "meanUnit", "asymEq", "asymPooled", "edgeGap", "condR", "condL", "initEnt", "finEnt"].join("\t"));
for (const r of rows) console.log(Object.values(r).join("\t"));
