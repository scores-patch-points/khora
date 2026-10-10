// builds summary.json from results-*.json: G0 on the planted iid worlds, planted-phenomenon recovery (both halves, expected sign), iid calibration, real-text, size/length sweeps, timing, redundancy.
import fs from "node:fs";
import * as fam from "../../comp.mjs";
const rd = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), "utf8"));
const P = rd("./results-planted.json"), I = rd("./results-iid.json"), R = rd("./results-real.json"), C = rd("./results-checks.json");
const ids = fam.STATS.map((s) => s.id), out = {};
// G0: iid planted worlds
out.G0 = {};
for (const w of ["pl-null", "pl-null2"]) { let defined = 0, big = 0, ge2 = 0; const cells = []; for (const h of ["discover", "confirm"]) for (const id of ids) { const c = P.pockets[w][h].cells[id]; if (c.z == null) continue; defined++; if (Math.abs(c.z) >= 4) { big++; cells.push(`${h}/${id}/${c.z}`); } if (Math.abs(c.z) >= 2) ge2++; } out.G0[w] = { definedCells: defined, cellsAbsZge4: big, share: Math.round((big / defined) * 10000) / 10000, cellsAbsZge2: ge2, bigCells: cells }; }
// planted phenomena expected to be seen by the comp family (sign = expected sign of z), both halves needed at |z| >= 4
const EXPECT = [["pl-markov", "rank-bin-flow", [["condR", -1], ["condL", -1], ["miDecay", 1]]], ["pl-frames", "rigid-frames + company-classes (edges and neighbours)", [["condR", -1], ["condL", -1], ["initEnt", -1], ["finEnt", -1], ["edgeGap", 1], ["rigidR", 1]]], ["pl-frames", "vocative-names (unit-initial concentration)", [["initEnt", -1]]], ["pl-parallel", "anaphora + epiphora (adjacent units repeat prefix/suffix)", [["sameL", 1], ["sameR", 1]]]];
out.planted = EXPECT.map(([w, ph, stats]) => ({ world: w, phenomenon: ph, stats: stats.map(([id, sg]) => { const z = ["discover", "confirm"].map((h) => P.pockets[w][h].cells[id].z); return { id, expectedSign: sg, zDiscover: z[0], zConfirm: z[1], recovered: z.every((x) => x != null && Math.abs(x) >= 4 && Math.sign(x) === sg) }; }) }));
out.plantedRecoveredByAtLeastOne = out.planted.map((p) => ({ world: p.world, phenomenon: p.phenomenon, ok: p.stats.some((s) => s.recovered) }));
// planted worlds: every statistic that fires in both halves with the same sign (instrument map)
out.plantedFires = {}; for (const w of Object.keys(P.pockets)) { out.plantedFires[w] = []; for (const id of ids) { const a = P.pockets[w].discover.cells[id].z, b = P.pockets[w].confirm.cells[id].z; if (a != null && b != null && Math.abs(a) >= 4 && Math.abs(b) >= 4 && Math.sign(a) === Math.sign(b)) out.plantedFires[w].push(`${id}:${a > 0 ? "+" : "-"}`); } }
// iid calibration
let c4 = 0, cn = 0; for (const id of ids) { const x = I.perStat[id]; c4 += x.share4 * x.definedCells; cn += x.definedCells; }
out.iidCalibration = { replicates: I.R, cells: cn, cellsAbsZge4: Math.round(c4), share: Math.round((c4 / cn) * 10000) / 10000, nominalT9: 0.0031, perStat: Object.fromEntries(ids.map((id) => [id, { zSd: I.perStat[id].zSd, share4: I.perStat[id].share4, share2: I.perStat[id].share2, zMax: I.perStat[id].zMax, nullMeanBias: I.perStat[id].nullMeanBias, vMean: I.perStat[id].vMean }])) };
// size / length confounds: Spearman of mean v with tokens (iid and real) and with unit length (iid, real regroup); 'flag' when |rho| >= 0.7 AND the range is large against the law's own effect
const rng = (a) => { const x = a.filter((v) => v != null); return Math.max(...x) - Math.min(...x); };
out.confounds = Object.fromEntries(ids.map((id) => [id, { rhoTokensIid: C.sizeIid.perStat[id].spearman, rangeTokensIid: Math.round(rng(C.sizeIid.perStat[id].means) * 1e4) / 1e4, rhoTokensReal: C.sizeReal.perStat[id].spearman, rangeTokensReal: Math.round(rng(C.sizeReal.perStat[id].means) * 1e4) / 1e4, rhoUnitLenIid: C.lenIid.perStat[id].spearman, rangeUnitLenIid: Math.round(rng(C.lenIid.perStat[id].means) * 1e4) / 1e4, rhoUnitLenReal: C.lenReal.perStat[id].spearman, rangeUnitLenReal: Math.round(rng(C.lenReal.perStat[id].means) * 1e4) / 1e4, realValueAt60k: R.books["bk-great-expect"].cells[id].v }]));
out.timing = C.timing; out.determinism = C.determinism; out.scriptInvariance = C.scriptInvariance;
out.real = Object.fromEntries(Object.entries(R.books).map(([b, x]) => [b, Object.fromEntries(ids.map((id) => [id, { v: x.cells[id].v, z: x.cells[id].z, zRegroupIidD1: x.controls["regroup-iidD1"].cells[id].z }]))]));
// redundancy of condL with condR across every cell of every result file
const pairs = []; for (const w of Object.values(P.pockets)) for (const h of Object.values(w)) pairs.push([h.cells.condR.v, h.cells.condL.v]); for (const b of Object.values(R.books)) pairs.push([b.cells.condR.v, b.cells.condL.v]);
out.condRedundancy = { cells: pairs.length, maxAbsDiff: Math.max(...pairs.map(([a, b]) => Math.abs(a - b))) };
fs.writeFileSync(new URL("./summary.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ G0: out.G0, plantedRecoveredByAtLeastOne: out.plantedRecoveredByAtLeastOne, plantedFires: out.plantedFires, iid: { cells: cn, big: out.iidCalibration.cellsAbsZge4, share: out.iidCalibration.share }, condRedundancy: out.condRedundancy }, null, 1));
