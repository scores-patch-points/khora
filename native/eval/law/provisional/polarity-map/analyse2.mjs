// provisional/polarity-map/analyse2.mjs — E1-E5 and the second property search (D5) on the discovery E-series (results/e.*.jsonl -> results/analysis.e.json, results/e-table.txt). New file.
// ═══ PRE-REGISTRATION (written before the first run of this file; implements E1-E5 of map2.mjs exactly; adds D5) ═══════════════════════════════════════════════
// DISCLOSURE. As in map2.mjs's header, plus: I have NOT seen any E-series number when this header is written (the runs of map2.mjs were still finishing; logs only show register names).
//   props2.mjs had been run (results/props2.disc.json written) but its values not printed.
// DEFINITIONS. Primary class per register: UD PO, IRC NK, books NAMES, code PE. Valid cell: pairs >= 60 and position control in [0.45,0.55]; cmn-hans dropped. Family medians over valid registers.
//   E1 per family and control (shuf, sham): median |AUC-0.5| of DLx and DRx (< 0.03 required); E2 as in map2.mjs; E3 Af, Ax; E4 pXY; E5 the gate of map2.mjs.
//   D5 SECOND PROPERTY SEARCH. 16 label-free properties = the 9 of lib.mjs propsOf (logMeanLen, initRareEnrich, finalRareEnrich, leftRigid, rightRigid, asymRigid, topLeftShare,
//   rareRareLeft, ttr10k) + 7 of props2.mjs (rareL_edge, rareL_top, rareL_rare, rareR_edge, rareR_top, rareR_rare, rareAnchorAsym). Targets: AUC(DLx)-0.5 and AUC(Ax)-0.5 (FULL, primary class)
//   per valid register. Statistic: max |Spearman rho| over the 32 combinations; permutation null of that maximum (register <-> target jointly shuffled, B=2000). Run (a) on all valid registers,
//   (b) on natural-language registers only (ud, irc, book), (c) on the UD languages alone. PASS only if (a) exceeds its permutation q95 AND the same property keeps the same sign of rho
//   within (b); a (b)-only or (c)-only pass is reported as scope-restricted. Provisional; a pass is only a candidate for the confirmation on untouched data.
// ═══ END OF PRE-REGISTRATION ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, rngFor, seedFor, round, mean, quantile, PROP_NAMES } from "./lib.mjs";
import { FEATS2 } from "./lib2.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const rows = fs.readdirSync(RES).filter((f) => /^e\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const cells = rows.filter((r) => r.feats), PRIMARY = { ud: "PO", irc: "NK", book: "NAMES", code: "PE" }, P2 = JSON.parse(fs.readFileSync(path.join(RES, "props2.disc.json"), "utf8"));
const P1 = Object.fromEntries(fs.readFileSync(path.join(RES, "disc.irc.jsonl"), "utf8").split("\n").concat(...["book", "code", "ud.a", "ud.b", "ud.c"].map((f) => fs.readFileSync(path.join(RES, `disc.${f}.jsonl`), "utf8").split("\n"))).filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.props).map((r) => [r.reg, r.props]));
const P2N = ["rareL_edge", "rareL_top", "rareL_rare", "rareR_edge", "rareR_top", "rareR_rare", "rareAnchorAsym"], ALLP = [...PROP_NAMES, ...P2N];
const valid = (c) => c && c.pairs >= 60 && c.posControlOk;
const sign = (f) => (f && f.lo > 0.5 && f.auc >= 0.53 ? "POS" : f && f.hi < 0.5 && f.auc <= 0.47 ? "NEG" : "FLAT");
const find = (reg, def, mode, ctl = "real") => cells.find((c) => c.reg === reg && c.def === def && c.mode === mode && c.ctl === ctl);
const regs = [...new Set(cells.map((c) => c.reg))].filter((r) => r !== "ud-cmn-hans").sort(), fam = (r) => cells.find((c) => c.reg === r).fam, FAMS = ["ud", "irc", "book", "code"];
const med = (xs) => round(quantile(xs, 0.5)), out = { headerSha: headerSha(fileURLToPath(import.meta.url)), mapHeaderSha: [...new Set(rows.map((r) => r.hdr))], E1: {}, E2: {}, E3: {}, E4: {}, E5: {}, D5: {} };
const lines = [];
for (const ctl of ["shuf", "sham"]) { out.E1[ctl] = {}; for (const f of FAMS) { const cs = regs.filter((r) => fam(r) === f).map((r) => find(r, PRIMARY[f], "FULL", ctl)).filter((c) => c && c.pairs >= 60); out.E1[ctl][f] = { n: cs.length, medAbsDev_DLx: med(cs.map((c) => Math.abs(c.feats.DLx.auc - 0.5))), medAbsDev_DRx: med(cs.map((c) => Math.abs(c.feats.DRx.auc - 0.5))), medAUC_DLx: med(cs.map((c) => c.feats.DLx.auc)), medAUC_Ax: med(cs.map((c) => c.feats.Ax.auc)), within003: cs.filter((c) => Math.abs(c.feats.DLx.auc - 0.5) < 0.03 && Math.abs(c.feats.DRx.auc - 0.5) < 0.03).length }; } }
for (const mode of ["FULL", "CAUSAL4"]) for (const f of FAMS) {
  const cs = regs.filter((r) => fam(r) === f).map((r) => ({ r, c: find(r, PRIMARY[f], mode) })).filter((x) => valid(x.c)), o = { validRegisters: cs.length, feats: {} };
  for (const k of FEATS2) { const s = cs.map((x) => sign(x.c.feats[k])); o.feats[k] = { medAUC: med(cs.map((x) => x.c.feats[k].auc)), medMean: med(cs.map((x) => x.c.feats[k].mean)), medMeanNeg: med(cs.map((x) => x.c.feats[k].meanNeg)), POS: s.filter((v) => v === "POS").length, NEG: s.filter((v) => v === "NEG").length, FLAT: s.filter((v) => v === "FLAT").length }; }
  out.E3[`${f}|${mode}`] = o;
  const raw = sign({ auc: o.feats.DLf.medAUC, lo: o.feats.DLf.medAUC, hi: o.feats.DLf.medAUC }), exc = cs.map((x) => sign(x.c.feats.DLx)).filter((v) => v === raw).length;
  out.E2[`${f}|${mode}`] = { rawSign: raw, sameSignOnExcess: exc, of: cs.length, medAbsDevExcess: med(cs.map((x) => Math.abs(x.c.feats.DLx.auc - 0.5))), company: raw !== "FLAT" && exc >= (2 / 3) * cs.length && med(cs.map((x) => Math.abs(x.c.feats.DLx.auc - 0.5))) >= 0.05 };
}
for (const f of FAMS) { const full = out.E3[`${f}|FULL`], cau = out.E3[`${f}|CAUSAL4`]; out.E5[f] = Object.fromEntries(["DLf", "DLx", "Af", "Ax"].map((k) => [k, { fullMed: full.feats[k].medAUC, causalMed: cau.feats[k].medAUC, fullPOS: full.feats[k].POS, fullNEG: full.feats[k].NEG, valid: full.validRegisters, shufPass: out.E1.shuf[f].medAbsDev_DLx < 0.03 && out.E1.shuf[f].medAbsDev_DRx < 0.03 }])); }
for (const mode of ["FULL", "CAUSAL4"]) { lines.push(`\n=== E-SERIES ${mode} (primary class) ===`); for (const r of regs) { const c = find(r, PRIMARY[fam(r)], mode); if (!c || !c.pairs) continue; lines.push(`${r.padEnd(26)} n=${String(c.pairs).padStart(4)} ${valid(c) ? "V" : c.pairs < 60 ? "t" : "p"} ` + ["DLf", "DLx", "DRx", "Af", "Ax", "pEdgeL", "pTopL", "pRareL", "pEdgeR", "pTopR", "pRareR"].map((k) => `${k} ${c.feats[k].auc.toFixed(2)}`).join(" ")); } }
// D5
const spear = (() => { const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); for (let i = 0; i < o.length;) { let j = i; while (j < o.length && o[j][0] === o[i][0]) j++; for (let k = i; k < j; k++) r[o[k][1]] = (i + j + 1) / 2; i = j; } return r; }; return (a, b) => { const ra = rank(a), rb = rank(b), ma = mean(ra), mb = mean(rb); let s = 0, x = 0, y = 0; for (let i = 0; i < ra.length; i++) { s += (ra[i] - ma) * (rb[i] - mb); x += (ra[i] - ma) ** 2; y += (rb[i] - mb) ** 2; } return x && y ? s / Math.sqrt(x * y) : 0; }; })();
const propOf = (r, k) => (k in (P1[r] ?? {}) ? P1[r][k] : P2[r]?.[k]);
function search(filter, tag) {
  const pts = regs.filter(filter).map((r) => ({ r, f: fam(r), c: find(r, PRIMARY[fam(r)], "FULL") })).filter((x) => valid(x.c)), T = { DLx: pts.map((x) => x.c.feats.DLx.auc - 0.5), Ax: pts.map((x) => x.c.feats.Ax.auc - 0.5) };
  const rho = (Tt) => Object.fromEntries(ALLP.map((k) => { const ok = pts.map((x, i) => (typeof propOf(x.r, k) === "number" ? i : -1)).filter((i) => i >= 0); return [k, Object.fromEntries(Object.entries(Tt).map(([t, v]) => [t, ok.length > 5 ? round(spear(ok.map((i) => propOf(pts[i].r, k)), ok.map((i) => v[i]))) : null]))]; }));
  const mx = (Tt) => { let m = 0, arg = null; for (const [k, o] of Object.entries(rho(Tt))) for (const [t, v] of Object.entries(o)) if (v != null && Math.abs(v) > m) { m = Math.abs(v); arg = [k, t, v]; } return { m, arg }; };
  const obs = mx(T), rnd = rngFor(seedFor("polarity-map", "D5", tag)), nulls = [];
  for (let b = 0; b < 2000; b++) { const idx = pts.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } nulls.push(mx({ DLx: idx.map((i) => T.DLx[i]), Ax: idx.map((i) => T.Ax[i]) }).m); }
  return { points: pts.length, byFamily: Object.fromEntries(FAMS.map((f) => [f, pts.filter((x) => x.f === f).length])), maxAbsRho: round(obs.m), argmax: obs.arg, nullQ95: round(quantile(nulls, 0.95)), perm_p: round((nulls.filter((x) => x >= obs.m).length + 1) / 2001), rho: rho(T) };
}
out.D5 = { all: search(() => true, "all"), nl: search((r) => fam(r) !== "code", "nl"), ud: search((r) => fam(r) === "ud", "ud") };
fs.writeFileSync(path.join(RES, "analysis.e.json"), JSON.stringify(out, null, 1)); fs.writeFileSync(path.join(RES, "e-table.txt"), lines.join("\n") + "\n");
console.log(JSON.stringify({ E1: out.E1, E2: out.E2, E5: out.E5, D5: Object.fromEntries(Object.entries(out.D5).map(([k, v]) => [k, { ...v, rho: undefined }])) }, null, 1));
