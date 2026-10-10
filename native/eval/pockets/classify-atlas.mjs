// classify-atlas.mjs — implements PROTOCOL.md EXACTLY on results/atlas/*.json (interpretations fixed before the atlas ran: results/FIXES.md entries 0-1; mapping: classify-config.mjs).
//   node classify-atlas.mjs [--atlas results/atlas] [--out results]     writes <out>/law-table.json and <out>/atlas-matrix.json, prints a summary.
// Deterministic: no Math.random, no Date; permutations use rngOf/seedOf. Reads <out>/g2-determinism.json when present (written by atlas-g2.mjs).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import * as CFG from "./classify-config.mjs";
import { STAT, pockets, cells, lawIdx, recs, round, OUT, ROOT } from "./classify-data.mjs";
import { fin, spearman, median } from "./classify-lib.mjs";
import { analyse } from "./classify-laws.mjs";
import { g0Checks, g3, falsePresent } from "./classify-gates.mjs";
import { calibrate, selectLaws, leadsOf, redundancy } from "./classify-select.mjs";

const protocolSha = createHash("sha256").update(fs.readFileSync(path.join(ROOT, "PROTOCOL.md"))).digest("hex");
const laws = analyse(), g0 = g0Checks(), grain = g3();
for (const l of laws) { l.g0 = g0.perStat[l.stat]; }
const red = redundancy(laws);
for (const l of laws) l.mostSimilar = red[l.stat];
const sel = selectLaws(laws), cal = calibrate(laws), leads = leadsOf(laws);
const nDef = laws.reduce((a, l) => a + l.N, 0), nPres = laws.reduce((a, l) => a + l.nPos + l.nNeg, 0), fp = falsePresent(g0, nDef, nPres);

// G1 summary, G2 (from atlas-g2.mjs when present), errors, size
const g1 = { rule: "|Spearman rho| >= 0.7 of pocket-level v against log10 tokens or mean unit length flags sizeConfounded", flagged: laws.filter((l) => l.sizeConfounded).map((l) => `${l.stat} (rhoTokens ${l.g1.rhoTokens}, rhoUnit ${l.g1.rhoUnitLength})`),
  nFlagged: laws.filter((l) => l.sizeConfounded).length, nStatistics: laws.length, nPocketsUsed: lawIdx.length };
let g2 = null; try { g2 = JSON.parse(fs.readFileSync(path.join(OUT, "g2-determinism.json"), "utf8")); } catch { g2 = { status: "not run" }; }
const atlasErrors = pockets.filter((p) => p.errors).map((p) => ({ pocket: p.id, errors: p.rec.errors }));
const byKind = (k) => pockets.filter((p) => p.kind === k).length;
const summary = { protocolSha256: protocolSha, protocolShaExpected: "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc", protocolUnchanged: protocolSha === "3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc",
  configSha256: createHash("sha256").update(fs.readFileSync(path.join(ROOT, "classify-config.mjs"))).digest("hex"), atlasFiles: recs.length,
  pockets: { total: pockets.length, realNonThin: lawIdx.length, thin: pockets.filter((p) => p.thin).length, planted: byKind("planted"), controls: byKind("control"),
    byGroup: Object.fromEntries([...new Set(pockets.filter((p) => p.inLaw).map((p) => p.group))].sort().map((g) => [g, pockets.filter((p) => p.inLaw && p.group === g).length])) },
  statistics: laws.length, definedRealCells: nDef, atlasErrors };
const table = { summary, gates: { G0: { ...g0.gate, iidWorlds: { rate4: round(g0.iid.rate4, 4), rate2: round(g0.iid.rate2, 4), halfCells: g0.iid.halfCells, absZge4: g0.iid.absZge4, perWorld: g0.iid.perWorld, presentCells: g0.iid.present },
  controls: { rate4: round(g0.ctrl.rate4, 4), rate2: round(g0.ctrl.rate2, 4), halfCells: g0.ctrl.halfCells, absZge4: g0.ctrl.absZge4, presentCells: g0.ctrl.present, perWorld: g0.ctrl.perWorld }, phenomena: g0.phenomena, abbrev: g0.abbrev, cancel: g0.cancel,
  statisticsFailingPlantedCheck: laws.filter((l) => l.g0.fail).map((l) => ({ stat: l.stat, reasons: l.g0.reasons })) }, G1: g1, G2: g2, G3: grain }, falsePresent: fp, calibration: cal, selection: sel, leads, statistics: laws.map((l) => ({ ...l, byGroup: l.byGroup, byGrain: l.byGrain })) };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "law-table.json"), JSON.stringify(table, null, 1));
const R6 = (x) => (fin(x) ? Number(x.toPrecision(6)) : x ?? null);
const matrix = { protocolSha256: protocolSha, statistics: STAT.map((s) => s.id), statisticNull: STAT.map((s) => s.null), halves: ["discover", "confirm"], cellFields: ["vDiscover", "zDiscover", "vConfirm", "zConfirm", "status"],
  statusCodes: { "P+": "PRESENT positive both halves", "P-": "PRESENT negative both halves", A: "ABSENT", M: "AMBIGUOUS", zundef: "v finite but z undefined in a half (zero-variance null)", nodata: "v null in a half", thin: "thin pocket" },
  pockets: pockets.map((p, i) => ({ id: p.id, kind: p.kind, group: p.group, register: p.register, language: p.language, script: p.script, grain: p.grain, tokens: p.tokens, units: p.units, docs: p.docs, meanUnitLength: R6(p.meanUnitLength), thin: p.thin,
    cells: cells[i].map((c) => (c.st === "thin" ? null : [R6(c.vD), R6(c.zD), R6(c.vC), R6(c.zC), c.st]))})) };
fs.writeFileSync(path.join(OUT, "atlas-matrix.json"), JSON.stringify(matrix));
// ------------------------------------------------------------ console summary
const P = (x, w) => String(x ?? "").padEnd(w);
console.log(`pockets: ${JSON.stringify(summary.pockets)}  defined real cells ${nDef}  PRESENT ${nPres}  atlas errors ${atlasErrors.length}`);
console.log(`G0 pass=${g0.gate.pass} iid rate4=${round(g0.iid.rate4, 4)} (${g0.iid.absZge4}/${g0.iid.halfCells}) controls rate4=${round(g0.ctrl.rate4, 4)} (${g0.ctrl.absZge4}/${g0.ctrl.halfCells}) phenomena ${g0.gate.phenomenaRecovered}/${g0.gate.phenomenaTotal} unrecovered: ${g0.gate.unrecovered.join("; ")}`);
console.log(`G1 flagged ${g1.nFlagged}/${g1.nStatistics}; stats failing planted check: ${laws.filter((l) => l.g0.fail).map((l) => l.stat).join(", ")}`);
console.log(P("stat", 22) + P("N", 5) + P("pos", 5) + P("neg", 5) + P("abs", 5) + P("zU", 5) + P("status", 36) + P("pred", 11) + P("size", 5) + P("g0", 8) + "medMinZ");
for (const l of laws) console.log(P(l.stat, 22) + P(l.N, 5) + P(l.nPos, 5) + P(l.nNeg, 5) + P(l.nAbs, 5) + P(l.zUndef, 5) + P(l.statuses.join("+") || l.primary, 36) + P(l.predict, 11) + P(l.sizeConfounded ? "SIZE" : "", 5) + P(l.g0.fail ? "FAIL" : l.g0.validation.slice(0, 7), 8) + l.medianMinZ);
console.log(`selected: ${sel.specific.map((s) => s.stat).join(", ")} | universal: ${sel.universal.map((s) => s.stat).join(", ")}`);
console.log(`calibration: strict ${cal.strictMatches}/${cal.n}, loose ${cal.looseMatches}/${cal.n}`);
console.log(`false PRESENT: expected ${fp.plantedIid.expectedFalseFromRate4} (iid rate) / ${fp.controls.expectedFalseFromRate4} (controls) vs observed ${nPres} of ${nDef}`);
