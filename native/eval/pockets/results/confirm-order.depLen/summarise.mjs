// results/confirm-order.depLen/summarise.mjs — applies the FROZEN pass rule of confirm.mjs (header sha256 in prereg-header.sha256.txt) to siblings/*.json, adds the pre-announced adversary tables, writes summary.json.
//   node summarise.mjs            (reads siblings/ [10 draws, the PROTOCOL status], siblings100/ [robustness], siblings-rival/ [burst.repAdj], ../atlas/*.json [A3], ../law-table.json [A5])
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "../../lib/pocket.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const src = fs.readFileSync(path.join(HERE, "confirm.mjs"), "utf8"), endAt = src.indexOf("// ===== PREREG-END\n") + "// ===== PREREG-END\n".length;
const headerSha = sha256(src.slice(0, endAt)), recorded = fs.readFileSync(path.join(HERE, "prereg-header.sha256.txt"), "utf8").split(/\s/)[0];
if (headerSha !== recorded) throw new Error("pre-registration header changed");

export const SETS = {
  prose: ["sib-bk-zola", "sib-bk-chopin", "sib-bk-poe", "sib-bk-about-london", "sib-bk-waikna"],
  ud: ["sib-ud-ita", "sib-ud-nld", "sib-ud-ces", "sib-ud-dan", "sib-ud-rus"],
  code: ["sib-code-khora-core", "sib-code-khora-eval-js", "sib-code-fold-js", "sib-code-misc-js", "sib-code-py"],
  exploratoryProse: ["sib-bk-siddhartha", "sib-bk-kafka"],
  exploratoryUdPlus: ["sib-ud-lit", "sib-ud-ell", "sib-ud-gle", "sib-ud-afr", "sib-ud-mlt", "sib-ud-wol"],
  exploratoryUdHeadFinal: ["sib-ud-tur", "sib-ud-kat", "sib-ud-hye"],
};
export const status = (zd, zc) => (zd == null || zc == null ? "UNDEFINED" : zd >= 4 && zc >= 4 ? "PRESENT+" : zd <= -4 && zc <= -4 ? "PRESENT-" : Math.abs(zd) < 2 && Math.abs(zc) < 2 ? "ABSENT" : "AMBIGUOUS");
const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
export const spearman = (x, y) => { const n = x.length; if (n < 3) return null; const a = rank(x), b = rank(y), ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
const med = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const load = (dir, id) => { const f = path.join(HERE, dir, `${id}.json`); return fs.existsSync(f) ? J(f) : null; };
const row = (id, dir = "siblings") => {
  const j = load(dir, id); if (!j) return { id, missing: true };
  const d = j.halves.discover["order.depLen"], c = j.halves.confirm["order.depLen"], A = j.adversary ?? {};
  return { id, tokens: j.meta.tokens, units: j.meta.units, docs: j.meta.docs, register: j.meta.register, draws: j.draws, vD: d.v, zD: d.z, nmD: d.nullMean, nsD: d.nullSd, vC: c.v, zC: c.z, nmC: c.nullMean, nsC: c.nullSd, status: status(d.z, c.z),
    gapShare1: { zD: A.discover?.share1?.z ?? null, zC: A.confirm?.share1?.z ?? null, vD: A.discover?.share1?.v ?? null, nullD: A.discover?.share1?.nullMean ?? null },
    gapGE2: { zD: A.discover?.lnMeanGE2?.z ?? null, zC: A.confirm?.lnMeanGE2?.z ?? null, dD: A.discover?.lnMeanGE2 ? A.discover.lnMeanGE2.v - A.discover.lnMeanGE2.nullMean : null, dC: A.confirm?.lnMeanGE2 ? A.confirm.lnMeanGE2.v - A.confirm.lnMeanGE2.nullMean : null },
    repAdj: A.discover?.repAdj ? { vD: A.discover.repAdj.v, zD: A.discover.repAdj.z, vC: A.confirm.repAdj.v, zC: A.confirm.repAdj.z } : null };
};
const inRange = (v, lo, hi) => v != null && v >= lo && v <= hi;
const mk = (dir) => { const o = {}; for (const [k, ids] of Object.entries(SETS)) o[k] = ids.map((i) => row(i, dir)); return o; };
const R = mk("siblings"), R100 = mk("siblings100"), RR = mk("siblings-rival");
/** the FROZEN pass rule of confirm.mjs applied to a result set R (10-draw statuses give the verdict; the same function is applied to the 100-draw rerun as a robustness check) */
function judge(R) {
  const plus = [...R.prose, ...R.ud], H = {};
  if (![...plus, ...R.code].every((r) => !r.missing)) throw new Error("missing sibling results");
  H.H1_sign = { holds: plus.every((r) => r.vD > 0 && r.vC > 0), failing: plus.filter((r) => !(r.vD > 0 && r.vC > 0)).map((r) => r.id) };
  const presentPlus = (rs) => rs.filter((r) => r.status === "PRESENT+").map((r) => r.id);
  H.H2_presence = { holds: presentPlus(R.prose).length >= 2 && presentPlus(R.ud).length >= 2, prosePresentPlus: presentPlus(R.prose), udPresentPlus: presentPlus(R.ud) };
  H.H3_noReversal = { holds: plus.every((r) => r.status !== "PRESENT-" && r.status !== "ABSENT"), violations: plus.filter((r) => r.status === "PRESENT-" || r.status === "ABSENT").map((r) => `${r.id}:${r.status}`) };
  const pp = plus.filter((r) => r.status === "PRESENT+"), allv = plus.flatMap((r) => [r.vD, r.vC]);
  H.H4_constant = { holds: pp.every((r) => inRange(r.vD, 0.004, 0.04) && inRange(r.vC, 0.004, 0.04)) && inRange(med(allv), 0.008, 0.03), medianV: med(allv), presentPlusOutOfRange: pp.filter((r) => !(inRange(r.vD, 0.004, 0.04) && inRange(r.vC, 0.004, 0.04))).map((r) => r.id) };
  const cPlus = R.code.filter((r) => r.status === "PRESENT+"), cPresent = R.code.filter((r) => r.status === "PRESENT+" || r.status === "PRESENT-");
  H.H5_absentSide = { holds: cPlus.length <= 1 && cPresent.length <= 2, codePresentPlus: cPlus.map((r) => r.id), codePresentMinus: R.code.filter((r) => r.status === "PRESENT-").map((r) => r.id), codeStatuses: R.code.map((r) => `${r.id}:${r.status}`), P2_noCodeSiblingPresentPlus: cPlus.length === 0 };
  const conf = [...plus, ...R.code], nmBad = conf.filter((r) => Math.abs(r.nmD) >= 0.003 || Math.abs(r.nmC) >= 0.003);
  H.H6_instrument = { holds: nmBad.length === 0, nullMeanAtOrAbove0003: nmBad.map((r) => `${r.id}:${r.nmD.toFixed(4)}/${r.nmC.toFixed(4)}`) };
  const nPlus = pp.length, nMinus = plus.filter((r) => r.status === "PRESENT-").length;
  const verdict = (nPlus <= 2 || nMinus >= 2) ? "FAILS" : Object.values(H).every((h) => h.holds) ? "REPLICATES" : "PARTIAL";
  return { verdict, nPlusSiblings: plus.length, presentPlus: nPlus, presentMinusOnPlusSide: nMinus, H };
}
const E = (R) => ({
  E1: { rule: "v>0 in both halves and never PRESENT-", rows: [...R.exploratoryProse, ...R.exploratoryUdPlus].map((r) => ({ id: r.id, vD: r.vD, vC: r.vC, zD: r.zD, zC: r.zC, status: r.status, holds: r.vD > 0 && r.vC > 0 && r.status !== "PRESENT-" })) },
  E2: { rule: "status ABSENT and |v| <= 0.009 in both halves", rows: R.exploratoryUdHeadFinal.map((r) => ({ id: r.id, vD: r.vD, vC: r.vC, zD: r.zD, zC: r.zC, status: r.status, holds: r.status === "ABSENT" && Math.abs(r.vD) <= 0.009 && Math.abs(r.vC) <= 0.009 })) },
});
const out = { headerSha256: headerSha, protocolSha256: sha256(fs.readFileSync(path.join(HERE, "../../PROTOCOL.md"))), primary: judge(R), exploratory: E(R), rows: R, robustness: { draws100: { judge: judge(R100), exploratory: E(R100), rows: R100 } }, adversary: {} };

// ---------------------------------------------------------------- adversaries (reported beside the verdict; they cannot change it)
const A = out.adversary, mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const confIds = [...SETS.prose, ...SETS.ud, ...SETS.code], allIds = Object.values(SETS).flat();
const cellOf = (dir, id, which) => load(dir, id).halves[which]["order.depLen"];
// A1 chance formula: null mean of v per half (10 draws and 100 draws) against its standard error nullSd/sqrt(n)
A.A1_nullMean = confIds.map((id) => { const o = {}; for (const dir of ["siblings", "siblings100"]) for (const w of ["discover", "confirm"]) { const c = cellOf(dir, id, w); o[`${dir === "siblings" ? "n10" : "n100"}_${w}`] = { nullMean: +c.nullMean.toFixed(5), se: +(c.nullSd / Math.sqrt(c.n)).toFixed(5), zOfMean: +(c.nullMean / (c.nullSd / Math.sqrt(c.n))).toFixed(2) }; } return { id, ...o }; });
A.A1_summary = { maxAbsNullMean10: Math.max(...A.A1_nullMean.flatMap((r) => [Math.abs(r.n10_discover.nullMean), Math.abs(r.n10_confirm.nullMean)])), maxAbsNullMean100: Math.max(...A.A1_nullMean.flatMap((r) => [Math.abs(r.n100_discover.nullMean), Math.abs(r.n100_confirm.nullMean)])),
  halvesWithNullMeanBeyond3se100: A.A1_nullMean.flatMap((r) => ["discover", "confirm"].filter((w) => Math.abs(r[`n100_${w}`].zOfMean) > 3).map((w) => `${r.id}/${w}`)), meanNullMean100: mean(A.A1_nullMean.flatMap((r) => [r.n100_discover.nullMean, r.n100_confirm.nullMean])) };
// A2 adjacent-pair share and spacing beyond adjacency (rows come from the 10-draw run)
A.A2_gap = allIds.map((id) => { const r = R[Object.keys(SETS).find((k) => SETS[k].includes(id))].find((x) => x.id === id); return { id, status: r.status, vMean: (r.vD + r.vC) / 2, share1_z: [r.gapShare1.zD, r.gapShare1.zC], lnMeanGE2_minus_null: [r.gapGE2.dD, r.gapGE2.dC], lnMeanGE2_z: [r.gapGE2.zD, r.gapGE2.zC] }; });
A.A2_summary = {}; for (const k of ["prose", "ud", "code"]) { const rs = A.A2_gap.filter((r) => SETS[k].includes(r.id)); A.A2_summary[k] = { share1_zMean: mean(rs.flatMap((r) => r.share1_z)), share1_allNegative: rs.every((r) => r.share1_z.every((z) => z < 0)), lnMeanGE2_zMean: mean(rs.flatMap((r) => r.lnMeanGE2_z)), lnMeanGE2_allBelowNull: rs.every((r) => r.lnMeanGE2_minus_null.every((d) => d < 0)) }; }
// A3 rival burst.repAdj: (a) across the atlas, (b) the siblings
const atlasDir = path.join(HERE, "../atlas"), av = [], ar = [], az = [], arz = [];
for (const f of fs.readdirSync(atlasDir).sort()) { if (/^(pl|ct)-/.test(f)) continue; const j = J(path.join(atlasDir, f)); if (!j.halves?.discover) continue; const get = (w, k) => j.halves[w]?.[k]; const d = get("discover", "order.depLen"), c = get("confirm", "order.depLen"), rd = get("discover", "burst.repAdj"), rc = get("confirm", "burst.repAdj"); if (!(d?.v != null && c?.v != null && rd?.v != null && rc?.v != null)) continue; av.push((d.v + c.v) / 2); ar.push((rd.v + rc.v) / 2); az.push((d.z + c.z) / 2); arz.push((rd.z + rc.z) / 2); }
A.A3_rival = { atlasPockets: av.length, spearman_v_depLen_vs_repAdj: spearman(av, ar), spearman_z_depLen_vs_repAdj: spearman(az, arz), lawTableMostSimilarToDepLen: J(path.join(HERE, "../law-table.json")).statistics.find((s) => s.stat === "order.depLen").mostSimilar };
A.A3_siblings = allIds.map((id) => { const r = RR[Object.keys(SETS).find((k) => SETS[k].includes(id))].find((x) => x.id === id); return { id, depLen_v: (r.vD + r.vC) / 2, repAdj_v: r.repAdj ? [r.repAdj.vD, r.repAdj.vC] : null, repAdj_z: r.repAdj ? [r.repAdj.zD, r.repAdj.zC] : null }; });
A.A3_siblingSpearman = spearman(A.A3_siblings.map((r) => r.depLen_v), A.A3_siblings.map((r) => mean(r.repAdj_v)));
// A4 size: v and z against log tokens inside each kind
A.A4_size = {}; for (const k of ["prose", "ud", "code"]) { const rs = R[k]; A.A4_size[k] = { n: rs.length, spearman_vMean_logTokens: spearman(rs.map((r) => (r.vD + r.vC) / 2), rs.map((r) => Math.log(r.tokens))), spearman_zMean_logTokens: spearman(rs.map((r) => (r.zD + r.zC) / 2), rs.map((r) => Math.log(r.tokens))) }; }
// A5 multiplicity (atlas false-PRESENT reference) and determinism of the order cells between the two 10-draw runs
const LT = J(path.join(HERE, "../law-table.json"));
A.A5_multiplicity = { atlasFalsePresentReference: LT.falsePresent.binomialReference, note: "per cell P(false PRESENT) ~ 8.5e-5 (planted iid); the 10 + side cells predicted PRESENT+ have expected false-PRESENT count ~0.0008, so a PRESENT+ sibling is not a multiplicity artefact" };
A.determinism = allIds.map((id) => { const a = load("siblings", id), b = load("siblings-rival", id); return { id, identicalOrderCells: JSON.stringify(a.halves) === JSON.stringify(b.halves) }; }).filter((r) => !r.identicalOrderCells).map((r) => r.id);
// frozen-snapshot rerun of the five code pockets (the live trees drift while other jobs write: see snapshot-code.mjs); the verdict-bearing 10-draw statuses of the primary run are kept in out.primary
{
  const mkF = (dir) => SETS.code.map((i) => row(i, dir)), RF = { ...R, code: mkF("siblings-frozen") }, RF100 = { ...R100, code: mkF("siblings100-frozen") };
  out.codeFrozen = { note: "same pockets rebuilt from code-snapshot/ (byte-identical on every rerun); primary = live trees at the time of the primary run", judge10: judge(RF), judge100: judge(RF100),
    compare: SETS.code.map((id, i) => ({ id, primary: { tokens: R.code[i].tokens, vD: R.code[i].vD, vC: R.code[i].vC, zD: R.code[i].zD, zC: R.code[i].zC, status: R.code[i].status }, frozen10: { tokens: RF.code[i].tokens, vD: RF.code[i].vD, vC: RF.code[i].vC, zD: RF.code[i].zD, zC: RF.code[i].zC, status: RF.code[i].status }, frozen100: { zD: RF100.code[i].zD, zC: RF100.code[i].zC, status: RF100.code[i].status } })) };
}
fs.writeFileSync(path.join(HERE, "summary.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ headerSha256: out.headerSha256, verdict: out.primary.verdict, H: Object.fromEntries(Object.entries(out.primary.H).map(([k, v]) => [k, v.holds])), p100: [out.robustness.draws100.judge.verdict, Object.fromEntries(Object.entries(out.robustness.draws100.judge.H).map(([k, v]) => [k, v.holds]))], frozen10: [out.codeFrozen.judge10.verdict, Object.fromEntries(Object.entries(out.codeFrozen.judge10.H).map(([k, v]) => [k, v.holds]))], frozenCompare: out.codeFrozen.compare, determinismMismatches: A.determinism }, null, 1));
