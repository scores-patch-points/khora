// results/confirm-order.rareCurve/summarise.mjs — reads the frozen PREREG (confirm.mjs header) and pockets/*.json; writes summary.json. Never computes a law statistic itself; applies the pre-registered rules.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREREG } from "./confirm.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8"));
const statusOf = (za, zb) => {
  if (za == null || zb == null) return "UNDEFINED";
  if (Math.abs(za) >= 4 && Math.abs(zb) >= 4 && za * zb > 0) return za > 0 ? "PRESENT+" : "PRESENT-";
  if (Math.abs(za) < 2 && Math.abs(zb) < 2) return "ABSENT";
  return "AMBIGUOUS";
};
const rank = (xs) => { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; for (let k = i; k <= j; k++) r[ix[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const pearson = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
const spearman = (a, b) => pearson(rank(a), rank(b));
// Student t (nu = 9) upper tail by Simpson integration; z = (v - m)/s with m, s from n = 10 null draws is sqrt(1 + 1/10) times a t with 9 df
const tTail = (c) => { const nu = 9, k = 24 / (Math.sqrt(nu * Math.PI) * 11.631728396567448), f = (t) => k * Math.pow(1 + t * t / nu, -(nu + 1) / 2); const hi = 400, n = 200000, h = (hi - c) / n; let s = f(c) + f(hi); for (let i = 1; i < n; i++) s += f(c + i * h) * (i % 2 ? 4 : 2); return s * h / 3; };
const SC = Math.sqrt(1.1), p4 = tTail(4 / SC), p2 = tTail(2 / SC);

const rows = [];
for (const s of [...PREREG.siblings, ...PREREG.controls]) {
  const f = path.join(HERE, "pockets", `${s.id}.json`);
  if (!fs.existsSync(f)) { rows.push({ id: s.id, missing: true, side: s.side ?? "control", prediction: s.prediction }); continue; }
  const d = R(`pockets/${s.id}.json`), A = d.halves.discover, B = d.halves.confirm, ca = A.cells["order.rareCurve"], cb = B.cells["order.rareCurve"];
  const status = statusOf(ca.z, cb.z), status200 = statusOf(ca.z200, cb.z200), pocketV = (ca.v + cb.v) / 2;
  const thin = d.meta.thin, side = s.side ?? "control";
  const sign = s.prediction === "PRESENT+" ? 1 : s.prediction === "PRESENT-" ? -1 : 0;
  const holds = !thin && s.side != null && status === s.prediction;
  const weak = s.prediction === "ABSENT" ? status === "ABSENT" : (ca.z * sign >= 2 && cb.z * sign >= 2);
  const inRange = s.vRange ? (pocketV >= s.vRange[0] && pocketV <= s.vRange[1]) : s.absVMax != null ? Math.abs(pocketV) <= s.absVMax : null;
  const riv = (id) => ({ vA: A.cells[`order.${id}`].v, zA: A.cells[`order.${id}`].z, vB: B.cells[`order.${id}`].v, zB: B.cells[`order.${id}`].z, status: statusOf(A.cells[`order.${id}`].z, B.cells[`order.${id}`].z) });
  const vr = (k) => ({ vA: A.variants[k].v, zA: A.variants[k].z, vB: B.variants[k].v, zB: B.variants[k].z, status: statusOf(A.variants[k].z, B.variants[k].z) });
  rows.push({ id: s.id, side, kind: s.kind ?? "shuffled control", prediction: s.prediction, confidence: s.confidence ?? null, tokens: d.meta.tokens, thin, halfTokens: [A.tokens, B.tokens],
    discover: { v: ca.v, nullMean: ca.nullMean, nullSd: ca.nullSd, z: ca.z, z200: ca.z200, boot: [A.bootstrap.lo, A.bootstrap.hi] }, confirm: { v: cb.v, nullMean: cb.nullMean, nullSd: cb.nullSd, z: cb.z, z200: cb.z200, boot: [B.bootstrap.lo, B.bootstrap.hi] },
    pocketV, status, status200, holds, weakHold: weak, constantInRange: inRange, vRange: s.vRange ?? null, absVMax: s.absVMax ?? null,
    rivals: { surprGrow: riv("surprGrow"), entCurv: riv("entCurv"), rareSlope: riv("rareSlope"), initDev: riv("initDev"), finalDev: riv("finalDev") }, variants: { logcount: vr("logcount"), hapax: vr("hapax"), content: vr("content") } });
}

// ---- aggregate by side, verdict ----
const sib = rows.filter((r) => r.side !== "control"), scored = sib.filter((r) => !r.missing && !r.thin), ctl = rows.filter((r) => r.side === "control");
const bySide = {};
for (const side of ["plus", "minus", "absent"]) {
  const x = scored.filter((r) => r.side === side);
  bySide[side] = { n: x.length, holds: x.filter((r) => r.holds).length, share: x.length ? x.filter((r) => r.holds).length / x.length : null, weakHolds: x.filter((r) => r.weakHold).length,
    statusCounts: x.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}), holdIds: x.filter((r) => r.holds).map((r) => r.id), failIds: x.filter((r) => !r.holds).map((r) => `${r.id} (${r.status})`),
    constantInRange: x.filter((r) => r.constantInRange === true).length, constantRangeChecked: x.filter((r) => r.constantInRange != null && r.status.startsWith("PRESENT") && r.holds).length };
}
const nHold = scored.filter((r) => r.holds).length, missing = sib.filter((r) => r.missing).map((r) => r.id);
const bothSigns = scored.some((r) => r.side === "plus" && r.status === "PRESENT+") && scored.some((r) => r.side === "minus" && r.status === "PRESENT-");
let verdict;
if (missing.length) verdict = "INCOMPLETE";
else if (nHold === scored.length) verdict = "REPLICATES";
else if (nHold < scored.length / 2 || bySide.plus.share < 0.5 || bySide.minus.share < 0.5) verdict = "FAILS";
else verdict = "PARTIAL";
// ---- diagnostics ----
const sp = (key) => { const a = scored.map((r) => r.pocketV), b = scored.map((r) => (r.rivals[key].vA + r.rivals[key].vB) / 2); return spearman(a, b); };
const present = scored.filter((r) => r.status.startsWith("PRESENT"));
const collin = present.map((r) => ({ id: r.id, status: r.status, surprGrow: r.rivals.surprGrow.status, entCurv: r.rivals.entCurv.status, rareSlope: r.rivals.rareSlope.status }));
const xdef = scored.map((r) => ({ id: r.id, status: r.status, logcount: r.variants.logcount.status, hapax: r.variants.hapax.status, content: r.variants.content.status,
  logcountFlag: r.status.startsWith("PRESENT") && (((r.variants.logcount.zA ?? 0) * (r.discover.z ?? 0) < 0 && (r.variants.logcount.zB ?? 0) * (r.confirm.z ?? 0) < 0) || (Math.abs(r.variants.logcount.zA ?? 0) < 2 && Math.abs(r.variants.logcount.zB ?? 0) < 2)) }));
// the logcount variant has x = -ln(count): the same orientation as ln mid-rank (rarer = larger), so the same sign is expected
const summary = {
  law: PREREG.law, preregHeaderSha256: fs.readFileSync(path.join(HERE, "prereg.sha256"), "utf8").split(/\s+/)[0], verdict, scored: scored.length, hold: nHold, missing, bySide, bothSignsObserved: bothSigns,
  planShares: { plusPresentPlus: bySide.plus.share, plusTarget: 0.6, minusPresentMinus: bySide.minus.share, minusTarget: 0.75 },
  diagnostics: {
    selfCheck: fs.existsSync(path.join(HERE, "self-check.json")) ? R("self-check.json").allOk : null,
    rho: { rareCurve_vs_surprGrow: sp("surprGrow"), atlas_surprGrow: PREREG.atlas.rivalRhos["order.surprGrow"], rareCurve_vs_entCurv: sp("entCurv"), atlas_entCurv: PREREG.atlas.rivalRhos["order.entCurv"],
      rareCurve_vs_rareSlope: sp("rareSlope"), v_vs_logTokens: spearman(scored.map((r) => r.pocketV), scored.map((r) => Math.log(r.tokens))), atlas_v_vs_logTokens: PREREG.atlas.g1.rhoTokens },
    collinearity: collin, xDefinition: xdef, status200vs10: scored.map((r) => ({ id: r.id, status10: r.status, status200: r.status200 })),
    multiplicity: { pPresentWhenTrueVZero: 2 * p4 * p4, expectedChancePresentOver23: 23 * 2 * p4 * p4, pOneHalfAbove4: p4, pAbsentWhenTrueVZero: (1 - 2 * p2) ** 2, atlasNote: "the atlas has 390 cells for this statistic; expected chance PRESENT cells there = 390 x the same probability" },
    controls: ctl.map((r) => ({ id: r.id, status: r.status, notPresent: !String(r.status).startsWith("PRESENT"), zA: r.discover?.z, zB: r.confirm?.z, vA: r.discover?.v, vB: r.confirm?.v })),
    leak: fs.existsSync(path.join(HERE, "leak.json")) ? R("leak.json") : null,
  },
  rows,
};
fs.writeFileSync(path.join(HERE, "summary.json"), JSON.stringify(summary, null, 1));
const f3 = (x) => (x == null ? "  n/a" : (x >= 0 ? "+" : "") + x.toFixed(3)), f1 = (x) => (x == null ? "  n/a" : (x >= 0 ? "+" : "") + x.toFixed(1));
console.log(`VERDICT ${verdict}: ${nHold}/${scored.length} siblings HOLD; plus ${bySide.plus.holds}/${bySide.plus.n}, minus ${bySide.minus.holds}/${bySide.minus.n}, absent ${bySide.absent.holds}/${bySide.absent.n}; both signs observed: ${bothSigns}`);
for (const r of rows) console.log(r.missing ? `${r.id} MISSING` : `${r.id.padEnd(24)} ${r.side.padEnd(7)} pred ${r.prediction.slice(0, 20).padEnd(9)} -> ${r.status.padEnd(9)} ${r.side === "control" ? (String(r.status).startsWith("PRESENT") ? "CTRL-FALSE-PRESENT" : "ctrl ok") : r.holds ? "HOLDS" : "fails"} weak ${r.weakHold ? "y" : "n"} | v ${f3(r.discover.v)}/${f3(r.confirm.v)} z ${f1(r.discover.z)}/${f1(r.confirm.z)} z200 ${f1(r.discover.z200)}/${f1(r.confirm.z200)} | inRange ${r.constantInRange}`);
