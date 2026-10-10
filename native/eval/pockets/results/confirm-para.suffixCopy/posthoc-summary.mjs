// posthoc-summary.mjs — joins posthoc.json (A1-A3, A8), siblings/*.json (A4: prefixCopy, adjNg3; A5 size) and the atlas JSON of the same UD stems (A9) into posthoc-summary.json. Descriptive; cannot change the verdict.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { headerIntact } from "./confirm.mjs";
import { status, load as loadRows } from "./summarise.mjs";
import { spearman, poissonTail, normQuantileUpper } from "./posthoc.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ATLAS = path.resolve(HERE, "../atlas");
const PH = JSON.parse(fs.readFileSync(path.join(HERE, "posthoc.json"), "utf8")), rows = loadRows(path.join(HERE, "siblings")).filter((r) => !r.missing);
const sib = (id) => JSON.parse(fs.readFileSync(path.join(HERE, "siblings", `${id}.json`), "utf8"));
const f3 = (x) => (x == null ? null : Math.abs(x) >= 100 ? Math.round(x) : +x.toPrecision(3));
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const table = [];
for (const r of rows) {
  const P = PH.pockets[r.id].halves, S = sib(r.id), cell = (k) => [S.halves.discover.cells[k], S.halves.confirm.cells[k]];
  const pre = cell("para.prefixCopy"), a3 = cell("para.adjNg3");
  const pz = (key) => [P.discover[key].poissonZ, P.confirm[key].poissonZ];
  const st = (zs) => status(zs[0], zs[1]);
  const z = (key) => [P.discover[key].z, P.confirm[key].z];
  table.push({ id: r.id, cls: r.cls, tokens: r.tokens, status10: r.status, v: r.v, events: r.events, expectedEvents: [P.discover.base.nullEventsMean, P.confirm.base.nullEventsMean].map(f3),
    A1_noDup: { z: z("noDup").map(f3), events: [P.discover.noDup.events, P.confirm.noDup.events], status: st(z("noDup")) },
    A2_long6: { pairs: [P.discover.long6.pairs, P.confirm.long6.pairs], events: [P.discover.long6.events, P.confirm.long6.events], z: z("long6").map(f3), status: st(z("long6")) },
    A3_last1: { v: [P.discover.last1.v, P.confirm.last1.v].map(f3), z: z("last1").map(f3), status: st(z("last1")) },
    A3_cond: { v: [P.discover.cond.v, P.confirm.cond.v].map(f3), nullMean: [P.discover.cond.nullMean, P.confirm.cond.nullMean].map(f3), z: z("cond").map(f3), eventsOf: [P.discover.cond.pairs, P.confirm.cond.pairs] },
    A8_poisson: { p: [P.discover.base.poissonP, P.confirm.base.poissonP].map(f3), z: pz("base").map(f3), status: st(pz("base")), noDupStatus: st(pz("noDup")) },
    A8_pooled: { events: r.events[0] + r.events[1], expected: f3(P.discover.base.nullEventsMean + P.confirm.base.nullEventsMean), z: f3(normQuantileUpper(poissonTail(r.events[0] + r.events[1], P.discover.base.nullEventsMean + P.confirm.base.nullEventsMean))) },
    A4_prefixCopy: { z: pre.map((c) => f3(c.z)), v: pre.map((c) => f3(c.v)), status: status(pre[0].z, pre[1].z) }, A4_adjNg3: { z: a3.map((c) => f3(c.z)), v: a3.map((c) => f3(c.v)), status: status(a3[0].z, a3[1].z) } });
}
const vMean = (key) => rows.map((r) => { const S = sib(r.id); return mean([S.halves.discover.cells[key].v ?? 0, S.halves.confirm.cells[key].v ?? 0]); });
const vs = vMean("para.suffixCopy"), zMean = rows.map((r) => mean(r.z.map((x) => x ?? 0))), lt = rows.map((r) => Math.log(r.tokens));
const A4 = { rhoSuffixVsPrefix: f3(spearman(vs, vMean("para.prefixCopy"))), rhoSuffixVsAdjNg3: f3(spearman(vs, vMean("para.adjNg3"))), n: rows.length };
const A5 = { rhoVvsLogTokens: f3(spearman(vs, lt)), rhoMeanZvsLogTokens: f3(spearman(zMean, lt)), n: rows.length, note: "classes differ in size (code ~291k tokens, prose 23k-128k): read within class, not across" };
const A6 = { cells: rows.length, pPerCellAtlasFalsePresent: 8.488e-5, expectedFalsePresent: +(rows.length * 8.488e-5).toFixed(5), observedPresentPlus10: rows.filter((r) => r.status === "PRESENT+").length };
const nl = table.filter((t) => t.cls === "prose" || t.cls === "prose-exploratory" || t.cls === "children-exploratory"), halfCells = nl.flatMap((t, i) => [0, 1].map((h) => ({ id: t.id, half: h, events: t.events[h], expected: t.expectedEvents[h] })));
const A8sign = { cells: halfCells.length, observedAboveExpected: halfCells.filter((c) => c.events > c.expected).length, binomialP: 2 ** -halfCells.length, note: "English prose + children half-cells: observed suffix events vs the 100-draw unit-order null mean (sign test, halves treated as independent)" };
const A9 = [];
for (const r of rows.filter((x) => x.cls.startsWith("ud"))) {
  const stem = r.id.slice(7), a = JSON.parse(fs.readFileSync(path.join(ATLAS, `ud-${stem}.json`), "utf8")), c = (w) => a.halves[w]["para.suffixCopy"];
  A9.push({ stem, atlasTokens: a.meta.tokens, atlasV: [c("discover").v, c("confirm").v].map(f3), atlasNullMean: [c("discover").nullMean, c("confirm").nullMean].map(f3), atlasZ: [c("discover").z, c("confirm").z].map(f3), trainTokens: r.tokens, trainV: r.v.map(f3), trainNullMean: r.nullMean.map(f3), trainZ: r.z.map(f3), trainStatus: r.status,
    excessRatioAtlas: f3(mean([c("discover").v, c("confirm").v]) / mean([c("discover").nullMean, c("confirm").nullMean])), excessRatioTrain: f3(mean(r.v) / mean(r.nullMean)) });
}
const A9rho = { n: A9.length, rhoVAtlasVsTrain: f3(spearman(A9.map((x) => mean(x.atlasV)), A9.map((x) => mean(x.trainV)))), rhoExcessRatio: f3(spearman(A9.map((x) => x.excessRatioAtlas), A9.map((x) => x.excessRatioTrain))) };
const h = headerIntact();
fs.writeFileSync(path.join(HERE, "posthoc-summary.json"), JSON.stringify({ headerSha256: h.got, draws: PH.draws, note: PH.note, A4, A5, A6, A8sign, A9, A9rho, table }, null, 1));
for (const t of table) console.error(`${t.id.padEnd(26)} ${t.status10.padEnd(10)} exp ${t.expectedEvents.join("/")} ev ${t.events.join("/")} | noDup ${t.A1_noDup.z.join("/")} ${t.A1_noDup.status} | long6 ev ${t.A2_long6.events.join("/")} of ${t.A2_long6.pairs.join("/")} ${t.A2_long6.status} | last1 z ${t.A3_last1.z.join("/")} | cond ${t.A3_cond.v.join("/")} vs ${t.A3_cond.nullMean.join("/")} | poisZ ${t.A8_poisson.z.join("/")} ${t.A8_poisson.status} pooled ${t.A8_pooled.events} vs ${t.A8_pooled.expected} z ${t.A8_pooled.z} | pre ${t.A4_prefixCopy.status} adj3 ${t.A4_adjNg3.status}`);
console.error(JSON.stringify({ A4, A5, A6, A8sign, A9rho }));
